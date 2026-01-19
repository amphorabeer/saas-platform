'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui'
import { testTypeConfig, type TestType, type Priority } from '@/data/qualityData'

// Map API test types to component test types
const API_TEST_TYPE_MAP: Record<string, TestType> = {
  GRAVITY: 'gravity',
  TEMPERATURE: 'gravity',
  PH: 'ph',
  DISSOLVED_O2: 'gravity',
  TURBIDITY: 'gravity',
  COLOR: 'color',
  BITTERNESS: 'ibu',
  ALCOHOL: 'abv',
  CARBONATION: 'gravity',
  APPEARANCE: 'sensory',
  AROMA: 'sensory',
  TASTE: 'sensory',
  MICROBIOLOGICAL: 'microbiology',
}

// Map component test types to API test types
const COMPONENT_TO_API_MAP: Record<TestType, string> = {
  gravity: 'GRAVITY',
  ph: 'PH',
  abv: 'ALCOHOL',
  ibu: 'BITTERNESS',
  color: 'COLOR',
  sensory: 'APPEARANCE',
  microbiology: 'MICROBIOLOGICAL',
}

// Lot type from API
interface LotAPI {
  id: string
  lotCode: string
  lotNumber: string
  type: 'single' | 'blend' | 'split'
  recipeName: string
  recipeStyle: string
  phase: string
  status: string
  totalVolume: number
  tankName: string
  batchCount: number
  sourceBatchNumber?: string | null
  sourceLots?: Array<{ batchNumber: string; volume: number }>
  batches: Array<{
    id: string
    batchNumber: string
    status: string
    volumeContribution?: number
  }>
}

interface NewTestModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (testData: any) => void
  batches?: Array<{ id: string; batchNumber: string; recipe?: { name: string } | null; status: string }>
}

export function NewTestModal({ isOpen, onClose, onAdd, batches = [] }: NewTestModalProps) {
  const [step, setStep] = useState(1)
  const [selectedTarget, setSelectedTarget] = useState<{ type: 'batch' | 'lot', id: string } | null>(null)
  const [lots, setLots] = useState<LotAPI[]>([])
  const [loadingLots, setLoadingLots] = useState(false)
  const [testType, setTestType] = useState<TestType | ''>('')
  const [minValue, setMinValue] = useState<number>(0)
  const [maxValue, setMaxValue] = useState<number>(0)
  const [scheduledDate, setScheduledDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [scheduledTime, setScheduledTime] = useState<string>('14:00')
  const [priority, setPriority] = useState<Priority>('medium')
  const [notes, setNotes] = useState<string>('')

  // Fetch lots on modal open
  useEffect(() => {
    if (isOpen) {
      fetchLots()
    } else {
      // Reset on close
      setSelectedTarget(null)
      setLots([])
    }
  }, [isOpen])

  const fetchLots = async () => {
    try {
      setLoadingLots(true)
      // ✅ FIX: Only fetch active lots (exclude completed)
      const res = await fetch('/api/lots?limit=100&activeOnly=true')
      if (res.ok) {
        const data = await res.json()
        // ✅ Additional filter: exclude COMPLETED lots
        const activeLots = (data.lots || []).filter((lot: LotAPI) => lot.status !== 'COMPLETED')
        setLots(activeLots)
      }
    } catch (error) {
      console.error('Failed to fetch lots:', error)
    } finally {
      setLoadingLots(false)
    }
  }

  // Filter batches: exclude batches that have ANY lot (single, split, or blend) AND exclude completed batches
  const getAvailableBatches = () => {
    // Build a set of batch IDs that are used in ANY lots
    const usedBatchIds = new Set<string>()
    
    lots.forEach(lot => {
      // For ALL lot types (single, split, blend), mark source batches as "used"
      // Because once a batch has a lot, you work with the lot, not the batch
      lot.batches?.forEach(batch => {
        usedBatchIds.add(batch.id)
      })
    })

    console.log('[BATCH FILTER] Total batches:', batches.length)
    console.log('[BATCH FILTER] Total lots:', lots.length)
    console.log('[BATCH FILTER] Used batch IDs (in lots):', Array.from(usedBatchIds))
    console.log('[BATCH FILTER] Available batches (no lots):', batches.length - usedBatchIds.size)

    // Filter out batches that are used in ANY lots AND exclude completed batches
    return batches.filter(batch => {
      // Exclude if batch is used in a lot
      if (usedBatchIds.has(batch.id)) return false
      // ✅ FIX: Exclude completed batches
      if (batch.status === 'COMPLETED' || batch.status === 'completed') return false
      return true
    })
  }

  const availableBatches = getAvailableBatches()

  if (!isOpen) return null

  const getLotIcon = (type: 'single' | 'blend' | 'split') => {
    switch (type) {
      case 'blend': return '🔄'  // ბლენდი
      case 'split': return '🔀'  // გაყოფა
      default: return '🔵'       // ჩვეულებრივი
    }
  }

  const getLotTypeLabel = (type: 'single' | 'blend' | 'split') => {
    switch (type) {
      case 'blend': return 'ბლენდი'
      case 'split': return 'გაყოფილი'
      default: return 'ლოტი'
    }
  }

  // Find selected item
  let selectedBatch: { id: string; batchNumber: string; recipe?: { name: string } | null; status: string } | undefined
  let selectedLot: LotAPI | undefined
  
  if (selectedTarget) {
    if (selectedTarget.type === 'batch') {
      selectedBatch = batches.find(b => b.id === selectedTarget.id)
    } else {
      // ✅ FIX: Handle split lots with specific batch selection (format: "lot:lotId:batch:batchId")
      const parts = selectedTarget.id.split(':')
      if (parts.length === 4 && parts[0] === 'lot' && parts[2] === 'batch') {
        // Split lot with specific batch selected
        selectedLot = lots.find(l => l.id === parts[1])
      } else {
        // Regular lot selection
        selectedLot = lots.find(l => l.id === selectedTarget.id)
      }
    }
  }

  const testConfig = testType ? testTypeConfig[testType] : null

  const handleTestTypeSelect = (type: TestType) => {
    setTestType(type)
    const config = testTypeConfig[type]
    setMinValue(config.defaultMin)
    setMaxValue(config.defaultMax)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTarget || !testType) return

    const [hours, minutes] = scheduledTime.split(':')
    const scheduledDateTime = new Date(scheduledDate)
    scheduledDateTime.setHours(parseInt(hours), parseInt(minutes))

    // Determine batchId and lotId based on selection
    let batchId: string
    let lotId: string | null = null

    if (selectedTarget.type === 'batch') {
      batchId = selectedTarget.id
    } else {
      // ✅ FIX: Handle split lots with specific batch selection (format: "lot:lotId:batch:batchId")
      const parts = selectedTarget.id.split(':')
      if (parts.length === 4 && parts[0] === 'lot' && parts[2] === 'batch') {
        // Split lot with specific batch selected
        lotId = parts[1]
        batchId = parts[3]
      } else {
        // Regular lot selection - get first batch from lot
        const lot = lots.find(l => l.id === selectedTarget.id)
        if (!lot || !lot.batches || lot.batches.length === 0) {
          alert('შეცდომა: ლოტს არ აქვს დაკავშირებული ბაჩები')
          return
        }
        batchId = lot.batches[0].id
        lotId = selectedTarget.id
      }
    }

    onAdd({
      batchId,
      lotId,
      testType: COMPONENT_TO_API_MAP[testType as TestType] || testType.toUpperCase(),
      minValue,
      maxValue,
      scheduledDate: scheduledDateTime,
      priority,
      notes: notes || undefined,
    })

    // Reset form
    setStep(1)
    setSelectedTarget(null)
    setTestType('')
    setMinValue(0)
    setMaxValue(0)
    setPriority('medium')
    setNotes('')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-bg-primary border border-border rounded-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-border sticky top-0 bg-bg-primary z-10">
          <h2 className="text-xl font-semibold">➕ ახალი ტესტი</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Step 1 - Batch/Lot Selection */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  პარტია / ლოტი
                  {loadingLots && (
                    <span className="ml-2 text-xs text-text-muted">
                      <span className="inline-block animate-spin">⚙️</span> იტვირთება...
                    </span>
                  )}
                </label>
                <select
                  value={selectedTarget ? (selectedTarget.id.includes(':batch:') ? selectedTarget.id : `${selectedTarget.type}:${selectedTarget.id}`) : ''}
                  onChange={(e) => {
                    if (!e.target.value) {
                      setSelectedTarget(null)
                      return
                    }
                    // ✅ FIX: Handle split lots with specific batch (format: "lot:lotId:batch:batchId")
                    const parts = e.target.value.split(':')
                    if (parts.length === 4 && parts[0] === 'lot' && parts[2] === 'batch') {
                      // Split lot with specific batch: store full value
                      setSelectedTarget({ type: 'lot', id: e.target.value })
                    } else {
                      // Regular batch or lot selection
                      const [type, id] = parts
                      setSelectedTarget({ type: type as 'batch' | 'lot', id })
                    }
                  }}
                  className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"
                  required
                  disabled={loadingLots}
                >
                  <option value="">აირჩიეთ პარტია ან ლოტი</option>
                  
                  {/* Batches Group */}
                  {availableBatches.length > 0 && (
                    <optgroup label="━━━ პარტიები ━━━">
                      {availableBatches.map(batch => (
                        <option key={`batch-${batch.id}`} value={`batch:${batch.id}`}>
                          🔵 {batch.batchNumber} - {batch.recipe?.name || 'N/A'} ({batch.status})
                        </option>
                      ))}
                    </optgroup>
                  )}

                  {/* Lots Group */}
                  {lots.length > 0 && (
                    <optgroup label="━━━ ლოტები ━━━">
                      {lots.map(lot => {
                        // ✅ FIX: For split lots, show each split batch as separate option (e.g., BRWW-2026-0042-A, BRWW-2026-0042-B)
                        // Note: Split child lots have type='split' but may have only 1 batch each
                        // We need to group split lots by parent or by batchNumber to show all splits together
                        if (lot.type === 'split' && lot.batches && lot.batches.length > 0) {
                          // Split lots: show each split batch separately
                          // ✅ Sort batches by batchNumber to ensure -A, -B order
                          const sortedBatches = [...lot.batches].sort((a, b) => {
                            const aNum = a.batchNumber || ''
                            const bNum = b.batchNumber || ''
                            return aNum.localeCompare(bNum, undefined, { numeric: true, sensitivity: 'base' })
                          })
                          return sortedBatches.map((batch, index) => {
                            // ✅ FIX: Ensure split batch numbers have -A, -B suffixes
                            // If batchNumber doesn't already have a suffix (like -A, -B), add it from lotCode or index
                            let displayBatchNumber = batch.batchNumber || ''
                            // Check if batchNumber already ends with -A, -B, -C, etc. (case-insensitive)
                            if (displayBatchNumber && !displayBatchNumber.match(/-[A-Z]$/i)) {
                              // Try to extract suffix from lot's lotCode first (e.g., "FERM-20260118-K9GIAB-A" → "-A")
                              // Also check for patterns like "FERM-20260118-K9GIAB-A" or "LOT-XXXXX-A"
                              let suffix: string | null = null
                              if (lot.lotCode) {
                                // Try multiple patterns: -A at end, or -A after last segment
                                const patterns = [
                                  /-([A-Z])$/i,           // "-A" at end
                                  /-([A-Z])-/,            // "-A-" in middle (take first)
                                  /([A-Z])$/i,            // Single letter at end
                                ]
                                for (const pattern of patterns) {
                                  const match = lot.lotCode.match(pattern)
                                  if (match && match[1]) {
                                    suffix = match[1].toUpperCase()
                                    break
                                  }
                                }
                              }
                              
                              // If no suffix found from lotCode, use index
                              if (!suffix) {
                                suffix = String.fromCharCode(65 + index) // 65 is 'A' in ASCII
                              }
                              
                              displayBatchNumber = `${displayBatchNumber}-${suffix}`
                            }
                            
                            const parts = [
                              getLotIcon(lot.type),
                              displayBatchNumber, // e.g., "BRWW-2026-0042-A"
                              getLotTypeLabel(lot.type),
                            ]
                            if (lot.recipeName && lot.recipeName !== 'Unknown') {
                              parts.push(lot.recipeName)
                            }
                            parts.push(`(${lot.phase})`)
                            return (
                              <option key={`lot-${lot.id}-batch-${batch.id}`} value={`lot:${lot.id}:batch:${batch.id}`}>
                                {parts.join(' - ')}
                              </option>
                            )
                          })
                        } else {
                          // Blend/single lots: show as single option
                          let displayName: string
                          if (lot.type === 'blend' && lot.lotCode?.startsWith('BLEND-')) {
                            // Blend lots: use lot code (e.g., "BLEND-2026-0001")
                            displayName = lot.lotCode
                          } else {
                            // Single lots: use batch number from first batch
                            displayName = lot.batches?.[0]?.batchNumber || lot.lotCode || lot.id
                          }
                          
                          // Build display name with proper fallbacks
                          const parts = [
                            getLotIcon(lot.type),
                            displayName,
                            getLotTypeLabel(lot.type),
                          ]
                          // Only add recipe name if it exists and is not 'Unknown'
                          if (lot.recipeName && lot.recipeName !== 'Unknown') {
                            parts.push(lot.recipeName)
                          }
                          parts.push(`(${lot.phase})`)
                          return (
                            <option key={`lot-${lot.id}`} value={`lot:${lot.id}`}>
                              {parts.join(' - ')}
                            </option>
                          )
                        }
                      }).flat()}
                    </optgroup>
                  )}
                </select>

                {/* Info about selection */}
                {selectedTarget && selectedTarget.type === 'lot' && selectedLot && (
                  <div className="mt-2 p-3 bg-blue-400/10 border border-blue-400/30 rounded-lg text-sm">
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400">ℹ️</span>
                      <div className="flex-1">
                        <div className="font-medium text-blue-400 mb-1">
                          {getLotIcon(selectedLot.type)} {getLotTypeLabel(selectedLot.type)} ლოტი
                        </div>
                        {selectedLot.type === 'blend' && (
                          <div className="text-xs text-text-muted">
                            ბლენდი შეიცავს {selectedLot.batchCount} პარტიას
                          </div>
                        )}
                        {selectedLot.type === 'split' && selectedLot.sourceBatchNumber && (
                          <div className="text-xs text-text-muted">
                            წყარო: {selectedLot.sourceBatchNumber}
                          </div>
                        )}
                        <div className="text-xs text-text-muted mt-1">
                          ტანკი: {selectedLot.tankName} • მოცულობა: {selectedLot.totalVolume}L
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <Button type="button" variant="secondary" onClick={onClose}>
                  გაუქმება
                </Button>
                <Button 
                  type="button" 
                  variant="primary" 
                  onClick={() => selectedTarget && setStep(2)} 
                  disabled={!selectedTarget || loadingLots}
                >
                  შემდეგი
                </Button>
              </div>
            </div>
          )}

          {/* Step 2 - Test Type */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Show selected target info */}
              <div className="p-3 bg-bg-card border border-border rounded-lg text-sm">
                <div className="flex items-center gap-2">
                  {selectedTarget?.type === 'batch' && selectedBatch && (
                    <>
                      <span className="text-copper-light">🔵 პარტია:</span>
                      <span className="font-medium">{selectedBatch.batchNumber}</span>
                      <span className="text-text-muted">({selectedBatch.recipe?.name})</span>
                    </>
                  )}
                  {selectedTarget?.type === 'lot' && selectedLot && (
                    <>
                      <span className="text-copper-light">{getLotIcon(selectedLot.type)} ლოტი:</span>
                      <span className="font-medium">{selectedLot.lotCode}</span>
                      <span className="text-text-muted">({getLotTypeLabel(selectedLot.type)})</span>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-3">ტესტის ტიპი</label>
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(testTypeConfig).map(([key, config]) => {
                    const type = key as TestType
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleTestTypeSelect(type)}
                        className={`p-4 rounded-lg border transition-all ${
                          testType === type
                            ? 'border-copper bg-copper/10 text-copper-light'
                            : 'border-border bg-bg-card text-text-secondary hover:bg-bg-tertiary'
                        }`}
                      >
                        <div className="text-2xl mb-2">{config.icon}</div>
                        <div className="text-xs font-medium">{config.name}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <Button type="button" variant="secondary" onClick={() => setStep(1)}>
                  უკან
                </Button>
                <Button type="button" variant="primary" onClick={() => testType && setStep(3)} disabled={!testType}>
                  შემდეგი
                </Button>
              </div>
            </div>
          )}

          {/* Step 3 - Details */}
          {step === 3 && testConfig && (
            <div className="space-y-4">
              {/* Show selected target and test info */}
              <div className="p-3 bg-bg-card border border-border rounded-lg text-sm">
                <div className="space-y-1">
                  {selectedTarget?.type === 'batch' && selectedBatch && (
                    <div>
                      <span className="text-text-muted">პარტია: </span>
                      <span className="font-medium text-copper-light">
                        🔵 {selectedBatch.batchNumber}
                      </span>
                      <span className="text-text-muted ml-2">({selectedBatch.recipe?.name})</span>
                    </div>
                  )}
                  {selectedTarget?.type === 'lot' && selectedLot && (
                    <div>
                      <span className="text-text-muted">ლოტი: </span>
                      <span className="font-medium text-copper-light">
                        {getLotIcon(selectedLot.type)} {selectedLot.lotCode}
                      </span>
                      <span className="text-text-muted ml-2">({getLotTypeLabel(selectedLot.type)})</span>
                    </div>
                  )}
                  <div>
                    <span className="text-text-muted">ტესტი: </span>
                    <span className="font-medium">{testConfig.icon} {testConfig.name}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">ნორმის მინიმუმი</label>
                  <input
                    type="number"
                    step="0.001"
                    value={minValue}
                    onChange={(e) => setMinValue(parseFloat(e.target.value))}
                    className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">ნორმის მაქსიმუმი</label>
                  <input
                    type="number"
                    step="0.001"
                    value={maxValue}
                    onChange={(e) => setMaxValue(parseFloat(e.target.value))}
                    className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">დაგეგმილი თარიღი</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">დაგეგმილი დრო</label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">პრიორიტეტი</label>
                <div className="flex gap-4">
                  {(['low', 'medium', 'high'] as Priority[]).map(p => (
                    <label key={p} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="priority"
                        value={p}
                        checked={priority === p}
                        onChange={() => setPriority(p)}
                        className="w-4 h-4"
                      />
                      <span className={`text-sm ${
                        p === 'high' ? 'text-red-400' :
                        p === 'medium' ? 'text-amber-400' :
                        'text-green-400'
                      }`}>
                        {p === 'high' ? '🔴' : p === 'medium' ? '🟡' : '🟢'} {
                          p === 'high' ? 'მაღალი' :
                          p === 'medium' ? 'საშუალო' :
                          'დაბალი'
                        }
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">შენიშვნა</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm resize-none"
                  placeholder="დამატებითი ინფორმაცია..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <Button type="button" variant="secondary" onClick={() => setStep(2)}>
                  უკან
                </Button>
                <Button type="button" variant="secondary" onClick={onClose}>
                  გაუქმება
                </Button>
                <Button type="submit" variant="primary">
                  ტესტის დამატება
                </Button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}