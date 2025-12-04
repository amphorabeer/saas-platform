'use client'

import React, { useState, useMemo, useEffect } from 'react'
import moment from 'moment'

interface ReportsProps {
  reservations: any[]
  rooms: any[]
}

type ReportType = 'revenue' | 'occupancy' | 'guests' | 'rooms' | 'payments' | 'cancellations' | 'sources'
type DateRange = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom'

export default function Reports({ reservations, rooms }: ReportsProps) {
  const [activeReport, setActiveReport] = useState<ReportType>('revenue')
  const [dateRange, setDateRange] = useState<DateRange>('month')
  const [customStartDate, setCustomStartDate] = useState(moment().subtract(30, 'days').format('YYYY-MM-DD'))
  const [customEndDate, setCustomEndDate] = useState(moment().format('YYYY-MM-DD'))
  const [isExporting, setIsExporting] = useState(false)
  
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
  
  // Load folios from localStorage
  const [folios, setFolios] = useState<any[]>([])
  useEffect(() => {
    const savedFolios = localStorage.getItem('hotelFolios')
    if (savedFolios) {
      setFolios(JSON.parse(savedFolios))
    }
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
    
    // Calculate revenue from checked-out reservations
    filteredReservations.forEach(res => {
      if (res.status === 'CHECKED_OUT') {
        const checkOutDate = moment(res.checkOut).format('YYYY-MM-DD')
        if (dailyRevenue[checkOutDate] !== undefined) {
          dailyRevenue[checkOutDate] += res.totalAmount || 0
        }
      }
    })
    
    // Also add from folios
    folios.forEach(folio => {
      (folio.transactions || []).forEach((t: any) => {
        if (t.type === 'payment') {
          const date = moment(t.date).format('YYYY-MM-DD')
          if (dailyRevenue[date] !== undefined) {
            dailyRevenue[date] += t.credit || 0
          }
        }
      })
    })
    
    const totalRevenue = Object.values(dailyRevenue).reduce((sum, val) => sum + val, 0)
    const avgDaily = days > 0 ? totalRevenue / days : 0
    
    return {
      daily: dailyRevenue,
      total: totalRevenue,
      avgDaily,
      days
    }
  }, [filteredReservations, folios, startDate, endDate])
  
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
        existing.totalSpent += res.totalAmount || 0
        if (moment(res.checkIn).isAfter(existing.lastVisit)) {
          existing.lastVisit = res.checkIn
        }
      } else {
        guests.set(email, {
          name: res.guestName,
          visits: 1,
          totalSpent: res.totalAmount || 0,
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
    
    filteredReservations.forEach(res => {
      if (roomStats[res.roomId]) {
        roomStats[res.roomId].bookings++
        roomStats[res.roomId].revenue += res.totalAmount || 0
        roomStats[res.roomId].nights += moment(res.checkOut).diff(moment(res.checkIn), 'days')
      }
    })
    
    // Group by room type
    const byType: { [type: string]: { bookings: number; revenue: number; rooms: number } } = {}
    Object.values(roomStats).forEach(room => {
      if (!byType[room.type]) {
        byType[room.type] = { bookings: 0, revenue: 0, rooms: 0 }
      }
      byType[room.type].bookings += room.bookings
      byType[room.type].revenue += room.revenue
      byType[room.type].rooms++
    })
    
    return {
      rooms: Object.values(roomStats).sort((a, b) => b.revenue - a.revenue),
      byType
    }
  }, [filteredReservations, rooms])
  
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
            byMethod[method].amount += t.credit || 0
          }
          
          if (dailyPayments[date] !== undefined) {
            dailyPayments[date] += t.credit || 0
          }
        }
      })
    })
    
    const totalAmount = Object.values(byMethod).reduce((sum, m) => sum + m.amount, 0)
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
    
    const lostRevenue = [...cancelled, ...noShows].reduce((sum, r) => sum + (r.totalAmount || 0), 0)
    
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
    
    filteredReservations.forEach(res => {
      const source = res.source || res.bookingSource || 'Direct'
      if (!bySource[source]) {
        bySource[source] = { count: 0, revenue: 0 }
      }
      bySource[source].count++
      bySource[source].revenue += res.totalAmount || 0
    })
    
    return {
      bySource,
      total: filteredReservations.length
    }
  }, [filteredReservations])
  
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
  
  // Report tabs
  const reportTabs: { id: ReportType; label: string; icon: string }[] = [
    { id: 'revenue', label: 'შემოსავალი', icon: '💰' },
    { id: 'occupancy', label: 'დაკავებულობა', icon: '🏨' },
    { id: 'guests', label: 'სტუმრები', icon: '👥' },
    { id: 'rooms', label: 'ოთახები', icon: '🚪' },
    { id: 'payments', label: 'გადახდები', icon: '💳' },
    { id: 'cancellations', label: 'გაუქმებები', icon: '❌' },
    { id: 'sources', label: 'წყაროები', icon: '📊' }
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
                  <div className="text-3xl font-bold text-blue-700 mt-1">₾{revenueData.avgDaily.toFixed(0)}</div>
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
                            <td className="p-3 text-center">{res.roomNumber || res.roomId}</td>
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
                    <div key={source} className="bg-white border rounded-xl p-4">
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
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}