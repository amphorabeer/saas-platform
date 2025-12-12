'use client'

import { useState } from 'react'
import { Button } from '@/components/ui'
import { Invoice, Payment, PaymentMethod } from '@/data/financeData'
import { formatDate, formatCurrency } from '@/lib/utils'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (payment: Partial<Payment>) => void
  invoice: Invoice
}

export function PaymentModal({ isOpen, onClose, onSubmit, invoice }: PaymentModalProps) {
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [amount, setAmount] = useState(invoice.total - invoice.paidAmount)
  const [isFullPayment, setIsFullPayment] = useState(true)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')

  if (!isOpen) return null

  const remainingAmount = invoice.total - invoice.paidAmount

  const handleSubmit = () => {
    onSubmit({
      invoiceId: invoice.id,
      date: new Date(paymentDate),
      amount: parseFloat(amount.toString()),
      method: paymentMethod,
      reference: reference || undefined,
      notes: notes || undefined,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-bg-card border border-border rounded-2xl w-full max-w-lg">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-bold text-text-primary">💳 გადახდის რეგისტრაცია</h2>
        </div>

        <div className="p-6 space-y-6">
          {/* Invoice Info */}
          <div className="bg-bg-tertiary p-4 rounded-lg">
            <div className="text-sm text-text-muted mb-1">ინვოისი</div>
            <div className="font-semibold text-text-primary">{invoice.invoiceNumber}</div>
            {invoice.customerName && (
              <>
                <div className="text-sm text-text-muted mt-2 mb-1">კლიენტი</div>
                <div className="text-text-primary">{invoice.customerName}</div>
              </>
            )}
            {invoice.supplierName && (
              <>
                <div className="text-sm text-text-muted mt-2 mb-1">მომწოდებელი</div>
                <div className="text-text-primary">{invoice.supplierName}</div>
              </>
            )}
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-text-muted">სულ:</span>
                <span className="font-semibold text-text-primary">{formatCurrency(invoice.total)}</span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-text-muted">გადახდილი:</span>
                <span className="text-text-primary">{formatCurrency(invoice.paidAmount)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-text-muted">დარჩენილი:</span>
                <span className="text-amber-400">{formatCurrency(remainingAmount)}</span>
              </div>
            </div>
          </div>

          {/* Payment Date */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">გადახდის თარიღი</label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
            />
          </div>

          {/* Payment Type */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">გადახდის ტიპი</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={isFullPayment}
                  onChange={() => {
                    setIsFullPayment(true)
                    setAmount(remainingAmount)
                  }}
                  className="w-4 h-4"
                />
                <span>🔘 სრული გადახდა ({formatCurrency(remainingAmount)})</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!isFullPayment}
                  onChange={() => setIsFullPayment(false)}
                  className="w-4 h-4"
                />
                <span>○ ნაწილობრივი გადახდა</span>
              </label>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">გადახდის თანხა</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => {
                setAmount(parseFloat(e.target.value) || 0)
                setIsFullPayment(false)
              }}
              max={remainingAmount}
              className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
            />
            {amount > remainingAmount && (
              <p className="text-xs text-red-400 mt-1">თანხა არ შეიძლება იყოს დარჩენილ თანხაზე მეტი</p>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">გადახდის მეთოდი</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
            >
              <option value="bank_transfer">ბანკის გადარიცხვა</option>
              <option value="cash">ნაღდი</option>
              <option value="card">ბარათი</option>
            </select>
          </div>

          {/* Reference */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">რეფერენსი/ჩეკის # (optional)</label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="გადარიცხვის რეფერენსი ან ჩეკის ნომერი"
              className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">შენიშვნა</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="დამატებითი ინფორმაცია"
              className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
            />
          </div>
        </div>

        <div className="p-6 border-t border-border flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>გაუქმება</Button>
          <Button onClick={handleSubmit} disabled={amount <= 0 || amount > remainingAmount}>
            გადახდის რეგისტრაცია
          </Button>
        </div>
      </div>
    </div>
  )
}

