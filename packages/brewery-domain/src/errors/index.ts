export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400,
    public readonly details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'DomainError'
  }
}

export class InsufficientInventoryError extends DomainError {
  constructor(items: Array<{ itemId: string; name: string; required: number; available: number }>) {
    super(
      `Insufficient inventory for: ${items.map(i => i.name).join(', ')}`,
      'INSUFFICIENT_INVENTORY',
      422,
      { items }
    )
    this.name = 'InsufficientInventoryError'
  }
}

export class TankUnavailableError extends DomainError {
  constructor(tankId: string, tankName: string, currentStatus: string) {
    super(
      `Tank ${tankName} is not available (status: ${currentStatus})`,
      'TANK_UNAVAILABLE',
      423,
      { tankId, tankName, currentStatus }
    )
    this.name = 'TankUnavailableError'
  }
}

export class TankCapacityExceededError extends DomainError {
  constructor(tankId: string, tankName: string, capacity: number, requested: number) {
    super(
      `Tank ${tankName} capacity (${capacity}L) exceeded. Requested: ${requested}L`,
      'TANK_CAPACITY_EXCEEDED',
      422,
      { tankId, tankName, capacity, requested }
    )
    this.name = 'TankCapacityExceededError'
  }
}

export class InvalidBatchStateError extends DomainError {
  constructor(batchId: string, currentStatus: string, requiredStatus: string | string[]) {
    const required = Array.isArray(requiredStatus) ? requiredStatus.join(' or ') : requiredStatus
    super(
      `Batch is in "${currentStatus}" state. Required: ${required}`,
      'INVALID_BATCH_STATE',
      409,
      { batchId, currentStatus, requiredStatus }
    )
    this.name = 'InvalidBatchStateError'
  }
}

export class ConcurrentModificationError extends DomainError {
  constructor(entityType: string, entityId: string) {
    super(
      `${entityType} was modified by another process. Please retry.`,
      'CONCURRENT_MODIFICATION',
      409,
      { entityType, entityId }
    )
    this.name = 'ConcurrentModificationError'
  }
}

export class EntityNotFoundError extends DomainError {
  constructor(entityType: string, entityId: string) {
    super(
      `${entityType} not found: ${entityId}`,
      'NOT_FOUND',
      404,
      { entityType, entityId }
    )
    this.name = 'EntityNotFoundError'
  }
}

export class DuplicateRequestError extends DomainError {
  constructor(idempotencyKey: string) {
    super(
      'Duplicate request detected',
      'DUPLICATE_REQUEST',
      200, // Not an error - return cached response
      { idempotencyKey }
    )
    this.name = 'DuplicateRequestError'
  }
}

// Export error codes
export * from './codes'
