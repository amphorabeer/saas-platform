'use client'

import { useSession } from 'next-auth/react'

export interface CurrentUser {
  id: string
  name: string
  email: string
  role: string
  tenantId?: string
}

export function useCurrentUser(): CurrentUser | null {
  const { data: session, status } = useSession()
  
  if (status !== 'authenticated' || !session?.user) {
    return null
  }
  
  return {
    id: (session.user as any).id || '',
    name: session.user.name || '',
    email: session.user.email || '',
    role: (session.user as any).role || 'admin',
    tenantId: (session.user as any).tenantId
  }
}

// For non-hook contexts (services, utilities)
// This provides a sync fallback when hooks can't be used
export function getCurrentUserSync(): CurrentUser | null {
  if (typeof window === 'undefined') return null
  
  try {
    // Try to get from localStorage as fallback for services
    const stored = localStorage.getItem('currentUser')
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
    // Ignore
  }
  
  return null
}

// Get just the user name (most common use case in services)
export function getCurrentUserName(): string {
  const user = getCurrentUserSync()
  return user?.name || 'System'
}