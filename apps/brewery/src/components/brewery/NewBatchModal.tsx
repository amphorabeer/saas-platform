'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui'
import { useBreweryStore, getRecipeOptions, createBatchWithEvents } from '@/store'
import { BEER_STYLES } from '@/constants'

interface NewBatchModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (batchId: string) => void
}

export function NewBatchModal({ isOpen, onClose, onSuccess }: NewBatchModalProps) {
  // Get data from store
  const tanks = useBreweryStore(state => state.tanks)
  
  // Recipe options from centralData
  const recipeOptions = useMemo(() => [
    ...getRecipeOptions(),
    { id: 'custom', name: '+ ახალი რეცეპტი', style: '', defaultOG: 1.050, defaultFG: 1.010, defaultABV: 5.0, batchSize: 2000 },
  ], [])
  
  // Available tanks (fermenters and brite tanks)
  const availableTanks = useMemo(() => {
    return tanks
      .filter(t => t.status === 'available' && (t.type === 'fermenter' || t.type === 'brite'))
      .map(t => ({
        id: t.id,
        name: t.name,
        type: t.type === 'fermenter' ? 'ფერმენტატორი' : 'ბრაიტ ტანკი',
        capacity: t.capacity,
      }))
  }, [tanks])
  
  // Form state
  const [selectedRecipe, setSelectedRecipe] = useState<string>('')
  const [isCustomRecipe, setIsCustomRecipe] = useState(false)
  const [formData, setFormData] = useState({
    recipeName: '',
    style: '',
    volume: 2000,
    tankId: '',
    brewDate: new Date().toISOString().split('T')[0],
    targetOG: 1.050,
    targetFG: 1.010,
    targetABV: 5.0,
    notes: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleRecipeChange = (recipeId: string) => {
    setSelectedRecipe(recipeId)
    if (recipeId === 'custom') {
      setIsCustomRecipe(true)
      setFormData(prev => ({ ...prev, recipeName: '', style: '' }))
    } else {
      setIsCustomRecipe(false)
      const recipe = recipeOptions.find(r => r.id === recipeId)
      if (recipe) {
        setFormData(prev => ({
          ...prev,
          recipeName: recipe.name,
          style: recipe.style,
          targetOG: recipe.defaultOG,
          targetFG: recipe.defaultFG,
          targetABV: recipe.defaultABV,
          volume: recipe.batchSize || 2000,
        }))
      }
    }
  }

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const calculateABV = (og: number, fg: number) => {
    return Number(((og - fg) * 131.25).toFixed(1))
  }

  const handleOGChange = (og: number) => {
    const abv = calculateABV(og, formData.targetFG)
    setFormData(prev => ({ ...prev, targetOG: og, targetABV: abv }))
  }

  const handleFGChange = (fg: number) => {
    const abv = calculateABV(formData.targetOG, fg)
    setFormData(prev => ({ ...prev, targetFG: fg, targetABV: abv }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      // Create batch with calendar events
      const batchId = createBatchWithEvents({
        recipeId: selectedRecipe === 'custom' ? 'custom' : selectedRecipe,
        recipeName: formData.recipeName,
        style: formData.style,
        status: 'planned',
        tankId: formData.tankId || undefined,
        tankName: formData.tankId ? availableTanks.find(t => t.id === formData.tankId)?.name : undefined,
        volume: formData.volume,
        og: formData.targetOG,
        targetFg: formData.targetFG,
        progress: 0,
        startDate: new Date(formData.brewDate),
        brewerId: '1',
        brewerName: 'ნიკა ზედგინიძე',
        notes: formData.notes,
      })
      
      // If tank was selected, assign it
      if (formData.tankId) {
        useBreweryStore.getState().assignTank(formData.tankId, batchId)
      }
      
      // Reset form
      setSelectedRecipe('')
      setIsCustomRecipe(false)
      setFormData({
        recipeName: '',
        style: '',
        volume: 2000,
        tankId: '',
        brewDate: new Date().toISOString().split('T')[0],
        targetOG: 1.050,
        targetFG: 1.010,
        targetABV: 5.0,
        notes: '',
      })
      
      onSuccess?.(batchId)
      onClose()
    } catch (error) {
      console.error('Error creating batch:', error)
      alert('შეცდომა პარტიის შექმნისას')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isFormValid = selectedRecipe && formData.recipeName && formData.volume > 0

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-bg-secondary border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-bg-tertiary">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🍺</span>
            <div>
              <h2 className="text-lg font-display font-semibold">ახალი პარტიის შექმნა</h2>
              <p className="text-xs text-text-muted">შეავსეთ ინფორმაცია ახალი პარტიის დასაწყებად</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-bg-card border border-border flex items-center justify-center hover:border-danger hover:text-danger transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Recipe Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              რეცეპტი <span className="text-danger">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {recipeOptions.map(recipe => (
                <button
                  key={recipe.id}
                  type="button"
                  onClick={() => handleRecipeChange(recipe.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedRecipe === recipe.id
                      ? 'border-copper bg-copper/10'
                      : 'border-border bg-bg-card hover:border-border-light'
                  }`}
                >
                  <p className={`text-sm font-medium ${selectedRecipe === recipe.id ? 'text-copper-light' : ''}`}>
                    {recipe.name}
                  </p>
                  {recipe.style && (
                    <p className="text-xs text-text-muted mt-0.5">{recipe.style} • {recipe.defaultABV}% ABV</p>
                  )}
                </button>
              ))}
            </div>
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
                  placeholder="მაგ: ჩემი IPA"
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

          {/* Volume & Tank */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
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

            <div>
              <label className="block text-sm font-medium mb-2">
                ტანკი <span className="text-text-muted text-xs">(არასავალდებულო)</span>
              </label>
              <select
                value={formData.tankId}
                onChange={(e) => handleInputChange('tankId', e.target.value)}
                className="w-full px-4 py-3 bg-bg-card border border-border rounded-xl text-sm outline-none focus:border-copper"
              >
                <option value="">მოგვიანებით აირჩევა...</option>
                {availableTanks.length > 0 ? (
                  availableTanks.map(tank => (
                    <option key={tank.id} value={tank.id}>
                      {tank.name} - {tank.type} ({tank.capacity}L)
                    </option>
                  ))
                ) : (
                  <option disabled>თავისუფალი ტანკი არ არის</option>
                )}
              </select>
              {availableTanks.length === 0 && (
                <p className="text-xs text-warning mt-2">⚠️ ყველა ტანკი დაკავებულია</p>
              )}
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
                <label className="block text-xs text-text-muted mb-1.5">OG (საწყისი სიმკვრივე)</label>
                <input
                  type="number"
                  value={formData.targetOG}
                  onChange={(e) => handleOGChange(Number(e.target.value))}
                  min="1.020"
                  max="1.120"
                  step="0.001"
                  className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm font-mono outline-none focus:border-copper"
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1.5">FG (საბოლოო სიმკვრივე)</label>
                <input
                  type="number"
                  value={formData.targetFG}
                  onChange={(e) => handleFGChange(Number(e.target.value))}
                  min="1.000"
                  max="1.040"
                  step="0.001"
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
                <p><span className="text-text-muted">ტანკი:</span> {formData.tankId ? availableTanks.find(t => t.id === formData.tankId)?.name : 'მოგვიანებით'}</p>
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
