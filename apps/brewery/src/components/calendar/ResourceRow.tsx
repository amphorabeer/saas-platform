'use client'

import { TimelineBar } from './TimelineBar'
// BrewDayBadge removed - now using TimelineBar for all resource types
import { CalendarEvent, Resource } from './ResourceTimeline'

interface ResourceRowProps {
  resource: Resource
  weekDays: Date[]  // ✅ NEW: Pass weekDays directly instead of weekStart
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
  onCellClick?: (date: Date, resourceId: string) => void
  onCellDoubleClick?: (date: Date, resourceId: string) => void
  onResourceClick?: (resource: Resource, clickSource?: 'cip-badge' | 'tank') => void  // ✅ NEW
}

const isToday = (date: Date): boolean => {
  const today = new Date()
  return date.getFullYear() === today.getFullYear() &&
         date.getMonth() === today.getMonth() &&
         date.getDate() === today.getDate()
}

// ✅ FIXED: Find day index by comparing calendar dates directly
const findDayIndex = (eventDate: Date, weekDays: Date[]): number => {
  const eventYear = eventDate.getFullYear()
  const eventMonth = eventDate.getMonth()
  const eventDay = eventDate.getDate()
  
  // First try exact match in weekDays array
  for (let i = 0; i < weekDays.length; i++) {
    const day = weekDays[i]
    if (day.getFullYear() === eventYear &&
        day.getMonth() === eventMonth &&
        day.getDate() === eventDay) {
      return i
    }
  }
  
  // If not in week, calculate offset using UTC
  const weekStartUTC = Date.UTC(weekDays[0].getFullYear(), weekDays[0].getMonth(), weekDays[0].getDate())
  const eventUTC = Date.UTC(eventYear, eventMonth, eventDay)
  const diffDays = Math.round((eventUTC - weekStartUTC) / (24 * 60 * 60 * 1000))
  
  return diffDays
}

export function ResourceRow({
  resource,
  weekDays,
  events,
  onEventClick,
  onCellClick,
  onCellDoubleClick,
  onResourceClick,  // ✅ NEW
}: ResourceRowProps) {

  const getEventPosition = (event: CalendarEvent): { startDay: number; endDay: number } | null => {
    // ✅ Extract dates and normalize to calendar day (ignore time component)
    const eventStart = event.startDate instanceof Date ? event.startDate : new Date(event.startDate)
    const eventEnd = event.endDate instanceof Date ? event.endDate : new Date(event.endDate)
    
    // ✅ Create new Date objects with just the calendar date components (normalize to noon to avoid DST issues)
    const eventStartDate = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate(), 12, 0, 0)
    const eventEndDate = new Date(eventEnd.getFullYear(), eventEnd.getMonth(), eventEnd.getDate(), 12, 0, 0)
    
    // Week boundaries
    const weekStart = weekDays[0]
    const weekEnd = weekDays[6]
    
    // Use UTC for comparison to avoid timezone issues
    const eventStartUTC = Date.UTC(eventStartDate.getFullYear(), eventStartDate.getMonth(), eventStartDate.getDate())
    const eventEndUTC = Date.UTC(eventEndDate.getFullYear(), eventEndDate.getMonth(), eventEndDate.getDate())
    const weekStartUTC = Date.UTC(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate())
    const weekEndUTC = Date.UTC(weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate())
    
    // Check if event overlaps with this week
    if (eventEndUTC < weekStartUTC || eventStartUTC > weekEndUTC) return null

    const startDayIndex = findDayIndex(eventStartDate, weekDays)
    const endDayIndex = findDayIndex(eventEndDate, weekDays)
    
    const clampedStart = Math.max(0, Math.min(6, startDayIndex))
    const clampedEnd = Math.max(0, Math.min(6, endDayIndex))

    return { startDay: clampedStart, endDay: clampedEnd }
  }

  const isBrewhouse = resource.type === 'brewhouse'
  
  const visibleEvents = events.filter(event => getEventPosition(event) !== null)
  // Fixed height for alignment
  const rowHeight = 60

  return (
    <div className="flex border-b border-white/10 hover:bg-white/[0.02] transition-colors">
      {/* Resource Name - ✅ კლიკადი */}
      <div 
        className="w-[180px] flex-shrink-0 p-3 border-r border-white/10 flex items-center cursor-pointer hover:bg-white/[0.05]"
        style={{ height: '60px' }}
        onClick={() => onResourceClick?.(resource, 'tank')}
      >
        <div className="flex-1">
          <div className="font-medium text-text">{resource.name}</div>
          {resource.capacity && (
            <div className="text-xs text-text-muted">{resource.capacity}L</div>
          )}
          {resource.needsCIP && (
            <span 
              className="text-xs text-amber-400 flex items-center gap-0.5 mt-1 cursor-pointer hover:text-amber-300 transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                onResourceClick?.(resource, 'cip-badge')
              }}
            >
              ⚠️ CIP
            </span>
          )}
        </div>
      </div>

      {/* Timeline Grid - Events placed INSIDE cells for perfect alignment */}
      <div className="flex-1 relative">
        <div className="grid grid-cols-7" style={{ height: '60px' }}>
          {weekDays.map((day, dayIndex) => {
            const isWeekend = day.getDay() === 0 || day.getDay() === 6
            
            // Find events that START in this column
            const eventsStartingHere = visibleEvents.filter(event => {
              const position = getEventPosition(event)
              if (!position) return false
              const clampedStart = Math.max(0, Math.min(6, position.startDay))
              return clampedStart === dayIndex
            })
            
            return (
              <div
                key={dayIndex}
                className={`border-r border-white/10 relative cursor-pointer hover:bg-white/[0.05] transition-colors ${
                  isWeekend ? 'bg-white/[0.03]' : ''
                } ${
                  isToday(day) ? 'bg-amber-500/15 border-l-2 border-l-amber-400' : ''
                }`}
                style={{ height: '60px' }}
                onClick={(e) => {
                  // ✅ თუ click event bar/badge-ზე მოხდა, არ გააქტიუროთ cell click
                  if ((e.target as HTMLElement).closest('.event-bar, .brew-day-badge')) return
                  onCellClick?.(day, resource.id)
                }}
                onDoubleClick={() => onCellDoubleClick?.(day, resource.id)}
              >
                {/* Events that start in this cell */}
                {eventsStartingHere.map((event, eventIndex) => {
                  const position = getEventPosition(event)
                  if (!position) return null

                  const normalizedBatchStatus = String((event as any).batchStatus || event.status || 'PLANNED').toUpperCase()
                  const clampedStart = Math.max(0, Math.min(6, position.startDay))
                  const clampedEnd = Math.max(0, Math.min(6, position.endDay))
                  const spanCols = clampedEnd - clampedStart + 1

                  // ✅ UNIFIED: Use TimelineBar for ALL resource types (brewhouse, fermenter, conditioning)
                  return (
                    <div
                      key={event.id}
                      className="event-bar absolute left-0 z-20 cursor-pointer"
                      style={{
                        width: `${spanCols * 100}%`,
                        top: `${4 + eventIndex * 42}px`,
                        height: '38px',
                        pointerEvents: 'auto',
                      }}
                      onClick={(e) => {
                        e.stopPropagation() // ✅ CRITICAL: Stop bubbling to cell
                        onEventClick(event)
                      }}
                    >
                      <TimelineBar
                        event={(() => {
                          const eventObj = {
                            id: event.id,
                            type: (event as any).type || (isBrewhouse ? 'brewing' : 'fermentation'),  // ✅ Use actual event type
                            title: event.batchNumber || '',
                            batchNumber: event.batchNumber,
                            recipe: event.recipeName,
                            recipeName: event.recipeName,
                            status: 'scheduled' as const,  // ✅ TimelineBar expects 'scheduled' | 'active' | 'completed'
                            batchStatus: normalizedBatchStatus,
                            isHistorical: (event as any).isHistorical,
                            isParentHistory: (event as any).isParentHistory, // ✅ დასრულებული ფერმენტაცია
                            phase: (event as any).phase,
                          }
                          return eventObj
                        })() as any}
                        startDay={0}
                        endDay={6}
                        onClick={() => onEventClick(event)} // ✅ Pass real handler
                      />
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}