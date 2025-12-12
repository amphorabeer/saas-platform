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



const getStatusIcon = (tank: Tank): string => {

  if (tank.status === 'in_use') {

    if (tank.type === 'fermenter') return '🟢'

    if (tank.type === 'brite') return '🔵'

    return '🟡'

  }

  if (tank.status === 'cleaning' || tank.status === 'maintenance') return '🔴'

  return '⚪'

}



const getTankIcon = (type: Tank['type']): string => {

  if (type === 'fermenter') return '🧪'

  if (type === 'brite') return '🍺'

  return '🍺'

}



export function TankInfo({ tank }: TankInfoProps) {

  const statusIcon = getStatusIcon(tank)

  const tankIcon = getTankIcon(tank.type)

  

  return (

    <div className="w-[120px] bg-bg-card border-r border-border p-3 flex flex-col gap-1 flex-shrink-0">

      <div className="flex items-center gap-2">

        <span className="text-lg">{tankIcon}</span>

        <span className="font-semibold text-sm text-text-primary">{tank.name}</span>

      </div>

      <div className="text-xs text-text-muted">{tank.capacity.toLocaleString('en-US')}L</div>

      {tank.currentTemp !== undefined && tank.status === 'in_use' && (

        <div className="flex items-center gap-1 text-xs">

          <span>{statusIcon}</span>

          <span className="text-text-primary">{tank.currentTemp}°C</span>

        </div>

      )}

      {tank.status === 'available' && (

        <div className="flex items-center gap-1 text-xs">

          <span>{statusIcon}</span>

          <span className="text-text-muted">თავისუფალი</span>

        </div>

      )}

      {(tank.status === 'cleaning' || tank.status === 'maintenance') && (

        <div className="flex items-center gap-1 text-xs">

          <span>{statusIcon}</span>

          <span className="text-text-muted">{tank.status === 'cleaning' ? 'გაწმენდა' : 'მოვლა'}</span>

        </div>

      )}

    </div>

  )

}

