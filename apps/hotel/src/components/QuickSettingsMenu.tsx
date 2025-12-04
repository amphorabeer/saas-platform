'use client'

import React, { useState, useEffect } from 'react'

export default function QuickSettingsMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [pinnedItems, setPinnedItems] = useState<string[]>([])
  
  const quickItems = [
    { id: 'rates', label: 'Update Rates', icon: '💰', action: 'pricing/rates' },
    { id: 'rooms', label: 'Room Status', icon: '🛏️', action: 'rooms/status' },
    { id: 'staff', label: 'Add Staff', icon: '👥', action: 'staff/add' },
    { id: 'taxes', label: 'Tax Settings', icon: '📊', action: 'pricing/taxes' },
    { id: 'backup', label: 'Backup Now', icon: '💾', action: 'system/backup' },
    { id: 'logs', label: 'View Logs', icon: '📋', action: 'system/logs' }
  ]
  
  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = localStorage.getItem('pinnedSettings')
    if (saved) {
      try {
        setPinnedItems(JSON.parse(saved))
      } catch (e) {
        console.error('Error loading pinned items:', e)
      }
    }
  }, [])
  
  const handleAction = (action: string) => {
    // Navigate to setting or trigger action
    if (action.includes('/')) {
      // Could use router or state management
      window.location.hash = `#settings/${action}`
    } else {
      // Direct action
      alert(`Action: ${action}`)
    }
    setIsOpen(false)
  }
  
  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-110 z-50 flex items-center justify-center"
        aria-label="Quick Settings"
      >
        <span className="text-2xl">{isOpen ? '✕' : '⚙️'}</span>
      </button>
      
      {/* Quick Menu */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 bg-white rounded-lg shadow-2xl border p-4 w-72 z-50 animate-fadeIn max-h-96 overflow-y-auto">
          <h3 className="font-bold mb-3">Quick Settings</h3>
          
          {/* Search */}
          <input
            type="text"
            placeholder="Search settings..."
            className="w-full border rounded px-3 py-2 mb-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          
          {/* Quick Items */}
          <div className="space-y-1">
            {quickItems.map(item => (
              <button
                key={item.id}
                onClick={() => handleAction(item.action)}
                className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 flex items-center gap-3 group transition-colors"
              >
                <span className="text-xl">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                <span className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
              </button>
            ))}
          </div>
          
          <div className="mt-3 pt-3 border-t">
            <a
              href="#settings"
              onClick={(e) => {
                e.preventDefault()
                // Navigate to full settings
                window.location.hash = '#settings'
                setIsOpen(false)
              }}
              className="text-sm text-blue-600 hover:text-blue-800 block"
            >
              View All Settings →
            </a>
          </div>
        </div>
      )}
      
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-20 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}



