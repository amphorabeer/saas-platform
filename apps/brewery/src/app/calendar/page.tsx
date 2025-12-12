'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import { Button } from '@/components/ui'
import { TankTimeline, AddEventModal, EventDetailModal, UpcomingEvents } from '@/components/calendar'
import { formatDate } from '@/lib/utils'
import { 
  tanks as centralTanks, 
  calendarEvents as centralEvents,
} from '@/data/centralData'

interface Tank {
  id: string
  name: string
  type: 'fermenter' | 'brite' | 'kettle'
  capacity: number
  currentTemp?: number
  status: 'available' | 'in_use' | 'cleaning' | 'maintenance'
}

// Transform central data with proper typing
const mockTanks: Tank[] = centralTanks
  .filter(t => ['fermenter', 'brite', 'kettle'].includes(t.type))
  .map(t => ({
    id: t.id,
    name: t.name,
    type: t.type as 'fermenter' | 'brite' | 'kettle',
    capacity: t.capacity,
    currentTemp: t.currentTemp,
    status: t.status,
  }))
const mockCalendarEvents = centralEvents

interface CalendarEvent {
  id: string
  type: 'brewing' | 'fermentation' | 'conditioning' | 'packaging' | 'maintenance'
  title: string
  batchId?: string
  batchNumber?: string
  recipe?: string
  tankId: string
  tankName: string
  startDate: Date
  endDate: Date
  status: 'scheduled' | 'active' | 'completed'
  progress?: number
  temperature?: number
  notes?: string
}



const getWeekStart = (date: Date): Date => {

  const d = new Date(date)

  const day = d.getDay()

  const diff = d.getDate() - day + (day === 0 ? -6 : 1)  // Monday = 1

  d.setDate(diff)

  d.setHours(0, 0, 0, 0)

  return d

}



const getWeekEnd = (weekStart: Date): Date => {

  const weekEnd = new Date(weekStart)

  weekEnd.setDate(weekStart.getDate() + 6)

  return weekEnd

}



const formatWeekRange = (weekStart: Date): string => {

  const weekEnd = getWeekEnd(weekStart)

  return `${formatDate(weekStart)} - ${formatDate(weekEnd)}`

}



export default function CalendarPage() {

  const [weekStart, setWeekStart] = useState(getWeekStart(new Date()))

  const [showAddModal, setShowAddModal] = useState(false)

  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)

  const [showEventModal, setShowEventModal] = useState(false)

  const [events, setEvents] = useState<CalendarEvent[]>(mockCalendarEvents as CalendarEvent[])

  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const [selectedTankId, setSelectedTankId] = useState<string | null>(null)



  const goToPreviousWeek = () => {

    const newWeekStart = new Date(weekStart)

    newWeekStart.setDate(weekStart.getDate() - 7)

    setWeekStart(newWeekStart)

  }



  const goToNextWeek = () => {

    const newWeekStart = new Date(weekStart)

    newWeekStart.setDate(weekStart.getDate() + 7)

    setWeekStart(newWeekStart)

  }



  const goToToday = () => {

    setWeekStart(getWeekStart(new Date()))

  }



  const handleEventClick = (event: CalendarEvent) => {

    setSelectedEvent(event)

    setShowEventModal(true)

  }



  const handleCellClick = (date: Date, tankId: string) => {

    setSelectedDate(date)

    setSelectedTankId(tankId)

    setShowAddModal(true)

  }



  const handleAddEvent = (eventData: any) => {

    const newEvent: CalendarEvent = {

      id: `event-${Date.now()}`,

      type: eventData.type,

      title: eventData.type === 'brewing' ? 'ხარშვა' : eventData.type === 'fermentation' ? 'ფერმენტაცია' : eventData.type === 'conditioning' ? 'კონდიციონირება' : 'მოვლა',

      batchId: eventData.batchId,

      batchNumber: eventData.batchId ? `BRW-2024-${String(Math.floor(Math.random() * 1000)).padStart(4, '0')}` : undefined,

      recipe: eventData.recipe,

      tankId: eventData.tankId,

      tankName: mockTanks.find(t => t.id === eventData.tankId)?.name || '',

      startDate: eventData.startDate,

      endDate: eventData.endDate || eventData.startDate,

      status: 'scheduled',

      notes: eventData.notes,

    }

    setEvents([...events, newEvent])

  }



  const handleDeleteEvent = () => {

    if (selectedEvent) {

      setEvents(events.filter(e => e.id !== selectedEvent.id))

      setShowEventModal(false)

      setSelectedEvent(null)

    }

  }



  return (

    <DashboardLayout title="📅 წარმოების კალენდარი" breadcrumb="მთავარი / კალენდარი">

      {/* Header Controls */}

      <div className="flex justify-between items-center mb-6">

        <div className="flex items-center gap-4">

          <button

            onClick={goToPreviousWeek}

            className="p-2 rounded-lg bg-bg-card border border-border hover:bg-bg-tertiary transition-colors"

          >

            ◀

          </button>

          <div className="text-lg font-semibold text-text-primary min-w-[200px] text-center">

            {formatWeekRange(weekStart)}

          </div>

          <button

            onClick={goToNextWeek}

            className="p-2 rounded-lg bg-bg-card border border-border hover:bg-bg-tertiary transition-colors"

          >

            ▶

          </button>

          <Button onClick={goToToday} variant="secondary" size="sm">

            დღეს

          </Button>

        </div>

        <Button onClick={() => setShowAddModal(true)} variant="primary" size="sm">

          + ივენთი

        </Button>

      </div>



      {/* Main Content Grid */}

      <div className="grid grid-cols-4 gap-6">

        {/* Timeline - 3 columns */}

        <div className="col-span-3">

          <TankTimeline

            weekStart={weekStart}

            tanks={mockTanks as Tank[]}

            events={events}

            onEventClick={handleEventClick}

            onAddEvent={() => setShowAddModal(true)}

            onCellClick={handleCellClick}

          />

        </div>



        {/* Upcoming Events - 1 column */}

        <div className="col-span-1">

          <UpcomingEvents events={events} onEventClick={handleEventClick} />

        </div>

      </div>



      {/* Modals */}

      <AddEventModal

        isOpen={showAddModal}

        onClose={() => {

          setShowAddModal(false)

          setSelectedDate(null)

          setSelectedTankId(null)

        }}

        onAdd={handleAddEvent}

        tanks={mockTanks}

        defaultDate={selectedDate || undefined}

        defaultTankId={selectedTankId || undefined}

      />



      <EventDetailModal

        event={selectedEvent}

        isOpen={showEventModal}

        onClose={() => {

          setShowEventModal(false)

          setSelectedEvent(null)

        }}

        onDelete={handleDeleteEvent}

      />

    </DashboardLayout>

  )

}
