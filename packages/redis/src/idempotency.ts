import { redis } from './client'

interface IdempotencyResult<T> {
  isNew: boolean
  response: T
}

export async function withIdempotency<T>(
  tenantId: string,
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<IdempotencyResult<T>> {
  const cacheKey = `idempotency:${tenantId}:${key}`
  
  // Check for existing response
  const cached = await redis.get<T>(cacheKey)
  if (cached !== null) {
    return { isNew: false, response: cached }
  }
  
  // Execute function
  const response = await fn()
  
  // Cache response
  await redis.setex(cacheKey, ttlSeconds, response)
  
  return { isNew: true, response }
}
