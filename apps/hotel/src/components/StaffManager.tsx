'use client'

import { useState, useEffect } from 'react'

export default function StaffManager({ onStaffUpdate }: any) {
  const [staff, setStaff] = useState<any[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingStaff, setEditingStaff] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: '',
    position: 'დამლაგებელი',
    shift: 'დილა',
    phone: '',
    active: true
  })
  
  useEffect(() => {
    const saved = localStorage.getItem('hotelStaff')
    if (saved) {
      setStaff(JSON.parse(saved))
    } else {
      // No default staff - start with empty array
      // Staff must be added through Settings
      setStaff([])
    }
  }, [])
  
  const handleAdd = () => {
    const newStaff = {
      id: Date.now(),
      ...formData
    }
    const updated = [...staff, newStaff]
    setStaff(updated)
    onStaffUpdate(updated)
    setShowAddForm(false)
    setFormData({ name: '', position: 'დამლაგებელი', shift: 'დილა', phone: '', active: true })
  }
  
  const handleUpdate = () => {
    const updated = staff.map((s: any) => 
      s.id === editingStaff.id ? editingStaff : s
    )
    setStaff(updated)
    onStaffUpdate(updated)
    setEditingStaff(null)
  }
  
  const handleDelete = (id: number) => {
    if (confirm('ნამდვილად გსურთ თანამშრომლის წაშლა?')) {
      const updated = staff.filter((s: any) => s.id !== id)
      setStaff(updated)
      onStaffUpdate(updated)
    }
  }
  
  const toggleActive = (id: number) => {
    const updated = staff.map((s: any) => 
      s.id === id ? { ...s, active: !s.active } : s
    )
    setStaff(updated)
    onStaffUpdate(updated)
  }
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold">თანამშრომლები ({staff.filter((s: any) => s.active).length} აქტიური)</h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          + ახალი თანამშრომელი
        </button>
      </div>
      
      <table className="w-full border">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left p-2 border">სახელი</th>
            <th className="text-left p-2 border">პოზიცია</th>
            <th className="text-left p-2 border">ცვლა</th>
            <th className="text-left p-2 border">ტელეფონი</th>
            <th className="text-center p-2 border">სტატუსი</th>
            <th className="text-center p-2 border">მოქმედება</th>
          </tr>
        </thead>
        <tbody>
          {staff.map((member: any) => (
            <tr key={member.id} className={!member.active ? 'opacity-50' : ''}>
              <td className="p-2 border font-medium">{member.name}</td>
              <td className="p-2 border">{member.position}</td>
              <td className="p-2 border">{member.shift}</td>
              <td className="p-2 border">{member.phone}</td>
              <td className="p-2 border text-center">
                <button
                  onClick={() => toggleActive(member.id)}
                  className={`px-2 py-1 rounded text-xs ${
                    member.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {member.active ? 'აქტიური' : 'არააქტიური'}
                </button>
              </td>
              <td className="p-2 border text-center">
                <button
                  onClick={() => setEditingStaff({...member})}
                  className="text-blue-600 mx-1"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDelete(member.id)}
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
      {(showAddForm || editingStaff) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded p-6 w-96">
            <h3 className="font-bold mb-4">
              {editingStaff ? 'თანამშრომლის რედაქტირება' : 'ახალი თანამშრომელი'}
            </h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="სახელი"
                className="w-full border rounded px-3 py-2"
                value={editingStaff ? editingStaff.name : formData.name}
                onChange={(e) => editingStaff ? 
                  setEditingStaff({...editingStaff, name: e.target.value}) :
                  setFormData({...formData, name: e.target.value})
                }
              />
              <select
                className="w-full border rounded px-3 py-2"
                value={editingStaff ? editingStaff.position : formData.position}
                onChange={(e) => editingStaff ?
                  setEditingStaff({...editingStaff, position: e.target.value}) :
                  setFormData({...formData, position: e.target.value})
                }
              >
                <option value="დამლაგებელი">დამლაგებელი</option>
                <option value="სუპერვაიზერი">სუპერვაიზერი</option>
                <option value="მენეჯერი">მენეჯერი</option>
              </select>
              <select
                className="w-full border rounded px-3 py-2"
                value={editingStaff ? editingStaff.shift : formData.shift}
                onChange={(e) => editingStaff ?
                  setEditingStaff({...editingStaff, shift: e.target.value}) :
                  setFormData({...formData, shift: e.target.value})
                }
              >
                <option value="დილა">დილის ცვლა (08:00-16:00)</option>
                <option value="საღამო">საღამოს ცვლა (16:00-24:00)</option>
                <option value="ღამე">ღამის ცვლა (00:00-08:00)</option>
              </select>
              <input
                type="tel"
                placeholder="ტელეფონი"
                className="w-full border rounded px-3 py-2"
                value={editingStaff ? editingStaff.phone : formData.phone}
                onChange={(e) => editingStaff ?
                  setEditingStaff({...editingStaff, phone: e.target.value}) :
                  setFormData({...formData, phone: e.target.value})
                }
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setEditingStaff(null)
                }}
                className="px-4 py-2 border rounded"
              >
                გაუქმება
              </button>
              <button
                onClick={editingStaff ? handleUpdate : handleAdd}
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



