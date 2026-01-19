/**
 * Error codes contract for API consumers
 * 
 * 4xx Client Errors:
 * - 400: Bad Request (validation)
 * - 401: Unauthorized
 * - 403: Forbidden
 * - 404: Not Found
 * - 409: Conflict (state/concurrent modification)
 * - 422: Unprocessable Entity (business rule violation)
 * - 423: Locked (resource locked)
 * 
 * Frontend should handle these specifically
 */

export const ERROR_CODES = {
  // Validation (400)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  
  // Auth (401, 403)
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  
  // Not Found (404)
  NOT_FOUND: 'NOT_FOUND',
  
  // Conflict (409)
  INVALID_BATCH_STATE: 'INVALID_BATCH_STATE',
  CONCURRENT_MODIFICATION: 'CONCURRENT_MODIFICATION',
  DUPLICATE_REQUEST: 'DUPLICATE_REQUEST',
  
  // Business Rules (422)
  INSUFFICIENT_INVENTORY: 'INSUFFICIENT_INVENTORY',
  TANK_CAPACITY_EXCEEDED: 'TANK_CAPACITY_EXCEEDED',
  
  // Locked (423)
  TANK_UNAVAILABLE: 'TANK_UNAVAILABLE',
  
  // Server (500)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES]

/**
 * Error code to HTTP status mapping
 */
export const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INVALID_BATCH_STATE: 409,
  CONCURRENT_MODIFICATION: 409,
  DUPLICATE_REQUEST: 200, // Idempotent - return cached
  INSUFFICIENT_INVENTORY: 422,
  TANK_CAPACITY_EXCEEDED: 422,
  TANK_UNAVAILABLE: 423,
  INTERNAL_ERROR: 500,
}



















