export const SystemLockService = {
  isLocked(): boolean {
    const lockStatus = localStorage.getItem('systemLock')
    if (!lockStatus) return false
    
    const lock = JSON.parse(lockStatus)
    // Check if lock is still valid (max 30 minutes)
    const lockAge = Date.now() - lock.timestamp
    if (lockAge > 30 * 60 * 1000) {
      this.unlock() // Auto-unlock after 30 minutes
      return false
    }
    
    return lock.isLocked
  },
  
  lock(userId: string, reason: string = 'Night Audit in Progress') {
    const lockData = {
      isLocked: true,
      lockedBy: userId,
      reason: reason,
      timestamp: Date.now()
    }
    localStorage.setItem('systemLock', JSON.stringify(lockData))
    
    // Broadcast lock to all tabs
    window.dispatchEvent(new CustomEvent('systemLockChanged', { 
      detail: { locked: true, reason } 
    }))
  },
  
  unlock() {
    localStorage.removeItem('systemLock')
    
    // Broadcast unlock to all tabs
    window.dispatchEvent(new CustomEvent('systemLockChanged', { 
      detail: { locked: false } 
    }))
  },
  
  getLockInfo() {
    const lockStatus = localStorage.getItem('systemLock')
    return lockStatus ? JSON.parse(lockStatus) : null
  }
}



