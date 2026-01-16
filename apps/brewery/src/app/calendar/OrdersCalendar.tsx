'use client'

interface CalendarEvent {
  id: string
  type: 'brewing' | 'fermentation' | 'conditioning' | 'packaging' | 'maintenance' | 'cip' | 'order' | 'delivery'
  title: string
  startDate: Date
  endDate: Date
  status: 'scheduled' | 'active' | 'completed'
  customerName?: string
  quantity?: string
}

interface OrdersCalendarProps {
  currentMonth: Date
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
  onCellClick: (date: Date) => void
}

const getEventColor = (type: string): string => {
  switch (type) {
    case 'order': return 'bg-green-500'
    case 'delivery': return 'bg-purple-500'
    case 'packaging': return 'bg-cyan-500'
    default: return 'bg-slate-500'
  }
}

const getEventIcon = (type: string): string => {
  switch (type) {
    case 'order': return '📦'
    case 'delivery': return '🚚'
    case 'packaging': return '🎁'
    default: return '📅'
  }
}

export function OrdersCalendar({ currentMonth, events, onEventClick, onCellClick }: OrdersCalendarProps) {
  const weekDays = ['ორშ', 'სამ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ', 'კვი']

  const getDaysInMonth = (): { date: Date; isCurrentMonth: boolean }[] => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    let startingDay = firstDay.getDay()
    startingDay = startingDay === 0 ? 7 : startingDay

    const days: { date: Date; isCurrentMonth: boolean }[] = []

    for (let i = startingDay - 1; i > 0; i--) {
      days.push({ date: new Date(year, month, 1 - i), isCurrentMonth: false })
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true })
    }

    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false })
    }

    return days
  }

  const days = getDaysInMonth()

  const getEventsForDay = (date: Date): CalendarEvent[] => {
    return events.filter(event => {
      const eventStart = new Date(event.startDate)
      const eventEnd = new Date(event.endDate)
      eventStart.setHours(0, 0, 0, 0)
      eventEnd.setHours(23, 59, 59, 999)
      const checkDate = new Date(date)
      checkDate.setHours(12, 0, 0, 0)
      return checkDate >= eventStart && checkDate <= eventEnd
    })
  }

  const isToday = (date: Date): boolean => {
    const today = new Date()
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear()
  }

  return (
    <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
      <div className="grid grid-cols-7 bg-bg-tertiary border-b border-border">
        {weekDays.map((day, index) => (
          <div key={day} className={`p-3 text-center text-sm font-medium text-text-muted ${index >= 5 ? 'bg-bg-tertiary/50' : ''}`}>
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day, index) => {
          const dayEvents = getEventsForDay(day.date)
          const today = isToday(day.date)
          const isWeekend = index % 7 >= 5

          return (
            <div
              key={index}
              onClick={() => onCellClick(day.date)}
              className={`min-h-[100px] p-1.5 border-t border-l border-border cursor-pointer transition-colors hover:bg-bg-tertiary/50 ${
                !day.isCurrentMonth ? 'bg-bg-secondary/50' : 'bg-bg-card'
              } ${today ? 'ring-2 ring-copper ring-inset' : ''} ${isWeekend ? 'bg-bg-tertiary/20' : ''}`}
            >
              <div className={`text-right text-sm p-1 ${!day.isCurrentMonth ? 'text-text-muted/50' : today ? 'text-copper font-bold' : 'text-text-secondary'}`}>
                {day.date.getDate()}
              </div>
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map(event => (
                  <div
                    key={event.id}
                    onClick={(e) => { e.stopPropagation(); onEventClick(event) }}
                    className={`${getEventColor(event.type)} text-white text-xs px-1.5 py-1 rounded truncate cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1`}
                  >
                    <span>{getEventIcon(event.type)}</span>
                    <span className="truncate">{event.customerName || event.title}</span>
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-text-muted px-1">+{dayEvents.length - 3} მეტი</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
