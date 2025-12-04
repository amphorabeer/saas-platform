'use client'

import { useState, useEffect } from 'react'

export default function ChecklistManager({ onChecklistUpdate }: any) {
  const [items, setItems] = useState<any[]>([])
  const [newItem, setNewItem] = useState('')
  const [editingItem, setEditingItem] = useState<any>(null)
  
  useEffect(() => {
    const saved = localStorage.getItem('housekeepingChecklist')
    if (saved) {
      setItems(JSON.parse(saved))
    } else {
      // Default checklist
      setItems([
        { id: 1, item: 'ზეწრების შეცვლა', required: true },
        { id: 2, item: 'პირსახოცების შეცვლა', required: true },
        { id: 3, item: 'აბაზანის დასუფთავება', required: true },
        { id: 4, item: 'იატაკის დალაგება', required: true },
        { id: 5, item: 'მინიბარის შემოწმება', required: false },
        { id: 6, item: 'ნაგვის გატანა', required: true },
        { id: 7, item: 'ზედაპირების დასუფთავება', required: true }
      ])
    }
  }, [])
  
  const handleAdd = () => {
    if (!newItem.trim()) return
    
    const newChecklistItem = {
      id: Date.now(),
      item: newItem,
      required: true
    }
    const updated = [...items, newChecklistItem]
    setItems(updated)
    onChecklistUpdate(updated)
    setNewItem('')
  }
  
  const handleUpdate = () => {
    const updated = items.map((i: any) => 
      i.id === editingItem.id ? editingItem : i
    )
    setItems(updated)
    onChecklistUpdate(updated)
    setEditingItem(null)
  }
  
  const handleDelete = (id: number) => {
    const updated = items.filter((i: any) => i.id !== id)
    setItems(updated)
    onChecklistUpdate(updated)
  }
  
  const toggleRequired = (id: number) => {
    const updated = items.map((i: any) => 
      i.id === id ? { ...i, required: !i.required } : i
    )
    setItems(updated)
    onChecklistUpdate(updated)
  }
  
  const moveUp = (index: number) => {
    if (index === 0) return
    const newItems = [...items]
    ;[newItems[index], newItems[index - 1]] = [newItems[index - 1], newItems[index]]
    setItems(newItems)
    onChecklistUpdate(newItems)
  }
  
  const moveDown = (index: number) => {
    if (index === items.length - 1) return
    const newItems = [...items]
    ;[newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]]
    setItems(newItems)
    onChecklistUpdate(newItems)
  }
  
  return (
    <div>
      <h3 className="font-semibold mb-4">დასუფთავების Checklist</h3>
      
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="ახალი პუნქტი..."
          className="flex-1 border rounded px-3 py-2"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button
          onClick={handleAdd}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          დამატება
        </button>
      </div>
      
      <div className="border rounded max-h-96 overflow-y-auto">
        {items.map((item: any, index: number) => (
          <div key={item.id} className="flex items-center gap-2 p-3 border-b hover:bg-gray-50">
            <div className="flex-1">
              {editingItem?.id === item.id ? (
                <input
                  type="text"
                  className="w-full border rounded px-2 py-1"
                  value={editingItem.item}
                  onChange={(e) => setEditingItem({...editingItem, item: e.target.value})}
                  onBlur={handleUpdate}
                  onKeyPress={(e) => e.key === 'Enter' && handleUpdate()}
                  autoFocus
                />
              ) : (
                <span className={item.required ? 'font-medium' : ''}>
                  {item.item}
                  {item.required && <span className="text-red-500 ml-1">*</span>}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              <button
                onClick={() => toggleRequired(item.id)}
                className={`px-2 py-1 rounded text-xs ${
                  item.required ? 'bg-red-100 text-red-600' : 'bg-gray-100'
                }`}
              >
                {item.required ? 'აუცილებელი' : 'არასავალდებულო'}
              </button>
              
              <button onClick={() => moveUp(index)} className="text-gray-400 hover:text-gray-600">
                ↑
              </button>
              <button onClick={() => moveDown(index)} className="text-gray-400 hover:text-gray-600">
                ↓
              </button>
              <button onClick={() => setEditingItem(item)} className="text-blue-600">
                ✏️
              </button>
              <button onClick={() => handleDelete(item.id)} className="text-red-600">
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-2 text-sm text-gray-500">
        * აუცილებელი პუნქტები უნდა შესრულდეს ყველა დასუფთავებისას
      </div>
    </div>
  )
}

