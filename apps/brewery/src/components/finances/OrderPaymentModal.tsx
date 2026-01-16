'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'

interface Order {
  id: string
  orderNumber: string
  customerName: string
  totalAmount: number
  paidAmount?: number
  paymentStatus: string
}

interface OrderPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: PaymentFormData) => void
  order: Order | null
}

export interface PaymentFormData {
  orderId: string
  amount: number
  method: string
  date: string
  reference?: string
  notes?: string
}

const paymentMethods = [
  { value: 'BANK_TRANSFER', label: '🏦 ბანკის გადარიცხვა', icon: '🏦' },
  { value: 'CASH', label: '💵 ნაღდი ფული', icon: '💵' },
  { value: 'CARD', label: '💳 საბანკო ბარათი', icon: '💳' },
  { value: 'CHECK', label: '📝 ჩეკი', icon: '📝' },
]

export function OrderPaymentModal({ isOpen, onClose, onSubmit, order }: OrderPaymentModalProps) {
  const [paymentType, setPaymentType] = useState<'full' | 'partial'>('full')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('BANK_TRANSFER')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)

  // Reset form when order changes
  useEffect(() => {
    if (order) {
      const remaining = order.totalAmount - (order.paidAmount || 0)
      setAmount(remaining.toFixed(2))
      setPaymentType('full')
    }
  }, [order])

  if (!isOpen || !order) return null

  const totalAmount = order.totalAmount
  const paidAmount = order.paidAmount || 0
  const remaining = totalAmount - paidAmount
  const parsedAmount = parseFloat(amount) || 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (parsedAmount <= 0 || parsedAmount > remaining) {
      alert(`შეიყვანეთ თანხა 0-დან ${remaining.toFixed(2)}-მდე`)
      return
    }

    setLoading(true)
    try {
      await onSubmit({
        orderId: order.id,
        amount: parsedAmount,
        method,
        date,
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentTypeChange = (type: 'full' | 'partial') => {
    setPaymentType(type)
    if (type === 'full') {
      setAmount(remaining.toFixed(2))
    } else {
      setAmount('')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-bg-card border border-border rounded-2xl w-full max-w-md">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              💳 გადახდის რეგისტრაცია
            </h2>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-2xl">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Order Info */}
          <div className="grid grid-cols-2 gap-4 p-3 bg-bg-tertiary rounded-lg">
            <div>
              <div className="text-xs text-text-muted">შეკვეთა</div>
              <div className="font-semibold text-text-primary">{order.orderNumber}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-text-muted">კლიენტი</div>
              <div className="font-semibold text-text-primary">{order.customerName}</div>
            </div>
          </div>

          {/* Amount Summary */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-bg-tertiary rounded-lg">
              <div className="text-xs text-text-muted">სულ თანხა</div>
              <div className="font-bold text-text-primary">{formatCurrency(totalAmount)}</div>
            </div>
            <div className="p-2 bg-bg-tertiary rounded-lg">
              <div className="text-xs text-text-muted">გადახდილი</div>
              <div className="font-bold text-green-400">{formatCurrency(paidAmount)}</div>
            </div>
            <div className="p-2 bg-bg-tertiary rounded-lg">
              <div className="text-xs text-text-muted">დარჩენილი</div>
              <div className="font-bold text-copper">{formatCurrency(remaining)}</div>
            </div>
          </div>

          {/* Payment Type Selection */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">გადახდის ტიპი</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handlePaymentTypeChange('full')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  paymentType === 'full'
                    ? 'border-green-400 bg-green-400/10'
                    : 'border-border hover:border-text-muted'
                }`}
              >
                <div className="text-2xl mb-1">✅</div>
                <div className="font-medium text-text-primary text-sm">სრული გადახდა</div>
                <div className="text-xs text-text-muted">{formatCurrency(remaining)}</div>
              </button>
              <button
                type="button"
                onClick={() => handlePaymentTypeChange('partial')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  paymentType === 'partial'
                    ? 'border-amber-400 bg-amber-400/10'
                    : 'border-border hover:border-text-muted'
                }`}
              >
                <div className="text-2xl mb-1">📊</div>
                <div className="font-medium text-text-primary text-sm">ნაწილობრივი</div>
                <div className="text-xs text-text-muted">თანხის მითითება</div>
              </button>
            </div>
          </div>

          {/* Amount Input (for partial) */}
          {paymentType === 'partial' && (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                თანხა <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  max={remaining}
                  required
                  placeholder="0.00"
                  className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">₾</span>
              </div>
            </div>
          )}

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              გადახდის მეთოდი <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {paymentMethods.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMethod(m.value)}
                  className={`p-2 rounded-lg border-2 transition-all flex items-center gap-2 ${
                    method === m.value
                      ? 'border-copper bg-copper/10'
                      : 'border-border hover:border-text-muted'
                  }`}
                >
                  <span className="text-lg">{m.icon}</span>
                  <span className="text-sm text-text-primary">{m.label.split(' ').slice(1).join(' ')}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              გადახდის თარიღი <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading} className="flex-1">
              გაუქმება
            </Button>
            <Button type="submit" disabled={loading || parsedAmount <= 0 || parsedAmount > remaining} className="flex-1">
              {loading ? '⏳...' : '💳 გადახდა'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
