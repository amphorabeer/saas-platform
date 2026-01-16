'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout'
import { Card, CardHeader, CardBody, Button } from '@/components/ui'
import { formatDate, formatCurrency } from '@/lib/utils'

interface Customer {
  id: string
  name: string
  type: string
  typeName: string
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  taxId: string | null
  kegReturnDays: number
  isActive: boolean
  totalOrders: number
  totalRevenue: number
  createdAt: string
}

interface Keg {
  id: string
  kegNumber: string
  size: number
  status: string
  productName: string | null
  sentAt: string | null
  daysOut: number | null
  isOverdue: boolean
  orderId: string | null
}

interface Order {
  id: string
  orderNumber: string
  status: string
  totalAmount: number
  orderedAt: string
  items: Array<{ productName: string; quantity: number }>
}

const TYPE_ICONS: Record<string, string> = {
  RESTAURANT: '🍽️',
  BAR: '🍺',
  RETAIL: '🏪',
  WHOLESALE: '📦',
  DISTRIBUTOR: '🚚',
  EXPORT: '🌍',
}

export default function CustomerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const customerId = params.id as string

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [kegs, setKegs] = useState<Keg[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'kegs' | 'orders' | 'settings'>('kegs')
  
  // Keg Return Modal
  const [selectedKeg, setSelectedKeg] = useState<Keg | null>(null)
  const [showReturnModal, setShowReturnModal] = useState(false)
  
  // Settings
  const [editingReturnDays, setEditingReturnDays] = useState(false)
  const [newReturnDays, setNewReturnDays] = useState(14)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Fetch customer
        const customerRes = await fetch(`/api/customers/${customerId}`)
        if (customerRes.ok) {
          const data = await customerRes.json()
          setCustomer(data.customer)
          setNewReturnDays(data.customer.kegReturnDays || 14)
        }

        // Fetch customer's kegs
        const kegsRes = await fetch(`/api/kegs?customerId=${customerId}&status=WITH_CUSTOMER`)
        if (kegsRes.ok) {
          const data = await kegsRes.json()
          setKegs(data.kegs || [])
        }

        // Fetch customer's orders
        const ordersRes = await fetch(`/api/orders?customerId=${customerId}`)
        if (ordersRes.ok) {
          const data = await ordersRes.json()
          setOrders(data.orders || [])
        }

      } catch (error) {
        console.error('Failed to fetch customer data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (customerId) {
      fetchData()
    }
  }, [customerId])

  const handleKegReturn = async (kegId: string, condition: string, notes: string) => {
    try {
      const res = await fetch(`/api/kegs/${kegId}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ condition, notes }),
      })

      if (res.ok) {
        // Refresh kegs
        const kegsRes = await fetch(`/api/kegs?customerId=${customerId}&status=WITH_CUSTOMER`)
        if (kegsRes.ok) {
          const data = await kegsRes.json()
          setKegs(data.kegs || [])
        }
        setShowReturnModal(false)
        setSelectedKeg(null)
      } else {
        const data = await res.json()
        alert(data.error || 'დაბრუნება ვერ მოხერხდა')
      }
    } catch (error) {
      console.error('Failed to return keg:', error)
      alert('დაბრუნება ვერ მოხერხდა')
    }
  }

  const handleUpdateReturnDays = async () => {
    try {
      const res = await fetch(`/api/customers`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: customerId, kegReturnDays: newReturnDays }),
      })

      if (res.ok) {
        setCustomer(prev => prev ? { ...prev, kegReturnDays: newReturnDays } : null)
        setEditingReturnDays(false)
      } else {
        alert('ვადის განახლება ვერ მოხერხდა')
      }
    } catch (error) {
      console.error('Failed to update return days:', error)
    }
  }

  const overdueKegs = kegs.filter(k => k.isOverdue)

  if (loading) {
    return (
      <DashboardLayout title="კლიენტი" breadcrumb="იტვირთება...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-copper" />
        </div>
      </DashboardLayout>
    )
  }

  if (!customer) {
    return (
      <DashboardLayout title="კლიენტი" breadcrumb="შეცდომა">
        <Card>
          <CardBody className="text-center py-8">
            <p className="text-red-400">კლიენტი ვერ მოიძებნა</p>
            <Button onClick={() => router.push('/sales/customers')} className="mt-4">
              ← უკან
            </Button>
          </CardBody>
        </Card>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout 
      title={customer.name} 
      breadcrumb={`მთავარი / გაყიდვები / კლიენტები / ${customer.name}`}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/sales/customers')}>
            ← უკან
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{TYPE_ICONS[customer.type] || '👤'}</span>
              <h1 className="text-2xl font-display font-bold">{customer.name}</h1>
              <span className={`px-2 py-0.5 rounded text-xs ${customer.isActive ? 'bg-green-400/20 text-green-400' : 'bg-gray-400/20 text-gray-400'}`}>
                {customer.isActive ? 'აქტიური' : 'არააქტიური'}
              </span>
            </div>
            <p className="text-text-muted text-sm mt-1">
              {customer.city} {customer.address && `• ${customer.address}`}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <CardBody className="p-4 text-center">
            <p className="text-3xl font-bold text-purple-400">{kegs.length}</p>
            <p className="text-xs text-text-muted">🛢️ კეგი კლიენტთან</p>
          </CardBody>
        </Card>
        <Card className={overdueKegs.length > 0 ? 'ring-2 ring-red-500' : ''}>
          <CardBody className="p-4 text-center">
            <p className="text-3xl font-bold text-red-400">{overdueKegs.length}</p>
            <p className="text-xs text-text-muted">🔴 ვადაგადაცილებული</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-4 text-center">
            <p className="text-3xl font-bold text-blue-400">{customer.totalOrders}</p>
            <p className="text-xs text-text-muted">📦 შეკვეთა</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-4 text-center">
            <p className="text-3xl font-bold text-copper-light">{formatCurrency(customer.totalRevenue)}</p>
            <p className="text-xs text-text-muted">💰 შემოსავალი</p>
          </CardBody>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('kegs')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'kegs' 
              ? 'bg-copper text-white' 
              : 'bg-bg-card border border-border hover:border-copper'
          }`}
        >
          🛢️ კეგები ({kegs.length})
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'orders' 
              ? 'bg-copper text-white' 
              : 'bg-bg-card border border-border hover:border-copper'
          }`}
        >
          📦 შეკვეთები ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'settings' 
              ? 'bg-copper text-white' 
              : 'bg-bg-card border border-border hover:border-copper'
          }`}
        >
          ⚙️ პარამეტრები
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'kegs' && (
        <Card>
          <CardHeader>🛢️ კლიენტთან მყოფი კეგები ({kegs.length})</CardHeader>
          <CardBody noPadding>
            {kegs.length === 0 ? (
              <div className="text-center py-8 text-text-muted">
                კლიენტს კეგები არ აქვს
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-bg-tertiary border-b border-border text-left text-xs text-text-muted">
                    <th className="px-4 py-3">კეგი #</th>
                    <th className="px-4 py-3">ზომა</th>
                    <th className="px-4 py-3">პროდუქტი</th>
                    <th className="px-4 py-3">გაგზავნის თარიღი</th>
                    <th className="px-4 py-3">დღეები</th>
                    <th className="px-4 py-3">ვადა</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {kegs.map(keg => (
                    <tr 
                      key={keg.id} 
                      className={`border-b border-border/50 hover:bg-bg-tertiary/50 ${keg.isOverdue ? 'bg-red-500/5' : ''}`}
                    >
                      <td className="px-4 py-3 font-mono text-copper-light">{keg.kegNumber}</td>
                      <td className="px-4 py-3">{keg.size}L</td>
                      <td className="px-4 py-3 text-sm">{keg.productName || '-'}</td>
                      <td className="px-4 py-3 text-sm text-text-muted">
                        {keg.sentAt ? formatDate(new Date(keg.sentAt)) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-mono ${keg.isOverdue ? 'text-red-400 font-bold' : ''}`}>
                          {keg.daysOut !== null ? `${keg.daysOut} დღე` : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {keg.isOverdue ? (
                          <span className="text-red-400 text-xs">🔴 ვადაგადაცილებული</span>
                        ) : (
                          <span className="text-green-400 text-xs">✓ ვადაში</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => { setSelectedKeg(keg); setShowReturnModal(true); }}
                        >
                          დაბრუნება
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      )}

      {activeTab === 'orders' && (
        <Card>
          <CardHeader>📦 შეკვეთების ისტორია ({orders.length})</CardHeader>
          <CardBody noPadding>
            {orders.length === 0 ? (
              <div className="text-center py-8 text-text-muted">
                შეკვეთები არ მოიძებნა
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-bg-tertiary border-b border-border text-left text-xs text-text-muted">
                    <th className="px-4 py-3">შეკვეთა #</th>
                    <th className="px-4 py-3">თარიღი</th>
                    <th className="px-4 py-3">პროდუქტები</th>
                    <th className="px-4 py-3">თანხა</th>
                    <th className="px-4 py-3">სტატუსი</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order.id} className="border-b border-border/50 hover:bg-bg-tertiary/50">
                      <td className="px-4 py-3 font-mono text-copper-light">{order.orderNumber}</td>
                      <td className="px-4 py-3 text-sm text-text-muted">
                        {formatDate(new Date(order.orderedAt))}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {order.items?.map(i => `${i.quantity}x ${i.productName}`).join(', ') || '-'}
                      </td>
                      <td className="px-4 py-3 font-mono">{formatCurrency(order.totalAmount)}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded text-xs bg-bg-tertiary">{order.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/sales/orders/${order.id}`)}
                        >
                          →
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      )}

      {activeTab === 'settings' && (
        <div className="grid grid-cols-2 gap-6">
          {/* Contact Info */}
          <Card>
            <CardHeader>📋 საკონტაქტო ინფორმაცია</CardHeader>
            <CardBody className="space-y-3">
              <div className="flex justify-between">
                <span className="text-text-muted">ტელეფონი:</span>
                <span>{customer.phone || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">ელ. ფოსტა:</span>
                <span>{customer.email || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">ქალაქი:</span>
                <span>{customer.city || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">მისამართი:</span>
                <span>{customer.address || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">საიდ. კოდი:</span>
                <span>{customer.taxId || '-'}</span>
              </div>
            </CardBody>
          </Card>

          {/* Keg Settings */}
          <Card>
            <CardHeader>🛢️ კეგების პარამეტრები</CardHeader>
            <CardBody className="space-y-4">
              <div>
                <label className="block text-sm text-text-muted mb-2">
                  კეგის დაბრუნების ვადა (დღეები)
                </label>
                {editingReturnDays ? (
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      max="90"
                      value={newReturnDays}
                      onChange={(e) => setNewReturnDays(parseInt(e.target.value) || 14)}
                      className="flex-1 px-3 py-2 bg-bg-tertiary border border-border rounded-lg outline-none focus:border-copper"
                    />
                    <Button variant="primary" size="sm" onClick={handleUpdateReturnDays}>
                      შენახვა
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditingReturnDays(false)}>
                      გაუქმება
                    </Button>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-copper-light">{customer.kegReturnDays} დღე</span>
                    <Button variant="secondary" size="sm" onClick={() => setEditingReturnDays(true)}>
                      შეცვლა
                    </Button>
                  </div>
                )}
                <p className="text-xs text-text-muted mt-2">
                  თუ კეგი არ დაბრუნდა {customer.kegReturnDays} დღეში, ითვლება ვადაგადაცილებულად
                </p>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Return Modal */}
      {showReturnModal && selectedKeg && (
        <KegReturnModal
          keg={selectedKeg}
          onClose={() => { setShowReturnModal(false); setSelectedKeg(null); }}
          onConfirm={handleKegReturn}
        />
      )}
    </DashboardLayout>
  )
}

// ═══════════════════════════════════════════════════════════
// Keg Return Modal (same as in /sales/kegs)
// ═══════════════════════════════════════════════════════════
function KegReturnModal({ 
  keg, 
  onClose, 
  onConfirm 
}: { 
  keg: Keg
  onClose: () => void
  onConfirm: (kegId: string, condition: string, notes: string) => void
}) {
  const [condition, setCondition] = useState<string>('GOOD')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    await onConfirm(keg.id, condition, notes)
    setIsSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-bg-secondary border border-border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center">
          <h2 className="text-xl font-display font-semibold">🛢️ კეგის დაბრუნება</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-bg-card border border-border flex items-center justify-center hover:border-danger hover:text-danger">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-4 bg-bg-card border border-border rounded-xl">
            <p className="font-mono text-copper-light text-lg">{keg.kegNumber}</p>
            <p className="text-sm text-text-muted">{keg.size}L • {keg.productName || 'ცარიელი'}</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-3">მდგომარეობა *</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'GOOD', icon: '✓', label: 'კარგი', color: 'green' },
                { value: 'NEEDS_CLEANING', icon: '🧹', label: 'საწმენდი', color: 'amber' },
                { value: 'DAMAGED', icon: '⚠️', label: 'დაზიანებული', color: 'red' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setCondition(opt.value)}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    condition === opt.value 
                      ? `border-${opt.color}-500 bg-${opt.color}-500/10 text-${opt.color}-400` 
                      : 'border-border bg-bg-card hover:border-copper/50'
                  }`}
                >
                  <span className="text-2xl block mb-1">{opt.icon}</span>
                  <span className="text-xs">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">შენიშვნა</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="დამატებითი ინფორმაცია..."
              className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg outline-none focus:border-copper resize-none"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>გაუქმება</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'დაბრუნება...' : 'დაბრუნების დადასტურება'}
          </Button>
        </div>
      </div>
    </div>
  )
}


