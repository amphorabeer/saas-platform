'use client'

import React, { useState, useMemo, useEffect } from 'react'
import moment from 'moment'
import { calculateTaxBreakdown } from '../utils/taxCalculator'

interface ReportsProps {
  reservations: any[]
  rooms: any[]
}

type ReportType = 'reservations' | 'revenue' | 'occupancy' | 'guests' | 'rooms' | 'payments' | 'cancellations' | 'sources' | 'tax'
type DateRange = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom'

export default function Reports({ reservations, rooms }: ReportsProps) {
  const [activeReport, setActiveReport] = useState<ReportType>('reservations')
  const [dateRange, setDateRange] = useState<DateRange>('month')
  const [customStartDate, setCustomStartDate] = useState(moment().subtract(30, 'days').format('YYYY-MM-DD'))
  const [customEndDate, setCustomEndDate] = useState(moment().format('YYYY-MM-DD'))
  const [isExporting, setIsExporting] = useState(false)
  const [selectedSource, setSelectedSource] = useState<string | null>(null)
  
  // Helper function to get room number from roomId
  const getRoomNumber = (roomIdOrNumber: string | undefined): string => {
    if (!roomIdOrNumber) return '-'
    
    // If it's already a short room number (like "101", "202"), return it
    if (roomIdOrNumber.length <= 4 && /^\d+$/.test(roomIdOrNumber)) {
      return roomIdOrNumber
    }
    
    // Try to find room in rooms prop first
    let roomsToSearch = rooms
    
    // If rooms prop is empty, try loading directly from localStorage
    if (!roomsToSearch || roomsToSearch.length === 0) {
      try {
        const savedRooms = localStorage.getItem('rooms') || 
                           localStorage.getItem('simpleRooms') || 
                           localStorage.getItem('hotelRooms')
        if (savedRooms) {
          roomsToSearch = JSON.parse(savedRooms)
        }
      } catch (e) {
        console.error('Error loading rooms in getRoomNumber:', e)
      }
    }
    
    // Try to find room by ID
    if (roomsToSearch && roomsToSearch.length > 0) {
      const room = roomsToSearch.find((r: any) => r.id === roomIdOrNumber)
      if (room) {
        return room.roomNumber || room.number || roomIdOrNumber
      }
    }
    
    // Return truncated CUID as fallback
    return roomIdOrNumber.length > 10 ? roomIdOrNumber.slice(0, 6) + '...' : roomIdOrNumber
  }
  
  // Calculate date range
  const { startDate, endDate } = useMemo(() => {
    const now = moment()
    switch (dateRange) {
      case 'today':
        return { startDate: now.clone().startOf('day'), endDate: now.clone().endOf('day') }
      case 'week':
        return { startDate: now.clone().subtract(7, 'days').startOf('day'), endDate: now.clone().endOf('day') }
      case 'month':
        return { startDate: now.clone().subtract(30, 'days').startOf('day'), endDate: now.clone().endOf('day') }
      case 'quarter':
        return { startDate: now.clone().subtract(90, 'days').startOf('day'), endDate: now.clone().endOf('day') }
      case 'year':
        return { startDate: now.clone().subtract(365, 'days').startOf('day'), endDate: now.clone().endOf('day') }
      case 'custom':
        return { startDate: moment(customStartDate), endDate: moment(customEndDate) }
      default:
        return { startDate: now.clone().subtract(30, 'days'), endDate: now }
    }
  }, [dateRange, customStartDate, customEndDate])
  
  // Filter reservations by date range
  const filteredReservations = useMemo(() => {
    return reservations.filter(res => {
      const checkIn = moment(res.checkIn)
      const checkOut = moment(res.checkOut)
      return checkIn.isSameOrBefore(endDate) && checkOut.isSameOrAfter(startDate)
    })
  }, [reservations, startDate, endDate])
  
  // Load folios from API or localStorage
  const [folios, setFolios] = useState<any[]>([])
  useEffect(() => {
    const loadFolios = async () => {
      try {
        const response = await fetch('/api/folios')
        if (response.ok) {
          const data = await response.json()
          if (data.folios && data.folios.length > 0) {
            setFolios(data.folios.map((f: any) => ({
              ...f,
              transactions: f.folioData?.transactions || f.charges || f.transactions || []
            })))
            console.log('[Reports] Loaded folios from API:', data.folios.length)
            return
          }
        }
      } catch (error) {
        console.error('[Reports] API error:', error)
      }
      // Fallback to localStorage
      const savedFolios = localStorage.getItem('hotelFolios')
      if (savedFolios) {
        setFolios(JSON.parse(savedFolios))
      }
    }
    loadFolios()
  }, [])
  
  // =============== REVENUE REPORT ===============
  const revenueData = useMemo(() => {
    const dailyRevenue: { [date: string]: number } = {}
    const days = endDate.diff(startDate, 'days') + 1
    
    // Initialize all dates
    for (let i = 0; i < days; i++) {
      const date = startDate.clone().add(i, 'days').format('YYYY-MM-DD')
      dailyRevenue[date] = 0
    }
    
    // Revenue = Charges ONLY from folios (NOT payments, NOT reservation.totalAmount)
    folios.forEach((folio: any) => {
      (folio.transactions || []).forEach((t: any) => {
        // ONLY charges, NOT payments
        if (t.type === 'charge') {
          // Use date, nightAuditDate, or postedAt as fallback
          const chargeDate = t.date || t.nightAuditDate || moment(t.postedAt).format('YYYY-MM-DD')
          const dateStr = moment(chargeDate).format('YYYY-MM-DD')
          
          // Check if date is in range
          if (dailyRevenue.hasOwnProperty(dateStr)) {
            // Exclude adjustment transactions (from resize operations)
            if (t.id && t.id.startsWith('adj-')) return
            
            dailyRevenue[dateStr] += Number(t.debit || t.amount || 0)
          }
        }
      })
    })
    
    const totalRevenue = Object.values(dailyRevenue).reduce((sum, val) => sum + Number(val || 0), 0)
    const avgDaily = days > 0 ? totalRevenue / days : 0
    
    return {
      daily: dailyRevenue,
      total: totalRevenue,
      avgDaily,
      days
    }
  }, [folios, startDate, endDate])
  
  // =============== OCCUPANCY REPORT ===============
  const occupancyData = useMemo(() => {
    const totalRooms = rooms.length || 15
    const dailyOccupancy: { [date: string]: { occupied: number; percentage: number } } = {}
    const days = endDate.diff(startDate, 'days') + 1
    
    for (let i = 0; i < days; i++) {
      const date = startDate.clone().add(i, 'days')
      const dateStr = date.format('YYYY-MM-DD')
      
      const occupiedCount = reservations.filter(res => {
        if (['CANCELLED', 'NO_SHOW'].includes(res.status)) return false
        const checkIn = moment(res.checkIn)
        const checkOut = moment(res.checkOut)
        return date.isSameOrAfter(checkIn, 'day') && date.isBefore(checkOut, 'day')
      }).length
      
      dailyOccupancy[dateStr] = {
        occupied: occupiedCount,
        percentage: Math.round((occupiedCount / totalRooms) * 100)
      }
    }
    
    const avgOccupancy = Object.values(dailyOccupancy).reduce((sum, d) => sum + d.percentage, 0) / days
    
    return {
      daily: dailyOccupancy,
      avgOccupancy: Math.round(avgOccupancy),
      totalRooms,
      days
    }
  }, [reservations, rooms, startDate, endDate])
  
  // =============== GUEST REPORT ===============
  const guestData = useMemo(() => {
    const guests = new Map<string, { name: string; visits: number; totalSpent: number; lastVisit: string }>()
    
    filteredReservations.forEach(res => {
      const email = res.guestEmail || res.guestName
      if (!email) return
      
      const existing = guests.get(email)
      if (existing) {
        existing.visits++
        existing.totalSpent += Number(res.totalAmount || 0)
        if (moment(res.checkIn).isAfter(existing.lastVisit)) {
          existing.lastVisit = res.checkIn
        }
      } else {
        guests.set(email, {
          name: res.guestName,
          visits: 1,
          totalSpent: Number(res.totalAmount || 0),
          lastVisit: res.checkIn
        })
      }
    })
    
    const guestList = Array.from(guests.values())
    const newGuests = guestList.filter(g => g.visits === 1).length
    const returningGuests = guestList.filter(g => g.visits > 1).length
    const totalGuests = guestList.length
    
    return {
      list: guestList.sort((a, b) => b.totalSpent - a.totalSpent),
      newGuests,
      returningGuests,
      totalGuests
    }
  }, [filteredReservations])
  
  // =============== ROOM REPORT ===============
  const roomData = useMemo(() => {
    const roomStats: { [roomId: string]: { roomNumber: string; type: string; bookings: number; revenue: number; nights: number } } = {}
    
    rooms.forEach(room => {
      roomStats[room.id] = {
        roomNumber: room.roomNumber,
        type: room.roomType || room.type || 'Standard',
        bookings: 0,
        revenue: 0,
        nights: 0
      }
    })
    
    // Count bookings and nights from reservations
    filteredReservations.forEach(res => {
      if (roomStats[res.roomId]) {
        roomStats[res.roomId].bookings++
        roomStats[res.roomId].nights += moment(res.checkOut).diff(moment(res.checkIn), 'days')
      }
    })
    
    // Calculate revenue from folio charges ONLY (not reservation.totalAmount)
    folios.forEach((folio: any) => {
      // Find room by matching folio.roomNumber to room.roomNumber, then get room.id
      const folioRoomNumber = folio.roomNumber
      if (!folioRoomNumber) return
      
      // Find room by roomNumber
      const matchedRoom = rooms.find((r: any) => 
        r.roomNumber === folioRoomNumber || 
        r.number === folioRoomNumber ||
        r.id === folio.roomId
      )
      
      if (!matchedRoom || !roomStats[matchedRoom.id]) return
      
      // Sum charges for this room within date range
      (folio.transactions || []).forEach((t: any) => {
        if (t.type === 'charge' && t.category === 'room') {
          const chargeDate = t.date || t.nightAuditDate || moment(t.postedAt).format('YYYY-MM-DD')
          const dateMoment = moment(chargeDate)
          
          // Check if charge date is within report range
          if (dateMoment.isSameOrAfter(startDate, 'day') && dateMoment.isSameOrBefore(endDate, 'day')) {
            // Exclude adjustment transactions
            if (t.id && t.id.startsWith('adj-')) return
            
            roomStats[matchedRoom.id].revenue += Number(t.debit || t.amount || 0)
          }
        }
      })
    })
    
    // Group by room type
    const byType: { [type: string]: { bookings: number; revenue: number; rooms: number } } = {}
    Object.values(roomStats).forEach(room => {
      if (!byType[room.type]) {
        byType[room.type] = { bookings: 0, revenue: 0, rooms: 0 }
      }
      byType[room.type].bookings += room.bookings
      byType[room.type].revenue += Number(room.revenue || 0)
      byType[room.type].rooms++
    })
    
    return {
      rooms: Object.values(roomStats).sort((a, b) => b.revenue - a.revenue),
      byType
    }
  }, [filteredReservations, rooms, folios, startDate, endDate])
  
  // =============== PAYMENT REPORT ===============
  const paymentData = useMemo(() => {
    const byMethod: { [method: string]: { count: number; amount: number } } = {
      cash: { count: 0, amount: 0 },
      card: { count: 0, amount: 0 },
      transfer: { count: 0, amount: 0 },
      other: { count: 0, amount: 0 }
    }
    
    const dailyPayments: { [date: string]: number } = {}
    const days = endDate.diff(startDate, 'days') + 1
    
    for (let i = 0; i < days; i++) {
      const date = startDate.clone().add(i, 'days').format('YYYY-MM-DD')
      dailyPayments[date] = 0
    }
    
    folios.forEach(folio => {
      (folio.transactions || []).forEach((t: any) => {
        if (t.type === 'payment') {
          const date = moment(t.date).format('YYYY-MM-DD')
          const method = t.paymentMethod || 'other'
          
          if (byMethod[method]) {
            byMethod[method].count++
            byMethod[method].amount += Number(t.credit || 0)
          }
          
          if (dailyPayments[date] !== undefined) {
            dailyPayments[date] += Number(t.credit || 0)
          }
        }
      })
    })
    
    const totalAmount = Object.values(byMethod).reduce((sum, m) => sum + Number(m.amount || 0), 0)
    const totalCount = Object.values(byMethod).reduce((sum, m) => sum + m.count, 0)
    
    return {
      byMethod,
      daily: dailyPayments,
      totalAmount,
      totalCount
    }
  }, [folios, startDate, endDate])
  
  // =============== CANCELLATION REPORT ===============
  const cancellationData = useMemo(() => {
    const cancelled = filteredReservations.filter(r => r.status === 'CANCELLED')
    const noShows = filteredReservations.filter(r => r.status === 'NO_SHOW')
    const total = filteredReservations.length
    
    const lostRevenue = [...cancelled, ...noShows].reduce((sum, r) => sum + Number(r.totalAmount || 0), 0)
    
    return {
      cancelled: cancelled.length,
      noShows: noShows.length,
      total,
      cancellationRate: total > 0 ? Math.round((cancelled.length / total) * 100) : 0,
      noShowRate: total > 0 ? Math.round((noShows.length / total) * 100) : 0,
      lostRevenue,
      list: [...cancelled, ...noShows].sort((a, b) => moment(b.checkIn).diff(moment(a.checkIn)))
    }
  }, [filteredReservations])
  
  // =============== BOOKING SOURCE REPORT ===============
  const sourceData = useMemo(() => {
    const bySource: { [source: string]: { count: number; revenue: number } } = {}
    
    // Count reservations by source
    filteredReservations.forEach(res => {
      const source = res.source || res.bookingSource || 'Direct'
      if (!bySource[source]) {
        bySource[source] = { count: 0, revenue: 0 }
      }
      bySource[source].count++
    })
    
    // Calculate revenue from folio charges (not reservation.totalAmount)
    folios.forEach((folio: any) => {
      // Find reservation for this folio to get source
      const reservation = filteredReservations.find((r: any) => r.id === folio.reservationId)
      if (!reservation) return
      
      const source = reservation.source || reservation.bookingSource || 'Direct'
      if (!bySource[source]) return
      
      // Sum charges for this folio within date range
      (folio.transactions || []).forEach((t: any) => {
        if (t.type === 'charge') {
          const chargeDate = t.date || t.nightAuditDate || moment(t.postedAt).format('YYYY-MM-DD')
          const dateMoment = moment(chargeDate)
          
          // Check if charge date is within report range
          if (dateMoment.isSameOrAfter(startDate, 'day') && dateMoment.isSameOrBefore(endDate, 'day')) {
            // Exclude adjustment transactions
            if (t.id && t.id.startsWith('adj-')) return
            
            bySource[source].revenue += Number(t.debit || t.amount || 0)
          }
        }
      })
    })
    
    return {
      bySource,
      total: filteredReservations.length
    }
  }, [filteredReservations, folios, startDate, endDate])
  
  // =============== EXPORT FUNCTIONS ===============
  const exportToCSV = () => {
    setIsExporting(true)
    let csvContent = ''
    const dateRangeStr = `${startDate.format('YYYY-MM-DD')}_${endDate.format('YYYY-MM-DD')}`
    
    switch (activeReport) {
      case 'revenue':
        csvContent = 'Date,Revenue\n'
        Object.entries(revenueData.daily).forEach(([date, amount]) => {
          csvContent += `${date},${amount}\n`
        })
        break
      case 'occupancy':
        csvContent = 'Date,Occupied Rooms,Occupancy %\n'
        Object.entries(occupancyData.daily).forEach(([date, data]) => {
          csvContent += `${date},${data.occupied},${data.percentage}%\n`
        })
        break
      case 'guests':
        csvContent = 'Guest Name,Visits,Total Spent,Last Visit\n'
        guestData.list.forEach(g => {
          csvContent += `${g.name},${g.visits},${g.totalSpent},${g.lastVisit}\n`
        })
        break
      case 'payments':
        csvContent = 'Payment Method,Count,Amount\n'
        Object.entries(paymentData.byMethod).forEach(([method, data]) => {
          csvContent += `${method},${data.count},${data.amount}\n`
        })
        break
      case 'tax':
        csvContent = 'Tax Name,Rate,Amount\n'
        taxData.taxBreakdown.forEach((tax: any) => {
          csvContent += `${tax.name},${tax.rate}%,${tax.amount}\n`
        })
        csvContent += `Total Tax,,${taxData.totalTax}\n`
        csvContent += `Gross Revenue,,${taxData.grossRevenue}\n`
        csvContent += `Net Revenue,,${taxData.netRevenue}\n`
        break
      default:
        csvContent = 'No data'
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${activeReport}_report_${dateRangeStr}.csv`
    link.click()
    
    setTimeout(() => setIsExporting(false), 1000)
  }
  
  const printReport = () => {
    window.print()
  }
  
  // =============== RESERVATIONS REPORT ===============
  const ReservationsReport = ({ reservations: allReservations, rooms, dateRange, startDate, endDate }: { reservations: any[]; rooms: any[]; dateRange: DateRange; startDate: moment.Moment; endDate: moment.Moment }) => {
    const [filter, setFilter] = useState('all')
    const [searchTerm, setSearchTerm] = useState('')
    
    // Filter reservations by date range and other filters
    const filteredReservations = useMemo(() => {
      let result = allReservations.filter((r: any) => {
        const checkIn = moment(r.checkIn)
        const checkOut = moment(r.checkOut)
        return checkIn.isSameOrBefore(endDate) && checkOut.isSameOrAfter(startDate)
      })
      
      // Status filter
      if (filter === 'today') {
        const today = moment().format('YYYY-MM-DD')
        result = result.filter((r: any) => 
          moment(r.checkIn).format('YYYY-MM-DD') === today ||
          moment(r.checkOut).format('YYYY-MM-DD') === today
        )
      } else if (filter === 'upcoming') {
        const today = moment().format('YYYY-MM-DD')
        result = result.filter((r: any) => 
          moment(r.checkIn).format('YYYY-MM-DD') > today &&
          (r.status === 'CONFIRMED' || r.status === 'PENDING')
        )
      } else if (filter === 'checked-in') {
        result = result.filter((r: any) => r.status === 'CHECKED_IN')
      } else if (filter === 'checked-out') {
        result = result.filter((r: any) => r.status === 'CHECKED_OUT')
      }
      
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase()
        result = result.filter((r: any) =>
          r.guestName?.toLowerCase().includes(search) ||
          r.roomNumber?.toString().includes(search) ||
          r.id?.toLowerCase().includes(search) ||
          r.guestPhone?.includes(search) ||
          r.guestEmail?.toLowerCase().includes(search)
        )
      }
      
      // Sort by check-in date (newest first)
      result.sort((a: any, b: any) => moment(b.checkIn).valueOf() - moment(a.checkIn).valueOf())
      
      return result
    }, [allReservations, filter, searchTerm, startDate, endDate])
    
    const getStatusBadge = (status: string) => {
      const badges: { [key: string]: string } = {
        'CONFIRMED': 'bg-blue-100 text-blue-800',
        'PENDING': 'bg-yellow-100 text-yellow-800',
        'CHECKED_IN': 'bg-green-100 text-green-800',
        'CHECKED_OUT': 'bg-gray-100 text-gray-800',
        'CANCELLED': 'bg-red-100 text-red-800',
        'NO_SHOW': 'bg-orange-100 text-orange-800'
      }
      return badges[status] || 'bg-gray-100 text-gray-800'
    }
    
    const getStatusLabel = (status: string) => {
      const labels: { [key: string]: string } = {
        'CONFIRMED': 'დადასტურებული',
        'PENDING': 'მოლოდინში',
        'CHECKED_IN': 'შემოსული',
        'CHECKED_OUT': 'გასული',
        'CANCELLED': 'გაუქმებული',
        'NO_SHOW': 'არ გამოცხადდა'
      }
      return labels[status] || status
    }
    
    return (
      <div>
        {/* Filters */}
        <div className="flex gap-4 mb-4 flex-wrap">
          <div className="flex gap-2">
            {[
              { id: 'all', label: 'ყველა' },
              { id: 'today', label: 'დღევანდელი' },
              { id: 'upcoming', label: 'მომავალი' },
              { id: 'checked-in', label: 'შემოსული' },
              { id: 'checked-out', label: 'გასული' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-3 py-1 rounded-lg text-sm ${
                  filter === f.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          
          <input
            type="text"
            placeholder="🔍 ძებნა..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-1 border rounded-lg"
          />
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">
              {allReservations.filter((r: any) => r.status === 'CONFIRMED').length}
            </p>
            <p className="text-sm text-blue-500">დადასტურებული</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-600">
              {allReservations.filter((r: any) => r.status === 'CHECKED_IN').length}
            </p>
            <p className="text-sm text-green-500">შემოსული</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-gray-600">
              {allReservations.filter((r: any) => r.status === 'CHECKED_OUT').length}
            </p>
            <p className="text-sm text-gray-500">გასული</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-orange-600">
              {allReservations.filter((r: any) => r.status === 'NO_SHOW' || r.status === 'CANCELLED').length}
            </p>
            <p className="text-sm text-orange-500">გაუქმებული</p>
          </div>
        </div>
        
        {/* Reservations Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3">სტუმარი</th>
                <th className="text-left p-3">ოთახი</th>
                <th className="text-left p-3">Check-in</th>
                <th className="text-left p-3">Check-out</th>
                <th className="text-right p-3">თანხა</th>
                <th className="text-center p-3">სტატუსი</th>
              </tr>
            </thead>
            <tbody>
              {filteredReservations.map((res, idx) => (
                <tr key={res.id || idx} className="border-t hover:bg-gray-50">
                  <td className="p-3">
                    <div className="font-medium">{res.guestName}</div>
                    <div className="text-sm text-gray-500">{res.guestPhone || res.guestEmail}</div>
                  </td>
                  <td className="p-3">{getRoomNumber(res.roomNumber || res.roomId)}</td>
                  <td className="p-3">{moment(res.checkIn).format('DD/MM/YYYY')}</td>
                  <td className="p-3">{moment(res.checkOut).format('DD/MM/YYYY')}</td>
                  <td className="p-3 text-right">₾{Number(res.totalAmount || 0).toFixed(2)}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(res.status)}`}>
                      {getStatusLabel(res.status)}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredReservations.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    ჯავშნები არ მოიძებნა
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <p className="text-center text-gray-400 text-sm mt-4">
          სულ: {filteredReservations.length} ჯავშანი
        </p>
      </div>
    )
  }
  
  // =============== SIMPLE BAR CHART ===============
  const SimpleBarChart = ({ data, maxValue, color = 'bg-blue-500' }: { data: { label: string; value: number }[]; maxValue: number; color?: string }) => (
    <div className="space-y-2">
      {data.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-20 text-xs text-gray-600 truncate">{item.label}</div>
          <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
            <div 
              className={`${color} h-full rounded-full transition-all duration-500`}
              style={{ width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%` }}
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium">
              {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
  
  // =============== TAX SUMMARY REPORT ===============
  const taxData = useMemo(() => {
    // Load tax rates from Settings
    const loadTaxRates = () => {
      const saved = localStorage.getItem('hotelTaxes')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed)) {
            return parsed.map((t: any) => ({
              name: t.name || t.type || 'Tax',
              rate: t.rate || t.value || 0
            }))
          } else if (typeof parsed === 'object' && parsed !== null) {
            return Object.entries(parsed).map(([key, value]: [string, any]) => ({
              name: key,
              rate: typeof value === 'number' ? value : (value?.rate || value?.value || 0)
            }))
          }
        } catch (e) {
          console.error('Error loading taxes:', e)
        }
      }
      return [
        { name: 'VAT', rate: 18 },
        { name: 'Service', rate: 10 }
      ]
    }

    const taxes = loadTaxRates()
    
    // Get all charges in date range from folios
    let totalRevenue = 0
    const revenueByCategory: { [key: string]: number } = {}
    
    folios.forEach((folio: any) => {
      folio.transactions?.forEach((t: any) => {
        const txDate = moment(t.date).format('YYYY-MM-DD')
        const dateMoment = moment(txDate)
        if (
          dateMoment.isSameOrAfter(startDate, 'day') && 
          dateMoment.isSameOrBefore(endDate, 'day') && 
          t.type === 'charge' && 
          (t.debit > 0 || t.amount > 0)
        ) {
          const amount = t.debit || t.amount || 0
          totalRevenue += amount
          const category = t.category || 'other'
          revenueByCategory[category] = (revenueByCategory[category] || 0) + amount
        }
      })
    })
    
    // Calculate tax breakdown (Tax Inclusive)
    const taxBreakdownData = calculateTaxBreakdown(totalRevenue)
    
    // Calculate by category
    const taxByCategory = Object.entries(revenueByCategory).map(([category, amount]) => {
      const catTaxData = calculateTaxBreakdown(amount)
      return {
        category,
        gross: amount,
        net: catTaxData.net,
        taxes: catTaxData.taxes,
        totalTax: catTaxData.totalTax
      }
    })
    
    return {
      dateRange: {
        from: startDate.format('YYYY-MM-DD'),
        to: endDate.format('YYYY-MM-DD')
      },
      grossRevenue: totalRevenue,
      netRevenue: taxBreakdownData.net,
      taxBreakdown: taxBreakdownData.taxes,
      totalTax: taxBreakdownData.totalTax,
      byCategory: taxByCategory,
      generatedAt: moment().format('DD/MM/YYYY HH:mm')
    }
  }, [folios, startDate, endDate])
  
  // Report tabs
  const reportTabs: { id: ReportType; label: string; icon: string }[] = [
    { id: 'reservations', label: 'ჯავშნები', icon: '📋' },
    { id: 'revenue', label: 'შემოსავალი', icon: '💰' },
    { id: 'occupancy', label: 'დაკავებულობა', icon: '🏨' },
    { id: 'guests', label: 'სტუმრები', icon: '👥' },
    { id: 'rooms', label: 'ოთახები', icon: '🚪' },
    { id: 'payments', label: 'გადახდები', icon: '💳' },
    { id: 'cancellations', label: 'გაუქმებები', icon: '❌' },
    { id: 'sources', label: 'წყაროები', icon: '📊' },
    { id: 'tax', label: 'Tax Summary', icon: '🧾' }
  ]
  
  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          📊 რეპორტები
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          დეტალური სტატისტიკა და ანალიტიკა
        </p>
      </div>
      
      {/* Date Range Selector */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-gray-600">📅 პერიოდი:</span>
          
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'today', label: 'დღეს' },
              { id: 'week', label: 'კვირა' },
              { id: 'month', label: 'თვე' },
              { id: 'quarter', label: 'კვარტალი' },
              { id: 'year', label: 'წელი' },
              { id: 'custom', label: 'სხვა' }
            ].map(range => (
              <button
                key={range.id}
                onClick={() => setDateRange(range.id as DateRange)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  dateRange === range.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
          
          {dateRange === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 border rounded-lg text-sm"
              />
              <span className="text-gray-400">-</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 border rounded-lg text-sm"
              />
            </div>
          )}
          
          <div className="ml-auto flex gap-2">
            <button
              onClick={exportToCSV}
              disabled={isExporting}
              className="px-4 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50 flex items-center gap-1"
            >
              📥 {isExporting ? 'იტვირთება...' : 'Excel'}
            </button>
            <button
              onClick={printReport}
              className="px-4 py-1.5 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600 flex items-center gap-1"
            >
              🖨️ Print
            </button>
          </div>
        </div>
        
        <div className="mt-3 text-sm text-gray-500">
          🗓️ {startDate.format('DD/MM/YYYY')} - {endDate.format('DD/MM/YYYY')} ({endDate.diff(startDate, 'days') + 1} დღე)
        </div>
      </div>
      
      {/* Report Type Tabs */}
      <div className="bg-white rounded-xl shadow-sm border mb-6">
        <div className="flex overflow-x-auto border-b">
          {reportTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveReport(tab.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                activeReport === tab.id
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
        
        {/* Report Content */}
        <div className="p-6">
          {/* RESERVATIONS REPORT */}
          {activeReport === 'reservations' && (
            <ReservationsReport reservations={reservations} rooms={rooms} dateRange={dateRange} startDate={startDate} endDate={endDate} />
          )}
          
          {/* REVENUE REPORT */}
          {activeReport === 'revenue' && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
                  <div className="text-sm text-green-600 font-medium">💰 სულ შემოსავალი</div>
                  <div className="text-3xl font-bold text-green-700 mt-1">₾{revenueData.total.toLocaleString()}</div>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
                  <div className="text-sm text-blue-600 font-medium">📊 საშუალო დღიური</div>
                  <div className="text-3xl font-bold text-blue-700 mt-1">₾{Number(revenueData.avgDaily || 0).toFixed(0)}</div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
                  <div className="text-sm text-purple-600 font-medium">📅 დღეები</div>
                  <div className="text-3xl font-bold text-purple-700 mt-1">{revenueData.days}</div>
                </div>
              </div>
              
              <h3 className="font-bold text-gray-700 mb-3">📈 დღიური შემოსავალი</h3>
              <div className="bg-gray-50 rounded-xl p-4 overflow-x-auto">
                <SimpleBarChart
                  data={Object.entries(revenueData.daily).slice(-14).map(([date, amount]) => ({
                    label: moment(date).format('DD/MM'),
                    value: amount
                  }))}
                  maxValue={Math.max(...Object.values(revenueData.daily))}
                  color="bg-green-500"
                />
              </div>
            </div>
          )}
          
          {/* OCCUPANCY REPORT */}
          {activeReport === 'occupancy' && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
                  <div className="text-sm text-blue-600 font-medium">🏨 საშუალო დაკავებულობა</div>
                  <div className="text-3xl font-bold text-blue-700 mt-1">{occupancyData.avgOccupancy}%</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
                  <div className="text-sm text-green-600 font-medium">🚪 სულ ოთახები</div>
                  <div className="text-3xl font-bold text-green-700 mt-1">{occupancyData.totalRooms}</div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
                  <div className="text-sm text-purple-600 font-medium">📅 ანალიზის პერიოდი</div>
                  <div className="text-3xl font-bold text-purple-700 mt-1">{occupancyData.days} დღე</div>
                </div>
              </div>
              
              <h3 className="font-bold text-gray-700 mb-3">📈 დღიური დაკავებულობა</h3>
              <div className="bg-gray-50 rounded-xl p-4">
                <SimpleBarChart
                  data={Object.entries(occupancyData.daily).slice(-14).map(([date, data]) => ({
                    label: moment(date).format('DD/MM'),
                    value: data.percentage
                  }))}
                  maxValue={100}
                  color="bg-blue-500"
                />
              </div>
            </div>
          )}
          
          {/* GUEST REPORT */}
          {activeReport === 'guests' && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-4">
                  <div className="text-sm text-indigo-600 font-medium">👥 სულ სტუმრები</div>
                  <div className="text-3xl font-bold text-indigo-700 mt-1">{guestData.totalGuests}</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
                  <div className="text-sm text-green-600 font-medium">🆕 ახალი სტუმრები</div>
                  <div className="text-3xl font-bold text-green-700 mt-1">{guestData.newGuests}</div>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4">
                  <div className="text-sm text-orange-600 font-medium">🔄 განმეორებითი</div>
                  <div className="text-3xl font-bold text-orange-700 mt-1">{guestData.returningGuests}</div>
                </div>
              </div>
              
              <h3 className="font-bold text-gray-700 mb-3">🏆 ტოპ სტუმრები (შემოსავლით)</h3>
              <div className="bg-gray-50 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left p-3 text-sm font-medium text-gray-600">სტუმარი</th>
                      <th className="text-center p-3 text-sm font-medium text-gray-600">ვიზიტები</th>
                      <th className="text-right p-3 text-sm font-medium text-gray-600">სულ დახარჯა</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guestData.list.slice(0, 10).map((guest, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                              {i + 1}
                            </span>
                            <span className="font-medium">{guest.name}</span>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            guest.visits > 1 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {guest.visits}x
                          </span>
                        </td>
                        <td className="p-3 text-right font-bold text-green-600">₾{guest.totalSpent.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {/* ROOM REPORT */}
          {activeReport === 'rooms' && (
            <div>
              <h3 className="font-bold text-gray-700 mb-3">🏨 ოთახების ტიპების მიხედვით</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {Object.entries(roomData.byType).map(([type, data]) => (
                  <div key={type} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4">
                    <div className="text-sm text-gray-600 font-medium">{type}</div>
                    <div className="text-2xl font-bold text-gray-800 mt-1">{data.bookings} ჯავშანი</div>
                    <div className="text-sm text-green-600 mt-1">₾{data.revenue.toLocaleString()}</div>
                  </div>
                ))}
              </div>
              
              <h3 className="font-bold text-gray-700 mb-3">🚪 ოთახების რეიტინგი</h3>
              <div className="bg-gray-50 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left p-3 text-sm font-medium text-gray-600">ოთახი</th>
                      <th className="text-center p-3 text-sm font-medium text-gray-600">ტიპი</th>
                      <th className="text-center p-3 text-sm font-medium text-gray-600">ჯავშნები</th>
                      <th className="text-center p-3 text-sm font-medium text-gray-600">ღამეები</th>
                      <th className="text-right p-3 text-sm font-medium text-gray-600">შემოსავალი</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roomData.rooms.slice(0, 15).map((room, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-3 font-bold">{room.roomNumber}</td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">{room.type}</span>
                        </td>
                        <td className="p-3 text-center">{room.bookings}</td>
                        <td className="p-3 text-center">{room.nights}</td>
                        <td className="p-3 text-right font-bold text-green-600">₾{room.revenue.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {/* PAYMENT REPORT */}
          {activeReport === 'payments' && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
                  <div className="text-sm text-green-600 font-medium">💰 სულ გადახდები</div>
                  <div className="text-3xl font-bold text-green-700 mt-1">₾{paymentData.totalAmount.toLocaleString()}</div>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
                  <div className="text-sm text-blue-600 font-medium">🧾 ტრანზაქციები</div>
                  <div className="text-3xl font-bold text-blue-700 mt-1">{paymentData.totalCount}</div>
                </div>
              </div>
              
              <h3 className="font-bold text-gray-700 mb-3">💳 გადახდის მეთოდები</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {Object.entries(paymentData.byMethod).map(([method, data]) => {
                  const labels: { [key: string]: { icon: string; name: string } } = {
                    cash: { icon: '💵', name: 'ნაღდი' },
                    card: { icon: '💳', name: 'ბარათი' },
                    transfer: { icon: '🏦', name: 'გადარიცხვა' },
                    other: { icon: '📝', name: 'სხვა' }
                  }
                  const label = labels[method] || { icon: '💰', name: method }
                  const percentage = paymentData.totalAmount > 0 ? Math.round((data.amount / paymentData.totalAmount) * 100) : 0
                  
                  return (
                    <div key={method} className="bg-white border rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{label.icon}</span>
                        <span className="font-medium text-gray-700">{label.name}</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-800">₾{data.amount.toLocaleString()}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${percentage}%` }} />
                        </div>
                        <span className="text-sm text-gray-500">{percentage}%</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{data.count} ტრანზაქცია</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          
          {/* CANCELLATION REPORT */}
          {activeReport === 'cancellations' && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4">
                  <div className="text-sm text-red-600 font-medium">❌ გაუქმებული</div>
                  <div className="text-3xl font-bold text-red-700 mt-1">{cancellationData.cancelled}</div>
                  <div className="text-xs text-red-500 mt-1">{cancellationData.cancellationRate}% ჯავშნებიდან</div>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4">
                  <div className="text-sm text-orange-600 font-medium">👻 No-Show</div>
                  <div className="text-3xl font-bold text-orange-700 mt-1">{cancellationData.noShows}</div>
                  <div className="text-xs text-orange-500 mt-1">{cancellationData.noShowRate}% ჯავშნებიდან</div>
                </div>
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4">
                  <div className="text-sm text-gray-600 font-medium">📋 სულ ჯავშნები</div>
                  <div className="text-3xl font-bold text-gray-700 mt-1">{cancellationData.total}</div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
                  <div className="text-sm text-purple-600 font-medium">💸 დაკარგული შემოსავალი</div>
                  <div className="text-3xl font-bold text-purple-700 mt-1">₾{cancellationData.lostRevenue.toLocaleString()}</div>
                </div>
              </div>
              
              {cancellationData.list.length > 0 && (
                <>
                  <h3 className="font-bold text-gray-700 mb-3">📋 გაუქმებული ჯავშნები</h3>
                  <div className="bg-gray-50 rounded-xl overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="text-left p-3 text-sm font-medium text-gray-600">სტუმარი</th>
                          <th className="text-center p-3 text-sm font-medium text-gray-600">ოთახი</th>
                          <th className="text-center p-3 text-sm font-medium text-gray-600">თარიღი</th>
                          <th className="text-center p-3 text-sm font-medium text-gray-600">სტატუსი</th>
                          <th className="text-right p-3 text-sm font-medium text-gray-600">თანხა</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cancellationData.list.slice(0, 10).map((res, i) => (
                          <tr key={i} className="border-t">
                            <td className="p-3 font-medium">{res.guestName}</td>
                            <td className="p-3 text-center">{getRoomNumber(res.roomNumber || res.roomId)}</td>
                            <td className="p-3 text-center text-sm">{moment(res.checkIn).format('DD/MM/YY')}</td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                res.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                              }`}>
                                {res.status === 'CANCELLED' ? '❌ გაუქმებული' : '👻 No-Show'}
                              </span>
                            </td>
                            <td className="p-3 text-right text-red-600">₾{(res.totalAmount || 0).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
          
          {/* SOURCE REPORT */}
          {activeReport === 'sources' && (
            <div>
              <h3 className="font-bold text-gray-700 mb-3">📊 ჯავშნების წყაროები</h3>
              
              {selectedSource ? (
                <div>
                  <button
                    onClick={() => setSelectedSource(null)}
                    className="mb-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm flex items-center gap-2"
                  >
                    ← უკან
                  </button>
                  
                  <h4 className="font-semibold text-gray-700 mb-3">
                    {selectedSource} - {filteredReservations.filter((r: any) => (r.source || 'Direct') === selectedSource).length} ჯავშანი
                  </h4>
                  
                  <div className="bg-white border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="p-3 text-left text-xs font-medium text-gray-500">სტუმარი</th>
                          <th className="p-3 text-left text-xs font-medium text-gray-500">ოთახი</th>
                          <th className="p-3 text-left text-xs font-medium text-gray-500">Check-In</th>
                          <th className="p-3 text-left text-xs font-medium text-gray-500">Check-Out</th>
                          <th className="p-3 text-right text-xs font-medium text-gray-500">თანხა</th>
                          <th className="p-3 text-center text-xs font-medium text-gray-500">სტატუსი</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredReservations
                          .filter((r: any) => (r.source || 'Direct') === selectedSource)
                          .map((res: any) => (
                            <tr key={res.id} className="border-t hover:bg-gray-50">
                              <td className="p-3">{res.guestName}</td>
                              <td className="p-3">{getRoomNumber(res.roomNumber || res.roomId)}</td>
                              <td className="p-3">{moment(res.checkIn).format('DD/MM/YYYY')}</td>
                              <td className="p-3">{moment(res.checkOut).format('DD/MM/YYYY')}</td>
                              <td className="p-3 text-right font-medium">₾{Number(res.totalAmount || 0).toFixed(2)}</td>
                              <td className="p-3 text-center">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  res.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                                  res.status === 'CHECKED_IN' ? 'bg-blue-100 text-blue-700' :
                                  res.status === 'CHECKED_OUT' ? 'bg-gray-100 text-gray-700' :
                                  res.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                                  'bg-gray-100'
                                }`}>
                                  {res.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    
                    {filteredReservations.filter((r: any) => (r.source || 'Direct') === selectedSource).length === 0 && (
                      <div className="p-8 text-center text-gray-500">
                        ჯავშნები არ მოიძებნა
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {Object.entries(sourceData.bySource).map(([source, data]) => {
                    const percentage = sourceData.total > 0 ? Math.round((data.count / sourceData.total) * 100) : 0
                    const icons: { [key: string]: string } = {
                      'Direct': '🏨',
                      'Booking.com': '🅱️',
                      'Airbnb': '🏠',
                      'Expedia': '✈️',
                      'Phone': '📞',
                      'Email': '📧',
                      'Walk-in': '🚶'
                    }
                    
                    return (
                      <div 
                        key={source} 
                        className="bg-white border rounded-xl p-4 cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => setSelectedSource(source)}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">{icons[source] || '📋'}</span>
                          <span className="font-medium text-gray-700">{source}</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-800">{data.count} ჯავშანი</div>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-2">
                            <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${percentage}%` }} />
                          </div>
                          <span className="text-sm text-gray-500">{percentage}%</span>
                        </div>
                        <div className="text-sm text-green-600 mt-1">₾{data.revenue.toLocaleString()}</div>
                        <div className="text-xs text-gray-400 mt-2 text-center">დააკლიკეთ დეტალებისთვის</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
          
          {/* TAX SUMMARY REPORT */}
          {activeReport === 'tax' && (
            <div>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
                  <p className="text-blue-600 text-sm font-medium">მთლიანი შემოსავალი</p>
                  <p className="text-3xl font-bold text-blue-700 mt-1">₾{Number(taxData.grossRevenue || 0).toFixed(2)}</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
                  <p className="text-green-600 text-sm font-medium">წმინდა შემოსავალი</p>
                  <p className="text-3xl font-bold text-green-700 mt-1">₾{Number(taxData.netRevenue || 0).toFixed(2)}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
                  <p className="text-purple-600 text-sm font-medium">გადასახადები სულ</p>
                  <p className="text-3xl font-bold text-purple-700 mt-1">₾{Number(taxData.totalTax || 0).toFixed(2)}</p>
                </div>
              </div>
              
              {/* Tax Breakdown */}
              <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
                <h3 className="font-bold text-lg mb-4">🧾 გადასახადების დეტალები</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3 text-sm font-medium text-gray-600">გადასახადი</th>
                        <th className="text-right p-3 text-sm font-medium text-gray-600">განაკვეთი</th>
                        <th className="text-right p-3 text-sm font-medium text-gray-600">თანხა</th>
                      </tr>
                    </thead>
                    <tbody>
                      {taxData.taxBreakdown.map((tax: any, idx: number) => (
                        <tr key={idx} className="border-t">
                          <td className="p-3 font-medium">{tax.name}</td>
                          <td className="text-right p-3">{tax.rate}%</td>
                          <td className="text-right p-3 font-bold text-gray-800">₾{Number(tax.amount || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                      <tr className="border-t-2 font-bold bg-gray-50">
                        <td className="p-3">სულ გადასახადი</td>
                        <td className="p-3"></td>
                        <td className="text-right p-3 text-purple-700">₾{Number(taxData.totalTax || 0).toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* By Category */}
              {taxData.byCategory.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
                  <h3 className="font-bold text-lg mb-4">📊 კატეგორიების მიხედვით</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-3 text-sm font-medium text-gray-600">კატეგორია</th>
                          <th className="text-right p-3 text-sm font-medium text-gray-600">მთლიანი</th>
                          <th className="text-right p-3 text-sm font-medium text-gray-600">წმინდა</th>
                          <th className="text-right p-3 text-sm font-medium text-gray-600">გადასახადი</th>
                        </tr>
                      </thead>
                      <tbody>
                        {taxData.byCategory.map((cat: any, idx: number) => (
                          <tr key={idx} className="border-t">
                            <td className="p-3 font-medium capitalize">{cat.category}</td>
                            <td className="text-right p-3">₾{Number(cat.gross || 0).toFixed(2)}</td>
                            <td className="text-right p-3 text-gray-600">₾{Number(cat.net || 0).toFixed(2)}</td>
                            <td className="text-right p-3 font-bold text-purple-600">₾{Number(cat.totalTax || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {/* Info Footer */}
              <div className="text-center text-gray-400 text-sm">
                გენერირებულია: {taxData.generatedAt} | პერიოდი: {taxData.dateRange.from} - {taxData.dateRange.to}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}