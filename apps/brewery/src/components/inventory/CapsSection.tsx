'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui'

interface Cap {
  id: string
  name: string
  size: string
  color?: string
  quantity: number
  minStock: number
  supplier?: string
}

interface Supplier {
  id: string
  name: string
  category: string | null
}

const capSizes = {
  '26mm': { name: '26mm', description: 'სტანდარტული (ბოთლი 330-500ml)' },
  '29mm': { name: '29mm', description: 'დიდი (ბოთლი 750ml+)' },
}

const capColors: Record<string, { name: string; color: string }> = {
  gold: { name: 'ოქროსფერი', color: 'bg-yellow-600' },
  silver: { name: 'ვერცხლისფერი', color: 'bg-gray-400' },
  black: { name: 'შავი', color: 'bg-gray-800' },
  red: { name: 'წითელი', color: 'bg-red-600' },
  green: { name: 'მწვანე', color: 'bg-green-600' },
  white: { name: 'თეთრი', color: 'bg-white border border-gray-300' },
}

const paymentMethods = [
  { value: 'BANK_TRANSFER', label: '🏦 გადარიცხვა' },
  { value: 'CASH', label: '💵 ნაღდი' },
  { value: 'CARD', label: '💳 ბარათი' },
  { value: 'CHECK', label: '📝 ჩეკი' },
]

export function CapsSection() {
  const [caps, setCaps] = useState<Cap[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [filterSize, setFilterSize] = useState<string>('all')
  const [showLowStockOnly, setShowLowStockOnly] = useState(false)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])

  const fetchCaps = async () => {
    try {
      const res = await fetch('/api/inventory?category=PACKAGING')
      if (res.ok) {
        const data = await res.json()
        const items = data.items || []
        const capItems = items.filter((item: any) => 
          item.metadata?.type === 'cap' || 
          (item.name || '').toLowerCase().includes('თავსახური')
        )
        const transformed = capItems.map((item: any) => ({
          id: item.id,
          name: item.name,
          size: item.metadata?.size || '26mm',
          color: item.metadata?.color,
          quantity: item.quantity || 0,
          minStock: item.minStock || 1000,
          supplier: item.metadata?.supplier || item.supplier,
        }))
        setCaps(transformed)
      }
    } catch (error) {
      console.error('Failed to fetch caps:', error)
    } finally {
      setLoading(false)
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
    fetchCaps()
    fetchSuppliers()
  }, [])

  const handleAddCap = async (data: any) => {
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name || `თავსახური ${data.size}`,
          sku: `CAP-${data.size}-${Date.now()}`,
          category: 'PACKAGING',
          unit: 'ცალი',
          quantity: 0,
          reorderPoint: data.minStock,
          costPerUnit: data.costPerUnit || undefined,
          metadata: {
            type: 'cap',
            size: data.size,
            color: data.color,
            supplier: data.supplier,
          }
        })
      })

      if (!res.ok) {
        const err = await res.json()
        alert('დამატება ვერ მოხერხდა: ' + (err.error || 'Unknown error'))
        return
      }

      const createResult = await res.json()
      const itemId = createResult.item?.id || createResult.id

      if (data.quantity > 0 && itemId) {
        const purchaseRes = await fetch('/api/inventory/purchase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemId,
            quantity: data.quantity,
            unitPrice: data.costPerUnit || 0,
            totalAmount: data.quantity * (data.costPerUnit || 0),
            supplierId: data.supplierId || undefined,
            date: new Date().toISOString().split('T')[0],
            invoiceNumber: data.invoiceNumber || undefined,
            notes: `საწყისი მარაგი: ${data.name || `თავსახური ${data.size}`}`,
            createExpense: data.createExpense ?? false,
            isPaid: data.isPaid ?? false,
            paymentMethod: data.paymentMethod || 'BANK_TRANSFER',
          }),
        })

        if (!purchaseRes.ok) {
          alert('თავსახური დაემატა, მაგრამ შესყიდვის ჩაწერა ვერ მოხერხდა')
        }
      }

      fetchCaps()
      setShowAddModal(false)
    } catch (error) {
      console.error('Failed to add cap:', error)
      alert('დამატება ვერ მოხერხდა')
    }
  }

  const handleUpdateQuantity = async (id: string, quantity: number) => {
    try {
      const res = await fetch(`/api/inventory/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity, type: 'ADJUSTMENT' })
      })
      if (res.ok) {
        fetchCaps()
      } else {
        const errorData = await res.json()
        alert(errorData.error || 'რაოდენობის განახლება ვერ მოხერხდა')
      }
    } catch (error) {
      alert('რაოდენობის განახლება ვერ მოხერხდა')
    }
  }

  const handleDeleteCap = async (id: string) => {
    if (!confirm('ნამდვილად გსურთ თავსახურის წაშლა?')) return
    try {
      const res = await fetch(`/api/inventory/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setCaps(caps.filter(c => c.id !== id))
      } else {
        const errorData = await res.json()
        alert(errorData.error || 'წაშლა ვერ მოხერხდა')
      }
    } catch (error) {
      alert('წაშლა ვერ მოხერხდა')
    }
  }

  const filteredCaps = caps.filter(cap => {
    if (filterSize !== 'all' && cap.size !== filterSize) return false
    if (showLowStockOnly && cap.quantity >= cap.minStock) return false
    return true
  })

  if (loading) {
    return <div className="text-center py-12">იტვირთება...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex gap-3">
          <select
            value={filterSize}
            onChange={(e) => setFilterSize(e.target.value)}
            className="px-4 py-2 bg-bg-tertiary border border-border rounded-lg"
          >
            <option value="all">ყველა ზომა</option>
            {Object.entries(capSizes).map(([key, info]) => (
              <option key={key} value={key}>{info.name} - {info.description}</option>
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
          + თავსახურის დამატება
        </Button>
      </div>

      <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-bg-tertiary">
            <tr>
              <th className="text-left p-4">სახელი</th>
              <th className="text-left p-4">ზომა</th>
              <th className="text-left p-4">ფერი</th>
              <th className="text-left p-4">რაოდენობა</th>
              <th className="text-left p-4">სტატუსი</th>
              <th className="text-left p-4">მომწოდებელი</th>
              <th className="text-right p-4">მოქმედება</th>
            </tr>
          </thead>
          <tbody>
            {filteredCaps.map(cap => {
              const colorInfo = cap.color ? capColors[cap.color] : null
              const isLowStock = cap.quantity < cap.minStock

              return (
                <tr key={cap.id} className="border-t border-border hover:bg-bg-tertiary/50">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🧢</span>
                      <span>{cap.name}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-slate-700 rounded text-sm">{cap.size}</span>
                  </td>
                  <td className="p-4">
                    {colorInfo ? (
                      <span className={`px-2 py-1 rounded text-sm ${colorInfo.color} ${cap.color === 'white' ? 'text-black' : 'text-white'}`}>
                        {colorInfo.name}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="p-4">
                    <span className="font-bold">{cap.quantity.toLocaleString()}</span>
                    <span className="text-slate-400 text-sm ml-2">მინ: {cap.minStock.toLocaleString()}</span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-white text-sm ${isLowStock ? 'bg-red-500' : 'bg-green-500'}`}>
                      {isLowStock ? '⚠️ დაბალი' : '✓ ნორმალური'}
                    </span>
                  </td>
                  <td className="p-4 text-sm">{cap.supplier || '-'}</td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <input
                        type="number"
                        value={cap.quantity}
                        onChange={(e) => handleUpdateQuantity(cap.id, Number(e.target.value))}
                        className="w-24 px-2 py-1 bg-slate-700 rounded text-right"
                      />
                      <button
                        onClick={() => handleDeleteCap(cap.id)}
                        className="px-2 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/40 rounded transition-colors"
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

        {filteredCaps.length === 0 && (
          <div className="text-center py-12 text-text-muted">
            <p className="text-4xl mb-4">🧢</p>
            <p>{caps.length === 0 ? 'თავსახურები არ არის დამატებული' : 'ფილტრის შედეგები არ მოიძებნა'}</p>
            {caps.length === 0 && (
              <Button variant="primary" onClick={() => setShowAddModal(true)} className="mt-4">
                + პირველი თავსახურის დამატება
              </Button>
            )}
          </div>
        )}
      </div>

      {showAddModal && (
        <AddCapModal 
          onClose={() => setShowAddModal(false)} 
          onAdd={handleAddCap}
          suppliers={suppliers}
          onSupplierCreated={fetchSuppliers}
        />
      )}
    </div>
  )
}

function AddCapModal({ 
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
  const [name, setName] = useState('')
  const [size, setSize] = useState<string>('26mm')
  const [color, setColor] = useState<string>('gold')
  const [quantity, setQuantity] = useState(5000)
  const [minStock, setMinStock] = useState(1000)
  const [supplier, setSupplier] = useState('')
  
  // Expense fields
  const [costPerUnit, setCostPerUnit] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [createExpense, setCreateExpense] = useState(true)
  const [isPaid, setIsPaid] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER')
  
  const [showNewSupplierInput, setShowNewSupplierInput] = useState(false)
  const [newSupplierName, setNewSupplierName] = useState('')

  const totalAmount = quantity * (parseFloat(costPerUnit) || 0)

  const handleCreateSupplier = async () => {
    if (!newSupplierName.trim()) return
    try {
      const response = await fetch('/api/finances/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSupplierName.trim(), category: 'packaging' }),
      })
      if (response.ok) {
        const data = await response.json()
        setSupplierId(data.supplier.id)
        setShowNewSupplierInput(false)
        setNewSupplierName('')
        onSupplierCreated()
        alert('✅ მომწოდებელი დაემატა!')
      } else {
        alert('მომწოდებლის დამატება ვერ მოხერხდა')
      }
    } catch (err) {
      alert('მომწოდებლის დამატება ვერ მოხერხდა')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">🧢 თავსახურის დამატება</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">სახელი (არჩევითი)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="მაგ: თავსახური ოქროსფერი 26mm"
              className="w-full px-4 py-2 bg-slate-700 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">ზომა</label>
            <div className="flex gap-2">
              {Object.entries(capSizes).map(([key, info]) => (
                <button
                  key={key}
                  onClick={() => setSize(key)}
                  className={`flex-1 py-3 rounded-lg ${size === key ? 'bg-copper ring-2 ring-copper' : 'bg-slate-700'}`}
                >
                  <div className="text-lg font-bold">{info.name}</div>
                  <div className="text-xs text-slate-300">{info.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">ფერი</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(capColors).map(([key, info]) => (
                <button
                  key={key}
                  onClick={() => setColor(key)}
                  className={`py-2 rounded-lg ${info.color} ${key === 'white' ? 'text-black' : 'text-white'} ${color === key ? 'ring-2 ring-copper' : ''}`}
                >
                  {info.name}
                </button>
              ))}
            </div>
          </div>

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
              step="0.001"
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

          {/* Summary */}
          {createExpense && totalAmount > 0 && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400">ჯამი:</span>
                <span className="text-2xl font-bold text-amber-400">₾{totalAmount.toFixed(2)}</span>
              </div>
              <div className="text-sm text-slate-400">🧢 {quantity.toLocaleString()} თავსახური</div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={onClose}>გაუქმება</Button>
          <Button variant="primary" onClick={() => onAdd({
            name: name || `თავსახური ${capColors[color]?.name || ''} ${size}`,
            size,
            color,
            quantity,
            minStock,
            supplier,
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