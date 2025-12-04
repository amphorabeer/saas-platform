import moment from 'moment'
import { ExtraChargeCategory, ExtraChargeItem, ExtraChargePosting } from '../types/extraCharges.types'
import { Folio, FolioTransaction } from '../types/folio.types'

export class ExtraChargesService {
  
  // Define standard categories
  static readonly CATEGORIES: ExtraChargeCategory[] = [
    {
      id: 'CAT-FB',
      code: 'FB',
      name: 'Food & Beverage',
      icon: '🍽️',
      department: 'F&B',
      accountCode: 'REV-FB',
      taxRate: 18,
      serviceChargeRate: 10
    },
    {
      id: 'CAT-BAR',
      code: 'BAR',
      name: 'Bar & Beverages',
      icon: '🍷',
      department: 'BAR',
      accountCode: 'REV-BAR',
      taxRate: 18,
      serviceChargeRate: 10
    },
    {
      id: 'CAT-MB',
      code: 'MB',
      name: 'Mini Bar',
      icon: '🥤',
      department: 'ROOMS',
      accountCode: 'REV-MINIBAR',
      taxRate: 18
    },
    {
      id: 'CAT-SPA',
      code: 'SPA',
      name: 'Spa & Wellness',
      icon: '💆',
      department: 'SPA',
      accountCode: 'REV-SPA',
      taxRate: 18,
      requiresAuthorization: true,
      maxAmountWithoutAuth: 200
    },
    {
      id: 'CAT-LAUNDRY',
      code: 'LDRY',
      name: 'Laundry',
      icon: '👔',
      department: 'HSK',
      accountCode: 'REV-LAUNDRY',
      taxRate: 18
    },
    {
      id: 'CAT-TRANSPORT',
      code: 'TRANS',
      name: 'Transportation',
      icon: '🚗',
      department: 'CONC',
      accountCode: 'REV-TRANSPORT',
      taxRate: 18
    },
    {
      id: 'CAT-PHONE',
      code: 'TEL',
      name: 'Telephone',
      icon: '📞',
      department: 'ROOMS',
      accountCode: 'REV-PHONE',
      taxRate: 18
    },
    {
      id: 'CAT-MISC',
      code: 'MISC',
      name: 'Miscellaneous',
      icon: '📦',
      department: 'FRONT',
      accountCode: 'REV-MISC',
      taxRate: 18
    }
  ]
  
  // Define standard items
  static readonly ITEMS: ExtraChargeItem[] = [
    // Mini Bar Items
    {
      id: 'MB-WATER',
      categoryId: 'CAT-MB',
      code: 'WATER',
      name: 'Mineral Water',
      unitPrice: 5,
      unit: 'piece',
      available: true,
      department: 'ROOMS',
      trackStock: true,
      currentStock: 100
    },
    {
      id: 'MB-COLA',
      categoryId: 'CAT-MB',
      code: 'COLA',
      name: 'Coca Cola',
      unitPrice: 8,
      unit: 'piece',
      available: true,
      department: 'ROOMS',
      trackStock: true,
      currentStock: 50
    },
    {
      id: 'MB-BEER',
      categoryId: 'CAT-MB',
      code: 'BEER',
      name: 'Beer (Local)',
      unitPrice: 12,
      unit: 'piece',
      available: true,
      department: 'ROOMS',
      trackStock: true,
      currentStock: 40
    },
    {
      id: 'MB-WINE',
      categoryId: 'CAT-MB',
      code: 'WINE',
      name: 'Wine (House)',
      unitPrice: 45,
      unit: 'piece',
      available: true,
      department: 'ROOMS',
      trackStock: true,
      currentStock: 20
    },
    
    // Restaurant Items
    {
      id: 'FB-BREAKFAST',
      categoryId: 'CAT-FB',
      code: 'BF',
      name: 'Breakfast (A la carte)',
      unitPrice: 35,
      unit: 'person',
      available: true,
      availableFrom: '07:00',
      availableUntil: '11:00',
      department: 'F&B'
    },
    {
      id: 'FB-LUNCH',
      categoryId: 'CAT-FB',
      code: 'LN',
      name: 'Lunch (A la carte)',
      unitPrice: 45,
      unit: 'person',
      available: true,
      availableFrom: '12:00',
      availableUntil: '15:00',
      department: 'F&B'
    },
    {
      id: 'FB-DINNER',
      categoryId: 'CAT-FB',
      code: 'DN',
      name: 'Dinner (A la carte)',
      unitPrice: 65,
      unit: 'person',
      available: true,
      availableFrom: '18:00',
      availableUntil: '23:00',
      department: 'F&B'
    },
    {
      id: 'FB-ROOM',
      categoryId: 'CAT-FB',
      code: 'RS',
      name: 'Room Service',
      unitPrice: 15,
      unit: 'service',
      available: true,
      department: 'F&B'
    },
    
    // Spa Services
    {
      id: 'SPA-MASSAGE',
      categoryId: 'CAT-SPA',
      code: 'MSG',
      name: 'Massage (60 min)',
      unitPrice: 120,
      unit: 'hour',
      available: true,
      department: 'SPA'
    },
    {
      id: 'SPA-FACIAL',
      categoryId: 'CAT-SPA',
      code: 'FCL',
      name: 'Facial Treatment',
      unitPrice: 80,
      unit: 'service',
      available: true,
      department: 'SPA'
    },
    
    // Laundry
    {
      id: 'LDRY-SHIRT',
      categoryId: 'CAT-LAUNDRY',
      code: 'SHIRT',
      name: 'Shirt Laundry',
      unitPrice: 10,
      unit: 'piece',
      available: true,
      department: 'HSK'
    },
    {
      id: 'LDRY-SUIT',
      categoryId: 'CAT-LAUNDRY',
      code: 'SUIT',
      name: 'Suit Dry Cleaning',
      unitPrice: 35,
      unit: 'piece',
      available: true,
      department: 'HSK'
    },
    
    // Transport
    {
      id: 'TRANS-AIRPORT',
      categoryId: 'CAT-TRANSPORT',
      code: 'APT',
      name: 'Airport Transfer',
      unitPrice: 80,
      unit: 'service',
      available: true,
      department: 'CONC'
    },
    {
      id: 'TRANS-TAXI',
      categoryId: 'CAT-TRANSPORT',
      code: 'TAXI',
      name: 'Taxi Service',
      unitPrice: 1.5,
      unit: 'km',
      available: true,
      department: 'CONC'
    }
  ]
  
  // Post extra charge to folio
  static async postExtraCharge(params: {
    reservationId: string
    itemId: string
    quantity: number
    notes?: string
    reference?: string
    postedBy?: string
  }) {
    try {
      // Get item details
      const item = this.ITEMS.find(i => i.id === params.itemId)
      if (!item) throw new Error('Item not found')
      
      // Get category
      const category = this.CATEGORIES.find(c => c.id === item.categoryId)
      if (!category) throw new Error('Category not found')
      
      // Check stock if applicable
      if (item.trackStock && item.currentStock !== undefined) {
        if (item.currentStock < params.quantity) {
          throw new Error(`Insufficient stock. Available: ${item.currentStock}`)
        }
      }
      
      // Calculate amounts
      const subtotal = item.unitPrice * params.quantity
      const serviceCharge = category.serviceChargeRate 
        ? subtotal * (category.serviceChargeRate / 100) 
        : 0
      const taxableAmount = subtotal + serviceCharge
      const taxAmount = taxableAmount * (category.taxRate / 100)
      const totalAmount = taxableAmount + taxAmount
      
      // Get or create folio
      const folios = typeof window !== 'undefined' 
        ? JSON.parse(localStorage.getItem('hotelFolios') || '[]')
        : []
      let folio = folios.find((f: any) => f.reservationId === params.reservationId)
      
      if (!folio) {
        // Get reservation
        const reservations = await fetch('/api/hotel/reservations').then(r => r.json())
        const reservation = reservations.find((r: any) => r.id === params.reservationId)
        
        if (!reservation) throw new Error('Reservation not found')
        
        folio = {
          id: `FOLIO-${Date.now()}`,
          folioNumber: `F${moment().format('YYMMDD')}-${reservation.roomNumber || reservation.roomId || Math.floor(Math.random() * 1000)}`,
          reservationId: params.reservationId,
          guestName: reservation.guestName,
          roomNumber: reservation.roomNumber || reservation.roomId,
          balance: 0,
          creditLimit: 5000,
          paymentMethod: 'cash',
          status: 'open',
          openDate: moment().format('YYYY-MM-DD'),
          transactions: []
        }
        folios.push(folio)
      }
      
      // Create transaction
      const transaction: FolioTransaction = {
        id: `EX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        folioId: folio.id,
        date: moment().format('YYYY-MM-DD'),
        time: moment().format('HH:mm:ss'),
        
        type: 'charge',
        category: item.categoryId === 'CAT-FB' ? 'food' : 
                  item.categoryId === 'CAT-BAR' ? 'beverage' : 'extras',
        description: `${item.name} (${params.quantity} ${item.unit})`,
        
        debit: totalAmount,
        credit: 0,
        balance: folio.balance + totalAmount,
        
        postedBy: params.postedBy || (typeof window !== 'undefined' 
          ? JSON.parse(localStorage.getItem('currentUser') || '{}').name || 'User'
          : 'User'),
        postedAt: moment().format(),
        
        referenceId: params.reference,
        
        taxDetails: [{
          taxType: 'VAT',
          rate: category.taxRate,
          amount: taxAmount,
          base: taxableAmount
        }]
      }
      
      // Add to folio
      folio.transactions.push(transaction)
      folio.balance += totalAmount
      
      // Update stock if applicable
      if (item.trackStock && item.currentStock !== undefined) {
        item.currentStock -= params.quantity
        // In real app, update item in database
      }
      
      // Save folio
      const folioIndex = folios.findIndex((f: any) => f.id === folio.id)
      if (folioIndex >= 0) {
        folios[folioIndex] = folio
      } else {
        folios.push(folio)
      }
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('hotelFolios', JSON.stringify(folios))
      }
      
      // Save extra charge record
      const extraCharge: ExtraChargePosting = {
        id: transaction.id,
        folioId: folio.id,
        reservationId: params.reservationId,
        
        itemId: item.id,
        itemName: item.name,
        categoryId: category.id,
        
        quantity: params.quantity,
        unitPrice: item.unitPrice,
        grossAmount: totalAmount,
        taxAmount: taxAmount,
        netAmount: subtotal,
        
        postedDate: moment().format('YYYY-MM-DD'),
        postedTime: moment().format('HH:mm:ss'),
        postedBy: transaction.postedBy,
        
        department: item.department,
        pointOfSale: item.pointOfSale,
        
        reference: params.reference,
        notes: params.notes,
        
        status: 'posted'
      }
      
      const extraCharges = typeof window !== 'undefined' 
        ? JSON.parse(localStorage.getItem('extraCharges') || '[]')
        : []
      extraCharges.push(extraCharge)
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('extraCharges', JSON.stringify(extraCharges))
      }
      
      return {
        success: true,
        transaction: transaction,
        totalAmount: totalAmount,
        extraCharge: extraCharge
      }
      
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      }
    }
  }
  
  // Post minibar charges during night audit
  static async postMinibarCharges(auditDate: string) {
    const results = {
      posted: 0,
      totalAmount: 0,
      details: [] as any[]
    }
    
    // Get minibar consumptions for the day
    const consumptions = typeof window !== 'undefined' 
      ? JSON.parse(localStorage.getItem('minibarConsumptions') || '[]')
      : []
    const todayConsumptions = consumptions.filter((c: any) => 
      moment(c.date).format('YYYY-MM-DD') === auditDate && 
      !c.posted
    )
    
    for (const consumption of todayConsumptions) {
      const result = await this.postExtraCharge({
        reservationId: consumption.reservationId,
        itemId: consumption.itemId,
        quantity: consumption.quantity,
        notes: 'Minibar consumption - Night Audit posting',
        postedBy: 'Night Audit'
      })
      
      if (result.success) {
        consumption.posted = true
        consumption.postedAt = moment().format()
        results.posted++
        results.totalAmount += result.totalAmount || 0
        results.details.push({
          room: consumption.roomNumber,
          item: consumption.itemName,
          amount: result.totalAmount
        })
      }
    }
    
    // Save updated consumptions
    if (typeof window !== 'undefined') {
      localStorage.setItem('minibarConsumptions', JSON.stringify(consumptions))
    }
    
    return results
  }
  
  // Get items by category
  static getItemsByCategory(categoryId: string): ExtraChargeItem[] {
    return this.ITEMS.filter(i => i.categoryId === categoryId && i.available)
  }
  
  // Get category by ID
  static getCategory(categoryId: string): ExtraChargeCategory | undefined {
    return this.CATEGORIES.find(c => c.id === categoryId)
  }
  
  // Get item by ID
  static getItem(itemId: string): ExtraChargeItem | undefined {
    return this.ITEMS.find(i => i.id === itemId)
  }
}



