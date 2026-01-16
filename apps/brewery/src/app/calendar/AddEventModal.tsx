'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui'

interface Tank {
  id: string
  name: string
  type: 'fermenter' | 'brite' | 'kettle'
  capacity: number
  status: 'available' | 'in_use' | 'cleaning' | 'maintenance'
}

interface Recipe {
  id: string
  name: string
  style: string
}

interface AddEventModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (eventData: any) => void
  tanks: Tank[]
  defaultDate?: Date
  defaultTankId?: string
  activeTab?: 'production' | 'orders'
}

export function AddEventModal({ 
  isOpen, 
  onClose, 
  onAdd, 
  tanks, 
  defaultDate, 
  defaultTankId,
  activeTab = 'production'
}: AddEventModalProps) {
  const [eventType, setEventType] = useState<string>(activeTab === 'orders' ? 'order' : 'fermentation')
  const [tankId, setTankId] = useState<string>(defaultTankId || '')
  const [recipeId, setRecipeId] = useState<string>('')
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [startDate, setStartDate] = useState<string>(
    defaultDate ? defaultDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  )
  const [endDate, setEndDate] = useState<string>(
    defaultDate ? new Date(defaultDate.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] 
               : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  )
  const [notes, setNotes] = useState<string>('')
  const [customerName, setCustomerName] = useState<string>('')
  const [quantity, setQuantity] = useState<string>('')
  const [orderType, setOrderType] = useState<'keg' | 'bottle'>('keg')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setEventType(activeTab === 'orders' ? 'order' : 'fermentation')
      setTankId(defaultTankId || '')
      setStartDate(defaultDate ? defaultDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0])
      setEndDate(defaultDate 
        ? new Date(defaultDate.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      )
      setNotes('')
      setCustomerName('')
      setQuantity('')
      setRecipeId('')
    }
  }, [isOpen, defaultDate, defaultTankId, activeTab])

  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        const response = await fetch('/api/recipes')
        if (response.ok) {
          const data = await response.json()
          setRecipes(data.recipes || data || [])
        }
      } catch (error) {
        console.error('Error fetching recipes:', error)
      }
    }
    if (isOpen && activeTab === 'production') {
      fetchRecipes()
    }
  }, [isOpen, activeTab])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      if (activeTab === 'production' && eventType === 'fermentation') {
        // Create batch via API
        const selectedRecipe = recipes.find(r => r.id === recipeId)
        const response = await fetch('/api/batches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipeId: recipeId || undefined,
            recipeName: selectedRecipe?.name || 'ახალი პარტია',
            tankId: tankId,
            brewDate: startDate,
            targetEndDate: endDate,
            volume: tanks.find(t => t.id === tankId)?.capacity || 2000,
            notes: notes,
          }),
        })
        
        if (response.ok) {
          const batch = await response.json()
          onAdd({
            type: eventType,
            batchId: batch.id,
            batchNumber: batch.batchNumber,
            recipe: selectedRecipe?.name,
            tankId: tankId,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            notes: notes,
          })
        } else {
          const error = await response.json()
          alert(`შეცდომა: ${error.error || 'პარტიის შექმნა ვერ მოხერხდა'}`)
          return
        }
      } else {
        onAdd({
          type: eventType,
          tankId: tankId || undefined,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          notes: notes,
          customerName: customerName || undefined,
          quantity: quantity ? `${quantity} ${orderType === 'keg' ? 'კეგი' : 'ბოთლი'}` : undefined,
          title: eventType === 'order' ? `შეკვეთა - ${customerName}` :
                 eventType === 'delivery' ? `მიწოდება - ${customerName}` :
                 eventType === 'cip' ? `CIP - ${tanks.find(t => t.id === tankId)?.name}` :
                 eventType === 'maintenance' ? 'მომსახურება' : 'ახალი ივენთი',
        })
      }
      
      onClose()
    } catch (error) {
      console.error('Error creating event:', error)
      alert('შეცდომა ივენთის შექმნისას')
    } finally {
      setIsSubmitting(false)
    }
  }

  const productionEventTypes = [
    { value: 'fermentation', label: 'ფერმენტაცია', icon: '🍺', description: 'ახალი პარტია' },
    { value: 'cip', label: 'CIP', icon: '🧹', description: 'რეცხვა' },
    { value: 'maintenance', label: 'მომსახურება', icon: '🔧', description: 'ტექნიკური' },
  ]

  const orderEventTypes = [
    { value: 'order', label: 'შეკვეთა', icon: '📦', description: 'ახალი' },
    { value: 'delivery', label: 'მიწოდება', icon: '🚚', description: 'გაგზავნა' },
    { value: 'packaging', label: 'ჩამოსხმა', icon: '🎁', description: 'შეფუთვა' },
  ]

  const eventTypes = activeTab === 'orders' ? orderEventTypes : productionEventTypes

  const availableTanks = tanks.filter(t => {
    if (eventType === 'fermentation') return t.type === 'fermenter' && t.status === 'available'
    if (eventType === 'conditioning') return t.type === 'brite' && t.status === 'available'
    if (eventType === 'cip' || eventType === 'maintenance') return true
    return false
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-bg-primary border border-border rounded-xl w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            ➕ {activeTab === 'orders' ? 'ახალი შეკვეთა' : 'ახალი ივენთი'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Event Type */}
          <div>
            <label className="block text-sm font-medium mb-2">ტიპი</label>
            <div className="grid grid-cols-3 gap-2">
              {eventTypes.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setEventType(option.value)}
                  className={`p-3 rounded-lg border transition-all text-center ${
                    eventType === option.value
                      ? 'border-copper bg-copper/10 text-copper-light'
                      : 'border-border bg-bg-card text-text-secondary hover:bg-bg-tertiary'
                  }`}
                >
                  <div className="text-2xl mb-1">{option.icon}</div>
                  <div className="text-xs font-medium">{option.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Production fields */}
          {activeTab === 'production' && (
            <>
              {['fermentation', 'conditioning', 'cip', 'maintenance'].includes(eventType) && (
                <div>
                  <label className="block text-sm font-medium mb-2">ავზი *</label>
                  <select
                    value={tankId}
                    onChange={(e) => setTankId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-bg-card border border-border rounded-lg text-sm"
                    required
                  >
                    <option value="">აირჩიეთ ავზი</option>
                    {availableTanks.map(tank => (
                      <option key={tank.id} value={tank.id}>
                        {tank.name} ({tank.capacity}L) {tank.status === 'available' ? '✅' : ''}
                      </option>
                    ))}
                  </select>
                  {availableTanks.length === 0 && eventType === 'fermentation' && (
                    <p className="text-xs text-amber-400 mt-1">⚠️ თავისუფალი ფერმენტატორები არ არის</p>
                  )}
                </div>
              )}

              {eventType === 'fermentation' && (
                <div>
                  <label className="block text-sm font-medium mb-2">რეცეპტი</label>
                  <select
                    value={recipeId}
                    onChange={(e) => setRecipeId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-bg-card border border-border rounded-lg text-sm"
                  >
                    <option value="">აირჩიეთ რეცეპტი</option>
                    {recipes.map(recipe => (
                      <option key={recipe.id} value={recipe.id}>
                        {recipe.name} ({recipe.style})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          {/* Order fields */}
          {activeTab === 'orders' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">კლიენტი *</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-bg-card border border-border rounded-lg text-sm"
                  placeholder="კლიენტის სახელი"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-2">რაოდენობა</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-4 py-2.5 bg-bg-card border border-border rounded-lg text-sm"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">ტიპი</label>
                  <select
                    value={orderType}
                    onChange={(e) => setOrderType(e.target.value as 'keg' | 'bottle')}
                    className="w-full px-4 py-2.5 bg-bg-card border border-border rounded-lg text-sm"
                  >
                    <option value="keg">🛢️ კეგი</option>
                    <option value="bottle">🍾 ბოთლი</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-2">{activeTab === 'orders' ? 'თარიღი' : 'დაწყება'} *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-bg-card border border-border rounded-lg text-sm"
                required
              />
            </div>
            {activeTab === 'production' && !['cip'].includes(eventType) && (
              <div>
                <label className="block text-sm font-medium mb-2">დასრულება</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-bg-card border border-border rounded-lg text-sm"
                />
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-2">შენიშვნა</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 bg-bg-card border border-border rounded-lg text-sm resize-none"
              placeholder="დამატებითი ინფორმაცია..."
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button type="button" variant="secondary" onClick={onClose}>გაუქმება</Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? '...' : activeTab === 'production' && eventType === 'fermentation' ? '🍺 პარტიის შექმნა' : 'დამატება'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
