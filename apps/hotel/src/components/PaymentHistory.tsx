'use client'

import React, { useState, useEffect } from 'react'
import moment from 'moment'
import { PaymentService } from '../services/PaymentService'

interface PaymentHistoryProps {
  reservationId?: string
}

export default function PaymentHistory({ reservationId }: PaymentHistoryProps) {
  const [payments, setPayments] = useState<any[]>([])
  const [filter, setFilter] = useState('all')
  const [dateRange, setDateRange] = useState({
    from: moment().subtract(7, 'days').format('YYYY-MM-DD'),
    to: moment().format('YYYY-MM-DD')
  })
  
  useEffect(() => {
    loadPayments()
  }, [reservationId, filter, dateRange])
  
  const loadPayments = () => {
    if (typeof window === 'undefined') return
    
    const history = JSON.parse(localStorage.getItem('paymentHistory') || '[]')
    
    let filtered = history
    
    // Filter by reservation
    if (reservationId) {
      filtered = filtered.filter((p: any) => p.reservationId === reservationId)
    }
    
    // Filter by date
    filtered = filtered.filter((p: any) => 
      moment(p.date).isBetween(dateRange.from, dateRange.to, 'day', '[]')
    )
    
    // Filter by type
    if (filter !== 'all') {
      filtered = filtered.filter((p: any) => p.paymentMethod === filter)
    }
    
    // Sort by date desc
    filtered.sort((a: any, b: any) => 
      moment(b.date + ' ' + b.time).valueOf() - moment(a.date + ' ' + a.time).valueOf()
    )
    
    setPayments(filtered)
  }
  
  const totalAmount = payments.reduce((sum, p) => {
    const credit = p.credit || 0
    const debit = p.debit || 0
    return sum + (credit - debit)
  }, 0)
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-bold mb-4">💳 Payment History</h2>
      
      {/* Filters */}
      <div className="flex gap-4 mb-4 flex-wrap">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="all">All Methods</option>
          {PaymentService.PAYMENT_METHODS.map(method => (
            <option key={method.id} value={method.id}>{method.name}</option>
          ))}
        </select>
        
        <input
          type="date"
          value={dateRange.from}
          onChange={(e) => setDateRange({...dateRange, from: e.target.value})}
          className="border rounded px-3 py-2"
        />
        
        <input
          type="date"
          value={dateRange.to}
          onChange={(e) => setDateRange({...dateRange, to: e.target.value})}
          className="border rounded px-3 py-2"
        />
      </div>
      
      {/* Summary */}
      <div className="bg-gray-50 p-4 rounded mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-600">Total Payments</div>
            <div className="text-xl font-bold">
              {payments.filter(p => (p.credit || 0) > 0).length}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Total Refunds</div>
            <div className="text-xl font-bold text-red-600">
              {payments.filter(p => (p.debit || 0) > 0).length}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Total Amount</div>
            <div className="text-xl font-bold text-green-600">
              ₾{totalAmount.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Average Payment</div>
            <div className="text-xl font-bold">
              ₾{payments.length > 0 ? (totalAmount / payments.length).toFixed(2) : '0.00'}
            </div>
          </div>
        </div>
      </div>
      
      {/* Payment List */}
      <div className="overflow-auto max-h-96">
        {payments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No payments found for the selected criteria
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left text-sm">Date/Time</th>
                {!reservationId && (
                  <>
                    <th className="px-4 py-2 text-left text-sm">Guest</th>
                    <th className="px-4 py-2 text-left text-sm">Room</th>
                  </>
                )}
                <th className="px-4 py-2 text-left text-sm">Method</th>
                <th className="px-4 py-2 text-left text-sm">Reference</th>
                <th className="px-4 py-2 text-left text-sm">Type</th>
                <th className="px-4 py-2 text-right text-sm">Amount</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment, i) => (
                <tr key={i} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm">
                    {moment(payment.date).format('DD/MM/YY')} {payment.time?.substring(0, 5) || ''}
                  </td>
                  {!reservationId && (
                    <>
                      <td className="px-4 py-2">{payment.guestName || '-'}</td>
                      <td className="px-4 py-2">{payment.roomNumber || '-'}</td>
                    </>
                  )}
                  <td className="px-4 py-2">
                    {PaymentService.PAYMENT_METHODS.find(m => m.id === payment.paymentMethod)?.icon || '💵'}
                    {' '}
                    <span className="capitalize">{payment.paymentMethod || 'cash'}</span>
                  </td>
                  <td className="px-4 py-2 text-sm">{payment.reference || '-'}</td>
                  <td className="px-4 py-2 text-sm">
                    {payment.isDeposit && <span className="text-blue-600">Deposit</span>}
                    {payment.type === 'refund' && <span className="text-red-600">Refund</span>}
                    {!payment.isDeposit && payment.type !== 'refund' && <span className="text-green-600">Payment</span>}
                  </td>
                  <td className="px-4 py-2 text-right font-bold">
                    {(payment.credit || 0) > 0 ? (
                      <span className="text-green-600">+₾{(payment.credit || 0).toFixed(2)}</span>
                    ) : (
                      <span className="text-red-600">-₾{(payment.debit || 0).toFixed(2)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

