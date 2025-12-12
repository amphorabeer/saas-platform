'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout'
import { Card, CardHeader, CardBody, Button, ProgressBar } from '@/components/ui'
import { formatDate } from '@/lib/utils'
import { ingredients as centralIngredients } from '@/data/centralData'

type IngredientCategory = 'all' | 'grain' | 'hop' | 'yeast' | 'adjunct' | 'packaging'
type StockStatus = 'ok' | 'low' | 'critical' | 'out'

export interface Ingredient {
  id: string
  name: string
  category: IngredientCategory
  currentStock: number
  minStock: number
  unit: string
  avgUsagePerWeek: number
  lastReceived: Date
  expiryDate?: Date
  supplier: string
  pricePerUnit: number
  lotNumber?: string
  location: string
}

// Transform central ingredients to page format
const categoryMap: Record<string, IngredientCategory> = {
  'malt': 'grain',
  'hops': 'hop',
  'yeast': 'yeast',
  'adjunct': 'adjunct',
  'water_chemistry': 'adjunct',
}

const mockIngredients: Ingredient[] = centralIngredients.map(ing => ({
  id: ing.id,
  name: ing.name,
  category: categoryMap[ing.category] || 'adjunct',
  currentStock: ing.quantity,
  minStock: ing.minQuantity,
  unit: ing.unit,
  avgUsagePerWeek: Math.ceil(ing.minQuantity / 4),
  lastReceived: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
  expiryDate: ing.expiryDate,
  supplier: ing.supplier,
  pricePerUnit: ing.costPerUnit,
  lotNumber: ing.lotNumber,
  location: ing.location,
}))

// Helper functions and configs
const getStockStatus = (current: number, min: number): StockStatus => {
  if (current === 0) return 'out'
  if (current < min * 0.5) return 'critical'
  if (current < min) return 'low'
  return 'ok'
}

const CATEGORY_CONFIG: Record<IngredientCategory, { label: string; icon: string }> = {
  all: { label: 'ყველა', icon: '📦' },
  grain: { label: 'მარცვლეული', icon: '🌾' },
  hop: { label: 'სვია', icon: '🌿' },
  yeast: { label: 'საფუარი', icon: '🧫' },
  adjunct: { label: 'დანამატები', icon: '🧪' },
  packaging: { label: 'შეფუთვა', icon: '📦' },
}

const STATUS_CONFIG: Record<StockStatus, { label: string; color: string; bgColor: string }> = {
  ok: { label: 'ნორმალური', color: 'text-green-400', bgColor: 'bg-green-400/20' },
  low: { label: 'დაბალი', color: 'text-amber-400', bgColor: 'bg-amber-400/20' },
  critical: { label: 'კრიტიკული', color: 'text-orange-400', bgColor: 'bg-orange-400/20' },
  out: { label: 'ამოწურული', color: 'text-red-400', bgColor: 'bg-red-400/20' },
}

const ORDER_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'მოლოდინში', color: 'text-amber-400' },
  ordered: { label: 'შეკვეთილი', color: 'text-blue-400' },
  shipped: { label: 'გზაშია', color: 'text-purple-400' },
  delivered: { label: 'მიწოდებული', color: 'text-green-400' },
}

const mockPendingOrders = [
  { id: '1', ingredient: 'Cascade Hops', quantity: 5, unit: 'kg', status: 'ordered', supplier: 'HopUnion', expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  { id: '2', ingredient: 'Crystal 60L', quantity: 50, unit: 'kg', status: 'shipped', supplier: 'MaltMaster', expectedDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) },
]



export default function InventoryPage() {

  const router = useRouter()

  const [ingredients] = useState(mockIngredients)

  const [pendingOrders] = useState(mockPendingOrders)

  const [categoryFilter, setCategoryFilter] = useState<IngredientCategory>('all')

  const [searchQuery, setSearchQuery] = useState('')

  const [showLowStockOnly, setShowLowStockOnly] = useState(false)



  const filteredIngredients = ingredients.filter(ing => {

    if (categoryFilter !== 'all' && ing.category !== categoryFilter) return false

    if (searchQuery && !ing.name.toLowerCase().includes(searchQuery.toLowerCase())) return false

    if (showLowStockOnly) {

      const status = getStockStatus(ing.currentStock, ing.minStock)

      if (status === 'ok') return false

    }

    return true

  })



  const stats = {

    total: ingredients.length,

    lowStock: ingredients.filter(i => getStockStatus(i.currentStock, i.minStock) === 'low').length,

    critical: ingredients.filter(i => getStockStatus(i.currentStock, i.minStock) === 'critical').length,

    outOfStock: ingredients.filter(i => getStockStatus(i.currentStock, i.minStock) === 'out').length,

    pendingOrders: pendingOrders.length,

    totalValue: ingredients.reduce((sum, i) => sum + (i.currentStock * i.pricePerUnit), 0),

  }



  const alerts = [

    ...ingredients

      .filter(i => getStockStatus(i.currentStock, i.minStock) !== 'ok')

      .map(i => ({

        type: getStockStatus(i.currentStock, i.minStock),

        message: `${i.name} - ${i.currentStock === 0 ? 'ამოიწურა!' : `მარაგი დაბალია (${i.currentStock} ${i.unit})`}`,

        ingredient: i,

      })),

    ...ingredients

      .filter(i => i.expiryDate && i.expiryDate.getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000)

      .map(i => ({

        type: 'warning' as const,

        message: `${i.name} - ვადა იწურება ${formatDate(i.expiryDate!)}`,

        ingredient: i,

      })),

  ]



  const getWeeksRemaining = (current: number, avgUsage: number) => {

    if (avgUsage === 0) return Infinity

    return Math.floor(current / avgUsage)

  }



  return (

    <DashboardLayout title="მარაგები" breadcrumb="მთავარი / მარაგები">

      {/* Stats Row */}

      <div className="grid grid-cols-6 gap-4 mb-6">

        <div className="bg-bg-card border border-border rounded-xl p-4">

          <p className="text-2xl font-bold font-display text-copper-light">{stats.total}</p>

          <p className="text-xs text-text-muted">სულ პროდუქტი</p>

        </div>

        <div className="bg-bg-card border border-border rounded-xl p-4">

          <p className="text-2xl font-bold font-display text-amber-400">{stats.lowStock}</p>

          <p className="text-xs text-text-muted">დაბალი მარაგი</p>

        </div>

        <div className="bg-bg-card border border-border rounded-xl p-4">

          <p className="text-2xl font-bold font-display text-orange-400">{stats.critical}</p>

          <p className="text-xs text-text-muted">კრიტიკული</p>

        </div>

        <div className="bg-bg-card border border-border rounded-xl p-4">

          <p className="text-2xl font-bold font-display text-red-400">{stats.outOfStock}</p>

          <p className="text-xs text-text-muted">ამოწურული</p>

        </div>

        <div className="bg-bg-card border border-border rounded-xl p-4">

          <p className="text-2xl font-bold font-display text-blue-400">{stats.pendingOrders}</p>

          <p className="text-xs text-text-muted">შეკვეთა გზაში</p>

        </div>

        <div className="bg-bg-card border border-border rounded-xl p-4">

          <p className="text-2xl font-bold font-display">{stats.totalValue.toLocaleString()}₾</p>

          <p className="text-xs text-text-muted">მარაგის ღირებულება</p>

        </div>

      </div>



      <div className="grid grid-cols-3 gap-6">

        {/* Main Content */}

        <div className="col-span-2 space-y-6">

          {/* Filters */}

          <div className="flex justify-between items-center">

            <div className="flex gap-3">

              <div className="relative">

                <input

                  type="text"

                  placeholder="ძიება..."

                  value={searchQuery}

                  onChange={(e) => setSearchQuery(e.target.value)}

                  className="pl-10 pr-4 py-2 bg-bg-tertiary border border-border rounded-lg text-sm w-64 focus:border-copper focus:outline-none"

                />

                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">🔍</span>

              </div>

              <div className="flex gap-1 bg-bg-tertiary rounded-lg p-1">

                {(Object.keys(CATEGORY_CONFIG) as IngredientCategory[]).map(cat => (

                  <button

                    key={cat}

                    onClick={() => setCategoryFilter(cat)}

                    className={`px-3 py-1.5 rounded-md text-sm transition-all ${

                      categoryFilter === cat

                        ? 'bg-copper text-white'

                        : 'hover:bg-bg-card'

                    }`}

                  >

                    {CATEGORY_CONFIG[cat].icon}

                  </button>

                ))}

              </div>

            </div>

            <div className="flex gap-2 items-center">

              <label className="flex items-center gap-2 text-sm cursor-pointer">

                <input

                  type="checkbox"

                  checked={showLowStockOnly}

                  onChange={(e) => setShowLowStockOnly(e.target.checked)}

                  className="rounded border-border"

                />

                მხოლოდ დაბალი

              </label>

              <Button variant="primary">+ შეკვეთა</Button>

            </div>

          </div>



          {/* Ingredients List */}

          <Card>

            <CardHeader>

              📦 მარაგები ({filteredIngredients.length})

            </CardHeader>

            <CardBody className="p-0">

              <table className="w-full">

                <thead>

                  <tr className="bg-bg-tertiary text-left text-xs text-text-muted">

                    <th className="px-4 py-3">პროდუქტი</th>

                    <th className="px-4 py-3">მარაგი</th>

                    <th className="px-4 py-3">სტატუსი</th>

                    <th className="px-4 py-3">საკმარისია</th>

                    <th className="px-4 py-3">მომწოდებელი</th>

                    <th className="px-4 py-3">ადგილი</th>

                    <th className="px-4 py-3"></th>

                  </tr>

                </thead>

                <tbody>

                  {filteredIngredients.map(ing => {

                    const status = getStockStatus(ing.currentStock, ing.minStock)

                    const weeksRemaining = getWeeksRemaining(ing.currentStock, ing.avgUsagePerWeek)

                    const stockPercent = Math.min(100, (ing.currentStock / (ing.minStock * 2)) * 100)

                    

                    return (

                      <tr 

                        key={ing.id} 

                        className="border-b border-border/50 hover:bg-bg-tertiary/50 cursor-pointer transition-colors"

                        onClick={() => router.push(`/inventory/${ing.id}`)}

                      >

                        <td className="px-4 py-3">

                          <div className="flex items-center gap-3">

                            <span className="text-xl">{CATEGORY_CONFIG[ing.category]?.icon || '📦'}</span>

                            <div>

                              <p className="font-medium">{ing.name}</p>

                              {ing.lotNumber && (

                                <p className="text-xs text-text-muted font-mono">{ing.lotNumber}</p>

                              )}

                            </div>

                          </div>

                        </td>

                        <td className="px-4 py-3">

                          <div className="w-32">

                            <div className="flex justify-between text-sm mb-1">

                              <span className="font-mono">{ing.currentStock}</span>

                              <span className="text-text-muted">{ing.unit}</span>

                            </div>

                            <ProgressBar 

                              value={stockPercent} 

                              size="sm" 

                              color={status === 'ok' ? 'success' : status === 'low' ? 'warning' : 'danger'}

                            />

                            <p className="text-[10px] text-text-muted mt-1">მინ: {ing.minStock}</p>

                          </div>

                        </td>

                        <td className="px-4 py-3">

                          <span className={`inline-flex px-2 py-1 rounded-full text-xs ${STATUS_CONFIG[status].bg} ${STATUS_CONFIG[status].color}`}>

                            {STATUS_CONFIG[status].label}

                          </span>

                        </td>

                        <td className="px-4 py-3 text-sm">

                          {weeksRemaining === Infinity ? '∞' : `~${weeksRemaining} კვირა`}

                        </td>

                        <td className="px-4 py-3 text-sm text-text-secondary">{ing.supplier}</td>

                        <td className="px-4 py-3">

                          <span className="px-2 py-1 bg-bg-tertiary rounded text-xs font-mono">{ing.location}</span>

                        </td>

                        <td className="px-4 py-3">

                          <button className="text-text-muted hover:text-copper-light">→</button>

                        </td>

                      </tr>

                    )

                  })}

                </tbody>

              </table>

            </CardBody>

          </Card>

        </div>



        {/* Sidebar */}

        <div className="space-y-6">

          {/* Alerts */}

          {alerts.length > 0 && (

            <Card>

              <CardHeader>

                ⚠️ გაფრთხილებები ({alerts.length})

              </CardHeader>

              <CardBody className="space-y-2 max-h-64 overflow-y-auto">

                {alerts.slice(0, 5).map((alert, i) => (

                  <div 

                    key={i}

                    className={`p-3 rounded-lg text-sm ${

                      alert.type === 'out' ? 'bg-red-400/10 border border-red-400/30' :

                      alert.type === 'critical' ? 'bg-orange-400/10 border border-orange-400/30' :

                      'bg-amber-400/10 border border-amber-400/30'

                    }`}

                  >

                    <p className={

                      alert.type === 'out' ? 'text-red-400' :

                      alert.type === 'critical' ? 'text-orange-400' :

                      'text-amber-400'

                    }>

                      {alert.type === 'out' ? '🔴' : alert.type === 'critical' ? '🟠' : '⚠️'} {alert.message}

                    </p>

                  </div>

                ))}

                {alerts.length > 5 && (

                  <p className="text-xs text-text-muted text-center">+{alerts.length - 5} სხვა</p>

                )}

              </CardBody>

            </Card>

          )}



          {/* Pending Orders */}

          <Card>

            <CardHeader>

              <div className="flex justify-between items-center">

                <span>🚚 მოლოდინში შეკვეთები</span>

                <Button variant="ghost" size="sm">ყველა</Button>

              </div>

            </CardHeader>

            <CardBody className="space-y-3">

              {pendingOrders.map(order => (

                <div key={order.id} className="p-3 bg-bg-tertiary rounded-lg">

                  <div className="flex justify-between items-start mb-2">

                    <div>

                      <p className="font-mono text-sm text-copper-light">{order.orderNumber}</p>

                      <p className="text-xs text-text-muted">{order.supplier}</p>

                    </div>

                    <span className={`px-2 py-0.5 rounded text-xs ${ORDER_STATUS_CONFIG[order.status].bg} ${ORDER_STATUS_CONFIG[order.status].color}`}>

                      {ORDER_STATUS_CONFIG[order.status].label}

                    </span>

                  </div>

                  <div className="text-xs text-text-secondary mb-2">

                    {order.items.map((item, i) => (

                      <span key={i}>

                        {item.name} ({item.quantity}{item.unit})

                        {i < order.items.length - 1 && ', '}

                      </span>

                    ))}

                  </div>

                  <div className="flex justify-between text-xs">

                    <span className="text-text-muted">მოსვლა: {formatDate(order.expectedDate)}</span>

                    <span className="font-medium">{order.totalAmount}₾</span>

                  </div>

                </div>

              ))}

              <Button variant="secondary" className="w-full">+ ახალი შეკვეთა</Button>

            </CardBody>

          </Card>



          {/* Quick Actions */}

          <Card>

            <CardHeader>⚡ სწრაფი მოქმედებები</CardHeader>

            <CardBody className="space-y-2">

              <button className="w-full p-3 bg-bg-tertiary rounded-lg text-left hover:bg-copper/10 transition-colors">

                <p className="font-medium">📥 მიღება</p>

                <p className="text-xs text-text-muted">მარაგის შემოსავალის დამატება</p>

              </button>

              <button className="w-full p-3 bg-bg-tertiary rounded-lg text-left hover:bg-copper/10 transition-colors">

                <p className="font-medium">📤 ხარჯი</p>

                <p className="text-xs text-text-muted">ხელით მარაგის ჩამოჭრა</p>

              </button>

              <button className="w-full p-3 bg-bg-tertiary rounded-lg text-left hover:bg-copper/10 transition-colors">

                <p className="font-medium">📋 ინვენტარიზაცია</p>

                <p className="text-xs text-text-muted">მარაგის გადამოწმება</p>

              </button>

              <button className="w-full p-3 bg-bg-tertiary rounded-lg text-left hover:bg-copper/10 transition-colors">

                <p className="font-medium">📊 ანგარიში</p>

                <p className="text-xs text-text-muted">მოხმარების რეპორტი</p>

              </button>

            </CardBody>

          </Card>

        </div>

      </div>

    </DashboardLayout>

  )

}



