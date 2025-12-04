import moment from 'moment'
import { PackageDefinition, ReservationPackage } from '../types/package.types'
import { Folio, FolioTransaction } from '../types/folio.types'

export class PackagePostingService {
  
  // Define standard packages
  static readonly PACKAGES: PackageDefinition[] = [
    {
      id: 'PKG-BB',
      code: 'BB',
      name: 'Bed & Breakfast',
      type: 'BB',
      pricePerPerson: 25,
      pricePerChild: 15,
      childAgeLimit: 12,
      active: true,
      
      components: [
        {
          id: 'BB-BF',
          category: 'breakfast',
          name: 'Breakfast Buffet',
          retailValue: 25,
          costValue: 10,
          postTime: '07:00',
          department: 'F&B',
          taxRate: 18,
          mandatory: true,
          allowSubstitution: false
        }
      ],
      
      postingRules: [
        {
          component: 'BB-BF',
          postingTime: 'night-audit',
          splitByNights: true,
          accountCode: 'FOOD-BF'
        }
      ]
    },
    
    {
      id: 'PKG-HB',
      code: 'HB',
      name: 'Half Board',
      type: 'HB',
      pricePerPerson: 75,
      pricePerChild: 40,
      childAgeLimit: 12,
      active: true,
      
      components: [
        {
          id: 'HB-BF',
          category: 'breakfast',
          name: 'Breakfast Buffet',
          retailValue: 25,
          costValue: 10,
          postTime: '07:00',
          department: 'F&B',
          taxRate: 18,
          mandatory: true,
          allowSubstitution: false
        },
        {
          id: 'HB-DN',
          category: 'dinner',
          name: 'Dinner (3 Course)',
          retailValue: 50,
          costValue: 20,
          postTime: '19:00',
          department: 'F&B',
          taxRate: 18,
          mandatory: true,
          allowSubstitution: true
        }
      ],
      
      postingRules: [
        {
          component: 'HB-BF',
          postingTime: 'night-audit',
          splitByNights: true,
          accountCode: 'FOOD-BF'
        },
        {
          component: 'HB-DN',
          postingTime: 'night-audit',
          splitByNights: true,
          accountCode: 'FOOD-DN'
        }
      ]
    },
    
    {
      id: 'PKG-FB',
      code: 'FB',
      name: 'Full Board',
      type: 'FB',
      pricePerPerson: 120,
      pricePerChild: 60,
      childAgeLimit: 12,
      active: true,
      
      components: [
        {
          id: 'FB-BF',
          category: 'breakfast',
          name: 'Breakfast Buffet',
          retailValue: 25,
          costValue: 10,
          postTime: '07:00',
          department: 'F&B',
          taxRate: 18,
          mandatory: true,
          allowSubstitution: false
        },
        {
          id: 'FB-LN',
          category: 'lunch',
          name: 'Lunch (2 Course)',
          retailValue: 45,
          costValue: 18,
          postTime: '12:00',
          department: 'F&B',
          taxRate: 18,
          mandatory: true,
          allowSubstitution: true
        },
        {
          id: 'FB-DN',
          category: 'dinner',
          name: 'Dinner (3 Course)',
          retailValue: 50,
          costValue: 20,
          postTime: '19:00',
          department: 'F&B',
          taxRate: 18,
          mandatory: true,
          allowSubstitution: true
        }
      ],
      
      postingRules: [
        {
          component: 'FB-BF',
          postingTime: 'night-audit',
          splitByNights: true,
          accountCode: 'FOOD-BF'
        },
        {
          component: 'FB-LN',
          postingTime: 'night-audit',
          splitByNights: true,
          accountCode: 'FOOD-LN'
        },
        {
          component: 'FB-DN',
          postingTime: 'night-audit',
          splitByNights: true,
          accountCode: 'FOOD-DN'
        }
      ]
    },
    
    {
      id: 'PKG-AI',
      code: 'AI',
      name: 'All Inclusive',
      type: 'AI',
      pricePerPerson: 180,
      pricePerChild: 90,
      childAgeLimit: 12,
      active: true,
      
      components: [
        // All meals
        {
          id: 'AI-BF',
          category: 'breakfast',
          name: 'Breakfast Buffet',
          retailValue: 25,
          costValue: 10,
          postTime: '07:00',
          department: 'F&B',
          taxRate: 18,
          mandatory: true,
          allowSubstitution: false
        },
        {
          id: 'AI-LN',
          category: 'lunch',
          name: 'Lunch Buffet',
          retailValue: 45,
          costValue: 18,
          postTime: '12:00',
          department: 'F&B',
          taxRate: 18,
          mandatory: true,
          allowSubstitution: false
        },
        {
          id: 'AI-DN',
          category: 'dinner',
          name: 'Dinner Buffet',
          retailValue: 50,
          costValue: 20,
          postTime: '19:00',
          department: 'F&B',
          taxRate: 18,
          mandatory: true,
          allowSubstitution: false
        },
        // Beverages
        {
          id: 'AI-BV',
          category: 'beverage',
          name: 'Unlimited Beverages',
          retailValue: 40,
          costValue: 15,
          postTime: '10:00',
          department: 'BAR',
          taxRate: 18,
          mandatory: true,
          allowSubstitution: false
        },
        // Extras
        {
          id: 'AI-SPA',
          category: 'spa',
          name: 'Spa Access',
          retailValue: 20,
          costValue: 5,
          postTime: '09:00',
          department: 'SPA',
          taxRate: 18,
          mandatory: false,
          allowSubstitution: false
        }
      ],
      
      postingRules: [
        {
          component: 'AI-BF',
          postingTime: 'night-audit',
          splitByNights: true,
          accountCode: 'AI-FOOD'
        },
        {
          component: 'AI-LN',
          postingTime: 'night-audit',
          splitByNights: true,
          accountCode: 'AI-FOOD'
        },
        {
          component: 'AI-DN',
          postingTime: 'night-audit',
          splitByNights: true,
          accountCode: 'AI-FOOD'
        },
        {
          component: 'AI-BV',
          postingTime: 'night-audit',
          splitByNights: true,
          accountCode: 'AI-BEV'
        },
        {
          component: 'AI-SPA',
          postingTime: 'consumption',
          splitByNights: false,
          accountCode: 'AI-EXTRAS'
        }
      ]
    }
  ]
  
  // Post package charges during night audit
  static async postPackageCharges(auditDate: string) {
    const results = {
      posted: 0,
      failed: 0,
      skipped: 0,
      totalAmount: 0,
      details: [] as any[]
    }
    
    try {
      // Get all reservations with packages
      const reservations = await fetch('/api/hotel/reservations').then(r => r.json())
      const reservationPackages = typeof window !== 'undefined' 
        ? JSON.parse(localStorage.getItem('reservationPackages') || '[]')
        : []
      
      // Process each reservation with package
      for (const reservation of reservations) {
        // Check if has package
        const resPackage = reservationPackages.find((p: any) => 
          p.reservationId === reservation.id
        )
        
        if (!resPackage) continue
        
        // Check if in-house on audit date
        const checkIn = moment(reservation.checkIn)
        const checkOut = moment(reservation.checkOut)
        const audit = moment(auditDate)
        
        if (reservation.status !== 'CHECKED_IN' ||
            !checkIn.isSameOrBefore(audit, 'day') ||
            !checkOut.isAfter(audit, 'day')) {
          continue
        }
        
        // Post package components
        const postResult = await this.postPackageForReservation(
          reservation,
          resPackage,
          auditDate
        )
        
        if (postResult.success) {
          results.posted++
          results.totalAmount += postResult.totalAmount
        } else if (postResult.skipped) {
          results.skipped++
        } else {
          results.failed++
        }
        
        results.details.push(postResult)
      }
      
    } catch (error) {
      console.error('Package posting error:', error)
    }
    
    return results
  }
  
  // Post package for single reservation
  static async postPackageForReservation(
    reservation: any,
    resPackage: ReservationPackage,
    auditDate: string
  ) {
    try {
      // Check if already posted for this date
      if (resPackage.postedDates?.includes(auditDate)) {
        return {
          success: false,
          skipped: true,
          message: 'Package already posted for this date',
          reservation: reservation.id,
          room: reservation.roomNumber || reservation.roomId,
          guest: reservation.guestName
        }
      }
      
      // Get package definition
      const packageDef = this.PACKAGES.find(p => p.id === resPackage.packageId)
      if (!packageDef) {
        throw new Error('Package definition not found')
      }
      
      // Get or create folio
      const folios = typeof window !== 'undefined' 
        ? JSON.parse(localStorage.getItem('hotelFolios') || '[]')
        : []
      let folio = folios.find((f: any) => f.reservationId === reservation.id)
      
      if (!folio) {
        folio = await this.createFolio(reservation)
        folios.push(folio)
      }
      
      let totalPosted = 0
      const postedComponents: any[] = []
      
      // Post each component based on rules
      for (const component of packageDef.components) {
        const rule = packageDef.postingRules.find(r => r.component === component.id)
        
        // Check if should post in night audit
        if (rule?.postingTime !== 'night-audit') continue
        
        // Calculate amount (adults + children)
        const adultAmount = component.retailValue * resPackage.adults
        const childAmount = (component.retailValue * 0.5) * resPackage.children
        const totalAmount = adultAmount + childAmount
        
        // Calculate tax
        const taxAmount = totalAmount * (component.taxRate / 100)
        const grossAmount = totalAmount + taxAmount
        
        // Create transaction
        const transaction: FolioTransaction = {
          id: `PKG-${Date.now()}-${component.id}-${Math.random().toString(36).substr(2, 9)}`,
          folioId: folio.id,
          date: auditDate,
          time: moment().format('HH:mm:ss'),
          
          type: 'charge',
          category: component.category as any,
          description: `${packageDef.name} - ${component.name} (${resPackage.adults}A/${resPackage.children}C)`,
          
          debit: grossAmount,
          credit: 0,
          balance: folio.balance + grossAmount,
          
          postedBy: 'Night Audit',
          postedAt: moment().format(),
          nightAuditDate: auditDate,
          
          referenceId: `PKG-${reservation.id}-${auditDate}-${component.id}`,
          
          taxDetails: [{
            taxType: 'VAT',
            rate: component.taxRate,
            amount: taxAmount,
            base: totalAmount
          }]
        }
        
        // Add to folio
        folio.transactions.push(transaction)
        folio.balance += grossAmount
        totalPosted += grossAmount
        
        postedComponents.push({
          component: component.name,
          amount: grossAmount
        })
      }
      
      // Update package posting record
      if (!resPackage.postedDates) {
        resPackage.postedDates = []
      }
      resPackage.postedDates.push(auditDate)
      
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
      
      // Save package record
      const packages = typeof window !== 'undefined' 
        ? JSON.parse(localStorage.getItem('reservationPackages') || '[]')
        : []
      const pkgIndex = packages.findIndex((p: any) => p.reservationId === reservation.id)
      if (pkgIndex >= 0) {
        packages[pkgIndex] = resPackage
      } else {
        packages.push(resPackage)
      }
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('reservationPackages', JSON.stringify(packages))
      }
      
      return {
        success: true,
        totalAmount: totalPosted,
        reservation: reservation.id,
        room: reservation.roomNumber || reservation.roomId,
        guest: reservation.guestName,
        package: packageDef.name,
        components: postedComponents
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
  
  static async createFolio(reservation: any): Promise<Folio> {
    return {
      id: `FOLIO-${Date.now()}`,
      folioNumber: `F${moment().format('YYMMDD')}-${reservation.roomNumber || reservation.roomId || Math.floor(Math.random() * 1000)}`,
      reservationId: reservation.id,
      guestName: reservation.guestName,
      roomNumber: reservation.roomNumber || reservation.roomId,
      
      balance: 0,
      creditLimit: 5000,
      paymentMethod: 'cash',
      
      status: 'open',
      openDate: moment().format('YYYY-MM-DD'),
      
      transactions: []
    }
  }
}

