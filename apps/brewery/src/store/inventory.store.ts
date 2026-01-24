import { create } from 'zustand'
import { apiClient, InventoryItem, LedgerEntry } from '@/lib/api-client'
import { InventoryState, LoadingState } from './types'
import { useUIStore } from './ui.store'

interface CreateItemInput {
  sku: string
  name: string
  category: string
  unit: string
  reorderPoint?: number
  supplier?: string
  costPerUnit?: number
}

interface PurchaseInput {
  quantity: number
  costPerUnit?: number
  supplier?: string
  lotNumber?: string
  notes?: string
}

interface AdjustmentInput {
  newQuantity: number
  reason: string
}

interface WasteInput {
  quantity: number
  reason: string
}

interface InventoryActions {
  fetchItems: (params?: { category?: string; lowStock?: boolean; search?: string }) => Promise<void>
  fetchItem: (id: string) => Promise<void>
  createItem: (data: CreateItemInput) => Promise<InventoryItem | null>
  updateItem: (id: string, data: Partial<CreateItemInput>) => Promise<boolean>
  recordPurchase: (itemId: string, data: PurchaseInput) => Promise<boolean>
  recordAdjustment: (itemId: string, data: AdjustmentInput) => Promise<boolean>
  recordWaste: (itemId: string, data: WasteInput) => Promise<boolean>
  
  selectItem: (item: InventoryItem | null) => void
  setCategoryFilter: (category: string | null) => void
  setLowStockOnly: (lowStock: boolean) => void
  clearError: () => void
  reset: () => void
  
  // Selectors
  getItemById: (id: string) => InventoryItem | undefined
  getLowStockItems: () => InventoryItem[]
  getItemsByCategory: (category: string) => InventoryItem[]
  getTotalValue: () => number
  checkAvailability: (ingredients: { itemId: string; quantity: number }[]) => {
    available: boolean
    missing: Array<{ itemId: string; name: string; required: number; available: number }>
  }
}

const initialState: InventoryState = {
  items: [],
  selectedItem: null,
  ledger: [],
  listStatus: 'idle',
  detailStatus: 'idle',
  error: null,
  categoryFilter: null,
  lowStockOnly: false,
}

export const useInventoryStore = create<InventoryState & InventoryActions>((set, get) => ({
  ...initialState,

  fetchItems: async (params) => {
    set({ listStatus: 'loading', error: null })
    
    const response = await apiClient.getInventory({
      category: params?.category ?? get().categoryFilter ?? undefined,
      lowStock: params?.lowStock ?? get().lowStockOnly,
    })
    
    if (response.error) {
      set({ listStatus: 'error', error: response.error })
      useUIStore.getState().showError('შეცდომა', response.error.message)
      return
    }
    
    set({
      items: response.data?.items ?? [],
      listStatus: 'success',
    })
  },

  createItem: async (input) => {
    set({ listStatus: 'loading', error: null })
    
    const response = await apiClient.createInventoryItem(input)
    
    if (response.error) {
      set({ listStatus: 'error', error: response.error })
      useUIStore.getState().showError('შეცდომა', response.error.message)
      return null
    }
    
    if (response.data?.item) {
      set(state => ({
        items: [...state.items, response.data!.item],
        listStatus: 'success',
      }))
      useUIStore.getState().showSuccess('დამატებულია', `მარაგი ${response.data.item.name} დაემატა`)
      return response.data.item
    }
    
    return null
  },

  updateItem: async (id, input) => {
    set({ listStatus: 'loading', error: null })
    
    const response = await apiClient.updateInventoryItem(id, input)
    
    if (response.error) {
      set({ listStatus: 'error', error: response.error })
      useUIStore.getState().showError('შეცდომა', response.error.message)
      return false
    }
    
    if (response.data?.item) {
      set(state => ({
        items: state.items.map(item =>
          item.id === id ? response.data!.item : item
        ),
        listStatus: 'success',
      }))
      useUIStore.getState().showSuccess('განახლებულია', 'მარაგი განახლდა')
      return true
    }
    
    return false
  },

  recordPurchase: async (itemId, input) => {
    set({ listStatus: 'loading', error: null })
    
    const response = await apiClient.recordPurchase(itemId, input)
    
    if (response.error) {
      set({ listStatus: 'error', error: response.error })
      useUIStore.getState().showError('შეცდომა', response.error.message)
      return false
    }
    
    if (response.data) {
      set(state => ({
        items: state.items.map(item =>
          item.id === itemId
            ? {
                ...item,
                balance: response.data!.newBalance,
                onHand: response.data!.newBalance,
                isLowStock: item.reorderPoint ? response.data!.newBalance <= item.reorderPoint : false,
                isCritical: item.reorderPoint ? response.data!.newBalance <= item.reorderPoint * 0.5 : false,
                isOutOfStock: response.data!.newBalance <= 0,
              }
            : item
        ),
        listStatus: 'success',
      }))
      useUIStore.getState().showSuccess('შესყიდვა ჩაიწერა', `ახალი ბალანსი: ${response.data.newBalance}`)
      return true
    }
    
    return false
  },

  recordAdjustment: async (itemId, input) => {
    set({ listStatus: 'loading', error: null })
    
    const response = await apiClient.recordAdjustment(itemId, input)
    
    if (response.error) {
      set({ listStatus: 'error', error: response.error })
      useUIStore.getState().showError('შეცდომა', response.error.message)
      return false
    }
    
    if (response.data) {
      set(state => ({
        items: state.items.map(item =>
          item.id === itemId
            ? {
                ...item,
                balance: response.data!.newBalance,
                onHand: response.data!.newBalance,
                isLowStock: item.reorderPoint ? response.data!.newBalance <= item.reorderPoint : false,
                isCritical: item.reorderPoint ? response.data!.newBalance <= item.reorderPoint * 0.5 : false,
                isOutOfStock: response.data!.newBalance <= 0,
              }
            : item
        ),
        listStatus: 'success',
      }))
      useUIStore.getState().showSuccess('კორექტირება ჩაიწერა', `ახალი ბალანსი: ${response.data.newBalance}`)
      return true
    }
    
    return false
  },

  recordWaste: async (itemId, input) => {
    set({ listStatus: 'loading', error: null })
    
    const response = await apiClient.recordWaste(itemId, input)
    
    if (response.error) {
      set({ listStatus: 'error', error: response.error })
      useUIStore.getState().showError('შეცდომა', response.error.message)
      return false
    }
    
    if (response.data) {
      set(state => ({
        items: state.items.map(item =>
          item.id === itemId
            ? {
                ...item,
                balance: response.data!.newBalance,
                onHand: response.data!.newBalance,
                isLowStock: item.reorderPoint ? response.data!.newBalance <= item.reorderPoint : false,
                isCritical: item.reorderPoint ? response.data!.newBalance <= item.reorderPoint * 0.5 : false,
                isOutOfStock: response.data!.newBalance <= 0,
              }
            : item
        ),
        listStatus: 'success',
      }))
      useUIStore.getState().showSuccess('დანაკარგი ჩაიწერა', `ახალი ბალანსი: ${response.data.newBalance}`)
      return true
    }
    
    return false
  },

  fetchItem: async (id) => {
    set({ detailStatus: 'loading', error: null })
    
    const response = await apiClient.getInventoryItem(id)
    
    if (response.error) {
      set({ detailStatus: 'error', error: response.error })
      useUIStore.getState().showError('შეცდომა', response.error.message)
      return
    }
    
    set({
      selectedItem: response.data?.item ?? null,
      ledger: response.data?.ledger ?? [],
      detailStatus: 'success',
    })
  },

  selectItem: (item) => {
    set({ selectedItem: item })
  },

  setCategoryFilter: (category) => {
    set({ categoryFilter: category })
    get().fetchItems()
  },

  setLowStockOnly: (lowStock) => {
    set({ lowStockOnly: lowStock })
    get().fetchItems()
  },

  clearError: () => {
    set({ error: null })
  },

  reset: () => {
    set(initialState)
  },

  // Selectors
  getItemById: (id) => {
    return get().items.find(item => item.id === id)
  },

  getLowStockItems: () => {
    return get().items.filter(item => item.isLowStock || item.isCritical || item.isOutOfStock)
  },

  getItemsByCategory: (category) => {
    return get().items.filter(item => item.category === category)
  },

  getTotalValue: () => {
    return get().items.reduce((sum, item) => {
      const totalValue = item.costPerUnit ? Number(item.costPerUnit) * item.onHand : 0
      return sum + totalValue
    }, 0)
  },

  checkAvailability: (ingredients) => {
    const items = get().items
    const missing: Array<{ itemId: string; name: string; required: number; available: number }> = []
    
    for (const ing of ingredients) {
      const item = items.find(i => i.id === ing.itemId)
      if (!item || item.onHand < ing.quantity) {
        missing.push({
          itemId: ing.itemId,
          name: item?.name || 'Unknown',
          required: ing.quantity,
          available: item?.onHand || 0,
        })
      }
    }
    
    return {
      available: missing.length === 0,
      missing,
    }
  },
}))