'use client'

import React, { useState, useEffect, useRef } from 'react'
import moment from 'moment'
import { ExtraChargesService } from '../services/ExtraChargesService'

// ==================== TYPES ====================
interface HotelInfo {
  name: string
  company: string
  taxId: string
  address: string
  city: string
  country: string
  phone: string
  email: string
  website: string
  bankName: string
  bankAccount: string
  logo: string
}

interface Room {
  id: string
  roomNumber: string
  floor: number
  roomType: string
  basePrice: number
  status: string
  amenities: string[]
}

interface RoomType {
  id: string
  name: string
  basePrice: number
  description: string
  maxGuests: number
  beds?: number
  icon: string
}

interface User {
  id: string
  username: string
  fullName: string
  email: string
  role: 'admin' | 'manager' | 'receptionist'
  active: boolean
  createdAt: string
  lastLogin?: string
}

interface ChecklistItem {
  id: string
  task: string
  category: string
  required: boolean
}

interface SystemSettings {
  nightAuditTime: string
  autoNightAudit: boolean
  emailNotifications: boolean
  emailRecipients: string[]
  vatRate: number
  currency: string
  dateFormat: string
  language: string
}

// NEW: Floor type
interface Floor {
  id: string
  number: number
  name: string
  description: string
  active: boolean
}

// NEW: Staff member type
interface StaffMember {
  id: string
  firstName: string
  lastName: string
  position: string
  department: 'housekeeping' | 'frontdesk' | 'maintenance' | 'restaurant' | 'management' | 'other'
  phone: string
  email: string
  active: boolean
  hireDate: string
  notes: string
}

// NEW: Season for pricing
interface Season {
  id: string
  name: string
  startDate: string
  endDate: string
  priceModifier: number
  color: string
  active: boolean
  roomTypes?: string[]  // რომელ ოთახის ტიპებზე ვრცელდება
}

// NEW: Extra Service
interface ExtraService {
  id: string
  name: string
  code: string
  price: number
  unit: string
  category: string
  available: boolean
}

// NEW: Package
interface Package {
  id: string
  name: string
  description: string
  price: number
  includedServices: string[]
  nights: number
  active: boolean
}

// Calendar Settings
interface CalendarSettings {
  enableDragDrop: boolean           // ჯავშნის გადატანა
  enableResize: boolean             // ჯავშნის გაგრძელება/შემცირება
  enableQuickReservation: boolean   // სწრაფი ჯავშანი (click on cell)
  enableContextMenu: boolean        // მარჯვენა კლიკის მენიუ
  showFloors: boolean               // სართულების ჩვენება
  showRoomNumbers: boolean          // ოთახის ნომრის ჩვენება
  showGuestCount: boolean           // სტუმრების რაოდენობის ჩვენება
  showPrices: boolean               // ფასების ჩვენება
  defaultView: 'week' | 'month'     // ნაგულისხმევი ხედი
  weekStartsOn: 0 | 1               // კვირის დასაწყისი (0=კვირა, 1=ორშაბათი)
  colorScheme: 'status' | 'roomType' | 'source'  // ფერების სქემა
  showPriceTooltip: boolean         // ფასის Tooltip
  showSeasonColors: boolean        // სეზონის ფერები
}

// ==================== MAIN COMPONENT ====================
export default function SettingsNew() {
  const [activeSection, setActiveSection] = useState('hotel')
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const isInitialMount = useRef(true)
  
  // Data states
  const [hotelInfo, setHotelInfo] = useState<HotelInfo>({
    name: '',
    company: '',
    taxId: '',
    address: '',
    city: '',
    country: 'Georgia',
    phone: '',
    email: '',
    website: '',
    bankName: '',
    bankAccount: '',
    logo: ''
  })
  
  const [rooms, setRooms] = useState<Room[]>([])
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    nightAuditTime: '02:00',
    autoNightAudit: false,
    emailNotifications: true,
    emailRecipients: [],
    vatRate: 18,
    currency: 'GEL',
    dateFormat: 'DD/MM/YYYY',
    language: 'ka'
  })
  const [activityLogs, setActivityLogs] = useState<any[]>([])
  
  // NEW: Floors state
  const [floors, setFloors] = useState<Floor[]>([])
  
  // NEW: Staff state
  const [staff, setStaff] = useState<StaffMember[]>([])
  
  // NEW: Pricing states
  const [seasons, setSeasons] = useState<Season[]>([])
  const [extraServices, setExtraServices] = useState<ExtraService[]>([])
  const [packages, setPackages] = useState<Package[]>([])
  const [taxes, setTaxes] = useState({ VAT: 18, CITY_TAX: 0, TOURISM_TAX: 0, SERVICE_CHARGE: 0 })
  const [quickCharges, setQuickCharges] = useState<string[]>([])
  
  // Calendar settings state
  const [calendarSettings, setCalendarSettings] = useState<CalendarSettings>({
    enableDragDrop: true,
    enableResize: true,
    enableQuickReservation: true,
    enableContextMenu: true,
    showFloors: true,
    showRoomNumbers: true,
    showGuestCount: true,
    showPrices: true,
    defaultView: 'week',
    weekStartsOn: 1,
    colorScheme: 'status',
    showPriceTooltip: true,
    showSeasonColors: true
  })
  
  const [cashierSettings, setCashierSettings] = useState({
    cashierEnabled: true,
    defaultOpeningBalance: 0,
    discrepancyLimit: 50,
    shiftCloseReminder: 23,
    paymentMethods: ['cash', 'card', 'bank'] as string[]
  })
  
  // Load all data on mount
  useEffect(() => {
    loadAllData()
  }, [])
  
  const loadAllData = async () => {
    if (typeof window === 'undefined') return
    
    // Load Hotel Info
    const savedHotelInfo = localStorage.getItem('hotelInfo')
    if (savedHotelInfo) {
      try {
        setHotelInfo({ ...hotelInfo, ...JSON.parse(savedHotelInfo) })
      } catch (e) {
        console.error('Error loading hotel info:', e)
      }
    }
    
    // Load Rooms from API
    try {
      const res = await fetch('/api/hotel/rooms')
      if (res.ok) {
        const data = await res.json()
        setRooms(data || [])
      }
    } catch (e) {
      console.error('Error loading rooms:', e)
    }
    
    // Load Room Types
    const savedRoomTypes = localStorage.getItem('roomTypes')
    if (savedRoomTypes) {
      try {
        setRoomTypes(JSON.parse(savedRoomTypes))
      } catch (e) {
        console.error('Error loading room types:', e)
      }
    } else {
      setRoomTypes([
        { id: 'standard', name: 'Standard', basePrice: 150, description: 'სტანდარტული ოთახი', maxGuests: 2, icon: '🛏️' },
        { id: 'deluxe', name: 'Deluxe', basePrice: 200, description: 'დელუქს ოთახი', maxGuests: 2, icon: '🌟' },
        { id: 'suite', name: 'Suite', basePrice: 350, description: 'სუიტა', maxGuests: 4, icon: '👑' }
      ])
    }
    
    // Load Users
    const savedUsers = localStorage.getItem('hotelUsers')
    if (savedUsers) {
      try {
        setUsers(JSON.parse(savedUsers))
      } catch (e) {
        console.error('Error loading users:', e)
      }
    } else {
      setUsers([
        { id: '1', username: 'admin', fullName: 'Administrator', email: 'admin@hotel.com', role: 'admin', active: true, createdAt: '2024-01-01' },
        { id: '2', username: 'manager', fullName: 'Manager', email: 'manager@hotel.com', role: 'manager', active: true, createdAt: '2024-01-01' },
        { id: '3', username: 'reception', fullName: 'Receptionist', email: 'reception@hotel.com', role: 'receptionist', active: true, createdAt: '2024-01-01' }
      ])
    }
    
    // Load Checklist
    const savedChecklist = localStorage.getItem('housekeepingChecklist')
    if (savedChecklist) {
      try {
        const parsed = JSON.parse(savedChecklist)
        setChecklist(parsed)
        console.log('📋 Loaded housekeeping checklist from localStorage:', parsed)
      } catch (e) {
        console.error('Error loading checklist:', e)
        // If parsing fails, use defaults
        const defaultItems = [
          { id: '1', task: 'საწოლის თეთრეულის შეცვლა', category: 'საძინებელი', required: true },
          { id: '2', task: 'აბაზანის დასუფთავება', category: 'აბაზანა', required: true },
          { id: '3', task: 'იატაკის მტვერსასრუტით გაწმენდა', category: 'ზოგადი', required: true },
          { id: '4', task: 'პირსახოცების შეცვლა', category: 'აბაზანა', required: true },
          { id: '5', task: 'მინიბარის შევსება', category: 'მომსახურება', required: false }
        ]
        setChecklist(defaultItems)
        localStorage.setItem('housekeepingChecklist', JSON.stringify(defaultItems))
        console.log('💾 Saved default checklist to localStorage')
      }
    } else {
      // No saved checklist - set defaults and save them
      const defaultItems = [
        { id: '1', task: 'საწოლის თეთრეულის შეცვლა', category: 'საძინებელი', required: true },
        { id: '2', task: 'აბაზანის დასუფთავება', category: 'აბაზანა', required: true },
        { id: '3', task: 'იატაკის მტვერსასრუტით გაწმენდა', category: 'ზოგადი', required: true },
        { id: '4', task: 'პირსახოცების შეცვლა', category: 'აბაზანა', required: true },
        { id: '5', task: 'მინიბარის შევსება', category: 'მომსახურება', required: false }
      ]
      setChecklist(defaultItems)
      localStorage.setItem('housekeepingChecklist', JSON.stringify(defaultItems))
      console.log('💾 Saved default checklist to localStorage')
    }
    
    // Load System Settings
    const savedSystemSettings = localStorage.getItem('systemSettings')
    if (savedSystemSettings) {
      try {
        setSystemSettings({ ...systemSettings, ...JSON.parse(savedSystemSettings) })
      } catch (e) {
        console.error('Error loading system settings:', e)
      }
    }
    
    // Load Cashier Settings
    const savedCashierSettings = localStorage.getItem('cashierSettings')
    if (savedCashierSettings) {
      try {
        setCashierSettings({ ...cashierSettings, ...JSON.parse(savedCashierSettings) })
      } catch (e) {
        console.error('Error loading cashier settings:', e)
      }
    }
    
    // Load Activity Logs
    const savedLogs = localStorage.getItem('activityLogs')
    if (savedLogs) {
      try {
        setActivityLogs(JSON.parse(savedLogs).slice(0, 100))
      } catch (e) {
        console.error('Error loading activity logs:', e)
      }
    }
    
    // NEW: Load Floors
    const savedFloors = localStorage.getItem('hotelFloors')
    if (savedFloors) {
      try {
        setFloors(JSON.parse(savedFloors))
      } catch (e) {
        console.error('Error loading floors:', e)
      }
    } else {
      setFloors([
        { id: '1', number: 1, name: 'პირველი სართული', description: 'ლობი და რეცეფცია', active: true },
        { id: '2', number: 2, name: 'მეორე სართული', description: 'სტანდარტული ოთახები', active: true },
        { id: '3', number: 3, name: 'მესამე სართული', description: 'დელუქს ოთახები', active: true }
      ])
    }
    
    // NEW: Load Staff
    const savedStaff = localStorage.getItem('hotelStaff')
    if (savedStaff) {
      try {
        setStaff(JSON.parse(savedStaff))
      } catch (e) {
        console.error('Error loading staff:', e)
      }
    } else {
      // No default staff - start with empty array
      setStaff([])
    }
    
    // NEW: Load Seasons
    const savedSeasons = localStorage.getItem('hotelSeasons')
    if (savedSeasons) {
      try {
        setSeasons(JSON.parse(savedSeasons))
      } catch (e) {
        console.error('Error loading seasons:', e)
      }
    } else {
      setSeasons([
        { id: '1', name: 'დაბალი სეზონი', startDate: '2025-01-01', endDate: '2025-03-31', priceModifier: -20, color: '#10b981', active: true },
        { id: '2', name: 'მაღალი სეზონი', startDate: '2025-06-01', endDate: '2025-08-31', priceModifier: 30, color: '#ef4444', active: true },
        { id: '3', name: 'საშუალო სეზონი', startDate: '2025-04-01', endDate: '2025-05-31', priceModifier: 0, color: '#3b82f6', active: true }
      ])
    }
    
    // NEW: Load Extra Services
    const savedServices = localStorage.getItem('hotelExtraServices')
    if (savedServices) {
      try {
        setExtraServices(JSON.parse(savedServices))
      } catch (e) {
        console.error('Error loading extra services:', e)
      }
    } else {
      setExtraServices([
        { id: '1', name: 'საუზმე', code: 'BRK', price: 35, unit: 'person', category: 'F&B', available: true },
        { id: '2', name: 'ტრანსფერი აეროპორტიდან', code: 'TRF', price: 60, unit: 'service', category: 'Transport', available: true },
        { id: '3', name: 'SPA მასაჟი', code: 'SPA', price: 120, unit: 'hour', category: 'SPA', available: true },
        { id: '4', name: 'მინიბარი - წყალი', code: 'MB-W', price: 3, unit: 'piece', category: 'Minibar', available: true },
        { id: '5', name: 'სამრეცხაო', code: 'LND', price: 25, unit: 'service', category: 'Laundry', available: true }
      ])
    }
    
    // NEW: Load Packages
    const savedPackages = localStorage.getItem('hotelPackages')
    if (savedPackages) {
      try {
        setPackages(JSON.parse(savedPackages))
      } catch (e) {
        console.error('Error loading packages:', e)
      }
    } else {
      setPackages([
        { id: '1', name: 'რომანტიკული პაკეტი', description: 'ოთახი + საუზმე + შამპანური', price: 350, includedServices: ['BRK'], nights: 1, active: true },
        { id: '2', name: 'ბიზნეს პაკეტი', description: 'ოთახი + საუზმე + ტრანსფერი', price: 280, includedServices: ['BRK', 'TRF'], nights: 1, active: true }
      ])
    }
    
    // NEW: Load Taxes
    const savedTaxes = localStorage.getItem('hotelTaxes')
    if (savedTaxes) {
      try {
        setTaxes(JSON.parse(savedTaxes))
      } catch (e) {
        console.error('Error loading taxes:', e)
      }
    }
    
    // NEW: Load Quick Charges
    const savedQuickCharges = localStorage.getItem('hotelQuickCharges')
    if (savedQuickCharges) {
      try {
        setQuickCharges(JSON.parse(savedQuickCharges))
      } catch (e) {
        console.error('Error loading quick charges:', e)
      }
    } else {
      setQuickCharges(['1', '2', '4'])
    }
    
    // Load Calendar Settings
    const savedCalendarSettings = localStorage.getItem('calendarSettings')
    if (savedCalendarSettings) {
      try {
        setCalendarSettings(prev => ({ ...prev, ...JSON.parse(savedCalendarSettings) }))
      } catch (e) {
        console.error('Error loading calendar settings:', e)
      }
    }
  }
  
  // Save functions
  const saveHotelInfo = () => {
    setIsSaving(true)
    localStorage.setItem('hotelInfo', JSON.stringify(hotelInfo))
    // Dispatch custom event to update header in other components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('hotelInfoUpdated'))
    }
    setTimeout(() => {
      setIsSaving(false)
      showMessage('success', '✅ სასტუმროს ინფორმაცია შენახულია!')
    }, 500)
  }
  
  const saveRoomTypes = () => {
    setIsSaving(true)
    localStorage.setItem('roomTypes', JSON.stringify(roomTypes))
    setTimeout(() => {
      setIsSaving(false)
      showMessage('success', '✅ ოთახის ტიპები შენახულია!')
    }, 500)
  }
  
  const saveUsers = () => {
    setIsSaving(true)
    localStorage.setItem('hotelUsers', JSON.stringify(users))
    setTimeout(() => {
      setIsSaving(false)
      showMessage('success', '✅ მომხმარებლები შენახულია!')
    }, 500)
  }
  
  const saveChecklist = () => {
    setIsSaving(true)
    localStorage.setItem('housekeepingChecklist', JSON.stringify(checklist))
    console.log('✅ Saved housekeeping checklist:', checklist)
    setTimeout(() => {
      setIsSaving(false)
      showMessage('success', '✅ ჩეკლისტი შენახულია!')
    }, 500)
  }
  
  // Auto-save checklist when it changes (skip initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return // Skip saving on initial mount
    }
    
    if (checklist && checklist.length > 0) {
      localStorage.setItem('housekeepingChecklist', JSON.stringify(checklist))
      console.log('💾 Auto-saved housekeeping checklist:', checklist)
    }
  }, [checklist])
  
  const saveSystemSettings = () => {
    setIsSaving(true)
    localStorage.setItem('systemSettings', JSON.stringify(systemSettings))
    localStorage.setItem('nightAuditSettings', JSON.stringify({
      autoAuditTime: systemSettings.nightAuditTime,
      enableAutoAudit: systemSettings.autoNightAudit,
      emailRecipients: systemSettings.emailRecipients,
      sendEmailOnComplete: systemSettings.emailNotifications
    }))
    setTimeout(() => {
      setIsSaving(false)
      showMessage('success', '✅ სისტემის პარამეტრები შენახულია!')
    }, 500)
  }
  
  // NEW: Save Floors
  const saveFloors = () => {
    setIsSaving(true)
    localStorage.setItem('hotelFloors', JSON.stringify(floors))
    setTimeout(() => {
      setIsSaving(false)
      showMessage('success', '✅ სართულები შენახულია!')
    }, 500)
  }
  
  // NEW: Save Staff
  const saveStaff = () => {
    setIsSaving(true)
    localStorage.setItem('hotelStaff', JSON.stringify(staff))
    setTimeout(() => {
      setIsSaving(false)
      showMessage('success', '✅ თანამშრომლები შენახულია!')
    }, 500)
  }
  
  // NEW: Save Pricing
  const savePricing = () => {
    setIsSaving(true)
    localStorage.setItem('hotelSeasons', JSON.stringify(seasons))
    localStorage.setItem('hotelExtraServices', JSON.stringify(extraServices))
    localStorage.setItem('hotelPackages', JSON.stringify(packages))
    localStorage.setItem('hotelTaxes', JSON.stringify(taxes))
    localStorage.setItem('hotelQuickCharges', JSON.stringify(quickCharges))
    setTimeout(() => {
      setIsSaving(false)
      showMessage('success', '✅ ფასების პარამეტრები შენახულია!')
    }, 500)
  }
  
  // Save Calendar Settings
  const saveCalendarSettings = async () => {
    try {
      setIsSaving(true)
      localStorage.setItem('calendarSettings', JSON.stringify(calendarSettings))
      setTimeout(() => {
        setIsSaving(false)
        showMessage('success', '✅ კალენდრის პარამეტრები შენახულია!')
      }, 500)
    } catch (e) {
      console.error('Error saving calendar settings:', e)
      showMessage('error', '❌ შეცდომა შენახვისას')
      setIsSaving(false)
    }
  }
  
  const showMessage = (type: 'success' | 'error', text: string) => {
    setSaveMessage({ type, text })
    setTimeout(() => setSaveMessage(null), 3000)
  }
  
  // Navigation items - UPDATED with Floors and Staff
  const navItems = [
    { id: 'hotel', label: 'სასტუმრო', icon: '🏨', description: 'ინფორმაცია და პერსონალი' },
    { id: 'rooms', label: 'ოთახები', icon: '🚪', description: 'ოთახები, ტიპები, სართულები' },
    { id: 'calendar', label: 'კალენდარი', icon: '📅', description: 'Drag & Drop, Resize' },
    { id: 'room-pricing', label: 'ოთახის ფასები', icon: '💰', description: 'ფასები და გადასახადები' },
    { id: 'services', label: 'სერვისები', icon: '🛎️', description: 'დამატებითი სერვისები' },
    { id: 'users', label: 'მომხმარებლები', icon: '👥', description: 'წვდომა და უფლებები' },
    { id: 'housekeeping', label: 'დასუფთავება', icon: '🧹', description: 'Housekeeping ჩეკლისტი' },
    { id: 'cashier', label: 'სალარო', icon: '💰', description: 'სალაროს პარამეტრები' },
    { id: 'system', label: 'სისტემა', icon: '🖥️', description: 'სისტემის პარამეტრები' }
  ]
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">⚙️ პარამეტრები</h1>
              <p className="text-sm text-gray-500 mt-1">სასტუმროს კონფიგურაცია და მართვა</p>
            </div>
            
            {/* Save Message */}
            {saveMessage && (
              <div className={`px-4 py-2 rounded-lg text-sm font-medium ${
                saveMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {saveMessage.text}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar Navigation */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full px-4 py-3 text-left flex items-center gap-3 transition border-l-4 ${
                    activeSection === item.id
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'border-transparent hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <div>
                    <div className="font-medium">{item.label}</div>
                    <div className="text-xs text-gray-500">{item.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
          
          {/* Main Content */}
          <div className="flex-1">
            {/* Hotel & Staff Section */}
            {activeSection === 'hotel' && (
              <HotelAndStaffSection 
                hotelInfo={hotelInfo}
                setHotelInfo={setHotelInfo}
                staff={staff}
                setStaff={setStaff}
                onSaveHotel={saveHotelInfo}
                onSaveStaff={saveStaff}
                isSaving={isSaving}
              />
            )}
            
            {/* Rooms Section */}
            {activeSection === 'rooms' && (
              <RoomsSection 
                rooms={rooms}
                setRooms={setRooms}
                roomTypes={roomTypes}
                setRoomTypes={setRoomTypes}
                floors={floors}
                setFloors={setFloors}
                onSaveTypes={saveRoomTypes}
                onSaveFloors={saveFloors}
                isSaving={isSaving}
                loadRooms={loadAllData}
              />
            )}
            
            {/* Calendar Section */}
            {activeSection === 'calendar' && (
              <CalendarSettingsSection
                settings={calendarSettings}
                setSettings={setCalendarSettings}
                onSave={saveCalendarSettings}
              />
            )}
            
            {/* Room Pricing Section */}
            {activeSection === 'room-pricing' && (
              <RoomPricingSection 
                roomTypes={roomTypes}
                seasons={seasons}
                setSeasons={setSeasons}
                extraServices={extraServices}
                setExtraServices={setExtraServices}
                taxes={taxes}
                setTaxes={setTaxes}
                onSave={savePricing}
                isSaving={isSaving}
              />
            )}
            
            {/* Services Section */}
            {activeSection === 'services' && (
              <ServicesSection 
                extraServices={extraServices}
                setExtraServices={setExtraServices}
                taxes={taxes}
                setTaxes={setTaxes}
                quickCharges={quickCharges}
                setQuickCharges={setQuickCharges}
                onSave={savePricing}
                isSaving={isSaving}
              />
            )}
            
            {/* Users Section */}
            {activeSection === 'users' && (
              <UsersSection 
                users={users}
                setUsers={setUsers}
                onSave={saveUsers}
                isSaving={isSaving}
              />
            )}
            
            {/* Housekeeping Section */}
            {activeSection === 'housekeeping' && (
              <HousekeepingSection 
                checklist={checklist}
                setChecklist={setChecklist}
                onSave={saveChecklist}
                isSaving={isSaving}
              />
            )}
            
            {/* Cashier Section */}
            {activeSection === 'cashier' && (
              <CashierSettingsSection
                settings={cashierSettings}
                setSettings={setCashierSettings}
                onSave={() => {
                  localStorage.setItem('cashierSettings', JSON.stringify(cashierSettings))
                  showMessage('success', '✅ სალაროს პარამეტრები შენახულია!')
                }}
              />
            )}
            
            {/* System Section */}
            {activeSection === 'system' && (
              <SystemSection 
                systemSettings={systemSettings}
                setSystemSettings={setSystemSettings}
                activityLogs={activityLogs}
                onSave={saveSystemSettings}
                isSaving={isSaving}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ==================== HOTEL INFO SECTION (UPDATED with Logo) ====================
function HotelInfoSection({ hotelInfo, setHotelInfo, onSave, isSaving }: {
  hotelInfo: HotelInfo
  setHotelInfo: (info: HotelInfo) => void
  onSave: () => void
  isSaving: boolean
}) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          🏨 სასტუმროს ინფორმაცია
        </h2>
        
        {/* Logo Section - NEW */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-2">🖼️ ლოგო (URL)</label>
          <div className="flex gap-4 items-start">
            <div className="flex-1">
              <input
                type="url"
                value={hotelInfo.logo}
                onChange={(e) => setHotelInfo({ ...hotelInfo, logo: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://example.com/logo.png"
              />
              <p className="text-xs text-gray-500 mt-1">შეიყვანეთ ლოგოს URL მისამართი (PNG, JPG ან SVG)</p>
            </div>
            {hotelInfo.logo && (
              <div className="w-24 h-24 border rounded-lg overflow-hidden bg-white flex items-center justify-center">
                <img 
                  src={hotelInfo.logo} 
                  alt="Hotel Logo" 
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🏨</text></svg>'
                  }}
                />
              </div>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">სასტუმროს სახელი</label>
            <input
              type="text"
              value={hotelInfo.name}
              onChange={(e) => setHotelInfo({ ...hotelInfo, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Hotel Tbilisi"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">კომპანიის სახელი</label>
            <input
              type="text"
              value={hotelInfo.company}
              onChange={(e) => setHotelInfo({ ...hotelInfo, company: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="შპს სასტუმრო"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">საიდენტიფიკაციო კოდი</label>
            <input
              type="text"
              value={hotelInfo.taxId}
              onChange={(e) => setHotelInfo({ ...hotelInfo, taxId: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="123456789"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ტელეფონი</label>
            <input
              type="text"
              value={hotelInfo.phone}
              onChange={(e) => setHotelInfo({ ...hotelInfo, phone: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="+995 555 123456"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ელ. ფოსტა</label>
            <input
              type="email"
              value={hotelInfo.email}
              onChange={(e) => setHotelInfo({ ...hotelInfo, email: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="info@hotel.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ვებსაიტი</label>
            <input
              type="url"
              value={hotelInfo.website}
              onChange={(e) => setHotelInfo({ ...hotelInfo, website: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://hotel.com"
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">მისამართი</label>
            <input
              type="text"
              value={hotelInfo.address}
              onChange={(e) => setHotelInfo({ ...hotelInfo, address: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="რუსთაველის გამზ. 1, თბილისი"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ქალაქი</label>
            <input
              type="text"
              value={hotelInfo.city}
              onChange={(e) => setHotelInfo({ ...hotelInfo, city: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="თბილისი"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ქვეყანა</label>
            <input
              type="text"
              value={hotelInfo.country}
              onChange={(e) => setHotelInfo({ ...hotelInfo, country: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="საქართველო"
            />
          </div>
        </div>
      </div>
      
      {/* Bank Details */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          🏦 საბანკო რეკვიზიტები
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ბანკის სახელი</label>
            <input
              type="text"
              value={hotelInfo.bankName}
              onChange={(e) => setHotelInfo({ ...hotelInfo, bankName: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="საქართველოს ბანკი"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ანგარიშის ნომერი (IBAN)</label>
            <input
              type="text"
              value={hotelInfo.bankAccount}
              onChange={(e) => setHotelInfo({ ...hotelInfo, bankAccount: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="GE00TB0000000000000000"
            />
          </div>
        </div>
      </div>
      
      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={onSave}
          disabled={isSaving}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 font-medium"
        >
          {isSaving ? '⏳ ინახება...' : '💾 შენახვა'}
        </button>
      </div>
    </div>
  )
}

// ==================== HOTEL AND STAFF SECTION ====================
function HotelAndStaffSection({ hotelInfo, setHotelInfo, staff, setStaff, onSaveHotel, onSaveStaff, isSaving }: {
  hotelInfo: HotelInfo
  setHotelInfo: (info: HotelInfo) => void
  staff: StaffMember[]
  setStaff: (staff: StaffMember[]) => void
  onSaveHotel: () => void
  onSaveStaff: () => void
  isSaving: boolean
}) {
  const [activeTab, setActiveTab] = useState<'hotel' | 'staff'>('hotel')
  
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('hotel')}
            className={`flex-1 px-4 py-3 font-medium text-sm ${
              activeTab === 'hotel' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            🏨 სასტუმროს ინფორმაცია
          </button>
          <button
            onClick={() => setActiveTab('staff')}
            className={`flex-1 px-4 py-3 font-medium text-sm ${
              activeTab === 'staff' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            👷 თანამშრომლები
          </button>
        </div>
        
        <div className="p-6">
          {activeTab === 'hotel' && (
            <HotelInfoSection 
              hotelInfo={hotelInfo}
              setHotelInfo={setHotelInfo}
              onSave={onSaveHotel}
              isSaving={isSaving}
            />
          )}
          
          {activeTab === 'staff' && (
            <StaffSection 
              staff={staff}
              setStaff={setStaff}
              onSave={onSaveStaff}
              isSaving={isSaving}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ==================== NEW: STAFF SECTION ====================
function StaffSection({ staff, setStaff, onSave, isSaving }: {
  staff: StaffMember[]
  setStaff: (staff: StaffMember[]) => void
  onSave: () => void
  isSaving: boolean
}) {
  const [showAddStaff, setShowAddStaff] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null)
  const [filterDepartment, setFilterDepartment] = useState('')
  const [newStaff, setNewStaff] = useState({
    firstName: '', lastName: '', position: '', department: 'housekeeping' as StaffMember['department'],
    phone: '', email: '', notes: ''
  })
  
  const departments: { id: StaffMember['department']; label: string; icon: string }[] = [
    { id: 'housekeeping', label: 'Housekeeping', icon: '🧹' },
    { id: 'frontdesk', label: 'Front Desk', icon: '🛎️' },
    { id: 'maintenance', label: 'Maintenance', icon: '🔧' },
    { id: 'restaurant', label: 'Restaurant', icon: '🍽️' },
    { id: 'management', label: 'Management', icon: '👔' },
    { id: 'other', label: 'სხვა', icon: '👤' }
  ]
  
  const handleSaveStaff = () => {
    if (!newStaff.firstName || !newStaff.lastName) {
      alert('შეავსეთ სახელი და გვარი')
      return
    }
    
    if (editingStaff) {
      setStaff(staff.map(s => s.id === editingStaff.id 
        ? { ...editingStaff, ...newStaff } 
        : s
      ))
    } else {
      const member: StaffMember = {
        id: `staff-${Date.now()}`,
        ...newStaff,
        active: true,
        hireDate: new Date().toISOString().split('T')[0]
      }
      setStaff([...staff, member])
    }
    setShowAddStaff(false)
    setEditingStaff(null)
    setNewStaff({ firstName: '', lastName: '', position: '', department: 'housekeeping', phone: '', email: '', notes: '' })
    onSave()
  }
  
  const handleDeleteStaff = (staffId: string) => {
    if (!confirm('ნამდვილად გსურთ თანამშრომლის წაშლა?')) return
    setStaff(staff.filter(s => s.id !== staffId))
    onSave()
  }
  
  const handleToggleActive = (staffId: string) => {
    setStaff(staff.map(s => s.id === staffId ? { ...s, active: !s.active } : s))
    onSave()
  }
  
  const filteredStaff = filterDepartment 
    ? staff.filter(s => s.department === filterDepartment)
    : staff
  
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-800">👷 თანამშრომლები</h2>
          <button
            onClick={() => { setShowAddStaff(true); setEditingStaff(null) }}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600"
          >
            + დამატება
          </button>
        </div>
        
        {/* Department Filter */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setFilterDepartment('')}
            className={`px-3 py-1.5 rounded-lg text-sm ${!filterDepartment ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
          >
            ყველა ({staff.length})
          </button>
          {departments.map(dept => {
            const count = staff.filter(s => s.department === dept.id).length
            return (
              <button
                key={dept.id}
                onClick={() => setFilterDepartment(dept.id)}
                className={`px-3 py-1.5 rounded-lg text-sm ${filterDepartment === dept.id ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
              >
                {dept.icon} {dept.label} ({count})
              </button>
            )
          })}
        </div>
        
        {/* Add/Edit Staff Form */}
        {showAddStaff && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h4 className="font-medium mb-3">{editingStaff ? '✏️ რედაქტირება' : '➕ ახალი თანამშრომელი'}</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">სახელი *</label>
                <input
                  type="text"
                  value={newStaff.firstName}
                  onChange={(e) => setNewStaff({ ...newStaff, firstName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">გვარი *</label>
                <input
                  type="text"
                  value={newStaff.lastName}
                  onChange={(e) => setNewStaff({ ...newStaff, lastName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">პოზიცია</label>
                <input
                  type="text"
                  value={newStaff.position}
                  onChange={(e) => setNewStaff({ ...newStaff, position: e.target.value })}
                  placeholder="მაგ: Housekeeper"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">დეპარტამენტი</label>
                <select
                  value={newStaff.department}
                  onChange={(e) => setNewStaff({ ...newStaff, department: e.target.value as StaffMember['department'] })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.icon} {d.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">ტელეფონი</label>
                <input
                  type="text"
                  value={newStaff.phone}
                  onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                  placeholder="+995 555 ..."
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">ელ. ფოსტა</label>
                <input
                  type="email"
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-xs text-gray-600 mb-1">შენიშვნები</label>
              <textarea
                value={newStaff.notes}
                onChange={(e) => setNewStaff({ ...newStaff, notes: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm h-16"
                placeholder="დამატებითი ინფორმაცია..."
              />
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={handleSaveStaff} className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm">💾 შენახვა</button>
              <button onClick={() => { setShowAddStaff(false); setEditingStaff(null) }} className="px-4 py-2 bg-gray-300 rounded-lg text-sm">გაუქმება</button>
            </div>
          </div>
        )}
        
        {/* Staff List */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 text-sm font-medium text-gray-600">თანამშრომელი</th>
                <th className="text-left p-3 text-sm font-medium text-gray-600">პოზიცია</th>
                <th className="text-left p-3 text-sm font-medium text-gray-600">დეპარტამენტი</th>
                <th className="text-left p-3 text-sm font-medium text-gray-600">კონტაქტი</th>
                <th className="text-left p-3 text-sm font-medium text-gray-600">სტატუსი</th>
                <th className="text-right p-3 text-sm font-medium text-gray-600">მოქმედება</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.map(member => {
                const dept = departments.find(d => d.id === member.department)
                return (
                  <tr key={member.id} className={`border-t hover:bg-gray-50 ${!member.active ? 'opacity-50' : ''}`}>
                    <td className="p-3">
                      <div className="font-medium">{member.firstName} {member.lastName}</div>
                      <div className="text-xs text-gray-500">დაწყება: {member.hireDate}</div>
                    </td>
                    <td className="p-3">{member.position || '-'}</td>
                    <td className="p-3">
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                        {dept?.icon} {dept?.label}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="text-sm">{member.phone}</div>
                      <div className="text-xs text-gray-500">{member.email}</div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs ${member.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {member.active ? 'აქტიური' : 'არააქტიური'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleToggleActive(member.id)}
                        className="px-2 py-1 text-gray-600 hover:bg-gray-100 rounded text-sm"
                        title={member.active ? 'დეაქტივაცია' : 'აქტივაცია'}
                      >{member.active ? '⏸️' : '▶️'}</button>
                      <button
                        onClick={() => { 
                          setEditingStaff(member)
                          setNewStaff({
                            firstName: member.firstName,
                            lastName: member.lastName,
                            position: member.position,
                            department: member.department,
                            phone: member.phone,
                            email: member.email,
                            notes: member.notes
                          })
                          setShowAddStaff(true)
                        }}
                        className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded text-sm"
                      >✏️</button>
                      <button
                        onClick={() => handleDeleteStaff(member.id)}
                        className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-sm ml-1"
                      >🗑️</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        
        {filteredStaff.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>თანამშრომლები არ მოიძებნა</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ==================== ROOMS SECTION ====================
function RoomsSection({ rooms, setRooms, roomTypes, setRoomTypes, floors, setFloors, onSaveTypes, onSaveFloors, isSaving, loadRooms }: {
  rooms: Room[]
  setRooms: (rooms: Room[]) => void
  roomTypes: RoomType[]
  setRoomTypes: (types: RoomType[]) => void
  floors: Floor[]
  setFloors: (floors: Floor[]) => void
  onSaveTypes: () => void
  onSaveFloors: () => void
  isSaving: boolean
  loadRooms: () => void
}) {
  const [activeTab, setActiveTab] = useState<'rooms' | 'types' | 'floors'>('rooms')
  
  return (
    <div className="space-y-6">
      {/* Beautiful Tabs */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="flex p-2 gap-2 bg-gray-100">
          {/* Rooms Tab */}
          <button
            onClick={() => setActiveTab('rooms')}
            className={`flex-1 flex items-center justify-center gap-3 px-6 py-3 rounded-lg font-medium text-sm transition-all duration-200 ${
              activeTab === 'rooms' 
                ? 'bg-white text-blue-600 shadow-md' 
                : 'text-gray-600 hover:bg-white/50'
            }`}
          >
            <span className={`text-2xl ${activeTab === 'rooms' ? 'scale-110' : ''} transition-transform`}>🚪</span>
            <div className="text-left">
              <div className="font-semibold">ოთახების სია</div>
              <div className={`text-xs ${activeTab === 'rooms' ? 'text-blue-500' : 'text-gray-400'}`}>
                {rooms.length} ოთახი
              </div>
            </div>
          </button>

          {/* Room Types Tab */}
          <button
            onClick={() => setActiveTab('types')}
            className={`flex-1 flex items-center justify-center gap-3 px-6 py-3 rounded-lg font-medium text-sm transition-all duration-200 ${
              activeTab === 'types' 
                ? 'bg-white text-purple-600 shadow-md' 
                : 'text-gray-600 hover:bg-white/50'
            }`}
          >
            <span className={`text-2xl ${activeTab === 'types' ? 'scale-110' : ''} transition-transform`}>🏷️</span>
            <div className="text-left">
              <div className="font-semibold">ოთახის ტიპები</div>
              <div className={`text-xs ${activeTab === 'types' ? 'text-purple-500' : 'text-gray-400'}`}>
                {roomTypes.length} ტიპი
              </div>
            </div>
          </button>

          {/* Floors Tab */}
          <button
            onClick={() => setActiveTab('floors')}
            className={`flex-1 flex items-center justify-center gap-3 px-6 py-3 rounded-lg font-medium text-sm transition-all duration-200 ${
              activeTab === 'floors' 
                ? 'bg-white text-emerald-600 shadow-md' 
                : 'text-gray-600 hover:bg-white/50'
            }`}
          >
            <span className={`text-2xl ${activeTab === 'floors' ? 'scale-110' : ''} transition-transform`}>🏢</span>
            <div className="text-left">
              <div className="font-semibold">სართულები</div>
              <div className={`text-xs ${activeTab === 'floors' ? 'text-emerald-500' : 'text-gray-400'}`}>
                {floors.length} სართული
              </div>
            </div>
          </button>
        </div>
        
        <div className="p-6">
          {/* Rooms List */}
          {activeTab === 'rooms' && (
            <RoomsListEditor 
              rooms={rooms} 
              setRooms={setRooms} 
              roomTypes={roomTypes}
              floors={floors}
              onSave={loadRooms}
            />
          )}
          
          {/* Room Types */}
          {activeTab === 'types' && (
            <RoomTypesEditor roomTypes={roomTypes} setRoomTypes={setRoomTypes} onSave={onSaveTypes} isSaving={isSaving} />
          )}
          
          {/* Floors */}
          {activeTab === 'floors' && (
            <FloorsEditor floors={floors} setFloors={setFloors} onSave={onSaveFloors} isSaving={isSaving} />
          )}
        </div>
      </div>
    </div>
  )
}

// Room Types Editor Component
function RoomTypesEditor({ roomTypes, setRoomTypes, onSave, isSaving }: {
  roomTypes: RoomType[]
  setRoomTypes: (types: RoomType[]) => void
  onSave: () => void
  isSaving: boolean
}) {
  const [editingType, setEditingType] = useState<RoomType | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  
  // New type form
  const [newType, setNewType] = useState<RoomType>({
    id: '',
    name: '',
    basePrice: 100,
    description: '',
    maxGuests: 2,
    beds: 1,
    icon: '🛏️'
  })
  
  const handleSaveType = () => {
    if (editingType) {
      // Update existing
      setRoomTypes(roomTypes.map(t => t.id === editingType.id ? newType : t))
    } else {
      // Add new
      const typeWithId = { ...newType, id: `type-${Date.now()}` }
      setRoomTypes([...roomTypes, typeWithId])
    }
    setEditingType(null)
    setShowAddModal(false)
    resetForm()
  }
  
  const handleEdit = (type: RoomType) => {
    setNewType({ ...type })
    setEditingType(type)
    setShowAddModal(true)
  }
  
  const handleDelete = (id: string) => {
    if (confirm('ნამდვილად გსურთ ტიპის წაშლა?')) {
      setRoomTypes(roomTypes.filter(t => t.id !== id))
    }
  }
  
  const resetForm = () => {
    setNewType({
      id: '',
      name: '',
      basePrice: 100,
      description: '',
      maxGuests: 2,
      beds: 1,
      icon: '🛏️'
    })
  }
  
  const openAddModal = () => {
    resetForm()
    setEditingType(null)
    setShowAddModal(true)
  }

  // Icon options
  const iconOptions = [
    { value: '🛏️', label: 'Standard' },
    { value: '🌟', label: 'Deluxe' },
    { value: '👑', label: 'Suite' },
    { value: '👨‍👩‍👧‍👦', label: 'Family' },
    { value: '🏠', label: 'Studio' },
    { value: '🏡', label: 'Villa' },
    { value: '💎', label: 'Premium' },
    { value: '🌴', label: 'Bungalow' },
  ]
  
  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="font-bold text-gray-800 text-lg">ოთახის ტიპები</h3>
          <p className="text-sm text-gray-500">მართეთ ოთახის კატეგორიები და ფასები</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={openAddModal} 
            className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600 flex items-center gap-2 shadow-sm"
          >
            <span>➕</span> ახალი ტიპი
          </button>
          <button 
            onClick={onSave} 
            disabled={isSaving} 
            className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50 flex items-center gap-2 shadow-sm"
          >
            {isSaving ? '⏳' : '💾'} შენახვა
          </button>
        </div>
      </div>
      
      {/* Room Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roomTypes.map(type => (
          <div 
            key={type.id} 
            className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-all duration-200 group"
          >
            {/* Card Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{type.icon || '🛏️'}</span>
                <div>
                  <h4 className="font-bold text-gray-800 text-lg">{type.name}</h4>
                  <p className="text-sm text-gray-500">{type.description || 'აღწერა არ არის'}</p>
                </div>
              </div>
            </div>
            
            {/* Card Body - Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-blue-600">₾{type.basePrice}</div>
                <div className="text-xs text-blue-500">ბაზისური ფასი</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-purple-600">👥 {type.maxGuests}</div>
                <div className="text-xs text-purple-500">მაქს. სტუმარი</div>
              </div>
            </div>
            
            {/* Card Footer - Actions */}
            <div className="flex gap-2 pt-3 border-t border-gray-100">
              <button
                onClick={() => handleEdit(type)}
                className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition flex items-center justify-center gap-2"
              >
                ✏️ რედაქტირება
              </button>
              <button
                onClick={() => handleDelete(type.id)}
                className="px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
        
        {/* Add New Card */}
        <button
          onClick={openAddModal}
          className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-8 hover:border-purple-400 hover:bg-purple-50 transition-all duration-200 flex flex-col items-center justify-center gap-3 group"
        >
          <span className="text-4xl group-hover:scale-110 transition-transform">➕</span>
          <span className="text-gray-500 font-medium group-hover:text-purple-600">ახალი ტიპის დამატება</span>
        </button>
      </div>
      
      {/* Edit/Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-500 to-blue-500 px-6 py-4">
              <h3 className="text-xl font-bold text-white">
                {editingType ? '✏️ ტიპის რედაქტირება' : '➕ ახალი ტიპი'}
              </h3>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Icon Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">აირჩიეთ იკონი</label>
                <div className="flex flex-wrap gap-2">
                  {iconOptions.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setNewType({ ...newType, icon: opt.value })}
                      className={`w-12 h-12 rounded-lg text-2xl flex items-center justify-center transition ${
                        newType.icon === opt.value 
                          ? 'bg-purple-100 border-2 border-purple-500 scale-110' 
                          : 'bg-gray-100 hover:bg-gray-200 border-2 border-transparent'
                      }`}
                      title={opt.label}
                    >
                      {opt.value}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ტიპის სახელი *</label>
                <input
                  type="text"
                  value={newType.name}
                  onChange={(e) => setNewType({ ...newType, name: e.target.value })}
                  placeholder="მაგ: Deluxe Double"
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              
              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">აღწერა</label>
                <textarea
                  value={newType.description || ''}
                  onChange={(e) => setNewType({ ...newType, description: e.target.value })}
                  placeholder="ოთახის მოკლე აღწერა..."
                  rows={2}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              
              {/* Price and Guests */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ბაზისური ფასი (₾)</label>
                  <input
                    type="number"
                    value={newType.basePrice}
                    onChange={(e) => setNewType({ ...newType, basePrice: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">მაქს. სტუმარი</label>
                  <input
                    type="number"
                    value={newType.maxGuests}
                    onChange={(e) => setNewType({ ...newType, maxGuests: parseInt(e.target.value) || 1 })}
                    min={1}
                    max={10}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              {/* Beds */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">საწოლების რაოდენობა</label>
                <input
                  type="number"
                  value={newType.beds || 1}
                  onChange={(e) => setNewType({ ...newType, beds: parseInt(e.target.value) || 1 })}
                  min={1}
                  max={10}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => { setShowAddModal(false); setEditingType(null); resetForm() }}
                className="px-5 py-2 text-gray-700 bg-gray-200 rounded-lg font-medium hover:bg-gray-300 transition"
              >
                გაუქმება
              </button>
              <button
                onClick={handleSaveType}
                disabled={!newType.name.trim()}
                className="px-5 py-2 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {editingType ? '💾 განახლება' : '➕ დამატება'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Rooms List Editor Component
function RoomsListEditor({ rooms, setRooms, roomTypes, floors, onSave }: {
  rooms: any[]
  setRooms: (rooms: any[]) => void
  roomTypes: RoomType[]
  floors: Floor[]
  onSave: () => void
}) {
  const [showModal, setShowModal] = useState(false)
  const [editingRoom, setEditingRoom] = useState<any | null>(null)
  const [newRoom, setNewRoom] = useState({
    roomNumber: '',
    floor: 1,
    roomType: 'Standard',
    basePrice: 150,
    status: 'VACANT'
  })
  const [filterFloor, setFilterFloor] = useState<number | 'all'>('all')
  const [filterType, setFilterType] = useState<string | 'all'>('all')

  const handleSave = async () => {
    try {
      if (!newRoom.roomNumber.trim()) {
        alert('შეიყვანეთ ოთახის ნომერი')
        return
      }
      
      // Prepare room data
      const roomTypeValue = newRoom.roomType || (roomTypes.length > 0 ? roomTypes[0].name : 'Standard')
      const roomData = {
        roomNumber: newRoom.roomNumber,
        floor: newRoom.floor,
        type: roomTypeValue,  // Use 'type' for consistency
        roomType: roomTypeValue,
        basePrice: newRoom.basePrice || 150,
        status: editingRoom?.status || 'VACANT',
        amenities: editingRoom?.amenities || []
      }
      
      console.log('Saving room:', roomData)
      
      // Get existing rooms from localStorage
      let existingRooms: any[] = []
      try {
        existingRooms = JSON.parse(localStorage.getItem('hotelRooms') || '[]')
      } catch (e) {
        existingRooms = []
      }
      
      let updatedRooms: any[]
      
      if (editingRoom) {
        // Update existing room
        updatedRooms = existingRooms.map((r: any) => 
          r.id === editingRoom.id 
            ? { ...r, ...roomData }
            : r
        )
      } else {
        // Check for duplicate room number
        const exists = existingRooms.some(r => r.roomNumber === newRoom.roomNumber)
        if (exists) {
          alert('❌ ოთახი ამ ნომრით უკვე არსებობს!')
          return
        }
        
        // Add new room
        const newRoomData = {
          ...roomData,
          id: `room-${Date.now()}`
        }
        updatedRooms = [...existingRooms, newRoomData]
      }
      
      // Save to localStorage
      localStorage.setItem('hotelRooms', JSON.stringify(updatedRooms))
      console.log('Saved rooms:', updatedRooms)
      
      // Update local state
      setRooms(updatedRooms)
      
      // Also try API (optional, don't fail if it errors)
      try {
        if (editingRoom) {
          await fetch(`/api/hotel/rooms/${editingRoom.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...editingRoom, ...roomData })
          })
        } else {
          await fetch('/api/hotel/rooms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...roomData, id: `room-${Date.now()}` })
          })
        }
      } catch (apiError) {
        console.warn('API save failed, using localStorage:', apiError)
      }
      
      // Reload and reset
      onSave()
      closeModal()
      setEditingRoom(null)
      setNewRoom({ roomNumber: '', floor: 1, roomType: 'Standard', basePrice: 150, status: 'VACANT' })
      
    } catch (error) {
      console.error('Error saving room:', error)
      alert('❌ შეცდომა ოთახის შენახვისას')
    }
  }

  const handleDelete = async (roomId: string) => {
    if (!confirm('ნამდვილად გსურთ ოთახის წაშლა?')) return
    
    try {
      // Delete from localStorage
      const existingRooms = JSON.parse(localStorage.getItem('hotelRooms') || '[]')
      const updatedRooms = existingRooms.filter((r: any) => r.id !== roomId)
      localStorage.setItem('hotelRooms', JSON.stringify(updatedRooms))
      
      // Update local state
      setRooms(updatedRooms)
      
      // Also try API
      try {
        await fetch(`/api/hotel/rooms/${roomId}`, { method: 'DELETE' })
      } catch (e) {
        console.warn('API delete failed:', e)
      }
      
      onSave()
      
    } catch (error) {
      console.error('Error deleting room:', error)
      alert('❌ შეცდომა ოთახის წაშლისას')
    }
  }
  
  const handleStatusChange = (roomId: string, newStatus: string) => {
    try {
      const existingRooms = JSON.parse(localStorage.getItem('hotelRooms') || '[]')
      const updatedRooms = existingRooms.map((r: any) => 
        r.id === roomId ? { ...r, status: newStatus } : r
      )
      localStorage.setItem('hotelRooms', JSON.stringify(updatedRooms))
      
      // Update local state
      setRooms(updatedRooms)
      
      console.log(`Room ${roomId} status changed to ${newStatus}`)
    } catch (error) {
      console.error('Error changing status:', error)
    }
  }

  const openAddModal = () => {
    setEditingRoom(null)
    setNewRoom({
      roomNumber: '',
      floor: floors.length > 0 ? floors[0].number : 1,
      roomType: roomTypes.length > 0 ? roomTypes[0].name : 'Standard',
      basePrice: 150,
      status: 'VACANT'
    })
    setShowModal(true)
  }

  const openEditModal = (room: any) => {
    setEditingRoom(room)
    setNewRoom({
      roomNumber: room.roomNumber,
      floor: room.floor,
      roomType: room.type || room.roomType || 'Standard',  // ← type პირველი!
      basePrice: room.basePrice || 150,
      status: room.status || 'VACANT'
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingRoom(null)
  }

  // Get room type info
  const getRoomTypeInfo = (typeName: string) => {
    if (!typeName) return { icon: '🚪', basePrice: 0, maxGuests: 2 }
    return roomTypes.find(t => t.name === typeName) || { icon: '🚪', basePrice: 0, maxGuests: 2 }
  }

  // Filter rooms
  const filteredRooms = rooms.filter(room => {
    if (filterFloor !== 'all' && room.floor !== filterFloor) return false
    const roomTypeValue = room.type || room.roomType
    if (filterType !== 'all' && roomTypeValue !== filterType) return false
    return true
  })

  // Group by floor
  const roomsByFloor = filteredRooms.reduce((acc, room) => {
    const floor = room.floor || 1
    if (!acc[floor]) acc[floor] = []
    acc[floor].push(room)
    return acc
  }, {} as { [key: number]: any[] })

  const statusColors: { [key: string]: string } = {
    'VACANT': 'bg-green-500',
    'OCCUPIED': 'bg-red-500',
    'MAINTENANCE': 'bg-yellow-500',
    'CLEANING': 'bg-blue-500'
  }

  const statusLabels: { [key: string]: string } = {
    'VACANT': 'თავისუფალი',
    'OCCUPIED': 'დაკავებული',
    'MAINTENANCE': 'რემონტი',
    'CLEANING': 'იწმინდება'
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h3 className="font-bold text-gray-800 text-lg">ოთახების სია</h3>
          <p className="text-sm text-gray-500">სულ {rooms.length} ოთახი</p>
        </div>
        <button 
          onClick={openAddModal}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 flex items-center gap-2 shadow-sm"
        >
          <span>➕</span> ახალი ოთახი
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 p-4 bg-gray-50 rounded-xl">
        <div>
          <label className="block text-xs text-gray-500 mb-1">სართული</label>
          <select
            value={filterFloor}
            onChange={(e) => setFilterFloor(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
            className="px-3 py-2 border rounded-lg text-sm bg-white"
          >
            <option value="all">ყველა სართული</option>
            {floors.filter(f => f.active).map(f => (
              <option key={f.id} value={f.number}>{f.name || `სართული ${f.number}`}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">ტიპი</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm bg-white"
          >
            <option value="all">ყველა ტიპი</option>
            {roomTypes.map(t => (
              <option key={t.id} value={t.name}>{t.icon || '🚪'} {t.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <span className="text-sm text-gray-500">
            ნაჩვენებია: <strong>{filteredRooms.length}</strong> ოთახი
          </span>
        </div>
      </div>

      {/* Rooms Grid by Floor */}
      {Object.keys(roomsByFloor).sort((a, b) => parseInt(a) - parseInt(b)).map(floorNum => (
        <div key={floorNum} className="mb-6">
          {/* Floor Header */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">🏢</span>
            <h4 className="font-bold text-gray-700">
              {floors.find(f => f.number === parseInt(floorNum))?.name || `სართული ${floorNum}`}
            </h4>
            <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full text-xs">
              {roomsByFloor[parseInt(floorNum)].length} ოთახი
            </span>
          </div>

          {/* Rooms Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {roomsByFloor[parseInt(floorNum)].sort((a: any, b: any) => 
              a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true })
            ).map((room: any) => {
              const roomTypeValue = room.type || room.roomType || 'Standard'
              const typeInfo = getRoomTypeInfo(roomTypeValue)
              return (
                <div
                  key={room.id}
                  className="bg-white border rounded-xl p-4 hover:shadow-lg transition-all duration-200 group cursor-pointer relative"
                  onClick={() => openEditModal(room)}
                >
                  {/* Status Dot */}
                  <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${statusColors[room.status] || 'bg-gray-400'}`} 
                       title={statusLabels[room.status] || room.status} />
                  
                  {/* Room Number */}
                  <div className="text-center mb-2">
                    <span className="text-3xl font-bold text-gray-800">{room.roomNumber}</span>
                  </div>
                  
                  {/* Room Type */}
                  <div className="text-center">
                    <span className="text-xl">{typeInfo.icon || '🚪'}</span>
                    <div className="text-xs text-gray-500 mt-1">{roomTypeValue}</div>
                  </div>
                  
                  {/* Quick Info */}
                  <div className="flex justify-center gap-2 mt-2 text-xs text-gray-400">
                    <span>👥 {typeInfo.maxGuests || 2}</span>
                    <span>₾{typeInfo.basePrice || 0}</span>
                  </div>
                  
                  {/* Hover Actions */}
                  <div className="absolute inset-0 bg-black/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditModal(room) }}
                      className="px-3 py-1.5 bg-white text-blue-600 rounded-lg text-sm font-medium"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(room.id) }}
                      className="px-3 py-1.5 bg-white text-red-600 rounded-lg text-sm font-medium"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Add New Card */}
      {filteredRooms.length === 0 && (
        <div className="text-center py-12">
          <span className="text-6xl mb-4 block">🏨</span>
          <p className="text-gray-500 mb-4">ოთახები არ მოიძებნა</p>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg"
          >
            ➕ დაამატე პირველი ოთახი
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-4">
              <h3 className="text-xl font-bold text-white">
                {editingRoom ? '✏️ ოთახის რედაქტირება' : '➕ ახალი ოთახი'}
              </h3>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Room Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ოთახის ნომერი *</label>
                <input
                  type="text"
                  value={newRoom.roomNumber}
                  onChange={(e) => setNewRoom({ ...newRoom, roomNumber: e.target.value })}
                  placeholder="მაგ: 101, 201A"
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-bold text-center"
                />
              </div>
              
              {/* Floor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">სართული</label>
                <select
                  value={newRoom.floor}
                  onChange={(e) => setNewRoom({ ...newRoom, floor: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {floors.filter(f => f.active).map(f => (
                    <option key={f.id} value={f.number}>
                      🏢 {f.name || `სართული ${f.number}`}
                    </option>
                  ))}
                  {floors.length === 0 && [1, 2, 3, 4, 5].map(f => (
                    <option key={f} value={f}>🏢 სართული {f}</option>
                  ))}
                </select>
              </div>
              
              {/* Room Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ოთახის ტიპი</label>
                <select
                  value={newRoom.roomType}
                  onChange={(e) => setNewRoom({ ...newRoom, roomType: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {/* Default option if roomTypes empty */}
                  {roomTypes.length === 0 && (
                    <option value="Standard">Standard</option>
                  )}
                  {roomTypes.map(t => (
                    <option key={t.id} value={t.name}>
                      {t.icon || '🚪'} {t.name} (👥{t.maxGuests} | ₾{t.basePrice})
                    </option>
                  ))}
                </select>
              </div>

              {/* Status (only for edit) */}
              {editingRoom && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">სტატუსი</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(statusLabels).map(([status, label]) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setNewRoom({ ...newRoom, status })}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                          newRoom.status === status
                            ? `${statusColors[status]} text-white`
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-5 py-2 text-gray-700 bg-gray-200 rounded-lg font-medium hover:bg-gray-300 transition"
              >
                გაუქმება
              </button>
              <button
                onClick={handleSave}
                disabled={!newRoom.roomNumber.trim()}
                className="px-5 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {editingRoom ? '💾 განახლება' : '➕ დამატება'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Floors Editor Component
function FloorsEditor({ floors, setFloors, onSave, isSaving }: {
  floors: Floor[]
  setFloors: (floors: Floor[]) => void
  onSave: () => void
  isSaving: boolean
}) {
  const [showModal, setShowModal] = useState(false)
  const [editingFloor, setEditingFloor] = useState<Floor | null>(null)
  const [newFloor, setNewFloor] = useState({ number: 1, name: '', description: '' })

  const handleSave = () => {
    if (editingFloor) {
      setFloors(floors.map(f => f.id === editingFloor.id 
        ? { ...editingFloor, ...newFloor, name: newFloor.name || `სართული ${newFloor.number}`, active: true } 
        : f
      ))
    } else {
      const floor: Floor = {
        id: `floor-${Date.now()}`,
        number: newFloor.number,
        name: newFloor.name || `სართული ${newFloor.number}`,
        description: newFloor.description,
        active: true
      }
      setFloors([...floors, floor].sort((a, b) => a.number - b.number))
    }
    closeModal()
    onSave()
  }

  const handleDelete = (floorId: string) => {
    if (!confirm('ნამდვილად გსურთ სართულის წაშლა?')) return
    setFloors(floors.filter(f => f.id !== floorId))
    onSave()
  }

  const handleToggleActive = (floorId: string) => {
    setFloors(floors.map(f => f.id === floorId ? { ...f, active: !f.active } : f))
    onSave()
  }

  const openAddModal = () => {
    setEditingFloor(null)
    const maxFloor = floors.length > 0 ? Math.max(...floors.map(f => f.number)) : 0
    setNewFloor({ number: maxFloor + 1, name: '', description: '' })
    setShowModal(true)
  }

  const openEditModal = (floor: Floor) => {
    setEditingFloor(floor)
    setNewFloor({ number: floor.number, name: floor.name, description: floor.description })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingFloor(null)
    setNewFloor({ number: 1, name: '', description: '' })
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="font-bold text-gray-800 text-lg">სართულები</h3>
          <p className="text-sm text-gray-500">მართეთ სასტუმროს სართულები</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={openAddModal}
            className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 flex items-center gap-2 shadow-sm"
          >
            <span>➕</span> ახალი სართული
          </button>
          <button 
            onClick={onSave}
            disabled={isSaving}
            className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50 flex items-center gap-2 shadow-sm"
          >
            {isSaving ? '⏳' : '💾'} შენახვა
          </button>
        </div>
      </div>
      
      {/* Floors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {floors.sort((a, b) => a.number - b.number).map(floor => (
          <div 
            key={floor.id} 
            className={`bg-gradient-to-br rounded-xl border p-5 hover:shadow-lg transition-all duration-200 group relative ${
              floor.active 
                ? 'from-emerald-50 to-white border-emerald-200' 
                : 'from-gray-100 to-gray-50 border-gray-300 opacity-60'
            }`}
          >
            {/* Active Toggle */}
            <button
              onClick={() => handleToggleActive(floor.id)}
              className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition ${
                floor.active 
                  ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                  : 'bg-gray-200 text-gray-400 hover:bg-gray-300'
              }`}
              title={floor.active ? 'აქტიური' : 'არააქტიური'}
            >
              {floor.active ? '✓' : '○'}
            </button>
            
            {/* Floor Number & Icon */}
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                <span className="text-3xl font-bold">{floor.number}</span>
              </div>
              <div>
                <h4 className="font-bold text-gray-800 text-lg">{floor.name}</h4>
                <p className="text-sm text-gray-500">{floor.description || 'აღწერა არ არის'}</p>
              </div>
            </div>
            
            {/* Stats (placeholder) */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-white/60 rounded-lg p-2 text-center">
                <div className="text-lg font-bold text-emerald-600">-</div>
                <div className="text-xs text-gray-500">ოთახები</div>
              </div>
              <div className="bg-white/60 rounded-lg p-2 text-center">
                <div className="text-lg font-bold text-blue-600">-</div>
                <div className="text-xs text-gray-500">დაკავებული</div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex gap-2 pt-3 border-t border-emerald-100">
              <button
                onClick={() => openEditModal(floor)}
                className="flex-1 px-3 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-200 transition flex items-center justify-center gap-2"
              >
                ✏️ რედაქტირება
              </button>
              <button
                onClick={() => handleDelete(floor.id)}
                className="px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
        
        {/* Add New Card */}
        <button
          onClick={openAddModal}
          className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-8 hover:border-emerald-400 hover:bg-emerald-50 transition-all duration-200 flex flex-col items-center justify-center gap-3 group min-h-[200px]"
        >
          <span className="text-4xl group-hover:scale-110 transition-transform">🏢</span>
          <span className="text-gray-500 font-medium group-hover:text-emerald-600">ახალი სართული</span>
        </button>
      </div>

      {/* Empty State */}
      {floors.length === 0 && (
        <div className="text-center py-12">
          <span className="text-6xl mb-4 block">🏗️</span>
          <p className="text-gray-500 mb-4">სართულები არ არის დამატებული</p>
          <button onClick={openAddModal} className="px-4 py-2 bg-emerald-500 text-white rounded-lg">
            ➕ დაამატე პირველი სართული
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-4">
              <h3 className="text-xl font-bold text-white">
                {editingFloor ? '✏️ სართულის რედაქტირება' : '➕ ახალი სართული'}
              </h3>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Floor Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">სართულის ნომერი *</label>
                <input
                  type="number"
                  value={newFloor.number}
                  onChange={(e) => setNewFloor({ ...newFloor, number: parseInt(e.target.value) || 1 })}
                  min={-2}
                  max={100}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-2xl font-bold text-center"
                />
                <p className="text-xs text-gray-500 mt-1 text-center">
                  -2 = სარდაფი, 0 = მიწისა, 1+ = სართულები
                </p>
              </div>
              
              {/* Floor Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">სახელი</label>
                <input
                  type="text"
                  value={newFloor.name}
                  onChange={(e) => setNewFloor({ ...newFloor, name: e.target.value })}
                  placeholder={`სართული ${newFloor.number}`}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              
              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">აღწერა</label>
                <textarea
                  value={newFloor.description}
                  onChange={(e) => setNewFloor({ ...newFloor, description: e.target.value })}
                  placeholder="მაგ: დელუქს ოთახები, პანორამული ხედით..."
                  rows={2}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-5 py-2 text-gray-700 bg-gray-200 rounded-lg font-medium hover:bg-gray-300 transition"
              >
                გაუქმება
              </button>
              <button
                onClick={handleSave}
                className="px-5 py-2 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition"
              >
                {editingFloor ? '💾 განახლება' : '➕ დამატება'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ==================== ROOM PRICING SECTION ====================
function RoomPricingSection({ roomTypes, seasons, setSeasons, extraServices, setExtraServices, taxes, setTaxes, onSave, isSaving }: {
  roomTypes: RoomType[]
  seasons: Season[]
  setSeasons: (seasons: Season[]) => void
  extraServices: ExtraService[]
  setExtraServices: (services: ExtraService[]) => void
  taxes: { VAT: number; CITY_TAX: number; TOURISM_TAX: number; SERVICE_CHARGE: number }
  setTaxes: (taxes: any) => void
  onSave: () => void
  isSaving: boolean
}) {
  const [activeTab, setActiveTab] = useState<'export' | 'rates' | 'seasons' | 'weekdays' | 'special' | 'bulk' | 'taxes'>('rates')
  
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {/* Tabs */}
        <div className="border-b">
          <div className="flex overflow-x-auto">
            {[
              { id: 'export', label: '📤 Export', count: null },
              { id: 'rates', label: '💵 Room Rates', count: null },
              { id: 'seasons', label: '🌞 Seasons', count: seasons.length },
              { id: 'weekdays', label: '📅 Weekdays', count: null },
              { id: 'special', label: '⭐ Special Dates', count: null },
              { id: 'bulk', label: '📝 Bulk Edit', count: null },
              { id: 'taxes', label: '📊 Taxes', count: null }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-5 py-3 whitespace-nowrap font-medium text-sm transition ${
                  activeTab === tab.id
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {tab.label} {tab.count !== null && `(${tab.count})`}
              </button>
            ))}
          </div>
        </div>
        
        <div className="p-6">
          {/* Export Tab */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="text-center py-8">
                <div className="text-5xl mb-4">📤</div>
                <h3 className="text-lg font-bold mb-2">Export Pricing Data</h3>
                <p className="text-gray-500 mb-4">Export all pricing configurations to JSON file</p>
                <button
                  onClick={() => {
                    const data = { 
                      seasons: seasons,
                      weekdayPrices: JSON.parse(localStorage.getItem('hotelWeekdayPrices') || '[]'),
                      specialDates: JSON.parse(localStorage.getItem('hotelSpecialDates') || '[]'),
                      roomRates: JSON.parse(localStorage.getItem('roomRates') || '[]'),
                      taxes: taxes
                    }
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `pricing-export-${new Date().toISOString().split('T')[0]}.json`
                    a.click()
                    alert('✅ Export successful!')
                  }}
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
                >
                  📥 Download JSON
                </button>
              </div>
            </div>
          )}
          
          {/* Room Rates Tab */}
          {activeTab === 'rates' && (
            <RoomRatesEditor roomTypes={roomTypes} />
          )}
          
          {/* Seasons Tab */}
          {activeTab === 'seasons' && (
            <SeasonsEditor 
              seasons={seasons} 
              setSeasons={setSeasons}
              roomTypes={roomTypes}
              onSave={onSave}
            />
          )}
          
          {/* Weekdays Tab */}
          {activeTab === 'weekdays' && (
            <WeekdaysEditor roomTypes={roomTypes} />
          )}
          
          {/* Special Dates Tab */}
          {activeTab === 'special' && (
            <SpecialDatesEditor roomTypes={roomTypes} />
          )}
          
          {/* Bulk Edit Tab */}
          {activeTab === 'bulk' && (
            <BulkEditEditor roomTypes={roomTypes} />
          )}
          
          {/* Taxes Tab */}
          {activeTab === 'taxes' && (
            <TaxesEditor 
              taxes={taxes} 
              setTaxes={setTaxes}
              onSave={savePricing}
            />
          )}
        </div>
        
        {/* Save Button */}
        <div className="border-t px-6 py-4 bg-gray-50 flex justify-end">
          <button onClick={onSave} disabled={isSaving} className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 font-medium">
            {isSaving ? '⏳ ინახება...' : '💾 ყველაფრის შენახვა'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ==================== SERVICES SECTION ====================
function ServicesSection({ extraServices, setExtraServices, taxes, setTaxes, quickCharges, setQuickCharges, onSave, isSaving }: {
  extraServices: ExtraService[]
  setExtraServices: (services: ExtraService[]) => void
  taxes: { VAT: number; CITY_TAX: number; TOURISM_TAX: number; SERVICE_CHARGE: number }
  setTaxes: (taxes: any) => void
  quickCharges: string[]
  setQuickCharges: (charges: string[]) => void
  onSave: () => void
  isSaving: boolean
}) {
  const [activeTab, setActiveTab] = useState<'items' | 'categories' | 'taxes' | 'quick'>('items')
  const [categories, setCategories] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [editingItem, setEditingItem] = useState<any>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<any>(null)
  
  useEffect(() => {
    loadSettings()
  }, [])
  
  const loadSettings = () => {
    if (typeof window === 'undefined') return
    
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
      const index = updatedItems.findIndex(i => i.id === item.id)
      if (index >= 0) {
        updatedItems[index] = item
      }
    } else {
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
  
  const toggleItemActive = (id: string) => {
    const updatedItems = items.map(i => 
      i.id === id ? { ...i, available: !i.available } : i
    )
    setItems(updatedItems)
    localStorage.setItem('chargeItems', JSON.stringify(updatedItems))
  }
  
  const saveCategory = (category: any) => {
    if (!category.name || !category.code) {
      alert('გთხოვთ შეიყვანოთ Name და Code')
      return
    }
    
    let updatedCategories = [...categories]
    
    if (category.id) {
      const index = updatedCategories.findIndex(c => c.id === category.id)
      if (index >= 0) {
        updatedCategories[index] = category
      }
    } else {
      category.id = `CAT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      updatedCategories.push(category)
    }
    
    setCategories(updatedCategories)
    localStorage.setItem('chargeCategories', JSON.stringify(updatedCategories))
    setShowCategoryModal(false)
    setEditingCategory(null)
  }
  
  const deleteCategory = (id: string) => {
    if (!confirm('ნამდვილად გსურთ ამ კატეგორიის წაშლა? კატეგორიაში არსებული ნივთები არ წაიშლება.')) return
    const updatedCategories = categories.filter(c => c.id !== id)
    setCategories(updatedCategories)
    localStorage.setItem('chargeCategories', JSON.stringify(updatedCategories))
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
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">⚙️ სერვისები</h2>
              <p className="text-gray-600 mt-1">მართეთ ნივთები, ფასები და კატეგორიები</p>
            </div>
            {activeTab === 'items' && (
              <button
                onClick={() => {
                  setEditingItem(null)
                  setShowAddModal(true)
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                + ახალი ნივთის დამატება
              </button>
            )}
          </div>
        </div>
        
        {/* Tabs */}
        <div className="border-b">
          <div className="flex overflow-x-auto">
            {[
              { id: 'items', label: '📦 Items & Prices', count: items.length },
              { id: 'categories', label: '📂 Categories', count: categories.length },
              { id: 'taxes', label: '💰 Taxes & Fees', count: null },
              { id: 'quick', label: '⚡ Quick Buttons', count: null }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-5 py-3 whitespace-nowrap font-medium text-sm transition ${
                  activeTab === tab.id
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {tab.label} {tab.count !== null && `(${tab.count})`}
              </button>
            ))}
          </div>
        </div>
        
        <div className="p-6">
          {/* Items & Prices Tab */}
          {activeTab === 'items' && (
            <div>
              {/* Search & Filter */}
              <div className="flex gap-4 mb-6 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <input
                    type="text"
                    placeholder="🔍 ძიება..."
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
                  <option value="">ყველა კატეგორია</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border rounded-lg px-4 py-2"
                >
                  <option value="all">ყველა სტატუსი</option>
                  <option value="active">აქტიური</option>
                  <option value="inactive">არააქტიური</option>
                </select>
              </div>
              
              {/* Items Grid */}
              {filteredItems.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg">ნივთები არ მოიძებნა</p>
                  <p className="text-sm mt-2">სცადეთ ფილტრების შეცვლა ან დამატება</p>
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
                      onToggleActive={() => toggleItemActive(item.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Categories Tab */}
          {activeTab === 'categories' && (
            <div>
              <div className="mb-4 flex justify-end">
                <button
                  onClick={() => {
                    setEditingCategory(null)
                    setShowCategoryModal(true)
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  + ახალი კატეგორიის დამატება
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map(cat => (
                  <CategoryCard 
                    key={cat.id} 
                    category={cat} 
                    items={items}
                    onEdit={() => {
                      setEditingCategory(cat)
                      setShowCategoryModal(true)
                    }}
                    onDelete={() => deleteCategory(cat.id)}
                  />
                ))}
              </div>
            </div>
          )}
          
          {/* Taxes Tab */}
          {activeTab === 'taxes' && (
            <TaxesEditor 
              taxes={taxes} 
              setTaxes={setTaxes}
              onSave={savePricing}
            />
          )}
          
          {/* Quick Buttons Tab */}
          {activeTab === 'quick' && (
            <QuickButtonsSettings items={items} quickCharges={quickCharges} setQuickCharges={setQuickCharges} />
          )}
        </div>
        
        {/* Save Button */}
        <div className="border-t px-6 py-4 bg-gray-50 flex justify-end">
          <button onClick={onSave} disabled={isSaving} className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 font-medium">
            {isSaving ? '⏳ ინახება...' : '💾 ყველაფრის შენახვა'}
          </button>
        </div>
      </div>
      
      {/* Add/Edit Item Modal */}
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
      
      {/* Add/Edit Category Modal */}
      {(showCategoryModal || editingCategory) && (
        <CategoryEditModal
          category={editingCategory}
          onSave={saveCategory}
          onClose={() => {
            setShowCategoryModal(false)
            setEditingCategory(null)
          }}
        />
      )}
    </div>
  )
}

// Item Card Component
const ItemCard = ({ item, category, onEdit, onDelete, onToggleActive }: {
  item: any
  category: any
  onEdit: () => void
  onDelete: () => void
  onToggleActive: () => void
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
            onClick={onToggleActive}
            className={`p-1 rounded transition ${
              item.available 
                ? 'hover:bg-green-100 text-green-600' 
                : 'hover:bg-gray-100 text-gray-400'
            }`}
            title={item.available ? 'დეაქტივაცია' : 'აქტივაცია'}
          >
            ✅
          </button>
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
          <span className="text-gray-600">ფასი:</span>
          <span className="font-bold">₾{item.unitPrice?.toFixed(2) || '0.00'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">ერთეული:</span>
          <span>{item.unit || 'piece'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">დეპარტამენტი:</span>
          <span>{item.department || 'ROOMS'}</span>
        </div>
        {item.trackStock && (
          <div className="flex justify-between">
            <span className="text-gray-600">საწყობი:</span>
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
            {item.available ? 'აქტიური' : 'არააქტიური'}
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
const CategoryCard = ({ category, items, onEdit, onDelete }: { 
  category: any
  items: any[]
  onEdit?: () => void
  onDelete?: () => void
}) => {
  const itemCount = items.filter((i: any) => i.categoryId === category.id).length
  
  return (
    <div className="border rounded-lg p-4 bg-white hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{category.icon}</span>
          <div>
            <h3 className="font-bold">{category.name}</h3>
            <p className="text-xs text-gray-500">{category.code}</p>
          </div>
        </div>
        {(onEdit || onDelete) && (
          <div className="flex gap-1">
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-1 hover:bg-gray-100 rounded transition"
                title="რედაქტირება"
              >
                ✏️
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-1 hover:bg-red-100 rounded transition"
                title="წაშლა"
              >
                🗑️
              </button>
            )}
          </div>
        )}
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">ნივთები:</span>
          <span className="font-bold">{itemCount}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">დეპარტამენტი:</span>
          <span>{category.department || 'ROOMS'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">გადასახადი:</span>
          <span>{category.taxRate || 0}%</span>
        </div>
        {category.serviceChargeRate && (
          <div className="flex justify-between">
            <span className="text-gray-600">სერვისი:</span>
            <span>{category.serviceChargeRate}%</span>
          </div>
        )}
      </div>
    </div>
  )
}

// Quick Buttons Settings Component
const QuickButtonsSettings = ({ items, quickCharges, setQuickCharges }: { 
  items: any[]
  quickCharges: string[]
  setQuickCharges: (charges: string[]) => void
}) => {
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
    <div>
      <h3 className="text-lg font-bold mb-4">სწრაფი წვდომის ღილაკები</h3>
      
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
            <option value="" disabled>+ დამატება</option>
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
          <p>სწრაფი ღილაკები არ არის კონფიგურირებული</p>
          <p className="text-sm mt-2">დაამატეთ ნივთები ზემოთ მოცემული dropdown-იდან</p>
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
          {item ? 'ნივთის რედაქტირება' : 'ახალი ნივთის დამატება'}
        </h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">სახელი *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">კოდი *</label>
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
              <label className="block text-sm font-medium mb-1">კატეგორია *</label>
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
              <label className="block text-sm font-medium mb-1">დეპარტამენტი</label>
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
              <label className="block text-sm font-medium mb-1">ფასი (₾) *</label>
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
              <label className="block text-sm font-medium mb-1">ერთეული</label>
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
              <label className="block text-sm font-medium mb-1">საწყობი</label>
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
              <span className="text-sm">აქტიური</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.trackStock}
                onChange={(e) => setFormData({...formData, trackStock: e.target.checked})}
                className="mr-2"
              />
              <span className="text-sm">საწყობის გათვალისწინება</span>
            </label>
          </div>
        </div>
        
        <div className="flex gap-2 mt-6">
          <button
            onClick={() => onSave(formData)}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            შენახვა
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition"
          >
            გაუქმება
          </button>
        </div>
      </div>
    </div>
  )
}

// Category Edit Modal
const CategoryEditModal = ({ category, onSave, onClose }: {
  category: any
  onSave: (category: any) => void
  onClose: () => void
}) => {
  const [formData, setFormData] = useState(category || {
    name: '',
    code: '',
    icon: '📦',
    department: 'ROOMS',
    accountCode: '',
    taxRate: 18,
    serviceChargeRate: 0
  })
  
  const icons = ['📦', '🍽️', '🍷', '🥤', '💆', '👔', '🚗', '📞', '🛁', '🏊', '🎮', '💼']
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-[500px] max-w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">
          {category ? 'კატეგორიის რედაქტირება' : 'ახალი კატეგორიის დამატება'}
        </h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">სახელი *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">კოდი *</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">იკონა</label>
            <div className="flex gap-2 flex-wrap">
              {icons.map(icon => (
                <button
                  key={icon}
                  onClick={() => setFormData({...formData, icon})}
                  className={`p-2 border rounded-lg text-xl hover:bg-gray-100 ${
                    formData.icon === icon ? 'bg-blue-100 border-blue-500' : ''
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={formData.icon}
              onChange={(e) => setFormData({...formData, icon: e.target.value})}
              className="w-full border rounded px-3 py-2 mt-2"
              placeholder="ან შეიყვანეთ emoji"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">დეპარტამენტი</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({...formData, department: e.target.value})}
                className="w-full border rounded px-3 py-2"
              >
                <option value="ROOMS">Rooms</option>
                <option value="F&B">F&B</option>
                <option value="BAR">Bar</option>
                <option value="SPA">Spa</option>
                <option value="HSK">Housekeeping</option>
                <option value="CONC">Concierge</option>
                <option value="FRONT">Front Desk</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">ანგარიშის კოდი</label>
              <input
                type="text"
                value={formData.accountCode}
                onChange={(e) => setFormData({...formData, accountCode: e.target.value})}
                className="w-full border rounded px-3 py-2"
                placeholder="REV-XXX"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">გადასახადი (%)</label>
              <input
                type="number"
                value={formData.taxRate || 0}
                onChange={(e) => setFormData({...formData, taxRate: parseFloat(e.target.value) || 0})}
                className="w-full border rounded px-3 py-2"
                step="0.5"
                min="0"
                max="100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">სერვისის გადასახადი (%)</label>
              <input
                type="number"
                value={formData.serviceChargeRate || 0}
                onChange={(e) => setFormData({...formData, serviceChargeRate: parseFloat(e.target.value) || 0})}
                className="w-full border rounded px-3 py-2"
                step="0.5"
                min="0"
                max="100"
              />
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 mt-6">
          <button
            onClick={() => onSave(formData)}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            შენახვა
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition"
          >
            გაუქმება
          </button>
        </div>
      </div>
    </div>
  )
}

// Seasons Editor
function SeasonsEditor({ seasons, setSeasons, roomTypes, onSave }: {
  seasons: Season[]
  setSeasons: (seasons: Season[]) => void
  roomTypes: RoomType[]
  onSave?: () => void
}) {
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Season | null>(null)
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '', priceModifier: 20, color: '#3b82f6', roomTypes: [] as string[] })
  
  const handleSave = () => {
    if (!form.name || !form.startDate || !form.endDate) {
      alert('შეავსეთ ყველა ველი')
      return
    }
    
    if (editing) {
      setSeasons(seasons.map(s => s.id === editing.id ? { 
        ...editing, 
        name: form.name,
        startDate: form.startDate,
        endDate: form.endDate,
        priceModifier: form.priceModifier,
        color: form.color,
        roomTypes: form.roomTypes
      } : s))
    } else {
      setSeasons([...seasons, {
        id: `season-${Date.now()}`,
        name: form.name,
        startDate: form.startDate,
        endDate: form.endDate,
        priceModifier: form.priceModifier,
        color: form.color,
        active: true,
        roomTypes: form.roomTypes
      }])
    }
    
    // AUTO-SAVE TO LOCALSTORAGE
    setTimeout(() => {
      if (onSave) onSave()
    }, 100)
    
    setShowAdd(false)
    setEditing(null)
    setForm({ name: '', startDate: '', endDate: '', priceModifier: 20, color: '#3b82f6', roomTypes: [] })
  }
  
  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}.${month}.${year}`
  }
  
  return (
    <div>
      {/* Add/Edit Form */}
      {showAdd && (
        <div className="bg-blue-50 rounded-xl p-6 border-2 border-blue-200 mb-4">
          <h3 className="text-lg font-bold mb-4">{editing ? '✏️ რედაქტირება' : '➕ ახალი სეზონი'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">სახელი</label>
              <input 
                type="text" 
                value={form.name} 
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg" 
                placeholder="მაგ: მაღალი სეზონი" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">ფერი</label>
              <input 
                type="color" 
                value={form.color} 
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="w-full h-10 rounded-lg cursor-pointer" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">დაწყება</label>
              <input 
                type="date" 
                value={form.startDate} 
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">დასრულება</label>
              <input 
                type="date" 
                value={form.endDate} 
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg" 
              />
            </div>
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium mb-1">
                ფასის ცვლილება: <span className={`font-bold ${form.priceModifier > 0 ? 'text-red-600' : form.priceModifier < 0 ? 'text-green-600' : ''}`}>
                  {form.priceModifier > 0 ? '+' : ''}{form.priceModifier}%
                </span>
              </label>
              <input 
                type="range" 
                min="-50" 
                max="100" 
                value={form.priceModifier}
                onChange={(e) => setForm({ ...form, priceModifier: parseInt(e.target.value) })} 
                className="w-full" 
              />
            </div>
            
            {/* Room Types Selection */}
            <div className="col-span-1 md:col-span-2 mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                რომელ ოთახის ტიპებზე ვრცელდება
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ 
                    ...form, 
                    roomTypes: form.roomTypes.length === roomTypes.length ? [] : roomTypes.map(t => t.id) 
                  })}
                  className={`px-3 py-1 rounded-full text-sm ${
                    form.roomTypes.length === roomTypes.length 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  ყველა
                </button>
                {roomTypes.map(type => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => {
                      const newTypes = form.roomTypes.includes(type.id)
                        ? form.roomTypes.filter(t => t !== type.id)
                        : [...form.roomTypes, type.id]
                      setForm({ ...form, roomTypes: newTypes })
                    }}
                    className={`px-3 py-1 rounded-full text-sm ${
                      form.roomTypes.includes(type.id)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {type.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">💾 შენახვა</button>
            <button onClick={() => { setShowAdd(false); setEditing(null) }} className="px-4 py-2 bg-gray-200 rounded-lg">გაუქმება</button>
          </div>
        </div>
      )}
      
      {!showAdd && (
        <button 
          onClick={() => { setShowAdd(true); setEditing(null); setForm({ name: '', startDate: '', endDate: '', priceModifier: 20, color: '#3b82f6', roomTypes: [] }) }}
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-500 hover:text-blue-600 transition mb-4"
        >
          ➕ ახალი სეზონის დამატება
        </button>
      )}
      
      {/* Seasons List */}
      {seasons.length === 0 && !showAdd ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-5xl mb-4">🌴</div>
          <p>სეზონები არ არის დამატებული</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {seasons.map(season => (
            <div key={season.id} className="flex items-center justify-between p-4 bg-white border rounded-xl hover:shadow-md transition">
              <div className="flex items-center gap-4">
                <div className="w-3 h-12 rounded-full" style={{ backgroundColor: season.color }} />
                <div>
                  <h4 className="font-bold">{season.name}</h4>
                  <p className="text-sm text-gray-500">{moment(season.startDate).format('DD MMM')} - {moment(season.endDate).format('DD MMM YYYY')}</p>
                  {season.roomTypes && season.roomTypes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {season.roomTypes.map(typeId => {
                        const type = roomTypes.find(t => t.id === typeId)
                        return type ? (
                          <span key={typeId} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                            {type.name}
                          </span>
                        ) : null
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-xl font-bold ${season.priceModifier > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {season.priceModifier > 0 ? '+' : ''}{season.priceModifier}%
                </span>
                <button onClick={() => { setEditing(season); setForm({ name: season.name, startDate: season.startDate, endDate: season.endDate, priceModifier: season.priceModifier, color: season.color, roomTypes: season.roomTypes || [] }); setShowAdd(true) }} className="p-2 hover:bg-gray-100 rounded-lg">✏️</button>
                <button onClick={() => { 
                  if (confirm('წავშალოთ?')) {
                    setSeasons(seasons.filter(s => s.id !== season.id))
                    // AUTO-SAVE after delete
                    setTimeout(() => {
                      if (onSave) onSave()
                    }, 100)
                  }
                }} className="p-2 hover:bg-red-50 rounded-lg text-red-500">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Room Rates Editor
// Room Rates Editor - Connected to Room Types
function RoomRatesEditor({ roomTypes }: { roomTypes: RoomType[] }) {
  const [rates, setRates] = useState<{ 
    id: string
    type: string
    icon: string
    weekday: number
    weekend: number 
  }[]>([])
  const [isSaving, setIsSaving] = useState(false)
  
  // Sync with roomTypes
  useEffect(() => {
    const saved = localStorage.getItem('roomRates')
    let savedRates: any[] = []
    
    if (saved) {
      try {
        savedRates = JSON.parse(saved)
      } catch (e) {
        console.error('Error loading rates:', e)
      }
    }
    
    // Build rates from roomTypes, preserving saved prices
    const syncedRates = roomTypes.map(rt => {
      const existing = savedRates.find(r => r.id === rt.id || r.type === rt.name)
      return {
        id: rt.id,
        type: rt.name,
        icon: rt.icon || '🛏️',
        weekday: existing?.weekday ?? rt.basePrice,
        weekend: existing?.weekend ?? Math.round(rt.basePrice * 1.2)
      }
    })
    
    setRates(syncedRates)
  }, [roomTypes])
  
  const updateRate = (id: string, field: 'weekday' | 'weekend', value: number) => {
    setRates(rates.map(r => r.id === id ? { ...r, [field]: value } : r))
  }
  
  const handleSave = () => {
    setIsSaving(true)
    localStorage.setItem('roomRates', JSON.stringify(rates))
    
    // Also update roomTypes basePrice from weekday rate
    const updatedTypes = roomTypes.map(rt => {
      const rate = rates.find(r => r.id === rt.id)
      return rate ? { ...rt, basePrice: rate.weekday } : rt
    })
    localStorage.setItem('roomTypes', JSON.stringify(updatedTypes))
    
    setTimeout(() => {
      setIsSaving(false)
      alert('✅ ფასები შენახულია!')
    }, 500)
  }
  
  // Calculate weekend difference
  const getWeekendDiff = (weekday: number, weekend: number) => {
    const diff = weekend - weekday
    const percent = weekday > 0 ? Math.round((diff / weekday) * 100) : 0
    return { diff, percent }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="font-bold text-gray-800 text-lg">💵 Room Rates</h3>
          <p className="text-sm text-gray-500">
            ოთახის ტიპების ფასები • {roomTypes.length} ტიპი
          </p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="px-5 py-2.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50 flex items-center gap-2 shadow-sm transition"
        >
          {isSaving ? (
            <>⏳ ინახება...</>
          ) : (
            <>💾 შენახვა</>
          )}
        </button>
      </div>
      
      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <p className="text-sm text-blue-800">
              ფასები ავტომატურად სინქრონიზდება <strong>ოთახის ტიპებთან</strong>.
              ახალი ტიპის დასამატებლად გადადით: ოთახები → ოთახის ტიპები
            </p>
          </div>
        </div>
      </div>
      
      {/* Rates Grid */}
      {rates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {rates.map(rate => {
            const { diff, percent } = getWeekendDiff(rate.weekday, rate.weekend)
            
            return (
              <div 
                key={rate.id} 
                className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-200"
              >
                {/* Card Header */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl bg-white/20 rounded-xl p-2">{rate.icon}</span>
                    <div>
                      <h4 className="font-bold text-white text-lg">{rate.type}</h4>
                      <p className="text-blue-100 text-sm">ოთახის ტიპი</p>
                    </div>
                  </div>
                </div>
                
                {/* Card Body */}
                <div className="p-5 space-y-4">
                  {/* Weekday Price */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">📅</span>
                        <span className="font-medium text-gray-700">სამუშაო დღე</span>
                      </div>
                      <span className="text-xs text-gray-400">ორშ - ხუთ</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl text-gray-500">₾</span>
                      <input
                        type="number"
                        value={rate.weekday}
                        onChange={(e) => updateRate(rate.id, 'weekday', parseFloat(e.target.value) || 0)}
                        className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-2xl font-bold text-center focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                      />
                    </div>
                  </div>
                  
                  {/* Weekend Price */}
                  <div className="bg-orange-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🎉</span>
                        <span className="font-medium text-gray-700">შაბათ-კვირა</span>
                      </div>
                      <span className="text-xs text-gray-400">პარ - კვი</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl text-gray-500">₾</span>
                      <input
                        type="number"
                        value={rate.weekend}
                        onChange={(e) => updateRate(rate.id, 'weekend', parseFloat(e.target.value) || 0)}
                        className="flex-1 px-4 py-3 border-2 border-orange-200 rounded-xl text-2xl font-bold text-center focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition"
                      />
                    </div>
                    
                    {/* Weekend Difference */}
                    {diff !== 0 && (
                      <div className={`mt-2 text-center text-sm font-medium ${diff > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                        {diff > 0 ? '📈' : '📉'} {diff > 0 ? '+' : ''}{diff} ₾ ({percent > 0 ? '+' : ''}{percent}%)
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Card Footer - Quick Stats */}
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">საშუალო ფასი:</span>
                    <span className="font-bold text-gray-700">
                      ₾{Math.round((rate.weekday * 5 + rate.weekend * 2) / 7)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <span className="text-6xl mb-4 block">🏷️</span>
          <h4 className="text-lg font-bold text-gray-700 mb-2">ოთახის ტიპები არ არის</h4>
          <p className="text-gray-500 mb-4">
            ჯერ დაამატეთ ოთახის ტიპები: ოთახები → ოთახის ტიპები
          </p>
        </div>
      )}
      
      {/* Help Section */}
      <div className="mt-6 p-4 bg-gray-50 rounded-xl">
        <h5 className="font-medium text-gray-700 mb-2">💡 რჩევები:</h5>
        <ul className="text-sm text-gray-500 space-y-1">
          <li>• <strong>სამუშაო დღე</strong> = ორშაბათი - ხუთშაბათი</li>
          <li>• <strong>შაბათ-კვირა</strong> = პარასკევი - კვირა</li>
          <li>• ფასები ავტომატურად გამოიყენება ჯავშნის გაფორმებისას</li>
          <li>• სეზონური და სპეციალური თარიღების ფასები ემატება ბაზისურ ფასს</li>
        </ul>
      </div>
    </div>
  )
}

// Weekdays Editor
function WeekdaysEditor({ roomTypes }: { roomTypes: RoomType[] }) {
  const [selectedRoomType, setSelectedRoomType] = useState<string>('all')
  const [weekdayPrices, setWeekdayPrices] = useState<{
    [roomTypeId: string]: { dayOfWeek: number; dayName: string; priceModifier: number; enabled: boolean }[]
  }>({})
  
  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('hotelWeekdayPrices')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        // Check if old format (array) or new format (object)
        if (Array.isArray(parsed)) {
          // Migrate old format to new format
          setWeekdayPrices({ 'all': parsed })
        } else {
          setWeekdayPrices(parsed)
        }
      } catch (e) {
        console.error('Error loading weekday prices:', e)
      }
    }
  }, [])
  
  const getCurrentPrices = () => {
    if (selectedRoomType === 'all') {
      return weekdayPrices['all'] || [
        { dayOfWeek: 0, dayName: 'კვირა', priceModifier: 0, enabled: false },
        { dayOfWeek: 1, dayName: 'ორშაბათი', priceModifier: 0, enabled: false },
        { dayOfWeek: 2, dayName: 'სამშაბათი', priceModifier: 0, enabled: false },
        { dayOfWeek: 3, dayName: 'ოთხშაბათი', priceModifier: 0, enabled: false },
        { dayOfWeek: 4, dayName: 'ხუთშაბათი', priceModifier: 0, enabled: false },
        { dayOfWeek: 5, dayName: 'პარასკევი', priceModifier: 20, enabled: true },
        { dayOfWeek: 6, dayName: 'შაბათი', priceModifier: 20, enabled: true },
      ]
    }
    return weekdayPrices[selectedRoomType] || [
      { dayOfWeek: 0, dayName: 'კვირა', priceModifier: 0, enabled: false },
      { dayOfWeek: 1, dayName: 'ორშაბათი', priceModifier: 0, enabled: false },
      { dayOfWeek: 2, dayName: 'სამშაბათი', priceModifier: 0, enabled: false },
      { dayOfWeek: 3, dayName: 'ოთხშაბათი', priceModifier: 0, enabled: false },
      { dayOfWeek: 4, dayName: 'ხუთშაბათი', priceModifier: 0, enabled: false },
      { dayOfWeek: 5, dayName: 'პარასკევი', priceModifier: 20, enabled: true },
      { dayOfWeek: 6, dayName: 'შაბათი', priceModifier: 20, enabled: true },
    ]
  }
  
  const save = (prices: { dayOfWeek: number; dayName: string; priceModifier: number; enabled: boolean }[]) => {
    const updated = { ...weekdayPrices, [selectedRoomType]: prices }
    setWeekdayPrices(updated)
    localStorage.setItem('hotelWeekdayPrices', JSON.stringify(updated))
  }
  
  const currentPrices = getCurrentPrices()
  
  return (
    <div className="space-y-4">
      {/* Room Type Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          აირჩიეთ ოთახის ტიპი
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedRoomType('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              selectedRoomType === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            ყველა ტიპი
          </button>
          {roomTypes.map(type => (
            <button
              key={type.id}
              onClick={() => setSelectedRoomType(type.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                selectedRoomType === type.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {type.name}
            </button>
          ))}
        </div>
      </div>
      
      <div className="mb-4">
        <h3 className="font-bold text-gray-700">Weekday Prices</h3>
        <p className="text-sm text-gray-500">Set price modifiers for each day of the week</p>
      </div>
      <div className="space-y-3">
        {currentPrices.map((day, idx) => (
          <div key={day.dayOfWeek} className={`flex items-center justify-between p-4 rounded-xl border transition ${day.enabled ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-4">
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={day.enabled} 
                  onChange={(e) => {
                    const updated = [...currentPrices]
                    updated[idx].enabled = e.target.checked
                    save(updated)
                  }} 
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-gray-200 peer-checked:bg-green-600 rounded-full peer after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
              </label>
              <span className={`font-medium ${day.enabled ? 'text-gray-900' : 'text-gray-400'}`}>{day.dayName}</span>
            </div>
            {day.enabled && (
              <div className="flex items-center gap-4">
                <input 
                  type="range" 
                  min="-30" 
                  max="50" 
                  value={day.priceModifier} 
                  onChange={(e) => {
                    const updated = [...currentPrices]
                    updated[idx].priceModifier = parseInt(e.target.value)
                    save(updated)
                  }} 
                  className="w-32" 
                />
                <span className={`text-lg font-bold min-w-[60px] text-right ${day.priceModifier > 0 ? 'text-red-600' : day.priceModifier < 0 ? 'text-green-600' : ''}`}>
                  {day.priceModifier > 0 ? '+' : ''}{day.priceModifier}%
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="bg-gray-50 rounded-lg p-4 mt-4">
        <h4 className="font-medium mb-3">სწრაფი პარამეტრები</h4>
        <div className="flex gap-2 flex-wrap">
          <button 
            onClick={() => save(currentPrices.map(d => ({ ...d, enabled: [5, 6].includes(d.dayOfWeek), priceModifier: [5, 6].includes(d.dayOfWeek) ? 20 : 0 })))}
            className="px-3 py-1.5 bg-white border rounded hover:bg-gray-50 text-sm"
          >
            🗓️ შაბ-კვირა +20%
          </button>
          <button 
            onClick={() => save(weekdayPrices.map(d => ({ ...d, enabled: false, priceModifier: 0 })))}
            className="px-3 py-1.5 bg-white border rounded hover:bg-gray-50 text-sm"
          >
            🔄 გაუქმება
          </button>
        </div>
      </div>
    </div>
  )
}

// Special Dates Editor
function SpecialDatesEditor({ roomTypes }: { roomTypes: RoomType[] }) {
  const [specialDates, setSpecialDates] = useState<{ id: string; date: string; name: string; priceModifier: number; priceType: 'modifier' | 'fixed'; fixedPrice?: number; color?: string; roomTypes?: string[] }[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<typeof specialDates[0] | null>(null)
  
  useEffect(() => {
    const saved = localStorage.getItem('hotelSpecialDates')
    if (saved) {
      try {
        setSpecialDates(JSON.parse(saved))
      } catch (e) {
        console.error('Error loading special dates:', e)
      }
    }
  }, [])
  
  const save = (dates: typeof specialDates) => {
    setSpecialDates(dates)
    localStorage.setItem('hotelSpecialDates', JSON.stringify(dates))
  }
  
  const Form = () => {
    const [form, setForm] = useState(editing || { 
      id: `special-${Date.now()}`, 
      date: moment().format('YYYY-MM-DD'), 
      name: '', 
      priceModifier: 50, 
      priceType: 'modifier' as const,
      color: '#f59e0b',
      roomTypes: [] as string[]
    })
    
    const toggleRoomType = (typeId: string) => {
      if (form.roomTypes?.includes(typeId)) {
        setForm({ ...form, roomTypes: form.roomTypes.filter(t => t !== typeId) })
      } else {
        setForm({ ...form, roomTypes: [...(form.roomTypes || []), typeId] })
      }
    }
    
    const handleSave = () => {
      if (!form.name) {
        alert('შეიყვანეთ სახელი')
        return
      }
      if (editing) {
        save(specialDates.map(s => s.id === editing.id ? form : s))
      } else {
        save([...specialDates, form])
      }
      setShowForm(false)
      setEditing(null)
    }
    
    return (
      <div className="bg-yellow-50 rounded-xl p-6 border-2 border-yellow-200 mb-4">
        <h3 className="text-lg font-bold mb-4">{editing ? '✏️ რედაქტირება' : '➕ სპეციალური თარიღი'}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">თარიღი</label>
            <input 
              type="date" 
              value={form.date} 
              onChange={(e) => setForm({ ...form, date: e.target.value })} 
              className="w-full px-3 py-2 border rounded-lg" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">სახელი</label>
            <input 
              type="text" 
              value={form.name} 
              onChange={(e) => setForm({ ...form, name: e.target.value })} 
              className="w-full px-3 py-2 border rounded-lg" 
              placeholder="მაგ: ახალი წელი" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">ფასის ტიპი</label>
            <select 
              value={form.priceType} 
              onChange={(e) => setForm({ ...form, priceType: e.target.value as 'modifier' | 'fixed' })} 
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="modifier">პროცენტული</option>
              <option value="fixed">ფიქსირებული</option>
            </select>
          </div>
          <div>
            {form.priceType === 'modifier' ? (
              <>
                <label className="block text-sm font-medium mb-1">ცვლილება (%)</label>
                <input 
                  type="number" 
                  value={form.priceModifier} 
                  onChange={(e) => setForm({ ...form, priceModifier: parseInt(e.target.value) || 0 })} 
                  className="w-full px-3 py-2 border rounded-lg" 
                />
              </>
            ) : (
              <>
                <label className="block text-sm font-medium mb-1">ფასი (₾)</label>
                <input 
                  type="number" 
                  value={form.fixedPrice || 0} 
                  onChange={(e) => setForm({ ...form, fixedPrice: parseInt(e.target.value) || 0 })} 
                  className="w-full px-3 py-2 border rounded-lg" 
                />
              </>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">ფერი</label>
            <input 
              type="color" 
              value={form.color || '#f59e0b'} 
              onChange={(e) => setForm({ ...form, color: e.target.value })} 
              className="w-full h-10 rounded-lg cursor-pointer" 
            />
          </div>
          
          {/* Room Type Multi-Select */}
          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              რომელ ოთახის ტიპებზე ვრცელდება
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setForm({ 
                  ...form, 
                  roomTypes: (form.roomTypes?.length || 0) === roomTypes.length ? [] : roomTypes.map(t => t.id) 
                })}
                className={`px-3 py-1.5 rounded-lg text-sm ${
                  (form.roomTypes?.length || 0) === roomTypes.length
                    ? 'bg-blue-500 text-white'
                    : 'bg-white border text-gray-700'
                }`}
              >
                ✓ ყველა
              </button>
              {roomTypes.map(type => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => toggleRoomType(type.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm ${
                    form.roomTypes?.includes(type.id)
                      ? 'bg-blue-500 text-white'
                      : 'bg-white border text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {type.name}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={handleSave} className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700">💾 შენახვა</button>
          <button onClick={() => { setShowForm(false); setEditing(null) }} className="px-4 py-2 bg-gray-200 rounded-lg">გაუქმება</button>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      {!showForm && (
        <button 
          onClick={() => setShowForm(true)} 
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-yellow-500 hover:text-yellow-600 transition"
        >
          ➕ სპეციალური თარიღის დამატება
        </button>
      )}
      {showForm && <Form />}
      {specialDates.length === 0 && !showForm ? (
        <div className="text-center py-8 text-gray-400">
          <div className="text-4xl mb-3">🎉</div>
          <p>სპეციალური თარიღები არ არის</p>
        </div>
      ) : (
        <div className="space-y-2">
          {specialDates.sort((a, b) => a.date.localeCompare(b.date)).map(s => (
            <div key={s.id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
              <div>
                <h4 className="font-medium">{s.name}</h4>
                <p className="text-sm text-gray-500">{moment(s.date).format('DD MMM YYYY')}</p>
                {s.roomTypes && s.roomTypes.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {s.roomTypes.map(typeId => {
                      const type = roomTypes.find(t => t.id === typeId)
                      return type ? (
                        <span key={typeId} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                          {type.name}
                        </span>
                      ) : null
                    })}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className={`font-bold ${s.priceType === 'fixed' ? 'text-purple-600' : s.priceModifier > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {s.priceType === 'fixed' ? `₾${s.fixedPrice}` : `${s.priceModifier > 0 ? '+' : ''}${s.priceModifier}%`}
                </span>
                <button onClick={() => { setEditing(s); setForm({ ...s, roomTypes: s.roomTypes || [] }); setShowForm(true) }} className="p-1.5 hover:bg-gray-100 rounded">✏️</button>
                <button onClick={() => { if (confirm('წავშალოთ?')) save(specialDates.filter(x => x.id !== s.id)) }} className="p-1.5 hover:bg-red-50 rounded text-red-500">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Bulk Edit Editor
function BulkEditEditor({ roomTypes }: { roomTypes: RoomType[] }) {
  const [selectedRoomTypes, setSelectedRoomTypes] = useState<string[]>([])
  const [bulkAction, setBulkAction] = useState<'increase' | 'decrease' | 'set'>('increase')
  const [bulkValue, setBulkValue] = useState(10)
  const [bulkType, setBulkType] = useState<'percent' | 'fixed'>('percent')
  const [selected, setSelected] = useState<string[]>([])
  const [modifier, setModifier] = useState(0)
  const [priceType, setPriceType] = useState<'modifier' | 'fixed'>('modifier')
  const [fixedPrice, setFixedPrice] = useState(150)
  const [month, setMonth] = useState(moment().format('YYYY-MM'))
  const [name, setName] = useState('')
  const [specialDates, setSpecialDates] = useState<{ id: string; date: string; name: string; priceModifier: number; priceType: 'modifier' | 'fixed'; fixedPrice?: number }[]>([])
  
  useEffect(() => {
    const saved = localStorage.getItem('hotelSpecialDates')
    if (saved) {
      try {
        setSpecialDates(JSON.parse(saved))
      } catch (e) {
        console.error('Error loading special dates:', e)
      }
    }
  }, [])
  
  const monthStart = moment(month).startOf('month')
  const daysInMonth = moment(month).endOf('month').date()
  const days: (string | null)[] = []
  for (let i = 0; i < monthStart.day(); i++) days.push(null)
  for (let i = 1; i <= daysInMonth; i++) days.push(moment(month).date(i).format('YYYY-MM-DD'))
  
  const toggle = (d: string) => setSelected(selected.includes(d) ? selected.filter(x => x !== d) : [...selected, d])
  const selectAll = () => setSelected(days.filter(d => d) as string[])
  const selectWeekends = () => setSelected(days.filter(d => d && [0, 6].includes(moment(d).day())) as string[])
  
  const apply = () => {
    if (!selected.length) {
      alert('აირჩიეთ თარიღები')
      return
    }
    const existing = JSON.parse(localStorage.getItem('hotelSpecialDates') || '[]')
    const filtered = existing.filter((s: any) => !selected.includes(s.date))
    const newDates = selected.map(date => ({ 
      id: `bulk-${date}-${Date.now()}`, 
      date, 
      name: name || 'Bulk Price', 
      priceModifier: priceType === 'modifier' ? modifier : 0, 
      priceType, 
      fixedPrice: priceType === 'fixed' ? fixedPrice : undefined 
    }))
    localStorage.setItem('hotelSpecialDates', JSON.stringify([...filtered, ...newDates]))
    setSpecialDates([...filtered, ...newDates])
    alert(`✅ ${selected.length} თარიღი განახლდა`)
    setSelected([])
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => setMonth(moment(month).subtract(1, 'month').format('YYYY-MM'))} className="p-2 hover:bg-gray-100 rounded-lg text-xl">◀</button>
        <h3 className="text-lg font-bold">{moment(month).format('MMMM YYYY')}</h3>
        <button onClick={() => setMonth(moment(month).add(1, 'month').format('YYYY-MM'))} className="p-2 hover:bg-gray-100 rounded-lg text-xl">▶</button>
      </div>
      <div className="flex gap-2 flex-wrap">
        <button onClick={selectAll} className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200">ყველა</button>
        <button onClick={selectWeekends} className="px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200">შაბ-კვირა</button>
        <button onClick={() => setSelected([])} className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200">გასუფთავება</button>
        <span className="ml-auto text-sm text-gray-500 self-center">არჩეული: <strong>{selected.length}</strong></span>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {['კვ', 'ორ', 'სა', 'ოთ', 'ხუ', 'პა', 'შა'].map(d => (
          <div key={d} className="text-center text-xs font-medium text-gray-500 py-2">{d}</div>
        ))}
        {days.map((date, idx) => {
          if (!date) return <div key={idx} className="h-10"></div>
          const isSel = selected.includes(date)
          const isWe = [0, 6].includes(moment(date).day())
          const hasSp = specialDates.some(s => s.date === date)
          return (
            <button 
              key={date} 
              onClick={() => toggle(date)} 
              className={`h-10 rounded-lg text-sm font-medium transition-all relative ${
                isSel ? 'bg-blue-600 text-white shadow-lg scale-105' : 
                isWe ? 'bg-orange-50 text-orange-700 hover:bg-orange-100' : 
                'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              {moment(date).date()}
              {hasSp && !isSel && <span className="absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-full"></span>}
            </button>
          )
        })}
      </div>
      {/* Room Type Selection */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-700 mb-3">1. აირჩიეთ ოთახის ტიპები</h4>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedRoomTypes(
              selectedRoomTypes.length === roomTypes.length ? [] : roomTypes.map(t => t.id)
            )}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              selectedRoomTypes.length === roomTypes.length
                ? 'bg-blue-500 text-white'
                : 'bg-white border border-gray-300 text-gray-700'
            }`}
          >
            ყველა ტიპი
          </button>
          {roomTypes.map(type => (
            <button
              key={type.id}
              onClick={() => {
                if (selectedRoomTypes.includes(type.id)) {
                  setSelectedRoomTypes(selectedRoomTypes.filter(t => t !== type.id))
                } else {
                  setSelectedRoomTypes([...selectedRoomTypes, type.id])
                }
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                selectedRoomTypes.includes(type.id)
                  ? 'bg-blue-500 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {type.name}
            </button>
          ))}
        </div>
      </div>
      
      <div className="bg-gray-50 rounded-xl p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">სახელი</label>
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            className="w-full px-3 py-2 border rounded-lg" 
            placeholder="მაგ: სეზონური ფასი" 
          />
        </div>
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input type="radio" checked={priceType === 'modifier'} onChange={() => setPriceType('modifier')} />
            <span>პროცენტული</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" checked={priceType === 'fixed'} onChange={() => setPriceType('fixed')} />
            <span>ფიქსირებული</span>
          </label>
        </div>
        {priceType === 'modifier' ? (
          <div>
            <label className="block text-sm font-medium mb-1">
              ცვლილება: <span className={`font-bold ${modifier > 0 ? 'text-red-600' : modifier < 0 ? 'text-green-600' : ''}`}>
                {modifier > 0 ? '+' : ''}{modifier}%
              </span>
            </label>
            <input 
              type="range" 
              min="-50" 
              max="100" 
              value={modifier} 
              onChange={(e) => setModifier(parseInt(e.target.value))} 
              className="w-full" 
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium mb-1">ფიქსირებული ფასი (₾)</label>
            <input 
              type="number" 
              value={fixedPrice} 
              onChange={(e) => setFixedPrice(parseInt(e.target.value) || 0)} 
              className="w-full px-3 py-2 border rounded-lg" 
            />
          </div>
        )}
        <button 
          onClick={apply} 
          disabled={!selected.length} 
          className={`w-full py-3 rounded-xl font-bold transition ${
            selected.length ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg' : 
            'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          💰 გამოყენება ({selected.length} თარიღი)
        </button>
      </div>
    </div>
  )
}

// Extra Services Editor
function ExtraServicesEditor({ services, setServices }: {
  services: ExtraService[]
  setServices: (services: ExtraService[]) => void
}) {
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<ExtraService | null>(null)
  const [form, setForm] = useState({ name: '', code: '', price: 0, unit: 'piece', category: 'Other' })
  const [filterCategory, setFilterCategory] = useState('')
  
  const categories = ['F&B', 'Transport', 'SPA', 'Minibar', 'Laundry', 'Other']
  
  const handleSave = () => {
    if (!form.name || !form.code) {
      alert('შეავსეთ სახელი და კოდი')
      return
    }
    
    if (editing) {
      setServices(services.map(s => s.id === editing.id ? { ...editing, ...form } : s))
    } else {
      setServices([...services, {
        id: `service-${Date.now()}`,
        ...form,
        available: true
      }])
    }
    setShowAdd(false)
    setEditing(null)
    setForm({ name: '', code: '', price: 0, unit: 'piece', category: 'Other' })
  }
  
  const filteredServices = filterCategory 
    ? services.filter(s => s.category === filterCategory)
    : services
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="font-bold text-gray-700">დამატებითი სერვისები</h3>
          <p className="text-sm text-gray-500">სერვისები, რომლებიც შეგიძლიათ დაუმატოთ სტუმარს</p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setEditing(null); setForm({ name: '', code: '', price: 0, unit: 'piece', category: 'Other' }) }}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600"
        >
          + დამატება
        </button>
      </div>
      
      {/* Category Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setFilterCategory('')}
          className={`px-3 py-1.5 rounded-lg text-sm ${!filterCategory ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
        >
          ყველა
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-sm ${filterCategory === cat ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
          >
            {cat}
          </button>
        ))}
      </div>
      
      {/* Add/Edit Form */}
      {showAdd && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-5 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">სახელი *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">კოდი *</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">ფასი (₾)</label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">ერთეული</label>
              <select
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="piece">ცალი</option>
                <option value="person">ადამიანი</option>
                <option value="hour">საათი</option>
                <option value="day">დღე</option>
                <option value="service">სერვისი</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">კატეგორია</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleSave} className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm">💾 შენახვა</button>
            <button onClick={() => { setShowAdd(false); setEditing(null) }} className="px-4 py-2 bg-gray-300 rounded-lg text-sm">გაუქმება</button>
          </div>
        </div>
      )}
      
      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredServices.map(service => (
          <div key={service.id} className={`border rounded-lg p-4 ${service.available ? 'bg-white' : 'bg-gray-100 opacity-60'}`}>
            <div className="flex justify-between items-start">
              <div>
                <div className="font-bold">{service.name}</div>
                <div className="text-xs text-gray-500">{service.code}</div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setServices(services.map(s => s.id === service.id ? { ...s, available: !s.available } : s))}
                  className={`text-xs px-2 py-1 rounded ${service.available ? 'bg-green-100 text-green-700' : 'bg-gray-200'}`}
                >
                  {service.available ? '✅' : '⭕'}
                </button>
                <button
                  onClick={() => { setEditing(service); setForm(service); setShowAdd(true) }}
                  className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                >✏️</button>
                <button
                  onClick={() => { if (confirm('წაშალოთ?')) setServices(services.filter(s => s.id !== service.id)) }}
                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                >🗑️</button>
              </div>
            </div>
            <div className="mt-2 flex justify-between items-center">
              <span className="text-2xl font-bold text-green-600">₾{service.price}</span>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{service.category}</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">/{service.unit}</div>
          </div>
        ))}
      </div>
      
      {filteredServices.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>სერვისები არ მოიძებნა</p>
        </div>
      )}
    </div>
  )
}

// Packages Editor
function PackagesEditor({ packages, setPackages, services }: {
  packages: Package[]
  setPackages: (packages: Package[]) => void
  services: ExtraService[]
}) {
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Package | null>(null)
  const [form, setForm] = useState({ name: '', description: '', price: 0, includedServices: [] as string[], nights: 1 })
  
  const handleSave = () => {
    if (!form.name) {
      alert('შეავსეთ პაკეტის სახელი')
      return
    }
    
    if (editing) {
      setPackages(packages.map(p => p.id === editing.id ? { ...editing, ...form } : p))
    } else {
      setPackages([...packages, {
        id: `package-${Date.now()}`,
        ...form,
        active: true
      }])
    }
    setShowAdd(false)
    setEditing(null)
    setForm({ name: '', description: '', price: 0, includedServices: [], nights: 1 })
  }
  
  const toggleService = (code: string) => {
    if (form.includedServices.includes(code)) {
      setForm({ ...form, includedServices: form.includedServices.filter(s => s !== code) })
    } else {
      setForm({ ...form, includedServices: [...form.includedServices, code] })
    }
  }
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="font-bold text-gray-700">პაკეტები</h3>
          <p className="text-sm text-gray-500">კომბინირებული შეთავაზებები ფიქსირებულ ფასად</p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setEditing(null); setForm({ name: '', description: '', price: 0, includedServices: [], nights: 1 }) }}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600"
        >
          + დამატება
        </button>
      </div>
      
      {/* Add/Edit Form */}
      {showAdd && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-4 gap-3 mb-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">სახელი *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">ფასი (₾)</label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">ღამეები</label>
              <input
                type="number"
                value={form.nights}
                onChange={(e) => setForm({ ...form, nights: parseInt(e.target.value) || 1 })}
                min={1}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">აღწერა</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
          </div>
          
          <div className="mb-3">
            <label className="block text-xs text-gray-600 mb-2">შემავალი სერვისები:</label>
            <div className="flex flex-wrap gap-2">
              {services.map(s => (
                <button
                  key={s.id}
                  onClick={() => toggleService(s.code)}
                  className={`px-3 py-1 rounded-lg text-xs ${
                    form.includedServices.includes(s.code) 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex gap-2">
            <button onClick={handleSave} className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm">💾 შენახვა</button>
            <button onClick={() => { setShowAdd(false); setEditing(null) }} className="px-4 py-2 bg-gray-300 rounded-lg text-sm">გაუქმება</button>
          </div>
        </div>
      )}
      
      {/* Packages List */}
      <div className="space-y-3">
        {packages.map(pkg => (
          <div key={pkg.id} className={`border rounded-lg p-4 ${pkg.active ? 'bg-white' : 'bg-gray-100 opacity-60'}`}>
            <div className="flex justify-between items-start">
              <div>
                <div className="font-bold text-lg">{pkg.name}</div>
                <div className="text-sm text-gray-500">{pkg.description}</div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {pkg.includedServices.map(code => {
                    const service = services.find(s => s.code === code)
                    return service ? (
                      <span key={code} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                        {service.name}
                      </span>
                    ) : null
                  })}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">₾{pkg.price}</div>
                <div className="text-xs text-gray-500">{pkg.nights} ღამე</div>
                <div className="flex gap-1 mt-2 justify-end">
                  <button
                    onClick={() => setPackages(packages.map(p => p.id === pkg.id ? { ...p, active: !p.active } : p))}
                    className={`text-xs px-2 py-1 rounded ${pkg.active ? 'bg-green-100 text-green-700' : 'bg-gray-200'}`}
                  >
                    {pkg.active ? '✅' : '⭕'}
                  </button>
                  <button
                    onClick={() => { setEditing(pkg); setForm(pkg); setShowAdd(true) }}
                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                  >✏️</button>
                  <button
                    onClick={() => { if (confirm('წაშალოთ?')) setPackages(packages.filter(p => p.id !== pkg.id)) }}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                  >🗑️</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {packages.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>პაკეტები არ არის დამატებული</p>
        </div>
      )}
    </div>
  )
}

// Taxes Editor
function TaxesEditor({ taxes, setTaxes, onSave }: {
  taxes: { VAT: number; CITY_TAX: number; TOURISM_TAX: number; SERVICE_CHARGE: number }
  setTaxes: (taxes: any) => void
  onSave?: () => void
}) {
  const [taxList, setTaxList] = useState<Array<{ id: string; key: string; label: string; description: string; value: number }>>([])
  const [showAddTax, setShowAddTax] = useState(false)
  const [editingTax, setEditingTax] = useState<any>(null)
  
  const defaultTaxLabels: Record<string, { label: string; description: string }> = {
    VAT: { label: 'დღგ (VAT)', description: 'დამატებული ღირებულების გადასახადი' },
    CITY_TAX: { label: 'საქალაქო გადასახადი', description: 'ქალაქის გადასახადი ტურისტებზე' },
    TOURISM_TAX: { label: 'ტურისტული გადასახადი', description: 'ტურიზმის გადასახადი' },
    SERVICE_CHARGE: { label: 'სერვისის გადასახადი', description: 'მომსახურების საფასური' }
  }
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTaxList = localStorage.getItem('taxList')
      if (savedTaxList) {
        try {
          setTaxList(JSON.parse(savedTaxList))
        } catch (e) {
          console.error('Error loading tax list:', e)
          // Initialize from default taxes
          const list = Object.entries(taxes).map(([key, value], index) => ({
            id: `tax-${index}`,
            key,
            label: defaultTaxLabels[key]?.label || key,
            description: defaultTaxLabels[key]?.description || '',
            value
          }))
          setTaxList(list)
        }
      } else {
        // Initialize from default taxes
        const list = Object.entries(taxes).map(([key, value], index) => ({
          id: `tax-${index}`,
          key,
          label: defaultTaxLabels[key]?.label || key,
          description: defaultTaxLabels[key]?.description || '',
          value
        }))
        setTaxList(list)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  
  const saveTaxList = (newList: typeof taxList) => {
    setTaxList(newList)
    localStorage.setItem('taxList', JSON.stringify(newList))
    // Also update the taxes object
    const taxesObj: any = {}
    newList.forEach(tax => {
      taxesObj[tax.key] = tax.value
    })
    setTaxes(taxesObj)
    // Auto-save to parent's localStorage
    if (onSave) {
      setTimeout(() => {
        onSave()
      }, 100)
    }
  }
  
  const handleAddTax = (tax: { key: string; label: string; description: string; value: number }) => {
    const newTax = {
      id: `tax-${Date.now()}`,
      ...tax
    }
    saveTaxList([...taxList, newTax])
    setShowAddTax(false)
  }
  
  const handleEditTax = (id: string, tax: { key: string; label: string; description: string; value: number }) => {
    saveTaxList(taxList.map(t => t.id === id ? { id, ...tax } : t))
    setEditingTax(null)
  }
  
  const handleDeleteTax = (id: string) => {
    if (!confirm('ნამდვილად გსურთ ამ გადასახადის წაშლა?')) return
    saveTaxList(taxList.filter(t => t.id !== id))
  }
  
  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h3 className="font-bold text-gray-700">Tax Configuration</h3>
          <p className="text-sm text-gray-500">კონფიგურაცია გადასახადების პროცენტული განაკვეთებისთვის</p>
        </div>
        <button
          onClick={() => {
            setEditingTax(null)
            setShowAddTax(true)
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          + ახალი გადასახადის დამატება
        </button>
      </div>
      
      {/* Add/Edit Tax Form */}
      {(showAddTax || editingTax) && (
        <TaxForm
          tax={editingTax}
          onSave={(tax) => {
            if (editingTax) {
              handleEditTax(editingTax.id, tax)
            } else {
              handleAddTax(tax)
            }
          }}
          onClose={() => {
            setShowAddTax(false)
            setEditingTax(null)
          }}
        />
      )}
      
      <div className="max-w-2xl space-y-4">
        {taxList.map((tax) => (
          <div key={tax.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <div className="font-medium">{tax.label}</div>
              <div className="text-xs text-gray-500">{tax.description || tax.key}</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={tax.value}
                  onChange={(e) => {
                    const updated = taxList.map(t => 
                      t.id === tax.id ? { ...t, value: parseFloat(e.target.value) || 0 } : t
                    )
                    saveTaxList(updated)
                  }}
                  className="w-24 px-3 py-2 border rounded-lg text-right"
                  step="0.5"
                  min="0"
                  max="100"
                />
                <span className="text-gray-500 font-medium">%</span>
              </div>
              <button
                onClick={() => setEditingTax(tax)}
                className="p-2 hover:bg-gray-100 rounded transition"
                title="რედაქტირება"
              >
                ✏️
              </button>
              <button
                onClick={() => handleDeleteTax(tax.id)}
                className="p-2 hover:bg-red-100 rounded transition"
                title="წაშლა"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Tax Form Component
const TaxForm = ({ tax, onSave, onClose }: {
  tax?: { id: string; key: string; label: string; description: string; value: number }
  onSave: (tax: { key: string; label: string; description: string; value: number }) => void
  onClose: () => void
}) => {
  const [form, setForm] = useState(tax || {
    key: '',
    label: '',
    description: '',
    value: 0
  })
  
  const handleSave = () => {
    if (!form.key || !form.label) {
      alert('გთხოვთ შეიყვანოთ Key და Label')
      return
    }
    onSave(form)
  }
  
  return (
    <div className="mb-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
      <h4 className="font-bold mb-3">{tax ? 'გადასახადის რედაქტირება' : 'ახალი გადასახადის დამატება'}</h4>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Key *</label>
          <input
            type="text"
            value={form.key}
            onChange={(e) => setForm({ ...form, key: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="TAX_NAME"
            disabled={!!tax}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Label *</label>
          <input
            type="text"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="გადასახადის სახელი"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium mb-1">აღწერა</label>
          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="გადასახადის აღწერა"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">პროცენტი (%)</label>
          <input
            type="number"
            value={form.value}
            onChange={(e) => setForm({ ...form, value: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 border rounded-lg"
            step="0.5"
            min="0"
            max="100"
          />
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          💾 შენახვა
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400 transition"
        >
          გაუქმება
        </button>
      </div>
    </div>
  )
}

// Quick Charges Editor
function QuickChargesEditor({ quickCharges, setQuickCharges, services }: {
  quickCharges: string[]
  setQuickCharges: (charges: string[]) => void
  services: ExtraService[]
}) {
  const getServiceIcon = (name: string) => {
    const n = name.toLowerCase()
    if (n.includes('საუზმე') || n.includes('breakfast')) return '☕'
    if (n.includes('ტრანსფერი') || n.includes('transport')) return '🚕'
    if (n.includes('spa') || n.includes('მასაჟი')) return '🧖'
    if (n.includes('წყალი') || n.includes('water')) return '💧'
    if (n.includes('სამრეცხაო') || n.includes('laundry')) return '👔'
    if (n.includes('მინიბარი') || n.includes('minibar')) return '🍺'
    return '📦'
  }
  
  return (
    <div>
      <div className="mb-4">
        <h3 className="font-bold text-gray-700">სწრაფი ღილაკები</h3>
        <p className="text-sm text-gray-500">ხშირად გამოყენებული სერვისები Folio-ში სწრაფი დამატებისთვის</p>
      </div>
      
      <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mb-6">
        {quickCharges.map((serviceId, index) => {
          const service = services.find(s => s.id === serviceId)
          if (!service) return null
          
          return (
            <div key={index} className="relative group">
              <div className="border-2 border-blue-500 rounded-lg p-4 text-center bg-blue-50 hover:bg-blue-100 transition">
                <div className="text-2xl mb-1">{getServiceIcon(service.name)}</div>
                <div className="text-xs font-medium truncate">{service.name}</div>
                <div className="text-xs text-gray-600 mt-1">₾{service.price.toFixed(2)}</div>
              </div>
              <button
                onClick={() => setQuickCharges(quickCharges.filter((_, i) => i !== index))}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-sm"
              >
                ×
              </button>
            </div>
          )
        })}
        
        {/* Add button */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center flex items-center justify-center">
          <select
            onChange={(e) => {
              if (e.target.value) {
                setQuickCharges([...quickCharges, e.target.value])
                e.target.value = ''
              }
            }}
            className="text-sm border-0 bg-transparent cursor-pointer"
            defaultValue=""
          >
            <option value="" disabled>+ დამატება</option>
            {services
              .filter(s => s.available && !quickCharges.includes(s.id))
              .map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))
            }
          </select>
        </div>
      </div>
      
      {quickCharges.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>სწრაფი ღილაკები არ არის კონფიგურირებული</p>
          <p className="text-sm mt-1">აირჩიეთ სერვისები dropdown-იდან</p>
        </div>
      )}
    </div>
  )
}

// ==================== USERS SECTION ====================
function UsersSection({ users, setUsers, onSave, isSaving }: {
  users: User[]
  setUsers: (users: User[]) => void
  onSave: () => void
  isSaving: boolean
}) {
  const [showAddUser, setShowAddUser] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [newUser, setNewUser] = useState<{ username: string; fullName: string; email: string; role: 'admin' | 'manager' | 'receptionist'; password: string }>({ username: '', fullName: '', email: '', role: 'receptionist', password: '' })
  const [showPasswordChange, setShowPasswordChange] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  
  const roleLabels: Record<string, { label: string; color: string; icon: string }> = {
    admin: { label: 'ადმინისტრატორი', color: 'bg-red-100 text-red-700', icon: '👑' },
    manager: { label: 'მენეჯერი', color: 'bg-blue-100 text-blue-700', icon: '👔' },
    receptionist: { label: 'რეცეფციონისტი', color: 'bg-green-100 text-green-700', icon: '👤' }
  }
  
  const handleSaveUser = () => {
    if (!newUser.username || !newUser.fullName) {
      alert('შეავსეთ ყველა სავალდებულო ველი')
      return
    }
    
    if (editingUser) {
      setUsers(users.map(u => u.id === editingUser.id ? { ...editingUser, ...newUser, role: newUser.role as User['role'] } : u))
    } else {
      if (!newUser.password) {
        alert('შეიყვანეთ პაროლი')
        return
      }
      const user: User = {
        id: `user-${Date.now()}`,
        username: newUser.username,
        fullName: newUser.fullName,
        email: newUser.email,
        role: newUser.role as User['role'],
        active: true,
        createdAt: new Date().toISOString()
      }
      const passwords = JSON.parse(localStorage.getItem('userPasswords') || '{}')
      passwords[user.username] = newUser.password
      localStorage.setItem('userPasswords', JSON.stringify(passwords))
      
      setUsers([...users, user])
    }
    setShowAddUser(false)
    setEditingUser(null)
    setNewUser({ username: '', fullName: '', email: '', role: 'receptionist', password: '' })
    onSave()
  }
  
  const handleDeleteUser = (userId: string) => {
    if (!confirm('ნამდვილად გსურთ მომხმარებლის წაშლა?')) return
    setUsers(users.filter(u => u.id !== userId))
    onSave()
  }
  
  const handleToggleActive = (userId: string) => {
    setUsers(users.map(u => u.id === userId ? { ...u, active: !u.active } : u))
    onSave()
  }
  
  const handleChangePassword = (username: string) => {
    if (!newPassword) {
      alert('შეიყვანეთ ახალი პაროლი')
      return
    }
    const passwords = JSON.parse(localStorage.getItem('userPasswords') || '{}')
    passwords[username] = newPassword
    localStorage.setItem('userPasswords', JSON.stringify(passwords))
    setShowPasswordChange(null)
    setNewPassword('')
    alert('✅ პაროლი შეცვლილია!')
  }
  
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-800">👥 მომხმარებლები</h2>
          <button
            onClick={() => { setShowAddUser(true); setEditingUser(null); setNewUser({ username: '', fullName: '', email: '', role: 'receptionist', password: '' }) }}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600"
          >
            + დამატება
          </button>
        </div>
        
        {/* Add/Edit User Form */}
        {showAddUser && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h4 className="font-medium mb-3">{editingUser ? '✏️ მომხმარებლის რედაქტირება' : '➕ ახალი მომხმარებელი'}</h4>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                placeholder="Username *"
                className="px-3 py-2 border rounded-lg text-sm"
                disabled={!!editingUser}
              />
              <input
                type="text"
                value={newUser.fullName}
                onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                placeholder="სრული სახელი *"
                className="px-3 py-2 border rounded-lg text-sm"
              />
              <input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="ელ. ფოსტა"
                className="px-3 py-2 border rounded-lg text-sm"
              />
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                className="px-3 py-2 border rounded-lg text-sm"
              >
                <option value="receptionist">რეცეფციონისტი</option>
                <option value="manager">მენეჯერი</option>
                <option value="admin">ადმინისტრატორი</option>
              </select>
              {!editingUser && (
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="პაროლი *"
                  className="px-3 py-2 border rounded-lg text-sm col-span-2"
                />
              )}
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={handleSaveUser} className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm">💾 შენახვა</button>
              <button onClick={() => { setShowAddUser(false); setEditingUser(null) }} className="px-4 py-2 bg-gray-300 rounded-lg text-sm">გაუქმება</button>
            </div>
          </div>
        )}
        
        {/* Users List */}
        <div className="space-y-3">
          {users.map(user => {
            const role = roleLabels[user.role]
            return (
              <div key={user.id} className={`border rounded-lg p-4 ${user.active ? 'bg-white' : 'bg-gray-100 opacity-60'}`}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{role.icon}</span>
                    <div>
                      <div className="font-bold">{user.fullName}</div>
                      <div className="text-sm text-gray-500">@{user.username}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-xs ${role.color}`}>{role.label}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleToggleActive(user.id)}
                        className="px-2 py-1 text-gray-600 hover:bg-gray-100 rounded text-sm"
                      >{user.active ? '⏸️' : '▶️'}</button>
                      <button
                        onClick={() => setShowPasswordChange(user.username)}
                        className="px-2 py-1 text-gray-600 hover:bg-gray-100 rounded text-sm"
                      >🔑</button>
                      <button
                        onClick={() => { 
                          setEditingUser(user)
                          setNewUser({ username: user.username, fullName: user.fullName, email: user.email, role: user.role, password: '' })
                          setShowAddUser(true)
                        }}
                        className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded text-sm"
                      >✏️</button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-sm"
                      >🗑️</button>
                    </div>
                  </div>
                </div>
                
                {/* Password Change Form */}
                {showPasswordChange === user.username && (
                  <div className="mt-3 pt-3 border-t flex gap-2">
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="ახალი პაროლი"
                      className="flex-1 px-3 py-2 border rounded-lg text-sm"
                    />
                    <button onClick={() => handleChangePassword(user.username)} className="px-3 py-2 bg-green-500 text-white rounded-lg text-sm">შეცვლა</button>
                    <button onClick={() => { setShowPasswordChange(null); setNewPassword('') }} className="px-3 py-2 bg-gray-300 rounded-lg text-sm">გაუქმება</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ==================== HOUSEKEEPING SECTION ====================
function HousekeepingSection({ checklist, setChecklist, onSave, isSaving }: {
  checklist: ChecklistItem[]
  setChecklist: (items: ChecklistItem[]) => void
  onSave: () => void
  isSaving: boolean
}) {
  const [showAdd, setShowAdd] = useState(false)
  const [newTask, setNewTask] = useState({ task: '', category: 'ზოგადი', required: false })
  
  const categories = ['საძინებელი', 'აბაზანა', 'ზოგადი', 'მომსახურება']
  
  const handleSave = () => {
    if (!newTask.task) {
      alert('შეიყვანეთ დავალება')
      return
    }
    setChecklist([...checklist, {
      id: `task-${Date.now()}`,
      ...newTask
    }])
    setShowAdd(false)
    setNewTask({ task: '', category: 'ზოგადი', required: false })
    onSave()
  }
  
  const handleDelete = (id: string) => {
    if (!confirm('წაშალოთ?')) return
    setChecklist(checklist.filter(c => c.id !== id))
    onSave()
  }
  
  const toggleRequired = (id: string) => {
    setChecklist(checklist.map(c => c.id === id ? { ...c, required: !c.required } : c))
    onSave()
  }
  
  const handleEdit = (id: string, currentTask: string) => {
    const newTask = prompt('შეცვალეთ დავალება:', currentTask)
    if (newTask && newTask.trim()) {
      setChecklist(checklist.map(c => c.id === id ? { ...c, task: newTask.trim() } : c))
      onSave()
    }
  }
  
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-800">🧹 Housekeeping ჩეკლისტი</h2>
          <button
            onClick={() => setShowAdd(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600"
          >
            + დამატება
          </button>
        </div>
        
        {/* Add Form */}
        {showAdd && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-3 gap-3">
              <input
                type="text"
                value={newTask.task}
                onChange={(e) => setNewTask({ ...newTask, task: e.target.value })}
                placeholder="დავალება"
                className="px-3 py-2 border rounded-lg text-sm col-span-2"
              />
              <select
                value={newTask.category}
                onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
                className="px-3 py-2 border rounded-lg text-sm"
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-4 mt-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newTask.required}
                  onChange={(e) => setNewTask({ ...newTask, required: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm">სავალდებულო</span>
              </label>
              <button onClick={handleSave} className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm">💾 შენახვა</button>
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 bg-gray-300 rounded-lg text-sm">გაუქმება</button>
            </div>
          </div>
        )}
        
        {/* Tasks by Category */}
        {categories.map(category => {
          const tasks = checklist.filter(c => c.category === category)
          if (tasks.length === 0) return null
          
          return (
            <div key={category} className="mb-4">
              <h3 className="font-medium text-gray-700 mb-2">{category}</h3>
              <div className="space-y-2">
                {tasks.map(task => (
                  <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3 flex-1">
                      <span className={`w-2 h-2 rounded-full ${task.required ? 'bg-red-500' : 'bg-gray-300'}`} />
                      <span className="font-medium">{task.task}</span>
                      {task.required && <span className="text-xs text-red-500">*სავალდებულო</span>}
                    </div>
                    <div className="flex gap-1">
                      {/* Edit Button */}
                      <button
                        onClick={() => handleEdit(task.id, task.task)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="რედაქტირება"
                      >
                        ✏️
                      </button>
                      {/* Toggle Required */}
                      <button
                        onClick={() => toggleRequired(task.id)}
                        className={`px-2 py-1 rounded text-xs ${task.required ? 'bg-red-100 text-red-700' : 'bg-gray-200'}`}
                        title={task.required ? 'არასავალდებულო' : 'სავალდებულო'}
                      >
                        {task.required ? '⭐' : '☆'}
                      </button>
                      {/* Delete Button */}
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-sm"
                        title="წაშლა"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ==================== SYSTEM SECTION ====================
function SystemSection({ systemSettings, setSystemSettings, activityLogs, onSave, isSaving }: {
  systemSettings: SystemSettings
  setSystemSettings: (settings: SystemSettings) => void
  activityLogs: any[]
  onSave: () => void
  isSaving: boolean
}) {
  const [activeTab, setActiveTab] = useState<'settings' | 'logs' | 'backup'>('settings')
  
  const handleExportData = () => {
    const data = {
      hotelInfo: JSON.parse(localStorage.getItem('hotelInfo') || '{}'),
      roomTypes: JSON.parse(localStorage.getItem('roomTypes') || '[]'),
      users: JSON.parse(localStorage.getItem('hotelUsers') || '[]'),
      checklist: JSON.parse(localStorage.getItem('housekeepingChecklist') || '[]'),
      systemSettings: JSON.parse(localStorage.getItem('systemSettings') || '{}'),
      floors: JSON.parse(localStorage.getItem('hotelFloors') || '[]'),
      staff: JSON.parse(localStorage.getItem('hotelStaff') || '[]'),
      seasons: JSON.parse(localStorage.getItem('hotelSeasons') || '[]'),
      extraServices: JSON.parse(localStorage.getItem('hotelExtraServices') || '[]'),
      packages: JSON.parse(localStorage.getItem('hotelPackages') || '[]'),
      taxes: JSON.parse(localStorage.getItem('hotelTaxes') || '{}'),
      quickCharges: JSON.parse(localStorage.getItem('hotelQuickCharges') || '[]'),
      exportDate: new Date().toISOString()
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `hotel-backup-${moment().format('YYYY-MM-DD')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }
  
  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string)
        
        if (data.hotelInfo) localStorage.setItem('hotelInfo', JSON.stringify(data.hotelInfo))
        if (data.roomTypes) localStorage.setItem('roomTypes', JSON.stringify(data.roomTypes))
        if (data.users) localStorage.setItem('hotelUsers', JSON.stringify(data.users))
        if (data.checklist) localStorage.setItem('housekeepingChecklist', JSON.stringify(data.checklist))
        if (data.systemSettings) localStorage.setItem('systemSettings', JSON.stringify(data.systemSettings))
        if (data.floors) localStorage.setItem('hotelFloors', JSON.stringify(data.floors))
        if (data.staff) localStorage.setItem('hotelStaff', JSON.stringify(data.staff))
        if (data.seasons) localStorage.setItem('hotelSeasons', JSON.stringify(data.seasons))
        if (data.extraServices) localStorage.setItem('hotelExtraServices', JSON.stringify(data.extraServices))
        if (data.packages) localStorage.setItem('hotelPackages', JSON.stringify(data.packages))
        if (data.taxes) localStorage.setItem('hotelTaxes', JSON.stringify(data.taxes))
        if (data.quickCharges) localStorage.setItem('hotelQuickCharges', JSON.stringify(data.quickCharges))
        
        alert('✅ მონაცემები წარმატებით აღდგა! გვერდი გადაიტვირთება.')
        window.location.reload()
      } catch (error) {
        alert('❌ ფაილის წაკითხვის შეცდომა')
      }
    }
    reader.readAsText(file)
  }
  
  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 px-4 py-3 font-medium text-sm ${
              activeTab === 'settings' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            ⚙️ პარამეტრები
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex-1 px-4 py-3 font-medium text-sm ${
              activeTab === 'logs' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            📋 აქტივობის ჟურნალი
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`flex-1 px-4 py-3 font-medium text-sm ${
              activeTab === 'backup' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            💾 სარეზერვო ასლი
          </button>
        </div>
        
        <div className="p-6">
          {/* System Settings */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Night Audit Settings */}
              <div>
                <h3 className="font-bold text-gray-700 mb-3">🌙 Night Audit</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ავტომატური დროს</label>
                    <input
                      type="time"
                      value={systemSettings.nightAuditTime}
                      onChange={(e) => setSystemSettings({ ...systemSettings, nightAuditTime: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div className="flex items-center">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={systemSettings.autoNightAudit}
                        onChange={(e) => setSystemSettings({ ...systemSettings, autoNightAudit: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">ავტომატური Night Audit</span>
                    </label>
                  </div>
                </div>
              </div>
              
              {/* Email Settings */}
              <div>
                <h3 className="font-bold text-gray-700 mb-3">📧 ელ. ფოსტა</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={systemSettings.emailNotifications}
                      onChange={(e) => setSystemSettings({ ...systemSettings, emailNotifications: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">შეტყობინებები ელ. ფოსტით</span>
                  </label>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">მიმღებები (თითოე ხაზზე)</label>
                    <textarea
                      value={systemSettings.emailRecipients.join('\n')}
                      onChange={(e) => setSystemSettings({ ...systemSettings, emailRecipients: e.target.value.split('\n').filter(Boolean) })}
                      className="w-full px-3 py-2 border rounded-lg h-24"
                      placeholder="email@example.com"
                    />
                  </div>
                </div>
              </div>
              
              {/* Regional Settings */}
              <div>
                <h3 className="font-bold text-gray-700 mb-3">🌍 რეგიონული</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">თარიღის ფორმატი</label>
                    <select
                      value={systemSettings.dateFormat}
                      onChange={(e) => setSystemSettings({ ...systemSettings, dateFormat: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ენა</label>
                    <select
                      value={systemSettings.language}
                      onChange={(e) => setSystemSettings({ ...systemSettings, language: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="ka">🇬🇪 ქართული</option>
                      <option value="en">🇬🇧 English</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end pt-4">
                <button onClick={onSave} disabled={isSaving} className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 font-medium">
                  {isSaving ? '⏳ ინახება...' : '💾 შენახვა'}
                </button>
              </div>
            </div>
          )}
          
          {/* Activity Logs */}
          {activeTab === 'logs' && (
            <div>
              <h3 className="font-bold text-gray-700 mb-3">📋 ბოლო აქტივობები</h3>
              
              {activityLogs.length === 0 ? (
                <p className="text-gray-500 text-center py-8">აქტივობის ჟურნალი ცარიელია</p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {activityLogs.slice(0, 50).map((log, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg text-sm">
                      <span className="text-gray-400">{moment(log.timestamp).format('DD/MM HH:mm')}</span>
                      <span className="font-medium">{log.action}</span>
                      <span className="text-gray-500">{log.user || 'System'}</span>
                      {log.details && <span className="text-gray-400">{JSON.stringify(log.details)}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Backup */}
          {activeTab === 'backup' && (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="font-bold text-green-700 mb-2">📥 მონაცემების ექსპორტი</h3>
                <p className="text-sm text-green-600 mb-4">ჩამოტვირთეთ ყველა პარამეტრის სარეზერვო ასლი JSON ფორმატში</p>
                <button
                  onClick={handleExportData}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  📥 ექსპორტი
                </button>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-bold text-blue-700 mb-2">📤 მონაცემების იმპორტი</h3>
                <p className="text-sm text-blue-600 mb-4">აღადგინეთ პარამეტრები სარეზერვო ასლიდან</p>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportData}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-500 file:text-white hover:file:bg-blue-600"
                />
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <h3 className="font-bold text-red-700 mb-2">⚠️ მონაცემების წაშლა</h3>
                <p className="text-sm text-red-600 mb-4">გაფრთხილება: ეს წაშლის ყველა ლოკალურ მონაცემს!</p>
                <button
                  onClick={() => {
                    if (confirm('ნამდვილად გსურთ ყველა მონაცემის წაშლა?\n\nეს მოქმედება შეუქცევადია!')) {
                      localStorage.clear()
                      alert('მონაცემები წაშლილია. გვერდი გადაიტვირთება.')
                      window.location.reload()
                    }
                  }}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  🗑️ ყველაფრის წაშლა
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ==================== CALENDAR SETTINGS SECTION ====================
function CalendarSettingsSection({
  settings,
  setSettings,
  onSave
}: {
  settings: CalendarSettings
  setSettings: React.Dispatch<React.SetStateAction<CalendarSettings>>
  onSave: () => void
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">📅 კალენდრის პარამეტრები</h2>
          <p className="text-gray-600 mt-1">კალენდრის ფუნქციების მართვა</p>
        </div>
        <button
          onClick={onSave}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
        >
          💾 შენახვა
        </button>
      </div>

      <div className="space-y-6">
        {/* Interaction Settings */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
            🖱️ ინტერაქცია
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Drag & Drop */}
            <label className="flex items-center justify-between p-3 bg-white rounded-lg border cursor-pointer hover:border-blue-300">
              <div>
                <div className="font-medium text-gray-800">Drag & Drop</div>
                <div className="text-sm text-gray-500">ჯავშნის გადატანა სხვა ოთახზე/თარიღზე</div>
              </div>
              <input
                type="checkbox"
                checked={settings.enableDragDrop}
                onChange={(e) => setSettings(prev => ({ ...prev, enableDragDrop: e.target.checked }))}
                className="w-5 h-5 text-blue-600 rounded"
              />
            </label>

            {/* Resize */}
            <label className="flex items-center justify-between p-3 bg-white rounded-lg border cursor-pointer hover:border-blue-300">
              <div>
                <div className="font-medium text-gray-800">Resize</div>
                <div className="text-sm text-gray-500">ჯავშნის გაგრძელება/შემცირება</div>
              </div>
              <input
                type="checkbox"
                checked={settings.enableResize}
                onChange={(e) => setSettings(prev => ({ ...prev, enableResize: e.target.checked }))}
                className="w-5 h-5 text-blue-600 rounded"
              />
            </label>

            {/* Quick Reservation */}
            <label className="flex items-center justify-between p-3 bg-white rounded-lg border cursor-pointer hover:border-blue-300">
              <div>
                <div className="font-medium text-gray-800">სწრაფი ჯავშანი</div>
                <div className="text-sm text-gray-500">უჯრაზე დაჭერით ახალი ჯავშნის შექმნა</div>
              </div>
              <input
                type="checkbox"
                checked={settings.enableQuickReservation}
                onChange={(e) => setSettings(prev => ({ ...prev, enableQuickReservation: e.target.checked }))}
                className="w-5 h-5 text-blue-600 rounded"
              />
            </label>

            {/* Context Menu */}
            <label className="flex items-center justify-between p-3 bg-white rounded-lg border cursor-pointer hover:border-blue-300">
              <div>
                <div className="font-medium text-gray-800">კონტექსტური მენიუ</div>
                <div className="text-sm text-gray-500">მარჯვენა კლიკზე მენიუს ჩვენება</div>
              </div>
              <input
                type="checkbox"
                checked={settings.enableContextMenu}
                onChange={(e) => setSettings(prev => ({ ...prev, enableContextMenu: e.target.checked }))}
                className="w-5 h-5 text-blue-600 rounded"
              />
            </label>

            {/* Show Floors */}
            <label className="flex items-center justify-between p-3 bg-white rounded-lg border cursor-pointer hover:border-blue-300">
              <div>
                <div className="font-medium text-gray-800">სართულები</div>
                <div className="text-sm text-gray-500">ოთახების სართულებად დაჯგუფება</div>
              </div>
              <input
                type="checkbox"
                checked={settings.showFloors}
                onChange={(e) => setSettings(prev => ({ ...prev, showFloors: e.target.checked }))}
                className="w-5 h-5 text-blue-600 rounded"
              />
            </label>
          </div>
        </div>

        {/* Display Settings */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
            👁️ ჩვენება
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Show Room Numbers */}
            <label className="flex items-center justify-between p-3 bg-white rounded-lg border cursor-pointer hover:border-blue-300">
              <div>
                <div className="font-medium text-gray-800">ოთახის ნომერი</div>
                <div className="text-sm text-gray-500">ბარზე ოთახის # ჩვენება</div>
              </div>
              <input
                type="checkbox"
                checked={settings.showRoomNumbers}
                onChange={(e) => setSettings(prev => ({ ...prev, showRoomNumbers: e.target.checked }))}
                className="w-5 h-5 text-blue-600 rounded"
              />
            </label>

            {/* Show Guest Count */}
            <label className="flex items-center justify-between p-3 bg-white rounded-lg border cursor-pointer hover:border-blue-300">
              <div>
                <div className="font-medium text-gray-800">სტუმრების რაოდენობა</div>
                <div className="text-sm text-gray-500">ბარზე 👥 ჩვენება</div>
              </div>
              <input
                type="checkbox"
                checked={settings.showGuestCount}
                onChange={(e) => setSettings(prev => ({ ...prev, showGuestCount: e.target.checked }))}
                className="w-5 h-5 text-blue-600 rounded"
              />
            </label>

            {/* Show Prices */}
            <label className="flex items-center justify-between p-3 bg-white rounded-lg border cursor-pointer hover:border-blue-300">
              <div>
                <div className="font-medium text-gray-800">ფასები</div>
                <div className="text-sm text-gray-500">ბარზე თანხის ჩვენება</div>
              </div>
              <input
                type="checkbox"
                checked={settings.showPrices}
                onChange={(e) => setSettings(prev => ({ ...prev, showPrices: e.target.checked }))}
                className="w-5 h-5 text-blue-600 rounded"
              />
            </label>

            {/* Show Price Tooltip */}
            <label className="flex items-center justify-between p-3 bg-white rounded-lg border cursor-pointer hover:border-blue-300">
              <div>
                <div className="font-medium text-gray-800">💰 ფასის Tooltip</div>
                <div className="text-sm text-gray-500">ცარიელ უჯრაზე ფასის ჩვენება</div>
              </div>
              <input
                type="checkbox"
                checked={settings.showPriceTooltip}
                onChange={(e) => setSettings(prev => ({ ...prev, showPriceTooltip: e.target.checked }))}
                className="w-5 h-5 text-blue-600 rounded"
              />
            </label>

            {/* Show Season Colors */}
            <label className="flex items-center justify-between p-3 bg-white rounded-lg border cursor-pointer hover:border-blue-300">
              <div>
                <div className="font-medium text-gray-800">🎨 სეზონის ფერები</div>
                <div className="text-sm text-gray-500">კალენდარზე სეზონური ფერების ჩვენება</div>
              </div>
              <input
                type="checkbox"
                checked={settings.showSeasonColors}
                onChange={(e) => setSettings(prev => ({ ...prev, showSeasonColors: e.target.checked }))}
                className="w-5 h-5 text-blue-600 rounded"
              />
            </label>
          </div>
        </div>

        {/* View Settings */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
            📊 ხედი
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Default View */}
            <div className="p-3 bg-white rounded-lg border">
              <label className="block text-sm font-medium text-gray-700 mb-2">ნაგულისხმევი ხედი</label>
              <select
                value={settings.defaultView}
                onChange={(e) => setSettings(prev => ({ ...prev, defaultView: e.target.value as 'week' | 'month' }))}
                className="w-full p-2 border rounded-lg"
              >
                <option value="week">კვირა</option>
                <option value="month">თვე</option>
              </select>
            </div>

            {/* Week Starts On */}
            <div className="p-3 bg-white rounded-lg border">
              <label className="block text-sm font-medium text-gray-700 mb-2">კვირის დასაწყისი</label>
              <select
                value={settings.weekStartsOn}
                onChange={(e) => setSettings(prev => ({ ...prev, weekStartsOn: parseInt(e.target.value) as 0 | 1 }))}
                className="w-full p-2 border rounded-lg"
              >
                <option value={1}>ორშაბათი</option>
                <option value={0}>კვირა</option>
              </select>
            </div>

            {/* Color Scheme */}
            <div className="p-3 bg-white rounded-lg border">
              <label className="block text-sm font-medium text-gray-700 mb-2">ფერების სქემა</label>
              <select
                value={settings.colorScheme}
                onChange={(e) => setSettings(prev => ({ ...prev, colorScheme: e.target.value as 'status' | 'roomType' | 'source' }))}
                className="w-full p-2 border rounded-lg"
              >
                <option value="status">სტატუსის მიხედვით</option>
                <option value="roomType">ოთახის ტიპის მიხედვით</option>
                <option value="source">წყაროს მიხედვით</option>
              </select>
            </div>
          </div>
        </div>

        {/* Color Legend */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="font-bold text-blue-700 mb-3">🎨 ფერების ლეგენდა (სტატუსის მიხედვით)</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-500"></div>
              <span className="text-sm">დადასტურებული</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500"></div>
              <span className="text-sm">შესული</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gray-400"></div>
              <span className="text-sm">გასული</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500"></div>
              <span className="text-sm">გაუქმებული</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-orange-500"></div>
              <span className="text-sm">NO-SHOW</span>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-bold text-yellow-700 mb-2">💡 რჩევები</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• <strong>Drag & Drop:</strong> დააჭირეთ ჯავშანს და გადაათრიეთ სხვა უჯრაზე</li>
            <li>• <strong>Resize:</strong> გადაათრიეთ ჯავშნის მარცხენა/მარჯვენა კიდე</li>
            <li>• <strong>ESC:</strong> გააუქმებს მიმდინარე drag/resize ოპერაციას</li>
            <li>• <strong>Double Click:</strong> გახსნის ჯავშნის დეტალებს</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

// ==================== CASHIER SETTINGS SECTION ====================
function CashierSettingsSection({ settings, setSettings, onSave }: {
  settings: {
    cashierEnabled: boolean
    defaultOpeningBalance: number
    discrepancyLimit: number
    shiftCloseReminder: number
    paymentMethods: string[]
  }
  setSettings: (settings: any) => void
  onSave: () => void
}) {
  const updateSettings = (updates: Partial<typeof settings>) => {
    setSettings({ ...settings, ...updates })
  }
  
  return (
    <div className="p-6">
      <h3 className="text-xl font-bold mb-4">💰 სალაროს პარამეტრები</h3>
      
      {/* Enable/Disable Cashier */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold">სალაროს მოდული</div>
            <div className="text-sm text-gray-500">ჩართეთ ან გამორთეთ სალაროს ფუნქციონალი</div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.cashierEnabled}
              onChange={(e) => updateSettings({ cashierEnabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
          </label>
        </div>
      </div>
      
      {/* Default Opening Balance */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">ნაგულისხმევი საწყისი ბალანსი</label>
        <input
          type="number"
          value={settings.defaultOpeningBalance || 0}
          onChange={(e) => updateSettings({ defaultOpeningBalance: Number(e.target.value) })}
          className="w-full border rounded px-3 py-2"
          placeholder="0.00"
        />
      </div>
      
      {/* Require Manager Approval for Discrepancy */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">სხვაობის ლიმიტი (მენეჯერის დასტური)</label>
        <input
          type="number"
          value={settings.discrepancyLimit || 50}
          onChange={(e) => updateSettings({ discrepancyLimit: Number(e.target.value) })}
          className="w-full border rounded px-3 py-2"
          placeholder="50"
        />
        <p className="text-xs text-gray-500 mt-1">თუ სხვაობა მეტია ამ თანხაზე, საჭიროა მენეჯერის დასტური</p>
      </div>
      
      {/* Auto-close shift warning */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">სალაროს დახურვის შეხსენება (საათი)</label>
        <input
          type="number"
          value={settings.shiftCloseReminder || 23}
          onChange={(e) => updateSettings({ shiftCloseReminder: Number(e.target.value) })}
          className="w-full border rounded px-3 py-2"
          min="0"
          max="23"
        />
        <p className="text-xs text-gray-500 mt-1">რომელ საათზე გამოჩნდეს შეხსენება სალაროს დახურვის შესახებ</p>
      </div>
      
      {/* Payment Methods */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">გადახდის მეთოდები</label>
        <div className="space-y-2">
          {['cash', 'card', 'bank'].map(method => (
            <label key={method} className="flex items-center">
              <input
                type="checkbox"
                checked={settings.paymentMethods?.includes(method) ?? true}
                onChange={(e) => {
                  const methods = settings.paymentMethods || ['cash', 'card', 'bank']
                  if (e.target.checked) {
                    updateSettings({ paymentMethods: [...methods, method] })
                  } else {
                    updateSettings({ paymentMethods: methods.filter(m => m !== method) })
                  }
                }}
                className="mr-2"
              />
              {method === 'cash' ? '💵 ნაღდი' : method === 'card' ? '💳 ბარათი' : '🏦 ბანკი'}
            </label>
          ))}
        </div>
      </div>
      
      {/* Save Button */}
      <button
        onClick={onSave}
        className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        💾 შენახვა
      </button>
    </div>
  )
}