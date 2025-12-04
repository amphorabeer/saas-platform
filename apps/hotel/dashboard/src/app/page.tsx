'use client'

import { useState, useEffect } from 'react'

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
  const [activeTab, setActiveTab] = useState('rooms')
  const [rooms, setRooms] = useState<Room[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [showCheckInModal, setShowCheckInModal] = useState(false)
  
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

  async function loadRooms() {
    try {
      const res = await fetch('/api/hotel/rooms')
      if (res.ok) {
        const data = await res.json()
        setRooms(data)
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
      }
    } catch (error) {
      console.error('Failed to load reservations:', error)
    }
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

  async function checkInGuest(data: any) {
    try {
      const res = await fetch('/api/hotel/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (res.ok) {
        setShowCheckInModal(false)
        loadRooms()
        loadReservations()
      }
    } catch (error) {
      console.error('Failed to check in guest:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🏨 Hotel Management System</h1>
            <p className="text-sm text-gray-500">Hotel Tbilisi Dashboard</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setShowCheckInModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              + ახალი ჯავშანი
            </button>
            <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200">
              ⚙️ პარამეტრები
            </button>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-sm">სულ ნომრები</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <span className="text-2xl">🏨</span>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-sm">დაკავებული</p>
                <p className="text-3xl font-bold text-red-600">{stats.occupied}</p>
              </div>
              <span className="text-2xl">🔴</span>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-sm">თავისუფალი</p>
                <p className="text-3xl font-bold text-green-600">{stats.vacant}</p>
              </div>
              <span className="text-2xl">🟢</span>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-sm">დასუფთავება</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.cleaning}</p>
              </div>
              <span className="text-2xl">🧹</span>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-sm">დატვირთვა</p>
                <p className="text-3xl font-bold text-blue-600">{stats.occupancyRate}%</p>
              </div>
              <span className="text-2xl">📊</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="px-6">
        <div className="bg-white rounded-t-lg shadow">
          <div className="flex border-b overflow-x-auto">
            <button
              onClick={() => setActiveTab('rooms')}
              className={`px-6 py-3 font-medium transition whitespace-nowrap ${
                activeTab === 'rooms' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              🏨 ნომრები
            </button>
            <button
              onClick={() => setActiveTab('reservations')}
              className={`px-6 py-3 font-medium transition whitespace-nowrap ${
                activeTab === 'reservations' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              📅 ჯავშნები
            </button>
            <button
              onClick={() => setActiveTab('housekeeping')}
              className={`px-6 py-3 font-medium transition whitespace-nowrap ${
                activeTab === 'housekeeping' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              🧹 დასუფთავება
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-6 py-3 font-medium transition whitespace-nowrap ${
                activeTab === 'reports' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              📊 რეპორტები
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="px-6 pb-6">
        <div className="bg-white rounded-b-lg shadow min-h-[500px]">
          {/* Rooms Tab */}
          {activeTab === 'rooms' && (
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">ნომრების მდგომარეობა</h2>
              
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

          {/* Reservations Tab */}
          {activeTab === 'reservations' && (
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">აქტიური ჯავშნები</h2>
              {reservations.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  რეზერვაციები არ მოიძებნა
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3 text-sm font-medium text-gray-600">სტუმარი</th>
                        <th className="text-left p-3 text-sm font-medium text-gray-600">ნომერი</th>
                        <th className="text-left p-3 text-sm font-medium text-gray-600">Check In</th>
                        <th className="text-left p-3 text-sm font-medium text-gray-600">Check Out</th>
                        <th className="text-left p-3 text-sm font-medium text-gray-600">თანხა</th>
                        <th className="text-left p-3 text-sm font-medium text-gray-600">სტატუსი</th>
                        <th className="text-left p-3 text-sm font-medium text-gray-600">მოქმედება</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reservations.map(res => (
                        <tr key={res.id} className="border-b hover:bg-gray-50">
                          <td className="p-3">
                            <div>
                              <div className="font-medium">{res.guestName}</div>
                              <div className="text-sm text-gray-500">{res.guestEmail}</div>
                            </div>
                          </td>
                          <td className="p-3">{res.roomNumber || rooms.find(r => r.id === res.roomId)?.roomNumber || '-'}</td>
                          <td className="p-3">{new Date(res.checkIn).toLocaleDateString('ka-GE')}</td>
                          <td className="p-3">{new Date(res.checkOut).toLocaleDateString('ka-GE')}</td>
                          <td className="p-3 font-medium">₾{res.totalAmount}</td>
                          <td className="p-3">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              res.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                              res.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {res.status}
                            </span>
                          </td>
                          <td className="p-3">
                            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                              Check In
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Other tabs */}
          {activeTab === 'housekeeping' && (
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">დასუფთავების განრიგი</h2>
              <p className="text-gray-500">მალე დაემატება...</p>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">რეპორტები</h2>
              <p className="text-gray-500">მალე დაემატება...</p>
            </div>
          )}
        </div>
      </div>

      {/* Check-in Modal */}
      {showCheckInModal && (
        <CheckInModal 
          rooms={rooms.filter(r => r.status === 'VACANT')}
          onClose={() => setShowCheckInModal(false)}
          onSubmit={checkInGuest}
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
        {room.roomType || (room.floor === 3 ? 'Suite' : room.floor === 2 ? 'Deluxe' : 'Standard')}
      </div>
      <div className="text-xs font-medium mb-2">
        {config.label}
      </div>
      <div className="text-xs text-gray-600">
        ₾{room.basePrice}/ღამე
      </div>
      
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

// Check-in Modal Component
function CheckInModal({ rooms, onClose, onSubmit }: {
  rooms: Room[]
  onClose: () => void
  onSubmit: (data: any) => void
}) {
  const [formData, setFormData] = useState({
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    roomId: '',
    checkIn: new Date().toISOString().split('T')[0],
    checkOut: '',
    adults: 1,
    children: 0,
    totalAmount: 0
  })

  const selectedRoom = rooms.find(r => r.id === formData.roomId)
  
  // Calculate total when dates or room changes
  useEffect(() => {
    if (formData.checkIn && formData.checkOut && selectedRoom) {
      const checkIn = new Date(formData.checkIn)
      const checkOut = new Date(formData.checkOut)
      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
      if (nights > 0) {
        setFormData(prev => ({ ...prev, totalAmount: selectedRoom.basePrice * nights }))
      }
    }
  }, [formData.checkIn, formData.checkOut, formData.roomId, selectedRoom])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">ახალი ჯავშანი</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">სტუმრის სახელი</label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2"
              value={formData.guestName}
              onChange={(e) => setFormData({...formData, guestName: e.target.value})}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">ელ-ფოსტა</label>
            <input
              type="email"
              className="w-full border rounded px-3 py-2"
              value={formData.guestEmail}
              onChange={(e) => setFormData({...formData, guestEmail: e.target.value})}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">ტელეფონი</label>
            <input
              type="tel"
              className="w-full border rounded px-3 py-2"
              value={formData.guestPhone}
              onChange={(e) => setFormData({...formData, guestPhone: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">ნომერი</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={formData.roomId}
              onChange={(e) => setFormData({...formData, roomId: e.target.value})}
              required
            >
              <option value="">აირჩიეთ ნომერი</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.roomNumber} - ₾{room.basePrice}
                </option>
              ))}
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Check In</label>
              <input
                type="date"
                className="w-full border rounded px-3 py-2"
                value={formData.checkIn}
                onChange={(e) => setFormData({...formData, checkIn: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Check Out</label>
              <input
                type="date"
                className="w-full border rounded px-3 py-2"
                value={formData.checkOut}
                onChange={(e) => setFormData({...formData, checkOut: e.target.value})}
                min={formData.checkIn}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">ზრდასრულები</label>
              <input
                type="number"
                min="1"
                className="w-full border rounded px-3 py-2"
                value={formData.adults}
                onChange={(e) => setFormData({...formData, adults: parseInt(e.target.value) || 1})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">ბავშვები</label>
              <input
                type="number"
                min="0"
                className="w-full border rounded px-3 py-2"
                value={formData.children}
                onChange={(e) => setFormData({...formData, children: parseInt(e.target.value) || 0})}
              />
            </div>
          </div>

          {formData.totalAmount > 0 && (
            <div className="bg-blue-50 p-3 rounded">
              <p className="text-sm text-gray-600">სულ თანხა:</p>
              <p className="text-xl font-bold text-blue-600">₾{formData.totalAmount}</p>
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-50 transition-colors"
          >
            გაუქმება
          </button>
          <button
            onClick={() => {
              if (formData.guestName && formData.guestEmail && formData.roomId && formData.checkIn && formData.checkOut) {
                onSubmit(formData)
              }
            }}
            disabled={!formData.guestName || !formData.guestEmail || !formData.roomId || !formData.checkIn || !formData.checkOut}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            დამატება
          </button>
        </div>
      </div>
    </div>
  )
}
