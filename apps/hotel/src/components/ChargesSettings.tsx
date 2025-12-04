'use client'

import React, { useState, useEffect } from 'react'
import { ExtraChargesService } from '../services/ExtraChargesService'

export default function ChargesSettings({ defaultTab }: { defaultTab?: string }) {
  const [activeTab, setActiveTab] = useState(defaultTab || 'items')
  const [categories, setCategories] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [editingItem, setEditingItem] = useState<any>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  
  useEffect(() => {
    loadSettings()
  }, [])

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab)
    }
  }, [defaultTab])
  
  const loadSettings = () => {
    if (typeof window === 'undefined') return
    
    // Load from localStorage or use defaults
    const savedCategories = localStorage.getItem('chargeCategories')
    const savedItems = localStorage.getItem('chargeItems')
    
    if (savedCategories) {
      setCategories(JSON.parse(savedCategories))
    } else {
      const defaultCategories = ExtraChargesService.CATEGORIES
      setCategories(defaultCategories)
      localStorage.setItem('chargeCategories', JSON.stringify(defaultCategories))
    }
    
    if (savedItems) {
      setItems(JSON.parse(savedItems))
    } else {
      const defaultItems = ExtraChargesService.ITEMS
      setItems(defaultItems)
      localStorage.setItem('chargeItems', JSON.stringify(defaultItems))
    }
  }
  
  const saveItem = (item: any) => {
    if (!item.name || !item.code) {
      alert('გთხოვთ შეიყვანოთ Name და Code')
      return
    }
    
    let updatedItems = [...items]
    
    if (item.id) {
      // Update existing
      const index = updatedItems.findIndex(i => i.id === item.id)
      if (index >= 0) {
        updatedItems[index] = item
      }
    } else {
      // Add new
      item.id = `ITEM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      updatedItems.push(item)
    }
    
    setItems(updatedItems)
    localStorage.setItem('chargeItems', JSON.stringify(updatedItems))
    setEditingItem(null)
    setShowAddModal(false)
  }
  
  const deleteItem = (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return
    
    const updatedItems = items.filter(i => i.id !== id)
    setItems(updatedItems)
    localStorage.setItem('chargeItems', JSON.stringify(updatedItems))
  }
  
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.code?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !categoryFilter || item.categoryId === categoryFilter
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && item.available) ||
                         (statusFilter === 'inactive' && !item.available)
    return matchesSearch && matchesCategory && matchesStatus
  })
  
  return (
    <div className="p-6 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">⚙️ Charges Settings</h1>
            <p className="text-gray-600 mt-1">Manage items, prices, and categories</p>
          </div>
          <button
            onClick={() => {
              setEditingItem(null)
              setShowAddModal(true)
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            + Add New Item
          </button>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-lg">
        <div className="border-b">
          <div className="flex overflow-x-auto">
            {['items', 'categories', 'taxes', 'quick'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 capitalize font-medium whitespace-nowrap transition ${
                  activeTab === tab
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {tab === 'items' && '📦 Items & Prices'}
                {tab === 'categories' && '📂 Categories'}
                {tab === 'taxes' && '💰 Taxes & Fees'}
                {tab === 'quick' && '⚡ Quick Buttons'}
              </button>
            ))}
          </div>
        </div>
        
        {/* Items Tab */}
        {activeTab === 'items' && (
          <div className="p-6">
            {/* Search & Filter */}
            <div className="flex gap-4 mb-6 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  placeholder="🔍 Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full border rounded-lg px-4 py-2"
                />
              </div>
              <select 
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="border rounded-lg px-4 py-2"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border rounded-lg px-4 py-2"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            
            {/* Items Grid */}
            {filteredItems.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg">No items found</p>
                <p className="text-sm mt-2">Try adjusting your filters or add a new item</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredItems.map(item => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    category={categories.find(c => c.id === item.categoryId)}
                    onEdit={() => {
                      setEditingItem(item)
                      setShowAddModal(true)
                    }}
                    onDelete={() => deleteItem(item.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map(cat => (
                <CategoryCard key={cat.id} category={cat} items={items} />
              ))}
            </div>
          </div>
        )}
        
        {/* Taxes Tab */}
        {activeTab === 'taxes' && (
          <TaxSettings />
        )}
        
        {/* Quick Buttons Tab */}
        {activeTab === 'quick' && (
          <QuickButtonsSettings items={items} />
        )}
      </div>
      
      {/* Add/Edit Modal */}
      {(showAddModal || editingItem) && (
        <ItemEditModal
          item={editingItem}
          categories={categories}
          onSave={saveItem}
          onClose={() => {
            setShowAddModal(false)
            setEditingItem(null)
          }}
        />
      )}
    </div>
  )
}

// Item Card Component
const ItemCard = ({ item, category, onEdit, onDelete }: {
  item: any
  category: any
  onEdit: () => void
  onDelete: () => void
}) => {
  return (
    <div className="border rounded-lg p-4 hover:shadow-lg transition-shadow bg-white">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-2xl">{category?.icon || '📦'}</span>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold truncate">{item.name}</h3>
            <p className="text-xs text-gray-500">{item.code}</p>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={onEdit}
            className="p-1 hover:bg-gray-100 rounded transition"
            title="Edit"
          >
            ✏️
          </button>
          <button
            onClick={onDelete}
            className="p-1 hover:bg-red-100 rounded transition"
            title="Delete"
          >
            🗑️
          </button>
        </div>
      </div>
      
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Price:</span>
          <span className="font-bold">₾{item.unitPrice?.toFixed(2) || '0.00'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Unit:</span>
          <span>{item.unit || 'piece'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Department:</span>
          <span>{item.department || 'ROOMS'}</span>
        </div>
        {item.trackStock && (
          <div className="flex justify-between">
            <span className="text-gray-600">Stock:</span>
            <span className={item.currentStock < 10 ? 'text-red-600 font-bold' : ''}>
              {item.currentStock || 0}
            </span>
          </div>
        )}
      </div>
      
      <div className="mt-3 pt-3 border-t">
        <div className="flex justify-between items-center">
          <span className={`px-2 py-1 rounded text-xs ${
            item.available 
              ? 'bg-green-100 text-green-700' 
              : 'bg-red-100 text-red-700'
          }`}>
            {item.available ? 'Active' : 'Inactive'}
          </span>
          <span className="text-xs text-gray-500">
            {category?.name || 'Unknown'}
          </span>
        </div>
      </div>
    </div>
  )
}

// Category Card Component
const CategoryCard = ({ category, items }: { category: any; items: any[] }) => {
  const itemCount = items.filter((i: any) => i.categoryId === category.id).length
  
  return (
    <div className="border rounded-lg p-4 bg-white hover:shadow-lg transition-shadow">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">{category.icon}</span>
        <div>
          <h3 className="font-bold">{category.name}</h3>
          <p className="text-xs text-gray-500">{category.code}</p>
        </div>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Items:</span>
          <span className="font-bold">{itemCount}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Department:</span>
          <span>{category.department || 'ROOMS'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Tax Rate:</span>
          <span>{category.taxRate || 0}%</span>
        </div>
        {category.serviceChargeRate && (
          <div className="flex justify-between">
            <span className="text-gray-600">Service:</span>
            <span>{category.serviceChargeRate}%</span>
          </div>
        )}
      </div>
    </div>
  )
}

// Tax Settings Component
const TaxSettings = () => {
  const [taxes, setTaxes] = useState({
    VAT: 18,
    CITY_TAX: 3,
    TOURISM_TAX: 1,
    SERVICE_CHARGE: 10
  })
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('taxSettings')
      if (saved) {
        try {
          setTaxes(JSON.parse(saved))
        } catch (e) {
          console.error('Error loading tax settings:', e)
        }
      }
    }
  }, [])
  
  const saveTaxes = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('taxSettings', JSON.stringify(taxes))
      alert('✅ Tax settings saved!')
    }
  }
  
  return (
    <div className="p-6">
      <div className="max-w-2xl">
        <h3 className="text-lg font-bold mb-4">Tax Configuration</h3>
        
        <div className="space-y-4">
          {Object.entries(taxes).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <label className="font-medium">
                {key.replace(/_/g, ' ')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={value}
                  onChange={(e) => setTaxes({...taxes, [key]: parseFloat(e.target.value) || 0})}
                  className="w-20 border rounded px-2 py-1 text-right"
                  step="0.5"
                  min="0"
                  max="100"
                />
                <span>%</span>
              </div>
            </div>
          ))}
        </div>
        
        <button
          onClick={saveTaxes}
          className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Save Tax Settings
        </button>
      </div>
    </div>
  )
}

// Quick Buttons Settings Component
const QuickButtonsSettings = ({ items }: { items: any[] }) => {
  const [quickButtons, setQuickButtons] = useState<any[]>([])
  
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const saved = localStorage.getItem('quickButtons')
    if (saved) {
      try {
        setQuickButtons(JSON.parse(saved))
      } catch (e) {
        console.error('Error loading quick buttons:', e)
      }
    } else {
      // Default quick buttons
      const defaults = [
        { itemId: 'MB-WATER', position: 1 },
        { itemId: 'MB-COLA', position: 2 },
        { itemId: 'MB-BEER', position: 3 },
        { itemId: 'FB-BREAKFAST', position: 4 },
        { itemId: 'LDRY-SHIRT', position: 5 },
        { itemId: 'TRANS-TAXI', position: 6 }
      ]
      setQuickButtons(defaults)
      localStorage.setItem('quickButtons', JSON.stringify(defaults))
    }
  }, [])
  
  const addQuickButton = (itemId: string) => {
    if (!itemId) return
    
    const newButton = {
      itemId,
      position: quickButtons.length + 1
    }
    const updated = [...quickButtons, newButton]
    setQuickButtons(updated)
    if (typeof window !== 'undefined') {
      localStorage.setItem('quickButtons', JSON.stringify(updated))
    }
  }
  
  const removeQuickButton = (index: number) => {
    const updated = quickButtons.filter((_, i) => i !== index)
    setQuickButtons(updated)
    if (typeof window !== 'undefined') {
      localStorage.setItem('quickButtons', JSON.stringify(updated))
    }
  }
  
  const getItemIcon = (itemName: string) => {
    const name = itemName.toLowerCase()
    if (name.includes('water')) return '💧'
    if (name.includes('cola') || name.includes('soda')) return '🥤'
    if (name.includes('beer')) return '🍺'
    if (name.includes('breakfast')) return '☕'
    if (name.includes('laundry') || name.includes('shirt')) return '👔'
    if (name.includes('taxi') || name.includes('transport')) return '🚕'
    if (name.includes('spa')) return '🧖'
    if (name.includes('phone')) return '📞'
    return '📦'
  }
  
  return (
    <div className="p-6">
      <h3 className="text-lg font-bold mb-4">Quick Access Buttons</h3>
      
      <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mb-6">
        {quickButtons.map((btn, index) => {
          const item = items.find((i: any) => i.id === btn.itemId)
          if (!item) return null
          
          return (
            <div key={index} className="relative group">
              <div className="border-2 border-blue-500 rounded-lg p-4 text-center bg-blue-50 hover:bg-blue-100 transition">
                <div className="text-2xl mb-1">
                  {getItemIcon(item.name)}
                </div>
                <div className="text-xs font-medium truncate">{item.name}</div>
                <div className="text-xs text-gray-600 mt-1">₾{item.unitPrice?.toFixed(2) || '0.00'}</div>
              </div>
              <button
                onClick={() => removeQuickButton(index)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-sm"
              >
                ×
              </button>
            </div>
          )
        })}
        
        {/* Add button */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center flex items-center justify-center cursor-pointer hover:bg-gray-50 transition">
          <select
            onChange={(e) => {
              if (e.target.value) {
                addQuickButton(e.target.value)
                e.target.value = ''
              }
            }}
            className="text-sm border-0 bg-transparent cursor-pointer"
            defaultValue=""
          >
            <option value="" disabled>+ Add</option>
            {items
              .filter((i: any) => i.available && !quickButtons.find(b => b.itemId === i.id))
              .map((i: any) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))
            }
          </select>
        </div>
      </div>
      
      {quickButtons.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No quick buttons configured</p>
          <p className="text-sm mt-2">Add items from the dropdown above</p>
        </div>
      )}
    </div>
  )
}

// Item Edit Modal
const ItemEditModal = ({ item, categories, onSave, onClose }: {
  item: any
  categories: any[]
  onSave: (item: any) => void
  onClose: () => void
}) => {
  const [formData, setFormData] = useState(item || {
    name: '',
    code: '',
    categoryId: categories[0]?.id || '',
    unitPrice: 0,
    unit: 'piece',
    department: 'ROOMS',
    available: true,
    trackStock: false,
    currentStock: 0
  })
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-[500px] max-w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">
          {item ? 'Edit Item' : 'Add New Item'}
        </h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Code *</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Category *</label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({...formData, categoryId: e.target.value})}
                className="w-full border rounded px-3 py-2"
                required
              >
                {categories.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Department</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({...formData, department: e.target.value})}
                className="w-full border rounded px-3 py-2"
              >
                <option value="ROOMS">Rooms</option>
                <option value="F&B">F&B</option>
                <option value="SPA">Spa</option>
                <option value="HSK">Housekeeping</option>
                <option value="CONC">Concierge</option>
                <option value="FRONT">Front Desk</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Price (₾) *</label>
              <input
                type="number"
                value={formData.unitPrice}
                onChange={(e) => setFormData({...formData, unitPrice: parseFloat(e.target.value) || 0})}
                className="w-full border rounded px-3 py-2"
                step="0.01"
                min="0"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Unit</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({...formData, unit: e.target.value})}
                className="w-full border rounded px-3 py-2"
              >
                <option value="piece">Piece</option>
                <option value="hour">Hour</option>
                <option value="day">Day</option>
                <option value="km">KM</option>
                <option value="person">Person</option>
                <option value="service">Service</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Stock</label>
              <input
                type="number"
                value={formData.currentStock}
                onChange={(e) => setFormData({...formData, currentStock: parseInt(e.target.value) || 0})}
                className="w-full border rounded px-3 py-2"
                disabled={!formData.trackStock}
                min="0"
              />
            </div>
          </div>
          
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.available}
                onChange={(e) => setFormData({...formData, available: e.target.checked})}
                className="mr-2"
              />
              <span className="text-sm">Active</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.trackStock}
                onChange={(e) => setFormData({...formData, trackStock: e.target.checked})}
                className="mr-2"
              />
              <span className="text-sm">Track Stock</span>
            </label>
          </div>
        </div>
        
        <div className="flex gap-2 mt-6">
          <button
            onClick={() => onSave(formData)}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

