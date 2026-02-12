'use client'

import React, { useState, useEffect, useCallback } from 'react'
import moment from 'moment'
import { RestaurantSpaChargeService, ChargeRequest, ChargeItem } from '../services/RestaurantSpaChargeService'
import { CompanyService } from '../services/CompanyService'

// ==================== TYPES ====================
interface TableConfig {
  id: string
  number: string
  seats: number
  zone: 'inside' | 'outside' | 'lobby'
  x: number
  y: number
  width: number
  height: number
  shape: 'rect' | 'round'
  status: 'available' | 'occupied' | 'reserved' | 'cleaning'
  currentOrderId?: string
  mergedWith?: string[]
}

interface MenuItem {
  id: string
  categoryId: string
  name: string
  nameEn: string
  price: number
  preparationTime: number
  isAvailable: boolean
}

interface MenuCategory {
  id: string
  name: string
  icon: string
  isActive: boolean
}

interface OrderItem {
  id: string
  menuItemId: string
  name: string
  quantity: number
  unitPrice: number
  total: number
  notes: string
  status: 'pending' | 'preparing' | 'ready' | 'served'
  course: 'appetizer' | 'main' | 'dessert' | 'drink'
}

interface RestaurantOrder {
  id: string
  orderNumber: string
  tableId: string
  tableNumber: string
  orderType: 'hotel_guest' | 'walk_in' | 'tour_group'
  guestName: string
  roomNumber?: string
  reservationId?: string
  groupName?: string
  groupSize?: number
  companyId?: string
  items: OrderItem[]
  subtotal: number
  tax: number
  serviceCharge: number
  total: number
  status: 'open' | 'pending' | 'preparing' | 'ready' | 'served' | 'paid' | 'cancelled'
  paymentMethod?: 'cash' | 'card' | 'room_charge' | 'invoice'
  notes: string
  createdAt: string
  servedAt?: string
  paidAt?: string
  createdBy: string
  // Payment tracking
  transactionId?: string
  folioId?: string
  invoiceId?: string
}

interface GroupMenu {
  id: string
  name: string
  description: string
  pricePerPerson: number
  items: string[]
  isActive: boolean
}

interface BeerTasting {
  id: string
  name: string
  description: string
  beers: string[]
  price: number
  duration: number
  isActive: boolean
}

// ==================== DEFAULT DATA ====================
const DEFAULT_TABLES: TableConfig[] = [
  // შიგნით - 4 მაგიდა
  { id: 't1', number: '1', seats: 4, zone: 'inside', x: 50, y: 50, width: 80, height: 80, shape: 'rect', status: 'available' },
  { id: 't2', number: '2', seats: 4, zone: 'inside', x: 150, y: 50, width: 80, height: 80, shape: 'rect', status: 'available' },
  { id: 't3', number: '3', seats: 6, zone: 'inside', x: 50, y: 150, width: 100, height: 80, shape: 'rect', status: 'available' },
  { id: 't4', number: '4', seats: 6, zone: 'inside', x: 170, y: 150, width: 100, height: 80, shape: 'rect', status: 'available' },
  // გარეთ - 3 მაგიდა
  { id: 't5', number: '5', seats: 4, zone: 'outside', x: 50, y: 50, width: 80, height: 80, shape: 'round', status: 'available' },
  { id: 't6', number: '6', seats: 4, zone: 'outside', x: 150, y: 50, width: 80, height: 80, shape: 'round', status: 'available' },
  { id: 't7', number: '7', seats: 6, zone: 'outside', x: 100, y: 150, width: 100, height: 80, shape: 'round', status: 'available' },
  // ლობი - 1 მაგიდა
  { id: 't8', number: 'L1', seats: 6, zone: 'lobby', x: 80, y: 80, width: 120, height: 80, shape: 'rect', status: 'available' }
]

const DEFAULT_GROUP_MENUS: GroupMenu[] = [
  { id: 'gm1', name: 'ქართული მენიუ', description: 'ტრადიციული ქართული კერძები', pricePerPerson: 45, items: [], isActive: true },
  { id: 'gm2', name: 'ლუდის მენიუ', description: 'ლუდთან შესაფერისი კერძები + დეგუსტაცია', pricePerPerson: 55, items: [], isActive: true },
  { id: 'gm3', name: 'პრემიუმ მენიუ', description: 'სრული გასტრონომიული გამოცდილება', pricePerPerson: 75, items: [], isActive: true }
]

const DEFAULT_BEER_TASTINGS: BeerTasting[] = [
  { id: 'bt1', name: '4 ლუდის დეგუსტაცია', description: '4 სხვადასხვა ხელნაკეთი ლუდი', beers: ['Pilsner', 'IPA', 'Stout', 'Wheat'], price: 25, duration: 30, isActive: true },
  { id: 'bt2', name: '6 ლუდის დეგუსტაცია', description: '6 სხვადასხვა ხელნაკეთი ლუდი', beers: ['Pilsner', 'IPA', 'Stout', 'Wheat', 'Amber', 'Porter'], price: 35, duration: 45, isActive: true },
  { id: 'bt3', name: 'ბრიუმასტერის დეგუსტაცია', description: 'ყველა ლუდი + ტური ქარხანაში', beers: ['All beers'], price: 50, duration: 60, isActive: true }
]

// ==================== MAIN COMPONENT ====================
export default function RestaurantPOS() {
  // View state
  const [activeView, setActiveView] = useState<'floor' | 'orders' | 'kds' | 'reports' | 'reservations'>('floor')
  const [activeZone, setActiveZone] = useState<'inside' | 'outside' | 'lobby'>('inside')
  
  // Date selection
  const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'))
  
  // Restaurant reservations from website
  const [restaurantReservations, setRestaurantReservations] = useState<any[]>([])
  
  // Data state
  const [tables, setTables] = useState<TableConfig[]>(DEFAULT_TABLES)
  const [orders, setOrders] = useState<RestaurantOrder[]>([])
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [groupMenus, setGroupMenus] = useState<GroupMenu[]>(DEFAULT_GROUP_MENUS)
  const [beerTastings, setBeerTastings] = useState<BeerTasting[]>(DEFAULT_BEER_TASTINGS)
  
  // Order state
  const [selectedTable, setSelectedTable] = useState<TableConfig | null>(null)
  const [currentOrder, setCurrentOrder] = useState<Partial<RestaurantOrder> | null>(null)
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showQRModal, setShowQRModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  
  // Receipt state
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [receiptOrder, setReceiptOrder] = useState<RestaurantOrder | null>(null)
  const [receiptType, setReceiptType] = useState<'preview' | 'paid'>('preview')
  
  // Settings
  const [settings, setSettings] = useState({
    taxRate: 18,
    serviceCharge: 0,
    restaurantName: 'Brewery House Restaurant'
  })
  
  // Checked-in rooms for hotel guest selection
  const [checkedInRooms, setCheckedInRooms] = useState<any[]>([])

  // Load checked-in rooms
  useEffect(() => {
    const loadCheckedInRooms = async () => {
      try {
        // Direct API call
        const response = await fetch('/api/hotel/reservations')
        if (response.ok) {
          const allReservations = await response.json()
          const checkedIn = allReservations.filter((r: any) => 
            r.status === 'CHECKED_IN' || r.status === 'checked_in' || r.status === 'OCCUPIED'
          )
          console.log('[RestaurantPOS] Loaded checked-in rooms:', checkedIn.length)
          setCheckedInRooms(checkedIn)
        }
      } catch (e) {
        console.error('[RestaurantPOS] Error loading checked-in rooms:', e)
        // Fallback to localStorage
        const localRes = JSON.parse(localStorage.getItem('hotelReservations') || '[]')
        const checkedIn = localRes.filter((r: any) => 
          r.status === 'CHECKED_IN' || r.status === 'checked_in' || r.status === 'OCCUPIED'
        )
        setCheckedInRooms(checkedIn)
      }
    }
    loadCheckedInRooms()
  }, [])

  // Load restaurant reservations for selected date
  useEffect(() => {
    const loadRestaurantReservations = async () => {
      try {
        const response = await fetch(`/api/hotel/spa-bookings?type=restaurant&date=${selectedDate}`)
        if (response.ok) {
          const data = await response.json()
          // Filter only restaurant bookings for selected date
          const filtered = data.filter((b: any) => {
            const bookingDate = moment(b.date).format('YYYY-MM-DD')
            const isRestaurant = b.bookingNumber?.startsWith('RST') || b.services?.type === 'restaurant'
            return bookingDate === selectedDate && isRestaurant
          })
          console.log('[RestaurantPOS] Loaded restaurant reservations:', filtered.length)
          setRestaurantReservations(filtered)
        }
      } catch (e) {
        console.error('[RestaurantPOS] Error loading restaurant reservations:', e)
      }
    }
    loadRestaurantReservations()
  }, [selectedDate])

  // Load data from API
  useEffect(() => {
    const loadData = async () => {
      // Load menu categories from API
      try {
        const catRes = await fetch('/api/hotel/menu-categories')
        if (catRes.ok) {
          const catData = await catRes.json()
          if (Array.isArray(catData) && catData.length > 0) {
            setCategories(catData.map((c: any) => ({
              id: c.id,
              name: c.name,
              icon: c.icon || '🍽️',
              isActive: c.isActive ?? true
            })))
            console.log('[RestaurantPOS] Loaded categories from API:', catData.length)
          }
        }
      } catch (e) {
        console.error('[RestaurantPOS] Error loading categories:', e)
      }

      // Load menu items from API
      try {
        const itemsRes = await fetch('/api/hotel/menu-items')
        if (itemsRes.ok) {
          const itemsData = await itemsRes.json()
          if (Array.isArray(itemsData) && itemsData.length > 0) {
            setMenuItems(itemsData.map((m: any) => ({
              id: m.id,
              categoryId: m.categoryId,
              name: m.name,
              nameEn: m.nameEn || '',
              price: Number(m.price),
              preparationTime: m.preparationTime || 15,
              isAvailable: m.isAvailable ?? true
            })))
            console.log('[RestaurantPOS] Loaded menu items from API:', itemsData.length)
          }
        }
      } catch (e) {
        console.error('[RestaurantPOS] Error loading menu items:', e)
      }

      // Load restaurant settings from API
      try {
        const settingsRes = await fetch('/api/hotel/restaurant-settings')
        if (settingsRes.ok) {
          const s = await settingsRes.json()
          if (s) {
            setSettings(prev => ({ 
              ...prev, 
              taxRate: Number(s.taxRate) || 18, 
              serviceCharge: Number(s.serviceCharge) || 0, 
              restaurantName: s.name || 'Restaurant' 
            }))
          }
        }
      } catch (e) {
        console.error('[RestaurantPOS] Error loading settings:', e)
      }

      // Load group menus from API
      try {
        const gmRes = await fetch('/api/hotel/group-menus')
        if (gmRes.ok) {
          const gmData = await gmRes.json()
          if (Array.isArray(gmData) && gmData.length > 0) {
            setGroupMenus(gmData.map((gm: any) => ({
              id: gm.id,
              name: gm.name,
              description: gm.description || '',
              pricePerPerson: Number(gm.pricePerPerson),
              items: gm.items?.map((i: any) => i.name) || [],
              isActive: gm.isActive ?? true
            })))
          }
        }
      } catch (e) {
        console.error('[RestaurantPOS] Error loading group menus:', e)
      }

      // Load beer tastings from API
      try {
        const btRes = await fetch('/api/hotel/beer-tastings')
        if (btRes.ok) {
          const btData = await btRes.json()
          if (Array.isArray(btData) && btData.length > 0) {
            setBeerTastings(btData.map((bt: any) => ({
              id: bt.id,
              name: bt.name,
              description: bt.description || '',
              beers: bt.beers || [],
              price: Number(bt.price),
              duration: bt.duration || 30,
              isActive: bt.isActive ?? true
            })))
          }
        }
      } catch (e) {
        console.error('[RestaurantPOS] Error loading beer tastings:', e)
      }

      // Load tables from API
      try {
        const tablesRes = await fetch('/api/hotel/restaurant-tables')
        if (tablesRes.ok) {
          const tablesData = await tablesRes.json()
          if (Array.isArray(tablesData) && tablesData.length > 0) {
            // Get saved statuses from localStorage
            const savedStatuses = JSON.parse(localStorage.getItem('restaurantTableStatuses') || '{}')
            
            setTables(tablesData.map((t: any) => ({
              id: t.id,
              number: t.number,
              seats: t.seats || 4,
              zone: t.zone || 'inside',
              x: 50 + Math.random() * 100,
              y: 50 + Math.random() * 100,
              width: 80,
              height: 80,
              shape: t.shape || 'rect',
              // Use saved status from localStorage if exists, otherwise use API status or default
              status: savedStatuses[t.id] || t.status || 'available'
            })))
            console.log('[RestaurantPOS] Loaded tables from API:', tablesData.length)
          }
        }
      } catch (e) {
        console.error('[RestaurantPOS] Error loading tables:', e)
      }

      // Load orders from API
      try {
        const ordersRes = await fetch('/api/hotel/restaurant-orders')
        if (ordersRes.ok) {
          const ordersData = await ordersRes.json()
          if (Array.isArray(ordersData)) {
            setOrders(ordersData.map((o: any) => ({
              id: o.id,
              orderNumber: o.orderNumber,
              tableId: o.tableId || '',
              tableNumber: o.tableNumber || '',
              orderType: o.customerType === 'hotel_guest' ? 'hotel_guest' : 
                        o.customerType === 'tour_company' ? 'tour_group' : 'walk_in',
              guestName: o.guestName || '',
              roomNumber: o.roomNumber,
              reservationId: o.reservationId,
              groupName: o.groupName,
              groupSize: o.groupSize,
              companyId: o.companyId,
              items: (o.items || []).map((item: any) => ({
                id: item.id,
                menuItemId: item.menuItemId,
                name: item.name,
                quantity: item.quantity || 1,
                unitPrice: Number(item.unitPrice),
                total: Number(item.total),
                notes: item.notes || '',
                status: item.status || 'pending',
                course: item.course || 'main'
              })),
              subtotal: Number(o.subtotal),
              tax: Number(o.tax),
              serviceCharge: Number(o.serviceCharge),
              total: Number(o.total),
              status: o.status,
              paymentMethod: o.paymentMethod,
              notes: o.notes || '',
              createdAt: o.createdAt,
              paidAt: o.paidAt,
              createdBy: o.createdBy || ''
            })))
            console.log('[RestaurantPOS] Loaded orders from API:', ordersData.length)
          }
        }
      } catch (e) {
        console.error('[RestaurantPOS] Error loading orders:', e)
      }
    }
    
    loadData()
  }, [])

  // Save orders to API
  const saveOrders = async (newOrders: RestaurantOrder[]) => {
    setOrders(newOrders)
    // Orders are saved individually via API when created/updated
  }

  // Save tables to API
  const saveTables = async (newTables: TableConfig[]) => {
    setTables(newTables)
    
    // Save statuses to localStorage for persistence
    const statuses: Record<string, string> = {}
    newTables.forEach(t => {
      statuses[t.id] = t.status
    })
    localStorage.setItem('restaurantTableStatuses', JSON.stringify(statuses))
    
    try {
      await fetch('/api/hotel/restaurant-tables', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTables.map(t => ({
          id: t.id,
          number: t.number,
          seats: t.seats,
          zone: t.zone,
          shape: t.shape,
          status: t.status
        })))
      })
    } catch (e) {
      console.error('[RestaurantPOS] Error saving tables:', e)
    }
  }

  // Get table's current order
  const getTableOrder = (tableId: string) => {
    return orders.find(o => o.tableId === tableId && ['open', 'pending', 'preparing', 'ready', 'served'].includes(o.status))
  }

  // Open table / Start new order
  const openTable = (table: TableConfig) => {
    // If table is cleaning, offer to mark as available
    if (table.status === 'cleaning') {
      if (confirm('მაგიდა იწმინდება. გნებავთ მონიშნოთ თავისუფლად?')) {
        setTables(prev => prev.map(t => 
          t.id === table.id ? { ...t, status: 'available' as const } : t
        ))
        // Save status to localStorage
        const savedStatuses = JSON.parse(localStorage.getItem('restaurantTableStatuses') || '{}')
        savedStatuses[table.id] = 'available'
        localStorage.setItem('restaurantTableStatuses', JSON.stringify(savedStatuses))
      }
      return
    }
    
    const existingOrder = getTableOrder(table.id)
    
    if (existingOrder) {
      setCurrentOrder(existingOrder)
    } else {
      setCurrentOrder({
        id: '',
        tableId: table.id,
        tableNumber: table.number,
        orderType: 'walk_in',
        guestName: '',
        items: [],
        subtotal: 0,
        tax: 0,
        serviceCharge: 0,
        total: 0,
        status: 'open',
        notes: '',
        createdAt: new Date().toISOString(),
        createdBy: 'staff'
      })
    }
    setSelectedTable(table)
    setShowOrderModal(true)
  }
  
  // Mark table as available (from cleaning status)
  const markTableAvailable = (tableId: string) => {
    setTables(prev => prev.map(t => 
      t.id === tableId ? { ...t, status: 'available' as const } : t
    ))
    // Save status to localStorage
    const savedStatuses = JSON.parse(localStorage.getItem('restaurantTableStatuses') || '{}')
    savedStatuses[tableId] = 'available'
    localStorage.setItem('restaurantTableStatuses', JSON.stringify(savedStatuses))
  }
  
  // Update table status helper
  const updateTableStatus = (tableId: string, status: TableConfig['status']) => {
    setTables(prev => prev.map(t => 
      t.id === tableId ? { ...t, status } : t
    ))
    // Save status to localStorage
    const savedStatuses = JSON.parse(localStorage.getItem('restaurantTableStatuses') || '{}')
    savedStatuses[tableId] = status
    localStorage.setItem('restaurantTableStatuses', JSON.stringify(savedStatuses))
  }

  // Calculate totals
  const calculateTotals = (items: OrderItem[]) => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0)
    const tax = subtotal * (settings.taxRate / 100)
    const svcCharge = subtotal * (settings.serviceCharge / 100)
    const total = subtotal + tax + svcCharge
    return { subtotal, tax, serviceCharge: svcCharge, total }
  }

  // Add item to order
  const addItemToOrder = (item: MenuItem, course: OrderItem['course'] = 'main') => {
    if (!currentOrder) return
    
    const existingIndex = (currentOrder.items || []).findIndex(i => i.menuItemId === item.id && i.notes === '')
    let updatedItems: OrderItem[]
    
    if (existingIndex >= 0) {
      updatedItems = (currentOrder.items || []).map((i, idx) =>
        idx === existingIndex
          ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.unitPrice }
          : i
      )
    } else {
      const newItem: OrderItem = {
        id: `item_${Date.now()}`,
        menuItemId: item.id,
        name: item.name,
        quantity: 1,
        unitPrice: item.price,
        total: item.price,
        notes: '',
        status: 'pending',
        course
      }
      updatedItems = [...(currentOrder.items || []), newItem]
    }
    
    const totals = calculateTotals(updatedItems)
    setCurrentOrder({ ...currentOrder, items: updatedItems, ...totals })
  }

  // Add beer tasting
  const addBeerTasting = (tasting: BeerTasting) => {
    if (!currentOrder) return
    
    const newItem: OrderItem = {
      id: `item_${Date.now()}`,
      menuItemId: `tasting_${tasting.id}`,
      name: `🍺 ${tasting.name}`,
      quantity: 1,
      unitPrice: tasting.price,
      total: tasting.price,
      notes: tasting.beers.join(', '),
      status: 'pending',
      course: 'drink'
    }
    
    const updatedItems = [...(currentOrder.items || []), newItem]
    const totals = calculateTotals(updatedItems)
    setCurrentOrder({ ...currentOrder, items: updatedItems, ...totals })
  }

  // Add group menu
  const addGroupMenu = (menu: GroupMenu, persons: number) => {
    if (!currentOrder) return
    
    const newItem: OrderItem = {
      id: `item_${Date.now()}`,
      menuItemId: `group_${menu.id}`,
      name: `👥 ${menu.name} (${persons} პერსონა)`,
      quantity: 1,
      unitPrice: menu.pricePerPerson * persons,
      total: menu.pricePerPerson * persons,
      notes: menu.description,
      status: 'pending',
      course: 'main'
    }
    
    const updatedItems = [...(currentOrder.items || []), newItem]
    const totals = calculateTotals(updatedItems)
    setCurrentOrder({ ...currentOrder, items: updatedItems, ...totals })
  }

  // Update item quantity
  const updateItemQuantity = (itemId: string, quantity: number) => {
    if (!currentOrder) return
    
    let updatedItems: OrderItem[]
    if (quantity <= 0) {
      updatedItems = (currentOrder.items || []).filter(i => i.id !== itemId)
    } else {
      updatedItems = (currentOrder.items || []).map(i =>
        i.id === itemId ? { ...i, quantity, total: quantity * i.unitPrice } : i
      )
    }
    
    const totals = calculateTotals(updatedItems)
    setCurrentOrder({ ...currentOrder, items: updatedItems, ...totals })
  }

  // Send order to kitchen
  const sendToKitchen = async () => {
    if (!currentOrder || !currentOrder.items?.length) return
    
    try {
      let savedOrder: RestaurantOrder
      
      if (currentOrder.id && currentOrder.id.length > 20) {
        // Update existing order via API
        const res = await fetch(`/api/hotel/restaurant-orders?id=${currentOrder.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'pending',
            items: currentOrder.items
          })
        })
        savedOrder = await res.json()
        const newOrders = orders.map(o => o.id === savedOrder.id ? { ...currentOrder as RestaurantOrder, ...savedOrder, status: 'pending' } : o)
        setOrders(newOrders)
      } else {
        // Create new order via API
        const orderData = {
          tableId: currentOrder.tableId,
          tableNumber: currentOrder.tableNumber,
          customerType: currentOrder.orderType === 'hotel_guest' ? 'hotel_guest' : 
                       currentOrder.orderType === 'tour_group' ? 'tour_company' : 'walk_in',
          guestName: currentOrder.guestName,
          roomNumber: currentOrder.roomNumber,
          reservationId: currentOrder.reservationId,
          companyId: currentOrder.companyId,
          groupName: currentOrder.groupName,
          groupSize: currentOrder.groupSize,
          items: currentOrder.items.map(item => ({
            menuItemId: item.menuItemId,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
            notes: item.notes,
            status: 'pending',
            course: item.course || 'main'
          })),
          subtotal: currentOrder.subtotal || 0,
          tax: currentOrder.tax || 0,
          serviceCharge: currentOrder.serviceCharge || 0,
          total: currentOrder.total || 0,
          status: 'pending',
          notes: currentOrder.notes,
          createdBy: 'staff'
        }
        
        const res = await fetch('/api/hotel/restaurant-orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData)
        })
        
        if (!res.ok) {
          throw new Error('Failed to create order')
        }
        
        savedOrder = await res.json()
        console.log('[RestaurantPOS] Created order:', savedOrder.orderNumber)
        
        setOrders([...orders, {
          ...currentOrder as RestaurantOrder,
          id: savedOrder.id,
          orderNumber: savedOrder.orderNumber,
          status: 'pending'
        }])
      }
      
      // Update table status
      const newTables = tables.map(t =>
        t.id === currentOrder.tableId ? { ...t, status: 'occupied' as const, currentOrderId: savedOrder.id } : t
      )
      saveTables(newTables)
      
      setShowOrderModal(false)
      setCurrentOrder(null)
      setSelectedTable(null)
    } catch (e) {
      console.error('[RestaurantPOS] Error saving order:', e)
      alert('შეკვეთის შენახვა ვერ მოხერხდა')
    }
  }

  // Process payment
  const processPayment = async (method: 'cash' | 'card' | 'room_charge' | 'invoice') => {
    if (!currentOrder?.id) return
    
    // Build charge items
    const chargeItems: ChargeItem[] = (currentOrder.items || []).map(item => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total,
      category: item.name.includes('🍺') ? 'beer_tasting' : 
                item.name.includes('👥') ? 'group_menu' : 'food'
    }))
    
    // Build charge request based on customer type
    const chargeRequest: ChargeRequest = {
      sourceType: 'restaurant',
      sourceId: currentOrder.id,
      sourceRef: currentOrder.orderNumber || `R${Date.now()}`,
      
      customerType: currentOrder.orderType === 'hotel_guest' ? 'hotel_guest' :
                    currentOrder.orderType === 'tour_group' ? 'tour_company' : 'walk_in',
      
      // Hotel guest info
      roomNumber: currentOrder.roomNumber,
      reservationId: currentOrder.reservationId,
      guestName: currentOrder.guestName,
      
      // Company info (for tour groups)
      companyId: currentOrder.companyId,
      companyName: currentOrder.groupName,
      
      // Items and totals
      items: chargeItems,
      subtotal: currentOrder.subtotal || 0,
      tax: currentOrder.tax || 0,
      serviceCharge: currentOrder.serviceCharge || 0,
      total: currentOrder.total || 0,
      
      // Payment method (for walk-in)
      paymentMethod: method === 'cash' ? 'cash' : method === 'card' ? 'card' : undefined,
      
      notes: currentOrder.notes
    }
    
    // Process charge
    const result = await RestaurantSpaChargeService.processCharge(chargeRequest)
    
    if (!result.success) {
      alert(`გადახდის შეცდომა: ${result.error}`)
      return
    }
    
    // Update order status
    const paidOrder: RestaurantOrder = {
      ...currentOrder as RestaurantOrder,
      status: 'paid',
      paymentMethod: method,
      paidAt: new Date().toISOString(),
      transactionId: result.transactionId,
      folioId: result.folioId,
      invoiceId: result.invoiceId
    }
    
    // Update order in API
    try {
      await fetch(`/api/hotel/restaurant-orders?id=${currentOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'paid',
          paymentMethod: method,
          paidAt: new Date().toISOString()
        })
      })
    } catch (e) {
      console.error('[RestaurantPOS] Error updating order payment:', e)
    }
    
    const newOrders = orders.map(o => o.id === paidOrder.id ? paidOrder : o)
    setOrders(newOrders)
    
    // Free up table
    const newTables = tables.map(t =>
      t.id === currentOrder.tableId ? { ...t, status: 'cleaning' as const, currentOrderId: undefined } : t
    )
    saveTables(newTables)
    
    // Show success message
    const methodName = method === 'cash' ? 'ნაღდი' : 
                       method === 'card' ? 'ბარათი' : 
                       method === 'room_charge' ? 'ოთახზე' : 'ინვოისი'
    console.log(`✅ გადახდა: ${methodName} - ₾${currentOrder.total}`)
    
    setShowPaymentModal(false)
    setShowOrderModal(false)
    setCurrentOrder(null)
    setSelectedTable(null)
    
    // Show receipt after payment
    setReceiptOrder(paidOrder)
    setReceiptType('paid')
    setShowReceiptModal(true)
  }

  // Show receipt preview (before payment)
  const showReceiptPreview = () => {
    if (!currentOrder) return
    setReceiptOrder(currentOrder as RestaurantOrder)
    setReceiptType('preview')
    setShowReceiptModal(true)
  }

  // Print receipt
  const printReceipt = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow || !receiptOrder) return

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>ქვითარი #${receiptOrder.orderNumber}</title>
        <style>
          body { font-family: 'Courier New', monospace; width: 300px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
          .header h1 { margin: 0; font-size: 18px; }
          .header p { margin: 5px 0; font-size: 12px; }
          .info { font-size: 12px; margin-bottom: 10px; }
          .info div { display: flex; justify-content: space-between; }
          .items { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 10px 0; }
          .item { display: flex; justify-content: space-between; font-size: 12px; margin: 5px 0; }
          .item-name { flex: 1; }
          .item-qty { width: 30px; text-align: center; }
          .item-price { width: 60px; text-align: right; }
          .totals { padding: 10px 0; font-size: 12px; }
          .totals div { display: flex; justify-content: space-between; margin: 3px 0; }
          .total-line { font-weight: bold; font-size: 16px; border-top: 2px solid #000; padding-top: 5px; margin-top: 5px; }
          .footer { text-align: center; margin-top: 20px; font-size: 11px; }
          .paid-stamp { text-align: center; font-size: 24px; color: green; margin: 10px 0; }
          @media print { body { width: 100%; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🍺 ${settings.restaurantName}</h1>
          <p>მისამართი: თბილისი</p>
          <p>ტელ: +995 XXX XXX XXX</p>
        </div>
        
        <div class="info">
          <div><span>ქვითარი:</span><span>#${receiptOrder.orderNumber}</span></div>
          <div><span>მაგიდა:</span><span>${receiptOrder.tableNumber}</span></div>
          <div><span>თარიღი:</span><span>${moment(receiptOrder.createdAt).format('DD/MM/YYYY HH:mm')}</span></div>
          ${receiptOrder.guestName ? `<div><span>სტუმარი:</span><span>${receiptOrder.guestName}</span></div>` : ''}
          ${receiptOrder.roomNumber ? `<div><span>ოთახი:</span><span>#${receiptOrder.roomNumber}</span></div>` : ''}
        </div>
        
        <div class="items">
          ${(receiptOrder.items || []).map(item => `
            <div class="item">
              <span class="item-name">${item.name}</span>
              <span class="item-qty">x${item.quantity}</span>
              <span class="item-price">₾${item.total.toFixed(2)}</span>
            </div>
          `).join('')}
        </div>
        
        <div class="totals">
          <div><span>ჯამი:</span><span>₾${(receiptOrder.subtotal || 0).toFixed(2)}</span></div>
          ${(receiptOrder.tax || 0) > 0 ? `<div><span>დღგ (${settings.taxRate}%):</span><span>₾${(receiptOrder.tax || 0).toFixed(2)}</span></div>` : ''}
          ${(receiptOrder.serviceCharge || 0) > 0 ? `<div><span>მომსახურება:</span><span>₾${(receiptOrder.serviceCharge || 0).toFixed(2)}</span></div>` : ''}
          <div class="total-line"><span>სულ გადასახდელი:</span><span>₾${(receiptOrder.total || 0).toFixed(2)}</span></div>
        </div>
        
        ${receiptOrder.status === 'paid' ? `
          <div class="paid-stamp">✅ გადახდილია</div>
          <div class="info">
            <div><span>გადახდის მეთოდი:</span><span>${
              receiptOrder.paymentMethod === 'cash' ? 'ნაღდი' :
              receiptOrder.paymentMethod === 'card' ? 'ბარათი' :
              receiptOrder.paymentMethod === 'room_charge' ? 'ოთახზე' : 'ინვოისი'
            }</span></div>
            <div><span>გადახდის დრო:</span><span>${moment(receiptOrder.paidAt).format('HH:mm')}</span></div>
          </div>
        ` : ''}
        
        <div class="footer">
          <p>მადლობა რომ გვეწვიეთ!</p>
          <p>გისურვებთ წარმატებებს! 🍻</p>
        </div>
        
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `
    
    printWindow.document.write(receiptHTML)
    printWindow.document.close()
  }

  // Update order item status (KDS)
  const updateItemStatus = (orderId: string, itemId: string, status: OrderItem['status']) => {
    const newOrders = orders.map(order => {
      if (order.id !== orderId) return order
      
      const updatedItems = order.items.map(item =>
        item.id === itemId ? { ...item, status } : item
      )
      
      // Check if all items are ready
      const allReady = updatedItems.every(i => i.status === 'ready' || i.status === 'served')
      
      return {
        ...order,
        items: updatedItems,
        status: allReady ? 'ready' : 'preparing'
      }
    })
    
    saveOrders(newOrders)
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500'
      case 'occupied': return 'bg-red-500'
      case 'reserved': return 'bg-yellow-500'
      case 'cleaning': return 'bg-blue-500'
      default: return 'bg-gray-400'
    }
  }

  // Today's stats
  const todayOrders = orders.filter(o => moment(o.createdAt).isSame(moment(), 'day'))
  const todayRevenue = todayOrders.filter(o => o.status === 'paid').reduce((sum, o) => sum + o.total, 0)
  const activeOrders = orders.filter(o => ['open', 'pending', 'preparing', 'ready', 'served'].includes(o.status))

  // Filter tables by zone
  const zoneTables = tables.filter(t => t.zone === activeZone)

  return (
    <div className="h-full bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-2xl">🍽️</span>
            <div>
              <h1 className="text-xl font-bold">{settings.restaurantName}</h1>
              <p className="text-sm text-gray-500">POS System</p>
            </div>
          </div>
          
          {/* View Tabs */}
          <div className="flex gap-2">
            {[
              { id: 'floor', label: '🗺️ მაგიდები', count: activeOrders.length },
              { id: 'orders', label: '📋 შეკვეთები', count: todayOrders.filter(o => o.status !== 'paid' && o.status !== 'cancelled').length },
              { id: 'kds', label: '👨‍🍳 სამზარეულო', count: orders.filter(o => o.status === 'pending' || o.status === 'preparing').length },
              { id: 'reports', label: '📊 რეპორტი', count: 0 },
              { id: 'reservations', label: '📅 ჯავშნები', count: restaurantReservations.length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id as typeof activeView)}
                className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
                  activeView === tab.id ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs ${activeView === tab.id ? 'bg-white text-blue-500' : 'bg-red-500 text-white'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
          
          {/* Stats */}
          <div className="flex gap-4 text-sm items-center">
            <button
              onClick={() => setShowQRModal(true)}
              className="px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 flex items-center gap-2"
              title="მენიუს QR კოდი"
            >
              📱 QR მენიუ
            </button>
            <div className="text-center">
              <div className="font-bold text-green-600">₾{todayRevenue.toFixed(0)}</div>
              <div className="text-gray-500">დღეს</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-blue-600">{todayOrders.length}</div>
              <div className="text-gray-500">შეკვეთა</div>
            </div>
          </div>
        </div>
      </div>

      {/* Floor Plan View */}
      {activeView === 'floor' && (
        <div className="p-4">
          {/* Zone Tabs */}
          <div className="flex gap-2 mb-4">
            {[
              { id: 'inside', label: '🏠 შიგნით', count: tables.filter(t => t.zone === 'inside').length },
              { id: 'outside', label: '🌳 გარეთ', count: tables.filter(t => t.zone === 'outside').length },
              { id: 'lobby', label: '🚪 ლობი', count: tables.filter(t => t.zone === 'lobby').length }
            ].map(zone => (
              <button
                key={zone.id}
                onClick={() => setActiveZone(zone.id as typeof activeZone)}
                className={`px-4 py-2 rounded-lg font-medium ${
                  activeZone === zone.id ? 'bg-amber-500 text-white' : 'bg-white border'
                }`}
              >
                {zone.label} ({zone.count})
              </button>
            ))}
          </div>

          {/* Floor Plan */}
          <div className="bg-white rounded-xl shadow-sm p-4 min-h-[400px] relative border-2 border-dashed border-gray-200">
            {/* Legend */}
            <div className="absolute top-2 right-2 flex gap-2 text-xs">
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded"></span> თავისუფალი</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500 rounded"></span> დაკავებული</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-500 rounded"></span> რეზერვი</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-500 rounded"></span> იწმინდება</span>
            </div>

            {/* Tables */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              {zoneTables.map(table => {
                const order = getTableOrder(table.id)
                return (
                  <button
                    key={table.id}
                    onClick={() => openTable(table)}
                    className={`p-4 rounded-xl border-2 transition-all hover:scale-105 ${
                      table.status === 'available' ? 'bg-green-50 border-green-300 hover:border-green-500' :
                      table.status === 'occupied' ? 'bg-red-50 border-red-300 hover:border-red-500' :
                      table.status === 'reserved' ? 'bg-yellow-50 border-yellow-300 hover:border-yellow-500' :
                      'bg-blue-50 border-blue-300 hover:border-blue-500'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">{table.shape === 'round' ? '⭕' : '🔲'}</span>
                      <span className={`w-3 h-3 rounded-full ${getStatusColor(table.status)}`}></span>
                    </div>
                    <div className="text-lg font-bold">მაგიდა {table.number}</div>
                    <div className="text-sm text-gray-500">{table.seats} ადგილი</div>
                    {table.status === 'cleaning' && (
                      <div className="mt-2 pt-2 border-t text-sm text-blue-600 font-medium">
                        🧹 იწმინდება
                        <div className="text-xs text-gray-500">დააკლიკე გასათავისუფლებლად</div>
                      </div>
                    )}
                    {order && (
                      <div className="mt-2 pt-2 border-t text-sm">
                        <div className="font-medium text-red-600">₾{order.total.toFixed(2)}</div>
                        <div className="text-gray-500">{order.items.length} კერძი</div>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Orders List View */}
      {activeView === 'orders' && (
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeOrders.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-500">
                <div className="text-4xl mb-2">📋</div>
                <p>აქტიური შეკვეთები არ არის</p>
              </div>
            ) : (
              activeOrders.map(order => (
                <div key={order.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <div className={`px-4 py-2 flex justify-between items-center ${
                    order.status === 'pending' ? 'bg-yellow-100' :
                    order.status === 'preparing' ? 'bg-blue-100' :
                    order.status === 'ready' ? 'bg-green-100' :
                    'bg-gray-100'
                  }`}>
                    <span className="font-bold">მაგიდა {order.tableNumber}</span>
                    <span className="text-sm">#{order.orderNumber}</span>
                  </div>
                  <div className="p-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-500">
                        {order.orderType === 'hotel_guest' ? `🏨 ოთახი ${order.roomNumber}` :
                         order.orderType === 'tour_group' ? `👥 ${order.groupName}` :
                         '🚶 Walk-in'}
                      </span>
                      <span className="text-sm text-gray-500">{moment(order.createdAt).format('HH:mm')}</span>
                    </div>
                    <div className="border-t pt-2 mb-2 max-h-32 overflow-y-auto">
                      {order.items.map(item => (
                        <div key={item.id} className="flex justify-between text-sm py-1">
                          <span className={item.status === 'ready' ? 'text-green-600' : item.status === 'preparing' ? 'text-blue-600' : ''}>
                            {item.quantity}x {item.name}
                          </span>
                          <span>₾{item.total.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between font-bold border-t pt-2">
                      <span>სულ</span>
                      <span>₾{order.total.toFixed(2)}</span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => { 
                          setCurrentOrder(order)
                          const table = tables.find(t => t.id === order.tableId)
                          setSelectedTable(table || null)
                          setShowOrderModal(true) 
                        }}
                        className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200"
                      >
                        ✏️ რედაქტირება
                      </button>
                      <button
                        onClick={() => { setCurrentOrder(order); setShowPaymentModal(true) }}
                        className="flex-1 px-3 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
                      >
                        💳 გადახდა
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Kitchen Display System */}
      {activeView === 'kds' && (
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orders.filter(o => o.status === 'pending' || o.status === 'preparing').length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-500">
                <div className="text-4xl mb-2">👨‍🍳</div>
                <p>შეკვეთები სამზარეულოში არ არის</p>
              </div>
            ) : (
              orders.filter(o => o.status === 'pending' || o.status === 'preparing').map(order => (
                <div key={order.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <div className={`px-4 py-3 ${order.status === 'pending' ? 'bg-yellow-400' : 'bg-blue-400'} text-white`}>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-lg">მაგიდა {order.tableNumber}</span>
                      <span className="text-sm bg-white bg-opacity-30 px-2 py-1 rounded">{moment(order.createdAt).format('HH:mm')}</span>
                    </div>
                  </div>
                  <div className="p-4">
                    {order.items.filter(i => i.status !== 'served').map(item => (
                      <div key={item.id} className={`flex items-center justify-between p-2 mb-2 rounded-lg ${
                        item.status === 'pending' ? 'bg-yellow-50' :
                        item.status === 'preparing' ? 'bg-blue-50' :
                        'bg-green-50'
                      }`}>
                        <div>
                          <div className="font-medium">{item.quantity}x {item.name}</div>
                          {item.notes && <div className="text-xs text-gray-500">{item.notes}</div>}
                        </div>
                        <div className="flex gap-1">
                          {item.status === 'pending' && (
                            <button
                              onClick={() => updateItemStatus(order.id, item.id, 'preparing')}
                              className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
                            >
                              🍳 დაწყება
                            </button>
                          )}
                          {item.status === 'preparing' && (
                            <button
                              onClick={() => updateItemStatus(order.id, item.id, 'ready')}
                              className="px-3 py-1 bg-green-500 text-white rounded text-sm"
                            >
                              ✅ მზადაა
                            </button>
                          )}
                          {item.status === 'ready' && (
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm">მზადაა</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Settings View */}
      {/* Reservations View */}
      {activeView === 'reservations' && (
        <div className="p-4 max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm p-6">
            {/* Header with Date Picker */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">📅 რესტორნის ჯავშნები</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedDate(moment(selectedDate).subtract(1, 'day').format('YYYY-MM-DD'))}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  ←
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-4 py-2 border rounded-lg font-medium"
                />
                <button
                  onClick={() => setSelectedDate(moment(selectedDate).add(1, 'day').format('YYYY-MM-DD'))}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  →
                </button>
                <button
                  onClick={() => setSelectedDate(moment().format('YYYY-MM-DD'))}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  დღეს
                </button>
              </div>
            </div>

            {/* Date Display */}
            <div className="text-center mb-6">
              <div className="text-2xl font-bold text-gray-800">
                {moment(selectedDate).format('dddd, D MMMM YYYY')}
              </div>
              <div className="text-gray-500">
                {restaurantReservations.length} ჯავშანი
              </div>
            </div>

            {/* Reservations List */}
            {restaurantReservations.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-5xl mb-4">📭</div>
                <p>ამ თარიღზე ჯავშნები არ არის</p>
              </div>
            ) : (
              <div className="space-y-3">
                {restaurantReservations
                  .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
                  .map((reservation) => (
                    <div
                      key={reservation.id}
                      className={`p-4 rounded-xl border-2 ${
                        reservation.status === 'confirmed' 
                          ? 'border-green-200 bg-green-50' 
                          : reservation.status === 'cancelled'
                          ? 'border-red-200 bg-red-50'
                          : 'border-yellow-200 bg-yellow-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {/* Time */}
                          <div className="text-center bg-white px-4 py-2 rounded-lg shadow-sm">
                            <div className="text-2xl font-bold text-amber-600">{reservation.startTime}</div>
                          </div>
                          
                          {/* Guest Info */}
                          <div>
                            <div className="font-bold text-lg">{reservation.guestName}</div>
                            <div className="text-gray-600 flex items-center gap-3">
                              <span>👥 {reservation.guests} სტუმარი</span>
                              {reservation.guestPhone && (
                                <a href={`tel:${reservation.guestPhone}`} className="text-blue-600 hover:underline">
                                  📞 {reservation.guestPhone}
                                </a>
                              )}
                            </div>
                            {reservation.services?.occasion && (
                              <div className="text-purple-600 text-sm mt-1">
                                🎉 {reservation.services.occasion}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Status & Actions */}
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            reservation.status === 'confirmed' 
                              ? 'bg-green-200 text-green-800' 
                              : reservation.status === 'cancelled'
                              ? 'bg-red-200 text-red-800'
                              : 'bg-yellow-200 text-yellow-800'
                          }`}>
                            {reservation.status === 'confirmed' ? '✓ დადასტურებული' : 
                             reservation.status === 'cancelled' ? '✗ გაუქმებული' : 
                             '⏳ მოლოდინში'}
                          </span>
                          <div className="text-xs text-gray-400">
                            {reservation.bookingNumber}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* Summary */}
            {restaurantReservations.length > 0 && (
              <div className="mt-6 pt-4 border-t flex justify-between text-sm text-gray-600">
                <span>სულ სტუმრები: {restaurantReservations.reduce((sum, r) => sum + (r.guests || 0), 0)}</span>
                <span>ვებსაიტიდან: {restaurantReservations.filter(r => r.services?.source === 'website').length}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Order Modal */}
      {showOrderModal && currentOrder && selectedTable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex">
            {/* Left: Menu */}
            <div className="w-2/3 border-r flex flex-col">
              <div className="p-4 border-b bg-gray-50">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">მაგიდა {selectedTable.number} - მენიუ</h3>
                  <div className="flex gap-2">
                    <select
                      value={currentOrder.orderType || 'walk_in'}
                      onChange={(e) => setCurrentOrder({ ...currentOrder, orderType: e.target.value as RestaurantOrder['orderType'] })}
                      className="px-3 py-1 border rounded-lg text-sm"
                    >
                      <option value="walk_in">🚶 Walk-in</option>
                      <option value="hotel_guest">🏨 სასტუმროს სტუმარი</option>
                      <option value="tour_group">👥 ტურისტული ჯგუფი</option>
                    </select>
                  </div>
                </div>
                
                {currentOrder.orderType === 'hotel_guest' && (
                  <select
                    value={currentOrder.roomNumber || ''}
                    onChange={async (e) => {
                      const roomNumber = e.target.value
                      if (!roomNumber) {
                        setCurrentOrder({ ...currentOrder, roomNumber: '', reservationId: undefined, guestName: '' })
                        return
                      }
                      // Find reservation for this room
                      const reservation = checkedInRooms.find(r => 
                        r.roomNumber === roomNumber || r.roomId === roomNumber
                      )
                      setCurrentOrder({ 
                        ...currentOrder, 
                        roomNumber,
                        reservationId: reservation?.id,
                        guestName: reservation?.guestName || ''
                      })
                    }}
                    className="mt-2 px-3 py-2 border rounded-lg w-full"
                  >
                    <option value="">-- აირჩიეთ ოთახი --</option>
                    {checkedInRooms.map(res => (
                      <option key={res.id} value={res.roomNumber || res.roomId}>
                        🏨 {res.roomNumber || res.roomId} - {res.guestName}
                      </option>
                    ))}
                    {checkedInRooms.length === 0 && (
                      <option value="" disabled>არ არის შემოსული სტუმარი</option>
                    )}
                  </select>
                )}
                
                {currentOrder.orderType === 'tour_group' && (
                  <div className="mt-2 space-y-2">
                    <select
                      value={currentOrder.companyId || ''}
                      onChange={(e) => {
                        const company = CompanyService.getById(e.target.value)
                        setCurrentOrder({ 
                          ...currentOrder, 
                          companyId: e.target.value,
                          groupName: company?.name || currentOrder.groupName
                        })
                      }}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="">-- აირჩიეთ კომპანია --</option>
                      {CompanyService.getActive().map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="ჯგუფის სახელი (ან ხელით)"
                        value={currentOrder.groupName || ''}
                        onChange={(e) => setCurrentOrder({ ...currentOrder, groupName: e.target.value })}
                        className="px-3 py-2 border rounded-lg flex-1"
                      />
                      <input
                        type="number"
                        placeholder="რაოდენობა"
                        value={currentOrder.groupSize || ''}
                        onChange={(e) => setCurrentOrder({ ...currentOrder, groupSize: Number(e.target.value) })}
                        className="px-3 py-2 border rounded-lg w-24"
                      />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Categories + Items */}
              <div className="flex-1 overflow-hidden flex">
                {/* Categories */}
                <div className="w-48 border-r bg-gray-50 overflow-y-auto">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`w-full p-3 text-left border-b ${!selectedCategory ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
                  >
                    📋 ყველა
                  </button>
                  {categories.filter(c => c.isActive).map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`w-full p-3 text-left border-b ${selectedCategory === cat.id ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
                    >
                      {cat.icon} {cat.name}
                    </button>
                  ))}
                  <div className="border-t-2 border-amber-300">
                    <div className="p-2 bg-amber-50 text-xs font-medium text-amber-700">🍺 დეგუსტაციები</div>
                    {beerTastings.filter(t => t.isActive).map(tasting => (
                      <button
                        key={tasting.id}
                        onClick={() => addBeerTasting(tasting)}
                        className="w-full p-2 text-left text-sm hover:bg-amber-50 border-b"
                      >
                        <div>{tasting.name}</div>
                        <div className="text-amber-600 font-medium">₾{tasting.price}</div>
                      </button>
                    ))}
                  </div>
                  {currentOrder.orderType === 'tour_group' && (
                    <div className="border-t-2 border-purple-300">
                      <div className="p-2 bg-purple-50 text-xs font-medium text-purple-700">👥 ჯგუფის მენიუ</div>
                      {groupMenus.filter(m => m.isActive).map(menu => (
                        <button
                          key={menu.id}
                          onClick={() => {
                            if (!currentOrder.groupSize || currentOrder.groupSize < 1) {
                              alert('გთხოვთ მიუთითოთ ჯგუფის რაოდენობა')
                              return
                            }
                            addGroupMenu(menu, currentOrder.groupSize)
                          }}
                          className="w-full p-2 text-left text-sm hover:bg-purple-50 border-b"
                        >
                          <div>{menu.name}</div>
                          <div className="text-purple-600 font-medium">₾{menu.pricePerPerson}/კაცი</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Items Grid */}
                <div className="flex-1 p-4 overflow-y-auto">
                  <div className="grid grid-cols-3 gap-2">
                    {menuItems
                      .filter(i => i.isAvailable && (!selectedCategory || i.categoryId === selectedCategory))
                      .map(item => (
                        <button
                          key={item.id}
                          onClick={() => addItemToOrder(item)}
                          className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 text-left"
                        >
                          <div className="font-medium text-sm">{item.name}</div>
                          <div className="text-green-600 font-bold">₾{item.price}</div>
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right: Order */}
            <div className="w-1/3 flex flex-col">
              <div className="p-4 border-b bg-gray-50">
                <h3 className="font-bold">🧾 შეკვეთა</h3>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4">
                {(currentOrder.items || []).length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    აირჩიეთ კერძები
                  </div>
                ) : (
                  (currentOrder.items || []).map(item => (
                    <div key={item.id} className="flex items-center justify-between py-2 border-b">
                      <div className="flex-1">
                        <div className="text-sm font-medium">{item.name}</div>
                        <div className="text-xs text-gray-500">₾{item.unitPrice}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                          className="w-6 h-6 bg-gray-200 rounded text-sm"
                        >-</button>
                        <span className="w-6 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                          className="w-6 h-6 bg-gray-200 rounded text-sm"
                        >+</button>
                        <span className="w-16 text-right font-medium">₾{item.total.toFixed(2)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {/* Totals */}
              <div className="p-4 border-t bg-gray-50">
                <div className="space-y-1 mb-4">
                  <div className="flex justify-between text-sm">
                    <span>ქვეჯამი</span>
                    <span>₾{(currentOrder.subtotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>დღგ ({settings.taxRate}%)</span>
                    <span>₾{(currentOrder.tax || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>სულ</span>
                    <span>₾{(currentOrder.total || 0).toFixed(2)}</span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowOrderModal(false); setCurrentOrder(null); setSelectedTable(null) }}
                    className="flex-1 px-4 py-2 bg-gray-200 rounded-lg"
                  >
                    დახურვა
                  </button>
                  <button
                    onClick={sendToKitchen}
                    disabled={!(currentOrder.items || []).length}
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50"
                  >
                    🍳 სამზარეულოში
                  </button>
                </div>
                
                {currentOrder.id && (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={showReceiptPreview}
                      className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg"
                    >
                      🧾 ქვითარი
                    </button>
                    <button
                      onClick={() => setShowPaymentModal(true)}
                      className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg"
                    >
                      💳 გადახდა
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && currentOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">💳 გადახდა</h3>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex justify-between text-lg font-bold">
                <span>სულ გადასახდელი</span>
                <span>₾{(currentOrder.total || 0).toFixed(2)}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => processPayment('cash')}
                className="p-4 bg-green-100 rounded-xl hover:bg-green-200 text-center"
              >
                <div className="text-2xl mb-1">💵</div>
                <div className="font-medium">ნაღდი</div>
              </button>
              <button
                onClick={() => processPayment('card')}
                className="p-4 bg-blue-100 rounded-xl hover:bg-blue-200 text-center"
              >
                <div className="text-2xl mb-1">💳</div>
                <div className="font-medium">ბარათი</div>
              </button>
              {currentOrder.orderType === 'hotel_guest' && currentOrder.roomNumber && (
                <button
                  onClick={() => processPayment('room_charge')}
                  className="p-4 bg-purple-100 rounded-xl hover:bg-purple-200 text-center"
                >
                  <div className="text-2xl mb-1">🏨</div>
                  <div className="font-medium">ოთახზე</div>
                  <div className="text-xs text-gray-500">#{currentOrder.roomNumber}</div>
                </button>
              )}
              {currentOrder.orderType === 'tour_group' && (
                <button
                  onClick={() => processPayment('invoice')}
                  className="p-4 bg-yellow-100 rounded-xl hover:bg-yellow-200 text-center"
                >
                  <div className="text-2xl mb-1">📄</div>
                  <div className="font-medium">ინვოისი</div>
                </button>
              )}
            </div>
            
            <button
              onClick={() => setShowPaymentModal(false)}
              className="w-full px-4 py-2 bg-gray-200 rounded-lg"
            >
              გაუქმება
            </button>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceiptModal && receiptOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-sm max-h-[90vh] overflow-auto">
            {/* Receipt Header */}
            <div className="bg-amber-50 p-4 text-center border-b">
              <div className="text-3xl mb-1">🍺</div>
              <h2 className="text-lg font-bold">{settings.restaurantName}</h2>
              <p className="text-xs text-gray-500">თბილისი • +995 XXX XXX XXX</p>
            </div>

            {/* Receipt Info */}
            <div className="p-4 border-b text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">ქვითარი:</span>
                <span className="font-medium">#{receiptOrder.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">მაგიდა:</span>
                <span className="font-medium">{receiptOrder.tableNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">თარიღი:</span>
                <span>{moment(receiptOrder.createdAt).format('DD/MM/YYYY HH:mm')}</span>
              </div>
              {receiptOrder.guestName && (
                <div className="flex justify-between">
                  <span className="text-gray-500">სტუმარი:</span>
                  <span>{receiptOrder.guestName}</span>
                </div>
              )}
              {receiptOrder.roomNumber && (
                <div className="flex justify-between">
                  <span className="text-gray-500">ოთახი:</span>
                  <span>#{receiptOrder.roomNumber}</span>
                </div>
              )}
            </div>

            {/* Receipt Items */}
            <div className="p-4 border-b">
              <div className="text-xs text-gray-500 mb-2 flex justify-between">
                <span>პროდუქტი</span>
                <span>რაოდ. × ფასი = ჯამი</span>
              </div>
              {(receiptOrder.items || []).map(item => (
                <div key={item.id} className="flex justify-between py-1 text-sm">
                  <span className="flex-1">{item.name}</span>
                  <span className="text-gray-600">
                    {item.quantity} × ₾{item.unitPrice.toFixed(0)} = <b>₾{item.total.toFixed(2)}</b>
                  </span>
                </div>
              ))}
            </div>

            {/* Receipt Totals */}
            <div className="p-4 border-b bg-gray-50">
              <div className="flex justify-between text-sm">
                <span>ქვეჯამი:</span>
                <span>₾{(receiptOrder.subtotal || 0).toFixed(2)}</span>
              </div>
              {(receiptOrder.tax || 0) > 0 && (
                <div className="flex justify-between text-sm text-gray-500">
                  <span>დღგ ({settings.taxRate}%):</span>
                  <span>₾{(receiptOrder.tax || 0).toFixed(2)}</span>
                </div>
              )}
              {(receiptOrder.serviceCharge || 0) > 0 && (
                <div className="flex justify-between text-sm text-gray-500">
                  <span>მომსახურება:</span>
                  <span>₾{(receiptOrder.serviceCharge || 0).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold mt-2 pt-2 border-t">
                <span>სულ:</span>
                <span>₾{(receiptOrder.total || 0).toFixed(2)}</span>
              </div>
            </div>

            {/* Paid Status */}
            {receiptOrder.status === 'paid' && (
              <div className="p-4 bg-green-50 text-center">
                <div className="text-3xl mb-1">✅</div>
                <div className="text-green-700 font-bold">გადახდილია</div>
                <div className="text-sm text-gray-500">
                  {receiptOrder.paymentMethod === 'cash' ? '💵 ნაღდი' :
                   receiptOrder.paymentMethod === 'card' ? '💳 ბარათი' :
                   receiptOrder.paymentMethod === 'room_charge' ? '🏨 ოთახზე' : '📄 ინვოისი'}
                  {' • '}{moment(receiptOrder.paidAt).format('HH:mm')}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="p-4 text-center text-sm text-gray-500">
              <p>მადლობა რომ გვეწვიეთ! 🍻</p>
            </div>

            {/* Actions */}
            <div className="p-4 border-t flex gap-2">
              <button
                onClick={() => setShowReceiptModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 rounded-lg"
              >
                დახურვა
              </button>
              <button
                onClick={printReceipt}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg"
              >
                🖨️ ბეჭდვა
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reports View */}
      {activeView === 'reports' && (
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {/* Today's Stats Cards */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-3xl mb-2">💰</div>
              <div className="text-2xl font-bold text-green-600">₾{todayRevenue.toFixed(2)}</div>
              <div className="text-sm text-gray-500">დღის შემოსავალი</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-3xl mb-2">🧾</div>
              <div className="text-2xl font-bold text-blue-600">{todayOrders.filter(o => o.status === 'paid').length}</div>
              <div className="text-sm text-gray-500">გადახდილი შეკვეთა</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-3xl mb-2">⏳</div>
              <div className="text-2xl font-bold text-yellow-600">{todayOrders.filter(o => o.status !== 'paid' && o.status !== 'cancelled').length}</div>
              <div className="text-sm text-gray-500">აქტიური შეკვეთა</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-3xl mb-2">📊</div>
              <div className="text-2xl font-bold text-purple-600">
                ₾{todayOrders.filter(o => o.status === 'paid').length > 0 
                  ? (todayRevenue / todayOrders.filter(o => o.status === 'paid').length).toFixed(0) 
                  : '0'}
              </div>
              <div className="text-sm text-gray-500">საშ. ქვითარი</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Payment Methods */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-bold mb-4">💳 გადახდის მეთოდები</h3>
              <div className="space-y-3">
                {['cash', 'card', 'room_charge', 'invoice'].map(method => {
                  const methodOrders = todayOrders.filter(o => o.status === 'paid' && o.paymentMethod === method)
                  const methodTotal = methodOrders.reduce((sum, o) => sum + o.total, 0)
                  const methodLabel = method === 'cash' ? '💵 ნაღდი' :
                                     method === 'card' ? '💳 ბარათი' :
                                     method === 'room_charge' ? '🏨 ოთახზე' : '📄 ინვოისი'
                  if (methodOrders.length === 0) return null
                  return (
                    <div key={method} className="flex justify-between items-center">
                      <span>{methodLabel}</span>
                      <div className="text-right">
                        <span className="font-bold">₾{methodTotal.toFixed(2)}</span>
                        <span className="text-sm text-gray-500 ml-2">({methodOrders.length} შეკვ.)</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Tables Stats */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-bold mb-4">🗺️ მაგიდების სტატისტიკა</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {tables.map(table => {
                  const tableOrders = todayOrders.filter(o => o.tableId === table.id && o.status === 'paid')
                  const tableTotal = tableOrders.reduce((sum, o) => sum + o.total, 0)
                  if (tableOrders.length === 0) return null
                  return (
                    <div key={table.id} className="flex justify-between items-center text-sm">
                      <span>მაგიდა {table.number}</span>
                      <div>
                        <span className="font-medium">₾{tableTotal.toFixed(0)}</span>
                        <span className="text-gray-400 ml-2">({tableOrders.length})</span>
                      </div>
                    </div>
                  )
                }).filter(Boolean)}
                {tables.every(t => todayOrders.filter(o => o.tableId === t.id && o.status === 'paid').length === 0) && (
                  <div className="text-center text-gray-400 py-4">დღეს გაყიდვები არ ყოფილა</div>
                )}
              </div>
            </div>

            {/* Top Items */}
            <div className="bg-white rounded-xl p-4 shadow-sm md:col-span-2">
              <h3 className="font-bold mb-4">🏆 ყველაზე გაყიდვადი</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(() => {
                  const itemStats: { [key: string]: { name: string, qty: number, total: number } } = {}
                  todayOrders.filter(o => o.status === 'paid').forEach(order => {
                    (order.items || []).forEach(item => {
                      if (!itemStats[item.name]) {
                        itemStats[item.name] = { name: item.name, qty: 0, total: 0 }
                      }
                      itemStats[item.name].qty += item.quantity
                      itemStats[item.name].total += item.total
                    })
                  })
                  return Object.values(itemStats)
                    .sort((a, b) => b.qty - a.qty)
                    .slice(0, 8)
                    .map((item, i) => (
                      <div key={i} className="bg-gray-50 rounded-lg p-3 text-center">
                        <div className="font-medium text-sm truncate">{item.name}</div>
                        <div className="text-lg font-bold text-blue-600">{item.qty}x</div>
                        <div className="text-xs text-gray-500">₾{item.total.toFixed(0)}</div>
                      </div>
                    ))
                })()}
                {todayOrders.filter(o => o.status === 'paid').length === 0 && (
                  <div className="col-span-4 text-center text-gray-400 py-8">დღეს გაყიდვები არ ყოფილა</div>
                )}
              </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-xl p-4 shadow-sm md:col-span-2">
              <h3 className="font-bold mb-4">📋 ბოლო შეკვეთები</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">#</th>
                      <th className="px-3 py-2 text-left">მაგიდა</th>
                      <th className="px-3 py-2 text-left">დრო</th>
                      <th className="px-3 py-2 text-left">სტატუსი</th>
                      <th className="px-3 py-2 text-right">ჯამი</th>
                      <th className="px-3 py-2 text-center">ქვითარი</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayOrders.slice().reverse().slice(0, 10).map(order => (
                      <tr key={order.id} className="border-b hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium">{order.orderNumber}</td>
                        <td className="px-3 py-2">{order.tableNumber}</td>
                        <td className="px-3 py-2">{moment(order.createdAt).format('HH:mm')}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            order.status === 'paid' ? 'bg-green-100 text-green-700' :
                            order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {order.status === 'paid' ? 'გადახდილი' :
                             order.status === 'cancelled' ? 'გაუქმებული' : 'აქტიური'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-medium">₾{order.total.toFixed(2)}</td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => {
                              setReceiptOrder(order)
                              setReceiptType(order.status === 'paid' ? 'paid' : 'preview')
                              setShowReceiptModal(true)
                            }}
                            className="text-blue-500 hover:text-blue-700"
                          >
                            🧾
                          </button>
                        </td>
                      </tr>
                    ))}
                    {todayOrders.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-3 py-8 text-center text-gray-400">
                          დღეს შეკვეთები არ ყოფილა
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* QR Code Modal */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">📱 მენიუს QR კოდი</h2>
              <button 
                onClick={() => setShowQRModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                &times;
              </button>
            </div>
            
            <div className="text-center">
              {/* QR Code - using external API */}
              <div className="bg-white p-4 rounded-lg inline-block border-2 border-gray-200 mb-4">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent('https://breweryhouse.ge/menu')}`}
                  alt="Menu QR Code"
                  className="w-48 h-48"
                />
              </div>
              
              <p className="text-gray-600 mb-2">დაასკანერეთ მენიუს სანახავად</p>
              <p className="text-sm text-blue-600 font-medium mb-6">breweryhouse.ge/menu</p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const link = document.createElement('a')
                    link.href = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent('https://breweryhouse.ge/menu')}`
                    link.download = 'menu-qr-code.png'
                    link.click()
                  }}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  📥 ჩამოტვირთვა
                </button>
                <button
                  onClick={() => {
                    const printWindow = window.open('', '_blank')
                    if (printWindow) {
                      printWindow.document.write(`
                        <html>
                          <head><title>Menu QR Code</title></head>
                          <body style="text-align: center; padding: 40px;">
                            <h1 style="font-family: sans-serif;">🍽️ ${settings.restaurantName}</h1>
                            <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent('https://breweryhouse.ge/menu')}" />
                            <p style="font-family: sans-serif; font-size: 18px; margin-top: 20px;">დაასკანერეთ მენიუს სანახავად</p>
                            <p style="font-family: sans-serif; color: #2563eb;">breweryhouse.ge/menu</p>
                          </body>
                        </html>
                      `)
                      printWindow.document.close()
                      printWindow.print()
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  🖨️ ბეჭდვა
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}