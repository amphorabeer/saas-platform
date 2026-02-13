'use client'

import React, { useState, useEffect, useRef } from 'react'
import moment from 'moment'

interface PendingBooking {
  id: string
  type: 'spa' | 'restaurant' | 'hotel'
  bookingNumber: string
  guestName: string
  guestPhone: string
  date: string
  time?: string
  guests?: number
  status: string
  createdAt: string
}

export default function NotificationBell() {
  const [pendingBookings, setPendingBookings] = useState<PendingBooking[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch pending bookings
  const fetchPendingBookings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/hotel/pending-bookings')
      if (response.ok) {
        const data = await response.json()
        setPendingBookings(data)
      }
    } catch (error) {
      console.error('[NotificationBell] Error fetching:', error)
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch and polling
  useEffect(() => {
    fetchPendingBookings()
    
    // Poll every 30 seconds
    const interval = setInterval(fetchPendingBookings, 30000)
    
    return () => clearInterval(interval)
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Confirm booking
  const confirmBooking = async (booking: PendingBooking) => {
    try {
      const response = await fetch(`/api/hotel/spa-bookings/${booking.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed', sendEmail: true })
      })
      
      if (response.ok) {
        // Remove from list
        setPendingBookings(prev => prev.filter(b => b.id !== booking.id))
      }
    } catch (error) {
      console.error('[NotificationBell] Error confirming:', error)
    }
  }

  // Get type icon and label
  const getTypeInfo = (type: string) => {
    switch (type) {
      case 'spa': return { icon: '🍺', label: 'სპა' }
      case 'restaurant': return { icon: '🍽️', label: 'რესტორანი' }
      case 'hotel': return { icon: '🏨', label: 'სასტუმრო' }
      default: return { icon: '📋', label: 'ჯავშანი' }
    }
  }

  const pendingCount = pendingBookings.length

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => {
          setShowDropdown(!showDropdown)
          if (!showDropdown) fetchPendingBookings()
        }}
        className="relative px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
      >
        <span className="text-xl">🔔</span>
        {pendingCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
            {pendingCount > 9 ? '9+' : pendingCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
            <h3 className="font-bold text-gray-800">🔔 შეტყობინებები</h3>
            {pendingCount > 0 && (
              <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-xs font-medium">
                {pendingCount} ახალი
              </span>
            )}
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-72">
            {loading && pendingBookings.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <div className="animate-spin inline-block w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full"></div>
                <p className="mt-2 text-sm">იტვირთება...</p>
              </div>
            ) : pendingBookings.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <div className="text-4xl mb-2">✅</div>
                <p>ახალი ჯავშნები არ არის</p>
              </div>
            ) : (
              <div className="divide-y">
                {pendingBookings.map((booking) => {
                  const typeInfo = getTypeInfo(booking.type)
                  return (
                    <div key={booking.id} className="p-3 hover:bg-gray-50">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{typeInfo.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 truncate">
                              {booking.guestName}
                            </span>
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">
                              {typeInfo.label}
                            </span>
                          </div>
                          <div className="text-sm text-gray-500 mt-0.5">
                            📅 {moment(booking.date).format('DD/MM')} 
                            {booking.time && ` • ${booking.time}`}
                            {booking.guests && ` • 👥${booking.guests}`}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {moment(booking.createdAt).fromNow()}
                          </div>
                        </div>
                        <button
                          onClick={() => confirmBooking(booking)}
                          className="px-3 py-1.5 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 whitespace-nowrap"
                        >
                          ✓ დადასტურება
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {pendingBookings.length > 0 && (
            <div className="px-4 py-2 border-t bg-gray-50">
              <button
                onClick={() => {
                  // Navigate to bookings page
                  window.dispatchEvent(new CustomEvent('openTab', { detail: 'spa' }))
                  setShowDropdown(false)
                }}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                ყველას ნახვა →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
