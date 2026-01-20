'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardBody, Button, ProgressBar } from '@/components/ui'

interface CleaningSupply {
  id: string
  name: string
  sku: string
  currentStock: number
  minStock: number
  unit: string
  supplier: string
  pricePerUnit: number
  location?: string
  lastUpdated?: Date
}

interface Supplier {
  id: string
  name: string
  category: string | null
}

type StockStatus = 'ok' | 'low' | 'critical' | 'out'

const getStockStatus = (current: number, min: number): StockStatus => {
  if (current === 0) return 'out'
  if (current < min * 0.5) return 'critical'
  if (current < min) return 'low'
  return 'ok'
}

const STATUS_CONFIG: Record<StockStatus, { label: string; color: string; bgColor: string }> = {
  ok: { label: 'ნორმალური', color: 'text-green-400', bgColor: 'bg-green-400/20' },
  low: { label: 'დაბალი', color: 'text-amber-400', bgColor: 'bg-amber-400/20' },
  critical: { label: 'კრიტიკული', color: 'text-orange-400', bgColor: 'bg-orange-400/20' },
  out: { label: 'ამოწურული', color: 'text-red-400', bgColor: 'bg-red-400/20' },
}

const paymentMethods = [
  { value: 'BANK_TRANSFER', label: '🏦 გადარიცხვა' },
  { value: 'CASH', label: '💵 ნაღდი' },
  { value: 'CARD', label: '💳 ბარათი' },
  { value: 'CHECK', label: '📝 ჩეკი' },
]

const getCleaningIcon = (name: string): string => {
  const lowerName = name.toLowerCase()
  if (lowerName.includes('კაუსტიკ') || lowerName.includes('caustic') || lowerName.includes('naoh')) return '🧴'
  if (lowerName.includes('paa') || lowerName.includes('სანიტაიზერ') || lowerName.includes('sanitiz')) return '🧪'
  if (lowerName.includes('acid') || lowerName.includes('მჟავა')) return '⚗️'
  if (lowerName.includes('detergent') || lowerName.includes('სარეცხი')) return '🫧'
  if (lowerName.includes('rinse') || lowerName.includes('ჩამრეცხი')) return '💧'
  return '🧹'
}

export function CleaningSuppliesSection() {
  const router = useRouter()
  const [supplies, setSupplies] = useState<CleaningSupply[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingSupply, setEditingSupply] = useState<CleaningSupply | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    currentStock: '',
    minStock: '',
    unit: 'კგ',
    supplier: '',
    pricePerUnit: '',
    // Expense fields
    supplierId: '',
    invoiceNumber: '',
    createExpense: true,
    isPaid: false,
    paymentMethod: 'BANK_TRANSFER',
  })

  const fetchSupplies = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/inventory/cleaning')
      if (response.ok) {
        const data = await response.json()
        const transformed = (data.supplies || data || []).map((item: any) => ({
          id: item.id,
          name: item.name,
          sku: item.sku || '',
          currentStock: Number(item.currentStock || item.cachedBalance || 0),
          minStock: Number(item.minStock || item.reorderPoint || 0),
          unit: item.unit || 'კგ',
          supplier: item.supplier || '',
          pricePerUnit: Number(item.pricePerUnit || item.costPerUnit || 0),
          location: item.location,
          lastUpdated: item.updatedAt ? new Date(item.updatedAt) : undefined,
        }))
        setSupplies(transformed)
      }
    } catch (error) {
      console.error('Error fetching cleaning supplies:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchSuppliers = async () => {
    try {
      const res = await fetch('/api/finances/suppliers')
      if (res.ok) {
        const data = await res.json()
        setSuppliers(data.suppliers || [])
      }
    } catch (err) {
      console.error('Failed to fetch suppliers:', err)
    }
  }

  useEffect(() => {
    fetchSupplies()
    fetchSuppliers()
  }, [])

  const filteredSupplies = supplies.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.sku.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSave = async () => {
    try {
      const isEditing = !!editingSupply
      
      // Step 1: Create or update the inventory item
      const payload = {
        name: formData.name,
        sku: formData.sku || `CL-${Date.now()}`,
        currentStock: isEditing ? Number(formData.currentStock) || 0 : 0, // Start with 0 for new items
        minStock: Number(formData.minStock) || 0,
        unit: formData.unit,
        supplier: formData.supplier,
        pricePerUnit: Number(formData.pricePerUnit) || 0,
      }

      const url = isEditing 
        ? `/api/inventory/cleaning/${editingSupply.id}` 
        : '/api/inventory/cleaning'
      
      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        alert(`შეცდომა: ${error.error || 'შენახვა ვერ მოხერხდა'}`)
        return
      }

      const result = await response.json()
      
      // Step 2: If new item with quantity and expense enabled, create purchase
      if (!isEditing && Number(formData.currentStock) > 0) {
        const itemId = result.supply?.id || result.id
        
        if (itemId) {
          const purchaseRes = await fetch('/api/inventory/purchase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              itemId,
              quantity: Number(formData.currentStock),
              unitPrice: Number(formData.pricePerUnit) || 0,
              totalAmount: Number(formData.currentStock) * (Number(formData.pricePerUnit) || 0),
              supplierId: formData.supplierId || undefined,
              date: new Date().toISOString().split('T')[0],
              invoiceNumber: formData.invoiceNumber || undefined,
              notes: `საწყისი მარაგი: ${formData.name}`,
              createExpense: formData.createExpense,
              isPaid: formData.isPaid,
              paymentMethod: formData.paymentMethod,
            }),
          })

          if (!purchaseRes.ok) {
            alert('რეცხვის საშუალება დაემატა, მაგრამ შესყიდვის ჩაწერა ვერ მოხერხდა')
          }
        }
      }

      setShowAddModal(false)
      setEditingSupply(null)
      setFormData({ 
        name: '', sku: '', currentStock: '', minStock: '', unit: 'კგ', 
        supplier: '', pricePerUnit: '', supplierId: '', invoiceNumber: '',
        createExpense: true, isPaid: false, paymentMethod: 'BANK_TRANSFER'
      })
      fetchSupplies()
    } catch (error) {
      console.error('Error saving supply:', error)
      alert('შეცდომა შენახვისას')
    }
  }

  const handleEdit = (supply: CleaningSupply) => {
    setEditingSupply(supply)
    setFormData({
      name: supply.name,
      sku: supply.sku,
      currentStock: supply.currentStock.toString(),
      minStock: supply.minStock.toString(),
      unit: supply.unit,
      supplier: supply.supplier,
      pricePerUnit: supply.pricePerUnit.toString(),
      supplierId: '',
      invoiceNumber: '',
      createExpense: false, // No expense when editing
      isPaid: false,
      paymentMethod: 'BANK_TRANSFER',
    })
    setShowAddModal(true)
  }

  const handleViewDetail = (supply: CleaningSupply) => {
    router.push(`/inventory/${supply.id}`)
  }

  const handleCreateSupplier = async (newName: string, callback: (id: string) => void) => {
    if (!newName.trim()) return
    try {
      const response = await fetch('/api/finances/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), category: 'cleaning' }),
      })
      if (response.ok) {
        const data = await response.json()
        callback(data.supplier.id)
        fetchSuppliers()
        alert('✅ მომწოდებელი დაემატა!')
      } else {
        alert('მომწოდებლის დამატება ვერ მოხერხდა')
      }
    } catch (err) {
      alert('მომწოდებლის დამატება ვერ მოხერხდა')
    }
  }

  const totalAmount = Number(formData.currentStock) * (Number(formData.pricePerUnit) || 0)
  const isNewItem = !editingSupply

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="relative">
          <input
            type="text"
            placeholder="ძიება..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 bg-bg-tertiary border border-border rounded-lg text-sm w-64 focus:border-copper focus:outline-none"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">🔍</span>
        </div>
        <Button 
          variant="primary" 
          size="sm"
          onClick={() => {
            setEditingSupply(null)
            setFormData({ 
              name: '', sku: '', currentStock: '', minStock: '', unit: 'კგ', 
              supplier: '', pricePerUnit: '', supplierId: '', invoiceNumber: '',
              createExpense: true, isPaid: false, paymentMethod: 'BANK_TRANSFER'
            })
            setShowAddModal(true)
          }}
        >
          + დამატება
        </Button>
      </div>

      <Card>
        <CardHeader>
          <span>🧹 რეცხვის საშუალებები ({filteredSupplies.length})</span>
        </CardHeader>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-copper"></div>
              <span className="ml-3 text-text-muted">იტვირთება...</span>
            </div>
          ) : filteredSupplies.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-2">🧹</p>
              <p className="text-text-muted">რეცხვის საშუალებები არ მოიძებნა</p>
              <Button 
                variant="primary" 
                size="sm" 
                className="mt-4"
                onClick={() => setShowAddModal(true)}
              >
                + დაამატე პირველი
              </Button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-bg-tertiary text-left text-xs text-text-muted">
                  <th className="px-4 py-3">პროდუქტი</th>
                  <th className="px-4 py-3">მარაგი</th>
                  <th className="px-4 py-3">სტატუსი</th>
                  <th className="px-4 py-3">მომწოდებელი</th>
                  <th className="px-4 py-3">ფასი</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filteredSupplies.map(supply => {
                  const status = getStockStatus(supply.currentStock, supply.minStock)
                  const stockPercent = Math.min(100, (supply.currentStock / (supply.minStock * 2)) * 100)

                  return (
                    <tr 
                      key={supply.id} 
                      className="border-b border-border/50 hover:bg-bg-tertiary/50 cursor-pointer transition-colors"
                      onClick={() => handleViewDetail(supply)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{getCleaningIcon(supply.name)}</span>
                          <div>
                            <p className="font-medium">{supply.name}</p>
                            {supply.sku && (
                              <p className="text-xs text-text-muted font-mono">{supply.sku}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="w-32">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-mono">{supply.currentStock}</span>
                            <span className="text-text-muted">{supply.unit}</span>
                          </div>
                          <ProgressBar 
                            value={stockPercent} 
                            size="sm" 
                            color={status === 'ok' ? 'success' : status === 'low' ? 'warning' : 'danger'}
                          />
                          <p className="text-[10px] text-text-muted mt-1">მინ: {supply.minStock}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs ${STATUS_CONFIG[status].bgColor} ${STATUS_CONFIG[status].color}`}>
                          {STATUS_CONFIG[status].label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{supply.supplier || '-'}</td>
                      <td className="px-4 py-3 text-sm font-mono">{supply.pricePerUnit.toFixed(2)}₾/{supply.unit}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleEdit(supply) }}
                            className="text-text-muted hover:text-copper-light"
                          >
                            ✏️
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleViewDetail(supply) }}
                            className="text-text-muted hover:text-copper-light"
                          >
                            →
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <AddCleaningModal
          formData={formData}
          setFormData={setFormData}
          isEditing={!!editingSupply}
          suppliers={suppliers}
          onClose={() => setShowAddModal(false)}
          onSave={handleSave}
          onCreateSupplier={handleCreateSupplier}
          totalAmount={totalAmount}
        />
      )}
    </div>
  )
}

function AddCleaningModal({
  formData,
  setFormData,
  isEditing,
  suppliers,
  onClose,
  onSave,
  onCreateSupplier,
  totalAmount,
}: {
  formData: any
  setFormData: (fn: any) => void
  isEditing: boolean
  suppliers: Supplier[]
  onClose: () => void
  onSave: () => void
  onCreateSupplier: (name: string, callback: (id: string) => void) => void
  totalAmount: number
}) {
  const [showNewSupplierInput, setShowNewSupplierInput] = useState(false)
  const [newSupplierName, setNewSupplierName] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-bg-secondary border border-border rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-lg font-display font-semibold">
            {isEditing ? '✏️ რედაქტირება' : '🧹 ახალი რეცხვის საშუალება'}
          </h3>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">დასახელება *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, name: e.target.value }))}
              placeholder="მაგ: კაუსტიკ სოდა"
              className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl focus:border-copper focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">მარაგი</label>
              <input
                type="number"
                value={formData.currentStock}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, currentStock: e.target.value }))}
                placeholder="0"
                className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl font-mono focus:border-copper focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">ერთეული</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, unit: e.target.value }))}
                className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl focus:border-copper focus:outline-none"
              >
                <option value="კგ">კგ</option>
                <option value="ლ">ლ</option>
                <option value="ც">ც (ცალი)</option>
                <option value="მლ">მლ</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">მინ. მარაგი</label>
              <input
                type="number"
                value={formData.minStock}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, minStock: e.target.value }))}
                placeholder="0"
                className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl font-mono focus:border-copper focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">ფასი (₾)</label>
              <input
                type="number"
                step="0.01"
                value={formData.pricePerUnit}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, pricePerUnit: e.target.value }))}
                placeholder="0.00"
                className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl font-mono focus:border-copper focus:outline-none"
              />
            </div>
          </div>

          {/* Expense Options - Only for new items */}
          {!isEditing && (
            <div className="p-4 bg-slate-700/30 rounded-xl space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="createExpense"
                  checked={formData.createExpense}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, createExpense: e.target.checked }))}
                  className="w-5 h-5 rounded border-slate-600"
                />
                <label htmlFor="createExpense" className="text-sm font-medium cursor-pointer">
                  📊 ხარჯად დაფიქსირება
                </label>
              </div>

              {formData.createExpense && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">მომწოდებელი</label>
                    <div className="flex gap-2">
                      <select
                        value={formData.supplierId}
                        onChange={(e) => setFormData((prev: any) => ({ ...prev, supplierId: e.target.value }))}
                        className="flex-1 px-4 py-3 bg-bg-tertiary border border-border rounded-xl"
                      >
                        <option value="">-- აირჩიეთ --</option>
                        {suppliers.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowNewSupplierInput(true)}
                        className="px-4 py-3 bg-bg-tertiary border border-border rounded-xl hover:bg-slate-600"
                      >
                        ➕
                      </button>
                    </div>
                    
                    {showNewSupplierInput && (
                      <div className="mt-2 p-3 bg-slate-800 rounded-lg border border-slate-600">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newSupplierName}
                            onChange={(e) => setNewSupplierName(e.target.value)}
                            placeholder="ახალი მომწოდებელი"
                            className="flex-1 px-3 py-2 bg-slate-700 rounded-lg text-sm"
                          />
                          <Button 
                            size="sm" 
                            onClick={() => {
                              onCreateSupplier(newSupplierName, (id) => {
                                setFormData((prev: any) => ({ ...prev, supplierId: id }))
                                setShowNewSupplierInput(false)
                                setNewSupplierName('')
                              })
                            }}
                          >
                            შენახვა
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setShowNewSupplierInput(false)}>✕</Button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">ინვოისის ნომერი</label>
                    <input
                      type="text"
                      value={formData.invoiceNumber}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, invoiceNumber: e.target.value }))}
                      placeholder="INV-2024-001"
                      className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl"
                    />
                  </div>

                  <div className="flex items-center gap-3 ml-4">
                    <input
                      type="checkbox"
                      id="isPaid"
                      checked={formData.isPaid}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, isPaid: e.target.checked }))}
                      className="w-5 h-5 rounded border-slate-600"
                    />
                    <label htmlFor="isPaid" className="text-sm font-medium cursor-pointer">
                      ✅ გადახდილია
                    </label>
                  </div>

                  {formData.isPaid && (
                    <div className="ml-4">
                      <label className="block text-sm font-medium mb-2">გადახდის მეთოდი</label>
                      <select
                        value={formData.paymentMethod}
                        onChange={(e) => setFormData((prev: any) => ({ ...prev, paymentMethod: e.target.value }))}
                        className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl"
                      >
                        {paymentMethods.map(m => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Summary */}
          {!isEditing && formData.createExpense && totalAmount > 0 && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400">ჯამი:</span>
                <span className="text-2xl font-bold text-amber-400">₾{totalAmount.toFixed(2)}</span>
              </div>
              <div className="text-sm text-slate-400">🧹 {formData.currentStock} {formData.unit}</div>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>გაუქმება</Button>
          <Button variant="primary" onClick={onSave} disabled={!formData.name}>შენახვა</Button>
        </div>
      </div>
    </div>
  )
}