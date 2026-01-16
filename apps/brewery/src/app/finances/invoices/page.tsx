'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui'
import { StatCard } from '@/components/reports/StatCard'
import { formatDate, formatCurrency } from '@/lib/utils'
import { InvoiceModal, InvoiceFormData, InvoicePaymentModal, InvoicePaymentData } from '@/components/finances'

interface InvoiceItem {
  id: string
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
  paidAt: string | null
  customerId: string | null
  customerName: string | null
  customerPhone?: string | null
  customerEmail?: string | null
  customerAddress?: string | null
  customerTaxId?: string | null
  supplierId: string | null
  supplierName: string | null
  orderId: string | null
  orderNumber: string | null
  subtotal: number
  discount: number
  tax: number
  total: number
  paidAmount: number
  remaining: number
  items: InvoiceItem[]
  payments: InvoicePayment[]
  notes: string | null
}

interface InvoiceStats {
  total: number
  totalAmount: number
  paidAmount: number
  pending: number
  overdue: number
}

interface Customer {
  id: string
  name: string
}

interface Supplier {
  id: string
  name: string
  category?: string | null
}

const statusConfig: Record<string, { name: string; color: string; bgColor: string }> = {
  draft: { name: 'დრაფტი', color: 'text-gray-400', bgColor: 'bg-gray-400/20' },
  sent: { name: 'გაგზავნილი', color: 'text-blue-400', bgColor: 'bg-blue-400/20' },
  paid: { name: 'გადახდილი', color: 'text-green-400', bgColor: 'bg-green-400/20' },
  partial: { name: 'ნაწილობრივ', color: 'text-amber-400', bgColor: 'bg-amber-400/20' },
  overdue: { name: 'ვადაგასული', color: 'text-red-400', bgColor: 'bg-red-400/20' },
  cancelled: { name: 'გაუქმებული', color: 'text-gray-500', bgColor: 'bg-gray-500/20' },
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [stats, setStats] = useState<InvoiceStats | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [typeFilter, setTypeFilter] = useState<'all' | 'outgoing' | 'incoming'>('all')
  const [statusFilter, setStatusFilter] = useState('all')

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [modalMode, setModalMode] = useState<'view' | 'create' | 'edit'>('create')
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Build query params
      const params = new URLSearchParams()
      if (typeFilter !== 'all') params.append('type', typeFilter)
      if (statusFilter !== 'all') params.append('status', statusFilter)

      // Fetch invoices
      const invoicesRes = await fetch(`/api/finances/invoices?${params}`)
      if (!invoicesRes.ok) throw new Error('Failed to fetch invoices')
      const invoicesData = await invoicesRes.json()
      setInvoices(invoicesData.invoices || [])
      setStats(invoicesData.stats)

      // Fetch customers for dropdown
      const customersRes = await fetch('/api/customers')
      if (customersRes.ok) {
        const customersData = await customersRes.json()
        setCustomers(customersData.customers || [])
      }

      // Fetch suppliers for dropdown
      const suppliersRes = await fetch('/api/finances/suppliers')
      if (suppliersRes.ok) {
        const suppliersData = await suppliersRes.json()
        setSuppliers(suppliersData.suppliers || [])
      }

    } catch (err) {
      setError('მონაცემების ჩატვირთვა ვერ მოხერხდა')
      console.error('Invoices fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [typeFilter, statusFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Separate invoices by type
  const outgoingInvoices = invoices.filter(inv => inv.type === 'outgoing')
  const incomingInvoices = invoices.filter(inv => inv.type === 'incoming')

  // Calculate totals
  const totalReceivable = outgoingInvoices.reduce((sum, inv) => sum + inv.remaining, 0)
  const totalPayable = incomingInvoices.reduce((sum, inv) => sum + inv.remaining, 0)

  const handleCreateInvoice = async (data: InvoiceFormData) => {
    try {
      const response = await fetch('/api/finances/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: data.type,
          customerId: data.customerId,
          supplierId: data.supplierId,
          issueDate: data.issueDate,
          dueDate: data.dueDate,
          items: data.items,
          discount: data.discount,
          tax: data.tax,
          notes: (data as any).notes,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create invoice')
      }

      setIsModalOpen(false)
      setSelectedInvoice(null)
      fetchData()
    } catch (err: any) {
      console.error('Invoice creation error:', err)
      alert(err.message || 'ინვოისის შექმნა ვერ მოხერხდა')
    }
  }

  const handleUpdateStatus = async (invoiceId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/finances/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) throw new Error('Failed to update invoice')
      fetchData()
    } catch (err) {
      console.error('Invoice update error:', err)
      alert('სტატუსის განახლება ვერ მოხერხდა')
    }
  }

  const openViewModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setModalMode('view')
    setIsModalOpen(true)
  }

  const openCreateModal = () => {
    setSelectedInvoice(null)
    setModalMode('create')
    setIsModalOpen(true)
  }

  const openEditModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setModalMode('edit')
    setIsModalOpen(true)
  }

  const openPaymentModal = (invoice: Invoice) => {
    setSelectedInvoiceForPayment(invoice)
    setIsPaymentModalOpen(true)
  }

  const handleInvoicePayment = async (data: InvoicePaymentData) => {
    try {
      const response = await fetch(`/api/finances/invoices/${data.invoiceId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: data.amount,
          method: data.method,
          date: data.date,
          reference: data.reference,
          notes: (data as any).notes,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to register payment')
      }

      setIsPaymentModalOpen(false)
      setSelectedInvoiceForPayment(null)
      fetchData()
      alert('✅ გადახდა წარმატებით დაფიქსირდა!')
    } catch (err: any) {
      console.error('Payment error:', err)
      alert(err.message || 'გადახდის დაფიქსირება ვერ მოხერხდა')
    }
  }

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || statusConfig.draft
    return `${config.bgColor} ${config.color}`
  }

  const getDaysUntilDue = (dueDate: string | null) => {
    if (!dueDate) return null
    const due = new Date(dueDate)
    const today = new Date()
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  if (loading) {
    return (
      <DashboardLayout title="🧾 ინვოისები" breadcrumb="მთავარი / ფინანსები / ინვოისები">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-copper"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout title="🧾 ინვოისები" breadcrumb="მთავარი / ფინანსები / ინვოისები">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-red-400">{error}</p>
          <Button onClick={fetchData}>🔄 ხელახლა ცდა</Button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="🧾 ინვოისები" breadcrumb="მთავარი / ფინანსები / ინვოისები">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Link href="/finances">
              <Button variant="ghost" size="sm">← უკან</Button>
            </Link>
            <h2 className="text-2xl font-bold text-text-primary">ინვოისები</h2>
          </div>
          
          <Button onClick={openCreateModal}>
            + ახალი ინვოისი
          </Button>
        </div>

        {/* Stats Cards - Compact */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-bg-card border border-border rounded-xl p-3">
            <div className="text-xs text-text-muted mb-1">🧾 სულ ინვოისი</div>
            <div className="text-xl font-bold text-copper">{stats?.total || 0}</div>
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-3">
            <div className="text-xs text-text-muted mb-1">💰 მისაღები</div>
            <div className="text-xl font-bold text-green-400">{formatCurrency(totalReceivable)}</div>
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-3">
            <div className="text-xs text-text-muted mb-1">📤 გადასახდელი</div>
            <div className="text-xl font-bold text-red-400">{formatCurrency(totalPayable)}</div>
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-3">
            <div className="text-xs text-text-muted mb-1">⚠️ ვადაგასული</div>
            <div className="text-xl font-bold text-amber-400">{stats?.overdue || 0}</div>
          </div>
        </div>

        {/* Filters - After Cards */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary text-sm"
          >
            <option value="all">ყველა ტიპი</option>
            <option value="outgoing">გასაგზავნი</option>
            <option value="incoming">მიღებული</option>
          </select>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary text-sm"
          >
            <option value="all">ყველა სტატუსი</option>
            <option value="draft">დრაფტი</option>
            <option value="sent">გაგზავნილი</option>
            <option value="paid">გადახდილი</option>
            <option value="partial">ნაწილობრივ</option>
            <option value="overdue">ვადაგასული</option>
          </select>
        </div>

        {/* Outgoing Invoices (Receivables) */}
        {(typeFilter === 'all' || typeFilter === 'outgoing') && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-text-primary">
                  📤 გასაგზავნი ინვოისები (მისაღები)
                </h3>
                <span className="text-sm text-text-muted">{outgoingInvoices.length} ინვოისი</span>
              </div>
            </CardHeader>
            <CardBody>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">ინვოისი</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">კლიენტი</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">თარიღი</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">ვადა</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-text-primary">თანხა</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-text-primary">დარჩენილი</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">სტატუსი</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-text-primary">მოქმედება</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outgoingInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-text-muted">
                          ინვოისები არ მოიძებნა
                        </td>
                      </tr>
                    ) : (
                      outgoingInvoices.map((invoice) => {
                        const daysUntilDue = getDaysUntilDue(invoice.dueDate)
                        return (
                          <tr key={invoice.id} className="border-b border-border hover:bg-bg-tertiary/50">
                            <td className="py-3 px-4">
                              <div className="font-medium text-text-primary">{invoice.invoiceNumber}</div>
                              {invoice.orderNumber && (
                                <div className="text-xs text-text-muted">შეკვეთა: {invoice.orderNumber}</div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-text-primary">{invoice.customerName || '-'}</td>
                            <td className="py-3 px-4 text-text-muted">{formatDate(new Date(invoice.issueDate))}</td>
                            <td className="py-3 px-4">
                              {invoice.dueDate ? (
                                <div>
                                  <div className="text-text-primary">{formatDate(new Date(invoice.dueDate))}</div>
                                  {daysUntilDue !== null && invoice.status !== 'paid' && (
                                    <div className={`text-xs ${daysUntilDue < 0 ? 'text-red-400' : daysUntilDue <= 3 ? 'text-amber-400' : 'text-text-muted'}`}>
                                      {daysUntilDue < 0 ? `${Math.abs(daysUntilDue)} დღე ვადაგასული` : `${daysUntilDue} დღე დარჩა`}
                                    </div>
                                  )}
                                </div>
                              ) : '-'}
                            </td>
                            <td className="py-3 px-4 text-right font-semibold text-text-primary">
                              {formatCurrency(invoice.total)}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {invoice.remaining > 0 ? (
                                <span className="font-semibold text-amber-400">{formatCurrency(invoice.remaining)}</span>
                              ) : (
                                <span className="text-green-400">✓</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusBadge(invoice.status)}`}>
                                {invoice.statusName}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <Button size="sm" variant="ghost" onClick={() => openViewModal(invoice)} title="ნახვა">
                                  👁️
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => openEditModal(invoice)} title="რედაქტირება">
                                  ✏️
                                </Button>
                                {invoice.status === 'draft' && (
                                  <Button size="sm" variant="secondary" onClick={() => handleUpdateStatus(invoice.id, 'SENT')} title="გაგზავნა">
                                    📤
                                  </Button>
                                )}
                                {invoice.status !== 'paid' && invoice.remaining > 0 && (
                                  <Button size="sm" variant="ghost" onClick={() => openPaymentModal(invoice)} title="გადახდა">
                                    💳
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Incoming Invoices (Payables) */}
        {(typeFilter === 'all' || typeFilter === 'incoming') && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-text-primary">
                  📥 მიღებული ინვოისები (გადასახდელი)
                </h3>
                <span className="text-sm text-text-muted">{incomingInvoices.length} ინვოისი</span>
              </div>
            </CardHeader>
            <CardBody>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">ინვოისი</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">მომწოდებელი</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">თარიღი</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">ვადა</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-text-primary">თანხა</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-text-primary">დარჩენილი</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">სტატუსი</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-text-primary">მოქმედება</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incomingInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-text-muted">
                          ინვოისები არ მოიძებნა
                        </td>
                      </tr>
                    ) : (
                      incomingInvoices.map((invoice) => {
                        const daysUntilDue = getDaysUntilDue(invoice.dueDate)
                        return (
                          <tr key={invoice.id} className="border-b border-border hover:bg-bg-tertiary/50">
                            <td className="py-3 px-4">
                              <div className="font-medium text-text-primary">{invoice.invoiceNumber}</div>
                            </td>
                            <td className="py-3 px-4 text-text-primary">{invoice.supplierName || '-'}</td>
                            <td className="py-3 px-4 text-text-muted">{formatDate(new Date(invoice.issueDate))}</td>
                            <td className="py-3 px-4">
                              {invoice.dueDate ? (
                                <div>
                                  <div className="text-text-primary">{formatDate(new Date(invoice.dueDate))}</div>
                                  {daysUntilDue !== null && invoice.status !== 'paid' && (
                                    <div className={`text-xs ${daysUntilDue < 0 ? 'text-red-400' : daysUntilDue <= 3 ? 'text-amber-400' : 'text-text-muted'}`}>
                                      {daysUntilDue < 0 ? `${Math.abs(daysUntilDue)} დღე ვადაგასული` : `${daysUntilDue} დღე დარჩა`}
                                    </div>
                                  )}
                                </div>
                              ) : '-'}
                            </td>
                            <td className="py-3 px-4 text-right font-semibold text-text-primary">
                              {formatCurrency(invoice.total)}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {invoice.remaining > 0 ? (
                                <span className="font-semibold text-red-400">{formatCurrency(invoice.remaining)}</span>
                              ) : (
                                <span className="text-green-400">✓</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusBadge(invoice.status)}`}>
                                {invoice.statusName}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <Button size="sm" variant="ghost" onClick={() => openViewModal(invoice)} title="ნახვა">
                                  👁️
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => openEditModal(invoice)} title="რედაქტირება">
                                  ✏️
                                </Button>
                                {invoice.status !== 'paid' && invoice.remaining > 0 && (
                                  <Button size="sm" variant="ghost" onClick={() => openPaymentModal(invoice)} title="გადახდა">
                                    💳
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Invoice Modal */}
        <InvoiceModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedInvoice(null)
          }}
          onSubmit={handleCreateInvoice}
          invoice={selectedInvoice}
          mode={modalMode}
          customers={customers}
          suppliers={suppliers as any}
        />

        {/* Invoice Payment Modal */}
        <InvoicePaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false)
            setSelectedInvoiceForPayment(null)
          }}
          onSubmit={handleInvoicePayment}
          invoice={selectedInvoiceForPayment as any}
        />
      </div>
    </DashboardLayout>
  )
}
