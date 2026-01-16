'use client'



import { useState, useEffect } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { DashboardLayout } from '@/components/layout'

import { Card, CardHeader, CardBody, Button } from '@/components/ui'

import { EquipmentCard, AddEquipmentModal } from '@/components/equipment'

import { formatDate } from '@/lib/utils'

interface Equipment {
  id: string
  name: string
  type: string
  status: string
  capacity?: number
  model?: string
  manufacturer?: string
  location?: string
  capabilities?: string[]
  nextCIP?: string
  lastCIP?: string
  currentTemp?: number
  currentPressure?: number
  currentBatchNumber?: string
}

export default function EquipmentPage() {
  const router = useRouter()
  const [showAddModal, setShowAddModal] = useState(false)
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  // Fetch equipment from API
  const fetchEquipment = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterType !== 'all') params.set('type', filterType)
      if (filterStatus !== 'all') params.set('status', filterStatus)
      
      const response = await fetch(`/api/equipment?${params}`)
      if (response.ok) {
        const data = await response.json()
        setEquipment(data)
      }
    } catch (error) {
      console.error('Error fetching equipment:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEquipment()
  }, [filterType, filterStatus])

  const handleAddEquipment = async (equipmentData: any) => {
    try {
      const response = await fetch('/api/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...equipmentData,
          type: equipmentData.type?.toUpperCase() || 'FERMENTER',
          status: equipmentData.status?.toUpperCase() || 'OPERATIONAL',
        }),
      })
      
      if (response.ok) {
        setShowAddModal(false)
        fetchEquipment() // Refresh list
      } else {
        const error = await response.json()
        console.error('Error adding equipment:', error)
        alert('შეცდომა: ' + (error.error || 'აღჭურვილობის დამატება ვერ მოხერხდა'))
      }
    } catch (error) {
      console.error('Error adding equipment:', error)
      alert('აღჭურვილობის დამატება ვერ მოხერხდა')
    }
  }

  // Stats
  const totalEquipment = equipment.length
  const operational = equipment.filter(e => e.status === 'OPERATIONAL').length
  const needsMaintenance = equipment.filter(e => e.status === 'NEEDS_MAINTENANCE').length
  const outOfService = equipment.filter(e => e.status === 'OUT_OF_SERVICE').length
  const unitanks = equipment.filter(e => e.type === 'UNITANK').length

  const overdueMaintenance = equipment.filter(eq => {
    if (!eq.nextCIP) return false
    return new Date(eq.nextCIP) < new Date()
  })

  if (loading) {
    return (
      <DashboardLayout title="⚙️ აღჭურვილობა" breadcrumb="მთავარი / აღჭურვილობა">
        <div className="text-center py-12">
          <p className="text-slate-400">იტვირთება...</p>
        </div>
      </DashboardLayout>
    )
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

            <option value="fermenter">ფერმენტატორები</option>

            <option value="unitank">Unitank</option>

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

            <Button variant="secondary" size="sm">

              📅 მოვლის გრაფიკი

            </Button>

          </Link>

          <Button onClick={() => setShowAddModal(true)} variant="primary" size="sm">

            + ახალი აღჭურვილობა

          </Button>

        </div>

      </div>



      {/* Stats Cards */}

      <div className="grid grid-cols-5 gap-4 mb-6">

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

        <Card>

          <CardBody className="p-6">

            <p className="text-3xl font-bold font-display text-purple-400 mb-1">{unitanks}</p>

            <p className="text-sm text-text-muted">Unitank</p>

          </CardBody>

        </Card>

      </div>



      {/* Equipment Grid */}

      <div className="grid grid-cols-3 gap-6 mb-6">

        {equipment.map(eq => (

          <EquipmentCard

            key={eq.id}

            equipment={eq as any}

            onClick={() => router.push(`/equipment/${eq.id}`)}

          />

        ))}

      </div>

      {equipment.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">⚙️</div>
          <p className="text-slate-400 text-lg">აღჭურვილობა არ მოიძებნა</p>
          <Button 
            onClick={() => setShowAddModal(true)} 
            variant="primary" 
            className="mt-4"
          >
            + დაამატე პირველი აღჭურვილობა
          </Button>
        </div>
      )}



      {/* Urgent Maintenance Alert */}

      {overdueMaintenance.length > 0 && (

        <Card className="border-amber-500/50 bg-amber-500/10">

          <CardHeader>

            <span className="text-lg font-semibold text-amber-400">🚨 გადაუდებელი მოვლა</span>

          </CardHeader>

          <CardBody>

            <div className="space-y-2">

              {overdueMaintenance.map(eq => {

                const daysOverdue = eq.nextCIP ? Math.ceil((new Date().getTime() - new Date(eq.nextCIP).getTime()) / (1000 * 60 * 60 * 24)) : 0

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



      {/* Modals */}

      <AddEquipmentModal

        isOpen={showAddModal}

        onClose={() => setShowAddModal(false)}

        onAdd={handleAddEquipment}

      />

    </DashboardLayout>

  )

}

