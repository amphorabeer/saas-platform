import { DashboardLayout } from '@/components/layout'
import { Card, CardHeader, CardBody, StatCard, BatchStatusBadge, ProgressBar } from '@/components/ui'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import { 
  batches, 
  tanks as centralTanks, 
  ingredients,
  orders,
  getStats,
  getLowStockIngredients,
  getActiveBatches,
  getBatchById
} from '@/data/centralData'

// Get stats from central data
const centralStats = getStats()
const stats = {
  activeBatches: centralStats.production.total,
  activeTrend: 8.5,
  monthlyProduction: centralStats.production.totalVolume,
  productionTrend: 12.3,
  fermentingNow: centralStats.production.fermenting,
  readyToPackage: centralStats.production.ready,
  lowStockItems: centralStats.inventory.lowStock,
}

// Transform batches for display
const activeBatches = getActiveBatches().map(batch => ({
  id: batch.id,
  batchNumber: batch.batchNumber,
  recipe: batch.recipeName,
  status: batch.status as 'brewing' | 'fermenting' | 'conditioning' | 'ready',
  tank: batch.tankName || '-',
  volume: batch.volume,
  progress: batch.progress,
  daysLeft: batch.estimatedEndDate 
    ? Math.max(0, Math.ceil((batch.estimatedEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0,
}))

// Transform tanks for display
const tanks = centralTanks
  .filter(t => ['fermenter', 'brite'].includes(t.type))
  .map(tank => {
    const batch = tank.currentBatchId ? getBatchById(tank.currentBatchId) : null
    return {
      id: tank.id,
      name: tank.name,
      type: tank.type,
      status: tank.status,
      batch: batch?.batchNumber || null,
      fill: batch ? Math.round((batch.volume / tank.capacity) * 100) : 0,
      temp: tank.currentTemp || null,
    }
  })

// Recent activity from batches and orders
const recentActivity = [
  { id: '1', type: 'brew', icon: '🧪', text: `${batches[0]?.batchNumber} ფერმენტაციის დაწყება`, time: new Date(Date.now() - 3600000) },
  { id: '2', type: 'qc', icon: '✅', text: `${batches[2]?.batchNumber} QC ტესტი გაიარა`, time: new Date(Date.now() - 7200000) },
  { id: '3', type: 'order', icon: '📦', text: `${orders[0]?.orderNumber} შეკვეთა მიწოდებულია`, time: new Date(Date.now() - 86400000) },
  { id: '4', type: 'alert', icon: '⚠️', text: `დაბალი მარაგი: ${getLowStockIngredients()[0]?.name || 'არ არის'}`, time: new Date(Date.now() - 90000000) },
]

// Low stock items from central data
const lowStockItems = getLowStockIngredients().slice(0, 3).map(item => ({
  name: item.name,
  category: item.category,
  current: item.quantity,
  max: item.minQuantity * 5, // approximate max
}))

export default function DashboardPage() {
  return (
    <DashboardLayout title="დეშბორდი" breadcrumb="მთავარი / დეშბორდი">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-copper/20 to-amber/10 border border-copper/30 rounded-2xl p-6 mb-6 flex justify-between items-center">
        <div>
          <h3 className="font-display text-xl mb-2">
            გამარჯობა, ნიკა! 👋
          </h3>
          <p className="text-text-secondary text-sm">
            დღეს <strong className="text-copper-light">3 პარტია</strong> საჭიროებს ყურადღებას. 
            წარმოება მიდის გეგმის მიხედვით.
          </p>
        </div>
        <div className="text-4xl">🍺</div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-5 mb-6">
        <StatCard
          icon="🍺"
          iconColor="amber"
          value={stats.activeBatches}
          label="აქტიური პარტიები"
          trend={{ value: stats.activeTrend, isUp: true }}
        />
        <StatCard
          icon="📊"
          iconColor="copper"
          value={`${(stats.monthlyProduction / 1000).toFixed(1)}k L`}
          label="თვის წარმოება"
          trend={{ value: stats.productionTrend, isUp: true }}
        />
        <StatCard
          icon="🧪"
          iconColor="green"
          value={stats.fermentingNow}
          label="ფერმენტაციაში"
        />
        <StatCard
          icon="✅"
          iconColor="blue"
          value={stats.readyToPackage}
          label="მზად დასაფასოებლად"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Active Batches Table - 2 columns */}
        <div className="col-span-2">
          <Card>
            <CardHeader action={<a href="/production" className="text-xs text-copper-light hover:underline">ყველას ნახვა →</a>}>
              <span className="text-lg">🍺</span> აქტიური პარტიები
            </CardHeader>
            <CardBody noPadding>
              <table className="w-full">
                <thead>
                  <tr className="bg-bg-tertiary">
                    <th className="text-left text-[11px] uppercase tracking-wide text-text-muted font-medium px-4 py-3">პარტია</th>
                    <th className="text-left text-[11px] uppercase tracking-wide text-text-muted font-medium px-4 py-3">რეცეპტი</th>
                    <th className="text-left text-[11px] uppercase tracking-wide text-text-muted font-medium px-4 py-3">სტატუსი</th>
                    <th className="text-left text-[11px] uppercase tracking-wide text-text-muted font-medium px-4 py-3">ტანკი</th>
                    <th className="text-left text-[11px] uppercase tracking-wide text-text-muted font-medium px-4 py-3">პროგრესი</th>
                  </tr>
                </thead>
                <tbody>
                  {activeBatches.map((batch) => (
                    <tr key={batch.id} className="border-b border-border last:border-0 hover:bg-copper/5 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-copper-light">{batch.batchNumber}</span>
                      </td>
                      <td className="px-4 py-3 text-sm">{batch.recipe}</td>
                      <td className="px-4 py-3">
                        <BatchStatusBadge status={batch.status} showPulse />
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{batch.tank}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <ProgressBar value={batch.progress} size="sm" color={batch.progress === 100 ? 'success' : 'copper'} className="w-20" />
                          <span className="text-xs text-text-muted">{batch.progress}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
          </Card>
        </div>

        {/* Tanks Overview - 1 column */}
        <div>
          <Card>
            <CardHeader action={<a href="/fermentation" className="text-xs text-copper-light hover:underline">დეტალები →</a>}>
              <span className="text-lg">🧪</span> ტანკები
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-3 gap-3">
                {tanks.map((tank) => (
                  <div 
                    key={tank.id}
                    className="relative bg-bg-tertiary rounded-xl p-3 text-center"
                  >
                    {/* Tank Visual */}
                    <div className="relative w-12 h-16 mx-auto mb-2 bg-bg-primary rounded-t-lg rounded-b-[40%] border-2 border-border-light overflow-hidden">
                      <div 
                        className="absolute bottom-0 left-0 right-0 bg-amber/60 transition-all duration-500"
                        style={{ height: `${tank.fill}%` }}
                      />
                      {tank.fill > 0 && (
                        <>
                          <div className="bubble absolute w-1 h-1 bg-amber/80 rounded-full left-2 bottom-2" style={{ animationDelay: '0s' }} />
                          <div className="bubble absolute w-1.5 h-1.5 bg-amber/60 rounded-full right-3 bottom-4" style={{ animationDelay: '1s' }} />
                        </>
                      )}
                    </div>
                    
                    <p className="text-xs font-medium">{tank.name}</p>
                    <p className="text-[10px] text-text-muted">
                      {tank.temp ? `${tank.temp}°C` : 'თავისუფალი'}
                    </p>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Production Chart Placeholder */}
        <div className="col-span-2">
          <Card>
            <CardHeader>
              <span className="text-lg">📈</span> წარმოების სტატისტიკა
            </CardHeader>
            <CardBody>
              <div className="h-64 flex items-center justify-center text-text-muted">
                <p>Chart.js გრაფიკი აქ იქნება</p>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <span className="text-lg">📋</span> ბოლო აქტივობა
            </CardHeader>
            <CardBody className="space-y-3">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <span className="text-lg">{activity.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{activity.text}</p>
                    <p className="text-xs text-text-muted">{formatRelativeTime(activity.time)}</p>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>

          {/* Low Stock Alert */}
          <Card>
            <CardHeader action={<a href="/inventory" className="text-xs text-copper-light hover:underline">შეკვეთა →</a>}>
              <span className="text-lg">⚠️</span> დაბალი მარაგი
            </CardHeader>
            <CardBody className="space-y-3">
              {lowStockItems.map((item, index) => (
                <div key={index}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{item.name}</span>
                    <span className="text-text-muted text-xs">{item.current}/{item.max}</span>
                  </div>
                  <ProgressBar 
                    value={item.current} 
                    max={item.max} 
                    size="sm" 
                    color={item.current / item.max < 0.2 ? 'danger' : 'warning'} 
                  />
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
