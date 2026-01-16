'use client'



import { useState } from 'react'

import Link from 'next/link'

import { DashboardLayout } from '@/components/layout'

import { Card, CardHeader, CardBody, Button } from '@/components/ui'

import { MaintenanceModal } from '@/components/equipment'

import { mockMaintenanceRecords, mockEquipment, maintenanceTypeConfig, type MaintenanceRecord, type Priority } from '@/data/equipmentData'

import { formatDate } from '@/lib/utils'



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

  const [records, setRecords] = useState<MaintenanceRecord[]>(mockMaintenanceRecords)

  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')

  const [filterEquipment, setFilterEquipment] = useState<string>('all')

  const [filterType, setFilterType] = useState<string>('all')



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

            {mockEquipment.map(eq => (

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

                    <Button variant="secondary" size="sm">

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

                        <Button variant="secondary" size="sm">

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

        onSave={(data) => {

          const newRecord: MaintenanceRecord = {

            id: `maint-${Date.now()}`,

            ...data,

            status: data.status || 'scheduled',

            priority: data.priority || 'medium',

          }

          setRecords([...records, newRecord])

        }}

      />

    </DashboardLayout>

  )

}

