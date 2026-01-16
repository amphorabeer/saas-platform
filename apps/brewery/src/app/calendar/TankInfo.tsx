'use client'

interface Tank {
  id: string
  name: string
  type: 'fermenter' | 'brite' | 'kettle'
  capacity: number
  currentTemp?: number
  status: 'available' | 'in_use' | 'cleaning' | 'maintenance'
}

interface TankInfoProps {
  tank: Tank
}

const getStatusConfig = (tank: Tank): { icon: string; label: string; color: string; bgColor: string; borderColor: string } => {
  switch (tank.status) {
    case 'in_use':
      return {
        icon: '🟢',
        label: tank.currentTemp ? `${tank.currentTemp}°C` : 'დაკავებული',
        color: 'text-green-400',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-l-green-500',
      }
    case 'cleaning':
      return {
        icon: '🧹',
        label: 'CIP',
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-l-blue-500',
      }
    case 'maintenance':
      return {
        icon: '🔧',
        label: 'მომსახურება',
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/10',
        borderColor: 'border-l-orange-500',
      }
    case 'available':
    default:
      return {
        icon: '⚪',
        label: 'თავისუფალი',
        color: 'text-text-muted',
        bgColor: 'bg-bg-card',
        borderColor: 'border-l-transparent',
      }
  }
}

const getTankIcon = (type: Tank['type']): string => {
  if (type === 'fermenter') return '🛢️'
  if (type === 'brite') return '🍺'
  return '🍳'
}

const getTankTypeLabel = (type: Tank['type']): string => {
  if (type === 'fermenter') return 'FV'
  if (type === 'brite') return 'BT'
  return 'KT'
}

export function TankInfo({ tank }: TankInfoProps) {
  const statusConfig = getStatusConfig(tank)
  const tankIcon = getTankIcon(tank.type)

  return (
    <div className={`w-[140px] border-r border-border p-3 flex flex-col gap-1.5 flex-shrink-0 ${statusConfig.bgColor} border-l-4 ${statusConfig.borderColor}`}>
      <div className="flex items-center gap-2">
        <span className="text-lg">{tankIcon}</span>
        <span className="font-semibold text-sm text-text-primary">{tank.name}</span>
      </div>
      <div className="text-xs text-text-muted">
        {getTankTypeLabel(tank.type)} • {tank.capacity.toLocaleString('en-US')}L
      </div>
      <div className={`flex items-center gap-1.5 text-xs ${statusConfig.color}`}>
        <span>{statusConfig.icon}</span>
        <span className="font-medium">{statusConfig.label}</span>
      </div>
    </div>
  )
}
