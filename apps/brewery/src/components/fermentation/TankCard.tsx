'use client'



import { ProgressBar, BatchStatusBadge } from '@/components/ui'



interface Tank {

  id: string

  name: string

  type: 'fermenter' | 'brite' | 'conditioning'

  capacity: number

  currentVolume: number

  status: 'available' | 'in_use' | 'cleaning' | 'maintenance'

  batch?: {

    id: string

    batchNumber: string

    recipe: string

    status: 'fermenting' | 'conditioning' | 'ready'

    startDate: Date

    estimatedEndDate: Date

    progress: number

  }

  temperature: {

    current: number

    target: number

  }

  gravity: {

    original: number

    current: number

    target: number

  }

  pressure?: number

  ph?: number

  lastUpdated: Date

}



interface TankCardProps {

  tank: Tank

  viewMode: 'grid' | 'list'

  onClick: () => void

}



const TYPE_LABELS = {

  fermenter: 'ფერმენტატორი',

  brite: 'ბრაიტ ტანკი',

  conditioning: 'კონდიც. ტანკი',

}



const STATUS_CONFIG = {

  available: { label: 'თავისუფალი', color: 'text-green-400', bg: 'bg-green-400/20', ring: 'ring-green-400/30' },

  in_use: { label: 'აქტიური', color: 'text-amber-400', bg: 'bg-amber-400/20', ring: 'ring-amber-400/30' },

  cleaning: { label: 'წმენდა', color: 'text-blue-400', bg: 'bg-blue-400/20', ring: 'ring-blue-400/30' },

  maintenance: { label: 'რემონტი', color: 'text-red-400', bg: 'bg-red-400/20', ring: 'ring-red-400/30' },

}



export function TankCard({ tank, viewMode, onClick }: TankCardProps) {

  const fillPercent = Math.round((tank.currentVolume / tank.capacity) * 100)

  const statusConfig = STATUS_CONFIG[tank.status]

  const tempDiff = Math.abs(tank.temperature.current - tank.temperature.target)

  const tempWarning = tank.status === 'in_use' && tempDiff > 0.5



  if (viewMode === 'list') {

    return (

      <div 

        onClick={onClick}

        className={`bg-bg-card border border-border rounded-xl p-4 hover:border-copper/50 cursor-pointer transition-all flex items-center gap-6 ${

          tempWarning ? 'border-warning/50' : ''

        }`}

      >

        {/* Tank Visual */}

        <div className="relative w-16 h-20">

          <div className="absolute inset-0 border-2 border-border rounded-lg overflow-hidden">

            <div 

              className={`absolute bottom-0 left-0 right-0 transition-all ${

                tank.status === 'in_use' ? 'bg-amber-500/40' : 'bg-gray-600/20'

              }`}

              style={{ height: `${fillPercent}%` }}

            >

              {tank.status === 'in_use' && (

                <div className="absolute inset-0 overflow-hidden">

                  {[...Array(3)].map((_, i) => (

                    <div

                      key={i}

                      className="absolute w-1.5 h-1.5 bg-amber-300/60 rounded-full animate-bubble-rise"

                      style={{

                        left: `${20 + i * 30}%`,

                        animationDelay: `${i * 0.5}s`,

                      }}

                    />

                  ))}

                </div>

              )}

            </div>

          </div>

          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-text-muted">

            {fillPercent}%

          </span>

        </div>



        {/* Info */}

        <div className="flex-1 grid grid-cols-6 gap-4 items-center">

          <div>

            <p className="font-display font-semibold text-lg">{tank.name}</p>

            <p className="text-xs text-text-muted">{TYPE_LABELS[tank.type]}</p>

          </div>

          

          <div>

            <span className={`inline-flex px-2 py-0.5 rounded text-xs ${statusConfig.bg} ${statusConfig.color}`}>

              {statusConfig.label}

            </span>

          </div>



          <div>

            {tank.batch ? (

              <div>

                <p className="text-sm font-mono text-copper-light">{tank.batch.batchNumber}</p>

                <p className="text-xs text-text-muted truncate">{tank.batch.recipe}</p>

              </div>

            ) : (

              <span className="text-text-muted text-sm">-</span>

            )}

          </div>



          <div className={tempWarning ? 'text-warning' : ''}>

            <p className="text-sm font-mono">{tank.temperature.current}°C</p>

            <p className="text-xs text-text-muted">სამიზნე: {tank.temperature.target}°C</p>

          </div>



          <div>

            {tank.gravity.current > 0 ? (

              <>

                <p className="text-sm font-mono">{tank.gravity.current.toFixed(3)}</p>

                <p className="text-xs text-text-muted">OG: {tank.gravity.original.toFixed(3)}</p>

              </>

            ) : (

              <span className="text-text-muted text-sm">-</span>

            )}

          </div>



          <div>

            {tank.batch && (

              <div className="flex items-center gap-2">

                <ProgressBar value={tank.batch.progress} size="sm" color="copper" className="flex-1" />

                <span className="text-xs text-text-muted w-8">{tank.batch.progress}%</span>

              </div>

            )}

          </div>

        </div>

      </div>

    )

  }



  return (

    <div 

      onClick={onClick}

      className={`bg-bg-card border border-border rounded-2xl overflow-hidden hover:border-copper/50 cursor-pointer transition-all group ${

        tempWarning ? 'border-warning/50' : ''

      } ${tank.status === 'in_use' ? `ring-2 ${statusConfig.ring}` : ''}`}

    >

      {/* Header */}

      <div className="p-4 border-b border-border flex justify-between items-start">

        <div>

          <h3 className="font-display font-semibold text-xl">{tank.name}</h3>

          <p className="text-xs text-text-muted">{TYPE_LABELS[tank.type]} • {tank.capacity}L</p>

        </div>

        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>

          {statusConfig.label}

        </span>

      </div>



      {/* Tank Visualization */}

      <div className="p-6 flex justify-center">

        <div className="relative">

          {/* Tank body */}

          <div className="w-32 h-44 relative">

            {/* Tank outline */}

            <svg viewBox="0 0 100 140" className="w-full h-full">

              {/* Tank body */}

              <path 

                d="M10,20 L10,110 Q10,130 30,130 L70,130 Q90,130 90,110 L90,20 Q90,5 50,5 Q10,5 10,20" 

                fill="none" 

                stroke="currentColor" 

                strokeWidth="2" 

                className="text-border"

              />

              {/* Fill level */}

              <defs>

                <clipPath id={`tank-clip-${tank.id}`}>

                  <path d="M11,20 L11,110 Q11,129 30,129 L70,129 Q89,129 89,110 L89,20 Q89,6 50,6 Q11,6 11,20" />

                </clipPath>

              </defs>

              <rect 

                x="11" 

                y={130 - (fillPercent * 1.24)}

                width="78" 

                height={fillPercent * 1.24}

                clipPath={`url(#tank-clip-${tank.id})`}

                className={tank.status === 'in_use' ? 'fill-amber-500/40' : 'fill-gray-600/20'}

              />

              {/* Bubbles for active tanks */}

              {tank.status === 'in_use' && tank.batch?.status === 'fermenting' && (

                <>

                  <circle className="fill-amber-300/60 animate-bubble-rise" cx="30" cy="100" r="2">

                    <animate attributeName="cy" values="100;30;100" dur="3s" repeatCount="indefinite" />

                    <animate attributeName="opacity" values="0.6;0;0.6" dur="3s" repeatCount="indefinite" />

                  </circle>

                  <circle className="fill-amber-300/60 animate-bubble-rise" cx="50" cy="110" r="1.5">

                    <animate attributeName="cy" values="110;40;110" dur="2.5s" repeatCount="indefinite" begin="0.5s" />

                    <animate attributeName="opacity" values="0.6;0;0.6" dur="2.5s" repeatCount="indefinite" begin="0.5s" />

                  </circle>

                  <circle className="fill-amber-300/60 animate-bubble-rise" cx="70" cy="105" r="2.5">

                    <animate attributeName="cy" values="105;35;105" dur="3.5s" repeatCount="indefinite" begin="1s" />

                    <animate attributeName="opacity" values="0.6;0;0.6" dur="3.5s" repeatCount="indefinite" begin="1s" />

                  </circle>

                </>

              )}

            </svg>

            {/* Fill percentage */}

            <div className="absolute inset-0 flex items-center justify-center">

              <span className="text-2xl font-bold font-display text-white/80">{fillPercent}%</span>

            </div>

          </div>

        </div>

      </div>



      {/* Batch Info */}

      {tank.batch && (

        <div className="px-4 pb-4">

          <div className="bg-bg-tertiary rounded-xl p-3">

            <div className="flex justify-between items-start mb-2">

              <div>

                <p className="font-mono text-sm text-copper-light">{tank.batch.batchNumber}</p>

                <p className="text-xs text-text-muted">{tank.batch.recipe}</p>

              </div>

              <BatchStatusBadge status={tank.batch.status} showPulse={tank.batch.status === 'fermenting'} />

            </div>

            <ProgressBar value={tank.batch.progress} size="sm" color="copper" />

            <p className="text-[10px] text-text-muted mt-1 text-right">{tank.batch.progress}% დასრულებული</p>

          </div>

        </div>

      )}



      {/* Metrics */}

      <div className="grid grid-cols-2 border-t border-border">

        <div className={`p-3 border-r border-border ${tempWarning ? 'bg-warning/10' : ''}`}>

          <div className="flex items-center gap-2 mb-1">

            <span className={tempWarning ? 'text-warning' : ''}>🌡️</span>

            <span className="text-xs text-text-muted">ტემპერატურა</span>

          </div>

          <p className={`text-lg font-mono ${tempWarning ? 'text-warning' : ''}`}>

            {tank.temperature.current}°C

          </p>

          <p className="text-[10px] text-text-muted">სამიზნე: {tank.temperature.target}°C</p>

        </div>

        <div className="p-3">

          <div className="flex items-center gap-2 mb-1">

            <span>📊</span>

            <span className="text-xs text-text-muted">სიმკვრივე</span>

          </div>

          {tank.gravity.current > 0 ? (

            <>

              <p className="text-lg font-mono">{tank.gravity.current.toFixed(3)}</p>

              <p className="text-[10px] text-text-muted">OG: {tank.gravity.original.toFixed(3)}</p>

            </>

          ) : (

            <p className="text-lg text-text-muted">-</p>

          )}

        </div>

      </div>



      {/* Additional Metrics */}

      {tank.status === 'in_use' && (tank.pressure || tank.ph) && (

        <div className="grid grid-cols-2 border-t border-border">

          {tank.pressure && (

            <div className="p-3 border-r border-border">

              <p className="text-xs text-text-muted">წნევა</p>

              <p className="font-mono">{tank.pressure} bar</p>

            </div>

          )}

          {tank.ph && (

            <div className="p-3">

              <p className="text-xs text-text-muted">pH</p>

              <p className="font-mono">{tank.ph}</p>

            </div>

          )}

        </div>

      )}

    </div>

  )

}
