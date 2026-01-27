'use client'

import React, { useState, useEffect } from 'react'
import { ExtraChargesService } from '../services/ExtraChargesService'
import { ActivityLogger } from '../lib/activityLogger'

interface QuickChargeButtonsProps {
  reservationId: string
  onCharged?: () => void
}

export default function QuickChargeButtons({ 
  reservationId,
  onCharged
}: QuickChargeButtonsProps) {
  const [quickCharges, setQuickCharges] = useState<{itemId: string, label: string, quantity: number}[]>([])
  
  const categories = ExtraChargesService.CATEGORIES
  const items = ExtraChargesService.ITEMS
  
  // Load quick charges from settings
  useEffect(() => {
    const loadQuickCharges = async () => {
      // Try API first
      try {
        const response = await fetch('/api/hotel/quick-charges')
        if (response.ok) {
          const quickChargeIds = await response.json()
          if (quickChargeIds && quickChargeIds.length > 0) {
            const loadedCharges = quickChargeIds.map((itemId: string) => {
              const item = items.find(i => i.id === itemId)
              if (item) {
                const category = categories.find(c => c.id === item.categoryId)
                return {
                  itemId: item.id,
                  label: `${category?.icon || '📦'} ${item.name}`,
                  quantity: 1
                }
              }
              return null
            }).filter(Boolean)
            
            if (loadedCharges.length > 0) {
              setQuickCharges(loadedCharges)
              console.log('[QuickChargeButtons] Loaded from API')
              return
            }
          }
        }
      } catch (e) {
        console.log('[QuickChargeButtons] API error, falling back to localStorage')
      }
      
      // Fallback to localStorage
      if (typeof window === 'undefined') return
      
      const savedQuickCharges = localStorage.getItem('hotelQuickCharges')
      if (savedQuickCharges) {
        try {
          const quickChargeIds = JSON.parse(savedQuickCharges)
          const loadedCharges = quickChargeIds.map((itemId: string) => {
            const item = items.find(i => i.id === itemId)
            if (item) {
              const category = categories.find(c => c.id === item.categoryId)
              return {
                itemId: item.id,
                label: `${category?.icon || '📦'} ${item.name}`,
                quantity: 1
              }
            }
            return null
          }).filter(Boolean)
          
          if (loadedCharges.length > 0) {
            setQuickCharges(loadedCharges)
            return
          }
        } catch (e) {
          console.error('Error loading quick charges:', e)
        }
      }
      
      // Fallback to defaults
      setQuickCharges([
        { itemId: 'MB-WATER', label: '💧 Water', quantity: 1 },
        { itemId: 'MB-COLA', label: '🥤 Cola', quantity: 1 },
        { itemId: 'MB-BEER', label: '🍺 Beer', quantity: 1 },
        { itemId: 'FB-BREAKFAST', label: '☕ Breakfast', quantity: 1 },
        { itemId: 'LDRY-SHIRT', label: '👔 Laundry', quantity: 1 },
        { itemId: 'TRANS-TAXI', label: '🚕 Taxi', quantity: 10 }
      ])
    }
    
    loadQuickCharges()
  }, [])
  
  const handleQuickCharge = async (charge: typeof quickCharges[0]) => {
    const item = ExtraChargesService.getItem(charge.itemId)
    if (!item) {
      alert('Item not found')
      return
    }
    
    const result = await ExtraChargesService.postExtraCharge({
      reservationId,
      itemId: charge.itemId,
      quantity: charge.quantity,
      notes: 'Quick charge'
    })
    
    if (result.success) {
      alert(`✅ ${charge.label} posted: ₾${result.totalAmount.toFixed(2)}`)
      
      // Log activity
      ActivityLogger.log('QUICK_CHARGE_POSTED', {
        reservationId,
        item: item.name,
        quantity: charge.quantity,
        amount: result.totalAmount
      })
      
      if (onCharged) {
        onCharged()
      }
    } else {
      alert(`❌ Error: ${result.error}`)
    }
  }
  
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="font-bold mb-3">⚡ Quick Charges</h3>
      <div className="grid grid-cols-3 gap-2">
        {quickCharges.map(charge => (
          <button
            key={charge.itemId}
            onClick={() => handleQuickCharge(charge)}
            className="p-3 bg-gray-100 hover:bg-gray-200 rounded text-center transition"
          >
            <div className="text-lg mb-1">{charge.label.split(' ')[0]}</div>
            <div className="text-xs text-gray-600">{charge.label.split(' ')[1]}</div>
          </button>
        ))}
      </div>
    </div>
  )
}