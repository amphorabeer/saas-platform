'use client'

import { useState } from 'react'
import { Button } from '@/components/ui'

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  details?: string[]
  confirmText: string
  confirmValue?: string
  danger?: boolean
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  details,
  confirmText,
  confirmValue,
  danger = true,
}: ConfirmationModalProps) {
  const [confirmationInput, setConfirmationInput] = useState('')

  if (!isOpen) return null

  const isConfirmDisabled = confirmValue ? confirmationInput !== confirmValue : false

  const handleConfirm = () => {
    if (!isConfirmDisabled) {
      onConfirm()
      setConfirmationInput('')
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className={`border rounded-2xl w-full max-w-lg ${danger ? 'bg-bg-card border-red-500/30' : 'bg-bg-card border-border'}`}>
        <div className={`p-6 border-b ${danger ? 'border-red-500/30' : 'border-border'}`}>
          <h2 className="text-xl font-bold text-text-primary">⚠️ {title}</h2>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-text-primary">{message}</p>

          {details && details.length > 0 && (
            <div className="bg-bg-tertiary p-4 rounded-lg">
              <div className="text-sm font-medium text-text-primary mb-2">წაიშლება:</div>
              <ul className="space-y-1">
                {details.map((detail, index) => (
                  <li key={index} className="text-sm text-text-muted">• {detail}</li>
                ))}
              </ul>
            </div>
          )}

          {confirmValue && (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                დასადასტურებლად ჩაწერეთ: <span className="font-mono text-red-400">{confirmValue}</span>
              </label>
              <input
                type="text"
                value={confirmationInput}
                onChange={(e) => setConfirmationInput(e.target.value)}
                className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                placeholder={confirmValue}
              />
            </div>
          )}
        </div>

        <div className={`p-6 border-t flex justify-end gap-3 ${danger ? 'border-red-500/30' : 'border-border'}`}>
          <Button variant="secondary" onClick={onClose}>გაუქმება</Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}

