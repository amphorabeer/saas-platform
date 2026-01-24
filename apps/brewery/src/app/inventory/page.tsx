'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout'
import { Card, CardHeader, CardBody, Button, ProgressBar } from '@/components/ui'
import { formatDate } from '@/lib/utils'
import { ingredients as centralIngredients } from '@/data/centralData'
import { KegManagementSection } from '@/components/inventory/KegManagementSection'
import { PackagingMaterialsSection } from '@/components/inventory/PackagingMaterialsSection'
import { CleaningSuppliesSection } from '@/components/inventory/CleaningSuppliesSection'
import { 
  IngredientPickerModal, 
  AddIngredientModal, 
  CategorySelectorModal,
  PurchaseModal,
  type IngredientFormData,
  type IngredientCategoryType,
  type PurchaseFormData,
} from '@/components/inventory'
import { useBreweryStore } from '@/store'
import { InventoryItem } from '@/lib/api-client'

type IngredientCategory = 'all' | 'grain' | 'hop' | 'yeast' | 'adjunct' | 'water_chemistry' | 'packaging'
type StockStatus = 'ok' | 'low' | 'critical' | 'out'

export interface Ingredient {
  id: string
  name: string
  category: IngredientCategory
  ingredientType?: string
  currentStock: number
  minStock: number
  unit: string
  avgUsagePerWeek: number
  lastReceived: Date
  expiryDate?: Date
  supplier: string
  pricePerUnit: number
  lotNumber?: string
  location: string
}

// Transform central ingredients to page format
const categoryMap: Record<string, IngredientCategory> = {
  'malt': 'grain',
  'hops': 'hop',
  'yeast': 'yeast',
  'adjunct': 'adjunct',
  'water_chemistry': 'water_chemistry',
}

const mockIngredients: Ingredient[] = centralIngredients.map((ing, index) => ({
  id: ing.id,
  name: ing.name,
  category: categoryMap[ing.category] || 'adjunct',
  currentStock: ing.quantity,
  minStock: ing.minQuantity,
  unit: ing.unit,
  avgUsagePerWeek: Math.ceil(ing.minQuantity / 4),
  lastReceived: new Date(Date.now() - (index % 30) * 24 * 60 * 60 * 1000),
  expiryDate: ing.expiryDate,
  supplier: ing.supplier,
  pricePerUnit: ing.costPerUnit,
  lotNumber: ing.lotNumber,
  location: ing.location,
}))

// Helper functions and configs
const getStockStatus = (current: number, min: number): StockStatus => {
  if (current === 0) return 'out'
  if (current < min * 0.5) return 'critical'
  if (current < min) return 'low'
  return 'ok'
}

const CATEGORY_CONFIG: Record<IngredientCategory, { label: string; icon: string }> = {
  all: { label: 'ყველა', icon: '📦' },
  grain: { label: 'მარცვლეული', icon: '🌾' },
  hop: { label: 'სვია', icon: '🌿' },
  yeast: { label: 'საფუარი', icon: '🧪' },
  adjunct: { label: 'დანამატები', icon: '🧫' },
  water_chemistry: { label: 'წყლის ქიმია', icon: '💧' },
  packaging: { label: 'შეფუთვა', icon: '📦' },
}

// Helper function to detect ingredient icon from name/category
const getIngredientIconFromName = (name: string, category?: string, ingredientType?: string): string => {
  const lowerName = (name || '').toLowerCase()
  const lowerCategory = (category || '').toLowerCase()
  const lowerIngredientType = (ingredientType || '').toLowerCase()
  
  // 1. FIRST: Check ingredientType field (most reliable from API)
  if (lowerIngredientType === 'malt') return '🌾'
  if (lowerIngredientType === 'hops') return '🌿'
  if (lowerIngredientType === 'yeast') return '🧪'
  if (lowerIngredientType === 'adjunct') return '🧫'
  if (lowerIngredientType === 'water_chemistry') return '💧'
  
  // 2. Check category directly (handles API responses)
  if (lowerCategory === 'malt' || lowerCategory === 'grain') return '🌾'
  if (lowerCategory === 'hops' || lowerCategory === 'hop') return '🌿'
  if (lowerCategory === 'yeast') return '🧪'
  if (lowerCategory === 'adjunct') return '🧫'
  if (lowerCategory === 'water_chemistry' || lowerCategory === 'water') return '💧'
  if (lowerCategory === 'packaging') return '📦'
  
  // 3. Georgian category names (from CategorySelectorModal)
  if (lowerCategory === 'მარცვლეული') return '🌾'
  if (lowerCategory === 'სვია') return '🌿'
  if (lowerCategory === 'საფუარი') return '🧪'
  if (lowerCategory === 'დანამატები') return '🧫'
  if (lowerCategory === 'წყლის ქიმია') return '💧'
  
  // 4. Check name patterns - Hops FIRST (comprehensive list)
  const hopNames = [
    'magnum', 'cascade', 'centennial', 'citra', 'mosaic', 'simcoe', 'amarillo',
    'saaz', 'hallertau', 'hallertauer', 'tettnang', 'spalt', 'perle', 'hersbrucker', 'premiant',
    'sládek', 'fuggle', 'golding', 'challenger', 'northdown', 'target',
    'nelson sauvin', 'motueka', 'galaxy', 'vic secret', 'ella',
    'sorachi', 'mittelfrüh', 'mittelfruh', 'tradition', 'mandarina', 'huell melon',
    'polaris', 'herkules', 'columbus', 'chinook', 'warrior', 'nugget', 'willamette', 'northern brewer',
    'სვია'  // Georgian word for hops
  ]
  if (hopNames.some(h => lowerName.includes(h))) return '🌿'
  if (lowerName.includes('hop')) return '🌿'
  
  // 5. Yeast strains
  const yeastNames = [
    'safale', 'saflager', 'safbrew', 'safcider',
    'wlp', 'wyeast', 'omega', 'imperial',
    'lallemand', 'lalbrew', 'lalvin',
    'fermentis', 'mangrove jack',
    'nottingham', 'windsor', 'london ale',
    'us-05', 'us-04', 's-04', 's-23', 's-33', 'w-34', 'k-97', 'm-44',
    't-58', 'be-256', 'be-134', 'wb-06',
    'belle saison', 'abbaye', 'verdant',
    'საფუარი'  // Georgian word for yeast
  ]
  if (yeastNames.some(y => lowerName.includes(y))) return '🧪'
  if (lowerName.includes('yeast')) return '🧪'
  
  // 6. Malt patterns
  const maltNames = [
    'malt', 'pilsner', 'pilsen', 'munich', 'vienna', 'pale ale',
    'wheat', 'rye', 'oat', 'barley',
    'caramel', 'crystal', 'cara', 'chocolate', 'black', 'roast',
    'biscuit', 'aromatic', 'melanoidin', 'honey malt', 'victory',
    'special b', 'abbey', 'smoked', 'rauch', 'peated',
    'ალაო', 'მარცვლეული'  // Georgian words for malt/grain
  ]
  if (maltNames.some(m => lowerName.includes(m))) return '🌾'
  
  // 7. Water chemistry
  const waterChemNames = [
    'gypsum', 'calcium', 'chloride', 'sulfate', 'acid', 'lactic',
    'phosphoric', 'campden', 'salt', 'magnesium', 'bicarbonate', 'chalk',
    'წყლის ქიმია', 'წყალი'
  ]
  if (waterChemNames.some(w => lowerName.includes(w))) return '💧'
  
  // 8. Adjuncts
  const adjunctNames = [
    'sugar', 'dextrose', 'honey', 'molasses', 'candi',
    'lactose', 'maltodextrin',
    'irish moss', 'whirlfloc', 'gelatin', 'biofine',
    'coriander', 'orange peel', 'spice'
  ]
  if (adjunctNames.some(a => lowerName.includes(a))) return '🧫'
  
  return '📦' // Default fallback
}

const STATUS_CONFIG: Record<StockStatus, { label: string; color: string; bgColor: string }> = {
  ok: { label: 'ნორმალური', color: 'text-green-400', bgColor: 'bg-green-400/20' },
  low: { label: 'დაბალი', color: 'text-amber-400', bgColor: 'bg-amber-400/20' },
  critical: { label: 'კრიტიკული', color: 'text-orange-400', bgColor: 'bg-orange-400/20' },
  out: { label: 'ამოწურული', color: 'text-red-400', bgColor: 'bg-red-400/20' },
}




export default function InventoryPage() {

  const router = useRouter()
  
  // Hydration check
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Get ingredients from store (or use mock if store is empty)
  const storeIngredients = useBreweryStore(state => state.ingredients)
  const [kegs, setKegs] = useState<any[]>([])
  const labels = useBreweryStore(state => state.labels || [])
  const bottles = useBreweryStore(state => state.bottles || [])
  
  // Get tab from URL parameter
  const searchParams = useSearchParams()
  const tabFromUrl = searchParams.get('tab')
  
  // New state for tabs and modals
  const [activeTab, setActiveTab] = useState<'ingredients' | 'kegs' | 'packaging' | 'cleaning'>(
    (tabFromUrl as any) || 'ingredients'
  )
  
  const addIngredient = useBreweryStore(state => state.addIngredient)
  const updateIngredient = useBreweryStore(state => state.updateIngredient)
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [isLoadingInventory, setIsLoadingInventory] = useState(true)

  const [categoryFilter, setCategoryFilter] = useState<IngredientCategory>('all')

  const [searchQuery, setSearchQuery] = useState('')
  
  // Fetch kegs from API
  useEffect(() => {
    const fetchKegs = async () => {
      try {
        const res = await fetch('/api/kegs')
        if (res.ok) {
          const data = await res.json()
          setKegs(data.kegs || [])
        }
      } catch (error) {
        console.error('Failed to fetch kegs:', error)
      }
    }
    if (activeTab === 'kegs') {
      fetchKegs()
    }
  }, [activeTab])
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [selectedIngredientCategory, setSelectedIngredientCategory] = useState<IngredientCategoryType | null>(null)
  const [preselectedCategory, setPreselectedCategory] = useState<IngredientCategoryType | null>(null)
  const [showPickerModal, setShowPickerModal] = useState(false)
  const [showAddIngredientModal, setShowAddIngredientModal] = useState(false)
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<InventoryItem | null>(null)
  const [selectedItemForEdit, setSelectedItemForEdit] = useState<any>(null)
  const [cleaningSupplies, setCleaningSupplies] = useState<any[]>([])
  const [capsStats, setCapsStats] = useState({ total: 0, caps26mm: 0, caps29mm: 0, lowStock: 0 })
  const [labelStatsApi, setLabelStatsApi] = useState({ total: 0, types: 0, lowStock: 0 })
  const [bottleStatsApi, setBottleStatsApi] = useState({ total: 0, bottle500: 0, bottle330: 0, can500: 0, can330: 0, lowStock: 0 })
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false)
  const [selectedItemForPurchase, setSelectedItemForPurchase] = useState<any>(null)
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [inventoryItems, setInventoryItems] = useState<any[]>([])

  // Helper function to transform API response to Ingredient format
  const transformApiItemToIngredient = (item: any): Ingredient => {
    // Map database category to page category
    const dbCategory = (item.category || '').toLowerCase()
    let pageCategory: IngredientCategory = 'adjunct'
    
    // First check ingredientType field (most reliable)
    if (item.ingredientType) {
      const ingredientType = item.ingredientType.toUpperCase()
      if (ingredientType === 'MALT') pageCategory = 'grain'
      else if (ingredientType === 'HOPS') pageCategory = 'hop'
      else if (ingredientType === 'YEAST') pageCategory = 'yeast'
      else if (ingredientType === 'ADJUNCT') pageCategory = 'adjunct'
      else if (ingredientType === 'WATER_CHEMISTRY') pageCategory = 'water_chemistry'
    } else if (dbCategory === 'raw_material') {
      // Fallback: Determine sub-category from name patterns
      const name = (item.name || '').toLowerCase()
      const sku = (item.sku || '').toLowerCase()
      
      // Hops detection (comprehensive list)
      const hopPatterns = [
        'hop', 'citra', 'cascade', 'centennial', 'simcoe', 'mosaic', 'amarillo',
        'saaz', 'hallertau', 'hallertauer', 'tettnang', 'spalt', 'perle', 'hersbrucker',
        'fuggle', 'golding', 'northern brewer', 'chinook', 'columbus', 'warrior',
        'magnum', 'galaxy', 'nelson', 'motueka', 'rakau', 'mittelfrüh', 'mittelfrueh',
        'premiant', 'sládek', 'challenger', 'northdown', 'target', 'nugget', 'willamette'
      ]
      if (hopPatterns.some(pattern => name.includes(pattern)) || sku.includes('hop')) {
        pageCategory = 'hop'
      }
      // Yeast detection
      else if (name.includes('yeast') || name.includes('safale') || name.includes('saflager') || 
               name.includes('wlp') || name.includes('wyeast') || name.includes('fermentis') ||
               name.includes('lallemand') || name.includes('us-05') || name.includes('s-04') ||
               sku.includes('yeast')) {
        pageCategory = 'yeast'
      }
      // Malt detection
      else if (name.includes('malt') || name.includes('grain') || name.includes('pilsner') || 
               name.includes('munich') || name.includes('vienna') || name.includes('wheat') ||
               name.includes('crystal') || name.includes('caramel') || name.includes('roasted') ||
               sku.includes('malt') || sku.includes('grain')) {
        pageCategory = 'grain'
      }
      // Water chemistry detection
      else if (name.includes('gypsum') || name.includes('calcium') || name.includes('chloride') ||
               name.includes('sulfate') || name.includes('acid') || name.includes('lactic') ||
               name.includes('phosphoric') || name.includes('campden') || name.includes('salt') ||
               name.includes('magnesium') || name.includes('bicarbonate') || name.includes('chalk') ||
               name.includes('caso4') || name.includes('cacl') || name.includes('water') ||
               sku.includes('chem') || sku.includes('water')) {
        pageCategory = 'water_chemistry'
      } else {
        pageCategory = 'adjunct'
      }
    } else if (dbCategory === 'packaging') {
      pageCategory = 'packaging'
    }
    
    return {
      id: item.id, // Use real database ID (CUID)
      name: item.name,
      category: pageCategory,
      ingredientType: item.ingredientType || undefined,
      currentStock: item.balance || 0,
      minStock: item.reorderPoint || 0,
      unit: item.unit,
      avgUsagePerWeek: item.reorderPoint ? Math.ceil(item.reorderPoint / 4) : 0,
      lastReceived: item.updatedAt ? new Date(item.updatedAt) : new Date(),
      expiryDate: undefined,
      supplier: item.supplier || '',
      pricePerUnit: item.costPerUnit || 0,
      lotNumber: undefined,
      location: '', // API doesn't return location, use empty string
    }
  }

  // Fetch inventory items from API (real database data)
  const fetchInventory = async () => {
    try {
      setIsLoadingInventory(true)
      const response = await fetch('/api/inventory')
      if (!response.ok) {
        console.error('Failed to fetch inventory:', response.statusText)
        // Fallback to mock data if API fails
        setIngredients(mockIngredients)
        setInventoryItems([])
        return
      }
      
      const data = await response.json()
      const apiItems = data.items || data
      
      // Store raw items for PurchaseModal
      setInventoryItems(apiItems || [])
      
      // Transform API response to Ingredient format
      const transformed = apiItems.map(transformApiItemToIngredient)
      setIngredients(transformed)
    } catch (error) {
      console.error('Error fetching inventory:', error)
      // Fallback to mock data on error
      setIngredients(mockIngredients)
      setInventoryItems([])
    } finally {
      setIsLoadingInventory(false)
    }
  }

  useEffect(() => {
    if (!mounted) return
    fetchInventory()
  }, [mounted])

  // Fetch cleaning supplies
  useEffect(() => {
    const fetchCleaningSupplies = async () => {
      try {
        const response = await fetch('/api/inventory/cleaning')
        if (response.ok) {
          const data = await response.json()
          const supplies = data.supplies || data || []
          setCleaningSupplies(supplies)
        }
      } catch (error) {
        console.error('Error fetching cleaning supplies:', error)
      }
    }
    fetchCleaningSupplies()
  }, [])

  // Fetch suppliers for purchase modal
  const fetchSuppliers = async () => {
    try {
      const res = await fetch('/api/finances/suppliers')
      if (res.ok) {
        const data = await res.json()
        setSuppliers(data.suppliers || [])
      }
    } catch (err) {
      console.error('Failed to fetch suppliers:', err)
    }
  }

  useEffect(() => {
    fetchSuppliers()
  }, [])

  // Handle purchase submit
  const handlePurchaseSubmit = async (data: PurchaseFormData) => {
    try {
      const response = await fetch('/api/inventory/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'შესყიდვა ვერ მოხერხდა')
      }

      const result = await response.json()
      console.log('Purchase created:', result)
      
      setIsPurchaseModalOpen(false)
      setSelectedItemForPurchase(null)
      
      // Refresh inventory
      await fetchInventory()
      
      alert(`✅ შესყიდვა წარმატებით დაფიქსირდა!\n${result.purchase.itemName}: +${result.purchase.quantity} ${result.purchase.unit}`)
      
    } catch (err: any) {
      console.error('Purchase error:', err)
      alert(err.message || 'შესყიდვა ვერ მოხერხდა')
    }
  }

  const openPurchaseModal = (ingredient?: any) => {
    // If ingredient is passed (from table row), find matching inventory item
    if (ingredient && ingredient.id) {
      const matchedItem = inventoryItems.find(i => i.id === ingredient.id)
      setSelectedItemForPurchase(matchedItem || null)
    } else {
      setSelectedItemForPurchase(null)
    }
    setIsPurchaseModalOpen(true)
  }

  // Fetch caps stats
  useEffect(() => {
    const fetchCapsStats = async () => {
      try {
        const res = await fetch('/api/inventory?category=PACKAGING')
        if (res.ok) {
          const data = await res.json()
          const items = data.items || []
          const caps = items.filter((item: any) => 
            item.metadata?.type === 'cap' || 
            (item.name || '').toLowerCase().includes('თავსახური') ||
            (item.name || '').toLowerCase().includes('cap')
          )
          const caps26 = caps.filter((c: any) => c.metadata?.size === '26mm').reduce((sum: number, c: any) => sum + (c.quantity || 0), 0)
          const caps29 = caps.filter((c: any) => c.metadata?.size === '29mm').reduce((sum: number, c: any) => sum + (c.quantity || 0), 0)
          setCapsStats({
            total: caps.reduce((sum: number, c: any) => sum + (c.quantity || 0), 0),
            caps26mm: caps26,
            caps29mm: caps29,
            lowStock: caps.filter((c: any) => (c.quantity || 0) < (c.minStock || 1000)).length
          })
        }
      } catch (error) {
        console.error('Failed to fetch caps stats:', error)
      }
    }
    // if (activeTab === 'caps') fetchCapsStats() // Removed - 'caps' tab not in type
  }, [activeTab])

  // Fetch labels stats from API
  useEffect(() => {
    const fetchLabelStats = async () => {
      try {
        const res = await fetch('/api/inventory?category=PACKAGING')
        if (res.ok) {
          const data = await res.json()
          const items = data.items || []
          const labels = items.filter((item: any) => 
            item.metadata?.type === 'label' || 
            (item.name || '').toLowerCase().includes('ეტიკეტი') ||
            (item.name || '').toLowerCase().includes('label')
          )
          setLabelStatsApi({
            total: labels.reduce((sum: number, l: any) => sum + (l.quantity || 0), 0),
            types: labels.length,
            lowStock: labels.filter((l: any) => (l.quantity || 0) < (l.minStock || 500)).length
          })
        }
      } catch (error) {
        console.error('Failed to fetch label stats:', error)
      }
    }
    // if (activeTab === 'labels') fetchLabelStats() // Removed - 'labels' tab not in type
  }, [activeTab])

  // Fetch bottles stats from API
  useEffect(() => {
    const fetchBottleStats = async () => {
      try {
        // BOTTLE and CAN are stored as PACKAGING with metadata.type
        const res = await fetch('/api/inventory?category=PACKAGING')
        const data = res.ok ? await res.json() : { items: [] }
        const allItems = data.items || []
        
        console.log('[fetchBottleStats] allItems:', allItems)
        
        // Filter by metadata.type - BottlesSection uses metadata.type: 'bottle' or 'can', and metadata.bottleType: 'bottle_500', etc.
        const bottles = allItems.filter((item: any) => {
          const type = item.metadata?.type || ''
          const bottleType = item.metadata?.bottleType || ''
          const name = (item.name || '').toLowerCase()
          // Check if it's a bottle: metadata.type === 'bottle' OR metadata.bottleType starts with 'bottle_' OR name contains 'ბოთლი'
          return type === 'bottle' || 
                 bottleType.startsWith('bottle_') ||
                 (item.category === 'PACKAGING' && !type && !bottleType && name.includes('ბოთლი'))
        })
        
        const cans = allItems.filter((item: any) => {
          const type = item.metadata?.type || ''
          const bottleType = item.metadata?.bottleType || ''
          const name = (item.name || '').toLowerCase()
          // Check if it's a can: metadata.type === 'can' OR metadata.bottleType starts with 'can_' OR name contains 'ქილა'
          return type === 'can' || 
                 bottleType.startsWith('can_') ||
                 (item.category === 'PACKAGING' && !type && !bottleType && name.includes('ქილა'))
        })
        
        console.log('[fetchBottleStats] bottles:', bottles)
        console.log('[fetchBottleStats] cans:', cans)
        
        // Debug: Log each item
        bottles.forEach((b: any, idx: number) => {
          console.log(`[fetchBottleStats] bottles[${idx}]:`, {
            name: b.name,
            type: b.metadata?.type,
            bottleType: b.metadata?.bottleType,
            quantity: b.quantity,
            category: b.category
          })
        })
        
        cans.forEach((c: any, idx: number) => {
          console.log(`[fetchBottleStats] cans[${idx}]:`, {
            name: c.name,
            type: c.metadata?.type,
            bottleType: c.metadata?.bottleType,
            quantity: c.quantity,
            category: c.category
          })
        })
        
        // Calculate by metadata.type (prioritize type, then check name patterns)
        let bottle500 = 0, bottle330 = 0, can500 = 0, can330 = 0
        
        bottles.forEach((b: any) => {
          const bottleType = b.metadata?.bottleType || ''
          const qty = b.quantity || 0
          const name = (b.name || '').toLowerCase()
          
          // Prioritize metadata.bottleType (bottle_500, bottle_330)
          if (bottleType === 'bottle_500') {
            bottle500 += qty
            console.log(`[fetchBottleStats] bottle500 += ${qty} from:`, b.name)
          } else if (bottleType === 'bottle_330') {
            bottle330 += qty
            console.log(`[fetchBottleStats] bottle330 += ${qty} from:`, b.name)
          } else {
            // Fallback to name patterns (only if bottleType is not set)
            if (name.includes('500') && !name.includes('330')) {
              bottle500 += qty
              console.log(`[fetchBottleStats] bottle500 += ${qty} from name pattern:`, b.name)
            } else if (name.includes('330') && !name.includes('500')) {
              bottle330 += qty
              console.log(`[fetchBottleStats] bottle330 += ${qty} from name pattern:`, b.name)
            } else {
              console.log(`[fetchBottleStats] Skipped bottle (no match):`, b.name, 'bottleType:', bottleType, 'name:', name)
            }
          }
        })
        
        cans.forEach((c: any) => {
          const bottleType = c.metadata?.bottleType || ''
          const qty = c.quantity || 0
          const name = (c.name || '').toLowerCase()
          
          // Prioritize metadata.bottleType (can_500, can_330)
          if (bottleType === 'can_500') {
            can500 += qty
            console.log(`[fetchBottleStats] can500 += ${qty} from:`, c.name)
          } else if (bottleType === 'can_330') {
            can330 += qty
            console.log(`[fetchBottleStats] can330 += ${qty} from:`, c.name)
          } else {
            // Fallback to name patterns (only if bottleType is not set)
            if (name.includes('500') && !name.includes('330')) {
              can500 += qty
              console.log(`[fetchBottleStats] can500 += ${qty} from name pattern:`, c.name)
            } else if (name.includes('330') && !name.includes('500')) {
              can330 += qty
              console.log(`[fetchBottleStats] can330 += ${qty} from name pattern:`, c.name)
            } else {
              console.log(`[fetchBottleStats] Skipped can (no match):`, c.name, 'bottleType:', bottleType, 'name:', name)
            }
          }
        })
        
        const total = bottle500 + bottle330 + can500 + can330
        const lowStock = [...bottles, ...cans].filter((b: any) => (b.quantity || 0) < (b.minStock || 100)).length
        
        console.log('[fetchBottleStats] Result:', { total, bottle500, bottle330, can500, can330, lowStock })
        
        setBottleStatsApi({ total, bottle500, bottle330, can500, can330, lowStock })
      } catch (error) {
        console.error('Failed to fetch bottle stats:', error)
      }
    }
    // if (activeTab === 'bottles') fetchBottleStats() // Removed - 'bottles' tab not in type
  }, [activeTab])

  // Safe array operations - always ensure arrays exist
  const safeIngredients = ingredients || []

  const filteredIngredients = safeIngredients.filter(ing => {
    // Exclude packaging items from ingredients tab
    if (ing.category === 'packaging') return false

    if (categoryFilter !== 'all' && ing.category !== categoryFilter) return false

    if (searchQuery && !ing.name.toLowerCase().includes(searchQuery.toLowerCase())) return false

    return true

  })



  // Filter out packaging for stats (ingredients only)
  const ingredientOnly = safeIngredients.filter(i => i.category !== 'packaging')

  const stats = {

    total: ingredientOnly.length,

    lowStock: ingredientOnly.filter(i => getStockStatus(i.currentStock, i.minStock) === 'low').length,

    critical: ingredientOnly.filter(i => getStockStatus(i.currentStock, i.minStock) === 'critical').length,

    outOfStock: ingredientOnly.filter(i => getStockStatus(i.currentStock, i.minStock) === 'out').length,

    totalValue: ingredientOnly.reduce((sum, i) => sum + (i.currentStock * i.pricePerUnit), 0),

  }
  
  // Category summary (ingredients only, no packaging)
  const categorySummary = {
    grain: ingredientOnly.filter(i => i.category === 'grain'),
    hop: ingredientOnly.filter(i => i.category === 'hop'),
    yeast: ingredientOnly.filter(i => i.category === 'yeast'),
    adjunct: ingredientOnly.filter(i => i.category === 'adjunct'),
    water_chemistry: ingredientOnly.filter(i => i.category === 'water_chemistry'),
  }
  
  // Keg stats (for when kegs tab is active) - using API status values
  const kegStats = {
    total: kegs.length,
    empty: kegs.filter(k => k.status === 'AVAILABLE').length,
    filled: kegs.filter(k => k.status === 'FILLED').length,
    inUse: kegs.filter(k => k.status === 'WITH_CUSTOMER').length,
    cleaning: kegs.filter(k => k.status === 'CLEANING').length,
    damaged: kegs.filter(k => k.status === 'DAMAGED').length,
  }
  
  // Label stats (for when labels tab is active)
  const labelStats = {
    total: labels.reduce((sum, l) => sum + l.quantity, 0),
    types: labels.length,
    lowStock: labels.filter(l => l.quantity < (l.minStock || 0)).length,
  }
  
  // Bottle stats (for when bottles tab is active)
  const bottleStats = {
    total: bottles.reduce((sum, b) => sum + b.quantity, 0),
    bottle500: bottles.filter(b => b.type === 'bottle_500').reduce((s, b) => s + b.quantity, 0),
    bottle330: bottles.filter(b => b.type === 'bottle_330').reduce((s, b) => s + b.quantity, 0),
    can500: bottles.filter(b => b.type === 'can_500').reduce((s, b) => s + b.quantity, 0),
    can330: bottles.filter(b => b.type === 'can_330').reduce((s, b) => s + b.quantity, 0),
    lowStock: bottles.filter(b => b.quantity < b.minStock).length,
  }

  // Cleaning supplies stats (for when cleaning tab is active)
  const cleaningStats = {
    total: cleaningSupplies.length,
    lowStock: cleaningSupplies.filter((s: any) => getStockStatus(Number(s.currentStock || 0), Number(s.minStock || s.reorderPoint || 0)) === 'low').length,
    critical: cleaningSupplies.filter((s: any) => getStockStatus(Number(s.currentStock || 0), Number(s.minStock || s.reorderPoint || 0)) === 'critical').length,
    outOfStock: cleaningSupplies.filter((s: any) => getStockStatus(Number(s.currentStock || 0), Number(s.minStock || s.reorderPoint || 0)) === 'out').length,
    totalValue: cleaningSupplies.reduce((sum: number, s: any) => sum + (Number(s.currentStock || 0) * Number(s.pricePerUnit || s.costPerUnit || 0)), 0),
  }



  const alerts = [

    ...safeIngredients

      .filter(i => getStockStatus(i.currentStock, i.minStock) !== 'ok')

      .map(i => ({

        type: getStockStatus(i.currentStock, i.minStock),

        message: `${i.name} - ${i.currentStock === 0 ? 'ამოიწურა!' : `მარაგი დაბალია (${i.currentStock} ${i.unit})`}`,

        ingredient: i,

      })),

    ...safeIngredients

      .filter(i => i.expiryDate && i.expiryDate.getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000)

      .map(i => ({

        type: 'warning' as const,

        message: `${i.name} - ვადა იწურება ${formatDate(i.expiryDate!)}`,

        ingredient: i,

      })),

  ]



  const getWeeksRemaining = (current: number, avgUsage: number) => {

    if (avgUsage === 0) return Infinity

    return Math.floor(current / avgUsage)

  }



  // Loading state during hydration
  if (!mounted) {
    return (
      <DashboardLayout title="მარაგები" breadcrumb="მთავარი / მარაგები">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-copper"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (

    <DashboardLayout title="მარაგები" breadcrumb="მთავარი / მარაგები">

      {/* Stats Row */}
      {activeTab === 'kegs' ? (
        <div className="grid grid-cols-6 gap-4 mb-6">
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <p className="text-2xl font-bold font-display text-copper-light">{kegStats.total}</p>
            <p className="text-xs text-text-muted">სულ კეგი</p>
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <p className="text-2xl font-bold font-display text-green-400">{kegStats.filled}</p>
            <p className="text-xs text-text-muted">სავსე</p>
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <p className="text-2xl font-bold font-display text-slate-400">{kegStats.empty}</p>
            <p className="text-xs text-text-muted">ცარიელი</p>
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <p className="text-2xl font-bold font-display text-blue-400">{kegStats.inUse}</p>
            <p className="text-xs text-text-muted">გამოყენებაში</p>
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <p className="text-2xl font-bold font-display text-yellow-400">{kegStats.cleaning}</p>
            <p className="text-xs text-text-muted">რეცხვა</p>
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <p className="text-2xl font-bold font-display text-red-400">{kegStats.damaged}</p>
            <p className="text-xs text-text-muted">დაზიანებული</p>
          </div>
        </div>
      ) : activeTab === 'packaging' ? (
        null // Stats are shown inside PackagingMaterialsSection
      ) : activeTab === 'cleaning' ? (
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <p className="text-2xl font-bold font-display text-copper-light">{cleaningStats.total}</p>
            <p className="text-xs text-text-muted">სულ პროდუქტი</p>
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <p className="text-2xl font-bold font-display text-amber-400">{cleaningStats.lowStock}</p>
            <p className="text-xs text-text-muted">დაბალი მარაგი</p>
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <p className="text-2xl font-bold font-display text-orange-400">{cleaningStats.critical}</p>
            <p className="text-xs text-text-muted">კრიტიკული</p>
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <p className="text-2xl font-bold font-display text-red-400">{cleaningStats.outOfStock}</p>
            <p className="text-xs text-text-muted">ამოწურული</p>
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <p className="text-2xl font-bold font-display">{cleaningStats.totalValue.toFixed(0)}₾</p>
            <p className="text-xs text-text-muted">მარაგის ღირებულება</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <p className="text-2xl font-bold font-display text-copper-light">{stats.total}</p>
            <p className="text-xs text-text-muted">სულ პროდუქტი</p>
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <p className="text-2xl font-bold font-display text-amber-400">{stats.lowStock}</p>
            <p className="text-xs text-text-muted">დაბალი მარაგი</p>
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <p className="text-2xl font-bold font-display text-orange-400">{stats.critical}</p>
            <p className="text-xs text-text-muted">კრიტიკული</p>
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <p className="text-2xl font-bold font-display text-red-400">{stats.outOfStock}</p>
            <p className="text-xs text-text-muted">ამოწურული</p>
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <p className="text-2xl font-bold font-display">{stats.totalValue.toLocaleString()}₾</p>
            <p className="text-xs text-text-muted">მარაგის ღირებულება</p>
          </div>
        </div>
      )}



      <div className="space-y-6">

        {/* Tabs - Always visible */}
        <div className="flex justify-between items-center flex-wrap gap-4">
          {/* Tabs */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setActiveTab('ingredients')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                activeTab === 'ingredients' 
                  ? 'bg-copper text-white' 
                  : 'bg-slate-700 hover:bg-slate-600 text-white'
              }`}
            >
              🌾 ინგრედიენტები
            </button>
            <button
              onClick={() => setActiveTab('kegs')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                activeTab === 'kegs' 
                  ? 'bg-copper text-white' 
                  : 'bg-slate-700 hover:bg-slate-600 text-white'
              }`}
            >
              🛢️ კეგები
            </button>
            <button
              onClick={() => setActiveTab('packaging')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                activeTab === 'packaging' 
                  ? 'bg-copper text-white' 
                  : 'bg-slate-700 hover:bg-slate-600 text-white'
              }`}
            >
              📦 შესაფუთი მასალები
            </button>
            <button
              onClick={() => setActiveTab('cleaning')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                activeTab === 'cleaning' 
                  ? 'bg-copper text-white' 
                  : 'bg-slate-700 hover:bg-slate-600 text-white'
              }`}
            >
              🧹 რეცხვის საშუალებები
            </button>
          </div>
        </div>

        {/* Filters - Only for ingredients tab */}
        {activeTab === 'ingredients' && (
          <div className="flex justify-between items-center">
            <div className="flex gap-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="ძიება..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-bg-tertiary border border-border rounded-lg text-sm w-64 focus:border-copper focus:outline-none"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">🔍</span>
              </div>
              <div className="flex gap-1 bg-bg-tertiary rounded-lg p-1">
                {(Object.keys(CATEGORY_CONFIG).filter(cat => cat !== 'packaging') as IngredientCategory[]).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-md text-sm transition-all ${
                      categoryFilter === cat
                        ? 'bg-copper text-white'
                        : 'hover:bg-bg-card'
                    }`}
                  >
                    {CATEGORY_CONFIG[cat].icon}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <Button 
                variant="primary" 
                size="sm"
                onClick={() => setShowCategoryModal(true)}
              >
                + ინგრედიენტის დამატება
              </Button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="space-y-6">

          {/* Ingredients Tab */}
          {activeTab === 'ingredients' && (
            <>
              {/* Ingredients List */}

              <Card>

            <CardHeader>
              <div className="flex items-center justify-between">
                <span>📦 მარაგები ({filteredIngredients.length})</span>
              </div>
            </CardHeader>

            <CardBody className="p-0">
              {/* Loading State */}
              {isLoadingInventory && (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-copper"></div>
                  <span className="ml-3 text-text-muted">ინგრედიენტების ჩატვირთვა...</span>
                </div>
              )}

              {!isLoadingInventory && (
              <table className="w-full">

                <thead>

                  <tr className="bg-bg-tertiary text-left text-xs text-text-muted">

                    <th className="px-4 py-3">პროდუქტი</th>

                    <th className="px-4 py-3">მარაგი</th>

                    <th className="px-4 py-3">სტატუსი</th>

                    <th className="px-4 py-3">საკმარისია</th>

                    <th className="px-4 py-3">მომწოდებელი</th>

                    <th className="px-4 py-3">ადგილი</th>

                    <th className="px-4 py-3"></th>

                  </tr>

                </thead>

                <tbody>

                  {filteredIngredients.map(ing => {

                    const status = getStockStatus(ing.currentStock, ing.minStock)

                    const weeksRemaining = getWeeksRemaining(ing.currentStock, ing.avgUsagePerWeek)

                    const stockPercent = Math.min(100, (ing.currentStock / (ing.minStock * 2)) * 100)

                    

                    return (

                      <tr 

                        key={ing.id} 

                        className="border-b border-border/50 hover:bg-bg-tertiary/50 transition-colors"

                      >

                        <td className="px-4 py-3 cursor-pointer" onClick={() => router.push(`/inventory/${ing.id}`)}>

                          <div className="flex items-center gap-3">

                            <span className="text-xl">{getIngredientIconFromName(ing.name, ing.category, ing.ingredientType)}</span>

                            <div>

                              <p className="font-medium">{ing.name}</p>

                              {ing.lotNumber && (

                                <p className="text-xs text-text-muted font-mono">{ing.lotNumber}</p>

                              )}

                            </div>

                          </div>

                        </td>

                        <td className="px-4 py-3">

                          <div className="w-32">

                            <div className="flex justify-between text-sm mb-1">

                              <span className="font-mono">{ing.currentStock}</span>

                              <span className="text-text-muted">{ing.unit}</span>

                            </div>

                            <ProgressBar 

                              value={stockPercent} 

                              size="sm" 

                              color={status === 'ok' ? 'success' : status === 'low' ? 'warning' : 'danger'}

                            />

                            <p className="text-[10px] text-text-muted mt-1">მინ: {ing.minStock}</p>

                          </div>

                        </td>

                        <td className="px-4 py-3">

                          <span className={`inline-flex px-2 py-1 rounded-full text-xs ${STATUS_CONFIG[status].bgColor} ${STATUS_CONFIG[status].color}`}>

                            {STATUS_CONFIG[status].label}

                          </span>

                        </td>

                        <td className="px-4 py-3 text-sm">

                          {weeksRemaining === Infinity ? '∞' : `~${weeksRemaining} კვირა`}

                        </td>

                        <td className="px-4 py-3 text-sm text-text-secondary">{ing.supplier}</td>

                        <td className="px-4 py-3">

                          <span className="px-2 py-1 bg-bg-tertiary rounded text-xs font-mono">{ing.location}</span>

                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/inventory/${ing.id}`)
                              }}
                              className="text-text-muted hover:text-copper-light transition-colors"
                            >
                              →
                            </button>
                          </div>
                        </td>

                      </tr>

                    )

                  })}

                </tbody>

              </table>
              )}

            </CardBody>

          </Card>
            </>
          )}

          {/* Kegs Tab */}
          {activeTab === 'kegs' && (
            <KegManagementSection />
          )}

          {/* Packaging Materials Tab */}
          {activeTab === 'packaging' && (
            <PackagingMaterialsSection />
          )}

          {/* Cleaning Supplies Tab */}
          {activeTab === 'cleaning' && (
            <CleaningSuppliesSection />
          )}

        </div>

      </div>

      {/* Step 1: Category Selection Modal */}
      <CategorySelectorModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onSelectCategory={(category) => {
          setSelectedIngredientCategory(category)
          setPreselectedCategory(category)
          setShowCategoryModal(false)
          setShowPickerModal(true)
        }}
      />

      {/* Step 2: Ingredient Picker Modal */}
      {showPickerModal && (
        <IngredientPickerModal
          isOpen={showPickerModal}
          onClose={() => {
            setShowPickerModal(false)
            setSelectedIngredientCategory(null) // Reset category when closing
          }}
          onBack={() => {
            setShowPickerModal(false)
            setShowCategoryModal(true) // Go back to category selection
          }}
          onSelect={(item) => {
            console.log('[page.tsx] Item selected from picker:', item)
            if (item) {
              // Item selected from catalog/library
              // Check if it's from catalog (has catalogId-like id) or existing inventory item
              const isCatalogItem = item.id && (item.id.startsWith('malt_') || item.id.startsWith('hop_') || item.balance === 0)
              
              console.log('[page.tsx] isCatalogItem:', isCatalogItem, 'item.id:', item.id, 'item.balance:', item.balance)
              
              if (isCatalogItem) {
                // Catalog item - use for pre-filling form
                console.log('[page.tsx] Setting selectedCatalogItem:', item)
                setSelectedCatalogItem(item)
                setSelectedItemForEdit(null) // Clear edit item
              } else {
                // Existing inventory item - edit mode
                console.log('[page.tsx] Setting selectedItemForEdit:', item)
                setSelectedItemForEdit(item)
                setSelectedCatalogItem(null) // Clear catalog item
              }
              setShowAddIngredientModal(true)
            } else {
              // Create new - empty form
              console.log('[page.tsx] Creating new item (null)')
              setSelectedCatalogItem(null)
              setSelectedItemForEdit(null)
              setShowAddIngredientModal(true)
            }
            setShowPickerModal(false)
          }}
          category={selectedIngredientCategory || undefined}
        />
      )}

      {/* Step 3: Add/Edit Ingredient Form Modal */}
      {showAddIngredientModal && (
        <AddIngredientModal
          isOpen={showAddIngredientModal}
          onClose={() => {
            console.log('[page.tsx] Closing modal, clearing items')
            setShowAddIngredientModal(false)
            setSelectedItemForEdit(null)
            setSelectedCatalogItem(null)
            setSelectedIngredientCategory(null) // Reset category when closing
            setPreselectedCategory(null) // Reset preselected category
          }}
          onBack={() => {
            setShowAddIngredientModal(false)
            setShowPickerModal(true) // Go back to ingredient picker
          }}
          selectedCatalogItem={selectedCatalogItem}
          existingItem={selectedItemForEdit}
          preselectedCategory={preselectedCategory}
          onSave={async (formData: IngredientFormData) => {
            try {
              console.log('[page.tsx] Saving ingredient:', formData)
              const isEditing = !!selectedItemForEdit
              
              // Map category to API format (RAW_MATERIAL, PACKAGING, etc.)
              const mapCategoryToApi = (cat: string): string => {
                if (!cat) return 'RAW_MATERIAL'
                const upperCat = cat.toUpperCase()
                // All ingredient categories map to RAW_MATERIAL
                if (['MALT', 'HOPS', 'YEAST', 'ADJUNCT', 'WATER_CHEMISTRY', 'HOP', 'GRAIN'].includes(upperCat)) {
                  return 'RAW_MATERIAL'
                }
                // Check if already a valid API category
                if (['RAW_MATERIAL', 'PACKAGING', 'FINISHED_GOOD', 'CONSUMABLE'].includes(upperCat)) {
                  return upperCat
                }
                return 'RAW_MATERIAL'
              }
              
              let response: Response
              
              if (isEditing && selectedItemForEdit?.id) {
                // Update existing item - no expense creation
                const payload = {
                  name: formData.name,
                  category: mapCategoryToApi(formData.category || 'RAW_MATERIAL'),
                  unit: formData.unit || 'kg',
                  supplier: formData.supplier || undefined,
                  reorderPoint: formData.reorderPoint ? Number(formData.reorderPoint) : undefined,
                  costPerUnit: formData.costPerUnit ? Number(formData.costPerUnit) : undefined,
                }
                
                console.log('[page.tsx] PUT payload:', payload)
                
                response = await fetch(`/api/inventory/${selectedItemForEdit.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload),
                })
                
                if (!response.ok) {
                  const error = await response.json()
                  console.error('[page.tsx] API error:', error)
                  throw new Error(error.error || error.message || 'შენახვა ვერ მოხერხდა')
                }
                
              } else {
                // Create new item
                const sku = `ING-${Date.now()}`
                const createPayload = {
                  sku: sku,
                  name: formData.name,
                  category: mapCategoryToApi(formData.category || 'RAW_MATERIAL'),
                  ingredientType: formData.ingredientType || undefined,
                  unit: formData.unit || 'kg',
                  supplier: formData.supplier || undefined,
                  reorderPoint: formData.reorderPoint ? Number(formData.reorderPoint) : undefined,
                  costPerUnit: formData.costPerUnit ? Number(formData.costPerUnit) : undefined,
                  // Don't include quantity here - we'll add it via purchase API
                  quantity: 0,
                }
                
                console.log('[page.tsx] POST payload (create item):', createPayload)
                
                // Step 1: Create the inventory item first
                response = await fetch('/api/inventory', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(createPayload),
                })
                
                if (!response.ok) {
                  const error = await response.json()
                  console.error('[page.tsx] API error:', error)
                  throw new Error(error.error || error.message || 'შენახვა ვერ მოხერხდა')
                }
                
                const createResult = await response.json()
                console.log('[page.tsx] Item created:', createResult)
                
                // Step 2: If there's initial quantity, create purchase record (with optional expense)
                if (formData.inventoryAmount && formData.inventoryAmount > 0) {
                  const itemId = createResult.item?.id || createResult.id
                  
                  if (!itemId) {
                    console.error('[page.tsx] No item ID returned from create')
                    throw new Error('ინგრედიენტი შეიქმნა, მაგრამ ID ვერ მოიძებნა')
                  }
                  
                  const purchasePayload = {
                    itemId: itemId,
                    quantity: Number(formData.inventoryAmount),
                    unitPrice: formData.costPerUnit ? Number(formData.costPerUnit) : 0,
                    totalAmount: formData.costPerUnit 
                      ? Number(formData.inventoryAmount) * Number(formData.costPerUnit) 
                      : 0,
                    supplierId: formData.supplierId || undefined,
                    date: new Date().toISOString().split('T')[0],
                    invoiceNumber: formData.invoiceNumber || undefined,
                    notes: formData.notes || `საწყისი მარაგი: ${formData.name}`,
                    createExpense: formData.createExpense ?? false,
                    isPaid: formData.isPaid ?? false,
                    paymentMethod: formData.paymentMethod || 'BANK_TRANSFER',
                  }
                  
                  console.log('[page.tsx] Purchase payload:', purchasePayload)
                  
                  const purchaseResponse = await fetch('/api/inventory/purchase', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(purchasePayload),
                  })
                  
                  if (!purchaseResponse.ok) {
                    const purchaseError = await purchaseResponse.json()
                    console.error('[page.tsx] Purchase API error:', purchaseError)
                    // Item was created but purchase failed - show warning but don't throw
                    alert(`⚠️ ინგრედიენტი შეიქმნა, მაგრამ შესყიდვის დაფიქსირება ვერ მოხერხდა: ${purchaseError.error || 'Unknown error'}`)
                  } else {
                    const purchaseResult = await purchaseResponse.json()
                    console.log('[page.tsx] Purchase recorded:', purchaseResult)
                  }
                }
              }
              
              // Close modal and reset state
              setShowAddIngredientModal(false)
              setSelectedItemForEdit(null)
              setSelectedCatalogItem(null)
              setSelectedIngredientCategory(null)
              
              // Refresh inventory list from API to show new/updated item
              await fetchInventory()
              
            } catch (error) {
              console.error('[page.tsx] Save error:', error)
              alert(error instanceof Error ? error.message : 'შენახვა ვერ მოხერხდა')
            }
          }}
          suppliers={suppliers}
          onSupplierCreated={fetchSuppliers}
        />
      )}

      {/* Purchase Modal */}
      <PurchaseModal
        isOpen={isPurchaseModalOpen}
        onClose={() => {
          setIsPurchaseModalOpen(false)
          setSelectedItemForPurchase(null)
        }}
        onSubmit={handlePurchaseSubmit}
        item={selectedItemForPurchase ? {
          id: selectedItemForPurchase.id,
          name: selectedItemForPurchase.name,
          unit: selectedItemForPurchase.unit,
          category: selectedItemForPurchase.category,
          balance: Number(selectedItemForPurchase.cachedBalance || selectedItemForPurchase.balance || 0),
          costPerUnit: selectedItemForPurchase.costPerUnit ? Number(selectedItemForPurchase.costPerUnit) : null,
          supplier: selectedItemForPurchase.supplier || null,
        } : null}
        items={inventoryItems.map(item => ({
          id: item.id,
          name: item.name,
          unit: item.unit,
          category: item.category,
          balance: Number(item.cachedBalance || item.balance || 0),
          costPerUnit: item.costPerUnit ? Number(item.costPerUnit) : null,
          supplier: item.supplier || null,
        }))}
        suppliers={suppliers}
        onSupplierCreated={fetchSuppliers}
      />
    </DashboardLayout>

  )

}