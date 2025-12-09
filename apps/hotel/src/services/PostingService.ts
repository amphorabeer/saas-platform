import moment from 'moment'
import { Folio, FolioTransaction, TaxBreakdown } from '../types/folio.types'
import { FolioService } from './FolioService'
import { RESERVATION_STATUS, StatusHelpers } from '../constants/statusConstants'

export class PostingService {
  
  // Post room charges for all in-house guests
  static async postRoomCharges(auditDate: string) {
    const results = {
      posted: 0,
      failed: 0,
      skipped: 0,
      totalAmount: 0,
      details: [] as any[]
    }
    
    try {
      // Get all reservations - try localStorage first, then API
      let reservations: any[] = []
      
      if (typeof window !== 'undefined') {
        const localReservations = localStorage.getItem('hotelReservations')
        if (localReservations) {
          try {
            reservations = JSON.parse(localReservations)
            console.log('PostingService: Loaded reservations from localStorage:', reservations.length)
          } catch (e) {
            console.error('Error parsing localStorage reservations:', e)
          }
        }
      }
      
      // Fallback to API if localStorage empty
      if (reservations.length === 0) {
        try {
          reservations = await fetch('/api/hotel/reservations').then(r => r.json())
          console.log('PostingService: Loaded reservations from API:', reservations.length)
        } catch (e) {
          console.error('Error fetching reservations from API:', e)
        }
      }
      
      console.log('PostingService: Total reservations:', reservations.length)
      console.log('PostingService: Audit date:', auditDate)
      
      // Filter in-house guests for audit date
      const inHouseGuests = reservations.filter((res: any) => {
        const checkIn = moment(res.checkIn)
        const checkOut = moment(res.checkOut)
        const audit = moment(auditDate)
        
        // Check both CHECKED_IN and OCCUPIED status (different naming conventions)
        const isCheckedIn = StatusHelpers.isCheckedIn(res.status) || StatusHelpers.isOccupied(res.status)
        const dateMatches = checkIn.isSameOrBefore(audit, 'day') && checkOut.isAfter(audit, 'day')
        
        console.log('Checking reservation:', {
          id: res.id,
          guest: res.guestName,
          room: res.roomNumber,
          status: res.status,
          checkIn: res.checkIn,
          checkOut: res.checkOut,
          isCheckedIn,
          dateMatches
        })
        
        return isCheckedIn && dateMatches
      })
      
      console.log('PostingService: In-house guests found:', inHouseGuests.length)
      console.log('PostingService: In-house guests:', inHouseGuests.map(g => ({
        room: g.roomNumber,
        guest: g.guestName,
        status: g.status
      })))
      
      // Post charge for each guest
      for (const reservation of inHouseGuests) {
        const postResult = await this.postRoomChargeForReservation(reservation, auditDate)
        
        if (postResult.success) {
          results.posted++
          results.totalAmount += postResult.amount
        } else if (postResult.skipped) {
          results.skipped++
        } else {
          results.failed++
        }
        
        results.details.push(postResult)
      }
      
    } catch (error) {
      console.error('Room charge posting error:', error)
    }
    
    return results
  }
  
  // Helper function to get room number from roomId
  static getRoomNumber(roomIdOrNumber: string | undefined, rooms?: any[]): string {
    if (!roomIdOrNumber) return '-'
    
    // Already a room number?
    if (roomIdOrNumber.length <= 4 && /^\d+$/.test(roomIdOrNumber)) {
      return roomIdOrNumber
    }
    
    // Try provided rooms first
    let roomsToSearch = rooms
    
    // If empty, load from localStorage directly
    if (!roomsToSearch || roomsToSearch.length === 0) {
      if (typeof window !== 'undefined') {
        try {
          const savedRooms = localStorage.getItem('rooms') || 
                             localStorage.getItem('simpleRooms') || 
                             localStorage.getItem('hotelRooms')
          if (savedRooms) {
            roomsToSearch = JSON.parse(savedRooms)
          }
        } catch (e) {
          console.error('Error parsing rooms from localStorage:', e)
        }
      }
    }
    
    // Find room by ID
    if (roomsToSearch && roomsToSearch.length > 0) {
      const room = roomsToSearch.find((r: any) => r.id === roomIdOrNumber)
      if (room) {
        return room.roomNumber || room.number || roomIdOrNumber
      }
    }
    
    // Fallback: truncated CUID
    return roomIdOrNumber.slice(0, 6) + '...'
  }

  // Post room charge for single reservation
  static async postRoomChargeForReservation(reservation: any, auditDate: string) {
    try {
      // Check if already posted for this date
      const folios = typeof window !== 'undefined' 
        ? JSON.parse(localStorage.getItem('hotelFolios') || '[]')
        : []
      let folio = folios.find((f: any) => f.reservationId === reservation.id)
      
      // Create folio if doesn't exist using FolioService
      if (!folio) {
        folio = FolioService.createEmptyFolio(reservation)
        if (folio) {
          folios.push(folio)
        }
      }
      
      // Check if ALL nights were pre-posted on reservation creation
      if (folio.initialRoomCharge?.allNightsPosted) {
        // Check if this specific date was already posted
        const existingCharge = folio.transactions.find((t: any) => 
          t.nightAuditDate === auditDate && t.category === 'room' && t.type === 'charge'
        )
        
        if (existingCharge) {
          return {
            success: false,
            skipped: true,
            message: 'Room charge pre-posted on reservation creation',
            reservation: reservation.id,
            room: this.getRoomNumber(reservation.roomNumber || reservation.roomId),
            guest: reservation.guestName,
            prePosted: true
          }
        }
      }
      
      // Check for duplicate posting (check both nightAuditDate and referenceId)
      const existingCharge = folio.transactions.find((t: any) => 
        (t.nightAuditDate === auditDate && t.category === 'room' && t.type === 'charge') ||
        t.referenceId === `ROOM-${reservation.id}-${auditDate}`
      )
      
      if (existingCharge) {
        return {
          success: false,
          skipped: true,
            message: 'Room charge already posted for this date',
            reservation: reservation.id,
            room: this.getRoomNumber(reservation.roomNumber || reservation.roomId),
            guest: reservation.guestName
        }
      }
      
      // Calculate room charge
      const rateBreakdown = this.calculateRoomRate(reservation, auditDate)
      
      // Recalculate balance from existing transactions
      const currentBalance = folio.transactions.reduce((balance, trx) => {
        return balance + (trx.debit || 0) - (trx.credit || 0)
      }, 0)
      
      const newBalance = currentBalance + rateBreakdown.total
      
      // Create room charge transaction
      const roomCharge: FolioTransaction = {
        id: `RC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        folioId: folio.id,
        date: auditDate,
        time: moment().format('HH:mm:ss'),
        
        type: 'charge',
        category: 'room',
        description: `Room Charge - Room ${this.getRoomNumber(reservation.roomNumber || reservation.roomId)}`,
        
        debit: rateBreakdown.total,
        credit: 0,
        balance: newBalance,
        
        postedBy: 'Night Audit',
        postedAt: moment().format(),
        nightAuditDate: auditDate,
        
        taxDetails: rateBreakdown.taxes,
        // Store tax breakdown for reporting (tax inclusive)
        taxBreakdown: {
          gross: rateBreakdown.grossRate,
          net: rateBreakdown.netRate,
          totalTax: rateBreakdown.totalTax,
          taxInclusive: true
        },
        
        referenceId: `ROOM-${reservation.id}-${auditDate}`
      }
      
      // Update folio
      folio.balance = newBalance
      folio.transactions.push(roomCharge)
      
      // Save updated folio
      const folioIndex = folios.findIndex((f: any) => f.id === folio.id)
      if (folioIndex >= 0) {
        folios[folioIndex] = folio
      } else {
        folios.push(folio)
      }
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('hotelFolios', JSON.stringify(folios))
      }
      
      return {
        success: true,
        amount: rateBreakdown.total,
        reservation: reservation.id,
        room: reservation.roomNumber || reservation.roomId,
        guest: reservation.guestName,
        breakdown: rateBreakdown
      }
      
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        reservation: reservation.id,
        room: reservation.roomNumber || reservation.roomId,
        guest: reservation.guestName
      }
    }
  }
  
  // Calculate room rate with taxes
  static calculateRoomRate(reservation: any, date: string) {
    // Get base rate
    const checkIn = moment(reservation.checkIn)
    const checkOut = moment(reservation.checkOut)
    const nights = checkOut.diff(checkIn, 'days')
    const totalAmount = reservation.totalAmount || 0
    const baseRatePerNight = nights > 0 ? totalAmount / nights : totalAmount
    
    // Check for special rates (weekend, seasonal, etc.)
    const dayOfWeek = moment(date).day()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    
    let adjustedRate = baseRatePerNight
    
    // Weekend surcharge
    if (isWeekend && reservation.weekendSurcharge !== false) {
      adjustedRate *= 1.1 // 10% weekend surcharge
    }
    
    // Apply discounts if any
    let discount = 0
    if (reservation.discountPercent) {
      discount = adjustedRate * (reservation.discountPercent / 100)
    }
    if (reservation.discountAmount) {
      discount = Math.max(discount, reservation.discountAmount / nights)
    }
    
    // Gross rate (taxes included) - this is what customer pays
    const grossRate = adjustedRate - discount
    
    // Calculate taxes INCLUSIVELY (taxes included in gross rate)
    const taxes = this.calculateTaxesInclusive(grossRate)
    
    // Total is the gross rate (taxes included)
    const total = grossRate
    
    return {
      baseRate: baseRatePerNight,
      adjustedRate: adjustedRate,
      discount: discount,
      grossRate: grossRate, // Gross rate (taxes included)
      netRate: taxes.net, // Net rate (before taxes)
      taxes: taxes.breakdown,
      totalTax: taxes.totalTax,
      total: total // Same as grossRate (taxes included)
    }
  }
  
  // Calculate taxes INCLUSIVELY (taxes included in gross amount)
  static calculateTaxesInclusive(grossAmount: number) {
    // Load tax rates from settings, fallback to defaults
    let taxRates = {
      VAT: 18,          // 18% VAT
      CITY_TAX: 3,      // 3% City tax
      TOURISM_TAX: 1    // 1% Tourism tax
    }
    
    if (typeof window !== 'undefined') {
      // Try hotelTaxes first (unified key)
      const savedHotelTaxes = localStorage.getItem('hotelTaxes')
      if (savedHotelTaxes) {
        try {
          const taxes = JSON.parse(savedHotelTaxes)
          let taxArray: any[] = []
          if (Array.isArray(taxes)) {
            taxArray = taxes
          } else {
            taxArray = Object.entries(taxes).map(([key, value]) => ({
              key,
              rate: typeof value === 'number' ? value : 0
            }))
          }
          
          const vatTax = taxArray.find((t: any) => t.key === 'VAT' || t.name?.includes('VAT') || t.name?.includes('დღგ'))
          const cityTax = taxArray.find((t: any) => t.key === 'CITY_TAX' || t.name?.includes('CITY'))
          const tourismTax = taxArray.find((t: any) => t.key === 'TOURISM_TAX' || t.name?.includes('TOURISM'))
          
          if (vatTax) taxRates.VAT = vatTax.rate ?? vatTax.value ?? 18
          if (cityTax) taxRates.CITY_TAX = cityTax.rate ?? cityTax.value ?? 3
          if (tourismTax) taxRates.TOURISM_TAX = tourismTax.rate ?? tourismTax.value ?? 1
        } catch (e) {
          console.error('Error loading hotelTaxes:', e)
        }
      } else {
        // Fallback to taxSettings
        const savedTaxes = localStorage.getItem('taxSettings')
        if (savedTaxes) {
          try {
            const settings = JSON.parse(savedTaxes)
            taxRates = {
              VAT: settings.VAT || taxRates.VAT,
              CITY_TAX: settings.CITY_TAX || taxRates.CITY_TAX,
              TOURISM_TAX: settings.TOURISM_TAX || taxRates.TOURISM_TAX
            }
          } catch (e) {
            console.error('Error loading tax settings:', e)
          }
        }
      }
    }
    
    // Calculate total tax rate (sum of all tax rates)
    const totalTaxRate = 1 + (taxRates.VAT / 100) + (taxRates.CITY_TAX / 100) + (taxRates.TOURISM_TAX / 100)
    
    // Calculate net amount (before taxes)
    const netAmount = grossAmount / totalTaxRate
    
    // Calculate tax breakdown
    const breakdown: TaxBreakdown[] = []
    let totalTax = 0
    
    // Calculate each tax from net amount
    for (const [taxType, rate] of Object.entries(taxRates)) {
      const taxAmount = netAmount * (rate / 100)
      totalTax += taxAmount
      
      breakdown.push({
        taxType: taxType as any,
        rate: rate,
        base: netAmount,
        amount: taxAmount
      })
    }
    
    return {
      net: netAmount, // Net amount before taxes
      gross: grossAmount, // Gross amount (taxes included)
      breakdown,
      totalTax,
      taxInclusive: true
    }
  }
  
  // Legacy method for backward compatibility (kept for reference)
  static calculateTaxes(amount: number) {
    // This is now deprecated - use calculateTaxesInclusive instead
    return this.calculateTaxesInclusive(amount)
  }
  
  // Create new folio (deprecated - use FolioService instead)
  // Kept for backward compatibility
  static async createFolio(reservation: any): Promise<Folio | null> {
    return FolioService.createEmptyFolio(reservation)
  }
}

