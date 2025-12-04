'use client'

import { useState } from 'react'

interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  category: string
  available: boolean
}

export default function MenuManager() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([
    { id: '1', name: 'ხაჭაპური', description: 'ტრადიციული ქართული ხაჭაპური', price: 15, category: 'Main', available: true },
    { id: '2', name: 'მწვადი', description: 'ქართული მწვადი', price: 18, category: 'Main', available: true },
    { id: '3', name: 'ხინკალი', description: '20 ცალი ხინკალი', price: 1.5, category: 'Main', available: true },
    { id: '4', name: 'ლობიო', description: 'ტრადიციული ლობიო', price: 12, category: 'Main', available: true },
    { id: '5', name: 'წყალი', description: 'მინერალური წყალი', price: 2, category: 'Drinks', available: true },
    { id: '6', name: 'ლიმონათი', description: 'ცივი ლიმონათი', price: 3, category: 'Drinks', available: true },
    { id: '7', name: 'ტორტი', description: 'შოკოლადის ტორტი', price: 8, category: 'Dessert', available: true }
  ])

  const categories = ['All', 'Main', 'Drinks', 'Dessert']
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [showAddModal, setShowAddModal] = useState(false)

  const filteredItems = selectedCategory === 'All'
    ? menuItems
    : menuItems.filter(item => item.category === selectedCategory)

  const toggleAvailability = (id: string) => {
    setMenuItems(prev => prev.map(item =>
      item.id === id ? { ...item, available: !item.available } : item
    ))
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">მენიუს მართვა</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + ახალი კერძი
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 mb-4">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-lg transition ${
              selectedCategory === category
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Menu Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map(item => (
          <div
            key={item.id}
            className={`border-2 rounded-lg p-4 ${
              item.available ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-gray-50 opacity-60'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <h3 className="font-bold text-lg">{item.name}</h3>
                <p className="text-sm text-gray-600">{item.description}</p>
                <p className="text-lg font-bold text-blue-600 mt-2">₾{item.price}</p>
              </div>
              <span className={`px-2 py-1 text-xs rounded-full ${
                item.available ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'
              }`}>
                {item.category}
              </span>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => toggleAvailability(item.id)}
                className={`flex-1 py-2 rounded text-sm ${
                  item.available
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                {item.available ? 'გამორთვა' : 'ჩართვა'}
              </button>
              <button className="flex-1 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm">
                რედაქტირება
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          ამ კატეგორიაში კერძები არ არის
        </div>
      )}
    </div>
  )
}




