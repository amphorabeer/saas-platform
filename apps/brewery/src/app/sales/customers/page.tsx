'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout'
import { Card, CardHeader, CardBody, Button } from '@/components/ui'
import { formatDate, formatCurrency } from '@/lib/utils'

interface Customer {
  id: string
  name: string
  type: string
  typeName: string
  city: string
  address: string
  phone: string
  email: string
  taxId?: string
  isActive: boolean
  totalOrders: number
  totalRevenue: number
  createdAt: Date
}

interface Stats {
  total: number
  active: number
}

export default function CustomersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromFinances = searchParams.get('from') === 'finances'
  
  // Back URL based on where user came from
  const backUrl = fromFinances ? '/finances' : '/sales'
  
  const [customers, setCustomers] = useState<Customer[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/customers')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch customers')
      }

      setCustomers(data.customers || [])
      setStats(data.stats)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredCustomers = customers.filter(customer => {
    if (typeFilter !== 'all' && customer.type !== typeFilter) return false
    if (searchQuery && !customer.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !customer.email?.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      RESTAURANT: '🍽️',
      BAR: '🍺',
      RETAIL: '🏪',
      WHOLESALE: '📦',
      DISTRIBUTOR: '🚚',
      EXPORT: '🌍',
    }
    return icons[type] || '👤'
  }

  const handleAddCustomer = async (customerData: any) => {
    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create customer')
      }

      setShowAddModal(false)
      fetchCustomers()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleToggleActive = async (customerId: string, isActive: boolean) => {
    try {
      const response = await fetch('/api/customers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: customerId, isActive: !isActive }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error)
      }

      fetchCustomers()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleUpdateCustomer = async (data: any) => {
    if (!selectedCustomer) return
    
    try {
      const response = await fetch(`/api/customers/${selectedCustomer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update customer')
      }
      
      setIsEditModalOpen(false)
      setSelectedCustomer(null)
      fetchCustomers()
      alert('✅ კლიენტი განახლებულია!')
    } catch (err: any) {
      console.error('Update customer error:', err)
      alert(err.message || 'კლიენტის განახლება ვერ მოხერხდა')
    }
  }

  const handleDeleteCustomer = async () => {
    if (!selectedCustomer) return
    
    try {
      const response = await fetch(`/api/customers/${selectedCustomer.id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete customer')
      }
      
      setIsDeleteModalOpen(false)
      setSelectedCustomer(null)
      fetchCustomers()
      alert('✅ კლიენტი წაშლილია')
    } catch (err: any) {
      console.error('Delete customer error:', err)
      alert(err.message || 'კლიენტის წაშლა ვერ მოხერხდა')
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout title="კლიენტები" breadcrumb="იტვირთება...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-copper" />
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout title="კლიენტები" breadcrumb="შეცდომა">
        <Card>
          <CardBody>
            <p className="text-red-400">{error}</p>
            <Button onClick={fetchCustomers} className="mt-4">თავიდან ცდა</Button>
          </CardBody>
        </Card>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout 
      title="კლიენტები" 
      breadcrumb={`სულ ${stats?.total || 0} კლიენტი`}
    >
      {/* Header with Back Button */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push(backUrl)}>
            ← უკან
          </Button>
          <h2 className="text-xl font-semibold">კლიენტების მართვა</h2>
        </div>
        <Button variant="primary" onClick={() => setShowAddModal(true)}>
          + ახალი კლიენტი
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardBody className="text-center py-4">
            <p className="text-3xl font-bold text-copper-light">{stats?.total || 0}</p>
            <p className="text-sm text-text-muted">სულ კლიენტი</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center py-4">
            <p className="text-3xl font-bold text-green-400">{stats?.active || 0}</p>
            <p className="text-sm text-text-muted">აქტიური</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center py-4">
            <p className="text-3xl font-bold text-blue-400">
              {formatCurrency(customers.reduce((sum, c) => sum + (c.totalRevenue || 0), 0))}
            </p>
            <p className="text-sm text-text-muted">ჯამური შემოსავალი</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center py-4">
            <p className="text-3xl font-bold text-amber-400">
              {customers.reduce((sum, c) => sum + (c.totalOrders || 0), 0)}
            </p>
            <p className="text-sm text-text-muted">სულ შეკვეთა</p>
          </CardBody>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardBody className="flex flex-wrap gap-4 items-center">
          <input
            type="text"
            placeholder="🔍 ძებნა სახელით ან ელფოსტით..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 min-w-64 px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-sm outline-none focus:border-copper"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-sm outline-none focus:border-copper"
          >
            <option value="all">ყველა ტიპი</option>
            <option value="RESTAURANT">🍽️ რესტორანი</option>
            <option value="BAR">🍺 ბარი</option>
            <option value="RETAIL">🏪 საცალო</option>
            <option value="WHOLESALE">📦 საბითუმო</option>
            <option value="DISTRIBUTOR">🚚 დისტრიბუტორი</option>
            <option value="EXPORT">🌍 ექსპორტი</option>
          </select>
        </CardBody>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <span className="text-lg font-semibold">კლიენტების სია</span>
          <span className="text-sm text-text-muted ml-2">({filteredCustomers.length})</span>
        </CardHeader>
        <CardBody className="p-0">
          {filteredCustomers.length === 0 ? (
            <p className="text-center text-text-muted py-8">კლიენტები არ მოიძებნა</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-sm text-text-muted">
                  <th className="px-4 py-3">კლიენტი</th>
                  <th className="px-4 py-3">ტიპი</th>
                  <th className="px-4 py-3">კონტაქტი</th>
                  <th className="px-4 py-3 text-right">შეკვეთები</th>
                  <th className="px-4 py-3 text-right">შემოსავალი</th>
                  <th className="px-4 py-3">სტატუსი</th>
                  <th className="px-4 py-3 text-center">მოქმედება</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr 
                    key={customer.id} 
                    className="border-b border-border/50 hover:bg-bg-tertiary/50"
                  >
                    <td 
                      className="px-4 py-3 cursor-pointer"
                      onClick={() => router.push(`/sales/customers/${customer.id}`)}
                    >
                      <p className="font-medium">{customer.name}</p>
                      <p className="text-xs text-text-muted">{customer.city} • {customer.address}</p>
                    </td>
                    <td 
                      className="px-4 py-3 cursor-pointer"
                      onClick={() => router.push(`/sales/customers/${customer.id}`)}
                    >
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-bg-tertiary rounded text-sm">
                        {getTypeIcon(customer.type)} {customer.typeName}
                      </span>
                    </td>
                    <td 
                      className="px-4 py-3 text-sm cursor-pointer"
                      onClick={() => router.push(`/sales/customers/${customer.id}`)}
                    >
                      <p>{customer.phone || '-'}</p>
                      <p className="text-text-muted">{customer.email || '-'}</p>
                    </td>
                    <td 
                      className="px-4 py-3 text-right font-mono cursor-pointer"
                      onClick={() => router.push(`/sales/customers/${customer.id}`)}
                    >
                      {customer.totalOrders || 0}
                    </td>
                    <td 
                      className="px-4 py-3 text-right font-mono text-copper-light cursor-pointer"
                      onClick={() => router.push(`/sales/customers/${customer.id}`)}
                    >
                      {formatCurrency(customer.totalRevenue || 0)}
                    </td>
                    <td 
                      className="px-4 py-3 cursor-pointer"
                      onClick={() => router.push(`/sales/customers/${customer.id}`)}
                    >
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                        customer.isActive 
                          ? 'bg-green-400/20 text-green-400' 
                          : 'bg-gray-400/20 text-gray-400'
                      }`}>
                        {customer.isActive ? '✓ აქტიური' : '✗ არააქტიური'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedCustomer(customer)
                            setIsEditModalOpen(true)
                          }}
                          title="რედაქტირება"
                        >
                          ✏️
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedCustomer(customer)
                            setIsDeleteModalOpen(true)
                          }}
                          title="წაშლა"
                          className="text-red-400 hover:text-red-300"
                        >
                          🗑️
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      {/* Add Customer Modal */}
      {showAddModal && (
        <AddCustomerModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddCustomer}
        />
      )}

      {/* Edit Customer Modal */}
      {isEditModalOpen && selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-bg-card border border-border rounded-2xl w-full max-w-lg">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-bold text-text-primary">✏️ კლიენტის რედაქტირება</h2>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              handleUpdateCustomer({
                name: formData.get('name'),
                type: formData.get('type'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                address: formData.get('address'),
                city: formData.get('city'),
                taxId: formData.get('taxId'),
              })
            }} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">სახელი *</label>
                <input
                  name="name"
                  type="text"
                  defaultValue={selectedCustomer.name}
                  required
                  className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">ტიპი</label>
                <select
                  name="type"
                  defaultValue={selectedCustomer.type}
                  className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                >
                  <option value="RETAIL">საცალო</option>
                  <option value="WHOLESALE">საბითუმო</option>
                  <option value="DISTRIBUTOR">დისტრიბუტორი</option>
                  <option value="RESTAURANT">რესტორანი</option>
                  <option value="BAR">ბარი</option>
                  <option value="EXPORT">ექსპორტი</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">ელ-ფოსტა</label>
                  <input
                    name="email"
                    type="email"
                    defaultValue={selectedCustomer.email || ''}
                    className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">ტელეფონი</label>
                  <input
                    name="phone"
                    type="tel"
                    defaultValue={selectedCustomer.phone || ''}
                    className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">მისამართი</label>
                <input
                  name="address"
                  type="text"
                  defaultValue={selectedCustomer.address || ''}
                  className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">ქალაქი</label>
                  <input
                    name="city"
                    type="text"
                    defaultValue={selectedCustomer.city || ''}
                    className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">საიდ. კოდი</label>
                  <input
                    name="taxId"
                    type="text"
                    defaultValue={selectedCustomer.taxId || ''}
                    className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                  />
                </div>
              </div>
              <div className="flex justify-between pt-4">
                <Button 
                  type="button" 
                  variant="danger" 
                  onClick={() => {
                    setIsEditModalOpen(false)
                    setIsDeleteModalOpen(true)
                  }}
                >
                  🗑️ წაშლა
                </Button>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" onClick={() => setIsEditModalOpen(false)}>
                    გაუქმება
                  </Button>
                  <Button type="submit">
                    💾 შენახვა
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-bg-card border border-border rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-text-primary mb-4">⚠️ კლიენტის წაშლა</h2>
            <p className="text-text-muted mb-6">
              ნამდვილად გსურთ <strong className="text-text-primary">{selectedCustomer.name}</strong>-ის წაშლა?
              <br /><br />
              <span className="text-red-400 text-sm">ეს მოქმედება შეუქცევადია!</span>
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>
                გაუქმება
              </Button>
              <Button variant="danger" onClick={handleDeleteCustomer}>
                🗑️ წაშლა
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

// ═══════════════════════════════════════════════════════════
// Add Customer Modal Component
// ═══════════════════════════════════════════════════════════
function AddCustomerModal({ 
  onClose, 
  onSubmit 
}: { 
  onClose: () => void
  onSubmit: (data: any) => void 
}) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'RESTAURANT',
    email: '',
    phone: '',
    address: '',
    city: 'თბილისი',
    taxId: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!formData.name) {
      alert('სახელი სავალდებულოა')
      return
    }
    setIsSubmitting(true)
    await onSubmit(formData)
    setIsSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-bg-secondary border border-border rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center">
          <h2 className="text-xl font-display font-semibold">👤 ახალი კლიენტი</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-bg-card border border-border flex items-center justify-center hover:border-danger hover:text-danger">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">სახელი *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg outline-none focus:border-copper"
              placeholder="კომპანიის ან პირის სახელი"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">ტიპი</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg outline-none focus:border-copper"
              >
                <option value="RESTAURANT">🍽️ რესტორანი</option>
                <option value="BAR">🍺 ბარი</option>
                <option value="RETAIL">🏪 საცალო</option>
                <option value="WHOLESALE">📦 საბითუმო</option>
                <option value="DISTRIBUTOR">🚚 დისტრიბუტორი</option>
                <option value="EXPORT">🌍 ექსპორტი</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">ქალაქი</label>
              <select
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg outline-none focus:border-copper"
              >
                <option value="თბილისი">თბილისი</option>
                <option value="ბათუმი">ბათუმი</option>
                <option value="ქუთაისი">ქუთაისი</option>
                <option value="რუსთავი">რუსთავი</option>
                <option value="სხვა">სხვა</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">მისამართი</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg outline-none focus:border-copper"
              placeholder="ქუჩა, ნომერი"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">ტელეფონი</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg outline-none focus:border-copper"
                placeholder="+995 5XX XXX XXX"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">ელ. ფოსტა</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg outline-none focus:border-copper"
                placeholder="email@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">საიდენტიფიკაციო კოდი</label>
            <input
              type="text"
              value={formData.taxId}
              onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
              className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg outline-none focus:border-copper"
              placeholder="XXXXXXXXXXX"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>გაუქმება</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'იქმნება...' : 'შექმნა'}
          </Button>
        </div>
      </div>
    </div>
  )
}