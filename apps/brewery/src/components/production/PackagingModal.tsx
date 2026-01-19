'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui'
import { useBreweryStore } from '@/store'



interface PackagingModalProps {

  isOpen: boolean

  onClose: () => void

  onComplete: (packagingData: any) => void

  batchId: string

  batchIds?: string[]  // ✅ For blend lots - all batch IDs

  batchNumber: string

  recipeName: string

  availableLiters: number
  totalVolume?: number
  packagedVolume?: number

  lotId?: string      // ✅ ADD THIS

  lotCode?: string    // ✅ ADD THIS

}



interface PackagingMaterial {

  id: string

  name: string

  type: 'keg' | 'bottle' | 'cap' | 'label'

  size?: number

  stock: number

  required: number

  status: 'ok' | 'low' | 'insufficient'

}

interface InventoryStock {
  bottles500: number
  bottles330: number
  cans500: number
  cans330: number
  labels: { id: string; name: string; recipeId?: string; size?: string; quantity: number }[]
  caps26mm: number
  caps29mm: number
}

interface KegStock {
  keg20: number
  keg30: number
  keg50: number
  availableKegs30: { id: string; code: string }[]
  availableKegs50: { id: string; code: string }[]
}

// Selectable inventory items
interface SelectableItem {
  id: string
  name: string
  quantity: number
  size?: string
  recipeId?: string
  metadata?: any
}



const PACKAGING_TYPES = [
  { type: 'keg', size: 20, label: '🛢️ კეგი 20L', maxCapacity: 20 },
  { type: 'keg', size: 30, label: '🛢️ კეგი 30L', maxCapacity: 30 },
  { type: 'keg', size: 50, label: '🛢️ კეგი 50L', maxCapacity: 50 },
  { type: 'bottle', size: 0.5, label: '🍾 ბოთლი 500ml', maxCapacity: 0.5 },
  { type: 'bottle', size: 0.33, label: '🍾 ბოთლი 330ml', maxCapacity: 0.33 },
  { type: 'can', size: 0.5, label: '🥫 ქილა', maxCapacity: 0.5 },
]



export function PackagingModal({ 

  isOpen, 

  onClose, 
  
  onComplete, 
  
  batchId, 

  batchIds,  // ✅ For blend lots
  
  batchNumber, 
  
  recipeName, 
  
  availableLiters,
  totalVolume,
  packagedVolume,

  lotId,      // ✅ ADD THIS

  lotCode,    // ✅ ADD THIS

}: PackagingModalProps) {

  const router = useRouter()

  // ALL HOOKS FIRST - before any conditional returns
  const [selectedType, setSelectedType] = useState<{ type: string; size: number } | null>(null)

  const [quantity, setQuantity] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Keg selection states
  const [availableKegs, setAvailableKegs] = useState<Array<{
    id: string
    kegNumber: string
    size: number
    condition: string
  }>>([])
  const [selectedKegIds, setSelectedKegIds] = useState<string[]>([])
  const [loadingKegs, setLoadingKegs] = useState(false)
  const [kegStock, setKegStock] = useState<KegStock>({
    keg20: 0,
    keg30: 0,
    keg50: 0,
    availableKegs30: [],
    availableKegs50: [],
  })
  const [inventoryStock, setInventoryStock] = useState<InventoryStock>({
    bottles500: 0,
    bottles330: 0,
    cans500: 0,
    cans330: 0,
    labels: [],
    caps26mm: 0,
    caps29mm: 0,
  })
  const [batchRecipeId, setBatchRecipeId] = useState<string | null>(null)

  // ✅ State for selectable material items
  const [allBottles, setAllBottles] = useState<SelectableItem[]>([])
  const [allCans, setAllCans] = useState<SelectableItem[]>([])
  const [allLabels, setAllLabels] = useState<SelectableItem[]>([])
  const [allCaps, setAllCaps] = useState<SelectableItem[]>([])
  
  // ✅ Selected item IDs (user picks from dropdown)
  const [selectedBottleId, setSelectedBottleId] = useState<string | null>(null)
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null)
  const [selectedCapId, setSelectedCapId] = useState<string | null>(null)

  // ✅ Zustand hooks BEFORE any return
  const addPackagingRecord = useBreweryStore(state => state.addPackagingRecord)
  const addTimelineEvent = useBreweryStore(state => state.addTimelineEvent)
  // Remove: const startPackaging = useBreweryStore(state => state.startPackaging)

  // Helper function to check if selected type is a keg
  const isKegType = (type: { type: string; size: number } | null): boolean => {
    if (!type) return false
    return type.type === 'keg'
  }

  // ✅ Reset material selections when packaging type changes
  useEffect(() => {
    setSelectedBottleId(null)
    setSelectedLabelId(null)
    setSelectedCapId(null)
    setQuantity('')
  }, [selectedType])

  // ✅ Reset all selections when modal closes
  useEffect(() => {
    if (!isOpen) {
      // ✅ Reset all selections when modal closes
      setSelectedKegIds([])
      setQuantity('')
      setSelectedBottleId(null)
      setSelectedCapId(null)
      setSelectedLabelId(null)
      setSelectedType(null)
    }
  }, [isOpen])

  // Fetch batch recipeId
  useEffect(() => {
    if (batchId) {
      fetch(`/api/batches/${batchId}`)
        .then(res => res.json())
        .then(data => {
          if (data.batch?.recipeId) {
            setBatchRecipeId(data.batch.recipeId)
          }
        })
        .catch(err => console.error('Failed to fetch batch:', err))
    }
  }, [batchId])

  // Fetch real inventory stock on mount
  useEffect(() => {
    const fetchInventoryStock = async () => {
      try {
        // Fetch all inventory categories
        const [bottleRes, canRes, labelRes, capRes, kegRes] = await Promise.all([
          fetch('/api/inventory?category=BOTTLE'),
          fetch('/api/inventory?category=CAN'),
          fetch('/api/inventory?category=PACKAGING'), // Labels are in PACKAGING with metadata.type='label'
          fetch('/api/inventory?category=PACKAGING'), // Caps are in PACKAGING with metadata.type='cap'
          fetch('/api/kegs?status=AVAILABLE'),
        ])

        // Process bottles (from BOTTLE category)
        if (bottleRes.ok) {
          const data = await bottleRes.json()
          const bottles = (data.items || []).filter((i: any) => {
            const name = i.name?.toLowerCase() || ''
            // Only include items that are actually bottles
            // EXCLUDE cans, caps, labels, ingredients
            if (name.includes('ქილა') || name.includes('can')) return false
            if (name.includes('თავსახური') || name.includes('თავას') || name.includes('cap')) return false
            if (name.includes('ეტიკეტ') || name.includes('label') || name.includes('პილსი')) return false
            if (name.includes('malt') || name.includes('hop') || name.includes('yeast')) return false
            
            // INCLUDE bottles
            return i.category === 'BOTTLE' || 
                   i.metadata?.type === 'bottle' ||
                   name.includes('ბოთლი') ||
                   name.includes('bottle') ||
                   (name.includes('500') && !name.includes('ქილა'))
          })
          console.log('[PackagingModal] BOTTLE items from API:', bottles)
          
          // ✅ Store all bottles for dropdown selection
          const selectableBottles: SelectableItem[] = bottles.map((b: any) => ({
            id: b.id,
            name: b.name,
            quantity: b.quantity || 0,
            size: b.metadata?.bottleType || (b.name?.includes('500') ? '500ml' : b.name?.includes('330') ? '330ml' : ''),
            metadata: b.metadata,
          }))
          setAllBottles(selectableBottles)
          console.log('[PackagingModal] Selectable bottles:', selectableBottles)
          
          let b500 = 0, b330 = 0
          bottles.forEach((b: any) => {
            const bottleType = b.metadata?.bottleType || ''
            const name = (b.name || '').toLowerCase()
            const qty = b.quantity || 0
            console.log('[PackagingModal] Processing bottle:', b.name, 'bottleType:', bottleType, 'quantity:', qty)
            
            // Check by metadata.bottleType first (most reliable)
            if (bottleType === 'bottle_500') {
              b500 += qty
            } else if (bottleType === 'bottle_330') {
              b330 += qty
            } else {
              // Fallback to name patterns - but be careful!
              if (name.includes('500') && !name.includes('330')) {
                b500 += qty
              } else if ((name.includes('330') || name.includes('0.33')) && !name.includes('500')) {
                b330 += qty
              }
              // Don't default to 500ml - only count bottles we can identify
            }
          })
          console.log('[PackagingModal] Final bottle stock - 500ml:', b500, '330ml:', b330)
          setInventoryStock(prev => ({ ...prev, bottles500: b500, bottles330: b330 }))
        }

        // Process cans
        if (canRes.ok) {
          const data = await canRes.json()
          const items = data.items || []
          
          // ✅ Filter to only actual cans
          const canItems = items.filter((i: any) => {
            const name = i.name?.toLowerCase() || ''
            return name.includes('ქილა') || 
                   name.includes('can') ||
                   i.metadata?.type === 'can' ||
                   i.category === 'CAN'
          })
          
          // ✅ Store filtered cans for dropdown selection
          const selectableCans: SelectableItem[] = canItems.map((i: any) => ({
            id: i.id,
            name: i.name,
            quantity: i.quantity || 0,
            size: i.metadata?.bottleType || (i.name?.includes('500') ? '500ml' : i.name?.includes('330') ? '330ml' : ''),
            metadata: i.metadata,
          }))
          setAllCans(selectableCans)
          console.log('[PackagingModal] Selectable cans:', selectableCans)
          
          const cans500 = canItems
            .filter((i: any) => i.name?.includes('500') || i.metadata?.bottleType === 'can_500' || i.metadata?.type === 'can_500')
            .reduce((sum: number, i: any) => sum + (i.quantity || 0), 0)
          const cans330 = canItems
            .filter((i: any) => i.name?.includes('330') || i.metadata?.bottleType === 'can_330' || i.metadata?.type === 'can_330')
            .reduce((sum: number, i: any) => sum + (i.quantity || 0), 0)
          setInventoryStock(prev => ({ ...prev, cans500, cans330 }))
        }

        // Process labels (from LABEL category)
        const labelDirectRes = await fetch('/api/inventory?category=LABEL')
        if (labelDirectRes.ok) {
          const data = await labelDirectRes.json()
          const items = data.items || []
          console.log('[PackagingModal] Labels from API (raw):', items)
          
          // ✅ FIX: Filter to ONLY include actual labels, EXCLUDE ingredients
          const labelItems = items.filter((i: any) => {
            const name = i.name?.toLowerCase() || ''
            
            // EXCLUDE known ingredient patterns
            if (name.includes('malt') || name.includes('ალაო')) return false
            if (name.includes('hops') || name.includes('სვია')) return false
            if (name.includes('yeast') || name.includes('საფუარი')) return false
            if (name.includes('lager') && name.includes('saf')) return false // SafLager is yeast
            if (name.includes('caramel')) return false
            if (name.includes('munich')) return false
            if (name.includes('wheat')) return false
            if (name.includes('magnum')) return false // hop
            if (name.includes('tettnang')) return false // hop
            if (name.includes('pilsner') && name.includes('malt')) return false
            if (name.includes('best ')) return false // BEST brand malts
            
            // INCLUDE only things that look like labels
            return name.includes('ეტიკეტ') || 
                   name.includes('label') || 
                   name.includes('პილსი') ||
                   i.metadata?.type === 'label' ||
                   (i.category === 'LABEL' && !name.includes('malt') && !name.includes('hop'))
          })
          
          const labels = labelItems.map((i: any) => ({
            id: i.id,
            name: i.name,
            recipeId: i.metadata?.recipeId,
            size: i.metadata?.size || (i.name?.includes('330') ? '330ml' : i.name?.includes('500') ? '500ml' : null),
            quantity: i.quantity || 0,
          }))
          console.log('[PackagingModal] Processed labels (filtered):', labels)
          setInventoryStock(prev => ({ ...prev, labels }))
          
          // ✅ Store labels for dropdown selection
          const selectableLabels: SelectableItem[] = labelItems.map((i: any) => ({
            id: i.id,
            name: i.name,
            quantity: i.quantity || 0,
            size: i.metadata?.size || (i.name?.includes('330') ? '330ml' : i.name?.includes('500') ? '500ml' : ''),
            recipeId: i.metadata?.recipeId,
            metadata: i.metadata,
          }))
          setAllLabels(selectableLabels)
          console.log('[PackagingModal] Selectable labels:', selectableLabels)
        } else if (labelRes.ok) {
          // Fallback to PACKAGING category
          const data = await labelRes.json()
          const items = data.items || []
          
          // Filter to only actual labels, exclude ingredients
          const labelItems = items.filter((i: any) => {
            const name = i.name?.toLowerCase() || ''
            
            // EXCLUDE ingredients
            if (name.includes('malt')) return false
            if (name.includes('hops') || name.includes('hop')) return false
            if (name.includes('yeast') || name.includes('saf')) return false
            if (name.includes('caramel')) return false
            if (name.includes('munich')) return false
            if (name.includes('wheat')) return false
            if (name.includes('magnum')) return false
            if (name.includes('tettnang')) return false
            if (name.includes('best ')) return false
            
            return name.includes('ეტიკეტ') || 
                   name.includes('label') || 
                   name.includes('პილსი') ||
                   i.metadata?.type === 'label'
          })
          
          const labels = labelItems.map((i: any) => ({
            id: i.id,
            name: i.name,
            recipeId: i.metadata?.recipeId,
            size: i.metadata?.size,
            quantity: i.quantity || 0,
          }))
          setInventoryStock(prev => ({ ...prev, labels }))
          
          // ✅ Store for dropdown
          const selectableLabels: SelectableItem[] = labelItems.map((i: any) => ({
            id: i.id,
            name: i.name,
            quantity: i.quantity || 0,
            size: i.metadata?.size || '',
            recipeId: i.metadata?.recipeId,
          }))
          setAllLabels(selectableLabels)
        }

        // Process caps (from CAP category first, then fallback to PACKAGING)
        const capDirectRes = await fetch('/api/inventory?category=CAP')
        if (capDirectRes.ok) {
          const data = await capDirectRes.json()
          const items = data.items || []
          console.log('[PackagingModal] CAP items from API:', items)
          
          // ✅ Filter to only actual caps
          const capItems = items.filter((i: any) => {
            const name = i.name?.toLowerCase() || ''
            return name.includes('თავსახური') || 
                   name.includes('თავას') || 
                   name.includes('cap') ||
                   name.includes('26mm') ||
                   name.includes('29mm') ||
                   i.metadata?.type === 'cap'
          })
          
          // ✅ Store filtered caps for dropdown selection
          const selectableCaps: SelectableItem[] = capItems.map((i: any) => ({
            id: i.id,
            name: i.name,
            quantity: i.quantity || 0,
            size: i.metadata?.size || (i.name?.includes('26') ? '26mm' : i.name?.includes('29') ? '29mm' : ''),
            metadata: i.metadata,
          }))
          setAllCaps(selectableCaps)
          console.log('[PackagingModal] Filtered selectable caps:', selectableCaps)
          
          const caps26mm = capItems
            .filter((i: any) => i.name?.includes('26') || i.metadata?.size === '26mm')
            .reduce((sum: number, i: any) => sum + (i.quantity || 0), 0)
          const caps29mm = capItems
            .filter((i: any) => i.name?.includes('29') || i.metadata?.size === '29mm')
            .reduce((sum: number, i: any) => sum + (i.quantity || 0), 0)
          setInventoryStock(prev => ({ ...prev, caps26mm, caps29mm }))
        } else if (capRes.ok) {
          // Fallback to PACKAGING category
          const data = await capRes.json()
          const items = data.items || []
          
          // Filter to get only caps
          const capItems = items.filter((i: any) => {
            const name = i.name?.toLowerCase() || ''
            return name.includes('თავსახური') || 
                   name.includes('თავას') || 
                   name.includes('cap') ||
                   name.includes('26mm') ||
                   name.includes('29mm') ||
                   i.metadata?.type === 'cap'
          })
          
          // ✅ Store filtered caps for dropdown selection
          const selectableCaps: SelectableItem[] = capItems.map((i: any) => ({
            id: i.id,
            name: i.name,
            quantity: i.quantity || 0,
            size: i.metadata?.size || (i.name?.includes('26') ? '26mm' : i.name?.includes('29') ? '29mm' : ''),
            metadata: i.metadata,
          }))
          setAllCaps(selectableCaps)
          
          const caps26mm = capItems
            .filter((i: any) => i.name?.includes('26') || i.metadata?.size === '26mm')
            .reduce((sum: number, i: any) => sum + (i.quantity || 0), 0)
          const caps29mm = capItems
            .filter((i: any) => i.name?.includes('29') || i.metadata?.size === '29mm')
            .reduce((sum: number, i: any) => sum + (i.quantity || 0), 0)
          setInventoryStock(prev => ({ ...prev, caps26mm, caps29mm }))
        }

        // Process kegs
        if (kegRes.ok) {
          const data = await kegRes.json()
          const kegs = data.kegs || []
          const available = kegs.filter((k: any) => k.status === 'AVAILABLE')
          setKegStock({
            keg20: available.filter((k: any) => k.size === 20).length,
            keg30: available.filter((k: any) => k.size === 30).length,
            keg50: available.filter((k: any) => k.size === 50).length,
            availableKegs30: available.filter((k: any) => k.size === 30).map((k: any) => ({ 
              id: k.id, 
              code: k.kegNumber || k.code || k.id 
            })),
            availableKegs50: available.filter((k: any) => k.size === 50).map((k: any) => ({ 
              id: k.id, 
              code: k.kegNumber || k.code || k.id 
            })),
          })
        }
      } catch (error) {
        console.error('Failed to fetch inventory stock:', error)
      }
    }

    fetchInventoryStock()
  }, [])

  // Fetch available kegs when keg type is selected
  useEffect(() => {
    const fetchAvailableKegs = async () => {
      if (!selectedType || !isKegType(selectedType)) {
        setAvailableKegs([])
        setSelectedKegIds([])
        return
      }

      const kegSize = selectedType.size || 30

      try {
        setLoadingKegs(true)
        const res = await fetch(`/api/kegs?status=AVAILABLE&size=${kegSize}`)
        if (res.ok) {
          const data = await res.json()
          setAvailableKegs(data.kegs || [])
        }
      } catch (error) {
        console.error('Failed to fetch available kegs:', error)
      } finally {
        setLoadingKegs(false)
      }
    }

    fetchAvailableKegs()
    // Reset selected kegs when type changes
    setSelectedKegIds([])
  }, [selectedType])

  // Helper functions for keg selection
  const handleKegToggle = (kegId: string) => {
    setSelectedKegIds(prev => {
      if (prev.includes(kegId)) {
        return prev.filter(id => id !== kegId)
      } else {
        return [...prev, kegId]
      }
    })
  }

  const handleSelectAllKegs = () => {
    if (selectedKegIds.length === availableKegs.length) {
      setSelectedKegIds([])
    } else {
      setSelectedKegIds(availableKegs.map(k => k.id))
    }
  }

  // NOW you can have early return
  if (!isOpen) return null



  const maxQuantity = selectedType 

    ? Math.floor(availableLiters / selectedType.size)

    : 0



  // Calculate used liters based on keg selection or quantity
  // ✅ selectedType.size is now explicit (0.33 or 0.5) from PACKAGING_TYPES
  const usedLiters = (() => {
    if (!selectedType) return 0
    
    if (isKegType(selectedType)) {
      return selectedKegIds.length * selectedType.size
    }
    
    if (quantity) {
      // ✅ Use selectedType.size directly since we have explicit 0.33 and 0.5 options
      return parseFloat(quantity) * selectedType.size
    }
    
    return 0
  })()

  const remainingLiters = availableLiters - usedLiters



  // Mock materials check

  const getRequiredMaterials = (): PackagingMaterial[] => {

    if (!selectedType) return []

    // For kegs, use selectedKegIds.length, for others use quantity
    const qty = isKegType(selectedType) 
      ? selectedKegIds.length
      : parseInt(quantity) || 0

    if (qty === 0) return []



    if (selectedType.type === 'keg') {
      // Get stock count based on keg size
      const stockCount = selectedType.size === 20 ? kegStock.keg20 :
                        selectedType.size === 30 ? kegStock.keg30 :
                        selectedType.size === 50 ? kegStock.keg50 : 0

      return [
        { id: '1', name: `კეგი ${selectedType.size}L`, type: 'keg', size: selectedType.size, stock: stockCount, required: qty, status: qty <= stockCount ? 'ok' : 'insufficient' },
      ]
    }

    if (selectedType.type === 'bottle' || selectedType.type === 'can') {
      const materials: PackagingMaterial[] = []

      // ✅ Use selectedType.size directly since we have explicit 0.33 and 0.5 options
      const actualSize = selectedType.size

      // Bottle/Can - match by selected size
      let bottleStock = 0
      if (selectedType.type === 'bottle') {
        bottleStock = actualSize === 0.5 ? inventoryStock.bottles500 : inventoryStock.bottles330
      } else if (selectedType.type === 'can') {
        bottleStock = actualSize === 0.5 ? inventoryStock.cans500 : inventoryStock.cans330
      }
      console.log('[getRequiredMaterials] type:', selectedType.type, 'size:', actualSize, 'stock:', bottleStock)

      materials.push({
        id: '1',
        name: `${selectedType.type === 'bottle' ? 'ბოთლი' : 'ქილა'} ${actualSize === 0.33 ? '330ml' : '500ml'}`,
        type: selectedType.type as any,
        size: actualSize,
        stock: bottleStock,
        required: qty,
        status: qty <= bottleStock ? 'ok' : 'insufficient',
      })

      // Cap (26mm for bottles only - cans don't need caps)
      if (selectedType.type === 'bottle') {
        const capStock = inventoryStock.caps26mm
        materials.push({
          id: '2',
          name: 'თავსახური 26mm',
          type: 'cap',
          stock: capStock,
          required: qty,
          status: qty <= capStock ? 'ok' : 'insufficient',
        })
      }

      // Label (only for bottles, match by recipeId first, then SIZE)
      if (selectedType.type === 'bottle') {
        // ✅ Get required label size based on ACTUAL bottle size
        const labelSize = actualSize === 0.5 ? '500ml' : '330ml'
        
        console.log('[getRequiredMaterials] Looking for label:', { 
          batchRecipeId, 
          labelSize, 
          labelsCount: inventoryStock.labels.length,
          allLabels: inventoryStock.labels.map(l => ({ name: l.name, qty: l.quantity, size: l.size, recipeId: l.recipeId }))
        })
        
        // ✅ FIX: Match by recipeId FIRST, then by exact size match (same as deduction logic)
        // Don't use name pattern matching - it incorrectly matches bottles!
        const matchingLabel = inventoryStock.labels.find(l => 
          l.recipeId === batchRecipeId || l.size === labelSize
        )
        
        const labelStock = matchingLabel?.quantity || 0
        console.log('[getRequiredMaterials] Label match result:', { 
          matchingLabel: matchingLabel ? { name: matchingLabel.name, qty: matchingLabel.quantity, id: matchingLabel.id } : null, 
          labelStock 
        })
        
        materials.push({
          id: '3',
          name: matchingLabel ? `ეტიკეტი: ${matchingLabel.name}` : `ეტიკეტი ${labelSize}`,
          type: 'label',
          stock: labelStock,
          required: qty,
          status: qty <= labelStock ? 'ok' : 'insufficient',
        })
      }

      return materials
    }



    return []

  }



  const materials = getRequiredMaterials()

  const allMaterialsOk = materials.every(m => m.status === 'ok')
  
  // ✅ Check if all required materials are selected and have enough stock
  const allMaterialsSelected = (() => {
    if (!selectedType || isKegType(selectedType)) return true
    if (!quantity || parseInt(quantity) <= 0) return true
    
    const qty = parseInt(quantity)
    
    // For bottles: need bottle, cap, and label
    if (selectedType.type === 'bottle') {
      const selectedBottle = allBottles.find(b => b.id === selectedBottleId)
      const selectedCap = allCaps.find(c => c.id === selectedCapId)
      const selectedLabel = allLabels.find(l => l.id === selectedLabelId)
      
      if (!selectedBottle || selectedBottle.quantity < qty) return false
      if (!selectedCap || selectedCap.quantity < qty) return false
      if (!selectedLabel || selectedLabel.quantity < qty) return false
      return true
    }
    
    // For cans: only need container (from allCans)
    if (selectedType.type === 'can') {
      const selectedCan = allCans.find(c => c.id === selectedBottleId)
      return selectedCan && selectedCan.quantity >= qty
    }
    
    return true
  })()

  const handleComplete = async () => {
    // ✅ Prevent double submission
    if (isSubmitting) {
      console.log('[PackagingModal] Already submitting, ignoring duplicate call')
      return
    }

    if (!selectedType || !batchId) {
      console.error('[PackagingModal] Missing required fields:', { selectedType, batchId })
      return
    }

    // Validation based on type
    if (isKegType(selectedType)) {
      if (selectedKegIds.length === 0) {
        alert('გთხოვთ აირჩიოთ მინიმუმ ერთი კეგი')
        return
      }
    } else {
      if (!quantity || parseInt(quantity) <= 0) {
        alert('გთხოვთ შეიყვანოთ რაოდენობა')
        return
      }
      // ✅ Validate material selection for bottles/cans
      if (selectedType.type === 'bottle') {
        if (!selectedBottleId) {
          alert('გთხოვთ აირჩიოთ ბოთლი მარაგებიდან')
          return
        }
        if (!selectedCapId) {
          alert('გთხოვთ აირჩიოთ თავსახური მარაგებიდან')
          return
        }
        if (!selectedLabelId) {
          alert('გთხოვთ აირჩიოთ ეტიკეტი მარაგებიდან')
          return
        }
      } else if (selectedType.type === 'can') {
        if (!selectedBottleId) {
          alert('გთხოვთ აირჩიოთ ქილა მარაგებიდან')
          return
        }
      }
    }

    setIsSubmitting(true)

    // Convert to PackageType enum
    const packageTypeMap: Record<string, string> = {
      'keg_20': 'KEG_20',
      'keg_30': 'KEG_30',
      'keg_50': 'KEG_50',
      'bottle_0.5': 'BOTTLE_500',
      'bottle_0.33': 'BOTTLE_330',
      'can_0.5': 'CAN_500',
      'can_0.33': 'CAN_330',
    }
    
    // ✅ Use selectedType.size directly since we have explicit 0.33 and 0.5 options
    const packageType = packageTypeMap[`${selectedType.type}_${selectedType.size}`] || 'KEG_30'

    try {
      if (isKegType(selectedType)) {
        // === KEG PACKAGING ===
        // Fill each selected keg individually
        const fillPromises = selectedKegIds.map(kegId =>
          fetch(`/api/kegs/${kegId}/fill`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              batchId,
              productName: `${recipeName || 'Beer'} ${selectedType.size || 30}L`,
              lotNumber: `LOT-${batchNumber}-${Date.now()}`,
              notes: `Packaging from batch ${batchNumber}`,
            }),
          })
        )

        const results = await Promise.all(fillPromises)
        const failedResults = await Promise.all(results.map(r => r.ok ? null : r.json().catch(() => ({ error: 'Unknown error' }))))
        const failedCount = failedResults.filter(r => r !== null).length

        if (failedCount > 0) {
          alert(`${failedCount} კეგის შევსება ვერ მოხერხდა`)
        }

        // Also create PackagingRun record for tracking
        const volumeL = selectedKegIds.length * selectedType.size
        const packagingRes = await fetch('/api/packaging', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            batchId,
            batchIds: batchIds || [batchId],  // ✅ Send all batch IDs for blend lots
            packageType,
            quantity: selectedKegIds.length,
            performedBy: 'ნიკა ზედგინიძე',
            notes: `კეგები: ${selectedKegIds.length} ცალი (${selectedKegIds.join(', ')})`,
            lotId,           // ✅ ADD THIS
            lotNumber: lotCode,  // ✅ ADD THIS - pass lotCode as lotNumber
          }),
        })

        if (!packagingRes.ok) {
          const data = await packagingRes.json()
          throw new Error(data.error || 'PackagingRun record creation failed')
        }

        const packagingData = await packagingRes.json()

        // Update local store for UI
        addPackagingRecord({
          batchId,
          packageType,
          quantity: selectedKegIds.length,
          volumeL: volumeL,
          performedBy: 'ნიკა ზედგინიძე',
        })

        // ✅ FIX: Save kegIds BEFORE clearing (for callback)
        const completedKegIds = [...selectedKegIds]
        
        // ✅ Clear selections after successful packaging
        setSelectedKegIds([])
        setSelectedType(null)

        // ✅ Use saved kegIds, not the cleared state
        onComplete({ ...packagingData, batchId, batchNumber, kegIds: completedKegIds })
        onClose()
      } else {
        // === BOTTLE/CAN PACKAGING ===
        const qty = parseInt(quantity)
        
        // ✅ Use selectedType.size directly since we have explicit 0.33 and 0.5 options
        const volumeL = parseFloat(quantity) * selectedType.size
        
        // Create packaging record first
        const response = await fetch('/api/packaging', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            batchId,
            batchIds: batchIds || [batchId],  // ✅ Send all batch IDs for blend lots
            packageType,
            quantity: qty,
            performedBy: 'ნიკა ზედგინიძე',
            notes: `შეფუთვა: ${selectedType.type}, ${quantity} x ${selectedType.size === 0.33 ? '330ml' : '500ml'}`,
            lotId,           // ✅ ADD THIS
            lotNumber: lotCode,  // ✅ ADD THIS
          }),
        })

        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'შეფუთვა ვერ მოხერხდა')

        // ✅ Deduct inventory using SELECTED item IDs from dropdowns
        try {
          // Deduct bottles/cans using selected ID
          if (selectedBottleId) {
            console.log(`[PackagingModal] Deducting ${qty} from bottle ID: ${selectedBottleId}`)
            const containerDeductRes = await fetch('/api/inventory/deduct', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                itemId: selectedBottleId,
                quantity: qty,
                batchId,
              }),
            })

            if (containerDeductRes.ok) {
              console.log(`[PackagingModal] ✅ Deducted ${qty} bottles`)
            } else {
              console.warn('Failed to deduct containers:', await containerDeductRes.json())
            }
          }

          // Deduct caps using selected ID (only for bottles)
          if (selectedType.type === 'bottle' && selectedCapId) {
            console.log(`[PackagingModal] Deducting ${qty} from cap ID: ${selectedCapId}`)
            const capDeductRes = await fetch('/api/inventory/deduct', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                itemId: selectedCapId,
                quantity: qty,
                batchId,
              }),
            })

            if (capDeductRes.ok) {
              console.log(`[PackagingModal] ✅ Deducted ${qty} caps`)
            } else {
              console.warn('Failed to deduct caps:', await capDeductRes.json())
            }
          }

          // Deduct labels using selected ID (only for bottles)
          if (selectedType.type === 'bottle' && selectedLabelId) {
            console.log(`[PackagingModal] Deducting ${qty} from label ID: ${selectedLabelId}`)
            const labelDeductRes = await fetch('/api/inventory/deduct', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                itemId: selectedLabelId,
                quantity: qty,
                batchId,
              }),
            })

            if (labelDeductRes.ok) {
              console.log(`[PackagingModal] ✅ Deducted ${qty} labels`)
            } else {
              console.warn('Failed to deduct labels:', await labelDeductRes.json())
            }
          }
        } catch (deductError) {
          console.error('Error deducting inventory:', deductError)
          // Don't fail the packaging if inventory deduction fails, just log it
        }

        // ✅ Update local state to reflect deductions
        if (selectedType.type === 'bottle') {
          setAllBottles(prev => prev.map(b => 
            b.id === selectedBottleId ? { ...b, quantity: Math.max(0, b.quantity - qty) } : b
          ))
          setAllCaps(prev => prev.map(c => 
            c.id === selectedCapId ? { ...c, quantity: Math.max(0, c.quantity - qty) } : c
          ))
          setAllLabels(prev => prev.map(l => 
            l.id === selectedLabelId ? { ...l, quantity: Math.max(0, l.quantity - qty) } : l
          ))
        } else if (selectedType.type === 'can') {
          setAllCans(prev => prev.map(c => 
            c.id === selectedBottleId ? { ...c, quantity: Math.max(0, c.quantity - qty) } : c
          ))
        }

        // Update local store for UI
        addPackagingRecord({
          batchId,
          packageType,
          quantity: qty,
          volumeL: volumeL,
          performedBy: 'ნიკა ზედგინიძე',
        })

        // ✅ Clear selections after successful packaging
        setQuantity('')
        setSelectedType(null)
        setSelectedBottleId(null)
        setSelectedCapId(null)
        setSelectedLabelId(null)

        onComplete({ ...data, batchId, batchNumber })
        onClose()
      }
    } catch (error: any) {
      console.error('[PackagingModal] ❌ Failed to create packaging:', error)
      alert(error.message || 'შეფუთვა ვერ მოხერხდა')
    } finally {
      setIsSubmitting(false)
    }
  }



  return (

    <div className="fixed inset-0 z-[60] flex items-center justify-center">

      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-bg-secondary border border-border rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">

        {/* Header */}

        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-bg-tertiary">

          <h2 className="text-xl font-display font-semibold">🎁 პარტიის შეფუთვა | {batchNumber}</h2>

          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-bg-card border border-border flex items-center justify-center hover:border-danger hover:text-danger transition-colors">

            ✕

          </button>

        </div>



        {/* Content */}

        <div className="flex-1 overflow-y-auto p-6">

          {/* Info Banner */}

          <div className="mb-6 p-4 bg-bg-card border border-border rounded-xl">

            <p className="font-medium">{recipeName}</p>

            <p className="text-sm text-text-muted">ხელმისაწვდომი: {availableLiters}L</p>

          {/* Progress Bar */}
          {totalVolume && packagedVolume !== undefined && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-text-muted mb-1">
                <span>დაფასოებული</span>
                <span>{((packagedVolume / totalVolume) * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-bg-muted rounded-full h-2.5">
                <div 
                  className="bg-accent-primary h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((packagedVolume / totalVolume) * 100, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-text-muted mt-1">
                <span>დაფასოებული: {packagedVolume.toFixed(1)}L</span>
                <span>დარჩა: {(totalVolume - packagedVolume).toFixed(1)}L</span>
              </div>
            </div>
          )}

          </div>



          {/* Packaging Type Selection */}

          <div className="mb-6">

            <label className="block text-sm font-medium mb-3">შეფუთვის ტიპი *</label>

            <div className="grid grid-cols-6 gap-2">

              {PACKAGING_TYPES.map((pkg, i) => {

                const maxQty = Math.floor(availableLiters / pkg.maxCapacity)

                const isSelected = selectedType?.type === pkg.type && selectedType?.size === pkg.size
                
                // ✅ FIX: Calculate actual stock based on type
                let actualStock = 0
                if (pkg.type === 'keg') {
                  actualStock = pkg.size === 20 ? kegStock.keg20 : pkg.size === 30 ? kegStock.keg30 : kegStock.keg50
                } else if (pkg.type === 'bottle') {
                  actualStock = pkg.size === 0.5 ? inventoryStock.bottles500 : inventoryStock.bottles330
                } else if (pkg.type === 'can') {
                  actualStock = pkg.size === 0.5 ? inventoryStock.cans500 : inventoryStock.cans330
                }
                
                // ✅ FIX: Show 0 if no stock, otherwise minimum of maxQty and actualStock
                const displayMax = actualStock > 0 ? Math.min(maxQty, actualStock) : 0

                return (

                  <button

                    key={i}

                    onClick={() => setSelectedType({ type: pkg.type, size: pkg.size })}

                    className={`p-2 border rounded-lg text-center transition-all ${

                      isSelected ? 'border-copper bg-copper/10' : 'border-border bg-bg-card hover:border-copper/50'

                    }`}

                  >

                    <p className="text-xl mb-1">{pkg.label.split(' ')[0]}</p>

                    <p className="text-[10px] font-medium mb-0.5">{pkg.label.split(' ').slice(1).join(' ')}</p>

                    <p className="text-[10px] text-text-muted">მაქს: {displayMax} ცალი</p>

                  </button>

                )

              })}

            </div>

          </div>



          {/* Quantity / Keg Selection Section */}

          {selectedType && (

            <div className="mb-6">

              {isKegType(selectedType) ? (
                // KEG SELECTION UI
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium">
                      აირჩიე კეგები * ({selectedKegIds.length} არჩეული)
                    </label>
                    {availableKegs.length > 0 && (
                      <button
                        type="button"
                        onClick={handleSelectAllKegs}
                        className="text-xs text-copper hover:text-copper-light transition-colors"
                      >
                        {selectedKegIds.length === availableKegs.length ? 'ყველას მოხსნა' : 'ყველას არჩევა'}
                      </button>
                    )}
                  </div>
                  
                  {loadingKegs ? (
                    <div className="flex items-center justify-center py-6">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-copper"></div>
                    </div>
                  ) : availableKegs.length === 0 ? (
                    <div className="text-center py-6 text-text-muted bg-bg-tertiary rounded-xl border border-border">
                      <p className="text-2xl mb-2">🛢️</p>
                      <p>ხელმისაწვდომი კეგები არ მოიძებნა</p>
                      <p className="text-xs mt-1">დაამატეთ კეგები მარაგებში</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                      {availableKegs.map(keg => {
                        const isSelected = selectedKegIds.includes(keg.id)
                        return (
                          <button
                            key={keg.id}
                            type="button"
                            onClick={() => handleKegToggle(keg.id)}
                            className={`p-3 rounded-xl border text-center transition-all ${
                              isSelected
                                ? 'border-copper bg-copper/10 text-copper-light'
                                : 'border-border bg-bg-card hover:border-copper/50'
                            }`}
                          >
                            <p className="font-mono text-sm font-medium">{keg.kegNumber}</p>
                            <p className="text-xs text-text-muted">{keg.size}L</p>
                          </button>
                        )
                      })}
                    </div>
                  )}
                  
                  {selectedKegIds.length > 0 && (
                    <div className="mt-3 p-3 bg-copper/10 border border-copper/30 rounded-xl">
                      <p className="text-sm text-copper-light">
                        ✓ არჩეული: {selectedKegIds.length} კეგი × {selectedType.size || 30}L = {usedLiters}L
                      </p>
                      <p className="text-xs text-text-muted mt-1">
                        დარჩება: {remainingLiters.toFixed(1)}L
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                // QUANTITY INPUT (for bottles/cans)
                <div>
                  <label className="block text-sm font-medium mb-2">რაოდენობა *</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      min="1"
                      max={maxQuantity}
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="0"
                      className="w-32 px-4 py-3 bg-bg-tertiary border border-border rounded-xl font-mono text-sm outline-none focus:border-copper"
                    />
                    <span className="text-sm text-text-muted">ცალი</span>
                    <div className="flex-1 text-sm text-text-muted">
                      გამოყენებული მოცულობა: <span className="font-mono">{usedLiters.toFixed(1)}L</span>
                    </div>
                    <div className="text-sm text-text-muted">
                      დარჩება: <span className="font-mono">{remainingLiters.toFixed(1)}L</span>
                    </div>
                  </div>
                </div>
              )}

            </div>

          )}



          {/* Required Materials - Selectable Dropdowns */}
          {selectedType && !isKegType(selectedType) && quantity && parseInt(quantity) > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium mb-3">საჭირო მასალები</label>
              <div className="space-y-3">
                
                {/* Bottle/Can Selection */}
                <div className="p-3 border rounded-lg border-border bg-bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{selectedType.type === 'bottle' ? '🍾' : '🥫'}</span>
                      <span className="text-sm font-medium">
                        {/* ✅ Use selectedType.size directly since we have explicit 0.33 and 0.5 options */}
                        {selectedType.type === 'bottle' ? 'ბოთლი' : 'ქილა'} {selectedType.size === 0.33 ? '330ml' : '500ml'}:
                      </span>
                      <span className="text-sm font-mono">{quantity} ცალი</span>
                    </div>
                  </div>
                  <select
                    value={selectedBottleId || ''}
                    onChange={(e) => setSelectedBottleId(e.target.value || null)}
                    className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm outline-none focus:border-copper"
                  >
                    <option value="">აირჩიეთ მარაგიდან...</option>
                    {/* Show bottles/cans filtered by selected size */}
                    {(selectedType.type === 'bottle' ? allBottles : allCans)
                      .filter(item => {
                        // ✅ Filter by selected size (330ml or 500ml)
                        if (selectedType.type === 'bottle') {
                          const is330ml = item.size === '330ml' || 
                                          item.metadata?.bottleType === 'bottle_330' ||
                                          item.name?.toLowerCase().includes('330')
                          const is500ml = item.size === '500ml' || 
                                          item.metadata?.bottleType === 'bottle_500' ||
                                          item.name?.toLowerCase().includes('500')
                          
                          if (selectedType.size === 0.33) return is330ml
                          if (selectedType.size === 0.5) return is500ml
                        }
                        return true // For cans, show all
                      })
                      .map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name} (მარაგი: {item.quantity})
                        </option>
                      ))
                    }
                  </select>
                  {selectedBottleId && (() => {
                    const items = selectedType.type === 'bottle' ? allBottles : allCans
                    const selected = items.find(b => b.id === selectedBottleId)
                    const isOk = selected && selected.quantity >= parseInt(quantity)
                    return (
                      <div className={`mt-2 text-sm ${isOk ? 'text-green-400' : 'text-red-400'}`}>
                        {isOk ? '✅' : '❌'} მარაგში: {selected?.quantity || 0}
                        {!isOk && ` | აკლია ${parseInt(quantity) - (selected?.quantity || 0)}`}
                      </div>
                    )
                  })()}
                </div>

                {/* Cap Selection (only for bottles) */}
                {selectedType.type === 'bottle' && (
                  <div className="p-3 border rounded-lg border-border bg-bg-card">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🔘</span>
                        <span className="text-sm font-medium">თავსახური:</span>
                        <span className="text-sm font-mono">{quantity} ცალი</span>
                      </div>
                    </div>
                    <select
                      value={selectedCapId || ''}
                      onChange={(e) => setSelectedCapId(e.target.value || null)}
                      className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm outline-none focus:border-copper"
                    >
                      <option value="">აირჩიეთ მარაგიდან...</option>
                      {allCaps.map(cap => (
                        <option key={cap.id} value={cap.id}>
                          {cap.name} (მარაგი: {cap.quantity})
                        </option>
                      ))}
                    </select>
                    {selectedCapId && (() => {
                      const selected = allCaps.find(c => c.id === selectedCapId)
                      const isOk = selected && selected.quantity >= parseInt(quantity)
                      return (
                        <div className={`mt-2 text-sm ${isOk ? 'text-green-400' : 'text-red-400'}`}>
                          {isOk ? '✅' : '❌'} მარაგში: {selected?.quantity || 0}
                          {!isOk && ` | აკლია ${parseInt(quantity) - (selected?.quantity || 0)}`}
                        </div>
                      )
                    })()}
                  </div>
                )}

                {/* Label Selection (only for bottles) */}
                {selectedType.type === 'bottle' && (
                  <div className="p-3 border rounded-lg border-border bg-bg-card">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🏷️</span>
                        <span className="text-sm font-medium">ეტიკეტი {selectedType.size === 0.33 ? '330ml' : '500ml'}:</span>
                        <span className="text-sm font-mono">{quantity} ცალი</span>
                      </div>
                    </div>
                    <select
                      value={selectedLabelId || ''}
                      onChange={(e) => setSelectedLabelId(e.target.value || null)}
                      className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm outline-none focus:border-copper"
                    >
                      <option value="">აირჩიეთ მარაგიდან...</option>
                      {/* ✅ Filter labels by selected bottle size */}
                      {allLabels
                        .filter(label => {
                          const targetSize = selectedType.size === 0.33 ? '330ml' : '500ml'
                          // Check label size in metadata or name
                          const labelSize = label.size || label.metadata?.labelSize || ''
                          const nameHas330 = label.name?.toLowerCase().includes('330')
                          const nameHas500 = label.name?.toLowerCase().includes('500')
                          
                          if (selectedType.size === 0.33) {
                            return labelSize === '330ml' || nameHas330 || (!nameHas500 && !labelSize)
                          } else {
                            return labelSize === '500ml' || nameHas500 || (!nameHas330 && !labelSize)
                          }
                        })
                        .map(label => (
                          <option key={label.id} value={label.id}>
                            {label.name} (მარაგი: {label.quantity})
                          </option>
                        ))
                      }
                    </select>
                    {selectedLabelId && (() => {
                      const selected = allLabels.find(l => l.id === selectedLabelId)
                      const isOk = selected && selected.quantity >= parseInt(quantity)
                      return (
                        <div className={`mt-2 text-sm ${isOk ? 'text-green-400' : 'text-red-400'}`}>
                          {isOk ? '✅' : '❌'} მარაგში: {selected?.quantity || 0}
                          {!isOk && ` | აკლია ${parseInt(quantity) - (selected?.quantity || 0)}`}
                        </div>
                      )
                    })()}
                  </div>
                )}

              </div>
            </div>
          )}

          {/* Keg Materials (unchanged - kegs don't need bottles/labels/caps) */}
          {selectedType && isKegType(selectedType) && selectedKegIds.length > 0 && materials.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium mb-3">საჭირო მასალები</label>
              <div className="space-y-2">
                {materials.map(material => {
                  const isOk = material.status === 'ok'
                  const isInsufficient = material.status === 'insufficient'
                  const missing = material.required - material.stock

                  return (
                    <div key={material.id} className={`p-3 border rounded-lg ${
                      isOk ? 'border-green-400/50 bg-green-400/10' :
                      isInsufficient ? 'border-red-400/50 bg-red-400/10' :
                      'border-amber-400/50 bg-amber-400/10'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isOk && <span>✅</span>}
                          {isInsufficient && <span>❌</span>}
                          <span className="text-sm">{material.name}:</span>
                          <span className="text-sm font-mono">{material.required} ცალი</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-text-muted">მარაგში: </span>
                          <span className={`font-mono ${isOk ? 'text-green-400' : 'text-red-400'}`}>
                            {material.stock}
                          </span>
                          {isInsufficient && (
                            <span className="text-red-400 ml-2">| აკლია {missing}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </div>



        {/* Footer */}

        <div className="px-6 py-4 border-t border-border flex justify-end gap-3 bg-bg-tertiary">

          <Button variant="secondary" onClick={onClose}>გაუქმება</Button>

          <Button 

            variant="primary" 

            onClick={handleComplete}

            disabled={
              isSubmitting || 
              !selectedType || 
              (isKegType(selectedType) 
                ? (selectedKegIds.length === 0 || !allMaterialsOk)
                : (!quantity || parseInt(quantity) <= 0 || !allMaterialsSelected)
              )
            }

          >

            {isSubmitting 
              ? 'შეფუთვა...' 
              : isKegType(selectedType) 
                ? `შეფუთვა (${selectedKegIds.length} კეგი)`
                : `შეფუთვა (${quantity || 0} ცალი)`
            }

          </Button>

        </div>

      </div>

    </div>

  )

}