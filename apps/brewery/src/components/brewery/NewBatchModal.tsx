'use client'

import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui'
import { BEER_STYLES } from '@/constants'
import { getBatchPrefix } from '@/utils'

interface Recipe {
  id: string
  name: string
  style: string
  targetABV: number
  targetOG: number
  targetFG: number
  batchSize: number
  ingredients?: {
    id?: string
    name: string
    type: string
    amount: number
    unit: string
    inventoryItemId?: string
  }[]
}

interface NewBatchModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (batchId: string) => void
  recipeId?: string
}

export function NewBatchModal({ isOpen, onClose, onSuccess, recipeId: propRecipeId }: NewBatchModalProps) {
  const searchParams = useSearchParams()
  const urlRecipeId = searchParams.get('recipeId')
  const preSelectedRecipeId = propRecipeId || urlRecipeId
  
  // ALL useState declarations FIRST
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loadingRecipes, setLoadingRecipes] = useState(true)
  // ❌ equipment state აღარ საჭიროებს - ავზი მინიჭდება StartFermentationModalV2-ით
  const [selectedRecipe, setSelectedRecipe] = useState<string>('')
  const [isCustomRecipe, setIsCustomRecipe] = useState(false)
  const [formData, setFormData] = useState({
    recipeName: '',
    style: '',
    volume: 2000,
    // ❌ tankId აღარ ვიყენებთ - მინიჭება ხდება StartFermentationModalV2-ით
    brewDate: new Date().toISOString().split('T')[0],
    targetOG: 1.050,
    targetFG: 1.010,
    targetABV: 5.0,
    notes: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [inventoryError, setInventoryError] = useState<Array<{
    name: string
    required: number
    available: number
    unit: string
  }> | null>(null)
  
  // Fetch recipes from API
  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        setLoadingRecipes(true)
        const response = await fetch('/api/recipes')
        if (response.ok) {
          const data = await response.json()
          const fetchedRecipes = data.recipes || data || []
          setRecipes(fetchedRecipes)
        }
      } catch (error) {
        console.error('Error fetching recipes:', error)
      } finally {
        setLoadingRecipes(false)
      }
    }
    
    if (isOpen) {
      fetchRecipes()
    }
  }, [isOpen])
  
  // ❌ Equipment fetch აღარ საჭიროებს - ავზი მინიჭდება StartFermentationModalV2-ით
  
  // Recipe options from API + custom option
  const recipeOptions = useMemo(() => [
    ...recipes.map(r => ({
      id: r.id,
      name: r.name,
      style: r.style,
      defaultOG: r.targetOG || 1.050,
      defaultFG: r.targetFG || 1.010,
      defaultABV: r.targetABV || 5.0,
      batchSize: r.batchSize || 2000,
    })),
    { id: 'custom', name: '+ ახალი რეცეპტი', style: '', defaultOG: 1.050, defaultFG: 1.010, defaultABV: 5.0, batchSize: 2000 },
  ], [recipes])
  
  // Calculate ABV helper (defined early for use in useEffect and handlers)
  const calculateABV = (og: number, fg: number) => {
    // ABV calculation always uses SG values
    return Number(((og - fg) * 131.25).toFixed(1))
  }
  
  // Auto-select recipe if preSelectedRecipeId is provided
  useEffect(() => {
    if (preSelectedRecipeId && recipes.length > 0 && !selectedRecipe) {
      const recipe = recipes.find(r => r.id === preSelectedRecipeId)
      if (recipe) {
        setSelectedRecipe(recipe.id)
        setIsCustomRecipe(false)
        // Convert recipe OG/FG to SG if needed (recipes store in SG)
        const ogSg = recipe.targetOG || 1.050
        const fgSg = recipe.targetFG || 1.010
        const abv = calculateABV(ogSg, fgSg)
        setFormData(prev => ({
          ...prev,
          recipeName: recipe.name,
          style: recipe.style,
          targetOG: ogSg,
          targetFG: fgSg,
          targetABV: abv,
          volume: recipe.batchSize || 2000,
        }))
      }
    }
  }, [preSelectedRecipeId, recipes, selectedRecipe])
  
  // ❌ Tank selection logic აღარ საჭიროებს - ავზი მინიჭდება StartFermentationModalV2-ით

  const handleRecipeChange = (recipeId: string) => {
    setSelectedRecipe(recipeId)
    setInventoryError(null) // ✅ Clear inventory error when recipe changes
    if (recipeId === 'custom') {
      setIsCustomRecipe(true)
      setFormData(prev => ({ ...prev, recipeName: '', style: '' }))
    } else {
      setIsCustomRecipe(false)
      const recipe = recipeOptions.find(r => r.id === recipeId)
      if (recipe) {
        // Convert recipe OG/FG to SG if needed (recipes store in SG)
        const ogSg = recipe.defaultOG
        const fgSg = recipe.defaultFG
        const abv = calculateABV(ogSg, fgSg)
        setFormData(prev => ({
          ...prev,
          recipeName: recipe.name,
          style: recipe.style,
          targetOG: ogSg,
          targetFG: fgSg,
          targetABV: abv,
          volume: recipe.batchSize || 2000,
        }))
      }
    }
  }

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // ✅ Clear inventory error when volume changes (affects inventory requirements)
    if (field === 'volume') {
      setInventoryError(null)
    }
  }

  // Get current gravity unit from store
  const getGravityUnit = (): 'SG' | 'Plato' | 'Brix' => {
    if (typeof window === 'undefined') return 'SG'
    try {
      const stored = localStorage.getItem('brewery-settings')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed?.state?.productionSettings?.gravityUnit) {
          return parsed.state.productionSettings.gravityUnit
        }
      }
    } catch (e) {
      console.error('Error reading gravity unit from store:', e)
    }
    return 'SG'
  }

  // Convert SG to selected unit for display
  const sgToDisplayUnit = (sg: number): number => {
    const unit = getGravityUnit()
    if (unit === 'SG') return sg
    if (unit === 'Plato') {
      // Formula: °P = (-616.868) + (1111.14 * SG) - (630.272 * SG²) + (135.997 * SG³)
      return (-616.868) + (1111.14 * sg) - (630.272 * sg * sg) + (135.997 * sg * sg * sg)
    }
    if (unit === 'Brix') {
      return (((182.4601 * sg - 775.6821) * sg + 1262.7794) * sg - 669.5622)
    }
    return sg
  }

  // Convert display unit back to SG for storage
  const displayUnitToSg = (value: number): number => {
    const unit = getGravityUnit()
    if (unit === 'SG') return value
    if (unit === 'Plato') {
      // Formula: SG = 1 + (°P / (258.6 - ((°P / 258.2) * 227.1)))
      return 1 + (value / (258.6 - ((value / 258.2) * 227.1)))
    }
    if (unit === 'Brix') {
      return 1.000019 + (0.003865613 * value) + (0.00001296425 * value * value) + (0.000000006937 * value * value * value)
    }
    return value
  }

  const handleOGChange = (displayValue: number) => {
    // Convert display unit to SG for storage and calculation
    const ogSg = displayUnitToSg(displayValue)
    const fgSg = displayUnitToSg(formData.targetFG)
    const abv = calculateABV(ogSg, fgSg)
    setFormData(prev => ({ ...prev, targetOG: ogSg, targetABV: abv }))
  }

  const handleFGChange = (displayValue: number) => {
    // Convert display unit to SG for storage and calculation
    const ogSg = displayUnitToSg(formData.targetOG)
    const fgSg = displayUnitToSg(displayValue)
    const abv = calculateABV(ogSg, fgSg)
    setFormData(prev => ({ ...prev, targetFG: fgSg, targetABV: abv }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      // Validate that we have a recipe ID (not custom)
      if (selectedRecipe === 'custom') {
        throw new Error('Custom recipes are not yet supported. Please select an existing recipe.')
      }
      
      // Get batch prefix from settings
      const batchPrefix = getBatchPrefix()
      
      // API-ით შექმნა database-ში (tankId აღარ ვაგზავნით)
      const response = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipeId: selectedRecipe,
          volume: parseFloat(String(formData.volume)),
          // ❌ tankId აღარ ვაგზავნით!
          plannedDate: new Date(formData.brewDate).toISOString(),
          notes: formData.notes || undefined,
          batchPrefix, // ✅ Pass batch prefix from settings
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        
        // ✅ Handle insufficient inventory error
        if (error.code === 'INSUFFICIENT_INVENTORY' && error.details) {
          setInventoryError(error.details)
          setIsSubmitting(false)
          return
        }
        
        throw new Error(error.error || error.message || 'Failed to create batch')
      }
      
      // ✅ Clear inventory error on success
      setInventoryError(null)

      const newBatch = await response.json()
      console.log('[NewBatchModal] Batch created in database:', newBatch)
      
      const batchId = newBatch.id || newBatch.batch?.id
      const batchNumber = newBatch.batchNumber || newBatch.batch?.batchNumber
      
      if (!batchId) {
        throw new Error('Batch created but ID not returned')
      }
      
      // ❌ Equipment update აღარ საჭიროებს - ავზი მინიჭდება StartFermentationModalV2-ით
      
      // Reset form
      setSelectedRecipe('')
      setIsCustomRecipe(false)
      setInventoryError(null) // ✅ Clear inventory error
      setFormData({
        recipeName: '',
        style: '',
        volume: 2000,
        // ❌ tankId აღარ ვიყენებთ
        brewDate: new Date().toISOString().split('T')[0],
        targetOG: 1.050,
        targetFG: 1.010,
        targetABV: 5.0,
        notes: '',
      })
      
      // Callbacks - onSuccess is the same as onBatchCreated
      if (onSuccess) {
        onSuccess(batchId)
      }
      onClose()
    } catch (error) {
      console.error('[NewBatchModal] Error creating batch:', error)
      const errorMessage = error instanceof Error ? error.message : 'შეცდომა პარტიის შექმნისას'
      alert(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Form validation
  const isFormValid = useMemo(() => {
    if (!selectedRecipe) return false
    if (isCustomRecipe && (!formData.recipeName || !formData.style)) return false
    if (!formData.volume || formData.volume <= 0) return false
    // ❌ tankId validation აღარ საჭიროებს
    if (!formData.brewDate) return false
    return true
  }, [selectedRecipe, isCustomRecipe, formData])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-bg-secondary border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-border sticky top-0 bg-bg-secondary z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🍺</span>
              <div>
                <h2 className="text-xl font-display font-semibold">ახალი პარტია</h2>
                <p className="text-sm text-text-muted">შექმენით ახალი წარმოების პარტია</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-bg-tertiary hover:bg-bg-card flex items-center justify-center transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Inventory Error Display */}
          {inventoryError && (
            <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
              <div className="text-red-400 font-medium mb-2">❌ არასაკმარისი მარაგი:</div>
              <ul className="text-sm text-red-300 space-y-1">
                {inventoryError.map((item, idx) => (
                  <li key={idx}>
                    • <strong>{item.name}</strong>: საჭირო {item.required}{item.unit}, 
                    მარაგი <span className="text-red-400">{item.available}{item.unit}</span>
                    <span className="text-red-500 ml-2">
                      (აკლია: {(item.required - item.available).toFixed(2)}{item.unit})
                    </span>
                  </li>
                ))}
              </ul>
              <button 
                type="button"
                onClick={() => setInventoryError(null)}
                className="mt-3 text-xs text-red-400 hover:text-red-300 underline"
              >
                დახურვა
              </button>
            </div>
          )}
          
          {/* Recipe Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              რეცეპტი <span className="text-danger">*</span>
            </label>
            {loadingRecipes ? (
              <div className="px-4 py-3 bg-bg-card border border-border rounded-xl text-sm text-text-muted">
                იტვირთება რეცეპტები...
              </div>
            ) : (
              <select
                value={selectedRecipe}
                onChange={(e) => handleRecipeChange(e.target.value)}
                className="w-full px-4 py-3 bg-bg-card border border-border rounded-xl text-sm outline-none focus:border-copper"
                required
              >
                <option value="">აირჩიეთ რეცეპტი...</option>
                {recipeOptions.map(recipe => (
                  <option key={recipe.id} value={recipe.id}>
                    {recipe.name} {recipe.style ? `(${recipe.style})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Custom Recipe Fields */}
          {isCustomRecipe && (
            <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-bg-card rounded-xl border border-border">
              <div>
                <label className="block text-xs text-text-muted mb-1.5">რეცეპტის სახელი</label>
                <input
                  type="text"
                  value={formData.recipeName}
                  onChange={(e) => handleInputChange('recipeName', e.target.value)}
                  placeholder="მაგ: Georgian Amber Lager"
                  className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm outline-none focus:border-copper"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1.5">სტილი</label>
                <select
                  value={formData.style}
                  onChange={(e) => handleInputChange('style', e.target.value)}
                  className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm outline-none focus:border-copper"
                  required
                >
                  <option value="">აირჩიეთ...</option>
                  {BEER_STYLES.map(style => (
                    <option key={style} value={style}>{style}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Volume */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              მოცულობა (ლიტრი) <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                value={formData.volume}
                onChange={(e) => handleInputChange('volume', Number(e.target.value))}
                min="100"
                max="10000"
                step="100"
                className="w-full px-4 py-3 bg-bg-card border border-border rounded-xl text-sm outline-none focus:border-copper pr-12"
                required
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted text-sm">L</span>
            </div>
            <div className="flex gap-2 mt-2">
              {[1000, 1500, 2000, 2500].map(vol => (
                <button
                  key={vol}
                  type="button"
                  onClick={() => handleInputChange('volume', vol)}
                  className={`px-3 py-1 rounded-lg text-xs transition-all ${
                    formData.volume === vol
                      ? 'bg-copper text-white'
                      : 'bg-bg-tertiary text-text-muted hover:bg-bg-card'
                  }`}
                >
                  {vol}L
                </button>
              ))}
            </div>
          </div>

          {/* Brew Date */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              ხარშვის თარიღი <span className="text-danger">*</span>
            </label>
            <input
              type="date"
              value={formData.brewDate}
              onChange={(e) => handleInputChange('brewDate', e.target.value)}
              className="w-full px-4 py-3 bg-bg-card border border-border rounded-xl text-sm outline-none focus:border-copper"
              required
            />
          </div>

          {/* Gravity Targets */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-3">სამიზნე მაჩვენებლები</label>
            <div className="grid grid-cols-3 gap-4 p-4 bg-bg-card rounded-xl border border-border">
              <div>
                <label className="block text-xs text-text-muted mb-1.5">
                  OG (საწყისი სიმკვრივე)
                  {getGravityUnit() === 'Plato' && ' (°P)'}
                  {getGravityUnit() === 'Brix' && ' (°Bx)'}
                  {getGravityUnit() === 'SG' && ' (SG)'}
                </label>
                <input
                  type="number"
                  value={sgToDisplayUnit(formData.targetOG).toFixed(getGravityUnit() === 'SG' ? 3 : 1)}
                  onChange={(e) => handleOGChange(Number(e.target.value))}
                  min={getGravityUnit() === 'SG' ? '1.020' : getGravityUnit() === 'Plato' ? '5' : '5'}
                  max={getGravityUnit() === 'SG' ? '1.120' : getGravityUnit() === 'Plato' ? '30' : '30'}
                  step={getGravityUnit() === 'SG' ? '0.001' : '0.1'}
                  className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm font-mono outline-none focus:border-copper"
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1.5">
                  FG (საბოლოო სიმკვრივე)
                  {getGravityUnit() === 'Plato' && ' (°P)'}
                  {getGravityUnit() === 'Brix' && ' (°Bx)'}
                  {getGravityUnit() === 'SG' && ' (SG)'}
                </label>
                <input
                  type="number"
                  value={sgToDisplayUnit(formData.targetFG).toFixed(getGravityUnit() === 'SG' ? 3 : 1)}
                  onChange={(e) => handleFGChange(Number(e.target.value))}
                  min={getGravityUnit() === 'SG' ? '1.000' : getGravityUnit() === 'Plato' ? '0' : '0'}
                  max={getGravityUnit() === 'SG' ? '1.040' : getGravityUnit() === 'Plato' ? '10' : '10'}
                  step={getGravityUnit() === 'SG' ? '0.001' : '0.1'}
                  className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm font-mono outline-none focus:border-copper"
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1.5">ABV (სავარაუდო)</label>
                <div className="px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm font-mono text-copper-light">
                  {formData.targetABV}%
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">შენიშვნები</label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="დამატებითი ინფორმაცია პარტიის შესახებ..."
              rows={3}
              className="w-full px-4 py-3 bg-bg-card border border-border rounded-xl text-sm outline-none focus:border-copper resize-none"
            />
          </div>

          {/* Summary */}
          {selectedRecipe && formData.recipeName && (
            <div className="mb-6 p-4 bg-copper/10 border border-copper/30 rounded-xl">
              <h4 className="text-sm font-medium text-copper-light mb-2">📋 შეჯამება</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p><span className="text-text-muted">რეცეპტი:</span> {formData.recipeName}</p>
                <p><span className="text-text-muted">სტილი:</span> {formData.style}</p>
                <p><span className="text-text-muted">მოცულობა:</span> {formData.volume}L</p>
                <p><span className="text-text-muted">თარიღი:</span> {formData.brewDate}</p>
                <p><span className="text-text-muted">სამიზნე ABV:</span> {formData.targetABV}%</p>
              </div>
              <p className="text-xs text-copper-light/70 mt-2">
                ✅ კალენდარში ავტომატურად დაემატება ხარშვის ივენთი
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
              disabled={isSubmitting}
            >
              გაუქმება
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!isFormValid || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? '⏳ იქმნება...' : '🍺 პარტიის შექმნა'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}