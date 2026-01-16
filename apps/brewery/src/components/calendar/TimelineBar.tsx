'use client'

import { useState } from 'react'
import { useSettingsStore } from '@/store'
import { PHASE_COLOR_GRADIENTS } from '@/constants'
import { PhaseColors } from '@/data/settingsData'

interface CalendarEvent {
  id: string
  type: 'brewing' | 'fermentation' | 'conditioning' | 'packaging' | 'maintenance' | 'cip' | 'cip_warning'
  title: string
  batchNumber?: string
  recipe?: string
  status: 'scheduled' | 'active' | 'completed'
  batchStatus?: string
}

interface TimelineBarProps {
  event: CalendarEvent
  startDay: number
  endDay: number
  onClick: () => void
}

// Map batchStatus to phase key
const getPhaseKey = (batchStatus: string): keyof PhaseColors | null => {
  const statusMap: Record<string, keyof PhaseColors> = {
    'planned': 'PLANNED',
    'brewing': 'BREWING',
    'fermenting': 'FERMENTING',
    'conditioning': 'CONDITIONING',
    'ready': 'READY',
    'packaging': 'PACKAGING',
    'completed': 'COMPLETED',
  }
  return statusMap[batchStatus.toLowerCase()] || null
}

// Map event.type to phase key (fallback)
const getPhaseKeyFromType = (type: string): keyof PhaseColors | null => {
  const typeMap: Record<string, keyof PhaseColors> = {
    'planned': 'PLANNED',      // ✅ ADD THIS
    'brewing': 'BREWING',
    'fermentation': 'FERMENTING',
    'conditioning': 'CONDITIONING',
    'packaging': 'PACKAGING',
  }
  return typeMap[type] || null
}

export function TimelineBar({ event, startDay, endDay, onClick }: TimelineBarProps) {
  const [isHovered, setIsHovered] = useState(false)
  const { phaseColors } = useSettingsStore()
  
  const width = ((endDay - startDay + 1) / 7) * 100
  const left = (startDay / 7) * 100
  
  // Get bar color based on phase colors from store
  const getBarColor = (): string => {
    const batchStatus = event.batchStatus?.toUpperCase() || ''
    const isHistorical = (event as any).isHistorical || (event as any).isParentHistory
    
    // Non-batch events (CIP, maintenance)
    if (event.type === 'cip') {
      return 'bg-gradient-to-r from-blue-500 to-cyan-400'
    }
    if (event.type === 'cip_warning') {
      return 'bg-gradient-to-r from-amber-500 to-orange-500 animate-pulse'
    }
    if (event.type === 'maintenance') {
      return 'bg-gradient-to-r from-red-600 to-red-400'
    }
    
    // ✅ COMPLETED batches use COMPLETED color from settings
    if (batchStatus === 'COMPLETED' || isHistorical === true) {
      const completedColorKey = phaseColors['COMPLETED'] || 'blue'
      const completedGradient = PHASE_COLOR_GRADIENTS[completedColorKey]?.bar || 'bg-gradient-to-r from-blue-500 to-cyan-600'
      return `${completedGradient} opacity-60`
    }
    
    // Active batches use their phase color
    let phaseKey = getPhaseKey(batchStatus)
    if (!phaseKey) {
      phaseKey = getPhaseKeyFromType(event.type)
    }
    
    if (phaseKey) {
      const colorKey = phaseColors[phaseKey] || 'amber'
      const gradient = PHASE_COLOR_GRADIENTS[colorKey]?.bar || 'bg-gradient-to-r from-amber-500 to-orange-500'
      
      return gradient
    }
    
    return 'bg-gradient-to-r from-gray-500 to-slate-500'
  }
  
  const getStatusBadge = (): string | null => {
    if (!event.batchStatus) return null
    const status = event.batchStatus.toLowerCase()
    switch (status) {
      case 'completed': return '✅'
      case 'cancelled': return '❌'
      case 'ready': return '🟢'
      case 'packaging': return '📦'
      default: return null
    }
  }
  
  const colorClass = getBarColor()
  const statusBadge = getStatusBadge()
  
  const displayText = event.batchNumber && event.recipe
    ? `${event.batchNumber} ${event.recipe}`
    : event.title
  
  return (
    <div
      className={`absolute top-1 bottom-1 rounded-lg ${colorClass} text-white text-xs font-medium px-2 flex items-center gap-1 cursor-pointer transition-all duration-200 ${
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
      {statusBadge && <span>{statusBadge}</span>}
      <span className="truncate">{displayText}</span>
    </div>
  )
}
