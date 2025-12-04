export class ActivityLogger {
  static log(action: string, details?: any) {
    try {
      const userStr = localStorage.getItem('currentUser')
      if (!userStr) return // Don't log if no user
      
      const user = JSON.parse(userStr)
      if (!user.name) return // Don't log if no user name
      
      const log = {
        id: Date.now(),
        user: user.name,
        role: user.role,
        action,
        details,
        timestamp: new Date().toISOString()
      }
      
      const logs = JSON.parse(localStorage.getItem('activityLogs') || '[]')
      logs.push(log)
      
      // Keep only last 500 logs
      if (logs.length > 500) {
        logs.shift()
      }
      
      localStorage.setItem('activityLogs', JSON.stringify(logs))
    } catch (error) {
      console.error('Failed to log activity:', error)
    }
  }
  
  static getActionLabel(action: string): string {
    const labels: any = {
      'LOGIN': '🔐 შესვლა სისტემაში',
      'LOGOUT': '🚪 გასვლა სისტემიდან',
      'RESERVATION_CREATE': '📝 ახალი ჯავშანი',
      'RESERVATION_UPDATE': '✏️ ჯავშნის განახლება',
      'RESERVATION_CANCEL': '❌ ჯავშნის გაუქმება',
      'RESERVATION_DELETE': '🗑️ ჯავშნის წაშლა',
      'CHECK_IN': '✅ Check-in',
      'CHECK_OUT': '🏁 Check-out',
      'PAYMENT_RECEIVED': '💰 გადახდა მიღებული',
      'ROOM_BLOCK': '🚫 ოთახის დაბლოკვა',
      'ROOM_UNBLOCK': '✅ ოთახის განბლოკვა',
      'ROOM_MAINTENANCE': '🔧 ოთახი რემონტში',
      'ROOM_STATUS_CHANGE': '🔄 ოთახის სტატუსის ცვლილება',
      'HOUSEKEEPING_START': '🧹 დასუფთავება დაწყებული',
      'HOUSEKEEPING_COMPLETE': '✨ დასუფთავება დასრულებული',
      'NIGHT_AUDIT': '🌙 დღის დახურვა',
      'REPORT_GENERATED': '📊 რეპორტი',
      'SETTINGS_CHANGED': '⚙️ პარამეტრების ცვლილება',
      'INVOICE_PRINTED': '🖨️ ინვოისი დაბეჭდილი',
      'INVOICE_SENT': '📧 ინვოისი გაგზავნილი',
      'OPEN_CHECKIN_MODAL': '📝 Check-in ფორმის გახსნა',
      'OPEN_SETTINGS': '⚙️ პარამეტრების გახსნა'
    }
    return labels[action] || action
  }
  
  static getLogs() {
    try {
      return JSON.parse(localStorage.getItem('activityLogs') || '[]')
    } catch (error) {
      console.error('Failed to get activity logs:', error)
      return []
    }
  }
  
  static clearLogs() {
    localStorage.removeItem('activityLogs')
  }
}



