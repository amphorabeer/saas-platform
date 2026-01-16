'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui'

interface Cap {
  id: string
  name: string
  size: string
  color?: string
  quantity: number
  minStock: number
  supplier?: string
}

const capSizes = {
  '26mm': { name: '26mm', description: 'სტანდარტული (ბოთლი 330-500ml)' },
  '29mm': { name: '29mm', description: 'დიდი (ბოთლი 750ml+)' },
}

const capColors: Record<string, { name: string; color: string }> = {
  gold: { name: 'ოქროსფერი', color: 'bg-yellow-600' },
  silver: { name: 'ვერცხლისფერი', color: 'bg-gray-400' },
  black: { name: 'შავი', color: 'bg-gray-800' },
  red: { name: 'წითელი', color: 'bg-red-600' },
  green: { name: 'მწვანე', color: 'bg-green-600' },
  white: { name: 'თეთრი', color: 'bg-white border border-gray-300' },
}

export function CapsSection() {
  const [caps, setCaps] = useState<Cap[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [filterSize, setFilterSize] = useState<string>('all')
  const [showLowStockOnly, setShowLowStockOnly] = useState(false)

  const fetchCaps = async () => {
    try {
      // Use PACKAGING category and filter by metadata.type='cap'
      const res = await fetch('/api/inventory?category=PACKAGING')
      if (res.ok) {
        const data = await res.json()
        const items = data.items || []
        // Filter only caps
        const capItems = items.filter((item: any) => 
          item.metadata?.type === 'cap' || 
          (item.name || '').toLowerCase().includes('თავსახური')
        )
        const transformed = capItems.map((item: any) => ({
          id: item.id,
          name: item.name,
          size: item.metadata?.size || '26mm',
          color: item.metadata?.color,
          quantity: item.quantity || 0,
          minStock: item.minStock || 1000,
          supplier: item.metadata?.supplier || item.supplier,
        }))
        setCaps(transformed)
      }
    } catch (error) {
      console.error('Failed to fetch caps:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCaps()
  }, [])

  const handleAddCap = async (data: any) => {
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name || `თავსახური ${data.size}`,
          sku: `CAP-${data.size}-${Date.now()}`,
          category: 'PACKAGING',
          unit: 'ცალი',
          quantity: data.quantity,
          reorderPoint: data.minStock,
          metadata: {
            type: 'cap',
            size: data.size,
            color: data.color,
            supplier: data.supplier,
          }
        })
      })
      if (res.ok) {
        fetchCaps()
        setShowAddModal(false)
      } else {
        const err = await res.json()
        console.error('Failed to add cap:', err)
        alert('დამატება ვერ მოხერხდა: ' + (err.error || err.message || 'Unknown error'))
      }
    } catch (error) {
      console.error('Failed to add cap:', error)
      alert('დამატება ვერ მოხერხდა')
    }
  }

  const handleUpdateQuantity = async (id: string, quantity: number) => {
    try {
      const res = await fetch(`/api/inventory/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          quantity,
          type: 'ADJUSTMENT',
        })
      })
      if (res.ok) {
        // Refresh caps to get updated data
        fetchCaps()
      } else {
        const errorData = await res.json()
        alert(errorData.error || 'რაოდენობის განახლება ვერ მოხერხდა')
      }
    } catch (error) {
      console.error('Failed to update cap:', error)
      alert('რაოდენობის განახლება ვერ მოხერხდა')
    }
  }

  const handleDeleteCap = async (id: string) => {
    if (!confirm('ნამდვილად გსურთ თავსახურის წაშლა?')) return
    try {
      const res = await fetch(`/api/inventory/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setCaps(caps.filter(c => c.id !== id))
      } else {
        const errorData = await res.json()
        alert(errorData.error || 'წაშლა ვერ მოხერხდა')
      }
    } catch (error) {
      console.error('Failed to delete cap:', error)
      alert('წაშლა ვერ მოხერხდა')
    }
  }

  const filteredCaps = caps.filter(cap => {
    if (filterSize !== 'all' && cap.size !== filterSize) return false
    if (showLowStockOnly && cap.quantity >= cap.minStock) return false
    return true
  })

  const totalCaps = caps.reduce((sum, c) => sum + c.quantity, 0)
  const caps26mm = caps.filter(c => c.size === '26mm').reduce((sum, c) => sum + c.quantity, 0)
  const caps29mm = caps.filter(c => c.size === '29mm').reduce((sum, c) => sum + c.quantity, 0)
  const lowStockCount = caps.filter(c => c.quantity < c.minStock).length

  if (loading) {
    return <div className="text-center py-12">იტვირთება...</div>
  }

  return (
    <div className="space-y-6">
      {/* Filters & Actions */}
      <div className="flex justify-between items-center">
        <div className="flex gap-3">
          <select
            value={filterSize}
            onChange={(e) => setFilterSize(e.target.value)}
            className="px-4 py-2 bg-bg-tertiary border border-border rounded-lg"
          >
            <option value="all">ყველა ზომა</option>
            {Object.entries(capSizes).map(([key, info]) => (
              <option key={key} value={key}>{info.name} - {info.description}</option>
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
          + თავსახურის დამატება
        </Button>
      </div>

      {/* Caps Table */}
      <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-bg-tertiary">
            <tr>
              <th className="text-left p-4">სახელი</th>
              <th className="text-left p-4">ზომა</th>
              <th className="text-left p-4">ფერი</th>
              <th className="text-left p-4">რაოდენობა</th>
              <th className="text-left p-4">სტატუსი</th>
              <th className="text-left p-4">მომწოდებელი</th>
              <th className="text-right p-4">მოქმედება</th>
            </tr>
          </thead>
          <tbody>
            {filteredCaps.map(cap => {
              const colorInfo = cap.color ? capColors[cap.color] : null
              const isLowStock = cap.quantity < cap.minStock

              return (
                <tr key={cap.id} className="border-t border-border hover:bg-bg-tertiary/50">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🧢</span>
                      <span>{cap.name}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-slate-700 rounded text-sm">{cap.size}</span>
                  </td>
                  <td className="p-4">
                    {colorInfo ? (
                      <span className={`px-2 py-1 rounded text-sm ${colorInfo.color} ${cap.color === 'white' ? 'text-black' : 'text-white'}`}>
                        {colorInfo.name}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className="font-bold">{cap.quantity.toLocaleString()}</span>
                    <span className="text-slate-400 text-sm ml-2">მინ: {cap.minStock.toLocaleString()}</span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-white text-sm ${isLowStock ? 'bg-red-500' : 'bg-green-500'}`}>
                      {isLowStock ? '⚠️ დაბალი' : '✓ ნორმალური'}
                    </span>
                  </td>
                  <td className="p-4 text-sm">{cap.supplier || '-'}</td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <input
                        type="number"
                        value={cap.quantity}
                        onChange={(e) => handleUpdateQuantity(cap.id, Number(e.target.value))}
                        className="w-24 px-2 py-1 bg-slate-700 rounded text-right"
                      />
                      <button
                        onClick={() => handleDeleteCap(cap.id)}
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

        {filteredCaps.length === 0 && (
          <div className="text-center py-12 text-text-muted">
            <p className="text-4xl mb-4">🧢</p>
            <p>{caps.length === 0 ? 'თავსახურები არ არის დამატებული' : 'ფილტრის შედეგები არ მოიძებნა'}</p>
            {caps.length === 0 && (
              <Button variant="primary" onClick={() => setShowAddModal(true)} className="mt-4">
                + პირველი თავსახურის დამატება
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <AddCapModal onClose={() => setShowAddModal(false)} onAdd={handleAddCap} />
      )}
    </div>
  )
}

function AddCapModal({ onClose, onAdd }: { onClose: () => void; onAdd: (data: any) => void }) {
  const [name, setName] = useState('')
  const [size, setSize] = useState<string>('26mm')
  const [color, setColor] = useState<string>('gold')
  const [quantity, setQuantity] = useState(5000)
  const [minStock, setMinStock] = useState(1000)
  const [supplier, setSupplier] = useState('')

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">🧢 თავსახურის დამატება</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">სახელი (არჩევითი)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="მაგ: თავსახური ოქროსფერი 26mm"
              className="w-full px-4 py-2 bg-slate-700 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">ზომა</label>
            <div className="flex gap-2">
              {Object.entries(capSizes).map(([key, info]) => (
                <button
                  key={key}
                  onClick={() => setSize(key)}
                  className={`flex-1 py-3 rounded-lg ${size === key ? 'bg-copper ring-2 ring-copper' : 'bg-slate-700'}`}
                >
                  <div className="text-lg font-bold">{info.name}</div>
                  <div className="text-xs text-slate-300">{info.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">ფერი</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(capColors).map(([key, info]) => (
                <button
                  key={key}
                  onClick={() => setColor(key)}
                  className={`py-2 rounded-lg ${info.color} ${key === 'white' ? 'text-black' : 'text-white'} ${color === key ? 'ring-2 ring-copper' : ''}`}
                >
                  {info.name}
                </button>
              ))}
            </div>
          </div>

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
              placeholder="მაგ: BottleCap Georgia"
              className="w-full px-4 py-2 bg-slate-700 rounded-lg"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={onClose}>გაუქმება</Button>
          <Button variant="primary" onClick={() => onAdd({
            name: name || `თავსახური ${capColors[color]?.name || ''} ${size}`,
            size,
            color,
            quantity,
            minStock,
            supplier,
          })}>
            დამატება
          </Button>
        </div>
      </div>
    </div>
  )
}
