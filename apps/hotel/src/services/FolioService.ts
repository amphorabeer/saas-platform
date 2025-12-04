import moment from 'moment'
import { Folio, FolioTransaction } from '../types/folio.types'
import { ActivityLogger } from '../lib/activityLogger'

/**
 * Centralized Folio Service
 * Handles all folio creation and management operations
 */
export class FolioService {
  
  /**
   * Get or create folio for a reservation
   * Checks if folio exists, creates if not
   */
  static getOrCreateFolio(reservationId: string): Folio | null {
    if (typeof window === 'undefined') return null
    
    const folios = JSON.parse(localStorage.getItem('hotelFolios') || '[]')
    const existingFolio = folios.find((f: Folio) => f.reservationId === reservationId)
    
    if (existingFolio) {
      return existingFolio
    }
    
    // Folio doesn't exist, but we need reservation data to create it
    // This method should be called with reservation data
    return null
  }
  
  /**
   * Create folio for reservation with pre-posted room charges
   * This is the main method used during check-in
   */
  static createFolioForReservation(reservation: any, options?: {
    prePostCharges?: boolean
    creditLimit?: number
    paymentMethod?: string
  }): Folio | null {
    if (typeof window === 'undefined') return null
    
    const folios = JSON.parse(localStorage.getItem('hotelFolios') || '[]')
    
    // Check if folio already exists
    const existingFolio = folios.find((f: any) => f.reservationId === reservation.id)
    if (existingFolio) {
      return existingFolio
    }
    
    const prePostCharges = options?.prePostCharges !== false // Default: true
    const creditLimit = options?.creditLimit || 5000
    const paymentMethod = options?.paymentMethod || reservation.paymentMethod || 'cash'
    
    // Calculate room charges
    const nights = Math.max(1, moment(reservation.checkOut).diff(moment(reservation.checkIn), 'days'))
    const totalAmount = reservation.totalAmount || 0
    const ratePerNight = nights > 0 ? totalAmount / nights : totalAmount
    
    // Create room charge transactions for EACH night (if pre-posting enabled)
    const transactions: FolioTransaction[] = []
    let runningBalance = 0
    
    if (prePostCharges && totalAmount > 0) {
      for (let i = 0; i < nights; i++) {
        const chargeDate = moment(reservation.checkIn).add(i, 'days').format('YYYY-MM-DD')
        runningBalance += ratePerNight
        
        transactions.push({
          id: `CHG-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
          folioId: '', // Will be set after folio creation
          date: chargeDate,
          time: '23:59:59',
          type: 'charge',
          category: 'room',
          description: `ოთახის ღირებულება - ღამე ${i + 1}`,
          debit: ratePerNight,
          credit: 0,
          balance: runningBalance,
          postedBy: 'System (Reservation)',
          postedAt: moment().format(),
          referenceId: `ROOM-${reservation.id}-${chargeDate}`,
          nightAuditDate: chargeDate,
          prePosted: true
        })
      }
    }
    
    // Get Business Date for folio number
    const businessDate = typeof window !== 'undefined' 
      ? (localStorage.getItem('currentBusinessDate') || moment().format('YYYY-MM-DD'))
      : moment().format('YYYY-MM-DD')
    const dateStr = businessDate.replace(/-/g, '').slice(2) // YYMMDD
    
    // Create new folio
    const newFolio: Folio = {
      id: `FOLIO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      folioNumber: `F${dateStr}-${reservation.roomNumber || reservation.roomId || Math.floor(Math.random() * 1000)}`,
      reservationId: reservation.id,
      guestName: reservation.guestName,
      roomNumber: reservation.roomNumber || reservation.roomId,
      balance: prePostCharges ? totalAmount : 0,
      creditLimit: creditLimit,
      paymentMethod: paymentMethod,
      status: 'open',
      openDate: moment().format('YYYY-MM-DD'),
      transactions: transactions.map(t => ({
        ...t,
        folioId: `FOLIO-${Date.now()}` // Temporary, will be updated
      })),
      initialRoomCharge: prePostCharges ? {
        rate: ratePerNight,
        totalAmount: totalAmount,
        nights: nights,
        allNightsPosted: true
      } : undefined
    }
    
    // Update transaction folioIds
    newFolio.transactions = newFolio.transactions.map(t => ({
      ...t,
      folioId: newFolio.id
    }))
    
    // Save folio
    folios.push(newFolio)
    localStorage.setItem('hotelFolios', JSON.stringify(folios))
    
    // Log activity
    ActivityLogger.log('FOLIO_CREATED', {
      folioNumber: newFolio.folioNumber,
      guest: newFolio.guestName,
      room: newFolio.roomNumber,
      reservationId: reservation.id,
      initialBalance: newFolio.balance,
      nights: nights,
      prePosted: prePostCharges
    })
    
    return newFolio
  }
  
  /**
   * Create empty folio (for cases where pre-posting is not desired)
   * Used by FolioManager, CheckOutModal when folio is needed but charges not pre-posted
   */
  static createEmptyFolio(reservation: any, options?: {
    creditLimit?: number
    paymentMethod?: string
  }): Folio | null {
    if (typeof window === 'undefined') return null
    
    const folios = JSON.parse(localStorage.getItem('hotelFolios') || '[]')
    
    // Check if folio already exists
    const existingFolio = folios.find((f: any) => f.reservationId === reservation.id)
    if (existingFolio) {
      return existingFolio
    }
    
    const creditLimit = options?.creditLimit || 5000
    const paymentMethod = options?.paymentMethod || reservation.paymentMethod || 'cash'
    
    // Get Business Date for folio number
    const businessDate = typeof window !== 'undefined' 
      ? (localStorage.getItem('currentBusinessDate') || moment().format('YYYY-MM-DD'))
      : moment().format('YYYY-MM-DD')
    const dateStr = businessDate.replace(/-/g, '').slice(2) // YYMMDD
    
    const newFolio: Folio = {
      id: `FOLIO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      folioNumber: `F${dateStr}-${reservation.roomNumber || reservation.roomId || Math.floor(Math.random() * 1000)}`,
      reservationId: reservation.id,
      guestName: reservation.guestName,
      roomNumber: reservation.roomNumber || reservation.roomId,
      balance: 0,
      creditLimit: creditLimit,
      paymentMethod: paymentMethod,
      status: 'open',
      openDate: moment(reservation.checkIn || moment()).format('YYYY-MM-DD'),
      transactions: []
    }
    
    // Save folio
    folios.push(newFolio)
    localStorage.setItem('hotelFolios', JSON.stringify(folios))
    
    // Log activity
    ActivityLogger.log('FOLIO_CREATED', {
      folioNumber: newFolio.folioNumber,
      guest: newFolio.guestName,
      reservationId: reservation.id,
      empty: true
    })
    
    return newFolio
  }
  
  /**
   * Recalculate balance from transactions
   * Always use this instead of trusting folio.balance property
   */
  static recalculateBalance(transactions: FolioTransaction[]): number {
    return transactions.reduce((balance, trx) => {
      return balance + (trx.debit || 0) - (trx.credit || 0)
    }, 0)
  }
  
  /**
   * Update folio balance from transactions
   * Recalculates and updates the folio.balance property
   */
  static updateFolioBalance(folioId: string): boolean {
    if (typeof window === 'undefined') return false
    
    const folios = JSON.parse(localStorage.getItem('hotelFolios') || '[]')
    const folio = folios.find((f: Folio) => f.id === folioId)
    
    if (!folio) return false
    
    folio.balance = this.recalculateBalance(folio.transactions)
    
    // Save updated folio
    const folioIndex = folios.findIndex((f: Folio) => f.id === folioId)
    if (folioIndex >= 0) {
      folios[folioIndex] = folio
      localStorage.setItem('hotelFolios', JSON.stringify(folios))
      return true
    }
    
    return false
  }
  
  /**
   * Get folio by reservation ID
   */
  static getFolioByReservationId(reservationId: string): Folio | null {
    if (typeof window === 'undefined') return null
    
    const folios = JSON.parse(localStorage.getItem('hotelFolios') || '[]')
    return folios.find((f: Folio) => f.reservationId === reservationId) || null
  }
  
  /**
   * Get folio by ID
   */
  static getFolioById(folioId: string): Folio | null {
    if (typeof window === 'undefined') return null
    
    const folios = JSON.parse(localStorage.getItem('hotelFolios') || '[]')
    return folios.find((f: Folio) => f.id === folioId) || null
  }
  
  /**
   * Save folio to localStorage
   */
  static saveFolio(folio: Folio): boolean {
    if (typeof window === 'undefined') return false
    
    const folios = JSON.parse(localStorage.getItem('hotelFolios') || '[]')
    const folioIndex = folios.findIndex((f: Folio) => f.id === folio.id)
    
    if (folioIndex >= 0) {
      folios[folioIndex] = folio
    } else {
      folios.push(folio)
    }
    
    localStorage.setItem('hotelFolios', JSON.stringify(folios))
    return true
  }
  
  /**
   * Close folio
   */
  static closeFolio(folioId: string, closedBy?: string): boolean {
    if (typeof window === 'undefined') return false
    
    const folios = JSON.parse(localStorage.getItem('hotelFolios') || '[]')
    const folio = folios.find((f: Folio) => f.id === folioId)
    
    if (!folio) return false
    
    folio.status = 'closed'
    folio.closedDate = moment().format('YYYY-MM-DD')
    folio.closedTime = moment().format('HH:mm:ss')
    folio.closedBy = closedBy || (typeof window !== 'undefined' 
      ? JSON.parse(localStorage.getItem('currentUser') || '{}').name || 'User'
      : 'User')
    
    return this.saveFolio(folio)
  }
}



