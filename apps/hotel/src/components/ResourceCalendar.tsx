'use client'

import { useState } from 'react'

interface ResourceCalendarProps {
  rooms: any[]
  reservations: any[]
  onSlotSelect?: (roomId: string, date: Date) => void
}

export default function ResourceCalendar({ rooms, reservations, onSlotSelect }: ResourceCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<'day' | 'week'>('day')
  
  // Get dates for current view
  const getDates = () => {
    const dates = []
    if (view === 'day') {
      dates.push(new Date(currentDate))
    } else {
      // Week view - 7 days
      const startOfWeek = new Date(currentDate)
      const day = startOfWeek.getDay()
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1)
      startOfWeek.setDate(diff)
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek)
        date.setDate(startOfWeek.getDate() + i)
        dates.push(date)
      }
    }
    return dates
  }
  
  const dates = getDates()
  
  // Check if reservation exists for room/date
  const getReservation = (roomId: string, date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return reservations.find(res => {
      const checkIn = new Date(res.checkIn).toISOString().split('T')[0]
      const checkOut = new Date(res.checkOut).toISOString().split('T')[0]
      
      return res.roomId === roomId && 
             dateStr >= checkIn && 
             dateStr < checkOut
    })
  }
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ka-GE', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    })
  }
  
  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('ka-GE', { year: 'numeric', month: 'long' })
  }
  
  return (
    <div className="bg-white rounded-lg shadow">
      {/* Calendar Header */}
      <div className="p-4 border-b flex justify-between items-center bg-gray-50">
        <div className="flex gap-2">
          <button 
            onClick={() => {
              const newDate = new Date(currentDate)
              newDate.setDate(currentDate.getDate() - (view === 'day' ? 1 : 7))
              setCurrentDate(newDate)
            }}
            className="px-3 py-1 border rounded hover:bg-gray-100 transition"
          >
            ←
          </button>
          <button 
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1 border rounded hover:bg-gray-100 transition"
          >
            დღეს
          </button>
          <button 
            onClick={() => {
              const newDate = new Date(currentDate)
              newDate.setDate(currentDate.getDate() + (view === 'day' ? 1 : 7))
              setCurrentDate(newDate)
            }}
            className="px-3 py-1 border rounded hover:bg-gray-100 transition"
          >
            →
          </button>
        </div>
        
        <h2 className="text-lg font-semibold text-gray-800">
          {formatMonthYear(currentDate)}
        </h2>
        
        <div className="flex gap-2">
          <button
            onClick={() => setView('day')}
            className={`px-4 py-1 border rounded transition ${
              view === 'day' 
                ? 'bg-blue-500 text-white border-blue-500' 
                : 'hover:bg-gray-100'
            }`}
          >
            დღე
          </button>
          <button
            onClick={() => setView('week')}
            className={`px-4 py-1 border rounded transition ${
              view === 'week' 
                ? 'bg-blue-500 text-white border-blue-500' 
                : 'hover:bg-gray-100'
            }`}
          >
            კვირა
          </button>
        </div>
      </div>
      
      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border p-3 bg-gray-50 sticky left-0 z-10 w-32 text-left font-semibold">
                ოთახები
              </th>
              {dates.map((date, i) => (
                <th key={i} className="border p-3 bg-gray-50 min-w-[140px] text-center">
                  <div className="font-semibold">{formatDate(date)}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {date.toLocaleDateString('ka-GE', { day: 'numeric' })}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rooms.slice(0, 15).map(room => (
              <tr key={room.id} className="hover:bg-gray-50">
                <td className="border p-3 bg-gray-50 sticky left-0 z-10 font-medium">
                  <div className="font-semibold">Room {room.roomNumber}</div>
                  <div className="text-xs text-gray-500 mt-1">{room.roomType || 'Standard'}</div>
                  {/* <div className="text-xs text-gray-400 mt-1">₾{room.basePrice}/ღამე</div> */}
                </td>
                {dates.map((date, dateIndex) => {
                  const reservation = getReservation(room.id, date)
                  const isToday = date.toDateString() === new Date().toDateString()
                  
                  return (
                    <td 
                      key={dateIndex} 
                      className={`border p-2 cursor-pointer transition ${
                        reservation 
                          ? 'bg-red-50 hover:bg-red-100' 
                          : 'bg-white hover:bg-blue-50'
                      } ${isToday ? 'border-blue-300 border-2' : ''}`}
                      onClick={() => !reservation && onSlotSelect && onSlotSelect(room.id, date)}
                    >
                      {reservation ? (
                        <div className="text-xs">
                          <div className="font-semibold text-red-800">{reservation.guestName}</div>
                          <div className="text-gray-600 mt-1">
                            {reservation.status === 'CONFIRMED' ? '✓' : '⏱'} {reservation.status}
                          </div>
                          <div className="text-gray-500 mt-1">
                            {new Date(reservation.checkIn).toLocaleDateString('ka-GE', { day: 'numeric', month: 'short' })} - 
                            {new Date(reservation.checkOut).toLocaleDateString('ka-GE', { day: 'numeric', month: 'short' })}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400 text-center py-2">
                          <div className="text-green-600 font-medium">Available</div>
                          <div className="text-gray-400 mt-1">დააკლიკეთ დასაჯავშნად</div>
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Legend */}
      <div className="p-4 border-t bg-gray-50 flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-50 border border-red-200 rounded"></div>
          <span>დაკავებული</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-white border border-gray-300 rounded"></div>
          <span>თავისუფალი</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-300 rounded"></div>
          <span>დღეს</span>
        </div>
      </div>
    </div>
  )
}




