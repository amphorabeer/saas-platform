'use client'

import { useState } from 'react'
import { Button } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'

interface Invoice {
  id: string
  invoiceNumber: string
  total: number
  paidAmount: number
  remaining: number
  customerName?: string
  supplierName?: string
}

interface InvoicePaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: PaymentData) => void
  invoice: Invoice | null
}

export interface PaymentData {
  invoiceId: string
  amount: number
  method: string
  date: string
  reference?: string
}

const paymentMethods = [
  { value: 'BANK_TRANSFER', label: '🏦 გადარიცხვა' },
  { value: 'CASH', label: '💵 ნაღდი' },
  { value: 'CARD', label: '💳 ბარათი' },
]

export function InvoicePaymentModal({ isOpen, onClose, onSubmit, invoice }: InvoicePaymentModalProps) {
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('BANK_TRANSFER')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)

  if (!isOpen || !invoice) return null

  const remaining = invoice.remaining || (invoice.total - invoice.paidAmount)
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
        invoiceId: invoice.id,
        amount: parsedAmount,
        method,
        date,
      })
      setAmount('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-bg-card border border-border rounded-2xl w-full max-w-sm">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-text-primary">💳 გადახდა</h2>
            <p className="text-text-muted text-sm">{invoice.invoiceNumber}</p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-xl">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Summary */}
          <div className="flex justify-between items-center p-3 bg-bg-tertiary rounded-lg">
            <div>
              <div className="text-xs text-text-muted">დარჩენილი</div>
              <div className="text-xl font-bold text-copper">{formatCurrency(remaining)}</div>
            </div>
            <Button type="button" size="sm" variant="secondary" onClick={() => setAmount(remaining.toFixed(2))}>
              სრულად
            </Button>
          </div>

          {/* Amount + Method in one row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-muted mb-1">თანხა *</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  max={remaining}
                  required
                  className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary pr-6 text-sm"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted text-sm">₾</span>
              </div>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">მეთოდი</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary text-sm"
              >
                {paymentMethods.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs text-text-muted mb-1">თარიღი</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary text-sm"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading} className="flex-1">
              გაუქმება
            </Button>
            <Button type="submit" disabled={loading || parsedAmount <= 0} className="flex-1">
              {loading ? '...' : '💳 გადახდა'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
