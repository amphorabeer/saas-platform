'use client'

import { useUIStore, Toast as ToastType } from '@/store'

const TOAST_ICONS: Record<ToastType['type'], string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
}

const TOAST_COLORS: Record<ToastType['type'], string> = {
  success: 'bg-green-500/10 border-green-500/30 text-green-400',
  error: 'bg-red-500/10 border-red-500/30 text-red-400',
  warning: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
  info: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
}

function ToastItem({ toast, onRemove }: { toast: ToastType; onRemove: () => void }) {
  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-lg border backdrop-blur-sm
        transform transition-all duration-300 ease-out
        ${TOAST_COLORS[toast.type]}
      `}
    >
      <span className="text-lg">{TOAST_ICONS[toast.type]}</span>
      
      <div className="flex-1 min-w-0">
        <p className="font-medium">{toast.title}</p>
        {toast.message && (
          <p className="text-sm opacity-80 mt-1">{toast.message}</p>
        )}
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className="text-sm underline mt-2 hover:opacity-80"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      
      <button
        onClick={onRemove}
        className="text-current opacity-60 hover:opacity-100 transition-opacity"
      >
        ✕
      </button>
    </div>
  )
}

export function ToastContainer() {
  const toasts = useUIStore((state) => state.toasts)
  const removeToast = useUIStore((state) => state.removeToast)

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onRemove={() => removeToast(toast.id)}
        />
      ))}
    </div>
  )
}









