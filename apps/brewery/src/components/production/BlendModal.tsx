'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui'

interface BlendModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

interface LotOption {
  id: string
  lotNumber: string
  volume: number
  phase: string
  tankName?: string
  batchName?: string
  recipeName?: string
}

interface BatchOption {
  id: string
  batchNumber: string
  name: string
  volume: number
  status: string
  recipeName?: string
  lotCount: number
}

export function BlendModal({ isOpen, onClose, onSuccess }: BlendModalProps) {
  const [activeTab, setActiveTab] = useState<'lots' | 'batches'>('lots')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  // Available options
  const [availableLots, setAvailableLots] = useState<LotOption[]>([])
  const [availableBatches, setAvailableBatches] = useState<BatchOption[]>([])
  const [availableTanks, setAvailableTanks] = useState<any[]>([])
  
  // Selected items
  const [selectedLotIds, setSelectedLotIds] = useState<string[]>([])
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([])
  
  // Form fields
  const [blendName, setBlendName] = useState('')
  const [targetTankId, setTargetTankId] = useState('')
  const [notes, setNotes] = useState('')
  
  const [error, setError] = useState('')

  // Fetch available lots and batches
  useEffect(() => {
    if (!isOpen) return
    
    const fetchData = async () => {
      setLoading(true)
      setError('')
      
      try {
        // Fetch lots
        const lotsRes = await fetch('/api/batches/blend?type=lots')
        if (lotsRes.ok) {
          const lotsData = await lotsRes.json()
          const mappedLots: LotOption[] = (lotsData.lots || []).map((lot: any) => ({
            id: lot.id,
            lotNumber: lot.lotNumber,
            volume: lot.volume || 0,
            phase: lot.phase || 'CONDITIONING',
            tankName: lot.TankAssignment?.[0]?.Equipment?.name || '-',
            batchName: lot.LotBatch?.[0]?.Batch?.name || '-',
            recipeName: lot.LotBatch?.[0]?.Batch?.Recipe?.name || '-',
          }))
          setAvailableLots(mappedLots)
        }
        
        // Fetch batches
        const batchesRes = await fetch('/api/batches/blend?type=batches')
        if (batchesRes.ok) {
          const batchesData = await batchesRes.json()
          const mappedBatches: BatchOption[] = (batchesData.batches || []).map((batch: any) => ({
            id: batch.id,
            batchNumber: batch.batchNumber,
            name: batch.name || batch.batchNumber,
            volume: batch.volume || 0,
            status: batch.status,
            recipeName: batch.Recipe?.name || '-',
            lotCount: batch.LotBatch?.length || 0,
          }))
          setAvailableBatches(mappedBatches)
        }
        
        // Fetch available tanks
        const tanksRes = await fetch('/api/tanks/availability')
        if (tanksRes.ok) {
          const tanksData = await tanksRes.json()
          setAvailableTanks(tanksData.tanks || [])
        }
        
      } catch (err) {
        console.error('Error fetching blend data:', err)
        setError('მონაცემების ჩატვირთვა ვერ მოხერხდა')
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [isOpen])

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedLotIds([])
      setSelectedBatchIds([])
      setBlendName('')
      setTargetTankId('')
      setNotes('')
      setError('')
    }
  }, [isOpen])

  // Toggle lot selection
  const toggleLot = (lotId: string) => {
    setSelectedLotIds(prev => 
      prev.includes(lotId) 
        ? prev.filter(id => id !== lotId)
        : [...prev, lotId]
    )
  }

  // Toggle batch selection
  const toggleBatch = (batchId: string) => {
    setSelectedBatchIds(prev => 
      prev.includes(batchId) 
        ? prev.filter(id => id !== batchId)
        : [...prev, batchId]
    )
  }

  // Calculate total volume
  const getTotalVolume = () => {
    if (activeTab === 'lots') {
      return availableLots
        .filter(lot => selectedLotIds.includes(lot.id))
        .reduce((sum, lot) => sum + lot.volume, 0)
    } else {
      return availableBatches
        .filter(batch => selectedBatchIds.includes(batch.id))
        .reduce((sum, batch) => sum + batch.volume, 0)
    }
  }

  // Create blend
  const handleCreateBlend = async () => {
    const sourceIds = activeTab === 'lots' ? selectedLotIds : selectedBatchIds
    
    if (sourceIds.length < 2) {
      setError('მინიმუმ 2 წყარო უნდა აირჩიოთ')
      return
    }
    
    if (!blendName.trim()) {
      setError('ბლენდის სახელი აუცილებელია')
      return
    }
    
    setSubmitting(true)
    setError('')
    
    try {
      const response = await fetch('/api/batches/blend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: activeTab,
          sourceIds,
          name: blendName.trim(),
          targetTankId: targetTankId || undefined,
          notes: notes.trim() || undefined,
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Blend creation failed')
      }
      
      console.log('[BlendModal] Success:', data)
      onSuccess?.()
      onClose()
      
    } catch (err: any) {
      console.error('[BlendModal] Error:', err)
      setError(err.message || 'ბლენდის შექმნა ვერ მოხერხდა')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedCount = activeTab === 'lots' ? selectedLotIds.length : selectedBatchIds.length
  const totalVolume = getTotalVolume()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-surface-card rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">🔄 ბლენდირება</h2>
          
          <div className="space-y-4">
        
        {/* Tabs */}
        <div className="flex gap-2 border-b border-surface-dark pb-2">
          <button
            onClick={() => setActiveTab('lots')}
            className={`px-4 py-2 rounded-t-lg transition-colors ${
              activeTab === 'lots' 
                ? 'bg-accent-primary text-white' 
                : 'bg-surface-dark text-text-muted hover:bg-surface-dark/70'
            }`}
          >
            🧪 ლოტების ბლენდი
          </button>
          <button
            onClick={() => setActiveTab('batches')}
            className={`px-4 py-2 rounded-t-lg transition-colors ${
              activeTab === 'batches' 
                ? 'bg-accent-primary text-white' 
                : 'bg-surface-dark text-text-muted hover:bg-surface-dark/70'
            }`}
          >
            🍺 Batch-ების ბლენდი
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-text-muted">
            ⏳ იტვირთება...
          </div>
        ) : (
          <>
            {/* Lots Tab */}
            {activeTab === 'lots' && (
              <div className="space-y-2">
                <p className="text-sm text-text-muted mb-2">
                  აირჩიეთ ლოტები ბლენდისთვის (მინიმუმ 2):
                </p>
                
                {availableLots.length === 0 ? (
                  <p className="text-amber-400 text-center py-4">
                    ბლენდისთვის შესაფერისი ლოტები არ მოიძებნა
                  </p>
                ) : (
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {availableLots.map(lot => (
                      <div
                        key={lot.id}
                        onClick={() => toggleLot(lot.id)}
                        className={`p-3 rounded-lg cursor-pointer border-2 transition-all ${
                          selectedLotIds.includes(lot.id)
                            ? 'border-accent-primary bg-accent-primary/10'
                            : 'border-surface-dark bg-surface-dark/50 hover:border-surface-dark/70'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{lot.lotNumber}</div>
                            <div className="text-sm text-text-muted">
                              {lot.batchName} • {lot.recipeName}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{lot.volume}L</div>
                            <div className="text-sm text-text-muted">
                              {lot.tankName} • {lot.phase}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Batches Tab */}
            {activeTab === 'batches' && (
              <div className="space-y-2">
                <p className="text-sm text-text-muted mb-2">
                  აირჩიეთ batch-ები ბლენდისთვის (მინიმუმ 2):
                </p>
                
                {availableBatches.length === 0 ? (
                  <p className="text-amber-400 text-center py-4">
                    ბლენდისთვის შესაფერისი batch-ები არ მოიძებნა
                  </p>
                ) : (
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {availableBatches.map(batch => (
                      <div
                        key={batch.id}
                        onClick={() => toggleBatch(batch.id)}
                        className={`p-3 rounded-lg cursor-pointer border-2 transition-all ${
                          selectedBatchIds.includes(batch.id)
                            ? 'border-accent-primary bg-accent-primary/10'
                            : 'border-surface-dark bg-surface-dark/50 hover:border-surface-dark/70'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{batch.name}</div>
                            <div className="text-sm text-text-muted">
                              {batch.batchNumber} • {batch.recipeName}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{batch.volume}L</div>
                            <div className="text-sm text-text-muted">
                              {batch.status} • {batch.lotCount} ლოტი
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Summary */}
            {selectedCount > 0 && (
              <div className="bg-surface-dark rounded-lg p-3">
                <div className="flex justify-between text-sm">
                  <span>არჩეული: {selectedCount}</span>
                  <span className="font-medium">ჯამი: {totalVolume}L</span>
                </div>
              </div>
            )}

            {/* Form Fields */}
            <div className="space-y-3 pt-2 border-t border-surface-dark">
              <div>
                <label className="block text-sm text-text-muted mb-1">
                  ბლენდის სახელი *
                </label>
                <input
                  type="text"
                  value={blendName}
                  onChange={(e) => setBlendName(e.target.value)}
                  placeholder="მაგ: IPA & Lager Blend"
                  className="w-full bg-surface-dark border border-surface-dark rounded-lg px-3 py-2 text-text-primary"
                />
              </div>
              
              <div>
                <label className="block text-sm text-text-muted mb-1">
                  სამიზნე ავზი (არასავალდებულო)
                </label>
                <select
                  value={targetTankId}
                  onChange={(e) => setTargetTankId(e.target.value)}
                  className="w-full bg-surface-dark border border-surface-dark rounded-lg px-3 py-2 text-text-primary"
                >
                  <option value="">-- აირჩიეთ ავზი --</option>
                  {availableTanks
                    .filter(t => t.status === 'AVAILABLE' || t.status === 'NEEDS_CIP')
                    .map(tank => (
                      <option key={tank.id} value={tank.id}>
                        {tank.name} ({tank.capacity}L) - {tank.status}
                      </option>
                    ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm text-text-muted mb-1">
                  შენიშვნები
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="დამატებითი შენიშვნები..."
                  className="w-full bg-surface-dark border border-surface-dark rounded-lg px-3 py-2 text-text-primary resize-none"
                  rows={2}
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button variant="ghost" onClick={onClose} className="flex-1">
                გაუქმება
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateBlend}
                disabled={selectedCount < 2 || !blendName.trim() || submitting}
                className="flex-1"
              >
                {submitting ? '⏳ იქმნება...' : `🔄 ბლენდის შექმნა (${totalVolume}L)`}
              </Button>
            </div>
          </>
        )}
          </div>
        </div>
      </div>
    </div>
  )
}
