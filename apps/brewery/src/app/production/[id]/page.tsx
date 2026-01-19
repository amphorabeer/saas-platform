'use client'



import { useState, useEffect, useMemo, useCallback, useRef } from 'react'

import { useParams, useRouter, useSearchParams } from 'next/navigation'

import { DashboardLayout } from '@/components/layout'

import { Card, CardHeader, CardBody, Button, ProgressBar, BatchStatusBadge } from '@/components/ui'

import { StartBrewingModal, getIngredientStockStatus } from '@/components/brewery'

import { PackagingModal, EditBatchModal, BatchReportModal, StartFermentationModal, StartFermentationModalV2, TransferToConditioningModal, TransferToConditioningModalV2 } from '@/components/production'

import { formatDate, formatTime, formatShortDate } from '@/lib/utils'
import { formatGravity, getGravityUnit, sgToPlato, sgToBrix, platoToSg, brixToSg } from '@/utils'
import { useBreweryStore } from '@/store'
import { TIMELINE_EVENT_ICONS, TIMELINE_EVENT_COLORS, INGREDIENT_TYPE_LABELS } from '@/store/types'



// BatchDetail interface for page display (transformed from store Batch)
interface BatchDetail {
  id: string
  batchNumber: string
  recipe: {
    id: string
    name: string
    style: string
    batchSize?: number
    ingredients?: any[]
  }
  status: string
  tank: {
    id: string
    name: string
    type: string
  }
  volume: number
  packagedVolume?: number  // ✅ Total volume packaged from API
  brewDate: Date
  estimatedEndDate: Date
  targetOG: number
  targetFG: number
  targetABV: number
  actualOG?: number
  actualFG?: number
  actualABV?: number
  currentGravity: number
  currentTemperature: number
  progress: number
  gravityReadings: Array<{
    id: string
    date: Date
    gravity: number
    temperature: number
    notes: string
    recordedBy: string
  }>
  qcTests?: Array<{
    id: string
    testType: string
    status: string
    scheduledDate: Date
    completedDate?: Date
    result?: number
    minValue?: number
    maxValue?: number
    unit?: string
    performedBy?: string
    notes?: string
  }>
  timeline: Array<{
    id: string
    type: string
    title: string
    description: string
    date: Date
    user: string
  }>
  notes: string
  brewer: string
  ingredients: {
    name: string
    amount: number
    unit: string
    type: string
    inventoryItemId?: string
  }[]
  calculatedABV?: number
  calculatedAttenuation?: number
  // ✅ Split tanks support
  splitTanks?: {
    lotId: string
    lotCode: string
    tankId: string
    tankName: string
    tankType?: string
    volume: number | null
    phase: string
    status: string
    percentage: number
  }[]
  // ✅ Blend lot detection
  currentLotId?: string | null
  currentLotCode?: string | null
  isPartOfBlendLot?: boolean
  blendLotBatchCount?: number
  // ✅ Resolved tank type for Unitank detection
  resolvedTankType?: string | null
}



export default function BatchDetailPage() {

  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  
  // ✅ Get focused lot ID from query params (for split lots)
  const focusedLotId = searchParams.get('lotId')

  const [batch, setBatch] = useState<BatchDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // ✅ Ref to track blend info fetch status - prevents re-fetching
  const blendInfoFetchedRef = useRef<string | null>(null)
  
  // Get RAW data from store - NO filtering in selector!
  const batches = useBreweryStore(state => state.batches)
  const allPackagingRecords = useBreweryStore(state => state.packagingRecords || [])
  const allTanks = useBreweryStore(state => state.tanks)
  
  // Zustand equipment (real-time updates)
  const zustandEquipment = useBreweryStore(state => state.equipment)
  
  // Equipment from API (base data) - same as production list
  const [apiEquipment, setApiEquipment] = useState<any[]>([])
  
  // Helper function to resolve tank IDs in timeline descriptions
  const resolveTankIdInDescription = useCallback((description: string, equipment: any[]): string => {
    if (!description || !equipment.length) return description
    const match = description.match(/ავზი:\s*([a-z0-9]{20,30})/i)
    if (match) {
      const tankId = match[1]
      const tank = equipment.find(eq => eq.id === tankId)
      if (tank?.name) return description.replace(tankId, tank.name)
    }
    return description
  }, [])
  
  // Fetch equipment from API
  useEffect(() => {
    fetch('/api/equipment')
      .then(res => res.json())
      .then(data => setApiEquipment(Array.isArray(data) ? data : []))
      .catch(console.error)
  }, [])
  
  // Merge: Zustand takes priority for currentBatchId/currentBatchNumber (real-time)
  const allEquipment = useMemo(() => {
    return apiEquipment.map(apiEq => {
      const zustandEq = zustandEquipment.find(z => z.id === apiEq.id)
      return {
        ...apiEq,
        currentBatchId: zustandEq?.currentBatchId || apiEq.currentBatchId,
        currentBatchNumber: zustandEq?.currentBatchNumber || apiEq.currentBatchNumber,
      }
    })
  }, [apiEquipment, zustandEquipment])
  
  // Fetch batch from API
  useEffect(() => {
    const fetchBatch = async () => {
      if (!params.id) return
      
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch(`/api/batches/${params.id}`)
        
        if (!response.ok) {
          if (response.status === 404) {
            setError(`პარტია ID: ${params.id} ვერ მოიძებნა`)
          } else {
            setError('შეცდომა პარტიის ჩატვირთვისას')
          }
          setLoading(false)
          return
        }
        
        const data = await response.json()
        const apiBatch = data.batch || data
        
        if (!apiBatch) {
          setError(`პარტია ID: ${params.id} ვერ მოიძებნა`)
          setLoading(false)
          return
        }
        
        // Transform API batch to BatchDetail format
        // ✅ FIX: Use pre-resolved tankName from API
        const tankName = apiBatch.resolvedTankName || apiBatch.tank?.name || '-'
        
        console.log('[BATCH DETAIL PAGE] tankName:', tankName)
        console.log('[BATCH DETAIL PAGE] currentLot from API:', apiBatch.currentLot)
        console.log('[BATCH DETAIL PAGE] LotBatch count:', apiBatch.LotBatch?.length)
        
        // Calculate dates
        const brewDate = apiBatch.brewedAt 
          ? new Date(apiBatch.brewedAt)
          : apiBatch.plannedDate 
          ? new Date(apiBatch.plannedDate)
          : apiBatch.createdAt 
          ? new Date(apiBatch.createdAt)
          : new Date()
        
        // Calculate estimated end date (default 14 days from brew date)
        const estimatedEndDate = apiBatch.completedAt
          ? new Date(apiBatch.completedAt)
          : (() => {
              const end = new Date(brewDate)
              end.setDate(end.getDate() + 14)
              return end
            })()
        
        // Transform gravity readings
        const gravityReadings = (apiBatch.gravityReadings || []).map((reading: any) => ({
          id: reading.id,
          date: reading.recordedAt ? new Date(reading.recordedAt) : new Date(),
          gravity: reading.gravity ? Number(reading.gravity) : 0,
          temperature: reading.temperature ? Number(reading.temperature) : 0,
          notes: reading.notes || '',
          recordedBy: reading.recordedBy || '',
        }))
        
        // Transform QC tests
        const qcTests = (apiBatch.QCTest || apiBatch.qcTests || []).map((test: any) => ({
          id: test.id,
          testType: test.testType || '',
          status: test.status || 'SCHEDULED',
          scheduledDate: test.scheduledDate ? new Date(test.scheduledDate) : new Date(),
          completedDate: test.completedDate ? new Date(test.completedDate) : undefined,
          result: test.result ? Number(test.result) : undefined,
          minValue: test.minValue ? Number(test.minValue) : undefined,
          maxValue: test.maxValue ? Number(test.maxValue) : undefined,
          unit: test.unit || '',
          performedBy: test.performedBy || undefined,
          notes: test.notes || undefined,
        }))
        
        // Transform timeline events
        const timeline = (apiBatch.timeline || []).map((event: any) => ({
          id: event.id,
          type: event.type || 'NOTE',
          title: event.title || '',
          description: event.description || '',
          date: event.createdAt ? new Date(event.createdAt) : new Date(),
          user: event.createdBy || '',
        }))
        
        // Transform ingredients
        const ingredients = (apiBatch.ingredients || []).map((ing: any) => {
          let ingredientType = ing.category || ing.type || 'grain'
          if (ingredientType === 'malt') ingredientType = 'grain'
          if (ingredientType === 'hops') ingredientType = 'hop'
          
          return {
            name: ing.name || '',
            amount: ing.plannedAmount ? Number(ing.plannedAmount) : ing.amount ? Number(ing.amount) : 0,
            unit: ing.unit || 'kg',
            type: ingredientType,
          }
        })
        
        // Calculate progress (based on status)
        let progress = 0
        switch (apiBatch.status?.toLowerCase()) {
          case 'planned':
            progress = 0
            break
          case 'brewing':
            progress = 10
            break
          case 'fermenting':
            progress = 40
            break
          case 'conditioning':
            progress = 70
            break
          case 'ready':
            progress = 85
            break
          case 'packaging':
            progress = 95
            break
          case 'completed':
            progress = 100
            break
          default:
            progress = 0
        }
        
        // Store full recipe object with ingredients for StartBrewingModal
        const recipeData = apiBatch.recipe || {}
        
        // Debug: Log API response recipe data
        console.log('[BatchDetailPage] API recipe data:', JSON.stringify(recipeData, null, 2))
        console.log('[BatchDetailPage] API recipe.ingredients:', recipeData.ingredients)
        console.log('[BatchDetailPage] API recipe.ingredients count:', recipeData.ingredients?.length || 0)
        
        setBatch({
          id: apiBatch.id,
          batchNumber: apiBatch.batchNumber,
          recipe: {
            id: apiBatch.recipeId || recipeData.id || '',
            name: recipeData.name || 'Unknown',
            style: recipeData.style || '',
            batchSize: recipeData.batchSize ? Number(recipeData.batchSize) : undefined,
            ingredients: recipeData.ingredients || [],  // ✅ Store ingredients from API
          },
          status: apiBatch.status?.toLowerCase() || 'planned',
          tank: {
            id: apiBatch.tankId || apiBatch.equipmentId || apiBatch.resolvedTankId || '',
            name: tankName,
            type: apiBatch.tank?.type || 'FERMENTER',
          },
          volume: apiBatch.volume ? Number(apiBatch.volume) : 0,
          packagedVolume: apiBatch.packagedVolume ? Number(apiBatch.packagedVolume) : 0, // ✅ Include packagedVolume from API
          brewDate,
          estimatedEndDate,
          targetOG: apiBatch.targetOg ? Number(apiBatch.targetOg) : apiBatch.recipe?.og ? Number(apiBatch.recipe.og) : 1.050,
          targetFG: apiBatch.targetFg ? Number(apiBatch.targetFg) : apiBatch.recipe?.fg ? Number(apiBatch.recipe.fg) : 1.010,
          targetABV: ((apiBatch.targetOg ? Number(apiBatch.targetOg) : 1.050) - (apiBatch.targetFg ? Number(apiBatch.targetFg) : 1.010)) * 131.25,
          // ✅ FIX: Get OG from gravity readings first, then fall back to API value
          actualOG: (() => {
            const ogReading = gravityReadings.find((r: any) => r.notes?.includes('OG') || r.notes?.includes('საწყისი'))
            return ogReading?.gravity || (apiBatch.originalGravity ? Number(apiBatch.originalGravity) : undefined)
          })(),
          actualFG: (() => {
            const fgReading = gravityReadings.find((r: any) => r.notes?.includes('FG') || r.notes?.includes('საბოლოო'))
            return fgReading?.gravity || (apiBatch.finalGravity ? Number(apiBatch.finalGravity) : undefined)
          })(),
          actualABV: apiBatch.calculatedAbv ? Number(apiBatch.calculatedAbv) : undefined,
          // ✅ FIX: Get current gravity from latest reading
          currentGravity: (() => {
            const latestReading = gravityReadings[0]
            return latestReading?.gravity || (apiBatch.currentGravity ? Number(apiBatch.currentGravity) : (apiBatch.originalGravity ? Number(apiBatch.originalGravity) : 1.050))
          })(),
          currentTemperature: 0, // API doesn't have this field
          progress,
          gravityReadings,
          qcTests,
          timeline,
          // ✅ Calculate ABV and Attenuation from gravity readings
          calculatedABV: (() => {
            const ogReading = gravityReadings.find((r: any) => r.notes?.includes('OG') || r.notes?.includes('საწყისი'))
            const fgReading = gravityReadings.find((r: any) => r.notes?.includes('FG') || r.notes?.includes('საბოლოო'))
            const actualOG = ogReading?.gravity || (apiBatch.originalGravity ? Number(apiBatch.originalGravity) : undefined)
            const actualFG = fgReading?.gravity || (apiBatch.finalGravity ? Number(apiBatch.finalGravity) : undefined)
            const latestReading = gravityReadings[0]
            const currentGravity = latestReading?.gravity || actualFG || actualOG
            if (actualOG && currentGravity) {
              return ((actualOG - currentGravity) * 131.25)
            }
            return 0
          })(),
          calculatedAttenuation: (() => {
            const ogReading = gravityReadings.find((r: any) => r.notes?.includes('OG') || r.notes?.includes('საწყისი'))
            const fgReading = gravityReadings.find((r: any) => r.notes?.includes('FG') || r.notes?.includes('საბოლოო'))
            const actualOG = ogReading?.gravity || (apiBatch.originalGravity ? Number(apiBatch.originalGravity) : undefined)
            const actualFG = fgReading?.gravity || (apiBatch.finalGravity ? Number(apiBatch.finalGravity) : undefined)
            const latestReading = gravityReadings[0]
            const currentGravity = latestReading?.gravity || actualFG || actualOG
            if (actualOG && currentGravity && actualOG > 1) {
              return (((actualOG - currentGravity) / (actualOG - 1)) * 100)
            }
            return 0
          })(),
          notes: apiBatch.notes || '',
          brewer: apiBatch.createdBy || 'Unknown',
          ingredients,
          // ✅ Split tanks from API
          splitTanks: apiBatch.splitTanks || [],
          // ✅ Resolved tank type for Unitank detection
          resolvedTankType: apiBatch.resolvedTankType || null,
          // ✅ Blend lot detection - use currentLot from API (now properly populated)
          currentLotId: apiBatch.currentLot?.id || apiBatch.LotBatch?.[0]?.lotId || null,
          currentLotCode: apiBatch.currentLot?.lotCode || apiBatch.LotBatch?.[0]?.Lot?.lotCode || null,
          isPartOfBlendLot: (() => {
            // First check currentLot from API (most accurate)
            if (apiBatch.currentLot) {
              return apiBatch.currentLot.isBlendResult === true || 
                     (apiBatch.currentLot.batchCount && apiBatch.currentLot.batchCount > 1)
            }
            // Fallback to LotBatch
            const lotBatch = apiBatch.LotBatch?.[0]
            if (!lotBatch) return false
            const lot = lotBatch.Lot || {}
            return lot.isBlendResult === true || (lot.batchCount && lot.batchCount > 1)
          })(),
          blendLotBatchCount: apiBatch.currentLot?.batchCount || apiBatch.LotBatch?.[0]?.Lot?.batchCount || 1,
        })
        
        // ✅ Load packaging records from batch API
        if (apiBatch.packagingRuns && apiBatch.packagingRuns.length > 0) {
          const packagingRecords = apiBatch.packagingRuns.map((pr: any) => ({
            id: pr.id,
            batchId: pr.batchId || apiBatch.id,
            lotId: pr.lotId, // ✅ Include lotId
            lotNumber: pr.lotNumber, // ✅ Include lotNumber (lotCode like "COND-...-A")
            packageType: pr.packageType || 'KEG_50',
            quantity: pr.quantity || 0,
            volumeTotal: pr.volumeTotal ? Number(pr.volumeTotal) : 0,
            performedAt: pr.performedAt ? new Date(pr.performedAt) : new Date(),
            performedBy: pr.performedBy || '',
          }))
          setApiPackagingRecords(packagingRecords)
          console.log('[BatchDetailPage] Loaded packaging records:', packagingRecords.length, 'total volume:', packagingRecords.reduce((sum: number, pr: any) => sum + pr.volumeTotal, 0))
          console.log('[BatchDetailPage] Packaging records with lotNumbers:', 
            packagingRecords.map((pr: any) => ({ lotNumber: pr.lotNumber, volume: pr.volumeTotal })))
        }
      } catch (err) {
        console.error('[BatchDetailPage] Error fetching batch:', err)
        setError('შეცდომა პარტიის ჩატვირთვისას')
      } finally {
        setLoading(false)
      }
    }
    
    fetchBatch()
  }, [params.id, allEquipment])
  
  // ✅ Fetch blend info from batches list API as fallback
  // The batch detail API may not include full lot info
  useEffect(() => {
    const fetchBlendInfo = async () => {
      if (!params.id) return
      
      try {
        console.log('[BATCH PAGE] Fetching blend info for batch:', params.id)
        
        // Fetch from batches list API which includes currentLot info
        const batchesRes = await fetch('/api/batches')
        if (!batchesRes.ok) return
        
        const batchesData = await batchesRes.json()
        const batchList = batchesData.batches || batchesData || []
        
        // Find this batch in the list
        const batchInfo = batchList.find((b: any) => b.id === params.id)
        if (!batchInfo) {
          console.log('[BATCH PAGE] Batch not found in list')
          return
        }
        
        console.log('[BATCH PAGE] Blend info from list API:', {
          batchNumber: batchInfo.batchNumber,
          currentLot: batchInfo.currentLot,
          lotCount: batchInfo.LotBatch?.length
        })
        
        // Check if this batch is part of a blend lot
        const currentLot = batchInfo.currentLot
        const lotBatchCount = batchInfo.LotBatch?.length || 0
        
        // Try to get lot from currentLot first, then from LotBatch
        let targetLotId = currentLot?.id
        
        // If no currentLot, check LotBatch for active lots
        if (!targetLotId && batchInfo.LotBatch?.length > 0) {
          // Find the most recent/active lot (not COMPLETED)
          const activeLotBatch = batchInfo.LotBatch.find((lb: any) => 
            lb.Lot?.status !== 'COMPLETED'
          ) || batchInfo.LotBatch[batchInfo.LotBatch.length - 1]
          
          targetLotId = activeLotBatch?.lotId
          console.log('[BATCH PAGE] Using LotBatch fallback:', {
            lotBatchCount: batchInfo.LotBatch.length,
            targetLotId
          })
        }
        
        if (targetLotId) {
          // Fetch full lot details to get accurate batch count
          const lotRes = await fetch(`/api/lots?id=${targetLotId}`)
          if (lotRes.ok) {
            const lotData = await lotRes.json()
            const lot = lotData.lots?.[0]
            if (lot) {
              // Check batch count from multiple sources
              const batchCount = lot.batchCount || 
                                 lot.batches?.length || 
                                 lot.LotBatch?.length || 
                                 lotBatchCount || 1
              const isBlend = lot.isBlendResult === true || batchCount > 1
              
              console.log('[BATCH PAGE] Lot details from API:', {
                lotId: lot.id,
                lotCode: lot.lotCode,
                batchCount,
                batchesLength: lot.batches?.length,
                lotBatchLength: lot.LotBatch?.length,
                isBlendResult: lot.isBlendResult,
                isBlend
              })
              
              // Update batch state with blend info
              setBatch(prev => {
                if (!prev) return null
                console.log('[BATCH PAGE] Updating batch with blend info:', {
                  lotId: lot.id,
                  lotCode: lot.lotCode,
                  isBlend,
                  batchCount
                })
                return {
                  ...prev,
                  currentLotId: lot.id,
                  currentLotCode: lot.lotCode,
                  isPartOfBlendLot: isBlend,
                  blendLotBatchCount: batchCount,
                }
              })
            }
          }
        }
      } catch (err) {
        console.error('[BATCH PAGE] Error fetching blend info:', err)
      }
    }
    
    // Run after batch is loaded - ONLY if currentLot was not returned from batch detail API
    // The batch detail API now properly returns currentLot, so fallback is rarely needed
    if (batch?.id && !batch.currentLotId) {
      console.log('[BATCH PAGE] No currentLotId from detail API, running fallback fetch...')
      fetchBlendInfo()
    }
  }, [params.id, batch?.id, batch?.currentLotId])
  
  // NOTE: Old backup useEffect removed - was conflicting with fetchBlendInfo
  // The fetchBlendInfo useEffect now handles all blend detection
  
  // Actions - these are stable references
  const addGravityReading = useBreweryStore(state => state.addGravityReading)
  const addTimelineEvent = useBreweryStore(state => state.addTimelineEvent)
  const deleteBatch = useBreweryStore(state => state.deleteBatch)
  const startBrewing = useBreweryStore(state => state.startBrewing)
  const startFermentation = useBreweryStore(state => state.startFermentation)
  const transferToConditioning = useBreweryStore(state => state.transferToConditioning)
  const markReady = useBreweryStore(state => state.markReady)
  const startPackaging = useBreweryStore(state => state.startPackaging)
  const completeBatch = useBreweryStore(state => state.completeBatch)
  const getAvailableTanks = useBreweryStore(state => state.getAvailableTanks)
  
  // Packaging records state
  const [apiPackagingRecords, setApiPackagingRecords] = useState<any[]>([])

  const [activeTab, setActiveTab] = useState<'overview' | 'readings' | 'timeline' | 'ingredients'>('overview')

  const [showAddReading, setShowAddReading] = useState(false)

  // Store gravity in SG format internally, convert for display
  const [newReading, setNewReading] = useState({ gravity: null as number | null, temperature: '', notes: '' })

  // Convert SG to display unit for input field (must be with other hooks, before any early returns)
  const displayGravity = useMemo(() => {
    if (newReading.gravity === null) return ''
    const unit = getGravityUnit()
    if (unit === 'SG') return newReading.gravity.toFixed(3)
    if (unit === 'Plato') return sgToPlato(newReading.gravity).toFixed(1)
    if (unit === 'Brix') return sgToBrix(newReading.gravity).toFixed(1)
    return newReading.gravity.toFixed(3)
  }, [newReading.gravity])

  const [showStartBrewing, setShowStartBrewing] = useState(false)

  const [showPackaging, setShowPackaging] = useState(false)

  const [showEditModal, setShowEditModal] = useState(false)

  const [showReportModal, setShowReportModal] = useState(false)

  const [showFermentationModal, setShowFermentationModal] = useState(false)

  const [showConditioningModal, setShowConditioningModal] = useState(false)
  // ✅ State for split lot conditioning
  const [selectedSplitLot, setSelectedSplitLot] = useState<{
    lotId: string
    lotCode: string
    tankId: string
    tankName: string
    volume: number | null
    tankType?: string  // ✅ Added for Unitank detection
  } | null>(null)

  // State for inventory from API (instead of Zustand)
  const [apiInventory, setApiInventory] = useState<any[]>([])

  // Fetch inventory immediately when page loads (not just when mounted)
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const response = await fetch('/api/inventory')
        if (response.ok) {
          const data = await response.json()
          const items = data.items || data || []
          console.log('API Inventory loaded:', items.length, 'items')
          setApiInventory(items)
        }
      } catch (error) {
        console.error('Error fetching inventory:', error)
      }
    }
    
    fetchInventory()  // Call immediately, not waiting for mounted
  }, [])  // Empty dependency - run once on mount



  // Build ingredients with stock info for StartBrewingModal
  // Use recipe.ingredients (from API) instead of batch.ingredients
  // ✅ Use primitive dependencies to avoid infinite loops
  const recipeIngredientsWithStock = useMemo(() => {
    // Get recipe ingredients from API batch response
    const recipeIngredients = (batch as any)?.recipe?.ingredients || []
    
    if (!recipeIngredients || recipeIngredients.length === 0) {
      return []
    }
    
    // Use API inventory instead of Zustand
    const inventory = apiInventory
    
    // Calculate scale factor: batch volume / recipe batch size
    const batchVolume = batch?.volume || 0
    const recipeBatchSize = (batch as any)?.recipe?.batchSize ? Number((batch as any).recipe.batchSize) : batchVolume || 1
    const scaleFactor = batchVolume > 0 && recipeBatchSize > 0 ? batchVolume / recipeBatchSize : 1
    
    // ✅ Helper function to normalize units to base (grams for weight, ml for volume)
    const normalizeToBase = (amount: number, unit: string): number => {
      const u = unit?.toLowerCase() || ''
      // Weight conversions to grams
      if (u === 'kg') return amount * 1000
      if (u === 'g' || u === 'გრ' || u === 'gram' || u === 'grams') return amount
      if (u === 'mg') return amount / 1000
      if (u === 'lb' || u === 'lbs') return amount * 453.592
      if (u === 'oz') return amount * 28.3495
      // Volume conversions to ml
      if (u === 'l' || u === 'liter' || u === 'liters' || u === 'ლ') return amount * 1000
      if (u === 'ml') return amount
      if (u === 'gal' || u === 'gallon') return amount * 3785.41
      // Default: return as-is
      return amount
    }
    
    return recipeIngredients.map((ing: any, idx: number) => {
      // Scale ingredient amount by batch size
      const requiredAmount = Number(ing.amount || 0) * scaleFactor
      const recipeUnit = ing.unit || 'g'
      
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
      
      // Check all possible field names for stock (API uses balance, cachedBalance, currentStock, quantity, or stock)
      const rawStockAmount = stockItem?.balance || stockItem?.cachedBalance || stockItem?.currentStock || stockItem?.quantity || stockItem?.stock || 0
      const stockUnit = stockItem?.unit || 'kg' // Inventory usually stores in kg
      
      // ✅ Convert stock to recipe unit for comparison
      const stockInBase = normalizeToBase(rawStockAmount, stockUnit)
      const requiredInBase = normalizeToBase(requiredAmount, recipeUnit)
      
      // ✅ Display in inventory unit (usually kg) for readability
      // Convert required amount to inventory unit for display
      let displayUnit = stockUnit || 'kg'
      let displayRequiredAmount = requiredAmount
      let displayStockAmount = rawStockAmount
      
      // Convert required amount from recipe unit to display unit (inventory unit)
      if (recipeUnit !== displayUnit) {
        const displayUnitLower = displayUnit?.toLowerCase() || ''
        if (displayUnitLower === 'kg') {
          displayRequiredAmount = requiredInBase / 1000 // grams to kg
        } else if (displayUnitLower === 'g') {
          displayRequiredAmount = requiredInBase // already in grams
        } else if (displayUnitLower === 'l' || displayUnitLower === 'ლ') {
          displayRequiredAmount = requiredInBase / 1000 // ml to liters
        } else if (displayUnitLower === 'ml') {
          displayRequiredAmount = requiredInBase // already in ml
        }
      }
      
      // Map category to type (RecipeIngredient uses category, not type)
      let ingredientType = ing.category?.toLowerCase() || 'grain'
      if (ingredientType === 'malt') ingredientType = 'grain'
      if (ingredientType === 'hops') ingredientType = 'hop'
      if (ingredientType === 'water_chemistry') ingredientType = 'adjunct'
      
      // ✅ Use base units for stock status comparison (same logic as getIngredientStockStatus)
      let stockStatus: 'ok' | 'low' | 'insufficient'
      if (stockInBase < requiredInBase) {
        stockStatus = 'insufficient'
      } else if (stockInBase < requiredInBase * 1.5) {
        stockStatus = 'low'
      } else {
        stockStatus = 'ok'
      }
      
      return {
        id: ing.inventoryItemId || ing.id || `ing-${idx}`,
        name: ing.name,
        type: ingredientType as 'grain' | 'hop' | 'yeast' | 'adjunct',
        requiredAmount: Math.round(displayRequiredAmount * 1000) / 1000, // ✅ In display unit (kg)
        unit: displayUnit, // ✅ Use inventory unit (kg) for readability
        stockAmount: Math.round(displayStockAmount * 100) / 100, // ✅ In display unit (kg)
        stockStatus,
      }
    })
  }, [
    batch?.id, // ✅ Use primitive ID instead of entire batch object
    batch?.volume, // ✅ Use primitive volume
    (batch as any)?.recipe?.id, // ✅ Use recipe ID
    (batch as any)?.recipe?.batchSize, // ✅ Use batchSize
    (batch as any)?.recipe?.ingredients?.length, // ✅ Use length instead of array
    apiInventory.length, // ✅ Use length instead of array
  ])



  const handleStartBrewing = async (confirmedIngredients: { id: string; amount: number }[]) => {
    console.log('Starting brewing with ingredients:', confirmedIngredients)

    if (params.id && typeof params.id === 'string') {
      try {
        for (const ing of confirmedIngredients) {
          const ingredientInfo = recipeIngredientsWithStock.find((r: any) => r.id === ing.id)
          const inventoryItem = apiInventory.find((inv: any) => 
            inv.id === ing.id || inv.name?.toLowerCase() === ingredientInfo?.name?.toLowerCase()
          )
          
          if (inventoryItem) {
            console.log(`Deducting ${ing.amount} from ${inventoryItem.name} (ID: ${inventoryItem.id})`)
            
            // Call API to record usage (deduct from inventory)
            // URL: /movements (არა /transactions!)
            // type: 'CONSUMPTION' (არა 'USAGE'!)
          const response = await fetch(`/api/inventory/${inventoryItem.id}/movements`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'CONSUMPTION',
              quantity: -ing.amount,
              reason: `ხარშვა - ${batch?.batchNumber}`,
              // batchId არ გადავცემთ - Zustand batch არ არის DB-ში
            }),
          })
            
            if (!response.ok) {
              const errorText = await response.text()
              console.error(`Failed to deduct ${inventoryItem.name}:`, errorText)
            } else {
              console.log(`✅ Deducted ${ing.amount} from ${inventoryItem.name}`)
            }
          }
        }
        
        // Refresh inventory after deductions
        const invResponse = await fetch('/api/inventory')
        if (invResponse.ok) {
          const data = await invResponse.json()
          setApiInventory(data.items || data || [])
        }
        
        console.log('[handleStartBrewing] ✅ Ingredients deducted, now updating batch status...')
        
        // Update batch status to 'brewing' via API
        try {
          // Get selected kettle from StartBrewingModal (if available)
          const kettleId = (window as any).__selectedKettleId || null
          
          const batchUpdateResponse = await fetch(`/api/batches/${params.id}/start-brewing`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              originalGravity: batch?.targetOG || undefined,  // Optional: original gravity if measured
              kettleId: kettleId,  // ✅ Pass kettle ID
            }),
          })
          
          console.log('[handleStartBrewing] Batch update response status:', batchUpdateResponse.status)
          
          if (!batchUpdateResponse.ok) {
            const errorData = await batchUpdateResponse.json().catch(() => ({ error: 'Unknown error' }))
            console.error('[handleStartBrewing] ❌ Batch update failed:', errorData)
            throw new Error(errorData.error || errorData.message || 'Failed to update batch status')
          }
          
          const updateData = await batchUpdateResponse.json()
          console.log('[handleStartBrewing] ✅ Batch update successful:', updateData)
          
          // Refresh batch data from API to get updated status
          console.log('[handleStartBrewing] Refreshing batch data from API...')
          const refreshResponse = await fetch(`/api/batches/${params.id}`)
          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json()
            const refreshedBatch = refreshData.batch || refreshData
            
            console.log('[handleStartBrewing] Refreshed batch from API:', {
              id: refreshedBatch.id,
              status: refreshedBatch.status,
              batchNumber: refreshedBatch.batchNumber,
            })
            
            // Update local state with refreshed batch
            const tankEquipment = refreshedBatch.tankId || refreshedBatch.equipmentId 
              ? allEquipment.find(eq => eq.id === (refreshedBatch.tankId || refreshedBatch.equipmentId))
              : null
            const tankName = refreshedBatch.tank?.name || tankEquipment?.name || '-'
            
            setBatch(prev => prev ? {
              ...prev,
              id: refreshedBatch.id, // ✅ Ensure batch.id is set
              status: refreshedBatch.status?.toLowerCase() || 'brewing',
              // Keep recipe.ingredients if it exists
              recipe: {
                ...prev.recipe,
                ...(refreshedBatch.recipe?.ingredients && { ingredients: refreshedBatch.recipe.ingredients }),
              },
            } : null)
            
            console.log('[handleStartBrewing] ✅ Batch state refreshed, new status:', refreshedBatch.status)
            console.log('[handleStartBrewing] ✅ Batch ID in state:', refreshedBatch.id)
          } else {
            console.error('[handleStartBrewing] ❌ Failed to refresh batch:', refreshResponse.status)
          }
          
        } catch (updateError) {
          console.error('[handleStartBrewing] ❌ Error updating batch status:', updateError)
          // Still update local state as fallback
          setBatch(prev => prev ? { ...prev, status: 'brewing' } : null)
        }
        
      } catch (error) {
        console.error('[handleStartBrewing] ❌ Error deducting ingredients:', error)
      }
      
      // Also update Zustand for backward compatibility (but API is primary)
      startBrewing(params.id)
      
      // Add timeline event for brewing started (Zustand - will be migrated to API later)
      addTimelineEvent(params.id, {
        type: 'BREWING_STARTED',
        title: 'ხარშვა დაიწყო',
        description: `ინგრედიენტები ჩამოიჭრა მარაგიდან`,
        user: 'ნიკა ზედგინიძე',
        date: new Date(),
      })
    }

    setShowStartBrewing(false)
    alert('ხარშვა დაიწყო! ინგრედიენტები ჩამოიჭრა მარაგიდან.')
  }



  // Packaging records from API (with Zustand fallback)
  const packagingRecordsFiltered = apiPackagingRecords.length > 0 
    ? apiPackagingRecords 
    : allPackagingRecords.filter(pr => pr.batchId === params.id) || []

  // Loading state
  if (loading) {
    return (
      <DashboardLayout title="იტვირთება..." breadcrumb="მთავარი / წარმოება">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-copper"></div>
        </div>
      </DashboardLayout>
    )
  }

  // Error state
  if (error) {
    return (
      <DashboardLayout title="პარტია ვერ მოიძებნა" breadcrumb="მთავარი / წარმოება">
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <p className="text-text-muted">{error}</p>
          <Button onClick={() => router.push('/production')}>უკან დაბრუნება</Button>
        </div>
      </DashboardLayout>
    )
  }

  // No batch found
  if (!batch) {
    return (
      <DashboardLayout title="პარტია ვერ მოიძებნა" breadcrumb="მთავარი / წარმოება">
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <p className="text-text-muted">პარტია ID: {params.id} ვერ მოიძებნა</p>
          <Button onClick={() => router.push('/production')}>უკან დაბრუნება</Button>
        </div>
      </DashboardLayout>
    )
  }



  // ✅ Calculate ABV and Attenuation from gravity readings
  const gravityReadings = batch.gravityReadings || []
  const ogReading = gravityReadings.find((r: any) => r.notes?.includes('OG') || r.notes?.includes('საწყისი'))
  const fgReading = gravityReadings.find((r: any) => r.notes?.includes('FG') || r.notes?.includes('საბოლოო'))

  // Get OG from reading or batch
  const actualOG = ogReading?.gravity || batch.actualOG
  const actualFG = fgReading?.gravity || batch.actualFG

  // Calculate current ABV (from latest reading vs OG)
  // ✅ Get latest temperature from gravity readings
  const latestReading = batch.gravityReadings?.[0] // sorted desc by recordedAt
  
  // ✅ FIX: For COMPLETED batches, use actualFG or targetFG for ABV calculation
  // For in-progress batches, use latest reading
  const isCompleted = batch.status === 'COMPLETED'
  const currentGravity = isCompleted 
    ? (actualFG || batch.targetFG || latestReading?.gravity || actualOG)
    : (latestReading?.gravity || actualFG || actualOG)
  const currentTemperature = latestReading?.temperature || batch.currentTemperature || null

  // ABV formula: (OG - FG) * 131.25
  const calculatedABV = actualOG && currentGravity && actualOG !== currentGravity
    ? ((actualOG - currentGravity) * 131.25)
    : batch.calculatedABV || 0

  // Attenuation formula: ((OG - FG) / (OG - 1)) * 100
  const attenuation = actualOG && currentGravity && actualOG > 1 && actualOG !== currentGravity
    ? (((actualOG - currentGravity) / (actualOG - 1)) * 100)
    : batch.calculatedAttenuation || 0

  console.log('[BATCH] Status:', batch.status, 'OG:', actualOG, 'Current SG:', currentGravity, 'ABV:', calculatedABV, 'Attenuation:', attenuation)
  console.log('[BATCH] Latest reading:', latestReading, 'Temperature:', currentTemperature)

  const currentABV = calculatedABV > 0 ? calculatedABV.toFixed(1) : '0.0'
  const attenuationPercent = attenuation > 0 ? attenuation.toFixed(0) : '0'



  const daysInFermentation = Math.floor((Date.now() - batch.brewDate.getTime()) / (1000 * 60 * 60 * 24))

  const daysRemaining = Math.max(0, Math.floor((batch.estimatedEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))

  // Convert display unit to SG when user changes input
  const handleGravityChange = (displayValue: string) => {
    if (!displayValue || displayValue === '') {
      setNewReading(prev => ({ ...prev, gravity: null }))
      return
    }
    
    const numValue = parseFloat(displayValue)
    if (isNaN(numValue)) return
    
    const unit = getGravityUnit()
    let sgValue: number
    if (unit === 'SG') {
      sgValue = numValue
    } else if (unit === 'Plato') {
      sgValue = platoToSg(numValue)
    } else if (unit === 'Brix') {
      sgValue = brixToSg(numValue)
    } else {
      sgValue = numValue
    }
    
    setNewReading(prev => ({ ...prev, gravity: sgValue }))
  }

  const handleAddReading = async () => {
    if (!newReading.gravity) return
    
    try {
      const response = await fetch(`/api/batches/${batch.id}/gravity-readings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gravity: newReading.gravity, // Already in SG format
          temperature: newReading.temperature ? parseFloat(newReading.temperature) : null,
          notes: newReading.notes || null,
        }),
      })
      
      if (response.ok) {
        // Refresh batch data
        const data = await response.json()
        setBatch(prev => prev ? {
          ...prev,
          gravityReadings: [{
            id: data.reading.id,
            date: new Date(data.reading.recordedAt),
            gravity: Number(data.reading.gravity),
            temperature: data.reading.temperature ? Number(data.reading.temperature) : 0,
            notes: data.reading.notes || '',
            recordedBy: data.reading.recordedBy || '',
          }, ...(prev.gravityReadings || [])],
        } : null)
        setNewReading({ gravity: null, temperature: '', notes: '' })
        setShowAddReading(false)
      }
    } catch (error) {
      console.error('Failed to add reading:', error)
    }
  }

  const handleDeleteBatch = async (batchIdToDelete?: string) => {
    // Try multiple sources for batch ID: parameter, batch state, or URL params
    const id = batchIdToDelete || batch?.id || (typeof params.id === 'string' ? params.id : null)
    if (!id) {
      console.error('[handleDeleteBatch] No batch ID', {
        batchIdToDelete,
        batchStateId: batch?.id,
        paramsId: params.id
      })
      alert('შეცდომა: პარტიის ID ვერ მოიძებნა')
      return
    }
    
    // Confirmation
    const confirmed = window.confirm(
      `ნამდვილად გსურთ "${batch?.batchNumber || 'ამ'}" პარტიის წაშლა? ეს მოქმედება შეუქცევადია.`
    )
    
    if (!confirmed) return
    
    try {
      console.log('[handleDeleteBatch] Deleting:', id)
      await deleteBatch(id as string)
      
      // Redirect to production list
      router.push('/production')
    } catch (error) {
      console.error('[handleDeleteBatch] Error:', error)
      alert('პარტიის წაშლა ვერ მოხერხდა: ' + (error as Error).message)
    }
  }

  const handleStartFermentation = () => {
    setShowFermentationModal(true)
  }

  const handleTransferToConditioning = () => {
    setShowConditioningModal(true)
  }

  const handleFermentationComplete = async () => {
    // ✅ Refresh batch data from API to check for split tanks
    if (params.id && typeof params.id === 'string') {
      try {
        const response = await fetch(`/api/batches/${params.id}`)
        if (response.ok) {
          const data = await response.json()
          const apiBatch = data.batch || data
          
          // ✅ Check if fermentation split happened (multiple split tanks)
          if (apiBatch.splitTanks && apiBatch.splitTanks.length > 1) {
            console.log('[handleFermentationComplete] Split detected, navigating to production page')
            // Split was successful - navigate back to production page
            router.push('/production')
            return
          }
          
          // If no split, continue with normal batch update
          if (apiBatch) {
            // Use merged equipment (same as main useEffect)
            const tankEquipment = apiBatch.tankId || apiBatch.equipmentId 
              ? allEquipment.find(eq => eq.id === (apiBatch.tankId || apiBatch.equipmentId))
              : null
            const tankName = apiBatch.tank?.name || tankEquipment?.name || '-'
            
            const brewDate = apiBatch.brewedAt 
              ? new Date(apiBatch.brewedAt)
              : apiBatch.plannedDate 
              ? new Date(apiBatch.plannedDate)
              : apiBatch.createdAt 
              ? new Date(apiBatch.createdAt)
              : new Date()
            
            const estimatedEndDate = apiBatch.completedAt
              ? new Date(apiBatch.completedAt)
              : (() => {
                  const end = new Date(brewDate)
                  end.setDate(end.getDate() + 14)
                  return end
                })()
            
            setBatch({
              id: apiBatch.id,
              batchNumber: apiBatch.batchNumber,
              recipe: {
                id: apiBatch.recipe?.id || apiBatch.recipeId,
                name: apiBatch.recipe?.name || '',
                style: apiBatch.recipe?.style || '',
              },
              status: apiBatch.status,
              tank: {
                id: apiBatch.tankId || apiBatch.equipmentId || '',
                name: tankName,
                type: tankEquipment?.type || 'ფერმენტატორი',
              },
              volume: apiBatch.volume ? Number(apiBatch.volume) : 0,
              brewDate,
              estimatedEndDate,
              targetOG: apiBatch.targetOg ? Number(apiBatch.targetOg) : 0,
              targetFG: 0, // targetFg doesn't exist in schema
              targetABV: apiBatch.targetOg 
                ? ((Number(apiBatch.targetOg) - 1.010) * 131.25)
                : 0,
              actualOG: apiBatch.originalGravity ? Number(apiBatch.originalGravity) : 0,
              currentGravity: apiBatch.currentGravity ? Number(apiBatch.currentGravity) : apiBatch.originalGravity ? Number(apiBatch.originalGravity) : 0,
              currentTemperature: apiBatch.temperature ? Number(apiBatch.temperature) : 0,
              progress: apiBatch.progress || 0,
              gravityReadings: (apiBatch.gravityReadings || []).map((reading: any) => ({
                ...reading,
                date: reading.recordedAt ? new Date(reading.recordedAt) : new Date(),
              })),
              qcTests: (apiBatch.qcTests || []).map((test: any) => ({
                id: test.id,
                testType: test.testType || '',
                status: test.status || 'SCHEDULED',
                scheduledDate: test.scheduledDate ? new Date(test.scheduledDate) : new Date(),
                completedDate: test.completedDate ? new Date(test.completedDate) : undefined,
                result: test.result ? Number(test.result) : undefined,
                minValue: test.minValue ? Number(test.minValue) : undefined,
                maxValue: test.maxValue ? Number(test.maxValue) : undefined,
                unit: test.unit || '',
                performedBy: test.performedBy || undefined,
                notes: test.notes || undefined,
              })),
              timeline: (apiBatch.timeline || []).map((event: any) => ({
                ...event,
                date: event.createdAt ? new Date(event.createdAt) : new Date(),
              })),
              notes: apiBatch.notes || '',
              brewer: apiBatch.brewerName || apiBatch.createdBy,
              ingredients: (apiBatch.ingredients || []).map((ing: any) => ({
                name: ing.name,
                amount: ing.amount,
                unit: ing.unit,
                type: ing.type,
              })),
              // ✅ Split tanks and resolved tank type from API
              splitTanks: apiBatch.splitTanks || [],
              resolvedTankType: apiBatch.resolvedTankType || null,
            })
          }
        }
      } catch (err) {
        console.error('[handleFermentationComplete] Error fetching batch:', err)
      }
    }
    setShowFermentationModal(false)
  }

  const handleConditioningComplete = async () => {
    console.log('[handleConditioningComplete] Refreshing batch data from API...')
    
    // ✅ Refresh batch data from API (not Zustand store)
    if (params.id && typeof params.id === 'string') {
      try {
        const response = await fetch(`/api/batches/${params.id}`)
        if (response.ok) {
          const data = await response.json()
          const apiBatch = data.batch || data
          
          if (apiBatch) {
            // Transform API batch to BatchDetail format (same as fetchBatch)
            const tankEquipment = apiBatch.tankId || apiBatch.equipmentId 
              ? allEquipment.find(eq => eq.id === (apiBatch.tankId || apiBatch.equipmentId))
              : null
            const tankName = apiBatch.tank?.name || tankEquipment?.name || '-'
            
            const brewDate = apiBatch.brewedAt 
              ? new Date(apiBatch.brewedAt)
              : apiBatch.plannedDate 
              ? new Date(apiBatch.plannedDate)
              : apiBatch.createdAt 
              ? new Date(apiBatch.createdAt)
              : new Date()
            
            const estimatedEndDate = apiBatch.completedAt
              ? new Date(apiBatch.completedAt)
              : (() => {
                  const end = new Date(brewDate)
                  end.setDate(end.getDate() + 14)
                  return end
                })()
            
            const gravityReadings = (apiBatch.gravityReadings || []).map((reading: any) => ({
              id: reading.id,
              date: reading.recordedAt ? new Date(reading.recordedAt) : new Date(),
              gravity: reading.gravity ? Number(reading.gravity) : 0,
              temperature: reading.temperature ? Number(reading.temperature) : 0,
              notes: reading.notes || '',
              recordedBy: reading.recordedBy || '',
            }))
            
            const qcTests = (apiBatch.qcTests || []).map((test: any) => ({
              id: test.id,
              testType: test.testType || '',
              status: test.status || 'SCHEDULED',
              scheduledDate: test.scheduledDate ? new Date(test.scheduledDate) : new Date(),
              completedDate: test.completedDate ? new Date(test.completedDate) : undefined,
              result: test.result ? Number(test.result) : undefined,
              minValue: test.minValue ? Number(test.minValue) : undefined,
              maxValue: test.maxValue ? Number(test.maxValue) : undefined,
              unit: test.unit || '',
              performedBy: test.performedBy || undefined,
              notes: test.notes || undefined,
            }))
            
            const timeline = (apiBatch.timeline || []).map((event: any) => ({
              id: event.id,
              type: event.type || 'NOTE',
              title: event.title || '',
              description: event.description || '',
              date: event.createdAt ? new Date(event.createdAt) : new Date(),
              user: event.createdBy || '',
            }))
            
            const ingredients = (apiBatch.ingredients || []).map((ing: any) => {
              let ingredientType = ing.category || ing.type || 'grain'
              if (ingredientType === 'malt') ingredientType = 'grain'
              if (ingredientType === 'hops') ingredientType = 'hop'
              
              return {
                name: ing.name || '',
                amount: ing.plannedAmount ? Number(ing.plannedAmount) : ing.amount ? Number(ing.amount) : 0,
                unit: ing.unit || 'kg',
                type: ingredientType,
              }
            })
            
            let progress = 0
            switch (apiBatch.status?.toLowerCase()) {
              case 'planned': progress = 0; break
              case 'brewing': progress = 10; break
              case 'fermenting': progress = 40; break
              case 'conditioning': progress = 70; break
              case 'ready': progress = 85; break
              case 'packaging': progress = 95; break
              case 'completed': progress = 100; break
              default: progress = 0
            }
            
            const recipeData = apiBatch.recipe || {}
            
            setBatch({
              id: apiBatch.id,
              batchNumber: apiBatch.batchNumber,
              recipe: {
                id: apiBatch.recipeId || recipeData.id || '',
                name: recipeData.name || 'Unknown',
                style: recipeData.style || '',
                batchSize: recipeData.batchSize ? Number(recipeData.batchSize) : undefined,
                ingredients: recipeData.ingredients || [],
              },
              status: apiBatch.status?.toLowerCase() || 'planned',
              tank: {
                id: apiBatch.tankId || apiBatch.equipmentId || '',
                name: tankName,
                type: apiBatch.tank?.type || tankEquipment?.type || 'FERMENTER',
              },
              volume: apiBatch.volume ? Number(apiBatch.volume) : 0,
              packagedVolume: apiBatch.packagedVolume ? Number(apiBatch.packagedVolume) : 0, // ✅ Include packagedVolume from API
              brewDate,
              estimatedEndDate,
              targetOG: apiBatch.targetOg ? Number(apiBatch.targetOg) : apiBatch.recipe?.og ? Number(apiBatch.recipe.og) : 1.050,
              targetFG: apiBatch.targetFg ? Number(apiBatch.targetFg) : apiBatch.recipe?.fg ? Number(apiBatch.recipe.fg) : 1.010,
              targetABV: ((apiBatch.targetOg ? Number(apiBatch.targetOg) : 1.050) - (apiBatch.targetFg ? Number(apiBatch.targetFg) : 1.010)) * 131.25,
              actualOG: apiBatch.originalGravity ? Number(apiBatch.originalGravity) : undefined,
              actualFG: apiBatch.finalGravity ? Number(apiBatch.finalGravity) : undefined,
              actualABV: apiBatch.calculatedAbv ? Number(apiBatch.calculatedAbv) : undefined,
              currentGravity: apiBatch.currentGravity ? Number(apiBatch.currentGravity) : (apiBatch.originalGravity ? Number(apiBatch.originalGravity) : 1.050),
              currentTemperature: 0,
              progress,
              gravityReadings,
              qcTests: (apiBatch.qcTests || []).map((test: any) => ({
                id: test.id,
                testType: test.testType || '',
                status: test.status || 'SCHEDULED',
                scheduledDate: test.scheduledDate ? new Date(test.scheduledDate) : new Date(),
                completedDate: test.completedDate ? new Date(test.completedDate) : undefined,
                result: test.result ? Number(test.result) : undefined,
                minValue: test.minValue ? Number(test.minValue) : undefined,
                maxValue: test.maxValue ? Number(test.maxValue) : undefined,
                unit: test.unit || '',
                performedBy: test.performedBy || undefined,
                notes: test.notes || undefined,
              })),
              timeline,
              notes: apiBatch.notes || '',
              brewer: apiBatch.createdBy || 'Unknown',
              ingredients,
              // ✅ Split tanks and resolved tank type from API
              splitTanks: apiBatch.splitTanks || [],
              resolvedTankType: apiBatch.resolvedTankType || null,
            })
            
            console.log('[handleConditioningComplete] ✅ Batch data refreshed, new status:', apiBatch.status)
          }
        }
      } catch (error) {
        console.error('[handleConditioningComplete] Error refreshing batch:', error)
        // Fallback: use router.refresh() if available
        if (typeof window !== 'undefined' && (window as any).router) {
          (window as any).router.refresh()
        }
      }
    }
    
    setShowConditioningModal(false)
  }

  const handleMarkReady = async () => {
    if (!batch?.id) {
      console.error('[handleMarkReady] No batch ID')
      return
    }
    
    try {
      console.log('[handleMarkReady] Marking as ready:', batch.id)
      await markReady({ batchId: batch.id })
      
      // Refresh data from API
      const refreshResponse = await fetch(`/api/batches/${batch.id}`)
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json()
        const refreshedBatch = refreshData.batch || refreshData
        setBatch(prev => prev ? {
          ...prev,
          status: refreshedBatch.status?.toLowerCase() || 'ready',
          packagedVolume: refreshedBatch.packagedVolume ? Number(refreshedBatch.packagedVolume) : prev.packagedVolume || 0, // ✅ Update packagedVolume from API
        } : null)
      }
    } catch (error) {
      console.error('[handleMarkReady] Error:', error)
      alert('პარტიის "მზადაა" მონიშვნა ვერ მოხერხდა. სცადეთ თავიდან.')
    }
  }

  const handleStartPackaging = async () => {
    console.log('[handleStartPackaging] Current batch status:', batch?.status)
    console.log('[handleStartPackaging] Batch ID:', batch?.id)
    console.log('[handleStartPackaging] params.id:', params.id)
    
    if (!batch?.id) {
      console.error('[handleStartPackaging] ❌ No batch ID available')
      return
    }
    
    // If status is 'ready', first call startPackaging API to set status to 'packaging'
    if (batch?.status === 'ready' || batch?.status === 'READY') {
      console.log('[handleStartPackaging] Batch is READY, calling startPackaging API...')
      try {
        // ✅ Call API to change status from READY to PACKAGING
        await startPackaging({
          batchId: batch.id,
          // PackagingModal will provide the actual packaging details
        })
        console.log('[handleStartPackaging] ✅ startPackaging API call successful')
        
        // Refresh batch data from API to get updated status
        if (params.id && typeof params.id === 'string') {
          const refreshResponse = await fetch(`/api/batches/${params.id}`)
          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json()
            const refreshedBatch = refreshData.batch || refreshData
            console.log('[handleStartPackaging] Refreshed batch status:', refreshedBatch.status)
            setBatch(prev => prev ? {
              ...prev,
              status: refreshedBatch.status?.toLowerCase() || 'packaging',
            } : null)
          }
        }
      } catch (error) {
        console.error('[handleStartPackaging] ❌ Error calling startPackaging:', error)
        alert('შეფუთვის დაწყება ვერ მოხერხდა. სცადეთ თავიდან.')
        return
      }
    }
    
    // Open packaging modal
    console.log('[handleStartPackaging] Opening packaging modal...')
    setShowPackaging(true)
  }






  // ✅ Find focused lot from splitTanks if lotId query param is present
  const focusedLot = focusedLotId && batch?.splitTanks?.find(t => t.lotId === focusedLotId)
  
  // ✅ Calculate display name: batchNumber + suffix (e.g., BRWW-2026-0006-A)
  const displayBatchNumber = (() => {
    if (focusedLot && focusedLot.lotCode) {
      const suffixMatch = focusedLot.lotCode.match(/-([A-Z])$/)
      if (suffixMatch) {
        return `${batch.batchNumber}-${suffixMatch[1]}`
      }
    }
    return batch.batchNumber
  })()

  return (

    <DashboardLayout 

      title={displayBatchNumber} 

      breadcrumb={`მთავარი / წარმოება / ${displayBatchNumber}`}

    >

      {/* Header Card */}

      <Card className="mb-6">

        <CardBody>

          <div className="flex items-start justify-between">

            <div className="flex items-center gap-4">

              <div className="w-16 h-16 rounded-2xl bg-gradient-copper flex items-center justify-center text-3xl">

                🍺

              </div>

              <div>

                <div className="flex items-center gap-3 mb-1">

                  <h1 className="text-2xl font-display font-bold">{batch.recipe.name}</h1>

                  {/* ✅ Show lot phase badge for focused lot */}
                  {focusedLot && (
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      focusedLot.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                      focusedLot.phase === 'FERMENTATION' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                      focusedLot.phase === 'CONDITIONING' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' :
                      focusedLot.phase === 'BRIGHT' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                      focusedLot.phase === 'PACKAGING' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                    }`}>
                      {focusedLot.status === 'COMPLETED' ? 'დასრულებული' :
                       focusedLot.phase === 'FERMENTATION' ? 'ფერმენტაცია' :
                       focusedLot.phase === 'CONDITIONING' ? 'კონდიცირება' :
                       focusedLot.phase === 'BRIGHT' ? 'მზადაა' :
                       focusedLot.phase === 'PACKAGING' ? 'დაფასოება' :
                       focusedLot.phase}
                    </span>
                  )}

                  {/* ✅ Hide badge for split batches - each lot has its own status */}
                  {!focusedLot && (!batch.splitTanks || batch.splitTanks.length <= 1) && batch.status !== 'fermenting' && (
                    <BatchStatusBadge status={batch.status} showPulse={batch.status === 'fermenting'} />
                  )}

                </div>

                <p className="text-text-muted">
                  {batch.recipe.style} • {focusedLot 
                    ? `🔀 ${focusedLot.tankName} ავზში • ${focusedLot.volume || Math.round(batch.volume * (focusedLot.percentage || 50) / 100)}L`
                    : batch.splitTanks && batch.splitTanks.length > 1 
                      ? `🔀 ${batch.splitTanks.length} ავზში` 
                      : (batch.tank?.name || '-')} {!focusedLot && `• ${batch.volume}L`}
                </p>

              </div>

            </div>

            <div className="flex gap-2">

              <Button variant="ghost" onClick={() => router.back()}>← უკან</Button>

              {/* ✅ Show edit/report for both batch and focused lot */}
              <Button variant="secondary" onClick={() => setShowEditModal(true)}>✏️ რედაქტირება</Button>

              {/* Report button for all statuses except planned */}
              {batch.status !== 'planned' && (
                <Button variant="secondary" size="sm" onClick={() => setShowReportModal(true)}>
                  📋 ანგარიში
                </Button>
              )}

              {/* ✅ For focused lot - show phase change button in header */}
              {focusedLot && focusedLot.status !== 'COMPLETED' && (
                <>
                  {focusedLot.phase === 'FERMENTATION' && (
                    <Button 
                      variant="primary" 
                      onClick={() => {
                        setSelectedSplitLot({
                          lotId: focusedLot.lotId,
                          lotCode: focusedLot.lotCode,
                          tankId: focusedLot.tankId,
                          tankName: focusedLot.tankName,
                          volume: focusedLot.volume,
                          tankType: focusedLot.tankType,  // ✅ Added for Unitank detection
                        })
                        setShowConditioningModal(true)
                      }}
                    >
                      ❄️ კონდიცირებაზე გადატანა
                    </Button>
                  )}
                  {focusedLot.phase === 'CONDITIONING' && (
                    <Button 
                      variant="primary"
                      onClick={async () => {
                        if (!confirm(`გადავიტანოთ ლოტი ${focusedLot.lotCode} Bright ფაზაში?`)) return
                        try {
                          const res = await fetch('/api/lots/phase', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ lotId: focusedLot.lotId, phase: 'BRIGHT' })
                          })
                          if (res.ok) {
                            alert('ლოტი გადავიდა Bright ფაზაში!')
                            window.location.reload()
                          } else {
                            const data = await res.json()
                            alert(`შეცდომა: ${data.error || 'ფაზის შეცვლა ვერ მოხერხდა'}`)
                          }
                        } catch (err) {
                          alert('შეცდომა ფაზის შეცვლისას')
                        }
                      }}
                    >
                      ✨ მზადება
                    </Button>
                  )}
                  {focusedLot.phase === 'BRIGHT' && (
                    <Button 
                      variant="primary"
                      onClick={async () => {
                        if (!confirm(`გადავიტანოთ ლოტი ${focusedLot.lotCode} დაფასოების ფაზაში?`)) return
                        try {
                          const res = await fetch('/api/lots/phase', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ lotId: focusedLot.lotId, phase: 'PACKAGING' })
                          })
                          if (res.ok) {
                            alert('ლოტი გადავიდა დაფასოების ფაზაში!')
                            window.location.reload()
                          } else {
                            const data = await res.json()
                            alert(`შეცდომა: ${data.error || 'ფაზის შეცვლა ვერ მოხერხდა'}`)
                          }
                        } catch (err) {
                          alert('შეცდომა ფაზის შეცვლისას')
                        }
                      }}
                    >
                      📦 დაფასოება
                    </Button>
                  )}
                  {focusedLot.phase === 'PACKAGING' && (
                    <div className="flex gap-2">
                      <Button 
                        variant="primary"
                        onClick={() => {
                          setSelectedSplitLot({
                            lotId: focusedLot.lotId,
                            lotCode: focusedLot.lotCode,
                            tankId: focusedLot.tankId,
                            tankName: focusedLot.tankName,
                            volume: focusedLot.volume,
                          })
                          setShowPackaging(true)
                        }}
                      >
                        📦 დაფასოვება
                      </Button>
                      <Button 
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={async () => {
                          if (!confirm(`დარწმუნებული ხართ რომ გინდათ ლოტის ${focusedLot.lotCode} დასრულება?`)) return
                          try {
                            const res = await fetch('/api/lots/phase', {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ lotId: focusedLot.lotId, status: 'COMPLETED' })
                            })
                            if (res.ok) {
                              alert('ლოტი დასრულებულია!')
                              window.location.reload()
                            } else {
                              const data = await res.json()
                              alert(`შეცდომა: ${data.error || 'ლოტის დასრულება ვერ მოხერხდა'}`)
                            }
                          } catch (err) {
                            alert('შეცდომა ლოტის დასრულებისას')
                          }
                        }}
                      >
                        ✅ დასრულება
                      </Button>
                    </div>
                  )}
                </>
              )}

              {/* ✅ BLEND LOT NOTICE - Hide phase controls for blend lot batches */}
              {batch.isPartOfBlendLot && batch.currentLotId && (
                <Button 
                  variant="secondary" 
                  onClick={() => router.push(`/lots/${batch.currentLotId}`)}
                  className="bg-purple-500/20 border-purple-500/50 text-purple-300 hover:bg-purple-500/30"
                >
                  🔗 ლოტის გვერდი ({batch.blendLotBatchCount} batch)
                </Button>
              )}

              {/* ✅ Hide all batch phase buttons when focused on specific lot */}
              {!focusedLot && (
                <>
                  {batch.status === 'planned' && (
                    <Button variant="primary" onClick={() => setShowStartBrewing(true)}>
                      🍺 ხარშვის დაწყება
                    </Button>
                  )}

                  {batch.status === 'brewing' && (
                    <Button variant="primary" onClick={handleStartFermentation}>
                      🧪 ფერმენტაციის დაწყება
                    </Button>
                  )}

                  {/* ✅ Hide conditioning button when batch is split OR part of blend lot */}
                  {batch.status === 'fermenting' && (!batch.splitTanks || batch.splitTanks.length <= 1) && !batch.isPartOfBlendLot && (
                    <Button variant="primary" onClick={handleTransferToConditioning}>
                      🔄 კონდიცირებაზე გადატანა
                    </Button>
                  )}

                  {/* ✅ Hide ready button when part of blend lot */}
                  {batch.status === 'conditioning' && !batch.isPartOfBlendLot && (
                    <Button variant="primary" onClick={handleMarkReady}>
                      ✅ მზადაა
                    </Button>
                  )}

                  {/* ✅ Hide packaging button when part of blend lot */}
                  {batch.status === 'ready' && (!batch.splitTanks || batch.splitTanks.length <= 1) && !batch.isPartOfBlendLot && (
                    <Button variant="primary" onClick={handleStartPackaging}>
                      📦 დაფასოება
                    </Button>
                  )}
                </>
              )}

              {/* ✅ Hide packaging controls when part of blend lot or when focused on specific lot */}
              {!focusedLot && batch.status === 'packaging' && (!batch.splitTanks || batch.splitTanks.length <= 1) && !batch.isPartOfBlendLot && (
                <div className="flex gap-2">
                  <Button variant="primary" onClick={handleStartPackaging}>
                    📦 დაფასოვება
                  </Button>
                  {(() => {
                    const totalVolume = batch.volume || 0
                    // ✅ Use packagedVolume from API response (not calculated from records)
                    const packagedVolume = batch.packagedVolume ?? packagingRecordsFiltered.reduce((sum, pr) => sum + (pr.volumeTotal || 0), 0)
                    const remainingVolume = totalVolume - packagedVolume
                    return (
                      <Button 
                        onClick={async () => {
                          if (remainingVolume > 0) {
                            if (!confirm(`დარჩენილია ${remainingVolume.toFixed(1)}L. დარწმუნებული ხართ რომ გინდათ დასრულება?`)) {
                              return
                            }
                          }
                          if (params.id && typeof params.id === 'string') {
                            console.log('[Complete Batch] Calling completeBatch API for:', params.id)
                            try {
                              await completeBatch({
                                batchId: params.id,
                              })
                              console.log('[Complete Batch] ✅ API call successful')
                              
                              // Refresh batch data from API
                              const refreshResponse = await fetch(`/api/batches/${params.id}`)
                              if (refreshResponse.ok) {
                                const refreshData = await refreshResponse.json()
                                const refreshedBatch = refreshData.batch || refreshData
                                console.log('[Complete Batch] Refreshed batch status:', refreshedBatch.status)
                                setBatch(prev => prev ? { 
                                  ...prev, 
                                  status: refreshedBatch.status?.toLowerCase() || 'completed',
                                  packagedVolume: refreshedBatch.packagedVolume ? Number(refreshedBatch.packagedVolume) : prev.packagedVolume || 0, // ✅ Update packagedVolume from API
                                  tank: { ...prev.tank, id: '', name: 'N/A' }
                                } : null)
                              }
                              alert('პარტია დასრულებულია!')
                            } catch (error) {
                              console.error('[Complete Batch] ❌ Error:', error)
                              alert('პარტიის დასრულება ვერ მოხერხდა. სცადეთ თავიდან.')
                            }
                          }
                        }}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        ✅ პარტიის დასრულება
                      </Button>
                    )
                  })()}
                </div>
              )}

            </div>

          </div>

        </CardBody>

      </Card>


      {/* ✅ BLEND LOT NOTICE - Show prominent notice when batch is part of blend */}
      {batch.isPartOfBlendLot && batch.currentLotId && (
        <Card className="mb-6 border-2 border-purple-500/50 bg-purple-500/10">
          <CardBody>
            <div className="p-4 text-center">
              <div className="text-purple-400 text-lg mb-2">
                🔗 ეს batch არის შერეული ლოტის ნაწილი
              </div>
              <p className="text-text-muted mb-4">
                ფაზების ცვლილება და დაფასოება ხდება ლოტის გვერდიდან
              </p>
              <Button 
                variant="primary"
                onClick={() => router.push(`/lots/${batch.currentLotId}`)}
                className="bg-purple-600 hover:bg-purple-700"
              >
                გადასვლა ლოტის გვერდზე: {batch.currentLotCode || 'LOT'}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Packaging Status (if packaging) - Hide for blend lot batches */}
      {batch.status === 'packaging' && (!batch.splitTanks || batch.splitTanks.length <= 1) && !batch.isPartOfBlendLot && (() => {
        const totalVolume = batch.volume || 0
        // ✅ Use packagedVolume from API response (not calculated from records)
        const packagedVolume = batch.packagedVolume ?? packagingRecordsFiltered.reduce((sum, pr) => sum + (pr.volumeTotal || 0), 0)
        // ✅ Clamp remaining volume to 0 minimum (can be negative for blend lot primary batches)
        const remainingVolume = Math.max(0, totalVolume - packagedVolume)
        // ✅ For blend lots, packaged volume may exceed individual batch volume
        const progressPercent = Math.min(100, totalVolume > 0 ? (packagedVolume / totalVolume) * 100 : 0)
        
        console.log('[Packaging Card] batch.packagedVolume:', batch.packagedVolume, 'records count:', packagingRecordsFiltered.length, 'calculated:', packagedVolume)
        
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
              </div>
            </CardBody>
          </Card>
        )
      })()}

      {/* Stats Cards - Matching Screenshot Design */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        {/* OG Card - Gold/Copper color */}
        <div className="bg-dark-800 rounded-2xl p-5 text-center">
          <div className="text-3xl font-bold text-copper-400 mb-1">
            {(batch.actualOG !== undefined && batch.actualOG !== null) ? formatGravity(batch.actualOG) : (batch.targetOG ? formatGravity(batch.targetOG) : '-')}
          </div>
          <div className="text-sm text-text-muted">OG (ფაქტ.)</div>
        </div>

        {/* SG Card - White color */}
        <div className="bg-dark-800 rounded-2xl p-5 text-center">
          <div className="text-3xl font-bold text-white mb-1">
            {(currentGravity !== undefined && currentGravity !== null) ? formatGravity(currentGravity) : (batch.currentGravity !== undefined && batch.currentGravity !== null) ? formatGravity(batch.currentGravity) : (batch.actualOG !== undefined && batch.actualOG !== null) ? formatGravity(batch.actualOG) : '-'}
          </div>
          <div className="text-sm text-text-muted">SG (მიმდ.)</div>
        </div>

        {/* FG Card - Green color */}
        <div className="bg-dark-800 rounded-2xl p-5 text-center">
          <div className="text-3xl font-bold text-green-400 mb-1">
            {batch.targetFG ? formatGravity(batch.targetFG) : '-'}
          </div>
          <div className="text-sm text-text-muted">FG (სამიზნე)</div>
        </div>

        {/* ABV Card - Yellow/Amber color */}
        <div className="bg-dark-800 rounded-2xl p-5 text-center">
          <div className="text-3xl font-bold text-amber-400 mb-1">
            {calculatedABV > 0 ? `${calculatedABV.toFixed(1)}%` : '0.0%'}
          </div>
          <div className="text-sm text-text-muted">ABV (მიმდ.)</div>
        </div>

        {/* Attenuation Card - White color */}
        <div className="bg-dark-800 rounded-2xl p-5 text-center">
          <div className="text-3xl font-bold text-white mb-1">
            {attenuation > 0 ? `${attenuation.toFixed(0)}%` : '0%'}
          </div>
          <div className="text-sm text-text-muted">ატენუაცია</div>
        </div>

        {/* Temperature Card - White color */}
        <div className="bg-dark-800 rounded-2xl p-5 text-center">
          <div className="text-3xl font-bold text-white mb-1">
            {currentTemperature !== null ? `${currentTemperature}°C` : '0°C'}
          </div>
          <div className="text-sm text-text-muted">ტემპერატურა</div>
        </div>
      </div>

      {/* ✅ Split Tanks Section - Show when batch is split across multiple tanks */}
      {batch.splitTanks && batch.splitTanks.length > 1 && !focusedLotId && (
        <Card className="mb-6">
          <CardBody>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              🔀 გაყოფილი ავზებში ({batch.splitTanks.length})
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {batch.splitTanks.map((tank, index) => (
                <div 
                  key={tank.lotId || index}
                  className="bg-gradient-to-br from-dark-700 to-dark-800 rounded-xl p-5 border border-dark-600 hover:border-copper-500/50 transition-all cursor-pointer"
                  onClick={() => router.push(`/production/${batch.id}?lotId=${tank.lotId}`)}
                >
                  {/* Tank Header */}
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xl font-bold text-white">ავზი {tank.tankName}</h4>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                      tank.status === 'COMPLETED' 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    }`}>
                      {tank.status === 'COMPLETED' ? '✓' : '🔄'} აქტიური
                      <span className="ml-1 font-bold">{tank.percentage}%</span>
                    </span>
                  </div>
                  
                  {/* Lot Code */}
                  <p className="text-xs text-text-muted font-mono mb-3 bg-dark-600/50 inline-block px-2 py-1 rounded">
                    {tank.lotCode}
                  </p>
                  
                  {/* Volume */}
                  <p className="text-2xl font-bold text-copper-400 mb-4">
                    {tank.volume && tank.volume > 0 ? `${tank.volume}L` : 
                     tank.percentage && batch.volume ? `${Math.round(batch.volume * tank.percentage / 100)}L` : '-'}
                  </p>

                  {/* Packaging Progress - only for PACKAGING phase */}
                  {tank.phase === 'PACKAGING' && (
                    <div className="mb-4 p-3 bg-dark-600/50 rounded-lg">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-text-muted">დაფასოვებული:</span>
                        <span className="text-green-400 font-bold">0.0L</span>
                      </div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-text-muted">დარჩენილი ავზში:</span>
                        <span className="text-amber-400 font-bold">{tank.volume || 0}L</span>
                      </div>
                      <div className="w-full bg-dark-500 rounded-full h-1.5">
                        <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '0%' }} />
                      </div>
                    </div>
                  )}
                  
                  {/* Progress Bar */}
                  <div className="mb-4">
                    {(() => {
                      // Calculate progress based on phase
                      const progress = tank.status === 'COMPLETED' ? 100
                        : tank.phase === 'FERMENTATION' ? 50
                        : tank.phase === 'CONDITIONING' ? 75
                        : tank.phase === 'BRIGHT' ? 90
                        : tank.phase === 'PACKAGING' ? 95
                        : 50
                      return (
                        <>
                          <div className="flex justify-between text-xs text-text-muted mb-1">
                            <span>პროგრესი</span>
                            <span>{progress}%</span>
                          </div>
                          <div className="w-full bg-dark-600 rounded-full h-2.5">
                            <div 
                              className="h-2.5 rounded-full transition-all bg-green-500"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </>
                      )
                    })()}
                  </div>
                  
                  {/* Phase Status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        tank.status === 'COMPLETED' ? 'bg-green-500' : 
                        tank.phase === 'FERMENTATION' ? 'bg-blue-500 animate-pulse' :
                        tank.phase === 'CONDITIONING' ? 'bg-cyan-500 animate-pulse' :
                        tank.phase === 'BRIGHT' ? 'bg-purple-500' :
                        tank.phase === 'PACKAGING' ? 'bg-amber-500' :
                        'bg-gray-500'
                      }`} />
                      <span className={`${
                        tank.status === 'COMPLETED' ? 'text-green-400' :
                        tank.phase === 'FERMENTATION' ? 'text-blue-400' :
                        tank.phase === 'CONDITIONING' ? 'text-cyan-400' :
                        tank.phase === 'BRIGHT' ? 'text-purple-400' :
                        tank.phase === 'PACKAGING' ? 'text-amber-400' :
                        'text-text-muted'
                      }`}>
                        {tank.status === 'COMPLETED' ? '✓ დასრულებული' :
                         tank.phase === 'FERMENTATION' ? '● ფერმენტაცია' : 
                         tank.phase === 'CONDITIONING' ? '● კონდიცირება' : 
                         tank.phase === 'BRIGHT' ? '● მზადაა' :
                         tank.phase === 'PACKAGING' ? '● დაფასოება' :
                         tank.phase}
                      </span>
                    </div>
                    
                    {/* ✅ Phase Change Buttons */}
                    {tank.status !== 'COMPLETED' && (
                      <div className="flex gap-2">
                        {/* FERMENTATION → CONDITIONING */}
                        {tank.phase === 'FERMENTATION' && (
                          <Button 
                            variant="primary" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedSplitLot({
                                lotId: tank.lotId,
                                lotCode: tank.lotCode,
                                tankId: tank.tankId,
                                tankName: tank.tankName,
                                volume: tank.volume,
                                tankType: tank.tankType,  // ✅ Added for Unitank detection
                              })
                              setShowConditioningModal(true)
                            }}
                          >
                            ❄️ კონდიცირება
                          </Button>
                        )}
                        
                        {/* CONDITIONING → BRIGHT */}
                        {tank.phase === 'CONDITIONING' && (
                          <button 
                            className="px-4 py-2 rounded-full bg-gradient-to-r from-amber-600 to-amber-400 text-white font-medium text-sm flex items-center gap-2 hover:from-amber-700 hover:to-amber-500 transition-all shadow-lg"
                            onClick={async (e) => {
                              e.stopPropagation()
                              if (!confirm(`გადავიტანოთ ლოტი ${tank.lotCode} Bright ფაზაში?`)) return
                              try {
                                const res = await fetch('/api/lots/phase', {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ lotId: tank.lotId, phase: 'BRIGHT' })
                                })
                                const data = await res.json()
                                if (res.ok) {
                                  alert('ლოტი გადავიდა Bright ფაზაში!')
                                  window.location.reload()
                                } else {
                                  alert(`შეცდომა: ${data.error || 'ფაზის შეცვლა ვერ მოხერხდა'}`)
                                }
                              } catch (err) {
                                console.error('Phase change error:', err)
                                alert('შეცდომა ფაზის შეცვლისას')
                              }
                            }}
                          >
                            <span className="text-yellow-300 text-lg leading-none">✨</span>
                            <span className="text-yellow-200 text-xs leading-none">✨</span>
                            <span>მზადება</span>
                          </button>
                        )}
                        
                        {/* BRIGHT → PACKAGING */}
                        {tank.phase === 'BRIGHT' && (
                          <button 
                            className="px-4 py-2 rounded-full bg-gradient-to-r from-amber-600 to-amber-400 text-white font-medium text-sm flex items-center gap-2 hover:from-amber-700 hover:to-amber-500 transition-all shadow-lg"
                            onClick={async (e) => {
                              e.stopPropagation()
                              if (!confirm(`გადავიტანოთ ლოტი ${tank.lotCode} დაფასოების ფაზაში?`)) return
                              try {
                                const res = await fetch('/api/lots/phase', {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ lotId: tank.lotId, phase: 'PACKAGING' })
                                })
                                const data = await res.json()
                                if (res.ok) {
                                  alert('ლოტი გადავიდა დაფასოების ფაზაში!')
                                  window.location.reload()
                                } else {
                                  alert(`შეცდომა: ${data.error || 'ფაზის შეცვლა ვერ მოხერხდა'}`)
                                }
                              } catch (err) {
                                console.error('Phase change error:', err)
                                alert('შეცდომა ფაზის შეცვლისას')
                              }
                            }}
                          >
                            <span>📦</span>
                            <span>დაფასოება</span>
                          </button>
                        )}
                        
                        {/* PACKAGING - დაფასოება და დასრულება */}
                        {tank.phase === 'PACKAGING' && (
                          <div className="flex gap-2">
                            <Button 
                              variant="secondary"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                // Set lot info for packaging modal
                                setSelectedSplitLot({
                                  lotId: tank.lotId,
                                  lotCode: tank.lotCode,
                                  tankId: tank.tankId,
                                  tankName: tank.tankName,
                                  volume: tank.volume,
                                })
                                setShowPackaging(true)
                              }}
                            >
                              📦 დაფასოება
                            </Button>
                            <Button 
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={async (e) => {
                                e.stopPropagation()
                                if (!confirm(`დარწმუნებული ხართ რომ გინდათ ლოტის ${tank.lotCode} დასრულება?`)) return
                                try {
                                  const res = await fetch('/api/lots/phase', {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ lotId: tank.lotId, status: 'COMPLETED' })
                                  })
                                  if (res.ok) {
                                    alert('ლოტი დასრულებულია!')
                                    window.location.reload()
                                  } else {
                                    const data = await res.json()
                                    alert(`შეცდომა: ${data.error || 'ლოტის დასრულება ვერ მოხერხდა'}`)
                                  }
                                } catch (err) {
                                  console.error(err)
                                  alert('შეცდომა ლოტის დასრულებისას')
                                }
                              }}
                            >
                              ✅ დასრულება
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Completed badge */}
                    {tank.status === 'COMPLETED' && (
                      <span className="text-green-400 text-sm font-medium">✓ დასრულებული</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* ✅ Focused Lot Section - Show single lot details when lotId param is present */}
      {focusedLot && (
        <>
          {/* ✅ Packaging Volume Card - Show when lot is in PACKAGING phase */}
          {focusedLot.phase === 'PACKAGING' && (
            <Card className="mb-6 border border-amber-500/30">
              <CardBody>
                {(() => {
                  const lotVolume = focusedLot.volume || Math.round(batch.volume * (focusedLot.percentage || 50) / 100)
                  
                  // ✅ Better debug log
                  const matchingRecords = packagingRecordsFiltered.filter(pr => pr.lotNumber === focusedLot.lotCode)
                  console.log('[Lot Packaging] Matching records for', focusedLot.lotCode, ':', matchingRecords.length, 'records')
                  console.log('[Lot Packaging] Record volumes:', matchingRecords.map(r => r.volumeTotal))
                  console.log('[Lot Packaging] Sum:', matchingRecords.reduce((sum, pr) => sum + (pr.volumeTotal || 0), 0))
                  console.log('[Lot Packaging] All records:', packagingRecordsFiltered.map(pr => ({ 
                    lotNumber: pr.lotNumber, 
                    volume: pr.volumeTotal 
                  })))
                  console.log('[Lot Packaging] Looking for lotCode:', focusedLot.lotCode)
                  console.log('[Lot Packaging] lotId:', focusedLot.lotId)
                  
                  // ✅ Filter by lotNumber matching lotCode (exact match)
                  // Each lot should only show ITS OWN packaged volume, not a proportion of total batch packaging
                  let lotPackagedVolume = matchingRecords.reduce((sum, pr) => sum + (pr.volumeTotal || 0), 0)
                  
                  const remainingVolume = Math.max(0, lotVolume - lotPackagedVolume)
                  const packagingProgress = lotVolume > 0 ? Math.round((lotPackagedVolume / lotVolume) * 100) : 0
                  
                  console.log('[Lot Packaging] Final result - lotId:', focusedLot.lotId, 'lotCode:', focusedLot.lotCode, 'volume:', lotVolume, 'packaged:', lotPackagedVolume, 'remaining:', remainingVolume)
                  
                  return (
                    <>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-text-muted">დაფასოვებული:</span>
                        <span className="text-green-400 font-bold text-lg">{lotPackagedVolume.toFixed(1)}L</span>
                      </div>
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-text-muted">დარჩენილი ავზში:</span>
                        <span className="text-amber-400 font-bold text-lg">{remainingVolume.toFixed(1)}L</span>
                      </div>
                      <div className="w-full bg-dark-600 rounded-full h-3">
                        <div 
                          className="h-3 rounded-full transition-all bg-gradient-to-r from-green-500 to-green-400"
                          style={{ width: `${packagingProgress}%` }}
                        />
                      </div>
                    </>
                  )
                })()}
              </CardBody>
            </Card>
          )}

          {/* Progress Card - Same design as batch progress */}
          <Card className="mb-6">
            <CardBody>
              {(() => {
                // Calculate lot progress and days
                const lotProgress = focusedLot.status === 'COMPLETED' ? 100
                  : focusedLot.phase === 'FERMENTATION' ? 40
                  : focusedLot.phase === 'CONDITIONING' ? 70
                  : focusedLot.phase === 'BRIGHT' ? 90
                  : focusedLot.phase === 'PACKAGING' ? 95
                  : 50
                
                const lotStartDate = batch.brewDate ? new Date(batch.brewDate) : new Date()
                const lotDaysInProcess = Math.floor((new Date().getTime() - lotStartDate.getTime()) / (1000 * 60 * 60 * 24))
                const lotEstimatedEndDate = batch.estimatedEndDate ? new Date(batch.estimatedEndDate) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
                const lotDaysRemaining = Math.max(0, Math.floor((lotEstimatedEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
                
                return (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm text-text-muted">პროგრესი</p>
                        <p className="text-lg font-bold">{lotProgress}% დასრულებული</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-text-muted">დარჩენილია</p>
                        <p className="text-lg font-bold">{lotDaysRemaining} დღე</p>
                      </div>
                    </div>

                    <ProgressBar value={lotProgress} color="copper" size="lg" />

                    <div className="flex justify-between mt-2 text-xs text-text-muted">
                      <span>დაწყება: {formatDate(lotStartDate)}</span>
                      <span>დღე {lotDaysInProcess}</span>
                      <span>სავარაუდო დასრულება: {formatDate(lotEstimatedEndDate)}</span>
                    </div>
                  </>
                )
              })()}
            </CardBody>
          </Card>
        </>
      )}

      {/* Progress Card - Hide for split batches */}
      {(!batch.splitTanks || batch.splitTanks.length <= 1) && (
      <Card className="mb-6">

        <CardBody>

          <div className="flex items-center justify-between mb-4">

            <div>

              <p className="text-sm text-text-muted">პროგრესი</p>

              <p className="text-lg font-bold">{batch.progress}% დასრულებული</p>

            </div>

            <div className="text-right">

              <p className="text-sm text-text-muted">დარჩენილია</p>

              <p className="text-lg font-bold">{daysRemaining} დღე</p>

            </div>

          </div>

          <ProgressBar value={batch.progress} color="copper" size="lg" />

          <div className="flex justify-between mt-2 text-xs text-text-muted">

            <span>დაწყება: {formatDate(batch.brewDate)}</span>

            <span>დღე {daysInFermentation}</span>

            <span>სავარაუდო დასრულება: {formatDate(batch.estimatedEndDate)}</span>

          </div>

        </CardBody>

      </Card>
      )}

      {/* Tabs */}

      <div className="flex gap-2 mb-6 border-b border-border">

        {[

          { key: 'overview', label: 'მიმოხილვა', icon: '📊' },

          { key: 'readings', label: 'გაზომვები', icon: '📈' },

          { key: 'timeline', label: 'ტაიმლაინი', icon: '📅' },

          { key: 'ingredients', label: 'ინგრედიენტები', icon: '🌾' },

        ].map(tab => (

          <button

            key={tab.key}

            onClick={() => setActiveTab(tab.key as typeof activeTab)}

            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${

              activeTab === tab.key

                ? 'border-copper text-copper-light'

                : 'border-transparent text-text-muted hover:text-text-primary'

            }`}

          >

            {tab.icon} {tab.label}

          </button>

        ))}

      </div>



      {/* Tab Content */}

      {activeTab === 'overview' && (

        <div className="grid grid-cols-3 gap-6">

          {/* Professional Fermentation Monitor */}

          <div className="col-span-2">

            <Card>

              <CardHeader>

                <div className="flex justify-between items-center">

                  <span>🍺 ფერმენტაციის მონიტორინგი</span>

                  <Button variant="ghost" size="sm" onClick={() => setShowAddReading(true)}>

                    + გაზომვა

                  </Button>

                </div>

              </CardHeader>

              <CardBody>

                {batch.gravityReadings.length > 0 ? (
                  <div className="space-y-6">
                    {/* Header Stats */}
                    {(() => {
                      const sortedReadings = [...batch.gravityReadings].sort((a: any, b: any) => 
                        new Date(b.date).getTime() - new Date(a.date).getTime()
                      )
                      const latest = sortedReadings[0]
                      const previous24h = sortedReadings.find((r: any) => {
                        const rTime = new Date(r.date).getTime()
                        const latestTime = new Date(latest.date).getTime()
                        return latestTime - rTime >= 24 * 60 * 60 * 1000
                      })
                      const delta24h = previous24h ? (latest.gravity || 0) - (previous24h.gravity || 0) : null
                      const og = actualOG || batch.targetOG || sortedReadings[sortedReadings.length - 1]?.gravity
                      const fg = latest.gravity
                      const abv = og && fg ? ((og - fg) * 131.25).toFixed(1) : null
                      const tempsWithValues = sortedReadings.filter((r: any) => r.temperature).map((r: any) => r.temperature)
                      const avgTemp = tempsWithValues.length > 0 ? tempsWithValues.reduce((sum: number, t: number) => sum + t, 0) / tempsWithValues.length : null
                      
                      return (
                        <div className="grid grid-cols-5 gap-4 pb-4 border-b border-border">
                          <div>
                            <p className="text-xs text-text-muted mb-1">მიმდინარე SG</p>
                            <p className="text-lg font-bold">{fg !== undefined && fg !== null ? formatGravity(fg) : '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-text-muted mb-1">Δ24სთ</p>
                            <p className={`text-lg font-bold ${delta24h !== null && delta24h < 0 ? 'text-green-400' : 'text-text-primary'}`}>
                              {delta24h !== null ? `${delta24h > 0 ? '+' : ''}${delta24h.toFixed(3)}` : '-'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-text-muted mb-1">ტემპერატურა</p>
                            <p className="text-lg font-bold">{avgTemp !== null ? `${avgTemp.toFixed(1)}°C` : latest.temperature ? `${latest.temperature}°C` : '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-text-muted mb-1">ABV%</p>
                            <p className="text-lg font-bold">{abv ? `${abv}%` : '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-text-muted mb-1">განახლება</p>
                            <p className="text-sm font-medium">{formatShortDate(latest.date)}</p>
                          </div>
                        </div>
                      )
                    })()}

                    {/* SG Chart */}
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="text-sm font-semibold">SG (სიმკვრივე)</h3>
                        <span className="text-xs text-text-muted">სამიზნე FG: {formatGravity(batch.targetFG)}</span>
                      </div>
                      {(() => {
                        const sortedReadings = [...batch.gravityReadings].sort((a: any, b: any) => 
                          new Date(a.date).getTime() - new Date(b.date).getTime()
                        ).slice(-20)
                        const og = actualOG || batch.targetOG || sortedReadings[0]?.gravity
                        const fg = sortedReadings[sortedReadings.length - 1]?.gravity
                        const gravities = sortedReadings.map((r: any) => r.gravity || 0)
                        const maxG = Math.max(...gravities, og || 0, batch.targetFG || 0)
                        const minG = Math.min(...gravities, fg || 0, batch.targetFG || 0)
                        const range = maxG - minG || 0.050
                        const padding = range * 0.1
                        const chartHeight = 200
                        const chartWidth = 600
                        const points = sortedReadings.map((r: any, i) => {
                          const x = (i / (sortedReadings.length - 1 || 1)) * (chartWidth - 80) + 40
                          const y = chartHeight - 40 - (((r.gravity || 0) - minG + padding) / (range + padding * 2)) * (chartHeight - 80)
                          return `${x},${y}`
                        }).join(' ')
                        
                        return (
                          <div className="relative">
                            <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="border border-border rounded">
                              {/* Grid lines */}
                              {[0, 1, 2, 3, 4].map(i => {
                                const y = 40 + (i / 4) * (chartHeight - 80)
                                const value = maxG + padding - (i / 4) * (range + padding * 2)
                                return (
                                  <g key={i}>
                                    <line x1="40" y1={y} x2={chartWidth - 40} y2={y} stroke="currentColor" strokeOpacity="0.1" strokeWidth="1" />
                                    <text x="35" y={y + 4} textAnchor="end" className="text-xs fill-text-muted">{value.toFixed(3)}</text>
                                  </g>
                                )
                              })}
                              
                              {/* Target FG line */}
                              {batch.targetFG && (
                                <line
                                  x1="40"
                                  y1={chartHeight - 40 - (((batch.targetFG - minG + padding) / (range + padding * 2)) * (chartHeight - 80))}
                                  x2={chartWidth - 40}
                                  y2={chartHeight - 40 - (((batch.targetFG - minG + padding) / (range + padding * 2)) * (chartHeight - 80))}
                                  stroke="#4ade80"
                                  strokeWidth="1.5"
                                  strokeDasharray="4 4"
                                />
                              )}
                              
                              {/* SG Line */}
                              <polyline
                                points={points}
                                fill="none"
                                stroke="rgb(219, 172, 111)"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              
                              {/* OG Marker */}
                              {og && (
                                <g>
                                  <circle cx="40" cy={chartHeight - 40 - (((og - minG + padding) / (range + padding * 2)) * (chartHeight - 80))} r="4" fill="#10b981" />
                                  <text x="50" y={chartHeight - 40 - (((og - minG + padding) / (range + padding * 2)) * (chartHeight - 80)) + 4} className="text-xs fill-green-400">OG {og.toFixed(3)} 🍺</text>
                                </g>
                              )}
                              
                              {/* FG Marker */}
                              {fg && sortedReadings.length > 0 && (
                                <g>
                                  <circle cx={chartWidth - 40} cy={chartHeight - 40 - (((fg - minG + padding) / (range + padding * 2)) * (chartHeight - 80))} r="4" fill="#3b82f6" />
                                  <text x={chartWidth - 90} y={chartHeight - 40 - (((fg - minG + padding) / (range + padding * 2)) * (chartHeight - 80)) + 4} className="text-xs fill-blue-400">FG {fg.toFixed(3)} ❄️</text>
                                </g>
                              )}
                              
                              {/* Data points */}
                              {sortedReadings.map((r: any, i) => {
                                const x = (i / (sortedReadings.length - 1 || 1)) * (chartWidth - 80) + 40
                                const y = chartHeight - 40 - (((r.gravity || 0) - minG + padding) / (range + padding * 2)) * (chartHeight - 80)
                                return (
                                  <circle key={i} cx={x} cy={y} r="3" fill="rgb(219, 172, 111)" />
                                )
                              })}
                            </svg>
                          </div>
                        )
                      })()}
                    </div>

                    {/* Temperature Chart */}
                    <div>
                      <h3 className="text-sm font-semibold mb-3">ტემპერატურა (°C)</h3>
                      {(() => {
                        const sortedReadings = [...batch.gravityReadings].filter((r: any) => r.temperature).sort((a: any, b: any) => 
                          new Date(a.date).getTime() - new Date(b.date).getTime()
                        ).slice(-20)
                        if (sortedReadings.length === 0) {
                          return <p className="text-text-muted text-sm">ტემპერატურის მონაცემები არ არის</p>
                        }
                        const temps = sortedReadings.map((r: any) => r.temperature || 0)
                        const maxT = Math.max(...temps)
                        const minT = Math.min(...temps)
                        const range = maxT - minT || 20
                        const padding = range * 0.1
                        const chartHeight = 150
                        const chartWidth = 600
                        const points = sortedReadings.map((r: any, i) => {
                          const x = (i / (sortedReadings.length - 1 || 1)) * (chartWidth - 80) + 40
                          const y = chartHeight - 40 - (((r.temperature || 0) - minT + padding) / (range + padding * 2)) * (chartHeight - 80)
                          return `${x},${y}`
                        }).join(' ')
                        
                        return (
                          <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="border border-border rounded">
                            {/* Grid */}
                            {[0, 1, 2].map(i => {
                              const y = 40 + (i / 2) * (chartHeight - 80)
                              const value = maxT + padding - (i / 2) * (range + padding * 2)
                              return (
                                <g key={i}>
                                  <line x1="40" y1={y} x2={chartWidth - 40} y2={y} stroke="currentColor" strokeOpacity="0.1" strokeWidth="1" />
                                  <text x="35" y={y + 4} textAnchor="end" className="text-xs fill-text-muted">{value.toFixed(0)}°C</text>
                                </g>
                              )
                            })}
                            
                            {/* Temperature Line */}
                            <polyline
                              points={points}
                              fill="none"
                              stroke="#3b82f6"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            
                            {/* Data points */}
                            {sortedReadings.map((r: any, i) => {
                              const x = (i / (sortedReadings.length - 1 || 1)) * (chartWidth - 80) + 40
                              const y = chartHeight - 40 - (((r.temperature || 0) - minT + padding) / (range + padding * 2)) * (chartHeight - 80)
                              return (
                                <circle key={i} cx={x} cy={y} r="3" fill="#3b82f6" />
                              )
                            })}
                          </svg>
                        )
                      })()}
                    </div>

                    {/* Timeline Legend */}
                    <div className="flex gap-4 text-sm pt-2 border-t border-border">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-green-500"></span>
                        <span className="text-text-muted">🍺 ფერმენტაცია (OG)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                        <span className="text-text-muted">❄️ კონდიცირება (FG)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-0.5 bg-green-400 border-dashed"></div>
                        <span className="text-text-muted">─ ─ სამიზნე FG</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-text-muted gap-4">
                    <p>გაზომვები არ არის</p>
                    <Button onClick={() => setShowAddReading(true)} variant="primary">
                      + გაზომვის დამატება
                    </Button>
                  </div>
                )}

              </CardBody>

            </Card>

          </div>



          {/* Side Info */}

          <div className="space-y-4">

            {/* Batch Info */}

            <Card>

              <CardHeader>📋 ინფორმაცია</CardHeader>

              <CardBody className="space-y-3">

                <div className="flex justify-between">

                  <span className="text-text-muted">ტექნოლოგი</span>

                  <span>{batch.brewer}</span>

                </div>

                <div className="flex justify-between">

                  <span className="text-text-muted">რეცეპტი</span>

                  <span className="text-copper-light">{batch.recipe.name}</span>

                </div>

                <div className="flex justify-between">

                  <span className="text-text-muted">ავზი</span>

                  <span>{batch.tank.name}</span>

                </div>

                <div className="flex justify-between">

                  <span className="text-text-muted">მოცულობა</span>

                  <span>{batch.volume} L</span>

                </div>

              </CardBody>

            </Card>



            {/* Targets */}

            <Card>

              <CardHeader>🎯 სამიზნეები</CardHeader>

              <CardBody className="space-y-3">

                <div className="flex justify-between">

                  <span className="text-text-muted">OG</span>

                  <span className="font-mono">{formatGravity(batch.targetOG)}</span>

                </div>

                <div className="flex justify-between">

                  <span className="text-text-muted">FG</span>

                  <span className="font-mono">{formatGravity(batch.targetFG)}</span>

                </div>

                <div className="flex justify-between">

                  <span className="text-text-muted">ABV</span>

                  <span className="font-mono">{batch.targetABV.toFixed(1)}%</span>

                </div>

              </CardBody>

            </Card>



            {/* Notes */}

            {batch.notes && (

              <Card>

                <CardHeader>📝 შენიშვნები</CardHeader>

                <CardBody>

                  <p className="text-sm text-text-secondary">{batch.notes}</p>

                </CardBody>

              </Card>

            )}

          </div>

        </div>

      )}



      {activeTab === 'readings' && (
        <>
        <Card>

          <CardHeader>

            <div className="flex justify-between items-center">

              <span>📊 გაზომვების ისტორია</span>

              <Button variant="primary" size="sm" onClick={() => setShowAddReading(true)}>

                + ახალი გაზომვა

              </Button>

            </div>

          </CardHeader>

          <CardBody>
            {batch.gravityReadings && batch.gravityReadings.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left text-sm text-text-muted">
                    <th className="pb-3">თარიღი</th>
                    <th className="pb-3">სიმკვრივე (SG)</th>
                    <th className="pb-3">ტემპერატურა</th>
                    <th className="pb-3">ABV</th>
                    <th className="pb-3">შენიშვნა</th>
                    <th className="pb-3">ჩამწერი</th>
                  </tr>
                </thead>
                <tbody>
                  {[...batch.gravityReadings]
                    .filter(r => r.gravity != null && r.gravity !== 0)
                    .reverse()
                    .map((reading, i, arr) => {
                      // ✅ FIX: Show "-" for OG reading (first chronological reading)
                      const isOGReading = i === 0 || reading.notes?.includes('OG') || reading.notes?.includes('საწყისი')
                      const abv = !isOGReading && batch.actualOG && reading.gravity < batch.actualOG
                        ? ((batch.actualOG - reading.gravity) * 131.25).toFixed(1)
                        : '-'
                      return (
                        <tr key={reading.id} className="border-b border-border/50">
                          <td className="py-3">
                            <p>{formatDate(reading.date)}</p>
                            <p className="text-xs text-text-muted">
                              {formatTime(reading.date)}
                            </p>
                          </td>
                          <td className="py-3 font-mono text-lg">{formatGravity(reading.gravity)}</td>
                          <td className="py-3 font-mono">{reading.temperature}°C</td>
                          <td className="py-3 font-mono text-copper-light">{abv}%</td>
                          <td className="py-3 text-sm text-text-muted">{reading.notes || '-'}</td>
                          <td className="py-3 text-sm">{reading.recordedBy}</td>
                        </tr>
                      )
                    })}
                  {/* ✅ Show conditioning start from timeline if no FG reading exists */}
                  {batch.timeline?.find((e: any) => e.type === 'CONDITIONING_STARTED') && 
                   !batch.gravityReadings.some((r: any) => r.notes?.includes('კონდიცირება') || r.notes?.includes('კონდიცირება') || r.notes?.includes('FG') || r.notes?.includes('საბოლოო')) && (
                    <tr className="border-b border-border/50 bg-blue-900/20">
                      <td className="py-3">
                        <p>{formatDate(batch.timeline.find((e: any) => e.type === 'CONDITIONING_STARTED')?.date)}</p>
                      </td>
                      <td className="py-3 font-mono text-lg text-text-muted">-</td>
                      <td className="py-3 font-mono text-text-muted">-</td>
                      <td className="py-3 font-mono text-text-muted">-</td>
                      <td className="py-3 text-sm text-blue-400">❄️ კონდიცირება დაიწყო</td>
                      <td className="py-3 text-sm">-</td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <p className="text-text-muted text-center py-8">გაზომვები არ არის</p>
            )}
          </CardBody>

        </Card>

        {/* QC Tests Section */}
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
            {batch.qcTests && batch.qcTests.length > 0 ? (
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
                  {batch.qcTests.map((test: any) => {
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
                    const testName = testNames[test.testType] || test.testType
                    return (
                      <tr key={test.id} className="border-b border-border/50">
                        <td className="py-3">
                          <p>{formatDate(test.completedDate || test.scheduledDate)}</p>
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
        </>
      )}



      {/* Timeline Tab */}
      {activeTab === 'timeline' && (
        <Card>
          <CardBody>
            {batch.timeline && batch.timeline.length > 0 ? (
              <div className="space-y-4">
                {batch.timeline.map((event: any, idx: number) => {
                  const eventIcons: Record<string, string> = {
                    'BATCH_CREATED': '📝',
                    'BREWING_STARTED': '🍺',
                    'FERMENTATION_STARTED': '🧪',
                    'CONDITIONING_STARTED': '❄️',
                    'MARKED_READY': '✅',
                    'PACKAGING_STARTED': '📦',
                    'BATCH_COMPLETED': '🎉',
                    'GRAVITY_READING': '📊',
                    'TEMPERATURE_READING': '🌡️',
                    'NOTE': '📌',
                  }
                  
                  return (
                    <div key={idx} className="flex gap-4 items-start">
                      <div className="text-2xl">{eventIcons[event.type] || '📌'}</div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h4 className="font-semibold">{event.title}</h4>
                          <span className="text-sm text-text-muted">
                            {formatDate(event.createdAt || event.date)}
                          </span>
                        </div>
                        {event.description && (
                          <p className="text-text-muted text-sm mt-1">{event.description}</p>
                        )}
                        {event.data && (
                          <div className="text-xs text-text-muted mt-1 bg-dark-800 p-2 rounded">
                            {event.data.gravity && <span>SG: {event.data.gravity} </span>}
                            {event.data.temperature && <span>🌡️ {event.data.temperature}°C </span>}
                            {event.data.tankId && <span>ავზი: {event.data.tankName || event.data.tankId}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-text-muted text-center py-8">ისტორია არ არის</p>
            )}
          </CardBody>
        </Card>
      )}



      {/* Ingredients Tab */}
      {activeTab === 'ingredients' && (
        <Card>
          <CardBody>
            {(batch.recipe?.ingredients && batch.recipe.ingredients.length > 0) ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* 🌾 ალაო Column */}
                <div className="bg-dark-800 rounded-xl p-4">
                  <h4 className="font-semibold text-copper-light mb-4 text-lg">🌾 ალაო</h4>
                  <div className="space-y-3">
                    {batch.recipe.ingredients
                      .filter((ing: any) => ['MALT', 'GRAIN'].includes(ing.category?.toUpperCase()))
                      .map((ing: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center py-2 border-b border-dark-700 last:border-0">
                          <span className="font-medium">{ing.name}</span>
                          <span className="text-text-muted">{ing.amount} {ing.unit}</span>
                        </div>
                      ))}
                    {batch.recipe.ingredients.filter((ing: any) => 
                      ['MALT', 'GRAIN'].includes(ing.category?.toUpperCase())
                    ).length === 0 && (
                      <p className="text-text-muted text-sm text-center py-4">არ არის</p>
                    )}
                  </div>
                </div>

                {/* 🌿 სვია Column */}
                <div className="bg-dark-800 rounded-xl p-4">
                  <h4 className="font-semibold text-copper-light mb-4 text-lg">🌿 სვია</h4>
                  <div className="space-y-3">
                    {batch.recipe.ingredients
                      .filter((ing: any) => ['HOP', 'HOPS'].includes(ing.category?.toUpperCase()))
                      .map((ing: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center py-2 border-b border-dark-700 last:border-0">
                          <div>
                            <span className="font-medium">{ing.name}</span>
                            {ing.useTime && (
                              <span className="text-xs text-text-muted ml-2">@ {ing.useTime} წთ</span>
                            )}
                          </div>
                          <span className="text-text-muted">{ing.amount} {ing.unit}</span>
                        </div>
                      ))}
                    {batch.recipe.ingredients.filter((ing: any) => 
                      ['HOP', 'HOPS'].includes(ing.category?.toUpperCase())
                    ).length === 0 && (
                      <p className="text-text-muted text-sm text-center py-4">არ არის</p>
                    )}
                  </div>
                </div>

                {/* 🧫 საფუარი Column */}
                <div className="bg-dark-800 rounded-xl p-4">
                  <h4 className="font-semibold text-copper-light mb-4 text-lg">🧫 საფუარი</h4>
                  <div className="space-y-3">
                    {batch.recipe.ingredients
                      .filter((ing: any) => ing.category?.toUpperCase() === 'YEAST')
                      .map((ing: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center py-2 border-b border-dark-700 last:border-0">
                          <span className="font-medium">{ing.name}</span>
                          <span className="text-text-muted">{ing.amount} {ing.unit}</span>
                        </div>
                      ))}
                    {batch.recipe.ingredients.filter((ing: any) => 
                      ing.category?.toUpperCase() === 'YEAST'
                    ).length === 0 && (
                      <p className="text-text-muted text-sm text-center py-4">არ არის</p>
                    )}
                  </div>
                </div>

              </div>
            ) : (
              <p className="text-text-muted text-center py-8">ინგრედიენტები არ არის</p>
            )}
          </CardBody>
        </Card>
      )}



      {/* Add Reading Modal */}

      {showAddReading && (

        <div className="fixed inset-0 z-50 flex items-center justify-center">

          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowAddReading(false)} />

          <div className="relative bg-bg-secondary border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">

            <div className="px-6 py-4 border-b border-border">

              <h3 className="text-lg font-display font-semibold">ახალი გაზომვა</h3>

            </div>

            <div className="p-6 space-y-4">

              <div>

                <label className="block text-sm font-medium mb-2">
                  სიმკვრივე
                  {getGravityUnit() === 'Plato' && ' (°P)'}
                  {getGravityUnit() === 'Brix' && ' (°Bx)'}
                  {getGravityUnit() === 'SG' && ' (SG)'}
                  {' *'}
                </label>

                <input

                  type="number"

                  step={getGravityUnit() === 'SG' ? '0.001' : '0.1'}
                  min={getGravityUnit() === 'SG' ? '1.000' : '0'}
                  max={getGravityUnit() === 'SG' ? '1.200' : '35'}

                  value={displayGravity}

                  onChange={(e) => handleGravityChange(e.target.value)}

                  placeholder={getGravityUnit() === 'SG' ? '1.012' : getGravityUnit() === 'Plato' ? '3.1' : '3.1'}

                  className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl font-mono focus:border-copper focus:outline-none"

                />

              </div>

              <div>

                <label className="block text-sm font-medium mb-2">ტემპერატურა (°C) *</label>

                <input

                  type="number"

                  step="0.1"

                  value={newReading.temperature}

                  onChange={(e) => setNewReading(prev => ({ ...prev, temperature: e.target.value }))}

                  placeholder="12.0"

                  className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl font-mono focus:border-copper focus:outline-none"

                />

              </div>

              <div>

                <label className="block text-sm font-medium mb-2">შენიშვნა</label>

                <input

                  type="text"

                  value={newReading.notes}

                  onChange={(e) => setNewReading(prev => ({ ...prev, notes: e.target.value }))}

                  placeholder="არასავალდებულო..."

                  className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl focus:border-copper focus:outline-none"

                />

              </div>

            </div>

            <div className="px-6 py-4 border-t border-border flex justify-end gap-3">

              <Button variant="secondary" onClick={() => setShowAddReading(false)}>გაუქმება</Button>

              <Button variant="primary" onClick={handleAddReading}>შენახვა</Button>

            </div>

          </div>

        </div>

      )}



      {/* Start Brewing Modal */}

      <StartBrewingModal

        isOpen={showStartBrewing}

        onClose={() => setShowStartBrewing(false)}

        onConfirm={handleStartBrewing}

        batchNumber={batch.batchNumber}

        recipeName={batch.recipe.name}

        recipeIngredients={recipeIngredientsWithStock}

      />



      {/* Packaging Modal */}

      {batch && (

        <PackagingModal

          isOpen={showPackaging}

          onClose={() => {
            setShowPackaging(false)
            setSelectedSplitLot(null)
          }}

          onComplete={async (packagingData) => {
            console.log('Packaging completed:', packagingData)
            
            // ✅ FIX: Close modal first
            setShowPackaging(false)
            
            // ✅ Force refresh batch data to get updated packaging records BEFORE alert
            if (params.id && batch) {
              try {
                const response = await fetch(`/api/batches/${batch.id}`)
                if (response.ok) {
                  const data = await response.json()
                  const refreshedBatch = data.batch || data
                  
                  console.log('[Packaging Refresh] API batch packagedVolume:', refreshedBatch?.packagedVolume, 'type:', typeof refreshedBatch?.packagedVolume)
                  
                  // ✅ Update packaging records
                  if (refreshedBatch.packagingRuns) {
                    const packagingRecords = refreshedBatch.packagingRuns.map((pr: any) => ({
                      id: pr.id,
                      batchId: pr.batchId || refreshedBatch.id,
                      lotId: pr.lotId, // ✅ Include lotId
                      lotNumber: pr.lotNumber, // ✅ Include lotNumber (lotCode like "COND-...-A")
                      packageType: pr.packageType || 'KEG_50',
                      quantity: pr.quantity || 0,
                      volumeTotal: pr.volumeTotal ? Number(pr.volumeTotal) : 0,
                      performedAt: pr.performedAt ? new Date(pr.performedAt) : new Date(),
                      performedBy: pr.performedBy || '',
                    }))
                    setApiPackagingRecords(packagingRecords)
                    console.log('[Packaging Refresh] Updated records count:', packagingRecords.length, 'totalVolume:', packagingRecords.reduce((sum: number, pr: any) => sum + pr.volumeTotal, 0))
                    console.log('[Packaging Refresh] Packaging records with lotNumbers:', 
                      packagingRecords.map((pr: any) => ({ lotNumber: pr.lotNumber, volume: pr.volumeTotal })))
                  }
                  
                  // Update batch state
                  setBatch(prev => prev ? {
                    ...prev,
                    status: refreshedBatch.status?.toLowerCase() || prev.status,
                    packagedVolume: refreshedBatch.packagedVolume ? Number(refreshedBatch.packagedVolume) : prev.packagedVolume || 0, // ✅ Update packagedVolume from API
                  } : null)
                }
              } catch (error) {
                console.error('[Packaging Refresh] Error:', error)
              }
            }
            
            // ✅ FIX: Show alert AFTER state update
            alert('დაფასოვება დამატებულია!')
          }}

          batchId={batch.id}

          batchNumber={selectedSplitLot?.lotCode || batch.batchNumber}

          recipeName={batch.recipe.name}

          availableLiters={batch.volume - apiPackagingRecords.reduce((sum, pr) => sum + (pr.volumeTotal || 0), 0)}

          lotId={(() => {
            if (selectedSplitLot && typeof selectedSplitLot === 'object' && selectedSplitLot !== null && 'lotId' in selectedSplitLot) {
              return (selectedSplitLot as { lotId: string }).lotId
            }
            if (focusedLot && typeof focusedLot === 'object' && focusedLot !== null && 'lotId' in focusedLot) {
              return focusedLot.lotId
            }
            return ''
          })()}

          lotCode={(() => {
            if (selectedSplitLot && typeof selectedSplitLot === 'object' && selectedSplitLot !== null && 'lotCode' in selectedSplitLot) {
              return (selectedSplitLot as { lotCode: string }).lotCode
            }
            if (focusedLot && typeof focusedLot === 'object' && focusedLot !== null && 'lotCode' in focusedLot) {
              return focusedLot.lotCode
            }
            return ''
          })()}

        />

      )}

      {/* Edit Batch Modal */}
      {batch && (
        <EditBatchModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSubmit={async (data) => {
            try {
              const response = await fetch(`/api/batches/${batch.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  volume: data.volume,
                  targetOg: data.targetOG,
                  targetFg: data.targetFG,
                  notes: data.notes,
                  brewer: data.brewer,
                }),
              })
              
              if (response.ok) {
                // Refresh batch data
                const fetchResponse = await fetch(`/api/batches/${batch.id}`)
                if (fetchResponse.ok) {
                  const fetchData = await fetchResponse.json()
                  const apiBatch = fetchData.batch || fetchData
                  
                  // Update local state with new data
                  if (apiBatch) {
                    const tankEquipment = apiBatch.tankId || apiBatch.equipmentId 
                      ? allEquipment.find(eq => eq.id === (apiBatch.tankId || apiBatch.equipmentId))
                      : null
                    const tankName = apiBatch.tank?.name || tankEquipment?.name || '-'
                    
                    const brewDate = apiBatch.brewedAt 
                      ? new Date(apiBatch.brewedAt)
                      : apiBatch.plannedDate 
                      ? new Date(apiBatch.plannedDate)
                      : apiBatch.createdAt 
                      ? new Date(apiBatch.createdAt)
                      : new Date()
                    
                    const estimatedEndDate = apiBatch.completedAt
                      ? new Date(apiBatch.completedAt)
                      : (() => {
                          const end = new Date(brewDate)
                          end.setDate(end.getDate() + 14)
                          return end
                        })()
                    
                    setBatch({
                      ...batch,
                      volume: apiBatch.volume ? Number(apiBatch.volume) : 0,
                      targetOG: apiBatch.targetOg ? Number(apiBatch.targetOg) : 0,
                      targetFG: 0, // targetFg doesn't exist in schema
                      targetABV: apiBatch.targetOg 
                        ? ((Number(apiBatch.targetOg) - 1.010) * 131.25)
                        : 0,
                      notes: apiBatch.notes || '',
                      brewer: apiBatch.brewerName || apiBatch.createdBy,
                    })
                  }
                }
                setShowEditModal(false)
                alert('პარტია განახლდა!')
              } else {
                const error = await response.json()
                alert(`შეცდომა: ${error.error?.message || 'პარტიის განახლება ვერ მოხერხდა'}`)
              }
            } catch (error) {
              console.error('Failed to update batch:', error)
              alert('შეცდომა პარტიის განახლებისას')
            }
          }}
          onDelete={() => handleDeleteBatch(params.id as string)}
          batch={{
            id: batch.id,
            batchNumber: batch.batchNumber,
            volume: batch.volume,
            targetOG: batch.targetOG,
            targetFG: batch.targetFG,
            notes: batch.notes,
            brewer: batch.brewer,
          }}
        />
      )}

      {/* Batch Report Modal */}
      {batch && (
        <BatchReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          batch={{
            id: batch.id,
            batchNumber: batch.batchNumber,
            recipe: batch.recipe,
            status: batch.status,
            tank: batch.tank,
            volume: batch.volume,
            brewDate: batch.brewDate,
            targetOG: batch.targetOG,
            targetFG: batch.targetFG,
            targetABV: batch.targetABV,
            actualOG: batch.actualOG,
            currentGravity: batch.currentGravity,
            currentABV: batch.actualABV,
            progress: batch.progress,
            notes: batch.notes,
            brewer: batch.brewer,
            timeline: batch.timeline,
          }}
          gravityReadings={batch.gravityReadings}
          ingredients={batch.ingredients.map((ing, idx) => ({ ...ing, id: ing.name + idx }))}
          packagingRecords={packagingRecordsFiltered}
          qcTests={batch.qcTests || []}
        />
      )}

      {/* Start Fermentation Modal V2 */}
      {batch && (
        <StartFermentationModalV2
          batchId={batch.id}
          batchNumber={batch.batchNumber}
          recipeName={batch.recipe.name}
          recipeVolume={batch.volume || 100}
          isOpen={showFermentationModal}
          onClose={() => setShowFermentationModal(false)}
          onComplete={handleFermentationComplete}
        />
      )}

      {/* Transfer to Conditioning Modal V2 */}
      {batch && (
        <TransferToConditioningModalV2
          batchId={batch.id}
          batchNumber={batch.batchNumber}
          recipeName={batch.recipe.name}
          currentVolume={selectedSplitLot?.volume || batch.volume || 100}
          currentTankType={
            selectedSplitLot?.tankType ||
            (batch as any).resolvedTankType ||
            (batch as any).currentTank?.type ||
            batch.tank?.type ||
            batch.splitTanks?.find((t: any) => t.phase === 'FERMENTATION')?.tankType
          }
          // ✅ Use fermentation lot ID from splitTanks when no specific lot selected
          currentLotId={
            selectedSplitLot?.lotId || 
            batch.splitTanks?.find(t => t.phase === 'FERMENTATION')?.lotId
          }
          isOpen={showConditioningModal}
          // ✅ Pass split lot info if available
          splitLotInfo={selectedSplitLot}
          onClose={() => {
            setShowConditioningModal(false)
            setSelectedSplitLot(null)
          }}
          onComplete={handleConditioningComplete}
        />
      )}

    </DashboardLayout>

  )

}