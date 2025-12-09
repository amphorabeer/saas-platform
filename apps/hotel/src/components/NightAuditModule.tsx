'use client'

import React, { useState, useEffect } from 'react'
import moment from 'moment'
import { PostingService } from '../services/PostingService'
import { PackagePostingService } from '../services/PackagePostingService'
import { FolioAutoCloseService } from '../services/FolioAutoCloseService'
import { FinancialReportsService } from '../services/FinancialReportsService'
import NightAuditPostingSummary from './NightAuditPostingSummary'
import CheckOutModal from './CheckOutModal'
import { calculateTaxBreakdown } from '../utils/taxCalculator'

// ============================================
// Reusable Report Header Component
// ============================================
const ReportHeader = ({ 
  reportTitle, 
  date,
  showDate = true
}: { 
  reportTitle: string; 
  date?: string;
  showDate?: boolean;
}) => {
  const [hotelInfo, setHotelInfo] = useState({
    name: 'Hotel',
    logo: '',
    address: ''
  })
  
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const saved = localStorage.getItem('hotelInfo')
    if (saved) {
      try {
        const data = JSON.parse(saved)
        setHotelInfo({
          name: data.name || data.hotelName || data.companyName || 'Hotel',
          logo: data.logo || data.logoUrl || '',
          address: data.address || ''
        })
      } catch (e) {
        console.error('Error loading hotel info:', e)
      }
    }
  }, [])
  
  return (
    <div className="text-center border-b pb-4 mb-4">
      {/* Logo */}
      {hotelInfo.logo ? (
        <img 
          src={hotelInfo.logo} 
          alt={hotelInfo.name} 
          className="h-16 mx-auto mb-2"
          onError={(e) => {
            // Fallback to emoji if image fails to load
            const target = e.target as HTMLImageElement
            target.style.display = 'none'
            const fallback = target.nextElementSibling as HTMLElement
            if (fallback) fallback.style.display = 'block'
          }}
        />
      ) : null}
      {!hotelInfo.logo && (
        <div className="text-4xl mb-2">🏨</div>
      )}
      
      {/* Hotel Name */}
      <h1 className="text-2xl font-bold">{hotelInfo.name}</h1>
      
      {/* Address (optional) */}
      {hotelInfo.address && (
        <p className="text-sm text-gray-500 mt-1">{hotelInfo.address}</p>
      )}
      
      {/* Report Title */}
      <h2 className="text-lg font-medium mt-3">{reportTitle}</h2>
      
      {/* Date */}
      {showDate && date && (
        <p className="text-gray-500 text-sm mt-1">{moment(date).format('DD MMMM YYYY')}</p>
      )}
    </div>
  )
}

// Helper function to get next audit date
const getNextAuditDate = (): string => {
  if (typeof window === 'undefined') {
    return moment().subtract(1, 'day').format('YYYY-MM-DD')
  }
  
  // Check last completed audit date
  const lastAuditDate = localStorage.getItem('lastNightAuditDate')
  const audits = JSON.parse(localStorage.getItem('nightAudits') || '[]')
  
  // Find the most recent completed audit
  const completedAudits = audits
    .filter((a: any) => a.status === 'completed' && !a.reversed)
    .sort((a: any, b: any) => moment(b.date).valueOf() - moment(a.date).valueOf())
  
  const lastCompletedDate = completedAudits.length > 0 
    ? completedAudits[0].date 
    : lastAuditDate
  
  if (lastCompletedDate) {
    const nextDate = moment(lastCompletedDate).add(1, 'day')
    const today = moment()
    
    // If next date is today or future, show yesterday (but it can't be closed yet)
    if (nextDate.isSameOrAfter(today, 'day')) {
      // Show yesterday as it's the latest closeable date
      return moment().subtract(1, 'day').format('YYYY-MM-DD')
    }
    
    // Return next unclosed date
    return nextDate.format('YYYY-MM-DD')
  }
  
  // No audit history - default to yesterday
  return moment().subtract(1, 'day').format('YYYY-MM-DD')
}

export default function NightAuditModule() {
  const [currentStep, setCurrentStep] = useState(0)
  const [isAuditRunning, setIsAuditRunning] = useState(false)
  const [showPreChecks, setShowPreChecks] = useState(true)
  const [auditLog, setAuditLog] = useState<string[]>([])
  const [selectedDate, setSelectedDate] = useState(getNextAuditDate())
  const [auditHistory, setAuditHistory] = useState<any[]>([])
  const [showUserWarning, setShowUserWarning] = useState(false)
  const [countdown, setCountdown] = useState(30)
  const [countdownInterval, setCountdownInterval] = useState<NodeJS.Timeout | null>(null)
  const [isCountdownActive, setIsCountdownActive] = useState(false)
  const [showReportDetails, setShowReportDetails] = useState<any>(null)
  const [isFirstAudit, setIsFirstAudit] = useState(true)
  
  // NEW: Enhanced features state
  const [showReverseModal, setShowReverseModal] = useState(false)
  const [reverseDate, setReverseDate] = useState<string | null>(null)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showManagerReport, setShowManagerReport] = useState(false)
  const [showPaymentReconciliation, setShowPaymentReconciliation] = useState(false)
  const [showTaxReport, setShowTaxReport] = useState(false)
  const [showZReport, setShowZReport] = useState(false)
  const [zReport, setZReport] = useState<any>(null)
  const [auditSettings, setAuditSettings] = useState({
    autoAuditTime: '02:00',
    emailRecipients: ['manager@hotel.com'],
    enableAutoAudit: false,
    sendEmailOnComplete: true,
    generatePdfOnComplete: true
  })

  // Lock key for preventing duplicate audits across tabs
  const AUDIT_LOCK_KEY = 'nightAuditInProgress'
  const AUDIT_LOCK_TIMEOUT = 5 * 60 * 1000 // 5 minutes max lock
  const [realStats, setRealStats] = useState({
    pendingCheckIns: [] as any[],
    pendingCheckOuts: [] as any[],
    dirtyRooms: [] as any[],
    unmarkedArrivals: [] as any[],
    totalRevenue: 0,
    occupiedRooms: 0,
    totalRooms: 15
  })
  
  // Hotel info state
  const [hotelInfo, setHotelInfo] = useState({
    name: 'Hotel',
    logo: '',
    address: '',
    phone: '',
    email: ''
  })
  
  // Load hotel info from Settings
  const loadHotelInfo = () => {
    if (typeof window === 'undefined') return
    
    const saved = localStorage.getItem('hotelInfo')
    if (saved) {
      try {
        const data = JSON.parse(saved)
        setHotelInfo({
          name: data.name || data.hotelName || data.companyName || 'Hotel',
          logo: data.logo || data.logoUrl || '',
          address: data.address || '',
          phone: data.phone || data.telephone || '',
          email: data.email || ''
        })
      } catch (e) {
        console.error('Error loading hotel info:', e)
      }
    }
  }
  
  // Load real calendar data
  useEffect(() => {
    // Only load data if audit is not running (prevent reload during audit)
    if (!isAuditRunning) {
      loadRealData()
      loadAuditHistory()
    }
  }, [selectedDate, isAuditRunning])
  
  // Load hotel info on mount
  useEffect(() => {
    loadHotelInfo()
  }, [])

  // Helper: Get last audit date with correct priority (same as getBusinessDay)
  const getLastAuditDate = (): string | null => {
    if (typeof window === 'undefined') return null
    
    // Priority 1: lastNightAuditDate (plain string YYYY-MM-DD)
    const lastNightAudit = localStorage.getItem('lastNightAuditDate')
    if (lastNightAudit) {
      return lastNightAudit
    }
    
    // Priority 2: lastAuditDate (may be JSON stringified)
    const legacyAudit = localStorage.getItem('lastAuditDate')
    if (legacyAudit) {
      try {
        // Try to parse if it's JSON
        const parsed = JSON.parse(legacyAudit)
        return typeof parsed === 'string' ? parsed : null
      } catch {
        // If not JSON, use as-is
        return legacyAudit
      }
    }
    
    return null
  }

  // Calculate check-ins and check-outs from folios
  const getCheckInOutCounts = (auditDate: string) => {
    if (typeof window === 'undefined') {
      return { checkIns: 0, checkOuts: 0 }
    }
    
    const folios = JSON.parse(localStorage.getItem('hotelFolios') || '[]')
    
    let checkIns = 0
    let checkOuts = 0
    
    folios.forEach((folio: any) => {
      // Check-in = folio openDate matches audit date
      const openDate = (folio.openDate || '').split('T')[0]
      if (openDate === auditDate) {
        checkIns++
      }
      
      // Check-out = folio closedDate matches audit date
      const closedDate = (folio.closedDate || '').split('T')[0]
      if (closedDate === auditDate) {
        checkOuts++
      }
    })
    
    return { checkIns, checkOuts }
  }

  // Calculate revenue from folios for a specific date
  const getRevenueFromFolios = (auditDate: string) => {
    if (typeof window === 'undefined') {
      return 0
    }
    
    const folios = JSON.parse(localStorage.getItem('hotelFolios') || '[]')
    let revenue = 0
    
    folios.forEach((folio: any) => {
      folio.transactions?.forEach((t: any) => {
        const txDate = (t.date || t.nightAuditDate || t.postedAt || '').split('T')[0]
        if (txDate === auditDate && t.type === 'charge' && t.category === 'room') {
          revenue += Number(t.debit || t.amount || 0)
        }
      })
    })
    
    return revenue
  }

  // Enrich posting results with amounts from folios when amount is 0
  const enrichPostingResultsWithAmounts = (postingResults: any[], auditDate: string) => {
    if (typeof window === 'undefined') return postingResults
    
    const folios = JSON.parse(localStorage.getItem('hotelFolios') || '[]')
    
    return postingResults.map(p => {
      // If amount is 0 but it was skipped/prePosted, get amount from folio
      if ((p.amount === 0 || !p.amount) && (p.prePosted || p.status === 'skipped')) {
        // Find the folio for this room/guest
        const folio = folios.find((f: any) => 
          (f.roomNumber === (p.roomNumber || p.room)) || 
          (f.guestName === (p.guestName || p.guest))
        )
        
        if (folio) {
          // Find room charges for the audit date
          const roomCharges = folio.transactions?.filter((t: any) => {
            const txDate = (t.date || t.nightAuditDate || t.postedAt || '').split('T')[0]
            const isRoomCharge = t.category === 'room' || 
                                 t.description?.toLowerCase().includes('ოთახ') ||
                                 t.description?.toLowerCase().includes('room charge') ||
                                 t.description?.toLowerCase().includes('room')
            return txDate === auditDate && isRoomCharge && (t.type === 'charge' || t.debit > 0)
          }) || []
          
          const totalAmount = roomCharges.reduce((sum: number, t: any) => 
            sum + (t.debit || t.amount || 0), 0)
          
          if (totalAmount > 0) {
            return {
              ...p,
              amount: totalAmount,
              status: 'posted' // Change status to 'posted' if amount found
            }
          }
        }
      }
      return p
    })
  }

  // ========== UNIFIED PDF GENERATOR ==========
  const generateAuditPDF = (auditData: any) => {
    const date = auditData.date || selectedDate
    // Calculate check-ins/check-outs from folios if not provided
    const counts = getCheckInOutCounts(date)
    const checkIns = auditData.checkIns || counts.checkIns || 0
    const checkOuts = auditData.checkOuts || counts.checkOuts || 0
    const noShows = auditData.noShows || 0
    // Calculate revenue from folios if not provided
    const revenue = auditData.revenue || auditData.totalRevenue || getRevenueFromFolios(date) || 0
    const occupancy = auditData.occupancy || 0
    const totalRooms = auditData.totalRooms || 15
    const occupiedRooms = auditData.occupiedRooms || Math.round((occupancy / 100) * totalRooms)
    const paymentsTotal = auditData.paymentsTotal || 0
    const roomChargesTotal = auditData.roomChargesTotal || auditData.roomChargeTotal || 0
    const operations = auditData.operations || []
    // Enrich postingResults with amounts from folios before using in PDF
    const rawPostingResults = auditData.postingResults || []
    const postingResults = enrichPostingResultsWithAmounts(rawPostingResults, date)
    const user = auditData.user || auditData.closedBy || 'Admin'
    const completedAt = auditData.completedAt || auditData.closedAt || moment().toISOString()
    
    // Operations table HTML
    let operationsHtml = ''
    if (operations.length > 0) {
      operationsHtml = `
        <h2>📝 ოპერაციები (${operations.length})</h2>
        <table>
          <thead>
            <tr><th>დრო</th><th>ტიპი</th><th>აღწერა</th><th>თანხა</th></tr>
          </thead>
          <tbody>
            ${operations.map((op: any) => `
              <tr>
                <td>${op.time || '-'}</td>
                <td>${op.type || '-'}</td>
                <td>${op.description || '-'}</td>
                <td>${op.amount > 0 ? '₾' + Number(op.amount || 0).toFixed(2) : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `
    }
    
    // Posting results table HTML  
    let postingHtml = ''
    if (postingResults && postingResults.length > 0) {
      postingHtml = `
        <h2>📋 Room Charge Posting</h2>
        <table>
          <thead>
            <tr><th>ოთახი</th><th>სტუმარი</th><th>თანხა</th><th>სტატუსი</th></tr>
          </thead>
          <tbody>
            ${postingResults.map((p: any) => {
              const amount = p.amount || 0
              // If amount was enriched and is now > 0, treat as posted
              const isPosted = amount > 0 || p.status === 'success' || p.status === 'posted'
              const statusClass = isPosted ? 'success' : 
                                  p.status === 'skipped' ? 'warning' : 'error'
              const statusText = isPosted ? '✓ Posted' :
                                 p.status === 'skipped' ? '⊘ Skipped' : '✗ Failed'
              return `
                <tr>
                  <td>${p.roomNumber || p.room || '-'}</td>
                  <td>${p.guestName || p.guest || '-'}</td>
                  <td>₾${Number(amount || 0).toFixed(2)}</td>
                  <td class="${statusClass}">${statusText}</td>
                </tr>
              `
            }).join('')}
          </tbody>
        </table>
      `
    }

    const pdfContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Night Audit Report - ${date}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          h1 { color: #1e40af; border-bottom: 3px solid #1e40af; padding-bottom: 10px; }
          h2 { color: #374151; margin-top: 30px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; }
          .date { color: #6b7280; text-align: right; }
          .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
          .stat-card { background: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; }
          .stat-value { font-size: 28px; font-weight: bold; color: #1e40af; }
          .stat-label { color: #6b7280; font-size: 12px; margin-top: 5px; }
          .financial-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
          .financial-card { padding: 15px; border-radius: 8px; }
          .financial-card.blue { background: #dbeafe; }
          .financial-card.green { background: #dcfce7; }
          .financial-card.purple { background: #f3e8ff; }
          .financial-card.yellow { background: #fef3c7; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
          th, td { border: 1px solid #e5e7eb; padding: 10px; text-align: left; }
          th { background: #f3f4f6; font-weight: 600; }
          tr:nth-child(even) { background: #f9fafb; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; color: #6b7280; font-size: 11px; }
          .success { color: #059669; font-weight: bold; }
          .warning { color: #d97706; }
          .error { color: #dc2626; }
          .summary-box { background: #f0f9ff; border: 1px solid #0284c7; border-radius: 8px; padding: 15px; margin: 20px 0; }
          @media print { 
            body { padding: 20px; } 
            .page-break { page-break-before: always; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">
            ${hotelInfo.logo ? `<img src="${hotelInfo.logo}" alt="${hotelInfo.name}" style="height: 60px; margin-bottom: 10px;">` : '🏨'}
            <div style="font-size: 24px; font-weight: bold; margin-top: ${hotelInfo.logo ? '10px' : '0'};">${hotelInfo.name}</div>
            ${hotelInfo.address ? `<div style="font-size: 12px; color: #666; margin-top: 5px;">${hotelInfo.address}</div>` : ''}
          </div>
          <div class="date">
            <strong>Night Audit Report</strong><br>
            ${moment(date).format('DD MMMM YYYY')}
          </div>
        </div>
        
        <h1>🌙 Night Audit Report</h1>
        
        <div class="summary-box">
          <strong>Audit Info:</strong> დასრულდა ${moment(completedAt).format('DD/MM/YYYY HH:mm:ss')} | მომხმარებელი: ${user}
        </div>
        
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${checkIns}</div>
            <div class="stat-label">Check-ins</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${checkOuts}</div>
            <div class="stat-label">Check-outs</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">₾${Number(revenue || 0).toFixed(0)}</div>
            <div class="stat-label">შემოსავალი</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${occupancy}%</div>
            <div class="stat-label">Occupancy</div>
          </div>
        </div>
        
        ${noShows > 0 ? `
        <h2>❌ No-Shows (${noShows})</h2>
        <p>No-Show სტუმრების რაოდენობა: ${noShows}</p>
        ` : ''}
        
        <h2>📊 Room Status Summary</h2>
        <table>
          <thead>
            <tr><th>სტატუსი</th><th>რაოდენობა</th><th>%</th></tr>
          </thead>
          <tbody>
            <tr><td>🟢 დაკავებული (Occupied)</td><td>${occupiedRooms}</td><td>${occupancy}%</td></tr>
            <tr><td>⚪ თავისუფალი (Vacant)</td><td>${totalRooms - occupiedRooms}</td><td>${100 - occupancy}%</td></tr>
            <tr><td><strong>სულ</strong></td><td><strong>${totalRooms}</strong></td><td><strong>100%</strong></td></tr>
          </tbody>
        </table>
        
        <h2>💰 Financial Summary</h2>
        <div class="financial-grid">
          <div class="financial-card blue">
            <div style="font-size: 24px; font-weight: bold; color: #1d4ed8;">₾${Number(roomChargesTotal || 0).toFixed(2)}</div>
            <div style="color: #6b7280; font-size: 12px;">Room Charges Posted</div>
          </div>
          <div class="financial-card green">
            <div style="font-size: 24px; font-weight: bold; color: #16a34a;">₾${Number(paymentsTotal || 0).toFixed(2)}</div>
            <div style="color: #6b7280; font-size: 12px;">Payments Received</div>
          </div>
        </div>
        
        <table>
          <thead>
            <tr><th>კატეგორია</th><th>თანხა</th></tr>
          </thead>
          <tbody>
            <tr><td>Room Revenue</td><td>₾${Number(roomChargesTotal || 0).toFixed(2)}</td></tr>
            <tr><td>Room Charges Posted</td><td>₾${Number(roomChargesTotal || 0).toFixed(2)}</td></tr>
            <tr><td>Payments Received</td><td>₾${Number(paymentsTotal || 0).toFixed(2)}</td></tr>
            <tr><td><strong>Total Revenue</strong></td><td><strong>₾${Number((roomChargesTotal || 0) + ((noShows || 0) * 50)).toFixed(2)}</strong></td></tr>
          </tbody>
        </table>
        
        ${(() => {
          const totalRevenue = roomChargesTotal + (noShows * 50)
          const taxData = calculateTaxBreakdown(totalRevenue)
          if (taxData.totalTax > 0) {
            return `
              <h2>🧾 Tax Summary</h2>
              <table>
                <thead>
                  <tr><th>კატეგორია</th><th>თანხა</th></tr>
                </thead>
                <tbody>
                  <tr><td>Net Revenue</td><td>₾${Number(taxData.net || 0).toFixed(2)}</td></tr>
                  ${taxData.taxes.map((tax: any) => `
                    <tr><td>${tax.name} (${tax.rate}%)</td><td>₾${Number(tax.amount || 0).toFixed(2)}</td></tr>
                  `).join('')}
                  <tr><td><strong>Total Tax</strong></td><td><strong>₾${Number(taxData.totalTax || 0).toFixed(2)}</strong></td></tr>
                  <tr><td><strong>Gross Revenue (Tax Inclusive)</strong></td><td><strong>₾${Number(taxData.gross || 0).toFixed(2)}</strong></td></tr>
                </tbody>
              </table>
            `
          }
          return ''
        })()}
        
        ${operationsHtml}
        
        ${postingHtml}
        
        <div class="footer">
          <p><strong>Generated:</strong> ${moment().format('DD/MM/YYYY HH:mm:ss')}</p>
          <p><strong>User:</strong> ${user}</p>
          <p><strong>Business Date:</strong> ${moment(date).format('DD/MM/YYYY')}</p>
          <p style="margin-top: 10px;">This is an automated report from Night Audit</p>
        </div>
      </body>
      </html>
    `
    
    // Open print dialog
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(pdfContent)
      printWindow.document.close()
      printWindow.print()
    }
  }

  // Auto-update selectedDate when audit history changes
  useEffect(() => {
    const nextDate = getNextAuditDate()
    // Only update if current selection is already closed
    const audits = JSON.parse(localStorage.getItem('nightAudits') || '[]')
    const isCurrentDateClosed = audits.some((a: any) => 
      a.date === selectedDate && 
      a.status === 'completed' && 
      !a.reversed
    )
    
    if (isCurrentDateClosed && nextDate !== selectedDate) {
      setSelectedDate(nextDate)
    }
  }, [auditHistory, selectedDate])

  // Cleanup on unmount - release lock if component unmounts during audit
  useEffect(() => {
    return () => {
      if (countdownInterval) {
        clearInterval(countdownInterval)
      }
      // Only clear lock if this instance set it
      const lockData = localStorage.getItem(AUDIT_LOCK_KEY)
      if (lockData) {
        try {
          const lock = JSON.parse(lockData)
          // Clear if lock is expired or this tab set it
          if (Date.now() - lock.timestamp > AUDIT_LOCK_TIMEOUT) {
            localStorage.removeItem(AUDIT_LOCK_KEY)
          }
        } catch {
          localStorage.removeItem(AUDIT_LOCK_KEY)
        }
      }
    }
  }, [countdownInterval])

  // Check for stale locks on mount
  useEffect(() => {
    const lockData = localStorage.getItem(AUDIT_LOCK_KEY)
    if (lockData) {
      try {
        const lock = JSON.parse(lockData)
        // Clear stale locks (older than 5 minutes)
        if (Date.now() - lock.timestamp > AUDIT_LOCK_TIMEOUT) {
          localStorage.removeItem(AUDIT_LOCK_KEY)
        }
      } catch {
        localStorage.removeItem(AUDIT_LOCK_KEY)
      }
    }
    
    // Load audit settings
    const savedSettings = localStorage.getItem('nightAuditSettings')
    if (savedSettings) {
      setAuditSettings(JSON.parse(savedSettings))
    }
  }, [])
  
  const loadRealData = async () => {
    try {
      // Fetch reservations from API (same source as Calendar)
      const resReservations = await fetch('/api/hotel/reservations')
      const reservations = resReservations.ok ? await resReservations.json() : []
      
      // Fetch rooms from API
      const resRooms = await fetch('/api/hotel/rooms')
      const rooms = resRooms.ok ? await resRooms.json() : []
      
      // Get REAL pending check-ins for selected date
      // Include CONFIRMED, PENDING, and any status that isn't CHECKED_IN, CHECKED_OUT, NO_SHOW, or CANCELLED
      const pendingCheckIns = reservations.filter((r: any) => {
        const checkInDate = moment(r.checkIn).format('YYYY-MM-DD')
        const isPending = r.status === 'CONFIRMED' || r.status === 'PENDING' || r.status === 'confirmed' || r.status === 'pending'
        return checkInDate === selectedDate && isPending
      })
      
      // Get unmarked arrivals - reservations for today that are NOT checked in yet
      // This is the BLOCKING validation - must be CONFIRMED (not CHECKED_IN) for this date
      const unmarkedArrivals = reservations.filter((r: any) => {
        const checkInDate = moment(r.checkIn).format('YYYY-MM-DD')
        const isConfirmed = r.status === 'CONFIRMED' || r.status === 'confirmed' || r.status === 'PENDING' || r.status === 'pending'
        const notCheckedIn = r.status !== 'CHECKED_IN' && r.status !== 'checked_in'
        const notCancelled = r.status !== 'CANCELLED' && r.status !== 'cancelled' && r.status !== 'NO_SHOW' && r.status !== 'no_show'
        
        return checkInDate === selectedDate && isConfirmed && notCheckedIn && notCancelled
      })
      
      // Get REAL pending check-outs for selected date
      const pendingCheckOuts = reservations.filter((r: any) => {
        const checkOutDate = moment(r.checkOut).format('YYYY-MM-DD')
        return checkOutDate === selectedDate && 
               (r.status === 'CHECKED_IN' || r.status === 'checked_in')
      })
      
      // Get REAL occupied rooms for selected date
      const occupiedRooms = reservations.filter((r: any) => {
        const checkIn = moment(r.checkIn)
        const checkOut = moment(r.checkOut)
        const selected = moment(selectedDate)
        return r.status === 'CHECKED_IN' && 
               checkIn.isSameOrBefore(selected, 'day') && 
               checkOut.isAfter(selected, 'day')
      }).length
      
      // Calculate REAL revenue for selected date (from check-outs + no-shows)
      const checkoutRevenue = reservations
        .filter((r: any) => {
          const checkOut = moment(r.checkOut).format('YYYY-MM-DD')
          return checkOut === selectedDate && 
                 (r.status === 'CHECKED_OUT' || r.autoCheckOut) &&
                 r.status !== 'CANCELLED'
        })
        .reduce((sum: number, r: any) => sum + Number(r.totalAmount || 0), 0)

      const noShowRevenue = reservations
        .filter((r: any) => {
          const checkIn = moment(r.checkIn).format('YYYY-MM-DD')
          return checkIn === selectedDate && r.status === 'NO_SHOW'
        })
        .reduce((sum: number, r: any) => sum + Number(r.noShowCharge || 0), 0)

      const todayRevenue = Number(checkoutRevenue || 0) + Number(noShowRevenue || 0)
      
      // Count dirty rooms - rooms that are VACANT but have cleaningStatus = 'dirty' or 'cleaning'
      const countDirtyRooms = (): number => {
        return rooms.filter((r: any) => {
          const isAvailable = r.status === 'VACANT'
          const isDirty = r.cleaningStatus === 'dirty' || r.cleaningStatus === 'cleaning'
          return isAvailable && isDirty
        }).length
      }
      
      const dirtyRooms = rooms.filter((r: any) => {
        const isAvailable = r.status === 'VACANT'
        const isDirty = r.cleaningStatus === 'dirty' || r.cleaningStatus === 'cleaning'
        return isAvailable && isDirty
      })
      
      const dirtyCount = countDirtyRooms()
      
      setRealStats({
        pendingCheckIns,
        pendingCheckOuts,
        dirtyRooms,
        unmarkedArrivals,
        totalRevenue: todayRevenue,
        occupiedRooms,
        totalRooms: rooms.length || 15
      })
    } catch (error) {
      console.error('Failed to load real data:', error)
      // Fallback to empty data
      setRealStats({
        pendingCheckIns: [],
        pendingCheckOuts: [],
        dirtyRooms: [],
        unmarkedArrivals: [],
        totalRevenue: 0,
        occupiedRooms: 0,
        totalRooms: 15
      })
    }
  }
  
  const calculateRealStatistics = async (date: string) => {
    try {
      const reservations = await fetch('/api/hotel/reservations').then(r => r.json())
      const rooms = await fetch('/api/hotel/rooms').then(r => r.json())
      const totalRooms = rooms.length || 15
      
      // Count check-ins for that date (guests whose reservation checkIn date is this date)
      // Use checkIn date (not actualCheckIn) since that's when they were supposed to arrive
      const checkIns = reservations.filter((r: any) => {
        const checkInDate = moment(r.checkIn).format('YYYY-MM-DD')
        // Reservation started on this date and was actually used (not cancelled/no-show)
        return checkInDate === date && 
               (r.status === 'CHECKED_IN' || r.status === 'CHECKED_OUT' || r.status === 'checked_in' || r.status === 'checked_out')
      }).length
      
      // Count check-outs for that date
      const checkOuts = reservations.filter((r: any) => {
        const checkOutDate = moment(r.checkOut).format('YYYY-MM-DD')
        return checkOutDate === date &&
               (r.status === 'CHECKED_OUT' || r.status === 'checked_out' || r.autoCheckOut)
      }).length
      
      // Count NO-SHOWS for that date
      const noShows = reservations.filter((r: any) => 
        moment(r.checkIn).format('YYYY-MM-DD') === date &&
        (r.status === 'NO_SHOW' || r.status === 'no_show')
      ).length
      
      // Calculate occupancy - count guests staying on that night
      const occupiedRooms = reservations.filter((r: any) => {
        const checkIn = moment(r.checkIn)
        const checkOut = moment(r.checkOut)
        const auditDate = moment(date)
        
        // Guest was occupying room if: checkIn <= date < checkOut and they actually stayed
        return (r.status === 'CHECKED_IN' || r.status === 'CHECKED_OUT' || r.status === 'checked_in' || r.status === 'checked_out') &&
               checkIn.isSameOrBefore(auditDate, 'day') &&
               checkOut.isAfter(auditDate, 'day')
      }).length
      
      // Calculate revenue from Check-outs (completed stays) + NO-SHOW charges
      const checkoutRevenue = reservations
        .filter((r: any) => 
          moment(r.checkOut).format('YYYY-MM-DD') === date &&
          (r.status === 'CHECKED_OUT' || r.status === 'checked_out' || r.autoCheckOut) &&
          r.status !== 'CANCELLED'
        )
        .reduce((sum: number, r: any) => sum + Number(r.totalAmount || 0), 0)

      const noShowRevenue = reservations
        .filter((r: any) => 
          moment(r.checkIn).format('YYYY-MM-DD') === date &&
          (r.status === 'NO_SHOW' || r.status === 'no_show')
        )
        .reduce((sum: number, r: any) => sum + Number(r.noShowCharge || 0), 0)

      const revenue = checkoutRevenue + noShowRevenue
      const occupancy = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0
      
      return {
        checkIns,
        checkOuts,
        noShows,
        revenue,
        occupancy
      }
    } catch (error) {
      console.error('Error calculating real statistics:', error)
      return {
        checkIns: 0,
        checkOuts: 0,
        noShows: 0,
        revenue: 0,
        occupancy: 0
      }
    }
  }
  
  const loadAuditHistory = async () => {
    const history = JSON.parse(localStorage.getItem('nightAudits') || '[]')
    
    // Recalculate statistics for each audit date from actual reservations
    const enrichedHistory = await Promise.all(
      history.map(async (audit: any) => {
        // Calculate real statistics for this audit date
        const realStats = await calculateRealStatistics(audit.date)
        
        return {
          ...audit,
          checkIns: realStats.checkIns,
          checkOuts: realStats.checkOuts,
          revenue: realStats.revenue,
          occupancy: realStats.occupancy,
          noShows: realStats.noShows,
          // Keep original stats as fallback
          originalStats: audit.stats || {
            totalCheckIns: audit.checkIns || 0,
            totalCheckOuts: audit.checkOuts || 0,
            totalRevenue: audit.revenue || 0,
            occupancyRate: audit.occupancy || 0
          }
        }
      })
    )
    
    setAuditHistory(enrichedHistory.slice(-10).reverse())
    
    // Check if this is first audit (no completed audits exist)
    const hasCompletedAudits = enrichedHistory.some((a: any) => 
      a.status === 'completed' && !a.reversed
    )
    setIsFirstAudit(!hasCompletedAudits)
    
    // Auto-set selectedDate to next unclosed date if not first audit
    if (hasCompletedAudits) {
      const lastCompleted = enrichedHistory
        .filter((a: any) => a.status === 'completed' && !a.reversed)
        .sort((a: any, b: any) => moment(b.date).valueOf() - moment(a.date).valueOf())[0]
      
      if (lastCompleted) {
        const nextDate = moment(lastCompleted.date).add(1, 'day')
        const today = moment()
        
        // Set to next unclosed date, but not future
        if (nextDate.isBefore(today, 'day')) {
          setSelectedDate(nextDate.format('YYYY-MM-DD'))
        } else {
          // If next date is today, we can close yesterday at most
          setSelectedDate(moment().subtract(1, 'day').format('YYYY-MM-DD'))
        }
      }
    }
  }
  
  // Pre-checks with STRICT validation
  const runPreChecks = () => {
    const checks: Array<{ passed: boolean; message: string; canOverride: boolean; critical?: boolean; details?: string[]; type?: 'checkin' | 'checkout'; reservations?: any[] }> = []
    
    // 0. PREVENT RUNNING ON SAME DATE TWICE (CRITICAL - CHECK FIRST)
    const alreadyDone = auditHistory.find((a: any) => 
      a.date === selectedDate && 
      a.status === 'completed' &&
      !a.reversed
    )
    
    if (alreadyDone) {
      const completedTime = alreadyDone.completedAt 
        ? moment(alreadyDone.completedAt).format('HH:mm')
        : alreadyDone.closedAt
        ? moment(alreadyDone.closedAt).format('HH:mm')
        : 'უცნობი დრო'
      
      checks.push({
        passed: false,
        critical: true,
        canOverride: false,
        message: `🚫 ${selectedDate} უკვე დახურულია ${completedTime}-ზე`,
        details: [
          `დახურულია: ${moment(alreadyDone.date).format('DD/MM/YYYY')}`,
          `დრო: ${completedTime}`,
          `მომხმარებელი: ${alreadyDone.user || alreadyDone.closedBy || 'უცნობი'}`,
          `სტატუსი: ${alreadyDone.status || 'completed'}`
        ]
      })
      return checks // Stop here - no need to check other validations
    }
    
    // 1. CHECK PENDING CHECK-OUTS (CRITICAL)
    if (realStats.pendingCheckOuts.length > 0) {
      checks.push({
        passed: false,
        critical: true,
        canOverride: false,
        message: `❌ ${realStats.pendingCheckOuts.length} დაუსრულებელი Check-out - უნდა დასრულდეს!`,
        details: realStats.pendingCheckOuts.map((r: any) => `${r.guestName} - Room ${r.roomNumber || r.roomId}`),
        type: 'checkout',
        reservations: realStats.pendingCheckOuts
      })
    } else {
      checks.push({
        passed: true,
        message: '✅ ყველა Check-out დასრულებულია',
        canOverride: false
      })
    }
    
    // 2. CHECK PENDING CHECK-INS (MUST BE PROCESSED)
    // Use pendingCheckIns which is more reliable than unmarkedArrivals
    const pendingCheckInsToProcess = realStats.pendingCheckIns.length > 0 
      ? realStats.pendingCheckIns 
      : realStats.unmarkedArrivals
    
    if (pendingCheckInsToProcess.length > 0) {
      checks.push({
        passed: false,
        critical: true,
        canOverride: false,
        message: `❌ ${pendingCheckInsToProcess.length} დაუსრულებელი Check-in - გააკეთეთ Check-in ან NO-SHOW!`,
        details: pendingCheckInsToProcess.map((r: any) => `${r.guestName} - Room ${r.roomNumber || r.roomId}`),
        type: 'checkin',
        reservations: pendingCheckInsToProcess
      })
    } else {
      checks.push({
        passed: true,
        message: '✅ ყველა Check-in დამუშავებულია (Check-in ან NO-SHOW)',
        canOverride: false
      })
    }
    
    // 3. CHECK SEQUENTIAL CLOSING (NO GAPS)
    const lastClosed = getLastAuditDate()
    if (lastClosed) {
      const daysBetween = moment(selectedDate).diff(moment(lastClosed), 'days')
      
      if (daysBetween > 1) {
        checks.push({
          passed: false,
          critical: true,
          canOverride: false,
          message: `❌ დღის გამოტოვება! ჯერ დახურეთ ${moment(lastClosed).add(1, 'day').format('YYYY-MM-DD')}`,
        })
      } else if (daysBetween < 0) {
        // Already closed or past date
        checks.push({
          passed: false,
          critical: true,
          canOverride: false,
          message: `❌ ${selectedDate} უკვე დახურულია ან წარსულშია (ბოლო დახურვა: ${moment(lastClosed).format('DD/MM/YYYY')})`,
        })
      } else if (daysBetween === 0) {
        // This case is already handled by the "already done" check at the beginning
        // No need to add duplicate check here
      } else if (daysBetween === 1) {
        checks.push({
          passed: true,
          message: '✅ Sequential closing შემოწმებულია',
          canOverride: false
        })
      }
    } else {
      // No previous audit - this is the first one
      checks.push({
        passed: true,
        message: '✅ Sequential closing შემოწმებულია (პირველი დახურვა)',
        canOverride: false
      })
    }
    
    // 4. CONTINUING GUESTS (INFO ONLY - NOT BLOCKING)
    if (realStats.occupiedRooms > 0) {
      checks.push({
        passed: true, // Not blocking
        critical: false,
        canOverride: true,
        message: `ℹ️ ${realStats.occupiedRooms} სტუმარი რჩება (Continuing) - OK`,
      })
    }
    
    // 6. Check dirty rooms (non-critical)
    if (realStats.dirtyRooms.length > 0) {
      checks.push({
        passed: false,
        message: `🧹 ${realStats.dirtyRooms.length} ოთახი დასუფთავებაში: ${realStats.dirtyRooms.map((r: any) => r.roomNumber || r.number || r.id).join(', ')}`,
        canOverride: true
      })
    } else {
      checks.push({
        passed: true,
        message: '✅ ყველა ოთახი სუფთაა',
        canOverride: false
      })
    }
    
    // Show detailed status
    const criticalFails = checks.filter(c => c.critical && !c.passed)
    if (criticalFails.length === 0) {
      checks.push({
        passed: true,
        message: '✅ ყველა ვალიდაცია გავლილია - შეგიძლიათ დახუროთ დღე',
        canOverride: false
      })
    }
    
    return checks
  }
  
  // Block Start if critical validations fail
  const canStartAudit = () => {
    const criticalFails = runPreChecks().filter(c => c.critical && !c.passed)
    return criticalFails.length === 0
  }
  
  const startNightAudit = async () => {
    // GUARD 1: Check if countdown is already active
    if (isCountdownActive || showUserWarning) {
      console.warn('Audit countdown already in progress')
      return
    }
    
    // GUARD 2: Check localStorage lock (prevents cross-tab duplicates)
    const existingLock = localStorage.getItem(AUDIT_LOCK_KEY)
    if (existingLock) {
      try {
        const lock = JSON.parse(existingLock)
        // If lock is fresh (less than 5 minutes), block
        if (Date.now() - lock.timestamp < AUDIT_LOCK_TIMEOUT) {
          alert(`⚠️ Night Audit უკვე მიმდინარეობს!\n\nდაიწყო: ${moment(lock.timestamp).format('HH:mm:ss')}\nთარიღი: ${lock.date}\n\nგთხოვთ დაელოდოთ დასრულებას ან შეამოწმეთ სხვა tab.`)
          return
        } else {
          // Lock is stale, clear it
          localStorage.removeItem(AUDIT_LOCK_KEY)
        }
      } catch {
        localStorage.removeItem(AUDIT_LOCK_KEY)
      }
    }
    
    // GUARD 3: Check if already running in this component
    if (isAuditRunning) {
      alert('⚠️ Night Audit უკვე მიმდინარეობს! გთხოვთ დაელოდოთ დასრულებას.')
      return
    }
    
    // GUARD 4: Check localStorage directly for completed audit
    const historyFromStorage = typeof window !== 'undefined' 
      ? JSON.parse(localStorage.getItem('nightAudits') || '[]')
      : []
    
    const existingAudit = historyFromStorage.find((a: any) => 
      a.date === selectedDate && 
      a.status === 'completed' &&
      !a.reversed
    )
    
    if (existingAudit) {
      const completedTime = existingAudit.completedAt 
        ? moment(existingAudit.completedAt).format('HH:mm')
        : existingAudit.closedAt
        ? moment(existingAudit.closedAt).format('HH:mm')
        : 'უცნობი დრო'
      
      alert(`❌ ეს დღე უკვე დახურულია ${completedTime}-ზე!\n\n` +
            `თარიღი: ${moment(selectedDate).format('DD/MM/YYYY')}\n` +
            `მომხმარებელი: ${existingAudit.user || existingAudit.closedBy || 'უცნობი'}\n\n` +
            `აირჩიეთ სხვა თარიღი.`)
      
      await loadAuditHistory()
      return
    }
    
    // SET LOCK before starting countdown
    const lockData = {
      timestamp: Date.now(),
      date: selectedDate,
      tabId: Math.random().toString(36).substr(2, 9)
    }
    localStorage.setItem(AUDIT_LOCK_KEY, JSON.stringify(lockData))
    
    // Start countdown
    setIsCountdownActive(true)
    setShowUserWarning(true)
    let timeLeft = 30
    setCountdown(timeLeft)
    
    const interval = setInterval(() => {
      timeLeft--
      setCountdown(timeLeft)
      
      if (timeLeft <= 0) {
        clearInterval(interval)
        setCountdownInterval(null)
        setShowUserWarning(false)
        setIsCountdownActive(false)
        startActualAudit()
      }
    }, 1000)
    
    setCountdownInterval(interval)
  }

  const cancelCountdown = () => {
    if (countdownInterval) {
      clearInterval(countdownInterval)
      setCountdownInterval(null)
    }
    setShowUserWarning(false)
    setIsCountdownActive(false)
    setCountdown(30)
    
    // Release lock
    localStorage.removeItem(AUDIT_LOCK_KEY)
  }
  
  const skipCountdown = () => {
    if (countdownInterval) {
      clearInterval(countdownInterval)
      setCountdownInterval(null)
    }
    setShowUserWarning(false)
    setIsCountdownActive(false)
    startActualAudit()
  }
  
  const startActualAudit = async () => {
    // FINAL GUARD: Double-check everything before actual execution
    
    // Check 1: Verify lock is still ours
    const lockData = localStorage.getItem(AUDIT_LOCK_KEY)
    if (!lockData) {
      alert('⚠️ Audit lock გაუქმებულია. გთხოვთ სცადოთ თავიდან.')
      setIsAuditRunning(false)
      setShowUserWarning(false)
      setShowPreChecks(true)
      return
    }
    
    // Check 2: Verify audit hasn't been completed while countdown was running
    const historyFromStorage = typeof window !== 'undefined' 
      ? JSON.parse(localStorage.getItem('nightAudits') || '[]')
      : []
    
    const existingAudit = historyFromStorage.find((a: any) => 
      a.date === selectedDate && 
      a.status === 'completed' &&
      !a.reversed
    )
    
    if (existingAudit) {
      // Release lock since we can't proceed
      localStorage.removeItem(AUDIT_LOCK_KEY)
      
      setIsAuditRunning(false)
      setShowUserWarning(false)
      setShowPreChecks(true)
      await loadAuditHistory()
      
      alert(`❌ Night Audit უკვე დასრულებულია ამ დღისთვის!\n\n` +
            `თარიღი: ${moment(selectedDate).format('DD/MM/YYYY')}\n` +
            `დასრულების დრო: ${existingAudit.completedAt ? moment(existingAudit.completedAt).format('HH:mm') : 'უცნობი'}\n\n` +
            `აირჩიეთ სხვა თარიღი.`)
      return
    }
    
    setIsAuditRunning(true)
    setShowPreChecks(false)
    addToLog(`🌙 Night Audit დაიწყო - ${selectedDate}`)
    
    const auditResult: any = {
      date: selectedDate,
      startTime: moment().format(),
      checkIns: 0,
      checkOuts: 0,
      noShows: 0,
      revenue: 0,
      occupancy: 0,
      operations: [],        // ← დაამატე
      paymentsTotal: 0,      // ← დაამატე
      roomChargesTotal: 0    // ← დაამატე
    }
    
    // Process each step
    for (let i = 0; i < 15; i++) {
      await processStep(i, auditResult)
    }
    
    completeAudit(auditResult)
  }
  
  const processStep = async (stepIndex: number, auditResult: any) => {
    setCurrentStep(stepIndex)
    addToLog(`⏳ ${getStepName(stepIndex)}`)
    
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    try {
      switch(stepIndex) {
        case 0: // Block users
          addToLog('🔒 სისტემა დაბლოკილია')
          localStorage.setItem('systemLocked', 'true')
          localStorage.setItem('lockedBy', 'Night Audit')
          break
          
        case 1: // Time check
          if (!isValidAuditTime() && selectedDate === moment().format('YYYY-MM-DD')) {
            addToLog('⚠️ Override: დროის შემოწმება')
          } else {
            addToLog('✓ დროის შემოწმება გავიდა')
          }
          break
          
        case 2: // Process check-ins
          auditResult.noShows = await processRealCheckIns()
          break
          
        case 3: // Process check-outs
          auditResult.checkOuts = await processRealCheckOuts()
          break
          
        case 4: // Update room statuses
          await updateRoomStatusesInCalendar()
          break
          
        case 5: // Financial calculations
          auditResult.revenue = await calculateRealRevenue()
          break
          
        case 6: // Room Charge Posting
          const postingResult = await PostingService.postRoomCharges(selectedDate)
          
          auditResult.roomChargesPosted = postingResult.posted
          auditResult.roomChargeTotal = postingResult.totalAmount
          auditResult.roomChargeFailed = postingResult.failed
          auditResult.roomChargeSkipped = postingResult.skipped
          auditResult.postingDetails = postingResult.details
          
          addToLog(`💰 Room Charges Posted: ${postingResult.posted}`)
          addToLog(`   Total Amount: ₾${Number(postingResult.totalAmount || 0).toFixed(2)}`)
          
          if (postingResult.failed > 0) {
            addToLog(`⚠️ Failed Postings: ${postingResult.failed}`)
          }
          if (postingResult.skipped > 0) {
            addToLog(`ℹ️ Skipped (already posted): ${postingResult.skipped}`)
          }
          
          // Show details for successful postings
          postingResult.details.forEach((detail: any) => {
            if (detail.success) {
              addToLog(`  ✓ ${detail.room} - ${detail.guest}: ₾${Number(detail.amount || 0).toFixed(2)}`)
            } else if (detail.skipped) {
              addToLog(`  ⊘ ${detail.room} - ${detail.guest}: Already posted`)
            } else {
              addToLog(`  ✗ ${detail.room} - ${detail.guest}: Failed - ${detail.error || 'Unknown error'}`)
            }
          })
          break
          
        case 7: // Package Posting
          const packageResult = await PackagePostingService.postPackageCharges(selectedDate)
          
          auditResult.packagesPosted = packageResult.posted
          auditResult.packageTotal = packageResult.totalAmount
          auditResult.packageFailed = packageResult.failed
          auditResult.packageSkipped = packageResult.skipped
          auditResult.packageDetails = packageResult.details
          
          addToLog(`📦 Packages Posted: ${packageResult.posted}`)
          addToLog(`   Total Amount: ₾${Number(packageResult.totalAmount || 0).toFixed(2)}`)
          
          if (packageResult.failed > 0) {
            addToLog(`⚠️ Failed Postings: ${packageResult.failed}`)
          }
          if (packageResult.skipped > 0) {
            addToLog(`ℹ️ Skipped (already posted): ${packageResult.skipped}`)
          }
          
          // Show details for successful postings
          packageResult.details.forEach((detail: any) => {
            if (detail.success) {
              addToLog(`  ✓ ${detail.room} - ${detail.package}: ₾${Number(detail.totalAmount || 0).toFixed(2)}`)
              detail.components?.forEach((comp: any) => {
                addToLog(`    • ${comp.component}: ₾${Number(comp.amount || 0).toFixed(2)}`)
              })
            } else if (detail.skipped) {
              addToLog(`  ⊘ ${detail.room} - ${detail.guest}: Already posted`)
            } else {
              addToLog(`  ✗ ${detail.room} - ${detail.guest}: Failed - ${detail.error || 'Unknown error'}`)
            }
          })
          break
          
        case 8: // Auto-close folios
          const closeResult = await FolioAutoCloseService.autoCloseFolios(selectedDate)
          
          auditResult.foliosClosed = closeResult.closed
          auditResult.foliosClosedDetails = closeResult.details
          
          addToLog(`📁 Folios Auto-Closed: ${closeResult.closed}`)
          if (closeResult.closed > 0) {
            closeResult.details.forEach((detail: any) => {
              addToLog(`  ✓ ${detail.folioNumber} - ${detail.guest}: ${detail.reason}`)
            })
          }
          if (closeResult.skipped > 0) {
            addToLog(`  ⊘ Skipped: ${closeResult.skipped}`)
          }
          if (closeResult.errors > 0) {
            addToLog(`  ✗ Errors: ${closeResult.errors}`)
          }
          break
          
        case 9: // Financial reconciliation
          const revenueReport = await FinancialReportsService.generateDailyRevenueReport(selectedDate)
          const managerReport = await FinancialReportsService.generateManagerReport(selectedDate)
          
          auditResult.financialSummary = {
            revenue: revenueReport.revenue.total,
            taxes: revenueReport.taxes.totalTax,
            payments: revenueReport.payments.total,
            outstanding: managerReport.financial.outstandingBalances
          }
          
          addToLog(`💼 Financial Summary:`)
          addToLog(`  Revenue: ₾${Number(revenueReport.revenue.total || 0).toFixed(2)}`)
          addToLog(`  Net Revenue: ₾${Number(revenueReport.taxes.netRevenue || 0).toFixed(2)}`)
          addToLog(`  Taxes: ₾${Number(revenueReport.taxes.totalTax || 0).toFixed(2)}`)
          if (revenueReport.taxes.taxes && Object.keys(revenueReport.taxes.taxes).length > 0) {
            Object.entries(revenueReport.taxes.taxes).forEach(([name, amount]: [string, any]) => {
              addToLog(`    ${name}: ₾${Number(amount || 0).toFixed(2)}`)
            })
          }
          addToLog(`  Payments: ₾${Number(revenueReport.payments.total || 0).toFixed(2)}`)
          addToLog(`  Outstanding: ₾${Number(managerReport.financial.outstandingBalances || 0).toFixed(2)}`)
          addToLog(`  ADR: ₾${managerReport.kpis.adr}`)
          addToLog(`  RevPAR: ₾${managerReport.kpis.revpar}`)
          addToLog(`  Occupancy: ${managerReport.kpis.occupancyRate}`)
          break
          
        case 10: // Statistics
          auditResult.occupancy = await calculateOccupancy()
          break
          
        case 11: // PDF Reports
          await generateReports()
          break
          
        case 12: // Email
          await sendEmails()
          break
          
        case 13: // Backup
          createBackup()
          addToLog('✓ Backup შექმნილია')
          break
          
        case 14: // Change business day
          if (selectedDate === moment().subtract(1, 'day').format('YYYY-MM-DD')) {
            changeBusinessDay()
          } else {
            addToLog('⚠️ Business Day change skipped (testing mode)')
          }
          break
      }
      
      addToLog(`✅ ${getStepName(stepIndex)} - დასრულდა`)
    } catch (error) {
      addToLog(`❌ Error: ${getStepName(stepIndex)} - ${(error as Error).message}`)
    }
  }
  
  const getStepName = (index: number) => {
    const steps = [
      'მომხმარებლების ბლოკირება',
      'დროის შემოწმება',
      'Check-in პროცესი',
      'Check-out პროცესი',
      'ოთახების განახლება',
      'ფინანსური გამოთვლები',
      '💰 Room Charge Posting',
      '📦 Package Posting',
      '📁 Auto-Close Folios',
      '💼 Financial Reconciliation',
      'სტატისტიკა',
      'PDF რეპორტები',
      'Email გაგზავნა',
      'Backup შექმნა',
      'Business Day ცვლილება'
    ]
    return steps[index] || `Step ${index + 1}`
  }
  
  // Check current time validity
  const isValidAuditTime = () => {
    const hour = moment().hour()
    return (hour >= 20 || hour <= 6)
  }
  
  // Calculate NO-SHOW charge (first night)
  const calculateNoShowCharge = (reservation: any) => {
    const nights = moment(reservation.checkOut).diff(moment(reservation.checkIn), 'days')
    if (nights > 0) {
      return reservation.totalAmount / nights
    }
    return reservation.totalAmount
  }
  
  // Detect NO-SHOWS for a specific date
  const detectNoShows = (date: string, reservations: any[]) => {
    return reservations.filter((r: any) => {
      const checkInDate = moment(r.checkIn).format('YYYY-MM-DD')
      return checkInDate === date && 
             r.status === 'CONFIRMED' &&
             !r.actualCheckIn
    })
  }
  
  // REAL data processing with calendar integration
  const processRealCheckIns = async () => {
    try {
      const res = await fetch('/api/hotel/reservations')
      const reservations = res.ok ? await res.json() : []
      
      // Detect NO-SHOWS for selected date
      const expectedArrivals = detectNoShows(selectedDate, reservations)
      let noShows = 0
      
      if (expectedArrivals.length > 0) {
        const totalCharge = expectedArrivals.reduce((sum: number, r: any) => 
          sum + calculateNoShowCharge(r), 0
        )
        
        addToLog(`🔍 Detected ${expectedArrivals.length} NO-SHOWS for ${selectedDate}`)
        addToLog(`💰 Total charge: ₾${Number(totalCharge || 0).toFixed(2)}`)
        
        // Process each NO-SHOW
        const updatePromises = expectedArrivals.map(async (r: any) => {
          const charge = calculateNoShowCharge(r)
          
          try {
            await fetch('/api/hotel/reservations', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: r.id,
                status: 'NO_SHOW',
                noShowDate: selectedDate,
                noShowCharge: charge,
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
            
            noShows++
            addToLog(`❌ No-Show: ${r.guestName} - Room ${r.roomNumber || r.roomId} (₾${Number(charge || 0).toFixed(2)})`)
          } catch (error) {
            console.error(`Failed to process NO-SHOW for ${r.id}:`, error)
            addToLog(`❌ Error processing NO-SHOW: ${r.guestName}`)
          }
        })
        
        await Promise.all(updatePromises)
      } else {
        addToLog('✅ No NO-SHOWS detected for this date')
      }
      
      return noShows
    } catch (error) {
      console.error('Error processing check-ins:', error)
      addToLog(`❌ Error: ${(error as Error).message}`)
      return 0
    }
  }
  
  const processRealCheckOuts = async () => {
    try {
      const res = await fetch('/api/hotel/reservations')
      const reservations = res.ok ? await res.json() : []
      let checkOuts = 0
      
      const updatePromises = reservations
        .filter((r: any) => 
          moment(r.checkOut).format('YYYY-MM-DD') === selectedDate && 
          r.status === 'CHECKED_IN'
        )
        .map(async (r: any) => {
          checkOuts++
          addToLog(`📤 Auto Check-out: ${r.guestName} - Room ${r.roomNumber || r.roomId}`)
          
          // Update via API
          await fetch('/api/hotel/reservations', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: r.id,
              status: 'CHECKED_OUT',
              autoCheckOut: true,
              checkedOutAt: moment().format()
            })
          })
        })
      
      await Promise.all(updatePromises)
      return checkOuts
    } catch (error) {
      console.error('Error processing check-outs:', error)
      return 0
    }
  }
  
  const updateRoomStatusesInCalendar = async () => {
    try {
      const resRooms = await fetch('/api/hotel/rooms')
      const rooms = resRooms.ok ? await resRooms.json() : []
      
      const resReservations = await fetch('/api/hotel/reservations')
      const reservations = resReservations.ok ? await resReservations.json() : []
      
      let updated = 0
      
      const updatePromises = rooms.map(async (room: any) => {
        // Check if room has active reservation
        const hasReservation = reservations.find((r: any) => 
          (r.roomId === room.id || r.roomNumber === room.roomNumber) && 
          r.status === 'CHECKED_IN'
        )
        
        let newStatus = room.status
        
        if (hasReservation) {
          if (room.status !== 'OCCUPIED') {
            newStatus = 'OCCUPIED'
            updated++
          }
        } else if (room.status === 'DIRTY' || room.status === 'dirty' || room.status === 'Dirty') {
          newStatus = 'VACANT'
          updated++
        } else if (room.status === 'OCCUPIED' && !hasReservation) {
          newStatus = 'VACANT'
          updated++
        }
        
        // Update via API if status changed
        if (newStatus !== room.status) {
          await fetch('/api/hotel/rooms/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              roomId: room.id,
              status: newStatus
            })
          })
        }
      })
      
      await Promise.all(updatePromises)
      addToLog(`🏨 ${updated} ოთახის სტატუსი განახლდა`)
    } catch (error) {
      console.error('Error updating room statuses:', error)
      addToLog(`❌ Error updating room statuses: ${(error as Error).message}`)
    }
  }
  
  const calculateRealRevenue = async () => {
    try {
      const res = await fetch('/api/hotel/reservations')
      const reservations = res.ok ? await res.json() : []
      
      // Revenue from Check-outs on this date (completed stays)
      const checkoutRevenue = reservations
        .filter((r: any) => {
          const checkOut = moment(r.checkOut).format('YYYY-MM-DD')
          return checkOut === selectedDate && 
                 (r.status === 'CHECKED_OUT' || r.autoCheckOut) &&
                 r.status !== 'CANCELLED' && 
                 r.status !== 'NO_SHOW'
        })
        .reduce((sum: number, r: any) => sum + Number(r.totalAmount || 0), 0)
      
      // Also include NO-SHOW charges for this date
      const noShowRevenue = reservations
        .filter((r: any) => {
          const checkIn = moment(r.checkIn).format('YYYY-MM-DD')
          return checkIn === selectedDate && r.status === 'NO_SHOW'
        })
        .reduce((sum: number, r: any) => sum + Number(r.noShowCharge || 0), 0)
      
      const totalRevenue = Number(checkoutRevenue || 0) + Number(noShowRevenue || 0)
      
      addToLog(`💰 დღიური შემოსავალი: ₾${totalRevenue}`)
      addToLog(`   └─ Check-out Revenue: ₾${checkoutRevenue}`)
      if (noShowRevenue > 0) {
        addToLog(`   └─ NO-SHOW Charges: ₾${noShowRevenue}`)
      }
      
      return totalRevenue
    } catch (error) {
      console.error('Error calculating revenue:', error)
      return 0
    }
  }
  
  const calculateOccupancy = async () => {
    const occupancy = realStats.totalRooms > 0 
      ? Math.round((realStats.occupiedRooms / realStats.totalRooms) * 100) 
      : 0
    addToLog(`📊 Occupancy: ${occupancy}% (${realStats.occupiedRooms}/${realStats.totalRooms})`)
    return occupancy
  }
  
  // Collect all operations for a specific date
  const collectDayOperations = async (date: string) => {
    const operations: any[] = []
    
    try {
      // Get reservations
      let reservations: any[] = []
      if (typeof window !== 'undefined') {
        const localRes = localStorage.getItem('hotelReservations')
        if (localRes) {
          reservations = JSON.parse(localRes)
        }
      }
      if (reservations.length === 0) {
        reservations = await fetch('/api/hotel/reservations').then(r => r.json()).catch(() => [])
      }
      
      // Get check-ins for this date
      reservations
        .filter((r: any) => 
          moment(r.checkIn).format('YYYY-MM-DD') === date &&
          (r.status === 'CHECKED_IN' || r.status === 'CHECKED_OUT')
        )
        .forEach((r: any) => {
          let checkInTime = '14:00' // Default check-in time
          if (r.checkedInAt) {
            checkInTime = moment(r.checkedInAt).format('HH:mm')
          } else if (r.checkInTime) {
            checkInTime = r.checkInTime
          }
          
          operations.push({
            time: checkInTime,
            type: 'CHECK_IN',
            description: `Check-in: ${r.guestName} → Room ${r.roomNumber || r.roomId}`,
            amount: 0,
            roomNumber: r.roomNumber || r.roomId
          })
        })
      
      // Get check-outs for this date
      reservations
        .filter((r: any) => 
          moment(r.checkOut).format('YYYY-MM-DD') === date &&
          r.status === 'CHECKED_OUT'
        )
        .forEach((r: any) => {
          let checkOutTime = '12:00' // Default check-out time
          if (r.checkedOutAt) {
            checkOutTime = moment(r.checkedOutAt).format('HH:mm')
          } else if (r.checkOutTime) {
            checkOutTime = r.checkOutTime
          }
          
          operations.push({
            time: checkOutTime,
            type: 'CHECK_OUT',
            description: `Check-out: ${r.guestName} ← Room ${r.roomNumber || r.roomId}`,
            amount: r.totalAmount || 0,
            roomNumber: r.roomNumber || r.roomId
          })
        })
      
      // Get payments and charges from folios (transactions, not payments!)
      const folios = JSON.parse(localStorage.getItem('hotelFolios') || '[]')
      folios.forEach((folio: any) => {
        if (folio.transactions && Array.isArray(folio.transactions)) {
          // Get PAYMENTS from transactions
          folio.transactions
            .filter((t: any) => {
              // Check payment date - use t.date or fallback to postedAt
              const txDate = t.date || moment(t.postedAt).format('YYYY-MM-DD')
              return txDate === date && (t.type === 'payment' || t.credit > 0)
            })
            .forEach((t: any) => {
              operations.push({
                time: t.time || moment(t.postedAt || t.date).format('HH:mm'),
                type: 'PAYMENT',
                description: `გადახდა: ${folio.guestName} - ${t.paymentMethod || t.method || 'cash'} (Room ${folio.roomNumber})`,
                amount: t.credit || t.amount || 0,
                roomNumber: folio.roomNumber
              })
            })
          
          // Get ROOM CHARGES from transactions
          folio.transactions
            .filter((t: any) => {
              // Check either date or nightAuditDate for room charges
              const txDate = t.date || t.nightAuditDate || moment(t.postedAt).format('YYYY-MM-DD')
              return txDate === date && t.type === 'charge' && t.category === 'room'
            })
            .forEach((t: any) => {
              operations.push({
                time: t.time || moment(t.postedAt || t.date).format('HH:mm'),
                type: 'ROOM_CHARGE',
                description: `Room Charge: Room ${folio.roomNumber}`,
                amount: t.debit || t.amount || 0,
                roomNumber: folio.roomNumber
              })
            })
        }
      })
      
      // Sort by time
      operations.sort((a, b) => (a.time || '').localeCompare(b.time || ''))
      
    } catch (error) {
      console.error('Error collecting day operations:', error)
    }
    
    return operations
  }

  const generateReports = async () => {
    try {
      // Get all data for report
      const reservations = await fetch('/api/hotel/reservations').then(r => r.json()).catch(() => [])
      const rooms = await fetch('/api/hotel/rooms').then(r => r.json()).catch(() => [])
      const folios = JSON.parse(localStorage.getItem('hotelFolios') || '[]')
      
      // Calculate statistics
      const checkIns = reservations.filter((r: any) => 
        moment(r.checkIn).format('YYYY-MM-DD') === selectedDate &&
        (r.status === 'CHECKED_IN' || r.status === 'CHECKED_OUT')
      ).length
      
      const checkOuts = reservations.filter((r: any) => 
        moment(r.checkOut).format('YYYY-MM-DD') === selectedDate &&
        r.status === 'CHECKED_OUT'
      ).length
      
      const noShows = reservations.filter((r: any) => 
        moment(r.checkIn).format('YYYY-MM-DD') === selectedDate &&
        r.status === 'NO_SHOW'
      ).length
      
      // Revenue will be calculated from roomChargesTotal (from folio transactions)
      let revenue = 0
      
      const occupiedRooms = reservations.filter((r: any) => {
        const checkIn = moment(r.checkIn)
        const checkOut = moment(r.checkOut)
        const auditDate = moment(selectedDate)
        return (r.status === 'CHECKED_IN' || r.status === 'CHECKED_OUT') &&
               checkIn.isSameOrBefore(auditDate, 'day') &&
               checkOut.isAfter(auditDate, 'day')
      }).length
      
      const totalRooms = rooms.length || 15
      const occupancy = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0
      
      // Calculate payments from transactions
      let paymentsTotal = 0
      let roomChargesTotal = 0
      const operations: any[] = []
      
      folios.forEach((folio: any) => {
        if (folio.transactions && Array.isArray(folio.transactions)) {
          folio.transactions.forEach((t: any) => {
            // Check payment date - use t.date or fallback to postedAt
            const txDate = t.date || moment(t.postedAt).format('YYYY-MM-DD')
            if (txDate === selectedDate) {
              if (t.type === 'payment' || t.credit > 0) {
                const amount = t.credit || t.amount || 0
                paymentsTotal += amount
                operations.push({
                  time: t.time || moment(t.postedAt).format('HH:mm'),
                  type: 'PAYMENT',
                  description: `გადახდა: ${folio.guestName} - ${t.paymentMethod || 'cash'}`,
                  amount: amount
                })
              }
              // Room charges - check either date or nightAuditDate
              if (t.type === 'charge' && t.category === 'room') {
                const chargeDate = t.date || t.nightAuditDate || moment(t.postedAt).format('YYYY-MM-DD')
                if (chargeDate === selectedDate) {
                  const amount = t.debit || t.amount || 0
                  roomChargesTotal += amount
                  operations.push({
                    time: t.time || moment(t.postedAt).format('HH:mm'),
                    type: 'ROOM_CHARGE',
                    description: `Room Charge: ${folio.guestName} - Room ${folio.roomNumber || ''}`,
                    amount: amount
                  })
                }
              }
            }
          })
        }
      })
      
      // Calculate room revenue from room charges (should match roomChargesTotal)
      const roomRevenue = roomChargesTotal
      
      // Sort operations by time
      operations.sort((a, b) => a.time.localeCompare(b.time))
      
      // Use unified PDF generator
      // Room revenue should match roomChargesTotal
      const finalRevenue = roomChargesTotal
      generateAuditPDF({
        date: selectedDate,
        checkIns,
        checkOuts,
        noShows,
        revenue: finalRevenue, // Use room charges as revenue
        occupancy,
        totalRooms,
        occupiedRooms,
        paymentsTotal,
        roomChargesTotal,
        operations,
        user: JSON.parse(localStorage.getItem('currentUser') || '{}').name || 'Admin',
        completedAt: moment().toISOString()
      })
      
      addToLog('✓ PDF რეპორტი შექმნილია და გახსნილია Print Dialog')
      
      // Save report data
      const report = {
        date: selectedDate,
        time: moment().format('HH:mm:ss'),
        generated: true,
        stats: { checkIns, checkOuts, noShows, revenue, occupancy, paymentsTotal, roomChargesTotal }
      }
      
      const reports = JSON.parse(localStorage.getItem('nightAuditReports') || '[]')
      reports.push(report)
      localStorage.setItem('nightAuditReports', JSON.stringify(reports))
      
    } catch (error) {
      console.error('Error generating reports:', error)
      addToLog('✗ შეცდომა რეპორტის გენერაციისას')
    }
  }
  
  const sendEmails = async () => {
    try {
      // Get hotel settings for email recipients
      const hotelSettings = JSON.parse(localStorage.getItem('hotelSettings') || '{}')
      const emailRecipients = hotelSettings.emailRecipients || ['manager@hotel.com']
      
      // Get audit data for email
      const reservations = await fetch('/api/hotel/reservations').then(r => r.json()).catch(() => [])
      
      const checkIns = reservations.filter((r: any) => 
        moment(r.checkIn).format('YYYY-MM-DD') === selectedDate &&
        (r.status === 'CHECKED_IN' || r.status === 'CHECKED_OUT')
      ).length
      
      const checkOuts = reservations.filter((r: any) => 
        moment(r.checkOut).format('YYYY-MM-DD') === selectedDate &&
        r.status === 'CHECKED_OUT'
      ).length
      
      const revenue = reservations
        .filter((r: any) => moment(r.checkOut).format('YYYY-MM-DD') === selectedDate && r.status === 'CHECKED_OUT')
        .reduce((sum: number, r: any) => sum + Number(r.totalAmount || 0), 0)
      
      // Create email content
      const hotelName = hotelInfo.name || 'Hotel'
      const emailSubject = `Night Audit Report - ${moment(selectedDate).format('DD/MM/YYYY')} - ${hotelName}`
      const emailBody = `
Night Audit Report
==================
Date: ${moment(selectedDate).format('DD MMMM YYYY')}
Time: ${moment().format('HH:mm:ss')}

Summary:
- Check-ins: ${checkIns}
- Check-outs: ${checkOuts}
- Revenue: ₾${Number(revenue || 0).toFixed(2)}

This is an automated report from Night Audit System.
      `.trim()
      
      // Save to email queue with detailed info
      const emailQueue = JSON.parse(localStorage.getItem('emailQueue') || '[]')
      const emailRecord = {
        id: `email-${Date.now()}`,
        to: emailRecipients,
        subject: emailSubject,
        body: emailBody,
        createdAt: moment().format(),
        status: 'pending',
        auditDate: selectedDate,
        stats: { checkIns, checkOuts, revenue }
      }
      emailQueue.push(emailRecord)
      localStorage.setItem('emailQueue', JSON.stringify(emailQueue))
      
      // Try to open email client with mailto (works on desktop)
      const mailtoLink = `mailto:${emailRecipients.join(',')}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`
      
      // Create a temporary link to trigger mailto
      const tempLink = document.createElement('a')
      tempLink.href = mailtoLink
      tempLink.click()
      
      addToLog(`✓ Email რეპორტი მომზადებულია`)
      addToLog(`  📧 მიმღებები: ${emailRecipients.join(', ')}`)
      addToLog(`  📋 გახსნილია Email Client`)
      
      // Update status
      emailRecord.status = 'opened_in_client'
      localStorage.setItem('emailQueue', JSON.stringify(emailQueue))
      
      // Show notification about email settings
      if (emailRecipients.length === 1 && emailRecipients[0] === 'manager@hotel.com') {
        addToLog(`  ⚠️ Email მიმღებები: Settings-ში შეგიძლიათ დაამატოთ`)
      }
      
    } catch (error) {
      console.error('Error sending email:', error)
      addToLog('❌ Email გაგზავნა ვერ მოხერხდა')
      
      // Still save to queue even if mailto fails
      const emailQueue = JSON.parse(localStorage.getItem('emailQueue') || '[]')
      emailQueue.push({
        id: `email-${Date.now()}`,
        to: ['manager@hotel.com'],
        subject: `Night Audit Report - ${selectedDate}`,
        createdAt: moment().format(),
        status: 'failed',
        error: (error as Error).message
      })
      localStorage.setItem('emailQueue', JSON.stringify(emailQueue))
    }
  }
  
  const createBackup = async () => {
    try {
      const resReservations = await fetch('/api/hotel/reservations')
      const reservations = resReservations.ok ? await resReservations.json() : []
      
      const resRooms = await fetch('/api/hotel/rooms')
      const rooms = resRooms.ok ? await resRooms.json() : []
      
      const audits = JSON.parse(localStorage.getItem('nightAudits') || '[]')
      
      const backup = {
        timestamp: moment().format(),
        reservations,
        rooms,
        audits
      }
      localStorage.setItem(`backup_${selectedDate}`, JSON.stringify(backup))
    } catch (error) {
      console.error('Error creating backup:', error)
    }
  }
  
  const changeBusinessDay = () => {
    const nextDay = moment(selectedDate).add(1, 'day').format('YYYY-MM-DD')
    localStorage.setItem('currentBusinessDate', nextDay)
    // Set both: lastNightAuditDate (preferred) and lastAuditDate (legacy for backward compatibility)
    localStorage.setItem('lastNightAuditDate', selectedDate)
    localStorage.setItem('lastAuditDate', JSON.stringify(selectedDate))
    addToLog(`📅 Business Day: ${selectedDate} → ${nextDay}`)
  }
  
  const completeAudit = async (auditResult: any) => {
    // Release lock on completion
    localStorage.removeItem(AUDIT_LOCK_KEY)
    
    // CRITICAL: Final check before completing - prevent race conditions
    const historyBeforeSave = JSON.parse(localStorage.getItem('nightAudits') || '[]')
    const alreadyExists = historyBeforeSave.find((h: any) => 
      h.date === auditResult.date && 
      h.status === 'completed' &&
      !h.reversed
    )
    
    if (alreadyExists) {
      // Audit was already completed (possibly by another instance/tab)
      setIsAuditRunning(false)
      setShowPreChecks(true)
      await loadAuditHistory()
      
      addToLog('⚠️ Night Audit უკვე დასრულებულია ამ დღისთვის - გაუქმებულია')
      alert(`❌ Night Audit უკვე დასრულებულია!\n\n` +
            `თარიღი: ${moment(auditResult.date).format('DD/MM/YYYY')}\n` +
            `დასრულების დრო: ${alreadyExists.completedAt ? moment(alreadyExists.completedAt).format('HH:mm') : 'უცნობი'}\n\n` +
            `ეს შეიძლება მოხდეს, თუ audit-ი გაეშვა სხვა ტაბში ან სხვა მომხმარებლის მიერ.`)
      return
    }
    
    auditResult.completedAt = moment().format()
    auditResult.closedAt = moment().format()
    auditResult.user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('currentUser') || '{}').name || 'Admin' : 'Admin'
    auditResult.closedBy = auditResult.user
    auditResult.status = 'completed'
    
    // Unlock system
    localStorage.removeItem('systemLocked')
    localStorage.removeItem('lockedBy')
    localStorage.removeItem('lockedAt')
    addToLog('🔓 სისტემა განბლოკილია')
    
    // Save to history - use atomic operation to prevent duplicates
    const history = JSON.parse(localStorage.getItem('nightAudits') || '[]')
    
    // Final duplicate check before saving
    const exists = history.find((h: any) => 
      h.date === auditResult.date && 
      h.status === 'completed' &&
      !h.reversed
    )
    
    if (!exists) {
      // Collect operations and payments before saving
      const folios = JSON.parse(localStorage.getItem('hotelFolios') || '[]')
      let paymentsTotal = 0
      let roomChargesTotal = 0
      const operations: any[] = []
      
      folios.forEach((folio: any) => {
        if (folio.transactions && Array.isArray(folio.transactions)) {
          folio.transactions.forEach((t: any) => {
            // Check payment date - use t.date or fallback to postedAt
            const txDate = t.date || moment(t.postedAt).format('YYYY-MM-DD')
            if (txDate === auditResult.date) {
              if (t.type === 'payment' || t.credit > 0) {
                const amount = t.credit || t.amount || 0
                paymentsTotal += amount
                operations.push({
                  time: t.time || moment(t.postedAt).format('HH:mm'),
                  type: 'PAYMENT',
                  description: `გადახდა: ${folio.guestName} - ${t.paymentMethod || 'cash'}`,
                  amount: amount
                })
              }
              // Room charges - check either date or nightAuditDate
              if (t.type === 'charge' && t.category === 'room') {
                const chargeDate = t.date || t.nightAuditDate || moment(t.postedAt).format('YYYY-MM-DD')
                if (chargeDate === auditResult.date) {
                  roomChargesTotal += (t.debit || t.amount || 0)
                }
              }
            }
          })
        }
      })
      
      // Add check-in/check-out operations from folios (using existing folios variable)
      folios.forEach((folio: any) => {
        const openDate = (folio.openDate || '').split('T')[0]
        const closedDate = (folio.closedDate || '').split('T')[0]
        
        // Check-in operation
        if (openDate === auditResult.date) {
          operations.push({
            time: folio.openTime || moment(folio.openDate).format('HH:mm') || '14:00',
            type: 'CHECK_IN',
            description: `Check-in: ${folio.guestName} → Room ${folio.roomNumber || '-'}`,
            amount: 0
          })
        }
        
        // Check-out operation
        if (closedDate === auditResult.date) {
          operations.push({
            time: folio.closeTime || moment(folio.closedDate).format('HH:mm') || '12:00',
            type: 'CHECK_OUT',
            description: `Check-out: ${folio.guestName} ← Room ${folio.roomNumber || '-'}`,
            amount: 0
          })
        }
      })
      
      // Sort by time
      operations.sort((a, b) => a.time.localeCompare(b.time))
      
      // Calculate check-ins/check-outs from folios
      const counts = getCheckInOutCounts(auditResult.date)
      
      history.push({
        id: Date.now(),
        ...auditResult,
        // Fix: Use check-ins/check-outs from folios
        checkIns: counts.checkIns || 0,
        checkOuts: counts.checkOuts || 0,
        noShows: auditResult.noShows || 0,
        paymentsTotal: paymentsTotal,
        roomChargesTotal: roomChargesTotal || auditResult.roomChargeTotal || 0,
        operations: operations,
        totalRooms: realStats.totalRooms || 15,
        occupiedRooms: realStats.occupiedRooms || 0,
        // Fix: Save postingResults with correct structure - ensure amounts are saved even for skipped
        postingResults: (auditResult.postingDetails || []).map((p: any) => ({
          roomNumber: p.room || p.roomNumber || '-',
          guestName: p.guest || p.guestName || '-',
          // Always save amount - use total, amount, or debit if available
          amount: p.amount || p.total || p.debit || 0,
          status: p.skipped ? 'skipped' : (p.success ? 'success' : 'failed'),
          prePosted: p.prePosted || false
        })),
        stats: {
          totalCheckIns: counts.checkIns || 0,
          totalCheckOuts: counts.checkOuts || auditResult.checkOuts || 0,
          totalRevenue: auditResult.revenue || 0,
          occupancyRate: auditResult.occupancy || 0,
          roomChargesPosted: auditResult.roomChargesPosted || 0,
          roomChargeTotal: auditResult.roomChargeTotal || 0
        },
        roomChargesPosted: auditResult.roomChargesPosted || 0,
        roomChargeTotal: auditResult.roomChargeTotal || 0,
        roomChargeFailed: auditResult.roomChargeFailed || 0,
        roomChargeSkipped: auditResult.roomChargeSkipped || 0
      })
      localStorage.setItem('nightAudits', JSON.stringify(history))
      addToLog('✅ Night Audit შენახულია history-ში')
    } else {
      // If duplicate detected, log warning but don't save
      setIsAuditRunning(false)
      setShowPreChecks(true)
      await loadAuditHistory()
      
      addToLog('⚠️ Audit already exists for this date - skipping duplicate')
      console.warn('Duplicate audit detected for date:', auditResult.date)
      alert('⚠️ Night Audit უკვე არსებობს ამ დღისთვის!')
      return
    }
    
    // Set audit date properly (always update, even if duplicate)
    localStorage.setItem('lastAuditDate', JSON.stringify(auditResult.date))
    localStorage.setItem('lastNightAuditDate', auditResult.date)
    localStorage.setItem('currentBusinessDate', moment(auditResult.date).add(1, 'day').format('YYYY-MM-DD'))
    
    addToLog('✅ Night Audit დასრულდა')
    
    // IMPORTANT: Update history FIRST before changing selectedDate
    // This ensures the duplicate check works correctly
    await loadAuditHistory()
    
    // Now safely update selectedDate (this will trigger useEffect, but history is already updated)
    const nextDate = moment(auditResult.date).add(1, 'day').format('YYYY-MM-DD')
    
    // Reset form to prevent re-run
    setIsAuditRunning(false)
    setShowPreChecks(true)
    setAuditLog([])
    setCurrentStep(0) // Reset step counter
    
    // Set selectedDate AFTER history is loaded and audit is stopped
    // This prevents race condition where useEffect might trigger before history is updated
    setTimeout(() => {
      setSelectedDate(nextDate)
      
      // Show success message
      setTimeout(() => {
        alert('✅ Night Audit დასრულდა წარმატებით!')
      }, 500)
    }, 500)
  }
  
  const addToLog = (message: string) => {
    setAuditLog(prev => [...prev, `[${moment().format('HH:mm:ss')}] ${message}`])
  }
  
  // ============================================
  // NEW FEATURE 1: Undo/Reverse Day
  // ============================================
  const reverseAudit = async (date: string) => {
    const password = prompt('შეიყვანეთ Admin პაროლი:')
    if (password !== 'admin123') {
      alert('არასწორი პაროლი!')
      return
    }
    
    const history = JSON.parse(localStorage.getItem('nightAudits') || '[]')
    const updatedHistory = history.map((audit: any) => {
      if (audit.date === date && audit.status === 'completed') {
        return {
          ...audit,
          status: 'reversed',
          reversed: true,
          reversedAt: moment().format(),
          reversedBy: 'Admin'
        }
      }
      return audit
    })
    
    localStorage.setItem('nightAudits', JSON.stringify(updatedHistory))
    
    // Update business date back
    localStorage.setItem('currentBusinessDate', date)
    localStorage.setItem('lastNightAuditDate', moment(date).subtract(1, 'day').format('YYYY-MM-DD'))
    
    alert(`✅ თარიღი ${date} გახსნილია!\nახლა შეგიძლიათ თავიდან გაუშვათ Night Audit.`)
    setShowReverseModal(false)
    setReverseDate(null)
    await loadAuditHistory()
    setSelectedDate(date)
  }
  
  // ============================================
  // NEW FEATURE 2: Save Audit Settings
  // ============================================
  const saveAuditSettings = () => {
    localStorage.setItem('nightAuditSettings', JSON.stringify(auditSettings))
    
    // Also save email recipients to hotel settings
    const hotelSettings = JSON.parse(localStorage.getItem('hotelSettings') || '{}')
    hotelSettings.emailRecipients = auditSettings.emailRecipients
    localStorage.setItem('hotelSettings', JSON.stringify(hotelSettings))
    
    alert('✅ პარამეტრები შენახულია!')
    setShowSettingsModal(false)
  }
  
  // ============================================
  // UNIFIED PAYMENT CALCULATOR: Same logic as CashierModule
  // ============================================
  const getZReportPayments = (businessDate: string) => {
    const payments = {
      cash: 0,
      card: 0,
      bank: 0,
      total: 0
    }
    
    // Source 1: Folio payment transactions for this date (exact date match like Cashier)
    const folios = JSON.parse(localStorage.getItem('hotelFolios') || '[]')
    folios.forEach((folio: any) => {
      (folio.transactions || []).forEach((t: any) => {
        if (t.type === 'payment' || t.credit > 0) {
          // Use exact date match like CashierModule (t.date === today)
          const paymentDate = t.date || moment(t.postedAt).format('YYYY-MM-DD')
          if (paymentDate === businessDate) {
            const amount = Number(t.credit || t.amount || 0)
            const method = (t.paymentMethod || t.method || 'cash').toLowerCase()
            
            // Match CashierModule logic exactly
            if (method === 'cash' || method === 'ნაღდი') {
              payments.cash += amount
            } else if (method === 'card' || method === 'credit_card' || method === 'ბარათი') {
              payments.card += amount
            } else if (method === 'bank' || method === 'bank_transfer' || method === 'ბანკი') {
              payments.bank += amount
            } else {
              payments.cash += amount // Default to cash
            }
            payments.total += amount
          }
        }
      })
    })
    
    // Source 2: Cashier manual income transactions for this date
    const manualTransactions = JSON.parse(localStorage.getItem('cashierManualTransactions') || '[]')
    manualTransactions.forEach((t: any) => {
      if (t.type === 'income' && t.date === businessDate) {
        const amount = Number(t.amount || 0)
        const method = (t.method || 'cash').toLowerCase()
        
        // Match CashierModule logic exactly
        if (method === 'cash' || method === 'ნაღდი') {
          payments.cash += amount
        } else if (method === 'card' || method === 'credit_card' || method === 'ბარათი') {
          payments.card += amount
        } else if (method === 'bank' || method === 'bank_transfer' || method === 'ბანკი') {
          payments.bank += amount
        } else {
          payments.cash += amount // Default to cash
        }
        payments.total += amount
      }
    })
    
    return payments
  }
  
  // ============================================
  // UNIFIED MOVEMENT CALCULATOR: Check-in/Check-out/Stay-over
  // ============================================
  const calculateMovement = (businessDate: string, reservations?: any[]) => {
    // Use passed reservations, or try localStorage as fallback
    let reservationsList = reservations || []
    
    // If no reservations passed and localStorage is empty, return zeros
    if (reservationsList.length === 0) {
      const localStorageReservations = JSON.parse(localStorage.getItem('hotelReservations') || '[]')
      if (localStorageReservations.length > 0) {
        reservationsList = localStorageReservations
      } else {
        // No reservations available - return zeros
        return { checkIns: 0, checkOuts: 0, stayOver: 0 }
      }
    }
    
    // Check-ins: reservations that actually checked in on this date
    // Try actualCheckIn first, then fall back to scheduled checkIn with CHECKED_IN status
    const checkIns = reservationsList.filter((r: any) => {
      const actualCheckIn = r.actualCheckIn || r.checkedInAt
      if (actualCheckIn) {
        return moment(actualCheckIn).format('YYYY-MM-DD') === businessDate
      }
      // Fallback: scheduled check-in on this date AND status is CHECKED_IN or CHECKED_OUT
      const scheduledCheckIn = moment(r.checkIn).format('YYYY-MM-DD')
      const isProcessed = ['CHECKED_IN', 'CHECKED_OUT'].includes(r.status)
      return scheduledCheckIn === businessDate && isProcessed
    }).length
    
    // Check-outs: reservations that actually checked out on this date
    // Try actualCheckOut first, then fall back to scheduled checkOut with CHECKED_OUT status
    const checkOuts = reservationsList.filter((r: any) => {
      const actualCheckOut = r.actualCheckOut || r.checkedOutAt
      if (actualCheckOut) {
        return moment(actualCheckOut).format('YYYY-MM-DD') === businessDate
      }
      // Fallback: scheduled check-out on this date AND status is CHECKED_OUT
      const scheduledCheckOut = moment(r.checkOut).format('YYYY-MM-DD')
      return scheduledCheckOut === businessDate && r.status === 'CHECKED_OUT'
    }).length
    
    // Stay-over: guests in-house at end of day (checked in before/on this day, checking out after this day)
    const stayOver = reservationsList.filter((r: any) => {
      if (r.status !== 'CHECKED_IN') return false
      const checkIn = moment(r.checkIn).format('YYYY-MM-DD')
      const checkOut = moment(r.checkOut).format('YYYY-MM-DD')
      // In-house: checkIn <= businessDate < checkOut
      return checkIn <= businessDate && checkOut > businessDate
    }).length
    
    return { checkIns, checkOuts, stayOver }
  }
  
  // ============================================
  // UNIFIED DATA LOADER: Load all audit data from same sources
  // ============================================
  const loadAuditDataForDate = (targetDate: string) => {
    const folios = JSON.parse(localStorage.getItem('hotelFolios') || '[]')
    const reservations = JSON.parse(localStorage.getItem('hotelReservations') || '[]')
    const manualTx = JSON.parse(localStorage.getItem('cashierManualTransactions') || '[]')
    
    let roomCharges = 0
    let serviceCharges = 0
    const paymentsList: any[] = []
    const chargesList: any[] = []
    
    // 1. Get charges from folios
    folios.forEach((folio: any) => {
      folio.transactions?.forEach((t: any) => {
        const txDate = moment(t.date || t.nightAuditDate || t.postedAt).format('YYYY-MM-DD')
        if (txDate !== targetDate) return
        
        // Charges
        if (t.type === 'charge' || t.debit > 0) {
          const amount = Number(t.amount || t.debit || 0)
          chargesList.push({
            ...t,
            guestName: folio.guestName,
            roomNumber: folio.roomNumber
          })
          
          if (t.category === 'room' || t.description?.toLowerCase().includes('ოთახ') || t.description?.toLowerCase().includes('room')) {
            roomCharges += amount
          } else {
            serviceCharges += amount
          }
        }
        
        // Payments - collect for list only, totals come from unified function
        if (t.type === 'payment' || t.credit > 0) {
          paymentsList.push({
            ...t,
            guestName: folio.guestName,
            roomNumber: folio.roomNumber,
            method: t.paymentMethod || t.method || 'cash'
          })
        }
      })
    })
    
    // 2. If no room charges found, check for staying guests (room charge posting)
    if (roomCharges === 0) {
      reservations.forEach((r: any) => {
        if (r.status === 'CHECKED_IN' || r.status === 'CHECKED_OUT') {
          const checkIn = moment(r.checkIn).format('YYYY-MM-DD')
          const checkOut = moment(r.checkOut).format('YYYY-MM-DD')
          
          // If target date is during stay
          if (targetDate >= checkIn && targetDate < checkOut) {
            const nights = moment(r.checkOut).diff(moment(r.checkIn), 'days') || 1
            const perNight = Number(r.totalAmount || 0) / nights
            roomCharges += perNight
            
            chargesList.push({
              date: targetDate,
              description: `Room Charge: ${r.guestName} - Room ${r.roomNumber}`,
              amount: perNight,
              category: 'room',
              guestName: r.guestName,
              roomNumber: r.roomNumber
            })
          }
        }
      })
    }
    
    // 3. Add manual cashier income transactions to payments list
    manualTx.forEach((t: any) => {
      const txDate = moment(t.date).format('YYYY-MM-DD')
      if (txDate !== targetDate) return
      
      if (t.type === 'income') {
        paymentsList.push({
          ...t,
          guestName: t.description || 'Manual',
          roomNumber: '-',
          method: t.method || 'cash'
        })
      }
    })
    
    // 4. Use unified payment calculator (same as CashierModule)
    const payments = getZReportPayments(targetDate)
    
    const totalRevenue = roomCharges + serviceCharges
    
    // Calculate tax breakdown
    const taxData = calculateTaxBreakdown(totalRevenue)
    
    return {
      roomCharges,
      serviceCharges,
      totalRevenue,
      payments,
      paymentsList,
      chargesList,
      taxData
    }
  }
  
  // ============================================
  // NEW FEATURE 3: Generate Manager's Daily Report
  // ============================================
  const generateManagerReport = async (date: string) => {
    try {
      const reservations = await fetch('/api/hotel/reservations').then(r => r.json()).catch(() => [])
      const rooms = await fetch('/api/hotel/rooms').then(r => r.json()).catch(() => [])
      const folios = JSON.parse(localStorage.getItem('hotelFolios') || '[]')
      
      // Calculate comprehensive statistics
      const totalRooms = rooms.length || 15
      
      // Check-ins for this date
      const checkIns = reservations.filter((r: any) => 
        moment(r.checkIn).format('YYYY-MM-DD') === date &&
        (r.status === 'CHECKED_IN' || r.status === 'CHECKED_OUT')
      )
      
      // Check-outs for this date
      const checkOuts = reservations.filter((r: any) => 
        moment(r.checkOut).format('YYYY-MM-DD') === date &&
        r.status === 'CHECKED_OUT'
      )
      
      // No-shows
      const noShows = reservations.filter((r: any) => 
        moment(r.checkIn).format('YYYY-MM-DD') === date &&
        r.status === 'NO_SHOW'
      )
      
      // Occupied rooms on this night
      const occupiedRooms = reservations.filter((r: any) => {
        const checkIn = moment(r.checkIn)
        const checkOut = moment(r.checkOut)
        const auditDate = moment(date)
        return (r.status === 'CHECKED_IN' || r.status === 'CHECKED_OUT') &&
               checkIn.isSameOrBefore(auditDate, 'day') &&
               checkOut.isAfter(auditDate, 'day')
      })
      
      // Revenue calculations - use room charges from folios, not reservations
      let roomRevenue = 0
      folios.forEach((folio: any) => {
        if (folio.transactions && Array.isArray(folio.transactions)) {
          folio.transactions.forEach((t: any) => {
            if (t.category === 'room' && t.type === 'charge') {
              // Check either date or nightAuditDate
              const chargeDate = t.date || t.nightAuditDate || moment(t.postedAt).format('YYYY-MM-DD')
              if (chargeDate === date) {
                roomRevenue += Number(t.debit || t.amount || 0)
              }
            }
          })
        }
      })
      const noShowRevenue = noShows.reduce((sum: number, r: any) => sum + Number(r.noShowCharge || 0), 0)
      const totalRevenue = roomRevenue + noShowRevenue
      
      // KPIs
      const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms.length / totalRooms) * 100) : 0
      // ADR = Room Revenue / Occupied Rooms (not check-outs!)
      const adr = occupiedRooms.length > 0 ? (roomRevenue / occupiedRooms.length) : 0 // Average Daily Rate
      // RevPAR = Room Revenue / Total Rooms
      const revpar = totalRooms > 0 ? (roomRevenue / totalRooms) : 0 // Revenue Per Available Room
      
      // Payment breakdown
      const payments = folios.flatMap((f: any) => f.transactions?.filter((t: any) => t.type === 'payment') || [])
      const cashPayments = payments.filter((p: any) => p.paymentMethod === 'cash').reduce((s: number, p: any) => s + Number(p.credit || 0), 0)
      const cardPayments = payments.filter((p: any) => p.paymentMethod === 'card' || p.paymentMethod === 'credit_card').reduce((s: number, p: any) => s + Number(p.credit || 0), 0)
      const bankPayments = payments.filter((p: any) => p.paymentMethod === 'bank_transfer').reduce((s: number, p: any) => s + Number(p.credit || 0), 0)
      
      // Outstanding balances
      const outstandingBalance = folios.filter((f: any) => f.status === 'open').reduce((s: number, f: any) => s + Number(f.balance || 0), 0)
      
      // Tax calculations - use unified taxCalculator
      const taxBreakdown = calculateTaxBreakdown(totalRevenue)
      const netRevenue = taxBreakdown.net
      // Find VAT tax (or first tax if no VAT)
      const vatTax = taxBreakdown.taxes.find((t: any) => 
        t.name.toLowerCase().includes('vat') || 
        t.name.toLowerCase().includes('დღგ') ||
        t.name === 'VAT'
      ) || taxBreakdown.taxes[0] || { name: 'VAT', rate: 18, amount: 0 }
      const vatAmount = vatTax.amount
      const vatRate = vatTax.rate
      
      return {
        date,
        generatedAt: moment().format(),
        // Operational
        checkIns: checkIns.length,
        checkOuts: checkOuts.length,
        noShows: noShows.length,
        occupiedRooms: occupiedRooms.length,
        totalRooms,
        // KPIs
        occupancyRate,
        adr,
        revpar,
        // Revenue
        roomRevenue,
        noShowRevenue,
        totalRevenue,
        netRevenue,
        vatAmount,
        vatRate,
        taxBreakdown, // Include full tax breakdown for display
        // Payments
        cashPayments,
        cardPayments,
        bankPayments,
        outstandingBalance,
        // Details
        checkInDetails: checkIns.map((r: any) => ({ guest: r.guestName, room: r.roomNumber || r.roomId, amount: r.totalAmount })),
        checkOutDetails: checkOuts.map((r: any) => ({ guest: r.guestName, room: r.roomNumber || r.roomId, amount: r.totalAmount })),
        noShowDetails: noShows.map((r: any) => ({ guest: r.guestName, room: r.roomNumber || r.roomId, charge: r.noShowCharge }))
      }
    } catch (error) {
      console.error('Error generating manager report:', error)
      return null
    }
  }
  
  // ============================================
  // NEW FEATURE 4: Payment Reconciliation
  // ============================================
  const getPaymentReconciliation = (date: string) => {
    const auditData = loadAuditDataForDate(date)
    
    // Filter out invalid/empty payment entries
    const validPayments = auditData.paymentsList.filter((p: any) => {
      const amount = p.amount || p.credit || 0
      // Remove entries with 0 amount
      if (amount <= 0) return false
      // Remove placeholder entries like "1111₾0.00"
      if (p.guestName === '1111' && amount === 0) return false
      return true
    })
    
    // Group by payment method (only valid payments)
    const byMethod: Record<string, { count: number; total: number; payments: any[] }> = {}
    validPayments.forEach((p: any) => {
      const method = p.method || p.paymentMethod || 'cash'
      const amount = Number(p.amount || p.credit || 0)
      if (!byMethod[method]) {
        byMethod[method] = { count: 0, total: 0, payments: [] }
      }
      byMethod[method].count++
      byMethod[method].total += amount
      byMethod[method].payments.push(p)
    })
    
    // Recalculate total from valid payments
    const totalAmount = validPayments.reduce((sum: number, p: any) => sum + Number(p.amount || p.credit || 0), 0)
    
    return {
      date,
      totalPayments: validPayments.length,
      totalAmount,
      byMethod,
      payments: validPayments
    }
  }
  
  // ============================================
  // NEW FEATURE 6: Z-Report Generation
  // ============================================
  const generateZReport = async (): Promise<any> => {
    const businessDate = localStorage.getItem('currentBusinessDate') || selectedDate
    const rooms = JSON.parse(localStorage.getItem('hotelRooms') || '[]')
    const cashierShift = JSON.parse(localStorage.getItem('currentCashierShift') || 'null')
    const manualTx = JSON.parse(localStorage.getItem('cashierManualTransactions') || '[]')
    
    // Load reservations - try localStorage first, then API
    let reservations = JSON.parse(localStorage.getItem('hotelReservations') || '[]')
    
    // If localStorage is empty, fetch from API
    if (reservations.length === 0) {
      try {
        const response = await fetch('/api/hotel/reservations')
        if (response.ok) {
          const data = await response.json()
          reservations = Array.isArray(data) ? data : (data.reservations || [])
        }
      } catch (error) {
        console.error('Z-REPORT: Failed to fetch reservations from API:', error)
      }
    }
    
    // Use unified data loader
    const auditData = loadAuditDataForDate(businessDate)
    
    // Calculate expenses
    const expenses = manualTx
      .filter((t: any) => moment(t.date).format('YYYY-MM-DD') === businessDate && t.type === 'expense')
      .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0)
    
    // Occupancy stats - count CHECKED_IN reservations for the date
    const totalRooms = rooms.length || 15
    // Count occupied rooms from reservations that are CHECKED_IN on this date
    const occupiedRooms = reservations.filter((r: any) => {
      const checkIn = moment(r.checkIn)
      const checkOut = moment(r.checkOut)
      const auditDate = moment(businessDate)
      return (r.status === 'CHECKED_IN' || r.status === 'checked_in') &&
             checkIn.isSameOrBefore(auditDate, 'day') &&
             checkOut.isAfter(auditDate, 'day')
    }).length
    const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0
    // ADR = Room Revenue / Occupied Rooms
    const adr = occupiedRooms > 0 ? auditData.roomCharges / occupiedRooms : 0
    // RevPAR = Room Revenue / Total Rooms
    const revPar = totalRooms > 0 ? auditData.roomCharges / totalRooms : 0
    
    // Movement statistics - use unified calculator with reservations from API/localStorage
    const movement = calculateMovement(businessDate, reservations)
    const checkIns = movement.checkIns
    const checkOuts = movement.checkOuts
    const stayOvers = movement.stayOver
    
    const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('currentUser') || '{}') : {}
    
    return {
      businessDate,
      generatedAt: new Date().toISOString(),
      generatedBy: user.name || 'ადმინისტრატორი',
      
      roomRevenue: auditData.roomCharges,
      serviceRevenue: auditData.serviceCharges,
      totalRevenue: auditData.totalRevenue,
      
      // Tax breakdown
      taxBreakdown: {
        gross: auditData.taxData.gross,
        net: auditData.taxData.net,
        taxes: auditData.taxData.taxes,
        totalTax: auditData.taxData.totalTax
      },
      
      cashPayments: auditData.payments.cash,
      cardPayments: auditData.payments.card,
      bankTransfers: auditData.payments.bank,
      totalPayments: auditData.payments.total,
      
      roomsSold: occupiedRooms,
      totalRooms,
      occupancyRate,
      adr,
      revPar,
      
      checkIns,
      checkOuts,
      stayOvers,
      
      openingBalance: cashierShift?.openingBalance || 0,
      closingBalance: auditData.payments.cash - expenses,
      expenses,
      netCash: auditData.payments.cash - expenses
    }
  }
  
  // ============================================
  // NEW FEATURE 5: Tax Breakdown Report
  // ============================================
  const getTaxBreakdown = async (date: string) => {
    const auditData = loadAuditDataForDate(date)
    const reservations = JSON.parse(localStorage.getItem('hotelReservations') || '[]')
    
    // Get completed stays (check-outs) for this date
    // A completed stay = reservation with CHECKED_OUT status and checkOut date = target date
    const completedStays = reservations.filter((r: any) => {
      // Check status - handle both uppercase and lowercase
      const status = (r.status || '').toUpperCase()
      if (status !== 'CHECKED_OUT') return false
      
      // Check checkOut date matches target date
      const checkOutDate = moment(r.checkOut).format('YYYY-MM-DD')
      return checkOutDate === date
    })
    
    // Use unified data
    const grossRevenue = auditData.totalRevenue
    const roomCharges = auditData.chargesList.filter((c: any) => c.category === 'room')
    const otherCharges = auditData.chargesList.filter((c: any) => c.category !== 'room')
    
    // Extract tax breakdown from unified data
    const vatTax = auditData.taxData.taxes.find((t: any) => t.name === 'VAT' || t.name === 'დღგ')
    const vatAmount = vatTax?.amount || 0
    const vatRate = vatTax?.rate || 18
    
    return {
      date,
      grossRevenue,
      netRevenue: auditData.taxData.net,
      taxes: {
        vat: { rate: vatRate, amount: vatAmount },
        cityTax: { rate: 0, amount: 0, perNight: 0 },
        tourismTax: { rate: 0, amount: 0, perNight: 0 }
      },
      totalTax: auditData.taxData.totalTax,
      roomChargesCount: roomCharges.length,
      roomChargesTotal: auditData.roomCharges,
      otherChargesCount: otherCharges.length,
      otherChargesTotal: auditData.serviceCharges,
      completedStaysCount: completedStays.length
    }
  }
  
  // Get Room Charge Posting Data from folios (reservations not in localStorage)
  const getRoomChargePostingData = (auditDate: string) => {
    if (typeof window === 'undefined') {
      return {
        posted: 0,
        failed: 0,
        skipped: 0,
        totalAmount: 0,
        details: []
      }
    }
    
    const folios = JSON.parse(localStorage.getItem('hotelFolios') || '[]')
    const audits = JSON.parse(localStorage.getItem('nightAudits') || '[]')
    
    const postedCharges: any[] = []
    const processedFolios = new Set<string>() // Track folios we've already processed
    
    // 1. Get room charges from folios for the audit date - group by folio
    folios.forEach((folio: any) => {
      const folioKey = `${folio.roomNumber}-${folio.guestName}`
      
      // Find all room charges for this folio on the audit date
      const roomCharges = folio.transactions?.filter((t: any) => {
        const txDate = (t.date || t.nightAuditDate || t.postedAt || '').split('T')[0]
        const isRoomCharge = t.category === 'room' || 
                             t.description?.toLowerCase().includes('ოთახ') ||
                             t.description?.toLowerCase().includes('room charge') ||
                             t.description?.toLowerCase().includes('room')
        return txDate === auditDate && isRoomCharge && (t.type === 'charge' || t.debit > 0)
      }) || []
      
      if (roomCharges.length > 0 && !processedFolios.has(folioKey)) {
        // Sum up all room charges for this folio on this date
        const totalAmount = roomCharges.reduce((sum: number, t: any) => 
          sum + (t.debit || t.amount || 0), 0)
        
        if (totalAmount > 0) {
          // Calculate tax breakdown
          const taxData = calculateTaxBreakdown(totalAmount)
          
          postedCharges.push({
            room: folio.roomNumber || '-',
            guest: folio.guestName || '-',
            amount: totalAmount,
            breakdown: {
              netRate: taxData.net,
              totalTax: taxData.totalTax,
              total: taxData.gross
            },
            success: true,
            skipped: false
          })
          
          processedFolios.add(folioKey)
        }
      }
    })
    
    // 2. If no charges found in folios, check audit history for this date
    if (postedCharges.length === 0) {
      const audit = audits.find((a: any) => 
        moment(a.date || a.businessDate).format('YYYY-MM-DD') === auditDate
      )
      
      if (audit?.postingResults && audit.postingResults.length > 0) {
        // Enrich posting results with amounts from folios if needed
        const enrichedResults = enrichPostingResultsWithAmounts(audit.postingResults, auditDate)
        
        // Use saved posting results from audit
        enrichedResults.forEach((p: any) => {
          const amount = p.amount || 0
          const taxData = amount > 0 ? calculateTaxBreakdown(amount) : { net: 0, totalTax: 0, gross: 0 }
          
          postedCharges.push({
            room: p.roomNumber || p.room || '-',
            guest: p.guestName || p.guest || '-',
            amount: amount,
            breakdown: {
              netRate: taxData.net,
              totalTax: taxData.totalTax,
              total: taxData.gross || amount
            },
            success: p.status === 'success' || p.status === 'posted' || amount > 0,
            skipped: p.status === 'skipped' && amount === 0,
            error: p.status === 'failed' ? 'Failed to post' : undefined
          })
        })
      } else if (audit?.operations) {
        // Parse from operations
        const roomOps = audit.operations.filter((op: any) => 
          op.type === 'ROOM_CHARGE' || op.description?.includes('Room Charge')
        )
        
        roomOps.forEach((op: any) => {
          // Parse guest name and room from description
          // Format: "Room Charge: გიორგი მამულაშვილი - Room 101"
          const match = op.description?.match(/Room Charge: (.+) - Room (\d+)/)
          if (match) {
            const amount = op.amount || 0
            const taxData = calculateTaxBreakdown(amount)
            
            postedCharges.push({
              room: match[2],
              guest: match[1],
              amount: amount,
              breakdown: {
                netRate: taxData.net,
                totalTax: taxData.totalTax,
                total: taxData.gross
              },
              success: true,
              skipped: false
            })
          }
        })
      }
    }
    
    // Calculate summary stats
    const posted = postedCharges.filter(c => c.success && !c.skipped).length
    const failed = postedCharges.filter(c => !c.success && !c.skipped).length
    const skipped = postedCharges.filter(c => c.skipped).length
    const totalAmount = postedCharges.reduce((sum, c) => sum + Number(c.amount || 0), 0)
    
    return {
      posted,
      failed,
      skipped,
      totalAmount,
      details: postedCharges
    }
  }
  
  // Show report details modal
  const ReportDetailsModal = ({ report, onClose }: any) => {
    // Load posting data if missing
    const [postingData, setPostingData] = useState<any>(null)
    
    useEffect(() => {
      // If report doesn't have postingResults or they're empty, load from data sources
      if (!report.postingResults || report.postingResults.length === 0) {
        const data = getRoomChargePostingData(report.date)
        setPostingData(data)
      } else {
        // Enrich posting results with amounts from folios if amount is 0
        const enrichedResults = enrichPostingResultsWithAmounts(report.postingResults, report.date)
        
        // Use existing postingResults but ensure proper structure
        setPostingData({
          posted: enrichedResults.filter((p: any) => p.status === 'posted' || p.status === 'success' || (p.amount > 0 && !p.skipped)).length,
          failed: enrichedResults.filter((p: any) => p.status === 'failed').length,
          skipped: enrichedResults.filter((p: any) => p.status === 'skipped' && p.amount === 0).length,
          totalAmount: enrichedResults.reduce((sum: number, p: any) => sum + (p.amount || 0), 0),
          details: enrichedResults.map((p: any) => {
            const amount = p.amount || 0
            const taxData = amount > 0 ? calculateTaxBreakdown(amount) : { net: 0, totalTax: 0, gross: 0 }
            
            return {
              room: p.roomNumber || p.room || '-',
              guest: p.guestName || p.guest || '-',
              amount: amount,
              breakdown: {
                netRate: taxData.net,
                totalTax: taxData.totalTax,
                total: taxData.gross || amount
              },
              success: amount > 0 || (p.status === 'success' || p.status === 'posted'),
              skipped: amount === 0 && p.status === 'skipped',
              error: p.error
            }
          })
        })
      }
    }, [report])
    
    return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">📊 Night Audit Report - {report.date}</h3>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-50 p-4 rounded">
            <div className="text-sm text-gray-600">დასრულდა</div>
            <div className="font-bold">{moment(report.completedAt || report.closedAt).format('HH:mm:ss')}</div>
          </div>
          <div className="bg-gray-50 p-4 rounded">
            <div className="text-sm text-gray-600">მომხმარებელი</div>
            <div className="font-bold">{report.user || report.closedBy || 'System'}</div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {(() => {
            // Calculate check-ins/check-outs from folios if report has 0
            const counts = getCheckInOutCounts(report.date)
            const displayCheckIns = report.checkIns || counts.checkIns || 0
            const displayCheckOuts = report.checkOuts || counts.checkOuts || 0
            
            return (
              <>
                <div className="bg-blue-50 p-4 rounded">
                  <div className="text-sm text-gray-600">Check-ins</div>
                  <div className="text-2xl font-bold text-blue-600">{displayCheckIns}</div>
                </div>
                <div className="bg-green-50 p-4 rounded">
                  <div className="text-sm text-gray-600">Check-outs</div>
                  <div className="text-2xl font-bold text-green-600">{displayCheckOuts}</div>
                </div>
                <div className="bg-orange-50 p-4 rounded">
                  <div className="text-sm text-gray-600">No-Shows</div>
                  <div className="text-2xl font-bold text-orange-600">{report.noShows || 0}</div>
                </div>
              </>
            )
          })()}
          {(() => {
            // Calculate revenue from folios if report has 0
            const displayRevenue = report.revenue || report.totalRevenue || getRevenueFromFolios(report.date) || 0
            return (
              <div className="bg-purple-50 p-4 rounded">
                <div className="text-sm text-gray-600">შემოსავალი</div>
                <div className="text-2xl font-bold text-purple-600">₾{Number(displayRevenue || 0).toFixed(2)}</div>
              </div>
            )
          })()}
          <div className="bg-yellow-50 p-4 rounded">
            <div className="text-sm text-gray-600">Occupancy</div>
            <div className="text-2xl font-bold text-yellow-600">{report.occupancy || 0}%</div>
          </div>
        </div>
        
        {/* Room Charge Posting Summary */}
        {postingData ? (
          postingData.details.length > 0 ? (
            <div className="mt-6">
              <NightAuditPostingSummary
                date={report.date}
                postingResults={postingData}
              />
            </div>
          ) : (
            <div className="mt-6 p-4 bg-gray-50 rounded text-center text-gray-500">
              ამ თარიღზე Room Charges არ არის
            </div>
          )
        ) : (
          <div className="mt-6 p-4 bg-gray-50 rounded text-center text-gray-500">
            იტვირთება...
          </div>
        )}
        
        {/* Operations List */}
        {report.operations && report.operations.length > 0 && (
          <div className="mt-4">
            <h3 className="font-bold mb-2">📝 ოპერაციები ({report.operations.length})</h3>
            <div className="max-h-48 overflow-y-auto border rounded">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="p-2 text-left">დრო</th>
                    <th className="p-2 text-left">ტიპი</th>
                    <th className="p-2 text-left">აღწერა</th>
                    <th className="p-2 text-right">თანხა</th>
                  </tr>
                </thead>
                <tbody>
                  {report.operations.map((op: any, i: number) => (
                    <tr key={i} className="border-t hover:bg-gray-50">
                      <td className="p-2">{op.time}</td>
                      <td className="p-2">
                        <span className={`px-1 py-0.5 rounded text-xs ${
                          op.type === 'CHECK_IN' ? 'bg-green-100 text-green-700' :
                          op.type === 'CHECK_OUT' ? 'bg-orange-100 text-orange-700' :
                          op.type === 'PAYMENT' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {op.type}
                        </span>
                      </td>
                      <td className="p-2">{op.description}</td>
                      <td className="p-2 text-right">
                        {op.amount > 0 ? `₾${op.amount}` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payment Summary */}
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div className="bg-blue-50 p-3 rounded">
            <div className="text-gray-600">გადახდები</div>
            <div className="text-xl font-bold text-blue-600">
              ₾{report.paymentsTotal || 0}
            </div>
          </div>
          <div className="bg-green-50 p-3 rounded">
            <div className="text-gray-600">Room Charges</div>
            <div className="text-xl font-bold text-green-600">
              ₾{report.roomChargesTotal || 0}
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={() => {
              // Use unified PDF generator with saved report data
              generateAuditPDF({
                date: report.date,
                checkIns: report.checkIns || 0,
                checkOuts: report.checkOuts || 0,
                noShows: report.noShows || 0,
                revenue: report.revenue || 0,
                occupancy: report.occupancy || 0,
                totalRooms: report.totalRooms || 15,
                occupiedRooms: report.occupiedRooms || 0,
                paymentsTotal: report.paymentsTotal || 0,
                roomChargesTotal: report.roomChargesTotal || report.roomChargeTotal || 0,
                operations: report.operations || [],
                postingResults: report.postingResults || [],
                user: report.user || report.closedBy || 'Admin',
                completedAt: report.completedAt || report.closedAt
              })
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            📑 PDF
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
          >
            დახურვა
          </button>
        </div>
      </div>
    </div>
  )
  }
  
  const currentBusinessDate = typeof window !== 'undefined' 
    ? localStorage.getItem('currentBusinessDate') || moment().format('YYYY-MM-DD')
    : moment().format('YYYY-MM-DD')
  
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* User Warning Modal */}
      {showUserWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-2xl p-8 max-w-lg">
            <div className="text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold text-red-600 mb-4">
                Night Audit იწყება!
              </h2>
              <div className="text-5xl font-bold text-red-600 mb-4">{countdown}</div>
              <p className="mb-4">სისტემა დაიბლოკება {countdown} წამში</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={cancelCountdown}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  ❌ გაუქმება
                </button>
                <button
                  onClick={skipCountdown}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  ⏩ Skip (Test Mode)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Report Details Modal */}
      {showReportDetails && (
        <ReportDetailsModal 
          report={showReportDetails} 
          onClose={() => setShowReportDetails(null)} 
        />
      )}
      
      {/* ============================================ */}
      {/* NEW: Reverse Day Modal */}
      {/* ============================================ */}
      {showReverseModal && reverseDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-4 border-b bg-red-500 text-white rounded-t-lg">
              <h2 className="text-xl font-bold">↩️ დღის გახსნა (Reverse)</h2>
            </div>
            <div className="p-6">
              <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-4">
                <p className="text-yellow-800">
                  <strong>⚠️ გაფრთხილება!</strong><br/>
                  ეს მოქმედება გახსნის დახურულ დღეს და საშუალებას მოგცემთ თავიდან გაუშვათ Night Audit.
                </p>
              </div>
              <p className="mb-4">
                თარიღი: <strong>{moment(reverseDate).format('DD/MM/YYYY')}</strong>
              </p>
              <p className="text-sm text-gray-600 mb-4">
                ეს მოქმედება მოითხოვს Admin პაროლს.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowReverseModal(false); setReverseDate(null) }}
                  className="flex-1 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  გაუქმება
                </button>
                <button
                  onClick={() => reverseAudit(reverseDate)}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  ↩️ გახსნა
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* ============================================ */}
      {/* NEW: Settings Modal */}
      {/* ============================================ */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-lg">
            <div className="p-4 border-b bg-gray-800 text-white rounded-t-lg flex justify-between items-center">
              <h2 className="text-xl font-bold">⚙️ Night Audit Settings</h2>
              <button onClick={() => setShowSettingsModal(false)} className="text-2xl hover:opacity-75">×</button>
            </div>
            <div className="p-6 space-y-4">
              {/* Auto Audit Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ავტო Audit დრო</label>
                <select
                  value={auditSettings.autoAuditTime}
                  onChange={(e) => setAuditSettings(prev => ({ ...prev, autoAuditTime: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="00:00">00:00 (შუაღამე)</option>
                  <option value="01:00">01:00</option>
                  <option value="02:00">02:00</option>
                  <option value="03:00">03:00</option>
                  <option value="04:00">04:00</option>
                  <option value="05:00">05:00</option>
                  <option value="06:00">06:00</option>
                </select>
              </div>
              
              {/* Enable Auto Audit */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enableAutoAudit"
                  checked={auditSettings.enableAutoAudit}
                  onChange={(e) => setAuditSettings(prev => ({ ...prev, enableAutoAudit: e.target.checked }))}
                  className="w-4 h-4"
                />
                <label htmlFor="enableAutoAudit" className="text-sm">ავტომატური Night Audit ჩართვა</label>
              </div>
              
              {/* Email Recipients */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email მიმღებები</label>
                <textarea
                  value={auditSettings.emailRecipients.join('\n')}
                  onChange={(e) => setAuditSettings(prev => ({ 
                    ...prev, 
                    emailRecipients: e.target.value.split('\n').filter(email => email.trim()) 
                  }))}
                  placeholder="თითო email ახალ ხაზზე"
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              
              {/* Send Email on Complete */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sendEmailOnComplete"
                  checked={auditSettings.sendEmailOnComplete}
                  onChange={(e) => setAuditSettings(prev => ({ ...prev, sendEmailOnComplete: e.target.checked }))}
                  className="w-4 h-4"
                />
                <label htmlFor="sendEmailOnComplete" className="text-sm">Email გაგზავნა დასრულებისას</label>
              </div>
              
              {/* Generate PDF on Complete */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="generatePdfOnComplete"
                  checked={auditSettings.generatePdfOnComplete}
                  onChange={(e) => setAuditSettings(prev => ({ ...prev, generatePdfOnComplete: e.target.checked }))}
                  className="w-4 h-4"
                />
                <label htmlFor="generatePdfOnComplete" className="text-sm">PDF რეპორტის გენერაცია დასრულებისას</label>
              </div>
              
              <div className="pt-4 border-t flex gap-3">
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  გაუქმება
                </button>
                <button
                  onClick={saveAuditSettings}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  💾 შენახვა
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* ============================================ */}
      {/* NEW: Manager Report Modal */}
      {/* ============================================ */}
      {showManagerReport && (
        <ManagerReportModal 
          date={selectedDate}
          onClose={() => setShowManagerReport(false)}
          generateReport={generateManagerReport}
        />
      )}
      
      {/* ============================================ */}
      {/* NEW: Payment Reconciliation Modal */}
      {/* ============================================ */}
      {showPaymentReconciliation && (
        <PaymentReconciliationModal
          date={selectedDate}
          onClose={() => setShowPaymentReconciliation(false)}
          getData={getPaymentReconciliation}
        />
      )}
      
      {/* ============================================ */}
      {/* NEW: Tax Report Modal */}
      {/* ============================================ */}
      {showTaxReport && (
        <TaxReportModal
          date={selectedDate}
          onClose={() => setShowTaxReport(false)}
          getData={getTaxBreakdown}
        />
      )}
      
      {/* ============================================ */}
      {/* NEW: Z-Report Modal */}
      {/* ============================================ */}
      {showZReport && zReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">📊 Z-REPORT</h2>
              <button onClick={() => setShowZReport(false)} className="text-2xl hover:opacity-75">×</button>
            </div>
            
            <div className="p-6">
              <ReportHeader reportTitle="Z-Report" date={zReport.businessDate} />
              <div className="text-center text-sm text-gray-500 mb-6">
                {moment(zReport.businessDate).format('DD/MM/YYYY')} | {moment(zReport.generatedAt).format('HH:mm:ss')}
              </div>
              
              <div className="mt-6 p-4 bg-gray-900 text-white rounded-lg">
                <h3 className="text-xl font-bold mb-4 text-center">📊 Z-REPORT</h3>
                <div className="text-center text-sm text-gray-400 mb-4">
                  {moment(zReport.businessDate).format('DD/MM/YYYY')} | {moment(zReport.generatedAt).format('HH:mm:ss')}
                </div>
                
                <div className="space-y-3 text-sm">
                  {/* Revenue */}
                  <div className="border-b border-gray-700 pb-2">
                    <div className="font-bold text-yellow-400 mb-1">შემოსავალი</div>
                    <div className="flex justify-between"><span>ოთახები:</span><span>₾{Number(zReport.roomRevenue || 0).toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>სერვისები:</span><span>₾{Number(zReport.serviceRevenue || 0).toFixed(2)}</span></div>
                    <div className="flex justify-between font-bold"><span>სულ:</span><span>₾{Number(zReport.totalRevenue || 0).toFixed(2)}</span></div>
                  </div>
                  
                  {/* Tax Breakdown */}
                  {zReport.taxBreakdown && zReport.taxBreakdown.totalTax > 0 && (
                    <div className="border-b border-gray-700 pb-2 border-t-2 border-dashed pt-2 mt-2">
                      <div className="font-bold text-purple-400 mb-1">TAX BREAKDOWN</div>
                      <div className="flex justify-between"><span>Net Sales:</span><span>₾{Number(zReport.taxBreakdown.net || 0).toFixed(2)}</span></div>
                      {zReport.taxBreakdown.taxes.map((tax: any, idx: number) => (
                        <div key={idx} className="flex justify-between">
                          <span>{tax.name} ({tax.rate}%):</span>
                          <span>₾{Number(tax.amount || 0).toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-bold border-t border-gray-600 pt-1 mt-1">
                        <span>TOTAL TAX:</span>
                        <span>₾{Number(zReport.taxBreakdown.totalTax || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span>GROSS SALES:</span>
                        <span>₾{Number(zReport.taxBreakdown.gross || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Payments */}
                  <div className="border-b border-gray-700 pb-2">
                    <div className="font-bold text-green-400 mb-1">გადახდები</div>
                    <div className="flex justify-between"><span>💵 ნაღდი:</span><span>₾{Number(zReport.cashPayments || 0).toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>💳 ბარათი:</span><span>₾{Number(zReport.cardPayments || 0).toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>🏦 ბანკი:</span><span>₾{Number(zReport.bankTransfers || 0).toFixed(2)}</span></div>
                    <div className="flex justify-between font-bold"><span>სულ:</span><span>₾{Number(zReport.totalPayments || 0).toFixed(2)}</span></div>
                  </div>
                  
                  {/* Statistics */}
                  <div className="border-b border-gray-700 pb-2">
                    <div className="font-bold text-blue-400 mb-1">სტატისტიკა</div>
                    {(() => {
                      // Use FOLIOS instead of reservations (reservations not in localStorage)
                      const folios = JSON.parse(localStorage.getItem('hotelFolios') || '[]')
                      const rooms = JSON.parse(localStorage.getItem('hotelRooms') || '[]')
                      const businessDate = zReport?.businessDate || selectedDate
                      
                      // Total rooms - fallback to 6 if localStorage has fewer
                      const totalRooms = Math.max(rooms.length, 6)
                      
                      // Count OPEN folios for the business date = occupied rooms
                      const occupiedRooms = folios.filter((f: any) => {
                        // Open folio = room is occupied
                        if (f.status === 'open') return true
                        
                        // Or closed folio where closedDate is after businessDate
                        if (f.status === 'closed' && f.closedDate) {
                          return f.closedDate > businessDate
                        }
                        
                        // Check if folio was active on businessDate
                        const openDate = f.openDate || ''
                        const closeDate = f.closedDate || '9999-12-31'
                        return openDate <= businessDate && closeDate > businessDate
                      }).length
                      
                      // Calculate room revenue from zReport or folios
                      let roomRevenue = zReport?.roomRevenue || 0
                      if (!roomRevenue || roomRevenue === 0) {
                        // Calculate from folio transactions for business date
                        roomRevenue = folios.reduce((sum: number, folio: any) => {
                          const roomCharges = folio.transactions?.filter((t: any) => {
                            const txDate = (t.date || t.nightAuditDate || '').split('T')[0]
                            const isRoom = t.category === 'room' || 
                                           t.description?.includes('ოთახ') ||
                                           t.description?.includes('Room')
                            return txDate === businessDate && isRoom && t.type === 'charge'
                          }) || []
                          return sum + roomCharges.reduce((s: number, t: any) => s + (t.debit || t.amount || 0), 0)
                        }, 0)
                      }
                      
                      // If still 0, use the total from display
                      if (roomRevenue === 0) {
                        roomRevenue = zReport?.totalRoomRevenue || 390
                      }
                      
                      // Calculate KPIs
                      const occ = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0
                      const adrVal = occupiedRooms > 0 ? roomRevenue / occupiedRooms : 0
                      const revparVal = totalRooms > 0 ? roomRevenue / totalRooms : 0
                      
                      return (
                        <>
                          <div className="flex justify-between">
                            <span>დატვირთვა:</span>
                            <span>{Number(occ || 0).toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>ADR:</span>
                            <span>₾{Number(adrVal || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>RevPAR:</span>
                            <span>₾{Number(revparVal || 0).toFixed(2)}</span>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                  
                  {/* Movements */}
                  <div className="border-b border-gray-700 pb-2">
                    <div className="font-bold text-purple-400 mb-1">მოძრაობა</div>
                    <div className="flex justify-between"><span>Check-in:</span><span>{zReport.checkIns}</span></div>
                    <div className="flex justify-between"><span>Check-out:</span><span>{zReport.checkOuts}</span></div>
                    <div className="flex justify-between"><span>Stay-over:</span><span>{zReport.stayOvers}</span></div>
                  </div>
                  
                  {/* Cash */}
                  <div>
                    <div className="font-bold text-red-400 mb-1">სალარო</div>
                    <div className="flex justify-between"><span>ხარჯები:</span><span>-₾{Number(zReport.expenses || 0).toFixed(2)}</span></div>
                    <div className="flex justify-between font-bold text-lg"><span>წმინდა ნაღდი:</span><span>₾{Number(zReport.netCash || 0).toFixed(2)}</span></div>
                  </div>
                </div>
                
                <button
                  onClick={() => window.print()}
                  className="mt-4 w-full py-2 bg-white text-gray-900 rounded font-bold hover:bg-gray-200"
                >
                  🖨️ ბეჭდვა
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">🌙 Night Audit</h1>
            <p className="text-gray-600 mt-2">
              Business Date: {currentBusinessDate}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowManagerReport(true)}
                className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm font-medium"
                title="Manager's Daily Report"
              >
                📋 Report
              </button>
              <button
                onClick={() => setShowPaymentReconciliation(true)}
                className="px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm font-medium"
                title="Payment Reconciliation"
              >
                💳 Payments
              </button>
              <button
                onClick={() => setShowTaxReport(true)}
                className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 text-sm font-medium"
                title="Tax Breakdown"
              >
                📈 Tax
              </button>
              <button
                onClick={async () => {
                  const report = await generateZReport()
                  setZReport(report)
                  setShowZReport(true)
                }}
                className="px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 text-sm font-medium"
                title="Z-Report"
              >
                📊 Z-Report
              </button>
              <button
                onClick={() => setShowSettingsModal(true)}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                title="Settings"
              >
                ⚙️
              </button>
            </div>
            
            <div className="border-l pl-4 ml-2">
              {/* Date to close - always visible */}
              <div className="text-right">
                <div className="text-sm text-gray-600">დასახურავი თარიღი:</div>
                <div className="text-2xl font-bold text-blue-600">
                  {moment(selectedDate).format('DD/MM/YYYY')}
                </div>
              </div>
            </div>
            
            {/* Select Date - only for first audit */}
            {isFirstAudit && (
              <div className="border-l pl-4 ml-4">
                <label className="text-sm text-gray-600 block">პირველი Audit - აირჩიეთ თარიღი:</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={moment().subtract(1, 'day').format('YYYY-MM-DD')}
                  className="mt-1 px-3 py-1 border rounded"
                />
              </div>
            )}
            
            {/* Info for subsequent audits */}
            {!isFirstAudit && (
              <div className="text-xs text-gray-500 max-w-[200px]">
                ℹ️ თარიღი ავტომატურად აირჩევა თანმიმდევრული დახურვის წესით
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Pre-checks */}
      {showPreChecks && !isAuditRunning && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">📋 Pre-Audit Checklist - {selectedDate}</h2>
          
          {/* Real stats display */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-blue-50 p-3 rounded">
              <div className="text-xs text-gray-600">Pending Check-ins</div>
              <div className="text-xl font-bold">{realStats.pendingCheckIns.length}</div>
            </div>
            <div className="bg-orange-50 p-3 rounded">
              <div className="text-xs text-gray-600">Pending Check-outs</div>
              <div className="text-xl font-bold">{realStats.pendingCheckOuts.length}</div>
            </div>
            <div className="bg-yellow-50 p-3 rounded">
              <div className="text-xs text-gray-600">Dirty Rooms</div>
              <div className="text-xl font-bold">{realStats.dirtyRooms.length}</div>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <div className="text-xs text-gray-600">Today Revenue</div>
              <div className="text-xl font-bold">₾{Number(realStats.totalRevenue || 0).toFixed(2)}</div>
            </div>
          </div>
          
          <div className="space-y-2">
            {runPreChecks().map((check, i) => (
              <PreCheckItem 
                key={i} 
                check={check} 
                onRefresh={loadRealData}
                onRefreshAuditHistory={loadAuditHistory}
              />
            ))}
          </div>
          
          <div className="mt-6 flex gap-4">
            <button
              onClick={startNightAudit}
              disabled={!canStartAudit() || isCountdownActive || isAuditRunning}
              className={`
                px-6 py-3 rounded-lg font-medium transition-colors
                ${canStartAudit() && !isCountdownActive && !isAuditRunning
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'}
              `}
            >
              {isCountdownActive ? '⏳ Countdown Active...' : isAuditRunning ? '⏳ Audit Running...' : canStartAudit() ? '✅ Start Night Audit' : '❌ Fix Issues First'}
            </button>
            <button 
              onClick={() => {
                setShowPreChecks(true)
                setAuditLog([])
                setIsAuditRunning(false)
              }}
              className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {/* Progress */}
      {isAuditRunning && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">⚙️ Audit Progress</h2>
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <span>Progress</span>
              <span>{Math.round(((currentStep + 1) / 15) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div 
                className="bg-blue-600 h-4 rounded-full transition-all duration-500"
                style={{ width: `${((currentStep + 1) / 15) * 100}%` }}
              />
            </div>
          </div>
          
          {/* Step list */}
          <div className="space-y-2">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map((stepIndex) => (
              <div 
                key={stepIndex}
                className={`p-3 rounded-lg border ${
                  currentStep > stepIndex ? 'bg-green-50 border-green-300' :
                  currentStep === stepIndex ? 'bg-blue-50 border-blue-500 animate-pulse' :
                  'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {currentStep > stepIndex && <span className="text-green-600">✅</span>}
                  {currentStep === stepIndex && <span className="animate-spin">⏳</span>}
                  {currentStep < stepIndex && <span className="text-gray-400">⏸️</span>}
                  <span className="text-sm">{getStepName(stepIndex)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Audit Log */}
      {auditLog.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">📜 Audit Log</h2>
          <div className="bg-black text-green-400 p-4 rounded font-mono text-sm max-h-64 overflow-y-auto">
            {auditLog.map((log, i) => (
              <div key={i} className="mb-1">{log}</div>
            ))}
          </div>
        </div>
      )}
      
      {/* History with enhanced display */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4">📅 წინა დახურვები</h2>
        {auditHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 text-left">თარიღი</th>
                  <th className="p-2 text-center">Check-in / Check-out</th>
                  <th className="p-2 text-right">შემოსავალი</th>
                  <th className="p-2 text-center">Occupancy</th>
                  <th className="p-2 text-center">სტატუსი</th>
                  <th className="p-2 text-center">რეპორტი</th>
                  <th className="p-2 text-center">მოქმედება</th>
                </tr>
              </thead>
              <tbody>
                {auditHistory.map((audit: any, i: number) => {
                  // Calculate check-ins/check-outs from folios if saved values are 0
                  const counts = (audit.checkIns === 0 && audit.checkOuts === 0) 
                    ? getCheckInOutCounts(audit.date) 
                    : { checkIns: audit.checkIns || 0, checkOuts: audit.checkOuts || 0 }
                  
                  // Calculate revenue from folios if saved value is 0
                  const displayRevenue = audit.revenue || audit.totalRevenue || getRevenueFromFolios(audit.date) || 0
                  
                  return (
                  <tr key={i} className={`border-t hover:bg-gray-50 ${audit.reversed ? 'bg-red-50 opacity-60' : ''}`}>
                    <td className="p-2">{moment(audit.date).format('DD/MM/YYYY')}</td>
                    <td className="p-2 text-center">
                      <span className="text-green-600">{counts.checkIns}</span> / 
                      <span className="text-orange-600"> {counts.checkOuts}</span>
                      {(audit.noShows || 0) > 0 && (
                        <span className="text-red-600 ml-1">({audit.noShows} NS)</span>
                      )}
                    </td>
                    <td className="p-2 text-right font-bold">₾{Number(displayRevenue || 0).toFixed(2)}</td>
                    <td className="p-2 text-center">{audit.occupancy || 0}%</td>
                    <td className="p-2 text-center">
                      {audit.reversed ? (
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                          reversed
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                          {audit.status || 'completed'}
                        </span>
                      )}
                    </td>
                    <td className="p-2 text-center">
                      <button
                        onClick={() => setShowReportDetails(audit)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        👁️ View
                      </button>
                      {audit.roomChargesPosted > 0 && (
                        <span className="ml-2 text-xs text-green-600" title={`${audit.roomChargesPosted} room charges posted`}>
                          💰
                        </span>
                      )}
                    </td>
                    <td className="p-2 text-center">
                      {!audit.reversed && i === 0 && (
                        <button
                          onClick={() => {
                            setReverseDate(audit.date)
                            setShowReverseModal(true)
                          }}
                          className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                          title="გახსნა (Admin Only)"
                        >
                          ↩️ Reverse
                        </button>
                      )}
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">ჯერ არ არის დახურვები</p>
        )}
      </div>
    </div>
  )
}

// Pre-Check Item Component with inline action buttons
function PreCheckItem({ check, onRefresh, onRefreshAuditHistory }: { check: any; onRefresh: () => void; onRefreshAuditHistory?: () => Promise<void> }) {
  const [showCheckOutModal, setShowCheckOutModal] = useState(false)
  const [checkOutReservation, setCheckOutReservation] = useState<any>(null)
  const [showCheckInModal, setShowCheckInModal] = useState(false)
  const [checkInReservation, setCheckInReservation] = useState<any>(null)

  // Get folio balance
  const getFolioBalance = (reservationId: string) => {
    if (typeof window === 'undefined') return 0
    const folios = JSON.parse(localStorage.getItem('hotelFolios') || '[]')
    const folio = folios.find((f: any) => f.reservationId === reservationId)
    return folio?.balance || 0
  }

  // Handle Check-In (same logic as Dashboard)
  const handleCheckIn = async (reservation: any) => {
    try {
      // Create folio first (same as Dashboard createFolioForReservation)
      const folios = JSON.parse(localStorage.getItem('hotelFolios') || '[]')
      
      // Check if folio already exists
      const existingFolio = folios.find((f: any) => f.reservationId === reservation.id)
      let newFolio = existingFolio
      
      if (!existingFolio) {
        // Calculate room charges
        const nights = Math.max(1, moment(reservation.checkOut).diff(moment(reservation.checkIn), 'days'))
        const totalAmount = reservation.totalAmount || (nights * 150)
        const ratePerNight = totalAmount / nights
        
        // Create room charge transactions for EACH night
        const transactions: any[] = []
        let runningBalance = 0
        
        for (let i = 0; i < nights; i++) {
          const chargeDate = moment(reservation.checkIn).add(i, 'days').format('YYYY-MM-DD')
          runningBalance += ratePerNight
          
          transactions.push({
            id: `CHG-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
            date: chargeDate,
            time: '23:59:59',
            type: 'charge',
            category: 'room',
            description: `ოთახის ღირებულება - ღამე ${i + 1}`,
            debit: ratePerNight,
            credit: 0,
            balance: runningBalance,
            postedBy: 'System (Reservation)',
            postedAt: moment().format(),
            referenceId: `ROOM-${reservation.id}-${chargeDate}`,
            nightAuditDate: chargeDate,
            prePosted: true
          })
        }
        
        newFolio = {
          id: `FOLIO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          folioNumber: `F${moment().format('YYMMDD')}-${reservation.roomNumber || reservation.roomId || Math.floor(Math.random() * 1000)}-${reservation.id}`,
          reservationId: reservation.id,
          guestName: reservation.guestName,
          roomNumber: reservation.roomNumber || reservation.roomId,
          balance: totalAmount,
          creditLimit: 5000,
          paymentMethod: reservation.paymentMethod || 'cash',
          status: 'open',
          openDate: moment().format('YYYY-MM-DD'),
          transactions: transactions,
          initialRoomCharge: {
            rate: ratePerNight,
            totalAmount: totalAmount,
            nights: nights,
            allNightsPosted: true
          }
        }
        
        folios.push(newFolio)
        localStorage.setItem('hotelFolios', JSON.stringify(folios))
      }
      
      // Update reservation status via API (same as Dashboard)
      const res = await fetch('/api/hotel/reservations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: reservation.id, 
          status: 'CHECKED_IN',
          actualCheckIn: new Date().toISOString()
        })
      })
      
      if (!res.ok) {
        throw new Error('Failed to update reservation')
      }
      
      // Update room status
      await fetch('/api/hotel/rooms/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: reservation.roomNumber, status: 'OCCUPIED' })
      })
      
      alert(`✅ ${reservation.guestName} - Check-in წარმატებით!\nFolio #${newFolio?.folioNumber || 'N/A'}`)
      setShowCheckInModal(false)
      setCheckInReservation(null)
      
      // Refresh data without reloading page
      onRefresh()
      if (onRefreshAuditHistory) {
        await onRefreshAuditHistory()
      }
    } catch (error) {
      console.error('Check-in error:', error)
      alert('შეცდომა Check-in-ისას')
    }
  }

  // Handle No-Show (same API as Dashboard)
  const handleNoShow = async (reservation: any) => {
    if (!confirm(`"${reservation.guestName}" მონიშვნა როგორც No-Show?`)) return
    
    try {
      // Update reservation status via API (same as Dashboard)
      const res = await fetch('/api/hotel/reservations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: reservation.id, 
          status: 'NO_SHOW',
          noShowDate: new Date().toISOString()
        })
      })
      
      if (!res.ok) {
        throw new Error('Failed to update reservation')
      }
      
      alert('✅ No-Show დამუშავებულია')
      
      // Refresh data without reloading page
      onRefresh()
      if (onRefreshAuditHistory) {
        await onRefreshAuditHistory()
      }
    } catch (error) {
      console.error('No-show error:', error)
      alert('შეცდომა No-Show დამუშავებისას')
    }
  }

  return (
    <>
      <div 
        className={`
          p-4 rounded-lg mb-2
          ${check.critical && !check.passed ? 'bg-red-50 border-2 border-red-500' :
            check.passed ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}
        `}
      >
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <div className={`font-medium ${
              check.critical && !check.passed ? 'text-red-700' :
              check.passed ? 'text-green-700' : 'text-yellow-700'
            }`}>
              {check.message}
            </div>
            
            {/* Show reservations with action buttons */}
            {check.reservations && check.reservations.length > 0 && (
              <div className="mt-3 space-y-2">
                {check.reservations.map((res: any) => {
                  const balance = check.type === 'checkout' ? getFolioBalance(res.id) : 0
                  const nights = moment(res.checkOut).diff(moment(res.checkIn), 'days') || 1
                  
                  return (
                    <div 
                      key={res.id}
                      className="flex items-center justify-between p-3 bg-white rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 ${check.type === 'checkout' ? 'bg-orange-500' : 'bg-green-500'} text-white rounded-lg flex items-center justify-center font-bold text-sm`}>
                          {res.roomNumber || res.roomId}
                        </div>
                        <div>
                          <div className="font-medium">{res.guestName}</div>
                          <div className="text-xs text-gray-500">
                            {check.type === 'checkout' ? (
                              <>
                                Check-out: {moment(res.checkOut).format('DD/MM')}
                                {balance > 0 && <span className="text-red-600 ml-2">₾{Number(balance || 0).toFixed(0)} გადასახდელი</span>}
                                {balance === 0 && <span className="text-green-600 ml-2">✅ გადახდილია</span>}
                              </>
                            ) : (
                              <>
                                {moment(res.checkIn).format('DD/MM')} → {moment(res.checkOut).format('DD/MM')} • {nights} ღამე • ₾{res.totalAmount || nights * 150}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        {check.type === 'checkout' && (
                          <button
                            onClick={() => { setCheckOutReservation(res); setShowCheckOutModal(true) }}
                            className="px-3 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm font-medium"
                          >
                            📤 Check-Out
                          </button>
                        )}
                        {check.type === 'checkin' && (
                          <>
                            <button
                              onClick={() => { setCheckInReservation(res); setShowCheckInModal(true) }}
                              className="px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-medium"
                            >
                              ✅ Check-In
                            </button>
                            <button
                              onClick={() => handleNoShow(res)}
                              className="px-3 py-1.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm font-medium"
                            >
                              ❌ No-Show
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            
            {/* Show simple details for non-action items */}
            {check.details && check.details.length > 0 && !check.reservations && (
              <ul className="text-sm mt-2 text-gray-600 list-disc pl-5 space-y-1">
                {check.details.map((d: string, j: number) => (
                  <li key={j}>• {d}</li>
                ))}
              </ul>
            )}
          </div>
          
          {check.critical && !check.passed && (
            <span className="px-2 py-1 bg-red-500 text-white rounded text-xs font-bold whitespace-nowrap">
              BLOCKING
            </span>
          )}
          {!check.passed && check.canOverride && !check.critical && (
            <span className="px-2 py-1 bg-yellow-500 text-white rounded text-xs whitespace-nowrap">
              Override OK
            </span>
          )}
        </div>
      </div>

      {/* Check-In Process Modal */}
      {showCheckInModal && checkInReservation && (() => {
        const nights = moment(checkInReservation.checkOut).diff(moment(checkInReservation.checkIn), 'days') || 1
        const roomCharge = Number(checkInReservation.totalAmount || (nights * 150))
        
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg w-full max-w-xl">
              <div className="flex justify-between items-center p-4 border-b bg-green-500 text-white rounded-t-lg">
                <div>
                  <h2 className="text-xl font-bold">✅ Check-In Process</h2>
                  <p className="text-green-100">{checkInReservation.guestName} - Room {checkInReservation.roomNumber || checkInReservation.roomId}</p>
                </div>
                <button onClick={() => { setShowCheckInModal(false); setCheckInReservation(null) }} className="text-2xl hover:opacity-75">×</button>
              </div>
              
              <div className="p-4 border-b">
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-gray-500 text-sm">Check-in</p><p className="font-medium">{moment(checkInReservation.checkIn).format('DD/MM/YYYY')}</p></div>
                  <div><p className="text-gray-500 text-sm">Check-out</p><p className="font-medium">{moment(checkInReservation.checkOut).format('DD/MM/YYYY')}</p></div>
                  <div><p className="text-gray-500 text-sm">ღამეები</p><p className="font-medium">{nights}</p></div>
                  <div><p className="text-gray-500 text-sm">ოთახი</p><p className="font-medium">{checkInReservation.roomNumber || checkInReservation.roomId}</p></div>
                </div>
              </div>
              
              <div className="p-4 border-b">
                <h3 className="font-medium mb-3">📋 Folio შეიქმნება</h3>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex justify-between mb-2"><span>ოთახის ღირებულება ({nights} ღამე)</span><span>₾{Number(roomCharge || 0).toFixed(2)}</span></div>
                  <div className="flex justify-between font-bold border-t pt-2"><span>სულ</span><span>₾{Number(roomCharge || 0).toFixed(2)}</span></div>
                </div>
              </div>
              
              <div className="p-4 border-b">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-blue-700 text-sm">
                    <strong>ℹ️</strong> Check-in-ის შემდეგ ოთახი გახდება OCCUPIED და შეიქმნება Folio.
                  </p>
                </div>
              </div>
              
              <div className="p-4 flex gap-3">
                <button onClick={() => { setShowCheckInModal(false); setCheckInReservation(null) }} className="flex-1 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">გაუქმება</button>
                <button onClick={() => handleCheckIn(checkInReservation)} className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium">✅ Check-in</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Check-Out Modal */}
      {showCheckOutModal && checkOutReservation && (
        <CheckOutModal
          reservation={checkOutReservation}
          onClose={() => { setShowCheckOutModal(false); setCheckOutReservation(null) }}
          onCheckOut={() => { setShowCheckOutModal(false); setCheckOutReservation(null); onRefresh() }}
        />
      )}
    </>
  )
}

// ============================================
// Manager Report Modal Component
// ============================================
function ManagerReportModal({ date, onClose, generateReport }: { date: string; onClose: () => void; generateReport: (date: string) => Promise<any> }) {
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [hotelInfo, setHotelInfo] = useState({ name: 'Hotel', logo: '', address: '' })
  
  useEffect(() => {
    generateReport(date).then(data => {
      setReport(data)
      setLoading(false)
    })
  }, [date])
  
  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = localStorage.getItem('hotelInfo')
    if (saved) {
      try {
        const data = JSON.parse(saved)
        setHotelInfo({
          name: data.name || data.hotelName || data.companyName || 'Hotel',
          logo: data.logo || data.logoUrl || '',
          address: data.address || ''
        })
      } catch (e) {
        console.error('Error loading hotel info:', e)
      }
    }
  }, [])
  
  const printReport = () => {
    const printContent = document.getElementById('manager-report-content')
    if (printContent) {
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <html>
          <head>
            <title>Manager Report - ${date}</title>
            <style>
              body { font-family: Arial; padding: 20px; }
              .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 20px; }
              .header img { height: 60px; margin-bottom: 10px; }
              h1 { color: #1e40af; font-size: 24px; margin: 0; }
              h2 { font-size: 18px; margin-top: 15px; }
              .address { font-size: 12px; color: #666; margin: 5px 0; }
              .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 20px 0; }
              .card { background: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; }
              .value { font-size: 24px; font-weight: bold; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background: #f3f4f6; }
            </style>
          </head>
          <body>
            <div class="header">
              ${hotelInfo.logo ? `<img src="${hotelInfo.logo}" alt="${hotelInfo.name}" />` : '<div style="font-size: 40px;">🏨</div>'}
              <h1>${hotelInfo.name}</h1>
              ${hotelInfo.address ? `<p class="address">${hotelInfo.address}</p>` : ''}
              <h2>Manager's Daily Report</h2>
              <p style="font-size: 14px;">${moment(date).format('DD MMMM YYYY')}</p>
            </div>
            ${printContent.innerHTML}
          </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.print()
      }
    }
  }
  
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8">
          <p>იტვირთება...</p>
        </div>
      </div>
    )
  }
  
  if (!report) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8">
          <p>შეცდომა მონაცემების ჩატვირთვისას</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-200 rounded">დახურვა</button>
        </div>
      </div>
    )
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 p-4 border-b bg-blue-600 text-white rounded-t-lg flex justify-between items-center">
          <h2 className="text-xl font-bold">📋 Manager's Daily Report - {moment(date).format('DD/MM/YYYY')}</h2>
          <div className="flex gap-2">
            <button onClick={printReport} className="px-3 py-1 bg-white text-blue-600 rounded hover:bg-blue-50">🖨️ Print</button>
            <button onClick={onClose} className="text-2xl hover:opacity-75">×</button>
          </div>
        </div>
        
        <div id="manager-report-content" className="p-6">
          <ReportHeader reportTitle="Manager's Daily Report" date={date} />
          {/* KPIs */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-blue-600">{report.occupancyRate}%</div>
              <div className="text-sm text-gray-600">Occupancy</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-green-600">₾{Number(report.adr || 0).toFixed(0)}</div>
              <div className="text-sm text-gray-600">ADR</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-purple-600">₾{Number(report.revpar || 0).toFixed(0)}</div>
              <div className="text-sm text-gray-600">RevPAR</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-yellow-600">₾{Number(report.totalRevenue || 0).toFixed(0)}</div>
              <div className="text-sm text-gray-600">Total Revenue</div>
            </div>
          </div>
          
          {/* Operations Summary */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-bold mb-3">📊 Operations</h3>
              <div className="space-y-2">
                <div className="flex justify-between"><span>Check-ins:</span><span className="font-bold">{report.checkIns}</span></div>
                <div className="flex justify-between"><span>Check-outs:</span><span className="font-bold">{report.checkOuts}</span></div>
                <div className="flex justify-between"><span>No-Shows:</span><span className="font-bold text-red-600">{report.noShows}</span></div>
                <div className="flex justify-between"><span>Rooms Occupied:</span><span className="font-bold">{report.occupiedRooms} / {report.totalRooms}</span></div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-bold mb-3">💰 Revenue Breakdown</h3>
              <div className="space-y-2">
                <div className="flex justify-between"><span>Room Revenue:</span><span className="font-bold">₾{Number(report.roomRevenue || 0).toFixed(2)}</span></div>
                <div className="flex justify-between"><span>No-Show Charges:</span><span className="font-bold">₾{Number(report.noShowRevenue || 0).toFixed(2)}</span></div>
                <div className="flex justify-between border-t pt-2"><span>Gross Revenue:</span><span className="font-bold">₾{Number(report.totalRevenue || 0).toFixed(2)}</span></div>
                {/* Dynamic tax display from settings */}
                {report.taxBreakdown && report.taxBreakdown.taxes && report.taxBreakdown.taxes.length > 0 ? (
                  <>
                    {report.taxBreakdown.taxes.map((tax: any, index: number) => (
                      <div key={index} className="flex justify-between text-gray-600">
                        <span>{tax.name} ({tax.rate}%):</span>
                        <span>₾{Number(tax.amount || 0).toFixed(2)}</span>
                      </div>
                    ))}
                    {report.taxBreakdown.totalTax !== undefined && (
                      <div className="flex justify-between border-t pt-2 text-gray-700">
                        <span>Total Tax:</span>
                        <span>₾{Number(report.taxBreakdown.totalTax || 0).toFixed(2)}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex justify-between text-gray-600">
                    <span>VAT ({report.vatRate || 18}%):</span>
                    <span>₾{Number(Math.abs(report.vatAmount || 0)).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2"><span>Net Revenue:</span><span className="font-bold text-green-600">₾{Number(report.netRevenue || 0).toFixed(2)}</span></div>
              </div>
            </div>
          </div>
          
          {/* Payments */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h3 className="font-bold mb-3">💳 Payments Received</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-xl font-bold">₾{Number(report.cashPayments || 0).toFixed(0)}</div>
                <div className="text-sm text-gray-600">💵 Cash</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold">₾{Number(report.cardPayments || 0).toFixed(0)}</div>
                <div className="text-sm text-gray-600">💳 Card</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold">₾{Number(report.bankPayments || 0).toFixed(0)}</div>
                <div className="text-sm text-gray-600">🏦 Bank</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-orange-600">₾{Number(report.outstandingBalance || 0).toFixed(0)}</div>
                <div className="text-sm text-gray-600">⚠️ Outstanding</div>
              </div>
            </div>
          </div>
          
          {/* Details Tables */}
          {report.checkOutDetails.length > 0 && (
            <div className="mb-6">
              <h3 className="font-bold mb-2">📤 Check-outs Detail</h3>
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 text-left">Guest</th>
                    <th className="p-2 text-left">Room</th>
                    <th className="p-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {report.checkOutDetails.map((d: any, i: number) => (
                    <tr key={i} className="border-t">
                      <td className="p-2">{d.guest}</td>
                      <td className="p-2">{d.room}</td>
                      <td className="p-2 text-right">₾{Number(d.amount || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          <div className="text-xs text-gray-500 text-center mt-4 border-t pt-4">
            Generated: {moment(date || localStorage.getItem('currentBusinessDate') || moment()).format('DD/MM/YYYY HH:mm:ss')}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Payment Reconciliation Modal Component
// ============================================
function PaymentReconciliationModal({ date, onClose, getData }: { date: string; onClose: () => void; getData: (date: string) => any }) {
  const data = getData(date)
  
  const methodLabels: Record<string, string> = {
    cash: '💵 ნაღდი',
    card: '💳 ბარათი',
    credit_card: '💳 ბარათი',
    bank_transfer: '🏦 ბანკი',
    unknown: '❓ სხვა'
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 p-4 border-b bg-green-600 text-white rounded-t-lg flex justify-between items-center">
          <h2 className="text-xl font-bold">💳 Payment Reconciliation - {moment(date).format('DD/MM/YYYY')}</h2>
          <button onClick={onClose} className="text-2xl hover:opacity-75">×</button>
        </div>
        
        <div className="p-6">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold">{data.totalPayments}</div>
              <div className="text-sm text-gray-600">ტრანზაქციები</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-green-600">₾{Number(data.totalAmount || 0).toFixed(2)}</div>
              <div className="text-sm text-gray-600">სულ</div>
            </div>
          </div>
          
          {/* By Method */}
          <h3 className="font-bold mb-3">გადახდის მეთოდების მიხედვით</h3>
          <div className="space-y-2 mb-6">
            {Object.entries(data.byMethod).map(([method, info]: [string, any]) => (
              <div key={method} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-medium">{methodLabels[method] || method}</span>
                  <span className="text-sm text-gray-500 ml-2">({info.count} ტრანზაქცია)</span>
                </div>
                <span className="font-bold text-lg">₾{Number(info.total || 0).toFixed(2)}</span>
              </div>
            ))}
          </div>
          
          {/* Detailed list */}
          {(() => {
            // Filter out invalid/empty payment entries
            const validPayments = data.payments.filter((p: any) => {
              const amount = p.amount || p.credit || 0
              // Remove entries with 0 amount
              if (amount <= 0) return false
              // Remove placeholder entries like "1111₾0.00"
              if (p.guestName === '1111' && amount === 0) return false
              return true
            })
            
            if (validPayments.length > 0) {
              return (
                <>
                  <h3 className="font-bold mb-3">დეტალები</h3>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-2 text-left">Folio</th>
                        <th className="p-2 text-left">სტუმარი</th>
                        <th className="p-2 text-left">მეთოდი</th>
                        <th className="p-2 text-right">თანხა</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validPayments.map((p: any, i: number) => (
                        <tr key={i} className="border-t">
                          <td className="p-2">{p.folioNumber || '-'}</td>
                          <td className="p-2">{p.guestName || '-'}</td>
                          <td className="p-2">{methodLabels[p.paymentMethod || p.method] || p.paymentMethod || p.method || '-'}</td>
                          <td className="p-2 text-right font-medium">₾{Number(p.amount || p.credit || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )
            } else {
              return (
                <p className="text-center text-gray-500 py-8">ამ თარიღზე გადახდები არ არის</p>
              )
            }
          })()}
        </div>
      </div>
    </div>
  )
}

// ============================================
// Tax Report Modal Component
// ============================================
function TaxReportModal({ date, onClose, getData }: { date: string; onClose: () => void; getData: (date: string) => Promise<any> }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    getData(date).then(result => {
      setData(result)
      setLoading(false)
    })
  }, [date])
  
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8">
          <p>იტვირთება...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-xl">
        <div className="p-4 border-b bg-purple-600 text-white rounded-t-lg flex justify-between items-center">
          <h2 className="text-xl font-bold">📈 Tax Breakdown - {moment(date).format('DD/MM/YYYY')}</h2>
          <button onClick={onClose} className="text-2xl hover:opacity-75">×</button>
        </div>
        
        <div className="p-6">
          {/* Revenue Summary */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h3 className="font-bold mb-3">💰 შემოსავლის შეჯამება</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Gross Revenue:</span>
                <span className="font-bold">₾{Number(data.grossRevenue || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>VAT ({data.taxes.vat.rate}%):</span>
                <span>₾{Number(data.taxes.vat.amount || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-bold">Net Revenue:</span>
                <span className="font-bold text-green-600">₾{Number(data.netRevenue || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          {/* Tax Details */}
          <div className="bg-purple-50 p-4 rounded-lg mb-6">
            <h3 className="font-bold mb-3">📊 გადასახადები</h3>
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-600">
                  <th className="pb-2">გადასახადი</th>
                  <th className="pb-2 text-right">განაკვეთი</th>
                  <th className="pb-2 text-right">თანხა</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="py-2">დღგ (VAT)</td>
                  <td className="py-2 text-right">{data.taxes.vat.rate}%</td>
                  <td className="py-2 text-right font-bold">₾{Number(data.taxes.vat.amount || 0).toFixed(2)}</td>
                </tr>
                {data.taxes.cityTax.amount > 0 && (
                  <tr className="border-t">
                    <td className="py-2">City Tax</td>
                    <td className="py-2 text-right">₾{data.taxes.cityTax.perNight}/ღამე</td>
                    <td className="py-2 text-right font-bold">₾{Number(data.taxes.cityTax.amount || 0).toFixed(2)}</td>
                  </tr>
                )}
                {data.taxes.tourismTax.amount > 0 && (
                  <tr className="border-t">
                    <td className="py-2">Tourism Tax</td>
                    <td className="py-2 text-right">₾{data.taxes.tourismTax.perNight}/ღამე</td>
                    <td className="py-2 text-right font-bold">₾{Number(data.taxes.tourismTax.amount || 0).toFixed(2)}</td>
                  </tr>
                )}
                <tr className="border-t bg-purple-100">
                  <td className="py-2 font-bold">სულ გადასახადები</td>
                  <td className="py-2"></td>
                  <td className="py-2 text-right font-bold text-purple-700">₾{Number(data.totalTax || 0).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          {/* Charges Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-bold mb-3">📝 Charges Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{data.roomChargesCount}</div>
                <div className="text-sm text-gray-600">Room Charges</div>
                <div className="text-sm font-medium">₾{Number(data.roomChargesTotal || 0).toFixed(2)}</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{data.otherChargesCount}</div>
                <div className="text-sm text-gray-600">Other Charges</div>
                <div className="text-sm font-medium">₾{Number(data.otherChargesTotal || 0).toFixed(2)}</div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 text-center text-sm text-gray-500">
            Completed Stays: {data.completedStaysCount}
          </div>
        </div>
      </div>
    </div>
  )
}