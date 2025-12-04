'use client'

import { useState, useEffect } from 'react'
import moment from 'moment'
import FloorManager from './FloorManager'
import RoomTypeManager from './RoomTypeManager'
import StaffManager from './StaffManager'
import ChecklistManager from './ChecklistManager'
import { ActivityLogger } from '../lib/activityLogger'

export default function SettingsModal({ onClose, rooms = [], onRoomsUpdate }: any) {
  const [activeTab, setActiveTab] = useState('info')
  const [showAddRoom, setShowAddRoom] = useState(false)
  const [showAddFloor, setShowAddFloor] = useState(false)
  const [editingRoom, setEditingRoom] = useState<any>(null)
  const [floors, setFloors] = useState([1, 2, 3])
  const [roomTypes, setRoomTypes] = useState([
    { id: 1, name: 'Standard', basePrice: 150, description: 'სტანდარტული ნომერი' },
    { id: 2, name: 'Deluxe', basePrice: 180, description: 'გაუმჯობესებული ნომერი' },
    { id: 3, name: 'Suite', basePrice: 250, description: 'ლუქსი' }
  ])
  
  // Form data states
  const [hotelInfo, setHotelInfo] = useState({
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
  
  const [roomForm, setRoomForm] = useState({
    roomNumber: '',
    floor: 1,
    roomType: 'Standard',
    basePrice: 150
  })
  
  const [activityLogs, setActivityLogs] = useState<any[]>([])
  
  // Save hotel info
  const saveHotelInfo = () => {
    try {
      localStorage.setItem('hotelInfo', JSON.stringify(hotelInfo))
      ActivityLogger.log('SETTINGS_CHANGED', {
        section: 'hotel-info',
        changes: 'Hotel information updated'
      })
      alert('ინფორმაცია შენახულია!')
    } catch (error) {
      console.error('Failed to save hotel info:', error)
      alert('შეცდომა შენახვისას')
    }
  }
  
  // Add new room
  const addRoom = async () => {
    if (!roomForm.roomNumber) {
      alert('გთხოვთ შეიყვანოთ ოთახის ნომერი')
      return
    }
    
    try {
      const newRoom = {
        ...roomForm,
        id: `room-${Date.now()}`,
        status: 'VACANT',
        maxOccupancy: 2,
        tenantId: 'default'
      }
      
      const res = await fetch('/api/hotel/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRoom)
      })
      
      if (res.ok) {
        setShowAddRoom(false)
        setRoomForm({ roomNumber: '', floor: 1, roomType: 'Standard', basePrice: 150 })
        if (onRoomsUpdate) onRoomsUpdate()
        alert('ოთახი დაემატა!')
      } else {
        const error = await res.json()
        alert(`შეცდომა: ${error.error || 'ოთახის დამატება ვერ მოხერხდა'}`)
      }
    } catch (error) {
      console.error('Failed to add room:', error)
      alert('შეცდომა ოთახის დამატებისას')
    }
  }
  
  // Update room
  const updateRoom = async () => {
    if (!editingRoom) return
    
    try {
      const res = await fetch(`/api/hotel/rooms/${editingRoom.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingRoom)
      })
      
      if (res.ok) {
        setEditingRoom(null)
        if (onRoomsUpdate) onRoomsUpdate()
        alert('ოთახი განახლდა!')
      } else {
        const error = await res.json()
        alert(`შეცდომა: ${error.error || 'ოთახის განახლება ვერ მოხერხდა'}`)
      }
    } catch (error) {
      console.error('Failed to update room:', error)
      alert('შეცდომა ოთახის განახლებისას')
    }
  }
  
  // Check if room can be deleted (has no active reservations)
  const canDeleteRoom = async (roomId: string): Promise<{ canDelete: boolean; message?: string }> => {
    try {
      const res = await fetch('/api/hotel/reservations')
      const reservations = res.ok ? await res.json() : []
      
      const activeReservations = reservations.filter((r: any) => 
        r.roomId === roomId && 
        ['CONFIRMED', 'CHECKED_IN', 'PENDING'].includes(r.status)
      )
      
      if (activeReservations.length > 0) {
        const guestNames = activeReservations.map((r: any) => r.guestName).join(', ')
        return {
          canDelete: false,
          message: `❌ ოთახის წაშლა შეუძლებელია!\n\n${activeReservations.length} აქტიური ჯავშანი:\n${guestNames}\n\nგთხოვთ ჯერ გააუქმოთ ან დაასრულოთ ჯავშნები.`
        }
      }
      
      return { canDelete: true }
    } catch (error) {
      console.error('Error checking room reservations:', error)
      return { canDelete: true } // Allow deletion if check fails (fail open)
    }
  }
  
  // Delete room
  const deleteRoom = async (roomId: string) => {
    // First check if room can be deleted
    const checkResult = await canDeleteRoom(roomId)
    if (!checkResult.canDelete) {
      alert(checkResult.message || 'Cannot delete room with active reservations')
      return
    }
    
    if (!confirm('ნამდვილად გსურთ ოთახის წაშლა?')) return
    
    try {
      const res = await fetch(`/api/hotel/rooms/${roomId}`, {
        method: 'DELETE'
      })
      
      if (res.ok) {
        if (onRoomsUpdate) onRoomsUpdate()
        alert('✅ ოთახი წაიშალა!')
      } else {
        const error = await res.json()
        alert(`❌ შეცდომა: ${error.error || error.details || 'ოთახის წაშლა ვერ მოხერხდა'}`)
      }
    } catch (error) {
      console.error('Failed to delete room:', error)
      alert('❌ შეცდომა ოთახის წაშლისას')
    }
  }
  
  // Add floor
  const addFloor = () => {
    try {
      const newFloor = Math.max(...floors) + 1
      const updatedFloors = [...floors, newFloor]
      setFloors(updatedFloors)
      localStorage.setItem('hotelFloors', JSON.stringify(updatedFloors))
      setShowAddFloor(false)
      alert(`სართული ${newFloor} დაემატა!`)
    } catch (error) {
      console.error('Failed to add floor:', error)
      alert('შეცდომა სართულის დამატებისას')
    }
  }
  
  // Load saved data on mount
  useEffect(() => {
    try {
      const savedInfo = localStorage.getItem('hotelInfo')
      if (savedInfo) {
        setHotelInfo(JSON.parse(savedInfo))
      }
      
      const savedFloors = localStorage.getItem('hotelFloors')
      if (savedFloors) {
        setFloors(JSON.parse(savedFloors))
      }
      
      const savedRoomTypes = localStorage.getItem('roomTypes')
      if (savedRoomTypes) {
        setRoomTypes(JSON.parse(savedRoomTypes))
      }
    } catch (error) {
      console.error('Failed to load saved data:', error)
    }
  }, [])
  
  const tabs = [
    { id: 'info', label: 'სასტუმროს ინფორმაცია', icon: '🏨' },
    { id: 'rooms', label: 'ოთახების მართვა', icon: '🛏️' },
    { id: 'roomTypes', label: 'ოთახის ტიპები', icon: '🏷️' },
    { id: 'floors', label: 'სართულები', icon: '🏢' },
    { id: 'staff', label: 'თანამშრომლები', icon: '👥' },
    { id: 'checklist', label: 'Checklist', icon: '✅' },
    { id: 'pricing', label: 'ფასები', icon: '💰' },
    { id: 'logs', label: 'ლოგები', icon: '📋' }
  ]
  
  // Load activity logs when logs tab is active
  useEffect(() => {
    if (activeTab === 'logs') {
      const logs = ActivityLogger.getLogs()
      setActivityLogs(logs)
    }
  }, [activeTab])
  
  const clearLogs = () => {
    if (confirm('ნამდვილად გსურთ ლოგების წაშლა?')) {
      ActivityLogger.clearLogs()
      setActivityLogs([])
      alert('✅ ლოგები წაიშალა')
    }
  }
  
  const filterLogsByDate = (date: string) => {
    if (!date) {
      const logs = ActivityLogger.getLogs()
      setActivityLogs(logs)
      return
    }
    
    const logs = ActivityLogger.getLogs()
    const filtered = logs.filter((log: any) => {
      const logDate = moment(log.timestamp).format('YYYY-MM-DD')
      return logDate === date
    })
    setActivityLogs(filtered)
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-7xl h-[95vh] flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 text-white p-4 flex justify-between items-center rounded-t-lg">
          <h2 className="text-xl font-bold">პარამეტრები</h2>
          <button 
            onClick={onClose} 
            className="text-2xl hover:text-gray-300 transition"
          >
            ×
          </button>
        </div>
        
        {/* Tabs */}
        <div className="bg-gray-100 border-b flex overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 font-medium transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-white border-b-2 border-blue-500 text-blue-600' 
                  : 'hover:bg-gray-200 text-gray-700'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
        
        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* Hotel Info Tab */}
          {activeTab === 'info' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">სასტუმროს დასახელება</label>
                  <input 
                    type="text" 
                    className="w-full border rounded px-3 py-2" 
                    value={hotelInfo.name}
                    onChange={(e) => setHotelInfo({...hotelInfo, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">კომპანიის დასახელება</label>
                  <input 
                    type="text" 
                    className="w-full border rounded px-3 py-2" 
                    value={hotelInfo.companyName}
                    onChange={(e) => setHotelInfo({...hotelInfo, companyName: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">საიდენტიფიკაციო კოდი</label>
                  <input 
                    type="text" 
                    className="w-full border rounded px-3 py-2" 
                    value={hotelInfo.taxId}
                    onChange={(e) => setHotelInfo({...hotelInfo, taxId: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">ბანკის დასახელება</label>
                  <input 
                    type="text" 
                    className="w-full border rounded px-3 py-2" 
                    value={hotelInfo.bankName}
                    onChange={(e) => setHotelInfo({...hotelInfo, bankName: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">ანგარიშის ნომერი</label>
                  <input 
                    type="text" 
                    className="w-full border rounded px-3 py-2" 
                    value={hotelInfo.bankAccount}
                    onChange={(e) => setHotelInfo({...hotelInfo, bankAccount: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">მისამართი</label>
                  <input 
                    type="text" 
                    className="w-full border rounded px-3 py-2" 
                    value={hotelInfo.address}
                    onChange={(e) => setHotelInfo({...hotelInfo, address: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">ტელეფონი</label>
                  <input 
                    type="tel" 
                    className="w-full border rounded px-3 py-2" 
                    value={hotelInfo.phone}
                    onChange={(e) => setHotelInfo({...hotelInfo, phone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">ელ-ფოსტა</label>
                  <input 
                    type="email" 
                    className="w-full border rounded px-3 py-2" 
                    value={hotelInfo.email}
                    onChange={(e) => setHotelInfo({...hotelInfo, email: e.target.value})}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">სასტუმროს ლოგო URL</label>
                  <input 
                    type="text" 
                    className="w-full border rounded px-3 py-2" 
                    value={hotelInfo.logo}
                    onChange={(e) => setHotelInfo({...hotelInfo, logo: e.target.value})}
                    placeholder="https://example.com/logo.png"
                  />
                </div>
              </div>
              <button 
                onClick={saveHotelInfo}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
              >
                💾 შენახვა
              </button>
            </div>
          )}
          
          {/* Rooms Tab */}
          {activeTab === 'rooms' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-lg">ოთახები ({rooms.length})</h3>
                <button
                  onClick={() => setShowAddRoom(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
                >
                  + ახალი ოთახი
                </button>
              </div>
              
              {rooms.length > 0 ? (
                <div className="border rounded overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3 border font-semibold">ნომერი</th>
                        <th className="text-left p-3 border font-semibold">სართული</th>
                        <th className="text-left p-3 border font-semibold">ტიპი</th>
                        <th className="text-left p-3 border font-semibold">ფასი</th>
                        <th className="text-center p-3 border font-semibold">მოქმედებები</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rooms.map((room: any) => (
                        <tr key={room.id} className="hover:bg-gray-50 transition">
                          <td className="p-3 border font-medium">{room.roomNumber}</td>
                          <td className="p-3 border">სართული {room.floor}</td>
                          <td className="p-3 border">{room.roomType || 'Standard'}</td>
                          <td className="p-3 border">₾{room.basePrice}</td>
                          <td className="p-3 border text-center">
                            <button
                              onClick={() => setEditingRoom({...room})}
                              className="text-blue-600 hover:text-blue-800 mx-1 transition"
                              title="რედაქტირება"
                            >
                              ✏️ რედაქტირება
                            </button>
                            <button
                              onClick={() => deleteRoom(room.id)}
                              className="text-red-600 hover:text-red-800 mx-1 transition"
                              title="წაშლა"
                            >
                              🗑️ წაშლა
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-lg mb-2">ოთახები არ არის</p>
                  <p className="text-sm">დაამატეთ პირველი ოთახი</p>
                </div>
              )}
            </div>
          )}
          
          {/* Room Types Tab */}
          {activeTab === 'roomTypes' && (
            <RoomTypeManager 
              roomTypes={roomTypes}
              onUpdate={(types: any[]) => {
                setRoomTypes(types)
                localStorage.setItem('roomTypes', JSON.stringify(types))
                alert('ოთახის ტიპები შენახულია!')
              }}
            />
          )}
          
          {/* Floors Tab */}
          {activeTab === 'floors' && (
            <FloorManager
              floors={floors}
              onFloorsUpdate={(updatedFloors: any[]) => {
                setFloors(updatedFloors)
              }}
            />
          )}
          
          {/* Staff Tab */}
          {activeTab === 'staff' && (
            <StaffManager 
              onStaffUpdate={(staff: any[]) => {
                localStorage.setItem('hotelStaff', JSON.stringify(staff))
                alert('თანამშრომლები შენახულია!')
              }}
            />
          )}
          
          {/* Checklist Tab */}
          {activeTab === 'checklist' && (
            <ChecklistManager 
              onChecklistUpdate={(checklist: any[]) => {
                localStorage.setItem('housekeepingChecklist', JSON.stringify(checklist))
                alert('Checklist შენახულია!')
              }}
            />
          )}
          
          {/* Pricing Tab */}
          {activeTab === 'pricing' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="border rounded p-4 hover:shadow-md transition">
                  <h4 className="font-semibold mb-2 text-gray-700">Standard</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">₾</span>
                    <input 
                      type="number" 
                      className="w-full border rounded px-3 py-2" 
                      defaultValue="150" 
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">ღამეზე</p>
                </div>
                <div className="border rounded p-4 hover:shadow-md transition">
                  <h4 className="font-semibold mb-2 text-gray-700">Deluxe</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">₾</span>
                    <input 
                      type="number" 
                      className="w-full border rounded px-3 py-2" 
                      defaultValue="180" 
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">ღამეზე</p>
                </div>
                <div className="border rounded p-4 hover:shadow-md transition">
                  <h4 className="font-semibold mb-2 text-gray-700">Suite</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">₾</span>
                    <input 
                      type="number" 
                      className="w-full border rounded px-3 py-2" 
                      defaultValue="250" 
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">ღამეზე</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Logs Tab */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold mb-4">📋 სისტემის აქტივობის ისტორია</h3>
              
              {/* Filter by date */}
              <div className="flex gap-4 mb-4">
                <input
                  type="date"
                  className="border rounded px-3 py-2"
                  onChange={(e) => filterLogsByDate(e.target.value)}
                />
                <button
                  onClick={clearLogs}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  🗑️ გასუფთავება
                </button>
              </div>
              
              {/* Logs list */}
              <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
                {activityLogs.length > 0 ? (
                  <div className="space-y-3">
                    {[...activityLogs].reverse().slice(0, 100).map((log, idx) => (
                      <div key={idx} className="border-b pb-2 last:border-b-0">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-medium">{log.user}</span>
                            <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">
                              {log.role}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {moment(log.timestamp).format('DD/MM HH:mm:ss')}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {ActivityLogger.getActionLabel(log.action)}
                        </div>
                        {log.details && Object.keys(log.details).length > 0 && (
                          <div className="text-xs text-gray-400 mt-1 bg-gray-50 p-2 rounded">
                            {JSON.stringify(log.details, null, 2)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">აქტივობა არ არის დაფიქსირებული</p>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="border-t p-4 flex justify-end gap-3 bg-gray-50">
          <button 
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-50 transition"
          >
            დახურვა
          </button>
        </div>
      </div>
      
      {/* Add Room Modal */}
      {showAddRoom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white rounded p-6 w-96" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold">ახალი ოთახი</h3>
              <button 
                onClick={() => setShowAddRoom(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>
            <div className="space-y-3">
              <input 
                type="text" 
                placeholder="ოთახის ნომერი" 
                className="w-full border rounded px-3 py-2"
                value={roomForm.roomNumber}
                onChange={(e) => setRoomForm({...roomForm, roomNumber: e.target.value})}
              />
              <select 
                className="w-full border rounded px-3 py-2"
                value={roomForm.floor}
                onChange={(e) => setRoomForm({...roomForm, floor: parseInt(e.target.value)})}
              >
                {floors.map(f => <option key={f} value={f}>სართული {f}</option>)}
              </select>
              <select 
                className="w-full border rounded px-3 py-2"
                value={roomForm.roomType}
                onChange={(e) => setRoomForm({...roomForm, roomType: e.target.value})}
              >
                <option value="Standard">Standard</option>
                <option value="Deluxe">Deluxe</option>
                <option value="Suite">Suite</option>
              </select>
              <input 
                type="number" 
                placeholder="ფასი" 
                className="w-full border rounded px-3 py-2"
                value={roomForm.basePrice}
                onChange={(e) => setRoomForm({...roomForm, basePrice: parseInt(e.target.value) || 150})}
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button 
                onClick={() => setShowAddRoom(false)}
                className="px-4 py-2 border rounded hover:bg-gray-50 transition"
              >
                გაუქმება
              </button>
              <button 
                onClick={addRoom}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
              >
                დამატება
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Room Modal */}
      {editingRoom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white rounded p-6 w-96" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold">ოთახის რედაქტირება</h3>
              <button 
                onClick={() => setEditingRoom(null)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>
            <div className="space-y-3">
              <input 
                type="text" 
                className="w-full border rounded px-3 py-2"
                value={editingRoom.roomNumber}
                onChange={(e) => setEditingRoom({...editingRoom, roomNumber: e.target.value})}
              />
              <select 
                className="w-full border rounded px-3 py-2"
                value={editingRoom.floor}
                onChange={(e) => setEditingRoom({...editingRoom, floor: parseInt(e.target.value)})}
              >
                {floors.map(f => <option key={f} value={f}>სართული {f}</option>)}
              </select>
              <select 
                className="w-full border rounded px-3 py-2"
                value={editingRoom.roomType}
                onChange={(e) => setEditingRoom({...editingRoom, roomType: e.target.value})}
              >
                <option value="Standard">Standard</option>
                <option value="Deluxe">Deluxe</option>
                <option value="Suite">Suite</option>
              </select>
              <input 
                type="number" 
                className="w-full border rounded px-3 py-2"
                value={editingRoom.basePrice}
                onChange={(e) => setEditingRoom({...editingRoom, basePrice: parseInt(e.target.value) || 150})}
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button 
                onClick={() => setEditingRoom(null)}
                className="px-4 py-2 border rounded hover:bg-gray-50 transition"
              >
                გაუქმება
              </button>
              <button 
                onClick={updateRoom}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                განახლება
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Add Floor Modal */}
      {showAddFloor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60" onClick={() => setShowAddFloor(false)}>
          <div className="bg-white rounded p-6 w-96" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold">ახალი სართული</h3>
              <button 
                onClick={() => setShowAddFloor(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>
            <p className="mb-4">დაემატება სართული #{Math.max(...floors) + 1}</p>
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setShowAddFloor(false)}
                className="px-4 py-2 border rounded hover:bg-gray-50 transition"
              >
                გაუქმება
              </button>
              <button 
                onClick={addFloor}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
              >
                დამატება
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
