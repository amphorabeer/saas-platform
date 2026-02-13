'use client'

import { useState } from 'react'
import moment from 'moment'

export default function ReservationsView({ reservations, rooms }: any) {
  const [filterStatus, setFilterStatus] = useState('all')
  const [dateRange, setDateRange] = useState({
    start: moment().startOf('month').format('YYYY-MM-DD'),
    end: moment().endOf('month').format('YYYY-MM-DD')
  })
  
  // Filter reservations
  const filteredReservations = reservations.filter((r: any) => {
    // Status filter
    if (filterStatus !== 'all' && r.status !== filterStatus) return false
    
    // Date filter
    const checkIn = moment(r.checkIn)
    const checkOut = moment(r.checkOut)
    const rangeStart = moment(dateRange.start)
    const rangeEnd = moment(dateRange.end)
    
    // Check if reservation overlaps with date range
    return checkIn.isSameOrBefore(rangeEnd) && checkOut.isSameOrAfter(rangeStart)
  })
  
  // Export to CSV
  const exportToCSV = () => {
    const headers = ['სტუმარი', 'ნომერი', 'Check In', 'Check Out', 'თანხა', 'სტატუსი']
    const rows = filteredReservations.map((r: any) => [
      r.guestName,
      r.roomNumber || rooms?.find((room: any) => room.id === r.roomId)?.roomNumber || '-',
      moment(r.checkIn).format('DD/MM/YYYY'),
      moment(r.checkOut).format('DD/MM/YYYY'),
      r.totalAmount,
      r.status
    ])
    
    let csv = headers.join(',') + '\n'
    rows.forEach((row: string[]) => {
      csv += row.join(',') + '\n'
    })
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `reservations_${moment().format('YYYY-MM-DD')}.csv`
    link.click()
  }
  
  // Export to PDF
  const exportToPDF = () => {
    const content = `
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; }
            h1 { color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .header { margin-bottom: 20px; }
            .date-range { color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>ჯავშნების ანგარიში</h1>
            <p class="date-range">${moment(dateRange.start).format('DD/MM/YYYY')} - ${moment(dateRange.end).format('DD/MM/YYYY')}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>სტუმარი</th>
                <th>ნომერი</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>თანხა</th>
                <th>სტატუსი</th>
              </tr>
            </thead>
            <tbody>
              ${filteredReservations.map((r: any) => `
                <tr>
                  <td>${r.guestName}</td>
                  <td>${r.roomNumber || rooms?.find((room: any) => room.id === r.roomId)?.roomNumber || '-'}</td>
                  <td>${moment(r.checkIn).format('DD/MM/YYYY')}</td>
                  <td>${moment(r.checkOut).format('DD/MM/YYYY')}</td>
                  <td>₾${r.totalAmount}</td>
                  <td>${r.status}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <p style="margin-top: 20px; text-align: right;">
            სულ ჯავშნები: ${filteredReservations.length}<br>
            სულ თანხა: ₾${filteredReservations.reduce((sum: number, r: any) => sum + (r.totalAmount || 0), 0)}
          </p>
        </body>
      </html>
    `
    
    const printWindow = window.open('', '', 'height=600,width=800')
    if (printWindow) {
      printWindow.document.write(content)
      printWindow.document.close()
      printWindow.print()
    }
  }
  
  // Calculate stats
  const stats = {
    total: filteredReservations.length,
    totalRevenue: filteredReservations.reduce((sum: number, r: any) => sum + (r.totalAmount || 0), 0),
    pending: filteredReservations.filter((r: any) => r.status === 'PENDING').length,
    confirmed: filteredReservations.filter((r: any) => r.status === 'CONFIRMED').length,
    checkedIn: filteredReservations.filter((r: any) => r.status === 'CHECKED_IN').length,
    checkedOut: filteredReservations.filter((r: any) => r.status === 'CHECKED_OUT').length,
    cancelled: filteredReservations.filter((r: any) => r.status === 'CANCELLED').length
  }
  
  return (
    <div>
      {/* Filters Section */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex gap-4 items-center flex-wrap">
          {/* Status Filter */}
          <div>
            <label className="text-sm text-gray-600">სტატუსი:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="ml-2 border rounded px-3 py-2"
            >
              <option value="all">ყველა</option>
              <option value="PENDING">მოლოდინში</option>
              <option value="CONFIRMED">დადასტურებული</option>
              <option value="CHECKED_IN">Check In</option>
              <option value="CHECKED_OUT">Check Out</option>
              <option value="CANCELLED">გაუქმებული</option>
            </select>
          </div>
          
          {/* Date Range Filter */}
          <div>
            <label className="text-sm text-gray-600">თარიღი:</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
              className="ml-2 border rounded px-3 py-2"
            />
            <span className="mx-2">-</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
              className="ml-2 border rounded px-3 py-2"
            />
          </div>
          
          {/* Export Buttons */}
          <div className="ml-auto flex gap-2">
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
            >
              📊 Excel
            </button>
            <button
              onClick={exportToPDF}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-2"
            >
              📄 PDF
            </button>
          </div>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-6 gap-3 mb-4">
        <div className="bg-white rounded-lg shadow p-3 text-center">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-xs text-gray-500">სულ</div>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-3 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.confirmed}</div>
          <div className="text-xs text-gray-500">დადასტურებული</div>
        </div>
        <div className="bg-blue-50 rounded-lg shadow p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.checkedIn}</div>
          <div className="text-xs text-gray-500">Check In</div>
        </div>
        <div className="bg-gray-50 rounded-lg shadow p-3 text-center">
          <div className="text-2xl font-bold text-gray-600">{stats.checkedOut}</div>
          <div className="text-xs text-gray-500">Check Out</div>
        </div>
        <div className="bg-red-50 rounded-lg shadow p-3 text-center">
          <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
          <div className="text-xs text-gray-500">გაუქმებული</div>
        </div>
        <div className="bg-purple-50 rounded-lg shadow p-3 text-center">
          <div className="text-xl font-bold text-purple-600">₾{stats.totalRevenue}</div>
          <div className="text-xs text-gray-500">სულ თანხა</div>
        </div>
      </div>
      
      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left">სტუმარი</th>
              <th className="p-3 text-left">ნომერი</th>
              <th className="p-3 text-left">Check In</th>
              <th className="p-3 text-left">Check Out</th>
              <th className="p-3 text-right">თანხა</th>
              <th className="p-3 text-center">სტატუსი</th>
            </tr>
          </thead>
          <tbody>
            {filteredReservations.map((r: any) => (
              <tr key={r.id} className="border-t hover:bg-gray-50">
                <td className="p-3">{r.guestName}</td>
                <td className="p-3">{r.roomNumber || rooms?.find((room: any) => room.id === r.roomId)?.roomNumber || '-'}</td>
                <td className="p-3">{moment(r.checkIn).format('DD/MM/YYYY')}</td>
                <td className="p-3">{moment(r.checkOut).format('DD/MM/YYYY')}</td>
                <td className="p-3 text-right font-medium">₾{r.totalAmount}</td>
                <td className="p-3 text-center">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    r.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                    r.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                    r.status === 'CHECKED_IN' ? 'bg-blue-100 text-blue-700' :
                    r.status === 'CHECKED_OUT' ? 'bg-gray-100 text-gray-700' :
                    r.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100'
                  }`}>
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredReservations.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            ჯავშნები არ მოიძებნა
          </div>
        )}
      </div>
    </div>
  )
}

