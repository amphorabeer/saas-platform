'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui'

interface Label {
  id: string
  name: string
  recipeId?: string
  recipeName?: string
  size: string
  quantity: number
  minStock: number
}

interface Recipe {
  id: string
  name: string
}

export function LabelsSection() {
  const [labels, setLabels] = useState<Label[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [filterSize, setFilterSize] = useState<string>('all')
  const [filterRecipe, setFilterRecipe] = useState<string>('all')
  const [showLowStockOnly, setShowLowStockOnly] = useState(false)

  const sizeLabels: Record<string, string> = {
    large: '500ml',
    medium: '330ml',
    small: 'ნეკ',
  }

  // Fetch labels from API
  const fetchLabels = async () => {
    try {
      const res = await fetch('/api/inventory?category=PACKAGING')
      if (res.ok) {
        const data = await res.json()
        // Transform InventoryItem to Label format - filter only labels from metadata
        const transformedLabels = (data.items || [])
          .filter((item: any) => {
            const metadata = item.metadata || {}
            const nameLower = (item.name || '').toLowerCase()
            return metadata.type === 'label' || 
                   nameLower.includes('ეტიკეტ') || 
                   nameLower.includes('label') ||
                   nameLower.includes('ლეიბელი')
          })
          .map((item: any) => {
            const metadata = item.metadata || {}
            return {
              id: item.id,
              name: item.name,
              recipeId: metadata.recipeId,
              recipeName: metadata.recipeName,
              size: metadata.size || 'large',
              quantity: item.quantity || item.balance || item.cachedBalance || 0,
              minStock: item.minStock || item.reorderPoint || 500,
            }
          })
        setLabels(transformedLabels)
      }
    } catch (error) {
      console.error('Failed to fetch labels:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch recipes
  const fetchRecipes = async () => {
    try {
      const res = await fetch('/api/recipes')
      if (res.ok) {
        const data = await res.json()
        setRecipes(data.recipes || [])
      }
    } catch (error) {
      console.error('Failed to fetch recipes:', error)
    }
  }

  useEffect(() => {
    fetchLabels()
    fetchRecipes()
  }, [])

  // Add label
  const handleAddLabel = async (data: any) => {
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: `LABEL-${Date.now()}`,
          name: data.name,
          category: 'PACKAGING',
          unit: 'ცალი',
          quantity: data.quantity,
          reorderPoint: data.minStock,
          metadata: {
            type: 'label',
            recipeId: data.recipeId,
            recipeName: data.recipeName,
            size: data.size,
          }
        })
      })
      if (res.ok) {
        fetchLabels()
        setShowAddModal(false)
      } else {
        const errorData = await res.json()
        alert(errorData.error || 'ეტიკეტის დამატება ვერ მოხერხდა')
      }
    } catch (error) {
      console.error('Failed to add label:', error)
      alert('ეტიკეტის დამატება ვერ მოხერხდა')
    }
  }

  // Update label quantity
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
        // Refresh labels to get updated data
        fetchLabels()
      } else {
        const errorData = await res.json()
        alert(errorData.error || 'რაოდენობის განახლება ვერ მოხერხდა')
      }
    } catch (error) {
      console.error('Failed to update label:', error)
      alert('რაოდენობის განახლება ვერ მოხერხდა')
    }
  }

  // Delete label
  const handleDeleteLabel = async (id: string) => {
    if (!confirm('ნამდვილად გსურთ ეტიკეტის წაშლა?')) return
    
    try {
      const res = await fetch(`/api/inventory/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setLabels(labels.filter(l => l.id !== id))
      } else {
        const errorData = await res.json()
        alert(errorData.error || 'წაშლა ვერ მოხერხდა')
      }
    } catch (error) {
      console.error('Failed to delete label:', error)
      alert('წაშლა ვერ მოხერხდა')
    }
  }

  const filteredLabels = labels.filter(label => {
    if (filterSize !== 'all' && label.size !== filterSize) return false
    if (filterRecipe !== 'all' && label.recipeId !== filterRecipe) return false
    if (showLowStockOnly && label.quantity >= label.minStock) return false
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
            value={filterSize}
            onChange={(e) => setFilterSize(e.target.value)}
            className="px-4 py-2 bg-bg-tertiary border border-border rounded-lg"
          >
            <option value="all">ყველა ზომა</option>
            {Object.entries(sizeLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          <select
            value={filterRecipe}
            onChange={(e) => setFilterRecipe(e.target.value)}
            className="px-4 py-2 bg-bg-tertiary border border-border rounded-lg"
          >
            <option value="all">ყველა რეცეპტი</option>
            {recipes.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
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
          + ეტიკეტის დამატება
        </Button>
      </div>

      {/* Labels Grid */}
      <div className="grid grid-cols-3 gap-4">
        {filteredLabels.map(label => {
          const isLowStock = label.quantity < label.minStock

          return (
            <div key={label.id} className="bg-bg-card border border-border rounded-xl p-4">
              <div className="aspect-video bg-gradient-to-br from-amber-900 to-amber-700 rounded-lg mb-4 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl">🏷️</p>
                  <p className="text-sm font-bold mt-2">{label.name}</p>
                  {label.recipeName && (
                    <p className="text-xs opacity-75">{label.recipeName}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">ზომა:</span>
                  <span>{sizeLabels[label.size] || label.size}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">რაოდენობა:</span>
                  <span className={isLowStock ? 'text-red-400 font-bold' : ''}>
                    {label.quantity.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">მინ:</span>
                  <span>{label.minStock.toLocaleString()}</span>
                </div>
              </div>

              <div className="mt-4">
                <span className={`px-3 py-1 rounded-full text-sm ${isLowStock ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                  {isLowStock ? '⚠️ შეკვეთა საჭირო' : '✓ მარაგშია'}
                </span>
              </div>

              <div className="mt-4 flex gap-2">
                <input
                  type="number"
                  value={label.quantity}
                  onChange={(e) => handleUpdateQuantity(label.id, Number(e.target.value))}
                  className="flex-1 px-3 py-1 bg-slate-700 rounded text-center"
                />
                <button
                  onClick={() => handleDeleteLabel(label.id)}
                  className="px-3 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/40 rounded transition-colors"
                  title="წაშლა"
                >
                  🗑️
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {filteredLabels.length === 0 && (
        <div className="text-center py-12 text-text-muted">
          <p className="text-4xl mb-4">🏷️</p>
          <p>{labels.length === 0 ? 'ეტიკეტები არ არის დამატებული' : 'ფილტრის შედეგები არ მოიძებნა'}</p>
          {labels.length === 0 && (
            <Button variant="primary" onClick={() => setShowAddModal(true)} className="mt-4">
              + პირველი ეტიკეტის დამატება
            </Button>
          )}
        </div>
      )}

      {showAddModal && (
        <AddLabelModal
          recipes={recipes}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddLabel}
        />
      )}
    </div>
  )
}

function AddLabelModal({ recipes, onClose, onAdd }: { recipes: Recipe[]; onClose: () => void; onAdd: (data: any) => void }) {
  const [name, setName] = useState('')
  const [recipeId, setRecipeId] = useState('')
  const [size, setSize] = useState<'large' | 'medium' | 'small'>('large')
  const [quantity, setQuantity] = useState(1000)
  const [minStock, setMinStock] = useState(500)

  const selectedRecipe = recipes.find(r => r.id === recipeId)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">🏷️ ეტიკეტის დამატება</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">სახელი</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="მაგ: Georgian Amber Lager 500ml"
              className="w-full px-4 py-2 bg-slate-700 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">რეცეპტი (არჩევითი)</label>
            <select
              value={recipeId}
              onChange={(e) => setRecipeId(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 rounded-lg"
            >
              <option value="">-- არ არის მიბმული --</option>
              {recipes.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">ზომა</label>
            <div className="flex gap-2">
              {[
                { value: 'large', label: '500ml' },
                { value: 'medium', label: '330ml' },
                { value: 'small', label: 'ნეკ ლეიბელი' },
              ].map(s => (
                <button
                  key={s.value}
                  onClick={() => setSize(s.value as typeof size)}
                  className={`flex-1 py-2 rounded-lg ${size === s.value ? 'bg-copper' : 'bg-slate-700'}`}
                >
                  {s.label}
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
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={onClose}>გაუქმება</Button>
          <Button variant="primary" onClick={() => onAdd({
            name: name || selectedRecipe?.name || 'უსახელო',
            recipeId: recipeId || undefined,
            recipeName: selectedRecipe?.name,
            size,
            quantity,
            minStock,
          })}>
            დამატება
          </Button>
        </div>
      </div>
    </div>
  )
}
