// NightAuditService - API-based night audit management with localStorage fallback

export class NightAuditService {
  private static cache: any[] | null = null
  private static lastFetch: number = 0
  private static CACHE_TTL = 60000 // 1 minute
  
  // Get all audits
  static async getAll(forceRefresh = false): Promise<any[]> {
    if (!forceRefresh && this.cache && Date.now() - this.lastFetch < this.CACHE_TTL) {
      return this.cache
    }
    
    try {
      const res = await fetch('/api/hotel/night-audits')
      if (res.ok) {
        const data = await res.json()
        this.cache = Array.isArray(data) ? data : []
        this.lastFetch = Date.now()
        // Update localStorage as backup
        if (typeof window !== 'undefined') {
          localStorage.setItem('nightAudits', JSON.stringify(this.cache))
        }
        return this.cache
      }
    } catch (e) {
      console.error('Error fetching night audits from API:', e)
    }
    
    // Fallback to localStorage
    return this.getFromLocalStorage()
  }
  
  // Get from localStorage
  static getFromLocalStorage(): any[] {
    if (typeof window === 'undefined') return []
    try {
      return JSON.parse(localStorage.getItem('nightAudits') || '[]')
    } catch {
      return []
    }
  }
  
  // Get audit by date
  static async getByDate(date: string): Promise<any | null> {
    try {
      const res = await fetch(`/api/hotel/night-audits?date=${date}`)
      if (res.ok) {
        return await res.json()
      }
    } catch (e) {
      console.error('Error fetching night audit:', e)
    }
    
    // Fallback
    const audits = this.getFromLocalStorage()
    return audits.find(a => a.date === date) || null
  }
  
  // Check if date is closed
  static async isDateClosed(date: string): Promise<boolean> {
    const audit = await this.getByDate(date)
    return audit !== null && audit.status === 'completed'
  }
  
  // Check if date is closed (sync - for quick checks)
  static isDateClosedSync(date: string): boolean {
    const audits = this.getFromLocalStorage()
    const audit = audits.find(a => a.date === date)
    return audit !== null && audit?.status === 'completed'
  }
  
  // Get last closed date
  static async getLastClosedDate(): Promise<string | null> {
    const audits = await this.getAll()
    const completed = audits
      .filter(a => a.status === 'completed')
      .sort((a, b) => b.date.localeCompare(a.date))
    
    return completed.length > 0 ? completed[0].date : null
  }
  
  // Create/complete night audit
  static async complete(auditData: any): Promise<any> {
    try {
      const res = await fetch('/api/hotel/night-audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...auditData,
          status: 'completed',
          completedAt: new Date().toISOString()
        })
      })
      
      if (res.ok) {
        const saved = await res.json()
        this.invalidateCache()
        this.updateLocalStorage(saved)
        return saved
      }
    } catch (e) {
      console.error('Error completing night audit:', e)
    }
    
    // Fallback: save to localStorage only
    const audit = {
      ...auditData,
      id: auditData.id || `AUDIT-${Date.now()}`,
      status: 'completed',
      completedAt: new Date().toISOString()
    }
    
    const audits = this.getFromLocalStorage()
    const existingIndex = audits.findIndex(a => a.date === audit.date)
    if (existingIndex >= 0) {
      audits[existingIndex] = audit
    } else {
      audits.push(audit)
    }
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('nightAudits', JSON.stringify(audits))
    }
    
    this.invalidateCache()
    return audit
  }
  
  // Reverse night audit
  static async reverse(date: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/hotel/night-audits?date=${date}`, {
        method: 'DELETE'
      })
      
      if (res.ok) {
        this.invalidateCache()
        this.removeFromLocalStorage(date)
        return true
      }
    } catch (e) {
      console.error('Error reversing night audit:', e)
    }
    
    // Fallback: remove from localStorage
    this.removeFromLocalStorage(date)
    this.invalidateCache()
    return true
  }
  
  // Sync localStorage audits to API
  static async syncToApi(): Promise<{ synced: number; errors: string[] }> {
    if (typeof window === 'undefined') {
      return { synced: 0, errors: [] }
    }
    
    const localAudits = this.getFromLocalStorage()
    const results = { synced: 0, errors: [] as string[] }
    
    for (const audit of localAudits) {
      try {
        const res = await fetch('/api/hotel/night-audits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(audit)
        })
        
        if (res.ok) {
          results.synced++
        } else {
          results.errors.push(`${audit.date}: ${res.statusText}`)
        }
      } catch (e: any) {
        results.errors.push(`${audit.date}: ${e.message}`)
      }
    }
    
    this.invalidateCache()
    return results
  }
  
  // Private helpers
  private static invalidateCache() {
    this.cache = null
    this.lastFetch = 0
  }
  
  private static updateLocalStorage(audit: any) {
    if (typeof window === 'undefined') return
    
    try {
      const audits = JSON.parse(localStorage.getItem('nightAudits') || '[]')
      const index = audits.findIndex((a: any) => a.date === audit.date)
      if (index >= 0) {
        audits[index] = audit
      } else {
        audits.push(audit)
      }
      localStorage.setItem('nightAudits', JSON.stringify(audits))
    } catch (e) {
      console.error('Error updating localStorage:', e)
    }
  }
  
  private static removeFromLocalStorage(date: string) {
    if (typeof window === 'undefined') return
    
    try {
      const audits = JSON.parse(localStorage.getItem('nightAudits') || '[]')
      const filtered = audits.filter((a: any) => a.date !== date)
      localStorage.setItem('nightAudits', JSON.stringify(filtered))
    } catch (e) {
      console.error('Error removing from localStorage:', e)
    }
  }
}