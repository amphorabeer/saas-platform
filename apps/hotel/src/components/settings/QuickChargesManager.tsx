'use client'

import React from 'react'
import ChargesSettings from '../ChargesSettings'

export default function QuickChargesManager() {
  const quickButtons = typeof window !== 'undefined' 
    ? JSON.parse(localStorage.getItem('quickButtons') || '[]')
    : []
  const items = typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem('chargeItems') || '[]')
    : []

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold mb-2">⚡ Quick Charges Configuration</h2>
          <p className="text-gray-600">Configure quick access buttons for common charges</p>
        </div>
        <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded">
          {quickButtons.length} quick buttons configured
        </span>
      </div>

      {/* Quick Buttons Preview */}
      {quickButtons.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold mb-3">Current Quick Buttons:</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickButtons.map((btn: any, idx: number) => {
              const item = items.find((i: any) => i.id === btn.itemId)
              return (
                <div key={idx} className="bg-white border rounded p-3 text-center">
                  <div className="text-2xl mb-1">{btn.icon || item?.icon || '💰'}</div>
                  <div className="text-xs font-medium">{item?.name || btn.label || 'Unknown'}</div>
                  <div className="text-xs text-gray-600">₾{item?.price || btn.amount || 0}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Charges Settings Integration */}
      <div className="border-t pt-6">
        <ChargesSettings defaultTab="quick" />
      </div>
    </div>
  )
}



