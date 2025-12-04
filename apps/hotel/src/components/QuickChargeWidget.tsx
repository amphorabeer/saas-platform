'use client'

import React, { useState, useEffect } from 'react'
import { ExtraChargesService } from '../services/ExtraChargesService'

interface QuickChargeWidgetProps {
  reservationId: string
  onCharged?: () => void
}

export default function QuickChargeWidget({ reservationId, onCharged }: QuickChargeWidgetProps) {
  const [quickButtons, setQuickButtons] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [posting, setPosting] = useState<string | null>(null)
  
  useEffect(() => {
    loadQuickButtons()
  }, [])
  
  const loadQuickButtons = () => {
    if (typeof window === 'undefined') return
    
    const savedButtons = localStorage.getItem('quickButtons')
    const savedItems = localStorage.getItem('chargeItems')
    
    if (savedButtons) {
      try {
        setQuickButtons(JSON.parse(savedButtons))
      } catch (e) {
        console.error('Error loading quick buttons:', e)
      }
    } else {
      // Use defaults from ExtraChargesService
      const defaultButtons = [
        { itemId: 'MB-WATER', position: 1 },
        { itemId: 'MB-COLA', position: 2 },
        { itemId: 'MB-BEER', position: 3 },
        { itemId: 'FB-BREAKFAST', position: 4 },
        { itemId: 'LDRY-SHIRT', position: 5 },
        { itemId: 'TRANS-TAXI', position: 6 }
      ]
      setQuickButtons(defaultButtons)
    }
    
    if (savedItems) {
      try {
        setItems(JSON.parse(savedItems))
      } catch (e) {
        console.error('Error loading items:', e)
        // Fallback to service defaults
        setItems(ExtraChargesService.ITEMS)
      }
    } else {
      setItems(ExtraChargesService.ITEMS)
    }
  }
  
  const postQuickCharge = async (itemId: string) => {
    const item = items.find(i => i.id === itemId)
    if (!item) {
      alert('Item not found')
      return
    }
    
    // Check stock if tracking
    if (item.trackStock && item.currentStock <= 0) {
      alert(`❌ ${item.name} is out of stock!`)
      return
    }
    
    setPosting(itemId)
    
    try {
      // Animation
      const button = document.getElementById(`quick-${itemId}`)
      button?.classList.add('animate-bounce')
      
      // Post charge
      const result = await ExtraChargesService.postExtraCharge({
        reservationId,
        itemId,
        quantity: 1,
        notes: 'Quick charge'
      })
      
      if (result.success) {
        // Success animation
        button?.classList.remove('animate-bounce')
        button?.classList.add('bg-green-500')
        
        // Update stock if tracking
        if (item.trackStock) {
          const updatedItems = items.map(i => 
            i.id === itemId 
              ? { ...i, currentStock: (i.currentStock || 0) - 1 }
              : i
          )
          setItems(updatedItems)
          if (typeof window !== 'undefined') {
            localStorage.setItem('chargeItems', JSON.stringify(updatedItems))
          }
        }
        
        setTimeout(() => {
          button?.classList.remove('bg-green-500')
        }, 500)
        
        if (onCharged) {
          onCharged()
        }
      } else {
        alert(`❌ Error: ${result.error || 'Failed to post charge'}`)
        button?.classList.remove('animate-bounce')
      }
    } catch (error: any) {
      alert(`❌ Error: ${error.message || 'Unknown error'}`)
      const button = document.getElementById(`quick-${itemId}`)
      button?.classList.remove('animate-bounce')
    } finally {
      setPosting(null)
    }
  }
  
  const getItemIcon = (itemName: string) => {
    const name = itemName.toLowerCase()
    if (name.includes('water')) return '💧'
    if (name.includes('cola') || name.includes('soda')) return '🥤'
    if (name.includes('beer')) return '🍺'
    if (name.includes('breakfast')) return '☕'
    if (name.includes('laundry') || name.includes('shirt')) return '👔'
    if (name.includes('taxi') || name.includes('transport')) return '🚕'
    if (name.includes('spa')) return '🧖'
    if (name.includes('phone')) return '📞'
    return '📦'
  }
  
  if (quickButtons.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-4">
        <h3 className="font-bold mb-3 flex items-center gap-2">
          ⚡ Quick Charges
        </h3>
        <p className="text-sm text-gray-500 text-center py-4">
          No quick buttons configured. Go to Settings → Charges → Quick Buttons to add items.
        </p>
      </div>
    )
  }
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <h3 className="font-bold mb-3 flex items-center gap-2">
        ⚡ Quick Charges
        <a 
          href="#settings" 
          onClick={(e) => {
            e.preventDefault()
            // You can navigate to settings or open a modal
            alert('Navigate to Settings → Charges → Quick Buttons to edit')
          }}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          (Edit)
        </a>
      </h3>
      
      <div className="grid grid-cols-3 gap-2">
        {quickButtons.map(btn => {
          const item = items.find(i => i.id === btn.itemId)
          if (!item) return null
          
          const isPosting = posting === btn.itemId
          const isOutOfStock = item.trackStock && item.currentStock <= 0
          
          return (
            <button
              key={btn.itemId}
              id={`quick-${btn.itemId}`}
              onClick={() => !isPosting && !isOutOfStock && postQuickCharge(btn.itemId)}
              disabled={isPosting || isOutOfStock}
              className={`relative p-3 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
                isPosting ? 'animate-pulse' : ''
              }`}
            >
              <div className="text-2xl mb-1">
                {getItemIcon(item.name)}
              </div>
              <div className="text-xs font-medium truncate">{item.name}</div>
              <div className="text-sm font-bold text-blue-600">₾{item.unitPrice?.toFixed(2) || '0.00'}</div>
              
              {/* Stock indicator */}
              {item.trackStock && (
                <div className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
                  item.currentStock < 5 
                    ? 'bg-red-500 animate-pulse' 
                    : 'bg-green-500'
                }`} 
                title={`Stock: ${item.currentStock}`}
                />
              )}
              
              {/* Out of stock overlay */}
              {isOutOfStock && (
                <div className="absolute inset-0 bg-red-100 bg-opacity-75 rounded-lg flex items-center justify-center">
                  <span className="text-xs text-red-700 font-bold">Out of Stock</span>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}



