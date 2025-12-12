'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout'
import { Card, CardHeader, CardBody, Button } from '@/components/ui'
import { formatDate, formatCurrency } from '@/lib/utils'
import { orders as centralOrders, customers as centralCustomers } from '@/data/centralData'

interface Order {
  id: string
  orderNumber: string
  customerName: string
  orderDate: Date
  items: { productName: string; quantity: number }[]
  total: number
  paymentStatus: 'pending' | 'partial' | 'paid'
  status: 'draft' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
}

// Transform central orders to page format
const mockOrders: Order[] = centralOrders.map(o => ({
  id: o.id,
  orderNumber: o.orderNumber,
  customerName: o.customerName,
  orderDate: o.orderDate,
  items: o.items.map(item => ({ productName: item.productName, quantity: item.quantity })),
  total: o.total,
  paymentStatus: o.paymentStatus,
  status: o.status,
}))

const mockCustomers = centralCustomers.map(c => c.name)



export default function OrdersPage() {

  const router = useRouter()

  const [statusFilter, setStatusFilter] = useState<string>('all')

  const [periodFilter, setPeriodFilter] = useState<string>('all')

  const [customerFilter, setCustomerFilter] = useState<string>('all')

  const [searchQuery, setSearchQuery] = useState('')



  const filteredOrders = mockOrders.filter(order => {

    if (statusFilter !== 'all' && order.status !== statusFilter) return false

    if (customerFilter !== 'all' && order.customerName !== customerFilter) return false

    if (searchQuery && !order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) &&

        !order.customerName.toLowerCase().includes(searchQuery.toLowerCase())) return false

    return true

  })



  const stats = {

    total: mockOrders.length,

    pending: mockOrders.filter(o => o.status === 'draft' || o.status === 'confirmed').length,

    shipped: mockOrders.filter(o => o.status === 'shipped').length,

    monthlyRevenue: 45200,

  }



  const getStatusBadge = (status: string) => {

    const config: Record<string, { label: string; color: string; bg: string }> = {

      draft: { label: 'დრაფტი', color: 'text-gray-400', bg: 'bg-gray-400/20' },

      confirmed: { label: 'დადასტურებული', color: 'text-blue-400', bg: 'bg-blue-400/20' },

      processing: { label: 'დამუშავებაში', color: 'text-amber-400', bg: 'bg-amber-400/20' },

      shipped: { label: 'გაგზავნილი', color: 'text-purple-400', bg: 'bg-purple-400/20' },

      delivered: { label: 'მიღებული', color: 'text-green-400', bg: 'bg-green-400/20' },

      cancelled: { label: 'გაუქმებული', color: 'text-red-400', bg: 'bg-red-400/20' },

    }

    const c = config[status] || config.draft

    return <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.color}`}>{c.label}</span>

  }



  const getPaymentBadge = (status: string) => {

    const config: Record<string, { label: string; color: string; bg: string }> = {

      pending: { label: 'გადახდის მოლოდინში', color: 'text-amber-400', bg: 'bg-amber-400/20' },

      partial: { label: 'ნაწილობრივ გადახდილი', color: 'text-orange-400', bg: 'bg-orange-400/20' },

      paid: { label: 'გადახდილი', color: 'text-green-400', bg: 'bg-green-400/20' },

    }

    const c = config[status] || config.pending

    return <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.color}`}>{c.label}</span>

  }



  return (

    <DashboardLayout title="შეკვეთები" breadcrumb="მთავარი / გაყიდვები / შეკვეთები">

      {/* Header */}

      <div className="flex justify-between items-center mb-6">

        <h1 className="text-2xl font-display font-bold">შეკვეთები</h1>

        <Button variant="primary" onClick={() => router.push('/sales')}>+ ახალი შეკვეთა</Button>

      </div>



      {/* Stats Cards */}

      <div className="grid grid-cols-4 gap-4 mb-6">

        <Card>

          <CardBody className="p-4">

            <p className="text-2xl font-bold font-display">{stats.total}</p>

            <p className="text-xs text-text-muted">სულ შეკვეთა</p>

          </CardBody>

        </Card>

        <Card>

          <CardBody className="p-4">

            <p className="text-2xl font-bold font-display text-amber-400">{stats.pending}</p>

            <p className="text-xs text-text-muted">მოლოდინში</p>

          </CardBody>

        </Card>

        <Card>

          <CardBody className="p-4">

            <p className="text-2xl font-bold font-display text-purple-400">{stats.shipped}</p>

            <p className="text-xs text-text-muted">გაგზავნილი</p>

          </CardBody>

        </Card>

        <Card>

          <CardBody className="p-4">

            <p className="text-2xl font-bold font-display text-green-400">{formatCurrency(stats.monthlyRevenue)}</p>

            <p className="text-xs text-text-muted">თვის შემოსავალი</p>

          </CardBody>

        </Card>

      </div>



      {/* Filters */}

      <Card className="mb-6">

        <CardBody>

          <div className="grid grid-cols-4 gap-4">

            <div>

              <label className="block text-xs text-text-muted mb-2">სტატუსი</label>

              <select

                value={statusFilter}

                onChange={(e) => setStatusFilter(e.target.value)}

                className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm outline-none focus:border-copper"

              >

                <option value="all">ყველა</option>

                <option value="draft">დრაფტი</option>

                <option value="confirmed">დადასტურებული</option>

                <option value="processing">დამუშავებაში</option>

                <option value="shipped">გაგზავნილი</option>

                <option value="delivered">მიღებული</option>

                <option value="cancelled">გაუქმებული</option>

              </select>

            </div>

            <div>

              <label className="block text-xs text-text-muted mb-2">პერიოდი</label>

              <select

                value={periodFilter}

                onChange={(e) => setPeriodFilter(e.target.value)}

                className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm outline-none focus:border-copper"

              >

                <option value="all">ყველა</option>

                <option value="today">დღეს</option>

                <option value="week">კვირა</option>

                <option value="month">თვე</option>

              </select>

            </div>

            <div>

              <label className="block text-xs text-text-muted mb-2">მომხმარებელი</label>

              <select

                value={customerFilter}

                onChange={(e) => setCustomerFilter(e.target.value)}

                className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm outline-none focus:border-copper"

              >

                <option value="all">ყველა</option>

                {mockCustomers.map(customer => (

                  <option key={customer} value={customer}>{customer}</option>

                ))}

              </select>

            </div>

            <div>

              <label className="block text-xs text-text-muted mb-2">ძიება</label>

              <input

                type="text"

                value={searchQuery}

                onChange={(e) => setSearchQuery(e.target.value)}

                placeholder="შეკვეთის ნომერი..."

                className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm outline-none focus:border-copper"

              />

            </div>

          </div>

        </CardBody>

      </Card>



      {/* Orders Table */}

      <Card>

        <CardHeader>📋 შეკვეთების სია ({filteredOrders.length})</CardHeader>

        <CardBody noPadding>

          <table className="w-full">

            <thead>

              <tr className="bg-bg-tertiary border-b border-border text-left text-xs text-text-muted">

                <th className="px-4 py-3">შეკვეთა</th>

                <th className="px-4 py-3">მომხმარებელი</th>

                <th className="px-4 py-3">თარიღი</th>

                <th className="px-4 py-3">პროდუქტები</th>

                <th className="px-4 py-3">თანხა</th>

                <th className="px-4 py-3">გადახდა</th>

                <th className="px-4 py-3">სტატუსი</th>

                <th className="px-4 py-3"></th>

              </tr>

            </thead>

            <tbody>

              {filteredOrders.map(order => (

                <tr 

                  key={order.id} 

                  className="border-b border-border/50 hover:bg-bg-tertiary/50 cursor-pointer transition-colors"

                  onClick={() => router.push(`/sales/orders/${order.id}`)}

                >

                  <td className="px-4 py-3 font-mono text-sm text-copper-light">{order.orderNumber}</td>

                  <td className="px-4 py-3 text-sm">{order.customerName}</td>

                  <td className="px-4 py-3 text-sm text-text-muted">{formatDate(order.orderDate)}</td>

                  <td className="px-4 py-3 text-sm text-text-muted">

                    {order.items.map((item, i) => `${item.quantity} ${item.productName}`).join(', ')}

                  </td>

                  <td className="px-4 py-3 font-mono">{formatCurrency(order.total)}</td>

                  <td className="px-4 py-3">{getPaymentBadge(order.paymentStatus)}</td>

                  <td className="px-4 py-3">{getStatusBadge(order.status)}</td>

                  <td className="px-4 py-3">

                    <Button variant="ghost" size="sm">→</Button>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </CardBody>

      </Card>

    </DashboardLayout>

  )

}
