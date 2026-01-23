'use client'

import React, { useState, useEffect } from 'react'
import moment from 'moment'
import { FinancialReportsService } from '../services/FinancialReportsService'

export default function FinancialDashboard() {
  const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'))
  const [revenueReport, setRevenueReport] = useState<any>(null)
  const [managerReport, setManagerReport] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  
  useEffect(() => {
    loadReports()
  }, [selectedDate])
  
  const loadReports = async () => {
    setLoading(true)
    
    try {
      const revenue = await FinancialReportsService.generateDailyRevenueReport(selectedDate)
      const manager = await FinancialReportsService.generateManagerReport(selectedDate)
      
      setRevenueReport(revenue)
      setManagerReport(manager)
    } catch (error) {
      console.error('Error loading reports:', error)
    } finally {
      setLoading(false)
    }
  }
  
  if (loading) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-lg shadow-lg p-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading reports...</p>
        </div>
      </div>
    )
  }
  
  if (!revenueReport || !managerReport) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-lg shadow-lg p-6 text-center">
          <p className="text-gray-500">No data available</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">💰 ფინანსური დეშბორდი</h1>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </div>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <KPICard
          title="შემოსავალი"
          value={`₾${revenueReport.revenue.total.toFixed(2)}`}
          icon="💰"
          color="green"
        />
        <KPICard
          title="დატვირთულობა"
          value={managerReport.kpis.occupancyRate}
          icon="🏨"
          color="blue"
        />
        <KPICard
          title="საშუალო დღიური ტარიფი"
          value={`₾${managerReport.kpis.adr}`}
          icon="📊"
          color="purple"
        />
        <KPICard
          title="შემოსავალი ხელმისაწვდომ ნომერზე"
          value={`₾${managerReport.kpis.revpar}`}
          icon="📈"
          color="orange"
        />
      </div>
      
      {/* Revenue by Category */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-bold mb-4">Revenue by Category</h2>
          <div className="space-y-3">
            {Object.entries(revenueReport.revenue.byCategory)
              .filter(([_, amount]: any) => amount > 0)
              .map(([cat, amount]: any) => (
              <div key={cat} className="flex justify-between items-center">
                <span className="capitalize font-medium">{cat}</span>
                <div className="flex items-center gap-2 flex-1 max-w-xs">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ 
                        width: `${revenueReport.revenue.total > 0 ? (amount / revenueReport.revenue.total) * 100 : 0}%` 
                      }}
                    />
                  </div>
                  <span className="font-bold w-20 text-right">
                    ₾{amount.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
            {Object.values(revenueReport.revenue.byCategory).every((v: any) => v === 0) && (
              <p className="text-gray-500 text-center py-4">No revenue data for this date</p>
            )}
          </div>
        </div>
        
        {/* Revenue by Department */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-bold mb-4">Revenue by Department</h2>
          <div className="space-y-3">
            {Object.entries(revenueReport.revenue.byDepartment)
              .filter(([_, amount]: any) => amount > 0)
              .map(([dept, amount]: any) => (
              <div key={dept} className="flex justify-between items-center">
                <span className="font-medium">{dept}</span>
                <div className="flex items-center gap-2 flex-1 max-w-xs">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ 
                        width: `${revenueReport.revenue.total > 0 ? (amount / revenueReport.revenue.total) * 100 : 0}%` 
                      }}
                    />
                  </div>
                  <span className="font-bold w-20 text-right">
                    ₾{amount.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
            {Object.values(revenueReport.revenue.byDepartment).every((v: any) => v === 0) && (
              <p className="text-gray-500 text-center py-4">No revenue data for this date</p>
            )}
          </div>
        </div>
      </div>
      
      {/* Payment Methods & Tax Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Payment Methods */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-bold mb-4">Payment Methods</h2>
          <div className="space-y-2">
            {Object.entries(revenueReport.payments.methods)
              .filter(([_, amount]: any) => amount > 0)
              .map(([method, amount]: any) => (
              <div key={method} className="flex justify-between">
                <span className="capitalize font-medium">{method}</span>
                <span className="font-bold">₾{amount.toFixed(2)}</span>
              </div>
            ))}
            {revenueReport.payments.total === 0 && (
              <p className="text-gray-500 text-center py-2">No payments for this date</p>
            )}
            {revenueReport.payments.total > 0 && (
              <div className="border-t pt-2 font-bold flex justify-between">
                <span>Total</span>
                <span>₾{revenueReport.payments.total.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Tax Summary */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-bold mb-4">Tax Summary</h2>
          <div className="space-y-2">
            {Object.entries(revenueReport.taxes.taxes || {})
              .filter(([_, amount]: any) => amount > 0)
              .map(([name, amount]: any) => {
                // Get tax rate from Settings for display
                let rate = 0
                if (typeof window !== 'undefined') {
                  try {
                    const savedTaxesStr = localStorage.getItem('hotelTaxes')
                    if (savedTaxesStr) {
                      const savedTaxes = JSON.parse(savedTaxesStr)
                      // Handle both array and object formats
                      if (Array.isArray(savedTaxes)) {
                        const taxInfo = savedTaxes.find((t: any) => 
                          (t.name || t.type) === name
                        )
                        rate = taxInfo?.rate || taxInfo?.value || 0
                      } else if (typeof savedTaxes === 'object' && savedTaxes !== null) {
                        // Object format: { "VAT": 18, "Service": 10 } or { "VAT": { rate: 18 } }
                        const taxValue = savedTaxes[name]
                        if (typeof taxValue === 'number') {
                          rate = taxValue
                        } else if (taxValue && typeof taxValue === 'object') {
                          rate = taxValue.rate || taxValue.value || 0
                        }
                      }
                    }
                  } catch (e) {
                    console.error('Error loading tax rates for display:', e)
                  }
                }
                
                return (
                  <div key={name} className="flex justify-between">
                    <span>{name} {rate > 0 ? `(${rate}%)` : ''}</span>
                    <span>₾{amount.toFixed(2)}</span>
                  </div>
                )
              })}
            {(!revenueReport.taxes.taxes || Object.keys(revenueReport.taxes.taxes).length === 0) && (
              <p className="text-gray-500 text-center py-2">No tax data for this date</p>
            )}
            {revenueReport.taxes.totalTax > 0 && (
              <>
                <div className="border-t pt-2 font-bold flex justify-between">
                  <span>Total Tax</span>
                  <span>₾{revenueReport.taxes.totalTax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500 mt-2">
                  <span>Net Revenue</span>
                  <span>₾{revenueReport.taxes.netRevenue.toFixed(2)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Outstanding Balances */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-lg font-bold mb-4">Financial Position</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-red-50 p-4 rounded border border-red-200">
            <div className="text-sm text-gray-600 mb-1">Outstanding Balances</div>
            <div className="text-2xl font-bold text-red-600">
              ₾{managerReport.financial.outstandingBalances.toFixed(2)}
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded border border-green-200">
            <div className="text-sm text-gray-600 mb-1">Cash Position</div>
            <div className="text-2xl font-bold text-green-600">
              ₾{managerReport.financial.cashPosition.toFixed(2)}
            </div>
          </div>
          <div className="bg-blue-50 p-4 rounded border border-blue-200">
            <div className="text-sm text-gray-600 mb-1">Credit Card Receipts</div>
            <div className="text-2xl font-bold text-blue-600">
              ₾{managerReport.financial.creditCardReceipts.toFixed(2)}
            </div>
          </div>
        </div>
      </div>
      
      {/* Payment History */}
      <PaymentHistory selectedDate={selectedDate} />
    </div>
  )
}

// Payment History Component
const PaymentHistory = ({ selectedDate }: { selectedDate: string }) => {
  const [payments, setPayments] = useState<any[]>([])
  const [filterMethod, setFilterMethod] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>(selectedDate)
  
  useEffect(() => {
    setDateFilter(selectedDate)
  }, [selectedDate])
  
  useEffect(() => {
    loadPayments()
  }, [dateFilter])
  
  const loadPayments = async () => {
    if (typeof window === 'undefined') return
    
    const targetDate = moment(dateFilter).format('YYYY-MM-DD')
    
    // Try API first for folios
    let folios: any[] = []
    try {
      const response = await fetch('/api/folios')
      if (response.ok) {
        const data = await response.json()
        folios = data.folios || []
        console.log('[FinancialDashboard] Loaded folios from API:', folios.length)
      }
    } catch (error) {
      console.error('[FinancialDashboard] API error:', error)
    }
    
    // Fallback to localStorage
    if (folios.length === 0) {
      folios = JSON.parse(localStorage.getItem('hotelFolios') || '[]')
    }
    
    const paymentHistory = JSON.parse(localStorage.getItem('paymentHistory') || '[]')
    
    // Get all payment transactions from folios for the selected date
    const folioPayments = folios.flatMap((f: any) => 
      (f.transactions || f.folioData?.transactions || [])
        .filter((t: any) => {
          if (t.type !== 'payment' && t.type !== 'refund') return false
          const txDate = moment(t.date).format('YYYY-MM-DD')
          return txDate === targetDate
        })
        .map((t: any) => ({
          ...t,
          guestName: f.guestName,
          roomNumber: f.roomNumber,
          folioNumber: f.folioNumber
        }))
    )
    
    // Get payments from paymentHistory localStorage for the selected date
    const historyPayments = paymentHistory
      .filter((p: any) => {
        const paymentDate = moment(p.date).format('YYYY-MM-DD')
        return paymentDate === targetDate
      })
      .map((p: any) => ({
        ...p,
        // Ensure consistent structure
        type: p.type || (p.credit > 0 ? 'payment' : 'refund'),
        credit: p.credit || (p.amount && p.type !== 'refund' ? p.amount : 0),
        debit: p.debit || (p.amount && p.type === 'refund' ? p.amount : 0),
        time: p.time || moment(p.date).format('HH:mm:ss')
      }))
    
    // Combine and deduplicate by id
    const allPaymentsMap = new Map()
    
    // Add folio payments
    folioPayments.forEach((p: any) => {
      if (p.id) {
        allPaymentsMap.set(p.id, p)
      }
    })
    
    // Add history payments (override if same id, or add if new)
    historyPayments.forEach((p: any) => {
      if (p.id) {
        allPaymentsMap.set(p.id, p)
      } else {
        // If no id, generate one and add
        const newId = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        allPaymentsMap.set(newId, { ...p, id: newId })
      }
    })
    
    const allPayments = Array.from(allPaymentsMap.values())
    
    // Sort by time descending
    allPayments.sort((a: any, b: any) => {
      const timeA = moment(`${a.date} ${a.time || '00:00:00'}`)
      const timeB = moment(`${b.date} ${b.time || '00:00:00'}`)
      return timeB.diff(timeA)
    })
    
    setPayments(allPayments)
  }
  
  const filteredPayments = filterMethod === 'all' 
    ? payments 
    : payments.filter(p => {
        const method = (p.description || '').toLowerCase()
        if (filterMethod === 'cash') return method.includes('cash')
        if (filterMethod === 'card') return method.includes('card')
        if (filterMethod === 'bank') return method.includes('bank')
        if (filterMethod === 'company') return method.includes('company')
        return true
      })
  
  const totalPayments = filteredPayments.filter(p => (p.credit || 0) > 0).length
  const totalRefunds = filteredPayments.filter(p => (p.credit || 0) < 0).length
  const totalAmount = filteredPayments.reduce((sum, p) => sum + (Number(p.credit) || 0), 0)
  const avgPayment = totalPayments > 0 ? totalAmount / totalPayments : 0
  
  const getMethodIcon = (description: string) => {
    const desc = description.toLowerCase()
    if (desc.includes('cash')) return '💵 cash'
    if (desc.includes('card')) return '💳 card'
    if (desc.includes('bank')) return '🏦 bank'
    if (desc.includes('company')) return '🏢 company'
    if (desc.includes('voucher')) return '🎫 voucher'
    return '💰 payment'
  }
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">💳 Payment History</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDateFilter(moment(dateFilter).subtract(1, 'day').format('YYYY-MM-DD'))}
            className="p-2 hover:bg-gray-100 rounded"
          >
            ◀
          </button>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="border rounded px-3 py-1.5 text-sm"
          />
          <button
            onClick={() => setDateFilter(moment(dateFilter).add(1, 'day').format('YYYY-MM-DD'))}
            className="p-2 hover:bg-gray-100 rounded"
          >
            ▶
          </button>
          <button
            onClick={() => setDateFilter(moment().format('YYYY-MM-DD'))}
            className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
          >
            დღეს
          </button>
        </div>
      </div>
      
      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {['all', 'cash', 'card', 'bank', 'company'].map(method => (
          <button
            key={method}
            onClick={() => setFilterMethod(method)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition ${
              filterMethod === method
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {method === 'all' ? 'All Methods' : method.charAt(0).toUpperCase() + method.slice(1)}
          </button>
        ))}
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="text-center p-3 bg-gray-50 rounded">
          <div className="text-2xl font-bold text-blue-600">{totalPayments}</div>
          <div className="text-xs text-gray-500">Total Payments</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded">
          <div className="text-2xl font-bold text-red-600">{totalRefunds}</div>
          <div className="text-xs text-gray-500">Total Refunds</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded">
          <div className="text-2xl font-bold text-green-600">₾{totalAmount.toFixed(2)}</div>
          <div className="text-xs text-gray-500">Total Amount</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded">
          <div className="text-2xl font-bold text-purple-600">₾{avgPayment.toFixed(2)}</div>
          <div className="text-xs text-gray-500">Average Payment</div>
        </div>
      </div>
      
      {/* Payments Table */}
      {filteredPayments.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No payments found for the selected criteria</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">Date/Time</th>
                <th className="px-3 py-2 text-left">Guest</th>
                <th className="px-3 py-2 text-left">Room</th>
                <th className="px-3 py-2 text-left">Method</th>
                <th className="px-3 py-2 text-left">Reference</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredPayments.map((payment, idx) => (
                <tr key={payment.id || idx} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-600">
                    {moment(payment.date).format('DD/MM/YY')} {payment.time?.slice(0, 5) || ''}
                  </td>
                  <td className="px-3 py-2 font-medium">{payment.guestName}</td>
                  <td className="px-3 py-2">{payment.roomNumber}</td>
                  <td className="px-3 py-2">{getMethodIcon(payment.description || '')}</td>
                  <td className="px-3 py-2 text-gray-500 text-xs">
                    {payment.reference || '-'}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      (payment.credit || 0) > 0 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {(payment.credit || 0) > 0 ? 'Payment' : 'Refund'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-bold">
                    <span className={(payment.credit || 0) > 0 ? 'text-green-600' : 'text-red-600'}>
                      {(payment.credit || 0) > 0 ? '+' : ''}₾{(payment.credit || 0).toFixed(2)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// KPI Card Component
const KPICard = ({ title, value, icon, color }: {
  title: string
  value: string
  icon: string
  color: 'green' | 'blue' | 'purple' | 'orange'
}) => {
  const colors = {
    green: 'bg-green-50 text-green-600 border-green-200',
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200'
  }
  
  return (
    <div className={`rounded-lg p-6 border ${colors[color]}`}>
      <div className="text-3xl mb-2">{icon}</div>
      <div className="text-sm opacity-75 mb-1">{title}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  )
}