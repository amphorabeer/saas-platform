'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui'

interface Batch {
  id: string
  batchNumber: string
  recipeName?: string
  recipe?: { name: string }
  plannedDate?: string
  volume?: number
}

interface StartBrewingModalProps {
  isOpen: boolean
  onClose: () => void
  batch: Batch
  onSuccess: () => void
}

export function StartBrewingModal({ isOpen, onClose, batch, onSuccess }: StartBrewingModalProps) {
  const [originalGravity, setOriginalGravity] = useState('')
  const [selectedKettle, setSelectedKettle] = useState('')
  const [kettles, setKettles] = useState<any[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [notes, setNotes] = useState('')

  // Fetch kettles
  useEffect(() => {
    if (isOpen) {
      fetch('/api/equipment')
        .then(res => res.json())
        .then(data => {
          const kettleList = (data.equipment || data || []).filter((e: any) => 
            ['kettle', 'brewhouse', 'mash_tun', 'brew_kettle', 'boil_kettle'].includes(e.type?.toLowerCase())
          )
          setKettles(kettleList)
          if (kettleList.length > 0) {
            setSelectedKettle(kettleList[0].id)
          }
        })
        .catch(console.error)
    }
  }, [isOpen])

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/batches/${batch.id}/start-brewing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalGravity: originalGravity ? parseFloat(originalGravity) : undefined,
          kettleId: selectedKettle || undefined,
          notes: notes || undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || error.details || 'Failed to start brewing')
      }

      onSuccess()
    } catch (error) {
      console.error('Error starting brewing:', error)
      alert(error instanceof Error ? error.message : 'შეცდომა ხარშვის დაწყებისას')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-bg-card border border-border rounded-2xl w-full max-w-lg mx-4 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-amber-500 to-orange-600">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🍺</span>
            <div>
              <h2 className="text-xl font-bold text-white">ხარშვის დაწყება</h2>
              <p className="text-white/80 text-sm">
                {batch.batchNumber} • {batch.recipeName || batch.recipe?.name}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Kettle Selection */}
          {kettles.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                სახარში ქვაბი
              </label>
              <select
                value={selectedKettle}
                onChange={(e) => setSelectedKettle(e.target.value)}
                className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
              >
                {kettles.map(kettle => (
                  <option key={kettle.id} value={kettle.id}>
                    {kettle.name} ({kettle.capacity}L)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Original Gravity */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              OG (Original Gravity)
            </label>
            <input
              type="number"
              step="0.001"
              placeholder="მაგ: 1.050"
              value={originalGravity}
              onChange={(e) => setOriginalGravity(e.target.value)}
              className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              შენიშვნა
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary resize-none"
              placeholder="დამატებითი ინფორმაცია..."
            />
          </div>

          {/* Batch Info */}
          <div className="bg-bg-tertiary rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">პარტია:</span>
              <span className="text-text-primary font-medium">{batch.batchNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">რეცეპტი:</span>
              <span className="text-text-primary">{batch.recipeName || batch.recipe?.name}</span>
            </div>
            {batch.volume && (
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">მოცულობა:</span>
                <span className="text-text-primary">{batch.volume}L</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border flex justify-between">
          <Button variant="secondary" onClick={onClose}>
            გაუქმება
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-gradient-to-r from-amber-500 to-orange-600"
          >
            {isSubmitting ? '⏳ იტვირთება...' : '🍺 ხარშვის დაწყება'}
          </Button>
        </div>
      </div>
    </div>
  )
}


















