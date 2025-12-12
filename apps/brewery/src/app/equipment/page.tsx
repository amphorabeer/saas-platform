'use client'



import { useState } from 'react'

import Link from 'next/link'

import { DashboardLayout } from '@/components/layout'

import { Card, CardHeader, CardBody, Button } from '@/components/ui'

import { EquipmentCard, AddEquipmentModal } from '@/components/equipment'

import { mockEquipment, type Equipment, type EquipmentType, type EquipmentStatus } from '@/data/equipmentData'

import { formatDate } from '@/lib/utils'



export default function EquipmentPage() {

  const [showAddModal, setShowAddModal] = useState(false)

  const [equipment, setEquipment] = useState<Equipment[]>(mockEquipment)

  const [filterType, setFilterType] = useState<string>('all')

  const [filterStatus, setFilterStatus] = useState<string>('all')



  const filteredEquipment = equipment.filter(eq => {

    if (filterType !== 'all' && eq.type !== filterType) return false

    if (filterStatus !== 'all' && eq.status !== filterStatus) return false

    return true

  })



  const totalEquipment = equipment.length

  const operational = equipment.filter(e => e.status === 'operational').length

  const needsMaintenance = equipment.filter(e => e.status === 'needs_maintenance').length

  const outOfService = equipment.filter(e => e.status === 'out_of_service').length

  const overdueMaintenance = equipment.filter(eq => {

    if (!eq.nextCIP) return false

    const now = new Date()

    return eq.nextCIP < now

  })



  const handleAddEquipment = (equipmentData: any) => {

    const newEquipment: Equipment = {

      id: `eq-${Date.now()}`,

      ...equipmentData,

      status: equipmentData.status || 'operational',

    }

    setEquipment([...equipment, newEquipment])

  }



  return (

    <DashboardLayout title="⚙️ აღჭურვილობა" breadcrumb="მთავარი / აღჭურვილობა">

      {/* Header */}

      <div className="flex justify-between items-center mb-6">

        <div className="flex gap-4">

          <select

            value={filterType}

            onChange={(e) => setFilterType(e.target.value)}

            className="px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"

          >

            <option value="all">ყველა ტიპი</option>

            <option value="fermenter">ტანკები</option>

            <option value="brite">Brite Tanks</option>

            <option value="kettle">საწარმოო</option>

            <option value="pump">დამხმარე</option>

          </select>

          <select

            value={filterStatus}

            onChange={(e) => setFilterStatus(e.target.value)}

            className="px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"

          >

            <option value="all">ყველა სტატუსი</option>

            <option value="operational">მუშა</option>

            <option value="needs_maintenance">მოვლა საჭირო</option>

            <option value="under_maintenance">მოვლაზე</option>

            <option value="out_of_service">გაუმართავი</option>

          </select>

        </div>

        <div className="flex gap-2">

          <Link href="/equipment/maintenance">

            <Button variant="outline" size="sm">

              📅 მოვლის გრაფიკი

            </Button>

          </Link>

          <Button onClick={() => setShowAddModal(true)} variant="primary" size="sm">

            + ახალი აღჭურვილობა

          </Button>

        </div>

      </div>



      {/* Stats Cards */}

      <div className="grid grid-cols-4 gap-4 mb-6">

        <Card>

          <CardBody className="p-6">

            <p className="text-3xl font-bold font-display text-blue-400 mb-1">{totalEquipment}</p>

            <p className="text-sm text-text-muted">სულ აღჭურვილობა</p>

          </CardBody>

        </Card>

        <Card>

          <CardBody className="p-6">

            <p className="text-3xl font-bold font-display text-green-400 mb-1">{operational}</p>

            <p className="text-sm text-text-muted">მუშა ({Math.round(operational / totalEquipment * 100)}%)</p>

          </CardBody>

        </Card>

        <Card>

          <CardBody className="p-6">

            <p className="text-3xl font-bold font-display text-amber-400 mb-1">{needsMaintenance}</p>

            <p className="text-sm text-text-muted">მოვლა საჭირო</p>

          </CardBody>

        </Card>

        <Card>

          <CardBody className="p-6">

            <p className="text-3xl font-bold font-display text-red-400 mb-1">{outOfService}</p>

            <p className="text-sm text-text-muted">გაუმართავი</p>

          </CardBody>

        </Card>

      </div>



      {/* Equipment Grid */}

      <div className="grid grid-cols-3 gap-6 mb-6">

        {filteredEquipment.map(eq => (

          <EquipmentCard

            key={eq.id}

            equipment={eq}

            onClick={() => window.location.href = `/equipment/${eq.id}`}

          />

        ))}

      </div>



      {/* Urgent Maintenance Alert */}

      {overdueMaintenance.length > 0 && (

        <Card className="border-amber-500/50 bg-amber-500/10">

          <CardHeader>

            <span className="text-lg font-semibold text-amber-400">🚨 გადაუდებელი მოვლა</span>

          </CardHeader>

          <CardBody>

            <div className="space-y-2">

              {overdueMaintenance.map(eq => {

                const daysOverdue = eq.nextCIP ? Math.ceil((new Date().getTime() - eq.nextCIP.getTime()) / (1000 * 60 * 60 * 24)) : 0

                return (

                  <div key={eq.id} className="flex items-center justify-between p-3 bg-bg-card rounded-lg">

                    <div className="flex items-center gap-3">

                      <span className="text-amber-400">⚠️</span>

                      <div>

                        <span className="font-medium">{eq.name}</span>

                        <span className="text-sm text-text-muted ml-2">

                          | CIP გაწმენდა ვადაგადაცილებული {daysOverdue} დღით

                        </span>

                      </div>

                    </div>

                    <Button variant="outline" size="sm">

                      შესრულება

                    </Button>

                  </div>

                )

              })}

            </div>

          </CardBody>

        </Card>

      )}



      {/* Modals */}

      <AddEquipmentModal

        isOpen={showAddModal}

        onClose={() => setShowAddModal(false)}

        onAdd={handleAddEquipment}

      />

    </DashboardLayout>

  )

}

