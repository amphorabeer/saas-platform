'use client'

import React, { useState, useEffect } from 'react'
import moment from 'moment'
import { ExtraChargesService } from '../services/ExtraChargesService'
import { ActivityLogger } from '../lib/activityLogger'

interface ExtraChargesPanelProps {
  reservationId: string
  onChargePosted?: () => void
}

export default function ExtraChargesPanel({ 
  reservationId,
  onChargePosted
}: ExtraChargesPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedItem, setSelectedItem] = useState<string>('')
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')
  const [posting, setPosting] = useState(false)
  const [recentCharges, setRecentCharges] = useState<any[]>([])
  
  const categories = ExtraChargesService.CATEGORIES
  const items = ExtraChargesService.ITEMS
  
  useEffect(() => {
    loadRecentCharges()
  }, [reservationId])
  
  const loadRecentCharges = () => {
    if (typeof window === 'undefined') return
    
    const charges = JSON.parse(localStorage.getItem('extraCharges') || '[]')
    const resCharges = charges
      .filter((c: any) => c.reservationId === reservationId)
      .sort((a: any, b: any) => moment(b.postedDate).valueOf() - moment(a.postedDate).valueOf())
      .slice(0, 5)
    setRecentCharges(resCharges)
  }
  
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
      notes
    })
    
    if (result.success) {
      alert(`✅ Charge posted successfully! Amount: ₾${result.totalAmount.toFixed(2)}`)
      
      // Log activity
      ActivityLogger.log('EXTRA_CHARGE_POSTED', {
        reservationId,
        item: getItemDetails()?.name,
        quantity,
        amount: result.totalAmount
      })
      
      // Reset form
      setSelectedCategory('')
      setSelectedItem('')
      setQuantity(1)
      setNotes('')
      
      // Reload recent charges
      loadRecentCharges()
      
      // Notify parent
      if (onChargePosted) {
        onChargePosted()
      }
    } else {
      alert(`❌ Error: ${result.error}`)
    }
    
    setPosting(false)
  }
  
  const item = getItemDetails()
  const category = item ? categories.find(c => c.id === item.categoryId) : null
  const subtotal = item ? item.unitPrice * quantity : 0
  const serviceCharge = category?.serviceChargeRate ? subtotal * (category.serviceChargeRate / 100) : 0
  const taxableAmount = subtotal + serviceCharge
  const taxAmount = taxableAmount * (category?.taxRate || 18) / 100
  const totalAmount = calculateAmount()
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-bold mb-4">➕ Extra Charges</h2>
      
      {/* Category Selection */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => {
              setSelectedCategory(cat.id)
              setSelectedItem('')
            }}
            className={`p-3 rounded border text-center hover:bg-gray-50 transition ${
              selectedCategory === cat.id ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-gray-200'
            }`}
          >
            <div className="text-2xl mb-1">{cat.icon}</div>
            <div className="text-xs font-medium">{cat.name}</div>
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
                {item.trackStock && item.currentStock !== undefined && ` (Stock: ${item.currentStock})`}
              </option>
            ))}
          </select>
        </div>
      )}
      
      {/* Quantity and Notes */}
      {selectedItem && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Quantity</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Total Amount</label>
              <div className="text-2xl font-bold text-blue-600 pt-2">
                ₾{totalAmount.toFixed(2)}
              </div>
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border rounded px-3 py-2"
              rows={2}
              placeholder="Enter any notes..."
            />
          </div>
          
          {/* Amount Breakdown */}
          {item && category && (
            <div className="bg-gray-50 p-4 rounded mb-4 border border-gray-200">
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal ({quantity} × ₾{item.unitPrice}):</span>
                  <span>₾{subtotal.toFixed(2)}</span>
                </div>
                {serviceCharge > 0 && (
                  <div className="flex justify-between">
                    <span>Service Charge ({category.serviceChargeRate}%):</span>
                    <span>₾{serviceCharge.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>VAT ({category.taxRate}%):</span>
                  <span>₾{taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold border-t pt-1 mt-1">
                  <span>Total:</span>
                  <span className="text-blue-600">₾{totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
          
          <button
            onClick={handlePost}
            disabled={posting}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 transition"
          >
            {posting ? 'Posting...' : 'Post Charge'}
          </button>
        </>
      )}
      
      {/* Recent Charges */}
      {recentCharges.length > 0 && (
        <div className="mt-6 pt-6 border-t">
          <h3 className="font-bold mb-3">Recent Charges</h3>
          <div className="space-y-2">
            {recentCharges.map(charge => (
              <div key={charge.id} className="flex justify-between text-sm p-2 bg-gray-50 rounded">
                <div>
                  <span className="font-medium">{charge.itemName}</span>
                  <span className="text-gray-500 ml-2">
                    ({charge.quantity} × ₾{charge.unitPrice})
                  </span>
                </div>
                <div className="text-right">
                  <div className="font-bold">₾{charge.grossAmount.toFixed(2)}</div>
                  <div className="text-xs text-gray-500">
                    {moment(charge.postedDate).format('DD/MM HH:mm')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}



