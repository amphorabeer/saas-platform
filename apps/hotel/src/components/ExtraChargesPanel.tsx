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
  const [taxRates, setTaxRates] = useState({
    vat: 18,
    serviceCharge: 10
  })
  
  // Load categories and items from API
  const [categories, setCategories] = useState<any[]>(ExtraChargesService.CATEGORIES)
  const [items, setItems] = useState<any[]>(ExtraChargesService.ITEMS)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    loadData()
  }, [reservationId])
  
  const loadData = async () => {
    setLoading(true)
    await Promise.all([
      loadCategories(),
      loadItems(),
      loadTaxRates(),
      loadRecentCharges()
    ])
    setLoading(false)
  }
  
  const loadCategories = async () => {
    try {
      const response = await fetch('/api/hotel/charge-categories')
      if (response.ok) {
        const apiCategories = await response.json()
        if (Array.isArray(apiCategories) && apiCategories.length > 0) {
          const mapped = apiCategories.map((c: any) => ({
            id: c.id,
            code: c.code,
            name: c.name,
            icon: c.icon || '📦',
            department: c.department || 'ROOMS',
            taxRate: c.taxRate || taxRates.vat,
            serviceChargeRate: c.serviceChargeRate || 0
          }))
          setCategories(mapped)
          console.log('[ExtraChargesPanel] Loaded categories from API:', mapped.length)
          return
        }
      }
    } catch (e) {
      console.log('[ExtraChargesPanel] Categories API error, using defaults')
    }
    
    // Fallback to localStorage
    const saved = localStorage.getItem('chargeCategories')
    if (saved) {
      try {
        setCategories(JSON.parse(saved))
        return
      } catch (e) {}
    }
    
    // Use hardcoded defaults
    setCategories(ExtraChargesService.CATEGORIES)
  }
  
  const loadItems = async () => {
    try {
      const response = await fetch('/api/hotel/charge-items')
      if (response.ok) {
        const apiItems = await response.json()
        if (Array.isArray(apiItems) && apiItems.length > 0) {
          const mapped = apiItems.map((i: any) => ({
            id: i.id,
            code: i.code,
            name: i.name,
            categoryId: i.category || i.categoryId,
            unitPrice: i.price || i.unitPrice || 0,
            unit: i.unit || 'piece',
            department: i.department || 'ROOMS',
            available: i.isActive !== false,
            trackStock: i.stock !== null && i.stock !== undefined,
            currentStock: i.stock
          }))
          setItems(mapped)
          console.log('[ExtraChargesPanel] Loaded items from API:', mapped.length)
          return
        }
      }
    } catch (e) {
      console.log('[ExtraChargesPanel] Items API error, using defaults')
    }
    
    // Fallback to localStorage
    const saved = localStorage.getItem('chargeItems')
    if (saved) {
      try {
        setItems(JSON.parse(saved))
        return
      } catch (e) {}
    }
    
    // Use hardcoded defaults
    setItems(ExtraChargesService.ITEMS)
  }
  
  const loadTaxRates = async () => {
    if (typeof window === 'undefined') return
    
    // Try API first
    try {
      const response = await fetch('/api/hotel/taxes')
      if (response.ok) {
        const apiTaxes = await response.json()
        if (apiTaxes && apiTaxes.length > 0) {
          const vatTax = apiTaxes.find((t: any) => 
            t.code === 'VAT' || 
            t.name?.toLowerCase().includes('vat') || 
            t.name?.includes('დღგ')
          )
          
          const serviceTax = apiTaxes.find((t: any) => 
            t.code === 'SERVICE' ||
            t.name?.toLowerCase().includes('service') || 
            t.name?.includes('სერვის')
          )
          
          setTaxRates({
            vat: vatTax?.rate ?? 18,
            serviceCharge: serviceTax?.rate ?? 10
          })
          
          console.log('[ExtraChargesPanel] Loaded tax rates from API')
          return
        }
      }
    } catch (e) {
      console.log('[ExtraChargesPanel] API error, falling back to localStorage')
    }
    
    // Fallback to localStorage - Try to load from hotelTaxes (unified key)
    const saved = localStorage.getItem('hotelTaxes')
    if (saved) {
      try {
        const taxes = JSON.parse(saved)
        
        // Handle both array format (taxList) and object format (taxes)
        let taxArray: any[] = []
        if (Array.isArray(taxes)) {
          taxArray = taxes
        } else {
          // Convert object to array format
          taxArray = Object.entries(taxes).map(([key, value]) => ({
            key,
            name: key,
            rate: typeof value === 'number' ? value : 0,
            value: typeof value === 'number' ? value : 0
          }))
        }
        
        // Find VAT tax
        const vatTax = taxArray.find((t: any) => 
          t.key === 'VAT' || 
          t.name?.toLowerCase().includes('vat') || 
          t.name?.includes('დღგ') ||
          t.label?.toLowerCase().includes('vat') ||
          t.label?.includes('დღგ')
        )
        
        // Find Service Charge tax
        const serviceTax = taxArray.find((t: any) => 
          t.key === 'SERVICE_CHARGE' ||
          t.name?.toLowerCase().includes('service') || 
          t.name?.includes('სერვის') ||
          t.label?.toLowerCase().includes('service') ||
          t.label?.includes('სერვის')
        )
        
        setTaxRates({
          vat: vatTax?.rate ?? vatTax?.value ?? 18,
          serviceCharge: serviceTax?.rate ?? serviceTax?.value ?? 10
        })
        
        console.log('Loaded tax rates from localStorage:', {
          vat: vatTax?.rate ?? vatTax?.value ?? 18,
          service: serviceTax?.rate ?? serviceTax?.value ?? 10
        })
      } catch (e) {
        console.error('Error loading tax rates:', e)
      }
    }
  }
  
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
    // Match by category id, code, or categoryId
    return items.filter(i => {
      const catMatch = i.categoryId === selectedCategory || 
                       i.category === selectedCategory ||
                       i.categoryId === categories.find(c => c.id === selectedCategory)?.code
      return catMatch && i.available !== false
    })
  }
  
  const getItemDetails = () => {
    if (!selectedItem) return null
    return items.find(i => i.id === selectedItem)
  }
  
  // Calculate tax inclusive breakdown
  const calculateTaxInclusive = () => {
    const item = getItemDetails()
    if (!item) return {
      gross: 0,
      net: 0,
      serviceCharge: 0,
      serviceRate: 0,
      vat: 0,
      vatRate: 0,
      total: 0
    }
    
    const category = categories.find(c => c.id === item.categoryId)
    if (!category) return {
      gross: 0,
      net: 0,
      serviceCharge: 0,
      serviceRate: 0,
      vat: 0,
      vatRate: 0,
      total: 0
    }
    
    // Gross price (taxes included) - this is what customer pays
    const grossPrice = item.unitPrice * quantity
    
    // Get tax rates (from loaded settings, not hardcoded)
    const vatRate = taxRates.vat
    const serviceRate = category.serviceChargeRate ? taxRates.serviceCharge : 0
    
    // Calculate tax inclusive breakdown
    // Total tax multiplier: 1 + vatRate/100 + serviceRate/100
    const totalTaxRate = 1 + (vatRate / 100) + (serviceRate / 100)
    const netPrice = grossPrice / totalTaxRate
    
    const serviceChargeAmount = netPrice * (serviceRate / 100)
    const vatAmount = netPrice * (vatRate / 100)
    
    return {
      gross: grossPrice,        // ₾35 (what customer pays - taxes included)
      net: netPrice,            // ₾27.34 (before taxes)
      serviceCharge: serviceChargeAmount,  // ₾2.73
      serviceRate: serviceRate,      // 10%
      vat: vatAmount,               // ₾4.92
      vatRate: vatRate,             // 18%
      total: grossPrice             // ₾35 (same as gross - taxes included!)
    }
  }
  
  const calculateAmount = () => {
    // Return gross price (taxes included)
    return calculateTaxInclusive().gross
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
  const category = item ? categories.find(c => c.id === item.categoryId || c.code === item.categoryId) : null
  const taxBreakdown = calculateTaxInclusive()
  const totalAmount = taxBreakdown.gross
  
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4">➕ Extra Charges</h2>
        <div className="text-center py-8 text-gray-500">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-2"></div>
          <p>იტვირთება...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-bold mb-4">➕ Extra Charges</h2>
      
      {/* Category Selection */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {categories.map(cat => (
          <button
            key={cat.id || cat.code}
            onClick={() => {
              setSelectedCategory(cat.id || cat.code)
              setSelectedItem('')
            }}
            className={`p-3 rounded border text-center hover:bg-gray-50 transition ${
              selectedCategory === cat.id || selectedCategory === cat.code ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-gray-200'
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
          
          {/* Amount Breakdown - Tax Inclusive */}
          {item && category && (
            <div className="bg-gray-50 p-4 rounded mb-4 border border-gray-200">
              <div className="text-sm space-y-1">
                <div className="flex justify-between font-medium">
                  <span>Price ({quantity} × ₾{item.unitPrice}):</span>
                  <span>₾{taxBreakdown.gross.toFixed(2)}</span>
                </div>
                <div className="text-xs text-gray-500 ml-4 space-y-0.5 border-l-2 border-gray-300 pl-2 mt-1">
                  <div className="flex justify-between">
                    <span>Net amount:</span>
                    <span>₾{taxBreakdown.net.toFixed(2)}</span>
                  </div>
                  {taxBreakdown.serviceCharge > 0 && (
                    <div className="flex justify-between">
                      <span>Service Charge ({taxBreakdown.serviceRate}%):</span>
                      <span>₾{taxBreakdown.serviceCharge.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>VAT ({taxBreakdown.vatRate}%):</span>
                    <span>₾{taxBreakdown.vat.toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex justify-between font-bold border-t pt-1 mt-1">
                  <span>Total (taxes included):</span>
                  <span className="text-blue-600">₾{taxBreakdown.total.toFixed(2)}</span>
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