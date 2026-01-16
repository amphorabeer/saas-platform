'use client'

import { useState, useEffect, useMemo } from 'react'
import { useInventoryStore } from '@/store'
import { InventoryItem } from '@/lib/api-client'
import { ingredients as libraryIngredients, Ingredient as LibraryIngredient } from '@/data/centralData'
import libraryData from '@/data/ingredient-library.eu.json'

interface IngredientPickerModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (item: InventoryItem | null) => void // null means create new
  onBack?: () => void // NEW - callback to go back to category selection
  category?: string
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: string }> = {
  RAW_MATERIAL: { label: 'ნედლი მასალა', icon: '🌾' },
  PACKAGING: { label: 'შეფუთვა', icon: '📦' },
  FINISHED_GOOD: { label: 'დასრულებული პროდუქტი', icon: '🍺' },
  CONSUMABLE: { label: 'ხარჯვადი', icon: '🧪' },
}

// Category config for ingredient categories (from CategorySelectorModal)
const INGREDIENT_CATEGORY_CONFIG: Record<string, { label: string; icon: string }> = {
  MALT: { label: 'მარცვლეული', icon: '🌾' },
  HOPS: { label: 'სვია', icon: '🌿' },
  YEAST: { label: 'საფუარი', icon: '🧪' },
  ADJUNCT: { label: 'დანამატები', icon: '🧫' },
  WATER_CHEMISTRY: { label: 'წყლის ქიმია', icon: '💧' },
  CLEANING: { label: 'რეცხვის საშუალებები', icon: '🧹' },
}

export function IngredientPickerModal({
  isOpen,
  onClose,
  onSelect,
  onBack,
  category,
}: IngredientPickerModalProps) {
  const { items: inventoryItems, fetchItems } = useInventoryStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'inventory' | 'library'>('inventory')
  const [selectedSuppliers, setSelectedSuppliers] = useState<Set<string>>(new Set())
  const [showSupplierFilter, setShowSupplierFilter] = useState(false)
  const [manufacturers, setManufacturers] = useState<string[]>([])
  const [mfgLoading, setMfgLoading] = useState(false)
  const [catalogItems, setCatalogItems] = useState<InventoryItem[]>([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [suppliersByCategory, setSuppliersByCategory] = useState<Record<string, string[]>>({})

  // Fetch manufacturers from API grouped by category
  useEffect(() => {
    if (!isOpen) return
    
    let cancelled = false
    
    async function loadManufacturers() {
      setMfgLoading(true)
      try {
        // Fetch manufacturers for each category
        const categories = ['MALT', 'HOPS', 'YEAST', 'ADJUNCT', 'CLEANING']
        const suppliersByCat: Record<string, string[]> = {}
        
        for (const cat of categories) {
          try {
            // Map CLEANING to CONSUMABLE for API
            const apiCategory = cat === 'CLEANING' ? 'CONSUMABLE' : cat
            const url = `/api/inventory/manufacturers?category=${apiCategory}`
            const res = await fetch(url, { cache: 'no-store' })
            if (res.ok) {
              const data: { items: string[] } = await res.json()
              suppliersByCat[cat] = data.items ?? []
            }
          } catch (error) {
            console.error(`Failed to fetch manufacturers for ${cat}:`, error)
            suppliersByCat[cat] = []
          }
        }

        // Also fetch all manufacturers (for "All" view)
        try {
          const url = '/api/inventory/manufacturers'
          const res = await fetch(url, { cache: 'no-store' })
          if (res.ok) {
            const data: { items: string[] } = await res.json()
            if (!cancelled) {
              setManufacturers(data.items ?? [])
              setSuppliersByCategory(suppliersByCat)
            }
          }
        } catch (error) {
          console.error('Failed to fetch all manufacturers:', error)
          if (!cancelled) {
            setManufacturers([])
            setSuppliersByCategory(suppliersByCat)
          }
        }
      } catch (error) {
        console.error('Failed to fetch manufacturers:', error)
        if (!cancelled) {
          setManufacturers([])
          setSuppliersByCategory({})
        }
      } finally {
        if (!cancelled) setMfgLoading(false)
      }
    }
    
    loadManufacturers()
    
    return () => {
      cancelled = true
    }
  }, [isOpen]) // Only reload when modal opens/closes, not on search query

  // Fetch inventory items when modal opens and in inventory mode
  useEffect(() => {
    if (isOpen && viewMode === 'inventory') {
      // Always fetch items when modal opens, don't pass search query to avoid conflicts
      // Map CLEANING to CONSUMABLE for API
      const apiCategory = category === 'CLEANING' ? 'CONSUMABLE' : category
      fetchItems({ category: apiCategory })
    }
  }, [isOpen, category, fetchItems, viewMode])

  // Fetch IngredientCatalog items when modal opens and in library mode
  useEffect(() => {
    if (!isOpen || viewMode !== 'library') {
      setCatalogItems([])
      return
    }

    let cancelled = false

    async function loadCatalogItems() {
      setCatalogLoading(true)
      try {
        // Build query params
        const params = new URLSearchParams()
        if (category) {
          // Map CLEANING to CONSUMABLE for API
          const apiCategory = category === 'CLEANING' ? 'CONSUMABLE' : category
          params.set('category', apiCategory)
        }
        if (searchQuery) params.set('search', searchQuery)
        
        const url = `/api/ingredients/catalog?${params.toString()}`
        const res = await fetch(url, { cache: 'no-store' })
        
        if (!res.ok) {
          console.error('Catalog API error:', res.status, res.statusText)
          if (!cancelled) setCatalogItems([])
          return
        }
        
        const data: { items: InventoryItem[] } = await res.json()
        if (!cancelled) {
          console.log('Loaded catalog items:', data.items?.length || 0)
          setCatalogItems(data.items ?? [])
        }
      } catch (error) {
        console.error('Failed to load catalog items:', error)
        if (!cancelled) setCatalogItems([])
      } finally {
        if (!cancelled) setCatalogLoading(false)
      }
    }

    loadCatalogItems()

    return () => {
      cancelled = true
    }
  }, [isOpen, viewMode, category, searchQuery])

  // Convert library ingredients to InventoryItem format
  const libraryItems = useMemo<InventoryItem[]>(() => {
    // Map library categories to ingredient category format (MALT, HOPS, etc.)
    const categoryMap: Record<string, string> = {
      'malt': 'MALT',
      'hops': 'HOPS',
      'hop': 'HOPS', // Support singular form
      'yeast': 'YEAST',
      'water_chemistry': 'WATER_CHEMISTRY',
      'adjunct': 'ADJUNCT',
    }
    
    // Reverse map: MALT -> malt, HOPS -> hops, etc.
    // Include both singular and plural forms for hops
    const reverseCategoryMap: Record<string, string[]> = {
      'MALT': ['malt', 'grain'], // Support both 'malt' and 'grain'
      'HOPS': ['hops', 'hop'], // Support both 'hops' and 'hop'
      'YEAST': ['yeast'],
      'WATER_CHEMISTRY': ['water_chemistry'], // Special handling below for adjunct items with adjunctType: 'water_chemistry'
      'ADJUNCT': ['adjunct', 'additive'],
    }

    // Use ingredient-library.eu.json data instead of centralData
    const jsonIngredients = (libraryData.items || []) as any[]
    const sourceIngredients = jsonIngredients.length > 0 ? jsonIngredients : libraryIngredients
    
    // Debug: Log filtering info
    if (process.env.NODE_ENV === 'development' && category) {
      console.log('[IngredientPickerModal] Filtering ingredients:', {
        category,
        totalIngredients: sourceIngredients.length,
        validCategories: reverseCategoryMap[category] || [],
        sampleItems: sourceIngredients.slice(0, 3).map((ing: any) => ({
          name: ing.name,
          category: ing.category
        }))
      })
    }
    
    return sourceIngredients
      .filter(ing => {
        // Filter by category if provided
        if (category) {
          const libIng = ing as any
          const ingCategoryLower = (ing.category || '').toLowerCase().trim()
          const adjunctType = (libIng.adjunctType || '').toLowerCase().trim()
          
          // Special handling for ADJUNCT vs WATER_CHEMISTRY separation
          if (category === 'ADJUNCT') {
            // Exclude water chemistry items from ADJUNCT
            if (adjunctType === 'water_chemistry') {
              return false
            }
            // Include only non-water-chemistry adjuncts
            return ingCategoryLower === 'adjunct' || ingCategoryLower === 'additive'
          }
          
          if (category === 'WATER_CHEMISTRY') {
            // Include items with category: 'water_chemistry' OR adjunctType: 'water_chemistry'
            if (ingCategoryLower === 'water_chemistry') return true
            if (adjunctType === 'water_chemistry') return true
            
            // Also check name patterns as fallback
            const nameLower = (ing.name || '').toLowerCase()
            const waterChemPatterns = [
              'gypsum', 'caso4', 'calcium chloride', 'cacl',
              'lactic acid', 'phosphoric acid', 'campden'
            ]
            return waterChemPatterns.some(p => nameLower.includes(p))
          }
          
          // Get valid library category values for the selected category (e.g., 'HOPS' -> ['hops', 'hop'])
          const validCategories = reverseCategoryMap[category] || []
          
          // STRICT CHECK: Only include if ingredient category matches one of the valid categories
          // This is the primary and ONLY check - must match exactly
          const matchesCategory = validCategories.some(cat => {
            const catLower = cat.toLowerCase().trim()
            return ingCategoryLower === catLower
          })
          
          // Additional validation: verify mapped category matches (safety check)
          // This double-checks that the mapping is correct
          const mappedCategory = categoryMap[ingCategoryLower]
          const mappedCategoryMatches = mappedCategory === category
          
          // STRICT: Only include if category matches AND mapped category matches (if mapping exists)
          // This prevents malts from showing when HOPS is selected
          // If no mapping exists for the category, we still allow it if matchesCategory is true
          const shouldInclude = matchesCategory && (mappedCategory ? mappedCategoryMatches : true)
          
          // Debug logging for development - log when wrong items might slip through
          if (process.env.NODE_ENV === 'development') {
            // Log when filtering HOPS but finding malt items
            if (category === 'HOPS' && ingCategoryLower === 'malt' && shouldInclude) {
              console.warn('[IngredientPickerModal] ❌ WRONG ITEM DETECTED:', {
                selectedCategory: category,
                ingredientCategory: ing.category,
                ingredientName: ing.name,
                matchesCategory,
                mappedCategory,
                mappedCategoryMatches,
                shouldInclude,
                validCategories
              })
            }
            // Log when filtering MALT but finding hop items
            if (category === 'MALT' && (ingCategoryLower === 'hops' || ingCategoryLower === 'hop') && shouldInclude) {
              console.warn('[IngredientPickerModal] ❌ WRONG ITEM DETECTED:', {
                selectedCategory: category,
                ingredientCategory: ing.category,
                ingredientName: ing.name,
                matchesCategory,
                mappedCategory,
                mappedCategoryMatches,
                shouldInclude,
                validCategories
              })
            }
          }
          
          return shouldInclude
        }
        return true
      })
      .map(ing => {
        // Cast to any to access spec fields from library
        const libIng = ing as any
        // Normalize category for mapping (handle both singular and plural)
        const ingCategoryLower = (ing.category || '').toLowerCase().trim()
        const mappedCategory = categoryMap[ingCategoryLower] || categoryMap[ing.category] || 'RAW_MATERIAL'
        
        return {
          id: ing.id,
          sku: ing.id, // Use ID as SKU for library items
          name: ing.name,
          category: mappedCategory,
          unit: ing.unit,
          balance: 0, // Library items have no stock
          onHand: 0,
          reorderPoint: ing.minQuantity || null,
          supplier: ing.supplier || null,
          costPerUnit: ing.costPerUnit || null,
          totalValue: null,
          isLowStock: false,
          isCritical: false,
          isOutOfStock: false,
          updatedAt: new Date().toISOString(),
          // Include all spec fields from library data
          color: libIng.color,
          potential: libIng.potential,
          yield: libIng.yield,
          maltType: libIng.maltType,
          origin: libIng.origin,
          alphaAcid: libIng.alphaAcid,
          betaAcid: libIng.betaAcid,
          form: libIng.form,
          purpose: libIng.purpose,
          attenuation: libIng.attenuation,
          tempRange: libIng.tempRange,
          flocculation: libIng.flocculation,
          yeastType: libIng.yeastType,
          description: libIng.description,
          adjunctType: libIng.adjunctType,
        } as InventoryItem & {
          color?: number
          potential?: number
          yield?: number
          maltType?: string
          origin?: string
          alphaAcid?: number
          betaAcid?: number
          form?: string
          purpose?: string
          attenuation?: string
          tempRange?: string
          flocculation?: string
          yeastType?: string
          description?: string
          adjunctType?: string
        }
      })
  }, [category])

  // Use appropriate items based on view mode
  // In library mode, prefer libraryItems (from ingredient-library.eu.json) over catalogItems (from database)
  // In inventory mode, use ONLY inventoryItems from database (no fallback)
  const items = useMemo(() => {
    if (viewMode === 'library') {
      // In library mode, prefer libraryItems from JSON file (complete catalog)
      // Only use catalogItems as fallback if libraryItems is empty
      if (libraryItems.length > 0) {
        return libraryItems
      }
      // Fallback to catalogItems from database if JSON library is empty
      return catalogItems
    }
    // In inventory mode, show ONLY inventory items (no fallback to library)
    // This ensures "მარაგში" tab shows actual inventory, not catalog items
    return inventoryItems
  }, [viewMode, inventoryItems, libraryItems, catalogItems])

  // Get suppliers based on current category filter - only suppliers that have items in current category
  // CRITICAL: This must use libraryItems (already filtered by category) not items (which may include wrong categories)
  const suppliers = useMemo(() => {
    const supplierSet = new Set<string>()
    
    // CRITICAL FIX: Always use libraryItems when in library mode, as they are already filtered by category
    // This ensures suppliers shown are ONLY from items that passed the category filter
    const sourceItems = viewMode === 'library' ? libraryItems : items
    
    // Debug: Log what we're using
    if (process.env.NODE_ENV === 'development' && category) {
      const sampleItem = sourceItems[0]
      if (sampleItem) {
        console.debug('[IngredientPickerModal] Suppliers source:', {
          viewMode,
          category,
          sourceItemsCount: sourceItems.length,
          sampleItemCategory: (sampleItem as any).category,
          sampleItemName: sampleItem.name
        })
      }
    }
    
    sourceItems.forEach(item => {
      if (item.supplier) {
        supplierSet.add(item.supplier)
      }
    })
    
    const derivedSuppliers = Array.from(supplierSet).sort()
    
    // If we have category-specific suppliers from API, validate against our filtered suppliers
    // This acts as a safety check to ensure API data matches our filtering
    if (category && suppliersByCategory[category]?.length > 0) {
      const apiSuppliers = suppliersByCategory[category]
      
      // Find suppliers that exist in both API and our filtered items
      const validSuppliers = apiSuppliers.filter(supplier => 
        derivedSuppliers.includes(supplier)
      )
      
      // If there's a mismatch, log it for debugging
      if (process.env.NODE_ENV === 'development' && validSuppliers.length !== apiSuppliers.length) {
        const missingInFiltered = apiSuppliers.filter(s => !derivedSuppliers.includes(s))
        const extraInFiltered = derivedSuppliers.filter(s => !apiSuppliers.includes(s))
        if (missingInFiltered.length > 0 || extraInFiltered.length > 0) {
          console.warn('[IngredientPickerModal] Supplier mismatch:', {
            category,
            apiSuppliers,
            derivedSuppliers,
            missingInFiltered,
            extraInFiltered
          })
        }
      }
      
      // Use intersection if non-empty, otherwise use derived suppliers
      return validSuppliers.length > 0 ? validSuppliers : derivedSuppliers
    }
    
    return derivedSuppliers
  }, [suppliersByCategory, items, libraryItems, category, viewMode])

  // Category labels in Georgian
  const categoryLabels: Record<string, { label: string; icon: string }> = {
    'MALT': { label: 'მარცვლეული', icon: '🌾' },
    'HOPS': { label: 'სვია', icon: '🌿' },
    'YEAST': { label: 'საფუარი', icon: '🧪' },
    'ADJUNCT': { label: 'დანამატი', icon: '⚗️' },
  }

  // Helper function to get item category (used for filtering in inventory mode)
  const getItemCategoryForFilter = (item: InventoryItem): string => {
    const sku = (item.sku || item.id || '').toUpperCase()
    const name = (item.name || '').toLowerCase()

    // 1. Check SKU prefix (most reliable) - support both dash and underscore formats
    if (sku.startsWith('MALT-') || sku.startsWith('MALT_')) return 'malt'
    if (sku.startsWith('HOP-') || sku.startsWith('HOP_')) return 'hops'
    if (sku.startsWith('YEAST-') || sku.startsWith('YEAST_')) return 'yeast'
    if (sku.startsWith('CHEM-') || sku.startsWith('CHEM_')) return 'adjunct'
    if (sku.startsWith('PKG-') || sku.startsWith('PKG_')) return 'packaging'
    
    // 2. Check item's category field
    const itemCat = ((item as any).category || '').toLowerCase()
    if (itemCat === 'malt' || itemCat === 'raw_material') {
      // For RAW_MATERIAL, check name to determine subcategory
      // IMPORTANT: Use comprehensive hop list to catch all hop varieties
      const hopIndicators = [
        'hop', 'citra', 'cascade', 'centennial', 'mosaic', 'simcoe', 'amarillo',
        'hallertau', 'hallertauer', 'saaz', 'magnum', 'hersbrucker', 'premiant',
        'tettnang', 'fuggle', 'golding', 'spalt', 'perle', 'northern brewer',
        'chinook', 'columbus', 'warrior', 'nugget', 'willamette', 'galaxy',
        'nelson', 'styrian', 'el dorado', 'mittelfrüh', 'mittelfrueh'
      ]
      if (hopIndicators.some(h => name.includes(h))) return 'hops'
      const yeastIndicators = ['yeast', 'safale', 'saflager', 'fermentis', 'wyeast', 'wlp', 'lallemand']
      if (yeastIndicators.some(y => name.includes(y))) return 'yeast'
      return 'malt'
    }
    if (itemCat === 'hops' || itemCat === 'hop') return 'hops'
    if (itemCat === 'yeast') return 'yeast'
    if (itemCat === 'adjunct') return 'adjunct'
    if (itemCat === 'water_chemistry') return 'water_chemistry'
    
    // 3. For ING- prefix or unknown, detect by name
    if (sku.startsWith('ING-') || sku.startsWith('ING_')) {
      // Hops detection (comprehensive list)
      const hopNames = [
        'citra', 'cascade', 'centennial', 'mosaic', 'simcoe', 'amarillo', 
        'hallertau', 'hallertauer', 'saaz', 'fuggle', 'golding', 'magnum', 
        'northern brewer', 'chinook', 'columbus', 'tomahawk', 'warrior', 
        'nugget', 'willamette', 'tettnang', 'mittelfrüh', 'mittelfrueh',
        'hersbrucker', 'premiant', 'spalt', 'perle', 'styrian', 'el dorado',
        'hop'
      ]
      if (hopNames.some(h => name.includes(h))) return 'hops'
      
      // Yeast detection
      const yeastNames = ['yeast', 'safale', 'saflager', 'fermentis', 'us-05', 's-04', 
        's-23', 'w-34', 't-58', 'wb-06', 'wlp', 'wyeast', 'lallemand', 'lalbrew', 'nottingham']
      if (yeastNames.some(y => name.includes(y))) return 'yeast'
      
      // Malt detection (must come after hops/yeast to avoid false positives)
      const maltNames = ['malt', 'pilsner', 'munich', 'vienna', 'wheat', 'crystal', 
        'caramel', 'cara', 'roasted', 'chocolate', 'black', 'pale ale', 'barley', 'pale']
      if (maltNames.some(m => name.includes(m))) return 'malt'
      
      // Water chemistry detection (separate from adjuncts)
      const waterChemNames = [
        'gypsum', 'caso4', 'cacl', 'calcium chloride', 'calcium sulfate',
        'lactic acid', 'phosphoric acid', 'campden', 'sodium', 'magnesium',
        'bicarbonate', 'chalk', 'epson', 'epsom', 'salt', 'chloride', 'sulfate'
      ]
      if (waterChemNames.some(c => name.includes(c))) {
        // Check if it's water chemistry or adjunct based on context
        if (name.includes('gypsum') || name.includes('calcium') || 
            name.includes('chloride') || name.includes('sulfate') ||
            name.includes('acid') || name.includes('campden') ||
            name.includes('sodium') || name.includes('magnesium')) {
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
    
    // 4. Fallback: check name patterns (for items without proper SKU)
    const hopIndicators = [
      'hop', 'citra', 'cascade', 'centennial', 'mosaic', 'simcoe', 'amarillo',
      'hallertau', 'hallertauer', 'saaz', 'magnum', 'hersbrucker', 'premiant',
      'tettnang', 'fuggle', 'golding', 'spalt', 'perle', 'styrian', 'el dorado',
      'mittelfrüh', 'mittelfrueh'
    ]
    if (hopIndicators.some(h => name.includes(h))) return 'hops'
    
    const yeastIndicators = ['yeast', 'safale', 'saflager', 'us-05', 's-04', 'fermentis']
    if (yeastIndicators.some(y => name.includes(y))) return 'yeast'
    
    const maltIndicators = ['malt', 'pilsner', 'munich', 'vienna', 'wheat', 'crystal', 
      'caramel', 'roasted', 'chocolate', 'barley', 'pale']
    if (maltIndicators.some(m => name.includes(m))) return 'malt'
    
    return 'other'
  }

  // Filter items based on category (inventory mode), search, and supplier filter
  const filteredItems = useMemo(() => {
    let filtered = items

    // CRITICAL: Filter by category when in inventory mode and category is selected
    // This ensures "მარცვლეული" tab only shows malt items, not hops or yeast
    if (viewMode === 'inventory' && category) {
      const categoryMap: Record<string, string[]> = {
        'MALT': ['malt'],
        'HOPS': ['hops'],
        'YEAST': ['yeast'],
        'ADJUNCT': ['adjunct'],
        'WATER_CHEMISTRY': ['water_chemistry'],
      }
      
      const allowedCategories = categoryMap[category] || []
      
      filtered = filtered.filter(item => {
        const itemCategory = getItemCategoryForFilter(item)
        
        // Special handling for ADJUNCT vs WATER_CHEMISTRY separation
        if (category === 'ADJUNCT') {
          const name = (item.name || '').toLowerCase()
          const sku = ((item.sku || '') || '').toLowerCase()
          
          // Exclude water chemistry items from ADJUNCT
          if (itemCategory === 'water_chemistry') {
            return false
          }
          
          // Check ingredientType first
          if ((item as any).ingredientType === 'ADJUNCT') return true
          
          // Check itemCategory
          if (itemCategory === 'adjunct') return true
          
          // Direct pattern matching as fallback (important for items like Irish Moss)
          const adjunctPatterns = [
            'irish moss', 'whirlfloc', 'gelatin', 'fining', 'isinglass', 'biofine',
            'sugar', 'dextrose', 'honey', 'molasses', 'lactose', 'syrup', 'candi',
            'coriander', 'orange peel', 'spice', 'vanilla', 'cocoa', 'coffee', 
            'chocolate', 'oak', 'chip', 'cube', 'stave'
          ]
          
          // Exclude water chemistry patterns
          const waterChemExclusions = [
            'gypsum', 'caso4', 'cacl', 'calcium chloride', 'calcium sulfate',
            'lactic acid', 'phosphoric acid', 'campden', 'sodium', 'magnesium',
            'bicarbonate', 'chalk', 'epson', 'epsom', 'salt', 'chloride', 'sulfate'
          ]
          if (waterChemExclusions.some(ex => name.includes(ex))) {
            return false
          }
          
          // Check adjunct patterns
          if (adjunctPatterns.some(p => name.includes(p))) return true
          if (sku.includes('adj') || sku.includes('adjunct')) return true
          
          return false
        }
        
        if (category === 'WATER_CHEMISTRY') {
          // Include water chemistry items - check both ingredientType and patterns
          const name = (item.name || '').toLowerCase()
          const sku = ((item.sku || '') || '').toLowerCase()
          
          // Check ingredientType first
          if ((item as any).ingredientType === 'WATER_CHEMISTRY') return true
          
          // Check itemCategory
          if (itemCategory === 'water_chemistry') return true
          
          // Fallback: check patterns directly (in case getItemCategoryForFilter missed it)
          const waterChemPatterns = [
            'gypsum', 'caso4', 'calcium', 'chloride', 'cacl',
            'lactic', 'phosphoric', 'acid', 'campden', 'salt',
            'sulfate', 'bicarbonate', 'chalk', 'sodium', 'magnesium',
            'calcium chloride', 'calcium sulfate', 'lactic acid', 'phosphoric acid'
          ]
          if (waterChemPatterns.some(p => name.includes(p))) return true
          if (sku.includes('chem') || sku.includes('water')) return true
          
          return false
        }
        
        // For other categories, use standard matching
        const matches = allowedCategories.includes(itemCategory)
        
        // Debug logging
        if (process.env.NODE_ENV === 'development' && category === 'MALT' && !matches) {
          console.debug('[IngredientPickerModal] Item filtered out (category mismatch):', {
            itemName: item.name,
            itemCategory,
            allowedCategories,
            category,
            sku: item.sku
          })
        }
        
        return matches
      })
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Filter by selected suppliers (if any selected)
    // Only show items that have a supplier AND that supplier is selected
    // OR show items without supplier only if no suppliers are selected (show all)
    if (selectedSuppliers.size > 0) {
      filtered = filtered.filter(item => {
        // If item has supplier, it must be in selectedSuppliers
        // Normalize supplier name for comparison (case-insensitive)
        if (item.supplier) {
          const normalizedSupplier = item.supplier.trim()
          // Check if any selected supplier matches (case-insensitive)
          return Array.from(selectedSuppliers).some(selected => 
            selected.trim().toLowerCase() === normalizedSupplier.toLowerCase()
          )
        }
        // Items without supplier are hidden when filters are active
        return false
      })
    }

    return filtered
  }, [items, category, viewMode, searchQuery, selectedSuppliers])

  // Group items by supplier
  const groupedItems = useMemo(() => {
    const groups: Record<string, InventoryItem[]> = {}
    const noSupplier: InventoryItem[] = []

    filteredItems.forEach(item => {
      if (item.supplier) {
        if (!groups[item.supplier]) {
          groups[item.supplier] = []
        }
        groups[item.supplier].push(item)
      } else {
        noSupplier.push(item)
      }
    })

    return { groups, noSupplier }
  }, [filteredItems])

  const handleSelectItem = (item: InventoryItem) => {
    onSelect(item)
    onClose()
  }

  const handleCreateNew = () => {
    onSelect(null) // null means create new
    onClose()
  }

  const toggleSupplier = (supplier: string) => {
    setSelectedSuppliers(prev => {
      const next = new Set(prev)
      if (next.has(supplier)) {
        next.delete(supplier)
      } else {
        next.add(supplier)
      }
      return next
    })
  }

  const selectAllSuppliers = () => {
    if (suppliers.length > 0) {
      setSelectedSuppliers(new Set(suppliers))
    }
  }

  const clearSupplierFilter = () => {
    setSelectedSuppliers(new Set())
  }

  if (!isOpen) return null

  // Determine category info - prioritize ingredient categories from CategorySelectorModal
  const categoryInfo = category 
    ? (INGREDIENT_CATEGORY_CONFIG[category] || CATEGORY_CONFIG[category] || { label: category, icon: '📦' })
    : { label: 'ინგრედიენტი', icon: '📦' }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 bg-slate-900">
          <div className="flex items-center justify-between mb-4">
            {/* Left: Back button + Category */}
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
              {category && categoryInfo && (
                <div className="flex items-center gap-2">
                  {onBack && <span className="text-slate-600">|</span>}
                  <span className="text-2xl">{categoryInfo.icon}</span>
                  <span className="font-semibold text-lg text-white">{categoryInfo.label}</span>
                </div>
              )}
              {!category && (
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📦</span>
                  <span className="font-semibold text-lg text-white">აირჩიე ინგრედიენტი</span>
                </div>
              )}
            </div>
            
            {/* Right: Filter and Close buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSupplierFilter(!showSupplierFilter)}
                className={`p-2 rounded-lg transition-colors ${
                  showSupplierFilter
                    ? 'bg-copper/20 text-copper'
                    : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                }`}
                title="მომწოდებლების ფილტრი"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
              >
                <span className="text-xl">✕</span>
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mb-3">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input
              type="text"
              placeholder="ძიება..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-copper focus:outline-none"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                setViewMode('library')
                setSelectedSuppliers(new Set()) // Clear supplier filter when switching
              }}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                viewMode === 'library'
                  ? 'bg-copper text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              📚 კატალოგი
            </button>
            <button
              onClick={() => {
                setViewMode('inventory')
                setSelectedSuppliers(new Set()) // Clear supplier filter when switching
              }}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                viewMode === 'inventory'
                  ? 'bg-copper text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              📦 მარაგში
            </button>
          </div>
        </div>

        {/* Supplier Filter */}
        {showSupplierFilter && (
          <div className="p-4 border-b border-slate-700 bg-slate-900/50">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-medium text-sm">მომწოდებლების ფილტრი</h3>
                <p className="text-xs text-slate-400">აირჩიე რომელი მომწოდებლები გამოჩნდეს</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAllSuppliers}
                  disabled={!suppliers.length || mfgLoading}
                  className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ყველა
                </button>
                <button
                  onClick={clearSupplierFilter}
                  className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded"
                >
                  გასუფთავება
                </button>
                {mfgLoading && (
                  <span className="text-xs text-slate-400">იტვირთება...</span>
                )}
              </div>
            </div>
            {(() => {
              // CRITICAL FIX: Only show suppliers for the selected category
              // If category is selected, show only that category's suppliers
              // If no category is selected, fallback to showing suppliers from filtered items
              const suppliersToShow = category && suppliersByCategory[category]?.length > 0
                ? { [category]: suppliersByCategory[category] }
                : Object.keys(suppliersByCategory).length > 0
                  ? suppliersByCategory
                  : null
              
              if (suppliersToShow && Object.keys(suppliersToShow).length > 0) {
                return (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {Object.entries(suppliersToShow).map(([cat, catSuppliers]) => {
                      if (catSuppliers.length === 0) return null
                      const catInfo = categoryLabels[cat] || { label: cat, icon: '📦' }
                      return (
                        <div key={cat} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{catInfo.icon}</span>
                            <h4 className="font-medium text-sm text-slate-300">{catInfo.label}</h4>
                            <span className="text-xs text-slate-500">({catSuppliers.length})</span>
                          </div>
                          <div className="flex flex-wrap gap-2 pl-7">
                            {catSuppliers.map(supplier => {
                              const isChecked = selectedSuppliers.has(supplier)
                              return (
                                <label
                                  key={supplier}
                                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                                    isChecked
                                      ? 'bg-copper/20 border border-copper/50'
                                      : 'bg-slate-800 hover:bg-slate-700'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleSupplier(supplier)}
                                    className="rounded border-slate-600 w-4 h-4 cursor-pointer"
                                  />
                                  <span className="text-sm">{supplier}</span>
                                </label>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              }
              
              // Fallback to suppliers derived from filtered items (from library/inventory)
              if (suppliers.length > 0) {
                return (
                  <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                    {suppliers.map(supplier => {
                      const isChecked = selectedSuppliers.has(supplier)
                      return (
                        <label
                          key={supplier}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                            isChecked
                              ? 'bg-copper/20 border border-copper/50'
                              : 'bg-slate-800 hover:bg-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSupplier(supplier)}
                            className="rounded border-slate-600 w-4 h-4 cursor-pointer"
                          />
                          <span className="text-sm">{supplier}</span>
                        </label>
                      )
                    })}
                  </div>
                )
              }
              
              // No suppliers found
              return !mfgLoading ? (
                <p className="text-xs text-slate-400 text-center py-4">
                  {category 
                    ? 'ამ კატეგორიისთვის მომწოდებლები ვერ მოიძებნა'
                    : 'მომწოდებლები ვერ მოიძებნა'}
                </p>
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">იტვირთება...</p>
              )
            })()}
          </div>
        )}

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-4">
          {catalogLoading && viewMode === 'library' ? (
            <div className="text-center py-12 text-slate-400">
              <p className="text-lg mb-2">იტვირთება...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p className="text-lg mb-2">
                {viewMode === 'library' ? 'კატალოგში არ მოიძებნა' : 'მარაგი არ მოიძებნა'}
              </p>
              <p className="text-sm">
                {viewMode === 'library' 
                  ? 'გამოიყენე ძიება კატალოგში ან დაამატე ახალი'
                  : 'გამოიყენე ძიება ან დაამატე ახალი'}
              </p>
              {viewMode === 'library' && selectedSuppliers.size > 0 && (
                <p className="text-xs mt-2 text-slate-500">
                  ან გაასუფთავე მომწოდებლების ფილტრი
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Grouped by Supplier */}
              {Object.entries(groupedItems.groups).map(([supplier, supplierItems]) => (
                <div key={supplier}>
                  <div className="mb-2 pb-2 border-b border-slate-700">
                    <h3 className="font-semibold text-slate-300">{supplier}</h3>
                  </div>
                  <div className="space-y-1">
                    {supplierItems.map(item => (
                      <IngredientItemRow
                        key={item.id}
                        item={item}
                        onSelect={() => handleSelectItem(item)}
                        category={category}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {/* No Supplier Group */}
              {groupedItems.noSupplier.length > 0 && (
                <div>
                  <div className="mb-2 pb-2 border-b border-slate-700">
                    <h3 className="font-semibold text-slate-300">მომწოდებელი არ არის მითითებული</h3>
                  </div>
                  <div className="space-y-1">
                    {groupedItems.noSupplier.map(item => (
                      <IngredientItemRow
                        key={item.id}
                        item={item}
                        onSelect={() => handleSelectItem(item)}
                        category={category}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex justify-end">
          <button
            onClick={handleCreateNew}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
          >
            + დამატება
          </button>
        </div>
      </div>
    </div>
  )
}

function IngredientItemRow({
  item,
  onSelect,
  category,
}: {
  item: InventoryItem & {
    // Extended fields from library
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
  onSelect: () => void
  category?: string
}) {
  // Determine icon based on item category
  // Helper function to get item category from SKU and name
  const getItemCategory = (): string => {
    const sku = (item.sku || item.id || '').toUpperCase()
    const name = (item.name || '').toLowerCase()

    // 1. Check SKU prefix (most reliable) - support both dash and underscore formats
    if (sku.startsWith('MALT-') || sku.startsWith('MALT_')) return 'malt'
    if (sku.startsWith('HOP-') || sku.startsWith('HOP_')) return 'hops'
    if (sku.startsWith('YEAST-') || sku.startsWith('YEAST_')) return 'yeast'
    if (sku.startsWith('CHEM-') || sku.startsWith('CHEM_')) return 'adjunct'
    if (sku.startsWith('PKG-') || sku.startsWith('PKG_')) return 'packaging'
    
    // 2. Check item's category field
    const itemCat = ((item as any).category || '').toLowerCase()
    if (itemCat === 'malt' || itemCat === 'raw_material') {
      // For RAW_MATERIAL, check name to determine subcategory
      // IMPORTANT: Use comprehensive hop list to catch all hop varieties
      const hopIndicators = [
        'hop', 'citra', 'cascade', 'centennial', 'mosaic', 'simcoe', 'amarillo',
        'hallertau', 'hallertauer', 'saaz', 'magnum', 'hersbrucker', 'premiant',
        'tettnang', 'fuggle', 'golding', 'spalt', 'perle', 'northern brewer',
        'chinook', 'columbus', 'warrior', 'nugget', 'willamette', 'galaxy',
        'nelson', 'styrian', 'el dorado', 'mittelfrüh', 'mittelfrueh'
      ]
      if (hopIndicators.some(h => name.includes(h))) return 'hops'
      const yeastIndicators = ['yeast', 'safale', 'saflager', 'fermentis', 'wyeast', 'wlp', 'lallemand']
      if (yeastIndicators.some(y => name.includes(y))) return 'yeast'
      return 'malt'
    }
    if (itemCat === 'hops' || itemCat === 'hop') return 'hops'
    if (itemCat === 'yeast') return 'yeast'
    if (itemCat === 'adjunct') return 'adjunct'
    if (itemCat === 'water_chemistry') return 'water_chemistry'
    
    // 3. For ING- prefix or unknown, detect by name
    if (sku.startsWith('ING-') || sku.startsWith('ING_')) {
      // Hops detection (comprehensive list)
      const hopNames = [
        'citra', 'cascade', 'centennial', 'mosaic', 'simcoe', 'amarillo', 
        'hallertau', 'hallertauer', 'saaz', 'fuggle', 'golding', 'magnum', 
        'northern brewer', 'chinook', 'columbus', 'tomahawk', 'warrior', 
        'nugget', 'willamette', 'tettnang', 'mittelfrüh', 'mittelfrueh',
        'hersbrucker', 'premiant', 'spalt', 'perle', 'styrian', 'el dorado',
        'hop'
      ]
      if (hopNames.some(h => name.includes(h))) return 'hops'
      
      // Yeast detection
      const yeastNames = ['yeast', 'safale', 'saflager', 'fermentis', 'us-05', 's-04', 
        's-23', 'w-34', 't-58', 'wb-06', 'wlp', 'wyeast', 'lallemand', 'lalbrew', 'nottingham']
      if (yeastNames.some(y => name.includes(y))) return 'yeast'
      
      // Malt detection (must come after hops/yeast to avoid false positives)
      const maltNames = ['malt', 'pilsner', 'munich', 'vienna', 'wheat', 'crystal', 
        'caramel', 'cara', 'roasted', 'chocolate', 'black', 'pale ale', 'barley', 'pale']
      if (maltNames.some(m => name.includes(m))) return 'malt'
      
      // Water chemistry detection (separate from adjuncts)
      const waterChemNames = [
        'gypsum', 'caso4', 'cacl', 'calcium chloride', 'calcium sulfate',
        'lactic acid', 'phosphoric acid', 'campden', 'sodium', 'magnesium',
        'bicarbonate', 'chalk', 'epson', 'epsom', 'salt', 'chloride', 'sulfate'
      ]
      if (waterChemNames.some(c => name.includes(c))) {
        // Check if it's water chemistry or adjunct based on context
        if (name.includes('gypsum') || name.includes('calcium') || 
            name.includes('chloride') || name.includes('sulfate') ||
            name.includes('acid') || name.includes('campden') ||
            name.includes('sodium') || name.includes('magnesium')) {
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
    
    // 4. Fallback: check name patterns (for items without proper SKU)
    const hopIndicators = [
      'hop', 'citra', 'cascade', 'centennial', 'mosaic', 'simcoe', 'amarillo',
      'hallertau', 'hallertauer', 'saaz', 'magnum', 'hersbrucker', 'premiant',
      'tettnang', 'fuggle', 'golding', 'spalt', 'perle', 'styrian', 'el dorado',
      'mittelfrüh', 'mittelfrueh'
    ]
    if (hopIndicators.some(h => name.includes(h))) return 'hops'
    
    const yeastIndicators = ['yeast', 'safale', 'saflager', 'us-05', 's-04', 'fermentis']
    if (yeastIndicators.some(y => name.includes(y))) return 'yeast'
    
    const maltIndicators = ['malt', 'pilsner', 'munich', 'vienna', 'wheat', 'crystal', 
      'caramel', 'roasted', 'chocolate', 'barley', 'pale']
    if (maltIndicators.some(m => name.includes(m))) return 'malt'
    
    return 'other'
  }

  const getIngredientIcon = (): string => {
    // First check the passed category prop
    const cat = category?.toUpperCase() || ''
    if (cat === 'MALT') return '🌾'
    if (cat === 'HOPS') return '🌿'
    if (cat === 'YEAST') return '🧪'
    if (cat === 'ADJUNCT') return '🧫'
    if (cat === 'WATER_CHEMISTRY') return '💧'
    
    // Use getItemCategory to determine icon
    const itemCategory = getItemCategory()
    if (itemCategory === 'malt') return '🌾'
    if (itemCategory === 'hops') return '🌿'
    if (itemCategory === 'yeast') return '🧪'
    if (itemCategory === 'adjunct') return '⚗️'
    if (itemCategory === 'packaging') return '📦'
    
    // Default
    return '📦'
  }

  // Get country flag emoji from origin
  const getOriginFlag = (origin?: string): string => {
    if (!origin) return ''
    const flags: Record<string, string> = {
      'germany': '🇩🇪',
      'belgium': '🇧🇪',
      'uk': '🇬🇧',
      'usa': '🇺🇸',
      'czech republic': '🇨🇿',
      'finland': '🇫🇮',
      'netherlands': '🇳🇱',
      'france': '🇫🇷',
    }
    return flags[origin.toLowerCase()] || ''
  }

  // Build specs array based on category
  const getSpecs = (): Array<{ label: string; value: string }> => {
    
    const specs: Array<{ label: string; value: string }> = []
    const cat = category?.toUpperCase() || ''
    const itemCat = (item as any).category?.toLowerCase() || ''
    
    // Malt specs
    if (cat === 'MALT' || itemCat === 'malt') {
      if (item.color !== undefined && item.color !== null) {
        specs.push({ label: 'EBC', value: String(item.color) })
      }
      if (item.yield !== undefined && item.yield !== null) {
        specs.push({ label: 'Yield', value: `${item.yield}%` })
      }
      if (item.maltType) {
        const maltTypeLabels: Record<string, string> = {
          'base': 'Base',
          'caramel': 'Caramel',
          'roasted': 'Roasted',
          'specialty': 'Specialty',
          'smoked': 'Smoked',
          'acidulated': 'Acidulated',
        }
        specs.push({ label: 'Type', value: maltTypeLabels[item.maltType] || item.maltType })
      }
    }
    
    // Hops specs
    if (cat === 'HOPS' || itemCat === 'hops') {
      if (item.alphaAcid !== undefined && item.alphaAcid !== null) {
        specs.push({ label: 'AA', value: `${item.alphaAcid}%` })
      }
      if (item.purpose) {
        const purposeLabels: Record<string, string> = {
          'aroma': 'Aroma',
          'bittering': 'Bittering',
          'dual': 'Dual',
        }
        specs.push({ label: 'Purpose', value: purposeLabels[item.purpose] || item.purpose })
      }
      if (item.form) {
        const formLabels: Record<string, string> = {
          'pellet': 'Pellet',
          'leaf': 'Leaf',
          'cryo': 'Cryo',
        }
        specs.push({ label: 'Form', value: formLabels[item.form] || item.form })
      }
    }
    
    // Yeast specs
    if (cat === 'YEAST' || itemCat === 'yeast') {
      if (item.attenuation) {
        specs.push({ label: 'Atten', value: item.attenuation })
      }
      if (item.tempRange) {
        specs.push({ label: 'Temp', value: item.tempRange })
      }
      if (item.flocculation) {
        const flocLabels: Record<string, string> = {
          'low': 'Low',
          'medium': 'Med',
          'high': 'High',
        }
        specs.push({ label: 'Flocc', value: flocLabels[item.flocculation] || item.flocculation })
      }
      if (item.yeastType) {
        const typeLabels: Record<string, string> = {
          'lager': 'Lager',
          'ale': 'Ale',
          'wheat': 'Wheat',
          'belgian': 'Belgian',
          'wild': 'Wild',
        }
        specs.push({ label: 'Type', value: typeLabels[item.yeastType] || item.yeastType })
      }
    }
    
    // Adjunct specs
    if (cat === 'ADJUNCT' || itemCat === 'adjunct') {
      if (item.adjunctType) {
        const adjunctLabels: Record<string, string> = {
          'water_chemistry': 'Water Chem',
          'fining': 'Fining',
          'sugar': 'Sugar',
          'spice': 'Spice',
        }
        specs.push({ label: 'Type', value: adjunctLabels[item.adjunctType] || item.adjunctType })
      }
      if (item.potential) {
        specs.push({ label: 'Potential', value: String(item.potential) })
      }
    }
    
    // Water Chemistry specs
    if (cat === 'WATER_CHEMISTRY' || itemCat === 'water_chemistry') {
      if (item.description) {
        // Truncate long descriptions
        const desc = item.description.length > 30 
          ? item.description.substring(0, 30) + '...' 
          : item.description
        specs.push({ label: '', value: desc })
      }
    }
    
    return specs
  }

  const categoryIcon = getIngredientIcon()
  const specs = getSpecs()
  const originFlag = getOriginFlag(item.origin)
  
  // Balance/stock info
  const balance = typeof item.balance === 'number' ? item.balance : (typeof item.onHand === 'number' ? item.onHand : 0)
  const unit = item.unit || ''
  const costPerUnit = item.costPerUnit ? Number(item.costPerUnit).toFixed(2) : null
  const supplier = item.supplier || null

  return (
    <div
      onClick={onSelect}
      className="flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-700 rounded-lg cursor-pointer transition-all duration-200 border border-transparent hover:border-copper/30 group"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Icon */}
        <span className="text-2xl flex-shrink-0">{categoryIcon}</span>
        
        <div className="flex-1 min-w-0">
          {/* Row 1: Name + Supplier Badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-white">{item.name}</span>
            {supplier && (
              <span className="px-2 py-0.5 bg-copper/20 text-copper text-xs rounded border border-copper/30 flex-shrink-0">
                {supplier}
              </span>
            )}
          </div>
          
          {/* Row 2: Specs */}
          {specs.length > 0 && (
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 flex-wrap">
              {specs.map((spec, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <span className="text-slate-600">•</span>}
                  {spec.label && (
                    <span className="text-slate-500">{spec.label}:</span>
                  )}
                  <span className="text-slate-300">{spec.value}</span>
                </span>
              ))}
              {/* Origin flag at the end */}
              {originFlag && (
                <>
                  <span className="text-slate-600">•</span>
                  <span>{originFlag} {item.origin}</span>
                </>
              )}
            </div>
          )}
          
          {/* Row 3: Stock info (only if has stock) */}
          {(balance > 0 || costPerUnit) && (
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
              {balance > 0 && (
                <span className="flex items-center gap-1">
                  <span className="text-green-500">●</span>
                  მარაგი: {balance} {unit}
                </span>
              )}
              {costPerUnit && (
                <>
                  {balance > 0 && <span className="text-slate-600">•</span>}
                  <span>{costPerUnit}₾/{unit}</span>
                </>
              )}
            </div>
          )}
          
          {/* Show "მარაგი არ არის" only in inventory mode when balance is 0 */}
          {balance === 0 && !specs.length && (
            <div className="text-xs text-slate-500 mt-1">
              მარაგი არ არის
            </div>
          )}
        </div>
      </div>
      
      {/* Add Button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onSelect()
        }}
        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg font-medium transition-colors whitespace-nowrap flex-shrink-0 ml-3"
      >
        + დამატება
      </button>
    </div>
  )
}


