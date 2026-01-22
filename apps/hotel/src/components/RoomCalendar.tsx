'use client'

import React, { useState, useMemo, useRef, useEffect } from 'react'
import moment from 'moment'
import PaymentModal from './PaymentModal'
import EnhancedPaymentModal from './EnhancedPaymentModal'
import EditReservationModal from './EditReservationModal'
import CheckOutModal from './CheckOutModal'
import FolioViewModal from './FolioViewModal'
import ExtraChargesPanel from './ExtraChargesPanel'
import PaymentHistory from './PaymentHistory'
import Invoice from './Invoice'
import { ActivityLogger } from '../lib/activityLogger'
import { validateReservationDates, isClosedDay as isClosedDayHelper, getBusinessDay as getBusinessDayHelper } from '../utils/dateValidation'
import { sanitizeLogo } from '@/lib/logo'

interface RoomCalendarProps {
  rooms: any[]
  reservations: any[]
  onSlotClick?: (roomId: string, date: Date, room: any) => void
  onReservationUpdate?: (id: string, updates: any) => Promise<void>
  onReservationDelete?: (id: string) => Promise<void>
  loadReservations?: () => void
  loadRooms?: () => void
}

export default function RoomCalendar({ 
  rooms, 
  reservations, 
  onSlotClick,
  onReservationUpdate,
  onReservationDelete,
  loadReservations,
  loadRooms
}: RoomCalendarProps) {
  // Start with current date (November 2025)
  const [currentDate, setCurrentDate] = useState(() => {
    // Use actual current date
    return new Date()
  })
  const [view, setView] = useState<'week' | 'month'>('week')
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items?: Array<{ label: string; action: () => void }> } | null>(null)
  const [selectedReservation, setSelectedReservation] = useState<any>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [viewOnlyReservation, setViewOnlyReservation] = useState<any>(null)
  const [showViewOnlyModal, setShowViewOnlyModal] = useState(false)
  const [showNoShowModal, setShowNoShowModal] = useState<any>(null)
  const [showCheckOutModal, setShowCheckOutModal] = useState(false)
  const [showCheckInModal, setShowCheckInModal] = useState(false)
  const [showFolioModal, setShowFolioModal] = useState(false)
  const [showExtraChargesModal, setShowExtraChargesModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [refundAmount, setRefundAmount] = useState(0)
  const [isProcessingCancel, setIsProcessingCancel] = useState(false)
  const [blockedDates, setBlockedDates] = useState<any>({})
  const [maintenanceRooms, setMaintenanceRooms] = useState<string[]>([])
  const [folioUpdateKey, setFolioUpdateKey] = useState(0) // Force re-render when folio updates
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [collapsedFloors, setCollapsedFloors] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRoomType, setSelectedRoomType] = useState<string>('all')
  const [showOccupancy, setShowOccupancy] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  
  // Room rates from Settings
  const [roomRates, setRoomRates] = useState<{ id: string; type: string; weekday: number; weekend: number }[]>([])
  
  // Floors from Settings  
  const [settingsFloors, setSettingsFloors] = useState<{ id: string; number: number; name: string; active: boolean }[]>([])
  
  // Pricing data for tooltips
  const [seasons, setSeasons] = useState<any[]>([])
  const [weekdayPrices, setWeekdayPrices] = useState<any[]>([])
  const [specialDates, setSpecialDates] = useState<any[]>([])
  
  // Tooltip state
  const [priceTooltip, setPriceTooltip] = useState<{
    visible: boolean
    x: number
    y: number
    roomType: string
    date: string
    basePrice: number
    finalPrice: number
    modifiers: { icon: string; label: string; value: string }[]
  } | null>(null)
  
  // Calendar settings from Settings page
  const [calendarSettings, setCalendarSettings] = useState({
    enableDragDrop: true,
    enableResize: true,
    enableQuickReservation: true,
    enableContextMenu: true,
    showFloors: true,
    showPrices: true,
    showGuestCount: true,
    showRoomNumbers: true,
    defaultView: 'week' as 'week' | 'month',
    weekStartsOn: 1 as 0 | 1,
    colorScheme: 'status' as 'status' | 'roomType' | 'source',
    showPriceTooltip: true,
    showSeasonColors: true
  })
  
  // Drag & Drop and Resize state
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState<'left' | 'right' | null>(null)
  const [draggedReservation, setDraggedReservation] = useState<any>(null)
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 })
  const [dragCurrentPos, setDragCurrentPos] = useState({ x: 0, y: 0 })
  const [dropTarget, setDropTarget] = useState<{ roomId: string; date: string } | null>(null)
  const [resizePreview, setResizePreview] = useState<{ checkIn?: string; checkOut?: string } | null>(null)
  const calendarRef = useRef<HTMLDivElement>(null)
  const dragThreshold = 5 // Minimum pixels to move before drag starts
  
  // Refs to avoid stale closure issues in event handlers
  const isDraggingRef = useRef(false)
  const isResizingRef = useRef<'left' | 'right' | null>(null)
  const draggedReservationRef = useRef<any>(null)
  const dropTargetRef = useRef<{ roomId: string; date: string } | null>(null)
  const resizePreviewRef = useRef<{ checkIn?: string; checkOut?: string } | null>(null)
  
  // Load blocked dates from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('blockedDates')
    if (saved) {
      try {
        setBlockedDates(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to load blocked dates:', e)
      }
    }
  }, [])
  
  // Load maintenance rooms from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('maintenanceRooms')
    if (saved) {
      try {
        setMaintenanceRooms(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to load maintenance rooms:', e)
      }
    }
  }, [])
  
  // Load calendar settings from Settings page
  useEffect(() => {
    const saved = localStorage.getItem('calendarSettings')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setCalendarSettings(prev => ({ ...prev, ...parsed }))
        // Apply default view from settings
        if (parsed.defaultView) {
          setView(parsed.defaultView)
        }
      } catch (e) {
        console.error('Failed to load calendar settings:', e)
      }
    }
  }, [])
  
  // Load room rates from Settings
  useEffect(() => {
    const loadRates = () => {
      const saved = localStorage.getItem('roomRates')
      if (saved) {
        try {
          setRoomRates(JSON.parse(saved))
        } catch (e) {
          console.error('Error loading room rates:', e)
        }
      }
    }
    loadRates()
    
    // Listen for storage changes (when Settings updates rates)
    window.addEventListener('storage', loadRates)
    return () => window.removeEventListener('storage', loadRates)
  }, [])
  
  // Load pricing data for tooltips
  useEffect(() => {
    const loadPricingData = () => {
      // Seasons
      const savedSeasons = localStorage.getItem('hotelSeasons')
      if (savedSeasons) {
        try {
          setSeasons(JSON.parse(savedSeasons))
        } catch (e) {}
      }
      
      // Weekday Prices
      const savedWeekdays = localStorage.getItem('hotelWeekdayPrices')
      if (savedWeekdays) {
        try {
          const parsed = JSON.parse(savedWeekdays)
          setWeekdayPrices(Array.isArray(parsed) ? parsed : (parsed.all || []))
        } catch (e) {}
      }
      
      // Special Dates
      const savedSpecial = localStorage.getItem('hotelSpecialDates')
      if (savedSpecial) {
        try {
          setSpecialDates(JSON.parse(savedSpecial) || [])
        } catch (e) {}
      }
    }
    
    loadPricingData()
  }, [])
  
  // Load floors from Settings
  useEffect(() => {
    const loadFloors = () => {
      const saved = localStorage.getItem('hotelFloors')
      if (saved) {
        try {
          const floors = JSON.parse(saved)
          setSettingsFloors(floors.filter((f: any) => f.active))
        } catch (e) {
          console.error('Error loading floors:', e)
        }
      }
    }
    loadFloors()
    
    window.addEventListener('storage', loadFloors)
    return () => window.removeEventListener('storage', loadFloors)
  }, [])
  
  // Listen for folio updates to refresh UI
  useEffect(() => {
    const handleFolioUpdate = (event: CustomEvent) => {
      // Force re-render by updating folioUpdateKey
      // This will cause renderReservationBar to re-read folio from localStorage
      if (event.detail?.reservationId) {
        setFolioUpdateKey(prev => prev + 1)
        // Also trigger reservations reload if available
        if (loadReservations) {
          loadReservations()
        }
      }
    }
    
    window.addEventListener('folioUpdated', handleFolioUpdate as EventListener)
    
    return () => {
      window.removeEventListener('folioUpdated', handleFolioUpdate as EventListener)
    }
  }, [loadReservations])
  
  // Close date picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (showDatePicker && !target.closest('.date-picker-container')) {
        setShowDatePicker(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showDatePicker])
  
  // Check for pending checkout from departures modal
  useEffect(() => {
    const pendingCheckout = localStorage.getItem('pendingCheckout')
    if (pendingCheckout) {
      try {
        const res = JSON.parse(pendingCheckout)
        localStorage.removeItem('pendingCheckout')
        
        // Find the reservation and open checkout modal
        const reservation = reservations.find((r: any) => r.id === res.id)
        if (reservation) {
          setSelectedReservation(reservation)
          setShowCheckOutModal(true)
        }
      } catch (e) {
        console.error('Error parsing pending checkout:', e)
      }
    }
  }, [reservations])
  
  // Get business day (last closed audit + 1) - use unified helper
  const getBusinessDay = () => {
    return getBusinessDayHelper()
  }
  
  // Check if date can be booked
  const canBookOnDate = (date: Date | string) => {
    const dateStr = typeof date === 'string' ? date : moment(date).format('YYYY-MM-DD')
    // Check both lastAuditDate and lastNightAuditDate (prefer lastNightAuditDate)
    const lastNightAuditDate = typeof window !== 'undefined' ? localStorage.getItem('lastNightAuditDate') : null
    const lastAuditDate = typeof window !== 'undefined' ? localStorage.getItem('lastAuditDate') : null
    
    // Prefer lastNightAuditDate (more accurate)
    let lastClosed: string | null = null
    
    if (lastNightAuditDate) {
      // lastNightAuditDate is stored as plain string (YYYY-MM-DD)
      lastClosed = lastNightAuditDate
    } else if (lastAuditDate) {
      // lastAuditDate is stored as JSON stringified
      try {
        lastClosed = JSON.parse(lastAuditDate)
      } catch {
        // If parsing fails, try as plain string
        lastClosed = lastAuditDate
      }
    }
    
    if (!lastClosed) {
      // No audit yet - can book from today
      return moment(dateStr).isSameOrAfter(TODAY, 'day')
    }
    
    // Business day is the day after last audit
    const businessDay = moment(lastClosed).add(1, 'day')
    
    // Can book from business day onwards
    return moment(dateStr).isSameOrAfter(businessDay, 'day')
  }
  
  // Alias for backward compatibility
  const isDateBookable = canBookOnDate
  
  // Get current actual date (November 26, 2025)
  const TODAY = moment() // Current date (dynamic)
  
  // Get today's date without time
  const today = useMemo(() => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    return date
  }, [])
  
  // Generate dates for view
  const dates = useMemo(() => {
    const result: Date[] = []
    const startDate = new Date(currentDate)
    
    if (view === 'week') {
      // Get start of week (Monday)
      const day = startDate.getDay()
      const diff = startDate.getDate() - day + (day === 0 ? -6 : 1)
      startDate.setDate(diff)
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate)
        date.setDate(startDate.getDate() + i)
        result.push(date)
      }
    } else {
      // Month view - show 30 days
      for (let i = 0; i < 30; i++) {
        const date = new Date(startDate)
        date.setDate(startDate.getDate() + i)
        result.push(date)
      }
    }
    
    return result
  }, [currentDate, view])
  
  // Calculate price from roomRates based on room type and day
  const calculatePricePerNight = (room: any, date: string): number => {
    if (!room) return 150 // Default
    
    // Find room type - check both 'type' and 'roomType' for compatibility
    const roomTypeName = room.type || room.roomType || 'Standard'
    const rate = roomRates.find(r => r.type === roomTypeName)
    
    if (!rate) {
      // Fallback to room basePrice or default
      return room.basePrice || 150
    }
    
    // Check if weekend (Friday=5, Saturday=6, Sunday=0)
    const dayOfWeek = moment(date).day()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6
    
    return isWeekend ? rate.weekend : rate.weekday
  }
  
  // Calculate total amount for date range
  const calculateTotalAmount = (room: any, checkIn: string, checkOut: string): number => {
    let total = 0
    let currentDate = moment(checkIn)
    const endDate = moment(checkOut)
    
    while (currentDate.isBefore(endDate)) {
      total += calculatePricePerNight(room, currentDate.format('YYYY-MM-DD'))
      currentDate.add(1, 'day')
    }
    
    return total
  }
  
  // Get floor for room - from Settings or from room number
  const getFloor = (room: any): string => {
    // First try to get from room's floor property (set in Settings)
    if (room.floor) {
      return String(room.floor)
    }
    
    // Fallback: extract from room number (e.g., 101 -> 1, 201 -> 2)
    const roomNumber = room.roomNumber || ''
    if (!roomNumber) return '1'
    
    const num = roomNumber.toString()
    if (num.length >= 3) {
      return num[0] // First digit is floor
    }
    return '1' // Default floor
  }
  
  // Get floor name from Settings
  const getFloorName = (floorNumber: string): string => {
    const floor = settingsFloors.find(f => String(f.number) === floorNumber)
    return floor?.name || `სართული ${floorNumber}`
  }
  
  // Extract floor from room number (e.g., 101 -> 1, 201 -> 2) - DEPRECATED, use getFloor(room) instead
  const getFloorFromNumber = (roomNumber: string): string => {
    if (!roomNumber) return '0'
    const num = roomNumber.toString()
    if (num.length >= 3) {
      return num[0] // First digit is floor
    }
    return '1' // Default floor
  }
  
  // Group rooms by floor
  // Filter rooms based on search, room type, and occupancy
  const filteredRooms = useMemo(() => {
    let result = rooms
    
    // Search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim()
      
      // Get reservations that match search
      const matchingReservationRoomIds = reservations
        .filter((r: any) => {
          const guestName = (r.guestName || '').toLowerCase()
          const roomNumber = String(r.roomNumber || '').toLowerCase()
          const resId = String(r.id || '').toLowerCase()
          const phone = (r.phone || r.guestPhone || '').toLowerCase()
          const email = (r.email || r.guestEmail || '').toLowerCase()
          
          return guestName.includes(search) ||
                 roomNumber.includes(search) ||
                 resId.includes(search) ||
                 phone.includes(search) ||
                 email.includes(search)
        })
        .map((r: any) => r.roomId || r.roomNumber)
      
      // Filter rooms that have matching reservations OR room number matches
      result = result.filter((room: any) => {
        const roomNum = String(room.roomNumber || '').toLowerCase()
        const roomId = room.id
        const roomType = (room.roomType || room.type || '').toLowerCase()
        
        return roomNum.includes(search) ||
               roomType.includes(search) ||
               matchingReservationRoomIds.includes(roomId) ||
               matchingReservationRoomIds.includes(room.roomNumber)
      })
    }
    
    // Room type filter
    if (selectedRoomType !== 'all') {
      result = result.filter((room: any) => {
        const roomType = room.type || room.roomType || 'Standard'
        return roomType === selectedRoomType
      })
    }
    
    // Occupancy filter - show only rooms with current reservations
    if (showOccupancy) {
      const today = moment().format('YYYY-MM-DD')
      
      // Get rooms that have active reservations today
      const occupiedRoomIds = reservations
        .filter((r: any) => {
          const checkIn = (r.checkInDate || r.checkIn || '').split('T')[0]
          const checkOut = (r.checkOutDate || r.checkOut || '').split('T')[0]
          const isActive = r.status === 'CHECKED_IN' || r.status === 'CONFIRMED' || r.status === 'OCCUPIED'
          const isToday = checkIn <= today && checkOut > today
          
          return isActive && isToday
        })
        .map((r: any) => r.roomId || r.roomNumber)
      
      result = result.filter((room: any) => {
        return room.status === 'OCCUPIED' ||
               occupiedRoomIds.includes(room.id) ||
               occupiedRoomIds.includes(room.roomNumber)
      })
    }
    
    return result
  }, [rooms, reservations, searchTerm, selectedRoomType, showOccupancy])
  
  const roomsByFloor = useMemo(() => {
    const grouped: { [floor: string]: any[] } = {}
    
    filteredRooms.forEach(room => {
      const floor = getFloor(room)
      if (!grouped[floor]) {
        grouped[floor] = []
      }
      grouped[floor].push(room)
    })
    
    // Sort floors - use settingsFloors order if available
    let sortedFloors: string[]
    
    if (settingsFloors.length > 0) {
      // Use Settings floor order
      sortedFloors = settingsFloors
        .sort((a, b) => a.number - b.number)
        .map(f => String(f.number))
        .filter(f => grouped[f])
    } else {
      // Fallback to numeric sort
      sortedFloors = Object.keys(grouped).sort((a, b) => parseInt(a) - parseInt(b))
    }
    
    const result: { floor: string; floorName: string; rooms: any[] }[] = []
    
    sortedFloors.forEach(floor => {
      if (grouped[floor]) {
        result.push({
          floor,
          floorName: getFloorName(floor),
          rooms: grouped[floor].sort((a, b) => 
            parseInt(a.roomNumber) - parseInt(b.roomNumber)
          )
        })
      }
    })
    
    return result
  }, [filteredRooms, settingsFloors])
  
  // Toggle floor collapse
  const toggleFloor = (floor: string) => {
    setCollapsedFloors(prev => 
      prev.includes(floor) 
        ? prev.filter(f => f !== floor)
        : [...prev, floor]
    )
  }
  
  // Check if room is available on specific date
  const isRoomAvailable = (roomId: string, date: Date): boolean => {
    const dateStr = moment(date).format('YYYY-MM-DD')
    
    // Check if any reservation exists for this room on this date
    const hasReservation = reservations.some(res => {
      const checkIn = moment(res.checkIn).format('YYYY-MM-DD')
      const checkOut = moment(res.checkOut).format('YYYY-MM-DD')
      
      return res.roomId === roomId && 
             dateStr >= checkIn && 
             dateStr < checkOut &&
             res.status !== 'CANCELLED'
    })
    
    return !hasReservation
  }
  
  // Check if date is valid for new reservation
  const isValidReservationDate = (date: Date): boolean => {
    // Use business day logic instead of "today"
    // If date is bookable (after business day), it's valid
    return canBookOnDate(date)
  }
  
  // Check if date is a closed day (before or on last audit date, or in the past if no audit)
  const isClosedDay = (date: Date | string): boolean => {
    // Use unified helper
    return isClosedDayHelper(date)
  }
  
  // Keep old implementation for reference (will be removed)
  const isClosedDay_OLD = (date: Date | string): boolean => {
    const dateStr = typeof date === 'string' ? date : moment(date).format('YYYY-MM-DD')
    // Check both lastAuditDate and lastNightAuditDate (prefer lastNightAuditDate)
    const lastNightAuditDate = typeof window !== 'undefined' ? localStorage.getItem('lastNightAuditDate') : null
    const lastAuditDate = typeof window !== 'undefined' ? localStorage.getItem('lastAuditDate') : null
    
    // Prefer lastNightAuditDate (more accurate)
    let lastClosed: string | null = null
    
    if (lastNightAuditDate) {
      // lastNightAuditDate is stored as plain string (YYYY-MM-DD)
      lastClosed = lastNightAuditDate
    } else if (lastAuditDate) {
      // lastAuditDate is stored as JSON stringified
      try {
        lastClosed = JSON.parse(lastAuditDate)
      } catch {
        // If parsing fails, try as plain string
        lastClosed = lastAuditDate
      }
    }
    
    if (!lastClosed) {
      // No audit yet - only past dates (before today) are closed
      return moment(dateStr).isBefore(TODAY, 'day')
    }
    
    // Only dates on or before last audit are closed
    return moment(dateStr).isSameOrBefore(lastClosed, 'day')
  }
  
  // Check if room is in maintenance
  const isRoomInMaintenance = (roomId: string) => {
    return maintenanceRooms.includes(roomId)
  }
  
  // Visual indication for closed days
  const getCellStyle = (room: any, date: Date) => {
    const dateStr = moment(date).format('YYYY-MM-DD')
    const key = `${room.id}_${dateStr}`
    // Check both lastAuditDate and lastNightAuditDate (prefer lastNightAuditDate)
    const lastNightAuditDate = typeof window !== 'undefined' ? localStorage.getItem('lastNightAuditDate') : null
    const lastAuditDate = typeof window !== 'undefined' ? localStorage.getItem('lastAuditDate') : null
    
    // Prefer lastNightAuditDate (more accurate)
    let lastClosed: string | null = null
    
    if (lastNightAuditDate) {
      lastClosed = lastNightAuditDate
    } else if (lastAuditDate) {
      try {
        lastClosed = JSON.parse(lastAuditDate)
      } catch {
        lastClosed = lastAuditDate
      }
    }
    
    if (lastClosed) {
      // Days before and including last audit are closed
      if (moment(dateStr).isSameOrBefore(lastClosed, 'day')) {
        return 'bg-gray-100 cursor-not-allowed opacity-50'
      }
    } else {
      // No audit yet - only past dates (before today) are closed
      if (moment(dateStr).isBefore(TODAY, 'day')) {
        return 'bg-gray-100 cursor-not-allowed opacity-50'
      }
    }
    
    // If room is in maintenance - all dates red
    if (room.status === 'MAINTENANCE') {
      return 'bg-red-100 cursor-not-allowed'
    }
    
    // If specific date is blocked
    if (blockedDates[key]) {
      return 'bg-red-100 cursor-not-allowed'
    }
    
    // Check for reservation
    const reservation = getReservation(room.id, date)
    if (reservation) {
      return getStatusColor(reservation.status)
    }
    
    // Future dates or business days
    return 'bg-white hover:bg-blue-50 cursor-pointer'
  }
  
  // Get cell className for background cells
  const getCellClassName = (date: Date) => {
    const dateStr = moment(date).format('YYYY-MM-DD')
    // Check both lastAuditDate and lastNightAuditDate (prefer lastNightAuditDate)
    const lastNightAuditDate = typeof window !== 'undefined' ? localStorage.getItem('lastNightAuditDate') : null
    const lastAuditDate = typeof window !== 'undefined' ? localStorage.getItem('lastAuditDate') : null
    
    // Prefer lastNightAuditDate (more accurate)
    let lastClosed: string | null = null
    
    if (lastNightAuditDate) {
      lastClosed = lastNightAuditDate
    } else if (lastAuditDate) {
      try {
        lastClosed = JSON.parse(lastAuditDate)
      } catch {
        lastClosed = lastAuditDate
      }
    }
    
    if (lastClosed) {
      // Days before and including last audit are closed
      if (moment(dateStr).isSameOrBefore(lastClosed, 'day')) {
        return 'bg-gray-100 cursor-not-allowed opacity-50'
      }
    } else {
      // No audit yet - only past dates (before today) are closed
      if (moment(dateStr).isBefore(TODAY, 'day')) {
        return 'bg-gray-100 cursor-not-allowed opacity-50'
      }
    }
    
    // Future dates or business days
    return 'hover:bg-blue-50 cursor-pointer'
  }
  
  // Handle empty slot click
  const handleSlotClick = (roomId: string, date: Date) => {
    const room = rooms.find(r => r.id === roomId)
    const dateStr = moment(date).format('YYYY-MM-DD')
    const key = `${roomId}_${dateStr}`
    
    // Check both lastAuditDate and lastNightAuditDate (prefer lastNightAuditDate)
    const lastNightAuditDate = typeof window !== 'undefined' ? localStorage.getItem('lastNightAuditDate') : null
    const lastAuditDate = typeof window !== 'undefined' ? localStorage.getItem('lastAuditDate') : null
    
    let canBook = true
    let blockReason = ''
    
    // Prefer lastNightAuditDate (more accurate)
    let lastClosed: string | null = null
    
    if (lastNightAuditDate) {
      lastClosed = lastNightAuditDate
    } else if (lastAuditDate) {
      try {
        lastClosed = JSON.parse(lastAuditDate)
      } catch {
        lastClosed = lastAuditDate
      }
    }
    
    // Check if date is after business day
    if (lastClosed) {
      // Can't book on or before last closed date
      if (moment(dateStr).isSameOrBefore(lastClosed, 'day')) {
        canBook = false
        blockReason = `დახურული დღე (Night Audit: ${moment(lastClosed).format('DD/MM/YYYY')})`
      }
    }
    
    // Check for existing reservation
    const hasReservation = reservations.some((r: any) => {
      if (r.roomId !== roomId) return false
      if (r.status === 'CANCELLED' || r.status === 'NO_SHOW') return false
      
      const resCheckIn = moment(r.checkIn).format('YYYY-MM-DD')
      const resCheckOut = moment(r.checkOut).format('YYYY-MM-DD')
      
      // Date is occupied if: checkIn <= date < checkOut
      const isOccupied = dateStr >= resCheckIn && dateStr < resCheckOut
      return isOccupied
    })
    
    if (hasReservation) {
      canBook = false
      blockReason = 'უკვე დაკავებულია'
    }
    
    if (!canBook) {
      if (blockReason) {
        alert(`❌ ${blockReason}`)
      }
      return
    }
    
    // Prevent booking if maintenance or blocked
    if (isRoomInMaintenance(roomId)) {
      alert('❌ ეს ოთახი რემონტშია და დაბლოკილია!')
      return
    }
    
    if (room?.status === 'MAINTENANCE') {
      alert('❌ ეს ოთახი რემონტშია და დაბლოკილია!')
      return
    }
    
    if (blockedDates[key]) {
      alert('❌ ეს თარიღი დაბლოკილია!')
      return
    }
    
    // Validation
    if (!isValidReservationDate(date)) {
      alert('❌ ვერ შექმნით ჯავშანს ამ თარიღზე!')
      return
    }
    
    if (!isRoomAvailable(roomId, date)) {
      alert('❌ ოთახი დაკავებულია ამ თარიღზე!')
      return
    }
    
    // Check if quick reservation is enabled in settings
    if (!calendarSettings.enableQuickReservation) {
      return
    }
    
    // Date is valid - open modal
    // Make sure onSlotClick is called
    if (onSlotClick) {
      onSlotClick(roomId, date, room)
    } else {
      console.error('onSlotClick function not provided!')
    }
  }
  
  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null)
      }
    }
    
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null)
      }
    }
    
    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscKey)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
        document.removeEventListener('keydown', handleEscKey)
      }
    }
  }, [contextMenu])
  
  // Get reservation for room/date
  const getReservation = (roomId: string, date: Date) => {
    const dateStr = moment(date).format('YYYY-MM-DD')
    
    return reservations.find(res => {
      const checkIn = moment(res.checkIn).format('YYYY-MM-DD')
      const checkOut = moment(res.checkOut).format('YYYY-MM-DD')
      
      return res.roomId === roomId && 
             dateStr >= checkIn && 
             dateStr < checkOut
    })
  }
  
  // Block/unblock functions
  const blockDate = (roomId: string, date: Date) => {
    const dateStr = moment(date).format('YYYY-MM-DD')
    const key = `${roomId}_${dateStr}`
    const newBlocked = { ...blockedDates, [key]: true }
    setBlockedDates(newBlocked)
    localStorage.setItem('blockedDates', JSON.stringify(newBlocked))
    setContextMenu(null)
  }
  
  const unblockDate = (roomId: string, date: Date) => {
    const dateStr = moment(date).format('YYYY-MM-DD')
    const key = `${roomId}_${dateStr}`
    const newBlocked = { ...blockedDates }
    delete newBlocked[key]
    setBlockedDates(newBlocked)
    localStorage.setItem('blockedDates', JSON.stringify(newBlocked))
    setContextMenu(null)
  }
  
  // Calculate price for tooltip
  const calculatePriceForCell = (date: string, room: any): {
    basePrice: number
    finalPrice: number
    modifiers: { icon: string; label: string; value: string }[]
  } => {
    const roomTypeName = room.type || room.roomType || 'Standard'
    const rate = roomRates.find(r => r.type === roomTypeName)
    
    // Base price (weekday/weekend)
    const dayOfWeek = moment(date).day()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6
    let basePrice = rate ? (isWeekend ? rate.weekend : rate.weekday) : (room.basePrice || 100)
    let finalPrice = basePrice
    const modifiers: { icon: string; label: string; value: string }[] = []
    
    // Check special date (highest priority)
    const formattedDate = moment(date).format('YYYY-MM-DD')
    const special = specialDates.find(sd => sd.active && sd.date === formattedDate)
    if (special) {
      // Check room type restriction
      if (special.roomTypes && special.roomTypes.length > 0) {
        if (!special.roomTypes.includes(roomTypeName)) {
          return { basePrice, finalPrice, modifiers }
        }
      }
      const adj = basePrice * (special.priceModifier / 100)
      finalPrice = basePrice + adj
      modifiers.push({
        icon: '🎉',
        label: special.name,
        value: `${special.priceModifier > 0 ? '+' : ''}${special.priceModifier}%`
      })
      return { basePrice, finalPrice: Math.round(finalPrice * 100) / 100, modifiers }
    }
    
    // Check season
    const season = seasons.find(s => {
      if (!s.active) return false
      // Check room type restriction
      if (s.roomTypes && s.roomTypes.length > 0) {
        if (!s.roomTypes.includes(roomTypeName)) {
          return false
        }
      }
      return formattedDate >= s.startDate && formattedDate <= s.endDate
    })
    if (season) {
      const adj = finalPrice * (season.priceModifier / 100)
      finalPrice = finalPrice + adj
      modifiers.push({
        icon: '🌞',
        label: season.name,
        value: `${season.priceModifier > 0 ? '+' : ''}${season.priceModifier}%`
      })
    }
    
    // Check weekday modifier
    const weekday = weekdayPrices.find(w => w.dayOfWeek === dayOfWeek && w.enabled && w.priceModifier !== 0)
    if (weekday) {
      const adj = finalPrice * (weekday.priceModifier / 100)
      finalPrice = finalPrice + adj
      modifiers.push({
        icon: '📅',
        label: weekday.dayName,
        value: `${weekday.priceModifier > 0 ? '+' : ''}${weekday.priceModifier}%`
      })
    }
    
    return { basePrice, finalPrice: Math.round(finalPrice * 100) / 100, modifiers }
  }
  
  // Handle mouse enter on empty cell
  const handleCellMouseEnter = (e: React.MouseEvent, date: string, room: any) => {
    if (!calendarSettings.showPriceTooltip) return
    
    // Check if cell has reservation
    const hasReservation = reservations.some(res => {
      const resStart = moment(res.checkIn)
      const resEnd = moment(res.checkOut)
      const cellDate = moment(date)
      return res.roomId === room.id && cellDate.isSameOrAfter(resStart, 'day') && cellDate.isBefore(resEnd, 'day')
    })
    
    if (hasReservation) {
      setPriceTooltip(null)
      return
    }
    
    const priceInfo = calculatePriceForCell(date, room)
    const rect = e.currentTarget.getBoundingClientRect()
    
    setPriceTooltip({
      visible: true,
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
      roomType: room.type || room.roomType || 'Standard',
      date: moment(date).format('DD.MM.YYYY'),
      basePrice: priceInfo.basePrice,
      finalPrice: priceInfo.finalPrice,
      modifiers: priceInfo.modifiers
    })
  }
  
  const handleCellMouseLeave = () => {
    setPriceTooltip(null)
  }
  
  // Get cell background color based on season/special date
  const getCellBackgroundColor = (date: string): { color: string; opacity: number; label?: string } | null => {
    if (!calendarSettings.showSeasonColors) return null
    
    const formattedDate = moment(date).format('YYYY-MM-DD')
    
    // Check special date first (highest priority)
    const special = specialDates.find(sd => sd.active && sd.date === formattedDate)
    if (special) {
      return {
        color: special.color || '#f59e0b', // Default amber for special dates
        opacity: 0.15, // REDUCED from 0.3
        label: special.name
      }
    }
    
    // Check season
    const season = seasons.find(s => {
      if (!s.active) return false
      return formattedDate >= s.startDate && formattedDate <= s.endDate
    })
    if (season && season.color) {
      return {
        color: season.color,
        opacity: 0.08, // REDUCED from 0.15
        label: season.name
      }
    }
    
    return null
  }
  
  // Handle right-click on reservation
  const handleRightClick = (e: React.MouseEvent, reservation: any) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Check if context menu is enabled in settings
    if (!calendarSettings.enableContextMenu) {
      return
    }
    
    setSelectedReservation(reservation)
    
    // Add offset to not cover the cell
    const menuWidth = 220
    const menuHeight = 350
    const padding = 10
    
    let menuX = e.clientX + padding
    let menuY = e.clientY
    
    // Keep menu on screen
    if (typeof window !== 'undefined') {
      // Check right edge - if no space, show on left
      if (menuX + menuWidth > window.innerWidth) {
        menuX = e.clientX - menuWidth - padding
      }
      // Check bottom edge - if no space, move up
      if (menuY + menuHeight > window.innerHeight) {
        menuY = window.innerHeight - menuHeight - padding
      }
      // Check top edge
      if (menuY < padding) {
        menuY = padding
      }
      // Check left edge
      if (menuX < padding) {
        menuX = padding
      }
    }
    
    setContextMenu({ x: menuX, y: menuY })
  }
  
  // Handle right-click on empty cell
  const handleEmptyCellRightClick = (e: React.MouseEvent, roomId: string, date: Date) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Check if context menu is enabled in settings
    if (!calendarSettings.enableContextMenu) {
      return
    }
    
    const dateStr = moment(date).format('YYYY-MM-DD')
    const key = `${roomId}_${dateStr}`
    const isBlocked = blockedDates[key]
    
    const menu = [
      {
        label: isBlocked ? '✅ განბლოკვა' : '🚫 დაბლოკვა',
        action: () => isBlocked ? unblockDate(roomId, date) : blockDate(roomId, date)
      }
    ]
    
    // Add offset to not cover the cell
    const menuWidth = 200
    const menuHeight = 150
    const padding = 10
    
    let menuX = e.clientX + padding
    let menuY = e.clientY
    
    // Keep menu on screen
    if (typeof window !== 'undefined') {
      // Check right edge - if no space, show on left
      if (menuX + menuWidth > window.innerWidth) {
        menuX = e.clientX - menuWidth - padding
      }
      // Check bottom edge - if no space, move up
      if (menuY + menuHeight > window.innerHeight) {
        menuY = window.innerHeight - menuHeight - padding
      }
      // Check top edge
      if (menuY < padding) {
        menuY = padding
      }
      // Check left edge
      if (menuX < padding) {
        menuX = padding
      }
    }
    
    setContextMenu({ x: menuX, y: menuY, items: menu })
  }
  
  // Handle double-click on reservation
  const handleDoubleClick = (reservation: any) => {
    setSelectedReservation(reservation)
    setShowDetails(true)
  }
  
  // ==================== DRAG & DROP FUNCTIONS ====================
  
  // Get cell position from mouse coordinates
  const getCellFromMousePosition = (e: MouseEvent): { roomId: string; date: string } | null => {
    if (!calendarRef.current) return null
    
    const calendarRect = calendarRef.current.getBoundingClientRect()
    const x = e.clientX - calendarRect.left
    const y = e.clientY - calendarRect.top
    
    // Find which room row (need to traverse DOM or use data attributes)
    // For now, we'll use a simpler approach with dateStrings and rooms
    // This will be called during drag move
    return null // Will be calculated in handleDragMove
  }
  
  // Validate if drop is allowed
  const validateDrop = (target: { roomId: string; date: string }, reservation: any): boolean => {
    if (!target || !reservation) {
      return false
    }
    
    // Check if target date is closed
    if (isClosedDay(target.date)) {
      return false
    }
    
    // Check if room exists (convert to string for comparison)
    const targetRoom = rooms.find(r => String(r.id) === String(target.roomId))
    
    if (!targetRoom) {
      return false
    }
    
    // Check if room is in maintenance
    if (isRoomInMaintenance(target.roomId) || targetRoom.status === 'MAINTENANCE') {
      return false
    }
    
    // Calculate new dates based on drop position
    const nights = moment(reservation.checkOut).diff(moment(reservation.checkIn), 'days')
    const newCheckIn = moment(target.date)
    const newCheckOut = moment(newCheckIn).add(nights, 'days')
    
    // Minimum 1 night stay
    if (nights < 1) {
      return false
    }
    
    // Check if room is available for entire duration (excluding current reservation)
    for (let d = moment(newCheckIn); d.isBefore(newCheckOut); d.add(1, 'day')) {
      const dateStr = d.format('YYYY-MM-DD')
      
      // Check if date is closed
      if (isClosedDay(dateStr)) {
        return false
      }
      
      // Check for conflicts with other reservations
      const hasConflict = reservations.some((r: any) => {
        if (r.id === reservation.id) return false // Skip current reservation
        if (r.status === 'CANCELLED' || r.status === 'NO_SHOW') return false
        
        const rCheckIn = moment(r.checkIn).format('YYYY-MM-DD')
        const rCheckOut = moment(r.checkOut).format('YYYY-MM-DD')
        
        const isConflict = String(r.roomId) === String(target.roomId) && 
               dateStr >= rCheckIn && 
               dateStr < rCheckOut
        
        return isConflict
      })
      
      if (hasConflict) {
        return false
      }
    }
    
    return true
  }
  
  // Handle drag start
  const handleDragStart = (e: React.MouseEvent, reservation: any) => {
    // Check if drag & drop is enabled in settings
    if (!calendarSettings.enableDragDrop) {
      return
    }
    
    // Only allow drag for CONFIRMED and CHECKED_IN reservations
    if (reservation.status !== 'CONFIRMED' && reservation.status !== 'CHECKED_IN') {
      return
    }
    
    // Check if reservation can be edited
    if (!canEditReservation(reservation, 'edit')) {
      return
    }
    
    // Prevent drag on right-click or double-click
    if (e.button !== 0) return // Only left mouse button
    
    setDragStartPos({ x: e.clientX, y: e.clientY })
    setDraggedReservation(reservation)
    draggedReservationRef.current = reservation
    // Don't set isDragging yet - wait for mouse movement
    e.preventDefault()
    e.stopPropagation()
  }
  
  // Handle drag move
  const handleDragMove = (e: MouseEvent) => {
    if (!draggedReservationRef.current || !calendarRef.current) return
    
    const currentPos = { x: e.clientX, y: e.clientY }
    setDragCurrentPos(currentPos)
    
    // Check if we've moved enough to start dragging
    const deltaX = Math.abs(currentPos.x - dragStartPos.x)
    const deltaY = Math.abs(currentPos.y - dragStartPos.y)
    
    // Start dragging if we've moved enough
    if (!isDraggingRef.current && (deltaX >= dragThreshold || deltaY >= dragThreshold)) {
      setIsDragging(true)
      isDraggingRef.current = true
      return // Wait for next move event to continue
    }
    
    if (!isDraggingRef.current) return // Still not dragging
    
    // Find which cell the mouse is over
    const calendarRect = calendarRef.current.getBoundingClientRect()
    const x = e.clientX - calendarRect.left
    const y = e.clientY - calendarRect.top
    
    // Find the cell element under cursor
    const elementBelow = document.elementFromPoint(e.clientX, e.clientY)
    if (!elementBelow) return
    
    // Find the date cell (div with data attributes or class)
    const dateCell = elementBelow.closest('.date-cell, [data-date]')
    if (!dateCell) {
      setDropTarget(null)
      dropTargetRef.current = null
      return
    }
    
    // Get room ID and date from cell
    const roomId = dateCell.getAttribute('data-room-id')
    const dateStr = dateCell.getAttribute('data-date')
    
    if (roomId && dateStr) {
      const target = { roomId, date: dateStr }
      setDropTarget(target)
      dropTargetRef.current = target
    } else {
      setDropTarget(null)
      dropTargetRef.current = null
    }
  }
  
  // Handle drag end
  const handleDragEnd = async () => {
    // Use refs for checking, not state (stale closure fix)
    const currentIsDragging = isDraggingRef.current
    const currentDraggedReservation = draggedReservationRef.current
    const currentDropTarget = dropTargetRef.current
    
    if (!currentIsDragging || !currentDraggedReservation) {
      // Clean up
      setIsDragging(false)
      isDraggingRef.current = false
      setDraggedReservation(null)
      draggedReservationRef.current = null
      setDropTarget(null)
      dropTargetRef.current = null
      return
    }
    
    if (currentDropTarget && validateDrop(currentDropTarget, currentDraggedReservation)) {
      // Calculate new dates
      const nights = moment(currentDraggedReservation.checkOut).diff(moment(currentDraggedReservation.checkIn), 'days')
      const newCheckIn = currentDropTarget.date
      const newCheckOut = moment(newCheckIn).add(nights, 'days').format('YYYY-MM-DD')
      
      // Get source and target rooms
      const sourceRoom = rooms.find(r => String(r.id) === String(currentDraggedReservation.roomId))
      const targetRoom = rooms.find(r => String(r.id) === String(currentDropTarget.roomId))
      
      if (!targetRoom) {
        alert('❌ ოთახი ვერ მოიძებნა')
        return
      }
      
      // Calculate new total amount using NEW room's price
      const newTotalAmount = calculateTotalAmount(targetRoom, newCheckIn, newCheckOut)
      const newRoomPrice = targetRoom.basePrice || 0
      
      // Check if room changed (not just date)
      const roomChanged = String(currentDraggedReservation.roomId) !== String(currentDropTarget.roomId)
      
      // Optional: Confirm price change if room changed and price is different
      if (roomChanged && sourceRoom && sourceRoom.basePrice !== targetRoom.basePrice) {
        const oldPrice = currentDraggedReservation.totalAmount || 0
        const priceDiff = newTotalAmount - oldPrice
        const confirmed = confirm(
          `ოთახის ფასი შეიცვლება:\n\n` +
          `ძველი: ${sourceRoom.roomNumber} (${sourceRoom.roomType || 'Standard'}) - ₾${oldPrice.toFixed(2)}\n` +
          `ახალი: ${targetRoom.roomNumber} (${targetRoom.roomType || 'Standard'}) - ₾${newTotalAmount.toFixed(2)}\n` +
          `სხვაობა: ${priceDiff >= 0 ? '+' : ''}₾${priceDiff.toFixed(2)}\n\n` +
          `გსურთ გაგრძელება?`
        )
        
        if (!confirmed) {
          // Reset drag state
          setIsDragging(false)
          isDraggingRef.current = false
          setDraggedReservation(null)
          draggedReservationRef.current = null
          setDropTarget(null)
          dropTargetRef.current = null
          return
        }
      }
      
      // Update reservation - INCLUDING roomNumber and roomPrice!
      if (onReservationUpdate) {
        await onReservationUpdate(currentDraggedReservation.id, {
          roomId: currentDropTarget.roomId,
          roomNumber: targetRoom.roomNumber,
          roomPrice: newRoomPrice, // Update room price
          checkIn: newCheckIn,
          checkOut: newCheckOut,
          totalAmount: newTotalAmount
        })
        
        // Also update selectedReservation if it's the same one
        if (selectedReservation && selectedReservation.id === currentDraggedReservation.id) {
          setSelectedReservation({
            ...selectedReservation,
            roomId: currentDropTarget.roomId,
            roomNumber: targetRoom.roomNumber,
            roomPrice: newRoomPrice,
            checkIn: newCheckIn,
            checkOut: newCheckOut,
            totalAmount: newTotalAmount
          })
        }
      }
      
      // ==========================================
      // UPDATE FOLIO IF ROOM CHANGED
      // ==========================================
      if (roomChanged) {
        try {
          const foliosData = localStorage.getItem('hotelFolios')
          if (foliosData) {
            const folios = JSON.parse(foliosData)
            const folioIndex = folios.findIndex((f: any) => f.reservationId === currentDraggedReservation.id)
            
            if (folioIndex !== -1) {
              const folio = folios[folioIndex]
              
              // Update room info in folio
              folio.roomId = targetRoom.id
              folio.roomNumber = targetRoom.roomNumber
              
              // Update room charges in folio transactions
              // Calculate price per night for each night (considering seasons/special dates)
              const roomChargeTransactions = folio.transactions.filter((t: any) => 
                t.type === 'charge' && t.category === 'room'
              )
              
              // Calculate price for each night
              let currentDate = moment(newCheckIn)
              const endDate = moment(newCheckOut)
              const nightPrices: { date: string; price: number }[] = []
              
              while (currentDate.isBefore(endDate)) {
                const dateStr = currentDate.format('YYYY-MM-DD')
                const price = calculatePricePerNight(targetRoom, dateStr)
                nightPrices.push({ date: dateStr, price })
                currentDate.add(1, 'day')
              }
              
              // Update each room charge transaction
              // Try to match by date first, then by index
              folio.transactions = folio.transactions.map((t: any) => {
                if (t.type === 'charge' && t.category === 'room') {
                  // Try to find matching night by date
                  const transactionDate = t.date || t.nightAuditDate
                  const matchingNight = transactionDate 
                    ? nightPrices.find(np => np.date === moment(transactionDate).format('YYYY-MM-DD'))
                    : null
                  
                  // Use matching night price, or average per night
                  const price = matchingNight 
                    ? matchingNight.price 
                    : (newTotalAmount / nights)
                  
                  return {
                    ...t,
                    debit: price,
                    amount: price,
                    description: `ოთახის ღირებულება - ${targetRoom.roomNumber}`,
                    // Keep original date if it exists
                    date: transactionDate || t.date
                  }
                }
                return t
              })
              
              // Recalculate folio balance
              folio.balance = folio.transactions.reduce((sum: number, t: any) => {
                return sum + Number(t.debit || 0) - Number(t.credit || 0)
              }, 0)
              
              // Save updated folio
              folios[folioIndex] = folio
              localStorage.setItem('hotelFolios', JSON.stringify(folios))
              
            }
          }
        } catch (error) {
          console.error('Error updating folio after room change:', error)
        }
      }
    } else if (currentDropTarget) {
      // Invalid drop - show message
      alert('❌ არ შეიძლება ჯავშნის გადატანა ამ ადგილას. შეამოწმეთ რომ:\n- ოთახი თავისუფალია\n- თარიღები დახურული არ არის\n- კონფლიქტი არ არსებობს')
    }
    
    setIsDragging(false)
    isDraggingRef.current = false
    setDraggedReservation(null)
    draggedReservationRef.current = null
    setDropTarget(null)
    dropTargetRef.current = null
    setDragStartPos({ x: 0, y: 0 })
    setDragCurrentPos({ x: 0, y: 0 })
  }
  
  // ==================== RESIZE FUNCTIONS ====================
  
  // Handle resize start
  const handleResizeStart = (e: React.MouseEvent, reservation: any, edge: 'left' | 'right') => {
    e.preventDefault()
    e.stopPropagation()
    
    // Check if resize is enabled in settings
    if (!calendarSettings.enableResize) {
      return
    }
    
    // Only allow resize for CONFIRMED and CHECKED_IN reservations
    if (reservation.status !== 'CONFIRMED' && reservation.status !== 'CHECKED_IN') {
      return
    }
    
    // Check if reservation can be edited
    if (!canEditReservation(reservation, 'edit')) {
      return
    }
    
    setIsResizing(edge)
    isResizingRef.current = edge
    setDraggedReservation(reservation)
    draggedReservationRef.current = reservation
    setDragStartPos({ x: e.clientX, y: e.clientY })
  }
  
  // Handle resize move
  const handleResizeMove = (e: MouseEvent) => {
    if (!isResizingRef.current || !draggedReservationRef.current || !calendarRef.current) return
    
    // Find which cell the mouse is over
    const elementBelow = document.elementFromPoint(e.clientX, e.clientY)
    if (!elementBelow) return
    
    const dateCell = elementBelow.closest('.date-cell, [data-date]')
    if (!dateCell) {
      setResizePreview(null)
      resizePreviewRef.current = null
      return
    }
    
    const dateStr = dateCell.getAttribute('data-date')
    if (!dateStr) {
      setResizePreview(null)
      resizePreviewRef.current = null
      return
    }
    
    const currentCheckIn = moment(draggedReservationRef.current.checkIn).format('YYYY-MM-DD')
    const currentCheckOut = moment(draggedReservationRef.current.checkOut).format('YYYY-MM-DD')
    
    if (isResizingRef.current === 'left') {
      // Resizing check-in date
      if (moment(dateStr).isBefore(currentCheckOut, 'day')) {
        const preview = { checkIn: dateStr }
        setResizePreview(preview)
        resizePreviewRef.current = preview
      } else {
        setResizePreview(null)
        resizePreviewRef.current = null
      }
      } else {
        // Resizing check-out date (right edge)
        // dateStr is the cell we're hovering over
        // Check-out should be the NEXT day after the last night
        const hoverDate = moment(dateStr)
        
        // If moving LEFT (making reservation shorter)
        // We want check-out to be the day AFTER the hovered cell
        const newCheckOut = hoverDate.add(1, 'day').format('YYYY-MM-DD')
        
        // Must be at least 1 night (check-out > check-in)
        if (moment(newCheckOut).isAfter(currentCheckIn, 'day')) {
          const preview = { checkOut: newCheckOut }
          setResizePreview(preview)
          resizePreviewRef.current = preview
        } else {
          setResizePreview(null)
          resizePreviewRef.current = null
        }
      }
  }
  
  // Handle resize end
  const handleResizeEnd = async () => {
    // Use refs for checking, not state (stale closure fix)
    const currentIsResizing = isResizingRef.current
    const currentDraggedReservation = draggedReservationRef.current
    const currentResizePreview = resizePreviewRef.current
    
    if (!currentIsResizing || !currentDraggedReservation) {
      setIsResizing(null)
      isResizingRef.current = null
      setDraggedReservation(null)
      draggedReservationRef.current = null
      setResizePreview(null)
      resizePreviewRef.current = null
      return
    }
    
    if (currentResizePreview) {
      const updates: any = {}
      const currentCheckIn = moment(currentDraggedReservation.checkIn).format('YYYY-MM-DD')
      const currentCheckOut = moment(currentDraggedReservation.checkOut).format('YYYY-MM-DD')
      
      if (currentIsResizing === 'left' && currentResizePreview.checkIn) {
        const newCheckIn = currentResizePreview.checkIn
        
        // Validate new check-in
        if (moment(newCheckIn).isBefore(currentCheckOut, 'day') && 
            !isClosedDay(newCheckIn) &&
            canBookOnDate(moment(newCheckIn).toDate())) {
          updates.checkIn = newCheckIn
        } else {
          alert('❌ არასწორი check-in თარიღი')
          setIsResizing(null)
          isResizingRef.current = null
          setDraggedReservation(null)
          draggedReservationRef.current = null
          setResizePreview(null)
          resizePreviewRef.current = null
          return
        }
      } else if (currentIsResizing === 'right' && currentResizePreview.checkOut) {
        const newCheckOut = currentResizePreview.checkOut
        
        // Validate new check-out
        if (moment(newCheckOut).isAfter(currentCheckIn, 'day') && 
            !isClosedDay(newCheckOut) &&
            canBookOnDate(moment(newCheckOut).subtract(1, 'day').toDate())) {
          updates.checkOut = newCheckOut
        } else {
          alert('❌ არასწორი check-out თარიღი')
          setIsResizing(null)
          isResizingRef.current = null
          setDraggedReservation(null)
          draggedReservationRef.current = null
          setResizePreview(null)
          resizePreviewRef.current = null
          return
        }
      }
      
      // Check for conflicts
      const finalCheckIn = updates.checkIn || currentCheckIn
      const finalCheckOut = updates.checkOut || currentCheckOut
      const nights = moment(finalCheckOut).diff(moment(finalCheckIn), 'days')
      
      if (nights < 1) {
        alert('❌ მინიმუმ 1 ღამე უნდა იყოს')
        setIsResizing(null)
        isResizingRef.current = null
        setDraggedReservation(null)
        draggedReservationRef.current = null
        setResizePreview(null)
        resizePreviewRef.current = null
        return
      }
      
      // Check for conflicts with other reservations
      for (let d = moment(finalCheckIn); d.isBefore(finalCheckOut); d.add(1, 'day')) {
        const dateStr = d.format('YYYY-MM-DD')
        const hasConflict = reservations.some((r: any) => {
          if (r.id === currentDraggedReservation.id) return false
          if (r.status === 'CANCELLED' || r.status === 'NO_SHOW') return false
          
          const rCheckIn = moment(r.checkIn).format('YYYY-MM-DD')
          const rCheckOut = moment(r.checkOut).format('YYYY-MM-DD')
          
          return String(r.roomId) === String(currentDraggedReservation.roomId) && 
                 dateStr >= rCheckIn && 
                 dateStr < rCheckOut
        })
        
        if (hasConflict) {
          alert('❌ კონფლიქტი სხვა ჯავშანთან')
          setIsResizing(null)
          isResizingRef.current = null
          setDraggedReservation(null)
          draggedReservationRef.current = null
          setResizePreview(null)
          resizePreviewRef.current = null
          return
        }
      }
      
      // Calculate new total with roomRates
      const room = rooms.find(r => String(r.id) === String(currentDraggedReservation.roomId))
      
      updates.totalAmount = calculateTotalAmount(
        room, 
        updates.checkIn || currentCheckIn,
        updates.checkOut || currentCheckOut
      )
      
      // Update reservation
      if (onReservationUpdate) {
        await onReservationUpdate(currentDraggedReservation.id, updates)
      }
      
      // ==========================================
      // UPDATE FOLIO AFTER RESIZE
      // ==========================================
      try {
        const foliosData = localStorage.getItem('hotelFolios')
        if (foliosData) {
          const folios = JSON.parse(foliosData)
          const folioIndex = folios.findIndex((f: any) => f.reservationId === currentDraggedReservation.id)
          
          if (folioIndex !== -1) {
            const folio = folios[folioIndex]
            const newNights = moment(updates.checkOut || currentCheckOut).diff(
              moment(updates.checkIn || currentCheckIn), 'days'
            )
            
            // Update initialRoomCharge if exists
            if (folio.initialRoomCharge) {
              const rate = folio.initialRoomCharge.rate || (updates.totalAmount / newNights)
              folio.initialRoomCharge.nights = newNights
              folio.initialRoomCharge.totalAmount = updates.totalAmount
            }
            
            // Update transactions if exists
            if (folio.transactions && Array.isArray(folio.transactions)) {
              const roomChargeTransaction = folio.transactions.find((t: any) => 
                t.description?.includes('ოთახის ღირებულება') ||
                t.description?.includes('Room') ||
                t.type === 'ROOM_CHARGE' ||
                t.category === 'ROOM'
              )
              
              if (roomChargeTransaction) {
                roomChargeTransaction.amount = updates.totalAmount
                roomChargeTransaction.description = `ოთახის ღირებულება (${newNights} ღამე)`
              }
            }
            
            // Update charges if exists (alternative structure)
            if (folio.charges && Array.isArray(folio.charges)) {
              const roomChargeIndex = folio.charges.findIndex((c: any) => 
                c.description?.includes('ოთახის ღირებულება') ||
                c.type === 'ROOM'
              )
              
              if (roomChargeIndex !== -1) {
                folio.charges[roomChargeIndex].amount = updates.totalAmount
                folio.charges[roomChargeIndex].description = `ოთახის ღირებულება (${newNights} ღამე)`
              }
            }
            
            // Recalculate balance
            // Balance = Total Room Charge - Payments
            const totalRoomCharge = folio.initialRoomCharge?.totalAmount || updates.totalAmount
            const totalPayments = (folio.payments || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
            folio.balance = totalRoomCharge - totalPayments
            
            // Save folio
            folios[folioIndex] = folio
            localStorage.setItem('hotelFolios', JSON.stringify(folios))
            
            // Dispatch event to refresh UI
            window.dispatchEvent(new CustomEvent('folioUpdated', { 
              detail: { reservationId: currentDraggedReservation.id } 
            }))
            
            // Force re-render
            setFolioUpdateKey(prev => prev + 1)
          }
        }
      } catch (e) {
        console.error('Error updating folio after resize:', e)
      }
      // ==========================================
    }
    
    setIsResizing(null)
    isResizingRef.current = null
    setDraggedReservation(null)
    draggedReservationRef.current = null
    setResizePreview(null)
    resizePreviewRef.current = null
    setDragStartPos({ x: 0, y: 0 })
  }
  
  // Global mouse event handlers
  useEffect(() => {
    // Fix: Also listen when draggedReservation is set (before actual drag starts)
    // Use refs to avoid stale closure issues
    if (!draggedReservationRef.current && !isDraggingRef.current && !isResizingRef.current) return
    
    const handleMouseMove = (e: MouseEvent) => {
      // Use refs to check current state (stale closure fix)
      if (draggedReservationRef.current) {
        if (isResizingRef.current) {
          handleResizeMove(e)
        } else {
          // Check if we should start dragging (moved beyond threshold)
          handleDragMove(e)
        }
      }
    }
    
    const handleMouseUp = () => {
      // Use REFS instead of state values! (stale closure fix)
      if (draggedReservationRef.current) {
        if (isDraggingRef.current) {
          handleDragEnd()
        } else if (isResizingRef.current) {
          handleResizeEnd()
        } else {
          // Click without drag - just clean up
          setIsDragging(false)
          isDraggingRef.current = false
          setIsResizing(null)
          isResizingRef.current = null
          setDraggedReservation(null)
          draggedReservationRef.current = null
          setDropTarget(null)
          dropTargetRef.current = null
          setResizePreview(null)
          resizePreviewRef.current = null
          setDragStartPos({ x: 0, y: 0 })
          setDragCurrentPos({ x: 0, y: 0 })
        }
      }
    }
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDragging(false)
        isDraggingRef.current = false
        setIsResizing(null)
        isResizingRef.current = null
        setDraggedReservation(null)
        draggedReservationRef.current = null
        setDropTarget(null)
        dropTargetRef.current = null
        setResizePreview(null)
        resizePreviewRef.current = null
        setDragStartPos({ x: 0, y: 0 })
        setDragCurrentPos({ x: 0, y: 0 })
      }
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('keydown', handleKeyDown)
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isDragging, isResizing, draggedReservation])
  
  // Context menu actions
  // Check if reservation can be edited (not on closed date)
  // Get relevant date for an action
  const getRelevantDate = (action: string, reservation: any): string => {
    switch (action) {
      case 'check-in':
      case 'no-show':
        return moment(reservation.checkIn).format('YYYY-MM-DD')
      case 'check-out':
        return moment(reservation.checkOut).format('YYYY-MM-DD')
      case 'edit':
      case 'cancel':
        // For CHECKED_OUT reservations, check checkOut date
        // For other statuses, check checkIn date
        if (reservation.status === 'CHECKED_OUT') {
          return moment(reservation.checkOut).format('YYYY-MM-DD')
        }
        return moment(reservation.checkIn).format('YYYY-MM-DD')
      case 'new-reservation':
        return moment(reservation.checkIn).format('YYYY-MM-DD')
      default:
        return moment(reservation.checkIn).format('YYYY-MM-DD')
    }
  }

  // Check if action is allowed on closed dates
  const getAllowedActionsForClosedDate = (action: string, reservation: any): boolean => {
    if (!reservation) return false
    
    const lastAuditDate = typeof window !== 'undefined' ? localStorage.getItem('lastNightAuditDate') : null
    if (!lastAuditDate) return true // No audit date means all dates are editable
    
    // Check-out და Payment ALWAYS allowed (even on closed dates)
    const alwaysAllowedActions = ['check-out', 'payment', 'view-details']
    if (alwaysAllowedActions.includes(action)) {
      return true
    }
    
    // Special handling for check-in
    if (action === 'check-in') {
      const checkInDate = moment(reservation.checkIn).format('YYYY-MM-DD')
      const businessDay = moment(lastAuditDate).add(1, 'day').format('YYYY-MM-DD')
      
      // Check-in is ONLY blocked if check-in date is BEFORE business day (truly closed)
      // Check-in on business day or future is ALLOWED
      if (checkInDate < businessDay) {
        return false  // Past date - blocked
      }
      return true  // Business day or future - allowed (early check-in handled separately)
    }
    
    // Block other actions on closed dates
    const relevantDate = getRelevantDate(action, reservation)
    if (moment(relevantDate).isSameOrBefore(lastAuditDate)) {
      return false
    }
    
    return true
  }

  // Legacy function for backward compatibility
  const canEditReservation = (reservation: any, action: string = 'edit'): boolean => {
    if (!reservation) return false
    
    // Map old action names to new ones
    const actionMap: { [key: string]: string } = {
      'Check-in': 'check-in',
      'Check-out': 'check-out',
      'NO-SHOW მონიშვნა': 'no-show',
      'გაუქმება': 'cancel',
      'რედაქტირება': 'edit',
      'წაშლა': 'cancel'
    }
    
    const mappedAction = actionMap[action] || action.toLowerCase()
    return getAllowedActionsForClosedDate(mappedAction, reservation)
  }
  
  // Unified action handler
  const handleReservationAction = (action: string, reservation: any): boolean => {
    // Check if action is allowed
    if (!getAllowedActionsForClosedDate(action, reservation)) {
      const blockedActions: { [key: string]: string } = {
        'check-in': '❌ Check-in აღარ შეიძლება დახურულ დღეზე',
        'edit': '❌ რედაქტირება აღარ შეიძლება დახურულ დღეზე',
        'cancel': '❌ გაუქმება აღარ შეიძლება დახურულ დღეზე',
        'no-show': '❌ NO-SHOW მარკირება აღარ შეიძლება დახურულ დღეზე',
        'new-reservation': '❌ ახალი ჯავშანი აღარ შეიძლება დახურულ დღეზე'
      }
      
      const message = blockedActions[action] || `❌ ${action} აღარ შეიძლება დახურულ დღეზე`
      alert(message)
      return false
    }
    
    // Process allowed actions
    switch (action) {
      case 'check-in':
        handleCheckIn()
        break
      case 'check-out':
        handleCheckOut()
        break
      case 'payment':
        setShowPayment(true)
        setContextMenu(null)
        break
      case 'view-details':
        setShowDetails(true)
        setContextMenu(null)
        break
      case 'edit':
        setShowEditModal(true)
        setContextMenu(null)
        break
      case 'cancel':
        handleCancel()
        break
      case 'no-show':
        handleMarkAsNoShow()
        break
      default:
        console.warn('Unknown action:', action)
        return false
    }
    
    return true
  }
  
  // Create folio on check-in
  const createFolioOnCheckIn = async (reservation: any) => {
    if (typeof window === 'undefined') return
    
    const folios = JSON.parse(localStorage.getItem('hotelFolios') || '[]')
    const existingFolio = folios.find((f: any) => f.reservationId === reservation.id)
    
    if (!existingFolio) {
      // Get room number (convert roomId to roomNumber if needed)
      const roomIdOrNumber = reservation.roomNumber || reservation.roomId
      let roomNumberForFolio = roomIdOrNumber
      if (roomIdOrNumber && roomIdOrNumber.length > 4) {
        // Try to find room in rooms array
        const foundRoom = rooms.find((r: any) => r.id === roomIdOrNumber)
        if (foundRoom) {
          roomNumberForFolio = foundRoom.roomNumber || foundRoom.number || roomIdOrNumber
        } else {
          // Try localStorage
          try {
            const savedRooms = localStorage.getItem('rooms') || 
                               localStorage.getItem('simpleRooms') || 
                               localStorage.getItem('hotelRooms')
            if (savedRooms) {
              const parsedRooms = JSON.parse(savedRooms)
              const foundRoom = parsedRooms.find((r: any) => r.id === roomIdOrNumber)
              if (foundRoom) {
                roomNumberForFolio = foundRoom.roomNumber || foundRoom.number || roomIdOrNumber
              }
            }
          } catch (e) {
            console.error('Error loading rooms:', e)
          }
        }
      }
      const roomNumberForFolioNumber = roomNumberForFolio.length <= 4 && /^\d+$/.test(roomNumberForFolio) 
        ? roomNumberForFolio 
        : Math.floor(Math.random() * 1000).toString()
      
      const newFolio = {
        id: `FOLIO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        folioNumber: `F${moment().format('YYMMDD')}-${roomNumberForFolioNumber}-${reservation.id}`,
        reservationId: reservation.id,
        guestName: reservation.guestName,
        roomNumber: roomNumberForFolio,
        balance: 0,
        creditLimit: 5000,
        paymentMethod: 'cash',
        status: 'open',
        openDate: moment().format('YYYY-MM-DD'),
        transactions: []
      }
      
      folios.push(newFolio)
      localStorage.setItem('hotelFolios', JSON.stringify(folios))
      
      ActivityLogger.log('FOLIO_CREATED_ON_CHECKIN', {
        folioNumber: newFolio.folioNumber,
        guest: newFolio.guestName,
        reservationId: reservation.id
      })
    }
  }

  const handleCheckIn = async () => {
    if (!selectedReservation || !onReservationUpdate) return
    
    if (!canEditReservation(selectedReservation, 'Check-in')) {
      setContextMenu(null)
      setSelectedReservation(null)
      return
    }
    
    // ========================================
    // STEP 1: BLOCK IF ROOM IS OCCUPIED
    // Use `rooms` state, NOT localStorage!
    // ========================================
    const room = rooms.find((r: any) => {
      if (selectedReservation.roomId && r.id && r.id === selectedReservation.roomId) return true
      if (selectedReservation.roomNumber && r.roomNumber && 
          String(selectedReservation.roomNumber).trim() !== '' &&
          String(r.roomNumber).trim() !== '' &&
          String(r.roomNumber) === String(selectedReservation.roomNumber)) return true
      return false
    })
    
    if (room?.status?.toUpperCase() === 'OCCUPIED') {
      alert(`❌ Check-in შეუძლებელია!\n\nოთახი ${selectedReservation.roomNumber} უკვე დაკავებულია!\n\nჯერ გააკეთეთ Check-out.`)
      setContextMenu(null)
      setSelectedReservation(null)
      return
    }
    
    // ========================================
    // STEP 2: Check for other CHECKED_IN reservations
    // Use `reservations` state, NOT localStorage!
    // ========================================
    const activeRes = reservations.find((r: any) => {
      // ✅ FIX: Only compare if both values exist
      let sameRoom = false
      if (selectedReservation.roomId && r.roomId && selectedReservation.roomId === r.roomId) {
        sameRoom = true
      } else if (selectedReservation.roomNumber && r.roomNumber && 
                 String(selectedReservation.roomNumber).trim() !== '' &&
                 String(r.roomNumber).trim() !== '' &&
                 String(r.roomNumber) === String(selectedReservation.roomNumber)) {
        sameRoom = true
      }
      const isCheckedIn = r.status?.toUpperCase() === 'CHECKED_IN'
      const isDifferent = r.id !== selectedReservation.id
      return sameRoom && isCheckedIn && isDifferent
    })
    
    if (activeRes) {
      alert(`❌ Check-in შეუძლებელია!\n\nოთახზე შემოსულია: ${activeRes.guestName}`)
      setContextMenu(null)
      setSelectedReservation(null)
      return
    }
    
    // Now safe to open check-in modal
    setContextMenu(null)
    setShowCheckInModal(true)
  }
  
  // New function for actual check-in process
  const processCheckIn = async () => {
    if (!selectedReservation || !onReservationUpdate) return
    
    // ========================================
    // STEP 1: BLOCK IF ROOM IS OCCUPIED
    // Use `rooms` state, NOT localStorage!
    // ========================================
    const room = rooms.find((r: any) => {
      if (selectedReservation.roomId && r.id && r.id === selectedReservation.roomId) return true
      if (selectedReservation.roomNumber && r.roomNumber && 
          String(selectedReservation.roomNumber).trim() !== '' &&
          String(r.roomNumber).trim() !== '' &&
          String(r.roomNumber) === String(selectedReservation.roomNumber)) return true
      return false
    })
    
    if (room?.status?.toUpperCase() === 'OCCUPIED') {
      alert(`❌ Check-in შეუძლებელია!\n\nოთახი ${selectedReservation.roomNumber} უკვე დაკავებულია!`)
      setShowCheckInModal(false)
      setSelectedReservation(null)
      return
    }
    
    // ========================================
    // STEP 2: Check CHECKED_IN reservations
    // Use `reservations` state!
    // ========================================
    const activeRes = reservations.find((r: any) => {
      // ✅ FIX: Only compare if both values exist
      let sameRoom = false
      if (selectedReservation.roomId && r.roomId && selectedReservation.roomId === r.roomId) {
        sameRoom = true
      } else if (selectedReservation.roomNumber && r.roomNumber && 
                 String(selectedReservation.roomNumber).trim() !== '' &&
                 String(r.roomNumber).trim() !== '' &&
                 String(r.roomNumber) === String(selectedReservation.roomNumber)) {
        sameRoom = true
      }
      const isCheckedIn = r.status?.toUpperCase() === 'CHECKED_IN'
      const isDifferent = r.id !== selectedReservation.id
      return sameRoom && isCheckedIn && isDifferent
    })
    
    if (activeRes) {
      alert(`❌ Check-in შეუძლებელია!\n\nოთახზე შემოსულია: ${activeRes.guestName}`)
      setShowCheckInModal(false)
      setSelectedReservation(null)
      return
    }
    
    // ========================================
    // STEP 3: Early check-in
    // ========================================
    const lastAuditDate = localStorage.getItem('lastNightAuditDate')
    const businessDay = lastAuditDate 
      ? moment(lastAuditDate).add(1, 'day').format('YYYY-MM-DD')
      : moment().format('YYYY-MM-DD')
    const checkInDate = moment(selectedReservation.checkIn).format('YYYY-MM-DD')
    
    if (checkInDate > businessDay) {
      const confirmEarly = window.confirm('⚠️ Check-in თარიღი ჯერ არ დამდგარა. გსურთ ადრე Check-in?')
      if (!confirmEarly) {
        return // User cancelled
      }
    }
    
    // ========================================
    // STEP 4: Process check-in
    // ========================================
    const now = new Date()
    
    try {
      await createFolioOnCheckIn(selectedReservation)
      
      await onReservationUpdate(selectedReservation.id, {
        status: 'CHECKED_IN',
        actualCheckIn: now.toISOString()
      })
      
      // Update room status via API
      await fetch('/api/hotel/rooms/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: selectedReservation.roomId,
          status: 'OCCUPIED'
        })
      })
      
      ActivityLogger.log('CHECK_IN', {
        guest: selectedReservation.guestName,
        room: selectedReservation.roomNumber,
        reservationId: selectedReservation.id
      })
      
      // ✅ CRITICAL: Reload both reservations AND rooms to update state!
      // This ensures the next check-in attempt sees the updated OCCUPIED status
      if (loadRooms) {
        await loadRooms() // Wait for rooms to reload
      }
      if (loadReservations) {
        await loadReservations() // Wait for reservations to reload
      }
      
      alert('✅ Check-in წარმატებით დასრულდა!')
      setShowCheckInModal(false)
      setSelectedReservation(null)
    } catch (error) {
      console.error('Failed to check in:', error)
      alert('შეცდომა Check-in-ისას')
    }
  }
  
  const handleCheckOut = async () => {
    if (!selectedReservation) return
    
    if (!canEditReservation(selectedReservation, 'Check-out')) {
      setContextMenu(null)
      setSelectedReservation(null)
      return
    }
    
    // Check if checkout date is closed (blocked by Night Audit)
    const lastAuditDate = typeof window !== 'undefined' ? localStorage.getItem('lastNightAuditDate') : null
    const checkOutDateStr = moment(selectedReservation.checkOut).format('YYYY-MM-DD')
    
    // If checkout date is closed, show special message
    if (lastAuditDate && moment(checkOutDateStr).isSameOrBefore(lastAuditDate)) {
      // Check if Night Audit processed this
      const auditHistory = typeof window !== 'undefined' 
        ? JSON.parse(localStorage.getItem('nightAudits') || '[]')
        : []
      const auditForDate = auditHistory.find((a: any) => a.date === checkOutDateStr && a.status === 'completed')
      
      if (auditForDate && selectedReservation.status === 'CHECKED_IN') {
        alert(`⚠️ ${checkOutDateStr} უკვე დახურულია Night Audit-ით!\n\n` +
              `სტუმარი: ${selectedReservation.guestName}\n` +
              `ოთახი: ${selectedReservation.roomNumber}\n` +
              `სტატუსი: Late Check-out\n\n` +
              `გადახდა: დამატებითი ღამე დარიცხულია`)
        setContextMenu(null)
        setSelectedReservation(null)
        return
      }
      
      alert(`❌ ${checkOutDateStr} დახურულია! Check-out აღარ შეიძლება.`)
      setContextMenu(null)
      setSelectedReservation(null)
      return
    }
    
    // Show check-out modal with folio
    setContextMenu(null)
    setShowCheckOutModal(true)
  }
  
  // Calculate charge based on policy
  const calculateCharge = (chargePolicy: string, reservation: any, customCharge?: number) => {
    const nights = moment(reservation.checkOut).diff(moment(reservation.checkIn), 'days')
    const perNight = nights > 0 ? reservation.totalAmount / nights : reservation.totalAmount
    
    switch (chargePolicy) {
      case 'first':
        return perNight
      case 'full':
        return reservation.totalAmount
      case 'none':
        return 0
      case 'custom':
        return customCharge || 0
      default:
        return perNight
    }
  }
  
  // Mark reservation as NO-SHOW - opens modal
  // Check if no-show is allowed
  const canMarkAsNoShow = (reservation: any): { allowed: boolean; reason?: string } => {
    const lastAuditDate = localStorage.getItem('lastNightAuditDate')
    const businessDate = lastAuditDate 
      ? moment(lastAuditDate).add(1, 'day').format('YYYY-MM-DD')
      : moment().format('YYYY-MM-DD')
    
    const checkInDate = (reservation.checkInDate || reservation.checkIn || '').split('T')[0]
    
    // Status must be CONFIRMED or PENDING
    if (reservation.status !== 'CONFIRMED' && reservation.status !== 'PENDING') {
      return { allowed: false, reason: `სტატუსი "${reservation.status}" - No-show შეუძლებელია` }
    }
    
    // Check-in must be EXACTLY on business date (NOT past, NOT future!)
    if (checkInDate < businessDate) {
      return { allowed: false, reason: `Check-in (${checkInDate}) უკვე დახურულია` }
    }
    
    if (checkInDate > businessDate) {
      return { allowed: false, reason: `Check-in (${checkInDate}) მომავალშია` }
    }
    
    return { allowed: true }
  }

  const handleMarkAsNoShow = () => {
    if (!selectedReservation) return
    
    if (!canEditReservation(selectedReservation, 'NO-SHOW მონიშვნა')) {
      setContextMenu(null)
      setSelectedReservation(null)
      return
    }
    
    // Check if no-show is allowed
    const noShowCheck = canMarkAsNoShow(selectedReservation)
    if (!noShowCheck.allowed) {
      alert(`❌ No-show შეუძლებელია\n\n${noShowCheck.reason}`)
      setContextMenu(null)
      setSelectedReservation(null)
      return
    }
    
    setShowNoShowModal(selectedReservation)
    setContextMenu(null)
  }
  
  // Get active reservations (exclude NO-SHOW and CANCELLED for calendar display)
  const getActiveReservations = (reservations: any[]) => {
    return reservations.filter((r: any) => 
      r.status !== 'NO_SHOW' && 
      r.status !== 'CANCELLED'
    )
  }
  
  // Alias for calendar reservations filtering
  const getCalendarReservations = (reservations: any[]) => {
    return getActiveReservations(reservations)
  }
  
  // Process NO-SHOW confirmation from modal
  const processNoShow = async (reservation: any, chargePolicy: string, reason: string, sendNotification: boolean, freeRoom: boolean, customCharge?: number) => {
    if (!onReservationUpdate) return
    
    const charge = calculateCharge(chargePolicy, reservation, customCharge)
    const currentUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('currentUser') || '{"name":"System"}') : { name: 'System' }
    
    try {
      // Check if room can be released (check for conflicts with other reservations)
      if (freeRoom && reservation.roomId) {
        const sameRoomReservations = reservations.filter((r: any) => 
          (r.roomId === reservation.roomId || r.roomNumber === reservation.roomNumber) &&
          r.id !== reservation.id &&
          r.status !== 'NO_SHOW' &&
          r.status !== 'CANCELLED'
        )
        
        const hasConflict = sameRoomReservations.some((r: any) => {
          const checkIn = moment(r.checkIn)
          const checkOut = moment(r.checkOut)
          const resCheckIn = moment(reservation.checkIn)
          const resCheckOut = moment(reservation.checkOut)
          // Check if there's an overlap
          return checkIn.isBefore(resCheckOut, 'day') && checkOut.isAfter(resCheckIn, 'day')
        })
        
        if (hasConflict) {
          alert('❌ ოთახი დაკავებულია ამ თარიღზე! ჯერ გადაიყვანეთ სხვა სტუმარი.')
          setShowNoShowModal(null)
          setSelectedReservation(null)
          return
        }
      }
      
      // Update reservation with NO-SHOW status - keeps it in system
      const updatedReservation = {
        ...reservation,
        status: 'NO_SHOW',
        noShowDate: moment().format(),
        noShowCharge: charge,
        noShowReason: reason || 'Guest did not arrive',
        markedAsNoShowAt: moment().format(),
        noShowMarkedBy: currentUser.name || 'System',
        roomReleased: freeRoom, // Room becomes available
        visible: true // Still visible in reservations list
      }
      
      await onReservationUpdate(reservation.id, updatedReservation)
      
      // Update room status to VACANT immediately if requested
      if (freeRoom && reservation.roomId) {
        await fetch('/api/hotel/rooms/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId: reservation.roomId,
            status: 'VACANT'
          })
        })
      }
      
      ActivityLogger.log('NO_SHOW', {
        guest: reservation.guestName,
        room: reservation.roomNumber,
        reservationId: reservation.id,
        charge: charge,
        policy: chargePolicy,
        reason: reason,
        markedBy: currentUser.name
      })
      
      // TODO: Send notification if requested
      if (sendNotification) {
        // TODO: Send notification if requested
      }
      
      if (loadReservations) {
        loadReservations()
      }
      
      setShowNoShowModal(null)
      setSelectedReservation(null)
      
      alert(`✅ ${reservation.guestName} - NO-SHOW\n` +
            `Charge: ₾${Number(charge || 0).toFixed(2)}\n` +
            (freeRoom ? `✅ ოთახი ${reservation.roomNumber} გათავისუფლდა` : ''))
      
    } catch (error) {
      console.error('Error marking as NO-SHOW:', error)
      alert('❌ NO-SHOW მარკირებისას შეცდომა მოხდა')
    } finally {
      setContextMenu(null)
    }
  }
  
  const handleCancel = async () => {
    if (!selectedReservation) return
    
    if (!canEditReservation(selectedReservation, 'გაუქმება')) {
      setContextMenu(null)
      setSelectedReservation(null)
      return
    }
    
    // Open Cancel Modal instead of confirm
    setContextMenu(null)
    setShowCancelModal(true)
  }

  // New function for actual cancel process
  const processCancelReservation = async (reason: string, refundAmount: number) => {
    if (!selectedReservation) return
    
    // Delete reservation completely
    if (onReservationDelete) {
      try {
        await onReservationDelete(selectedReservation.id)
        
        ActivityLogger.log('RESERVATION_CANCELLED', {
          guest: selectedReservation.guestName,
          room: selectedReservation.roomNumber,
          reservationId: selectedReservation.id,
          reason: reason,
          refundAmount: refundAmount
        })
        
        setShowCancelModal(false)
        setSelectedReservation(null)
        setCancelReason('')
        setRefundAmount(0)
        
        alert(`❌ ჯავშანი გაუქმებულია\n\n${refundAmount > 0 ? `💰 რეფუნდი: ₾${refundAmount}` : ''}`)
        
        if (loadReservations) {
          loadReservations()
        }
      } catch (error) {
        console.error('Failed to delete reservation:', error)
        alert('შეცდომა ჯავშნის წაშლისას')
      }
    } else {
      // Fallback to update status if delete not available
      if (onReservationUpdate) {
        try {
          await onReservationUpdate(selectedReservation.id, {
            status: 'CANCELLED',
            cancelledAt: new Date().toISOString(),
            cancellationReason: reason,
            refundAmount: refundAmount
          })
          
          // Update room status to VACANT if was OCCUPIED
          if (selectedReservation.status === 'CHECKED_IN') {
            await fetch('/api/hotel/rooms/status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                roomId: selectedReservation.roomId,
                status: 'VACANT'
              })
            })
          }
          
          ActivityLogger.log('RESERVATION_CANCELLED', {
            guest: selectedReservation.guestName,
            room: selectedReservation.roomNumber,
            reservationId: selectedReservation.id,
            reason: reason,
            refundAmount: refundAmount
          })
          
          setShowCancelModal(false)
          setSelectedReservation(null)
          setCancelReason('')
          setRefundAmount(0)
          
          alert(`❌ ჯავშანი გაუქმებულია\n\n${refundAmount > 0 ? `💰 რეფუნდი: ₾${refundAmount}` : ''}`)
          
          if (loadReservations) {
            loadReservations()
          }
        } catch (error) {
          console.error('Failed to cancel reservation:', error)
          alert('შეცდომა ჯავშნის გაუქმებისას')
        }
      }
    }
  }
  
  // Get status color
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'CONFIRMED': return 'bg-green-500'
      case 'CHECKED_IN': return 'bg-blue-500'
      case 'CHECKED_OUT': return 'bg-gray-400'
      case 'CANCELLED': return 'bg-red-400 opacity-50'
      case 'PENDING': return 'bg-yellow-500'
      case 'NO_SHOW': return 'bg-orange-500 opacity-75'
      default: return 'bg-gray-500'
    }
  }
  
  // Check if date is in the past
  // Check if date is in the past relative to business day, not actual today
  const isPastDate = (date: Date) => {
    const dateStr = moment(date).format('YYYY-MM-DD')
    const lastAuditDate = typeof window !== 'undefined' ? localStorage.getItem('lastAuditDate') : null
    
    if (lastAuditDate) {
      try {
        const lastClosed = JSON.parse(lastAuditDate)
        const businessDay = moment(lastClosed).add(1, 'day')
        // Only dates before business day are considered "past" for booking purposes
        return moment(dateStr).isBefore(businessDay, 'day')
      } catch {
        // If parsing fails, compare with fixed TODAY
        return moment(dateStr).isBefore(TODAY, 'day')
      }
    }
    
    // If no audit, compare with fixed TODAY
    return moment(dateStr).isBefore(TODAY, 'day')
  }
  
  // Get reservations for room and date
  const getReservationsForRoomAndDate = (roomId: string, date: Date) => {
    const dateStr = moment(date).format('YYYY-MM-DD')
    // Return only active reservations (exclude NO-SHOW and CANCELLED)
    return getActiveReservations(
      reservations.filter(res => {
        const checkIn = moment(res.checkIn).format('YYYY-MM-DD')
        const checkOut = moment(res.checkOut).format('YYYY-MM-DD')
        return res.roomId === roomId && 
               dateStr >= checkIn && 
               dateStr < checkOut
      })
    )
  }
  
  // Get reservation style based on status
  const getReservationStyle = (reservation: any) => {
    if (reservation.status === 'NO_SHOW') {
      return {
        background: 'repeating-linear-gradient(45deg, #fee2e2, #fee2e2 10px, #fca5a5 10px, #fca5a5 20px)',
        opacity: 0.6,
        textDecoration: 'line-through'
      }
    }
    
    // Default styles for other statuses
    const statusColors: any = {
      'CONFIRMED': { background: '#3b82f6' }, // bg-blue-500
      'CHECKED_IN': { background: '#10b981' }, // bg-green-500
      'CHECKED_OUT': { background: '#9ca3af' }, // bg-gray-400
      'CANCELLED': { background: '#fca5a5', opacity: 0.5 } // bg-red-300 opacity-50
    }
    
    return statusColors[reservation.status] || { background: '#3b82f6' }
  }
  
  // Helper function to darken color for gradient
  const adjustColor = (color: string, amount: number): string => {
    // Handle rgb format
    if (color.startsWith('rgb')) {
      const matches = color.match(/\d+/g)
      if (matches && matches.length >= 3) {
        const r = Math.max(0, Math.min(255, parseInt(matches[0]) + amount))
        const g = Math.max(0, Math.min(255, parseInt(matches[1]) + amount))
        const b = Math.max(0, Math.min(255, parseInt(matches[2]) + amount))
        return `rgb(${r}, ${g}, ${b})`
      }
    }
    // Handle hex format
    if (color.startsWith('#')) {
      const hex = color.slice(1)
      const num = parseInt(hex, 16)
      const r = Math.max(0, Math.min(255, ((num >> 16) & 0xff) + amount))
      const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount))
      const b = Math.max(0, Math.min(255, (num & 0xff) + amount))
      return `rgb(${r}, ${g}, ${b})`
    }
    return color
  }
  
  // Render reservation as continuous bar
  const renderReservationBar = (reservation: any, room: any, dateStrings: string[]) => {
    const checkIn = moment(reservation.checkIn)
    const checkOut = moment(reservation.checkOut)
    const firstDate = moment(dateStrings[0])
    const lastDate = moment(dateStrings[dateStrings.length - 1])
    
    const checkInStr = checkIn.format("YYYY-MM-DD")
    const checkOutStr = checkOut.format("YYYY-MM-DD")
    const viewStart = dateStrings[0]
    const viewEnd = dateStrings[dateStrings.length - 1]
    
    // Find where reservation appears in current view
    let startIndex = dateStrings.indexOf(checkInStr)
    let endIndex = dateStrings.indexOf(checkOutStr) - 1
    
    // If check-in is before view start, clip to view start
    if (startIndex === -1) {
      // Check if reservation spans into current view
      if (checkInStr < viewStart && checkOutStr > viewStart) {
        // Reservation started before view but extends into it
        startIndex = 0
      } else {
        // Reservation is completely outside view
        return null
      }
    }
    
    // If check-out is after view end, clip to view end
    if (endIndex === -2 || endIndex >= dateStrings.length) {
      // Check if checkout is after view
      if (checkOutStr > viewEnd) {
        endIndex = dateStrings.length - 1
      }
    }
    
    // If endIndex is still -1 (checkout same as view start day), set to startIndex
    if (endIndex < startIndex) endIndex = startIndex
    
    const spanLength = endIndex - startIndex + 1
    
    if (spanLength <= 0) return null
    
    // Flags for visual indicators
    const startsBeforeView = checkInStr < viewStart
    const endsAfterView = checkOutStr > viewEnd
    
    const nights = checkOut.diff(checkIn, 'days')
    const isNoShow = reservation.status === 'NO_SHOW'
    const reservationStyle = getReservationStyle(reservation)
    
    // Calculate day width for perfect alignment
    const dayWidth = 100 / dateStrings.length
    const leftPercent = startIndex * dayWidth
    const widthPercent = spanLength * dayWidth
    const backgroundColor = reservationStyle.background || '#3b82f6'
    
    // Load folio for this reservation (synchronous check)
    let folio: any = null
    let roomChargePosted = false
    
    if (typeof window !== 'undefined') {
      const folios = JSON.parse(localStorage.getItem('hotelFolios') || '[]')
      folio = folios.find((f: any) => f.reservationId === reservation.id)
      
      // Check if room charge posted for today
      if (folio) {
        const today = moment().format('YYYY-MM-DD')
        roomChargePosted = folio.transactions.some((t: any) => 
          t.nightAuditDate === today && 
          t.category === 'room' &&
          t.type === 'charge'
        )
      }
    }
    
    const isDraggingThis = isDragging && draggedReservation?.id === reservation.id
    const isResizingThis = isResizing && draggedReservation?.id === reservation.id
    const canDragResize = (reservation.status === 'CONFIRMED' || reservation.status === 'CHECKED_IN') && 
                          canEditReservation(reservation, 'edit')
    
    // Calculate resize preview dimensions
    let previewLeft = leftPercent
    let previewWidth = widthPercent
    if (isResizingThis && resizePreview) {
      if (isResizing === 'left' && resizePreview.checkIn) {
        const newCheckInIndex = dateStrings.indexOf(resizePreview.checkIn)
        if (newCheckInIndex >= 0) {
          previewLeft = newCheckInIndex * dayWidth
          previewWidth = (endIndex - newCheckInIndex + 1) * dayWidth
        }
      } else if (isResizing === 'right' && resizePreview.checkOut) {
        // Visual shows last night, not checkout day
        const lastNightDate = moment(resizePreview.checkOut).subtract(1, 'day').format('YYYY-MM-DD')
        const newCheckOutIndex = dateStrings.indexOf(lastNightDate)
        if (newCheckOutIndex >= 0) {
          previewWidth = (newCheckOutIndex - startIndex + 1) * dayWidth
        }
      }
    }
    
    return (
      <>
        {/* Resize Preview */}
        {isResizingThis && resizePreview && (
          <div
            className="absolute top-[8px] h-[40px] rounded-lg resize-preview pointer-events-none"
            style={{
              left: `${previewLeft}%`,
              width: `${previewWidth}%`,
              minWidth: '60px',
              zIndex: 15, // Between reservation bars (z-10) and headers (z-30)
            }}
          />
        )}
        
        <div
          key={reservation.id}
          data-reservation-id={reservation.id}
            className={`
            absolute top-[8px]
            h-[40px] 
            rounded-lg
            flex items-center
            text-white
            reservation-bar
            ${isNoShow ? 'reservation-no-show' : ''}
            ${reservation.status === 'CONFIRMED' ? 'status-confirmed' : ''}
            ${reservation.status === 'CHECKED_IN' ? 'status-checked-in' : ''}
            ${reservation.status === 'CHECKED_OUT' ? 'status-checked-out' : ''}
            ${startsBeforeView ? 'rounded-l-none border-l-4 border-l-white/50' : ''}
            ${endsAfterView ? 'rounded-r-none border-r-4 border-r-white/50' : ''}
            ${isDraggingThis ? 'dragging' : ''}
            ${calendarSettings.enableDragDrop && canDragResize ? 'cursor-grab' : 'cursor-pointer'}
            ${isDraggingThis ? 'cursor-grabbing' : ''}
          `}
          style={{
            left: `${leftPercent}%`,
            width: `${widthPercent}%`,
            background: isNoShow ? undefined : `linear-gradient(135deg, ${backgroundColor} 0%, ${adjustColor(backgroundColor, -20)} 100%)`,
            pointerEvents: 'auto',
            minWidth: '60px',
            zIndex: 10, // Lower than header's z-30
            ...(reservationStyle.opacity && { opacity: reservationStyle.opacity }),
            ...(isDraggingThis && { opacity: 0.7, transform: 'scale(1.02)', zIndex: 100 }),
          }}
          onMouseDown={(e) => {
            if (calendarSettings.enableDragDrop && canDragResize && e.button === 0) {
              handleDragStart(e, reservation)
            }
          }}
          onClick={(e) => {
            // Only trigger click if we didn't drag (check if mouse moved significantly)
            const moved = Math.abs(dragCurrentPos.x - dragStartPos.x) > dragThreshold || 
                         Math.abs(dragCurrentPos.y - dragStartPos.y) > dragThreshold
            if (!moved && !isDraggingThis) {
              e.stopPropagation()
              setSelectedReservation(reservation)
              setShowDetails(true)
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleRightClick(e, reservation)
          }}
          onDoubleClick={(e) => {
            e.stopPropagation()
            handleDoubleClick(reservation)
          }}
          title={`${reservation.guestName} - ${nights} ღამე${isNoShow ? ' (NO-SHOW)' : ''}${folio ? ` | Balance: ₾${Number(folio.balance || 0).toFixed(2)}` : ''}${canDragResize ? ' | Drag to move, resize edges to change dates' : ''}`}
        >
        {/* Status Icon */}
        <div className="w-8 h-full flex items-center justify-center bg-black/10 rounded-l-lg">
          {reservation.status === 'CONFIRMED' && <span className="text-sm">📅</span>}
          {reservation.status === 'CHECKED_IN' && <span className="text-sm">✅</span>}
          {reservation.status === 'CHECKED_OUT' && <span className="text-sm">🚪</span>}
          {isNoShow && <span className="text-sm">❌</span>}
        </div>
        
        {/* Guest Info */}
        <div className="flex-1 px-2 overflow-hidden">
          <div className={`text-sm font-semibold truncate ${isNoShow ? 'line-through opacity-70' : ''}`}>
            {calendarSettings.showRoomNumbers && reservation.roomNumber && (
              <span className="mr-1">#{reservation.roomNumber}</span>
            )}
            {reservation.guestName?.split(' ')[0] || 'Guest'}
          </div>
          <div className="flex items-center gap-2 text-[10px] opacity-80">
            {spanLength > 2 && (
              <span>{nights} ღამე</span>
            )}
            {calendarSettings.showGuestCount && reservation.guestCount && (
              <span>👥 {reservation.guestCount}</span>
            )}
            {calendarSettings.showPrices && reservation.totalAmount && (
              <span className="font-bold">₾{Number(reservation.totalAmount || 0).toFixed(0)}</span>
            )}
          </div>
        </div>
        
        {/* Balance Badge */}
        {calendarSettings.showPrices && folio && folio.balance > 0 && (
          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-lg balance-badge border-2 border-white">
            ₾{Math.abs(Number(folio.balance || 0)).toFixed(0)}
          </div>
        )}
        
        {/* Paid Badge */}
        {calendarSettings.showPrices && folio && folio.balance <= 0 && (
          <div className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] w-5 h-5 rounded-full font-bold shadow-lg flex items-center justify-center border-2 border-white">
            ✓
          </div>
        )}
        
        {/* Room Charge Posted Indicator */}
        {roomChargePosted && (
          <div className="absolute bottom-0 right-1 text-[10px]" title="Room charge posted">
            💰
          </div>
        )}
        
        {/* Resize Handles */}
        {canDragResize && !isDraggingThis && calendarSettings.enableResize && (
          <>
            <div 
              className="resize-handle-left"
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleResizeStart(e, reservation, 'left')
              }}
            />
            <div 
              className="resize-handle-right"
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleResizeStart(e, reservation, 'right')
              }}
            />
          </>
        )}
      </div>
      </>
    )
  }
  
  // Handle reservation click
  const handleReservationClick = (reservation: any) => {
    // Check if reservation date is in closed period
    const lastAuditDate = typeof window !== 'undefined' ? localStorage.getItem('lastAuditDate') : null
    
    if (lastAuditDate) {
      try {
        const lastClosed = JSON.parse(lastAuditDate)
        
        // If check-in or any day of reservation is on/before closed date
        if (moment(reservation.checkIn).isSameOrBefore(lastClosed, 'day')) {
          // Show details only - no editing
          setViewOnlyReservation(reservation)
          setShowViewOnlyModal(true)
          return
        }
      } catch (error) {
        console.error('Error parsing lastAuditDate:', error)
      }
    }
    
    // Normal edit for future reservations
    setSelectedReservation(reservation)
    setShowDetails(true)
  }
  
  // Check if room should be OCCUPIED today
  const getRoomCurrentStatus = (room: any) => {
    // If room is in maintenance (from localStorage), return MAINTENANCE
    if (isRoomInMaintenance(room.id)) {
      return 'MAINTENANCE'
    }
    
    // If room status is MAINTENANCE, return MAINTENANCE
    if (room.status === 'MAINTENANCE') {
      return 'MAINTENANCE'
    }
    
    // Use Business Day instead of today
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
    
    // Check if any CHECKED_IN reservation exists for business day
    const hasCheckedInGuest = reservations.some(res => {
      const checkIn = moment(res.checkIn).format('YYYY-MM-DD')
      const checkOut = moment(res.checkOut).format('YYYY-MM-DD')
      
      return res.roomId === room.id && 
             res.status === 'CHECKED_IN' &&
             businessDay >= checkIn && 
             businessDay < checkOut
    })
    
    if (hasCheckedInGuest) return 'OCCUPIED'
    
    // Check if room is in cleaning
    if (room.status === 'CLEANING') return 'CLEANING'
    
    // Otherwise use actual room status from database
    return room.status || 'VACANT'
  }
  
  return (
    <>
      {/* Calendar Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        /* Calendar Grid Styles */
        .room-calendar-grid {
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 #f1f5f9;
        }
        .room-calendar-grid::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .room-calendar-grid::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }
        .room-calendar-grid::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .room-calendar-grid::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        
        /* Sticky Headers */
        .sticky-room-header {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          box-shadow: 2px 0 8px rgba(0,0,0,0.05);
        }
        
        /* Reservation Bar Styles */
        .reservation-bar {
          transition: all 0.2s ease;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .reservation-bar:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          z-index: 20 !important;
        }
        
        /* No-Show Pattern */
        .reservation-no-show {
          background: repeating-linear-gradient(
            45deg,
            #fee2e2,
            #fee2e2 8px,
            #fca5a5 8px,
            #fca5a5 16px
          ) !important;
          opacity: 0.8;
        }
        .reservation-no-show .line-through {
          text-decoration: line-through;
        }
        
        /* Status Colors */
        .status-confirmed { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); }
        .status-checked-in { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
        .status-checked-out { background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); }
        .status-cancelled { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }
        
        /* Date Cell Hover */
        .date-cell {
          transition: background-color 0.15s ease;
        }
        .date-cell:hover:not(.closed-date) {
          background-color: #dbeafe !important;
        }
        
        /* Today Highlight */
        .today-column {
          background: linear-gradient(180deg, #dbeafe 0%, #eff6ff 100%);
          position: relative;
        }
        .today-column::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #3b82f6 0%, #2563eb 100%);
        }
        
        /* Weekend Columns */
        .weekend-column {
          background-color: #fafafa;
        }
        
        /* Room Row Hover */
        .room-row:hover .sticky-room-header {
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
        }
        
        /* Balance Badge Animation */
        .balance-badge {
          animation: pulse-soft 2s infinite;
        }
        @keyframes pulse-soft {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        
        /* Sticky Floor Header */
        .sticky-floor-row {
          position: sticky;
          top: 41px; /* Header height */
          z-index: 15;
          background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        /* Room Name Cell - Different background */
        .room-name-cell {
          background: linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%) !important;
          color: white !important;
        }
        
        .room-name-cell .room-number {
          color: white;
          font-weight: bold;
        }
        
        .room-name-cell .room-type {
          color: rgba(255,255,255,0.8);
        }
        
        .room-name-cell .room-status {
          background: rgba(255,255,255,0.2);
          color: white;
        }
        
        /* Taller room rows */
        .room-row-tall {
          height: 70px !important;
        }
        
        .room-row-tall td {
          height: 70px !important;
        }
        
        /* Resize Handles */
        .resize-handle-left,
        .resize-handle-right {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 8px;
          cursor: ew-resize;
          opacity: 0;
          transition: opacity 0.2s;
          z-index: 15;
        }
        .reservation-bar:hover .resize-handle-left,
        .reservation-bar:hover .resize-handle-right {
          opacity: 1;
          background: rgba(255,255,255,0.3);
        }
        .resize-handle-left { 
          left: 0; 
          border-radius: 8px 0 0 8px; 
        }
        .resize-handle-right { 
          right: 0; 
          border-radius: 0 8px 8px 0; 
        }
        
        /* Drag Ghost */
        .dragging {
          opacity: 0.7 !important;
          transform: scale(1.02) !important;
          box-shadow: 0 8px 20px rgba(0,0,0,0.3) !important;
          z-index: 100 !important;
        }
        
        /* Drop Zone */
        .drop-zone-valid {
          background: rgba(16, 185, 129, 0.2) !important;
          border: 2px dashed #10b981 !important;
          border-radius: 4px;
        }
        .drop-zone-invalid {
          background: rgba(239, 68, 68, 0.2) !important;
          border: 2px dashed #ef4444 !important;
          border-radius: 4px;
        }
        
        /* Resize Preview */
        .resize-preview {
          position: absolute;
          top: 0;
          height: 100%;
          background: rgba(59, 130, 246, 0.3);
          border: 2px dashed #3b82f6;
          pointer-events: none;
          z-index: 20;
        }
      `}} />
      
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header with controls */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b py-2 px-4">
        <div className="flex justify-between items-center gap-4">
          {/* Left - Search & Filters */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="relative">
              <input
                type="text"
                placeholder="🔍 ძებნა... (სტუმარი, ოთახი, ჯავშანი)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-1.5 border rounded-lg bg-white w-48 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                  title="გასუფთავება"
                >
                  ✕
                </button>
              )}
            </div>
            
            <select
              value={selectedRoomType}
              onChange={(e) => setSelectedRoomType(e.target.value)}
              className="px-3 py-1.5 border rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">🏠 ყველა ტიპი</option>
              {Array.from(new Set(rooms.map(r => r.roomType || r.type).filter(Boolean))).map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            
            <button
              onClick={() => setShowOccupancy(!showOccupancy)}
              className={`px-3 py-1.5 border rounded-lg transition text-sm flex items-center gap-2 ${
                showOccupancy 
                  ? 'bg-blue-500 text-white border-blue-600' 
                  : 'bg-white hover:bg-gray-50'
              }`}
            >
              📊 დაკავებულობა
              {showOccupancy && <span className="text-xs">✓</span>}
            </button>
            
            {/* Filter results count */}
            {(searchTerm || selectedRoomType !== 'all' || showOccupancy) && (
              <div className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded">
                {filteredRooms.length} ოთახი
              </div>
            )}
          </div>
          
          {/* Center - Date Picker */}
          <div className="relative flex-1 flex justify-center date-picker-container">
            <button 
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border rounded-lg hover:bg-gray-50 transition shadow-sm calendar-icon"
              data-testid="date-picker-button"
            >
              <span className="text-lg">📅</span>
              <span className="font-medium text-sm">
                {moment(currentDate).format('DD MMMM YYYY')}
              </span>
              <span className="text-gray-400 text-xs">▼</span>
            </button>
            
            {/* Date Picker Dropdown */}
            {showDatePicker && (
              <div 
                className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white rounded-xl shadow-2xl border p-4 z-50 min-w-[300px] date-picker"
                data-testid="date-picker"
              >
                {/* Quick Select */}
                <div className="mb-4">
                  <div className="text-xs font-medium text-gray-500 mb-2">სწრაფი არჩევა</div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => {
                        setCurrentDate(new Date())
                        setShowDatePicker(false)
                      }}
                      className="px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"
                    >
                      დღეს
                    </button>
                    <button
                      onClick={() => {
                        const tomorrow = new Date()
                        tomorrow.setDate(tomorrow.getDate() + 1)
                        setCurrentDate(tomorrow)
                        setShowDatePicker(false)
                      }}
                      className="px-3 py-2 text-sm bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition"
                    >
                      ხვალ
                    </button>
                    <button
                      onClick={() => {
                        const nextWeek = new Date()
                        nextWeek.setDate(nextWeek.getDate() + 7)
                        setCurrentDate(nextWeek)
                        setShowDatePicker(false)
                      }}
                      className="px-3 py-2 text-sm bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition"
                    >
                      +1 კვირა
                    </button>
                  </div>
                </div>
                
                {/* Month/Year Selection */}
                <div className="mb-4">
                  <div className="text-xs font-medium text-gray-500 mb-2">თვე და წელი</div>
                  <div className="flex gap-2">
                    <select
                      value={currentDate.getMonth()}
                      onChange={(e) => {
                        const newDate = new Date(currentDate)
                        newDate.setMonth(parseInt(e.target.value))
                        setCurrentDate(newDate)
                      }}
                      className="flex-1 border rounded-lg px-3 py-2 text-sm"
                    >
                      <option value={0}>იანვარი</option>
                      <option value={1}>თებერვალი</option>
                      <option value={2}>მარტი</option>
                      <option value={3}>აპრილი</option>
                      <option value={4}>მაისი</option>
                      <option value={5}>ივნისი</option>
                      <option value={6}>ივლისი</option>
                      <option value={7}>აგვისტო</option>
                      <option value={8}>სექტემბერი</option>
                      <option value={9}>ოქტომბერი</option>
                      <option value={10}>ნოემბერი</option>
                      <option value={11}>დეკემბერი</option>
                    </select>
                    <select
                      value={currentDate.getFullYear()}
                      onChange={(e) => {
                        const newDate = new Date(currentDate)
                        newDate.setFullYear(parseInt(e.target.value))
                        setCurrentDate(newDate)
                      }}
                      className="w-24 border rounded-lg px-3 py-2 text-sm"
                    >
                      {[2024, 2025, 2026, 2027].map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {/* Mini Calendar */}
                <div className="mb-4">
                  <div className="text-xs font-medium text-gray-500 mb-2">კალენდარი</div>
                  <div className="grid grid-cols-7 gap-1 text-center text-xs">
                    {['ორ', 'სა', 'ოთ', 'ხუ', 'პა', 'შა', 'კვ'].map(day => (
                      <div key={day} className="py-1 text-gray-400 font-medium">{day}</div>
                    ))}
                    {(() => {
                      const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
                      const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
                      const startPadding = (firstDay.getDay() + 6) % 7 // Monday = 0
                      const days = []
                      
                      // Padding
                      for (let i = 0; i < startPadding; i++) {
                        days.push(<div key={`pad-${i}`} className="py-1"></div>)
                      }
                      
                      // Days
                      for (let d = 1; d <= lastDay.getDate(); d++) {
                        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), d)
                        const isToday = moment(date).format('YYYY-MM-DD') === moment().format('YYYY-MM-DD')
                        const isSelected = moment(date).format('YYYY-MM-DD') === moment(currentDate).format('YYYY-MM-DD')
                        
                        days.push(
                          <button
                            key={d}
                            onClick={() => {
                              setCurrentDate(date)
                              setShowDatePicker(false)
                            }}
                            className={`py-1 rounded-lg transition ${
                              isSelected ? 'bg-blue-500 text-white' :
                              isToday ? 'bg-blue-100 text-blue-600' :
                              'hover:bg-gray-100'
                            }`}
                          >
                            {d}
                          </button>
                        )
                      }
                      
                      return days
                    })()}
                  </div>
                </div>
                
                {/* Date Input */}
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-2">თარიღის შეყვანა</div>
                  <input
                    type="date"
                    value={moment(currentDate).format('YYYY-MM-DD')}
                    onChange={(e) => {
                      if (e.target.value) {
                        setCurrentDate(new Date(e.target.value))
                        setShowDatePicker(false)
                      }
                    }}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    data-testid="date-picker-input"
                  />
                </div>
                
                {/* Close button */}
                <button
                  onClick={() => setShowDatePicker(false)}
                  className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
          
          {/* Right - Navigation & View Toggle */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button 
              onClick={() => {
                const newDate = new Date(currentDate)
                newDate.setDate(currentDate.getDate() - (view === 'week' ? 7 : 30))
                setCurrentDate(newDate)
              }}
              className="p-1.5 bg-white border rounded-lg hover:bg-gray-50 transition shadow-sm"
              title="წინა"
            >
              <span className="text-gray-600 text-sm">◀</span>
            </button>
            
            <button 
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition shadow-sm font-medium text-sm"
            >
              დღეს
            </button>
            
            <button 
              onClick={() => {
                const newDate = new Date(currentDate)
                newDate.setDate(currentDate.getDate() + (view === 'week' ? 7 : 30))
                setCurrentDate(newDate)
              }}
              className="p-1.5 bg-white border rounded-lg hover:bg-gray-50 transition shadow-sm"
              title="შემდეგი"
            >
              <span className="text-gray-600 text-sm">▶</span>
            </button>
            
            <div className="flex bg-white border rounded-lg p-0.5 shadow-sm">
              <button
                onClick={() => setView('week')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  view === 'week' 
                    ? 'bg-blue-500 text-white shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                კვირა
              </button>
              <button
                onClick={() => setView('month')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  view === 'month' 
                    ? 'bg-blue-500 text-white shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                თვე
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Calendar Grid */}
      <div 
        ref={calendarRef}
        className="overflow-auto room-calendar-grid" 
        style={{ 
          maxHeight: 'calc(100vh - 350px)',
          minHeight: '400px'
        }}
      >
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-30 bg-white shadow-sm">
            <tr>
              <th className="border-b border-r border-gray-200 p-3 text-left sticky left-0 z-30 min-w-[130px] sticky-room-header bg-white">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏨</span>
                  <div>
                    <div className="font-bold text-gray-700">ოთახები</div>
                    <div className="text-[10px] text-gray-400 font-normal">
                      {filteredRooms.length} {filteredRooms.length !== rooms.length ? `/${rooms.length} ` : ''}ოთახი
                      {(searchTerm || selectedRoomType !== 'all' || showOccupancy) && (
                        <span className="text-blue-500 ml-1">(ფილტრი)</span>
                      )}
                    </div>
                  </div>
                </div>
              </th>
              {dates.map((date, i) => {
                const isToday = moment(date).format('YYYY-MM-DD') === moment(today).format('YYYY-MM-DD')
                const isPast = isPastDate(date)
                const isWeekend = [0, 6].includes(moment(date).day())
                const dayName = moment(date).format('ddd')
                const dayNum = moment(date).format('DD')
                const monthName = moment(date).format('MMM')
                
                return (
                  <th 
                    key={i} 
                    className={`border-b border-r border-gray-200 p-2 min-w-[90px] text-center transition-colors relative bg-white ${
                      isToday ? 'today-column' : 
                      isPast ? 'bg-gray-100' : 
                      isWeekend ? 'weekend-column' :
                      'bg-white'
                    }`}
                  >
                    <div className={`text-[10px] uppercase tracking-wide mb-0.5 font-medium ${
                      isToday ? 'text-blue-600 font-semibold' : 
                      isWeekend ? 'text-red-400' :
                      'text-gray-500'
                    }`}>
                      {dayName}
                    </div>
                    <div className={`text-lg font-bold ${
                      isToday ? 'text-blue-600' : 
                      isPast ? 'text-gray-400' :
                      'text-gray-900'
                    }`}>
                      {dayNum}
                    </div>
                    {(i === 0 || dayNum === '01') && (
                      <div className="text-[9px] text-gray-500 mt-0.5">{monthName}</div>
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {roomsByFloor.map(({ floor, floorName, rooms: floorRooms }) => {
              const isCollapsed = collapsedFloors.includes(floor)
              const floorOccupied = floorRooms.filter(r => getRoomCurrentStatus(r) === 'OCCUPIED').length
              const floorTotal = floorRooms.length
              
              return (
                <React.Fragment key={`floor-${floor}`}>
                  {/* Floor Header Row - STICKY TOP */}
                  {calendarSettings.showFloors && (
                  <tr className="sticky-floor-row">
                    {/* Sticky Floor Label (left) */}
                    <td 
                      className="border-b border-t border-gray-400 py-3 px-3 sticky left-0 z-25 bg-gradient-to-r from-slate-200 to-slate-300"
                      style={{ minWidth: '140px' }}
                    >
                      <button
                        onClick={() => toggleFloor(floor)}
                        className="flex items-center gap-2 w-full text-left"
                      >
                        <span className={`text-gray-600 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-90'}`}>
                          ▶
                        </span>
                        <span className="text-xl">
                          {floor === '1' ? '🏢' : floor === '2' ? '🏬' : floor === '3' ? '🏛️' : '🏗️'}
                        </span>
                        <span className="font-bold text-gray-800 text-sm">
                          {floorName}
                        </span>
                      </button>
                    </td>
                    
                    {/* Stats Row */}
                    <td 
                      colSpan={dates.length}
                      className="border-b border-t border-gray-400 py-3 px-4 bg-gradient-to-r from-slate-100 to-slate-200"
                    >
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-600 font-medium">
                          📊 {floorTotal} ოთახი
                        </span>
                        <span className="px-2.5 py-1 bg-red-500 text-white rounded-full text-xs font-medium shadow-sm">
                          {floorOccupied} დაკავებული
                        </span>
                        <span className="px-2.5 py-1 bg-green-500 text-white rounded-full text-xs font-medium shadow-sm">
                          {floorTotal - floorOccupied} თავისუფალი
                        </span>
                      </div>
                    </td>
                  </tr>
                  )}
                  
                  {/* Room Rows (if not collapsed or if floors are hidden) */}
                  {(!calendarSettings.showFloors || !isCollapsed) && floorRooms.map((room) => {
                    const dateStrings = dates.map(d => moment(d).format('YYYY-MM-DD'))
                    const roomReservations = getActiveReservations(
                      reservations.filter((res: any) => res.roomId === room.id)
                    )
                    
                    return (
                      <tr key={room.id} className="room-row-tall hover:bg-blue-50/30 transition-colors">
                  {/* Room Name Cell - DARK BACKGROUND */}
                  <td 
                    className="border-r border-b border-gray-300 px-3 py-2 sticky left-0 z-10 room-name-cell"
                    style={{ minWidth: '140px', height: '70px' }}
                  >
                    <div className="flex items-center gap-3 h-full">
                      {/* Room Number Badge */}
                      {(() => {
                        const roomTypeValue = room.type || room.roomType || 'Standard'
                        return (
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold shadow-md ${
                            roomTypeValue === 'Suite' ? 'bg-gradient-to-br from-amber-400 to-amber-600' :
                            roomTypeValue === 'Deluxe' ? 'bg-gradient-to-br from-purple-400 to-purple-600' :
                            'bg-gradient-to-br from-blue-400 to-blue-600'
                          }`}>
                            {room.roomNumber}
                          </div>
                        )
                      })()}
                      
                      {/* Room Info */}
                      <div className="flex flex-col justify-center">
                        <span className="text-sm font-medium text-white/90">
                          {room.type || room.roomType || 'Standard'}
                        </span>
                        {(() => {
                          const displayStatus = getRoomCurrentStatus(room)
                          const statusColors: any = {
                            'OCCUPIED': 'bg-red-500/80',
                            'VACANT': 'bg-green-500/80',
                            'CLEANING': 'bg-yellow-500/80',
                            'MAINTENANCE': 'bg-orange-500/80'
                          }
                          const statusLabels: any = {
                            'OCCUPIED': '🔴 დაკავებული',
                            'VACANT': '🟢 თავისუფალი',
                            'CLEANING': '🟡 სუფთავდება',
                            'MAINTENANCE': '🟠 რემონტი'
                          }
                          return (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium mt-1 ${statusColors[displayStatus] || 'bg-gray-500/80'} text-white`}>
                              {statusLabels[displayStatus] || displayStatus}
                            </span>
                          )
                        })()}
                        {/* {room.basePrice && (
                          <span className="text-[10px] text-green-300 mt-0.5">
                            ₾{room.basePrice}/ღამე
                          </span>
                        )} */}
                      </div>
                    </div>
                  </td>
                  
                  {/* Calendar Cells */}
                  <td colSpan={dates.length} className="border-b border-r bg-white" style={{ 
                    height: '70px', 
                    overflow: 'hidden', 
                    position: 'relative', 
                    isolation: 'isolate',
                    contain: 'paint'
                  }}>
                    {/* Background cells for clicking */}
                    <div className="absolute inset-0 flex">
                      {dates.map((date, idx) => {
                        const isPast = isPastDate(date)
                        const dateStr = moment(date).format('YYYY-MM-DD')
                        const blockedKey = `${room.id}_${dateStr}`
                        const isBlocked = blockedDates[blockedKey] || isRoomInMaintenance(room.id) || room.status === 'MAINTENANCE'
                        const hasReservation = getReservationsForRoomAndDate(room.id, date).length > 0
                        const isClosed = !canBookOnDate(date)
                        
                        const isToday = dateStr === moment(today).format('YYYY-MM-DD')
                        const isWeekend = [0, 6].includes(moment(date).day())
                        const cellBgColor = getCellBackgroundColor(dateStr)
                        
                        return (
                          <div
                            key={idx}
                            data-room-id={room.id}
                            data-date={dateStr}
                            className={`flex-1 border-r border-gray-100 date-cell relative ${
                              isClosed
                                ? 'closed-date bg-gray-100/80 cursor-not-allowed' 
                                : isBlocked 
                                ? 'bg-red-100 cursor-not-allowed' 
                                : isToday
                                ? 'bg-blue-50/50'
                                : isWeekend
                                ? 'bg-gray-50/50'
                                : hasReservation
                                ? 'cursor-pointer'
                                : 'hover:bg-blue-50 cursor-pointer'
                            } ${
                              dropTarget?.roomId && String(dropTarget.roomId) === String(room.id) && dropTarget?.date === dateStr && draggedReservation
                                ? validateDrop(dropTarget, draggedReservation)
                                  ? 'drop-zone-valid'
                                  : 'drop-zone-invalid'
                                : ''
                            }`}
                            onClick={(e) => {
                              e.stopPropagation()
                              const dateStr = moment(date).format('YYYY-MM-DD')
                              // Check if date is closed (before or on last audit)
                              const isClosed = isClosedDay(date)
                              
                              if (canBookOnDate(date) && !isClosed) {
                                const hasReservation = getReservationsForRoomAndDate(room.id, date).length > 0
                                if (!hasReservation && !isBlocked) {
                                  handleSlotClick(room.id, date)
                                }
                              }
                            }}
                            onContextMenu={(e) => {
                              const isClosed = isClosedDay(date)
                              if (!isClosed && !hasReservation && canBookOnDate(date)) {
                                handleEmptyCellRightClick(e, room.id, date)
                              }
                            }}
                            onMouseEnter={(e) => handleCellMouseEnter(e, dateStr, room)}
                            onMouseLeave={handleCellMouseLeave}
                          >
                            {/* Season/Special Date Background Color Overlay */}
                            {cellBgColor && !isClosed && !isBlocked && !hasReservation && (
                              <div 
                                className="absolute inset-0 pointer-events-none z-0"
                                style={{ 
                                  backgroundColor: cellBgColor.color,
                                  opacity: cellBgColor.opacity,
                                  zIndex: 0
                                }}
                              />
                            )}
                            
                            {/* Show blocked indicator */}
                            {isBlocked && !hasReservation && !isClosed && (
                              <div className="h-full flex items-center justify-center relative z-5">
                                <span className="text-red-500 text-xs font-bold">BLOCKED</span>
                              </div>
                            )}
                            {/* Show closed indicator */}
                            {isClosed && !hasReservation && (
                              <div className="h-full flex items-center justify-center relative z-5">
                                <span className="text-gray-300 text-[10px]">🔒</span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    
                    {/* Render continuous reservation bars */}
                    <div className="absolute inset-0 overflow-hidden" style={{ pointerEvents: 'none' }} key={folioUpdateKey}>
                      {roomReservations.map((res: any) => (
                        <React.Fragment key={res.id}>
                          {renderReservationBar(res, room, dateStrings)}
                        </React.Fragment>
                      ))}
                    </div>
                  </td>
                </tr>
              )
            })}
          </React.Fragment>
        )
      })}
          </tbody>
        </table>
      </div>
      
      {/* Season Legend */}
      {calendarSettings.showSeasonColors && seasons.filter(s => s.active).length > 0 && (
        <div className="flex items-center gap-4 mt-2 px-4 py-2 bg-gray-50 rounded-lg text-xs flex-wrap">
          <span className="text-gray-500 font-medium">სეზონები:</span>
          {seasons.filter(s => s.active).map(season => (
            <div key={season.id} className="flex items-center gap-1">
              <div 
                className="w-3 h-3 rounded"
                style={{ backgroundColor: season.color }}
              />
              <span>{season.name}</span>
              <span className="text-gray-400">
                ({season.priceModifier > 0 ? '+' : ''}{season.priceModifier}%)
              </span>
            </div>
          ))}
        </div>
      )}
      
      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50 min-w-[200px] max-h-[80vh] overflow-y-auto"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.items ? (
            // Empty cell context menu (block/unblock)
            contextMenu.items.map((item, idx) => (
              <button
                key={idx}
                onClick={item.action}
                className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-sm transition"
              >
                <span>{item.label}</span>
              </button>
            ))
          ) : selectedReservation ? (() => {
            // Check closed dates for this reservation
            const lastAuditDate = typeof window !== 'undefined' ? localStorage.getItem('lastNightAuditDate') : null
            const checkInDate = moment(selectedReservation.checkIn).format('YYYY-MM-DD')
            const checkOutDate = moment(selectedReservation.checkOut).format('YYYY-MM-DD')
            
            const isCheckInClosed = lastAuditDate && moment(checkInDate).isSameOrBefore(lastAuditDate)
            const isCheckOutClosed = lastAuditDate && moment(checkOutDate).isSameOrBefore(lastAuditDate)
            
            return (
              // Reservation context menu
              <>
                <div className="px-3 py-2 border-b border-gray-200">
                  <div className="font-semibold text-sm">{selectedReservation?.guestName}</div>
                  <div className="text-xs text-gray-500">Room {selectedReservation?.roomNumber}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {selectedReservation?.status === 'CONFIRMED' && '📅 დადასტურებული'}
                    {selectedReservation?.status === 'CHECKED_IN' && '✅ Check In გაკეთებულია'}
                    {selectedReservation?.status === 'CHECKED_OUT' && '🚪 Check Out გაკეთებულია'}
                    {selectedReservation?.status === 'CANCELLED' && '❌ გაუქმებული'}
                    {selectedReservation?.status === 'NO_SHOW' && '❌ NO-SHOW'}
                  </div>
                  {(isCheckInClosed || isCheckOutClosed) && (
                    <div className="text-xs text-orange-600 mt-1 font-medium">
                      ⚠️ {isCheckInClosed ? 'Check-in' : 'Check-out'} date closed
                    </div>
                  )}
                </div>
                
                {/* View Details - ALWAYS ALLOWED */}
                <button
                  onClick={() => handleReservationAction('view-details', selectedReservation)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-sm transition"
                >
                  <span>👁️</span> ნახვა დეტალები <span className="text-green-600 text-xs">✓</span>
                </button>
                
                {/* Check-in - BLOCKED on closed dates */}
                {selectedReservation?.status === 'CONFIRMED' && (
                  <button
                    onClick={() => handleReservationAction('check-in', selectedReservation)}
                    disabled={!!isCheckInClosed}
                    className={`w-full px-3 py-2 text-left flex items-center gap-2 text-sm transition ${
                      isCheckInClosed 
                        ? 'opacity-50 cursor-not-allowed text-gray-400' 
                        : 'hover:bg-green-50 text-green-600'
                    }`}
                  >
                    <span>{isCheckInClosed ? '🔒' : '✅'}</span> 
                    Check In {isCheckInClosed && <span className="text-xs">(დახურული)</span>}
                  </button>
                )}
                
                {/* Check-out - ALWAYS ALLOWED */}
                {selectedReservation?.status === 'CHECKED_IN' && (
                  <button
                    onClick={() => handleReservationAction('check-out', selectedReservation)}
                    className="w-full px-3 py-2 text-left hover:bg-blue-50 flex items-center gap-2 text-sm text-blue-600 transition font-medium"
                  >
                    <span>🚪</span> Check Out <span className="text-green-600 text-xs">✓</span>
                  </button>
                )}
                
                {/* Payment - ALWAYS ALLOWED */}
                <button
                  onClick={() => handleReservationAction('payment', selectedReservation)}
                  className="w-full px-3 py-2 text-left hover:bg-blue-50 flex items-center gap-2 text-sm text-blue-700 transition"
                >
                  <span>💳</span> გადახდა <span className="text-green-600 text-xs">✓</span>
                </button>
                
                <div className="border-t border-gray-200 my-1"></div>
                
                {/* View Folio - For CHECKED_IN or CONFIRMED */}
                {(selectedReservation?.status === 'CHECKED_IN' || selectedReservation?.status === 'CONFIRMED') && (
                  <button
                    onClick={() => {
                      setShowFolioModal(true)
                      setContextMenu(null)
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-purple-50 flex items-center gap-2 text-sm text-purple-700 transition"
                  >
                    <span>💰</span> View Folio
                  </button>
                )}
                
                {/* Post Charges - For CHECKED_IN only */}
                {selectedReservation?.status === 'CHECKED_IN' && (
                  <button
                    onClick={() => {
                      setShowExtraChargesModal(true)
                      setContextMenu(null)
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-blue-50 flex items-center gap-2 text-sm text-blue-700 transition"
                  >
                    <span>➕</span> Post Charges
                  </button>
                )}
                
                <div className="border-t border-gray-200 my-1"></div>
                
                {/* Edit - BLOCKED on closed dates */}
                <button
                  onClick={() => handleReservationAction('edit', selectedReservation)}
                  disabled={!!isCheckInClosed}
                  className={`w-full px-3 py-2 text-left flex items-center gap-2 text-sm transition ${
                    isCheckInClosed 
                      ? 'opacity-50 cursor-not-allowed text-gray-400' 
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <span>{isCheckInClosed ? '🔒' : '✏️'}</span> 
                  რედაქტირება {isCheckInClosed && <span className="text-xs">(დახურული)</span>}
                </button>
                
                {/* Mark as NO-SHOW - BLOCKED on closed dates */}
                {selectedReservation?.status === 'CONFIRMED' && 
                 moment(selectedReservation.checkIn).isSameOrBefore(moment(), 'day') && (
                  <button
                    onClick={() => handleReservationAction('no-show', selectedReservation)}
                    disabled={!!isCheckInClosed}
                    className={`w-full px-3 py-2 text-left flex items-center gap-2 text-sm transition ${
                      isCheckInClosed 
                        ? 'opacity-50 cursor-not-allowed text-gray-400' 
                        : 'hover:bg-red-50 text-red-600'
                    }`}
                  >
                    <span>{isCheckInClosed ? '🔒' : '❌'}</span> 
                    Mark as NO-SHOW {isCheckInClosed && <span className="text-xs">(დახურული)</span>}
                  </button>
                )}
                
                {/* Cancel - BLOCKED on closed dates */}
                {selectedReservation?.status !== 'CHECKED_OUT' && 
                 selectedReservation?.status !== 'CANCELLED' && 
                 selectedReservation?.status !== 'NO_SHOW' && (
                  <button
                    onClick={() => handleReservationAction('cancel', selectedReservation)}
                    disabled={!!isCheckInClosed}
                    className={`w-full px-3 py-2 text-left flex items-center gap-2 text-sm transition ${
                      isCheckInClosed 
                        ? 'opacity-50 cursor-not-allowed text-gray-400' 
                        : 'hover:bg-red-50 text-red-600'
                    }`}
                  >
                    <span>{isCheckInClosed ? '🔒' : '🗑️'}</span> 
                    გაუქმება {isCheckInClosed && <span className="text-xs">(დახურული)</span>}
                  </button>
                )}
              </>
            )
          })() : null}
        </div>
      )}
      
      {/* View Only Modal for Closed Day Reservations */}
      {showViewOnlyModal && viewOnlyReservation && (
        <ViewOnlyReservationModal
          reservation={viewOnlyReservation}
          onClose={() => {
            setShowViewOnlyModal(false)
            setViewOnlyReservation(null)
          }}
        />
      )}
      
      {/* Reservation Details Modal */}
      {showDetails && selectedReservation && (
        <ReservationDetails
          reservation={selectedReservation}
          rooms={rooms}
          onClose={() => {
            setShowDetails(false)
            setSelectedReservation(null)
          }}
          onPayment={() => {
            setShowDetails(false)
            setShowPayment(true)
          }}
          onEdit={() => {
            setShowDetails(false)
            setShowEditModal(true)
          }}
          onCheckIn={() => {
            setShowDetails(false)
            handleCheckIn()
          }}
        />
      )}
      
      {/* Enhanced Payment Modal */}
      {showPayment && selectedReservation && (
        <EnhancedPaymentModal
          reservation={selectedReservation}
          onClose={() => {
            setShowPayment(false)
            setSelectedReservation(null)
          }}
          onSuccess={async (result: any) => {
            setShowPayment(false)
            setSelectedReservation(null)
            
            // Refresh if needed
            if (loadReservations) {
              loadReservations()
            }
            
            // Show success message
            if (result.folio) {
              alert(`✅ Payment processed! New balance: ₾${Number(result.folio.balance || 0).toFixed(2)}`)
            } else {
              alert('✅ Payment processed successfully!')
            }
          }}
        />
      )}
      
      {/* Legacy Payment Modal (kept for other uses) */}
      {false && showPayment && selectedReservation && (
        <PaymentModal
          reservation={selectedReservation}
          onClose={() => {
            setShowPayment(false)
            setSelectedReservation(null)
          }}
          onPayment={async (payment: any) => {
            // Check if processing payment on a closed date
            const lastAuditDate = typeof window !== 'undefined' ? localStorage.getItem('lastNightAuditDate') : null
            const checkOutDate = moment(selectedReservation.checkOut).format('YYYY-MM-DD')
            const isClosedDate = lastAuditDate && moment(checkOutDate).isSameOrBefore(lastAuditDate)
            
            // Create payment record with metadata
            const paymentRecord = {
              reservationId: selectedReservation.id,
              amount: payment.paidAmount,
              method: payment.payments?.map((p: any) => p.method).join(', ') || payment.method,
              date: moment().format(), // Today's date
              processedOn: moment().format('YYYY-MM-DD'), // Processing date
              forDate: checkOutDate, // Original reservation date
              note: isClosedDate ? 'Payment processed after Night Audit' : '',
              isPostAudit: isClosedDate,
              payments: payment.payments || [],
              timestamp: new Date().toISOString()
            }
            
            // Save payment record to localStorage (for audit trail)
            if (typeof window !== 'undefined') {
              const paymentHistory = JSON.parse(localStorage.getItem('paymentHistory') || '[]')
              paymentHistory.push({
                ...paymentRecord,
                id: Date.now().toString(),
                guestName: selectedReservation.guestName,
                roomNumber: selectedReservation.roomNumber
              })
              localStorage.setItem('paymentHistory', JSON.stringify(paymentHistory))
            }
            
            // Update reservation
            if (onReservationUpdate) {
              await onReservationUpdate(selectedReservation.id, {
                isPaid: payment.isPaid,
                paidAmount: payment.paidAmount,
                remainingAmount: payment.remainingAmount,
                paymentMethod: payment.payments?.map((p: any) => p.method).join(', ') || payment.method,
                payments: payment.payments || [],
                paidAt: new Date().toISOString(),
                paymentRecord: paymentRecord, // Store full payment record
                isPostAuditPayment: isClosedDate // Flag for post-audit payments
              })
            }
            
            // Log activity
            ActivityLogger.log('PAYMENT_RECEIVED', {
              guest: selectedReservation.guestName,
              room: selectedReservation.roomNumber,
              amount: payment.paidAmount,
              method: payment.payments?.map((p: any) => p.method).join(', ') || payment.method,
              reservationId: selectedReservation.id,
              isFullPayment: payment.isPaid,
              isPostAudit: isClosedDate,
              forDate: checkOutDate,
              processedOn: moment().format('YYYY-MM-DD')
            })
            
            setShowPayment(false)
            setSelectedReservation(null)
            
            // Show success message
            if (isClosedDate) {
              alert(`✅ Payment recorded successfully!\n\n` +
                    `⚠️ Note: This payment was processed after Night Audit for ${checkOutDate}\n` +
                    `Processing date: ${moment().format('YYYY-MM-DD')}`)
            } else {
              alert(payment.isPaid ? 
                '✅ გადახდა სრულად დასრულდა!' : 
                `✅ ნაწილობრივი გადახდა მიღებულია. დარჩენილი: ₾${payment.remainingAmount}`
              )
            }
            
            if (loadReservations) {
              loadReservations()
            }
          }}
        />
      )}
      
      {/* Cancel Reservation Modal */}
      {showCancelModal && selectedReservation && (() => {
        const nights = moment(selectedReservation.checkOut).diff(moment(selectedReservation.checkIn), 'days')
        const totalAmount = selectedReservation.totalAmount || 0
        
        // Get folio to check if paid
        const folios = typeof window !== 'undefined' 
          ? JSON.parse(localStorage.getItem('hotelFolios') || '[]')
          : []
        const folio = folios.find((f: any) => f.reservationId === selectedReservation.id)
        const paidAmount = folio?.payments?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0
        const isPaid = paidAmount > 0
        
        // Cancellation reasons
        const cancellationReasons = [
          { value: 'guest_request', label: 'სტუმრის მოთხოვნა' },
          { value: 'no_show', label: 'No-Show' },
          { value: 'overbooking', label: 'Overbooking' },
          { value: 'force_majeure', label: 'ფორს-მაჟორი' },
          { value: 'payment_issue', label: 'გადახდის პრობლემა' },
          { value: 'other', label: 'სხვა' }
        ]
        
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg w-full max-w-lg">
              {/* Header */}
              <div className="flex justify-between items-center p-4 border-b bg-red-500 text-white rounded-t-lg">
                <div>
                  <h2 className="text-xl font-bold">❌ ჯავშნის გაუქმება</h2>
                  <p className="text-red-100 text-sm">{selectedReservation.guestName} - Room {selectedReservation.roomNumber}</p>
                </div>
                <button 
                  onClick={() => {
                    setShowCancelModal(false)
                    setSelectedReservation(null)
                    setCancelReason('')
                    setRefundAmount(0)
                  }} 
                  className="text-2xl text-white hover:text-red-200"
                >
                  ×
                </button>
              </div>
              
              {/* Reservation Info */}
              <div className="p-4 border-b bg-gray-50">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Check-in:</span>
                    <span className="ml-2 font-medium">{moment(selectedReservation.checkIn).format('DD/MM/YYYY')}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Check-out:</span>
                    <span className="ml-2 font-medium">{moment(selectedReservation.checkOut).format('DD/MM/YYYY')}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">ღამეები:</span>
                    <span className="ml-2 font-medium">{nights}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">თანხა:</span>
                    <span className="ml-2 font-medium">₾{totalAmount}</span>
                  </div>
                </div>
              </div>
              
              {/* Payment Status */}
              <div className="p-4 border-b">
                <div className={`p-3 rounded-lg ${isPaid ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">გადახდის სტატუსი:</span>
                    <span className={`font-medium ${isPaid ? 'text-green-600' : 'text-gray-500'}`}>
                      {isPaid ? `✓ გადახდილი ₾${paidAmount}` : 'გადაუხდელი'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Cancellation Reason */}
              <div className="p-4 border-b">
                <label className="block text-sm font-medium mb-2">გაუქმების მიზეზი *</label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">აირჩიეთ მიზეზი</option>
                  {cancellationReasons.map(reason => (
                    <option key={reason.value} value={reason.value}>
                      {reason.label}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Refund Section (only if paid) */}
              {isPaid && (
                <div className="p-4 border-b">
                  <label className="block text-sm font-medium mb-2">💰 რეფუნდის თანხა</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="0"
                      max={paidAmount}
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(Math.min(Number(e.target.value), paidAmount))}
                      className="w-32 border rounded-lg px-3 py-2"
                    />
                    <span className="text-gray-500">/ ₾{paidAmount}</span>
                    <button
                      onClick={() => setRefundAmount(paidAmount)}
                      className="text-blue-600 text-sm hover:underline"
                    >
                      სრული რეფუნდი
                    </button>
                  </div>
                  
                  {/* Quick refund options */}
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => setRefundAmount(0)}
                      className="px-3 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
                    >
                      0%
                    </button>
                    <button
                      onClick={() => setRefundAmount(Math.round(paidAmount * 0.5))}
                      className="px-3 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
                    >
                      50%
                    </button>
                    <button
                      onClick={() => setRefundAmount(paidAmount)}
                      className="px-3 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
                    >
                      100%
                    </button>
                  </div>
                </div>
              )}
              
              {/* Warning */}
              <div className="p-4 border-b">
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-700 text-sm">
                    <strong>⚠️ ყურადღება:</strong> ჯავშნის გაუქმება შეუქცევადია. 
                    {selectedReservation.status === 'CHECKED_IN' && ' სტუმარი შემოსულია - ოთახი გახდება VACANT.'}
                  </p>
                </div>
              </div>
              
              {/* Actions */}
              <div className="p-4 flex gap-3">
                <button
                  onClick={() => {
                    setShowCancelModal(false)
                    setSelectedReservation(null)
                    setCancelReason('')
                    setRefundAmount(0)
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  უკან
                </button>
                
                <button
                  onClick={async () => {
                    if (!cancelReason) {
                      alert('აირჩიეთ გაუქმების მიზეზი')
                      return
                    }
                    setIsProcessingCancel(true)
                    await processCancelReservation(cancelReason, refundAmount)
                    setIsProcessingCancel(false)
                  }}
                  disabled={!cancelReason || isProcessingCancel}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessingCancel ? '⏳ მუშავდება...' : '❌ გაუქმება'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}
      
      {/* Check-In Process Modal */}
      {showCheckInModal && selectedReservation && (() => {
        const nights = moment(selectedReservation.checkOut).diff(moment(selectedReservation.checkIn), 'days')
        const roomCharge = selectedReservation.totalAmount || (nights * 150)
        const room = rooms.find(r => r.id === selectedReservation.roomId)
        
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg w-full max-w-xl max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex justify-between items-center p-4 border-b bg-green-500 text-white rounded-t-lg">
                <div>
                  <h2 className="text-xl font-bold">Check-In Process</h2>
                  <p className="text-green-100">{selectedReservation.guestName} - Room {selectedReservation.roomNumber}</p>
                </div>
                <button 
                  onClick={() => {
                    setShowCheckInModal(false)
                    setSelectedReservation(null)
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
                    <p className="font-medium">{moment(selectedReservation.checkIn).format('DD/MM/YYYY')}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Check-out</p>
                    <p className="font-medium">{moment(selectedReservation.checkOut).format('DD/MM/YYYY')}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">ღამეები</p>
                    <p className="font-medium">{nights}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">ოთახის ტიპი</p>
                    <p className="font-medium">{room?.roomType || 'Standard'}</p>
                  </div>
                </div>
              </div>
              
              {/* Folio Preview */}
              <div className="p-4 border-b">
                <h3 className="font-medium mb-3">📋 Folio შეიქმნება</h3>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex justify-between mb-2">
                    <span>ოთახის ღირებულება ({nights} ღამე)</span>
                    <span>₾{Number(roomCharge || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-2">
                    <span>სულ</span>
                    <span>₾{Number(roomCharge || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
              
              {/* Room Status Info */}
              <div className="p-4 border-b">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-blue-700">
                    <strong>ℹ️ Check-in-ის შემდეგ:</strong>
                  </p>
                  <ul className="text-blue-600 text-sm mt-1 list-disc list-inside">
                    <li>ოთახი {selectedReservation.roomNumber} გახდება OCCUPIED</li>
                    <li>შეიქმნება Folio ღამის ღირებულებით</li>
                    <li>სტუმარს შეეძლება დამატებითი სერვისების გამოყენება</li>
                  </ul>
                </div>
              </div>
              
              {/* Actions */}
              <div className="p-4 flex gap-3">
                <button
                  onClick={() => {
                    setShowCheckInModal(false)
                    setSelectedReservation(null)
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  გაუქმება
                </button>
                
                <button
                  onClick={processCheckIn}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium"
                >
                  ✅ Check-in
                </button>
              </div>
            </div>
          </div>
        )
      })()}
      
      {/* Price Tooltip */}
      {priceTooltip && priceTooltip.visible && (
        <div 
          className="fixed z-[9999] pointer-events-none"
          style={{
            left: priceTooltip.x,
            top: priceTooltip.y,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl min-w-[150px]">
            {/* Header */}
            <div className="font-bold border-b border-gray-700 pb-1 mb-1">
              {priceTooltip.date}
            </div>
            
            {/* Room Type */}
            <div className="text-gray-300 mb-1">
              🏨 {priceTooltip.roomType}
            </div>
            
            {/* Base Price */}
            <div className="flex justify-between">
              <span className="text-gray-400">ბაზისური:</span>
              <span>₾{priceTooltip.basePrice}</span>
            </div>
            
            {/* Modifiers */}
            {priceTooltip.modifiers.map((mod, i) => (
              <div key={i} className={`flex justify-between ${mod.value.startsWith('+') ? 'text-orange-400' : 'text-green-400'}`}>
                <span>{mod.icon} {mod.label}:</span>
                <span>{mod.value}</span>
              </div>
            ))}
            
            {/* Final Price */}
            <div className="border-t border-gray-700 mt-1 pt-1 flex justify-between font-bold text-green-400">
              <span>💰 ფასი:</span>
              <span>₾{priceTooltip.finalPrice}</span>
            </div>
            
            {/* Arrow */}
            <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-full">
              <div className="border-8 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        </div>
      )}
      
      {/* Check-Out Modal */}
      {showCheckOutModal && selectedReservation && (
        <CheckOutModal
          reservation={selectedReservation}
          onClose={() => {
            setShowCheckOutModal(false)
            setSelectedReservation(null)
            setContextMenu(null)
          }}
          onCheckOut={() => {
            setShowCheckOutModal(false)
            setSelectedReservation(null)
            setContextMenu(null)
            if (loadReservations) {
              loadReservations()
            }
          }}
          onReservationUpdate={onReservationUpdate}
        />
      )}
      
      {/* Edit Modal */}
      {showEditModal && selectedReservation && (
        <EditReservationModal
          reservation={selectedReservation}
          rooms={rooms}
          reservations={reservations}
          onClose={() => {
            setShowEditModal(false)
            setSelectedReservation(null)
          }}
          onSave={async (updates: any) => {
            if (!canEditReservation(selectedReservation, 'რედაქტირება')) {
              setShowEditModal(false)
              setSelectedReservation(null)
              return
            }
            
            if (onReservationUpdate) {
              await onReservationUpdate(selectedReservation.id, {
                ...updates,
                checkIn: new Date(updates.checkIn).toISOString(),
                checkOut: new Date(updates.checkOut).toISOString()
              })
            }
            setShowEditModal(false)
            setSelectedReservation(null)
            if (loadReservations) {
              loadReservations()
            }
          }}
          onDelete={async (id: string) => {
            if (!canEditReservation(selectedReservation, 'წაშლა')) {
              setShowEditModal(false)
              setSelectedReservation(null)
              return
            }
            
            if (onReservationDelete) {
              await onReservationDelete(id)
            }
            setShowEditModal(false)
            setSelectedReservation(null)
            if (loadReservations) {
              loadReservations()
            }
          }}
        />
      )}
      
      {/* NO-SHOW Confirmation Modal */}
      {showNoShowModal && (
        <NoShowConfirmationModal
          reservation={showNoShowModal}
          onConfirm={processNoShow}
          onCancel={() => setShowNoShowModal(null)}
          rooms={rooms}
        />
      )}
      
      {showCheckOutModal && selectedReservation && (
        <CheckOutModal
          reservation={selectedReservation}
          onClose={() => {
            setShowCheckOutModal(false)
            setSelectedReservation(null)
            setContextMenu(null)
          }}
          onCheckOut={() => {
            setShowCheckOutModal(false)
            setSelectedReservation(null)
            setContextMenu(null)
            if (loadReservations) {
              loadReservations()
            }
          }}
          onReservationUpdate={onReservationUpdate}
        />
      )}
      
      {/* Folio View Modal */}
      {showFolioModal && selectedReservation && (
        <FolioViewModal
          reservation={selectedReservation}
          onClose={() => {
            setShowFolioModal(false)
            setSelectedReservation(null)
            setContextMenu(null)
          }}
        />
      )}
      
      {/* Extra Charges Modal */}
      {showExtraChargesModal && selectedReservation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Post Extra Charges - {selectedReservation.guestName}</h2>
              <button
                onClick={() => {
                  setShowExtraChargesModal(false)
                  setSelectedReservation(null)
                  setContextMenu(null)
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <ExtraChargesPanel
              reservationId={selectedReservation.id}
              onChargePosted={() => {
                // Reload or refresh after charge
                if (loadReservations) {
                  loadReservations()
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
    </>
  )
}

// NO-SHOW Confirmation Modal Component
function NoShowConfirmationModal({ reservation, onConfirm, onCancel, rooms }: any) {
  const [chargePolicy, setChargePolicy] = useState('first')
  const [reason, setReason] = useState('არ გამოცხადდა...')
  const [sendNotification, setSendNotification] = useState(true)
  const [freeRoom, setFreeRoom] = useState(true)
  const [customCharge, setCustomCharge] = useState(0)
  
  if (!reservation) return null
  
  const nights = moment(reservation.checkOut).diff(moment(reservation.checkIn), 'days')
  const perNight = nights > 0 ? reservation.totalAmount / nights : reservation.totalAmount
  
  const handleConfirm = () => {
    onConfirm(reservation, chargePolicy, reason, sendNotification, freeRoom, customCharge)
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" onClick={onCancel}>
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-bold mb-4">❌ Mark as NO-SHOW</h3>
        
        <div className="bg-gray-50 rounded p-4 mb-4">
          <p><strong>სტუმარი:</strong> {reservation.guestName}</p>
          <p><strong>ოთახი:</strong> {(() => {
            const roomIdOrNumber = reservation.roomNumber || reservation.roomId;
            if (!roomIdOrNumber) return '-';
            if (roomIdOrNumber.length <= 4 && /^\d+$/.test(roomIdOrNumber)) return roomIdOrNumber;
            const foundRoom = rooms?.find((r: any) => r.id === roomIdOrNumber);
            if (foundRoom) {
              return foundRoom.roomNumber || foundRoom.number || roomIdOrNumber;
            }
            // Try localStorage as fallback
            try {
              const savedRooms = localStorage.getItem('rooms') || 
                                 localStorage.getItem('simpleRooms') || 
                                 localStorage.getItem('hotelRooms');
              if (savedRooms) {
                const parsedRooms = JSON.parse(savedRooms);
                const foundRoom = parsedRooms.find((r: any) => r.id === roomIdOrNumber);
                if (foundRoom) {
                  return foundRoom.roomNumber || foundRoom.number || roomIdOrNumber;
                }
              }
            } catch (e) {
              // Ignore
            }
            return roomIdOrNumber.length > 10 ? roomIdOrNumber.slice(0, 6) + '...' : roomIdOrNumber;
          })()}</p>
          <p><strong>Check-in:</strong> {moment(reservation.checkIn).format('DD/MM/YYYY')}</p>
          <p><strong>ღამეები:</strong> {nights}</p>
          <p><strong>სრული თანხა:</strong> ₾{reservation.totalAmount}</p>
        </div>
        
        <div className="mb-4">
          <label className="font-bold mb-2 block">Charge Policy:</label>
          <select 
            className="w-full border rounded px-3 py-2" 
            value={chargePolicy}
            onChange={(e) => setChargePolicy(e.target.value)}
          >
            <option value="first">პირველი ღამე (₾{Number(perNight || 0).toFixed(2)})</option>
            <option value="full">სრული თანხა (₾{reservation.totalAmount})</option>
            <option value="none">არ დაერიცხოს</option>
            <option value="custom">სხვა თანხა</option>
          </select>
        </div>
        
        {chargePolicy === 'custom' && (
          <div className="mb-4">
            <label className="font-bold mb-2 block">Custom Amount (₾):</label>
            <input
              type="number"
              id="customCharge"
              value={customCharge}
              onChange={(e) => setCustomCharge(parseFloat(e.target.value) || 0)}
              className="w-full border rounded px-3 py-2"
              min="0"
              step="0.01"
            />
          </div>
        )}
        
        <div className="mb-4">
          <label className="font-bold mb-2 block">მიზეზი:</label>
          <textarea 
            className="w-full border rounded px-3 py-2" 
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="არ გამოცხადდა..."
          />
        </div>
        
        <div className="mb-4 space-y-2">
          <label className="flex items-center">
            <input 
              type="checkbox" 
              className="mr-2" 
              checked={sendNotification}
              onChange={(e) => setSendNotification(e.target.checked)}
            />
            გაეგზავნოს შეტყობინება სტუმარს
          </label>
          <label className="flex items-center">
            <input 
              type="checkbox" 
              className="mr-2" 
              checked={freeRoom}
              onChange={(e) => setFreeRoom(e.target.checked)}
            />
            ოთახი გათავისუფლდეს
          </label>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            დადასტურება
          </button>
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            გაუქმება
          </button>
        </div>
      </div>
    </div>
  )
}

// Reservation Details Modal
// View Only Modal Component for Closed Day Reservations
function ViewOnlyReservationModal({ reservation, onClose }: any) {
  if (!reservation) return null
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">📋 ჯავშნის დეტალები (მხოლოდ ნახვა)</h2>
          <button onClick={onClose} className="text-2xl hover:text-gray-600">×</button>
        </div>
        
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-4">
          <p className="text-sm text-yellow-700">
            ⚠️ დახურული პერიოდის ჯავშანი - რედაქტირება შეუზღუდულია
          </p>
        </div>
        
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-600">სტუმარი:</label>
            <div className="font-medium">{reservation.guestName}</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-600">Check In:</label>
              <div>{moment(reservation.checkIn).format('DD/MM/YYYY')}</div>
            </div>
            <div>
              <label className="text-sm text-gray-600">Check Out:</label>
              <div>{moment(reservation.checkOut).format('DD/MM/YYYY')}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-600">ოთახი:</label>
              <div>{reservation.roomNumber || reservation.roomId || 'N/A'}</div>
            </div>
            <div>
              <label className="text-sm text-gray-600">სტატუსი:</label>
              <div>{reservation.status}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-600">თანხა:</label>
              <div>₾{reservation.totalAmount || 0}</div>
            </div>
            <div>
              <label className="text-sm text-gray-600">გადახდა:</label>
              <div>
                {reservation.isPaid === true || reservation.paymentStatus === 'PAID' || (reservation.paidAmount || 0) >= (reservation.totalAmount || 0) 
                  ? '✅ გადახდილი' 
                  : '❌ გადაუხდელი'}
              </div>
            </div>
          </div>
        </div>
        
        <button 
          onClick={onClose}
          className="w-full mt-6 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
        >
          დახურვა
        </button>
      </div>
    </div>
  )
}

function ReservationDetails({ reservation, rooms, onClose, onPayment, onEdit, onCheckIn }: any) {
  const [hotelInfo, setHotelInfo] = useState<any>({
    name: 'Hotel Tbilisi',
    companyName: '',
    taxId: '',
    bankName: '',
    bankAccount: '',
    address: 'თბილისი, საქართველო',
    phone: '+995 322 123456',
    email: 'info@hotel.ge',
    logo: ''
  })
  
  const [folio, setFolio] = useState<any>(null)
  const [folioData, setFolioData] = useState<any>({
    charges: [],
    payments: [],
    totalCharges: 0,
    totalPayments: 0,
    balance: 0
  })
  
  // Find room number from rooms array
  const roomData = useMemo(() => {
    if (reservation.roomNumber) {
      return { roomNumber: reservation.roomNumber, roomType: reservation.roomType }
    }
    if (rooms && reservation.roomId) {
      const room = rooms.find((r: any) => r.id === reservation.roomId)
      if (room) {
        return { 
          roomNumber: room.roomNumber || room.number || reservation.roomId,
          roomType: room.type || room.roomType || reservation.roomType || 'Standard'
        }
      }
    }
    return { roomNumber: reservation.roomId || 'N/A', roomType: reservation.roomType || 'Standard' }
  }, [reservation, rooms])
  
  useEffect(() => {
    const saved = localStorage.getItem('hotelInfo')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setHotelInfo({ ...parsed, logo: sanitizeLogo(parsed?.logo) })
      } catch (e) {
        console.error('Failed to load hotel info:', e)
      }
    }
  }, [])
  
  const nights = moment(reservation.checkOut).diff(moment(reservation.checkIn), 'days')
  
  // Load folio data
  const loadFolioData = () => {
    if (typeof window === 'undefined') return
    
    const folios = JSON.parse(localStorage.getItem('hotelFolios') || '[]')
    
    // Find folio by reservationId ONLY (each reservation has its own folio)
    const foundFolio = folios.find((f: any) => f.reservationId === reservation.id)
    
    setFolio(foundFolio)
    
    if (foundFolio) {
      // Extract charges and payments from transactions
      const transactions = foundFolio.transactions || []
      
      // Get charges from transactions (type === 'charge' or debit > 0)
      const charges = transactions.filter((t: any) => 
        t.type === 'charge' || (t.debit && t.debit > 0)
      ).map((t: any) => ({
        date: t.date || moment().format('YYYY-MM-DD'),
        description: t.description || 'Charge',
        amount: t.amount || t.debit || 0
      }))
      
      // If no charges found, add room charge as default
      if (charges.length === 0) {
        charges.push({
          date: reservation.checkIn || moment().format('YYYY-MM-DD'),
          description: `ოთახის ღირებულება (${nights} ღამე)`,
          amount: reservation.totalAmount || 0
        })
      }
      
      // Get payments from transactions (type === 'payment' or credit > 0)
      const payments = transactions.filter((t: any) => 
        t.type === 'payment' || t.type === 'refund' || (t.credit && t.credit > 0)
      ).map((t: any) => ({
        date: t.date || moment().format('YYYY-MM-DD'),
        description: t.description || 'Payment',
        amount: t.amount || t.credit || 0,
        method: t.paymentMethod || t.method || 'cash'
      }))
      
      // Calculate totals
      const totalCharges = charges.reduce((sum: number, t: any) => sum + (t.amount || 0), 0)
      const totalPayments = payments.reduce((sum: number, t: any) => sum + (t.amount || 0), 0)
      const balance = totalCharges - totalPayments
      
      setFolioData({ charges, payments, totalCharges, totalPayments, balance })
    } else {
      // No folio found, use reservation data
      const charges = [{
        date: reservation.checkIn || moment().format('YYYY-MM-DD'),
        description: `ოთახის ღირებულება (${nights} ღამე)`,
        amount: reservation.totalAmount || 0
      }]
      const totalCharges = reservation.totalAmount || 0
      const totalPayments = 0
      const balance = totalCharges - totalPayments
      
      setFolioData({ charges, payments: [], totalCharges, totalPayments, balance })
    }
  }
  
  // Load folio data when reservation changes or component mounts
  useEffect(() => {
    loadFolioData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservation.id, reservation.roomNumber, reservation.checkIn, reservation.checkOut, reservation.totalAmount])
  
  // Listen for folio updates
  useEffect(() => {
    const handleFolioUpdate = (event: CustomEvent) => {
      // Check if this event is for our reservation
      const eventReservationId = event.detail?.reservationId
      if (!eventReservationId || eventReservationId === reservation.id) {
        // Reload folio data when folio is updated
        loadFolioData()
      }
    }
    
    window.addEventListener('folioUpdated', handleFolioUpdate as EventListener)
    
    return () => {
      window.removeEventListener('folioUpdated', handleFolioUpdate as EventListener)
    }
  }, [reservation.id])
  
  const balance = folioData.balance || folio?.balance || 0
  const isPaid = balance <= 0
  
  // Country names mapping
  const countryNames: { [key: string]: string } = {
    'GE': 'საქართველო',
    'TR': 'თურქეთი',
    'RU': 'რუსეთი',
    'AZ': 'აზერბაიჯანი',
    'AM': 'სომხეთი',
    'UA': 'უკრაინა',
    'IL': 'ისრაელი',
    'DE': 'გერმანია',
    'US': 'აშშ',
    'GB': 'დიდი ბრიტანეთი',
    'FR': 'საფრანგეთი',
    'IT': 'იტალია',
    'ES': 'ესპანეთი',
    'PL': 'პოლონეთი',
    'KZ': 'ყაზახეთი',
    'IR': 'ირანი',
    'SA': 'საუდის არაბეთი',
    'AE': 'არაბეთის გაერთ. საამიროები',
    'CN': 'ჩინეთი',
    'JP': 'იაპონია',
    'OTHER': 'სხვა'
  }
  
  if (!reservation) return null
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">📋 ჯავშნის დეტალები</h2>
            {reservation.reservationNumber && (
              <p className="text-blue-100 text-sm">რეზერვაცია #{reservation.reservationNumber}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Payment Status Badge */}
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              isPaid 
                ? 'bg-green-500 text-white' 
                : 'bg-red-500 text-white'
            }`}>
              {isPaid ? '✓ გადახდილი' : `₾${Number(balance || 0).toFixed(0)} გადასახდელი`}
            </span>
            <button onClick={onClose} className="text-2xl text-white hover:text-blue-200">×</button>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          
          {/* Status & Dates Row */}
          <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-xs text-gray-500">CHECK-IN</p>
                <p className="font-bold text-lg">{moment(reservation.checkIn).format('DD/MM')}</p>
                <p className="text-xs text-gray-500">{moment(reservation.checkIn).format('ddd')}</p>
              </div>
              <div className="text-gray-400">→</div>
              <div className="text-center">
                <p className="text-xs text-gray-500">CHECK-OUT</p>
                <p className="font-bold text-lg">{moment(reservation.checkOut).format('DD/MM')}</p>
                <p className="text-xs text-gray-500">{moment(reservation.checkOut).format('ddd')}</p>
              </div>
              <div className="ml-4 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                {nights} ღამე
              </div>
            </div>
            <div>
              <span className={`px-3 py-2 rounded-lg text-sm font-medium ${
                reservation.status === 'CONFIRMED' ? 'bg-yellow-100 text-yellow-700' :
                reservation.status === 'CHECKED_IN' ? 'bg-blue-100 text-blue-700' :
                reservation.status === 'CHECKED_OUT' ? 'bg-gray-100 text-gray-700' :
                reservation.status === 'NO_SHOW' ? 'bg-red-100 text-red-700' :
                'bg-red-100 text-red-700'
              }`}>
                {reservation.status === 'CONFIRMED' ? '📅 დადასტურებული' :
                 reservation.status === 'CHECKED_IN' ? '🏨 შემოსული' :
                 reservation.status === 'CHECKED_OUT' ? '✓ გასული' :
                 reservation.status === 'NO_SHOW' ? '❌ No-Show' :
                 '🚫 გაუქმებული'}
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-6 mb-6">
            
            {/* Guest Information */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3 text-gray-800 flex items-center gap-2">
                👤 სტუმრის ინფორმაცია
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">სახელი:</span>
                  <span className="font-medium">{reservation.guestName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">📞 ტელეფონი:</span>
                  <span>{reservation.guestPhone || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">📧 Email:</span>
                  <span>{reservation.guestEmail || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">🌍 ქვეყანა:</span>
                  <span>{countryNames[reservation.guestCountry] || reservation.guestCountry || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">👥 სტუმრები:</span>
                  <span>{reservation.adults || 1} მოზრდილი{reservation.children > 0 ? `, ${reservation.children} ბავშვი` : ''}</span>
                </div>
              </div>
            </div>
            
            {/* Room Information */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3 text-gray-800 flex items-center gap-2">
                🏠 ოთახის ინფორმაცია
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">ოთახი:</span>
                  <span className="font-medium">{roomData.roomNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">ტიპი:</span>
                  <span>{roomData.roomType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">ფასი/ღამე:</span>
                  <span>₾{((Number(reservation.totalAmount) || 0) / nights).toFixed(0)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-gray-500">სულ თანხა:</span>
                  <span className="text-lg">₾{Number(folioData.totalCharges || 0).toFixed(2) || reservation.totalAmount || 0}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Company Information (if corporate) */}
          {reservation.companyName && (
            <div className="border rounded-lg p-4 mb-6 bg-blue-50">
              <h3 className="font-semibold mb-3 text-gray-800 flex items-center gap-2">
                🏢 კომპანიის ინფორმაცია
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">კომპანია:</span>
                  <span className="font-medium">{reservation.companyName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">საიდენტიფიკაციო:</span>
                  <span>{reservation.companyTaxId || 'N/A'}</span>
                </div>
                {reservation.companyAddress && (
                  <div className="flex justify-between col-span-2">
                    <span className="text-gray-500">მისამართი:</span>
                    <span>{reservation.companyAddress}</span>
                  </div>
                )}
                {reservation.companyBank && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-500">ბანკი:</span>
                      <span>{reservation.companyBank}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">ანგარიში:</span>
                      <span>{reservation.companyBankAccount || 'N/A'}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          
          {/* Notes */}
          {reservation.notes && (
            <div className="border rounded-lg p-4 mb-6 bg-yellow-50">
              <h3 className="font-semibold mb-2 text-gray-800 flex items-center gap-2">
                📝 შენიშვნები
              </h3>
              <p className="text-sm text-gray-700">{reservation.notes}</p>
            </div>
          )}
          
          {/* 💰 Folio / ხარჯები section */}
          <div className="border rounded-lg p-4 mb-6">
            <h3 className="font-semibold mb-3 text-gray-800 flex items-center gap-2">
              💰 ხარჯები და გადახდები
              {folio && (
                <span className="text-xs font-normal text-gray-500">
                  (Folio #{folio.folioNumber})
                </span>
              )}
            </h3>
            
            {/* Charges */}
            <div className="space-y-1 mb-3">
              <div className="text-sm font-medium text-gray-600 mb-2">ხარჯები:</div>
              {folioData.charges.map((charge: any, idx: number) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span>{charge.description}</span>
                  <span className="font-medium">₾{Number(charge.amount || 0).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold border-t pt-1 mt-2">
                <span>სულ ხარჯები:</span>
                <span>₾{Number(folioData.totalCharges || 0).toFixed(2)}</span>
              </div>
            </div>
            
            {/* Payments */}
            {folioData.payments.length > 0 && (
              <div className="space-y-1 mb-3">
                <div className="text-sm font-medium text-gray-600 mb-2">გადახდები:</div>
                {folioData.payments.map((payment: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-sm text-green-600">
                    <span>{payment.description} ({payment.method})</span>
                    <span>-₾{Number(payment.amount || 0).toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold border-t pt-1 mt-2">
                  <span>სულ გადახდილი:</span>
                  <span className="text-green-600">₾{Number(folioData.totalPayments || 0).toFixed(2)}</span>
                </div>
              </div>
            )}
            
            {/* Balance */}
            <div className={`flex justify-between font-bold text-lg p-2 rounded mt-3 ${
              folioData.balance > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
            }`}>
              <span>ბალანსი:</span>
              <span>₾{Number(folioData.balance || 0).toFixed(2)}</span>
            </div>
          </div>
          
          {/* Invoice Section */}
          <div className="border-t pt-4 mt-4">
            <h3 className="font-bold mb-2">ინვოისი</h3>
            <Invoice 
              reservation={reservation}
              hotelInfo={hotelInfo}
            />
          </div>
        </div>
        
        {/* Footer Actions */}
        <div className="border-t p-4 bg-gray-50 flex justify-between">
          <div className="flex gap-2">
            {/* Check-in button - only for CONFIRMED reservations */}
            {reservation.status === 'CONFIRMED' && onCheckIn && (
              <button 
                onClick={onCheckIn}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                ✅ Check-in
              </button>
            )}
            <button 
              onClick={onEdit}
              className="px-4 py-2 border border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 flex items-center gap-2"
            >
              ✏️ რედაქტირება
            </button>
          </div>
          
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-100">
              დახურვა
            </button>
            {!isPaid && (
              <button 
                onClick={onPayment}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                💳 გადახდა (₾{Number(balance || 0).toFixed(0)})
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}