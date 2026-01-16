import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { hasPermission, Permission } from '@brewery/auth'
type UserRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'BREWER' | 'VIEWER'

// DomainError class - matches @brewery/domain interface
class DomainError extends Error {
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

// Use local DomainError for now - can be replaced with @brewery/domain when package is properly linked
const DomainErrorClass = DomainError

// Context passed to route handlers
export interface RouteContext {
  tenantId: string
  userId: string
  userRole: UserRole
  correlationId: string
}

// Error response format
interface ErrorResponse {
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
  correlationId: string
}

/**
 * Generate correlation ID for request tracing
 */
function generateCorrelationId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Map domain errors to HTTP responses
 */
function mapErrorToResponse(error: unknown, correlationId: string): NextResponse<ErrorResponse> {
  // Log error with correlation ID
  console.error(`[${correlationId}] Error:`, error)
  
  if (error instanceof DomainErrorClass) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
        correlationId,
      },
      { status: error.statusCode }
    )
  }
  
  // Zod validation errors
  if (error instanceof Error && error.name === 'ZodError') {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: { errors: (error as any).errors },
        },
        correlationId,
      },
      { status: 400 }
    )
  }
  
  // Unknown error
  const message = process.env.NODE_ENV === 'development' 
    ? (error as Error).message 
    : 'An unexpected error occurred'
    
  return NextResponse.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message,
      },
      correlationId,
    },
    { status: 500 }
  )
}

/**
 * Wrap route handler with authentication and error handling
 */
export function withErrorHandler<T = any>(
  handler: (req: NextRequest, context: RouteContext) => Promise<NextResponse<T> | NextResponse<any>>,
  options?: { requiredPermission?: Permission }
) {
  return async (req: NextRequest): Promise<NextResponse<T | ErrorResponse>> => {
    const correlationId = req.headers.get('x-correlation-id') || generateCorrelationId()
    
    try {
      // Get JWT token
      const token = await getToken({ 
        req, 
        secret: process.env.NEXTAUTH_SECRET 
      })
      
      if (!token) {
        return NextResponse.json(
          {
            error: {
              code: 'UNAUTHORIZED',
              message: 'Authentication required',
            },
            correlationId,
          },
          { status: 401 }
        ) as NextResponse<ErrorResponse>
      }
      
      const userRole = token.role as UserRole
      
      // Check permission if required
      if (options?.requiredPermission) {
        if (!hasPermission(userRole, options.requiredPermission)) {
          return NextResponse.json(
            {
              error: {
                code: 'FORBIDDEN',
                message: `Permission denied: ${options.requiredPermission}`,
              },
              correlationId,
            },
            { status: 403 }
          ) as NextResponse<ErrorResponse>
        }
      }
      
      const context: RouteContext = {
        tenantId: token.tenantId as string,
        userId: token.id as string,
        userRole,
        correlationId,
      }
      
      // Add audit log entry for mutations
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method || '')) {
        // Fire and forget - don't block request
        logAuditEntry(context, req).catch(console.error)
      }
      
      const response = await handler(req, context)
      
      // Add headers
      response.headers.set('x-correlation-id', correlationId)
      response.headers.set('x-tenant-id', context.tenantId)
      
      return response
    } catch (error) {
      return mapErrorToResponse(error, correlationId)
    }
  }
}

/**
 * Helper: require specific permission
 */
export function withPermission<T = any>(
  permission: Permission,
  handler: (req: NextRequest, context: RouteContext) => Promise<NextResponse<T> | NextResponse<any>>
) {
  return withErrorHandler(handler, { requiredPermission: permission })
}

/**
 * Helper: authenticate without permission check (tenant-only)
 * Use this for routes that only need authentication, not specific permissions
 */
export function withTenant<T = any>(
  handler: (req: NextRequest, context: RouteContext) => Promise<NextResponse<T> | NextResponse<any>>
) {
  return withErrorHandler(handler as any)
}

/**
 * Parse and validate request body
 */
export async function parseBody<T>(
  req: NextRequest, 
  schema: { parse: (data: unknown) => T }
): Promise<T> {
  const body = await req.json()
  return schema.parse(body)
}

/**
 * Audit log entry (async, non-blocking)
 */
async function logAuditEntry(context: RouteContext, req: NextRequest) {
  try {
    const { prisma } = await import('@brewery/database')
    
    const url = new URL(req.url)
    // Don't try to read body again - it's already been consumed
    // Just log the request metadata
    const body = null
    
    await prisma.auditLog.create({
      data: {
        tenantId: context.tenantId,
        userId: context.userId,
        correlationId: context.correlationId,
        action: `${req.method} ${url.pathname}`,
        entityType: url.pathname.split('/')[2] || 'unknown', // e.g., 'batches'
        entityId: url.pathname.split('/')[3] || 'list',
        newData: body || undefined,
        metadata: {
          method: req.method,
          path: url.pathname,
          userAgent: req.headers.get('user-agent'),
        },
      },
    })
  } catch (error) {
    // Silently fail - audit logging should not break the request
    console.error('[Audit] Failed to log entry:', error)
  }
}






