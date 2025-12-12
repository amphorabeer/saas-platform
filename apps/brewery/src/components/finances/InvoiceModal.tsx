'use client'

import { useState } from 'react'
import { Button } from '@/components/ui'
import { Invoice, InvoiceItem, InvoiceType, PaymentStatus } from '@/data/financeData'
import { formatDate, formatCurrency } from '@/lib/utils'
import { mockCustomers, mockSuppliers } from '@/data/financeData'

interface InvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (invoice: Partial<Invoice>) => void
  onDelete?: () => void
  invoice?: Invoice
  mode?: 'view' | 'create' | 'edit'
}

export function InvoiceModal({ isOpen, onClose, onSubmit, onDelete, invoice, mode: initialMode }: InvoiceModalProps) {
  const [mode, setMode] = useState<'view' | 'create' | 'edit'>(initialMode || (invoice ? 'view' : 'create'))
  const [invoiceType, setInvoiceType] = useState<InvoiceType>(invoice?.type || 'outgoing')
  const [date, setDate] = useState(invoice?.date ? invoice.date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState(invoice?.dueDate ? invoice.dueDate.toISOString().split('T')[0] : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
  const [customerId, setCustomerId] = useState(invoice?.customerId || '')
  const [supplierName, setSupplierName] = useState(invoice?.supplierName || '')
  const [invoiceNumber, setInvoiceNumber] = useState(invoice?.invoiceNumber || '')
  const [items, setItems] = useState<InvoiceItem[]>(invoice?.items || [])
  const [discount, setDiscount] = useState(invoice?.discount || 0)
  const [notes, setNotes] = useState(invoice?.notes || '')

  const [newItemDescription, setNewItemDescription] = useState('')
  const [newItemQuantity, setNewItemQuantity] = useState('1')
  const [newItemPrice, setNewItemPrice] = useState('')

  if (!isOpen) return null

  const subtotal = items.reduce((sum, item) => sum + item.total, 0)
  const total = subtotal - discount

  const handleAddItem = () => {
    if (!newItemDescription || !newItemQuantity || !newItemPrice) return

    const quantity = parseFloat(newItemQuantity)
    const unitPrice = parseFloat(newItemPrice)
    const itemTotal = quantity * unitPrice

    setItems([...items, {
      id: Date.now().toString(),
      description: newItemDescription,
      quantity,
      unitPrice,
      total: itemTotal,
    }])

    setNewItemDescription('')
    setNewItemQuantity('1')
    setNewItemPrice('')
  }

  const handleRemoveItem = (itemId: string) => {
    setItems(items.filter(item => item.id !== itemId))
  }

  const handleSubmit = () => {
    onSubmit({
      type: invoiceType,
      date: new Date(date),
      dueDate: new Date(dueDate),
      customerId: invoiceType === 'outgoing' ? customerId : undefined,
      customerName: invoiceType === 'outgoing' && customerId ? mockCustomers.find(c => c.id === customerId)?.name : undefined,
      supplierName: invoiceType === 'incoming' ? supplierName : undefined,
      invoiceNumber: invoiceNumber || undefined,
      items,
      subtotal,
      discount,
      total,
      paidAmount: invoice?.paidAmount || 0,
      status: invoice?.status || 'pending',
      payments: invoice?.payments || [],
      notes: notes || undefined,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-bg-card border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-bold text-text-primary">
            {mode === 'view' ? `🧾 ინვოისი ${invoice?.invoiceNumber || ''}` : mode === 'edit' ? '✏️ ინვოისის რედაქტირება' : '➕ ახალი ინვოისი'}
          </h2>
        </div>

        {mode === 'view' && invoice ? (
          <>
            <div className="p-6 space-y-6">
              {/* Invoice Header */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-sm text-text-muted mb-1">გამგზავნი</div>
                  <div className="font-semibold text-text-primary">BrewMaster PRO</div>
                  <div className="text-sm text-text-muted">თბილისი, საქართველო</div>
                  <div className="text-sm text-text-muted">+995 555 123 456</div>
                </div>
                <div>
                  <div className="text-sm text-text-muted mb-1">მიმღები</div>
                  {invoice.customerName && (
                    <>
                      <div className="font-semibold text-text-primary">{invoice.customerName}</div>
                      {invoice.customerAddress && (
                        <div className="text-sm text-text-muted">{invoice.customerAddress}</div>
                      )}
                    </>
                  )}
                  {invoice.supplierName && (
                    <>
                      <div className="font-semibold text-text-primary">{invoice.supplierName}</div>
                    </>
                  )}
                </div>
              </div>

              {/* Invoice Dates */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-sm text-text-muted mb-1">თარიღი</div>
                  <div className="text-text-primary">{formatDate(invoice.date)}</div>
                </div>
                <div>
                  <div className="text-sm text-text-muted mb-1">ვადა</div>
                  <div className="text-text-primary">{formatDate(invoice.dueDate)}</div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-bg-tertiary">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">#</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">პროდუქტი</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-text-primary">რაოდენობა</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-text-primary">ფასი</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-text-primary">სულ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item, index) => (
                      <tr key={item.id} className="border-t border-border">
                        <td className="px-4 py-3 text-text-muted">{index + 1}</td>
                        <td className="px-4 py-3 text-text-primary">{item.description}</td>
                        <td className="px-4 py-3 text-right text-text-primary">{item.quantity}</td>
                        <td className="px-4 py-3 text-right text-text-primary">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-4 py-3 text-right text-text-primary font-semibold">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-text-muted">
                    <span>ქვეჯამი:</span>
                    <span>{formatCurrency(invoice.subtotal)}</span>
                  </div>
                  {invoice.discount > 0 && (
                    <div className="flex justify-between text-text-muted">
                      <span>ფასდაკლება:</span>
                      <span>{formatCurrency(invoice.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold text-text-primary pt-2 border-t border-border">
                    <span>სულ:</span>
                    <span>{formatCurrency(invoice.total)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Status */}
              <div className="bg-bg-tertiary p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-text-muted mb-1">გადახდის სტატუსი</div>
                    <div className={`inline-block px-3 py-1 rounded-lg text-sm font-medium ${
                      invoice.status === 'paid' ? 'bg-green-400/20 text-green-400' :
                      invoice.status === 'pending' ? 'bg-gray-400/20 text-gray-400' :
                      invoice.status === 'partial' ? 'bg-amber-400/20 text-amber-400' :
                      'bg-red-400/20 text-red-400'
                    }`}>
                      {invoice.status === 'paid' ? '✅ გადახდილი' :
                       invoice.status === 'pending' ? '⏳ მოლოდინში' :
                       invoice.status === 'partial' ? '🔄 ნაწილობრივ' :
                       '❌ ვადაგადაცილებული'}
                    </div>
                  </div>
                  {invoice.payments.length > 0 && (
                    <div>
                      <div className="text-sm text-text-muted mb-1">გადახდის თარიღი</div>
                      <div className="text-text-primary">{formatDate(invoice.payments[0].date)}</div>
                      <div className="text-sm text-text-muted mt-1">მეთოდი: {invoice.payments[0].method === 'bank_transfer' ? 'ბანკის გადარიცხვა' : invoice.payments[0].method === 'cash' ? 'ნაღდი' : 'ბარათი'}</div>
                    </div>
                  )}
                </div>
              </div>

              {invoice.notes && (
                <div>
                  <div className="text-sm text-text-muted mb-1">შენიშვნა</div>
                  <div className="text-text-primary">{invoice.notes}</div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-border flex justify-end gap-3">
              <Button variant="secondary" onClick={onClose}>დახურვა</Button>
              <Button variant="secondary" onClick={() => setMode('edit')}>✏️ რედაქტირება</Button>
              <Button variant="secondary">📄 PDF</Button>
              {onDelete && (
                <Button variant="danger" onClick={onDelete}>🗑️ წაშლა</Button>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="p-6 space-y-6">
              {/* Invoice Type */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">ინვოისის ტიპი</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={invoiceType === 'outgoing'}
                      onChange={() => setInvoiceType('outgoing')}
                      className="w-4 h-4"
                    />
                    <span>📤 გასაგზავნი (კლიენტს)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={invoiceType === 'incoming'}
                      onChange={() => setInvoiceType('incoming')}
                      className="w-4 h-4"
                    />
                    <span>📥 მიღებული (მომწოდებლისგან)</span>
                  </label>
                </div>
              </div>

              {/* Customer/Supplier */}
              {invoiceType === 'outgoing' ? (
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

              {/* Invoice Number */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">ინვოისის ნომერი</label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder={invoiceType === 'outgoing' ? 'INV-S-089' : 'INV-045'}
                  className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">თარიღი</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">გადახდის ვადა</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                  />
                </div>
              </div>

              {/* Items */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">პროდუქტები/მომსახურება</label>
                <div className="border border-border rounded-lg p-4 space-y-4">
                  {items.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-4 bg-bg-tertiary p-3 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-text-primary">{item.description}</div>
                        <div className="text-sm text-text-muted">
                          {item.quantity} × {formatCurrency(item.unitPrice)} = {formatCurrency(item.total)}
                        </div>
                      </div>
                      <Button variant="danger" size="sm" onClick={() => handleRemoveItem(item.id)}>წაშლა</Button>
                    </div>
                  ))}

                  <div className="border-t border-border pt-4 space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <input
                        type="text"
                        value={newItemDescription}
                        onChange={(e) => setNewItemDescription(e.target.value)}
                        placeholder="აღწერა"
                        className="px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                      />
                      <input
                        type="number"
                        value={newItemQuantity}
                        onChange={(e) => setNewItemQuantity(e.target.value)}
                        placeholder="რაოდენობა"
                        className="px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                      />
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={newItemPrice}
                          onChange={(e) => setNewItemPrice(e.target.value)}
                          placeholder="ფასი"
                          className="flex-1 px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                        />
                        <Button onClick={handleAddItem} size="sm">+</Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-text-muted">
                    <span>ქვეჯამი:</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-24 px-3 py-1 bg-bg-tertiary border border-border rounded-lg text-text-primary text-sm"
                    />
                    <span className="text-text-muted text-sm">₾ ფასდაკლება</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-text-primary pt-2 border-t border-border">
                    <span>სულ:</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>
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
          </>
        )}
      </div>
    </div>
  )
}

