'use client'

import { useState } from 'react'

export default function RoomTypeManager({ roomTypes, onUpdate }: any) {
  const [types, setTypes] = useState(roomTypes || [
    { id: 1, name: 'Standard', basePrice: 150, description: 'სტანდარტული ნომერი' },
    { id: 2, name: 'Deluxe', basePrice: 180, description: 'გაუმჯობესებული ნომერი' },
    { id: 3, name: 'Suite', basePrice: 250, description: 'ლუქსი' }
  ])
  
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingType, setEditingType] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: '',
    basePrice: 0,
    description: ''
  })
  
  const handleAdd = () => {
    const newType = {
      id: Date.now(),
      ...formData
    }
    setTypes([...types, newType])
    onUpdate([...types, newType])
    setShowAddForm(false)
    setFormData({ name: '', basePrice: 0, description: '' })
  }
  
  const handleUpdate = () => {
    const updated = types.map((t: any) => 
      t.id === editingType.id ? editingType : t
    )
    setTypes(updated)
    onUpdate(updated)
    setEditingType(null)
  }
  
  const handleDelete = (id: number) => {
    if (confirm('წაიშალოს ოთახის ტიპი?')) {
      const filtered = types.filter((t: any) => t.id !== id)
      setTypes(filtered)
      onUpdate(filtered)
    }
  }
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold">ოთახის ტიპები</h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
        >
          + ახალი ტიპი
        </button>
      </div>
      
      <table className="w-full border">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left p-2 border">დასახელება</th>
            <th className="text-left p-2 border">ფასი</th>
            <th className="text-left p-2 border">აღწერა</th>
            <th className="text-center p-2 border">მოქმედება</th>
          </tr>
        </thead>
        <tbody>
          {types.map((type: any) => (
            <tr key={type.id}>
              <td className="p-2 border">{type.name}</td>
              <td className="p-2 border">₾{type.basePrice}</td>
              <td className="p-2 border">{type.description}</td>
              <td className="p-2 border text-center">
                <button
                  onClick={() => setEditingType({...type})}
                  className="text-blue-600 mx-1"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDelete(type.id)}
                  className="text-red-600 mx-1"
                >
                  🗑️
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Add/Edit Modal */}
      {(showAddForm || editingType) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded p-6 w-96">
            <h3 className="font-bold mb-4">
              {editingType ? 'ტიპის რედაქტირება' : 'ახალი ტიპი'}
            </h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="დასახელება"
                className="w-full border rounded px-3 py-2"
                value={editingType ? editingType.name : formData.name}
                onChange={(e) => editingType ? 
                  setEditingType({...editingType, name: e.target.value}) :
                  setFormData({...formData, name: e.target.value})
                }
              />
              <input
                type="number"
                placeholder="ფასი"
                className="w-full border rounded px-3 py-2"
                value={editingType ? editingType.basePrice : formData.basePrice}
                onChange={(e) => editingType ?
                  setEditingType({...editingType, basePrice: parseInt(e.target.value)}) :
                  setFormData({...formData, basePrice: parseInt(e.target.value)})
                }
              />
              <textarea
                placeholder="აღწერა"
                className="w-full border rounded px-3 py-2"
                value={editingType ? editingType.description : formData.description}
                onChange={(e) => editingType ?
                  setEditingType({...editingType, description: e.target.value}) :
                  setFormData({...formData, description: e.target.value})
                }
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setEditingType(null)
                }}
                className="px-4 py-2 border rounded"
              >
                გაუქმება
              </button>
              <button
                onClick={editingType ? handleUpdate : handleAdd}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                შენახვა
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

