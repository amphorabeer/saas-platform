'use client'

interface StatCardProps {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  icon?: string
  color?: 'copper' | 'green' | 'blue' | 'amber' | 'red' | 'purple' | 'emerald'
  variant?: 'default' | 'compact' | 'success' | 'danger' | 'warning'
  trend?: 'up' | 'down' | 'neutral'
  subtitle?: string
}

const colorClasses = {
  copper: 'text-copper',
  green: 'text-green-400',
  blue: 'text-blue-400',
  amber: 'text-amber-400',
  red: 'text-red-400',
  purple: 'text-purple-400',
  emerald: 'text-emerald-400',
}

const variantBgClasses = {
  default: 'bg-bg-card',
  compact: 'bg-bg-card',
  success: 'bg-green-400/10 border-green-400/30',
  danger: 'bg-red-400/10 border-red-400/30',
  warning: 'bg-amber-400/10 border-amber-400/30',
}

const variantValueClasses = {
  default: '',
  compact: '',
  success: 'text-green-400',
  danger: 'text-red-400',
  warning: 'text-amber-400',
}

export function StatCard({ 
  title, 
  value, 
  change, 
  changeLabel, 
  icon, 
  color = 'copper',
  variant = 'default',
  trend,
  subtitle,
}: StatCardProps) {
  const colorClass = variantValueClasses[variant] || colorClasses[color]
  const bgClass = variantBgClasses[variant] || 'bg-bg-card'
  
  const changeColor = change !== undefined
    ? change > 0 ? 'text-green-400' : change < 0 ? 'text-red-400' : 'text-text-muted'
    : ''
  
  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : ''
  const trendColor = trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : ''

  return (
    <div className={`border border-border rounded-xl p-3 ${bgClass}`}>
      {/* Header - Icon and Change */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          {icon && <span className="text-lg">{icon}</span>}
          <span className="text-xs text-text-muted">{title}</span>
        </div>
        {change !== undefined && (
          <span className={`text-xs font-medium ${changeColor}`}>
            {change > 0 ? '↑' : change < 0 ? '↓' : ''} {Math.abs(change)}%
            {changeLabel && <span className="text-text-muted ml-1">({changeLabel})</span>}
          </span>
        )}
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-2">
        <span className={`text-xl font-bold ${colorClass || colorClasses[color]}`}>
          {value}
        </span>
        {trend && (
          <span className={`text-sm font-medium ${trendColor}`}>{trendIcon}</span>
        )}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <p className="text-xs text-text-muted mt-1">{subtitle}</p>
      )}
    </div>
  )
}
