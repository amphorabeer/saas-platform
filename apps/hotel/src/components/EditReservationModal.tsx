'use client'

import { useState, useEffect } from 'react'
import moment from 'moment'

interface EditReservationModalProps {
  reservation: any
  rooms: any[]
  reservations: any[]
  onClose: () => void
  onSave: (updates: any) => void
  onDelete: (id: string) => void
}

export default function EditReservationModal({ 
  reservation, 
  rooms,
  reservations,
  onClose, 
  onSave,
  onDelete 
}: EditReservationModalProps) {
  const [formData, setFormData] = useState({
    guestName: reservation.guestName,
    guestEmail: reservation.guestEmail || '',
    guestPhone: reservation.guestPhone || '',
    guestCountry: reservation.guestCountry || '',
    roomId: reservation.roomId,
    checkIn: moment(reservation.checkIn).format('YYYY-MM-DD'),
    checkOut: moment(reservation.checkOut).format('YYYY-MM-DD'),
    adults: reservation.adults || 1,
    children: reservation.children || 0,
    totalAmount: reservation.totalAmount,
    source: reservation.source || 'direct',
    notes: reservation.notes || '',
    status: reservation.status,
    // Company fields
    companyName: reservation.companyName || '',
    companyTaxId: reservation.companyTaxId || '',
    companyAddress: reservation.companyAddress || '',
    companyBank: reservation.companyBank || '',
    companyBankAccount: reservation.companyBankAccount || ''
  })
  
  const [showCompany, setShowCompany] = useState(!!reservation.companyName)
  const [minCheckInDate, setMinCheckInDate] = useState('')
  const [dateError, setDateError] = useState('')
  const [isEditable, setIsEditable] = useState(true)
  const [editBlockReason, setEditBlockReason] = useState('')
  
  // Check if reservation is editable (blocked after Night Audit)
  const isReservationEditable = (reservation: any): { editable: boolean; reason?: string } => {
    if (typeof window === 'undefined') {
      return { editable: true }
    }
    
    // Rule 1: If not checked out, check if check-in date is closed
    if (reservation.status !== 'CHECKED_OUT') {
      const checkInDate = (reservation.checkInDate || reservation.checkIn || '').split('T')[0]
      
      // Get business date
      const lastAuditDate = localStorage.getItem('lastNightAuditDate')
      const businessDate = lastAuditDate 
        ? moment(lastAuditDate).add(1, 'day').format('YYYY-MM-DD')
        : moment().format('YYYY-MM-DD')
      
      if (checkInDate < businessDate) {
        return { 
          editable: false, 
          reason: `Check-in თარიღი (${moment(checkInDate).format('DD/MM/YYYY')}) დახურულია Night Audit-ით` 
        }
      }
      
      return { editable: true }
    }
    
    // Rule 2: CHECKED_OUT reservation - check if checkout date is audited
    const checkOutDate = (reservation.checkOutDate || reservation.checkOut || '').split('T')[0]
    
    // Check if this date has been closed by Night Audit
    const closedAudits = JSON.parse(localStorage.getItem('closedNightAudits') || '[]')
    const nightAudits = JSON.parse(localStorage.getItem('nightAudits') || '[]')
    
    const isAudited = closedAudits.some((audit: any) => 
      audit.date === checkOutDate || audit.businessDate === checkOutDate
    ) || nightAudits.some((audit: any) => 
      audit.date === checkOutDate && audit.status === 'completed'
    )
    
    // Also check lastNightAuditDate
    const lastAuditDate = localStorage.getItem('lastNightAuditDate')
    if (lastAuditDate && checkOutDate <= lastAuditDate) {
      return { 
        editable: false, 
        reason: `რეზერვაცია დახურულია Night Audit-ით (${moment(lastAuditDate).format('DD/MM/YYYY')}).\nმხოლოდ ნახვაა შესაძლებელი.` 
      }
    }
    
    if (isAudited) {
      return { 
        editable: false, 
        reason: `Check-out თარიღი (${moment(checkOutDate).format('DD/MM/YYYY')}) დახურულია Night Audit-ით.\nმხოლოდ ნახვაა შესაძლებელი.` 
      }
    }
    
    return { editable: true }
  }
  
  // Get Business Day (minimum allowed check-in date)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const lastNightAuditDate = localStorage.getItem('lastNightAuditDate')
      
      if (lastNightAuditDate) {
        // Business day is day after last audit
        const businessDay = moment(lastNightAuditDate).add(1, 'day').format('YYYY-MM-DD')
        setMinCheckInDate(businessDay)
      } else {
        // If no audit done, allow from today
        setMinCheckInDate(moment().format('YYYY-MM-DD'))
      }
      
      // Check if reservation is editable
      const editCheck = isReservationEditable(reservation)
      setIsEditable(editCheck.editable)
      setEditBlockReason(editCheck.reason || '')
    }
  }, [reservation])
  
  // Check if room is available for given dates (excluding current reservation)
  const isRoomAvailable = (roomId: string, checkIn: string, checkOut: string): boolean => {
    const checkInDate = moment(checkIn).clone().startOf('day')
    const checkOutDate = moment(checkOut).clone().startOf('day')
    
    return !reservations.some(res => {
      // Skip current reservation
      if (res.id === reservation.id) return false
      
      // Skip cancelled/no-show
      if (['CANCELLED', 'NO_SHOW'].includes(res.status)) return false
      
      // ✅ FIX: Check if same room - handle both roomId and room.id
      const resRoomId = res.roomId || res.room?.id
      if (!resRoomId || resRoomId !== roomId) return false
      
      // Check date overlap - use clone() to avoid mutation!
      const resCheckIn = moment(res.checkIn).clone().startOf('day')
      const resCheckOut = moment(res.checkOut).clone().startOf('day')
      
      // ✅ FIX: Overlap exists only if: checkIn < resCheckOut AND checkOut > resCheckIn
      // Same day checkout/checkin is NOT overlap (checkout day is free for new checkin)
      const overlaps = checkInDate.isBefore(resCheckOut) && checkOutDate.isAfter(resCheckIn)
      
      console.log('EditModal overlap check:', {
        newCheckIn: checkInDate.format('YYYY-MM-DD'),
        newCheckOut: checkOutDate.format('YYYY-MM-DD'),
        existingGuest: res.guestName,
        existingCheckIn: resCheckIn.format('YYYY-MM-DD'),
        existingCheckOut: resCheckOut.format('YYYY-MM-DD'),
        overlaps
      })
      
      return overlaps
    })
  }
  
  // Get available rooms for current dates
  const getAvailableRooms = () => {
    return rooms.map(room => ({
      ...room,
      available: isRoomAvailable(room.id, formData.checkIn, formData.checkOut),
      conflictingReservation: reservations.find(res => {
        if (res.id === reservation.id) return false
        const resRoomId = res.roomId || res.room?.id
        if (resRoomId !== room.id) return false
        if (['CANCELLED', 'NO_SHOW'].includes(res.status)) return false
        
        // Use clone() to avoid mutation
        const checkIn = moment(formData.checkIn).clone().startOf('day')
        const checkOut = moment(formData.checkOut).clone().startOf('day')
        const resCheckIn = moment(res.checkIn).clone().startOf('day')
        const resCheckOut = moment(res.checkOut).clone().startOf('day')
        
        return checkIn.isBefore(resCheckOut) && checkOut.isAfter(resCheckIn)
      })
    }))
  }
  
  const availableRooms = getAvailableRooms()
  
  // Validate dates on change
  const handleCheckInChange = (newCheckIn: string) => {
    if (minCheckInDate && newCheckIn < minCheckInDate) {
      setDateError(`Check-In არ შეიძლება ${moment(minCheckInDate).format('DD/MM/YYYY')}-მდე (დახურული პერიოდი)`)
      return
    }
    
    setDateError('')
    
    const newCheckOut = formData.checkOut <= newCheckIn 
      ? moment(newCheckIn).add(1, 'day').format('YYYY-MM-DD')
      : formData.checkOut
    
    // Check if current room is still available with new dates
    const stillAvailable = isRoomAvailable(formData.roomId, newCheckIn, newCheckOut)
    
    if (!stillAvailable && formData.roomId !== reservation.roomId) {
      setDateError('არჩეული ოთახი დაკავებულია ახალ თარიღებზე!')
    }
    
    setFormData({
      ...formData, 
      checkIn: newCheckIn,
      checkOut: newCheckOut
    })
  }
  
  const handleCheckOutChange = (newCheckOut: string) => {
    if (newCheckOut <= formData.checkIn) {
      setDateError('Check-Out უნდა იყოს Check-In-ის შემდეგ')
      return
    }
    
    // Check if current room is still available with new dates
    const stillAvailable = isRoomAvailable(formData.roomId, formData.checkIn, newCheckOut)
    
    if (!stillAvailable && formData.roomId !== reservation.roomId) {
      setDateError('არჩეული ოთახი დაკავებულია ახალ თარიღებზე!')
    } else {
      setDateError('')
    }
    
    setFormData({...formData, checkOut: newCheckOut})
  }
  
  const handleDelete = () => {
    if (confirm('ნამდვილად გსურთ ჯავშნის წაშლა?')) {
      onDelete(reservation.id)
      onClose()
    }
  }
  
  const handleSave = () => {
    // Validation
    if (!formData.guestName.trim()) {
      alert('შეიყვანეთ სტუმრის სახელი')
      return
    }
    
    if (formData.checkIn < minCheckInDate) {
      alert(`Check-In არ შეიძლება ${moment(minCheckInDate).format('DD/MM/YYYY')}-მდე`)
      return
    }
    
    if (formData.checkOut <= formData.checkIn) {
      alert('Check-Out უნდა იყოს Check-In-ის შემდეგ')
      return
    }
    
    // Check room availability
    if (!isRoomAvailable(formData.roomId, formData.checkIn, formData.checkOut)) {
      const room = rooms.find(r => r.id === formData.roomId)
      alert(`⚠️ ოთახი ${room?.roomNumber} დაკავებულია არჩეულ თარიღებზე!`)
      return
    }
    
    onSave({
      guestName: formData.guestName,
      guestEmail: formData.guestEmail || '',
      guestPhone: formData.guestPhone || '',
      guestCountry: formData.guestCountry || '',
      roomId: formData.roomId,
      checkIn: formData.checkIn,
      checkOut: formData.checkOut,
      adults: formData.adults,
      children: formData.children,
      totalAmount: formData.totalAmount,
      status: formData.status,
      source: formData.source || 'direct',
      notes: formData.notes || '',
      // Company fields
      companyName: showCompany ? formData.companyName : '',
      companyTaxId: showCompany ? formData.companyTaxId : '',
      companyAddress: showCompany ? formData.companyAddress : '',
      companyBank: showCompany ? formData.companyBank : '',
      companyBankAccount: showCompany ? formData.companyBankAccount : ''
    })
  }
  
  // Countries list
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
    { code: 'OTHER', name: 'სხვა' }
  ]
  
  const nights = moment(formData.checkOut).diff(moment(formData.checkIn), 'days')
  const pricePerNight = nights > 0 ? (formData.totalAmount / nights).toFixed(0) : 0
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">✏️ ჯავშნის რედაქტირება</h2>
            <p className="text-blue-100 text-sm">#{reservation.reservationNumber || reservation.id}</p>
          </div>
          <button onClick={onClose} className="text-2xl hover:text-blue-200">×</button>
        </div>
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Edit Blocked Warning */}
          {!isEditable && (
            <div className="mb-4 p-4 bg-yellow-100 border-l-4 border-yellow-500 rounded-lg">
              <div className="flex items-start">
                <span className="text-2xl mr-3">🔒</span>
                <div>
                  <p className="font-bold text-yellow-800 mb-1">რეზერვაცია დაბლოკილია</p>
                  <p className="text-sm text-yellow-700 whitespace-pre-line">{editBlockReason}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Date Error Alert */}
          {dateError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              ⚠️ {dateError}
            </div>
          )}
          
          {/* Business Day Info */}
          {minCheckInDate && isEditable && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm">
              📅 მინიმალური Check-In თარიღი: <strong>{moment(minCheckInDate).format('DD/MM/YYYY')}</strong>
              <span className="text-xs ml-2">(Night Audit დახურვის მიხედვით)</span>
            </div>
          )}
          
          {/* Guest Information */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">👤 სტუმრის ინფორმაცია</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">სახელი *</label>
                <input
                  type="text"
                  className={`w-full border rounded-lg px-3 py-2 text-sm ${
                    !isEditable ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                  value={formData.guestName}
                  onChange={(e) => setFormData({...formData, guestName: e.target.value})}
                  disabled={!isEditable}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">📞 ტელეფონი</label>
                  <input
                  type="tel"
                  className={`w-full border rounded-lg px-3 py-2 text-sm ${
                    !isEditable ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                  value={formData.guestPhone}
                  onChange={(e) => setFormData({...formData, guestPhone: e.target.value})}
                  placeholder="+995..."
                  disabled={!isEditable}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">📧 Email</label>
                <input
                  type="email"
                  className={`w-full border rounded-lg px-3 py-2 text-sm ${
                    !isEditable ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                  value={formData.guestEmail}
                  onChange={(e) => setFormData({...formData, guestEmail: e.target.value})}
                  disabled={!isEditable}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">🌍 ქვეყანა</label>
                <select
                  className={`w-full border rounded-lg px-3 py-2 text-sm ${
                    !isEditable ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                  value={formData.guestCountry}
                  onChange={(e) => setFormData({...formData, guestCountry: e.target.value})}
                  disabled={!isEditable}
                >
                  <option value="">აირჩიეთ</option>
                  {countries.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          {/* Company Toggle */}
          <div className="mb-4">
            <label className={`flex items-center gap-2 ${isEditable ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
              <input
                type="checkbox"
                checked={showCompany}
                onChange={(e) => setShowCompany(e.target.checked)}
                className="w-4 h-4"
                disabled={!isEditable}
              />
              <span className="text-sm font-medium">🏢 კომპანია</span>
            </label>
            
            {showCompany && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">კომპანიის სახელი</label>
                  <input
                    type="text"
                    className={`w-full border rounded-lg px-3 py-2 text-sm ${
                      !isEditable ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                    value={formData.companyName}
                    onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                    disabled={!isEditable}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">საიდენტიფიკაციო</label>
                  <input
                    type="text"
                    className={`w-full border rounded-lg px-3 py-2 text-sm ${
                      !isEditable ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                    value={formData.companyTaxId}
                    onChange={(e) => setFormData({...formData, companyTaxId: e.target.value})}
                    disabled={!isEditable}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">მისამართი</label>
                  <input
                    type="text"
                    className={`w-full border rounded-lg px-3 py-2 text-sm ${
                      !isEditable ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                    value={formData.companyAddress}
                    onChange={(e) => setFormData({...formData, companyAddress: e.target.value})}
                    disabled={!isEditable}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">ბანკი</label>
                  <input
                    type="text"
                    className={`w-full border rounded-lg px-3 py-2 text-sm ${
                      !isEditable ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                    value={formData.companyBank}
                    onChange={(e) => setFormData({...formData, companyBank: e.target.value})}
                    disabled={!isEditable}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">ანგარიში</label>
                  <input
                    type="text"
                    className={`w-full border rounded-lg px-3 py-2 text-sm ${
                      !isEditable ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                    value={formData.companyBankAccount}
                    onChange={(e) => setFormData({...formData, companyBankAccount: e.target.value})}
                    disabled={!isEditable}
                  />
                </div>
              </div>
            )}
          </div>
          
          {/* Room & Dates */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">🏠 ოთახი და თარიღები</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">ოთახი</label>
                <select
                  className={`w-full border rounded-lg px-3 py-2 text-sm ${
                    !isEditable ? 'bg-gray-100 cursor-not-allowed' :
                    !availableRooms.find(r => r.id === formData.roomId)?.available && 
                    formData.roomId !== reservation.roomId
                      ? 'border-red-500 bg-red-50' 
                      : ''
                  }`}
                  value={formData.roomId}
                  disabled={!isEditable}
                  onChange={(e) => {
                    const selectedRoom = availableRooms.find(r => r.id === e.target.value)
                    if (selectedRoom && !selectedRoom.available) {
                      const conflict = selectedRoom.conflictingReservation
                      alert(`⚠️ ოთახი ${selectedRoom.roomNumber} დაკავებულია!\n\n` +
                        `სტუმარი: ${conflict?.guestName}\n` +
                        `თარიღები: ${moment(conflict?.checkIn).format('DD/MM')} - ${moment(conflict?.checkOut).format('DD/MM')}`)
                      return
                    }
                    setFormData({...formData, roomId: e.target.value})
                  }}
                >
                  {availableRooms.map(room => (
                    <option 
                      key={room.id} 
                      value={room.id}
                      disabled={!room.available && room.id !== reservation.roomId}
                      className={!room.available && room.id !== reservation.roomId ? 'text-gray-400' : ''}
                    >
                      {room.roomNumber} - {room.roomType}
                      {!room.available && room.id !== reservation.roomId && ' ❌ დაკავებული'}
                      {room.id === reservation.roomId && ' ✓ მიმდინარე'}
                    </option>
                  ))}
                </select>
                
                {/* Availability hint */}
                {formData.roomId !== reservation.roomId && availableRooms.find(r => r.id === formData.roomId)?.available && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ ოთახი თავისუფალია არჩეულ თარიღებზე
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">სტატუსი</label>
                <select
                  className={`w-full border rounded-lg px-3 py-2 text-sm ${
                    !isEditable ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  disabled={!isEditable}
                >
                  <option value="CONFIRMED">📅 დადასტურებული</option>
                  <option value="CHECKED_IN">✅ შემოსული</option>
                  <option value="CHECKED_OUT">🚪 გასული</option>
                  <option value="NO_SHOW">❌ No-Show</option>
                  <option value="CANCELLED">🚫 გაუქმებული</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Check-In *</label>
                <input
                  type="date"
                  className={`w-full border rounded-lg px-3 py-2 text-sm ${
                    !isEditable ? 'bg-gray-100 cursor-not-allowed' :
                    formData.checkIn < minCheckInDate ? 'border-red-500 bg-red-50' : ''
                  }`}
                  value={formData.checkIn}
                  min={minCheckInDate}
                  onChange={(e) => handleCheckInChange(e.target.value)}
                  disabled={!isEditable}
                />
                {formData.checkIn < minCheckInDate && (
                  <p className="text-xs text-red-500 mt-1">⚠️ დახურული პერიოდი</p>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Check-Out *</label>
                <input
                  type="date"
                  className={`w-full border rounded-lg px-3 py-2 text-sm ${
                    !isEditable ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                  value={formData.checkOut}
                  min={moment(formData.checkIn).add(1, 'day').format('YYYY-MM-DD')}
                  onChange={(e) => handleCheckOutChange(e.target.value)}
                  disabled={!isEditable}
                />
              </div>
            </div>
          </div>
          
          {/* Guests & Amount */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">👥 სტუმრები და თანხა</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">მოზრდილები</label>
                <input
                  type="number"
                  min="1"
                  className={`w-full border rounded-lg px-3 py-2 text-sm ${
                    !isEditable ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                  value={formData.adults}
                  onChange={(e) => setFormData({...formData, adults: parseInt(e.target.value) || 1})}
                  disabled={!isEditable}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">ბავშვები</label>
                <input
                  type="number"
                  min="0"
                  className={`w-full border rounded-lg px-3 py-2 text-sm ${
                    !isEditable ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                  value={formData.children}
                  onChange={(e) => setFormData({...formData, children: parseInt(e.target.value) || 0})}
                  disabled={!isEditable}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">თანხა (₾)</label>
                <input
                  type="number"
                  className={`w-full border rounded-lg px-3 py-2 text-sm ${
                    !isEditable ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                  value={formData.totalAmount}
                  onChange={(e) => setFormData({...formData, totalAmount: parseInt(e.target.value) || 0})}
                  disabled={!isEditable}
                />
              </div>
            </div>
            {/* Summary */}
            <div className="mt-2 p-2 bg-gray-50 rounded-lg text-xs text-gray-600">
              📊 {nights} ღამე × ₾{pricePerNight} = <strong>₾{formData.totalAmount}</strong>
            </div>
          </div>
          
          {/* Booking Source */}
          <div className="mb-4">
            <label className="block text-xs text-gray-500 mb-1">📊 ჯავშნის წყარო</label>
            <select
              className={`w-full border rounded-lg px-3 py-2 text-sm ${
                !isEditable ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
              value={formData.source}
              onChange={(e) => setFormData({...formData, source: e.target.value})}
              disabled={!isEditable}
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
          <div className="mb-4">
            <label className="block text-xs text-gray-500 mb-1">📝 შენიშვნები</label>
            <textarea
              className={`w-full border rounded-lg px-3 py-2 text-sm ${
                !isEditable ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="დამატებითი ინფორმაცია..."
              disabled={!isEditable}
            />
          </div>
        </div>
        
        {/* Footer */}
        <div className="border-t p-4 bg-gray-50 flex justify-between">
          <button
            onClick={handleDelete}
            disabled={!isEditable}
            className={`px-4 py-2 rounded-lg text-sm ${
              !isEditable 
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                : 'bg-red-100 text-red-700 hover:bg-red-200'
            }`}
          >
            🗑️ წაშლა
          </button>
          
          <div className="flex gap-3">
            <button 
              onClick={onClose} 
              className="px-4 py-2 border rounded-lg hover:bg-gray-100 text-sm"
            >
              გაუქმება
            </button>
            {isEditable ? (
              <button 
                onClick={handleSave}
                disabled={!!dateError || formData.checkIn < minCheckInDate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                💾 შენახვა
              </button>
            ) : (
              <button 
                disabled
                className="px-4 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed text-sm"
              >
                🔒 მხოლოდ ნახვა
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}