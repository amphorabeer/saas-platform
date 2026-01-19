import * as Sentry from '@sentry/nextjs'

/**
 * Initialize Sentry (call in instrumentation.ts)
 */
export function initSentry() {
  if (!process.env.SENTRY_DSN) {
    console.warn('Sentry DSN not configured')
    return
  }
  
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    
    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Error filtering
    beforeSend(event, hint) {
      // Don't send in development
      if (process.env.NODE_ENV === 'development') {
        return null
      }
      
      // Filter out known non-issues
      const error = hint.originalException
      if (error instanceof Error) {
        // Don't report validation errors
        if (error.name === 'ZodError') {
          return null
        }
        // Don't report auth errors
        if (error.message.includes('UNAUTHORIZED')) {
          return null
        }
      }
      
      return event
    },
    
    // Enrich errors with context
    beforeBreadcrumb(breadcrumb) {
      // Mask sensitive data
      if (breadcrumb.data?.password) {
        breadcrumb.data.password = '[REDACTED]'
      }
      return breadcrumb
    },
  })
}

/**
 * Capture error with context
 */
export function captureError(
  error: Error,
  context?: {
    correlationId?: string
    tenantId?: string
    userId?: string
    extra?: Record<string, unknown>
  }
) {
  Sentry.withScope((scope) => {
    if (context?.correlationId) {
      scope.setTag('correlationId', context.correlationId)
    }
    if (context?.tenantId) {
      scope.setTag('tenantId', context.tenantId)
    }
    if (context?.userId) {
      scope.setUser({ id: context.userId })
    }
    if (context?.extra) {
      scope.setExtras(context.extra)
    }
    
    Sentry.captureException(error)
  })
}

/**
 * Set user context for Sentry
 */
export function setSentryUser(user: { id: string; email: string; tenantId: string }) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
  })
  Sentry.setTag('tenantId', user.tenantId)
}

/**
 * Clear user context
 */
export function clearSentryUser() {
  Sentry.setUser(null)
}



















