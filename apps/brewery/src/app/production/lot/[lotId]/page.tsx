'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout'
import { Card, CardHeader, CardBody, Button, ProgressBar, BatchStatusBadge, BlendBadge } from '@/components/ui'
import { TransferToConditioningModalV2 } from '@/components/production'
import { formatDate } from '@/lib/utils'

// Lot data from API
interface LotData {
  id: string
  lotNumber: string
  lotCode: string
  phase: string
  status: string
  notes: string | null
  plannedVolume: number | null
  actualVolume: number | null
  createdAt: string
  updatedAt: string
  batches: {
    id: string
    batchNumber: string
    recipeName: string | null
    recipeStyle: string | null
    volume: number | null
    volumeContribution: number | null
    batchPercentage: number | null
    status: string
    originalGravity: number | null
    currentGravity: number | null
    finalGravity: number | null
    brewedAt: string | null
    // ✅ Added gravity readings
    gravityReadings?: {
      id: string
      gravity: number | null
      temperature: number | null
      notes: string | null
      recordedAt: string | null
      recordedBy: string | null
    }[]
  }[]
  tank: {
    id: string
    name: string
    type: string
    capacity: number | null
  } | null
  tankAssignment: {
    id: string
    phase: string
    status: string
    startTime: string | null
    endTime: string | null
    plannedVolume: number | null
    actualVolume: number | null
  } | null
}

// Tab type
type TabKey = 'overview' | 'measurements' | 'timeline' | 'ingredients'

// Phase options (LotPhase enum values from Prisma schema)
const PHASES = [
  { key: 'FERMENTATION', label: 'ფერმენტაცია', icon: '🧪' },
  { key: 'CONDITIONING', label: 'კონდიცირება', icon: '❄️' },
  { key: 'BRIGHT', label: 'მზადაა', icon: '✨' },
  { key: 'PACKAGING', label: 'დაფასოება', icon: '📦' },
]

export default function LotDetailPage() {
  const router = useRouter()
  const params = useParams()
  const lotId = params.lotId as string

  const [lot, setLot] = useState<LotData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Active tab state
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  
  // Action states
  const [isUpdating, setIsUpdating] = useState(false)
  
  // ✅ Phase change modal state
  const [showPhaseModal, setShowPhaseModal] = useState(false)
  const [selectedPhase, setSelectedPhase] = useState<string>('')
  
  // ✅ Conditioning modal state
  const [showConditioningModal, setShowConditioningModal] = useState(false)

  // Fetch lot data
  useEffect(() => {
    const fetchLot = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/lots?lotNumber=${encodeURIComponent(lotId)}`)
        
        if (response.ok) {
          const data = await response.json()
          console.log('[LOT DETAIL] API response:', data)
          
          const foundLot = data.lots?.find((l: any) => 
            l.lotNumber === lotId || l.id === lotId || l.lotCode === lotId
          )
          
          if (foundLot) {
            console.log('[LOT DETAIL] Found lot:', foundLot)
            
            setLot({
              id: foundLot.id,
              lotNumber: foundLot.lotNumber || foundLot.lotCode,
              lotCode: foundLot.lotCode || foundLot.lotNumber,
              phase: foundLot.phase || foundLot.tankAssignment?.phase || foundLot.TankAssignment?.[0]?.phase || 'UNKNOWN',
              status: foundLot.status || 'ACTIVE',
              notes: foundLot.notes,
              plannedVolume: foundLot.plannedVolume ? Number(foundLot.plannedVolume) : null,
              actualVolume: foundLot.actualVolume || foundLot.totalVolume ? Number(foundLot.actualVolume || foundLot.totalVolume) : null,
              createdAt: foundLot.createdAt,
              updatedAt: foundLot.updatedAt || foundLot.createdAt,
              batches: (foundLot.batches || foundLot.LotBatch || []).map((item: any) => {
                const batch = item.Batch || item
                const lb = item.Batch ? item : null
                
                return {
                  id: batch.id || item.batchId,
                  batchNumber: batch.batchNumber || '',
                  recipeName: batch.recipe?.name || batch.recipeName || null,
                  recipeStyle: batch.recipe?.style || batch.recipeStyle || null,
                  volume: batch.volume ? Number(batch.volume) : null,
                  volumeContribution: (lb?.volumeContribution || item.volumeContribution) ? Number(lb?.volumeContribution || item.volumeContribution) : null,
                  batchPercentage: (lb?.batchPercentage || item.batchPercentage) ? Number(lb?.batchPercentage || item.batchPercentage) : null,
                  status: batch.status || 'ACTIVE',
                  originalGravity: batch.originalGravity ? Number(batch.originalGravity) : null,
                  currentGravity: batch.currentGravity ? Number(batch.currentGravity) : null,
                  brewedAt: batch.brewedAt || null,
                }
              }),
              tank: foundLot.tank || (foundLot.TankAssignment?.[0]?.Equipment ? {
                id: foundLot.TankAssignment[0].Equipment.id,
                name: foundLot.TankAssignment[0].Equipment.name || foundLot.TankAssignment[0].tankName,
                type: foundLot.TankAssignment[0].Equipment.type || foundLot.TankAssignment[0].tankType,
                capacity: foundLot.TankAssignment[0].Equipment.capacity || foundLot.TankAssignment[0].tankCapacity,
              } : null),
              tankAssignment: foundLot.tankAssignment || (foundLot.TankAssignment?.[0] ? {
                id: foundLot.TankAssignment[0].id,
                phase: foundLot.TankAssignment[0].phase,
                status: foundLot.TankAssignment[0].status,
                startTime: foundLot.TankAssignment[0].startTime,
                endTime: foundLot.TankAssignment[0].endTime,
                plannedVolume: foundLot.TankAssignment[0].plannedVolume ? Number(foundLot.TankAssignment[0].plannedVolume) : null,
                actualVolume: foundLot.TankAssignment[0].actualVolume ? Number(foundLot.TankAssignment[0].actualVolume) : null,
              } : null),
            })
          } else {
            setError('ლოტი ვერ მოიძებნა')
          }
        } else {
          setError('შეცდომა მონაცემების ჩატვირთვისას')
        }
      } catch (err) {
        console.error('[LOT DETAIL] Error fetching lot:', err)
        setError('შეცდომა მონაცემების ჩატვირთვისას')
      } finally {
        setLoading(false)
      }
    }

    if (lotId) {
      fetchLot()
    }
  }, [lotId])

  // Calculate totals
  const totals = useMemo(() => {
    if (!lot) return { volume: 0, avgOG: 0, avgSG: 0, avgFG: 0, abv: 0 }
    
    const totalVolume = lot.batches.reduce((sum, b) => sum + (b.volumeContribution || b.volume || 0), 0)
    
    let ogValues: number[] = []
    let sgValues: number[] = []
    let fgValues: number[] = []
    
    lot.batches.forEach(b => {
      // Get OG from readings first
      const ogReading = b.gravityReadings?.find(r => r.notes?.includes('OG') || r.notes?.includes('საწყისი'))
      const fgReading = b.gravityReadings?.find(r => r.notes?.includes('FG') || r.notes?.includes('საბოლოო'))
      const latestReading = b.gravityReadings?.[0]
      
      const og = ogReading?.gravity || b.originalGravity
      const fg = fgReading?.gravity || b.finalGravity
      const sg = latestReading?.gravity || b.currentGravity
      
      if (og) ogValues.push(og)
      if (sg) sgValues.push(sg)
      if (fg) fgValues.push(fg)
    })
    
    const avgOG = ogValues.length > 0 ? ogValues.reduce((a, b) => a + b, 0) / ogValues.length : 0
    const avgSG = sgValues.length > 0 ? sgValues.reduce((a, b) => a + b, 0) / sgValues.length : 0
    const avgFG = fgValues.length > 0 ? fgValues.reduce((a, b) => a + b, 0) / fgValues.length : 0
    
    // Calculate ABV from OG and current SG
    const abv = avgOG > 0 && avgSG > 0 && avgOG > avgSG ? (avgOG - avgSG) * 131.25 : 0
    
    return {
      volume: lot.actualVolume || totalVolume,
      avgOG,
      avgSG,
      avgFG,
      abv,
    }
  }, [lot])

  // Get progress based on phase
  const getProgress = (phase?: string) => {
    const p = phase || lot?.phase
    if (!p) return 0
    const phaseProgress: Record<string, number> = {
      'FERMENTATION': 40,
      'CONDITIONING': 70,
      'BRIGHT': 90,
      'PACKAGING': 95,
      'COMPLETED': 100,
    }
    return phaseProgress[p] || 0
  }

  // Get phase label
  const getPhaseLabel = (phase: string) => {
    const labels: Record<string, string> = {
      'FERMENTATION': 'ფერმენტაცია',
      'CONDITIONING': 'კონდიცირება',
      'BRIGHT': 'მზადაა',
      'PACKAGING': 'დაფასოება',
      'COMPLETED': 'დასრულებული',
    }
    return labels[phase] || phase
  }

  // Get status for BatchStatusBadge
  const getStatusForBadge = (phase: string) => {
    const statusMap: Record<string, string> = {
      'FERMENTATION': 'fermenting',
      'CONDITIONING': 'conditioning',
      'BRIGHT': 'ready',
      'PACKAGING': 'packaging',
      'COMPLETED': 'completed',
    }
    return statusMap[phase] || 'planned'
  }

  // ✅ Phase change handler
  const handlePhaseChange = async (newPhase: string) => {
    if (!lot) return
    
    // ✅ If changing to CONDITIONING, open the conditioning modal instead
    if (newPhase === 'CONDITIONING') {
      setShowPhaseModal(false)
      setShowConditioningModal(true)
      return
    }
    
    setIsUpdating(true)
    try {
      // Update lot phase via API
      const response = await fetch('/api/lots/phase', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lotId: lot.id,
          phase: newPhase,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        
        // Update local state
        setLot(prev => prev ? { ...prev, phase: newPhase } : null)
        setShowPhaseModal(false)
        
        // Show success message with batch update info
        const batchMsg = result.batchesUpdated > 0 
          ? ` (${result.batchesUpdated} ბეჩი განახლდა)` 
          : ''
        alert(`ფაზა შეიცვალა: ${getPhaseLabel(newPhase)}${batchMsg}`)
        
        // Refresh page to get updated batch statuses
        router.refresh()
      } else {
        const error = await response.json()
        alert(`შეცდომა: ${error.message || 'ფაზის შეცვლა ვერ მოხერხდა'}`)
      }
    } catch (err) {
      console.error('Error changing phase:', err)
      alert('შეცდომა ფაზის შეცვლისას')
    } finally {
      setIsUpdating(false)
    }
  }
  
  // ✅ Conditioning modal complete handler
  const handleConditioningComplete = async () => {
    console.log('[LOT DETAIL] Conditioning complete, refreshing data...')
    
    // Update lot phase to CONDITIONING
    if (lot) {
      setLot(prev => prev ? { ...prev, phase: 'CONDITIONING' } : null)
    }
    
    setShowConditioningModal(false)
    
    // Refresh to get latest data
    router.refresh()
    
    // Re-fetch lot data
    if (lotId) {
      try {
        const response = await fetch(`/api/lots?lotNumber=${encodeURIComponent(lotId)}`)
        if (response.ok) {
          const data = await response.json()
          const foundLot = data.lots?.find((l: any) => 
            l.lotNumber === lotId || l.id === lotId || l.lotCode === lotId
          )
          if (foundLot) {
            // Update local state with fresh data
            setLot(prev => prev ? {
              ...prev,
              phase: foundLot.phase || 'CONDITIONING',
              tank: foundLot.tank || foundLot.TankAssignment?.[0]?.Equipment ? {
                id: foundLot.TankAssignment?.[0]?.Equipment?.id || '',
                name: foundLot.TankAssignment?.[0]?.Equipment?.name || foundLot.TankAssignment?.[0]?.tankName || '',
                type: foundLot.TankAssignment?.[0]?.Equipment?.type || '',
                capacity: foundLot.TankAssignment?.[0]?.Equipment?.capacity || null,
              } : prev.tank,
            } : null)
          }
        }
      } catch (err) {
        console.error('[LOT DETAIL] Error refreshing lot:', err)
      }
    }
  }

  // ✅ Get next phase in sequence (COMPLETED is status, not phase)
  const getNextPhase = () => {
    if (!lot) return null
    const phaseOrder = ['FERMENTATION', 'CONDITIONING', 'BRIGHT', 'PACKAGING']
    const currentIndex = phaseOrder.indexOf(lot.phase)
    if (currentIndex === -1 || currentIndex >= phaseOrder.length - 1) return null
    return phaseOrder[currentIndex + 1]
  }

  // ✅ Get next phase label
  const getNextPhaseLabel = () => {
    const nextPhase = getNextPhase()
    if (!nextPhase) return null
    const labels: Record<string, string> = {
      'CONDITIONING': 'კონდიცირება',
      'BRIGHT': 'მზადაა',
      'PACKAGING': 'დაფასოება',
    }
    return labels[nextPhase] || nextPhase
  }

  // ✅ Get next phase icon
  const getNextPhaseIcon = () => {
    const nextPhase = getNextPhase()
    if (!nextPhase) return '✅'
    const icons: Record<string, string> = {
      'CONDITIONING': '❄️',
      'BRIGHT': '✨',
      'PACKAGING': '📦',
    }
    return icons[nextPhase] || '→'
  }

  // Advance to next phase
  const handleAdvancePhase = async () => {
    const nextPhase = getNextPhase()
    if (nextPhase) {
      await handlePhaseChange(nextPhase)
    }
  }

  // ✅ Complete lot (change status, not phase)
  const handleCompleteLot = async () => {
    if (!lot) return
    
    if (!confirm('დარწმუნებული ხართ რომ გსურთ ლოტის დასრულება? ყველა ბეჩიც დასრულდება.')) return
    
    setIsUpdating(true)
    try {
      const response = await fetch('/api/lots/phase', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lotId: lot.id,
          status: 'COMPLETED',
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setLot(prev => prev ? { ...prev, status: 'COMPLETED' } : null)
        
        const batchMsg = result.batchesUpdated > 0 
          ? ` (${result.batchesUpdated} ბეჩი დასრულდა)` 
          : ''
        alert(`ლოტი დასრულდა!${batchMsg}`)
        
        // Refresh to update UI
        router.refresh()
      } else {
        const error = await response.json()
        alert(`შეცდომა: ${error.message || 'დასრულება ვერ მოხერხდა'}`)
      }
    } catch (err) {
      console.error('Error completing lot:', err)
      alert('შეცდომა დასრულებისას')
    } finally {
      setIsUpdating(false)
    }
  }

  // Open phase modal
  const openPhaseModal = () => {
    setSelectedPhase(lot?.phase || '')
    setShowPhaseModal(true)
  }

  const handleAddMeasurement = () => {
    alert('გაზომვის დამატების მოდალი მალე დაემატება!')
  }

  const handlePrintLabel = () => {
    window.print()
  }

  const handleDeleteLot = async () => {
    if (!lot) return
    if (confirm('დარწმუნებული ხართ რომ გსურთ ლოტის წაშლა?')) {
      try {
        const response = await fetch(`/api/lots?id=${lot.id}`, {
          method: 'DELETE',
        })
        
        if (response.ok) {
          alert('ლოტი წაიშალა')
          router.push('/production')
        } else {
          alert('წაშლა ვერ მოხერხდა')
        }
      } catch (err) {
        console.error('Error deleting lot:', err)
        alert('შეცდომა წაშლისას')
      }
    }
  }

  // Tabs configuration
  const tabs = [
    { key: 'overview' as TabKey, label: 'მიმოხილვა', icon: '📊' },
    { key: 'measurements' as TabKey, label: 'გაზომვები', icon: '📈' },
    { key: 'timeline' as TabKey, label: 'ტაიმლაინი', icon: '📅' },
    { key: 'ingredients' as TabKey, label: 'ინგრედიენტები', icon: '🌾' },
  ]

  if (loading) {
    return (
      <DashboardLayout title="ლოტი" breadcrumb="მთავარი / წარმოება / ლოტი">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-4xl mb-4">⏳</p>
            <p className="text-text-muted">იტვირთება...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error || !lot) {
    return (
      <DashboardLayout title="ლოტი" breadcrumb="მთავარი / წარმოება / ლოტი">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-4xl mb-4">❌</p>
            <p className="text-text-muted">{error || 'ლოტი ვერ მოიძებნა'}</p>
            <Button 
              variant="primary" 
              className="mt-4"
              onClick={() => router.push('/production')}
            >
              ← უკან
            </Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const isBlend = lot.batches.length > 1

  return (
    <DashboardLayout 
      title={lot.lotNumber} 
      breadcrumb={`მთავარი / წარმოება / ${lot.lotNumber}`}
    >
      {/* ✅ Phase Change Modal */}
      {showPhaseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-bg-card border border-border rounded-2xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">🔄 ფაზის შეცვლა</h2>
            
            <p className="text-text-muted mb-4">
              აირჩიეთ ახალი ფაზა <span className="text-copper-light font-mono">{lot.lotNumber}</span>-თვის
            </p>

            <div className="space-y-2 mb-6">
              {PHASES.map((phase) => {
                const isCurrentPhase = lot.phase === phase.key
                const isSelected = selectedPhase === phase.key
                const progress = getProgress(phase.key)
                
                return (
                  <button
                    key={phase.key}
                    onClick={() => setSelectedPhase(phase.key)}
                    disabled={isCurrentPhase}
                    className={`w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between ${
                      isCurrentPhase 
                        ? 'border-green-500/50 bg-green-500/10 cursor-not-allowed' 
                        : isSelected 
                          ? 'border-purple-500 bg-purple-500/20' 
                          : 'border-border hover:border-purple-500/50 hover:bg-bg-tertiary'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{phase.icon}</span>
                      <div>
                        <p className="font-medium">{phase.label}</p>
                        <p className="text-xs text-text-muted">პროგრესი: {progress}%</p>
                      </div>
                    </div>
                    {isCurrentPhase && (
                      <span className="text-green-400 text-sm">მიმდინარე</span>
                    )}
                    {isSelected && !isCurrentPhase && (
                      <span className="text-purple-400">✓</span>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="flex gap-3">
              <Button 
                variant="ghost" 
                className="flex-1"
                onClick={() => setShowPhaseModal(false)}
              >
                გაუქმება
              </Button>
              <Button 
                variant="primary" 
                className="flex-1"
                onClick={() => handlePhaseChange(selectedPhase)}
                disabled={!selectedPhase || selectedPhase === lot.phase || isUpdating}
              >
                {isUpdating ? '⏳ იცვლება...' : '✅ შეცვლა'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-purple-500/20 rounded-xl flex items-center justify-center">
            <span className="text-3xl">🔄</span>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-display">{lot.lotNumber}</h1>
              <BatchStatusBadge status={getStatusForBadge(lot.phase)} />
              {isBlend && (
                <BlendBadge batchCount={lot.batches.length} size="md" />
              )}
            </div>
            <p className="text-text-muted">
              {lot.batches[0]?.recipeName || 'Unknown Recipe'} • {lot.tank?.name || 'No Tank'} • {totals.volume}L
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => router.push('/production')}>
            ← უკან
          </Button>
          <Button variant="secondary" onClick={openPhaseModal}>
            🏷️ რედაქტირება
          </Button>
          {/* ✅ Dynamic next phase button */}
          {getNextPhase() && (
            <Button 
              variant="primary" 
              onClick={handleAdvancePhase}
              disabled={isUpdating}
            >
              {isUpdating ? '⏳' : getNextPhaseIcon()} {getNextPhaseLabel()}
            </Button>
          )}
          {/* ✅ Complete button when in PACKAGING phase */}
          {!getNextPhase() && lot.phase === 'PACKAGING' && lot.status !== 'COMPLETED' && (
            <Button 
              variant="primary" 
              onClick={handleCompleteLot}
              disabled={isUpdating}
              className="bg-green-600 hover:bg-green-700"
            >
              {isUpdating ? '⏳' : '✅'} დასრულება
            </Button>
          )}
          {/* ✅ Completed badge */}
          {lot.status === 'COMPLETED' && (
            <span className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg flex items-center gap-2">
              ✅ დასრულებული
            </span>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-6 gap-4 mb-6">
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-bold font-display text-purple-400">{lot.batches.length}</p>
          <p className="text-xs text-text-muted">პარტია შერეული</p>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-bold font-display text-copper-light">{totals.volume}L</p>
          <p className="text-xs text-text-muted">სულ მოცულობა</p>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-bold font-display text-amber-400">
            {totals.avgOG > 0 ? totals.avgOG.toFixed(3) : '-'}
          </p>
          <p className="text-xs text-text-muted">OG (საშუალო)</p>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-bold font-display text-blue-400">
            {totals.avgSG > 0 ? totals.avgSG.toFixed(3) : '-'}
          </p>
          <p className="text-xs text-text-muted">SG (მიმდინარე)</p>
        </div>
        {/* ✅ Clickable phase card */}
        <div 
          className="bg-bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-purple-500/50 transition-colors"
          onClick={openPhaseModal}
        >
          <p className="text-2xl font-bold font-display text-green-400">{getPhaseLabel(lot.phase)}</p>
          <p className="text-xs text-text-muted">ფაზა 🔄</p>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-bold font-display">{lot.tank?.name || '-'}</p>
          <p className="text-xs text-text-muted">ავზი</p>
        </div>
      </div>

      {/* Progress */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex items-center justify-between mb-3">
            <span className="font-medium">პროგრესი</span>
            <span className="text-text-muted">{getProgress()}% დასრულებული</span>
          </div>
          <ProgressBar value={getProgress()} size="lg" color="copper" />
          <div className="flex justify-between mt-3 text-sm">
            <div className={`flex items-center gap-1 ${lot.phase === 'FERMENTATION' ? 'text-purple-400' : 'text-text-muted'}`}>
              <span>●</span> ფერმენტაცია
            </div>
            <div className={`flex items-center gap-1 ${lot.phase === 'CONDITIONING' ? 'text-purple-400' : 'text-text-muted'}`}>
              <span>●</span> კონდიცირება
            </div>
            <div className={`flex items-center gap-1 ${lot.phase === 'BRIGHT' ? 'text-purple-400' : 'text-text-muted'}`}>
              <span>●</span> მზადაა
            </div>
            <div className={`flex items-center gap-1 ${lot.phase === 'PACKAGING' || lot.phase === 'COMPLETED' ? 'text-purple-400' : 'text-text-muted'}`}>
              <span>●</span> დაფასოება
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border pb-4">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-6 py-3 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === tab.key
                ? 'bg-purple-500 text-white'
                : 'bg-bg-tertiary text-text-secondary hover:bg-bg-card'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-3 gap-6">
          {/* ✅ Completed Section - Show when status is COMPLETED */}
          {lot.status === 'COMPLETED' && (
            <Card className="col-span-3 border-green-500/30 bg-green-500/5">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">✅</span>
                    <span className="text-lg font-semibold">დასრულებული</span>
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                      წარმატებით
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-5 gap-4">
                  <div className="bg-bg-card border border-border rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-green-400">{totals.volume}L</p>
                    <p className="text-sm text-text-muted">სულ დაფასოებული</p>
                  </div>
                  <div className="bg-bg-card border border-border rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-purple-400">{lot.batches.length}</p>
                    <p className="text-sm text-text-muted">პარტიები</p>
                  </div>
                  <div className="bg-bg-card border border-border rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-amber-400">
                      {totals.abv > 0 ? totals.abv.toFixed(1) : '-'}%
                    </p>
                    <p className="text-sm text-text-muted">ABV</p>
                  </div>
                  <div className="bg-bg-card border border-border rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-copper-light">
                      {totals.avgOG > 0 ? totals.avgOG.toFixed(3) : '-'}
                    </p>
                    <p className="text-sm text-text-muted">OG (საშუალო)</p>
                  </div>
                  <div className="bg-bg-card border border-border rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-blue-400">
                      {formatDate(new Date(lot.updatedAt))}
                    </p>
                    <p className="text-sm text-text-muted">დასრულების თარიღი</p>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Packaging Status (if packaging) */}
          {lot.phase === 'PACKAGING' && lot.status !== 'COMPLETED' && (() => {
            const totalVolume = totals.volume || 0
            const packagedVolume = 0 // TODO: calculate from packaging records
            const remainingVolume = totalVolume - packagedVolume
            return (
              <Card className="col-span-3 mb-6">
                <CardBody>
                  <div className="p-4 bg-slate-700/50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-text-muted">დაფასოვებული:</span>
                      <span className="text-green-400 font-bold">{packagedVolume.toFixed(1)}L</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-text-muted">დარჩენილი ავზში:</span>
                      <span className={`font-bold ${remainingVolume > 0 ? 'text-amber-400' : 'text-green-400'}`}>
                        {remainingVolume.toFixed(1)}L
                      </span>
                    </div>
                    <div className="w-full bg-slate-600 rounded-full h-2 mt-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all" 
                        style={{ width: `${totalVolume > 0 ? (packagedVolume / totalVolume) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </CardBody>
              </Card>
            )
          })()}

          {/* Source Batches */}
          <Card className="col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <span className="text-purple-400">🔄</span>
                <span className="text-lg font-semibold">წყარო პარტიები</span>
                <span className="text-text-muted text-sm">({lot.batches.length})</span>
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                {lot.batches.map((batch) => {
                  const rawPercentage = batch.batchPercentage || 
                    (totals.volume > 0 ? ((batch.volumeContribution || batch.volume || 0) / totals.volume * 100) : 0)
                  const percentage = Number(rawPercentage) || 0
                  
                  return (
                    <div 
                      key={batch.id}
                      className="bg-bg-tertiary rounded-xl p-4 border border-border hover:border-purple-500/50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/production/${batch.id}`)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-copper/20 rounded-lg flex items-center justify-center">
                            <span className="text-lg">🍺</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-copper-light font-medium">{batch.batchNumber}</span>
                              <BatchStatusBadge status={batch.status?.toLowerCase() || 'active'} />
                            </div>
                            <p className="text-sm text-text-muted">
                              {batch.recipeName || 'Unknown'} • {batch.recipeStyle || ''}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-lg">{batch.volumeContribution || batch.volume || 0}L</p>
                          <p className="text-sm text-purple-400">{percentage.toFixed(1)}%</p>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <div className="h-2 bg-bg-card rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-purple-500 rounded-full transition-all"
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="mt-3 flex gap-4 text-sm">
                        <div>
                          <span className="text-text-muted">OG:</span>{' '}
                          <span className="font-mono">
                            {(() => {
                              const ogReading = batch.gravityReadings?.find(r => r.notes?.includes('OG') || r.notes?.includes('საწყისი'))
                              return (ogReading?.gravity || batch.originalGravity)?.toFixed(3) || '-'
                            })()}
                          </span>
                        </div>
                        <div>
                          <span className="text-text-muted">SG:</span>{' '}
                          <span className="font-mono">
                            {(() => {
                              const latestReading = batch.gravityReadings?.[0]
                              return (latestReading?.gravity || batch.currentGravity)?.toFixed(3) || '-'
                            })()}
                          </span>
                        </div>
                        {batch.finalGravity && (
                          <div>
                            <span className="text-text-muted">FG:</span>{' '}
                            <span className="font-mono">
                              {(() => {
                                const fgReading = batch.gravityReadings?.find(r => r.notes?.includes('FG') || r.notes?.includes('საბოლოო'))
                                return (fgReading?.gravity || batch.finalGravity)?.toFixed(3) || '-'
                              })()}
                            </span>
                          </div>
                        )}
                        {batch.brewedAt && (
                          <div>
                            <span className="text-text-muted">ხარშვა:</span>{' '}
                            <span>{formatDate(new Date(batch.brewedAt))}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardBody>
          </Card>

          {/* Info Panel */}
          <div className="space-y-6">
            {/* Tank Info */}
            <Card>
              <CardHeader>
                <span className="text-lg font-semibold">🧪 ავზის ინფორმაცია</span>
              </CardHeader>
              <CardBody>
                {lot.tank ? (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-text-muted">ავზი</span>
                      <span className="font-medium">{lot.tank.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">ტიპი</span>
                      <span>{lot.tank.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">მოცულობა</span>
                      <span>{lot.tank.capacity || '-'}L</span>
                    </div>
                    {lot.tankAssignment && (
                      <>
                        <hr className="border-border" />
                        <div className="flex justify-between">
                          <span className="text-text-muted">ფაზა</span>
                          <span>{getPhaseLabel(lot.tankAssignment.phase)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-muted">სტატუსი</span>
                          <span>{lot.tankAssignment.status}</span>
                        </div>
                        {lot.tankAssignment.startTime && (
                          <div className="flex justify-between">
                            <span className="text-text-muted">დაწყება</span>
                            <span>{formatDate(new Date(lot.tankAssignment.startTime))}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-text-muted">ავზი არ არის მინიჭებული</p>
                    <Button variant="secondary" size="sm" className="mt-2">
                      + ავზის მინიჭება
                    </Button>
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Dates */}
            <Card>
              <CardHeader>
                <span className="text-lg font-semibold">📅 თარიღები</span>
              </CardHeader>
              <CardBody>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-text-muted">შექმნის თარიღი</span>
                    <span>{formatDate(new Date(lot.createdAt))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">განახლება</span>
                    <span>{formatDate(new Date(lot.updatedAt))}</span>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Notes */}
            {lot.notes && (
              <Card>
                <CardHeader>
                  <span className="text-lg font-semibold">📝 შენიშვნები</span>
                </CardHeader>
                <CardBody>
                  <p className="text-text-secondary">{lot.notes}</p>
                </CardBody>
              </Card>
            )}

            {/* Actions */}
            <Card>
              <CardHeader>
                <span className="text-lg font-semibold">⚡ მოქმედებები</span>
              </CardHeader>
              <CardBody>
                <div className="space-y-2">
                  <Button 
                    variant="secondary" 
                    className="w-full justify-start"
                    onClick={handleAddMeasurement}
                  >
                    📊 გაზომვის დამატება
                  </Button>
                  <Button 
                    variant="secondary" 
                    className="w-full justify-start"
                    onClick={openPhaseModal}
                  >
                    🔄 ფაზის შეცვლა
                  </Button>
                  <Button 
                    variant="secondary" 
                    className="w-full justify-start"
                    onClick={handlePrintLabel}
                  >
                    🏷️ ეტიკეტის ბეჭდვა
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-red-400"
                    onClick={handleDeleteLot}
                  >
                    🗑️ ლოტის წაშლა
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {/* Measurements Tab */}
      {activeTab === 'measurements' && (() => {
        // ✅ Combine all gravity readings from all batches
        const allReadings: Array<{
          id: string
          batchNumber: string
          gravity: number | null
          temperature: number | null
          notes: string | null
          recordedAt: string | null
          recordedBy: string | null
        }> = []
        
        lot?.batches.forEach(batch => {
          batch.gravityReadings?.forEach(reading => {
            allReadings.push({
              ...reading,
              batchNumber: batch.batchNumber,
            })
          })
        })
        
        // Sort by date (newest first)
        allReadings.sort((a, b) => {
          const dateA = a.recordedAt ? new Date(a.recordedAt).getTime() : 0
          const dateB = b.recordedAt ? new Date(b.recordedAt).getTime() : 0
          return dateB - dateA
        })
        
        return (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">📈 გაზომვები</span>
                <Button variant="primary" size="sm" onClick={handleAddMeasurement}>
                  + გაზომვა
                </Button>
              </div>
            </CardHeader>
            <CardBody>
              {allReadings.length === 0 ? (
                <div className="text-center py-12 text-text-muted">
                  <p className="text-4xl mb-4">📈</p>
                  <p>გაზომვები არ არის</p>
                  <p className="text-sm mt-2">დაამატეთ პირველი გაზომვა</p>
                  <Button variant="secondary" className="mt-4" onClick={handleAddMeasurement}>
                    + გაზომვის დამატება
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-text-muted border-b border-border">
                        <th className="text-left p-3">თარიღი</th>
                        <th className="text-left p-3">პარტია</th>
                        <th className="text-left p-3">SG</th>
                        <th className="text-left p-3">°C</th>
                        <th className="text-left p-3">ABV</th>
                        <th className="text-left p-3">შენიშვნა</th>
                        <th className="text-left p-3">ჩამწერი</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allReadings.map((reading, idx) => {
                        // Calculate ABV if we have OG
                        const ogReading = allReadings.find(r => 
                          r.batchNumber === reading.batchNumber && 
                          (r.notes?.includes('OG') || r.notes?.includes('საწყისი'))
                        )
                        const og = ogReading?.gravity || lot?.batches.find(b => b.batchNumber === reading.batchNumber)?.originalGravity
                        const abv = og && reading.gravity && og > reading.gravity 
                          ? ((og - reading.gravity) * 131.25).toFixed(1) 
                          : '-'
                        
                        return (
                          <tr key={reading.id || idx} className="border-b border-border/50 hover:bg-bg-card/50">
                            <td className="p-3">
                              {reading.recordedAt ? formatDate(new Date(reading.recordedAt)) : '-'}
                            </td>
                            <td className="p-3 font-mono text-sm">{reading.batchNumber}</td>
                            <td className="p-3 font-mono">
                              {reading.gravity ? reading.gravity.toFixed(3) : '-'}
                            </td>
                            <td className="p-3">
                              {reading.temperature != null ? `${reading.temperature}°C` : '-'}
                            </td>
                            <td className="p-3 font-mono">{abv}%</td>
                            <td className="p-3 text-sm text-text-muted">{reading.notes || '-'}</td>
                            <td className="p-3 text-sm text-text-muted">{reading.recordedBy || '-'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        )
      })()}

      {/* Timeline Tab */}
      {activeTab === 'timeline' && (
        <Card>
          <CardHeader>
            <span className="text-lg font-semibold">📅 ტაიმლაინი</span>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <span>🔄</span>
                </div>
                <div className="flex-1 pb-4 border-b border-border">
                  <p className="font-medium">ლოტი შეიქმნა</p>
                  <p className="text-sm text-text-muted">{lot.batches.length} პარტია შერეული</p>
                  <p className="text-xs text-text-muted mt-1">{formatDate(new Date(lot.createdAt))}</p>
                </div>
              </div>

              {lot.tankAssignment?.startTime && (
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span>🧪</span>
                  </div>
                  <div className="flex-1 pb-4 border-b border-border">
                    <p className="font-medium">ავზში გადატანა</p>
                    <p className="text-sm text-text-muted">{lot.tank?.name} - {getPhaseLabel(lot.tankAssignment.phase)}</p>
                    <p className="text-xs text-text-muted mt-1">{formatDate(new Date(lot.tankAssignment.startTime))}</p>
                  </div>
                </div>
              )}

              {lot.batches.map((batch) => (
                <div key={batch.id} className="flex gap-4">
                  <div className="w-10 h-10 bg-copper/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span>🍺</span>
                  </div>
                  <div className="flex-1 pb-4 border-b border-border last:border-0">
                    <p className="font-medium">{batch.batchNumber} დაემატა</p>
                    <p className="text-sm text-text-muted">{batch.volumeContribution || batch.volume}L • {batch.recipeName}</p>
                    {batch.brewedAt && (
                      <p className="text-xs text-text-muted mt-1">ხარშვა: {formatDate(new Date(batch.brewedAt))}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Ingredients Tab */}
      {activeTab === 'ingredients' && (
        <Card>
          <CardHeader>
            <span className="text-lg font-semibold">🌾 ინგრედიენტები</span>
          </CardHeader>
          <CardBody>
            <div className="text-center py-12 text-text-muted">
              <p className="text-4xl mb-4">🌾</p>
              <p>ინგრედიენტები ჯერ არ არის დამატებული</p>
              <p className="text-sm mt-2">ინგრედიენტების ინფორმაცია მოდის წყარო ბეჩებიდან</p>
              <div className="mt-4 space-y-2">
                {lot.batches.map(batch => (
                  <Button 
                    key={batch.id}
                    variant="secondary" 
                    size="sm"
                    onClick={() => router.push(`/production/${batch.id}?tab=ingredients`)}
                  >
                    {batch.batchNumber} ინგრედიენტები →
                  </Button>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>
      )}
      
      {/* ✅ Transfer to Conditioning Modal for Lot */}
      {lot && lot.batches.length > 0 && (
        <TransferToConditioningModalV2
          batchId={lot.batches[0].id}
          batchNumber={lot.lotNumber}
          recipeName={lot.batches[0].recipeName || 'შერეული ლოტი'}
          currentVolume={totals.volume || 100}
          currentTankType={lot.tank?.type}
          currentLotId={lot.id}
          isOpen={showConditioningModal}
          onClose={() => setShowConditioningModal(false)}
          onComplete={handleConditioningComplete}
        />
      )}
    </DashboardLayout>
  )
}