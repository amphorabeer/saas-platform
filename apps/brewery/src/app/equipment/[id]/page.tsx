'use client'



import { useParams, useRouter } from 'next/navigation'

import Link from 'next/link'

import { DashboardLayout } from '@/components/layout'

import { Card, CardHeader, CardBody, Button, ProgressBar } from '@/components/ui'

import { MaintenanceModal, CIPLogModal, ProblemReportModal } from '@/components/equipment'

import { mockEquipment, mockCIPLogs, mockProblemReports, mockMaintenanceRecords, equipmentTypeConfig } from '@/data/equipmentData'

import { formatDate } from '@/lib/utils'

import { mockBatches } from '@/data/mockData'



export default function EquipmentDetailPage() {

  const params = useParams()

  const router = useRouter()

  const equipmentId = params.id as string



  const equipment = mockEquipment.find(eq => eq.id === equipmentId)

  const cipLogs = mockCIPLogs.filter(log => log.equipmentId === equipmentId)

  const problemReports = mockProblemReports.filter(rep => rep.equipmentId === equipmentId)

  const maintenanceRecords = mockMaintenanceRecords.filter(rec => rec.equipmentId === equipmentId)

  const currentBatch = equipment?.currentBatchId ? mockBatches.find(b => b.id === equipment.currentBatchId) : null



  if (!equipment) {

    return (

      <DashboardLayout title="აღჭურვილობა ვერ მოიძებნა" breadcrumb="მთავარი / აღჭურვილობა">

        <div className="text-center py-12">

          <p className="text-text-muted">აღჭურვილობა ვერ მოიძებნა</p>

          <Link href="/equipment" className="text-copper-light hover:text-copper mt-4 inline-block">

            ← უკან

          </Link>

        </div>

      </DashboardLayout>

    )

  }



  const typeConfig = equipmentTypeConfig[equipment.type]

  const statusConfigs = {

    operational: { label: '✅ მუშა', class: 'bg-green-400/20 text-green-400' },

    needs_maintenance: { label: '⚠️ მოვლა საჭირო', class: 'bg-amber-400/20 text-amber-400' },

    under_maintenance: { label: '🔧 მოვლაზე', class: 'bg-blue-400/20 text-blue-400' },

    out_of_service: { label: '🔴 გაუმართავი', class: 'bg-red-400/20 text-red-400' },

  }

  const statusConfig = statusConfigs[equipment.status]



  const getDaysUntil = (date?: Date): number | null => {

    if (!date) return null

    const now = new Date()

    const diffTime = date.getTime() - now.getTime()

    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  }



  return (

    <DashboardLayout title={`${typeConfig.icon} ${equipment.name}`} breadcrumb="მთავარი / აღჭურვილობა / დეტალები">

      {/* Header */}

      <div className="flex justify-between items-center mb-6">

        <Link href="/equipment" className="text-sm text-copper-light hover:text-copper transition-colors">

          ← უკან

        </Link>

        <div className="flex gap-2">

          <span className={`px-3 py-1 rounded text-sm font-medium ${statusConfig.class}`}>

            {statusConfig.label}

          </span>

          <Button variant="outline" size="sm">

            ✏️ რედაქტირება

          </Button>

          <Button variant="outline" size="sm">

            🔧 მოვლის დაგეგმვა

          </Button>

          <Button variant="outline" size="sm">

            ⚠️ პრობლემის რეპორტი

          </Button>

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

                  <span className="text-text-muted">სახელი:</span>

                  <span className="ml-2 font-medium text-text-primary">{equipment.name}</span>

                </div>

                <div>

                  <span className="text-text-muted">ტიპი:</span>

                  <span className="ml-2 font-medium text-text-primary">{typeConfig.name}</span>

                </div>

                {equipment.model && (

                  <div>

                    <span className="text-text-muted">მოდელი:</span>

                    <span className="ml-2 font-medium text-text-primary">{equipment.model}</span>

                  </div>

                )}

                {equipment.manufacturer && (

                  <div>

                    <span className="text-text-muted">მწარმოებელი:</span>

                    <span className="ml-2 font-medium text-text-primary">{equipment.manufacturer}</span>

                  </div>

                )}

                {equipment.serialNumber && (

                  <div>

                    <span className="text-text-muted">სერიული #:</span>

                    <span className="ml-2 font-medium text-text-primary">{equipment.serialNumber}</span>

                  </div>

                )}

                {equipment.capacity && (

                  <div>

                    <span className="text-text-muted">ტევადობა:</span>

                    <span className="ml-2 font-medium text-text-primary">{equipment.capacity.toLocaleString('en-US')} L</span>

                  </div>

                )}

                {equipment.workingPressure && (

                  <div>

                    <span className="text-text-muted">მუშა წნევა:</span>

                    <span className="ml-2 font-medium text-text-primary">{equipment.workingPressure} bar</span>

                  </div>

                )}

                <div>

                  <span className="text-text-muted">ინსტალაცია:</span>

                  <span className="ml-2 font-medium text-text-primary">{formatDate(equipment.installationDate)}</span>

                </div>

                {equipment.warrantyDate && (

                  <div>

                    <span className="text-text-muted">გარანტია:</span>

                    <span className="ml-2 font-medium text-text-primary">

                      {formatDate(equipment.warrantyDate)}

                      {(() => {

                        const daysLeft = getDaysUntil(equipment.warrantyDate)

                        return daysLeft !== null && daysLeft > 0 ? ` (დარჩა ${Math.ceil(daysLeft / 30)} თვე)` : ''

                      })()}

                    </span>

                  </div>

                )}

                <div>

                  <span className="text-text-muted">მდებარეობა:</span>

                  <span className="ml-2 font-medium text-text-primary">{equipment.location}</span>

                </div>

              </div>

            </CardBody>

          </Card>



          {/* Current Status */}

          <Card>

            <CardHeader>

              <span className="text-lg font-semibold">📊 მიმდინარე სტატუსი</span>

            </CardHeader>

            <CardBody className="space-y-3">

              <div className="grid grid-cols-2 gap-4 text-sm">

                <div>

                  <span className="text-text-muted">სტატუსი:</span>

                  <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${statusConfig.class}`}>

                    {statusConfig.label}

                  </span>

                </div>

                {equipment.currentTemp !== undefined && (

                  <div>

                    <span className="text-text-muted">ტემპერატურა:</span>

                    <span className="ml-2 font-medium text-text-primary">{equipment.currentTemp}°C</span>

                  </div>

                )}

                {equipment.currentPressure !== undefined && (

                  <div>

                    <span className="text-text-muted">წნევა:</span>

                    <span className="ml-2 font-medium text-text-primary">{equipment.currentPressure} bar</span>

                  </div>

                )}

              </div>

              {currentBatch && (

                <div className="pt-3 border-t border-border space-y-2 text-sm">

                  <div>

                    <span className="text-text-muted">მიმდინარე პარტია:</span>

                    <span className="ml-2 font-medium text-copper-light">{equipment.currentBatchNumber}</span>

                  </div>

                  <div>

                    <span className="text-text-muted">რეცეპტი:</span>

                    <span className="ml-2 font-medium text-text-primary">{currentBatch.recipeName}</span>

                  </div>

                  <div className="grid grid-cols-2 gap-4">

                    <div>

                      <span className="text-text-muted">დაწყება:</span>

                      <span className="ml-2 font-medium text-text-primary">{formatDate(currentBatch.startDate)}</span>

                    </div>

                    <div>

                      <span className="text-text-muted">სავარაუდო დასრულება:</span>

                      <span className="ml-2 font-medium text-text-primary">{formatDate(currentBatch.estimatedEndDate)}</span>

                    </div>

                  </div>

                </div>

              )}

            </CardBody>

          </Card>



          {/* CIP History */}

          <Card>

            <CardHeader className="flex items-center justify-between">

              <span className="text-lg font-semibold">🧹 CIP გაწმენდის ისტორია</span>

              <Button variant="outline" size="sm">

                + CIP ჩანაწერი

              </Button>

            </CardHeader>

            <CardBody>

              <div className="overflow-x-auto">

                <table className="w-full">

                  <thead>

                    <tr className="border-b border-border">

                      <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">თარიღი</th>

                      <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">ტიპი</th>

                      <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">ხანგრძლივობა</th>

                      <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">შემსრულებელი</th>

                      <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">შენიშვნა</th>

                    </tr>

                  </thead>

                  <tbody>

                    {cipLogs.map(log => (

                      <tr key={log.id} className="border-b border-border/50 hover:bg-bg-tertiary transition-colors">

                        <td className="py-3 px-4 text-sm text-text-primary">{formatDate(log.date)}</td>

                        <td className="py-3 px-4 text-sm text-text-primary">{log.cipType}</td>

                        <td className="py-3 px-4 text-sm text-text-primary">{log.duration} წუთი</td>

                        <td className="py-3 px-4 text-sm text-text-muted">{log.performedBy}</td>

                        <td className="py-3 px-4 text-sm text-text-muted">{log.notes || '-'}</td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            </CardBody>

          </Card>



          {/* Problem Reports */}

          <Card>

            <CardHeader className="flex items-center justify-between">

              <span className="text-lg font-semibold">🔴 პრობლემების ჟურნალი</span>

              <Button variant="outline" size="sm">

                + პრობლემის რეპორტი

              </Button>

            </CardHeader>

            <CardBody>

              <div className="overflow-x-auto">

                <table className="w-full">

                  <thead>

                    <tr className="border-b border-border">

                      <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">თარიღი</th>

                      <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">პრობლემა</th>

                      <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">სიმძიმე</th>

                      <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">სტატუსი</th>

                      <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">გადაწყვეტა</th>

                    </tr>

                  </thead>

                  <tbody>

                    {problemReports.map(rep => (

                      <tr key={rep.id} className="border-b border-border/50 hover:bg-bg-tertiary transition-colors">

                        <td className="py-3 px-4 text-sm text-text-primary">{formatDate(rep.reportedDate)}</td>

                        <td className="py-3 px-4 text-sm text-text-primary">{rep.problemType}</td>

                        <td className="py-3 px-4 text-sm">

                          <span className={`px-2 py-1 rounded text-xs font-medium ${

                            rep.severity === 'high' ? 'bg-red-400/20 text-red-400' :

                            rep.severity === 'medium' ? 'bg-amber-400/20 text-amber-400' :

                            'bg-green-400/20 text-green-400'

                          }`}>

                            {rep.severity === 'high' ? '🔴' : rep.severity === 'medium' ? '🟡' : '🟢'} {rep.severity}

                          </span>

                        </td>

                        <td className="py-3 px-4 text-sm">

                          <span className={`px-2 py-1 rounded text-xs font-medium ${

                            rep.status === 'resolved' ? 'bg-green-400/20 text-green-400' :

                            rep.status === 'in_progress' ? 'bg-blue-400/20 text-blue-400' :

                            'bg-gray-400/20 text-gray-400'

                          }`}>

                            {rep.status === 'resolved' ? '✅' : rep.status === 'in_progress' ? '🔄' : '⏳'} {rep.status}

                          </span>

                        </td>

                        <td className="py-3 px-4 text-sm text-text-muted">{rep.resolution || '-'}</td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            </CardBody>

          </Card>



          {/* Maintenance History */}

          <Card>

            <CardHeader>

              <span className="text-lg font-semibold">🔧 ტექ. მომსახურების ისტორია</span>

            </CardHeader>

            <CardBody>

              <div className="overflow-x-auto">

                <table className="w-full">

                  <thead>

                    <tr className="border-b border-border">

                      <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">თარიღი</th>

                      <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">ტიპი</th>

                      <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">აღწერა</th>

                      <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">შემსრულებელი</th>

                      <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">ხარჯი</th>

                    </tr>

                  </thead>

                  <tbody>

                    {maintenanceRecords.filter(r => r.status === 'completed').map(rec => (

                      <tr key={rec.id} className="border-b border-border/50 hover:bg-bg-tertiary transition-colors">

                        <td className="py-3 px-4 text-sm text-text-primary">{formatDate(rec.completedDate!)}</td>

                        <td className="py-3 px-4 text-sm text-text-primary">{rec.type}</td>

                        <td className="py-3 px-4 text-sm text-text-primary">{rec.description || '-'}</td>

                        <td className="py-3 px-4 text-sm text-text-muted">{rec.performedBy || '-'}</td>

                        <td className="py-3 px-4 text-sm font-medium text-copper-light">{rec.cost ? `${rec.cost}₾` : '-'}</td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

              <div className="mt-4 pt-4 border-t border-border">

                <div className="flex items-center justify-between text-sm">

                  <span className="text-text-muted">სულ ხარჯი (2024):</span>

                  <span className="font-semibold text-copper-light">

                    {maintenanceRecords

                      .filter(r => r.status === 'completed' && r.cost)

                      .reduce((sum, r) => sum + (r.cost || 0), 0)}₾

                  </span>

                </div>

              </div>

            </CardBody>

          </Card>

        </div>



        {/* Right Column - 1/3 */}

        <div className="col-span-1 space-y-6">

          {/* Upcoming Maintenance */}

          <Card>

            <CardHeader>

              <span className="text-lg font-semibold">📅 მომავალი მოვლა</span>

            </CardHeader>

            <CardBody className="space-y-4">

              {equipment.nextCIP && (

                <div>

                  <div className="flex items-center gap-2 mb-1">

                    <span className="text-green-400">🟢</span>

                    <span className="text-sm font-medium">შემდეგი CIP:</span>

                  </div>

                  <div className="text-sm text-text-primary ml-6">{formatDate(equipment.nextCIP)}</div>

                  {(() => {

                    const daysLeft = getDaysUntil(equipment.nextCIP)

                    return daysLeft !== null && (

                      <div className="text-xs text-text-muted ml-6">დარჩა {daysLeft} დღე</div>

                    )

                  })()}

                </div>

              )}

              {equipment.annualMaintenanceDate && (

                <div>

                  <div className="flex items-center gap-2 mb-1">

                    <span className="text-blue-400">🔵</span>

                    <span className="text-sm font-medium">წლიური მოვლა:</span>

                  </div>

                  <div className="text-sm text-text-primary ml-6">{formatDate(equipment.annualMaintenanceDate)}</div>

                  {(() => {

                    const daysLeft = getDaysUntil(equipment.annualMaintenanceDate)

                    return daysLeft !== null && (

                      <div className="text-xs text-text-muted ml-6">დარჩა {daysLeft} დღე</div>

                    )

                  })()}

                </div>

              )}

            </CardBody>

          </Card>



          {/* Spare Parts */}

          <Card>

            <CardHeader>

              <span className="text-lg font-semibold">🔩 სათადარიგო ნაწილები</span>

            </CardHeader>

            <CardBody>

              <div className="space-y-2 text-sm">

                <div>

                  <span className="text-text-muted">Tri-clamp gasket 4"</span>

                  <span className="ml-2 text-green-400">- მარაგში: 3</span>

                </div>

                <div>

                  <span className="text-text-muted">თერმომეტრის probe</span>

                  <span className="ml-2 text-green-400">- მარაგში: 1</span>

                </div>

                <div>

                  <span className="text-text-muted">PRV valve 2 bar</span>

                  <span className="ml-2 text-red-400">- მარაგში: 0 ❌</span>

                </div>

              </div>

              <Link href="/equipment/parts" className="text-sm text-copper-light hover:text-copper mt-4 inline-block">

                ნაწილების მართვა →

              </Link>

            </CardBody>

          </Card>



          {/* Statistics */}

          <Card>

            <CardHeader>

              <span className="text-lg font-semibold">📈 სტატისტიკა</span>

            </CardHeader>

            <CardBody className="space-y-3 text-sm">

              {equipment.totalHours && (

                <div>

                  <span className="text-text-muted">გამოყენების დრო:</span>

                  <span className="ml-2 font-medium text-text-primary">{equipment.totalHours} სთ</span>

                </div>

              )}

              {equipment.totalBatches && (

                <div>

                  <span className="text-text-muted">პარტიები:</span>

                  <span className="ml-2 font-medium text-text-primary">{equipment.totalBatches}</span>

                </div>

              )}

              {equipment.uptime !== undefined && (

                <div>

                  <span className="text-text-muted">Uptime:</span>

                  <span className="ml-2 font-medium text-text-primary">{equipment.uptime}%</span>

                </div>

              )}

            </CardBody>

          </Card>

        </div>

      </div>

    </DashboardLayout>

  )

}

