'use client'



import { TankRow } from './TankRow'



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



interface TankTimelineProps {

  weekStart: Date

  tanks: Tank[]

  events: CalendarEvent[]

  onEventClick: (event: CalendarEvent) => void

  onAddEvent: () => void

  onCellClick?: (date: Date, tankId: string) => void

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



const formatDayName = (date: Date): string => {

  const days = ['ორშ', 'სამ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ', 'კვი']

  return days[date.getDay() === 0 ? 6 : date.getDay() - 1]

}



const formatDayNumber = (date: Date): string => {

  return date.getDate().toString()

}



export function TankTimeline({ weekStart, tanks, events, onEventClick, onAddEvent, onCellClick }: TankTimelineProps) {

  const weekDays = getWeekDays(weekStart)

  

  return (

    <div className="bg-bg-card border border-border rounded-xl overflow-hidden">

      {/* Header Row */}

      <div className="flex bg-bg-tertiary border-b border-border">

        <div className="w-[120px] p-3 border-r border-border flex-shrink-0">

          <span className="text-sm font-semibold text-text-muted">ავზი</span>

        </div>

        <div className="flex-1 grid grid-cols-7">

          {weekDays.map((day, index) => (

            <div

              key={index}

              className={`border-r border-border/50 p-3 text-center ${

                (index === 5 || index === 6) ? 'bg-bg-tertiary/30' : ''

              }`}

            >

              <div className="text-xs text-text-muted mb-1">{formatDayName(day)}</div>

              <div className="text-sm font-semibold text-text-primary">{formatDayNumber(day)}</div>

            </div>

          ))}

        </div>

      </div>



      {/* Tank Rows */}

      {tanks.map(tank => (

        <TankRow

          key={tank.id}

          tank={tank}

          events={events}

          weekStart={weekStart}

          onEventClick={onEventClick}

          onCellClick={onCellClick}

        />

      ))}

    </div>

  )

}

