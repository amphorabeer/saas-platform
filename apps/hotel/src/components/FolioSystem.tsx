'use client'

import { useState, useEffect } from 'react'
import moment from 'moment'

interface FolioTransaction {
  id: string
  date: string
  time?: string
  type: 'charge' | 'payment'
  category: string
  description: string
  debit?: number
  credit?: number
  amount?: number
  balance?: number
  postedBy?: string
  paymentMethod?: string
  referenceId?: string
}

interface Folio {
  id: string
  folioNumber: string
  reservationId: string
  guestName: string
  roomNumber: string
  checkIn: string
  checkOut: string
  transactions: FolioTransaction[]
  balance: number
  status: 'open' | 'closed'
  createdAt: string
  closedAt?: string
}

interface FolioSystemProps {
  onSelectFolio?: (folio: Folio) => void
  onClose?: () => void
}

export default function FolioSystem({ onSelectFolio, onClose }: FolioSystemProps) {
  const [folios, setFolios] = useState<Folio[]>([])
  const [filteredFolios, setFilteredFolios] = useState<Folio[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all')
  const [sortBy, setSortBy] = useState<'date' | 'guest' | 'balance' | 'room'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedFolio, setSelectedFolio] = useState<Folio | null>(null)
  const [loading, setLoading] = useState(true)

  // Load folios from localStorage
  useEffect(() => {
    loadFolios()
  }, [])

  const loadFolios = async () => {
    setLoading(true)
    try {
      // Try API first
      const response = await fetch('/api/folios')
      if (response.ok) {
        const data = await response.json()
        if (data.folios && data.folios.length > 0) {
          // Transform API data to component format
          const apiFolios = data.folios.map((f: any) => ({
            id: f.id,
            folioNumber: f.folioNumber,
            reservationId: f.reservationId || '',
            guestName: f.guestName,
            roomNumber: f.roomNumber || '',
            checkIn: f.checkIn || '',
            checkOut: f.checkOut || '',
            transactions: f.charges || f.folioData?.transactions || [],
            balance: f.balance || 0,
            status: f.status || 'open',
            createdAt: f.createdAt,
            closedAt: f.closedAt,
          }))
          setFolios(apiFolios)
          setFilteredFolios(apiFolios)
          console.log('[FolioSystem] Loaded from API:', apiFolios.length)
          return
        }
      }
      
      // Fallback to localStorage
      const saved = JSON.parse(localStorage.getItem('hotelFolios') || '[]')
      setFolios(saved)
      setFilteredFolios(saved)
      console.log('[FolioSystem] Loaded from localStorage:', saved.length)
    } catch (error) {
      console.error('Error loading folios:', error)
      // Fallback to localStorage on error
      const saved = JSON.parse(localStorage.getItem('hotelFolios') || '[]')
      setFolios(saved)
      setFilteredFolios(saved)
    } finally {
      setLoading(false)
    }
  }

  // Filter and sort folios
  useEffect(() => {
    let result = [...folios]

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(f =>
        f.guestName?.toLowerCase().includes(term) ||
        f.folioNumber?.toLowerCase().includes(term) ||
        f.roomNumber?.toLowerCase().includes(term) ||
        f.reservationId?.toLowerCase().includes(term)
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(f => f.status === statusFilter)
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'date':
          comparison = new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          break
        case 'guest':
          comparison = (a.guestName || '').localeCompare(b.guestName || '')
          break
        case 'balance':
          comparison = (b.balance || 0) - (a.balance || 0)
          break
        case 'room':
          comparison = (a.roomNumber || '').localeCompare(b.roomNumber || '')
          break
      }
      return sortOrder === 'asc' ? -comparison : comparison
    })

    setFilteredFolios(result)
  }, [folios, searchTerm, statusFilter, sortBy, sortOrder])

  // Calculate folio totals from transactions
  const calculateFolioTotals = (folio: Folio) => {
    const transactions = folio.transactions || []
    
    const totalCharges = transactions
      .filter(t => t.type === 'charge')
      .reduce((sum, t) => sum + (Number(t.debit) || Number(t.amount) || 0), 0)
    
    const totalPayments = transactions
      .filter(t => t.type === 'payment')
      .reduce((sum, t) => sum + (Number(t.credit) || Number(t.amount) || 0), 0)
    
    const balance = totalCharges - totalPayments

    return { totalCharges, totalPayments, balance }
  }

  // Close folio
  const closeFolio = (folioId: string) => {
    const folio = folios.find(f => f.id === folioId)
    if (!folio) return

    const { balance } = calculateFolioTotals(folio)
    
    if (balance > 0) {
      if (!confirm(`ამ Folio-ს აქვს გადაუხდელი ბალანსი: ₾${balance.toFixed(2)}\n\nნამდვილად გსურთ დახურვა?`)) {
        return
      }
    }

    const updated = folios.map(f =>
      f.id === folioId
        ? { ...f, status: 'closed' as const, closedAt: new Date().toISOString() }
        : f
    )
    setFolios(updated)
    localStorage.setItem('hotelFolios', JSON.stringify(updated))
    
    // Also save to API
    const closedFolio = updated.find(f => f.id === folioId)
    if (closedFolio) {
      fetch('/api/folios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(closedFolio),
      }).catch(err => console.error('[FolioSystem] API save error:', err))
    }
  }

  // Reopen folio
  const reopenFolio = (folioId: string) => {
    const updated = folios.map(f =>
      f.id === folioId
        ? { ...f, status: 'open' as const, closedAt: undefined }
        : f
    )
    setFolios(updated)
    localStorage.setItem('hotelFolios', JSON.stringify(updated))
    
    // Also save to API
    const reopenedFolio = updated.find(f => f.id === folioId)
    if (reopenedFolio) {
      fetch('/api/folios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reopenedFolio),
      }).catch(err => console.error('[FolioSystem] API save error:', err))
    }
  }

  // Print folio
  const printFolio = (folio: Folio) => {
    const { totalCharges, totalPayments, balance } = calculateFolioTotals(folio)
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Folio ${folio.folioNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
          .info { display: flex; justify-content: space-between; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background: #f5f5f5; }
          .amount { text-align: right; }
          .totals { margin-top: 20px; }
          .total-row { display: flex; justify-content: space-between; max-width: 300px; margin-left: auto; padding: 5px 0; }
          .balance { font-size: 1.2em; font-weight: bold; border-top: 2px solid #333; padding-top: 10px; }
          .charge { color: #000; }
          .payment { color: #16a34a; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🏨 Hotel Folio</h1>
          <p><strong>${folio.folioNumber}</strong></p>
        </div>
        
        <div class="info">
          <div>
            <p><strong>სტუმარი:</strong> ${folio.guestName}</p>
            <p><strong>ოთახი:</strong> ${folio.roomNumber}</p>
          </div>
          <div style="text-align: right;">
            <p><strong>Check-In:</strong> ${moment(folio.checkIn).format('DD/MM/YYYY')}</p>
            <p><strong>Check-Out:</strong> ${moment(folio.checkOut).format('DD/MM/YYYY')}</p>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>თარიღი</th>
              <th>აღწერა</th>
              <th class="amount">დარიცხვა</th>
              <th class="amount">გადახდა</th>
            </tr>
          </thead>
          <tbody>
            ${(folio.transactions || []).map(t => `
              <tr>
                <td>${moment(t.date).format('DD/MM/YY')}</td>
                <td>${t.description}</td>
                <td class="amount charge">${t.type === 'charge' ? `₾${(Number(t.debit) || Number(t.amount) || 0).toFixed(2)}` : ''}</td>
                <td class="amount payment">${t.type === 'payment' ? `₾${(Number(t.credit) || Number(t.amount) || 0).toFixed(2)}` : ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="totals">
          <div class="total-row">
            <span>სულ დარიცხვა:</span>
            <span>₾${totalCharges.toFixed(2)}</span>
          </div>
          <div class="total-row">
            <span>სულ გადახდა:</span>
            <span style="color: #16a34a;">₾${totalPayments.toFixed(2)}</span>
          </div>
          <div class="total-row balance">
            <span>ბალანსი:</span>
            <span style="color: ${balance > 0 ? '#dc2626' : '#16a34a'};">₾${balance.toFixed(2)}</span>
          </div>
        </div>
        
        <p style="margin-top: 40px; text-align: center; color: #666; font-size: 12px;">
          გენერირებული: ${moment().format('DD/MM/YYYY HH:mm')}
        </p>
      </body>
      </html>
    `

    const printWindow = window.open('', '', 'height=800,width=600')
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
      printWindow.print()
    }
  }

  // Export to Excel (CSV)
  const exportToExcel = () => {
    const headers = ['Folio #', 'სტუმარი', 'ოთახი', 'Check-In', 'Check-Out', 'დარიცხვა', 'გადახდა', 'ბალანსი', 'სტატუსი']
    
    const rows = filteredFolios.map(f => {
      const { totalCharges, totalPayments, balance } = calculateFolioTotals(f)
      return [
        f.folioNumber,
        f.guestName,
        f.roomNumber,
        moment(f.checkIn).format('DD/MM/YYYY'),
        moment(f.checkOut).format('DD/MM/YYYY'),
        totalCharges.toFixed(2),
        totalPayments.toFixed(2),
        balance.toFixed(2),
        f.status === 'open' ? 'ღია' : 'დახურული'
      ]
    })

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `folios-${moment().format('YYYY-MM-DD')}.csv`
    a.click()
  }

  // Statistics
  const stats = {
    total: folios.length,
    open: folios.filter(f => f.status === 'open').length,
    closed: folios.filter(f => f.status === 'closed').length,
    totalBalance: folios
      .filter(f => f.status === 'open')
      .reduce((sum, f) => sum + calculateFolioTotals(f).balance, 0),
    totalCharges: folios.reduce((sum, f) => sum + calculateFolioTotals(f).totalCharges, 0),
    totalPayments: folios.reduce((sum, f) => sum + calculateFolioTotals(f).totalPayments, 0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">📁 Folios</h2>
          <p className="text-gray-600">სტუმრების ანგარიშები და ტრანზაქციები</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportToExcel}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
          >
            📊 Excel
          </button>
          <button
            onClick={loadFolios}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-sm text-gray-600">სულ Folios</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <div className="text-2xl font-bold">{stats.open}</div>
          <div className="text-sm text-gray-600">ღია</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-gray-500">
          <div className="text-2xl font-bold">{stats.closed}</div>
          <div className="text-sm text-gray-600">დახურული</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
          <div className="text-2xl font-bold">₾{stats.totalBalance.toFixed(0)}</div>
          <div className="text-sm text-gray-600">გადასახდელი</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
          <div className="text-2xl font-bold">₾{stats.totalCharges.toFixed(0)}</div>
          <div className="text-sm text-gray-600">დარიცხული</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-teal-500">
          <div className="text-2xl font-bold">₾{stats.totalPayments.toFixed(0)}</div>
          <div className="text-sm text-gray-600">გადახდილი</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="🔍 ძიება (სახელი, ოთახი, Folio #)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-1">
            {[
              { value: 'all', label: 'ყველა', count: stats.total },
              { value: 'open', label: 'ღია', count: stats.open },
              { value: 'closed', label: 'დახურული', count: stats.closed }
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value as any)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                  statusFilter === opt.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {opt.label} ({opt.count})
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [by, order] = e.target.value.split('-')
              setSortBy(by as any)
              setSortOrder(order as any)
            }}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="date-desc">თარიღი ↓</option>
            <option value="date-asc">თარიღი ↑</option>
            <option value="guest-asc">სტუმარი A-Z</option>
            <option value="guest-desc">სტუმარი Z-A</option>
            <option value="balance-desc">ბალანსი ↓</option>
            <option value="balance-asc">ბალანსი ↑</option>
            <option value="room-asc">ოთახი ↑</option>
          </select>
        </div>
      </div>

      {/* Folios List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredFolios.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-5xl mb-4">📭</div>
            <p>Folio-ები არ მოიძებნა</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Folio #</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">სტუმარი</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">ოთახი</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">თარიღები</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">დარიცხვა</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">გადახდა</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">ბალანსი</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">სტატუსი</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">მოქმედება</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredFolios.map(folio => {
                const { totalCharges, totalPayments, balance } = calculateFolioTotals(folio)
                
                return (
                  <tr 
                    key={folio.id} 
                    className={`hover:bg-gray-50 transition cursor-pointer ${
                      folio.status === 'closed' ? 'bg-gray-50 opacity-75' : ''
                    }`}
                    onClick={() => {
                      if (onSelectFolio) {
                        onSelectFolio(folio)
                      } else {
                        setSelectedFolio(folio)
                      }
                    }}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm text-blue-600">{folio.folioNumber}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{folio.guestName}</div>
                      {/* <div className="text-xs text-gray-500">{folio.reservationId?.slice(0, 15)}...</div> */}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium">
                        {folio.roomNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {(() => {
                        // Try to get dates from folio or calculate from transactions
                        const checkIn = folio.checkIn || folio.openDate || ''
                        const nights = folio.initialRoomCharge?.nights || 
                          (folio.transactions || []).filter((t: any) => t.category === 'room' && t.type === 'charge').length || 0
                        const checkOut = folio.checkOut || (checkIn ? moment(checkIn).add(nights, 'days').format('YYYY-MM-DD') : '')
                        
                        return (
                          <>
                            <div>
                              {checkIn ? moment(checkIn).format('DD/MM') : '-'} - {checkOut ? moment(checkOut).format('DD/MM') : '-'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {nights} ღამე
                            </div>
                          </>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      ₾{totalCharges.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-green-600">
                      ₾{totalPayments.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold ${
                        balance > 0 ? 'text-red-600' : balance < 0 ? 'text-blue-600' : 'text-green-600'
                      }`}>
                        ₾{balance.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        folio.status === 'open'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {folio.status === 'open' ? '🟢 ღია' : '⚫ დახურული'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => printFolio(folio)}
                          className="p-1.5 hover:bg-blue-100 rounded text-blue-600"
                          title="ბეჭდვა"
                        >
                          🖨️
                        </button>
                        {folio.status === 'open' ? (
                          <button
                            onClick={() => closeFolio(folio.id)}
                            className="p-1.5 hover:bg-red-100 rounded text-red-600"
                            title="დახურვა"
                          >
                            🔒
                          </button>
                        ) : (
                          <button
                            onClick={() => reopenFolio(folio.id)}
                            className="p-1.5 hover:bg-green-100 rounded text-green-600"
                            title="გახსნა"
                          >
                            🔓
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Folio Detail Modal */}
      {selectedFolio && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold">{selectedFolio.folioNumber}</h3>
                  <p className="text-blue-100">{selectedFolio.guestName} • ოთახი {selectedFolio.roomNumber}</p>
                </div>
                <button
                  onClick={() => setSelectedFolio(null)}
                  className="p-2 hover:bg-white/20 rounded-lg transition"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    ₾{calculateFolioTotals(selectedFolio).totalCharges.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600">დარიცხული</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    ₾{calculateFolioTotals(selectedFolio).totalPayments.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600">გადახდილი</div>
                </div>
                <div className={`rounded-lg p-4 text-center ${
                  calculateFolioTotals(selectedFolio).balance > 0 ? 'bg-red-50' : 'bg-green-50'
                }`}>
                  <div className={`text-2xl font-bold ${
                    calculateFolioTotals(selectedFolio).balance > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    ₾{calculateFolioTotals(selectedFolio).balance.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600">ბალანსი</div>
                </div>
              </div>

              {/* Transactions */}
              <h4 className="font-bold mb-3">📋 ტრანზაქციები</h4>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">თარიღი</th>
                      <th className="px-3 py-2 text-left">აღწერა</th>
                      <th className="px-3 py-2 text-right">დარიცხვა</th>
                      <th className="px-3 py-2 text-right">გადახდა</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(selectedFolio.transactions || []).map((t, idx) => (
                      <tr key={t.id || idx} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-600">
                          {moment(t.date).format('DD/MM/YY')}
                        </td>
                        <td className="px-3 py-2">
                          <div>{t.description}</div>
                          {t.category && (
                            <span className="text-xs text-gray-500">{t.category}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {t.type === 'charge' && (
                            <span className="text-gray-900">
                              ₾{(Number(t.debit) || Number(t.amount) || 0).toFixed(2)}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {t.type === 'payment' && (
                            <span className="text-green-600">
                              ₾{(Number(t.credit) || Number(t.amount) || 0).toFixed(2)}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t p-4 flex justify-between">
              <button
                onClick={() => printFolio(selectedFolio)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                🖨️ ბეჭდვა
              </button>
              <button
                onClick={() => setSelectedFolio(null)}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                დახურვა
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}