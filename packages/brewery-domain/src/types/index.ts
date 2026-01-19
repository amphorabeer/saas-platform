// @ts-nocheck
// Re-export Prisma types
export type {
  Tenant,
  User,
  Recipe,
  RecipeIngredient,
  InventoryItem,
  InventoryLedger,
  Batch,
  BatchIngredient,
  GravityReading,
  BatchTimeline,
  Tank,
  TankOccupation,
  PackagingRun,
  Customer,
  SalesOrder,
  OrderItem,
  AuditLog,
} from '@brewery/database'

// Re-export enums
export {
  PlanType,
  UserRole,
  InventoryCategory,
  LedgerEntryType,
  IngredientCategory,
  BatchStatus,
  TimelineEventType,
  TankType,
  TankStatus,
  OccupationPhase,
  PackageType,
  CustomerType,
  OrderStatus,
  PaymentStatus,
} from '@brewery/database'

// Domain-specific types
export interface InventoryPosition {
  itemId: string
  sku: string
  name: string
  onHand: number      // cachedBalance
  reserved: number    // Future: from reservations
  available: number   // onHand - reserved
  unit: string
}

export interface BatchCreateInput {
  recipeId: string
  tankId: string
  volume: number
  plannedDate: Date
  notes?: string
}

export interface BatchCreateResult {
  batch: {
    id: string
    batchNumber: string
    status: string
  }
  ingredientsConsumed: Array<{
    itemId: string
    name: string
    quantity: number
    unit: string
  }>
  tank: {
    id: string
    name: string
  }
}

export interface PackagingInput {
  batchId: string
  packageType: string
  quantity: number
  lotNumber?: string
  notes?: string
}
