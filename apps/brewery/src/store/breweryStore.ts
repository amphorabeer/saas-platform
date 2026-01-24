// @ts-nocheck
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Batch, Tank, GravityReading, BatchStatus, CalendarEvent, TimelineEvent, BatchIngredient, TimelineEventType, TankCapability, PackagingRecord, Order, Keg, Ingredient, Bottle, Label } from './types'
import { batches as initialBatches, tanks as initialTanks, recipes as centralRecipes, ingredients as centralIngredients } from '@/data/centralData'
import { mockEquipment, mockCIPLogs, mockProblemReports, mockMaintenanceRecords, type Equipment, type CIPLog, type ProblemReport, type MaintenanceRecord } from '@/data/equipmentData'

// =====================================================
// Brewery Store Interface
// =====================================================

interface BreweryStore {
  // === STATE ===
  batches: Batch[]
  tanks: Tank[]
  equipment: Equipment[]
  cipLogs: CIPLog[]
  problemReports: ProblemReport[]
  maintenanceRecords: MaintenanceRecord[]
  packagingRecords: PackagingRecord[]
  orders: Order[]
  kegs: Keg[]
  ingredients: Ingredient[]
  bottles: Bottle[]
  labels: Label[]
  _hasHydrated?: boolean // Internal hydration flag
  
  // === BATCH CRUD ===
  addBatch: (batch: Omit<Batch, 'id' | 'batchNumber'>) => string // returns new batch id
  updateBatch: (id: string, updates: Partial<Batch>) => void
  deleteBatch: (id: string) => Promise<any>
  
  // === BATCH STATUS CHANGES ===
  startBrewing: (batchId: string, actualOG?: number) => void
  startFermentation: (batchId: string, tankId: string, options?: { actualOg?: number; temperature?: number; notes?: string; lotNumber?: string; allocations?: Array<{ tankId: string; volume: number }>; isSplit?: boolean; blendWithLotId?: string; isBlend?: boolean }) => Promise<any>
  transferToConditioning: (batchId: string, newTankId?: string, options?: { finalGravity?: number; temperature?: number; notes?: string; lotNumber?: string; allocations?: Array<{ tankId: string; volume: number }>; isSplit?: boolean; blendWithAssignmentId?: string; isBlend?: boolean; stayInSameTank?: boolean }) => Promise<any>
  markReady: (params: { batchId: string; notes?: string }) => Promise<any>
  startPackaging: (params: { batchId: string; packagingType?: string; packagingSize?: number; quantity?: number; notes?: string }) => Promise<any>
  completeBatch: (params: { batchId: string; volume?: number; abv?: number; notes?: string }) => Promise<any>
  cancelBatch: (batchId: string) => void
  
  // === GRAVITY READINGS ===
  addGravityReading: (batchId: string, reading: Omit<GravityReading, 'id'>) => void
  
  // === TIMELINE ===
  addTimelineEvent: (batchId: string, event: Omit<TimelineEvent, 'id'>) => void
  
  // === TANK ACTIONS ===
  assignTank: (tankId: string, batchId: string) => void
  releaseTank: (tankId: string) => void
  updateTankTemp: (tankId: string, temp: number, targetTemp?: number) => void
  setTankStatus: (tankId: string, status: Tank['status']) => void
  
  // === SELECTORS ===
  getBatchById: (id: string) => Batch | undefined
  getTankById: (id: string) => Tank | undefined
  getTanks: () => Tank[] // Get tanks from equipment (unified data source)
  getActiveBatches: () => Batch[]
  getAvailableTanks: (capability?: TankCapability | Tank['type']) => Tank[]
  canTankCondition: (tankId: string) => boolean
  getBatchesForTank: (tankId: string) => Batch[]
  getBatchesByStatus: (status: BatchStatus) => Batch[]
  
  // === CALENDAR INTEGRATION ===
  generateBatchEvents: (batchId: string) => CalendarEvent[]
  
  // === STATS ===
  getStats: () => {
    total: number
    fermenting: number
    conditioning: number
    ready: number
    totalVolume: number
  }
  
  // === EQUIPMENT ACTIONS ===
  addEquipment: (equipment: Omit<Equipment, 'id'>) => string // returns new equipment id
  updateEquipment: (id: string, updates: Partial<Equipment>) => void
  updateEquipmentStatus: (id: string, status: Equipment['status']) => void
  deleteEquipment: (id: string) => void
  addCIPLog: (log: Omit<CIPLog, 'id'>) => void
  addProblemReport: (report: Omit<ProblemReport, 'id'>) => void
  addMaintenanceRecord: (record: Omit<MaintenanceRecord, 'id'>) => void
  resolveProblem: (id: string, resolution: string) => void
  
  // === PACKAGING ACTIONS ===
  addPackagingRecord: (record: Omit<PackagingRecord, 'id' | 'date'>) => void
  
  // === ORDER ACTIONS ===
  addOrder: (order: Omit<Order, 'id' | 'orderedAt'>) => void
  updateOrder: (orderId: string, updates: Partial<Order>) => void
  
  // === KEG ACTIONS ===
  addKeg: (keg: Omit<Keg, 'id'> & { id?: string }) => void
  updateKeg: (kegId: string, updates: Partial<Keg>) => void
  
  // === BOTTLE ACTIONS ===
  addBottle: (bottle: Omit<Bottle, 'id'> & { id?: string }) => void
  updateBottle: (bottleId: string, updates: Partial<Bottle>) => void
  
  // === LABEL ACTIONS ===
  addLabel: (label: Omit<Label, 'id'> & { id?: string }) => void
  updateLabel: (labelId: string, updates: Partial<Label>) => void
  
  // === INGREDIENT ACTIONS ===
  addIngredient: (ingredient: Omit<Ingredient, 'id'> & { id?: string }) => void
  updateIngredient: (ingredientId: string, updates: Partial<Ingredient>) => void
}

// =====================================================
// Helper Functions
// =====================================================

const generateBatchNumber = (batches: Batch[]): string => {
  const year = new Date().getFullYear()
  const maxNum = batches
    .filter(b => b.batchNumber.includes(`BRW-${year}`))
    .map(b => parseInt(b.batchNumber.split('-')[2]) || 0)
    .reduce((max, num) => Math.max(max, num), 156)
  return `BRW-${year}-${String(maxNum + 1).padStart(4, '0')}`
}

const generateId = (): string => {
  return `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

const calculateProgress = (status: BatchStatus, startDate: Date, estimatedEndDate?: Date): number => {
  if (status === 'planned') return 0
  if (status === 'completed' || status === 'packaged') return 100
  if (status === 'cancelled') return 0
  
  if (!estimatedEndDate) {
    const statusProgress: Record<string, number> = {
      brewing: 10,
      fermenting: 50,
      conditioning: 80,
      ready: 95,
    }
    return statusProgress[status] || 0
  }
  
  const now = Date.now()
  const start = startDate.getTime()
  const end = estimatedEndDate.getTime()
  const progress = ((now - start) / (end - start)) * 100
  return Math.min(Math.max(progress, 0), 99)
}

// =====================================================
// Store Implementation
// =====================================================

export const useBreweryStore = create<BreweryStore>()(
  persist(
    (set, get) => ({
      // === INITIAL STATE ===
      batches: initialBatches, // centralData already has full data
      equipment: mockEquipment,
      cipLogs: mockCIPLogs,
      problemReports: mockProblemReports,
      maintenanceRecords: mockMaintenanceRecords,
      packagingRecords: [],
      orders: [],
      kegs: [
        { id: 'KEG-30-001', size: 30, status: 'empty', location: 'საწყობი A' },
        { id: 'KEG-30-002', size: 30, status: 'empty', location: 'საწყობი A' },
        { id: 'KEG-30-003', size: 30, status: 'filled', batchName: 'Georgian Amber Lager', filledDate: new Date('2025-12-10'), location: 'მაცივარი' },
        { id: 'KEG-50-001', size: 50, status: 'empty', location: 'საწყობი B' },
        { id: 'KEG-50-002', size: 50, status: 'in_use', location: 'ბარი' },
        { id: 'KEG-20-001', size: 20, status: 'cleaning', location: 'სარეცხი' },
      ],
      bottles: [
        { id: 'BTL-001', type: 'bottle_500', color: 'brown', quantity: 2500, minStock: 1000, supplier: 'GlassCo', location: 'საწყობი B' },
        { id: 'BTL-002', type: 'bottle_330', color: 'brown', quantity: 3000, minStock: 1500, supplier: 'GlassCo', location: 'საწყობი B' },
        { id: 'BTL-003', type: 'can_500', quantity: 1000, minStock: 500, supplier: 'CanSupply', location: 'საწყობი C' },
      ],
      labels: [
        { id: 'LBL-001', name: 'Georgian Amber Lager', recipeName: 'Georgian Amber Lager', size: 'large', quantity: 2000, minStock: 500 },
        { id: 'LBL-002', name: 'Svaneti Pilsner', recipeName: 'Svaneti Pilsner', size: 'large', quantity: 1500, minStock: 500 },
        { id: 'LBL-003', name: 'Caucasus Stout', recipeName: 'Caucasus Stout', size: 'medium', quantity: 300, minStock: 500 },
      ],
      ingredients: (() => {
        // Transform central ingredients to store format
        const categoryMap: Record<string, Ingredient['category']> = {
          'malt': 'grain',
          'hops': 'hop',
          'yeast': 'yeast',
          'adjunct': 'adjunct',
          'water_chemistry': 'water',
        }
        return centralIngredients.map(ing => ({
          id: ing.id,
          name: ing.name,
          category: categoryMap[ing.category] || 'adjunct',
          currentStock: ing.quantity,
          minStock: ing.minQuantity,
          unit: ing.unit,
          avgUsagePerWeek: Math.ceil(ing.minQuantity / 4),
          lastReceived: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
          expiryDate: ing.expiryDate,
          supplier: ing.supplier,
          pricePerUnit: ing.costPerUnit,
          lotNumber: ing.lotNumber,
          location: ing.location,
        }))
      })(),
      tanks: (() => {
        // Sync tanks from equipment (unified data source)
        const equipmentTanks = mockEquipment
          .filter(eq => ['fermenter', 'unitank', 'brite', 'kettle', 'mash_tun', 'hlt'].includes(eq.type))
          .map(eq => {
            const tank: Tank = {
              id: eq.id,
              name: eq.name,
              type: eq.type as Tank['type'],
              capacity: eq.capacity || 0,
              status: eq.status === 'operational' ? 'available' as const : 
                      eq.status === 'needs_maintenance' ? 'maintenance' as const :
                      eq.status === 'under_maintenance' ? 'maintenance' as const :
                      eq.status === 'out_of_service' ? 'maintenance' as const :
                      'available' as const,
              currentBatchId: eq.currentBatchId,
              currentTemp: eq.currentTemp,
              targetTemp: eq.currentTemp, // Use currentTemp as targetTemp if not specified
              pressure: eq.currentPressure,
              location: eq.location,
              capabilities: eq.capabilities,
            }
            return tank
          })
        
        // Merge with initialTanks (for any tanks not in equipment)
        const mergedTanks = [...equipmentTanks]
        initialTanks.forEach(initialTank => {
          if (!mergedTanks.find(t => t.id === initialTank.id)) {
            mergedTanks.push(initialTank)
          }
        })
        
        // Clean up orphan tank assignments
        return mergedTanks.map(tank => {
          if (tank.currentBatchId) {
            const batchExists = initialBatches.some(b => b.id === tank.currentBatchId)
            if (!batchExists) {
              // Keep cleaning status if it was set, otherwise set to available
              const newStatus = tank.status === 'cleaning' ? 'cleaning' as const : 'available' as const
              return { ...tank, currentBatchId: undefined, status: newStatus }
            }
          }
          return tank
        })
      })(),
      
      // === HYDRATION FLAG ===
      _hasHydrated: false,
      
      // === BATCH CRUD ===
      addBatch: (batch) => {
        console.log('=== addBatch called ===')
        console.log('Input batch:', batch)
        console.log('Input ingredients:', batch.ingredients)
        
        const id = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        const batchCount = get().batches.length
        const batchNumber = `BRW-${new Date().getFullYear()}-${String(batchCount + 1).padStart(4, '0')}`
        
        const newBatch: Batch = {
          id,
          batchNumber,
          ...batch,
          ingredients: batch.ingredients || [],
        }
        
        console.log('newBatch ingredients:', newBatch.ingredients)
        
        set(state => ({
          batches: [...state.batches, newBatch],
        }))
        
        return id
      },
      
      updateBatch: (id, updates) => {
        set(state => ({
          batches: state.batches.map(b => 
            b.id === id ? { ...b, ...updates } : b
          )
        }))
      },
      
      deleteBatch: async (batchId: string) => {
        console.log('[deleteBatch] Deleting batch:', batchId)
        
        if (!batchId) {
          console.error('[deleteBatch] ❌ batchId is undefined!')
          throw new Error('Batch ID is required')
        }
        
        try {
          const response = await fetch(`/api/batches/${batchId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
          })

          if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Unknown error' }))
            console.error('[deleteBatch] API error:', error)
            throw new Error(error.error?.message || error.error || 'Failed to delete batch')
          }

          const result = await response.json()
          console.log('[deleteBatch] ✅ Success:', result)

          // Remove from local state
          set((state) => ({
            batches: state.batches.filter((b) => b.id !== batchId),
          }))

          return result
        } catch (error) {
          console.error('[deleteBatch] ❌ Error:', error)
          throw error
        }
      },
      
      // === BATCH STATUS CHANGES ===
      startBrewing: (batchId, actualOG) => {
        const batch = get().getBatchById(batchId)
        if (!batch) return
        
        set(state => ({
          batches: state.batches.map(b => 
            b.id === batchId ? {
              ...b,
              status: 'brewing' as BatchStatus,
              ...(actualOG && {
                og: actualOG,
                currentGravity: actualOG,
              }),
              progress: 10,
            } : b
          )
        }))
      },
      
      startFermentation: async (batchId, tankId, options?: { actualOg?: number; temperature?: number; notes?: string; lotNumber?: string; allocations?: Array<{ tankId: string; volume: number }>; isSplit?: boolean; blendWithLotId?: string; isBlend?: boolean }) => {
        console.log('[startFermentation] Starting with params:', { batchId, tankId, options })
        
        // ✅ Call API first - don't rely on local state
        try {
          const response = await fetch(`/api/batches/${batchId}/start-fermentation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              tankId,
              actualOg: options?.actualOg,
              temperature: options?.temperature,
              notes: options?.notes,
              lotNumber: options?.lotNumber,
              // Split/Blend data
              allocations: options?.allocations,
              isSplit: options?.isSplit,
              blendWithLotId: options?.blendWithLotId,
              isBlend: options?.isBlend,
            }),
          })

          if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Unknown error' }))
            console.error('[startFermentation] API error:', error)
            throw new Error(error.error || error.message || 'Failed to start fermentation')
          }

          const updatedBatch = await response.json()
          console.log('[startFermentation] ✅ API success:', updatedBatch)

          // Update local state with API response
          const state = get()
          const equipment = state.equipment.find(eq => eq.id === tankId)
          const tankName = equipment?.name || updatedBatch.tank?.name

          set(state => ({
            ...state,
            batches: state.batches.map(b => 
              b.id === batchId 
                ? { 
                    ...b, 
                    status: 'fermenting' as const, 
                    tankId,
                    tankName,
                    fermentationStartedAt: new Date(),
                    // Merge any additional data from API response
                    ...(updatedBatch.batchNumber && { batchNumber: updatedBatch.batchNumber }),
                  } 
                : b
            ),
            equipment: state.equipment.map(eq => 
              eq.id === tankId 
                ? { ...eq, currentBatchId: batchId, currentBatchNumber: updatedBatch.batchNumber || updatedBatch.batch?.batchNumber }
                : eq
            ),
            tanks: state.tanks.map(t => 
              t.id === tankId 
                ? { ...t, currentBatchId: batchId, status: 'in_use' as const }
                : t
            ),
          }))

          // Update Equipment in DB (if not already updated by API)
          try {
            const equipmentResponse = await fetch(`/api/equipment/${tankId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                currentBatchId: batchId,
                currentBatchNumber: updatedBatch.batchNumber,
              }),
            })
            if (equipmentResponse.ok) {
              console.log('[startFermentation] Equipment updated:', tankId)
            }
          } catch (error) {
            console.warn('[startFermentation] Equipment update error (non-critical):', error)
          }

          return updatedBatch
        } catch (error) {
          console.error('[startFermentation] ❌ Error:', error)
          throw error
        }
      },
      
      transferToConditioning: async (batchId, newTankId, options?: { finalGravity?: number; temperature?: number; notes?: string; lotNumber?: string; allocations?: Array<{ tankId: string; volume: number }>; isSplit?: boolean; blendWithAssignmentId?: string; isBlend?: boolean; stayInSameTank?: boolean }) => {
        console.log('[transferToConditioning] Starting with params:', { batchId, newTankId, options })
        
        // ✅ Call API first - doesn't require batch in local state
        try {
          const response = await fetch(`/api/batches/${batchId}/transfer-conditioning`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              targetTankId: newTankId,
              finalGravity: options?.finalGravity,
              temperature: options?.temperature,
              notes: options?.notes,
              lotNumber: options?.lotNumber,
              // Split/Blend data
              allocations: options?.allocations,
              isSplit: options?.isSplit,
              blendWithAssignmentId: options?.blendWithAssignmentId,
              isBlend: options?.isBlend,
              stayInSameTank: options?.stayInSameTank,
            }),
          })

          if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Unknown error' }))
            console.error('[transferToConditioning] API error:', error)
            throw new Error(error.error || error.message || 'Failed to transfer to conditioning')
          }

          const updatedBatch = await response.json()
          console.log('[transferToConditioning] ✅ API success:', updatedBatch)

          // Update local state from API response
          const state = get()
          const batchData = updatedBatch.batch || updatedBatch
          const equipment = state.equipment.find(eq => eq.id === (newTankId || batchData.tankId))
          const tankName = equipment?.name || batchData.tank?.name

          set(state => ({
            ...state,
            batches: state.batches.map(b => 
              b.id === batchId 
                ? { 
                    ...b, 
                    status: 'conditioning' as const, 
                    tankId: newTankId || batchData.tankId || b.tankId,
                    tankName,
                    conditioningStartedAt: new Date(),
                    // Merge any additional data from API response
                    ...(batchData.finalGravity && { finalGravity: batchData.finalGravity }),
                  } 
                : b
            ),
            equipment: state.equipment.map(eq => {
              const currentBatch = state.batches.find(b => b.id === batchId)
              // Release old tank if transferring to new tank
              if (newTankId && currentBatch?.tankId && eq.id === currentBatch.tankId && eq.id !== newTankId) {
                return { ...eq, currentBatchId: null, currentBatchNumber: null, status: 'NEEDS_CIP' as const }
              }
              // Assign new tank
              if (eq.id === (newTankId || batchData.tankId)) {
                return { ...eq, currentBatchId: batchId, currentBatchNumber: batchData.batchNumber || currentBatch?.batchNumber, status: 'operational' as const }
              }
              return eq
            }),
            tanks: state.tanks.map(t => {
              const currentBatch = state.batches.find(b => b.id === batchId)
              // Release old tank if transferring
              if (newTankId && currentBatch?.tankId && t.id === currentBatch.tankId && t.id !== newTankId) {
                return { ...t, currentBatchId: undefined, status: 'cleaning' as const }
              }
              // Assign new tank
              if (t.id === (newTankId || batchData.tankId)) {
                return { ...t, currentBatchId: batchId, status: 'in_use' as const }
              }
              return t
            }),
          }))

          return updatedBatch
        } catch (error) {
          console.error('[transferToConditioning] ❌ Error:', error)
          throw error
        }
      },
      
      markReady: async (params: { batchId: string; notes?: string }) => {
        const { batchId, notes } = params
        
        console.log('[markReady] Starting with params:', params)
        
        if (!batchId) {
          console.error('[markReady] ❌ batchId is undefined!')
          throw new Error('Batch ID is required')
        }
        
        try {
          const response = await fetch(`/api/batches/${batchId}/mark-ready`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notes }),
          })

          if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Unknown error' }))
            console.error('[markReady] API error:', error)
            throw new Error(error.error || error.message || 'Failed to mark batch as ready')
          }

          const updatedBatch = await response.json()
          console.log('[markReady] ✅ API success:', updatedBatch)

          // Update local state from API response
          const batchData = updatedBatch.batch || updatedBatch
          set((state) => ({
            batches: state.batches.map((b) =>
              b.id === batchId ? { ...b, ...batchData, status: 'ready' as const } : b
            ),
          }))

          return updatedBatch
        } catch (error) {
          console.error('[markReady] ❌ Error:', error)
          throw error
        }
      },
      
      startPackaging: async (params: { batchId: string; packagingType?: string; packagingSize?: number; quantity?: number; notes?: string }) => {
        const { batchId, ...rest } = params
        
        console.log('[startPackaging] Starting with params:', params)
        console.log('[startPackaging] batchId:', batchId)
        
        if (!batchId) {
          console.error('[startPackaging] ❌ batchId is undefined!')
          throw new Error('Batch ID is required')
        }
        
        // ✅ Call API first - doesn't require batch in local state
        try {
          const response = await fetch(`/api/batches/${batchId}/start-packaging`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rest),
          })

          if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Unknown error' }))
            console.error('[startPackaging] API error:', error)
            throw new Error(error.error || error.message || 'Failed to start packaging')
          }

          const updatedBatch = await response.json()
          console.log('[startPackaging] ✅ API success:', updatedBatch)

          // Update local state from API response
          const batchData = updatedBatch.batch || updatedBatch
          set(state => ({
            batches: state.batches.map(b => 
              b.id === batchId 
                ? { 
                    ...b, 
                    status: 'packaging' as BatchStatus,
                    progress: 90,
                    packagedVolume: 0,
                    // Merge any additional data from API response
                    ...(batchData.packagingStartedAt && { packagingStartedAt: new Date(batchData.packagingStartedAt) }),
                  } 
                : b
            ),
          }))

          return updatedBatch
        } catch (error) {
          console.error('[startPackaging] ❌ Error:', error)
          throw error
        }
      },
      
      addPackagingRecord: (recordData) => {
        const newRecord: PackagingRecord = {
          id: `pkg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          ...recordData,
          date: new Date(),
        }
        
        set(state => {
          const batch = state.batches.find(b => b.id === recordData.batchId)
          if (!batch) return state
          
          const currentPackaged = batch.packagedVolume || 0
          const newPackagedVolume = currentPackaged + recordData.volumeL
          const totalVolume = batch.volume
          
          // Update packaged volume but DON'T auto-complete
          return {
            packagingRecords: [newRecord, ...state.packagingRecords],
            batches: state.batches.map(b => {
              if (b.id === recordData.batchId) {
                return {
                  ...b,
                  packagedVolume: newPackagedVolume,
                  // Status stays 'packaging' - user must click "Complete" manually
                }
              }
              return b
            }),
          }
        })
      },
      
      completeBatch: async (params: { batchId: string; volume?: number; abv?: number; notes?: string }) => {
        const { batchId, volume, abv, notes } = params
        
        console.log('[completeBatch] Starting with params:', params)
        
        if (!batchId) {
          console.error('[completeBatch] ❌ batchId is undefined!')
          throw new Error('Batch ID is required')
        }
        
        // ✅ Call API first - doesn't require batch in local state
        try {
          const response = await fetch(`/api/batches/${batchId}/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              volume,
              abv,
              notes,
            }),
          })

          if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Unknown error' }))
            console.error('[completeBatch] API error:', error)
            throw new Error(error.error || error.message || 'Failed to complete batch')
          }

          const updatedBatch = await response.json()
          console.log('[completeBatch] ✅ API success:', updatedBatch)

          // Update local state from API response
          const batchData = updatedBatch.batch || updatedBatch
          const state = get()
          const currentBatch = state.batches.find(b => b.id === batchId)
          const tankId = currentBatch?.tankId

          set(state => ({
            batches: state.batches.map(b => 
              b.id === batchId 
                ? { 
                    ...b, 
                    status: 'completed' as const, 
                    tankId: undefined, 
                    progress: 100, 
                    actualEndDate: new Date(),
                    // Merge any additional data from API response (use existing schema fields)
                    ...(batchData.volume && { volume: batchData.volume }),
                    ...(batchData.abv && { abv: batchData.abv }),
                    ...(batchData.notes && { notes: batchData.notes }),
                  }
                : b
            ),
            // Release tank and set to cleaning (NEEDS_CIP)
            tanks: state.tanks.map(t =>
              t.id === tankId
                ? { ...t, currentBatchId: undefined, status: 'cleaning' as const }
                : t
            ),
            equipment: state.equipment.map(eq =>
              eq.id === tankId
                ? { ...eq, currentBatchId: null, currentBatchNumber: null, status: 'NEEDS_CIP' as const }
                : eq
            ),
          }))

          return updatedBatch
        } catch (error) {
          console.error('[completeBatch] ❌ Error:', error)
          throw error
        }
      },
      
      cancelBatch: (batchId) => {
        const batch = get().getBatchById(batchId)
        if (batch?.tankId) {
          get().releaseTank(batch.tankId)
        }
        
        set(state => ({
          batches: state.batches.map(b => 
            b.id === batchId ? {
              ...b,
              status: 'cancelled' as BatchStatus,
              tankId: undefined,
              tankName: undefined,
            } : b
          )
        }))
      },
      
      // === GRAVITY READINGS ===
      addGravityReading: (batchId, reading) => {
        const batch = get().getBatchById(batchId)
        if (!batch) return
        
        const newReading: GravityReading = {
          ...reading,
          id: `reading-${Date.now()}`,
        }
        
        // Auto-add timeline event for gravity reading
        get().addTimelineEvent(batchId, {
          date: reading.date,
          type: 'reading',
          title: 'Gravity reading',
          description: `SG: ${reading.gravity.toFixed(3)}, Temp: ${reading.temperature.toFixed(1)}°C`,
          user: reading.recordedBy,
        })
        
        set(state => ({
          batches: state.batches.map(b => 
            b.id === batchId ? {
              ...b,
              currentGravity: reading.gravity,
              temperature: reading.temperature,
              gravityReadings: [...(b.gravityReadings || []), newReading],
              // Update progress based on gravity
              progress: b.og && b.targetFg 
                ? Math.min(95, Math.round(((b.og - reading.gravity) / (b.og - b.targetFg)) * 100))
                : b.progress,
            } : b
          )
        }))
      },
      
      // === TIMELINE ===
      addTimelineEvent: (batchId, event) => {
        const newEvent: TimelineEvent = {
          ...event,
          id: `timeline-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        }
        set(state => ({
          batches: state.batches.map(b => 
            b.id === batchId ? {
              ...b,
              timeline: [...(b.timeline || []), newEvent].sort((a, b) => 
                new Date(b.date).getTime() - new Date(a.date).getTime()
              ),
            } : b
          )
        }))
      },
      
      // === TANK ACTIONS ===
      assignTank: (tankId, batchId) => {
        set(state => ({
          // Update tanks array
          tanks: state.tanks.map(t =>
            t.id === tankId ? {
              ...t,
              status: 'in_use' as const,
              currentBatchId: batchId,
            } : t
          ),
          // Also update equipment array
          equipment: state.equipment.map(eq =>
            eq.id === tankId ? {
              ...eq,
              currentBatchId: batchId,
            } : eq
          )
        }))
      },
      
      releaseTank: (tankId) => {
        set(state => ({
          // Update tanks array
          tanks: state.tanks.map(t =>
            t.id === tankId ? {
              ...t,
              status: 'available' as const,
              currentBatchId: undefined,
            } : t
          ),
          // Also update equipment array
          equipment: state.equipment.map(eq =>
            eq.id === tankId ? {
              ...eq,
              currentBatchId: undefined,
            } : eq
          )
        }))
      },
      
      updateTankTemp: (tankId, temp, targetTemp) => {
        set(state => ({
          // Update tanks array
          tanks: state.tanks.map(t =>
            t.id === tankId ? {
              ...t,
              currentTemp: temp,
              targetTemp: targetTemp ?? t.targetTemp,
            } : t
          ),
          // Also update equipment array
          equipment: state.equipment.map(eq =>
            eq.id === tankId ? {
              ...eq,
              currentTemp: temp,
              // Note: Equipment doesn't have targetTemp, only currentTemp
            } : eq
          )
        }))
      },
      
      setTankStatus: (tankId, status) => {
        set(state => ({
          // Update tanks array
          tanks: state.tanks.map(t =>
            t.id === tankId ? { ...t, status } : t
          ),
          // Also update equipment array (convert TankStatus to EquipmentStatus)
          equipment: state.equipment.map(eq => {
            if (eq.id === tankId) {
              const equipmentStatus = status === 'available' ? 'operational' as const :
                                      status === 'in_use' ? 'operational' as const :
                                      status === 'maintenance' ? 'under_maintenance' as const :
                                      status === 'cleaning' ? 'under_maintenance' as const :
                                      'operational' as const
              return { ...eq, status: equipmentStatus }
            }
            return eq
          })
        }))
      },
      
      // === SELECTORS ===
      getBatchById: (id) => {
        return get().batches.find(b => b.id === id)
      },
      
      getTankById: (id) => {
        // Search in tanks first
        const tank = get().tanks.find(t => t.id === id)
        if (tank) return tank
        
        // Search in equipment and convert to Tank format
        const eq = get().equipment.find(eq => eq.id === id && ['fermenter', 'unitank', 'brite', 'kettle', 'mash_tun', 'hlt'].includes(eq.type))
        if (!eq) return undefined
        
        // Convert Equipment to Tank format
        return {
          id: eq.id,
          name: eq.name,
          type: eq.type as Tank['type'],
          capacity: eq.capacity || 0,
          status: eq.status === 'operational' ? 'available' as const : 
                  eq.status === 'needs_maintenance' ? 'maintenance' as const :
                  eq.status === 'under_maintenance' ? 'maintenance' as const :
                  eq.status === 'out_of_service' ? 'maintenance' as const :
                  'available' as const,
          currentBatchId: eq.currentBatchId,
          currentTemp: eq.currentTemp,
          targetTemp: eq.currentTemp, // Use currentTemp as targetTemp if not specified
          pressure: eq.currentPressure,
          location: eq.location,
          capabilities: eq.capabilities,
        }
      },
      
      getTanks: () => {
        // Get tanks from equipment (unified data source)
        return get().equipment
          .filter(eq => ['fermenter', 'unitank', 'brite', 'kettle', 'mash_tun', 'hlt'].includes(eq.type))
          .map(eq => {
            // Convert Equipment to Tank format
            const tank: Tank = {
              id: eq.id,
              name: eq.name,
              type: eq.type as Tank['type'],
              capacity: eq.capacity || 0,
              // Map equipment status to tank status - recognize NEEDS_CIP
              status: eq.status === 'operational' ? 'available' as const : 
                      eq.status === 'NEEDS_CIP' ? 'cleaning' as const :
                      eq.status === 'needs_cip' ? 'cleaning' as const :
                      eq.status === 'cleaning' ? 'cleaning' as const :
                      eq.status === 'needs_maintenance' ? 'maintenance' as const :
                      eq.status === 'under_maintenance' ? 'maintenance' as const :
                      eq.status === 'out_of_service' ? 'maintenance' as const :
                      eq.currentBatchId ? 'in_use' as const :
                      'available' as const,
              currentBatchId: eq.currentBatchId,
              currentTemp: eq.currentTemp,
              targetTemp: eq.currentTemp, // Use currentTemp as targetTemp if not specified
              pressure: eq.currentPressure,
              location: eq.location,
              capabilities: eq.capabilities,
            }
            return tank
          })
      },
      
      getActiveBatches: () => {
        return get().batches.filter(b => 
          ['brewing', 'fermenting', 'conditioning', 'ready'].includes(b.status)
        )
      },
      
      getAvailableTanks: (capabilityOrType) => {
        const state = get()
        
        // Get tanks from both arrays
        const allTanks = [
          ...state.tanks,
          ...state.equipment
            .filter(eq => ['fermenter', 'unitank', 'brite', 'kettle', 'mash_tun', 'hlt'].includes(eq.type))
            .map(eq => ({
              id: eq.id,
              name: eq.name,
              type: eq.type as Tank['type'],
              capacity: eq.capacity || 0,
              status: eq.status === 'operational' ? 'available' as const : 
                      eq.status === 'needs_maintenance' ? 'maintenance' as const :
                      eq.status === 'under_maintenance' ? 'maintenance' as const :
                      eq.status === 'out_of_service' ? 'maintenance' as const :
                      'available' as const,
              currentBatchId: eq.currentBatchId,
              currentTemp: eq.currentTemp,
              targetTemp: eq.currentTemp,
              pressure: eq.currentPressure,
              location: eq.location,
              capabilities: eq.capabilities,
            }))
        ]
        
        // Remove duplicates (prefer tanks array over equipment)
        const uniqueTanks = allTanks.filter((tank, index, self) => 
          index === self.findIndex(t => t.id === tank.id)
        )
        
        return uniqueTanks.filter(t => {
          if (t.status !== 'available') return false
          if (!capabilityOrType) return true

          // Check if it's a capability (string) or type
          const isCapability = ['fermenting', 'conditioning', 'brewing', 'storage'].includes(capabilityOrType as string)

          if (isCapability) {
            // Filter by capability
            return t.capabilities?.includes(capabilityOrType as TankCapability) || false
          } else {
            // Filter by type (backward compatibility)
            return t.type === capabilityOrType
          }
        })
      },
      
      canTankCondition: (tankId) => {
        // Search in BOTH tanks and equipment
        const state = get()
        const tank = state.tanks.find(t => t.id === tankId) || 
                     state.equipment.find(eq => eq.id === tankId)
        return tank?.capabilities?.includes('conditioning') || tank?.type === 'unitank' || false
      },
      
      getBatchesForTank: (tankId) => {
        return get().batches.filter(b => b.tankId === tankId)
      },
      
      getBatchesByStatus: (status) => {
        return get().batches.filter(b => b.status === status)
      },
      
      // === CALENDAR INTEGRATION ===
      generateBatchEvents: (batchId) => {
        const batch = get().getBatchById(batchId)
        if (!batch) return []
        
        const events: CalendarEvent[] = []
        
        // Brew Day Event
        events.push({
          id: `evt-brew-${batchId}`,
          type: 'brew_day',
          title: `ხარშვა: ${batch.recipeName}`,
          description: `${batch.batchNumber} - ${batch.volume}L`,
          startDate: batch.startDate,
          endDate: batch.startDate,
          status: batch.status === 'planned' ? 'scheduled' : 'completed',
          batchId: batch.id,
          color: '#B87333',
        })
        
        // Fermentation Event
        if (batch.tankId && ['fermenting', 'conditioning', 'ready', 'packaged', 'completed'].includes(batch.status)) {
          const fermEndDate = new Date(batch.startDate)
          fermEndDate.setDate(fermEndDate.getDate() + 14)
          
          events.push({
            id: `evt-ferm-${batchId}`,
            type: 'fermentation',
            title: `ფერმენტაცია: ${batch.recipeName}`,
            description: `${batch.tankName} - ${batch.batchNumber}`,
            startDate: batch.startDate,
            endDate: batch.estimatedEndDate || fermEndDate,
            status: batch.status === 'fermenting' ? 'in_progress' : 'completed',
            batchId: batch.id,
            tankId: batch.tankId,
            color: '#8B5CF6',
          })
        }
        
        // Packaging Event (if ready)
        if (batch.status === 'ready') {
          const packDate = new Date()
          packDate.setDate(packDate.getDate() + 2)
          
          events.push({
            id: `evt-pack-${batchId}`,
            type: 'packaging',
            title: `შეფუთვა: ${batch.recipeName}`,
            description: `${batch.batchNumber} - ${batch.volume}L`,
            startDate: packDate,
            endDate: packDate,
            status: 'scheduled',
            batchId: batch.id,
            color: '#10B981',
          })
        }
        
        return events
      },
      
      // === STATS ===
      getStats: () => {
        const batches = get().batches
        const activeBatches = batches.filter(b =>
          ['brewing', 'fermenting', 'conditioning', 'ready'].includes(b.status)
        )

        return {
          total: batches.length,
          fermenting: batches.filter(b => b.status === 'fermenting').length,
          conditioning: batches.filter(b => b.status === 'conditioning').length,
          ready: batches.filter(b => b.status === 'ready').length,
          totalVolume: activeBatches.reduce((sum, b) => sum + b.volume, 0),
        }
      },
      
      // === EQUIPMENT ACTIONS ===
      addEquipment: (equipmentData) => {
        const newEquipment: Equipment = {
          id: `eq-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          ...equipmentData,
          status: equipmentData.status || 'operational',
        }
        set(state => ({
          equipment: [newEquipment, ...state.equipment]
        }))
        return newEquipment.id
      },
      
      updateEquipment: (id, updates) => {
        set(state => ({
          equipment: state.equipment.map(eq =>
            eq.id === id ? { ...eq, ...updates } : eq
          )
        }))
      },
      
      deleteEquipment: (id) => {
        set(state => ({
          equipment: state.equipment.filter(eq => eq.id !== id)
        }))
      },
      
      updateEquipmentStatus: (id, status) => {
        set(state => ({
          equipment: state.equipment.map(eq =>
            eq.id === id ? { ...eq, status } : eq
          )
        }))
      },
      
      addCIPLog: (logData) => {
        const newLog: CIPLog = {
          id: `cip-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          ...logData,
        }
        set(state => ({
          cipLogs: [newLog, ...state.cipLogs]
        }))
      },
      
      addProblemReport: (reportData) => {
        const newReport: ProblemReport = {
          id: `prob-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          ...reportData,
          status: 'open',
          reportedDate: new Date(),
        }
        set(state => ({
          problemReports: [newReport, ...state.problemReports]
        }))
      },
      
      addMaintenanceRecord: (recordData) => {
        const newRecord: MaintenanceRecord = {
          id: `maint-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          ...recordData,
          status: recordData.status || 'scheduled',
          priority: recordData.priority || 'medium',
        }
        set(state => ({
          maintenanceRecords: [newRecord, ...state.maintenanceRecords]
        }))
      },
      
      resolveProblem: (id, resolution) => {
        set(state => ({
          problemReports: state.problemReports.map(pr =>
            pr.id === id ? {
              ...pr, 
              status: 'resolved', 
              resolution,
              resolvedDate: new Date() 
            } : pr
          )
        }))
      },
      
      // === ORDER ACTIONS ===
      addOrder: (orderData) => {
        const newOrder: Order = {
          id: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          ...orderData,
          orderedAt: new Date(),
        }
        set(state => ({
          orders: [newOrder, ...state.orders]
        }))
      },
      
      updateOrder: (orderId, updates) => {
        set(state => ({
          orders: state.orders.map(o => 
            o.id === orderId ? { ...o, ...updates } : o
          )
        }))
      },
      
      // === KEG ACTIONS ===
      addKeg: (kegData) => {
        const newKeg: Keg = {
          id: kegData.id || `KEG-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          ...kegData,
        }
        set(state => ({
          kegs: [...state.kegs, newKeg]
        }))
      },
      
      updateKeg: (kegId, updates) => {
        set(state => ({
          kegs: state.kegs.map(k =>
            k.id === kegId ? { ...k, ...updates } : k
          )
        }))
      },
      
      // === BOTTLE ACTIONS ===
      addBottle: (bottle) => {
        const newBottle: Bottle = {
          id: bottle.id || `BTL-${Date.now()}`,
          ...bottle,
        }
        set(state => ({
          bottles: [...(state.bottles || []), newBottle]
        }))
      },
      
      updateBottle: (bottleId, updates) => {
        set(state => ({
          bottles: (state.bottles || []).map(b => 
            b.id === bottleId ? { ...b, ...updates } : b
          )
        }))
      },
      
      // === LABEL ACTIONS ===
      addLabel: (label) => {
        const newLabel: Label = {
          id: label.id || `LBL-${Date.now()}`,
          ...label,
        }
        set(state => ({
          labels: [...(state.labels || []), newLabel]
        }))
      },
      
      updateLabel: (labelId, updates) => {
        set(state => ({
          labels: (state.labels || []).map(l => 
            l.id === labelId ? { ...l, ...updates } : l
          )
        }))
      },
      
      // === INGREDIENT ACTIONS ===
      addIngredient: (ingredient) => {
        const newIngredient: Ingredient = {
          id: ingredient.id || `ING-${Date.now()}`,
          ...ingredient,
        }
        set(state => ({
          ingredients: [...(state.ingredients || []), newIngredient]
        }))
      },
      
      updateIngredient: (ingredientId, updates) => {
        set(state => ({
          ingredients: (state.ingredients || []).map(i => 
            i.id === ingredientId ? { ...i, ...updates } : i
          )
        }))
      },
    }),
    {
      name: 'brewery-storage',
      partialize: (state) => ({
        batches: state.batches,
        tanks: state.tanks,
        equipment: state.equipment,
        cipLogs: state.cipLogs,
        problemReports: state.problemReports,
        maintenanceRecords: state.maintenanceRecords,
        packagingRecords: state.packagingRecords,
        orders: state.orders,
        kegs: state.kegs,
        ingredients: state.ingredients,
        bottles: state.bottles,
        labels: state.labels,
      }),
      onRehydrateStorage: () => (state) => {
        // Clean up orphan tank assignments after rehydration
        if (state) {
          const cleanedTanks = state.tanks.map(tank => {
            if (tank.currentBatchId) {
              const batchExists = state.batches.some(b => b.id === tank.currentBatchId)
              if (!batchExists) {
                // Keep cleaning status if it was set, otherwise set to available
                const newStatus = tank.status === 'cleaning' ? 'cleaning' as const : 'available' as const
                return { ...tank, currentBatchId: undefined, status: newStatus }
              }
            }
            return tank
          })
          
          // Update state if there were changes
          const hasChanges = cleanedTanks.some((tank, idx) => 
            tank.currentBatchId !== state.tanks[idx].currentBatchId || 
            tank.status !== state.tanks[idx].status
          )
          
          if (hasChanges) {
            state.tanks = cleanedTanks
          }
        }
      },
    }
  )
)


// =====================================================
// Recipe Helpers (read-only from centralData)
// =====================================================

export const getRecipes = () => centralRecipes

export const getRecipeById = (id: string) => centralRecipes.find(r => r.id === id)

export const getRecipeOptions = () => centralRecipes.map(r => ({
  id: r.id,
  name: r.name,
  style: r.style,
  defaultOG: r.og,
  defaultFG: r.fg,
  defaultABV: r.abv,
  batchSize: r.batchSize,
}))
