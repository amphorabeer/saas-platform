import { UserRole } from '@saas-platform/database'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: UserRole
      tenantId: string
      tenantName: string
      tenantSlug: string
    }
  }
  
  interface User {
    id: string
    email: string
    name: string
    role: UserRole
    tenantId: string
    tenantName: string
    tenantSlug: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: UserRole
    tenantId: string
    tenantName: string
    tenantSlug: string
  }
}



















