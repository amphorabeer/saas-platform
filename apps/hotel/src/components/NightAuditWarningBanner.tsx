'use client'

import { useState, useEffect } from 'react'
import moment from 'moment'

export default function NightAuditWarningBanner() {
  const [warning, setWarning] = useState<{
    show: boolean
    message: string
    daysOverdue: number
    lastAuditDate: string | null
    expectedDate: string
  } | null>(null)

  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    checkAuditStatus()
    
    // Check every minute
    const interval = setInterval(checkAuditStatus, 60000)
    
    // Also check on storage change (when audit is completed in another tab)
    const handleStorageChange = () => {
      checkAuditStatus()
      setIsDismissed(false) // Reset dismissal on storage change
    }
    
    window.addEventListener('storage', handleStorageChange)
    
    // Listen for custom audit complete event
    const handleAuditComplete = () => {
      checkAuditStatus()
      setIsDismissed(false)
    }
    
    window.addEventListener('nightAuditComplete', handleAuditComplete as EventListener)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('nightAuditComplete', handleAuditComplete as EventListener)
    }
  }, [])

  const checkAuditStatus = () => {
    if (typeof window === 'undefined') return

    const today = moment().format('YYYY-MM-DD')
    const lastAuditDate = localStorage.getItem('lastNightAuditDate') || localStorage.getItem('lastAuditDate')
    const currentBusinessDate = localStorage.getItem('currentBusinessDate')
    
    // Calculate expected audit date (yesterday or last business date)
    const yesterday = moment().subtract(1, 'day').format('YYYY-MM-DD')
    
    // If no audit has ever been done
    if (!lastAuditDate) {
      // Check if there are any reservations or folios that need auditing
      const reservations = JSON.parse(localStorage.getItem('hotelReservations') || '[]')
      const audits = JSON.parse(localStorage.getItem('nightAudits') || '[]')
      
      // Check if there are any completed audits
      const hasCompletedAudits = audits.some((a: any) => a.status === 'completed' && !a.reversed)
      
      // Only show warning if there's activity but no audits
      const hasActivity = reservations.length > 0 || audits.length > 0
      
      if (hasActivity && !hasCompletedAudits) {
        setWarning({
          show: true,
          message: 'Night Audit არასდროს შესრულებულა! გთხოვთ დახუროთ წინა დღეები.',
          daysOverdue: 0,
          lastAuditDate: null,
          expectedDate: yesterday
        })
        return
      }
    }

    // Parse last audit date
    let lastAudit: moment.Moment
    try {
      // Try parsing as JSON first
      lastAudit = moment(JSON.parse(lastAuditDate))
    } catch {
      // If not JSON, try direct parsing
      lastAudit = moment(lastAuditDate)
    }

    if (!lastAudit.isValid()) {
      // Invalid date, check if we have audits in history
      const audits = JSON.parse(localStorage.getItem('nightAudits') || '[]')
      const completedAudits = audits
        .filter((a: any) => a.status === 'completed' && !a.reversed)
        .sort((a: any, b: any) => moment(b.date).valueOf() - moment(a.date).valueOf())
      
      if (completedAudits.length > 0) {
        lastAudit = moment(completedAudits[0].date)
      } else {
        // No valid audit date found
        setWarning(null)
        return
      }
    }

    // Calculate days since last audit
    const todayMoment = moment(today)
    const expectedNextAudit = lastAudit.clone().add(1, 'day').format('YYYY-MM-DD')
    const daysSinceLastAudit = todayMoment.diff(lastAudit, 'days')

    // If more than 1 day has passed since last audit
    if (daysSinceLastAudit > 1) {
      const daysOverdue = daysSinceLastAudit - 1
      setWarning({
        show: true,
        message: daysOverdue === 1 
          ? `⚠️ გუშინდელი Night Audit (${moment(expectedNextAudit).format('DD/MM/YYYY')}) არ არის შესრულებული!`
          : `⚠️ ${daysOverdue} დღის Night Audit არ არის შესრულებული! ბოლო: ${lastAudit.format('DD/MM/YYYY')}`,
        daysOverdue,
        lastAuditDate: lastAudit.format('YYYY-MM-DD'),
        expectedDate: expectedNextAudit
      })
    } else {
      setWarning(null)
    }
  }

  const handleGoToAudit = () => {
    // Dispatch custom event to open Night Audit
    window.dispatchEvent(new CustomEvent('openNightAudit', { 
      detail: { date: warning?.expectedDate } 
    }))
    
    // Also dismiss the banner
    setIsDismissed(true)
  }

  const handleDismiss = () => {
    // Temporarily dismiss (will show again on page refresh or audit completion)
    setIsDismissed(true)
    setWarning(null)
  }

  if (!warning || !warning.show || isDismissed) return null

  return (
    <div className="bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl animate-pulse">🌙</div>
            <div>
              <div className="font-bold text-lg">Night Audit დაგვიანებულია!</div>
              <div className="text-sm opacity-90">{warning.message}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleGoToAudit}
              className="px-4 py-2 bg-white text-red-600 rounded-lg font-bold hover:bg-gray-100 transition-colors"
            >
              🔓 Audit-ის შესრულება
            </button>
            <button
              onClick={handleDismiss}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="დროებით დამალვა"
            >
              ✕
            </button>
          </div>
        </div>
        
        {/* Progress indicator */}
        {warning.daysOverdue > 0 && warning.lastAuditDate && (
          <div className="mt-2 flex items-center gap-2 text-xs flex-wrap">
            <span>გამოტოვებული დღეები:</span>
            {Array.from({ length: Math.min(warning.daysOverdue, 7) }).map((_, i) => (
              <span key={i} className="px-2 py-1 bg-white/20 rounded">
                {moment(warning.lastAuditDate).add(i + 1, 'day').format('DD/MM')}
              </span>
            ))}
            {warning.daysOverdue > 7 && <span>+{warning.daysOverdue - 7} სხვა...</span>}
          </div>
        )}
      </div>
    </div>
  )
}
