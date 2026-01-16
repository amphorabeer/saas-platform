'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout'
import { Card, CardHeader, CardBody, ProgressBar } from '@/components/ui'
import { LineChart } from '@/components/reports'

interface DashboardStats {
  activeBatches: number
  monthlyProduction: number
  fermentingNow: number
  conditioningNow: number
  readyToPackage: number
  lowStockItems: number
}

interface ActiveBatch {
  id: string
  batchNumber: string
  recipeName: string
  status: string
  tankName: string | null
  volume: number
  progress: number
  isBlend?: boolean
  isSplit?: boolean
  currentLot?: {
    id: string
    batchCount: number
  }
  isGrouped?: boolean
  groupCount?: number
}

interface Tank {
  id: string
  name: string
  type: string
  status: string
  statusText: string
  capacity: number
  currentBatchId: string | null
  batchNumber?: string | null
  recipeName?: string | null
  fill: number
  temp: number | null
  needsCIP?: boolean
}

interface LowStockItem {
  id: string
  name: string
  balance: number
  reorderPoint: number
}

interface MonthlyData {
  month: string
  production: number
  orders: number
}

const STATUS_LABELS: Record<string, string> = {
  PLANNED: 'დაგეგმილი',
  BREWING: 'მზადდება',
  FERMENTING: 'ფერმენტაცია',
  CONDITIONING: 'კონდიცირება',
  READY: 'მზადაა',
  PACKAGING: 'ჩამოსხმა',
  COMPLETED: 'დასრულებული',
}

const STATUS_COLORS: Record<string, string> = {
  PLANNED: 'bg-gray-500',
  BREWING: 'bg-amber-500',
  FERMENTING: 'bg-green-500',
  CONDITIONING: 'bg-blue-500',
  READY: 'bg-teal-500',
  PACKAGING: 'bg-purple-500',
  COMPLETED: 'bg-gray-400',
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    activeBatches: 0,
    monthlyProduction: 0,
    fermentingNow: 0,
    conditioningNow: 0,
    readyToPackage: 0,
    lowStockItems: 0,
  })
  const [batches, setBatches] = useState<ActiveBatch[]>([])
  const [tanks, setTanks] = useState<Tank[]>([])
  const [fermentationTanks, setFermentationTanks] = useState<Tank[]>([])
  const [conditioningTanks, setConditioningTanks] = useState<Tank[]>([])
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([])
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [readyProducts, setReadyProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch batches
      const batchesRes = await fetch('/api/batches?limit=50')
      const batchesData = batchesRes.ok ? await batchesRes.json() : { batches: [] }
      
      // ✅ Fetch equipment (not tanks) - has NEEDS_CIP status
      const equipmentRes = await fetch('/api/equipment')
      let tanksData: any = { tanks: [] }
      if (equipmentRes.ok) {
        const rawData = await equipmentRes.json()
        // Equipment API returns array directly
        if (Array.isArray(rawData)) {
          tanksData = { tanks: rawData }
        } else if (rawData.equipment) {
          tanksData = { tanks: rawData.equipment }
        } else if (rawData.data) {
          tanksData = { tanks: rawData.data }
        } else {
          tanksData = { tanks: [] }
        }
      }
      console.log('Equipment data:', tanksData)

      // Fetch inventory for low stock
      const inventoryRes = await fetch('/api/inventory')
      const inventoryData = inventoryRes.ok ? await inventoryRes.json() : { items: [] }
      
      // Fetch orders for chart
      const ordersRes = await fetch('/api/orders?limit=200')
      const ordersData = ordersRes.ok ? await ordersRes.json() : { orders: [] }
      
      // ✅ Fetch products for ready products display
      const productsRes = await fetch('/api/products?availableOnly=true')
      const productsData = productsRes.ok ? await productsRes.json() : { products: [] }

      // Process batches
      const allBatches = batchesData.batches || []
      const activeBatchList = allBatches.filter((b: any) => 
        !['COMPLETED', 'CANCELLED'].includes(b.status)
      )
      
      // Fetch latest readings for active batches to get real temperature
      const batchesWithTemp = await Promise.all(
        activeBatchList.map(async (batch: any) => {
          if (['FERMENTING', 'CONDITIONING', 'BREWING', 'PACKAGING', 'READY'].includes(batch.status)) {
            try {
              const batchDetailRes = await fetch(`/api/batches/${batch.id}`)
              if (batchDetailRes.ok) {
                const batchDetail = await batchDetailRes.json()
                // API returns { batch: { ... } } format
                const batchData = batchDetail.batch || batchDetail
                const gravityReadings = batchData.gravityReadings || []
                const latestReading = gravityReadings[0]
                
                console.log(`[TEMP_FETCH] Batch ${batch.batchNumber}:`, {
                  hasReadings: gravityReadings.length > 0,
                  latestReading: latestReading ? {
                    temperature: latestReading.temperature,
                    temp: latestReading.temp,
                    gravity: latestReading.gravity,
                  } : null,
                })
                
                if (latestReading) {
                  const temp = latestReading.temperature !== undefined && latestReading.temperature !== null
                    ? Number(latestReading.temperature)
                    : latestReading.temp !== undefined && latestReading.temp !== null
                      ? Number(latestReading.temp)
                      : null
                  
                  return {
                    ...batch,
                    currentTemp: temp,
                    latestSG: latestReading.gravity || latestReading.sg || null,
                  }
                }
              }
            } catch (e) {
              console.error('Failed to fetch readings for batch:', batch.id, e)
            }
          }
          return batch
        })
      )
      
      // Calculate progress for each batch
      const batchesWithProgress = batchesWithTemp.map((b: any) => {
        let progress = 0
        switch (b.status) {
          case 'PLANNED': progress = 10; break
          case 'BREWING': progress = 30; break
          case 'FERMENTING': progress = 50; break
          case 'CONDITIONING': progress = 75; break
          case 'READY': progress = 90; break
          case 'PACKAGING': progress = 95; break
          default: progress = 0
        }
        
        // ✅ FIX: Use API fields directly
        // isSplit = batch is in multiple lots (API sets this)
        const isSplit = Boolean(b.isSplit || b.allLots?.length > 1)
        
        // isBlend = lot contains multiple batches (check batchCount from any lot)
        const isBlend = Boolean(
          b.currentLot?.batchCount > 1 ||
          b.allLots?.some((lot: any) => lot.batchCount > 1) ||
          b.currentLot?.isBlendResult
        )
        
        // Debug logging
        console.log(`[DASHBOARD] ${b.batchNumber}: isSplit=${isSplit} (allLots=${b.allLots?.length}), isBlend=${isBlend} (batchCount=${b.currentLot?.batchCount})`)
        
        return { ...b, progress, isBlend, isSplit }
      })

      setBatches(batchesWithProgress.slice(0, 6))

      // Process tanks - separate fermentation and conditioning tanks
      const allTanks = tanksData.tanks || []
      console.log('All equipment/tanks:', allTanks.map((t: any) => ({
        name: t.name,
        type: t.type,
        status: t.status,  // ✅ This should show NEEDS_CIP for tanks that need cleaning
        nextCIP: t.nextCIP,
        currentBatchNumber: t.currentBatchNumber,
        tankAssignments: t.tankAssignments?.length || 0,
        activeAssignment: t.tankAssignments?.find((ta: any) => ta.status === 'ACTIVE'),
      })))

      const processTank = (t: any) => {
        // ✅ Check equipment status FIRST
        const eqStatus = (t.status || '').toUpperCase()
        const needsCIPFromStatus = eqStatus === 'NEEDS_CIP' || eqStatus === 'CLEANING' || eqStatus === 'CIP'
        
        // ✅ Check tankAssignments from equipment API
        const activeAssignment = (t.tankAssignments || []).find((ta: any) => 
          ta.status === 'ACTIVE'
        )
        
        // Find batch assigned to this tank - but ONLY if tank doesn't need CIP
        // If tank needs CIP, the batch has moved on even if currentBatchNumber is still set
        let batch = null
        
        if (!needsCIPFromStatus) {
          // 1. Direct tankId/tankName match
          batch = batchesWithTemp.find((b: any) => b.tankId === t.id || b.tankName === t.name)
          
          // 2. Via lot assignments (split batches)
          if (!batch) {
            batch = batchesWithTemp.find((b: any) => {
              const lots = b.allLots || []
              return lots.some((lot: any) => 
                lot.tank?.id === t.id || lot.tank?.name === t.name
              )
            })
          }
          
          // 3. Via equipment's currentBatchNumber (only if no CIP needed)
          if (!batch && t.currentBatchNumber) {
            batch = batchesWithTemp.find((b: any) => b.batchNumber === t.currentBatchNumber)
          }
          if (!batch && t.currentBatchId) {
            batch = batchesWithTemp.find((b: any) => b.id === t.currentBatchId)
          }
        }
        
        // ✅ Get batch info from active assignment if not found directly
        let batchNumber = batch?.batchNumber || null
        let batchStatus = batch?.status || null
        let volume = batch ? Number(batch.volume || 0) : 0
        
        if (!batch && activeAssignment) {
          const lotBatches = activeAssignment.lot?.lotBatches || []
          if (lotBatches.length > 0) {
            const lotBatch = lotBatches[0]?.Batch
            batchNumber = lotBatch?.batchNumber || activeAssignment.lot?.lotCode || null
            batchStatus = lotBatch?.status || null
            volume = Number(lotBatch?.volume || activeAssignment.plannedVolume || 0)
          }
        }
        
        // Debug
        console.log(`[TANK_BATCH] ${t.name}: eqStatus=${eqStatus}, needsCIP=${needsCIPFromStatus}, batch=${batchNumber}, activeAssignment=${!!activeAssignment}`)
        
        // Calculate fill percentage
        const capacity = Number(t.capacity || 1000)
        const fillPercent = volume > 0 ? Math.min(Math.round((volume / capacity) * 100), 100) : 0
        
        // Get temperature - from latest reading first, then tank, then fallback
        let temp: number | null = null
        
        // Priority 1: Latest gravity reading temperature
        if (batch?.currentTemp !== undefined && batch?.currentTemp !== null) {
          temp = Number(batch.currentTemp)
          console.log(`[TANK_TEMP] ${t.name}: Using reading temp from batch ${batch.batchNumber}:`, temp)
        }
        // Priority 2: Tank sensor
        else if (t.currentTemp) {
          temp = Number(t.currentTemp)
          console.log(`[TANK_TEMP] ${t.name}: Using tank sensor temp:`, temp)
        } 
        else if (t.temperature) {
          temp = Number(t.temperature)
          console.log(`[TANK_TEMP] ${t.name}: Using tank temperature field:`, temp)
        }
        // Priority 3: Batch stored temp
        else if (batch?.temperature) {
          temp = Number(batch.temperature)
          console.log(`[TANK_TEMP] ${t.name}: Using batch stored temp:`, temp)
        } else {
          console.log(`[TANK_TEMP] ${t.name}: No temperature found for batch ${batch?.batchNumber || 'N/A'}`)
        }
        
        // NO fallback - if no real temp, show "-"
        
        // Determine actual status
        let status = 'AVAILABLE'
        let statusText = 'თავისუფალი'
        let needsCIP = false
        
        // ✅ eqStatus already defined at top of processTank
        // NOTE: Don't use nextCIP date for dashboard - only trust equipment.status
        
        // ✅ PRIORITY 1: If status is NEEDS_CIP - must show CIP
        if (needsCIPFromStatus) {
          status = 'CLEANING'
          statusText = 'საჭიროებს CIP-ს'
          needsCIP = true
          console.log(`[TANK_STATUS] ${t.name}: NEEDS_CIP (eqStatus=${eqStatus})`)
        }
        // ✅ PRIORITY 2: If has active assignment - show assignment phase
        else if (activeAssignment) {
          const phase = (activeAssignment.phase || '').toUpperCase()
          if (phase === 'FERMENTATION') {
            status = 'FERMENTING'
            statusText = 'ფერმენტაცია'
          } else if (phase === 'CONDITIONING' || phase === 'BRIGHT') {
            status = 'CONDITIONING'
            statusText = 'კონდიცირება'
          } else if (phase === 'PACKAGING') {
            status = 'PACKAGING'
            statusText = 'დაფასოვება'
          } else {
            status = 'IN_USE'
            statusText = 'დაკავებული'
          }
          console.log(`[TANK_STATUS] ${t.name}: ${status} from assignment (phase=${phase})`)
        }
        // ✅ PRIORITY 3: If has batch - show batch status
        else if (batch && fillPercent > 0) {
          const effectiveStatus = batchStatus || batch?.status
          if (effectiveStatus === 'FERMENTING' || effectiveStatus === 'BREWING') {
            status = 'FERMENTING'
            statusText = 'ფერმენტაცია'
          } else if (effectiveStatus === 'CONDITIONING') {
            status = 'CONDITIONING'
            statusText = 'კონდიცირება'
          } else if (effectiveStatus === 'PACKAGING') {
            status = 'PACKAGING'
            statusText = 'დაფასოვება'
          } else if (effectiveStatus === 'READY') {
            status = 'READY'
            statusText = 'მზადაა'
          } else {
            status = 'IN_USE'
            statusText = 'დაკავებული'
          }
          console.log(`[TANK_STATUS] ${t.name}: ${status} from batch (effectiveStatus=${effectiveStatus})`)
        }
        // ✅ PRIORITY 4: Available (no CIP overdue check - only trust status)
        else {
          console.log(`[TANK_STATUS] ${t.name}: AVAILABLE`)
        }
        
        return {
          id: t.id,
          name: t.name,
          type: t.type || 'FERMENTER',
          status: status,
          statusText: statusText,
          capacity: capacity,
          currentBatchId: batch?.id || null,
          batchNumber: batchNumber,  // ✅ Use the variable we calculated
          recipeName: batch?.recipeName || null,
          fill: fillPercent,
          temp: temp,
          needsCIP: needsCIP,
        }
      }

      // ✅ Separate tanks by type
      const fermenterTypes = ['fermenter', 'unitank', 'conical', 'fv']
      const briteTypes = ['brite', 'bright', 'conditioning', 'serving', 'brite_tank', 'bright_tank', 'br']
      
      const fermenters = allTanks
        .filter((t: any) => {
          const type = (t.type || '').toLowerCase()
          const name = (t.name || '').toLowerCase()
          // Check if it's a fermenter by type OR name pattern (Fer-*, FV-*, etc.)
          return fermenterTypes.some(ft => type.includes(ft)) || 
                 name.startsWith('fer-') || name.startsWith('fv-') || name.startsWith('ut-')
        })
        .map(processTank)
      
      const briteTanks = allTanks
        .filter((t: any) => {
          const type = (t.type || '').toLowerCase()
          const name = (t.name || '').toLowerCase()
          // Check if it's a brite tank by type OR name pattern (BR-*, Brite-*, etc.)
          return briteTypes.some(bt => type.includes(bt)) || 
                 name.startsWith('br-') || name.startsWith('brite-')
        })
        .map(processTank)

      console.log('Fermentation tanks:', fermenters.length, fermenters.map((t: Tank) => t.name))
      console.log('Conditioning tanks:', briteTanks.length, briteTanks.map((t: Tank) => t.name))

      // ✅ Show ALL tanks, not just 4
      setFermentationTanks(fermenters)
      setConditioningTanks(briteTanks)
      
      // Keep combined tanks for backward compatibility
      const tanksWithFill = [...fermenters, ...briteTanks]
      setTanks(tanksWithFill)

      // Process inventory - low stock
      const items = inventoryData.items || []
      const lowStock = items
        .filter((item: any) => {
          const balance = Number(item.balance || item.cachedBalance || 0)
          const reorder = Number(item.reorderPoint || 0)
          return reorder > 0 && balance <= reorder * 1.5
        })
        .slice(0, 4)
        .map((item: any) => ({
          id: item.id,
          name: item.name,
          balance: Number(item.balance || item.cachedBalance || 0),
          reorderPoint: Number(item.reorderPoint || 0),
        }))
      setLowStockItems(lowStock)

      // ✅ Process ready products - top 4 by available quantity
      const products = productsData.products || []
      const topProducts = products
        .filter((p: any) => p.availableQuantity > 0)
        .sort((a: any, b: any) => b.availableQuantity - a.availableQuantity)
        .slice(0, 4)
        .map((p: any) => ({
          id: p.id,
          name: p.name,
          packageType: p.packageType,
          availableQuantity: p.availableQuantity,
        }))
      setReadyProducts(topProducts)

      // Calculate monthly production data for chart
      const last6Months: MonthlyData[] = []
      const now = new Date()
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthName = date.toLocaleDateString('ka-GE', { month: 'short' })
        
        // Production from batches
        const monthBatches = allBatches.filter((b: any) => {
          const bDate = new Date(b.brewedAt || b.createdAt)
          return bDate.getMonth() === date.getMonth() && 
                 bDate.getFullYear() === date.getFullYear()
        })
        const production = monthBatches.reduce((sum: number, b: any) => sum + Number(b.volume || 0), 0)
        
        // Orders
        const orders = ordersData.orders || []
        const monthOrders = orders.filter((o: any) => {
          const oDate = new Date(o.orderedAt || o.createdAt)
          return oDate.getMonth() === date.getMonth() && 
                 oDate.getFullYear() === date.getFullYear()
        })
        const orderTotal = monthOrders.reduce((sum: number, o: any) => sum + Number(o.total || 0), 0)
        
        last6Months.push({
          month: monthName,
          production: Math.round(production),
          orders: Math.round(orderTotal),
        })
      }
      setMonthlyData(last6Months)

      // Calculate stats
      // ✅ Count by unique lots/batches to avoid double-counting blends and splits
      const processedLotIds = new Set<string>()
      const processedBatchIds = new Set<string>()
      let fermentingCount = 0
      let conditioningCount = 0
      let readyCount = 0
      
      // ✅ First pass: find all lot IDs that have multiple batches (blends)
      const lotBatchCount = new Map<string, string[]>()
      activeBatchList.forEach((b: any) => {
        const lotId = b.currentLot?.id
        if (lotId) {
          const existing = lotBatchCount.get(lotId) || []
          existing.push(b.id)
          lotBatchCount.set(lotId, existing)
        }
      })
      
      console.log('[STATS] Lot batch counts:', Object.fromEntries(lotBatchCount))
      
      activeBatchList.forEach((b: any) => {
        // Skip if already processed
        if (processedBatchIds.has(b.id)) return
        
        const lotId = b.currentLot?.id
        const allLots = b.allLots || []
        
        // ✅ For SPLIT batches - count EACH child lot separately
        // BRW-2026-0006 split into 2 lots = 2 conditioning
        if (b.isSplit && allLots.length > 1) {
          processedBatchIds.add(b.id)
          
          // Count each child lot
          const childLots = allLots.filter((l: any) => l.parentLotId || /-[A-Z]$/i.test(l.lotCode || ''))
          childLots.forEach((lot: any) => {
            if (!processedLotIds.has(lot.id)) {
              processedLotIds.add(lot.id)
              const phase = (lot.phase || '').toUpperCase()
              if (phase === 'FERMENTATION') fermentingCount++
              else if (phase === 'CONDITIONING' || phase === 'BRIGHT') conditioningCount++
              else if (phase === 'PACKAGING') readyCount++
            }
          })
          console.log(`[STATS] Split batch ${b.batchNumber}: ${childLots.length} child lots`)
        }
        // ✅ For BLENDED batches - count ONCE per lot
        // BRW-2026-0005 + BRW-2026-0004 in same lot = 1 fermentation
        else if (lotId && (lotBatchCount.get(lotId)?.length || 0) > 1) {
          // This lot has multiple batches - it's a blend
          if (!processedLotIds.has(lotId)) {
            processedLotIds.add(lotId)
            // Mark all batches in this lot as processed
            lotBatchCount.get(lotId)?.forEach(bId => processedBatchIds.add(bId))
            
            const lotPhase = (b.currentLot?.phase || '').toUpperCase()
            if (lotPhase === 'FERMENTATION' || b.status === 'FERMENTING') fermentingCount++
            else if (lotPhase === 'CONDITIONING' || lotPhase === 'BRIGHT' || b.status === 'CONDITIONING') conditioningCount++
            else if (b.status === 'READY') readyCount++
            console.log(`[STATS] Blend lot ${lotId}: batches=${lotBatchCount.get(lotId)?.length}, status=${b.status}`)
          }
        }
        // ✅ Also check isBlend flag from API
        else if (b.isBlend && lotId) {
          if (!processedLotIds.has(lotId)) {
            processedLotIds.add(lotId)
            processedBatchIds.add(b.id)
            const lotPhase = (b.currentLot?.phase || '').toUpperCase()
            if (lotPhase === 'FERMENTATION' || b.status === 'FERMENTING') fermentingCount++
            else if (lotPhase === 'CONDITIONING' || lotPhase === 'BRIGHT' || b.status === 'CONDITIONING') conditioningCount++
            else if (b.status === 'READY') readyCount++
            console.log(`[STATS] Blend batch ${b.batchNumber} (API flag): status=${b.status}`)
          }
        }
        // ✅ Regular batch - count normally
        else if (!b.isSplit) {
          processedBatchIds.add(b.id)
          if (b.status === 'FERMENTING') fermentingCount++
          else if (b.status === 'CONDITIONING') conditioningCount++
          else if (b.status === 'READY') readyCount++
          console.log(`[STATS] Regular batch ${b.batchNumber}: status=${b.status}`)
        }
      })
      
      console.log(`[STATS] Final: Fermenting=${fermentingCount}, Conditioning=${conditioningCount}, Ready=${readyCount}`)
      
      const totalProduction = allBatches
        .filter((b: any) => {
          const bDate = new Date(b.brewedAt || b.createdAt)
          return bDate.getMonth() === now.getMonth() && bDate.getFullYear() === now.getFullYear()
        })
        .reduce((sum: number, b: any) => sum + Number(b.volume || 0), 0)

      setStats({
        activeBatches: activeBatchList.length,
        monthlyProduction: totalProduction,
        fermentingNow: fermentingCount,
        conditioningNow: conditioningCount,
        readyToPackage: readyCount,
        lowStockItems: lowStock.length,
      })

    } catch (error) {
      console.error('Dashboard fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatRelativeTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (minutes < 60) return `${minutes} წუთის წინ`
    if (hours < 24) return `${hours} საათის წინ`
    return `${days} დღის წინ`
  }

  if (loading) {
    return (
      <DashboardLayout title="დეშბორდი" breadcrumb="მთავარი / დეშბორდი">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-copper"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="დეშბორდი" breadcrumb="მთავარი / დეშბორდი">
      {/* Welcome Banner - Compact */}
      <div className="bg-gradient-to-r from-copper/20 to-amber/10 border border-copper/30 rounded-xl p-4 mb-4 flex justify-between items-center">
        <div>
          <h3 className="font-display text-lg mb-1">
            გამარჯობა! 👋
          </h3>
          <p className="text-text-secondary text-sm">
            დღეს <strong className="text-copper-light">{stats.activeBatches} პარტია</strong> საჭიროებს ყურადღებას.
          </p>
        </div>
        <div className="text-3xl">🍺</div>
      </div>

      {/* Stats Grid - Compact */}
      <div className="grid grid-cols-5 gap-3 mb-4">
        <div className="bg-bg-secondary rounded-lg p-2 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/15 flex items-center justify-center text-lg">🍺</div>
          <div>
            <div className="text-xl font-bold text-text-primary">{stats.activeBatches}</div>
            <div className="text-[11px] text-text-muted">აქტიური პარტიები</div>
          </div>
        </div>
        <div className="bg-bg-secondary rounded-lg p-2 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-copper/15 flex items-center justify-center text-lg">📊</div>
          <div>
            <div className="text-xl font-bold text-text-primary">{(stats.monthlyProduction / 1000).toFixed(1)}k L</div>
            <div className="text-[11px] text-text-muted">თვის წარმოება</div>
          </div>
        </div>
        <div className="bg-bg-secondary rounded-lg p-2 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-500/15 flex items-center justify-center text-lg">🧪</div>
          <div>
            <div className="text-xl font-bold text-text-primary">{stats.fermentingNow}</div>
            <div className="text-[11px] text-text-muted">ფერმენტაციაში</div>
          </div>
        </div>
        <div className="bg-bg-secondary rounded-lg p-2 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center text-lg">❄️</div>
          <div>
            <div className="text-xl font-bold text-text-primary">{stats.conditioningNow}</div>
            <div className="text-[11px] text-text-muted">კონდიცირებაში</div>
          </div>
        </div>
        <div className="bg-bg-secondary rounded-lg p-2 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-500/15 flex items-center justify-center text-lg">✅</div>
          <div>
            <div className="text-xl font-bold text-text-primary">{stats.readyToPackage}</div>
            <div className="text-[11px] text-text-muted">მზად ჩამოსასხმელად</div>
          </div>
        </div>
      </div>

      {/* Active Batches Table - Full Width */}
      <div className="mb-4">
        <Card>
          <CardHeader action={<a href="/production" className="text-xs text-copper-light hover:underline">ყველას ნახვა →</a>}>
            <span className="text-lg">🍺</span> აქტიური პარტიები
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-bg-tertiary">
                  <th className="text-left text-[11px] uppercase tracking-wide text-text-muted font-medium px-3 py-2">პარტია</th>
                  <th className="text-left text-[11px] uppercase tracking-wide text-text-muted font-medium px-3 py-2">რეცეპტი</th>
                  <th className="text-left text-[11px] uppercase tracking-wide text-text-muted font-medium px-3 py-2">სტატუსი</th>
                  <th className="text-left text-[11px] uppercase tracking-wide text-text-muted font-medium px-3 py-2">ავზი</th>
                  <th className="text-left text-[11px] uppercase tracking-wide text-text-muted font-medium px-3 py-2">პროგრესი</th>
                </tr>
              </thead>
              <tbody>
                {batches.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-text-muted">
                      აქტიური პარტიები არ არის
                    </td>
                  </tr>
                ) : (
                  (() => {
                    // ✅ Process batches:
                    // - Blended batches: group into one row
                    // - Split batches: expand to multiple rows (one per lot)
                    // - Regular batches: show as is
                    const displayBatches: any[] = []
                    const processedLotIds = new Set<string>()
                    
                    batches.forEach((batch) => {
                      const lotId = batch.currentLot?.id
                      const allLots = (batch as any).allLots || []
                      
                      // ✅ Split batch - show one row per CHILD lot only (not parent)
                      if (batch.isSplit && allLots.length > 1) {
                        console.log(`[SPLIT] ${batch.batchNumber}: ${allLots.length} lots`, allLots.map((l: any) => ({
                          lotCode: l.lotCode,
                          lotNumber: l.lotNumber,
                          phase: l.phase,
                          tank: l.tank?.name,
                          parentLotId: l.parentLotId,
                        })))
                        
                        // ✅ Filter to only show child lots (lots with parentLotId OR with suffix like -A, -B)
                        const childLots = allLots.filter((lot: any) => {
                          const code = lot.lotCode || lot.lotNumber || ''
                          // Child lot if: has parentLotId OR ends with -A, -B, -C etc.
                          const hasSuffix = /-[A-Z]$/i.test(code)
                          return lot.parentLotId || hasSuffix
                        })
                        
                        // If no child lots found, show all lots (fallback)
                        const lotsToShow = childLots.length > 0 ? childLots : allLots
                        
                        lotsToShow.forEach((lot: any, idx: number) => {
                          // ✅ Use lot phase for status
                          const lotPhase = (lot.phase || '').toUpperCase()
                          let lotStatus = batch.status
                          if (lotPhase === 'CONDITIONING' || lotPhase === 'BRIGHT') {
                            lotStatus = 'CONDITIONING'
                          } else if (lotPhase === 'FERMENTATION') {
                            lotStatus = 'FERMENTING'
                          } else if (lotPhase === 'PACKAGING') {
                            lotStatus = 'PACKAGING'
                          }
                          
                          // ✅ Use lotCode or lotNumber
                          const lotCode = lot.lotCode || lot.lotNumber || `LOT-${idx + 1}`
                          
                          console.log(`[SPLIT_LOT] ${lotCode}: phase=${lotPhase} → status=${lotStatus}, tank=${lot.tank?.name}`)
                          
                          displayBatches.push({
                            ...batch,
                            id: `${batch.id}-lot-${idx}`,  // Unique key
                            tankName: lot.tank?.name || '-',
                            currentLot: lot,
                            splitLotCode: lotCode,  // Show which lot this row is for
                            status: lotStatus,  // ✅ Use lot-specific status
                            isSplitRow: true,  // ✅ Mark as split row for display
                          })
                        })
                      }
                      // ✅ Blended batch - group multiple batches into one row
                      else if (batch.isBlend && !batch.isSplit && lotId && !processedLotIds.has(lotId)) {
                        processedLotIds.add(lotId)
                        
                        // Find all batches in this lot that are blended (not split)
                        const batchesInLot = batches.filter(b => 
                          b.currentLot?.id === lotId && b.isBlend && !b.isSplit
                        )
                        
                        if (batchesInLot.length > 1) {
                          // Combine batch numbers
                          const combinedBatchNumbers = batchesInLot.map(b => b.batchNumber).join(' + ')
                          
                          displayBatches.push({
                            ...batchesInLot[0],
                            batchNumber: combinedBatchNumbers,
                            isGrouped: true,
                            groupCount: batchesInLot.length,
                          })
                        } else {
                          displayBatches.push(batch)
                        }
                      }
                      // ✅ Regular batch - show as is
                      else if (!batch.isBlend && !batch.isSplit) {
                        displayBatches.push(batch)
                      }
                    })
                    
                    return displayBatches.map((batch) => (
                      <tr key={batch.id} className="border-b border-border last:border-0 hover:bg-copper/5 transition-colors">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            {batch.isSplitRow ? (
                              // ✅ Split batch row: show ONLY lot code with 🔀
                              <span className="font-mono text-sm text-cyan-400">
                                {batch.splitLotCode} <span className="text-[10px]">🔀</span>
                              </span>
                            ) : batch.isBlend ? (
                              // Blended batch
                              <>
                                <span className="font-mono text-sm text-copper-light">{batch.batchNumber}</span>
                                <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 text-[10px] rounded">
                                  🔄 შერეული{batch.groupCount > 1 ? ` (${batch.groupCount})` : ''}
                                </span>
                              </>
                            ) : (
                              // Regular batch
                              <span className="font-mono text-sm text-copper-light">{batch.batchNumber}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-sm">{batch.recipeName}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[batch.status]}/20 text-${STATUS_COLORS[batch.status].replace('bg-', '')}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[batch.status]}`}></span>
                            {STATUS_LABELS[batch.status] || batch.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-sm text-text-secondary">{batch.tankName || '-'}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-3">
                            <div className="w-20 h-2 bg-bg-tertiary rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-copper rounded-full transition-all"
                                style={{ width: `${batch.progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-text-muted">{batch.progress}%</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  })()
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Tanks Grid - 2 columns side by side */}
      <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Fermentation Tanks */}
          <Card>
            <CardHeader action={<a href="/fermentation" className="text-xs text-copper-light hover:underline">ყველა ავზი →</a>}>
              <span className="text-lg">🧪</span> ფერმენტაცია
            </CardHeader>
            <CardBody>
              {fermentationTanks.length === 0 ? (
                <div className="text-center text-text-muted py-4 text-sm">
                  ფერმენტაციის ავზები არ მოიძებნა
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {fermentationTanks.map((tank) => {
                    const isActive = tank.fill > 0
                    const isFermenting = tank.status === 'FERMENTING'
                    const isCleaning = tank.status === 'CLEANING'
                    const needsCIP = tank.needsCIP || isCleaning
                    
                    return (
                      <div 
                        key={tank.id}
                        className={`rounded-lg p-2 ${
                          needsCIP ? 'bg-amber-500/10 border border-amber-500/30' :
                          isActive ? 'bg-bg-tertiary' : 
                          'border-2 border-dashed border-border'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-semibold text-sm">{tank.name}</div>
                            <div className={`text-[10px] ${needsCIP ? 'text-amber-400' : 'text-text-muted'}`}>
                              {tank.statusText}
                            </div>
                          </div>
                          {needsCIP ? (
                            <span className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] bg-amber-500/15 text-amber-400">
                              ⚠️ CIP
                            </span>
                          ) : isActive && (
                            <span className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] bg-amber-500/15 text-amber-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
                            </span>
                          )}
                        </div>
                        <div className="flex gap-3">
                          <div className={`relative w-10 h-[45px] bg-bg-primary rounded-t-lg rounded-b-[40%] border-2 overflow-hidden flex-shrink-0 ${
                            needsCIP ? 'border-amber-500/50' : 'border-border'
                          }`}>
                            {isActive && (
                              <div 
                                className="absolute bottom-0 left-0 right-0 transition-all duration-500 rounded-b-[38%] bg-gradient-to-t from-amber-600 to-amber-400"
                                style={{ height: `${tank.fill}%` }}
                              />
                            )}
                            {isFermenting && tank.fill > 20 && (
                              <div className="absolute inset-0 overflow-hidden">
                                <span className="tank-bubble tank-bubble-1"></span>
                                <span className="tank-bubble tank-bubble-2"></span>
                                <span className="tank-bubble tank-bubble-3"></span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] text-text-secondary mb-1 truncate">
                              {tank.batchNumber || '-'}
                            </div>
                            <div className="text-base font-bold text-amber-400">
                              {tank.temp !== null && !isNaN(tank.temp) ? `${tank.temp.toFixed(1)}°C` : '-'}
                            </div>
                            <div className="text-[9px] text-text-muted">ტემპ.</div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Conditioning/Brite Tanks */}
          <Card>
            <CardHeader action={<a href="/fermentation" className="text-xs text-copper-light hover:underline">ყველა ავზი →</a>}>
              <span className="text-lg">❄️</span> კონდიცირება
            </CardHeader>
            <CardBody>
              {conditioningTanks.length === 0 ? (
                <div className="text-center text-text-muted py-4 text-sm">
                  ბრაიტ ავზები არ მოიძებნა
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {conditioningTanks.map((tank) => {
                    const isActive = tank.fill > 0
                    const isReady = tank.status === 'READY'
                    const isPackaging = tank.status === 'PACKAGING'
                    const isConditioning = tank.status === 'CONDITIONING'
                    const isCleaning = tank.status === 'CLEANING'
                    const needsCIP = tank.needsCIP || isCleaning
                    
                    return (
                      <div 
                        key={tank.id}
                        className={`rounded-lg p-2 ${
                          needsCIP ? 'bg-amber-500/10 border border-amber-500/30' :
                          isActive ? 'bg-bg-tertiary' : 
                          'border-2 border-dashed border-border'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-semibold text-sm">{tank.name}</div>
                            <div className={`text-[10px] ${needsCIP ? 'text-amber-400' : 'text-text-muted'}`}>
                              {tank.statusText}
                            </div>
                          </div>
                          {needsCIP ? (
                            <span className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] bg-amber-500/15 text-amber-400">
                              ⚠️ CIP
                            </span>
                          ) : isActive && (
                            <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] ${
                              isPackaging ? 'bg-purple-500/15 text-purple-400' : 'bg-blue-500/15 text-blue-400'
                            }`}>
                              {isPackaging ? <span>📦</span> : isReady ? <span>✅</span> : isConditioning ? <span>❄️</span> : <span>●</span>}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-3">
                          <div className={`relative w-10 h-[45px] bg-bg-primary rounded-t-lg rounded-b-[40%] border-2 overflow-hidden flex-shrink-0 ${
                            needsCIP ? 'border-amber-500/50' : 'border-border'
                          }`}>
                            {isActive && (
                              <div 
                                className={`absolute bottom-0 left-0 right-0 transition-all duration-500 rounded-b-[38%] ${
                                  isPackaging 
                                    ? 'bg-gradient-to-t from-purple-600 to-purple-400'
                                    : 'bg-gradient-to-t from-blue-600 to-blue-400'
                                }`}
                                style={{ height: `${tank.fill}%` }}
                              />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] text-text-secondary mb-1 truncate">
                              {tank.batchNumber || '-'}
                            </div>
                            <div className={`text-base font-bold ${isPackaging ? 'text-purple-400' : 'text-blue-400'}`}>
                              {tank.temp !== null && !isNaN(tank.temp) ? `${tank.temp.toFixed(1)}°C` : '-'}
                            </div>
                            <div className="text-[9px] text-text-muted">ტემპ.</div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardBody>
          </Card>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Production Chart */}
        <div className="col-span-2">
          <Card>
            <CardHeader>
              <span className="text-lg">📈</span> წარმოების სტატისტიკა (ბოლო 6 თვე)
            </CardHeader>
            <CardBody>
              {monthlyData.length > 0 ? (
                <LineChart
                  data={monthlyData.map(d => ({
                    label: d.month,
                    value: d.production,
                  }))}
                  height={200}
                  color="#B87333"
                  fillArea
                  formatValue={(v) => `${(v / 1000).toFixed(1)}k L`}
                />
              ) : (
                <div className="h-48 flex items-center justify-center text-text-muted">
                  მონაცემები არ არის
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Low Stock Alert */}
          <Card>
            <CardHeader action={<a href="/inventory" className="text-xs text-copper-light hover:underline">შეკვეთა →</a>}>
              <span className="text-lg">⚠️</span> დაბალი მარაგი
              {stats.lowStockItems > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">
                  {stats.lowStockItems}
                </span>
              )}
            </CardHeader>
            <CardBody className="space-y-3">
              {lowStockItems.length === 0 ? (
                <div className="text-center text-text-muted py-4 text-sm">
                  ✅ მარაგი ნორმაშია
                </div>
              ) : (
                lowStockItems.map((item) => {
                  const percent = Math.round((item.balance / (item.reorderPoint * 3)) * 100)
                  const isCritical = item.balance <= item.reorderPoint * 0.5
                  return (
                    <div key={item.id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="truncate">{item.name}</span>
                        <span className={`text-xs ${isCritical ? 'text-red-400' : 'text-amber-400'}`}>
                          {item.balance.toFixed(1)} / {(item.reorderPoint * 3).toFixed(0)}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-bg-tertiary rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${isCritical ? 'bg-red-500' : 'bg-amber-500'}`}
                          style={{ width: `${Math.min(percent, 100)}%` }}
                        />
                      </div>
                    </div>
                  )
                })
              )}
            </CardBody>
          </Card>

          {/* მზა პროდუქცია - Ready Products */}
          <Card>
            <CardHeader action={<a href="/sales/products" className="text-xs text-copper-light hover:underline">ყველა →</a>}>
              <span className="text-lg">📦</span> მზა პროდუქცია
            </CardHeader>
            <CardBody className="space-y-3">
              {readyProducts.length === 0 ? (
                <div className="text-center text-text-muted py-4 text-sm">
                  მზა პროდუქცია არ არის
                </div>
              ) : (
                readyProducts.map((product) => {
                  const packageNames: Record<string, string> = {
                    KEG_50: '🛢️ 50L',
                    KEG_30: '🛢️ 30L',
                    KEG_20: '🛢️ 20L',
                    BOTTLE_750: '🍾 750ml',
                    BOTTLE_500: '🍾 500ml',
                    BOTTLE_330: '🍾 330ml',
                    CAN_500: '🥫 500ml',
                    CAN_330: '🥫 330ml',
                  }
                  return (
                    <div key={product.id} className="flex justify-between items-center">
                      <div>
                        <div className="text-sm font-medium truncate">{product.name}</div>
                        <div className="text-[10px] text-text-muted">{packageNames[product.packageType] || product.packageType}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-green-400">{product.availableQuantity}</div>
                        <div className="text-[10px] text-text-muted">ხელმის.</div>
                      </div>
                    </div>
                  )
                })
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}