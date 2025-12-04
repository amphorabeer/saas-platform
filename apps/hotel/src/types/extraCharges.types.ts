export interface ExtraChargeCategory {
  id: string
  code: string
  name: string
  icon: string
  department: string
  
  // Accounting
  accountCode: string
  taxRate: number
  serviceChargeRate?: number
  
  // Rules
  requiresAuthorization?: boolean
  maxAmountWithoutAuth?: number
  allowNegative?: boolean
}

export interface ExtraChargeItem {
  id: string
  categoryId: string
  code: string
  name: string
  
  // Pricing
  unitPrice: number
  unit: 'piece' | 'hour' | 'day' | 'km' | 'person' | 'service'
  
  // Availability
  available: boolean
  availableFrom?: string
  availableUntil?: string
  
  // Stock (if applicable)
  trackStock?: boolean
  currentStock?: number
  
  // Department
  department: string
  pointOfSale?: string
}

export interface ExtraChargePosting {
  id: string
  folioId: string
  reservationId: string
  
  // Item details
  itemId: string
  itemName: string
  categoryId: string
  
  // Quantity & Amount
  quantity: number
  unitPrice: number
  grossAmount: number
  taxAmount: number
  netAmount: number
  
  // Posting details
  postedDate: string
  postedTime: string
  postedBy: string
  
  // Department
  department: string
  pointOfSale?: string
  
  // Reference
  reference?: string
  notes?: string
  
  // Status
  status: 'posted' | 'void' | 'adjusted'
  voidReason?: string
}



