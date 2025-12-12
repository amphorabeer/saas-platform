// =====================================================
// Store Exports
// =====================================================

// Types
export * from './types'

// Stores
export { useBreweryStore, getRecipes, getRecipeById, getRecipeOptions } from './breweryStore'
export { useCalendarStore, EVENT_TYPE_CONFIG, EVENT_STATUS_CONFIG } from './calendarStore'

// =====================================================
// Combined Actions (Cross-store operations)
// =====================================================

import { useBreweryStore } from './breweryStore'
import { useCalendarStore } from './calendarStore'

/**
 * ახალი პარტიის შექმნა კალენდარში ივენთებით
 */
export const createBatchWithEvents = (batchData: Parameters<ReturnType<typeof useBreweryStore.getState>['addBatch']>[0]) => {
  const breweryStore = useBreweryStore.getState()
  const calendarStore = useCalendarStore.getState()
  
  // Create batch
  const batchId = breweryStore.addBatch(batchData)
  
  // Generate and add calendar events
  const events = breweryStore.generateBatchEvents(batchId)
  calendarStore.addBatchEvents(events)
  
  return batchId
}

/**
 * პარტიის სტატუსის შეცვლა კალენდრის განახლებით
 */
export const updateBatchStatusWithCalendar = (
  batchId: string, 
  action: 'startBrewing' | 'startFermentation' | 'transferToConditioning' | 'markReady' | 'startPackaging' | 'completeBatch' | 'cancelBatch',
  ...args: any[]
) => {
  const breweryStore = useBreweryStore.getState()
  const calendarStore = useCalendarStore.getState()
  
  // Execute the action
  switch (action) {
    case 'startBrewing':
      breweryStore.startBrewing(batchId, args[0])
      break
    case 'startFermentation':
      breweryStore.startFermentation(batchId, args[0])
      break
    case 'transferToConditioning':
      breweryStore.transferToConditioning(batchId, args[0])
      break
    case 'markReady':
      breweryStore.markReady(batchId)
      break
    case 'startPackaging':
      breweryStore.startPackaging(batchId)
      break
    case 'completeBatch':
      breweryStore.completeBatch(batchId)
      calendarStore.updateBatchEventStatus(batchId, 'completed')
      break
    case 'cancelBatch':
      breweryStore.cancelBatch(batchId)
      calendarStore.updateBatchEventStatus(batchId, 'cancelled')
      break
  }
  
  // Regenerate calendar events
  const events = breweryStore.generateBatchEvents(batchId)
  calendarStore.addBatchEvents(events)
}

/**
 * პარტიის წაშლა კალენდარის ივენთებით
 */
export const deleteBatchWithEvents = (batchId: string) => {
  const breweryStore = useBreweryStore.getState()
  const calendarStore = useCalendarStore.getState()
  
  // Remove calendar events first
  calendarStore.removeBatchEvents(batchId)
  
  // Delete batch
  breweryStore.deleteBatch(batchId)
}

/**
 * ტანკის ტემპერატურის განახლება batch-ის განახლებით
 */
export const updateTankTemperature = (tankId: string, temp: number, targetTemp?: number) => {
  const breweryStore = useBreweryStore.getState()
  
  // Update tank
  breweryStore.updateTankTemp(tankId, temp, targetTemp)
  
  // Update batch temperature if tank has batch
  const tank = breweryStore.getTankById(tankId)
  if (tank?.currentBatchId) {
    breweryStore.updateBatch(tank.currentBatchId, { temperature: temp })
  }
}

// =====================================================
// Hooks for combined data
// =====================================================

/**
 * Get all events including auto-generated batch events
 */
export const useAllCalendarEvents = () => {
  const calendarEvents = useCalendarStore(state => state.events)
  const batches = useBreweryStore(state => state.batches)
  const generateBatchEvents = useBreweryStore(state => state.generateBatchEvents)
  
  // Combine stored events with generated batch events
  const batchEvents = batches.flatMap(b => generateBatchEvents(b.id))
  
  // Merge, preferring stored events over generated ones
  const storedEventIds = new Set(calendarEvents.map(e => e.id))
  const uniqueBatchEvents = batchEvents.filter(e => !storedEventIds.has(e.id))
  
  return [...calendarEvents, ...uniqueBatchEvents]
}

/**
 * Get dashboard summary
 */
export const useDashboardSummary = () => {
  const stats = useBreweryStore(state => state.getStats())
  const upcomingEvents = useCalendarStore(state => state.getUpcomingEvents(7))
  const activeBatches = useBreweryStore(state => state.getActiveBatches())
  const availableTanks = useBreweryStore(state => state.getAvailableTanks())
  
  return {
    stats,
    upcomingEvents,
    activeBatches,
    availableTanks,
    tanksInUse: useBreweryStore.getState().tanks.filter(t => t.status === 'in_use'),
  }
}
