import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname
    
    // Allow public paths
    const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/api/auth', '/api/register', '/api/tenants/validate-code']
    if (publicPaths.some(p => path.startsWith(p))) {
      return NextResponse.next()
    }
    
    // Check if authenticated
    if (!token) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('callbackUrl', path)
      return NextResponse.redirect(loginUrl)
    }
    
    // Add tenant ID to request headers for API routes
    const response = NextResponse.next()
    if (token.tenantId) {
      response.headers.set('x-tenant-id', token.tenantId as string)
    }
    
    return response
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname
        
        // Allow public paths
        const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/api/auth', '/api/register', '/api/tenants/validate-code']
        if (publicPaths.some(p => path.startsWith(p))) {
          return true
        }
        
        // Require token for everything else
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    // Match all paths except static files
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}









