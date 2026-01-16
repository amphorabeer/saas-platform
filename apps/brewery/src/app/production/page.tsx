'use client'

import { useState, useEffect, useMemo, useCallback, Fragment } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout'
import { Card, CardHeader, CardBody, Button, ProgressBar, BatchStatusBadge, BlendBadge } from '@/components/ui'
import { NewBatchModal } from '@/components/brewery'
import { TankCard, TankDetailModal } from '@/components/fermentation'
import { formatDate } from '@/lib/utils'
import { useBreweryStore } from '@/store'
import { PRODUCTION_TABS } from '@/constants'

// ═══════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════

// Lot from API (lot-centric design)
interface LotRow {
  id: string
  lotCode: string
  lotNumber: string
  type: 'single' | 'blend' | 'split'
  isBlendResult: boolean
  isSplitChild: boolean
  phase: string
  status: string
  progress: number
  
  // Source info
  sourceBatchNumber: string | null  // For splits
  sourceLots: { batchNumber: string; volume: number }[]  // For blends
  
  // Recipe
  recipeName: string
  recipeStyle: string
  
  // Volume
  totalVolume: number
  packagedVolume: number
  remainingVolume: number
  
  // Gravity
  originalGravity: number | null
  currentGravity: number | null
  
  // Tank
  tankName: string
  tankId: string | null
  tank: { id: string; name: string; type: string } | null
  
  // Timestamps
  createdAt: string
  blendedAt: string | null
  splitAt: string | null
  
  // Batches (for detail/tooltip)
  batchCount: number
  batches: {
    id: string
    batchNumber: string
    volume: number | null
    volumeContribution: number | null
  }[]
}

// Tank type for fermentation view
interface Tank {
  id: string
  name: string
  type: 'fermenter' | 'brite' | 'conditioning'
  capacity: number
  currentVolume: number
  status: 'available' | 'in_use' | 'cleaning' | 'maintenance'
  needsCIP?: boolean
  lastCIP?: string | Date
  nextCIP?: string | Date
  phase?: 'FERMENTATION' | 'CONDITIONING' | 'BRIGHT' | 'PACKAGING'
  batch?: {
    id: string
    batchNumber: string
    recipe: string
    status: string
    startDate: Date
    estimatedEndDate: Date
    progress: number
    isBlended?: boolean
    lotNumber?: string
  }
  temperature: { current: number; target: number; history: any[] }
  gravity: { original: number; current: number; target: number; history: any[] }
  pressure?: number
  lastUpdated: Date
}

// Equipment from API
interface Equipment {
  id: string
  name: string
  type: string
  status: string
  capacity: number | null
  currentBatchId: string | null
  currentBatchNumber: string | null
  currentTemp: number | null
  currentPressure: number | null
  location: string | null
  currentPhase?: string
  currentLotId?: string | null
  tankAssignments?: any[]
  lastCIP?: string | Date | null
  nextCIP?: string | Date | null
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export default function ProductionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Hydration state
  const [mounted, setMounted] = useState(false)
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'batches' | 'brewhouse' | 'tanks'>('batches')
  
  // ✅ LOTS from API (lot-centric!)
  const [lots, setLots] = useState<LotRow[]>([])
  const [loadingLots, setLoadingLots] = useState(true)
  const [lotsStats, setLotsStats] = useState<{
    total: number
    fermenting: number
    conditioning: number
    bright: number
    packaging: number
    blends: number
    splits: number
    singles: number
  } | null>(null)
  
  // Equipment from API
  const [apiEquipment, setApiEquipment] = useState<Equipment[]>([])
  const [loadingEquipment, setLoadingEquipment] = useState(true)
  
  // Batches (still needed for some features)
  const [batches, setBatches] = useState<any[]>([])
  
  // Zustand (for real-time updates)
  const zustandEquipment = useBreweryStore(state => state.equipment)
  
  // Local UI state
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewBatchModal, setShowNewBatchModal] = useState(false)
  const [preSelectedRecipeId, setPreSelectedRecipeId] = useState<string | null>(null)
  
  // Tank view state
  const [selectedTank, setSelectedTank] = useState<Tank | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [filterType, setFilterType] = useState<string>('all')

  // ═══════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════
  
  useEffect(() => {
    setMounted(true)
    
    const tab = searchParams.get('tab')
    if (tab === 'tanks') {
      setActiveTab('tanks')
    }
    
    const newBatch = searchParams.get('newBatch')
    const recipeId = searchParams.get('recipeId')
    
    if (newBatch === 'true' && recipeId) {
      setPreSelectedRecipeId(recipeId)
      setShowNewBatchModal(true)
      router.replace('/production')
    }
  }, [searchParams, router])

  // ═══════════════════════════════════════════════════════════
  // DATA FETCHING
  // ═══════════════════════════════════════════════════════════

  // ✅ FETCH LOTS (primary data source for production page)
  const fetchLots = useCallback(async () => {
    try {
      setLoadingLots(true)
      // Include COMPLETED status when filter is 'completed'
      let url = '/api/lots'
      if (filterStatus === 'completed') {
        url += '?activeOnly=false&status=COMPLETED'
      } else {
        url += '?activeOnly=true'
      }
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        console.log('[PRODUCTION] Lots fetched:', data.count, 'Stats:', data.stats)
        
        // ✅ DEBUG: Check lot types and lotCodes
        if (data.lots && data.lots.length > 0) {
          console.log('[PRODUCTION] First 5 lots:')
          data.lots.slice(0, 5).forEach((lot: any) => {
            console.log(`  ${lot.lotCode || lot.lotNumber} - type: ${lot.type}, isBlendTarget: ${lot.isBlendTarget}, batchCount: ${lot.batchCount || lot.batches?.length}`)
            
            // ✅ DEBUG: For blend lots, show full structure
            if (lot.type === 'blend') {
              console.log(`    Full blend lot:`, lot)
            }
          })
        }
        
        setLots(data.lots || [])
        setLotsStats(data.stats || null)
      } else {
        console.error('[PRODUCTION] Lots fetch failed:', response.status)
      }
    } catch (error) {
      console.error('[PRODUCTION] Error fetching lots:', error)
    } finally {
      setLoadingLots(false)
    }
  }, [filterStatus])

  // Fetch equipment
  const fetchEquipment = async () => {
    try {
      setLoadingEquipment(true)
      const response = await fetch('/api/equipment')
      if (response.ok) {
        const data = await response.json()
        setApiEquipment(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error fetching equipment:', error)
    } finally {
      setLoadingEquipment(false)
    }
  }

  // Fetch batches (for backward compatibility)
  const fetchBatches = async () => {
    try {
      const response = await fetch('/api/batches')
      if (response.ok) {
        const data = await response.json()
        setBatches(data.batches || [])
      }
    } catch (error) {
      console.error('Error fetching batches:', error)
    }
  }

  // Initial load
  useEffect(() => {
    fetchLots()
    fetchEquipment()
    fetchBatches()
  }, [fetchLots]) // ✅ Re-fetch when filter changes (fetchLots depends on filterStatus)

  // ═══════════════════════════════════════════════════════════
  // FILTER LOTS
  // ═══════════════════════════════════════════════════════════
  
  const filteredLots = useMemo(() => {
    return lots.filter(lot => {
      // Status filter
      if (filterStatus !== 'all') {
        if (filterStatus === 'completed') {
          // ✅ Filter for completed status
          if (lot.status !== 'COMPLETED') {
            return false
          }
        } else {
          const statusMap: Record<string, string[]> = {
            'fermenting': ['FERMENTATION'],
            'conditioning': ['CONDITIONING'],
            'ready': ['BRIGHT'],
            'packaging': ['PACKAGING'],
            'planned': ['PLANNED'],
          }
          const phases = statusMap[filterStatus]
          if (phases && !phases.includes(lot.phase)) {
            return false
          }
        }
      }
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesLot = lot.lotCode?.toLowerCase().includes(query)
        const matchesRecipe = lot.recipeName?.toLowerCase().includes(query)
        const matchesBatch = lot.batches?.some(b => b.batchNumber?.toLowerCase().includes(query))
        if (!matchesLot && !matchesRecipe && !matchesBatch) {
          return false
        }
      }
      
      return true
    })
  }, [lots, filterStatus, searchQuery])

  // ═══════════════════════════════════════════════════════════
  // EQUIPMENT -> TANKS TRANSFORMATION
  // ═══════════════════════════════════════════════════════════
  
  const equipment = useMemo(() => {
    return apiEquipment.map(apiEq => {
      const zustandEq = zustandEquipment.find(z => z.id === apiEq.id)
      return {
        ...apiEq,
        currentBatchId: zustandEq?.currentBatchId || apiEq.currentBatchId,
        currentBatchNumber: zustandEq?.currentBatchNumber || apiEq.currentBatchNumber,
      }
    })
  }, [apiEquipment, zustandEquipment])

  const tanks = useMemo(() => {
    return equipment
      .filter(eq => ['fermenter', 'brite', 'unitank'].includes(eq.type?.toLowerCase() || ''))
      .map(eq => {
        // Find lot assigned to this tank
        const assignedLot = lots.find(l => l.tankId === eq.id)
        
        // ✅ Check if tank needs CIP: only use status field for consistency with Prisma
        const needsCIP = !assignedLot && eq.status === 'NEEDS_CIP'
        
        // ✅ Determine status: in_use > cleaning (needs CIP) > available
        let tankStatus: 'available' | 'in_use' | 'cleaning' | 'maintenance' = 'available'
        if (assignedLot) {
          tankStatus = 'in_use'
        } else if (needsCIP) {
          tankStatus = 'cleaning' // ✅ Shows ⚠️ CIP badge
        }
        
        return {
          id: eq.id,
          name: eq.name,
          type: (eq.type?.toLowerCase() === 'brite' ? 'brite' : 'fermenter') as 'fermenter' | 'brite' | 'conditioning',
          capacity: eq.capacity || 2000,
          currentVolume: assignedLot?.remainingVolume || 0,
          status: tankStatus,
          needsCIP, // ✅ Pass needsCIP flag
          lastCIP: eq.lastCIP,
          nextCIP: eq.nextCIP,
          phase: assignedLot?.phase as any,
          batch: assignedLot ? {
            id: assignedLot.id,
            batchNumber: assignedLot.lotCode,
            recipe: assignedLot.recipeName,
            status: assignedLot.phase?.toLowerCase() === 'fermentation' ? 'fermenting' : 
                   assignedLot.phase?.toLowerCase() === 'conditioning' ? 'conditioning' :
                   assignedLot.phase?.toLowerCase() === 'bright' ? 'ready' : 'fermenting',
            startDate: new Date(assignedLot.createdAt),
            estimatedEndDate: new Date(),
            progress: assignedLot.progress,
            isBlended: assignedLot.type === 'blend',
            lotNumber: assignedLot.lotCode,
          } : undefined,
          temperature: { current: (eq as any).currentTemp || 18, target: 18, history: [] },
          gravity: { 
            original: assignedLot?.originalGravity || 0, 
            current: assignedLot?.currentGravity || 0, 
            target: 1.010, 
            history: [] 
          },
          pressure: eq.currentPressure || undefined,
          lastUpdated: new Date(),
        }
      })
  }, [equipment, lots])

  const filteredTanks = tanks.filter(tank => {
    if (filterType === 'all') return true
    if (filterType === 'fermenter') return tank.type === 'fermenter'
    if (filterType === 'brite') return tank.type === 'brite'
    if (filterType === 'active') return tank.status === 'in_use'
    if (filterType === 'available') return tank.status === 'available'
    return true
  })

  // ═══════════════════════════════════════════════════════════
  // STATS
  // ═══════════════════════════════════════════════════════════
  
  const stats = useMemo(() => {
    if (lotsStats) {
      return {
        total: lotsStats.total,
        fermenting: lotsStats.fermenting,
        conditioning: lotsStats.conditioning,
        ready: lotsStats.bright,
        blendCount: lotsStats.blends,
        splitCount: lotsStats.splits,
      }
    }
    return {
      total: lots.length,
      fermenting: lots.filter(l => l.phase === 'FERMENTATION').length,
      conditioning: lots.filter(l => l.phase === 'CONDITIONING').length,
      ready: lots.filter(l => l.phase === 'BRIGHT').length,
      blendCount: lots.filter(l => l.type === 'blend').length,
      splitCount: lots.filter(l => l.type === 'split').length,
    }
  }, [lots, lotsStats])

  const tankStats = useMemo(() => ({
    totalTanks: tanks.length,
    activeTanks: tanks.filter(t => t.status === 'in_use').length,
    availableTanks: tanks.filter(t => t.status === 'available').length,
    totalCapacity: tanks.reduce((sum, t) => sum + t.capacity, 0),
    usedCapacity: tanks.reduce((sum, t) => sum + t.currentVolume, 0),
  }), [tanks])

  // ✅ PLANNED + BREWING BATCHES (for "დაგეგმილი პარტიები" section)
  const plannedBatches = useMemo(() => {
    return batches.filter(b => b.status === 'PLANNED' || b.status === 'BREWING')
  }, [batches])

  // ═══════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════

  const handleBatchCreated = (batchId: string) => {
    console.log('New batch created:', batchId)
    fetchLots()
    fetchEquipment()
    fetchBatches()
  }

  const handleRowClick = (lot: LotRow) => {
    // ✅ For blend lots - navigate to lot detail page
    if (lot.type === 'blend' && lot.lotCode?.startsWith('BLEND-')) {
      router.push(`/lots/${lot.id}`)
      return
    }
    
    // Get batch ID directly from lot.batches (already included from API)
    const batchId = lot.batches?.[0]?.id || ''
    
    // For SPLIT lots - pass lotId as query param
    if (lot.type === 'split' && batchId) {
      router.push(`/production/${batchId}?lotId=${lot.id}`)
      return
    }
    
    // For normal lots - navigate to batch details
    if (batchId) {
      router.push(`/production/${batchId}`)
      return
    }
    
    // Fallback
    console.warn('[handleRowClick] No batch ID found for lot:', lot.lotCode)
    router.push(`/production/${lot.id}`)
  }

  const handlePlannedBatchClick = (batch: any) => {
    router.push(`/production/${batch.id}`)
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER HELPERS
  // ═══════════════════════════════════════════════════════════

  // Get status for BatchStatusBadge
  const getLotDisplayStatus = (lot: LotRow): string => {
    if (lot.status === 'COMPLETED') return 'completed'
    switch (lot.phase) {
      case 'FERMENTATION': return 'fermenting'
      case 'CONDITIONING': return 'conditioning'
      case 'BRIGHT': return 'ready'
      case 'PACKAGING': return 'packaging'
      default: return 'planned'
    }
  }

  // ✅ Get batch display name: batchNumber + suffix (-A, -B) for splits
  const getBatchDisplayName = (lot: LotRow): string => {
    // ✅ For blend lots, show BLEND code if available
    if (lot.type === 'blend' && lot.lotCode?.startsWith('BLEND-')) {
      return lot.lotCode
    }
    
    const batchNumber = lot.batches?.[0]?.batchNumber
    if (!batchNumber) return lot.lotCode
    
    // Extract suffix from lotCode if split (-A, -B, etc)
    const suffixMatch = lot.lotCode?.match(/-([A-Z])$/)
    const suffix = suffixMatch ? `-${suffixMatch[1]}` : ''
    
    return `${batchNumber}${suffix}`
  }

  // ═══════════════════════════════════════════════════════════
  // LOADING STATE
  // ═══════════════════════════════════════════════════════════

  if (!mounted) {
    return (
      <DashboardLayout title="წარმოება" breadcrumb="მთავარი / წარმოება">
        <div className="flex items-center justify-center py-12">
          <p className="text-text-muted">იტვირთება...</p>
        </div>
      </DashboardLayout>
    )
  }

  // ═══════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════

  return (
    <DashboardLayout title="წარმოება" breadcrumb="მთავარი / წარმოება">
      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border pb-4">
        {PRODUCTION_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as 'batches' | 'brewhouse' | 'tanks')}
            className={`px-6 py-3 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === tab.key
                ? 'bg-copper text-white'
                : 'bg-bg-tertiary text-text-secondary hover:bg-bg-card'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.key === 'tanks' && tankStats.activeTanks > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === tab.key ? 'bg-white/20' : 'bg-amber-400/20 text-amber-400'
              }`}>
                {tankStats.activeTanks}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          BATCHES TAB (Actually LOTS - lot-centric view!)
          ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'batches' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-7 gap-4 mb-6">
            <div className="bg-bg-card border border-border rounded-xl p-4">
              <p className="text-2xl font-bold font-display text-copper-light">{stats.total}</p>
              <p className="text-xs text-text-muted">აქტიური პარტია</p>
            </div>
            <div className="bg-bg-card border border-border rounded-xl p-4">
              <p className="text-2xl font-bold font-display text-amber-400">{stats.fermenting}</p>
              <p className="text-xs text-text-muted">ფერმენტაციაში</p>
            </div>
            <div className="bg-bg-card border border-border rounded-xl p-4">
              <p className="text-2xl font-bold font-display text-blue-400">{stats.conditioning}</p>
              <p className="text-xs text-text-muted">კონდიცირებაში</p>
            </div>
            <div className="bg-bg-card border border-border rounded-xl p-4">
              <p className="text-2xl font-bold font-display text-green-400">{stats.ready}</p>
              <p className="text-xs text-text-muted">მზადაა</p>
            </div>
            {/* Blend count */}
            <div className="bg-bg-card border border-border rounded-xl p-4">
              <p className="text-2xl font-bold font-display text-purple-400">{stats.blendCount}</p>
              <p className="text-xs text-text-muted">🔄 შერეული</p>
            </div>
            {/* Split count */}
            <div className="bg-bg-card border border-border rounded-xl p-4">
              <p className="text-2xl font-bold font-display text-orange-400">{stats.splitCount}</p>
              <p className="text-xs text-text-muted">🔀 გაყოფილი</p>
            </div>
            {/* Planned batches count */}
            <div className="bg-bg-card border border-border rounded-xl p-4">
              <p className="text-2xl font-bold font-display text-cyan-400">{plannedBatches.length}</p>
              <p className="text-xs text-text-muted">📋 დაგეგმილი</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex gap-4 items-center">
              <div className="relative">
                <input
                  type="text"
                  placeholder="ძიება..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-bg-tertiary border border-border rounded-lg pl-10 pr-4 py-2 text-sm w-64"
                />
                <span className="absolute left-3 top-2.5 text-text-muted">🔍</span>
              </div>
              <div className="flex gap-2">
                {[
                  { key: 'all', label: 'ყველა' },
                  { key: 'fermenting', label: 'ფერმენტაცია' },
                  { key: 'conditioning', label: 'კონდიცირება' },
                  { key: 'ready', label: 'მზადაა' },
                  { key: 'packaging', label: 'დაფასოვება' },
                  { key: 'completed', label: '✅ დასრულებული' },
                ].map(filter => (
                  <button
                    key={filter.key}
                    onClick={() => setFilterStatus(filter.key)}
                    className={`px-4 py-2 rounded-lg text-sm transition-all ${
                      filterStatus === filter.key
                        ? 'bg-copper text-white'
                        : 'bg-bg-tertiary text-text-secondary hover:bg-bg-card'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
            <Button variant="primary" onClick={() => setShowNewBatchModal(true)}>
              + ახალი პარტია
            </Button>
          </div>

          {/* ════════════════════════════════════════════════════════════════════
              PLANNED & BREWING BATCHES SECTION (ზემოთ - პრიორიტეტული)
              ════════════════════════════════════════════════════════════════════ */}
          {plannedBatches.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">📋 დაგეგმილი / ხარშვაზე ({plannedBatches.length})</span>
                  <span className="text-xs text-text-muted">ფერმენტაციის დასაწყებად</span>
                </div>
              </CardHeader>
              <CardBody className="p-0">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-left text-sm text-text-muted">
                      <th className="px-6 py-4">პარტია</th>
                      <th className="px-6 py-4">რეცეპტი</th>
                      <th className="px-6 py-4">სტატუსი</th>
                      <th className="px-6 py-4">მოცულობა</th>
                      <th className="px-6 py-4">დაგეგმილი თარიღი</th>
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {plannedBatches.map(batch => (
                      <tr 
                        key={batch.id}
                        className="border-b border-border/50 hover:bg-bg-tertiary/50 cursor-pointer transition-colors"
                        onClick={() => handlePlannedBatchClick(batch)}
                      >
                        <td className="px-6 py-4">
                          <span className="font-mono text-copper-light">{batch.batchNumber}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium">{batch.recipe?.name || '-'}</p>
                            <p className="text-xs text-text-muted">{batch.recipe?.style || ''}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            batch.status === 'BREWING' 
                              ? 'bg-orange-500/20 text-orange-400' 
                              : 'bg-cyan-500/20 text-cyan-400'
                          }`}>
                            {batch.status === 'BREWING' ? '🍳 ხარშვაზე' : '📋 დაგეგმილი'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span>{batch.volume || 0}L</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm">{formatDate(batch.plannedDate)}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button 
                            variant="secondary" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/production/${batch.id}`)
                            }}
                          >
                            {batch.status === 'BREWING' ? 'ფერმენტაცია →' : 'დაწყება →'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardBody>
            </Card>
          )}

          {/* ════════════════════════════════════════════════════════════════════
              LOT-CENTRIC TABLE (აქტიური პროდუქცია)
              - Each row = one active Lot
              - Split child = separate row with 🔀 badge
              - Blend result = single row with 🔄 badge
              - No expandable children!
              ════════════════════════════════════════════════════════════════════ */}
          <Card>
            <CardHeader>
              <span className="text-lg font-semibold">🍺 აქტიური პარტიები ({filteredLots.length})</span>
            </CardHeader>
            <CardBody className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left text-sm text-text-muted">
                    <th className="px-6 py-4">პარტია</th>
                    <th className="px-6 py-4">რეცეპტი</th>
                    <th className="px-6 py-4">ფაზა / ტიპი</th>
                    <th className="px-6 py-4">ავზი</th>
                    <th className="px-6 py-4">მოცულობა</th>
                    <th className="px-6 py-4">პროგრესი</th>
                    <th className="px-6 py-4">თარიღი</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLots.map(lot => (
                    <tr 
                      key={lot.id}
                      className="border-b border-border/50 hover:bg-bg-tertiary/50 cursor-pointer transition-colors"
                      onClick={() => handleRowClick(lot)}
                    >
                      {/* ═══════════════════════════════════════════════════════
                          LOT CODE + TYPE INDICATOR
                          ═══════════════════════════════════════════════════════ */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {/* Type icon */}
                          {lot.type === 'blend' && <span className="text-purple-400">🔄</span>}
                          {lot.type === 'split' && <span className="text-orange-400">🔀</span>}
                          
                          <div>
                            <span className={`font-mono ${
                              lot.type === 'blend' ? 'text-purple-400' :
                              lot.type === 'split' ? 'text-orange-400' :
                              'text-copper-light'
                            }`}>
                              {getBatchDisplayName(lot)}
                            </span>
                            
                            {/* Source info subtitle */}
                            {lot.type === 'split' && lot.sourceBatchNumber && (
                              <p className="text-xs text-text-muted">
                                წყარო: {lot.sourceBatchNumber}
                              </p>
                            )}
                            {lot.type === 'blend' && lot.batchCount > 1 && (
                              <p className="text-xs text-text-muted">
                                {lot.batchCount} პარტია შერეული
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Recipe */}
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium">{lot.recipeName}</p>
                          <p className="text-xs text-text-muted">{lot.recipeStyle}</p>
                        </div>
                      </td>

                      {/* ═══════════════════════════════════════════════════════
                          PHASE BADGE + TYPE BADGE
                          ═══════════════════════════════════════════════════════ */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Phase badge */}
                          <BatchStatusBadge 
                            status={getLotDisplayStatus(lot)} 
                            showPulse={lot.phase === 'FERMENTATION'} 
                          />
                          
                          {/* Type badge */}
                          {lot.type === 'blend' && (
                            <span 
                              className="px-2 py-0.5 rounded-full text-xs bg-purple-500/20 text-purple-400 cursor-help"
                              title={lot.batches?.map(b => `${b.batchNumber}: ${b.volumeContribution || b.volume}L`).join('\n')}
                            >
                              🔄 BLENDED
                            </span>
                          )}
                          {lot.type === 'split' && (
                            <span 
                              className="px-2 py-0.5 rounded-full text-xs bg-orange-500/20 text-orange-400 cursor-help"
                              title={`გაყოფილია ${lot.sourceBatchNumber}-დან`}
                            >
                              🔀 SPLIT
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Tank */}
                      <td className="px-6 py-4 font-mono">
                        {lot.tankName || '-'}
                      </td>

                      {/* Volume */}
                      <td className="px-6 py-4">
                        <div className="font-mono">
                          <span>{lot.remainingVolume > 0 ? `${lot.remainingVolume}L` : `${lot.totalVolume}L`}</span>
                          {lot.packagedVolume > 0 && (
                            <p className="text-xs text-text-muted">
                              ჩამოსხმული: {lot.packagedVolume}L
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Progress */}
                      <td className="px-6 py-4 w-32">
                        <div className="flex items-center gap-2">
                          <ProgressBar 
                            value={lot.progress} 
                            size="sm" 
                            color={
                              lot.type === 'blend' ? 'info' : 
                              lot.type === 'split' ? 'warning' : 
                              'copper'
                            }
                            className="flex-1" 
                          />
                          <span className="text-xs text-text-muted w-8">{lot.progress}%</span>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-6 py-4 text-sm text-text-muted">
                        {formatDate(new Date(lot.createdAt))}
                      </td>

                      {/* Action */}
                      <td className="px-6 py-4">
                        <Button variant="ghost" size="sm">→</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Empty State */}
              {!loadingLots && filteredLots.length === 0 && (
                <div className="text-center py-12 text-text-muted">
                  <p className="text-4xl mb-4">🍺</p>
                  <p>აქტიური პარტიები ვერ მოიძებნა</p>
                  <p className="text-sm mt-2">დაიწყეთ ახალი პარტიის შექმნით</p>
                </div>
              )}

              {/* Loading State */}
              {loadingLots && (
                <div className="text-center py-12 text-text-muted">
                  <p className="text-4xl mb-4">⏳</p>
                  <p>იტვირთება...</p>
                </div>
              )}
            </CardBody>
          </Card>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          BREWHOUSE TAB
          ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'brewhouse' && (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-bg-card border border-border rounded-xl p-4">
              <p className="text-2xl font-bold font-display text-amber-400">
                {apiEquipment.filter(eq => ['kettle', 'brewhouse', 'mash_tun'].includes(eq.type?.toLowerCase())).length}
              </p>
              <p className="text-xs text-text-muted">სულ ქვაბი</p>
            </div>
            <div className="bg-bg-card border border-border rounded-xl p-4">
              <p className="text-2xl font-bold font-display text-green-400">
                {batches.filter(b => b.status === 'brewing').length}
              </p>
              <p className="text-xs text-text-muted">ხარშვაზე</p>
            </div>
            <div className="bg-bg-card border border-border rounded-xl p-4">
              <p className="text-2xl font-bold font-display text-blue-400">
                {batches.filter(b => b.status === 'planned').length}
              </p>
              <p className="text-xs text-text-muted">დაგეგმილი</p>
            </div>
            <div className="bg-bg-card border border-border rounded-xl p-4">
              <p className="text-2xl font-bold font-display text-cyan-400">
                {batches.filter(b => {
                  const today = new Date()
                  const startDate = new Date(b.startDate)
                  return startDate.toDateString() === today.toDateString()
                }).length}
              </p>
              <p className="text-xs text-text-muted">დღეს Brew Day</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">🍳 სახარში აღჭურვილობა</span>
                <Button variant="primary" size="sm" onClick={() => setShowNewBatchModal(true)}>
                  + ახალი ხარშვა
                </Button>
              </div>
            </CardHeader>
            <CardBody>
              {apiEquipment
                .filter(eq => ['kettle', 'brewhouse', 'mash_tun', 'brew_kettle', 'boil_kettle'].includes(eq.type?.toLowerCase()))
                .length === 0 ? (
                <div className="text-center py-8 text-text-muted">
                  <p className="text-4xl mb-4">🍳</p>
                  <p>სახარში ქვაბი არ მოიძებნა</p>
                  <p className="text-sm mt-2">დაამატეთ აღჭურვილობის მოდულში</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {apiEquipment
                    .filter(eq => ['kettle', 'brewhouse', 'mash_tun', 'brew_kettle', 'boil_kettle'].includes(eq.type?.toLowerCase()))
                    .map(eq => (
                      <div key={eq.id} className="bg-bg-tertiary rounded-xl p-4 border border-border">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-2xl">🍳</span>
                          <div>
                            <h3 className="font-semibold">{eq.name}</h3>
                            <p className="text-xs text-text-muted">{eq.capacity ? `${eq.capacity}L` : 'N/A'}</p>
                          </div>
                        </div>
                        <div className={`text-sm px-2 py-1 rounded-full inline-block ${
                          eq.status === 'OPERATIONAL' ? 'bg-green-500/20 text-green-400' :
                          eq.status === 'NEEDS_CIP' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-amber-500/20 text-amber-400'
                        }`}>
                          {eq.status === 'OPERATIONAL' ? 'მზადაა' :
                           eq.status === 'NEEDS_CIP' ? 'CIP საჭიროა' : eq.status}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardBody>
          </Card>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TANKS TAB
          ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'tanks' && (
        <>
          <div className="grid grid-cols-5 gap-4 mb-6">
            <div className="bg-bg-card border border-border rounded-xl p-4">
              <p className="text-2xl font-bold font-display text-copper-light">{tankStats.totalTanks}</p>
              <p className="text-xs text-text-muted">სულ ავზი</p>
            </div>
            <div className="bg-bg-card border border-border rounded-xl p-4">
              <p className="text-2xl font-bold font-display text-amber-400">{tankStats.activeTanks}</p>
              <p className="text-xs text-text-muted">აქტიური</p>
            </div>
            <div className="bg-bg-card border border-border rounded-xl p-4">
              <p className="text-2xl font-bold font-display text-green-400">{tankStats.availableTanks}</p>
              <p className="text-xs text-text-muted">თავისუფალი</p>
            </div>
            <div className="bg-bg-card border border-border rounded-xl p-4">
              <p className="text-2xl font-bold font-display">
                {tankStats.totalCapacity > 0 ? `${(tankStats.totalCapacity / 1000).toFixed(1)}k` : '-'}
              </p>
              <p className="text-xs text-text-muted">სულ მოცულობა (L)</p>
            </div>
            <div className="bg-bg-card border border-border rounded-xl p-4">
              <p className="text-2xl font-bold font-display">
                {tankStats.totalCapacity > 0 ? `${Math.round(tankStats.usedCapacity / tankStats.totalCapacity * 100)}%` : '-'}
              </p>
              <p className="text-xs text-text-muted">გამოყენება</p>
              {tankStats.totalCapacity > 0 && (
                <ProgressBar 
                  value={Math.round(tankStats.usedCapacity / tankStats.totalCapacity * 100)} 
                  size="sm" 
                  color="copper" 
                  className="mt-2" 
                />
              )}
            </div>
          </div>

          {/* Tank Filters */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex gap-2">
              {[
                { key: 'all', label: 'ყველა' },
                { key: 'fermenter', label: 'ფერმენტატორები' },
                { key: 'brite', label: 'ბრაიტ ავზები' },
                { key: 'active', label: 'აქტიური' },
                { key: 'available', label: 'თავისუფალი' },
              ].map(filter => (
                <button
                  key={filter.key}
                  onClick={() => setFilterType(filter.key)}
                  className={`px-4 py-2 rounded-lg text-sm transition-all ${
                    filterType === filter.key
                      ? 'bg-copper text-white'
                      : 'bg-bg-tertiary text-text-secondary hover:bg-bg-card'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-copper text-white' : 'bg-bg-tertiary'}`}
              >
                ▦
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-copper text-white' : 'bg-bg-tertiary'}`}
              >
                ☰
              </button>
            </div>
          </div>

          {/* Tanks Grid/List */}
          {tanks.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              <p className="text-4xl mb-4">⏳</p>
              <p>იტვირთება ავზები...</p>
            </div>
          ) : filteredTanks.length > 0 ? (
            <div className={viewMode === 'grid' ? 'grid grid-cols-3 gap-6' : 'space-y-4'}>
              {filteredTanks.map(tank => (
                <TankCard 
                  key={tank.id} 
                  tank={tank} 
                  viewMode={viewMode}
                  onClick={() => setSelectedTank(tank)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-text-muted">
              <p className="text-4xl mb-4">🧪</p>
              <p>ავზები არ მოიძებნა</p>
              <p className="text-sm mt-2">დაამატეთ ავზები აღჭურვილობის მოდულში</p>
              <Button 
                variant="primary" 
                className="mt-4"
                onClick={() => router.push('/equipment')}
              >
                ⚙️ აღჭურვილობა
              </Button>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <NewBatchModal
        isOpen={showNewBatchModal}
        onClose={() => {
          setShowNewBatchModal(false)
          setPreSelectedRecipeId(null)
        }}
        onSuccess={handleBatchCreated}
        recipeId={preSelectedRecipeId || undefined}
      />

      {selectedTank && (
        <TankDetailModal
          tank={selectedTank}
          onClose={() => setSelectedTank(null)}
          onEquipmentUpdate={() => {
            fetchEquipment()
            fetchLots()
            setSelectedTank(null)
          }}
        />
      )}
    </DashboardLayout>
  )
}