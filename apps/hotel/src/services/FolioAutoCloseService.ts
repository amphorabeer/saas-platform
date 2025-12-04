import moment from 'moment'

export class FolioAutoCloseService {
  
  // Auto-close zero balance folios during Night Audit
  static async autoCloseFolios(auditDate: string) {
    const results = {
      closed: 0,
      skipped: 0,
      errors: 0,
      details: [] as any[]
    }
    
    try {
      if (typeof window === 'undefined') return results
      
      const folios = JSON.parse(localStorage.getItem('hotelFolios') || '[]')
      const reservations = await fetch('/api/hotel/reservations').then(r => r.json())
      
      for (const folio of folios) {
        // Skip already closed folios
        if (folio.status === 'closed') {
          results.skipped++
          continue
        }
        
        // Get reservation
        const reservation = reservations.find((r: any) => r.id === folio.reservationId)
        if (!reservation) {
          results.skipped++
          continue
        }
        
        // Check if should close
        const shouldClose = this.shouldCloseFolio(folio, reservation, auditDate)
        
        if (shouldClose.close) {
          const closeResult = await this.closeFolio(folio, shouldClose.reason)
          
          if (closeResult.success) {
            results.closed++
            results.details.push({
              folioNumber: folio.folioNumber,
              guest: folio.guestName,
              balance: folio.balance,
              reason: shouldClose.reason
            })
          } else {
            results.errors++
          }
        } else {
          results.skipped++
        }
      }
      
      // Save updated folios
      localStorage.setItem('hotelFolios', JSON.stringify(folios))
      
    } catch (error) {
      console.error('Auto-close error:', error)
      results.errors++
    }
    
    return results
  }
  
  // Determine if folio should be closed
  static shouldCloseFolio(folio: any, reservation: any, auditDate: string): {
    close: boolean
    reason: string
  } {
    // Zero balance and checked out
    if (folio.balance === 0 && reservation.status === 'CHECKED_OUT') {
      return { close: true, reason: 'Zero balance - Checked out' }
    }
    
    // Zero balance and checkout date passed
    if (folio.balance === 0 && moment(reservation.checkOut).isBefore(auditDate, 'day')) {
      return { close: true, reason: 'Zero balance - Past checkout' }
    }
    
    // Zero balance and NO-SHOW
    if (folio.balance === 0 && reservation.status === 'NO_SHOW') {
      return { close: true, reason: 'Zero balance - No show' }
    }
    
    // Credit balance with no activity for 30 days
    if (folio.balance < 0) {
      const lastTransaction = folio.transactions[folio.transactions.length - 1]
      if (lastTransaction) {
        const daysSinceLastActivity = moment(auditDate).diff(moment(lastTransaction.date), 'days')
        if (daysSinceLastActivity > 30) {
          return { close: true, reason: 'Credit balance - Inactive 30+ days' }
        }
      }
    }
    
    return { close: false, reason: '' }
  }
  
  // Close folio
  static async closeFolio(folio: any, reason: string) {
    try {
      // Add closing transaction if balance not zero
      if (folio.balance !== 0) {
        const closingTransaction = {
          id: `CLOSE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          folioId: folio.id,
          date: moment().format('YYYY-MM-DD'),
          time: moment().format('HH:mm:ss'),
          
          type: 'adjustment',
          category: 'close',
          description: `Folio Closure - ${reason}`,
          
          debit: folio.balance > 0 ? 0 : Math.abs(folio.balance),
          credit: folio.balance > 0 ? folio.balance : 0,
          balance: 0,
          
          postedBy: 'System',
          postedAt: moment().format()
        }
        
        folio.transactions.push(closingTransaction)
        folio.balance = 0
      }
      
      // Update folio status
      folio.status = 'closed'
      folio.closedDate = moment().format('YYYY-MM-DD')
      folio.closedTime = moment().format('HH:mm:ss')
      folio.closedBy = 'Night Audit'
      folio.closeReason = reason
      
      return { success: true }
      
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
  
  // Generate folio statement
  static generateFolioStatement(folio: any) {
    const statement = {
      folioNumber: folio.folioNumber,
      guestName: folio.guestName,
      roomNumber: folio.roomNumber,
      
      openDate: folio.openDate,
      closeDate: folio.closedDate || 'Open',
      
      transactions: folio.transactions.map((t: any) => ({
        date: t.date,
        time: t.time,
        description: t.description,
        charges: t.debit,
        payments: t.credit,
        balance: t.balance
      })),
      
      summary: {
        totalCharges: folio.transactions.reduce((sum: number, t: any) => sum + t.debit, 0),
        totalPayments: folio.transactions.reduce((sum: number, t: any) => sum + t.credit, 0),
        finalBalance: folio.balance
      }
    }
    
    return statement
  }
}



