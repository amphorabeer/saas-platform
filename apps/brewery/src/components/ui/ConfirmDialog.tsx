'use client'

import { useUIStore } from '@/store'

const VARIANT_STYLES = {
  danger: {
    button: 'bg-red-600 hover:bg-red-700 text-white',
    icon: '⚠️',
  },
  warning: {
    button: 'bg-amber-600 hover:bg-amber-700 text-white',
    icon: '⚠',
  },
  default: {
    button: 'bg-amber-600 hover:bg-amber-700 text-white',
    icon: '❓',
  },
}

export function ConfirmDialog() {
  const dialog = useUIStore((state) => state.confirmDialog)
  const hideConfirm = useUIStore((state) => state.hideConfirm)

  if (!dialog) return null

  const variant = VARIANT_STYLES[dialog.variant ?? 'default']

  const handleConfirm = () => {
    dialog.onConfirm()
    hideConfirm()
  }

  const handleCancel = () => {
    dialog.onCancel?.()
    hideConfirm()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleCancel}
      />
      
      {/* Dialog */}
      <div className="relative bg-slate-800 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 border border-slate-700">
        <div className="flex items-start gap-4">
          <span className="text-2xl">{variant.icon}</span>
          
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white">
              {dialog.title}
            </h3>
            <p className="text-slate-400 mt-2">
              {dialog.message}
            </p>
          </div>
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={handleCancel}
            className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
          >
            {dialog.cancelLabel ?? 'გაუქმება'}
          </button>
          <button
            onClick={handleConfirm}
            className={`px-4 py-2 rounded-lg transition-colors ${variant.button}`}
          >
            {dialog.confirmLabel ?? 'დადასტურება'}
          </button>
        </div>
      </div>
    </div>
  )
}









