import moment from 'moment'

export class PaymentService {
  
  // Payment methods configuration
  static readonly PAYMENT_METHODS = [
    { id: 'cash', name: 'Cash', icon: '💵', requiresReference: false },
    { id: 'card', name: 'Credit Card', icon: '💳', requiresReference: true },
    { id: 'debit', name: 'Debit Card', icon: '💳', requiresReference: true },
    { id: 'bank', name: 'Bank Transfer', icon: '🏦', requiresReference: true },
    { id: 'online', name: 'Online Payment', icon: '🌐', requiresReference: true },
    { id: 'company', name: 'Company Account', icon: '🏢', requiresReference: false },
    { id: 'voucher', name: 'Voucher', icon: '🎟️', requiresReference: true },
    { id: 'deposit', name: 'From Deposit', icon: '💰', requiresReference: false }
  ]
  
  // Process payment
  static async processPayment(params: {
    reservationId: string
    amount: number
    method: string
    reference?: string
    notes?: string
    isDeposit?: boolean
    isRefund?: boolean
  }) {
    try {
      if (typeof window === 'undefined') {
        return { success: false, error: 'Not in browser environment' }
      }
      
      // Get or create folio
      const folios = JSON.parse(localStorage.getItem('hotelFolios') || '[]')
      let folio = folios.find((f: any) => f.reservationId === params.reservationId)
      
      if (!folio) {
        // Get reservation details
        const reservationsResponse = await fetch('/api/hotel/reservations')
        const reservations = await reservationsResponse.json()
        const reservation = reservations.find((r: any) => r.id === params.reservationId)
        
        if (!reservation) {
          throw new Error('Reservation not found')
        }
        
        // Create folio
        folio = {
          id: `FOLIO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          folioNumber: `F${moment().format('YYMMDD')}-${reservation.roomNumber || reservation.roomId || Math.floor(Math.random() * 1000)}-${params.reservationId}`,
          reservationId: params.reservationId,
          guestName: reservation.guestName,
          roomNumber: reservation.roomNumber || reservation.roomId,
          balance: 0,
          creditLimit: 5000,
          paymentMethod: 'cash',
          status: 'open',
          openDate: reservation.checkIn || moment().format('YYYY-MM-DD'),
          transactions: [],
          totalDeposit: 0
        }
        folios.push(folio)
      }
      
      // Recalculate balance from existing transactions first
      const currentBalance = folio.transactions.reduce((balance, trx) => {
        return balance + (trx.debit || 0) - (trx.credit || 0)
      }, 0)
      
      // Calculate new balance
      const newBalance = params.isRefund 
        ? currentBalance + params.amount 
        : currentBalance - params.amount
      
      // Create payment transaction
      const transaction = {
        id: `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        folioId: folio.id,
        date: moment().format('YYYY-MM-DD'),
        time: moment().format('HH:mm:ss'),
        
        type: params.isRefund ? 'refund' : 'payment',
        category: 'payment',
        description: this.generateDescription(params),
        
        debit: params.isRefund ? params.amount : 0,
        credit: params.isRefund ? 0 : params.amount,
        balance: newBalance,
        
        paymentMethod: params.method,
        reference: params.reference,
        notes: params.notes,
        isDeposit: params.isDeposit,
        
        postedBy: typeof window !== 'undefined' 
          ? JSON.parse(localStorage.getItem('currentUser') || '{}').name || 'User'
          : 'User',
        postedAt: moment().format(),
        referenceId: `PAY-${params.reservationId}-${Date.now()}`
      }
      
      // Update folio
      folio.transactions.push(transaction)
      folio.balance = newBalance
      
      // Track deposits separately
      if (params.isDeposit) {
        folio.totalDeposit = (folio.totalDeposit || 0) + params.amount
      }
      
      // Save folio
      const folioIndex = folios.findIndex((f: any) => f.id === folio.id)
      if (folioIndex >= 0) {
        folios[folioIndex] = folio
      } else {
        folios.push(folio)
      }
      localStorage.setItem('hotelFolios', JSON.stringify(folios))
      
      // Save to payment history
      const paymentHistory = JSON.parse(localStorage.getItem('paymentHistory') || '[]')
      paymentHistory.push({
        ...transaction,
        reservationId: params.reservationId,
        guestName: folio.guestName,
        roomNumber: folio.roomNumber
      })
      localStorage.setItem('paymentHistory', JSON.stringify(paymentHistory))
      
      return {
        success: true,
        transaction,
        newBalance: folio.balance,
        folio
      }
      
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error'
      }
    }
  }
  
  // Generate payment description
  static generateDescription(params: any): string {
    const method = this.PAYMENT_METHODS.find(m => m.id === params.method)
    const methodName = method?.name || params.method
    
    if (params.isRefund) {
      return `Refund via ${methodName}`
    }
    if (params.isDeposit) {
      return `Deposit via ${methodName}`
    }
    return `Payment via ${methodName}`
  }
  
  // Get payment statistics for a date
  static getPaymentStats(date: string) {
    if (typeof window === 'undefined') {
      return {
        total: 0,
        byMethod: {},
        deposits: 0,
        refunds: 0,
        regular: 0
      }
    }
    
    const paymentHistory = JSON.parse(localStorage.getItem('paymentHistory') || '[]')
    const dayPayments = paymentHistory.filter((p: any) => p.date === date)
    
    const stats = {
      total: 0,
      byMethod: {} as Record<string, number>,
      deposits: 0,
      refunds: 0,
      regular: 0
    }
    
    dayPayments.forEach((payment: any) => {
      if (payment.type === 'refund') {
        stats.refunds += payment.debit
      } else {
        stats.total += payment.credit
        
        if (payment.isDeposit) {
          stats.deposits += payment.credit
        } else {
          stats.regular += payment.credit
        }
        
        const method = payment.paymentMethod || 'cash'
        stats.byMethod[method] = (stats.byMethod[method] || 0) + payment.credit
      }
    })
    
    return stats
  }
}

