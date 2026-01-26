export interface Folio {
  id: string
  folioNumber: string
  reservationId: string
  guestName: string
  roomNumber: string
  
  // Financial
  balance: number
  creditLimit: number
  paymentMethod: 'cash' | 'card' | 'bank' | 'company' | 'agency'
  
  // Status
  status: 'open' | 'closed' | 'suspended' | 'disputed'
  openDate: string
  closeDate?: string
  
  // Dates from reservation
  checkIn?: string
  checkOut?: string
  
  // Transactions
  transactions: FolioTransaction[]
  
  // Routing
  routingInstructions?: RoutingRule[]
  masterFolioId?: string // For split folios
  companyId?: string
}

export interface FolioTransaction {
  id: string
  folioId: string
  date: string
  time: string
  
  // Transaction Details
  type: 'charge' | 'payment' | 'adjustment' | 'transfer'
  category: 'room' | 'tax' | 'food' | 'beverage' | 'extras' | 'payment'
  description: string
  
  // Amounts
  debit: number  // Charges
  credit: number // Payments
  balance: number // Running balance
  
  // Posting Details
  postedBy: string
  postedAt: string
  nightAuditDate?: string
  
  // References
  referenceId?: string // Room charge ID, payment ID, etc.
  taxDetails?: TaxBreakdown[]
}

export interface TaxBreakdown {
  taxType: 'VAT' | 'CITY_TAX' | 'TOURISM_TAX' | 'SERVICE'
  rate: number
  amount: number
  base: number
}

export interface RoutingRule {
  id: string
  folioId: string
  targetFolioId: string
  
  routeType: 'all' | 'room' | 'extras' | 'specific'
  specificCategories?: string[]
  
  startDate: string
  endDate: string
  
  active: boolean
}