'use client'

import { useState, useEffect, useMemo, Suspense, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout'
import { Button } from '@/components/ui'
import { ResourceTimeline, EventDetailModal, OrdersCalendar, UpcomingEvents } from '@/components/calendar'
import type { CalendarEvent as ResourceCalendarEvent, Resource } from '@/components/calendar'
import { NewBatchModal } from '@/components/brewery'
import { StartFermentationModalV2, TransferToConditioningModalV2 } from '@/components/production'
import { StartBrewingModal, getIngredientStockStatus } from '@/components/brewery'
import { TankDetailModal } from '@/components/fermentation'
import { formatDate } from '@/lib/utils'

// Types
interface Tank {
  id: string
  name: string
  type: 'fermenter' | 'brite' | 'kettle'
  capacity: number
  currentTemp?: number
  status: 'available' | 'in_use' | 'cleaning' | 'maintenance'
}

interface CalendarEvent {
  id: string
  type: 'brewing' | 'fermentation' | 'conditioning' | 'packaging' | 'maintenance' | 'cip' | 'order' | 'delivery'
  title: string
  batchId?: string
  batchNumber?: string
  recipe?: string
  recipeName?: string
  tankId?: string
  tankName?: string
  startDate: Date
  endDate: Date
  status: 'scheduled' | 'active' | 'completed'
  batchStatus?: string  // PLANNED, BREWING, FERMENTING, etc.
  progress?: number
  temperature?: number
  notes?: string
  customerName?: string
  quantity?: string
  volume?: number | string  // ✅ Add volume for batch (can be string from API)
  // ✅ Add for split batch operations
  lotId?: string
  isSplitLot?: boolean
  lotPhase?: string
  phase?: string
}

// Helpers
// ✅ FIX: Center current day in the week view (3 days before, 3 days after)
const getWeekStart = (date: Date): Date => {
  const d = new Date(date)
  d.setDate(d.getDate() - 3)  // 3 days before current day
  d.setHours(12, 0, 0, 0)  // Use noon for consistency
  return d
}

const getWeekEnd = (weekStart: Date): Date => {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  return weekEnd
}

const formatWeekRange = (weekStart: Date): string => {
  const weekEnd = getWeekEnd(weekStart)
  return `${formatDate(weekStart)} - ${formatDate(weekEnd)}`
}

// Filter config
const PRODUCTION_FILTERS = [
  { key: 'batch', label: 'პარტიები', icon: '🍺', color: 'bg-amber-500' },
  { key: 'cip', label: 'CIP', icon: '🧹', color: 'bg-blue-500' },
  { key: 'maintenance', label: 'მომსახურება', icon: '🔧', color: 'bg-orange-500' },
]

const ORDER_FILTERS = [
  { key: 'order', label: 'შეკვეთები', icon: '📦', color: 'bg-green-500' },
  { key: 'delivery', label: 'მიწოდება', icon: '🚚', color: 'bg-purple-500' },
  { key: 'packaging', label: 'ჩამოსხმა', icon: '🎁', color: 'bg-cyan-500' },
]

function CalendarContent() {
  const router = useRouter()
  // State
  const [activeTab, setActiveTab] = useState<'production' | 'orders'>('production')
  const [weekStart, setWeekStart] = useState(getWeekStart(new Date()))
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [showNewBatchModal, setShowNewBatchModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showEventModal, setShowEventModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTankId, setSelectedTankId] = useState<string | null>(null)
  const [selectedTankForModal, setSelectedTankForModal] = useState<any>(null)
  
  // Phase change modals state
  const [showBrewingModal, setShowBrewingModal] = useState(false)
  const [showFermentationModal, setShowFermentationModal] = useState(false)
  const [showConditioningModal, setShowConditioningModal] = useState(false)
  const [selectedBatchForPhaseChange, setSelectedBatchForPhaseChange] = useState<any>(null)
  // ✅ NEW: Store the specific lot info when doing phase change for split batches
  const [selectedLotForPhaseChange, setSelectedLotForPhaseChange] = useState<{
    lotId: string
    lotCode: string
    tankId: string
    tankName: string
    volume: number | null
  } | null>(null)
  // Removed productionFilters - not needed in new design
  const [orderFilters, setOrderFilters] = useState<string[]>(['order', 'delivery', 'packaging'])
  const [orderEvents, setOrderEvents] = useState<CalendarEvent[]>([])

  // ✅ NEW: API data state
  const [apiEquipment, setApiEquipment] = useState<any[]>([])
  const [apiBatches, setApiBatches] = useState<any[]>([])
  const [apiCipLogs, setApiCipLogs] = useState<any[]>([])
  const [apiMaintenanceRecords, setApiMaintenanceRecords] = useState<any[]>([])
  const [apiInventory, setApiInventory] = useState<any[]>([])  // ✅ Add inventory state
  const [isLoading, setIsLoading] = useState(true)

  // ✅ NEW: Fetch data from API (same as production page)
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        
        // Fetch equipment
        const eqRes = await fetch('/api/equipment')
        if (eqRes.ok) {
          const eqData = await eqRes.json()
          console.log('[Calendar API] Equipment loaded:', eqData.length)
          setApiEquipment(eqData)
        }

         // Fetch batches - handle both array and object response
         const batchRes = await fetch('/api/batches?includeCompleted=true')
         if (batchRes.ok) {
           const batchData = await batchRes.json()
           // API returns { batches: [...] } or just [...]
           const batchesArray = Array.isArray(batchData) ? batchData : (batchData.batches || [])
           console.log('[Calendar API] Batches loaded:', batchesArray.length)
           // ✅ DEBUG: Log COMPLETED batches
           const completedBatches = batchesArray.filter((b: any) => b.status?.toUpperCase() === 'COMPLETED')
           completedBatches.forEach((b: any) => {
             console.log(`[Calendar DEBUG] COMPLETED batch: ${b.batchNumber}, completedAt=${b.completedAt}, estimatedEndDate=${b.estimatedEndDate}`)
           })
           setApiBatches(batchesArray)
         }

         // CIP logs - skip if not exists
         try {
           const cipRes = await fetch('/api/cip-logs')
           if (cipRes.ok) {
             const cipData = await cipRes.json()
             const cipArray = Array.isArray(cipData) ? cipData : (cipData.cipLogs || cipData.logs || [])
             console.log('[Calendar API] CIP logs loaded:', cipArray.length)
             setApiCipLogs(cipArray)
           }
         } catch (e) {
           console.log('[Calendar] CIP logs API not available')
           setApiCipLogs([])
         }

         // Fetch maintenance records
         try {
           const maintenanceRes = await fetch('/api/maintenance')
           if (maintenanceRes.ok) {
             const maintenanceData = await maintenanceRes.json()
             // ✅ FIX: Handle { maintenanceLogs: [...] } format from API
             const maintenanceArray = Array.isArray(maintenanceData) 
               ? maintenanceData 
               : (maintenanceData.maintenanceLogs || maintenanceData.records || [])
             console.log('[Calendar API] Maintenance records loaded:', maintenanceArray.length)
             setApiMaintenanceRecords(maintenanceArray)
           }
         } catch (e) {
           console.log('[Calendar] Maintenance API not available')
           setApiMaintenanceRecords([])
         }

         // ✅ Fetch inventory for StartBrewingModal
         try {
           const inventoryRes = await fetch('/api/inventory')
           if (inventoryRes.ok) {
             const inventoryData = await inventoryRes.json()
             const inventoryArray = Array.isArray(inventoryData) ? inventoryData : (inventoryData.items || inventoryData.inventory || [])
             console.log('[Calendar API] Inventory loaded:', inventoryArray.length)
             setApiInventory(inventoryArray)
           }
         } catch (e) {
           console.log('[Calendar] Inventory API not available')
           setApiInventory([])
         }
      } catch (error) {
        console.error('[Calendar API] Error fetching data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  // ✅ Transform equipment to resources (using API data)
  const resources: Resource[] = useMemo(() => {
    console.log('[Calendar] Processing equipment:', apiEquipment.length)
    
    const resourceList: Resource[] = []
    
    // Add brewhouse resources (kettles, mash tuns) - only from Equipment table
    const brewhouseEquipment = apiEquipment.filter((eq: any) => {
      const type = eq.type?.toLowerCase()
      return ['kettle', 'brewhouse', 'mash_tun', 'brew_kettle', 'boil_kettle'].includes(type)
    })
    
    // Only add equipment that exists in the database (no hardcoded fallback)
    brewhouseEquipment.forEach((eq: any) => {
      resourceList.push({
        id: eq.id,
        name: eq.name,
        type: 'brewhouse',
        capacity: Number(eq.capacity) || 0,
        needsCIP: eq.status === 'NEEDS_CIP',
      })
    })
    
    // Add fermenter resources
    apiEquipment
      .filter((eq: any) => {
        const type = eq.type?.toLowerCase()
        return ['fermenter', 'unitank'].includes(type)
      })
      .forEach((eq: any) => {
        resourceList.push({
          id: eq.id,
          name: eq.name,
          type: 'fermenter',
          capacity: Number(eq.capacity) || 0,
          needsCIP: eq.status === 'NEEDS_CIP',
        })
      })
    
    // Add conditioning resources (brite tanks)
    apiEquipment
      .filter((eq: any) => {
        const type = eq.type?.toLowerCase()
        return ['brite', 'brite_tank', 'conditioning_tank', 'storage'].includes(type)
      })
      .forEach((eq: any) => {
        resourceList.push({
          id: eq.id,
          name: eq.name,
          type: 'conditioning',
          capacity: Number(eq.capacity) || 0,
          needsCIP: eq.status === 'NEEDS_CIP',
        })
      })
    
    return resourceList
  }, [apiEquipment])

  // Convert batches to calendar events (ResourceTimeline format)
  const batchEvents: ResourceCalendarEvent[] = useMemo(() => {
    console.log('[Calendar] Creating batch events from:', apiBatches.length, 'batches')
    
    // ═══════════════════════════════════════════════════════════════
    // ✅ NEW BLEND HANDLING: Process blends specially
    // - Each batch's FERMENTATION lots → use that batch's own name
    // - Shared CONDITIONING/BRIGHT lot → use combined name, process once
    // ═══════════════════════════════════════════════════════════════
    
    // Include CONDITIONING, BRIGHT, READY phases
    const blendPhases = ['CONDITIONING', 'BRIGHT', 'READY', 'PACKAGING']
    
    // ✅ IMPROVED: Detect blends by shared LOT ID (multiple batches with same lot)
    const lotToBatches = new Map<string, any[]>()
    
    apiBatches.forEach((batch: any) => {
      batch.allLots?.forEach((lot: any) => {
        // Only consider lots in blend phases (not fermentation)
        if (blendPhases.includes(lot.phase)) {
          if (!lotToBatches.has(lot.id)) {
            lotToBatches.set(lot.id, [])
          }
          // Avoid duplicates
          if (!lotToBatches.get(lot.id)!.some((b: any) => b.id === batch.id)) {
            lotToBatches.get(lot.id)!.push(batch)
          }
        }
      })
    })
    
    // ✅ NEW: Detect FERMENTATION blends (batches sharing same lot during fermentation)
    const fermentationLotToBatches = new Map<string, any[]>()
    
    apiBatches.forEach((batch: any) => {
      batch.allLots?.forEach((lot: any) => {
        // Consider lots in FERMENTATION phase
        if (lot.phase === 'FERMENTATION') {
          if (!fermentationLotToBatches.has(lot.id)) {
            fermentationLotToBatches.set(lot.id, [])
          }
          // Avoid duplicates
          if (!fermentationLotToBatches.get(lot.id)!.some((b: any) => b.id === batch.id)) {
            fermentationLotToBatches.get(lot.id)!.push(batch)
          }
        }
      })
    })
    
    // Build blend map from shared lots
    const conditioningBlendTanks = new Map<string, any[]>()
    const processedBlendBatches = new Set<string>()
    
    lotToBatches.forEach((batches, lotId) => {
      if (batches.length > 1) {
        // This is a blend - multiple batches share the same lot
        const firstBatch = batches[0]
        const sharedLot = firstBatch.allLots?.find((l: any) => l.id === lotId)
        
        if (sharedLot) {
          // Find any assignment (ACTIVE preferred, but accept any)
          const activeAssignment = sharedLot.assignments?.find((a: any) => 
            blendPhases.includes(a.phase) && a.status === 'ACTIVE'
          ) || sharedLot.assignments?.find((a: any) => blendPhases.includes(a.phase))
          
          if (activeAssignment?.tankId) {
            const key = `blend-${activeAssignment.tankId}`
            
            // Build blend items for all batches
            const blendItems = batches.map((batch: any) => ({
              batch,
              conditioningLot: batch.allLots?.find((l: any) => l.id === lotId),
              condAssignment: activeAssignment,
            }))
            
            conditioningBlendTanks.set(key, blendItems)
            batches.forEach((b: any) => processedBlendBatches.add(b.id))
          }
        }
      }
    })
    
    // ✅ NEW: Build fermentation blend map
    const fermentationBlendTanks = new Map<string, any[]>()
    
    fermentationLotToBatches.forEach((batches, lotId) => {
      if (batches.length > 1) {
        // This is a fermentation blend - multiple batches share the same lot
        const firstBatch = batches[0]
        const sharedLot = firstBatch.allLots?.find((l: any) => l.id === lotId)
        
        if (sharedLot) {
          // Find active FERMENTATION assignment
          const activeAssignment = sharedLot.assignments?.find((a: any) => 
            a.phase === 'FERMENTATION' && a.status === 'ACTIVE'
          ) || sharedLot.assignments?.find((a: any) => a.phase === 'FERMENTATION')
          
          if (activeAssignment?.tankId) {
            const key = `blend-ferm-${activeAssignment.tankId}`
            
            // Build blend items for all batches
            const blendItems = batches.map((batch: any) => ({
              batch,
              fermentationLot: batch.allLots?.find((l: any) => l.id === lotId),
              fermAssignment: activeAssignment,
            }))
            
            fermentationBlendTanks.set(key, blendItems)
            batches.forEach((b: any) => processedBlendBatches.add(b.id))
          }
        }
      }
    })
    
    // Log detected conditioning blends
    conditioningBlendTanks.forEach((items, key) => {
      if (items.length > 1) {
        const phase = items[0].conditioningLot?.phase || 'CONDITIONING'
        console.log(`[Calendar] BLEND (${phase}) detected: ${items.map(i => i.batch.batchNumber).join(' + ')} → ${key}`)
      }
    })
    
    // ✅ Log detected fermentation blends
    fermentationBlendTanks.forEach((items, key) => {
      if (items.length > 1) {
        console.log(`[Calendar] BLEND (FERMENTATION) detected: ${items.map(i => i.batch.batchNumber).join(' + ')} → ${key}`)
      }
    })
    
    return apiBatches.flatMap((batch: any) => {
      const status = batch.status?.toUpperCase() || 'PLANNED'
      
      // ═══════════════════════════════════════════════════════════════
      // ✅ BLEND HANDLING: Check if this batch is part of a conditioning/bright blend
      // ═══════════════════════════════════════════════════════════════
      
      // Find if this batch is in a blend (by checking shared lot)
      let isPartOfConditioningBlend = false
      let blendKey: string | null = null
      
      for (const [key, items] of conditioningBlendTanks) {
        if (items.some(item => item.batch.id === batch.id)) {
          isPartOfConditioningBlend = true
          blendKey = key
          break
        }
      }
      
      // ✅ NEW: Check if this batch is part of a FERMENTATION blend
      let isPartOfFermentationBlend = false
      let fermBlendKey: string | null = null
      
      for (const [key, items] of fermentationBlendTanks) {
        if (items.some(item => item.batch.id === batch.id)) {
          isPartOfFermentationBlend = true
          fermBlendKey = key
          break
        }
      }
      
      console.log(`[Calendar] Processing ${batch.batchNumber}: isBlend=${isPartOfConditioningBlend}, isFermBlend=${isPartOfFermentationBlend}, status=${status}`)
      
      // ✅ NEW: Handle FERMENTATION blend - show ONE combined bar
      if (isPartOfFermentationBlend && fermBlendKey && status === 'FERMENTING') {
        const blendItems = fermentationBlendTanks.get(fermBlendKey)!
        const isFirstBatch = blendItems[0].batch.id === batch.id
        
        if (!isFirstBatch) {
          console.log(`[Calendar] ${batch.batchNumber}: Skipping (fermentation blend handled by first batch)`)
          return [] // Skip processing for non-first batches in fermentation blend
        }
        
        const events: any[] = []
        const myBlendItem = blendItems.find(item => item.batch.id === batch.id)
        const fermentationLot = myBlendItem?.fermentationLot
        const fermAssignment = myBlendItem?.fermAssignment
        
        if (fermentationLot && fermAssignment) {
          const combinedBatchNames = blendItems.map(i => i.batch.batchNumber).join(' + ')
          // ✅ Add BLEND lot code if available
          const blendLotCode = fermentationLot.lotCode?.startsWith('BLEND-') ? fermentationLot.lotCode : null
          const combinedName = blendLotCode 
            ? `${blendLotCode} = ${combinedBatchNames}` 
            : combinedBatchNames
          const combinedRecipe = [...new Set(blendItems.map(i => i.batch.recipe?.name || i.batch.recipeName))].join(' + ')
          
          const toLocalDate = (dateInput: any): Date | null => {
            if (!dateInput) return null
            if (typeof dateInput === 'string') {
              const parsed = new Date(dateInput)
              if (!isNaN(parsed.getTime())) {
                return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12, 0, 0, 0)
              }
            }
            if (dateInput instanceof Date) {
              return new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate(), 12, 0, 0, 0)
            }
            return null
          }
          
          const startDate = toLocalDate(fermAssignment.plannedStart) || 
                           toLocalDate(batch.fermentationStartedAt) || 
                           new Date()
          const endDate = toLocalDate(fermAssignment.plannedEnd) || 
                         new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000)
          
          console.log(`[Calendar] Blend FERMENTING: ${combinedName} on tank ${fermAssignment.tankName}`)
          
          events.push({
            id: `blend-ferm-${fermentationLot.id}-${fermAssignment.id}`,
            batchId: batch.id,
            lotId: fermentationLot.id,
            batchNumber: combinedName,  // ✅ Combined batch names
            recipeName: combinedRecipe,
            status: 'FERMENTING',
            batchStatus: 'FERMENTING',
            resourceId: fermAssignment.tankId || '',
            resourceType: 'fermenter',
            type: 'fermentation',
            startDate,
            endDate,
            volume: blendItems.reduce((sum, i) => sum + (i.batch.volume || 0), 0),
            notes: `ბლენდი: ${combinedName}`,
            isSplitLot: false,
            phase: 'FERMENTING',
            isHistorical: false,
            isBlend: true,
            blendBatches: blendItems.map((b: any) => b.batch.id),
          })
        }
        
        return events.filter((e: any) => e.resourceId)
      }
      
      if (isPartOfConditioningBlend && blendKey) {
        // This batch is part of a conditioning blend
        const blendItems = conditioningBlendTanks.get(blendKey)!
        const isFirstBatch = blendItems[0].batch.id === batch.id
        
        if (!isFirstBatch) {
          console.log(`[Calendar] ${batch.batchNumber}: Processing only FERMENTATION (conditioning handled by first batch)`)
        }
        
        const events: any[] = []
        
        // Get conditioningLot and condAssignment from blendItems for this batch
        const myBlendItem = blendItems.find(item => item.batch.id === batch.id)
        const conditioningLot = myBlendItem?.conditioningLot
        const condAssignment = myBlendItem?.condAssignment
        
        // ✅ ONLY process this batch's own FERMENTATION phase lots
        const fermentationLots = batch.allLots?.filter((lot: any) => lot.phase === 'FERMENTATION') || []
        
        console.log(`[Calendar] ${batch.batchNumber}: Found ${fermentationLots.length} FERMENTATION lots`)
        
        // ✅ FIX: For first batch (which handles conditioning/bright), also check the blend lot
        // for COMPLETED FERMENTATION assignments - this is the original batch's fermentation history
        if (isFirstBatch && conditioningLot) {
          const fermAssignmentsInCondLot = conditioningLot.assignments?.filter(
            (a: any) => a.phase === 'FERMENTATION' && a.status === 'COMPLETED'
          ) || []
          
          if (fermAssignmentsInCondLot.length > 0) {
            
            // Find which batch this fermentation belongs to - it's the batch that went first
            // The first batch in a blend is the one whose ONLY lot is the shared conditioning/bright lot
            const firstBatchInBlend = blendItems.find(item => {
              // The batch whose ONLY lot is the conditioning lot is the first one
              return item.batch.allLots?.length === 1 && 
                     item.batch.allLots[0].id === conditioningLot.id
            })
            
            if (firstBatchInBlend) {
              fermAssignmentsInCondLot.forEach((assignment: any) => {
                const toLocalDate = (dateInput: any): Date | null => {
                  if (!dateInput) return null
                  if (typeof dateInput === 'string') {
                    const parsed = new Date(dateInput)
                    if (!isNaN(parsed.getTime())) {
                      return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12, 0, 0, 0)
                    }
                  }
                  return null
                }
                
                const startDate = toLocalDate(assignment.plannedStart) || toLocalDate(firstBatchInBlend.batch.fermentationStartedAt) || new Date()
                let endDate = toLocalDate(assignment.actualEnd) || toLocalDate(firstBatchInBlend.batch.conditioningStartedAt) || toLocalDate(assignment.plannedEnd) || new Date()
                
                console.log(`[Calendar] BLEND: First batch fermentation history: ${firstBatchInBlend.batch.batchNumber} → ${assignment.tankName || 'tank'}`)
                
                events.push({
                  id: `${firstBatchInBlend.batch.id}-ferm-first-${assignment.id}`,
                  batchId: firstBatchInBlend.batch.id,
                  lotId: conditioningLot.id,
                  batchNumber: firstBatchInBlend.batch.batchNumber,
                  recipeName: firstBatchInBlend.batch.recipe?.name || firstBatchInBlend.batch.recipeName || 'პარტია',
                  status: 'COMPLETED',
                  batchStatus: 'COMPLETED',
                  resourceId: assignment.tankId || '',
                  resourceType: 'fermenter',
                  type: 'fermentation',
                  startDate,
                  endDate,
                  volume: firstBatchInBlend.batch.volume,
                  isSplitLot: true,
                  phase: 'FERMENTING',
                  lotPhase: 'FERMENTATION',
                  isHistorical: true,
                })
              })
            }
          }
        }
        
        fermentationLots.forEach((lot: any) => {
          lot.assignments?.forEach((assignment: any) => {
            if (assignment.phase !== 'FERMENTATION') return
            
            const toLocalDate = (dateInput: any): Date | null => {
              if (!dateInput) return null
              if (typeof dateInput === 'string') {
                const parsed = new Date(dateInput)
                if (!isNaN(parsed.getTime())) {
                  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12, 0, 0, 0)
                }
              }
              if (dateInput instanceof Date) {
                return new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate(), 12, 0, 0, 0)
              }
              return null
            }
            
            const startDate = toLocalDate(assignment.plannedStart) || toLocalDate(batch.fermentationStartedAt) || new Date()
            
            // ✅ FIX: Use actualEnd for completed fermentation, fallback to conditioningStartedAt
            let endDate: Date
            if (assignment.status === 'COMPLETED' && assignment.actualEnd) {
              endDate = toLocalDate(assignment.actualEnd)!
            } else if (assignment.status === 'COMPLETED' && batch.conditioningStartedAt) {
              // Fallback: use conditioning start as fermentation end
              endDate = toLocalDate(batch.conditioningStartedAt)!
              console.log(`[Calendar] Using conditioningStartedAt as fermentation end for ${batch.batchNumber}`)
            } else if (assignment.plannedEnd) {
              endDate = toLocalDate(assignment.plannedEnd)!
            } else {
              endDate = new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000)
            }
            
            console.log(`[Calendar] BLEND FERMENTATION: ${batch.batchNumber} → ${assignment.tankName || 'tank'}, status=${assignment.status}, actualEnd=${assignment.actualEnd}`)
            
            events.push({
              id: `${batch.id}-ferm-${assignment.id}`,
              batchId: batch.id,
              lotId: lot.id,
              batchNumber: batch.batchNumber,  // ✅ OWN batch name for fermentation
              recipeName: batch.recipe?.name || batch.recipeName || 'პარტია',
              status: assignment.status === 'COMPLETED' ? 'COMPLETED' : 'FERMENTING',
              batchStatus: assignment.status === 'COMPLETED' ? 'COMPLETED' : 'FERMENTING',
              resourceId: assignment.tankId || '',
              resourceType: 'fermenter',
              type: 'fermentation',
              startDate,
              endDate,
              volume: lot.volume || batch.volume,
              isSplitLot: true,
              phase: 'FERMENTING',
              lotPhase: 'FERMENTATION',
              isHistorical: assignment.status === 'COMPLETED',
            })
          })
        })
        
        // ✅ Process CONDITIONING/BRIGHT only for first batch (with combined name)
        if (isFirstBatch && conditioningLot && condAssignment) {
          const combinedBatchNames = blendItems.map(i => i.batch.batchNumber).join(' + ')
          // ✅ Add BLEND lot code if available
          const blendLotCode = conditioningLot.lotCode?.startsWith('BLEND-') ? conditioningLot.lotCode : null
          const combinedName = blendLotCode 
            ? `${blendLotCode} = ${combinedBatchNames}` 
            : combinedBatchNames
          const combinedRecipe = [...new Set(blendItems.map(i => i.batch.recipe?.name || i.batch.recipeName))].join(' + ')
          
          const toLocalDate = (dateInput: any): Date | null => {
            if (!dateInput) return null
            if (typeof dateInput === 'string') {
              const parsed = new Date(dateInput)
              if (!isNaN(parsed.getTime())) {
                return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12, 0, 0, 0)
              }
            }
            if (dateInput instanceof Date) {
              return new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate(), 12, 0, 0, 0)
            }
            return null
          }
          
          const startDate = toLocalDate(condAssignment.plannedStart) || toLocalDate(batch.conditioningStartedAt) || new Date()
          
          // ✅ FIX: Only use actualEnd for COMPLETED assignments, ACTIVE use plannedEnd
          let endDate: Date
          const isCompleted = condAssignment.status === 'COMPLETED'
          console.log(`[Calendar] BLEND endDate: status=${condAssignment.status}, actualEnd=${condAssignment.actualEnd}, completedAt=${batch.completedAt}, plannedEnd=${condAssignment.plannedEnd}`)
          if (isCompleted && condAssignment.actualEnd) {
            endDate = toLocalDate(condAssignment.actualEnd) || new Date()
          } else if (isCompleted && batch.completedAt) {
            endDate = toLocalDate(batch.completedAt) || new Date()
          } else {
            // ACTIVE assignments: always use plannedEnd
            endDate = toLocalDate(condAssignment.plannedEnd) || new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000)
          }
          
          // Use actual phase from lot (CONDITIONING, BRIGHT, READY, etc.)
          const actualPhase = conditioningLot.phase || 'CONDITIONING'
          // Map phases to modal-compatible status
          const modalPhase = actualPhase === 'BRIGHT' ? 'READY' : actualPhase
          
          // ✅ FIX: Check if batch is COMPLETED - use batch status, not lot phase
          const batchIsCompleted = status === 'COMPLETED'
          const displayStatus = batchIsCompleted ? 'COMPLETED' : modalPhase
          const isHistorical = batchIsCompleted || condAssignment.status === 'COMPLETED'
          
          console.log(`[Calendar] BLEND ${actualPhase}: ${combinedName} → ${condAssignment.tankName || 'tank'}, batchStatus=${status}, displayStatus=${displayStatus}`)
          
          events.push({
            id: `blend-cond-${condAssignment.id}`,
            batchId: batch.id,
            lotId: conditioningLot.id,
            batchNumber: combinedName,  // ✅ COMBINED name for conditioning
            recipeName: combinedRecipe,
            status: displayStatus,  // ✅ Use batch status if COMPLETED
            batchStatus: displayStatus,  // ✅ Use batch status if COMPLETED
            resourceId: condAssignment.tankId || '',
            resourceType: 'conditioning',
            type: 'conditioning',
            startDate,
            endDate,
            volume: blendItems.reduce((sum, i) => sum + (i.batch.volume || 0), 0),
            isSplitLot: true,
            phase: displayStatus,  // ✅ Use batch status if COMPLETED
            lotPhase: actualPhase,
            isHistorical,  // ✅ True if batch is completed
            isBlend: true,
          })
        }
        
        return events
      }
      
      // ✅ DEBUG: Log non-blend batch processing
      console.log(`[Calendar] Batch ${batch.batchNumber}: isSplit=${batch.isSplit}, allLots=${batch.allLots?.length}, status=${status}`)
      
      // ✅ For split batches, create events per lot AND per assignment (for history)
      if (batch.isSplit && batch.allLots?.length > 1 && 
          ['FERMENTING', 'CONDITIONING', 'READY', 'COMPLETED', 'PACKAGING'].includes(status)) {
        
        const events: any[] = []
        
        batch.allLots.forEach((lot: any, index: number) => {
          // ✅ FIX: Use actual lot code suffix instead of index-based
          // lotCode might be "FERM-20260105-01-A" or just "FERM-20260105-01" (parent)
          let suffix = ''
          if (lot.lotCode) {
            const parts = lot.lotCode.split('-')
            const lastPart = parts[parts.length - 1]
            // Check if last part is a single letter (A, B, C...)
            if (lastPart && lastPart.length === 1 && /^[A-Z]$/.test(lastPart)) {
              suffix = lastPart
            }
          }
          
          // ✅ Check if this is a parent lot (has child lots)
          const isParentLot = !suffix && batch.allLots.some((otherLot: any) => 
            otherLot.id !== lot.id && 
            otherLot.lotCode && 
            lot.lotCode &&
            otherLot.lotCode.startsWith(lot.lotCode + '-')
          )
          
          // ✅ FIX: Don't skip parent lots entirely - show their COMPLETED FERMENTATION assignments as history
          if (isParentLot) {
            console.log(`[Calendar] Parent lot ${lot.lotCode}: showing COMPLETED fermentation history`)
            
            // ✅ Show only COMPLETED FERMENTATION assignments from parent lot (history)
            if (lot.assignments && lot.assignments.length > 0) {
              lot.assignments
                .filter((a: any) => a.status === 'COMPLETED' && a.phase === 'FERMENTATION')
                .forEach((assignment: any) => {
                  const toLocalDate = (dateInput: any) => {
                    if (!dateInput) return null
                    if (typeof dateInput === 'string') {
                      const parsed = new Date(dateInput)
                      if (!isNaN(parsed.getTime())) {
                        return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12, 0, 0, 0)
                      }
                    }
                    if (dateInput instanceof Date) {
                      return new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate(), 12, 0, 0, 0)
                    }
                    return null
                  }
                  
                  let startDate = toLocalDate(assignment.plannedStart) || toLocalDate(batch.fermentationStartedAt) || toLocalDate(batch.plannedDate) || new Date()
                  let endDate = toLocalDate(assignment.actualEnd) || toLocalDate(assignment.plannedEnd) || new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000)
                  
                  console.log(`[Calendar] Parent lot FERMENTATION history: ${lot.lotCode} → ${assignment.tankName || 'unknown tank'}`)
                  
                  // ✅ FIX: For fermentation history, show full batch number (both batches for blends)
                  // Only for conditioning events should we show only first batch number
                  events.push({
                    id: `${batch.id}-parent-ferm-${assignment.id}`,
                    batchId: batch.id,
                    batchNumber: batch.batchNumber,  // ✅ FIX: Show full batch number for fermentation history
                    recipeName: batch.recipe?.name || batch.recipeName || 'პარტია',
                    status: 'COMPLETED',
                    batchStatus: status,
                    resourceId: assignment.tankId || '',
                    resourceType: 'fermenter',
                    startDate,
                    endDate,
                    title: batch.recipe?.name || batch.recipeName || 'პარტია',
                    type: 'fermentation',
                    phase: 'FERMENTING',
                    lotPhase: 'FERMENTATION',
                    volume: batch.volume,  // ✅ Add volume
                    isSplitLot: true,
                    isParentHistory: true, // ✅ Mark as parent history
                  })
                })
            }
            return // ✅ Done with parent lot - don't process as regular lot
          }
          
          // ✅ For non-parent lots without suffix, use fallback
          if (!suffix) {
            suffix = String.fromCharCode(65 + index)
          }
          
          // ✅ Create event for EACH assignment (FERMENTATION history + CONDITIONING current)
          if (lot.assignments && lot.assignments.length > 0) {
            lot.assignments.forEach((assignment: any) => {
              const isAssignmentCompleted = assignment.status === 'COMPLETED'
              // ✅ FIX: Use lot's actual phase for status, not batch status
              // ✅ FIX: Convert BRIGHT to READY for BATCH_PHASE_CONFIG compatibility
              const lotPhase = lot.phase?.toUpperCase() === 'FERMENTATION' ? 'FERMENTING' : 
                               lot.phase?.toUpperCase() === 'CONDITIONING' ? 'CONDITIONING' : 
                               lot.phase?.toUpperCase() === 'BRIGHT' ? 'READY' :  // ✅ NEW
                               lot.phase?.toUpperCase() || status
              const assignmentPhase = assignment.phase === 'FERMENTATION' ? 'FERMENTING' : 
                                      assignment.phase === 'CONDITIONING' ? 'CONDITIONING' : 
                                      assignment.phase === 'BRIGHT' ? 'READY' : lotPhase  // ✅ NEW
              
              // ✅ FIX: Special case for split batch -B lot still in fermentation
              // If lot is ACTIVE and lot.phase matches assignment.phase, treat as ACTIVE even if assignment says COMPLETED
              // This handles the case where split creates two child lots but marks all fermentation assignments as COMPLETED
              const isLotStillInSamePhase = lot.status === 'ACTIVE' && 
                                            lot.phase?.toUpperCase() === assignment.phase?.toUpperCase()
              const isCompleted = isAssignmentCompleted && !isLotStillInSamePhase
              
              // ✅ For completed assignments, show as completed; for active, use lot's phase
              const displayStatus = isCompleted ? 'COMPLETED' : assignmentPhase
              
              console.log(`[Calendar] Lot ${lot.lotCode}: lotPhase=${lot.phase}, assignment.phase=${assignment.phase}, displayStatus=${displayStatus}`)
              console.log(`[Calendar] Creating event with phase=${assignmentPhase}, isSplitLot=true`)
              console.log(`[Calendar] Event type will be: ${assignmentPhase === 'FERMENTING' ? 'fermentation' : assignmentPhase === 'CONDITIONING' ? 'conditioning' : assignmentPhase === 'READY' ? 'conditioning' : 'brewing'}`)
              
              // თარიღების დადგენა
              const toLocalDate = (dateInput: any): Date | null => {
                if (!dateInput) return null
                if (typeof dateInput === 'string') {
                  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(dateInput)
                  if (isDateOnly) {
                    const [y, m, d] = dateInput.split('-').map(Number)
                    return new Date(y, m - 1, d, 12, 0, 0, 0)
                  }
                  const parsed = new Date(dateInput)
                  if (!isNaN(parsed.getTime())) {
                    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12, 0, 0, 0)
                  }
                }
                if (dateInput instanceof Date) {
                  return new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate(), 12, 0, 0, 0)
                }
                return null
              }
              
              let startDate: Date
              if (assignment.plannedStart) {
                startDate = toLocalDate(assignment.plannedStart) || new Date(assignment.plannedStart)
              } else if (assignmentPhase === 'CONDITIONING' && batch.conditioningStartedAt) {
                startDate = toLocalDate(batch.conditioningStartedAt) || new Date(batch.conditioningStartedAt)
              } else if (assignmentPhase === 'FERMENTING' && batch.fermentationStartedAt) {
                startDate = toLocalDate(batch.fermentationStartedAt) || new Date(batch.fermentationStartedAt)
              } else {
                startDate = toLocalDate(batch.plannedDate || batch.createdAt || new Date()) || new Date()
              }
              
              let endDate: Date
              // ✅ FIX: Use isCompleted which accounts for lot still being in same phase
              const isThisLotCompleted = isCompleted
              
              if (isThisLotCompleted) {
                // ✅ For completed lots/assignments, use actual end time or batch completedAt
                if (assignment.actualEnd) {
                  endDate = toLocalDate(assignment.actualEnd) || new Date(assignment.actualEnd)
                } else if (assignment.endTime) {
                  endDate = toLocalDate(assignment.endTime) || new Date(assignment.endTime)
                } else if (batch.completedAt) {
                  endDate = toLocalDate(batch.completedAt) || new Date(batch.completedAt)
                } else {
                  // Fallback for COMPLETED without any end date
                  const today = new Date()
                  today.setHours(12, 0, 0, 0)
                  endDate = today
                }
              } else {
                // ✅ For active lots, use planned end date (NOT batch.completedAt)
                if (assignment.plannedEnd) {
                  endDate = toLocalDate(assignment.plannedEnd) || new Date(assignment.plannedEnd)
                } else if (assignment.endTime) {
                  endDate = toLocalDate(assignment.endTime) || new Date(assignment.endTime)
                } else {
                  // Fallback: calculate from start date
                  let durationDays = assignmentPhase === 'FERMENTING' ? 14 : assignmentPhase === 'CONDITIONING' ? 7 : 3
                  endDate = batch.estimatedEndDate
                    ? (toLocalDate(batch.estimatedEndDate) || new Date(batch.estimatedEndDate))
                    : new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000)
                }
              }
              
              // ✅ FIX 1: For blend batches, use only first batch number (not "BRW-2026-0002 + BRW-2026-0001-A")
              const displayBatchNumber = (batch.isBlend || batch.blendedBatches?.length > 1) 
                ? (batch.blendedBatches?.[0] || batch.batchNumber.split(' + ')[0])
                : `${batch.batchNumber}-${suffix}`
              
              console.log(`[Calendar] Split batch event: ${displayBatchNumber} ${assignmentPhase} lotStatus=${lot.status} assignmentStatus=${assignment.status} isThisLotCompleted=${isThisLotCompleted} endDate=${endDate.toISOString()}`)
              
              events.push({
                id: `${batch.id}-lot-${lot.id}-assignment-${assignment.id}`,
                batchId: batch.id,
                lotId: lot.id,  // ✅ Add lotId for split batch operations
                batchNumber: displayBatchNumber,  // ✅ FIX 1: For blends, show only first batch number
                recipeName: batch.recipe?.name || batch.recipeName || 'პარტია',
                status: displayStatus as any,
                batchStatus: displayStatus,
                resourceId: assignment.tankId || '',  // ფერმენტატორი ან brite tank
                resourceType: assignmentPhase === 'FERMENTING' ? 'fermenter' : 'conditioning',
                // ✅ FIX: Add explicit type for EventDetailModal
                type: assignmentPhase === 'FERMENTING' ? 'fermentation' : 
                      assignmentPhase === 'CONDITIONING' ? 'conditioning' : 
                      assignmentPhase === 'READY' ? 'conditioning' : 'brewing',
                startDate,
                endDate,
                volume: lot.volume || batch.volume,
                notes: batch.notes,
                isSplitLot: true,
                phase: assignmentPhase,         // FERMENTATION or CONDITIONING
                lotPhase: lot.phase,            // ✅ Add actual lot phase for reference
                isHistorical: isCompleted,      // ✅ ნაცრისფერი მხოლოდ თუ assignment დასრულებულია
              })
            })
          } else {
            // Fallback: if no assignments, use lot's tank info
            const lotEquipmentId = lot.tank?.id || null
            if (lotEquipmentId) {
              const toLocalDate = (dateInput: any): Date | null => {
                if (!dateInput) return null
                if (typeof dateInput === 'string') {
                  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(dateInput)
                  if (isDateOnly) {
                    const [y, m, d] = dateInput.split('-').map(Number)
                    return new Date(y, m - 1, d, 12, 0, 0, 0)
                  }
                  const parsed = new Date(dateInput)
                  if (!isNaN(parsed.getTime())) {
                    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12, 0, 0, 0)
                  }
                }
                if (dateInput instanceof Date) {
                  return new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate(), 12, 0, 0, 0)
                }
                return null
              }
              
              let startDate: Date
              if (status === 'CONDITIONING' && batch.conditioningStartedAt) {
                startDate = toLocalDate(batch.conditioningStartedAt) || new Date(batch.conditioningStartedAt)
              } else if (status === 'FERMENTING' && batch.fermentationStartedAt) {
                startDate = toLocalDate(batch.fermentationStartedAt) || new Date(batch.fermentationStartedAt)
              } else {
                startDate = toLocalDate(batch.plannedDate || batch.createdAt || new Date()) || new Date()
              }
              
              let endDate: Date
              if (status === 'COMPLETED') {
                if (batch.completedAt) {
                  endDate = toLocalDate(batch.completedAt) || new Date(batch.completedAt)
                } else {
                  const today = new Date()
                  today.setHours(12, 0, 0, 0)
                  endDate = today
                }
              } else if (batch.estimatedEndDate) {
                endDate = toLocalDate(batch.estimatedEndDate) || new Date(batch.estimatedEndDate)
              } else {
                let durationDays = status === 'FERMENTING' ? 14 : status === 'CONDITIONING' ? 7 : 3
                endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000)
              }
              
              // ✅ OVERDUE: If planned end passed but not completed, extend to today
              if (status !== 'COMPLETED') {
                const today = new Date()
                today.setHours(12, 0, 0, 0)
                if (endDate.getTime() < today.getTime()) {
                  console.log(`[Calendar] Fallback OVERDUE: ${batch.batchNumber} planned end ${endDate.toLocaleDateString()} < today, extending`)
                  endDate = today
                }
              }
              
              // ✅ Derive phase from status or lot.phase
              // ✅ FIX: Convert BRIGHT to READY for BATCH_PHASE_CONFIG compatibility
              const lotPhase = lot.phase?.toUpperCase() === 'FERMENTATION' ? 'FERMENTING' : 
                               lot.phase?.toUpperCase() === 'CONDITIONING' ? 'CONDITIONING' : 
                               lot.phase?.toUpperCase() === 'BRIGHT' ? 'READY' : status
              
              events.push({
                id: `${batch.id}-lot-${lot.id}`,
                batchId: batch.id,
                lotId: lot.id,  // ✅ Add lotId for split batch operations
                batchNumber: `${batch.batchNumber}-${suffix}`,
                recipeName: batch.recipe?.name || batch.recipeName || 'პარტია',
                status: lotPhase as any,
                batchStatus: lotPhase,
                resourceId: lotEquipmentId,
                resourceType: lotPhase === 'FERMENTING' ? 'fermenter' : 'conditioning',
                // ✅ FIX: Add explicit type for EventDetailModal
                type: lotPhase === 'FERMENTING' ? 'fermentation' : 
                      lotPhase === 'CONDITIONING' ? 'conditioning' : 
                      lotPhase === 'READY' ? 'conditioning' : 'brewing',
                startDate,
                endDate,
                volume: lot.volume || batch.volume,
                notes: batch.notes,
                isSplitLot: true,
                phase: lotPhase,  // ✅ Add phase for EventDetailModal
                lotPhase: lot.phase,  // ✅ Original lot phase
                // ✅ FIX: Check lot.status for blend history (fermentation lot may be COMPLETED even if batch is READY)
                isHistorical: lot.status === 'COMPLETED' || status === 'COMPLETED',
              })
            }
          }
        })
        
        return events.filter((e: any) => e.resourceId) // Only include events with resourceId
      }
      
      // ✅ For NON-split batches with assignments, show history
      // ✅ FIX: Include PACKAGING so fermentation history shows during packaging phase
      if (!batch.isSplit && batch.allLots?.length >= 1 && 
          ['FERMENTING', 'CONDITIONING', 'READY', 'PACKAGING', 'COMPLETED'].includes(status)) {
        const lot = batch.allLots[0]
        if (lot.assignments && lot.assignments.length > 0) {
          // Has assignments - show history
          const events: any[] = []
          
          // ✅ UNITANK CHECK: Are all assignments on the same tank?
          const tankIds = [...new Set(lot.assignments.map((a: any) => a.tankId).filter(Boolean))]
          const isUnitank = tankIds.length === 1 && lot.assignments.length > 1
          
          if (isUnitank) {
            // ✅ UNITANK: Merge all assignments into ONE bar
            console.log(`[Calendar] Unitank detected for ${batch.batchNumber}: ${lot.assignments.length} assignments on tank ${tankIds[0]}`)
            
            // Sort by plannedStart to get first and last
            const sortedAssignments = [...lot.assignments].sort((a: any, b: any) => {
              const aStart = new Date(a.plannedStart || 0).getTime()
              const bStart = new Date(b.plannedStart || 0).getTime()
              return aStart - bStart
            })
            
            const firstAssignment = sortedAssignments[0]
            const lastAssignment = sortedAssignments[sortedAssignments.length - 1]
            const activeAssignment = lot.assignments.find((a: any) => a.status === 'ACTIVE') || lastAssignment
            
            // Current phase from active/last assignment
            const currentPhase = activeAssignment.phase === 'FERMENTATION' ? 'FERMENTING' : 
                                 activeAssignment.phase === 'CONDITIONING' ? 'CONDITIONING' : 
                                 activeAssignment.phase === 'BRIGHT' ? 'READY' : status
            
            const toLocalDate = (dateInput: any): Date | null => {
              if (!dateInput) return null
              if (typeof dateInput === 'string') {
                const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(dateInput)
                if (isDateOnly) {
                  const [y, m, d] = dateInput.split('-').map(Number)
                  return new Date(y, m - 1, d, 12, 0, 0, 0)
                }
                const parsed = new Date(dateInput)
                if (!isNaN(parsed.getTime())) {
                  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12, 0, 0, 0)
                }
              }
              if (dateInput instanceof Date) {
                return new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate(), 12, 0, 0, 0)
              }
              return null
            }
            
            // Start from first assignment
            let startDate: Date
            if (firstAssignment.plannedStart) {
              startDate = toLocalDate(firstAssignment.plannedStart) || new Date(firstAssignment.plannedStart)
            } else if (batch.fermentationStartedAt) {
              startDate = toLocalDate(batch.fermentationStartedAt) || new Date(batch.fermentationStartedAt)
            } else {
              startDate = toLocalDate(batch.plannedDate || batch.createdAt || new Date()) || new Date()
            }
            
            // End from last/active assignment with robust fallbacks
            let endDate: Date

            // ✅ FIXED: When batch status is COMPLETED, end bar on completedAt date
            if (status === 'COMPLETED') {
              if (batch.completedAt) {
                endDate = toLocalDate(batch.completedAt) || new Date(batch.completedAt)
              } else {
                // COMPLETED but no date - use last assignment's actualEnd or today
                const lastCompletedAssignment = [...(lot.assignments || [])]
                  .filter((a: any) => a.status === 'COMPLETED')
                  .sort((a: any, b: any) => {
                    const aTime = new Date(a.actualEnd || a.endTime || 0).getTime()
                    const bTime = new Date(b.actualEnd || b.endTime || 0).getTime()
                    return bTime - aTime
                  })[0]
                
                if (lastCompletedAssignment?.actualEnd || lastCompletedAssignment?.endTime) {
                  endDate = toLocalDate(lastCompletedAssignment.actualEnd || lastCompletedAssignment.endTime) || new Date()
                } else {
                  endDate = new Date() // Today
                }
              }
              console.log(`[Calendar] Unitank endDate: COMPLETED → ${endDate.toLocaleDateString()}`)
            } else if (activeAssignment?.plannedEnd) {
              endDate = toLocalDate(activeAssignment.plannedEnd) || new Date(activeAssignment.plannedEnd)
            } else if (lastAssignment?.plannedEnd) {
              endDate = toLocalDate(lastAssignment.plannedEnd) || new Date(lastAssignment.plannedEnd)
            } else if ((batch as any).estimatedEndDate) {
              // ✅ Fallback to batch estimatedEndDate if available
              endDate = toLocalDate((batch as any).estimatedEndDate) || new Date((batch as any).estimatedEndDate)
            } else {
              // ✅ Fallback: calculate from start + default duration based on phase
              const defaultDays = currentPhase === 'FERMENTING' ? 14 : currentPhase === 'CONDITIONING' ? 14 : 21
              endDate = new Date(startDate.getTime() + defaultDays * 24 * 60 * 60 * 1000)
            }
            // ✅ Safety: if endDate invalid or <= startDate, use defaults
            // ❗ BUT: Skip this check for COMPLETED batches - their endDate IS correct even if same as startDate
            if (!endDate || (endDate.getTime() <= startDate.getTime() && status !== 'COMPLETED')) {
              const defaultDays = currentPhase === 'FERMENTING' ? 14 : 14
              endDate = new Date(startDate.getTime() + defaultDays * 24 * 60 * 60 * 1000)
              console.log(`[Calendar] Unitank: endDate invalid, defaulting to ${defaultDays} days from start`)
            }
            // ✅ OVERDUE: If planned end passed but not completed, extend to today
            const today = new Date()
            today.setHours(12, 0, 0, 0)
            if (status !== 'COMPLETED' && endDate.getTime() < today.getTime()) {
              console.log(`[Calendar] Unitank OVERDUE: ${batch.batchNumber} planned end ${endDate.toLocaleDateString()} < today, extending to today`)
              endDate = today
            }
            
            // Determine if historical (all assignments completed or batch completed)
            const allCompleted = lot.assignments.every((a: any) => a.status === 'COMPLETED')
            const isHistorical = allCompleted || lot.status === 'COMPLETED' || status === 'COMPLETED'
            
            events.push({
              id: `${batch.id}-lot-${lot.id}-unitank`,
              batchId: batch.id,
              batchNumber: batch.batchNumber,
              isBlend: batch.isBlend || false,
              blendedBatches: batch.blendedBatches || [batch.batchNumber],
              recipeName: batch.recipe?.name || batch.recipeName || 'პარტია',
              status: status === 'COMPLETED' ? 'COMPLETED' : currentPhase,
              batchStatus: status === 'COMPLETED' ? 'COMPLETED' : currentPhase,
              resourceId: tankIds[0] || '',
              resourceType: currentPhase === 'FERMENTING' ? 'fermenter' : 'conditioning',
              type: currentPhase === 'FERMENTING' ? 'fermentation' : 
                    currentPhase === 'CONDITIONING' ? 'conditioning' : 
                    currentPhase === 'READY' ? 'conditioning' : 'brewing',
              startDate,
              endDate,
              volume: lot.volume || batch.volume,
              notes: batch.notes,
              isSplitLot: false,
              phase: currentPhase,
              isHistorical,
              isUnitank: true, // ✅ Mark as Unitank for styling if needed
            })
          } else {
            // ✅ NORMAL: Different tanks - show each assignment separately
            lot.assignments.forEach((assignment: any) => {
            const isCompleted = assignment.status === 'COMPLETED'
            const displayStatus = isCompleted ? 'COMPLETED' : status
            const assignmentPhase = assignment.phase === 'FERMENTATION' ? 'FERMENTING' : 
                                    assignment.phase === 'CONDITIONING' ? 'CONDITIONING' : 
                                    assignment.phase === 'BRIGHT' ? 'READY' : status
            
            const toLocalDate = (dateInput: any): Date | null => {
              if (!dateInput) return null
              if (typeof dateInput === 'string') {
                const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(dateInput)
                if (isDateOnly) {
                  const [y, m, d] = dateInput.split('-').map(Number)
                  return new Date(y, m - 1, d, 12, 0, 0, 0)
                }
                const parsed = new Date(dateInput)
                if (!isNaN(parsed.getTime())) {
                  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12, 0, 0, 0)
                }
              }
              if (dateInput instanceof Date) {
                return new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate(), 12, 0, 0, 0)
              }
              return null
            }
            
            let startDate: Date
            if (assignment.plannedStart) {
              startDate = toLocalDate(assignment.plannedStart) || new Date(assignment.plannedStart)
            } else if (assignmentPhase === 'CONDITIONING' && batch.conditioningStartedAt) {
              startDate = toLocalDate(batch.conditioningStartedAt) || new Date(batch.conditioningStartedAt)
            } else if (assignmentPhase === 'FERMENTING' && batch.fermentationStartedAt) {
              startDate = toLocalDate(batch.fermentationStartedAt) || new Date(batch.fermentationStartedAt)
            } else {
              startDate = toLocalDate(batch.plannedDate || batch.createdAt || new Date()) || new Date()
            }
            
            let endDate: Date
            
            // ✅ FERMENTATION assignment - always use fermentation-specific end date
            if (assignmentPhase === 'FERMENTING' && ['CONDITIONING', 'READY', 'PACKAGING', 'COMPLETED'].includes(status)) {
              // Fermentation ended when batch moved to next phase
              // Priority: actualEnd > conditioningStartedAt > updatedAt > plannedEnd
              if (assignment.actualEnd) {
                endDate = toLocalDate(assignment.actualEnd) || new Date(assignment.actualEnd)
              } else if (batch.conditioningStartedAt) {
                endDate = toLocalDate(batch.conditioningStartedAt) || new Date(batch.conditioningStartedAt)
              } else if (assignment.updatedAt) {
                endDate = toLocalDate(assignment.updatedAt) || new Date(assignment.updatedAt)
              } else if (assignment.plannedEnd) {
                endDate = toLocalDate(assignment.plannedEnd) || new Date(assignment.plannedEnd)
              } else {
                const today = new Date()
                today.setHours(12, 0, 0, 0)
                endDate = today
              }
            } else if (status === 'COMPLETED') {
              // ✅ COMPLETED batch (non-fermentation) - use batch.completedAt
              if (assignment.actualEnd) {
                endDate = toLocalDate(assignment.actualEnd) || new Date(assignment.actualEnd)
              } else if (batch.completedAt) {
                endDate = toLocalDate(batch.completedAt) || new Date(batch.completedAt)
              } else {
                const today = new Date()
                today.setHours(12, 0, 0, 0)
                endDate = today
              }
            } else if (isCompleted) {
              // ✅ COMPLETED assignment (e.g. fermentation ended, now in conditioning)
              if (assignment.actualEnd) {
                endDate = toLocalDate(assignment.actualEnd) || new Date(assignment.actualEnd)
              } else if (assignment.updatedAt) {
                endDate = toLocalDate(assignment.updatedAt) || new Date(assignment.updatedAt)
              } else {
                const today = new Date()
                today.setHours(12, 0, 0, 0)
                endDate = today
              }
            } else if (assignment.plannedEnd) {
              endDate = toLocalDate(assignment.plannedEnd) || new Date(assignment.plannedEnd)
            } else {
              let durationDays = assignmentPhase === 'FERMENTING' ? 14 : 7
              endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000)
            }
            // ✅ OVERDUE: If planned end passed but not completed, extend to today
            const today = new Date()
            today.setHours(12, 0, 0, 0)
            if (status !== 'COMPLETED' && !isCompleted && endDate.getTime() < today.getTime()) {
              console.log(`[Calendar] OVERDUE: ${batch.batchNumber} ${assignmentPhase} planned end ${endDate.toLocaleDateString()} < today, extending`)
              endDate = today
            }
            
            console.log(`[Calendar] Non-split: ${batch.batchNumber} ${assignment.phase} status=${status} completedAt=${batch.completedAt} endDate=${endDate.toISOString()}`)
            console.log(`[Calendar] Non-split assignment: tankId=${assignment.tankId}, tankName=${assignment.tankName || assignment.Tank?.name || 'unknown'}, phase=${assignment.phase}, status=${assignment.status}`)
            
            // ✅ FIX: Determine if fermentation is historical (completed)
            // Fermentation is historical if:
            // 1. Assignment status is COMPLETED, OR
            // 2. Assignment phase is FERMENTATION but batch moved to CONDITIONING/READY/PACKAGING (fermentation ended)
            const isFermentationCompleted = assignmentPhase === 'FERMENTING' && 
                                            (assignment.status === 'COMPLETED' || 
                                             assignment.actualEnd || 
                                             isCompleted ||
                                             ['CONDITIONING', 'READY', 'PACKAGING', 'COMPLETED'].includes(status))
            
            // ✅ FIX 1: Determine if this is historical fermentation for blend
            // Historical fermentation = completed fermentation assignment in a blend batch
            // Should show even when batch is in PACKAGING or READY phase
            const isHistoricalFermentation = assignmentPhase === 'FERMENTING' && 
                                             (batch.isBlend || batch.blendedBatches?.length > 1) &&
                                             isFermentationCompleted
            
            events.push({
              id: `${batch.id}-lot-${lot.id}-assignment-${assignment.id}`,
              batchId: batch.id,
              batchNumber: batch.batchNumber,
              isBlend: batch.isBlend || false,
              blendedBatches: batch.blendedBatches || [batch.batchNumber],
              recipeName: batch.recipe?.name || batch.recipeName || 'პარტია',
              status: displayStatus as any,
              batchStatus: displayStatus,
              resourceId: assignment.tankId || '',
              resourceType: assignmentPhase === 'FERMENTING' ? 'fermenter' : 'conditioning',
              // ✅ FIX: Add explicit type for EventDetailModal
              type: assignmentPhase === 'FERMENTING' ? 'fermentation' : 
                    assignmentPhase === 'CONDITIONING' ? 'conditioning' : 
                    assignmentPhase === 'READY' ? 'conditioning' : 'brewing',
              startDate,
              endDate,
              volume: lot.volume || batch.volume,
              notes: batch.notes,
              isSplitLot: false,
              phase: assignmentPhase,
              // ✅ FIX: Fermentation is historical if it's completed OR batch moved to conditioning/ready/packaging
              isHistorical: isCompleted || lot.status === 'COMPLETED' || status === 'COMPLETED' || isFermentationCompleted,  // ✅ ნაცრისფერი
              // ✅ FIX 1: Mark historical fermentation for blends
              isParentHistory: isHistoricalFermentation,
            })
          })
          } // ✅ End of else block (normal: different tanks)
          
          if (events.length > 0) {
            return events.filter((e: any) => e.resourceId)
          }
        }
      }
      
      // 🔑 KEY: განსაზღვრე რომელ equipment-ზე უნდა ჩანდეს batch
      let equipmentId: string | null = null
      let equipmentName: string = ''
      let resourceType: 'brewhouse' | 'fermenter' | 'conditioning' = 'brewhouse'
      
      if (status === 'PLANNED' || status === 'BREWING') {
        // PLANNED და BREWING - ხარშვის ქვაბზე
        // მოძებნე kettle ან გამოიყენე batch.kettleId თუ არსებობს
        // Note: batch.kettleId არ არსებობს schema-ში, ამიტომ ვიყენებთ პირველ available kettle-ს
        const kettle = apiEquipment.find((e: any) => 
          ['kettle', 'brewhouse', 'mash_tun', 'brew_kettle', 'boil_kettle'].includes(e.type?.toLowerCase())
        )
        // თუ BREWING batch-ს აქვს tankId (რომელიც შეიძლება იყოს kettle), გამოვიყენოთ ის
        // სხვა შემთხვევაში პირველი available kettle (არა hardcoded fallback)
        if (status === 'BREWING' && batch.tankId) {
          // BREWING batch-ს შეიძლება ჰქონდეს tankId რომელიც არის kettle
          const brewingTank = apiEquipment.find((e: any) => e.id === batch.tankId)
          if (brewingTank && ['kettle', 'brewhouse', 'mash_tun'].includes(brewingTank.type?.toLowerCase())) {
            equipmentId = batch.tankId
            equipmentName = brewingTank.name
          } else {
            // Use actual kettle from equipment, or null if none exists
            equipmentId = kettle?.id || null
            equipmentName = kettle?.name || null
          }
        } else {
          // Use actual kettle from equipment, or null if none exists
          equipmentId = kettle?.id || null
          equipmentName = kettle?.name || null
        }
        resourceType = 'brewhouse'
      } else if (status === 'FERMENTING') {
        // FERMENTING - ფერმენტაციის ტანკზე
        // 1. ✅ currentTank priority
        equipmentId = batch.currentTank?.id || batch.equipmentId || batch.tankId || null
        equipmentName = batch.currentTank?.name || batch.equipmentName || batch.tankName || ''
        let tank = equipmentId ? apiEquipment.find((e: any) => e.id === equipmentId) : null
        
        // ✅ Fallback: if we have tankName but no equipmentId, find tank by name
        if (!equipmentId && equipmentName) {
          tank = apiEquipment.find((e: any) => e.name === equipmentName)
          if (tank) {
            equipmentId = tank.id
            console.log('[Calendar] Found tank by name:', equipmentName, '→', equipmentId)
          }
        }
        
        equipmentName = equipmentName || tank?.name || ''
        resourceType = 'fermenter'
        
        // 🔍 DEBUG
        console.log('[Calendar] FERMENTING batch:', batch.batchNumber, {
          tankId: batch.tankId,
          equipmentId: batch.equipmentId,
          equipmentName: batch.equipmentName,
          currentTank: batch.currentTank,
          finalEquipmentId: equipmentId,
          finalEquipmentName: equipmentName,
        })
      } else if (status === 'CONDITIONING' || status === 'READY') {
        // CONDITIONING - brite tank-ზე
        // 1. ✅ currentTank priority
        equipmentId = batch.currentTank?.id || batch.equipmentId || batch.tankId || null
        equipmentName = batch.currentTank?.name || batch.equipmentName || batch.tankName || ''
        let tank = equipmentId ? apiEquipment.find((e: any) => e.id === equipmentId) : null
        
        // ✅ Fallback: if we have tankName but no equipmentId, find tank by name
        if (!equipmentId && equipmentName) {
          tank = apiEquipment.find((e: any) => e.name === equipmentName)
          if (tank) {
            equipmentId = tank.id
            console.log('[Calendar] Found tank by name:', equipmentName, '→', equipmentId)
          }
        }
        
        equipmentName = equipmentName || tank?.name || ''
        resourceType = 'conditioning'
        
        // 🔍 DEBUG
        console.log('[Calendar] CONDITIONING batch:', batch.batchNumber, {
          tankId: batch.tankId,
          equipmentId: batch.equipmentId,
          equipmentName: batch.equipmentName,
          currentTank: batch.currentTank,
          finalEquipmentId: equipmentId,
          finalEquipmentName: equipmentName,
        })
      } else if (status === 'PACKAGING') {
        // PACKAGING - შეიძლება packaging area-ზე
        // 1. ✅ currentTank priority
        equipmentId = batch.currentTank?.id || batch.tank?.id || batch.equipmentId || batch.tankId || null
        equipmentName = batch.currentTank?.name || batch.tank?.name || batch.equipmentName || batch.tankName || ''
        let tank = equipmentId ? apiEquipment.find((e: any) => e.id === equipmentId) : null
        
        // ✅ Fallback: if we have tankName but no equipmentId, find tank by name
        if (!equipmentId && equipmentName) {
          tank = apiEquipment.find((e: any) => e.name === equipmentName)
          if (tank) {
            equipmentId = tank.id
            console.log('[Calendar] Found tank by name:', equipmentName, '→', equipmentId)
          }
        }
        
        equipmentName = equipmentName || tank?.name || 'დაფასოება'
        resourceType = 'conditioning' // ან 'packaging' თუ არის ასეთი
      } else if (status === 'COMPLETED') {
        // ✅ COMPLETED - tankId რჩება ისტორიისთვის
        // 1. ✅ currentTank priority, then batch.tank (direct relation) for history
        equipmentId = batch.currentTank?.id || batch.tank?.id || batch.equipmentId || batch.tankId || null
        equipmentName = batch.currentTank?.name || batch.tank?.name || batch.equipmentName || batch.tankName || ''
        let tank = equipmentId ? apiEquipment.find((e: any) => e.id === equipmentId) : null
        
        // ✅ Fallback: if we have tankName but no equipmentId, find tank by name
        if (!equipmentId && equipmentName) {
          tank = apiEquipment.find((e: any) => e.name === equipmentName)
          if (tank) {
            equipmentId = tank.id
            console.log('[Calendar] Found tank by name:', equipmentName, '→', equipmentId)
          }
        }
        
        equipmentName = equipmentName || tank?.name || ''
        // Determine resource type from tank type
        if (tank) {
          const tankType = tank.type?.toLowerCase() || ''
          if (['fermenter', 'unitank'].includes(tankType)) {
            resourceType = 'fermenter'
          } else if (['brite', 'brite_tank', 'conditioning_tank', 'storage'].includes(tankType)) {
            resourceType = 'conditioning'
          } else {
            resourceType = 'brewhouse'
          }
        } else {
          resourceType = 'conditioning' // Default
        }
      }
      
      // ✅ CRITICAL: Parse date with timezone conversion, then extract local calendar day
      const toLocalDate = (dateInput: any): Date | null => {
        if (!dateInput) return null

        const raw = dateInput

        // Date object
        if (raw instanceof Date) {
          const d = raw
          const local = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0)
          console.log('[Calendar] toLocalDate(Date):', d.toISOString(), '→', local.toLocaleDateString(), 'day:', local.getDate())
          return local
        }

        // String input
        if (typeof raw === 'string') {
          // If it's a date-only string, treat as local date (no timezone conversion needed)
          const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(raw)
          if (isDateOnly) {
            const [y, m, d] = raw.split('-').map(Number)
            const local = new Date(y, m - 1, d, 12, 0, 0, 0)
            console.log('[Calendar] toLocalDate(date-only):', raw, '→', local.toLocaleDateString(), 'day:', local.getDate())
            return local
          }

          // ISO with time/timezone -> parse real moment, then take LOCAL calendar day
          const parsed = new Date(raw)
          if (!isNaN(parsed.getTime())) {
            const local = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12, 0, 0, 0)
            console.log('[Calendar] toLocalDate(iso):', raw, '→', local.toLocaleDateString(), 'day:', local.getDate())
            return local
          }
        }

        // Fallback - try Date constructor
        const parsed = new Date(raw)
        if (!isNaN(parsed.getTime())) {
          const local = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12, 0, 0, 0)
          console.log('[Calendar] toLocalDate(fallback):', String(raw), '→', local.toLocaleDateString(), 'day:', local.getDate())
          return local
        }

        console.warn('[Calendar] toLocalDate: invalid date input', raw)
        return null
      }
      
      // თარიღების დადგენა
      let startDate: Date
      if (status === 'COMPLETED' && batch.completedAt) {
        startDate = toLocalDate(batch.completedAt) || new Date(batch.completedAt)
      } else if (status === 'PACKAGING' && batch.packagingStartedAt) {
        startDate = toLocalDate(batch.packagingStartedAt) || new Date(batch.packagingStartedAt)
      } else if (status === 'READY' && batch.readyAt) {
        startDate = toLocalDate(batch.readyAt) || new Date(batch.readyAt)
      } else if (status === 'CONDITIONING' && batch.conditioningStartedAt) {
        startDate = toLocalDate(batch.conditioningStartedAt) || new Date(batch.conditioningStartedAt)
        console.log('[Calendar] CONDITIONING date for', batch.batchNumber, ':', {
          raw: batch.conditioningStartedAt,
          parsed: startDate.toLocaleDateString(),
          day: startDate.getDate(),
        })
      } else if (status === 'FERMENTING' && batch.fermentationStartedAt) {
        // Debug: Check what type fermentationStartedAt is
        console.log('[Calendar] FERMENTING raw input:', {
          value: batch.fermentationStartedAt,
          type: typeof batch.fermentationStartedAt,
          isDate: batch.fermentationStartedAt instanceof Date,
          isoString: batch.fermentationStartedAt instanceof Date ? batch.fermentationStartedAt.toISOString() : String(batch.fermentationStartedAt),
        })
        startDate = toLocalDate(batch.fermentationStartedAt) || new Date(batch.fermentationStartedAt)
        console.log('[Calendar] FERMENTING date for', batch.batchNumber, ':', {
          raw: batch.fermentationStartedAt,
          rawType: typeof batch.fermentationStartedAt,
          parsed: startDate.toLocaleDateString(),
          day: startDate.getDate(),
          month: startDate.getMonth() + 1,
          year: startDate.getFullYear(),
        })
      } else if (status === 'BREWING' && batch.brewedAt) {
        startDate = toLocalDate(batch.brewedAt) || new Date(batch.brewedAt)
      } else {
        startDate = toLocalDate(batch.plannedDate || batch.createdAt || new Date()) || new Date()
      }
      
      // დასრულების თარიღი - status-ის მიხედვით
      let endDate: Date
      // ✅ COMPLETED batch - always use completedAt or today as fallback
      if (status === 'COMPLETED') {
        if (batch.completedAt) {
          endDate = toLocalDate(batch.completedAt) || new Date(batch.completedAt)
        } else {
          // Fallback: use today for COMPLETED batches without completedAt
          const today = new Date()
          today.setHours(12, 0, 0, 0)
          endDate = today
          console.log(`[Calendar] COMPLETED batch ${batch.batchNumber} has no completedAt, using today`)
        }
      } else if (status === 'READY' && batch.readyAt) {
        // ✅ READY - თუ packaging დაიწყო, გამოიყენე packagingStartedAt
        if (batch.packagingStartedAt) {
          endDate = toLocalDate(batch.packagingStartedAt) || new Date(batch.packagingStartedAt)
        } else if (batch.completedAt) {
          endDate = toLocalDate(batch.completedAt) || new Date(batch.completedAt)
        } else {
          // Default: max 3 days from readyAt or today
          const maxEndDate = new Date(startDate.getTime() + 3 * 24 * 60 * 60 * 1000)
          const today = new Date()
          today.setHours(12, 0, 0, 0)
          endDate = today > maxEndDate ? maxEndDate : today
        }
      } else {
        let durationDays = 14
        if (status === 'BREWING') durationDays = 1
        else if (status === 'PLANNED') durationDays = 1  // ✅ PLANNED also 1 day
        else if (status === 'FERMENTING') durationDays = 14
        else if (status === 'CONDITIONING') durationDays = 7
        else if (status === 'PACKAGING') durationDays = 1
        else durationDays = 14
        
        // ✅ FIX: PLANNED and BREWING should ALWAYS use 1 day, ignore estimatedEndDate
        if (status === 'PLANNED' || status === 'BREWING') {
          // ხარშვა/დაგეგმვა მხოლოდ 1 დღეა - არ გამოიყენოთ estimatedEndDate
          endDate = new Date(startDate.getTime())  // Same day
        } else {
          endDate =
            batch.estimatedEndDate
              ? (toLocalDate(batch.estimatedEndDate) || new Date(batch.estimatedEndDate))
              : new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000)
        }
      }

      const event = {
        id: batch.id,
        batchId: batch.id,
        batchNumber: batch.batchNumber || '',
        isBlend: batch.isBlend || false,
        blendedBatches: batch.blendedBatches || [batch.batchNumber || ''],
        recipeName: batch.recipe?.name || batch.recipeName || 'პარტია',
        status: status as any,
        batchStatus: status, // ⚠️ CRITICAL - This field must exist!
        resourceId: equipmentId || '',
        resourceType,
        startDate,
        endDate,
        volume: batch.volume,
        notes: batch.notes,
        isHistorical: status === 'COMPLETED',  // ✅ ნაცრისფერი თუ batch დასრულებულია
      }
      
      console.log('[Calendar] Batch event:', batch.batchNumber, '→', status, '→ equipment:', equipmentId, equipmentName)
      
      // Regular batch - one event
      return equipmentId ? [event] : []
    })
  }, [apiBatches, apiEquipment])

  // Convert CIP logs to events
  const cipEvents: CalendarEvent[] = useMemo(() => {
    return apiCipLogs.map((cip: any) => {
      const tank = apiEquipment.find((e: any) => e.id === cip.equipmentId)
      return {
        id: `cip-${cip.id}`,
        type: 'cip',
        title: `CIP - ${tank?.name || ''}`,
        tankId: cip.equipmentId,
        tankName: tank?.name,
        startDate: new Date(cip.performedAt || cip.createdAt),
        endDate: new Date(cip.performedAt || cip.createdAt),
        status: 'completed',
        notes: cip.notes,
      } as CalendarEvent
    })
  }, [apiCipLogs, apiEquipment])

  // Convert maintenance records to events
  const maintenanceEvents: CalendarEvent[] = useMemo(() => {
    return apiMaintenanceRecords.map((record: any) => {
      const tank = apiEquipment.find((e: any) => e.id === record.equipmentId)
      return {
        id: `maintenance-${record.id}`,
        type: 'maintenance' as const,
        title: `🔧 ${record.type || 'მომსახურება'} - ${tank?.name || ''}`,
        tankId: record.equipmentId,
        tankName: tank?.name || '',
        startDate: new Date(record.scheduledDate || record.createdAt),
        endDate: new Date(record.completedDate || record.scheduledDate || record.createdAt),
        status: record.status === 'completed' || record.status === 'COMPLETED' ? 'completed' as const : 
                record.status === 'in_progress' || record.status === 'IN_PROGRESS' ? 'active' as const : 'scheduled' as const,
        notes: record.description || record.notes,
      }
    })
  }, [apiMaintenanceRecords, apiEquipment])

  // All production events combined
  const allProductionEvents = useMemo(() => {
    return [...batchEvents, ...cipEvents, ...maintenanceEvents]
  }, [batchEvents, cipEvents, maintenanceEvents])

  // Use all production events (no filtering in new design)
  const filteredProductionEvents = allProductionEvents

  const filteredOrderEvents = useMemo(() => {
    return orderEvents.filter(e => {
      if (orderFilters.includes('order') && e.type === 'order') return true
      if (orderFilters.includes('delivery') && e.type === 'delivery') return true
      if (orderFilters.includes('packaging') && e.type === 'packaging') return true
      return false
    })
  }, [orderEvents, orderFilters])

  // Stats - 7 batch status cards
  // ✅ FIXED: Use LOT-based counting for split/blend accuracy
  const stats = useMemo(() => {
    const planned = apiBatches.filter(b => b.status?.toUpperCase() === 'PLANNED').length
    const brewing = apiBatches.filter(b => b.status?.toUpperCase() === 'BREWING').length
    
    // ═══════════════════════════════════════════════════════════════
    // ✅ LOT-BASED COUNTING for fermenting and conditioning
    // Split: თითოეული ლოტი ცალკე (2 ლოტი = 2)
    // Blend: ერთხელ თითო lot-ზე (2 batch = 1)
    // ═══════════════════════════════════════════════════════════════
    
    const processedBatchIds = new Set<string>()
    const processedLotIds = new Set<string>()
    let fermentingCount = 0
    let conditioningCount = 0
    let readyCount = 0
    
    // Build lot-batch mapping to detect blends
    const lotBatchCount = new Map<string, string[]>()
    apiBatches.forEach((b: any) => {
      const lotId = b.currentLot?.id || b.allLots?.[0]?.id
      if (lotId) {
        const existing = lotBatchCount.get(lotId) || []
        existing.push(b.id)
        lotBatchCount.set(lotId, existing)
      }
    })
    
    apiBatches.forEach((b: any) => {
      if (processedBatchIds.has(b.id)) return
      
      const status = b.status?.toUpperCase()
      const allLots = b.allLots || b.LotBatch?.map((lb: any) => lb.Lot) || []
      const currentLotId = b.currentLot?.id || allLots[0]?.id
      
      // ✅ SPLIT: batch has multiple child lots with -A, -B suffix
      const childLots = allLots.filter((l: any) => 
        l && (l.lotCode?.match(/-[A-Z]$/) || l.isChild)
      )
      
      if (b.isSplit && childLots.length > 1) {
        processedBatchIds.add(b.id)
        
        // Count each ACTIVE child lot separately
        childLots.forEach((lot: any) => {
          if (processedLotIds.has(lot.id)) return
          processedLotIds.add(lot.id)
          
          const lotPhase = lot.phase?.toUpperCase()
          const lotStatus = lot.status?.toUpperCase()
          
          if (lotStatus === 'ACTIVE' || lotStatus === 'PLANNED') {
            if (lotPhase === 'FERMENTATION') fermentingCount++
            else if (lotPhase === 'CONDITIONING') conditioningCount++
            else if (lotPhase === 'BRIGHT' || lotPhase === 'READY') readyCount++
          }
        })
        return
      }
      
      // ✅ BLEND: multiple batches share the same lot
      const isBlend = currentLotId && (lotBatchCount.get(currentLotId)?.length || 0) > 1
      
      if (isBlend && currentLotId) {
        if (processedLotIds.has(currentLotId)) return
        processedLotIds.add(currentLotId)
        
        // Mark all batches in this blend as processed
        lotBatchCount.get(currentLotId)?.forEach(bId => processedBatchIds.add(bId))
        
        // Count once based on batch status
        if (status === 'FERMENTING') fermentingCount++
        else if (status === 'CONDITIONING') conditioningCount++
        else if (status === 'READY') readyCount++
        return
      }
      
      // ✅ SIMPLE: single batch, single lot
      processedBatchIds.add(b.id)
      if (currentLotId) processedLotIds.add(currentLotId)
      
      if (status === 'FERMENTING') fermentingCount++
      else if (status === 'CONDITIONING') conditioningCount++
      else if (status === 'READY') readyCount++
    })
    
    const fermenting = fermentingCount
    const conditioning = conditioningCount
    const ready = readyCount
    const packaging = apiBatches.filter(b => b.status?.toUpperCase() === 'PACKAGING').length
    
    // ✅ FIXED: Blended = count UNIQUE blend lots (not individual batches)
    // A blend lot is a lot that contains multiple batches
    const blendLotIds = new Set<string>()
    
    apiBatches.forEach(b => {
      // Check timeline for blend event to find the blend lot
      const blendEvent = b.timeline?.find((t: any) => 
        t.type === 'NOTE' && (t.title?.includes('შეერია') || t.description?.includes('შეერია'))
      )
      if (blendEvent?.data?.lotId) {
        blendLotIds.add(blendEvent.data.lotId)
      }
      
      // Also check LotBatch for isBlendResult
      b.LotBatch?.forEach((lb: any) => {
        if (lb.Lot?.isBlendResult) {
          blendLotIds.add(lb.lotId)
        }
      })
      
      // Check allLots for lots with batchCount > 1
      b.allLots?.forEach((lot: any) => {
        const batchCount = lot.batchCount || lot._count?.LotBatch || 0
        if (batchCount > 1) {
          blendLotIds.add(lot.id)
        }
      })
    })
    
    const blended = blendLotIds.size
    
    // ✅ FIXED: Split = count batches with child lots (-A, -B suffixes)
    // Don't double-count - just count parent batches that were split
    const splitBatchIds = new Set<string>()
    
    apiBatches.forEach(b => {
      // Check if this batch has split lots (lots with -A, -B suffix)
      const hasSplitLots = b.LotBatch?.some((lb: any) => {
        const lotCode = lb.Lot?.lotCode || ''
        return /-[A-Z]$/.test(lotCode)  // Ends with -A, -B, etc.
      })
      
      // Or check allLots for split lot codes
      const hasSplitLotsInAllLots = b.allLots?.some((lot: any) => {
        const lotCode = lot.lotCode || lot.lotNumber || ''
        return /-[A-Z]$/.test(lotCode)
      })
      
      // Or has splitTanks array
      const hasSplitTanks = b.splitTanks?.length > 1
      
      if (hasSplitLots || hasSplitLotsInAllLots || hasSplitTanks || b.isSplit === true) {
        splitBatchIds.add(b.id)
      }
    })
    
    const split = splitBatchIds.size
    
    console.log('[Calendar Stats] fermenting:', fermenting, 'conditioning:', conditioning, 'ready:', ready, 'blended:', blended, 'split:', split)
    
    return { planned, brewing, fermenting, conditioning, ready, packaging, blended, split }
  }, [apiBatches])

  // Navigation handlers
  const goToPreviousWeek = () => {
    setWeekStart(prev => {
      const newDate = new Date(prev)
      newDate.setDate(prev.getDate() - 7)
      return newDate
    })
  }

  const goToNextWeek = () => {
    setWeekStart(prev => {
      const newDate = new Date(prev)
      newDate.setDate(prev.getDate() + 7)
      return newDate
    })
  }

  const goToPreviousMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() - 1)
      return newDate
    })
  }

  const goToNextMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() + 1)
      return newDate
    })
  }

  const goToToday = () => {
    const today = new Date()
    // დღევანდელი დღე შუაში - 3 დღით უკან დავიწყოთ
    const centeredStart = new Date(today)
    centeredStart.setDate(today.getDate() - 3)
    centeredStart.setHours(12, 0, 0, 0)
    setWeekStart(centeredStart)
    setCurrentMonth(new Date())
  }

  // Event handlers
  const handleEventClick = (event: CalendarEvent | ResourceCalendarEvent) => {
    // ✅ FIXED: Get fresh batch data from apiBatches to ensure correct status
    const batchId = 'batchId' in event ? event.batchId : event.id
    const freshBatch = apiBatches.find((b: any) => b.id === batchId)
    
    // Convert ResourceCalendarEvent to CalendarEvent format if needed
    // ✅ For split lots, determine type from lotPhase (actual lot status), not resourceType (tank type)
    const isSplitLot = 'isSplitLot' in event && event.isSplitLot
    const lotPhase = 'lotPhase' in event ? (event as any).lotPhase?.toUpperCase() : null
    
    // ✅ Map lotPhase to event type for split lots
    const getSplitLotType = (): string => {
      if (!isSplitLot || !lotPhase) return ''
      if (lotPhase === 'BRIGHT' || lotPhase === 'READY') return 'ready'  // ✅ BRIGHT = მზადაა
      if (lotPhase === 'CONDITIONING') return 'conditioning'
      if (lotPhase === 'FERMENTATION') return 'fermentation'
      return 'brewing'
    }
    
    const calendarEvent: CalendarEvent = {
      id: event.id,
      type: 'type' in event ? event.type : 
            // ✅ FIXED: For split lots, use lotPhase to determine type
            isSplitLot && lotPhase ? getSplitLotType() :
            'resourceType' in event && event.resourceType === 'brewhouse' ? 'brewing' :
            'resourceType' in event && event.resourceType === 'fermenter' ? 'fermentation' :
            'resourceType' in event && event.resourceType === 'conditioning' ? 'conditioning' : 'brewing',
      title: 'title' in event ? event.title : 'recipeName' in event ? event.recipeName : 'პარტია',
      batchId: batchId,
      batchNumber: 'batchNumber' in event ? event.batchNumber : undefined,
      recipe: 'recipe' in event ? event.recipe : 'recipeName' in event ? event.recipeName : undefined,
      recipeName: 'recipeName' in event ? event.recipeName : undefined,
      tankId: 'tankId' in event ? event.tankId : 'resourceId' in event ? event.resourceId : undefined,
      tankName: 'tankName' in event ? event.tankName : undefined,
      startDate: event.startDate,
      endDate: event.endDate,
      status: ('status' in event ? event.status : 'scheduled') as 'completed' | 'scheduled' | 'active',
      // ✅ CRITICAL: Use fresh status from API batch data
      batchStatus: freshBatch?.status?.toUpperCase() || 
                   ('batchStatus' in event ? event.batchStatus : 
                    'status' in event ? event.status?.toUpperCase() : 'PLANNED'),
      progress: 'progress' in event ? event.progress : undefined,
      temperature: 'temperature' in event ? event.temperature : undefined,
      notes: 'notes' in event ? event.notes : undefined,
      // ✅ Add volume for display in modal
      volume: 'volume' in event ? (event as any).volume : freshBatch?.volume,
      // ✅ CRITICAL: Pass split batch properties for phase transitions
      lotId: 'lotId' in event ? (event as any).lotId : undefined,
      phase: 'phase' in event ? (event as any).phase : undefined,
      isSplitLot: 'isSplitLot' in event ? (event as any).isSplitLot : false,
      lotPhase: 'lotPhase' in event ? (event as any).lotPhase : undefined,
    } as any
    
    console.log('Event clicked:', calendarEvent, 'Fresh batch status:', freshBatch?.status, 'lotId:', (calendarEvent as any).lotId)
    
    // ✅ ყველა batch event-ისთვის გახსენი EventDetailModal
    if (calendarEvent.batchId) {
      setSelectedEvent(calendarEvent)
      setShowEventModal(true)
      return
    }
    
    // სხვა events (CIP, maintenance)
    setSelectedEvent(calendarEvent)
    setShowEventModal(true)
  }

  const handleCellClick = (date: Date, tankId: string) => {
    setSelectedDate(date)
    setSelectedTankId(tankId)
    setShowNewBatchModal(true)
  }

  const handleTankClick = (resource: any, clickSource?: 'cip-badge' | 'tank') => {
    const eq = apiEquipment.find((eq: any) => eq.id === resource.id)
    if (!eq) return
    
    const batch = eq.currentBatchId ? apiBatches.find((b: any) => b.id === eq.currentBatchId) : null
    
    // Determine tank type
    let tankType: 'fermenter' | 'brite' | 'unitank' | 'conditioning' = 'fermenter'
    const eqType = eq.type?.toUpperCase() || ''
    if (eqType === 'FERMENTER') tankType = 'fermenter'
    else if (eqType === 'BRITE_TANK' || eqType === 'BRITE') tankType = 'brite'
    else if (eqType === 'UNITANK') tankType = 'unitank'
    else if (['BRITE_TANK', 'CONDITIONING_TANK', 'STORAGE'].includes(eqType)) tankType = 'conditioning'
    
    // Determine status
    let status: 'available' | 'in_use' | 'cleaning' | 'maintenance' = 'available'
    const eqStatus = eq.status?.toUpperCase() || ''
    
    // ✅ If CIP badge clicked, force cleaning status
    if (clickSource === 'cip-badge') {
      status = 'cleaning'
    } else if (eqStatus === 'OPERATIONAL' || eqStatus === 'OCCUPIED') {
      status = 'in_use'
    } else if (eqStatus === 'NEEDS_CIP' || eqStatus === 'CLEANING') {
      status = 'cleaning'
    } else if (eqStatus === 'MAINTENANCE') {
      status = 'maintenance'
    } else {
      status = 'available'
    }
    
    // ✅ Set flags for CIP
    const needsCIP = clickSource === 'cip-badge' || eqStatus === 'NEEDS_CIP'
    const openCIPTab = clickSource === 'cip-badge'
    
    const tankData = {
      id: eq.id,
      name: eq.name || resource.name || '',
      type: tankType,
      capacity: Number(eq.capacity) || 1000,
      currentVolume: batch?.volume || 0,
      status,
      needsCIP,      // ✅ ADD THIS
      openCIPTab,    // ✅ ADD THIS
      phase: eq.currentPhase || undefined,
      batch: eq.currentBatchId && batch ? {
        id: batch.id,
        batchNumber: batch.batchNumber || '',
        recipe: batch.recipe?.name || batch.recipeName || '',
        status: (batch.status?.toLowerCase() || 'planned') as any,
        startDate: new Date(batch.fermentationStartedAt || batch.conditioningStartedAt || batch.createdAt || new Date()),
        estimatedEndDate: new Date(batch.estimatedEndDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)),
        progress: batch.progress || 0,
      } : undefined,
      temperature: {
        current: eq.currentTemp || 4,
        target: 18,
        history: [],
      },
      gravity: {
        original: batch?.og || 0,
        current: batch?.currentGravity || 0,
        target: batch?.targetFg || 0,
        history: [],
      },
      pressure: eq.pressure || undefined,
      ph: eq.ph || undefined,
      lastUpdated: new Date(eq.updatedAt || eq.createdAt || new Date()),
    }
    
    setSelectedTankForModal(tankData)
  }

  const handleBatchCreated = async () => {
    setShowNewBatchModal(false)
    // ✅ FIXED: Use refreshBatches instead of page reload
    await refreshBatches()
  }

  const handleUpdateEvent = async (updatedEvent: CalendarEvent) => {
    setShowEventModal(false)
    setSelectedEvent(null)
    // ✅ FIXED: Use refreshBatches instead of page reload
    await refreshBatches()
  }

  const handleDeleteEvent = () => {
    setShowEventModal(false)
    setSelectedEvent(null)
  }

  const handlePhaseChange = async (batchId: string, newPhase: string, lotId?: string) => {
    console.log('Phase change requested:', { batchId, newPhase, lotId })
    
    // Find batch data
    const batch = apiBatches.find((b: any) => b.id === batchId)
    if (!batch) {
      console.error('Batch not found:', batchId)
      return
    }
    
    // Close event detail modal
    setShowEventModal(false)
    setSelectedEvent(null)
    
    // Set batch for phase change
    setSelectedBatchForPhaseChange(batch)
    
    // ✅ BREWING - გახსენი StartBrewingModal
    if (newPhase === 'BREWING') {
      setTimeout(() => setShowBrewingModal(true), 150)
      return
    }
    
    // ✅ FERMENTING - გახსენი StartFermentationModalV2
    if (newPhase === 'FERMENTING') {
      setTimeout(() => setShowFermentationModal(true), 150)
      return
    }
    
    // ✅ CONDITIONING - გახსენი TransferToConditioningModalV2
    if (newPhase === 'CONDITIONING') {
      // ✅ FIX: Store specific lot info for split batches
      if (lotId) {
        const lot = batch.allLots?.find((l: any) => l.id === lotId)
        if (lot) {
          const assignment = lot.TankAssignment?.find((a: any) => 
            a.status === 'ACTIVE' || a.status === 'PLANNED'
          )
          setSelectedLotForPhaseChange({
            lotId: lot.id,
            lotCode: lot.lotCode,
            tankId: assignment?.tankId || lot.tankId || '',
            tankName: assignment?.tank?.name || lot.tankName || '',
            volume: assignment?.plannedVolume || lot.volume || batch.volume,
          })
          console.log('[Calendar] Set selectedLotForPhaseChange:', lot.id, lot.lotCode)
        }
      } else {
        setSelectedLotForPhaseChange(null)
      }
      setTimeout(() => setShowConditioningModal(true), 150)
      return
    }
    
    // For other phases (READY, PACKAGING, COMPLETED) - direct API call
    const phaseEndpoints: Record<string, string> = {
      'READY': `/api/batches/${batchId}/mark-ready`,
      'PACKAGING': `/api/batches/${batchId}/start-packaging`,
      'COMPLETED': `/api/batches/${batchId}/complete`,
    }
    
    const endpoint = phaseEndpoints[newPhase]
    if (!endpoint) {
      console.error('[Calendar] Unknown phase endpoint:', newPhase)
      alert(`უცნობი ფაზა: ${newPhase}`)
      return
    }
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lotId }),  // ✅ Pass lotId for split batch operations
      })
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to change phase' }))
        throw new Error(error.error || error.message || 'Failed to change phase')
      }
      
      // Refresh batches
      await refreshBatches()
    } catch (error) {
      console.error('[Calendar] Error changing phase:', error)
      alert(error instanceof Error ? error.message : 'შეცდომა ფაზის შეცვლისას')
    }
  }

  // ✅ FIXED: Refresh batches helper with proper state update
  const refreshBatches = async () => {
    try {
      console.log('[Calendar] Refreshing batches...')
      const res = await fetch('/api/batches?includeCompleted=true')
      if (res.ok) {
        const data = await res.json()
        const batchesArray = Array.isArray(data) ? data : (data.batches || [])
        console.log('[Calendar] Batches refreshed:', batchesArray.length)
        setApiBatches(batchesArray)
      }
      
      // ✅ Also refresh equipment to update tank status (NEEDS_CIP)
      const eqRes = await fetch('/api/equipment')
      if (eqRes.ok) {
        const eqData = await eqRes.json()
        const eqArray = Array.isArray(eqData) ? eqData : (eqData.equipment || eqData.items || [])
        console.log('[Calendar] Equipment refreshed:', eqArray.length)
        setApiEquipment(eqArray)
      }
    } catch (error) {
      console.error('Error refreshing batches:', error)
    }
  }

  // ✅ Refresh equipment function for CIP updates
  const refreshEquipment = async () => {
    try {
      const eqRes = await fetch('/api/equipment')
      if (eqRes.ok) {
        const eqData = await eqRes.json()
        const eqArray = Array.isArray(eqData) ? eqData : (eqData.equipment || eqData.items || [])
        console.log('[Calendar] Equipment refreshed:', eqArray.length)
        setApiEquipment(eqArray)
      }
    } catch (error) {
      console.error('[Calendar] Error refreshing equipment:', error)
    }
  }

  // Handle fermentation modal success
  const handleFermentationSuccess = async () => {
    setShowFermentationModal(false)
    setSelectedBatchForPhaseChange(null)
    await refreshBatches()
  }

  // Handle conditioning modal success
  const handleConditioningSuccess = async () => {
    setShowConditioningModal(false)
    setSelectedBatchForPhaseChange(null)
    await refreshBatches()
  }

  // ✅ Build recipeIngredientsWithStock for StartBrewingModal (same as production page)
  const recipeIngredientsWithStock = useMemo(() => {
    if (!selectedBatchForPhaseChange) return []
    
    const batch = selectedBatchForPhaseChange
    const recipeIngredients = (batch as any)?.recipe?.ingredients || []
    
    if (!recipeIngredients || recipeIngredients.length === 0) {
      return []
    }
    
    const inventory = apiInventory
    
    // Calculate scale factor: batch volume / recipe batch size
    const batchVolume = batch?.volume || 0
    const recipeBatchSize = (batch as any)?.recipe?.batchSize ? Number((batch as any).recipe.batchSize) : batchVolume || 1
    const scaleFactor = batchVolume > 0 && recipeBatchSize > 0 ? batchVolume / recipeBatchSize : 1
    
    return recipeIngredients.map((ing: any, idx: number) => {
      // Scale ingredient amount by batch size
      const requiredAmount = Number(ing.amount || 0) * scaleFactor
      
      // Try to find inventory item by inventoryItemId first
      let stockItem = ing.inventoryItemId 
        ? inventory.find((inv: any) => inv.id === ing.inventoryItemId)
        : null
      
      // If not found by ID, try exact name match
      if (!stockItem) {
        stockItem = inventory.find((inv: any) => 
          inv.name?.toLowerCase() === ing.name?.toLowerCase()
        )
      }
      
      // If no exact match, try partial match
      if (!stockItem) {
        stockItem = inventory.find((inv: any) => 
          inv.name?.toLowerCase().includes(ing.name?.toLowerCase()) ||
          ing.name?.toLowerCase().includes(inv.name?.toLowerCase())
        )
      }
      
      // Check all possible field names for stock
      const stockAmount = stockItem?.balance || stockItem?.cachedBalance || stockItem?.currentStock || stockItem?.quantity || stockItem?.stock || 0
      
      // Map category to type
      let ingredientType = ing.category?.toLowerCase() || 'grain'
      if (ingredientType === 'malt') ingredientType = 'grain'
      if (ingredientType === 'hops') ingredientType = 'hop'
      if (ingredientType === 'water_chemistry') ingredientType = 'adjunct'
      
      return {
        id: ing.inventoryItemId || ing.id || `ing-${idx}`,
        name: ing.name,
        type: ingredientType as 'grain' | 'hop' | 'yeast' | 'adjunct',
        requiredAmount,
        unit: ing.unit || 'kg',
        stockAmount,
        stockStatus: getIngredientStockStatus(requiredAmount, stockAmount),
      }
    })
  }, [
    selectedBatchForPhaseChange?.id,
    selectedBatchForPhaseChange?.volume,
    (selectedBatchForPhaseChange as any)?.recipe?.id,
    (selectedBatchForPhaseChange as any)?.recipe?.batchSize,
    (selectedBatchForPhaseChange as any)?.recipe?.ingredients?.length,
    apiInventory.length,
  ])

  // ✅ Handle StartBrewing confirmation (deducts ingredients and updates batch)
  const handleStartBrewing = async (confirmedIngredients: { id: string; amount: number }[]) => {
    if (!selectedBatchForPhaseChange) return
    
    try {
      // Deduct ingredients from inventory
      for (const ing of confirmedIngredients) {
        const ingredientInfo = recipeIngredientsWithStock.find((r: any) => r.id === ing.id)
        const inventoryItem = apiInventory.find((inv: any) => 
          inv.id === ing.id || inv.name?.toLowerCase() === ingredientInfo?.name?.toLowerCase()
        )
        
        if (inventoryItem) {
          const currentStock = inventoryItem.balance || inventoryItem.cachedBalance || inventoryItem.currentStock || inventoryItem.quantity || inventoryItem.stock || 0
          const newStock = currentStock - ing.amount
          
          await fetch(`/api/inventory/${inventoryItem.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              balance: newStock,
              cachedBalance: newStock,
              currentStock: newStock,
            }),
          })
        }
      }
      
      // Update batch status to BREWING
      const response = await fetch(`/api/batches/${selectedBatchForPhaseChange.id}/start-brewing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      
      if (!response.ok) {
        throw new Error('Failed to start brewing')
      }
      
      // Refresh batches and inventory
      await refreshBatches()
      const inventoryRes = await fetch('/api/inventory')
      if (inventoryRes.ok) {
        const inventoryData = await inventoryRes.json()
        const inventoryArray = Array.isArray(inventoryData) ? inventoryData : (inventoryData.items || inventoryData.inventory || [])
        setApiInventory(inventoryArray)
      }
      
      setShowBrewingModal(false)
      setSelectedBatchForPhaseChange(null)
    } catch (error) {
      console.error('[Calendar] Error starting brewing:', error)
      alert(error instanceof Error ? error.message : 'შეცდომა ხარშვის დაწყებისას')
    }
  }

  // Removed toggleProductionFilter - filters removed from design

  const toggleOrderFilter = (key: string) => {
    setOrderFilters(prev => 
      prev.includes(key) ? prev.filter(f => f !== key) : [...prev, key]
    )
  }

  const months = ['იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი', 
                  'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი']

  // Loading state
  if (isLoading) {
    return (
      <DashboardLayout title="📅 კალენდარი" breadcrumb="მთავარი / კალენდარი">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-copper"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="📅 კალენდარი" breadcrumb="მთავარი / კალენდარი">
      {/* Stats - 7 Batch Status Cards */}
      <div className="grid grid-cols-7 gap-3 mb-4">
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <div className="text-2xl font-bold">{stats.planned || 0}</div>
          <div className="text-xs text-text-muted flex items-center gap-1">
            <span>📋</span> დაგეგმილი
          </div>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <div className="text-2xl font-bold">{stats.brewing || 0}</div>
          <div className="text-xs text-text-muted flex items-center gap-1">
            <span>🍺</span> ხარშვა
          </div>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <div className="text-2xl font-bold">{stats.fermenting || 0}</div>
          <div className="text-xs text-text-muted flex items-center gap-1">
            <span>🧪</span> ფერმენტაცია
          </div>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <div className="text-2xl font-bold">{stats.conditioning || 0}</div>
          <div className="text-xs text-text-muted flex items-center gap-1">
            <span>🔵</span> კონდიცირება
          </div>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <div className="text-2xl font-bold">{stats.ready || 0}</div>
          <div className="text-xs text-text-muted flex items-center gap-1">
            <span>✅</span> მზადაა
          </div>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <div className="text-2xl font-bold">{stats.blended || 0}</div>
          <div className="text-xs text-text-muted flex items-center gap-1">
            <span>🔄</span> შერეული
          </div>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <div className="text-2xl font-bold">{stats.split || 0}</div>
          <div className="text-xs text-text-muted flex items-center gap-1">
            <span>🔀</span> გაყოფილი
          </div>
        </div>
      </div>

      {/* Debug info */}
      {resources.length === 0 && (
        <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-400">
          ⚠️ რესურსები ვერ მოიძებნა. Equipment count: {apiEquipment.length}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('production')}
          className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
            activeTab === 'production'
              ? 'bg-copper text-white'
              : 'bg-bg-card border border-border hover:bg-bg-tertiary'
          }`}
        >
          🏭 წარმოება
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
            activeTab === 'orders'
              ? 'bg-copper text-white'
              : 'bg-bg-card border border-border hover:bg-bg-tertiary'
          }`}
        >
          📦 შეკვეთები
        </button>
      </div>

      {/* Production Tab */}
      {activeTab === 'production' && (
        <>
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-4">
              <button onClick={goToPreviousWeek} className="p-2 rounded-lg bg-bg-card border border-border hover:bg-bg-tertiary transition-colors">◀</button>
              <div className="text-lg font-semibold text-text-primary min-w-[220px] text-center">{formatWeekRange(weekStart)}</div>
              <button onClick={goToNextWeek} className="p-2 rounded-lg bg-bg-card border border-border hover:bg-bg-tertiary transition-colors">▶</button>
              <Button onClick={goToToday} variant="secondary" size="sm">დღეს</Button>
            </div>

            <Button onClick={() => setShowNewBatchModal(true)} variant="primary">
              🍺 + ახალი პარტია
            </Button>
          </div>

          <ResourceTimeline
            weekStart={weekStart}
            resources={resources}
            events={filteredProductionEvents as any}
            onEventClick={(e) => handleEventClick(e as any)}
            onCellClick={(date, resourceId) => handleCellClick(date, resourceId)}
            onResourceClick={(resource, clickSource) => handleTankClick(resource, clickSource)}
          />
        </>
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <>
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-4">
              <button onClick={goToPreviousMonth} className="p-2 rounded-lg bg-bg-card border border-border hover:bg-bg-tertiary transition-colors">◀</button>
              <div className="text-lg font-semibold text-text-primary min-w-[180px] text-center">{months[currentMonth.getMonth()]} {currentMonth.getFullYear()}</div>
              <button onClick={goToNextMonth} className="p-2 rounded-lg bg-bg-card border border-border hover:bg-bg-tertiary transition-colors">▶</button>
              <Button onClick={goToToday} variant="secondary" size="sm">დღეს</Button>
            </div>

            <div className="flex items-center gap-2">
              {ORDER_FILTERS.map(filter => (
                <button
                  key={filter.key}
                  onClick={() => toggleOrderFilter(filter.key)}
                  className={`px-3 py-1.5 rounded-full text-sm flex items-center gap-1.5 transition-all ${
                    orderFilters.includes(filter.key) ? `${filter.color} text-white` : 'bg-bg-tertiary text-text-muted hover:bg-bg-card'
                  }`}
                >
                  <span>{filter.icon}</span>
                  <span>{filter.label}</span>
                </button>
              ))}
            </div>

            <Button variant="secondary" size="sm" disabled>
              📦 + ახალი შეკვეთა (მალე)
            </Button>
          </div>

          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-9 lg:col-span-10">
              <OrdersCalendar currentMonth={currentMonth} events={filteredOrderEvents} onEventClick={handleEventClick} onCellClick={(date) => {}} />
            </div>
            <div className="col-span-3 lg:col-span-2">
              <UpcomingEvents events={filteredOrderEvents as any} onEventClick={handleEventClick} />
            </div>
          </div>
        </>
      )}

      {/* NewBatchModal */}
      <NewBatchModal
        isOpen={showNewBatchModal}
        onClose={() => {
          setShowNewBatchModal(false)
          setSelectedDate(null)
          setSelectedTankId(null)
        }}
        onSuccess={handleBatchCreated}
      />

      {/* Event Detail Modal */}
      <EventDetailModal
        key={selectedEvent?.id || 'event-modal'}  // ✅ Force remount
        event={selectedEvent}
        isOpen={showEventModal}
        onClose={() => {
          setShowEventModal(false)
          setSelectedEvent(null)
        }}
        onUpdate={handleUpdateEvent as any}
        onDelete={handleDeleteEvent}
        onPhaseChange={handlePhaseChange}
        onRefresh={refreshBatches}  // ✅ Refresh batches after completion
      />

      {/* ✅ Brewing Modal - Full version with ingredients */}
      {selectedBatchForPhaseChange && (
        <StartBrewingModal
          isOpen={showBrewingModal}
          onClose={() => {
            setShowBrewingModal(false)
            setSelectedBatchForPhaseChange(null)
          }}
          onConfirm={handleStartBrewing}
          batchNumber={selectedBatchForPhaseChange.batchNumber || ''}
          recipeName={selectedBatchForPhaseChange.recipeName || (selectedBatchForPhaseChange as any)?.recipe?.name || ''}
          recipeIngredients={recipeIngredientsWithStock}
        />
      )}
      
      {/* Fermentation Modal - ✅ დაამატე equipment prop */}
      {selectedBatchForPhaseChange && (
        <StartFermentationModalV2
          batchId={selectedBatchForPhaseChange.id}
          batchNumber={selectedBatchForPhaseChange.batchNumber || ''}
          recipeName={selectedBatchForPhaseChange.recipeName || selectedBatchForPhaseChange.recipe?.name || ''}
          recipeVolume={selectedBatchForPhaseChange.volume || 0}
          isOpen={showFermentationModal}
          onClose={() => {
            setShowFermentationModal(false)
            setSelectedBatchForPhaseChange(null)
          }}
          onComplete={handleFermentationSuccess}
        />
      )}

      {/* Conditioning Modal */}
      {selectedBatchForPhaseChange && (
        <TransferToConditioningModalV2
          batchId={selectedBatchForPhaseChange.id}
          batchNumber={selectedBatchForPhaseChange.batchNumber || ''}
          recipeName={selectedBatchForPhaseChange.recipeName || selectedBatchForPhaseChange.recipe?.name || ''}
          currentVolume={selectedBatchForPhaseChange.volume || 0}
          currentTankType={
            selectedBatchForPhaseChange.currentTank?.type ||
            selectedBatchForPhaseChange.tank?.type ||
            selectedBatchForPhaseChange.allLots?.[0]?.tank?.type ||
            selectedBatchForPhaseChange.allLots?.[0]?.assignments?.find((a: any) => a.status === 'ACTIVE')?.tankType ||
            selectedBatchForPhaseChange.allLots?.[0]?.assignments?.[0]?.tankType ||
            (apiEquipment.find((e: any) => e.id === (selectedBatchForPhaseChange.tankId || selectedBatchForPhaseChange.currentTank?.id))?.type)
          }
          currentLotId={
            // ✅ Prefer child lots (with -A, -B suffix) over parent lot
            selectedBatchForPhaseChange.currentLot?.id ||
            selectedBatchForPhaseChange.allLots?.find((l: any) => l.lotCode?.match(/-[A-Z]$/))?.id ||
            selectedBatchForPhaseChange.allLots?.[0]?.id
          }
          // ✅ FIX: Pass the specific lot info for split batches (from calendar event click)
          splitLotInfo={selectedLotForPhaseChange}
          isOpen={showConditioningModal}
          onClose={() => {
            setShowConditioningModal(false)
            setSelectedBatchForPhaseChange(null)
            setSelectedLotForPhaseChange(null)  // ✅ Clear lot info too
          }}
          onComplete={handleConditioningSuccess}
        />
      )}

      {/* Tank Detail Modal */}
      {selectedTankForModal && (
        <TankDetailModal
          tank={selectedTankForModal}
          onClose={() => setSelectedTankForModal(null)}
          onEquipmentUpdate={async () => {
            // ✅ Refresh calendar data after CIP
            await refreshEquipment()
            await refreshBatches()
          }}
        />
      )}
    </DashboardLayout>
  )
}

// Wrap in Suspense
export default function CalendarPage() {
  return (
    <Suspense fallback={
      <DashboardLayout title="📅 კალენდარი" breadcrumb="მთავარი / კალენდარი">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-copper"></div>
        </div>
      </DashboardLayout>
    }>
      <CalendarContent />
    </Suspense>
  )
}