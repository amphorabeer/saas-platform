import moment from 'moment'

/**
 * CompanyService
 * Manages tour companies, credit terms, and company folios
 * Uses API endpoints instead of localStorage
 */

export interface TourCompany {
  id: string
  name: string
  nameEn?: string
  
  // Contact info
  contactPerson: string
  email: string
  phone: string
  
  // Legal info
  taxId: string           // საიდენტიფიკაციო კოდი
  legalAddress: string
  
  // Credit terms
  creditLimit: number     // საკრედიტო ლიმიტი (0 = unlimited)
  paymentTerms: number    // გადახდის ვადა დღეებში (default: 30)
  
  // Status
  isActive: boolean
  createdAt: string
  updatedAt?: string
  
  // Statistics
  totalOrders?: number
  totalRevenue?: number
  outstandingBalance?: number
}

export interface CompanyFolio {
  id: string
  folioNumber: string
  companyId: string
  companyName: string
  
  balance: number
  transactions: any[]
  
  status: 'open' | 'closed'
  openDate: string
  closedDate?: string
}

// Cache for companies
let companiesCache: TourCompany[] = []
let receivablesCache: any[] = []
let lastFetch = 0

export class CompanyService {
  
  // ==================== COMPANY CRUD ====================
  
  /**
   * Get all companies (from API)
   */
  static async fetchAll(): Promise<TourCompany[]> {
    try {
      const res = await fetch('/api/hotel/tour-companies')
      if (res.ok) {
        companiesCache = await res.json()
        lastFetch = Date.now()
        return companiesCache
      }
    } catch (e) {
      console.error('Error fetching companies:', e)
    }
    return companiesCache
  }

  /**
   * Get all companies (sync - from cache)
   */
  static getAll(): TourCompany[] {
    // Trigger async fetch if cache is stale
    if (Date.now() - lastFetch > 30000) {
      this.fetchAll()
    }
    return companiesCache
  }
  
  /**
   * Get active companies only
   */
  static getActive(): TourCompany[] {
    return this.getAll().filter(c => c.isActive !== false)
  }
  
  /**
   * Get company by ID
   */
  static getById(id: string): TourCompany | null {
    const companies = this.getAll()
    return companies.find(c => c.id === id) || null
  }
  
  /**
   * Create new company
   */
  static async create(company: Omit<TourCompany, 'id' | 'createdAt'>): Promise<TourCompany | null> {
    try {
      const res = await fetch('/api/hotel/tour-companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(company)
      })
      if (res.ok) {
        const newCompany = await res.json()
        companiesCache.push(newCompany)
        return newCompany
      }
    } catch (e) {
      console.error('Error creating company:', e)
    }
    return null
  }
  
  /**
   * Update company
   */
  static async update(id: string, updates: Partial<TourCompany>): Promise<TourCompany | null> {
    try {
      const res = await fetch(`/api/hotel/tour-companies?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      if (res.ok) {
        const updated = await res.json()
        companiesCache = companiesCache.map(c => c.id === id ? updated : c)
        return updated
      }
    } catch (e) {
      console.error('Error updating company:', e)
    }
    return null
  }
  
  /**
   * Delete company (soft delete)
   */
  static async delete(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/hotel/tour-companies?id=${id}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        companiesCache = companiesCache.filter(c => c.id !== id)
        return true
      }
    } catch (e) {
      console.error('Error deleting company:', e)
    }
    return false
  }
  
  // ==================== ACCOUNTS RECEIVABLE ====================
  
  /**
   * Fetch accounts receivable from API
   */
  static async fetchAccountsReceivable(): Promise<any[]> {
    try {
      const res = await fetch('/api/hotel/accounts-receivable')
      if (res.ok) {
        receivablesCache = await res.json()
        console.log('[CompanyService] Fetched receivables:', receivablesCache.length, receivablesCache.map((r: any) => ({ id: r.id, amount: r.amount, companyName: r.companyName })))
        return receivablesCache
      }
    } catch (e) {
      console.error('Error fetching receivables:', e)
    }
    return receivablesCache
  }
  
  /**
   * Alias for fetchAccountsReceivable
   */
  static async fetchReceivables(): Promise<any[]> {
    return this.fetchAccountsReceivable()
  }

  /**
   * Get accounts receivable (sync - from cache)
   */
  static getAccountsReceivable(): any[] {
    this.fetchAccountsReceivable() // Trigger async fetch
    return receivablesCache
  }
  
  /**
   * Get pending receivables
   */
  static getPendingReceivables(): any[] {
    return this.getAccountsReceivable().filter(ar => ar.status === 'pending')
  }
  
  /**
   * Get overdue receivables
   */
  static getOverdueReceivables(): any[] {
    const today = moment().format('YYYY-MM-DD')
    return this.getPendingReceivables().filter(ar => ar.dueDate < today)
  }
  
  /**
   * Get receivables by company
   */
  static getReceivablesByCompany(companyId: string): any[] {
    return this.getAccountsReceivable().filter(ar => ar.companyId === companyId)
  }
  
  /**
   * Record payment against receivable
   */
  static async recordPayment(receivableId: string, amount: number, paymentMethod: string): Promise<boolean> {
    try {
      const res = await fetch('/api/hotel/accounts-receivable', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'markPaid',
          id: receivableId,
          amount,
          paymentMethod
        })
      })
      if (res.ok) {
        await this.fetchAccountsReceivable() // Refresh cache
        return true
      }
    } catch (e) {
      console.error('Error recording payment:', e)
    }
    return false
  }
  
  // ==================== STATISTICS ====================
  
  /**
   * Get company statistics
   */
  static getStatistics(companyId: string): {
    totalOrders: number
    totalRevenue: number
    outstandingBalance: number
    overdueAmount: number
    averageOrderValue: number
  } {
    const receivables = this.getReceivablesByCompany(companyId)
    const pending = receivables.filter(ar => ar.status === 'pending' || ar.status === 'partial')
    const overdue = this.getOverdueReceivables().filter(ar => ar.companyId === companyId)
    
    const totalOrders = receivables.length
    const totalRevenue = receivables.reduce((sum, ar) => sum + (ar.amount || 0), 0)
    const outstandingBalance = pending.reduce((sum, ar) => sum + ((ar.amount || 0) - (ar.paidAmount || 0)), 0)
    const overdueAmount = overdue.reduce((sum, ar) => sum + ((ar.amount || 0) - (ar.paidAmount || 0)), 0)
    
    return {
      totalOrders,
      totalRevenue,
      outstandingBalance,
      overdueAmount,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0
    }
  }
  
  /**
   * Get total outstanding balance (all companies)
   */
  static getTotalOutstanding(): number {
    const pending = this.getPendingReceivables()
    return pending.reduce((sum, ar) => sum + ((ar.amount || 0) - (ar.paidAmount || 0)), 0)
  }
  
  /**
   * Get total overdue amount (all companies)
   */
  static getTotalOverdue(): number {
    const overdue = this.getOverdueReceivables()
    return overdue.reduce((sum, ar) => sum + ((ar.amount || 0) - (ar.paidAmount || 0)), 0)
  }

  /**
   * Check credit availability
   */
  static checkCreditAvailable(companyId: string, amount: number): {
    available: boolean
    limit: number
    used: number
    remaining: number
  } {
    const company = this.getById(companyId)
    const stats = this.getStatistics(companyId)
    
    const limit = company?.creditLimit || 0
    const used = stats.outstandingBalance
    const remaining = limit > 0 ? limit - used : Infinity
    
    return {
      available: limit === 0 || (used + amount <= limit),
      limit,
      used,
      remaining: limit > 0 ? remaining : -1 // -1 means unlimited
    }
  }
}