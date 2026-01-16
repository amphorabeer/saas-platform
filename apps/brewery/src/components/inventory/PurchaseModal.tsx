'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'

interface InventoryItem {
  id: string
  name: string
  unit: string
  category: string
  balance: number
  costPerUnit: number | null
  supplier: string | null
}

interface Supplier {
  id: string
  name: string
  category: string | null
}

interface PurchaseModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: PurchaseFormData) => void
  item?: InventoryItem | null
  items?: InventoryItem[]
  suppliers?: Supplier[]
  onSupplierCreated?: () => void  // callback to refresh suppliers
}

export interface PurchaseFormData {
  itemId: string
  quantity: number
  unitPrice: number
  totalAmount: number
  supplierId?: string
  date: string
  invoiceNumber?: string
  notes?: string
  createExpense: boolean
  isPaid: boolean
  paymentMethod?: string
}

const paymentMethods = [
  { value: 'BANK_TRANSFER', label: '🏦 გადარიცხვა' },
  { value: 'CASH', label: '💵 ნაღდი' },
  { value: 'CARD', label: '💳 ბარათი' },
  { value: 'CHECK', label: '📝 ჩეკი' },
]

export function PurchaseModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  item, 
  items = [], 
  suppliers = [],
  onSupplierCreated,
}: PurchaseModalProps) {
  const [formData, setFormData] = useState<PurchaseFormData>({
    itemId: '',
    quantity: 0,
    unitPrice: 0,
    totalAmount: 0,
    supplierId: '',
    date: new Date().toISOString().split('T')[0],
    invoiceNumber: '',
    notes: '',
    createExpense: true,
    isPaid: false,
    paymentMethod: 'BANK_TRANSFER',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [showNewSupplierInput, setShowNewSupplierInput] = useState(false)
  const [newSupplierName, setNewSupplierName] = useState('')

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      const defaultItem = item || null
      setSelectedItem(defaultItem)
      setFormData({
        itemId: defaultItem?.id || '',
        quantity: 0,
        unitPrice: defaultItem?.costPerUnit || 0,
        totalAmount: 0,
        supplierId: '',
        date: new Date().toISOString().split('T')[0],
        invoiceNumber: '',
        notes: '',
        createExpense: true,
        isPaid: false,
        paymentMethod: 'BANK_TRANSFER',
      })
      setErrors({})
      setShowNewSupplierInput(false)
      setNewSupplierName('')
    }
  }, [isOpen, item])

  // Calculate total when quantity or unitPrice changes
  useEffect(() => {
    const total = formData.quantity * formData.unitPrice
    setFormData(prev => ({ ...prev, totalAmount: total }))
  }, [formData.quantity, formData.unitPrice])

  // Update selected item when itemId changes
  useEffect(() => {
    if (formData.itemId && items.length > 0) {
      const found = items.find(i => i.id === formData.itemId)
      if (found) {
        setSelectedItem(found)
        setFormData(prev => ({
          ...prev,
          unitPrice: found.costPerUnit || prev.unitPrice,
        }))
      }
    }
  }, [formData.itemId, items])

  if (!isOpen) return null

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.itemId) {
      newErrors.itemId = 'პროდუქტი სავალდებულოა'
    }
    if (!formData.quantity || formData.quantity <= 0) {
      newErrors.quantity = 'რაოდენობა უნდა იყოს 0-ზე მეტი'
    }
    if (formData.createExpense && (!formData.unitPrice || formData.unitPrice <= 0)) {
      newErrors.unitPrice = 'ერთეულის ფასი სავალდებულოა'
    }
    if (!formData.date) {
      newErrors.date = 'თარიღი სავალდებულოა'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      await onSubmit(formData)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (field: keyof PurchaseFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleCreateSupplier = async () => {
    if (!newSupplierName.trim()) return
    
    try {
      const response = await fetch('/api/finances/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSupplierName.trim(),
          category: 'ingredients', // Default for inventory purchases
        }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create supplier')
      }
      
      const data = await response.json()
      
      // Select the new supplier
      handleChange('supplierId', data.supplier.id)
      
      // Reset input
      setShowNewSupplierInput(false)
      setNewSupplierName('')
      
      // Refresh suppliers list from parent
      if (onSupplierCreated) {
        onSupplierCreated()
      }
      
      alert('✅ მომწოდებელი დაემატა!')
      
    } catch (err: any) {
      console.error('Create supplier error:', err)
      alert(err.message || 'მომწოდებლის დამატება ვერ მოხერხდა')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-bg-card border border-border rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-text-primary">
              📦 ახალი შესყიდვა
            </h2>
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text-primary transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Product Selection */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              პროდუქტი <span className="text-red-400">*</span>
            </label>
            {item ? (
              <div className="px-4 py-3 bg-bg-tertiary border border-border rounded-lg">
                <div className="font-medium text-text-primary">{item.name}</div>
                <div className="text-sm text-text-muted">
                  მარაგში: {item.balance} {item.unit}
                </div>
              </div>
            ) : (
              <select
                value={formData.itemId}
                onChange={(e) => handleChange('itemId', e.target.value)}
                className={`w-full px-4 py-3 bg-bg-tertiary border rounded-lg text-text-primary ${
                  errors.itemId ? 'border-red-400' : 'border-border'
                }`}
              >
                <option value="">-- აირჩიეთ პროდუქტი --</option>
                {items.map(i => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({i.balance} {i.unit})
                  </option>
                ))}
              </select>
            )}
            {errors.itemId && (
              <p className="mt-1 text-sm text-red-400">{errors.itemId}</p>
            )}
          </div>

          {/* Quantity & Unit Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                რაოდენობა ({selectedItem?.unit || 'ერთეული'}) <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.quantity || ''}
                onChange={(e) => handleChange('quantity', parseFloat(e.target.value) || 0)}
                placeholder="0"
                className={`w-full px-4 py-3 bg-bg-tertiary border rounded-lg text-text-primary ${
                  errors.quantity ? 'border-red-400' : 'border-border'
                }`}
              />
              {errors.quantity && (
                <p className="mt-1 text-sm text-red-400">{errors.quantity}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                ფასი / {selectedItem?.unit || 'ერთეული'} (₾) <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.unitPrice || ''}
                onChange={(e) => handleChange('unitPrice', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className={`w-full px-4 py-3 bg-bg-tertiary border rounded-lg text-text-primary ${
                  errors.unitPrice ? 'border-red-400' : 'border-border'
                }`}
              />
              {errors.unitPrice && (
                <p className="mt-1 text-sm text-red-400">{errors.unitPrice}</p>
              )}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              თარიღი <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => handleChange('date', e.target.value)}
              className={`w-full px-4 py-3 bg-bg-tertiary border rounded-lg text-text-primary ${
                errors.date ? 'border-red-400' : 'border-border'
              }`}
            />
          </div>

          {/* Supplier */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              მომწოდებელი
            </label>
            <div className="flex gap-2">
              <select
                value={formData.supplierId || ''}
                onChange={(e) => handleChange('supplierId', e.target.value)}
                className="flex-1 px-4 py-3 bg-bg-tertiary border border-border rounded-lg text-text-primary"
              >
                <option value="">-- აირჩიეთ მომწოდებელი --</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowNewSupplierInput(true)}
                className="px-4 py-3 bg-bg-tertiary border border-border rounded-lg text-text-primary hover:bg-bg-secondary transition-colors"
                title="ახალი მომწოდებელი"
              >
                ➕
              </button>
            </div>
            
            {/* New Supplier Input */}
            {showNewSupplierInput && (
              <div className="mt-3 p-3 bg-bg-secondary rounded-lg border border-border">
                <label className="block text-sm font-medium text-text-primary mb-2">
                  ახალი მომწოდებლის სახელი
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSupplierName}
                    onChange={(e) => setNewSupplierName(e.target.value)}
                    placeholder="მაგ: BestMalz, Barth-Haas"
                    className="flex-1 px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newSupplierName.trim()) {
                        handleCreateSupplier()
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCreateSupplier}
                    disabled={!newSupplierName.trim()}
                  >
                    შენახვა
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowNewSupplierInput(false)
                      setNewSupplierName('')
                    }}
                  >
                    ✕
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Invoice Number */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              ინვოისის ნომერი
            </label>
            <input
              type="text"
              value={formData.invoiceNumber || ''}
              onChange={(e) => handleChange('invoiceNumber', e.target.value)}
              placeholder="მაგ: INV-2024-001"
              className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-lg text-text-primary"
            />
          </div>

          {/* Expense Options */}
          <div className="p-4 bg-bg-tertiary rounded-lg space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="createExpense"
                checked={formData.createExpense}
                onChange={(e) => handleChange('createExpense', e.target.checked)}
                className="w-5 h-5 rounded border-border"
              />
              <label htmlFor="createExpense" className="text-sm font-medium text-text-primary cursor-pointer">
                📊 ხარჯად დაფიქსირება
              </label>
            </div>

            {formData.createExpense && (
              <>
                <div className="flex items-center gap-3 ml-8">
                  <input
                    type="checkbox"
                    id="isPaid"
                    checked={formData.isPaid}
                    onChange={(e) => handleChange('isPaid', e.target.checked)}
                    className="w-5 h-5 rounded border-border"
                  />
                  <label htmlFor="isPaid" className="text-sm font-medium text-text-primary cursor-pointer">
                    ✅ გადახდილია
                  </label>
                </div>

                {formData.isPaid && (
                  <div className="ml-8">
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      გადახდის მეთოდი
                    </label>
                    <select
                      value={formData.paymentMethod || 'BANK_TRANSFER'}
                      onChange={(e) => handleChange('paymentMethod', e.target.value)}
                      className="w-full px-4 py-3 bg-bg-secondary border border-border rounded-lg text-text-primary"
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

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              შენიშვნა
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={2}
              placeholder="დამატებითი ინფორმაცია..."
              className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-lg text-text-primary resize-none"
            />
          </div>

          {/* Summary */}
          {formData.totalAmount > 0 && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-text-muted">ჯამი:</span>
                <span className="text-2xl font-bold text-amber-400">
                  {formatCurrency(formData.totalAmount)}
                </span>
              </div>
              <div className="text-sm text-text-muted space-y-1">
                <div>📦 {selectedItem?.name || 'პროდუქტი'}: +{formData.quantity} {selectedItem?.unit || ''}</div>
                {formData.createExpense && (
                  <div className="text-red-400">💸 ხარჯი: {formatCurrency(formData.totalAmount)}</div>
                )}
                {selectedItem && (
                  <div className="text-green-400">
                    ახალი მარაგი: {selectedItem.balance + formData.quantity} {selectedItem.unit}
                  </div>
                )}
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-border flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            გაუქმება
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || formData.quantity <= 0}>
            {isSubmitting ? 'იტვირთება...' : '📦 შესყიდვის დაფიქსირება'}
          </Button>
        </div>
      </div>
    </div>
  )
}

