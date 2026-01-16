'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui'
import { formatDate, formatCurrency } from '@/lib/utils'

interface InvoiceItem {
  id?: string
  description: string
  quantity: number
  unit: string
  unitPrice: number
  total: number
}

interface InvoicePayment {
  id: string
  amount: number
  method: string
  date: string
  reference: string | null
}

interface Invoice {
  id: string
  invoiceNumber: string
  type: 'outgoing' | 'incoming'
  status: string
  statusName: string
  issueDate: string
  dueDate: string | null
  customerId: string | null
  customerName: string | null
  customerPhone?: string | null
  customerEmail?: string | null
  customerAddress?: string | null
  customerTaxId?: string | null
  supplierId: string | null
  supplierName: string | null
  subtotal: number
  discount: number
  tax: number
  total: number
  paidAmount: number
  remaining: number
  items: InvoiceItem[]
  payments?: InvoicePayment[]
  notes: string | null
}

interface Customer {
  id: string
  name: string
}

interface Supplier {
  id: string
  name: string
}

interface InvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: InvoiceFormData) => void
  onDelete?: () => void
  invoice?: Invoice | null
  mode?: 'view' | 'create' | 'edit'
  customers?: Customer[]
  suppliers?: Supplier[]
  onSend?: (invoiceId: string) => void
}

export interface InvoiceFormData {
  type: 'outgoing' | 'incoming'
  customerId?: string
  supplierId?: string
  issueDate: string
  dueDate: string
  items: InvoiceItem[]
  discount: number
  tax: number
  notes?: string
}

const statusConfig: Record<string, { name: string; color: string }> = {
  draft: { name: 'დრაფტი', color: 'text-gray-400' },
  sent: { name: 'გაგზავნილი', color: 'text-blue-400' },
  paid: { name: 'გადახდილი', color: 'text-green-400' },
  partial: { name: 'ნაწილობრივ', color: 'text-amber-400' },
  overdue: { name: 'ვადაგასული', color: 'text-red-400' },
  cancelled: { name: 'გაუქმებული', color: 'text-gray-500' },
}

export function InvoiceModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  onDelete, 
  invoice, 
  mode: initialMode,
  customers = [],
  suppliers = [],
  onSend,
}: InvoiceModalProps) {
  const [mode, setMode] = useState<'view' | 'create' | 'edit'>(initialMode || (invoice ? 'view' : 'create'))
  const [invoiceType, setInvoiceType] = useState<'outgoing' | 'incoming'>(invoice?.type || 'outgoing')
  const [issueDate, setIssueDate] = useState(invoice?.issueDate ? invoice.issueDate.split('T')[0] : new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState(invoice?.dueDate ? invoice.dueDate.split('T')[0] : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
  const [customerId, setCustomerId] = useState(invoice?.customerId || '')
  const [supplierId, setSupplierId] = useState(invoice?.supplierId || '')
  const [items, setItems] = useState<InvoiceItem[]>(invoice?.items || [])
  const [discount, setDiscount] = useState(invoice?.discount || 0)
  const [tax, setTax] = useState(invoice?.tax || 0)
  const [notes, setNotes] = useState(invoice?.notes || '')

  const [newItemDescription, setNewItemDescription] = useState('')
  const [newItemQuantity, setNewItemQuantity] = useState('1')
  const [newItemUnit, setNewItemUnit] = useState('ცალი')
  const [newItemPrice, setNewItemPrice] = useState('')
  const [isPrinting, setIsPrinting] = useState(false)

  // Reset form when invoice changes
  useEffect(() => {
    if (invoice) {
      setMode(initialMode || 'view')
      setInvoiceType(invoice.type)
      setIssueDate(invoice.issueDate.split('T')[0])
      setDueDate(invoice.dueDate ? invoice.dueDate.split('T')[0] : '')
      setCustomerId(invoice.customerId || '')
      setSupplierId(invoice.supplierId || '')
      setItems(invoice.items)
      setDiscount(invoice.discount)
      setTax(invoice.tax)
      setNotes(invoice.notes || '')
    } else {
      setMode('create')
      setInvoiceType('outgoing')
      setIssueDate(new Date().toISOString().split('T')[0])
      setDueDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      setCustomerId('')
      setSupplierId('')
      setItems([])
      setDiscount(0)
      setTax(0)
      setNotes('')
    }
  }, [invoice, initialMode])

  if (!isOpen) return null

  const subtotal = items.reduce((sum, item) => sum + item.total, 0)
  const total = subtotal - discount + tax

  const handleAddItem = () => {
    if (!newItemDescription || !newItemQuantity || !newItemPrice) return

    const quantity = parseFloat(newItemQuantity)
    const unitPrice = parseFloat(newItemPrice)
    const itemTotal = quantity * unitPrice

    setItems([...items, {
      description: newItemDescription,
      quantity,
      unit: newItemUnit,
      unitPrice,
      total: itemTotal,
    }])

    setNewItemDescription('')
    setNewItemQuantity('1')
    setNewItemPrice('')
  }

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  // Generate invoice HTML for print/download
  const generateInvoiceHTML = (inv: Invoice) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${inv.invoiceNumber}</title>
        <style>
          body { font-family: 'DejaVu Sans', Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; background: white; }
          .header { display: flex; justify-content: space-between; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #B87333; }
          .company { }
          .company h1 { margin: 0; font-size: 24px; color: #B87333; }
          .company p { margin: 4px 0; color: #333; font-size: 13px; }
          .company .iban { font-family: monospace; color: #B87333; font-weight: bold; }
          .invoice-title { text-align: right; }
          .invoice-title h2 { margin: 0; font-size: 32px; color: #333; }
          .invoice-title .number { font-size: 18px; font-weight: bold; color: #B87333; margin: 10px 0; }
          .invoice-title p { margin: 4px 0; color: #666; font-size: 13px; }
          .customer-section { margin-bottom: 30px; padding: 20px; background: #f8f8f8; border-radius: 8px; border-left: 4px solid #B87333; }
          .customer-section h3 { margin: 0 0 15px 0; font-size: 14px; color: #999; text-transform: uppercase; }
          .customer-section .name { font-size: 18px; font-weight: bold; color: #333; margin-bottom: 10px; }
          .customer-section p { margin: 4px 0; color: #555; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th { background: #B87333; color: white; padding: 12px; text-align: left; font-size: 13px; }
          th:last-child, td:last-child { text-align: right; }
          td { padding: 12px; border-bottom: 1px solid #eee; font-size: 13px; }
          .totals { text-align: right; margin-bottom: 30px; }
          .totals p { margin: 5px 0; font-size: 14px; color: #666; }
          .totals .total { font-size: 24px; font-weight: bold; color: #B87333; margin-top: 10px; }
          .totals .remaining { color: #e74c3c; font-weight: bold; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #999; font-size: 12px; }
          @media print { 
            body { padding: 20px; } 
            .customer-section { background: #f8f8f8 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            th { background: #B87333 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company">
            <h1>🍺 BrewMaster PRO</h1>
            <p><strong>შპს ბრიუმასტერი</strong></p>
            <p>თბილისი, ვაჟა-ფშაველას გამზ. 71</p>
            <p>საიდ. კოდი: 404123456</p>
            <p>ტელ: +995 555 123 456</p>
            <p>ბანკი: თიბისი ბანკი</p>
            <p>IBAN: <span class="iban">GE00TB0000000000000000</span></p>
          </div>
          <div class="invoice-title">
            <h2>ინვოისი</h2>
            <div class="number">${inv.invoiceNumber}</div>
            <p>თარიღი: ${new Date(inv.issueDate).toLocaleDateString('ka-GE')}</p>
            ${inv.dueDate ? `<p>ვადა: ${new Date(inv.dueDate).toLocaleDateString('ka-GE')}</p>` : ''}
          </div>
        </div>

        <div class="customer-section">
          <h3>${inv.type === 'outgoing' ? 'მყიდველი' : 'გამყიდველი'}</h3>
          <div class="name">${inv.customerName || inv.supplierName || '-'}</div>
          ${inv.customerAddress ? `<p>📍 ${inv.customerAddress}</p>` : ''}
          ${inv.customerTaxId ? `<p>🏢 საიდ. კოდი: ${inv.customerTaxId}</p>` : ''}
          ${inv.customerPhone ? `<p>📞 ${inv.customerPhone}</p>` : ''}
          ${inv.customerEmail ? `<p>✉️ ${inv.customerEmail}</p>` : ''}
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 40px;">#</th>
              <th>პროდუქტი</th>
              <th style="width: 120px;">რაოდენობა</th>
              <th style="width: 100px;">ფასი</th>
              <th style="width: 100px;">სულ</th>
            </tr>
          </thead>
          <tbody>
            ${inv.items.map((item: InvoiceItem, i: number) => `
              <tr>
                <td>${i + 1}</td>
                <td>${item.description}</td>
                <td>${item.quantity} ${item.unit}</td>
                <td>${Number(item.unitPrice).toFixed(2)} ₾</td>
                <td><strong>${Number(item.total).toFixed(2)} ₾</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals">
          <p>ქვეჯამი: ${Number(inv.subtotal).toFixed(2)} ₾</p>
          ${inv.discount > 0 ? `<p>ფასდაკლება: -${Number(inv.discount).toFixed(2)} ₾</p>` : ''}
          ${inv.tax > 0 ? `<p>დღგ (18%): +${Number(inv.tax).toFixed(2)} ₾</p>` : ''}
          <p class="total">სულ: ${Number(inv.total).toFixed(2)} ₾</p>
          ${inv.paidAmount > 0 ? `<p style="color: #27ae60;">გადახდილი: ${Number(inv.paidAmount).toFixed(2)} ₾</p>` : ''}
          ${(inv.total - (inv.paidAmount || 0)) > 0 ? `<p class="remaining">დარჩენილი: ${(Number(inv.total) - Number(inv.paidAmount || 0)).toFixed(2)} ₾</p>` : ''}
        </div>

        <div class="footer">
          <p><strong>დანიშნულება გადარიცხვისას:</strong> ${inv.invoiceNumber}</p>
          <p style="margin-top: 15px;">გმადლობთ თანამშრომლობისთვის!</p>
          <p>BrewMaster PRO • www.brewmaster.ge • info@brewmaster.ge</p>
        </div>
      </body>
      </html>
    `
  }

  // Print handler
  const handlePrint = () => {
    if (!invoice) return
    setIsPrinting(true)
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(generateInvoiceHTML(invoice))
      printWindow.document.close()
      setTimeout(() => {
        printWindow.print()
        setIsPrinting(false)
      }, 500)
    } else {
      setIsPrinting(false)
    }
  }

  // PDF/Download handler
  const handleDownload = () => {
    if (!invoice) return
    const html = generateInvoiceHTML(invoice)
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${invoice.invoiceNumber}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleSubmit = () => {
    if (items.length === 0) {
      alert('გთხოვთ დაამატოთ მინიმუმ ერთი პროდუქტი')
      return
    }

    onSubmit({
      type: invoiceType,
      customerId: invoiceType === 'outgoing' ? customerId : undefined,
      supplierId: invoiceType === 'incoming' ? supplierId : undefined,
      issueDate,
      dueDate,
      items,
      discount,
      tax,
      notes: notes || undefined,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-bg-card border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-bold text-text-primary">
            {mode === 'view' ? `🧾 ${invoice?.invoiceNumber || ''}` : mode === 'edit' ? '✏️ რედაქტირება' : '➕ ახალი ინვოისი'}
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">✕</button>
        </div>

        {mode === 'view' && invoice ? (
          <>
            <div className="p-6 space-y-6">
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig[invoice.status]?.color || 'text-gray-400'} bg-current/10`}>
                  {invoice.statusName}
                </span>
                <div className="text-right">
                  <div className="text-2xl font-bold text-text-primary">{formatCurrency(invoice.total)}</div>
                  {invoice.remaining > 0 && (
                    <div className="text-sm text-amber-400">დარჩენილი: {formatCurrency(invoice.remaining)}</div>
                  )}
                </div>
              </div>

              {/* Header Info */}
              <div className="grid grid-cols-2 gap-6 p-4 bg-bg-tertiary rounded-lg">
                <div>
                  <div className="text-sm text-text-muted mb-1">
                    {invoice.type === 'outgoing' ? 'კლიენტი' : 'მომწოდებელი'}
                  </div>
                  <div className="font-semibold text-text-primary">
                    {invoice.customerName || invoice.supplierName || '-'}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-text-muted mb-1">თარიღი</div>
                    <div className="text-text-primary">{formatDate(new Date(invoice.issueDate))}</div>
                  </div>
                  <div>
                    <div className="text-sm text-text-muted mb-1">ვადა</div>
                    <div className="text-text-primary">{invoice.dueDate ? formatDate(new Date(invoice.dueDate)) : '-'}</div>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-bg-tertiary">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">#</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">პროდუქტი</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-text-primary">რაოდენობა</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-text-primary">ფასი</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-text-primary">სულ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item, index) => (
                      <tr key={item.id || index} className="border-t border-border">
                        <td className="px-4 py-3 text-text-muted">{index + 1}</td>
                        <td className="px-4 py-3 text-text-primary">{item.description}</td>
                        <td className="px-4 py-3 text-right text-text-primary">{item.quantity} {item.unit}</td>
                        <td className="px-4 py-3 text-right text-text-primary">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-4 py-3 text-right text-text-primary font-semibold">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-text-muted">
                    <span>ქვეჯამი:</span>
                    <span>{formatCurrency(invoice.subtotal)}</span>
                  </div>
                  {invoice.discount > 0 && (
                    <div className="flex justify-between text-text-muted">
                      <span>ფასდაკლება:</span>
                      <span>-{formatCurrency(invoice.discount)}</span>
                    </div>
                  )}
                  {invoice.tax > 0 && (
                    <div className="flex justify-between text-text-muted">
                      <span>დღგ:</span>
                      <span>+{formatCurrency(invoice.tax)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold text-text-primary pt-2 border-t border-border">
                    <span>სულ:</span>
                    <span>{formatCurrency(invoice.total)}</span>
                  </div>
                  {invoice.paidAmount > 0 && (
                    <div className="flex justify-between text-green-400">
                      <span>გადახდილი:</span>
                      <span>{formatCurrency(invoice.paidAmount)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Payments History */}
              {invoice.payments && invoice.payments.length > 0 && (
                <div>
                  <h4 className="font-semibold text-text-primary mb-3">💳 გადახდების ისტორია</h4>
                  <div className="space-y-2">
                    {invoice.payments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
                        <div>
                          <div className="text-text-primary">{formatDate(new Date(payment.date))}</div>
                          <div className="text-sm text-text-muted">{payment.method} {payment.reference && `• ${payment.reference}`}</div>
                        </div>
                        <div className="font-semibold text-green-400">{formatCurrency(payment.amount)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {invoice.notes && (
                <div className="p-4 bg-bg-tertiary rounded-lg">
                  <div className="text-sm text-text-muted mb-1">შენიშვნა</div>
                  <div className="text-text-primary">{invoice.notes}</div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-border flex justify-between items-center">
              <div className="flex gap-2">
                {invoice.status === 'draft' && onSend && (
                  <Button variant="secondary" onClick={() => onSend(invoice.id)}>
                    📤 გაგზავნა
                  </Button>
                )}
                <Button variant="secondary" onClick={handlePrint} disabled={isPrinting}>
                  🖨️ ბეჭდვა
                </Button>
                <Button variant="secondary" onClick={handleDownload}>
                  📥 ჩამოტვირთვა
                </Button>
              </div>
              <Button variant="secondary" onClick={onClose}>დახურვა</Button>
            </div>
          </>
        ) : (
          <>
            {/* Create/Edit Form */}
            <div className="p-6 space-y-6">
              {/* Invoice Type */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">ინვოისის ტიპი</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={invoiceType === 'outgoing'}
                      onChange={() => setInvoiceType('outgoing')}
                      className="w-4 h-4"
                    />
                    <span className="text-text-primary">📤 გასაგზავნი (კლიენტს)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={invoiceType === 'incoming'}
                      onChange={() => setInvoiceType('incoming')}
                      className="w-4 h-4"
                    />
                    <span className="text-text-primary">📥 მიღებული (მომწოდებლისგან)</span>
                  </label>
                </div>
              </div>

              {/* Customer/Supplier */}
              {invoiceType === 'outgoing' ? (
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">კლიენტი <span className="text-red-400">*</span></label>
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                  >
                    <option value="">აირჩიეთ კლიენტი</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">მომწოდებელი <span className="text-red-400">*</span></label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                  >
                    <option value="">აირჩიეთ მომწოდებელი</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">თარიღი</label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">გადახდის ვადა</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                  />
                </div>
              </div>

              {/* Items */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">პროდუქტები/მომსახურება <span className="text-red-400">*</span></label>
                <div className="border border-border rounded-lg p-4 space-y-4">
                  {items.map((item, index) => (
                    <div key={index} className="flex items-center gap-4 bg-bg-tertiary p-3 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-text-primary">{item.description}</div>
                        <div className="text-sm text-text-muted">
                          {item.quantity} {item.unit} × {formatCurrency(item.unitPrice)} = {formatCurrency(item.total)}
                        </div>
                      </div>
                      <Button variant="danger" size="sm" onClick={() => handleRemoveItem(index)}>✕</Button>
                    </div>
                  ))}

                  <div className="border-t border-border pt-4 space-y-3">
                    <div className="grid grid-cols-12 gap-3">
                      <input
                        type="text"
                        value={newItemDescription}
                        onChange={(e) => setNewItemDescription(e.target.value)}
                        placeholder="აღწერა"
                        className="col-span-5 px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                      />
                      <input
                        type="number"
                        value={newItemQuantity}
                        onChange={(e) => setNewItemQuantity(e.target.value)}
                        placeholder="რაოდ."
                        className="col-span-2 px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                      />
                      <select
                        value={newItemUnit}
                        onChange={(e) => setNewItemUnit(e.target.value)}
                        className="col-span-2 px-2 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                      >
                        <option value="ცალი">ცალი</option>
                        <option value="კგ">კგ</option>
                        <option value="ლ">ლ</option>
                        <option value="კეგი">კეგი</option>
                      </select>
                      <input
                        type="number"
                        value={newItemPrice}
                        onChange={(e) => setNewItemPrice(e.target.value)}
                        placeholder="ფასი"
                        className="col-span-2 px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                      />
                      <Button onClick={handleAddItem} size="sm" className="col-span-1">+</Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-72 space-y-3">
                  <div className="flex justify-between text-text-muted">
                    <span>ქვეჯამი:</span>
                    <span className="text-text-primary">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-text-muted text-sm">ფასდაკლება:</span>
                    <input
                      type="number"
                      value={discount || ''}
                      onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-24 px-3 py-1 bg-bg-tertiary border border-border rounded-lg text-text-primary text-sm"
                    />
                    <span className="text-text-muted text-sm">₾</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-text-muted text-sm">დღგ:</span>
                    <input
                      type="number"
                      value={tax || ''}
                      onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-24 px-3 py-1 bg-bg-tertiary border border-border rounded-lg text-text-primary text-sm"
                    />
                    <span className="text-text-muted text-sm">₾</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-text-primary pt-2 border-t border-border">
                    <span>სულ:</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">შენიშვნა</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="დამატებითი ინფორმაცია"
                  className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                />
              </div>
            </div>

            <div className="p-6 border-t border-border flex justify-end gap-3">
              <Button variant="secondary" onClick={onClose}>გაუქმება</Button>
              <Button onClick={handleSubmit} disabled={items.length === 0}>
                {mode === 'edit' ? '💾 შენახვა' : '➕ შექმნა'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
