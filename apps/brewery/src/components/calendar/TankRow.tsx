'use client'



import { TankInfo } from './TankInfo'

import { TimelineBar } from './TimelineBar'

import { BrewDayBadge } from './BrewDayBadge'



interface Tank {

  id: string

  name: string

  type: 'fermenter' | 'brite' | 'kettle'

  capacity: number

  currentTemp?: number

  status: 'available' | 'in_use' | 'cleaning' | 'maintenance'

}



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



interface TankRowProps {

  tank: Tank

  events: CalendarEvent[]

  weekStart: Date

  onEventClick: (event: CalendarEvent) => void

  onCellClick?: (date: Date, tankId: string) => void

}



const getDayOfWeek = (date: Date): number => {

  const day = date.getDay()

  return day === 0 ? 6 : day - 1  // Monday = 0, Sunday = 6

}



// აბრუნებს 0-6 (ორშ-კვი) ან -1 თუ კვირის გარეთაა

const getWeekDay = (date: Date, weekStart: Date): number => {

  const diffTime = date.getTime() - weekStart.getTime()

  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  return diffDays

}



const isSameDay = (date1: Date, date2: Date): boolean => {

  return date1.getFullYear() === date2.getFullYear() &&

         date1.getMonth() === date2.getMonth() &&

         date1.getDate() === date2.getDate()

}



const isToday = (date: Date): boolean => {

  return isSameDay(date, new Date())

}



const getWeekDays = (weekStart: Date): Date[] => {

  const days: Date[] = []

  for (let i = 0; i < 7; i++) {

    const date = new Date(weekStart)

    date.setDate(weekStart.getDate() + i)

    days.push(date)

  }

  return days

}



export function TankRow({ tank, events, weekStart, onEventClick, onCellClick }: TankRowProps) {

  const weekDays = getWeekDays(weekStart)

  const tankEvents = events.filter(e => e.tankId === tank.id)

  

  const getEventPosition = (event: CalendarEvent): { startDay: number; endDay: number } | null => {

    const eventStart = new Date(event.startDate)

    eventStart.setHours(0, 0, 0, 0)

    const eventEnd = new Date(event.endDate)

    eventEnd.setHours(23, 59, 59, 999)

    const weekEnd = new Date(weekStart)

    weekEnd.setDate(weekStart.getDate() + 6)

    weekEnd.setHours(23, 59, 59, 999)

    

    // Event is outside this week

    if (eventEnd < weekStart || eventStart > weekEnd) return null

    

    const startDayIndex = getWeekDay(eventStart, weekStart)

    const endDayIndex = getWeekDay(eventEnd, weekStart)

    

    // Clamp to week bounds (0-6)

    const clampedStart = Math.max(0, Math.min(6, startDayIndex))

    const clampedEnd = Math.max(0, Math.min(6, endDayIndex))

    

    return { startDay: clampedStart, endDay: clampedEnd }

  }

  

  // For kettle, show badges instead of bars

  if (tank.type === 'kettle') {

    return (

      <div className="flex border-b border-border">

        <TankInfo tank={tank} />

        <div className="flex-1 grid grid-cols-7 relative">

          {weekDays.map((day, dayIndex) => {

            const dayEvents = tankEvents.filter(e => isSameDay(new Date(e.startDate), day))

            const isTodayCell = isToday(day)

            

            return (

              <div

                key={dayIndex}

                className={`border-r border-border/50 min-h-[60px] relative flex items-center justify-center ${

                  isTodayCell ? 'bg-copper/10' : ''

                } ${(dayIndex === 5 || dayIndex === 6) ? 'bg-bg-tertiary/30' : ''}`}

                onClick={() => onCellClick?.(day, tank.id)}

              >

                {dayEvents.map(event => (

                  <BrewDayBadge

                    key={event.id}

                    batchNumber={event.batchNumber || event.id}

                    recipe={event.recipe || event.title}

                    onClick={(e) => {

                      e.stopPropagation()

                      onEventClick(event)

                    }}

                  />

                ))}

              </div>

            )

          })}

        </div>

      </div>

    )

  }

  

  // For fermenter/brite, show timeline bars

  return (

    <div className="flex border-b border-border">

      <TankInfo tank={tank} />

      <div className="flex-1 grid grid-cols-7 relative" style={{ minHeight: '60px' }}>

        {weekDays.map((day, dayIndex) => {

          const isTodayCell = isToday(day)

          return (

            <div

              key={dayIndex}

              className={`border-r border-border/50 relative ${

                isTodayCell ? 'bg-copper/10' : ''

              } ${(dayIndex === 5 || dayIndex === 6) ? 'bg-bg-tertiary/30' : ''}`}

              style={{ minHeight: '60px' }}

              onClick={() => onCellClick?.(day, tank.id)}

            />

          )

        })}

        

        {/* Timeline bars - positioned absolutely over the grid */}

        {tankEvents.map(event => {

          const position = getEventPosition(event)

          if (!position) return null

          

          const span = position.endDay - position.startDay + 1

          const leftPercent = (position.startDay / 7) * 100

          const widthPercent = (span / 7) * 100

          

          return (

            <TimelineBar

              key={event.id}

              event={event}

              startDay={position.startDay}

              endDay={position.endDay}

              onClick={() => onEventClick(event)}

            />

          )

        })}

      </div>

    </div>

  )

}

