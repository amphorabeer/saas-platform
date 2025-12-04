'use client'

import { useState, useEffect } from 'react'
import { SystemLockService } from '../lib/systemLockService'

export default function SystemLockOverlay() {
  const [isLocked, setIsLocked] = useState(false)
  const [lockInfo, setLockInfo] = useState<any>(null)
  
  useEffect(() => {
    // Check initial lock status
    checkLockStatus()
    
    // Listen for lock changes
    const handleLockChange = (e: any) => {
      checkLockStatus()
    }
    
    window.addEventListener('systemLockChanged', handleLockChange)
    
    // Poll for lock status (for multi-tab sync)
    const interval = setInterval(checkLockStatus, 2000)
    
    return () => {
      window.removeEventListener('systemLockChanged', handleLockChange)
      clearInterval(interval)
    }
  }, [])
  
  const checkLockStatus = () => {
    const locked = SystemLockService.isLocked()
    setIsLocked(locked)
    if (locked) {
      setLockInfo(SystemLockService.getLockInfo())
    }
  }
  
  if (!isLocked) return null
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-[9999] flex items-center justify-center">
      <div className="bg-white rounded-lg p-8 max-w-md text-center">
        <div className="mb-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto"></div>
        </div>
        
        <h2 className="text-2xl font-bold mb-4">🔒 სისტემა დროებით დაბლოკილია</h2>
        
        <div className="space-y-2 text-gray-600">
          <p className="font-medium">{lockInfo?.reason || 'დღის დახურვა მიმდინარეობს'}</p>
          <p className="text-sm">დაბლოკა: {lockInfo?.lockedBy || 'ადმინისტრატორი'}</p>
          <p className="text-xs text-gray-400">
            გთხოვთ დაელოდოთ პროცესის დასრულებას...
          </p>
        </div>
        
        <div className="mt-6 flex justify-center">
          <div className="flex items-center gap-2 text-blue-500">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
            </span>
            <span className="text-sm">მიმდინარეობს...</span>
          </div>
        </div>
      </div>
    </div>
  )
}



