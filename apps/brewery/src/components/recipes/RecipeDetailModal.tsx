'use client'



import { useState, useEffect, useMemo } from 'react'

import { useRouter } from 'next/navigation'

import { Button, ProgressBar } from '@/components/ui'

import type { Recipe, Ingredient, BrewingStep } from '@/app/recipes/page'

import { formatDate } from '@/lib/utils'
import { formatGravity } from '@/utils'



interface RecipeDetailModalProps {

  recipe: Recipe

  onClose: () => void

  onStartBatch: () => void

  onEdit?: (recipe: Recipe) => void

  onDuplicate?: (recipe: Recipe) => void

  onExport?: (recipe: Recipe) => void

}



const INGREDIENT_ICONS = {

  grain: '🌾',

  hop: '🌿',

  yeast: '🧪',

  adjunct: '🧪',

  water: '💧',

}



// Utility function to convert any unit to kg
const convertToKg = (amount: number, unit: string): number => {
  if (!amount || !unit) return amount || 0
  const lowerUnit = unit.toLowerCase().trim()
  switch (lowerUnit) {
    case 'g':
    case 'gram':
    case 'grams':
      return amount / 1000
    case 'mg':
      return amount / 1000000
    case 'lb':
    case 'lbs':
      return amount * 0.453592
    case 'oz':
      return amount * 0.0283495
    case 'l':
    case 'liter':
    case 'liters':
    case 'ლ':
      return amount // Assume liters = kg for liquid ingredients
    case 'ml':
      return amount / 1000
    default:
      return amount // kg
  }
}

// Utility function to format amount with appropriate unit for display
const formatAmountWithUnit = (amountKg: number, preferredUnit?: string): string => {
  if (preferredUnit) {
    const lowerUnit = preferredUnit.toLowerCase().trim()
    if (lowerUnit === 'g' || lowerUnit === 'gram' || lowerUnit === 'grams') {
      return `${(amountKg * 1000).toFixed(1)} g`
    }
    if (lowerUnit === 'ml') {
      return `${(amountKg * 1000).toFixed(1)} ml`
    }
  }
  if (amountKg < 1) {
    return `${(amountKg * 1000).toFixed(1)} g`
  }
  return `${amountKg.toFixed(1)} kg`
}

// Utility function to get beer color from SRM
const getBeerColor = (srm: number): string => {
  // Clamp SRM to valid range
  const clampedSrm = Math.max(1, Math.min(40, srm || 5))
  
  // SRM to RGB approximation (SRM color chart)
  const colors: [number, string][] = [
    [1, '#FFE699'],   // Very Light
    [2, '#FFD878'],   // Light
    [3, '#FFCA5A'],   // Pale
    [4, '#FFBF42'],   // Gold
    [5, '#FBB123'],   // Deep Gold
    [6, '#F8A600'],   // Amber
    [7, '#F39C00'],   // Medium Amber
    [8, '#EA8F00'],   // Deep Amber
    [9, '#E58500'],   // Copper
    [10, '#DE7C00'],  // Deep Copper
    [12, '#CF6900'],  // Brown
    [14, '#C35900'],  // Very Dark Brown
    [17, '#A34200'],  // Dark Brown
    [20, '#8D4000'],  // Black
    [25, '#5A2800'],  // Deep Black
    [30, '#261716'],  // Opaque Black
    [40, '#0F0B0A'],  // Pitch Black
  ]
  
  // Find closest SRM value
  for (let i = colors.length - 1; i >= 0; i--) {
    if (clampedSrm >= colors[i][0]) {
      return colors[i][1]
    }
  }
  
  return colors[0][1]
}

const INGREDIENT_COLORS = {

  grain: 'bg-amber-400/20 text-amber-400',

  hop: 'bg-green-400/20 text-green-400',

  yeast: 'bg-purple-400/20 text-purple-400',

  adjunct: 'bg-blue-400/20 text-blue-400',

  water: 'bg-cyan-400/20 text-cyan-400',

}



export function RecipeDetailModal({ recipe, onClose, onStartBatch, onEdit, onDuplicate, onExport }: RecipeDetailModalProps) {

  const router = useRouter()

  const [activeTab, setActiveTab] = useState<'overview' | 'ingredients' | 'process' | 'history'>('overview')
  const [showBatchConfirm, setShowBatchConfirm] = useState(false)
  
  // Handle start batch - show confirmation first
  const handleStartBatchClick = () => {
    setShowBatchConfirm(true)
  }
  
  // Confirm and navigate to production page
  const handleConfirmBatch = () => {
    setShowBatchConfirm(false)
    onClose()
    router.push(`/production?newBatch=true&recipeId=${recipe.id}`)
  }
  
  // Fetch inventory items to match with recipe ingredients
  const [inventoryItems, setInventoryItems] = useState<any[]>([])
  const [inventoryLoading, setInventoryLoading] = useState(false)

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        setInventoryLoading(true)
        const response = await fetch('/api/inventory')
        if (response.ok) {
          const data = await response.json()
          setInventoryItems(data.items || data || [])
        }
      } catch (error) {
        console.error('Failed to fetch inventory:', error)
      } finally {
        setInventoryLoading(false)
      }
    }
    
    fetchInventory()
  }, [])

  // Add state for batches
  const [recipeBatches, setRecipeBatches] = useState<any[]>([])
  const [batchesLoading, setBatchesLoading] = useState(false)

  // Fetch batches for this recipe
  useEffect(() => {
    const fetchBatches = async () => {
      try {
        setBatchesLoading(true)
        // Get batches from Zustand (they're not in DB)
        const { useBreweryStore } = await import('@/store')
        const allBatches = useBreweryStore.getState().batches || []
        const filtered = allBatches.filter(b => b.recipeId === recipe.id)
        console.log('[RecipeDetailModal] Found batches for recipe:', filtered.length)
        setRecipeBatches(filtered)
      } catch (error) {
        console.error('Failed to fetch batches:', error)
      } finally {
        setBatchesLoading(false)
      }
    }
    
    fetchBatches()
  }, [recipe.id])

  // Match recipe ingredients to inventory items by name
  const ingredientsWithStock = useMemo(() => {
    return recipe.ingredients.map(ing => {
      // Try to find matching inventory item by name (case-insensitive, partial match)
      const match = inventoryItems.find(item => 
        item.name.toLowerCase().includes(ing.name.toLowerCase()) ||
        ing.name.toLowerCase().includes(item.name.toLowerCase())
      )
      
      return {
        ...ing,
        inventoryItem: match || null,
      }
    })
  }, [recipe.ingredients, inventoryItems])

  // Calculate stock availability
  const stockAvailability = useMemo(() => {
    const missing: string[] = []
    let allAvailable = true
    
    ingredientsWithStock.forEach(ing => {
      if (ing.inventoryItem) {
        // Convert both to kg for comparison
        const availableKg = Number(ing.inventoryItem.cachedBalance || 0) // Inventory is always in kg
        const neededKg = convertToKg(Number(ing.amount), ing.unit || 'kg')
        if (availableKg < neededKg) {
          allAvailable = false
          missing.push(ing.name)
        }
      }
    })
    
    return { allAvailable, missing }
  }, [ingredientsWithStock])

  const grains = ingredientsWithStock.filter(i => i.type === 'grain')

  const hops = ingredientsWithStock.filter(i => i.type === 'hop')

  const yeast = ingredientsWithStock.filter(i => i.type === 'yeast')

  const adjuncts = ingredientsWithStock.filter(i => i.type === 'adjunct')



  const formatDuration = (minutes: number) => {

    if (minutes < 60) return `${minutes} წთ`

    if (minutes < 1440) return `${Math.round(minutes / 60)} სთ`

    return `${Math.round(minutes / 1440)} დღე`

  }



  const totalBrewTime = recipe.steps.reduce((sum, step) => sum + step.duration, 0)



  return (

    <div className="fixed inset-0 z-50 flex items-center justify-center">

      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      

      <div className="relative bg-bg-secondary border border-border rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">

        {/* Header with color bar */}
        <div className="relative">
          {/* Color bar at top */}
          <div 
            className="h-2 w-full"
            style={{ backgroundColor: getBeerColor(recipe.srm || 5) }}
          />
          
          <div className="px-6 py-4 border-b border-border flex justify-between items-start bg-bg-tertiary">
            {/* Left side - Color & Title */}
            <div className="flex items-center gap-4">
              {/* Beer color circle */}
              <div 
                className="w-14 h-14 rounded-xl shadow-lg border-2 border-border flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: getBeerColor(recipe.srm || 5) }}
              />
              
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-display font-semibold">{recipe.name}</h2>
                  {recipe.isFavorite && <span className="text-amber-400 text-lg">★</span>}
                </div>
                <p className="text-sm text-text-muted">{recipe.style} • {recipe.batchSize}L</p>
              </div>
            </div>

            {/* Right side - Rating & Close */}
            <div className="flex items-center gap-4">
              {/* Rating & Batches */}
              <div className="text-right">
                <div className="flex items-center gap-1 text-amber-400">
                  <span>⭐</span>
                  <span className="font-bold">{recipe.rating || 0}</span>
                </div>
                <div className="text-sm text-text-muted">
                  {recipeBatches.length} პარტია
                </div>
              </div>
              
              {/* Close Button */}
              <button 
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-bg-card border border-border flex items-center justify-center hover:border-danger hover:text-danger transition-colors"
              >
                ✕
              </button>
            </div>
          </div>

        </div>



        {/* Tabs */}

        <div className="px-6 pt-4 border-b border-border">

          <div className="flex gap-4">

            {[

              { key: 'overview', label: 'მიმოხილვა' },

              { key: 'ingredients', label: 'ინგრედიენტები' },

              { key: 'process', label: 'პროცესი' },

              { key: 'history', label: 'ისტორია' },

            ].map(tab => (

              <button

                key={tab.key}

                onClick={() => setActiveTab(tab.key as typeof activeTab)}

                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${

                  activeTab === tab.key

                    ? 'border-copper text-copper-light'

                    : 'border-transparent text-text-muted hover:text-text-primary'

                }`}

              >

                {tab.label}

              </button>

            ))}

          </div>

        </div>



        {/* Content - scrollable */}

        <div className="flex-1 overflow-y-auto p-6">

          {activeTab === 'overview' && (

            <div className="grid grid-cols-3 gap-6">

              {/* Left Column - Description & Notes */}

              <div className="col-span-2 space-y-6">

                <div className="bg-bg-card border border-border rounded-xl p-4">

                  <h3 className="text-sm font-medium mb-3">აღწერა</h3>

                  <p className="text-text-secondary">{recipe.description}</p>

                </div>



                {/* Key Stats */}

                <div className="grid grid-cols-6 gap-3">

                  {[

                    { label: 'OG', value: formatGravity(recipe.targetOG), color: 'text-copper-light' },

                    { label: 'FG', value: formatGravity(recipe.targetFG), color: 'text-green-400' },

                    { label: 'ABV', value: `${recipe.targetABV}%`, color: 'text-amber-400' },

                    { label: 'IBU', value: recipe.ibu, color: '' },

                    { label: 'SRM', value: recipe.srm, color: '', hasColor: true },

                    { label: 'ეფექტ.', value: `${recipe.efficiency}%`, color: '' },

                  ].map((stat, i) => (

                    <div key={i} className="bg-bg-card border border-border rounded-xl p-3 text-center">
                      {stat.hasColor ? (
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <div 
                            className="w-6 h-6 rounded-full border border-border"
                            style={{ backgroundColor: getBeerColor(recipe.srm || 5) }}
                          />
                          <p className={`text-lg font-mono font-bold ${stat.color}`}>{stat.value}</p>
                        </div>
                      ) : (
                        <p className={`text-lg font-mono font-bold ${stat.color}`}>{stat.value}</p>
                      )}
                      <p className="text-xs text-text-muted">{stat.label}</p>
                    </div>

                  ))}

                </div>



                {/* Notes */}

                {recipe.notes && (

                  <div className="bg-amber-400/10 border border-amber-400/30 rounded-xl p-4">

                    <h3 className="text-sm font-medium mb-2 text-amber-400">💡 შენიშვნები</h3>

                    <p className="text-sm text-text-secondary">{recipe.notes}</p>

                  </div>

                )}



                {/* Ingredients Summary */}

                <div className="bg-bg-card border border-border rounded-xl p-4">

                  <h3 className="text-sm font-medium mb-3">ინგრედიენტების მიმოხილვა</h3>

                  <div className="grid grid-cols-4 gap-4">

                    <div className="text-center p-3 bg-bg-tertiary rounded-lg">

                      <span className="text-2xl">🌾</span>

                      <p className="text-lg font-bold mt-1">{grains.length}</p>

                      <p className="text-xs text-text-muted">ალაო</p>

                    </div>

                    <div className="text-center p-3 bg-bg-tertiary rounded-lg">

                      <span className="text-2xl">🌿</span>

                      <p className="text-lg font-bold mt-1">{hops.length}</p>

                      <p className="text-xs text-text-muted">სვია</p>

                    </div>

                    <div className="text-center p-3 bg-bg-tertiary rounded-lg">

                      <span className="text-2xl">🧪</span>

                      <p className="text-lg font-bold mt-1">{yeast.length}</p>

                      <p className="text-xs text-text-muted">საფუარი</p>

                    </div>

                    <div className="text-center p-3 bg-bg-tertiary rounded-lg">

                      <span className="text-2xl">⏱️</span>

                      <p className="text-lg font-bold mt-1">{formatDuration(totalBrewTime)}</p>

                      <p className="text-xs text-text-muted">სულ დრო</p>

                    </div>

                  </div>

                </div>

              </div>



              {/* Right Column - Quick Info */}

              <div className="space-y-4">

                <div className="bg-bg-card border border-border rounded-xl p-4">

                  <h3 className="text-sm font-medium mb-3">📊 პარამეტრები</h3>

                  <div className="space-y-3">

                    <div className="flex justify-between">

                      <span className="text-text-muted">მოცულობა</span>

                      <span className="font-mono">{recipe.batchSize} L</span>

                    </div>

                    <div className="flex justify-between">

                      <span className="text-text-muted">ხარშვის დრო</span>

                      <span className="font-mono">{recipe.boilTime} წთ</span>

                    </div>

                    <div className="flex justify-between">

                      <span className="text-text-muted">ეფექტურობა</span>

                      <span className="font-mono">{recipe.efficiency}%</span>

                    </div>

                  </div>

                </div>



                <div className="bg-bg-card border border-border rounded-xl p-4">

                  <h3 className="text-sm font-medium mb-3">📅 თარიღები</h3>

                  <div className="space-y-3 text-sm">

                    <div className="flex justify-between">

                      <span className="text-text-muted">შექმნა</span>

                      <span>{formatDate(recipe.createdAt)}</span>

                    </div>

                    <div className="flex justify-between">

                      <span className="text-text-muted">განახლება</span>

                      <span>{formatDate(recipe.updatedAt)}</span>

                    </div>

                  </div>

                </div>



                {/* Color Preview */}

                <div className="bg-bg-card border border-border rounded-xl p-4">

                  <h3 className="text-sm font-medium mb-3">🎨 ფერი (SRM: {recipe.srm})</h3>

                  <div 

                    className="h-16 rounded-lg"

                    style={{ 

                      backgroundColor: getBeerColor(recipe.srm || 5)

                    }}

                  />

                </div>

              </div>

            </div>

          )}



          {activeTab === 'ingredients' && (

            <div className="space-y-6">
              
              {/* Stock Availability Summary */}
              {ingredientsWithStock.length > 0 && (
                <div className={`p-4 rounded-lg border ${
                  stockAvailability.allAvailable 
                    ? 'bg-green-900/20 border-green-600/30' 
                    : 'bg-red-900/20 border-red-600/30'
                }`}>
                  <div className="flex items-center gap-2">
                    {stockAvailability.allAvailable ? (
                      <>
                        <span className="text-green-400">✅</span>
                        <span className="text-green-400">ყველა ინგრედიენტი საკმარისია</span>
                      </>
                    ) : (
                      <>
                        <span className="text-red-400">⚠️</span>
                        <span className="text-red-400">
                          {stockAvailability.missing.length} ინგრედიენტი არ არის საკმარისი
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Grains */}

              <div className="bg-bg-card border border-border rounded-xl p-4">

                <h3 className="text-sm font-medium mb-4 flex items-center gap-2">

                  🌾 ალაო და მარცვლეული

                  <span className="text-text-muted">({formatAmountWithUnit(grains.reduce((sum, g) => sum + convertToKg(Number(g.amount), g.unit || 'kg'), 0))})</span>

                </h3>

                <div className="space-y-3">

                  {grains.map((ingredient, i) => {
                    const hasStock = ingredient.inventoryItem
                    // Inventory is stored in kg, convert recipe amount to kg for comparison
                    const availableKg = hasStock ? Number(ingredient.inventoryItem.cachedBalance || 0) : 0
                    const neededKg = convertToKg(Number(ingredient.amount), ingredient.unit || 'kg')
                    const isEnough = availableKg >= neededKg
                    
                    return (
                    <div key={i} className="flex items-center gap-4 p-3 bg-bg-tertiary rounded-lg">

                      <div className="w-12 h-12 rounded-lg bg-amber-400/20 flex items-center justify-center">

                        <span className="text-xl">🌾</span>

                      </div>

                      <div className="flex-1">

                        <p className="font-medium">{ingredient.name}</p>

                        <p className="text-sm text-text-muted">{ingredient.percentage}% რეცეპტის</p>

                      </div>

                      <div className="text-right">

                        <p className="font-mono text-lg">{ingredient.amount} {ingredient.unit}</p>

                      </div>
                      
                      {/* Stock Level Indicator */}
                      {hasStock ? (
                        <div className="text-right min-w-[100px]">
                          <div className={`text-sm font-medium ${
                            isEnough ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {formatAmountWithUnit(availableKg, ingredient.unit)}
                          </div>
                          <div className="text-xs text-text-muted">
                            საჭიროა: {formatAmountWithUnit(neededKg, ingredient.unit)}
                          </div>
                          <div className="text-xs text-text-muted">
                            {isEnough ? '✅ საკმარისია' : '⚠️ არ არის საკმარისი'}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-text-muted min-w-[100px] text-right">
                          📦 არ არის დაკავშირებული
                        </div>
                      )}

                      <div className="w-24">

                        <ProgressBar value={ingredient.percentage || 0} size="sm" color="amber" />

                      </div>

                    </div>
                    )
                  })}

                </div>

              </div>



              {/* Hops */}

              <div className="bg-bg-card border border-border rounded-xl p-4">

                <h3 className="text-sm font-medium mb-4 flex items-center gap-2">

                  🌿 სვია

                  <span className="text-text-muted">({formatAmountWithUnit(hops.reduce((sum, h) => sum + convertToKg(Number(h.amount), h.unit || 'kg'), 0))})</span>

                </h3>

                <div className="space-y-3">

                  {hops.map((ingredient, i) => {
                    const hasStock = ingredient.inventoryItem
                    // Inventory is stored in kg, convert recipe amount to kg for comparison
                    const availableKg = hasStock ? Number(ingredient.inventoryItem.cachedBalance || 0) : 0
                    const neededKg = convertToKg(Number(ingredient.amount), ingredient.unit || 'kg')
                    const isEnough = availableKg >= neededKg
                    
                    return (
                    <div key={i} className="flex items-center gap-4 p-3 bg-bg-tertiary rounded-lg">

                      <div className="w-12 h-12 rounded-lg bg-green-400/20 flex items-center justify-center">

                        <span className="text-xl">🌿</span>

                      </div>

                      <div className="flex-1">

                        <p className="font-medium">{ingredient.name}</p>

                        <p className="text-sm text-text-muted">{ingredient.addTime}</p>

                      </div>

                      <div className="text-right">

                        <p className="font-mono text-lg">{ingredient.amount} {ingredient.unit}</p>

                      </div>
                      
                      {/* Stock Level Indicator */}
                      {hasStock ? (
                        <div className="text-right min-w-[100px]">
                          <div className={`text-sm font-medium ${
                            isEnough ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {formatAmountWithUnit(availableKg, ingredient.unit)}
                          </div>
                          <div className="text-xs text-text-muted">
                            საჭიროა: {formatAmountWithUnit(neededKg, ingredient.unit)}
                          </div>
                          <div className="text-xs text-text-muted">
                            {isEnough ? '✅ საკმარისია' : '⚠️ არ არის საკმარისი'}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-text-muted min-w-[100px] text-right">
                          📦 არ არის დაკავშირებული
                        </div>
                      )}

                    </div>
                    )
                  })}

                </div>

              </div>



              {/* Yeast */}

              <div className="bg-bg-card border border-border rounded-xl p-4">

                <h3 className="text-sm font-medium mb-4 flex items-center gap-2">

                  🧪 საფუარი

                </h3>

                <div className="space-y-3">

                  {yeast.map((ingredient, i) => {
                    const hasStock = ingredient.inventoryItem
                    // Inventory is stored in kg, convert recipe amount to kg for comparison
                    const availableKg = hasStock ? Number(ingredient.inventoryItem.cachedBalance || 0) : 0
                    const neededKg = convertToKg(Number(ingredient.amount), ingredient.unit || 'kg')
                    const isEnough = availableKg >= neededKg
                    
                    return (
                    <div key={i} className="flex items-center gap-4 p-3 bg-bg-tertiary rounded-lg">

                      <div className="w-12 h-12 rounded-lg bg-purple-400/20 flex items-center justify-center">

                        <span className="text-xl">🧪</span>

                      </div>

                      <div className="flex-1">

                        <p className="font-medium">{ingredient.name}</p>

                      </div>

                      <div className="text-right">

                        <p className="font-mono text-lg">{ingredient.amount} {ingredient.unit}</p>

                      </div>
                      
                      {/* Stock Level Indicator */}
                      {hasStock ? (
                        <div className="text-right min-w-[100px]">
                          <div className={`text-sm font-medium ${
                            isEnough ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {formatAmountWithUnit(availableKg, ingredient.unit)}
                          </div>
                          <div className="text-xs text-text-muted">
                            საჭიროა: {formatAmountWithUnit(neededKg, ingredient.unit)}
                          </div>
                          <div className="text-xs text-text-muted">
                            {isEnough ? '✅ საკმარისია' : '⚠️ არ არის საკმარისი'}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-text-muted min-w-[100px] text-right">
                          📦 არ არის დაკავშირებული
                        </div>
                      )}

                    </div>
                    )
                  })}

                </div>

              </div>



              {/* Adjuncts */}

              {adjuncts.length > 0 && (
                <div className="bg-bg-card border border-border rounded-xl p-4">

                  <h3 className="text-sm font-medium mb-4 flex items-center gap-2">

                    ⚗️ დანამატები

                  </h3>

                  <div className="space-y-3">

                    {adjuncts.map((ingredient, i) => {
                      const hasStock = ingredient.inventoryItem
                      // Inventory is stored in kg, convert recipe amount to kg for comparison
                      const availableKg = hasStock ? Number(ingredient.inventoryItem.cachedBalance || 0) : 0
                      const neededKg = convertToKg(Number(ingredient.amount), ingredient.unit || 'kg')
                      const isEnough = availableKg >= neededKg
                      
                      return (
                      <div key={i} className="flex items-center gap-4 p-3 bg-bg-tertiary rounded-lg">

                        <div className="w-12 h-12 rounded-lg bg-blue-400/20 flex items-center justify-center">

                          <span className="text-xl">⚗️</span>

                        </div>

                        <div className="flex-1">

                          <p className="font-medium">{ingredient.name}</p>

                        </div>

                        <div className="text-right">

                          <p className="font-mono text-lg">{ingredient.amount} {ingredient.unit}</p>

                        </div>
                        
                        {/* Stock Level Indicator */}
                        {hasStock ? (
                          <div className="text-right min-w-[100px]">
                            <div className={`text-sm font-medium ${
                              isEnough ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {formatAmountWithUnit(availableKg, ingredient.unit)}
                            </div>
                            <div className="text-xs text-text-muted">
                              საჭიროა: {formatAmountWithUnit(neededKg, ingredient.unit)}
                            </div>
                            <div className="text-xs text-text-muted">
                              {isEnough ? '✅ საკმარისია' : '⚠️ არ არის საკმარისი'}
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-text-muted min-w-[100px] text-right">
                            📦 არ არის დაკავშირებული
                          </div>
                        )}

                      </div>
                      )
                    })}

                  </div>

                </div>
              )}

            </div>

          )}



          {activeTab === 'process' && (
            <div className="space-y-6">
              {/* Mash Steps */}
              <div className="bg-bg-card border border-border rounded-xl p-4">
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  🌡️ ბადაგის მიღება
                </h3>
                <div className="space-y-2">
                  {(recipe as any).process?.mashSteps?.length > 0 ? (
                    (recipe as any).process.mashSteps.map((step: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-bg-tertiary rounded-lg">
                        <span className="font-medium">{step.name}</span>
                        <div className="flex gap-4 text-sm">
                          <span className="text-amber-400">{step.temperature}°C</span>
                          <span className="text-text-muted">{step.duration} წთ</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-text-muted text-center py-4">ბადაგის ნაბიჯები არ არის</p>
                  )}
                </div>
                
                {/* Mashing Process Chart - Same as Edit Modal */}
                {(recipe as any).process?.mashSteps?.length > 0 && (
                  <div className="bg-bg-tertiary rounded-lg p-4 mt-4">
                    <h4 className="text-sm font-medium text-slate-200 mb-3">Mashing Process</h4>
                    <div className="bg-slate-900 rounded-lg p-4">
                      <svg viewBox="0 0 240 160" className="w-full h-full" preserveAspectRatio="xMidYMid meet" style={{ minHeight: '200px' }}>
                        {/* Grid */}
                        <defs>
                          <pattern id="detailMashGrid" width="30" height="20" patternUnits="userSpaceOnUse">
                            <path d="M 30 0 L 0 0 0 20" fill="none" stroke="#334155" strokeWidth="0.5"/>
                          </pattern>
                        </defs>
                        <rect x="40" y="10" width="180" height="120" fill="url(#detailMashGrid)" />
                        
                        {/* Axes */}
                        <line x1="40" y1="10" x2="40" y2="130" stroke="#64748b" strokeWidth="1.5"/>
                        <line x1="40" y1="130" x2="220" y2="130" stroke="#64748b" strokeWidth="1.5"/>
                        
                        {/* Y-axis labels */}
                        <text x="8" y="18" fill="#cbd5e1" fontSize="10" fontWeight="500">80</text>
                        <text x="8" y="48" fill="#cbd5e1" fontSize="10" fontWeight="500">72</text>
                        <text x="8" y="70" fill="#cbd5e1" fontSize="10" fontWeight="500">64</text>
                        <text x="8" y="100" fill="#cbd5e1" fontSize="10" fontWeight="500">50</text>
                        <text x="8" y="132" fill="#cbd5e1" fontSize="10" fontWeight="500">40</text>
                        
                        {/* Temperature line with ramps */}
                        {(() => {
                          const mashSteps = (recipe as any).process.mashSteps
                          const minTemp = 40
                          const maxTemp = 80
                          const totalTime = 90 // Fixed 90 minutes scale
                          
                          let points: string[] = []
                          let currentTime = 0
                          let currentTemp = minTemp
                          
                          // Start point at 40°C
                          points.push(`40,130`)
                          
                          mashSteps.forEach((step: any) => {
                            const targetTemp = step.temperature || 65
                            const holdDuration = step.duration || 15
                            
                            // Ramp time (1°C per minute)
                            const rampTime = Math.abs(targetTemp - currentTemp)
                            
                            // Ramp up
                            currentTime += rampTime
                            const xRampEnd = 40 + (currentTime / totalTime) * 180
                            const yTarget = 130 - ((targetTemp - minTemp) / (maxTemp - minTemp)) * 120
                            points.push(`${xRampEnd},${yTarget}`)
                            
                            // Hold
                            currentTime += holdDuration
                            const xHoldEnd = 40 + (currentTime / totalTime) * 180
                            points.push(`${xHoldEnd},${yTarget}`)
                            
                            currentTemp = targetTemp
                          })
                          
                          return (
                            <>
                              <polyline
                                fill="none"
                                stroke="#f59e0b"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                points={points.join(' ')}
                              />
                              
                              {/* Temperature labels */}
                              {mashSteps.map((step: any, idx: number) => {
                                const temp = step.temperature || 65
                                let timeAtMid = 0
                                
                                // Calculate time to middle of hold period
                                let prevTemp = minTemp
                                for (let i = 0; i <= idx; i++) {
                                  const stepTemp = mashSteps[i].temperature || 65
                                  timeAtMid += Math.abs(stepTemp - prevTemp) // ramp
                                  if (i < idx) {
                                    timeAtMid += mashSteps[i].duration || 0 // previous holds
                                  } else {
                                    timeAtMid += (mashSteps[i].duration || 0) / 2 // half of current hold
                                  }
                                  prevTemp = stepTemp
                                }
                                
                                const xPos = 40 + (timeAtMid / totalTime) * 180
                                const yPos = 130 - ((temp - minTemp) / (maxTemp - minTemp)) * 120
                                
                                return (
                                  <g key={idx}>
                                    <circle cx={xPos} cy={yPos} r="5" fill="#f59e0b" stroke="#d97706" strokeWidth="1.5"/>
                                    <text x={xPos} y={yPos - 12} fill="#fbbf24" fontSize="12" fontWeight="bold" textAnchor="middle">
                                      {temp}°
                                    </text>
                                  </g>
                                )
                              })}
                            </>
                          )
                        })()}
                        
                        {/* X-axis time markers (0 to 90 minutes) */}
                        {[0, 15, 30, 45, 60, 75, 90].map((time) => {
                          const xPos = 40 + (time / 90) * 180
                          return (
                            <g key={time}>
                              <line x1={xPos} y1="130" x2={xPos} y2="135" stroke="#64748b" strokeWidth="1.5"/>
                              <text x={xPos} y="148" fill="#cbd5e1" fontSize="9" fontWeight="500" textAnchor="middle">
                                {time}
                              </text>
                            </g>
                          )
                        })}
                        
                        {/* X-axis end marker with ✓ */}
                        <circle cx="220" cy="133" r="6" fill="#22c55e"/>
                        <text x="220" y="138" fill="white" fontSize="10" fontWeight="bold" textAnchor="middle">✓</text>
                      </svg>
                    </div>
                  </div>
                )}
              </div>

              {/* Boil / Hop Schedule */}
              <div className="bg-bg-card border border-border rounded-xl p-4">
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  🔥 ხარშვა ({recipe.boilTime || (recipe as any).process?.boilTime || 60} წთ)
                </h3>
                <div className="space-y-2">
                  {(recipe as any).process?.hopSchedule?.length > 0 ? (
                    (recipe as any).process.hopSchedule.map((hop: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-bg-tertiary rounded-lg">
                        <span className="font-medium">🌿 {hop.name}</span>
                        <div className="flex gap-4 text-sm">
                          <span>{hop.amount} {hop.unit}</span>
                          <span className="text-green-400">@ {hop.time} წთ</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-text-muted text-center py-4">სვია არ არის</p>
                  )}
                </div>
              </div>

              {/* Fermentation - USE SAVED DATA */}
              <div className="bg-bg-card border border-border rounded-xl p-4">
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  🧪 ფერმენტაცია
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-bg-tertiary rounded-lg">
                    <div className="text-sm text-text-muted mb-1">პირველადი</div>
                    <div className="text-lg font-medium text-amber-400">
                      {(recipe as any).process?.fermentation?.primaryTemp || 18}°C
                    </div>
                    <div className="text-sm text-text-muted">
                      {(recipe as any).process?.fermentation?.primaryDays || 7} დღე
                    </div>
                  </div>
                  <div className="p-3 bg-bg-tertiary rounded-lg">
                    <div className="text-sm text-text-muted mb-1">მეორადი</div>
                    <div className="text-lg font-medium text-amber-400">
                      {(recipe as any).process?.fermentation?.secondaryTemp || 16}°C
                    </div>
                    <div className="text-sm text-text-muted">
                      {(recipe as any).process?.fermentation?.secondaryDays || 7} დღე
                    </div>
                  </div>
                </div>
                {(recipe as any).process?.fermentation?.notes && (
                  <p className="mt-3 text-sm text-text-muted italic">
                    💡 {(recipe as any).process.fermentation.notes}
                  </p>
                )}
              </div>

              {/* Conditioning - USE SAVED DATA */}
              <div className="bg-bg-card border border-border rounded-xl p-4">
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  ❄️ კონდიცირება / ლაგერირება
                </h3>
                <div className="flex gap-4">
                  <div className="p-3 bg-bg-tertiary rounded-lg flex-1">
                    <div className="text-sm text-text-muted mb-1">ტემპერატურა</div>
                    <div className="text-lg font-medium text-cyan-400">
                      {(recipe as any).process?.conditioning?.temperature || 2}°C
                    </div>
                  </div>
                  <div className="p-3 bg-bg-tertiary rounded-lg flex-1">
                    <div className="text-sm text-text-muted mb-1">ხანგრძლივობა</div>
                    <div className="text-lg font-medium text-cyan-400">
                      {(recipe as any).process?.conditioning?.days || 14} დღე
                    </div>
                  </div>
                </div>
                {(recipe as any).process?.conditioning?.notes && (
                  <p className="mt-3 text-sm text-text-muted italic">
                    💡 {(recipe as any).process.conditioning.notes}
                  </p>
                )}
              </div>

              {/* Total Time */}
              <div className="bg-amber-900/30 border border-amber-700/50 rounded-xl p-4">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-amber-400 font-medium">⏱️ სულ დრო:</span>
                    <span className="text-xl font-bold text-amber-400">
                      {(() => {
                        const fermentationDays = ((recipe as any).process?.fermentation?.primaryDays || 7) + 
                                                 ((recipe as any).process?.fermentation?.secondaryDays || 7)
                        const conditioningDays = (recipe as any).process?.conditioning?.days || 14
                        return fermentationDays + conditioningDays
                      })()} დღე
                    </span>
                  </div>
                  <div className="text-sm text-slate-400 flex items-center gap-2">
                    <span>ფერმენტაცია: {((recipe as any).process?.fermentation?.primaryDays || 7) + ((recipe as any).process?.fermentation?.secondaryDays || 7)} დღე</span>
                    <span>+</span>
                    <span>კონდიცირება: {(recipe as any).process?.conditioning?.days || 14} დღე</span>
                  </div>
                </div>
              </div>
            </div>
          )}



          {activeTab === 'history' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                📋 პარტიების ისტორია ({recipeBatches.length})
              </h3>
              
              {batchesLoading ? (
                <div className="text-center py-8 text-text-muted">იტვირთება...</div>
              ) : recipeBatches.length > 0 ? (
                <div className="space-y-3">
                  {recipeBatches.map((batch: any) => (
                    <div 
                      key={batch.id}
                      className="flex items-center justify-between p-4 bg-bg-tertiary rounded-lg hover:bg-bg-card transition-colors cursor-pointer"
                      onClick={() => {
                        onClose()
                        router.push(`/production/${batch.id}`)
                      }}
                    >
                      <div>
                        <div className="font-medium text-amber-400 font-mono">
                          {batch.batchNumber || `BRW-${batch.id.slice(0, 8)}`}
                        </div>
                        <div className="text-sm text-text-muted">
                          {batch.startDate ? new Date(batch.startDate).toLocaleDateString('ka-GE', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          }) : 'თარიღი უცნობია'}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-sm">
                          {batch.status === 'completed' && <span className="text-green-400">✅ დასრულებული</span>}
                          {batch.status === 'fermenting' && <span className="text-purple-400">🧪 ფერმენტაცია</span>}
                          {batch.status === 'conditioning' && <span className="text-cyan-400">❄️ კონდიცირება</span>}
                          {batch.status === 'brewing' && <span className="text-amber-400">🍺 მზადდება</span>}
                          {batch.status === 'planned' && <span className="text-slate-400">📋 დაგეგმილი</span>}
                          {batch.status === 'packaging' && <span className="text-blue-400">📦 დაფასოება</span>}
                          {batch.status === 'ready' && <span className="text-green-400">✅ მზადაა</span>}
                        </div>
                        <div className="text-sm text-text-muted mt-1">
                          {batch.volume} L
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-bg-card border border-border rounded-xl">
                  <div className="text-6xl mb-4">🍺</div>
                  <p className="text-text-muted text-lg mb-2">ჯერ არ არის პარტიები</p>
                  <p className="text-text-muted text-sm mb-6">
                    დაიწყეთ პირველი პარტია ამ რეცეპტით
                  </p>
                  <button
                    onClick={handleStartBatchClick}
                    className="px-6 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors text-white font-medium"
                  >
                    🍺 პარტიის დაწყება
                  </button>
                </div>
              )}
            </div>
          )}

        </div>



        {/* Footer */}

        <div className="px-6 py-4 border-t border-border flex justify-between">

          <div className="flex gap-2">

            <button

              onClick={() => onEdit?.(recipe)}

              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors"

            >

              🖊️ რედაქტირება

            </button>

            <button

              onClick={() => onDuplicate?.(recipe)}

              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors"

            >

              📄 დუბლიკატი

            </button>

            <button

              onClick={() => onExport?.(recipe)}

              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors"

            >

              📤 ექსპორტი

            </button>

          </div>

          <div className="flex gap-3">

            <Button variant="secondary" onClick={onClose}>დახურვა</Button>

            <Button variant="primary" onClick={handleStartBatchClick}>🍺 პარტიის დაწყება</Button>

          </div>

        </div>

      </div>

      {/* Batch Confirmation Modal */}
      {showBatchConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]" onClick={() => setShowBatchConfirm(false)}>
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-amber-400 mb-4 flex items-center gap-2">
              🍺 პარტიის დაწყება
            </h3>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between py-2 border-b border-slate-700">
                <span className="text-slate-400">რეცეპტი:</span>
                <span className="font-medium">{recipe.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-700">
                <span className="text-slate-400">სტილი:</span>
                <span>{recipe.style}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-700">
                <span className="text-slate-400">მოცულობა:</span>
                <span>{recipe.batchSize} L</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-400">სავარაუდო ABV:</span>
                <span>{recipe.targetABV}%</span>
              </div>
            </div>
            
            <p className="text-slate-400 text-sm mb-6">
              დარწმუნებული ხართ, რომ გსურთ ახალი პარტიის დაწყება?
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowBatchConfirm(false)}
                className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg transition-colors"
              >
                გაუქმება
              </button>
              <button
                onClick={handleConfirmBatch}
                className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors font-medium"
              >
                🍺 დაწყება
              </button>
            </div>
          </div>
        </div>
      )}

    </div>

  )

}



