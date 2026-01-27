'use client'

import { useState, useEffect, useMemo } from 'react'
import moment from 'moment'
import { calculateTaxBreakdown } from '../utils/taxCalculator'

interface CashierShift {
  id: string
  userId: string
  userName: string
  openingBalance: number
  cashCollected: number
  cardPayments: number
  chequePayments: number
  bankTransfers: number
  expenses: number
  totalCollected: number
  expectedAmount: number
  discrepancy: number
  discrepancyReason?: string
  openedAt: string
  closedAt?: string
  closedDate?: string
  status: 'open' | 'closed'
  withdrawal?: number
  nextDayOpening?: number
  transactionCount?: number
  transactions?: any[]  // Saved transactions (folio payments + manual income)
  manualTransactions?: any[]  // All manual transactions for reference
}

export default function CashierModule() {
  const [currentShift, setCurrentShift] = useState<CashierShift | null>(null)
  const [shifts, setShifts] = useState<CashierShift[]>([])
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [transactions, setTransactions] = useState<any[]>([])
  const [manualTransactions, setManualTransactions] = useState<any[]>([])
  const [showAddTransaction, setShowAddTransaction] = useState(false)
  const [showXReport, setShowXReport] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [selectedShift, setSelectedShift] = useState<CashierShift | null>(null)
  const [lastRefresh, setLastRefresh] = useState(Date.now())
  const [refreshKey, setRefreshKey] = useState(0)
  const [newTransaction, setNewTransaction] = useState({
    type: 'income' as 'income' | 'expense',
    category: '',
    description: '',
    amount: 0,
    method: 'cash'
  })
  const [closeFormData, setCloseFormData] = useState({
    actualCash: 0,
    nextDayBalance: 0
  })
  
  // Cashier settings
  const [cashierSettings, setCashierSettings] = useState({
    requireCashCount: true,  // ჩამთვლელი - ნაღდი ფულის დათვლა სავალდებულოა
    defaultFloatBalance: 200, // სტანდარტული float თანხა
    allowCashWithdrawal: true // ნაღდი ფულის გატანა დაშვებულია
  })
  
  // Helper function to round currency values (fixes floating point errors like 1771.1999999998)
  const roundCurrency = (value: number): number => {
    return Math.round(value * 100) / 100
  }
  
  // Format currency for display
  const formatCurrency = (value: number): string => {
    return roundCurrency(value).toFixed(2)
  }
  
  // Load cashier settings
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cashierSettings')
      if (saved) {
        try {
          setCashierSettings(prev => ({ ...prev, ...JSON.parse(saved) }))
        } catch (e) {
          console.error('Error loading cashier settings:', e)
        }
      }
    }
  }, [])
  
  // Get business date from localStorage (falls back to real date)
  const getBusinessDate = () => {
    const stored = localStorage.getItem('currentBusinessDate')
    if (stored) return stored
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  }
  
  // Load cashier transactions from API or folios
  const loadCashierTransactions = async () => {
    let folios: any[] = []
    
    // Try API first
    try {
      const response = await fetch('/api/hotel/folios')
      if (response.ok) {
        const data = await response.json()
        const foliosList = Array.isArray(data) ? data : (data.folios || [])
        if (foliosList.length > 0) {
          folios = foliosList.map((f: any) => ({
            ...f,
            transactions: f.transactions || f.folioData?.transactions || f.charges || []
          }))
          console.log('[CashierModule] Loaded folios from API:', folios.length)
        }
      }
    } catch (error) {
      console.error('[CashierModule] API error:', error)
    }
    
    // Fallback to localStorage
    if (folios.length === 0) {
      folios = JSON.parse(localStorage.getItem('hotelFolios') || '[]')
      console.log('[CashierModule] Loaded folios from localStorage:', folios.length)
    }
    
    const today = getBusinessDate()
    const todayTransactions: any[] = []
    
    folios.forEach((folio: any) => {
      if (!folio.transactions) return
      
      folio.transactions.forEach((t: any) => {
        const txDate = t.date
        const isPayment = t.credit > 0
        const isToday = txDate === today
        
        if (isPayment && isToday) {
          todayTransactions.push({
            id: t.id || `tx-${Date.now()}-${Math.random()}`,
            time: t.time || '00:00',
            date: txDate,
            type: 'income',
            category: t.paymentMethod || 'cash',
            description: `${folio.guestName} - Room ${folio.roomNumber || ''}`,
            amount: t.credit || t.amount || 0,
            method: t.paymentMethod || 'cash',
            reference: folio.folioNumber,
            guestName: folio.guestName,
            roomNumber: folio.roomNumber,
            manual: false
          })
        }
      })
    })
    
    return todayTransactions
  }
  
  // Load manual transactions
  const loadManualTransactions = () => {
    const saved = JSON.parse(localStorage.getItem('cashierManualTransactions') || '[]')
    const today = getBusinessDate()
    return saved.filter((t: any) => t.date === today)
  }
  
  // Calculate cashier totals from transactions
  const calculateCashierTotals = (transactions: any[]) => {
    let cash = 0
    let card = 0
    let bank = 0
    
    transactions.forEach(t => {
      if (t.method === 'cash' || t.method === 'CASH') cash += t.amount
      else if (t.method === 'card' || t.method === 'credit_card' || t.method === 'CARD') card += t.amount
      else if (t.method === 'bank' || t.method === 'bank_transfer' || t.method === 'BANK') bank += t.amount
    })
    
    return { cash, card, bank, total: cash + card + bank }
  }
  
  // SINGLE useEffect - Load data on mount ONLY
  useEffect(() => {
    const loadData = async () => {
      // Load shift from API first
      try {
        const shiftResponse = await fetch('/api/cashier?current=true')
        if (shiftResponse.ok) {
          const shiftData = await shiftResponse.json()
          // API now returns the shift directly (not wrapped in { shift })
          if (shiftData && shiftData.id) {
            setCurrentShift(shiftData)
            // Sync to localStorage
            localStorage.setItem('currentCashierShift', JSON.stringify(shiftData))
            console.log('[CashierModule] Loaded shift from API, ID:', shiftData.id)
          } else {
            // No open shift in API, check localStorage
            const savedShift = localStorage.getItem('currentCashierShift')
            if (savedShift) {
              const parsed = JSON.parse(savedShift)
              // Only use if it's a valid open shift
              if (parsed.status === 'open') {
                setCurrentShift(parsed)
              }
            }
          }
        }
      } catch (error) {
        console.error('[CashierModule] Shift API error:', error)
        const savedShift = localStorage.getItem('currentCashierShift')
        if (savedShift) {
          setCurrentShift(JSON.parse(savedShift))
        }
      }
      
      // Load shifts history from API
      try {
        const historyResponse = await fetch('/api/cashier')
        if (historyResponse.ok) {
          const historyData = await historyResponse.json()
          // API now returns array directly
          const shiftsList = Array.isArray(historyData) ? historyData : (historyData.shifts || [])
          if (shiftsList.length > 0) {
            setShifts(shiftsList)
            console.log('[CashierModule] Loaded shifts history from API:', shiftsList.length)
          } else {
            const allShifts = JSON.parse(localStorage.getItem('cashierShifts') || '[]')
            setShifts(allShifts)
          }
        }
      } catch (error) {
        const allShifts = JSON.parse(localStorage.getItem('cashierShifts') || '[]')
        setShifts(allShifts)
      }
      
      // Load folio transactions
      const todayTx = await loadCashierTransactions()
      
      // Load manual transactions from API
      const today = getBusinessDate()
      let todayManual: any[] = []
      
      try {
        const txResponse = await fetch(`/api/cashier/transactions?date=${today}`)
        if (txResponse.ok) {
          const txData = await txResponse.json()
          todayManual = txData.transactions || []
          console.log('[CashierModule] Loaded manual transactions from API:', todayManual.length)
        }
      } catch (error) {
        console.error('[CashierModule] Error loading manual transactions from API:', error)
      }
      
      // Fallback to localStorage if API returned nothing
      if (todayManual.length === 0) {
        const savedManual = JSON.parse(localStorage.getItem('cashierManualTransactions') || '[]')
        todayManual = savedManual.filter((t: any) => t.date === today)
      }
      
      // Add manual INCOME transactions to main list
      const manualIncomes = todayManual.filter((t: any) => t.type === 'income')
      const allIncomes = [...todayTx, ...manualIncomes]
      
      // Set expenses separately
      const manualExpenses = todayManual.filter((t: any) => t.type === 'expense')
      
      setTransactions(allIncomes)
      setManualTransactions(manualExpenses)
    }
    
    loadData()
  }, [])

  // REMOVED: Real-time updates useEffect - was conflicting and clearing transactions
  // All updates should be done through handleRefresh button instead

  // Calculate totals from loaded transactions
  // Calculate cumulative cash balance (opening + today's cash)
  // P11b: Always calculate, even when cashier is closed
  const getCumulativeBalance = useMemo(() => {
    let openingBalance = 0
    
    // Get opening balance from current shift or history
    if (currentShift) {
      openingBalance = Number(currentShift.openingBalance || 0)
    } else {
      // If no current shift, get from last closed shift
      const history = JSON.parse(localStorage.getItem('cashierHistory') || '[]')
      if (history.length > 0) {
        const lastSession = history[history.length - 1]
        openingBalance = Number(lastSession?.closingBalance || 0)
      }
    }
    
    // Calculate today's cash from transactions
    let todayCash = 0
    transactions.forEach(t => {
      const amount = t.amount || 0
      if (t.method === 'cash' || t.method === 'CASH') {
        todayCash += amount
      }
    })
    
    // Subtract expenses from cash
    const expenses = manualTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0)
    
    return openingBalance + todayCash - expenses
  }, [currentShift, transactions, manualTransactions])
  
  // P11b: Get previous balance for display when closed
  const previousBalance = useMemo(() => {
    if (currentShift) {
      return Number(currentShift.openingBalance || 0)
    }
    const history = JSON.parse(localStorage.getItem('cashierHistory') || '[]')
    if (history.length > 0) {
      return Number(history[history.length - 1]?.closingBalance || 0)
    }
    return 0
  }, [currentShift])
  
  const calculatedTotals = useMemo(() => {
    let cash = 0, card = 0, bank = 0
    
    transactions.forEach(t => {
      const amount = t.amount || 0
      if (t.method === 'cash' || t.method === 'CASH') cash += amount
      else if (t.method === 'card' || t.method === 'credit_card' || t.method === 'CARD') card += amount
      else if (t.method === 'bank' || t.method === 'bank_transfer' || t.method === 'BANK') bank += amount
    })
    
    const totalExpenses = manualTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + (t.amount || 0), 0)
    
    return { 
      cash, 
      card, 
      bank, 
      total: cash + card + bank,
      expenses: totalExpenses,
      net: cash + card + bank - totalExpenses
    }
  }, [transactions, manualTransactions])

  // Manual refresh function
  const handleRefresh = async () => {
    console.log('=== MANUAL REFRESH ===')
    
    const today = getBusinessDate()
    console.log('Refreshing for date:', today)
    
    // Load folio transactions from API
    const todayTx = await loadCashierTransactions()
    
    // Load manual transactions from API
    let todayManual: any[] = []
    try {
      const txResponse = await fetch(`/api/cashier/transactions?date=${today}`)
      if (txResponse.ok) {
        const txData = await txResponse.json()
        todayManual = txData.transactions || []
        console.log('Manual transactions from API:', todayManual.length)
      }
    } catch (error) {
      console.error('Error loading manual transactions:', error)
    }
    
    // Fallback to localStorage
    if (todayManual.length === 0) {
      const savedManual = JSON.parse(localStorage.getItem('cashierManualTransactions') || '[]')
      todayManual = savedManual.filter((t: any) => t.date === today)
    }
    
    const manualIncomes = todayManual.filter((t: any) => t.type === 'income')
    const manualExpenses = todayManual.filter((t: any) => t.type === 'expense')
    
    // Combine folio + manual incomes
    const allIncomes = [...todayTx, ...manualIncomes]
    
    console.log('Folio transactions:', todayTx.length)
    console.log('Manual incomes:', manualIncomes.length)
    console.log('Manual expenses:', manualExpenses.length)
    console.log('Total incomes:', allIncomes.length)
    
    // Update state
    setTransactions(allIncomes)
    setManualTransactions(manualExpenses)
    setLastRefresh(Date.now())
    
    // Force re-render
    setRefreshKey(prev => prev + 1)
    
    console.log('Refresh complete!')
    
    // Update shift totals if open
    const savedShift = localStorage.getItem('currentCashierShift')
    if (savedShift) {
      const shift = JSON.parse(savedShift)
      if (shift.status === 'open') {
        const totals = calculateCashierTotals(allIncomes)
        const expenses = manualExpenses.reduce((sum, t) => sum + (t.amount || 0), 0)
        
        const updatedShift = {
          ...shift,
          cashCollected: totals.cash,
          cardPayments: totals.card,
          bankTransfers: totals.bank,
          expenses: expenses || 0,
          totalCollected: totals.total,
          expectedAmount: shift.openingBalance + totals.total - expenses,
          transactionCount: allIncomes.length + manualExpenses.length
        }
        setCurrentShift(updatedShift)
        localStorage.setItem('currentCashierShift', JSON.stringify(updatedShift))
      }
    }
  }
  
  // Open new shift
  const openShift = async (openingBalance: number) => {
    const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('currentUser') || '{}') : {}
    
    const tempId = Date.now().toString()
    const newShift: CashierShift = {
      id: tempId, // Temporary ID, will be replaced by API
      userId: user.id || 'unknown',
      userName: user.name || 'Unknown User',
      openingBalance,
      cashCollected: 0,
      cardPayments: 0,
      chequePayments: 0,
      bankTransfers: 0,
      expenses: 0,
      totalCollected: 0,
      expectedAmount: openingBalance,
      discrepancy: 0,
      openedAt: new Date().toISOString(),
      status: 'open'
    }
    
    // Save to API first and get the real ID
    try {
      const response = await fetch('/api/cashier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiftNumber: `SH-${tempId}`,
          cashierName: newShift.userName,
          cashierId: newShift.userId,
          openingBalance: newShift.openingBalance,
          shiftData: newShift,
        }),
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.shift?.id) {
          // Use the database ID!
          newShift.id = data.shift.id
          console.log('[CashierModule] Shift created with DB ID:', newShift.id)
        }
      }
    } catch (error) {
      console.error('[CashierModule] API error saving shift:', error)
    }
    
    setCurrentShift(newShift)
    localStorage.setItem('currentCashierShift', JSON.stringify(newShift))
  }
  
  // Add manual transaction
  const addManualTransaction = async () => {
    if (!currentShift || !newTransaction.amount || !newTransaction.description) {
      alert('შეავსეთ ყველა ველი')
      return
    }
    
    const transaction = {
      id: `MANUAL-${Date.now()}`,
      time: moment().format('HH:mm:ss'),
      date: getBusinessDate(),
      type: newTransaction.type,
      category: newTransaction.category || (newTransaction.type === 'income' ? 'other_income' : 'expense'),
      description: newTransaction.description,
      amount: newTransaction.amount,
      method: newTransaction.method,
      manual: true,
      addedBy: currentShift.userName,
      shiftId: currentShift.id
    }
    
    // Save to API
    try {
      const response = await fetch('/api/cashier/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiftId: currentShift.id,
          transaction
        })
      })
      
      if (response.ok) {
        console.log('[CashierModule] Manual transaction saved to API')
      }
    } catch (error) {
      console.error('[CashierModule] Error saving manual transaction to API:', error)
    }
    
    // Also save to localStorage for backup
    const saved = JSON.parse(localStorage.getItem('cashierManualTransactions') || '[]')
    saved.push(transaction)
    localStorage.setItem('cashierManualTransactions', JSON.stringify(saved))
    
    // Update state based on type
    if (newTransaction.type === 'income') {
      // Add income to transactions array (so it's counted in cash/card/bank totals)
      setTransactions(prev => [...prev, transaction])
    } else {
      // Add expense to manualTransactions array
      setManualTransactions(prev => [...prev, transaction])
    }
    
    // Reset form
    setNewTransaction({ type: 'income', category: '', description: '', amount: 0, method: 'cash' })
    setShowAddTransaction(false)
  }

  // Generate X-Report
  const generateXReport = () => {
    if (!currentShift) return null
    
    const allTransactions = [...transactions, ...manualTransactions]
    const totals = calculateCashierTotals(allTransactions.filter(t => t.type === 'income'))
    const expenses = allTransactions.filter(t => t.type === 'expense')
    const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0)
    
    return {
      shiftId: currentShift.id,
      reportTime: moment().format('DD/MM/YYYY HH:mm:ss'),
      cashier: currentShift.userName,
      openedAt: moment(currentShift.openedAt).format('DD/MM/YYYY HH:mm'),
      openingBalance: currentShift.openingBalance,
      cashSales: totals.cash,
      cardSales: totals.card,
      bankTransfers: totals.bank,
      totalSales: totals.total,
      expenses: totalExpenses,
      expectedCash: currentShift.openingBalance + totals.cash - totalExpenses,
      transactionCount: allTransactions.length,
      expenseCount: expenses.length
    }
  }
  
  // Handle close shift
  const handleCloseShift = async () => {
    if (!currentShift) return
    
    const expectedCash = (currentShift.openingBalance || 0) + calculatedTotals.cash - calculatedTotals.expenses
    const discrepancy = closeFormData.actualCash - expectedCash
    const withdrawal = closeFormData.actualCash - closeFormData.nextDayBalance
    
    // Get manual transactions for today before clearing
    const businessDate = getBusinessDate()
    const allManualTx = JSON.parse(localStorage.getItem('cashierManualTransactions') || '[]')
    const todayManualTx = allManualTx.filter((t: any) => t.date === businessDate)
    
    // Calculate tax breakdown for Z-Report
    const taxData = calculateTaxBreakdown(calculatedTotals.total)
    
    const closedShift = {
      ...currentShift,
      closedAt: new Date().toISOString(),
      closedDate: businessDate,
      status: 'closed' as const,
      
      // Financial totals
      cashCollected: calculatedTotals.cash,
      cardPayments: calculatedTotals.card,
      bankTransfers: calculatedTotals.bank,
      expenses: calculatedTotals.expenses,
      totalCollected: calculatedTotals.total,
      expectedAmount: expectedCash,
      actualAmount: closeFormData.actualCash,
      discrepancy: discrepancy,
      withdrawal: withdrawal,
      nextDayOpening: closeFormData.nextDayBalance,
      
      // Tax breakdown for Z-Report
      netSales: taxData.net,
      taxes: taxData.taxes,
      totalTax: taxData.totalTax,
      
      // SAVE ALL TRANSACTIONS with the shift!
      transactions: [...transactions],  // Folio payments + manual income
      manualTransactions: [...todayManualTx],  // All manual transactions for reference
      transactionCount: transactions.length
    }
    
    // Save to history
    const history = JSON.parse(localStorage.getItem('cashierShifts') || '[]')
    history.push(closedShift)
    localStorage.setItem('cashierShifts', JSON.stringify(history))
    
    // Update in API - use the correct database ID
    try {
      const response = await fetch('/api/cashier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentShift.id, // This should now be the database ID
          dbId: currentShift.id,
          status: 'closed',
          closedAt: closedShift.closedAt,
          closingBalance: closeFormData.nextDayBalance,
          totalCashIn: calculatedTotals.cash,
          totalCashOut: calculatedTotals.expenses,
          totalCard: calculatedTotals.card,
          totalBank: calculatedTotals.bank,
          transactions: closedShift.transactions,
          shiftData: closedShift,
        }),
      })
      
      if (response.ok) {
        console.log('[CashierModule] Shift closed in API successfully')
      } else {
        const errorData = await response.json()
        console.error('[CashierModule] API error closing shift:', errorData)
      }
    } catch (error) {
      console.error('[CashierModule] API error closing shift:', error)
    }
    
    // Clear current shift
    localStorage.removeItem('currentCashierShift')
    
    // Clear today's manual transactions
    const remainingManual = allManualTx.filter((t: any) => t.date !== businessDate)
    localStorage.setItem('cashierManualTransactions', JSON.stringify(remainingManual))
    
    // Update state
    setShifts(history)
    setCurrentShift(null)
    setShowCloseModal(false)
    setCloseFormData({ actualCash: 0, nextDayBalance: 0 })
    setTransactions([])
    setManualTransactions([])
    
    alert(`სალარო დაიხურა!\n\nგანაღდებული: ₾${withdrawal.toFixed(2)}\nშემდეგი დღისთვის: ₾${closeFormData.nextDayBalance.toFixed(2)}`)
  }

  // X-Report Modal
  const XReportModal = () => {
    const report = generateXReport()
    if (!report) return null
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">📊 X-Report (მიმდინარე)</h3>
            <button onClick={() => setShowXReport(false)} className="text-gray-500">✕</button>
          </div>
          
          <div className="bg-gray-50 p-4 rounded font-mono text-sm">
            <div className="text-center border-b pb-2 mb-2">
              <div className="font-bold">HOTEL TBILISI</div>
              <div>X-REPORT</div>
              <div>{report.reportTime}</div>
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between"><span>მოლარე:</span><span>{report.cashier}</span></div>
              <div className="flex justify-between"><span>გახსნა:</span><span>{report.openedAt}</span></div>
              <div className="border-t my-2"></div>
              <div className="flex justify-between"><span>საწყისი:</span><span>₾{report.openingBalance.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>ნაღდი:</span><span>₾{report.cashSales.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>ბარათი:</span><span>₾{report.cardSales.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>ბანკი:</span><span>₾{report.bankTransfers.toFixed(2)}</span></div>
              <div className="border-t my-2"></div>
              <div className="flex justify-between font-bold"><span>სულ გაყიდვები:</span><span>₾{report.totalSales.toFixed(2)}</span></div>
              
              {/* Tax Breakdown Section */}
              {report.totalSales > 0 && (() => {
                const taxData = calculateTaxBreakdown(report.totalSales)
                if (taxData.totalTax > 0) {
                  return (
                    <>
                      <div className="border-t-2 border-dashed border-gray-400 my-2 pt-2"></div>
                      <div className="text-center font-bold text-purple-700 mb-1">🧾 TAX BREAKDOWN</div>
                      <div className="flex justify-between text-gray-600"><span>Net Sales:</span><span>₾{taxData.net.toFixed(2)}</span></div>
                      {taxData.taxes.map((tax: any, idx: number) => (
                        <div key={idx} className="flex justify-between pl-2">
                          <span>{tax.name} ({tax.rate}%):</span>
                          <span>₾{tax.amount.toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-bold border-t pt-1 mt-1">
                        <span>TOTAL TAX:</span>
                        <span>₾{taxData.totalTax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span>GROSS SALES:</span>
                        <span>₾{taxData.gross.toFixed(2)}</span>
                      </div>
                    </>
                  )
                }
                return null
              })()}
              
              <div className="flex justify-between text-red-600"><span>ხარჯები:</span><span>-₾{report.expenses.toFixed(2)}</span></div>
              <div className="border-t my-2"></div>
              <div className="flex justify-between font-bold text-lg"><span>მოსალოდნელი ნაღდი:</span><span>₾{report.expectedCash.toFixed(2)}</span></div>
              <div className="border-t my-2"></div>
              <div className="flex justify-between text-xs"><span>ტრანზაქციები:</span><span>{report.transactionCount}</span></div>
            </div>
          </div>
          
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => window.print()}
              className="flex-1 py-2 bg-blue-500 text-white rounded"
            >
              🖨️ ბეჭდვა
            </button>
            <button
              onClick={() => setShowXReport(false)}
              className="px-4 py-2 bg-gray-500 text-white rounded"
            >
              დახურვა
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Shift History Modal
  const ShiftHistoryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    const [modalShifts, setModalShifts] = useState<CashierShift[]>([])
    const [loading, setLoading] = useState(true)
    const [modalSelectedShift, setModalSelectedShift] = useState<CashierShift | null>(null)
    
    // Load data from API first, then localStorage as fallback
    useEffect(() => {
      if (isOpen) {
        setLoading(true)
        
        const loadHistory = async () => {
          let allShifts: CashierShift[] = []
          
          // Try API first
          try {
            const response = await fetch('/api/cashier')
            if (response.ok) {
              const data = await response.json()
              // API returns array directly now
              const apiShifts = Array.isArray(data) ? data : (data.shifts || [])
              if (apiShifts.length > 0) {
                allShifts = apiShifts.filter((s: any) => s.status === 'closed')
                console.log('[ShiftHistory] Loaded from API:', allShifts.length)
              }
            }
          } catch (error) {
            console.error('[ShiftHistory] API error:', error)
          }
          
          // If API returned nothing, fallback to localStorage
          if (allShifts.length === 0) {
            const history = JSON.parse(localStorage.getItem('cashierHistory') || '[]')
            const shiftsData = JSON.parse(localStorage.getItem('cashierShifts') || '[]')
            
            // Combine and deduplicate
            const combined = [...history, ...shiftsData]
            allShifts = combined.filter((shift, index, self) =>
              index === self.findIndex(s => 
                (s.id && shift.id && s.id === shift.id) || 
                (s.closedAt && shift.closedAt && s.closedAt === shift.closedAt)
              )
            )
            console.log('[ShiftHistory] Loaded from localStorage:', allShifts.length)
          }
          
          // Sort by date descending (most recent first)
          allShifts.sort((a, b) => {
            const dateA = new Date(a.closedAt || a.openedAt || 0).getTime()
            const dateB = new Date(b.closedAt || b.openedAt || 0).getTime()
            return dateB - dateA
          })
          
          setModalShifts(allShifts)
          setLoading(false)
        }
        
        loadHistory()
      } else {
        // Reset when modal closes
        setModalSelectedShift(null)
      }
    }, [isOpen])
    
    if (!isOpen) return null
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">📜 სალაროს ისტორია</h3>
            <button onClick={onClose} className="text-gray-500">✕</button>
          </div>
          
          {loading ? (
            <p className="text-gray-500 text-center py-8">იტვირთება...</p>
          ) : modalShifts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">ისტორია ცარიელია</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 text-left">თარიღი</th>
                  <th className="p-2 text-left">მოლარე</th>
                  <th className="p-2 text-right">საწყისი</th>
                  <th className="p-2 text-right">შემოსავალი</th>
                  <th className="p-2 text-right">ხარჯი</th>
                  <th className="p-2 text-right">სხვაობა</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {modalShifts.map(shift => (
                  <tr key={shift.id || shift.date} className="border-t hover:bg-gray-50">
                    <td className="p-2">{moment(shift.openedAt || shift.date).format('DD/MM/YY')}</td>
                    <td className="p-2">{shift.userName || shift.closedBy || '-'}</td>
                    <td className="p-2 text-right">₾{formatCurrency(shift.openingBalance || 0)}</td>
                    <td className="p-2 text-right text-green-600">₾{formatCurrency(shift.totalCollected || 0)}</td>
                    <td className="p-2 text-right text-red-600">{(shift.expenses || 0) > 0 ? `-₾${formatCurrency(shift.expenses || 0)}` : '-'}</td>
                    <td className={`p-2 text-right ${shift.discrepancy !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {shift.discrepancy !== 0 ? `₾${formatCurrency(shift.discrepancy || 0)}` : '✓'}
                    </td>
                    <td className="p-2">
                      <button
                        onClick={() => setModalSelectedShift(shift)}
                        className="text-blue-500 hover:underline"
                      >
                        დეტალები
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        
        {modalSelectedShift && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-bold mb-3">Shift დეტალები</h4>
            
            <div className="grid grid-cols-2 gap-2 text-sm mb-4">
              <div>გახსნა:</div>
              <div>{moment(modalSelectedShift.openedAt || modalSelectedShift.date).format('DD/MM/YYYY HH:mm')}</div>
              <div>დახურვა:</div>
              <div>{modalSelectedShift.closedAt ? moment(modalSelectedShift.closedAt).format('DD/MM/YYYY HH:mm') : '-'}</div>
              <div>ნაღდი:</div>
              <div>₾{formatCurrency(modalSelectedShift.cashCollected || 0)}</div>
              <div>ბარათი:</div>
              <div>₾{formatCurrency(modalSelectedShift.cardPayments || 0)}</div>
              <div>ხარჯები:</div>
              <div className="text-red-600">-₾{formatCurrency(modalSelectedShift.expenses || 0)}</div>
              <div>გასატანი:</div>
              <div>₾{formatCurrency(modalSelectedShift.withdrawal || 0)}</div>
            </div>
            
            {/* Z-Report Tax Breakdown */}
            {modalSelectedShift.totalCollected > 0 && modalSelectedShift.totalTax !== undefined && modalSelectedShift.totalTax > 0 && (
              <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <h5 className="font-bold text-purple-800 mb-2">🧾 Z-Report Tax Breakdown</h5>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Gross Sales:</span>
                    <span className="font-medium">₾{(modalSelectedShift.totalCollected || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Net Sales:</span>
                    <span>₾{(modalSelectedShift.netSales || 0).toFixed(2)}</span>
                  </div>
                  {modalSelectedShift.taxes && modalSelectedShift.taxes.length > 0 && (
                    <div className="border-t pt-1 mt-1">
                      <p className="text-xs text-gray-500 mb-1">Taxes Collected:</p>
                      {modalSelectedShift.taxes.map((tax: any, idx: number) => (
                        <div key={idx} className="flex justify-between pl-2">
                          <span>{tax.name} ({tax.rate}%):</span>
                          <span>₾{tax.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg border-t-2 pt-1 mt-1 text-purple-700">
                    <span>TOTAL TAX:</span>
                    <span>₾{(modalSelectedShift.totalTax || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Show saved transactions */}
            {modalSelectedShift.transactions && modalSelectedShift.transactions.length > 0 && (
              <div className="mt-3">
                <h5 className="font-medium text-green-700 mb-2">
                  💰 შემოსავლები ({modalSelectedShift.transactions.length})
                </h5>
                <table className="w-full text-sm">
                  <tbody>
                    {modalSelectedShift.transactions.map((t: any, idx: number) => (
                      <tr key={idx} className="border-t">
                        <td className="py-1">{t.time}</td>
                        <td>{t.description}</td>
                        <td className="text-right">
                          {t.method === 'cash' ? '💵' : t.method === 'card' ? '💳' : '🏦'}
                        </td>
                        <td className="text-right text-green-600">+₾{(t.amount || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Show saved expenses */}
            {modalSelectedShift.manualTransactions && 
             modalSelectedShift.manualTransactions.filter((t: any) => t.type === 'expense').length > 0 && (
              <div className="mt-3">
                <h5 className="font-medium text-red-700 mb-2">
                  💸 ხარჯები ({modalSelectedShift.manualTransactions.filter((t: any) => t.type === 'expense').length})
                </h5>
                <table className="w-full text-sm">
                  <tbody>
                    {modalSelectedShift.manualTransactions
                      .filter((t: any) => t.type === 'expense')
                      .map((t: any, idx: number) => (
                        <tr key={idx} className="border-t">
                          <td className="py-1">{t.time}</td>
                          <td>{t.description}</td>
                          <td className="text-right text-red-600">-₾{(t.amount || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
            
            <button
              onClick={() => setModalSelectedShift(null)}
              className="mt-3 px-4 py-1 bg-gray-200 rounded"
            >
              დახურვა
            </button>
          </div>
        )}
      </div>
    </div>
    )
  }

  
  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-xl font-bold">💳 სალაროს მართვა</h3>
        <div className="flex gap-2">
          {/* Show refresh always */}
          <button
            onClick={handleRefresh}
            className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded text-sm hover:bg-yellow-200"
            title={`ბოლო განახლება: ${moment(lastRefresh).format('HH:mm:ss')}`}
          >
            🔄 განახლება
          </button>
          {currentShift && (
            <>
              <button
                onClick={() => setShowXReport(true)}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
              >
                📊 X-Report
              </button>
              <button
                onClick={() => setShowAddTransaction(true)}
                className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200"
              >
                ➕ ტრანზაქცია
              </button>
            </>
          )}
          <button
            onClick={() => setShowHistory(true)}
            className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
          >
            📜 ისტორია
          </button>
        </div>
      </div>
      
      <div className="p-6">
        {/* Totals - Show Always */}
        <div className="mb-6">
          <div className="grid grid-cols-5 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-3xl font-bold text-green-600">₾{calculatedTotals.cash.toFixed(2)}</div>
              <div className="text-sm text-gray-600 mt-1">💵 ნაღდი</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-3xl font-bold text-blue-600">₾{calculatedTotals.card.toFixed(2)}</div>
              <div className="text-sm text-gray-600 mt-1">💳 ბარათი</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-3xl font-bold text-purple-600">₾{calculatedTotals.bank.toFixed(2)}</div>
              <div className="text-sm text-gray-600 mt-1">🏦 ბანკი</div>
            </div>
            <div className="text-center p-4 bg-gray-100 rounded-lg border border-gray-300">
              <div className="text-3xl font-bold text-gray-800">₾{calculatedTotals.total.toFixed(2)}</div>
              <div className="text-sm text-gray-600 mt-1">📊 სულ</div>
            </div>
            {/* P11b: Cumulative Balance Card - Always Show */}
            <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-green-100 rounded-lg border-2 border-emerald-300 shadow-md">
              <div className="text-3xl font-bold text-emerald-700">₾{getCumulativeBalance.toFixed(2)}</div>
              <div className="text-sm text-emerald-600 mt-1 font-medium">💰 ბალანსი</div>
              <div className="text-xs text-emerald-500 mt-1">
                {currentShift ? 'საწყისი + დღევანდელი' : `წინა ნაშთი: ₾${previousBalance.toFixed(2)}`}
              </div>
            </div>
          </div>
        </div>

        {currentShift ? (
          <div className="mb-6">
            <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
              <p className="font-bold">სალარო ღიაა</p>
              <p className="text-sm">მოლარე: {currentShift.userName}</p>
              <p className="text-sm">გახსნის დრო: {moment(currentShift.openedAt).format('DD/MM/YYYY HH:mm')}</p>
            </div>
            
            {/* P11: Cumulative Balance Banner */}
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 border-l-4 border-emerald-400 p-4 mb-4 rounded-r-lg shadow-sm">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-emerald-600 font-medium">💰 სალაროს ბალანსი</p>
                  <p className="text-xs text-emerald-500 mt-1">
                    საწყისი: ₾{Number(currentShift.openingBalance || 0).toFixed(2)} + დღევანდელი ნაღდი: ₾{calculatedTotals.cash.toFixed(2)}
                    {calculatedTotals.expenses > 0 && ` - ხარჯები: ₾${calculatedTotals.expenses.toFixed(2)}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-emerald-700">
                    ₾{getCumulativeBalance.toFixed(2)}
                  </p>
                  <p className="text-xs text-emerald-500">დაგროვილი ნაღდი</p>
                </div>
              </div>
            </div>
            
            {/* Expenses display */}
            {manualTransactions.filter(t => t.type === 'expense').length > 0 && (
              <div className="mb-4 p-3 bg-red-50 rounded border border-red-200">
                <div className="text-lg font-bold text-red-600">
                  💸 ხარჯები: ₾{manualTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0).toFixed(2)}
                </div>
              </div>
            )}
            
            <button
              onClick={() => setShowCloseModal(true)}
              className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              სალაროს დახურვა
            </button>
          </div>
        ) : (
          <div className="mb-6">
            <p className="text-gray-600 mb-4">სალარო დახურულია</p>
            <OpenShiftForm onOpen={openShift} />
          </div>
        )}
        
        {/* Transactions - show always */}
        <div key={refreshKey} className="mt-6">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-bold text-lg">📋 დღევანდელი გადახდები</h4>
            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
              {transactions.length} ტრანზაქცია
            </span>
          </div>
          
          {transactions.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3 text-left">დრო</th>
                    <th className="p-3 text-left">სტუმარი</th>
                    <th className="p-3 text-left">მეთოდი</th>
                    <th className="p-3 text-right">თანხა</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t, i) => (
                    <tr key={t.id || i} className="border-t hover:bg-gray-50">
                      <td className="p-3">{t.time}</td>
                      <td className="p-3">{t.description || t.guestName || '-'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          t.method === 'cash' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {t.method === 'cash' ? '💵 ნაღდი' : '💳 ბარათი'}
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold text-green-600">+₾{(t.amount || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-green-50 font-bold">
                  <tr>
                    <td colSpan={3} className="p-3 text-right">სულ:</td>
                    <td className="p-3 text-right text-green-700">
                      ₾{transactions.reduce((sum, t) => sum + (t.amount || 0), 0).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 border rounded-lg">
              დღეს გადახდები არ არის
            </div>
          )}
        </div>
        
        {/* Expenses Section */}
        {manualTransactions.length > 0 && (
          <div className="mt-6">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-bold text-lg text-red-600">💸 ხარჯები</h4>
              <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm">
                {manualTransactions.length} ხარჯი
              </span>
            </div>
            
            <div className="border border-red-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-red-50">
                  <tr>
                    <th className="p-3 text-left">დრო</th>
                    <th className="p-3 text-left">აღწერა</th>
                    <th className="p-3 text-left">კატეგორია</th>
                    <th className="p-3 text-right">თანხა</th>
                  </tr>
                </thead>
                <tbody>
                  {manualTransactions.map((t, i) => (
                    <tr key={t.id || i} className="border-t hover:bg-red-50">
                      <td className="p-3">{t.time}</td>
                      <td className="p-3">{t.description}</td>
                      <td className="p-3 text-sm text-gray-500">{t.category}</td>
                      <td className="p-3 text-right font-bold text-red-600">-₾{(t.amount || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-red-100 font-bold">
                  <tr>
                    <td colSpan={3} className="p-3 text-right">სულ ხარჯი:</td>
                    <td className="p-3 text-right text-red-700">
                      -₾{manualTransactions.reduce((sum, t) => sum + (t.amount || 0), 0).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
        
        {/* Net Total */}
        {manualTransactions.length > 0 && (
          <div className="mt-4 p-4 bg-gray-100 rounded-lg">
            <div className="flex justify-between items-center text-lg font-bold">
              <span>📊 წმინდა შემოსავალი:</span>
              <span className={calculatedTotals.net >= 0 ? 'text-green-600' : 'text-red-600'}>
                ₾{calculatedTotals.net.toFixed(2)}
              </span>
            </div>
            <div className="text-sm text-gray-500 mt-1">
              (შემოსავალი ₾{calculatedTotals.total.toFixed(2)} - ხარჯი ₾{calculatedTotals.expenses.toFixed(2)})
            </div>
          </div>
        )}
      </div>
      
      {/* Modals */}
      {/* Close Shift Modal - INLINE */}
      {showCloseModal && (() => {
        const expectedCash = roundCurrency((currentShift?.openingBalance || 0) + calculatedTotals.cash - calculatedTotals.expenses)
        
        return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">🔒 სალაროს დახურვა</h3>
            
            {/* Summary */}
            <div className="space-y-2 mb-4 p-3 bg-gray-50 rounded">
              <div className="flex justify-between">
                <span>საწყისი ბალანსი:</span>
                <span>₾{formatCurrency(currentShift?.openingBalance || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>➕ ნაღდი შემოსავალი:</span>
                <span className="text-green-600">₾{formatCurrency(calculatedTotals.cash)}</span>
              </div>
              <div className="flex justify-between">
                <span>➖ ნაღდი ხარჯი:</span>
                <span className="text-red-600">₾{formatCurrency(calculatedTotals.expenses)}</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-2 text-lg">
                <span>📊 მოსალოდნელი ნაღდი:</span>
                <span className="text-blue-600">₾{formatCurrency(expectedCash)}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                (ბარათი: ₾{formatCurrency(calculatedTotals.card)} | ბანკი: ₾{formatCurrency(calculatedTotals.bank)})
              </div>
            </div>
            
            {/* Cash Count Toggle */}
            <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="font-medium text-yellow-800">
                  🔢 ნაღდი ფულის დათვლა
                </span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={cashierSettings.requireCashCount}
                    onChange={(e) => {
                      const newSettings = { ...cashierSettings, requireCashCount: e.target.checked }
                      setCashierSettings(newSettings)
                      localStorage.setItem('cashierSettings', JSON.stringify(newSettings))
                      // If turning off, auto-fill with expected
                      if (!e.target.checked) {
                        setCloseFormData({
                          actualCash: expectedCash,
                          nextDayBalance: Math.min(cashierSettings.defaultFloatBalance, expectedCash)
                        })
                      }
                    }}
                    className="sr-only"
                  />
                  <div className={`w-12 h-6 rounded-full transition-colors ${cashierSettings.requireCashCount ? 'bg-green-500' : 'bg-gray-300'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${cashierSettings.requireCashCount ? 'translate-x-6' : 'translate-x-0.5'} mt-0.5`}></div>
                  </div>
                </div>
              </label>
              <p className="text-xs text-yellow-700 mt-1">
                {cashierSettings.requireCashCount 
                  ? '✓ ჩართულია - მოლარე ითვლის ფაქტიურ თანხას' 
                  : '✗ გამორთულია - სისტემა იყენებს მოსალოდნელ თანხას'}
              </p>
            </div>
            
            {/* Step 1: Count actual cash (only if required) */}
            {cashierSettings.requireCashCount ? (
              <div className="mb-4 p-3 border-2 border-blue-200 rounded-lg">
                <label className="block text-sm font-bold mb-2 text-blue-700">
                  📝 ნაბიჯი 1: დათვალეთ ნაღდი ფული
                </label>
                <input
                  type="number"
                  value={closeFormData.actualCash || ''}
                  onChange={(e) => {
                    const actual = Number(e.target.value)
                    setCloseFormData({
                      ...closeFormData, 
                      actualCash: actual,
                      nextDayBalance: closeFormData.nextDayBalance || Math.min(cashierSettings.defaultFloatBalance, actual)
                    })
                  }}
                  className="w-full border-2 rounded px-3 py-3 text-xl font-bold text-center"
                  placeholder="შეიყვანეთ დათვლილი თანხა"
                />
                
                {/* Quick fill button */}
                <button
                  onClick={() => setCloseFormData({
                    ...closeFormData,
                    actualCash: expectedCash,
                    nextDayBalance: Math.min(cashierSettings.defaultFloatBalance, expectedCash)
                  })}
                  className="w-full mt-2 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                >
                  შევსება მოსალოდნელით (₾{formatCurrency(expectedCash)})
                </button>
              </div>
            ) : (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-center">
                  <div className="text-sm text-gray-600">ავტომატური თანხა</div>
                  <div className="text-2xl font-bold text-blue-700">₾{formatCurrency(expectedCash)}</div>
                </div>
              </div>
            )}
            
            {/* Discrepancy Display (only when counting) */}
            {cashierSettings.requireCashCount && closeFormData.actualCash > 0 && (() => {
              const diff = roundCurrency(closeFormData.actualCash - expectedCash)
              return (
                <div className={`mb-4 p-3 rounded-lg ${
                  Math.abs(diff) < 0.01 ? 'bg-green-100 border-2 border-green-400' :
                  diff > 0 ? 'bg-blue-100 border-2 border-blue-400' :
                  'bg-red-100 border-2 border-red-400'
                }`}>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">
                      {Math.abs(diff) < 0.01 ? '✅ ზუსტია!' :
                       diff > 0 ? '📈 ზედმეტი:' : '📉 დანაკლისი:'}
                    </span>
                    <span className={`font-bold text-lg ${
                      Math.abs(diff) < 0.01 ? 'text-green-700' :
                      diff > 0 ? 'text-blue-700' : 'text-red-700'
                    }`}>
                      {diff > 0 ? '+' : ''}₾{formatCurrency(diff)}
                    </span>
                  </div>
                </div>
              )
            })()}
            
            {/* Cash Withdrawal Toggle */}
            {(closeFormData.actualCash > 0 || !cashierSettings.requireCashCount) && (
              <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                <label className="flex items-center justify-between cursor-pointer mb-2">
                  <span className="font-medium text-purple-800">
                    💸 ნაღდის გატანა სალაროდან
                  </span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={cashierSettings.allowCashWithdrawal}
                      onChange={(e) => {
                        const newSettings = { ...cashierSettings, allowCashWithdrawal: e.target.checked }
                        setCashierSettings(newSettings)
                        localStorage.setItem('cashierSettings', JSON.stringify(newSettings))
                        // If turning off, leave all cash for next day
                        if (!e.target.checked) {
                          const cash = cashierSettings.requireCashCount ? closeFormData.actualCash : expectedCash
                          setCloseFormData({ ...closeFormData, nextDayBalance: cash })
                        }
                      }}
                      className="sr-only"
                    />
                    <div className={`w-12 h-6 rounded-full transition-colors ${cashierSettings.allowCashWithdrawal ? 'bg-purple-500' : 'bg-gray-300'}`}>
                      <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${cashierSettings.allowCashWithdrawal ? 'translate-x-6' : 'translate-x-0.5'} mt-0.5`}></div>
                    </div>
                  </div>
                </label>
                
                {cashierSettings.allowCashWithdrawal && (
                  <>
                    <label className="block text-sm font-bold mb-2 text-purple-700">
                      💼 შემდეგი დღისთვის დასატოვებელი
                    </label>
                    <div className="flex gap-2 mb-2">
                      {[0, 100, 200, 500].map(amount => {
                        const maxAmount = cashierSettings.requireCashCount ? closeFormData.actualCash : expectedCash
                        return (
                          <button
                            key={amount}
                            onClick={() => setCloseFormData({...closeFormData, nextDayBalance: Math.min(amount, maxAmount)})}
                            className={`flex-1 py-2 rounded text-sm ${
                              closeFormData.nextDayBalance === amount ? 'bg-purple-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                            }`}
                          >
                            ₾{amount}
                          </button>
                        )
                      })}
                    </div>
                    <input
                      type="number"
                      value={closeFormData.nextDayBalance || ''}
                      onChange={(e) => {
                        const maxAmount = cashierSettings.requireCashCount ? closeFormData.actualCash : expectedCash
                        setCloseFormData({...closeFormData, nextDayBalance: Math.min(Number(e.target.value), maxAmount)})
                      }}
                      className="w-full border rounded px-3 py-2 text-center"
                      placeholder="ან შეიყვანეთ სხვა თანხა"
                    />
                  </>
                )}
              </div>
            )}
            
            {/* Withdrawal Summary */}
            {(closeFormData.actualCash > 0 || !cashierSettings.requireCashCount) && cashierSettings.allowCashWithdrawal && (
              <div className="mb-4 p-4 bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg border-2 border-purple-300">
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-1">სეიფში ჩასაბარებელი</div>
                  <div className="text-3xl font-bold text-purple-700">
                    💰 ₾{formatCurrency((cashierSettings.requireCashCount ? closeFormData.actualCash : expectedCash) - closeFormData.nextDayBalance)}
                  </div>
                </div>
              </div>
            )}
            
            {/* Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  // Set actual cash to expected if not counting
                  if (!cashierSettings.requireCashCount) {
                    setCloseFormData(prev => ({
                      ...prev,
                      actualCash: expectedCash
                    }))
                  }
                  // Small delay to ensure state is updated
                  setTimeout(() => handleCloseShift(), 50)
                }}
                disabled={cashierSettings.requireCashCount && !closeFormData.actualCash}
                className={`flex-1 py-3 rounded-lg font-bold ${
                  (!cashierSettings.requireCashCount || closeFormData.actualCash)
                    ? 'bg-red-600 text-white hover:bg-red-700' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                🔒 დახურვა და Z-Report
              </button>
              <button
                onClick={() => {
                  setShowCloseModal(false)
                  setCloseFormData({ actualCash: 0, nextDayBalance: 0 })
                }}
                className="px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                გაუქმება
              </button>
            </div>
          </div>
        </div>
        )
      })()}
      {showXReport && <XReportModal />}
      {showHistory && <ShiftHistoryModal isOpen={showHistory} onClose={() => setShowHistory(false)} />}
      {showAddTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">➕ ახალი ტრანზაქცია</h3>
            
            {/* Type Selection */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setNewTransaction({...newTransaction, type: 'income'})}
                className={`flex-1 py-2 rounded ${newTransaction.type === 'income' ? 'bg-green-500 text-white' : 'bg-gray-100'}`}
              >
                💰 შემოსავალი
              </button>
              <button
                onClick={() => setNewTransaction({...newTransaction, type: 'expense'})}
                className={`flex-1 py-2 rounded ${newTransaction.type === 'expense' ? 'bg-red-500 text-white' : 'bg-gray-100'}`}
              >
                💸 ხარჯი
              </button>
            </div>
            
            {/* Category */}
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">კატეგორია</label>
              <select
                value={newTransaction.category}
                onChange={(e) => setNewTransaction({...newTransaction, category: e.target.value})}
                className="w-full border rounded px-3 py-2"
              >
                {newTransaction.type === 'income' ? (
                  <>
                    <option value="">აირჩიეთ...</option>
                    <option value="deposit">დეპოზიტი</option>
                    <option value="advance">წინასწარი გადახდა</option>
                    <option value="other_income">სხვა შემოსავალი</option>
                  </>
                ) : (
                  <>
                    <option value="">აირჩიეთ...</option>
                    <option value="petty_cash">წვრილმანი ხარჯი</option>
                    <option value="supplies">მარაგები</option>
                    <option value="refund">თანხის დაბრუნება</option>
                    <option value="other_expense">სხვა ხარჯი</option>
                  </>
                )}
              </select>
            </div>
            
            {/* Description */}
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">აღწერა</label>
              <input
                type="text"
                value={newTransaction.description}
                onChange={(e) => setNewTransaction({...newTransaction, description: e.target.value})}
                className="w-full border rounded px-3 py-2"
                placeholder="მაგ: სტუმრის დეპოზიტი"
              />
            </div>
            
            {/* Amount */}
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">თანხა (₾)</label>
              <input
                type="number"
                value={newTransaction.amount || ''}
                onChange={(e) => setNewTransaction({...newTransaction, amount: Number(e.target.value)})}
                className="w-full border rounded px-3 py-2"
                placeholder="0.00"
              />
            </div>
            
            {/* Payment Method (only for income) */}
            {newTransaction.type === 'income' && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">გადახდის მეთოდი</label>
                <div className="flex gap-2">
                  {['cash', 'card', 'bank'].map(method => (
                    <button
                      key={method}
                      onClick={() => setNewTransaction({...newTransaction, method})}
                      className={`flex-1 py-2 rounded text-sm ${newTransaction.method === method ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                    >
                      {method === 'cash' ? '💵 ნაღდი' : method === 'card' ? '💳 ბარათი' : '🏦 ბანკი'}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Expense note */}
            {newTransaction.type === 'expense' && (
              <div className="mb-4 p-2 bg-yellow-50 rounded text-sm text-yellow-700">
                💵 ხარჯი გამოაკლდება ნაღდ ფულს
              </div>
            )}
            
            {/* Buttons */}
            <div className="flex gap-2">
              <button
                onClick={addManualTransaction}
                className={`flex-1 py-2 rounded text-white ${newTransaction.type === 'income' ? 'bg-green-600' : 'bg-red-600'}`}
              >
                ✓ დამატება
              </button>
              <button
                onClick={() => setShowAddTransaction(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded"
              >
                გაუქმება
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper component
const OpenShiftForm = ({ onOpen }: { onOpen: (balance: number) => void }) => {
  const [showModal, setShowModal] = useState(false)
  const [openingBalance, setOpeningBalance] = useState(0)
  const [previousBalance, setPreviousBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    const loadPreviousBalance = async () => {
      setLoading(true)
      let lastBalance: number | null = null
      
      // Try API first
      try {
        const response = await fetch('/api/cashier')
        if (response.ok) {
          const data = await response.json()
          const shifts = Array.isArray(data) ? data : (data.shifts || [])
          const closedShifts = shifts.filter((s: any) => s.status === 'closed')
          if (closedShifts.length > 0) {
            closedShifts.sort((a: any, b: any) => 
              new Date(b.closedAt || 0).getTime() - new Date(a.closedAt || 0).getTime()
            )
            lastBalance = closedShifts[0]?.closingBalance || closedShifts[0]?.nextDayOpening || null
          }
        }
      } catch (error) {
        console.error('[OpenShiftForm] API error:', error)
      }
      
      // Fallback to localStorage
      if (lastBalance === null) {
        const history = JSON.parse(localStorage.getItem('cashierHistory') || '[]')
        const shifts = JSON.parse(localStorage.getItem('cashierShifts') || '[]')
        
        if (history.length > 0) {
          lastBalance = history[history.length - 1]?.closingBalance || null
        }
        
        if (lastBalance === null && shifts.length > 0) {
          const sortedShifts = shifts.sort((a: any, b: any) => 
            new Date(b.closedAt || 0).getTime() - new Date(a.closedAt || 0).getTime()
          )
          lastBalance = sortedShifts[0]?.closingBalance || sortedShifts[0]?.nextDayOpening || null
        }
      }
      
      if (lastBalance !== null && lastBalance > 0) {
        setPreviousBalance(lastBalance)
        setOpeningBalance(lastBalance)
      }
      setLoading(false)
    }
    
    loadPreviousBalance()
  }, [])
  
  const handleOpen = (balance: number) => {
    setShowModal(false)
    onOpen(balance)
  }
  
  return (
    <>
      {/* Main Button */}
      <button
        onClick={() => setShowModal(true)}
        disabled={loading}
        className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold text-lg disabled:bg-gray-400"
      >
        {loading ? '⏳ იტვირთება...' : '🔓 სალაროს გახსნა'}
      </button>
      
      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">🔓 სალაროს გახსნა</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            
            {/* Previous Balance Display */}
            {previousBalance !== null && previousBalance > 0 && (
              <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-1">წინა დღის ნაშთი</div>
                  <div className="text-3xl font-bold text-green-700">₾{previousBalance.toFixed(2)}</div>
                </div>
              </div>
            )}
            
            {/* Opening Balance Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">საწყისი ბალანსი (₾)</label>
              <input
                type="number"
                value={openingBalance || ''}
                onChange={(e) => setOpeningBalance(Number(e.target.value))}
                className="w-full border-2 rounded-lg px-3 py-3 text-xl text-center font-bold"
                placeholder="0.00"
              />
              
              {/* Quick fill buttons */}
              {previousBalance !== null && previousBalance > 0 && openingBalance !== previousBalance && (
                <button
                  onClick={() => setOpeningBalance(previousBalance)}
                  className="w-full mt-2 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded"
                >
                  ↩️ წინა ნაშთის გამოყენება (₾{previousBalance.toFixed(2)})
                </button>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => handleOpen(openingBalance)}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold"
              >
                ✓ გახსნა
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                გაუქმება
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}