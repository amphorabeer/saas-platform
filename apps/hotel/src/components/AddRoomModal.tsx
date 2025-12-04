'use client'

import { useState } from 'react'

export default function AddRoomModal({ onClose, onAdd, room }: any) {
  const [formData, setFormData] = useState({
    roomNumber: room?.roomNumber || '',
    floor: room?.floor || 1,
    roomType: room?.roomType || 'Standard',
    basePrice: room?.basePrice || 150,
    maxOccupancy: room?.maxOccupancy || 2,
    status: room?.status || 'VACANT'
  })

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-bold">{room ? 'ოთახის რედაქტირება' : 'ახალი ოთახის დამატება'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">✕</button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">ოთახის ნომერი</label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2"
              value={formData.roomNumber}
              onChange={(e) => setFormData({...formData, roomNumber: e.target.value})}
              placeholder="მაგ: 401"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">სართული</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={formData.floor}
              onChange={(e) => setFormData({...formData, floor: parseInt(e.target.value)})}
            >
              <option value={1}>სართული 1</option>
              <option value={2}>სართული 2</option>
              <option value={3}>სართული 3</option>
              <option value={4}>სართული 4</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">ოთახის ტიპი</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={formData.roomType}
              onChange={(e) => setFormData({...formData, roomType: e.target.value})}
            >
              <option value="Standard">Standard</option>
              <option value="Deluxe">Deluxe</option>
              <option value="Suite">Suite</option>
              <option value="Presidential">Presidential</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">ფასი (₾/ღამე)</label>
            <input
              type="number"
              className="w-full border rounded px-3 py-2"
              value={formData.basePrice}
              onChange={(e) => setFormData({...formData, basePrice: parseInt(e.target.value) || 150})}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">მაქსიმალური ტევადობა</label>
            <input
              type="number"
              className="w-full border rounded px-3 py-2"
              value={formData.maxOccupancy}
              onChange={(e) => setFormData({...formData, maxOccupancy: parseInt(e.target.value) || 2})}
              min="1"
              max="6"
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            გაუქმება
          </button>
          <button
            onClick={() => {
              if (formData.roomNumber) {
                onAdd(formData)
              }
            }}
            disabled={!formData.roomNumber}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {room ? 'განახლება' : 'დამატება'}
          </button>
        </div>
      </div>
    </div>
  )
}

