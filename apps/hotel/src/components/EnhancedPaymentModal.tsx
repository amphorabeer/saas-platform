'use client'

import React, { useState, useEffect } from 'react'
import { PaymentService } from '../services/PaymentService'
import moment from 'moment'
import { ActivityLogger } from '../lib/activityLogger'

interface EnhancedPaymentModalProps {
  reservation: any
  suggestedAmount?: number
  onClose: () => void
  onSuccess: (result: any) => void
}

export default function EnhancedPaymentModal({ 
  reservation,
  suggestedAmount,
  onClose,
  onSuccess
}: EnhancedPaymentModalProps) {
  const [folio, setFolio] = useState<any>(null)
  const [paymentType, setPaymentType] = useState<'payment' | 'deposit' | 'refund'>('payment')
  const [selectedMethod, setSelectedMethod] = useState('cash')
  const [amount, setAmount] = useState(0)
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [processing, setProcessing] = useState(false)
  const [splitPayment, setSplitPayment] = useState(false)
  const [splits, setSplits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    loadFolio()
  }, [reservation.id])
  
  useEffect(() => {
    if (folio) {
      // Set suggested amount
      if (suggestedAmount !== undefined) {
        setAmount(suggestedAmount)
      } else if (folio.balance > 0) {
        setAmount(folio.balance)
      }
      
      // Auto-detect payment type
      if (folio.balance < 0) {
        setPaymentType('refund')
        setAmount(Math.abs(folio.balance))
      }
    }
  }, [folio, suggestedAmount])
  
  const loadFolio = async () => {
    try {
      setLoading(true)
      if (typeof window === 'undefined') return
      
      const folios = JSON.parse(localStorage.getItem('hotelFolios') || '[]')
      const resFolio = folios.find((f: any) => f.reservationId === reservation.id)
      
      if (!resFolio) {
        // Try to get from API
        const reservationsResponse = await fetch('/api/hotel/reservations')
        const reservations = await reservationsResponse.json()
        const res = reservations.find((r: any) => r.id === reservation.id)
        
        if (res) {
          const newFolio = {
            id: `FOLIO-${Date.now()}`,
            folioNumber: `F${moment().format('YYMMDD')}-${res.roomNumber || res.roomId || Math.floor(Math.random() * 1000)}-${reservation.id}`,
            reservationId: reservation.id,
            guestName: res.guestName,
            roomNumber: res.roomNumber || res.roomId,
            balance: 0,
            creditLimit: 5000,
            paymentMethod: 'cash',
            status: 'open',
            openDate: res.checkIn || moment().format('YYYY-MM-DD'),
            transactions: [],
            totalDeposit: 0
          }
          folios.push(newFolio)
          localStorage.setItem('hotelFolios', JSON.stringify(folios))
          setFolio(newFolio)
        } else {
          setFolio({ balance: 0, transactions: [], totalDeposit: 0 })
        }
      } else {
        setFolio(resFolio)
      }
    } catch (error) {
      console.error('Error loading folio:', error)
      setFolio({ balance: 0, transactions: [], totalDeposit: 0 })
    } finally {
      setLoading(false)
    }
  }
  
  const handlePayment = async () => {
    if (amount <= 0 && !splitPayment) {
      alert('Please enter a valid amount')
      return
    }
    
    const method = PaymentService.PAYMENT_METHODS.find(m => m.id === selectedMethod)
    if (method?.requiresReference && !reference && !splitPayment) {
      alert('Reference number is required for this payment method')
      return
    }
    
    if (splitPayment && splits.length === 0) {
      alert('Please add at least one split payment')
      return
    }
    
    if (splitPayment) {
      // Validate splits
      const totalSplit = splits.reduce((sum, s) => sum + (s.amount || 0), 0)
      if (folio && folio.balance > 0 && totalSplit !== folio.balance) {
        if (!confirm(`Split total (₾${totalSplit.toFixed(2)}) doesn't match balance (₾${folio.balance.toFixed(2)}). Continue?`)) {
          return
        }
      }
    }
    
    setProcessing(true)
    
    try {
      if (splitPayment && splits.length > 0) {
        // Process split payments
        const results = []
        for (const split of splits) {
          const splitMethod = PaymentService.PAYMENT_METHODS.find(m => m.id === split.method)
          if (splitMethod?.requiresReference && !split.reference) {
            alert(`Reference required for ${splitMethod.name} in split ${splits.indexOf(split) + 1}`)
            setProcessing(false)
            return
          }
          
          const result = await PaymentService.processPayment({
            reservationId: reservation.id,
            amount: split.amount,
            method: split.method,
            reference: split.reference,
            notes: `Split payment ${splits.indexOf(split) + 1}/${splits.length}${notes ? ` - ${notes}` : ''}`,
            isDeposit: paymentType === 'deposit',
            isRefund: paymentType === 'refund'
          })
          
          if (!result.success) {
            alert(`❌ Error processing split ${splits.indexOf(split) + 1}: ${result.error}`)
            setProcessing(false)
            return
          }
          
          results.push(result)
        }
        
        // Reload folio after all splits
        await loadFolio()
        
        // Get updated folio from localStorage
        const folios = typeof window !== 'undefined' 
          ? JSON.parse(localStorage.getItem('hotelFolios') || '[]')
          : []
        const updatedFolio = folios.find((f: any) => f.reservationId === reservation.id)
        
        // Dispatch folioUpdated event to refresh other components
        window.dispatchEvent(new CustomEvent('folioUpdated', {
          detail: { 
            reservationId: reservation.id, 
            folio: updatedFolio 
          }
        }))
        
        alert(`✅ ${splits.length} split ${paymentType === 'refund' ? 'refunds' : 'payments'} processed successfully!`)
        onSuccess({ success: true, results, folio: updatedFolio })
      } else {
        // Process single payment
        const result = await PaymentService.processPayment({
          reservationId: reservation.id,
          amount,
          method: selectedMethod,
          reference,
          notes,
          isDeposit: paymentType === 'deposit',
          isRefund: paymentType === 'refund'
        })
        
        if (result.success) {
          // Reload folio
          await loadFolio()
          
          // Get updated folio from localStorage (in case result.folio is not available)
          const folios = typeof window !== 'undefined' 
            ? JSON.parse(localStorage.getItem('hotelFolios') || '[]')
            : []
          const updatedFolio = folios.find((f: any) => f.reservationId === reservation.id) || result.folio
          
          // Log activity
          ActivityLogger.log('PAYMENT_PROCESSED', {
            reservationId: reservation.id,
            amount,
            method: selectedMethod,
            type: paymentType,
            guestName: reservation.guestName
          })
          
          // Dispatch folioUpdated event to refresh other components
          window.dispatchEvent(new CustomEvent('folioUpdated', {
            detail: { 
              reservationId: reservation.id, 
              folio: updatedFolio 
            }
          }))
          
          alert(`✅ ${paymentType === 'refund' ? 'Refund' : 'Payment'} processed successfully!`)
          onSuccess(result)
        } else {
          alert(`❌ Error: ${result.error}`)
        }
      }
    } catch (error: any) {
      alert(`❌ Error: ${error.message || 'Unknown error'}`)
    } finally {
      setProcessing(false)
    }
  }
  
  const addSplit = () => {
    const newSplit = {
      method: 'cash',
      amount: 0,
      reference: ''
    }
    setSplits([...splits, newSplit])
  }
  
  const updateSplit = (index: number, field: string, value: any) => {
    const updated = [...splits]
    updated[index] = { ...updated[index], [field]: value }
    setSplits(updated)
  }
  
  const removeSplit = (index: number) => {
    setSplits(splits.filter((_, i) => i !== index))
  }
  
  const totalSplitAmount = splits.reduce((sum, s) => sum + (s.amount || 0), 0)
  
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center">
        <div className="bg-white rounded-lg p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading folio...</p>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg w-[600px] max-w-full mx-4 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="bg-green-600 text-white p-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">💳 Payment Processing</h2>
            <button onClick={onClose} className="text-2xl hover:text-green-200">×</button>
          </div>
        </div>
        
        {/* Guest Info */}
        <div className="bg-gray-50 p-4 border-b">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Guest:</span>
              <span className="ml-2 font-bold">{reservation.guestName}</span>
            </div>
            <div>
              <span className="text-gray-600">Room:</span>
              <span className="ml-2 font-bold">{reservation.roomNumber || reservation.roomId}</span>
            </div>
            <div>
              <span className="text-gray-600">Check-in:</span>
              <span className="ml-2">{moment(reservation.checkIn).format('DD/MM/YYYY')}</span>
            </div>
            <div>
              <span className="text-gray-600">Check-out:</span>
              <span className="ml-2">{moment(reservation.checkOut).format('DD/MM/YYYY')}</span>
            </div>
          </div>
        </div>
        
        {/* Balance Info */}
        {folio && (
          <div className="p-4 border-b">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Current Balance:</span>
              <span className={`text-2xl font-bold ${
                folio.balance > 0 ? 'text-red-600' : folio.balance < 0 ? 'text-green-600' : 'text-gray-600'
              }`}>
                ₾{Math.abs(folio.balance).toFixed(2)}
                {folio.balance < 0 && ' (Credit)'}
              </span>
            </div>
            {folio.totalDeposit > 0 && (
              <div className="text-sm text-gray-600 mt-2">
                Total Deposits: ₾{folio.totalDeposit.toFixed(2)}
              </div>
            )}
          </div>
        )}
        
        {/* Payment Type Tabs */}
        <div className="p-4 border-b">
          <div className="flex gap-2">
            {['payment', 'deposit', 'refund'].map(type => (
              <button
                key={type}
                onClick={() => setPaymentType(type as any)}
                className={`px-4 py-2 rounded capitalize transition ${
                  paymentType === type 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                {type === 'payment' && '💰 Payment'}
                {type === 'deposit' && '🏦 Deposit'}
                {type === 'refund' && '↩️ Refund'}
              </button>
            ))}
          </div>
        </div>
        
        {/* Payment Form */}
        <div className="p-4">
          {!splitPayment ? (
            // Single Payment
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Payment Method</label>
                <div className="grid grid-cols-4 gap-2">
                  {PaymentService.PAYMENT_METHODS.map(method => (
                    <button
                      key={method.id}
                      onClick={() => setSelectedMethod(method.id)}
                      className={`p-3 rounded border text-center transition ${
                        selectedMethod === method.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="text-2xl">{method.icon}</div>
                      <div className="text-xs mt-1">{method.name}</div>
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Amount (₾)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="w-full border rounded px-3 py-2 text-lg"
                  step="0.01"
                  min="0"
                />
                {folio && folio.balance > 0 && amount < folio.balance && (
                  <p className="text-sm text-orange-600 mt-1">
                    ⚠️ Partial payment. Remaining: ₾{(folio.balance - amount).toFixed(2)}
                  </p>
                )}
              </div>
              
              {PaymentService.PAYMENT_METHODS.find(m => m.id === selectedMethod)?.requiresReference && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Reference Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Transaction ID, Card last 4 digits, etc."
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium mb-2">Notes (Optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  rows={2}
                  placeholder="Additional notes..."
                />
              </div>
            </div>
          ) : (
            // Split Payment
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold">Split Payment</h3>
                <button
                  onClick={addSplit}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition"
                >
                  + Add Split
                </button>
              </div>
              
              {splits.map((split, index) => (
                <div key={index} className="border rounded p-3 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Split #{index + 1}</span>
                    <button
                      onClick={() => removeSplit(index)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      value={split.method}
                      onChange={(e) => updateSplit(index, 'method', e.target.value)}
                      className="border rounded px-2 py-1 text-sm"
                    >
                      {PaymentService.PAYMENT_METHODS.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                    
                    <input
                      type="number"
                      value={split.amount}
                      onChange={(e) => updateSplit(index, 'amount', parseFloat(e.target.value) || 0)}
                      className="border rounded px-2 py-1 text-sm"
                      placeholder="Amount"
                      step="0.01"
                      min="0"
                    />
                    
                    <input
                      type="text"
                      value={split.reference}
                      onChange={(e) => updateSplit(index, 'reference', e.target.value)}
                      className="border rounded px-2 py-1 text-sm"
                      placeholder={PaymentService.PAYMENT_METHODS.find(m => m.id === split.method)?.requiresReference ? 'Reference *' : 'Reference'}
                    />
                  </div>
                </div>
              ))}
              
              {splits.length > 0 && (
                <div className="bg-gray-50 p-3 rounded">
                  <div className="flex justify-between">
                    <span>Total Split Amount:</span>
                    <span className="font-bold">₾{totalSplitAmount.toFixed(2)}</span>
                  </div>
                  {folio && folio.balance > 0 && totalSplitAmount !== folio.balance && (
                    <p className="text-sm text-orange-600 mt-1">
                      ⚠️ Split total doesn't match balance
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Split Payment Toggle */}
          <div className="mt-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={splitPayment}
                onChange={(e) => setSplitPayment(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Split payment across multiple methods</span>
            </label>
          </div>
        </div>
        
        {/* Actions */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex gap-2">
            <button
              onClick={handlePayment}
              disabled={processing || (amount <= 0 && !splitPayment) || (splitPayment && splits.length === 0)}
              className="flex-1 px-4 py-3 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 transition"
            >
              {processing ? 'Processing...' : `Process ${paymentType === 'refund' ? 'Refund' : 'Payment'} ${!splitPayment ? `₾${amount.toFixed(2)}` : ''}`}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-300 rounded hover:bg-gray-400 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}



