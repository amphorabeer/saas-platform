'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import moment from 'moment'
import CalendarView from '../components/CalendarView'
import ResourceCalendar from '../components/ResourceCalendar'
import EnhancedCalendar from '../components/EnhancedCalendar'
import RoomCalendar from '../components/RoomCalendar'
import RoomGridView from '../components/RoomGridView'
import HousekeepingView from '../components/HousekeepingView'
import CheckInModal from '../components/CheckInModal'
import CheckOutModal from '../components/CheckOutModal'
import PaymentModal from '../components/PaymentModal'
import Reports from '../components/Reports'
import NightAuditModule from '../components/NightAuditModule'
import SystemLockOverlay from '../components/SystemLockOverlay'
import NightAuditWarningBanner from '../components/NightAuditWarningBanner'
import FolioSystem from '../components/FolioSystem'
import CashierManagement from '../components/CashierModule'
import FinancialDashboard from '../components/FinancialDashboard'
import KPIAlerts from '../components/KPIAlerts'
import SettingsNew from '../components/SettingsNew'
import { SystemLockService } from '../lib/systemLockService'
import { ActivityLogger } from '../lib/activityLogger'
import { FolioService } from '../services/FolioService'
import { RESERVATION_STATUS, ROOM_STATUS } from '../constants/statusConstants'
import { hasDisplayableLogo, sanitizeLogo } from '@/lib/logo'
import { usePlan } from '@/lib/usePlan'
import { UpgradeModal } from '@/components/UpgradeModal'
import { PLAN_NAMES, PlanFeatures } from '@/lib/plan-features'

interface Room {
  id: string
  roomNumber: string
  floor: number
  status: string
  basePrice: number
  roomType?: string
}

interface Reservation {
  id: string
  guestName: string
  guestEmail: string
  roomId: string
  checkIn: string
  checkOut: string
  status: string
  totalAmount: number
  roomNumber?: string
}

export default function HotelDashboard() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeTabs, setActiveTabs] = useState<string[]>(['dashboard', 'calendar']) // Start with dashboard
  const [activeTab, setActiveTab] = useState('dashboard')
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('trial')
  const [showQuickMenu, setShowQuickMenu] = useState(false)
  const [rooms, setRooms] = useState<Room[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [maintenanceRooms, setMaintenanceRooms] = useState<string[]>([])
  const [hotelInfo, setHotelInfo] = useState<any>({ name: 'Hotel Tbilisi', logo: '' })
  
  // Plan-based features
  const { plan, hasFeature, getRequiredPlan } = usePlan()
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [upgradeFeature, setUpgradeFeature] = useState<{ name: string; feature: keyof PlanFeatures['features'] } | null>(null)
  
  // Auth check - NextAuth
  const { data: session, status } = useSession()
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated' && session?.user) {
      setCurrentUser({
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role || 'admin',
        tenantId: session.user.tenantId
      })
    }
  }, [status, session, router])
  
  // Fetch subscription status (initial + refetch when tab visible, so Super Admin ACTIVE updates are reflected)
  useEffect(() => {
    const fetchSubscriptionStatus = async () => {
      try {
        const res = await fetch('/api/auth/subscription')
        if (res.ok) {
          const data = await res.json()
          const s = (data.status || 'trial').toLowerCase()
          setSubscriptionStatus(s)
        }
      } catch (error) {
        console.log('Could not fetch subscription status')
      }
    }
    fetchSubscriptionStatus()
    const interval = setInterval(fetchSubscriptionStatus, 2 * 60 * 1000) // refetch every 2 min
    const onVisibility = () => {
      if (document.visibilityState === 'visible') fetchSubscriptionStatus()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])
  
  // Role-based permissions
  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'manager'
  const canViewReports = currentUser?.role !== 'receptionist'
  const canCloseDay = currentUser?.role === 'admin' || currentUser?.role === 'MODULE_ADMIN' || currentUser?.role === 'ORGANIZATION_OWNER'
  
  const handleLogout = async () => {
    ActivityLogger.log('LOGOUT', { username: currentUser?.name })
    await signOut({ callbackUrl: '/login' })
  }

  // Load maintenance rooms from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('maintenanceRooms')
    if (saved) {
      try {
        setMaintenanceRooms(JSON.parse(saved))
      } catch (e) {
        console.error('Error loading maintenance rooms:', e)
      }
    }
  }, [])
  
  // Load hotel info from API first, then localStorage
  useEffect(() => {
    const loadHotelInfo = async () => {
      // Try API first
      try {
        const res = await fetch('/api/hotel/organization')
        if (res.ok) {
          const orgData = await res.json()
          if (orgData && orgData.name) {
            const info = {
              name: orgData.name || '',
              company: orgData.company || '',
              taxId: orgData.taxId || '',
              address: orgData.address || '',
              city: orgData.city || '',
              country: orgData.country || 'Georgia',
              phone: orgData.phone || '',
              email: orgData.email || '',
              website: orgData.website || '',
              bankName: orgData.bankName || '',
              bankAccount: orgData.bankAccount || '',
              logo: sanitizeLogo(orgData.logo)
            }
            setHotelInfo(info)
            // Also save to localStorage for consistency
            localStorage.setItem('hotelInfo', JSON.stringify(info))
            return
          }
        }
      } catch (e) {
        console.error('Error loading hotel info from API:', e)
      }
      
      // Fallback to localStorage
      const savedHotelInfo = localStorage.getItem('hotelInfo')
      if (savedHotelInfo) {
        try {
          const parsed = JSON.parse(savedHotelInfo)
          if (parsed && typeof parsed === 'object') {
            setHotelInfo({ ...parsed, logo: sanitizeLogo(parsed.logo) })
          } else {
            setHotelInfo(parsed)
          }
        } catch (e) {
          console.error('Error loading hotel info:', e)
        }
      }
    }
    
    loadHotelInfo()
    
    // Listen for changes to hotelInfo
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'hotelInfo') {
        loadHotelInfo()
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    
    // Also listen for custom event (for same-tab updates)
    const handleCustomStorageChange = () => {
      loadHotelInfo()
    }
    
    window.addEventListener('hotelInfoUpdated', handleCustomStorageChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('hotelInfoUpdated', handleCustomStorageChange)
    }
  }, [])
  const [initialCheckInDate, setInitialCheckInDate] = useState<string | undefined>(undefined)
  const [showCheckInModal, setShowCheckInModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<any>(null)
  const [showArrivalsModal, setShowArrivalsModal] = useState(false)
  const [showDeparturesModal, setShowDeparturesModal] = useState(false)
  const [showCheckOutModal, setShowCheckOutModal] = useState(false)
  const [checkOutReservation, setCheckOutReservation] = useState<any>(null)
  const [showCheckInProcessModal, setShowCheckInProcessModal] = useState(false)
  const [checkInReservation, setCheckInReservation] = useState<any>(null)
  const [showAuditBanner, setShowAuditBanner] = useState(false)

  // Track banner visibility for padding
  useEffect(() => {
    const checkBannerVisibility = () => {
      const lastAuditDate = localStorage.getItem('lastNightAuditDate') || localStorage.getItem('lastAuditDate')
      const today = moment().format('YYYY-MM-DD')
      
      if (!lastAuditDate) {
        // Check if there's activity but no audits
        const reservations = JSON.parse(localStorage.getItem('hotelReservations') || '[]')
        const audits = JSON.parse(localStorage.getItem('nightAudits') || '[]')
        const hasCompletedAudits = audits.some((a: any) => a.status === 'completed' && !a.reversed)
        const hasActivity = reservations.length > 0 || audits.length > 0
        setShowAuditBanner(hasActivity && !hasCompletedAudits)
        return
      }
      
      let lastAudit: moment.Moment
      try {
        lastAudit = moment(JSON.parse(lastAuditDate))
      } catch {
        lastAudit = moment(lastAuditDate)
      }
      
      if (!lastAudit.isValid()) {
        const audits = JSON.parse(localStorage.getItem('nightAudits') || '[]')
        const completedAudits = audits
          .filter((a: any) => a.status === 'completed' && !a.reversed)
          .sort((a: any, b: any) => moment(b.date).valueOf() - moment(a.date).valueOf())
        if (completedAudits.length > 0) {
          lastAudit = moment(completedAudits[0].date)
        } else {
          setShowAuditBanner(false)
          return
        }
      }
      
      const daysSince = moment(today).diff(lastAudit, 'days')
      setShowAuditBanner(daysSince > 1)
    }
    
    checkBannerVisibility()
    
    // Check on storage change
    window.addEventListener('storage', checkBannerVisibility)
    
    // Check periodically
    const interval = setInterval(checkBannerVisibility, 60000)
    
    return () => {
      window.removeEventListener('storage', checkBannerVisibility)
      clearInterval(interval)
    }
  }, [])
  
  // Add tab from dropdown
  const addTabFromMenu = (tabId: string) => {
    if (!activeTabs.includes(tabId)) {
      setActiveTabs([...activeTabs, tabId])
    }
    setActiveTab(tabId)
    setShowQuickMenu(false)
  }

  // Listen for openNightAudit event
  useEffect(() => {
    const handleOpenAudit = (e: Event) => {
      const customEvent = e as CustomEvent
      // Open Night Audit tab
      addTabFromMenu('new-night-audit')
      
      // If date is provided, we could set it here if NightAuditModule supports it
      if (customEvent.detail?.date) {
        // NightAuditModule will handle the date from localStorage or props
        console.log('Opening Night Audit for date:', customEvent.detail.date)
      }
    }
    
    window.addEventListener('openNightAudit', handleOpenAudit as EventListener)
    return () => {
      window.removeEventListener('openNightAudit', handleOpenAudit as EventListener)
    }
  }, [])
  
  // Close tab
  const closeTab = (tabId: string) => {
    if (tabId === 'calendar' || tabId === 'dashboard') return // Can't close calendar or dashboard
    
    const newTabs = activeTabs.filter(t => t !== tabId)
    setActiveTabs(newTabs)
    
    // Switch to dashboard if closing active tab
    if (activeTab === tabId) {
      setActiveTab('dashboard')
    }
  }
  
  const getTabLabel = (tabId: string) => {
    switch(tabId) {
      case 'dashboard': return '🏠 Dashboard'
      case 'calendar': return '📅 კალენდარი'
      case 'rooms': return '🏨 ნომრები'
      case 'folios': return '💰 ანგარიშები'
      case 'housekeeping': return '🧹 დასუფთავება'
      case 'roomgrid': return '🏨 ოთახები'
      case 'reports': return '📊 რეპორტები'
      case 'new-night-audit': return '🌙 დღის დახურვა'
      case 'cashier': return '💰 სალარო'
      case 'financial': return '💰 ფინანსური დეშბორდი'
      case 'settings-new': return '⚙️ პარამეტრები'
      default: return ''
    }
  }
  
  // Statistics
  const stats = {
    total: rooms.length,
    occupied: rooms.filter(r => r.status === 'OCCUPIED').length,
    vacant: rooms.filter(r => r.status === 'VACANT').length,
    cleaning: rooms.filter(r => r.status === 'CLEANING').length,
    occupancyRate: rooms.length > 0 
      ? Math.round((rooms.filter(r => r.status === 'OCCUPIED').length / rooms.length) * 100)
      : 0
  }
  
  // NO-SHOW Statistics
  const noShowStats = {
    today: reservations.filter((r: any) => 
      r.status === 'NO_SHOW' && 
      moment(r.noShowDate || r.markedAsNoShowAt || r.checkIn).isSame(moment(), 'day')
    ).length,
    
    thisMonth: reservations.filter((r: any) => 
      r.status === 'NO_SHOW' && 
      moment(r.noShowDate || r.markedAsNoShowAt || r.checkIn).isSame(moment(), 'month')
    ).length,
    
    revenue: reservations
      .filter((r: any) => r.status === 'NO_SHOW')
      .reduce((sum: number, r: any) => sum + (r.noShowCharge || 0), 0)
  }
  
  // Today's Arrivals Statistics (CONFIRMED reservations with checkIn === businessDay)
  const getBusinessDay = () => {
    if (typeof window === 'undefined') return moment().format('YYYY-MM-DD')
    const lastAuditDate = localStorage.getItem('lastAuditDate')
    if (lastAuditDate) {
      try {
        const lastClosed = JSON.parse(lastAuditDate)
        return moment(lastClosed).add(1, 'day').format('YYYY-MM-DD')
      } catch {
        return moment().format('YYYY-MM-DD')
      }
    }
    return moment().format('YYYY-MM-DD')
  }
  
  const businessDay = getBusinessDay()
  
  const todayArrivals = {
    count: reservations.filter((r: any) => 
      r.status === 'CONFIRMED' && 
      moment(r.checkIn).format('YYYY-MM-DD') === businessDay
    ).length,
    
    totalAmount: reservations
      .filter((r: any) => 
        r.status === 'CONFIRMED' && 
        moment(r.checkIn).format('YYYY-MM-DD') === businessDay
      )
      .reduce((sum: number, r: any) => sum + (r.totalAmount || 0), 0)
  }
  
  // Today's Arrivals - CONFIRMED reservations checking in today
  const todayArrivalsReservations = reservations.filter((r: any) => 
    r.status === 'CONFIRMED' && 
    moment(r.checkIn).format('YYYY-MM-DD') === businessDay
  )
  
  // Today's Departures - CHECKED_IN reservations checking out today
  const todayDeparturesReservations = reservations.filter((r: any) => 
    r.status === 'CHECKED_IN' && 
    moment(r.checkOut).format('YYYY-MM-DD') === businessDay
  )

  useEffect(() => {
    loadRooms()
    loadReservations()
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadRooms()
      loadReservations()
    }, 30000)
    return () => clearInterval(interval)
  }, [])
  
  // Add global debug functions for console
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Function 1: Check stats from localStorage
      (window as any).checkDashboardStats = () => {
        const reservations = JSON.parse(localStorage.getItem('reservations') || '[]')
        const rooms = JSON.parse(localStorage.getItem('rooms') || '[]')
        
        console.log('=== Dashboard Stats (from localStorage) ===')
        console.log('Total Rooms:', rooms.length)
        console.log('Total Reservations:', reservations.length)
        
        // Status breakdown
        const statusCounts: Record<string, number> = {}
        reservations.forEach((r: any) => {
          statusCounts[r.status] = (statusCounts[r.status] || 0) + 1
        })
        console.log('By Status:', statusCounts)
        
        // Today's data
        const today = new Date().toISOString().split('T')[0]
        console.log('Today:', today)
        
        // Check-ins today
        const checkInsToday = reservations.filter((r: any) => 
          r.checkIn && r.checkIn.startsWith(today)
        ).length
        console.log('Check-ins Today:', checkInsToday)
        
        // Check-outs today  
        const checkOutsToday = reservations.filter((r: any) => 
          r.checkOut && r.checkOut.startsWith(today)
        ).length
        console.log('Check-outs Today:', checkOutsToday)
        
        // Financial Dashboard data
        const folios = JSON.parse(localStorage.getItem('hotelFolios') || '[]')
        const todayCharges = folios.flatMap((f: any) => f.transactions || [])
          .filter((t: any) => {
            const transactionDate = moment(t.date).format('YYYY-MM-DD')
            return transactionDate === today && t.type === 'charge'
          })
        console.log('Today Charges:', todayCharges.length, 'transactions')
        console.log('Today Revenue:', todayCharges.reduce((sum: number, t: any) => sum + (t.debit || 0), 0).toFixed(2))
        
        // Payment History
        const paymentHistory = JSON.parse(localStorage.getItem('paymentHistory') || '[]')
        const todayPayments = paymentHistory.filter((p: any) => 
          moment(p.date).format('YYYY-MM-DD') === today
        )
        console.log('Today Payments:', todayPayments.length, 'payments')
        console.log('Today Payment Total:', todayPayments.reduce((sum: number, p: any) => sum + (p.credit || p.amount || 0), 0).toFixed(2))
        
        return {
          rooms: rooms.length,
          reservations: reservations.length,
          statusCounts,
          today,
          checkInsToday,
          checkOutsToday,
          todayCharges: todayCharges.length,
          todayRevenue: todayCharges.reduce((sum: number, t: any) => sum + (t.debit || 0), 0),
          todayPayments: todayPayments.length,
          todayPaymentTotal: todayPayments.reduce((sum: number, p: any) => sum + (p.credit || p.amount || 0), 0)
        }
      }
      
      // Function 2: Check reservations via API (alternative method)
      (window as any).checkReservationsAPI = async () => {
        try {
          console.log('🔄 Fetching reservations from API...')
          const response = await fetch('/api/hotel/reservations')
          
          if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`)
          }
          
          const data = await response.json()
          
          console.log('=== Reservations (from API) ===')
          console.log('Total reservations:', data.length)
          
          // Status breakdown
          const byStatus: Record<string, number> = {}
          data.forEach((r: any) => {
            byStatus[r.status] = (byStatus[r.status] || 0) + 1
          })
          console.log('By Status:', byStatus)
          
          // Show CHECKED_IN details
          const checkedIn = data.filter((r: any) => r.status === 'CHECKED_IN')
          console.log('CHECKED_IN reservations:', checkedIn.length)
          
          if (checkedIn.length > 0) {
            console.table(checkedIn.map((r: any) => ({
              guest: r.guestName,
              room: r.roomNumber || r.roomId,
              checkIn: r.checkIn,
              checkOut: r.checkOut,
              reservationNumber: r.reservationNumber || r.id
            })))
          } else {
            console.log('No CHECKED_IN reservations found.')
          }
          
          // Show all reservations summary
          console.log('\n📋 All Reservations Summary:')
          data.forEach((r: any, index: number) => {
            console.log(`${index + 1}. ${r.guestName} - Room: ${r.roomNumber || r.roomId} - Status: ${r.status} - Check-in: ${r.checkIn} - Check-out: ${r.checkOut}`)
          })
          
          return {
            total: data.length,
            byStatus,
            checkedIn: checkedIn.map((r: any) => ({
              guest: r.guestName,
              room: r.roomNumber || r.roomId,
              checkIn: r.checkIn,
              checkOut: r.checkOut,
              reservationNumber: r.reservationNumber || r.id
            })),
            allReservations: data
          }
        } catch (error: any) {
          console.error('❌ Error fetching reservations:', error)
          console.error('Error details:', error.message)
          return {
            error: true,
            message: error.message
          }
        }
      }
      
      // Function 3: Check data persistence (localStorage vs API)
      (window as any).checkDataPersistence = async () => {
        console.log('🔍 Checking data persistence...')
        console.log('='.repeat(50))
        
        // 1. Check localStorage
        console.log('\n📦 localStorage:')
        const localRooms = localStorage.getItem('rooms')
        const localReservations = localStorage.getItem('reservations')
        const localHotelRooms = localStorage.getItem('hotelRooms')
        
        const localRoomsData = localRooms ? JSON.parse(localRooms) : []
        const localReservationsData = localReservations ? JSON.parse(localReservations) : []
        const localHotelRoomsData = localHotelRooms ? JSON.parse(localHotelRooms) : []
        
        console.log('  - rooms:', localRoomsData.length, 'items')
        console.log('  - reservations:', localReservationsData.length, 'items')
        console.log('  - hotelRooms:', localHotelRoomsData.length, 'items')
        
        // 2. Check API
        console.log('\n🌐 API Endpoints:')
        try {
          const roomsResponse = await fetch('/api/hotel/rooms')
          const roomsData = roomsResponse.ok ? await roomsResponse.json() : null
          
          const reservationsResponse = await fetch('/api/hotel/reservations')
          const reservationsData = reservationsResponse.ok ? await reservationsResponse.json() : null
          
          console.log('  - /api/hotel/rooms:', roomsData ? roomsData.length : 'ERROR', 'items')
          console.log('  - /api/hotel/reservations:', reservationsData ? reservationsData.length : 'ERROR', 'items')
          
          // 3. Compare localStorage vs API
          console.log('\n📊 Comparison:')
          console.log('  Rooms:')
          console.log('    localStorage:', localRoomsData.length)
          console.log('    API:', roomsData ? roomsData.length : 'N/A')
          console.log('    Match:', localRoomsData.length === (roomsData?.length || 0) ? '✅' : '❌')
          
          console.log('  Reservations:')
          console.log('    localStorage:', localReservationsData.length)
          console.log('    API:', reservationsData ? reservationsData.length : 'N/A')
          console.log('    Match:', localReservationsData.length === (reservationsData?.length || 0) ? '✅' : '❌')
          
          // 4. Data source analysis
          console.log('\n💡 Data Source Analysis:')
          console.log('  - Main Storage: JSON files (data/rooms.json, data/reservations.json)')
          console.log('  - API reads from: dataStore.ts → JSON files')
          
          return {
            localStorage: {
              rooms: localRoomsData.length,
              reservations: localReservationsData.length,
              hotelRooms: localHotelRoomsData.length
            },
            api: {
              rooms: roomsData ? roomsData.length : null,
              reservations: reservationsData ? reservationsData.length : null
            },
            match: {
              rooms: localRoomsData.length === (roomsData?.length || 0),
              reservations: localReservationsData.length === (reservationsData?.length || 0)
            }
          }
        } catch (error: any) {
          console.error('❌ Error checking API:', error)
          return {
            error: true,
            message: error.message
          }
        }
      }
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).checkDashboardStats
        delete (window as any).checkReservationsAPI
        delete (window as any).checkDataPersistence
      }
    }
  }, [])
  
  // Close quick menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showQuickMenu) {
        setShowQuickMenu(false)
      }
    }
    if (showQuickMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showQuickMenu])
  
  // Update room statuses when reservations change
  useEffect(() => {
    if (reservations.length > 0 && rooms.length > 0) {
      updateRoomStatuses()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservations.length])
  

  async function loadRooms() {
    try {
      const res = await fetch('/api/hotel/rooms')
      if (res.ok) {
        const data = await res.json()
        setRooms(data)
        // CRITICAL: Save to localStorage for FolioSystem, NightAudit, etc.
        if (data && data.length > 0) {
          localStorage.setItem('rooms', JSON.stringify(data))
          sessionStorage.setItem('apiRooms', JSON.stringify(data))
        }
      }
    } catch (error) {
      console.error('Failed to load rooms:', error)
    }
  }

  async function loadReservations() {
    try {
      const res = await fetch('/api/hotel/reservations')
      if (res.ok) {
        const data = await res.json()
        setReservations(data)
        // Update room statuses after loading reservations
        updateRoomStatuses(data)
      }
    } catch (error) {
      console.error('Failed to load reservations:', error)
    }
  }
  
  // Update room statuses based on current reservations
  async function updateRoomStatuses(reservationsData?: any[]) {
    const reservationsToCheck = reservationsData || reservations
    
    // Use Business Day instead of today's date
    const getBusinessDay = () => {
      if (typeof window === 'undefined') return moment().format('YYYY-MM-DD')
      const lastAuditDate = localStorage.getItem('lastAuditDate')
      if (lastAuditDate) {
        try {
          const lastClosed = JSON.parse(lastAuditDate)
          return moment(lastClosed).add(1, 'day').format('YYYY-MM-DD')
        } catch {
          return moment().format('YYYY-MM-DD')
        }
      }
      return moment().format('YYYY-MM-DD')
    }
    
    const businessDay = getBusinessDay()
    
    const updatePromises = rooms.map(async (room) => {
      // Check if room has active guest on BUSINESS DAY
      const activeReservation = reservationsToCheck.find((res: any) => {
        const checkIn = moment(res.checkIn).format('YYYY-MM-DD')
        const checkOut = moment(res.checkOut).format('YYYY-MM-DD')
        
        return res.roomId === room.id && 
               res.status === 'CHECKED_IN' &&
               businessDay >= checkIn && 
               businessDay < checkOut
      })
      
      let newStatus = room.status // Keep current status by default
      
      if (activeReservation) {
        newStatus = 'OCCUPIED'
      } else if (room.status === 'OCCUPIED') {
        // Only change to VACANT if currently OCCUPIED and no active reservation
        newStatus = 'VACANT'
      }
      // Keep CLEANING, MAINTENANCE, etc. as is
      
      // Update if different
      if (room.status !== newStatus) {
        try {
          await fetch('/api/hotel/rooms/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              roomId: room.id,
              status: newStatus
            })
          })
        } catch (error) {
          console.error('Failed to update room status:', error)
        }
      }
    })
    
    await Promise.all(updatePromises)
    // Reload rooms after all status updates
    await loadRooms()
  }

  async function updateRoomStatus(roomId: string, status: string) {
    try {
      const res = await fetch('/api/hotel/rooms/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, status })
      })
      if (res.ok) {
        loadRooms()
      }
    } catch (error) {
      console.error('Failed to update room status:', error)
    }
  }

  // Helper function to create folio for reservation with room charges
  const createFolioForReservation = (reservation: any) => {
    // Ensure reservation has real roomNumber, not just roomId
    const reservationWithRoomNumber = {
      ...reservation,
      roomNumber: (() => {
        // If already has valid roomNumber, use it
        if (reservation.roomNumber && reservation.roomNumber.length <= 4 && /^\d+$/.test(reservation.roomNumber)) {
          return reservation.roomNumber
        }
        // Find room by roomId and get roomNumber
        const room = rooms.find(r => r.id === reservation.roomId || r.id === reservation.roomNumber)
        if (room) {
          return room.roomNumber || room.number
        }
        // Fallback
        return reservation.roomNumber || reservation.roomId
      })()
    }
    
    // Use centralized FolioService
    return FolioService.createFolioForReservation(reservationWithRoomNumber, {
      prePostCharges: true,
      paymentMethod: reservation.paymentMethod
    })
  }

  async function checkInGuest(data: any) {
    // Check if system is locked
    if (SystemLockService.isLocked()) {
      alert('❌ სისტემა დაბლოკილია! დღის დახურვა მიმდინარეობს.\nგთხოვთ დაელოდოთ პროცესის დასრულებას.')
      return
    }
    try {
      // Generate reservation number if not provided
      const reservationNumber = data.reservationNumber || Math.floor(10000 + Math.random() * 90000).toString()
      
      // Save reservation
      const res = await fetch('/api/hotel/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          reservationNumber,
          status: RESERVATION_STATUS.CONFIRMED,
          createdAt: new Date().toISOString(),
          checkedInAt: new Date().toISOString() // Set check-in timestamp
        })
      })
      
      if (res.ok) {
        const newReservation = await res.json()
        
        // ✅ CREATE FOLIO FOR NEW RESERVATION
        const newFolio = createFolioForReservation({
          ...newReservation,
          guestName: data.guestName,
          roomNumber: data.roomNumber,
          roomId: data.roomId,
          totalAmount: data.totalAmount,
          checkIn: data.checkIn,
          checkOut: data.checkOut,
          paymentMethod: data.paymentMethod || 'cash'
        })
        
        ActivityLogger.log('RESERVATION_CREATE', { 
          reservationNumber, 
          room: data.roomNumber, 
          guest: data.guestName,
          checkIn: data.checkIn,
          checkOut: data.checkOut,
          amount: data.totalAmount,
          folioNumber: newFolio?.folioNumber || 'N/A'
        })
        
        // Update room status to OCCUPIED
        await fetch('/api/hotel/rooms/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            roomId: data.roomId, 
            status: ROOM_STATUS.OCCUPIED 
          })
        })
        
        // Reload data
        await loadRooms()
        await loadReservations()
        
        // Close modal
        setShowCheckInModal(false)
        setSelectedRoom(null)
        
        // Show success message with folio info
        alert(`✅ ჯავშანი წარმატებით შეიქმნა!\n\nჯავშნის #: ${reservationNumber}\nფოლიო #: ${newFolio?.folioNumber || 'N/A'}`)
      }
    } catch (error) {
      console.error('Failed to check in guest:', error)
      alert('შეცდომა ჯავშნის შექმნისას')
    }
  }

  async function updateReservation(id: string, updates: any): Promise<void> {
    try {
      const res = await fetch('/api/hotel/reservations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates })
      })
      
      if (res.ok) {
        await loadReservations()
        await loadRooms()
      } else {
        throw new Error('Failed to update reservation')
      }
    } catch (error) {
      console.error('Failed to update reservation:', error)
      throw error
    }
  }

  async function deleteReservation(id: string): Promise<void> {
    // Check if system is locked
    if (SystemLockService.isLocked()) {
      alert('❌ სისტემა დაბლოკილია! დღის დახურვა მიმდინარეობს.')
      throw new Error('System is locked')
    }
    try {
      const res = await fetch(`/api/hotel/reservations/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (res.ok) {
        // Also delete associated folio
        try {
          // Find folio by reservationId
          const foliosRes = await fetch(`/api/hotel/folios?reservationId=${id}`)
          if (foliosRes.ok) {
            const folio = await foliosRes.json()
            if (folio && folio.id) {
              await fetch(`/api/hotel/folios?id=${folio.id}`, { method: 'DELETE' })
              console.log('✅ Folio deleted for reservation:', id)
            }
          }
          // Also remove from localStorage
          const localFolios = JSON.parse(localStorage.getItem('hotelFolios') || '[]')
          const updatedFolios = localFolios.filter((f: any) => f.reservationId !== id)
          localStorage.setItem('hotelFolios', JSON.stringify(updatedFolios))
        } catch (folioErr) {
          console.error('Error deleting folio:', folioErr)
        }
        
        ActivityLogger.log('RESERVATION_DELETE', { reservationId: id })
        await loadReservations()
        await loadRooms()
      } else {
        throw new Error('Failed to delete reservation')
      }
    } catch (error) {
      console.error('Failed to delete reservation:', error)
      throw error
    }
  }

  if (!currentUser) {
    return null // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Global Night Audit Warning Banner */}
      <NightAuditWarningBanner />
      
      {/* Mobile Menu Toggle */}
      <button 
        className="md:hidden fixed bottom-4 right-4 z-50 bg-blue-600 text-white p-3 rounded-full shadow-lg"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? '✕' : '☰'}
      </button>
      
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-40">
        <div className="px-4 md:px-6 py-3 md:py-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setActiveTab('dashboard')}
                className="flex items-center gap-3 text-xl md:text-2xl font-bold hover:text-blue-600 transition"
              >
                {hasDisplayableLogo(hotelInfo?.logo) ? (
                  <img
                    src={hotelInfo!.logo}
                    alt="Logo"
                    className="h-8 w-8 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                ) : (
                  <span className="text-2xl" aria-hidden>🏨</span>
                )}
                {hotelInfo?.name || 'Hotel Dashboard'}
              </button>
              {/* Night Audit button */}
              <button
                onClick={() => {
                  if (canCloseDay) {
                    addTabFromMenu('new-night-audit')
                  } else {
                    alert('❌ არ გაქვთ დღის დახურვის უფლება')
                  }
                }}
                className="px-3 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 ml-2"
              >
                🌙 დღის დახურვა
              </button>
            </div>
            
            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
              {/* User Info Badge */}
              <div className="bg-gray-100 px-3 md:px-4 py-2 rounded-lg flex items-center gap-2 order-3 md:order-1">
                <span className="text-xl md:text-2xl">
                  {currentUser?.role === 'admin' ? '👑' : 
                   currentUser?.role === 'manager' ? '💼' : '👤'}
                </span>
                <div>
                  <div className="text-xs md:text-sm font-medium">{currentUser?.name}</div>
                  <div className="text-xs text-gray-500">{currentUser?.role}</div>
                </div>
              </div>
              
              {/* Quick Menu Dropdown */}
              <div className="flex gap-2 order-1 md:order-2">
                {/* Quick Menu Dropdown */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowQuickMenu(!showQuickMenu)
                    }}
                    className="px-3 md:px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center gap-2 text-sm md:text-base"
                  >
                    ⚡ სწრაფი მენიუ
                    <span className="text-xs">▼</span>
                  </button>
                  
                  {showQuickMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border z-50">
                      {/* Housekeeping - PROFESSIONAL+ */}
                      {hasFeature('housekeeping') ? (
                        <button
                          onClick={() => addTabFromMenu('housekeeping')}
                          className="w-full text-left px-4 py-3 hover:bg-gray-100 flex items-center gap-2"
                        >
                          🧹 დასუფთავება
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setUpgradeFeature({ name: 'Housekeeping', feature: 'housekeeping' })
                            setShowUpgradeModal(true)
                            setShowQuickMenu(false)
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2 text-gray-400"
                        >
                          🧹 დასუფთავება
                          <span className="ml-auto text-xs">🔒</span>
                        </button>
                      )}
                      
                      <button
                        onClick={() => addTabFromMenu('roomgrid')}
                        className="w-full text-left px-4 py-3 hover:bg-gray-100 flex items-center gap-2"
                      >
                        🏨 ოთახები
                      </button>
                      
                      {/* Reports/Analytics - ENTERPRISE */}
                      {canViewReports && (
                        hasFeature('analytics') ? (
                          <button
                            onClick={() => addTabFromMenu('reports')}
                            className="w-full text-left px-4 py-3 hover:bg-gray-100 flex items-center gap-2"
                          >
                            📊 რეპორტები
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setUpgradeFeature({ name: 'ანალიტიკა & რეპორტები', feature: 'analytics' })
                              setShowUpgradeModal(true)
                              setShowQuickMenu(false)
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2 text-gray-400"
                          >
                            📊 რეპორტები
                            <span className="ml-auto text-xs">🔒</span>
                          </button>
                        )
                      )}
                      
                      {/* Cashier - PROFESSIONAL+ (finances) */}
                      {hasFeature('finances') ? (
                        <button
                          onClick={() => addTabFromMenu('cashier')}
                          className="w-full text-left px-4 py-3 hover:bg-gray-100 flex items-center gap-2"
                        >
                          💰 სალარო
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setUpgradeFeature({ name: 'სალარო', feature: 'finances' })
                            setShowUpgradeModal(true)
                            setShowQuickMenu(false)
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2 text-gray-400"
                        >
                          💰 სალარო
                          <span className="ml-auto text-xs">🔒</span>
                        </button>
                      )}
                      
                      {/* Financial Dashboard - PROFESSIONAL+ */}
                      {hasFeature('finances') ? (
                        <button
                          onClick={() => addTabFromMenu('financial')}
                          className="w-full text-left px-4 py-3 hover:bg-gray-100 flex items-center gap-2"
                        >
                          💰 ფინანსური დეშბორდი
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setUpgradeFeature({ name: 'ფინანსური დეშბორდი', feature: 'finances' })
                            setShowUpgradeModal(true)
                            setShowQuickMenu(false)
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2 text-gray-400"
                        >
                          💰 ფინანსური დეშბორდი
                          <span className="ml-auto text-xs">🔒</span>
                        </button>
                      )}
                      
                      <button
                        onClick={() => addTabFromMenu('settings-new')}
                        className="w-full text-left px-4 py-3 hover:bg-gray-100 flex items-center gap-2"
                      >
                        ⚙️ პარამეტრები
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              
              {/* Logout */}
              <button
                onClick={handleLogout}
                className="px-3 md:px-4 py-2 text-red-600 hover:bg-red-50 rounded text-sm md:text-base order-5 md:order-6"
                title="გასვლა"
              >
                ↗
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Statistics - ONLY ONCE */}
      <div className="bg-white px-2 md:px-6 py-3 md:py-4 border-b">
        <div className="grid grid-cols-2 md:grid-cols-7 gap-2 md:gap-4">
          <div className="bg-white rounded-lg p-2 border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">სულ ნომრები</p>
                <p className="text-lg font-bold">{stats.total}</p>
              </div>
              <span className="text-lg">🏨</span>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-2 border border-red-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">დაკავებული</p>
                <p className="text-lg font-bold text-red-600">{stats.occupied}</p>
              </div>
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-2 border border-green-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">თავისუფალი</p>
                <p className="text-lg font-bold text-green-600">{stats.vacant}</p>
              </div>
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            </div>
          </div>
          
          {/* Business Day Card - NEW */}
          {(() => {
            const getBusinessDay = () => {
              const lastAuditDate = typeof window !== 'undefined' ? localStorage.getItem('lastAuditDate') : null
              
              if (lastAuditDate) {
                try {
                  const lastClosed = JSON.parse(lastAuditDate)
                  // Business day is NEXT day after audit
                  return moment(lastClosed).add(1, 'day').format('YYYY-MM-DD')
                } catch {
                  return moment().format('YYYY-MM-DD')
                }
              }
              
              // If no audit, use today
              return moment().format('YYYY-MM-DD')
            }
            
            const businessDay = getBusinessDay()
            
            return (
              <div className="bg-purple-50 rounded-lg p-2 border border-purple-200 shadow-sm col-span-2 md:col-span-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Business Day</p>
                    <p className="text-lg font-bold text-purple-600">{moment(businessDay).format('DD/MM/YYYY')}</p>
                  </div>
                  <span className="text-lg">📅</span>
                </div>
              </div>
            )
          })()}
          
          <div className="bg-white rounded-lg p-2 border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">დასუფთავება</p>
                <p className="text-lg font-bold">{stats.cleaning}</p>
              </div>
              <span className="text-lg">✓</span>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-2 border shadow-sm col-span-2 md:col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">დატვირთულობა</p>
                <p className="text-lg font-bold text-blue-600">{stats.occupancyRate}%</p>
              </div>
              <span className="text-lg">📊</span>
            </div>
          </div>
          
          {/* Today's Arrivals Card */}
          <div className="bg-blue-50 rounded-lg p-2 border border-blue-200 shadow-sm col-span-2 md:col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">დღის ჯავშნები</p>
                <p className="text-lg font-bold text-blue-600">{todayArrivals.count}</p>
              </div>
              <span className="text-lg">📅</span>
            </div>
          </div>
        </div>
      </div>
        
      {/* Dynamic Tabs */}
      <div className="bg-white border-b px-4 md:px-6">
        <div className="flex gap-2 items-center overflow-x-auto">
          {activeTabs.map(tabId => (
            <div
              key={tabId}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 cursor-pointer transition whitespace-nowrap ${
                activeTab === tabId ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <button
                onClick={() => setActiveTab(tabId)}
                className="font-medium"
              >
                {getTabLabel(tabId)}
              </button>
              
              {/* Close button - not for calendar or dashboard */}
              {tabId !== 'calendar' && tabId !== 'dashboard' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    closeTab(tabId)
                  }}
                  className="ml-2 text-gray-400 hover:text-red-600 text-lg font-bold"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content - Full Screen */}
      <div className="flex-1 p-2 md:p-6 overflow-auto">
        {activeTab === 'dashboard' && (
          <div className="min-h-screen bg-gray-50 p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <h1 className="text-3xl font-bold">🏨 Hotel PMS Dashboard</h1>
              
              {/* KPI Alert Badge */}
              <div className="flex-shrink-0">
                <KPIAlerts rooms={rooms} reservations={reservations} />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Quick Actions */}
              <button
                onClick={() => {
                  setActiveTab('calendar')
                  if (!activeTabs.includes('calendar')) {
                    setActiveTabs([...activeTabs, 'calendar'])
                  }
                }}
                className="bg-blue-500 text-white p-6 rounded-lg hover:bg-blue-600 transition-all transform hover:scale-105 shadow-lg text-left"
              >
                <div className="text-4xl mb-2">📅</div>
                <div className="text-xl font-bold">კალენდარი</div>
                <div className="text-sm opacity-75">ჯავშნების ნახვა და მართვა</div>
              </button>
              
              <button
                onClick={() => setShowArrivalsModal(true)}
                className="bg-green-500 text-white p-6 rounded-lg hover:bg-green-600 transition-all transform hover:scale-105 shadow-lg text-left relative"
              >
                <div className="text-4xl mb-2">✅</div>
                <div className="text-xl font-bold">შემოსვლა</div>
                <div className="text-sm opacity-75">სტუმრების მიღება</div>
                {todayArrivalsReservations.length > 0 && (
                  <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {todayArrivalsReservations.length}
                  </span>
                )}
              </button>
              
              <button
                onClick={() => setShowDeparturesModal(true)}
                className="bg-orange-500 text-white p-6 rounded-lg hover:bg-orange-600 transition-all transform hover:scale-105 shadow-lg text-left relative"
              >
                <div className="text-4xl mb-2">📤</div>
                <div className="text-xl font-bold">გასვლა</div>
                <div className="text-sm opacity-75">სტუმრების გაწერა</div>
                {todayDeparturesReservations.length > 0 && (
                  <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {todayDeparturesReservations.length}
                  </span>
                )}
              </button>
              
              <button
                onClick={() => addTabFromMenu('folios')}
                className="bg-purple-500 text-white p-6 rounded-lg hover:bg-purple-600 transition-all transform hover:scale-105 shadow-lg text-left"
              >
                <div className="text-4xl mb-2">💰</div>
                <div className="text-xl font-bold">ანგარიშები</div>
                <div className="text-sm opacity-75">დარიცხვებისა და გადახდების მართვა</div>
              </button>
              
              <button
                onClick={() => addTabFromMenu('financial')}
                className="bg-indigo-500 text-white p-6 rounded-lg hover:bg-indigo-600 transition-all transform hover:scale-105 shadow-lg text-left"
              >
                <div className="text-4xl mb-2">📊</div>
                <div className="text-xl font-bold">ფინანსური ანგარიშები</div>
                <div className="text-sm opacity-75">შემოსავლები და სტატისტიკა</div>
              </button>
              
              <button
                onClick={() => {
                  if (canCloseDay) {
                    addTabFromMenu('new-night-audit')
                  } else {
                    alert('❌ არ გაქვთ დღის დახურვის უფლება')
                  }
                }}
                className="bg-gray-700 text-white p-6 rounded-lg hover:bg-gray-800 transition-all transform hover:scale-105 shadow-lg text-left"
              >
                <div className="text-4xl mb-2">🌙</div>
                <div className="text-xl font-bold">დღის დახურვა</div>
                <div className="text-sm opacity-75">სამუშაო დღის დახურვა</div>
              </button>
              
              {/* Housekeeping - PROFESSIONAL+ */}
              {hasFeature('housekeeping') ? (
                <button
                  onClick={() => addTabFromMenu('housekeeping')}
                  className="bg-teal-500 text-white p-6 rounded-lg hover:bg-teal-600 transition-all transform hover:scale-105 shadow-lg text-left"
                >
                  <div className="text-4xl mb-2">🧹</div>
                  <div className="text-xl font-bold">დასუფთავება</div>
                  <div className="text-sm opacity-75">Housekeeping tasks</div>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setUpgradeFeature({ name: 'Housekeeping', feature: 'housekeeping' })
                    setShowUpgradeModal(true)
                  }}
                  className="bg-gray-300 text-gray-500 p-6 rounded-lg transition-all shadow-lg text-left relative"
                >
                  <div className="text-4xl mb-2 opacity-50">🧹</div>
                  <div className="text-xl font-bold">დასუფთავება</div>
                  <div className="text-sm opacity-75">Housekeeping tasks</div>
                  <div className="absolute top-2 right-2 text-lg">🔒</div>
                </button>
              )}
              
              {/* Reports - ENTERPRISE */}
              {canViewReports && (
                hasFeature('analytics') ? (
                  <button
                    onClick={() => addTabFromMenu('reports')}
                    className="bg-pink-500 text-white p-6 rounded-lg hover:bg-pink-600 transition-all transform hover:scale-105 shadow-lg text-left"
                  >
                    <div className="text-4xl mb-2">📈</div>
                    <div className="text-xl font-bold">რეპორტები</div>
                    <div className="text-sm opacity-75">ანგარიშები და ანალიტიკა</div>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setUpgradeFeature({ name: 'ანალიტიკა & რეპორტები', feature: 'analytics' })
                      setShowUpgradeModal(true)
                    }}
                    className="bg-gray-300 text-gray-500 p-6 rounded-lg transition-all shadow-lg text-left relative"
                  >
                    <div className="text-4xl mb-2 opacity-50">📈</div>
                    <div className="text-xl font-bold">რეპორტები</div>
                    <div className="text-sm opacity-75">ანგარიშები და ანალიტიკა</div>
                    <div className="absolute top-2 right-2 text-lg">🔒</div>
                  </button>
                )
              )}
              
              {/* Cashier Card */}
              {(() => {
                const cashierSettings = typeof window !== 'undefined' 
                  ? JSON.parse(localStorage.getItem('cashierSettings') || '{"cashierEnabled": true}')
                  : { cashierEnabled: true }
                const currentCashierShift = typeof window !== 'undefined'
                  ? JSON.parse(localStorage.getItem('currentCashierShift') || 'null')
                  : null
                const folios = typeof window !== 'undefined'
                  ? JSON.parse(localStorage.getItem('hotelFolios') || '[]')
                  : []
                const manualTx = typeof window !== 'undefined'
                  ? JSON.parse(localStorage.getItem('cashierManualTransactions') || '[]')
                  : []
                
                const businessDate = typeof window !== 'undefined'
                  ? (localStorage.getItem('currentBusinessDate') || moment().format('YYYY-MM-DD'))
                  : moment().format('YYYY-MM-DD')
                
                let cash = 0, card = 0, total = 0
                
                if (currentCashierShift) {
                  folios.forEach((folio: any) => {
                    folio.transactions?.forEach((t: any) => {
                      if (t.credit > 0 && t.date === businessDate) {
                        const amount = t.credit
                        if (t.paymentMethod === 'cash') cash += amount
                        else if (t.paymentMethod === 'card') card += amount
                        total += amount
                      }
                    })
                  })
                  
                  manualTx.forEach((t: any) => {
                    if (t.date === businessDate && t.type === 'income') {
                      const amount = t.amount || 0
                      if (t.method === 'cash') cash += amount
                      else if (t.method === 'card') card += amount
                      total += amount
                    }
                  })
                }
                
                const cashierTotals = { cash, card, total }
                
                if (!cashierSettings?.cashierEnabled) return null
                
                // Plan restriction for finances
                if (!hasFeature('finances')) {
                  return (
                    <button
                      onClick={() => {
                        setUpgradeFeature({ name: 'სალარო', feature: 'finances' })
                        setShowUpgradeModal(true)
                      }}
                      className="bg-gray-300 text-gray-500 p-6 rounded-lg transition-all shadow-lg text-left relative"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-3xl opacity-50">💰</span>
                        <h3 className="text-xl font-bold">სალარო</h3>
                      </div>
                      <div className="text-sm opacity-75">
                        სალაროს მართვა
                      </div>
                      <div className="absolute top-2 right-2 text-lg">🔒</div>
                    </button>
                  )
                }
                
                return (
                  <button
                    onClick={() => addTabFromMenu('cashier')}
                    className="bg-gradient-to-br from-yellow-500 to-orange-600 text-white p-6 rounded-lg hover:from-yellow-600 hover:to-orange-700 transition-all transform hover:scale-105 shadow-lg text-left"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-3xl">💰</span>
                      <h3 className="text-xl font-bold">სალარო</h3>
                    </div>
                    
                    {currentCashierShift ? (
                      <>
                        <div className="text-3xl font-bold mb-2">
                          ₾{cashierTotals.total.toFixed(2)}
                        </div>
                        <div className="text-sm opacity-80">
                          <div>💵 ნაღდი: ₾{cashierTotals.cash.toFixed(2)}</div>
                          <div>💳 ბარათი: ₾{cashierTotals.card.toFixed(2)}</div>
                        </div>
                        <div className="mt-3 text-xs bg-white bg-opacity-20 rounded px-2 py-1 inline-block">
                          🟢 სალარო ღიაა
                        </div>
                      </>
                    ) : (
                      <div className="text-sm opacity-80">
                        <div>🔴 სალარო დახურულია</div>
                        <div className="mt-2">დააჭირეთ გასახსნელად</div>
                      </div>
                    )}
                  </button>
                )
              })()}
            </div>
            
            {/* Statistics Cards */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="text-sm text-gray-600">Total Rooms</div>
                <div className="text-2xl font-bold">{stats.total}</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="text-sm text-gray-600">Occupied</div>
                <div className="text-2xl font-bold text-orange-600">{stats.occupied}</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="text-sm text-gray-600">Available</div>
                <div className="text-2xl font-bold text-green-600">{stats.vacant}</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="text-sm text-gray-600">დატვირთულობა</div>
                <div className="text-2xl font-bold text-blue-600">{stats.occupancyRate}%</div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'calendar' && (
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              <RoomCalendar 
                rooms={rooms.map(room => ({
                  ...room,
                  status: maintenanceRooms.includes(room.id) ? 'MAINTENANCE' : room.status
                }))}
                reservations={reservations}
                onSlotClick={(roomId, date, room) => {
                  setSelectedRoom(room)
                  const checkInDate = moment(date).format('YYYY-MM-DD')
                  setInitialCheckInDate(checkInDate)
                  setShowCheckInModal(true)
                }}
                onReservationUpdate={updateReservation}
                onReservationDelete={deleteReservation}
                loadReservations={loadReservations}
                loadRooms={loadRooms}
              />
            </div>
          </div>
        )}
        
        {activeTab === 'rooms' && (
          <div>
            <h2 className="text-xl font-bold mb-4">🏨 ნომრების მართვა</h2>
            
            {/* Floor 3 */}
            {rooms.filter(r => r.floor === 3).length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-600 mb-3 px-2 py-1 bg-gray-50 rounded">
                  მესამე სართული
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {rooms.filter(r => r.floor === 3).map(room => (
                    <RoomCard 
                      key={room.id} 
                      room={room} 
                      onClick={() => setSelectedRoom(room)}
                      onStatusChange={updateRoomStatus}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {/* Floor 2 */}
            {rooms.filter(r => r.floor === 2).length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-600 mb-3 px-2 py-1 bg-gray-50 rounded">
                  მეორე სართული
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {rooms.filter(r => r.floor === 2).map(room => (
                    <RoomCard 
                      key={room.id} 
                      room={room} 
                      onClick={() => setSelectedRoom(room)}
                      onStatusChange={updateRoomStatus}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {/* Floor 1 */}
            {rooms.filter(r => r.floor === 1).length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-600 mb-3 px-2 py-1 bg-gray-50 rounded">
                  პირველი სართული
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {rooms.filter(r => r.floor === 1).map(room => (
                    <RoomCard 
                      key={room.id} 
                      room={room} 
                      onClick={() => setSelectedRoom(room)}
                      onStatusChange={updateRoomStatus}
                    />
                  ))}
                </div>
              </div>
            )}

            {rooms.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                ოთახები არ მოიძებნა
              </div>
            )}
          </div>
        )}
        
        
        {activeTab === 'folios' && (
          <FolioSystem rooms={rooms} />
        )}
        
        {activeTab === 'housekeeping' && (
          <HousekeepingView rooms={rooms} onRoomStatusUpdate={updateRoomStatus} />
        )}
        
        {activeTab === 'roomgrid' && (
          <RoomGridView 
            rooms={rooms}
            onRoomClick={(room) => {
              console.log('Room clicked:', room)
            }}
            onStatusChange={updateRoomStatus}
            loadRooms={loadRooms}
          />
        )}
        
        {activeTab === 'reports' && canViewReports && (
          <Reports reservations={reservations} rooms={rooms} />
        )}
        
        {activeTab === 'new-night-audit' && (
          <NightAuditModule rooms={rooms} hotelCode={session?.user?.hotelCode || ""} organizationId={session?.user?.organizationId || ""} />
        )}
        
        {activeTab === 'cashier' && (
          <CashierManagement />
        )}
        
        {activeTab === 'financial' && (
          <FinancialDashboard />
        )}
        
        {activeTab === 'settings-new' && (
          <SettingsNew />
        )}
      </div>

      {/* Check-in Modal */}
      {showCheckInModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <CheckInModal 
              room={selectedRoom || undefined}
              rooms={rooms}
              initialCheckIn={initialCheckInDate}
              reservations={reservations}
              onClose={() => {
                setShowCheckInModal(false)
                setSelectedRoom(null)
                setInitialCheckInDate(undefined)
              }}
              onSubmit={checkInGuest}
            />
          </div>
        </div>
      )}

      
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-50"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div 
            className="bg-white w-64 h-full p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg">მენიუ</h3>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="space-y-2">
              <button 
                onClick={() => {
                  setActiveTab('calendar')
                  setMobileMenuOpen(false)
                }} 
                className={`w-full text-left p-3 hover:bg-gray-100 rounded ${
                  activeTab === 'calendar' ? 'bg-blue-50 text-blue-600' : ''
                }`}
              >
                📅 კალენდარი
              </button>
              <button 
                onClick={() => {
                  addTabFromMenu('housekeeping')
                  setMobileMenuOpen(false)
                }} 
                className={`w-full text-left p-3 hover:bg-gray-100 rounded ${
                  activeTab === 'housekeeping' ? 'bg-blue-50 text-blue-600' : ''
                }`}
              >
                🧹 დასუფთავება
              </button>
              <button 
                onClick={() => {
                  addTabFromMenu('roomgrid')
                  setMobileMenuOpen(false)
                }} 
                className={`w-full text-left p-3 hover:bg-gray-100 rounded ${
                  activeTab === 'roomgrid' ? 'bg-blue-50 text-blue-600' : ''
                }`}
              >
                🏨 ოთახები
              </button>
              {canViewReports && (
                <button 
                  onClick={() => {
                    addTabFromMenu('reports')
                    setMobileMenuOpen(false)
                  }} 
                  className={`w-full text-left p-3 hover:bg-gray-100 rounded ${
                    activeTab === 'reports' ? 'bg-blue-50 text-blue-600' : ''
                  }`}
                >
                  📊 რეპორტები
                </button>
              )}
                <button 
                  onClick={() => {
                    addTabFromMenu('cashier')
                    setMobileMenuOpen(false)
                  }} 
                  className={`w-full text-left p-3 hover:bg-gray-100 rounded ${
                    activeTab === 'cashier' ? 'bg-blue-50 text-blue-600' : ''
                  }`}
                >
                  💰 სალარო
                </button>
                <button 
                  onClick={() => {
                    addTabFromMenu('financial')
                    setMobileMenuOpen(false)
                  }} 
                  className={`w-full text-left p-3 hover:bg-gray-100 rounded ${
                    activeTab === 'financial' ? 'bg-blue-50 text-blue-600' : ''
                  }`}
                >
                  💰 ფინანსური დეშბორდი
                </button>
              <div className="border-t pt-2 mt-4">
                <div className="px-3 py-2 text-sm text-gray-600">
                  <div className="font-medium">{currentUser?.name}</div>
                  <div className="text-xs text-gray-500">{currentUser?.role}</div>
                </div>
                <button 
                  onClick={() => {
                    handleLogout()
                    setMobileMenuOpen(false)
                  }} 
                  className="w-full text-left p-3 hover:bg-red-50 text-red-600 rounded"
                >
                  ↗ გასვლა
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* System Lock Overlay - Always at the end */}
      <SystemLockOverlay />
      

      {/* Arrivals Modal - Today's Check-ins */}
      {showArrivalsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="bg-green-500 text-white p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">✅ დღის ჩამოსულები ({businessDay})</h2>
              <button onClick={() => setShowArrivalsModal(false)} className="text-2xl hover:opacity-75">×</button>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {todayArrivalsReservations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">📭</div>
                  <p>დღეს ჩამოსულები არ არის</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayArrivalsReservations.map((res: any) => (
                    <div key={res.id} className="border rounded-lg p-4 hover:bg-gray-50 flex justify-between items-center">
                      <div>
                        <div className="font-bold text-lg">{res.guestName}</div>
                        <div className="text-sm text-gray-600">
                          🏠 ოთახი {res.roomNumber} • 🌙 {res.nights || 1} ღამე • 💰 ₾{res.totalAmount}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Check-out: {moment(res.checkOut).format('DD/MM/YYYY')}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setCheckInReservation(res)
                          setShowArrivalsModal(false)
                          setShowCheckInProcessModal(true)
                        }}
                        className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 font-medium"
                      >
                        ✅ Check-in
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="border-t p-4 bg-gray-50 flex justify-between items-center">
              <span className="text-sm text-gray-600">
                სულ: {todayArrivalsReservations.length} ჯავშანი
              </span>
              <button
                onClick={() => setShowArrivalsModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                დახურვა
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Check-In Process Modal */}
      {showCheckInProcessModal && checkInReservation && (() => {
        const nights = moment(checkInReservation.checkOut).diff(moment(checkInReservation.checkIn), 'days')
        const roomCharge = checkInReservation.totalAmount || (nights * 150)
        
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg w-full max-w-xl">
              {/* Header */}
              <div className="flex justify-between items-center p-4 border-b bg-green-500 text-white rounded-t-lg">
                <div>
                  <h2 className="text-xl font-bold">Check-In Process</h2>
                  <p className="text-green-100">{checkInReservation.guestName} - Room {checkInReservation.roomNumber}</p>
                </div>
                <button 
                  onClick={() => {
                    setShowCheckInProcessModal(false)
                    setCheckInReservation(null)
                  }} 
                  className="text-2xl text-white hover:text-green-200"
                >
                  ×
                </button>
              </div>
              
              {/* Reservation Details */}
              <div className="p-4 border-b">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-500 text-sm">Check-in</p>
                    <p className="font-medium">{moment(checkInReservation.checkIn).format('DD/MM/YYYY')}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Check-out</p>
                    <p className="font-medium">{moment(checkInReservation.checkOut).format('DD/MM/YYYY')}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">ღამეები</p>
                    <p className="font-medium">{nights}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">ოთახის ტიპი</p>
                    <p className="font-medium">{checkInReservation.roomType || 'Standard'}</p>
                  </div>
                </div>
              </div>
              
              {/* Folio Preview */}
              <div className="p-4 border-b">
                <h3 className="font-medium mb-3">📋 Folio შეიქმნება</h3>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex justify-between mb-2">
                    <span>ოთახის ღირებულება ({nights} ღამე)</span>
                    <span>₾{roomCharge.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-2">
                    <span>სულ</span>
                    <span>₾{roomCharge.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              
              {/* Payment Option */}
              <div className="p-4 border-b">
                <h3 className="font-medium mb-3">💳 გადახდა Check-in-ისას</h3>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      id="payNow"
                      className="w-4 h-4"
                    />
                    <span>გადახდა ახლავე</span>
                  </label>
                  <span className="text-gray-500 text-sm">(არჩევითი)</span>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  * გადახდა შესაძლებელია Check-out-ის დროსაც
                </p>
              </div>
              
              {/* Room Status Info */}
              <div className="p-4 border-b">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-blue-700">
                    <strong>ℹ️ Check-in-ის შემდეგ:</strong>
                  </p>
                  <ul className="text-blue-600 text-sm mt-1 list-disc list-inside">
                    <li>ოთახი {checkInReservation.roomNumber} გახდება OCCUPIED</li>
                    <li>შეიქმნება Folio ღამის ღირებულებით</li>
                    <li>სტუმარს შეეძლება დამატებითი სერვისების გამოყენება</li>
                  </ul>
                </div>
              </div>
              
              {/* Actions */}
              <div className="p-4 flex gap-3">
                <button
                  onClick={() => {
                    setShowCheckInProcessModal(false)
                    setCheckInReservation(null)
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  გაუქმება
                </button>
                
                <button
                  onClick={async () => {
                    try {
                      // Before creating folio, ensure checkInReservation has real roomNumber
                      const reservationForFolio = {
                        ...checkInReservation,
                        roomNumber: (() => {
                          if (checkInReservation.roomNumber && checkInReservation.roomNumber.length <= 4 && /^\d+$/.test(checkInReservation.roomNumber)) {
                            return checkInReservation.roomNumber
                          }
                          const room = rooms.find(r => r.id === checkInReservation.roomId || r.id === checkInReservation.roomNumber)
                          return room?.roomNumber || room?.number || checkInReservation.roomNumber
                        })()
                      }
                      
                      // Create folio using the existing function
                      const newFolio = createFolioForReservation(reservationForFolio)
                      
                      // Update reservation status
                      await updateReservation(checkInReservation.id, {
                        status: 'CHECKED_IN',
                        actualCheckIn: new Date().toISOString()
                      })
                      
                      // Update room status
                      await fetch('/api/hotel/rooms/status', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ roomId: checkInReservation.roomNumber, status: 'OCCUPIED' })
                      })
                      
                      alert(`✅ ${checkInReservation.guestName} - Check-in წარმატებით დასრულდა!\n\nFolio #${newFolio?.folioNumber || 'N/A'} შეიქმნა.`)
                      
                      setShowCheckInProcessModal(false)
                      setCheckInReservation(null)
                      await loadReservations()
                      await loadRooms()
                    } catch (error) {
                      console.error('Check-in error:', error)
                      alert('შეცდომა Check-in-ისას')
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium"
                >
                  ✅ Check-in
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Departures Modal - Today's Check-outs */}
      {showDeparturesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="bg-orange-500 text-white p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">📤 დღის გამსვლელები ({businessDay})</h2>
              <button onClick={() => setShowDeparturesModal(false)} className="text-2xl hover:opacity-75">×</button>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {todayDeparturesReservations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">📭</div>
                  <p>დღეს გამსვლელები არ არის</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayDeparturesReservations.map((res: any) => {
                    // Get folio balance
                    const folios = typeof window !== 'undefined' 
                      ? JSON.parse(localStorage.getItem('hotelFolios') || '[]')
                      : []
                    const folio = folios.find((f: any) => f.reservationId === res.id)
                    const balance = folio?.balance || 0
                    
                    return (
                      <div key={res.id} className="border rounded-lg p-4 hover:bg-gray-50 flex justify-between items-center">
                        <div>
                          <div className="font-bold text-lg">{res.guestName}</div>
                          <div className="text-sm text-gray-600">
                            🏠 ოთახი {res.roomNumber} • 🌙 {res.nights || 1} ღამე
                          </div>
                          <div className={`text-sm mt-1 ${balance > 0 ? 'text-red-600 font-medium' : 'text-green-600'}`}>
                            {balance > 0 ? `₾${balance.toFixed(2)} გადასახდელი` : '✅ გადახდილია'}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setCheckOutReservation(res)
                            setShowDeparturesModal(false)
                            setShowCheckOutModal(true)
                          }}
                          className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 font-medium"
                        >
                          📤 Check-out
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            
            <div className="border-t p-4 bg-gray-50 flex justify-between items-center">
              <span className="text-sm text-gray-600">
                სულ: {todayDeparturesReservations.length} გამსვლელი
              </span>
              <button
                onClick={() => setShowDeparturesModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                დახურვა
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Check-Out Modal - Same as Calendar */}
      {showCheckOutModal && checkOutReservation && (
        <CheckOutModal
          reservation={checkOutReservation}
          onClose={() => {
            setShowCheckOutModal(false)
            setCheckOutReservation(null)
          }}
          onCheckOut={async () => {
            setShowCheckOutModal(false)
            setCheckOutReservation(null)
            await loadReservations()
            await loadRooms()
          }}
          onReservationUpdate={updateReservation}
        />
      )}

      {/* Upgrade Modal for Plan Restrictions */}
      {showUpgradeModal && upgradeFeature && (
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => {
            setShowUpgradeModal(false)
            setUpgradeFeature(null)
          }}
          feature={upgradeFeature.name}
          requiredPlan={getRequiredPlan(upgradeFeature.feature)}
          currentPlan={plan}
        />
      )}
    </div>
  )
}

// Room Card Component
function RoomCard({ room, onClick, onStatusChange }: {
  room: Room
  onClick: () => void
  onStatusChange: (roomId: string, status: string) => void
}) {
  const statusConfig: Record<string, { color: string; label: string; icon: string }> = {
    'VACANT': { color: 'bg-green-100 border-green-400 text-green-800', label: 'თავისუფალი', icon: '🟢' },
    'OCCUPIED': { color: 'bg-red-100 border-red-400 text-red-800', label: 'დაკავებული', icon: '🔴' },
    'CLEANING': { color: 'bg-yellow-100 border-yellow-400 text-yellow-800', label: 'დასუფთავება', icon: '🧹' },
    'MAINTENANCE': { color: 'bg-gray-100 border-gray-400 text-gray-800', label: 'რემონტი', icon: '🔧' }
  }

  const config = statusConfig[room.status] || statusConfig['VACANT']

  return (
    <div 
      className={`border-2 rounded-lg p-3 cursor-pointer transition hover:shadow-md ${config.color}`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-2">
        <span className="font-bold text-lg">{room.roomNumber}</span>
        <span className="text-lg">{config.icon}</span>
      </div>
      <div className="text-sm font-medium mb-1">
        {room.type || room.roomType || 'Standard'}
      </div>
      <div className="text-xs font-medium mb-2">
        {config.label}
      </div>
      {/* <div className="text-xs text-gray-600">
        ₾{room.basePrice}/ღამე
      </div> */}
      
      {room.status === 'VACANT' && (
        <button 
          onClick={(e) => {
            e.stopPropagation()
            onStatusChange(room.id, 'CLEANING')
          }}
          className="w-full mt-2 bg-yellow-500 text-white text-xs py-1 rounded hover:bg-yellow-600 transition-colors"
        >
          დასუფთავება
        </button>
      )}
      
      {room.status === 'CLEANING' && (
        <button 
          onClick={(e) => {
            e.stopPropagation()
            onStatusChange(room.id, 'VACANT')
          }}
          className="w-full mt-2 bg-green-500 text-white text-xs py-1 rounded hover:bg-green-600 transition-colors"
        >
          დასრულებულია
        </button>
      )}
    </div>
  )
}