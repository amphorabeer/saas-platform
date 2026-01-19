import pino from 'pino'

// Environment-aware configuration
const isDevelopment = process.env.NODE_ENV === 'development'

// Create base logger
export const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  
  // Pretty print in development
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          ignore: 'pid,hostname',
          translateTime: 'HH:MM:ss',
        },
      }
    : undefined,
  
  // Structured format for production
  formatters: {
    level: (label) => ({ level: label }),
    bindings: () => ({}), // Remove pid and hostname
  },
  
  // Base properties
  base: {
    service: 'brewery',
    env: process.env.NODE_ENV,
  },
})

/**
 * Create child logger with context
 */
export function createLogger(context: Record<string, unknown>) {
  return logger.child(context)
}

/**
 * Request logger with correlation ID
 */
export function createRequestLogger(correlationId: string, tenantId?: string) {
  return logger.child({
    correlationId,
    tenantId,
  })
}

/**
 * Log levels with semantic meaning
 */
export const log = {
  // Business events
  event: (name: string, data?: Record<string, unknown>) => {
    logger.info({ event: name, ...data }, `Event: ${name}`)
  },
  
  // Audit trail
  audit: (action: string, userId: string, details?: Record<string, unknown>) => {
    logger.info({ audit: true, action, userId, ...details }, `Audit: ${action}`)
  },
  
  // Performance
  timing: (operation: string, durationMs: number, metadata?: Record<string, unknown>) => {
    const level = durationMs > 1000 ? 'warn' : 'info'
    logger[level]({ operation, durationMs, ...metadata }, `Timing: ${operation} took ${durationMs}ms`)
  },
  
  // Errors with context
  error: (message: string, error: unknown, context?: Record<string, unknown>) => {
    const errorObj = error instanceof Error
      ? { message: error.message, stack: error.stack, name: error.name }
      : { message: String(error) }
    
    logger.error({ error: errorObj, ...context }, message)
  },
  
  // Database queries (slow query detection)
  query: (query: string, durationMs: number, params?: unknown) => {
    if (durationMs > 500) {
      logger.warn({ query, durationMs, params, slowQuery: true }, `Slow query: ${durationMs}ms`)
    } else if (process.env.LOG_QUERIES === 'true') {
      logger.debug({ query, durationMs }, `Query: ${durationMs}ms`)
    }
  },
}



















