'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui'

interface Bottle {
  id: string
  type: string
  color?: string
  quantity: number
  minStock: number
  supplier?: string
  location?: string
}

const bottleTypes: Record<string, { name: string; icon: string; volume: number }> = {
  bottle_500: { name: 'ბოთლი 500ml', icon: '🍾', volume: 0.5 },
  bottle_330: { name: 'ბოთლი 330ml', icon: '🍾', volume: 0.33 },
  can_500: { name: 'ქილა 500ml', icon: '🥫', volume: 0.5 },
  can_330: { name: 'ქილა 330ml', icon: '🥫', volume: 0.33 },
}

const bottleColors: Record<string, { name: string; color: string }> = {
  brown: { name: 'ყავისფერი', color: 'bg-amber-800' },
  green: { name: 'მწვანე', color: 'bg-green-800' },
  clear: { name: 'გამჭვირვალე', color: 'bg-slate-400' },
}

export function BottlesSection() {
  const [bottles, setBottles] = useState<Bottle[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterColor, setFilterColor] = useState<string>('all')
  const [showLowStockOnly, setShowLowStockOnly] = useState(false)

  // Fetch bottles from API
  const fetchBottles = async () => {
    try {
      // Fetch PACKAGING category items and filter by metadata type
      const res = await fetch('/api/inventory?category=PACKAGING')
      if (res.ok) {
        const data = await res.json()
        // Filter bottles and cans from metadata
        const allItems = (data.items || []).filter((item: any) => {
          const metadata = item.metadata || {}
          const nameLower = (item.name || '').toLowerCase()
          return metadata.type === 'bottle' || 
                 metadata.type === 'can' ||
                 nameLower.includes('ბოთლი') ||
                 nameLower.includes('bottle') ||
                 nameLower.includes('ქილა') ||
                 nameLower.includes('can')
        })
        
        // Transform InventoryItem to Bottle format
        const transformedBottles = allItems.map((item: any) => {
          const metadata = item.metadata || {}
          return {
            id: item.id,
            type: metadata.bottleType || metadata.type || 'bottle_500',
            color: metadata.color,
            quantity: item.quantity || item.balance || item.cachedBalance || 0,
            minStock: item.minStock || item.reorderPoint || 500,
            supplier: metadata.supplier || item.supplier,
            location: metadata.location,
          }
        })
        setBottles(transformedBottles)
      }
    } catch (error) {
      console.error('Failed to fetch bottles:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBottles()
  }, [])

  // Add bottle
  const handleAddBottle = async (data: any) => {
    try {
      const typeInfo = bottleTypes[data.type]
      const isCan = data.type.startsWith('can')
      
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: `${data.type.toUpperCase()}-${Date.now()}`,
          name: typeInfo?.name || data.type,
          category: 'PACKAGING',
          unit: 'ცალი',
          quantity: data.quantity,
          reorderPoint: data.minStock,
          supplier: data.supplier || undefined,
          metadata: {
            type: isCan ? 'can' : 'bottle',
            bottleType: data.type,
            color: data.color,
            supplier: data.supplier,
            location: data.location,
            volume: typeInfo?.volume,
          }
        })
      })
      if (res.ok) {
        fetchBottles()
        setShowAddModal(false)
      } else {
        const errorData = await res.json()
        alert(errorData.error || 'ტარის დამატება ვერ მოხერხდა')
      }
    } catch (error) {
      console.error('Failed to add bottle:', error)
      alert('ტარის დამატება ვერ მოხერხდა')
    }
  }

  // Update bottle quantity
  const handleUpdateQuantity = async (id: string, quantity: number) => {
    try {
      const res = await fetch(`/api/inventory/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          quantity,
          type: 'ADJUSTMENT', // Direct adjustment
        })
      })
      if (res.ok) {
        // Refresh bottles to get updated data
        fetchBottles()
      } else {
        const errorData = await res.json()
        alert(errorData.error || 'რაოდენობის განახლება ვერ მოხერხდა')
      }
    } catch (error) {
      console.error('Failed to update bottle:', error)
      alert('რაოდენობის განახლება ვერ მოხერხდა')
    }
  }

  // Delete bottle
  const handleDeleteBottle = async (id: string) => {
    if (!confirm('ნამდვილად გსურთ ტარის წაშლა?')) return
    
    try {
      const res = await fetch(`/api/inventory/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setBottles(bottles.filter(b => b.id !== id))
      } else {
        const errorData = await res.json()
        alert(errorData.error || 'წაშლა ვერ მოხერხდა')
      }
    } catch (error) {
      console.error('Failed to delete bottle:', error)
      alert('წაშლა ვერ მოხერხდა')
    }
  }

  const filteredBottles = bottles.filter(bottle => {
    if (filterType !== 'all' && bottle.type !== filterType) return false
    if (filterColor !== 'all' && bottle.color !== filterColor) return false
    if (showLowStockOnly && bottle.quantity >= bottle.minStock) return false
    return true
  })

  if (loading) {
    return <div className="text-center py-12">იტვირთება...</div>
  }

  return (
    <div className="space-y-6">
      {/* Filters & Actions */}
      <div className="flex justify-between items-center">
        <div className="flex gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 bg-bg-tertiary border border-border rounded-lg"
          >
            <option value="all">ყველა ტიპი</option>
            {Object.entries(bottleTypes).map(([key, info]) => (
              <option key={key} value={key}>{info.icon} {info.name}</option>
            ))}
          </select>

          <select
            value={filterColor}
            onChange={(e) => setFilterColor(e.target.value)}
            className="px-4 py-2 bg-bg-tertiary border border-border rounded-lg"
          >
            <option value="all">ყველა ფერი</option>
            {Object.entries(bottleColors).map(([key, info]) => (
              <option key={key} value={key}>{info.name}</option>
            ))}
          </select>

          <label className="flex items-center gap-2 px-4 py-2 bg-bg-tertiary border border-border rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={showLowStockOnly}
              onChange={(e) => setShowLowStockOnly(e.target.checked)}
              className="rounded border-border"
            />
            მხოლოდ დაბალი
          </label>
        </div>

        <Button variant="primary" onClick={() => setShowAddModal(true)}>
          + ტარის დამატება
        </Button>
      </div>

      {/* Bottles Table */}
      <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-bg-tertiary">
            <tr>
              <th className="text-left p-4">ტიპი</th>
              <th className="text-left p-4">ფერი</th>
              <th className="text-left p-4">რაოდენობა</th>
              <th className="text-left p-4">სტატუსი</th>
              <th className="text-left p-4">მომწოდებელი</th>
              <th className="text-left p-4">ლოკაცია</th>
              <th className="text-right p-4">მოქმედება</th>
            </tr>
          </thead>
          <tbody>
            {filteredBottles.map(bottle => {
              const typeInfo = bottleTypes[bottle.type] || { name: bottle.type, icon: '📦' }
              const colorInfo = bottle.color ? bottleColors[bottle.color] : null
              const isLowStock = bottle.quantity < bottle.minStock

              return (
                <tr key={bottle.id} className="border-t border-border hover:bg-bg-tertiary/50">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{typeInfo.icon}</span>
                      <span>{typeInfo.name}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    {colorInfo && (
                      <span className={`px-2 py-1 rounded text-white text-sm ${colorInfo.color}`}>
                        {colorInfo.name}
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <div>
                      <span className="font-bold">{bottle.quantity.toLocaleString()}</span>
                      <span className="text-slate-400 text-sm ml-2">მინ: {bottle.minStock}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-white text-sm ${isLowStock ? 'bg-red-500' : 'bg-green-500'}`}>
                      {isLowStock ? 'დაბალი' : 'ნორმალური'}
                    </span>
                  </td>
                  <td className="p-4 text-sm">{bottle.supplier || '-'}</td>
                  <td className="p-4 text-sm">{bottle.location || '-'}</td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <input
                        type="number"
                        value={bottle.quantity}
                        onChange={(e) => handleUpdateQuantity(bottle.id, Number(e.target.value))}
                        className="w-24 px-2 py-1 bg-slate-700 rounded text-right"
                      />
                      <button
                        onClick={() => handleDeleteBottle(bottle.id)}
                        className="px-2 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/40 rounded transition-colors"
                        title="წაშლა"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filteredBottles.length === 0 && (
          <div className="text-center py-12 text-text-muted">
            <p className="text-4xl mb-4">🍾</p>
            <p>{bottles.length === 0 ? 'ბოთლები/ქილები არ არის დამატებული' : 'ფილტრის შედეგები არ მოიძებნა'}</p>
            {bottles.length === 0 && (
              <Button variant="primary" onClick={() => setShowAddModal(true)} className="mt-4">
                + პირველი ტარის დამატება
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <AddBottleModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddBottle}
        />
      )}
    </div>
  )
}

function AddBottleModal({ onClose, onAdd }: { onClose: () => void; onAdd: (data: any) => void }) {
  const [type, setType] = useState<string>('bottle_500')
  const [color, setColor] = useState<'brown' | 'green' | 'clear'>('brown')
  const [quantity, setQuantity] = useState(1000)
  const [minStock, setMinStock] = useState(500)
  const [supplier, setSupplier] = useState('')
  const [location, setLocation] = useState('')

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">🍾 ტარის დამატება</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">ტიპი</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 rounded-lg"
            >
              {Object.entries(bottleTypes).map(([key, info]) => (
                <option key={key} value={key}>{info.icon} {info.name}</option>
              ))}
            </select>
          </div>

          {type.startsWith('bottle') && (
            <div>
              <label className="block text-sm text-slate-400 mb-2">ფერი</label>
              <div className="flex gap-2">
                {Object.entries(bottleColors).map(([key, info]) => (
                  <button
                    key={key}
                    onClick={() => setColor(key as typeof color)}
                    className={`flex-1 py-2 rounded-lg text-white ${color === key ? 'ring-2 ring-copper' : ''} ${info.color}`}
                  >
                    {info.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">რაოდენობა</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-4 py-2 bg-slate-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">მინ. მარაგი</label>
              <input
                type="number"
                value={minStock}
                onChange={(e) => setMinStock(Number(e.target.value))}
                className="w-full px-4 py-2 bg-slate-700 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">მომწოდებელი</label>
            <input
              type="text"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">ლოკაცია</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 rounded-lg"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={onClose}>გაუქმება</Button>
          <Button variant="primary" onClick={() => onAdd({
            type,
            color: type.startsWith('bottle') ? color : undefined,
            quantity,
            minStock,
            supplier,
            location,
          })}>
            დამატება
          </Button>
        </div>
      </div>
    </div>
  )
}
