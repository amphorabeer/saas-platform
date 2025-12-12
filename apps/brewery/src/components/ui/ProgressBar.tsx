import { cn } from '@/utils'

interface ProgressBarProps {
  value: number
  max?: number
  color?: 'copper' | 'amber' | 'success' | 'warning' | 'danger' | 'info'
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

const colors = {
  copper: 'bg-copper',
  amber: 'bg-amber',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
}

const sizes = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
}

export function ProgressBar({ 
  value, 
  max = 100, 
  color = 'copper', 
  size = 'md',
  showLabel = false,
  className 
}: ProgressBarProps) {
  const percentage = Math.min(Math.round((value / max) * 100), 100)
  
  return (
    <div className={cn('w-full', className)}>
      <div className={cn('w-full bg-bg-tertiary rounded-full overflow-hidden', sizes[size])}>
        <div
          className={cn('h-full rounded-full transition-all duration-500', colors[color])}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-text-muted mt-1">{percentage}%</p>
      )}
    </div>
  )
}



