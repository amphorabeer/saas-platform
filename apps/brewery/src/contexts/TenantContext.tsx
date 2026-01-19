'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useSession } from 'next-auth/react'

interface Tenant {
  id: string
  name: string
  code: string
  slug: string
}

interface TenantContextType {
  tenant: Tenant | null
  tenantId: string | null
  isLoading: boolean
}

const TenantContext = createContext<TenantContextType>({
  tenant: null,
  tenantId: null,
  isLoading: true,
})

export function TenantProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()
  const isLoading = status === 'loading'
  
  const tenant = (session?.user as any)?.tenant || null
  const tenantId = (session?.user as any)?.tenantId || null

  return (
    <TenantContext.Provider value={{ tenant, tenantId, isLoading }}>
      {children}
    </TenantContext.Provider>
  )
}

export function useTenant() {
  return useContext(TenantContext)
}
