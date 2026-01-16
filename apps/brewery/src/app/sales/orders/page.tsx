'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout'
import { Card, CardHeader, CardBody, Button } from '@/components/ui'
import { formatDate, formatCurrency } from '@/lib/utils'
import { NewOrderModal } from '@/components/sales'

interface Order {
  id: string
  orderNumber: string
  customerId?: string
  customerName: string
  status: string
  paymentStatus: string
  totalAmount: number
  orderedAt: string
  items: Array<{
    productName: string
    quantity: number
  }>
  itemCount: number
}

// Workflow configuration
const ORDER_WORKFLOW = [
  { key: 'pending', label: 'მოლოდინში', icon: '⏳', color: '#f59e0b', next: 'confirmed' },
  { key: 'confirmed', label: 'დადასტურებული', icon: '✓', color: '#3b82f6', next: 'processing' },
  { key: 'processing', label: 'მზადდება', icon: '🔄', color: '#8b5cf6', next: 'ready' },
  { key: 'ready', label: 'მზადაა', icon: '📦', color: '#06b6d4', next: 'shipped' },
  { key: 'shipped', label: 'გაგზავნილი', icon: '🚚', color: '#6366f1', next: 'delivered' },
  { key: 'delivered', label: 'მიღებული', icon: '✅', color: '#22c55e', next: null },
  { key: 'cancelled', label: 'გაუქმებული', icon: '❌', color: '#ef4444', next: null },
]

const PAYMENT_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  pending: { label: 'გადასახდელი', icon: '💳', color: '#f59e0b' },
  partial: { label: 'ნაწილობრივ', icon: '💰', color: '#f97316' },
  paid: { label: 'გადახდილი', icon: '✅', color: '#22c55e' },
  overdue: { label: 'ვადაგასული', icon: '⚠️', color: '#ef4444' },
  refunded: { label: 'დაბრუნებული', icon: '↩️', color: '#6b7280' },
}

export default function OrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [stats, setStats] = useState<{
    total: number
    totalAmount: number
    active: number
    completed: number
    cancelled: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)

  // Fetch orders
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/orders?limit=100')
        if (res.ok) {
          const data = await res.json()
          const fetchedOrders = data.orders || []
          setOrders(fetchedOrders)
          
          // Calculate stats from orders
          const activeOrders = fetchedOrders.filter((o: Order) => 
            ['PENDING', 'CONFIRMED', 'PROCESSING', 'READY', 'SHIPPED'].includes(o.status.toUpperCase())
          )
          const completedOrders = fetchedOrders.filter((o: Order) => 
            o.status.toUpperCase() === 'DELIVERED'
          )
          const cancelledOrders = fetchedOrders.filter((o: Order) => 
            o.status.toUpperCase() === 'CANCELLED'
          )
          const totalAmount = fetchedOrders.reduce((sum: number, o: Order) => 
            sum + (o.totalAmount || 0), 0
          )
          
          setStats({
            total: fetchedOrders.length,
            totalAmount,
            active: activeOrders.length,
            completed: completedOrders.length,
            cancelled: cancelledOrders.length,
          })
        }
      } catch (error) {
        console.error('Failed to fetch orders:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchOrders()
  }, [])

  // Filter orders based on status filter
  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchQuery || 
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase())
    
    if (!matchesSearch) return false
    
    if (statusFilter === 'active') {
      return !['delivered', 'cancelled'].includes(order.status.toLowerCase())
    } else if (statusFilter === 'completed') {
      return order.status.toLowerCase() === 'delivered'
    } else if (statusFilter === 'cancelled') {
      return order.status.toLowerCase() === 'cancelled'
    }
    return true
  })

  // Get next action for order
  const getNextAction = (status: string) => {
    const current = ORDER_WORKFLOW.find(s => s.key === status.toLowerCase())
    if (!current?.next) return null
    return ORDER_WORKFLOW.find(s => s.key === current.next)
  }

  // Quick status update
  const quickStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      setUpdating(orderId)
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, status: newStatus.toUpperCase() }),
      })
      if (res.ok) {
        // Refetch orders to get updated data
        const refreshRes = await fetch('/api/orders?limit=100')
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json()
          const fetchedOrders = refreshData.orders || []
          setOrders(fetchedOrders)
          
          // Recalculate stats
          const activeOrders = fetchedOrders.filter((o: Order) => 
            ['PENDING', 'CONFIRMED', 'PROCESSING', 'READY', 'SHIPPED'].includes(o.status.toUpperCase())
          )
          const completedOrders = fetchedOrders.filter((o: Order) => 
            o.status.toUpperCase() === 'DELIVERED'
          )
          const cancelledOrders = fetchedOrders.filter((o: Order) => 
            o.status.toUpperCase() === 'CANCELLED'
          )
          const totalAmount = fetchedOrders.reduce((sum: number, o: Order) => 
            sum + (o.totalAmount || 0), 0
          )
          
          setStats({
            total: fetchedOrders.length,
            totalAmount,
            active: activeOrders.length,
            completed: completedOrders.length,
            cancelled: cancelledOrders.length,
          })
        }
      }
    } catch (error) {
      console.error('Failed to update:', error)
      alert('სტატუსის შეცვლა ვერ მოხერხდა')
    } finally {
      setUpdating(null)
    }
  }

  // Get status config
  const getStatusConfig = (status: string) => {
    return ORDER_WORKFLOW.find(s => s.key === status.toLowerCase()) || ORDER_WORKFLOW[0]
  }

  // Get payment config
  const getPaymentConfig = (status: string) => {
    return PAYMENT_CONFIG[status.toLowerCase()] || PAYMENT_CONFIG.pending
  }

  return (
    <DashboardLayout title="შეკვეთები" breadcrumb="მთავარი / გაყიდვები / შეკვეთები">
      {/* Header Row */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/sales">
            <Button variant="ghost" size="sm">← უკან</Button>
          </Link>
          <h2 className="text-2xl font-bold text-text-primary">შეკვეთები</h2>
        </div>
        
        <Button onClick={() => setIsOrderModalOpen(true)}>
          + ახალი შეკვეთა
        </Button>
      </div>

      {/* Stats Cards - Compact Single Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-text-muted text-sm mb-1">
            <span>📦</span> სულ შეკვეთა
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-copper">{stats?.total || orders.length}</span>
            <span className="text-sm text-text-muted">{formatCurrency(stats?.totalAmount || 0)}</span>
          </div>
        </div>
        
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-text-muted text-sm mb-1">
            <span>💰</span> სულ გაყიდვა
          </div>
          <div className="text-2xl font-bold text-green-400">{formatCurrency(stats?.totalAmount || 0)}</div>
        </div>
        
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-text-muted text-sm mb-1">
            <span>⏳</span> აქტიური
          </div>
          <div className="text-2xl font-bold text-amber-400">{stats?.active || 0}</div>
        </div>
        
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-text-muted text-sm mb-1">
            <span>✅</span> დასრულებული
          </div>
          <div className="text-2xl font-bold text-green-400">{stats?.completed || 0}</div>
        </div>
      </div>

      {/* Tabs and Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={statusFilter === 'active' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter('active')}
          >
            აქტიური ({stats?.active || 0})
          </Button>
          <Button
            variant={statusFilter === 'completed' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter('completed')}
          >
            დასრულებული ({stats?.completed || 0})
          </Button>
          <Button
            variant={statusFilter === 'cancelled' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter('cancelled')}
          >
            გაუქმებული ({stats?.cancelled || 0})
          </Button>
          <Button
            variant={statusFilter === 'all' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter('all')}
          >
            ყველა ({stats?.total || orders.length})
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 ძიება..."
            className="px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary w-full md:w-64"
          />
        </div>
      </div>

      {/* Orders List */}
      <Card>
        <CardBody noPadding>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-copper"></div>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              <p className="text-4xl mb-2">📭</p>
              <p>შეკვეთები არ მოიძებნა</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredOrders.map(order => {
                const statusConfig = getStatusConfig(order.status)
                const paymentConfig = getPaymentConfig(order.paymentStatus)
                const nextAction = getNextAction(order.status)
                const isUpdating = updating === order.id

                return (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-4 hover:bg-bg-tertiary/50 transition-colors cursor-pointer group"
                    onClick={() => router.push(`/sales/orders/${order.id}`)}
                  >
                    {/* Left: Order Info */}
                    <div className="flex items-center gap-4 flex-1">
                      {/* Status Icon */}
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                        style={{ backgroundColor: `${statusConfig.color}20` }}
                      >
                        {statusConfig.icon}
                      </div>

                      {/* Order Details */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-mono text-copper-light font-medium">{order.orderNumber}</span>
                          {/* Status Badge */}
                          <span 
                            className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                            style={{ backgroundColor: statusConfig.color }}
                          >
                            {statusConfig.label}
                          </span>
                          {/* Payment Badge */}
                          <span 
                            className="px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{ 
                              backgroundColor: `${paymentConfig.color}20`,
                              color: paymentConfig.color 
                            }}
                          >
                            {paymentConfig.icon} {paymentConfig.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-text-muted">
                          <span>👤 {order.customerName}</span>
                          <span>📅 {formatDate(new Date(order.orderedAt))}</span>
                          <span>📦 {order.itemCount || order.items?.length || 0} პროდუქტი</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Amount & Action */}
                    <div className="flex items-center gap-4">
                      {/* Amount */}
                      <div className="text-right">
                        <p className="font-mono text-lg font-bold">{formatCurrency(order.totalAmount || 0)}</p>
                      </div>

                      {/* Quick Action Button */}
                      {nextAction && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            quickStatusUpdate(order.id, nextAction.key)
                          }}
                          disabled={isUpdating}
                          className="px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 opacity-0 group-hover:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ 
                            backgroundColor: `${nextAction.color}20`,
                            color: nextAction.color,
                          }}
                        >
                          {isUpdating ? (
                            <span className="animate-spin">⏳</span>
                          ) : (
                            <>
                              <span>{nextAction.icon}</span>
                              <span>{nextAction.label}</span>
                            </>
                          )}
                        </button>
                      )}

                      {/* Arrow */}
                      <span className="text-text-muted group-hover:text-copper transition-colors">→</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {/* New Order Modal */}
      <NewOrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        onSubmit={(orderData) => {
          console.log('New order created:', orderData)
          setIsOrderModalOpen(false)
          // Refetch orders
          const fetchOrders = async () => {
            const res = await fetch('/api/orders?limit=100')
            if (res.ok) {
              const data = await res.json()
              const fetchedOrders = data.orders || []
              setOrders(fetchedOrders)
              
              // Recalculate stats
              const activeOrders = fetchedOrders.filter((o: Order) => 
                ['PENDING', 'CONFIRMED', 'PROCESSING', 'READY', 'SHIPPED'].includes(o.status.toUpperCase())
              )
              const completedOrders = fetchedOrders.filter((o: Order) => 
                o.status.toUpperCase() === 'DELIVERED'
              )
              const cancelledOrders = fetchedOrders.filter((o: Order) => 
                o.status.toUpperCase() === 'CANCELLED'
              )
              const totalAmount = fetchedOrders.reduce((sum: number, o: Order) => 
                sum + (o.totalAmount || 0), 0
              )
              
              setStats({
                total: fetchedOrders.length,
                totalAmount,
                active: activeOrders.length,
                completed: completedOrders.length,
                cancelled: cancelledOrders.length,
              })
            }
          }
          fetchOrders()
        }}
      />
    </DashboardLayout>
  )
}
