'use client'

import React, { useState } from 'react'

// ==================== TYPES ====================
export interface MenuCategory {
  id: string
  name: string
  nameEn: string
  icon: string
  sortOrder: number
  isActive: boolean
}

export interface MenuItem {
  id: string
  categoryId: string
  name: string
  nameEn: string
  description: string
  descriptionEn: string
  price: number
  preparationTime: number
  isAvailable: boolean
  isActive: boolean
  imageUrl: string
}

export interface TableConfig {
  id: string
  number: string
  seats: number
  zone: 'inside' | 'outside' | 'lobby'
  status: 'available' | 'occupied' | 'reserved' | 'cleaning'
  shape: 'rect' | 'round'
}

export interface BeerTasting {
  id: string
  name: string
  nameEn: string
  description: string
  beers: string[]
  price: number
  duration: number
  isActive: boolean
}

// ჯგუფის მენიუს კერძი
export interface GroupMenuItem {
  id: string
  name: string
  nameEn?: string
  quantity: number      // რამდენი პორცია კაცზე
  unitPrice: number     // ფასი ერთეულზე
  category?: string     // საწყისი, მთავარი, დესერტი
}

export interface GroupMenu {
  id: string
  name: string
  nameEn: string
  description: string
  pricePerPerson: number
  items: GroupMenuItem[]  // დეტალური ჩამონათვალი
  includesDrinks?: boolean
  includesDessert?: boolean
  minPersons?: number
  maxPersons?: number
  isActive: boolean
}

export interface RestaurantSettings {
  enabled: boolean
  name: string
  openTime: string
  closeTime: string
  breakfastStart: string
  breakfastEnd: string
  lunchStart: string
  lunchEnd: string
  dinnerStart: string
  dinnerEnd: string
  taxRate: number
  serviceCharge: number
  allowRoomCharge: boolean
  requireTableNumber: boolean
  tables: string[]
}

export const DEFAULT_RESTAURANT_SETTINGS: RestaurantSettings = {
  enabled: false,
  name: 'Brewery House Restaurant',
  openTime: '08:00',
  closeTime: '22:00',
  breakfastStart: '08:00',
  breakfastEnd: '10:30',
  lunchStart: '12:00',
  lunchEnd: '15:00',
  dinnerStart: '18:00',
  dinnerEnd: '22:00',
  taxRate: 18,
  serviceCharge: 0,
  allowRoomCharge: true,
  requireTableNumber: false,
  tables: ['1', '2', '3', '4', '5']
}

export const DEFAULT_TABLES: TableConfig[] = [
  { id: 't1', number: '1', seats: 4, zone: 'inside', status: 'available', shape: 'rect' },
  { id: 't2', number: '2', seats: 4, zone: 'inside', status: 'available', shape: 'rect' },
  { id: 't3', number: '3', seats: 6, zone: 'inside', status: 'available', shape: 'rect' },
  { id: 't4', number: '4', seats: 6, zone: 'inside', status: 'available', shape: 'rect' },
  { id: 't5', number: '5', seats: 4, zone: 'outside', status: 'available', shape: 'round' },
  { id: 't6', number: '6', seats: 4, zone: 'outside', status: 'available', shape: 'round' },
  { id: 't7', number: '7', seats: 6, zone: 'outside', status: 'available', shape: 'round' },
  { id: 't8', number: 'L1', seats: 6, zone: 'lobby', status: 'available', shape: 'rect' }
]

export const DEFAULT_BEER_TASTINGS: BeerTasting[] = [
  { id: 'bt1', name: '4 ლუდის დეგუსტაცია', nameEn: '4 Beer Tasting', description: '4 სხვადასხვა ხელნაკეთი ლუდი', beers: ['Pilsner', 'IPA', 'Stout', 'Wheat'], price: 25, duration: 30, isActive: true },
  { id: 'bt2', name: '6 ლუდის დეგუსტაცია', nameEn: '6 Beer Tasting', description: '6 სხვადასხვა ხელნაკეთი ლუდი', beers: ['Pilsner', 'IPA', 'Stout', 'Wheat', 'Amber', 'Porter'], price: 35, duration: 45, isActive: true },
  { id: 'bt3', name: 'ბრიუმასტერის ტური', nameEn: 'Brewmaster Tour', description: 'ყველა ლუდი + ტური ლუდსახარშში', beers: ['All beers'], price: 50, duration: 60, isActive: true }
]

export const DEFAULT_GROUP_MENUS: GroupMenu[] = [
  { 
    id: 'gm1', 
    name: 'ქართული მენიუ', 
    nameEn: 'Georgian Menu', 
    description: 'ტრადიციული ქართული კერძები', 
    pricePerPerson: 45, 
    items: [
      { id: 'gi1', name: 'ხაჭაპური', nameEn: 'Khachapuri', quantity: 1, unitPrice: 8, category: 'appetizer' },
      { id: 'gi2', name: 'ფხალი', nameEn: 'Pkhali', quantity: 1, unitPrice: 5, category: 'appetizer' },
      { id: 'gi3', name: 'მწვადი', nameEn: 'Mtsvadi', quantity: 1, unitPrice: 15, category: 'main' },
      { id: 'gi4', name: 'ლობიო', nameEn: 'Lobio', quantity: 1, unitPrice: 6, category: 'main' },
      { id: 'gi5', name: 'ტკემალი/აჯიკა', nameEn: 'Sauces', quantity: 1, unitPrice: 3, category: 'side' },
      { id: 'gi6', name: 'პური', nameEn: 'Bread', quantity: 1, unitPrice: 2, category: 'side' },
      { id: 'gi7', name: 'ლიმონათი', nameEn: 'Lemonade', quantity: 1, unitPrice: 6, category: 'drink' }
    ],
    includesDrinks: true,
    minPersons: 4,
    isActive: true 
  },
  { 
    id: 'gm2', 
    name: 'ლუდის მენიუ', 
    nameEn: 'Beer Menu', 
    description: 'ლუდთან შესაფერისი კერძები + დეგუსტაცია', 
    pricePerPerson: 55, 
    items: [
      { id: 'gi8', name: 'ლუდის დეგუსტაცია (4 ლუდი)', nameEn: '4 Beer Tasting', quantity: 1, unitPrice: 25, category: 'drink' },
      { id: 'gi9', name: 'კუპატები', nameEn: 'Kupati', quantity: 1, unitPrice: 10, category: 'appetizer' },
      { id: 'gi10', name: 'ხინკალი (5 ცალი)', nameEn: 'Khinkali x5', quantity: 1, unitPrice: 10, category: 'main' },
      { id: 'gi11', name: 'კარტოფილი ფრი', nameEn: 'French Fries', quantity: 1, unitPrice: 6, category: 'side' },
      { id: 'gi12', name: 'სალათი', nameEn: 'Salad', quantity: 1, unitPrice: 4, category: 'side' }
    ],
    includesDrinks: true,
    minPersons: 2,
    isActive: true 
  },
  { 
    id: 'gm3', 
    name: 'პრემიუმ მენიუ', 
    nameEn: 'Premium Menu', 
    description: 'სრული გასტრონომიული გამოცდილება', 
    pricePerPerson: 75, 
    items: [
      { id: 'gi13', name: 'ლუდის დეგუსტაცია (6 ლუდი)', nameEn: '6 Beer Tasting', quantity: 1, unitPrice: 35, category: 'drink' },
      { id: 'gi14', name: 'აჯარული ხაჭაპური', nameEn: 'Adjarian Khachapuri', quantity: 1, unitPrice: 12, category: 'appetizer' },
      { id: 'gi15', name: 'ოჯახური', nameEn: 'Ojakhuri', quantity: 1, unitPrice: 18, category: 'main' },
      { id: 'gi16', name: 'შემწვარი ხორცი', nameEn: 'Grilled Meat', quantity: 1, unitPrice: 20, category: 'main' },
      { id: 'gi17', name: 'სეზონური სალათი', nameEn: 'Seasonal Salad', quantity: 1, unitPrice: 8, category: 'side' },
      { id: 'gi18', name: 'დესერტი', nameEn: 'Dessert', quantity: 1, unitPrice: 7, category: 'dessert' }
    ],
    includesDrinks: true,
    includesDessert: true,
    minPersons: 4,
    isActive: true 
  }
]

interface Props {
  settings: RestaurantSettings
  setSettings: (s: RestaurantSettings) => void
  categories: MenuCategory[]
  setCategories: (c: MenuCategory[]) => void
  menuItems: MenuItem[]
  setMenuItems: (m: MenuItem[]) => void
  onSave: () => void
  isSaving: boolean
}

export default function RestaurantSettingsSection({ settings, setSettings, categories, setCategories, menuItems, setMenuItems, onSave, isSaving }: Props) {
  const [activeTab, setActiveTab] = useState<'settings' | 'tables' | 'categories' | 'menu' | 'tastings' | 'groups'>('settings')
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null)
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showMenuItemModal, setShowMenuItemModal] = useState(false)
  
  const [tables, setTables] = useState<TableConfig[]>(DEFAULT_TABLES)
  const [editingTable, setEditingTable] = useState<TableConfig | null>(null)
  const [showTableModal, setShowTableModal] = useState(false)
  
  const [beerTastings, setBeerTastings] = useState<BeerTasting[]>(DEFAULT_BEER_TASTINGS)
  const [editingTasting, setEditingTasting] = useState<BeerTasting | null>(null)
  const [showTastingModal, setShowTastingModal] = useState(false)
  
  const [groupMenus, setGroupMenus] = useState<GroupMenu[]>(DEFAULT_GROUP_MENUS)
  const [editingGroupMenu, setEditingGroupMenu] = useState<GroupMenu | null>(null)
  const [showGroupMenuModal, setShowGroupMenuModal] = useState(false)

  // Load data from API on mount
  React.useEffect(() => {
    const loadData = async () => {
      // Load tables
      try {
        const res = await fetch('/api/hotel/restaurant-tables')
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data) && data.length > 0) {
            setTables(data.map((t: any) => ({
              id: t.id,
              number: t.number,
              seats: t.seats || 4,
              zone: t.zone || 'inside',
              status: t.status || 'available',
              shape: t.shape || 'rect'
            })))
          }
        }
      } catch (e) { console.error('Error loading tables:', e) }

      // Load beer tastings
      try {
        const res = await fetch('/api/hotel/beer-tastings')
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data) && data.length > 0) {
            setBeerTastings(data.map((t: any) => ({
              id: t.id,
              name: t.name,
              nameEn: t.nameEn || '',
              description: t.description || '',
              beers: t.beers || [],
              price: Number(t.price),
              duration: t.duration || 30,
              isActive: t.isActive ?? true
            })))
          }
        }
      } catch (e) { console.error('Error loading tastings:', e) }

      // Load group menus
      try {
        const res = await fetch('/api/hotel/group-menus')
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data) && data.length > 0) {
            setGroupMenus(data.map((m: any) => ({
              id: m.id,
              name: m.name,
              nameEn: m.nameEn || '',
              description: m.description || '',
              pricePerPerson: Number(m.pricePerPerson),
              items: (m.items || []).map((i: any) => ({
                id: i.id,
                name: i.name,
                nameEn: i.nameEn || '',
                quantity: i.quantity || 1,
                unitPrice: Number(i.unitPrice),
                category: i.category
              })),
              includesDrinks: m.includesDrinks ?? false,
              includesDessert: m.includesDessert ?? false,
              minPersons: m.minPersons,
              maxPersons: m.maxPersons,
              isActive: m.isActive ?? true
            })))
          }
        }
      } catch (e) { console.error('Error loading group menus:', e) }
    }
    loadData()
  }, [])

  const CATEGORY_ICONS = ['🍖', '🥟', '🐟', '🥗', '🍺', '🍰', '🍕', '🥘', '🍜', '☕']
  const ZONES = [{ id: 'inside', label: '🏠 შიგნით' }, { id: 'outside', label: '🌳 გარეთ' }, { id: 'lobby', label: '🚪 ლობი' }]

  // Save functions with API
  const saveTables = async (t: TableConfig[]) => {
    setTables(t)
    try {
      await fetch('/api/hotel/restaurant-tables', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(t)
      })
    } catch (e) { console.error('Error saving tables:', e) }
  }
  
  const saveBeerTastings = async (t: BeerTasting[]) => {
    setBeerTastings(t)
    try {
      await fetch('/api/hotel/beer-tastings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(t)
      })
    } catch (e) { console.error('Error saving tastings:', e) }
  }
  
  const saveGroupMenus = async (m: GroupMenu[]) => {
    setGroupMenus(m)
    try {
      await fetch('/api/hotel/group-menus', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(m)
      })
    } catch (e) { console.error('Error saving group menus:', e) }
  }

  const saveTable = () => { if (!editingTable?.number) return; if (editingTable.id) saveTables(tables.map(t => t.id === editingTable.id ? editingTable : t)); else saveTables([...tables, { ...editingTable, id: `t_${Date.now()}` }]); setEditingTable(null); setShowTableModal(false) }
  const deleteTable = (id: string) => { if (confirm('წაშალოთ?')) saveTables(tables.filter(t => t.id !== id)) }

  const saveTasting = () => { if (!editingTasting?.name) return; if (editingTasting.id) saveBeerTastings(beerTastings.map(t => t.id === editingTasting.id ? editingTasting : t)); else saveBeerTastings([...beerTastings, { ...editingTasting, id: `bt_${Date.now()}` }]); setEditingTasting(null); setShowTastingModal(false) }
  const deleteTasting = (id: string) => { if (confirm('წაშალოთ?')) saveBeerTastings(beerTastings.filter(t => t.id !== id)) }

  const saveGroupMenu = () => { if (!editingGroupMenu?.name) return; if (editingGroupMenu.id) saveGroupMenus(groupMenus.map(m => m.id === editingGroupMenu.id ? editingGroupMenu : m)); else saveGroupMenus([...groupMenus, { ...editingGroupMenu, id: `gm_${Date.now()}` }]); setEditingGroupMenu(null); setShowGroupMenuModal(false) }
  const deleteGroupMenu = (id: string) => { if (confirm('წაშალოთ?')) saveGroupMenus(groupMenus.filter(m => m.id !== id)) }

  // PDF Export - ერთი მენიუ
  const exportMenuPDF = (menu: GroupMenu) => {
    const hotelInfo = JSON.parse(localStorage.getItem('simpleHotelInfo') || '{}')
    const hotelName = hotelInfo.name || 'Brewery House & Beer Spa'
    const hotelPhone = hotelInfo.phone || '+995 599 946 500'
    const hotelEmail = hotelInfo.email || 'info@breweryhouse.ge'
    
    const itemsTotal = menu.items?.reduce((sum, i) => sum + (i.unitPrice * (i.quantity || 1)), 0) || 0
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${menu.name} - ${menu.nameEn}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'DejaVu Sans', 'Noto Sans Georgian', Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #7c3aed; }
          .logo { font-size: 28px; font-weight: bold; color: #7c3aed; }
          .contact { font-size: 12px; color: #666; margin-top: 5px; }
          .menu-title { font-size: 24px; font-weight: bold; margin: 20px 0 5px; }
          .menu-title-en { font-size: 16px; color: #666; margin-bottom: 10px; }
          .description { font-size: 14px; color: #444; margin-bottom: 20px; font-style: italic; }
          .price-box { background: #f3e8ff; padding: 15px 20px; border-radius: 10px; display: inline-block; margin-bottom: 20px; }
          .price { font-size: 32px; font-weight: bold; color: #7c3aed; }
          .price-label { font-size: 12px; color: #666; }
          .section-title { font-size: 14px; font-weight: bold; color: #7c3aed; margin: 20px 0 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .items-table th, .items-table td { padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb; }
          .items-table th { background: #f9fafb; font-weight: 600; font-size: 12px; color: #666; }
          .items-table td { font-size: 14px; }
          .item-name { font-weight: 500; }
          .item-name-en { font-size: 12px; color: #888; }
          .item-price { text-align: right; color: #7c3aed; font-weight: 600; }
          .total-row { background: #f3e8ff; font-weight: bold; }
          .total-row td { border-bottom: none; }
          .badges { margin-top: 15px; }
          .badge { display: inline-block; padding: 5px 12px; border-radius: 20px; font-size: 12px; margin-right: 8px; }
          .badge-drinks { background: #dbeafe; color: #1e40af; }
          .badge-dessert { background: #fce7f3; color: #be185d; }
          .badge-persons { background: #d1fae5; color: #065f46; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #888; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">🍺 ${hotelName}</div>
          <div class="contact">${hotelPhone} | ${hotelEmail}</div>
        </div>
        
        <div class="menu-title">${menu.name}</div>
        <div class="menu-title-en">${menu.nameEn}</div>
        <div class="description">${menu.description}</div>
        
        <div class="price-box">
          <div class="price">₾${menu.pricePerPerson}</div>
          <div class="price-label">თითო კაცზე / per person</div>
        </div>
        
        ${menu.items && menu.items.length > 0 ? `
          <div class="section-title">📋 შეიცავს / Includes:</div>
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 50%">კერძი / Dish</th>
                <th style="width: 25%">კატეგორია</th>
                <th style="width: 25%; text-align: right">ფასი / Price</th>
              </tr>
            </thead>
            <tbody>
              ${menu.items.map(item => `
                <tr>
                  <td>
                    <div class="item-name">${item.name}</div>
                    ${item.nameEn ? `<div class="item-name-en">${item.nameEn}</div>` : ''}
                  </td>
                  <td style="font-size: 12px; color: #666;">
                    ${item.category === 'appetizer' ? '🥗 საწყისი' : 
                      item.category === 'main' ? '🍖 მთავარი' : 
                      item.category === 'side' ? '🥔 გარნირი' : 
                      item.category === 'dessert' ? '🍰 დესერტი' : 
                      item.category === 'drink' ? '🍺 სასმელი' : ''}
                  </td>
                  <td class="item-price">₾${item.unitPrice}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="2"><strong>ჯამი / Total:</strong></td>
                <td class="item-price">₾${itemsTotal}</td>
              </tr>
            </tbody>
          </table>
        ` : ''}
        
        <div class="badges">
          ${menu.includesDrinks ? '<span class="badge badge-drinks">🍺 სასმელი შედის / Drinks included</span>' : ''}
          ${menu.includesDessert ? '<span class="badge badge-dessert">🍰 დესერტი შედის / Dessert included</span>' : ''}
          ${menu.minPersons ? `<span class="badge badge-persons">👥 მინ. ${menu.minPersons} კაცი / Min. ${menu.minPersons} persons</span>` : ''}
        </div>
        
        <div class="footer">
          <p>დაგვიკავშირდით დაჯავშნისთვის / Contact us for reservations</p>
          <p>${hotelPhone} | ${hotelEmail}</p>
        </div>
      </body>
      </html>
    `
    
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${menu.nameEn?.replace(/\s+/g, '_') || 'menu'}_${new Date().toISOString().split('T')[0]}.html`
    a.click()
    URL.revokeObjectURL(url)
  }
  
  // PDF Export - ყველა მენიუ ერთად
  const exportAllMenusPDF = () => {
    const hotelInfo = JSON.parse(localStorage.getItem('simpleHotelInfo') || '{}')
    const hotelName = hotelInfo.name || 'Brewery House & Beer Spa'
    const hotelPhone = hotelInfo.phone || '+995 599 946 500'
    const hotelEmail = hotelInfo.email || 'info@breweryhouse.ge'
    
    const menusHtml = groupMenus.filter(m => m.isActive).map(menu => {
      const itemsTotal = menu.items?.reduce((sum, i) => sum + (i.unitPrice * (i.quantity || 1)), 0) || 0
      return `
        <div class="menu-card" style="page-break-inside: avoid; margin-bottom: 40px; padding: 20px; border: 2px solid #e5e7eb; border-radius: 15px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
            <div>
              <div class="menu-title">${menu.name}</div>
              <div class="menu-title-en">${menu.nameEn}</div>
              <div class="description">${menu.description}</div>
            </div>
            <div class="price-box">
              <div class="price">₾${menu.pricePerPerson}</div>
              <div class="price-label">თითო კაცზე</div>
            </div>
          </div>
          
          ${menu.items && menu.items.length > 0 ? `
            <table class="items-table">
              <thead>
                <tr>
                  <th>კერძი / Dish</th>
                  <th style="text-align: right">ფასი</th>
                </tr>
              </thead>
              <tbody>
                ${menu.items.map(item => `
                  <tr>
                    <td><span class="item-name">${item.name}</span> ${item.nameEn ? `<span class="item-name-en">- ${item.nameEn}</span>` : ''}</td>
                    <td class="item-price">₾${item.unitPrice}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}
          
          <div class="badges">
            ${menu.includesDrinks ? '<span class="badge badge-drinks">🍺 სასმელი</span>' : ''}
            ${menu.includesDessert ? '<span class="badge badge-dessert">🍰 დესერტი</span>' : ''}
            ${menu.minPersons ? `<span class="badge badge-persons">👥 მინ. ${menu.minPersons}</span>` : ''}
          </div>
        </div>
      `
    }).join('')
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>ჯგუფის მენიუები - ${hotelName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'DejaVu Sans', 'Noto Sans Georgian', Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #7c3aed; }
          .logo { font-size: 28px; font-weight: bold; color: #7c3aed; }
          .subtitle { font-size: 18px; color: #666; margin-top: 5px; }
          .contact { font-size: 12px; color: #888; margin-top: 5px; }
          .menu-title { font-size: 20px; font-weight: bold; }
          .menu-title-en { font-size: 14px; color: #666; }
          .description { font-size: 13px; color: #444; margin-top: 5px; font-style: italic; }
          .price-box { background: #f3e8ff; padding: 10px 15px; border-radius: 10px; text-align: center; }
          .price { font-size: 24px; font-weight: bold; color: #7c3aed; }
          .price-label { font-size: 10px; color: #666; }
          .items-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          .items-table th, .items-table td { padding: 6px 10px; text-align: left; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
          .items-table th { background: #f9fafb; font-size: 11px; }
          .item-name { font-weight: 500; }
          .item-name-en { font-size: 11px; color: #888; }
          .item-price { text-align: right; color: #7c3aed; font-weight: 600; }
          .badges { margin-top: 10px; }
          .badge { display: inline-block; padding: 3px 8px; border-radius: 10px; font-size: 11px; margin-right: 5px; }
          .badge-drinks { background: #dbeafe; color: #1e40af; }
          .badge-dessert { background: #fce7f3; color: #be185d; }
          .badge-persons { background: #d1fae5; color: #065f46; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #888; }
          @media print { body { padding: 20px; } .menu-card { page-break-inside: avoid; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">🍺 ${hotelName}</div>
          <div class="subtitle">👥 ჯგუფის მენიუები / Group Menus</div>
          <div class="contact">${hotelPhone} | ${hotelEmail}</div>
        </div>
        
        ${menusHtml}
        
        <div class="footer">
          <p>დაგვიკავშირდით დაჯავშნისთვის / Contact us for reservations</p>
          <p>${hotelPhone} | ${hotelEmail}</p>
        </div>
      </body>
      </html>
    `
    
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Group_Menus_${new Date().toISOString().split('T')[0]}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  const saveCategory = () => { if (!editingCategory?.name) return; if (editingCategory.id) setCategories(categories.map(c => c.id === editingCategory.id ? editingCategory : c)); else setCategories([...categories, { ...editingCategory, id: `cat_${Date.now()}`, sortOrder: categories.length }]); setEditingCategory(null); setShowCategoryModal(false) }
  const deleteCategory = (id: string) => { if (confirm('წაშალოთ?')) { setCategories(categories.filter(c => c.id !== id)); setMenuItems(menuItems.filter(m => m.categoryId !== id)) } }

  const saveMenuItem = () => { if (!editingMenuItem?.name) return; if (editingMenuItem.id) setMenuItems(menuItems.map(m => m.id === editingMenuItem.id ? editingMenuItem : m)); else setMenuItems([...menuItems, { ...editingMenuItem, id: `menu_${Date.now()}` }]); setEditingMenuItem(null); setShowMenuItemModal(false) }
  const deleteMenuItem = (id: string) => { if (confirm('წაშალოთ?')) setMenuItems(menuItems.filter(m => m.id !== id)) }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3"><span className="text-3xl">🍽️</span><div><h2 className="text-xl font-bold">რესტორანი</h2><p className="text-sm text-gray-500">მენიუ, მაგიდები, დეგუსტაციები</p></div></div>
          <label className="flex items-center gap-3 cursor-pointer"><span className={`text-sm font-medium ${settings.enabled ? 'text-green-600' : 'text-gray-500'}`}>{settings.enabled ? 'აქტიური' : 'გამორთული'}</span><div className="relative"><input type="checkbox" checked={settings.enabled} onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })} className="sr-only" /><div className={`w-14 h-7 rounded-full ${settings.enabled ? 'bg-green-500' : 'bg-gray-300'}`}><div className={`absolute w-5 h-5 bg-white rounded-full top-1 transition-transform ${settings.enabled ? 'translate-x-8' : 'translate-x-1'}`} /></div></div></label>
        </div>

        {settings.enabled && (
          <>
            <div className="flex gap-2 border-b pb-4 mb-6 overflow-x-auto">
              {[{ id: 'settings', label: '⚙️ პარამეტრები' }, { id: 'tables', label: '🪑 მაგიდები' }, { id: 'categories', label: '📁 კატეგორიები' }, { id: 'menu', label: '🍴 მენიუ' }, { id: 'tastings', label: '🍺 დეგუსტაცია' }, { id: 'groups', label: '👥 ჯგუფები' }].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)} className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${activeTab === tab.id ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>{tab.label}</button>
              ))}
            </div>

            {activeTab === 'settings' && (
              <div className="space-y-4">
                <div><label className="block text-sm font-medium mb-1">სახელი</label><input type="text" value={settings.name} onChange={(e) => setSettings({ ...settings, name: e.target.value })} className="w-full px-4 py-2 border rounded-lg" /></div>
                <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium mb-1">გახსნა</label><input type="time" value={settings.openTime} onChange={(e) => setSettings({ ...settings, openTime: e.target.value })} className="w-full px-4 py-2 border rounded-lg" /></div><div><label className="block text-sm font-medium mb-1">დახურვა</label><input type="time" value={settings.closeTime} onChange={(e) => setSettings({ ...settings, closeTime: e.target.value })} className="w-full px-4 py-2 border rounded-lg" /></div></div>
                <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium mb-1">დღგ (%)</label><input type="number" value={settings.taxRate} onChange={(e) => setSettings({ ...settings, taxRate: Number(e.target.value) })} className="w-full px-4 py-2 border rounded-lg" /></div><div><label className="block text-sm font-medium mb-1">მომსახურება (%)</label><input type="number" value={settings.serviceCharge} onChange={(e) => setSettings({ ...settings, serviceCharge: Number(e.target.value) })} className="w-full px-4 py-2 border rounded-lg" /></div></div>
                <label className="flex items-center gap-3"><input type="checkbox" checked={settings.allowRoomCharge} onChange={(e) => setSettings({ ...settings, allowRoomCharge: e.target.checked })} className="w-5 h-5" /><span>🏨 ოთახზე ჩაწერა</span></label>
              </div>
            )}

            {activeTab === 'tables' && (
              <div>
                <div className="flex justify-between mb-4"><h3 className="font-medium">მაგიდები ({tables.length})</h3><button onClick={() => { setEditingTable({ id: '', number: '', seats: 4, zone: 'inside', status: 'available', shape: 'rect' }); setShowTableModal(true) }} className="px-4 py-2 bg-green-500 text-white rounded-lg">+ მაგიდა</button></div>
                {ZONES.map(zone => {
                  const zt = tables.filter(t => t.zone === zone.id)
                  return zt.length ? <div key={zone.id} className="mb-4"><h4 className="font-medium text-gray-600 mb-2">{zone.label}</h4><div className="grid grid-cols-4 gap-2">{zt.map(t => (<div key={t.id} className="p-3 bg-gray-50 rounded-lg border"><div className="flex justify-between"><span className="font-bold">#{t.number}</span><span>{t.shape === 'round' ? '⭕' : '🔲'}</span></div><div className="text-sm text-gray-500">{t.seats} ადგ.</div><div className="flex gap-1 mt-2"><button onClick={() => { setEditingTable(t); setShowTableModal(true) }} className="flex-1 px-2 py-1 bg-gray-200 rounded text-sm">✏️</button><button onClick={() => deleteTable(t.id)} className="px-2 py-1 bg-red-100 text-red-600 rounded text-sm">🗑️</button></div></div>))}</div></div> : null
                })}
              </div>
            )}

            {activeTab === 'categories' && (
              <div>
                <div className="flex justify-between mb-4"><h3 className="font-medium">კატეგორიები ({categories.length})</h3><button onClick={() => { setEditingCategory({ id: '', name: '', nameEn: '', icon: '🍽️', sortOrder: 0, isActive: true }); setShowCategoryModal(true) }} className="px-4 py-2 bg-green-500 text-white rounded-lg">+ კატეგორია</button></div>
                <div className="space-y-2">{categories.map(c => (<div key={c.id} className="flex justify-between p-3 bg-gray-50 rounded-lg"><div className="flex items-center gap-2"><span className="text-xl">{c.icon}</span><span className="font-medium">{c.name}</span></div><div className="flex gap-1"><button onClick={() => { setEditingCategory(c); setShowCategoryModal(true) }} className="px-2 py-1 bg-gray-200 rounded">✏️</button><button onClick={() => deleteCategory(c.id)} className="px-2 py-1 bg-red-100 text-red-600 rounded">🗑️</button></div></div>))}</div>
              </div>
            )}

            {activeTab === 'menu' && (
              <div>
                <div className="flex justify-between mb-4"><h3 className="font-medium">მენიუ ({menuItems.length})</h3><button onClick={() => { setEditingMenuItem({ id: '', categoryId: categories[0]?.id || '', name: '', nameEn: '', description: '', descriptionEn: '', price: 0, preparationTime: 15, isAvailable: true, isActive: true, imageUrl: '' }); setShowMenuItemModal(true) }} disabled={!categories.length} className="px-4 py-2 bg-green-500 text-white rounded-lg disabled:opacity-50">+ კერძი</button></div>
                {categories.map(c => { const items = menuItems.filter(m => m.categoryId === c.id); return items.length ? <div key={c.id} className="mb-4"><h4 className="font-medium text-gray-600 mb-2">{c.icon} {c.name}</h4><div className="space-y-2">{items.map(i => (<div key={i.id} className="flex justify-between p-3 bg-gray-50 rounded-lg"><div className="flex items-center gap-3">{i.imageUrl ? <img src={i.imageUrl} alt={i.name} className="w-12 h-12 rounded-lg object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} /> : <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center text-lg">🍽️</div>}<div><span className="font-medium">{i.name}</span><span className="text-sm text-gray-500 ml-2">{i.description}</span></div></div><div className="flex items-center gap-3"><span className="font-bold text-green-600">₾{i.price}</span><button onClick={() => { setEditingMenuItem(i); setShowMenuItemModal(true) }} className="px-2 py-1 bg-gray-200 rounded">✏️</button><button onClick={() => deleteMenuItem(i.id)} className="px-2 py-1 bg-red-100 text-red-600 rounded">🗑️</button></div></div>))}</div></div> : null })}
              </div>
            )}

            {activeTab === 'tastings' && (
              <div>
                <div className="flex justify-between mb-4"><h3 className="font-medium">🍺 დეგუსტაციები ({beerTastings.length})</h3><button onClick={() => { setEditingTasting({ id: '', name: '', nameEn: '', description: '', beers: [], price: 0, duration: 30, isActive: true }); setShowTastingModal(true) }} className="px-4 py-2 bg-amber-500 text-white rounded-lg">+ დეგუსტაცია</button></div>
                <div className="space-y-3">{beerTastings.map(t => (<div key={t.id} className="p-4 bg-amber-50 rounded-xl border-2 border-amber-200"><div className="flex justify-between"><div><div className="font-bold text-lg">{t.name}</div><div className="text-sm text-gray-500">{t.nameEn}</div><div className="text-sm mt-1">{t.description}</div><div className="flex flex-wrap gap-1 mt-2">{t.beers.map((b, i) => <span key={i} className="px-2 py-1 bg-white rounded text-xs border">{b}</span>)}</div></div><div className="text-right"><div className="text-2xl font-bold text-amber-600">₾{t.price}</div><div className="text-sm text-gray-500">{t.duration} წთ</div><div className="flex gap-1 mt-2"><button onClick={() => { setEditingTasting(t); setShowTastingModal(true) }} className="px-3 py-1 bg-white border rounded">✏️</button><button onClick={() => deleteTasting(t.id)} className="px-3 py-1 bg-red-100 text-red-600 rounded">🗑️</button></div></div></div></div>))}</div>
              </div>
            )}

            {activeTab === 'groups' && (
              <div>
                <div className="flex justify-between mb-4">
                  <h3 className="font-medium">👥 ჯგუფის მენიუები ({groupMenus.length})</h3>
                  <div className="flex gap-2">
                    <button onClick={() => exportAllMenusPDF()} className="px-4 py-2 bg-green-500 text-white rounded-lg">📄 ყველა PDF</button>
                    <button onClick={() => { setEditingGroupMenu({ id: '', name: '', nameEn: '', description: '', pricePerPerson: 0, items: [], isActive: true }); setShowGroupMenuModal(true) }} className="px-4 py-2 bg-purple-500 text-white rounded-lg">+ ჯგუფის მენიუ</button>
                  </div>
                </div>
                <div className="space-y-4">
                  {groupMenus.map(m => (
                    <div key={m.id} className="p-4 bg-purple-50 rounded-xl border-2 border-purple-200">
                      <div className="flex justify-between mb-3">
                        <div>
                          <div className="font-bold text-lg">{m.name}</div>
                          <div className="text-sm text-gray-500">{m.nameEn}</div>
                          <div className="text-sm mt-1">{m.description}</div>
                          {m.minPersons && <div className="text-xs text-purple-600 mt-1">მინ. {m.minPersons} კაცი</div>}
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-purple-600">₾{m.pricePerPerson}</div>
                          <div className="text-sm text-gray-500">თითო კაცზე</div>
                          <div className="flex gap-1 mt-2">
                            <button onClick={() => exportMenuPDF(m)} className="px-3 py-1 bg-green-100 text-green-700 border rounded" title="PDF ჩამოტვირთვა">📄</button>
                            <button onClick={() => { setEditingGroupMenu(m); setShowGroupMenuModal(true) }} className="px-3 py-1 bg-white border rounded">✏️</button>
                            <button onClick={() => deleteGroupMenu(m.id)} className="px-3 py-1 bg-red-100 text-red-600 rounded">🗑️</button>
                          </div>
                        </div>
                      </div>
                      {/* კერძების ჩამონათვალი */}
                      {m.items && m.items.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-purple-200">
                          <div className="text-xs font-medium text-purple-700 mb-2">შეიცავს:</div>
                          <div className="grid grid-cols-2 gap-1">
                            {m.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-sm bg-white px-2 py-1 rounded">
                                <span>{item.name}</span>
                                <span className="text-purple-600">₾{item.unitPrice}</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-between mt-2 pt-2 border-t border-purple-200 font-medium">
                            <span>ჯამი (კერძები):</span>
                            <span className="text-purple-600">₾{m.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)}</span>
                          </div>
                        </div>
                      )}
                      {/* ბეჯები */}
                      <div className="flex gap-2 mt-2">
                        {m.includesDrinks && <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">🍺 სასმელი</span>}
                        {m.includesDessert && <span className="px-2 py-1 bg-pink-100 text-pink-700 text-xs rounded">🍰 დესერტი</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <button onClick={onSave} disabled={isSaving} className="w-full px-6 py-3 bg-blue-500 text-white rounded-xl font-medium disabled:opacity-50">{isSaving ? '⏳...' : '💾 შენახვა'}</button>

      {showTableModal && editingTable && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white rounded-xl p-6 w-full max-w-md"><h3 className="text-lg font-bold mb-4">🪑 მაგიდა</h3><div className="space-y-4"><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm mb-1">ნომერი</label><input value={editingTable.number} onChange={e => setEditingTable({...editingTable, number: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div><div><label className="block text-sm mb-1">ადგილები</label><input type="number" value={editingTable.seats} onChange={e => setEditingTable({...editingTable, seats: Number(e.target.value)})} className="w-full px-4 py-2 border rounded-lg" /></div></div><div><label className="block text-sm mb-1">ზონა</label><select value={editingTable.zone} onChange={e => setEditingTable({...editingTable, zone: e.target.value as any})} className="w-full px-4 py-2 border rounded-lg">{ZONES.map(z => <option key={z.id} value={z.id}>{z.label}</option>)}</select></div><div><label className="block text-sm mb-1">ფორმა</label><div className="flex gap-2"><button type="button" onClick={() => setEditingTable({...editingTable, shape: 'rect'})} className={`flex-1 p-3 rounded-lg border-2 ${editingTable.shape === 'rect' ? 'border-blue-500 bg-blue-50' : ''}`}>🔲 მართკ.</button><button type="button" onClick={() => setEditingTable({...editingTable, shape: 'round'})} className={`flex-1 p-3 rounded-lg border-2 ${editingTable.shape === 'round' ? 'border-blue-500 bg-blue-50' : ''}`}>⭕ მრგვ.</button></div></div></div><div className="flex gap-3 mt-6"><button onClick={() => setShowTableModal(false)} className="flex-1 px-4 py-2 bg-gray-200 rounded-lg">გაუქმება</button><button onClick={saveTable} className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg">შენახვა</button></div></div></div>)}

      {showTastingModal && editingTasting && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white rounded-xl p-6 w-full max-w-md"><h3 className="text-lg font-bold mb-4">🍺 დეგუსტაცია</h3><div className="space-y-4"><div><label className="block text-sm mb-1">სახელი (ქართ.)</label><input value={editingTasting.name} onChange={e => setEditingTasting({...editingTasting, name: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div><div><label className="block text-sm mb-1">სახელი (Eng)</label><input value={editingTasting.nameEn} onChange={e => setEditingTasting({...editingTasting, nameEn: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div><div><label className="block text-sm mb-1">აღწერა</label><textarea value={editingTasting.description} onChange={e => setEditingTasting({...editingTasting, description: e.target.value})} className="w-full px-4 py-2 border rounded-lg" rows={2} /></div><div><label className="block text-sm mb-1">ლუდები (მძიმით)</label><input value={editingTasting.beers.join(', ')} onChange={e => setEditingTasting({...editingTasting, beers: e.target.value.split(',').map(b => b.trim()).filter(Boolean)})} className="w-full px-4 py-2 border rounded-lg" placeholder="Pilsner, IPA, Stout..." /></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm mb-1">ფასი (₾)</label><input type="number" value={editingTasting.price} onChange={e => setEditingTasting({...editingTasting, price: Number(e.target.value)})} className="w-full px-4 py-2 border rounded-lg" /></div><div><label className="block text-sm mb-1">ხანგრძლ. (წთ)</label><input type="number" value={editingTasting.duration} onChange={e => setEditingTasting({...editingTasting, duration: Number(e.target.value)})} className="w-full px-4 py-2 border rounded-lg" /></div></div><label className="flex items-center gap-2"><input type="checkbox" checked={editingTasting.isActive} onChange={e => setEditingTasting({...editingTasting, isActive: e.target.checked})} /><span className="text-sm">აქტიური</span></label></div><div className="flex gap-3 mt-6"><button onClick={() => setShowTastingModal(false)} className="flex-1 px-4 py-2 bg-gray-200 rounded-lg">გაუქმება</button><button onClick={saveTasting} className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg">შენახვა</button></div></div></div>)}

      {showGroupMenuModal && editingGroupMenu && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">👥 ჯგუფის მენიუ</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">სახელი (ქართ.)</label>
                  <input value={editingGroupMenu.name} onChange={e => setEditingGroupMenu({...editingGroupMenu, name: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm mb-1">სახელი (Eng)</label>
                  <input value={editingGroupMenu.nameEn} onChange={e => setEditingGroupMenu({...editingGroupMenu, nameEn: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-sm mb-1">აღწერა</label>
                <textarea value={editingGroupMenu.description} onChange={e => setEditingGroupMenu({...editingGroupMenu, description: e.target.value})} className="w-full px-4 py-2 border rounded-lg" rows={2} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm mb-1">ფასი / კაცზე (₾)</label>
                  <input type="number" value={editingGroupMenu.pricePerPerson} onChange={e => setEditingGroupMenu({...editingGroupMenu, pricePerPerson: Number(e.target.value)})} className="w-full px-4 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm mb-1">მინ. კაცი</label>
                  <input type="number" value={editingGroupMenu.minPersons || ''} onChange={e => setEditingGroupMenu({...editingGroupMenu, minPersons: Number(e.target.value) || undefined})} className="w-full px-4 py-2 border rounded-lg" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm mb-1">მაქს. კაცი</label>
                  <input type="number" value={editingGroupMenu.maxPersons || ''} onChange={e => setEditingGroupMenu({...editingGroupMenu, maxPersons: Number(e.target.value) || undefined})} className="w-full px-4 py-2 border rounded-lg" placeholder="∞" />
                </div>
              </div>
              
              {/* კერძების ჩამონათვალი */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-3">
                  <label className="font-medium">📋 კერძების ჩამონათვალი</label>
                  <button 
                    type="button"
                    onClick={() => setEditingGroupMenu({
                      ...editingGroupMenu, 
                      items: [...(editingGroupMenu.items || []), { id: `gi_${Date.now()}`, name: '', nameEn: '', quantity: 1, unitPrice: 0, category: 'main' }]
                    })} 
                    className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm"
                  >
                    + კერძი
                  </button>
                </div>
                <div className="space-y-2">
                  {(editingGroupMenu.items || []).map((item, idx) => (
                    <div key={item.id || idx} className="flex gap-2 items-center bg-gray-50 p-2 rounded-lg">
                      <input 
                        value={item.name} 
                        onChange={e => {
                          const newItems = [...(editingGroupMenu.items || [])]
                          newItems[idx] = { ...item, name: e.target.value }
                          setEditingGroupMenu({...editingGroupMenu, items: newItems})
                        }} 
                        className="flex-1 px-3 py-2 border rounded" 
                        placeholder="კერძის სახელი"
                      />
                      <input 
                        value={item.nameEn || ''} 
                        onChange={e => {
                          const newItems = [...(editingGroupMenu.items || [])]
                          newItems[idx] = { ...item, nameEn: e.target.value }
                          setEditingGroupMenu({...editingGroupMenu, items: newItems})
                        }} 
                        className="w-32 px-3 py-2 border rounded" 
                        placeholder="English"
                      />
                      <input 
                        type="number" 
                        value={item.unitPrice} 
                        onChange={e => {
                          const newItems = [...(editingGroupMenu.items || [])]
                          newItems[idx] = { ...item, unitPrice: Number(e.target.value) }
                          setEditingGroupMenu({...editingGroupMenu, items: newItems})
                        }} 
                        className="w-20 px-3 py-2 border rounded text-right" 
                        placeholder="₾"
                      />
                      <select
                        value={item.category || 'main'}
                        onChange={e => {
                          const newItems = [...(editingGroupMenu.items || [])]
                          newItems[idx] = { ...item, category: e.target.value }
                          setEditingGroupMenu({...editingGroupMenu, items: newItems})
                        }}
                        className="w-28 px-2 py-2 border rounded text-sm"
                      >
                        <option value="appetizer">🥗 საწყისი</option>
                        <option value="main">🍖 მთავარი</option>
                        <option value="side">🥔 გარნირი</option>
                        <option value="dessert">🍰 დესერტი</option>
                        <option value="drink">🍺 სასმელი</option>
                      </select>
                      <button 
                        type="button"
                        onClick={() => {
                          const newItems = (editingGroupMenu.items || []).filter((_, i) => i !== idx)
                          setEditingGroupMenu({...editingGroupMenu, items: newItems})
                        }} 
                        className="px-2 py-2 bg-red-100 text-red-600 rounded"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
                {(editingGroupMenu.items || []).length > 0 && (
                  <div className="flex justify-between mt-3 pt-3 border-t font-medium">
                    <span>კერძების ჯამი:</span>
                    <span className="text-purple-600">₾{(editingGroupMenu.items || []).reduce((sum, i) => sum + (i.unitPrice || 0) * (i.quantity || 1), 0)}</span>
                  </div>
                )}
              </div>
              
              <div className="flex gap-4 flex-wrap">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={editingGroupMenu.includesDrinks || false} onChange={e => setEditingGroupMenu({...editingGroupMenu, includesDrinks: e.target.checked})} />
                  <span className="text-sm">🍺 სასმელი შედის</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={editingGroupMenu.includesDessert || false} onChange={e => setEditingGroupMenu({...editingGroupMenu, includesDessert: e.target.checked})} />
                  <span className="text-sm">🍰 დესერტი შედის</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={editingGroupMenu.isActive} onChange={e => setEditingGroupMenu({...editingGroupMenu, isActive: e.target.checked})} />
                  <span className="text-sm">✅ აქტიური</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowGroupMenuModal(false)} className="flex-1 px-4 py-2 bg-gray-200 rounded-lg">გაუქმება</button>
              <button onClick={saveGroupMenu} className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg">💾 შენახვა</button>
            </div>
          </div>
        </div>
      )}

      {showCategoryModal && editingCategory && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white rounded-xl p-6 w-full max-w-md"><h3 className="text-lg font-bold mb-4">კატეგორია</h3><div className="space-y-4"><div><label className="block text-sm mb-1">აიკონი</label><div className="flex flex-wrap gap-2">{CATEGORY_ICONS.map(i => <button key={i} type="button" onClick={() => setEditingCategory({...editingCategory, icon: i})} className={`w-10 h-10 rounded-lg text-xl ${editingCategory.icon === i ? 'bg-blue-100 border-2 border-blue-500' : 'bg-gray-100'}`}>{i}</button>)}</div></div><div><label className="block text-sm mb-1">სახელი</label><input value={editingCategory.name} onChange={e => setEditingCategory({...editingCategory, name: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div><div><label className="block text-sm mb-1">სახელი (Eng)</label><input value={editingCategory.nameEn} onChange={e => setEditingCategory({...editingCategory, nameEn: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div><label className="flex items-center gap-2"><input type="checkbox" checked={editingCategory.isActive} onChange={e => setEditingCategory({...editingCategory, isActive: e.target.checked})} /><span className="text-sm">აქტიური</span></label></div><div className="flex gap-3 mt-6"><button onClick={() => setShowCategoryModal(false)} className="flex-1 px-4 py-2 bg-gray-200 rounded-lg">გაუქმება</button><button onClick={saveCategory} className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg">შენახვა</button></div></div></div>)}

      {showMenuItemModal && editingMenuItem && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"><h3 className="text-lg font-bold mb-4">კერძი</h3><div className="space-y-4"><div><label className="block text-sm mb-1">კატეგორია</label><select value={editingMenuItem.categoryId} onChange={e => setEditingMenuItem({...editingMenuItem, categoryId: e.target.value})} className="w-full px-4 py-2 border rounded-lg">{categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</select></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm mb-1">სახელი</label><input value={editingMenuItem.name} onChange={e => setEditingMenuItem({...editingMenuItem, name: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div><div><label className="block text-sm mb-1">სახელი (Eng)</label><input value={editingMenuItem.nameEn} onChange={e => setEditingMenuItem({...editingMenuItem, nameEn: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div></div><div><label className="block text-sm mb-1">აღწერა</label><textarea value={editingMenuItem.description} onChange={e => setEditingMenuItem({...editingMenuItem, description: e.target.value})} className="w-full px-4 py-2 border rounded-lg" rows={2} /></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm mb-1">ფასი (₾)</label><input type="number" value={editingMenuItem.price} onChange={e => setEditingMenuItem({...editingMenuItem, price: Number(e.target.value)})} className="w-full px-4 py-2 border rounded-lg" /></div><div><label className="block text-sm mb-1">მომზ. (წთ)</label><input type="number" value={editingMenuItem.preparationTime} onChange={e => setEditingMenuItem({...editingMenuItem, preparationTime: Number(e.target.value)})} className="w-full px-4 py-2 border rounded-lg" /></div></div><div className="flex gap-4"><label className="flex items-center gap-2"><input type="checkbox" checked={editingMenuItem.isAvailable} onChange={e => setEditingMenuItem({...editingMenuItem, isAvailable: e.target.checked})} /><span className="text-sm">ხელმისაწვდომი</span></label><label className="flex items-center gap-2"><input type="checkbox" checked={editingMenuItem.isActive} onChange={e => setEditingMenuItem({...editingMenuItem, isActive: e.target.checked})} /><span className="text-sm">აქტიური</span></label></div><div><label className="block text-sm mb-1">სურათის URL</label><input value={editingMenuItem.imageUrl || ''} onChange={e => setEditingMenuItem({...editingMenuItem, imageUrl: e.target.value})} className="w-full px-4 py-2 border rounded-lg" placeholder="https://example.com/photo.jpg" />{editingMenuItem.imageUrl && <div className="mt-2"><img src={editingMenuItem.imageUrl} alt="preview" className="w-32 h-24 object-cover rounded-lg border" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} /></div>}</div></div><div className="flex gap-3 mt-6"><button onClick={() => setShowMenuItemModal(false)} className="flex-1 px-4 py-2 bg-gray-200 rounded-lg">გაუქმება</button><button onClick={saveMenuItem} className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg">შენახვა</button></div></div></div>)}
    </div>
  )
}