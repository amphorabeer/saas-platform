import { logger } from './logger'

/**
 * Simple metrics collector
 * In production, replace with Prometheus/DataDog/etc.
 */
class Metrics {
  private counters: Map<string, number> = new Map()
  private histograms: Map<string, number[]> = new Map()
  
  /**
   * Increment counter
   */
  increment(name: string, value: number = 1, tags?: Record<string, string>) {
    const key = this.makeKey(name, tags)
    const current = this.counters.get(key) || 0
    this.counters.set(key, current + value)
    
    // Log for now (replace with actual metrics backend)
    logger.debug({ metric: name, value, tags, type: 'counter' }, `Metric: ${name}`)
  }
  
  /**
   * Record timing
   */
  timing(name: string, durationMs: number, tags?: Record<string, string>) {
    const key = this.makeKey(name, tags)
    const values = this.histograms.get(key) || []
    values.push(durationMs)
    this.histograms.set(key, values)
    
    logger.debug({ metric: name, durationMs, tags, type: 'timing' }, `Metric: ${name}`)
  }
  
  /**
   * Record gauge value
   */
  gauge(name: string, value: number, tags?: Record<string, string>) {
    logger.debug({ metric: name, value, tags, type: 'gauge' }, `Metric: ${name}`)
  }
  
  /**
   * Get all metrics (for health endpoint)
   */
  getAll(): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    
    this.counters.forEach((value, key) => {
      result[`counter:${key}`] = value
    })
    
    this.histograms.forEach((values, key) => {
      const sorted = [...values].sort((a, b) => a - b)
      result[`histogram:${key}`] = {
        count: values.length,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        p95: sorted[Math.floor(sorted.length * 0.95)],
      }
    })
    
    return result
  }
  
  private makeKey(name: string, tags?: Record<string, string>): string {
    if (!tags) return name
    const tagStr = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',')
    return `${name}{${tagStr}}`
  }
}

export const metrics = new Metrics()

// Pre-defined metrics
export const METRICS = {
  // API
  API_REQUEST_COUNT: 'api.request.count',
  API_REQUEST_DURATION: 'api.request.duration',
  API_ERROR_COUNT: 'api.error.count',
  
  // Batch operations
  BATCH_CREATED: 'batch.created',
  BATCH_COMPLETED: 'batch.completed',
  BATCH_CANCELLED: 'batch.cancelled',
  
  // Inventory
  INVENTORY_DEDUCTION: 'inventory.deduction',
  INVENTORY_LOW_STOCK: 'inventory.low_stock',
  
  // Database
  DB_QUERY_DURATION: 'db.query.duration',
  DB_TRANSACTION_DURATION: 'db.transaction.duration',
}



















