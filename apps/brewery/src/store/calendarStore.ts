import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CalendarEvent, EventType, EventStatus } from './types'
import { calendarEvents as initialEvents } from '@/data/centralData'

// =====================================================
// Calendar Store Interface
// =====================================================

interface CalendarStore {
  // === STATE ===
  events: CalendarEvent[]
  
  // === CRUD ===
  addEvent: (event: Omit<CalendarEvent, 'id'>) => string
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => void
  deleteEvent: (id: string) => void
  
  // === BATCH INTEGRATION ===
  addBatchEvents: (events: CalendarEvent[]) => void
  removeBatchEvents: (batchId: string) => void
  updateBatchEventStatus: (batchId: string, status: EventStatus) => void
  
  // === SELECTORS ===
  getEventById: (id: string) => CalendarEvent | undefined
  getEventsByDate: (date: Date) => CalendarEvent[]
  getEventsByDateRange: (start: Date, end: Date) => CalendarEvent[]
  getEventsByType: (type: EventType) => CalendarEvent[]
  getEventsByTank: (tankId: string) => CalendarEvent[]
  getEventsByBatch: (batchId: string) => CalendarEvent[]
  getUpcomingEvents: (days?: number) => CalendarEvent[]
  
  // === STATUS ===
  startEvent: (id: string) => void
  completeEvent: (id: string) => void
  cancelEvent: (id: string) => void
}

// =====================================================
// Helper Functions
// =====================================================

const generateEventId = (): string => {
  return `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

const isDateInRange = (date: Date, start: Date, end: Date): boolean => {
  const d = new Date(date).setHours(0, 0, 0, 0)
  const s = new Date(start).setHours(0, 0, 0, 0)
  const e = new Date(end).setHours(23, 59, 59, 999)
  return d >= s && d <= e
}

// =====================================================
// Transform initial events
// =====================================================

const transformInitialEvents = (): CalendarEvent[] => {
  return initialEvents.map(e => ({
    id: e.id,
    type: e.type as EventType,
    title: e.title,
    description: e.notes,
    startDate: e.startDate,
    endDate: e.endDate,
    status: e.status as EventStatus,
    batchId: e.batchId,
    tankId: e.tankId,
    color: getEventColor(e.type as EventType),
  }))
}

const getEventColor = (type: EventType): string => {
  const colors: Record<EventType, string> = {
    brew_day: '#B87333',      // Copper
    fermentation: '#8B5CF6',  // Purple
    packaging: '#10B981',     // Green
    delivery: '#3B82F6',      // Blue
    maintenance: '#F59E0B',   // Amber
    other: '#6B7280',         // Gray
  }
  return colors[type] || colors.other
}

// =====================================================
// Store Implementation
// =====================================================

export const useCalendarStore = create<CalendarStore>()(
  persist(
    (set, get) => ({
      // === INITIAL STATE ===
      events: transformInitialEvents(),
      
      // === CRUD ===
      addEvent: (eventData) => {
        const id = generateEventId()
        const newEvent: CalendarEvent = {
          ...eventData,
          id,
          color: eventData.color || getEventColor(eventData.type),
        }
        
        set(state => ({
          events: [...state.events, newEvent]
        }))
        
        return id
      },
      
      updateEvent: (id, updates) => {
        set(state => ({
          events: state.events.map(e =>
            e.id === id ? { ...e, ...updates } : e
          )
        }))
      },
      
      deleteEvent: (id) => {
        set(state => ({
          events: state.events.filter(e => e.id !== id)
        }))
      },
      
      // === BATCH INTEGRATION ===
      addBatchEvents: (events) => {
        set(state => ({
          events: [
            ...state.events.filter(e => !events.find(ne => ne.id === e.id)),
            ...events,
          ]
        }))
      },
      
      removeBatchEvents: (batchId) => {
        set(state => ({
          events: state.events.filter(e => e.batchId !== batchId)
        }))
      },
      
      updateBatchEventStatus: (batchId, status) => {
        set(state => ({
          events: state.events.map(e =>
            e.batchId === batchId ? { ...e, status } : e
          )
        }))
      },
      
      // === SELECTORS ===
      getEventById: (id) => {
        return get().events.find(e => e.id === id)
      },
      
      getEventsByDate: (date) => {
        return get().events.filter(e => {
          const eventStart = new Date(e.startDate)
          const eventEnd = new Date(e.endDate)
          return isDateInRange(date, eventStart, eventEnd) || isSameDay(eventStart, date)
        })
      },
      
      getEventsByDateRange: (start, end) => {
        return get().events.filter(e => {
          const eventStart = new Date(e.startDate)
          const eventEnd = new Date(e.endDate)
          return (
            isDateInRange(eventStart, start, end) ||
            isDateInRange(eventEnd, start, end) ||
            (eventStart <= start && eventEnd >= end)
          )
        })
      },
      
      getEventsByType: (type) => {
        return get().events.filter(e => e.type === type)
      },
      
      getEventsByTank: (tankId) => {
        return get().events.filter(e => e.tankId === tankId)
      },
      
      getEventsByBatch: (batchId) => {
        return get().events.filter(e => e.batchId === batchId)
      },
      
      getUpcomingEvents: (days = 7) => {
        const now = new Date()
        const future = new Date()
        future.setDate(future.getDate() + days)
        
        return get().events
          .filter(e => {
            const eventDate = new Date(e.startDate)
            return eventDate >= now && eventDate <= future && e.status !== 'cancelled'
          })
          .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      },
      
      // === STATUS ===
      startEvent: (id) => {
        set(state => ({
          events: state.events.map(e =>
            e.id === id ? { ...e, status: 'in_progress' as EventStatus } : e
          )
        }))
      },
      
      completeEvent: (id) => {
        set(state => ({
          events: state.events.map(e =>
            e.id === id ? { ...e, status: 'completed' as EventStatus } : e
          )
        }))
      },
      
      cancelEvent: (id) => {
        set(state => ({
          events: state.events.map(e =>
            e.id === id ? { ...e, status: 'cancelled' as EventStatus } : e
          )
        }))
      },
    }),
    {
      name: 'calendar-storage',
      partialize: (state) => ({
        events: state.events,
      }),
    }
  )
)

// =====================================================
// Event Type Helpers
// =====================================================

export const EVENT_TYPE_CONFIG: Record<EventType, { label: string; icon: string; color: string }> = {
  brew_day: { label: 'ხარშვის დღე', icon: '🍺', color: '#B87333' },
  fermentation: { label: 'ფერმენტაცია', icon: '🧪', color: '#8B5CF6' },
  packaging: { label: 'შეფუთვა', icon: '📦', color: '#10B981' },
  delivery: { label: 'მიწოდება', icon: '🚚', color: '#3B82F6' },
  maintenance: { label: 'მოვლა', icon: '🔧', color: '#F59E0B' },
  other: { label: 'სხვა', icon: '📅', color: '#6B7280' },
}

export const EVENT_STATUS_CONFIG: Record<EventStatus, { label: string; color: string }> = {
  scheduled: { label: 'დაგეგმილი', color: 'text-blue-400' },
  in_progress: { label: 'მიმდინარე', color: 'text-amber-400' },
  completed: { label: 'დასრულებული', color: 'text-green-400' },
  cancelled: { label: 'გაუქმებული', color: 'text-red-400' },
}
