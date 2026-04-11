'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout'
import { Card, CardHeader, CardBody, Button } from '@/components/ui'
import { OrderPaymentModal, PaymentFormData } from '@/components/finances/OrderPaymentModal'
import { InvoiceModal } from '@/components/finances/InvoiceModal'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { TenantBrand } from '@/lib/tenant-brand'
import { escHtml, escAttr, tenantFooterLine, tenantBrandFromApiJson } from '@/lib/tenant-brand'

interface OrderItem {
  id: string
  productName: string
  packageType: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unit: string
  unitPrice: number
  total: number
  productName?: string
  packageType?: string
}

interface Invoice {
  id: string
  invoiceNumber: string
  type?: 'outgoing' | 'incoming'
  status: string
  statusName: string
  issueDate: string
  dueDate: string | null
  customerId?: string | null
  customerName?: string | null
  customerPhone?: string | null
  customerEmail?: string | null
  customerAddress?: string | null
  customerTaxId?: string | null
  supplierId?: string | null
  supplierName?: string | null
  subtotal: number
  discount: number
  tax: number
  total: number
  paidAmount: number
  remaining?: number
  items: InvoiceItem[]
  payments?: Array<{
    id: string
    amount: number
    method: string
    date: string
    reference: string | null
  }>
  notes?: string | null
}

interface OrderDetail {
  id: string
  orderNumber: string
  customerId: string
  customerName: string
  customerPhone: string
  status: string
  statusName: string
  paymentStatus: string
  paymentStatusName: string
  totalAmount: number
  paidAmount?: number
  orderedAt: string
  shippedAt: string | null
  deliveredAt: string | null
  items: OrderItem[]
  notes: string | null
  invoice?: Invoice | null
  customer?: {
    name: string
    address?: string
    phone?: string
    email?: string
    city?: string
    taxId?: string
  }
}

// Workflow steps
const ORDER_WORKFLOW = [
  { key: 'pending', label: 'მოლოდინში', icon: '⏳', color: 'amber' },
  { key: 'confirmed', label: 'დადასტურებული', icon: '✓', color: 'blue' },
  { key: 'processing', label: 'მზადდება', icon: '🔄', color: 'purple' },
  { key: 'ready', label: 'მზადაა', icon: '📦', color: 'cyan' },
  { key: 'shipped', label: 'გაგზავნილი', icon: '🚚', color: 'indigo' },
  { key: 'delivered', label: 'მიღებული', icon: '✅', color: 'green' },
]

// Helper function for step colors
function getStepColor(color: string): string {
  const colors: Record<string, string> = {
    amber: '#f59e0b',
    blue: '#3b82f6',
    purple: '#8b5cf6',
    cyan: '#06b6d4',
    indigo: '#6366f1',
    green: '#22c55e',
    orange: '#f97316',
    red: '#ef4444',
  }
  return colors[color] || colors.blue
}

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)
  const [customers, setCustomers] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [tenantCompany, setTenantCompany] = useState<TenantBrand | null>(null)

  // Fetch order
  const fetchOrder = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/orders/${params.id}`)
      if (!res.ok) {
        throw new Error('Failed to fetch order')
      }
      const data = await res.json()
      if (data.order) {
        setOrder(data.order)
      }
    } catch (error) {
      console.error('Failed to fetch order:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (params.id) {
      fetchOrder()
      // Fetch customers and suppliers for InvoiceModal
      const fetchCustomersAndSuppliers = async () => {
        try {
          const [customersRes, suppliersRes] = await Promise.all([
            fetch('/api/customers'),
            fetch('/api/finances/suppliers'),
          ])
          if (customersRes.ok) {
            const customersData = await customersRes.json()
            setCustomers(customersData.customers || [])
          }
          if (suppliersRes.ok) {
            const suppliersData = await suppliersRes.json()
            setSuppliers(suppliersData.suppliers || [])
          }
        } catch (err) {
          console.error('Failed to fetch customers/suppliers:', err)
        }
      }
      fetchCustomersAndSuppliers()
      fetch('/api/tenant')
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.tenant) setTenantCompany(tenantBrandFromApiJson(data.tenant))
        })
        .catch(() => {})
    }
  }, [params.id])

  // Update status
  const updateStatus = async (newStatus: string) => {
    if (!order || updating) return
    try {
      setUpdating(true)
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: order.id, status: newStatus.toUpperCase() }),
      })
      if (res.ok) {
        fetchOrder() // Refetch order to get updated data
      }
    } catch (error) {
      console.error('Failed to update:', error)
      alert('სტატუსის შეცვლა ვერ მოხერხდა')
    } finally {
      setUpdating(false)
    }
  }

  // Handle payment submit
  const handlePaymentSubmit = async (data: PaymentFormData) => {
    try {
      const response = await fetch('/api/finances/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: data.orderId,
          amount: data.amount,
          method: data.method,
          date: data.date,
          reference: data.reference || null,
          notes: data.notes || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create payment')
      }

      setIsPaymentModalOpen(false)
      fetchOrder() // Refresh order data
    } catch (err: any) {
      console.error('Payment creation error:', err)
      alert(err.message || 'გადახდის დაფიქსირება ვერ მოხერხდა')
    }
  }

  // Generate invoice manually if not auto-generated
  const handleGenerateInvoice = async () => {
    if (!order) return
    try {
      const response = await fetch('/api/finances/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'outgoing',
          customerId: order.customerId,
          orderId: order.id,
          issueDate: new Date().toISOString(),
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          items: order.items.map((item: any) => ({
            description: item.productName,
            quantity: item.quantity,
            unit: item.packageType || 'ცალი',
            unitPrice: item.unitPrice,
          })),
        }),
      })

      if (response.status === 409) {
        const errorData = await response.json().catch(() => ({}))
        const msg =
          (typeof errorData.error === 'object' && errorData.error?.message) ||
          (typeof errorData.error === 'string' ? errorData.error : null) ||
          'ამ შეკვეთისთვის ინვოისი უკვე არსებობს'
        alert(msg)
        await fetchOrder()
        return
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errMsg =
          (typeof errorData.error === 'object' && errorData.error?.message) ||
          (typeof errorData.error === 'string' ? errorData.error : null) ||
          'Failed to generate invoice'
        throw new Error(errMsg)
      }

      const payload = await response.json()
      await fetchOrder()
      if (payload.alreadyExisted) {
        alert('ℹ️ ამ შეკვეთისთვის ინვოისი უკვე იყო — ნაჩვენებია არსებული.')
      } else {
        alert('✅ ინვოისი წარმატებით შეიქმნა!')
      }
    } catch (err: any) {
      console.error('Invoice generation error:', err)
      alert(err.message || 'ინვოისის გენერაცია ვერ მოხერხდა')
    }
  }

  // Send invoice (update status to SENT)
  const handleSendInvoice = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/finances/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'SENT' }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send invoice')
      }
      
      fetchOrder()
      alert('✅ ინვოისი გაიგზავნა!')
    } catch (err: any) {
      console.error('Invoice send error:', err)
      alert(err.message || 'ინვოისის გაგზავნა ვერ მოხერხდა')
    }
  }

  // Generate invoice HTML for print/download
  const generateInvoiceHTML = (invoice: Invoice, order: OrderDetail) => {
    const co = tenantCompany
    const logoBlock =
      co?.logoUrl && (co.logoUrl.startsWith('data:') || co.logoUrl.startsWith('http'))
        ? `<img src="${escAttr(co.logoUrl)}" style="max-height:48px;margin-bottom:8px;object-fit:contain" alt="" />`
        : ''
    const bankLine =
      co && (co.bankName || co.bankAccount)
        ? `<p>ბანკი: ${co.bankName ? escHtml(co.bankName) : ''}${co.bankAccount ? ` — IBAN: <span class="iban">${escHtml(co.bankAccount)}</span>` : ''}${co.bankSwift ? ` — SWIFT: ${escHtml(co.bankSwift)}` : ''}</p>`
        : ''
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${invoice.invoiceNumber}</title>
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
            ${logoBlock}
            <h1>${co ? escHtml(co.displayName) : '—'}</h1>
            ${co?.legalName && co.legalName !== co.displayName ? `<p><strong>${escHtml(co.legalName)}</strong></p>` : ''}
            ${co?.address ? `<p>${escHtml(co.address)}</p>` : ''}
            ${co?.taxId ? `<p>საიდ. კოდი: ${escHtml(co.taxId)}</p>` : ''}
            ${co?.phone ? `<p>ტელ: ${escHtml(co.phone)}</p>` : ''}
            ${co?.email ? `<p>✉️ ${escHtml(co.email)}</p>` : ''}
            ${co?.website ? `<p>${escHtml(co.website)}</p>` : ''}
            ${bankLine}
          </div>
          <div class="invoice-title">
            <h2>ინვოისი</h2>
            <div class="number">${invoice.invoiceNumber}</div>
            <p>თარიღი: ${new Date(invoice.issueDate).toLocaleDateString('ka-GE')}</p>
            ${invoice.dueDate ? `<p>ვადა: ${new Date(invoice.dueDate).toLocaleDateString('ka-GE')}</p>` : ''}
          </div>
        </div>

        <div class="customer-section">
          <h3>მყიდველი</h3>
          <div class="name">${order.customerName || invoice.customerName || '-'}</div>
          ${order.customer?.address ? `<p>📍 ${order.customer.address}${order.customer?.city ? `, ${order.customer.city}` : ''}</p>` : invoice.customerAddress ? `<p>📍 ${invoice.customerAddress}</p>` : ''}
          ${order.customer?.taxId ? `<p>🏢 საიდ. კოდი: ${order.customer.taxId}</p>` : invoice.customerTaxId ? `<p>🏢 საიდ. კოდი: ${invoice.customerTaxId}</p>` : ''}
          ${order.customer?.phone ? `<p>📞 ${order.customer.phone}</p>` : invoice.customerPhone ? `<p>📞 ${invoice.customerPhone}</p>` : ''}
          ${order.customer?.email ? `<p>✉️ ${order.customer.email}</p>` : invoice.customerEmail ? `<p>✉️ ${invoice.customerEmail}</p>` : ''}
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
            ${invoice.items.map((item: InvoiceItem, i: number) => `
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
          <p>ქვეჯამი: ${Number(invoice.subtotal).toFixed(2)} ₾</p>
          ${invoice.discount > 0 ? `<p>ფასდაკლება: -${Number(invoice.discount).toFixed(2)} ₾</p>` : ''}
          ${invoice.tax > 0 ? `<p>დღგ (18%): +${Number(invoice.tax).toFixed(2)} ₾</p>` : ''}
          <p class="total">სულ: ${Number(invoice.total).toFixed(2)} ₾</p>
          ${invoice.paidAmount > 0 ? `<p style="color: #27ae60;">გადახდილი: ${Number(invoice.paidAmount).toFixed(2)} ₾</p>` : ''}
          ${(invoice.total - (invoice.paidAmount || 0)) > 0 ? `<p class="remaining">დარჩენილი: ${(Number(invoice.total) - Number(invoice.paidAmount || 0)).toFixed(2)} ₾</p>` : ''}
        </div>

        <div class="footer">
          <p><strong>დანიშნულება გადარიცხვისას:</strong> ${invoice.invoiceNumber}</p>
          <p style="margin-top: 15px;">გმადლობთ თანამშრომლობისთვის!</p>
          <p>${co ? escHtml(tenantFooterLine(co)) : '—'}</p>
        </div>
      </body>
      </html>
    `
  }

  // Print invoice
  const handlePrintInvoice = (invoice: Invoice) => {
    if (!order) return
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(generateInvoiceHTML(invoice, order))
      printWindow.document.close()
      printWindow.print()
    }
  }

  // Download invoice as HTML
  const handleDownloadInvoice = (invoice: Invoice) => {
    if (!order) return
    const html = generateInvoiceHTML(invoice, order)
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${invoice.invoiceNumber}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Get current step index
  const getCurrentStepIndex = () => {
    if (order?.status === 'cancelled') return -1
    return ORDER_WORKFLOW.findIndex(s => s.key === order?.status)
  }

  // Get next action
  const getNextAction = () => {
    const currentIndex = getCurrentStepIndex()
    if (currentIndex === -1 || currentIndex >= ORDER_WORKFLOW.length - 1) return null
    return ORDER_WORKFLOW[currentIndex + 1]
  }

  if (loading) {
    return (
      <DashboardLayout title="იტვირთება..." breadcrumb="მთავარი / გაყიდვები / შეკვეთები">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-copper border-t-transparent rounded-full" />
        </div>
      </DashboardLayout>
    )
  }

  if (!order) {
    return (
      <DashboardLayout title="შეკვეთა ვერ მოიძებნა" breadcrumb="მთავარი / გაყიდვები / შეკვეთები">
        <Card>
          <CardBody className="text-center py-12">
            <p className="text-text-muted mb-4">შეკვეთა ვერ მოიძებნა</p>
            <Button variant="secondary" onClick={() => router.push('/sales/orders')}>← უკან</Button>
          </CardBody>
        </Card>
      </DashboardLayout>
    )
  }

  const currentStepIndex = getCurrentStepIndex()
  const nextAction = getNextAction()
  const isCancelled = order.status === 'cancelled'

  return (
    <DashboardLayout 
      title={order.orderNumber} 
      breadcrumb={`მთავარი / გაყიდვები / შეკვეთები / ${order.orderNumber}`}
    >
      {/* Back Button */}
      <div className="mb-4">
        <Button variant="ghost" onClick={() => router.push('/sales/orders')}>
          ← შეკვეთებში დაბრუნება
        </Button>
      </div>

      {/* Header with Order Info */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-copper flex items-center justify-center text-2xl">
                📦
              </div>
              <div>
                <h1 className="text-2xl font-display font-bold">{order.orderNumber}</h1>
                <p className="text-text-muted">{order.customerName} • {formatDate(new Date(order.orderedAt))}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold font-mono text-copper-light">{formatCurrency(order.totalAmount)}</p>
              <p className="text-sm text-text-muted">{order.items.length} პროდუქტი</p>
            </div>
          </div>

          {/* ✨ ORDER STATUS STEPPER - Visual Progress Bar */}
          {!isCancelled ? (
            <div className="mb-6">
              <p className="text-sm text-text-muted mb-3">შეკვეთის სტატუსი</p>
              <div className="flex items-center">
                {ORDER_WORKFLOW.map((step, index) => {
                  const isCompleted = index < currentStepIndex
                  const isCurrent = index === currentStepIndex
                  const isPending = index > currentStepIndex
                  
                  return (
                    <div key={step.key} className="flex items-center flex-1">
                      {/* Step Circle */}
                      <button
                        onClick={() => !updating && updateStatus(step.key)}
                        disabled={updating}
                        className={`
                          w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold
                          transition-all duration-300 cursor-pointer
                          ${isCompleted ? 'text-white' : ''}
                          ${isCurrent ? 'text-white ring-4' : ''}
                          ${isPending ? 'bg-bg-tertiary text-text-muted hover:bg-bg-card' : ''}
                          disabled:opacity-50 disabled:cursor-not-allowed
                        `}
                        style={{
                          backgroundColor: isCompleted ? '#22c55e' : isCurrent ? getStepColor(step.color) : undefined,
                          boxShadow: isCurrent ? `0 0 0 4px ${getStepColor(step.color)}33` : undefined,
                        }}
                        title={step.label}
                      >
                        {isCompleted ? '✓' : step.icon}
                      </button>
                      
                      {/* Connector Line */}
                      {index < ORDER_WORKFLOW.length - 1 && (
                        <div 
                          className={`flex-1 h-1 mx-2 rounded ${
                            index < currentStepIndex ? '' : 'bg-bg-tertiary'
                          }`}
                          style={{
                            backgroundColor: index < currentStepIndex ? '#22c55e' : undefined,
                          }}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
              {/* Step Labels */}
              <div className="flex mt-2">
                {ORDER_WORKFLOW.map((step, index) => (
                  <div key={step.key} className="flex-1 text-center">
                    <span className={`text-xs ${
                      index === currentStepIndex ? 'text-white font-medium' : 'text-text-muted'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-center">
              <span className="text-red-400 text-lg">❌ შეკვეთა გაუქმებულია</span>
            </div>
          )}

          {/* ✨ PAYMENT STATUS - Visual Indicator with Payment Button */}
          <div className="mt-6">
            <h4 className="text-sm font-medium text-text-muted mb-3">გადახდის სტატუსი</h4>
            <div className="flex items-center justify-between p-4 bg-bg-tertiary rounded-lg">
              <div className="flex items-center gap-3">
                {/* Status Icon */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                  order.paymentStatus === 'paid' 
                    ? 'bg-green-500/20 text-green-400' 
                    : order.paymentStatus === 'partial'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {order.paymentStatus === 'paid' ? '✅' : order.paymentStatus === 'partial' ? '💰' : '💳'}
                </div>
                
                {/* Status Info */}
                <div>
                  <div className="font-medium text-text-primary">
                    {order.paymentStatus === 'paid' ? 'გადახდილი' : 
                     order.paymentStatus === 'partial' ? 'ნაწილობრივ გადახდილი' : 
                     'გადასახდელი'}
                  </div>
                  <div className="text-sm text-text-muted">
                    {order.paidAmount && order.paidAmount > 0 ? (
                      <span>გადახდილია: {formatCurrency(order.paidAmount)} / {formatCurrency(order.totalAmount)}</span>
                    ) : (
                      <span>გადასახდელი: {formatCurrency(order.totalAmount)}</span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Payment Button */}
              {order.paymentStatus !== 'paid' && (
                <Button onClick={() => setIsPaymentModalOpen(true)}>
                  💳 გადახდის დაფიქსირება
                </Button>
              )}
            </div>
            
            {/* Progress Bar (if partial) */}
            {order.paidAmount && order.paidAmount > 0 && order.paidAmount < order.totalAmount && (
              <div className="mt-3">
                <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full"
                    style={{ width: `${(order.paidAmount / order.totalAmount) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-text-muted mt-1">
                  <span>{Math.round((order.paidAmount / order.totalAmount) * 100)}% გადახდილი</span>
                  <span>დარჩენილი: {formatCurrency(order.totalAmount - order.paidAmount)}</span>
                </div>
              </div>
            )}
          </div>

          {/* ✨ NEXT ACTION - Big Clear CTA */}
          {nextAction && !isCancelled && (
            <div className="flex gap-3">
              <Button 
                variant="primary" 
                size="lg"
                className="flex-1 py-4 text-lg"
                onClick={() => updateStatus(nextAction.key)}
                disabled={updating}
              >
                {updating ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⏳</span> იტვირთება...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <span>{nextAction.icon}</span>
                    <span>{nextAction.label}</span>
                    <span>→</span>
                  </span>
                )}
              </Button>
              
              {order.status !== 'delivered' && (
                <Button 
                  variant="ghost" 
                  size="lg"
                  className="text-red-400 hover:bg-red-400/10"
                  onClick={() => {
                    if (confirm('ნამდვილად გსურთ შეკვეთის გაუქმება?')) {
                      updateStatus('cancelled')
                    }
                  }}
                  disabled={updating}
                >
                  გაუქმება
                </Button>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      <div className="grid grid-cols-3 gap-6">
        {/* Products */}
        <div className="col-span-2">
          <Card>
            <CardHeader>📦 პროდუქტები</CardHeader>
            <CardBody noPadding>
              <table className="w-full">
                <thead>
                  <tr className="bg-bg-tertiary border-b border-border text-left text-xs text-text-muted">
                    <th className="px-4 py-3">პროდუქტი</th>
                    <th className="px-4 py-3">ტიპი</th>
                    <th className="px-4 py-3 text-center">რაოდენობა</th>
                    <th className="px-4 py-3 text-right">ფასი</th>
                    <th className="px-4 py-3 text-right">სულ</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-bg-tertiary/30 transition-colors">
                      <td className="px-4 py-4">
                        <span className="font-medium">{item.productName}</span>
                      </td>
                      <td className="px-4 py-4 text-text-muted">{item.packageType}</td>
                      <td className="px-4 py-4 text-center">
                        <span className="inline-flex w-8 h-8 items-center justify-center bg-bg-tertiary rounded-lg font-mono">
                          {item.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right font-mono">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-4 py-4 text-right font-mono font-medium">{formatCurrency(item.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-bg-tertiary">
                    <td colSpan={4} className="px-4 py-4 text-right font-medium">სულ გადასახდელი:</td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-xl font-bold font-mono text-copper-light">{formatCurrency(order.totalAmount)}</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </CardBody>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer */}
          <Card>
            <CardHeader>👤 მომხმარებელი</CardHeader>
            <CardBody>
              <p className="text-lg font-medium mb-2">{order.customerName}</p>
              {order.customerPhone && (
                <p className="text-text-muted flex items-center gap-2">
                  <span>📞</span> {order.customerPhone}
                </p>
              )}
              <Button 
                variant="secondary" 
                size="sm" 
                className="w-full mt-4"
                onClick={() => router.push(`/sales/customers/${order.customerId}`)}
              >
                პროფილის ნახვა
              </Button>
            </CardBody>
          </Card>

          {/* Quick Info */}
          <Card>
            <CardHeader>📋 დეტალები</CardHeader>
            <CardBody className="space-y-3">
              <div className="flex justify-between">
                <span className="text-text-muted">შეკვეთის თარიღი</span>
                <span>{formatDate(new Date(order.orderedAt))}</span>
              </div>
              {order.shippedAt && (
                <div className="flex justify-between">
                  <span className="text-text-muted">გაგზავნის თარიღი</span>
                  <span>{formatDate(new Date(order.shippedAt))}</span>
                </div>
              )}
              {order.deliveredAt && (
                <div className="flex justify-between">
                  <span className="text-text-muted">მიღების თარიღი</span>
                  <span>{formatDate(new Date(order.deliveredAt))}</span>
                </div>
              )}
              {order.notes && (
                <div className="pt-3 border-t border-border">
                  <p className="text-text-muted text-sm mb-1">შენიშვნა:</p>
                  <p className="text-sm">{order.notes}</p>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Invoice Section */}
      {order && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-text-primary">🧾 ინვოისი</h3>
              {order.invoice ? (
                <Link href={`/finances/invoices`}>
                  <Button variant="ghost" size="sm">
                    ყველა ინვოისი →
                  </Button>
                </Link>
              ) : null}
            </div>
          </CardHeader>
          <CardBody>
            {order.invoice ? (
              <div className="space-y-4">
                {/* Invoice Info */}
                <div className="flex items-center justify-between p-4 bg-bg-tertiary rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-copper/20 rounded-lg flex items-center justify-center text-2xl">
                      🧾
                    </div>
                    <div>
                      <div className="font-semibold text-text-primary text-lg">{order.invoice.invoiceNumber}</div>
                      <div className="text-sm text-text-muted">
                        {formatDate(new Date(order.invoice.issueDate))}
                        {order.invoice.dueDate && ` • ვადა: ${formatDate(new Date(order.invoice.dueDate))}`}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-text-primary">{formatCurrency(order.invoice.total)}</div>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium mt-2 ${
                      order.invoice.status === 'paid' ? 'bg-green-400/20 text-green-400' :
                      order.invoice.status === 'sent' ? 'bg-blue-400/20 text-blue-400' :
                      order.invoice.status === 'overdue' ? 'bg-red-400/20 text-red-400' :
                      'bg-gray-400/20 text-gray-400'
                    }`}>
                      {order.invoice.statusName}
                    </span>
                  </div>
                </div>

                {/* Invoice Actions */}
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setIsInvoiceModalOpen(true)}>
                    👁️ ნახვა
                  </Button>
                  {order.invoice.status === 'draft' && (
                    <Button variant="secondary" size="sm" onClick={() => handleSendInvoice(order.invoice!.id)}>
                      📤 გაგზავნა
                    </Button>
                  )}
                  <Button variant="secondary" size="sm" onClick={() => handlePrintInvoice(order.invoice!)}>
                    🖨️ ბეჭდვა
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => handleDownloadInvoice(order.invoice!)}>
                    📥 ჩამოტვირთვა
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="text-4xl mb-3">📄</div>
                <p className="text-text-muted mb-4">ინვოისი არ არის გენერირებული</p>
                <Button onClick={handleGenerateInvoice}>
                  ➕ ინვოისის გენერაცია
                </Button>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Payment Modal */}
      {order && (
        <OrderPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          onSubmit={handlePaymentSubmit}
          order={{
            id: order.id,
            orderNumber: order.orderNumber,
            customerName: order.customer?.name || order.customerName || '',
            totalAmount: order.totalAmount,
            paidAmount: order.paidAmount || 0,
            paymentStatus: order.paymentStatus,
          }}
        />
      )}

      {/* Invoice Modal */}
      {order && order.invoice && (
        <InvoiceModal
          isOpen={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
          onSubmit={() => {}}
          invoice={order.invoice as any}
          mode="view"
          customers={customers}
          suppliers={suppliers}
          onSend={handleSendInvoice}
        />
      )}
    </DashboardLayout>
  )
}
