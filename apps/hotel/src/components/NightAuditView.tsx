'use client'

import { useState, useEffect } from 'react'
import moment from 'moment'
import { SystemLockService } from '../lib/systemLockService'
import { ActivityLogger } from '../lib/activityLogger'
import { generatePDFReport, sendEmailReport } from '../lib/reportService'
import CashierModule from './CashierModule'
import FolioSystem from './FolioSystem'
import NightAuditAutoClose from './NightAuditAutoClose'
import CheckOutModal from './CheckOutModal'

// Audit Override Panel Component
function AuditOverridePanel({ auditDate }: { auditDate: string }) {
  const [showOverride, setShowOverride] = useState(false)
  const currentUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('currentUser') || '{}') : {}
  
  if (currentUser.role !== 'admin') return null
  
  const handleReopenDay = (dateToReopen: string) => {
    const reason = prompt('მიუთითეთ დღის ხელახალი გახსნის მიზეზი:')
    
    if (!reason || reason.length < 10) {
      alert('გთხოვთ მიუთითოთ დეტალური მიზეზი (მინ. 10 სიმბოლო)')
      return
    }
    
    // Log override
    const overrideLog = {
      action: 'REOPEN_DAY',
      date: dateToReopen,
      reason,
      user: currentUser.name,
      timestamp: new Date().toISOString()
    }
    
    const overrides = JSON.parse(localStorage.getItem('auditOverrides') || '[]')
    overrides.push(overrideLog)
    localStorage.setItem('auditOverrides', JSON.stringify(overrides))
    
    // Remove from closed days
    const audits = JSON.parse(localStorage.getItem('nightAudits') || '[]')
    const filtered = audits.filter((a: any) => a.date !== dateToReopen)
    localStorage.setItem('nightAudits', JSON.stringify(filtered))
    
    // Update last audit date if needed
    if (filtered.length > 0) {
      const lastAudit = filtered[filtered.length - 1]
      localStorage.setItem('lastAuditDate', JSON.stringify(lastAudit.date))
    } else {
      localStorage.removeItem('lastAuditDate')
    }
    
    // Activity log
    ActivityLogger.log('AUDIT_OVERRIDE', {
      action: 'REOPEN_DAY',
      date: dateToReopen,
      reason,
      user: currentUser.name
    })
    
    alert('✅ დღე ხელახლა გაიხსნა')
    location.reload()
  }
  
  const audits = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('nightAudits') || '[]') : []
  
  return (
    <div className="bg-red-50 rounded-lg p-4 mt-4">
      <button
        onClick={() => setShowOverride(!showOverride)}
        className="text-red-600 font-bold hover:text-red-700"
      >
        ⚙️ Admin Override
      </button>
      
      {showOverride && (
        <div className="mt-4 space-y-2">
          <h4 className="font-bold">დახურული დღეების მართვა:</h4>
          {audits.length === 0 ? (
            <p className="text-sm text-gray-600">დახურული დღეები არ არის</p>
          ) : (
            audits.map((audit: any) => (
              <div key={audit.id || audit.date} className="flex justify-between items-center p-2 bg-white rounded">
                <span>{moment(audit.date).format('DD/MM/YYYY')}</span>
                <button
                  onClick={() => handleReopenDay(audit.date)}
                  className="text-red-600 text-sm hover:text-red-700 px-2 py-1 border border-red-300 rounded"
                >
                  ხელახალი გახსნა
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default function NightAuditView({ rooms, reservations, onAuditComplete }: any) {
  const [auditDate, setAuditDate] = useState(() => {
    // For testing, allow selecting any date
    const lastAudit = localStorage.getItem('lastAuditDate')
    if (!lastAudit) {
      // If no previous audit, start from any date user wants
      return moment().subtract(1, 'day').format('YYYY-MM-DD')
    }
    // Otherwise suggest next day after last audit
    try {
      return moment(JSON.parse(lastAudit)).add(1, 'day').format('YYYY-MM-DD')
    } catch {
      return moment().subtract(1, 'day').format('YYYY-MM-DD')
    }
  })
  const [auditStatus, setAuditStatus] = useState('pending')
  const [auditInProgress, setAuditInProgress] = useState(false)
  const [blockingIssues, setBlockingIssues] = useState<string[]>([])
  const [enterpriseMode, setEnterpriseMode] = useState(false)
  const [auditStep, setAuditStep] = useState(0)
  const [systemLocked, setSystemLocked] = useState(false)
  const [showAutoClose, setShowAutoClose] = useState(false)
  const [pendingCheckOuts, setPendingCheckOuts] = useState<any[]>([])
  const [pendingCheckIns, setPendingCheckIns] = useState<any[]>([])
  const [selectedReservation, setSelectedReservation] = useState<any>(null)
  const [showCheckInModal, setShowCheckInModal] = useState(false)
  const [showCheckOutModal, setShowCheckOutModal] = useState(false)
  const [checklist, setChecklist] = useState([
    { id: 1, task: 'დღევანდელი Check-in დასრულებულია', completed: false },
    { id: 2, task: 'დღევანდელი Check-out დასრულებულია', completed: false },
    { id: 3, task: 'გადახდები შემოწმებულია', completed: false },
    { id: 4, task: 'ნაღდი ფული დათვლილია', completed: false },
    { id: 5, task: 'დასუფთავება შემოწმებულია', completed: false },
    { id: 6, task: 'No-show დამუშავებულია', completed: false },
    { id: 7, task: 'მომავალი დღის ჯავშნები შემოწმებულია', completed: false },
    { id: 8, task: 'Backup შექმნილია', completed: false }
  ])
  
  // Calculate maximum allowed audit date (can only close up to yesterday, not today)
  const getMaxAuditDate = () => {
    const today = moment().format('YYYY-MM-DD')
    const yesterday = moment().subtract(1, 'day').format('YYYY-MM-DD')
    return yesterday // Can only close up to yesterday, not today
  }
  
  // Check if day is already closed
  const isDayAlreadyClosed = (date: string) => {
    const audits = JSON.parse(localStorage.getItem('nightAudits') || '[]')
    return audits.some((audit: any) => audit.date === date)
  }
  
  // Complete Night Audit validation with all rules
  const validateDayCanBeClosed = () => {
    const auditDateMoment = moment(auditDate)
    const errors: string[] = []
    
    // 1. Check ALL pending check-outs (including payment)
    const pendingCheckOuts = reservations.filter((r: any) => {
      const checkOutDate = moment(r.checkOut).format('YYYY-MM-DD')
      return r.status === 'CHECKED_IN' && 
             moment(checkOutDate).isSameOrBefore(auditDate, 'day') &&
             r.status !== 'CANCELLED'
    })
    
    if (pendingCheckOuts.length > 0) {
      errors.push(`❌ ${pendingCheckOuts.length} დაუსრულებელი Check-out:\n${pendingCheckOuts.map((r: any) => `- ${r.guestName} (Room ${r.roomNumber || r.roomId || 'N/A'}) - უნდა გასულიყო ${moment(r.checkOut).format('DD/MM')}`).join('\n')}`)
    }
    
    // 2. Check unpaid check-outs for TODAY
    const unpaidCheckOuts = reservations.filter((r: any) => {
      const checkOutDate = moment(r.checkOut).format('YYYY-MM-DD')
      const isPaid = r.isPaid === true || r.paymentStatus === 'PAID' || (r.paidAmount || 0) >= (r.totalAmount || 0)
      return checkOutDate === auditDate && 
             r.status === 'CHECKED_IN' && 
             !isPaid &&
             r.status !== 'CANCELLED'
    })
    
    if (unpaidCheckOuts.length > 0) {
      errors.push(`💰 ${unpaidCheckOuts.length} გადაუხდელი Check-out:\n${unpaidCheckOuts.map((r: any) => `- ${r.guestName} (Room ${r.roomNumber || r.roomId || 'N/A'}) - ₾${r.totalAmount || 0}`).join('\n')}`)
    }
    
    // 3. Check pending check-ins for today
    const pendingCheckIns = reservations.filter((r: any) => {
      const checkInDate = moment(r.checkIn).format('YYYY-MM-DD')
      return r.status === 'CONFIRMED' && 
             checkInDate === auditDate
    })
    
    if (pendingCheckIns.length > 0) {
      errors.push(`❌ ${pendingCheckIns.length} დაუსრულებელი Check-in:\n${pendingCheckIns.map((r: any) => `- ${r.guestName} (Room ${r.roomNumber || r.roomId || 'N/A'})`).join('\n')}`)
    }
    
    // INFO: Show continuing guests (not blocking)
    const continuingGuests = reservations.filter((r: any) => {
      const checkIn = moment(r.checkIn)
      const checkOut = moment(r.checkOut)
      
      return r.status === 'CHECKED_IN' && 
             checkIn.isSameOrBefore(auditDate, 'day') && 
             checkOut.isAfter(auditDate, 'day')
    })
    
    if (continuingGuests.length > 0) {
      console.log(`ℹ️ ${continuingGuests.length} სტუმარი აგრძელებს დარჩენას (გადახდა Check-out დღეს)`)
    }
    
    return errors
  }
  
  // Generate folio for reservation (using FolioSystem logic)
  const generateFolio = (reservation: any) => {
    const nights = moment(reservation.checkOut).diff(moment(reservation.checkIn), 'days')
    const roomRate = reservation.totalAmount / nights
    
    const items: any[] = []
    
    // Add room charges
    for (let i = 0; i < nights; i++) {
      const date = moment(reservation.checkIn).add(i, 'days')
      items.push({
        id: `room-${i}`,
        date: date.format('YYYY-MM-DD'),
        description: `Room ${reservation.roomNumber || reservation.roomId} - ${reservation.roomType || 'Standard'}`,
        quantity: 1,
        rate: roomRate,
        amount: roomRate,
        type: 'room'
      })
    }
    
    // Calculate taxes (18% VAT + 1% City Tax)
    const subtotal = roomRate * nights
    const vat = subtotal * 0.18
    const cityTax = subtotal * 0.01
    
    items.push({
      id: 'vat',
      date: moment().format('YYYY-MM-DD'),
      description: 'VAT (18%)',
      quantity: 1,
      rate: vat,
      amount: vat,
      type: 'tax'
    })
    
    items.push({
      id: 'city-tax',
      date: moment().format('YYYY-MM-DD'),
      description: 'City Tax (1%)',
      quantity: 1,
      rate: cityTax,
      amount: cityTax,
      type: 'tax'
    })
    
    // Add payments if any
    if (reservation.payments) {
      reservation.payments.forEach((payment: any, idx: number) => {
        items.push({
          id: `payment-${idx}`,
          date: payment.date || moment().format('YYYY-MM-DD'),
          description: `Payment - ${payment.method || 'Cash'}`,
          quantity: 1,
          rate: -payment.amount,
          amount: -payment.amount,
          type: 'payment'
        })
      })
    }
    
    const total = subtotal + vat + cityTax
    const paid = reservation.payments?.reduce((sum: number, p: any) => sum + p.amount, 0) || 0
    
    return {
      folioNumber: `F${Date.now().toString().slice(-8)}`,
      reservationId: reservation.id,
      guestName: reservation.guestName,
      roomNumber: reservation.roomNumber || reservation.roomId || 'N/A',
      checkIn: reservation.checkIn,
      checkOut: reservation.checkOut,
      items,
      subtotal,
      taxes: vat + cityTax,
      total,
      paid,
      balance: total - paid,
      status: 'open',
      createdAt: new Date().toISOString()
    }
  }
  
  // Process pending checkouts with folio generation
  const processPendingCheckouts = () => {
    const allReservations = JSON.parse(localStorage.getItem('hotelReservations') || '[]')
    const pendingCheckouts = allReservations.filter((r: any) => {
      const checkOutDate = moment(r.checkOut).format('YYYY-MM-DD')
      return checkOutDate === auditDate && r.status === 'CHECKED_IN'
    })
    
    const results = {
      processed: 0,
      extended: 0,
      foliosGenerated: [] as any[]
    }
    
    pendingCheckouts.forEach((reservation: any) => {
      // Generate folio
      const folio = generateFolio(reservation)
      results.foliosGenerated.push(folio)
      
      // Process checkout
      reservation.status = 'CHECKED_OUT'
      results.processed++
    })
    
    // Save folios
    const existingFolios = JSON.parse(localStorage.getItem('hotelFolios') || '[]')
    localStorage.setItem('hotelFolios', JSON.stringify([...existingFolios, ...results.foliosGenerated]))
    
    // Save updated reservations
    localStorage.setItem('hotelReservations', JSON.stringify(allReservations))
    
    return results
  }
  
  // Check group bookings
  const checkGroupBookings = () => {
    const allReservations = JSON.parse(localStorage.getItem('hotelReservations') || '[]')
    const groupBookings = allReservations.filter((r: any) => r.isGroup && !r.primaryGuest)
    
    if (groupBookings.length > 0) {
      return {
        hasIssues: true,
        count: groupBookings.length,
        bookings: groupBookings
      }
    }
    
    return { hasIssues: false }
  }
  
  // Force logout other users
  const forceLogoutUsers = () => {
    setSystemLocked(true)
    
    // Send logout signal to all connected users
    const logoutEvent = new CustomEvent('forceLogout', { 
      detail: { 
        reason: 'Night Audit in progress',
        countdown: 30 
      }
    })
    window.dispatchEvent(logoutEvent)
    
    // Start countdown
    let countdown = 30
    const timer = setInterval(() => {
      countdown--
      if (countdown === 0) {
        clearInterval(timer)
        // Force logout all users
        localStorage.setItem('systemLocked', JSON.stringify({
          locked: true,
          reason: 'Night Audit',
          timestamp: Date.now()
        }))
        setAuditStep(1)
      }
    }, 1000)
    
    return timer
  }
  
  // Generate comprehensive reports
  const generateReports = async () => {
    const dayStats = calculateDayStatistics()
    
    const reports = {
      roomDetails: {
        occupied: dayStats.occupiedRooms,
        vacant: dayStats.totalRooms - dayStats.occupiedRooms,
        cleaning: rooms.filter((r: any) => r.status === 'CLEANING').length,
        maintenance: rooms.filter((r: any) => r.status === 'MAINTENANCE').length
      },
      accountDetails: {
        checkIns: dayStats.totalCheckIns,
        checkOuts: dayStats.totalCheckOuts,
        revenue: dayStats.totalRevenue,
        averageRate: dayStats.averageRate
      },
      housekeepingSummary: {
        cleaned: rooms.filter((r: any) => r.status === 'VACANT').length,
        pending: rooms.filter((r: any) => r.status === 'CLEANING').length
      },
      revenueSummary: {
        total: dayStats.totalRevenue,
        cash: 0, // Will be from cashier module
        card: 0,
        occupancy: dayStats.occupancyRate
      },
      depositStatus: {
        total: 0,
        refunded: 0,
        pending: 0
      },
      posStatus: {
        total: 0,
        items: []
      }
    }
    
    // Get cashier data if available
    const cashierShift = JSON.parse(localStorage.getItem('currentCashierShift') || 'null')
    if (cashierShift && cashierShift.status === 'closed') {
      reports.revenueSummary.cash = cashierShift.cashCollected || 0
      reports.revenueSummary.card = cashierShift.cardPayments || 0
    }
    
    return reports
  }
  
  // Auto Night Audit for missed days
  const autoNightAudit = () => {
    const lastAudit = localStorage.getItem('lastAuditDate')
    if (!lastAudit) return
    
    try {
      const lastDate = moment(JSON.parse(lastAudit))
      const today = moment()
      const daysMissed = today.diff(lastDate, 'days') - 1
      
      if (daysMissed > 0) {
        if (confirm(`${daysMissed} დღე გამოტოვებულია. გსურთ Auto Night Audit?`)) {
          for (let i = 1; i <= daysMissed; i++) {
            const missedDate = lastDate.clone().add(i, 'days')
            // Process auto audit for missed date
            console.log(`Auto processing audit for ${missedDate.format('YYYY-MM-DD')}`)
            // Note: Full auto audit would require all validations to pass
          }
        }
      }
    } catch (error) {
      console.error('Error in auto night audit:', error)
    }
  }
  
  // Process No-Shows automatically with charges
  // Calculate NO-SHOW charge (first night)
  const calculateNoShowCharge = (reservation: any) => {
    const nights = moment(reservation.checkOut).diff(moment(reservation.checkIn), 'days')
    if (nights > 0) {
      return reservation.totalAmount / nights
    }
    return reservation.totalAmount
  }
  
  // Detect and process NO-SHOWS for a specific date
  const detectNoShows = (date: string) => {
    const expectedArrivals = reservations.filter((r: any) => {
      const checkInDate = moment(r.checkIn).format('YYYY-MM-DD')
      return checkInDate === date && 
             r.status === 'CONFIRMED' &&
             !r.actualCheckIn
    })
    
    return expectedArrivals.map((r: any) => ({
      ...r,
      status: 'NO_SHOW',
      noShowDate: date,
      noShowCharge: calculateNoShowCharge(r),
      markedAsNoShowAt: moment().format()
    }))
  }
  
  const processNoShows = async () => {
    // Use detectNoShows to find all NO-SHOWS for audit date
    const detectedNoShows = detectNoShows(auditDate)
    
    if (detectedNoShows.length > 0) {
      const totalCharge = detectedNoShows.reduce((sum: number, r: any) => sum + (r.noShowCharge || 0), 0)
      const confirmed = confirm(
        `⚠️ ${detectedNoShows.length} No-Show დაფიქსირება?\n\n` +
        `${detectedNoShows.map((r: any) => `- ${r.guestName} (Room ${r.roomNumber || r.roomId})`).join('\n')}\n\n` +
        `სულ გადასახადი: ₾${totalCharge.toFixed(2)}`
      )
      
      if (confirmed) {
        // Update reservations via API
        const updatePromises = detectedNoShows.map(async (r: any) => {
          try {
            await fetch('/api/hotel/reservations', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: r.id,
                status: 'NO_SHOW',
                noShowDate: auditDate,
                noShowCharge: r.noShowCharge,
                markedAsNoShowAt: moment().format(),
                noShowReason: 'Auto-detected during Night Audit'
              })
            })
            
            // Update room status to VACANT
            if (r.roomId) {
              await fetch('/api/hotel/rooms/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  roomId: r.roomId,
                  status: 'VACANT'
                })
              })
            }
            
            ActivityLogger.log('NO_SHOW_PROCESSED', {
              guest: r.guestName,
              room: r.roomNumber || r.roomId,
              reservationId: r.id,
              charge: r.noShowCharge
            })
          } catch (error) {
            console.error(`Failed to update reservation ${r.id}:`, error)
          }
        })
        
        await Promise.all(updatePromises)
        
        return detectedNoShows.length
      }
    }
    return 0
  }
  
  // Calculate comprehensive statistics
  const calculateDayStatistics = () => {
    const stats = {
      // Basic counts
      totalCheckIns: reservations.filter((r: any) => 
        moment(r.checkIn).format('YYYY-MM-DD') === auditDate && 
        r.status === 'CHECKED_IN'
      ).length,
      
      totalCheckOuts: reservations.filter((r: any) => 
        moment(r.checkOut).format('YYYY-MM-DD') === auditDate && 
        r.status === 'CHECKED_OUT'
      ).length,
      
      // Financial
      totalRevenue: reservations
        .filter((r: any) => {
          const isPaid = r.isPaid === true || r.paymentStatus === 'PAID' || (r.paidAmount || 0) >= (r.totalAmount || 0)
          return moment(r.checkIn).format('YYYY-MM-DD') === auditDate && 
                 isPaid
        })
        .reduce((sum: number, r: any) => sum + (r.totalAmount || 0), 0),
      
      // Occupancy
      occupiedRooms: reservations.filter((r: any) => {
        const checkIn = moment(r.checkIn)
        const checkOut = moment(r.checkOut)
        return r.status === 'CHECKED_IN' && 
               checkIn.isSameOrBefore(auditDate, 'day') && 
               checkOut.isAfter(auditDate, 'day')
      }).length,
      
      totalRooms: rooms.length,
      
      // No-shows and cancellations
      noShows: reservations.filter((r: any) => 
        r.status === 'NO_SHOW' && 
        moment(r.checkIn).format('YYYY-MM-DD') === auditDate
      ).length,
      
      cancellations: reservations.filter((r: any) => 
        r.status === 'CANCELLED' && 
        r.cancelledAt &&
        moment(r.cancelledAt).format('YYYY-MM-DD') === auditDate
      ).length,
      
      occupancyRate: 0,
      averageRate: 0
    }
    
    // Calculate rates
    stats.occupancyRate = Math.round((stats.occupiedRooms / stats.totalRooms) * 100) || 0
    stats.averageRate = stats.totalCheckIns > 0 ? Math.round(stats.totalRevenue / stats.totalCheckIns) : 0
    
    return stats
  }
  
  // Check for pending operations more intelligently (for warnings)
  const validateAllOperationsCompleted = () => {
    const issues = []
    const auditDateMoment = moment(auditDate)
    
    // Check-ins: Only for reservations starting TODAY or BEFORE (not future)
    const pendingCheckIns = reservations.filter((r: any) => {
      const checkInDate = moment(r.checkIn).format('YYYY-MM-DD')
      return r.status === 'CONFIRMED' && 
             checkInDate <= auditDate && // Should have checked in by audit date
             !['CHECKED_IN', 'CHECKED_OUT', 'CANCELLED'].includes(r.status)
    })
    
    // Check-outs: Only for reservations ending TODAY (not continuing guests)
    const pendingCheckOuts = reservations.filter((r: any) => {
      const checkOutDate = moment(r.checkOut).format('YYYY-MM-DD')
      return r.status === 'CHECKED_IN' && 
             checkOutDate === auditDate // Only if checking out TODAY
    })
    
    // Don't block for continuing guests
    const continuingGuests = reservations.filter((r: any) => {
      const checkIn = moment(r.checkIn).format('YYYY-MM-DD')
      const checkOut = moment(r.checkOut).format('YYYY-MM-DD')
      return r.status === 'CHECKED_IN' && 
             checkIn <= auditDate && 
             checkOut > auditDate // Still staying tomorrow
    })
    
    if (pendingCheckIns.length > 0) {
      issues.push({
        type: 'WARNING', // Changed from BLOCKER
        message: `⚠️ ${pendingCheckIns.length} ჯავშანი არ არის Check-in`,
        details: pendingCheckIns.map((r: any) => `${r.guestName} - Room ${r.roomNumber || 'N/A'}`)
      })
    }
    
    if (pendingCheckOuts.length > 0) {
      issues.push({
        type: 'WARNING', // Changed from BLOCKER
        message: `⚠️ ${pendingCheckOuts.length} Check-out დასასრულებელი`,
        details: pendingCheckOuts.map((r: any) => `${r.guestName} - Room ${r.roomNumber || 'N/A'}`)
      })
    }
    
    // Add info about continuing guests
    if (continuingGuests.length > 0) {
      console.log(`ℹ️ ${continuingGuests.length} სტუმარი აგრძელებს დარჩენას`)
    }
    
    return issues
  }
  
  // Check for sequential closing (no gaps)
  const checkSequentialClosing = () => {
    const lastAudit = JSON.parse(localStorage.getItem('lastAuditDate') || 'null')
    
    if (!lastAudit) {
      // First time closing - ok
      return { valid: true }
    }
    
    const daysSinceLastAudit = moment(auditDate).diff(moment(lastAudit), 'days')
    
    if (daysSinceLastAudit !== 1) {
      return {
        valid: false,
        message: `❌ წინა დახურვა: ${moment(lastAudit).format('DD/MM/YYYY')}\n` +
                 `შემდეგი დახურვა უნდა იყოს: ${moment(lastAudit).add(1, 'day').format('DD/MM/YYYY')}`
      }
    }
    
    return { valid: true }
  }
  
  // Calculate daily statistics
  const calculateStats = () => {
    const todayReservations = reservations.filter((r: any) => {
      const checkIn = moment(r.checkIn).format('YYYY-MM-DD')
      return checkIn === auditDate
    })
    
    const todayCheckouts = reservations.filter((r: any) => {
      const checkOut = moment(r.checkOut).format('YYYY-MM-DD')
      return checkOut === auditDate && r.status === 'CHECKED_OUT'
    })
    
    const occupiedRooms = rooms.filter((r: any) => r.status === 'OCCUPIED').length
    const totalRevenue = todayCheckouts.reduce((sum: number, r: any) => sum + (r.totalAmount || 0), 0)
    
    return {
      checkIns: todayReservations.length,
      checkOuts: todayCheckouts.length,
      occupied: occupiedRooms,
      vacant: rooms.length - occupiedRooms,
      revenue: totalRevenue,
      occupancyRate: Math.round((occupiedRooms / rooms.length) * 100),
      noShows: todayReservations.filter((r: any) => 
        r.status === 'CONFIRMED' && moment().isAfter(moment(r.checkIn).add(6, 'hours'))
      ).length
    }
  }
  
  const stats = calculateStats()
  
  // Auto-check and show what needs to be done
  const runAutoChecks = () => {
    const issues: string[] = []
    
    // Check for pending check-ins: Only for reservations starting TODAY or BEFORE
    const pendingCheckIns = reservations.filter((r: any) => {
      const checkInDate = moment(r.checkIn).format('YYYY-MM-DD')
      return r.status === 'CONFIRMED' && 
             checkInDate <= auditDate &&
             !['CHECKED_IN', 'CHECKED_OUT', 'CANCELLED'].includes(r.status)
    })
    
    // Check for pending check-outs: Only for reservations ending TODAY (not continuing guests)
    const pendingCheckOuts = reservations.filter((r: any) => {
      const checkOutDate = moment(r.checkOut).format('YYYY-MM-DD')
      return r.status === 'CHECKED_IN' && 
             checkOutDate === auditDate // Only if checking out TODAY
    })
    
    // Check housekeeping
    const roomsNeedCleaning = rooms.filter((r: any) => r.status === 'CLEANING')
    
    // Check no-shows
    const noShows = reservations.filter((r: any) => 
      r.status === 'CONFIRMED' && 
      moment(r.checkIn).add(6, 'hours').isBefore(moment())
    )
    
    // Update checklist with actual status (only for auto-checkable items, preserve manual changes)
    const updated = checklist.map(item => {
      switch(item.id) {
        case 1: // Check-ins
          if (pendingCheckIns.length > 0) {
            issues.push(`❌ ${pendingCheckIns.length} Check-in დასასრულებელი`)
            // Only auto-update if not manually completed
            if (!item.completed) {
              return { ...item, completed: false }
            }
          } else {
            // Auto-complete if no pending
            return { ...item, completed: true }
          }
          return item
          
        case 2: // Check-outs
          if (pendingCheckOuts.length > 0) {
            issues.push(`❌ ${pendingCheckOuts.length} Check-out დასასრულებელი`)
            // Only auto-update if not manually completed
            if (!item.completed) {
              return { ...item, completed: false }
            }
          } else {
            // Auto-complete if no pending
            return { ...item, completed: true }
          }
          return item
          
        case 5: // Housekeeping
          if (roomsNeedCleaning.length > 0) {
            issues.push(`⚠️ ${roomsNeedCleaning.length} ოთახი დასასუფთავებელი`)
            // Only auto-update if not manually completed
            if (!item.completed) {
              return { ...item, completed: false }
            }
          } else {
            // Auto-complete if no pending
            return { ...item, completed: true }
          }
          return item
          
        case 6: // No-shows
          if (noShows.length > 0) {
            issues.push(`⚠️ ${noShows.length} No-show დასამუშავებელი`)
            // Only auto-update if not manually completed
            if (!item.completed) {
              return { ...item, completed: false }
            }
          } else {
            // Auto-complete if no pending
            return { ...item, completed: true }
          }
          return item
          
        case 7: // Tomorrow's reservations
          // Auto-complete
          return { ...item, completed: true }
          
        default:
          return item
      }
    })
    
    setChecklist(updated)
    
    // Show blocking issues
    setBlockingIssues(issues)
  }
  
  useEffect(() => {
    runAutoChecks()
    // Check if current date is already closed
    if (isDayAlreadyClosed(auditDate)) {
      setAuditStatus('completed')
    } else {
      setAuditStatus('pending')
    }
  }, [auditDate])
  
  const toggleChecklistItem = (id: number) => {
    setChecklist(prev => prev.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ))
  }
  
  const calculateProgress = () => {
    const completed = checklist.filter(item => item.completed).length
    const total = checklist.length
    return {
      percentage: Math.round((completed / total) * 100),
      completed,
      total
    }
  }
  
  const canCloseDay = () => {
    return checklist.every(item => item.completed)
  }
  
  const closeDay = async () => {
    // Check if system is already locked
    if (SystemLockService.isLocked()) {
      alert('⚠️ სისტემა უკვე დაბლოკილია! სხვა პროცესი მიმდინარეობს.')
      return
    }
    
    // Re-run checks to ensure current state
    runAutoChecks()
    
    // 1. Check if trying to close today
    const today = moment().format('YYYY-MM-DD')
    const selectedDate = moment(auditDate).format('YYYY-MM-DD')
    
    if (selectedDate === today) {
      alert(`❌ დღევანდელ დღეს (${moment(today).format('DD/MM/YYYY')}) ვერ დახურავთ!\n\nმხოლოდ გუშინდელი ან უფრო ძველი დღეები შეიძლება დაიხუროს.\n\nგუშინ იყო: ${moment().subtract(1, 'day').format('DD/MM/YYYY')}`)
      return
    }
    
    // 2. Check if trying to close future date
    if (moment(auditDate).isAfter(moment())) {
      alert('❌ მომავალი თარიღის დახურვა შეუძლებელია!')
      return
    }
    
    // 3. Check if day already closed
    if (isDayAlreadyClosed(auditDate)) {
      alert(`❌ ${moment(auditDate).format('DD/MM/YYYY')} უკვე დახურულია!\nერთი დღე მხოლოდ ერთხელ იხურება.`)
      return
    }
    
    // 4. Check sequential closing
    const sequential = checkSequentialClosing()
    if (!sequential.valid) {
      alert(sequential.message)
      return
    }
    
    // 5. Validate all operations
    const errors = validateDayCanBeClosed()
    
    if (errors.length > 0) {
      alert(`🚫 დღე ვერ დაიხურება!\n\nპრობლემები:\n${errors.join('\n\n')}\n\nგთხოვთ დაასრულოთ ყველა ოპერაცია.`)
      return
    }
    
    // 6. Check checklist
    if (!checklist.every(item => item.completed)) {
      alert('❌ ყველა checklist პუნქტი უნდა იყოს მონიშნული!')
      return
    }
    
    // 7. Check cashier shift (enterprise feature)
    const cashierShift = JSON.parse(localStorage.getItem('currentCashierShift') || 'null')
    if (cashierShift && cashierShift.status === 'open') {
      alert('⚠️ გთხოვთ დახურეთ სალარო Night Audit-ის დაწყებამდე')
      return
    }
    
    // 8. Process pending checkouts with folio generation (enterprise feature)
    const checkoutResults = processPendingCheckouts()
    
    // 9. Process No-Shows with charges
    const noShowCount = await processNoShows()
    
    // 10. Calculate statistics
    const dayStats = calculateDayStatistics()
    
    // 11. Generate reports (enterprise feature)
    const reports = await generateReports()
    
    // Get current user early
    const currentUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('currentUser') || '{"name":"admin","role":"admin"}') : { name: 'admin', role: 'admin' }
    
    // 11a. Generate PDF report
    let pdfBlob: Blob | null = null
    try {
      const pdfData = {
        ...dayStats,
        ...reports,
        totalRooms: dayStats.totalRooms,
        occupiedRooms: dayStats.occupiedRooms,
        vacantRooms: dayStats.totalRooms - dayStats.occupiedRooms,
        outOfOrderRooms: rooms.filter((r: any) => r.status === 'MAINTENANCE').length,
        occupancyRate: dayStats.occupancyRate,
        checkIns: dayStats.totalCheckIns,
        checkOuts: dayStats.totalCheckOuts,
        noShows: noShowCount,
        cancellations: dayStats.cancellations,
        roomRevenue: dayStats.totalRevenue,
        totalRevenue: dayStats.totalRevenue,
        auditUser: currentUser?.name || 'System',
        pendingFolios: checkoutResults.foliosGenerated
      }
      
      pdfBlob = await generatePDFReport(pdfData, auditDate)
      
      // Save PDF URL for download
      const pdfUrl = URL.createObjectURL(pdfBlob)
      localStorage.setItem(`audit-pdf-${auditDate}`, pdfUrl)
      
      console.log('✅ PDF report generated successfully')
    } catch (error) {
      console.error('❌ PDF generation failed:', error)
      // Don't block audit completion if PDF fails
    }
    
    // 11b. Send email report (if enterprise mode and PDF generated)
    if (enterpriseMode && pdfBlob) {
      try {
        await sendEmailReport(pdfBlob, auditDate)
        console.log('✅ Email report queued successfully')
      } catch (error) {
        console.error('❌ Email sending failed:', error)
        // Don't block audit completion if email fails
      }
    }
    
    // 12. Final confirmation with stats
    // Show PDF download option if generated
    const pdfDownloadMessage = pdfBlob 
      ? `\n\n📄 PDF რეპორტი გენერირებულია და ჩამოტვირთვა შესაძლებელია.`
      : ''
    
    if (!confirm(
      `დღის დახურვა: ${moment(auditDate).format('DD/MM/YYYY')}\n\n` +
      `📊 სტატისტიკა:\n` +
      `• Check-ins: ${dayStats.totalCheckIns}\n` +
      `• Check-outs: ${dayStats.totalCheckOuts}\n` +
      `• Folios Generated: ${checkoutResults.foliosGenerated.length}\n` +
      `• შემოსავალი: ₾${dayStats.totalRevenue}\n` +
      `• დატვირთულობა: ${dayStats.occupancyRate}%\n` +
      `• No-shows: ${noShowCount}${pdfDownloadMessage}\n\n` +
      `დარწმუნებული ხართ?`
    )) {
      return
    }
    
    // Lock system
    try {
      SystemLockService.lock(currentUser?.name || 'admin', 'Night Audit in Progress')
      setAuditInProgress(true)
      
      // Save comprehensive audit log
      const auditLog = {
        id: Date.now(),
        date: auditDate,
        closedAt: new Date().toISOString(),
        closedBy: currentUser?.name || 'admin',
        stats: dayStats,
        checklist: checklist,
        noShowsProcessed: noShowCount,
        checkoutsProcessed: checkoutResults.processed,
        foliosGenerated: checkoutResults.foliosGenerated.length,
        reports: reports
      }
      
      const audits = JSON.parse(localStorage.getItem('nightAudits') || '[]')
      audits.push(auditLog)
      localStorage.setItem('nightAudits', JSON.stringify(audits))
      localStorage.setItem('lastAuditDate', JSON.stringify(auditDate))
      
      // Activity log
      ActivityLogger.log('NIGHT_AUDIT', {
        date: auditDate,
        revenue: dayStats.totalRevenue,
        occupancy: dayStats.occupancyRate,
        checkIns: dayStats.totalCheckIns,
        checkOuts: dayStats.totalCheckOuts,
        noShows: noShowCount
      })
      
      // Unlock and reload
      setTimeout(() => {
        SystemLockService.unlock()
        const successMessage = pdfBlob 
          ? '✅ დღე წარმატებით დაიხურა!\n\n📄 PDF რეპორტი გენერირებულია.'
          : '✅ დღე წარმატებით დაიხურა!'
        alert(successMessage)
        location.reload()
      }, 1000)
    } catch (error) {
      console.error('Error during audit:', error)
      alert('❌ შეცდომა დღის დახურვისას')
      SystemLockService.unlock()
      setAuditInProgress(false)
    }
  }
  
  const generateDailyReport = () => {
    const report = {
      date: auditDate,
      revenue: stats.revenue,
      occupancy: stats.occupancyRate,
      checkIns: stats.checkIns,
      checkOuts: stats.checkOuts,
      timestamp: moment().format('DD/MM/YYYY HH:mm')
    }
    
    console.log('Daily Report:', report)
    // Could download as PDF or save to database
  }
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">🌙 დღის დახურვა</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <label className="text-sm font-medium">აირჩიეთ დახურვის თარიღი:</label>
            <input
              type="date"
              value={auditDate}
              onChange={(e) => {
                const newDate = e.target.value
                if (isDayAlreadyClosed(newDate)) {
                  alert('ეს დღე უკვე დახურულია!')
                  return
                }
                setAuditDate(newDate)
                setAuditStatus('pending')
              }}
              className="border rounded px-3 py-2"
            />
            {isDayAlreadyClosed(auditDate) && (
              <span className="text-red-600 font-bold">✓ უკვე დახურულია</span>
            )}
            {localStorage.getItem('lastAuditDate') && (
              <span className="text-sm text-gray-500">
                ბოლო დახურვა: {(() => {
                  try {
                    return moment(JSON.parse(localStorage.getItem('lastAuditDate') || '""')).format('DD/MM/YYYY')
                  } catch {
                    return 'N/A'
                  }
                })()}
              </span>
            )}
          </div>
          <span className={`px-3 py-1 rounded ${
            auditStatus === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
          }`}>
            {auditStatus === 'completed' ? 'დახურულია' : 'მიმდინარე'}
          </span>
        </div>
      </div>
      
      {/* Day Status Info Panel */}
      <div className="bg-blue-50 rounded-lg p-4 mb-4">
        <h4 className="font-bold mb-2">📊 დღის სტატუსი - {moment(auditDate).format('DD/MM/YYYY')}</h4>
        
        {/* Today's operations */}
        <div className="grid grid-cols-3 gap-4 mb-3">
          <div>
            <span className="text-sm text-gray-600">დღევანდელი Check-in:</span>
            <div className="font-bold text-lg">
              {reservations.filter((r: any) => 
                moment(r.checkIn).format('YYYY-MM-DD') === auditDate
              ).length}
            </div>
          </div>
          <div>
            <span className="text-sm text-gray-600">დღევანდელი Check-out:</span>
            <div className="font-bold text-lg">
              {reservations.filter((r: any) => 
                moment(r.checkOut).format('YYYY-MM-DD') === auditDate
              ).length}
            </div>
          </div>
          <div>
            <span className="text-sm text-gray-600">აგრძელებენ დარჩენას:</span>
            <div className="font-bold text-lg text-blue-600">
              {reservations.filter((r: any) => {
                const checkIn = moment(r.checkIn)
                const checkOut = moment(r.checkOut)
                return r.status === 'CHECKED_IN' && 
                       checkIn.isSameOrBefore(auditDate, 'day') && 
                       checkOut.isAfter(auditDate, 'day')
              }).length}
            </div>
          </div>
        </div>
        
        {/* Payment info */}
        <div className="text-sm text-gray-600 mt-2">
          ⚠️ შენიშვნა: მრავალდღიანი სტუმრების გადახდა მოწმდება მხოლოდ Check-out დღეს
        </div>
      </div>
      
      {/* Operations Status */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <h3 className="font-bold mb-2">✅ ოპერაციების სტატუსი</h3>
        {(() => {
          const errors = validateDayCanBeClosed()
          if (errors.length === 0) {
            return <p className="text-green-600">✅ ყველა ოპერაცია დასრულებულია</p>
          }
            return (
              <div className="space-y-3">
                <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                  <h4 className="text-red-700 font-bold mb-3">🚫 დღე ვერ დაიხურება - დაუსრულებელი ოპერაციები:</h4>
                  <div className="space-y-2">
                    {errors.map((error, idx) => {
                      // Check if error is about housekeeping
                      const isHousekeepingError = error.includes('დასასუფთავებელი') || error.includes('housekeeping') || error.includes('დასუფთავება') || error.includes('dirty')
                      
                      return (
                        <div key={idx} className="flex items-center justify-between gap-2">
                          <span className="text-red-600 whitespace-pre-line flex-1">{error}</span>
                          {isHousekeepingError && (
                            <button 
                              onClick={() => {
                                // Mark all rooms as clean
                                const rooms = JSON.parse(localStorage.getItem('hotelRooms') || '[]')
                                let updated = false
                                
                                rooms.forEach((room: any) => {
                                  if (room.status === 'DIRTY' || room.status === 'dirty' || room.cleaningStatus === 'pending' || room.status === 'Dirty') {
                                    room.status = 'VACANT'
                                    room.cleaningStatus = 'clean'
                                    updated = true
                                  }
                                })
                                
                                if (updated) {
                                  localStorage.setItem('hotelRooms', JSON.stringify(rooms))
                                  
                                  // Also update housekeeping tasks
                                  const tasks = JSON.parse(localStorage.getItem('housekeepingTasks') || '[]')
                                  const today = moment(auditDate).format('YYYY-MM-DD')
                                  tasks.forEach((task: any) => {
                                    if (moment(task.date || task.createdAt).format('YYYY-MM-DD') === today && task.status !== 'completed') {
                                      task.status = 'completed'
                                      task.completedAt = new Date().toISOString()
                                    }
                                  })
                                  localStorage.setItem('housekeepingTasks', JSON.stringify(tasks))
                                  
                                  alert('✅ ოთახები მონიშნულია როგორც დასუფთავებული')
                                  window.location.reload()
                                } else {
                                  alert('ℹ️ დასუფთავებელი ოთახები არ მოიძებნა')
                                }
                              }}
                              className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 whitespace-nowrap"
                            >
                              ✓ დასუფთავებულია
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
        })()}
      </div>
      
      {/* Admin Override Panel */}
      <AuditOverridePanel auditDate={auditDate} />
      
      {/* Enterprise Mode Toggle */}
      <div className="bg-white rounded-lg shadow p-4 mt-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold">🚀 Enterprise Mode</h3>
            <p className="text-sm text-gray-600">Advanced features: Folio generation, Cashier integration, Reports</p>
          </div>
          <button
            onClick={() => setEnterpriseMode(!enterpriseMode)}
            className={`px-4 py-2 rounded transition ${
              enterpriseMode 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            {enterpriseMode ? '✅ Enabled' : 'Enable'}
          </button>
        </div>
      </div>
      
      {/* Auto Close Button */}
      <div className="bg-white rounded-lg shadow p-4 mt-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold">🤖 Auto Night Audit</h3>
            <p className="text-sm text-gray-600">ავტომატური დახურვა progress bars-ით</p>
          </div>
          <button
            onClick={() => setShowAutoClose(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 font-medium"
          >
            🚀 Auto Close
          </button>
        </div>
      </div>
      
      {/* Auto Close Modal */}
      {showAutoClose && (
        <NightAuditAutoClose 
          onComplete={() => {
            setShowAutoClose(false)
            alert('✅ Night Audit დასრულებულია!')
            window.location.reload()
          }}
        />
      )}
      
      {/* Enterprise Modules */}
      {enterpriseMode && (
        <div className="space-y-4 mt-4">
          <CashierModule />
          <FolioSystem />
          
          {/* Auto Night Audit for Missed Days */}
          <div className="bg-yellow-50 rounded-lg p-4">
            <h4 className="font-bold mb-2">⚠️ Missed Days Check</h4>
            <button
              onClick={autoNightAudit}
              className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
            >
              Check & Process Missed Days
            </button>
          </div>
        </div>
      )}
      
      {/* Statistics Cards */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-gray-500 text-sm">დღიური შემოსავალი</div>
          <div className="text-2xl font-bold text-green-600">₾{stats.revenue}</div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-gray-500 text-sm">Check-in</div>
          <div className="text-2xl font-bold">{stats.checkIns}</div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-gray-500 text-sm">Check-out</div>
          <div className="text-2xl font-bold">{stats.checkOuts}</div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-gray-500 text-sm">დატვირთულობა</div>
          <div className="text-2xl font-bold">{stats.occupancyRate}%</div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-gray-500 text-sm">No-show</div>
          <div className="text-2xl font-bold text-red-600">{stats.noShows}</div>
        </div>
      </div>
      
      {/* Blocking Issues Alert */}
      {blockingIssues.length > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-6">
          <h3 className="text-red-700 font-bold mb-3">
            🚫 დღე ვერ დაიხურება - დაუსრულებელი ოპერაციები:
          </h3>
          <div className="space-y-2">
            {blockingIssues.map((issue, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-red-600">{issue}</span>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <p className="text-sm text-red-600 mb-2">
              გთხოვთ გადახვიდეთ კალენდარზე და დაასრულოთ დაუსრულებელი Check-in/Check-out ოპერაციები.
            </p>
          </div>
        </div>
      )}
      
      {/* Pending Operations - Interactive Section */}
      <PendingOperationsSection 
        auditDate={auditDate}
        reservations={reservations}
        rooms={rooms}
        onRefresh={() => {
          // Refresh blocking issues
          const errors = validateDayCanBeClosed()
          setBlockingIssues(errors)
        }}
      />
      
      {/* Progress Bar Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-bold mb-4">📊 დახურვის პროგრესი</h3>
        
        {/* Main Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">
              შესრულებული: {calculateProgress().completed} / {calculateProgress().total}
            </span>
            <span className="text-lg font-bold">
              {calculateProgress().percentage}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-8 relative overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                checklist.every(item => item.completed) ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ 
                width: `${calculateProgress().percentage}%` 
              }}
            />
          </div>
        </div>
        
        {/* Manual Checklist - Visible and Functional */}
        <div className="space-y-2 mt-4">
          {checklist.map(item => (
            <label 
              key={item.id} 
              className="flex items-center gap-3 p-2 cursor-pointer hover:bg-gray-50 rounded"
            >
              <input
                type="checkbox"
                checked={item.completed}
                onChange={() => {
                  setChecklist(prev => prev.map(c => 
                    c.id === item.id ? { ...c, completed: !c.completed } : c
                  ))
                }}
                disabled={auditStatus === 'completed'}
                className="w-5 h-5 cursor-pointer"
              />
              <span className={`text-sm flex-1 ${item.completed ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                {item.task}
              </span>
            </label>
          ))}
        </div>
        
        {/* Mark All Complete Helper Button */}
        {!checklist.every(item => item.completed) && auditStatus !== 'completed' && (
          <div className="mt-4">
            <button
              onClick={() => {
                setChecklist(prev => prev.map(item => ({ ...item, completed: true })))
              }}
              className="text-blue-600 hover:underline text-sm"
            >
              ✓ ყველას მონიშვნა
            </button>
          </div>
        )}
      </div>
      
      {/* Room Status Summary */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-bold mb-4">🏨 ოთახების სტატუსი</h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{stats.vacant}</div>
            <div className="text-sm text-gray-500">თავისუფალი</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600">{stats.occupied}</div>
            <div className="text-sm text-gray-500">დაკავებული</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-600">
              {rooms.filter((r: any) => r.status === 'CLEANING').length}
            </div>
            <div className="text-sm text-gray-500">დასუფთავება</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-600">
              {rooms.filter((r: any) => r.status === 'MAINTENANCE').length}
            </div>
            <div className="text-sm text-gray-500">რემონტი</div>
          </div>
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex justify-between items-center">
        <button 
          className="px-4 py-2 border rounded hover:bg-gray-50"
          onClick={generateDailyReport}
        >
          📥 რეპორტის ჩამოტვირთვა
        </button>
        
        <div className="flex gap-3">
          <button 
            className={`px-6 py-2 rounded font-medium ${
              canCloseDay() 
                ? 'bg-green-600 text-white hover:bg-green-700' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            onClick={closeDay}
            disabled={!canCloseDay() || auditStatus === 'completed'}
          >
            🌙 დღის დახურვა
          </button>
        </div>
      </div>
      
      {/* Previous Audits */}
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold mb-4">📅 წინა დახურვები</h3>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">თარიღი</th>
              <th className="p-2 text-right">შემოსავალი</th>
              <th className="p-2 text-center">დატვირთულობა</th>
              <th className="p-2 text-center">Check-in/out</th>
              <th className="p-2 text-right">დახურვის დრო</th>
            </tr>
          </thead>
          <tbody>
            {JSON.parse(localStorage.getItem('nightAudits') || '[]')
              .slice(-5)
              .reverse()
              .map((audit: any, idx: number) => (
                <tr key={idx} className="border-t">
                  <td className="p-2">{moment(audit.date).format('DD/MM/YYYY')}</td>
                  <td className="p-2 text-right">₾{audit.stats?.revenue || 0}</td>
                  <td className="p-2 text-center">{audit.stats?.occupancyRate || 0}%</td>
                  <td className="p-2 text-center">
                    {audit.stats?.checkIns || 0}/{audit.stats?.checkOuts || 0}
                  </td>
                  <td className="p-2 text-right text-sm text-gray-500">
                    {moment(audit.closedAt).format('HH:mm')}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Pending Operations Section Component with Modals
function PendingOperationsSection({ auditDate, reservations, rooms, onRefresh }: {
  auditDate: string
  reservations: any[]
  rooms: any[]
  onRefresh: () => void
}) {
  const [expandedSection, setExpandedSection] = useState<'checkout' | 'checkin' | null>(null)
  
  // Check-Out Modal State
  const [showCheckOutModal, setShowCheckOutModal] = useState(false)
  const [checkOutReservation, setCheckOutReservation] = useState<any>(null)
  
  // Check-In Modal State
  const [showCheckInProcessModal, setShowCheckInProcessModal] = useState(false)
  const [checkInReservation, setCheckInReservation] = useState<any>(null)

  // Get pending check-outs (CHECKED_IN with checkOut <= auditDate)
  const pendingCheckOuts = reservations.filter((r: any) => {
    const checkOutDate = moment(r.checkOut).format('YYYY-MM-DD')
    return r.status === 'CHECKED_IN' && 
           moment(checkOutDate).isSameOrBefore(auditDate, 'day') &&
           r.status !== 'CANCELLED'
  })

  // Get pending check-ins (CONFIRMED with checkIn === auditDate)
  const pendingCheckIns = reservations.filter((r: any) => {
    const checkInDate = moment(r.checkIn).format('YYYY-MM-DD')
    return r.status === 'CONFIRMED' && checkInDate === auditDate
  })

  // Get folio balance for a reservation
  const getFolioBalance = (reservationId: string) => {
    if (typeof window === 'undefined') return 0
    const folios = JSON.parse(localStorage.getItem('hotelFolios') || '[]')
    const folio = folios.find((f: any) => f.reservationId === reservationId)
    return folio?.balance || 0
  }

  // Create folio for reservation (same logic as Dashboard)
  const createFolioForReservation = (reservation: any) => {
    const nights = moment(reservation.checkOut).diff(moment(reservation.checkIn), 'days') || 1
    const roomRate = reservation.totalAmount ? reservation.totalAmount / nights : 150
    
    const transactions: any[] = []
    
    // Pre-post room charges for all nights
    for (let i = 0; i < nights; i++) {
      const chargeDate = moment(reservation.checkIn).add(i, 'days')
      transactions.push({
        id: `CHG-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
        date: chargeDate.format('YYYY-MM-DD'),
        time: '23:59:59',
        type: 'charge',
        category: 'room',
        description: `ოთახის ღირებულება - ღამე ${i + 1}`,
        debit: roomRate,
        credit: 0,
        balance: roomRate * (i + 1),
        postedBy: 'System (Reservation)',
        postedAt: moment().format(),
        referenceId: `ROOM-${reservation.id}-${chargeDate.format('YYYY-MM-DD')}`,
        nightAuditDate: chargeDate.format('YYYY-MM-DD'),
        prePosted: true
      })
    }
    
    const newFolio = {
      id: `FOLIO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      folioNumber: `F${moment().format('YYMMDD')}-${reservation.roomNumber || reservation.roomId}-${reservation.id}`,
      reservationId: reservation.id,
      guestName: reservation.guestName,
      roomNumber: reservation.roomNumber || reservation.roomId,
      balance: roomRate * nights,
      creditLimit: 5000,
      paymentMethod: 'cash',
      status: 'open',
      openDate: moment().format('YYYY-MM-DD'),
      transactions,
      initialRoomCharge: {
        rate: roomRate,
        totalAmount: roomRate * nights,
        nights,
        allNightsPosted: true
      }
    }
    
    // Save to localStorage
    const existingFolios = JSON.parse(localStorage.getItem('hotelFolios') || '[]')
    existingFolios.push(newFolio)
    localStorage.setItem('hotelFolios', JSON.stringify(existingFolios))
    
    return newFolio
  }

  // Handle Check-In
  const handleCheckIn = async (reservation: any) => {
    try {
      // Create folio
      const newFolio = createFolioForReservation(reservation)
      
      // Update reservation status
      const response = await fetch(`/api/hotel/reservations/${reservation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...reservation,
          status: 'CHECKED_IN',
          actualCheckIn: new Date().toISOString()
        })
      })
      
      if (response.ok) {
        // Update room status
        await fetch('/api/hotel/rooms/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId: reservation.roomNumber || reservation.roomId, status: 'OCCUPIED' })
        })
        
        alert(`✅ ${reservation.guestName} - Check-in წარმატებით დასრულდა!\n\nFolio #${newFolio.folioNumber} შეიქმნა.`)
        
        setShowCheckInProcessModal(false)
        setCheckInReservation(null)
        onRefresh()
        window.location.reload()
      }
    } catch (error) {
      console.error('Check-in error:', error)
      alert('შეცდომა Check-in-ისას')
    }
  }

  // Handle No-Show
  const handleNoShow = async (reservation: any) => {
    if (!confirm(`მართლა გსურთ "${reservation.guestName}" მონიშვნა როგორც No-Show?\n\nეს გამოიწვევს ჯავშნის გაუქმებას.`)) {
      return
    }

    try {
      const response = await fetch(`/api/hotel/reservations/${reservation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...reservation,
          status: 'NO_SHOW',
          noShowDate: new Date().toISOString()
        })
      })

      if (response.ok) {
        alert('✅ No-Show დამუშავებულია')
        onRefresh()
        window.location.reload()
      }
    } catch (error) {
      console.error('No-show error:', error)
      alert('შეცდომა No-Show დამუშავებისას')
    }
  }

  if (pendingCheckOuts.length === 0 && pendingCheckIns.length === 0) {
    return null
  }

  return (
    <>
      <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4 mb-6">
        <h3 className="text-orange-700 font-bold mb-4 flex items-center gap-2">
          ⚠️ დაუსრულებელი ოპერაციები - დაასრულეთ აქვე!
        </h3>

        {/* Pending Check-Outs */}
        {pendingCheckOuts.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => setExpandedSection(expandedSection === 'checkout' ? null : 'checkout')}
              className="w-full flex items-center justify-between p-3 bg-red-100 rounded-lg hover:bg-red-200 transition"
            >
              <span className="font-bold text-red-700 flex items-center gap-2">
                🚪 {pendingCheckOuts.length} დაუსრულებელი Check-out
                <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded">BLOCKING</span>
              </span>
              <span className="text-xl">{expandedSection === 'checkout' ? '▲' : '▼'}</span>
            </button>
            
            {expandedSection === 'checkout' && (
              <div className="mt-2 space-y-2 p-3 bg-white rounded-lg border border-red-200">
                {pendingCheckOuts.map((reservation: any) => {
                  const balance = getFolioBalance(reservation.id)
                  return (
                    <div 
                      key={reservation.id}
                      className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-red-600 text-white rounded-lg flex items-center justify-center font-bold">
                          {reservation.roomNumber || reservation.roomId}
                        </div>
                        <div>
                          <div className="font-bold">{reservation.guestName}</div>
                          <div className="text-sm text-gray-600">
                            Check-out: {moment(reservation.checkOut).format('DD/MM/YYYY')}
                            {moment(reservation.checkOut).isBefore(auditDate, 'day') && (
                              <span className="text-red-600 ml-2">⚠️ დაგვიანებული!</span>
                            )}
                          </div>
                          <div className={`text-sm ${balance > 0 ? 'text-red-600 font-medium' : 'text-green-600'}`}>
                            {balance > 0 ? `₾${balance.toFixed(2)} გადასახდელი` : '✅ გადახდილია'}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setCheckOutReservation(reservation)
                          setShowCheckOutModal(true)
                        }}
                        className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition font-medium flex items-center gap-2"
                      >
                        📤 Check-Out
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Pending Check-Ins */}
        {pendingCheckIns.length > 0 && (
          <div>
            <button
              onClick={() => setExpandedSection(expandedSection === 'checkin' ? null : 'checkin')}
              className="w-full flex items-center justify-between p-3 bg-yellow-100 rounded-lg hover:bg-yellow-200 transition"
            >
              <span className="font-bold text-yellow-700 flex items-center gap-2">
                📥 {pendingCheckIns.length} დაუსრულებელი Check-in
                <span className="text-xs bg-yellow-600 text-white px-2 py-0.5 rounded">BLOCKING</span>
              </span>
              <span className="text-xl">{expandedSection === 'checkin' ? '▲' : '▼'}</span>
            </button>
            
            {expandedSection === 'checkin' && (
              <div className="mt-2 space-y-2 p-3 bg-white rounded-lg border border-yellow-200">
                {pendingCheckIns.map((reservation: any) => {
                  const nights = moment(reservation.checkOut).diff(moment(reservation.checkIn), 'days') || 1
                  return (
                    <div 
                      key={reservation.id}
                      className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-600 text-white rounded-lg flex items-center justify-center font-bold">
                          {reservation.roomNumber || reservation.roomId}
                        </div>
                        <div>
                          <div className="font-bold">{reservation.guestName}</div>
                          <div className="text-sm text-gray-600">
                            Check-in: {moment(reservation.checkIn).format('DD/MM/YYYY')} → {moment(reservation.checkOut).format('DD/MM/YYYY')}
                          </div>
                          <div className="text-sm text-gray-500">
                            {nights} ღამე • ₾{reservation.totalAmount || nights * 150}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setCheckInReservation(reservation)
                            setShowCheckInProcessModal(true)
                          }}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium flex items-center gap-2"
                        >
                          ✅ Check-In
                        </button>
                        <button
                          onClick={() => handleNoShow(reservation)}
                          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition font-medium"
                        >
                          ❌ No-Show
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Check-In Process Modal */}
      {showCheckInProcessModal && checkInReservation && (() => {
        const nights = moment(checkInReservation.checkOut).diff(moment(checkInReservation.checkIn), 'days') || 1
        const roomCharge = checkInReservation.totalAmount || (nights * 150)
        
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg w-full max-w-xl">
              {/* Header */}
              <div className="flex justify-between items-center p-4 border-b bg-green-500 text-white rounded-t-lg">
                <div>
                  <h2 className="text-xl font-bold">✅ Check-In Process</h2>
                  <p className="text-green-100">{checkInReservation.guestName} - Room {checkInReservation.roomNumber || checkInReservation.roomId}</p>
                </div>
                <button 
                  onClick={() => {
                    setShowCheckInProcessModal(false)
                    setCheckInReservation(null)
                  }}
                  className="text-2xl text-white hover:text-green-200"
                >
                  ×
                </button>
              </div>
              
              {/* Reservation Details */}
              <div className="p-4 border-b">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-500 text-sm">Check-in</p>
                    <p className="font-medium">{moment(checkInReservation.checkIn).format('DD/MM/YYYY')}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Check-out</p>
                    <p className="font-medium">{moment(checkInReservation.checkOut).format('DD/MM/YYYY')}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">ღამეები</p>
                    <p className="font-medium">{nights}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">ოთახის ტიპი</p>
                    <p className="font-medium">{checkInReservation.roomType || 'Standard'}</p>
                  </div>
                </div>
              </div>
              
              {/* Folio Preview */}
              <div className="p-4 border-b">
                <h3 className="font-medium mb-3">📋 Folio შეიქმნება</h3>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex justify-between mb-2">
                    <span>ოთახის ღირებულება ({nights} ღამე)</span>
                    <span>₾{roomCharge.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-2">
                    <span>სულ</span>
                    <span>₾{roomCharge.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              
              {/* Info */}
              <div className="p-4 border-b">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-blue-700">
                    <strong>ℹ️ Check-in-ის შემდეგ:</strong>
                  </p>
                  <ul className="text-blue-600 text-sm mt-1 list-disc list-inside">
                    <li>ოთახი {checkInReservation.roomNumber || checkInReservation.roomId} გახდება OCCUPIED</li>
                    <li>შეიქმნება Folio ღამის ღირებულებით</li>
                    <li>გადახდა შესაძლებელია Check-out-ის დროს</li>
                  </ul>
                </div>
              </div>
              
              {/* Actions */}
              <div className="p-4 flex gap-3">
                <button
                  onClick={() => {
                    setShowCheckInProcessModal(false)
                    setCheckInReservation(null)
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  გაუქმება
                </button>
                
                <button
                  onClick={() => handleCheckIn(checkInReservation)}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium"
                >
                  ✅ Check-in
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Check-Out Modal */}
      {showCheckOutModal && checkOutReservation && (
        <CheckOutModal
          reservation={checkOutReservation}
          onClose={() => {
            setShowCheckOutModal(false)
            setCheckOutReservation(null)
          }}
          onCheckOut={() => {
            setShowCheckOutModal(false)
            setCheckOutReservation(null)
            onRefresh()
            window.location.reload()
          }}
        />
      )}
    </>
  )
}