import moment from 'moment'
import { CompanyService } from './CompanyService'

/**
 * InvoiceService
 * Handles invoice generation, PDF creation, and email sending
 */

export interface Invoice {
  id: string
  number: string
  
  // Company info
  companyId: string
  companyName: string
  companyTaxId?: string
  companyAddress?: string
  companyEmail?: string
  
  // Items
  items: InvoiceItem[]
  
  // Totals
  subtotal: number
  tax: number
  taxRate: number
  serviceCharge: number
  total: number
  
  // Dates
  issueDate: string
  dueDate: string
  
  // Status
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  
  // Payment info
  paidAmount: number
  paidDate?: string
  paymentMethod?: string
  
  // Metadata
  createdAt: string
  sentAt?: string
  notes?: string
  
  // Reference
  transactionId?: string
  sourceType?: string
  sourceRef?: string
}

export interface InvoiceItem {
  description: string
  quantity: number
  unitPrice: number
  total: number
  category?: string
}

export interface HotelInfo {
  name: string
  company: string
  taxId: string
  address: string
  city: string
  country: string
  phone: string
  email: string
  website?: string
  bankName: string
  bankAccount: string
  logo?: string
}

export class InvoiceService {
  
  // Cache for invoices
  private static invoicesCache: Invoice[] = []
  private static lastFetch = 0
  
  // ==================== INVOICE CRUD ====================
  
  /**
   * Fetch all invoices from API
   */
  static async fetchAll(): Promise<Invoice[]> {
    try {
      const res = await fetch('/api/hotel/company-invoices')
      if (res.ok) {
        const data = await res.json()
        // Map API response to Invoice format
        this.invoicesCache = data.map((inv: any) => ({
          id: inv.id,
          number: inv.invoiceNumber || inv.number,
          companyId: inv.companyId,
          companyName: inv.company?.name || '',
          
          items: (inv.items || []).map((item: any) => ({
            id: item.id,
            description: item.description || item.name,
            quantity: item.quantity || 1,
            unitPrice: Number(item.unitPrice) || 0,
            total: Number(item.total) || 0
          })),
          
          subtotal: Number(inv.subtotal) || 0,
          tax: Number(inv.tax) || 0,
          taxRate: Number(inv.taxRate) || 18,
          serviceCharge: Number(inv.serviceCharge) || 0,
          total: Number(inv.total) || 0,
          paidAmount: Number(inv.paidAmount) || 0,
          
          issueDate: inv.issueDate,
          dueDate: inv.dueDate,
          status: inv.status || 'pending',
          
          notes: inv.notes,
          createdAt: inv.createdAt,
          paidAt: inv.paidAt
        }))
        this.lastFetch = Date.now()
        return this.invoicesCache
      }
    } catch (e) {
      console.error('Error fetching invoices:', e)
    }
    return this.invoicesCache
  }

  /**
   * Get all invoices (sync - from cache)
   */
  static getAll(): Invoice[] {
    // Trigger async fetch if cache is stale
    if (Date.now() - this.lastFetch > 30000) {
      this.fetchAll()
    }
    return this.invoicesCache
  }
  
  /**
   * Get invoice by ID
   */
  static getById(id: string): Invoice | null {
    const invoices = this.getAll()
    return invoices.find(inv => inv.id === id || inv.number === id) || null
  }
  
  /**
   * Get invoices by company
   */
  static getByCompany(companyId: string): Invoice[] {
    return this.getAll().filter(inv => inv.companyId === companyId)
  }
  
  /**
   * Get invoices by status
   */
  static getByStatus(status: Invoice['status']): Invoice[] {
    return this.getAll().filter(inv => inv.status === status)
  }
  
  /**
   * Get overdue invoices
   */
  static getOverdue(): Invoice[] {
    const today = moment().format('YYYY-MM-DD')
    return this.getAll().filter(inv => 
      (inv.status === 'sent' || inv.status === 'overdue') && 
      inv.dueDate < today
    )
  }
  
  /**
   * Create new invoice via API
   */
  static async createAsync(data: {
    companyId: string
    items: InvoiceItem[]
    subtotal: number
    tax: number
    serviceCharge: number
    total: number
    dueDate?: string
    notes?: string
    transactionId?: string
    sourceType?: string
    sourceRef?: string
  }): Promise<Invoice | null> {
    try {
      const res = await fetch('/api/hotel/company-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (res.ok) {
        const invoice = await res.json()
        this.invoicesCache.push(invoice)
        return invoice
      }
    } catch (e) {
      console.error('Error creating invoice:', e)
    }
    return null
  }

  /**
   * Create new invoice (sync wrapper for compatibility)
   * Also saves to API in background
   */
  static create(data: {
    companyId: string
    items: InvoiceItem[]
    subtotal: number
    tax: number
    serviceCharge: number
    total: number
    dueDate?: string
    notes?: string
    transactionId?: string
    sourceType?: string
    sourceRef?: string
  }): Invoice {
    const company = CompanyService.getById(data.companyId)
    const invoiceNumber = this.generateNumber()
    
    // Get tax rate from settings
    let taxRate = 18
    
    const invoice: Invoice = {
      id: `INV-${Date.now()}`,
      number: invoiceNumber,
      
      companyId: data.companyId,
      companyName: company?.name || 'Unknown',
      companyTaxId: company?.taxId,
      companyAddress: company?.legalAddress,
      companyEmail: company?.email,
      
      items: data.items,
      
      subtotal: data.subtotal,
      tax: data.tax,
      taxRate,
      serviceCharge: data.serviceCharge,
      total: data.total,
      
      issueDate: moment().format('YYYY-MM-DD'),
      dueDate: data.dueDate || moment().add(company?.paymentTerms || 30, 'days').format('YYYY-MM-DD'),
      
      status: 'draft',
      paidAmount: 0,
      
      createdAt: moment().format(),
      notes: data.notes,
      
      transactionId: data.transactionId,
      sourceType: data.sourceType,
      sourceRef: data.sourceRef
    }
    
    // Add to local cache
    this.invoicesCache.push(invoice)
    
    // Save to API in background
    this.createAsync(data).then(apiInvoice => {
      if (apiInvoice) {
        // Update cache with API response (has proper ID)
        const idx = this.invoicesCache.findIndex(inv => inv.id === invoice.id)
        if (idx >= 0) {
          this.invoicesCache[idx] = {
            ...invoice,
            id: apiInvoice.id,
            number: apiInvoice.number || invoice.number
          }
        }
        console.log('[InvoiceService] Invoice saved to API:', apiInvoice.id)
      }
    }).catch(e => {
      console.error('[InvoiceService] Failed to save invoice to API:', e)
    })
    
    return invoice
  }
  
  /**
   * Update invoice
   */
  static update(id: string, updates: Partial<Invoice>): Invoice | null {
    const invoices = this.getAll()
    const index = invoices.findIndex(inv => inv.id === id)
    
    if (index < 0) return null
    
    invoices[index] = { ...invoices[index], ...updates }
    this.saveAll(invoices)
    
    return invoices[index]
  }
  
  /**
   * Mark invoice as sent
   */
  static markAsSent(id: string): Invoice | null {
    return this.update(id, { 
      status: 'sent', 
      sentAt: moment().format() 
    })
  }
  
  /**
   * Mark invoice as paid
   */
  static markAsPaid(id: string, paymentMethod: string): Invoice | null {
    const invoice = this.getById(id)
    if (!invoice) return null
    
    return this.update(id, {
      status: 'paid',
      paidAmount: invoice.total,
      paidDate: moment().format('YYYY-MM-DD'),
      paymentMethod
    })
  }
  
  /**
   * Cancel invoice
   */
  static cancel(id: string): Invoice | null {
    return this.update(id, { status: 'cancelled' })
  }
  
  /**
   * Generate invoice number
   */
  static generateNumber(): string {
    const year = moment().format('YY')
    const month = moment().format('MM')
    
    // Get last invoice number for this month
    const invoices = this.getAll()
    const thisMonthInvoices = invoices.filter(inv => 
      inv.number.startsWith(`INV-${year}${month}`)
    )
    
    const seq = (thisMonthInvoices.length + 1).toString().padStart(4, '0')
    return `INV-${year}${month}-${seq}`
  }
  
  /**
   * Save all invoices
   */
  private static saveAll(invoices: Invoice[]) {
    this.invoicesCache = invoices
    // Sync operations - API calls will be made individually
  }

  /**
   * Save invoice to API
   */
  private static async saveToApi(invoice: Invoice): Promise<void> {
    try {
      await fetch(`/api/hotel/company-invoices/${invoice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoice)
      })
    } catch (e) {
      console.error('Error saving invoice:', e)
    }
  }
  
  // ==================== PDF GENERATION ====================
  
  /**
   * Generate PDF invoice
   */
  static async generatePDF(invoiceId: string): Promise<Blob | null> {
    const invoice = this.getById(invoiceId)
    if (!invoice) return null
    
    // Get hotel info
    const hotelInfo = this.getHotelInfo()
    
    // Create PDF content
    const pdfContent = this.createPDFContent(invoice, hotelInfo)
    
    // Use browser's print functionality or a PDF library
    // For now, we'll create an HTML version that can be printed
    return this.htmlToPDF(pdfContent)
  }
  
  /**
   * Get hotel info for invoice
   */
  private static getHotelInfo(): HotelInfo {
    if (typeof window === 'undefined') {
      return {
        name: 'Brewery House & Beer Spa',
        company: 'Brewery House LLC',
        taxId: '000000000',
        address: 'Address',
        city: 'Tbilisi',
        country: 'Georgia',
        phone: '+995',
        email: 'info@breweryhouse.ge',
        bankName: 'Bank of Georgia',
        bankAccount: 'GE00TB0000000000000000'
      }
    }
    
    // Try to get from localStorage (organization data is saved there by settings)
    try {
      const saved = localStorage.getItem('simpleHotelInfo') || localStorage.getItem('hotelInfo')
      if (saved) {
        const org = JSON.parse(saved)
        return {
          name: org.name || 'Brewery House & Beer Spa',
          company: org.company || org.name || '',
          taxId: org.taxId || '',
          address: org.address || '',
          city: org.city || 'თბილისი',
          country: org.country || 'საქართველო',
          phone: org.phone || '',
          email: org.email || '',
          website: org.website,
          bankName: org.bankName || '',
          bankAccount: org.bankAccount || '',
          logo: org.logo
        }
      }
    } catch (e) {
      console.error('Error reading hotel info:', e)
    }
    
    // Fallback defaults
    return {
      name: 'Brewery House & Beer Spa',
      company: 'Brewery House LLC',
      taxId: '000000000',
      address: 'Address',
      city: 'Tbilisi',
      country: 'Georgia',
      phone: '+995',
      email: 'info@breweryhouse.ge',
      bankName: 'Bank of Georgia',
      bankAccount: 'GE00TB0000000000000000'
    }
  }
  
  /**
   * Create PDF content (HTML)
   */
  private static createPDFContent(invoice: Invoice, hotel: HotelInfo): string {
    const formatCurrency = (amount: number | undefined | null) => `₾${(Number(amount) || 0).toFixed(2)}`
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'DejaVu Sans', Arial, sans-serif; font-size: 12px; color: #333; padding: 40px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #2563eb; padding-bottom: 20px; }
    .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
    .logo-sub { font-size: 12px; color: #666; }
    .invoice-title { text-align: right; }
    .invoice-title h1 { font-size: 28px; color: #2563eb; margin-bottom: 5px; }
    .invoice-number { font-size: 14px; color: #666; }
    .parties { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .party { width: 45%; }
    .party-title { font-weight: bold; color: #2563eb; margin-bottom: 10px; font-size: 14px; }
    .party-info { line-height: 1.6; }
    .dates { display: flex; gap: 40px; margin-bottom: 30px; padding: 15px; background: #f3f4f6; border-radius: 8px; }
    .date-item { }
    .date-label { font-size: 11px; color: #666; }
    .date-value { font-weight: bold; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { background: #2563eb; color: white; padding: 12px; text-align: left; }
    td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
    tr:nth-child(even) { background: #f9fafb; }
    .totals { width: 300px; margin-left: auto; }
    .total-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .total-row.final { border-top: 2px solid #2563eb; border-bottom: none; font-size: 18px; font-weight: bold; color: #2563eb; padding-top: 15px; }
    .bank-info { margin-top: 40px; padding: 20px; background: #fef3c7; border-radius: 8px; }
    .bank-title { font-weight: bold; margin-bottom: 10px; }
    .footer { margin-top: 40px; text-align: center; color: #666; font-size: 11px; border-top: 1px solid #e5e7eb; padding-top: 20px; }
    .status { display: inline-block; padding: 5px 15px; border-radius: 20px; font-weight: bold; }
    .status-paid { background: #d1fae5; color: #065f46; }
    .status-sent { background: #dbeafe; color: #1e40af; }
    .status-overdue { background: #fee2e2; color: #991b1b; }
    .notes { margin-top: 20px; padding: 15px; background: #f3f4f6; border-radius: 8px; }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">${hotel.name}</div>
      <div class="logo-sub">${hotel.company}</div>
    </div>
    <div class="invoice-title">
      <h1>ინვოისი</h1>
      <div class="invoice-number">${invoice.number}</div>
      <div class="status status-${invoice.status}">${
        invoice.status === 'paid' ? 'გადახდილი' :
        invoice.status === 'sent' ? 'გაგზავნილი' :
        invoice.status === 'overdue' ? 'ვადაგადაცილებული' :
        invoice.status === 'cancelled' ? 'გაუქმებული' : 'მომლოდინე'
      }</div>
    </div>
  </div>
  
  <div class="parties">
    <div class="party">
      <div class="party-title">გამცემი:</div>
      <div class="party-info">
        <strong>${hotel.company}</strong><br>
        ს/კ: ${hotel.taxId}<br>
        ${hotel.address}<br>
        ${hotel.city}, ${hotel.country}<br>
        ტელ: ${hotel.phone}<br>
        ელ-ფოსტა: ${hotel.email}
      </div>
    </div>
    <div class="party">
      <div class="party-title">მიმღები:</div>
      <div class="party-info">
        <strong>${invoice.companyName}</strong><br>
        ${invoice.companyTaxId ? `ს/კ: ${invoice.companyTaxId}<br>` : ''}
        ${invoice.companyAddress || ''}<br>
        ${invoice.companyEmail || ''}
      </div>
    </div>
  </div>
  
  <div class="dates">
    <div class="date-item">
      <div class="date-label">გამოწერის თარიღი:</div>
      <div class="date-value">${moment(invoice.issueDate).format('DD/MM/YYYY')}</div>
    </div>
    <div class="date-item">
      <div class="date-label">გადახდის ვადა:</div>
      <div class="date-value">${moment(invoice.dueDate).format('DD/MM/YYYY')}</div>
    </div>
    ${invoice.paidDate ? `
    <div class="date-item">
      <div class="date-label">გადახდის თარიღი:</div>
      <div class="date-value">${moment(invoice.paidDate).format('DD/MM/YYYY')}</div>
    </div>
    ` : ''}
  </div>
  
  <table>
    <thead>
      <tr>
        <th style="width: 50%">აღწერა</th>
        <th style="width: 15%; text-align: center;">რაოდენობა</th>
        <th style="width: 15%; text-align: right;">ფასი</th>
        <th style="width: 20%; text-align: right;">ჯამი</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.items.map(item => `
      <tr>
        <td>${item.description}</td>
        <td style="text-align: center;">${item.quantity}</td>
        <td style="text-align: right;">${formatCurrency(item.unitPrice)}</td>
        <td style="text-align: right;">${formatCurrency(item.total)}</td>
      </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div class="totals">
    <div class="total-row">
      <span>ქვეჯამი:</span>
      <span>${formatCurrency(invoice.subtotal)}</span>
    </div>
    ${invoice.tax > 0 ? `
    <div class="total-row">
      <span>დღგ (${invoice.taxRate}%):</span>
      <span>${formatCurrency(invoice.tax)}</span>
    </div>
    ` : ''}
    ${invoice.serviceCharge > 0 ? `
    <div class="total-row">
      <span>მომსახურება:</span>
      <span>${formatCurrency(invoice.serviceCharge)}</span>
    </div>
    ` : ''}
    <div class="total-row final">
      <span>სულ გადასახდელი:</span>
      <span>${formatCurrency(invoice.total)}</span>
    </div>
  </div>
  
  <div class="bank-info">
    <div class="bank-title">🏦 საბანკო რეკვიზიტები:</div>
    <div>
      <strong>ბანკი:</strong> ${hotel.bankName}<br>
      <strong>ანგარიში:</strong> ${hotel.bankAccount}<br>
      <strong>დანიშნულება:</strong> ინვოისი ${invoice.number}
    </div>
  </div>
  
  ${invoice.notes ? `
  <div class="notes">
    <strong>შენიშვნა:</strong> ${invoice.notes}
  </div>
  ` : ''}
  
  <div class="footer">
    <p>მადლობა თანამშრომლობისთვის!</p>
    <p>${hotel.name} | ${hotel.phone} | ${hotel.email}</p>
  </div>
</body>
</html>
    `
  }
  
  /**
   * Convert HTML to PDF blob
   */
  private static async htmlToPDF(html: string): Promise<Blob> {
    // Create a blob from HTML
    return new Blob([html], { type: 'text/html' })
  }
  
  /**
   * Open print dialog for invoice
   */
  static printInvoice(invoiceId: string) {
    const invoice = this.getById(invoiceId)
    if (!invoice) return
    
    const hotelInfo = this.getHotelInfo()
    const content = this.createPDFContent(invoice, hotelInfo)
    
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(content)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
      }, 500)
    }
  }
  
  /**
   * Download invoice as HTML (can be printed to PDF)
   */
  static downloadInvoice(invoiceId: string) {
    const invoice = this.getById(invoiceId)
    if (!invoice) return
    
    const hotelInfo = this.getHotelInfo()
    const content = this.createPDFContent(invoice, hotelInfo)
    
    const blob = new Blob([content], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = `invoice-${invoice.number}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  
  // ==================== EMAIL ====================
  
  /**
   * Send invoice via email
   */
  static async sendEmail(invoiceId: string): Promise<boolean> {
    const invoice = this.getById(invoiceId)
    if (!invoice || !invoice.companyEmail) {
      console.error('Invoice or company email not found')
      return false
    }
    
    try {
      // Get hotel info
      const hotelInfo = this.getHotelInfo()
      const pdfContent = this.createPDFContent(invoice, hotelInfo)
      
      // Try to send via API
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: invoice.companyEmail,
          subject: `ინვოისი ${invoice.number} - ${hotelInfo.name}`,
          html: `
            <p>გამარჯობა,</p>
            <p>გთხოვთ იხილოთ თანდართული ინვოისი ${invoice.number}.</p>
            <p><strong>ჯამი:</strong> ₾${invoice.total.toFixed(2)}</p>
            <p><strong>გადახდის ვადა:</strong> ${moment(invoice.dueDate).format('DD/MM/YYYY')}</p>
            <br>
            <p>პატივისცემით,</p>
            <p>${hotelInfo.name}</p>
          `,
          attachments: [
            {
              filename: `invoice-${invoice.number}.html`,
              content: pdfContent
            }
          ]
        })
      })
      
      if (response.ok) {
        // Mark as sent
        this.markAsSent(invoiceId)
        return true
      }
      
      // If API fails, open mailto link
      const mailtoLink = `mailto:${invoice.companyEmail}?subject=ინვოისი ${invoice.number}&body=გთხოვთ იხილოთ თანდართული ინვოისი. ჯამი: ₾${invoice.total.toFixed(2)}, ვადა: ${moment(invoice.dueDate).format('DD/MM/YYYY')}`
      window.open(mailtoLink)
      
      this.markAsSent(invoiceId)
      return true
      
    } catch (error) {
      console.error('Error sending invoice email:', error)
      return false
    }
  }
  
  // ==================== STATISTICS ====================
  
  /**
   * Get invoice statistics
   */
  static getStatistics(): {
    total: number
    paid: number
    pending: number
    overdue: number
    totalAmount: number
    paidAmount: number
    pendingAmount: number
    overdueAmount: number
  } {
    const invoices = this.getAll()
    const overdue = this.getOverdue()
    
    const paid = invoices.filter(inv => inv.status === 'paid')
    const pending = invoices.filter(inv => inv.status === 'sent' || inv.status === 'draft')
    
    return {
      total: invoices.length,
      paid: paid.length,
      pending: pending.length,
      overdue: overdue.length,
      totalAmount: invoices.reduce((sum, inv) => sum + inv.total, 0),
      paidAmount: paid.reduce((sum, inv) => sum + inv.total, 0),
      pendingAmount: pending.reduce((sum, inv) => sum + (inv.total - inv.paidAmount), 0),
      overdueAmount: overdue.reduce((sum, inv) => sum + (inv.total - inv.paidAmount), 0)
    }
  }
}