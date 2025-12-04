export interface FolioRoutingRule {
  id: string
  sourceFolioId: string
  targetFolioId: string
  
  // Rule Details
  name: string
  priority: number // Higher priority rules apply first
  
  // What to route
  routingType: 'all' | 'room' | 'extras' | 'packages' | 'specific' | 'percentage'
  specificCategories?: string[] // For 'specific' type
  percentage?: number // For percentage routing (e.g., 50%)
  
  // When to apply
  startDate: string
  endDate: string
  
  // Conditions
  maxAmount?: number // Max amount to route
  minAmount?: number // Min amount to route
  
  // Status
  active: boolean
  createdBy: string
  createdAt: string
}

export interface CompanyFolio {
  id: string
  folioNumber: string
  companyName: string
  companyId: string
  
  // Contact
  contactPerson: string
  contactEmail: string
  contactPhone: string
  
  // Billing
  billingAddress: string
  taxNumber: string
  
  // Credit
  creditLimit: number
  creditUsed: number
  paymentTerms: number // Days
  
  // Linked reservations
  linkedReservations: string[]
  
  // Transactions
  balance: number
  transactions: any[]
  
  status: 'open' | 'closed' | 'suspended'
}

export interface FolioWindow {
  id: string
  reservationId: string
  windowNumber: number // 1, 2, 3, etc.
  windowName: string // "Room & Tax", "Extras", "Company"
  
  balance: number
  transactions: any[]
  
  // Routing
  routingRules?: FolioRoutingRule[]
  
  status: 'open' | 'closed'
}



