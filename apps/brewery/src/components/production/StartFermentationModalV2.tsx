'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui'
import { formatGravity, getGravityUnit, sgToPlato, sgToBrix, platoToSg, brixToSg } from '@/utils'

interface Equipment {
  id: string
  name: string
  type: string
  status: string
  capacity: number | null
  // ✅ Added for occupancy check
  tankAssignments?: {
    id: string
    status: string
    phase: string
  }[]
}

interface TankAllocation {
  tankId: string
  volume: number
}

interface ActiveLot {
  id: string
  lotNumber: string
  batchNumber: string
  recipeName: string
  tankName: string
  totalVolume: number
  remainingCapacity: number
  yeastStrain: string | null
}

interface Props {
  batchId: string
  batchNumber: string
  recipeName: string
  recipeVolume: number
  isOpen: boolean
  onClose: () => void
  onComplete?: () => void
}

export function StartFermentationModalV2({
  batchId,
  batchNumber,
  recipeName,
  recipeVolume,
  isOpen,
  onClose,
  onComplete,
}: Props) {
  // ═══════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════
  
  // Basic fields
  // Store OG in SG format internally, convert for display
  const [actualOG, setActualOG] = useState(1.052) // Store as number (SG)
  const [temperature, setTemperature] = useState('18')
  const [notes, setNotes] = useState('')
  
  // Date/Time planning
  const [plannedStart, setPlannedStart] = useState('')
  const [plannedEnd, setPlannedEnd] = useState('')
  
  // Tank selection
  const [selectedTankId, setSelectedTankId] = useState('')
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [loadingEquipment, setLoadingEquipment] = useState(false)
  
  // Split mode
  const [splitMode, setSplitMode] = useState(false)
  const [tankAllocations, setTankAllocations] = useState<TankAllocation[]>([])
  
  // Blend mode
  const [blendMode, setBlendMode] = useState(false)
  const [activeLots, setActiveLots] = useState<ActiveLot[]>([])
  const [selectedTargetLot, setSelectedTargetLot] = useState('')
  const [loadingLots, setLoadingLots] = useState(false)
  
  // Availability check
  const [availabilityStatus, setAvailabilityStatus] = useState<Record<string, boolean>>({})
  const [checkingAvailability, setCheckingAvailability] = useState(false)
  
  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ═══════════════════════════════════════════════════════════
  // COMPUTED VALUES
  // ═══════════════════════════════════════════════════════════

  const totalVolume = useMemo(() => recipeVolume || 100, [recipeVolume])

  const allocatedVolume = useMemo(() => {
    return tankAllocations.reduce((sum, a) => sum + a.volume, 0)
  }, [tankAllocations])

  const remainingVolume = useMemo(() => {
    return totalVolume - allocatedVolume
  }, [totalVolume, allocatedVolume])

  // Filter fermentation tanks
  const availableTanks = useMemo(() => {
    console.log('[Modal] Raw equipment:', equipment)
    
    if (!equipment || equipment.length === 0) {
      console.log('[Modal] No equipment loaded!')
      return []
    }
    
    const filtered = equipment.filter(eq => {
      const type = (eq.type || '').toUpperCase()
      const name = (eq.name || '').toLowerCase()
      const status = (eq.status || '').toUpperCase()
      
      // ✅ ყველა ტიპი რაც ფერმენტატორი შეიძლება იყოს
      const isFermenter = 
        type === 'FERMENTER' || 
        type === 'UNITANK' ||
        type === 'FERMENTOR' ||
        type.includes('FERMENT') ||
        name.includes('fv') ||
        name.includes('ფერმენტ') ||
        name.includes('ფა') ||
        name.includes('st')
      
      // ✅ Check if tank needs CIP
      const needsCIP = status === 'NEEDS_CIP' || status === 'CLEANING' || status === 'CIP'
      
      // ✅ Check if tank is occupied (has ACTIVE assignment)
      const isOccupied = (eq as any).tankAssignments?.some(
        (a: any) => a.status === 'ACTIVE'
      ) || false
      
      console.log('[Modal] Tank:', eq.name, 'Type:', type, 'isFermenter:', isFermenter, 'needsCIP:', needsCIP, 'isOccupied:', isOccupied)
      
      // ✅ Only show fermenters that are NOT occupied and NOT needing CIP
      return isFermenter && !needsCIP && !isOccupied
    })
    
    console.log('[Modal] Filtered available tanks:', filtered.length)
    return filtered
  }, [equipment])

  // Tanks not yet allocated
  const availableTanksForSplit = useMemo(() => {
    return availableTanks.filter(t => !tankAllocations.some(a => a.tankId === t.id))
  }, [availableTanks, tankAllocations])

  // ═══════════════════════════════════════════════════════════
  // EFFECTS
  // ═══════════════════════════════════════════════════════════

  // Set default dates
  useEffect(() => {
    if (isOpen) {
      const now = new Date()
      const startDate = now.toISOString().slice(0, 16)
      
      const endDate = new Date(now)
      endDate.setDate(endDate.getDate() + 14) // Default 14 days fermentation
      
      setPlannedStart(startDate)
      setPlannedEnd(endDate.toISOString().slice(0, 16))
    }
  }, [isOpen])

  // Fetch equipment/tanks
  useEffect(() => {
    if (isOpen) {
      const fetchTanks = async () => {
        try {
          setLoadingEquipment(true)
          console.log('[Modal] Fetching equipment...')
          
          // ✅ Equipment-დან ვიღებთ
          const response = await fetch('/api/equipment')
          console.log('[Modal] Response status:', response.status)
          
          if (response.ok) {
            const data = await response.json()
            const allEquipment = Array.isArray(data) ? data : data.equipment || []
            console.log('[Modal] Equipment loaded:', allEquipment.length, allEquipment)
            setEquipment(allEquipment)
          } else {
            console.error('[Modal] Failed to fetch equipment')
          }
        } catch (err) {
          console.error('[Modal] Error fetching equipment:', err)
        } finally {
          setLoadingEquipment(false)
        }
      }
      fetchTanks()
    }
  }, [isOpen])

  // Fetch active lots when blend mode enabled
  useEffect(() => {
    if (isOpen && blendMode) {
      const fetchActiveLots = async () => {
        try {
          setLoadingLots(true)
          const response = await fetch('/api/lots/active?phase=FERMENTATION')
          if (response.ok) {
            const data = await response.json()
            setActiveLots(data.lots || [])
          }
        } catch (err) {
          console.error('Error fetching active lots:', err)
        } finally {
          setLoadingLots(false)
        }
      }
      fetchActiveLots()
    }
  }, [isOpen, blendMode])

  // Reset form
  useEffect(() => {
    if (isOpen) {
      setActualOG(1.052) // Reset to default SG value
      setTemperature('18')
      setNotes('')
      setSplitMode(false)
      setBlendMode(false)
      setTankAllocations([])
      setSelectedTargetLot('')
      setSelectedTankId('')
      setError(null)
      setAvailabilityStatus({})
    }
  }, [isOpen])
  
  // Convert SG to display unit for input field
  const displayOG = useMemo(() => {
    const unit = getGravityUnit()
    if (unit === 'SG') return actualOG.toFixed(3)
    if (unit === 'Plato') return sgToPlato(actualOG).toFixed(1)
    if (unit === 'Brix') return sgToBrix(actualOG).toFixed(1)
    return actualOG.toFixed(3)
  }, [actualOG])
  
  // Convert display unit to SG when user changes input
  const handleOGChange = (displayValue: string) => {
    const numValue = parseFloat(displayValue)
    if (isNaN(numValue)) return
    
    const unit = getGravityUnit()
    let sgValue: number
    if (unit === 'SG') {
      sgValue = numValue
    } else if (unit === 'Plato') {
      sgValue = platoToSg(numValue)
    } else if (unit === 'Brix') {
      sgValue = brixToSg(numValue)
    } else {
      sgValue = numValue
    }
    
    setActualOG(sgValue)
  }

  // ═══════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════

  // Check tank availability
  const checkAvailability = useCallback(async (tankIds: string[]) => {
    if (!plannedStart || !plannedEnd || tankIds.length === 0) return

    try {
      setCheckingAvailability(true)
      const response = await fetch('/api/tanks/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tankIds,
          start: plannedStart,
          end: plannedEnd,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const newStatus: Record<string, boolean> = {}
        for (const [tankId, result] of Object.entries(data.results)) {
          newStatus[tankId] = (result as any).available
        }
        setAvailabilityStatus(newStatus)
      }
    } catch (err) {
      console.error('Error checking availability:', err)
    } finally {
      setCheckingAvailability(false)
    }
  }, [plannedStart, plannedEnd])

  // Check availability when dates or tanks change
  useEffect(() => {
    if (!plannedStart || !plannedEnd) return

    const tankIds = splitMode
      ? tankAllocations.map(a => a.tankId)
      : selectedTankId ? [selectedTankId] : []

    if (tankIds.length > 0) {
      checkAvailability(tankIds)
    }
  }, [plannedStart, plannedEnd, selectedTankId, tankAllocations, splitMode, checkAvailability])

  // Add tank allocation
  const addTankAllocation = useCallback((tankId: string) => {
    if (!tankId || tankAllocations.some(a => a.tankId === tankId)) return

    const tank = availableTanks.find(t => t.id === tankId)
    const defaultVolume = Math.min(
      remainingVolume > 0 ? remainingVolume : totalVolume / (tankAllocations.length + 1),
      tank?.capacity || 1000
    )

    setTankAllocations(prev => [...prev, {
      tankId,
      volume: Math.max(defaultVolume, 1),
    }])
  }, [tankAllocations, availableTanks, remainingVolume, totalVolume])

  // Remove tank allocation
  const removeTankAllocation = useCallback((tankId: string) => {
    setTankAllocations(prev => prev.filter(a => a.tankId !== tankId))
  }, [])

  // Update allocation volume
  const updateAllocationVolume = useCallback((tankId: string, volume: number) => {
    setTankAllocations(prev => prev.map(a =>
      a.tankId === tankId ? { ...a, volume } : a
    ))
  }, [])

  // Split equally
  const splitEqually = useCallback(() => {
    if (tankAllocations.length === 0) return
    const volumePerTank = totalVolume / tankAllocations.length
    setTankAllocations(prev => prev.map(a => ({ ...a, volume: volumePerTank })))
  }, [tankAllocations.length, totalVolume])

  // Submit
  const handleSubmit = useCallback(async () => {
    setError(null)

    // Validation
    if (!plannedStart || !plannedEnd) {
      setError('დაგეგმვის თარიღები სავალდებულოა')
      return
    }

    if (splitMode) {
      if (tankAllocations.length === 0) {
        setError('აირჩიეთ მინიმუმ ერთი ავზი')
        return
      }
      if (Math.abs(remainingVolume) > 0.5) {
        setError('მთლიანი მოცულობა უნდა გადანაწილდეს')
        return
      }
    } else if (blendMode) {
      if (!selectedTargetLot) {
        setError('აირჩიეთ სამიზნე ლოტი შერევისთვის')
        return
      }
    } else {
      if (!selectedTankId) {
        setError('აირჩიეთ ფერმენტატორი')
        return
      }
    }

    // Check availability
    const hasUnavailable = Object.values(availabilityStatus).some(v => !v)
    if (hasUnavailable) {
      setError('ზოგიერთი ავზი დაკავებულია არჩეულ პერიოდში')
      return
    }

    setIsSubmitting(true)

    try {
      // Build request
      const requestBody: any = {
        batchIds: [batchId],
        plannedStart,
        plannedEnd,
        notes,
        actualOG: actualOG, // Already in SG format
        temperature: parseFloat(temperature),
      }

      if (splitMode) {
        requestBody.allocations = tankAllocations
      } else if (blendMode) {
        // Get tank from selected lot
        const selectedLot = activeLots.find(l => l.id === selectedTargetLot)
        if (!(selectedLot as any)?.tankId) {
          setError('არჩეულ ლოტს არ აქვს ავზი')
          setIsSubmitting(false)
          return
        }
        requestBody.allocations = [{ tankId: (selectedLot as any).tankId, volume: totalVolume }]
        requestBody.enableBlending = true
        requestBody.targetLotId = selectedTargetLot
      } else {
        requestBody.allocations = [{ tankId: selectedTankId, volume: totalVolume }]
      }

      console.log('[StartFermentationV2] Submitting:', requestBody)

      const response = await fetch('/api/fermentation/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'ფერმენტაციის დაწყება ვერ მოხერხდა')
      }

      console.log('[StartFermentationV2] Success:', data)

      onComplete?.()
      onClose()
      setTimeout(() => window.location.reload(), 100)

    } catch (err: any) {
      console.error('[StartFermentationV2] Error:', err)
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }, [
    batchId, plannedStart, plannedEnd, notes, actualOG, temperature,
    splitMode, blendMode, tankAllocations, selectedTankId, selectedTargetLot,
    totalVolume, remainingVolume, availabilityStatus, onComplete, onClose
  ])

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto border border-slate-700 shadow-2xl">
        
        {/* Header */}
        <h2 className="text-xl font-bold text-white mb-1">🧪 ფერმენტაციის დაგეგმვა</h2>
        <p className="text-slate-400 mb-4">{batchNumber} • {recipeName} ({totalVolume}L)</p>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
            ❌ {error}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* Date/Time Planning */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1">📅 დაწყება *</label>
            <input
              type="datetime-local"
              value={plannedStart}
              onChange={(e) => setPlannedStart(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">📅 დასრულება *</label>
            <input
              type="datetime-local"
              value={plannedEnd}
              onChange={(e) => setPlannedEnd(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
            />
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* OG & Temperature */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1">
              📊 საწყისი სიმკვრივე (OG)
              {getGravityUnit() === 'Plato' && ' (°P)'}
              {getGravityUnit() === 'Brix' && ' (°Bx)'}
              {getGravityUnit() === 'SG' && ' (SG)'}
            </label>
            <input
              type="number"
              value={displayOG}
              onChange={(e) => handleOGChange(e.target.value)}
              step={getGravityUnit() === 'SG' ? '0.001' : '0.1'}
              min={getGravityUnit() === 'SG' ? '1.000' : '0'}
              max={getGravityUnit() === 'SG' ? '1.200' : '35'}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              placeholder={getGravityUnit() === 'SG' ? '1.052' : getGravityUnit() === 'Plato' ? '12.9' : '12.9'}
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">🌡️ ტემპერატურა (°C)</label>
            <input
              type="number"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              placeholder="18"
              step="0.5"
            />
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* Mode Selection */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div className="mb-4 space-y-2">
          {/* Split Mode */}
          <label className="flex items-center gap-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg cursor-pointer hover:bg-blue-500/20 transition-colors">
            <input
              type="checkbox"
              checked={splitMode}
              onChange={(e) => {
                setSplitMode(e.target.checked)
                if (e.target.checked) {
                  setBlendMode(false)
                  setTankAllocations([])
                }
              }}
              className="w-4 h-4 rounded accent-blue-500"
            />
            <div>
              <span className="text-sm text-blue-400 font-medium">🔀 გაყოფა რამდენიმე ავზში</span>
              <p className="text-xs text-blue-300/70">ერთი პარტია → რამდენიმე ავზი</p>
            </div>
          </label>

          {/* Blend Mode */}
          <label className="flex items-center gap-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg cursor-pointer hover:bg-purple-500/20 transition-colors">
            <input
              type="checkbox"
              checked={blendMode}
              onChange={(e) => {
                setBlendMode(e.target.checked)
                if (e.target.checked) {
                  setSplitMode(false)
                  setTankAllocations([])
                }
              }}
              className="w-4 h-4 rounded accent-purple-500"
            />
            <div>
              <span className="text-sm text-purple-400 font-medium">🔄 შერევა არსებულ ლოტთან</span>
              <p className="text-xs text-purple-300/70">დამატება არსებულ ფერმენტაციაზე</p>
            </div>
          </label>
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* Split Mode UI */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {splitMode && (
          <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-blue-400 font-medium">ავზების განაწილება</span>
              {tankAllocations.length > 1 && (
                <button
                  type="button"
                  onClick={splitEqually}
                  className="text-xs text-blue-400 hover:text-blue-300 underline"
                >
                  ⚖️ თანაბრად
                </button>
              )}
            </div>

            {/* Allocated tanks */}
            {tankAllocations.length > 0 && (
              <div className="space-y-2 mb-3">
                {tankAllocations.map((allocation) => {
                  const tank = availableTanks.find(t => t.id === allocation.tankId)
                  const percentage = ((allocation.volume / totalVolume) * 100).toFixed(0)
                  const isAvailable = availabilityStatus[allocation.tankId] !== false

                  return (
                    <div 
                      key={allocation.tankId} 
                      className={`flex items-center gap-2 p-2 rounded ${
                        isAvailable ? 'bg-slate-800' : 'bg-red-900/30 border border-red-500/50'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="text-sm text-white flex items-center gap-2">
                          {tank?.name || 'N/A'}
                          {!isAvailable && <span className="text-xs text-red-400">⚠️ დაკავებული</span>}
                        </div>
                        <div className="text-xs text-slate-500">მაქს. {tank?.capacity || 0}L</div>
                      </div>
                      <input
                        type="number"
                        value={allocation.volume}
                        onChange={(e) => updateAllocationVolume(allocation.tankId, parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm text-right"
                        step="1"
                        min="0"
                      />
                      <span className="text-xs text-slate-400 w-14">L ({percentage}%)</span>
                      <button
                        type="button"
                        onClick={() => removeTankAllocation(allocation.tankId)}
                        className="p-1 text-red-400 hover:bg-red-400/20 rounded"
                      >
                        ✕
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Volume status */}
            {tankAllocations.length > 0 && (
              <div className={`text-sm mb-3 ${
                Math.abs(remainingVolume) < 0.5 ? 'text-green-400' :
                remainingVolume < 0 ? 'text-red-400' : 'text-orange-400'
              }`}>
                {Math.abs(remainingVolume) < 0.5
                  ? '✓ მთლიანი მოცულობა გადანაწილებულია'
                  : remainingVolume > 0
                    ? `⚠ დარჩენილია: ${remainingVolume.toFixed(1)}L`
                    : `⚠ გადაჭარბებულია: ${Math.abs(remainingVolume).toFixed(1)}L`
                }
              </div>
            )}

            {/* Add tank dropdown */}
            {availableTanksForSplit.length > 0 ? (
              <select
                value=""
                onChange={(e) => e.target.value && addTankAllocation(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
              >
                <option value="">+ დაამატეთ ავზი...</option>
                {availableTanksForSplit.map((tank) => (
                  <option key={tank.id} value={tank.id}>
                    {tank.name} ({tank.capacity || 0}L)
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-slate-500">ყველა ავზი უკვე დამატებულია</p>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* Blend Mode UI */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {blendMode && (
          <div className="mb-4 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <div className="text-sm text-purple-400 font-medium mb-2">აირჩიეთ სამიზნე ლოტი</div>

            {loadingLots ? (
              <div className="px-4 py-3 bg-slate-700 border border-slate-600 rounded text-slate-400 text-sm">
                იტვირთება...
              </div>
            ) : activeLots.length > 0 ? (
              <select
                value={selectedTargetLot}
                onChange={(e) => setSelectedTargetLot(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
              >
                <option value="">აირჩიეთ ლოტი...</option>
                {activeLots.map((lot) => (
                  <option key={lot.id} value={lot.id}>
                    {lot.lotNumber} • {lot.batchNumber} - {lot.recipeName} | {lot.tankName} ({lot.totalVolume}L)
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-slate-400 p-3 bg-slate-700/50 rounded">
                არ არის აქტიური ლოტები შერევისთვის
              </p>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* Simple Mode - Single Tank Selection */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {!splitMode && !blendMode && (
          <div className="mb-4">
            <label className="block text-sm text-slate-300 mb-2">🍺 ფერმენტატორი *</label>
            {loadingEquipment ? (
              <div className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-400">
                იტვირთება...
              </div>
            ) : (
              <select
                value={selectedTankId}
                onChange={(e) => setSelectedTankId(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
              >
                <option value="">აირჩიეთ ავზი...</option>
                {availableTanks.map(tank => {
                  const isAvailable = availabilityStatus[tank.id] !== false
                  return (
                    <option key={tank.id} value={tank.id}>
                      {tank.name} ({tank.capacity || 0}L)
                      {tank.type?.toUpperCase() === 'UNITANK' && ' 🔄'}
                      {!isAvailable && ' ⚠️ დაკავებული'}
                    </option>
                  )
                })}
              </select>
            )}
            
            {/* Availability indicator */}
            {selectedTankId && availabilityStatus[selectedTankId] === false && (
              <p className="text-red-400 text-sm mt-2">
                ⚠️ ეს ავზი დაკავებულია არჩეულ პერიოდში
              </p>
            )}
            
            {!loadingEquipment && availableTanks.length === 0 && (
              <p className="text-red-400 text-sm mt-1">ფერმენტატორი ვერ მოიძებნა!</p>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* Notes */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div className="mb-6">
          <label className="block text-sm text-slate-300 mb-2">📝 შენიშვნები</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
            rows={2}
            placeholder="დამატებითი ინფორმაცია..."
          />
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* Actions */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            გაუქმება
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              checkingAvailability ||
              (splitMode && (tankAllocations.length === 0 || Math.abs(remainingVolume) > 0.5)) ||
              (blendMode && !selectedTargetLot) ||
              (!splitMode && !blendMode && !selectedTankId) ||
              loadingEquipment
            }
            className="bg-amber-600 hover:bg-amber-700"
          >
            {isSubmitting ? 'იტვირთება...' :
              checkingAvailability ? '🔍 მოწმდება...' :
              splitMode ? '🔀 გაყოფა და დაგეგმვა' :
              blendMode ? '🔄 შერევა' :
              '🧪 დაგეგმვა'
            }
          </Button>
        </div>
      </div>
    </div>
  )
}