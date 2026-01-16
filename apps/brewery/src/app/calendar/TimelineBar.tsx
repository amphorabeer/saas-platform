'use client'



import { useState } from 'react'



interface CalendarEvent {

  id: string

  type: 'brewing' | 'fermentation' | 'conditioning' | 'packaging' | 'maintenance'

  title: string

  batchNumber?: string

  recipe?: string

  status: 'scheduled' | 'active' | 'completed'

}



interface TimelineBarProps {

  event: CalendarEvent

  startDay: number  // 0-6 (ორშ-კვი)

  endDay: number

  onClick: (e?: React.MouseEvent) => void

}



const getBarColor = (event: CalendarEvent): string => {

  switch (event.type) {

    case 'fermentation':

      return 'bg-gradient-to-r from-copper to-amber-600'

    case 'conditioning':

      return 'bg-gradient-to-r from-blue-600 to-blue-400'

    case 'brewing':

      return 'bg-gradient-to-r from-amber-500 to-yellow-500'

    case 'maintenance':

      return 'bg-gradient-to-r from-red-600 to-red-400'

    case 'packaging':

      return 'bg-gradient-to-r from-green-600 to-green-400'

    default:

      return 'bg-gradient-to-r from-gray-600 to-gray-400'

  }

}



export function TimelineBar({ event, startDay, endDay, onClick }: TimelineBarProps) {

  const [isHovered, setIsHovered] = useState(false)

  const width = ((endDay - startDay + 1) / 7) * 100

  const left = (startDay / 7) * 100

  const colorClass = getBarColor(event)

  

  const displayText = event.batchNumber && event.recipe

    ? `${event.batchNumber} ${event.recipe}`

    : event.title

  

  return (

    <div

      className={`absolute top-1 bottom-1 rounded-lg ${colorClass} text-white text-xs font-medium px-2 flex items-center cursor-pointer transition-all duration-200 ${

        isHovered ? 'scale-105 shadow-lg z-10' : 'z-0'

      }`}

      style={{

        left: `${left}%`,

        width: `${width}%`,

        minWidth: '60px',

      }}

      onMouseEnter={() => setIsHovered(true)}

      onMouseLeave={() => setIsHovered(false)}

      onClick={onClick}

    >

      <span className="truncate">{displayText}</span>

    </div>

  )

}

