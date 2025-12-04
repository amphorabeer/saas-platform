import moment from 'moment'
import { FolioRoutingRule, CompanyFolio, FolioWindow } from '../types/folioRouting.types'

export class FolioRoutingService {
  
  // Create routing rule
  static createRoutingRule(params: {
    sourceFolioId: string
    targetFolioId: string
    routingType: string
    specificCategories?: string[]
    percentage?: number
    startDate?: string
    endDate?: string
    createdBy?: string
  }): FolioRoutingRule {
    const rule: FolioRoutingRule = {
      id: `ROUTE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sourceFolioId: params.sourceFolioId,
      targetFolioId: params.targetFolioId,
      
      name: this.generateRuleName(params.routingType, params.specificCategories),
      priority: this.calculatePriority(params.routingType),
      
      routingType: params.routingType as any,
      specificCategories: params.specificCategories,
      percentage: params.percentage,
      
      startDate: params.startDate || moment().format('YYYY-MM-DD'),
      endDate: params.endDate || moment().add(1, 'year').format('YYYY-MM-DD'),
      
      active: true,
      createdBy: params.createdBy || (typeof window !== 'undefined' 
        ? JSON.parse(localStorage.getItem('currentUser') || '{}').name || 'Admin'
        : 'Admin'),
      createdAt: moment().format()
    }
    
    // Save rule
    const rules = typeof window !== 'undefined' 
      ? JSON.parse(localStorage.getItem('folioRoutingRules') || '[]')
      : []
    rules.push(rule)
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('folioRoutingRules', JSON.stringify(rules))
    }
    
    return rule
  }
  
  // Generate rule name
  static generateRuleName(type: string, categories?: string[]): string {
    switch(type) {
      case 'all': return 'Route All Charges'
      case 'room': return 'Route Room & Tax'
      case 'extras': return 'Route Extra Charges'
      case 'packages': return 'Route Package Charges'
      case 'specific': return `Route ${categories?.join(', ') || 'Specific Categories'}`
      case 'percentage': return 'Percentage Split'
      default: return 'Custom Route'
    }
  }
  
  // Calculate priority (higher = apply first)
  static calculatePriority(type: string): number {
    const priorities: Record<string, number> = {
      'specific': 100,
      'percentage': 90,
      'extras': 80,
      'packages': 70,
      'room': 60,
      'all': 50
    }
    return priorities[type] || 0
  }
  
  // Apply routing rules when posting charges
  static async applyRoutingRules(transaction: any, sourceFolioId: string): Promise<{
    targetFolioId: string
    routed: boolean
    routingRule?: FolioRoutingRule
  }> {
    if (typeof window === 'undefined') {
      return { targetFolioId: sourceFolioId, routed: false }
    }
    
    // Get active routing rules for this folio
    const rules = JSON.parse(localStorage.getItem('folioRoutingRules') || '[]')
    const applicableRules = rules
      .filter((r: FolioRoutingRule) => 
        r.sourceFolioId === sourceFolioId &&
        r.active &&
        moment().isBetween(moment(r.startDate), moment(r.endDate), 'day', '[]')
      )
      .sort((a: any, b: any) => b.priority - a.priority)
    
    // Check each rule
    for (const rule of applicableRules) {
      if (this.shouldApplyRule(rule, transaction)) {
        return {
          targetFolioId: rule.targetFolioId,
          routed: true,
          routingRule: rule
        }
      }
    }
    
    // No routing - post to source folio
    return {
      targetFolioId: sourceFolioId,
      routed: false
    }
  }
  
  // Check if rule applies to transaction
  static shouldApplyRule(rule: FolioRoutingRule, transaction: any): boolean {
    switch(rule.routingType) {
      case 'all':
        return true
        
      case 'room':
        return transaction.category === 'room' || transaction.category === 'tax'
        
      case 'extras':
        return !['room', 'tax', 'package'].includes(transaction.category)
        
      case 'packages':
        return transaction.packageDetails !== undefined
        
      case 'specific':
        return rule.specificCategories?.includes(transaction.category) || false
        
      case 'percentage':
        // Random split based on percentage
        return Math.random() * 100 < (rule.percentage || 0)
        
      default:
        return false
    }
  }
  
  // Create company folio
  static createCompanyFolio(params: {
    companyName: string
    companyId: string
    contactPerson: string
    contactEmail: string
    contactPhone: string
    billingAddress: string
    taxNumber: string
    creditLimit: number
    paymentTerms: number
  }): CompanyFolio {
    const companyFolio: CompanyFolio = {
      id: `COMP-FOLIO-${Date.now()}`,
      folioNumber: `C${moment().format('YYMMDD')}-${params.companyId}`,
      
      companyName: params.companyName,
      companyId: params.companyId,
      
      contactPerson: params.contactPerson,
      contactEmail: params.contactEmail,
      contactPhone: params.contactPhone,
      
      billingAddress: params.billingAddress,
      taxNumber: params.taxNumber,
      
      creditLimit: params.creditLimit,
      creditUsed: 0,
      paymentTerms: params.paymentTerms,
      
      linkedReservations: [],
      
      balance: 0,
      transactions: [],
      
      status: 'open'
    }
    
    // Save company folio
    const companyFolios = typeof window !== 'undefined' 
      ? JSON.parse(localStorage.getItem('companyFolios') || '[]')
      : []
    companyFolios.push(companyFolio)
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('companyFolios', JSON.stringify(companyFolios))
    }
    
    return companyFolio
  }
  
  // Create folio windows for split billing
  static createFolioWindows(reservationId: string): FolioWindow[] {
    const windows: FolioWindow[] = [
      {
        id: `WIN-${reservationId}-1`,
        reservationId,
        windowNumber: 1,
        windowName: 'Room & Tax',
        balance: 0,
        transactions: [],
        status: 'open'
      },
      {
        id: `WIN-${reservationId}-2`,
        reservationId,
        windowNumber: 2,
        windowName: 'Extras',
        balance: 0,
        transactions: [],
        status: 'open'
      },
      {
        id: `WIN-${reservationId}-3`,
        reservationId,
        windowNumber: 3,
        windowName: 'Company',
        balance: 0,
        transactions: [],
        status: 'open'
      }
    ]
    
    // Save windows
    const allWindows = typeof window !== 'undefined' 
      ? JSON.parse(localStorage.getItem('folioWindows') || '[]')
      : []
    windows.forEach(w => allWindows.push(w))
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('folioWindows', JSON.stringify(allWindows))
    }
    
    return windows
  }
  
  // Transfer charges between folios
  static async transferCharges(params: {
    sourceTransactionIds: string[]
    sourceFolioId: string
    targetFolioId: string
    reason: string
  }) {
    try {
      if (typeof window === 'undefined') {
        throw new Error('Window not available')
      }
      
      const folios = JSON.parse(localStorage.getItem('hotelFolios') || '[]')
      
      // Find source and target folios
      const sourceFolio = folios.find((f: any) => f.id === params.sourceFolioId)
      const targetFolio = folios.find((f: any) => f.id === params.targetFolioId)
      
      if (!sourceFolio || !targetFolio) {
        throw new Error('Folio not found')
      }
      
      // Find transactions to transfer
      const transactionsToTransfer = sourceFolio.transactions.filter((t: any) =>
        params.sourceTransactionIds.includes(t.id)
      )
      
      if (transactionsToTransfer.length === 0) {
        throw new Error('No transactions found to transfer')
      }
      
      // Calculate total amount
      const totalAmount = transactionsToTransfer.reduce((sum: number, t: any) => 
        sum + (t.debit - t.credit), 0
      )
      
      // Create transfer records
      const transferId = `TRF-${Date.now()}`
      
      // Remove from source (credit)
      const sourceTransfer = {
        id: `${transferId}-OUT`,
        folioId: sourceFolio.id,
        date: moment().format('YYYY-MM-DD'),
        time: moment().format('HH:mm:ss'),
        
        type: 'transfer',
        category: 'transfer',
        description: `Transfer to Folio #${targetFolio.folioNumber} - ${params.reason}`,
        
        debit: 0,
        credit: totalAmount,
        balance: sourceFolio.balance - totalAmount,
        
        postedBy: typeof window !== 'undefined' 
          ? JSON.parse(localStorage.getItem('currentUser') || '{}').name || 'Admin'
          : 'Admin',
        postedAt: moment().format(),
        
        transferDetails: {
          transferId,
          direction: 'out',
          targetFolioId: targetFolio.id,
          transactionIds: params.sourceTransactionIds
        }
      }
      
      // Add to target (debit)
      const targetTransfer = {
        id: `${transferId}-IN`,
        folioId: targetFolio.id,
        date: moment().format('YYYY-MM-DD'),
        time: moment().format('HH:mm:ss'),
        
        type: 'transfer',
        category: 'transfer',
        description: `Transfer from Folio #${sourceFolio.folioNumber} - ${params.reason}`,
        
        debit: totalAmount,
        credit: 0,
        balance: targetFolio.balance + totalAmount,
        
        postedBy: typeof window !== 'undefined' 
          ? JSON.parse(localStorage.getItem('currentUser') || '{}').name || 'Admin'
          : 'Admin',
        postedAt: moment().format(),
        
        transferDetails: {
          transferId,
          direction: 'in',
          sourceFolioId: sourceFolio.id,
          transactionIds: params.sourceTransactionIds
        }
      }
      
      // Copy original transactions to target
      transactionsToTransfer.forEach(t => {
        const copiedTransaction = {
          ...t,
          id: `${t.id}-TRANSFERRED`,
          folioId: targetFolio.id,
          transferred: true,
          transferredFrom: sourceFolio.id,
          transferredAt: moment().format()
        }
        targetFolio.transactions.push(copiedTransaction)
      })
      
      // Update folios
      sourceFolio.transactions.push(sourceTransfer)
      sourceFolio.balance -= totalAmount
      
      targetFolio.transactions.push(targetTransfer)
      targetFolio.balance += totalAmount
      
      // Save folios
      const sourceFolioIndex = folios.findIndex((f: any) => f.id === sourceFolio.id)
      folios[sourceFolioIndex] = sourceFolio
      
      const targetFolioIndex = folios.findIndex((f: any) => f.id === targetFolio.id)
      folios[targetFolioIndex] = targetFolio
      
      localStorage.setItem('hotelFolios', JSON.stringify(folios))
      
      return {
        success: true,
        transferId,
        amount: totalAmount
      }
      
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      }
    }
  }
  
  // Get routing rules for folio
  static getRoutingRules(folioId: string): FolioRoutingRule[] {
    if (typeof window === 'undefined') return []
    
    const rules = JSON.parse(localStorage.getItem('folioRoutingRules') || '[]')
    return rules.filter((r: FolioRoutingRule) => r.sourceFolioId === folioId)
  }
  
  // Get company folios
  static getCompanyFolios(): CompanyFolio[] {
    if (typeof window === 'undefined') return []
    
    return JSON.parse(localStorage.getItem('companyFolios') || '[]')
  }
  
  // Get folio windows
  static getFolioWindows(reservationId: string): FolioWindow[] {
    if (typeof window === 'undefined') return []
    
    const windows = JSON.parse(localStorage.getItem('folioWindows') || '[]')
    return windows.filter((w: FolioWindow) => w.reservationId === reservationId)
  }
}



