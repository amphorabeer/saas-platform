'use client'

import { useState, useCallback, useMemo } from 'react'
import { Calendar, momentLocalizer, View, SlotInfo } from 'react-big-calendar'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import moment from 'moment'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import ContextMenu from './ContextMenu'
import EditReservationModal from './EditReservationModal'
import ChangeRoomModal from './ChangeRoomModal'

moment.locale('ka')
const localizer = momentLocalizer(moment)
const DnDCalendar = withDragAndDrop(Calendar)

interface Reservation {
  id: string
  guestName: string
  roomNumber?: string
  roomId: string
  checkIn: string
  checkOut: string
  status: string
  totalAmount: number
}

interface Room {
  id: string
  roomNumber: string
  floor: number
  status: string
  basePrice: number
  roomType?: string
}

interface CalendarViewProps {
  rooms: Room[]
  reservations: Reservation[]
  onNewReservation?: (roomId: string, slotInfo: SlotInfo) => void
  onReservationMove?: (event: any, resourceId: string, dates: { start: Date; end: Date }) => void
  onReservationUpdate?: (id: string, updates: any) => Promise<void>
  onReservationDelete?: (id: string) => Promise<void>
}

export default function CalendarView({ 
  rooms, 
  reservations, 
  onNewReservation,
  onReservationMove,
  onReservationUpdate,
  onReservationDelete
}: CalendarViewProps) {
  const [view, setView] = useState<View>('day')
  const [date, setDate] = useState(new Date())
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; reservation: Reservation } | null>(null)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showChangeRoomModal, setShowChangeRoomModal] = useState(false)

  // Transform reservations to calendar events
  const events = useMemo(() => {
    return reservations.map((res: Reservation) => ({
      id: res.id,
      title: res.guestName,
      start: new Date(res.checkIn),
      end: new Date(res.checkOut),
      resourceId: res.roomId, // Important for resource view
      resource: res
    }))
  }, [reservations])

  // Define rooms as resources
  const resources = useMemo(() => {
    return rooms.slice(0, 15).map((room: Room) => ({
      id: room.id,
      title: `Room ${room.roomNumber}`,
      roomType: room.roomType || 'Standard',
      basePrice: room.basePrice
    }))
  }, [rooms])

  // Handle right-click on event
  const handleEventRightClick = useCallback((event: any, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setSelectedReservation(event.resource)
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      reservation: event.resource
    })
  }, [])

  // Context menu handlers
  const handleEdit = () => {
    setShowEditModal(true)
    setContextMenu(null)
  }

  const handleChangeRoom = () => {
    setShowChangeRoomModal(true)
    setContextMenu(null)
  }

  const handleCheckIn = async () => {
    if (selectedReservation && onReservationUpdate) {
      try {
        await onReservationUpdate(selectedReservation.id, { 
          status: 'CHECKED_IN',
          actualCheckIn: new Date().toISOString()
        })
        
        // Update room status to OCCUPIED
        await fetch('/api/hotel/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId: selectedReservation.roomId,
            status: 'OCCUPIED'
          })
        })
        
        alert('Check In წარმატებით დასრულდა!')
      } catch (error) {
        console.error('Failed to check in:', error)
        alert('შეცდომა Check In-ისას')
      }
    }
    setContextMenu(null)
    setSelectedReservation(null)
  }

  const handleCheckOut = async () => {
    if (selectedReservation && onReservationUpdate) {
      try {
        await onReservationUpdate(selectedReservation.id, { 
          status: 'CHECKED_OUT',
          actualCheckOut: new Date().toISOString()
        })
        
        // Update room status to VACANT
        await fetch('/api/hotel/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId: selectedReservation.roomId,
            status: 'VACANT'
          })
        })
        
        alert('Check Out წარმატებით დასრულდა!')
      } catch (error) {
        console.error('Failed to check out:', error)
        alert('შეცდომა Check Out-ისას')
      }
    }
    setContextMenu(null)
    setSelectedReservation(null)
  }

  const handleCancel = async () => {
    if (!selectedReservation) return
    
    if (confirm('ნამდვილად გსურთ ჯავშნის გაუქმება?')) {
      if (onReservationUpdate) {
        try {
          await onReservationUpdate(selectedReservation.id, { 
            status: 'CANCELLED',
            cancelledAt: new Date().toISOString()
          })
          
          // Update room status to VACANT
          await fetch('/api/hotel/rooms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              roomId: selectedReservation.roomId,
              status: 'VACANT'
            })
          })
          
          alert('ჯავშანი გაუქმებულია!')
        } catch (error) {
          console.error('Failed to cancel reservation:', error)
          alert('შეცდომა ჯავშნის გაუქმებისას')
        }
      }
    }
    setContextMenu(null)
    setSelectedReservation(null)
  }

  // Event style getter
  const eventStyleGetter = useCallback((event: any) => {
    let backgroundColor = '#3b82f6'
    const status = event.resource?.status
    
    if (status === 'CONFIRMED') {
      backgroundColor = '#10b981' // green
    } else if (status === 'CHECKED_IN') {
      backgroundColor = '#3b82f6' // blue
    } else if (status === 'CHECKED_OUT') {
      backgroundColor = '#6b7280' // gray
    } else if (status === 'CANCELLED') {
      backgroundColor = '#ef4444' // red
    } else if (status === 'PENDING') {
      backgroundColor = '#f59e0b' // yellow
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '6px',
        opacity: 0.9,
        color: 'white',
        border: 'none',
        fontSize: '11px',
        padding: '2px 4px',
        cursor: 'context-menu'
      }
    }
  }, [])

  // Handle drag and drop
  const moveEvent = useCallback(({ event, start, end, resourceId }: any) => {
    if (onReservationMove) {
      onReservationMove(event, resourceId, { start, end })
    }
  }, [onReservationMove])

  // Handle slot selection (create new reservation)
  const handleSelectSlot = useCallback((slotInfo: SlotInfo) => {
    if (onNewReservation) {
      const roomId = (slotInfo as any).resourceId || rooms[0]?.id
      onNewReservation(roomId, slotInfo)
    }
  }, [onNewReservation, rooms])

  // Custom toolbar with view toggle
  const CustomToolbar = (toolbar: any) => {
    return (
      <div className="flex justify-between items-center p-4 bg-gray-50 border-b">
        <div className="flex gap-2">
          <button 
            onClick={() => toolbar.onNavigate('PREV')}
            className="px-3 py-1 border rounded hover:bg-white transition"
          >
            ← წინა
          </button>
          <button 
            onClick={() => toolbar.onNavigate('TODAY')}
            className="px-3 py-1 border rounded bg-blue-500 text-white hover:bg-blue-600 transition"
          >
            დღეს
          </button>
          <button 
            onClick={() => toolbar.onNavigate('NEXT')}
            className="px-3 py-1 border rounded hover:bg-white transition"
          >
            შემდეგი →
          </button>
        </div>
        
        <h2 className="text-lg font-bold text-gray-800">
          {toolbar.label}
        </h2>
        
        <div className="flex gap-2">
          <button
            onClick={() => toolbar.onView('month')}
            className={`px-3 py-1 border rounded transition ${
              toolbar.view === 'month' 
                ? 'bg-blue-500 text-white border-blue-500' 
                : 'hover:bg-white'
            }`}
          >
            თვე
          </button>
          <button
            onClick={() => toolbar.onView('week')}
            className={`px-3 py-1 border rounded transition ${
              toolbar.view === 'week' 
                ? 'bg-blue-500 text-white border-blue-500' 
                : 'hover:bg-white'
            }`}
          >
            კვირა
          </button>
          <button
            onClick={() => toolbar.onView('day')}
            className={`px-3 py-1 border rounded transition ${
              toolbar.view === 'day' 
                ? 'bg-blue-500 text-white border-blue-500' 
                : 'hover:bg-white'
            }`}
          >
            დღე (ოთახებით)
          </button>
        </div>
      </div>
    )
  }

  // Custom event component with right-click
  const EventComponent = useCallback(({ event }: { event: any }) => {
    return (
      <div
        onContextMenu={(e) => {
          e.preventDefault()
          e.stopPropagation()
          handleEventRightClick(event, e)
        }}
        className="h-full w-full"
      >
        <div className="font-semibold text-xs truncate">{event.resource?.guestName}</div>
        <div className="text-xs opacity-90 truncate">Room {event.resource?.roomNumber || '-'}</div>
        <div className="text-xs mt-0.5">
          {event.resource?.status === 'CHECKED_IN' && '✓ IN'}
          {event.resource?.status === 'CONFIRMED' && '📅'}
          {event.resource?.status === 'CANCELLED' && '❌'}
          {event.resource?.status === 'CHECKED_OUT' && '🚪 OUT'}
        </div>
      </div>
    )
  }, [handleEventRightClick])

  const components = useMemo(() => ({
    toolbar: CustomToolbar,
    event: EventComponent,
    resourceHeader: ({ resource }: any) => (
      <div className="text-center p-2 border-b bg-gray-50">
        <div className="font-medium text-sm">{resource.title}</div>
        <div className="text-xs text-gray-500">{resource.roomType}</div>
        <div className="text-xs text-gray-600">₾{resource.basePrice}</div>
      </div>
    )
  }), [EventComponent])

  return (
    <div className="h-full bg-white rounded-lg shadow relative">
      {/* Info bar */}
      <div className="p-2 bg-blue-50 text-sm text-center border-b">
        {view === 'day' ? '💡 დღის ხედი - ოთახები სვეტებში (მარჯვენა კლიკი მენიუსთვის)' : 
         view === 'week' ? '💡 კვირის ხედი - ყველა ჯავშანი' :
         '💡 თვის ხედი - თვიური მიმოხილვა'}
      </div>
      
      <DnDCalendar
        localizer={localizer}
        events={events}
        view={view}
        date={date}
        onView={(newView) => setView(newView)}
        onNavigate={(newDate) => setDate(newDate)}
        onEventDrop={moveEvent}
        onEventResize={moveEvent}
        onSelectSlot={handleSelectSlot}
        onSelectEvent={(event: any) => setSelectedReservation(event.resource)}
        eventPropGetter={eventStyleGetter}
        components={components}
        selectable
        resizable
        style={{ height: 'calc(100vh - 400px)' }}
        step={30}
        defaultView="day"
        views={['month', 'week', 'day']}
        
        // Resource view configuration - only for day view
        resources={view === 'day' ? resources : undefined}
        resourceIdAccessor={(resource: any) => resource.id}
        resourceTitleAccessor={(resource: any) => resource.title}
        
        messages={{
          today: 'დღეს',
          previous: 'წინა',
          next: 'შემდეგი',
          month: 'თვე',
          week: 'კვირა',
          day: 'დღე',
          agenda: 'განრიგი',
          date: 'თარიღი',
          time: 'დრო',
          event: 'ჯავშანი',
          noEventsInRange: 'ამ პერიოდში ჯავშნები არ არის'
        }}
      />
      
      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          reservation={contextMenu.reservation}
          onClose={() => {
            setContextMenu(null)
            setSelectedReservation(null)
          }}
          onEdit={handleEdit}
          onChangeRoom={handleChangeRoom}
          onCheckIn={handleCheckIn}
          onCheckOut={handleCheckOut}
          onCancel={handleCancel}
        />
      )}
      
      {/* Edit Modal */}
      {showEditModal && selectedReservation && (
        <EditReservationModal
          reservation={selectedReservation}
          rooms={rooms}
          onClose={() => {
            setShowEditModal(false)
            setSelectedReservation(null)
          }}
          onSave={async (updates: any) => {
            if (onReservationUpdate) {
              await onReservationUpdate(selectedReservation.id, updates)
              setShowEditModal(false)
              setSelectedReservation(null)
              alert('ჯავშანი განახლდა!')
            }
          }}
          onDelete={async (id: string) => {
            if (onReservationDelete) {
              await onReservationDelete(id)
              setShowEditModal(false)
              setSelectedReservation(null)
              alert('ჯავშანი წაიშალა!')
            }
          }}
        />
      )}
      
      {/* Change Room Modal */}
      {showChangeRoomModal && selectedReservation && (
        <ChangeRoomModal
          reservation={selectedReservation}
          rooms={rooms}
          onClose={() => {
            setShowChangeRoomModal(false)
            setSelectedReservation(null)
          }}
          onSave={async (newRoomId: string, newRoomNumber: string) => {
            if (onReservationUpdate) {
              // Free old room
              await fetch('/api/hotel/rooms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  roomId: selectedReservation.roomId,
                  status: 'VACANT'
                })
              })
              
              // Occupy new room
              await fetch('/api/hotel/rooms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  roomId: newRoomId,
                  status: 'OCCUPIED'
                })
              })
              
              await onReservationUpdate(selectedReservation.id, { 
                roomId: newRoomId,
                roomNumber: newRoomNumber
              })
              
              setShowChangeRoomModal(false)
              setSelectedReservation(null)
              alert('ოთახი შეიცვალა!')
            }
          }}
        />
      )}
    </div>
  )
}
