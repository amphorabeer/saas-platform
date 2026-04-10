'use client'

import React, { useState, useEffect } from 'react'
import moment from 'moment'
import { spaBookingsHeader, spaSidebarMenuItem } from '../lib/constants'
import { RestaurantSpaChargeService, ChargeRequest, ChargeItem } from '../services/RestaurantSpaChargeService'

interface SpaBath {
  id: string
  name: string
  nameEn: string
  price: number
  duration: number
  maxGuests: number
  isActive: boolean
}

interface SpaBooking {
  id: string
  bathId: string
  guestName: string
  guestPhone: string
  guestCount: number
  bookingDate: string
  startTime: string
  endTime: string
  status: 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
  price: number
  notes: string
  roomNumber?: string
  paymentStatus: 'unpaid' | 'paid' | 'room_charge'
  paymentMethod?: 'cash' | 'card' | 'room_charge'
  paidAt?: string
}

interface SpaSettings {
  enabled: boolean
  name: string
  openTime: string
  closeTime: string
  slotDuration: number
  breakBetweenSlots: number
}

export default function SpaCalendar() {
  const [settings, setSettings] = useState<SpaSettings>({
    enabled: false,
    name: spaSidebarMenuItem.label,
    openTime: '10:00',
    closeTime: '21:00',
    slotDuration: 60,
    breakBetweenSlots: 15
  })
  const [baths, setBaths] = useState<SpaBath[]>([])
  const [bookings, setBookings] = useState<SpaBooking[]>([])
  const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'))
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{ bathId: string; time: string } | null>(null)
  const [editingBooking, setEditingBooking] = useState<SpaBooking | null>(null)
  
  // Checked-in guests for room selection
  const [checkedInGuests, setCheckedInGuests] = useState<any[]>([])

  // Process payment
  // State for invoice payment
  const [showCompanySelect, setShowCompanySelect] = useState(false)
  const [companies, setCompanies] = useState<any[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  
  // Load checked-in guests
  const loadCheckedInGuests = async () => {
    try {
      const response = await fetch('/api/hotel/reservations')
      if (response.ok) {
        const data = await response.json()
        const reservations = Array.isArray(data) ? data : (data.reservations || [])
        const checkedIn = reservations.filter((r: any) => 
          r.status === 'CHECKED_IN' || r.status === 'checked_in'
        )
        setCheckedInGuests(checkedIn)
      }
    } catch (e) {
      // Fallback to localStorage
      const saved = localStorage.getItem('hotelReservations')
      if (saved) {
        const reservations = JSON.parse(saved)
        const checkedIn = reservations.filter((r: any) => 
          r.status === 'CHECKED_IN' || r.status === 'checked_in'
        )
        setCheckedInGuests(checkedIn)
      }
    }
  }

  // Load companies
  const loadCompanies = async () => {
    try {
      const response = await fetch('/api/hotel/tour-companies')
      if (response.ok) {
        const data = await response.json()
        setCompanies(data || [])
      }
    } catch (e) {
      const saved = localStorage.getItem('tourCompanies')
      if (saved) setCompanies(JSON.parse(saved))
    }
  }

  const processPayment = async (method: 'cash' | 'card' | 'room_charge' | 'invoice', companyId?: string) => {
    if (!editingBooking?.id) return
    
    // For invoice, require company selection
    if (method === 'invoice' && !companyId) {
      loadCompanies()
      setShowCompanySelect(true)
      return
    }
    
    // Build charge item
    const chargeItems: ChargeItem[] = [{
      id: editingBooking.id,
      name: `${editingBooking.bathName || 'სპა'} - ${editingBooking.serviceName || 'სერვისი'}`,
      quantity: editingBooking.guests || 1,
      unitPrice: editingBooking.price / (editingBooking.guests || 1),
      total: editingBooking.price,
      category: 'spa'
    }]
    
    // Determine customer type
    const hasRoom = !!editingBooking.roomNumber
    
    // Build charge request
    const bookingDate = editingBooking.bookingDate || editingBooking.date || moment().format('YYYY-MM-DD')
    const bookingTime = editingBooking.startTime || editingBooking.time || '00:00'
    
    const chargeRequest: ChargeRequest = {
      sourceType: 'spa',
      sourceId: editingBooking.id,
      sourceRef: `SPA-${moment(bookingDate).format('DDMM')}-${bookingTime.replace(':', '')}`,
      
      customerType: method === 'invoice' ? 'tour_company' : hasRoom ? 'hotel_guest' : 'walk_in',
      
      // Guest info
      roomNumber: editingBooking.roomNumber,
      guestName: editingBooking.guestName,
      
      // Company info for invoice
      companyId: companyId,
      
      // Items and totals
      items: chargeItems,
      subtotal: editingBooking.price,
      tax: 0,
      serviceCharge: 0,
      total: editingBooking.price,
      
      // Payment method (for walk-in)
      paymentMethod: method === 'cash' ? 'cash' : method === 'card' ? 'card' : method === 'invoice' ? 'invoice' : undefined,
      
      notes: editingBooking.notes
    }
    
    // Find reservation ID if hotel guest
    if (hasRoom) {
      const reservation = await RestaurantSpaChargeService.findReservationByRoom(editingBooking.roomNumber!)
      if (reservation) {
        chargeRequest.reservationId = reservation.id
      }
    }
    
    // Process charge
    const result = await RestaurantSpaChargeService.processCharge(chargeRequest)
    
    if (!result.success) {
      alert(`გადახდის შეცდომა: ${result.error}`)
      return
    }
    
    // Update booking
    const updatedBooking: SpaBooking = {
      ...editingBooking,
      paymentStatus: method === 'room_charge' ? 'room_charge' : method === 'invoice' ? 'invoice' : 'paid',
      paymentMethod: method,
      paidAt: new Date().toISOString(),
      transactionId: result.transactionId,
      folioId: result.folioId
    }
    
    // Update booking via API
    try {
      await fetch(`/api/hotel/spa-bookings?id=${editingBooking.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentStatus: method === 'invoice' ? 'invoice' : 'paid',
          paymentMethod: method,
          paidAt: new Date().toISOString()
        })
      })
    } catch (e) {
      console.error('Error updating booking payment:', e)
    }
    
    const updatedBookings = bookings.map(b => 
      b.id === editingBooking.id ? updatedBooking : b
    )
    setBookings(updatedBookings)
    
    console.log(`✅ სპა გადახდა: ${method} - ₾${editingBooking.price}`)
    
    setShowPaymentModal(false)
    setShowBookingModal(false)
    setEditingBooking(null)
  }

  // Load settings and baths from API
  useEffect(() => {
    const loadData = async () => {
      // Load spa settings from API
      try {
        const settingsRes = await fetch('/api/hotel/spa-settings')
        if (settingsRes.ok) {
          const data = await settingsRes.json()
          if (data) {
            setSettings({
              enabled: data.enabled ?? false,
              name: data.name || spaSidebarMenuItem.label,
              openTime: data.openTime || '10:00',
              closeTime: data.closeTime || '21:00',
              slotDuration: data.slotDuration || 60,
              breakBetweenSlots: 15
            })
          }
        }
      } catch (e) {
        console.error('Error loading spa settings:', e)
      }
      
      // Load spa baths from API
      try {
        const bathsRes = await fetch('/api/hotel/spa-baths')
        if (bathsRes.ok) {
          const data = await bathsRes.json()
          if (Array.isArray(data)) {
            setBaths(data.map((b: any) => ({
              id: b.id,
              name: b.name,
              nameEn: b.nameEn || '',
              price: Number(b.pricePerHour || b.price),
              duration: 60,
              maxGuests: b.capacity || 2,
              isActive: b.isActive ?? true
            })))
          }
        }
      } catch (e) {
        console.error('Error loading spa baths:', e)
      }
      
      // Load spa bookings from API
      try {
        const bookingsRes = await fetch('/api/hotel/spa-bookings')
        if (bookingsRes.ok) {
          const data = await bookingsRes.json()
          if (Array.isArray(data)) {
            setBookings(data.map((b: any) => ({
              id: b.id,
              bathId: b.bathId,
              guestName: b.guestName,
              guestPhone: b.guestPhone || '',
              guestCount: b.guests || 2,
              bookingDate: moment(b.date).format('YYYY-MM-DD'),
              startTime: b.startTime,
              endTime: b.endTime,
              status: b.status || 'confirmed',
              price: Number(b.totalPrice),
              notes: b.notes || '',
              roomNumber: b.roomNumber,
              paymentStatus: b.paymentStatus || 'unpaid',
              paymentMethod: b.paymentMethod,
              paidAt: b.paidAt
            })))
          }
        }
      } catch (e) {
        console.error('Error loading spa bookings:', e)
      }
    }
    
    loadData()
    loadCheckedInGuests()
  }, [])

  // Generate time slots based on settings
  const generateTimeSlots = () => {
    const slots: string[] = []
    const [openH, openM] = settings.openTime.split(':').map(Number)
    const [closeH, closeM] = settings.closeTime.split(':').map(Number)
    
    let currentMinutes = openH * 60 + openM
    const endMinutes = closeH * 60 + closeM
    
    while (currentMinutes + settings.slotDuration <= endMinutes) {
      const h = Math.floor(currentMinutes / 60)
      const m = currentMinutes % 60
      slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`)
      currentMinutes += settings.slotDuration + settings.breakBetweenSlots
    }
    
    return slots
  }

  // Get booking for specific bath and time
  const getBooking = (bathId: string, time: string) => {
    return bookings.find(b => 
      b.bathId === bathId && 
      b.bookingDate === selectedDate && 
      b.startTime === time &&
      b.status !== 'cancelled'
    )
  }

  // Handle slot click
  const handleSlotClick = (bathId: string, time: string) => {
    const existingBooking = getBooking(bathId, time)
    if (existingBooking) {
      setEditingBooking(existingBooking)
    } else {
      const bath = baths.find(b => b.id === bathId)
      const endMinutes = time.split(':').map(Number).reduce((h, m) => h * 60 + m) + settings.slotDuration
      const endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`
      
      setEditingBooking({
        id: '',
        bathId,
        guestName: '',
        guestPhone: '',
        guestCount: 2,
        bookingDate: selectedDate,
        startTime: time,
        endTime,
        status: 'confirmed',
        price: bath?.price || 150,
        notes: '',
        paymentStatus: 'unpaid'
      })
    }
    setShowBookingModal(true)
  }

  // Save booking
  const saveBooking = async () => {
    if (!editingBooking?.guestName) {
      alert('შეიყვანეთ სტუმრის სახელი')
      return
    }

    try {
      const bookingData = {
        bathId: editingBooking.bathId,
        guestName: editingBooking.guestName,
        guestPhone: editingBooking.guestPhone,
        guests: editingBooking.guestCount,
        date: editingBooking.bookingDate,
        startTime: editingBooking.startTime,
        endTime: editingBooking.endTime,
        totalPrice: editingBooking.price,
        status: editingBooking.status,
        paymentStatus: editingBooking.paymentStatus,
        roomNumber: editingBooking.roomNumber,
        notes: editingBooking.notes
      }

      let response
      if (editingBooking.id) {
        // Update existing
        response = await fetch(`/api/hotel/spa-bookings/${editingBooking.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bookingData)
        })
      } else {
        // Create new
        response = await fetch('/api/hotel/spa-bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bookingData)
        })
      }

      if (response.ok) {
        const savedBooking = await response.json()
        if (editingBooking.id) {
          setBookings(bookings.map(b => b.id === editingBooking.id ? { ...editingBooking, ...savedBooking } : b))
        } else {
          setBookings([...bookings, { ...editingBooking, id: savedBooking.id }])
        }
        setShowBookingModal(false)
        setEditingBooking(null)
      } else {
        throw new Error('Failed to save booking')
      }
    } catch (e) {
      console.error('Error saving booking:', e)
      alert('შეცდომა ჯავშნის შენახვისას')
    }
  }

  // Cancel booking
  const cancelBooking = async () => {
    if (!editingBooking?.id) return
    if (!confirm('გაუქმდეს ჯავშანი?')) return
    
    try {
      const response = await fetch(`/api/hotel/spa-bookings/${editingBooking.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' })
      })

      if (response.ok) {
        setBookings(bookings.map(b => 
          b.id === editingBooking.id ? { ...b, status: 'cancelled' as const } : b
        ))
        setShowBookingModal(false)
        setEditingBooking(null)
      }
    } catch (e) {
      console.error('Error cancelling booking:', e)
      alert('შეცდომა გაუქმებისას')
    }
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-blue-500'
      case 'in_progress': return 'bg-green-500'
      case 'completed': return 'bg-gray-400'
      case 'no_show': return 'bg-red-500'
      default: return 'bg-gray-300'
    }
  }

  const activeBaths = baths.filter(b => b.isActive)
  const timeSlots = generateTimeSlots()

  if (!settings.enabled) {
    return (
      <div className="p-8 text-center">
        <div className="text-6xl mb-4">🍺</div>
        <h2 className="text-2xl font-bold text-gray-700 mb-2">{spaSidebarMenuItem.label} გამორთულია</h2>
        <p className="text-gray-500">ჩართეთ პარამეტრებში: ⚙️ პარამეტრები → {spaSidebarMenuItem.icon} {spaSidebarMenuItem.label}</p>
      </div>
    )
  }

  if (activeBaths.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="text-6xl mb-4">🛁</div>
        <h2 className="text-2xl font-bold text-gray-700 mb-2">აბაზანები არ არის</h2>
        <p className="text-gray-500">დაამატეთ აბაზანები პარამეტრებში</p>
      </div>
    )
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🍺</span>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{spaBookingsHeader}</h1>
            <p className="text-sm text-gray-500">ჯავშნების კალენდარი</p>
          </div>
        </div>
        
        {/* Date Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedDate(moment(selectedDate).subtract(1, 'day').format('YYYY-MM-DD'))}
            className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            ◀
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          />
          <button
            onClick={() => setSelectedDate(moment(selectedDate).add(1, 'day').format('YYYY-MM-DD'))}
            className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            ▶
          </button>
          <button
            onClick={() => setSelectedDate(moment().format('YYYY-MM-DD'))}
            className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
          >
            დღეს
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="text-2xl font-bold text-blue-600">
            {bookings.filter(b => b.bookingDate === selectedDate && b.status === 'confirmed').length}
          </div>
          <div className="text-sm text-gray-500">დადასტურებული</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="text-2xl font-bold text-green-600">
            {bookings.filter(b => b.bookingDate === selectedDate && b.status === 'in_progress').length}
          </div>
          <div className="text-sm text-gray-500">მიმდინარე</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="text-2xl font-bold text-gray-600">
            {bookings.filter(b => b.bookingDate === selectedDate && b.status === 'completed').length}
          </div>
          <div className="text-sm text-gray-500">დასრულებული</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="text-2xl font-bold text-red-600">
            {bookings.filter(b => b.bookingDate === selectedDate && b.paymentStatus === 'unpaid' && b.status !== 'cancelled').length}
          </div>
          <div className="text-sm text-gray-500">გადაუხდელი</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="text-2xl font-bold text-amber-600">
            ₾{bookings.filter(b => b.bookingDate === selectedDate && (b.paymentStatus === 'paid' || b.paymentStatus === 'room_charge')).reduce((sum, b) => sum + b.price, 0)}
          </div>
          <div className="text-sm text-gray-500">დღის შემოსავალი</div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 w-24">დრო</th>
                {activeBaths.map(bath => (
                  <th key={bath.id} className="px-4 py-3 text-center text-sm font-medium text-gray-600 min-w-[200px]">
                    <div className="flex items-center justify-center gap-2">
                      <span>🛁</span>
                      <span>{bath.name}</span>
                    </div>
                    <div className="text-xs text-gray-400 font-normal">₾{bath.price} / {bath.duration}წთ</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((time, idx) => (
                <tr key={time} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-2 text-sm font-medium text-gray-700 border-r">
                    {time}
                  </td>
                  {activeBaths.map(bath => {
                    const booking = getBooking(bath.id, time)
                    return (
                      <td key={bath.id} className="px-2 py-1 border-r">
                        <button
                          onClick={() => handleSlotClick(bath.id, time)}
                          className={`w-full p-2 rounded-lg text-left transition ${
                            booking 
                              ? `${getStatusColor(booking.status)} text-white` 
                              : 'bg-green-50 hover:bg-green-100 border-2 border-dashed border-green-200'
                          }`}
                        >
                          {booking ? (
                            <div>
                              <div className="font-medium text-sm flex items-center justify-between">
                                {booking.guestName}
                                {booking.paymentStatus === 'paid' && <span>✅</span>}
                                {booking.paymentStatus === 'room_charge' && <span>🏨</span>}
                                {booking.paymentStatus === 'unpaid' && <span>💰</span>}
                              </div>
                              <div className="text-xs opacity-80">
                                {booking.guestCount} სტუმარი • ₾{booking.price}
                                {booking.roomNumber && ` • ოთახი ${booking.roomNumber}`}
                              </div>
                            </div>
                          ) : (
                            <div className="text-center text-green-600 text-sm">
                              + ჯავშანი
                            </div>
                          )}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && editingBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span>🛁</span>
              {editingBooking.id ? 'ჯავშნის რედაქტირება' : 'ახალი ჯავშანი'}
            </h3>
            
            <div className="space-y-4">
              {/* Bath & Time Info */}
              <div className="bg-amber-50 rounded-lg p-3">
                <div className="font-medium">{baths.find(b => b.id === editingBooking.bathId)?.name}</div>
                <div className="text-sm text-gray-600">
                  {moment(editingBooking.bookingDate).format('DD/MM/YYYY')} • {editingBooking.startTime} - {editingBooking.endTime}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">სტუმრის სახელი *</label>
                <input
                  type="text"
                  value={editingBooking.guestName}
                  onChange={(e) => setEditingBooking({ ...editingBooking, guestName: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="სახელი გვარი"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">ტელეფონი</label>
                  <input
                    type="tel"
                    value={editingBooking.guestPhone}
                    onChange={(e) => setEditingBooking({ ...editingBooking, guestPhone: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="+995..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">სტუმრების რაოდენობა</label>
                  <input
                    type="number"
                    value={editingBooking.guestCount}
                    onChange={(e) => setEditingBooking({ ...editingBooking, guestCount: Number(e.target.value) })}
                    className="w-full px-4 py-2 border rounded-lg"
                    min={1}
                    max={baths.find(b => b.id === editingBooking.bathId)?.maxGuests || 4}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">ფასი (₾)</label>
                  <input
                    type="number"
                    value={editingBooking.price}
                    onChange={(e) => setEditingBooking({ ...editingBooking, price: Number(e.target.value) })}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">სტუმარი / ოთახი</label>
                  <select
                    value={editingBooking.roomNumber || ''}
                    onChange={(e) => {
                      const selectedValue = e.target.value
                      if (selectedValue === '') {
                        setEditingBooking({ ...editingBooking, roomNumber: '' })
                      } else if (selectedValue === 'manual') {
                        // Will show manual input
                        setEditingBooking({ ...editingBooking, roomNumber: '' })
                      } else {
                        // Find guest and set room + name
                        const guest = checkedInGuests.find(g => g.roomNumber === selectedValue)
                        if (guest) {
                          setEditingBooking({ 
                            ...editingBooking, 
                            roomNumber: selectedValue,
                            guestName: editingBooking.guestName || guest.guestName || guest.guest?.name || ''
                          })
                        }
                      }
                    }}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="">-- არ არის სტუმარი --</option>
                    {checkedInGuests.map(guest => (
                      <option key={guest.id} value={guest.roomNumber}>
                        🏨 ოთახი {guest.roomNumber} - {guest.guestName || guest.guest?.name || 'სტუმარი'}
                      </option>
                    ))}
                  </select>
                  {checkedInGuests.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">ჩექინი სტუმრები არ არის</p>
                  )}
                </div>
              </div>

              {editingBooking.id && (
                <div>
                  <label className="block text-sm font-medium mb-2">სტატუსი</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setEditingBooking({ ...editingBooking, status: 'confirmed' })}
                      className={`px-3 py-2 rounded-lg text-sm font-medium ${
                        editingBooking.status === 'confirmed' 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                    >
                      ✓ დადასტურებული
                    </button>
                    <button
                      onClick={() => setEditingBooking({ ...editingBooking, status: 'in_progress' })}
                      className={`px-3 py-2 rounded-lg text-sm font-medium ${
                        editingBooking.status === 'in_progress' 
                          ? 'bg-amber-500 text-white' 
                          : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                      }`}
                    >
                      ⏳ მიმდინარე
                    </button>
                    <button
                      onClick={() => setEditingBooking({ ...editingBooking, status: 'completed' })}
                      className={`px-3 py-2 rounded-lg text-sm font-medium ${
                        editingBooking.status === 'completed' 
                          ? 'bg-green-500 text-white' 
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      ✅ დასრულებული
                    </button>
                    <button
                      onClick={() => setEditingBooking({ ...editingBooking, status: 'no_show' })}
                      className={`px-3 py-2 rounded-lg text-sm font-medium ${
                        editingBooking.status === 'no_show' 
                          ? 'bg-red-500 text-white' 
                          : 'bg-red-100 text-red-700 hover:bg-red-200'
                      }`}
                    >
                      ✗ არ გამოცხადდა
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">შენიშვნა</label>
                <textarea
                  value={editingBooking.notes}
                  onChange={(e) => setEditingBooking({ ...editingBooking, notes: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  rows={2}
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              {editingBooking.id && (
                <button
                  onClick={cancelBooking}
                  className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                >
                  გაუქმება
                </button>
              )}
              <button
                onClick={() => { setShowBookingModal(false); setEditingBooking(null) }}
                className="flex-1 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                დახურვა
              </button>
              <button
                onClick={saveBooking}
                className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
              >
                შენახვა
              </button>
            </div>
            
            {/* Payment Button */}
            {editingBooking.id && editingBooking.paymentStatus === 'unpaid' && (
              <button
                onClick={() => setShowPaymentModal(true)}
                className="w-full mt-3 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium"
              >
                💳 გადახდა - ₾{editingBooking.price}
              </button>
            )}
            
            {editingBooking.id && editingBooking.paymentStatus !== 'unpaid' && (
              <div className="mt-3 p-3 bg-green-50 rounded-lg text-center text-green-700">
                ✅ გადახდილია {editingBooking.paymentMethod === 'cash' ? 'ნაღდით' : editingBooking.paymentMethod === 'card' ? 'ბარათით' : editingBooking.paymentMethod === 'invoice' ? 'ინვოისით' : 'ოთახზე ჩაწერილი'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && editingBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">💳 სპა-ს გადახდა</h3>
            
            <div className="bg-amber-50 rounded-lg p-4 mb-4">
              <div className="font-medium">{baths.find(b => b.id === editingBooking.bathId)?.name}</div>
              <div className="text-sm text-gray-600">{editingBooking.guestName} • {editingBooking.guestCount} სტუმარი</div>
              <div className="text-2xl font-bold text-amber-600 mt-2">₾{editingBooking.price}</div>
            </div>
            
            {/* Company Selection for Invoice */}
            {showCompanySelect ? (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">აირჩიეთ კომპანია</label>
                <select
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 mb-3"
                >
                  <option value="">აირჩიეთ...</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (selectedCompanyId) {
                        processPayment('invoice', selectedCompanyId)
                        setShowCompanySelect(false)
                        setSelectedCompanyId('')
                      } else {
                        alert('გთხოვთ აირჩიოთ კომპანია')
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                  >
                    ✓ დადასტურება
                  </button>
                  <button
                    onClick={() => {
                      setShowCompanySelect(false)
                      setSelectedCompanyId('')
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 rounded-lg"
                  >
                    უკან
                  </button>
                </div>
              </div>
            ) : (
              <>
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
                  {editingBooking.roomNumber && (
                    <button
                      onClick={() => processPayment('room_charge')}
                      className="p-4 bg-purple-100 rounded-xl hover:bg-purple-200 text-center"
                    >
                      <div className="text-2xl mb-1">🏨</div>
                      <div className="font-medium">ოთახზე (#{editingBooking.roomNumber})</div>
                    </button>
                  )}
                  <button
                    onClick={() => processPayment('invoice')}
                    className="p-4 bg-orange-100 rounded-xl hover:bg-orange-200 text-center"
                  >
                    <div className="text-2xl mb-1">📄</div>
                    <div className="font-medium">ინვოისი</div>
                  </button>
                </div>
                
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="w-full px-4 py-2 bg-gray-200 rounded-lg"
                >
                  გაუქმება
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}