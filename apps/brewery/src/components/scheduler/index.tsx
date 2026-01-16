'use client'

// ============================================
// TANK SCHEDULER - UI COMPONENTS
// ============================================

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui'
import { formatDate } from '@/lib/utils'

// ============================================
// TYPES (matching calendar.ts)
// ============================================

interface CalendarBlock {
  id: string
  lotId: string
  lotCode: string
  tankId: string
  tankName: string
  startDate: Date
  endDate: Date
  phase: 'FERMENTATION' | 'CONDITIONING' | 'BRIGHT' | 'PACKAGING'
  status: 'PLANNED' | 'ACTIVE' | 'COMPLETED'
  plannedVolume: number
  actualVolume?: number
  fillPercent: number
  batchCount: number
  primaryBatchNumber?: string
  primaryRecipe?: string
  isSplit: boolean
  isBlend: boolean
  splitRatio?: string
  sourceCount?: number
  parentLotCode?: string
  childLotCodes?: string[]
  colorClass: string
  opacity: number
  badges: { type: string; label: string; colorClass: string }[]
}

interface Tank {
  id: string
  name: string
  type: string
  capacity: number
  status: 'AVAILABLE' | 'PLANNED' | 'ACTIVE' | 'MAINTENANCE'
  currentPhase?: string
}

// ============================================
// 1. TANK ROW WITH LOT BLOCKS
// ============================================

interface TankSchedulerRowProps {
  tank: Tank
  blocks: CalendarBlock[]
  weekStart: Date
  onBlockClick: (block: CalendarBlock) => void
  onCellClick: (date: Date, tankId: string) => void
}

export function TankSchedulerRow({ 
  tank, 
  blocks, 
  weekStart, 
  onBlockClick, 
  onCellClick 
}: TankSchedulerRowProps) {
  const weekDays = useMemo(() => {
    const days: Date[] = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart)
      date.setDate(weekStart.getDate() + i)
      days.push(date)
    }
    return days
  }, [weekStart])

  // Calculate block positions
  const getBlockPosition = (block: CalendarBlock) => {
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)
    
    const start = new Date(block.startDate)
    const end = new Date(block.endDate)
    
    // Check if block is in this week
    if (end < weekStart || start >= weekEnd) return null
    
    // Clamp to week bounds
    const displayStart = start < weekStart ? weekStart : start
    const displayEnd = end > weekEnd ? weekEnd : end
    
    const weekMs = 7 * 24 * 60 * 60 * 1000
    const startOffset = displayStart.getTime() - weekStart.getTime()
    const duration = displayEnd.getTime() - displayStart.getTime()
    
    return {
      left: (startOffset / weekMs) * 100,
      width: Math.max((duration / weekMs) * 100, 5), // Min 5% width
    }
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  // Tank status indicator
  const getStatusColor = () => {
    switch (tank.status) {
      case 'ACTIVE': return 'bg-green-500'
      case 'PLANNED': return 'bg-blue-500'
      case 'MAINTENANCE': return 'bg-orange-500'
      default: return 'bg-gray-400'
    }
  }

  return (
    <div className="flex border-b border-border">
      {/* Tank Info */}
      <div className="w-48 flex-shrink-0 p-3 border-r border-border bg-bg-card">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
          <span className="font-medium text-sm">{tank.name}</span>
        </div>
        <div className="text-xs text-text-muted mt-1">
          {tank.type} • {tank.capacity}L
        </div>
        {tank.currentPhase && (
          <div className="text-xs text-copper-light mt-1">
            {formatPhaseLabel(tank.currentPhase)}
          </div>
        )}
      </div>

      {/* Timeline Grid */}
      <div className="flex-1 grid grid-cols-7 relative" style={{ minHeight: '72px' }}>
        {/* Day cells (for click handling) */}
        {weekDays.map((day, i) => (
          <div
            key={i}
            className={`border-r border-border/30 cursor-pointer hover:bg-bg-tertiary/30 transition-colors ${
              isToday(day) ? 'bg-copper/5' : ''
            } ${i >= 5 ? 'bg-bg-tertiary/20' : ''}`}
            onClick={() => {
              // Only allow click if tank is available or this day has no block
              if (tank.status === 'AVAILABLE' || tank.status === 'PLANNED') {
                onCellClick(day, tank.id)
              }
            }}
          />
        ))}

        {/* Lot Blocks */}
        {blocks.map(block => {
          const position = getBlockPosition(block)
          if (!position) return null

          return (
            <LotBlock
              key={block.id}
              block={block}
              style={{
                left: `${position.left}%`,
                width: `${position.width}%`,
              }}
              onClick={() => onBlockClick(block)}
            />
          )
        })}
      </div>
    </div>
  )
}

// ============================================
// 2. LOT BLOCK COMPONENT
// ============================================

interface LotBlockProps {
  block: CalendarBlock
  style: React.CSSProperties
  onClick: () => void
}

function LotBlock({ block, style, onClick }: LotBlockProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className={`absolute top-1 bottom-1 rounded-lg cursor-pointer transition-all duration-200 
        ${block.colorClass} text-white text-xs font-medium overflow-hidden
        ${isHovered ? 'scale-[1.02] shadow-xl z-20' : 'z-10'}
        ${block.status === 'COMPLETED' ? 'opacity-60' : ''}
        ${block.status === 'PLANNED' ? 'border-2 border-dashed border-white/40' : ''}
      `}
      style={{ ...style, opacity: block.opacity }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      <div className="px-2 py-1 h-full flex flex-col justify-between">
        {/* Top: Lot code + badges */}
        <div className="flex items-center gap-1 flex-wrap">
          <span className="font-semibold truncate">{block.lotCode}</span>
          {block.badges.slice(0, 2).map((badge, i) => (
            <span
              key={i}
              className={`px-1.5 py-0.5 rounded text-[10px] ${badge.colorClass}`}
            >
              {badge.label}
            </span>
          ))}
        </div>

        {/* Bottom: Batch info */}
        <div className="flex items-center justify-between text-[10px] text-white/80">
          <span className="truncate">
            {block.primaryBatchNumber && `${block.primaryBatchNumber}`}
            {block.batchCount > 1 && ` +${block.batchCount - 1}`}
          </span>
          <span>{block.plannedVolume}L</span>
        </div>
      </div>

      {/* Fill indicator */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-1 bg-black/20"
      >
        <div 
          className="h-full bg-white/40"
          style={{ width: `${block.fillPercent}%` }}
        />
      </div>
    </div>
  )
}

// ============================================
// 3. BLOCK DETAIL PANEL
// ============================================

interface BlockDetailPanelProps {
  block: CalendarBlock
  detail: any // BlockDetail from calendar.ts
  isOpen: boolean
  onClose: () => void
  onStartLot: () => void
  onCompleteLot: () => void
  onPlanTransfer: () => void
}

export function BlockDetailPanel({
  block,
  detail,
  isOpen,
  onClose,
  onStartLot,
  onCompleteLot,
  onPlanTransfer,
}: BlockDetailPanelProps) {
  if (!isOpen || !detail) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      <div className="relative bg-bg-secondary border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className={`px-6 py-4 ${block.colorClass}`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">{block.lotCode}</h2>
              <p className="text-white/80 text-sm">
                {formatPhaseLabel(block.phase)} • {block.status}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/20 text-white hover:bg-white/30 flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
          {/* Volume & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-bg-card rounded-xl border border-border">
              <p className="text-xs text-text-muted mb-1">მოცულობა</p>
              <p className="text-2xl font-bold text-copper-light">
                {detail.lot.actualVolume || detail.lot.plannedVolume}L
              </p>
              <p className="text-xs text-text-muted">
                დაგეგმილი: {detail.lot.plannedVolume}L
              </p>
            </div>
            <div className="p-4 bg-bg-card rounded-xl border border-border">
              <p className="text-xs text-text-muted mb-1">პერიოდი</p>
              <p className="text-sm font-medium">
                {formatDate(block.startDate)} → {formatDate(block.endDate)}
              </p>
              <p className="text-xs text-text-muted">
                {Math.ceil((block.endDate.getTime() - block.startDate.getTime()) / (1000 * 60 * 60 * 24))} დღე
              </p>
            </div>
          </div>

          {/* Source Batches */}
          <div>
            <h3 className="text-sm font-medium mb-2">
              წყარო პარტიები ({detail.batches.length})
            </h3>
            <div className="space-y-2">
              {detail.batches.map((batch: any) => (
                <div
                  key={batch.id}
                  className="p-3 bg-bg-card rounded-lg border border-border flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium">{batch.batchNumber}</p>
                    <p className="text-xs text-text-muted">{batch.recipe} • {batch.style}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm">{batch.volumeContribution}L</p>
                    <p className="text-xs text-text-muted">{batch.batchPercentage}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Parent/Child Lots */}
          {(detail.parentLot || detail.childLots.length > 0) && (
            <div>
              <h3 className="text-sm font-medium mb-2">დაკავშირებული ლოტები</h3>
              
              {detail.parentLot && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg mb-2">
                  <p className="text-xs text-blue-400">მშობელი ლოტი</p>
                  <p className="font-medium">{detail.parentLot.code}</p>
                  <p className="text-xs text-text-muted">
                    {detail.parentLot.phase} • {detail.parentLot.tankName}
                  </p>
                </div>
              )}
              
              {detail.childLots.length > 0 && (
                <div className="space-y-2">
                  {detail.childLots.map((child: any) => (
                    <div
                      key={child.id}
                      className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg"
                    >
                      <p className="text-xs text-purple-400">
                        შვილი ლოტი {child.splitRatio && `(${Math.round(child.splitRatio * 100)}%)`}
                      </p>
                      <p className="font-medium">{child.code}</p>
                      <p className="text-xs text-text-muted">
                        {child.phase} • {child.tankName}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Transfer History */}
          {detail.transfers.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">ტრანსფერები</h3>
              <div className="space-y-2">
                {detail.transfers.map((transfer: any) => (
                  <div
                    key={transfer.id}
                    className="p-3 bg-bg-card rounded-lg border border-border"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{transfer.code}</p>
                        <p className="text-xs text-text-muted">{transfer.type}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono">{transfer.volume}L</p>
                        <p className={`text-xs ${
                          transfer.status === 'COMPLETED' ? 'text-green-400' : 'text-amber-400'
                        }`}>
                          {transfer.status}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Latest Readings */}
          {detail.latestReadings.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">ბოლო მაჩვენებლები</h3>
              <div className="grid grid-cols-3 gap-2">
                {detail.latestReadings.map((reading: any, i: number) => (
                  <div key={i} className="p-3 bg-bg-card rounded-lg border border-border text-center">
                    <p className="text-xs text-text-muted">{reading.type}</p>
                    <p className="font-mono font-bold">{reading.value} {reading.unit}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-border flex justify-between bg-bg-tertiary">
          <div>
            {block.status === 'PLANNED' && (
              <Button variant="primary" onClick={onStartLot}>
                ▶️ დაწყება
              </Button>
            )}
            {block.status === 'ACTIVE' && (
              <Button variant="secondary" onClick={onCompleteLot}>
                ✅ დასრულება
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {block.status === 'ACTIVE' && (
              <Button variant="secondary" onClick={onPlanTransfer}>
                🔄 ტრანსფერი
              </Button>
            )}
            <Button variant="secondary" onClick={onClose}>
              დახურვა
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// 4. PLANNING MODAL
// ============================================

interface PlanLotModalProps {
  isOpen: boolean
  onClose: () => void
  phase: 'FERMENTATION' | 'CONDITIONING' | 'BRIGHT'
  availableTanks: Tank[]
  availableBatches: any[]
  existingLots?: any[] // For blending
  preselectedTankId?: string
  preselectedDate?: Date
  onSubmit: (data: any) => void
}

export function PlanLotModal({
  isOpen,
  onClose,
  phase,
  availableTanks,
  availableBatches,
  existingLots,
  preselectedTankId,
  preselectedDate,
  onSubmit,
}: PlanLotModalProps) {
  const [selectedBatches, setSelectedBatches] = useState<string[]>([])
  const [tankId, setTankId] = useState(preselectedTankId || '')
  const [plannedStart, setPlannedStart] = useState(
    preselectedDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0]
  )
  const [plannedEnd, setPlannedEnd] = useState('')
  const [plannedVolume, setPlannedVolume] = useState<number>(0)
  
  // Advanced options
  const [enableSplit, setEnableSplit] = useState(false)
  const [enableBlend, setEnableBlend] = useState(false)
  const [blendTargetLotId, setBlendTargetLotId] = useState<string>('')
  const [splitDestinations, setSplitDestinations] = useState<{
    tankId: string
    volumePercent: number
  }[]>([])

  // Calculate total volume from selected batches
  useEffect(() => {
    const total = selectedBatches.reduce((sum, batchId) => {
      const batch = availableBatches.find(b => b.id === batchId)
      return sum + (batch?.volume || 0)
    }, 0)
    setPlannedVolume(total)
  }, [selectedBatches, availableBatches])

  // Set default end date (14 days from start)
  useEffect(() => {
    if (plannedStart && !plannedEnd) {
      const start = new Date(plannedStart)
      const defaultDays = phase === 'FERMENTATION' ? 14 : phase === 'CONDITIONING' ? 7 : 3
      start.setDate(start.getDate() + defaultDays)
      setPlannedEnd(start.toISOString().split('T')[0])
    }
  }, [plannedStart, phase, plannedEnd])

  const handleSubmit = () => {
    const data = {
      batchIds: selectedBatches,
      tankId,
      plannedStart: new Date(plannedStart),
      plannedEnd: new Date(plannedEnd),
      plannedVolume,
      enableSplit,
      enableBlending: enableBlend,
      blendTargetLotId: enableBlend ? blendTargetLotId : undefined,
      splitDestinations: enableSplit ? splitDestinations : undefined,
    }
    
    onSubmit(data)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      <div className="relative bg-bg-secondary border border-border rounded-2xl w-full max-w-xl max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-xl font-semibold">
            📅 {formatPhaseLabel(phase)} დაგეგმვა
          </h2>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
          {/* Batch Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">
              პარტიები <span className="text-red-400">*</span>
            </label>
            <div className="space-y-2 max-h-40 overflow-y-auto p-3 bg-bg-card rounded-xl border border-border">
              {availableBatches.length === 0 ? (
                <p className="text-sm text-text-muted">ხელმისაწვდომი პარტია არ არის</p>
              ) : (
                availableBatches.map(batch => (
                  <label
                    key={batch.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-bg-tertiary cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedBatches.includes(batch.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedBatches([...selectedBatches, batch.id])
                        } else {
                          setSelectedBatches(selectedBatches.filter(id => id !== batch.id))
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{batch.batchNumber}</p>
                      <p className="text-xs text-text-muted">{batch.recipe} • {batch.volume}L</p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Tank Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">
              ავზი <span className="text-red-400">*</span>
            </label>
            <select
              value={tankId}
              onChange={(e) => setTankId(e.target.value)}
              className="w-full px-4 py-3 bg-bg-card border border-border rounded-xl"
              disabled={enableSplit}
            >
              <option value="">აირჩიეთ ავზი...</option>
              {availableTanks.map(tank => (
                <option key={tank.id} value={tank.id}>
                  {tank.name} - {tank.type} ({tank.capacity}L)
                  {tank.status !== 'AVAILABLE' && ` - ${tank.status}`}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">დაწყება</label>
              <input
                type="date"
                value={plannedStart}
                onChange={(e) => setPlannedStart(e.target.value)}
                className="w-full px-4 py-3 bg-bg-card border border-border rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">დასრულება</label>
              <input
                type="date"
                value={plannedEnd}
                onChange={(e) => setPlannedEnd(e.target.value)}
                className="w-full px-4 py-3 bg-bg-card border border-border rounded-xl"
              />
            </div>
          </div>

          {/* Volume */}
          <div>
            <label className="block text-sm font-medium mb-2">მოცულობა (L)</label>
            <input
              type="number"
              value={plannedVolume}
              onChange={(e) => setPlannedVolume(Number(e.target.value))}
              className="w-full px-4 py-3 bg-bg-card border border-border rounded-xl"
            />
          </div>

          {/* Advanced Options */}
          <div className="p-4 bg-bg-tertiary rounded-xl space-y-3">
            <p className="text-sm font-medium mb-2">გაფართოებული პარამეტრები</p>
            
            {/* Split Option */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={enableSplit}
                onChange={(e) => {
                  setEnableSplit(e.target.checked)
                  if (e.target.checked) setEnableBlend(false)
                }}
                className="w-4 h-4"
              />
              <div>
                <p className="text-sm">გაყოფა რამდენიმე ავზში</p>
                <p className="text-xs text-text-muted">ერთი პარტია → რამდენიმე ავზი</p>
              </div>
            </label>

            {/* Blend Option */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={enableBlend}
                onChange={(e) => {
                  setEnableBlend(e.target.checked)
                  if (e.target.checked) setEnableSplit(false)
                }}
                className="w-4 h-4"
              />
              <div>
                <p className="text-sm">შერევა არსებულ ლოტთან</p>
                <p className="text-xs text-text-muted">რამდენიმე წყარო → ერთი ავზი</p>
              </div>
            </label>

            {/* Blend Target Selection */}
            {enableBlend && existingLots && existingLots.length > 0 && (
              <div className="mt-3 p-3 bg-bg-card rounded-lg border border-border">
                <label className="block text-xs text-text-muted mb-2">სამიზნე ლოტი</label>
                <select
                  value={blendTargetLotId}
                  onChange={(e) => setBlendTargetLotId(e.target.value)}
                  className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm"
                >
                  <option value="">ახალი ლოტის შექმნა</option>
                  {existingLots.map(lot => (
                    <option key={lot.id} value={lot.id}>
                      {lot.lotCode} - {lot.tankName} ({lot.volume}L)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>გაუქმება</Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={selectedBatches.length === 0 || (!enableSplit && !tankId)}
          >
            📅 დაგეგმვა
          </Button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// 5. TRANSFER MODAL
// ============================================

interface TransferModalProps {
  isOpen: boolean
  onClose: () => void
  sourceLot: any
  availableTanks: Tank[]
  existingLots?: any[]
  onSubmit: (data: any) => void
}

export function TransferModal({
  isOpen,
  onClose,
  sourceLot,
  availableTanks,
  existingLots,
  onSubmit,
}: TransferModalProps) {
  const [destTankId, setDestTankId] = useState('')
  const [volume, setVolume] = useState(sourceLot?.volume || 0)
  const [transferType, setTransferType] = useState<string>('FERMENT_TO_CONDITION')
  const [createNewLot, setCreateNewLot] = useState(true)
  const [destLotId, setDestLotId] = useState('')
  const [plannedDate, setPlannedDate] = useState(new Date().toISOString().split('T')[0])
  const [enableBlend, setEnableBlend] = useState(false)

  if (!isOpen) return null

  const handleSubmit = () => {
    onSubmit({
      sourceLotId: sourceLot.id,
      destTankId,
      destLotId: createNewLot ? undefined : destLotId,
      volume,
      transferType,
      plannedAt: new Date(plannedDate),
      enableBlending: enableBlend,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      <div className="relative bg-bg-secondary border border-border rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-xl font-semibold">🔄 ტრანსფერის დაგეგმვა</h2>
          <p className="text-sm text-text-muted">
            წყარო: {sourceLot?.lotCode} ({sourceLot?.volume}L)
          </p>
        </div>

        <div className="p-6 space-y-4">
          {/* Transfer Type */}
          <div>
            <label className="block text-sm font-medium mb-2">ტრანსფერის ტიპი</label>
            <select
              value={transferType}
              onChange={(e) => setTransferType(e.target.value)}
              className="w-full px-4 py-3 bg-bg-card border border-border rounded-xl"
            >
              <option value="FERMENT_TO_CONDITION">ფერმენტაცია → კონდიცირება</option>
              <option value="CONDITION_TO_BRIGHT">კონდიცირება → ბრაიტი</option>
              <option value="TANK_TO_TANK">ავზი → ავზი (იგივე ფაზა)</option>
            </select>
          </div>

          {/* Destination Tank */}
          <div>
            <label className="block text-sm font-medium mb-2">სამიზნე ავზი</label>
            <select
              value={destTankId}
              onChange={(e) => setDestTankId(e.target.value)}
              className="w-full px-4 py-3 bg-bg-card border border-border rounded-xl"
            >
              <option value="">აირჩიეთ...</option>
              {availableTanks.map(tank => (
                <option key={tank.id} value={tank.id}>
                  {tank.name} ({tank.capacity}L) - {tank.status}
                </option>
              ))}
            </select>
          </div>

          {/* Volume */}
          <div>
            <label className="block text-sm font-medium mb-2">მოცულობა (L)</label>
            <input
              type="number"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              max={sourceLot?.volume || 0}
              className="w-full px-4 py-3 bg-bg-card border border-border rounded-xl"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium mb-2">თარიღი</label>
            <input
              type="date"
              value={plannedDate}
              onChange={(e) => setPlannedDate(e.target.value)}
              className="w-full px-4 py-3 bg-bg-card border border-border rounded-xl"
            />
          </div>

          {/* Blend option */}
          <label className="flex items-center gap-3 p-3 bg-bg-tertiary rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={enableBlend}
              onChange={(e) => setEnableBlend(e.target.checked)}
              className="w-4 h-4"
            />
            <div>
              <p className="text-sm font-medium">შერევა არსებულ ლოტთან</p>
              <p className="text-xs text-text-muted">თუ ავზში უკვე არის ლოტი</p>
            </div>
          </label>
        </div>

        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>გაუქმება</Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!destTankId || volume <= 0}
          >
            🔄 ტრანსფერის დაგეგმვა
          </Button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// HELPERS
// ============================================

function formatPhaseLabel(phase: string): string {
  const map: Record<string, string> = {
    FERMENTATION: 'ფერმენტაცია',
    CONDITIONING: 'კონდიცირება',
    BRIGHT: 'ბრაიტი',
    PACKAGING: 'შეფუთვა',
  }
  return map[phase] || phase
}
