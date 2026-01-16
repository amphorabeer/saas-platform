import { create } from 'zustand'
import { UIState, Toast, ToastType, ConfirmDialog } from './types'

interface UIActions {
  // Toasts
  addToast: (toast: Omit<Toast, 'id'>) => string
  removeToast: (id: string) => void
  clearToasts: () => void
  
  // Shortcuts
  showSuccess: (title: string, message?: string) => void
  showError: (title: string, message?: string) => void
  showWarning: (title: string, message?: string) => void
  
  // Confirm dialog
  showConfirm: (options: Omit<ConfirmDialog, 'isOpen'>) => void
  hideConfirm: () => void
  
  // Modals
  openModal: (modalId: string, data?: Record<string, unknown>) => void
  closeModal: () => void
  
  // Sidebar
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
}

export const useUIStore = create<UIState & UIActions>((set, get) => ({
  // Initial state
  toasts: [],
  confirmDialog: null,
  activeModal: null,
  modalData: {},
  sidebarCollapsed: false,

  // Toast actions
  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newToast: Toast = { ...toast, id }
    
    set((state) => ({
      toasts: [...state.toasts, newToast],
    }))
    
    // Auto-remove after duration
    const duration = toast.duration ?? 5000
    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id)
      }, duration)
    }
    
    return id
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }))
  },

  clearToasts: () => {
    set({ toasts: [] })
  },

  // Toast shortcuts
  showSuccess: (title, message) => {
    get().addToast({ type: 'success', title, message })
  },

  showError: (title, message) => {
    get().addToast({ type: 'error', title, message, duration: 8000 })
  },

  showWarning: (title, message) => {
    get().addToast({ type: 'warning', title, message })
  },

  // Confirm dialog
  showConfirm: (options) => {
    set({
      confirmDialog: { ...options, isOpen: true },
    })
  },

  hideConfirm: () => {
    set({ confirmDialog: null })
  },

  // Modals
  openModal: (modalId, data = {}) => {
    set({ activeModal: modalId, modalData: data })
  },

  closeModal: () => {
    set({ activeModal: null, modalData: {} })
  },

  // Sidebar
  toggleSidebar: () => {
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }))
  },

  setSidebarCollapsed: (collapsed) => {
    set({ sidebarCollapsed: collapsed })
  },
}))









