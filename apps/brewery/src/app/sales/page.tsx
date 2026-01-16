'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout'
import { Card, CardHeader, CardBody, Button } from '@/components/ui'
import { formatDate, formatCurrency } from '@/lib/utils'
import { NewOrderModal } from '@/components/sales'

interface Product {
  id: string
  name: string
  style: string
  abv: number | null
  packageType: string
  packageTypeName: string
  totalProduced: number
  availableQuantity: number
  pricePerUnit: number
}

interface Order {
  id: string
  orderNumber: string
  customerName: string
  orderedAt: string
  totalAmount: number
  status: string
  statusName: string
  itemCount: number
}

interface Customer {
  id: string
  name: string
  totalRevenue: number
}

export default function SalesPage() {
  const router = useRouter()
  const [showNewOrder, setShowNewOrder] = useState(false)
  const [loading, setLoading] = useState(true)
  
  // Real data states
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [stats, setStats] = useState({
    monthlyRevenue: 0,
    monthlyOrders: 0,
    totalProduced: 0,
    activeCustomers: 0,
    pendingOrders: 0,
    pendingPayment: 0,
    kegsInStock: 0,
    kegsWithCustomer: 0,
  })

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Fetch products
        const productsRes = await fetch('/api/products')
        const productsData = await productsRes.json()
        if (productsData.products) {
          setProducts(productsData.products)
          setStats(prev => ({
            ...prev,
            totalProduced: productsData.stats?.totalAvailable || 0,
          }))
        }
        
        // Fetch orders
        const ordersRes = await fetch('/api/orders?limit=10')
        const ordersData = await ordersRes.json()
        if (ordersData.orders) {
          setOrders(ordersData.orders)
          
          // Calculate monthly stats
          const thisMonth = new Date()
          thisMonth.setDate(1)
          thisMonth.setHours(0, 0, 0, 0)
          
          const monthlyOrders = ordersData.orders.filter((o: Order) => 
            new Date(o.orderedAt) >= thisMonth && o.status !== 'cancelled'
          )
          
          const pendingOrders = ordersData.orders.filter((o: Order) => 
            ['pending', 'confirmed', 'processing', 'ready'].includes(o.status)
          )
          
          setStats(prev => ({
            ...prev,
            monthlyRevenue: ordersData.stats?.totalRevenue || monthlyOrders.reduce((s: number, o: Order) => s + o.totalAmount, 0),
            monthlyOrders: monthlyOrders.length,
            pendingOrders: pendingOrders.length,
            pendingPayment: ordersData.orders
              .filter((o: Order) => o.status !== 'cancelled' && o.status !== 'delivered')
              .reduce((s: number, o: Order) => s + o.totalAmount, 0),
          }))
        }
        
        // Fetch customers
        const customersRes = await fetch('/api/customers')
        const customersData = await customersRes.json()
        if (customersData.customers) {
          const sorted = [...customersData.customers].sort((a: Customer, b: Customer) => b.totalRevenue - a.totalRevenue)
          setCustomers(sorted)
          setStats(prev => ({
            ...prev,
            activeCustomers: customersData.stats?.active || sorted.filter((c: any) => c.isActive).length,
          }))
        }
        
        // Fetch kegs stats
        try {
          const kegsRes = await fetch('/api/kegs')
          const kegsData = await kegsRes.json()
          if (kegsData.stats) {
            setStats(prev => ({
              ...prev,
              kegsInStock: kegsData.stats.available || kegsData.stats.inWarehouse || 0,
              kegsWithCustomer: kegsData.stats.withCustomer || kegsData.stats.atCustomer || 0,
            }))
          }
        } catch (e) {
          console.log('Kegs API not available yet')
        }
        
      } catch (error) {
        console.error('Failed to fetch sales data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [])

  const getStatusBadge = (status: string, statusName: string) => {
    const config: Record<string, { color: string; bg: string }> = {
      pending: { color: 'text-amber-400', bg: 'bg-amber-400/20' },
      confirmed: { color: 'text-blue-400', bg: 'bg-blue-400/20' },
      processing: { color: 'text-purple-400', bg: 'bg-purple-400/20' },
      ready: { color: 'text-cyan-400', bg: 'bg-cyan-400/20' },
      shipped: { color: 'text-indigo-400', bg: 'bg-indigo-400/20' },
      delivered: { color: 'text-green-400', bg: 'bg-green-400/20' },
      cancelled: { color: 'text-red-400', bg: 'bg-red-400/20' },
    }
    const c = config[status] || config.pending
    return <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.color}`}>{statusName}</span>
  }

  if (loading) {
    return (
      <DashboardLayout title="გაყიდვები" breadcrumb="მთავარი / გაყიდვები">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-text-muted">იტვირთება...</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="გაყიდვები" breadcrumb="მთავარი / გაყიდვები">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-text-primary">გაყიდვები</h2>
        
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/sales/orders">
            <Button variant="ghost" size="sm">📋 ყველა შეკვეთა</Button>
          </Link>
          <Link href="/sales/products">
            <Button variant="ghost" size="sm">🍺 მზა პროდუქცია</Button>
          </Link>
          <Link href="/sales/kegs">
            <Button variant="ghost" size="sm">🛢️ კეგების მენეჯმენტი</Button>
          </Link>
          <Button variant="secondary" onClick={() => router.push('/sales/customers')}>
            + ახალი კლიენტი
          </Button>
          <Button onClick={() => setShowNewOrder(true)}>
            + ახალი შეკვეთა
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-6 gap-4 mb-6">
        <Card>
          <CardBody className="p-4">
            <p className="text-2xl font-bold font-display text-green-400">{formatCurrency(stats.monthlyRevenue)}</p>
            <p className="text-xs text-text-muted">💰 გაყიდვები (თვე)</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-4">
            <p className="text-2xl font-bold font-display text-blue-400">{stats.monthlyOrders}</p>
            <p className="text-xs text-text-muted">📦 შეკვეთები (თვე)</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-4">
            <p className="text-2xl font-bold font-display text-copper-light">{stats.totalProduced}</p>
            <p className="text-xs text-text-muted">🍺 დაფასოებული (ცალი)</p>
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
            <CardHeader className="flex justify-between items-center">
              <span>🍺 მზა პროდუქცია</span>
              <Button variant="ghost" size="sm" onClick={() => router.push('/sales/products')}>
                ყველა →
              </Button>
            </CardHeader>
            <CardBody>
              {products.length === 0 ? (
                <div className="text-center py-8 text-text-muted">
                  <p>პროდუქცია ჯერ არ არის დაფასოებული</p>
                  <Button variant="secondary" size="sm" className="mt-2" onClick={() => router.push('/production')}>
                    წარმოებაში გადასვლა
                  </Button>
                </div>
              ) : (
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {products.map(product => (
                    <div key={product.id} className="min-w-[280px] bg-bg-card border border-border rounded-xl p-4 flex-shrink-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-medium text-lg">{product.name}</h3>
                          <p className="text-xs text-text-muted">
                            {product.packageTypeName} | {product.totalProduced} ცალი
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          product.availableQuantity > 10 
                            ? 'bg-green-400/20 text-green-400' 
                            : product.availableQuantity > 0
                            ? 'bg-amber-400/20 text-amber-400'
                            : 'bg-red-400/20 text-red-400'
                        }`}>
                          {product.availableQuantity > 10 ? 'მარაგშია' : product.availableQuantity > 0 ? 'დაბალი' : 'ამოწურულია'}
                        </span>
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
              )}
            </CardBody>
          </Card>

          {/* Recent Orders */}
          <Card>
            <CardHeader className="flex justify-between items-center">
              <span>📋 უახლესი შეკვეთები</span>
              <Button variant="ghost" size="sm" onClick={() => router.push('/sales/orders')}>
                ყველა →
              </Button>
            </CardHeader>
            <CardBody noPadding>
              {orders.length === 0 ? (
                <div className="text-center py-8 text-text-muted">
                  <p>შეკვეთები ჯერ არ არის</p>
                  <Button variant="primary" size="sm" className="mt-2" onClick={() => setShowNewOrder(true)}>
                    + ახალი შეკვეთა
                  </Button>
                </div>
              ) : (
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
                    {orders.slice(0, 6).map((order) => (
                      <tr 
                        key={order.id} 
                        className="border-b border-border/50 hover:bg-bg-tertiary/50 cursor-pointer transition-colors"
                        onClick={() => router.push(`/sales/orders/${order.id}`)}
                      >
                        <td className="px-4 py-3 font-mono text-sm">{order.orderNumber}</td>
                        <td className="px-4 py-3 text-sm">{order.customerName}</td>
                        <td className="px-4 py-3 text-sm text-text-muted">{formatDate(new Date(order.orderedAt))}</td>
                        <td className="px-4 py-3 text-sm text-text-muted">{order.itemCount} პროდუქტი</td>
                        <td className="px-4 py-3 font-mono">{formatCurrency(order.totalAmount)}</td>
                        <td className="px-4 py-3">{getStatusBadge(order.status, order.statusName)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Kegs Status Widget */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-text-primary">🛢️ კეგების სტატუსი</h3>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-text-primary">
                    <span>🏭</span> საწყობში
                  </span>
                  <span className="text-2xl font-bold text-green-400">{stats.kegsInStock || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-text-primary">
                    <span>👤</span> კლიენტთან
                  </span>
                  <span className="text-2xl font-bold text-amber-400">{stats.kegsWithCustomer || 0}</span>
                </div>
                <Link href="/sales/kegs" className="block pt-2">
                  <Button variant="ghost" size="sm" className="w-full">
                    კეგების Tracking →
                  </Button>
                </Link>
              </div>
            </CardBody>
          </Card>

          {/* Top Customers */}
          <Card>
            <CardHeader>👥 ტოპ კლიენტები</CardHeader>
            <CardBody className="space-y-3">
              {customers.length === 0 ? (
                <p className="text-sm text-text-muted text-center py-2">კლიენტები არ არის</p>
              ) : (
                customers.slice(0, 3).map((customer, i) => (
                  <div key={customer.id} className="flex justify-between items-center">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{customer.name}</p>
                      <p className="text-xs text-text-muted">{formatCurrency(customer.totalRevenue)}</p>
                    </div>
                    <span className="text-xs text-text-muted">#{i + 1}</span>
                  </div>
                ))
              )}
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
              <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => router.push('/sales/kegs')}>
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
