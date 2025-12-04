'use client'

import React from 'react'
import ChargesSettings from '../ChargesSettings'
import { ExtraChargesService } from '../../services/ExtraChargesService'

export default function ExtraServicesManager({ items: propItems }: { items?: any[] } = {}) {
  const defaultItems = ExtraChargesService.ITEMS
  const items = propItems && propItems.length > 0 ? propItems : defaultItems
  const categories = ExtraChargesService.CATEGORIES

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold mb-2">➕ Extra Services</h2>
          <p className="text-gray-600">Manage extra charge items and categories</p>
        </div>
        <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded">
          {items.length} items available
        </span>
      </div>

      {/* Categories Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {categories.map(cat => {
          const categoryItems = items.filter(i => i.categoryId === cat.id)
          return (
            <div key={cat.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{cat.icon}</span>
                <div>
                  <h4 className="font-bold text-lg">{cat.name}</h4>
                  <p className="text-xs text-gray-600">
                    {categoryItems.length} items
                  </p>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                <div>Tax: {cat.taxRate}%</div>
                {cat.serviceChargeRate > 0 && (
                  <div>Service: {cat.serviceChargeRate}%</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Charges Settings Integration */}
      <div className="border-t pt-6">
        <ChargesSettings defaultTab="items" />
      </div>
    </div>
  )
}



