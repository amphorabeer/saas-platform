import { getToken } from 'next-auth/jwt'
import { NextRequest, NextResponse } from 'next/server'
import { hasPermission, Permission } from './rbac'
import { UserRole } from '@saas-platform/database'

/**
 * Auth middleware for API routes
 */
export async function withAuth(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  
  if (!token) {
    return {
      authenticated: false,
      response: NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      ),
    }
  }
  
  return {
    authenticated: true,
    user: {
      id: token.id as string,
      email: token.email as string,
      name: token.name as string,
      role: token.role as UserRole,
      tenantId: token.tenantId as string,
      tenantName: token.tenantName as string,
      tenantSlug: token.tenantSlug as string,
    },
  }
}

/**
 * Check permission middleware
 */
export function requirePermission(permission: Permission) {
  return async (req: NextRequest) => {
    const auth = await withAuth(req)
    
    if (!auth.authenticated) {
      return auth
    }
    
    if (!hasPermission(auth.user!.role, permission)) {
      return {
        authenticated: true,
        authorized: false,
        response: NextResponse.json(
          { 
            error: { 
              code: 'FORBIDDEN', 
              message: `Permission denied: ${permission}` 
            } 
          },
          { status: 403 }
        ),
      }
    }
    
    return {
      authenticated: true,
      authorized: true,
      user: auth.user,
    }
  }
}



















