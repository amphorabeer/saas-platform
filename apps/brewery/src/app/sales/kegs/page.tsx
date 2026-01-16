'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout'
import { Card, CardHeader, CardBody, Button } from '@/components/ui'
import { formatDate } from '@/lib/utils'

interface Customer {
  id: string
  name: string
  kegReturnDays: number
}

interface Keg {
  id: string
  kegNumber: string
  size: number
  status: string
  condition: string
  productName: string | null
  customerName: string | null
  customerId: string | null
  orderId: string | null
  batchNumber: string | null
  filledAt: string | null
  sentAt: string | null
  returnedAt: string | null
  daysOut: number | null
  isOverdue: boolean
  dueDate: string | null
  notes: string | null
}

interface Stats {
  total: number
  available: number
  filled: number
  withCustomer: number
  inTransit: number
  cleaning: number
  damaged: number
  lost: number
  overdue: number
}

// Status priority for sorting (lower = higher priority)
const STATUS_PRIORITY: Record<string, number> = {
  FILLED: 1,
  WITH_CUSTOMER: 2,
  IN_TRANSIT: 3,
  CLEANING: 4,
  AVAILABLE: 5,
  DAMAGED: 6,
  LOST: 7,
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  AVAILABLE: { label: 'ხელმისაწვდომი', color: 'text-green-400', bg: 'bg-green-400/20', icon: '✓' },
  FILLED: { label: 'სავსე', color: 'text-blue-400', bg: 'bg-blue-400/20', icon: '🍺' },
  WITH_CUSTOMER: { label: 'კლიენტთან', color: 'text-purple-400', bg: 'bg-purple-400/20', icon: '👤' },
  IN_TRANSIT: { label: 'გზაში', color: 'text-amber-400', bg: 'bg-amber-400/20', icon: '🚚' },
  CLEANING: { label: 'გასარეცხი', color: 'text-cyan-400', bg: 'bg-cyan-400/20', icon: '🧹' },
  DAMAGED: { label: 'დაზიანებული', color: 'text-red-400', bg: 'bg-red-400/20', icon: '⚠️' },
  LOST: { label: 'დაკარგული', color: 'text-gray-400', bg: 'bg-gray-400/20', icon: '❓' },
}

const CONDITION_CONFIG: Record<string, { label: string; color: string }> = {
  GOOD: { label: 'კარგი', color: 'text-green-400' },
  NEEDS_CLEANING: { label: 'გასარეცხი', color: 'text-amber-400' },
  DAMAGED: { label: 'დაზიანებული', color: 'text-red-400' },
}

export default function SalesKegsPage() {
  const router = useRouter()
  const [kegs, setKegs] = useState<Keg[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [customerFilter, setCustomerFilter] = useState<string>('all')
  const [sizeFilter, setSizeFilter] = useState<string>('all')
  const [overdueOnly, setOverdueOnly] = useState(false)
  
  // Modals
  const [selectedKeg, setSelectedKeg] = useState<Keg | null>(null)
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)

  // Fetch customers for filter
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await fetch('/api/customers?isActive=true')
        if (res.ok) {
          const data = await res.json()
          setCustomers(data.customers || [])
        }
      } catch (error) {
        console.error('Failed to fetch customers:', error)
      }
    }
    fetchCustomers()
  }, [])

  // Fetch kegs
  const fetchKegs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (customerFilter !== 'all') params.append('customerId', customerFilter)
      if (sizeFilter !== 'all') params.append('size', sizeFilter)
      if (overdueOnly) params.append('overdue', 'true')

      const res = await fetch(`/api/kegs?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        // Sort kegs by status priority
        const sortedKegs = (data.kegs || []).sort((a: Keg, b: Keg) => {
          const priorityA = STATUS_PRIORITY[a.status] || 99
          const priorityB = STATUS_PRIORITY[b.status] || 99
          if (priorityA !== priorityB) return priorityA - priorityB
          // Secondary sort by keg number
          return a.kegNumber.localeCompare(b.kegNumber)
        })
        setKegs(sortedKegs)
        setStats(data.stats || null)
      }
    } catch (error) {
      console.error('Failed to fetch kegs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchKegs()
  }, [statusFilter, customerFilter, sizeFilter, overdueOnly])

  // Mark keg as cleaned (CLEANING → AVAILABLE)
  const handleMarkCleaned = async (kegId: string) => {
    try {
      setUpdating(kegId)
      const res = await fetch(`/api/kegs/${kegId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'AVAILABLE',
          condition: 'GOOD',
          notes: 'გაირეცხა და მზადაა გამოსაყენებლად',
        }),
      })

      if (res.ok) {
        await fetchKegs()
      } else {
        const data = await res.json()
        alert(data.error || 'შეცდომა')
      }
    } catch (error) {
      console.error('Failed to mark as cleaned:', error)
      alert('შეცდომა')
    } finally {
      setUpdating(null)
    }
  }

  const handleReturn = async (kegId: string, condition: string, notes: string) => {
    try {
      const res = await fetch(`/api/kegs/${kegId}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ condition, notes }),
      })

      if (res.ok) {
        await fetchKegs()
        setShowReturnModal(false)
        setSelectedKeg(null)
      } else {
        const data = await res.json()
        alert(data.error || 'დაბრუნება ვერ მოხერხდა')
      }
    } catch (error) {
      console.error('Failed to return keg:', error)
      alert('დაბრუნება ვერ მოხერხდა')
    }
  }

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.AVAILABLE
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
        {config.icon} {config.label}
      </span>
    )
  }

  return (
    <DashboardLayout title="კეგების Tracking" breadcrumb="მთავარი / გაყიდვები / კეგები">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/sales')}>
            ← უკან
          </Button>
          <h2 className="text-xl font-semibold">🛢️ კეგების Tracking</h2>
        </div>
        <Button variant="secondary" onClick={() => router.push('/inventory')}>
          მარაგებში ნახვა →
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <Card className={statusFilter === 'WITH_CUSTOMER' ? 'ring-2 ring-purple-500' : ''}>
          <CardBody className="p-4">
            <div 
              className="cursor-pointer hover:bg-bg-tertiary/50 transition-colors"
              onClick={() => setStatusFilter(statusFilter === 'WITH_CUSTOMER' ? 'all' : 'WITH_CUSTOMER')}
            >
              <p className="text-2xl font-bold font-display text-purple-400">{stats?.withCustomer || 0}</p>
              <p className="text-xs text-text-muted">👤 კლიენტთან</p>
            </div>
          </CardBody>
        </Card>

        <Card className={overdueOnly ? 'ring-2 ring-red-500' : ''}>
          <CardBody className="p-4">
            <div 
              className="cursor-pointer hover:bg-bg-tertiary/50 transition-colors"
              onClick={() => { setOverdueOnly(!overdueOnly); if (!overdueOnly) setStatusFilter('WITH_CUSTOMER'); }}
            >
              <p className="text-2xl font-bold font-display text-red-400">{stats?.overdue || 0}</p>
              <p className="text-xs text-text-muted">🔴 ვადაგადაცილებული</p>
            </div>
          </CardBody>
        </Card>

        <Card className={statusFilter === 'FILLED' ? 'ring-2 ring-blue-500' : ''}>
          <CardBody className="p-4">
            <div 
              className="cursor-pointer hover:bg-bg-tertiary/50 transition-colors"
              onClick={() => setStatusFilter(statusFilter === 'FILLED' ? 'all' : 'FILLED')}
            >
              <p className="text-2xl font-bold font-display text-blue-400">{stats?.filled || 0}</p>
              <p className="text-xs text-text-muted">🍺 სავსე (საწყობში)</p>
            </div>
          </CardBody>
        </Card>

        <Card className={statusFilter === 'CLEANING' ? 'ring-2 ring-cyan-500' : ''}>
          <CardBody className="p-4">
            <div 
              className="cursor-pointer hover:bg-bg-tertiary/50 transition-colors"
              onClick={() => setStatusFilter(statusFilter === 'CLEANING' ? 'all' : 'CLEANING')}
            >
              <p className="text-2xl font-bold font-display text-cyan-400">{stats?.cleaning || 0}</p>
              <p className="text-xs text-text-muted">🧹 გასარეცხი</p>
            </div>
          </CardBody>
        </Card>

        <Card className={statusFilter === 'DAMAGED' ? 'ring-2 ring-red-500' : ''}>
          <CardBody className="p-4">
            <div 
              className="cursor-pointer hover:bg-bg-tertiary/50 transition-colors"
              onClick={() => setStatusFilter(statusFilter === 'DAMAGED' ? 'all' : 'DAMAGED')}
            >
              <p className="text-2xl font-bold font-display text-red-400">{stats?.damaged || 0}</p>
              <p className="text-xs text-text-muted">⚠️ დაზიანებული</p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardBody className="p-4">
          <div className="flex flex-wrap gap-4">
            {/* Status Filter Pills */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-muted">სტატუსი</span>
              <div className="flex gap-1">
                {[
                  { key: 'all', label: 'ყველა' },
                  { key: 'FILLED', label: '🍺 სავსე' },
                  { key: 'WITH_CUSTOMER', label: '👤 კლიენტთან' },
                  { key: 'CLEANING', label: '🧹 გასარეცხი' },
                  { key: 'AVAILABLE', label: '✓ ხელმისაწვდომი' },
                  { key: 'DAMAGED', label: '⚠️ დაზიანებული' },
                  { key: 'IN_TRANSIT', label: '🚚 გზაში' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setStatusFilter(key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      statusFilter === key
                        ? 'bg-copper text-white'
                        : 'bg-bg-tertiary text-text-muted hover:bg-bg-card'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Customer Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-muted">კლიენტი</span>
              <select
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                className="px-3 py-1.5 bg-bg-tertiary border border-border rounded-lg text-sm outline-none focus:border-copper"
              >
                <option value="all">ყველა კლიენტი</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Size Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-muted">ზომა</span>
              <select
                value={sizeFilter}
                onChange={(e) => setSizeFilter(e.target.value)}
                className="px-3 py-1.5 bg-bg-tertiary border border-border rounded-lg text-sm outline-none focus:border-copper"
              >
                <option value="all">ყველა ზომა</option>
                <option value="20">20L</option>
                <option value="30">30L</option>
                <option value="50">50L</option>
              </select>
            </div>

            {/* Overdue Toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={overdueOnly}
                onChange={(e) => setOverdueOnly(e.target.checked)}
                className="w-4 h-4 accent-red-500"
              />
              <span className="text-sm text-text-muted">მხოლოდ ვადაგადაცილებული</span>
            </label>
          </div>
        </CardBody>
      </Card>

      {/* Kegs List */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold">🛢️ კეგების სია ({kegs.length})</h3>
        </CardHeader>
        <CardBody className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-copper"></div>
            </div>
          ) : kegs.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              კეგები ვერ მოიძებნა
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-bg-tertiary/50">
                    <th className="text-left px-4 py-3 text-sm font-medium text-text-muted">კეგი #</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-text-muted">ზომა</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-text-muted">სტატუსი</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-text-muted">პროდუქტი</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-text-muted">კლიენტი</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-text-muted">გაგზავნის თარიღი</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-text-muted">დღეები</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-text-muted">მოქმედება</th>
                  </tr>
                </thead>
                <tbody>
                  {kegs.map(keg => (
                    <tr 
                      key={keg.id} 
                      className={`border-b border-border hover:bg-bg-tertiary/30 transition-colors ${
                        keg.isOverdue ? 'bg-red-500/5' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm">{keg.kegNumber}</span>
                      </td>
                      <td className="px-4 py-3 text-sm">{keg.size}L</td>
                      <td className="px-4 py-3">{getStatusBadge(keg.status)}</td>
                      <td className="px-4 py-3 text-sm">{keg.productName || '-'}</td>
                      <td className="px-4 py-3 text-sm">{keg.customerName || '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        {keg.sentAt ? formatDate(new Date(keg.sentAt)) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {keg.daysOut !== null ? (
                          <span className={keg.isOverdue ? 'text-red-400 font-medium' : ''}>
                            {keg.daysOut} დღე
                            {keg.isOverdue && ' ⚠️'}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {/* Return button for WITH_CUSTOMER */}
                          {keg.status === 'WITH_CUSTOMER' && (
                            <button
                              onClick={() => { setSelectedKeg(keg); setShowReturnModal(true); }}
                              className="px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg text-xs font-medium hover:bg-purple-500/30 transition-colors"
                            >
                              დაბრუნება
                            </button>
                          )}
                          
                          {/* Clean button for CLEANING */}
                          {keg.status === 'CLEANING' && (
                            <button
                              onClick={() => handleMarkCleaned(keg.id)}
                              disabled={updating === keg.id}
                              className="px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg text-xs font-medium hover:bg-cyan-500/30 transition-colors disabled:opacity-50"
                            >
                              {updating === keg.id ? '...' : '✓ გაირეცხა'}
                            </button>
                          )}
                          
                          {/* History button */}
                          <button
                            onClick={() => { setSelectedKeg(keg); setShowHistoryModal(true); }}
                            className="p-1.5 text-text-muted hover:text-copper transition-colors"
                            title="ისტორია"
                          >
                            📜
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Return Modal */}
      {showReturnModal && selectedKeg && (
        <KegReturnModal
          keg={selectedKeg}
          onClose={() => { setShowReturnModal(false); setSelectedKeg(null); }}
          onConfirm={(condition, notes) => handleReturn(selectedKeg.id, condition, notes)}
        />
      )}

      {/* History Modal */}
      {showHistoryModal && selectedKeg && (
        <KegHistoryModal
          keg={selectedKeg}
          onClose={() => { setShowHistoryModal(false); setSelectedKeg(null); }}
        />
      )}
    </DashboardLayout>
  )
}

// ═══════════════════════════════════════════════════════════
// Keg Return Modal Component
// ═══════════════════════════════════════════════════════════
function KegReturnModal({ 
  keg, 
  onClose, 
  onConfirm 
}: { 
  keg: Keg
  onClose: () => void
  onConfirm: (condition: string, notes: string) => void
}) {
  const [condition, setCondition] = useState<'GOOD' | 'NEEDS_CLEANING' | 'DAMAGED'>('GOOD')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    await onConfirm(condition, notes)
    setIsSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-bg-secondary border border-border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center">
          <h2 className="text-xl font-display font-semibold">🛢️ კეგის დაბრუნება</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-bg-card border border-border flex items-center justify-center hover:border-red-500 hover:text-red-500">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Keg Info */}
          <div className="p-4 bg-bg-card border border-border rounded-xl">
            <p className="font-mono text-copper-light text-lg">{keg.kegNumber}</p>
            <p className="text-sm text-text-muted">{keg.size}L • {keg.productName || 'ცარიელი'}</p>
            <p className="text-sm text-text-muted mt-1">კლიენტი: {keg.customerName}</p>
            {keg.daysOut !== null && (
              <p className={`text-sm mt-1 ${keg.isOverdue ? 'text-red-400' : 'text-text-muted'}`}>
                კლიენტთან: {keg.daysOut} დღე {keg.isOverdue && '(ვადაგადაცილებული)'}
              </p>
            )}
          </div>

          {/* Condition Selection */}
          <div>
            <label className="block text-sm font-medium mb-3">მდგომარეობა *</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setCondition('GOOD')}
                className={`p-3 rounded-xl border text-center transition-all ${
                  condition === 'GOOD' 
                    ? 'border-green-500 bg-green-500/10 text-green-400' 
                    : 'border-border bg-bg-card hover:border-green-500/50'
                }`}
              >
                <span className="text-2xl block mb-1">✓</span>
                <span className="text-xs">კარგი</span>
              </button>
              <button
                onClick={() => setCondition('NEEDS_CLEANING')}
                className={`p-3 rounded-xl border text-center transition-all ${
                  condition === 'NEEDS_CLEANING' 
                    ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400' 
                    : 'border-border bg-bg-card hover:border-cyan-500/50'
                }`}
              >
                <span className="text-2xl block mb-1">🧹</span>
                <span className="text-xs">გასარეცხი</span>
              </button>
              <button
                onClick={() => setCondition('DAMAGED')}
                className={`p-3 rounded-xl border text-center transition-all ${
                  condition === 'DAMAGED' 
                    ? 'border-red-500 bg-red-500/10 text-red-400' 
                    : 'border-border bg-bg-card hover:border-red-500/50'
                }`}
              >
                <span className="text-2xl block mb-1">⚠️</span>
                <span className="text-xs">დაზიანებული</span>
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-2">შენიშვნა</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="დამატებითი ინფორმაცია..."
              className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg outline-none focus:border-copper resize-none"
            />
          </div>

          {/* Info messages */}
          {condition === 'GOOD' && (
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-sm text-green-400">
                ✓ კეგი დაუბრუნდება "ხელმისაწვდომი" სტატუსს
              </p>
            </div>
          )}
          {condition === 'NEEDS_CLEANING' && (
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
              <p className="text-sm text-cyan-400">
                🧹 კეგი გადავა "გასარეცხი" სტატუსში
              </p>
            </div>
          )}
          {condition === 'DAMAGED' && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-400">
                ⚠️ დაზიანებული კეგი გადავა რემონტის სტატუსში. დეპოზიტი არ დაბრუნდება.
              </p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>გაუქმება</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'დაბრუნება...' : 'დაბრუნების დადასტურება'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// Keg History Modal Component
// ═══════════════════════════════════════════════════════════
function KegHistoryModal({ 
  keg, 
  onClose 
}: { 
  keg: Keg
  onClose: () => void
}) {
  const [movements, setMovements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`/api/kegs/${keg.id}/movements`)
        if (res.ok) {
          const data = await res.json()
          setMovements(data.movements || [])
        }
      } catch (error) {
        console.error('Failed to fetch movements:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [keg.id])

  const getActionLabel = (action: string) => {
    const labels: Record<string, { label: string; icon: string; color: string }> = {
      CREATED: { label: 'შექმნილი', icon: '➕', color: 'text-green-400' },
      FILLED: { label: 'შევსებული', icon: '🍺', color: 'text-blue-400' },
      SHIPPED: { label: 'გაგზავნილი', icon: '🚚', color: 'text-purple-400' },
      RETURNED: { label: 'დაბრუნებული', icon: '↩️', color: 'text-amber-400' },
      CLEANED: { label: 'გარეცხილი', icon: '🧹', color: 'text-cyan-400' },
      DAMAGED: { label: 'დაზიანებული', icon: '⚠️', color: 'text-red-400' },
      LOST: { label: 'დაკარგული', icon: '❓', color: 'text-gray-400' },
      REPAIRED: { label: 'შეკეთებული', icon: '🔧', color: 'text-green-400' },
    }
    return labels[action] || { label: action, icon: '•', color: 'text-text-muted' }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-bg-secondary border border-border rounded-2xl w-full max-w-lg max-h-[80vh] shadow-2xl flex flex-col">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center">
          <div>
            <h2 className="text-xl font-display font-semibold">📜 კეგის ისტორია</h2>
            <p className="text-sm text-text-muted font-mono">{keg.kegNumber}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-bg-card border border-border flex items-center justify-center hover:border-red-500 hover:text-red-500">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-copper"></div>
            </div>
          ) : movements.length === 0 ? (
            <p className="text-center text-text-muted py-8">ისტორია არ მოიძებნა</p>
          ) : (
            <div className="space-y-4">
              {movements.map((movement, index) => {
                const actionConfig = getActionLabel(movement.action)
                return (
                  <div key={movement.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full ${actionConfig.color} bg-bg-card border border-border flex items-center justify-center text-sm`}>
                        {actionConfig.icon}
                      </div>
                      {index < movements.length - 1 && (
                        <div className="w-0.5 h-full bg-border mt-1"></div>
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className={`font-medium ${actionConfig.color}`}>{actionConfig.label}</p>
                      <p className="text-xs text-text-muted">
                        {formatDate(new Date(movement.createdAt))}
                      </p>
                      {movement.customerName && (
                        <p className="text-sm text-text-muted mt-1">კლიენტი: {movement.customerName}</p>
                      )}
                      {movement.productName && (
                        <p className="text-sm text-text-muted">პროდუქტი: {movement.productName}</p>
                      )}
                      {movement.notes && (
                        <p className="text-sm text-text-muted mt-1 italic">"{movement.notes}"</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border flex justify-end">
          <Button variant="secondary" onClick={onClose}>დახურვა</Button>
        </div>
      </div>
    </div>
  )
}