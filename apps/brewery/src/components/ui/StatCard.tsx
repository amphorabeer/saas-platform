import { cn } from '@/utils'

interface StatCardProps {
  icon: string
  iconColor?: 'copper' | 'amber' | 'green' | 'blue'
  value: string | number
  label: string
  trend?: {
    value: number
    isUp: boolean
  }
  chart?: React.ReactNode
}

const iconColors = {
  copper: 'bg-copper/15',
  amber: 'bg-amber/15',
  green: 'bg-success/15',
  blue: 'bg-info/15',
}

export function StatCard({ icon, iconColor = 'copper', value, label, trend, chart }: StatCardProps) {
  return (
    <div className="bg-bg-card border border-border rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/30 hover:border-border-light relative overflow-hidden group">
      {/* Top accent line on hover */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-copper opacity-0 group-hover:opacity-100 transition-opacity" />
      
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center text-xl', iconColors[iconColor])}>
          {icon}
        </div>
        
        {trend && (
          <span
            className={cn(
              'text-xs px-2 py-1 rounded-md font-medium',
              trend.isUp 
                ? 'bg-success/15 text-success' 
                : 'bg-danger/15 text-danger'
            )}
          >
            {trend.isUp ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
        )}
      </div>

      {/* Value */}
      <p className="text-[28px] font-bold font-display mb-1">{value}</p>
      
      {/* Label */}
      <p className="text-[13px] text-text-muted">{label}</p>

      {/* Mini Chart */}
      {chart && (
        <div className="h-10 mt-3">
          {chart}
        </div>
      )}
    </div>
  )
}



