// src/components/ui/StatusBadge.tsx



interface BatchStatusBadgeProps {

  status: string

  showPulse?: boolean

}



const BATCH_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {

  // ქართული სტატუსები

  'მეიშინგი': { label: 'მეიშინგი', color: 'text-orange-400', bg: 'bg-orange-400/20' },

  'ხარშვა': { label: 'ხარშვა', color: 'text-red-400', bg: 'bg-red-400/20' },

  'ფერმენტაცია': { label: 'ფერმენტაცია', color: 'text-amber-400', bg: 'bg-amber-400/20' },

  'კონდიციონირება': { label: 'კონდიციონირება', color: 'text-blue-400', bg: 'bg-blue-400/20' },

  'მზადაა': { label: 'მზადაა', color: 'text-green-400', bg: 'bg-green-400/20' },

  'ჩამოსხმა': { label: 'ჩამოსხმა', color: 'text-purple-400', bg: 'bg-purple-400/20' },

  'დასრულებული': { label: 'დასრულებული', color: 'text-gray-400', bg: 'bg-gray-400/20' },

  // English statuses

  mashing: { label: 'მეიშინგი', color: 'text-orange-400', bg: 'bg-orange-400/20' },

  boiling: { label: 'ხარშვა', color: 'text-red-400', bg: 'bg-red-400/20' },

  fermenting: { label: 'ფერმენტაცია', color: 'text-amber-400', bg: 'bg-amber-400/20' },

  conditioning: { label: 'კონდიციონირება', color: 'text-blue-400', bg: 'bg-blue-400/20' },

  ready: { label: 'მზადაა', color: 'text-green-400', bg: 'bg-green-400/20' },

  bottling: { label: 'ჩამოსხმა', color: 'text-purple-400', bg: 'bg-purple-400/20' },

  completed: { label: 'დასრულებული', color: 'text-gray-400', bg: 'bg-gray-400/20' },

}



// Default fallback for unknown statuses

const DEFAULT_CONFIG = { label: 'უცნობი', color: 'text-gray-400', bg: 'bg-gray-400/20' }



export function BatchStatusBadge({ status, showPulse = false }: BatchStatusBadgeProps) {

  const config = BATCH_STATUS_CONFIG[status] || DEFAULT_CONFIG

  

  return (

    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>

      {showPulse && (

        <span className="relative flex h-2 w-2">

          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.bg.replace('/20', '')}`}></span>

          <span className={`relative inline-flex rounded-full h-2 w-2 ${config.bg.replace('/20', '')}`}></span>

        </span>

      )}

      {config.label}

    </span>

  )

}



interface TankStatusBadgeProps {

  status: string

}



const TANK_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {

  available: { label: 'თავისუფალი', color: 'text-green-400', bg: 'bg-green-400/20' },

  in_use: { label: 'გამოიყენება', color: 'text-amber-400', bg: 'bg-amber-400/20' },

  cleaning: { label: 'წმენდა', color: 'text-blue-400', bg: 'bg-blue-400/20' },

  maintenance: { label: 'რემონტი', color: 'text-red-400', bg: 'bg-red-400/20' },

}



export function TankStatusBadge({ status }: TankStatusBadgeProps) {

  const config = TANK_STATUS_CONFIG[status] || DEFAULT_CONFIG

  

  return (

    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>

      {config.label}

    </span>

  )

}



interface StatusBadgeProps {

  status: string

  variant?: 'batch' | 'tank'

}



export function StatusBadge({ status, variant = 'batch' }: StatusBadgeProps) {

  if (variant === 'tank') {

    return <TankStatusBadge status={status} />

  }

  return <BatchStatusBadge status={status} />

}
