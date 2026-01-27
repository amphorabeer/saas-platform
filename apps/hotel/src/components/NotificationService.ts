/**
 * NotificationService - Handle in-app and external notifications
 */

export type NotificationType = 
  | 'lost_found'      // ნაპოვნი ნივთი
  | 'minibar'         // მინიბარის მოხმარება
  | 'task_completed'  // დავალება დასრულდა
  | 'task_verified'   // დავალება შემოწმდა
  | 'urgent_task'     // სასწრაფო დავალება
  | 'checkout_ready'  // ოთახი მზადაა check-in-ისთვის
  | 'system'          // სისტემური

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  data?: any
  read: boolean
  createdAt: string
  recipientRole?: string
  recipientUserId?: string
}

export class NotificationService {
  private static listeners: ((notification: Notification) => void)[] = []
  
  /**
   * Subscribe to notifications
   */
  static subscribe(callback: (notification: Notification) => void) {
    this.listeners.push(callback)
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback)
    }
  }
  
  /**
   * Emit notification to all listeners
   */
  private static emit(notification: Notification) {
    this.listeners.forEach(l => l(notification))
  }
  
  /**
   * Send notification
   */
  static async send(params: {
    type: NotificationType
    title: string
    message: string
    data?: any
    recipientRole?: string
    sendEmail?: boolean
    email?: string
    sendTelegram?: boolean
    telegramChatId?: string
  }): Promise<Notification | null> {
    try {
      const response = await fetch('/api/hotel/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      })
      
      if (response.ok) {
        const result = await response.json()
        if (result.notification) {
          this.emit(result.notification)
          this.showBrowserNotification(result.notification)
          this.saveToLocal(result.notification)
        }
        return result.notification
      }
    } catch (error) {
      console.error('[NotificationService] Error sending:', error)
    }
    
    // Fallback: create local notification
    const notification: Notification = {
      id: `notif-${Date.now()}`,
      type: params.type,
      title: params.title,
      message: params.message,
      data: params.data,
      read: false,
      createdAt: new Date().toISOString()
    }
    
    this.emit(notification)
    this.showBrowserNotification(notification)
    this.saveToLocal(notification)
    
    return notification
  }
  
  /**
   * Show browser notification (if permitted)
   */
  private static async showBrowserNotification(notification: Notification) {
    if (typeof window === 'undefined') return
    
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.id
      })
    }
  }
  
  /**
   * Request browser notification permission
   */
  static async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined') return false
    
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    }
    return false
  }
  
  /**
   * Save notification to localStorage
   */
  private static saveToLocal(notification: Notification) {
    if (typeof window === 'undefined') return
    
    const notifications = this.getAll()
    notifications.unshift(notification)
    
    // Keep only last 100
    const trimmed = notifications.slice(0, 100)
    localStorage.setItem('hotelNotifications', JSON.stringify(trimmed))
  }
  
  /**
   * Get all notifications from localStorage
   */
  static getAll(): Notification[] {
    if (typeof window === 'undefined') return []
    
    try {
      return JSON.parse(localStorage.getItem('hotelNotifications') || '[]')
    } catch {
      return []
    }
  }
  
  /**
   * Get unread count
   */
  static getUnreadCount(): number {
    return this.getAll().filter(n => !n.read).length
  }
  
  /**
   * Mark as read
   */
  static markAsRead(id: string) {
    if (typeof window === 'undefined') return
    
    const notifications = this.getAll()
    const idx = notifications.findIndex(n => n.id === id)
    if (idx >= 0) {
      notifications[idx].read = true
      localStorage.setItem('hotelNotifications', JSON.stringify(notifications))
    }
  }
  
  /**
   * Mark all as read
   */
  static markAllAsRead() {
    if (typeof window === 'undefined') return
    
    const notifications = this.getAll().map(n => ({ ...n, read: true }))
    localStorage.setItem('hotelNotifications', JSON.stringify(notifications))
  }
  
  /**
   * Clear all notifications
   */
  static clearAll() {
    if (typeof window === 'undefined') return
    localStorage.removeItem('hotelNotifications')
  }
  
  // ========================================
  // Specific notification helpers
  // ========================================
  
  /**
   * Notify about lost & found item
   */
  static async notifyLostFound(params: {
    roomNumber: string
    description: string
    location?: string
    foundBy?: string
  }) {
    return this.send({
      type: 'lost_found',
      title: '🔍 ნაპოვნი ნივთი',
      message: `ოთახი ${params.roomNumber}: ${params.description}${params.location ? ` (${params.location})` : ''}`,
      data: params,
      recipientRole: 'reception'
    })
  }
  
  /**
   * Notify about minibar consumption
   */
  static async notifyMinibar(params: {
    roomNumber: string
    items: { item: string; consumed: number; price: number }[]
    total: number
    guestName?: string
  }) {
    const itemsList = params.items.map(i => `${i.item} ×${i.consumed}`).join(', ')
    return this.send({
      type: 'minibar',
      title: '🍫 მინიბარის მოხმარება',
      message: `ოთახი ${params.roomNumber}: ${itemsList} - სულ ₾${params.total.toFixed(2)}`,
      data: params,
      recipientRole: 'reception'
    })
  }
  
  /**
   * Notify task completed
   */
  static async notifyTaskCompleted(params: {
    roomNumber: string
    taskType: string
    completedBy?: string
  }) {
    return this.send({
      type: 'task_completed',
      title: '✅ დავალება დასრულდა',
      message: `ოთახი ${params.roomNumber} - ${params.taskType}${params.completedBy ? ` (${params.completedBy})` : ''}`,
      data: params,
      recipientRole: 'manager'
    })
  }
  
  /**
   * Notify room ready for check-in
   */
  static async notifyRoomReady(params: {
    roomNumber: string
    verifiedBy?: string
  }) {
    return this.send({
      type: 'checkout_ready',
      title: '🏨 ოთახი მზადაა',
      message: `ოთახი ${params.roomNumber} მზადაა Check-in-ისთვის`,
      data: params,
      recipientRole: 'reception'
    })
  }
}