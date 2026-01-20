'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui'
import { InventoryItem } from '@/lib/api-client'
import { formatCurrency } from '@/lib/utils'

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

interface Supplier {
  id: string
  name: string
  category: string | null
}

interface AddIngredientModalProps {
  isOpen: boolean
  onClose: () => void
  onBack?: () => void
  onSave: (data: IngredientFormData) => void
  onDelete?: () => void
  existingItem?: InventoryItem | null
  selectedCatalogItem?: (InventoryItem & CatalogItemSpecs) | null
  suppliers?: Supplier[]
  onSupplierCreated?: () => void
  preselectedCategory?: 'MALT' | 'HOPS' | 'YEAST' | 'ADJUNCT' | 'WATER_CHEMISTRY' | null
}

export interface IngredientFormData {
  name: string
  category: string
  ingredientType?: string
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
  // Expense-related fields (for new items)
  supplierId?: string
  invoiceNumber?: string
  createExpense?: boolean
  isPaid?: boolean
  paymentMethod?: string
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

const paymentMethods = [
  { value: 'BANK_TRANSFER', label: '🏦 გადარიცხვა' },
  { value: 'CASH', label: '💵 ნაღდი' },
  { value: 'CARD', label: '💳 ბარათი' },
  { value: 'CHECK', label: '📝 ჩეკი' },
]

export function AddIngredientModal({
  isOpen,
  onClose,
  onBack,
  onSave,
  onDelete,
  existingItem,
  selectedCatalogItem,
  suppliers = [],
  onSupplierCreated,
  preselectedCategory,
}: AddIngredientModalProps) {
  
  // Determine the source item (catalog or existing)
  const sourceItem = selectedCatalogItem || existingItem
  const isEditing = !!existingItem
  const isFromCatalog = !!selectedCatalogItem && !existingItem
  const isManualEntry = !sourceItem
  const isNewItem = !isEditing // New item (either from catalog or manual entry)
  
  // Form state
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
    // Expense fields (for new items)
    supplierId: '',
    invoiceNumber: '',
    createExpense: true,
    isPaid: false,
    paymentMethod: 'BANK_TRANSFER',
  })
  
  const [showNewSupplierInput, setShowNewSupplierInput] = useState(false)
  const [newSupplierName, setNewSupplierName] = useState('')
  
  // Initialize/reset form when modal opens or item changes
  useEffect(() => {
    if (!isOpen) return
    
    if (existingItem) {
      // Editing existing - load current values (no expense options)
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
        // No expense options when editing
        supplierId: '',
        invoiceNumber: '',
        createExpense: false,
        isPaid: false,
        paymentMethod: 'BANK_TRANSFER',
      })
    } else if (selectedCatalogItem) {
      // New item from catalog - show expense options
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
        // Expense options enabled by default for new items
        supplierId: '',
        invoiceNumber: '',
        createExpense: true,
        isPaid: false,
        paymentMethod: 'BANK_TRANSFER',
      })
    } else {
      // Manual entry mode - reset all with expense options
      // Map preselected category to form category
      const mapPreselectedToFormCategory = (cat: string | null | undefined): 'malt' | 'hops' | 'yeast' | 'adjunct' | 'water_chemistry' => {
        if (!cat) return 'malt'
        const mapping: Record<string, 'malt' | 'hops' | 'yeast' | 'adjunct' | 'water_chemistry'> = {
          'MALT': 'malt',
          'HOPS': 'hops',
          'YEAST': 'yeast',
          'ADJUNCT': 'adjunct',
          'WATER_CHEMISTRY': 'water_chemistry',
        }
        return mapping[cat] || 'malt'
      }
      
      setFormData({
        inventoryAmount: 0,
        costPerUnit: '',
        reorderPoint: '',
        bestBeforeDate: '',
        lotNumber: '',
        notes: '',
        manualName: '',
        manualCategory: mapPreselectedToFormCategory(preselectedCategory),
        manualSupplier: '',
        manualUnit: 'kg',
        // Expense options enabled by default for new items
        supplierId: '',
        invoiceNumber: '',
        createExpense: true,
        isPaid: false,
        paymentMethod: 'BANK_TRANSFER',
      })
    }
    
    setShowNewSupplierInput(false)
    setNewSupplierName('')
  }, [isOpen, existingItem, selectedCatalogItem, preselectedCategory])
  
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
    if (isManualEntry) {
      return CATEGORY_ICONS[formData.manualCategory] || '📦'
    }
    
    if (!sourceItem) return '📦'
    
    const category = ((sourceItem as any)?.category || '').toLowerCase()
    const name = (sourceItem?.name || '').toLowerCase()
    
    if (category === 'malt' || category === 'grain') return '🌾'
    if (category === 'hops' || category === 'hop') return '🌿'
    if (category === 'yeast') return '🧪'
    if (category === 'adjunct') return '🧫'
    if (category === 'water_chemistry' || category === 'water') return '💧'
    
    const hopNames = [
      'magnum', 'cascade', 'centennial', 'citra', 'mosaic', 'simcoe', 'amarillo',
      'saaz', 'hallertau', 'hallertauer', 'tettnang', 'spalt', 'perle', 'hersbrucker',
      'premiant', 'sládek', 'mittelfrüh', 'mittelfruh', 'fuggle', 'golding',
      'columbus', 'chinook', 'warrior', 'nugget', 'willamette', 'northern brewer'
    ]
    if (hopNames.some(h => name.includes(h))) return '🌿'
    
    const yeastNames = [
      'safale', 'saflager', 'safbrew', 'wlp', 'wyeast', 'fermentis',
      'lallemand', 'lalbrew', 'nottingham', 'windsor',
      'us-05', 'us-04', 's-04', 's-23', 's-33', 'w-34', 'k-97',
      't-58', 'be-256', 'be-134', 'wb-06', 'm-44'
    ]
    if (yeastNames.some(y => name.includes(y))) return '🧪'
    
    if (name.includes('malt') || name.includes('pilsner') || name.includes('munich') || 
        name.includes('vienna') || name.includes('wheat') || name.includes('cara') ||
        name.includes('crystal') || name.includes('caramel')) return '🌾'
    
    if (name.includes('hop')) return '🌿'
    if (name.includes('yeast')) return '🧪'
    
    return CATEGORY_ICONS[category] || CATEGORY_ICONS[(sourceItem as any)?.category] || '📦'
  }
  
  const categoryIcon = getCategoryIcon()
  const sourceItemWithSpecs = sourceItem as (InventoryItem & CatalogItemSpecs) | null
  const originFlag = sourceItemWithSpecs?.origin ? ORIGIN_FLAGS[sourceItemWithSpecs.origin.toLowerCase()] || '' : ''
  
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
  
  // Calculate total amount for expense
  const totalAmount = formData.inventoryAmount * (parseFloat(formData.costPerUnit) || 0)
  
  // Handle create new supplier
  const handleCreateSupplier = async () => {
    if (!newSupplierName.trim()) return
    
    try {
      const response = await fetch('/api/finances/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSupplierName.trim(),
          category: 'ingredients',
        }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create supplier')
      }
      
      const data = await response.json()
      
      setFormData(prev => ({ ...prev, supplierId: data.supplier.id }))
      setShowNewSupplierInput(false)
      setNewSupplierName('')
      
      if (onSupplierCreated) {
        onSupplierCreated()
      }
      
      alert('✅ მომწოდებელი დაემატა!')
      
    } catch (err: any) {
      console.error('Create supplier error:', err)
      alert(err.message || 'მომწოდებლის დამატება ვერ მოხერხდა')
    }
  }
  
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
    
    // Validate expense fields if expense is enabled
    if (isNewItem && formData.createExpense && (!formData.costPerUnit || parseFloat(formData.costPerUnit) <= 0)) {
      alert('ხარჯის დასაფიქსირებლად საჭიროა ფასის მითითება')
      return
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
    
    // Map form category to API ingredientType
    const mapCategoryToIngredientType = (cat: string): string => {
      const mapping: Record<string, string> = {
        'malt': 'MALT',
        'hops': 'HOPS', 
        'yeast': 'YEAST',
        'adjunct': 'ADJUNCT',
        'water_chemistry': 'WATER_CHEMISTRY',
      }
      return mapping[cat] || 'ADJUNCT'
    }
    
    const data: IngredientFormData = {
      name: isManualEntry ? formData.manualName : (sourceItem?.name || 'New Ingredient'),
      category: isManualEntry ? mapCategoryToApi(formData.manualCategory) : ((sourceItem as any)?.category || 'RAW_MATERIAL'),
      ingredientType: isManualEntry ? mapCategoryToIngredientType(formData.manualCategory) : ((sourceItem as any)?.ingredientType || undefined),
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
      // Expense fields (only for new items)
      ...(isNewItem && {
        supplierId: formData.supplierId || undefined,
        invoiceNumber: formData.invoiceNumber || undefined,
        createExpense: formData.createExpense,
        isPaid: formData.isPaid,
        paymentMethod: formData.isPaid ? formData.paymentMethod : undefined,
      }),
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
                    კატეგორია {!preselectedCategory && <span className="text-red-400">*</span>}
                  </label>
                  {preselectedCategory ? (
                    // Read-only display when preselected
                    <div className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white flex items-center gap-2">
                      <span>{CATEGORY_ICONS[formData.manualCategory] || '📦'}</span>
                      <span>
                        {formData.manualCategory === 'malt' && 'მარცვლეული'}
                        {formData.manualCategory === 'hops' && 'სვია'}
                        {formData.manualCategory === 'yeast' && 'საფუარი'}
                        {formData.manualCategory === 'adjunct' && 'დანამატები'}
                        {formData.manualCategory === 'water_chemistry' && 'წყლის ქიმია'}
                      </span>
                    </div>
                  ) : (
                    // Editable dropdown when not preselected
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
                  )}
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
                ფასი (₾/{isManualEntry ? formData.manualUnit : unit}) {isNewItem && formData.createExpense && <span className="text-red-400">*</span>}
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
          
          {/* Expense Options - Only for new items */}
          {isNewItem && (
            <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="createExpense"
                  checked={formData.createExpense}
                  onChange={(e) => setFormData(prev => ({ ...prev, createExpense: e.target.checked }))}
                  className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-copper focus:ring-copper"
                />
                <label htmlFor="createExpense" className="text-sm font-medium text-white cursor-pointer">
                  📊 ხარჯად დაფიქსირება
                </label>
              </div>

              {formData.createExpense && (
                <>
                  {/* Supplier Selection */}
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">
                      მომწოდებელი
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={formData.supplierId}
                        onChange={(e) => setFormData(prev => ({ ...prev, supplierId: e.target.value }))}
                        className="flex-1 px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:border-copper focus:outline-none"
                      >
                        <option value="">-- აირჩიეთ მომწოდებელი --</option>
                        {suppliers.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowNewSupplierInput(true)}
                        className="px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white hover:bg-slate-700 transition-colors"
                        title="ახალი მომწოდებელი"
                      >
                        ➕
                      </button>
                    </div>
                    
                    {/* New Supplier Input */}
                    {showNewSupplierInput && (
                      <div className="mt-3 p-3 bg-slate-900/50 rounded-lg border border-slate-600">
                        <label className="block text-sm font-medium text-slate-400 mb-2">
                          ახალი მომწოდებლის სახელი
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newSupplierName}
                            onChange={(e) => setNewSupplierName(e.target.value)}
                            placeholder="მაგ: BestMalz, Barth-Haas"
                            className="flex-1 px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:border-copper focus:outline-none"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && newSupplierName.trim()) {
                                handleCreateSupplier()
                              }
                            }}
                          />
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleCreateSupplier}
                            disabled={!newSupplierName.trim()}
                          >
                            შენახვა
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setShowNewSupplierInput(false)
                              setNewSupplierName('')
                            }}
                          >
                            ✕
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Invoice Number */}
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">
                      ინვოისის ნომერი
                    </label>
                    <input
                      type="text"
                      value={formData.invoiceNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                      placeholder="მაგ: INV-2024-001"
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:border-copper focus:outline-none"
                    />
                  </div>

                  {/* Is Paid */}
                  <div className="flex items-center gap-3 ml-6">
                    <input
                      type="checkbox"
                      id="isPaid"
                      checked={formData.isPaid}
                      onChange={(e) => setFormData(prev => ({ ...prev, isPaid: e.target.checked }))}
                      className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-copper focus:ring-copper"
                    />
                    <label htmlFor="isPaid" className="text-sm font-medium text-white cursor-pointer">
                      ✅ გადახდილია
                    </label>
                  </div>

                  {/* Payment Method */}
                  {formData.isPaid && (
                    <div className="ml-6">
                      <label className="block text-sm text-slate-400 mb-2">
                        გადახდის მეთოდი
                      </label>
                      <select
                        value={formData.paymentMethod}
                        onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:border-copper focus:outline-none"
                      >
                        {paymentMethods.map(m => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          
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
          
          {/* Summary - Only for new items with expense */}
          {isNewItem && formData.createExpense && totalAmount > 0 && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400">ჯამი:</span>
                <span className="text-2xl font-bold text-amber-400">
                  ₾{totalAmount.toFixed(2)}
                </span>
              </div>
              <div className="text-sm text-slate-400 space-y-1">
                <div>📦 {isManualEntry ? formData.manualName || 'ახალი ინგრედიენტი' : sourceItem?.name}: +{formData.inventoryAmount} {unit}</div>
                <div className="text-red-400">💸 ხარჯი: ₾{totalAmount.toFixed(2)}</div>
              </div>
            </div>
          )}
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