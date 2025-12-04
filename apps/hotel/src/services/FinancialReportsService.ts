import moment from 'moment'

export class FinancialReportsService {
  
  // Generate daily revenue report
  static async generateDailyRevenueReport(date: string) {
    if (typeof window === 'undefined') {
      return {
        date,
        revenue: { byCategory: {}, byDepartment: {}, total: 0 },
        taxes: { VAT: 0, CITY_TAX: 0, TOURISM_TAX: 0, total: 0 },
        payments: { methods: {}, total: 0, count: 0 },
        statistics: { transactionCount: 0, averageTransaction: 0 }
      }
    }
    
    const folios = JSON.parse(localStorage.getItem('hotelFolios') || '[]')
    const targetDate = moment(date).format('YYYY-MM-DD')
    
    // Get all CHARGE transactions for the date
    // Exclude adjustment transactions (adj-) and negative amounts
    const dayTransactions = folios.flatMap((f: any) => 
      f.transactions
        .filter((t: any) => {
          if (t.type !== 'charge') return false
          
          // Exclude adjustment transactions (from resize operations)
          if (t.id && t.id.startsWith('adj-')) return false
          
          const transactionDate = moment(t.date).format('YYYY-MM-DD')
          
          // Match by transaction date
          return transactionDate === targetDate
        })
        .map((t: any) => ({
          ...t,
          folioNumber: f.folioNumber,
          guestName: f.guestName,
          roomNumber: f.roomNumber
        }))
    )
    
    console.log(`Revenue for ${date}:`, dayTransactions.length, 'transactions', dayTransactions)
    
    // Group by category
    const revenueByCategory = this.groupByCategory(dayTransactions)
    
    // Group by department
    const revenueByDepartment = this.groupByDepartment(dayTransactions)
    
    // Calculate total revenue
    const totalRevenue = Object.values(revenueByCategory).reduce((sum: number, val: number) => {
      const numVal = Number(val) || 0
      return sum + numVal
    }, 0)
    
    // Tax summary
    const taxSummary = this.calculateTaxSummary(dayTransactions)
    
    // Payment methods
    const paymentSummary = await this.getPaymentSummary(date)
    
    return {
      date,
      revenue: {
        byCategory: revenueByCategory,
        byDepartment: revenueByDepartment,
        total: totalRevenue
      },
      taxes: taxSummary,
      payments: paymentSummary,
      statistics: {
        transactionCount: dayTransactions.length,
        averageTransaction: dayTransactions.length > 0 
          ? totalRevenue / dayTransactions.length
          : 0
      }
    }
  }
  
  // Group revenue by category - FIXED: use amount instead of debit, skip negative
  static groupByCategory(transactions: any[]) {
    const categories: Record<string, number> = {
      room: 0,
      food: 0,
      beverage: 0,
      spa: 0,
      laundry: 0,
      transport: 0,
      phone: 0,
      minibar: 0,
      extras: 0,
      misc: 0
    }
    
    transactions.forEach(t => {
      const category = t.category || 'misc'
      // Use debit first (standard format), then amount as fallback
      const amount = Number(t.debit) || Number(t.amount) || 0
      
      // Skip negative amounts (adjustments/refunds should not count as revenue)
      if (amount <= 0) return
      
      if (categories.hasOwnProperty(category)) {
        categories[category] += amount
      } else {
        categories.misc += amount
      }
    })
    
    return categories
  }
  
  // Group revenue by department - FIXED: use debit first, skip negative
  static groupByDepartment(transactions: any[]) {
    const departments: Record<string, number> = {
      ROOMS: 0,
      'F&B': 0,
      SPA: 0,
      OTHER: 0
    }
    
    transactions.forEach(t => {
      // Use debit first (standard format), then amount as fallback
      const amount = Number(t.debit) || Number(t.amount) || 0
      
      // Skip negative amounts
      if (amount <= 0) return
      
      if (['room', 'minibar'].includes(t.category)) {
        departments.ROOMS += amount
      } else if (['food', 'beverage', 'breakfast', 'lunch', 'dinner'].includes(t.category)) {
        departments['F&B'] += amount
      } else if (t.category === 'spa') {
        departments.SPA += amount
      } else {
        departments.OTHER += amount
      }
    })
    
    return departments
  }
  
  // Calculate tax summary
  static calculateTaxSummary(transactions: any[]) {
    const taxes = {
      VAT: 0,
      CITY_TAX: 0,
      TOURISM_TAX: 0,
      total: 0
    }
    
    transactions.forEach(t => {
      if (t.taxDetails && Array.isArray(t.taxDetails)) {
        t.taxDetails.forEach((tax: any) => {
          const taxAmount = Number(tax.amount) || 0
          if (tax.taxType === 'VAT') {
            taxes.VAT += taxAmount
          } else if (tax.taxType === 'CITY_TAX') {
            taxes.CITY_TAX += taxAmount
          } else if (tax.taxType === 'TOURISM_TAX') {
            taxes.TOURISM_TAX += taxAmount
          }
          taxes.total += taxAmount
        })
      }
    })
    
    return taxes
  }
  
  // Get payment summary
  static async getPaymentSummary(date: string) {
    if (typeof window === 'undefined') {
      return { methods: {}, total: 0, count: 0 }
    }
    
    const targetDate = moment(date).format('YYYY-MM-DD')
    
    // Get payments from paymentHistory (more reliable)
    const paymentHistory = JSON.parse(localStorage.getItem('paymentHistory') || '[]')
    const dayPayments = paymentHistory.filter((p: any) => 
      moment(p.date).format('YYYY-MM-DD') === targetDate
    )
    
    // Also check folio transactions as backup
    const folios = JSON.parse(localStorage.getItem('hotelFolios') || '[]')
    const folioPayments = folios.flatMap((f: any) =>
      (f.transactions || []).filter((t: any) => 
        moment(t.date).format('YYYY-MM-DD') === targetDate && 
        t.type === 'payment'
      )
    )
    
    // Combine (avoid duplicates by checking referenceId)
    const allPayments = [...dayPayments]
    folioPayments.forEach((fp: any) => {
      if (!allPayments.find((p: any) => p.referenceId === fp.referenceId)) {
        allPayments.push(fp)
      }
    })
    
    const paymentMethods: Record<string, number> = {
      cash: 0,
      card: 0,
      bank: 0,
      company: 0,
      debit: 0,
      online: 0,
      voucher: 0,
      deposit: 0
    }
    
    allPayments.forEach((p: any) => {
      const method = p.paymentMethod || p.method || 'cash'
      const amount = Number(p.credit) || Number(p.amount) || 0
      
      if (paymentMethods.hasOwnProperty(method)) {
        paymentMethods[method] += amount
      } else {
        paymentMethods.cash += amount
      }
    })
    
    const total = Object.values(paymentMethods).reduce((sum: number, val: number) => sum + (Number(val) || 0), 0)
    
    return {
      methods: paymentMethods,
      total,
      count: allPayments.length
    }
  }
  
  // Generate manager report
  static async generateManagerReport(date: string) {
    let reservations: any[] = []
    let rooms: any[] = []
    
    try {
      const resResponse = await fetch('/api/hotel/reservations')
      if (resResponse.ok) {
        reservations = await resResponse.json()
      }
      
      const roomsResponse = await fetch('/api/hotel/rooms')
      if (roomsResponse.ok) {
        rooms = await roomsResponse.json()
      }
    } catch (error) {
      console.error('Error fetching data for manager report:', error)
    }
    
    if (typeof window === 'undefined') {
      return {
        date,
        occupancy: { rooms: { total: 0, occupied: 0, available: 0, percentage: 0 }, guests: { inHouse: 0, arrivals: 0, departures: 0 } },
        revenue: { byCategory: {}, byDepartment: {}, total: 0 },
        kpis: { adr: '0.00', revpar: '0.00', occupancyRate: '0%' },
        financial: { outstandingBalances: 0, cashPosition: 0, creditCardReceipts: 0 }
      }
    }
    
    const folios = JSON.parse(localStorage.getItem('hotelFolios') || '[]')
    
    // Occupancy statistics
    // Count all currently CHECKED_IN reservations (regardless of original dates)
    // These are guests physically in the hotel right now
    const occupiedRooms = reservations.filter((r: any) => r.status === 'CHECKED_IN').length
    
    const totalRooms = rooms.length || 1 // Prevent division by zero
    const occupancy = (occupiedRooms / totalRooms) * 100
    
    // Revenue statistics
    const revenueReport = await this.generateDailyRevenueReport(date)
    
    // ADR (Average Daily Rate)
    const roomRevenue = Number(revenueReport.revenue.byCategory.room) || 0
    const adr = occupiedRooms > 0 ? roomRevenue / occupiedRooms : 0
    
    // RevPAR (Revenue Per Available Room)
    const revpar = totalRooms > 0 ? roomRevenue / totalRooms : 0
    
    // Outstanding balances
    const outstandingBalances = folios
      .filter((f: any) => f.status === 'open' && f.balance > 0)
      .reduce((sum: number, f: any) => sum + (Number(f.balance) || 0), 0)
    
    return {
      date,
      occupancy: {
        rooms: {
          total: totalRooms,
          occupied: occupiedRooms,
          available: totalRooms - occupiedRooms,
          percentage: occupancy
        },
        guests: {
          inHouse: reservations.filter((r: any) => r.status === 'CHECKED_IN').length,
          arrivals: reservations.filter((r: any) => 
            moment(r.checkIn).format('YYYY-MM-DD') === date
          ).length,
          departures: reservations.filter((r: any) => 
            moment(r.checkOut).format('YYYY-MM-DD') === date
          ).length
        }
      },
      revenue: revenueReport.revenue,
      kpis: {
        adr: adr.toFixed(2),
        revpar: revpar.toFixed(2),
        occupancyRate: occupancy.toFixed(1) + '%'
      },
      financial: {
        outstandingBalances,
        cashPosition: Number(revenueReport.payments.methods.cash) || 0,
        creditCardReceipts: Number(revenueReport.payments.methods.card) || 0
      }
    }
  }
  
  // Generate monthly report
  static async generateMonthlyReport(year: number, month: number) {
    const startDate = moment({ year, month: month - 1 }).startOf('month')
    const endDate = moment({ year, month: month - 1 }).endOf('month')
    
    const dailyReports = []
    let currentDate = startDate.clone()
    
    while (currentDate.isSameOrBefore(endDate)) {
      const report = await this.generateDailyRevenueReport(currentDate.format('YYYY-MM-DD'))
      dailyReports.push(report)
      currentDate.add(1, 'day')
    }
    
    return {
      year,
      month,
      totalRevenue: dailyReports.reduce((sum, r) => sum + (r.revenue.total || 0), 0),
      totalPayments: dailyReports.reduce((sum, r) => sum + (r.payments.total || 0), 0),
      totalTaxes: dailyReports.reduce((sum, r) => sum + (r.taxes.total || 0), 0),
      dailyBreakdown: dailyReports
    }
  }
}