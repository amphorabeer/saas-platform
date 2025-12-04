export const ActivityLog = {
  log(action: string, details: any) {
    try {
      const userStr = localStorage.getItem('currentUser')
      if (!userStr) return
      
      const user = JSON.parse(userStr)
      const log = {
        user: user.name,
        role: user.role,
        action,
        details,
        timestamp: new Date().toISOString()
      }
      
      const logs = JSON.parse(localStorage.getItem('activityLogs') || '[]')
      logs.push(log)
      
      // Keep only last 1000 logs
      if (logs.length > 1000) {
        logs.shift()
      }
      
      localStorage.setItem('activityLogs', JSON.stringify(logs))
    } catch (error) {
      console.error('Failed to log activity:', error)
    }
  },
  
  getLogs() {
    try {
      return JSON.parse(localStorage.getItem('activityLogs') || '[]')
    } catch (error) {
      console.error('Failed to get activity logs:', error)
      return []
    }
  },
  
  clearLogs() {
    localStorage.removeItem('activityLogs')
  }
}



