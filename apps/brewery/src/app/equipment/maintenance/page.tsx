'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout'
import { Card, CardHeader, CardBody, Button } from '@/components/ui'
import { MaintenanceModal } from '@/components/equipment'
import { maintenanceTypeConfig, type MaintenanceRecord, type Priority } from '@/data/equipmentData'
import { formatDate } from '@/lib/utils'

// Equipment type for API response
interface Equipment {
  id: string
  name: string
  type: string
  status: string
}



const getPriorityBadge = (priority: Priority) => {

  const configs = {

    high: { icon: '🔴', label: 'მაღალი', class: 'text-red-400' },

    medium: { icon: '🟡', label: 'საშუალო', class: 'text-amber-400' },

    low: { icon: '🟢', label: 'დაბალი', class: 'text-green-400' },

  }

  const config = configs[priority]

  return <span className={`text-xs ${config.class}`}>{config.icon} {config.label}</span>

}



const getStatusBadge = (status: MaintenanceRecord['status']) => {

  const configs = {

    scheduled: { label: '⏳ მოლოდინში', class: 'bg-gray-400/20 text-gray-400' },

    completed: { label: '✅ შესრულებული', class: 'bg-green-400/20 text-green-400' },

    overdue: { label: '❌ ვადაგადაცილებული', class: 'bg-red-400/20 text-red-400' },

  }

  const config = configs[status]

  return <span className={`px-2 py-1 rounded text-xs font-medium ${config.class}`}>{config.label}</span>

}



export default function MaintenancePage() {
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<MaintenanceRecord | null>(null)
  const [records, setRecords] = useState<MaintenanceRecord[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [filterEquipment, setFilterEquipment] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')

  // Fetch equipment and maintenance records from API
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Fetch equipment
        const eqResponse = await fetch('/api/equipment')
        if (eqResponse.ok) {
          const eqData = await eqResponse.json()
          const equipmentList = eqData.equipment || eqData || []
          setEquipment(equipmentList)

          // Fetch maintenance logs for each equipment
          const allRecords: MaintenanceRecord[] = []
          for (const eq of equipmentList) {
            try {
              const maintResponse = await fetch(`/api/equipment/${eq.id}/maintenance`)
              if (maintResponse.ok) {
                const logs = await maintResponse.json()
                const logsArray = Array.isArray(logs) ? logs : []
                
                for (const log of logsArray) {
                  // Determine status based on dates
                  let status: 'scheduled' | 'completed' | 'overdue' = 'scheduled'
                  if (log.status === 'completed' || log.completedDate) {
                    status = 'completed'
                  } else if (log.scheduledDate && new Date(log.scheduledDate) < new Date()) {
                    status = 'overdue'
                  }

                  allRecords.push({
                    id: log.id,
                    equipmentId: eq.id,
                    equipmentName: eq.name,
                    type: log.type?.toLowerCase() || 'other',
                    status,
                    scheduledDate: new Date(log.scheduledDate || log.createdAt),
                    completedDate: log.completedDate ? new Date(log.completedDate) : undefined,
                    duration: log.duration,
                    performedBy: log.performedBy,
                    cost: log.cost,
                    partsUsed: log.partsUsed || [],
                    description: log.description,
                    priority: (log.priority?.toLowerCase() || 'medium') as Priority,
                  })
                }
              }
            } catch (err) {
              console.log(`[MaintenancePage] No maintenance logs for ${eq.name}`)
            }
          }
          setRecords(allRecords)
          console.log(`[MaintenancePage] Loaded ${allRecords.length} maintenance records from API`)
        }
      } catch (error) {
        console.error('[MaintenancePage] Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Open complete modal for a maintenance record
  const handleOpenCompleteModal = (record: MaintenanceRecord) => {
    setSelectedRecord(record)
    setShowCompleteModal(true)
  }

  // Handle completing a maintenance record (called from modal)
  const handleCompleteRecord = async (completionData: {
    performedBy?: string
    duration?: number
    cost?: number
    notes?: string
  }) => {
    if (!selectedRecord) return
    
    try {
      // Call API to update maintenance record in database
      const response = await fetch(`/api/equipment/${selectedRecord.equipmentId}/maintenance`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maintenanceId: selectedRecord.id,
          status: 'completed',
          completedDate: new Date().toISOString(),
          performedBy: completionData.performedBy,
          duration: completionData.duration,
          cost: completionData.cost,
        }),
      })

      if (response.ok) {
        // Update local state
        setRecords(prevRecords => 
          prevRecords.map(rec => 
            rec.id === selectedRecord.id 
              ? { 
                  ...rec, 
                  status: 'completed' as const, 
                  completedDate: new Date(),
                  performedBy: completionData.performedBy,
                  duration: completionData.duration,
                  cost: completionData.cost,
                }
              : rec
          )
        )
        console.log(`[MaintenancePage] Marked record ${selectedRecord.id} as completed`)
        setShowCompleteModal(false)
        setSelectedRecord(null)
      } else {
        console.error('[MaintenancePage] Failed to update maintenance record')
      }
    } catch (error) {
      console.error('[MaintenancePage] Error completing record:', error)
    }
  }

  const filteredRecords = records.filter(rec => {

    if (filterEquipment !== 'all' && rec.equipmentId !== filterEquipment) return false

    if (filterType !== 'all' && rec.type !== filterType) return false

    return true

  })



  const scheduled = records.filter(r => r.status === 'scheduled').length

  const overdue = records.filter(r => r.status === 'overdue').length

  const thisWeek = records.filter(r => {

    if (r.status !== 'scheduled') return false

    const now = new Date()

    const weekEnd = new Date(now)

    weekEnd.setDate(now.getDate() + 7)

    return r.scheduledDate >= now && r.scheduledDate <= weekEnd

  }).length

  const completedThisMonth = records.filter(r => {

    if (r.status !== 'completed' || !r.completedDate) return false

    const now = new Date()

    return r.completedDate.getMonth() === now.getMonth() &&

           r.completedDate.getFullYear() === now.getFullYear()

  }).length



  const overdueRecords = records.filter(r => r.status === 'overdue')

  const scheduledRecords = records.filter(r => r.status === 'scheduled').sort((a, b) =>

    a.scheduledDate.getTime() - b.scheduledDate.getTime()

  )

  const completedRecords = records.filter(r => r.status === 'completed').sort((a, b) =>

    (b.completedDate?.getTime() || 0) - (a.completedDate?.getTime() || 0)

  ).slice(0, 3)



  const getDaysUntil = (date: Date): number => {

    const now = new Date()

    const diffTime = date.getTime() - now.getTime()

    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  }

  if (loading) {
    return (
      <DashboardLayout title="📅 ტექ. მომსახურების გრაფიკი" breadcrumb="მთავარი / აღჭურვილობა / მოვლა">
        <div className="flex items-center justify-center h-64">
          <div className="text-text-muted">იტვირთება...</div>
        </div>
      </DashboardLayout>
    )
  }

  return (

    <DashboardLayout title="📅 ტექ. მომსახურების გრაფიკი" breadcrumb="მთავარი / აღჭურვილობა / მოვლა">

      {/* Header */}

      <div className="flex justify-between items-center mb-6">

        <Link href="/equipment" className="text-sm text-copper-light hover:text-copper transition-colors">

          ← უკან

        </Link>

        <div className="flex items-center gap-4">

          <div className="flex gap-2">

            <button

              onClick={() => setViewMode('list')}

              className={`px-3 py-1 rounded text-sm ${viewMode === 'list' ? 'bg-copper text-white' : 'bg-bg-card'}`}

            >

              სია

            </button>

            <button

              onClick={() => setViewMode('calendar')}

              className={`px-3 py-1 rounded text-sm ${viewMode === 'calendar' ? 'bg-copper text-white' : 'bg-bg-card'}`}

            >

              კალენდარი

            </button>

          </div>

          <select

            value={filterEquipment}

            onChange={(e) => setFilterEquipment(e.target.value)}

            className="px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"

          >

            <option value="all">ყველა აღჭურვილობა</option>
            {equipment.map(eq => (
              <option key={eq.id} value={eq.id}>{eq.name}</option>
            ))}

          </select>

          <select

            value={filterType}

            onChange={(e) => setFilterType(e.target.value)}

            className="px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"

          >

            <option value="all">ყველა ტიპი</option>

            {Object.entries(maintenanceTypeConfig).map(([key, config]) => (

              <option key={key} value={key}>{config.name}</option>

            ))}

          </select>

          <Button onClick={() => setShowMaintenanceModal(true)} variant="primary" size="sm">

            + მოვლის დაგეგმვა

          </Button>

        </div>

      </div>



      {/* Stats Cards */}

      <div className="grid grid-cols-4 gap-4 mb-6">

        <Card>

          <CardBody className="p-6">

            <p className="text-3xl font-bold font-display text-blue-400 mb-1">{scheduled}</p>

            <p className="text-sm text-text-muted">დაგეგმილი</p>

          </CardBody>

        </Card>

        <Card>

          <CardBody className="p-6">

            <p className="text-3xl font-bold font-display text-red-400 mb-1">{overdue}</p>

            <p className="text-sm text-text-muted">ვადაგადაცილებული</p>

          </CardBody>

        </Card>

        <Card>

          <CardBody className="p-6">

            <p className="text-3xl font-bold font-display text-amber-400 mb-1">{thisWeek}</p>

            <p className="text-sm text-text-muted">ამ კვირაში</p>

          </CardBody>

        </Card>

        <Card>

          <CardBody className="p-6">

            <p className="text-3xl font-bold font-display text-green-400 mb-1">{completedThisMonth}</p>

            <p className="text-sm text-text-muted">შესრულებული (თვე)</p>

          </CardBody>

        </Card>

      </div>



      {/* Overdue Alert */}

      {overdueRecords.length > 0 && (

        <Card className="mb-6 border-red-500/50 bg-red-500/10">

          <CardHeader>

            <span className="text-lg font-semibold text-red-400">🚨 ვადაგადაცილებული</span>

          </CardHeader>

          <CardBody>

            <div className="space-y-2">

              {overdueRecords.map(rec => {

                const daysOverdue = Math.ceil((new Date().getTime() - rec.scheduledDate.getTime()) / (1000 * 60 * 60 * 24))

                return (

                  <div key={rec.id} className="flex items-center justify-between p-3 bg-bg-card rounded-lg">

                    <div className="flex items-center gap-3">

                      <span className="text-red-400">❌</span>

                      <div>

                        <span className="font-medium">{rec.equipmentName}</span>

                        <span className="text-sm text-text-muted ml-2">| {maintenanceTypeConfig[rec.type].name}</span>

                        <span className="text-sm text-text-muted ml-2">| ვადა: {formatDate(rec.scheduledDate)}</span>

                        <span className="text-sm text-red-400 ml-2">| {daysOverdue} დღით გადაცილებული</span>

                      </div>

                    </div>

                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={() => handleOpenCompleteModal(rec)}
                    >
                      შესრულება

                    </Button>

                  </div>

                )

              })}

            </div>

          </CardBody>

        </Card>

      )}



      {/* Scheduled Maintenance Table */}

      <Card className="mb-6">

        <CardHeader>

          <span className="text-lg font-semibold">დაგეგმილი მოვლა</span>

        </CardHeader>

        <CardBody>

          <div className="overflow-x-auto">

            <table className="w-full">

              <thead>

                <tr className="border-b border-border">

                  <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">#</th>

                  <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">აღჭურვილობა</th>

                  <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">მოვლის ტიპი</th>

                  <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">ვადა</th>

                  <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">დარჩა</th>

                  <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">პრიორიტეტი</th>

                  <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">მდგომარეობა</th>

                  <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">მოქმედება</th>

                </tr>

              </thead>

              <tbody>

                {scheduledRecords.map((rec, index) => {

                  const daysLeft = getDaysUntil(rec.scheduledDate)

                  return (

                    <tr key={rec.id} className="border-b border-border/50 hover:bg-bg-tertiary transition-colors">

                      <td className="py-3 px-4 text-sm text-text-muted">{index + 1}</td>

                      <td className="py-3 px-4 text-sm font-medium text-copper-light">{rec.equipmentName}</td>

                      <td className="py-3 px-4 text-sm text-text-primary">{maintenanceTypeConfig[rec.type].name}</td>

                      <td className="py-3 px-4 text-sm text-text-primary">{formatDate(rec.scheduledDate)}</td>

                      <td className="py-3 px-4 text-sm text-text-muted">{daysLeft} დღე</td>

                      <td className="py-3 px-4 text-sm">{getPriorityBadge(rec.priority)}</td>

                      <td className="py-3 px-4 text-sm">{getStatusBadge(rec.status)}</td>

                      <td className="py-3 px-4 text-sm">
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => handleOpenCompleteModal(rec)}
                        >
                          შესრულება
                        </Button>
                      </td>

                    </tr>

                  )

                })}

              </tbody>

            </table>

          </div>

        </CardBody>

      </Card>



      {/* Recently Completed */}

      <Card>

        <CardHeader>

          <span className="text-lg font-semibold">✅ ბოლო შესრულებული</span>

        </CardHeader>

        <CardBody>

          <div className="overflow-x-auto">

            <table className="w-full">

              <thead>

                <tr className="border-b border-border">

                  <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">აღჭურვილობა</th>

                  <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">მოვლის ტიპი</th>

                  <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">შესრულდა</th>

                  <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">შემსრულებელი</th>

                </tr>

              </thead>

              <tbody>

                {completedRecords.map(rec => (

                  <tr key={rec.id} className="border-b border-border/50 hover:bg-bg-tertiary transition-colors">

                    <td className="py-3 px-4 text-sm font-medium text-copper-light">{rec.equipmentName}</td>

                    <td className="py-3 px-4 text-sm text-text-primary">{maintenanceTypeConfig[rec.type].name}</td>

                    <td className="py-3 px-4 text-sm text-text-primary">{formatDate(rec.completedDate!)}</td>

                    <td className="py-3 px-4 text-sm text-text-muted">{rec.performedBy || '-'}</td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </CardBody>

      </Card>



      {/* Modals */}
      <MaintenanceModal
        isOpen={showMaintenanceModal}
        onClose={() => setShowMaintenanceModal(false)}
        onSave={async (data) => {
          try {
            // Save to API
            const response = await fetch(`/api/equipment/${data.equipmentId}/maintenance`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: data.type,
                status: data.status || 'scheduled',
                priority: data.priority || 'medium',
                scheduledDate: data.scheduledDate,
                completedDate: data.completedDate,
                duration: data.duration,
                performedBy: data.performedBy,
                cost: data.cost,
                partsUsed: data.partsUsed,
                description: data.description,
              }),
            })

            if (response.ok) {
              const savedRecord = await response.json()
              // Find equipment name
              const eq = equipment.find(e => e.id === data.equipmentId)
              
              const newRecord: MaintenanceRecord = {
                id: savedRecord.id || `maint-${Date.now()}`,
                equipmentId: data.equipmentId,
                equipmentName: eq?.name || data.equipmentName,
                type: data.type,
                status: data.status || 'scheduled',
                priority: data.priority || 'medium',
                scheduledDate: new Date(data.scheduledDate),
                completedDate: data.completedDate ? new Date(data.completedDate) : undefined,
                duration: data.duration,
                performedBy: data.performedBy,
                cost: data.cost,
                partsUsed: data.partsUsed,
                description: data.description,
              }
              setRecords([...records, newRecord])
              setShowMaintenanceModal(false)
            } else {
              console.error('[MaintenancePage] Failed to save maintenance record')
            }
          } catch (error) {
            console.error('[MaintenancePage] Error saving maintenance:', error)
          }
        }}
      />

      {/* Complete Maintenance Modal */}
      {showCompleteModal && selectedRecord && (
        <CompleteMaintenanceModal
          isOpen={showCompleteModal}
          onClose={() => {
            setShowCompleteModal(false)
            setSelectedRecord(null)
          }}
          record={selectedRecord}
          onComplete={handleCompleteRecord}
        />
      )}
    </DashboardLayout>
  )
}

// Complete Maintenance Modal Component
function CompleteMaintenanceModal({ 
  isOpen, 
  onClose, 
  record, 
  onComplete 
}: { 
  isOpen: boolean
  onClose: () => void
  record: MaintenanceRecord
  onComplete: (data: { performedBy?: string; duration?: number; cost?: number; notes?: string }) => void
}) {
  const [performedBy, setPerformedBy] = useState('')
  const [duration, setDuration] = useState('')
  const [cost, setCost] = useState('')
  const [notes, setNotes] = useState('')
  const [users, setUsers] = useState<{id: string, name: string, email: string}[]>([])

  useEffect(() => {
    if (isOpen) {
      fetch('/api/users')
        .then(res => res.ok ? res.json() : [])
        .then(data => setUsers(data.users || data || []))
        .catch(() => setUsers([]))
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onComplete({
      performedBy: performedBy || undefined,
      duration: duration ? parseInt(duration) : undefined,
      cost: cost ? parseFloat(cost) : undefined,
      notes: notes || undefined,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-bg-secondary rounded-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">✅ მოვლის შესრულება</h2>
        
        <div className="mb-4 p-3 bg-bg-card rounded-lg">
          <p className="text-sm text-text-muted">აღჭურვილობა:</p>
          <p className="font-medium">{record.equipmentName}</p>
          <p className="text-sm text-text-muted mt-2">მოვლის ტიპი:</p>
          <p className="font-medium">{maintenanceTypeConfig[record.type]?.name || record.type}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">შემსრულებელი</label>
            <select
              value={performedBy}
              onChange={(e) => setPerformedBy(e.target.value)}
              className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"
            >
              <option value="">აირჩიეთ</option>
              {users.map(user => (
                <option key={user.id} value={user.name || user.email}>
                  {user.name || user.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">ხანგრძლივობა (წუთი)</label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"
              placeholder="მაგ: 30"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">ხარჯი (₾)</label>
            <input
              type="number"
              step="0.01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"
              placeholder="მაგ: 50.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">შენიშვნა</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"
              rows={3}
              placeholder="დამატებითი ინფორმაცია..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              გაუქმება
            </Button>
            <Button type="submit" variant="primary" className="flex-1">
              ✅ შესრულება
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}