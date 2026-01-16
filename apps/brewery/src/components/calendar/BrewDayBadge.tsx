'use client'

import { useSettingsStore } from '@/store'
import { PHASE_COLOR_GRADIENTS } from '@/constants'

interface BrewDayBadgeProps {
  batchNumber: string
  recipe: string
  compact?: boolean
  onClick?: (e: React.MouseEvent) => void
  status?: 'PLANNED' | 'BREWING' | 'FERMENTING' | 'CONDITIONING' | 'READY' | 'PACKAGING' | 'COMPLETED'
}

export function BrewDayBadge({ batchNumber, recipe, compact, onClick, status }: BrewDayBadgeProps) {
  const shortBatchNumber = batchNumber.replace('BRW-2024-', '').replace('BRW-', '').split('-').pop() || batchNumber
  const { phaseColors } = useSettingsStore()

  const getBadgeStyle = () => {
    const normalizedStatus = status?.toUpperCase() as keyof typeof phaseColors | undefined
    const colorKey = normalizedStatus ? phaseColors[normalizedStatus] : 'amber'
    const colorConfig = PHASE_COLOR_GRADIENTS[colorKey]
    
    console.log('[BrewDayBadge] DEBUG:', { status, normalizedStatus, colorKey, colorConfig })
    
    const getIcon = () => {
      switch (normalizedStatus) {
        case 'PLANNED': return '📅'
        case 'BREWING': return '🍺'
        case 'COMPLETED': return '✅'
        default: return '🍺'
      }
    }
    
    if (normalizedStatus === 'PLANNED') {
      return {
        bg: colorConfig?.bar || 'bg-gradient-to-r from-slate-500 to-slate-400',
        border: 'border-dashed border-white/30',
        text: 'text-white',
        hover: 'hover:opacity-90',
        icon: getIcon(),
      }
    }
    
    if (normalizedStatus === 'COMPLETED') {
      return {
        bg: `${colorConfig?.bar || 'bg-gradient-to-r from-gray-500 to-slate-500'} opacity-70`,
        border: 'border-white/20',
        text: 'text-white',
        hover: 'hover:opacity-80',
        icon: getIcon(),
      }
    }
    
    return {
      bg: colorConfig?.bar || 'bg-gradient-to-r from-amber-500 to-yellow-500',
      border: 'border-white/30',
      text: 'text-white',
      hover: 'hover:opacity-90',
      icon: getIcon(),
    }
  }

  const style = getBadgeStyle()

  return (
    <button
      onClick={onClick}
      className={`${style.bg} ${style.border} ${style.text} ${style.hover} border rounded transition-all shadow-sm hover:shadow-md flex items-center gap-0.5 ${
        compact ? 'px-1 py-0.5 text-[10px]' : 'px-1.5 py-0.5 text-[10px]'
      }`}
      title={`${batchNumber} - ${recipe}`}
    >
      <span className="text-[10px]">{style.icon}</span>
      <span>{shortBatchNumber}</span>
      {!compact && <span className="text-[9px] ml-0.5 opacity-80 truncate max-w-[60px]">{recipe}</span>}
    </button>
  )
}
