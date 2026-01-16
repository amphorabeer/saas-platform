'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui'
import { InventoryItem } from '@/lib/api-client'

// Extended type for catalog items with specs
interface CatalogItemSpecs {
  color?: number
  potential?: number
  yield?: number
  maltType?: string
  alphaAcid?: number
  betaAcid?: number
  form?: string
  purpose?: string
  attenuation?: string
  tempRange?: string
  flocculation?: string
  yeastType?: string
  origin?: string
  description?: string
  adjunctType?: string
}

interface AddIngredientModalProps {
  isOpen: boolean
  onClose: () => void
  onBack?: () => void
  onSave: (data: IngredientFormData) => void
  onDelete?: () => void // Optional delete handler - only shown when editing
  existingItem?: InventoryItem | null
  selectedCatalogItem?: (InventoryItem & CatalogItemSpecs) | null
}

export interface IngredientFormData {
  name: string
  category: string
  supplier?: string
  origin?: string
  fermentableType?: 'grain' | 'sugar' | 'liquid_extract' | 'dry_extract' | 'adjunct' | 'other'
  maltCategory?: 'base' | 'caramel' | 'roasted' | 'specialty' | 'smoked' | 'acidulated'
  type?: string
  color?: number
  potential?: number
  yield?: number
  alphaAcid?: number
  attenuation?: string
  tempRange?: string
  inventoryAmount: number
  costPerUnit?: number
  manufacturingDate?: string
  bestBeforeDate?: string
  lotNumber?: string
  reorderPoint?: number
  unit: string
  notes?: string
}

// Category icon mapping
const CATEGORY_ICONS: Record<string, string> = {
  malt: '🌾',
  grain: '🌾',
  hops: '🌿',
  hop: '🌿',
  yeast: '🧪',
  adjunct: '🧫',
  water_chemistry: '💧',
  water: '💧',
  MALT: '🌾',
  HOPS: '🌿',
  YEAST: '🧪',
  ADJUNCT: '🧫',
  WATER_CHEMISTRY: '💧',
  RAW_MATERIAL: '📦',
}

// Country flags
const ORIGIN_FLAGS: Record<string, string> = {
  'germany': '🇩🇪',
  'belgium': '🇧🇪',
  'uk': '🇬🇧',
  'usa': '🇺🇸',
  'czech republic': '🇨🇿',
  'finland': '🇫🇮',
  'netherlands': '🇳🇱',
  'france': '🇫🇷',
}

export function AddIngredientModal({
  isOpen,
  onClose,
  onBack,
  onSave,
  onDelete,
  existingItem,
  selectedCatalogItem,
}: AddIngredientModalProps) {
  
  // Determine the source item (catalog or existing)
  const sourceItem = selectedCatalogItem || existingItem
  const isEditing = !!existingItem
  const isFromCatalog = !!selectedCatalogItem && !existingItem
  const isManualEntry = !sourceItem  // No catalog item, no existing item
  
  // Form state - only user-editable fields
  const [formData, setFormData] = useState({
    inventoryAmount: 0,
    costPerUnit: '',
    reorderPoint: '',
    bestBeforeDate: '',
    lotNumber: '',
    notes: '',
    // Manual entry fields
    manualName: '',
    manualCategory: 'malt' as 'malt' | 'hops' | 'yeast' | 'adjunct' | 'water_chemistry',
    manualSupplier: '',
    manualUnit: 'kg',
  })
  
  // Initialize/reset form when modal opens or item changes
  useEffect(() => {
    if (!isOpen) return
    
    if (existingItem) {
      // Editing existing - load current values
      const category = ((existingItem as any).category || '').toLowerCase()
      const mappedCategory = category === 'grain' || category === 'raw_material' ? 'malt' : 
                            category === 'hop' ? 'hops' : category || 'malt'
      setFormData({
        inventoryAmount: existingItem.balance ?? existingItem.onHand ?? 0,
        costPerUnit: existingItem.costPerUnit?.toString() || '',
        reorderPoint: existingItem.reorderPoint?.toString() || '',
        bestBeforeDate: '',
        lotNumber: '',
        notes: '',
        manualName: existingItem.name || '',
        manualCategory: mappedCategory as any,
        manualSupplier: existingItem.supplier || '',
        manualUnit: existingItem.unit || 'kg',
      })
    } else if (selectedCatalogItem) {
      // New item from catalog - start fresh
      const category = ((selectedCatalogItem as any).category || '').toLowerCase()
      const mappedCategory = category === 'malt' ? 'malt' :
                            category === 'hops' ? 'hops' :
                            category === 'yeast' ? 'yeast' :
                            category === 'adjunct' ? 'adjunct' :
                            category === 'water_chemistry' ? 'water_chemistry' : 'malt'
      setFormData({
        inventoryAmount: 0,
        costPerUnit: '',
        reorderPoint: '',
        bestBeforeDate: '',
        lotNumber: '',
        notes: '',
        manualName: '',
        manualCategory: mappedCategory as any,
        manualSupplier: '',
        manualUnit: selectedCatalogItem.unit || 'kg',
      })
    } else {
      // Manual entry mode - reset all
      setFormData({
        inventoryAmount: 0,
        costPerUnit: '',
        reorderPoint: '',
        bestBeforeDate: '',
        lotNumber: '',
        notes: '',
        manualName: '',
        manualCategory: 'malt',
        manualSupplier: '',
        manualUnit: 'kg',
      })
    }
  }, [isOpen, existingItem, selectedCatalogItem])
  
  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      window.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])
  
  if (!isOpen) return null
  
  // Get category icon based on item data
  const getCategoryIcon = (): string => {
    // For manual entry, use the selected category
    if (isManualEntry) {
      return CATEGORY_ICONS[formData.manualCategory] || '📦'
    }
    
    if (!sourceItem) return '📦'
    
    const category = ((sourceItem as any)?.category || '').toLowerCase()
    const name = (sourceItem?.name || '').toLowerCase()
    
    // Check category field first
    if (category === 'malt' || category === 'grain') return '🌾'
    if (category === 'hops' || category === 'hop') return '🌿'
    if (category === 'yeast') return '🧪'
    if (category === 'adjunct') return '🧫'
    if (category === 'water_chemistry' || category === 'water') return '💧'
    
    // Hop varieties by name (check before generic patterns)
    const hopNames = [
      'magnum', 'cascade', 'centennial', 'citra', 'mosaic', 'simcoe', 'amarillo',
      'saaz', 'hallertau', 'hallertauer', 'tettnang', 'spalt', 'perle', 'hersbrucker',
      'premiant', 'sládek', 'mittelfrüh', 'mittelfruh', 'fuggle', 'golding',
      'columbus', 'chinook', 'warrior', 'nugget', 'willamette', 'northern brewer'
    ]
    if (hopNames.some(h => name.includes(h))) return '🌿'
    
    // Yeast strains by name (check before generic patterns)
    const yeastNames = [
      'safale', 'saflager', 'safbrew', 'wlp', 'wyeast', 'fermentis',
      'lallemand', 'lalbrew', 'nottingham', 'windsor',
      'us-05', 'us-04', 's-04', 's-23', 's-33', 'w-34', 'k-97',
      't-58', 'be-256', 'be-134', 'wb-06', 'm-44'
    ]
    if (yeastNames.some(y => name.includes(y))) return '🧪'
    
    // Malt by name
    if (name.includes('malt') || name.includes('pilsner') || name.includes('munich') || 
        name.includes('vienna') || name.includes('wheat') || name.includes('cara') ||
        name.includes('crystal') || name.includes('caramel')) return '🌾'
    
    // Generic fallbacks
    if (name.includes('hop')) return '🌿'
    if (name.includes('yeast')) return '🧪'
    
    // Fallback to category icon mapping
    return CATEGORY_ICONS[category] || CATEGORY_ICONS[(sourceItem as any)?.category] || '📦'
  }
  
  const categoryIcon = getCategoryIcon()
  const sourceItemWithSpecs = sourceItem as (InventoryItem & CatalogItemSpecs) | null
  const originFlag = sourceItemWithSpecs?.origin ? ORIGIN_FLAGS[sourceItemWithSpecs.origin.toLowerCase()] || '' : ''
  
  // Get category from source item or manual entry (for specs display)
  const itemCategory = isManualEntry 
    ? formData.manualCategory 
    : ((sourceItem as any)?.category?.toLowerCase() || 'malt')
  
  // Build specs based on category
  const getSpecs = () => {
    if (!sourceItem) return []
    
    const specs: Array<{ label: string; value: string | number }> = []
    const item = sourceItem as InventoryItem & CatalogItemSpecs
    const cat = itemCategory
    
    if (cat === 'malt') {
      if (item.color != null) specs.push({ label: 'EBC', value: item.color })
      if (item.yield != null) specs.push({ label: 'Yield', value: `${item.yield}%` })
      if (item.maltType) specs.push({ label: 'Type', value: item.maltType.charAt(0).toUpperCase() + item.maltType.slice(1) })
      if (item.potential) specs.push({ label: 'Potential', value: item.potential })
    } else if (cat === 'hops') {
      if (item.alphaAcid != null) specs.push({ label: 'Alpha Acid', value: `${item.alphaAcid}%` })
      if (item.betaAcid != null) specs.push({ label: 'Beta Acid', value: `${item.betaAcid}%` })
      if (item.purpose) specs.push({ label: 'Purpose', value: item.purpose.charAt(0).toUpperCase() + item.purpose.slice(1) })
      if (item.form) specs.push({ label: 'Form', value: item.form.charAt(0).toUpperCase() + item.form.slice(1) })
    } else if (cat === 'yeast') {
      if (item.attenuation) specs.push({ label: 'Attenuation', value: item.attenuation })
      if (item.tempRange) specs.push({ label: 'Temperature', value: item.tempRange })
      if (item.flocculation) specs.push({ label: 'Flocculation', value: item.flocculation.charAt(0).toUpperCase() + item.flocculation.slice(1) })
      if (item.yeastType) specs.push({ label: 'Type', value: item.yeastType.charAt(0).toUpperCase() + item.yeastType.slice(1) })
    } else if (cat === 'adjunct' || cat === 'water_chemistry') {
      if (item.description) specs.push({ label: 'Description', value: item.description })
      if (item.adjunctType) specs.push({ label: 'Type', value: item.adjunctType.replace('_', ' ') })
      if (item.potential) specs.push({ label: 'Potential', value: item.potential })
    }
    
    return specs
  }
  
  const specs = getSpecs()
  const unit = isManualEntry ? formData.manualUnit : (sourceItem?.unit || 'kg')
  
  // Handle save
  const handleSave = () => {
    // Validation
    if (isManualEntry) {
      if (!formData.manualName.trim()) {
        alert('გთხოვთ შეიყვანოთ დასახელება')
        return
      }
      if (!formData.inventoryAmount) {
        alert('გთხოვთ შეიყვანოთ რაოდენობა')
        return
      }
    } else {
      if (!formData.inventoryAmount) return
    }
    
    // Map manual category to API category format
    const mapCategoryToApi = (cat: string): string => {
      const categoryMap: Record<string, string> = {
        'malt': 'MALT',
        'hops': 'HOPS',
        'yeast': 'YEAST',
        'adjunct': 'ADJUNCT',
        'water_chemistry': 'WATER_CHEMISTRY',
      }
      return categoryMap[cat] || 'RAW_MATERIAL'
    }
    
    const data: IngredientFormData = {
      // For manual entry, use form fields; otherwise use source item
      name: isManualEntry ? formData.manualName : (sourceItem?.name || 'New Ingredient'),
      category: isManualEntry ? mapCategoryToApi(formData.manualCategory) : ((sourceItem as any)?.category || 'RAW_MATERIAL'),
      supplier: isManualEntry ? formData.manualSupplier : (sourceItem?.supplier || undefined),
      origin: (sourceItem as any)?.origin,
      color: (sourceItem as any)?.color,
      potential: (sourceItem as any)?.potential,
      yield: (sourceItem as any)?.yield,
      maltCategory: (sourceItem as any)?.maltType,
      alphaAcid: (sourceItem as any)?.alphaAcid,
      attenuation: (sourceItem as any)?.attenuation,
      tempRange: (sourceItem as any)?.tempRange,
      inventoryAmount: formData.inventoryAmount,
      costPerUnit: formData.costPerUnit ? parseFloat(formData.costPerUnit) : undefined,
      reorderPoint: formData.reorderPoint ? parseFloat(formData.reorderPoint) : undefined,
      bestBeforeDate: formData.bestBeforeDate || undefined,
      lotNumber: formData.lotNumber || undefined,
      unit: isManualEntry ? formData.manualUnit : unit,
      notes: formData.notes || undefined,
    }
    
    onSave(data)
  }
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {onBack && (
                <button
                  onClick={onBack}
                  className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
                >
                  <span>←</span>
                  <span className="text-sm">უკან</span>
                </button>
              )}
              {onBack && <span className="text-slate-600">|</span>}
              <h2 className="text-lg font-semibold">
                {isEditing ? 'რედაქტირება' : 'ინგრედიენტის დამატება'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <span className="text-xl">✕</span>
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          
          {/* Manual Entry Mode - Show editable fields */}
          {isManualEntry && (
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 space-y-4">
              <h3 className="text-sm font-medium text-slate-400">ახალი ინგრედიენტი</h3>
              
              {/* Name */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  დასახელება <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.manualName}
                  onChange={(e) => setFormData(prev => ({ ...prev, manualName: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:border-copper focus:outline-none"
                  placeholder="მაგ: Pilsner Malt"
                  autoFocus
                />
              </div>
              
              {/* Category and Unit - 2 columns */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    კატეგორია <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={formData.manualCategory}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      manualCategory: e.target.value as typeof formData.manualCategory 
                    }))}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:border-copper focus:outline-none"
                  >
                    <option value="malt">🌾 მარცვლეული</option>
                    <option value="hops">🌿 სვია</option>
                    <option value="yeast">🧪 საფუარი</option>
                    <option value="adjunct">🧫 დანამატები</option>
                    <option value="water_chemistry">💧 წყლის ქიმია</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    ერთეული
                  </label>
                  <select
                    value={formData.manualUnit}
                    onChange={(e) => setFormData(prev => ({ ...prev, manualUnit: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:border-copper focus:outline-none"
                  >
                    <option value="kg">კგ (kg)</option>
                    <option value="g">გრამი (g)</option>
                    <option value="L">ლიტრი (L)</option>
                    <option value="ml">მილილიტრი (ml)</option>
                    <option value="pcs">ცალი (pcs)</option>
                  </select>
                </div>
              </div>
              
              {/* Supplier */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  მომწოდებელი
                </label>
                <input
                  type="text"
                  value={formData.manualSupplier}
                  onChange={(e) => setFormData(prev => ({ ...prev, manualSupplier: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:border-copper focus:outline-none"
                  placeholder="მაგ: Weyermann"
                />
              </div>
            </div>
          )}
          
          {/* Ingredient Info Card (from catalog - read only) */}
          {sourceItem && (
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              {/* Name and Supplier */}
              <div className="flex items-start gap-3 mb-4">
                <span className="text-3xl">{categoryIcon}</span>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white">{sourceItem.name}</h3>
                  <div className="flex items-center gap-2 mt-1 text-sm text-slate-400">
                    {sourceItem.supplier && (
                      <span className="text-copper">{sourceItem.supplier}</span>
                    )}
                    {sourceItemWithSpecs?.origin && (
                      <>
                        <span>•</span>
                        <span>{originFlag} {sourceItemWithSpecs.origin}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Specs Grid */}
              {specs.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {specs.map((spec, i) => (
                    <div key={i} className="bg-slate-900/50 rounded-lg p-3 text-center">
                      <div className="text-xs text-slate-500 mb-1">{spec.label}</div>
                      <div className="text-sm font-medium text-slate-200">{spec.value}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Quantity Input - Prominent */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              რაოდენობა <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                value={formData.inventoryAmount || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  inventoryAmount: parseFloat(e.target.value) || 0 
                }))}
                className="w-full px-4 py-4 text-2xl font-semibold text-center bg-slate-800 border-2 border-slate-600 rounded-xl text-white focus:border-copper focus:outline-none transition-colors"
                placeholder="0"
                min="0"
                step="0.01"
                autoFocus={!isManualEntry}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                {isManualEntry ? formData.manualUnit : unit}
              </span>
            </div>
          </div>
          
          {/* Price and Reorder Point - 2 columns */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">
                ფასი (₾/{isManualEntry ? formData.manualUnit : unit})
              </label>
              <input
                type="number"
                value={formData.costPerUnit}
                onChange={(e) => setFormData(prev => ({ ...prev, costPerUnit: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:border-copper focus:outline-none"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">
                მინ. მარაგი ({isManualEntry ? formData.manualUnit : unit})
              </label>
              <input
                type="number"
                value={formData.reorderPoint}
                onChange={(e) => setFormData(prev => ({ ...prev, reorderPoint: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:border-copper focus:outline-none"
                placeholder="0"
                min="0"
                step="0.01"
              />
            </div>
          </div>
          
          {/* Expiry Date and Lot Number - 2 columns */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">
                ვადა
              </label>
              <input
                type="date"
                value={formData.bestBeforeDate}
                onChange={(e) => setFormData(prev => ({ ...prev, bestBeforeDate: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:border-copper focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">
                ლოტის ნომერი
              </label>
              <input
                type="text"
                value={formData.lotNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, lotNumber: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:border-copper focus:outline-none"
                placeholder="LOT-2025-001"
              />
            </div>
          </div>
          
          {/* Notes */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              შენიშვნა
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:border-copper focus:outline-none resize-none"
              rows={2}
              placeholder="დამატებითი ინფორმაცია..."
            />
          </div>
        </div>
        
        {/* Footer - Delete on left, Cancel/Save on right */}
        <div className="p-4 border-t border-slate-700 flex items-center justify-between">
          {/* Delete Button - Left Side (only when editing) */}
          {existingItem && onDelete ? (
            <button
              onClick={onDelete}
              className="px-4 py-2 bg-red-600/10 hover:bg-red-600 border border-red-600/50 text-red-400 hover:text-white rounded-lg transition-colors flex items-center gap-2"
            >
              🗑️ წაშლა
            </button>
          ) : (
            <div></div>
          )}
          
          {/* Cancel & Save - Right Side */}
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={onClose}>
              გაუქმება
            </Button>
            <button
              onClick={handleSave}
              disabled={isManualEntry ? (!formData.manualName.trim() || !formData.inventoryAmount) : !formData.inventoryAmount}
              className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                (isManualEntry ? (formData.manualName.trim() && formData.inventoryAmount) : formData.inventoryAmount)
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              💾 შენახვა
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

