'use client'



import { useState, useEffect } from 'react'

import { useParams, useRouter } from 'next/navigation'

import { DashboardLayout } from '@/components/layout'

import { Card, CardHeader, CardBody, Button, ProgressBar, BatchStatusBadge } from '@/components/ui'

import { StartBrewingModal, getIngredientStockStatus } from '@/components/brewery'

import { PackagingModal, EditBatchModal, BatchReportModal } from '@/components/production'

import { formatDate, formatTime, formatShortDate } from '@/lib/utils'



interface GravityReading {

  id: string

  date: Date

  gravity: number

  temperature: number

  notes?: string

  recordedBy: string

}



interface TimelineEvent {

  id: string

  date: Date

  type: 'start' | 'transfer' | 'reading' | 'addition' | 'note' | 'complete'

  title: string

  description: string

  user: string

  data?: Record<string, any>

}



interface BatchDetail {

  id: string

  batchNumber: string

  recipe: {

    id: string

    name: string

    style: string

  }

  status: string

  tank: {

    id: string

    name: string

    type: string

  }

  volume: number

  brewDate: Date

  estimatedEndDate: Date

  targetOG: number

  targetFG: number

  targetABV: number

  actualOG?: number

  actualFG?: number

  actualABV?: number

  currentGravity: number

  currentTemperature: number

  progress: number

  gravityReadings: GravityReading[]

  timeline: TimelineEvent[]

  notes: string

  brewer: string

  ingredients: {

    name: string

    amount: number

    unit: string

    type: string

  }[]

}



const mockBatch: BatchDetail = {

  id: '1',

  batchNumber: 'BRW-2024-0156',

  recipe: {

    id: '1',

    name: 'Georgian Amber Lager',

    style: 'Amber Lager',

  },

  status: 'fermenting',

  tank: {

    id: 'fv-01',

    name: 'FV-01',

    type: 'ფერმენტატორი',

  },

  volume: 1850,

  brewDate: new Date('2024-12-01'),

  estimatedEndDate: new Date('2024-12-22'),

  targetOG: 1.052,

  targetFG: 1.012,

  targetABV: 5.2,

  actualOG: 1.054,

  currentGravity: 1.018,

  currentTemperature: 12.3,

  progress: 65,

  gravityReadings: [

    { id: '1', date: new Date('2024-12-01'), gravity: 1.054, temperature: 12.0, notes: 'საწყისი გაზომვა', recordedBy: 'ნ. ზედგინიძე' },

    { id: '2', date: new Date('2024-12-03'), gravity: 1.042, temperature: 12.2, recordedBy: 'ნ. ზედგინიძე' },

    { id: '3', date: new Date('2024-12-05'), gravity: 1.032, temperature: 12.1, recordedBy: 'გ. კაპანაძე' },

    { id: '4', date: new Date('2024-12-07'), gravity: 1.024, temperature: 12.3, recordedBy: 'ნ. ზედგინიძე' },

    { id: '5', date: new Date('2024-12-09'), gravity: 1.020, temperature: 12.2, recordedBy: 'ნ. ზედგინიძე' },

    { id: '6', date: new Date('2024-12-11'), gravity: 1.018, temperature: 12.3, notes: 'ფერმენტაცია ნელდება', recordedBy: 'ნ. ზედგინიძე' },

  ],

  timeline: [

    { id: '1', date: new Date('2024-12-01T08:00'), type: 'start', title: 'ხარშვა დაიწყო', description: 'მეიშინგი 65°C-ზე', user: 'ნ. ზედგინიძე', data: { temperature: 65 } },

    { id: '2', date: new Date('2024-12-01T09:30'), type: 'addition', title: 'სვიის დამატება', description: 'Saaz 1.2kg @ 60წთ', user: 'ნ. ზედგინიძე' },

    { id: '3', date: new Date('2024-12-01T10:15'), type: 'addition', title: 'სვიის დამატება', description: 'Tettnanger 0.6kg @ 15წთ', user: 'ნ. ზედგინიძე' },

    { id: '4', date: new Date('2024-12-01T11:00'), type: 'transfer', title: 'გადატანა FV-01', description: 'გაცივება 12°C-მდე, საფუვრის დამატება', user: 'ნ. ზედგინიძე' },

    { id: '5', date: new Date('2024-12-01T11:30'), type: 'reading', title: 'OG გაზომვა', description: 'საწყისი სიმკვრივე: 1.054', user: 'ნ. ზედგინიძე', data: { gravity: 1.054 } },

    { id: '6', date: new Date('2024-12-03T08:00'), type: 'reading', title: 'სიმკვრივის გაზომვა', description: 'SG: 1.042, აქტიური ფერმენტაცია', user: 'ნ. ზედგინიძე', data: { gravity: 1.042 } },

    { id: '7', date: new Date('2024-12-05T08:00'), type: 'reading', title: 'სიმკვრივის გაზომვა', description: 'SG: 1.032', user: 'გ. კაპანაძე', data: { gravity: 1.032 } },

    { id: '8', date: new Date('2024-12-07T08:00'), type: 'reading', title: 'სიმკვრივის გაზომვა', description: 'SG: 1.024', user: 'ნ. ზედგინიძე', data: { gravity: 1.024 } },

    { id: '9', date: new Date('2024-12-09T08:00'), type: 'reading', title: 'სიმკვრივის გაზომვა', description: 'SG: 1.020, ფერმენტაცია ნელდება', user: 'ნ. ზედგინიძე', data: { gravity: 1.020 } },

    { id: '10', date: new Date('2024-12-11T08:00'), type: 'reading', title: 'სიმკვრივის გაზომვა', description: 'SG: 1.018', user: 'ნ. ზედგინიძე', data: { gravity: 1.018 } },

    { id: '11', date: new Date('2024-12-11T09:00'), type: 'note', title: 'შენიშვნა', description: 'კიდევ 2-3 დღე სამიზნე FG-მდე', user: 'ნ. ზედგინიძე' },

  ],

  notes: 'პირველი პარტია ახალი რეცეპტით. ტემპერატურის კონტროლი კრიტიკულია.',

  brewer: 'ნიკა ზედგინიძე',

  ingredients: [

    { name: 'Pilsner Malt', amount: 85, unit: 'kg', type: 'grain' },

    { name: 'Munich Malt', amount: 24, unit: 'kg', type: 'grain' },

    { name: 'Crystal 60L', amount: 12, unit: 'kg', type: 'grain' },

    { name: 'Saaz', amount: 1.2, unit: 'kg', type: 'hop' },

    { name: 'Tettnanger', amount: 0.6, unit: 'kg', type: 'hop' },

    { name: 'Saflager W-34/70', amount: 6, unit: 'პაკეტი', type: 'yeast' },

  ],

}



export default function BatchDetailPage() {

  const params = useParams()

  const router = useRouter()

  const [batch, setBatch] = useState<BatchDetail | null>(null)

  const [activeTab, setActiveTab] = useState<'overview' | 'readings' | 'timeline' | 'ingredients'>('overview')

  const [showAddReading, setShowAddReading] = useState(false)

  const [newReading, setNewReading] = useState({ gravity: '', temperature: '', notes: '' })

  const [showStartBrewing, setShowStartBrewing] = useState(false)

  const [showPackaging, setShowPackaging] = useState(false)

  const [showEditModal, setShowEditModal] = useState(false)

  const [showReportModal, setShowReportModal] = useState(false)



  // Mock recipe ingredients with stock info for StartBrewingModal

  const recipeIngredientsWithStock = [

    { id: '1', name: 'Pilsner Malt', type: 'grain' as const, requiredAmount: 85, unit: 'kg', stockAmount: 450, stockStatus: getIngredientStockStatus(85, 450) },

    { id: '2', name: 'Munich Malt', type: 'grain' as const, requiredAmount: 24, unit: 'kg', stockAmount: 120, stockStatus: getIngredientStockStatus(24, 120) },

    { id: '3', name: 'Crystal 60L', type: 'grain' as const, requiredAmount: 12, unit: 'kg', stockAmount: 15, stockStatus: getIngredientStockStatus(12, 15) },

    { id: '4', name: 'Saaz', type: 'hop' as const, requiredAmount: 1.2, unit: 'kg', stockAmount: 8, stockStatus: getIngredientStockStatus(1.2, 8) },

    { id: '5', name: 'Tettnanger', type: 'hop' as const, requiredAmount: 0.6, unit: 'kg', stockAmount: 3, stockStatus: getIngredientStockStatus(0.6, 3) },

    { id: '6', name: 'Saflager W-34/70', type: 'yeast' as const, requiredAmount: 6, unit: 'პაკეტი', stockAmount: 12, stockStatus: getIngredientStockStatus(6, 12) },

  ]



  const handleStartBrewing = (confirmedIngredients: { id: string; amount: number }[]) => {

    console.log('Starting brewing with ingredients:', confirmedIngredients)

    // Here you would:

    // 1. Update inventory (deduct ingredients)

    // 2. Update batch status to 'brewing'

    // 3. Add timeline event

    setBatch(prev => prev ? { ...prev, status: 'brewing' } : null)

    setShowStartBrewing(false)

    // Show success message

    alert('ხარშვა დაიწყო! ინგრედიენტები ჩამოიჭრა მარაგიდან.')

  }



  useEffect(() => {

    // In real app, fetch batch by params.id

    setBatch(mockBatch)

  }, [params.id])



  if (!batch) {

    return (

      <DashboardLayout title="იტვირთება..." breadcrumb="მთავარი / წარმოება">

        <div className="flex items-center justify-center h-64">

          <div className="animate-spin w-8 h-8 border-2 border-copper border-t-transparent rounded-full" />

        </div>

      </DashboardLayout>

    )

  }



  const currentABV = batch.actualOG 

    ? ((batch.actualOG - batch.currentGravity) * 131.25).toFixed(1)

    : '0'



  const attenuation = batch.actualOG

    ? (((batch.actualOG - batch.currentGravity) / (batch.actualOG - batch.targetFG)) * 100).toFixed(0)

    : '0'



  const daysInFermentation = Math.floor((Date.now() - batch.brewDate.getTime()) / (1000 * 60 * 60 * 24))

  const daysRemaining = Math.max(0, Math.floor((batch.estimatedEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))



  const handleAddReading = () => {

    if (!newReading.gravity || !newReading.temperature) return

    

    const reading: GravityReading = {

      id: Date.now().toString(),

      date: new Date(),

      gravity: parseFloat(newReading.gravity),

      temperature: parseFloat(newReading.temperature),

      notes: newReading.notes,

      recordedBy: 'ნ. ზედგინიძე',

    }

    

    setBatch(prev => prev ? {

      ...prev,

      currentGravity: reading.gravity,

      currentTemperature: reading.temperature,

      gravityReadings: [...prev.gravityReadings, reading],

    } : null)

    

    setNewReading({ gravity: '', temperature: '', notes: '' })

    setShowAddReading(false)

  }



  const EVENT_ICONS: Record<string, string> = {

    start: '🚀',

    transfer: '🔄',

    reading: '📊',

    addition: '➕',

    note: '📝',

    complete: '✅',

  }



  const EVENT_COLORS: Record<string, string> = {

    start: 'bg-green-400',

    transfer: 'bg-blue-400',

    reading: 'bg-purple-400',

    addition: 'bg-amber-400',

    note: 'bg-gray-400',

    complete: 'bg-copper',

  }



  return (

    <DashboardLayout 

      title={batch.batchNumber} 

      breadcrumb={`მთავარი / წარმოება / ${batch.batchNumber}`}

    >

      {/* Header Card */}

      <Card className="mb-6">

        <CardBody>

          <div className="flex items-start justify-between">

            <div className="flex items-center gap-4">

              <div className="w-16 h-16 rounded-2xl bg-gradient-copper flex items-center justify-center text-3xl">

                🍺

              </div>

              <div>

                <div className="flex items-center gap-3 mb-1">

                  <h1 className="text-2xl font-display font-bold">{batch.recipe.name}</h1>

                  <BatchStatusBadge status={batch.status} showPulse={batch.status === 'fermenting'} />

                </div>

                <p className="text-text-muted">

                  {batch.recipe.style} • {batch.tank.name} • {batch.volume}L

                </p>

              </div>

            </div>

            <div className="flex gap-2">

              <Button variant="ghost" onClick={() => router.back()}>← უკან</Button>

              <Button variant="secondary" onClick={() => setShowEditModal(true)}>✏️ რედაქტირება</Button>

              {(batch.status === 'planned' || batch.status === 'brewing') && (

                <Button variant="primary" onClick={() => setShowStartBrewing(true)}>

                  🚀 ხარშვის დაწყება

                </Button>

              )}

              {batch.status === 'fermenting' && (

                <>

                  <Button variant="secondary" onClick={() => setShowStartBrewing(true)}>

                    🧪 დემო: მარაგის ჩამოჭრა

                  </Button>

                  <Button variant="primary" onClick={() => setShowReportModal(true)}>📋 ანგარიში</Button>

                </>

              )}

              {batch.status === 'ready' && (

                <Button variant="primary" onClick={() => setShowPackaging(true)}>

                  🎁 შეფუთვა

                </Button>

              )}

              {batch.status !== 'planned' && batch.status !== 'brewing' && batch.status !== 'fermenting' && batch.status !== 'ready' && (

                <Button variant="primary" onClick={() => setShowReportModal(true)}>📋 ანგარიში</Button>

              )}

            </div>

          </div>

        </CardBody>

      </Card>



      {/* Stats Row */}

      <div className="grid grid-cols-6 gap-4 mb-6">

        <div className="bg-bg-card border border-border rounded-xl p-4 text-center">

          <p className="text-2xl font-bold font-mono text-copper-light">{batch.actualOG?.toFixed(3) || '-'}</p>

          <p className="text-xs text-text-muted">OG (ფაქტ.)</p>

        </div>

        <div className="bg-bg-card border border-border rounded-xl p-4 text-center">

          <p className="text-2xl font-bold font-mono text-amber-400">{batch.currentGravity.toFixed(3)}</p>

          <p className="text-xs text-text-muted">SG (მიმდ.)</p>

        </div>

        <div className="bg-bg-card border border-border rounded-xl p-4 text-center">

          <p className="text-2xl font-bold font-mono text-green-400">{batch.targetFG.toFixed(3)}</p>

          <p className="text-xs text-text-muted">FG (სამიზნე)</p>

        </div>

        <div className="bg-bg-card border border-border rounded-xl p-4 text-center">

          <p className="text-2xl font-bold font-mono">{currentABV}%</p>

          <p className="text-xs text-text-muted">ABV (მიმდ.)</p>

        </div>

        <div className="bg-bg-card border border-border rounded-xl p-4 text-center">

          <p className="text-2xl font-bold font-mono">{attenuation}%</p>

          <p className="text-xs text-text-muted">ატენუაცია</p>

        </div>

        <div className="bg-bg-card border border-border rounded-xl p-4 text-center">

          <p className="text-2xl font-bold font-mono">{batch.currentTemperature}°C</p>

          <p className="text-xs text-text-muted">ტემპერატურა</p>

        </div>

      </div>



      {/* Progress Card */}

      <Card className="mb-6">

        <CardBody>

          <div className="flex items-center justify-between mb-4">

            <div>

              <p className="text-sm text-text-muted">პროგრესი</p>

              <p className="text-lg font-bold">{batch.progress}% დასრულებული</p>

            </div>

            <div className="text-right">

              <p className="text-sm text-text-muted">დარჩენილია</p>

              <p className="text-lg font-bold">{daysRemaining} დღე</p>

            </div>

          </div>

          <ProgressBar value={batch.progress} color="copper" size="lg" />

          <div className="flex justify-between mt-2 text-xs text-text-muted">

            <span>დაწყება: {formatDate(batch.brewDate)}</span>

            <span>დღე {daysInFermentation}</span>

            <span>სავარაუდო დასრულება: {formatDate(batch.estimatedEndDate)}</span>

          </div>

        </CardBody>

      </Card>



      {/* Tabs */}

      <div className="flex gap-2 mb-6 border-b border-border">

        {[

          { key: 'overview', label: 'მიმოხილვა', icon: '📊' },

          { key: 'readings', label: 'გაზომვები', icon: '📈' },

          { key: 'timeline', label: 'ტაიმლაინი', icon: '📅' },

          { key: 'ingredients', label: 'ინგრედიენტები', icon: '🌾' },

        ].map(tab => (

          <button

            key={tab.key}

            onClick={() => setActiveTab(tab.key as typeof activeTab)}

            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${

              activeTab === tab.key

                ? 'border-copper text-copper-light'

                : 'border-transparent text-text-muted hover:text-text-primary'

            }`}

          >

            {tab.icon} {tab.label}

          </button>

        ))}

      </div>



      {/* Tab Content */}

      {activeTab === 'overview' && (

        <div className="grid grid-cols-3 gap-6">

          {/* Gravity Chart */}

          <div className="col-span-2">

            <Card>

              <CardHeader>

                <div className="flex justify-between items-center">

                  <span>📈 სიმკვრივის გრაფიკი</span>

                  <Button variant="ghost" size="sm" onClick={() => setShowAddReading(true)}>

                    + გაზომვა

                  </Button>

                </div>

              </CardHeader>

              <CardBody>

                <div className="h-64 flex items-end gap-2">

                  {batch.gravityReadings.map((reading, i) => {

                    const heightPercent = ((reading.gravity - 1) / 0.06) * 100

                    return (

                      <div key={reading.id} className="flex-1 flex flex-col items-center gap-2">

                        <span className="text-xs font-mono">{reading.gravity.toFixed(3)}</span>

                        <div 

                          className="w-full bg-copper/60 rounded-t transition-all hover:bg-copper group relative"

                          style={{ height: `${heightPercent}%` }}

                        >

                          <div className="absolute -top-20 left-1/2 -translate-x-1/2 bg-bg-card border border-border rounded-lg p-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">

                            <p className="font-mono">{reading.gravity.toFixed(3)}</p>

                            <p className="text-text-muted">{reading.temperature}°C</p>

                            <p className="text-text-muted">{formatDate(reading.date)}</p>

                          </div>

                        </div>

                        <span className="text-[10px] text-text-muted">

                          {formatShortDate(reading.date)}

                        </span>

                      </div>

                    )

                  })}

                </div>

                <div className="flex justify-between mt-4 pt-4 border-t border-border">

                  <div className="flex items-center gap-4 text-sm">

                    <div className="flex items-center gap-2">

                      <div className="w-3 h-3 bg-copper rounded" />

                      <span className="text-text-muted">გაზომვები</span>

                    </div>

                    <div className="flex items-center gap-2">

                      <div className="w-8 h-0.5 bg-green-400 border-dashed" />

                      <span className="text-text-muted">სამიზნე FG ({batch.targetFG})</span>

                    </div>

                  </div>

                </div>

              </CardBody>

            </Card>

          </div>



          {/* Side Info */}

          <div className="space-y-4">

            {/* Batch Info */}

            <Card>

              <CardHeader>📋 ინფორმაცია</CardHeader>

              <CardBody className="space-y-3">

                <div className="flex justify-between">

                  <span className="text-text-muted">მეხარშე</span>

                  <span>{batch.brewer}</span>

                </div>

                <div className="flex justify-between">

                  <span className="text-text-muted">რეცეპტი</span>

                  <span className="text-copper-light">{batch.recipe.name}</span>

                </div>

                <div className="flex justify-between">

                  <span className="text-text-muted">ტანკი</span>

                  <span>{batch.tank.name}</span>

                </div>

                <div className="flex justify-between">

                  <span className="text-text-muted">მოცულობა</span>

                  <span>{batch.volume} L</span>

                </div>

              </CardBody>

            </Card>



            {/* Targets */}

            <Card>

              <CardHeader>🎯 სამიზნეები</CardHeader>

              <CardBody className="space-y-3">

                <div className="flex justify-between">

                  <span className="text-text-muted">OG</span>

                  <span className="font-mono">{batch.targetOG.toFixed(3)}</span>

                </div>

                <div className="flex justify-between">

                  <span className="text-text-muted">FG</span>

                  <span className="font-mono">{batch.targetFG.toFixed(3)}</span>

                </div>

                <div className="flex justify-between">

                  <span className="text-text-muted">ABV</span>

                  <span className="font-mono">{batch.targetABV}%</span>

                </div>

              </CardBody>

            </Card>



            {/* Notes */}

            {batch.notes && (

              <Card>

                <CardHeader>📝 შენიშვნები</CardHeader>

                <CardBody>

                  <p className="text-sm text-text-secondary">{batch.notes}</p>

                </CardBody>

              </Card>

            )}

          </div>

        </div>

      )}



      {activeTab === 'readings' && (

        <Card>

          <CardHeader>

            <div className="flex justify-between items-center">

              <span>📊 გაზომვების ისტორია</span>

              <Button variant="primary" size="sm" onClick={() => setShowAddReading(true)}>

                + ახალი გაზომვა

              </Button>

            </div>

          </CardHeader>

          <CardBody>

            <table className="w-full">

              <thead>

                <tr className="border-b border-border text-left text-sm text-text-muted">

                  <th className="pb-3">თარიღი</th>

                  <th className="pb-3">სიმკვრივე (SG)</th>

                  <th className="pb-3">ტემპერატურა</th>

                  <th className="pb-3">ABV</th>

                  <th className="pb-3">შენიშვნა</th>

                  <th className="pb-3">ჩამწერი</th>

                </tr>

              </thead>

              <tbody>

                {[...batch.gravityReadings].reverse().map((reading, i) => {

                  const abv = batch.actualOG 

                    ? ((batch.actualOG - reading.gravity) * 131.25).toFixed(1)

                    : '-'

                  return (

                    <tr key={reading.id} className="border-b border-border/50">

                      <td className="py-3">

                        <p>{formatDate(reading.date)}</p>

                        <p className="text-xs text-text-muted">

                          {formatTime(reading.date)}

                        </p>

                      </td>

                      <td className="py-3 font-mono text-lg">{reading.gravity.toFixed(3)}</td>

                      <td className="py-3 font-mono">{reading.temperature}°C</td>

                      <td className="py-3 font-mono text-copper-light">{abv}%</td>

                      <td className="py-3 text-sm text-text-muted">{reading.notes || '-'}</td>

                      <td className="py-3 text-sm">{reading.recordedBy}</td>

                    </tr>

                  )

                })}

              </tbody>

            </table>

          </CardBody>

        </Card>

      )}



      {activeTab === 'timeline' && (

        <Card>

          <CardHeader>📅 აქტივობის ტაიმლაინი</CardHeader>

          <CardBody>

            <div className="space-y-0">

              {[...batch.timeline].reverse().map((event, index) => (

                <div key={event.id} className="flex gap-4">

                  <div className="flex flex-col items-center">

                    <div className={`w-10 h-10 rounded-full ${EVENT_COLORS[event.type]} flex items-center justify-center text-white`}>

                      {EVENT_ICONS[event.type]}

                    </div>

                    {index < batch.timeline.length - 1 && (

                      <div className="w-0.5 flex-1 bg-border my-2" />

                    )}

                  </div>

                  <div className="flex-1 pb-6">

                    <div className="flex justify-between items-start">

                      <div>

                        <p className="font-medium">{event.title}</p>

                        <p className="text-sm text-text-secondary">{event.description}</p>

                      </div>

                      <div className="text-right text-sm">

                        <p className="text-text-muted">

                          {formatDate(event.date)}

                        </p>

                        <p className="text-text-muted">

                          {formatTime(event.date)}

                        </p>

                      </div>

                    </div>

                    <p className="text-xs text-text-muted mt-1">{event.user}</p>

                  </div>

                </div>

              ))}

            </div>

          </CardBody>

        </Card>

      )}



      {activeTab === 'ingredients' && (

        <div className="grid grid-cols-3 gap-6">

          {/* Grains */}

          <Card>

            <CardHeader>🌾 ალაო</CardHeader>

            <CardBody className="space-y-3">

              {batch.ingredients.filter(i => i.type === 'grain').map((ing, i) => (

                <div key={i} className="flex justify-between items-center p-3 bg-bg-tertiary rounded-lg">

                  <span>{ing.name}</span>

                  <span className="font-mono">{ing.amount} {ing.unit}</span>

                </div>

              ))}

            </CardBody>

          </Card>



          {/* Hops */}

          <Card>

            <CardHeader>🌿 სვია</CardHeader>

            <CardBody className="space-y-3">

              {batch.ingredients.filter(i => i.type === 'hop').map((ing, i) => (

                <div key={i} className="flex justify-between items-center p-3 bg-bg-tertiary rounded-lg">

                  <span>{ing.name}</span>

                  <span className="font-mono">{ing.amount} {ing.unit}</span>

                </div>

              ))}

            </CardBody>

          </Card>



          {/* Yeast */}

          <Card>

            <CardHeader>🧫 საფუარი</CardHeader>

            <CardBody className="space-y-3">

              {batch.ingredients.filter(i => i.type === 'yeast').map((ing, i) => (

                <div key={i} className="flex justify-between items-center p-3 bg-bg-tertiary rounded-lg">

                  <span>{ing.name}</span>

                  <span className="font-mono">{ing.amount} {ing.unit}</span>

                </div>

              ))}

            </CardBody>

          </Card>

        </div>

      )}



      {/* Add Reading Modal */}

      {showAddReading && (

        <div className="fixed inset-0 z-50 flex items-center justify-center">

          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowAddReading(false)} />

          <div className="relative bg-bg-secondary border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">

            <div className="px-6 py-4 border-b border-border">

              <h3 className="text-lg font-display font-semibold">ახალი გაზომვა</h3>

            </div>

            <div className="p-6 space-y-4">

              <div>

                <label className="block text-sm font-medium mb-2">სიმკვრივე (SG) *</label>

                <input

                  type="number"

                  step="0.001"

                  value={newReading.gravity}

                  onChange={(e) => setNewReading(prev => ({ ...prev, gravity: e.target.value }))}

                  placeholder="1.012"

                  className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl font-mono focus:border-copper focus:outline-none"

                />

              </div>

              <div>

                <label className="block text-sm font-medium mb-2">ტემპერატურა (°C) *</label>

                <input

                  type="number"

                  step="0.1"

                  value={newReading.temperature}

                  onChange={(e) => setNewReading(prev => ({ ...prev, temperature: e.target.value }))}

                  placeholder="12.0"

                  className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl font-mono focus:border-copper focus:outline-none"

                />

              </div>

              <div>

                <label className="block text-sm font-medium mb-2">შენიშვნა</label>

                <input

                  type="text"

                  value={newReading.notes}

                  onChange={(e) => setNewReading(prev => ({ ...prev, notes: e.target.value }))}

                  placeholder="არასავალდებულო..."

                  className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl focus:border-copper focus:outline-none"

                />

              </div>

            </div>

            <div className="px-6 py-4 border-t border-border flex justify-end gap-3">

              <Button variant="secondary" onClick={() => setShowAddReading(false)}>გაუქმება</Button>

              <Button variant="primary" onClick={handleAddReading}>შენახვა</Button>

            </div>

          </div>

        </div>

      )}



      {/* Start Brewing Modal */}

      <StartBrewingModal

        isOpen={showStartBrewing}

        onClose={() => setShowStartBrewing(false)}

        onConfirm={handleStartBrewing}

        batchNumber={batch.batchNumber}

        recipeName={batch.recipe.name}

        recipeIngredients={recipeIngredientsWithStock}

      />



      {/* Packaging Modal */}

      {batch && (

        <PackagingModal

          isOpen={showPackaging}

          onClose={() => setShowPackaging(false)}

          onComplete={(packagingData) => {

            console.log('Packaging completed:', packagingData)

            // Here you would:

            // 1. Update inventory (deduct materials)

            // 2. Create FinishedProduct entries

            // 3. Update batch status to 'packaged'

            // 4. Add timeline event

            setShowPackaging(false)

            alert('შეფუთვა დასრულდა! მზა პროდუქცია შეიქმნა.')

          }}

          batchId={batch.id}

          batchNumber={batch.batchNumber}

          recipeName={batch.recipe.name}

          availableLiters={batch.volume}

        />

      )}

      {/* Edit Batch Modal */}
      {batch && (
        <EditBatchModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSubmit={(data) => {
            console.log('Batch updated:', data)
            // TODO: Update batch data
            setShowEditModal(false)
            alert('პარტია განახლდა!')
          }}
          batch={{
            id: batch.id,
            batchNumber: batch.batchNumber,
            volume: batch.volume,
            targetOG: batch.targetOG,
            targetFG: batch.targetFG,
            notes: batch.notes,
            brewer: batch.brewer,
          }}
        />
      )}

      {/* Batch Report Modal */}
      {batch && (
        <BatchReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          batch={{
            id: batch.id,
            batchNumber: batch.batchNumber,
            recipe: batch.recipe,
            status: batch.status,
            tank: batch.tank,
            volume: batch.volume,
            brewDate: batch.brewDate,
            targetOG: batch.targetOG,
            targetFG: batch.targetFG,
            targetABV: batch.targetABV,
            actualOG: batch.actualOG,
            currentGravity: batch.currentGravity,
            currentABV: batch.actualABV,
            progress: batch.progress,
            notes: batch.notes,
            brewer: batch.brewer,
          }}
          gravityReadings={batch.gravityReadings}
          ingredients={batch.ingredients.map((ing, idx) => ({ ...ing, id: ing.name + idx }))}
        />
      )}

    </DashboardLayout>

  )

}



