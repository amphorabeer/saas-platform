'use client'

import { useState, useEffect, useMemo } from 'react'
import moment from 'moment'

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
  status: 'open' | 'closed'
  withdrawal?: number
  nextDayOpening?: number
  transactionCount?: number
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
  
  // Get business date from localStorage (falls back to real date)
  const getBusinessDate = () => {
    const stored = localStorage.getItem('currentBusinessDate')
    if (stored) return stored
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  }
  
  // Load cashier transactions from all folios
  const loadCashierTransactions = () => {
    const folios = JSON.parse(localStorage.getItem('hotelFolios') || '[]')
    const today = getBusinessDate()
    
    const todayTransactions: any[] = []
    
    folios.forEach((folio: any) => {
      if (!folio.transactions) return
      
      folio.transactions.forEach((t: any) => {
        // Use transaction date directly
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
    // Load shift
    const savedShift = localStorage.getItem('currentCashierShift')
    if (savedShift) {
      setCurrentShift(JSON.parse(savedShift))
    }
    
    // Load shifts history
    const allShifts = JSON.parse(localStorage.getItem('cashierShifts') || '[]')
    setShifts(allShifts)
    
    // Load folio transactions
    const folios = JSON.parse(localStorage.getItem('hotelFolios') || '[]')
    const today = getBusinessDate()
    
    const todayTx: any[] = []
    folios.forEach((folio: any) => {
      folio.transactions?.forEach((t: any) => {
        if (t.credit > 0 && t.date === today) {
          todayTx.push({
            id: t.id || Math.random().toString(),
            time: t.time || '00:00',
            description: `${folio.guestName} - Room ${folio.roomNumber}`,
            amount: t.credit,
            method: t.paymentMethod || 'cash',
            type: 'income',
            manual: false
          })
        }
      })
    })
    
    // Load manual transactions
    const savedManual = JSON.parse(localStorage.getItem('cashierManualTransactions') || '[]')
    const todayManual = savedManual.filter((t: any) => t.date === today)
    
    // Add manual INCOME transactions to main list
    const manualIncomes = todayManual.filter((t: any) => t.type === 'income')
    const allIncomes = [...todayTx, ...manualIncomes]
    
    // Set expenses separately
    const manualExpenses = todayManual.filter((t: any) => t.type === 'expense')
    
    setTransactions(allIncomes)
    setManualTransactions(manualExpenses)
    
  }, [])

  // REMOVED: Real-time updates useEffect - was conflicting and clearing transactions
  // All updates should be done through handleRefresh button instead

  // Calculate totals from loaded transactions
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
  const handleRefresh = () => {
    console.log('=== MANUAL REFRESH ===')
    
    // Load folio transactions
    const folios = JSON.parse(localStorage.getItem('hotelFolios') || '[]')
    const today = getBusinessDate()
    
    console.log('Refreshing for date:', today)
    
    const todayTx: any[] = []
    
    // Load folio payments
    folios.forEach((folio: any) => {
      if (!folio.transactions) return
      
      folio.transactions.forEach((t: any) => {
        if (t.credit > 0 && t.date === today) {
          todayTx.push({
            id: t.id || `tx-${Math.random()}`,
            time: t.time || '00:00',
            description: `${folio.guestName} - Room ${folio.roomNumber || ''}`,
            amount: t.credit,
            method: t.paymentMethod || 'cash',
            type: 'income',
            manual: false
          })
        }
      })
    })
    
    // Load manual income transactions
    const savedManual = JSON.parse(localStorage.getItem('cashierManualTransactions') || '[]')
    const todayManual = savedManual.filter((t: any) => t.date === today)
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
  const openShift = (openingBalance: number) => {
    const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('currentUser') || '{}') : {}
    
    const newShift: CashierShift = {
      id: Date.now().toString(),
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
    
    setCurrentShift(newShift)
    localStorage.setItem('currentCashierShift', JSON.stringify(newShift))
  }
  
  // Add manual transaction
  const addManualTransaction = () => {
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
    
    // Save to localStorage
    const saved = JSON.parse(localStorage.getItem('cashierManualTransactions') || '[]')
    saved.push(transaction)
    localStorage.setItem('cashierManualTransactions', JSON.stringify(saved))
    
    // Update state
    setManualTransactions([...manualTransactions, transaction])
    
    // Update shift totals
    const updated = { ...currentShift }
    if (newTransaction.type === 'income') {
      if (newTransaction.method === 'cash') {
        updated.cashCollected = (updated.cashCollected || 0) + newTransaction.amount
      } else if (newTransaction.method === 'card') {
        updated.cardPayments = (updated.cardPayments || 0) + newTransaction.amount
      } else if (newTransaction.method === 'bank') {
        updated.bankTransfers = (updated.bankTransfers || 0) + newTransaction.amount
      }
      updated.totalCollected = (updated.totalCollected || 0) + newTransaction.amount
      updated.expectedAmount = (updated.expectedAmount || 0) + newTransaction.amount
    } else {
      updated.expenses = (updated.expenses || 0) + newTransaction.amount
      updated.expectedAmount = (updated.expectedAmount || 0) - newTransaction.amount
    }
    updated.transactionCount = (updated.transactionCount || 0) + 1
    
    setCurrentShift(updated)
    localStorage.setItem('currentCashierShift', JSON.stringify(updated))
    
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
  const handleCloseShift = () => {
    if (!currentShift) return
    
    const expectedCash = (currentShift.openingBalance || 0) + calculatedTotals.cash - calculatedTotals.expenses
    const discrepancy = closeFormData.actualCash - expectedCash
    const withdrawal = closeFormData.actualCash - closeFormData.nextDayBalance
    
    const closedShift = {
      ...currentShift,
      closedAt: new Date().toISOString(),
      status: 'closed' as const,
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
      transactionCount: transactions.length
    }
    
    // Save to history
    const history = JSON.parse(localStorage.getItem('cashierShifts') || '[]')
    history.push(closedShift)
    localStorage.setItem('cashierShifts', JSON.stringify(history))
    
    // Clear current shift
    localStorage.removeItem('currentCashierShift')
    
    // Clear today's manual transactions
    const today = getBusinessDate()
    const savedManual = JSON.parse(localStorage.getItem('cashierManualTransactions') || '[]')
    const remainingManual = savedManual.filter((t: any) => t.date !== today)
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
  const ShiftHistoryModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">📜 სალაროს ისტორია</h3>
          <button onClick={() => setShowHistory(false)} className="text-gray-500">✕</button>
        </div>
        
        {shifts.length === 0 ? (
          <p className="text-gray-500 text-center py-8">ისტორია ცარიელია</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">თარიღი</th>
                <th className="p-2 text-left">მოლარე</th>
                <th className="p-2 text-right">საწყისი</th>
                <th className="p-2 text-right">შემოსავალი</th>
                <th className="p-2 text-right">სხვაობა</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {shifts.slice().reverse().map(shift => (
                <tr key={shift.id} className="border-t hover:bg-gray-50">
                  <td className="p-2">{moment(shift.openedAt).format('DD/MM/YY')}</td>
                  <td className="p-2">{shift.userName}</td>
                  <td className="p-2 text-right">₾{shift.openingBalance.toFixed(2)}</td>
                  <td className="p-2 text-right">₾{shift.totalCollected.toFixed(2)}</td>
                  <td className={`p-2 text-right ${shift.discrepancy !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {shift.discrepancy !== 0 ? `₾${shift.discrepancy.toFixed(2)}` : '✓'}
                  </td>
                  <td className="p-2">
                    <button
                      onClick={() => setSelectedShift(shift)}
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
        
        {selectedShift && (
          <div className="mt-4 p-4 bg-gray-50 rounded">
            <h4 className="font-bold mb-2">Shift დეტალები</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>გახსნა:</div>
              <div>{moment(selectedShift.openedAt).format('DD/MM/YYYY HH:mm')}</div>
              <div>დახურვა:</div>
              <div>{selectedShift.closedAt ? moment(selectedShift.closedAt).format('DD/MM/YYYY HH:mm') : '-'}</div>
              <div>ნაღდი:</div>
              <div>₾{selectedShift.cashCollected.toFixed(2)}</div>
              <div>ბარათი:</div>
              <div>₾{selectedShift.cardPayments.toFixed(2)}</div>
              <div>გასატანი:</div>
              <div>₾{(selectedShift.withdrawal || 0).toFixed(2)}</div>
            </div>
            <button
              onClick={() => setSelectedShift(null)}
              className="mt-2 text-sm text-blue-500 hover:underline"
            >
              დახურვა
            </button>
          </div>
        )}
      </div>
    </div>
  )

  
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
          <div className="grid grid-cols-4 gap-4">
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
          </div>
        </div>

        {currentShift ? (
          <div className="mb-6">
            <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
              <p className="font-bold">სალარო ღიაა</p>
              <p className="text-sm">მოლარე: {currentShift.userName}</p>
              <p className="text-sm">გახსნის დრო: {moment(currentShift.openedAt).format('DD/MM/YYYY HH:mm')}</p>
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
      {showCloseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">სალაროს დახურვა</h3>
            
            {/* Summary */}
            <div className="space-y-2 mb-4 p-3 bg-gray-50 rounded">
              <div className="flex justify-between">
                <span>გახსნის ბალანსი:</span>
                <span>₾{(currentShift?.openingBalance || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>ნაღდი შემოსავალი:</span>
                <span className="text-green-600">₾{calculatedTotals.cash.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>ბარათით:</span>
                <span className="text-blue-600">₾{calculatedTotals.card.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>ხარჯები:</span>
                <span className="text-red-600">-₾{calculatedTotals.expenses.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-2">
                <span>მოსალოდნელი ნაღდი:</span>
                <span>₾{((currentShift?.openingBalance || 0) + calculatedTotals.cash - calculatedTotals.expenses).toFixed(2)}</span>
              </div>
            </div>
            
            {/* Actual Cash Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">ფაქტიური ნაღდი ფული</label>
              <input
                type="number"
                value={closeFormData.actualCash}
                onChange={(e) => setCloseFormData({...closeFormData, actualCash: Number(e.target.value)})}
                className="w-full border rounded px-3 py-2 text-lg"
                placeholder="0.00"
              />
            </div>
            
            {/* Discrepancy Display */}
            {closeFormData.actualCash > 0 && (
              <div className={`mb-4 p-3 rounded ${
                closeFormData.actualCash === ((currentShift?.openingBalance || 0) + calculatedTotals.cash - calculatedTotals.expenses)
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                <div className="font-bold">
                  სხვაობა: ₾{(closeFormData.actualCash - ((currentShift?.openingBalance || 0) + calculatedTotals.cash - calculatedTotals.expenses)).toFixed(2)}
                </div>
              </div>
            )}
            
            {/* Next Day Balance */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">დატოვეთ შემდეგი დღისთვის</label>
              <input
                type="number"
                value={closeFormData.nextDayBalance}
                onChange={(e) => setCloseFormData({...closeFormData, nextDayBalance: Number(e.target.value)})}
                className="w-full border rounded px-3 py-2"
                placeholder="0.00"
              />
            </div>
            
            {/* Withdrawal Amount */}
            {closeFormData.actualCash > 0 && (
              <div className="mb-4 p-3 bg-blue-50 rounded">
                <div className="font-bold text-blue-700">
                  💰 გასატანი თანხა: ₾{(closeFormData.actualCash - closeFormData.nextDayBalance).toFixed(2)}
                </div>
              </div>
            )}
            
            {/* Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleCloseShift}
                className="flex-1 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                დახურვა და განაღდება
              </button>
              <button
                onClick={() => setShowCloseModal(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded"
              >
                გაუქმება
              </button>
            </div>
          </div>
        </div>
      )}
      {showXReport && <XReportModal />}
      {showHistory && <ShiftHistoryModal />}
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
            
            {/* Payment Method (for income) */}
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
  const [openingBalance, setOpeningBalance] = useState(0)
  
  return (
    <div className="space-y-4">
      <input
        type="number"
        value={openingBalance}
        onChange={(e) => setOpeningBalance(Number(e.target.value))}
        className="w-full border rounded px-3 py-2"
        placeholder="გახსნის ბალანსი (₾)"
      />
      <button
        onClick={() => onOpen(openingBalance)}
        className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
      >
        სალაროს გახსნა
      </button>
    </div>
  )
}
