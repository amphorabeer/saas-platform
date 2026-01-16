'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui'
import type { Recipe, Ingredient, BrewingStep } from '@/app/recipes/page'
import InventoryIngredientPicker from './InventoryIngredientPicker'
import libraryData from '@/data/ingredient-library.eu.json'
import { formatGravity } from '@/utils'

interface NewRecipeModalProps {
  onClose: () => void
  onSave: (recipe: Recipe | Omit<Recipe, 'id'>) => void
  editingRecipe?: Recipe | null
}

const ingredientTypes = [
  { value: 'grain', label: '🌾 მარცვლეული' },
  { value: 'hop', label: '🌿 სვია' },
  { value: 'yeast', label: '🧪 საფუარი' },
  { value: 'adjunct', label: '➕ დანამატი' },
  { value: 'water', label: '💧 წყალი' },
]

const defaultSteps: Omit<BrewingStep, 'id'>[] = [
  { order: 1, name: 'Start mashing', description: 'ბადაგის დაწყება', duration: 15, temperature: 50 },
  { order: 2, name: 'Beta-Amylase', description: 'ბეტა-ამილაზა', duration: 20, temperature: 64 },
  { order: 3, name: 'Alpha-Amylase', description: 'ალფა-ამილაზა', duration: 25, temperature: 72 },
  { order: 4, name: 'Mash Out', description: 'მაშ-აუტი', duration: 5, temperature: 75 },
]

export function NewRecipeModal({ onClose, onSave, editingRecipe }: NewRecipeModalProps) {
  const isEditing = !!editingRecipe
  
  // Basic Info
  const [name, setName] = useState(editingRecipe?.name || '')
  const [style, setStyle] = useState(editingRecipe?.style || '')
  const [description, setDescription] = useState(editingRecipe?.description || '')
  const [batchSize, setBatchSize] = useState(editingRecipe?.batchSize || 1000)
  const [boilTime, setBoilTime] = useState(editingRecipe?.boilTime || 60)
  const [efficiency, setEfficiency] = useState(editingRecipe?.efficiency || 75)
  
  // Targets
  const [targetOG, setTargetOG] = useState(editingRecipe?.targetOG || 1.050)
  const [targetFG, setTargetFG] = useState(editingRecipe?.targetFG || 1.012)
  const [ibu, setIbu] = useState(editingRecipe?.ibu || 30)
  const [srm, setSrm] = useState(editingRecipe?.srm || 8)
  
  // Ingredients
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    editingRecipe?.ingredients || []
  )
  
  // Steps - Initialize from saved process.mashSteps if available
  const [steps, setSteps] = useState<BrewingStep[]>(() => {
    // First try to load from process.mashSteps (saved mash data)
    const savedMashSteps = (editingRecipe as any)?.process?.mashSteps
    if (savedMashSteps && savedMashSteps.length > 0) {
      return savedMashSteps.map((s: any, i: number) => ({
        id: `step-${i}`,
        order: i + 1,
        name: s.name || `ფაზა ${i + 1}`,
        description: s.notes || '',
        duration: s.duration || 60,
        temperature: s.temperature || 65,
      }))
    }
    // Then try editingRecipe.steps
    if (editingRecipe?.steps && editingRecipe.steps.length > 0) {
      return editingRecipe.steps
    }
    // Default steps
    return defaultSteps.map((s, i) => ({ ...s, id: `step-${i}` }))
  })
  
  // Notes
  const [notes, setNotes] = useState(editingRecipe?.notes || '')
  
  // Process state (for fermentation, conditioning that aren't in steps)
  const [fermentationSettings, setFermentationSettings] = useState({
    primaryTemp: (editingRecipe as any)?.process?.fermentation?.primaryTemp || 18,
    primaryDays: (editingRecipe as any)?.process?.fermentation?.primaryDays || 7,
    secondaryTemp: (editingRecipe as any)?.process?.fermentation?.secondaryTemp || 16,
    secondaryDays: (editingRecipe as any)?.process?.fermentation?.secondaryDays || 7,
    notes: (editingRecipe as any)?.process?.fermentation?.notes || 'სტანდარტული ფერმენტაცია',
  })

  const [conditioningSettings, setConditioningSettings] = useState({
    temperature: (editingRecipe as any)?.process?.conditioning?.temperature || 2,
    days: (editingRecipe as any)?.process?.conditioning?.days || 14,
    notes: (editingRecipe as any)?.process?.conditioning?.notes || 'კონდიცირება/ლაგერირება',
  })

  // Hop schedule for process tab - editable
  const [hopSchedule, setHopSchedule] = useState<Array<{
    ingredientId: string
    name: string
    amount: number
    unit: string
    time: number
    type: string
  }>>(() => {
    // Initialize from saved process.hopSchedule if editing
    if ((editingRecipe as any)?.process?.hopSchedule?.length > 0) {
      // Match with current ingredients by name
      return (editingRecipe as any).process.hopSchedule.map((hop: any) => {
        const matchingIngredient = (editingRecipe?.ingredients || []).find((ing: any) => 
          ing.type === 'hop' && ing.name === hop.name
        )
        return {
          ingredientId: matchingIngredient?.id || `ing-${Date.now()}`,
          name: hop.name,
          amount: hop.amount,
          unit: hop.unit,
          time: hop.time || 60,
          type: hop.type || 'bittering',
        }
      })
    }
    return []
  })

  // Sync hop schedule when ingredients change
  useEffect(() => {
    const hops = ingredients.filter(i => i.type === 'hop')
    
    setHopSchedule(prev => {
      const updated = [...prev]
      
      // Add new hops that aren't in schedule
      hops.forEach(hop => {
        if (!updated.find(hs => hs.ingredientId === hop.id)) {
          updated.push({
            ingredientId: hop.id,
            name: hop.name,
            amount: hop.amount,
            unit: hop.unit,
            time: 60,
            type: 'bittering',
          })
        } else {
          // Update existing hop if amount/unit/name changed
          const index = updated.findIndex(hs => hs.ingredientId === hop.id)
          if (index >= 0) {
            updated[index] = { 
              ...updated[index], 
              name: hop.name, 
              amount: hop.amount, 
              unit: hop.unit 
            }
          }
        }
      })
      
      // Remove hops that are no longer in ingredients
      return updated.filter(hs => hops.some(h => h.id === hs.ingredientId))
    })
  }, [ingredients])

  
  // Current tab
  const [activeTab, setActiveTab] = useState<'basic' | 'ingredients' | 'steps' | 'notes'>('basic')
  
  // New ingredient form
  const [newIngredient, setNewIngredient] = useState<Partial<Ingredient & { inventoryItemId?: string }>>({
    type: 'grain',
    unit: 'kg',
  })
  
  // Editing ingredient state
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null)
  
  // Ingredient specs state
  // Malt specs
  const [ingredientColor, setIngredientColor] = useState('')
  const [ingredientYield, setIngredientYield] = useState('')
  const [ingredientPotential, setIngredientPotential] = useState('')
  
  // Hop specs
  const [ingredientAlphaAcid, setIngredientAlphaAcid] = useState('')
  const [ingredientBetaAcid, setIngredientBetaAcid] = useState('')
  const [ingredientHopForm, setIngredientHopForm] = useState('pellet')
  
  // Yeast specs
  const [ingredientAttenuation, setIngredientAttenuation] = useState('')
  const [ingredientTempRange, setIngredientTempRange] = useState('')
  const [ingredientFlocculation, setIngredientFlocculation] = useState('')
  
  // Inventory picker state
  const [showIngredientPicker, setShowIngredientPicker] = useState(false)
  
  // Helper function to find specs in library
  const findSpecsInLibrary = (name: string, supplier?: string): any | null => {
    const items = (libraryData as any).items || libraryData
    const nameLower = name.toLowerCase()
    const supplierLower = supplier?.toLowerCase() || ''
    
    // Try exact match with supplier first
    let match = items.find((item: any) => 
      item.name?.toLowerCase() === nameLower &&
      item.supplier?.toLowerCase() === supplierLower
    )
    
    // Try partial name match
    if (!match) {
      match = items.find((item: any) => 
        item.name?.toLowerCase().includes(nameLower) ||
        nameLower.includes(item.name?.toLowerCase())
      )
    }
    
    // Try matching by key parts of name
    if (!match) {
      const nameWords = nameLower.split(/\s+/).filter((w: string) => w.length > 3)
      match = items.find((item: any) => {
        const itemName = item.name?.toLowerCase() || ''
        return nameWords.some((word: string) => itemName.includes(word))
      })
    }
    
    return match || null
  }
  
  // Reset specs when ingredient type changes
  // Get default alpha acid % based on hop name
  const getDefaultAlphaAcid = (hopName: string): number => {
    const defaults: Record<string, number> = {
      'magnum': 13,
      'saaz': 3.5,
      'hallertau': 4,
      'hallertauer': 4,
      'hersbrucker': 3,
      'tettnang': 4.5,
      'citra': 12,
      'simcoe': 13,
      'cascade': 6,
      'centennial': 10,
      'chinook': 13,
      'amarillo': 9,
      'mosaic': 12,
      'fuggle': 4.5,
      'golding': 5,
      'premiant': 8,
      'perle': 7,
      'northern brewer': 8,
      'warrior': 16,
      'galaxy': 14,
      'nelson sauvin': 12,
      'el dorado': 15,
      'styrian': 5,
      'spalt': 5,
      'lublin': 4.5,
      'sorachi': 13,
      'wakatu': 7,
      'pacifica': 5,
      'motueka': 7,
      'rakau': 10,
      'mittelfrüh': 3.5,
      'mittelfrueh': 3.5,
    }
    
    const nameLower = hopName.toLowerCase()
    for (const [key, aa] of Object.entries(defaults)) {
      if (nameLower.includes(key)) return aa
    }
    return 5 // Default fallback for unknown hops
  }

  const resetSpecs = () => {
    setIngredientColor('')
    setIngredientYield('')
    setIngredientPotential('')
    setIngredientAlphaAcid('')
    setIngredientBetaAcid('')
    setIngredientHopForm('pellet')
    setIngredientAttenuation('')
    setIngredientTempRange('')
    setIngredientFlocculation('')
  }

  // Handle edit ingredient
  const handleEditIngredient = (ingredient: Ingredient) => {
    // Populate the form with ingredient data
    setNewIngredient({
      name: ingredient.name,
      type: ingredient.type,
      amount: Number(ingredient.amount),
      unit: ingredient.unit,
      inventoryItemId: (ingredient as any).inventoryItemId,
      addTime: ingredient.addTime,
      notes: ingredient.notes,
    })
    
    // Set editing state
    setEditingIngredient(ingredient)
    
    // Populate specs fields
    if ((ingredient as any).specs?.color) {
      setIngredientColor(String((ingredient as any).specs.color))
    }
    if ((ingredient as any).specs?.alphaAcid) {
      setIngredientAlphaAcid(String((ingredient as any).specs.alphaAcid))
    }
    if ((ingredient as any).specs?.betaAcid) {
      setIngredientBetaAcid(String((ingredient as any).specs.betaAcid))
    }
    if ((ingredient as any).specs?.form) {
      setIngredientHopForm((ingredient as any).specs.form)
    }
    if ((ingredient as any).specs?.yield) {
      setIngredientYield(String((ingredient as any).specs.yield))
    }
    if ((ingredient as any).specs?.potential) {
      setIngredientPotential(String((ingredient as any).specs.potential))
    }
    if ((ingredient as any).specs?.attenuation) {
      setIngredientAttenuation(String((ingredient as any).specs.attenuation))
    }
    if ((ingredient as any).specs?.tempRange) {
      setIngredientTempRange((ingredient as any).specs.tempRange)
    }
    if ((ingredient as any).specs?.flocculation) {
      setIngredientFlocculation((ingredient as any).specs.flocculation)
    }
  }

  const addIngredient = () => {
    // Validate required fields - works in both create and edit mode
    if (!newIngredient.name || !newIngredient.amount) {
      console.warn('⚠️ Cannot add ingredient: missing name or amount', {
        name: newIngredient.name,
        amount: newIngredient.amount,
        isEditing
      })
      return
    }
    
    const ingredientType = newIngredient.type as Ingredient['type']
    
    // Build specs object based on type
    const specs: any = {}
    if (ingredientType === 'grain') {
      if (ingredientColor) specs.color = parseFloat(ingredientColor)
      if (ingredientYield) specs.yield = parseFloat(ingredientYield)
      if (ingredientPotential) specs.potential = parseFloat(ingredientPotential)
      } else if (ingredientType === 'hop') {
        // Use form value, or fallback to default lookup if empty
        specs.alphaAcid = ingredientAlphaAcid 
          ? parseFloat(ingredientAlphaAcid) 
          : getDefaultAlphaAcid(newIngredient.name || '')
        if (ingredientBetaAcid) specs.betaAcid = parseFloat(ingredientBetaAcid)
        if (ingredientHopForm) specs.form = ingredientHopForm
    } else if (ingredientType === 'yeast') {
      if (ingredientAttenuation) specs.attenuation = ingredientAttenuation
      if (ingredientTempRange) specs.tempRange = ingredientTempRange
      if (ingredientFlocculation) specs.flocculation = ingredientFlocculation
    }
    
    // Create ingredient object (new or updated)
    const ingredientData: Ingredient = {
      id: editingIngredient?.id || `ing-${Date.now()}`,
      name: newIngredient.name!,
      type: ingredientType,
      amount: typeof newIngredient.amount === 'string' ? parseFloat(newIngredient.amount) : newIngredient.amount!,
      unit: newIngredient.unit || 'kg',
      addTime: newIngredient.addTime,
      notes: newIngredient.notes,
      // Store inventoryItemId for future API calls
      // Store specs
    }
    
    // Update or add to ingredients list
    if (editingIngredient) {
      // Update existing ingredient
      setIngredients(prev => prev.map(ing => 
        ing.id === editingIngredient.id 
          ? ingredientData
          : ing
      ))
      setEditingIngredient(null)
    } else {
      // Add new ingredient
      setIngredients(prev => {
        const updated = [...prev, ingredientData]
        console.log(`✅ Added ingredient: ${ingredientData.name} (${ingredientType})`, {
          isEditing,
          previousCount: prev.length,
          newCount: updated.length,
          ingredient: ingredientData
        })
        return updated
      })
    }
    
    // Reset form for next ingredient
    setNewIngredient({ type: 'grain', unit: 'kg' })
    resetSpecs()
  }
  
  // Handle selection from inventory
  const handleSelectFromInventory = (item: any) => {
    try {
      // Detect type from SKU/name
      const sku = (item.sku || '').toUpperCase()
      const name = (item.name || '').toLowerCase()
      
      let detectedType: Ingredient['type'] = 'grain'
      
      // Check SKU first
      if (sku.startsWith('HOP-') || sku.startsWith('HOP_') || sku.includes('HOP')) {
        detectedType = 'hop'
      } else if (sku.startsWith('YEAST-') || sku.startsWith('YEAST_') || sku.includes('YEAST')) {
        detectedType = 'yeast'
      } else if (sku.startsWith('CHEM-') || sku.startsWith('CHEM_')) {
        detectedType = 'adjunct'
      }
      
      // Check name for common hop varieties
      const hopNames = [
        'citra', 'cascade', 'centennial', 'simcoe', 'mosaic', 'amarillo', 
        'hallertau', 'hallertauer', 'saaz', 'fuggle', 'golding', 'tettnang', 'noble',
        'chinook', 'columbus', 'warrior', 'magnum', 'perle', 'northern brewer',
        'el dorado', 'galaxy', 'nelson sauvin', 'motueka', 'rakau',
        'mittelfrüh', 'mittelfrueh', 'mittelfruh', 'hersbrucker', 'spalt',
        'styrian', 'lublin', 'sorachi', 'wakatu', 'pacifica', 'hop'
      ]
      if (hopNames.some(hop => name.includes(hop))) {
        detectedType = 'hop'
      }
      
      // Check name for yeast
      const yeastNames = [
        'yeast', 'safale', 'saflager', 'safbrew', 'fermentis', 
        'wyeast', 'white labs', 'lallemand', 'mangrove', 
        'nottingham', 'windsor', 'belle saison', 'abbaye', 'verdant',
        'us-05', 'us-04', 's-04', 's-05', 'w-34', 'k-97', 't-58'
      ]
      if (yeastNames.some(y => name.includes(y))) {
        detectedType = 'yeast'
      }
      
      // If item has category from inventory, use it
      const itemCategory = (item.category || '').toUpperCase()
      if (itemCategory === 'RAW_MATERIAL') {
        // Could be grain, hop, or yeast - keep detected type
      } else if (itemCategory.includes('HOP')) {
        detectedType = 'hop'
      } else if (itemCategory.includes('YEAST')) {
        detectedType = 'yeast'
      }
      
      // Also check if item has specs that indicate type
      if (item.specs) {
        if (item.specs.alphaAcid !== undefined) {
          detectedType = 'hop'  // Has alpha acid = definitely a hop
        } else if (item.specs.attenuation !== undefined) {
          detectedType = 'yeast'  // Has attenuation = definitely yeast
        }
      }
      
      // Look up specs in library
      const librarySpecs = findSpecsInLibrary(item.name, item.supplier)
      
      // Build specs object from library or item specs
      const specs: any = {}
      if (detectedType === 'grain') {
        if (librarySpecs?.color || item.specs?.color) specs.color = librarySpecs?.color || item.specs?.color
        if (librarySpecs?.yield || item.specs?.yield) specs.yield = librarySpecs?.yield || item.specs?.yield
        if (librarySpecs?.potential || item.specs?.potential) specs.potential = librarySpecs?.potential || item.specs?.potential
      } else if (detectedType === 'hop') {
        // Use library/item specs, or fallback to default lookup
        // Handle both string ("13%") and number formats from inventory
        let alphaAcidValue = librarySpecs?.alphaAcid || item.specs?.alphaAcid
        if (alphaAcidValue !== undefined && alphaAcidValue !== null) {
          // Parse string format like "13%" or keep as number
          if (typeof alphaAcidValue === 'string') {
            alphaAcidValue = parseFloat(alphaAcidValue.replace('%', '').trim()) || undefined
          }
          specs.alphaAcid = alphaAcidValue
        }
        // Fallback to default if still not found
        if (!specs.alphaAcid) {
          specs.alphaAcid = getDefaultAlphaAcid(item.name)
        }
        if (librarySpecs?.betaAcid || item.specs?.betaAcid) specs.betaAcid = librarySpecs?.betaAcid || item.specs?.betaAcid
        if (librarySpecs?.form || item.specs?.form) specs.form = librarySpecs?.form || item.specs?.form
      } else if (detectedType === 'yeast') {
        if (librarySpecs?.attenuation || item.specs?.attenuation) specs.attenuation = librarySpecs?.attenuation || item.specs?.attenuation
        if (librarySpecs?.tempRange || item.specs?.tempRange) specs.tempRange = librarySpecs?.tempRange || item.specs?.tempRange
        if (librarySpecs?.flocculation || item.specs?.flocculation) specs.flocculation = librarySpecs?.flocculation || item.specs?.flocculation
      }
      
      // Check for duplicates - allow hops with different addition times
      // Only prevent exact duplicates for non-hops (same name + inventoryItemId)
      // For hops, allow multiple additions (common to add same hop at different times)
      if (detectedType !== 'hop') {
        const isDuplicate = ingredients.some(ing => 
          ing.name === item.name && 
          (ing as any).inventoryItemId === item.id &&
          ing.type === detectedType
        )
        
        if (isDuplicate) {
          console.warn('⚠️ Duplicate ingredient (non-hop):', item.name)
          setShowIngredientPicker(false)
          // Don't add duplicate, just show warning
          return
        }
      }
      // For hops, always allow (different addition times are common)
      
      // Don't add to array yet - populate the form so user can enter quantity
      // User will click "დამატება" button after entering amount
      setNewIngredient({
        name: item.name,
        type: detectedType,
        unit: item.unit || 'kg',
        inventoryItemId: item.id,
        // Leave amount empty - user will fill it in
      })
      
      // Populate specs in form based on type
      if (detectedType === 'grain') {
        if (specs.color) setIngredientColor(String(specs.color))
        if (specs.yield) setIngredientYield(String(specs.yield))
        if (specs.potential) setIngredientPotential(String(specs.potential))
      } else if (detectedType === 'hop') {
        // Always set alpha acid (will use default if not found)
        setIngredientAlphaAcid(String(specs.alphaAcid || getDefaultAlphaAcid(item.name)))
        if (specs.betaAcid) setIngredientBetaAcid(String(specs.betaAcid))
        if (specs.form) setIngredientHopForm(specs.form)
      } else if (detectedType === 'yeast') {
        if (specs.attenuation) setIngredientAttenuation(String(specs.attenuation))
        if (specs.tempRange) setIngredientTempRange(specs.tempRange)
        if (specs.flocculation) setIngredientFlocculation(specs.flocculation)
      }
      
      console.log('✅ Populated form with ingredient:', item.name, 'as', detectedType)
      
      // Close picker and show form (user will enter amount and click "დამატება")
      setShowIngredientPicker(false)
      
      // Optionally switch to ingredients tab to show the form
      setActiveTab('ingredients')
    } catch (error) {
      console.error('❌ Failed to add ingredient:', error)
      alert(`შეცდომა: ინგრედიენტი ვერ დაემატა - ${error instanceof Error ? error.message : 'უცნობი შეცდომა'}`)
    }
  }
  
  // Get category for picker based on selected ingredient type
  const getPickerCategory = (): 'MALT' | 'HOPS' | 'YEAST' | 'ADJUNCT' | 'WATER_CHEMISTRY' | undefined => {
    const typeMap: Record<string, 'MALT' | 'HOPS' | 'YEAST' | 'ADJUNCT' | 'WATER_CHEMISTRY'> = {
      'grain': 'MALT',
      'hop': 'HOPS',
      'yeast': 'YEAST',
      'adjunct': 'ADJUNCT',
      'water': 'WATER_CHEMISTRY',
    }
    return typeMap[newIngredient.type || 'grain']
  }

  const removeIngredient = (id: string) => {
    setIngredients(prev => prev.filter(i => i.id !== id))
  }

  // Handle inline amount update
  const handleUpdateIngredientAmount = (ingredientId: string, newAmount: number) => {
    setIngredients(prev => prev.map(ing => 
      ing.id === ingredientId 
        ? { ...ing, amount: newAmount }
        : ing
    ))
  }

  const addStep = () => {
    setSteps(prev => [
      ...prev,
      {
        id: `step-${Date.now()}`,
        order: prev.length + 1,
        name: '',
        description: '',
        duration: 60,
      }
    ])
  }

  const updateStep = (id: string, updates: Partial<BrewingStep>) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
  }

  const removeStep = (id: string) => {
    setSteps(prev => prev.filter(s => s.id !== id).map((s, i) => ({ ...s, order: i + 1 })))
  }

  // Calculation functions
  const calculateOG = useCallback((grains: Ingredient[], batchSizeL: number, mashEfficiency: number): number => {
    if (!grains.length || !batchSizeL) return 1.050
    
    // Convert to US units for standard PPG formula
    const batchGallons = batchSizeL * 0.264172
    
    let totalPoints = 0
    
    grains.forEach(grain => {
      // Get amount in kg, ensuring it's a number
      let amountKg = typeof grain.amount === 'string' ? parseFloat(grain.amount) : Number(grain.amount) || 0
      
      // Convert to kg based on unit
      if (grain.unit === 'g') {
        amountKg = amountKg / 1000
      } else if (grain.unit !== 'kg') {
        // Unknown unit, assume kg
        console.warn(`Unknown unit for ${grain.name}: ${grain.unit}, assuming kg`)
      }
      
      // Convert to pounds
      const amountLbs = amountKg * 2.20462
      
      // Get yield percentage (default 80% for base malt)
      const yieldPercent = Number((grain as any).specs?.yield) || 80
      
      // PPG (Points Per Pound Per Gallon) - max is ~46 for pure sugar
      // Typical base malt: 36-38 PPG, adjusted by yield
      const basePPG = 38  // Standard base malt PPG
      const ppg = basePPG * (yieldPercent / 100)
      
      // Points = (lbs × PPG × efficiency) / gallons
      const points = (amountLbs * ppg * (mashEfficiency / 100)) / batchGallons
      totalPoints += points
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[OG] ${grain.name}: ${amountKg.toFixed(2)}kg (${amountLbs.toFixed(2)}lbs), yield ${yieldPercent}%, PPG ${ppg.toFixed(1)}, points: ${points.toFixed(1)}`)
      }
    })
    
    // OG = 1 + (points / 1000)
    const og = 1 + (totalPoints / 1000)
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[OG] Total points: ${totalPoints.toFixed(1)}, Batch: ${batchSizeL}L (${batchGallons.toFixed(2)}gal), OG: ${og.toFixed(3)}`)
    }
    
    return Math.round(og * 1000) / 1000  // Round to 3 decimals
  }, [])

  const calculateFG = useCallback((og: number, yeast: Ingredient | null): number => {
    // Default 75% attenuation if no yeast
    // FG = OG - ((OG - 1) × attenuation)
    if (!yeast) {
      return Math.round((og - ((og - 1) * 0.75)) * 1000) / 1000
    }
    
    // Parse attenuation (could be "73-77" or "75" or "75%")
    const attStr = (yeast as any).specs?.attenuation || '75'
    let attenuation = 75
    
    if (typeof attStr === 'string') {
      const cleanStr = attStr.replace('%', '').trim()
      if (cleanStr.includes('-')) {
        const [min, max] = cleanStr.split('-').map(s => parseFloat(s.trim())).filter(n => !isNaN(n))
        if (min && max) {
          attenuation = (min + max) / 2
        }
      } else {
        const parsed = parseFloat(cleanStr)
        if (!isNaN(parsed)) {
          attenuation = parsed
        }
      }
    } else if (typeof attStr === 'number') {
      attenuation = attStr
    }
    
    // FG = OG - ((OG - 1) × attenuation%)
    const fg = og - ((og - 1) * (attenuation / 100))
    return Math.round(fg * 1000) / 1000
  }, [])

  const calculateABV = useCallback((og: number, fg: number): number => {
    const abv = (og - fg) * 131.25
    return Math.round(abv * 10) / 10  // Round to 1 decimal
  }, [])

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

  const calculateIBU = useCallback((hops: Ingredient[], og: number, batchSizeL: number): number => {
    if (!hops.length || !batchSizeL) return 0
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[IBU] Calculating IBU for hops:', hops.map(h => ({
        name: h.name,
        amount: h.amount,
        unit: h.unit,
        alphaAcid: (h as any).specs?.alphaAcid,
        addTime: h.addTime,
        specs: (h as any).specs
      })))
    }
    
    let totalIBU = 0
    
    hops.forEach(hop => {
      // Get amount ensuring it's a number
      let amount = typeof hop.amount === 'string' ? parseFloat(hop.amount) : Number(hop.amount) || 0
      
      // Convert amount to grams
      let amountG = amount
      if (hop.unit === 'kg') {
        amountG = amount * 1000
      } else if (hop.unit === 'g') {
        amountG = amount
      } else if (hop.unit === 'oz') {
        amountG = amount * 28.35
      } else {
        // Unknown unit, assume grams
        console.warn(`Unknown hop unit for ${hop.name}: ${hop.unit}, assuming grams`)
      }
      
      // Get Alpha Acid - from specs, or lookup default by name
      // Handle both string ("13%", "13") and number (13) formats
      let alphaAcid = 0
      if ((hop as any).specs?.alphaAcid !== undefined && (hop as any).specs?.alphaAcid !== null) {
        const aaValue = (hop as any).specs.alphaAcid
        if (typeof aaValue === 'string') {
          // Parse string like "13%" or "13"
          alphaAcid = parseFloat(aaValue.replace('%', '').trim()) || 0
        } else if (typeof aaValue === 'number') {
          alphaAcid = aaValue
        }
      }
      
      // If still 0 or invalid, use default lookup
      if (!alphaAcid || isNaN(alphaAcid)) {
        alphaAcid = getDefaultAlphaAcid(hop.name)
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[IBU] ${hop.name}: No alpha acid in specs, using default ${alphaAcid}%`)
        }
      }
      
      // Parse addition time (could be "60 წთ", "60", or number)
      // Addition time is minutes before end of boil (60 = start of boil, 0 = flame-out)
      let additionTime = 60
      if (hop.addTime !== undefined && hop.addTime !== null) {
        const timeStr = String(hop.addTime).replace(/[^0-9.-]/g, '')
        const parsed = parseFloat(timeStr)
        if (!isNaN(parsed) && parsed >= 0) {
          additionTime = parsed
        }
      }
      
      // Skip flame-out/whirlpool additions (0 IBU contribution from bitterness)
      // These contribute flavor/aroma but not measurable IBU
      if (additionTime === 0) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[IBU] ${hop.name}: Flame-out addition (0 min), skipping IBU calculation`)
        }
        return // Use return instead of continue in forEach callback
      }
      
      // Tinseth utilization formula
      // Bigness factor = 1.65 × 0.000125^(OG - 1)
      const bignessFactor = 1.65 * Math.pow(0.000125, (og - 1))
      
      // Boil time factor = (1 - e^(-0.04 × time)) / 4.15
      const boilTimeFactor = (1 - Math.exp(-0.04 * additionTime)) / 4.15
      
      const utilization = bignessFactor * boilTimeFactor
      
      // IBU formula (Tinseth converted to metric):
      // Original: IBU = (weight_oz × alpha × utilization × 74.89) / volume_gallons
      // Where alpha is decimal (0.12 for 12%)
      // Converting: 1 oz = 28.35g, 1 gal = 3.785L
      // IBU = (grams × alpha_decimal × utilization × 74.89 × 3.785) / (liters × 28.35)
      // IBU = (grams × alpha_decimal × utilization × 10.0) / liters
      // Since alphaAcid is stored as percentage (12 for 12%), convert to decimal
      const alphaDecimal = alphaAcid / 100
      const ibu = (amountG * alphaDecimal * utilization * 10) / batchSizeL
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[IBU] ${hop.name}: ${amountG}g × ${alphaAcid}% AA × ${(utilization * 100).toFixed(1)}% util @ ${additionTime}min = ${ibu.toFixed(1)} IBU`)
        console.log(`[IBU Debug] ${hop.name}:`, {
          amount: hop.amount,
          unit: hop.unit,
          amountG,
          alphaAcid,
          specs: (hop as any).specs,
          additionTime,
          utilization: (utilization * 100).toFixed(1) + '%',
          ibu: ibu.toFixed(1)
        })
      }
      
      totalIBU += ibu
    })
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[IBU] Total: ${totalIBU.toFixed(1)} IBU`)
    }
    
    return Math.round(totalIBU)
  }, [])

  const calculateColor = useCallback((grains: Ingredient[], batchSizeL: number): number => {
    if (!grains.length || !batchSizeL) return 0
    
    let mcu = 0  // Malt Color Units
    
    grains.forEach(grain => {
      // Convert amount to pounds
      let amountLbs = grain.amount
      if (grain.unit === 'kg') amountLbs = grain.amount * 2.205
      else if (grain.unit === 'g') amountLbs = grain.amount * 0.002205
      else if (grain.unit === 'oz') amountLbs = grain.amount / 16
      
      // Get color in EBC (default 5 EBC)
      const colorEBC = (grain as any).specs?.color || 5
      const colorSRM = colorEBC / 1.97  // EBC to SRM
      
      // Convert batch size to gallons
      const gallons = batchSizeL * 0.264
      
      // MCU = (lbs × Lovibond) / gallons
      mcu += (amountLbs * colorSRM) / gallons
    })
    
    // Morey equation: SRM = 1.4922 × MCU^0.6859
    const srm = 1.4922 * Math.pow(mcu, 0.6859)
    const ebc = srm * 1.97
    
    return Math.round(ebc)
  }, [])

  // Calculate values from ingredients
  const calculatedValues = useMemo(() => {
    const batchSizeL = batchSize
    const grains = ingredients.filter(i => i.type === 'grain')
    const hops = ingredients.filter(i => i.type === 'hop')
    const yeast = ingredients.find(i => i.type === 'yeast') || null

    // If no grains, return zeros (no calculation possible)
    if (grains.length === 0) {
      return { og: 0, fg: 0, abv: 0, ibu: 0, color: 0 }
    }
    
    const og = calculateOG(grains, batchSizeL, efficiency)
    const fg = calculateFG(og, yeast)
    const abv = calculateABV(og, fg)
    const ibu = calculateIBU(hops, og, batchSizeL)
    const color = calculateColor(grains, batchSizeL)
    
    return { og, fg, abv, ibu, color }
  }, [ingredients, batchSize, efficiency, calculateOG, calculateFG, calculateABV, calculateIBU, calculateColor])

  // Debug logging for calculations
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && ingredients.length > 0) {
      console.log('=== Recipe Calculation Debug ===')
      console.log('Batch Size:', batchSize, 'L')
      console.log('Efficiency:', efficiency, '%')
      
      const grains = ingredients.filter(i => i.type === 'grain')
      const hops = ingredients.filter(i => i.type === 'hop')
      
      console.log(`Ingredients: ${ingredients.length} total (${grains.length} grains, ${hops.length} hops)`)
      
      ingredients.forEach(ing => {
        console.log(`  - ${ing.name} (${ing.type})`)
        console.log(`    Amount: ${ing.amount} ${ing.unit} (type: ${typeof ing.amount})`)
        console.log(`    Specs:`, (ing as any).specs)
      })
      
      console.log('Calculated values:', calculatedValues)
    }
  }, [ingredients, batchSize, efficiency, calculatedValues])

  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (!name || !style) {
      alert('სახელი და სტილი აუცილებელია!')
      return
    }
    
    setIsSaving(true)
    
    try {
      // Generate default brewing process
      const defaultProcess = {
        mashSteps: steps.length > 0
          ? steps.map(s => ({
              name: s.name || `ფაზა ${s.order}`,
              temperature: s.temperature || 65,
              duration: s.duration || 60,
              notes: s.description || '',
            }))
          : [
              { name: 'ბადაგის დაწყება', temperature: 50, duration: 15, notes: '' },
              { name: 'ბეტა-ამილაზა', temperature: 64, duration: 20, notes: '' },
              { name: 'ალფა-ამილაზა', temperature: 72, duration: 25, notes: '' },
              { name: 'მაშ-აუტი', temperature: 75, duration: 5, notes: '' },
            ],
        boilTime: boilTime || 60,
        hopSchedule: hopSchedule
          .map(hop => ({
            name: hop.name,
            amount: hop.amount,
            unit: hop.unit,
            time: hop.time,
            type: hop.type,
            notes: '',
          }))
          .sort((a, b) => b.time - a.time), // Sort by time descending (60, 15, 0)
        fermentation: fermentationSettings,
        conditioning: conditioningSettings,
      }

      // Use calculated values (not manual inputs)
      const og = calculatedValues.og || 0
      const fg = calculatedValues.fg || 0
      const abv = calculatedValues.abv || 0
      const ibuValue = calculatedValues.ibu || 0
      const colorEBC = calculatedValues.color || 0
      
      const recipeData = {
        name,
        style,
        description,
        batchSize,
        boilTime,
        efficiency,
        targetOG: og,
        targetFG: fg,
        targetABV: abv,
        ibu: ibuValue,
        srm: Math.round(colorEBC / 1.97), // Convert EBC to SRM
        notes,
        process: defaultProcess, // Add default brewing process
        ingredients: ingredients.map(ing => ({
          name: ing.name,
          type: ing.type,
          amount: ing.amount,
          unit: ing.unit,
          addTime: ing.addTime,
          inventoryItemId: (ing as any).inventoryItemId,
          specs: (ing as any).specs,
        })),
        steps: steps.map(step => ({
          order: step.order,
          name: step.name,
          description: step.description,
          duration: step.duration,
          temperature: step.temperature,
        })),
      }

      console.log('[NewRecipeModal] Saving recipe:', recipeData.name)

      // Determine endpoint (POST for new, PUT for edit)
      const url = editingRecipe 
        ? `/api/recipes/${editingRecipe.id}`
        : '/api/recipes'
      
      const method = editingRecipe ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recipeData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('[NewRecipeModal] Save failed:', errorData)
        throw new Error(errorData.error?.message || errorData.message || 'შენახვა ვერ მოხერხდა')
      }

      const savedRecipe = await response.json()
      console.log('[NewRecipeModal] Recipe saved successfully:', savedRecipe.id)

      // Call parent's onSave with saved recipe
      onSave(savedRecipe)
      
    } catch (error) {
      console.error('[NewRecipeModal] Save error:', error)
      alert(error instanceof Error ? error.message : 'შენახვა ვერ მოხერხდა')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">
              {isEditing ? '🖊️ რეცეპტის რედაქტირება' : '📝 ახალი რეცეპტი'}
            </h2>
            <button onClick={onClose} className="text-2xl hover:text-red-400 transition-colors">×</button>
          </div>
          
          {/* გამოთვლილი პარამეტრები - Under Title, Above Tabs */}
          <div className="mt-4 mb-4">
            <div className="grid grid-cols-5 gap-3">
              {/* OG */}
              <div className="bg-slate-700 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-amber-400">
                  {calculatedValues.og ? formatGravity(calculatedValues.og) : formatGravity(1.050)}
                </div>
                <div className="text-xs text-slate-400 mt-1">OG</div>
              </div>
              
              {/* FG */}
              <div className="bg-slate-700 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-amber-400">
                  {calculatedValues.fg ? formatGravity(calculatedValues.fg) : formatGravity(1.012)}
                </div>
                <div className="text-xs text-slate-400 mt-1">FG</div>
              </div>
              
              {/* ABV */}
              <div className="bg-slate-700 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-green-400">
                  {calculatedValues.abv?.toFixed(1) || '5.0'}%
                </div>
                <div className="text-xs text-slate-400 mt-1">ABV</div>
              </div>
              
              {/* IBU */}
              <div className="bg-slate-700 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-orange-400">
                  {calculatedValues.ibu?.toFixed(0) || '30'}
                </div>
                <div className="text-xs text-slate-400 mt-1">IBU</div>
              </div>
              
              {/* EBC with color preview */}
              <div className="bg-slate-700 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <div 
                    className="w-6 h-6 rounded-full border border-slate-600"
                    style={{ backgroundColor: getBeerColor(Math.round((calculatedValues.color || 8) / 1.97)) }}
                  />
                  <div className="text-xl font-bold text-amber-400">
                    {calculatedValues.color?.toFixed(0) || '8'}
                  </div>
                </div>
                <div className="text-xs text-slate-400">EBC</div>
              </div>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-2">
            {[
              { id: 'basic', label: 'ძირითადი' },
              { id: 'ingredients', label: 'ინგრედიენტები' },
              { id: 'steps', label: 'პროცესი' },
              { id: 'notes', label: 'შენიშვნები' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeTab === tab.id 
                    ? 'bg-copper text-white' 
                    : 'bg-slate-700 hover:bg-slate-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Basic Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-6">
              {/* Name & Style */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">სახელი *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    placeholder="Georgian Amber Lager"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">სტილი *</label>
                  <input
                    type="text"
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    placeholder="Amber Lager"
                  />
                </div>
              </div>
              
              {/* Description */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">აღწერა</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg resize-none text-white"
                />
              </div>
              
              {/* Batch Parameters */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">მოცულობა (L)</label>
                  <input
                    type="number"
                    value={batchSize}
                    onChange={(e) => setBatchSize(Number(e.target.value))}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">ხარშვის დრო (წთ)</label>
                  <input
                    type="number"
                    value={boilTime}
                    onChange={(e) => setBoilTime(Number(e.target.value))}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">ეფექტურობა (%)</label>
                  <input
                    type="number"
                    value={efficiency}
                    onChange={(e) => setEfficiency(Number(e.target.value))}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  />
                </div>
              </div>
              
              {/* OG, FG, IBU, SRM are calculated and shown in stats bar at top - no manual input needed */}
            </div>
          )}
          
          {/* Ingredients Tab */}
          {activeTab === 'ingredients' && (
            <div className="space-y-6">
              {/* Add Ingredient Form */}
              <div className="p-4 bg-slate-700/50 rounded-lg space-y-4">
                <h3 className="font-semibold">➕ ინგრედიენტის დამატება</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-5 gap-3">
                    <select
                      value={newIngredient.type}
                      onChange={(e) => setNewIngredient(prev => ({ ...prev, type: e.target.value as Ingredient['type'] }))}
                      className="px-3 py-2 bg-slate-600 rounded-lg text-white"
                    >
                      {ingredientTypes.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                    <div className="col-span-2 flex gap-2">
                      <input
                        type="text"
                        placeholder="სახელი"
                        value={newIngredient.name || ''}
                        onChange={(e) => setNewIngredient(prev => ({ ...prev, name: e.target.value }))}
                        className="flex-1 px-3 py-2 bg-slate-600 rounded-lg text-white placeholder-slate-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowIngredientPicker(true)}
                        className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg flex items-center gap-1 text-sm transition-colors"
                        title="აირჩიეთ მარაგიდან"
                      >
                        📦
                      </button>
                    </div>
                    <input
                      type="number"
                      placeholder="რაოდენობა"
                      value={newIngredient.amount || ''}
                      onChange={(e) => setNewIngredient(prev => ({ ...prev, amount: Number(e.target.value) }))}
                      className="px-3 py-2 bg-slate-600 rounded-lg text-white placeholder-slate-400"
                    />
                    <select
                      value={newIngredient.unit}
                      onChange={(e) => setNewIngredient(prev => ({ ...prev, unit: e.target.value }))}
                      className="px-3 py-2 bg-slate-600 rounded-lg text-white"
                    >
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="ml">ml</option>
                      <option value="პაკ">პაკ</option>
                    </select>
                  </div>
                  <Button onClick={addIngredient} size="sm">➕ დამატება</Button>
                </div>
                
                {/* For hops - add time */}
                
                {/* Malt Specs */}
                {newIngredient.type === 'grain' && (
                  <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-600">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">EBC ფერი</label>
                      <input
                        type="number"
                        step="0.1"
                        value={ingredientColor}
                        onChange={(e) => setIngredientColor(e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-800 border border-slate-600 rounded text-white text-sm"
                        placeholder="3-1000"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Yield %</label>
                      <input
                        type="number"
                        step="0.1"
                        value={ingredientYield}
                        onChange={(e) => setIngredientYield(e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-800 border border-slate-600 rounded text-white text-sm"
                        placeholder="75-85"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Potential</label>
                      <input
                        type="number"
                        step="0.001"
                        value={ingredientPotential}
                        onChange={(e) => setIngredientPotential(e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-800 border border-slate-600 rounded text-white text-sm"
                        placeholder="1.035"
                      />
                    </div>
                  </div>
                )}
                
                {/* Hop Specs */}
                {newIngredient.type === 'hop' && (
                  <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-600">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Alpha Acid %</label>
                      <input
                        type="number"
                        step="0.1"
                        value={ingredientAlphaAcid}
                        onChange={(e) => setIngredientAlphaAcid(e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-800 border border-slate-600 rounded text-white text-sm"
                        placeholder="5-15"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Beta Acid %</label>
                      <input
                        type="number"
                        step="0.1"
                        value={ingredientBetaAcid}
                        onChange={(e) => setIngredientBetaAcid(e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-800 border border-slate-600 rounded text-white text-sm"
                        placeholder="3-8"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">ფორმა</label>
                      <select
                        value={ingredientHopForm}
                        onChange={(e) => setIngredientHopForm(e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-800 border border-slate-600 rounded text-white text-sm"
                      >
                        <option value="pellet">გრანულა</option>
                        <option value="leaf">ფოთოლი</option>
                        <option value="cryo">კრიო</option>
                      </select>
                    </div>
                  </div>
                )}
                
                {/* Yeast Specs */}
                {newIngredient.type === 'yeast' && (
                  <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-600">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Attenuation %</label>
                      <input
                        type="text"
                        value={ingredientAttenuation}
                        onChange={(e) => setIngredientAttenuation(e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-800 border border-slate-600 rounded text-white text-sm"
                        placeholder="73-77"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">ტემპერატურა °C</label>
                      <input
                        type="text"
                        value={ingredientTempRange}
                        onChange={(e) => setIngredientTempRange(e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-800 border border-slate-600 rounded text-white text-sm"
                        placeholder="18-22"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">ფლოკულაცია</label>
                      <select
                        value={ingredientFlocculation}
                        onChange={(e) => setIngredientFlocculation(e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-800 border border-slate-600 rounded text-white text-sm"
                      >
                        <option value="">აირჩიეთ</option>
                        <option value="low">დაბალი</option>
                        <option value="medium">საშუალო</option>
                        <option value="high">მაღალი</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Ingredients List by Type */}
              {ingredientTypes.map(type => {
                const typeIngredients = ingredients.filter(i => i.type === type.value)
                if (typeIngredients.length === 0) return null
                
                return (
                  <div key={type.value}>
                    <h4 className="font-semibold mb-2">{type.label}</h4>
                    <div className="space-y-2">
                      {typeIngredients.map(ing => (
                        <div key={ing.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                          {/* Ingredient Name */}
                          <span className="font-medium flex-1">{ing.name}</span>
                          
                          {/* Editable Quantity */}
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={ing.amount}
                              onChange={(e) => handleUpdateIngredientAmount(ing.id, parseFloat(e.target.value) || 0)}
                              className="w-20 px-2 py-1 bg-slate-600 border border-slate-500 rounded text-right text-sm focus:border-amber-500 focus:outline-none"
                              min="0"
                              step="0.1"
                            />
                            <span className="text-slate-400 text-sm w-8">{ing.unit}</span>
                            
                            {/* Delete Button Only */}
                            <button
                              onClick={() => removeIngredient(ing.id)}
                              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-600 rounded transition-colors ml-2"
                              title="წაშლა"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
              
              {ingredients.length === 0 && (
                <p className="text-center text-slate-500 py-8">
                  ინგრედიენტები არ არის დამატებული
                </p>
              )}
            </div>
          )}
          
          {/* Steps/Process Tab */}
          {activeTab === 'steps' && (
            <div className="space-y-6">

              {/* Mash Steps */}
              <div className="bg-slate-700/50 rounded-lg p-4">
                <h3 className="text-lg font-medium mb-4">🌡️ ბადაგის მიღება</h3>
                
                {/* Flex container for steps + diagram */}
                <div className="flex gap-4">
                  
                  {/* Left: Steps List */}
                  <div className="flex-1 space-y-2">
                    {steps.map((step, index) => (
                      <div key={step.id} className="flex items-center gap-2 p-2 bg-slate-600 rounded-lg">
                        <div className="w-6 h-6 rounded-full bg-amber-600 flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </div>
                        <input
                          type="text"
                          value={step.name}
                          onChange={(e) => updateStep(step.id, { name: e.target.value })}
                          className="flex-1 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                          placeholder="სახელი"
                        />
                        <input
                          type="number"
                          value={step.temperature || ''}
                          onChange={(e) => updateStep(step.id, { temperature: Number(e.target.value) })}
                          className="w-14 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm text-center"
                        />
                        <span className="text-slate-400 text-xs">°C</span>
                        <input
                          type="number"
                          value={step.duration}
                          onChange={(e) => updateStep(step.id, { duration: Number(e.target.value) })}
                          className="w-14 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm text-center"
                        />
                        <span className="text-slate-400 text-xs">წთ</span>
                        <button onClick={() => removeStep(step.id)} className="text-red-400 hover:text-red-300 text-sm">
                          ✕
                        </button>
                      </div>
                    ))}
                    
                    {/* Add Step Button */}
                    <button
                      onClick={addStep}
                      className="w-full py-2 border border-dashed border-slate-500 rounded-lg text-slate-400 hover:border-amber-500 hover:text-amber-400 text-sm"
                    >
                      + ბადაგის ნაბიჯის დამატება
                    </button>
                  </div>
                  
                  {/* Right: Temperature Diagram */}
                  {steps.length > 0 && (
                    <div className="w-80 bg-slate-800 rounded-lg p-4 flex-shrink-0">
                      <h4 className="text-sm font-medium text-slate-200 mb-3">Mashing Process</h4>
                      <svg viewBox="0 0 240 160" className="w-full h-full" preserveAspectRatio="xMidYMid meet" style={{ minHeight: '200px' }}>
                        {/* Grid */}
                        <defs>
                          <pattern id="mashGridSmall" width="30" height="20" patternUnits="userSpaceOnUse">
                            <path d="M 30 0 L 0 0 0 20" fill="none" stroke="#334155" strokeWidth="0.5"/>
                          </pattern>
                        </defs>
                        <rect x="40" y="10" width="180" height="120" fill="url(#mashGridSmall)" />
                        
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
                          const minTemp = 40
                          const maxTemp = 80
                          const totalTime = 90 // Fixed 90 minutes scale
                          
                          let points: string[] = []
                          let currentTime = 0
                          let currentTemp = minTemp
                          
                          // Start point at 40°C
                          points.push(`40,130`)
                          
                          steps.forEach((step, idx) => {
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
                                stroke="#3b82f6"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                points={points.join(' ')}
                              />
                              
                              {/* Temperature labels */}
                              {steps.map((step, idx) => {
                                const temp = step.temperature || 65
                                let timeAtMid = 0
                                
                                // Calculate time to middle of hold period
                                let prevTemp = minTemp
                                for (let i = 0; i <= idx; i++) {
                                  const stepTemp = steps[i].temperature || 65
                                  timeAtMid += Math.abs(stepTemp - prevTemp) // ramp
                                  if (i < idx) {
                                    timeAtMid += steps[i].duration || 0 // previous holds
                                  } else {
                                    timeAtMid += (steps[i].duration || 0) / 2 // half of current hold
                                  }
                                  prevTemp = stepTemp
                                }
                                
                                const xPos = 40 + (timeAtMid / totalTime) * 180
                                const yPos = 130 - ((temp - minTemp) / (maxTemp - minTemp)) * 120
                                
                                return (
                                  <g key={idx}>
                                    <circle cx={xPos} cy={yPos} r="5" fill="#3b82f6" stroke="#1e40af" strokeWidth="1.5"/>
                                    <text x={xPos} y={yPos - 12} fill="#93c5fd" fontSize="12" fontWeight="bold" textAnchor="middle">
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
                  )}
                  
                </div>
              </div>

              {/* Boil & Hop Schedule */}
              <div className="bg-slate-700/50 rounded-lg p-4">
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  🔥 ხარშვა
                </h3>
                
                {/* Boil Time */}
                <div className="flex items-center gap-4 mb-4 pb-4 border-b border-slate-600">
                  <label className="text-slate-400">ხანგრძლივობა:</label>
                  <input
                    type="number"
                    value={boilTime}
                    onChange={(e) => setBoilTime(Number(e.target.value))}
                    className="w-20 px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white text-center"
                  />
                  <span className="text-slate-400">წუთი</span>
                </div>
                
                {/* Hop Schedule - Editable */}
                <div>
                  <h4 className="text-sm font-medium mb-3 text-green-400">🌿 სვიის დამატებები</h4>
                  
                  {hopSchedule.length > 0 ? (
                    <div className="space-y-3">
                      {hopSchedule
                        .sort((a, b) => b.time - a.time)
                        .map((hop, index) => (
                          <div key={index} className="flex items-center gap-3 p-3 bg-slate-600 rounded-lg">
                            {/* Hop Name (read-only) */}
                            <div className="flex-1">
                              <span className="font-medium">{hop.name}</span>
                              <span className="text-slate-400 ml-2">{hop.amount} {hop.unit}</span>
                            </div>
                            
                            {/* Type Dropdown */}
                            <select
                              value={hop.type}
                              onChange={(e) => {
                                const updated = [...hopSchedule]
                                updated[index] = { 
                                  ...updated[index], 
                                  type: e.target.value,
                                  // Auto-set default time based on type
                                  time: e.target.value === 'bittering' ? 60 :
                                        e.target.value === 'flavor' ? 15 :
                                        e.target.value === 'aroma' ? 5 :
                                        e.target.value === 'flameout' ? 0 :
                                        e.target.value === 'dryhop' ? 0 : updated[index].time
                                }
                                setHopSchedule(updated)
                              }}
                              className="px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                            >
                              <option value="bittering">🎯 სიმწარე</option>
                              <option value="flavor">🌿 არომატი</option>
                              <option value="aroma">💨 არომატი (გვიან)</option>
                              <option value="flameout">🔥 ფლეიმ-აუტი</option>
                              <option value="dryhop">🍃 დრაი-ჰოპი</option>
                            </select>
                            
                            {/* Time Input */}
                            <div className="flex items-center gap-1">
                              <span className="text-slate-400">@</span>
                              <input
                                type="number"
                                value={hop.time}
                                onChange={(e) => {
                                  const updated = [...hopSchedule]
                                  updated[index] = { ...updated[index], time: Number(e.target.value) }
                                  setHopSchedule(updated)
                                }}
                                className="w-16 px-2 py-2 bg-slate-700 border border-slate-600 rounded text-white text-center"
                                min="0"
                                max="120"
                              />
                              <span className="text-slate-400 text-sm">წთ</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-center text-slate-500 py-4">
                      ჯერ დაამატეთ სვია ინგრედიენტების ტაბში
                    </p>
                  )}
                </div>
              </div>

              {/* Fermentation */}
              <div className="bg-slate-700/50 rounded-lg p-4">
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  🧪 ფერმენტაცია
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-slate-300">პირველადი</h4>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-slate-400 w-24">ტემპერატურა:</label>
                      <input
                        type="number"
                        value={fermentationSettings.primaryTemp}
                        onChange={(e) => setFermentationSettings(prev => ({
                          ...prev,
                          primaryTemp: Number(e.target.value)
                        }))}
                        className="w-16 px-2 py-1 bg-slate-600 rounded text-white text-center"
                      />
                      <span className="text-slate-400">°C</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-slate-400 w-24">ხანგრძლივობა:</label>
                      <input
                        type="number"
                        value={fermentationSettings.primaryDays}
                        onChange={(e) => setFermentationSettings(prev => ({
                          ...prev,
                          primaryDays: Number(e.target.value)
                        }))}
                        className="w-16 px-2 py-1 bg-slate-600 rounded text-white text-center"
                      />
                      <span className="text-slate-400">დღე</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-slate-300">მეორადი (optional)</h4>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-slate-400 w-24">ტემპერატურა:</label>
                      <input
                        type="number"
                        value={fermentationSettings.secondaryTemp}
                        onChange={(e) => setFermentationSettings(prev => ({
                          ...prev,
                          secondaryTemp: Number(e.target.value)
                        }))}
                        className="w-16 px-2 py-1 bg-slate-600 rounded text-white text-center"
                      />
                      <span className="text-slate-400">°C</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-slate-400 w-24">ხანგრძლივობა:</label>
                      <input
                        type="number"
                        value={fermentationSettings.secondaryDays}
                        onChange={(e) => setFermentationSettings(prev => ({
                          ...prev,
                          secondaryDays: Number(e.target.value)
                        }))}
                        className="w-16 px-2 py-1 bg-slate-600 rounded text-white text-center"
                      />
                      <span className="text-slate-400">დღე</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <input
                    type="text"
                    placeholder="შენიშვნა..."
                    value={fermentationSettings.notes}
                    onChange={(e) => setFermentationSettings(prev => ({
                      ...prev,
                      notes: e.target.value
                    }))}
                    className="w-full px-3 py-2 bg-slate-600 rounded text-white text-sm"
                  />
                </div>
              </div>

              {/* Conditioning */}
              <div className="bg-slate-700/50 rounded-lg p-4">
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  ❄️ კონდიცირება / ლაგერირება
                </h3>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-400">ტემპერატურა:</label>
                    <input
                      type="number"
                      value={conditioningSettings.temperature}
                      onChange={(e) => setConditioningSettings(prev => ({
                        ...prev,
                        temperature: Number(e.target.value)
                      }))}
                      className="w-16 px-2 py-1 bg-slate-600 rounded text-white text-center"
                    />
                    <span className="text-slate-400">°C</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-400">ხანგრძლივობა:</label>
                    <input
                      type="number"
                      value={conditioningSettings.days}
                      onChange={(e) => setConditioningSettings(prev => ({
                        ...prev,
                        days: Number(e.target.value)
                      }))}
                      className="w-16 px-2 py-1 bg-slate-600 rounded text-white text-center"
                    />
                    <span className="text-slate-400">დღე</span>
                  </div>
                </div>
                <div className="mt-3">
                  <input
                    type="text"
                    placeholder="შენიშვნა..."
                    value={conditioningSettings.notes}
                    onChange={(e) => setConditioningSettings(prev => ({
                      ...prev,
                      notes: e.target.value
                    }))}
                    className="w-full px-3 py-2 bg-slate-600 rounded text-white text-sm"
                  />
                </div>
              </div>

              {/* Total Time Summary */}
              <div className="bg-amber-900/30 border border-amber-700/50 rounded-lg p-4 mt-4">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-amber-400 font-medium">⏱️ სულ დრო:</span>
                    <span className="text-xl font-bold text-amber-400">
                      {
                        (fermentationSettings.primaryDays + fermentationSettings.secondaryDays) + 
                        conditioningSettings.days
                      } დღე
                    </span>
                  </div>
                  <div className="text-sm text-slate-400 flex items-center gap-2">
                    <span>ფერმენტაცია: {fermentationSettings.primaryDays + fermentationSettings.secondaryDays} დღე</span>
                    <span>+</span>
                    <span>კონდიცირება: {conditioningSettings.days} დღე</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <div>
              <label className="block text-sm text-slate-400 mb-2">შენიშვნები</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={10}
                placeholder="რეცეპტის შესახებ დამატებითი ინფორმაცია..."
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg resize-none text-white placeholder-slate-400"
              />
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-border flex justify-between">
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>გაუქმება</Button>
            
            {/* Delete Button - Only Show When Editing */}
            {editingRecipe && (
              <button
                onClick={async () => {
                  if (confirm('ნამდვილად გსურთ რეცეპტის წაშლა?')) {
                    try {
                      const response = await fetch(`/api/recipes/${editingRecipe.id}`, {
                        method: 'DELETE',
                      })
                      if (response.ok) {
                        onClose()
                        // Refresh the page or trigger a refetch
                        window.location.reload()
                      } else {
                        alert('წაშლა ვერ მოხერხდა')
                      }
                    } catch (error) {
                      console.error('Delete error:', error)
                      alert('წაშლა ვერ მოხერხდა')
                    }
                  }
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-white flex items-center gap-2 transition-colors"
              >
                🗑️ წაშლა
              </button>
            )}
          </div>
          <Button 
            variant="primary" 
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving 
              ? '⏳ იტვირთება...' 
              : isEditing 
                ? '💾 შენახვა' 
                : '✨ რეცეპტის შექმნა'
            }
          </Button>
        </div>
      </div>
      
      {/* Inventory Ingredient Picker Modal */}
      <InventoryIngredientPicker
        isOpen={showIngredientPicker}
        onClose={() => setShowIngredientPicker(false)}
        onSelect={handleSelectFromInventory}
        category={getPickerCategory()}
      />
    </div>
  )
}
