'use client'

import React, { useState, useEffect } from 'react'
import moment from 'moment'
import { ActivityLogger } from '../lib/activityLogger'

export default function HotelSettings() {
  const [activeTab, setActiveTab] = useState('info')
  const [hotelInfo, setHotelInfo] = useState<any>({})
  const [rooms, setRooms] = useState<any[]>([])
  const [roomTypes, setRoomTypes] = useState<any[]>([])
  const [floors, setFloors] = useState<number[]>([])
  const [staff, setStaff] = useState<any[]>([])
  const [checklist, setChecklist] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  
  useEffect(() => {
    loadAllSettings()
  }, [])
  
  const loadAllSettings = async () => {
    if (typeof window === 'undefined') return
    
    // Load Hotel Info
    const savedInfo = localStorage.getItem('hotelInfo')
    if (savedInfo) {
      try {
        setHotelInfo(JSON.parse(savedInfo))
      } catch (e) {
        console.error('Error loading hotel info:', e)
      }
    } else {
      setHotelInfo({
        name: 'Hotel Name',
        company: 'Company Name',
        taxId: '123456789',
        bank: 'Bank Name',
        account: 'GE00XX000000000000',
        address: 'Address',
        phone: '+995 555 123456',
        email: 'info@hotel.com',
        logo: ''
      })
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
    const savedTypes = localStorage.getItem('roomTypes')
    if (savedTypes) {
      try {
        setRoomTypes(JSON.parse(savedTypes))
      } catch (e) {
        console.error('Error loading room types:', e)
      }
    } else {
      setRoomTypes([
        { id: 'standard', name: 'Standard', basePrice: 150, icon: '🛏️' },
        { id: 'deluxe', name: 'Deluxe', basePrice: 200, icon: '🌟' },
        { id: 'suite', name: 'Suite', basePrice: 350, icon: '👑' }
      ])
    }
    
    // Load Floors
    const savedFloors = localStorage.getItem('hotelFloors')
    if (savedFloors) {
      try {
        setFloors(JSON.parse(savedFloors))
      } catch (e) {
        console.error('Error loading floors:', e)
      }
    } else {
      setFloors([1, 2, 3, 4, 5])
    }
    
    // Load Staff
    const savedStaff = localStorage.getItem('hotelStaff')
    if (savedStaff) {
      try {
        setStaff(JSON.parse(savedStaff))
      } catch (e) {
        console.error('Error loading staff:', e)
      }
    } else {
      setStaff([
        { id: 1, name: 'Admin', role: 'Manager', department: 'Management' },
        { id: 2, name: 'Receptionist', role: 'Receptionist', department: 'Front Desk' }
      ])
    }
    
    // Load Checklist
    const savedChecklist = localStorage.getItem('housekeepingChecklist')
    if (savedChecklist) {
      try {
        setChecklist(JSON.parse(savedChecklist))
      } catch (e) {
        console.error('Error loading checklist:', e)
      }
    } else {
      setChecklist([
        { id: 1, task: 'Change Bed Sheets', category: 'Bedroom' },
        { id: 2, task: 'Clean Bathroom', category: 'Bathroom' },
        { id: 3, task: 'Vacuum Floor', category: 'General' }
      ])
    }
  }
  
  const saveHotelInfo = () => {
    if (typeof window === 'undefined') return
    localStorage.setItem('hotelInfo', JSON.stringify(hotelInfo))
    ActivityLogger.log('SETTINGS_CHANGED', {
      section: 'hotel-info',
      changes: 'Hotel information updated'
    })
    alert('✅ Hotel information saved successfully!')
  }
  
  const handleSave = async (item: any, type: string) => {
    if (typeof window === 'undefined') return
    
    try {
      if (type === 'rooms') {
        const updatedRooms = editingItem 
          ? rooms.map(r => r.id === item.id ? item : r)
          : [...rooms, { ...item, id: `room-${Date.now()}` }]
        setRooms(updatedRooms)
        
        // Save via API
        if (editingItem) {
          await fetch(`/api/hotel/rooms/${item.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
          })
        } else {
          await fetch('/api/hotel/rooms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
          })
        }
      } else if (type === 'staff') {
        const updatedStaff = editingItem
          ? staff.map(s => s.id === item.id ? item : s)
          : [...staff, { ...item, id: Date.now() }]
        setStaff(updatedStaff)
        localStorage.setItem('hotelStaff', JSON.stringify(updatedStaff))
      } else if (type === 'checklist') {
        const updatedChecklist = editingItem
          ? checklist.map(c => c.id === item.id ? item : c)
          : [...checklist, { ...item, id: Date.now() }]
        setChecklist(updatedChecklist)
        localStorage.setItem('housekeepingChecklist', JSON.stringify(updatedChecklist))
      }
      
      setShowAddModal(false)
      setEditingItem(null)
      alert('✅ Saved successfully!')
      
      // Reload data
      loadAllSettings()
    } catch (error) {
      console.error('Error saving:', error)
      alert('❌ Error saving item')
    }
  }
  
  return (
    <div className="p-6 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold">⚙️ Hotel Settings</h1>
            <p className="text-gray-600 mt-1">Manage your hotel configuration and parameters</p>
          </div>
          {activeTab !== 'info' && activeTab !== 'logs' && (
            <button
              onClick={() => {
                setEditingItem(null)
                setShowAddModal(true)
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              + Add New {activeTab === 'rooms' ? 'Room' : activeTab === 'staff' ? 'Staff' : 'Item'}
            </button>
          )}
        </div>
      </div>
      
      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-lg">
        <div className="border-b">
          <div className="flex overflow-x-auto">
            {[
              { id: 'info', label: 'Hotel Info', icon: '🏨' },
              { id: 'rooms', label: 'Rooms', icon: '🛏️' },
              { id: 'types', label: 'Room Types', icon: '🏷️' },
              { id: 'floors', label: 'Floors', icon: '🏢' },
              { id: 'staff', label: 'Staff', icon: '👥' },
              { id: 'checklist', label: 'Housekeeping', icon: '🧹' },
              { id: 'pricing', label: 'Pricing', icon: '💰' },
              { id: 'logs', label: 'Activity Logs', icon: '📋' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 font-medium whitespace-nowrap transition ${
                  activeTab === tab.id
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6">
          {/* Hotel Info Tab */}
          {activeTab === 'info' && (
            <HotelInfoTab 
              hotelInfo={hotelInfo} 
              setHotelInfo={setHotelInfo}
              onSave={saveHotelInfo}
            />
          )}
          
          {/* Rooms Tab */}
          {activeTab === 'rooms' && (
            <RoomsTab 
              rooms={rooms}
              roomTypes={roomTypes}
              floors={floors}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              onEdit={setEditingItem}
              onAdd={() => {
                setEditingItem(null)
                setShowAddModal(true)
              }}
              onDelete={async (roomId: string) => {
                if (confirm('Are you sure you want to delete this room?')) {
                  try {
                    await fetch(`/api/hotel/rooms/${roomId}`, { method: 'DELETE' })
                    loadAllSettings()
                    alert('✅ Room deleted successfully!')
                  } catch (error) {
                    alert('❌ Error deleting room')
                  }
                }
              }}
            />
          )}
          
          {/* Room Types Tab */}
          {activeTab === 'types' && (
            <RoomTypesTab
              roomTypes={roomTypes}
              setRoomTypes={setRoomTypes}
              onEdit={setEditingItem}
            />
          )}
          
          {/* Floors Tab */}
          {activeTab === 'floors' && (
            <FloorsTab
              floors={floors}
              setFloors={setFloors}
            />
          )}
          
          {/* Staff Tab */}
          {activeTab === 'staff' && (
            <StaffTab
              staff={staff}
              setStaff={setStaff}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              onEdit={setEditingItem}
            />
          )}
          
          {/* Checklist Tab */}
          {activeTab === 'checklist' && (
            <ChecklistTab
              checklist={checklist}
              setChecklist={setChecklist}
              onEdit={setEditingItem}
            />
          )}
          
          {/* Pricing Tab */}
          {activeTab === 'pricing' && (
            <PricingTab
              roomTypes={roomTypes}
              setRoomTypes={setRoomTypes}
            />
          )}
          
          {/* Logs Tab */}
          {activeTab === 'logs' && (
            <LogsTab />
          )}
        </div>
      </div>
      
      {/* Add/Edit Modal */}
      {(showAddModal || editingItem) && (
        <AddEditModal
          type={activeTab}
          item={editingItem}
          roomTypes={roomTypes}
          floors={floors}
          onSave={(item) => handleSave(item, activeTab)}
          onClose={() => {
            setShowAddModal(false)
            setEditingItem(null)
          }}
        />
      )}
    </div>
  )
}

// Hotel Info Tab Component
const HotelInfoTab = ({ hotelInfo, setHotelInfo, onSave }: {
  hotelInfo: any
  setHotelInfo: (info: any) => void
  onSave: () => void
}) => {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Hotel Name</label>
          <input
            type="text"
            value={hotelInfo.name || ''}
            onChange={(e) => setHotelInfo({...hotelInfo, name: e.target.value})}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Company Name</label>
          <input
            type="text"
            value={hotelInfo.company || ''}
            onChange={(e) => setHotelInfo({...hotelInfo, company: e.target.value})}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Tax ID</label>
          <input
            type="text"
            value={hotelInfo.taxId || ''}
            onChange={(e) => setHotelInfo({...hotelInfo, taxId: e.target.value})}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Phone</label>
          <input
            type="text"
            value={hotelInfo.phone || ''}
            onChange={(e) => setHotelInfo({...hotelInfo, phone: e.target.value})}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">🏦 ბანკი</label>
          <input
            type="text"
            value={hotelInfo.bank || ''}
            onChange={(e) => setHotelInfo({...hotelInfo, bank: e.target.value})}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="საქართველოს ბანკი"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">💳 ანგარიშის ნომერი</label>
          <input
            type="text"
            value={hotelInfo.account || ''}
            onChange={(e) => setHotelInfo({...hotelInfo, account: e.target.value})}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="GE00TB0000000000000000"
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">Address</label>
        <input
          type="text"
          value={hotelInfo.address || ''}
          onChange={(e) => setHotelInfo({...hotelInfo, address: e.target.value})}
          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Email</label>
          <input
            type="email"
            value={hotelInfo.email || ''}
            onChange={(e) => setHotelInfo({...hotelInfo, email: e.target.value})}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Logo URL</label>
          <input
            type="text"
            value={hotelInfo.logo || ''}
            onChange={(e) => setHotelInfo({...hotelInfo, logo: e.target.value})}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="https://example.com/logo.png"
          />
        </div>
      </div>
      
      <button
        onClick={onSave}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
      >
        💾 Save Hotel Information
      </button>
    </div>
  )
}

// Rooms Tab Component
const RoomsTab = ({ rooms, roomTypes, floors, searchTerm, setSearchTerm, onEdit, onAdd, onDelete }: {
  rooms: any[]
  roomTypes: any[]
  floors: number[]
  searchTerm: string
  setSearchTerm: (term: string) => void
  onEdit: (room: any) => void
  onAdd: () => void
  onDelete: (roomId: string) => void
}) => {
  const [typeFilter, setTypeFilter] = useState('')
  const [floorFilter, setFloorFilter] = useState('')
  
  const filteredRooms = rooms.filter((room: any) => {
    const matchesSearch = room.roomNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         room.roomType?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = !typeFilter || room.roomType === typeFilter || room.type === typeFilter
    const matchesFloor = !floorFilter || room.floor?.toString() === floorFilter
    return matchesSearch && matchesType && matchesFloor
  })
  
  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="🔍 Search rooms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <select 
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Types</option>
          {roomTypes.map((type: any) => (
            <option key={type.id} value={type.id}>{type.name}</option>
          ))}
        </select>
        <select 
          value={floorFilter}
          onChange={(e) => setFloorFilter(e.target.value)}
          className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Floors</option>
          {floors.map((floor: number) => (
            <option key={floor} value={floor.toString()}>Floor {floor}</option>
          ))}
        </select>
      </div>
      
      {/* Rooms Grid */}
      {filteredRooms.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">No rooms found</p>
          <p className="text-sm mt-2">Try adjusting your filters or add a new room</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredRooms.map((room: any) => (
            <RoomCard
              key={room.id}
              room={room}
              roomType={roomTypes.find((t: any) => t.id === room.roomType || t.id === room.type)}
              onEdit={() => onEdit(room)}
              onDelete={() => onDelete(room.id)}
            />
          ))}
          
          {/* Add New Room Card */}
          <button
            onClick={onAdd}
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:bg-gray-50 flex flex-col items-center justify-center transition min-h-[150px]"
          >
            <span className="text-3xl mb-2">➕</span>
            <span className="text-gray-600">Add Room</span>
          </button>
        </div>
      )}
    </div>
  )
}

// Room Card Component
const RoomCard = ({ room, roomType, onEdit, onDelete }: {
  room: any
  roomType: any
  onEdit: () => void
  onDelete: () => void
}) => {
  return (
    <div className="border rounded-lg p-4 hover:shadow-lg transition-shadow bg-white">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-bold text-lg">Room {room.roomNumber || room.id}</h3>
          <span className="text-sm text-gray-600">{roomType?.name || room.roomType || 'Standard'}</span>
        </div>
        <div className="flex gap-1">
          <button onClick={onEdit} className="text-gray-400 hover:text-gray-600 transition" title="Edit">✏️</button>
          <button onClick={onDelete} className="text-gray-400 hover:text-red-600 transition" title="Delete">🗑️</button>
        </div>
      </div>
      
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Floor:</span>
          <span>{room.floor || 'N/A'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Status:</span>
          <span className={`px-2 py-0.5 rounded text-xs ${
            room.status === 'VACANT' 
              ? 'bg-green-100 text-green-700' 
              : 'bg-gray-100 text-gray-700'
          }`}>
            {room.status || 'VACANT'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Max Guests:</span>
          <span>{room.maxOccupancy || room.maxGuests || 2}</span>
        </div>
        {room.basePrice && (
          <div className="flex justify-between">
            <span className="text-gray-600">Price:</span>
            <span className="font-medium">₾{room.basePrice}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// Room Types Tab Component
const RoomTypesTab = ({ roomTypes, setRoomTypes, onEdit }: {
  roomTypes: any[]
  setRoomTypes: (types: any[]) => void
  onEdit: (type: any) => void
}) => {
  const updatePrice = (typeId: string, value: number) => {
    const updated = roomTypes.map((t: any) => 
      t.id === typeId ? {...t, basePrice: value} : t
    )
    setRoomTypes(updated)
    if (typeof window !== 'undefined') {
      localStorage.setItem('roomTypes', JSON.stringify(updated))
    }
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {roomTypes.map((type: any) => (
        <div key={type.id} className="border rounded-lg p-6 hover:shadow-lg transition bg-white">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{type.icon || '🛏️'}</span>
              <div>
                <h3 className="font-bold text-lg">{type.name}</h3>
                <p className="text-sm text-gray-600">ID: {type.id}</p>
              </div>
            </div>
            <button 
              onClick={() => onEdit(type)}
              className="text-gray-400 hover:text-gray-600 transition"
              title="Edit"
            >
              ✏️
            </button>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Base Price:</span>
              <span className="font-bold">₾{type.basePrice || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Weekend Rate:</span>
              <span>₾{((type.basePrice || 0) * 1.2).toFixed(0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Holiday Rate:</span>
              <span>₾{((type.basePrice || 0) * 1.5).toFixed(0)}</span>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t">
            <label className="block text-sm font-medium mb-2">Update Base Price</label>
            <div className="flex items-center gap-2">
              <span>₾</span>
              <input
                type="number"
                value={type.basePrice || 0}
                onChange={(e) => updatePrice(type.id, parseFloat(e.target.value) || 0)}
                className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                min="0"
                step="1"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Floors Tab Component
const FloorsTab = ({ floors, setFloors }: {
  floors: number[]
  setFloors: (floors: number[]) => void
}) => {
  const addFloor = () => {
    const newFloor = floors.length > 0 ? Math.max(...floors) + 1 : 1
    const updated = [...floors, newFloor].sort((a, b) => a - b)
    setFloors(updated)
    if (typeof window !== 'undefined') {
      localStorage.setItem('hotelFloors', JSON.stringify(updated))
    }
  }
  
  const removeFloor = (floor: number) => {
    if (!confirm(`Remove Floor ${floor}?`)) return
    const updated = floors.filter((f: number) => f !== floor)
    setFloors(updated)
    if (typeof window !== 'undefined') {
      localStorage.setItem('hotelFloors', JSON.stringify(updated))
    }
  }
  
  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {floors.map((floor: number) => (
          <div key={floor} className="border rounded-lg p-6 text-center relative bg-white hover:shadow-lg transition">
            <div className="text-4xl mb-2">🏢</div>
            <div className="font-bold">Floor {floor}</div>
            {floors.length > 1 && (
              <button
                onClick={() => removeFloor(floor)}
                className="absolute top-2 right-2 text-gray-400 hover:text-red-600 transition"
                title="Remove Floor"
              >
                ×
              </button>
            )}
          </div>
        ))}
        
        <button
          onClick={addFloor}
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition"
        >
          <div className="text-3xl mb-2">➕</div>
          <div>Add Floor</div>
        </button>
      </div>
    </div>
  )
}

// Staff Tab Component
const StaffTab = ({ staff, setStaff, searchTerm, setSearchTerm, onEdit }: {
  staff: any[]
  setStaff: (staff: any[]) => void
  searchTerm: string
  setSearchTerm: (term: string) => void
  onEdit: (member: any) => void
}) => {
  const [deptFilter, setDeptFilter] = useState('')
  
  const filteredStaff = staff.filter((s: any) => {
    const matchesSearch = s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         s.role?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDept = !deptFilter || s.department === deptFilter
    return matchesSearch && matchesDept
  })
  
  return (
    <div className="space-y-6">
      <div className="flex gap-4 flex-wrap">
        <input
          type="text"
          placeholder="🔍 Search staff..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 min-w-[200px] border rounded-lg px-4 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <select 
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Departments</option>
          <option value="Management">Management</option>
          <option value="Front Desk">Front Desk</option>
          <option value="Housekeeping">Housekeeping</option>
          <option value="Maintenance">Maintenance</option>
        </select>
      </div>
      
      {filteredStaff.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No staff members found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStaff.map((member: any) => (
            <div key={member.id} className="border rounded-lg p-4 bg-white hover:shadow-lg transition">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    👤
                  </div>
                  <div>
                    <h4 className="font-bold">{member.name}</h4>
                    <p className="text-sm text-gray-600">{member.role}</p>
                  </div>
                </div>
                <button onClick={() => onEdit(member)} className="text-gray-400 hover:text-gray-600 transition" title="Edit">
                  ✏️
                </button>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Department:</span>
                  <span>{member.department}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="text-green-600">Active</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Checklist Tab Component
const ChecklistTab = ({ checklist, setChecklist, onEdit }: {
  checklist: any[]
  setChecklist: (checklist: any[]) => void
  onEdit: (item: any) => void
}) => {
  const categories = [...new Set(checklist.map((item: any) => item.category))]
  
  return (
    <div className="space-y-6">
      {categories.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No checklist items</p>
        </div>
      ) : (
        categories.map((category: any) => (
          <div key={category} className="border rounded-lg p-4 bg-white">
            <h3 className="font-bold mb-3">{category}</h3>
            <div className="space-y-2">
              {checklist
                .filter((item: any) => item.category === category)
                .map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded transition">
                    <div className="flex items-center gap-3">
                      <input type="checkbox" className="w-4 h-4" />
                      <span>{item.task}</span>
                    </div>
                    <button onClick={() => onEdit(item)} className="text-gray-400 hover:text-gray-600 transition" title="Edit">
                      ✏️
                    </button>
                  </div>
                ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

// Pricing Tab Component
const PricingTab = ({ roomTypes, setRoomTypes }: {
  roomTypes: any[]
  setRoomTypes: (types: any[]) => void
}) => {
  const updatePrice = (typeId: string, field: string, value: number) => {
    const updated = roomTypes.map((t: any) => 
      t.id === typeId ? {...t, [field]: value} : t
    )
    setRoomTypes(updated)
    if (typeof window !== 'undefined') {
      localStorage.setItem('roomTypes', JSON.stringify(updated))
    }
  }
  
  const bulkAction = (action: string, percentage?: number) => {
    let updated = [...roomTypes]
    
    if (action === 'increase' && percentage) {
      updated = updated.map(t => ({
        ...t,
        basePrice: Math.round(t.basePrice * (1 + percentage / 100))
      }))
    } else if (action === 'decrease' && percentage) {
      updated = updated.map(t => ({
        ...t,
        basePrice: Math.round(t.basePrice * (1 - percentage / 100))
      }))
    } else if (action === 'reset') {
      updated = [
        { id: 'standard', name: 'Standard', basePrice: 150, icon: '🛏️' },
        { id: 'deluxe', name: 'Deluxe', basePrice: 200, icon: '🌟' },
        { id: 'suite', name: 'Suite', basePrice: 350, icon: '👑' }
      ]
    }
    
    setRoomTypes(updated)
    if (typeof window !== 'undefined') {
      localStorage.setItem('roomTypes', JSON.stringify(updated))
    }
  }
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {roomTypes.map((type: any) => (
          <div key={type.id} className="border rounded-lg p-6 bg-white hover:shadow-lg transition">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <span>{type.icon || '🛏️'}</span>
              {type.name}
            </h3>
            
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600">Base Price</label>
                <div className="flex items-center gap-2">
                  <span>₾</span>
                  <input
                    type="number"
                    value={type.basePrice || 0}
                    onChange={(e) => updatePrice(type.id, 'basePrice', parseFloat(e.target.value) || 0)}
                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    min="0"
                    step="1"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm text-gray-600">Weekend (+20%)</label>
                <div className="text-lg font-bold text-gray-700">
                  ₾{((type.basePrice || 0) * 1.2).toFixed(2)}
                </div>
              </div>
              
              <div>
                <label className="text-sm text-gray-600">Holiday (+50%)</label>
                <div className="text-lg font-bold text-gray-700">
                  ₾{((type.basePrice || 0) * 1.5).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-semibold mb-3">Quick Actions</h4>
        <div className="flex gap-2 flex-wrap">
          <button 
            onClick={() => {
              const percent = prompt('Enter percentage to increase:')
              if (percent) bulkAction('increase', parseFloat(percent))
            }}
            className="px-4 py-2 bg-white border rounded hover:bg-gray-50 transition"
          >
            📈 Increase All by %
          </button>
          <button 
            onClick={() => {
              const percent = prompt('Enter percentage to decrease:')
              if (percent) bulkAction('decrease', parseFloat(percent))
            }}
            className="px-4 py-2 bg-white border rounded hover:bg-gray-50 transition"
          >
            📉 Decrease All by %
          </button>
          <button 
            onClick={() => {
              if (confirm('Reset all prices to default?')) {
                bulkAction('reset')
              }
            }}
            className="px-4 py-2 bg-white border rounded hover:bg-gray-50 transition"
          >
            🔄 Reset to Default
          </button>
        </div>
      </div>
    </div>
  )
}

// Logs Tab Component
const LogsTab = () => {
  const [logs, setLogs] = useState<any[]>([])
  const [dateFilter, setDateFilter] = useState(moment().format('YYYY-MM-DD'))
  
  useEffect(() => {
    if (typeof window === 'undefined') return
    const allLogs = ActivityLogger.getLogs()
    const filtered = allLogs.filter((log: any) => 
      moment(log.timestamp).format('YYYY-MM-DD') === dateFilter
    )
    setLogs(filtered)
  }, [dateFilter])
  
  const clearLogs = () => {
    if (confirm('Clear all logs?')) {
      ActivityLogger.clearLogs()
      setLogs([])
      alert('✅ Logs cleared')
    }
  }
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          onClick={clearLogs}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
        >
          🗑️ Clear Logs
        </button>
      </div>
      
      {logs.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No logs found for this date</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-white">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-semibold">Time</th>
                <th className="px-4 py-2 text-left text-sm font-semibold">User</th>
                <th className="px-4 py-2 text-left text-sm font-semibold">Action</th>
                <th className="px-4 py-2 text-left text-sm font-semibold">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log: any, i: number) => (
                <tr key={i} className="border-t hover:bg-gray-50 transition">
                  <td className="px-4 py-2 text-sm">
                    {moment(log.timestamp).format('HH:mm:ss')}
                  </td>
                  <td className="px-4 py-2">{log.user || 'System'}</td>
                  <td className="px-4 py-2">{ActivityLogger.getActionLabel(log.action)}</td>
                  <td className="px-4 py-2 text-sm text-gray-600 max-w-md truncate">
                    {log.details ? JSON.stringify(log.details) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// Add/Edit Modal Component
const AddEditModal = ({ type, item, roomTypes, floors, onSave, onClose }: {
  type: string
  item: any
  roomTypes: any[]
  floors: number[]
  onSave: (item: any) => void
  onClose: () => void
}) => {
  const [formData, setFormData] = useState(item || {})
  
  const getModalTitle = () => {
    const titles: Record<string, string> = {
      rooms: 'Room',
      staff: 'Staff Member',
      checklist: 'Checklist Item'
    }
    return `${item ? 'Edit' : 'Add'} ${titles[type] || 'Item'}`
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">{getModalTitle()}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
        </div>
        
        <div className="space-y-4">
          {type === 'rooms' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Room Number *</label>
                  <input
                    type="text"
                    value={formData.roomNumber || ''}
                    onChange={(e) => setFormData({...formData, roomNumber: e.target.value})}
                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Room Type *</label>
                  <select
                    value={formData.roomType || formData.type || ''}
                    onChange={(e) => setFormData({...formData, roomType: e.target.value, type: e.target.value})}
                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Type</option>
                    {roomTypes.map((type: any) => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Floor *</label>
                  <select
                    value={formData.floor || ''}
                    onChange={(e) => setFormData({...formData, floor: parseInt(e.target.value)})}
                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Floor</option>
                    {floors.map((floor: number) => (
                      <option key={floor} value={floor}>Floor {floor}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Max Guests</label>
                  <input
                    type="number"
                    value={formData.maxOccupancy || formData.maxGuests || 2}
                    onChange={(e) => setFormData({...formData, maxOccupancy: parseInt(e.target.value), maxGuests: parseInt(e.target.value)})}
                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    min="1"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={formData.status || 'VACANT'}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="VACANT">Available</option>
                  <option value="OCCUPIED">Occupied</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="BLOCKED">Blocked</option>
                </select>
              </div>
              
              {roomTypes.find((t: any) => t.id === (formData.roomType || formData.type)) && (
                <div>
                  <label className="block text-sm font-medium mb-1">Base Price</label>
                  <div className="flex items-center gap-2">
                    <span>₾</span>
                    <input
                      type="number"
                      value={formData.basePrice || roomTypes.find((t: any) => t.id === (formData.roomType || formData.type))?.basePrice || 0}
                      onChange={(e) => setFormData({...formData, basePrice: parseFloat(e.target.value)})}
                      className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              )}
            </>
          )}
          
          {type === 'staff' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Role *</label>
                  <select
                    value={formData.role || ''}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Role</option>
                    <option value="Manager">Manager</option>
                    <option value="Receptionist">Receptionist</option>
                    <option value="Housekeeping">Housekeeping</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Department *</label>
                  <select
                    value={formData.department || ''}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Department</option>
                    <option value="Management">Management</option>
                    <option value="Front Desk">Front Desk</option>
                    <option value="Housekeeping">Housekeeping</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>
              </div>
            </>
          )}
          
          {type === 'checklist' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Task *</label>
                <input
                  type="text"
                  value={formData.task || ''}
                  onChange={(e) => setFormData({...formData, task: e.target.value})}
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Category *</label>
                <select
                  value={formData.category || ''}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Category</option>
                  <option value="Bedroom">Bedroom</option>
                  <option value="Bathroom">Bathroom</option>
                  <option value="General">General</option>
                  <option value="Kitchen">Kitchen</option>
                </select>
              </div>
            </>
          )}
        </div>
        
        <div className="flex gap-2 mt-6">
          <button
            onClick={() => onSave(formData)}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            💾 Save
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}


