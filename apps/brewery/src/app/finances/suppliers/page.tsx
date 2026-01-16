'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui'
import { StatCard } from '@/components/reports/StatCard'
import { formatCurrency, formatDate } from '@/lib/utils'

interface Supplier {
  id: string
  name: string
  category: string
  categoryName: string
  contactPerson: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  taxId: string | null
  bankAccount: string | null
  notes: string | null
  isActive: boolean
  totalPurchases: number
  lastPurchaseDate: string | null
  createdAt: string
}

interface SupplierStats {
  total: number
  active: number
  totalSpent: number
  categories: Record<string, number>
}

const categoryConfig: Record<string, { name: string; icon: string; color: string }> = {
  ingredients: { name: 'ინგრედიენტები', icon: '🌾', color: 'bg-amber-400/20 text-amber-400' },
  packaging: { name: 'შეფუთვა', icon: '📦', color: 'bg-blue-400/20 text-blue-400' },
  equipment: { name: 'აღჭურვილობა', icon: '⚙️', color: 'bg-purple-400/20 text-purple-400' },
  services: { name: 'მომსახურება', icon: '🔧', color: 'bg-green-400/20 text-green-400' },
  utilities: { name: 'კომუნალური', icon: '💡', color: 'bg-yellow-400/20 text-yellow-400' },
  other: { name: 'სხვა', icon: '📋', color: 'bg-gray-400/20 text-gray-400' },
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [stats, setStats] = useState<SupplierStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (categoryFilter !== 'all') params.append('category', categoryFilter)

      const res = await fetch(`/api/finances/suppliers?${params}`)
      if (!res.ok) throw new Error('Failed to fetch suppliers')
      
      const data = await res.json()
      setSuppliers(data.suppliers || [])
      setStats(data.stats)

    } catch (err) {
      console.error('Suppliers fetch error:', err)
      setError('მონაცემების ჩატვირთვა ვერ მოხერხდა')
    } finally {
      setLoading(false)
    }
  }, [categoryFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Filter suppliers
  const filteredSuppliers = suppliers.filter(s => {
    if (!showInactive && !s.isActive) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return s.name.toLowerCase().includes(query) || 
             s.contactPerson?.toLowerCase().includes(query) ||
             s.phone?.includes(query) ||
             s.email?.toLowerCase().includes(query)
    }
    return true
  })

  // Handlers
  const handleCreateSupplier = async (data: any) => {
    try {
      const res = await fetch('/api/finances/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) throw new Error('Failed to create supplier')

      setIsModalOpen(false)
      setSelectedSupplier(null)
      fetchData()
    } catch (err) {
      console.error('Create supplier error:', err)
      alert('მომწოდებლის შექმნა ვერ მოხერხდა')
    }
  }

  const handleUpdateSupplier = async (data: any) => {
    if (!selectedSupplier) return

    try {
      const res = await fetch(`/api/finances/suppliers/${selectedSupplier.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) throw new Error('Failed to update supplier')

      setIsModalOpen(false)
      setSelectedSupplier(null)
      fetchData()
    } catch (err) {
      console.error('Update supplier error:', err)
      alert('მომწოდებლის განახლება ვერ მოხერხდა')
    }
  }

  const handleDeleteSupplier = async () => {
    if (!selectedSupplier) return

    try {
      const res = await fetch(`/api/finances/suppliers/${selectedSupplier.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to delete supplier')
      }

      setIsDeleteModalOpen(false)
      setSelectedSupplier(null)
      fetchData()
    } catch (err: any) {
      console.error('Delete supplier error:', err)
      alert(err.message || 'მომწოდებლის წაშლა ვერ მოხერხდა')
    }
  }

  const handleToggleStatus = async (supplier: Supplier) => {
    try {
      const res = await fetch(`/api/finances/suppliers/${supplier.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !supplier.isActive }),
      })

      if (!res.ok) throw new Error('Failed to update supplier')
      fetchData()
    } catch (err) {
      console.error('Toggle status error:', err)
    }
  }

  const openEditModal = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setIsModalOpen(true)
  }

  const openCreateModal = () => {
    setSelectedSupplier(null)
    setIsModalOpen(true)
  }

  if (loading) {
    return (
      <DashboardLayout title="👥 მომწოდებლები" breadcrumb="მთავარი / ფინანსები / მომწოდებლები">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-copper"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="👥 მომწოდებლები" breadcrumb="მთავარი / ფინანსები / მომწოდებლები">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Link href="/finances">
              <Button variant="ghost" size="sm">← უკან</Button>
            </Link>
            <h2 className="text-2xl font-bold text-text-primary">მომწოდებლები</h2>
          </div>
          
          <Button onClick={openCreateModal}>
            + ახალი მომწოდებელი
          </Button>
        </div>

        {/* Stats Cards - Compact */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-bg-card border border-border rounded-xl p-3">
            <div className="text-xs text-text-muted mb-1">👥 სულ</div>
            <div className="text-xl font-bold text-copper">{stats?.total || 0}</div>
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-3">
            <div className="text-xs text-text-muted mb-1">✅ აქტიური</div>
            <div className="text-xl font-bold text-green-400">{stats?.active || 0}</div>
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-3">
            <div className="text-xs text-text-muted mb-1">💰 შესყიდვები</div>
            <div className="text-xl font-bold text-text-primary">{formatCurrency(stats?.totalSpent || 0)}</div>
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-3">
            <div className="text-xs text-text-muted mb-1">📂 კატეგორიები</div>
            <div className="text-xl font-bold text-text-primary">{Object.keys(stats?.categories || {}).length}</div>
          </div>
        </div>

        {/* Filters - After Cards */}
        <div className="flex flex-wrap gap-3 mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 ძებნა..."
            className="px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary text-sm flex-1 min-w-[200px]"
          />
          
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary text-sm"
          >
            <option value="all">ყველა კატეგორია</option>
            {Object.entries(categoryConfig).map(([key, config]) => (
              <option key={key} value={key}>{config.icon} {config.name}</option>
            ))}
          </select>
          
          <label className="flex items-center gap-2 px-3 py-2 bg-bg-tertiary border border-border rounded-lg cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-border"
            />
            არააქტიურების ჩვენება
          </label>
        </div>

        {/* Suppliers Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-text-primary">მომწოდებლების სია</h3>
              <span className="text-sm text-text-muted">{filteredSuppliers.length} მომწოდებელი</span>
            </div>
          </CardHeader>
          <CardBody>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">მომწოდებელი</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">კატეგორია</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">კონტაქტი</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-text-primary">შესყიდვები</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">ბოლო შესყიდვა</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-text-primary">სტატუსი</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-text-primary">მოქმედება</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSuppliers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-text-muted">
                        მომწოდებლები არ მოიძებნა
                      </td>
                    </tr>
                  ) : (
                    filteredSuppliers.map((supplier) => {
                      const catConfig = categoryConfig[supplier.category] || categoryConfig.other
                      return (
                        <tr key={supplier.id} className="border-b border-border hover:bg-bg-tertiary/50">
                          <td className="py-3 px-4">
                            <div className="font-medium text-text-primary">{supplier.name}</div>
                            {supplier.taxId && (
                              <div className="text-xs text-text-muted">საიდ: {supplier.taxId}</div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${catConfig.color}`}>
                              {catConfig.icon} {catConfig.name}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {supplier.contactPerson ? (
                              <div className="text-text-primary text-sm">{supplier.contactPerson}</div>
                            ) : supplier.email ? (
                              <div className="text-text-primary text-sm">{supplier.email}</div>
                            ) : null}
                            {supplier.phone && (
                              <div className="text-text-muted text-xs">📞 {supplier.phone}</div>
                            )}
                            {supplier.email && supplier.contactPerson !== supplier.email && (
                              <div className="text-text-muted text-xs">✉️ {supplier.email}</div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-text-primary">
                            {formatCurrency(supplier.totalPurchases)}
                          </td>
                          <td className="py-3 px-4 text-text-muted text-sm">
                            {supplier.lastPurchaseDate 
                              ? formatDate(new Date(supplier.lastPurchaseDate))
                              : '-'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleToggleStatus(supplier)}
                              className={`px-2 py-1 rounded text-xs font-medium cursor-pointer ${
                                supplier.isActive 
                                  ? 'bg-green-400/20 text-green-400' 
                                  : 'bg-gray-400/20 text-gray-400'
                              }`}
                            >
                              {supplier.isActive ? '✓ აქტიური' : '○ არააქტიური'}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button size="sm" variant="ghost" onClick={() => openEditModal(supplier)}>
                                ✏️
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => {
                                  setSelectedSupplier(supplier)
                                  setIsDeleteModalOpen(true)
                                }}
                                className="text-red-400"
                              >
                                🗑️
                              </Button>
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

        {/* Supplier Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-border">
                <h2 className="text-xl font-bold text-text-primary">
                  {selectedSupplier ? '✏️ მომწოდებლის რედაქტირება' : '➕ ახალი მომწოდებელი'}
                </h2>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                const contactPerson = formData.get('contactPerson')?.toString().trim() || null
                const notes = formData.get('notes')?.toString().trim() || null
                
                // Combine contactPerson into notes if provided (since Supplier model doesn't have contactPerson field)
                const finalNotes = contactPerson && notes 
                  ? `საკონტაქტო პირი: ${contactPerson}\n${notes}`
                  : contactPerson 
                    ? `საკონტაქტო პირი: ${contactPerson}`
                    : notes
                
                const data = {
                  name: formData.get('name'),
                  category: formData.get('category'),
                  phone: formData.get('phone') || null,
                  email: formData.get('email') || null,
                  address: formData.get('address') || null,
                  city: formData.get('city') || null,
                  taxId: formData.get('taxId') || null,
                  bankAccount: formData.get('bankAccount') || null,
                  notes: finalNotes,
                }
                if (selectedSupplier) {
                  handleUpdateSupplier(data)
                } else {
                  handleCreateSupplier(data)
                }
              }} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">სახელი *</label>
                  <input
                    name="name"
                    type="text"
                    defaultValue={selectedSupplier?.name || ''}
                    required
                    className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">კატეგორია *</label>
                  <select
                    name="category"
                    defaultValue={selectedSupplier?.category || 'ingredients'}
                    required
                    className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                  >
                    {Object.entries(categoryConfig).map(([key, config]) => (
                      <option key={key} value={key}>{config.icon} {config.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">საკონტაქტო პირი</label>
                    <input
                      name="contactPerson"
                      type="text"
                      defaultValue={selectedSupplier?.contactPerson || ''}
                      placeholder="საკონტაქტო პირის სახელი"
                      className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">ტელეფონი</label>
                    <input
                      name="phone"
                      type="tel"
                      defaultValue={selectedSupplier?.phone || ''}
                      className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">ელ-ფოსტა</label>
                  <input
                    name="email"
                    type="email"
                    defaultValue={selectedSupplier?.email || ''}
                    className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">მისამართი</label>
                    <input
                      name="address"
                      type="text"
                      defaultValue={selectedSupplier?.address || ''}
                      className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">ქალაქი</label>
                    <input
                      name="city"
                      type="text"
                      defaultValue={selectedSupplier?.city || ''}
                      placeholder="ქალაქი"
                      className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">საიდ. კოდი</label>
                    <input
                      name="taxId"
                      type="text"
                      defaultValue={selectedSupplier?.taxId || ''}
                      className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">საბანკო ა/ნ</label>
                    <input
                      name="bankAccount"
                      type="text"
                      defaultValue={selectedSupplier?.bankAccount || ''}
                      className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary font-mono text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">შენიშვნა</label>
                  <textarea
                    name="notes"
                    defaultValue={
                      selectedSupplier?.notes 
                        ? selectedSupplier.notes.replace(/^საკონტაქტო პირი:[^\n]+\n?/, '').trim() || ''
                        : ''
                    }
                    rows={2}
                    placeholder="შენიშვნა"
                    className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                    გაუქმება
                  </Button>
                  <Button type="submit">
                    {selectedSupplier ? '💾 შენახვა' : '➕ დამატება'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {isDeleteModalOpen && selectedSupplier && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-bg-card border border-border rounded-2xl w-full max-w-md p-6">
              <h2 className="text-xl font-bold text-text-primary mb-4">⚠️ მომწოდებლის წაშლა</h2>
              <p className="text-text-muted mb-6">
                ნამდვილად გსურთ <strong className="text-text-primary">{selectedSupplier.name}</strong>-ის წაშლა?
                {selectedSupplier.totalPurchases > 0 && (
                  <>
                    <br /><br />
                    <span className="text-amber-400 text-sm">
                      ⚠️ ამ მომწოდებელს აქვს {formatCurrency(selectedSupplier.totalPurchases)} შესყიდვა
                    </span>
                  </>
                )}
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>
                  გაუქმება
                </Button>
                <Button variant="danger" onClick={handleDeleteSupplier}>
                  🗑️ წაშლა
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

