'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardBody, Button } from '@/components/ui'
import { 
  Package, 
  Tag, 
  CircleDot,
  Plus,
  X,
  RefreshCw,
  AlertTriangle,
  ChevronRight
} from 'lucide-react'

// Types
interface Recipe {
  id: string
  name: string
  style?: string
}

interface Supplier {
  id: string
  name: string
  category: string | null
}

interface InventoryItem {
  id: string
  name: string
  sku: string
  category: string
  unit: string
  quantity: number
  reorderPoint: number | null
  metadata?: {
    type?: string
    size?: string
    recipeIds?: string[]
    bottleType?: string
  }
}

// Sub-tab type
type SubTab = 'bottles' | 'labels' | 'caps'

// Section config
const subTabConfig: Record<SubTab, { label: string; icon: any; color: string; addLabel: string }> = {
  bottles: { label: 'ბოთლები / ქილა', icon: Package, color: 'text-blue-400', addLabel: 'ბოთლის დამატება' },
  labels: { label: 'ეტიკეტები', icon: Tag, color: 'text-purple-400', addLabel: 'ეტიკეტის დამატება' },
  caps: { label: 'თავსახურები', icon: CircleDot, color: 'text-amber-400', addLabel: 'თავსახურის დამატება' },
}

const paymentMethods = [
  { value: 'BANK_TRANSFER', label: '🏦 გადარიცხვა' },
  { value: 'CASH', label: '💵 ნაღდი' },
  { value: 'CARD', label: '💳 ბარათი' },
  { value: 'CHECK', label: '📝 ჩეკი' },
]

export function PackagingMaterialsSection() {
  const router = useRouter()
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('bottles')
  const [items, setItems] = useState<{
    bottles: InventoryItem[]
    labels: InventoryItem[]
    caps: InventoryItem[]
  }>({
    bottles: [],
    labels: [],
    caps: [],
  })
  const [loading, setLoading] = useState(true)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  
  // Add modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({
    name: '',
    size: '',
    quantity: '',
    reorderPoint: '',
    selectedRecipes: [] as string[],
    // Expense fields
    costPerUnit: '',
    supplierId: '',
    invoiceNumber: '',
    createExpense: true,
    isPaid: false,
    paymentMethod: 'BANK_TRANSFER',
  })
  const [saving, setSaving] = useState(false)
  const [showNewSupplierInput, setShowNewSupplierInput] = useState(false)
  const [newSupplierName, setNewSupplierName] = useState('')

  // Fetch recipes
  const fetchRecipes = async () => {
    try {
      const res = await fetch('/api/recipes')
      if (res.ok) {
        const data = await res.json()
        setRecipes(data.recipes || data || [])
      }
    } catch (error) {
      console.error('Failed to fetch recipes:', error)
    }
  }

  // Fetch suppliers
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

  // Fetch all packaging materials
  const fetchItems = async () => {
    setLoading(true)
    try {
      const packagingRes = await fetch('/api/inventory?category=PACKAGING')
      const packagingData = packagingRes.ok ? await packagingRes.json() : { items: [] }
      
      const allItems = packagingData.items || []
      console.log('[PackagingMaterials] Fetched items:', allItems)
      
      const getQuantity = (item: any) => {
        return item.quantity ?? item.cachedBalance ?? item.balance ?? item.currentStock ?? 0
      }
      
      const bottles = allItems.filter((item: any) => {
        const type = item.metadata?.type || ''
        const bottleType = item.metadata?.bottleType || ''
        const name = (item.name || '').toLowerCase()
        return type === 'bottle' || type === 'can' || 
               bottleType.startsWith('bottle_') || bottleType.startsWith('can_') ||
               name.includes('ბოთლი') || name.includes('bottle') ||
               name.includes('ქილა') || name.includes('can')
      }).map((item: any) => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        category: item.category,
        unit: item.unit || 'ცალი',
        quantity: getQuantity(item),
        reorderPoint: item.reorderPoint,
        metadata: item.metadata,
      }))
      
      const labels = allItems.filter((item: any) => {
        const type = item.metadata?.type || ''
        const name = (item.name || '').toLowerCase()
        return type === 'label' || 
               (name.includes('label') || name.includes('ეტიკეტ')) &&
               !name.includes('ბოთლი') && !name.includes('cap')
      }).map((item: any) => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        category: item.category,
        unit: item.unit || 'ცალი',
        quantity: getQuantity(item),
        reorderPoint: item.reorderPoint,
        metadata: item.metadata,
      }))
      
      const caps = allItems.filter((item: any) => {
        const type = item.metadata?.type || ''
        const name = (item.name || '').toLowerCase()
        return type === 'cap' || 
               name.includes('თავსახური') || name.includes('cap') || 
               name.includes('mm')
      }).map((item: any) => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        category: item.category,
        unit: item.unit || 'ცალი',
        quantity: getQuantity(item),
        reorderPoint: item.reorderPoint,
        metadata: item.metadata,
      }))
      
      setItems({ bottles, labels, caps })
    } catch (error) {
      console.error('Failed to fetch packaging materials:', error)
    } finally {
      setLoading(false)
    }
  }

  // Open add modal
  const openAddModal = () => {
    setAddForm({
      name: '',
      size: '',
      quantity: '',
      reorderPoint: '',
      selectedRecipes: [],
      costPerUnit: '',
      supplierId: '',
      invoiceNumber: '',
      createExpense: true,
      isPaid: false,
      paymentMethod: 'BANK_TRANSFER',
    })
    setShowNewSupplierInput(false)
    setNewSupplierName('')
    setShowAddModal(true)
  }

  // Toggle recipe selection
  const toggleRecipe = (recipeId: string) => {
    setAddForm(prev => ({
      ...prev,
      selectedRecipes: prev.selectedRecipes.includes(recipeId)
        ? prev.selectedRecipes.filter(id => id !== recipeId)
        : [...prev.selectedRecipes, recipeId]
    }))
  }

  // Create new supplier
  const handleCreateSupplier = async () => {
    if (!newSupplierName.trim()) return
    
    try {
      const response = await fetch('/api/finances/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSupplierName.trim(),
          category: 'packaging',
        }),
      })
      
      if (response.ok) {
        const data = await response.json()
        setAddForm(prev => ({ ...prev, supplierId: data.supplier.id }))
        setShowNewSupplierInput(false)
        setNewSupplierName('')
        fetchSuppliers()
        alert('✅ მომწოდებელი დაემატა!')
      } else {
        const error = await response.json()
        alert(error.error || 'მომწოდებლის დამატება ვერ მოხერხდა')
      }
    } catch (err) {
      console.error('Create supplier error:', err)
      alert('მომწოდებლის დამატება ვერ მოხერხდა')
    }
  }

  // Submit new item
  const submitAdd = async () => {
    if (!addForm.name) {
      alert('სახელი აუცილებელია')
      return
    }

    // Validate expense fields
    if (addForm.createExpense && addForm.quantity && parseInt(addForm.quantity) > 0) {
      if (!addForm.costPerUnit || parseFloat(addForm.costPerUnit) <= 0) {
        alert('ხარჯის დასაფიქსირებლად საჭიროა ფასის მითითება')
        return
      }
    }
    
    setSaving(true)
    try {
      let metadata: any = {
        recipeIds: addForm.selectedRecipes,
        size: addForm.size,
      }
      
      if (activeSubTab === 'bottles') {
        metadata.type = 'bottle'
        if (addForm.size === '500ml') metadata.bottleType = 'bottle_500'
        else if (addForm.size === '330ml') metadata.bottleType = 'bottle_330'
        else if (addForm.size === '750ml') metadata.bottleType = 'bottle_750'
        else if (addForm.size === '1L') metadata.bottleType = 'bottle_1000'
        else if (addForm.size === '500ml_can') {
          metadata.bottleType = 'can_500'
          metadata.type = 'can'
        }
        else if (addForm.size === '330ml_can') {
          metadata.bottleType = 'can_330'
          metadata.type = 'can'
        }
        else metadata.bottleType = 'bottle_500'
      } else if (activeSubTab === 'labels') {
        metadata.type = 'label'
      } else if (activeSubTab === 'caps') {
        metadata.type = 'cap'
      }
      
      const payload: any = {
        name: addForm.name,
        sku: `PKG-${Date.now()}`,
        category: 'PACKAGING',
        unit: 'ცალი',
        quantity: 0, // Start with 0, will add via purchase
        costPerUnit: addForm.costPerUnit ? parseFloat(addForm.costPerUnit) : undefined,
        metadata,
      }
      
      if (addForm.reorderPoint && parseInt(addForm.reorderPoint) > 0) {
        payload.reorderPoint = parseInt(addForm.reorderPoint)
      }
      
      // Step 1: Create inventory item
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      
      if (!res.ok) {
        const error = await res.json()
        alert(error.error || 'დამატება ვერ მოხერხდა')
        return
      }

      const createResult = await res.json()
      const itemId = createResult.item?.id || createResult.id

      // Step 2: Create purchase record if quantity > 0
      if (addForm.quantity && parseInt(addForm.quantity) > 0 && itemId) {
        const quantity = parseInt(addForm.quantity)
        const unitPrice = addForm.costPerUnit ? parseFloat(addForm.costPerUnit) : 0

        const purchasePayload = {
          itemId: itemId,
          quantity: quantity,
          unitPrice: unitPrice,
          totalAmount: quantity * unitPrice,
          supplierId: addForm.supplierId || undefined,
          date: new Date().toISOString().split('T')[0],
          invoiceNumber: addForm.invoiceNumber || undefined,
          notes: `საწყისი მარაგი: ${addForm.name}`,
          createExpense: addForm.createExpense,
          isPaid: addForm.isPaid,
          paymentMethod: addForm.paymentMethod,
        }

        const purchaseRes = await fetch('/api/inventory/purchase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(purchasePayload),
        })

        if (!purchaseRes.ok) {
          console.error('Purchase record failed')
          alert('მასალა დაემატა, მაგრამ შესყიდვის ჩაწერა ვერ მოხერხდა')
        }
      }

      setShowAddModal(false)
      fetchItems()
    } catch (error) {
      console.error('Failed to add item:', error)
      alert('დამატება ვერ მოხერხდა')
    } finally {
      setSaving(false)
    }
  }

  // Navigate to detail page
  const goToDetail = (item: InventoryItem) => {
    router.push(`/inventory/packaging/${item.id}`)
  }

  useEffect(() => {
    fetchItems()
    fetchRecipes()
    fetchSuppliers()
  }, [])

  // Get current tab items
  const currentItems = items[activeSubTab]
  const currentConfig = subTabConfig[activeSubTab]
  const total = currentItems.reduce((sum, i) => sum + i.quantity, 0)

  // Calculate total amount for summary
  const totalAmount = (parseInt(addForm.quantity) || 0) * (parseFloat(addForm.costPerUnit) || 0)

  // Get recipe names for item
  const getRecipeNames = (item: InventoryItem): string[] => {
    const recipeIds = item.metadata?.recipeIds || []
    return recipeIds
      .map(id => recipes.find(r => r.id === id)?.name)
      .filter(Boolean) as string[]
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-8 h-8 text-copper animate-spin" />
        <span className="ml-3 text-text-muted">იტვირთება...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(Object.keys(subTabConfig) as SubTab[]).map(tab => {
            const config = subTabConfig[tab]
            const count = items[tab].length
            
            return (
              <button
                key={tab}
                onClick={() => setActiveSubTab(tab)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  activeSubTab === tab 
                    ? 'bg-copper text-white' 
                    : 'bg-bg-tertiary hover:bg-slate-600 text-text-secondary'
                }`}
              >
                <config.icon className="w-4 h-4" />
                <span>{config.label}</span>
                <span className="text-xs opacity-70">({count})</span>
              </button>
            )
          })}
        </div>
        
        <Button variant="primary" size="sm" onClick={openAddModal}>
          <Plus className="w-4 h-4 mr-1" />
          {currentConfig.addLabel}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-bold font-display text-copper-light">{currentItems.length}</p>
          <p className="text-xs text-text-muted">სახეობა</p>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <p className={`text-2xl font-bold font-display ${currentConfig.color}`}>{total.toLocaleString()}</p>
          <p className="text-xs text-text-muted">სულ ცალი</p>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-bold font-display text-red-400">
            {currentItems.filter(i => i.reorderPoint && i.quantity <= i.reorderPoint).length}
          </p>
          <p className="text-xs text-text-muted">დაბალი მარაგი</p>
        </div>
      </div>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <currentConfig.icon className={`w-5 h-5 ${currentConfig.color}`} />
            <span>{currentConfig.label}</span>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {currentItems.length === 0 ? (
            <div className="p-8 text-center text-text-muted">
              <currentConfig.icon className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>მონაცემები არ მოიძებნა</p>
              <Button variant="secondary" size="sm" className="mt-4" onClick={openAddModal}>
                <Plus className="w-4 h-4 mr-1" />
                {currentConfig.addLabel}
              </Button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-bg-tertiary text-left text-xs text-text-muted">
                  <th className="px-4 py-3">დასახელება</th>
                  <th className="px-4 py-3">რეცეპტები</th>
                  <th className="px-4 py-3">მარაგი</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map(item => {
                  const isLow = item.reorderPoint && item.quantity <= item.reorderPoint
                  const recipeNames = getRecipeNames(item)
                  
                  return (
                    <tr 
                      key={item.id} 
                      className="border-b border-border/50 hover:bg-bg-tertiary/50 transition-colors cursor-pointer"
                      onClick={() => goToDetail(item)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <currentConfig.icon className={`w-5 h-5 ${currentConfig.color}`} />
                          <div>
                            <p className="font-medium text-text-primary">{item.name}</p>
                            {item.metadata?.size && (
                              <p className="text-xs text-text-muted">{item.metadata.size}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {recipeNames.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {recipeNames.slice(0, 3).map((name, idx) => (
                              <span 
                                key={idx}
                                className="px-2 py-0.5 rounded-full bg-copper/20 text-copper-light text-xs"
                              >
                                {name}
                              </span>
                            ))}
                            {recipeNames.length > 3 && (
                              <span className="px-2 py-0.5 rounded-full bg-bg-tertiary text-text-muted text-xs">
                                +{recipeNames.length - 3}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-text-muted text-sm">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-text-primary">{item.quantity.toLocaleString()}</span>
                          <span className="text-sm text-text-muted">{item.unit}</span>
                        </div>
                        {isLow && (
                          <div className="flex items-center gap-1 text-amber-400 text-xs mt-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>მინ: {item.reorderPoint}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <ChevronRight className="w-5 h-5 text-text-muted" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-bg-secondary border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold text-text-primary">
                {currentConfig.addLabel}
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-lg hover:bg-bg-tertiary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  დასახელება *
                </label>
                <input
                  type="text"
                  value={addForm.name}
                  onChange={(e) => setAddForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg bg-bg-card border border-border focus:border-copper focus:ring-1 focus:ring-copper outline-none"
                  placeholder={activeSubTab === 'bottles' ? 'მაგ: ბოთლი 500ml' : activeSubTab === 'labels' ? 'მაგ: Pilsner Label' : 'მაგ: თავსახური 26mm'}
                />
              </div>

              {/* Size - Dropdown based on tab */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  ზომა
                </label>
                <select
                  value={addForm.size}
                  onChange={(e) => setAddForm(prev => ({ ...prev, size: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg bg-bg-card border border-border focus:border-copper focus:ring-1 focus:ring-copper outline-none"
                >
                  <option value="">აირჩიეთ ზომა</option>
                  {activeSubTab === 'bottles' && (
                    <>
                      <option value="500ml">500ml ბოთლი</option>
                      <option value="330ml">330ml ბოთლი</option>
                      <option value="750ml">750ml (ღვინის ბოთლი)</option>
                      <option value="1L">1L ბოთლი</option>
                      <option value="500ml_can">500ml ქილა</option>
                      <option value="330ml_can">330ml ქილა</option>
                    </>
                  )}
                  {activeSubTab === 'labels' && (
                    <>
                      <option value="500ml">500ml ბოთლისთვის</option>
                      <option value="330ml">330ml ბოთლისთვის</option>
                      <option value="750ml">750ml ბოთლისთვის</option>
                      <option value="can">ქილისთვის</option>
                    </>
                  )}
                  {activeSubTab === 'caps' && (
                    <>
                      <option value="26mm">26mm</option>
                      <option value="29mm">29mm</option>
                      <option value="38mm">38mm</option>
                    </>
                  )}
                </select>
              </div>

              {/* Quantity and Min Stock */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    საწყისი რაოდენობა
                  </label>
                  <input
                    type="number"
                    value={addForm.quantity}
                    onChange={(e) => setAddForm(prev => ({ ...prev, quantity: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg bg-bg-card border border-border focus:border-copper focus:ring-1 focus:ring-copper outline-none"
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    მინ. მარაგი
                  </label>
                  <input
                    type="number"
                    value={addForm.reorderPoint}
                    onChange={(e) => setAddForm(prev => ({ ...prev, reorderPoint: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg bg-bg-card border border-border focus:border-copper focus:ring-1 focus:ring-copper outline-none"
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>

              {/* Cost per unit */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  ფასი (₾/ცალი) {addForm.createExpense && addForm.quantity && <span className="text-red-400">*</span>}
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={addForm.costPerUnit}
                  onChange={(e) => setAddForm(prev => ({ ...prev, costPerUnit: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg bg-bg-card border border-border focus:border-copper focus:ring-1 focus:ring-copper outline-none"
                  placeholder="0.00"
                  min="0"
                />
              </div>

              {/* Expense Options */}
              <div className="p-4 bg-slate-700/30 rounded-xl space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="createExpense"
                    checked={addForm.createExpense}
                    onChange={(e) => setAddForm(prev => ({ ...prev, createExpense: e.target.checked }))}
                    className="w-5 h-5 rounded border-slate-600"
                  />
                  <label htmlFor="createExpense" className="text-sm font-medium cursor-pointer">
                    📊 ხარჯად დაფიქსირება
                  </label>
                </div>

                {addForm.createExpense && (
                  <>
                    {/* Supplier Selection */}
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">
                        მომწოდებელი
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={addForm.supplierId}
                          onChange={(e) => setAddForm(prev => ({ ...prev, supplierId: e.target.value }))}
                          className="flex-1 px-4 py-2 rounded-lg bg-bg-card border border-border focus:border-copper outline-none"
                        >
                          <option value="">-- აირჩიეთ --</option>
                          {suppliers.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setShowNewSupplierInput(true)}
                          className="px-4 py-2 bg-bg-card border border-border rounded-lg hover:bg-bg-tertiary transition-colors"
                        >
                          ➕
                        </button>
                      </div>
                      
                      {showNewSupplierInput && (
                        <div className="mt-2 p-3 bg-bg-tertiary rounded-lg border border-border">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newSupplierName}
                              onChange={(e) => setNewSupplierName(e.target.value)}
                              placeholder="ახალი მომწოდებელი"
                              className="flex-1 px-3 py-2 bg-bg-card border border-border rounded-lg text-sm"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && newSupplierName.trim()) {
                                  handleCreateSupplier()
                                }
                              }}
                            />
                            <Button size="sm" onClick={handleCreateSupplier}>შენახვა</Button>
                            <Button size="sm" variant="ghost" onClick={() => setShowNewSupplierInput(false)}>✕</Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Invoice Number */}
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">
                        ინვოისის ნომერი
                      </label>
                      <input
                        type="text"
                        value={addForm.invoiceNumber}
                        onChange={(e) => setAddForm(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                        className="w-full px-4 py-2 rounded-lg bg-bg-card border border-border focus:border-copper outline-none"
                        placeholder="INV-2024-001"
                      />
                    </div>

                    {/* Is Paid */}
                    <div className="flex items-center gap-3 ml-4">
                      <input
                        type="checkbox"
                        id="isPaid"
                        checked={addForm.isPaid}
                        onChange={(e) => setAddForm(prev => ({ ...prev, isPaid: e.target.checked }))}
                        className="w-5 h-5 rounded border-slate-600"
                      />
                      <label htmlFor="isPaid" className="text-sm font-medium cursor-pointer">
                        ✅ გადახდილია
                      </label>
                    </div>

                    {/* Payment Method */}
                    {addForm.isPaid && (
                      <div className="ml-4">
                        <label className="block text-sm font-medium text-text-secondary mb-1">
                          გადახდის მეთოდი
                        </label>
                        <select
                          value={addForm.paymentMethod}
                          onChange={(e) => setAddForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                          className="w-full px-4 py-2 rounded-lg bg-bg-card border border-border focus:border-copper outline-none"
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

              {/* Summary */}
              {addForm.createExpense && totalAmount > 0 && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-text-muted">ჯამი:</span>
                    <span className="text-2xl font-bold text-amber-400">₾{totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="text-sm text-text-muted">
                    {currentConfig.label}: {parseInt(addForm.quantity || '0').toLocaleString()} ცალი
                  </div>
                </div>
              )}

              {/* Recipe Selection */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  რეცეპტები (შეგიძლიათ რამდენიმე აირჩიოთ)
                </label>
                <div className="bg-bg-card border border-border rounded-lg max-h-48 overflow-y-auto">
                  {recipes.length === 0 ? (
                    <div className="p-4 text-center text-text-muted text-sm">
                      რეცეპტები არ მოიძებნა
                    </div>
                  ) : (
                    recipes.map(recipe => (
                      <label
                        key={recipe.id}
                        className="flex items-center gap-3 px-4 py-2 hover:bg-bg-tertiary cursor-pointer border-b border-border/50 last:border-0"
                      >
                        <input
                          type="checkbox"
                          checked={addForm.selectedRecipes.includes(recipe.id)}
                          onChange={() => toggleRecipe(recipe.id)}
                          className="w-4 h-4 rounded border-border text-copper focus:ring-copper"
                        />
                        <div className="flex-1">
                          <p className="text-sm text-text-primary">{recipe.name}</p>
                          {recipe.style && (
                            <p className="text-xs text-text-muted">{recipe.style}</p>
                          )}
                        </div>
                      </label>
                    ))
                  )}
                </div>
                {addForm.selectedRecipes.length > 0 && (
                  <p className="text-xs text-text-muted mt-2">
                    არჩეულია: {addForm.selectedRecipes.length} რეცეპტი
                  </p>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center gap-3 p-4 border-t border-border">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 rounded-lg bg-bg-tertiary text-text-secondary hover:bg-bg-card transition-colors"
              >
                გაუქმება
              </button>
              <button
                onClick={submitAdd}
                disabled={!addForm.name || saving}
                className="flex-1 px-4 py-2 rounded-lg bg-copper text-white font-medium hover:bg-copper/80 transition-colors disabled:opacity-50"
              >
                {saving ? 'იტვირთება...' : 'დამატება'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}