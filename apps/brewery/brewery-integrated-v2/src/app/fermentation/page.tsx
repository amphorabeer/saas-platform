'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout'
import { Card, CardHeader, CardBody, ProgressBar, BatchStatusBadge } from '@/components/ui'
import { TankCard, TankDetailModal } from '@/components/fermentation'
import { 
  tanks as centralTanks, 
  batches as centralBatches,
  getBatchById 
} from '@/data/centralData'

interface Tank {
  id: string
  name: string
  type: 'fermenter' | 'brite' | 'conditioning'
  capacity: number
  currentVolume: number
  status: 'available' | 'in_use' | 'cleaning' | 'maintenance'
  batch?: {
    id: string
    batchNumber: string
    recipe: string
    status: 'fermenting' | 'conditioning' | 'ready'
    startDate: Date
    estimatedEndDate: Date
    progress: number
  }
  temperature: {
    current: number
    target: number
    history: { time: string; value: number }[]
  }
  gravity: {
    original: number
    current: number
    target: number
    history: { time: string; value: number }[]
  }
  pressure?: number
  ph?: number
  lastUpdated: Date
}

// Transform central data to page format
const mockTanks: Tank[] = centralTanks
  .filter(t => ['fermenter', 'brite'].includes(t.type))
  .map(tank => {
    const batch = tank.currentBatchId ? getBatchById(tank.currentBatchId) : undefined
    
    return {
      id: tank.id,
      name: tank.name,
      type: tank.type as 'fermenter' | 'brite',
      capacity: tank.capacity,
      currentVolume: batch?.volume || 0,
      status: tank.status,
      batch: batch ? {
        id: batch.id,
        batchNumber: batch.batchNumber,
        recipe: batch.recipeName,
        status: batch.status as 'fermenting' | 'conditioning' | 'ready',
        startDate: batch.startDate,
        estimatedEndDate: batch.estimatedEndDate || new Date(),
        progress: batch.progress,
      } : undefined,
      temperature: {
        current: tank.currentTemp || 4,
        target: tank.targetTemp || 4,
        history: batch ? [
          { time: '00:00', value: (tank.currentTemp || 4) - 0.2 },
          { time: '04:00', value: (tank.currentTemp || 4) - 0.1 },
          { time: '08:00', value: (tank.currentTemp || 4) + 0.1 },
          { time: '12:00', value: tank.currentTemp || 4 },
          { time: '16:00', value: (tank.currentTemp || 4) - 0.1 },
          { time: '20:00', value: tank.currentTemp || 4 },
        ] : [],
      },
      gravity: {
        original: batch?.og || 0,
        current: batch?.currentGravity || 0,
        target: batch?.targetFg || 0,
        history: batch ? [
          { time: 'დღე 1', value: batch.og },
          { time: 'დღე 3', value: batch.og - (batch.og - batch.targetFg) * 0.3 },
          { time: 'დღე 5', value: batch.currentGravity || batch.targetFg },
        ] : [],
      },
      pressure: tank.status === 'in_use' ? 1.2 + Math.random() : undefined,
      ph: tank.status === 'in_use' ? 4.1 + Math.random() * 0.3 : undefined,
      lastUpdated: new Date(),
    }
  })



export default function FermentationPage() {

  const [tanks, setTanks] = useState(mockTanks)

  const [selectedTank, setSelectedTank] = useState<Tank | null>(null)

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const [filterType, setFilterType] = useState<string>('all')



  // Simulate real-time updates

  useEffect(() => {

    const interval = setInterval(() => {

      setTanks(prev => prev.map(tank => {

        if (tank.status !== 'in_use') return tank

        

        // Simulate temperature fluctuation

        const tempVariation = (Math.random() - 0.5) * 0.2

        const newTemp = Math.round((tank.temperature.current + tempVariation) * 10) / 10

        

        return {

          ...tank,

          temperature: {

            ...tank.temperature,

            current: newTemp,

          },

          lastUpdated: new Date(),

        }

      }))

    }, 5000)



    return () => clearInterval(interval)

  }, [])



  const filteredTanks = tanks.filter(tank => {

    if (filterType === 'all') return true

    if (filterType === 'fermenter') return tank.type === 'fermenter'

    if (filterType === 'brite') return tank.type === 'brite'

    if (filterType === 'active') return tank.status === 'in_use'

    if (filterType === 'available') return tank.status === 'available'

    return true

  })



  const stats = {

    totalTanks: tanks.length,

    activeTanks: tanks.filter(t => t.status === 'in_use').length,

    availableTanks: tanks.filter(t => t.status === 'available').length,

    totalCapacity: tanks.reduce((sum, t) => sum + t.capacity, 0),

    usedCapacity: tanks.reduce((sum, t) => sum + t.currentVolume, 0),

  }



  return (

    <DashboardLayout title="ფერმენტაცია" breadcrumb="მთავარი / ფერმენტაცია">

      {/* Stats Row */}

      <div className="grid grid-cols-5 gap-4 mb-6">

        <div className="bg-bg-card border border-border rounded-xl p-4">

          <p className="text-2xl font-bold font-display text-copper-light">{stats.totalTanks}</p>

          <p className="text-xs text-text-muted">სულ ტანკი</p>

        </div>

        <div className="bg-bg-card border border-border rounded-xl p-4">

          <p className="text-2xl font-bold font-display text-amber-400">{stats.activeTanks}</p>

          <p className="text-xs text-text-muted">აქტიური</p>

        </div>

        <div className="bg-bg-card border border-border rounded-xl p-4">

          <p className="text-2xl font-bold font-display text-green-400">{stats.availableTanks}</p>

          <p className="text-xs text-text-muted">თავისუფალი</p>

        </div>

        <div className="bg-bg-card border border-border rounded-xl p-4">

          <p className="text-2xl font-bold font-display">{(stats.totalCapacity / 1000).toFixed(1)}k</p>

          <p className="text-xs text-text-muted">სულ მოცულობა (L)</p>

        </div>

        <div className="bg-bg-card border border-border rounded-xl p-4">

          <p className="text-2xl font-bold font-display">{Math.round(stats.usedCapacity / stats.totalCapacity * 100)}%</p>

          <p className="text-xs text-text-muted">გამოყენება</p>

          <ProgressBar value={Math.round(stats.usedCapacity / stats.totalCapacity * 100)} size="sm" color="copper" className="mt-2" />

        </div>

      </div>



      {/* Filters */}

      <div className="flex justify-between items-center mb-6">

        <div className="flex gap-2">

          {[

            { key: 'all', label: 'ყველა' },

            { key: 'fermenter', label: 'ფერმენტატორები' },

            { key: 'brite', label: 'ბრაიტ ტანკები' },

            { key: 'active', label: 'აქტიური' },

            { key: 'available', label: 'თავისუფალი' },

          ].map(filter => (

            <button

              key={filter.key}

              onClick={() => setFilterType(filter.key)}

              className={`px-4 py-2 rounded-lg text-sm transition-all ${

                filterType === filter.key

                  ? 'bg-copper text-white'

                  : 'bg-bg-tertiary text-text-secondary hover:bg-bg-card'

              }`}

            >

              {filter.label}

            </button>

          ))}

        </div>

        <div className="flex gap-2">

          <button

            onClick={() => setViewMode('grid')}

            className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-copper text-white' : 'bg-bg-tertiary'}`}

          >

            ▦

          </button>

          <button

            onClick={() => setViewMode('list')}

            className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-copper text-white' : 'bg-bg-tertiary'}`}

          >

            ☰

          </button>

        </div>

      </div>



      {/* Tanks Grid */}

      <div className={viewMode === 'grid' ? 'grid grid-cols-3 gap-6' : 'space-y-4'}>

        {filteredTanks.map(tank => (

          <TankCard 

            key={tank.id} 

            tank={tank} 

            viewMode={viewMode}

            onClick={() => setSelectedTank(tank)}

          />

        ))}

      </div>



      {/* Alert Section */}

      {tanks.some(t => t.status === 'in_use' && Math.abs(t.temperature.current - t.temperature.target) > 0.5) && (

        <Card className="mt-6 border-warning/50">

          <CardHeader>

            <span className="text-warning">⚠️ გაფრთხილებები</span>

          </CardHeader>

          <CardBody>

            <div className="space-y-2">

              {tanks

                .filter(t => t.status === 'in_use' && Math.abs(t.temperature.current - t.temperature.target) > 0.5)

                .map(tank => (

                  <div key={tank.id} className="flex items-center justify-between p-3 bg-warning/10 rounded-lg">

                    <div className="flex items-center gap-3">

                      <span className="text-warning">🌡️</span>

                      <span className="font-medium">{tank.name}</span>

                      <span className="text-text-muted">-</span>

                      <span className="text-sm">ტემპერატურა სამიზნეს გარეთაა</span>

                    </div>

                    <div className="text-sm">

                      <span className="text-warning">{tank.temperature.current}°C</span>

                      <span className="text-text-muted"> / სამიზნე: {tank.temperature.target}°C</span>

                    </div>

                  </div>

                ))}

            </div>

          </CardBody>

        </Card>

      )}



      {/* Tank Detail Modal */}

      {selectedTank && (

        <TankDetailModal

          tank={selectedTank}

          onClose={() => setSelectedTank(null)}

        />

      )}

    </DashboardLayout>

  )

}

