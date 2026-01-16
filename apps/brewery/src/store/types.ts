// @ts-nocheck
type BatchStatus = 'PLANNED' | 'BREWING' | 'FERMENTING' | 'CONDITIONING' | 'READY' | 'PACKAGING' | 'COMPLETED' | 'CANCELLED'
import { ApiError, BatchListItem, BatchDetail, InventoryItem } from '@/lib/api-client'

// ============================================
// Common Types
// ============================================

export type LoadingState = 'idle' | 'loading' | 'success' | 'error'

export interface AsyncState<T> {
  data: T
  status: LoadingState
  error: ApiError | null
  lastUpdated: Date | null
}

// ============================================
// Batch Store Types
// ============================================

export interface BatchState {
  // Data
  batches: BatchListItem[]
  selectedBatch: BatchDetail | null
  
  // Async state
  listStatus: LoadingState
  detailStatus: LoadingState
  mutationStatus: LoadingState
  error: ApiError | null
  
  // Optimistic updates tracking
  pendingOperations: Map<string, PendingOperation>
}

export interface PendingOperation {
  type: 'create' | 'update' | 'delete'
  tempId?: string
  originalData?: unknown
  timestamp: number
}

// ============================================
// Inventory Store Types
// ============================================

export interface InventoryState {
  items: InventoryItem[]
  selectedItem: InventoryItem | null
  ledger: LedgerEntry[]
  
  listStatus: LoadingState
  detailStatus: LoadingState
  error: ApiError | null
  
  // Filters
  categoryFilter: string | null
  lowStockOnly: boolean
}

// ============================================
// UI Store Types
// ============================================

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

export interface ConfirmDialog {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel?: () => void
  variant?: 'danger' | 'warning' | 'default'
}

export interface UIState {
  // Toasts
  toasts: Toast[]
  
  // Confirm dialog
  confirmDialog: ConfirmDialog | null
  
  // Modals
  activeModal: string | null
  modalData: Record<string, unknown>
  
  // Sidebar
  sidebarCollapsed: boolean
}

// ============================================
// Timeline Event Constants
// ============================================

// Timeline event icons
export const TIMELINE_EVENT_ICONS: Record<string, string> = {
  CREATED: '📝',
  BREWING_STARTED: '🍺',
  FERMENTATION_STARTED: '🧪',
  CONDITIONING_STARTED: '❄️',
  READY_FOR_PACKAGING: '✅',
  GRAVITY_READING: '📊',
  DRY_HOP_ADDED: '🌿',
  TEMPERATURE_CHANGE: '🌡️',
  TRANSFER: '🔄',
  NOTE: '📌',
  COMPLETED: '🎉',
  CANCELLED: '❌',
}

// Timeline event colors
export const TIMELINE_EVENT_COLORS: Record<string, string> = {
  CREATED: 'bg-blue-500',
  BREWING_STARTED: 'bg-amber-500',
  FERMENTATION_STARTED: 'bg-green-500',
  CONDITIONING_STARTED: 'bg-cyan-500',
  READY_FOR_PACKAGING: 'bg-emerald-500',
  GRAVITY_READING: 'bg-purple-500',
  DRY_HOP_ADDED: 'bg-lime-500',
  TEMPERATURE_CHANGE: 'bg-orange-500',
  TRANSFER: 'bg-indigo-500',
  NOTE: 'bg-gray-500',
  COMPLETED: 'bg-green-600',
  CANCELLED: 'bg-red-500',
}

// Ingredient type labels (Georgian)
export const INGREDIENT_TYPE_LABELS: Record<string, string> = {
  MALT: 'ალაო',
  HOPS: 'სვია',
  YEAST: 'საფუარი',
  ADJUNCT: 'დანამატი',
  WATER_CHEMISTRY: 'წყლის ქიმია',
  grain: 'ალაო',
  hop: 'სვია',
  yeast: 'საფუარი',
  adjunct: 'დანამატი',
  water: 'წყლის ქიმია',
}
