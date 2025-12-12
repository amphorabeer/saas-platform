'use client'

import { useState } from 'react'
import { Button } from '@/components/ui'
import { Transaction, TransactionType, IncomeCategory, ExpenseCategory, PaymentMethod } from '@/data/financeData'
import { incomeCategoryConfig, expenseCategoryConfig, mockSuppliers, mockCustomers } from '@/data/financeData'
import { formatDate } from '@/lib/utils'

interface TransactionModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (transaction: Partial<Transaction>) => void
  transaction?: Transaction
}

export function TransactionModal({ isOpen, onClose, onSubmit, transaction }: TransactionModalProps) {
  const [type, setType] = useState<TransactionType>(transaction?.type || 'income')
  const [date, setDate] = useState(transaction?.date ? transaction.date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0])
  const [category, setCategory] = useState<IncomeCategory | ExpenseCategory>(transaction?.category || 'sale')
  const [amount, setAmount] = useState(transaction?.amount?.toString() || '')
  const [description, setDescription] = useState(transaction?.description || '')
  const [customerId, setCustomerId] = useState(transaction?.customerId || '')
  const [supplierName, setSupplierName] = useState(transaction?.supplierName || '')
  const [orderNumber, setOrderNumber] = useState(transaction?.orderNumber || '')
  const [invoiceNumber, setInvoiceNumber] = useState(transaction?.invoiceNumber || '')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(transaction?.paymentMethod || 'bank_transfer')
  const [notes, setNotes] = useState(transaction?.notes || '')

  if (!isOpen) return null

  const handleSubmit = () => {
    onSubmit({
      type,
      date: new Date(date),
      category,
      amount: parseFloat(amount),
      description,
      customerId: customerId || undefined,
      customerName: customerId ? mockCustomers.find(c => c.id === customerId)?.name : undefined,
      supplierName: supplierName || undefined,
      orderNumber: orderNumber || undefined,
      invoiceNumber: invoiceNumber || undefined,
      paymentMethod,
      notes: notes || undefined,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-bold text-text-primary">
            {transaction ? '✏️ ტრანზაქციის რედაქტირება' : '➕ ახალი ტრანზაქცია'}
          </h2>
        </div>

        <div className="p-6 space-y-6">
          {/* Transaction Type */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">ტრანზაქციის ტიპი</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={type === 'income'}
                  onChange={() => setType('income')}
                  className="w-4 h-4"
                />
                <span>💰 შემოსავალი</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={type === 'expense'}
                  onChange={() => setType('expense')}
                  className="w-4 h-4"
                />
                <span>📉 ხარჯი</span>
              </label>
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">თარიღი</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">კატეგორია</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as IncomeCategory | ExpenseCategory)}
              className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
            >
              {type === 'income' ? (
                <>
                  <option value="sale">გაყიდვა</option>
                  <option value="deposit">დეპოზიტი</option>
                  <option value="refund">დაბრუნება</option>
                  <option value="other">სხვა</option>
                </>
              ) : (
                <>
                  <option value="ingredients">🌾 ინგრედიენტები</option>
                  <option value="packaging">📦 შეფუთვა</option>
                  <option value="equipment">⚙️ აღჭურვილობა</option>
                  <option value="utilities">💡 კომუნალური</option>
                  <option value="salary">👥 ხელფასი</option>
                  <option value="rent">🏠 იჯარა</option>
                  <option value="marketing">📢 მარკეტინგი</option>
                  <option value="other">📝 სხვა</option>
                </>
              )}
            </select>
          </div>

          {/* Customer/Supplier */}
          {type === 'income' ? (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">კლიენტი</label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
              >
                <option value="">აირჩიეთ კლიენტი</option>
                {mockCustomers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">მომწოდებელი</label>
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="მომწოდებლის სახელი"
                className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
              />
            </div>
          )}

          {/* Order Number (for income) */}
          {type === 'income' && category === 'sale' && (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">შეკვეთის ნომერი (optional)</label>
              <input
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="ORD-2024-0045"
                className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
              />
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">თანხა</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">აღწერა</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ტრანზაქციის აღწერა"
              className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
            />
          </div>

          {/* Invoice Number */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">ინვოისის ნომერი (optional)</label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="INV-S-089"
              className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
            />
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
          <Button onClick={handleSubmit}>შენახვა</Button>
        </div>
      </div>
    </div>
  )
}

