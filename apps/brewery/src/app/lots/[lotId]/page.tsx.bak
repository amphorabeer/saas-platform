'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout'
import { Card, CardHeader, CardBody, Button, ProgressBar, BatchStatusBadge, BlendBadge } from '@/components/ui'
import { TransferToConditioningModalV2, PackagingModal } from '@/components/production'
import { LotReportModal } from '@/components/lots/LotReportModal'
import { formatDate } from '@/lib/utils'

// ✅ Convert SG to Plato
const sgToPlato = (sg: number): number => {
  if (!sg || sg < 0.9) return 0
  // More accurate formula
  return (-1 * 616.868) + (1111.14 * sg) - (630.272 * sg * sg) + (135.997 * sg * sg * sg)
}

// ✅ Format gravity based on user preference
const formatGravity = (sg: number | null | undefined, usePlato: boolean = true): string => {
  if (sg == null || sg === 0) return '-'
  if (usePlato) {
    const plato = sgToPlato(sg)
    return `${plato.toFixed(1)}°P`
  }
  return sg.toFixed(3)
}

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
    brewedAt: string | null
    packagedVolume?: number | null  // ✅ Added for packaging progress
    gravityReadings?: {
      id: string
      gravity: number
      temperature: number | null
      notes: string | null
      recordedAt: string
    }[]
    packagingRuns?: {
      id: string
      packageType: string
      quantity: number
      volumeTotal: number
      lotNumber: string | null
      performedBy: string | null
      performedAt: string | null
      notes: string | null
    }[]
  }[]
  // ✅ Aggregated packaging runs from all batches
  packagingRuns?: {
    id: string
    batchNumber: string
    packageType: string
    quantity: number
    volumeTotal: number
    lotNumber: string | null
    performedBy: string | null
    performedAt: string | null
    notes: string | null
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
  
  // ✅ Quality tests state
  const [qcTests, setQcTests] = useState<any[]>([])
  const [loadingTests, setLoadingTests] = useState(false)
  
  // Active tab state
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  
  // ✅ Get gravity unit preference from settings
  const [gravityUnit, setGravityUnit] = useState<'SG' | 'PLATO'>('PLATO')
  
  useEffect(() => {
    // Load from localStorage or settings API
    const savedUnit = localStorage.getItem('gravityUnit') || 'PLATO'
    setGravityUnit(savedUnit as 'SG' | 'PLATO')
  }, [])
  
  const usePlato = gravityUnit === 'PLATO'
  
  // Action states
  const [isUpdating, setIsUpdating] = useState(false)
  
  // ✅ Phase change modal state
  const [showPhaseModal, setShowPhaseModal] = useState(false)
  const [selectedPhase, setSelectedPhase] = useState<string>('')
  
  // ✅ Conditioning modal state
  const [showConditioningModal, setShowConditioningModal] = useState(false)
  
  // Packaging modal
  const [showPackaging, setShowPackaging] = useState(false)
  
  // ✅ Gravity readings state
  const [showAddReadingModal, setShowAddReadingModal] = useState(false)
  const [newReading, setNewReading] = useState({ gravity: '', temperature: '', notes: '' })
  const [showReportModal, setShowReportModal] = useState(false)

  // Fetch lot data
  useEffect(() => {
    const fetchLot = async () => {
      try {
        setLoading(true)
        setError(null)

        // ✅ Supports both UUID and lotCode
        const response = await fetch(`/api/lots?id=${encodeURIComponent(lotId)}`)
        
        if (response.ok) {
          const data = await response.json()
          console.log('[LOT DETAIL] API response:', data)
          
          const foundLot = data.lots?.find((l: any) => 
            l.lotNumber === lotId || l.id === lotId || l.lotCode === lotId
          )
          
          if (foundLot) {
            console.log('[LOT DETAIL] Found lot:', foundLot)
            console.log('[LOT DETAIL] Raw batches array:', foundLot.batches)
            console.log('[LOT DETAIL] Raw LotBatch array:', foundLot.LotBatch)
            
            // ✅ DEBUG: Check actual structure of batches
            const batchesSource = foundLot.batches || foundLot.LotBatch || []
            console.log('[LOT DETAIL] Using source:', foundLot.batches ? 'batches' : 'LotBatch')
            console.log('[LOT DETAIL] First item structure:', batchesSource[0])
            
            // ✅ Check if batches array has packagedVolume directly or nested
            batchesSource.forEach((item: any, idx: number) => {
              console.log(`[LOT DETAIL] Item ${idx}:`, {
                hasPackagedVolume: 'packagedVolume' in item,
                packagedVolume: item.packagedVolume,
                hasBatch: 'Batch' in item,
                batchPackagedVolume: item.Batch?.packagedVolume,
              })
            })
            
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
                  // ✅ Include packaged volume for progress tracking
                  // FIX: Use != null check (0 is falsy but valid!)
                  packagedVolume: batch.packagedVolume != null ? Number(batch.packagedVolume) : 0,
                  // ✅ Include gravity readings from batch
                  gravityReadings: batch.gravityReadings || batch.GravityReading || [],
                  // ✅ Include packaging runs from batch
                  packagingRuns: batch.packagingRuns || [],
                }
              }),
              // ✅ Aggregated packaging runs from all batches
              packagingRuns: foundLot.packagingRuns || [],
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

  // ✅ Fetch quality tests for the lot
  useEffect(() => {
    const fetchQualityTests = async () => {
      if (!lot?.id) return
      
      try {
        setLoadingTests(true)
        // Fetch tests for all batches in the lot
        const batchIds = lot.batches.map(b => b.id)
        const allTests: any[] = []
        
        for (const batchId of batchIds) {
          try {
            const res = await fetch(`/api/quality?batchId=${batchId}`)
            if (res.ok) {
              const data = await res.json()
              const tests = (data.tests || []).map((test: any) => ({
                ...test,
                batchId,
              }))
              allTests.push(...tests)
            }
          } catch (e) {
            console.error(`Failed to fetch tests for batch ${batchId}:`, e)
          }
        }
        
        // Also fetch tests directly linked to the lot
        try {
          const res = await fetch(`/api/quality?lotId=${lot.id}`)
          if (res.ok) {
            const data = await res.json()
            const lotTests = data.tests || []
            // Merge, avoiding duplicates
            const existingTestIds = new Set(allTests.map(t => t.id))
            lotTests.forEach((test: any) => {
              if (!existingTestIds.has(test.id)) {
                allTests.push(test)
              }
            })
          }
        } catch (e) {
          console.error(`Failed to fetch tests for lot ${lot.id}:`, e)
        }
        
        // Sort by scheduled date (newest first)
        allTests.sort((a, b) => {
          const dateA = new Date(a.scheduledDate || a.completedDate || 0).getTime()
          const dateB = new Date(b.scheduledDate || b.completedDate || 0).getTime()
          return dateB - dateA
        })
        
        setQcTests(allTests)
      } catch (error) {
        console.error('[LOT DETAIL] Error fetching quality tests:', error)
      } finally {
        setLoadingTests(false)
      }
    }
    
    if (lot?.id) {
      fetchQualityTests()
    }
  }, [lot?.id, lot?.batches])

  // ✅ Track if gravity readings have been fetched
  const readingsFetchedRef = useRef<string | null>(null)
  const [readingsRefreshKey, setReadingsRefreshKey] = useState(0)

  // ✅ Fetch gravity readings for all batches in the lot
  useEffect(() => {
    const fetchGravityReadings = async () => {
      if (!lot?.batches || lot.batches.length === 0) return
      
      // Skip if already fetched for this lot (unless refresh was triggered)
      if (readingsFetchedRef.current === lot.id && readingsRefreshKey === 0) return
      
      // Check if any batch already has gravityReadings (only on initial load)
      if (readingsRefreshKey === 0) {
        const hasReadings = lot.batches.some(b => b.gravityReadings && b.gravityReadings.length > 0)
        if (hasReadings) {
          readingsFetchedRef.current = lot.id
          return
        }
      }
      
      try {
        console.log('[LOT DETAIL] Fetching gravity readings for', lot.batches.length, 'batches')
        
        const batchesWithReadings = await Promise.all(
          lot.batches.map(async (batch) => {
            try {
              const res = await fetch(`/api/batches/${batch.id}/gravity-readings`)
              if (res.ok) {
                const data = await res.json()
                return { ...batch, gravityReadings: data.readings || [] }
              }
            } catch (e) {
              console.error(`Failed to fetch readings for batch ${batch.id}:`, e)
            }
            return batch
          })
        )
        
        // Mark as fetched BEFORE updating state
        readingsFetchedRef.current = lot.id
        
        // Update lot with gravity readings
        setLot(prev => prev ? { ...prev, batches: batchesWithReadings } : null)
        console.log('[LOT DETAIL] Fetched gravity readings for all batches')
      } catch (error) {
        console.error('[LOT DETAIL] Error fetching gravity readings:', error)
      }
    }
    
    fetchGravityReadings()
  }, [lot?.id, readingsRefreshKey])

  // Calculate totals
  const totals = useMemo(() => {
    if (!lot) return { volume: 0, avgOG: 0, avgSG: 0 }
    
    const totalVolume = lot.batches.reduce((sum, b) => sum + (b.volumeContribution || b.volume || 0), 0)
    const ogSum = lot.batches.reduce((sum, b) => sum + (b.originalGravity || 0), 0)
    const sgSum = lot.batches.reduce((sum, b) => sum + (b.currentGravity || 0), 0)
    const batchesWithOG = lot.batches.filter(b => b.originalGravity).length
    const batchesWithSG = lot.batches.filter(b => b.currentGravity).length
    
    return {
      volume: lot.actualVolume || totalVolume,
      avgOG: batchesWithOG > 0 ? ogSum / batchesWithOG : 0,
      avgSG: batchesWithSG > 0 ? sgSum / batchesWithSG : 0,
    }
  }, [lot])

  // ✅ Aggregate gravity readings from all batches in the lot
  const allGravityReadings = useMemo(() => {
    if (!lot?.batches) return []
    
    return lot.batches.flatMap((b: any) => 
      (b.gravityReadings || []).map((r: any) => ({ ...r, batchNumber: b.batchNumber }))
    ).sort((a: any, b: any) => 
      new Date(b.recordedAt || b.date).getTime() - new Date(a.recordedAt || a.date).getTime()
    )
  }, [lot])

  // ✅ Calculate totals from gravity readings for blends
  const blendStats = useMemo(() => {
    if (!lot?.batches || lot.batches.length <= 1) return null
    
    // Get all readings sorted oldest first (for OG/FG finding)
    const readings = lot.batches.flatMap((b: any) => 
      (b.gravityReadings || []).map((r: any) => ({ ...r, batchNumber: b.batchNumber }))
    ).sort((a: any, b: any) => 
      new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
    )
    
    if (readings.length === 0) return null
    
    // Find OG (first reading or one with OG note)
    const ogReading = readings.find((r: any) => 
      r.notes?.includes('OG') || r.notes?.includes('ფერმენტაცია') || r.notes?.includes('საწყისი')
    ) || readings[0]
    
    // Find FG (reading with FG note or latest with conditioning note)
    // Look for readings with FG indicators, prioritizing those with actual gravity values
    const fgReading = readings.find((r: any) => {
      const hasFGNote = r.notes?.includes('FG') || 
                        r.notes?.includes('კონდიცირება') || 
                        r.notes?.includes('საბოლოო') ||
                        r.notes?.includes('საბოლოო სიმკვრივე')
      return hasFGNote && r.gravity && r.gravity > 0
    }) || readings.find((r: any) => 
      r.notes?.includes('FG') || r.notes?.includes('კონდიცირება') || r.notes?.includes('საბოლოო')
    )
    
    // ✅ Latest reading with actual gravity (not phase marker) for current SG
    const latestReading = readings
      .slice()
      .reverse() // Start from newest
      .find((r: any) => r.gravity && r.gravity > 0) || readings[readings.length - 1]
    
    const og = ogReading?.gravity || 0
    const fg = fgReading?.gravity || null
    const currentSG = latestReading?.gravity || og
    
    // Use FG if available, otherwise currentSG for attenuation
    const fgForCalc = (fg && fg > 0) ? fg : currentSG
    
    // ✅ Calculate ABV: Prioritize FG if available (final ABV), otherwise use currentSG (current ABV)
    // Values are in SG format, so use SG ABV formula: ABV = (OG - FG) * 131.25
    let abv = 0
    if (og > 0) {
      // Always prefer FG if it exists and is valid (FG should be less than OG)
      if (fg && fg > 0 && fg < og) {
        abv = (og - fg) * 131.25
      } 
      // Only use currentSG if FG is not available AND currentSG is different from OG
      else if (!fg && currentSG && currentSG > 0 && currentSG < og && currentSG !== og) {
        abv = (og - currentSG) * 131.25
      }
    }
    
    // ✅ Find latest reading with actual temperature using allGravityReadings (already sorted newest first)
    // Use allGravityReadings which is sorted descending (newest first) for temperature
    // Skip readings where temperature is 0, null, or undefined
    const latestTempReading = allGravityReadings.find((r: any) => 
      r.temperature != null && 
      r.temperature !== undefined && 
      r.temperature !== 0 &&
      r.temperature > 0
    )
    
    return {
      og,
      fg: fg || null,
      currentSG,
      targetFG: og * 0.25, // Approximate target FG
      abv: Math.max(0, abv), // Ensure non-negative
      attenuation: og > 0 && fgForCalc < og ? ((og - fgForCalc) / (og - 1)) * 100 : 0,
      latestTemp: latestTempReading?.temperature ?? 18,
    }
  }, [lot, allGravityReadings])

  // ✅ Generate short lot code for display (e.g., FERM-20260111-AAYDEI → LOT-0001 or just the suffix)
  const shortLotCode = useMemo(() => {
    if (!lot?.lotCode) return lot?.lotNumber || '-'
    
    // Extract suffix from lot code (last part after last hyphen)
    const parts = lot.lotCode.split('-')
    if (parts.length >= 3) {
      // Format: PHASE-DATE-SUFFIX → show as LOT-SUFFIX (e.g., LOT-AAYDEI)
      const suffix = parts[parts.length - 1]
      return `LOT-${suffix}`
    }
    return lot.lotCode
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

  // ✅ Calculate averages
  const latestReadings = useMemo(() => {
    if (!lot?.batches) return []
    return lot.batches.map((b: any) => b.gravityReadings?.[0]).filter(Boolean)
  }, [lot])
  
  const avgGravity = latestReadings.length > 0 
    ? latestReadings.reduce((sum: number, r: any) => sum + (r.gravity || 0), 0) / latestReadings.length
    : null

  // ✅ Add new reading for lot (affects all batches)
  const handleAddLotReading = async () => {
    if (!newReading.gravity || !lot) return
    
    try {
      // ✅ FIX: Only add reading to the FIRST batch to avoid duplicates
      // For blends, all batches share the same lot, so one reading is enough
      const primaryBatch = lot.batches?.[0]
      if (!primaryBatch) {
        alert('პარტია ვერ მოიძებნა')
        return
      }
      
      await fetch(`/api/batches/${primaryBatch.id}/gravity-readings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gravity: parseFloat(newReading.gravity),
          temperature: newReading.temperature ? parseFloat(newReading.temperature) : null,
          notes: newReading.notes || `${lot.lotCode || lot.lotNumber} გაზომვა`,  // ✅ Use blend lot code
        }),
      })
      
      // Refresh data
      router.refresh()
      setShowAddReadingModal(false)
      setNewReading({ gravity: '', temperature: '', notes: '' })
      
      // ✅ Trigger gravity readings refetch
      setReadingsRefreshKey(prev => prev + 1)
    } catch (error) {
      console.error('Failed to add lot reading:', error)
      alert('გაზომვის დამატება ვერ მოხერხდა')
    }
  }

  const handleAddMeasurement = () => {
    setShowAddReadingModal(true)
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

  // ✅ Use BLEND code for display if it's a blend lot
  const displayCode = isBlend && lot.lotCode?.startsWith('BLEND-')
    ? lot.lotCode
    : shortLotCode

  return (
    <DashboardLayout 
      title={displayCode} 
      breadcrumb={`მთავარი / წარმოება / ${displayCode}`}
    >
      {/* ✅ Phase Change Modal */}
      {showPhaseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-bg-card border border-border rounded-2xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">🔄 ფაზის შეცვლა</h2>
            
            <p className="text-text-muted mb-4">
              აირჩიეთ ახალი ფაზა <span className="text-copper-light font-mono">{shortLotCode}</span>-თვის
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
              {/* ✅ Use BLEND code for display if it's a blend lot */}
              <h1 className="text-2xl font-bold font-display" title={lot.lotCode}>
                {isBlend && lot.lotCode?.startsWith('BLEND-') ? lot.lotCode : shortLotCode}
              </h1>
              <BatchStatusBadge status={lot.status === 'COMPLETED' ? 'completed' : getStatusForBadge(lot.phase)} />
              {isBlend && (
                <BlendBadge batchCount={lot.batches.length} size="md" />
              )}
            </div>
            <p className="text-text-muted">
              {lot.batches[0]?.recipeName || 'Unknown Recipe'} • {lot.status === 'COMPLETED' ? '' : (lot.tank?.name || 'No Tank') + ' • '}{totals.volume}L
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => router.push('/production')}>
            ← უკან
          </Button>
          <Button variant="secondary" onClick={() => setShowReportModal(true)}>
            📋 ანგარიში
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
            <div className="flex gap-2">
              <Button 
                variant="primary" 
                onClick={() => setShowPackaging(true)}
              >
                📦 დაფასოვება
              </Button>
              <Button 
                variant="primary" 
                onClick={handleCompleteLot}
                disabled={isUpdating}
                className="bg-green-600 hover:bg-green-700"
              >
                {isUpdating ? '⏳' : '✅'} დასრულება
              </Button>
            </div>
          )}
          {/* ✅ Completed badge */}
          {lot.status === 'COMPLETED' && (
            <span className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg flex items-center gap-2">
              ✅ დასრულებული
            </span>
          )}
        </div>
      </div>

      {/* Packaging Status (if packaging) */}
      {lot.phase === 'PACKAGING' && lot.status !== 'COMPLETED' && (() => {
        const totalVolume = totals.volume || 0
        // ✅ For split lots, use lot's packaging runs instead of batch packagedVolume
        const lotPackagingRuns = lot.packagingRuns || []
        const packagedVolume = lotPackagingRuns.reduce((sum, run) => sum + (run.volumeTotal || 0), 0)
        const remainingVolume = Math.max(0, totalVolume - packagedVolume)
        const progressPercent = totalVolume > 0 ? Math.min(100, (packagedVolume / totalVolume) * 100) : 0
        
        // Debug log
        console.log('[LOT PACKAGING] Progress:', {
          totalVolume,
          packagedVolume,
          remainingVolume,
          lotCode: lot.lotCode,
          packagingRunsCount: lotPackagingRuns.length,
          packagingRuns: lotPackagingRuns.map(r => ({ volumeTotal: r.volumeTotal, lotNumber: r.lotNumber }))
        })
        
        return (
          <Card className="mb-6">
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
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                {progressPercent > 0 && (
                  <div className="text-center mt-2 text-sm text-text-muted">
                    {progressPercent.toFixed(0)}% დაფასოებული
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        )
      })()}

      {/* Stats Cards - Single Row */}
      <div className="grid grid-cols-6 gap-4 mb-6">
        {/* OG Actual */}
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-bold font-display text-amber-400">
            {isBlend && blendStats 
              ? formatGravity(blendStats.og, usePlato)
              : formatGravity(totals.avgOG, usePlato)}
          </p>
          <p className="text-xs text-text-muted">OG (ფაქტ.)</p>
        </div>
        
        {/* SG Current */}
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-bold font-display text-blue-400">
            {isBlend && blendStats 
              ? formatGravity(blendStats.currentSG, usePlato)
              : formatGravity(totals.avgSG, usePlato)}
          </p>
          <p className="text-xs text-text-muted">SG (მიმდ.)</p>
        </div>
        
        {/* FG Target */}
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-bold font-display text-green-400">
            {isBlend && blendStats?.fg 
              ? formatGravity(blendStats.fg, usePlato)
              : formatGravity(isBlend && blendStats ? blendStats.targetFG : totals.avgOG * 0.25, usePlato)}
          </p>
          <p className="text-xs text-text-muted">FG {blendStats?.fg ? '(ფაქტ.)' : '(სამიზნე)'}</p>
        </div>
        
        {/* ABV Current */}
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-bold font-display text-purple-400">
            {isBlend && blendStats 
              ? blendStats.abv.toFixed(1)
              : (totals.avgOG > 0 && totals.avgSG > 0 ? ((totals.avgOG - totals.avgSG) * 131.25).toFixed(1) : '0.0')}%
          </p>
          <p className="text-xs text-text-muted">ABV (მიმდ.)</p>
        </div>
        
        {/* Attenuation */}
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-bold font-display text-copper-light">
            {isBlend && blendStats 
              ? blendStats.attenuation.toFixed(0)
              : (totals.avgOG > 0 && totals.avgSG > 0 ? ((1 - totals.avgSG / totals.avgOG) * 100).toFixed(0) : '0')}%
          </p>
          <p className="text-xs text-text-muted">ატენუაცია</p>
        </div>
        
        {/* Temperature */}
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-bold font-display">
            {isBlend && blendStats ? blendStats.latestTemp : 18}°C
          </p>
          <p className="text-xs text-text-muted">ტემპერატურა</p>
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
          <div className="flex justify-between mt-3 text-xs gap-1">
            <div className={`flex items-center gap-0.5 ${lot.phase === 'FERMENTATION' ? 'text-purple-400' : 'text-text-muted'}`}>
              <span className="text-[10px]">●</span> <span className="whitespace-nowrap">ფერმენტაცია</span>
            </div>
            <div className={`flex items-center gap-0.5 ${lot.phase === 'CONDITIONING' ? 'text-purple-400' : 'text-text-muted'}`}>
              <span className="text-[10px]">●</span> <span className="whitespace-nowrap">კონდიც.</span>
            </div>
            <div className={`flex items-center gap-0.5 ${lot.phase === 'BRIGHT' ? 'text-purple-400' : 'text-text-muted'}`}>
              <span className="text-[10px]">●</span> <span className="whitespace-nowrap">მზადაა</span>
            </div>
            <div className={`flex items-center gap-0.5 ${lot.phase === 'PACKAGING' || lot.phase === 'COMPLETED' ? 'text-purple-400' : 'text-text-muted'}`}>
              <span className="text-[10px]">●</span> <span className="whitespace-nowrap">დაფასოება</span>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* ✅ Blend Batches - Horizontal Layout */}
      {isBlend && (
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-lg font-semibold">{lot.batches.length} პარტია შერეული</h2>
          </CardHeader>
          <CardBody>
            {/* Batches in horizontal row */}
            <div className="grid grid-cols-2 gap-4">
              {lot.batches.map((batch) => (
                <div 
                  key={batch.id}
                  className="flex items-center justify-between p-4 bg-bg-tertiary rounded-lg border border-border hover:border-purple-500/50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/production/${batch.id}`)}
                >
                  {/* Left side - Batch info */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <span className="text-lg">🍺</span>
                    </div>
                    <div>
                      <p className="font-medium font-mono">{batch.batchNumber}</p>
                      <p className="text-xs text-text-muted">
                        {batch.recipeName} • {batch.recipeStyle}
                      </p>
                    </div>
                  </div>
                  
                  {/* Right side - Volume with percentage inline */}
                  <p className="font-mono text-lg">
                    {batch.volumeContribution || batch.volume}L
                    {batch.batchPercentage && (
                      <span className="text-text-muted text-sm ml-1">({batch.batchPercentage.toFixed(1)}%)</span>
                    )}
                  </p>
                </div>
              ))}
            </div>
            
            {/* Total summary */}
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">სულ მოცულობა</span>
                <span className="font-mono font-medium">{totals.volume.toFixed(1)}L</span>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

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
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-bg-card border border-border rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-green-400">{totals.volume}L</p>
                    <p className="text-sm text-text-muted">სულ დაფასოებული</p>
                  </div>
                  <div className="bg-bg-card border border-border rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-purple-400">{lot.batches.length}</p>
                    <p className="text-sm text-text-muted">პარტიები</p>
                    {/* ✅ FIX: Show batch numbers for completed lots */}
                    {lot.batches.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {lot.batches.map((batch, idx) => (
                          <p key={batch.id || idx} className="text-xs text-text-secondary font-mono">
                            {batch.batchNumber || `Batch ${idx + 1}`}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="bg-bg-card border border-border rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-amber-400">
                      {totals.avgOG > 0 ? ((totals.avgOG - (totals.avgSG || 1.010)) * 131.25).toFixed(1) : '-'}%
                    </p>
                    <p className="text-sm text-text-muted">ABV</p>
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

          {/* 🍺 Fermentation Monitoring Chart */}
          <Card className="col-span-2">
            <CardBody className="p-0">
              {allGravityReadings.length > 0 ? (() => {
                // Calculate stats
                const sortedReadings = [...allGravityReadings].sort((a: any, b: any) => 
                  new Date(a.recordedAt || a.date).getTime() - new Date(b.recordedAt || b.date).getTime()
                )
                const latestReading = sortedReadings[sortedReadings.length - 1]
                const previousReading = sortedReadings.length > 1 ? sortedReadings[sortedReadings.length - 2] : null
                const firstReading = sortedReadings[0]
                
                const currentSG = latestReading?.gravity || 0
                const currentTemp = latestReading?.temperature || 0
                const delta24h = previousReading ? (currentSG - previousReading.gravity).toFixed(3) : '0.000'
                const og = firstReading?.gravity || currentSG
                const abv = og > currentSG ? ((og - currentSG) * 131.25).toFixed(1) : '0.0'
                const lastUpdate = formatDate(latestReading?.recordedAt || latestReading?.date)
                
                // Chart calculations
                const readings = sortedReadings.slice(-10) // Last 10 readings
                const gravities = readings.map((r: any) => r.gravity || 0)
                const temps = readings.map((r: any) => r.temperature || 0)
                const minSG = Math.min(...gravities) - 0.005
                const maxSG = Math.max(...gravities) + 0.005
                const minTemp = Math.min(...temps.filter((t: number) => t > 0)) - 2
                const maxTemp = Math.max(...temps) + 2
                
                // SVG dimensions
                const width = 100
                const height = 40
                const padding = 5
                
                const getSGY = (sg: number) => {
                  if (maxSG === minSG) return height / 2
                  return height - padding - ((sg - minSG) / (maxSG - minSG)) * (height - padding * 2)
                }
                
                const getTempY = (temp: number) => {
                  if (maxTemp === minTemp) return height / 2
                  return height - padding - ((temp - minTemp) / (maxTemp - minTemp)) * (height - padding * 2)
                }
                
                const getX = (idx: number, total: number) => {
                  if (total <= 1) return width / 2
                  return padding + (idx / (total - 1)) * (width - padding * 2)
                }
                
                // Generate SVG path
                const sgPath = readings.map((r: any, i: number) => 
                  `${i === 0 ? 'M' : 'L'} ${getX(i, readings.length)} ${getSGY(r.gravity || 0)}`
                ).join(' ')
                
                const tempPath = readings.map((r: any, i: number) => 
                  `${i === 0 ? 'M' : 'L'} ${getX(i, readings.length)} ${getTempY(r.temperature || 0)}`
                ).join(' ')
                
                // Find OG and FG points
                const ogPoint = readings.find((r: any) => r.notes?.includes('OG') || r.notes?.includes('ფერმენტაცია'))
                const fgPoint = readings.find((r: any) => r.notes?.includes('FG') || r.notes?.includes('კონდიცირება'))
                
                return (
                  <div className="bg-bg-tertiary rounded-xl border border-border">
                    {/* Header Stats */}
                    <div className="p-4 border-b border-border">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          🍺 ფერმენტაციის მონიტორინგი
                        </h3>
                        <Button size="sm" onClick={handleAddMeasurement}>+ გაზომვა</Button>
                      </div>
                      <div className="grid grid-cols-5 gap-4 text-sm">
                        <div>
                          <span className="text-text-muted block">მიმდინარე {usePlato ? '°P' : 'SG'}</span>
                          <span className="text-xl font-mono text-copper">{formatGravity(currentSG, usePlato)}</span>
                        </div>
                        <div>
                          <span className="text-text-muted block">Δ24სთ</span>
                          <span className={`text-xl font-mono ${parseFloat(delta24h) < 0 ? 'text-green-400' : 'text-text'}`}>
                            {parseFloat(delta24h) <= 0 ? delta24h : `+${delta24h}`}
                          </span>
                        </div>
                        <div>
                          <span className="text-text-muted block">ტემპ.</span>
                          <span className="text-xl font-mono text-blue-400">{currentTemp}°C</span>
                        </div>
                        <div>
                          <span className="text-text-muted block">ABV</span>
                          <span className="text-xl font-mono text-amber-400">{abv}%</span>
                        </div>
                        <div>
                          <span className="text-text-muted block">განახლება</span>
                          <span className="text-sm text-text-muted">{lastUpdate}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* SG Chart */}
                    <div className="p-4 border-b border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm text-text-muted">{usePlato ? '°P (Plato)' : 'SG (სიმკვრივე)'}</span>
                      </div>
                      <div className="relative h-32 bg-bg-secondary rounded-lg p-2">
                        {/* Y-axis labels */}
                        <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs text-text-muted py-2">
                          <span>{formatGravity(maxSG, usePlato)}</span>
                          <span>{formatGravity((maxSG + minSG) / 2, usePlato)}</span>
                          <span>{formatGravity(minSG, usePlato)}</span>
                        </div>
                        {/* Chart area */}
                        <div className="ml-14 h-full">
                          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
                            {/* Grid lines */}
                            <line x1="0" y1={height/3} x2={width} y2={height/3} stroke="#333" strokeWidth="0.5" strokeDasharray="2,2" />
                            <line x1="0" y1={height*2/3} x2={width} y2={height*2/3} stroke="#333" strokeWidth="0.5" strokeDasharray="2,2" />
                            
                            {/* SG Line */}
                            <path d={sgPath} fill="none" stroke="#D4A574" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            
                            {/* Data points */}
                            {readings.map((r: any, i: number) => {
                              const isOG = r.notes?.includes('OG') || r.notes?.includes('ფერმენტაცია') || i === 0
                              const isFG = r.notes?.includes('FG') || r.notes?.includes('კონდიცირება')
                              return (
                                <g key={r.id || i}>
                                  <circle 
                                    cx={getX(i, readings.length)} 
                                    cy={getSGY(r.gravity || 0)} 
                                    r="2" 
                                    fill={isOG ? '#D4A574' : isFG ? '#60A5FA' : '#D4A574'}
                                    stroke={isOG || isFG ? '#fff' : 'none'}
                                    strokeWidth="1"
                                  />
                                  {/* Labels for OG/FG */}
                                  {isOG && i === 0 && (
                                    <text x={getX(i, readings.length) + 3} y={getSGY(r.gravity || 0) - 3} fill="#D4A574" fontSize="4">
                                      OG {formatGravity(r.gravity, usePlato)} 🍺
                                    </text>
                                  )}
                                  {isFG && (
                                    <text x={getX(i, readings.length) + 3} y={getSGY(r.gravity || 0) - 3} fill="#60A5FA" fontSize="4">
                                      FG {formatGravity(r.gravity, usePlato)} ❄️
                                    </text>
                                  )}
                                </g>
                              )
                            })}
                          </svg>
                        </div>
                      </div>
                    </div>
                    
                    {/* Temperature Chart */}
                    <div className="p-4 border-b border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm text-text-muted">ტემპერატურა (°C)</span>
                      </div>
                      <div className="relative h-24 bg-bg-secondary rounded-lg p-2">
                        {/* Y-axis labels */}
                        <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs text-text-muted py-2">
                          <span>{maxTemp.toFixed(0)}°</span>
                          <span>{((maxTemp + minTemp) / 2).toFixed(0)}°</span>
                          <span>{minTemp.toFixed(0)}°</span>
                        </div>
                        {/* Chart area */}
                        <div className="ml-14 h-full">
                          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
                            {/* Grid lines */}
                            <line x1="0" y1={height/2} x2={width} y2={height/2} stroke="#333" strokeWidth="0.5" strokeDasharray="2,2" />
                            
                            {/* Temperature Line */}
                            <path d={tempPath} fill="none" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            
                            {/* Data points */}
                            {readings.map((r: any, i: number) => (
                              <circle 
                                key={r.id || i}
                                cx={getX(i, readings.length)} 
                                cy={getTempY(r.temperature || 0)} 
                                r="2" 
                                fill="#60A5FA"
                              />
                            ))}
                          </svg>
                        </div>
                      </div>
                    </div>
                    
                    {/* Timeline Legend */}
                    <div className="p-4">
                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-copper"></span>
                          <span>🍺 ფერმენტაციის დაწყება (OG)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-blue-400"></span>
                          <span>❄️ კონდიცირებაზე გადასვლა (FG)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })() : (
                <div className="h-64 flex flex-col items-center justify-center text-text-muted bg-bg-tertiary rounded-xl border border-border">
                  <span className="text-4xl mb-4">🍺</span>
                  <p className="mb-4">გაზომვები არ არის</p>
                  <Button onClick={handleAddMeasurement}>+ დაამატე პირველი გაზომვა</Button>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Info Panel */}
          <div className="space-y-6">
            {/* Info */}
            <Card>
              <CardHeader>
                <span className="text-lg font-semibold">📋 ინფორმაცია</span>
              </CardHeader>
              <CardBody>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-text-muted">ტექნოლოგი</span>
                    <span>user1</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">რეცეპტი</span>
                    <span>{lot.batches[0]?.recipeName || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">პარტია</span>
                    <span className="text-right">
                      {lot.batches.length === 1 ? (
                        lot.batches[0]?.batchNumber || '-'
                      ) : (
                        <div className="space-y-1">
                          {lot.batches.map((batch, idx) => (
                            <div key={batch.id || idx} className="text-sm font-mono">
                              {batch.batchNumber || `Batch ${idx + 1}`}
                            </div>
                          ))}
                          <div className="text-xs text-text-muted mt-1">
                            {(() => {
                              // Check if batches have same batchNumber (split) or different (blend)
                              const firstBatchNumber = lot.batches[0]?.batchNumber
                              const allSameNumber = lot.batches.every(b => b.batchNumber === firstBatchNumber)
                              return allSameNumber ? '(გაყოფილი)' : '(შერეული)'
                            })()}
                          </div>
                        </div>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">ავზი</span>
                    <span>{lot.tank?.name || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">მოცულობა</span>
                    <span>{(lot.actualVolume || lot.plannedVolume || 0).toFixed(0)} L</span>
                  </div>
                </div>
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

          </div>
        </div>
      )}

      {/* Measurements Tab */}
      {activeTab === 'measurements' && (
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
            {allGravityReadings.length > 0 ? (
              <div className="space-y-6">
                {isBlend ? (
                  <div className="space-y-6">
                    {/* Blend Summary Stats */}
                    <div className="grid grid-cols-4 gap-4 p-4 bg-bg-tertiary rounded-lg border border-border">
                      <div className="text-center">
                        <p className="text-2xl font-bold font-mono text-amber-400">
                          {allGravityReadings.length > 0 
                            ? formatGravity(allGravityReadings[allGravityReadings.length - 1]?.gravity, usePlato)
                            : '-'}
                        </p>
                        <p className="text-xs text-text-muted">OG</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold font-mono text-blue-400">
                          {allGravityReadings.length > 0 
                            ? formatGravity(allGravityReadings[0]?.gravity, usePlato)
                            : '-'}
                        </p>
                        <p className="text-xs text-text-muted">{usePlato ? 'SG (°P)' : 'SG'}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold font-mono text-purple-400">
                          {allGravityReadings.length}
                        </p>
                        <p className="text-xs text-text-muted">სულ გაზომვა</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold font-mono text-green-400">
                          {(() => {
                            if (allGravityReadings.length < 2) return '0.0'
                            const og = allGravityReadings[allGravityReadings.length - 1]?.gravity || 0
                            const sg = allGravityReadings[0]?.gravity || 0
                            return ((og - sg) * 131.25).toFixed(1)
                          })()}%
                        </p>
                        <p className="text-xs text-text-muted">ABV</p>
                      </div>
                    </div>

                    {/* ✅ Consolidated Blend Readings - All under BLEND lot code */}
                    <div className="bg-bg-tertiary rounded-lg border border-border overflow-hidden">
                      {/* Blend Header */}
                      <div className="p-4 border-b border-border flex items-center justify-between bg-purple-500/10">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                            <span className="text-lg">🔀</span>
                          </div>
                          <div>
                            <p className="font-medium font-mono">{lot.lotCode}</p>
                            <p className="text-xs text-text-muted">
                              {lot.batches.length} პარტია შერეული • {totals.volume}L
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="text-right">
                            <p className="font-mono text-amber-400">
                              {allGravityReadings.length > 0 
                                ? formatGravity(allGravityReadings[allGravityReadings.length - 1]?.gravity, usePlato)
                                : '-'}
                            </p>
                            <p className="text-xs text-text-muted">OG</p>
                          </div>
                          <span className="text-text-muted">→</span>
                          <div className="text-right">
                            <p className="font-mono text-blue-400">
                              {allGravityReadings.length > 0 
                                ? formatGravity(allGravityReadings[0]?.gravity, usePlato)
                                : '-'}
                            </p>
                            <p className="text-xs text-text-muted">SG</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* ✅ All Readings Table - Consolidated */}
                      {allGravityReadings.length > 0 ? (
                        <div className="max-h-64 overflow-y-auto">
                          <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-bg-tertiary">
                              <tr className="text-text-muted border-b border-border">
                                <th className="text-left p-3">თარიღი</th>
                                <th className="text-left p-3">{usePlato ? '°P' : 'SG'}</th>
                                <th className="text-left p-3">°C</th>
                                <th className="text-left p-3">შენიშვნა</th>
                              </tr>
                            </thead>
                            <tbody>
                              {allGravityReadings.map((r: any, idx: number) => {
                                // ✅ For phase markers (gravity === 0), find last actual reading
                                // Readings are sorted DESC (newest first), so:
                                // - indices 0 to idx-1 are NEWER than current reading
                                // - indices idx+1 to end are OLDER than current reading
                                // For phase markers, we want the most recent actual reading that came BEFORE it chronologically
                                // So we look at indices after idx (older readings) and find the first one with actual gravity
                                const isPhaseMarker = !r.gravity || r.gravity === 0
                                let displayGravity = r.gravity
                                let displayTemp = r.temperature
                                
                                if (isPhaseMarker) {
                                  // Look at older readings (after current index) to find last actual reading before this phase marker
                                  const lastActualReading = allGravityReadings
                                    .slice(idx + 1) // Readings after this one (older chronologically)
                                    .find((prev: any) => prev.gravity && prev.gravity > 0)
                                  
                                  if (lastActualReading) {
                                    displayGravity = lastActualReading.gravity
                                    displayTemp = lastActualReading.temperature
                                  } else {
                                    // If no older reading found, use the most recent actual reading overall
                                    const mostRecentActual = allGravityReadings
                                      .find((prev: any) => prev.gravity && prev.gravity > 0)
                                    if (mostRecentActual) {
                                      displayGravity = mostRecentActual.gravity
                                      displayTemp = mostRecentActual.temperature
                                    }
                                  }
                                }
                                
                                return (
                                  <tr key={r.id || idx} className="border-b border-border/50 hover:bg-bg-secondary/50">
                                    <td className="p-3 text-text-muted">{formatDate(new Date(r.recordedAt || r.date))}</td>
                                    <td className="p-3 font-mono text-copper">{formatGravity(displayGravity, usePlato)}</td>
                                    <td className="p-3">{displayTemp ? `${displayTemp}°C` : '-'}</td>
                                    <td className="p-3 text-text-muted text-xs">
                                      {(() => {
                                        if (!r.notes) return '-'
                                        // Clean up auto-generated notes, keep custom notes
                                        let cleaned = r.notes
                                          .replace(`ლოტის გაზომვა: ${lot.lotCode}`, '')
                                          .replace(`${lot.lotCode} გაზომვა`, '')
                                          .trim()
                                        return cleaned || '-'
                                      })()}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="p-8 text-center text-text-muted">
                          <p className="text-4xl mb-2">📈</p>
                          <p>გაზომვები არ არის</p>
                          <Button variant="secondary" className="mt-4" onClick={handleAddMeasurement}>
                            + დაამატე პირველი გაზომვა
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Source batches info (collapsed) */}
                    <details className="bg-bg-tertiary rounded-lg border border-border">
                      <summary className="p-4 cursor-pointer text-sm text-text-muted hover:text-text">
                        📋 წყარო პარტიები ({lot.batches.length})
                      </summary>
                      <div className="p-4 pt-0 grid grid-cols-2 gap-2">
                        {lot.batches.map((batch) => (
                          <div key={batch.id} className="p-3 bg-bg-secondary rounded-lg text-sm">
                            <p className="font-mono">{batch.batchNumber}</p>
                            <p className="text-xs text-text-muted">{batch.recipeName} • {batch.volumeContribution || batch.volume}L</p>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                ) : (
                  // Single batch - existing table
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-text-muted border-b border-dark-700">
                        <th className="text-left p-2">თარიღი</th>
                        <th className="text-left p-2">პარტია</th>
                        <th className="text-left p-2">{usePlato ? '°P' : 'SG'}</th>
                        <th className="text-left p-2">°C</th>
                        <th className="text-left p-2">შენიშვნა</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allGravityReadings.map((r: any, idx: number) => (
                        <tr key={idx} className="border-b border-dark-800">
                          <td className="p-2">{formatDate(new Date(r.recordedAt || r.date))}</td>
                          <td className="p-2">{r.batchNumber || '-'}</td>
                          <td className="p-2 font-mono">{formatGravity(r.gravity, usePlato)}</td>
                          <td className="p-2">{r.temperature || '-'}</td>
                          <td className="p-2 text-text-muted">{r.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* ✅ Quality Tests Section - Same as batch detail page */}
                <Card className="mt-6">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <span>🧪 ხარისხის ტესტები</span>
                      <a href="/quality" className="text-sm text-copper-light hover:text-copper">
                        ყველას ნახვა →
                      </a>
                    </div>
                  </CardHeader>
                  <CardBody>
                    {loadingTests ? (
                      <p className="text-text-muted text-center py-8">იტვირთება...</p>
                    ) : qcTests.length > 0 ? (
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border text-left text-sm text-text-muted">
                            <th className="pb-3">თარიღი</th>
                            <th className="pb-3">ტესტი</th>
                            <th className="pb-3">შედეგი</th>
                            <th className="pb-3">დიაპაზონი</th>
                            <th className="pb-3">სტატუსი</th>
                            <th className="pb-3">შემსრულებელი</th>
                          </tr>
                        </thead>
                        <tbody>
                          {qcTests.map((test: any) => {
                            const statusConfig: Record<string, { label: string; class: string }> = {
                              SCHEDULED: { label: '⏳ დაგეგმილი', class: 'text-gray-400' },
                              IN_PROGRESS: { label: '🔄 მიმდინარე', class: 'text-blue-400' },
                              PASSED: { label: '✅ წარმატებული', class: 'text-green-400' },
                              WARNING: { label: '⚠️ გაფრთხილება', class: 'text-amber-400' },
                              FAILED: { label: '❌ ჩაჭრილი', class: 'text-red-400' },
                              CANCELLED: { label: '🚫 გაუქმებული', class: 'text-gray-400' },
                            }
                            const testNames: Record<string, string> = {
                              GRAVITY: 'სიმკვრივე (SG)',
                              TEMPERATURE: 'ტემპერატურა',
                              PH: 'pH დონე',
                              DISSOLVED_O2: 'გახსნილი O₂',
                              TURBIDITY: 'სიმღვრივე',
                              COLOR: 'ფერი (SRM)',
                              BITTERNESS: 'სიმწარე (IBU)',
                              ALCOHOL: 'ალკოჰოლი (ABV)',
                              CARBONATION: 'კარბონიზაცია',
                              APPEARANCE: 'გარეგნობა',
                              AROMA: 'არომატი',
                              TASTE: 'გემო',
                              MICROBIOLOGICAL: 'მიკრობიოლოგიური',
                            }
                            const status = statusConfig[test.status] || statusConfig.SCHEDULED
                            const testName = test.testName || testNames[test.testType] || test.testType
                            return (
                              <tr key={test.id} className="border-b border-border/50">
                                <td className="py-3">
                                  <p>{formatDate(new Date(test.completedDate || test.scheduledDate))}</p>
                                </td>
                                <td className="py-3">{testName}</td>
                                <td className="py-3 font-mono text-lg">
                                  {test.result ? `${Number(test.result).toFixed(3)} ${test.unit || ''}` : '-'}
                                </td>
                                <td className="py-3 text-sm text-text-muted">
                                  {test.minValue != null || test.maxValue != null
                                    ? `${test.minValue ?? '-'} - ${test.maxValue ?? '-'}`
                                    : '-'}
                                </td>
                                <td className={`py-3 text-sm ${status.class}`}>{status.label}</td>
                                <td className="py-3 text-sm">{test.performedBy || '-'}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-text-muted text-center py-8">ხარისხის ტესტები არ არის</p>
                    )}
                  </CardBody>
                </Card>
              </div>
            ) : (
              <div className="text-center py-12 text-text-muted">
                <p className="text-4xl mb-4">📈</p>
                <p>გაზომვები არ არის</p>
                <p className="text-sm mt-2">დაამატეთ პირველი გაზომვა</p>
                <Button variant="secondary" className="mt-4" onClick={handleAddMeasurement}>
                  + გაზომვის დამატება
                </Button>
              </div>
            )}
          </CardBody>
        </Card>
      )}
      
      {/* Add Reading Modal - Fixed Layout */}
      {showAddReadingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowAddReadingModal(false)} />
          <div className="relative bg-bg-secondary border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl mx-4">
            {/* Header */}
            <div className="p-4 border-b border-dark-700">
              <h3 className="text-lg font-bold">📊 გაზომვის დამატება</h3>
            </div>
            
            {/* Form */}
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-text-muted mb-1">
                  სიმკვრივე (SG) *
                </label>
                <input
                  type="number"
                  step="0.001"
                  placeholder="1.050"
                  value={newReading.gravity}
                  onChange={e => setNewReading(prev => ({ ...prev, gravity: e.target.value }))}
                  className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm text-text-muted mb-1">
                  ტემპერატურა (°C)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="18"
                  value={newReading.temperature}
                  onChange={e => setNewReading(prev => ({ ...prev, temperature: e.target.value }))}
                  className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm text-text-muted mb-1">
                  შენიშვნა
                </label>
                <textarea
                  placeholder="დამატებითი ინფორმაცია..."
                  value={newReading.notes}
                  onChange={e => setNewReading(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-white h-20 resize-none"
                />
              </div>
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-dark-700 flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowAddReadingModal(false)
                  setNewReading({ gravity: '', temperature: '', notes: '' })
                }}
                className="px-4 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg"
              >
                გაუქმება
              </button>
              <button
                onClick={handleAddLotReading}
                disabled={!newReading.gravity}
                className="px-4 py-2 bg-copper-600 hover:bg-copper-500 disabled:opacity-50 rounded-lg"
              >
                დამატება
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Timeline Tab */}
      {activeTab === 'timeline' && (
        <Card>
          <CardHeader>
            <span className="text-lg font-semibold">📅 ტაიმლაინი</span>
          </CardHeader>
          <CardBody>
            {isBlend ? (
              <div className="space-y-4">
                {/* Blend creation event */}
                <div className="flex gap-4 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">🔀</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">ბლენდის შექმნა</p>
                    <p className="text-sm text-text-muted">
                      შეერთდა {lot.batches.length} პარტია: {lot.batches.map(b => b.batchNumber).join(', ')}
                    </p>
                    <p className="text-sm text-text-muted">
                      სულ მოცულობა: {totals.volume}L
                    </p>
                    <p className="text-xs text-text-muted mt-1">{formatDate(new Date(lot.createdAt))}</p>
                  </div>
                </div>

                {/* Current Phase */}
                <div className="flex gap-4 p-4 bg-bg-tertiary border border-border rounded-lg">
                  <div className="w-12 h-12 bg-copper/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">{lot.phase === 'FERMENTATION' ? '🧪' : lot.phase === 'CONDITIONING' ? '❄️' : '📦'}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{getPhaseLabel(lot.phase)}</p>
                    <p className="text-sm text-text-muted">ავზი: {lot.tank?.name || '-'}</p>
                    <p className="text-xs text-text-muted mt-1">მიმდინარე ფაზა</p>
                  </div>
                </div>
                
                {/* Per-Batch Timeline */}
                <div>
                  <h3 className="text-sm font-semibold text-text-muted mb-3 flex items-center gap-2">
                    <span>🍺</span> პარტიების ისტორია
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {lot.batches.map((batch) => {
                      const batchReadings = batch.gravityReadings || []
                      const ogReading = batchReadings.find((r: any) => r.notes?.includes('OG') || r.notes?.includes('ფერმენტაცია'))
                      const fgReading = batchReadings.find((r: any) => r.notes?.includes('FG') || r.notes?.includes('კონდიცირება'))
                      
                      return (
                        <div key={batch.id} className="bg-bg-tertiary rounded-lg border border-border p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-lg">🍺</span>
                            <span className="font-mono font-medium">{batch.batchNumber}</span>
                          </div>
                          <div className="space-y-2 text-sm">
                            {batch.brewedAt && (
                              <div className="flex justify-between">
                                <span className="text-text-muted">🧪 დადუღება</span>
                                <span>{formatDate(new Date(batch.brewedAt))}</span>
                              </div>
                            )}
                            {ogReading && (
                              <div className="flex justify-between">
                                <span className="text-text-muted">📊 OG</span>
                                <span className="font-mono">{formatGravity(ogReading.gravity, usePlato)}</span>
                              </div>
                            )}
                            {fgReading && (
                              <div className="flex justify-between">
                                <span className="text-text-muted">❄️ FG</span>
                                <span className="font-mono">{formatGravity(fgReading.gravity, usePlato)}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-text-muted">📦 მოცულობა</span>
                              <span>{batch.volumeContribution || batch.volume}L</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* All Gravity Readings Timeline */}
                {allGravityReadings.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-text-muted mb-3 flex items-center gap-2">
                      <span>📈</span> გაზომვების ისტორია
                    </h3>
                    <div className="space-y-2">
                      {allGravityReadings.slice(0, 10).map((reading: any, idx: number) => (
                        <div key={reading.id || idx} className="flex gap-3 p-3 bg-bg-tertiary rounded-lg">
                          <div className="w-8 h-8 bg-copper/20 rounded-full flex items-center justify-center flex-shrink-0">
                            <span>📊</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-sm">{reading.batchNumber}</span>
                              <span className="font-mono text-copper">{formatGravity(reading.gravity, usePlato)}</span>
                            </div>
                            <p className="text-xs text-text-muted">
                              {reading.temperature && `${reading.temperature}°C • `}
                              {formatDate(new Date(reading.recordedAt))}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* ✅ Build timeline from gravity readings and lot events */}
                {(() => {
                  // Collect all timeline events
                  const events: Array<{
                    date: Date
                    type: 'lot_created' | 'tank_transfer' | 'batch_added' | 'phase_change' | 'measurement' | 'packaging'
                    icon: string
                    title: string
                    subtitle: string
                    color: string
                  }> = []
                  
                  // 1. Lot created
                  events.push({
                    date: new Date(lot.createdAt),
                    type: 'lot_created',
                    icon: '🔄',
                    title: 'ლოტი შეიქმნა',
                    subtitle: `${lot.batches.length} პარტია შერეული`,
                    color: 'bg-purple-500/20',
                  })
                
                // 2. Batches added
                lot.batches.forEach(batch => {
                  if (batch.brewedAt) {
                    events.push({
                      date: new Date(batch.brewedAt),
                      type: 'batch_added',
                      icon: '🍺',
                      title: `${batch.batchNumber} დაემატა`,
                      subtitle: `${batch.volumeContribution || batch.volume}L • ${batch.recipeName || 'რეცეპტი'}`,
                      color: 'bg-copper/20',
                    })
                  }
                })
                
                // 3. Phase changes from gravity readings
                lot.batches.forEach(batch => {
                  (batch.gravityReadings || []).forEach(reading => {
                    const notes = reading.notes || ''
                    let icon = '📊'
                    let title = 'გაზომვა'
                    let color = 'bg-blue-500/20'
                    let isPhaseMarker = false
                    
                    // Check for phase change markers - ORDER MATTERS!
                    // PACKAGING must be checked BEFORE BRIGHT because PACKAGING notes contain "BRIGHT → PACKAGING"
                    if (notes.includes('დაფასოება დაიწყო') || notes.includes('→ PACKAGING')) {
                      icon = '📦'
                      title = 'დაფასოება დაიწყო'
                      color = 'bg-amber-500/20'
                      isPhaseMarker = true
                    } else if (notes.includes('დასრულდა') || notes.includes('COMPLETED')) {
                      icon = '✅'
                      title = 'ლოტი დასრულდა'
                      color = 'bg-green-500/20'
                      isPhaseMarker = true
                    } else if (notes.includes('მზადაა') || notes.includes('→ BRIGHT')) {
                      icon = '✨'
                      title = 'მზადაა (Bright)'
                      color = 'bg-yellow-500/20'
                      isPhaseMarker = true
                    } else if (notes.includes('ფერმენტაცია') || notes.includes('OG')) {
                      icon = '🧪'
                      title = 'ფერმენტაცია დაიწყო'
                      color = 'bg-blue-500/20'
                      isPhaseMarker = notes.includes('დაწყება')
                    } else if (notes.includes('კონდიცირება') || notes.includes('FG')) {
                      icon = '❄️'
                      title = 'კონდიცირება დაიწყო'
                      color = 'bg-cyan-500/20'
                      isPhaseMarker = notes.includes('გადასვლა')
                    } else if (notes.includes('შერევა') || notes.includes('blend')) {
                      icon = '🔀'
                      title = 'პარტიები შეერია'
                      color = 'bg-purple-500/20'
                      isPhaseMarker = true
                    }
                    
                    // Build subtitle based on whether it's a phase marker or actual measurement
                    const subtitle = isPhaseMarker && reading.gravity === 0
                      ? notes.replace(/[✨📦✅🧪❄️🔀]/g, '').trim()
                      : `${batch.batchNumber}: ${formatGravity(reading.gravity, usePlato)} @ ${reading.temperature || '-'}°C`
                    
                    events.push({
                      date: reading.recordedAt ? new Date(reading.recordedAt) : new Date(),
                      type: 'phase_change',
                      icon,
                      title,
                      subtitle,
                      color,
                    })
                  })
                })
                
                // 4. Tank transfer
                if (lot.tankAssignment?.startTime) {
                  events.push({
                    date: new Date(lot.tankAssignment.startTime),
                    type: 'tank_transfer',
                    icon: '🏭',
                    title: 'ავზში გადატანა',
                    subtitle: `${lot.tank?.name || 'ავზი'} - ${getPhaseLabel(lot.tankAssignment.phase)}`,
                    color: 'bg-green-500/20',
                  })
                }
                
                // 5. ✅ Packaging runs
                const getPackageIcon = (type: string) => {
                  if (type.startsWith('KEG')) return '🛢️'
                  if (type.startsWith('BOTTLE')) return '🍾'
                  if (type.startsWith('CAN')) return '🥫'
                  return '📦'
                }
                
                const getPackageTypeName = (type: string) => {
                  const names: Record<string, string> = {
                    'KEG_50': 'კეგი 50L',
                    'KEG_30': 'კეგი 30L',
                    'KEG_20': 'კეგი 20L',
                    'BOTTLE_750': 'ბოთლი 750ml',
                    'BOTTLE_500': 'ბოთლი 500ml',
                    'BOTTLE_330': 'ბოთლი 330ml',
                    'CAN_500': 'ქილა 500ml',
                    'CAN_330': 'ქილა 330ml',
                  }
                  return names[type] || type
                }
                
                const packagingRuns = lot.packagingRuns || [];
                packagingRuns.forEach(run => {
                  if (run.performedAt) {
                    events.push({
                      date: new Date(run.performedAt),
                      type: 'packaging',
                      icon: getPackageIcon(run.packageType),
                      title: `ჩამოსხმა: ${getPackageTypeName(run.packageType)}`,
                      subtitle: `${run.quantity} ცალი (${run.volumeTotal.toFixed(1)}L)`,
                      color: 'bg-emerald-500/20',
                    })
                  }
                });
                
                // Sort by date descending (newest first)
                  events.sort((a, b) => b.date.getTime() - a.date.getTime())
                  
                  return events.map((event, idx) => (
                    <div key={`${event.type}-${idx}`} className="flex gap-4">
                      <div className={`w-10 h-10 ${event.color} rounded-full flex items-center justify-center flex-shrink-0`}>
                        <span>{event.icon}</span>
                      </div>
                      <div className={`flex-1 pb-4 ${idx < events.length - 1 ? 'border-b border-border' : ''}`}>
                        <p className="font-medium">{event.title}</p>
                        <p className="text-sm text-text-muted">{event.subtitle}</p>
                        <p className="text-xs text-text-muted mt-1">{formatDate(event.date)}</p>
                      </div>
                    </div>
                  ))
                })()}
              </div>
            )}
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
            {isBlend ? (
              <div className="space-y-6">
                {lot.batches.map((batch) => (
                  <div key={batch.id}>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <span className="font-mono">{batch.batchNumber}</span>
                      <span className="text-text-muted font-normal">
                        ({batch.volumeContribution || batch.volume}L • {batch.batchPercentage?.toFixed(1)}%)
                      </span>
                    </h3>
                    
                    {/* Fetch and display batch ingredients */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-bg-tertiary rounded-lg">
                        <p className="text-sm text-text-muted mb-2">სოლოდები</p>
                        {/* Render malt ingredients */}
                        <p className="text-xs text-text-muted italic">ინგრედიენტები იტვირთება...</p>
                      </div>
                      <div className="p-4 bg-bg-tertiary rounded-lg">
                        <p className="text-sm text-text-muted mb-2">ჰოპები</p>
                        {/* Render hop ingredients */}
                        <p className="text-xs text-text-muted italic">ინგრედიენტები იტვირთება...</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-text-muted">ინგრედიენტები არ არის ხელმისაწვდომი lot-ისთვის</p>
            )}
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

      {/* Packaging Modal */}
      {lot && (
        <PackagingModal
          isOpen={showPackaging}
          onClose={() => setShowPackaging(false)}
          onComplete={(packagingData) => {
            console.log('Packaging completed:', packagingData)
            setShowPackaging(false)
            alert('დაფასოვება დამატებულია!')
            // Refresh page to get updated data
            window.location.reload()
          }}
          batchId={lot.batches[0]?.id || lot.id}
          batchIds={lot.batches.map(b => b.id)}  // ✅ Pass all batch IDs for blend lots
          batchNumber={lot.lotCode}
          recipeName={lot.batches[0]?.recipeName || 'შერეული ლოტი'}
          availableLiters={(() => {
            const lotPackagingRuns = lot.packagingRuns || []
            const packagedVolume = lotPackagingRuns.reduce((sum, run) => sum + (run.volumeTotal || 0), 0)
            return totals.volume - packagedVolume
          })()}
        />
      )}
      
      {/* Lot Report Modal */}
      {lot && (
        <LotReportModal
          lot={lot}
          qcTests={qcTests}
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </DashboardLayout>
  )
}