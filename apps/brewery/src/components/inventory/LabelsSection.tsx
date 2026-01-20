'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui'

interface Bottle {
  id: string
  type: string
  color?: string
  quantity: number
  minStock: number
  supplier?: string
  location?: string
}

interface Supplier {
  id: string
  name: string
  category: string | null
}

const bottleTypes: Record<string, { name: string; icon: string; volume: number }> = {
  bottle_500: { name: 'ბოთლი 500ml', icon: '🍾', volume: 0.5 },
  bottle_330: { name: 'ბოთლი 330ml', icon: '🍾', volume: 0.33 },
  can_500: { name: 'ქილა 500ml', icon: '🥫', volume: 0.5 },
  can_330: { name: 'ქილა 330ml', icon: '🥫', volume: 0.33 },
}

const bottleColors: Record<string, { name: string; color: string }> = {
  brown: { name: 'ყავისფერი', color: 'bg-amber-800' },
  green: { name: 'მწვანე', color: 'bg-green-800' },
  clear: { name: 'გამჭვირვალე', color: 'bg-slate-400' },
}

const paymentMethods = [
  { value: 'BANK_TRANSFER', label: '🏦 გადარიცხვა' },
  { value: 'CASH', label: '💵 ნაღდი' },
  { value: 'CARD', label: '💳 ბარათი' },
  { value: 'CHECK', label: '📝 ჩეკი' },
]

export function LabelsSection() {
  const [bottles, setBottles] = useState<Bottle[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterColor, setFilterColor] = useState<string>('all')
  const [showLowStockOnly, setShowLowStockOnly] = useState(false)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])

  // Fetch bottles from API
  const fetchBottles = async () => {
    try {
      const res = await fetch('/api/inventory?category=PACKAGING')
      if (res.ok) {
        const data = await res.json()
        const allItems = (data.items || []).filter((item: any) => {
          const metadata = item.metadata || {}
          const nameLower = (item.name || '').toLowerCase()
          return metadata.type === 'bottle' || 
                 metadata.type === 'can' ||
                 nameLower.includes('ბოთლი') ||
                 nameLower.includes('bottle') ||
                 nameLower.includes('ქილა') ||
                 nameLower.includes('can')
        })
        
        const transformedBottles = allItems.map((item: any) => {
          const metadata = item.metadata || {}
          return {
            id: item.id,
            type: metadata.bottleType || metadata.type || 'bottle_500',
            color: metadata.color,
            quantity: item.quantity || item.balance || item.cachedBalance || 0,
            minStock: item.minStock || item.reorderPoint || 500,
            supplier: metadata.supplier || item.supplier,
            location: metadata.location,
          }
        })
        setBottles(transformedBottles)
      }
    } catch (error) {
      console.error('Failed to fetch bottles:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch suppliers
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
    fetchBottles()
    fetchSuppliers()
  }, [])

  // Add bottle
  const handleAddBottle = async (data: any) => {
    try {
      const typeInfo = bottleTypes[data.type]
      const isCan = data.type.startsWith('can')
      
      // Step 1: Create inventory item
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: `${data.type.toUpperCase()}-${Date.now()}`,
          name: typeInfo?.name || data.type,
          category: 'PACKAGING',
          unit: 'ცალი',
          quantity: 0, // Start with 0, will add via purchase
          reorderPoint: data.minStock,
          costPerUnit: data.costPerUnit || undefined,
          metadata: {
            type: isCan ? 'can' : 'bottle',
            bottleType: data.type,
            color: data.color,
            supplier: data.supplier,
            location: data.location,
            volume: typeInfo?.volume,
          }
        })
      })

      if (!res.ok) {
        const errorData = await res.json()
        alert(errorData.error || 'ტარის დამატება ვერ მოხერხდა')
        return
      }

      const createResult = await res.json()
      const itemId = createResult.item?.id || createResult.id

      // Step 2: Create purchase record if quantity > 0
      if (data.quantity > 0 && itemId) {
        const purchasePayload = {
          itemId: itemId,
          quantity: data.quantity,
          unitPrice: data.costPerUnit || 0,
          totalAmount: data.quantity * (data.costPerUnit || 0),
          supplierId: data.supplierId || undefined,
          date: new Date().toISOString().split('T')[0],
          invoiceNumber: data.invoiceNumber || undefined,
          notes: `საწყისი მარაგი: ${typeInfo?.name || data.type}`,
          createExpense: data.createExpense ?? false,
          isPaid: data.isPaid ?? false,
          paymentMethod: data.paymentMethod || 'BANK_TRANSFER',
        }

        const purchaseRes = await fetch('/api/inventory/purchase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(purchasePayload),
        })

        if (!purchaseRes.ok) {
          console.error('Purchase record failed')
          alert('ტარა დაემატა, მაგრამ შესყიდვის ჩაწერა ვერ მოხერხდა')
        }
      }

      fetchBottles()
      setShowAddModal(false)
    } catch (error) {
      console.error('Failed to add bottle:', error)
      alert('ტარის დამატება ვერ მოხერხდა')
    }
  }

  // Update bottle quantity
  const handleUpdateQuantity = async (id: string, quantity: number) => {
    try {
      const res = await fetch(`/api/inventory/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          quantity,
          type: 'ADJUSTMENT',
        })
      })
      if (res.ok) {
        fetchBottles()
      } else {
        const errorData = await res.json()
        alert(errorData.error || 'რაოდენობის განახლება ვერ მოხერხდა')
      }
    } catch (error) {
      console.error('Failed to update bottle:', error)
      alert('რაოდენობის განახლება ვერ მოხერხდა')
    }
  }

  // Delete bottle
  const handleDeleteBottle = async (id: string) => {
    if (!confirm('ნამდვილად გსურთ ტარის წაშლა?')) return
    
    try {
      const res = await fetch(`/api/inventory/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setBottles(bottles.filter(b => b.id !== id))
      } else {
        const errorData = await res.json()
        alert(errorData.error || 'წაშლა ვერ მოხერხდა')
      }
    } catch (error) {
      console.error('Failed to delete bottle:', error)
      alert('წაშლა ვერ მოხერხდა')
    }
  }

  const filteredBottles = bottles.filter(bottle => {
    if (filterType !== 'all' && bottle.type !== filterType) return false
    if (filterColor !== 'all' && bottle.color !== filterColor) return false
    if (showLowStockOnly && bottle.quantity >= bottle.minStock) return false
    return true
  })

  if (loading) {
    return <div className="text-center py-12">იტვირთება...</div>
  }

  return (
    <div className="space-y-6">
      {/* Filters & Actions */}
      <div className="flex justify-between items-center">
        <div className="flex gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 bg-bg-tertiary border border-border rounded-lg"
          >
            <option value="all">ყველა ტიპი</option>
            {Object.entries(bottleTypes).map(([key, info]) => (
              <option key={key} value={key}>{info.icon} {info.name}</option>
            ))}
          </select>

          <select
            value={filterColor}
            onChange={(e) => setFilterColor(e.target.value)}
            className="px-4 py-2 bg-bg-tertiary border border-border rounded-lg"
          >
            <option value="all">ყველა ფერი</option>
            {Object.entries(bottleColors).map(([key, info]) => (
              <option key={key} value={key}>{info.name}</option>
            ))}
          </select>

          <label className="flex items-center gap-2 px-4 py-2 bg-bg-tertiary border border-border rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={showLowStockOnly}
              onChange={(e) => setShowLowStockOnly(e.target.checked)}
              className="rounded border-border"
            />
            მხოლოდ დაბალი
          </label>
        </div>

        <Button variant="primary" onClick={() => setShowAddModal(true)}>
          + ტარის დამატება
        </Button>
      </div>

      {/* Bottles Table */}
      <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-bg-tertiary">
            <tr>
              <th className="text-left p-4">ტიპი</th>
              <th className="text-left p-4">ფერი</th>
              <th className="text-left p-4">რაოდენობა</th>
              <th className="text-left p-4">სტატუსი</th>
              <th className="text-left p-4">მომწოდებელი</th>
              <th className="text-left p-4">ლოკაცია</th>
              <th className="text-right p-4">მოქმედება</th>
            </tr>
          </thead>
          <tbody>
            {filteredBottles.map(bottle => {
              const typeInfo = bottleTypes[bottle.type] || { name: bottle.type, icon: '📦' }
              const colorInfo = bottle.color ? bottleColors[bottle.color] : null
              const isLowStock = bottle.quantity < bottle.minStock

              return (
                <tr key={bottle.id} className="border-t border-border hover:bg-bg-tertiary/50">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{typeInfo.icon}</span>
                      <span>{typeInfo.name}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    {colorInfo && (
                      <span className={`px-2 py-1 rounded text-white text-sm ${colorInfo.color}`}>
                        {colorInfo.name}
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <div>
                      <span className="font-bold">{bottle.quantity.toLocaleString()}</span>
                      <span className="text-slate-400 text-sm ml-2">მინ: {bottle.minStock}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-white text-sm ${isLowStock ? 'bg-red-500' : 'bg-green-500'}`}>
                      {isLowStock ? 'დაბალი' : 'ნორმალური'}
                    </span>
                  </td>
                  <td className="p-4 text-sm">{bottle.supplier || '-'}</td>
                  <td className="p-4 text-sm">{bottle.location || '-'}</td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <input
                        type="number"
                        value={bottle.quantity}
                        onChange={(e) => handleUpdateQuantity(bottle.id, Number(e.target.value))}
                        className="w-24 px-2 py-1 bg-slate-700 rounded text-right"
                      />
                      <button
                        onClick={() => handleDeleteBottle(bottle.id)}
                        className="px-2 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/40 rounded transition-colors"
                        title="წაშლა"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filteredBottles.length === 0 && (
          <div className="text-center py-12 text-text-muted">
            <p className="text-4xl mb-4">🍾</p>
            <p>{bottles.length === 0 ? 'ბოთლები/ქილები არ არის დამატებული' : 'ფილტრის შედეგები არ მოიძებნა'}</p>
            {bottles.length === 0 && (
              <Button variant="primary" onClick={() => setShowAddModal(true)} className="mt-4">
                + პირველი ტარის დამატება
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <AddBottleModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddBottle}
          suppliers={suppliers}
          onSupplierCreated={fetchSuppliers}
        />
      )}
    </div>
  )
}

function AddBottleModal({ 
  onClose, 
  onAdd,
  suppliers,
  onSupplierCreated,
}: { 
  onClose: () => void
  onAdd: (data: any) => void
  suppliers: Supplier[]
  onSupplierCreated: () => void
}) {
  const [type, setType] = useState<string>('bottle_500')
  const [color, setColor] = useState<'brown' | 'green' | 'clear'>('brown')
  const [quantity, setQuantity] = useState(1000)
  const [minStock, setMinStock] = useState(500)
  const [supplier, setSupplier] = useState('')
  const [location, setLocation] = useState('')
  
  // Expense fields
  const [costPerUnit, setCostPerUnit] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [createExpense, setCreateExpense] = useState(true)
  const [isPaid, setIsPaid] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER')
  
  // New supplier
  const [showNewSupplierInput, setShowNewSupplierInput] = useState(false)
  const [newSupplierName, setNewSupplierName] = useState('')

  const totalAmount = quantity * (parseFloat(costPerUnit) || 0)

  const handleCreateSupplier = async () => {
    if (!newSupplierName.trim()) return
    
    try {
      const response = await fetch('/api/finances/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSupplierName.trim(),
          category: 'packaging',
        }),
      })
      
      if (response.ok) {
        const data = await response.json()
        setSupplierId(data.supplier.id)
        setShowNewSupplierInput(false)
        setNewSupplierName('')
        onSupplierCreated()
        alert('✅ მომწოდებელი დაემატა!')
      } else {
        const error = await response.json()
        alert(error.error || 'მომწოდებლის დამატება ვერ მოხერხდა')
      }
    } catch (err) {
      console.error('Create supplier error:', err)
      alert('მომწოდებლის დამატება ვერ მოხერხდა')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">🍾 ტარის დამატება</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">ტიპი</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 rounded-lg"
            >
              {Object.entries(bottleTypes).map(([key, info]) => (
                <option key={key} value={key}>{info.icon} {info.name}</option>
              ))}
            </select>
          </div>

          {type.startsWith('bottle') && (
            <div>
              <label className="block text-sm text-slate-400 mb-2">ფერი</label>
              <div className="flex gap-2">
                {Object.entries(bottleColors).map(([key, info]) => (
                  <button
                    key={key}
                    onClick={() => setColor(key as typeof color)}
                    className={`flex-1 py-2 rounded-lg text-white ${color === key ? 'ring-2 ring-copper' : ''} ${info.color}`}
                  >
                    {info.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">რაოდენობა</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-4 py-2 bg-slate-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">მინ. მარაგი</label>
              <input
                type="number"
                value={minStock}
                onChange={(e) => setMinStock(Number(e.target.value))}
                className="w-full px-4 py-2 bg-slate-700 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">
              ფასი (₾/ცალი) {createExpense && <span className="text-red-400">*</span>}
            </label>
            <input
              type="number"
              step="0.01"
              value={costPerUnit}
              onChange={(e) => setCostPerUnit(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-2 bg-slate-700 rounded-lg"
            />
          </div>

          {/* Expense Options */}
          <div className="p-4 bg-slate-700/50 rounded-lg space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="createExpense"
                checked={createExpense}
                onChange={(e) => setCreateExpense(e.target.checked)}
                className="w-5 h-5 rounded border-slate-600"
              />
              <label htmlFor="createExpense" className="text-sm font-medium text-white cursor-pointer">
                📊 ხარჯად დაფიქსირება
              </label>
            </div>

            {createExpense && (
              <>
                {/* Supplier Selection */}
                <div>
                  <label className="block text-sm text-slate-400 mb-2">მომწოდებელი</label>
                  <div className="flex gap-2">
                    <select
                      value={supplierId}
                      onChange={(e) => setSupplierId(e.target.value)}
                      className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    >
                      <option value="">-- აირჩიეთ --</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowNewSupplierInput(true)}
                      className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white hover:bg-slate-600"
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
                          className="flex-1 px-3 py-2 bg-slate-700 rounded-lg text-white text-sm"
                        />
                        <Button size="sm" onClick={handleCreateSupplier}>შენახვა</Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowNewSupplierInput(false)}>✕</Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Invoice */}
                <div>
                  <label className="block text-sm text-slate-400 mb-2">ინვოისის ნომერი</label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="INV-2024-001"
                    className="w-full px-4 py-2 bg-slate-700 rounded-lg"
                  />
                </div>

                {/* Is Paid */}
                <div className="flex items-center gap-3 ml-4">
                  <input
                    type="checkbox"
                    id="isPaid"
                    checked={isPaid}
                    onChange={(e) => setIsPaid(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-600"
                  />
                  <label htmlFor="isPaid" className="text-sm font-medium text-white cursor-pointer">
                    ✅ გადახდილია
                  </label>
                </div>

                {isPaid && (
                  <div className="ml-4">
                    <label className="block text-sm text-slate-400 mb-2">გადახდის მეთოდი</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-700 rounded-lg"
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

          <div>
            <label className="block text-sm text-slate-400 mb-2">ლოკაცია</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 rounded-lg"
            />
          </div>

          {/* Summary */}
          {createExpense && totalAmount > 0 && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400">ჯამი:</span>
                <span className="text-2xl font-bold text-amber-400">
                  ₾{totalAmount.toFixed(2)}
                </span>
              </div>
              <div className="text-sm text-slate-400">
                {bottleTypes[type]?.icon} {quantity.toLocaleString()} x {bottleTypes[type]?.name}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={onClose}>გაუქმება</Button>
          <Button variant="primary" onClick={() => onAdd({
            type,
            color: type.startsWith('bottle') ? color : undefined,
            quantity,
            minStock,
            supplier,
            location,
            costPerUnit: costPerUnit ? parseFloat(costPerUnit) : undefined,
            supplierId: supplierId || undefined,
            invoiceNumber: invoiceNumber || undefined,
            createExpense,
            isPaid,
            paymentMethod,
          })}>
            დამატება
          </Button>
        </div>
      </div>
    </div>
  )
}