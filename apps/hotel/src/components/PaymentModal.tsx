'use client'

import { useState, useEffect } from 'react'
import moment from 'moment'
import { ActivityLogger } from '../lib/activityLogger'
import { PaymentService } from '../services/PaymentService'

interface PaymentModalProps {
  reservation: any
  onClose: () => void
  onPayment: (payment: any) => void
}

export default function PaymentModal({ reservation, onClose, onPayment }: PaymentModalProps) {
  const [paymentData, setPaymentData] = useState({
    totalAmount: reservation.totalAmount || 0,
    paidAmount: reservation.paidAmount || 0,
    remainingAmount: (reservation.totalAmount || 0) - (reservation.paidAmount || 0),
    payments: []
  })
  
  const [currentPayment, setCurrentPayment] = useState({
    method: 'cash',
    amount: paymentData.remainingAmount,
    note: ''
  })
  
  const [paymentMethods, setPaymentMethods] = useState<any[]>([])
  
  // Update remaining amount when currentPayment amount changes
  useEffect(() => {
    setCurrentPayment(prev => ({
      ...prev,
      amount: paymentData.remainingAmount
    }))
  }, [paymentData.remainingAmount])
  
  // Add payment method
  const addPaymentMethod = () => {
    if (currentPayment.amount <= 0) {
      alert('გთხოვთ შეიყვანოთ თანხა')
      return
    }
    
    if (currentPayment.amount > paymentData.remainingAmount) {
      alert('თანხა აღემატება დარჩენილ ბალანსს')
      return
    }
    
    const newPayment = {
      ...currentPayment,
      id: Date.now()
    }
    
    setPaymentMethods([...paymentMethods, newPayment])
    
    // Update remaining amount
    setPaymentData({
      ...paymentData,
      remainingAmount: paymentData.remainingAmount - currentPayment.amount,
      paidAmount: paymentData.paidAmount + currentPayment.amount
    })
    
    // Reset current payment
    setCurrentPayment({
      method: 'cash',
      amount: 0,
      note: ''
    })
  }
  
  // Remove payment method
  const removePaymentMethod = (id: number) => {
    const payment = paymentMethods.find(p => p.id === id)
    if (!payment) return
    
    setPaymentMethods(paymentMethods.filter(p => p.id !== id))
    
    setPaymentData({
      ...paymentData,
      remainingAmount: paymentData.remainingAmount + payment.amount,
      paidAmount: paymentData.paidAmount - payment.amount
    })
  }
  
  // Process payment
  const processPayment = async () => {
    if (paymentMethods.length === 0) {
      alert('გთხოვთ დაამატოთ გადახდის მეთოდი')
      return
    }
    
    // Process each payment method through PaymentService
    let allSuccess = true
    let lastError = ''
    let updatedFolio = null
    
    for (const payment of paymentMethods) {
      const result = await PaymentService.processPayment({
        reservationId: reservation.id,
        amount: payment.amount,
        method: payment.method,
        notes: payment.note || '',
        isDeposit: false,
        isRefund: false
      })
      
      if (!result.success) {
        allSuccess = false
        lastError = result.error || 'Unknown error'
        break
      }
      
      updatedFolio = result.folio  // ← ახალი folio PaymentService-დან
    }
    
    if (!allSuccess) {
      alert(`❌ გადახდის შეცდომა: ${lastError}`)
      return
    }
    
    // Update local payment data with new balance
    if (updatedFolio) {
      setPaymentData(prev => ({
        ...prev,
        remainingAmount: Math.max(0, updatedFolio.balance),
        paidAmount: prev.totalAmount - Math.max(0, updatedFolio.balance)
      }))
    }
    
    // Create payment info for callback
    const paymentInfo = {
      reservationId: reservation.id,
      totalAmount: paymentData.totalAmount,
      paidAmount: paymentData.paidAmount,
      remainingAmount: updatedFolio ? updatedFolio.balance : paymentData.remainingAmount,
      payments: paymentMethods,
      isPaid: updatedFolio ? updatedFolio.balance <= 0 : paymentData.remainingAmount === 0,
      timestamp: new Date().toISOString(),
      updatedFolio: updatedFolio  // ← გადაეცემა parent-ს
    }
    
    ActivityLogger.log('PAYMENT_RECEIVED', {
      guest: reservation.guestName,
      amount: paymentMethods.reduce((sum, p) => sum + p.amount, 0),
      method: paymentMethods.map(p => p.method).join(', '),
      reservationId: reservation.id,
      isFullPayment: updatedFolio ? updatedFolio.balance <= 0 : false,
      newBalance: updatedFolio?.balance
    })
    
    onPayment(paymentInfo)
    
    // Trigger folio refresh in UI
    window.dispatchEvent(new CustomEvent('folioUpdated', { 
      detail: { reservationId: reservation.id, folio: updatedFolio } 
    }))
    
    onClose()
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-bold">💳 გადახდა</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>
        
        {/* Reservation Info */}
        <div className="bg-gray-50 rounded p-4 mb-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">სტუმარი:</span>
              <span className="ml-2 font-medium">{reservation.guestName}</span>
            </div>
            <div>
              <span className="text-gray-500">ოთახი:</span>
              <span className="ml-2 font-medium">Room {reservation.roomNumber}</span>
            </div>
          </div>
          {/* Show warning if processing payment on closed date */}
          {typeof window !== 'undefined' && (() => {
            const lastAuditDate = localStorage.getItem('lastNightAuditDate')
            const checkOutDate = moment(reservation.checkOut).format('YYYY-MM-DD')
            const isClosedDate = lastAuditDate && moment(checkOutDate).isSameOrBefore(lastAuditDate)
            
            return isClosedDate ? (
              <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded">
                <div className="flex items-center gap-2 text-orange-700 text-sm">
                  <span>⚠️</span>
                  <div>
                    <div className="font-medium">Night Audit-ის შემდგომი გადახდა</div>
                    <div className="text-xs text-orange-600">
                      Check-out თარიღი ({checkOutDate}) დახურულია. გადახდა დაფიქსირდება როგორც Night Audit-ის შემდეგ დამუშავებული.
                    </div>
                  </div>
                </div>
              </div>
            ) : null
          })()}
        </div>
        
        {/* Balance Information */}
        <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-600">სულ თანხა</p>
              <p className="text-2xl font-bold text-gray-900">₾{paymentData.totalAmount}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">გადახდილი</p>
              <p className="text-2xl font-bold text-green-600">₾{paymentData.paidAmount}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">დარჩენილი</p>
              <p className="text-2xl font-bold text-red-600">₾{paymentData.remainingAmount}</p>
            </div>
          </div>
        </div>
        
        {/* Add Payment Method */}
        <div className="border rounded p-4 mb-4">
          <h3 className="font-semibold mb-3">გადახდის დამატება</h3>
          
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-sm font-medium mb-1">მეთოდი</label>
              <select 
                value={currentPayment.method}
                onChange={(e) => setCurrentPayment({...currentPayment, method: e.target.value})}
                className="w-full border rounded px-3 py-2"
              >
                <option value="cash">💵 ნაღდი</option>
                <option value="card">💳 ბარათი</option>
                <option value="transfer">🏦 გადარიცხვა</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">თანხა (₾)</label>
              <input
                type="number"
                value={currentPayment.amount}
                onChange={(e) => setCurrentPayment({...currentPayment, amount: parseFloat(e.target.value) || 0})}
                className="w-full border rounded px-3 py-2"
                placeholder="0.00"
                max={paymentData.remainingAmount}
                min="0"
                step="0.01"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">შენიშვნა</label>
              <input
                type="text"
                value={currentPayment.note}
                onChange={(e) => setCurrentPayment({...currentPayment, note: e.target.value})}
                className="w-full border rounded px-3 py-2"
                placeholder="დამატებითი ინფო"
              />
            </div>
          </div>
          
          <button
            onClick={addPaymentMethod}
            disabled={paymentData.remainingAmount === 0 || currentPayment.amount <= 0}
            className={`w-full py-2 rounded text-white ${
              paymentData.remainingAmount === 0 || currentPayment.amount <= 0
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            + გადახდის დამატება
          </button>
        </div>
        
        {/* Payment Methods List */}
        {paymentMethods.length > 0 && (
          <div className="border rounded p-4 mb-4">
            <h3 className="font-semibold mb-3">გადახდები</h3>
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="text-left p-2">მეთოდი</th>
                  <th className="text-right p-2">თანხა</th>
                  <th className="text-left p-2">შენიშვნა</th>
                  <th className="text-center p-2">მოქმედება</th>
                </tr>
              </thead>
              <tbody>
                {paymentMethods.map((payment) => (
                  <tr key={payment.id} className="border-b">
                    <td className="p-2">
                      {payment.method === 'cash' && '💵 ნაღდი'}
                      {payment.method === 'card' && '💳 ბარათი'}
                      {payment.method === 'transfer' && '🏦 გადარიცხვა'}
                    </td>
                    <td className="p-2 text-right font-medium">₾{payment.amount}</td>
                    <td className="p-2 text-gray-600">{payment.note || '-'}</td>
                    <td className="p-2 text-center">
                      <button
                        onClick={() => removePaymentMethod(payment.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        წაშლა
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Actions */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {paymentData.remainingAmount > 0 && 
              `⚠️ ნაწილობრივი გადახდა - დარჩენილი: ₾${paymentData.remainingAmount}`
            }
            {paymentData.remainingAmount === 0 && paymentMethods.length > 0 &&
              '✅ სრული გადახდა'
            }
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              გაუქმება
            </button>
            <button
              onClick={processPayment}
              disabled={paymentMethods.length === 0}
              className={`px-4 py-2 rounded text-white ${
                paymentMethods.length === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              გადახდა
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}