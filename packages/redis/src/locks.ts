import { redis } from './client'

interface LockResult {
  acquired: boolean
  release: () => Promise<void>
}

export async function acquireLock(
  key: string,
  ttlMs: number = 30000
): Promise<LockResult> {
  const lockKey = `lock:${key}`
  const lockValue = `${Date.now()}-${Math.random()}`
  
  // Try to acquire lock
  const acquired = await redis.set(lockKey, lockValue, {
    nx: true,
    px: ttlMs,
  })
  
  if (!acquired) {
    return {
      acquired: false,
      release: async () => {},
    }
  }
  
  return {
    acquired: true,
    release: async () => {
      // Only release if we still own the lock
      const currentValue = await redis.get(lockKey)
      if (currentValue === lockValue) {
        await redis.del(lockKey)
      }
    },
  }
}

export async function withLock<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>,
  retries: number = 3,
  retryDelayMs: number = 100
): Promise<T> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const lock = await acquireLock(key, ttlMs)
    
    if (lock.acquired) {
      try {
        return await fn()
      } finally {
        await lock.release()
      }
    }
    
    // Wait before retry
    if (attempt < retries - 1) {
      await new Promise(resolve => setTimeout(resolve, retryDelayMs * (attempt + 1)))
    }
  }
  
  throw new Error(`Failed to acquire lock: ${key}`)
}

// Lock key generators
export const lockKeys = {
  batchCreate: (tenantId: string) => `batch:create:${tenantId}`,
  tankOccupy: (tenantId: string, tankId: string) => `tank:${tenantId}:${tankId}`,
  inventoryDeduct: (tenantId: string, itemId: string) => `inventory:${tenantId}:${itemId}`,
}
