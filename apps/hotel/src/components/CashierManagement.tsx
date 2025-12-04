'use client'

import React, { useState, useEffect } from 'react'
import moment from 'moment'

interface CashierSession {
  id: string
  userId: string
  userName: string
  openedAt: string
  closedAt?: string
  openingBalance: number
  closingBalance?: number
  status: 'open' | 'closed'
  transactions: Transaction[]
}

interface Transaction {
  id: string
  time: string
  type: 'income' | 'expense' | 'refund'
  category: string
  description: string
  amount: number
  paymentMethod: 'cash' | 'card' | 'transfer'
  reference?: string
}

export default function CashierManagement() {
  const [currentSession, setCurrentSession] = useState<CashierSession | null>(null)
  const [openingBalance, setOpeningBalance] = useState('')
  const [showAddTransaction, setShowAddTransaction] = useState(false)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  
  useEffect(() => {
    loadCurrentSession()
  }, [])
  
  const loadCurrentSession = () => {
    const session = localStorage.getItem('cashierSession')
    if (session) {
      try {
        const parsed = JSON.parse(session)
        setCurrentSession(parsed)
        setTransactions(parsed.transactions || [])
      } catch (error) {
        console.error('Failed to load cashier session:', error)
      }
    }
  }
  
  const openCashier = () => {
    const balance = parseFloat(openingBalance) || 0
    const currentUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('currentUser') || '{}') : {}
    
    const newSession: CashierSession = {
      id: 'CS' + Date.now(),
      userId: currentUser.id || 'current-user',
      userName: currentUser.name || 'Current User',
      openedAt: moment().format(),
      openingBalance: balance,
      status: 'open',
      transactions: []
    }
    
    setCurrentSession(newSession)
    localStorage.setItem('cashierSession', JSON.stringify(newSession))
    setOpeningBalance('')
  }
  
  const closeCashier = () => {
    if (!currentSession) return
    
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)
    
    const totalExpense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)
    
    const totalRefund = transactions
      .filter(t => t.type === 'refund')
      .reduce((sum, t) => sum + t.amount, 0)
    
    const expectedBalance = currentSession.openingBalance + totalIncome - totalExpense - totalRefund
    
    const confirmClose = confirm(
      `სალაროს დახურვა:\n\n` +
      `გახსნის ბალანსი: ₾${currentSession.openingBalance}\n` +
      `შემოსავალი: ₾${totalIncome}\n` +
      `გასავალი: ₾${totalExpense}\n` +
      `დაბრუნება: ₾${totalRefund}\n` +
      `─────────────\n` +
      `მოსალოდნელი: ₾${expectedBalance}\n\n` +
      `დავხუროთ სალარო?`
    )
    
    if (confirmClose) {
      const actualBalance = prompt(`შეიყვანეთ ფაქტიური ბალანსი:\n\nმოსალოდნელი: ₾${expectedBalance}`)
      
      if (actualBalance === null) return
      
      const actual = parseFloat(actualBalance) || expectedBalance
      const discrepancy = actual - expectedBalance
      
      const closedSession = {
        ...currentSession,
        closedAt: moment().format(),
        closingBalance: actual,
        expectedBalance,
        discrepancy,
        status: 'closed' as const
      }
      
      // Save to history
      const history = JSON.parse(localStorage.getItem('cashierHistory') || '[]')
      history.push(closedSession)
      localStorage.setItem('cashierHistory', JSON.stringify(history))
      
      // Clear current session
      localStorage.removeItem('cashierSession')
      setCurrentSession(null)
      setTransactions([])
      
      if (discrepancy !== 0) {
        alert(`⚠️ სხვაობა: ₾${discrepancy > 0 ? '+' : ''}${discrepancy}\n\n${discrepancy > 0 ? 'ზედმეტი' : 'ნაკლები'} ფული`)
      } else {
        alert('✅ სალარო დახურულია!')
      }
    }
  }
  
  const addTransaction = (transaction: Omit<Transaction, 'id' | 'time'>) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: 'TR' + Date.now(),
      time: moment().format()
    }
    
    const updatedTransactions = [...transactions, newTransaction]
    setTransactions(updatedTransactions)
    
    if (currentSession) {
      const updatedSession = {
        ...currentSession,
        transactions: updatedTransactions
      }
      setCurrentSession(updatedSession)
      localStorage.setItem('cashierSession', JSON.stringify(updatedSession))
    }
    
    setShowAddTransaction(false)
  }
  
  const calculateTotals = () => {
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)
    
    const expense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)
    
    const refund = transactions
      .filter(t => t.type === 'refund')
      .reduce((sum, t) => sum + t.amount, 0)
    
    const cash = transactions
      .filter(t => t.paymentMethod === 'cash')
      .reduce((sum, t) => {
        if (t.type === 'income') return sum + t.amount
        return sum - t.amount
      }, currentSession?.openingBalance || 0)
    
    const card = transactions
      .filter(t => t.paymentMethod === 'card' && t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)
    
    return { income, expense, refund, cash, card }
  }
  
  const totals = calculateTotals()
  
  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">💰 სალაროს მართვა</h1>
      
      {!currentSession ? (
        // Open Cashier Form
        <div className="bg-white rounded-lg shadow p-6 max-w-md">
          <h2 className="text-xl font-semibold mb-4">სალაროს გახსნა</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">თარიღი</label>
              <input 
                type="text" 
                value={moment().format('DD/MM/YYYY HH:mm')}
                disabled
                className="w-full px-3 py-2 border rounded bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">საწყისი ბალანსი</label>
              <input 
                type="number"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <button
              onClick={openCashier}
              className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              სალაროს გახსნა
            </button>
          </div>
        </div>
      ) : (
        // Cashier Dashboard
        <div className="space-y-6">
          {/* Status Bar */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <span className="text-green-600 font-semibold">● სალარო ღიაა</span>
                <span className="text-gray-600">
                  გახსნილია: {moment(currentSession.openedAt).format('HH:mm')}
                </span>
                <span className="text-gray-600">
                  მომხმარებელი: {currentSession.userName}
                </span>
              </div>
              <button
                onClick={closeCashier}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                სალაროს დახურვა
              </button>
            </div>
          </div>
          
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-gray-600 text-sm">საწყისი ბალანსი</div>
              <div className="text-2xl font-bold">₾{currentSession.openingBalance}</div>
            </div>
            <div className="bg-green-50 rounded-lg shadow p-4">
              <div className="text-gray-600 text-sm">შემოსავალი</div>
              <div className="text-2xl font-bold text-green-600">₾{totals.income}</div>
            </div>
            <div className="bg-red-50 rounded-lg shadow p-4">
              <div className="text-gray-600 text-sm">გასავალი</div>
              <div className="text-2xl font-bold text-red-600">₾{totals.expense}</div>
            </div>
            <div className="bg-blue-50 rounded-lg shadow p-4">
              <div className="text-gray-600 text-sm">ნაღდი</div>
              <div className="text-2xl font-bold text-blue-600">₾{totals.cash.toFixed(2)}</div>
            </div>
            <div className="bg-purple-50 rounded-lg shadow p-4">
              <div className="text-gray-600 text-sm">ბარათი</div>
              <div className="text-2xl font-bold text-purple-600">₾{totals.card}</div>
            </div>
          </div>
          
          {/* Transactions Table */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">ტრანზაქციები</h3>
              <button
                onClick={() => setShowAddTransaction(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                + ახალი ტრანზაქცია
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">დრო</th>
                    <th className="px-4 py-2 text-left">ტიპი</th>
                    <th className="px-4 py-2 text-left">კატეგორია</th>
                    <th className="px-4 py-2 text-left">აღწერა</th>
                    <th className="px-4 py-2 text-left">მეთოდი</th>
                    <th className="px-4 py-2 text-right">თანხა</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        ტრანზაქციები არ არის
                      </td>
                    </tr>
                  ) : (
                    transactions.map(transaction => (
                      <tr key={transaction.id} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-2">{moment(transaction.time).format('HH:mm')}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            transaction.type === 'income' ? 'bg-green-100 text-green-700' :
                            transaction.type === 'expense' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {transaction.type === 'income' ? 'შემოსავალი' :
                             transaction.type === 'expense' ? 'გასავალი' : 'დაბრუნება'}
                          </span>
                        </td>
                        <td className="px-4 py-2">{transaction.category}</td>
                        <td className="px-4 py-2">{transaction.description}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            transaction.paymentMethod === 'cash' ? 'bg-blue-100 text-blue-700' :
                            transaction.paymentMethod === 'card' ? 'bg-purple-100 text-purple-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {transaction.paymentMethod === 'cash' ? 'ნაღდი' :
                             transaction.paymentMethod === 'card' ? 'ბარათი' : 'გადარიცხვა'}
                          </span>
                        </td>
                        <td className={`px-4 py-2 text-right font-bold ${
                          transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.type === 'income' ? '+' : '-'}₾{transaction.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      
      {/* Add Transaction Modal */}
      {showAddTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">ახალი ტრანზაქცია</h2>
            
            <form onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.target as HTMLFormElement)
              addTransaction({
                type: formData.get('type') as any,
                category: formData.get('category') as string,
                description: formData.get('description') as string,
                amount: parseFloat(formData.get('amount') as string),
                paymentMethod: formData.get('paymentMethod') as any,
                reference: formData.get('reference') as string || undefined
              })
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">ტიპი</label>
                  <select name="type" className="w-full px-3 py-2 border rounded" required>
                    <option value="income">შემოსავალი</option>
                    <option value="expense">გასავალი</option>
                    <option value="refund">დაბრუნება</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">კატეგორია</label>
                  <select name="category" className="w-full px-3 py-2 border rounded" required>
                    <option value="Room">ოთახი</option>
                    <option value="Restaurant">რესტორანი</option>
                    <option value="Minibar">მინიბარი</option>
                    <option value="Laundry">სამრეცხაო</option>
                    <option value="Other">სხვა</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">აღწერა</label>
                  <input 
                    type="text" 
                    name="description"
                    className="w-full px-3 py-2 border rounded"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">თანხა</label>
                  <input 
                    type="number" 
                    name="amount"
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border rounded"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">გადახდის მეთოდი</label>
                  <select name="paymentMethod" className="w-full px-3 py-2 border rounded" required>
                    <option value="cash">ნაღდი</option>
                    <option value="card">ბარათი</option>
                    <option value="transfer">გადარიცხვა</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Reference #</label>
                  <input 
                    type="text" 
                    name="reference"
                    className="w-full px-3 py-2 border rounded"
                    placeholder="Optional"
                  />
                </div>
              </div>
              
              <div className="flex gap-4 mt-6">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  დამატება
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddTransaction(false)}
                  className="flex-1 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  გაუქმება
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}



