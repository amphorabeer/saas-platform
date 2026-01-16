'use client'



import { formatDate, formatTime } from '@/lib/utils'



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



interface UpcomingEventsProps {

  events: CalendarEvent[]

  onEventClick: (event: CalendarEvent) => void

}



const getEventIcon = (type: CalendarEvent['type']): string => {

  if (type === 'brewing') return '🍺'

  if (type === 'fermentation') return '🧪'

  if (type === 'conditioning') return '🔵'

  if (type === 'packaging') return '🎁'

  return '🔧'

}



const isToday = (date: Date): boolean => {

  const today = new Date()

  return date.getFullYear() === today.getFullYear() &&

         date.getMonth() === today.getMonth() &&

         date.getDate() === today.getDate()

}



const isTomorrow = (date: Date): boolean => {

  const tomorrow = new Date()

  tomorrow.setDate(tomorrow.getDate() + 1)

  return date.getFullYear() === tomorrow.getFullYear() &&

         date.getMonth() === tomorrow.getMonth() &&

         date.getDate() === tomorrow.getDate()

}



const formatEventDate = (date: Date): string => {

  if (isToday(date)) return `დღეს ${formatTime(date)}`

  if (isTomorrow(date)) return `ხვალ ${formatTime(date)}`

  return formatDate(date)

}



export function UpcomingEvents({ events, onEventClick }: UpcomingEventsProps) {

  const now = new Date()

  const upcoming = events

    .filter(e => new Date(e.startDate) >= now || (e.status === 'active'))

    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())

    .slice(0, 5)



  if (upcoming.length === 0) {

    return null

  }



  return (

    <div className="bg-bg-card border border-border rounded-xl p-6">

      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">

        <span>📋</span>

        <span>მომავალი ივენთები</span>

      </h3>



      <div className="space-y-3">

        {upcoming.map(event => {

          const icon = getEventIcon(event.type)

          const eventDate = formatEventDate(event.startDate)

          const displayText = event.batchNumber && event.recipe

            ? `${event.batchNumber} ${event.recipe}`

            : event.title

          

          return (

            <div

              key={event.id}

              className="p-4 bg-bg-tertiary rounded-lg cursor-pointer hover:bg-bg-card transition-colors border border-border/50"

              onClick={() => onEventClick(event)}

            >

              <div className="flex items-start gap-3">

                <span className="text-xl">{icon}</span>

                <div className="flex-1 min-w-0">

                  <div className="text-sm font-medium text-text-primary mb-1">{eventDate}</div>

                  <div className="text-sm text-text-secondary">{displayText}</div>

                  {event.tankName && event.type !== 'brewing' && (

                    <div className="text-xs text-text-muted mt-1">→ {event.tankName}</div>

                  )}

                </div>

              </div>

            </div>

          )

        })}

      </div>

    </div>

  )

}

