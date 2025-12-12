'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui'

interface EditBatchModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: BatchEditData) => void
  batch: {
    id: string
    batchNumber: string
    volume: number
    targetOG: number
    targetFG: number
    notes?: string
    brewer?: string
  }
}

interface BatchEditData {
  volume: number
  targetOG: number
  targetFG: number
  notes: string
  brewer: string
}

export function EditBatchModal({ isOpen, onClose, onSubmit, batch }: EditBatchModalProps) {
  const [formData, setFormData] = useState<BatchEditData>({
    volume: batch.volume,
    targetOG: batch.targetOG,
    targetFG: batch.targetFG,
    notes: batch.notes || '',
    brewer: batch.brewer || '',
  })

  useEffect(() => {
    if (isOpen) {
      setFormData({
        volume: batch.volume,
        targetOG: batch.targetOG,
        targetFG: batch.targetFG,
        notes: batch.notes || '',
        brewer: batch.brewer || '',
      })
    }
  }, [isOpen, batch])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const handleInputChange = (field: keyof BatchEditData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-bg-secondary border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-bg-tertiary">
          <h2 className="text-xl font-display font-semibold">✏️ პარტიის რედაქტირება | {batch.batchNumber}</h2>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-lg bg-bg-card border border-border flex items-center justify-center hover:border-danger hover:text-danger transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Volume */}
            <div>
              <label className="block text-sm font-medium mb-2">მოცულობა (L) *</label>
              <input
                type="number"
                min="1"
                step="0.1"
                value={formData.volume}
                onChange={(e) => handleInputChange('volume', parseFloat(e.target.value) || 0)}
                required
                className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl font-mono text-sm outline-none focus:border-copper"
              />
            </div>

            {/* Target OG */}
            <div>
              <label className="block text-sm font-medium mb-2">სამიზნე OG (სიმკვრივე) *</label>
              <input
                type="number"
                min="1.000"
                max="1.200"
                step="0.001"
                value={formData.targetOG}
                onChange={(e) => handleInputChange('targetOG', parseFloat(e.target.value) || 1.050)}
                required
                className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl font-mono text-sm outline-none focus:border-copper"
              />
            </div>

            {/* Target FG */}
            <div>
              <label className="block text-sm font-medium mb-2">სამიზნე FG (სიმკვრივე) *</label>
              <input
                type="number"
                min="0.990"
                max="1.050"
                step="0.001"
                value={formData.targetFG}
                onChange={(e) => handleInputChange('targetFG', parseFloat(e.target.value) || 1.010)}
                required
                className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl font-mono text-sm outline-none focus:border-copper"
              />
            </div>

            {/* Brewer */}
            <div>
              <label className="block text-sm font-medium mb-2">მწეველი</label>
              <input
                type="text"
                value={formData.brewer}
                onChange={(e) => handleInputChange('brewer', e.target.value)}
                placeholder="მწეველის სახელი"
                className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl text-sm outline-none focus:border-copper"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-2">შენიშვნები</label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="დამატებითი ინფორმაცია..."
                rows={4}
                className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl text-sm outline-none focus:border-copper resize-none"
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex justify-end gap-3 bg-bg-tertiary">
          <Button variant="secondary" onClick={onClose}>გაუქმება</Button>
          <Button variant="primary" onClick={handleSubmit}>
            შენახვა
          </Button>
        </div>
      </div>
    </div>
  )
}
