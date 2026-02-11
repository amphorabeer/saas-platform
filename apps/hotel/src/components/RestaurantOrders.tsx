'use client'

import React, { useState, useEffect } from 'react'
import moment from 'moment'

interface MenuCategory {
  id: string
  name: string
  icon: string
  isActive: boolean
}

interface MenuItem {
  id: string
  categoryId: string
  name: string
  price: number
  isAvailable: boolean
}

interface OrderItem {
  menuItemId: string
  name: string
  quantity: number
  unitPrice: number
  total: number
  notes: string
}

interface RestaurantOrder {
  id: string
  orderNumber: string
  tableNumber: string
  roomNumber: string
  guestName: string
  status: 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled'
  items: OrderItem[]
  subtotal: number
  tax: number
  total: number
  notes: string
  paymentMethod: string
  createdAt: string
}

interface RestaurantSettings {
  enabled: boolean
  name: string
  taxRate: number
  serviceCharge: number
  tables: string[]
}

export default function RestaurantOrders() {
  const [settings, setSettings] = useState<RestaurantSettings>({
    enabled: false,
    name: 'Restaurant',
    taxRate: 18,
    serviceCharge: 0,
    tables: []
  })
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [orders, setOrders] = useState<RestaurantOrder[]>([])
  const [activeTab, setActiveTab] = useState<'orders' | 'new'>('orders')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  
  // New order state
  const [newOrder, setNewOrder] = useState<Partial<RestaurantOrder>>({
    tableNumber: '',
    roomNumber: '',
    guestName: '',
    items: [],
    notes: ''
  })

  // Load data
  useEffect(() => {
    const savedSettings = localStorage.getItem('restaurantSettings')
    if (savedSettings) setSettings(JSON.parse(savedSettings))
    
    const savedCategories = localStorage.getItem('menuCategories')
    if (savedCategories) setCategories(JSON.parse(savedCategories))
    
    const savedMenuItems = localStorage.getItem('menuItems')
    if (savedMenuItems) setMenuItems(JSON.parse(savedMenuItems))
    
    const savedOrders = localStorage.getItem('restaurantOrders')
    if (savedOrders) setOrders(JSON.parse(savedOrders))
  }, [])

  // Calculate order totals
  const calculateTotals = (items: OrderItem[]) => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0)
    const tax = subtotal * (settings.taxRate / 100)
    const total = subtotal + tax
    return { subtotal, tax, total }
  }

  // Add item to order
  const addItemToOrder = (item: MenuItem) => {
    const existingIndex = (newOrder.items || []).findIndex(i => i.menuItemId === item.id)
    
    let updatedItems: OrderItem[]
    if (existingIndex >= 0) {
      updatedItems = (newOrder.items || []).map((i, idx) => 
        idx === existingIndex 
          ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.unitPrice }
          : i
      )
    } else {
      updatedItems = [
        ...(newOrder.items || []),
        {
          menuItemId: item.id,
          name: item.name,
          quantity: 1,
          unitPrice: item.price,
          total: item.price,
          notes: ''
        }
      ]
    }
    
    const totals = calculateTotals(updatedItems)
    setNewOrder({ ...newOrder, items: updatedItems, ...totals })
  }

  // Remove item from order
  const removeItemFromOrder = (menuItemId: string) => {
    const updatedItems = (newOrder.items || []).filter(i => i.menuItemId !== menuItemId)
    const totals = calculateTotals(updatedItems)
    setNewOrder({ ...newOrder, items: updatedItems, ...totals })
  }

  // Update item quantity
  const updateItemQuantity = (menuItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItemFromOrder(menuItemId)
      return
    }
    
    const updatedItems = (newOrder.items || []).map(i => 
      i.menuItemId === menuItemId 
        ? { ...i, quantity, total: quantity * i.unitPrice }
        : i
    )
    const totals = calculateTotals(updatedItems)
    setNewOrder({ ...newOrder, items: updatedItems, ...totals })
  }

  // Create order
  const createOrder = () => {
    if (!newOrder.items?.length) {
      alert('დაამატეთ კერძები შეკვეთაში')
      return
    }

    const order: RestaurantOrder = {
      id: `order_${Date.now()}`,
      orderNumber: `R${moment().format('YYMMDDHHmm')}`,
      tableNumber: newOrder.tableNumber || '',
      roomNumber: newOrder.roomNumber || '',
      guestName: newOrder.guestName || '',
      status: 'pending',
      items: newOrder.items || [],
      subtotal: newOrder.subtotal || 0,
      tax: newOrder.tax || 0,
      total: newOrder.total || 0,
      notes: newOrder.notes || '',
      paymentMethod: '',
      createdAt: new Date().toISOString()
    }

    const updatedOrders = [order, ...orders]
    setOrders(updatedOrders)
    localStorage.setItem('restaurantOrders', JSON.stringify(updatedOrders))
    
    setNewOrder({ tableNumber: '', roomNumber: '', guestName: '', items: [], notes: '' })
    setActiveTab('orders')
  }

  // Update order status
  const updateOrderStatus = (orderId: string, status: RestaurantOrder['status']) => {
    const updatedOrders = orders.map(o => o.id === orderId ? { ...o, status } : o)
    setOrders(updatedOrders)
    localStorage.setItem('restaurantOrders', JSON.stringify(updatedOrders))
  }

  // Get status color
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending': return { color: 'bg-yellow-100 text-yellow-700', label: 'მოლოდინში', icon: '⏳' }
      case 'preparing': return { color: 'bg-blue-100 text-blue-700', label: 'მზადდება', icon: '👨‍🍳' }
      case 'ready': return { color: 'bg-green-100 text-green-700', label: 'მზადაა', icon: '✅' }
      case 'served': return { color: 'bg-gray-100 text-gray-700', label: 'მიწოდებული', icon: '🍽️' }
      case 'cancelled': return { color: 'bg-red-100 text-red-700', label: 'გაუქმებული', icon: '❌' }
      default: return { color: 'bg-gray-100', label: status, icon: '❓' }
    }
  }

  const activeCategories = categories.filter(c => c.isActive)
  const todayOrders = orders.filter(o => moment(o.createdAt).isSame(moment(), 'day'))

  if (!settings.enabled) {
    return (
      <div className="p-8 text-center">
        <div className="text-6xl mb-4">🍽️</div>
        <h2 className="text-2xl font-bold text-gray-700 mb-2">რესტორანი გამორთულია</h2>
        <p className="text-gray-500">ჩართეთ პარამეტრებში: ⚙️ პარამეტრები → 🍽️ რესტორანი</p>
      </div>
    )
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🍽️</span>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{settings.name}</h1>
            <p className="text-sm text-gray-500">შეკვეთები და მენიუ</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'orders' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
          >
            📋 შეკვეთები ({todayOrders.filter(o => o.status !== 'served' && o.status !== 'cancelled').length})
          </button>
          <button
            onClick={() => setActiveTab('new')}
            className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'new' ? 'bg-green-500 text-white' : 'bg-gray-100'}`}
          >
            + ახალი შეკვეთა
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="text-2xl font-bold text-yellow-600">
            {todayOrders.filter(o => o.status === 'pending').length}
          </div>
          <div className="text-sm text-gray-500">მოლოდინში</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="text-2xl font-bold text-blue-600">
            {todayOrders.filter(o => o.status === 'preparing').length}
          </div>
          <div className="text-sm text-gray-500">მზადდება</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="text-2xl font-bold text-green-600">
            {todayOrders.filter(o => o.status === 'ready').length}
          </div>
          <div className="text-sm text-gray-500">მზადაა</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="text-2xl font-bold text-gray-600">
            ₾{todayOrders.filter(o => o.status === 'served').reduce((sum, o) => sum + o.total, 0).toFixed(0)}
          </div>
          <div className="text-sm text-gray-500">დღის შემოსავალი</div>
        </div>
      </div>

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {todayOrders.filter(o => o.status !== 'cancelled').length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">
              <div className="text-4xl mb-2">📋</div>
              <p>დღეს შეკვეთები არ არის</p>
            </div>
          ) : (
            todayOrders.filter(o => o.status !== 'cancelled').map(order => {
              const statusConfig = getStatusConfig(order.status)
              return (
                <div key={order.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <div className={`px-4 py-2 ${statusConfig.color} flex items-center justify-between`}>
                    <span className="font-medium">{statusConfig.icon} {statusConfig.label}</span>
                    <span className="text-sm">#{order.orderNumber}</span>
                  </div>
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        {order.tableNumber && <div className="font-medium">🪑 მაგიდა {order.tableNumber}</div>}
                        {order.roomNumber && <div className="font-medium">🏨 ოთახი {order.roomNumber}</div>}
                        {order.guestName && <div className="text-sm text-gray-500">{order.guestName}</div>}
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">₾{order.total.toFixed(2)}</div>
                        <div className="text-xs text-gray-500">{moment(order.createdAt).format('HH:mm')}</div>
                      </div>
                    </div>
                    
                    <div className="border-t pt-3 mb-3">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm py-1">
                          <span>{item.quantity}x {item.name}</span>
                          <span>₾{item.total.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex gap-2">
                      {order.status === 'pending' && (
                        <>
                          <button onClick={() => updateOrderStatus(order.id, 'preparing')} className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg text-sm">👨‍🍳 მზადდება</button>
                          <button onClick={() => updateOrderStatus(order.id, 'cancelled')} className="px-3 py-2 bg-red-100 text-red-600 rounded-lg text-sm">❌</button>
                        </>
                      )}
                      {order.status === 'preparing' && (
                        <button onClick={() => updateOrderStatus(order.id, 'ready')} className="flex-1 px-3 py-2 bg-green-500 text-white rounded-lg text-sm">✅ მზადაა</button>
                      )}
                      {order.status === 'ready' && (
                        <button onClick={() => updateOrderStatus(order.id, 'served')} className="flex-1 px-3 py-2 bg-gray-500 text-white rounded-lg text-sm">🍽️ მიწოდებული</button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* New Order Tab */}
      {activeTab === 'new' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Menu */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border p-4">
            <h3 className="font-bold mb-4">🍴 მენიუ</h3>
            
            {/* Categories */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap ${!selectedCategory ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
              >
                ყველა
              </button>
              {activeCategories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-lg whitespace-nowrap ${selectedCategory === cat.id ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                >
                  {cat.icon} {cat.name}
                </button>
              ))}
            </div>
            
            {/* Menu Items */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {menuItems
                .filter(i => i.isAvailable && (!selectedCategory || i.categoryId === selectedCategory))
                .map(item => (
                  <button
                    key={item.id}
                    onClick={() => addItemToOrder(item)}
                    className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 text-left"
                  >
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-green-600 font-bold">₾{item.price}</div>
                  </button>
                ))}
            </div>
            
            {menuItems.filter(i => i.isAvailable).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>მენიუ ცარიელია</p>
                <p className="text-sm">დაამატეთ კერძები პარამეტრებში</p>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <h3 className="font-bold mb-4">🧾 შეკვეთა</h3>
            
            <div className="space-y-3 mb-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">მაგიდა</label>
                  <select
                    value={newOrder.tableNumber || ''}
                    onChange={(e) => setNewOrder({ ...newOrder, tableNumber: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="">-</option>
                    {settings.tables.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">ოთახი</label>
                  <input
                    type="text"
                    value={newOrder.roomNumber || ''}
                    onChange={(e) => setNewOrder({ ...newOrder, roomNumber: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder="101"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">სტუმარი</label>
                <input
                  type="text"
                  value={newOrder.guestName || ''}
                  onChange={(e) => setNewOrder({ ...newOrder, guestName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="სახელი"
                />
              </div>
            </div>
            
            {/* Items */}
            <div className="border-t pt-3 mb-4 max-h-64 overflow-y-auto">
              {(newOrder.items || []).length === 0 ? (
                <div className="text-center py-4 text-gray-400 text-sm">
                  აირჩიეთ კერძები მენიუდან
                </div>
              ) : (
                (newOrder.items || []).map(item => (
                  <div key={item.menuItemId} className="flex items-center justify-between py-2 border-b">
                    <div className="flex-1">
                      <div className="text-sm font-medium">{item.name}</div>
                      <div className="text-xs text-gray-500">₾{item.unitPrice} × {item.quantity}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateItemQuantity(item.menuItemId, item.quantity - 1)}
                        className="w-6 h-6 bg-gray-200 rounded text-sm"
                      >-</button>
                      <span className="w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateItemQuantity(item.menuItemId, item.quantity + 1)}
                        className="w-6 h-6 bg-gray-200 rounded text-sm"
                      >+</button>
                      <span className="w-16 text-right font-medium">₾{item.total.toFixed(2)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* Totals */}
            {(newOrder.items || []).length > 0 && (
              <div className="border-t pt-3 space-y-1 mb-4">
                <div className="flex justify-between text-sm">
                  <span>ქვეჯამი</span>
                  <span>₾{(newOrder.subtotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>დღგ ({settings.taxRate}%)</span>
                  <span>₾{(newOrder.tax || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>სულ</span>
                  <span>₾{(newOrder.total || 0).toFixed(2)}</span>
                </div>
              </div>
            )}
            
            <button
              onClick={createOrder}
              disabled={!(newOrder.items || []).length}
              className="w-full px-4 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ✅ შეკვეთის გაგზავნა
            </button>
          </div>
        </div>
      )}
    </div>
  )
}