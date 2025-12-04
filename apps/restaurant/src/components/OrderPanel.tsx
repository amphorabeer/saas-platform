'use client'

import { useState } from 'react'

interface Table {
  id: string
  number: number
  seats: number
  status: 'available' | 'occupied' | 'reserved' | 'cleaning'
  zone: string
}

interface OrderItem {
  id: string
  menuItemId: string
  name: string
  quantity: number
  price: number
  notes?: string
  status: 'pending' | 'preparing' | 'ready' | 'served'
}

interface OrderPanelProps {
  table: Table
  onClose: () => void
  onCreateOrder: (tableNumber: number, items: OrderItem[]) => void
}

export default function OrderPanel({ table, onClose, onCreateOrder }: OrderPanelProps) {
  const [selectedItems, setSelectedItems] = useState<OrderItem[]>([])

  // Sample menu items
  const menuItems = [
    { id: '1', name: 'ხაჭაპური', price: 15, category: 'Main' },
    { id: '2', name: 'მწვადი', price: 18, category: 'Main' },
    { id: '3', name: 'ხინკალი', price: 1.5, category: 'Main' },
    { id: '4', name: 'ლობიო', price: 12, category: 'Main' },
    { id: '5', name: 'წყალი', price: 2, category: 'Drinks' },
    { id: '6', name: 'ლიმონათი', price: 3, category: 'Drinks' },
    { id: '7', name: 'ტორტი', price: 8, category: 'Dessert' }
  ]

  const addItem = (menuItem: any) => {
    const existingItem = selectedItems.find(item => item.menuItemId === menuItem.id)
    
    if (existingItem) {
      setSelectedItems(prev => prev.map(item =>
        item.id === existingItem.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ))
    } else {
      setSelectedItems(prev => [...prev, {
        id: `item-${Date.now()}-${Math.random()}`,
        menuItemId: menuItem.id,
        name: menuItem.name,
        quantity: 1,
        price: menuItem.price,
        status: 'pending'
      }])
    }
  }

  const removeItem = (itemId: string) => {
    setSelectedItems(prev => prev.filter(item => item.id !== itemId))
  }

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId)
      return
    }
    setSelectedItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, quantity } : item
    ))
  }

  const totalAmount = selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)

  const handleCreateOrder = () => {
    if (selectedItems.length > 0) {
      onCreateOrder(table.number, selectedItems)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-bold">მაგიდა #{table.number} - ახალი შეკვეთა</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">✕</button>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Menu Selection */}
          <div>
            <h3 className="text-lg font-semibold mb-3">მენიუ</h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {menuItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => addItem(item)}
                  className="w-full text-left p-3 border rounded-lg hover:bg-gray-50 transition flex justify-between items-center"
                >
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-gray-500">{item.category}</div>
                  </div>
                  <div className="font-bold">₾{item.price}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Selected Items */}
          <div>
            <h3 className="text-lg font-semibold mb-3">შეკვეთა</h3>
            {selectedItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                აირჩიეთ კერძები მენიუდან
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {selectedItems.map(item => (
                  <div key={item.id} className="p-3 border rounded-lg flex justify-between items-center">
                    <div className="flex-1">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-gray-500">₾{item.price} x {item.quantity}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                      >
                        -
                      </button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                      >
                        +
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="ml-2 px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>სულ:</span>
                    <span>₾{totalAmount}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 border rounded hover:bg-gray-50">
            გაუქმება
          </button>
          <button
            onClick={handleCreateOrder}
            disabled={selectedItems.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            შეკვეთა
          </button>
        </div>
      </div>
    </div>
  )
}




