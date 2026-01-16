'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout'
import { Card, CardHeader, CardBody, Button } from '@/components/ui'
import { 
  Package, 
  Tag, 
  CircleDot,
  ArrowLeft,
  Edit,
  Trash2,
  Plus,
  Minus,
  History,
  ArrowUpRight,
  ArrowDownRight,
  X,
  RefreshCw,
  AlertTriangle,
  Clock,
  Truck,
  Save,
  Eye
} from 'lucide-react'

// Types
interface Recipe {
  id: string
  name: string
  style?: string
}

interface InventoryItem {
  id: string
  name: string
  sku: string
  category: string
  unit: string
  quantity: number
  reorderPoint: number | null
  supplier?: string
  costPerUnit?: number
  createdAt?: string
  updatedAt?: string
  metadata?: {
    type?: string
    size?: string
    recipeIds?: string[]
  }
}

interface LedgerEntry {
  id: string
  date: string
  type: string
  quantity: number
  notes: string | null
  createdBy: string
  batchNumber: string | null
  batchId: string | null
}

// Ledger type config
const ledgerTypeLabels: Record<string, { label: string; color: string; icon: any }> = {
  PURCHASE: { label: 'შესყიდვა', color: 'text-green-400', icon: ArrowUpRight },
  CONSUMPTION: { label: 'გამოყენება', color: 'text-red-400', icon: ArrowDownRight },
  PRODUCTION: { label: 'წარმოება', color: 'text-blue-400', icon: Package },
  ADJUSTMENT: { label: 'კორექცია', color: 'text-amber-400', icon: Edit },
  ADJUSTMENT_ADD: { label: 'დამატება', color: 'text-green-400', icon: Plus },
  ADJUSTMENT_REMOVE: { label: 'ჩამოწერა', color: 'text-red-400', icon: Minus },
  WASTE: { label: 'დანაკარგი', color: 'text-red-400', icon: Trash2 },
  SALE: { label: 'გაყიდვა', color: 'text-cyan-400', icon: Truck },
  RETURN: { label: 'დაბრუნება', color: 'text-amber-400', icon: RefreshCw },
  REVERSAL: { label: 'გაუქმება', color: 'text-slate-400', icon: X },
  TRANSFER: { label: 'ტრანსფერი', color: 'text-blue-400', icon: ArrowUpRight },
}

// Get icon for item type
const getItemIcon = (category?: string, metadata?: any) => {
  const type = metadata?.type || ''
  const cat = (category || '').toLowerCase()
  if (cat === 'label' || type === 'label') return Tag
  if (type === 'cap' || cat.includes('cap')) return CircleDot
  return Package
}

const getItemColor = (category?: string, metadata?: any) => {
  const type = metadata?.type || ''
  const cat = (category || '').toLowerCase()
  if (cat === 'label' || type === 'label') return 'text-purple-400'
  if (type === 'cap' || cat.includes('cap')) return 'text-amber-400'
  return 'text-blue-400'
}

export default function PackagingMaterialDetailPage() {
  const router = useRouter()
  const params = useParams()
  const itemId = params.id as string

  const [item, setItem] = useState<InventoryItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'movement'>('overview')
  
  // History state
  const [history, setHistory] = useState<LedgerEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  
  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    size: '',
    reorderPoint: '',
    selectedRecipes: [] as string[],
  })
  const [saving, setSaving] = useState(false)
  
  // Sync editForm when modal opens
  useEffect(() => {
    if (showEditModal && item) {
      const formData = {
        name: item.name || '',
        size: item.metadata?.size || '',
        reorderPoint: item.reorderPoint ? String(item.reorderPoint) : '',
        selectedRecipes: Array.isArray(item.metadata?.recipeIds) ? item.metadata.recipeIds : [],
      }
      console.log('[PackagingDetail] Syncing editForm on modal open:', formData)
      setEditForm(formData)
    }
  }, [showEditModal, item])
  
  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  
  // Adjust modal state
  const [showAdjustModal, setShowAdjustModal] = useState(false)
  const [adjustType, setAdjustType] = useState<'add' | 'remove'>('add')
  const [adjustQuantity, setAdjustQuantity] = useState('')
  const [adjustNotes, setAdjustNotes] = useState('')
  const [adjusting, setAdjusting] = useState(false)

  // Fetch item with balance from ledger API
  const fetchItem = async () => {
    setLoading(true)
    try {
      // First try ledger API which returns correct cachedBalance
      const ledgerRes = await fetch(`/api/inventory/${itemId}/ledger`)
      if (ledgerRes.ok) {
        const ledgerData = await ledgerRes.json()
        console.log('[PackagingDetail] Ledger API full response:', ledgerData)
        
        // API returns {item: {..., quantity: cachedBalance}, history OR ledger: [...]}
        if (ledgerData.item) {
          // Get full item details from regular API for metadata
          const itemRes = await fetch(`/api/inventory/${itemId}`)
          const itemDataRaw = itemRes.ok ? await itemRes.json() : {}
          // API may return {item: {...}} or just {...}
          const itemData = itemDataRaw.item || itemDataRaw
          
          console.log('[PackagingDetail] Item details:', itemData)
          console.log('[PackagingDetail] Item metadata:', itemData.metadata)
          console.log('[PackagingDetail] Using quantity from ledger API item:', ledgerData.item.quantity)
          
          setItem({
            id: ledgerData.item.id,
            name: ledgerData.item.name || itemData.name || '',
            sku: ledgerData.item.sku || itemData.sku || '',
            category: ledgerData.item.category || itemData.category || '',
            unit: ledgerData.item.unit || itemData.unit || 'ცალი',
            quantity: ledgerData.item.quantity ?? 0, // This is cachedBalance from DB!
            reorderPoint: ledgerData.item.reorderPoint ?? itemData.reorderPoint,
            supplier: itemData.supplier,
            costPerUnit: itemData.costPerUnit,
            createdAt: itemData.createdAt,
            updatedAt: itemData.updatedAt,
            metadata: itemData.metadata || {},
          })
          
          // History could be in 'history' or 'ledger' field
          const historyEntries = ledgerData.history || ledgerData.ledger || []
          setHistory(historyEntries)
          setLoading(false)
          return
        }
      }
      
      // Fallback: use regular item API
      const res = await fetch(`/api/inventory/${itemId}`)
      if (res.ok) {
        const dataRaw = await res.json()
        // API may return {item: {...}} or just {...}
        const data = dataRaw.item || dataRaw
        console.log('[PackagingDetail] Fallback - item API response:', data)
        console.log('[PackagingDetail] Fallback - metadata:', data.metadata)
        
        // Try to get quantity from various fields
        const qty = data.quantity ?? data.cachedBalance ?? data.balance ?? 0
        
        setItem({
          id: data.id,
          name: data.name || '',
          sku: data.sku || '',
          category: data.category || '',
          unit: data.unit || 'ცალი',
          quantity: qty,
          reorderPoint: data.reorderPoint,
          supplier: data.supplier,
          costPerUnit: data.costPerUnit,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          metadata: data.metadata || {},
        })
      } else {
        setNotFound(true)
      }
    } catch (error) {
      console.error('Failed to fetch item:', error)
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }

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

  // Fetch history (if not already loaded)
  const fetchHistory = async () => {
    if (history.length > 0) return // Already loaded with item
    
    setHistoryLoading(true)
    try {
      const res = await fetch(`/api/inventory/${itemId}/ledger`)
      if (res.ok) {
        const data = await res.json()
        setHistory(data.history || [])
      }
    } catch (error) {
      console.error('Failed to fetch history:', error)
    } finally {
      setHistoryLoading(false)
    }
  }

  // Open edit modal
  const openEditModal = () => {
    if (!item) {
      console.log('[PackagingDetail] Cannot open edit modal - item is null')
      return
    }
    
    const formData = {
      name: item.name || '',
      size: item.metadata?.size || '',
      reorderPoint: item.reorderPoint ? String(item.reorderPoint) : '',
      selectedRecipes: Array.isArray(item.metadata?.recipeIds) ? item.metadata.recipeIds : [],
    }
    
    console.log('[PackagingDetail] Opening edit modal with item:', item)
    console.log('[PackagingDetail] Setting editForm to:', formData)
    
    setEditForm(formData)
    setShowEditModal(true)
  }

  // Toggle recipe selection
  const toggleRecipe = (recipeId: string) => {
    setEditForm(prev => ({
      ...prev,
      selectedRecipes: prev.selectedRecipes.includes(recipeId)
        ? prev.selectedRecipes.filter(id => id !== recipeId)
        : [...prev.selectedRecipes, recipeId]
    }))
  }

  // Submit edit
  const submitEdit = async () => {
    if (!item || !editForm.name) return
    
    setSaving(true)
    try {
      const payload = {
        name: editForm.name,
        reorderPoint: editForm.reorderPoint ? parseInt(editForm.reorderPoint) : null,
        metadata: {
          ...item.metadata,
          size: editForm.size,
          recipeIds: editForm.selectedRecipes,
        },
      }
      
      const res = await fetch(`/api/inventory/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      
      if (res.ok) {
        setShowEditModal(false)
        fetchItem()
      } else {
        const error = await res.json()
        alert(error.error || 'შენახვა ვერ მოხერხდა')
      }
    } catch (error) {
      console.error('Failed to update item:', error)
      alert('შენახვა ვერ მოხერხდა')
    } finally {
      setSaving(false)
    }
  }

  // Delete item
  const deleteItem = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/inventory/${itemId}`, {
        method: 'DELETE',
      })
      
      if (res.ok) {
        router.push('/inventory?tab=packaging')
      } else {
        const error = await res.json()
        alert(error.error || 'წაშლა ვერ მოხერხდა')
      }
    } catch (error) {
      console.error('Failed to delete item:', error)
      alert('წაშლა ვერ მოხერხდა')
    } finally {
      setDeleting(false)
    }
  }

  // Open adjust modal
  const openAdjust = (type: 'add' | 'remove') => {
    setAdjustType(type)
    setAdjustQuantity('')
    setAdjustNotes('')
    setShowAdjustModal(true)
  }

  // Submit adjustment
  const submitAdjustment = async () => {
    if (!item || !adjustQuantity) return
    
    setAdjusting(true)
    try {
      const quantity = parseInt(adjustQuantity)
      const newQuantity = adjustType === 'add' 
        ? item.quantity + quantity
        : Math.max(0, item.quantity - quantity)

      const res = await fetch(`/api/inventory/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: newQuantity,
          type: adjustType === 'add' ? 'ADJUSTMENT_ADD' : 'ADJUSTMENT_REMOVE',
          notes: adjustNotes || (adjustType === 'add' ? 'მარაგის დამატება' : 'მარაგის ჩამოწერა'),
        }),
      })

      if (res.ok) {
        setShowAdjustModal(false)
        fetchItem()
        if (activeTab === 'movement') {
          fetchHistory()
        }
      } else {
        const error = await res.json()
        alert(error.error || 'კორექცია ვერ მოხერხდა')
      }
    } catch (error) {
      console.error('Adjustment failed:', error)
      alert('კორექცია ვერ მოხერხდა')
    } finally {
      setAdjusting(false)
    }
  }

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('ka-GE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Get recipe names
  const getRecipeNames = (): string[] => {
    const recipeIds = item?.metadata?.recipeIds || []
    return recipeIds
      .map(id => recipes.find(r => r.id === id)?.name)
      .filter(Boolean) as string[]
  }

  useEffect(() => {
    fetchItem()
    fetchRecipes()
  }, [itemId])

  useEffect(() => {
    if (activeTab === 'movement' && item) {
      fetchHistory()
    }
  }, [activeTab, item])

  // Redirect if not found
  useEffect(() => {
    if (notFound && !loading) {
      router.push('/inventory?tab=packaging')
    }
  }, [notFound, loading, router])

  if (loading || notFound) {
    return (
      <DashboardLayout title="იტვირთება..." breadcrumb="მთავარი / მარაგები / შესაფუთი მასალები">
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 text-copper animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  if (!item) {
    return (
      <DashboardLayout title="არ მოიძებნა" breadcrumb="მთავარი / მარაგები / შესაფუთი მასალები">
        <div className="text-center py-20">
          <Package className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <p className="text-text-muted">მასალა არ მოიძებნა</p>
          <Button variant="secondary" className="mt-4" onClick={() => router.push('/inventory?tab=packaging')}>
            უკან დაბრუნება
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  const ItemIcon = getItemIcon(item.category, item.metadata)
  const itemColor = getItemColor(item.category, item.metadata)
  const isLow = item.reorderPoint && item.quantity <= item.reorderPoint
  const recipeNames = getRecipeNames()

  return (
    <DashboardLayout 
      title={item.name} 
      breadcrumb={`მთავარი / მარაგები / შესაფუთი მასალები / ${item.name}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/inventory?tab=packaging')}
            className="p-2 rounded-lg hover:bg-bg-tertiary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl bg-bg-tertiary`}>
              <ItemIcon className={`w-8 h-8 ${itemColor}`} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">{item.name}</h1>
              {item.metadata?.size && (
                <p className="text-text-muted">{item.metadata.size}</p>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => openAdjust('add')}>
            <Plus className="w-4 h-4 mr-1" />
            დამატება
          </Button>
          <Button variant="secondary" size="sm" onClick={() => openAdjust('remove')}>
            <Minus className="w-4 h-4 mr-1" />
            ჩამოწერა
          </Button>
          <Button variant="primary" size="sm" onClick={openEditModal}>
            <Edit className="w-4 h-4 mr-1" />
            რედაქტირება
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
            activeTab === 'overview' 
              ? 'bg-copper text-white' 
              : 'bg-bg-tertiary hover:bg-slate-600 text-text-secondary'
          }`}
        >
          <Eye className="w-4 h-4" />
          მიმოხილვა
        </button>
        <button
          onClick={() => setActiveTab('movement')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
            activeTab === 'movement' 
              ? 'bg-copper text-white' 
              : 'bg-bg-tertiary hover:bg-slate-600 text-text-secondary'
          }`}
        >
          <History className="w-4 h-4" />
          მოძრაობა
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="col-span-2 space-y-6">
            {/* Stock Card */}
            <Card>
              <CardHeader>მარაგი</CardHeader>
              <CardBody>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-4xl font-bold text-text-primary">{item.quantity.toLocaleString()}</p>
                    <p className="text-text-muted">{item.unit}</p>
                  </div>
                  {isLow && (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/20 text-amber-400">
                      <AlertTriangle className="w-5 h-5" />
                      <span>დაბალი მარაგი (მინ: {item.reorderPoint})</span>
                    </div>
                  )}
                </div>
                {item.reorderPoint && (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-text-muted">მინიმალური მარაგი</span>
                      <span>{item.reorderPoint}</span>
                    </div>
                    <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          item.quantity <= item.reorderPoint * 0.5 
                            ? 'bg-red-500' 
                            : item.quantity <= item.reorderPoint 
                              ? 'bg-amber-500' 
                              : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(100, (item.quantity / (item.reorderPoint * 2)) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Recipes */}
            <Card>
              <CardHeader>მიბმული რეცეპტები</CardHeader>
              <CardBody>
                {recipeNames.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {recipeNames.map((name, idx) => (
                      <span 
                        key={idx}
                        className="px-3 py-1.5 rounded-full bg-copper/20 text-copper-light"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-text-muted">რეცეპტები არ არის მიბმული</p>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Side Info */}
          <div className="space-y-6">
            {/* Details Card */}
            <Card>
              <CardHeader>დეტალები</CardHeader>
              <CardBody className="space-y-4">
                <div>
                  <p className="text-xs text-text-muted">SKU</p>
                  <p className="font-mono">{item.sku}</p>
                </div>
                <div>
                  <p className="text-xs text-text-muted">კატეგორია</p>
                  <p>{item.category}</p>
                </div>
                {item.metadata?.size && (
                  <div>
                    <p className="text-xs text-text-muted">ზომა</p>
                    <p>{item.metadata.size}</p>
                  </div>
                )}
                {item.supplier && (
                  <div>
                    <p className="text-xs text-text-muted">მომწოდებელი</p>
                    <p>{item.supplier}</p>
                  </div>
                )}
                {item.costPerUnit && (
                  <div>
                    <p className="text-xs text-text-muted">ფასი (ერთეული)</p>
                    <p>{item.costPerUnit} ₾</p>
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>მოქმედებები</CardHeader>
              <CardBody className="space-y-2">
                <button
                  onClick={openEditModal}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-bg-tertiary transition-colors text-left"
                >
                  <Edit className="w-5 h-5 text-text-muted" />
                  <span>რედაქტირება</span>
                </button>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-500/10 transition-colors text-left text-red-400"
                >
                  <Trash2 className="w-5 h-5" />
                  <span>წაშლა</span>
                </button>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {/* Movement Tab */}
      {activeTab === 'movement' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <History className="w-5 h-5" />
              მოძრაობის ისტორია
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {historyLoading ? (
              <div className="flex items-center justify-center py-10">
                <RefreshCw className="w-6 h-6 text-copper animate-spin" />
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-10">
                <History className="w-12 h-12 text-text-muted mx-auto mb-3" />
                <p className="text-text-muted">ისტორია არ მოიძებნა</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {history.map((entry) => {
                  const typeInfo = ledgerTypeLabels[entry.type] || { 
                    label: entry.type, 
                    color: 'text-text-muted', 
                    icon: Clock 
                  }
                  const IconComponent = typeInfo.icon
                  const isPositive = ['PURCHASE', 'ADJUSTMENT_ADD', 'RETURN', 'PRODUCTION'].includes(entry.type)
                  
                  return (
                    <div key={entry.id} className="p-4 hover:bg-bg-tertiary/50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${isPositive ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                          <IconComponent className={`w-4 h-4 ${typeInfo.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`font-medium ${typeInfo.color}`}>
                              {typeInfo.label}
                            </span>
                            <span className={`font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                              {isPositive ? '+' : '-'}{Math.abs(entry.quantity)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-sm text-text-muted">
                            <Clock className="w-3 h-3" />
                            {formatDate(entry.date)}
                          </div>
                          {entry.batchNumber && (
                            <div className="mt-1 text-sm text-text-secondary">
                              ბეჩი: {entry.batchNumber}
                            </div>
                          )}
                          {entry.notes && (
                            <div className="mt-1 text-sm text-text-muted">
                              {entry.notes}
                            </div>
                          )}
                          <div className="mt-1 text-xs text-text-muted">
                            {entry.createdBy}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowEditModal(false)} />
          <div className="relative bg-bg-secondary border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">რედაქტირება</h2>
                <p className="text-xs text-text-muted">ID: {item?.id}</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="p-2 rounded-lg hover:bg-bg-tertiary">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">დასახელება *</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg bg-bg-card border border-border focus:border-copper outline-none"
                  placeholder={item?.name || 'სახელი'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">ზომა</label>
                <select
                  value={editForm.size}
                  onChange={(e) => setEditForm(prev => ({ ...prev, size: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg bg-bg-card border border-border focus:border-copper outline-none"
                >
                  <option value="">აირჩიეთ ზომა</option>
                  {/* Show all options - user can select appropriate one */}
                  <optgroup label="ბოთლები">
                    <option value="500ml">500ml ბოთლი</option>
                    <option value="330ml">330ml ბოთლი</option>
                    <option value="750ml">750ml (ღვინის ბოთლი)</option>
                    <option value="1L">1L ბოთლი</option>
                  </optgroup>
                  <optgroup label="ქილები">
                    <option value="500ml_can">500ml ქილა</option>
                    <option value="330ml_can">330ml ქილა</option>
                  </optgroup>
                  <optgroup label="ეტიკეტები">
                    <option value="label_500ml">500ml ბოთლისთვის</option>
                    <option value="label_330ml">330ml ბოთლისთვის</option>
                    <option value="label_can">ქილისთვის</option>
                  </optgroup>
                  <optgroup label="თავსახურები">
                    <option value="26mm">26mm</option>
                    <option value="29mm">29mm</option>
                    <option value="38mm">38mm</option>
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">მინ. მარაგი</label>
                <input
                  type="number"
                  value={editForm.reorderPoint}
                  onChange={(e) => setEditForm(prev => ({ ...prev, reorderPoint: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg bg-bg-card border border-border focus:border-copper outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">რეცეპტები</label>
                <div className="bg-bg-card border border-border rounded-lg max-h-48 overflow-y-auto">
                  {recipes.length === 0 ? (
                    <div className="p-4 text-center text-text-muted text-sm">რეცეპტები არ მოიძებნა</div>
                  ) : (
                    recipes.map(recipe => (
                      <label key={recipe.id} className="flex items-center gap-3 px-4 py-2 hover:bg-bg-tertiary cursor-pointer border-b border-border/50 last:border-0">
                        <input
                          type="checkbox"
                          checked={editForm.selectedRecipes.includes(recipe.id)}
                          onChange={() => toggleRecipe(recipe.id)}
                          className="w-4 h-4 rounded border-border text-copper"
                        />
                        <span className="text-sm">{recipe.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 border-t border-border">
              <button onClick={() => setShowEditModal(false)} className="flex-1 px-4 py-2 rounded-lg bg-bg-tertiary">
                გაუქმება
              </button>
              <button
                onClick={submitEdit}
                disabled={!editForm.name || saving}
                className="flex-1 px-4 py-2 rounded-lg bg-copper text-white font-medium disabled:opacity-50"
              >
                {saving ? 'იტვირთება...' : 'შენახვა'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)} />
          <div className="relative bg-bg-secondary border border-border rounded-2xl w-full max-w-md">
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-400" />
              </div>
              <h2 className="text-xl font-semibold text-text-primary mb-2">წაშლა</h2>
              <p className="text-text-muted mb-6">
                დარწმუნებული ხართ რომ გსურთ <strong>{item.name}</strong>-ის წაშლა?
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg bg-bg-tertiary"
                >
                  გაუქმება
                </button>
                <button
                  onClick={deleteItem}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white font-medium disabled:opacity-50"
                >
                  {deleting ? 'იშლება...' : 'წაშლა'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowAdjustModal(false)} />
          <div className="relative bg-bg-secondary border border-border rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold">
                {adjustType === 'add' ? '➕ მარაგის დამატება' : '➖ მარაგის ჩამოწერა'}
              </h2>
              <button onClick={() => setShowAdjustModal(false)} className="p-2 rounded-lg hover:bg-bg-tertiary">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="bg-bg-tertiary rounded-lg p-3">
                <p className="text-sm text-text-muted">მიმდინარე მარაგი</p>
                <p className="text-xl font-bold">{item.quantity.toLocaleString()} {item.unit}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">რაოდენობა</label>
                <input
                  type="number"
                  value={adjustQuantity}
                  onChange={(e) => setAdjustQuantity(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-bg-card border border-border focus:border-copper outline-none"
                  placeholder="0"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">შენიშვნა</label>
                <textarea
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-bg-card border border-border focus:border-copper outline-none resize-none"
                  rows={2}
                  placeholder="მიზეზი..."
                />
              </div>

              {adjustQuantity && (
                <div className={`p-3 rounded-lg ${adjustType === 'add' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                  <p className="text-sm">
                    ახალი მარაგი: {' '}
                    <span className="font-bold">
                      {adjustType === 'add'
                        ? (item.quantity + parseInt(adjustQuantity || '0')).toLocaleString()
                        : Math.max(0, item.quantity - parseInt(adjustQuantity || '0')).toLocaleString()
                      } {item.unit}
                    </span>
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 p-4 border-t border-border">
              <button onClick={() => setShowAdjustModal(false)} className="flex-1 px-4 py-2 rounded-lg bg-bg-tertiary">
                გაუქმება
              </button>
              <button
                onClick={submitAdjustment}
                disabled={!adjustQuantity || adjusting}
                className={`flex-1 px-4 py-2 rounded-lg font-medium disabled:opacity-50 ${
                  adjustType === 'add' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                }`}
              >
                {adjusting ? 'იტვირთება...' : adjustType === 'add' ? 'დამატება' : 'ჩამოწერა'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
