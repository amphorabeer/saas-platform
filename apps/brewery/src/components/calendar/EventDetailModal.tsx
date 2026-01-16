'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui'
import { formatDate } from '@/lib/utils'
import { BATCH_PHASE_CONFIG, BatchPhase, PHASE_COLOR_GRADIENTS } from '@/constants'
import { useSettingsStore } from '@/store'

interface CalendarEvent {
  id: string
  type: string
  title: string
  batchId?: string
  batchNumber?: string
  recipe?: string
  recipeName?: string
  tankId?: string
  tankName?: string
  startDate: Date
  endDate: Date
  status: string
  batchStatus?: string  // PLANNED, BREWING, FERMENTING, etc.
  progress?: number
  temperature?: number
  notes?: string
  customerName?: string
  quantity?: string
  volume?: number | string
  lotId?: string
  isSplitLot?: boolean
  lotPhase?: string
}

interface EventDetailModalProps {
  event: CalendarEvent | null
  isOpen: boolean
  onClose: () => void
  onUpdate?: (updatedEvent: CalendarEvent) => void
  onDelete?: () => void
  onPhaseChange?: (batchId: string, newPhase: string, lotId?: string) => Promise<void>
  onRefresh?: () => void  // ✅ For refreshing data after completion
}

// Fallback config for non-batch events
const EVENT_CONFIG: Record<string, { icon: string; title: string; color: string; headerColor: string; label: string; textColor: string; nextPhase: null; nextPhaseLabel: null }> = {
  maintenance: { 
    icon: '🔧', 
    title: 'მომსახურება', 
    color: 'bg-gradient-to-r from-orange-500 to-red-600',
    headerColor: 'bg-gradient-to-r from-orange-500 to-red-600',
    label: 'მომსახურება', 
    textColor: 'text-orange-400',
    nextPhase: null,
    nextPhaseLabel: null,
  },
  cip: { 
    icon: '🧹', 
    title: 'CIP', 
    color: 'bg-gradient-to-r from-blue-400 to-cyan-500',
    headerColor: 'bg-gradient-to-r from-blue-400 to-cyan-500',
    label: 'CIP', 
    textColor: 'text-blue-400',
    nextPhase: null,
    nextPhaseLabel: null,
  },
  order: { 
    icon: '📦', 
    title: 'შეკვეთა', 
    color: 'bg-gradient-to-r from-green-500 to-emerald-600',
    headerColor: 'bg-gradient-to-r from-green-500 to-emerald-600',
    label: 'შეკვეთა', 
    textColor: 'text-green-400',
    nextPhase: null,
    nextPhaseLabel: null,
  },
  delivery: { 
    icon: '🚚', 
    title: 'მიწოდება', 
    color: 'bg-gradient-to-r from-purple-500 to-violet-600',
    headerColor: 'bg-gradient-to-r from-purple-500 to-violet-600',
    label: 'მიწოდება', 
    textColor: 'text-purple-400',
    nextPhase: null,
    nextPhaseLabel: null,
  },
}

export function EventDetailModal({ event, isOpen, onClose, onUpdate, onDelete, onPhaseChange, onRefresh }: EventDetailModalProps) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [freshBatchStatus, setFreshBatchStatus] = useState<string | null>(
    event?.batchStatus?.toUpperCase() || null
  )
  
  // ✅ Get phase colors from settings store
  const { phaseColors } = useSettingsStore()

  // Reset states and immediately set from event.batchStatus so button shows
  useEffect(() => {
    setIsUpdating(false)
    setFreshBatchStatus(event?.batchStatus?.toUpperCase() || null)
  }, [event?.id, event?.batchStatus, event?.volume, isOpen])

  // Fetch fresh batch status when modal opens (updates if different)
  useEffect(() => {
    if (isOpen && event?.batchId) {
      fetch(`/api/batches/${event.batchId}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          const status = data?.batch?.status || data?.status
          if (status) {
            setFreshBatchStatus(status.toUpperCase())
          }
        })
        .catch(err => console.error('[EventDetailModal] Error:', err))
    }
  }, [isOpen, event?.batchId])

  if (!isOpen || !event) return null

  const handleViewDetails = () => {
    if (event?.batchId) {
      // ✅ For split lots, add lotId query parameter
      const lotParam = event.lotId ? `?lotId=${event.lotId}` : ''
      router.push(`/production/${event.batchId}${lotParam}`)
      onClose()
    }
  }

  const handleCompleteBatch = async () => {
    if (!event?.batchId) return
    
    setIsCompleting(true)
    try {
      const response = await fetch(`/api/batches/${event.batchId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          notes: '',
          lotId: event.lotId  // ✅ Pass lotId for split batches
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'დასრულება ვერ მოხერხდა')
      }
      
      // Refresh and close
      if (onRefresh) onRefresh()
      onClose()
    } catch (error: any) {
      console.error('Complete error:', error)
      alert(error.message || 'დასრულება ვერ მოხერხდა')
    } finally {
      setIsCompleting(false)
      setShowCompleteConfirm(false)
    }
  }

  const isBatchEvent = Boolean(event.batchId)
  const duration = Math.ceil(Math.abs(new Date(event.endDate).getTime() - new Date(event.startDate).getTime()) / (1000 * 60 * 60 * 24))

  // Detect phase from multiple sources
  const detectPhase = (): BatchPhase => {
    // 0. READY and PACKAGING status always prioritized
    if (event.status) {
      const eventStatus = event.status.toUpperCase()
      if (['READY', 'PACKAGING', 'COMPLETED'].includes(eventStatus) && eventStatus in BATCH_PHASE_CONFIG) {
        return eventStatus as BatchPhase
      }
    }
    
    // 1. For split lot events, use event.status for FERMENTING/CONDITIONING
    if ((event as any).isSplitLot && event.status) {
      const eventStatus = event.status.toUpperCase()
      if (eventStatus in BATCH_PHASE_CONFIG) {
        return eventStatus as BatchPhase
      }
    }
    
    // 2. For ANY event with status CONDITIONING or FERMENTING, use it
    if (event.status) {
      const eventStatus = event.status.toUpperCase()
      if (['CONDITIONING', 'FERMENTING'].includes(eventStatus) && eventStatus in BATCH_PHASE_CONFIG) {
        return eventStatus as BatchPhase
      }
    }
    
    // 3. Check freshBatchStatus for non-split batches or when event type doesn't match
    if (freshBatchStatus) {
      const fresh = freshBatchStatus.toUpperCase()
      if (['PACKAGING', 'COMPLETED'].includes(fresh) && fresh in BATCH_PHASE_CONFIG) {
        return fresh as BatchPhase
      }
    }
    
    // 4. Check event.type for conditioning/fermentation (only if status not available)
    if (event.type === 'conditioning' && !event.status?.toUpperCase().includes('READY')) {
      return 'CONDITIONING' as BatchPhase
    }
    if (event.type === 'fermentation') {
      return 'FERMENTING' as BatchPhase
    }
    
    // 5. Try fresh batch status from API (for non-split batches only)
    if (freshBatchStatus && !(event as any).isSplitLot && !event.type?.match(/fermentation|conditioning/)) {
      if (freshBatchStatus in BATCH_PHASE_CONFIG) {
        return freshBatchStatus as BatchPhase
      }
    }
    
    // 6. Try batchStatus from event (for simple batches)
    if (event.batchStatus && !(event as any).isSplitLot) {
      const upper = event.batchStatus.toUpperCase()
      if (upper in BATCH_PHASE_CONFIG) {
        return upper as BatchPhase
      }
    }
    
    // 7. Try event.type mapping
    const typeMapping: Record<string, BatchPhase> = {
      'brewing': 'BREWING',
      'fermentation': 'FERMENTING',
      'conditioning': 'CONDITIONING',
      'packaging': 'PACKAGING',
      'ready': 'READY',
    }
    if (event.type && typeMapping[event.type.toLowerCase()]) {
      return typeMapping[event.type.toLowerCase()]
    }
    
    // 8. Try event.status as last resort
    if (event.status) {
      const upper = event.status.toUpperCase()
      if (upper in BATCH_PHASE_CONFIG) {
        return upper as BatchPhase
      }
    }
    
    // 9. Default
    return 'PLANNED'
  }

  const phase = detectPhase()
  const phaseConfig = isBatchEvent && BATCH_PHASE_CONFIG[phase] 
    ? BATCH_PHASE_CONFIG[phase] 
    : EVENT_CONFIG[event.type] || { 
        icon: '📅', 
        title: event.type || 'Event', 
        color: 'bg-gradient-to-r from-slate-600 to-slate-700', 
        headerColor: 'bg-gradient-to-r from-slate-600 to-slate-700',
        label: event.type || 'Event', 
        textColor: 'text-slate-400',
        nextPhase: null,
        nextPhaseLabel: null,
      }

  // ✅ Get dynamic header color from settings store
  const getHeaderColor = (): string => {
    if (!isBatchEvent) {
      return phaseConfig.headerColor || phaseConfig.color
    }
    
    // Get color key from store for this phase
    const colorKey = phaseColors[phase] || 'amber'
    const colorConfig = PHASE_COLOR_GRADIENTS[colorKey]
    
    // Use header gradient if available, otherwise fall back to bar gradient
    return colorConfig?.header || colorConfig?.bar || phaseConfig.headerColor || phaseConfig.color
  }

  // ფაზები რომლებიც საჭიროებს დამატებით input-ს
  const phasesRequiringInput = ['FERMENTING', 'CONDITIONING']
  const needsInput = phaseConfig.nextPhase && phasesRequiringInput.includes(phaseConfig.nextPhase)

  // ✅ FIX: For split lot events, use lot's status (event.status), not batch status
  // This ensures Lot B in FERMENTATION shows correct buttons even when Lot A is in PACKAGING
  const isPackagingPhase = (event as any).isSplitLot
    ? event?.status === 'PACKAGING'  // For split lots: only check lot's own status
    : (event?.status === 'PACKAGING' || event?.batchStatus === 'PACKAGING' || freshBatchStatus === 'PACKAGING')  // For non-split: check all

  const handlePhaseChange = async () => {
    if (!event.batchId || !phaseConfig.nextPhase) return
    
    if (onPhaseChange) {
      setIsUpdating(true)
      try {
        await onPhaseChange(event.batchId, phaseConfig.nextPhase, (event as any).lotId)
        onClose()
      } catch (error) {
        console.error('Error changing phase:', error)
        setIsUpdating(false)
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-bg-card border border-border rounded-2xl w-full max-w-md mx-4 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        
        {/* Header - Dynamic color based on phase from Settings */}
        <div className={`p-6 ${getHeaderColor()} relative`}>
          {/* Close X button */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <span className="text-white text-xl leading-none">×</span>
          </button>
          
          <div className="flex items-center gap-3">
            <span className="text-3xl">{phaseConfig.icon}</span>
            <div>
              <h2 className="text-xl font-bold text-white">{phaseConfig.label}</h2>
              {event.batchNumber && (
                <p className="text-white/80 text-sm">{event.batchNumber}</p>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Recipe */}
          {(event.recipe || event.recipeName) && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-text-muted">რეცეპტი:</span>
              <span className="font-medium text-text-primary">{event.recipe || event.recipeName}</span>
            </div>
          )}

          {/* Volume */}
          {(event.volume !== undefined && event.volume !== null && event.volume !== '' && event.volume !== 0) && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-text-muted">მოცულობა:</span>
              <span className="font-medium text-text-primary">{event.volume} L</span>
            </div>
          )}

          {/* Tank */}
          {event.tankName && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-text-muted">ავზი:</span>
              <span className="font-medium text-text-primary">{event.tankName}</span>
            </div>
          )}

          {/* Customer */}
          {event.customerName && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-text-muted">კლიენტი:</span>
              <span className="font-medium text-text-primary">{event.customerName}</span>
            </div>
          )}

          {/* Quantity */}
          {event.quantity && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-text-muted">რაოდენობა:</span>
              <span className="font-medium text-text-primary">{event.quantity}</span>
            </div>
          )}

          {/* Start Date */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-text-muted">დაწყება:</span>
            <span className="font-medium text-text-primary">{formatDate(event.startDate)}</span>
          </div>

          {/* End Date */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-text-muted">დასრულება:</span>
            <span className="font-medium text-text-primary">{formatDate(event.endDate)}</span>
          </div>

          {/* Duration */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-text-muted">ხანგრძლივობა:</span>
            <span className="font-medium text-text-primary">{duration} დღე</span>
          </div>

          {/* Status */}
          {isBatchEvent && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-text-muted">სტატუსი:</span>
              <span className={`font-medium ${phaseConfig.textColor}`}>
                {phaseConfig.label}
              </span>
            </div>
          )}
          
          {/* Info message for phases requiring input */}
          {needsInput && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mt-4">
              <p className="text-amber-400 text-sm">
                💡 {phaseConfig.nextPhase === 'FERMENTING' 
                  ? 'ფერმენტაციის დასაწყებად საჭიროა ავზის არჩევა' 
                  : 'კონდიცირების დასაწყებად საჭიროა brite tank-ის არჩევა'}
              </p>
            </div>
          )}

          {/* Temperature */}
          {event.temperature !== undefined && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-text-muted">ტემპერატურა:</span>
              <span className="font-medium text-text-primary">{event.temperature}°C</span>
            </div>
          )}

          {/* Notes */}
          {event.notes && (
            <div>
              <span className="text-sm text-text-muted block mb-2">შენიშვნა:</span>
              <p className="text-sm text-text-primary bg-bg-tertiary p-3 rounded-lg">{event.notes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border">
          {/* Action Buttons */}
          <div className="flex gap-3">
            {/* დეტალები - მხოლოდ არა-PACKAGING სტატუსზე */}
            {event?.batchId && !isPackagingPhase && (
              <button
                onClick={handleViewDetails}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-bg-tertiary hover:bg-border border border-border rounded-lg text-text-primary transition-colors font-medium"
              >
                <span>📋</span>
                <span>დეტალები</span>
              </button>
            )}
            
            {/* დაფასოვება - მხოლოდ PACKAGING სტატუსზე */}
            {isPackagingPhase && event?.batchId && (
              <button
                onClick={() => {
                  // ✅ For split lots, add lotId query parameter
                  const lotParam = event.lotId ? `&lotId=${event.lotId}` : ''
                  router.push(`/production/${event.batchId}?tab=packaging${lotParam}`)
                  onClose()
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium"
              >
                <span>📦</span>
                <span>დაფასოვება</span>
              </button>
            )}
            
            {/* დასრულება - მხოლოდ PACKAGING სტატუსზე */}
            {isPackagingPhase && event?.batchId && (
              <button
                onClick={() => setShowCompleteConfirm(true)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                <span>🏁</span>
                <span>დასრულება</span>
              </button>
            )}
            
            {/* Next Phase Button - სხვა სტატუსებისთვის */}
            {isBatchEvent && phaseConfig?.nextPhase && phaseConfig?.nextPhaseLabel && onPhaseChange && 
             !isPackagingPhase && (
              <Button 
                variant="primary" 
                onClick={handlePhaseChange}
                disabled={isUpdating}
                className={`flex-1 ${needsInput ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
              >
                {isUpdating ? '⏳...' : phaseConfig.nextPhaseLabel}
              </Button>
            )}
          </div>
        </div>

        {/* Completion Confirmation Modal */}
        {showCompleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]" onClick={() => setShowCompleteConfirm(false)}>
            <div className="bg-bg-card border border-border rounded-xl p-6 max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-text-primary mb-4">
                🏁 პარტიის დასრულება
              </h3>
              <p className="text-text-secondary mb-6">
                დარჩენილია <span className="font-bold text-amber-400">{event?.volume || 0} L</span>. 
                დარწმუნებული ხართ რომ გინდათ დასრულება?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCompleteConfirm(false)}
                  className="flex-1 px-4 py-2 bg-bg-tertiary hover:bg-border border border-border text-text-primary rounded-lg transition-colors"
                >
                  გაუქმება
                </button>
                <button
                  onClick={handleCompleteBatch}
                  disabled={isCompleting}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {isCompleting ? 'იტვირთება...' : '✓ დასრულება'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}