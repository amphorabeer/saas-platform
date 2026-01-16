'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'

interface Supplier {
  id: string
  name: string
  category: string | null
}

interface ExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (expense: ExpenseFormData) => void
  expense?: ExpenseFormData | null
  suppliers?: Supplier[]
}

export interface ExpenseFormData {
  id?: string
  category: string
  supplierId?: string
  supplierName?: string
  amount: number
  date: string
  description: string
  invoiceNumber?: string
  isPaid: boolean
  paymentMethod?: string
  notes?: string
}

const expenseCategories = [
  { value: 'INGREDIENTS', label: 'ინგრედიენტები', icon: '🌾' },
  { value: 'PACKAGING', label: 'შეფუთვა', icon: '📦' },
  { value: 'EQUIPMENT', label: 'აღჭურვილობა', icon: '⚙️' },
  { value: 'UTILITIES', label: 'კომუნალური', icon: '💡' },
  { value: 'SALARY', label: 'ხელფასი', icon: '👥' },
  { value: 'RENT', label: 'იჯარა', icon: '🏠' },
  { value: 'MARKETING', label: 'მარკეტინგი', icon: '📢' },
  { value: 'MAINTENANCE', label: 'მოვლა-შენახვა', icon: '🔧' },
  { value: 'TRANSPORT', label: 'ტრანსპორტი', icon: '🚛' },
  { value: 'OTHER', label: 'სხვა', icon: '📝' },
]

const paymentMethods = [
  { value: 'BANK_TRANSFER', label: 'ბანკის გადარიცხვა' },
  { value: 'CASH', label: 'ნაღდი ფული' },
  { value: 'CARD', label: 'საბანკო ბარათი' },
  { value: 'CHECK', label: 'ჩეკი' },
]

export function ExpenseModal({ isOpen, onClose, onSubmit, expense, suppliers = [] }: ExpenseModalProps) {
  const [formData, setFormData] = useState<ExpenseFormData>({
    category: 'INGREDIENTS',
    supplierId: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    description: '',
    invoiceNumber: '',
    isPaid: false,
    paymentMethod: '',
    notes: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset form when modal opens/closes or expense changes
  useEffect(() => {
    if (isOpen) {
      if (expense) {
        setFormData({
          ...expense,
          date: expense.date ? expense.date.split('T')[0] : new Date().toISOString().split('T')[0],
        })
      } else {
        setFormData({
          category: 'INGREDIENTS',
          supplierId: '',
          amount: 0,
          date: new Date().toISOString().split('T')[0],
          description: '',
          invoiceNumber: '',
          isPaid: false,
          paymentMethod: '',
          notes: '',
        })
      }
      setErrors({})
    }
  }, [isOpen, expense])

  if (!isOpen) return null

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.category) {
      newErrors.category = 'კატეგორია სავალდებულოა'
    }
    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'თანხა უნდა იყოს 0-ზე მეტი'
    }
    if (!formData.date) {
      newErrors.date = 'თარიღი სავალდებულოა'
    }
    if (!formData.description?.trim()) {
      newErrors.description = 'აღწერა სავალდებულოა'
    }
    if (formData.isPaid && !formData.paymentMethod) {
      newErrors.paymentMethod = 'გადახდის მეთოდი სავალდებულოა'
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

  const handleChange = (field: keyof ExpenseFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when field is changed
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const selectedCategory = expenseCategories.find(c => c.value === formData.category)

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-bg-card border border-border rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-text-primary">
              {expense?.id ? '✏️ ხარჯის რედაქტირება' : '➕ ახალი ხარჯი'}
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
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              კატეგორია <span className="text-red-400">*</span>
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
              className={`w-full px-4 py-3 bg-bg-tertiary border rounded-lg text-text-primary ${
                errors.category ? 'border-red-400' : 'border-border'
              }`}
            >
              {expenseCategories.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.icon} {cat.label}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="mt-1 text-sm text-red-400">{errors.category}</p>
            )}
          </div>

          {/* Amount & Date Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                თანხა (₾) <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.amount || ''}
                onChange={(e) => handleChange('amount', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className={`w-full px-4 py-3 bg-bg-tertiary border rounded-lg text-text-primary ${
                  errors.amount ? 'border-red-400' : 'border-border'
                }`}
              />
              {errors.amount && (
                <p className="mt-1 text-sm text-red-400">{errors.amount}</p>
              )}
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
              {errors.date && (
                <p className="mt-1 text-sm text-red-400">{errors.date}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              აღწერა <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="მაგ: Pilsner Malt 500kg, ელექტროენერგია დეკემბერი"
              className={`w-full px-4 py-3 bg-bg-tertiary border rounded-lg text-text-primary ${
                errors.description ? 'border-red-400' : 'border-border'
              }`}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-400">{errors.description}</p>
            )}
          </div>

          {/* Supplier */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              მომწოდებელი
            </label>
            {suppliers.length > 0 ? (
              <select
                value={formData.supplierId || ''}
                onChange={(e) => handleChange('supplierId', e.target.value)}
                className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-lg text-text-primary"
              >
                <option value="">-- აირჩიეთ მომწოდებელი --</option>
                {suppliers.map(supplier => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={formData.supplierName || ''}
                onChange={(e) => handleChange('supplierName', e.target.value)}
                placeholder="მომწოდებლის სახელი"
                className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-lg text-text-primary"
              />
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

          {/* Payment Status */}
          <div className="p-4 bg-bg-tertiary rounded-lg space-y-4">
            <div className="flex items-center gap-3">
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
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  გადახდის მეთოდი <span className="text-red-400">*</span>
                </label>
                <select
                  value={formData.paymentMethod || ''}
                  onChange={(e) => handleChange('paymentMethod', e.target.value)}
                  className={`w-full px-4 py-3 bg-bg-secondary border rounded-lg text-text-primary ${
                    errors.paymentMethod ? 'border-red-400' : 'border-border'
                  }`}
                >
                  <option value="">-- აირჩიეთ მეთოდი --</option>
                  {paymentMethods.map(method => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
                {errors.paymentMethod && (
                  <p className="mt-1 text-sm text-red-400">{errors.paymentMethod}</p>
                )}
              </div>
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
          {formData.amount > 0 && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-text-muted">ჯამი:</span>
                <span className="text-xl font-bold text-red-400">
                  {formatCurrency(formData.amount)}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2 text-sm text-text-muted">
                <span>{selectedCategory?.icon}</span>
                <span>{selectedCategory?.label}</span>
                {formData.isPaid && <span className="text-green-400">• გადახდილი</span>}
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-border flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            გაუქმება
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'იტვირთება...' : expense?.id ? 'განახლება' : 'დამატება'}
          </Button>
        </div>
      </div>
    </div>
  )
}


