'use client'

import React, { useState, useEffect } from 'react'
import moment from 'moment'
import { ExtraChargesService } from '../services/ExtraChargesService'
import { ActivityLogger } from '../lib/activityLogger'
import { FolioService } from '../services/FolioService'
import { RESERVATION_STATUS, ROOM_STATUS, FOLIO_STATUS } from '../constants/statusConstants'
import FolioManager from './FolioManager'

interface CheckOutModalProps {
  reservation: any
  onClose: () => void
  onCheckOut: () => void
  onReservationUpdate?: (id: string, updates: any) => Promise<void>
}

export default function CheckOutModal({ 
  reservation,
  onClose,
  onCheckOut,
  onReservationUpdate
}: CheckOutModalProps) {
  const [folio, setFolio] = useState<any>(null)
  const [showFolioDetails, setShowFolioDetails] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paymentAmount, setPaymentAmount] = useState(0)
  const [showPostCharge, setShowPostCharge] = useState(false)
  const [canCheckOut, setCanCheckOut] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showFullFolio, setShowFullFolio] = useState(false)
  
  useEffect(() => {
    loadFolio()
  }, [reservation.id])
  
  const loadFolio = async () => {
    try {
      setLoading(true)
      if (typeof window === 'undefined') return
      
      const folios = JSON.parse(localStorage.getItem('hotelFolios') || '[]')
      let resFolio = folios.find((f: any) => f.reservationId === reservation.id)
      
      if (!resFolio) {
        // Create folio if doesn't exist
        resFolio = await createFolio()
      }
      
      setFolio(resFolio)
      setPaymentAmount(resFolio.balance > 0 ? resFolio.balance : 0)
      
      // Check if can checkout
      setCanCheckOut(resFolio.balance <= 0)
    } catch (error) {
      console.error('Error loading folio:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const createFolio = async () => {
    // Use FolioService to create empty folio
    return FolioService.createEmptyFolio(reservation) || null
  }
  
  const handlePayment = async () => {
    if (!folio || paymentAmount <= 0) {
      alert('გთხოვთ შეიყვანოთ თანხა')
      return
    }
    
    if (paymentAmount > folio.balance) {
      alert('გადახდა აღემატება ბალანსს')
      return
    }
    
    const payment = {
      id: `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      folioId: folio.id,
      date: moment().format('YYYY-MM-DD'),
      time: moment().format('HH:mm:ss'),
      type: 'payment',
      category: 'payment',
      description: `Payment by ${paymentMethod}`,
      debit: 0,
      credit: paymentAmount,
      balance: folio.balance - paymentAmount,
      postedBy: typeof window !== 'undefined' 
        ? JSON.parse(localStorage.getItem('currentUser') || '{}').name || 'User'
        : 'User',
      postedAt: moment().format(),
      referenceId: `PAY-${reservation.id}-${Date.now()}`,
      paymentMethod: paymentMethod // Add paymentMethod field
    }
    
    // Update folio
    const updatedFolio = {
      ...folio,
      transactions: [...folio.transactions, payment],
      balance: folio.balance - paymentAmount
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
      amount: paymentAmount,
      method: paymentMethod,
      reservationId: reservation.id
    })
    
    setFolio(updatedFolio)
    setCanCheckOut(updatedFolio.balance <= 0)
    setPaymentAmount(updatedFolio.balance > 0 ? updatedFolio.balance : 0)
    
    alert(`✅ Payment processed: ₾${paymentAmount.toFixed(2)}`)
  }
  
  const processCheckOut = async () => {
    if (!folio) return
    
    // Validate balance - allow small rounding errors (0.01)
    if (Math.abs(folio.balance) > 0.01) {
      alert(`❌ Cannot check out with outstanding balance: ₾${folio.balance.toFixed(2)}\n\nPlease process payment first.`)
      return
    }
    
    try {
      // Update reservation status via API
      if (onReservationUpdate) {
        await onReservationUpdate(reservation.id, {
          status: RESERVATION_STATUS.CHECKED_OUT,
          actualCheckOut: moment().format(),
          checkedOutAt: moment().format()
        })
      } else {
        // Fallback: update via API
        await fetch('/api/hotel/reservations', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: reservation.id,
            status: RESERVATION_STATUS.CHECKED_OUT,
            actualCheckOut: moment().format(),
            checkedOutAt: moment().format()
          })
        })
      }
      
      // Close folio using FolioService
      const closedBy = typeof window !== 'undefined' 
        ? JSON.parse(localStorage.getItem('currentUser') || '{}').name || 'User'
        : 'User'
      FolioService.closeFolio(folio.id, closedBy)
      
      // Update room status to VACANT but dirty (needs cleaning)
      if (typeof window !== 'undefined') {
        const rooms = JSON.parse(localStorage.getItem('hotelRooms') || '[]')
        const updatedRooms = rooms.map((r: any) => {
          if (r.id === reservation.roomId || r.roomNumber === reservation.roomNumber) {
            return {
              ...r,
              status: 'VACANT', // Room is VACANT but...
              cleaningStatus: 'dirty' // ...needs cleaning!
            }
          }
          return r
        })
        localStorage.setItem('hotelRooms', JSON.stringify(updatedRooms))
      }
      
      // Also update via API if available
      try {
        await fetch('/api/hotel/rooms/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId: reservation.roomId,
            status: ROOM_STATUS.CLEANING
          })
        })
      } catch (e) {
        console.warn('API update failed, using localStorage only:', e)
      }
      
      // Auto-create housekeeping task (only if doesn't exist)
      const savedTasks = typeof window !== 'undefined' 
        ? localStorage.getItem('housekeepingTasks')
        : null
      const existingTasks = savedTasks ? JSON.parse(savedTasks) : []
      
      // Check if pending task already exists for this room
      const roomNumber = reservation.roomNumber || reservation.roomId
      const existingTask = existingTasks.find((t: any) => 
        (t.roomId === reservation.roomId || t.roomNumber === roomNumber) && 
        t.type === 'checkout' &&
        t.status === 'pending'
      )
      
      if (!existingTask) {
        // Get floor from room
        const rooms = typeof window !== 'undefined' 
          ? JSON.parse(localStorage.getItem('hotelRooms') || '[]')
          : []
        const room = rooms.find((r: any) => r.id === reservation.roomId || r.roomNumber === roomNumber)
        const roomFloor = room?.floor || Math.floor(parseInt(roomNumber) / 100) || 1
        
        // Load default checklist
        // Load checklist from Settings localStorage
        const loadChecklistFromSettings = (): any[] => {
          if (typeof window === 'undefined') return []
          const saved = localStorage.getItem('housekeepingChecklist')
          if (saved) {
            try {
              const parsed = JSON.parse(saved)
              return parsed.map((item: any) => ({
                item: item.task || item.item || item.name,
                completed: false,
                required: item.required || false,
                category: item.category || 'ზოგადი'
              }))
            } catch (e) {
              console.error('Error loading checklist:', e)
            }
          }
          return []
        }
        
        const defaultChecklist = loadChecklistFromSettings()
        
        const housekeepingTask = {
          id: `task-${Date.now()}-${reservation.roomId}`,
          roomId: reservation.roomId,
          roomNumber: roomNumber,
          floor: roomFloor,
          type: 'checkout',
          status: 'pending',
          priority: 'high',
          assignedTo: '',
          scheduledTime: moment().format('HH:mm'),
          notes: `Check-out cleaning after ${reservation.guestName}`,
          checklist: defaultChecklist
        }
        
        existingTasks.push(housekeepingTask)
        if (typeof window !== 'undefined') {
          localStorage.setItem('housekeepingTasks', JSON.stringify(existingTasks))
        }
      }
      
      // Log activity
      ActivityLogger.log('CHECK_OUT_COMPLETED', {
        reservationId: reservation.id,
        guestName: reservation.guestName,
        roomNumber: reservation.roomNumber,
        folioNumber: folio.folioNumber
      })
      
      alert('✅ Check-out completed successfully!')
      onCheckOut()
      
    } catch (error) {
      console.error('Check-out error:', error)
      alert('❌ Error completing check-out')
    }
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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto mx-4">
        
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold">Check-Out Process</h2>
            <p className="text-gray-600">
              {reservation.guestName} - Room {reservation.roomNumber || reservation.roomId}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>
        
        {/* Folio Summary */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-lg">Folio #{folio.folioNumber}</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setShowFolioDetails(!showFolioDetails)}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                {showFolioDetails ? 'Hide Details' : 'Show Details'}
              </button>
              <button
                onClick={() => setShowFullFolio(!showFullFolio)}
                className="text-purple-600 hover:text-purple-800 text-sm"
              >
                {showFullFolio ? 'Hide Full Folio' : 'Full Folio View'}
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <span className="text-sm text-gray-600">Check-in:</span>
              <div className="font-bold">{moment(reservation.checkIn).format('DD/MM/YYYY')}</div>
            </div>
            <div>
              <span className="text-sm text-gray-600">Check-out:</span>
              <div className="font-bold">{moment(reservation.checkOut).format('DD/MM/YYYY')}</div>
            </div>
            <div>
              <span className="text-sm text-gray-600">Balance:</span>
              <div className={`text-2xl font-bold ${folio.balance > 0 ? 'text-red-600' : folio.balance < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                ₾{folio.balance.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
        
        {/* Full Folio View */}
        {showFullFolio && (
          <div className="mb-6">
            <FolioManager
              reservationId={reservation.id}
              onClose={() => setShowFullFolio(false)}
            />
          </div>
        )}
        
        {/* Folio Transactions */}
        {showFolioDetails && !showFullFolio && (
          <div className="border rounded-lg mb-6 overflow-hidden">
            <div className="bg-gray-100 px-4 py-2 font-bold">
              Transaction Details
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm">Date</th>
                    <th className="px-4 py-2 text-left text-sm">Description</th>
                    <th className="px-4 py-2 text-right text-sm">Charges</th>
                    <th className="px-4 py-2 text-right text-sm">Payments</th>
                    <th className="px-4 py-2 text-right text-sm">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {folio.transactions.length > 0 ? (
                    folio.transactions.map((t: any, index: number) => (
                      <tr key={t.id} className={`border-b hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="px-4 py-2 text-sm">
                          {moment(t.date).format('DD/MM')} {t.time}
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
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        No transactions yet
                      </td>
                    </tr>
                  )}
                </tbody>
                {folio.transactions.length > 0 && (
                  <tfoot className="bg-gray-100 font-bold">
                    <tr>
                      <td colSpan={2} className="px-4 py-2">TOTAL</td>
                      <td className="px-4 py-2 text-right text-red-600">
                        ₾{folio.transactions.reduce((sum: number, t: any) => sum + t.debit, 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-right text-green-600">
                        ₾{folio.transactions.reduce((sum: number, t: any) => sum + t.credit, 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-right text-xl">
                        <span className={folio.balance > 0 ? 'text-red-600' : folio.balance < 0 ? 'text-green-600' : 'text-gray-600'}>
                          ₾{folio.balance.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}
        
        {/* Quick Actions */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setShowPostCharge(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            + Add Charge
          </button>
          <button
            onClick={printFolio}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
          >
            🖨️ Print Folio
          </button>
        </div>
        
        {/* Payment Section */}
        {folio.balance > 0 && (
          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 mb-6">
            <h4 className="font-bold mb-3 text-yellow-800">⚠️ Outstanding Balance - Payment Required</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="cash">💵 Cash</option>
                  <option value="card">💳 Credit Card</option>
                  <option value="bank">🏦 Bank Transfer</option>
                  <option value="company">🏢 Company Account</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Amount (₾)</label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full border rounded px-3 py-2"
                  max={folio.balance}
                />
                <p className="text-xs text-gray-500 mt-1">Balance: ₾{folio.balance.toFixed(2)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">&nbsp;</label>
                <button
                  onClick={handlePayment}
                  disabled={paymentAmount <= 0 || paymentAmount > folio.balance}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 transition"
                >
                  Process Payment
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Check-out Button */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div>
            {folio.balance > 0 && (
              <p className="text-red-600 font-bold">
                ❌ Cannot check-out until balance is paid
              </p>
            )}
            {folio.balance < 0 && (
              <p className="text-blue-600">
                ℹ️ Credit balance of ₾{Math.abs(folio.balance).toFixed(2)} will be refunded
              </p>
            )}
            {folio.balance === 0 && (
              <p className="text-green-600 font-medium">
                ✅ Balance settled - Ready for check-out
              </p>
            )}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-300 rounded hover:bg-gray-400 transition"
            >
              Cancel
            </button>
            <button
              onClick={processCheckOut}
              disabled={folio.balance > 0}
              className={`px-6 py-3 rounded font-bold transition ${
                folio.balance > 0 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {folio.balance > 0 ? '⏳ Settle Balance First' : '✅ Complete Check-Out'}
            </button>
          </div>
        </div>
        
        {/* Post Charge Modal */}
        {showPostCharge && (
          <QuickChargeModal
            folioId={folio.id}
            reservationId={reservation.id}
            onClose={() => {
              setShowPostCharge(false)
              loadFolio() // Reload after charge
            }}
          />
        )}
      </div>
    </div>
  )
}

// Quick Charge Modal for last-minute charges
const QuickChargeModal = ({ folioId, reservationId, onClose }: {
  folioId: string
  reservationId: string
  onClose: () => void
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedItem, setSelectedItem] = useState<string>('')
  const [quantity, setQuantity] = useState(1)
  const [posting, setPosting] = useState(false)
  
  const categories = ExtraChargesService.CATEGORIES
  const items = ExtraChargesService.ITEMS
  
  const getCategoryItems = () => {
    if (!selectedCategory) return []
    return items.filter(i => i.categoryId === selectedCategory && i.available)
  }
  
  const getItemDetails = () => {
    if (!selectedItem) return null
    return items.find(i => i.id === selectedItem)
  }
  
  const calculateAmount = () => {
    const item = getItemDetails()
    if (!item) return 0
    
    const category = categories.find(c => c.id === item.categoryId)
    if (!category) return 0
    
    const subtotal = item.unitPrice * quantity
    const serviceCharge = category.serviceChargeRate 
      ? subtotal * (category.serviceChargeRate / 100) 
      : 0
    const taxableAmount = subtotal + serviceCharge
    const tax = taxableAmount * (category.taxRate / 100)
    
    return taxableAmount + tax
  }
  
  const handlePost = async () => {
    if (!selectedItem || quantity <= 0) {
      alert('გთხოვთ აირჩიოთ პროდუქტი და შეიყვანოთ რაოდენობა')
      return
    }
    
    setPosting(true)
    
    const result = await ExtraChargesService.postExtraCharge({
      reservationId,
      itemId: selectedItem,
      quantity,
      notes: 'Last-minute charge at check-out'
    })
    
    if (result.success) {
      alert(`✅ Charge posted: ₾${result.totalAmount.toFixed(2)}`)
      onClose()
    } else {
      alert(`❌ Error: ${result.error}`)
    }
    
    setPosting(false)
  }
  
  const quickCharges = [
    { itemId: 'MB-WATER', label: '💧 Water', quantity: 1 },
    { itemId: 'MB-COLA', label: '🥤 Cola', quantity: 1 },
    { itemId: 'MB-BEER', label: '🍺 Beer', quantity: 1 },
    { itemId: 'FB-BREAKFAST', label: '☕ Breakfast', quantity: 1 },
    { itemId: 'LDRY-SHIRT', label: '👔 Laundry', quantity: 1 }
  ]
  
  const handleQuickCharge = async (charge: typeof quickCharges[0]) => {
    setPosting(true)
    
    const result = await ExtraChargesService.postExtraCharge({
      reservationId,
      itemId: charge.itemId,
      quantity: charge.quantity,
      notes: 'Quick charge at check-out'
    })
    
    if (result.success) {
      alert(`✅ ${charge.label} posted: ₾${result.totalAmount.toFixed(2)}`)
      onClose()
    } else {
      alert(`❌ Error: ${result.error}`)
    }
    
    setPosting(false)
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-[500px] max-w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">Quick Charges</h3>
        
        {/* Quick Charge Buttons */}
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-2">Common Charges:</h4>
          <div className="grid grid-cols-2 gap-2">
            {quickCharges.map(charge => (
              <button
                key={charge.itemId}
                onClick={() => handleQuickCharge(charge)}
                disabled={posting}
                className="p-3 bg-gray-100 hover:bg-gray-200 rounded text-center transition disabled:opacity-50"
              >
                <div className="text-lg mb-1">{charge.label.split(' ')[0]}</div>
                <div className="text-xs text-gray-600">{charge.label.split(' ')[1]}</div>
              </button>
            ))}
          </div>
        </div>
        
        <div className="border-t pt-4 mb-4">
          <h4 className="text-sm font-medium mb-2">Or Select Custom Charge:</h4>
          
          {/* Category Selection */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {categories.slice(0, 4).map(cat => (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id)
                  setSelectedItem('')
                }}
                className={`p-2 rounded border text-center text-xs transition ${
                  selectedCategory === cat.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="text-lg mb-1">{cat.icon}</div>
                <div>{cat.name}</div>
              </button>
            ))}
          </div>
          
          {/* Item Selection */}
          {selectedCategory && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Select Item</label>
              <select
                value={selectedItem}
                onChange={(e) => setSelectedItem(e.target.value)}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">-- Select Item --</option>
                {getCategoryItems().map(item => (
                  <option key={item.id} value={item.id}>
                    {item.name} - ₾{item.unitPrice}/{item.unit}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {/* Quantity */}
          {selectedItem && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Quantity</label>
              <div className="flex gap-4 items-center">
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  className="w-24 border rounded px-3 py-2"
                />
                <div className="text-lg font-bold text-blue-600">
                  Total: ₾{calculateAmount().toFixed(2)}
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex gap-2">
          {selectedItem && (
            <button
              onClick={handlePost}
              disabled={posting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 transition"
            >
              {posting ? 'Posting...' : 'Post Charge'}
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

