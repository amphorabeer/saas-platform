'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button, ProgressBar, BatchStatusBadge } from '@/components/ui'
import { formatDate, formatTime } from '@/lib/utils'
import { useBreweryStore } from '@/store'
import { CIPLogModal } from '@/components/equipment/CIPLogModal'

interface Tank {
  id: string
  name: string
  type: 'fermenter' | 'brite' | 'unitank' | 'conditioning'
  capacity: number
  currentVolume: number
  status: 'available' | 'in_use' | 'cleaning' | 'maintenance'
  needsCIP?: boolean    // ✅ ADD
  openCIPTab?: boolean  // ✅ ADD
  phase?: 'FERMENTATION' | 'CONDITIONING' | 'BRIGHT' | 'PACKAGING'  // ✅ დაამატე
  batch?: {
    id: string
    batchNumber: string
    recipe: string
    status: 'fermenting' | 'conditioning' | 'ready' | 'brewing' | 'planned' | 'packaging' | 'completed'
    startDate: Date
    estimatedEndDate: Date
    progress: number
    packagedVolume?: number  // ✅ ADD
    volume?: number          // ✅ ADD
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

interface CIPLog {
  id: string
  equipmentId: string
  cipType: string
  date: string
  duration: number
  temperature: number | null
  causticConcentration: number | null
  performedBy: string
  result: string
  notes: string | null
  createdAt: string
}

interface TankDetailModalProps {
  tank: Tank
  onClose: () => void
  onEquipmentUpdate?: () => void
}

export function TankDetailModal({ tank, onClose, onEquipmentUpdate }: TankDetailModalProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'overview' | 'log' | 'cip'>('overview')
  const [newTempTarget, setNewTempTarget] = useState(tank.temperature.target)
  const [isUpdating, setIsUpdating] = useState(false)

  // ✅ Auto-open CIP tab when openCIPTab is true
  useEffect(() => {
    if (tank?.openCIPTab) {
      setActiveTab('cip')
      setShowCipForm(true)  // Also open the CIP form
    }
  }, [tank?.openCIPTab])

  // CIP state
  const [cipLogs, setCipLogs] = useState<CIPLog[]>([])
  const [loadingCip, setLoadingCip] = useState(false)
  const [showCipForm, setShowCipForm] = useState(false)

  // ✅ Batch data (fetched from API for sync)
  const [batchData, setBatchData] = useState<any>(null)
  const [loadingBatch, setLoadingBatch] = useState(false)

  // Get real batch data from Zustand
  const batches = useBreweryStore(state => state.batches)
  const updateBatch = useBreweryStore(state => state.updateBatch)
  
  // Find the actual batch for this tank
  const realBatch = useMemo(() => {
    if (!tank.batch?.id) return null
    return batches.find(b => b.id === tank.batch?.id) || null
  }, [batches, tank.batch?.id])

  // ✅ Get batch object from API response
  const apiBatch = batchData?.batch || batchData

  // ✅ Get gravity readings from API batch data (synced with batch)
  const gravityHistory = useMemo(() => {
    if (!apiBatch?.gravityReadings) return []
    return apiBatch.gravityReadings.map((reading: any) => ({
      time: formatDate(reading.recordedAt || reading.date),
      value: reading.gravity,
      temperature: reading.temperature,
    }))
  }, [apiBatch])

  // ✅ Get timeline/log from API batch data (synced with batch)
  const activityLog = useMemo(() => {
    if (!apiBatch?.timeline) return []
    return apiBatch.timeline.map((event: any) => ({
      time: formatDate(event.createdAt || event.date),
      timeShort: formatTime(event.createdAt || event.date),
      action: event.title || event.action,
      description: event.description || event.note,
      user: event.user || event.userId,
      type: event.type,
    }))
  }, [apiBatch])

  // ✅ SYNC: Get current temperature from batch gravity readings (latest reading)
  const currentTemperature = useMemo(() => {
    if (apiBatch?.gravityReadings?.length > 0) {
      const latestReading = apiBatch.gravityReadings[0] // Already ordered desc
      if (latestReading?.temperature != null) {
        return Number(latestReading.temperature)
      }
    }
    return tank.temperature.current
  }, [apiBatch, tank.temperature.current])
  const targetTemperature = newTempTarget

  const fillPercent = Math.round((tank.currentVolume / tank.capacity) * 100)
  
  // ✅ Calculate attenuation and ABV from batch data (synced with batch - same formula as batch detail page)
  const { attenuationPercent, calculateABV } = useMemo(() => {
    // Get OG from gravity readings or batch (same as batch detail page)
    const ogReading = apiBatch?.gravityReadings?.find((r: any) => r.notes?.includes('OG') || r.notes?.includes('საწყისი'))
    const actualOG = ogReading?.gravity || (apiBatch?.originalGravity ? Number(apiBatch.originalGravity) : (tank.gravity.original || 0))
    
    // Get current gravity from latest reading (same as batch detail page)
    const latestReading = apiBatch?.gravityReadings?.[0] // Already sorted desc by recordedAt
    const currentGravity = latestReading?.gravity || (apiBatch?.currentGravity ? Number(apiBatch.currentGravity) : (tank.gravity.current || 0))
    
    // Calculate ABV: (OG - currentGravity) * 131.25 (same as batch detail page)
    const abv = actualOG && currentGravity && actualOG !== currentGravity
      ? ((actualOG - currentGravity) * 131.25)
      : 0
    
    // Calculate Attenuation: ((OG - currentGravity) / (OG - 1)) * 100 (same as batch detail page)
    const attenuation = actualOG && currentGravity && actualOG > 1 && actualOG !== currentGravity
      ? (((actualOG - currentGravity) / (actualOG - 1)) * 100)
      : 0
    
    return {
      attenuationPercent: attenuation > 0 ? Math.round(attenuation) : 0,
      calculateABV: abv > 0 ? abv.toFixed(1) : '0.0',
    }
  }, [apiBatch, tank.gravity])
  
  // ✅ Calculate progress based on batch status (same as batch detail page)
  const batchProgress = useMemo(() => {
    const status = apiBatch?.status?.toLowerCase() || tank.batch?.status
    
    // Status-based progress (same as batch detail page)
    switch (status) {
      case 'planned':
        return 0
      case 'brewing':
        return 10
      case 'fermenting':
        return 40
      case 'conditioning':
        return 70
      case 'ready':
        return 85
      case 'packaging':
        return 95
      case 'completed':
        return 100
      default:
        return 0
    }
  }, [apiBatch, tank.batch])

  // ✅ Get phase label - BATCH STATUS HAS PRIORITY!
  const getPhaseLabel = (): string => {
    const batchStatus = tank.batch?.status?.toLowerCase()
    
    // ✅ PRIORITY 1: Batch status (most accurate)
    const batchStatusLabels: Record<string, string> = {
      'fermenting': 'ფერმენტაცია',
      'brewing': 'ფერმენტაცია',
      'conditioning': 'კონდიცირება',
      'ready': 'მზადაა',
      'packaging': 'დაფასოვება',
      'completed': 'დასრულებული',
    }
    
    if (batchStatus && batchStatusLabels[batchStatus]) {
      return batchStatusLabels[batchStatus]
    }
    
    // ✅ PRIORITY 2: TankAssignment phase (fallback)
    if (tank.phase) {
      const phaseLabels: Record<string, string> = {
        'FERMENTATION': 'ფერმენტაცია',
        'CONDITIONING': 'კონდიცირება',
        'BRIGHT': 'მზადაა',
        'PACKAGING': 'დაფასოვება',
      }
      return phaseLabels[tank.phase] || tank.phase
    }
    
    return '-'
  }

  // ✅ Check if batch is active (not completed)
  const isActiveBatch = tank.batch && tank.batch.status !== 'completed'

  // Fetch CIP logs when CIP tab is active
  useEffect(() => {
    if (activeTab === 'cip') {
      fetchCipLogs()
    }
  }, [activeTab, tank.id])

  const fetchCipLogs = async () => {
    setLoadingCip(true)
    try {
      const response = await fetch(`/api/equipment/${tank.id}/cip`)
      if (response.ok) {
        const data = await response.json()
        setCipLogs(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error fetching CIP logs:', error)
    } finally {
      setLoadingCip(false)
    }
  }

  // ✅ Fetch batch data from API (gravity readings, timeline, etc.)
  const fetchBatchData = async () => {
    if (!tank.batch?.id) return
    
    setLoadingBatch(true)
    try {
      const response = await fetch(`/api/batches/${tank.batch.id}`)
      if (response.ok) {
        const data = await response.json()
        setBatchData(data)
      }
    } catch (error) {
      console.error('Error fetching batch data:', error)
    } finally {
      setLoadingBatch(false)
    }
  }

  // Fetch batch data when modal opens
  useEffect(() => {
    if (tank.batch?.id) {
      fetchBatchData()
    }
  }, [tank.batch?.id])

  const handleViewBatch = () => {
    if (tank.batch?.id) {
      onClose()
      router.push(`/production/${tank.batch.id}`)
    }
  }

  const handleUpdateTemperature = () => {
    if (!realBatch?.id) return
    setIsUpdating(true)
    updateBatch(realBatch.id, { temperature: newTempTarget })
    setTimeout(() => {
      setIsUpdating(false)
      alert('ტემპერატურა განახლდა!')
    }, 500)
  }

  // Handle CIP save from modal
  const handleCipSave = async (cipData: any) => {
    try {
      const cipTypeMap: Record<string, string> = {
        'full': 'FULL',
        'caustic_only': 'CAUSTIC',
        'sanitizer_only': 'SANITIZE',
        'rinse': 'RINSE',
      }
      
      const resultMap: Record<string, string> = {
        'success': 'PASS',
        'needs_repeat': 'PARTIAL',
        'problem': 'FAIL',
      }

      const response = await fetch(`/api/equipment/${tank.id}/cip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cipType: cipTypeMap[cipData.cipType] || 'FULL',
          duration: cipData.duration,
          temperature: cipData.temperature || null,
          causticConcentration: cipData.causticConcentration || null,
          performedBy: cipData.performedBy,
          result: resultMap[cipData.result] || 'PASS',
          notes: cipData.notes || null,
          usedSupplies: cipData.usedSupplies || [],
        }),
      })

      if (response.ok) {
        await fetchCipLogs()
        if (onEquipmentUpdate) {
          onEquipmentUpdate()
        }
        alert('CIP ჩანაწერი შენახულია! ავზი მზადაა გამოყენებისთვის.')
      } else {
        const error = await response.json()
        alert(`შეცდომა: ${error.error || 'CIP ჩანაწერის შენახვა ვერ მოხერხდა'}`)
      }
    } catch (error) {
      console.error('Error saving CIP:', error)
      alert('შეცდომა CIP ჩანაწერის შენახვისას')
    }
  }

  // Format CIP type for display
  const formatCipType = (type: string) => {
    const types: Record<string, string> = {
      'FULL': 'სრული CIP',
      'CAUSTIC': 'მხოლოდ კაუსტიკი',
      'SANITIZE': 'სანიტარიზაცია',
      'RINSE': 'სწრაფი rinse',
      'QUICK': 'სწრაფი CIP',
      'full': 'სრული CIP',
    }
    return types[type] || type
  }

  const formatResult = (result: string) => {
    const results: Record<string, { text: string; color: string }> = {
      'PASS': { text: 'წარმატებული', color: 'text-green-400' },
      'FAIL': { text: 'პრობლემა', color: 'text-red-400' },
      'PARTIAL': { text: 'გამეორება საჭირო', color: 'text-amber-400' },
      'success': { text: 'წარმატებული', color: 'text-green-400' },
    }
    return results[result] || { text: result, color: 'text-text-primary' }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-bg-secondary border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-bg-tertiary flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-copper/20 flex items-center justify-center text-2xl">
              🛢️
            </div>
            <div>
              <h2 className="text-xl font-display font-semibold">{tank.name}</h2>
              <p className="text-sm text-text-muted">
                {tank.type === 'fermenter' ? 'ფერმენტატორი' : tank.type === 'unitank' ? 'Unitank' : 'ბრაიტ ავზი'} • {tank.capacity}L
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {tank.status === 'cleaning' && (
              <span className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-sm font-medium">
                საჭიროებს CIP-ს
              </span>
            )}
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-bg-card border border-border flex items-center justify-center hover:border-danger hover:text-danger transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 border-b border-border flex-shrink-0">
          <div className="flex gap-4">
            {[
              { key: 'overview', label: 'მიმოხილვა', icon: '📊' },
              { key: 'log', label: 'ჟურნალი', icon: '📋' },
              { key: 'cip', label: 'CIP', icon: '🧹', badge: tank.status === 'cleaning' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === tab.key
                    ? 'border-copper text-copper-light'
                    : 'border-transparent text-text-muted hover:text-text-primary'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
                {tab.badge && (
                  <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {isActiveBatch && (
                  <div className="bg-bg-card border border-border rounded-xl p-4">
                    <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                      🍺 აქტიური პარტია
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-mono text-copper-light">{tank.batch!.batchNumber}</span>
                        <BatchStatusBadge status={tank.batch!.status} showPulse={tank.batch!.status === 'fermenting'} />
                      </div>
                      {/* ✅ Phase label */}
                      <div className="flex justify-between text-sm">
                        <span className="text-text-muted">ფაზა:</span>
                        <span className="font-medium">{getPhaseLabel()}</span>
                      </div>
                      <p className="text-lg font-medium">{tank.batch!.recipe}</p>
                      <div className="flex justify-between text-sm">
                        <span className="text-text-muted">დაწყება:</span>
                        <span>{formatDate(tank.batch!.startDate)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-text-muted">სავარაუდო დასრულება:</span>
                        <span>{formatDate(tank.batch!.estimatedEndDate)}</span>
                      </div>
                      <div className="mt-2">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-text-muted">პროგრესი</span>
                          <span>{batchProgress}%</span>
                        </div>
                        <ProgressBar value={batchProgress} color="copper" />
                      </div>
                    </div>
                  </div>
                )}

                {/* ✅ Completed batch - show different message */}
                {tank.batch && tank.batch.status === 'completed' && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                    <h3 className="text-sm font-medium mb-2 flex items-center gap-2 text-green-400">
                      ✅ პარტია დასრულებულია
                    </h3>
                    <p className="text-sm text-text-muted mb-2">
                      {tank.batch.batchNumber} - {tank.batch.recipe}
                    </p>
                    <p className="text-xs text-text-muted">
                      ტანკს ესაჭიროება CIP პროცედურა.
                    </p>
                  </div>
                )}

                {!tank.batch && tank.status === 'cleaning' && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                    <h3 className="text-sm font-medium mb-2 flex items-center gap-2 text-amber-400">
                      ⚠️ საჭიროებს CIP-ს
                    </h3>
                    <p className="text-sm text-text-muted mb-3">
                      ავზი გაცარიელებულია და საჭიროებს CIP პროცედურას.
                    </p>
                    <Button variant="primary" onClick={() => setActiveTab('cip')} className="w-full">
                      🧹 CIP ჩანაწერის დამატება
                    </Button>
                  </div>
                )}

                {!tank.batch && tank.status === 'available' && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                    <h3 className="text-sm font-medium mb-2 flex items-center gap-2 text-green-400">
                      ✅ მზადაა
                    </h3>
                    <p className="text-sm text-text-muted">
                      ავზი სუფთაა და მზადაა ახალი პარტიისთვის.
                    </p>
                  </div>
                )}

                <div className="bg-bg-card border border-border rounded-xl p-4">
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">📦 მოცულობა</h3>
                  <div className="space-y-3">
                    <div className="h-32 bg-bg-tertiary rounded-lg flex items-end overflow-hidden relative">
                      <div 
                        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-amber-600/50 to-amber-400/30 transition-all duration-500"
                        style={{ height: `${fillPercent}%` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-3xl font-bold">{fillPercent}%</span>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <p className="text-lg font-bold">{tank.currentVolume} L</p>
                      <p className="text-xs text-text-muted">/ {tank.capacity} L</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <div className="bg-bg-card border border-border rounded-xl p-4">
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">🌡️ ტემპერატურა</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center p-3 bg-bg-tertiary rounded-lg">
                      <p className="text-2xl font-mono font-bold text-amber-400">{currentTemperature.toFixed(1)}°C</p>
                      <p className="text-xs text-text-muted">მიმდინარე</p>
                    </div>
                    <div className="text-center p-3 bg-bg-tertiary rounded-lg">
                      <p className="text-2xl font-mono font-bold text-green-400">{targetTemperature.toFixed(1)}°C</p>
                      <p className="text-xs text-text-muted">სამიზნე</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.5"
                      value={newTempTarget}
                      onChange={(e) => setNewTempTarget(parseFloat(e.target.value) || 0)}
                      className="flex-1 px-3 py-2 bg-bg-tertiary border border-border rounded-lg font-mono text-center"
                    />
                    <Button variant="primary" onClick={handleUpdateTemperature} disabled={isUpdating}>
                      {isUpdating ? '...' : 'განახლება'}
                    </Button>
                  </div>
                </div>

                <div className="bg-bg-card border border-border rounded-xl p-4">
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">📈 სიმკვრივე</h3>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center">
                      <p className="text-xl font-mono text-amber-400">
                        {apiBatch?.originalGravity ? Number(apiBatch.originalGravity).toFixed(3) : tank.gravity.original.toFixed(3)}
                      </p>
                      <p className="text-xs text-text-muted">OG</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-mono text-purple-400">
                        {apiBatch?.currentGravity ? Number(apiBatch.currentGravity).toFixed(3) : (tank.gravity.current || 0).toFixed(3)}
                      </p>
                      <p className="text-xs text-text-muted">SG</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-mono text-green-400">
                        {apiBatch?.finalGravity ? Number(apiBatch.finalGravity).toFixed(3) : tank.gravity.target.toFixed(3)}
                      </p>
                      <p className="text-xs text-text-muted">FG</p>
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-text-muted">ატენუაცია</span>
                      <span>{Math.min(attenuationPercent, 100)}%</span>
                    </div>
                    <ProgressBar value={Math.min(attenuationPercent, 100)} color="success" />
                  </div>
                  <div className="flex justify-between items-center p-3 bg-bg-tertiary rounded-lg">
                    <span className="text-sm text-text-muted">სავარაუდო ABV</span>
                    <span className="text-lg font-bold text-copper-light">{calculateABV}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'log' && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium mb-4">აქტივობის ჟურნალი</h3>
              {activityLog.length > 0 ? (
                activityLog.map((log: any, i: number) => (
                  <div key={i} className="flex items-center gap-4 p-3 bg-bg-card border border-border rounded-lg">
                    <div className="w-24 text-xs text-text-muted">
                      <div>{log.time}</div>
                      <div>{log.timeShort}</div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{log.action}</p>
                      <p className="text-xs text-text-muted">{log.description}</p>
                    </div>
                    <div className="text-xs text-text-muted">{log.user}</div>
                  </div>
                ))
              ) : (
                <div className="h-32 flex items-center justify-center text-text-muted">
                  აქტივობის ჩანაწერები არ არის
                </div>
              )}
            </div>
          )}

          {activeTab === 'cip' && (
            <div className="space-y-6">
              {tank.status === 'cleaning' && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                  <p className="text-sm text-amber-400 flex items-center gap-2">
                    ⚠️ ტანკს ესაჭიროება CIP პროცედურა სანამ ახალი პარტია დაიწყება
                  </p>
                </div>
              )}

              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  🧹 CIP (Clean-In-Place) ისტორია
                </h3>
                <Button variant="primary" onClick={() => setShowCipForm(true)}>
                  + CIP ჩანაწერი
                </Button>
              </div>

              {/* CIP Logs List */}
              <div className="bg-bg-card border border-border rounded-xl p-4">
                {loadingCip ? (
                  <div className="h-32 flex items-center justify-center text-text-muted">
                    იტვირთება...
                  </div>
                ) : cipLogs.length > 0 ? (
                  <div className="space-y-3">
                    {cipLogs.map((log) => (
                      <div key={log.id} className="p-3 bg-bg-tertiary rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="font-medium">{formatCipType(log.cipType)}</span>
                            <span className="text-sm text-text-muted ml-2">
                              {formatDate(new Date(log.date))}
                            </span>
                          </div>
                          <span className={`text-sm font-medium ${formatResult(log.result).color}`}>
                            {formatResult(log.result).text}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-sm text-text-muted">
                          <div>
                            <span className="text-xs">ხანგრძლივობა:</span>
                            <p className="text-text-primary">{log.duration} წთ</p>
                          </div>
                          <div>
                            <span className="text-xs">ტემპ:</span>
                            <p className="text-text-primary">{log.temperature || '-'}°C</p>
                          </div>
                          <div>
                            <span className="text-xs">კაუსტიკი:</span>
                            <p className="text-text-primary">{log.causticConcentration || '-'}%</p>
                          </div>
                          <div>
                            <span className="text-xs">შემსრულებელი:</span>
                            <p className="text-text-primary">{log.performedBy}</p>
                          </div>
                        </div>
                        {log.notes && (
                          <p className="text-xs text-text-muted mt-2 italic">{log.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-32 flex items-center justify-center text-text-muted">
                    CIP ჩანაწერები არ არის
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* CIP Modal */}
        <CIPLogModal
          isOpen={showCipForm}
          onClose={() => setShowCipForm(false)}
          onSave={handleCipSave}
          equipmentId={tank.id}
          equipmentName={tank.name}
        />

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex justify-between items-center bg-bg-secondary flex-shrink-0">
          <div className="text-xs text-text-muted">
            ბოლო განახლება: {formatTime(tank.lastUpdated)}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose}>დახურვა</Button>
            {tank.batch && (
              <Button variant="primary" onClick={handleViewBatch}>
                პარტიის ნახვა →
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}