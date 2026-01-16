'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Redirect old /fermentation URL to /production?tab=tanks
export default function FermentationRedirect() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/production?tab=tanks')
  }, [router])
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary">
      <p className="text-text-muted">გადამისამართება...</p>
    </div>
  )
}