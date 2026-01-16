'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout'
import { Card, CardHeader, CardBody, Button } from '@/components/ui'
import { EditEquipmentModal, MaintenanceModal, CIPLogModal, ProblemReportModal } from '@/components/equipment'
import { formatDate } from '@/lib/utils'

interface Equipment {
  id: string
  name: string
  type: string
  status: string
  capacity?: number
  model?: string
  manufacturer?: string
  serialNumber?: string
  location?: string
  capabilities?: string[]
  workingPressure?: number
  currentTemp?: number
  currentPressure?: number
  currentBatchNumber?: string
  currentBatchId?: string
  installationDate?: string
  warrantyDate?: string
  lastCIP?: string
  nextCIP?: string
  lastMaintenance?: string
  nextMaintenance?: string
  cipIntervalDays?: number
  inspectionIntervalDays?: number
  annualMaintenanceDays?: number
  notes?: string
  cipLogs?: any[]
  maintenanceLogs?: any[]
  problemReports?: any[]
  tankAssignments?: Array<{
    id: string
    phase: string
    status: string
    lot?: {
      lotNumber: string
      lotBatches?: Array<{
        batch: {
          batchNumber: string
          status: string
        }
      }>
    }
  }>
}

const getStatusConfig = (status: string) => {
  const normalizedStatus = (status || 'operational').toLowerCase()
  const configs: Record<string, { label: string; class: string }> = {
    operational: { label: '✅ მუშა', class: 'bg-green-400/20 text-green-400' },
    needs_maintenance: { label: '⚠️ მოვლა საჭირო', class: 'bg-amber-400/20 text-amber-400' },
    under_maintenance: { label: '🔧 მოვლაზე', class: 'bg-blue-400/20 text-blue-400' },
    out_of_service: { label: '🔴 გაუმართავი', class: 'bg-red-400/20 text-red-400' },
  }
  return configs[normalizedStatus] || configs['operational']
}

const getTypeConfig = (type: string) => {
  const normalizedType = (type || 'fermenter').toLowerCase()
  const configs: Record<string, { icon: string; name: string }> = {
    fermenter: { icon: '🧪', name: 'ფერმენტატორი' },
    unitank: { icon: '🔄', name: 'Unitank' },
    brite: { icon: '✨', name: 'Brite Tank' },
    kettle: { icon: '🫕', name: 'საწარმოს ქვაბი' },
    mash_tun: { icon: '🌾', name: 'Mash Tun' },
    hlt: { icon: '🔥', name: 'HLT' },
    pump: { icon: '⚙️', name: 'ტუმბო' },
    chiller: { icon: '❄️', name: 'ჩილერი' },
    filter: { icon: '🔍', name: 'ფილტრი' },
    other: { icon: '🔧', name: 'სხვა' },
  }
  return configs[normalizedType] || configs['other']
}

const cipTypeLabels: Record<string, string> = {
  full: 'სრული CIP',
  caustic_only: 'კაუსტიკი',
  sanitizer_only: 'სანიტაიზერი',
  rinse: 'გამოვლება',
}

export default function EquipmentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const equipmentId = params.id as string

  // State
  const [equipment, setEquipment] = useState<Equipment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal states
  const [showEditModal, setShowEditModal] = useState(false)
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false)
  const [showProblemModal, setShowProblemModal] = useState(false)
  const [showCIPModal, setShowCIPModal] = useState(false)

  // Fetch equipment from API
  const fetchEquipment = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/equipment/${equipmentId}`)
      if (!response.ok) {
        throw new Error('Equipment not found')
      }
      const data = await response.json()
      setEquipment(data)
    } catch (err) {
      setError('აღჭურვილობა ვერ მოიძებნა')
      console.error('Error fetching equipment:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (equipmentId) {
      fetchEquipment()
    }
  }, [equipmentId])

  // Handlers
  const handleUpdate = async (id: string, updates: Partial<Equipment>) => {
    try {
      const response = await fetch(`/api/equipment/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (response.ok) {
        fetchEquipment()
        setShowEditModal(false)
      }
    } catch (err) {
      console.error('Error updating:', err)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('დარწმუნებული ხართ რომ გინდათ წაშლა?')) return

    try {
      const response = await fetch(`/api/equipment/${id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        router.push('/equipment')
      }
    } catch (err) {
      console.error('Error deleting:', err)
    }
  }

  const handleAddCIP = async (cipData: any) => {
    try {
      const response = await fetch(`/api/equipment/${equipmentId}/cip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cipData),
      })
      if (response.ok) {
        fetchEquipment()
        setShowCIPModal(false)
        alert('CIP ჩანაწერი დამატებულია!')
      }
    } catch (err) {
      console.error('Error adding CIP:', err)
    }
  }

  const handleAddMaintenance = async (maintenanceData: any) => {
    try {
      const response = await fetch(`/api/equipment/${equipmentId}/maintenance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maintenanceData),
      })
      if (response.ok) {
        fetchEquipment()
        setShowMaintenanceModal(false)
        alert('მოვლა დაგეგმილია!')
      }
    } catch (err) {
      console.error('Error adding maintenance:', err)
    }
  }

  const getDaysUntil = (date?: string): number => {
    if (!date) return 0
    const now = new Date()
    const target = new Date(date)
    const diffTime = target.getTime() - now.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  // Loading state
  if (loading) {
    return (
      <DashboardLayout title="იტვირთება...">
        <div className="text-center py-12">
          <p className="text-slate-400">იტვირთება...</p>
        </div>
      </DashboardLayout>
    )
  }

  // Error state
  if (error || !equipment) {
    return (
      <DashboardLayout title="ვერ მოიძებნა">
        <div className="text-center py-12">
          <p className="text-slate-400 text-lg mb-4">{error || 'აღჭურვილობა ვერ მოიძებნა'}</p>
          <Link href="/equipment" className="text-amber-400 hover:underline">
            ← უკან დაბრუნება
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  const typeConfig = getTypeConfig(equipment.type)
  const statusConfig = getStatusConfig(equipment.status)

  return (
    <DashboardLayout 
      title={`${typeConfig.icon} ${equipment.name}`} 
      breadcrumb="მთავარი / აღჭურვილობა / დეტალები"
    >
      {/* Header */}
      <div className="mb-6">
        {/* Top row: back + edit */}
        <div className="flex justify-between items-center mb-2">
          <Link href="/equipment" className="text-sm text-amber-400 hover:text-amber-300 transition-colors">
            ← უკან
          </Link>
          <Button 
            variant="secondary" 
            size="sm"
            onClick={() => setShowEditModal(true)}
          >
            ✏️ რედაქტირება
          </Button>
        </div>
        
        {/* Title row */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">{equipment.name}</h1>
            <p className="text-sm text-slate-400">{typeConfig.name} | {equipment.location || 'მდებარეობა არ არის'}</p>
          </div>
          
          {/* Action buttons */}
          <div className="flex gap-2">
            <span className={`px-3 py-1 rounded text-sm font-medium ${statusConfig.class}`}>
              {statusConfig.label}
            </span>
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => setShowCIPModal(true)}
            >
              🧹 CIP ჩანაწერი
            </Button>
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => setShowMaintenanceModal(true)}
            >
              🔧 მოვლა
            </Button>
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => setShowProblemModal(true)}
            >
              ⚠️ პრობლემა
            </Button>
          </div>
        </div>
      </div>

      {/* 2 Column Layout */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - 2/3 */}
        <div className="col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <span className="text-lg font-semibold">📋 ძირითადი ინფორმაცია</span>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-400">სახელი:</span>
                  <span className="ml-2 font-medium">{equipment.name}</span>
                </div>
                <div>
                  <span className="text-slate-400">ტიპი:</span>
                  <span className="ml-2 font-medium">{typeConfig.icon} {typeConfig.name}</span>
                </div>
                {equipment.capacity && (
                  <div>
                    <span className="text-slate-400">ტევადობა:</span>
                    <span className="ml-2 font-medium">{equipment.capacity.toLocaleString()} L</span>
                  </div>
                )}
                {equipment.model && (
                  <div>
                    <span className="text-slate-400">მოდელი:</span>
                    <span className="ml-2 font-medium">{equipment.model}</span>
                  </div>
                )}
                {equipment.manufacturer && (
                  <div>
                    <span className="text-slate-400">მწარმოებელი:</span>
                    <span className="ml-2 font-medium">{equipment.manufacturer}</span>
                  </div>
                )}
                {equipment.serialNumber && (
                  <div>
                    <span className="text-slate-400">სერიული #:</span>
                    <span className="ml-2 font-medium">{equipment.serialNumber}</span>
                  </div>
                )}
                {equipment.workingPressure && (
                  <div>
                    <span className="text-slate-400">სამუშაო წნევა:</span>
                    <span className="ml-2 font-medium">{equipment.workingPressure} bar</span>
                  </div>
                )}
                {equipment.location && (
                  <div>
                    <span className="text-slate-400">მდებარეობა:</span>
                    <span className="ml-2 font-medium">{equipment.location}</span>
                  </div>
                )}
              </div>

              {/* Capabilities */}
              {equipment.capabilities && equipment.capabilities.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <p className="text-slate-400 text-sm mb-2">შესაძლებლობები:</p>
                  <div className="flex gap-2">
                    {equipment.capabilities.map((cap, i) => (
                      <span key={i} className="px-2 py-1 bg-slate-700 rounded text-sm">
                        {cap === 'FERMENTING' ? '🧪 ფერმენტაცია' : '❄️ კონდიცირება'}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          {/* CIP History */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">🧹 CIP ისტორია</span>
                <Button variant="secondary" size="sm" onClick={() => setShowCIPModal(true)}>
                  + ჩანაწერი
                </Button>
              </div>
            </CardHeader>
            <CardBody>
              {equipment.cipLogs && equipment.cipLogs.length > 0 ? (
                <div className="space-y-2">
                  {equipment.cipLogs.map((log, i) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-slate-700/30 rounded">
                      <div>
                        <span className="font-medium">{formatDate(log.date)}</span>
                        <span className="text-slate-400 ml-2">| {cipTypeLabels[log.cipType] || log.cipType}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-slate-400 text-sm">{log.duration} წთ</span>
                        <span className={log.result === 'success' ? 'text-green-400' : 'text-amber-400'}>
                          {log.result === 'success' ? '✅' : '⚠️'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-center py-4">CIP ჩანაწერები არ არის</p>
              )}
            </CardBody>
          </Card>

          {/* Maintenance History */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">🔧 მოვლის ისტორია</span>
                <Button variant="secondary" size="sm" onClick={() => setShowMaintenanceModal(true)}>
                  + მოვლა
                </Button>
              </div>
            </CardHeader>
            <CardBody>
              {equipment.maintenanceLogs && equipment.maintenanceLogs.length > 0 ? (
                <div className="space-y-2">
                  {equipment.maintenanceLogs.map((log, i) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-slate-700/30 rounded">
                      <div>
                        <span className="font-medium">{log.type}</span>
                        <span className="text-slate-400 ml-2">| {log.performedBy || 'უცნობი'}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-slate-400 text-sm">
                          {formatDate(log.completedDate || log.scheduledDate)}
                        </span>
                        <span className={log.status === 'completed' ? 'text-green-400' : 'text-amber-400'}>
                          {log.status === 'completed' ? '✅' : '⏳'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-center py-4">მოვლის ჩანაწერები არ არის</p>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Right Column - 1/3 */}
        <div className="col-span-1 space-y-6">
          {/* Current Status */}
          <Card>
            <CardHeader>
              <span className="text-lg font-semibold">📊 მიმდინარე სტატუსი</span>
            </CardHeader>
            <CardBody className="space-y-4">
              {equipment.currentTemp != null && (
                <div className="flex justify-between">
                  <span className="text-slate-400">🌡️ ტემპერატურა</span>
                  <span className="font-medium">{equipment.currentTemp}°C</span>
                </div>
              )}
              {equipment.currentPressure != null && (
                <div className="flex justify-between">
                  <span className="text-slate-400">📊 წნევა</span>
                  <span className="font-medium">{equipment.currentPressure} bar</span>
                </div>
              )}
              {equipment.currentBatchNumber && (
                <div className="flex justify-between">
                  <span className="text-slate-400">🍺 მიმდინარე პარტია</span>
                  <span className="font-medium text-amber-400">{equipment.currentBatchNumber}</span>
                </div>
              )}
              {equipment.tankAssignments && equipment.tankAssignments.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-400">📋 ფაზა</span>
                  <span className="font-medium text-amber-400">
                    {equipment.tankAssignments[0]?.phase === 'FERMENTATION' ? 'ფერმენტაცია' : 
                     equipment.tankAssignments[0]?.phase === 'CONDITIONING' ? 'კონდიცირება' : 
                     equipment.tankAssignments[0]?.phase === 'PACKAGING' ? 'შეფუთვა' : 
                     equipment.tankAssignments[0]?.phase || '-'}
                  </span>
                </div>
              )}
              {equipment.currentTemp == null && equipment.currentPressure == null && !equipment.currentBatchNumber && (
                <p className="text-slate-400 text-center text-sm">მონაცემები არ არის</p>
              )}
            </CardBody>
          </Card>

          {/* Upcoming Maintenance */}
          <Card>
            <CardHeader>
              <span className="text-lg font-semibold">📅 მომავალი მოვლა</span>
            </CardHeader>
            <CardBody className="space-y-4">
              {equipment.nextCIP && (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-green-400">🧹</span>
                    <span className="text-sm font-medium">შემდეგი CIP:</span>
                  </div>
                  <div className="text-sm ml-6">{formatDate(equipment.nextCIP)}</div>
                  {(() => {
                    const daysUntilCIP = getDaysUntil(equipment.nextCIP)
                    return (
                      <div className={`text-xs ml-6 ${
                        daysUntilCIP < 0 ? 'text-red-400' : 
                        daysUntilCIP < 3 ? 'text-amber-400' : 
                        'text-slate-400'
                      }`}>
                        {daysUntilCIP < 0 
                          ? `🔴 გადაცილებულია ${Math.abs(daysUntilCIP)} დღით` 
                          : `🟢 დარჩა ${daysUntilCIP} დღე`
                        }
                      </div>
                    )
                  })()}
                </div>
              )}
              {equipment.nextMaintenance && (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-blue-400">🔧</span>
                    <span className="text-sm font-medium">შემდეგი მოვლა:</span>
                  </div>
                  <div className="text-sm ml-6">{formatDate(equipment.nextMaintenance)}</div>
                </div>
              )}
              {!equipment.nextCIP && !equipment.nextMaintenance && (
                <p className="text-slate-400 text-center text-sm">დაგეგმილი მოვლა არ არის</p>
              )}
            </CardBody>
          </Card>

          {/* Notes */}
          {equipment.notes && (
            <Card>
              <CardHeader>
                <span className="text-lg font-semibold">📝 შენიშვნები</span>
              </CardHeader>
              <CardBody>
                <p className="text-sm text-slate-300">{equipment.notes}</p>
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      {/* Modals */}
      {showEditModal && (
        <EditEquipmentModal
          equipment={equipment as any}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSave={handleUpdate as any}
          onDelete={handleDelete as any}
        />
      )}

      {showCIPModal && (
        <CIPLogModal
          isOpen={showCIPModal}
          onClose={() => setShowCIPModal(false)}
          equipmentId={equipment.id}
          equipmentName={equipment.name}
          onSave={handleAddCIP}
        />
      )}

      {showMaintenanceModal && (
        <MaintenanceModal
          isOpen={showMaintenanceModal}
          onClose={() => setShowMaintenanceModal(false)}
          equipmentId={equipment.id}
          equipmentName={equipment.name}
          onSave={handleAddMaintenance}
        />
      )}

      {showProblemModal && (
        <ProblemReportModal
          isOpen={showProblemModal}
          onClose={() => setShowProblemModal(false)}
          equipmentId={equipment.id}
          equipmentName={equipment.name}
          onSave={(data) => {
            // TODO: Add problem report API
            console.log('Problem report:', data)
            setShowProblemModal(false)
            alert('პრობლემა დარეგისტრირდა!')
          }}
        />
      )}
    </DashboardLayout>
  )
}