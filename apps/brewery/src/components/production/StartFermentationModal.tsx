'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui'
import { useBreweryStore } from '@/store'

interface Equipment {
  id: string
  name: string
  type: string
  status: string
  capacity: number | null
  currentBatchId: string | null
}

interface TankAllocation {
  tankId: string
  volume: number
}

interface ActiveAssignment {
  id: string
  tankId: string
  tankName: string
  batchId: string
  batchNumber: string
  recipeName: string
  volume: number
  phase: string
}

interface Props {
  batchId: string
  batchNumber: string
  recipeName: string
  isOpen: boolean
  onClose: () => void
  onComplete?: () => void
}

export function StartFermentationModal({ batchId, batchNumber, recipeName, isOpen, onClose, onComplete }: Props) {
  const [actualOG, setActualOG] = useState('1.052')
  const [temperature, setTemperature] = useState('18')
  const [selectedTankId, setSelectedTankId] = useState('')
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [loadingEquipment, setLoadingEquipment] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [notes, setNotes] = useState('')
  
  // გაყოფის state
  const [splitMode, setSplitMode] = useState(false)
  const [tankAllocations, setTankAllocations] = useState<TankAllocation[]>([])
  
  // შერევის state
  const [blendMode, setBlendMode] = useState(false)
  const [activeAssignments, setActiveAssignments] = useState<ActiveAssignment[]>([])
  const [selectedBlendTarget, setSelectedBlendTarget] = useState('')
  const [loadingAssignments, setLoadingAssignments] = useState(false)
  
  const batch = useBreweryStore(state => state.batches.find(b => b.id === batchId))
  const startFermentation = useBreweryStore(state => state.startFermentation)

  // მოცულობის გამოთვლა
  const totalVolume = useMemo(() => {
    return parseFloat(batch?.volume?.toString() || batch?.recipe?.batchSize?.toString() || '100')
  }, [batch])

  const allocatedVolume = useMemo(() => {
    return tankAllocations.reduce((sum, a) => sum + a.volume, 0)
  }, [tankAllocations])

  const remainingVolume = useMemo(() => {
    return totalVolume - allocatedVolume
  }, [totalVolume, allocatedVolume])

  // ფერმენტაციის ავზების ფილტრი
  const availableTanks = useMemo(() => {
    return equipment
      .filter(eq => {
        const type = eq.type?.toUpperCase()
        const canFerment = type === 'FERMENTER' || type === 'UNITANK'
        if (!canFerment) return false
        
        const isAvailable = !eq.currentBatchId || eq.currentBatchId === batchId
        const isOperational = eq.status?.toUpperCase() === 'OPERATIONAL' || 
                              eq.status?.toUpperCase() === 'AVAILABLE'
        
        return isAvailable && isOperational
      })
  }, [equipment, batchId])

  // გაყოფისთვის ხელმისაწვდომი ავზები (უკვე არჩეულები გამორიცხე)
  const availableTanksForSplit = useMemo(() => {
    return availableTanks.filter(t => !tankAllocations.some(a => a.tankId === t.id))
  }, [availableTanks, tankAllocations])

  // Fetch equipment
  useEffect(() => {
    if (isOpen) {
      const fetchEquipment = async () => {
        try {
          setLoadingEquipment(true)
          const response = await fetch('/api/equipment')
          if (response.ok) {
            const data = await response.json()
            setEquipment(Array.isArray(data) ? data : data.equipment || [])
          }
        } catch (error) {
          console.error('Error fetching equipment:', error)
        } finally {
          setLoadingEquipment(false)
        }
      }
      fetchEquipment()
    }
  }, [isOpen])

  // Fetch active assignments for blending
  const fetchActiveAssignments = useCallback(async () => {
    try {
      setLoadingAssignments(true)
      const response = await fetch('/api/tanks/active-assignments?phase=FERMENTATION')
      if (response.ok) {
        const data = await response.json()
        const filtered = (data.assignments || []).filter(
          (a: ActiveAssignment) => a.batchId !== batchId
        )
        setActiveAssignments(filtered)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoadingAssignments(false)
    }
  }, [batchId])

  useEffect(() => {
    if (isOpen && blendMode) {
      fetchActiveAssignments()
    }
  }, [isOpen, blendMode, fetchActiveAssignments])

  // Reset form
  useEffect(() => {
    if (isOpen && batch) {
      setActualOG(batch.og?.toFixed(3) || '1.052')
      setTemperature('18')
      setNotes('')
      setSplitMode(false)
      setBlendMode(false)
      setTankAllocations([])
      setSelectedBlendTarget('')
      setSelectedTankId(batch.tankId || '')
    }
  }, [isOpen, batch])

  // ✅ ავზის დამატება - გასწორებული
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

  // ავზის წაშლა
  const removeTankAllocation = useCallback((tankId: string) => {
    setTankAllocations(prev => prev.filter(a => a.tankId !== tankId))
  }, [])

  // მოცულობის შეცვლა
  const updateAllocationVolume = useCallback((tankId: string, volume: number) => {
    setTankAllocations(prev => prev.map(a => 
      a.tankId === tankId ? { ...a, volume } : a
    ))
  }, [])

  // თანაბარი გაყოფა
  const splitEqually = useCallback(() => {
    if (tankAllocations.length === 0) return
    const volumePerTank = totalVolume / tankAllocations.length
    setTankAllocations(prev => prev.map(a => ({ ...a, volume: volumePerTank })))
  }, [tankAllocations.length, totalVolume])

  // Handle confirm
  const handleConfirm = useCallback(async () => {
    // ვალიდაცია
    if (splitMode) {
      if (tankAllocations.length === 0) {
        alert('აირჩიეთ მინიმუმ ერთი ავზი')
        return
      }
      if (Math.abs(remainingVolume) > 0.5) {
        alert('მთლიანი მოცულობა უნდა გადანაწილდეს')
        return
      }
    } else if (blendMode) {
      if (!selectedBlendTarget) {
        alert('აირჩიეთ რომელ ბაჩს შეურიოს')
        return
      }
    } else {
      const tankId = selectedTankId || batch?.tankId
      if (!tankId) {
        alert('გთხოვთ აირჩიოთ ფერმენტატორი')
        return
      }
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/batches/${batchId}/start-fermentation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tankId: !splitMode && !blendMode ? (selectedTankId || batch?.tankId) : undefined,
          isSplit: splitMode && tankAllocations.length > 0,
          allocations: splitMode ? tankAllocations : undefined,
          isBlend: blendMode,
          blendWithAssignmentId: blendMode ? selectedBlendTarget : undefined,
          actualOG: parseFloat(actualOG),
          temperature: parseFloat(temperature),
          notes,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to start fermentation')
      }

      onComplete?.()
      onClose()
      setTimeout(() => window.location.reload(), 100)

    } catch (error) {
      console.error('Error:', error)
      alert('შეცდომა: ' + (error as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }, [batchId, splitMode, blendMode, tankAllocations, remainingVolume, selectedBlendTarget, selectedTankId, batch?.tankId, actualOG, temperature, notes, onComplete, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto border border-slate-700 shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-1">🧪 ფერმენტაციის დაწყება</h2>
        <p className="text-slate-400 mb-4">{batchNumber} • {recipeName} ({totalVolume}L)</p>

        {/* OG და ტემპერატურა */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1">📊 საწყისი სიმკვრივე (OG) *</label>
            <input
              type="text"
              value={actualOG}
              onChange={(e) => setActualOG(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              placeholder="1.052"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">🌡️ ტემპერატურა (°C) *</label>
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

        {/* გაფართოებული პარამეტრები */}
        <div className="mb-4 space-y-2">
          {/* გაყოფა */}
          <label className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg cursor-pointer hover:bg-blue-500/20">
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
              className="w-4 h-4 rounded"
            />
            <div>
              <span className="text-sm text-blue-400 font-medium">🔀 გაყოფა რამდენიმე ავზში</span>
              <p className="text-xs text-blue-300/70">ერთი პარტია → რამდენიმე ავზი</p>
            </div>
          </label>
          
          {/* შერევა */}
          <label className="flex items-center gap-2 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg cursor-pointer hover:bg-purple-500/20">
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
              className="w-4 h-4 rounded"
            />
            <div>
              <span className="text-sm text-purple-400 font-medium">🔄 შერევა არსებულ ბაჩთან</span>
              <p className="text-xs text-purple-300/70">რამდენიმე წყარო → ერთი ავზი</p>
            </div>
          </label>
        </div>

        {/* გაყოფის რეჟიმი */}
        {splitMode && (
          <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
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
            
            {/* არჩეული ავზები */}
            {tankAllocations.length > 0 && (
              <div className="space-y-2 mb-3">
                {tankAllocations.map((allocation) => {
                  const tank = availableTanks.find(t => t.id === allocation.tankId)
                  const percentage = ((allocation.volume / totalVolume) * 100).toFixed(0)
                  return (
                    <div key={allocation.tankId} className="flex items-center gap-2 p-2 bg-slate-800 rounded">
                      <div className="flex-1">
                        <div className="text-sm text-white">{tank?.name || 'N/A'}</div>
                        <div className="text-xs text-slate-500">მაქს. {tank?.capacity || 0}L</div>
                      </div>
                      <input
                        type="number"
                        value={allocation.volume}
                        onChange={(e) => updateAllocationVolume(allocation.tankId, parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm text-right"
                        step="0.1"
                        min="0"
                      />
                      <span className="text-xs text-slate-400 w-16">L ({percentage}%)</span>
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

            {/* მოცულობის სტატუსი */}
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

            {/* ✅ ავზის დამატება - გასწორებული select */}
            {availableTanksForSplit.length > 0 ? (
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    addTankAllocation(e.target.value)
                    e.target.value = '' // reset select
                  }
                }}
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

        {/* შერევის რეჟიმი */}
        {blendMode && (
          <div className="mb-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <div className="text-sm text-purple-400 font-medium mb-2">შერევის სამიზნე</div>
            
            {loadingAssignments ? (
              <div className="px-4 py-3 bg-slate-700 border border-slate-600 rounded text-slate-400 text-sm">
                იტვირთება...
              </div>
            ) : activeAssignments.length > 0 ? (
              <select
                value={selectedBlendTarget}
                onChange={(e) => setSelectedBlendTarget(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
              >
                <option value="">აირჩიეთ რომელ ბაჩს შეურიოს...</option>
                {activeAssignments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.batchNumber} - {a.recipeName} | {a.tankName} ({a.volume}L)
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-slate-400 p-3 bg-slate-700/50 rounded">
                არ არის აქტიური ბაჩები ფერმენტაციაში შერევისთვის
              </p>
            )}
          </div>
        )}

        {/* ჩვეულებრივი რეჟიმი - ავზის არჩევა */}
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
                {availableTanks.map(tank => (
                  <option key={tank.id} value={tank.id}>
                    {tank.name} ({tank.capacity || 0}L)
                    {tank.type?.toUpperCase() === 'UNITANK' && ' 🔄'}
                  </option>
                ))}
              </select>
            )}
            {!loadingEquipment && availableTanks.length === 0 && (
              <p className="text-red-400 text-sm mt-1">თავისუფალი ფერმენტატორი არ არის!</p>

            )}
          </div>
        )}

        {/* შენიშვნები */}
        <div className="mb-6">
          <label className="block text-sm text-slate-300 mb-2">შენიშვნები</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
            rows={2}
            placeholder="დამატებითი ინფორმაცია..."
          />
        </div>

        {/* ღილაკები */}
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            გაუქმება
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={
              isSubmitting || 
              (splitMode && (tankAllocations.length === 0 || Math.abs(remainingVolume) > 0.5)) ||
              (blendMode && !selectedBlendTarget) ||
              (!splitMode && !blendMode && !selectedTankId && !batch?.tankId)
            }
            className="bg-amber-600 hover:bg-amber-700"
          >
            {isSubmitting ? 'იტვირთება...' : 
              splitMode ? '🔀 გაყოფა და დაწყება' : 
              blendMode ? '🔄 შერევა და დაწყება' : 
              '🧪 დაწყება'
            }
          </Button>
        </div>
      </div>
    </div>
  )
}
