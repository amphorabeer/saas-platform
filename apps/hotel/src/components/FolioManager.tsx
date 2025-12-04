'use client'

import React, { useState, useEffect } from 'react'
import moment from 'moment'
import { Folio, FolioTransaction } from '../types/folio.types'
import { ActivityLogger } from '../lib/activityLogger'
import { FolioService } from '../services/FolioService'
import ExtraChargesPanel from './ExtraChargesPanel'
import QuickChargeButtons from './QuickChargeButtons'
import FolioRoutingManager from './FolioRoutingManager'

interface FolioManagerProps {
  reservationId: string
  onClose?: () => void
}

export default function FolioManager({ reservationId, onClose }: FolioManagerProps) {
  const [folio, setFolio] = useState<Folio | null>(null)
  const [showPostCharge, setShowPostCharge] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [showExtraCharges, setShowExtraCharges] = useState(false)
  const [showRouting, setShowRouting] = useState(false)
  const [loading, setLoading] = useState(true)
  
  // Load or create folio
  useEffect(() => {
    loadOrCreateFolio()
  }, [reservationId])
  
  const loadOrCreateFolio = async () => {
    try {
      setLoading(true)
      // Try to load existing folio using FolioService
      let existingFolio = FolioService.getFolioByReservationId(reservationId)
      
      if (!existingFolio) {
        // Get reservation details and create empty folio
        const reservations = await fetch('/api/hotel/reservations').then(r => r.json())
        const reservation = reservations.find((r: any) => r.id === reservationId)
        
        if (!reservation) {
          throw new Error('Reservation not found')
        }
        
        // Create empty folio (no pre-posting)
        existingFolio = FolioService.createEmptyFolio(reservation)
      }
      
      setFolio(existingFolio)
    } catch (error) {
      console.error('Error loading folio:', error)
      alert('შეცდომა folio-ს ჩატვირთვისას')
    } finally {
      setLoading(false)
    }
  }
  
  // Recalculate balance from transactions (use FolioService method)
  const recalculateBalance = (transactions: FolioTransaction[]): number => {
    return FolioService.recalculateBalance(transactions)
  }

  // Post a charge to folio
  const postCharge = (charge: {
    category: string
    description: string
    amount: number
    taxRate?: number
  }) => {
    if (!folio) return
    
    const grossAmount = charge.amount
    const taxAmount = charge.taxRate ? (grossAmount * charge.taxRate / 100) : 0
    const netAmount = grossAmount - taxAmount
    
    // Calculate running balance from previous transactions
    const previousBalance = folio.transactions.length > 0 
      ? folio.transactions[folio.transactions.length - 1].balance 
      : 0
    const newBalance = previousBalance + grossAmount
    
    const transaction: FolioTransaction = {
      id: `TRX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      folioId: folio.id,
      date: moment().format('YYYY-MM-DD'),
      time: moment().format('HH:mm:ss'),
      
      type: 'charge',
      category: charge.category as any,
      description: charge.description,
      
      debit: grossAmount,
      credit: 0,
      balance: newBalance,
      
      postedBy: typeof window !== 'undefined' 
        ? JSON.parse(localStorage.getItem('currentUser') || '{}').name || 'Admin'
        : 'Admin',
      postedAt: moment().format(),
      
      taxDetails: charge.taxRate ? [{
        taxType: 'VAT',
        rate: charge.taxRate,
        amount: taxAmount,
        base: netAmount
      }] : undefined
    }
    
    // Update folio with new transaction
    const updatedTransactions = [...folio.transactions, transaction]
    const recalculatedBalance = recalculateBalance(updatedTransactions)
    
    const updatedFolio = {
      ...folio,
      balance: recalculatedBalance,
      transactions: updatedTransactions
    }
    
    setFolio(updatedFolio)
    saveFolio(updatedFolio)
    
    // Log activity
    ActivityLogger.log('FOLIO_CHARGE_POSTED', {
      folioNumber: folio.folioNumber,
      amount: grossAmount,
      category: charge.category,
      description: charge.description
    })
  }
  
  // Post a payment
  const postPayment = (payment: {
    method: string
    amount: number
    reference?: string
  }) => {
    if (!folio) return
    
    // Calculate running balance from previous transactions
    const previousBalance = folio.transactions.length > 0 
      ? folio.transactions[folio.transactions.length - 1].balance 
      : 0
    const newBalance = previousBalance - payment.amount
    
    // Get Business Date
    const businessDate = typeof window !== 'undefined' 
      ? (localStorage.getItem('currentBusinessDate') || new Date().toISOString().split('T')[0])
      : new Date().toISOString().split('T')[0]
    const now = new Date()
    
    const transaction: FolioTransaction = {
      id: `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      folioId: folio.id,
      date: businessDate, // Use Business Date!
      time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`,
      
      type: 'payment',
      category: 'payment',
      description: `Payment by ${payment.method}`,
      
      debit: 0,
      credit: payment.amount,
      balance: newBalance,
      
      postedBy: typeof window !== 'undefined' 
        ? JSON.parse(localStorage.getItem('currentUser') || '{}').name || 'Admin'
        : 'Admin',
      postedAt: moment().format(),
      referenceId: payment.reference,
      paymentMethod: payment.method || 'cash' // Add paymentMethod field
    }
    
    // Update folio with new transaction
    const updatedTransactions = [...folio.transactions, transaction]
    const recalculatedBalance = recalculateBalance(updatedTransactions)
    
    const updatedFolio = {
      ...folio,
      balance: recalculatedBalance,
      transactions: updatedTransactions
    }
    
    setFolio(updatedFolio)
    saveFolio(updatedFolio)
    
    // Log activity
    ActivityLogger.log('FOLIO_PAYMENT_POSTED', {
      folioNumber: folio.folioNumber,
      amount: payment.amount,
      method: payment.method
    })
  }
  
  const saveFolio = (updatedFolio: Folio) => {
    // Use FolioService to save
    FolioService.saveFolio(updatedFolio)
  }
  
  const printFolio = () => {
    if (!folio) return
    
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Folio ${folio.folioNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
            .folio-info { display: flex; justify-content: space-between; }
            .balance { font-size: 24px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .debit { color: red; }
            .credit { color: green; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Folio #${folio.folioNumber}</h1>
            <div class="folio-info">
              <div>
                <p><strong>Guest:</strong> ${folio.guestName}</p>
                <p><strong>Room:</strong> ${folio.roomNumber}</p>
                <p><strong>Date:</strong> ${moment().format('DD/MM/YYYY HH:mm')}</p>
              </div>
              <div class="balance">
                Balance: ₾${folio.balance.toFixed(2)}
              </div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date/Time</th>
                <th>Description</th>
                <th>Charges</th>
                <th>Payments</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              ${folio.transactions.map(trx => `
                <tr>
                  <td>${moment(trx.date).format('DD/MM')} ${trx.time}</td>
                  <td>${trx.description}</td>
                  <td class="debit">${trx.debit > 0 ? `₾${trx.debit.toFixed(2)}` : ''}</td>
                  <td class="credit">${trx.credit > 0 ? `₾${trx.credit.toFixed(2)}` : ''}</td>
                  <td>₾${trx.balance.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `
    
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    printWindow.print()
  }
  
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading folio...</p>
        </div>
      </div>
    )
  }
  
  if (!folio) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center py-8">
          <p className="text-red-600">Error loading folio</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Folio Header */}
      <div className="border-b pb-4 mb-4">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold">Folio #{folio.folioNumber}</h2>
            <p className="text-gray-600">{folio.guestName} - Room {folio.roomNumber}</p>
            <p className="text-sm text-gray-500">Status: <span className={`font-medium ${
              folio.status === 'open' ? 'text-green-600' :
              folio.status === 'closed' ? 'text-gray-600' :
              folio.status === 'suspended' ? 'text-yellow-600' :
              'text-red-600'
            }`}>{folio.status.toUpperCase()}</span></p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">
              <span className={folio.balance > 0 ? 'text-red-600' : folio.balance < 0 ? 'text-green-600' : 'text-gray-600'}>
                ₾{folio.balance.toFixed(2)}
              </span>
            </div>
            <p className="text-sm text-gray-600">Current Balance</p>
            {folio.balance > folio.creditLimit && (
              <p className="text-xs text-red-600 mt-1">⚠️ Credit limit exceeded</p>
            )}
          </div>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setShowPostCharge(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          📝 Post Charge
        </button>
        <button
          onClick={() => setShowExtraCharges(!showExtraCharges)}
          className={`px-4 py-2 rounded transition ${
            showExtraCharges 
              ? 'bg-orange-600 text-white hover:bg-orange-700' 
              : 'bg-orange-500 text-white hover:bg-orange-600'
          }`}
        >
          ➕ Extra Charges
        </button>
        <button
          onClick={() => setShowPayment(true)}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
        >
          💳 Post Payment
        </button>
        <button
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
          disabled
          title="Coming soon"
        >
          🔄 Transfer
        </button>
        <button
          onClick={printFolio}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
        >
          🖨️ Print Folio
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition"
          >
            ✕ Close
          </button>
        )}
      </div>
      
      {/* Extra Charges Panel */}
      {showExtraCharges && (
        <div className="mb-6">
          <ExtraChargesPanel
            reservationId={reservationId}
            onChargePosted={() => {
              loadOrCreateFolio()
            }}
          />
        </div>
      )}
      
      {/* Quick Charge Buttons */}
      {showExtraCharges && (
        <div className="mb-6">
          <QuickChargeButtons
            reservationId={reservationId}
            onCharged={() => {
              loadOrCreateFolio()
            }}
          />
        </div>
      )}
      
      {/* Routing Manager */}
      {showRouting && folio && (
        <div className="mb-6">
          <FolioRoutingManager
            folioId={folio.id}
            reservationId={reservationId}
            onRuleUpdated={() => {
              loadOrCreateFolio()
            }}
          />
        </div>
      )}
      
      {/* Transactions Table */}
      {folio.transactions.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium">Date/Time</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Description</th>
                <th className="px-4 py-2 text-right text-sm font-medium">Charges</th>
                <th className="px-4 py-2 text-right text-sm font-medium">Payments</th>
                <th className="px-4 py-2 text-right text-sm font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              {folio.transactions.map((trx, index) => (
                <tr key={trx.id} className={`border-b hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="px-4 py-2 text-sm">
                    {moment(trx.date).format('DD/MM')} {trx.time}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        trx.type === 'charge' ? 'bg-red-100 text-red-700' :
                        trx.type === 'payment' ? 'bg-green-100 text-green-700' :
                        trx.type === 'adjustment' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {trx.type.toUpperCase()}
                      </span>
                      <span>{trx.description}</span>
                    </div>
                    {trx.taxDetails && trx.taxDetails.length > 0 && (
                      <span className="text-xs text-gray-500 block mt-1">
                        (incl. VAT {trx.taxDetails[0].rate}%)
                      </span>
                    )}
                    {trx.referenceId && (
                      <span className="text-xs text-gray-400 block">Ref: {trx.referenceId}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right font-medium">
                    {trx.debit > 0 && <span className="text-red-600">₾{trx.debit.toFixed(2)}</span>}
                  </td>
                  <td className="px-4 py-2 text-right font-medium">
                    {trx.credit > 0 && <span className="text-green-600">₾{trx.credit.toFixed(2)}</span>}
                  </td>
                  <td className="px-4 py-2 text-right font-medium">
                    <span className={trx.balance > 0 ? 'text-red-600' : trx.balance < 0 ? 'text-green-600' : 'text-gray-600'}>
                      ₾{trx.balance.toFixed(2)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-100 font-bold">
              <tr>
                <td colSpan={2} className="px-4 py-2">Total Balance</td>
                <td className="px-4 py-2 text-right text-red-600">
                  ₾{folio.transactions.reduce((sum, t) => sum + t.debit, 0).toFixed(2)}
                </td>
                <td className="px-4 py-2 text-right text-green-600">
                  ₾{folio.transactions.reduce((sum, t) => sum + t.credit, 0).toFixed(2)}
                </td>
                <td className="px-4 py-2 text-right">
                  <span className={folio.balance > 0 ? 'text-red-600' : folio.balance < 0 ? 'text-green-600' : 'text-gray-600'}>
                    ₾{folio.balance.toFixed(2)}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>No transactions yet. Post a charge or payment to get started.</p>
        </div>
      )}
      
      {/* Post Charge Modal */}
      {showPostCharge && (
        <PostChargeModal
          onPost={(charge: any) => {
            postCharge(charge)
            setShowPostCharge(false)
          }}
          onCancel={() => setShowPostCharge(false)}
        />
      )}
      
      {/* Payment Modal */}
      {showPayment && (
        <PaymentModal
          amount={folio.balance}
          onPost={(payment: any) => {
            postPayment(payment)
            setShowPayment(false)
          }}
          onCancel={() => setShowPayment(false)}
        />
      )}
    </div>
  )
}

// Post Charge Modal Component
const PostChargeModal = ({ onPost, onCancel }: { onPost: (charge: any) => void; onCancel: () => void }) => {
  const [charge, setCharge] = useState({
    category: 'room',
    description: '',
    amount: 0,
    taxRate: 18
  })
  
  const chargeCategories = [
    { value: 'room', label: '🛏️ Room Charge' },
    { value: 'food', label: '🍽️ Food & Beverage' },
    { value: 'beverage', label: '🥤 Beverage' },
    { value: 'extras', label: '➕ Extras' },
    { value: 'tax', label: '📋 Tax' }
  ]
  
  const handleSubmit = () => {
    if (!charge.description.trim()) {
      alert('გთხოვთ შეიყვანოთ აღწერა')
      return
    }
    if (charge.amount <= 0) {
      alert('გთხოვთ შეიყვანოთ თანხა')
      return
    }
    onPost(charge)
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
        <h3 className="text-xl font-bold mb-4">📝 Post Charge</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              value={charge.category}
              onChange={(e) => setCharge({...charge, category: e.target.value})}
              className="w-full border rounded px-3 py-2"
            >
              {chargeCategories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <input
              type="text"
              value={charge.description}
              onChange={(e) => setCharge({...charge, description: e.target.value})}
              className="w-full border rounded px-3 py-2"
              placeholder="Enter description..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Amount (₾)</label>
            <input
              type="number"
              step="0.01"
              value={charge.amount}
              onChange={(e) => setCharge({...charge, amount: parseFloat(e.target.value) || 0})}
              className="w-full border rounded px-3 py-2"
              placeholder="0.00"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">VAT Rate (%)</label>
            <input
              type="number"
              step="0.1"
              value={charge.taxRate}
              onChange={(e) => setCharge({...charge, taxRate: parseFloat(e.target.value) || 0})}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          
          {charge.amount > 0 && (
            <div className="bg-gray-50 p-3 rounded">
              <div className="flex justify-between text-sm">
                <span>Net Amount:</span>
                <span>₾{(charge.amount / (1 + charge.taxRate/100)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>VAT ({charge.taxRate}%):</span>
                <span>₾{(charge.amount - charge.amount / (1 + charge.taxRate/100)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-2 mt-2">
                <span>Total:</span>
                <span>₾{charge.amount.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex gap-2 mt-6">
          <button
            onClick={handleSubmit}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Post Charge
          </button>
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// Payment Modal Component
const PaymentModal = ({ amount, onPost, onCancel }: { amount: number; onPost: (payment: any) => void; onCancel: () => void }) => {
  const [payment, setPayment] = useState({
    method: 'cash',
    amount: amount,
    reference: ''
  })
  
  const handleSubmit = () => {
    if (payment.amount <= 0) {
      alert('გთხოვთ შეიყვანოთ თანხა')
      return
    }
    if (payment.amount > amount) {
      alert('გადახდა აღემატება ბალანსს')
      return
    }
    onPost(payment)
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
        <h3 className="text-xl font-bold mb-4">💳 Post Payment</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Payment Method</label>
            <select
              value={payment.method}
              onChange={(e) => setPayment({...payment, method: e.target.value})}
              className="w-full border rounded px-3 py-2"
            >
              <option value="cash">💵 Cash</option>
              <option value="card">💳 Credit Card</option>
              <option value="bank">🏦 Bank Transfer</option>
              <option value="company">🏢 Company Account</option>
              <option value="agency">🏛️ Agency</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Amount (₾)</label>
            <input
              type="number"
              step="0.01"
              value={payment.amount}
              onChange={(e) => setPayment({...payment, amount: parseFloat(e.target.value) || 0})}
              className="w-full border rounded px-3 py-2"
              max={amount}
            />
            <p className="text-xs text-gray-500 mt-1">Current balance: ₾{amount.toFixed(2)}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Reference (Optional)</label>
            <input
              type="text"
              value={payment.reference}
              onChange={(e) => setPayment({...payment, reference: e.target.value})}
              className="w-full border rounded px-3 py-2"
              placeholder="Transaction reference..."
            />
          </div>
          
          {payment.amount > 0 && (
            <div className="bg-green-50 p-3 rounded">
              <div className="flex justify-between">
                <span>Payment Amount:</span>
                <span className="font-bold text-green-600">₾{payment.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mt-2">
                <span>Remaining Balance:</span>
                <span className={amount - payment.amount > 0 ? 'text-red-600' : 'text-green-600'}>
                  ₾{(amount - payment.amount).toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex gap-2 mt-6">
          <button
            onClick={handleSubmit}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Post Payment
          </button>
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

