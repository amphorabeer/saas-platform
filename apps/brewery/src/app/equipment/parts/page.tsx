'use client'



import { useState } from 'react'

import Link from 'next/link'

import { DashboardLayout } from '@/components/layout'

import { Card, CardHeader, CardBody, Button } from '@/components/ui'

import { AddPartModal } from '@/components/equipment'

import { mockSpareParts, mockEquipment, type SparePart } from '@/data/equipmentData'

import { formatDate } from '@/lib/utils'



const getStatusBadge = (part: SparePart) => {

  if (part.quantity === 0) {

    return <span className="px-2 py-1 rounded text-xs font-medium bg-red-400/20 text-red-400">❌ ამოწურული</span>

  }

  if (part.quantity < part.minQuantity) {

    return <span className="px-2 py-1 rounded text-xs font-medium bg-amber-400/20 text-amber-400">⚠️ დაბალი</span>

  }

  return <span className="px-2 py-1 rounded text-xs font-medium bg-green-400/20 text-green-400">✅ მარაგში</span>

}



export default function PartsPage() {

  const [showAddModal, setShowAddModal] = useState(false)

  const [parts, setParts] = useState<SparePart[]>(mockSpareParts)

  const [searchQuery, setSearchQuery] = useState('')



  const filteredParts = parts.filter(part =>

    searchQuery === '' || part.name.toLowerCase().includes(searchQuery.toLowerCase())

  )



  const totalParts = parts.length

  const inStock = parts.filter(p => p.quantity >= p.minQuantity).length

  const lowStock = parts.filter(p => p.quantity > 0 && p.quantity < p.minQuantity).length

  const outOfStock = parts.filter(p => p.quantity === 0).length



  const handleAddPart = (partData: any) => {

    const newPart: SparePart = {

      id: `part-${Date.now()}`,

      ...partData,

    }

    setParts([...parts, newPart])

  }



  const handleQuantityChange = (partId: string, delta: number) => {

    setParts(parts.map(part =>

      part.id === partId

        ? { ...part, quantity: Math.max(0, part.quantity + delta) }

        : part

    ))

  }



  return (

    <DashboardLayout title="🔩 სათადარიგო ნაწილები" breadcrumb="მთავარი / აღჭურვილობა / ნაწილები">

      {/* Header */}

      <div className="flex justify-between items-center mb-6">

        <div className="flex-1 max-w-md">

          <input

            type="text"

            value={searchQuery}

            onChange={(e) => setSearchQuery(e.target.value)}

            placeholder="ძიება..."

            className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"

          />

        </div>

        <Button onClick={() => setShowAddModal(true)} variant="primary" size="sm">

          + ახალი ნაწილი

        </Button>

      </div>



      {/* Stats Cards */}

      <div className="grid grid-cols-4 gap-4 mb-6">

        <Card>

          <CardBody className="p-6">

            <p className="text-3xl font-bold font-display text-blue-400 mb-1">{totalParts}</p>

            <p className="text-sm text-text-muted">სულ ნაწილები</p>

          </CardBody>

        </Card>

        <Card>

          <CardBody className="p-6">

            <p className="text-3xl font-bold font-display text-green-400 mb-1">{inStock}</p>

            <p className="text-sm text-text-muted">მარაგში</p>

          </CardBody>

        </Card>

        <Card>

          <CardBody className="p-6">

            <p className="text-3xl font-bold font-display text-amber-400 mb-1">{lowStock}</p>

            <p className="text-sm text-text-muted">დაბალი მარაგი</p>

          </CardBody>

        </Card>

        <Card>

          <CardBody className="p-6">

            <p className="text-3xl font-bold font-display text-red-400 mb-1">{outOfStock}</p>

            <p className="text-sm text-text-muted">ამოწურული</p>

          </CardBody>

        </Card>

      </div>



      {/* Parts Table */}

      <Card>

        <CardHeader>

          <span className="text-lg font-semibold">ნაწილების სია</span>

        </CardHeader>

        <CardBody>

          <div className="overflow-x-auto">

            <table className="w-full">

              <thead>

                <tr className="border-b border-border">

                  <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">#</th>

                  <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">ნაწილი</th>

                  <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">კატეგორია</th>

                  <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">თავსებადი</th>

                  <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">მარაგი</th>

                  <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">მინ.</th>

                  <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">სტატუსი</th>

                  <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">ფასი</th>

                  <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">მოქმედება</th>

                </tr>

              </thead>

              <tbody>

                {filteredParts.map((part, index) => {

                  const compatibleNames = part.compatibleEquipment

                    .map(id => mockEquipment.find(eq => eq.id === id)?.name)

                    .filter(Boolean)

                    .join(', ')

                  return (

                    <tr key={part.id} className="border-b border-border/50 hover:bg-bg-tertiary transition-colors">

                      <td className="py-3 px-4 text-sm text-text-muted">{index + 1}</td>

                      <td className="py-3 px-4 text-sm font-medium text-text-primary">{part.name}</td>

                      <td className="py-3 px-4 text-sm text-text-muted">{part.category}</td>

                      <td className="py-3 px-4 text-sm text-text-muted max-w-xs truncate" title={compatibleNames}>

                        {compatibleNames || '-'}

                      </td>

                      <td className="py-3 px-4 text-sm text-text-primary text-right">{part.quantity}</td>

                      <td className="py-3 px-4 text-sm text-text-muted text-right">{part.minQuantity}</td>

                      <td className="py-3 px-4 text-sm">{getStatusBadge(part)}</td>

                      <td className="py-3 px-4 text-sm font-medium text-copper-light text-right">{part.price}₾</td>

                      <td className="py-3 px-4 text-sm">

                        <div className="flex items-center gap-2">

                          <button

                            onClick={() => handleQuantityChange(part.id, 1)}

                            className="px-2 py-1 bg-green-400/20 text-green-400 rounded text-xs hover:bg-green-400/30 transition-colors"

                          >

                            +

                          </button>

                          <button

                            onClick={() => handleQuantityChange(part.id, -1)}

                            className="px-2 py-1 bg-red-400/20 text-red-400 rounded text-xs hover:bg-red-400/30 transition-colors"

                          >

                            -

                          </button>

                          {part.quantity === 0 && (

                            <Button variant="outline" size="sm">

                              შეკვეთა

                            </Button>

                          )}

                        </div>

                      </td>

                    </tr>

                  )

                })}

              </tbody>

            </table>

          </div>

        </CardBody>

      </Card>



      {/* Usage History (Sidebar) */}

      <Card className="mt-6">

        <CardHeader>

          <span className="text-lg font-semibold">📜 ბოლო გამოყენება</span>

        </CardHeader>

        <CardBody>

          <div className="space-y-2 text-sm">

            <div className="flex items-center justify-between py-2 border-b border-border/50">

              <span className="text-text-primary">Tri-clamp gasket 4"</span>

              <span className="text-text-muted">FV-01 - {formatDate(new Date('2024-11-20'))}</span>

            </div>

            <div className="flex items-center justify-between py-2 border-b border-border/50">

              <span className="text-text-primary">PRV valve 2 bar</span>

              <span className="text-text-muted">FV-03 - {formatDate(new Date('2024-11-15'))}</span>

            </div>

            <div className="flex items-center justify-between py-2 border-b border-border/50">

              <span className="text-text-primary">Pump seal kit</span>

              <span className="text-text-muted">Pump-01 - {formatDate(new Date('2024-11-01'))}</span>

            </div>

          </div>

        </CardBody>

      </Card>



      {/* Modals */}

      <AddPartModal

        isOpen={showAddModal}

        onClose={() => setShowAddModal(false)}

        onAdd={handleAddPart}

      />

    </DashboardLayout>

  )

}

