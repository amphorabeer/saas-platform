import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname
    
    // Allow public paths
    if (path.startsWith('/login') || path.startsWith('/api/auth')) {
      return NextResponse.next()
    }
    
    // Check if authenticated
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    
    // Check tenant is active (from token)
    // In production: verify against DB periodically
    
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow auth routes
        if (req.nextUrl.pathname.startsWith('/api/auth')) {
          return true
        }
        // Allow login page
        if (req.nextUrl.pathname === '/login') {
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









