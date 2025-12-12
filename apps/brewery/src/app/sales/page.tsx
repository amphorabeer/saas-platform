'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout'
import { Card, CardHeader, CardBody, Button } from '@/components/ui'
import { formatDate, formatCurrency } from '@/lib/utils'
import { NewOrderModal } from '@/components/sales'
import { 
  products as centralProducts, 
  orders as centralOrders,
  customers as centralCustomers,
  kegs as centralKegs,
  getRecipeById
} from '@/data/centralData'

interface FinishedProduct {
  id: string
  batchId: string
  batchNumber: string
  productName: string
  style: string
  abv: number
  packageType: 'keg' | 'bottle' | 'can'
  packageSize: number
  quantity: number
  availableQuantity: number
  pricePerUnit: number
  productionDate: Date
  expiryDate: Date
}

interface Order {
  id: string
  orderNumber: string
  customerName: string
  orderDate: Date
  total: number
  status: string
  paymentStatus: string
}

// Transform central products to page format
const mockFinishedProducts: FinishedProduct[] = centralProducts.map((p, index) => {
  const recipe = getRecipeById(p.recipeId)
  return {
    id: p.id,
    batchId: p.batchId || '',
    batchNumber: 'BRW-2024-0XXX',
    productName: p.name.split(' ').slice(0, -2).join(' '),
    style: recipe?.style || '',
    abv: recipe?.abv || 5.0,
    packageType: p.type,
    packageSize: p.type === 'keg' ? p.size : p.size / 1000,
    quantity: p.quantity + (index % 10),
    availableQuantity: p.quantity,
    pricePerUnit: p.price,
    productionDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
  }
})

// Transform central orders to page format
const mockOrders: Order[] = centralOrders.map(o => ({
  id: o.id,
  orderNumber: o.orderNumber,
  customerName: o.customerName,
  orderDate: o.orderDate,
  total: o.total,
  status: o.status,
  paymentStatus: o.paymentStatus,
}))

// Kegs stats from central data
const mockKegsStats = {
  inStock: centralKegs.filter(k => k.status === 'available' || k.status === 'filled').length,
  withCustomer: centralKegs.filter(k => k.status === 'at_customer').length,
}

// Top customers from orders
const customerRevenue = centralOrders.reduce((acc, order) => {
  acc[order.customerName] = (acc[order.customerName] || 0) + order.total
  return acc
}, {} as Record<string, number>)

const mockTopCustomers = Object.entries(customerRevenue)
  .map(([name, revenue]) => ({ name, revenue }))
  .sort((a, b) => b.revenue - a.revenue)
  .slice(0, 3)



export default function SalesPage() {

  const router = useRouter()

  const [showNewOrder, setShowNewOrder] = useState(false)



  const stats = {

    monthlyRevenue: 45200,

    monthlyOrders: 32,

    soldLiters: 8500,

    activeCustomers: 24,

    pendingOrders: 5,

    pendingPayment: 12300,

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



  return (

    <DashboardLayout title="გაყიდვები" breadcrumb="მთავარი / გაყიდვები">

      {/* Header */}

      <div className="flex justify-between items-center mb-6">

        <h1 className="text-2xl font-display font-bold">გაყიდვები</h1>

        <div className="flex gap-2">

          <Button variant="secondary" onClick={() => router.push('/sales/customers')}>+ ახალი კლიენტი</Button>

          <Button variant="primary" onClick={() => setShowNewOrder(true)}>+ ახალი შეკვეთა</Button>

        </div>

      </div>



      {/* Stats Cards */}

      <div className="grid grid-cols-6 gap-4 mb-6">

        <Card>

          <CardBody className="p-4">

            <p className="text-2xl font-bold font-display text-green-400">{formatCurrency(stats.monthlyRevenue)}</p>

            <p className="text-xs text-text-muted">💰 გაყიდვები (თვე)</p>

            <p className="text-xs text-green-400 mt-1">↑18% წინა თვესთან</p>

          </CardBody>

        </Card>

        <Card>

          <CardBody className="p-4">

            <p className="text-2xl font-bold font-display text-blue-400">{stats.monthlyOrders}</p>

            <p className="text-xs text-text-muted">📦 შეკვეთები (თვე)</p>

            <p className="text-xs text-blue-400 mt-1">↑12%</p>

          </CardBody>

        </Card>

        <Card>

          <CardBody className="p-4">

            <p className="text-2xl font-bold font-display text-copper-light">{stats.soldLiters.toLocaleString()}L</p>

            <p className="text-xs text-text-muted">🍺 გაყიდული</p>

          </CardBody>

        </Card>

        <Card>

          <CardBody className="p-4">

            <p className="text-2xl font-bold font-display text-purple-400">{stats.activeCustomers}</p>

            <p className="text-xs text-text-muted">👥 აქტიური კლიენტები</p>

          </CardBody>

        </Card>

        <Card>

          <CardBody className="p-4">

            <p className="text-2xl font-bold font-display text-amber-400">{stats.pendingOrders}</p>

            <p className="text-xs text-text-muted">📋 მოლოდინში</p>

          </CardBody>

        </Card>

        <Card>

          <CardBody className="p-4">

            <p className="text-2xl font-bold font-display text-red-400">{formatCurrency(stats.pendingPayment)}</p>

            <p className="text-xs text-text-muted">💳 გადასახდელი</p>

          </CardBody>

        </Card>

      </div>



      <div className="grid grid-cols-3 gap-6">

        {/* Main Content */}

        <div className="col-span-2 space-y-6">

          {/* Finished Products Section */}

          <Card>

            <CardHeader>🍺 მზა პროდუქცია</CardHeader>

            <CardBody>

              <div className="flex gap-4 overflow-x-auto pb-2">

                {mockFinishedProducts.map(product => (

                  <div key={product.id} className="min-w-[280px] bg-bg-card border border-border rounded-xl p-4 flex-shrink-0">

                    <div className="flex items-start justify-between mb-2">

                      <div className="flex-1">

                        <h3 className="font-medium text-lg">{product.productName}</h3>

                        <p className="text-xs text-text-muted">

                          {product.packageType === 'keg' ? `კეგი ${product.packageSize}L` : 

                           product.packageType === 'bottle' ? `ბოთლი ${product.packageSize}L` : 

                           `ქილა ${product.packageSize}L`} | {product.quantity} ცალი

                        </p>

                      </div>

                      <span className="text-xs px-2 py-1 bg-green-400/20 text-green-400 rounded-full">Available</span>

                    </div>

                    <div className="mt-3 space-y-1 text-sm">

                      <p className="text-text-muted">ხელმისაწვდომი: {product.availableQuantity} ცალი</p>

                      <p className="font-mono text-copper-light">{formatCurrency(product.pricePerUnit)}/ცალი</p>

                    </div>

                    <Button variant="primary" size="sm" className="w-full mt-3" onClick={() => setShowNewOrder(true)}>

                      + შეკვეთაში

                    </Button>

                  </div>

                ))}

              </div>

            </CardBody>

          </Card>



          {/* Recent Orders */}

          <Card>

            <CardHeader>📋 უახლესი შეკვეთები</CardHeader>

            <CardBody noPadding>

              <table className="w-full">

                <thead>

                  <tr className="bg-bg-tertiary border-b border-border text-left text-xs text-text-muted">

                    <th className="px-4 py-3">#</th>

                    <th className="px-4 py-3">მომხმარებელი</th>

                    <th className="px-4 py-3">თარიღი</th>

                    <th className="px-4 py-3">პროდუქტები</th>

                    <th className="px-4 py-3">თანხა</th>

                    <th className="px-4 py-3">სტატუსი</th>

                  </tr>

                </thead>

                <tbody>

                  {mockOrders.map((order, i) => (

                    <tr 

                      key={order.id} 

                      className="border-b border-border/50 hover:bg-bg-tertiary/50 cursor-pointer transition-colors"

                      onClick={() => router.push(`/sales/orders/${order.id}`)}

                    >

                      <td className="px-4 py-3 font-mono text-sm">{order.orderNumber}</td>

                      <td className="px-4 py-3 text-sm">{order.customerName}</td>

                      <td className="px-4 py-3 text-sm text-text-muted">{formatDate(order.orderDate)}</td>

                      <td className="px-4 py-3 text-sm text-text-muted">-</td>

                      <td className="px-4 py-3 font-mono">{formatCurrency(order.total)}</td>

                      <td className="px-4 py-3">{getStatusBadge(order.status)}</td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </CardBody>

          </Card>

        </div>



        {/* Sidebar */}

        <div className="space-y-6">

          {/* Kegs Status Widget */}

          <Card>

            <CardHeader>🛢️ კეგების სტატუსი</CardHeader>

            <CardBody className="space-y-3">

              <div className="flex justify-between items-center">

                <span className="text-sm text-text-muted">🏠 საწყობში</span>

                <span className="text-lg font-bold text-green-400">{mockKegsStats.inStock}</span>

              </div>

              <div className="flex justify-between items-center">

                <span className="text-sm text-text-muted">👤 კლიენტთან</span>

                <span className="text-lg font-bold text-blue-400">{mockKegsStats.withCustomer}</span>

              </div>

              <Button variant="ghost" size="sm" className="w-full mt-2" onClick={() => router.push('/inventory/kegs')}>

                კეგების მენეჯმენტი →

              </Button>

            </CardBody>

          </Card>



          {/* Top Customers */}

          <Card>

            <CardHeader>👥 ტოპ კლიენტები</CardHeader>

            <CardBody className="space-y-3">

              {mockTopCustomers.map((customer, i) => (

                <div key={i} className="flex justify-between items-center">

                  <div className="flex-1">

                    <p className="text-sm font-medium">{customer.name}</p>

                    <p className="text-xs text-text-muted">{formatCurrency(customer.revenue)}</p>

                  </div>

                  <span className="text-xs text-text-muted">#{i + 1}</span>

                </div>

              ))}

              <Button variant="ghost" size="sm" className="w-full mt-2" onClick={() => router.push('/sales/customers')}>

                ყველა კლიენტი →

              </Button>

            </CardBody>

          </Card>



          {/* Quick Links */}

          <Card>

            <CardHeader>🔗 სწრაფი ლინკები</CardHeader>

            <CardBody className="space-y-2">

              <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => router.push('/sales/orders')}>

                📋 ყველა შეკვეთა

              </Button>

              <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => router.push('/sales/products')}>

                🍺 მზა პროდუქცია

              </Button>

              <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => router.push('/inventory/kegs')}>

                🛢️ კეგების მენეჯმენტი

              </Button>

            </CardBody>

          </Card>

        </div>

      </div>



      {/* New Order Modal */}

      <NewOrderModal

        isOpen={showNewOrder}

        onClose={() => setShowNewOrder(false)}

        onSubmit={(orderData) => {

          console.log('New order created:', orderData)

          setShowNewOrder(false)

          router.push('/sales/orders')

        }}

      />

    </DashboardLayout>

  )

}
