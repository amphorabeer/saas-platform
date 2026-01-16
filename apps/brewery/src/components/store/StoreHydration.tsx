'use client'

import { useEffect, useState } from 'react'

/**
 * Component to handle Zustand store hydration
 * Prevents hydration mismatches by rehydrating stores only on client side
 */
export function StoreHydration({ children }: { children: React.ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  if (!isHydrated) {
    return null
  }

  return <>{children}</>
}
