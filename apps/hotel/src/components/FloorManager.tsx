'use client'

import { useState } from 'react'

export default function FloorManager({ floors, onFloorsUpdate }: any) {
  const [editingFloor, setEditingFloor] = useState<number | null>(null)
  const [newFloorName, setNewFloorName] = useState('')
  
  const addFloor = () => {
    const maxFloor = floors.length > 0 ? Math.max(...floors.map((f: any) => typeof f === 'number' ? f : f.number)) : 0
    const newFloor = maxFloor + 1
    const updatedFloors = [...floors, { number: newFloor, name: `სართული ${newFloor}`, rooms: 0 }]
    onFloorsUpdate(updatedFloors)
    localStorage.setItem('hotelFloors', JSON.stringify(updatedFloors))
  }
  
  const deleteFloor = (floorNumber: number) => {
    if (!confirm(`წაიშალოს სართული ${floorNumber}?`)) return
    const updatedFloors = floors.filter((f: any) => {
      const num = typeof f === 'number' ? f : f.number
      return num !== floorNumber
    })
    onFloorsUpdate(updatedFloors)
    localStorage.setItem('hotelFloors', JSON.stringify(updatedFloors))
  }
  
  const updateFloor = (floorNumber: number, newName: string) => {
    const updatedFloors = floors.map((f: any) => {
      const num = typeof f === 'number' ? f : f.number
      return num === floorNumber ? { number: floorNumber, name: newName, rooms: typeof f === 'number' ? 0 : f.rooms } : f
    })
    onFloorsUpdate(updatedFloors)
    localStorage.setItem('hotelFloors', JSON.stringify(updatedFloors))
    setEditingFloor(null)
  }
  
  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">სართულების მართვა</h3>
        <button
          onClick={addFloor}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
        >
          + ახალი სართული
        </button>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        {floors.map((floor: any, index: number) => {
          const floorNumber = typeof floor === 'number' ? floor : floor.number
          const floorName = typeof floor === 'number' ? `სართული ${floor}` : (floor.name || `სართული ${floor.number}`)
          const roomCount = typeof floor === 'number' ? 0 : (floor.rooms || 0)
          
          return (
            <div key={index} className="border rounded-lg p-4 bg-white shadow hover:shadow-md transition">
              {editingFloor === floorNumber ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newFloorName}
                    onChange={(e) => setNewFloorName(e.target.value)}
                    className="w-full border rounded px-2 py-1"
                    placeholder="სართულის სახელი"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateFloor(floorNumber, newFloorName)}
                      className="bg-blue-500 text-white px-2 py-1 rounded text-sm hover:bg-blue-600 transition"
                    >
                      შენახვა
                    </button>
                    <button
                      onClick={() => setEditingFloor(null)}
                      className="bg-gray-500 text-white px-2 py-1 rounded text-sm hover:bg-gray-600 transition"
                    >
                      გაუქმება
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-2xl">🏢</div>
                      <div className="font-semibold">{floorName}</div>
                      <div className="text-sm text-gray-500">{roomCount} ოთახი</div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setEditingFloor(floorNumber)
                          setNewFloorName(floorName)
                        }}
                        className="text-blue-600 hover:text-blue-800 transition"
                        title="რედაქტირება"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => deleteFloor(floorNumber)}
                        className="text-red-600 hover:text-red-800 transition"
                        title="წაშლა"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}




