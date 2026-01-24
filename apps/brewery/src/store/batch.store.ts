import { create } from 'zustand'
import { BatchStatus } from './types'
import { apiClient, ApiError, BatchListItem, BatchDetail, CreateBatchInput } from '@/lib/api-client'
import { BatchState, LoadingState, PendingOperation } from './types'
import { useUIStore } from './ui.store'

interface BatchActions {
  // Data fetching
  fetchBatches: (params?: { status?: BatchStatus }) => Promise<void>
  fetchBatch: (id: string) => Promise<void>
  
  // Mutations with optimistic updates
  createBatch: (input: CreateBatchInput) => Promise<{ success: boolean; batchId?: string }>
  startBrewing: (batchId: string, actualOg?: number) => Promise<boolean>
  startFermentation: (batchId: string, tankId?: string) => Promise<boolean>
  transferToConditioning: (batchId: string, newTankId?: string) => Promise<boolean>
  markReady: (batchId: string, finalGravity?: number) => Promise<boolean>
  cancelBatch: (batchId: string, reason: string) => Promise<boolean>
  addGravityReading: (batchId: string, gravity: number, temperature: number, notes?: string) => Promise<boolean>
  
  // State management
  selectBatch: (batch: BatchDetail | null) => void
  clearError: () => void
  reset: () => void
}

const initialState: BatchState = {
  batches: [],
  selectedBatch: null,
  listStatus: 'idle',
  detailStatus: 'idle',
  mutationStatus: 'idle',
  error: null,
  pendingOperations: new Map(),
}

// Error message helper
function getErrorMessage(error: ApiError, status: number): string {
  // Map error codes to Georgian messages
  const errorMessages: Record<string, string> = {
    INSUFFICIENT_INVENTORY: 'არასაკმარისი მარაგი',
    TANK_UNAVAILABLE: 'ავზი დაკავებულია',
    TANK_CAPACITY_EXCEEDED: 'ავზის ტევადობა არ არის საკმარისი',
    INVALID_BATCH_STATE: 'პარტიის სტატუსი არ იძლევა ამ მოქმედების საშუალებას',
    CONCURRENT_MODIFICATION: 'მონაცემები შეიცვალა. გთხოვთ განაახლოთ გვერდი',
    NOT_FOUND: 'მონაცემები ვერ მოიძებნა',
    FORBIDDEN: 'არ გაქვთ ამ მოქმედების უფლება',
    UNAUTHORIZED: 'გთხოვთ შეხვიდეთ სისტემაში',
  }
  
  return errorMessages[error.code] || error.message
}

export const useBatchStore = create<BatchState & BatchActions>((set, get) => ({
  ...initialState,

  // ============================================
  // Data Fetching
  // ============================================

  fetchBatches: async (params) => {
    set({ listStatus: 'loading', error: null })
    
    const response = await apiClient.getBatches(params)
    
    if (response.error) {
      set({ listStatus: 'error', error: response.error })
      useUIStore.getState().showError('შეცდომა', response.error.message)
      return
    }
    
    set({
      batches: response.data?.batches ?? [],
      listStatus: 'success',
    })
  },

  fetchBatch: async (id) => {
    set({ detailStatus: 'loading', error: null })
    
    const response = await apiClient.getBatch(id)
    
    if (response.error) {
      set({ detailStatus: 'error', error: response.error })
      useUIStore.getState().showError('შეცდომა', response.error.message)
      return
    }
    
    set({
      selectedBatch: response.data?.batch ?? null,
      detailStatus: 'success',
    })
  },

  // ============================================
  // Mutations with Optimistic Updates
  // ============================================

  createBatch: async (input) => {
    const tempId = `temp-${Date.now()}`
    const ui = useUIStore.getState()
    
    // Optimistic update
    const optimisticBatch: BatchListItem = {
      id: tempId,
      batchNumber: 'Creating...',
      status: 'PLANNED',
      volume: input.volume,
      recipe: { id: input.recipeId, name: 'Loading...', style: '' },
      tank: null,
      createdAt: new Date().toISOString(),
    }
    
    set((state) => {
      state.batches.unshift(optimisticBatch)
      state.mutationStatus = 'loading'
      const pendingOps = new Map(state.pendingOperations)
      pendingOps.set(tempId, {
        type: 'create',
        tempId,
        timestamp: Date.now(),
      })
      state.pendingOperations = pendingOps
    })
    
    const response = await apiClient.createBatch(input)
    
    if (response.error) {
      // Rollback
      set((state) => {
        state.batches = state.batches.filter(b => b.id !== tempId)
        state.mutationStatus = 'error'
        state.error = response.error
        const pendingOps = new Map(state.pendingOperations)
        pendingOps.delete(tempId)
        state.pendingOperations = pendingOps
      })
      
      // Show appropriate error message
      const errorMessage = getErrorMessage(response.error, response.status)
      ui.showError('პარტიის შექმნა ვერ მოხერხდა', errorMessage)
      
      return { success: false }
    }
    
    // Replace optimistic with real data
    set((state) => {
      const index = state.batches.findIndex(b => b.id === tempId)
      if (index !== -1 && response.data) {
        state.batches[index] = {
          ...state.batches[index],
          id: response.data.batch.id,
          batchNumber: response.data.batch.batchNumber,
          status: response.data.batch.status as BatchStatus,
        }
      }
      state.mutationStatus = 'success'
      const pendingOps = new Map(state.pendingOperations)
      pendingOps.delete(tempId)
      state.pendingOperations = pendingOps
    })
    
    ui.showSuccess('პარტია შეიქმნა', `პარტია ${response.data?.batch.batchNumber}`)
    
    // Refresh list to get full data
    get().fetchBatches()
    
    return { success: true, batchId: response.data?.batch.id }
  },

  startBrewing: async (batchId, actualOg) => {
    const ui = useUIStore.getState()
    const previousBatch = get().batches.find(b => b.id === batchId)
    
    // Optimistic update
    set((state) => {
      const batch = state.batches.find(b => b.id === batchId)
      if (batch) {
        batch.status = 'BREWING'
      }
      if (state.selectedBatch?.id === batchId) {
        state.selectedBatch.status = 'BREWING'
      }
      state.mutationStatus = 'loading'
    })
    
    const response = await apiClient.startBrewing(batchId, actualOg)
    
    if (response.error) {
      // Rollback
      set((state) => {
        const batch = state.batches.find(b => b.id === batchId)
        if (batch && previousBatch) {
          batch.status = previousBatch.status
        }
        state.mutationStatus = 'error'
      })
      
      ui.showError('შეცდომა', getErrorMessage(response.error, response.status))
      return false
    }
    
    set({ mutationStatus: 'success' })
    ui.showSuccess('დაწყებულია', 'ლუდის ხარშვა დაიწყო')
    
    // Refresh batch details
    if (get().selectedBatch?.id === batchId) {
      get().fetchBatch(batchId)
    }
    
    return true
  },

  startFermentation: async (batchId, tankId) => {
    const ui = useUIStore.getState()
    const previousBatch = get().batches.find(b => b.id === batchId)
    
    set((state) => {
      const batch = state.batches.find(b => b.id === batchId)
      if (batch) batch.status = 'FERMENTING'
      if (state.selectedBatch?.id === batchId) {
        state.selectedBatch.status = 'FERMENTING'
      }
      state.mutationStatus = 'loading'
    })
    
    const response = await apiClient.startFermentation(batchId, tankId)
    
    if (response.error) {
      set((state) => {
        const batch = state.batches.find(b => b.id === batchId)
        if (batch && previousBatch) batch.status = previousBatch.status
        state.mutationStatus = 'error'
      })
      
      ui.showError('შეცდომა', getErrorMessage(response.error, response.status))
      return false
    }
    
    set({ mutationStatus: 'success' })
    ui.showSuccess('დაწყებულია', 'ფერმენტაცია დაიწყო')
    
    if (get().selectedBatch?.id === batchId) {
      get().fetchBatch(batchId)
    }
    
    return true
  },

  transferToConditioning: async (batchId, newTankId) => {
    const ui = useUIStore.getState()
    const previousBatch = get().batches.find(b => b.id === batchId)
    
    set((state) => {
      const batch = state.batches.find(b => b.id === batchId)
      if (batch) batch.status = 'CONDITIONING'
      if (state.selectedBatch?.id === batchId) {
        state.selectedBatch.status = 'CONDITIONING'
      }
      state.mutationStatus = 'loading'
    })
    
    const response = await apiClient.transferToConditioning(batchId, newTankId)
    
    if (response.error) {
      set((state) => {
        const batch = state.batches.find(b => b.id === batchId)
        if (batch && previousBatch) batch.status = previousBatch.status
        state.mutationStatus = 'error'
      })
      
      ui.showError('შეცდომა', getErrorMessage(response.error, response.status))
      return false
    }
    
    set({ mutationStatus: 'success' })
    ui.showSuccess('გადატანილია', 'პარტია გადავიდა კონდიცირებაზე')
    
    if (get().selectedBatch?.id === batchId) {
      get().fetchBatch(batchId)
    }
    
    return true
  },

  markReady: async (batchId, finalGravity) => {
    const ui = useUIStore.getState()
    const previousBatch = get().batches.find(b => b.id === batchId)
    
    set((state) => {
      const batch = state.batches.find(b => b.id === batchId)
      if (batch) batch.status = 'READY'
      if (state.selectedBatch?.id === batchId) {
        state.selectedBatch.status = 'READY'
      }
      state.mutationStatus = 'loading'
    })
    
    const response = await apiClient.markReady(batchId, finalGravity)
    
    if (response.error) {
      set((state) => {
        const batch = state.batches.find(b => b.id === batchId)
        if (batch && previousBatch) batch.status = previousBatch.status
        state.mutationStatus = 'error'
      })
      
      ui.showError('შეცდომა', getErrorMessage(response.error, response.status))
      return false
    }
    
    set({ mutationStatus: 'success' })
    ui.showSuccess('მზადაა', 'პარტია მზად არის ჩამოსხმელად')
    
    if (get().selectedBatch?.id === batchId) {
      get().fetchBatch(batchId)
    }
    
    return true
  },

  cancelBatch: async (batchId, reason) => {
    const ui = useUIStore.getState()
    const previousBatch = get().batches.find(b => b.id === batchId)
    
    set((state) => {
      const batch = state.batches.find(b => b.id === batchId)
      if (batch) batch.status = 'CANCELLED'
      if (state.selectedBatch?.id === batchId) {
        state.selectedBatch.status = 'CANCELLED'
      }
      state.mutationStatus = 'loading'
    })
    
    const response = await apiClient.cancelBatch(batchId, reason)
    
    if (response.error) {
      set((state) => {
        const batch = state.batches.find(b => b.id === batchId)
        if (batch && previousBatch) batch.status = previousBatch.status
        state.mutationStatus = 'error'
      })
      
      ui.showError('შეცდომა', getErrorMessage(response.error, response.status))
      return false
    }
    
    set({ mutationStatus: 'success' })
    ui.showSuccess('გაუქმებულია', 'პარტია გაუქმდა, მარაგები დაბრუნდა')
    
    if (get().selectedBatch?.id === batchId) {
      get().fetchBatch(batchId)
    }
    
    return true
  },

  addGravityReading: async (batchId, gravity, temperature, notes) => {
    const ui = useUIStore.getState()
    
    set({ mutationStatus: 'loading' })
    
    const response = await apiClient.addGravityReading(batchId, { gravity, temperature, notes })
    
    if (response.error) {
      set({ mutationStatus: 'error' })
      ui.showError('შეცდომა', response.error.message)
      return false
    }
    
    set({ mutationStatus: 'success' })
    ui.showSuccess('დამატებულია', `სიმკვრივე: ${gravity}`)
    
    // Refresh batch details
    if (get().selectedBatch?.id === batchId) {
      get().fetchBatch(batchId)
    }
    
    return true
  },

  // ============================================
  // State Management
  // ============================================

  selectBatch: (batch) => {
    set({ selectedBatch: batch })
  },

  clearError: () => {
    set({ error: null })
  },

  reset: () => {
    set(initialState)
  },
}))