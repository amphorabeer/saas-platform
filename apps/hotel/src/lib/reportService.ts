import moment from 'moment'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

// PDF Report Generator
export const generatePDFReport = async (data: any, auditDate: string) => {
  const pdf = new jsPDF()
  const pageWidth = pdf.internal.pageSize.width
  
  // Header
  pdf.setFontSize(20)
  pdf.text('HOTEL TBILISI', pageWidth / 2, 20, { align: 'center' })
  pdf.setFontSize(16)
  pdf.text('NIGHT AUDIT REPORT', pageWidth / 2, 30, { align: 'center' })
  pdf.setFontSize(12)
  pdf.text(`Date: ${moment(auditDate).format('DD/MM/YYYY')}`, pageWidth / 2, 40, { align: 'center' })
  
  let yPosition = 50
  
  // 1. Room Summary
  pdf.setFontSize(14)
  pdf.text('1. ROOM SUMMARY', 14, yPosition)
  yPosition += 10
  
  const roomData = [
    ['Total Rooms', data.totalRooms || data.roomDetails?.totalRooms || 0],
    ['Occupied', data.occupiedRooms || data.roomDetails?.occupied || 0],
    ['Vacant', data.vacantRooms || data.roomDetails?.vacant || 0],
    ['Out of Order', data.outOfOrderRooms || data.roomDetails?.maintenance || 0],
    ['Occupancy %', `${data.occupancyRate || data.roomDetails?.occupancy || 0}%`]
  ]
  
  ;(pdf as any).autoTable({
    startY: yPosition,
    head: [['Description', 'Count']],
    body: roomData,
    theme: 'striped',
    headStyles: { fillColor: [41, 128, 185] }
  })
  
  yPosition = (pdf as any).lastAutoTable.finalY + 15
  
  // 2. Financial Summary
  pdf.setFontSize(14)
  pdf.text('2. FINANCIAL SUMMARY', 14, yPosition)
  yPosition += 10
  
  const financialData = [
    ['Room Revenue', `₾${data.roomRevenue || data.accountDetails?.revenue || 0}`],
    ['F&B Revenue', `₾${data.fnbRevenue || 0}`],
    ['Other Services', `₾${data.otherRevenue || 0}`],
    ['Taxes (VAT 18%)', `₾${data.vatAmount || 0}`],
    ['City Tax (1%)', `₾${data.cityTaxAmount || 0}`],
    ['TOTAL REVENUE', `₾${data.totalRevenue || data.accountDetails?.revenue || 0}`]
  ]
  
  ;(pdf as any).autoTable({
    startY: yPosition,
    head: [['Category', 'Amount']],
    body: financialData,
    theme: 'striped',
    headStyles: { fillColor: [39, 174, 96] }
  })
  
  yPosition = (pdf as any).lastAutoTable.finalY + 15
  
  // 3. Guest Movement
  pdf.setFontSize(14)
  pdf.text('3. GUEST MOVEMENT', 14, yPosition)
  yPosition += 10
  
  const guestData = [
    ['Check-ins', data.checkIns || data.accountDetails?.checkIns || 0],
    ['Check-outs', data.checkOuts || data.accountDetails?.checkOuts || 0],
    ['No Shows', data.noShows || 0],
    ['Cancellations', data.cancellations || 0],
    ['Early Check-ins', data.earlyCheckIns || 0],
    ['Late Check-outs', data.lateCheckOuts || 0],
    ['In-House Guests', data.inHouseGuests || 0]
  ]
  
  ;(pdf as any).autoTable({
    startY: yPosition,
    head: [['Type', 'Count']],
    body: guestData,
    theme: 'striped',
    headStyles: { fillColor: [142, 68, 173] }
  })
  
  // New page for detailed listings
  pdf.addPage()
  yPosition = 20
  
  // 4. Pending Folios
  pdf.setFontSize(14)
  pdf.text('4. PENDING FOLIOS', 14, yPosition)
  yPosition += 10
  
  if (data.pendingFolios && data.pendingFolios.length > 0) {
    const folioData = data.pendingFolios.map((f: any) => [
      f.folioNumber,
      f.guestName,
      f.roomNumber,
      `₾${f.balance}`
    ])
    
    ;(pdf as any).autoTable({
      startY: yPosition,
      head: [['Folio #', 'Guest', 'Room', 'Balance']],
      body: folioData,
      theme: 'striped',
      headStyles: { fillColor: [231, 76, 60] }
    })
    
    yPosition = (pdf as any).lastAutoTable.finalY + 15
  }
  
  // 5. Cashier Summary
  pdf.setFontSize(14)
  pdf.text('5. CASHIER SUMMARY', 14, yPosition)
  yPosition += 10
  
  const cashierData = [
    ['Opening Balance', `₾${data.openingBalance || 0}`],
    ['Cash Collected', `₾${data.cashCollected || data.revenueSummary?.cash || 0}`],
    ['Card Payments', `₾${data.cardPayments || data.revenueSummary?.card || 0}`],
    ['Total Collected', `₾${data.totalCollected || 0}`],
    ['Cash Withdrawn', `₾${data.cashWithdrawn || 0}`],
    ['Closing Balance', `₾${data.closingBalance || 0}`]
  ]
  
  ;(pdf as any).autoTable({
    startY: yPosition,
    head: [['Description', 'Amount']],
    body: cashierData,
    theme: 'striped',
    headStyles: { fillColor: [52, 152, 219] }
  })
  
  // Footer
  pdf.setFontSize(10)
  pdf.text(
    `Generated: ${moment().format('DD/MM/YYYY HH:mm')} | User: ${data.auditUser || 'System'}`,
    pageWidth / 2,
    pdf.internal.pageSize.height - 10,
    { align: 'center' }
  )
  
  // Return as blob
  return pdf.output('blob')
}

// Email Service
export const sendEmailReport = async (pdfBlob: Blob, auditDate: string) => {
  try {
    // Convert blob to base64
    const reader = new FileReader()
    const base64Promise = new Promise<string>((resolve) => {
      reader.onloadend = () => {
        const base64 = reader.result?.toString().split(',')[1] || ''
        resolve(base64)
      }
    })
    reader.readAsDataURL(pdfBlob)
    const base64PDF = await base64Promise
    
    // Email configuration
    const emailData = {
      to: ['manager@hotel.com', 'accounts@hotel.com', 'owner@hotel.com'],
      subject: `Night Audit Report - ${moment(auditDate).format('DD/MM/YYYY')}`,
      body: `
        <h2>Night Audit Completed Successfully</h2>
        <p>Dear Management,</p>
        <p>The Night Audit for ${moment(auditDate).format('DD MMMM YYYY')} has been completed.</p>
        <h3>Summary:</h3>
        <ul>
          <li>Occupancy Rate: ${localStorage.getItem('lastOccupancy') || '0'}%</li>
          <li>Total Revenue: ₾${localStorage.getItem('lastRevenue') || '0'}</li>
          <li>Check-ins: ${localStorage.getItem('lastCheckIns') || '0'}</li>
          <li>Check-outs: ${localStorage.getItem('lastCheckOuts') || '0'}</li>
        </ul>
        <p>Please find the detailed report attached.</p>
        <p>Best regards,<br/>Hotel Management System</p>
      `,
      attachments: [
        {
          filename: `night-audit-${auditDate}.pdf`,
          content: base64PDF,
          type: 'application/pdf'
        }
      ]
    }
    
    // Try to send via API first
    try {
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailData)
      })
      
      const result = await response.json()
      
      if (result.success) {
        if (result.queued) {
          console.log('📧 Email queued (SMTP not configured):', emailData)
          // Fallback to localStorage
          const emailQueue = JSON.parse(localStorage.getItem('emailQueue') || '[]')
          emailQueue.push(emailData)
          localStorage.setItem('emailQueue', JSON.stringify(emailQueue))
        } else {
          console.log('✅ Email sent successfully:', result.messageId)
        }
        return true
      } else {
        throw new Error(result.error || 'Email send failed')
      }
    } catch (error) {
      console.error('❌ Email API error:', error)
      // Fallback to localStorage queue
      const emailQueue = JSON.parse(localStorage.getItem('emailQueue') || '[]')
      emailQueue.push(emailData)
      localStorage.setItem('emailQueue', JSON.stringify(emailQueue))
      console.log('📧 Email queued in localStorage:', emailData)
      return true
    }
    
  } catch (error) {
    console.error('Email service error:', error)
    return false
  }
}

// Report Generation Functions
export const generateRoomDetailsReport = () => {
  const rooms = JSON.parse(localStorage.getItem('hotelRooms') || '[]')
  const reservations = JSON.parse(localStorage.getItem('hotelReservations') || '[]')
  
  const occupied = rooms.filter((r: any) => 
    reservations.some((res: any) => 
      res.roomId === r.id && res.status === 'CHECKED_IN'
    )
  )
  
  return {
    totalRooms: rooms.length,
    occupiedRooms: occupied.length,
    vacantRooms: rooms.length - occupied.length,
    outOfOrderRooms: rooms.filter((r: any) => r.status === 'MAINTENANCE').length,
    occupancyRate: rooms.length > 0 ? Math.round((occupied.length / rooms.length) * 100) : 0
  }
}

export const generateAccountReport = () => {
  const reservations = JSON.parse(localStorage.getItem('hotelReservations') || '[]')
  const today = moment().format('YYYY-MM-DD')
  
  const todayRevenue = reservations
    .filter((r: any) => 
      moment(r.checkIn).format('YYYY-MM-DD') === today && r.isPaid
    )
    .reduce((sum: number, r: any) => sum + (r.totalAmount || 0), 0)
  
  const roomRevenue = todayRevenue * 0.8 // Assuming 80% is room revenue
  const otherRevenue = todayRevenue * 0.2
  const vatAmount = todayRevenue * 0.18
  const cityTaxAmount = todayRevenue * 0.01
  
  return {
    roomRevenue: roomRevenue.toFixed(2),
    fnbRevenue: '0.00',
    otherRevenue: otherRevenue.toFixed(2),
    vatAmount: vatAmount.toFixed(2),
    cityTaxAmount: cityTaxAmount.toFixed(2),
    totalRevenue: todayRevenue.toFixed(2)
  }
}

export const generateHousekeepingReport = () => {
  const tasks = JSON.parse(localStorage.getItem('housekeepingTasks') || '[]')
  const today = moment().format('YYYY-MM-DD')
  
  const todayTasks = tasks.filter((t: any) => 
    moment(t.createdAt).format('YYYY-MM-DD') === today
  )
  
  return {
    totalTasks: todayTasks.length,
    completed: todayTasks.filter((t: any) => t.status === 'completed').length,
    pending: todayTasks.filter((t: any) => t.status === 'pending').length,
    inProgress: todayTasks.filter((t: any) => t.status === 'in-progress').length
  }
}

export const generateRevenueReport = () => {
  const reservations = JSON.parse(localStorage.getItem('hotelReservations') || '[]')
  
  const segmented = {
    direct: 0,
    corporate: 0,
    agency: 0,
    online: 0
  }
  
  reservations.forEach((r: any) => {
    if (r.isPaid) {
      switch(r.source) {
        case 'direct': segmented.direct += r.totalAmount; break
        case 'corporate': segmented.corporate += r.totalAmount; break
        case 'agency': segmented.agency += r.totalAmount; break
        case 'online': segmented.online += r.totalAmount; break
        default: segmented.direct += r.totalAmount
      }
    }
  })
  
  return segmented
}

export const generateDepositReport = () => {
  const reservations = JSON.parse(localStorage.getItem('hotelReservations') || '[]')
  
  const deposits = reservations
    .filter((r: any) => (r.depositAmount || 0) > 0)
    .map((r: any) => ({
      reservationId: r.id,
      guestName: r.guestName,
      depositAmount: r.depositAmount || 0,
      depositStatus: r.depositPaid ? 'received' : 'pending',
      dueDate: r.checkIn
    }))
  
  return {
    totalDeposits: deposits.length,
    pendingDeposits: deposits.filter((d: any) => d.depositStatus === 'pending'),
    receivedDeposits: deposits.filter((d: any) => d.depositStatus === 'received')
  }
}

export const generatePOSReport = () => {
  // Placeholder for POS integration
  return {
    totalSales: 0,
    restaurant: 0,
    bar: 0,
    roomService: 0,
    minibar: 0,
    spa: 0
  }
}

