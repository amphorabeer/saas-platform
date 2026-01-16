'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui'
import { StatCard } from '@/components/reports/StatCard'
import { OrderPaymentModal, PaymentFormData } from '@/components/finances/OrderPaymentModal'
import { formatDate, formatCurrency } from '@/lib/utils'

interface Order {
  id: string
  orderNumber: string
  customerId: string
  customerName: string
  customerPhone: string | null
  status: string
  statusName: string
  paymentStatus: string
  paymentStatusName: string
  totalAmount: number
  paidAmount?: number
  orderedAt: string
  shippedAt: string | null
  deliveredAt: string | null
  items: Array<{
    id: string
    productName: string
    packageType: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }>
  itemCount: number
  notes: string | null
}

interface OrderStats {
  total: number
  totalRevenue: number
  pending: number
  paid: number
}

interface Customer {
  id: string
  name: string
}

const incomeCategoryConfig: Record<string, { name: string; icon: string }> = {
  SALE: { name: 'გაყიდვა', icon: '💰' },
  DEPOSIT: { name: 'დეპოზიტი', icon: '🔒' },
  REFUND: { name: 'დაბრუნება', icon: '↩️' },
  OTHER: { name: 'სხვა', icon: '📝' },
}

const packageTypeLabels: Record<string, string> = {
  KEG_50: 'კეგი 50L',
  KEG_30: 'კეგი 30L',
  KEG_20: 'კეგი 20L',
  BOTTLE_750: 'ბოთლი 750ml',
  BOTTLE_500: 'ბოთლი 500ml',
  BOTTLE_330: 'ბოთლი 330ml',
  CAN_500: 'ქილა 500ml',
  CAN_330: 'ქილა 330ml',
}

export default function IncomePage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [stats, setStats] = useState<OrderStats | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all')
  const [customerFilter, setCustomerFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Build query params
      const params = new URLSearchParams()
      if (paymentStatusFilter !== 'all') params.append('paymentStatus', paymentStatusFilter)
      if (customerFilter !== 'all') params.append('customerId', customerFilter)
      if (statusFilter !== 'all') params.append('status', statusFilter)

      // Fetch orders
      const ordersRes = await fetch(`/api/orders?${params}`)
      if (!ordersRes.ok) throw new Error('Failed to fetch orders')
      const ordersData = await ordersRes.json()
      setOrders(ordersData.orders)
      setStats(ordersData.stats)

      // Fetch customers for filter
      const customersRes = await fetch('/api/customers')
      if (customersRes.ok) {
        const customersData = await customersRes.json()
        setCustomers(customersData.customers || [])
      }

    } catch (err) {
      setError('მონაცემების ჩატვირთვა ვერ მოხერხდა')
      console.error('Income fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [paymentStatusFilter, customerFilter, statusFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Calculate income by package type
  const incomeByPackageType = orders.reduce((acc, order) => {
    order.items.forEach(item => {
      const type = item.packageType
      if (!acc[type]) acc[type] = 0
      acc[type] += item.totalPrice
    })
    return acc
  }, {} as Record<string, number>)

  // Prepare chart data
  const totalBySource = Object.values(incomeByPackageType).reduce((sum, val) => sum + val, 0)
  const sourceData = Object.entries(incomeByPackageType)
    .filter(([_, value]) => value > 0)
    .sort(([_, a], [__, b]) => b - a)
    .map(([type, value], index) => {
      const colors = ['#B87333', '#3B82F6', '#8B5CF6', '#10B981', '#EAB308', '#EC4899', '#F97316', '#6B7280']
      return {
        label: packageTypeLabels[type] || type,
        value,
        color: colors[index % colors.length],
      }
    })

  // Calculate additional stats
  const paidOrders = orders.filter(o => o.paymentStatus === 'paid')
  const paidAmount = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0)
  const pendingAmount = (stats?.totalRevenue || 0) - paidAmount
  const avgOrderValue = orders.length > 0 ? (stats?.totalRevenue || 0) / orders.length : 0

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
      setSelectedOrder(null)
      fetchData() // Refresh data
    } catch (err: any) {
      console.error('Payment creation error:', err)
      alert(err.message || 'გადახდის დაფიქსირება ვერ მოხერხდა')
    }
  }

  const openPaymentModal = (order: Order) => {
    setSelectedOrder(order)
    setIsPaymentModalOpen(true)
  }

  const getPaymentStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      paid: 'bg-green-400/20 text-green-400',
      pending: 'bg-gray-400/20 text-gray-400',
      partial: 'bg-amber-400/20 text-amber-400',
      overdue: 'bg-red-400/20 text-red-400',
      refunded: 'bg-purple-400/20 text-purple-400',
    }
    return badges[status] || badges.pending
  }

  if (loading) {
    return (
      <DashboardLayout title="💰 შემოსავლები" breadcrumb="მთავარი / ფინანსები / შემოსავლები">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-copper mx-auto mb-4"></div>
            <p className="text-text-muted">იტვირთება...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout title="💰 შემოსავლები" breadcrumb="მთავარი / ფინანსები / შემოსავლები">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <p className="text-text-muted mb-4">{error}</p>
            <Button onClick={fetchData}>თავიდან ცდა</Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="💰 შემოსავლები" breadcrumb="მთავარი / ფინანსები / შემოსავლები">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Link href="/finances">
              <Button variant="ghost" size="sm">← უკან</Button>
            </Link>
            <h2 className="text-2xl font-bold text-text-primary">შემოსავლები</h2>
          </div>
          
          <Link href="/sales/orders">
            <Button>📦 შეკვეთები</Button>
          </Link>
        </div>

        {/* Stats Cards - Compact Single Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-bg-card border border-border rounded-xl p-3">
            <div className="text-xs text-text-muted mb-1">💰 სულ შემოსავალი</div>
            <div className="text-xl font-bold text-green-400">{formatCurrency(stats?.totalRevenue || 0)}</div>
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-3">
            <div className="text-xs text-text-muted mb-1">✅ მიღებული</div>
            <div className="text-xl font-bold text-copper">{formatCurrency(paidAmount)}</div>
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-3">
            <div className="text-xs text-text-muted mb-1">⏳ მისაღები</div>
            <div className="text-xl font-bold text-amber-400">{formatCurrency(pendingAmount)}</div>
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-3">
            <div className="text-xs text-text-muted mb-1">📊 საშუალო შეკვეთა</div>
            <div className="text-xl font-bold text-text-primary">{formatCurrency(avgOrderValue)}</div>
          </div>
        </div>

        {/* Filters - After Cards */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={paymentStatusFilter}
            onChange={(e) => setPaymentStatusFilter(e.target.value)}
            className="px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary text-sm"
          >
            <option value="all">ყველა სტატუსი</option>
            <option value="paid">გადახდილი</option>
            <option value="pending">მოლოდინში</option>
            <option value="partial">ნაწილობრივ</option>
          </select>
          
          <select
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            className="px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary text-sm"
          >
            <option value="all">ყველა კლიენტი</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary text-sm"
          >
            <option value="all">ყველა პერიოდი</option>
            <option value="today">დღეს</option>
            <option value="week">ეს კვირა</option>
            <option value="month">ეს თვე</option>
          </select>
        </div>

        {/* Income by Source & Orders Table */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Income by Package Type */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-text-primary">შემოსავლები პროდუქტის ტიპით</h3>
            </CardHeader>
            <CardBody>
              {sourceData.length === 0 ? (
                <p className="text-text-muted text-center py-8">მონაცემები არ არის</p>
              ) : (
                <>
                  {/* Simple bar chart */}
                  <div className="space-y-4">
                    {sourceData.map((item, index) => {
                      const percentage = totalBySource > 0 ? Math.round((item.value / totalBySource) * 100) : 0
                      const barWidth = totalBySource > 0 ? (item.value / totalBySource) * 100 : 0
                      return (
                        <div key={index}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: item.color }} 
                              />
                              <span className="text-sm text-text-primary">{item.label}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-text-muted">{percentage}%</span>
                              <span className="text-sm font-semibold text-text-primary">
                                {formatCurrency(item.value)}
                              </span>
                            </div>
                          </div>
                          <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${barWidth}%`, backgroundColor: item.color }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-6 pt-4 border-t border-border">
                    <div className="flex justify-between items-center">
                      <span className="text-text-muted">ჯამი:</span>
                      <span className="text-xl font-bold text-green-400">
                        {formatCurrency(totalBySource)}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </CardBody>
          </Card>

          {/* Orders Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-text-primary">ბოლო შეკვეთები</h3>
                <span className="text-sm text-text-muted">{Math.min(orders.length, 5)} შეკვეთა</span>
              </div>
            </CardHeader>
            <CardBody>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-2 text-sm font-semibold text-text-primary">შეკვეთა</th>
                      <th className="text-left py-3 px-2 text-sm font-semibold text-text-primary">კლიენტი</th>
                      <th className="text-right py-3 px-2 text-sm font-semibold text-text-primary">თანხა</th>
                      <th className="text-left py-3 px-2 text-sm font-semibold text-text-primary">სტატუსი</th>
                      <th className="text-center py-3 px-2 text-sm font-semibold text-text-primary">მოქმედება</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-text-muted">
                          შეკვეთები არ მოიძებნა
                        </td>
                      </tr>
                    ) : (
                      orders.slice(0, 5).map((order) => (
                        <tr key={order.id} className="border-b border-border hover:bg-bg-tertiary/50">
                          <td className="py-3 px-2">
                            <div className="text-text-primary font-medium">{order.orderNumber}</div>
                            <div className="text-xs text-text-muted">{formatDate(new Date(order.orderedAt))}</div>
                          </td>
                          <td className="py-3 px-2 text-text-primary text-sm">{order.customerName}</td>
                          <td className="py-3 px-2 text-right font-semibold text-green-400">
                            {formatCurrency(order.totalAmount)}
                          </td>
                          <td className="py-3 px-2">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getPaymentStatusBadge(order.paymentStatus)}`}>
                              {order.paymentStatusName}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-center">
                            {order.paymentStatus !== 'paid' && (
                              <Button 
                                size="sm" 
                                variant="secondary"
                                onClick={() => openPaymentModal(order)}
                              >
                                💳 გადახდა
                              </Button>
                            )}
                            {order.paymentStatus === 'paid' && (
                              <span className="text-green-400 text-sm">✅</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {orders.length > 5 && (
                <Link href="/sales/orders">
                  <Button variant="ghost" className="w-full mt-4">
                    ყველა შეკვეთა ({orders.length}) →
                  </Button>
                </Link>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Full Orders Table */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-text-primary">შემოსავლების ცხრილი</h3>
          </CardHeader>
          <CardBody>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">#</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">თარიღი</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">შეკვეთა</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">კლიენტი</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">პროდუქტები</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-text-primary">თანხა</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">გადახდა</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">სტატუსი</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-text-primary">მოქმედება</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-text-muted">
                        შეკვეთები არ მოიძებნა
                      </td>
                    </tr>
                  ) : (
                    orders.map((order, index) => (
                      <tr key={order.id} className="border-b border-border hover:bg-bg-tertiary/50">
                        <td className="py-3 px-4 text-text-muted">{index + 1}</td>
                        <td className="py-3 px-4 text-text-primary">{formatDate(new Date(order.orderedAt))}</td>
                        <td className="py-3 px-4">
                          <Link href={`/sales/orders/${order.id}`} className="text-copper hover:underline font-medium">
                            {order.orderNumber}
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-text-primary">{order.customerName}</td>
                        <td className="py-3 px-4 text-text-muted text-sm">
                          {order.itemCount} პროდუქტი
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-green-400">
                          {formatCurrency(order.totalAmount)}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getPaymentStatusBadge(order.paymentStatus)}`}>
                            {order.paymentStatusName}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-text-muted">{order.statusName}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {order.paymentStatus !== 'paid' ? (
                            <Button 
                              size="sm" 
                              variant="secondary"
                              onClick={() => openPaymentModal(order)}
                            >
                              💳
                            </Button>
                          ) : (
                            <span className="text-green-400">✅</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>

        {/* Payment Modal */}
        <OrderPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false)
            setSelectedOrder(null)
          }}
          onSubmit={handlePaymentSubmit}
          order={selectedOrder}
        />
      </div>
    </DashboardLayout>
  )
}
