import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Batch, Tank, GravityReading, BatchStatus, CalendarEvent } from './types'
import { batches as initialBatches, tanks as initialTanks, recipes as centralRecipes } from '@/data/centralData'

// =====================================================
// Brewery Store Interface
// =====================================================

interface BreweryStore {
  // === STATE ===
  batches: Batch[]
  tanks: Tank[]
  
  // === BATCH CRUD ===
  addBatch: (batch: Omit<Batch, 'id' | 'batchNumber'>) => string // returns new batch id
  updateBatch: (id: string, updates: Partial<Batch>) => void
  deleteBatch: (id: string) => void
  
  // === BATCH STATUS CHANGES ===
  startBrewing: (batchId: string, actualOG: number) => void
  startFermentation: (batchId: string, tankId: string) => void
  transferToConditioning: (batchId: string, newTankId?: string) => void
  markReady: (batchId: string) => void
  startPackaging: (batchId: string) => void
  completeBatch: (batchId: string) => void
  cancelBatch: (batchId: string) => void
  
  // === GRAVITY READINGS ===
  addGravityReading: (batchId: string, reading: Omit<GravityReading, 'id'>) => void
  
  // === TANK ACTIONS ===
  assignTank: (tankId: string, batchId: string) => void
  releaseTank: (tankId: string) => void
  updateTankTemp: (tankId: string, temp: number, targetTemp?: number) => void
  setTankStatus: (tankId: string, status: Tank['status']) => void
  
  // === SELECTORS ===
  getBatchById: (id: string) => Batch | undefined
  getTankById: (id: string) => Tank | undefined
  getActiveBatches: () => Batch[]
  getAvailableTanks: (type?: Tank['type']) => Tank[]
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
      batches: initialBatches.map(b => ({
        ...b,
        gravityReadings: [],
      })),
      tanks: initialTanks,
      
      // === BATCH CRUD ===
      addBatch: (batchData) => {
        const id = generateId()
        const batchNumber = generateBatchNumber(get().batches)
        
        const newBatch: Batch = {
          ...batchData,
          id,
          batchNumber,
          status: 'planned',
          progress: 0,
          gravityReadings: [],
        }
        
        set(state => ({
          batches: [newBatch, ...state.batches]
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
      
      deleteBatch: (id) => {
        const batch = get().getBatchById(id)
        if (batch?.tankId) {
          get().releaseTank(batch.tankId)
        }
        set(state => ({
          batches: state.batches.filter(b => b.id !== id)
        }))
      },
      
      // === BATCH STATUS CHANGES ===
      startBrewing: (batchId, actualOG) => {
        set(state => ({
          batches: state.batches.map(b => 
            b.id === batchId ? {
              ...b,
              status: 'brewing' as BatchStatus,
              og: actualOG,
              currentGravity: actualOG,
              progress: 10,
            } : b
          )
        }))
      },
      
      startFermentation: (batchId, tankId) => {
        const tank = get().getTankById(tankId)
        if (!tank) return
        
        get().assignTank(tankId, batchId)
        
        set(state => ({
          batches: state.batches.map(b => 
            b.id === batchId ? {
              ...b,
              status: 'fermenting' as BatchStatus,
              tankId,
              tankName: tank.name,
              progress: 20,
              estimatedEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // +14 დღე
            } : b
          )
        }))
      },
      
      transferToConditioning: (batchId, newTankId) => {
        const batch = get().getBatchById(batchId)
        if (!batch) return
        
        // Release old tank
        if (batch.tankId) {
          get().releaseTank(batch.tankId)
        }
        
        // Assign new tank if provided
        if (newTankId) {
          const newTank = get().getTankById(newTankId)
          get().assignTank(newTankId, batchId)
          
          set(state => ({
            batches: state.batches.map(b => 
              b.id === batchId ? {
                ...b,
                status: 'conditioning' as BatchStatus,
                tankId: newTankId,
                tankName: newTank?.name,
                progress: 70,
              } : b
            )
          }))
        } else {
          set(state => ({
            batches: state.batches.map(b => 
              b.id === batchId ? {
                ...b,
                status: 'conditioning' as BatchStatus,
                progress: 70,
              } : b
            )
          }))
        }
      },
      
      markReady: (batchId) => {
        set(state => ({
          batches: state.batches.map(b => 
            b.id === batchId ? {
              ...b,
              status: 'ready' as BatchStatus,
              progress: 95,
            } : b
          )
        }))
      },
      
      startPackaging: (batchId) => {
        const batch = get().getBatchById(batchId)
        if (batch?.tankId) {
          get().releaseTank(batch.tankId)
        }
        
        set(state => ({
          batches: state.batches.map(b => 
            b.id === batchId ? {
              ...b,
              status: 'packaged' as BatchStatus,
              tankId: undefined,
              tankName: undefined,
              progress: 100,
            } : b
          )
        }))
      },
      
      completeBatch: (batchId) => {
        const batch = get().getBatchById(batchId)
        if (batch?.tankId) {
          get().releaseTank(batch.tankId)
        }
        
        set(state => ({
          batches: state.batches.map(b => 
            b.id === batchId ? {
              ...b,
              status: 'completed' as BatchStatus,
              progress: 100,
              actualEndDate: new Date(),
              tankId: undefined,
              tankName: undefined,
            } : b
          )
        }))
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
        const newReading: GravityReading = {
          ...reading,
          id: `reading-${Date.now()}`,
        }
        
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
      
      // === TANK ACTIONS ===
      assignTank: (tankId, batchId) => {
        set(state => ({
          tanks: state.tanks.map(t => 
            t.id === tankId ? {
              ...t,
              status: 'in_use' as const,
              currentBatchId: batchId,
            } : t
          )
        }))
      },
      
      releaseTank: (tankId) => {
        set(state => ({
          tanks: state.tanks.map(t => 
            t.id === tankId ? {
              ...t,
              status: 'available' as const,
              currentBatchId: undefined,
            } : t
          )
        }))
      },
      
      updateTankTemp: (tankId, temp, targetTemp) => {
        set(state => ({
          tanks: state.tanks.map(t => 
            t.id === tankId ? {
              ...t,
              currentTemp: temp,
              targetTemp: targetTemp ?? t.targetTemp,
            } : t
          )
        }))
      },
      
      setTankStatus: (tankId, status) => {
        set(state => ({
          tanks: state.tanks.map(t => 
            t.id === tankId ? { ...t, status } : t
          )
        }))
      },
      
      // === SELECTORS ===
      getBatchById: (id) => {
        return get().batches.find(b => b.id === id)
      },
      
      getTankById: (id) => {
        return get().tanks.find(t => t.id === id)
      },
      
      getActiveBatches: () => {
        return get().batches.filter(b => 
          ['brewing', 'fermenting', 'conditioning', 'ready'].includes(b.status)
        )
      },
      
      getAvailableTanks: (type) => {
        return get().tanks.filter(t => {
          if (t.status !== 'available') return false
          if (type && t.type !== type) return false
          return true
        })
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
    }),
    {
      name: 'brewery-storage',
      partialize: (state) => ({
        batches: state.batches,
        tanks: state.tanks,
      }),
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
