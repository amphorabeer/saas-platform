'use client'

import { useState, useEffect } from 'react'
import moment from 'moment'
import { ActivityLogger } from '../lib/activityLogger'
import { validateCheckInDate, validateReservationDates } from '../utils/dateValidation'

interface Room {
  id: string
  roomNumber: string
  floor: number
  status: string
  basePrice: number
  roomType?: string
}

interface CheckInModalProps {
  room?: Room
  rooms?: Room[]
  initialCheckIn?: string
  reservations?: any[] // ✅ დაემატა
  reservation?: any // Optional: for editing existing reservation
  onClose: () => void
  onSubmit: (data: any) => void
}

export default function CheckInModal({ 
  room, 
  rooms = [], 
  initialCheckIn, 
  reservations = [], // ✅ დაემატა
  reservation, // Optional: for editing existing reservation
  onClose, 
  onSubmit 
}: CheckInModalProps) {
  // Popular countries list
  const countries = [
    { code: 'GE', name: 'საქართველო' },
    { code: 'TR', name: 'თურქეთი' },
    { code: 'RU', name: 'რუსეთი' },
    { code: 'AZ', name: 'აზერბაიჯანი' },
    { code: 'AM', name: 'სომხეთი' },
    { code: 'UA', name: 'უკრაინა' },
    { code: 'IL', name: 'ისრაელი' },
    { code: 'DE', name: 'გერმანია' },
    { code: 'US', name: 'აშშ' },
    { code: 'GB', name: 'დიდი ბრიტანეთი' },
    { code: 'FR', name: 'საფრანგეთი' },
    { code: 'IT', name: 'იტალია' },
    { code: 'ES', name: 'ესპანეთი' },
    { code: 'PL', name: 'პოლონეთი' },
    { code: 'KZ', name: 'ყაზახეთი' },
    { code: 'IR', name: 'ირანი' },
    { code: 'SA', name: 'საუდის არაბეთი' },
    { code: 'AE', name: 'არაბეთის გაერთ. საამიროები' },
    { code: 'CN', name: 'ჩინეთი' },
    { code: 'JP', name: 'იაპონია' },
    { code: 'OTHER', name: 'სხვა' }
  ]
  
  const [formData, setFormData] = useState({
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    guestCountry: '',
    roomId: room?.id || '',
    roomNumber: room?.roomNumber || '',
    checkIn: initialCheckIn || new Date().toISOString().split('T')[0],
    checkOut: '',
    adults: 1,
    children: 0,
    totalAmount: room?.basePrice || 150,
    source: 'direct',
    notes: ''
  })
  
  const [overlapError, setOverlapError] = useState<string | null>(null) // ✅ დაემატა

  // Room rates from Settings
  const [roomRates, setRoomRates] = useState<{ id: string; type: string; weekday: number; weekend: number }[]>([])
  
  // Seasons from Settings
  const [seasons, setSeasons] = useState<{ id: string; name: string; startDate: string; endDate: string; priceModifier: number; active: boolean; roomTypes?: string[] }[]>([])
  
  // Weekday Prices from Settings
  const [weekdayPrices, setWeekdayPrices] = useState<{ dayOfWeek: number; dayName: string; priceModifier: number; enabled: boolean }[]>([])
  
  // Special Dates from Settings
  const [specialDates, setSpecialDates] = useState<{ id: string; date: string; name: string; priceModifier: number; roomTypes?: string[]; active: boolean }[]>([])

  // Load room rates and seasons on mount
  useEffect(() => {
    const loadRates = async () => {
      // Try API first for room rates
      try {
        const ratesResponse = await fetch('/api/hotel/room-rates')
        if (ratesResponse.ok) {
          const apiRates = await ratesResponse.json()
          if (apiRates && apiRates.length > 0) {
            // Transform API data to expected format
            const transformedRates = apiRates.reduce((acc: any[], rate: any) => {
              const existing = acc.find(r => r.type === rate.roomTypeCode)
              if (existing) {
                if (rate.dayOfWeek === 0 || rate.dayOfWeek === 6) {
                  existing.weekend = rate.price
                } else {
                  existing.weekday = rate.price
                }
              } else {
                acc.push({
                  id: rate.id,
                  type: rate.roomTypeCode,
                  weekday: rate.dayOfWeek >= 1 && rate.dayOfWeek <= 5 ? rate.price : 0,
                  weekend: rate.dayOfWeek === 0 || rate.dayOfWeek === 6 ? rate.price : 0
                })
              }
              return acc
            }, [])
            setRoomRates(transformedRates)
            console.log('[CheckInModal] Loaded room rates from API')
          }
        }
      } catch (e) {
        console.log('[CheckInModal] API error for rates, falling back to localStorage')
      }
      
      // Fallback to localStorage for rates
      if (roomRates.length === 0) {
        const saved = localStorage.getItem('roomRates')
        if (saved) {
          try {
            const rates = JSON.parse(saved)
            setRoomRates(rates)
          } catch (e) {
            console.error('Error loading room rates:', e)
          }
        }
      }
      
      // Try API first for seasons
      try {
        const seasonsResponse = await fetch('/api/hotel/seasons')
        if (seasonsResponse.ok) {
          const apiSeasons = await seasonsResponse.json()
          if (apiSeasons && apiSeasons.length > 0) {
            setSeasons(apiSeasons)
            console.log('[CheckInModal] Loaded seasons from API')
          }
        }
      } catch (e) {
        console.log('[CheckInModal] API error for seasons, falling back to localStorage')
      }
      
      // Fallback to localStorage for seasons
      if (seasons.length === 0) {
        const savedSeasons = localStorage.getItem('hotelSeasons')
        if (savedSeasons) {
          try {
            const loadedSeasons = JSON.parse(savedSeasons)
            setSeasons(loadedSeasons)
          } catch (e) {
            console.error('Error loading seasons:', e)
          }
        }
      }
      
      // Try API first for special dates
      try {
        const specialResponse = await fetch('/api/hotel/special-dates')
        if (specialResponse.ok) {
          const apiSpecial = await specialResponse.json()
          if (apiSpecial && apiSpecial.length > 0) {
            setSpecialDates(apiSpecial)
            console.log('[CheckInModal] Loaded special dates from API')
          }
        }
      } catch (e) {
        console.log('[CheckInModal] API error for special dates, falling back to localStorage')
      }
      
      // Fallback to localStorage for special dates
      if (specialDates.length === 0) {
        const savedSpecialDates = localStorage.getItem('hotelSpecialDates')
        if (savedSpecialDates) {
          try {
            const parsed = JSON.parse(savedSpecialDates)
            setSpecialDates(parsed || [])
          } catch (e) {
            console.error('Error loading special dates:', e)
          }
        }
      }
      
      // Load Weekday Prices (localStorage only for now)
      const savedWeekdays = localStorage.getItem('hotelWeekdayPrices')
      if (savedWeekdays) {
        try {
          const parsed = JSON.parse(savedWeekdays)
          const weekdays = Array.isArray(parsed) ? parsed : (parsed.all || [])
          setWeekdayPrices(weekdays)
        } catch (e) {
          console.error('Error loading weekday prices:', e)
        }
      }
    }
    loadRates()
  }, [])

  // Update formData when room or initialCheckIn changes
  useEffect(() => {
    if (room) {
      setFormData(prev => ({
        ...prev,
        roomId: room.id,
        roomNumber: room.roomNumber,
        totalAmount: room.basePrice || prev.totalAmount
      }))
    }
    if (initialCheckIn) {
      setFormData(prev => ({
        ...prev,
        checkIn: initialCheckIn
      }))
    }
  }, [room, initialCheckIn])

  const selectedRoom = room || rooms.find(r => r.id === formData.roomId)

  const calculateNights = () => {
    if (formData.checkIn && formData.checkOut) {
      const start = new Date(formData.checkIn)
      const end = new Date(formData.checkOut)
      const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      return nights > 0 ? nights : 1
    }
    return 1
  }

  // Get room type name (check both 'type' and 'roomType' fields)
  const getRoomTypeName = (): string => {
    if (!selectedRoom) return 'Standard'
    return selectedRoom.type || selectedRoom.roomType || 'Standard'
  }

  // Get season modifier for a specific date
  const getSeasonModifier = (date: string): number => {
    if (!seasons || seasons.length === 0) {
      return 0
    }
    
    const checkDate = moment(date)
    
    for (const season of seasons) {
      if (!season.active) {
        continue
      }
      
      const startDate = moment(season.startDate)
      const endDate = moment(season.endDate)
      
      // Check if date is within season range
      const inRange = checkDate.isSameOrAfter(startDate, 'day') && checkDate.isSameOrBefore(endDate, 'day')
      
      if (inRange) {
        // If season has specific room types, check if current room type matches
        if (season.roomTypes && season.roomTypes.length > 0) {
          const roomTypeName = getRoomTypeName()
          const roomTypeMatches = season.roomTypes.includes(roomTypeName)
          if (!roomTypeMatches) {
            continue // This season doesn't apply to this room type
          }
        }
        
        return season.priceModifier
      }
    }
    
    return 0 // No season applies
  }

  // Get weekday modifier for a specific date
  const getWeekdayModifier = (date: string): { modifier: number; dayName: string } | null => {
    if (!weekdayPrices || weekdayPrices.length === 0) return null
    
    const dayOfWeek = moment(date).day()
    const weekdayPrice = weekdayPrices.find(w => w.dayOfWeek === dayOfWeek && w.enabled)
    
    if (weekdayPrice && weekdayPrice.priceModifier !== 0) {
      return { modifier: weekdayPrice.priceModifier, dayName: weekdayPrice.dayName }
    }
    
    return null
  }

  // Get special date modifier
  const getSpecialDateModifier = (date: string): { modifier: number; name: string } | null => {
    if (!specialDates || specialDates.length === 0) return null
    
    const formattedDate = moment(date).format('YYYY-MM-DD')
    const special = specialDates.find(sd => {
      if (!sd.active) return false
      return sd.date === formattedDate
    })
    
    if (special) {
      // Check room type restriction
      if (special.roomTypes && special.roomTypes.length > 0) {
        const roomTypeName = getRoomTypeName()
        if (!special.roomTypes.includes(roomTypeName)) {
          return null
        }
      }
      return { modifier: special.priceModifier, name: special.name }
    }
    
    return null
  }

  // Calculate price per night based on room type, date, season, weekday, and special dates
  const calculatePricePerNight = (date: string): number => {
    if (!selectedRoom) return 150

    const roomTypeName = getRoomTypeName()
    const rate = roomRates.find(r => r.type === roomTypeName)

    let basePrice = Number(selectedRoom.basePrice) || 150

    if (rate) {
      // Check if weekend (Friday=5, Saturday=6, Sunday=0)
      const dayOfWeek = moment(date).day()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6
      basePrice = isWeekend ? Number(rate.weekend) : Number(rate.weekday)
    }

    // Priority order: Special Date > Season > Weekday
    // Special dates override everything
    const specialDate = getSpecialDateModifier(date)
    if (specialDate) {
      const adjustment = basePrice * (specialDate.modifier / 100)
      const finalPrice = basePrice + adjustment
      return finalPrice
    }

    // Apply seasonal modifier
    const seasonModifier = getSeasonModifier(date)
    if (seasonModifier !== 0) {
      const adjustment = basePrice * (seasonModifier / 100)
      basePrice = basePrice + adjustment
    }

    // Apply weekday modifier (on top of season)
    const weekdayMod = getWeekdayModifier(date)
    if (weekdayMod) {
      const adjustment = basePrice * (weekdayMod.modifier / 100)
      basePrice = basePrice + adjustment
    }

    return Math.round(basePrice)
  }

  // Calculate total for date range with weekday/weekend rates
  const calculateTotalWithRates = (): number => {
    if (!formData.checkIn || !formData.checkOut) return 0

    let total = 0
    let currentDate = moment(formData.checkIn)
    const endDate = moment(formData.checkOut)

    while (currentDate.isBefore(endDate)) {
      total += calculatePricePerNight(currentDate.format('YYYY-MM-DD'))
      currentDate.add(1, 'day')
    }

    return Math.round(total)
  }

  // Get price per night for display (first night's price or average)
  const getDisplayPricePerNight = (): number => {
    if (!formData.checkIn) {
      // No date selected, show rate for today
      return calculatePricePerNight(moment().format('YYYY-MM-DD'))
    }
    return calculatePricePerNight(formData.checkIn)
  }

  // Main calculate total function
  const calculateTotal = (): number => {
    // If no checkout date, return 0
    if (!formData.checkIn || !formData.checkOut) {
      return 0
    }

    // Always use calculateTotalWithRates which properly handles seasons, special dates, and weekday modifiers
    // This ensures season prices are always included
    if (roomRates.length > 0) {
      return calculateTotalWithRates()
    }

    // Fallback: calculate day by day using calculatePricePerNight (includes season modifiers)
    let total = 0
    let currentDate = moment(formData.checkIn)
    const endDate = moment(formData.checkOut)

    while (currentDate.isBefore(endDate)) {
      total += calculatePricePerNight(currentDate.format('YYYY-MM-DD'))
      currentDate.add(1, 'day')
    }

    return total
  }

  // Get rate info for display
  const getRateInfo = () => {
    const roomTypeName = getRoomTypeName()
    const rate = roomRates.find(r => r.type === roomTypeName)
    return rate
  }

  // Reset checkOut if it becomes invalid when checkIn changes
  useEffect(() => {
    if (formData.checkIn && formData.checkOut) {
      const minCheckOut = moment(formData.checkIn).add(1, 'day')
      const currentCheckOut = moment(formData.checkOut)
      
      // If checkOut is same day or before checkIn, reset it
      if (currentCheckOut.isSameOrBefore(moment(formData.checkIn))) {
        setFormData(prev => ({
          ...prev,
          checkOut: minCheckOut.format('YYYY-MM-DD')
        }))
      }
    }
  }, [formData.checkIn])
  
  useEffect(() => {
    if (formData.checkIn && formData.checkOut && selectedRoom) {
      const total = calculateTotal()
      setFormData(prev => ({ ...prev, totalAmount: total }))
    }
  }, [formData.checkIn, formData.checkOut, formData.roomId, selectedRoom, roomRates])

  // ✅ Check for overlapping reservations
  const checkOverlap = (): { hasOverlap: boolean; conflictingReservation?: any } => {
    if (!formData.checkIn || !formData.checkOut || !formData.roomId) {
      return { hasOverlap: false }
    }
    
    const checkIn = moment(formData.checkIn)
    const checkOut = moment(formData.checkOut)
    const roomId = formData.roomId
    
    // Find conflicting reservation
    const conflicting = reservations.find((res: any) => {
      // Skip cancelled and no-show reservations
      if (res.status === 'CANCELLED' || res.status === 'NO_SHOW') return false
      
      // Skip the current reservation if editing (don't conflict with itself)
      if (reservation && res.id === reservation.id) return false
      
      // ✅ FIX: Must be same room - check both roomId and room.id
      const resRoomId = res.roomId || res.room?.id
      if (!resRoomId || resRoomId !== roomId) return false
      
      const resCheckIn = moment(res.checkIn)
      const resCheckOut = moment(res.checkOut)
      
      // Check overlap: new reservation overlaps if:
      // - new checkIn is STRICTLY BEFORE existing checkOut (same day = no overlap, because checkout day is free)
      // - new checkOut is STRICTLY AFTER existing checkIn
      // ✅ FIX: Use clone() to avoid mutating original moment objects!
      const checkInDate = checkIn.clone().startOf('day')
      const checkOutDate = checkOut.clone().startOf('day')
      const resCheckInDate = resCheckIn.clone().startOf('day')
      const resCheckOutDate = resCheckOut.clone().startOf('day')
      
      // Overlap exists only if: newCheckIn < existingCheckOut AND newCheckOut > existingCheckIn
      // On checkout day (newCheckIn === existingCheckOut), there's NO overlap - new guest can check in
      const overlaps = checkInDate.isBefore(resCheckOutDate) && checkOutDate.isAfter(resCheckInDate)
      
      return overlaps
    })
    
    return {
      hasOverlap: !!conflicting,
      conflictingReservation: conflicting
    }
  }
  
  // ✅ Check overlap when dates change
  useEffect(() => {
    if (formData.checkIn && formData.checkOut && formData.roomId) {
      const { hasOverlap, conflictingReservation } = checkOverlap()
      if (hasOverlap && conflictingReservation) {
        setOverlapError(
          `⚠️ ოთახი დაკავებულია! სტუმარი: ${conflictingReservation.guestName} ` +
          `(${moment(conflictingReservation.checkIn).format('DD/MM')} - ${moment(conflictingReservation.checkOut).format('DD/MM')})`
        )
      } else {
        setOverlapError(null)
      }
    } else {
      setOverlapError(null)
    }
  }, [formData.checkIn, formData.checkOut, formData.roomId, reservations])

  // Generate unique reservation number
  const generateReservationNumber = () => {
    return Math.floor(10000 + Math.random() * 90000).toString()
  }
  
  // Get minimum booking date based on last closed audit
  const getMinimumBookingDate = () => {
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
  
  // Check if check-in is allowed
  const canCheckIn = (): { allowed: boolean; reason?: string } => {
    const roomId = formData.roomId || reservation?.roomId
    const roomNumber = formData.roomNumber || reservation?.roomNumber
    
    if (!roomId && !roomNumber) {
      return { allowed: false, reason: 'ოთახი არ არის არჩეული' }
    }
    
    // Get check-in date from form
    const checkInDate = formData.checkIn || reservation?.checkIn
    
    // ========================================
    // NEW CHECK 1: Closed Day and Business Day validation
    // ========================================
    if (checkInDate) {
      const dateValidation = validateCheckInDate(checkInDate)
      if (!dateValidation.valid) {
        return {
          allowed: false,
          reason: dateValidation.reason
        }
      }
    }
    
    // ========================================
    // For NEW RESERVATIONS: Check dates and overlap
    // ========================================
    if (!reservation) {
      // This is a NEW reservation - check date validation and overlap
      if (formData.checkIn && formData.checkOut) {
        const dateValidation = validateReservationDates(formData.checkIn, formData.checkOut)
        if (!dateValidation.valid) {
          return {
            allowed: false,
            reason: dateValidation.reason
          }
        }
      }
      
      const { hasOverlap, conflictingReservation } = checkOverlap()
      
      if (hasOverlap) {
        return { 
          allowed: false, 
          reason: `თარიღები დაკავებულია: ${conflictingReservation?.guestName}` 
        }
      }
      
      return { allowed: true }
    }
    
    // ========================================
    // For CHECK-IN (existing reservation): Check OCCUPIED status
    // ========================================
    // ✅ FIX: Only match room if we have valid IDs
    const roomData = rooms.find((r: any) => {
      if (roomId && r.id && r.id === roomId) return true
      if (roomNumber && r.roomNumber && 
          String(roomNumber).trim() !== '' && 
          String(r.roomNumber).trim() !== '' &&
          String(r.roomNumber) === String(roomNumber)) return true
      return false
    })
    
    if (roomData?.status?.toUpperCase() === 'OCCUPIED') {
      return { 
        allowed: false, 
        reason: `ოთახი ${roomNumber || roomId} უკვე დაკავებულია!\nჯერ გააკეთეთ Check-out.` 
      }
    }
    
    // ✅ USE `reservations` PROP instead of localStorage!
    // ✅ FIX: Only compare if both values exist and are not empty
    const activeRes = reservations.find((r: any) => {
      let isSameRoom = false
      
      // First try roomId comparison (more reliable)
      if (roomId && r.roomId && roomId === r.roomId) {
        isSameRoom = true
      }
      // Fallback to roomNumber only if both exist and are not empty
      else if (roomNumber && r.roomNumber && 
               String(roomNumber).trim() !== '' && 
               String(r.roomNumber).trim() !== '' &&
               String(roomNumber) === String(r.roomNumber)) {
        isSameRoom = true
      }
      
      const isCheckedIn = r.status?.toUpperCase() === 'CHECKED_IN'
      const isDifferent = r.id !== reservation?.id
      return isSameRoom && isCheckedIn && isDifferent
    })
    
    if (activeRes) {
      return { 
        allowed: false, 
        reason: `ოთახზე შემოსულია: ${activeRes.guestName}` 
      }
    }
    
    return { allowed: true }
  }

  const handleSubmit = () => {
    if (!formData.guestName || !formData.checkOut) {
      alert('გთხოვთ შეავსოთ სტუმრის სახელი და Check-out თარიღი')
      return
    }
    
    // ========================================
    // NEW: Validate dates first (for both new and existing reservations)
    // ========================================
    if (formData.checkIn && formData.checkOut) {
      const dateValidation = validateReservationDates(formData.checkIn, formData.checkOut)
      if (!dateValidation.valid) {
        alert(`❌ ${dateValidation.reason}`)
        return
      }
    }
    
    // ========================================
    // For NEW reservations: Check overlap
    // ========================================
    if (!reservation) {
      const { hasOverlap, conflictingReservation } = checkOverlap()
      
      if (hasOverlap) {
        alert(
          `❌ ოთახი დაკავებულია!\n\n` +
          `სტუმარი: ${conflictingReservation?.guestName}\n` +
          `Check-in: ${moment(conflictingReservation?.checkIn).format('DD/MM/YYYY')}\n` +
          `Check-out: ${moment(conflictingReservation?.checkOut).format('DD/MM/YYYY')}`
        )
        return
      }
    } else {
      // For CHECK-IN: Also check occupied status (includes date validation)
      const checkInCheck = canCheckIn()
      if (!checkInCheck.allowed) {
        alert(`❌ Check-in შეუძლებელია\n\n${checkInCheck.reason}`)
        return
      }
    }
    
    // Note: Room status update should be handled by parent component via API
    // Don't update localStorage here since rooms are managed by API/state
    
    // ✅ Use different variable name to avoid conflict with `reservation` prop!
    const newReservation = {
      guestName: formData.guestName,
      guestEmail: formData.guestEmail || '',  // ✅ empty string
      guestPhone: formData.guestPhone || '',
      roomId: formData.roomId,
      checkIn: formData.checkIn,
      checkOut: formData.checkOut,
      adults: formData.adults,
      children: formData.children,
      totalAmount: calculateTotal(),
      status: 'CONFIRMED',
      source: formData.source || 'direct',
      notes: formData.notes || ''  // ✅ empty string
    }
    
    ActivityLogger.log('RESERVATION_CREATE', {
      guest: formData.guestName,
      room: formData.roomNumber,
      checkIn: formData.checkIn,
      checkOut: formData.checkOut,
      amount: formData.totalAmount,
      reservationNumber: newReservation.reservationNumber
    })
    
    onSubmit(newReservation)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-bold">
            ახალი ჯავშანი - ოთახი {room?.roomNumber || formData.roomNumber || 'აირჩიეთ'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">✕</button>
        </div>
        
        {/* ✅ Overlap Warning */}
        {overlapError && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {overlapError}
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">სტუმრის სახელი *</label>
            <input
              type="text"
              value={formData.guestName}
              onChange={(e) => setFormData({...formData, guestName: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="სახელი გვარი"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">📞 ტელეფონი</label>
            <input
              type="tel"
              value={formData.guestPhone}
              onChange={(e) => setFormData({...formData, guestPhone: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="+995..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">📧 Email</label>
            <input
              type="email"
              value={formData.guestEmail}
              onChange={(e) => setFormData({...formData, guestEmail: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="email@example.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">🌍 ქვეყანა</label>
            <select
              value={formData.guestCountry}
              onChange={(e) => setFormData({...formData, guestCountry: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="">აირჩიეთ ქვეყანა</option>
              {countries.map(country => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Check-in *</label>
            <input
              type="date"
              value={formData.checkIn}
              min={getMinimumBookingDate()}
              onChange={(e) => setFormData({...formData, checkIn: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Check-out *</label>
            <input
              type="date"
              value={formData.checkOut}
              min={formData.checkIn 
                ? moment(formData.checkIn).add(1, 'day').format('YYYY-MM-DD')
                : moment(getMinimumBookingDate()).add(1, 'day').format('YYYY-MM-DD')
              }
              onChange={(e) => setFormData({...formData, checkOut: e.target.value})}
              className={`w-full border rounded-lg px-3 py-2 ${overlapError ? 'border-red-500' : ''}`}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">მოზრდილები</label>
            <input
              type="number"
              min="1"
              value={formData.adults}
              onChange={(e) => setFormData({...formData, adults: parseInt(e.target.value) || 1})}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">ბავშვები</label>
            <input
              type="number"
              min="0"
              value={formData.children}
              onChange={(e) => setFormData({...formData, children: parseInt(e.target.value) || 0})}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
        </div>
        
        {/* Summary */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between mb-2">
            <span>ღამეების რაოდენობა:</span>
            <span className="font-medium">{calculateNights()}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span>ფასი ღამეში:</span>
            <span>₾{getDisplayPricePerNight()}</span>
          </div>
          
          {/* Show weekday/weekend breakdown */}
          {(() => {
            const rate = getRateInfo()
            if (rate && rate.weekday !== rate.weekend) {
              return (
                <div className="text-xs text-gray-500 mb-2">
                  🎁 სამუშაო: ₾{rate.weekday} | 🎉 შაბ-კვი: ₾{rate.weekend}
                </div>
              )
            }
            return null
          })()}
          
          {/* Show all price modifiers */}
          {(() => {
            if (!formData.checkIn) return null
            
            const modifiers = []
            
            // Season
            const seasonMod = getSeasonModifier(formData.checkIn)
            if (seasonMod !== 0) {
              const activeSeason = seasons.find(s => {
                if (!s.active) return false
                return moment(formData.checkIn).isBetween(moment(s.startDate), moment(s.endDate), 'day', '[]')
              })
              modifiers.push({
                icon: '🌞',
                label: `სეზონი: ${activeSeason?.name}`,
                value: `${seasonMod > 0 ? '+' : ''}${seasonMod}%`,
                positive: seasonMod < 0
              })
            }
            
            // Special Date
            const specialDate = getSpecialDateModifier(formData.checkIn)
            if (specialDate) {
              modifiers.push({
                icon: '🎉',
                label: specialDate.name,
                value: `${specialDate.modifier > 0 ? '+' : ''}${specialDate.modifier}%`,
                positive: specialDate.modifier < 0
              })
            }
            
            // Weekday
            const weekdayMod = getWeekdayModifier(formData.checkIn)
            if (weekdayMod) {
              modifiers.push({
                icon: '📅',
                label: weekdayMod.dayName,
                value: `${weekdayMod.modifier > 0 ? '+' : ''}${weekdayMod.modifier}%`,
                positive: weekdayMod.modifier < 0
              })
            }
            
            if (modifiers.length === 0) return null
            
            return (
              <div className="text-xs space-y-1 mb-2">
                {modifiers.map((mod, i) => (
                  <div key={i} className={mod.positive ? 'text-green-500' : 'text-orange-500'}>
                    {mod.icon} {mod.label} ({mod.value})
                  </div>
                ))}
              </div>
            )
          })()}

          <div className="flex justify-between text-lg font-bold border-t pt-2">
            <span>სულ:</span>
            <span>₾{calculateTotal()}</span>
          </div>
        </div>
        
        {/* Booking Source */}
        <div className="mt-4">
          <label className="block text-sm font-medium mb-1">ჯავშნის წყარო *</label>
          <select
            value={formData.source}
            onChange={(e) => setFormData({...formData, source: e.target.value})}
            className="w-full border rounded-lg px-3 py-2"
            required
          >
            <option value="direct">🏨 Direct (პირდაპირი)</option>
            <option value="booking">🅱️ Booking.com</option>
            <option value="airbnb">🏠 Airbnb</option>
            <option value="expedia">🌐 Expedia</option>
            <option value="phone">📞 ტელეფონით</option>
            <option value="tour_company">🚌 ტურისტული კომპანია</option>
            <option value="corporate">🏢 კორპორატიული</option>
            <option value="travel_agent">✈️ ტურ. სააგენტო</option>
            <option value="other">📋 სხვა</option>
          </select>
        </div>

        {/* Notes */}
        <div className="mt-4">
          <label className="block text-sm font-medium mb-1">შენიშვნები</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
            className="w-full border rounded-lg px-3 py-2"
            rows={2}
            placeholder="დამატებითი ინფორმაცია..."
          />
        </div>
        
        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            გაუქმება
          </button>
          <button
            onClick={handleSubmit}
            disabled={!formData.guestName || !formData.checkOut || !!overlapError}
            className={`flex-1 px-4 py-2 rounded-lg text-white ${
              !formData.guestName || !formData.checkOut || overlapError
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            ✅ შექმნა
          </button>
        </div>
      </div>
    </div>
  )
}