'use client'

import { useState, useEffect } from 'react'
import { ActivityLogger } from '../lib/activityLogger'

interface Room {
  id: string
  roomNumber: string
  floor: number
  status: string
  roomType?: string
  basePrice: number
  currentGuest?: string
  checkOutDate?: string
  housekeepingStatus?: string
}

interface RoomGridViewProps {
  rooms: Room[]
  onRoomClick?: (room: Room) => void
  onStatusChange?: (roomId: string, status: string) => void
  loadRooms?: () => Promise<void>
}

export default function RoomGridView({ rooms, onRoomClick, onStatusChange, loadRooms }: RoomGridViewProps) {
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [showRoomDetails, setShowRoomDetails] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterFloor, setFilterFloor] = useState<number | 'all'>('all')
  const [maintenanceRooms, setMaintenanceRooms] = useState<string[]>([])

  // Load maintenance rooms from localStorage on mount
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

  // Group rooms by floor
  const roomsByFloor = rooms.reduce((acc, room) => {
    if (!acc[room.floor]) acc[room.floor] = []
    acc[room.floor].push(room)
    return acc
  }, {} as Record<number, Room[]>)

  // Filter rooms
  const filteredRoomsByFloor = Object.entries(roomsByFloor).reduce((acc, [floor, floorRooms]) => {
    if (filterFloor !== 'all' && parseInt(floor) !== filterFloor) return acc
    
    const filtered = floorRooms.filter(room => 
      filterStatus === 'all' || room.status === filterStatus
    )
    
    if (filtered.length > 0) {
      acc[parseInt(floor)] = filtered
    }
    
    return acc
  }, {} as Record<number, Room[]>)

  // Statistics
  const stats = {
    total: rooms.length,
    vacant: rooms.filter(r => r.status === 'VACANT').length,
    occupied: rooms.filter(r => r.status === 'OCCUPIED').length,
    cleaning: rooms.filter(r => r.status === 'CLEANING').length,
    maintenance: rooms.filter(r => r.status === 'MAINTENANCE').length,
    reserved: rooms.filter(r => r.status === 'RESERVED').length
  }

  const handleRoomClick = (room: Room) => {
    setSelectedRoom(room)
    setShowRoomDetails(true)
    if (onRoomClick) onRoomClick(room)
  }

  const handleQuickAction = (roomId: string, action: string) => {
    let newStatus = ''
    
    switch(action) {
      case 'clean':
        newStatus = 'CLEANING'
        break
      case 'ready':
        newStatus = 'VACANT'
        break
      case 'maintenance':
        newStatus = 'MAINTENANCE'
        break
      case 'checkout':
        newStatus = 'VACANT'
        break
      default:
        return
    }
    
    if (onStatusChange) {
      onStatusChange(roomId, newStatus)
    }
  }

  return (
    <div className="space-y-6">
      {/* Filters and Stats Bar */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="flex gap-4">
            {/* Floor Filter */}
            <select
              value={filterFloor}
              onChange={(e) => setFilterFloor(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">ყველა სართული</option>
              <option value="1">სართული 1</option>
              <option value="2">სართული 2</option>
              <option value="3">სართული 3</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">ყველა სტატუსი</option>
              <option value="VACANT">თავისუფალი</option>
              <option value="OCCUPIED">დაკავებული</option>
              <option value="CLEANING">დასუფთავება</option>
              <option value="RESERVED">დაჯავშნული</option>
              <option value="MAINTENANCE">რემონტი</option>
            </select>
          </div>

          {/* Quick Stats */}
          <div className="flex gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-green-500 rounded-full"></span>
              <span className="text-sm">თავისუფალი: {stats.vacant}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-red-500 rounded-full"></span>
              <span className="text-sm">დაკავებული: {stats.occupied}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
              <span className="text-sm">დასუფთავება: {stats.cleaning}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
              <span className="text-sm">დაჯავშნული: {stats.reserved}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Room Grid */}
      <div className="space-y-6">
        {Object.entries(filteredRoomsByFloor)
          .sort(([a], [b]) => parseInt(b) - parseInt(a))
          .map(([floor, floorRooms]) => (
            <div key={floor} className="bg-white rounded-lg shadow">
              {/* Floor Header */}
              <div className="bg-gradient-to-r from-gray-700 to-gray-800 text-white p-4 rounded-t-lg">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">
                    🏢 სართული {floor}
                  </h3>
                  <span className="text-sm opacity-90">
                    {floorRooms.length} ნომერი
                  </span>
                </div>
              </div>

              {/* Rooms Grid */}
              <div className="p-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {floorRooms
                  .sort((a, b) => parseInt(a.roomNumber) - parseInt(b.roomNumber))
                  .map((room) => (
                    <RoomCard
                      key={room.id}
                      room={room}
                      onClick={() => handleRoomClick(room)}
                      onQuickAction={handleQuickAction}
                    />
                  ))}
              </div>
            </div>
          ))}
      </div>

      {/* Room Details Modal */}
      {showRoomDetails && selectedRoom && (
        <RoomDetailsModal
          room={selectedRoom}
          onClose={() => setShowRoomDetails(false)}
          onStatusChange={onStatusChange}
          onRoomUpdate={setSelectedRoom}
          loadRooms={loadRooms}
          maintenanceRooms={maintenanceRooms}
          setMaintenanceRooms={setMaintenanceRooms}
        />
      )}
    </div>
  )
}

// Room Card Component
function RoomCard({ room, onClick, onQuickAction }: any) {
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'VACANT': return 'border-green-500 bg-green-50'
      case 'OCCUPIED': return 'border-red-500 bg-red-50'
      case 'CLEANING': return 'border-yellow-500 bg-yellow-50'
      case 'RESERVED': return 'border-blue-500 bg-blue-50'
      case 'MAINTENANCE': return 'border-gray-500 bg-gray-50'
      default: return 'border-gray-300 bg-gray-50'
    }
  }

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'VACANT': return '✅'
      case 'OCCUPIED': return '🔴'
      case 'CLEANING': return '🧹'
      case 'RESERVED': return '📅'
      case 'MAINTENANCE': return '🔧'
      default: return '❓'
    }
  }

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'VACANT': return 'თავისუფალი'
      case 'OCCUPIED': return 'დაკავებული'
      case 'CLEANING': return 'დასუფთავება'
      case 'RESERVED': return 'დაჯავშნული'
      case 'MAINTENANCE': return 'რემონტი'
      default: return status
    }
  }

  return (
    <div 
      className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${getStatusColor(room.status)} room-card-hover`}
      onClick={onClick}
    >
      {/* Room Number & Type */}
      <div className="flex justify-between items-start mb-2">
        <div>
          <span className="text-xl font-bold text-gray-800">{room.roomNumber}</span>
          <div className="text-xs text-gray-600 mt-1">
            {room.roomType || 'Standard'}
          </div>
        </div>
        <span className="text-2xl">{getStatusIcon(room.status)}</span>
      </div>

      {/* Status Badge */}
      <div className="mb-3">
        <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
          room.status === 'VACANT' ? 'bg-green-500 text-white' :
          room.status === 'OCCUPIED' ? 'bg-red-500 text-white' :
          room.status === 'CLEANING' ? 'bg-yellow-500 text-white' :
          room.status === 'RESERVED' ? 'bg-blue-500 text-white' :
          'bg-gray-500 text-white'
        }`}>
          {getStatusLabel(room.status)}
        </span>
      </div>

      {/* Guest Info (if occupied) */}
      {room.status === 'OCCUPIED' && room.currentGuest && (
        <div className="text-xs text-gray-700 mb-2">
          <div className="font-medium">👤 {room.currentGuest}</div>
          {room.checkOutDate && (
            <div className="text-gray-500">Check-out: {room.checkOutDate}</div>
          )}
        </div>
      )}

      {/* Price */}
      <div className="text-sm font-medium text-gray-700">
        ₾{room.basePrice}/ღამე
      </div>

      {/* Quick Actions */}
      <div className="absolute bottom-2 right-2 flex gap-1">
        {room.status === 'VACANT' && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onQuickAction(room.id, 'clean')
            }}
            className="p-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-xs"
            title="დასუფთავება"
          >
            🧹
          </button>
        )}
        
        {room.status === 'CLEANING' && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onQuickAction(room.id, 'ready')
            }}
            className="p-1 bg-green-500 text-white rounded hover:bg-green-600 text-xs"
            title="მზადაა"
          >
            ✅
          </button>
        )}
        
        {room.status === 'OCCUPIED' && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onQuickAction(room.id, 'checkout')
            }}
            className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs"
            title="Check Out"
          >
            🚪
          </button>
        )}
      </div>
    </div>
  )
}

// Room Details Modal Component
function RoomDetailsModal({ room, onClose, onStatusChange, onRoomUpdate, loadRooms, maintenanceRooms, setMaintenanceRooms }: any) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-bold">ნომერი {room.roomNumber}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">✕</button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">ტიპი</p>
              <p className="font-medium">{room.roomType || 'Standard'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">სართული</p>
              <p className="font-medium">სართული {room.floor}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">სტატუსი</p>
              <p className="font-medium">{room.status}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">ფასი</p>
              <p className="font-medium">₾{room.basePrice}/ღამე</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t">
            <button 
              onClick={() => {
                onStatusChange && onStatusChange(room.id, 'CLEANING')
                onClose()
              }}
              className="flex-1 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
            >
              🧹 დასუფთავება
            </button>
            <button 
              onClick={() => {
                const roomId = room.id
                let updatedMaintenance = [...maintenanceRooms]
                
                if (maintenanceRooms.includes(roomId)) {
                  // Remove from maintenance
                  updatedMaintenance = updatedMaintenance.filter(id => id !== roomId)
                  ActivityLogger.log('ROOM_UNBLOCK', {
                    room: room.roomNumber
                  })
                  alert('✅ ოთახი განბლოკილია')
                } else {
                  // Add to maintenance
                  updatedMaintenance.push(roomId)
                  ActivityLogger.log('ROOM_MAINTENANCE', {
                    room: room.roomNumber
                  })
                  alert('⚠️ ოთახი გადავიდა რემონტში')
                }
                
                // Save to localStorage
                localStorage.setItem('maintenanceRooms', JSON.stringify(updatedMaintenance))
                setMaintenanceRooms(updatedMaintenance)
                
                // Update selected room
                if (onRoomUpdate) {
                  onRoomUpdate({
                    ...room,
                    status: maintenanceRooms.includes(roomId) ? 'VACANT' : 'MAINTENANCE'
                  })
                }
                
                // Also call onStatusChange if available
                if (onStatusChange) {
                  onStatusChange(room.id, maintenanceRooms.includes(roomId) ? 'VACANT' : 'MAINTENANCE')
                }
              }}
              className={`flex-1 py-2 rounded ${
                maintenanceRooms.includes(room.id) 
                  ? 'bg-green-600 text-white hover:bg-green-700' 
                  : 'bg-orange-500 text-white hover:bg-orange-600'
              }`}
            >
              {maintenanceRooms.includes(room.id) ? '✅ განბლოკვა' : '🔧 რემონტი'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


