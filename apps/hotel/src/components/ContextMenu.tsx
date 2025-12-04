'use client'

import { useEffect, useRef } from 'react'

interface ContextMenuProps {
  x: number
  y: number
  reservation: any
  onClose: () => void
  onEdit: () => void
  onChangeRoom: () => void
  onCheckIn: () => void
  onCheckOut: () => void
  onCancel: () => void
}

export default function ContextMenu({
  x,
  y,
  reservation,
  onClose,
  onEdit,
  onChangeRoom,
  onCheckIn,
  onCheckOut,
  onCancel
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscKey)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscKey)
    }
  }, [onClose])

  const isCheckedIn = reservation?.status === 'CHECKED_IN'
  const isConfirmed = reservation?.status === 'CONFIRMED'
  const isCheckedOut = reservation?.status === 'CHECKED_OUT'
  const isCancelled = reservation?.status === 'CANCELLED'

  // Adjust position if menu would go off screen
  const [adjustedX, adjustedY] = (() => {
    let newX = x
    let newY = y
    
    if (typeof window !== 'undefined') {
      if (x + 200 > window.innerWidth) {
        newX = window.innerWidth - 220
      }
      if (y + 300 > window.innerHeight) {
        newY = window.innerHeight - 320
      }
    }
    
    return [newX, newY]
  })()

  return (
    <div
      ref={menuRef}
      className="fixed bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50 min-w-[200px]"
      style={{ left: adjustedX, top: adjustedY }}
    >
      <div className="px-3 py-2 border-b border-gray-200">
        <div className="font-semibold text-sm">{reservation?.guestName || 'Unknown'}</div>
        <div className="text-xs text-gray-500">Room {reservation?.roomNumber || '-'}</div>
        <div className="text-xs text-gray-400 mt-1">
          {reservation?.status === 'CONFIRMED' && '📅 დადასტურებული'}
          {reservation?.status === 'CHECKED_IN' && '✅ Check In გაკეთებულია'}
          {reservation?.status === 'CHECKED_OUT' && '🚪 Check Out გაკეთებულია'}
          {reservation?.status === 'CANCELLED' && '❌ გაუქმებული'}
        </div>
      </div>
      
      <button
        onClick={onEdit}
        className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-sm transition"
      >
        <span>✏️</span>
        <span>რედაქტირება</span>
      </button>
      
      {!isCheckedOut && !isCancelled && (
        <button
          onClick={onChangeRoom}
          className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-sm transition"
        >
          <span>🔄</span>
          <span>ოთახის შეცვლა</span>
        </button>
      )}
      
      {!isCheckedIn && isConfirmed && !isCheckedOut && !isCancelled && (
        <button
          onClick={onCheckIn}
          className="w-full px-3 py-2 text-left hover:bg-green-50 flex items-center gap-2 text-sm text-green-600 transition"
        >
          <span>✅</span>
          <span>Check In</span>
        </button>
      )}
      
      {isCheckedIn && !isCheckedOut && (
        <button
          onClick={onCheckOut}
          className="w-full px-3 py-2 text-left hover:bg-blue-50 flex items-center gap-2 text-sm text-blue-600 transition"
        >
          <span>🚪</span>
          <span>Check Out</span>
        </button>
      )}
      
      <div className="border-t border-gray-200 my-2"></div>
      
      {!isCheckedOut && !isCancelled && (
        <button
          onClick={onCancel}
          className="w-full px-3 py-2 text-left hover:bg-red-50 flex items-center gap-2 text-sm text-red-600 transition"
        >
          <span>❌</span>
          <span>გაუქმება</span>
        </button>
      )}
    </div>
  )
}




