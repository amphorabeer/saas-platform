'use client'



import { useState, useEffect, useMemo } from 'react'

import { useParams, useRouter } from 'next/navigation'

import { DashboardLayout } from '@/components/layout'

import { Card, CardHeader, CardBody, Button, ProgressBar } from '@/components/ui'

import { useBreweryStore } from '@/store'
import { AddIngredientModal, type IngredientFormData } from '@/components/inventory'

import { formatDate, formatTime } from '@/lib/utils'
import libraryData from '@/data/ingredient-library.eu.json'
import type { Ingredient } from '../page'

// Georgian translations for categories and types
const TRANSLATIONS = {
  // Main categories
  categories: {
    RAW_MATERIAL: 'ნედლეული',
    MALT: 'მარცვლეული',
    HOPS: 'სვია',
    YEAST: 'საფუარი',
    ADJUNCT: 'დანამატები',
    WATER_CHEMISTRY: 'წყლის ქიმია',
    PACKAGING: 'შეფუთვა',
    FINISHED_GOOD: 'მზა პროდუქტი',
    CONSUMABLE: 'სახარჯი მასალა',
  },
  
  // Malt types
  maltTypes: {
    base: 'საბაზო',
    caramel: 'კარამელის',
    roasted: 'შემწვარი',
    specialty: 'სპეციალური',
    smoked: 'შებოლილი',
    acidulated: 'მჟავიანი',
  },
  
  // Hop purposes
  hopPurposes: {
    bittering: 'სიმწარისთვის',
    aroma: 'არომატისთვის',
    dual: 'ორმაგი დანიშნულება',
    other: 'სხვა',
  },
  
  // Hop forms
  hopForms: {
    pellet: 'გრანულა',
    leaf: 'ფოთოლი',
    cryo: 'კრიო',
  },
  
  // Yeast types
  yeastTypes: {
    ale: 'ელის',
    lager: 'ლაგერის',
    wheat: 'ხორბლის',
    belgian: 'ბელგიური',
    wild: 'ველური',
    other: 'სხვა',
  },
  
  // Flocculation
  flocculation: {
    low: 'დაბალი',
    medium: 'საშუალო',
    high: 'მაღალი',
  },
  
  // Fermentable types
  fermentableTypes: {
    grain: 'მარცვლოვანი (ალაო)',
    sugar: 'შაქარი',
    liquid_extract: 'თხევადი ექსტრაქტი',
    dry_extract: 'მშრალი ექსტრაქტი',
    adjunct: 'დამატებითი',
    other: 'სხვა',
  },
  
  // Adjunct types
  adjunctTypes: {
    water_chemistry: 'წყლის ქიმია',
    fining: 'გამწმენდი',
    sugar: 'შაქარი',
    spice: 'სანელებელი',
  },
  
  // Movement types (API types to Georgian)
  movementTypes: {
    PURCHASE: 'შემოსავალი',
    CONSUMPTION: 'ხარჯი',
    ADJUSTMENT_ADD: 'კორექტირება',
    ADJUSTMENT_REMOVE: 'კორექტირება',
    WASTE: 'ჩამოწერა',
    PRODUCTION: 'წარმოება',
    SALE: 'გაყიდვა',
    RETURN: 'დაბრუნება',
  },
  
  // Ingredient types (for detection)
  ingredientTypes: {
    malt: 'მარცვლეული',
    grain: 'მარცვლეული',
    hops: 'სვია',
    hop: 'სვია',
    yeast: 'საფუარი',
    adjunct: 'დანამატები',
    water_chemistry: 'წყლის ქიმია',
  },
  
  // Units
  units: {
    kg: 'კგ',
    g: 'გ',
    L: 'ლ',
    ml: 'მლ',
    pack: 'პაკეტი',
    pcs: 'ცალი',
  },
}

// Helper function to translate
const t = (category: keyof typeof TRANSLATIONS, key: string): string => {
  const cat = TRANSLATIONS[category]
  if (cat && typeof cat === 'object') {
    return (cat as Record<string, string>)[key] || key
  }
  return key
}

// Helper function to get translated category
const getTranslatedCategory = (category: string): string => {
  return TRANSLATIONS.categories[category as keyof typeof TRANSLATIONS.categories] || category
}

// Helper function to detect and translate category from item
const getIngredientCategory = (item: any): string => {
  const category = item?.category || ''
  const name = (item?.name || '').toLowerCase()
  
  // Try direct translation first
  if (TRANSLATIONS.categories[category as keyof typeof TRANSLATIONS.categories]) {
    // But override RAW_MATERIAL based on item name
    if (category === 'RAW_MATERIAL') {
      // Detect from name
      const hopNames = ['magnum', 'cascade', 'citra', 'mosaic', 'saaz', 'hallertau', 'tettnang', 'mittelfrüh']
      if (hopNames.some(h => name.includes(h))) return 'სვია'
      
      const yeastNames = ['safale', 'saflager', 'fermentis', 'lallemand', 'wlp', 'wyeast', 't-58', 'us-05']
      if (yeastNames.some(y => name.includes(y))) return 'საფუარი'
      
      if (name.includes('malt') || name.includes('pilsner') || name.includes('munich') || name.includes('vienna')) {
        return 'მარცვლეული'
      }
      
      return 'ნედლეული'
    }
    return TRANSLATIONS.categories[category as keyof typeof TRANSLATIONS.categories]
  }
  
  return category
}



interface StockMovement {

  id: string

  date: Date

  type: 'in' | 'out' | 'adjustment' | 'waste'

  quantity: number

  reason: string

  reference?: string

  user: string

  balanceAfter: number

  batchId?: string

  batchNumber?: string

  batchStatus?: string

  recipeName?: string

}



const mockMovements: StockMovement[] = [

  { id: '1', date: new Date('2024-12-11T09:30'), type: 'out', quantity: 85, reason: 'პარტია BRW-2024-0156', reference: 'BRW-2024-0156', user: 'ნ. ზედგინიძე', balanceAfter: 450 },

  { id: '2', date: new Date('2024-12-05T10:00'), type: 'out', quantity: 95, reason: 'პარტია BRW-2024-0155', reference: 'BRW-2024-0155', user: 'გ. კაპანაძე', balanceAfter: 535 },

  { id: '3', date: new Date('2024-12-01T14:00'), type: 'in', quantity: 500, reason: 'მიწოდება ORD-2024-0085', reference: 'ORD-2024-0085', user: 'ნ. ზედგინიძე', balanceAfter: 630 },

  { id: '4', date: new Date('2024-11-28T09:00'), type: 'out', quantity: 85, reason: 'პარტია BRW-2024-0154', reference: 'BRW-2024-0154', user: 'ნ. ზედგინიძე', balanceAfter: 130 },

  { id: '5', date: new Date('2024-11-25T11:00'), type: 'out', quantity: 90, reason: 'პარტია BRW-2024-0153', reference: 'BRW-2024-0153', user: 'გ. კაპანაძე', balanceAfter: 215 },

  { id: '6', date: new Date('2024-11-20T16:00'), type: 'adjustment', quantity: 5, reason: 'ინვენტარიზაცია - ნაპოვნი', user: 'ნ. ზედგინიძე', balanceAfter: 305 },

  { id: '7', date: new Date('2024-11-15T10:00'), type: 'in', quantity: 300, reason: 'მიწოდება ORD-2024-0080', reference: 'ORD-2024-0080', user: 'ნ. ზედგინიძე', balanceAfter: 300 },

]



const CATEGORY_ICONS: Record<string, string> = {

  grain: '🌾',

  hop: '🌿',

  yeast: '🧪',

  adjunct: '⚗️',

  packaging: '📦',

}

// Find matching ingredient specs from library
const findIngredientSpecs = (item: any) => {
  if (!item) return null
  
  const name = (item.name || '').toLowerCase()
  const supplier = (item.supplier || '').toLowerCase()
  
  // Try to find exact match first (name + supplier)
  let match = libraryData.items.find((lib: any) => 
    lib.name.toLowerCase() === name && 
    lib.supplier?.toLowerCase() === supplier
  )
  
  // If no exact match, try name only
  if (!match) {
    match = libraryData.items.find((lib: any) => 
      lib.name.toLowerCase() === name
    )
  }
  
  // If still no match, try partial name match
  if (!match) {
    match = libraryData.items.find((lib: any) => 
      name.includes(lib.name.toLowerCase()) || 
      lib.name.toLowerCase().includes(name)
    )
  }
  
  return match || null
}

// Helper function to detect ingredient icon from name/category/sku
const getIngredientIcon = (item: any): string => {
  const name = (item?.name || '').toLowerCase()
  const category = (item?.category || '').toLowerCase()
  const sku = (item?.sku || item?.id || '').toLowerCase()
  
  // Check SKU prefix first
  if (sku.startsWith('hop_')) return '🌿'
  if (sku.startsWith('yeast_')) return '🧪'
  if (sku.startsWith('malt_')) return '🌾'
  if (sku.startsWith('adjunct_') || sku.startsWith('water_chem')) return '🧫'
  
  // Check category
  if (category === 'hops' || category === 'hop') return '🌿'
  if (category === 'yeast') return '🧪'
  if (category === 'malt' || category === 'grain') return '🌾'
  if (category === 'adjunct') return '🧫'
  if (category === 'water_chemistry') return '💧'
  
  // Hop varieties
  const hopNames = [
    'magnum', 'cascade', 'centennial', 'citra', 'mosaic', 'simcoe', 'amarillo',
    'saaz', 'hallertau', 'tettnang', 'spalt', 'perle', 'hersbrucker', 'premiant',
    'sládek', 'fuggle', 'golding', 'mittelfrüh', 'mittelfruh', 'tradition',
    'mandarina', 'polaris', 'herkules', 'columbus', 'chinook', 'warrior', 'nugget'
  ]
  if (hopNames.some(h => name.includes(h))) return '🌿'
  
  // Yeast strains
  const yeastNames = [
    'safale', 'saflager', 'safbrew', 'wlp', 'wyeast', 'lallemand', 'lalbrew',
    'fermentis', 'nottingham', 'us-05', 'us-04', 's-04', 's-23', 'w-34',
    't-58', 'be-256', 'wb-06', 'belle saison', 'abbaye'
  ]
  if (yeastNames.some(y => name.includes(y))) return '🧪'
  
  // Malt patterns
  const maltNames = [
    'malt', 'pilsner', 'munich', 'vienna', 'pale ale', 'wheat',
    'caramel', 'crystal', 'cara', 'chocolate', 'black', 'roast',
    'biscuit', 'aromatic', 'melanoidin'
  ]
  if (maltNames.some(m => name.includes(m))) return '🌾'
  
  // Adjuncts
  const adjunctNames = [
    'sugar', 'dextrose', 'honey', 'gypsum', 'calcium', 'chloride',
    'irish moss', 'whirlfloc', 'gelatin', 'coriander', 'orange peel'
  ]
  if (adjunctNames.some(a => name.includes(a))) return '🧫'
  
  // Generic fallbacks
  if (name.includes('hop')) return '🌿'
  if (name.includes('yeast')) return '🧪'
  
  // Fallback to category config if available
  if (item?.category && CATEGORY_ICONS[item.category]) {
    return CATEGORY_ICONS[item.category]
  }
  
  return '📦'
}



const MOVEMENT_CONFIG = {

  in: { label: 'შემოსავალი', color: 'text-green-400', icon: '📥' },

  out: { label: 'ხარჯი', color: 'text-red-400', icon: '📤' },

  adjustment: { label: 'კორექტირება', color: 'text-yellow-400', icon: '✏️' },

  waste: { label: 'ჩამოწერა', color: 'text-orange-400', icon: '🗑️' },

}



export default function IngredientDetailPage() {

  const params = useParams()

  const router = useRouter()

  const storeOrders = useBreweryStore(state => state.orders || [])
  const updateIngredient = useBreweryStore(state => state.updateIngredient)

  const [ingredient, setIngredient] = useState<Ingredient | null>(null)
  const [apiItemData, setApiItemData] = useState<any>(null) // Store raw API data for category check
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [movements, setMovements] = useState<StockMovement[]>([])
  const [movementsLoading, setMovementsLoading] = useState(false)

  const [activeTab, setActiveTab] = useState<'overview' | 'movements' | 'orders'>('overview')

  const [showAddMovement, setShowAddMovement] = useState(false)

  const [movementType, setMovementType] = useState<'in' | 'out' | 'adjustment' | 'waste'>('in')

  const [newMovement, setNewMovement] = useState({ quantity: '', reason: '' })
  const [isSavingMovement, setIsSavingMovement] = useState(false)

  const [showEditModal, setShowEditModal] = useState(false)
  const [showEditSpecsModal, setShowEditSpecsModal] = useState(false)
  const [editableSpecs, setEditableSpecs] = useState<any>(null)
  const [isSavingSpecs, setIsSavingSpecs] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const [editingMovement, setEditingMovement] = useState<StockMovement | null>(null)

  // Fetch item from API
  useEffect(() => {
    const itemId = params.id as string
    if (!itemId) return

    const fetchItem = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        console.log('[IngredientDetailPage] Fetching item from API:', itemId)
        
        const response = await fetch(`/api/inventory/${itemId}`)
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('ინგრედიენტი ვერ მოიძებნა')
            setIngredient(null)
            return
          } else {
            throw new Error('Failed to fetch item')
          }
        }
        
        const data = await response.json()
        const apiItem = data.item || data
        
        console.log('[IngredientDetailPage] Fetched item from API:', apiItem)
        
        // Store raw API data for category check
        setApiItemData(apiItem)
        
        // Transform API response to page format
        const pageIngredient = {
          id: apiItem.id,
          name: apiItem.name,
          category: (() => {
            // Map database category to page category
            const cat = (apiItem.category || '').toLowerCase()
            if (cat === 'raw_material') {
              // Determine sub-category from name
              const name = (apiItem.name || '').toLowerCase()
              if (name.includes('malt') || name.includes('grain') || name.includes('pilsner') || name.includes('munich') || name.includes('vienna')) return 'grain'
              if (name.includes('hop') || name.includes('magnum') || name.includes('cascade')) return 'hop'
              if (name.includes('yeast') || name.includes('safale') || name.includes('saflager')) return 'yeast'
              return 'adjunct'
            }
            if (cat === 'packaging') return 'packaging'
            return 'adjunct'
          })() as any,
          currentStock: apiItem.balance || 0,
          minStock: apiItem.reorderPoint || 0,
          unit: apiItem.unit || 'kg',
          avgUsagePerWeek: apiItem.reorderPoint ? Math.ceil(apiItem.reorderPoint / 4) : 0,
          lastReceived: apiItem.updatedAt ? new Date(apiItem.updatedAt) : new Date(),
          expiryDate: undefined,
          supplier: apiItem.supplier || '',
          pricePerUnit: apiItem.costPerUnit || 0,
          lotNumber: undefined,
          location: 'საწყობი A', // Default location
          specs: apiItem.specs || undefined, // Include specs from API
        }
        
        setIngredient(pageIngredient as Ingredient & { specs?: any })
      } catch (err) {
        console.error('[IngredientDetailPage] Fetch error:', err)
        setError(err instanceof Error ? err.message : 'შეცდომა მონაცემების ჩატვირთვისას')
        setIngredient(null)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchItem()
  }, [params.id])

  // Fetch movements from API (only after ingredient is loaded)
  useEffect(() => {
    const itemId = params.id as string
    if (!itemId || !ingredient) return

    const fetchMovements = async () => {
      setMovementsLoading(true)
      try {
        const response = await fetch(`/api/inventory/${itemId}/movements`)
        if (!response.ok) {
          console.error('[IngredientDetailPage] Failed to fetch movements:', response.statusText)
          // Set empty array if API fails - don't use mock data
          setMovements([])
          return
        }
        const data = await response.json()
        // API might return { movements: [...] } or just [...]
        const movementsArray = data.movements || data || []
        if (Array.isArray(movementsArray)) {
          // Transform API response to StockMovement format
          const transformedMovements: StockMovement[] = movementsArray.map((m: any) => ({
            id: m.id,
            date: new Date(m.date || m.createdAt),
            type: m.type,
            quantity: m.quantity,
            reason: m.reason || m.type,
            reference: m.reference || m.batchNumber,
            user: m.userName || m.user || m.createdBy || 'სისტემა',
            balanceAfter: m.balanceAfter || 0,
            batchId: m.batchId,
            batchNumber: m.batchNumber,
            batchStatus: m.batchStatus,
            recipeName: m.recipeName,
          }))
          setMovements(transformedMovements)
          console.log('[IngredientDetailPage] Loaded', transformedMovements.length, 'movements from API')
        } else {
          setMovements([])
        }
      } catch (error) {
        console.error('[IngredientDetailPage] Error fetching movements:', error)
        // Set empty array on error - don't use mock data
        setMovements([])
      } finally {
        setMovementsLoading(false)
      }
    }

    fetchMovements()
  }, [params.id, ingredient])

  // Calculate last received date from movements
  const lastReceivedDate = useMemo(() => {
    if (!ingredient) return undefined
    const purchaseMovements = movements.filter(m => m.type === 'in')
    if (purchaseMovements.length === 0) return undefined
    const sorted = purchaseMovements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return sorted[0]?.date
  }, [movements, ingredient])

  // Calculate monthly consumption for graph
  const monthlyConsumption = useMemo(() => {
    if (!ingredient) return []
    const now = new Date()
    const months = Array.from({ length: 12 }, (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59)
      
      const monthMovements = movements.filter(m => {
        const mDate = new Date(m.date)
        return m.type === 'out' && mDate >= monthStart && mDate <= monthEnd
      })
      
      const total = monthMovements.reduce((sum, m) => sum + m.quantity, 0)
      return {
        month: date.getMonth(),
        year: date.getFullYear(),
        total,
      }
    })
    
    const maxConsumption = Math.max(...months.map(m => m.total), 1)
    
    return months.map(m => ({
      ...m,
      height: maxConsumption > 0 ? (m.total / maxConsumption) * 100 : 0,
    }))
  }, [movements, ingredient])

  if (!ingredient) {
    return (
      <DashboardLayout title="იტვირთება..." breadcrumb="მთავარი / მარაგები">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-copper border-t-transparent rounded-full" />
        </div>
      </DashboardLayout>
    )
  }

  const maxStock = ingredient.minStock * 3
  const weeksRemaining = ingredient.avgUsagePerWeek > 0 
    ? Math.floor(ingredient.currentStock / ingredient.avgUsagePerWeek)
    : Infinity
  const stockPercent = (ingredient.currentStock / maxStock) * 100
  const totalValue = ingredient.currentStock * ingredient.pricePerUnit

  // Save specs handler
  const handleSaveSpecs = async () => {
    if (!ingredient?.id || !editableSpecs) return
    
    setIsSavingSpecs(true)
    try {
      const response = await fetch(`/api/inventory/${ingredient.id}/specs`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          specs: {
            // Malt specs
            color: editableSpecs.color,
            potential: editableSpecs.potential,
            yield: editableSpecs.yield,
            maltType: editableSpecs.maltType,
            origin: editableSpecs.origin,
            // Hop specs
            alphaAcid: editableSpecs.alphaAcid,
            betaAcid: editableSpecs.betaAcid,
            purpose: editableSpecs.purpose,
            form: editableSpecs.form,
            // Yeast specs
            attenuation: editableSpecs.attenuation,
            tempRange: editableSpecs.tempRange,
            flocculation: editableSpecs.flocculation,
            yeastType: editableSpecs.yeastType,
            // Adjunct specs
            description: editableSpecs.description,
            adjunctType: editableSpecs.adjunctType,
          },
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || error.details || 'შენახვა ვერ მოხერხდა')
      }

      // Refresh item data to get updated specs
      await refreshIngredient()
      setShowEditSpecsModal(false)
      
    } catch (error) {
      console.error('[IngredientDetailPage] Save specs error:', error)
      alert(error instanceof Error ? error.message : 'შენახვა ვერ მოხერხდა')
    } finally {
      setIsSavingSpecs(false)
    }
  }

  // Refresh ingredient from API
  const refreshIngredient = async () => {
    const itemId = params.id as string
    if (!itemId) return

    try {
      const response = await fetch(`/api/inventory/${itemId}`)
      if (response.ok) {
        const data = await response.json()
        const apiItem = data.item || data
        
        // Transform API response to Ingredient format
        const pageIngredient = {
          id: apiItem.id,
          name: apiItem.name,
          category: (() => {
            const cat = (apiItem.category || '').toLowerCase()
            if (cat === 'raw_material') {
              const name = (apiItem.name || '').toLowerCase()
              if (name.includes('malt') || name.includes('grain') || name.includes('pilsner') || name.includes('munich') || name.includes('vienna')) return 'grain'
              if (name.includes('hop') || name.includes('magnum') || name.includes('cascade')) return 'hop'
              if (name.includes('yeast') || name.includes('safale') || name.includes('saflager')) return 'yeast'
              return 'adjunct'
            }
            if (cat === 'packaging') return 'packaging'
            return 'adjunct'
          })() as any,
          currentStock: apiItem.balance || 0,
          minStock: apiItem.reorderPoint || 0,
          unit: apiItem.unit || 'kg',
          avgUsagePerWeek: apiItem.reorderPoint ? Math.ceil(apiItem.reorderPoint / 4) : 0,
          lastReceived: apiItem.updatedAt ? new Date(apiItem.updatedAt) : new Date(),
          expiryDate: undefined,
          supplier: apiItem.supplier || '',
          pricePerUnit: apiItem.costPerUnit || 0,
          lotNumber: undefined,
          location: 'საწყობი A',
          specs: apiItem.specs || undefined, // Include specs from API
        }
        
        setIngredient(pageIngredient as Ingredient & { specs?: any })
      }
    } catch (err) {
      console.error('[IngredientDetailPage] Refresh ingredient error:', err)
    }
  }

  // Refresh movements from API
  const refreshMovements = async () => {
    const itemId = params.id as string
    if (!itemId) return

    try {
      const response = await fetch(`/api/inventory/${itemId}/movements`)
      if (response.ok) {
        const data = await response.json()
        const movementsArray = data.movements || data || []
        if (Array.isArray(movementsArray)) {
          const transformedMovements: StockMovement[] = movementsArray.map((m: any) => {
            // Use rawQuantity (signed) if available for accurate display
            // Otherwise use quantity (which might be absolute)
            const qty = m.rawQuantity !== undefined ? m.rawQuantity : m.quantity
            
            return {
              id: m.id,
              date: new Date(m.date || m.createdAt),
              type: m.type || (qty >= 0 ? 'in' : 'out'),
              quantity: qty, // Use signed quantity for accurate display
              reason: m.reason || m.type || '',
              reference: m.reference || m.batchNumber,
              user: m.userName || m.user || m.createdBy || 'სისტემა',
              balanceAfter: m.balanceAfter || 0,
              batchId: m.batchId,
              batchNumber: m.batchNumber,
              batchStatus: m.batchStatus,
              recipeName: m.recipeName,
            }
          })
          setMovements(transformedMovements)
        }
      }
    } catch (err) {
      console.error('[IngredientDetailPage] Refresh movements error:', err)
    }
  }

  const handleAddMovement = async () => {
    if (!ingredient?.id) {
      alert('ინგრედიენტი ვერ მოიძებნა')
      return
    }

    if (!newMovement.quantity || !newMovement.reason) {
      alert('გთხოვთ შეიყვანოთ რაოდენობა და მიზეზი')
      return
    }

    const qty = parseFloat(newMovement.quantity)
    if (isNaN(qty) || qty === 0) {
      alert('რაოდენობა არ შეიძლება იყოს ნული.')
      return
    }
    
    // For adjustments, allow negative values; for others, require positive
    if (movementType !== 'adjustment' && qty <= 0) {
      alert('რაოდენობა უნდა იყოს დადებითი რიცხვი.')
      return
    }

    setIsSavingMovement(true)
    try {
      console.log('[IngredientDetailPage] Saving movement:', {
        type: movementType,
        quantity: movementType === 'in' ? qty : -qty,
        reason: newMovement.reason,
      })

      if (editingMovement) {
        // Update existing movement
        // Determine quantity and type for update
        let quantity = qty
        let apiType = 'PURCHASE'
        
        if (movementType === 'in') {
          quantity = Math.abs(qty)
          apiType = 'PURCHASE'
        } else if (movementType === 'out') {
          quantity = -Math.abs(qty)
          apiType = 'CONSUMPTION'
        } else if (movementType === 'waste') {
          quantity = -Math.abs(qty)
          apiType = 'WASTE'
        } else if (movementType === 'adjustment') {
          quantity = qty // Keep sign for adjustment
          apiType = qty >= 0 ? 'ADJUSTMENT_ADD' : 'ADJUSTMENT_REMOVE'
        }

        console.log('[IngredientDetailPage] Updating movement:', {
          movementId: editingMovement.id,
          quantity,
          reason: newMovement.reason,
          type: movementType,
          apiType,
        })

        const response = await fetch(`/api/inventory/${params.id}/movements/${editingMovement.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quantity,
            reason: newMovement.reason,
            type: movementType, // Send frontend type ('in', 'out', 'adjustment', 'waste')
          }),
        })

        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || data.message || data.details || 'მოძრაობის განახლება ვერ მოხერხდა')
        }

        console.log('[IngredientDetailPage] Movement updated:', data)
      } else {
        // Create new movement
        // Determine quantity sign and API type based on movement type
        let quantity = qty
        let apiType = 'PURCHASE'
        
        if (movementType === 'in') {
          quantity = Math.abs(qty) // Positive for stock in
          apiType = 'PURCHASE'
        } else if (movementType === 'out') {
          quantity = -Math.abs(qty) // Negative for stock out
          apiType = 'CONSUMPTION'
        } else if (movementType === 'waste') {
          quantity = -Math.abs(qty) // Negative for waste
          apiType = 'WASTE'
        } else if (movementType === 'adjustment') {
          // Adjustment can be positive or negative - use as entered
          quantity = qty
          apiType = qty >= 0 ? 'ADJUSTMENT_ADD' : 'ADJUSTMENT_REMOVE'
        }
        
        const response = await fetch(`/api/inventory/${params.id}/movements`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quantity,
            reason: newMovement.reason,
            type: apiType,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || error.message || 'მოძრაობის დამატება ვერ მოხერხდა')
        }

        const result = await response.json()
        console.log('[IngredientDetailPage] Movement created:', result)
      }

      // Refresh both ingredient and movements from API
      await Promise.all([
        refreshIngredient(),
        refreshMovements(),
      ])

      // Close modal and reset form
      setNewMovement({ quantity: '', reason: '' })
      setEditingMovement(null)
      setMovementType('in') // Reset to default
      setShowAddMovement(false)
    } catch (error) {
      console.error('[IngredientDetailPage] Error saving movement:', error)
      alert(error instanceof Error ? error.message : 'შეცდომა მოძრაობის შენახვისას')
    } finally {
      setIsSavingMovement(false)
    }
  }

  const handleEditMovement = (mov: StockMovement) => {
    setEditingMovement(mov)
    // Map API movement type back to frontend type
    setMovementType(mov.type)
    setNewMovement({ quantity: Math.abs(mov.quantity).toString(), reason: mov.reason })
    setShowAddMovement(true)
  }

  const handleDelete = async () => {
    if (!ingredient?.id) return
    
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/inventory/${ingredient.id}`, {
        method: 'DELETE',
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || data.message || 'წაშლა ვერ მოხერხდა')
      }
      
      // Success - redirect to inventory list
      router.push('/inventory')
    } catch (error) {
      console.error('[IngredientDetailPage] Delete error:', error)
      alert(error instanceof Error ? error.message : 'წაშლა ვერ მოხერხდა')
      setIsDeleting(false)
      setShowDeleteModal(false)
    }
  }

  const handleDeleteMovement = async (movementId: string) => {
    if (!confirm('დარწმუნებული ხართ, რომ გსურთ ამ მოძრაობის წაშლა?')) {
      return
    }

    try {
      const response = await fetch(`/api/inventory/${params.id}/movements/${movementId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        alert(`შეცდომა: ${error.error || 'მოძრაობის წაშლა ვერ მოხერხდა'}`)
        return
      }

      // Reload movements after deletion
      const movementsResponse = await fetch(`/api/inventory/${params.id}/movements`)
      if (movementsResponse.ok) {
        const data = await movementsResponse.json()
        if (data.movements && Array.isArray(data.movements)) {
          const transformedMovements: StockMovement[] = data.movements.map((m: any) => ({
            id: m.id,
            date: new Date(m.date),
            type: m.type,
            quantity: m.quantity,
            reason: m.reason || m.type,
            reference: m.reference || m.batchNumber,
            user: m.user || 'სისტემა',
            balanceAfter: m.balanceAfter || 0,
            batchId: m.batchId,
            batchNumber: m.batchNumber,
            batchStatus: m.batchStatus,
            recipeName: m.recipeName,
          }))
          setMovements(transformedMovements)
          
          // Update ingredient stock
          if (data.movements.length > 0) {
            const latestBalance = data.movements[0]?.balanceAfter || ingredient.currentStock
            setIngredient({ ...ingredient, currentStock: latestBalance })
            if (updateIngredient) {
              updateIngredient(ingredient.id, {
                currentStock: latestBalance,
              } as any)
            }
          } else {
            // No movements left, reset to original stock or 0
            setIngredient({ ...ingredient, currentStock: 0 })
            if (updateIngredient) {
              updateIngredient(ingredient.id, {
                currentStock: 0,
              } as any)
            }
          }
        }
      }
    } catch (error) {
      console.error('[IngredientDetailPage] Error deleting movement:', error)
      alert('შეცდომა მოძრაობის წაშლისას')
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <DashboardLayout title="იტვირთება..." breadcrumb="მთავარი / მარაგები">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-copper mx-auto mb-4"></div>
            <p className="text-slate-400">იტვირთება...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Error state
  if (error || !ingredient) {
    return (
      <DashboardLayout title="შეცდომა" breadcrumb="მთავარი / მარაგები">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-6xl mb-4">😕</div>
            <h2 className="text-xl font-semibold text-white mb-2">
              {error || 'ინგრედიენტი ვერ მოიძებნა'}
            </h2>
            <p className="text-slate-400 mb-4">
              ინგრედიენტი არ არსებობს ან წაიშალა
            </p>
            <button
              onClick={() => router.push('/inventory')}
              className="px-4 py-2 bg-copper hover:bg-copper/80 text-white rounded-lg transition-colors"
            >
              ← მარაგებზე დაბრუნება
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      title={ingredient.name}
      breadcrumb={`მთავარი / მარაგები / ${ingredient.name}`}
    >

      {/* Header */}

      <Card className="mb-6">

        <CardBody>

          <div className="flex items-start justify-between">

            <div className="flex items-center gap-4">

              <div className="w-16 h-16 rounded-2xl bg-amber-400/20 flex items-center justify-center text-3xl">

                {getIngredientIcon(ingredient)}

              </div>

              <div>

                <h1 className="text-2xl font-display font-bold">{ingredient.name}</h1>

                <p className="text-text-muted">

                  {ingredient.supplier} • {ingredient.location} {ingredient.lotNumber && `• ${ingredient.lotNumber}`}

                </p>

              </div>

            </div>

            <div className="flex gap-2">

              <Button variant="ghost" onClick={() => {
                // Check if this is a cleaning supply
                const isCleaningSupply = (() => {
                  if (!apiItemData) return false
                  
                  const category = (apiItemData.category || '').toLowerCase()
                  const name = (apiItemData.name || '').toLowerCase()
                  
                  // Check category
                  if (category === 'consumable') return true
                  
                  // Check name patterns
                  const cleaningPatterns = [
                    'კაუსტიკ', 'caustic', 'paa', 'სანიტაიზერ', 'sanitiz', 
                    'detergent', 'სარეცხი', 'rinse', 'ჩამრეცხი', 'cleaner', 'cip'
                  ]
                  
                  return cleaningPatterns.some(pattern => name.includes(pattern))
                })()
                
                if (isCleaningSupply) {
                  router.push('/inventory?tab=cleaning')
                } else {
                  router.back()
                }
              }}>← უკან</Button>

              <Button variant="secondary" onClick={() => { setMovementType('in'); setShowAddMovement(true) }}>

                📥 შემოსავალი

              </Button>

              <Button variant="secondary" onClick={() => { setMovementType('out'); setShowAddMovement(true) }}>

                📤 ხარჯი

              </Button>

              <Button variant="secondary" onClick={() => { setMovementType('adjustment'); setShowAddMovement(true) }}>

                ✏️ კორექტირება

              </Button>

              <Button variant="secondary" onClick={() => { setMovementType('waste'); setShowAddMovement(true) }}>

                🗑️ ჩამოწერა

              </Button>

              <Button variant="primary" onClick={() => setShowEditModal(true)}>✏️ რედაქტირება</Button>

            </div>

          </div>

        </CardBody>

      </Card>



      {/* Stats */}

      <div className="grid grid-cols-5 gap-4 mb-6">

        <div className="bg-bg-card border border-border rounded-xl p-4 text-center">

          <p className="text-2xl font-bold font-mono text-copper-light">{ingredient.currentStock}</p>

          <p className="text-xs text-text-muted">მარაგი ({ingredient.unit})</p>

        </div>

        <div className="bg-bg-card border border-border rounded-xl p-4 text-center">

          <p className="text-2xl font-bold font-mono text-amber-400">{ingredient.minStock}</p>

          <p className="text-xs text-text-muted">მინიმუმი</p>

        </div>

        <div className="bg-bg-card border border-border rounded-xl p-4 text-center">

          <p className="text-2xl font-bold font-mono">{ingredient.avgUsagePerWeek}</p>

          <p className="text-xs text-text-muted">კვირაში ({ingredient.unit})</p>

        </div>

        <div className="bg-bg-card border border-border rounded-xl p-4 text-center">

          <p className="text-2xl font-bold font-mono text-green-400">

            {weeksRemaining === Infinity ? '∞' : `~${weeksRemaining}`}

          </p>

          <p className="text-xs text-text-muted">კვირა საკმარისი</p>

        </div>

        <div className="bg-bg-card border border-border rounded-xl p-4 text-center">

          <p className="text-2xl font-bold font-mono">{totalValue.toLocaleString()}₾</p>

          <p className="text-xs text-text-muted">ღირებულება</p>

        </div>

      </div>



      {/* Stock Bar */}

      <Card className="mb-6">

        <CardBody>

          <div className="flex items-center justify-between mb-2">

            <span className="text-sm text-text-muted">მარაგის დონე</span>

            <span className="text-sm font-mono">{ingredient.currentStock} / {maxStock} {ingredient.unit}</span>

          </div>

          <div className="relative">

            <ProgressBar value={Math.min(100, stockPercent)} size="lg" color="copper" />

            <div 

              className="absolute top-0 bottom-0 w-0.5 bg-amber-400"

              style={{ left: `${(ingredient.minStock / maxStock) * 100}%` }}

            >

              <span className="absolute -top-5 -translate-x-1/2 text-[10px] text-amber-400 whitespace-nowrap">მინ</span>

            </div>

          </div>

        </CardBody>

      </Card>



      {/* Tabs */}

      <div className="flex gap-2 mb-6 border-b border-border">

        {[

          { key: 'overview', label: 'მიმოხილვა', icon: '📊' },

          { key: 'movements', label: 'მოძრაობა', icon: '📋' },

          { key: 'orders', label: 'შეკვეთები', icon: '🚚' },

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

            {tab.icon} {tab.label}

          </button>

        ))}

      </div>



      {/* Tab Content */}

      {activeTab === 'overview' && (

        <div className="grid grid-cols-2 gap-6">

          <Card>

            <CardHeader>📋 დეტალები</CardHeader>

            <CardBody className="space-y-3">

              <div className="flex justify-between py-2 border-b border-border/50">

                <span className="text-text-muted">კატეგორია</span>

                <span>{getIngredientCategory(ingredient)}</span>

              </div>

              <div className="flex justify-between py-2 border-b border-border/50">

                <span className="text-text-muted">ერთეულის ფასი</span>

                <span className="font-mono">{ingredient.pricePerUnit}₾/{ingredient.unit}</span>

              </div>

              <div className="flex justify-between py-2 border-b border-border/50">

                <span className="text-text-muted">მომწოდებელი</span>

                <span>{ingredient.supplier}</span>

              </div>

              <div className="flex justify-between py-2 border-b border-border/50">

                <span className="text-text-muted">ადგილმდებარეობა</span>

                <span className="font-mono">{ingredient.location}</span>

              </div>

              {ingredient.lotNumber && (

                <div className="flex justify-between py-2 border-b border-border/50">

                  <span className="text-text-muted">ლოტის ნომერი</span>

                  <span className="font-mono">{ingredient.lotNumber}</span>

                </div>

              )}

              {ingredient.expiryDate && (

                <div className="flex justify-between py-2 border-b border-border/50">

                  <span className="text-text-muted">ვარგისიანობა</span>

                  <span>{formatDate(ingredient.expiryDate)}</span>

                </div>

              )}

              <div className="flex justify-between py-2">

                <span className="text-text-muted">ბოლო მიღება</span>

                <span>{lastReceivedDate ? formatDate(lastReceivedDate) : (ingredient.lastReceived ? formatDate(ingredient.lastReceived) : '-')}</span>

              </div>

              {/* Ingredient Specs - Merge saved specs with library defaults */}
              {(() => {
                // Get saved specs from database (via ingredient object)
                const savedSpecs = (ingredient as any)?.specs || {}
                // Get library specs as defaults
                const librarySpecs = findIngredientSpecs(ingredient) || {}
                // Merge: saved specs override library specs
                const specs = {
                  ...librarySpecs,
                  ...savedSpecs,
                }
                if (!specs || Object.keys(specs).length === 0) return null
                
                const itemCategory = (specs.category || '').toLowerCase()
                
                return (
                  <div className="mt-6 pt-6 border-t border-border/50">
                    {/* Header with Edit button */}
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-medium text-text-muted">📊 სპეციფიკაციები</h4>
                      <button
                        onClick={() => {
                          // Get saved specs and merge with library defaults
                          const savedSpecs = (ingredient as any)?.specs || {}
                          const librarySpecs = findIngredientSpecs(ingredient) || {}
                          const mergedSpecs = {
                            ...librarySpecs,
                            ...savedSpecs,
                          }
                          
                          setEditableSpecs({
                            ...mergedSpecs,
                            itemId: ingredient?.id,
                            itemCategory
                          })
                          setShowEditSpecsModal(true)
                        }}
                        className="px-3 py-1 text-xs bg-bg-tertiary hover:bg-bg-secondary text-text-primary rounded-lg transition-colors flex items-center gap-1 border border-border"
                      >
                        ✏️ რედაქტირება
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {/* Malt Specs */}
                      {itemCategory === 'malt' && (
                        <>
                          {specs.color != null && (
                            <div className="bg-bg-tertiary rounded-lg p-3 text-center">
                              <div className="text-xs text-text-muted mb-1">EBC</div>
                              <div className="text-lg font-semibold text-amber-400">{specs.color}</div>
                            </div>
                          )}
                          {specs.yield != null && (
                            <div className="bg-bg-tertiary rounded-lg p-3 text-center">
                              <div className="text-xs text-text-muted mb-1">მოსავლიანობა</div>
                              <div className="text-lg font-semibold text-text-primary">{specs.yield}%</div>
                            </div>
                          )}
                          {specs.potential != null && (
                            <div className="bg-bg-tertiary rounded-lg p-3 text-center">
                              <div className="text-xs text-text-muted mb-1">პოტენციალი</div>
                              <div className="text-lg font-semibold text-text-primary">{specs.potential}</div>
                            </div>
                          )}
                          {specs.maltType && (
                            <div className="bg-bg-tertiary rounded-lg p-3 text-center">
                              <div className="text-xs text-text-muted mb-1">ტიპი</div>
                              <div className="text-lg font-semibold text-text-primary">
                                {TRANSLATIONS.maltTypes[specs.maltType as keyof typeof TRANSLATIONS.maltTypes] || specs.maltType}
                              </div>
                            </div>
                          )}
                          {specs.origin && (
                            <div className="bg-bg-tertiary rounded-lg p-3 text-center">
                              <div className="text-xs text-text-muted mb-1">Origin</div>
                              <div className="text-lg font-semibold text-text-primary">{specs.origin}</div>
                            </div>
                          )}
                        </>
                      )}
                      
                      {/* Hop Specs */}
                      {itemCategory === 'hops' && (
                        <>
                          {specs.alphaAcid != null && (
                            <div className="bg-bg-tertiary rounded-lg p-3 text-center">
                              <div className="text-xs text-text-muted mb-1">ალფა მჟავა</div>
                              <div className="text-lg font-semibold text-green-400">{specs.alphaAcid}%</div>
                            </div>
                          )}
                          {specs.betaAcid != null && (
                            <div className="bg-bg-tertiary rounded-lg p-3 text-center">
                              <div className="text-xs text-text-muted mb-1">ბეტა მჟავა</div>
                              <div className="text-lg font-semibold text-text-primary">{specs.betaAcid}%</div>
                            </div>
                          )}
                          {specs.purpose && (
                            <div className="bg-bg-tertiary rounded-lg p-3 text-center">
                              <div className="text-xs text-text-muted mb-1">დანიშნულება</div>
                              <div className="text-lg font-semibold text-text-primary">
                                {TRANSLATIONS.hopPurposes[specs.purpose as keyof typeof TRANSLATIONS.hopPurposes] || specs.purpose}
                              </div>
                            </div>
                          )}
                          {specs.form && (
                            <div className="bg-bg-tertiary rounded-lg p-3 text-center">
                              <div className="text-xs text-text-muted mb-1">ფორმა</div>
                              <div className="text-lg font-semibold text-text-primary">
                                {TRANSLATIONS.hopForms[specs.form as keyof typeof TRANSLATIONS.hopForms] || specs.form}
                              </div>
                            </div>
                          )}
                          {specs.origin && (
                            <div className="bg-bg-tertiary rounded-lg p-3 text-center">
                              <div className="text-xs text-text-muted mb-1">წარმოშობა</div>
                              <div className="text-lg font-semibold text-text-primary">{specs.origin}</div>
                            </div>
                          )}
                        </>
                      )}
                      
                      {/* Yeast Specs */}
                      {itemCategory === 'yeast' && (
                        <>
                          {specs.attenuation && (
                            <div className="bg-bg-tertiary rounded-lg p-3 text-center">
                              <div className="text-xs text-text-muted mb-1">ატენუაცია</div>
                              <div className="text-lg font-semibold text-purple-400">{specs.attenuation}</div>
                            </div>
                          )}
                          {specs.tempRange && (
                            <div className="bg-bg-tertiary rounded-lg p-3 text-center">
                              <div className="text-xs text-text-muted mb-1">ტემპერატურა</div>
                              <div className="text-lg font-semibold text-text-primary">{specs.tempRange}</div>
                            </div>
                          )}
                          {specs.flocculation && (
                            <div className="bg-bg-tertiary rounded-lg p-3 text-center">
                              <div className="text-xs text-text-muted mb-1">ფლოკულაცია</div>
                              <div className="text-lg font-semibold text-text-primary">
                                {TRANSLATIONS.flocculation[specs.flocculation as keyof typeof TRANSLATIONS.flocculation] || specs.flocculation}
                              </div>
                            </div>
                          )}
                          {specs.yeastType && (
                            <div className="bg-bg-tertiary rounded-lg p-3 text-center">
                              <div className="text-xs text-text-muted mb-1">ტიპი</div>
                              <div className="text-lg font-semibold text-text-primary">
                                {TRANSLATIONS.yeastTypes[specs.yeastType as keyof typeof TRANSLATIONS.yeastTypes] || specs.yeastType}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                      
                      {/* Adjunct/Water Chemistry Specs */}
                      {(itemCategory === 'adjunct' || itemCategory === 'water_chemistry') && (
                        <>
                          {specs.description && (
                            <div className="bg-bg-tertiary rounded-lg p-3 col-span-2">
                              <div className="text-xs text-text-muted mb-1">აღწერა</div>
                              <div className="text-sm text-text-primary">{specs.description}</div>
                            </div>
                          )}
                          {specs.adjunctType && (
                            <div className="bg-bg-tertiary rounded-lg p-3 text-center">
                              <div className="text-xs text-text-muted mb-1">ტიპი</div>
                              <div className="text-lg font-semibold text-text-primary">
                                {TRANSLATIONS.adjunctTypes[specs.adjunctType as keyof typeof TRANSLATIONS.adjunctTypes] || specs.adjunctType.replace('_', ' ')}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )
              })()}

            </CardBody>

          </Card>



          <Card>

            <CardHeader>📈 მოხმარების გრაფიკი</CardHeader>

            <CardBody>

              <div className="h-48 flex items-end gap-1">

                {monthlyConsumption.map((month, i) => {

                  const minHeight = 5 // Minimum height for visibility
                  const height = Math.max(month.height, minHeight)

                  return (

                    <div 

                      key={i}

                      className="flex-1 bg-copper/40 hover:bg-copper transition-colors rounded-t"

                      style={{ height: `${height}%` }}

                      title={`${month.total.toFixed(1)} ${ingredient.unit} - ${['იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ', 'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ'][month.month]} ${month.year}`}

                    />

                  )

                })}

              </div>

              <div className="flex justify-between mt-2 text-xs text-text-muted">

                <span>იან</span>

                <span>თებ</span>

                <span>მარ</span>

                <span>აპრ</span>

                <span>მაი</span>

                <span>ივნ</span>

                <span>ივლ</span>

                <span>აგვ</span>

                <span>სექ</span>

                <span>ოქტ</span>

                <span>ნოე</span>

                <span>დეკ</span>

              </div>

            </CardBody>

          </Card>

        </div>

      )}



      {activeTab === 'movements' && (
        <>
          {/* Movement Statistics */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-text-secondary mb-2">მოძრაობის სტატისტიკა (სულ)</h3>
          </div>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-bg-card border border-border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold font-mono text-green-400">
                {movements.filter(m => m.type === 'in').reduce((sum, m) => sum + m.quantity, 0).toFixed(1)}
              </p>
              <p className="text-xs text-text-muted">სულ შემოსავალი ({ingredient.unit})</p>
            </div>
            <div className="bg-bg-card border border-border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold font-mono text-red-400">
                {Math.abs(movements.filter(m => m.type === 'out').reduce((sum, m) => sum + m.quantity, 0)).toFixed(1)}
              </p>
              <p className="text-xs text-text-muted">სულ ხარჯი ({ingredient.unit})</p>
            </div>
            <div className="bg-bg-card border border-border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold font-mono text-yellow-400">
                {Math.abs(movements.filter(m => m.type === 'adjustment').reduce((sum, m) => sum + Math.abs(m.quantity), 0)).toFixed(1)}
              </p>
              <p className="text-xs text-text-muted">კორექტირება ({ingredient.unit})</p>
            </div>
            <div className="bg-bg-card border border-border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold font-mono text-orange-400">
                {Math.abs(movements.filter(m => m.type === 'waste').reduce((sum, m) => sum + m.quantity, 0)).toFixed(1)}
              </p>
              <p className="text-xs text-text-muted">ჩამოწერა ({ingredient.unit})</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <span>📋 მოძრაობის ისტორია</span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { setMovementType('in'); setShowAddMovement(true) }}>
                    📥 შემოსავალი
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setMovementType('out'); setShowAddMovement(true) }}>
                    📤 ხარჯი
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setMovementType('adjustment'); setShowAddMovement(true) }}>
                    ✏️ კორექტირება
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setMovementType('waste'); setShowAddMovement(true) }}>
                    🗑️ ჩამოწერა
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardBody>

            <table className="w-full">

              <thead>

                <tr className="border-b border-border text-left text-xs text-text-muted">

                  <th className="pb-3">თარიღი</th>

                  <th className="pb-3">ტიპი</th>

                  <th className="pb-3">რაოდენობა</th>

                  <th className="pb-3">მიზეზი</th>

                  <th className="pb-3">ბალანსი</th>

                  <th className="pb-3">მომხმარე</th>

                  <th className="pb-3 text-right">მოქმედებები</th>

                </tr>

              </thead>

              <tbody>

                {movementsLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      <span className="animate-spin inline-block mr-2">⏳</span>
                      იტვირთება...
                    </td>
                  </tr>
                ) : movements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      <span className="text-4xl mb-2 block">📭</span>
                      მოძრაობის ისტორია ცარიელია
                    </td>
                  </tr>
                ) : (
                  movements.map((mov) => (
                  <tr key={mov.id} className="border-b border-border/50">

                    <td className="py-3">

                      <p>{formatDate(mov.date)}</p>

                      <p className="text-xs text-text-muted">

                        {formatTime(mov.date)}

                      </p>

                    </td>

                    <td className="py-3">

                      <span className={`inline-flex items-center gap-1 ${MOVEMENT_CONFIG[mov.type].color}`}>

                        {MOVEMENT_CONFIG[mov.type].icon} {MOVEMENT_CONFIG[mov.type].label}

                      </span>

                    </td>

                    <td className="py-3">

                      <span className={`font-mono text-lg ${mov.type === 'in' || (mov.type === 'adjustment' && mov.quantity > 0) ? 'text-green-400' : 'text-red-400'}`}>

                        {mov.type === 'in' || (mov.type === 'adjustment' && mov.quantity > 0) ? '+' : '-'}

                        {Math.abs(mov.quantity)} {ingredient.unit}

                      </span>

                    </td>

                    <td className="py-3">

                      <p className="text-sm">{mov.reason}</p>

                      {mov.batchNumber && (
                        <p className="text-xs text-copper-light font-mono">
                          პარტია: {mov.batchNumber}
                          {mov.recipeName && ` • ${mov.recipeName}`}
                        </p>
                      )}

                      {mov.reference && !mov.batchNumber && (

                        <p className="text-xs text-copper-light font-mono">{mov.reference}</p>

                      )}

                    </td>

                    <td className="py-3 font-mono">{mov.balanceAfter} {ingredient.unit}</td>

                    <td className="py-3 text-sm text-text-secondary">{mov.user}</td>

                    <td className="py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleEditMovement(mov)}
                          className="text-copper hover:text-copper-light text-sm px-2 py-1 rounded hover:bg-bg-card transition-colors"
                          title="რედაქტირება"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteMovement(mov.id)}
                          className="text-red-400 hover:text-red-300 text-sm px-2 py-1 rounded hover:bg-bg-card transition-colors"
                          title="წაშლა"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>

                  </tr>
                  ))
                )}

              </tbody>

            </table>

          </CardBody>

        </Card>
        </>
      )}



      {activeTab === 'orders' && (
        <Card>
          <CardHeader>🚚 შეკვეთების ისტორია</CardHeader>
          <CardBody>
            {(() => {
              // Get orders from store that include this ingredient
              const ingredientOrders = (storeOrders || []).filter((order: any) => 
                order.items?.some((item: any) => item.ingredientId === ingredient.id || item.name === ingredient.name)
              )

              if (ingredientOrders.length === 0) {
                return (
                  <div className="text-center py-8">
                    <p className="text-text-muted mb-2">შეკვეთები ვერ მოიძებნა</p>
                    <p className="text-xs text-text-muted">ამ ინგრედიენტისთვის შეკვეთები არ არის</p>
                  </div>
                )
              }

              const statusColors: Record<string, string> = {
                'pending': 'text-yellow-400',
                'confirmed': 'text-blue-400',
                'in_production': 'text-purple-400',
                'ready': 'text-green-400',
                'shipped': 'text-cyan-400',
                'delivered': 'text-green-500',
                'cancelled': 'text-red-400',
              }
              const statusLabels: Record<string, string> = {
                'pending': 'მოლოდინში',
                'confirmed': 'დადასტურებული',
                'in_production': 'წარმოებაში',
                'ready': 'მზადაა',
                'shipped': 'გაგზავნილი',
                'delivered': 'მიწოდებული',
                'cancelled': 'გაუქმებული',
              }

              return (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-text-muted">
                      <th className="pb-3">შეკვეთის #</th>
                      <th className="pb-3">თარიღი</th>
                      <th className="pb-3">რაოდენობა</th>
                      <th className="pb-3">სტატუსი</th>
                      <th className="pb-3">მომწოდებელი</th>
                      <th className="pb-3">ფასი</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ingredientOrders.map((order: any) => {
                      const orderItem = order.items?.find((item: any) => 
                        item.ingredientId === ingredient.id || item.name === ingredient.name
                      )
                      return (
                        <tr key={order.id} className="border-b border-border/50">
                          <td className="py-3 font-mono text-sm">{order.orderNumber || order.id}</td>
                          <td className="py-3 text-sm">{formatDate(new Date(order.orderedAt || order.createdAt))}</td>
                          <td className="py-3 font-mono">{orderItem?.quantity || 0} {orderItem?.unit || ingredient.unit}</td>
                          <td className="py-3">
                            <span className={`text-sm ${statusColors[order.status] || 'text-text-muted'}`}>
                              {statusLabels[order.status] || order.status}
                            </span>
                          </td>
                          <td className="py-3 text-sm">{order.supplier || '-'}</td>
                          <td className="py-3 font-mono text-sm">
                            {orderItem?.totalPrice ? `${orderItem.totalPrice.toFixed(2)}₾` : '-'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )
            })()}
          </CardBody>
        </Card>
      )
      }



      {/* Add Movement Modal */}

      {showAddMovement && (

        <div className="fixed inset-0 z-50 flex items-center justify-center">

          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => {
            setShowAddMovement(false)
            setEditingMovement(null)
            setNewMovement({ quantity: '', reason: '' })
          }} />

          <div className="relative bg-bg-secondary border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">

            <div className="px-6 py-4 border-b border-border">

              <h3 className="text-lg font-display font-semibold mb-4">

                {editingMovement ? '✏️ მოძრაობის რედაქტირება' : '📦 მარაგის მოძრაობა'}

              </h3>

              {/* Movement Type Selection - only show when not editing */}
              {!editingMovement && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMovementType('in')}
                    className={`p-3 rounded-lg border transition-colors ${
                      movementType === 'in'
                        ? 'bg-green-600/20 border-green-500 text-green-400'
                        : 'bg-bg-tertiary border-border text-text-secondary hover:border-copper/50'
                    }`}
                  >
                    📥 შემოსავალი
                  </button>
                  <button
                    type="button"
                    onClick={() => setMovementType('out')}
                    className={`p-3 rounded-lg border transition-colors ${
                      movementType === 'out'
                        ? 'bg-red-600/20 border-red-500 text-red-400'
                        : 'bg-bg-tertiary border-border text-text-secondary hover:border-copper/50'
                    }`}
                  >
                    📤 ხარჯი
                  </button>
                  <button
                    type="button"
                    onClick={() => setMovementType('adjustment')}
                    className={`p-3 rounded-lg border transition-colors ${
                      movementType === 'adjustment'
                        ? 'bg-yellow-600/20 border-yellow-500 text-yellow-400'
                        : 'bg-bg-tertiary border-border text-text-secondary hover:border-copper/50'
                    }`}
                  >
                    ✏️ კორექტირება
                  </button>
                  <button
                    type="button"
                    onClick={() => setMovementType('waste')}
                    className={`p-3 rounded-lg border transition-colors ${
                      movementType === 'waste'
                        ? 'bg-orange-600/20 border-orange-500 text-orange-400'
                        : 'bg-bg-tertiary border-border text-text-secondary hover:border-copper/50'
                    }`}
                  >
                    🗑️ ჩამოწერა
                  </button>
                </div>
              )}

            </div>

            <div className="p-6 space-y-4">

              <div>

                <label className="block text-sm font-medium mb-2">
                  რაოდენობა ({ingredient.unit}) *
                  {movementType === 'adjustment' && (
                    <span className="text-yellow-400 ml-2 text-xs">(+ დამატება, - შემცირება)</span>
                  )}
                </label>

                <input

                  type="number"

                  value={newMovement.quantity}

                  onChange={(e) => setNewMovement(prev => ({ ...prev, quantity: e.target.value }))}

                  placeholder={movementType === 'adjustment' ? '-10 ან +10' : '0'}

                  step={movementType === 'adjustment' ? 'any' : '0.01'}

                  className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl font-mono focus:border-copper focus:outline-none"

                />

              </div>

              <div>

                <label className="block text-sm font-medium mb-2">მიზეზი *</label>

                <input

                  type="text"

                  value={newMovement.reason}

                  onChange={(e) => setNewMovement(prev => ({ ...prev, reason: e.target.value }))}

                  placeholder={
                    movementType === 'in' ? 'მაგ: მიწოდება ORD-2024-XXX' :
                    movementType === 'out' ? 'მაგ: პარტია BRW-2024-XXX' :
                    movementType === 'adjustment' ? 'მაგ: ინვენტარიზაცია' :
                    'მაგ: ვადაგასული'
                  }

                  className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl focus:border-copper focus:outline-none"

                />

              </div>

              <div className="bg-bg-tertiary rounded-xl p-4">

                <div className="flex justify-between text-sm">

                  <span className="text-text-muted">მიმდინარე მარაგი:</span>

                  <span className="font-mono">{ingredient.currentStock} {ingredient.unit}</span>

                </div>

                {newMovement.quantity && (

                  <div className="flex justify-between text-sm mt-2">

                    <span className="text-text-muted">ახალი მარაგი:</span>

                    <span className={`font-mono ${
                      movementType === 'in' || (movementType === 'adjustment' && parseFloat(newMovement.quantity || '0') > 0)
                        ? 'text-green-400' 
                        : 'text-red-400'
                    }`}>

                      {(() => {
                        const current = ingredient.currentStock
                        const qty = parseFloat(newMovement.quantity || '0')
                        if (movementType === 'in') {
                          return current + Math.abs(qty)
                        } else if (movementType === 'out' || movementType === 'waste') {
                          return current - Math.abs(qty)
                        } else {
                          // adjustment - can be positive or negative
                          return current + qty
                        }
                      })()} {ingredient.unit}

                    </span>

                  </div>

                )}

              </div>

            </div>

            <div className="px-6 py-4 border-t border-border flex justify-end gap-3">

              <Button variant="secondary" onClick={() => {
                setShowAddMovement(false)
                setEditingMovement(null)
                setNewMovement({ quantity: '', reason: '' })
              }}>გაუქმება</Button>

              <Button 
                variant="primary" 
                onClick={handleAddMovement}
                disabled={isSavingMovement || !newMovement.quantity || !newMovement.reason}
              >
                {isSavingMovement ? 'იტვირთება...' : (editingMovement ? 'განახლება' : 'შენახვა')}
              </Button>

            </div>

          </div>

        </div>

      )}

      {/* Edit Ingredient Modal */}
      {showEditModal && ingredient && (
        <AddIngredientModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          existingItem={{
            id: ingredient.id,
            name: ingredient.name,
            category: ingredient.category === 'grain' ? 'RAW_MATERIAL' : 'RAW_MATERIAL',
            balance: ingredient.currentStock,
            onHand: ingredient.currentStock,
            reorderPoint: ingredient.minStock,
            unit: ingredient.unit,
            supplier: ingredient.supplier,
            costPerUnit: ingredient.pricePerUnit,
            location: ingredient.location,
          } as any}
          onDelete={() => {
            setShowEditModal(false)
            setShowDeleteModal(true)
          }}
          onSave={(formData: IngredientFormData) => {
            // Update ingredient in store
            if (updateIngredient) {
              updateIngredient(ingredient.id, {
                name: formData.name,
                category: formData.category,
                currentStock: formData.inventoryAmount || 0,
                minStock: formData.reorderPoint || 0,
                unit: formData.unit,
                supplier: formData.supplier || '',
                pricePerUnit: formData.costPerUnit || 0,
                location: ingredient.location,
              } as any)
            }
            
            // Update local state
            setIngredient({
              ...ingredient,
              name: formData.name,
              category: formData.category as any,
              currentStock: formData.inventoryAmount || 0,
              minStock: formData.reorderPoint || 0,
              unit: formData.unit,
              supplier: formData.supplier || '',
              pricePerUnit: formData.costPerUnit || 0,
            })
            
            setShowEditModal(false)
          }}
        />
      )}

      {/* Edit Specs Modal */}
      {showEditSpecsModal && editableSpecs && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setShowEditSpecsModal(false)}
        >
          <div 
            className="bg-bg-secondary border border-border rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-semibold">სპეციფიკაციების რედაქტირება</h3>
              <button
                onClick={() => setShowEditSpecsModal(false)}
                className="p-2 hover:bg-bg-tertiary rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Malt Specs */}
              {editableSpecs.itemCategory === 'malt' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-text-muted mb-2">EBC</label>
                      <input
                        type="number"
                        value={editableSpecs.color || ''}
                        onChange={(e) => setEditableSpecs({...editableSpecs, color: parseFloat(e.target.value) || undefined})}
                        className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary focus:border-copper focus:outline-none"
                        step="0.1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-text-muted mb-2">Yield (%)</label>
                      <input
                        type="number"
                        value={editableSpecs.yield || ''}
                        onChange={(e) => setEditableSpecs({...editableSpecs, yield: parseFloat(e.target.value) || undefined})}
                        className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary focus:border-copper focus:outline-none"
                        step="0.1"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-text-muted mb-2">Potential</label>
                      <input
                        type="number"
                        value={editableSpecs.potential || ''}
                        onChange={(e) => setEditableSpecs({...editableSpecs, potential: parseFloat(e.target.value) || undefined})}
                        className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary focus:border-copper focus:outline-none"
                        step="0.001"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-text-muted mb-2">ტიპი</label>
                      <select
                        value={editableSpecs.maltType || ''}
                        onChange={(e) => setEditableSpecs({...editableSpecs, maltType: e.target.value})}
                        className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary focus:border-copper focus:outline-none"
                      >
                        <option value="">აირჩიეთ</option>
                        <option value="base">საბაზო</option>
                        <option value="caramel">კარამელის</option>
                        <option value="roasted">შემწვარი</option>
                        <option value="specialty">სპეციალური</option>
                        <option value="smoked">შებოლილი</option>
                        <option value="acidulated">მჟავიანი</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-text-muted mb-2">წარმოშობა</label>
                    <input
                      type="text"
                      value={editableSpecs.origin || ''}
                      onChange={(e) => setEditableSpecs({...editableSpecs, origin: e.target.value})}
                      className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary focus:border-copper focus:outline-none"
                      placeholder="Germany, Belgium, UK..."
                    />
                  </div>
                </>
              )}
              
              {/* Hop Specs */}
              {editableSpecs.itemCategory === 'hops' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-text-muted mb-2">Alpha Acid (%)</label>
                      <input
                        type="number"
                        value={editableSpecs.alphaAcid || ''}
                        onChange={(e) => setEditableSpecs({...editableSpecs, alphaAcid: parseFloat(e.target.value) || undefined})}
                        className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary focus:border-copper focus:outline-none"
                        step="0.1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-text-muted mb-2">Beta Acid (%)</label>
                      <input
                        type="number"
                        value={editableSpecs.betaAcid || ''}
                        onChange={(e) => setEditableSpecs({...editableSpecs, betaAcid: parseFloat(e.target.value) || undefined})}
                        className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary focus:border-copper focus:outline-none"
                        step="0.1"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-text-muted mb-2">დანიშნულება</label>
                      <select
                        value={editableSpecs.purpose || ''}
                        onChange={(e) => setEditableSpecs({...editableSpecs, purpose: e.target.value})}
                        className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary focus:border-copper focus:outline-none"
                      >
                        <option value="">აირჩიეთ</option>
                        <option value="aroma">არომატისთვის</option>
                        <option value="bittering">სიმწარისთვის</option>
                        <option value="dual">ორმაგი დანიშნულება</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-text-muted mb-2">ფორმა</label>
                      <select
                        value={editableSpecs.form || ''}
                        onChange={(e) => setEditableSpecs({...editableSpecs, form: e.target.value})}
                        className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary focus:border-copper focus:outline-none"
                      >
                        <option value="">აირჩიეთ</option>
                        <option value="pellet">გრანულა</option>
                        <option value="leaf">ფოთოლი</option>
                        <option value="cryo">კრიო</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-text-muted mb-2">წარმოშობა</label>
                    <input
                      type="text"
                      value={editableSpecs.origin || ''}
                      onChange={(e) => setEditableSpecs({...editableSpecs, origin: e.target.value})}
                      className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary focus:border-copper focus:outline-none"
                      placeholder="Germany, USA, Czech..."
                    />
                  </div>
                </>
              )}
              
              {/* Yeast Specs */}
              {editableSpecs.itemCategory === 'yeast' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-text-muted mb-2">ატენუაცია</label>
                      <input
                        type="text"
                        value={editableSpecs.attenuation || ''}
                        onChange={(e) => setEditableSpecs({...editableSpecs, attenuation: e.target.value})}
                        className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary focus:border-copper focus:outline-none"
                        placeholder="75-80%"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-text-muted mb-2">ტემპერატურა</label>
                      <input
                        type="text"
                        value={editableSpecs.tempRange || ''}
                        onChange={(e) => setEditableSpecs({...editableSpecs, tempRange: e.target.value})}
                        className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary focus:border-copper focus:outline-none"
                        placeholder="18-22°C"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-text-muted mb-2">ფლოკულაცია</label>
                      <select
                        value={editableSpecs.flocculation || ''}
                        onChange={(e) => setEditableSpecs({...editableSpecs, flocculation: e.target.value})}
                        className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary focus:border-copper focus:outline-none"
                      >
                        <option value="">აირჩიეთ</option>
                        <option value="low">დაბალი</option>
                        <option value="medium">საშუალო</option>
                        <option value="high">მაღალი</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-text-muted mb-2">ტიპი</label>
                      <select
                        value={editableSpecs.yeastType || ''}
                        onChange={(e) => setEditableSpecs({...editableSpecs, yeastType: e.target.value})}
                        className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary focus:border-copper focus:outline-none"
                      >
                        <option value="">აირჩიეთ</option>
                        <option value="ale">ელის</option>
                        <option value="lager">ლაგერის</option>
                        <option value="wheat">ხორბლის</option>
                        <option value="belgian">ბელგიური</option>
                        <option value="wild">ველური</option>
                      </select>
                    </div>
                  </div>
                </>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-border flex justify-end gap-3">
              <button
                onClick={() => setShowEditSpecsModal(false)}
                className="px-4 py-2 bg-bg-tertiary hover:bg-bg-secondary text-text-primary rounded-lg transition-colors"
              >
                გაუქმება
              </button>
              <button
                onClick={handleSaveSpecs}
                disabled={isSavingSpecs}
                className="px-4 py-2 bg-copper hover:bg-copper/80 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingSpecs ? '⏳ იტვირთება...' : '💾 შენახვა'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => !isDeleting && setShowDeleteModal(false)}
        >
          <div 
            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
                <span className="text-4xl">🗑️</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                ინგრედიენტის წაშლა
              </h3>
              <p className="text-slate-400">
                დარწმუნებული ხართ, რომ გსურთ წაშალოთ <span className="text-white font-medium">{ingredient?.name}</span>?
              </p>
              <p className="text-sm text-red-400 mt-2">
                ეს მოქმედება შეუქცევადია და წაშლის ყველა დაკავშირებულ ჩანაწერს.
              </p>
            </div>
            
            {/* Footer */}
            <div className="p-4 bg-slate-800/50 flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                გაუქმება
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    იშლება...
                  </>
                ) : (
                  <>
                    🗑️ წაშლა
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  )
}



