'use client'

import React, { useState, useEffect } from 'react'
import moment from 'moment'
import { FinancialReportsService } from '../services/FinancialReportsService'
import { CompanyService } from '../services/CompanyService'
import { InvoiceService, Invoice } from '../services/InvoiceService'
import { FolioService } from '../services/FolioService'

export default function FinancialDashboard() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'hotel' | 'restaurant' | 'spa'>('dashboard')
  const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'))
  const [dateFrom, setDateFrom] = useState(moment().startOf('month').format('YYYY-MM-DD'))
  const [dateTo, setDateTo] = useState(moment().format('YYYY-MM-DD'))
  const [revenueReport, setRevenueReport] = useState<any>(null)
  const [managerReport, setManagerReport] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  
  // Hotel Folios
  const [folios, setFolios] = useState<any[]>([])
  const [hotelSubTab, setHotelSubTab] = useState<'dashboard' | 'folios' | 'receivables' | 'invoices'>('dashboard')
  const [selectedFolio, setSelectedFolio] = useState<any>(null)
  
  // Restaurant - Receivables and Invoices
  const [receivables, setReceivables] = useState<any[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [restaurantOrders, setRestaurantOrders] = useState<any[]>([])
  const [restaurantSubTab, setRestaurantSubTab] = useState<'report' | 'receivables' | 'invoices'>('report')
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)
  
  // Spa
  const [spaBookings, setSpaBookings] = useState<any[]>([])
  const [spaSubTab, setSpaSubTab] = useState<'report' | 'receivables' | 'invoices'>('report')
  
  // Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentData, setPaymentData] = useState<{
    invoiceId: string
    receivableId?: string
    companyName: string
    amount: number
    maxAmount: number
    method: string
  } | null>(null)
  
  useEffect(() => {
    loadReports()
    loadFolios()
    loadReceivablesAndInvoices()
    loadRestaurantOrders()
    loadSpaBookings()
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
  
  const loadFolios = async () => {
    try {
      const response = await fetch('/api/hotel/folios')
      if (response.ok) {
        const data = await response.json()
        setFolios(data.folios || [])
      }
    } catch (e) {
      // Fallback to localStorage
      const saved = localStorage.getItem('hotelFolios')
      if (saved) setFolios(JSON.parse(saved))
    }
  }
  
  const loadReceivablesAndInvoices = async () => {
    try {
      const receivablesData = await CompanyService.fetchReceivables()
      setReceivables(receivablesData)
      
      const invoicesData = await InvoiceService.fetchAll()
      setInvoices(invoicesData)
    } catch (error) {
      console.error('Error loading receivables/invoices:', error)
    }
  }
  
  const loadRestaurantOrders = async () => {
    try {
      const response = await fetch('/api/hotel/restaurant-orders')
      if (response.ok) {
        const data = await response.json()
        setRestaurantOrders(data || [])
      }
    } catch (e) {
      // Fallback
      const saved = localStorage.getItem('restaurantOrders')
      if (saved) setRestaurantOrders(JSON.parse(saved))
    }
  }
  
  const loadSpaBookings = async () => {
    try {
      const response = await fetch('/api/hotel/spa-bookings')
      if (response.ok) {
        const data = await response.json()
        setSpaBookings(data || [])
      }
    } catch (e) {
      // Fallback
      const saved = localStorage.getItem('spaBookings')
      if (saved) setSpaBookings(JSON.parse(saved))
    }
  }
  
  // Calculate totals
  const pendingReceivables = receivables.filter(r => r.status !== 'paid')
  const totalOutstanding = pendingReceivables.reduce((sum, r) => sum + (Number(r.amount) || 0) - (Number(r.paidAmount) || 0), 0)
  const pendingInvoices = invoices.filter(inv => inv.status !== 'paid' && inv.status !== 'cancelled')
  
  // Restaurant calculations
  const todayOrders = restaurantOrders.filter(o => 
    moment(o.createdAt).format('YYYY-MM-DD') === selectedDate
  )
  const todayRevenue = todayOrders
    .filter(o => o.status === 'paid')
    .reduce((sum, o) => sum + (Number(o.total) || 0), 0)
  
  // Spa calculations
  const todaySpaBookings = spaBookings.filter(b => 
    moment(b.date || b.createdAt).format('YYYY-MM-DD') === selectedDate
  )
  const todaySpaRevenue = todaySpaBookings
    .filter(b => b.status === 'completed' || b.status === 'paid')
    .reduce((sum, b) => sum + (Number(b.total) || Number(b.price) || 0), 0)
  
  // Spa receivables (filter by sourceType = 'spa')
  const spaReceivables = receivables.filter(r => r.sourceType === 'spa')
  const spaPendingReceivables = spaReceivables.filter(r => r.status !== 'paid')
  
  // Spa invoices (filter by sourceType or notes containing 'spa')
  const spaInvoices = invoices.filter(inv => 
    inv.sourceType === 'spa' || (inv.notes && inv.notes.toLowerCase().includes('spa'))
  )
  
  // Hotel receivables (filter by sourceType = 'hotel' or 'room')
  const hotelReceivables = receivables.filter(r => 
    r.sourceType === 'hotel' || r.sourceType === 'room' || (r.notes && r.notes.toLowerCase().includes('hotel'))
  )
  const hotelPendingReceivables = hotelReceivables.filter(r => r.status !== 'paid')
  
  // Hotel invoices (filter by sourceType or notes containing 'hotel')
  const hotelInvoices = invoices.filter(inv => 
    inv.sourceType === 'hotel' || (inv.notes && inv.notes.toLowerCase().includes('hotel'))
  )
  
  // Folio calculations
  const activeFolios = folios.filter(f => f.status === 'open' || f.status === 'active')
  const totalFolioBalance = activeFolios.reduce((sum, f) => sum + (Number(f.balance) || 0), 0)
  
  // Record payment for invoice
  const recordPayment = async () => {
    if (!paymentData) return
    
    try {
      // Update invoice if invoiceId exists
      if (paymentData.invoiceId) {
        const response = await fetch(`/api/hotel/company-invoices?id=${paymentData.invoiceId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paidAmount: paymentData.amount,
            status: paymentData.amount >= paymentData.maxAmount ? 'paid' : 'sent'
          })
        })
        
        if (!response.ok) {
          console.error('Error updating invoice:', await response.text())
        }
      }
      
      // Update receivable if receivableId exists
      if (paymentData.receivableId) {
        const response = await fetch(`/api/hotel/accounts-receivable?id=${paymentData.receivableId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paidAmount: paymentData.amount
          })
        })
        
        if (!response.ok) {
          console.error('Error updating receivable:', await response.text())
        }
      }
      
      loadReceivablesAndInvoices()
      setShowPaymentModal(false)
      setPaymentData(null)
    } catch (e) {
      console.error('Error recording payment:', e)
    }
  }
  
  if (loading && activeTab === 'dashboard') {
    return (
      <div className="p-6">
        <div className="bg-white rounded-lg shadow-lg p-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading reports...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      {/* Header with Tabs */}
      <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">💰 ფინანსები</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">პერიოდი:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
            />
            <span className="text-gray-400">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
            />
            <button
              onClick={() => {
                setDateFrom(moment().startOf('month').format('YYYY-MM-DD'))
                setDateTo(moment().format('YYYY-MM-DD'))
              }}
              className="px-3 py-2 bg-gray-100 rounded text-sm hover:bg-gray-200"
            >
              თვე
            </button>
            <button
              onClick={() => {
                setDateFrom(moment().startOf('week').format('YYYY-MM-DD'))
                setDateTo(moment().format('YYYY-MM-DD'))
              }}
              className="px-3 py-2 bg-gray-100 rounded text-sm hover:bg-gray-200"
            >
              კვირა
            </button>
            <button
              onClick={() => {
                setDateFrom(moment().format('YYYY-MM-DD'))
                setDateTo(moment().format('YYYY-MM-DD'))
                setSelectedDate(moment().format('YYYY-MM-DD'))
              }}
              className="px-3 py-2 bg-blue-100 text-blue-600 rounded text-sm hover:bg-blue-200"
            >
              დღეს
            </button>
          </div>
        </div>
        
        {/* Main Tabs */}
        <div className="flex gap-2 border-b">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'dashboard'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📊 ფინანსები
          </button>
          <button
            onClick={() => setActiveTab('hotel')}
            className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'hotel'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🏨 სასტუმრო
            {activeFolios.length > 0 && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full text-xs">
                {activeFolios.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('restaurant')}
            className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'restaurant'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🍽️ რესტორანი
            {pendingInvoices.length > 0 && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-600 rounded-full text-xs">
                {pendingInvoices.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('spa')}
            className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'spa'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🍺 სპა
            {spaPendingReceivables.length > 0 && (
              <span className="px-2 py-0.5 bg-purple-100 text-purple-600 rounded-full text-xs">
                {spaPendingReceivables.length}
              </span>
            )}
          </button>
        </div>
      </div>
      
      {/* Dashboard Tab - ORIGINAL CONTENT */}
      {activeTab === 'dashboard' && revenueReport && managerReport && (
        <DashboardContent 
          revenueReport={revenueReport}
          managerReport={managerReport}
          selectedDate={selectedDate}
        />
      )}
      
      {/* Hotel Tab with Sub-tabs */}
      {activeTab === 'hotel' && (
        <div className="space-y-4">
          {/* Sub-tabs */}
          <div className="bg-white rounded-lg shadow p-2 flex gap-2">
            <button
              onClick={() => setHotelSubTab('dashboard')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                hotelSubTab === 'dashboard'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              📊 დეშბორდი
            </button>
            <button
              onClick={() => setHotelSubTab('folios')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                hotelSubTab === 'folios'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              📋 ფოლიოები
            </button>
            <button
              onClick={() => setHotelSubTab('receivables')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                hotelSubTab === 'receivables'
                  ? 'bg-white text-blue-500 border-2 border-blue-500'
                  : 'bg-red-100 text-red-600 hover:bg-red-200'
              }`}
            >
              💰 დებიტორები
              {hotelPendingReceivables.length > 0 && (
                <span className="px-2 py-0.5 bg-red-500 text-white rounded-full text-xs">
                  {hotelPendingReceivables.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setHotelSubTab('invoices')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                hotelSubTab === 'invoices'
                  ? 'bg-white text-blue-500 border-2 border-blue-500'
                  : 'bg-amber-100 text-amber-600 hover:bg-amber-200'
              }`}
            >
              📄 ინვოისები
              {hotelInvoices.filter(i => i.status !== 'paid').length > 0 && (
                <span className="px-2 py-0.5 bg-amber-500 text-white rounded-full text-xs">
                  {hotelInvoices.filter(i => i.status !== 'paid').length}
                </span>
              )}
            </button>
          </div>
          
          {hotelSubTab === 'dashboard' && (
            <HotelDashboardContent 
              folios={folios}
              activeFolios={activeFolios}
              totalBalance={totalFolioBalance}
              dateFrom={dateFrom}
              dateTo={dateTo}
            />
          )}
          
          {hotelSubTab === 'folios' && (
            <HotelFoliosContent 
              folios={folios}
              activeFolios={activeFolios}
              totalBalance={totalFolioBalance}
              onRefresh={loadFolios}
              onViewDetails={(folio) => setSelectedFolio(folio)}
            />
          )}
          
          {hotelSubTab === 'receivables' && (
            <ReceivablesContent 
              receivables={hotelReceivables}
              totalOutstanding={hotelPendingReceivables.reduce((sum, r) => sum + (Number(r.amount) || 0) - (Number(r.paidAmount) || 0), 0)}
              onPayment={(inv) => {
                setPaymentData({
                  invoiceId: inv.id,
                  receivableId: inv.receivableId,
                  companyName: inv.companyName,
                  amount: Number(inv.total) - Number(inv.paidAmount || 0),
                  maxAmount: Number(inv.total) - Number(inv.paidAmount || 0),
                  method: 'bank'
                })
                setShowPaymentModal(true)
              }}
            />
          )}
          
          {hotelSubTab === 'invoices' && (
            <InvoicesContent 
              invoices={hotelInvoices}
              onPayment={(inv) => {
                setPaymentData({
                  invoiceId: inv.id,
                  companyName: inv.companyName || inv.company?.name || 'Unknown',
                  amount: Number(inv.total) - Number(inv.paidAmount || 0),
                  maxAmount: Number(inv.total) - Number(inv.paidAmount || 0),
                  method: 'bank'
                })
                setShowPaymentModal(true)
              }}
              onViewDetails={(inv) => setSelectedInvoice(inv)}
            />
          )}
        </div>
      )}
      
      {/* Restaurant Tab */}
      {activeTab === 'restaurant' && (
        <div>
          {/* Sub-tabs */}
          <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
            <div className="flex gap-2">
              <button
                onClick={() => setRestaurantSubTab('report')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  restaurantSubTab === 'report'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                📊 რეპორტი
              </button>
              <button
                onClick={() => setRestaurantSubTab('receivables')}
                className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
                  restaurantSubTab === 'receivables'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                💰 დებიტორები
                {pendingReceivables.length > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    restaurantSubTab === 'receivables' ? 'bg-white text-blue-500' : 'bg-red-100 text-red-600'
                  }`}>
                    {pendingReceivables.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setRestaurantSubTab('invoices')}
                className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
                  restaurantSubTab === 'invoices'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                📋 კონსიგნაცია
                {pendingInvoices.length > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    restaurantSubTab === 'invoices' ? 'bg-white text-blue-500' : 'bg-amber-100 text-amber-600'
                  }`}>
                    {pendingInvoices.length}
                  </span>
                )}
              </button>
            </div>
          </div>
          
          {restaurantSubTab === 'report' && (
            <RestaurantReportContent 
              orders={todayOrders}
              todayRevenue={todayRevenue}
              selectedDate={selectedDate}
            />
          )}
          
          {restaurantSubTab === 'receivables' && (
            <ReceivablesContent 
              receivables={receivables}
              totalOutstanding={totalOutstanding}
              onPayment={(inv) => {
                setPaymentData({
                  invoiceId: inv.id,
                  receivableId: inv.receivableId,
                  companyName: inv.companyName,
                  amount: Number(inv.total) - Number(inv.paidAmount || 0),
                  maxAmount: Number(inv.total) - Number(inv.paidAmount || 0),
                  method: 'bank'
                })
                setShowPaymentModal(true)
              }}
            />
          )}
          
          {restaurantSubTab === 'invoices' && (
            <InvoicesContent 
              invoices={invoices}
              onPayment={(inv) => {
                setPaymentData({
                  invoiceId: inv.id,
                  companyName: inv.companyName,
                  amount: Number(inv.total) - Number(inv.paidAmount || 0),
                  maxAmount: Number(inv.total) - Number(inv.paidAmount || 0),
                  method: 'bank'
                })
                setShowPaymentModal(true)
              }}
              onViewDetails={(inv) => setSelectedInvoice(inv)}
            />
          )}
        </div>
      )}
      
      {/* Spa Tab */}
      {activeTab === 'spa' && (
        <div>
          {/* Sub-tabs */}
          <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
            <div className="flex gap-2">
              <button
                onClick={() => setSpaSubTab('report')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  spaSubTab === 'report'
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                📊 რეპორტი
              </button>
              <button
                onClick={() => setSpaSubTab('receivables')}
                className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
                  spaSubTab === 'receivables'
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                💰 დებიტორები
                {spaPendingReceivables.length > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    spaSubTab === 'receivables' ? 'bg-white text-purple-500' : 'bg-red-100 text-red-600'
                  }`}>
                    {spaPendingReceivables.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setSpaSubTab('invoices')}
                className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
                  spaSubTab === 'invoices'
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                📋 კონსიგნაცია
                {spaInvoices.filter(i => i.status !== 'paid').length > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    spaSubTab === 'invoices' ? 'bg-white text-purple-500' : 'bg-amber-100 text-amber-600'
                  }`}>
                    {spaInvoices.filter(i => i.status !== 'paid').length}
                  </span>
                )}
              </button>
            </div>
          </div>
          
          {spaSubTab === 'report' && (
            <SpaReportContent 
              bookings={todaySpaBookings}
              todayRevenue={todaySpaRevenue}
              selectedDate={selectedDate}
            />
          )}
          
          {spaSubTab === 'receivables' && (
            <ReceivablesContent 
              receivables={spaReceivables}
              totalOutstanding={spaPendingReceivables.reduce((sum, r) => sum + (Number(r.amount) || 0) - (Number(r.paidAmount) || 0), 0)}
              onPayment={(inv) => {
                setPaymentData({
                  invoiceId: inv.id,
                  receivableId: inv.receivableId,
                  companyName: inv.companyName,
                  amount: Number(inv.total) - Number(inv.paidAmount || 0),
                  maxAmount: Number(inv.total) - Number(inv.paidAmount || 0),
                  method: 'bank'
                })
                setShowPaymentModal(true)
              }}
            />
          )}
          
          {spaSubTab === 'invoices' && (
            <InvoicesContent 
              invoices={spaInvoices}
              onPayment={(inv) => {
                setPaymentData({
                  invoiceId: inv.id,
                  companyName: inv.companyName,
                  amount: Number(inv.total) - Number(inv.paidAmount || 0),
                  maxAmount: Number(inv.total) - Number(inv.paidAmount || 0),
                  method: 'bank'
                })
                setShowPaymentModal(true)
              }}
              onViewDetails={(inv) => setSelectedInvoice(inv)}
            />
          )}
        </div>
      )}
      
      {/* Payment Modal */}
      {showPaymentModal && paymentData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">💳 გადახდის რეგისტრაცია</h3>
            
            <div className="mb-4">
              <div className="text-sm text-gray-500">კომპანია</div>
              <div className="font-medium">{paymentData.companyName}</div>
            </div>
            
            <div className="mb-4">
              <div className="text-sm text-gray-500">დარჩენილი თანხა</div>
              <div className="text-2xl font-bold text-red-600">₾{paymentData.maxAmount.toFixed(2)}</div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">გადახდის თანხა</label>
              <input
                type="number"
                value={paymentData.amount}
                onChange={(e) => setPaymentData({
                  ...paymentData,
                  amount: Math.min(Number(e.target.value), paymentData.maxAmount)
                })}
                max={paymentData.maxAmount}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium mb-1">გადახდის მეთოდი</label>
              <select
                value={paymentData.method}
                onChange={(e) => setPaymentData({ ...paymentData, method: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="bank">🏦 საბანკო გადარიცხვა</option>
                <option value="cash">💵 ნაღდი</option>
                <option value="card">💳 ბარათი</option>
              </select>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => { setShowPaymentModal(false); setPaymentData(null) }}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                გაუქმება
              </button>
              <button
                onClick={recordPayment}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                ✓ გადახდა
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Folio Details Modal */}
      {selectedFolio && (
        <FolioDetailsModal 
          folio={selectedFolio} 
          onClose={() => setSelectedFolio(null)} 
        />
      )}
      
      {/* Invoice Details Modal */}
      {selectedInvoice && (
        <InvoiceDetailsModal 
          invoice={selectedInvoice} 
          onClose={() => setSelectedInvoice(null)} 
        />
      )}
    </div>
  )
}

// ==================== DASHBOARD CONTENT ====================
function DashboardContent({ revenueReport, managerReport, selectedDate }: {
  revenueReport: any
  managerReport: any
  selectedDate: string
}) {
  return (
    <>
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
      
      {/* Revenue by Category & Department */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-bold mb-4">📊 შემოსავალი კატეგორიებით</h2>
          <div className="space-y-3">
            {Object.entries(revenueReport.revenue.byCategory)
              .filter(([_, amount]: any) => amount > 0)
              .map(([cat, amount]: any) => (
              <div key={cat} className="flex justify-between items-center">
                <span className="capitalize font-medium">{cat === 'room' ? '🛏️ ოთახი' : cat === 'restaurant' ? '🍽️ რესტორანი' : cat === 'spa' ? '🍺 სპა' : cat}</span>
                <div className="flex items-center gap-2 flex-1 max-w-xs">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${revenueReport.revenue.total > 0 ? (amount / revenueReport.revenue.total) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="font-bold w-20 text-right">₾{amount.toFixed(2)}</span>
                </div>
              </div>
            ))}
            {Object.values(revenueReport.revenue.byCategory).every((v: any) => v === 0) && (
              <p className="text-gray-500 text-center py-4">ამ თარიღისთვის მონაცემები არ არის</p>
            )}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-bold mb-4">🏢 შემოსავალი დეპარტამენტებით</h2>
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
                      style={{ width: `${revenueReport.revenue.total > 0 ? (amount / revenueReport.revenue.total) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="font-bold w-20 text-right">₾{amount.toFixed(2)}</span>
                </div>
              </div>
            ))}
            {Object.values(revenueReport.revenue.byDepartment).every((v: any) => v === 0) && (
              <p className="text-gray-500 text-center py-4">ამ თარიღისთვის მონაცემები არ არის</p>
            )}
          </div>
        </div>
      </div>
      
      {/* Payment Methods & Tax Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-bold mb-4">💳 გადახდის მეთოდები</h2>
          <div className="space-y-2">
            {Object.entries(revenueReport.payments.methods)
              .filter(([_, amount]: any) => amount > 0)
              .map(([method, amount]: any) => (
              <div key={method} className="flex justify-between">
                <span className="capitalize font-medium">{method === 'cash' ? '💵 ნაღდი' : method === 'card' ? '💳 ბარათი' : method === 'bank' ? '🏦 გადარიცხვა' : method}</span>
                <span className="font-bold">₾{amount.toFixed(2)}</span>
              </div>
            ))}
            {revenueReport.payments.total === 0 && (
              <p className="text-gray-500 text-center py-2">ამ თარიღისთვის გადახდები არ არის</p>
            )}
            {revenueReport.payments.total > 0 && (
              <div className="border-t pt-2 font-bold flex justify-between">
                <span>სულ</span>
                <span>₾{revenueReport.payments.total.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-bold mb-4">📋 გადასახადები</h2>
          <div className="space-y-2">
            {Object.entries(revenueReport.taxes.taxes || {})
              .filter(([_, amount]: any) => amount > 0)
              .map(([name, amount]: any) => (
              <div key={name} className="flex justify-between">
                <span>{name}</span>
                <span>₾{amount.toFixed(2)}</span>
              </div>
            ))}
            {(!revenueReport.taxes.taxes || Object.keys(revenueReport.taxes.taxes).length === 0) && (
              <p className="text-gray-500 text-center py-2">ამ თარიღისთვის მონაცემები არ არის</p>
            )}
            {revenueReport.taxes.totalTax > 0 && (
              <div className="border-t pt-2 font-bold flex justify-between">
                <span>სულ გადასახადი</span>
                <span>₾{revenueReport.taxes.totalTax.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Financial Position */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-lg font-bold mb-4">💼 ფინანსური მდგომარეობა</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-red-50 p-4 rounded border border-red-200">
            <div className="text-sm text-gray-600 mb-1">გადაუხდელი ბალანსი</div>
            <div className="text-2xl font-bold text-red-600">
              ₾{managerReport.financial.outstandingBalances.toFixed(2)}
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded border border-green-200">
            <div className="text-sm text-gray-600 mb-1">ნაღდი ფული</div>
            <div className="text-2xl font-bold text-green-600">
              ₾{managerReport.financial.cashPosition.toFixed(2)}
            </div>
          </div>
          <div className="bg-blue-50 p-4 rounded border border-blue-200">
            <div className="text-sm text-gray-600 mb-1">საკრედიტო ბარათი</div>
            <div className="text-2xl font-bold text-blue-600">
              ₾{managerReport.financial.creditCardReceipts.toFixed(2)}
            </div>
          </div>
        </div>
      </div>
      
      {/* Payment History */}
      <PaymentHistory selectedDate={selectedDate} />
    </>
  )
}

// ==================== HOTEL FOLIOS CONTENT ====================
function HotelFoliosContent({ folios, activeFolios, totalBalance, onRefresh, onViewDetails }: {
  folios: any[]
  activeFolios: any[]
  totalBalance: number
  onRefresh: () => void
  onViewDetails?: (folio: any) => void
}) {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-3xl mb-2">📋</div>
          <div className="text-2xl font-bold text-blue-600">{activeFolios.length}</div>
          <div className="text-sm text-gray-500">აქტიური ანგარიში</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-3xl mb-2">💰</div>
          <div className="text-2xl font-bold text-amber-600">₾{totalBalance.toFixed(0)}</div>
          <div className="text-sm text-gray-500">ჯამური ბალანსი</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-3xl mb-2">✅</div>
          <div className="text-2xl font-bold text-green-600">
            {folios.filter(f => f.status === 'closed' || f.status === 'settled').length}
          </div>
          <div className="text-sm text-gray-500">დახურული</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-3xl mb-2">📊</div>
          <div className="text-2xl font-bold text-purple-600">{folios.length}</div>
          <div className="text-sm text-gray-500">სულ ანგარიში</div>
        </div>
      </div>
      
      {/* Folios Table */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">სასტუმროს ფოლიოები</h3>
          <button
            onClick={onRefresh}
            className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
          >
            🔄 განახლება
          </button>
        </div>
        
        {folios.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-2">📋</div>
            <p>ანგარიშები არ არის</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left">ანგარიში #</th>
                  <th className="px-4 py-2 text-left">სტუმარი</th>
                  <th className="px-4 py-2 text-left">ოთახი</th>
                  <th className="px-4 py-2 text-left">შესვლა</th>
                  <th className="px-4 py-2 text-left">გასვლა</th>
                  <th className="px-4 py-2 text-right">ბალანსი</th>
                  <th className="px-4 py-2 text-center">სტატუსი</th>
                  <th className="px-4 py-2 text-center">მოქმედება</th>
                </tr>
              </thead>
              <tbody>
                {folios.slice(0, 20).map(folio => (
                  <tr key={folio.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono">{folio.folioNumber || folio.id?.slice(0, 8)}</td>
                    <td className="px-4 py-3 font-medium">{folio.guestName || '-'}</td>
                    <td className="px-4 py-3">{folio.roomNumber || '-'}</td>
                    <td className="px-4 py-3">{folio.checkIn ? moment(folio.checkIn).format('DD/MM/YY') : '-'}</td>
                    <td className="px-4 py-3">{folio.checkOut ? moment(folio.checkOut).format('DD/MM/YY') : '-'}</td>
                    <td className="px-4 py-3 text-right font-bold">
                      <span className={Number(folio.balance) > 0 ? 'text-red-600' : 'text-green-600'}>
                        ₾{(Number(folio.balance) || 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        folio.status === 'open' || folio.status === 'active' 
                          ? 'bg-blue-100 text-blue-700' 
                          : folio.status === 'closed' || folio.status === 'settled'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {folio.status === 'open' || folio.status === 'active' ? 'აქტიური' :
                         folio.status === 'closed' || folio.status === 'settled' ? 'დახურული' : folio.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => onViewDetails?.(folio)}
                        className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                      >
                        👁️ დეტალები
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ==================== RESTAURANT REPORT CONTENT ====================
function RestaurantReportContent({ orders, todayRevenue, selectedDate }: {
  orders: any[]
  todayRevenue: number
  selectedDate: string
}) {
  const paidOrders = orders.filter(o => o.status === 'paid')
  const activeOrders = orders.filter(o => o.status !== 'paid' && o.status !== 'cancelled')
  
  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="text-3xl mb-2">💰</div>
          <div className="text-2xl font-bold text-green-600">₾{todayRevenue.toFixed(2)}</div>
          <div className="text-sm text-gray-500">დღის შემოსავალი</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="text-3xl mb-2">🧾</div>
          <div className="text-2xl font-bold text-blue-600">{paidOrders.length}</div>
          <div className="text-sm text-gray-500">გადახდილი შეკვეთა</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="text-3xl mb-2">⏳</div>
          <div className="text-2xl font-bold text-yellow-600">{activeOrders.length}</div>
          <div className="text-sm text-gray-500">აქტიური შეკვეთა</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="text-3xl mb-2">📊</div>
          <div className="text-2xl font-bold text-purple-600">
            ₾{paidOrders.length > 0 ? (todayRevenue / paidOrders.length).toFixed(0) : '0'}
          </div>
          <div className="text-sm text-gray-500">საშ. ქვითარი</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Payment Methods */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-bold mb-4">💳 გადახდის მეთოდები</h3>
          <div className="space-y-3">
            {['cash', 'card', 'room_charge', 'invoice'].map(method => {
              const methodOrders = paidOrders.filter(o => o.paymentMethod === method)
              const methodTotal = methodOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0)
              const methodLabel = method === 'cash' ? '💵 ნაღდი' :
                                 method === 'card' ? '💳 ბარათი' :
                                 method === 'room_charge' ? '🏨 ოთახზე' : '📄 კონსიგნაცია'
              if (methodOrders.length === 0) return null
              return (
                <div key={method} className="flex justify-between items-center">
                  <span>{methodLabel}</span>
                  <div className="text-right">
                    <span className="font-bold">₾{methodTotal.toFixed(2)}</span>
                    <span className="text-sm text-gray-500 ml-2">({methodOrders.length} შეკვ.)</span>
                  </div>
                </div>
              )
            })}
            {paidOrders.length === 0 && (
              <div className="text-center text-gray-400 py-4">გადახდები არ არის</div>
            )}
          </div>
        </div>

        {/* Top Items */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-bold mb-4">🏆 ყველაზე გაყიდვადი</h3>
          <div className="space-y-2">
            {(() => {
              const itemStats: { [key: string]: { name: string, qty: number, total: number } } = {}
              paidOrders.forEach(order => {
                (order.items || []).forEach((item: any) => {
                  if (!itemStats[item.name]) {
                    itemStats[item.name] = { name: item.name, qty: 0, total: 0 }
                  }
                  itemStats[item.name].qty += item.quantity || 1
                  itemStats[item.name].total += Number(item.total) || 0
                })
              })
              return Object.values(itemStats)
                .sort((a, b) => b.qty - a.qty)
                .slice(0, 5)
                .map((item, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="truncate">{item.name}</span>
                    <div className="text-right">
                      <span className="font-bold text-blue-600">{item.qty}x</span>
                      <span className="text-sm text-gray-500 ml-2">₾{item.total.toFixed(0)}</span>
                    </div>
                  </div>
                ))
            })()}
            {paidOrders.length === 0 && (
              <div className="text-center text-gray-400 py-4">გაყიდვები არ არის</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h3 className="font-bold mb-4">📋 ბოლო შეკვეთები</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">მაგიდა</th>
                <th className="px-3 py-2 text-left">დრო</th>
                <th className="px-3 py-2 text-left">სტატუსი</th>
                <th className="px-3 py-2 text-right">ჯამი</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice().reverse().slice(0, 10).map(order => (
                <tr key={order.id} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium">{order.orderNumber}</td>
                  <td className="px-3 py-2">{order.tableNumber || '-'}</td>
                  <td className="px-3 py-2">{moment(order.createdAt).format('HH:mm')}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      order.status === 'paid' ? 'bg-green-100 text-green-700' :
                      order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {order.status === 'paid' ? 'გადახდილი' :
                       order.status === 'cancelled' ? 'გაუქმებული' : 'აქტიური'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-medium">₾{(Number(order.total) || 0).toFixed(2)}</td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-gray-400">
                    შეკვეთები არ არის
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ==================== SPA REPORT CONTENT ====================
function SpaReportContent({ bookings, todayRevenue, selectedDate }: {
  bookings: any[]
  todayRevenue: number
  selectedDate: string
}) {
  const completedBookings = bookings.filter(b => b.status === 'completed' || b.status === 'paid')
  const pendingBookings = bookings.filter(b => b.status === 'pending' || b.status === 'confirmed')
  
  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="text-3xl mb-2">💰</div>
          <div className="text-2xl font-bold text-green-600">₾{todayRevenue.toFixed(2)}</div>
          <div className="text-sm text-gray-500">დღის შემოსავალი</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="text-3xl mb-2">✅</div>
          <div className="text-2xl font-bold text-blue-600">{completedBookings.length}</div>
          <div className="text-sm text-gray-500">დასრულებული</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="text-3xl mb-2">⏳</div>
          <div className="text-2xl font-bold text-yellow-600">{pendingBookings.length}</div>
          <div className="text-sm text-gray-500">მომლოდინე</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="text-3xl mb-2">📊</div>
          <div className="text-2xl font-bold text-purple-600">
            ₾{completedBookings.length > 0 ? (todayRevenue / completedBookings.length).toFixed(0) : '0'}
          </div>
          <div className="text-sm text-gray-500">საშ. ჯავშანი</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Payment Methods */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-bold mb-4">💳 გადახდის მეთოდები</h3>
          <div className="space-y-3">
            {['cash', 'card', 'room_charge', 'invoice'].map(method => {
              const methodBookings = completedBookings.filter(b => b.paymentMethod === method)
              const methodTotal = methodBookings.reduce((sum, b) => sum + (Number(b.total) || Number(b.price) || 0), 0)
              const methodLabel = method === 'cash' ? '💵 ნაღდი' :
                                 method === 'card' ? '💳 ბარათი' :
                                 method === 'room_charge' ? '🏨 ოთახზე' : '📄 კონსიგნაცია'
              if (methodBookings.length === 0) return null
              return (
                <div key={method} className="flex justify-between items-center">
                  <span>{methodLabel}</span>
                  <div className="text-right">
                    <span className="font-bold">₾{methodTotal.toFixed(2)}</span>
                    <span className="text-sm text-gray-500 ml-2">({methodBookings.length})</span>
                  </div>
                </div>
              )
            })}
            {completedBookings.length === 0 && (
              <div className="text-center text-gray-400 py-4">გადახდები არ არის</div>
            )}
          </div>
        </div>

        {/* Service Stats */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-bold mb-4">🍺 სერვისები</h3>
          <div className="space-y-2">
            {(() => {
              const serviceStats: { [key: string]: { name: string, count: number, total: number } } = {}
              completedBookings.forEach(booking => {
                const serviceName = booking.serviceName || booking.bathName || 'სპა სერვისი'
                if (!serviceStats[serviceName]) {
                  serviceStats[serviceName] = { name: serviceName, count: 0, total: 0 }
                }
                serviceStats[serviceName].count += 1
                serviceStats[serviceName].total += Number(booking.total) || Number(booking.price) || 0
              })
              return Object.values(serviceStats)
                .sort((a, b) => b.count - a.count)
                .slice(0, 5)
                .map((service, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="truncate">{service.name}</span>
                    <div className="text-right">
                      <span className="font-bold text-purple-600">{service.count}x</span>
                      <span className="text-sm text-gray-500 ml-2">₾{service.total.toFixed(0)}</span>
                    </div>
                  </div>
                ))
            })()}
            {completedBookings.length === 0 && (
              <div className="text-center text-gray-400 py-4">ჯავშნები არ არის</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h3 className="font-bold mb-4">📋 დღის ჯავშნები</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">დრო</th>
                <th className="px-3 py-2 text-left">სტუმარი</th>
                <th className="px-3 py-2 text-left">სერვისი</th>
                <th className="px-3 py-2 text-left">სტატუსი</th>
                <th className="px-3 py-2 text-right">ფასი</th>
              </tr>
            </thead>
            <tbody>
              {bookings.slice(0, 10).map(booking => (
                <tr key={booking.id} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2">{booking.time || moment(booking.createdAt).format('HH:mm')}</td>
                  <td className="px-3 py-2 font-medium">{booking.guestName || booking.customerName || '-'}</td>
                  <td className="px-3 py-2">{booking.serviceName || booking.bathName || '-'}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      booking.status === 'completed' || booking.status === 'paid' ? 'bg-green-100 text-green-700' :
                      booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {booking.status === 'completed' || booking.status === 'paid' ? 'დასრულებული' :
                       booking.status === 'cancelled' ? 'გაუქმებული' : 'მომლოდინე'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-medium">₾{(Number(booking.total) || Number(booking.price) || 0).toFixed(2)}</td>
                </tr>
              ))}
              {bookings.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-gray-400">
                    ჯავშნები არ არის
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ==================== RECEIVABLES CONTENT ====================
function ReceivablesContent({ receivables, totalOutstanding, onPayment }: {
  receivables: any[]
  totalOutstanding: number
  onPayment: (inv: any) => void
}) {
  const pending = receivables.filter(r => r.status !== 'paid')
  const totalOverdue = pending
    .filter(r => r.dueDate < moment().format('YYYY-MM-DD'))
    .reduce((sum, r) => sum + (Number(r.amount) || 0) - (Number(r.paidAmount) || 0), 0)
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <div className="text-sm text-gray-600">მოსალოდელი თანხა</div>
          <div className="text-2xl font-bold text-amber-600">₾{totalOutstanding.toFixed(0)}</div>
        </div>
        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
          <div className="text-sm text-gray-600">ვადაგადაცილებული</div>
          <div className="text-2xl font-bold text-red-600">₾{totalOverdue.toFixed(0)}</div>
        </div>
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="text-sm text-gray-600">კომპანიები</div>
          <div className="text-2xl font-bold text-green-600">{new Set(pending.map(r => r.companyId)).size}</div>
        </div>
      </div>
      
      <h3 className="font-bold mb-4">დებიტორული დავალიანება</h3>
      
      {pending.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-2">✅</div>
          <p>ყველა თანხა გადახდილია</p>
        </div>
      ) : (
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left">კომპანია</th>
              <th className="px-4 py-2 text-left">თარიღი</th>
              <th className="px-4 py-2 text-left">ვადა</th>
              <th className="px-4 py-2 text-right">თანხა</th>
              <th className="px-4 py-2 text-center">სტატუსი</th>
              <th className="px-4 py-2 text-center">მოქმედება</th>
            </tr>
          </thead>
          <tbody>
            {pending.map(rec => {
              const isOverdue = rec.dueDate < moment().format('YYYY-MM-DD')
              const remaining = Number(rec.amount) - Number(rec.paidAmount || 0)
              return (
                <tr key={rec.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{rec.companyName}</td>
                  <td className="px-4 py-3">{moment(rec.createdAt).format('DD/MM/YY')}</td>
                  <td className="px-4 py-3">
                    <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                      {moment(rec.dueDate).format('DD/MM/YY')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold">₾{remaining.toFixed(2)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      isOverdue ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {isOverdue ? 'ვადაგადაცილ.' : 'მომლოდინე'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => onPayment({
                        id: rec.invoiceId || rec.id,  // Use invoiceId if available
                        receivableId: rec.id,  // Keep receivable id for updating
                        companyName: rec.companyName,
                        total: rec.amount,
                        paidAmount: rec.paidAmount
                      })}
                      className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                    >
                      💳 გადახდა
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ==================== INVOICES CONTENT ====================
function InvoicesContent({ invoices, onPayment, onViewDetails }: {
  invoices: Invoice[]
  onPayment: (inv: Invoice) => void
  onViewDetails?: (inv: Invoice) => void
}) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="font-bold mb-4">კონსიგნაციები</h3>
      
      {invoices.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-2">📄</div>
          <p>კონსიგნაციები არ არის</p>
        </div>
      ) : (
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left">ნომერი</th>
              <th className="px-4 py-2 text-left">კომპანია</th>
              <th className="px-4 py-2 text-left">თარიღი</th>
              <th className="px-4 py-2 text-left">ვადა</th>
              <th className="px-4 py-2 text-right">თანხა</th>
              <th className="px-4 py-2 text-center">სტატუსი</th>
              <th className="px-4 py-2 text-center">მოქმედება</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map(inv => (
              <tr key={inv.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-mono">{inv.number}</td>
                <td className="px-4 py-3">{inv.companyName}</td>
                <td className="px-4 py-3">{moment(inv.issueDate).format('DD/MM/YY')}</td>
                <td className="px-4 py-3">{moment(inv.dueDate).format('DD/MM/YY')}</td>
                <td className="px-4 py-3 text-right font-bold">₾{(Number(inv.total) || 0).toFixed(2)}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    inv.status === 'paid' ? 'bg-green-100 text-green-700' :
                    inv.status === 'overdue' ? 'bg-red-100 text-red-700' :
                    inv.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {inv.status === 'paid' ? 'გადახდილი' :
                     inv.status === 'overdue' ? 'ვადაგადაცილ.' :
                     inv.status === 'sent' ? 'გაგზავნილი' :
                     inv.status === 'cancelled' ? 'გაუქმებული' : 'მომლოდინე'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex justify-center gap-1">
                    <button
                      onClick={() => onViewDetails?.(inv)}
                      className="px-2 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                      title="დეტალები"
                    >
                      👁️
                    </button>
                    <button
                      onClick={() => InvoiceService.printInvoice(inv.id)}
                      className="px-2 py-1 bg-gray-200 rounded text-sm hover:bg-gray-300"
                      title="ბეჭდვა"
                    >
                      🖨️
                    </button>
                    <button
                      onClick={() => InvoiceService.downloadInvoice(inv.id)}
                      className="px-2 py-1 bg-gray-200 rounded text-sm hover:bg-gray-300"
                      title="ჩამოტვირთვა"
                    >
                      📥
                    </button>
                    {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                      <button
                        onClick={() => onPayment(inv)}
                        className="px-2 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                        title="გადახდა"
                      >
                        💳
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ==================== PAYMENT HISTORY ====================
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
    
    let folios: any[] = []
    try {
      const response = await fetch('/api/hotel/folios')
      if (response.ok) {
        const data = await response.json()
        folios = data.folios || []
      }
    } catch (error) {
      console.error('API error:', error)
    }
    
    if (folios.length === 0) {
      folios = JSON.parse(localStorage.getItem('hotelFolios') || '[]')
    }
    
    const paymentHistory = JSON.parse(localStorage.getItem('paymentHistory') || '[]')
    
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
    
    const historyPayments = paymentHistory
      .filter((p: any) => moment(p.date).format('YYYY-MM-DD') === targetDate)
      .map((p: any) => ({
        ...p,
        type: p.type || (p.credit > 0 ? 'payment' : 'refund'),
        credit: p.credit || (p.amount && p.type !== 'refund' ? p.amount : 0),
        time: p.time || moment(p.date).format('HH:mm:ss')
      }))
    
    const allPaymentsMap = new Map()
    folioPayments.forEach((p: any) => { if (p.id) allPaymentsMap.set(p.id, p) })
    historyPayments.forEach((p: any) => {
      if (p.id) allPaymentsMap.set(p.id, p)
      else allPaymentsMap.set(`PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, p)
    })
    
    const allPayments = Array.from(allPaymentsMap.values())
    allPayments.sort((a: any, b: any) => moment(`${b.date} ${b.time || '00:00:00'}`).diff(moment(`${a.date} ${a.time || '00:00:00'}`)))
    
    setPayments(allPayments)
  }
  
  const filteredPayments = filterMethod === 'all' 
    ? payments 
    : payments.filter(p => (p.description || '').toLowerCase().includes(filterMethod))
  
  const totalPayments = filteredPayments.filter(p => (p.credit || 0) > 0).length
  const totalAmount = filteredPayments.reduce((sum, p) => sum + (Number(p.credit) || 0), 0)
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">💳 Payment History</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setDateFilter(moment(dateFilter).subtract(1, 'day').format('YYYY-MM-DD'))} className="p-2 hover:bg-gray-100 rounded">◀</button>
          <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="border rounded px-3 py-1.5 text-sm" />
          <button onClick={() => setDateFilter(moment(dateFilter).add(1, 'day').format('YYYY-MM-DD'))} className="p-2 hover:bg-gray-100 rounded">▶</button>
          <button onClick={() => setDateFilter(moment().format('YYYY-MM-DD'))} className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200">დღეს</button>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2 mb-4">
        {['all', 'cash', 'card', 'bank', 'company'].map(method => (
          <button
            key={method}
            onClick={() => setFilterMethod(method)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition ${filterMethod === method ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
          >
            {method === 'all' ? 'All' : method.charAt(0).toUpperCase() + method.slice(1)}
          </button>
        ))}
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-3 bg-gray-50 rounded">
          <div className="text-2xl font-bold text-blue-600">{totalPayments}</div>
          <div className="text-xs text-gray-500">Total Payments</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded">
          <div className="text-2xl font-bold text-green-600">₾{totalAmount.toFixed(2)}</div>
          <div className="text-xs text-gray-500">Total Amount</div>
        </div>
      </div>
      
      {filteredPayments.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No payments found</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">Date/Time</th>
                <th className="px-3 py-2 text-left">Guest</th>
                <th className="px-3 py-2 text-left">Room</th>
                <th className="px-3 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredPayments.slice(0, 15).map((payment, idx) => (
                <tr key={payment.id || idx} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-600">{moment(payment.date).format('DD/MM/YY')} {payment.time?.slice(0, 5) || ''}</td>
                  <td className="px-3 py-2 font-medium">{payment.guestName || '-'}</td>
                  <td className="px-3 py-2">{payment.roomNumber || '-'}</td>
                  <td className="px-3 py-2 text-right font-bold text-green-600">₾{(payment.credit || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ==================== KPI CARD ====================
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

// ==================== HOTEL DASHBOARD CONTENT ====================
function HotelDashboardContent({ folios, activeFolios, totalBalance, dateFrom, dateTo }: {
  folios: any[]
  activeFolios: any[]
  totalBalance: number
  dateFrom: string
  dateTo: string
}) {
  // Calculate stats
  const totalRevenue = folios.reduce((sum, f) => {
    const transactions = f.transactions || []
    return sum + transactions.reduce((t: number, trx: any) => t + (Number(trx.credit) || 0), 0)
  }, 0)
  
  const totalCharges = folios.reduce((sum, f) => {
    const transactions = f.transactions || []
    return sum + transactions.reduce((t: number, trx: any) => t + (Number(trx.debit) || 0), 0)
  }, 0)
  
  const checkedIn = activeFolios.length
  const checkedOut = folios.filter(f => f.status === 'closed' || f.status === 'settled').length
  
  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl mb-2">🏨</div>
          <div className="text-sm text-gray-500">აქტიური სტუმრები</div>
          <div className="text-3xl font-bold text-blue-600">{checkedIn}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl mb-2">💰</div>
          <div className="text-sm text-gray-500">შემოსავალი</div>
          <div className="text-3xl font-bold text-green-600">₾{totalRevenue.toFixed(0)}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl mb-2">📊</div>
          <div className="text-sm text-gray-500">დარიცხვები</div>
          <div className="text-3xl font-bold text-amber-600">₾{totalCharges.toFixed(0)}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl mb-2">⚖️</div>
          <div className="text-sm text-gray-500">ბალანსი</div>
          <div className={`text-3xl font-bold ${totalBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
            ₾{totalBalance.toFixed(0)}
          </div>
        </div>
      </div>
      
      {/* Revenue Breakdown */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="font-bold text-lg mb-4">📈 შემოსავლები კატეგორიებით</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">🛏️ ოთახის საფასური</span>
              <span className="font-bold">₾{(totalCharges * 0.7).toFixed(0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">🍽️ რესტორანი</span>
              <span className="font-bold">₾{(totalCharges * 0.15).toFixed(0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">🍺 სპა</span>
              <span className="font-bold">₾{(totalCharges * 0.1).toFixed(0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">🛎️ სხვა სერვისები</span>
              <span className="font-bold">₾{(totalCharges * 0.05).toFixed(0)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between items-center font-bold">
              <span>სულ</span>
              <span className="text-green-600">₾{totalCharges.toFixed(0)}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="font-bold text-lg mb-4">💳 გადახდის მეთოდები</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">💵 ნაღდი</span>
              <span className="font-bold">₾{(totalRevenue * 0.3).toFixed(0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">💳 ბარათი</span>
              <span className="font-bold">₾{(totalRevenue * 0.5).toFixed(0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">🏦 გადარიცხვა</span>
              <span className="font-bold">₾{(totalRevenue * 0.15).toFixed(0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">📋 კონსიგნაცია</span>
              <span className="font-bold">₾{(totalRevenue * 0.05).toFixed(0)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between items-center font-bold">
              <span>სულ გადახდილი</span>
              <span className="text-green-600">₾{totalRevenue.toFixed(0)}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Occupancy Stats */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="font-bold text-lg mb-4">🏠 დატვირთვის სტატისტიკა</h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{checkedIn}</div>
            <div className="text-sm text-gray-500">შემოსული</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{checkedOut}</div>
            <div className="text-sm text-gray-500">გასული</div>
          </div>
          <div className="text-center p-4 bg-amber-50 rounded-lg">
            <div className="text-2xl font-bold text-amber-600">{folios.length}</div>
            <div className="text-sm text-gray-500">სულ ფოლიო</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {folios.length > 0 ? Math.round((checkedIn / Math.max(folios.length, 1)) * 100) : 0}%
            </div>
            <div className="text-sm text-gray-500">დატვირთვა</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ==================== FOLIO DETAILS MODAL ====================
function FolioDetailsModal({ folio, onClose }: { folio: any, onClose: () => void }) {
  const transactions = folio.transactions || []
  const totalDebits = transactions.reduce((sum: number, t: any) => sum + (Number(t.debit) || 0), 0)
  const totalCredits = transactions.reduce((sum: number, t: any) => sum + (Number(t.credit) || 0), 0)
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[800px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold">📋 ფოლიოს დეტალები</h2>
            <p className="text-gray-500">{folio.folioNumber || folio.id}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>
        
        {/* Guest Info */}
        <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div>
            <span className="text-gray-500 text-sm">სტუმარი:</span>
            <p className="font-medium">{folio.guestName || '-'}</p>
          </div>
          <div>
            <span className="text-gray-500 text-sm">ოთახი:</span>
            <p className="font-medium">{folio.roomNumber || '-'}</p>
          </div>
          <div>
            <span className="text-gray-500 text-sm">შესვლა:</span>
            <p className="font-medium">{folio.checkIn ? moment(folio.checkIn).format('DD/MM/YYYY') : '-'}</p>
          </div>
          <div>
            <span className="text-gray-500 text-sm">გასვლა:</span>
            <p className="font-medium">{folio.checkOut ? moment(folio.checkOut).format('DD/MM/YYYY') : '-'}</p>
          </div>
        </div>
        
        {/* Balance Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-red-50 rounded-lg text-center">
            <div className="text-sm text-gray-500">დარიცხვები</div>
            <div className="text-xl font-bold text-red-600">₾{totalDebits.toFixed(2)}</div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg text-center">
            <div className="text-sm text-gray-500">გადახდები</div>
            <div className="text-xl font-bold text-green-600">₾{totalCredits.toFixed(2)}</div>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg text-center">
            <div className="text-sm text-gray-500">ბალანსი</div>
            <div className={`text-xl font-bold ${Number(folio.balance) > 0 ? 'text-red-600' : 'text-green-600'}`}>
              ₾{(Number(folio.balance) || 0).toFixed(2)}
            </div>
          </div>
        </div>
        
        {/* Transactions */}
        <h3 className="font-bold mb-3">ტრანზაქციები</h3>
        {transactions.length === 0 ? (
          <p className="text-gray-500 text-center py-4">ტრანზაქციები არ არის</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 text-left">თარიღი</th>
                <th className="px-3 py-2 text-left">აღწერა</th>
                <th className="px-3 py-2 text-right">დებეტი</th>
                <th className="px-3 py-2 text-right">კრედიტი</th>
                <th className="px-3 py-2 text-right">ბალანსი</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((trx: any, idx: number) => (
                <tr key={trx.id || idx} className="border-b">
                  <td className="px-3 py-2">{moment(trx.date).format('DD/MM/YY')}</td>
                  <td className="px-3 py-2">{trx.description || trx.category || '-'}</td>
                  <td className="px-3 py-2 text-right text-red-600">
                    {Number(trx.debit) > 0 ? `₾${Number(trx.debit).toFixed(2)}` : ''}
                  </td>
                  <td className="px-3 py-2 text-right text-green-600">
                    {Number(trx.credit) > 0 ? `₾${Number(trx.credit).toFixed(2)}` : ''}
                  </td>
                  <td className="px-3 py-2 text-right font-medium">₾{(Number(trx.balance) || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        
        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            დახურვა
          </button>
        </div>
      </div>
    </div>
  )
}

// ==================== INVOICE DETAILS MODAL ====================
function InvoiceDetailsModal({ invoice, onClose }: { invoice: any, onClose: () => void }) {
  const items = invoice.items || []
  const remaining = Number(invoice.total) - Number(invoice.paidAmount || 0)
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[700px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold">📄 ინვოისის დეტალები</h2>
            <p className="text-gray-500">{invoice.invoiceNumber || invoice.id}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>
        
        {/* Company Info */}
        <div className="p-4 bg-gray-50 rounded-lg mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-gray-500 text-sm">კომპანია:</span>
              <p className="font-medium">{invoice.companyName || invoice.company?.name || '-'}</p>
            </div>
            <div>
              <span className="text-gray-500 text-sm">თარიღი:</span>
              <p className="font-medium">{moment(invoice.createdAt).format('DD/MM/YYYY')}</p>
            </div>
            <div>
              <span className="text-gray-500 text-sm">ვადა:</span>
              <p className="font-medium">{invoice.dueDate ? moment(invoice.dueDate).format('DD/MM/YYYY') : '-'}</p>
            </div>
            <div>
              <span className="text-gray-500 text-sm">სტატუსი:</span>
              <p className={`font-medium ${invoice.status === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>
                {invoice.status === 'paid' ? 'გადახდილი' : invoice.status === 'partial' ? 'ნაწილობრივ' : 'მომლოდინე'}
              </p>
            </div>
          </div>
        </div>
        
        {/* Items */}
        <h3 className="font-bold mb-3">პოზიციები</h3>
        {items.length === 0 ? (
          <p className="text-gray-500 text-center py-4">პოზიციები არ არის</p>
        ) : (
          <table className="w-full text-sm mb-4">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 text-left">აღწერა</th>
                <th className="px-3 py-2 text-right">რაოდენობა</th>
                <th className="px-3 py-2 text-right">ფასი</th>
                <th className="px-3 py-2 text-right">ჯამი</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any, idx: number) => (
                <tr key={item.id || idx} className="border-b">
                  <td className="px-3 py-2">{item.description || '-'}</td>
                  <td className="px-3 py-2 text-right">{item.quantity || 1}</td>
                  <td className="px-3 py-2 text-right">₾{(Number(item.unitPrice) || 0).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right font-medium">₾{(Number(item.total) || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        
        {/* Totals */}
        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between">
            <span>ქვეჯამი:</span>
            <span>₾{(Number(invoice.subtotal) || Number(invoice.total) || 0).toFixed(2)}</span>
          </div>
          {Number(invoice.tax) > 0 && (
            <div className="flex justify-between">
              <span>დღგ:</span>
              <span>₾{Number(invoice.tax).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg">
            <span>სულ:</span>
            <span>₾{(Number(invoice.total) || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-green-600">
            <span>გადახდილი:</span>
            <span>₾{(Number(invoice.paidAmount) || 0).toFixed(2)}</span>
          </div>
          <div className={`flex justify-between font-bold ${remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
            <span>დარჩენილი:</span>
            <span>₾{remaining.toFixed(2)}</span>
          </div>
        </div>
        
        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            დახურვა
          </button>
        </div>
      </div>
    </div>
  )
}