'use client'



import Link from 'next/link'

import { Card, CardHeader, CardBody, ProgressBar } from '@/components/ui'

import { formatDate } from '@/lib/utils'

import { equipmentTypeConfig, type Equipment } from '@/data/equipmentData'



interface EquipmentCardProps {

  equipment: Equipment

  onClick: () => void

}



const getStatusConfig = (status: Equipment['status']) => {

  const configs = {

    operational: { label: '✅ მუშა', borderColor: 'border-l-green-500', bgColor: 'bg-green-500/10' },

    needs_maintenance: { label: '⚠️ მოვლა საჭირო', borderColor: 'border-l-amber-500', bgColor: 'bg-amber-500/10' },

    under_maintenance: { label: '🔧 მოვლაზე', borderColor: 'border-l-blue-500', bgColor: 'bg-blue-500/10' },

    out_of_service: { label: '🔴 გაუმართავი', borderColor: 'border-l-red-500', bgColor: 'bg-red-500/10' },

  }

  return configs[status]

}



const getDaysUntilCIP = (nextCIP?: Date): number | null => {

  if (!nextCIP) return null

  const now = new Date()

  const diffTime = nextCIP.getTime() - now.getTime()

  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return diffDays

}



const getCIPProgressColor = (daysLeft: number | null): 'green' | 'amber' | 'red' => {

  if (daysLeft === null) return 'green'

  if (daysLeft < 0) return 'red' // Overdue

  if (daysLeft <= 3) return 'red'

  if (daysLeft <= 7) return 'amber'

  return 'green'

}



export function EquipmentCard({ equipment, onClick }: EquipmentCardProps) {

  const typeConfig = equipmentTypeConfig[equipment.type]

  const statusConfig = getStatusConfig(equipment.status)

  const daysUntilCIP = getDaysUntilCIP(equipment.nextCIP)

  const cipProgressColor = getCIPProgressColor(daysUntilCIP)

  const cipProgress = equipment.nextCIP && equipment.lastCIP

    ? Math.max(0, Math.min(100, ((7 - (daysUntilCIP || 0)) / 7) * 100))

    : 0

  const isOverdue = daysUntilCIP !== null && daysUntilCIP < 0

  const needsPulse = equipment.status === 'needs_maintenance' || isOverdue



  return (

    <Card

      className={`cursor-pointer hover:border-copper/50 transition-all border-l-4 ${statusConfig.borderColor} ${needsPulse ? 'animate-pulse' : ''}`}

      onClick={onClick}

    >

      <CardHeader className="pb-3">

        <div className="flex items-start justify-between">

          <div className="flex items-center gap-2">

            <span className="text-xl">{typeConfig.icon}</span>

            <div>

              <h3 className="font-semibold text-lg text-copper-light">{equipment.name}</h3>

              <p className="text-xs text-text-muted">{typeConfig.name}</p>

            </div>

          </div>

          <span className={`px-2 py-1 rounded text-xs font-medium ${statusConfig.bgColor} ${

            equipment.status === 'operational' ? 'text-green-400' :

            equipment.status === 'needs_maintenance' ? 'text-amber-400' :

            equipment.status === 'under_maintenance' ? 'text-blue-400' :

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



        {/* Current Status */}

        {(equipment.currentTemp !== undefined || equipment.currentPressure !== undefined) && (

          <div className="flex items-center gap-4 text-sm">

            {equipment.currentTemp !== undefined && (

              <div className="flex items-center gap-1">

                <span>🌡️</span>

                <span className="text-text-primary">{equipment.currentTemp}°C</span>

              </div>

            )}

            {equipment.currentPressure !== undefined && (

              <div className="flex items-center gap-1">

                <span>📊</span>

                <span className="text-text-primary">{equipment.currentPressure} bar</span>

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

  )

}

