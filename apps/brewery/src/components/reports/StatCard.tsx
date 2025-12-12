'use client'



interface StatCardProps {

  title: string

  value: string | number

  change?: number

  changeLabel?: string

  icon?: string

  color?: 'copper' | 'green' | 'blue' | 'amber' | 'red' | 'purple' | 'emerald'

}



const colorClasses = {

  copper: 'text-copper-light',

  green: 'text-green-400',

  blue: 'text-blue-400',

  amber: 'text-amber-400',

  red: 'text-red-400',

  purple: 'text-purple-400',

  emerald: 'text-emerald-400',

}



export function StatCard({ title, value, change, changeLabel, icon, color = 'copper' }: StatCardProps) {

  const colorClass = colorClasses[color]

  const changeColor = change && change > 0 ? 'text-green-400' : change && change < 0 ? 'text-red-400' : 'text-text-muted'



  return (

    <div className="bg-bg-card border border-border rounded-xl p-6">

      <div className="flex items-start justify-between mb-4">

        {icon && <span className="text-2xl">{icon}</span>}

        {change !== undefined && (

          <div className={`text-sm font-medium ${changeColor}`}>

            {change > 0 ? '↑' : change < 0 ? '↓' : ''} {Math.abs(change)}%

            {changeLabel && <span className="text-text-muted ml-1">({changeLabel})</span>}

          </div>

        )}

      </div>

      <p className={`text-3xl font-bold font-display ${colorClass} mb-1`}>{value}</p>

      <p className="text-sm text-text-muted">{title}</p>

    </div>

  )

}

