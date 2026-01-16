'use client'

import { useState } from 'react'
import { Button } from '@/components/ui'
import { useBreweryStore } from '@/store'

interface OrderItem {
  ingredientId: string
  ingredientName: string
  quantity: number
  unit: string
  estimatedPrice?: number
}

interface Props {
  isOpen: boolean
  onClose: () => void
  preSelectedIngredient?: { id: string; name: string; unit: string } | null
}

export function OrderModal({ isOpen, onClose, preSelectedIngredient }: Props) {
  const ingredients = useBreweryStore(state => state.ingredients || [])
  const addOrder = useBreweryStore(state => state.addOrder)
  
  const [orderItems, setOrderItems] = useState<OrderItem[]>(
    preSelectedIngredient 
      ? [{ 
          ingredientId: preSelectedIngredient.id, 
          ingredientName: preSelectedIngredient.name,
          quantity: 0,
          unit: preSelectedIngredient.unit,
        }] 
      : []
  )
  const [supplier, setSupplier] = useState('')
  const [expectedDelivery, setExpectedDelivery] = useState('')
  const [notes, setNotes] = useState('')
  
  // For adding new item
  const [selectedIngredientId, setSelectedIngredientId] = useState('')
  const [quantity, setQuantity] = useState(0)
  
  if (!isOpen) return null
  
  const addItem = () => {
    const ingredient = ingredients.find(i => i.id === selectedIngredientId)
    if (!ingredient || quantity <= 0) return
    
    // Check if already added
    if (orderItems.some(item => item.ingredientId === selectedIngredientId)) {
      alert('ეს ინგრედიენტი უკვე დამატებულია!')
      return
    }
    
    setOrderItems(prev => [...prev, {
      ingredientId: ingredient.id,
      ingredientName: ingredient.name,
      quantity,
      unit: ingredient.unit,
      estimatedPrice: ingredient.pricePerUnit ? ingredient.pricePerUnit * quantity : undefined,
    }])
    setSelectedIngredientId('')
    setQuantity(0)
  }
  
  const removeItem = (ingredientId: string) => {
    setOrderItems(prev => prev.filter(item => item.ingredientId !== ingredientId))
  }
  
  const totalEstimatedPrice = orderItems.reduce((sum, item) => sum + (item.estimatedPrice || 0), 0)
  
  const handleSubmit = () => {
    if (orderItems.length === 0) {
      alert('დაამატეთ მინიმუმ ერთი ინგრედიენტი!')
      return
    }
    if (!supplier) {
      alert('მიუთითეთ მომწოდებელი!')
      return
    }
    
    addOrder({
      items: orderItems,
      supplier,
      expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : undefined,
      notes,
      status: 'pending',
      totalAmount: totalEstimatedPrice,
    })
    
    alert('შეკვეთა დამატებულია!')
    onClose()
  }
  
  // Filter available ingredients (low stock first)
  const availableIngredients = ingredients
    .filter(i => !orderItems.some(item => item.ingredientId === i.id))
    .sort((a, b) => {
      const aLow = a.currentStock < a.minStock
      const bLow = b.currentStock < b.minStock
      if (aLow && !bLow) return -1
      if (!aLow && bLow) return 1
      return 0
    })
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">📦 ახალი შეკვეთა</h2>
            <button onClick={onClose} className="text-2xl hover:text-copper text-white">×</button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Supplier */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">მომწოდებელი *</label>
            <input
              type="text"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="მაგ: MaltCo, HopUnion"
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
            />
          </div>
          
          {/* Expected Delivery */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">მოსალოდნელი მიწოდება</label>
            <input
              type="date"
              value={expectedDelivery}
              onChange={(e) => setExpectedDelivery(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
            />
          </div>
          
          {/* Add Item */}
          <div className="p-4 bg-slate-700/50 rounded-lg space-y-3">
            <h3 className="font-semibold text-white">➕ ინგრედიენტის დამატება</h3>
            <div className="grid grid-cols-3 gap-3">
              <select
                value={selectedIngredientId}
                onChange={(e) => setSelectedIngredientId(e.target.value)}
                className="col-span-2 px-4 py-2 bg-slate-600 rounded-lg text-white"
              >
                <option value="">აირჩიეთ ინგრედიენტი...</option>
                {availableIngredients.map(ing => (
                  <option key={ing.id} value={ing.id}>
                    {ing.currentStock < ing.minStock ? '⚠️ ' : ''}
                    {ing.name} ({ing.currentStock} {ing.unit} მარაგში)
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={quantity || ''}
                onChange={(e) => setQuantity(Number(e.target.value))}
                placeholder="რაოდენობა"
                className="px-4 py-2 bg-slate-600 rounded-lg text-white placeholder-slate-400"
              />
            </div>
            <Button onClick={addItem} disabled={!selectedIngredientId || quantity <= 0} size="sm">
              დამატება
            </Button>
          </div>
          
          {/* Order Items */}
          <div>
            <h3 className="font-semibold mb-3 text-white">📋 შეკვეთის სია ({orderItems.length})</h3>
            {orderItems.length > 0 ? (
              <div className="space-y-2">
                {orderItems.map(item => (
                  <div key={item.ingredientId} className="flex justify-between items-center p-3 bg-slate-700 rounded-lg">
                    <div>
                      <span className="font-medium text-white">{item.ingredientName}</span>
                      <span className="text-slate-400 ml-2">
                        {item.quantity} {item.unit}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      {item.estimatedPrice && (
                        <span className="text-green-400">~{item.estimatedPrice.toFixed(2)} ₾</span>
                      )}
                      <button
                        onClick={() => removeItem(item.ingredientId)}
                        className="text-red-400 hover:text-red-300"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
                
                {/* Total */}
                {totalEstimatedPrice > 0 && (
                  <div className="flex justify-between items-center p-3 bg-copper/20 border border-copper rounded-lg mt-4">
                    <span className="font-semibold text-white">სავარაუდო ჯამი:</span>
                    <span className="text-xl font-bold text-copper">{totalEstimatedPrice.toFixed(2)} ₾</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-center text-slate-500 py-4">
                შეკვეთაში ინგრედიენტები არ არის დამატებული
              </p>
            )}
          </div>
          
          {/* Notes */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">შენიშვნა</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg resize-none text-white"
            />
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-border flex justify-between">
          <Button variant="secondary" onClick={onClose}>გაუქმება</Button>
          <Button onClick={handleSubmit}>
            📦 შეკვეთის გაგზავნა
          </Button>
        </div>
      </div>
    </div>
  )
}









