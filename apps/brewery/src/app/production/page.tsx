'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout'
import { Card, CardBody, Button, ProgressBar, BatchStatusBadge } from '@/components/ui'
import { NewBatchModal } from '@/components/brewery'
import { formatDate } from '@/lib/utils'
import { useBreweryStore } from '@/store'

export default function ProductionPage() {
  const router = useRouter()
  
  // Get data from store
  const batches = useBreweryStore(state => state.batches)
  const getStats = useBreweryStore(state => state.getStats)
  
  // Local UI state
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewBatchModal, setShowNewBatchModal] = useState(false)

  // Filter batches
  const filteredBatches = batches.filter(batch => {
    if (filterStatus !== 'all' && batch.status !== filterStatus) return false
    if (searchQuery && !batch.batchNumber.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !batch.recipeName.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  // Get stats
  const stats = getStats()

  const handleBatchCreated = (batchId: string) => {
    console.log('New batch created:', batchId)
    // Optionally navigate to the new batch
    // router.push(`/production/${batchId}`)
  }

  return (
    <DashboardLayout title="წარმოება" breadcrumb="მთავარი / წარმოება">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-bold font-display text-copper-light">{stats.total}</p>
          <p className="text-xs text-text-muted">სულ პარტია</p>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-bold font-display text-amber-400">{stats.fermenting}</p>
          <p className="text-xs text-text-muted">ფერმენტაციაში</p>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-bold font-display text-blue-400">{stats.conditioning}</p>
          <p className="text-xs text-text-muted">კონდიციონირებაში</p>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-bold font-display text-green-400">{stats.ready}</p>
          <p className="text-xs text-text-muted">მზადაა</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex justify-between items-center mb-6">
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
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'ყველა' },
              { key: 'planned', label: 'დაგეგმილი' },
              { key: 'fermenting', label: 'ფერმენტაცია' },
              { key: 'conditioning', label: 'კონდიცირება' },
              { key: 'ready', label: 'მზადაა' },
              { key: 'completed', label: 'დასრულებული' },
            ].map(filter => (
              <button
                key={filter.key}
                onClick={() => setFilterStatus(filter.key)}
                className={`px-4 py-2 rounded-lg text-sm transition-all ${
                  filterStatus === filter.key
                    ? 'bg-copper text-white'
                    : 'bg-bg-tertiary text-text-secondary hover:bg-bg-card'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
        <Button variant="primary" onClick={() => setShowNewBatchModal(true)}>
          + ახალი პარტია
        </Button>
      </div>

      {/* Batches List */}
      <Card>
        <CardBody className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-sm text-text-muted">
                <th className="px-6 py-4">პარტია</th>
                <th className="px-6 py-4">რეცეპტი</th>
                <th className="px-6 py-4">სტატუსი</th>
                <th className="px-6 py-4">ტანკი</th>
                <th className="px-6 py-4">პროგრესი</th>
                <th className="px-6 py-4">SG</th>
                <th className="px-6 py-4">თარიღი</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody>
              {filteredBatches.map(batch => (
                <tr 
                  key={batch.id} 
                  className="border-b border-border/50 hover:bg-bg-tertiary/50 cursor-pointer transition-colors"
                  onClick={() => router.push(`/production/${batch.id}`)}
                >
                  <td className="px-6 py-4">
                    <span className="font-mono text-copper-light">{batch.batchNumber}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium">{batch.recipeName}</p>
                      <p className="text-xs text-text-muted">{batch.style}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <BatchStatusBadge status={batch.status} showPulse={batch.status === 'fermenting'} />
                  </td>
                  <td className="px-6 py-4 font-mono">{batch.tankName || '-'}</td>
                  <td className="px-6 py-4 w-40">
                    <div className="flex items-center gap-2">
                      <ProgressBar value={batch.progress} size="sm" color="copper" className="flex-1" />
                      <span className="text-xs text-text-muted w-8">{batch.progress}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono">
                    {batch.currentGravity?.toFixed(3) || batch.og?.toFixed(3) || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-text-muted">
                    {formatDate(batch.startDate)}
                  </td>
                  <td className="px-6 py-4">
                    <Button variant="ghost" size="sm">→</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      {filteredBatches.length === 0 && (
        <div className="text-center py-12 text-text-muted">
          <p className="text-4xl mb-4">🍺</p>
          <p>პარტიები ვერ მოიძებნა</p>
        </div>
      )}

      {/* New Batch Modal */}
      <NewBatchModal
        isOpen={showNewBatchModal}
        onClose={() => setShowNewBatchModal(false)}
        onSuccess={handleBatchCreated}
      />
    </DashboardLayout>
  )
}
