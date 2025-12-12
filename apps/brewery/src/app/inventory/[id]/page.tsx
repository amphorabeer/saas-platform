'use client'



import { useState, useEffect } from 'react'

import { useParams, useRouter } from 'next/navigation'

import { DashboardLayout } from '@/components/layout'

import { Card, CardHeader, CardBody, Button, ProgressBar } from '@/components/ui'

import { mockIngredients } from '../page'

import { formatDate, formatTime } from '@/lib/utils'



interface StockMovement {

  id: string

  date: Date

  type: 'in' | 'out' | 'adjustment' | 'waste'

  quantity: number

  reason: string

  reference?: string

  user: string

  balanceAfter: number

}



const mockMovements: StockMovement[] = [

  { id: '1', date: new Date('2024-12-11T09:30'), type: 'out', quantity: 85, reason: 'პარტია BRW-2024-0156', reference: 'BRW-2024-0156', user: 'ნ. ზედგინიძე', balanceAfter: 450 },

  { id: '2', date: new Date('2024-12-05T10:00'), type: 'out', quantity: 95, reason: 'პარტია BRW-2024-0155', reference: 'BRW-2024-0155', user: 'გ. კაპანაძე', balanceAfter: 535 },

  { id: '3', date: new Date('2024-12-01T14:00'), type: 'in', quantity: 500, reason: 'მიწოდება ORD-2024-0085', reference: 'ORD-2024-0085', user: 'ნ. ზედგინიძე', balanceAfter: 630 },

  { id: '4', date: new Date('2024-11-28T09:00'), type: 'out', quantity: 85, reason: 'პარტია BRW-2024-0154', reference: 'BRW-2024-0154', user: 'ნ. ზედგინიძე', balanceAfter: 130 },

  { id: '5', date: new Date('2024-11-25T11:00'), type: 'out', quantity: 90, reason: 'პარტია BRW-2024-0153', reference: 'BRW-2024-0153', user: 'გ. კაპანაძე', balanceAfter: 215 },

  { id: '6', date: new Date('2024-11-20T16:00'), type: 'adjustment', quantity: 5, reason: 'ინვენტარიზაცია - ნაპოვნი', user: 'ნ. ზედგინიძე', balanceAfter: 305 },

  { id: '7', date: new Date('2024-11-15T10:00'), type: 'in', quantity: 300, reason: 'მიწოდება ORD-2024-0080', reference: 'ORD-2024-0080', user: 'ნ. ზედგინიძე', balanceAfter: 300 },

]



const CATEGORY_ICONS: Record<string, string> = {

  grain: '🌾',

  hop: '🌿',

  yeast: '🧫',

  adjunct: '🧪',

  packaging: '📦',

}



const MOVEMENT_CONFIG = {

  in: { label: 'შემოსავალი', color: 'text-green-400', icon: '📥' },

  out: { label: 'ხარჯი', color: 'text-red-400', icon: '📤' },

  adjustment: { label: 'კორექტირება', color: 'text-blue-400', icon: '🔄' },

  waste: { label: 'ჩამოწერა', color: 'text-orange-400', icon: '🗑️' },

}



export default function IngredientDetailPage() {

  const params = useParams()

  const router = useRouter()

  const [ingredient, setIngredient] = useState<typeof mockIngredients[0] | null>(null)

  const [movements, setMovements] = useState<StockMovement[]>(mockMovements)

  const [activeTab, setActiveTab] = useState<'overview' | 'movements' | 'orders'>('overview')

  const [showAddMovement, setShowAddMovement] = useState(false)

  const [movementType, setMovementType] = useState<'in' | 'out'>('in')

  const [newMovement, setNewMovement] = useState({ quantity: '', reason: '' })



  useEffect(() => {

    const found = mockIngredients.find(i => i.id === params.id)

    setIngredient(found || mockIngredients[0])

  }, [params.id])



  if (!ingredient) {

    return (

      <DashboardLayout title="იტვირთება..." breadcrumb="მთავარი / მარაგები">

        <div className="flex items-center justify-center h-64">

          <div className="animate-spin w-8 h-8 border-2 border-copper border-t-transparent rounded-full" />

        </div>

      </DashboardLayout>

    )

  }



  const maxStock = ingredient.minStock * 3

  const weeksRemaining = ingredient.avgUsagePerWeek > 0 

    ? Math.floor(ingredient.currentStock / ingredient.avgUsagePerWeek)

    : Infinity

  const stockPercent = (ingredient.currentStock / maxStock) * 100

  const totalValue = ingredient.currentStock * ingredient.pricePerUnit



  const handleAddMovement = () => {

    if (!newMovement.quantity || !newMovement.reason) return

    

    const qty = parseFloat(newMovement.quantity)

    const newStock = movementType === 'in' 

      ? ingredient.currentStock + qty 

      : ingredient.currentStock - qty



    const movement: StockMovement = {

      id: Date.now().toString(),

      date: new Date(),

      type: movementType,

      quantity: qty,

      reason: newMovement.reason,

      user: 'ნ. ზედგინიძე',

      balanceAfter: newStock,

    }



    setMovements([movement, ...movements])

    setIngredient({ ...ingredient, currentStock: newStock })

    setNewMovement({ quantity: '', reason: '' })

    setShowAddMovement(false)

  }



  return (

    <DashboardLayout 

      title={ingredient.name}

      breadcrumb={`მთავარი / მარაგები / ${ingredient.name}`}

    >

      {/* Header */}

      <Card className="mb-6">

        <CardBody>

          <div className="flex items-start justify-between">

            <div className="flex items-center gap-4">

              <div className="w-16 h-16 rounded-2xl bg-amber-400/20 flex items-center justify-center text-3xl">

                {CATEGORY_ICONS[ingredient.category] || '📦'}

              </div>

              <div>

                <h1 className="text-2xl font-display font-bold">{ingredient.name}</h1>

                <p className="text-text-muted">

                  {ingredient.supplier} • {ingredient.location} {ingredient.lotNumber && `• ${ingredient.lotNumber}`}

                </p>

              </div>

            </div>

            <div className="flex gap-2">

              <Button variant="ghost" onClick={() => router.back()}>← უკან</Button>

              <Button variant="secondary" onClick={() => { setMovementType('in'); setShowAddMovement(true) }}>

                📥 შემოსავალი

              </Button>

              <Button variant="secondary" onClick={() => { setMovementType('out'); setShowAddMovement(true) }}>

                📤 ხარჯი

              </Button>

              <Button variant="primary">✏️ რედაქტირება</Button>

            </div>

          </div>

        </CardBody>

      </Card>



      {/* Stats */}

      <div className="grid grid-cols-5 gap-4 mb-6">

        <div className="bg-bg-card border border-border rounded-xl p-4 text-center">

          <p className="text-2xl font-bold font-mono text-copper-light">{ingredient.currentStock}</p>

          <p className="text-xs text-text-muted">მარაგი ({ingredient.unit})</p>

        </div>

        <div className="bg-bg-card border border-border rounded-xl p-4 text-center">

          <p className="text-2xl font-bold font-mono text-amber-400">{ingredient.minStock}</p>

          <p className="text-xs text-text-muted">მინიმუმი</p>

        </div>

        <div className="bg-bg-card border border-border rounded-xl p-4 text-center">

          <p className="text-2xl font-bold font-mono">{ingredient.avgUsagePerWeek}</p>

          <p className="text-xs text-text-muted">კვირაში ({ingredient.unit})</p>

        </div>

        <div className="bg-bg-card border border-border rounded-xl p-4 text-center">

          <p className="text-2xl font-bold font-mono text-green-400">

            {weeksRemaining === Infinity ? '∞' : `~${weeksRemaining}`}

          </p>

          <p className="text-xs text-text-muted">კვირა საკმარისი</p>

        </div>

        <div className="bg-bg-card border border-border rounded-xl p-4 text-center">

          <p className="text-2xl font-bold font-mono">{totalValue.toLocaleString()}₾</p>

          <p className="text-xs text-text-muted">ღირებულება</p>

        </div>

      </div>



      {/* Stock Bar */}

      <Card className="mb-6">

        <CardBody>

          <div className="flex items-center justify-between mb-2">

            <span className="text-sm text-text-muted">მარაგის დონე</span>

            <span className="text-sm font-mono">{ingredient.currentStock} / {maxStock} {ingredient.unit}</span>

          </div>

          <div className="relative">

            <ProgressBar value={Math.min(100, stockPercent)} size="lg" color="copper" />

            <div 

              className="absolute top-0 bottom-0 w-0.5 bg-amber-400"

              style={{ left: `${(ingredient.minStock / maxStock) * 100}%` }}

            >

              <span className="absolute -top-5 -translate-x-1/2 text-[10px] text-amber-400 whitespace-nowrap">მინ</span>

            </div>

          </div>

        </CardBody>

      </Card>



      {/* Tabs */}

      <div className="flex gap-2 mb-6 border-b border-border">

        {[

          { key: 'overview', label: 'მიმოხილვა', icon: '📊' },

          { key: 'movements', label: 'მოძრაობა', icon: '📋' },

          { key: 'orders', label: 'შეკვეთები', icon: '🚚' },

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

        <div className="grid grid-cols-2 gap-6">

          <Card>

            <CardHeader>📋 დეტალები</CardHeader>

            <CardBody className="space-y-3">

              <div className="flex justify-between py-2 border-b border-border/50">

                <span className="text-text-muted">კატეგორია</span>

                <span className="capitalize">{ingredient.category}</span>

              </div>

              <div className="flex justify-between py-2 border-b border-border/50">

                <span className="text-text-muted">ერთეულის ფასი</span>

                <span className="font-mono">{ingredient.pricePerUnit}₾/{ingredient.unit}</span>

              </div>

              <div className="flex justify-between py-2 border-b border-border/50">

                <span className="text-text-muted">მომწოდებელი</span>

                <span>{ingredient.supplier}</span>

              </div>

              <div className="flex justify-between py-2 border-b border-border/50">

                <span className="text-text-muted">ადგილმდებარეობა</span>

                <span className="font-mono">{ingredient.location}</span>

              </div>

              {ingredient.lotNumber && (

                <div className="flex justify-between py-2 border-b border-border/50">

                  <span className="text-text-muted">ლოტის ნომერი</span>

                  <span className="font-mono">{ingredient.lotNumber}</span>

                </div>

              )}

              {ingredient.expiryDate && (

                <div className="flex justify-between py-2 border-b border-border/50">

                  <span className="text-text-muted">ვარგისიანობა</span>

                  <span>{formatDate(ingredient.expiryDate)}</span>

                </div>

              )}

              <div className="flex justify-between py-2">

                <span className="text-text-muted">ბოლო მიღება</span>

                <span>{formatDate(ingredient.lastReceived)}</span>

              </div>

            </CardBody>

          </Card>



          <Card>

            <CardHeader>📈 მოხმარების გრაფიკი</CardHeader>

            <CardBody>

              <div className="h-48 flex items-end gap-1">

                {Array.from({ length: 12 }, (_, i) => {

                  const height = 30 + (i % 7) * 10

                  return (

                    <div 

                      key={i}

                      className="flex-1 bg-copper/40 hover:bg-copper transition-colors rounded-t"

                      style={{ height: `${height}%` }}

                    />

                  )

                })}

              </div>

              <div className="flex justify-between mt-2 text-xs text-text-muted">

                <span>იან</span>

                <span>თებ</span>

                <span>მარ</span>

                <span>აპრ</span>

                <span>მაი</span>

                <span>ივნ</span>

                <span>ივლ</span>

                <span>აგვ</span>

                <span>სექ</span>

                <span>ოქტ</span>

                <span>ნოე</span>

                <span>დეკ</span>

              </div>

            </CardBody>

          </Card>

        </div>

      )}



      {activeTab === 'movements' && (

        <Card>

          <CardHeader>

            <div className="flex justify-between items-center">

              <span>📋 მოძრაობის ისტორია</span>

              <div className="flex gap-2">

                <Button variant="ghost" size="sm" onClick={() => { setMovementType('in'); setShowAddMovement(true) }}>

                  📥 შემოსავალი

                </Button>

                <Button variant="ghost" size="sm" onClick={() => { setMovementType('out'); setShowAddMovement(true) }}>

                  📤 ხარჯი

                </Button>

              </div>

            </div>

          </CardHeader>

          <CardBody>

            <table className="w-full">

              <thead>

                <tr className="border-b border-border text-left text-xs text-text-muted">

                  <th className="pb-3">თარიღი</th>

                  <th className="pb-3">ტიპი</th>

                  <th className="pb-3">რაოდენობა</th>

                  <th className="pb-3">მიზეზი</th>

                  <th className="pb-3">ბალანსი</th>

                  <th className="pb-3">მომხმარე</th>

                </tr>

              </thead>

              <tbody>

                {movements.map(mov => (

                  <tr key={mov.id} className="border-b border-border/50">

                    <td className="py-3">

                      <p>{formatDate(mov.date)}</p>

                      <p className="text-xs text-text-muted">

                        {formatTime(mov.date)}

                      </p>

                    </td>

                    <td className="py-3">

                      <span className={`inline-flex items-center gap-1 ${MOVEMENT_CONFIG[mov.type].color}`}>

                        {MOVEMENT_CONFIG[mov.type].icon} {MOVEMENT_CONFIG[mov.type].label}

                      </span>

                    </td>

                    <td className="py-3">

                      <span className={`font-mono text-lg ${mov.type === 'in' || (mov.type === 'adjustment' && mov.quantity > 0) ? 'text-green-400' : 'text-red-400'}`}>

                        {mov.type === 'in' || (mov.type === 'adjustment' && mov.quantity > 0) ? '+' : '-'}

                        {Math.abs(mov.quantity)} {ingredient.unit}

                      </span>

                    </td>

                    <td className="py-3">

                      <p className="text-sm">{mov.reason}</p>

                      {mov.reference && (

                        <p className="text-xs text-copper-light font-mono">{mov.reference}</p>

                      )}

                    </td>

                    <td className="py-3 font-mono">{mov.balanceAfter} {ingredient.unit}</td>

                    <td className="py-3 text-sm text-text-secondary">{mov.user}</td>

                  </tr>

                ))}

              </tbody>

            </table>

          </CardBody>

        </Card>

      )}



      {activeTab === 'orders' && (

        <Card>

          <CardHeader>🚚 შეკვეთების ისტორია</CardHeader>

          <CardBody>

            <p className="text-text-muted text-center py-8">შეკვეთები მალე დაემატება</p>

          </CardBody>

        </Card>

      )}



      {/* Add Movement Modal */}

      {showAddMovement && (

        <div className="fixed inset-0 z-50 flex items-center justify-center">

          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowAddMovement(false)} />

          <div className="relative bg-bg-secondary border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">

            <div className="px-6 py-4 border-b border-border">

              <h3 className="text-lg font-display font-semibold">

                {movementType === 'in' ? '📥 შემოსავალი' : '📤 ხარჯი'}

              </h3>

            </div>

            <div className="p-6 space-y-4">

              <div>

                <label className="block text-sm font-medium mb-2">რაოდენობა ({ingredient.unit}) *</label>

                <input

                  type="number"

                  value={newMovement.quantity}

                  onChange={(e) => setNewMovement(prev => ({ ...prev, quantity: e.target.value }))}

                  placeholder="0"

                  className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl font-mono focus:border-copper focus:outline-none"

                />

              </div>

              <div>

                <label className="block text-sm font-medium mb-2">მიზეზი *</label>

                <input

                  type="text"

                  value={newMovement.reason}

                  onChange={(e) => setNewMovement(prev => ({ ...prev, reason: e.target.value }))}

                  placeholder={movementType === 'in' ? 'მაგ: მიწოდება ORD-2024-XXX' : 'მაგ: პარტია BRW-2024-XXX'}

                  className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl focus:border-copper focus:outline-none"

                />

              </div>

              <div className="bg-bg-tertiary rounded-xl p-4">

                <div className="flex justify-between text-sm">

                  <span className="text-text-muted">მიმდინარე მარაგი:</span>

                  <span className="font-mono">{ingredient.currentStock} {ingredient.unit}</span>

                </div>

                {newMovement.quantity && (

                  <div className="flex justify-between text-sm mt-2">

                    <span className="text-text-muted">ახალი მარაგი:</span>

                    <span className={`font-mono ${movementType === 'in' ? 'text-green-400' : 'text-red-400'}`}>

                      {movementType === 'in' 

                        ? ingredient.currentStock + parseFloat(newMovement.quantity || '0')

                        : ingredient.currentStock - parseFloat(newMovement.quantity || '0')

                      } {ingredient.unit}

                    </span>

                  </div>

                )}

              </div>

            </div>

            <div className="px-6 py-4 border-t border-border flex justify-end gap-3">

              <Button variant="secondary" onClick={() => setShowAddMovement(false)}>გაუქმება</Button>

              <Button variant="primary" onClick={handleAddMovement}>შენახვა</Button>

            </div>

          </div>

        </div>

      )}

    </DashboardLayout>

  )

}



