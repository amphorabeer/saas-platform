'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui'
import { StatCard } from '@/components/reports/StatCard'
import { InvoiceModal } from '@/components/finances/InvoiceModal'
import { PaymentModal } from '@/components/finances/PaymentModal'
import { mockInvoicesOutgoing, mockInvoicesIncoming, Invoice } from '@/data/financeData'
import { formatDate, formatCurrency } from '@/lib/utils'

export default function InvoicesPage() {
  const [activeTab, setActiveTab] = useState<'outgoing' | 'incoming'>('outgoing')
  const [statusFilter, setStatusFilter] = useState('all')
  const [periodFilter, setPeriodFilter] = useState('all')
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)

  const invoices = activeTab === 'outgoing' ? mockInvoicesOutgoing : mockInvoicesIncoming
  const filteredInvoices = invoices.filter(inv => {
    if (statusFilter !== 'all' && inv.status !== statusFilter) return false
    return true
  })

  // Statistics for outgoing
  const outgoingTotal = mockInvoicesOutgoing.length
  const outgoingPaid = mockInvoicesOutgoing.filter(inv => inv.status === 'paid').length
  const outgoingPending = mockInvoicesOutgoing.filter(inv => inv.status === 'pending').length
  const outgoingOverdue = mockInvoicesOutgoing.filter(inv => inv.status === 'overdue').length

  // Statistics for incoming
  const incomingTotal = mockInvoicesIncoming.length
  const incomingPaid = mockInvoicesIncoming.filter(inv => inv.status === 'paid').length
  const incomingPending = mockInvoicesIncoming.filter(inv => inv.status === 'pending').length
  const incomingOverdue = mockInvoicesIncoming.filter(inv => inv.status === 'overdue').length

  const getStatusBadge = (status: string) => {
    const badges = {
      paid: 'bg-green-400/20 text-green-400',
      pending: 'bg-gray-400/20 text-gray-400',
      partial: 'bg-amber-400/20 text-amber-400',
      overdue: 'bg-red-400/20 text-red-400',
    }
    return badges[status as keyof typeof badges] || badges.pending
  }

  const getStatusText = (status: string) => {
    const texts = {
      paid: '✅ გადახდილი',
      pending: '⏳ მოლოდინში',
      partial: '🔄 ნაწილობრივ',
      overdue: '❌ ვადაგადაცილებული',
    }
    return texts[status as keyof typeof texts] || texts.pending
  }

  return (
    <DashboardLayout title="🧾 ინვოისები" breadcrumb="მთავარი / ფინანსები / ინვოისები">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex bg-bg-tertiary rounded-lg p-1">
            <button
              onClick={() => setActiveTab('outgoing')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'outgoing'
                  ? 'bg-bg-card text-text-primary'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              📤 გასაგზავნი
            </button>
            <button
              onClick={() => setActiveTab('incoming')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'incoming'
                  ? 'bg-bg-card text-text-primary'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              📥 მიღებული
            </button>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
          >
            <option value="all">ყველა სტატუსი</option>
            <option value="paid">გადახდილი</option>
            <option value="pending">მოლოდინში</option>
            <option value="partial">ნაწილობრივ</option>
            <option value="overdue">ვადაგადაცილებული</option>
          </select>
          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            className="px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
          >
            <option value="all">ყველა პერიოდი</option>
            <option value="this_month">ამ თვე</option>
            <option value="last_month">წინა თვე</option>
            <option value="quarter">კვარტალი</option>
          </select>
          <Button onClick={() => {
            setSelectedInvoice(null)
            setIsInvoiceModalOpen(true)
          }}>+ ახალი ინვოისი</Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {activeTab === 'outgoing' ? (
          <>
            <StatCard title="სულ გასაგზავნი" value={outgoingTotal} icon="📤" color="blue" />
            <StatCard title="გადახდილი" value={`${outgoingPaid} (${Math.round((outgoingPaid / outgoingTotal) * 100)}%)`} icon="✅" color="green" />
            <StatCard title="მოლოდინში" value={outgoingPending} icon="⏳" color="amber" />
            <StatCard title="ვადაგადაცილებული" value={outgoingOverdue} icon="❌" color="red" />
          </>
        ) : (
          <>
            <StatCard title="სულ მიღებული" value={incomingTotal} icon="📥" color="blue" />
            <StatCard title="გადახდილი" value={`${incomingPaid} (${Math.round((incomingPaid / incomingTotal) * 100)}%)`} icon="✅" color="green" />
            <StatCard title="მოლოდინში" value={incomingPending} icon="⏳" color="amber" />
            <StatCard title="ვადაგადაცილებული" value={incomingOverdue} icon="❌" color="red" />
          </>
        )}
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-text-primary">
            {activeTab === 'outgoing' ? 'გასაგზავნი ინვოისების ცხრილი' : 'მიღებული ინვოისების ცხრილი'}
          </h3>
        </CardHeader>
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">#</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">ინვოისი</th>
                  {activeTab === 'outgoing' ? (
                    <>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">კლიენტი</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">თარიღი</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">ვადა</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-text-primary">თანხა</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-text-primary">გადახდილი</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">სტატუსი</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">მოქმედება</th>
                    </>
                  ) : (
                    <>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">მომწოდებელი</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">თარიღი</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">ვადა</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-text-primary">თანხა</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">სტატუსი</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">მოქმედება</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice, index) => (
                  <tr key={invoice.id} className="border-b border-border hover:bg-bg-tertiary/50">
                    <td className="py-3 px-4 text-text-muted">{index + 1}</td>
                    <td className="py-3 px-4 font-medium text-text-primary">{invoice.invoiceNumber}</td>
                    {activeTab === 'outgoing' ? (
                      <>
                        <td className="py-3 px-4 text-text-primary">{invoice.customerName || '-'}</td>
                        <td className="py-3 px-4 text-text-primary">{formatDate(invoice.date)}</td>
                        <td className="py-3 px-4 text-text-primary">{formatDate(invoice.dueDate)}</td>
                        <td className="py-3 px-4 text-right font-semibold text-text-primary">{formatCurrency(invoice.total)}</td>
                        <td className="py-3 px-4 text-right text-text-primary">{formatCurrency(invoice.paidAmount)}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusBadge(invoice.status)}`}>
                            {getStatusText(invoice.status)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedInvoice(invoice)
                                setIsInvoiceModalOpen(true)
                              }}
                            >
                              👁️
                            </Button>
                            {invoice.status !== 'paid' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedInvoice(invoice)
                                  setIsPaymentModalOpen(true)
                                }}
                              >
                                💳
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => console.log('PDF')}>📄</Button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-3 px-4 text-text-primary">{invoice.supplierName || '-'}</td>
                        <td className="py-3 px-4 text-text-primary">{formatDate(invoice.date)}</td>
                        <td className="py-3 px-4 text-text-primary">{formatDate(invoice.dueDate)}</td>
                        <td className="py-3 px-4 text-right font-semibold text-text-primary">{formatCurrency(invoice.total)}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusBadge(invoice.status)}`}>
                            {getStatusText(invoice.status)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedInvoice(invoice)
                                setIsInvoiceModalOpen(true)
                              }}
                            >
                              👁️
                            </Button>
                            {invoice.status !== 'paid' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedInvoice(invoice)
                                  setIsPaymentModalOpen(true)
                                }}
                              >
                                💳 გადახდა
                              </Button>
                            )}
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* Modals */}
      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => {
          setIsInvoiceModalOpen(false)
          setSelectedInvoice(null)
        }}
        onSubmit={(data) => {
          console.log('Invoice saved:', data)
          setIsInvoiceModalOpen(false)
          setSelectedInvoice(null)
        }}
        invoice={selectedInvoice || undefined}
        mode={selectedInvoice ? 'view' : 'create'}
      />

      {selectedInvoice && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false)
            setSelectedInvoice(null)
          }}
          onSubmit={(data) => {
            console.log('Payment registered:', data)
            setIsPaymentModalOpen(false)
            setSelectedInvoice(null)
          }}
          invoice={selectedInvoice}
        />
      )}
      </div>
    </DashboardLayout>
  )
}

