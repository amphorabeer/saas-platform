'use client'

import { useState, useEffect } from 'react'
import { 
  Package, 
  Tag, 
  CircleDot,
  Plus,
  Minus,
  History,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Truck,
  Trash2,
  Edit,
  MoreVertical
} from 'lucide-react'

// Types
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
    recipeId?: string
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

// Ledger type translations
const ledgerTypeLabels: Record<string, { label: string; color: string; icon: any }> = {
  PURCHASE: { label: 'შესყიდვა', color: 'text-success', icon: ArrowUpRight },
  CONSUMPTION: { label: 'გამოყენება', color: 'text-danger', icon: ArrowDownRight },
  PRODUCTION: { label: 'წარმოება', color: 'text-primary', icon: Package },
  ADJUSTMENT: { label: 'კორექცია', color: 'text-warning', icon: Edit },
  ADJUSTMENT_ADD: { label: 'დამატება', color: 'text-success', icon: Plus },
  ADJUSTMENT_REMOVE: { label: 'ჩამოწერა', color: 'text-danger', icon: Minus },
  WASTE: { label: 'დანაკარგი', color: 'text-danger', icon: Trash2 },
  SALE: { label: 'გაყიდვა', color: 'text-info', icon: Truck },
  RETURN: { label: 'დაბრუნება', color: 'text-warning', icon: RefreshCw },
  REVERSAL: { label: 'გაუქმება', color: 'text-muted', icon: X },
  TRANSFER: { label: 'ტრანსფერი', color: 'text-primary', icon: ArrowUpRight },
}

// Category config
const categoryConfig = {
  bottles: { 
    label: 'ბოთლები', 
    icon: Package, 
    color: 'from-blue-500/20 to-blue-600/10',
    borderColor: 'border-blue-500/30'
  },
  labels: { 
    label: 'ეტიკეტები', 
    icon: Tag, 
    color: 'from-purple-500/20 to-purple-600/10',
    borderColor: 'border-purple-500/30'
  },
  caps: { 
    label: 'თავსახურები', 
    icon: CircleDot, 
    color: 'from-amber-500/20 to-amber-600/10',
    borderColor: 'border-amber-500/30'
  },
}

export default function PackagingMaterialsPage() {
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
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [history, setHistory] = useState<LedgerEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [showAdjustModal, setShowAdjustModal] = useState(false)
  const [adjustType, setAdjustType] = useState<'add' | 'remove'>('add')
  const [adjustQuantity, setAdjustQuantity] = useState('')
  const [adjustNotes, setAdjustNotes] = useState('')
  const [adjusting, setAdjusting] = useState(false)
  const [activeCategory, setActiveCategory] = useState<'all' | 'bottles' | 'labels' | 'caps'>('all')

  // Fetch all packaging materials
  const fetchItems = async () => {
    setLoading(true)
    try {
      // Fetch bottles
      const bottleRes = await fetch('/api/inventory?category=BOTTLE')
      const bottleData = bottleRes.ok ? await bottleRes.json() : { items: [] }
      
      // Fetch labels
      const labelRes = await fetch('/api/inventory?category=LABEL')
      const labelData = labelRes.ok ? await labelRes.json() : { items: [] }
      
      // Fetch caps (from PACKAGING category with type filter)
      const capsRes = await fetch('/api/inventory?category=PACKAGING')
      const capsData = capsRes.ok ? await capsRes.json() : { items: [] }
      
      // Filter caps
      const caps = (capsData.items || []).filter((i: any) => 
        i.metadata?.type === 'cap' || 
        i.name?.toLowerCase().includes('თავსახური') ||
        i.name?.toLowerCase().includes('cap')
      )
      
      // Filter labels (exclude non-labels from LABEL category)
      const labels = (labelData.items || []).filter((i: any) => {
        const name = i.name?.toLowerCase() || ''
        if (name.includes('ბოთლი') || name.includes('bottle')) return false
        if (name.includes('თავსახური') || name.includes('cap')) return false
        return true
      })
      
      setItems({
        bottles: bottleData.items || [],
        labels: labels,
        caps: caps,
      })
    } catch (error) {
      console.error('Failed to fetch items:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch item history
  const fetchHistory = async (itemId: string) => {
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

  // Open history modal
  const openHistory = (item: InventoryItem) => {
    setSelectedItem(item)
    setShowHistoryModal(true)
    fetchHistory(item.id)
  }

  // Open adjust modal
  const openAdjust = (item: InventoryItem, type: 'add' | 'remove') => {
    setSelectedItem(item)
    setAdjustType(type)
    setAdjustQuantity('')
    setAdjustNotes('')
    setShowAdjustModal(true)
  }

  // Submit adjustment
  const submitAdjustment = async () => {
    if (!selectedItem || !adjustQuantity) return
    
    setAdjusting(true)
    try {
      const quantity = parseInt(adjustQuantity)
      const newQuantity = adjustType === 'add' 
        ? selectedItem.quantity + quantity
        : selectedItem.quantity - quantity

      const res = await fetch(`/api/inventory/${selectedItem.id}`, {
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
        fetchItems() // Refresh
      } else {
        alert('კორექცია ვერ მოხერხდა')
      }
    } catch (error) {
      console.error('Adjustment failed:', error)
      alert('კორექცია ვერ მოხერხდა')
    } finally {
      setAdjusting(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [])

  // Render item card
  const renderItemCard = (item: InventoryItem, category: 'bottles' | 'labels' | 'caps') => {
    const config = categoryConfig[category]
    const isLow = item.reorderPoint && item.quantity <= item.reorderPoint
    
    return (
      <div
        key={item.id}
        className={`bg-gradient-to-br ${config.color} border ${config.borderColor} rounded-xl p-4 hover:shadow-lg transition-all`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <config.icon className="w-5 h-5 text-text-secondary" />
            <h3 className="font-medium text-text-primary">{item.name}</h3>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => openHistory(item)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              title="ისტორია"
            >
              <History className="w-4 h-4 text-text-secondary" />
            </button>
          </div>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-bold text-text-primary">
              {item.quantity.toLocaleString()}
            </p>
            <p className="text-sm text-text-muted">{item.unit}</p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => openAdjust(item, 'remove')}
              className="p-2 rounded-lg bg-danger/20 text-danger hover:bg-danger/30 transition-colors"
              title="ჩამოწერა"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              onClick={() => openAdjust(item, 'add')}
              className="p-2 rounded-lg bg-success/20 text-success hover:bg-success/30 transition-colors"
              title="დამატება"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isLow && (
          <div className="mt-3 flex items-center gap-2 text-warning text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>დაბალი მარაგი (მინ: {item.reorderPoint})</span>
          </div>
        )}
      </div>
    )
  }

  // Render category section
  const renderCategory = (category: 'bottles' | 'labels' | 'caps') => {
    const config = categoryConfig[category]
    const categoryItems = items[category]
    
    if (activeCategory !== 'all' && activeCategory !== category) return null
    if (categoryItems.length === 0) return null

    return (
      <div key={category} className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <config.icon className="w-6 h-6 text-text-secondary" />
          <h2 className="text-xl font-semibold text-text-primary">{config.label}</h2>
          <span className="px-2 py-0.5 rounded-full bg-bg-tertiary text-text-muted text-sm">
            {categoryItems.length}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {categoryItems.map(item => renderItemCard(item, category))}
        </div>
      </div>
    )
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

  return (
    <div className="min-h-screen bg-bg-primary p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">შეფუთვის მასალები</h1>
          <p className="text-text-muted">ბოთლები, ეტიკეტები, თავსახურები</p>
        </div>
        <button
          onClick={fetchItems}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-card border border-border hover:border-primary transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          განახლება
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        {(['all', 'bottles', 'labels', 'caps'] as const).map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeCategory === cat
                ? 'bg-primary text-white'
                : 'bg-bg-card border border-border text-text-secondary hover:border-primary'
            }`}
          >
            {cat === 'all' ? 'ყველა' : categoryConfig[cat].label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Package className="w-8 h-8 text-blue-400" />
                <div>
                  <p className="text-text-muted text-sm">ბოთლები</p>
                  <p className="text-2xl font-bold text-text-primary">
                    {items.bottles.reduce((sum, i) => sum + i.quantity, 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Tag className="w-8 h-8 text-purple-400" />
                <div>
                  <p className="text-text-muted text-sm">ეტიკეტები</p>
                  <p className="text-2xl font-bold text-text-primary">
                    {items.labels.reduce((sum, i) => sum + i.quantity, 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <CircleDot className="w-8 h-8 text-amber-400" />
                <div>
                  <p className="text-text-muted text-sm">თავსახურები</p>
                  <p className="text-2xl font-bold text-text-primary">
                    {items.caps.reduce((sum, i) => sum + i.quantity, 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Items by category */}
          {renderCategory('bottles')}
          {renderCategory('labels')}
          {renderCategory('caps')}

          {/* Empty state */}
          {items.bottles.length === 0 && items.labels.length === 0 && items.caps.length === 0 && (
            <div className="text-center py-20">
              <Package className="w-16 h-16 text-text-muted mx-auto mb-4" />
              <p className="text-text-muted">შეფუთვის მასალები არ მოიძებნა</p>
            </div>
          )}
        </>
      )}

      {/* History Modal */}
      {showHistoryModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowHistoryModal(false)} />
          <div className="relative bg-bg-secondary border border-border rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">{selectedItem.name}</h2>
                <p className="text-sm text-text-muted">მოძრაობის ისტორია</p>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-2 rounded-lg hover:bg-bg-tertiary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Stock */}
            <div className="p-4 bg-bg-tertiary border-b border-border">
              <div className="flex items-center justify-between">
                <span className="text-text-muted">მიმდინარე მარაგი:</span>
                <span className="text-2xl font-bold text-text-primary">
                  {selectedItem.quantity.toLocaleString()} {selectedItem.unit}
                </span>
              </div>
            </div>

            {/* History List */}
            <div className="overflow-y-auto max-h-[50vh]">
              {historyLoading ? (
                <div className="flex items-center justify-center py-10">
                  <RefreshCw className="w-6 h-6 text-primary animate-spin" />
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
                          <div className={`p-2 rounded-lg ${isPositive ? 'bg-success/20' : 'bg-danger/20'}`}>
                            <IconComponent className={`w-4 h-4 ${typeInfo.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className={`font-medium ${typeInfo.color}`}>
                                {typeInfo.label}
                              </span>
                              <span className={`font-bold ${isPositive ? 'text-success' : 'text-danger'}`}>
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
            </div>
          </div>
        </div>
      )}

      {/* Adjust Modal */}
      {showAdjustModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowAdjustModal(false)} />
          <div className="relative bg-bg-secondary border border-border rounded-2xl w-full max-w-md overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold text-text-primary">
                {adjustType === 'add' ? 'მარაგის დამატება' : 'მარაგის ჩამოწერა'}
              </h2>
              <button
                onClick={() => setShowAdjustModal(false)}
                className="p-2 rounded-lg hover:bg-bg-tertiary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 space-y-4">
              <div className="bg-bg-tertiary rounded-lg p-3">
                <p className="text-sm text-text-muted">პროდუქტი</p>
                <p className="font-medium text-text-primary">{selectedItem.name}</p>
                <p className="text-sm text-text-secondary mt-1">
                  მიმდინარე მარაგი: {selectedItem.quantity} {selectedItem.unit}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  რაოდენობა
                </label>
                <input
                  type="number"
                  value={adjustQuantity}
                  onChange={(e) => setAdjustQuantity(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-bg-card border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  placeholder="0"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  შენიშვნა (არასავალდებულო)
                </label>
                <textarea
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-bg-card border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
                  rows={2}
                  placeholder="მიზეზი..."
                />
              </div>

              {adjustQuantity && (
                <div className={`p-3 rounded-lg ${adjustType === 'add' ? 'bg-success/20' : 'bg-danger/20'}`}>
                  <p className="text-sm">
                    ახალი მარაგი: {' '}
                    <span className="font-bold">
                      {adjustType === 'add'
                        ? selectedItem.quantity + parseInt(adjustQuantity || '0')
                        : selectedItem.quantity - parseInt(adjustQuantity || '0')
                      } {selectedItem.unit}
                    </span>
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center gap-3 p-4 border-t border-border">
              <button
                onClick={() => setShowAdjustModal(false)}
                className="flex-1 px-4 py-2 rounded-lg bg-bg-tertiary text-text-secondary hover:bg-bg-card transition-colors"
              >
                გაუქმება
              </button>
              <button
                onClick={submitAdjustment}
                disabled={!adjustQuantity || adjusting}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                  adjustType === 'add'
                    ? 'bg-success text-white hover:bg-success/80'
                    : 'bg-danger text-white hover:bg-danger/80'
                }`}
              >
                {adjusting ? 'იტვირთება...' : adjustType === 'add' ? 'დამატება' : 'ჩამოწერა'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
