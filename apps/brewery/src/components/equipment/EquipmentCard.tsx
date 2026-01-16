'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

import { Card, CardHeader, CardBody, ProgressBar } from '@/components/ui'

import { formatDate } from '@/lib/utils'

import { equipmentTypeConfig, capabilityConfig, type Equipment, type TankCapability, type EquipmentType } from '@/data/equipmentData'



interface EquipmentCardProps {

  equipment: Equipment

  onClick: () => void

}



const getStatusConfig = (status: string) => {
  // Normalize status to lowercase for lookup
  const normalizedStatus = (status || 'operational').toLowerCase()
  
  const configs: Record<string, { label: string; borderColor: string; bgColor: string }> = {
    operational: { label: '✅ მუშა', borderColor: 'border-l-green-500', bgColor: 'bg-green-500/10' },
    needs_maintenance: { label: '⚠️ მოვლა საჭირო', borderColor: 'border-l-amber-500', bgColor: 'bg-amber-500/10' },
    under_maintenance: { label: '🔧 მოვლაზე', borderColor: 'border-l-blue-500', bgColor: 'bg-blue-500/10' },
    out_of_service: { label: '🔴 გაუმართავი', borderColor: 'border-l-red-500', bgColor: 'bg-red-500/10' },
  }
  
  // Return config or default to operational
  return configs[normalizedStatus] || configs['operational']
}



const getDaysUntilCIP = (nextCIP: Date | string | undefined | null): number => {
  if (!nextCIP) return 0
  
  // Convert string to Date if needed (from localStorage)
  const cipDate = typeof nextCIP === 'string' ? new Date(nextCIP) : nextCIP
  
  // Check if valid date
  if (isNaN(cipDate.getTime())) return 0
  
  const now = new Date()
  const diffTime = cipDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}



const getCIPProgressColor = (daysLeft: number | null): 'success' | 'amber' | 'danger' => {
  if (daysLeft === null || daysLeft === 0) return 'success'
  if (daysLeft < 0) return 'danger' // Overdue
  if (daysLeft <= 3) return 'danger'
  if (daysLeft <= 7) return 'amber'
  return 'success'
}



export function EquipmentCard({ equipment, onClick }: EquipmentCardProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Early return for SSR to prevent hydration mismatches
  if (!mounted) {
    return (
      <Card className="animate-pulse bg-slate-700 rounded-xl h-48 border-l-4 border-l-slate-600">
        <CardHeader className="pb-3">
          <div className="h-6 bg-slate-600 rounded w-3/4"></div>
        </CardHeader>
        <CardBody>
          <div className="space-y-2">
            <div className="h-4 bg-slate-600 rounded w-full"></div>
            <div className="h-4 bg-slate-600 rounded w-2/3"></div>
          </div>
        </CardBody>
      </Card>
    )
  }

  const typeConfig = equipmentTypeConfig[equipment.type?.toLowerCase() as EquipmentType] || {
    icon: '⚙️',
    name: equipment.type || 'უცნობი'
  }

  const statusConfig = getStatusConfig(equipment.status)

  const daysUntilCIP = equipment.nextCIP ? getDaysUntilCIP(equipment.nextCIP) : null

  const cipProgressColor = getCIPProgressColor(daysUntilCIP)

  const cipProgress = equipment.nextCIP && equipment.lastCIP

    ? Math.max(0, Math.min(100, ((7 - (daysUntilCIP || 0)) / 7) * 100))

    : 0

  const isOverdue = daysUntilCIP !== null && daysUntilCIP < 0

  const normalizedStatus = (equipment.status || '').toLowerCase()
  const needsPulse = normalizedStatus === 'needs_maintenance' || isOverdue



  return (

    <div
      className={`cursor-pointer hover:border-copper/50 transition-all`}
      onClick={onClick}
    >
      <Card
        className={`border-l-4 ${statusConfig.borderColor} ${needsPulse ? 'animate-pulse' : ''}`}
      >

      <CardHeader className="pb-3">

        <div className="flex items-start justify-between">

          <div className="flex items-center gap-2">

            <span className="text-xl">{typeConfig.icon}</span>

            <div>

              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg text-copper-light">{equipment.name}</h3>
                {(equipment.type?.toLowerCase() === 'unitank') && (
                  <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded">
                    🔄 Unitank
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-text-muted">{typeConfig.name}</p>
                {equipment.capabilities?.some(cap => cap?.toLowerCase() === 'fermenting') && (
                  <span className="text-xs text-green-400" title="ფერმენტაცია">🧪</span>
                )}
                {equipment.capabilities?.some(cap => cap?.toLowerCase() === 'conditioning') && (
                  <span className="text-xs text-blue-400" title="კონდიცირება">❄️</span>
                )}
              </div>

            </div>

          </div>

          <span className={`px-2 py-1 rounded text-xs font-medium ${statusConfig.bgColor} ${

            normalizedStatus === 'operational' ? 'text-green-400' :

            normalizedStatus === 'needs_maintenance' ? 'text-amber-400' :

            normalizedStatus === 'under_maintenance' ? 'text-blue-400' :

            'text-red-400'

          }`}>

            {statusConfig.label}

          </span>

        </div>

      </CardHeader>



      <CardBody className="space-y-3">

        {/* Capacity & Model */}

        <div className="text-sm text-text-muted">

          {equipment.capacity && `${equipment.capacity.toLocaleString('en-US')}L`}

          {equipment.model && ` | ${equipment.model}`}

          {equipment.manufacturer && ` | ${equipment.manufacturer}`}

        </div>

        {/* Capabilities */}
        {equipment.capabilities && equipment.capabilities.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {equipment.capabilities.map((cap: TankCapability | string) => {
              const normalizedCap = (cap || '').toLowerCase() as TankCapability
              const capConfig = capabilityConfig[normalizedCap]
              if (!capConfig) return null
              return (
                <span 
                  key={cap}
                  className={`px-2 py-0.5 text-xs rounded-full bg-slate-700 ${capConfig.color}`}
                >
                  {capConfig.icon} {capConfig.label}
                </span>
              )
            })}
          </div>
        )}



        {/* Current Status */}

        {(equipment.currentTemp !== undefined || equipment.currentPressure !== undefined || (equipment as any).currentGravity !== undefined) && (

          <div className="flex items-center gap-4 text-sm flex-wrap">

            {equipment.currentTemp !== undefined && (

              <div className="flex items-center gap-1">

                <span>🌡️</span>

                <span className="text-text-primary">{equipment.currentTemp}°C</span>
                {(equipment as any).targetTemp !== undefined && (
                  <span className="text-text-muted text-xs ml-1">(სამიზნე: {(equipment as any).targetTemp}°C)</span>
                )}

              </div>

            )}

            {equipment.currentPressure !== undefined && (

              <div className="flex items-center gap-1">

                <span>📊</span>

                <span className="text-text-primary">{equipment.currentPressure} bar</span>

              </div>

            )}

            {(equipment as any).currentGravity !== undefined && (equipment as any).currentGravity !== null && (

              <div className="flex items-center gap-1">

                <span>📊</span>

                <span className="text-text-primary">{(equipment as any).currentGravity}</span>

              </div>

            )}

          </div>

        )}



        {/* Current Batch */}

        {equipment.currentBatchNumber && (

          <div className="text-sm">

            <span className="text-text-muted">მიმდინარე:</span>

            <span className="ml-2 font-medium text-copper-light">{equipment.currentBatchNumber}</span>

          </div>

        )}

        {/* Conditioning Progress */}
        {(equipment as any).conditioningProgress !== undefined && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-muted">კონდიცირება:</span>
              <span className="font-medium text-blue-400">
                {(equipment as any).conditioningProgress}% დასრულებული
              </span>
            </div>
            <ProgressBar
              value={(equipment as any).conditioningProgress || 0}
              color={(equipment as any).conditioningProgress >= 100 ? 'success' : (equipment as any).conditioningProgress >= 50 ? 'amber' : 'danger'}
              size="sm"
            />
            {(equipment as any).conditioningDaysRemaining !== undefined && (
              <div className="text-xs text-text-muted">
                {(equipment as any).conditioningDaysRemaining > 0 
                  ? `${(equipment as any).conditioningDaysRemaining} დღე დარჩა`
                  : 'დასრულებულია'}
              </div>
            )}
          </div>
        )}

        {/* Volume Info */}
        {(equipment as any).currentVolume !== undefined && (
          <div className="flex items-center gap-3 text-sm">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-text-muted">მოცულობა:</span>
                <span className="font-mono">
                  {(equipment as any).currentVolume}L / {equipment.capacity || 0}L
                </span>
              </div>
              <ProgressBar
                value={equipment.capacity ? ((equipment as any).currentVolume / equipment.capacity) * 100 : 0}
                color="success"
                size="sm"
              />
            </div>
          </div>
        )}



        {/* Next CIP */}

        {equipment.nextCIP && (

          <div className="space-y-2">

            <div className="flex items-center justify-between text-sm">

              <span className="text-text-muted">შემდეგი CIP:</span>

              <span className={`font-medium ${

                isOverdue ? 'text-red-400' :

                daysUntilCIP !== null && daysUntilCIP <= 3 ? 'text-amber-400' :

                'text-text-primary'

              }`}>

                {formatDate(equipment.nextCIP)}

              </span>

            </div>

            {daysUntilCIP !== null && (

              <div className="space-y-1">

                <ProgressBar

                  value={Math.max(0, Math.min(100, cipProgress))}

                  color={cipProgressColor}

                  size="sm"

                />

                <div className="flex items-center justify-between text-xs">

                  <span className="text-text-muted">

                    {isOverdue ? `${Math.abs(daysUntilCIP)} დღე გადაცილებული` : `${daysUntilCIP} დღე დარჩა`}

                  </span>

                </div>

              </div>

            )}

          </div>

        )}



        {/* Last CIP */}

        {equipment.lastCIP && !equipment.nextCIP && (

          <div className="text-sm text-text-muted">

            ბოლო CIP: {formatDate(equipment.lastCIP)}

          </div>

        )}



        {/* Action Link */}

        <div className="pt-2 border-t border-border">

          <Link

            href={`/equipment/${equipment.id}`}

            className="text-sm text-copper-light hover:text-copper transition-colors inline-flex items-center gap-1"

            onClick={(e) => e.stopPropagation()}

          >

            დეტალები →

          </Link>

        </div>

      </CardBody>

      </Card>
    </div>

  )

}

