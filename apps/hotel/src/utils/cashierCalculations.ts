import moment from 'moment'

/**
 * Calculate cash balance from shift open date (not just today)
 * Includes: opening balance + folio payments + manual transactions - expenses
 */
export const calculateCashBalance = () => {
  if (typeof window === 'undefined') {
    return { 
      cash: 0, 
      card: 0, 
      bank: 0, 
      total: 0, 
      expenses: 0,
      opening: 0,
      cashCollected: 0
    }
  }
  
  const shift = JSON.parse(localStorage.getItem('currentCashierShift') || '{}')
  const openingBalance = shift.openingBalance || 0
  
  // Get shift open date (not today!)
  const shiftOpenDate = shift.openedAt 
    ? moment(shift.openedAt).format('YYYY-MM-DD')
    : moment().format('YYYY-MM-DD')
  
  const folios = JSON.parse(localStorage.getItem('hotelFolios') || '[]')
  let folioCash = 0
  let folioCard = 0
  let folioBank = 0
  
  folios.forEach((folio: any) => {
    folio.transactions?.forEach((t: any) => {
      const txDate = (t.date || '').split('T')[0]
      
      // Include ALL payments since shift opened (not just today!)
      if (txDate >= shiftOpenDate && (t.type === 'payment' || t.credit > 0)) {
        const amount = t.credit || t.amount || 0
        const method = (t.paymentMethod || 'cash').toLowerCase()
        
        if (method.includes('cash')) folioCash += amount
        else if (method.includes('card')) folioCard += amount
        else if (method.includes('bank')) folioBank += amount
      }
    })
  })
  
  // Manual transactions since shift opened
  const manualTx = JSON.parse(localStorage.getItem('cashierManualTransactions') || '[]')
  let manualIncome = 0
  let manualExpense = 0
  
  manualTx.forEach((t: any) => {
    const txDate = (t.date || '').split('T')[0]
    if (txDate >= shiftOpenDate) {
      if (t.type === 'income') {
        const method = (t.method || 'cash').toLowerCase()
        if (method === 'cash') manualIncome += t.amount || 0
        else if (method === 'card') folioCard += t.amount || 0
        else if (method === 'bank') folioBank += t.amount || 0
      } else if (t.type === 'expense') {
        manualExpense += t.amount || 0
      }
    }
  })
  
  // Calculate totals
  const totalCash = openingBalance + folioCash + manualIncome - manualExpense
  const totalCard = folioCard
  const totalBank = folioBank
  const total = totalCash + totalCard + totalBank
  const cashCollected = folioCash + manualIncome
  
  return {
    opening: openingBalance,
    cash: totalCash,
    card: totalCard,
    bank: totalBank,
    total: total,
    expenses: manualExpense,
    cashCollected: cashCollected
  }
}

