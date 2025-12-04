'use client'

import { useState } from 'react'

export default function EnhancedCalendar({ rooms, reservations, onSlotSelect }: any) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<'month' | 'week'>('week')
  
  // Get week dates
  const getWeekDates = () => {
    const dates = []
    const startOfWeek = new Date(currentDate)
    const day = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1)
    startOfWeek.setDate(diff)
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      dates.push(date)
    }
    return dates
  }
  
  const dates = getWeekDates()
  
  // Check reservation status for a room on a date
  const getReservationStatus = (roomId: string, date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    
    for (const res of reservations) {
      const checkIn = new Date(res.checkIn).toISOString().split('T')[0]
      const checkOut = new Date(res.checkOut).toISOString().split('T')[0]
      
      if (res.roomId === roomId) {
        if (dateStr === checkIn) return { type: 'check-in', reservation: res }
        if (dateStr === checkOut) return { type: 'check-out', reservation: res }
        if (dateStr > checkIn && dateStr < checkOut) return { type: 'occupied', reservation: res }
      }
    }
    return null
  }
  
  return (
    <div className="bg-white rounded-lg shadow">
      {/* Calendar Header */}
      <div className="p-4 border-b flex justify-between items-center bg-gray-50">
        <div className="flex gap-2">
          <button 
            onClick={() => {
              const newDate = new Date(currentDate)
              newDate.setDate(currentDate.getDate() - 7)
              setCurrentDate(newDate)
            }}
            className="px-3 py-1 border rounded hover:bg-white transition"
          >
            ← წინა კვირა
          </button>
          <button 
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1 border rounded bg-blue-500 text-white hover:bg-blue-600 transition"
          >
            დღეს
          </button>
          <button 
            onClick={() => {
              const newDate = new Date(currentDate)
              newDate.setDate(currentDate.getDate() + 7)
              setCurrentDate(newDate)
            }}
            className="px-3 py-1 border rounded hover:bg-white transition"
          >
            შემდეგი კვირა →
          </button>
        </div>
        
        <h2 className="text-lg font-bold text-gray-800">
          {currentDate.toLocaleDateString('ka-GE', { year: 'numeric', month: 'long' })}
        </h2>
      </div>
      
      {/* Legend */}
      <div className="p-2 bg-gray-100 flex gap-4 text-sm border-b">
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 bg-green-500 rounded"></span> Check In
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 bg-red-500 rounded"></span> Check Out
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 bg-blue-500 rounded"></span> Occupied
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 bg-white border rounded"></span> Available
        </span>
      </div>
      
      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="border p-2 sticky left-0 bg-gray-50 z-10 text-left font-semibold min-w-[120px]">
                ოთახები
              </th>
              {dates.map((date, i) => (
                <th key={i} className="border p-2 min-w-[100px] text-center">
                  <div className="text-sm font-normal text-gray-500">
                    {date.toLocaleDateString('ka-GE', { weekday: 'short' })}
                  </div>
                  <div className="text-lg font-bold">
                    {date.getDate()}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rooms.slice(0, 15).map((room: any) => (
              <tr key={room.id} className="hover:bg-gray-50">
                <td className="border p-2 bg-gray-50 sticky left-0 z-10">
                  <div className="font-medium">Room {room.roomNumber}</div>
                  <div className="text-xs text-gray-500">{room.roomType || 'Standard'}</div>
                </td>
                {dates.map((date, i) => {
                  const status = getReservationStatus(room.id, date)
                  const isToday = date.toDateString() === new Date().toDateString()
                  
                  return (
                    <td 
                      key={i}
                      onClick={() => !status && onSlotSelect && onSlotSelect(room.id, date)}
                      className={`border p-1 cursor-pointer transition ${
                        status?.type === 'check-in' ? 'bg-green-100 hover:bg-green-200' :
                        status?.type === 'check-out' ? 'bg-red-100 hover:bg-red-200' :
                        status?.type === 'occupied' ? 'bg-blue-100 hover:bg-blue-200' :
                        'bg-white hover:bg-gray-100'
                      } ${isToday ? 'border-2 border-blue-400' : ''}`}
                    >
                      {status ? (
                        <div className="text-xs">
                          {status.type === 'check-in' && (
                            <div className="bg-green-500 text-white rounded px-1 py-0.5 text-center font-medium">
                              → IN: {status.reservation.guestName}
                            </div>
                          )}
                          {status.type === 'check-out' && (
                            <div className="bg-red-500 text-white rounded px-1 py-0.5 text-center font-medium">
                              ← OUT: {status.reservation.guestName}
                            </div>
                          )}
                          {status.type === 'occupied' && (
                            <div className="text-center text-blue-700 font-medium">
                              {status.reservation.guestName}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400 text-center py-2">
                          -
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
    </div>
  )
}




