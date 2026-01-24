// Re-export BatchStatus from centralData (lowercase values)
export type { BatchStatus } from '@/data/centralData'
import { ApiError, BatchListItem, BatchDetail, InventoryItem, LedgerEntry } from '@/lib/api-client'

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

// ============================================
// Re-export types from centralData for breweryStore
// ============================================
export type {
  Batch,
  Tank,
  GravityReading,
  CalendarEvent,
  TimelineEvent,
  BatchIngredient,
  TimelineEventType,
  TankCapability,
  Order,
  Keg,
  Ingredient,
} from '@/data/centralData'

// ============================================
// Types not in centralData - define here
// ============================================

export interface PackagingRecord {
  id: string
  batchId: string
  batchNumber: string
  date: Date
  packagingType: 'keg' | 'bottle' | 'can'
  size: number
  quantity: number
  totalVolume: number
  performedBy: string
  notes?: string
}

export interface Bottle {
  id: string
  size: number // ml
  quantity: number
  batchId?: string
  batchNumber?: string
  filledDate?: Date
  bestBefore?: Date
  labelId?: string
}

export interface Label {
  id: string
  name: string
  recipeId?: string
  recipeName?: string
  quantity: number
  design?: string
}

// Calendar specific types
export type EventType = 'brewing' | 'fermentation' | 'conditioning' | 'packaging' | 'delivery' | 'maintenance' | 'other'
export type EventStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'