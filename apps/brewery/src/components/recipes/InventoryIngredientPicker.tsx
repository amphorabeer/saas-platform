'use client'

import { useState, useEffect, useMemo } from 'react'

interface InventoryItem {
  id: string
  sku: string
  name: string
  category: string
  unit: string
  supplier?: string
  cachedBalance?: number
  specs?: any
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onSelect: (item: InventoryItem) => void
  category?: 'MALT' | 'HOPS' | 'YEAST' | 'ADJUNCT' | 'WATER_CHEMISTRY'
}

const CATEGORY_CONFIG = {
  MALT: { icon: '🌾', label: 'მარცვლეული', filter: ['malt', 'grain'] },
  HOPS: { icon: '🌿', label: 'სვია', filter: ['hop'] },
  YEAST: { icon: '🧪', label: 'საფუარი', filter: ['yeast'] },
  ADJUNCT: { icon: '⚗️', label: 'დანამატები', filter: ['chem', 'adjunct'] },
  WATER_CHEMISTRY: { icon: '💧', label: 'წყლის ქიმია', filter: ['chem', 'water'] },
}

// Helper function to get category from item
const getItemCategory = (item: InventoryItem): string => {
  const sku = (item.sku || '').toUpperCase()
  const name = (item.name || '').toLowerCase()
  const category = (item.category || '').toLowerCase()

  // Check SKU prefix
  if (sku.startsWith('MALT-') || sku.startsWith('MALT_')) return 'malt'
  if (sku.startsWith('HOP-') || sku.startsWith('HOP_')) return 'hop'
  if (sku.startsWith('YEAST-') || sku.startsWith('YEAST_')) return 'yeast'
  if (sku.startsWith('CHEM-') || sku.startsWith('CHEM_')) return 'adjunct'
  
  // Check category field
  if (category === 'raw_material') {
    // For RAW_MATERIAL, check name to determine subcategory
    // IMPORTANT: Check hops FIRST to avoid false positives
    const hopIndicators = [
      'hop', 'citra', 'cascade', 'centennial', 'simcoe', 'mosaic', 'amarillo',
      'hallertau', 'hallertauer', 'saaz', 'fuggle', 'golding', 'tettnang', 
      'spalt', 'perle', 'hersbrucker', 'magnum', 'northern brewer', 'chinook',
      'columbus', 'warrior', 'galaxy', 'nelson', 'motueka', 'rakau', 
      'mittelfrüh', 'mittelfrueh', 'mittelfruh', 'premiant', 'sládek',
      'challenger', 'northdown', 'target', 'nugget', 'willamette'
    ]
    if (hopIndicators.some(h => name.includes(h))) return 'hop'
    
    const yeastIndicators = [
      'yeast', 'safale', 'saflager', 'safbrew', 'fermentis', 'wyeast', 
      'white labs', 'lallemand', 'lalbrew', 'nottingham', 'windsor',
      'us-05', 'us-04', 's-04', 's-23', 's-33', 'w-34', 'k-97',
      't-58', 'be-256', 'be-134', 'wb-06', 'm-44', 'wlp'
    ]
    if (yeastIndicators.some(y => name.includes(y))) return 'yeast'
    
    // Only return 'malt' if it explicitly matches malt patterns
    const maltIndicators = [
      'malt', 'pilsner', 'pilsen', 'munich', 'vienna', 'wheat', 'rye', 'oat',
      'barley', 'crystal', 'caramel', 'cara', 'roasted', 'chocolate', 'black',
      'pale ale', 'pale', 'biscuit', 'aromatic', 'melanoidin', 'honey malt',
      'victory', 'special b', 'abbey', 'smoked', 'rauch', 'peated'
    ]
    if (maltIndicators.some(m => name.includes(m))) return 'malt'
    
    // Don't default to malt - return 'other' if no match
    return 'other'
  }
  
  if (category === 'hops' || category === 'hop') return 'hop'
  if (category === 'yeast') return 'yeast'
  if (category === 'adjunct') return 'adjunct'
  if (category === 'water_chemistry') return 'water_chemistry'
  
  // For ING- prefix or unknown, detect by name
  if (sku.startsWith('ING-') || sku.startsWith('ING_')) {
    const hopNames = [
      'citra', 'cascade', 'centennial', 'mosaic', 'simcoe', 'amarillo', 
      'hallertau', 'hallertauer', 'saaz', 'fuggle', 'golding', 'magnum', 
      'northern brewer', 'chinook', 'columbus', 'tomahawk', 'warrior', 
      'nugget', 'willamette', 'tettnang', 'mittelfrüh', 'mittelfrueh', 
      'hersbrucker', 'spalt', 'perle', 'galaxy', 'nelson', 'motueka', 
      'rakau', 'hop'
    ]
    if (hopNames.some(h => name.includes(h))) return 'hop'
    
    const yeastNames = [
      'yeast', 'safale', 'saflager', 'safbrew', 'fermentis', 'us-05', 's-04', 
      's-23', 's-33', 'w-34', 'k-97', 't-58', 'be-256', 'be-134', 'wb-06', 
      'wlp', 'wyeast', 'white labs', 'lallemand', 'lalbrew', 'nottingham', 
      'windsor', 'm-44'
    ]
    if (yeastNames.some(y => name.includes(y))) return 'yeast'
    
    const maltNames = [
      'malt', 'pilsner', 'pilsen', 'munich', 'vienna', 'wheat', 'rye', 'oat',
      'barley', 'crystal', 'caramel', 'cara', 'roasted', 'chocolate', 'black',
      'pale ale', 'pale', 'biscuit', 'aromatic', 'melanoidin', 'honey malt',
      'victory', 'special b', 'abbey', 'smoked', 'rauch', 'peated'
    ]
    if (maltNames.some(m => name.includes(m))) return 'malt'
    
    // Water chemistry detection (BEFORE adjuncts to avoid false positives)
    const waterChemNames = [
      'gypsum', 'caso4', 'cacl', 'calcium chloride', 'calcium sulfate',
      'lactic acid', 'phosphoric acid', 'campden', 'sodium', 'magnesium',
      'bicarbonate', 'chalk', 'epson', 'epsom', 'salt', 'chloride', 'sulfate'
    ]
    if (waterChemNames.some(c => name.includes(c))) {
      // Check if it's water chemistry based on context
      if (name.includes('gypsum') || name.includes('calcium') || 
          name.includes('chloride') || name.includes('sulfate') ||
          name.includes('acid') || name.includes('campden') ||
          name.includes('sodium') || name.includes('magnesium') ||
          name.includes('bicarbonate') || name.includes('chalk')) {
        return 'water_chemistry'
      }
    }
    
    // Adjuncts (sugars, spices, fruits, finings, oak - NOT water chemistry)
    const adjunctNames = [
      'sugar', 'honey', 'molasses', 'syrup', 'lactose', 'dextrose', 'candi',
      'spice', 'coriander', 'orange peel', 'ginger', 'cinnamon', 'vanilla',
      'fruit', 'cherry', 'raspberry', 'peach', 'apricot',
      'fining', 'irish moss', 'whirlfloc', 'gelatin', 'isinglass', 'biofine',
      'oak', 'chip', 'cube', 'nutrient' // nutrient can be adjunct (yeast nutrient) or water chem
    ]
    if (adjunctNames.some(c => name.includes(c))) return 'adjunct'
  }
  
  // Fallback: check name patterns (comprehensive)
  const hopIndicators = [
    'hop', 'citra', 'cascade', 'centennial', 'mosaic', 'simcoe', 'amarillo',
    'hallertau', 'hallertauer', 'saaz', 'fuggle', 'golding', 'magnum', 
    'hersbrucker', 'tettnang', 'spalt', 'perle', 'northern brewer', 
    'chinook', 'columbus', 'warrior', 'galaxy', 'nelson', 'mittelfrüh', 
    'mittelfrueh'
  ]
  if (hopIndicators.some(h => name.includes(h))) return 'hop'
  
  const yeastIndicators = [
    'yeast', 'safale', 'saflager', 'safbrew', 'fermentis', 'us-05', 's-04', 
    'wlp', 'wyeast', 'lallemand', 'lalbrew', 'nottingham'
  ]
  if (yeastIndicators.some(y => name.includes(y))) return 'yeast'
  
  const maltIndicators = [
    'malt', 'pilsner', 'pilsen', 'munich', 'vienna', 'wheat', 'rye', 'oat',
    'barley', 'crystal', 'caramel', 'cara', 'roasted', 'chocolate', 'black',
    'pale ale', 'pale', 'biscuit', 'aromatic', 'smoked'
  ]
  if (maltIndicators.some(m => name.includes(m))) return 'malt'
  
  return 'other'
}

// Helper function to get icon from category (fallback for legacy code)
const getIconFromCategory = (category: string): string => {
  const cat = category.toLowerCase()
  if (cat === 'malt' || cat.includes('grain')) return '🌾'
  if (cat === 'hop' || cat.includes('hop')) return '🌿'
  if (cat === 'yeast') return '🧪'
  // IMPORTANT: Check water_chemistry BEFORE adjunct to show correct icon
  if (cat === 'water_chemistry' || (cat.includes('chem') && (cat.includes('water') || cat.includes('gypsum') || cat.includes('calcium')))) return '💧'
  if (cat === 'adjunct') return '⚗️'
  return '📦'
}

// Helper function to get icon directly from item (more reliable)
const getIngredientIcon = (item: any): string => {
  const nameLower = (item.name || '').toLowerCase()
  const skuLower = ((item.sku || '') || '').toLowerCase()
  
  // WATER CHEMISTRY - Check FIRST (before adjuncts!)
  const waterChemPatterns = [
    'gypsum', 'caso4', 'calcium chloride', 'cacl', 
    'lactic acid', 'phosphoric acid', 'campden', 'sulfate',
    'calcium sulfate', 'sodium', 'magnesium', 'bicarbonate', 'chalk'
  ]
  if (item.ingredientType === 'WATER_CHEMISTRY') return '💧'
  if (waterChemPatterns.some(p => nameLower.includes(p))) return '💧'
  if (skuLower.includes('chem')) return '💧'
  
  // MALT
  const maltPatterns = ['malt', 'pilsner', 'munich', 'crystal', 'caramel', 'wheat', 'barley', 'vienna', 'roasted', 'pale ale']
  if (item.ingredientType === 'MALT') return '🌾'
  if (maltPatterns.some(p => nameLower.includes(p))) return '🌾'
  if (skuLower.includes('malt') || skuLower.includes('grain')) return '🌾'
  
  // HOPS
  const hopPatterns = ['hop', 'citra', 'cascade', 'simcoe', 'saaz', 'hallertau', 'magnum', 'hersbrucker', 'tettnang', 'premiant', 'mosaic', 'amarillo']
  if (item.ingredientType === 'HOPS') return '🌿'
  if (hopPatterns.some(p => nameLower.includes(p))) return '🌿'
  if (skuLower.includes('hop')) return '🌿'
  
  // YEAST
  const yeastPatterns = ['yeast', 'safale', 'saflager', 'fermentis', 'wyeast', 'us-05', 's-04', 'w-34', 'wlp', 'lallemand']
  if (item.ingredientType === 'YEAST') return '🧪'
  if (yeastPatterns.some(p => nameLower.includes(p))) return '🧪'
  if (skuLower.includes('yeast')) return '🧪'
  
  // ADJUNCTS (last!)
  const adjunctPatterns = [
    'irish moss', 'whirlfloc', 'gelatin', 'fining', 'isinglass', 'biofine',
    'sugar', 'dextrose', 'honey', 'molasses', 'lactose', 'syrup', 'candi',
    'coriander', 'orange peel', 'spice', 'vanilla', 'cocoa', 'coffee', 'chocolate',
    'oak', 'chip', 'cube', 'stave'
  ]
  if (item.ingredientType === 'ADJUNCT') return '⚗️'
  if (adjunctPatterns.some(p => nameLower.includes(p))) return '⚗️'
  
  // Fallback: use category-based detection
  const itemCategory = getItemCategory(item)
  return getIconFromCategory(itemCategory)
}

// Map category to UI filter
const categoryToFilter = (category?: string): string[] => {
  if (!category) return []
  const config = CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG]
  return config?.filter || []
}

export default function InventoryIngredientPicker({ isOpen, onClose, onSelect, category }: Props) {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(category || null)

  // Fetch inventory items
  useEffect(() => {
    if (!isOpen) return
    
    const fetchItems = async () => {
      setIsLoading(true)
      try {
        // Use selectedCategory or category prop to filter at API level
        const categoryToFilter = selectedCategory || category
        const url = categoryToFilter 
          ? `/api/inventory?category=${categoryToFilter}`
          : '/api/inventory'
        
        const response = await fetch(url)
        if (response.ok) {
          const data = await response.json()
          
          // Filter only RAW_MATERIAL (ingredients) - API should already filter by ingredientType if category provided
          const ingredients = (data.items || data).filter(
            (item: any) => item.category === 'RAW_MATERIAL'
          )
          
          // Map API response fields to component fields
          // API returns both 'balance' and 'cachedBalance', ensure we use cachedBalance
          const mappedIngredients = ingredients.map((item: any) => {
            // Handle both 'balance' (from API response) and 'cachedBalance' (direct from DB)
            const balance = item.cachedBalance ?? item.balance ?? 0
            return {
              ...item,
              cachedBalance: Number(balance),
            }
          })
          
          if (process.env.NODE_ENV === 'development') {
            console.log('[InventoryIngredientPicker] Loaded', mappedIngredients.length, 'ingredients for category:', categoryToFilter || 'ALL')
            if (mappedIngredients.length > 0) {
              console.log('[InventoryIngredientPicker] Sample item:', {
                name: mappedIngredients[0]?.name,
                ingredientType: mappedIngredients[0]?.ingredientType,
                category: mappedIngredients[0]?.category,
                cachedBalance: mappedIngredients[0]?.cachedBalance,
                unit: mappedIngredients[0]?.unit,
              })
            }
          }
          
          setItems(mappedIngredients)
        }
      } catch (err) {
        console.error('Fetch inventory error:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchItems()
  }, [isOpen, selectedCategory, category])

  // Filter items
  const filteredItems = useMemo(() => {
    // If no category selected (ყველა), return ALL items without filtering
    if (!selectedCategory || selectedCategory === 'ALL') {
      // Only apply search filter if provided
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return items.filter(item =>
          item.name.toLowerCase().includes(query) ||
          item.sku?.toLowerCase().includes(query) ||
          item.supplier?.toLowerCase().includes(query)
        )
      }
      return items
    }
    
    // Start with API-filtered items
    let result = items
    
    // Additional client-side filtering to ensure proper category separation
    // This is important when items don't have ingredientType set correctly
    if (selectedCategory === 'ADJUNCT') {
      const nameLower = (item: any) => (item.name || '').toLowerCase()
      const skuLower = (item: any) => ((item.sku || '').toLowerCase())
      
      // Water chemistry patterns to EXCLUDE from ADJUNCT
      const waterChemExclusionPatterns = [
        'gypsum', 'caso4', 'cacl', 'calcium', 'chloride', 'sulfate',
        'acid', 'lactic', 'phosphoric', 'campden', 'sodium', 'salt',
        'magnesium', 'bicarbonate', 'chalk', 'epson', 'epsom',
        'calcium sulfate', 'calcium chloride', 'sodium chloride', 'water'
      ]
      
      result = result.filter(item => {
        const name = nameLower(item)
        const sku = skuLower(item)
        
        // If ingredientType is explicitly WATER_CHEMISTRY, exclude
        if ((item as any).ingredientType === 'WATER_CHEMISTRY') return false
        
        // Exclude if matches water chemistry patterns
        if (waterChemExclusionPatterns.some(p => name.includes(p) || sku.includes('chem') || sku.includes('water'))) {
          return false
        }
        
        // Include if ingredientType is ADJUNCT or matches adjunct patterns
        if ((item as any).ingredientType === 'ADJUNCT') return true
        
        // Adjunct patterns (sugars, spices, fruits, finings, oak)
        const adjunctPatterns = [
          'sugar', 'honey', 'molasses', 'syrup', 'lactose', 'dextrose',
          'candi', 'invert', 'spice', 'coriander', 'orange peel', 'ginger',
          'cinnamon', 'vanilla', 'nutmeg', 'cocoa', 'coffee', 'chocolate',
          'fruit', 'cherry', 'raspberry', 'peach', 'apricot', 'plum', 'berry',
          'fining', 'irish moss', 'whirlfloc', 'gelatin', 'isinglass', 'biofine',
          'oak', 'chip', 'cube', 'stave'
        ]
        
        return adjunctPatterns.some(p => name.includes(p)) || sku.includes('adj') || sku.includes('adjunct')
      })
    } else if (selectedCategory === 'WATER_CHEMISTRY') {
      const nameLower = (item: any) => (item.name || '').toLowerCase()
      const skuLower = (item: any) => ((item.sku || '').toLowerCase())
      
      const waterChemPatterns = [
        'gypsum', 'caso4', 'calcium', 'chloride', 'cacl', 'sulfate',
        'acid', 'lactic', 'phosphoric', 'campden', 'sodium', 'salt',
        'magnesium', 'bicarbonate', 'chalk', 'epson', 'epsom',
        'calcium sulfate', 'calcium chloride', 'sodium chloride', 'water'
      ]
      
      result = result.filter(item => {
        const name = nameLower(item)
        const sku = skuLower(item)
        
        // Include if ingredientType is WATER_CHEMISTRY
        if ((item as any).ingredientType === 'WATER_CHEMISTRY') return true
        
        // Include if matches water chemistry patterns
        return waterChemPatterns.some(p => name.includes(p)) || sku.includes('chem') || sku.includes('water')
      })
    }
    
    // Search filtering (applies to all categories)
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.sku?.toLowerCase().includes(query) ||
        item.supplier?.toLowerCase().includes(query)
      )
    }
    
    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log('[InventoryIngredientPicker] Filter Debug:', {
        selectedCategory,
        itemsCount: items.length,
        filteredCount: result.length,
        searchQuery,
        sampleItem: items[0] ? {
          name: items[0].name,
          ingredientType: (items[0] as any).ingredientType,
          category: items[0].category,
        } : null,
      })
    }
    
    return result
  }, [items, selectedCategory, searchQuery])

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">📦 აირჩიეთ ინგრედიენტი მარაგიდან</h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">✕</button>
          </div>
          
          {/* Search */}
          <div className="relative mb-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ძიება..."
              className="w-full px-4 py-2 pl-10 bg-slate-800 border border-slate-600 rounded-lg text-white focus:border-copper focus:outline-none placeholder-slate-400"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          </div>
          
          {/* Category Filters */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                !selectedCategory ? 'bg-copper text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              ყველა
            </button>
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1 ${
                  selectedCategory === key ? 'bg-copper text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {config.icon} {config.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="text-center py-8 text-slate-400">
              ⏳ იტვირთება...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              😕 ინგრედიენტი ვერ მოიძებნა
            </div>
          ) : (
            <div className="space-y-2">
              {filteredItems.map((item) => {
                const icon = getIngredientIcon(item)
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelect(item)
                      onClose()
                    }}
                    className="w-full p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-copper/50 rounded-lg transition-colors text-left flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{icon}</span>
                      <div>
                        <div className="font-medium text-white">{item.name}</div>
                        <div className="text-sm text-slate-400">
                          {item.supplier && <span>{item.supplier} • </span>}
                          <span>{item.sku}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${
                        Number(item.cachedBalance) > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {Number(item.cachedBalance || 0).toFixed(1)} {item.unit}
                      </div>
                      <div className="text-xs text-slate-500">მარაგში</div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            გაუქმება
          </button>
          <span className="text-sm text-slate-400 self-center">
            {filteredItems.length} ინგრედიენტი
          </span>
        </div>
      </div>
    </div>
  )
}

