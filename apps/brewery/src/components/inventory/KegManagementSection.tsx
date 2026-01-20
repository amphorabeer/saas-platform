'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui'
import { formatDate } from '@/lib/utils'

interface Keg {
  id: string
  kegNumber: string
  size: number
  status: string
  condition: string
  productName: string | null
  customerName: string | null
  filledAt: string | null
  notes: string | null
}

interface Supplier {
  id: string
  name: string
  category: string | null
}

export function KegManagementSection() {
  const [kegs, setKegs] = useState<Keg[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [filterSize, setFilterSize] = useState<number | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  
  // Fetch kegs from API
  useEffect(() => {
    const fetchKegs = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/kegs')
        if (res.ok) {
          const data = await res.json()
          setKegs(data.kegs || [])
        }
      } catch (error) {
        console.error('Failed to fetch kegs:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchKegs()
  }, [])

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
    fetchSuppliers()
  }, [])
  
  // Status mapping: API enum → UI display
  const statusLabels: Record<string, string> = {
    AVAILABLE: 'ცარიელი',
    FILLED: 'სავსე',
    WITH_CUSTOMER: 'გამოყენებაში',
    IN_TRANSIT: 'გზაში',
    CLEANING: 'რეცხვა',
    DAMAGED: 'დაზიანებული',
    LOST: 'დაკარგული',
  }
  
  const statusColors: Record<string, string> = {
    AVAILABLE: 'bg-slate-500',
    FILLED: 'bg-green-500',
    WITH_CUSTOMER: 'bg-blue-500',
    IN_TRANSIT: 'bg-amber-500',
    CLEANING: 'bg-yellow-500',
    DAMAGED: 'bg-red-500',
    LOST: 'bg-gray-500',
  }
  
  const filteredKegs = kegs.filter(keg => {
    if (filterSize !== 'all' && keg.size !== Number(filterSize)) return false
    if (filterStatus !== 'all' && keg.status !== filterStatus) return false
    return true
  })
  
  const kegStats = {
    total: kegs.length,
    empty: kegs.filter(k => k.status === 'AVAILABLE').length,
    filled: kegs.filter(k => k.status === 'FILLED').length,
    inUse: kegs.filter(k => k.status === 'WITH_CUSTOMER').length,
    cleaning: kegs.filter(k => k.status === 'CLEANING').length,
    damaged: kegs.filter(k => k.status === 'DAMAGED').length,
    by20L: kegs.filter(k => k.size === 20).length,
    by30L: kegs.filter(k => k.size === 30).length,
    by50L: kegs.filter(k => k.size === 50).length,
  }
  
  const handleAddKeg = async (kegData: { 
    size: number
    quantity: number
    notes?: string
    costPerUnit?: number
    supplierId?: string
    invoiceNumber?: string
    createExpense?: boolean
    isPaid?: boolean
    paymentMethod?: string
  }) => {
    try {
      const promises = []
      for (let i = 0; i < kegData.quantity; i++) {
        const kegNumber = `KEG-${kegData.size}-${String(Date.now()).slice(-6)}-${String(i + 1).padStart(3, '0')}`
        promises.push(
          fetch('/api/kegs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              kegNumber,
              size: kegData.size,
              notes: kegData.notes || `დამატებულია ${kegData.quantity} კეგი`,
            }),
          })
        )
      }
      
      const results = await Promise.all(promises)
      const failedCount = results.filter(r => !r.ok).length
      
      if (failedCount > 0) {
        alert(`${failedCount} კეგის დამატება ვერ მოხერხდა`)
      }

      // Create expense if enabled and has cost
      if (kegData.createExpense && kegData.costPerUnit && kegData.costPerUnit > 0) {
        const totalAmount = kegData.quantity * kegData.costPerUnit
        
        try {
          const expenseRes = await fetch('/api/finances/expenses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              category: 'EQUIPMENT',
              amount: totalAmount,
              date: new Date().toISOString().split('T')[0],
              description: `კეგების შესყიდვა: ${kegData.quantity} x ${kegData.size}L`,
              supplierId: kegData.supplierId || null,
              invoiceNumber: kegData.invoiceNumber || null,
              isPaid: kegData.isPaid || false,
              paymentMethod: kegData.isPaid ? (kegData.paymentMethod || 'BANK_TRANSFER') : null,
            }),
          })
          
          if (!expenseRes.ok) {
            console.error('Failed to create expense for kegs')
            alert('კეგები დაემატა, მაგრამ ხარჯის ჩაწერა ვერ მოხერხდა')
          }
        } catch (expErr) {
          console.error('Expense creation error:', expErr)
        }
      }

      if (failedCount === 0) {
        alert(`${kegData.quantity} კეგი დამატებულია!`)
      }
      
      // Refresh kegs
      const refreshRes = await fetch('/api/kegs')
      if (refreshRes.ok) {
        const data = await refreshRes.json()
        setKegs(data.kegs || [])
      }
      
      setShowAddModal(false)
    } catch (error) {
      console.error('Failed to add kegs:', error)
      alert('კეგების დამატება ვერ მოხერხდა')
    }
  }
  
  const handleUpdateStatus = async (kegId: string, newStatus: string) => {
    try {
      const res = await fetch('/api/kegs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: kegId,
          status: newStatus,
        }),
      })
      
      if (res.ok) {
        const refreshRes = await fetch('/api/kegs')
        if (refreshRes.ok) {
          const data = await refreshRes.json()
          setKegs(data.kegs || [])
        }
      } else {
        const data = await res.json()
        alert(data.error || 'სტატუსის განახლება ვერ მოხერხდა')
      }
    } catch (error) {
      console.error('Failed to update keg status:', error)
      alert('სტატუსის განახლება ვერ მოხერხდა')
    }
  }
  
  const handleDeleteKeg = async (kegId: string, kegNumber: string) => {
    if (!confirm(`წავშალოთ კეგი ${kegNumber}?`)) return
    
    try {
      const res = await fetch(`/api/kegs/${kegId}`, { 
        method: 'DELETE' 
      })
      
      if (res.ok) {
        const refreshRes = await fetch('/api/kegs')
        if (refreshRes.ok) {
          const data = await refreshRes.json()
          setKegs(data.kegs || [])
        }
      } else {
        const data = await res.json()
        alert(data.error || 'წაშლა ვერ მოხერხდა')
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('წაშლა ვერ მოხერხდა')
    }
  }
  
  return (
    <div className="space-y-6">
      {/* Filters & Actions */}
      <div className="flex justify-between items-center">
        <div className="flex gap-3">
          <select
            value={filterSize}
            onChange={(e) => setFilterSize(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="px-4 py-2 bg-bg-tertiary border border-border rounded-lg"
          >
            <option value="all">ყველა ზომა</option>
            <option value="20">20L ({kegStats.by20L})</option>
            <option value="30">30L ({kegStats.by30L})</option>
            <option value="50">50L ({kegStats.by50L})</option>
          </select>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 bg-bg-tertiary border border-border rounded-lg"
          >
            <option value="all">ყველა სტატუსი</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        
        <Button variant="primary" onClick={() => setShowAddModal(true)}>
          + კეგის დამატება
        </Button>
      </div>
      
      {/* Kegs Table */}
      <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-bg-tertiary">
            <tr>
              <th className="text-left p-4">ID</th>
              <th className="text-left p-4">ზომა</th>
              <th className="text-left p-4">სტატუსი</th>
              <th className="text-left p-4">შიგთავსი</th>
              <th className="text-left p-4">შევსების თარიღი</th>
              <th className="text-left p-4">ლოკაცია</th>
              <th className="text-right p-4">მოქმედება</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-copper"></div>
                    <span className="ml-3 text-text-muted">იტვირთება...</span>
                  </div>
                </td>
              </tr>
            ) : filteredKegs.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-text-muted">
                  კეგები ვერ მოიძებნა
                </td>
              </tr>
            ) : (
              filteredKegs.map(keg => (
                <tr key={keg.id} className="border-t border-border hover:bg-bg-tertiary/50">
                  <td className="p-4 font-mono text-sm text-copper-light">{keg.kegNumber}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-bg-tertiary rounded">
                      🛢️ {keg.size}L
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-white text-sm ${statusColors[keg.status] || 'bg-gray-500'}`}>
                      {statusLabels[keg.status] || keg.status}
                    </span>
                  </td>
                  <td className="p-4">
                    {keg.productName || '-'}
                  </td>
                  <td className="p-4 text-sm text-text-muted">
                    {keg.filledAt ? formatDate(new Date(keg.filledAt)) : '-'}
                  </td>
                  <td className="p-4 text-sm">
                    {keg.customerName || '-'}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <select
                        value={keg.status}
                        onChange={(e) => handleUpdateStatus(keg.id, e.target.value)}
                        className="px-2 py-1 bg-bg-tertiary border border-border rounded text-sm"
                      >
                        {Object.entries(statusLabels).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleDeleteKeg(keg.id, keg.kegNumber)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
                        title="წაშლა"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Add Keg Modal */}
      {showAddModal && (
        <AddKegModal 
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddKeg}
          suppliers={suppliers}
          onSupplierCreated={fetchSuppliers}
        />
      )}
    </div>
  )
}

// Add Keg Modal with Expense Options
function AddKegModal({ 
  onClose, 
  onAdd,
  suppliers,
  onSupplierCreated,
}: { 
  onClose: () => void
  onAdd: (data: {
    size: number
    quantity: number
    notes?: string
    costPerUnit?: number
    supplierId?: string
    invoiceNumber?: string
    createExpense?: boolean
    isPaid?: boolean
    paymentMethod?: string
  }) => Promise<void>
  suppliers: Supplier[]
  onSupplierCreated: () => void
}) {
  const [size, setSize] = useState<number>(30)
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
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

  const paymentMethods = [
    { value: 'BANK_TRANSFER', label: '🏦 გადარიცხვა' },
    { value: 'CASH', label: '💵 ნაღდი' },
    { value: 'CARD', label: '💳 ბარათი' },
    { value: 'CHECK', label: '📝 ჩეკი' },
  ]

  const totalAmount = quantity * (parseFloat(costPerUnit) || 0)

  const handleCreateSupplier = async () => {
    if (!newSupplierName.trim()) return
    
    try {
      const response = await fetch('/api/finances/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSupplierName.trim(),
          category: 'equipment',
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
  
  const handleAdd = async () => {
    if (quantity < 1) {
      alert('რაოდენობა უნდა იყოს მინიმუმ 1')
      return
    }
    if (createExpense && (!costPerUnit || parseFloat(costPerUnit) <= 0)) {
      alert('ხარჯის დასაფიქსირებლად საჭიროა ფასის მითითება')
      return
    }
    setIsSubmitting(true)
    await onAdd({ 
      size, 
      quantity, 
      notes,
      costPerUnit: costPerUnit ? parseFloat(costPerUnit) : undefined,
      supplierId: supplierId || undefined,
      invoiceNumber: invoiceNumber || undefined,
      createExpense,
      isPaid,
      paymentMethod,
    })
    setIsSubmitting(false)
  }
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4 text-white">🛢️ კეგის დამატება</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">ზომა</label>
            <div className="flex gap-2">
              {[20, 30, 50].map(s => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`flex-1 py-3 rounded-lg font-bold ${
                    size === s ? 'bg-copper text-white' : 'bg-slate-700 text-white'
                  }`}
                >
                  {s}L
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm text-slate-400 mb-2">რაოდენობა</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full px-4 py-2 bg-slate-700 rounded-lg text-white"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">
              ფასი (₾/კეგი) {createExpense && <span className="text-red-400">*</span>}
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={costPerUnit}
              onChange={(e) => setCostPerUnit(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-2 bg-slate-700 rounded-lg text-white"
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
                {/* Supplier */}
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
                    className="w-full px-4 py-2 bg-slate-700 rounded-lg text-white"
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
                      className="w-full px-4 py-2 bg-slate-700 rounded-lg text-white"
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
            <label className="block text-sm text-slate-400 mb-2">შენიშვნა</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="დამატებითი ინფორმაცია..."
              rows={2}
              className="w-full px-4 py-2 bg-slate-700 rounded-lg text-white placeholder-slate-400 resize-none"
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
                🛢️ {quantity} x {size}L კეგი
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>გაუქმება</Button>
          <Button variant="primary" onClick={handleAdd} disabled={isSubmitting}>
            {isSubmitting ? 'დამატება...' : `დამატება (${quantity} კეგი)`}
          </Button>
        </div>
      </div>
    </div>
  )
}