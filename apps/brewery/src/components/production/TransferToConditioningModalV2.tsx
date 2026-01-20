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
  batchCount?: number  // ✅ Number of batches in this lot
}

interface Props {
  batchId: string
  batchNumber: string
  recipeName: string
  currentVolume: number
  currentLotId?: string
  isOpen: boolean
  onClose: () => void
  onComplete?: () => void
  // ✅ For split lot transfers
  splitLotInfo?: {
    lotId: string
    lotCode: string
    tankId: string
    tankName: string
    volume: number | null
    // ✅ Added: tank type for the split lot's current tank (if known)
    tankType?: string
  } | null
  // ✅ Added: current tank type for the batch (if known)
  currentTankType?: string
}

export function TransferToConditioningModalV2({
  batchId,
  batchNumber,
  recipeName,
  currentVolume,
  currentLotId,
  isOpen,
  onClose,
  onComplete,
  splitLotInfo,
  currentTankType,
}: Props) {
  // ═══════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════
  
  // Store FG in SG format internally, convert for display
  const [finalGravity, setFinalGravity] = useState(1.012) // Store as number (SG)
  const [temperature, setTemperature] = useState('2')
  const [notes, setNotes] = useState('')
  
  const [plannedStart, setPlannedStart] = useState('')
  const [plannedEnd, setPlannedEnd] = useState('')
  
  const [selectedTankId, setSelectedTankId] = useState('')
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [loadingEquipment, setLoadingEquipment] = useState(false)
  
  const [splitMode, setSplitMode] = useState(false)
  const [tankAllocations, setTankAllocations] = useState<TankAllocation[]>([])
  
  const [blendMode, setBlendMode] = useState(false)
  const [activeLots, setActiveLots] = useState<ActiveLot[]>([])
  const [selectedTargetLot, setSelectedTargetLot] = useState('')
  const [loadingLots, setLoadingLots] = useState(false)
  
  const [stayInSameTank, setStayInSameTank] = useState(false)
  
  const [availabilityStatus, setAvailabilityStatus] = useState<Record<string, boolean>>({})
  const [checkingAvailability, setCheckingAvailability] = useState(false)
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ═══════════════════════════════════════════════════════════
  // COMPUTED
  // ═══════════════════════════════════════════════════════════

  const totalVolume = useMemo(() => {
    if (splitLotInfo?.volume && splitLotInfo.volume > 0) {
      return splitLotInfo.volume
    }
    return currentVolume || 100
  }, [currentVolume, splitLotInfo?.volume])

  const allocatedVolume = useMemo(() => {
    return tankAllocations.reduce((sum, a) => sum + a.volume, 0)
  }, [tankAllocations])

  const remainingVolume = useMemo(() => {
    return totalVolume - allocatedVolume
  }, [totalVolume, allocatedVolume])

  // Filter conditioning tanks (BRITE, CONDITIONING, UNITANK)
  // ✅ Only show AVAILABLE tanks - not occupied or needing CIP
  const availableTanks = useMemo(() => {
    return equipment.filter(eq => {
      const type = (eq.type || '').toUpperCase()
      const status = (eq.status || '').toUpperCase()
      
      // Check type is valid for conditioning
      const isConditioningType = (
        type === 'BRITE' || 
        type === 'BRIGHT_TANK' ||
        type === 'CONDITIONING' ||
        type === 'UNITANK'
      )
      
      // ✅ Check if tank needs CIP
      const needsCIP = status === 'NEEDS_CIP' || status === 'CLEANING' || status === 'CIP'
      
      // ✅ Check if tank is occupied (has ACTIVE assignment)
      const isOccupied = (eq as any).tankAssignments?.some(
        (a: any) => a.status === 'ACTIVE'
      ) || false
      
      console.log('[Conditioning Modal] Tank:', eq.name, 'Type:', type, 'Status:', status, 'needsCIP:', needsCIP, 'isOccupied:', isOccupied)
      
      // ✅ Only show conditioning tanks that are NOT occupied and NOT needing CIP
      return isConditioningType && !needsCIP && !isOccupied
    })
  }, [equipment])

  const availableTanksForSplit = useMemo(() => {
    return availableTanks.filter(t => !tankAllocations.some(a => a.tankId === t.id))
  }, [availableTanks, tankAllocations])

  // ═══════════════════════════════════════════════════════════
  // EFFECTS
  // ═══════════════════════════════════════════════════════════

  useEffect(() => {
    if (isOpen) {
      const now = new Date()
      setPlannedStart(now.toISOString().slice(0, 16))
      
      const endDate = new Date(now)
      endDate.setDate(endDate.getDate() + 14)
      setPlannedEnd(endDate.toISOString().slice(0, 16))
    }
  }, [isOpen])

  // ✅ Compute whether current tank is a UNITANK
  const isCurrentTankUnitank = useMemo(() => {
    const directType = (currentTankType || splitLotInfo?.tankType || '').toUpperCase()
    if (directType === 'UNITANK') return true
    const tankId = splitLotInfo?.tankId || ''
    if (tankId && equipment.length > 0) {
      const tank = equipment.find(e => e.id === tankId)
      if ((tank?.type || '').toUpperCase() === 'UNITANK') return true
    }
    return false
  }, [currentTankType, splitLotInfo?.tankType, splitLotInfo?.tankId, equipment])

  // If not unitank, ensure the flag is off
  useEffect(() => {
    if (!isCurrentTankUnitank && stayInSameTank) {
      setStayInSameTank(false)
    }
  }, [isCurrentTankUnitank, stayInSameTank])

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

  useEffect(() => {
    if (isOpen && blendMode) {
      const fetchActiveLots = async () => {
        try {
          setLoadingLots(true)
          const response = await fetch('/api/lots/active?phase=CONDITIONING')
          if (response.ok) {
            const data = await response.json()
            // ✅ API returns array directly, not { lots: [...] }
            setActiveLots(Array.isArray(data) ? data : data.lots || [])
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

  useEffect(() => {
    if (isOpen) {
      setFinalGravity(1.012) // Reset to default SG value
      setTemperature('2')
      setNotes('')
      setSplitMode(false)
      setBlendMode(false)
      setStayInSameTank(false)
      setTankAllocations([])
      setSelectedTargetLot('')
      setSelectedTankId('')
      setError(null)
      setAvailabilityStatus({})
    }
  }, [isOpen])
  
  // Convert SG to display unit for input field
  const displayFG = useMemo(() => {
    const unit = getGravityUnit()
    if (unit === 'SG') return finalGravity.toFixed(3)
    if (unit === 'Plato') return sgToPlato(finalGravity).toFixed(1)
    if (unit === 'Brix') return sgToBrix(finalGravity).toFixed(1)
    return finalGravity.toFixed(3)
  }, [finalGravity])
  
  // Convert display unit to SG when user changes input
  const handleFGChange = (displayValue: string) => {
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
    
    setFinalGravity(sgValue)
  }

  // Check availability
  const checkAvailability = useCallback(async (tankIds: string[]) => {
    if (!plannedStart || !plannedEnd || tankIds.length === 0) return

    try {
      setCheckingAvailability(true)
      const response = await fetch('/api/tanks/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tankIds, start: plannedStart, end: plannedEnd }),
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

  useEffect(() => {
    if (!plannedStart || !plannedEnd || stayInSameTank) return

    const tankIds = splitMode
      ? tankAllocations.map(a => a.tankId)
      : selectedTankId ? [selectedTankId] : []

    if (tankIds.length > 0) {
      checkAvailability(tankIds)
    }
  }, [plannedStart, plannedEnd, selectedTankId, tankAllocations, splitMode, stayInSameTank, checkAvailability])

  // ═══════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════

  const addTankAllocation = useCallback((tankId: string) => {
    if (!tankId || tankAllocations.some(a => a.tankId === tankId)) return

    const tank = availableTanks.find(t => t.id === tankId)
    const defaultVolume = Math.min(
      remainingVolume > 0 ? remainingVolume : totalVolume / (tankAllocations.length + 1),
      tank?.capacity || 1000
    )

    setTankAllocations(prev => [...prev, { tankId, volume: Math.max(defaultVolume, 1) }])
  }, [tankAllocations, availableTanks, remainingVolume, totalVolume])

  const removeTankAllocation = useCallback((tankId: string) => {
    setTankAllocations(prev => prev.filter(a => a.tankId !== tankId))
  }, [])

  const updateAllocationVolume = useCallback((tankId: string, volume: number) => {
    setTankAllocations(prev => prev.map(a =>
      a.tankId === tankId ? { ...a, volume } : a
    ))
  }, [])

  const splitEqually = useCallback(() => {
    if (tankAllocations.length === 0) return
    const volumePerTank = totalVolume / tankAllocations.length
    setTankAllocations(prev => prev.map(a => ({ ...a, volume: volumePerTank })))
  }, [tankAllocations.length, totalVolume])

  const handleSubmit = useCallback(async () => {
    setError(null)

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
    } else if (!stayInSameTank) {
      if (!selectedTankId) {
        setError('აირჩიეთ კონდიცირების ავზი')
        return
      }
    }

    // ✅ Frontend capacity validation
    if (!stayInSameTank && !blendMode) {
      const allocationsToCheck = splitMode ? tankAllocations : [{ tankId: selectedTankId, volume: totalVolume }]
      
      for (const allocation of allocationsToCheck) {
        if (!allocation.tankId) continue
        
        const tank = equipment.find(e => e.id === allocation.tankId)
        if (tank) {
          const tankCapacity = parseFloat(tank.capacity?.toString() || '0')
          const requestedVolume = parseFloat(allocation.volume?.toString() || '0')
          
          if (requestedVolume > tankCapacity) {
            setError(`ავზი ${tank.name} გადაივსება! ტევადობა: ${tankCapacity}L, მოთხოვნილი: ${requestedVolume}L`)
            return
          }
        }
      }
    }

    setIsSubmitting(true)

    try {
      // ✅ If split lot, include lot info in request
      const effectiveSourceLotId = splitLotInfo?.lotId || currentLotId
      const requestBody: any = {
        sourceLotId: effectiveSourceLotId,
        batchId: batchId,
        plannedStart,
        plannedEnd,
        finalGravity: finalGravity, // Already in SG format
        temperature: parseFloat(temperature),
        notes,
        stayInSameTank,
        // ✅ Add split lot specific fields
        ...(splitLotInfo && {
          lotId: splitLotInfo.lotId,
          sourceLotId: splitLotInfo.lotId,
          sourceTankId: splitLotInfo.tankId,
          volume: splitLotInfo.volume || currentVolume,
        }),
      }

      console.log('[TransferConditioningV2] Mode:', { splitMode, blendMode, stayInSameTank, tankAllocationsCount: tankAllocations.length })
      
      if (splitMode) {
        console.log('[TransferConditioningV2] SPLIT MODE - allocations:', tankAllocations)
        requestBody.allocations = tankAllocations
        requestBody.isSplit = true
      } else if (blendMode) {
        const selectedLot = activeLots.find(l => l.id === selectedTargetLot)
        if (!(selectedLot as any)?.tankId) {
          setError('არჩეულ ლოტს არ აქვს ავზი')
          setIsSubmitting(false)
          return
        }
        requestBody.allocations = [{ tankId: (selectedLot as any).tankId, volume: totalVolume }]
        requestBody.targetLotId = selectedTargetLot
        requestBody.enableBlending = true
      } else if (!stayInSameTank) {
        requestBody.allocations = [{ tankId: selectedTankId, volume: totalVolume }]
      }

      console.log('[TransferConditioningV2] Submitting:', requestBody)

      const response = await fetch('/api/conditioning/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'კონდიცირებაზე გადატანა ვერ მოხერხდა')
      }

      console.log('[TransferConditioningV2] Success:', data)

      onComplete?.()
      onClose()
      setTimeout(() => window.location.reload(), 100)

    } catch (err: any) {
      console.error('[TransferConditioningV2] Error:', err)
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }, [
    batchId, currentLotId, plannedStart, plannedEnd, finalGravity, temperature, notes,
    splitMode, blendMode, stayInSameTank, tankAllocations, selectedTankId, selectedTargetLot,
    totalVolume, remainingVolume, activeLots, onComplete, onClose
  ])

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto border border-slate-700 shadow-2xl">
        
        <h2 className="text-xl font-bold text-white mb-1">🧊 კონდიცირებაზე გადატანა</h2>
        <p className="text-slate-400 mb-4">{batchNumber} • {recipeName} ({totalVolume}L)</p>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
            ❌ {error}
          </div>
        )}

        {/* Date Planning */}
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

        {/* FG & Temperature */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1">
              📊 საბოლოო სიმკვრივე (FG)
              {getGravityUnit() === 'Plato' && ' (°P)'}
              {getGravityUnit() === 'Brix' && ' (°Bx)'}
              {getGravityUnit() === 'SG' && ' (SG)'}
            </label>
            <input
              type="number"
              value={displayFG}
              onChange={(e) => handleFGChange(e.target.value)}
              step={getGravityUnit() === 'SG' ? '0.001' : '0.1'}
              min={getGravityUnit() === 'SG' ? '1.000' : '0'}
              max={getGravityUnit() === 'SG' ? '1.100' : '25'}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              placeholder={getGravityUnit() === 'SG' ? '1.012' : getGravityUnit() === 'Plato' ? '3.1' : '3.1'}
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">🌡️ ტემპერატურა (°C)</label>
            <input
              type="number"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              placeholder="2"
              step="0.5"
            />
          </div>
        </div>

        {/* Stay in same tank option (Unitank only) */}
        {isCurrentTankUnitank ? (
          <label className="flex items-center gap-3 p-3 mb-4 bg-green-500/10 border border-green-500/30 rounded-lg cursor-pointer hover:bg-green-500/20 transition-colors">
            <input
              type="checkbox"
              checked={stayInSameTank}
              onChange={(e) => {
                setStayInSameTank(e.target.checked)
                if (e.target.checked) {
                  setSplitMode(false)
                  setBlendMode(false)
                }
              }}
              className="w-4 h-4 rounded accent-green-500"
            />
            <div>
              <span className="text-sm text-green-400 font-medium">🔄 იმავე ავზში დარჩენა</span>
              <p className="text-xs text-green-300/70">Unitank - გადატანა არ საჭიროებს</p>
            </div>
          </label>
        ) : (
          <div className="p-3 mb-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <div className="text-sm text-amber-400 font-medium">⚠️ ფერმენტაციის ავზი</div>
            <p className="text-xs text-amber-300/80 mt-1">
              კონდიცირებისთვის საჭიროა Brite/Conditioning ტანკზე გადატანა. Unitank შემთხვევაში შეგიძლიათ დარჩეთ იმავე ავზში.
            </p>
          </div>
        )}

        {/* Mode Selection (only if not staying) */}
        {!stayInSameTank && (
          <div className="mb-4 space-y-2">
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
                <p className="text-xs text-blue-300/70">ფერმენტაცია → რამდენიმე კონდიცირების ავზი</p>
              </div>
            </label>

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
                <p className="text-xs text-purple-300/70">დამატება არსებულ კონდიცირებაზე</p>
              </div>
            </label>
          </div>
        )}

        {/* Split Mode UI */}
        {splitMode && !stayInSameTank && (
          <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-blue-400 font-medium">ავზების განაწილება</span>
              {tankAllocations.length > 1 && (
                <button type="button" onClick={splitEqually} className="text-xs text-blue-400 hover:text-blue-300 underline">
                  ⚖️ თანაბრად
                </button>
              )}
            </div>

            {tankAllocations.length > 0 && (
              <div className="space-y-2 mb-3">
                {tankAllocations.map((allocation) => {
                  const tank = availableTanks.find(t => t.id === allocation.tankId)
                  const percentage = ((allocation.volume / totalVolume) * 100).toFixed(0)
                  const isAvailable = availabilityStatus[allocation.tankId] !== false

                  return (
                    <div key={allocation.tankId} className={`flex items-center gap-2 p-2 rounded ${isAvailable ? 'bg-slate-800' : 'bg-red-900/30 border border-red-500/50'}`}>
                      <div className="flex-1">
                        <div className="text-sm text-white flex items-center gap-2">
                          {tank?.name || 'N/A'}
                          {!isAvailable && <span className="text-xs text-red-400">⚠️</span>}
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
                      <button type="button" onClick={() => removeTankAllocation(allocation.tankId)} className="p-1 text-red-400 hover:bg-red-400/20 rounded">✕</button>
                    </div>
                  )
                })}
              </div>
            )}

            {tankAllocations.length > 0 && (
              <div className={`text-sm mb-3 ${Math.abs(remainingVolume) < 0.5 ? 'text-green-400' : remainingVolume < 0 ? 'text-red-400' : 'text-orange-400'}`}>
                {Math.abs(remainingVolume) < 0.5 ? '✓ გადანაწილებულია' : remainingVolume > 0 ? `⚠ დარჩა: ${remainingVolume.toFixed(1)}L` : `⚠ გადაჭარბება: ${Math.abs(remainingVolume).toFixed(1)}L`}
              </div>
            )}

            {availableTanksForSplit.length > 0 ? (
              <select value="" onChange={(e) => e.target.value && addTankAllocation(e.target.value)} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm">
                <option value="">+ დაამატეთ ავზი...</option>
                {availableTanksForSplit.map((tank) => (
                  <option key={tank.id} value={tank.id}>{tank.name} ({tank.capacity || 0}L)</option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-slate-500">ყველა ავზი დამატებულია</p>
            )}
          </div>
        )}

        {/* Blend Mode UI */}
        {blendMode && !stayInSameTank && (
          <div className="mb-4 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <div className="text-sm text-purple-400 font-medium mb-2">სამიზნე ლოტი</div>
            {loadingLots ? (
              <div className="px-4 py-3 bg-slate-700 rounded text-slate-400 text-sm">იტვირთება...</div>
            ) : activeLots.length > 0 ? (
              <select value={selectedTargetLot} onChange={(e) => setSelectedTargetLot(e.target.value)} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white">
                <option value="">აირჩიეთ...</option>
                {activeLots.map((lot) => (
                  <option key={lot.id} value={lot.id}>
                    {lot.lotNumber} • {lot.batchNumber} | {lot.tankName} ({lot.totalVolume}L{lot.batchCount && lot.batchCount > 1 ? `, ${lot.batchCount} ბაჩი` : ''})
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-slate-400 p-3 bg-slate-700/50 rounded">არ არის აქტიური კონდიცირების ლოტები</p>
            )}
          </div>
        )}

        {/* Simple Mode */}
        {!splitMode && !blendMode && !stayInSameTank && (
          <div className="mb-4">
            <label className="block text-sm text-slate-300 mb-2">🧊 კონდიცირების ავზი *</label>
            {loadingEquipment ? (
              <div className="w-full px-4 py-3 bg-slate-700 rounded-lg text-slate-400">იტვირთება...</div>
            ) : availableTanks.length === 0 ? (
              <div className="w-full px-4 py-3 bg-red-500/20 border border-red-500/40 rounded-lg text-red-400 text-sm">
                ⚠️ თავისუფალი კონდიცირების ავზი არ არის. გაათავისუფლეთ ავზი ან დაამატეთ ახალი.
              </div>
            ) : (
              <select value={selectedTankId} onChange={(e) => setSelectedTankId(e.target.value)} className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white">
                <option value="">აირჩიეთ ავზი...</option>
                {availableTanks.map(tank => (
                  <option key={tank.id} value={tank.id}>
                    {tank.name} ({tank.capacity || 0}L)
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Notes */}
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

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>გაუქმება</Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || checkingAvailability || (splitMode && (tankAllocations.length === 0 || Math.abs(remainingVolume) > 0.5)) || (blendMode && !selectedTargetLot) || (!splitMode && !blendMode && !stayInSameTank && !selectedTankId)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? 'იტვირთება...' : stayInSameTank ? '🔄 გადაყვანა' : splitMode ? '🔀 გაყოფა' : blendMode ? '🔄 შერევა' : '🧊 გადატანა'}
          </Button>
        </div>
      </div>
    </div>
  )
}