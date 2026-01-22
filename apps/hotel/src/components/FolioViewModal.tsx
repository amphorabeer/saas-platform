'use client'

import React, { useState, useEffect } from 'react'
import moment from 'moment'
import { PostingService } from '../services/PostingService'
import { ActivityLogger } from '../lib/activityLogger'
import { calculateTaxBreakdown } from '../utils/taxCalculator'
import { hasDisplayableLogo, sanitizeLogo } from '@/lib/logo'

interface FolioViewModalProps {
  reservation: any
  onClose: () => void
}

export default function FolioViewModal({ reservation, onClose }: FolioViewModalProps) {
  const [folio, setFolio] = useState<any>(null)
  const [showPostCharge, setShowPostCharge] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [loading, setLoading] = useState(true)
  const [hotelInfo, setHotelInfo] = useState({
    name: 'Hotel',
    logo: '',
    address: '',
    phone: '',
    email: ''
  })
  
  useEffect(() => {
    // Load hotel info from Settings
    const savedInfo = localStorage.getItem('hotelInfo')
    if (savedInfo) {
      try {
        const info = JSON.parse(savedInfo)
        setHotelInfo({ ...info, logo: sanitizeLogo(info.logo) })
      } catch (e) {
        console.error('Error loading hotel info:', e)
      }
    }
  }, [])
  
  useEffect(() => {
    loadOrCreateFolio()
  }, [reservation.id])
  
  const loadOrCreateFolio = () => {
    try {
      setLoading(true)
      if (typeof window === 'undefined') return
      
      const folios = JSON.parse(localStorage.getItem('hotelFolios') || '[]')
      let existingFolio = folios.find((f: any) => f.reservationId === reservation.id)
      
      if (!existingFolio) {
        // Create new folio
        // Get room number (convert roomId to roomNumber if needed)
        const roomNumberForFolio = PostingService.getRoomNumber(reservation.roomNumber || reservation.roomId)
        const roomNumberForFolioNumber = roomNumberForFolio.length <= 4 && /^\d+$/.test(roomNumberForFolio) 
          ? roomNumberForFolio 
          : Math.floor(Math.random() * 1000).toString()
        
        existingFolio = {
          id: `FOLIO-${Date.now()}`,
          folioNumber: `F${moment().format('YYMMDD')}-${roomNumberForFolioNumber}-${reservation.id}`,
          reservationId: reservation.id,
          guestName: reservation.guestName,
          roomNumber: roomNumberForFolio,
          balance: 0,
          creditLimit: 5000,
          paymentMethod: 'cash',
          status: 'open',
          openDate: reservation.checkIn || moment().format('YYYY-MM-DD'),
          transactions: []
        }
        
        folios.push(existingFolio)
        localStorage.setItem('hotelFolios', JSON.stringify(folios))
      }
      
      setFolio(existingFolio)
    } catch (error) {
      console.error('Error loading folio:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handlePostCharge = (charge: any) => {
    if (!folio) return
    
    const transaction = {
      id: `CHG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      folioId: folio.id,
      date: moment().format('YYYY-MM-DD'),
      time: moment().format('HH:mm:ss'),
      type: 'charge',
      category: charge.category,
      description: charge.description,
      debit: charge.amount,
      credit: 0,
      balance: folio.balance + charge.amount,
      postedBy: typeof window !== 'undefined' 
        ? JSON.parse(localStorage.getItem('currentUser') || '{}').name || 'User'
        : 'User',
      postedAt: moment().format(),
      referenceId: `CHG-${reservation.id}-${Date.now()}`
    }
    
    const updatedFolio = {
      ...folio,
      transactions: [...folio.transactions, transaction],
      balance: folio.balance + charge.amount
    }
    
    // Save
    const folios = typeof window !== 'undefined' 
      ? JSON.parse(localStorage.getItem('hotelFolios') || '[]')
      : []
    const index = folios.findIndex((f: any) => f.id === folio.id)
    folios[index] = updatedFolio
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('hotelFolios', JSON.stringify(folios))
    }
    
    // Log activity
    ActivityLogger.log('FOLIO_CHARGE_POSTED', {
      folioNumber: folio.folioNumber,
      amount: charge.amount,
      category: charge.category,
      reservationId: reservation.id
    })
    
    setFolio(updatedFolio)
    setShowPostCharge(false)
  }
  
  const handlePayment = (payment: any) => {
    if (!folio) return
    
    const transaction = {
      id: `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      folioId: folio.id,
      date: typeof window !== 'undefined' ? (localStorage.getItem('currentBusinessDate') || moment().format('YYYY-MM-DD')) : moment().format('YYYY-MM-DD'),
      time: moment().format('HH:mm:ss'),
      type: 'payment',
      category: 'payment',
      description: `Payment by ${payment.method}`,
      debit: 0,
      credit: payment.amount,
      balance: folio.balance - payment.amount,
      postedBy: typeof window !== 'undefined' 
        ? JSON.parse(localStorage.getItem('currentUser') || '{}').name || 'User'
        : 'User',
      postedAt: moment().format(),
      referenceId: `PAY-${reservation.id}-${Date.now()}`
    }
    
    const updatedFolio = {
      ...folio,
      transactions: [...folio.transactions, transaction],
      balance: folio.balance - payment.amount
    }
    
    // Save
    const folios = typeof window !== 'undefined' 
      ? JSON.parse(localStorage.getItem('hotelFolios') || '[]')
      : []
    const index = folios.findIndex((f: any) => f.id === folio.id)
    folios[index] = updatedFolio
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('hotelFolios', JSON.stringify(folios))
    }
    
    // Log activity
    ActivityLogger.log('FOLIO_PAYMENT_POSTED', {
      folioNumber: folio.folioNumber,
      amount: payment.amount,
      method: payment.method,
      reservationId: reservation.id
    })
    
    setFolio(updatedFolio)
    
    // Dispatch folioUpdated event to refresh other components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('folioUpdated', {
        detail: { 
          reservationId: reservation.id, 
          folio: updatedFolio 
        }
      }))
    }
    
    setShowPayment(false)
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
              ${folio.transactions.map((t: any) => `
                <tr>
                  <td>${moment(t.date).format('DD/MM')} ${t.time}</td>
                  <td>${t.description}</td>
                  <td class="debit">${t.debit > 0 ? `₾${t.debit.toFixed(2)}` : ''}</td>
                  <td class="credit">${t.credit > 0 ? `₾${t.credit.toFixed(2)}` : ''}</td>
                  <td>₾${t.balance.toFixed(2)}</td>
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
  
  if (!folio) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center">
        <div className="bg-white rounded-lg p-6">
          <p className="text-red-600">Error loading folio</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-300 rounded">Close</button>
        </div>
      </div>
    )
  }
  
  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center">
        <div className="bg-white rounded-lg w-[900px] max-w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
          
          {/* Hotel Header */}
          <div className="bg-blue-600 text-white p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                {/* Logo and Hotel Name */}
                <div className="flex items-center gap-3 mb-2">
                  {hasDisplayableLogo(hotelInfo.logo) ? (
                    <img 
                      src={hotelInfo.logo} 
                      alt={hotelInfo.name} 
                      className="h-12"
                    />
                  ) : (
                    <div className="text-3xl">🏨</div>
                  )}
                  <div>
                    <h1 className="text-xl font-bold">{hotelInfo.name || 'Hotel'}</h1>
                    {hotelInfo.address && (
                      <p className="text-blue-100 text-xs">{hotelInfo.address}</p>
                    )}
                  </div>
                </div>
                <h2 className="text-lg font-medium mb-1">FOLIO / ანგარიშფაქტურა</h2>
                <p className="text-blue-100 text-sm">
                  Folio #{folio.folioNumber} | {reservation.guestName} | Room {reservation.roomNumber || reservation.roomId}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:text-blue-200 text-2xl"
              >
                ×
              </button>
            </div>
          </div>
          
          {/* Balance Bar */}
          <div className="bg-gray-100 p-4 border-b">
            <div className="flex justify-between items-center">
              <div className="text-gray-600 text-sm">
                Check-in: {moment(reservation.checkIn).format('DD/MM/YYYY')} | 
                Check-out: {moment(reservation.checkOut).format('DD/MM/YYYY')}
              </div>
              <div className="text-2xl font-bold">
                Balance: 
                <span className={folio.balance > 0 ? 'text-red-600 ml-2' : folio.balance < 0 ? 'text-green-600 ml-2' : 'text-gray-600 ml-2'}>
                  ₾{folio.balance.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="p-4 border-b bg-white">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setShowPostCharge(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                📝 Post Charge
              </button>
              <button
                onClick={() => setShowPayment(true)}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
              >
                💳 Post Payment
              </button>
              <button
                onClick={printFolio}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
              >
                🖨️ Print
              </button>
            </div>
          </div>
          
          {/* Transactions Table */}
          <div className="overflow-auto flex-1" style={{ maxHeight: '400px' }}>
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-sm">Date/Time</th>
                  <th className="px-4 py-2 text-left text-sm">Description</th>
                  <th className="px-4 py-2 text-right text-sm">Charges</th>
                  <th className="px-4 py-2 text-right text-sm">Payments</th>
                  <th className="px-4 py-2 text-right text-sm">Balance</th>
                </tr>
              </thead>
              <tbody>
                {folio.transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-500">
                      No transactions yet
                    </td>
                  </tr>
                ) : (
                  folio.transactions.map((t: any, index: number) => (
                    <tr key={t.id} className={`border-b hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="px-4 py-2 text-sm">
                        {moment(t.date).format('DD/MM')} {t.time.substring(0, 5)}
                      </td>
                      <td className="px-4 py-2">{t.description}</td>
                      <td className="px-4 py-2 text-right">
                        {t.debit > 0 && <span className="text-red-600 font-medium">₾{t.debit.toFixed(2)}</span>}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {t.credit > 0 && <span className="text-green-600 font-medium">₾{t.credit.toFixed(2)}</span>}
                      </td>
                      <td className="px-4 py-2 text-right font-medium">
                        <span className={t.balance > 0 ? 'text-red-600' : t.balance < 0 ? 'text-green-600' : 'text-gray-600'}>
                          ₾{t.balance.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Tax Summary */}
          {(() => {
            const totalCharges = folio.transactions.reduce((sum: number, t: any) => sum + t.debit, 0)
            if (totalCharges > 0) {
              const taxData = calculateTaxBreakdown(totalCharges)
              if (taxData.totalTax > 0) {
                return (
                  <div className="bg-gray-50 rounded-lg p-3 mx-4 mt-4 mb-4">
                    <h4 className="font-medium text-gray-700 mb-2">🧾 Tax Breakdown (ჩათვლით)</h4>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span>წმინდა თანხა:</span>
                        <span>₾{taxData.net.toFixed(2)}</span>
                      </div>
                      {taxData.taxes.map((tax, idx) => (
                        <div key={idx} className="flex justify-between text-gray-600">
                          <span>{tax.name} ({tax.rate}%):</span>
                          <span>₾{tax.amount.toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-medium border-t pt-1 mt-1">
                        <span>სულ გადასახადი:</span>
                        <span>₾{taxData.totalTax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-gray-900">
                        <span>სულ დარიცხვა:</span>
                        <span>₾{taxData.gross.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )
              }
            }
            return null
          })()}
          
          {/* Footer Summary */}
          <div className="bg-gray-100 p-4 border-t">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-sm text-gray-600">Total Charges</div>
                <div className="text-xl font-bold">
                  ₾{folio.transactions.reduce((sum: number, t: any) => sum + t.debit, 0).toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Total Payments</div>
                <div className="text-xl font-bold text-green-600">
                  ₾{folio.transactions.reduce((sum: number, t: any) => sum + t.credit, 0).toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Balance Due</div>
                <div className={`text-xl font-bold ${folio.balance > 0 ? 'text-red-600' : folio.balance < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                  ₾{folio.balance.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Post Charge Modal */}
      {showPostCharge && (
        <SimpleChargeModal
          onPost={handlePostCharge}
          onCancel={() => setShowPostCharge(false)}
        />
      )}
      
      {/* Payment Modal */}
      {showPayment && (
        <SimplePaymentModal
          amount={folio.balance}
          onPost={handlePayment}
          onCancel={() => setShowPayment(false)}
        />
      )}
    </>
  )
}

// Simple Charge Modal
const SimpleChargeModal = ({ onPost, onCancel }: {
  onPost: (charge: { category: string; description: string; amount: number }) => void
  onCancel: () => void
}) => {
  const [charge, setCharge] = useState({
    category: 'minibar',
    description: '',
    amount: 0
  })
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
        <h3 className="text-xl font-bold mb-4">Post Charge</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              value={charge.category}
              onChange={(e) => setCharge({...charge, category: e.target.value})}
              className="w-full border rounded px-3 py-2"
            >
              <option value="minibar">Mini Bar</option>
              <option value="food">Restaurant</option>
              <option value="spa">Spa</option>
              <option value="laundry">Laundry</option>
              <option value="phone">Telephone</option>
              <option value="misc">Other</option>
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
              value={charge.amount}
              onChange={(e) => setCharge({...charge, amount: parseFloat(e.target.value) || 0})}
              className="w-full border rounded px-3 py-2"
              step="0.01"
              min="0"
            />
          </div>
        </div>
        
        <div className="flex gap-2 mt-6">
          <button
            onClick={() => {
              if (charge.description && charge.amount > 0) {
                onPost(charge)
              } else {
                alert('გთხოვთ შეიყვანოთ description და amount')
              }
            }}
            disabled={!charge.description || charge.amount <= 0}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 transition"
          >
            Post
          </button>
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// Simple Payment Modal
const SimplePaymentModal = ({ amount, onPost, onCancel }: {
  amount: number
  onPost: (payment: { method: string; amount: number }) => void
  onCancel: () => void
}) => {
  const [payment, setPayment] = useState({
    method: 'cash',
    amount: amount > 0 ? amount : 0
  })
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
        <h3 className="text-xl font-bold mb-4">Post Payment</h3>
        
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
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Amount (₾)</label>
            <input
              type="number"
              value={payment.amount}
              onChange={(e) => setPayment({...payment, amount: parseFloat(e.target.value) || 0})}
              className="w-full border rounded px-3 py-2"
              step="0.01"
              min="0"
              max={amount}
            />
            {amount > 0 && (
              <p className="text-xs text-gray-500 mt-1">Balance: ₾{amount.toFixed(2)}</p>
            )}
          </div>
        </div>
        
        <div className="flex gap-2 mt-6">
          <button
            onClick={() => {
              if (payment.amount > 0 && payment.amount <= amount) {
                onPost(payment)
              } else {
                alert('გთხოვთ შეიყვანოთ სწორი თანხა')
              }
            }}
            disabled={payment.amount <= 0 || payment.amount > amount}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 transition"
          >
            Post Payment
          </button>
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}



