'use client'

import { useState, useEffect } from 'react'

export default function ChangeRoomModal({ reservation, rooms, onClose, onSave }: any) {
  const [selectedRoomId, setSelectedRoomId] = useState(reservation?.roomId || '')
  
  // Get available rooms (VACANT or current room)
  const availableRooms = rooms.filter((r: any) => 
    r.status === 'VACANT' || r.id === reservation?.roomId
  )

  useEffect(() => {
    if (reservation?.roomId) {
      setSelectedRoomId(reservation.roomId)
    }
  }, [reservation])

  const handleSave = () => {
    if (!selectedRoomId) {
      alert('გთხოვთ აირჩიოთ ოთახი')
      return
    }

    const selectedRoom = rooms.find((r: any) => r.id === selectedRoomId)
    onSave(selectedRoomId, selectedRoom?.roomNumber)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-bold">ოთახის შეცვლა</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>
        
        <div className="mb-4">
          <div className="text-sm text-gray-600 mb-2">
            მიმდინარე ოთახი: <span className="font-medium">Room {reservation?.roomNumber || '-'}</span>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">აირჩიეთ ახალი ოთახი</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={selectedRoomId}
            onChange={(e) => setSelectedRoomId(e.target.value)}
          >
            <option value="">აირჩიეთ ოთახი</option>
            {availableRooms.map((room: any) => (
              <option key={room.id} value={room.id}>
                Room {room.roomNumber} - {room.roomType || 'Standard'} (₾{room.basePrice})
                {room.id === reservation?.roomId && ' (მიმდინარე)'}
              </option>
            ))}
          </select>
        </div>

        {selectedRoomId && selectedRoomId !== reservation?.roomId && (
          <div className="mt-4 p-3 bg-blue-50 rounded text-sm text-blue-700">
            <div className="font-medium">ყურადღება:</div>
            <div className="text-xs mt-1">
              მიმდინარე ოთახი გახდება თავისუფალი, ახალი ოთახი კი დაკავებული
            </div>
          </div>
        )}
        
        <div className="flex justify-end gap-3 mt-6">
          <button 
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-50 transition"
          >
            გაუქმება
          </button>
          <button 
            onClick={handleSave}
            disabled={!selectedRoomId || selectedRoomId === reservation?.roomId}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            შეცვლა
          </button>
        </div>
      </div>
    </div>
  )
}




