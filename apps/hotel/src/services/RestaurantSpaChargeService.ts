import moment from 'moment'
import { FolioService } from './FolioService'

/**
 * RestaurantSpaChargeService
 * Handles all payment scenarios for Restaurant and Spa:
 * 1. Hotel Guest - Room Charge (adds to Folio)
 * 2. Walk-in - Direct Payment (Cash/Card to Cashier)
 * 3. Tour Company - Invoice (Company Folio with credit terms)
 */

export interface ChargeItem {
  id: string
  name: string
  quantity: number
  unitPrice: number
  total: number
  category: 'food' | 'beverage' | 'spa' | 'beer_tasting' | 'group_menu'
}

export interface ChargeRequest {
  // Source info
  sourceType: 'restaurant' | 'spa'
  sourceId: string  // orderId or bookingId
  sourceRef: string // Order number or booking ref
  
  // Customer type
  customerType: 'hotel_guest' | 'walk_in' | 'tour_company'
  
  // Hotel guest info
  roomNumber?: string
  reservationId?: string
  guestName?: string
  
  // Company info
  companyId?: string
  companyName?: string
  
  // Items
  items: ChargeItem[]
  subtotal: number
  tax: number
  serviceCharge: number
  total: number
  
  // Payment (for walk-in)
  paymentMethod?: 'cash' | 'card' | 'bank'
  
  // Notes
  notes?: string
}

export interface ChargeResult {
  success: boolean
  transactionId?: string
  folioId?: string
  invoiceId?: string
  error?: string
}

export class RestaurantSpaChargeService {
  
  /**
   * Process charge based on customer type
   */
  static async processCharge(request: ChargeRequest): Promise<ChargeResult> {
    switch (request.customerType) {
      case 'hotel_guest':
        return this.chargeToRoom(request)
      case 'walk_in':
        return this.processDirectPayment(request)
      case 'tour_company':
        return this.chargeToCompany(request)
      default:
        return { success: false, error: 'Unknown customer type' }
    }
  }
  
  /**
   * Charge to hotel room (adds to guest's folio)
   */
  static async chargeToRoom(request: ChargeRequest): Promise<ChargeResult> {
    try {
      if (!request.reservationId) {
        return { success: false, error: 'Reservation ID required for room charge' }
      }
      
      // Get folio for reservation
      let folio = FolioService.getFolioByReservationId(request.reservationId)
      
      if (!folio) {
        // Try to find reservation and create folio
        const reservations = await this.getReservations()
        const reservation = reservations.find((r: any) => 
          r.id === request.reservationId || 
          r.roomNumber === request.roomNumber ||
          r.roomId === request.roomNumber
        )
        
        if (!reservation) {
          return { success: false, error: 'Reservation not found' }
        }
        
        folio = FolioService.createEmptyFolio(reservation)
        if (!folio) {
          return { success: false, error: 'Failed to create folio' }
        }
      }
      
      // Determine category based on source and items
      const mainCategory = this.determineCategory(request)
      
      // Create transaction
      const transactionId = `${request.sourceType.toUpperCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      // Build description
      const description = this.buildDescription(request)
      
      // Calculate new balance
      const currentBalance = folio.transactions.reduce((sum: number, t: any) => {
        return sum + (Number(t.debit) || 0) - (Number(t.credit) || 0)
      }, 0)
      const newBalance = currentBalance + request.total
      
      const transaction = {
        id: transactionId,
        folioId: folio.id,
        date: moment().format('YYYY-MM-DD'),
        time: moment().format('HH:mm:ss'),
        
        type: 'charge',
        category: mainCategory,
        description: description,
        
        debit: request.total,
        credit: 0,
        balance: newBalance,
        
        // Source details
        sourceType: request.sourceType,
        sourceId: request.sourceId,
        sourceRef: request.sourceRef,
        
        // Item breakdown
        items: request.items,
        subtotal: request.subtotal,
        tax: request.tax,
        serviceCharge: request.serviceCharge,
        
        postedBy: 'POS System',
        postedAt: moment().format(),
        referenceId: `${request.sourceType.toUpperCase()}-${request.sourceRef}`
      }
      
      // Add to folio
      folio.transactions.push(transaction)
      folio.balance = newBalance
      
      // Save folio
      FolioService.saveFolio(folio)
      
      // Log for debugging
      console.log(`[RestaurantSpaChargeService] Room charge added:`, {
        room: request.roomNumber,
        amount: request.total,
        category: mainCategory,
        folioId: folio.id
      })
      
      return {
        success: true,
        transactionId,
        folioId: folio.id
      }
      
    } catch (error: any) {
      console.error('[RestaurantSpaChargeService] Room charge error:', error)
      return { success: false, error: error.message }
    }
  }
  
  /**
   * Process direct payment (walk-in customer)
   * Goes directly to cashier
   */
  static async processDirectPayment(request: ChargeRequest): Promise<ChargeResult> {
    try {
      const transactionId = `WALKIN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const mainCategory = this.determineCategory(request)
      const description = this.buildDescription(request)
      
      // Create payment record for cashier
      const paymentRecord = {
        id: transactionId,
        date: moment().format('YYYY-MM-DD'),
        time: moment().format('HH:mm:ss'),
        
        type: 'income',
        category: mainCategory,
        description: description,
        
        amount: request.total,
        method: request.paymentMethod || 'cash',
        
        // Source details
        sourceType: request.sourceType,
        sourceId: request.sourceId,
        sourceRef: request.sourceRef,
        customerType: 'walk_in',
        
        // Item breakdown
        items: request.items,
        subtotal: request.subtotal,
        tax: request.tax,
        serviceCharge: request.serviceCharge,
        
        postedBy: 'POS System',
        postedAt: moment().format()
      }
      
      // Add to payment history (for financial reports)
      this.addToPaymentHistory(paymentRecord)
      
      // Add to cashier transactions
      this.addToCashierTransactions(paymentRecord)
      
      // Add to daily revenue tracking
      this.addToDailyRevenue(paymentRecord)
      
      console.log(`[RestaurantSpaChargeService] Walk-in payment:`, {
        amount: request.total,
        method: request.paymentMethod,
        category: mainCategory
      })
      
      return {
        success: true,
        transactionId
      }
      
    } catch (error: any) {
      console.error('[RestaurantSpaChargeService] Direct payment error:', error)
      return { success: false, error: error.message }
    }
  }
  
  /**
   * Charge to company (creates invoice with credit terms)
   */
  static async chargeToCompany(request: ChargeRequest): Promise<ChargeResult> {
    try {
      if (!request.companyId) {
        return { success: false, error: 'Company ID required' }
      }
      
      // Get or create company folio
      const companyFolio = await this.getOrCreateCompanyFolio(request.companyId, request.companyName)
      
      if (!companyFolio) {
        return { success: false, error: 'Failed to get company folio' }
      }
      
      // Check credit limit
      const company = this.getCompany(request.companyId)
      if (company?.creditLimit && company.creditLimit > 0) {
        const currentBalance = companyFolio.balance || 0
        if (currentBalance + request.total > company.creditLimit) {
          return { 
            success: false, 
            error: `Credit limit exceeded. Limit: ₾${company.creditLimit}, Current: ₾${currentBalance}, Requested: ₾${request.total}` 
          }
        }
      }
      
      const transactionId = `COMP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const mainCategory = this.determineCategory(request)
      const description = this.buildDescription(request)
      
      // Calculate new balance
      const newBalance = (companyFolio.balance || 0) + request.total
      
      const transaction = {
        id: transactionId,
        folioId: companyFolio.id,
        date: moment().format('YYYY-MM-DD'),
        time: moment().format('HH:mm:ss'),
        
        type: 'charge',
        category: mainCategory,
        description: description,
        
        debit: request.total,
        credit: 0,
        balance: newBalance,
        
        // Source details
        sourceType: request.sourceType,
        sourceId: request.sourceId,
        sourceRef: request.sourceRef,
        
        // Company info
        companyId: request.companyId,
        companyName: request.companyName,
        
        // Item breakdown
        items: request.items,
        subtotal: request.subtotal,
        tax: request.tax,
        serviceCharge: request.serviceCharge,
        
        // Invoice info
        invoiceRequired: true,
        invoiceDueDate: moment().add(company?.paymentTerms || 30, 'days').format('YYYY-MM-DD'),
        
        postedBy: 'POS System',
        postedAt: moment().format()
      }
      
      // Add to company folio
      companyFolio.transactions.push(transaction)
      companyFolio.balance = newBalance
      
      // Save company folio
      this.saveCompanyFolio(companyFolio)
      
      // Add to accounts receivable
      this.addToAccountsReceivable({
        transactionId,
        companyId: request.companyId,
        companyName: request.companyName || '',
        amount: request.total,
        dueDate: transaction.invoiceDueDate,
        status: 'pending'
      })
      
      // Generate invoice number
      const invoiceId = this.generateInvoiceNumber()
      
      // Create invoice record
      await this.createInvoice({
        id: invoiceId,
        transactionId,
        companyId: request.companyId,
        companyName: request.companyName || '',
        items: request.items,
        subtotal: request.subtotal,
        tax: request.tax,
        serviceCharge: request.serviceCharge,
        total: request.total,
        dueDate: transaction.invoiceDueDate,
        status: 'pending',
        sourceType: request.sourceType || 'restaurant'
      })
      
      console.log(`[RestaurantSpaChargeService] Company charge:`, {
        company: request.companyName,
        amount: request.total,
        invoiceId,
        dueDate: transaction.invoiceDueDate
      })
      
      return {
        success: true,
        transactionId,
        folioId: companyFolio.id,
        invoiceId
      }
      
    } catch (error: any) {
      console.error('[RestaurantSpaChargeService] Company charge error:', error)
      return { success: false, error: error.message }
    }
  }
  
  // ==================== HELPER METHODS ====================
  
  /**
   * Determine main category from items
   */
  private static determineCategory(request: ChargeRequest): string {
    if (request.sourceType === 'spa') return 'spa'
    
    // Check items for category
    const categories = request.items.map(i => i.category)
    if (categories.includes('beer_tasting')) return 'beverage'
    if (categories.includes('beverage')) return 'beverage'
    if (categories.includes('food') || categories.includes('group_menu')) return 'food'
    
    return 'food' // default for restaurant
  }
  
  /**
   * Build transaction description
   */
  private static buildDescription(request: ChargeRequest): string {
    const source = request.sourceType === 'restaurant' ? 'რესტორანი' : 'სპა'
    const itemCount = request.items.length
    
    if (request.customerType === 'hotel_guest') {
      return `${source} - ოთახი ${request.roomNumber} (${itemCount} პოზიცია)`
    } else if (request.customerType === 'tour_company') {
      return `${source} - ${request.companyName} (${itemCount} პოზიცია)`
    } else {
      return `${source} - Walk-in (${itemCount} პოზიცია)`
    }
  }
  
  /**
   * Get reservations from API or localStorage
   */
  private static async getReservations(): Promise<any[]> {
    try {
      const response = await fetch('/api/hotel/reservations')
      if (response.ok) {
        return await response.json()
      }
    } catch (e) {
      console.error('Error fetching reservations:', e)
    }
    
    if (typeof window !== 'undefined') {
      return JSON.parse(localStorage.getItem('hotelReservations') || '[]')
    }
    return []
  }
  
  /**
   * Add to payment history
   */
  private static addToPaymentHistory(record: any) {
    if (typeof window === 'undefined') return
    
    const history = JSON.parse(localStorage.getItem('paymentHistory') || '[]')
    history.push({
      ...record,
      credit: record.amount,
      debit: 0
    })
    localStorage.setItem('paymentHistory', JSON.stringify(history))
  }
  
  /**
   * Add to cashier transactions (manual transactions)
   */
  private static addToCashierTransactions(record: any) {
    if (typeof window === 'undefined') return
    
    const transactions = JSON.parse(localStorage.getItem('cashierManualTransactions') || '[]')
    transactions.push({
      ...record,
      manual: false, // Not manual, from POS
      source: record.sourceType
    })
    localStorage.setItem('cashierManualTransactions', JSON.stringify(transactions))
  }
  
  /**
   * Add to daily revenue (for reports)
   */
  private static addToDailyRevenue(record: any) {
    if (typeof window === 'undefined') return
    
    // Create a virtual folio transaction for revenue tracking
    const folios = JSON.parse(localStorage.getItem('hotelFolios') || '[]')
    
    // Find or create "Walk-in Sales" folio
    let walkInFolio = folios.find((f: any) => f.id === 'WALKIN-FOLIO')
    
    if (!walkInFolio) {
      walkInFolio = {
        id: 'WALKIN-FOLIO',
        folioNumber: 'WALK-IN',
        reservationId: 'WALK-IN',
        guestName: 'Walk-in Sales',
        roomNumber: '-',
        balance: 0,
        status: 'open',
        openDate: moment().format('YYYY-MM-DD'),
        transactions: []
      }
      folios.push(walkInFolio)
    }
    
    // Add transaction
    walkInFolio.transactions.push({
      id: record.id,
      date: record.date,
      time: record.time,
      type: 'charge',
      category: record.category,
      description: record.description,
      debit: record.amount,
      credit: 0,
      balance: (walkInFolio.balance || 0) + record.amount,
      sourceType: record.sourceType,
      postedBy: record.postedBy,
      postedAt: record.postedAt
    })
    
    // Add payment transaction (to zero out balance)
    walkInFolio.transactions.push({
      id: `PAY-${record.id}`,
      date: record.date,
      time: record.time,
      type: 'payment',
      category: 'payment',
      description: `გადახდა - ${record.method === 'cash' ? 'ნაღდი' : record.method === 'card' ? 'ბარათი' : 'ბანკი'}`,
      debit: 0,
      credit: record.amount,
      balance: walkInFolio.balance, // Balance stays same after payment
      paymentMethod: record.method,
      postedBy: record.postedBy,
      postedAt: record.postedAt
    })
    
    localStorage.setItem('hotelFolios', JSON.stringify(folios))
  }
  
  /**
   * Get company by ID
   */
  private static getCompany(companyId: string): any {
    if (typeof window === 'undefined') return null
    
    const companies = JSON.parse(localStorage.getItem('tourCompanies') || '[]')
    return companies.find((c: any) => c.id === companyId)
  }
  
  /**
   * Get or create company folio
   */
  private static async getOrCreateCompanyFolio(companyId: string, companyName?: string): Promise<any> {
    if (typeof window === 'undefined') return null
    
    const companyFolios = JSON.parse(localStorage.getItem('companyFolios') || '[]')
    let folio = companyFolios.find((f: any) => f.companyId === companyId)
    
    if (!folio) {
      const company = this.getCompany(companyId)
      folio = {
        id: `COMP-FOLIO-${companyId}-${Date.now()}`,
        folioNumber: `C${moment().format('YYMMDD')}-${companyId.slice(-4)}`,
        companyId,
        companyName: companyName || company?.name || 'Unknown Company',
        balance: 0,
        transactions: [],
        status: 'open',
        openDate: moment().format('YYYY-MM-DD')
      }
      companyFolios.push(folio)
      localStorage.setItem('companyFolios', JSON.stringify(companyFolios))
    }
    
    return folio
  }
  
  /**
   * Save company folio
   */
  private static saveCompanyFolio(folio: any) {
    if (typeof window === 'undefined') return
    
    const companyFolios = JSON.parse(localStorage.getItem('companyFolios') || '[]')
    const index = companyFolios.findIndex((f: any) => f.id === folio.id)
    
    if (index >= 0) {
      companyFolios[index] = folio
    } else {
      companyFolios.push(folio)
    }
    
    localStorage.setItem('companyFolios', JSON.stringify(companyFolios))
  }
  
  /**
   * Add to accounts receivable
   */
  private static addToAccountsReceivable(record: any) {
    if (typeof window === 'undefined') return
    
    const ar = JSON.parse(localStorage.getItem('accountsReceivable') || '[]')
    ar.push({
      ...record,
      createdAt: moment().format(),
      paidAmount: 0
    })
    localStorage.setItem('accountsReceivable', JSON.stringify(ar))
  }
  
  /**
   * Generate invoice number
   */
  private static generateInvoiceNumber(): string {
    const date = moment().format('YYMMDD')
    const seq = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `INV-${date}-${seq}`
  }
  
  /**
   * Create invoice record
   */
  private static async createInvoice(invoice: any) {
    try {
      // Save to API (Neon database)
      const sourceType = invoice.sourceType || 'restaurant'
      const response = await fetch('/api/hotel/company-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: invoice.companyId,
          items: invoice.items.map((item: any) => ({
            description: item.name || item.description,
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || item.price || 0,
            total: item.total || 0
          })),
          subtotal: invoice.subtotal || 0,
          tax: invoice.tax || 0,
          serviceCharge: invoice.serviceCharge || 0,
          total: invoice.total || 0,
          dueDate: invoice.dueDate,
          notes: `[${sourceType}] Transaction: ${invoice.transactionId}`
        })
      })
      
      if (response.ok) {
        const created = await response.json()
        console.log('[RestaurantSpaChargeService] Invoice created in API:', created.invoiceNumber)
        
        // Also create accounts receivable entry
        try {
          await fetch('/api/hotel/accounts-receivable', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              companyId: invoice.companyId,
              invoiceId: created.id,
              amount: invoice.total || 0,
              dueDate: invoice.dueDate,
              description: `Invoice: ${created.invoiceNumber || created.id}`,
              sourceType: invoice.sourceType || 'restaurant',
              sourceRef: invoice.transactionId
            })
          })
          console.log('[RestaurantSpaChargeService] Accounts receivable created')
        } catch (arError) {
          console.error('[RestaurantSpaChargeService] Failed to create accounts receivable:', arError)
        }
        
        return created
      } else {
        console.error('[RestaurantSpaChargeService] Failed to create invoice:', await response.text())
      }
    } catch (e) {
      console.error('[RestaurantSpaChargeService] Error creating invoice:', e)
    }
    
    // Fallback to localStorage if API fails
    if (typeof window !== 'undefined') {
      const invoices = JSON.parse(localStorage.getItem('invoices') || '[]')
      invoices.push({
        ...invoice,
        createdAt: moment().format(),
        number: invoice.id
      })
      localStorage.setItem('invoices', JSON.stringify(invoices))
    }
  }
  
  // ==================== PUBLIC UTILITY METHODS ====================
  
  /**
   * Get checked-in reservations (for room selection dropdown)
   */
  static async getCheckedInReservations(): Promise<any[]> {
    const reservations = await this.getReservations()
    return reservations.filter((r: any) => 
      r.status === 'CHECKED_IN' || r.status === 'OCCUPIED'
    )
  }
  
  /**
   * Get active companies (for company selection dropdown)
   */
  static getActiveCompanies(): any[] {
    if (typeof window === 'undefined') return []
    
    const companies = JSON.parse(localStorage.getItem('tourCompanies') || '[]')
    return companies.filter((c: any) => c.isActive !== false)
  }
  
  /**
   * Find reservation by room number
   */
  static async findReservationByRoom(roomNumber: string): Promise<any | null> {
    const reservations = await this.getCheckedInReservations()
    return reservations.find((r: any) => 
      r.roomNumber === roomNumber || 
      r.roomId === roomNumber
    ) || null
  }
}