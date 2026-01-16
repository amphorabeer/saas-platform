'use client'

import { useState } from 'react'
import { ProgressBar, BatchStatusBadge } from '@/components/ui'
import { formatGravity } from '@/utils'

interface SourceBatch {
  batchNumber: string
  volume?: number
}

interface Tank {
  id: string
  name: string
  type: 'fermenter' | 'brite' | 'unitank' | 'conditioning'
  capacity: number
  currentVolume: number
  status: 'available' | 'in_use' | 'cleaning' | 'maintenance'
  batch?: {
    id: string
    batchNumber: string
    recipe: string
    status: 'fermenting' | 'conditioning' | 'ready' | 'brewing' | 'planned' | 'packaging' | 'completed'
    startDate: Date
    estimatedEndDate: Date
    progress: number
    // ✅ NEW: Blend support
    isBlended?: boolean
    sourceBatches?: SourceBatch[]
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
  capabilities?: ('fermenting' | 'conditioning' | 'brewing' | 'storage')[]
  phase?: 'FERMENTATION' | 'CONDITIONING' | 'BRIGHT' | 'PACKAGING'
}

interface TankCardProps {
  tank: Tank
  viewMode: 'grid' | 'list'
  onClick: () => void
}

const TYPE_LABELS = {
  fermenter: 'ფერმენტატორი',
  brite: 'ბრაიტ ავზი',
  unitank: 'Unitank',
  conditioning: 'კონდიც. ავზი',
}

const STATUS_CONFIG = {
  available: { label: 'თავისუფალი', color: 'text-green-400', bg: 'bg-green-400/20', ring: 'ring-green-400/30' },
  in_use: { label: 'აქტიური', color: 'text-amber-400', bg: 'bg-amber-400/20', ring: 'ring-amber-400/30' },
  cleaning: { label: 'საჭიროებს CIP-ს', color: 'text-orange-400', bg: 'bg-orange-400/20', ring: 'ring-orange-400/30' },
  maintenance: { label: 'რემონტი', color: 'text-red-400', bg: 'bg-red-400/20', ring: 'ring-red-400/30' },
}

const PHASE_LABELS: Record<string, string> = {
  FERMENTATION: 'ფერმენტაცია',
  CONDITIONING: 'კონდიცირება',
  BRIGHT: 'მზადაა',
  PACKAGING: 'დაფასოვება',
}

const getPhaseLabel = (phase?: string, batchStatus?: string, tankStatus?: string): string => {
  // ✅ If tank is not in use, don't show phase
  if (tankStatus && ['available', 'cleaning', 'maintenance'].includes(tankStatus)) {
    return ''
  }
  
  // ✅ FIX: Check phase first (from Tank.currentPhase)
  if (phase && PHASE_LABELS[phase]) {
    return PHASE_LABELS[phase]
  }
  
  // ✅ FIX: Then check batch status
  const statusMap: Record<string, string> = {
    'fermenting': 'ფერმენტაცია',
    'conditioning': 'კონდიცირება',
    'ready': 'მზადაა',
    'packaging': 'დაფასოვება',
    'completed': 'დასრულებული',
  }
  
  if (batchStatus && statusMap[batchStatus.toLowerCase()]) {
    return statusMap[batchStatus.toLowerCase()]
  }
  
  return ''
}

// ✅ NEW: Blend Badge Component (inline)
function BlendBadgeInline({ count, sourceBatches }: { count: number, sourceBatches?: SourceBatch[] }) {
  const [showTooltip, setShowTooltip] = useState(false)

  if (count <= 1) return null

  return (
    <div 
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-500/20 text-purple-400 text-[10px] rounded-full border border-purple-500/30">
        <span>🔀</span>
        <span>{count} ბეჩი</span>
      </span>

      {/* Tooltip */}
      {showTooltip && sourceBatches && sourceBatches.length > 0 && (
        <div className="absolute bottom-full left-0 mb-2 z-50 min-w-[160px]">
          <div className="bg-bg-card border border-border rounded-lg shadow-xl p-2">
            <p className="text-[10px] text-text-muted mb-1">შერეული ბეჩები:</p>
            {sourceBatches.map((batch, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="font-mono text-copper-light">{batch.batchNumber}</span>
                {batch.volume && <span className="text-text-muted">{batch.volume}L</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function TankCard({ tank, viewMode, onClick }: TankCardProps) {
  const fillPercent = Math.round((tank.currentVolume / tank.capacity) * 100)
  const statusConfig = STATUS_CONFIG[tank.status]
  const tempDiff = Math.abs(tank.temperature.current - tank.temperature.target)
  const tempWarning = tank.status === 'in_use' && tempDiff > 0.5
  
  // ✅ Calculate packaging progress (defensive - recalculate in component)
  const packagingProgress = tank.batch?.status === 'packaging' 
    ? Math.round(((tank.batch as any)?.packagedVolume || 0) / (tank.currentVolume || 100) * 100)
    : (tank.batch?.progress || 0)
  
  // ✅ Check if blended
  const isBlended = tank.batch?.isBlended || (tank.batch?.sourceBatches && tank.batch.sourceBatches.length > 1)
  const batchCount = tank.batch?.sourceBatches?.length || 1

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
            {tank.currentVolume}L / {fillPercent}%
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 grid grid-cols-6 gap-4 items-center">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-display font-semibold text-lg">{tank.name}</p>
              {tank.type === 'unitank' && (
                <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded">
                  Unitank
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-text-muted">{TYPE_LABELS[tank.type]}</p>
            </div>
          </div>
          
          <div>
            <span className={`inline-flex px-2 py-0.5 rounded text-xs ${statusConfig.bg} ${statusConfig.color}`}>
              {(() => {
                // If tank has a batch, show phase label instead of status
                if (tank.batch && tank.status === 'in_use') {
                  const phaseLabel = getPhaseLabel(tank.phase, tank.batch.status, tank.status)
                  if (phaseLabel) return phaseLabel
                }
                return statusConfig.label
              })()}
            </span>
          </div>

          <div>
            {tank.batch ? (
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-mono text-copper-light">{tank.batch.batchNumber}</p>
                  {/* ✅ Blend Badge */}
                  {isBlended && (
                    <BlendBadgeInline count={batchCount} sourceBatches={tank.batch.sourceBatches} />
                  )}
                </div>
                <p className="text-xs text-text-muted truncate">{tank.batch.recipe}</p>
              </div>
            ) : (
              <span className="text-text-muted text-sm">-</span>
            )}
          </div>

          <div className={tempWarning ? 'text-warning' : ''}>
            <p className="text-sm font-mono">{tank.temperature.current.toFixed(1)}°C</p>
            <p className="text-xs text-text-muted">სამიზნე: {tank.temperature.target.toFixed(1)}°C</p>
          </div>

          <div>
            {tank.gravity.current > 0 ? (
              <>
                <p className="text-sm font-mono">{formatGravity(tank.gravity.current)}</p>
                <p className="text-xs text-text-muted">OG: {formatGravity(tank.gravity.original)}</p>
              </>
            ) : (
              <span className="text-text-muted text-sm">-</span>
            )}
          </div>

          <div>
            {tank.batch && (
              <div className="flex items-center gap-2">
                <ProgressBar value={packagingProgress} size="sm" color="copper" className="flex-1" />
                <span className="text-xs text-text-muted w-8">{packagingProgress}%</span>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Grid View
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
          <div className="flex items-center gap-2">
            <h3 className="font-display font-semibold text-xl">{tank.name}</h3>
            {tank.type === 'unitank' && (
              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded">
                Unitank
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-text-muted">{TYPE_LABELS[tank.type]} • {tank.capacity}L</p>
          </div>
        </div>
        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
          {(() => {
            // If tank has a batch, show phase label instead of status
            if (tank.batch && tank.status === 'in_use') {
              const phaseLabel = getPhaseLabel(tank.phase, tank.batch.status, tank.status)
              if (phaseLabel) return phaseLabel
            }
            return statusConfig.label
          })()}
        </span>
      </div>

      {/* Tank Visualization */}
      <div className="p-6 flex justify-center">
        <div className="relative">
          <div className="w-32 h-44 relative">
            <svg viewBox="0 0 100 140" className="w-full h-full">
              <path 
                d="M10,20 L10,110 Q10,130 30,130 L70,130 Q90,130 90,110 L90,20 Q90,5 50,5 Q10,5 10,20" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                className="text-border"
              />
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
              {/* Bubbles for fermentation */}
              {tank.status === 'in_use' && (tank.phase === 'FERMENTATION' || tank.batch?.status === 'fermenting') && (
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
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <span className="text-xl font-bold font-display text-white/80">{tank.currentVolume} L</span>
                <span className="text-sm text-white/60 block">{fillPercent}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Batch Info */}
      {tank.batch && (
        <div className="px-4 pb-4">
          <div className="bg-bg-tertiary rounded-xl p-3">
            {/* ✅ Blend Badge at top if blended */}
            {isBlended && (
              <div className="mb-2">
                <BlendBadgeInline count={batchCount} sourceBatches={tank.batch.sourceBatches} />
              </div>
            )}
            
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-mono text-sm text-copper-light">{tank.batch.batchNumber}</p>
                <p className="text-xs text-text-muted">{tank.batch.recipe}</p>
              </div>
              <BatchStatusBadge 
                status={tank.phase === 'CONDITIONING' ? 'conditioning' : 
                        tank.phase === 'FERMENTATION' ? 'fermenting' : 
                        tank.phase === 'BRIGHT' ? 'ready' :
                        tank.phase === 'PACKAGING' ? 'packaging' :
                        tank.batch.status} 
                showPulse={tank.phase === 'FERMENTATION' || tank.batch.status === 'fermenting'} 
              />
            </div>
            
            {/* ✅ Show source batches if blended */}
            {isBlended && tank.batch.sourceBatches && tank.batch.sourceBatches.length > 1 && (
              <div className="mb-2 p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
                <p className="text-[10px] text-purple-400 mb-1">შერეული:</p>
                {tank.batch.sourceBatches.map((sb, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="font-mono text-copper-light/70">{sb.batchNumber}</span>
                    {sb.volume && <span className="text-text-muted">{sb.volume}L</span>}
                  </div>
                ))}
              </div>
            )}
            
            <ProgressBar value={packagingProgress} size="sm" color="copper" />
            <p className="text-[10px] text-text-muted mt-1 text-right">
              {(() => {
                const phaseLabel = getPhaseLabel(tank.phase, tank.batch.status, tank.status)
                return phaseLabel ? `${phaseLabel}: ${packagingProgress}% დასრულებული` : `${packagingProgress}% დასრულებული`
              })()}
            </p>
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
            {tank.temperature.current.toFixed(1)}°C
          </p>
          <p className="text-[10px] text-text-muted">სამიზნე: {tank.temperature.target.toFixed(1)}°C</p>
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
              <p className="font-mono">{tank.pressure.toFixed(1)} bar</p>
            </div>
          )}
          {tank.ph && (
            <div className="p-3">
              <p className="text-xs text-text-muted">pH</p>
              <p className="font-mono">{tank.ph.toFixed(1)}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}