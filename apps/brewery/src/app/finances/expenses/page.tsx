'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui'
import { StatCard } from '@/components/reports/StatCard'
import { ExpenseModal, ExpenseFormData } from '@/components/finances/ExpenseModal'
import { formatDate, formatCurrency } from '@/lib/utils'

interface Expense {
  id: string
  category: string
  categoryName: string
  supplierId: string | null
  supplierName: string | null
  amount: number
  date: string
  description: string | null
  invoiceNumber: string | null
  isPaid: boolean
  paidAt: string | null
  paymentMethod: string | null
  notes: string | null
}

interface ExpenseStats {
  total: number
  totalAmount: number
  paidAmount: number
  pendingAmount: number
}

interface Budget {
  id: string
  category: string
  year: number
  month: number | null
  amount: number
  actual: number
  variance: number
  variancePercent: number
}

interface Supplier {
  id: string
  name: string
  category: string | null
}

const expenseCategoryConfig: Record<string, { name: string; icon: string; color: string }> = {
  INGREDIENTS: { name: 'ინგრედიენტები', icon: '🌾', color: '#B87333' },
  PACKAGING: { name: 'შეფუთვა', icon: '📦', color: '#3B82F6' },
  EQUIPMENT: { name: 'აღჭურვილობა', icon: '⚙️', color: '#6B7280' },
  UTILITIES: { name: 'კომუნალური', icon: '💡', color: '#EAB308' },
  SALARY: { name: 'ხელფასი', icon: '👥', color: '#10B981' },
  RENT: { name: 'იჯარა', icon: '🏠', color: '#8B5CF6' },
  MARKETING: { name: 'მარკეტინგი', icon: '📢', color: '#EC4899' },
  MAINTENANCE: { name: 'მოვლა-შენახვა', icon: '🔧', color: '#F97316' },
  TRANSPORT: { name: 'ტრანსპორტი', icon: '🚛', color: '#14B8A6' },
  OTHER: { name: 'სხვა', icon: '📝', color: '#9CA3AF' },
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [stats, setStats] = useState<ExpenseStats | null>(null)
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [supplierFilter, setSupplierFilter] = useState('all')
  const [isPaidFilter, setIsPaidFilter] = useState<string>('all')
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<ExpenseFormData | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Build query params
      const params = new URLSearchParams()
      if (categoryFilter !== 'all') params.append('category', categoryFilter)
      if (supplierFilter !== 'all') params.append('supplierId', supplierFilter)
      if (isPaidFilter !== 'all') params.append('isPaid', isPaidFilter)

      // Fetch expenses
      const expensesRes = await fetch(`/api/finances/expenses?${params}`)
      if (!expensesRes.ok) throw new Error('Failed to fetch expenses')
      const expensesData = await expensesRes.json()
      setExpenses(expensesData.expenses)
      setStats(expensesData.stats)

      // Fetch budgets
      const budgetsRes = await fetch('/api/finances/budgets')
      if (budgetsRes.ok) {
        const budgetsData = await budgetsRes.json()
        setBudgets(budgetsData.budgets)
      }

      // Fetch suppliers
      const suppliersRes = await fetch('/api/finances/suppliers')
      if (suppliersRes.ok) {
        const suppliersData = await suppliersRes.json()
        setSuppliers(suppliersData.suppliers)
      }

    } catch (err) {
      setError('მონაცემების ჩატვირთვა ვერ მოხერხდა')
      console.error('Expenses fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [categoryFilter, supplierFilter, isPaidFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleExpenseSubmit = async (data: ExpenseFormData) => {
    try {
      const url = data.id ? `/api/finances/expenses/${data.id}` : '/api/finances/expenses'
      const method = data.id ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: data.category,
          supplierId: data.supplierId || null,
          amount: data.amount,
          date: data.date,
          description: data.description,
          invoiceNumber: data.invoiceNumber || null,
          isPaid: data.isPaid,
          paymentMethod: data.isPaid && data.paymentMethod ? data.paymentMethod : null,
          notes: data.notes || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save expense')
      }

      setIsExpenseModalOpen(false)
      setEditingExpense(null)
      fetchData()
    } catch (err: any) {
      console.error('Expense save error:', err)
      alert(err.message || 'ხარჯის შენახვა ვერ მოხერხდა')
    }
  }

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense({
      id: expense.id,
      category: expense.category.toUpperCase(),
      supplierId: expense.supplierId || undefined,
      amount: expense.amount,
      date: expense.date.split('T')[0],
      description: expense.description || '',
      invoiceNumber: expense.invoiceNumber || undefined,
      isPaid: expense.isPaid,
      paymentMethod: (expense.paymentMethod && expense.isPaid) ? expense.paymentMethod.toUpperCase() : undefined,
      notes: expense.notes || undefined,
    })
    setIsExpenseModalOpen(true)
  }

  const getStatusBadge = (isPaid: boolean) => {
    return isPaid 
      ? 'bg-green-400/20 text-green-400'
      : 'bg-gray-400/20 text-gray-400'
  }

  // Calculate expenses by category from current data
  const expensesByCategory = expenses.reduce((acc, expense) => {
    const cat = expense.category.toUpperCase()
    if (!acc[cat]) acc[cat] = 0
    acc[cat] += expense.amount
    return acc
  }, {} as Record<string, number>)

  // Calculate budget variance
  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0)
  const totalActual = stats?.totalAmount || 0
  const budgetVariance = totalBudget > 0 ? Math.round(((totalActual - totalBudget) / totalBudget) * 100) : 0

  if (loading) {
    return (
      <DashboardLayout title="📉 ხარჯები" breadcrumb="მთავარი / ფინანსები / ხარჯები">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-copper mx-auto mb-4"></div>
            <p className="text-text-muted">იტვირთება...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout title="📉 ხარჯები" breadcrumb="მთავარი / ფინანსები / ხარჯები">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <p className="text-text-muted mb-4">{error}</p>
            <Button onClick={fetchData}>თავიდან ცდა</Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="📉 ხარჯები" breadcrumb="მთავარი / ფინანსები / ხარჯები">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Link href="/finances">
              <Button variant="ghost" size="sm">← უკან</Button>
            </Link>
            <h2 className="text-2xl font-bold text-text-primary">ხარჯები</h2>
          </div>
          
          <Button onClick={() => {
            setEditingExpense(null)
            setIsExpenseModalOpen(true)
          }}>
            + ხარჯი
          </Button>
        </div>

        {/* Stats Cards - Compact */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-bg-card border border-border rounded-xl p-3">
            <div className="text-xs text-text-muted mb-1">📉 სულ ხარჯი</div>
            <div className="text-xl font-bold text-red-400">{formatCurrency(stats?.totalAmount || 0)}</div>
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-3">
            <div className="text-xs text-text-muted mb-1">📅 ამ თვეში</div>
            <div className="text-xl font-bold text-amber-400">{formatCurrency(stats?.totalAmount || 0)}</div>
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-3">
            <div className="text-xs text-text-muted mb-1">📊 საშუალო</div>
            <div className="text-xl font-bold text-text-primary">{formatCurrency((stats?.totalAmount || 0) / Math.max(expenses.length, 1))}</div>
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-3">
            <div className="text-xs text-text-muted mb-1">🔢 რაოდენობა</div>
            <div className="text-xl font-bold text-text-primary">{expenses.length}</div>
          </div>
        </div>

        {/* Filters - After Cards */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary text-sm"
          >
            <option value="all">ყველა კატეგორია</option>
            <option value="INGREDIENTS">ინგრედიენტები</option>
            <option value="PACKAGING">შეფუთვა</option>
            <option value="SALARY">ხელფასი</option>
            <option value="RENT">იჯარა</option>
            <option value="UTILITIES">კომუნალური</option>
            <option value="OTHER">სხვა</option>
          </select>
          
          <select
            value={isPaidFilter}
            onChange={(e) => setIsPaidFilter(e.target.value)}
            className="px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary text-sm"
          >
            <option value="all">ყველა სტატუსი</option>
            <option value="true">გადახდილი</option>
            <option value="false">გადასახდელი</option>
          </select>
          
          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary text-sm"
          >
            <option value="all">ყველა მომწოდებელი</option>
            {suppliers.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Expenses by Category Chart */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-text-primary">ხარჯები კატეგორიით</h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {Object.entries(expensesByCategory)
                .filter(([_, amount]) => amount > 0)
                .sort(([_, a], [__, b]) => b - a)
                .map(([category, amount]) => {
                  const config = expenseCategoryConfig[category] || expenseCategoryConfig.OTHER
                  const total = stats?.totalAmount || 1
                  const percentage = Math.round((amount / total) * 100)
                  const barWidth = (amount / total) * 100
                  return (
                    <div key={category}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span>{config.icon}</span>
                          <span className="text-sm font-medium text-text-primary">{config.name}</span>
                        </div>
                        <div className="text-sm font-semibold text-text-primary">{formatCurrency(amount)}</div>
                      </div>
                      <div className="h-3 bg-bg-tertiary rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${barWidth}%`, backgroundColor: config.color }}
                        />
                      </div>
                      <div className="text-xs text-text-muted mt-1">{percentage}%</div>
                    </div>
                  )
                })}
              {Object.keys(expensesByCategory).length === 0 && (
                <p className="text-text-muted text-center py-4">ხარჯები არ არის</p>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Budget vs Actual */}
        {budgets.length > 0 && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-text-primary">ბიუჯეტი vs რეალობა</h3>
            </CardHeader>
            <CardBody>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">კატეგორია</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-text-primary">ბიუჯეტი</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-text-primary">რეალური</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-text-primary">სხვაობა</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-text-primary">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {budgets.map(budget => {
                      const config = expenseCategoryConfig[budget.category.toUpperCase()] || expenseCategoryConfig.OTHER
                      return (
                        <tr key={budget.id} className="border-b border-border hover:bg-bg-tertiary/50">
                          <td className="py-3 px-4 text-text-primary">
                            <div className="flex items-center gap-2">
                              <span>{config.icon}</span>
                              <span>{config.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right text-text-primary">{formatCurrency(budget.amount)}</td>
                          <td className="py-3 px-4 text-right text-text-primary">{formatCurrency(budget.actual)}</td>
                          <td className={`py-3 px-4 text-right font-semibold ${
                            budget.variance > 0 ? 'text-red-400' : budget.variance < 0 ? 'text-green-400' : 'text-text-primary'
                          }`}>
                            {budget.variance > 0 ? '+' : ''}{formatCurrency(budget.variance)}
                          </td>
                          <td className={`py-3 px-4 text-right ${
                            budget.variancePercent > 0 ? 'text-red-400' : budget.variancePercent < 0 ? 'text-green-400' : 'text-text-primary'
                          }`}>
                            {budget.variancePercent > 0 ? '⚠️' : '✅'} {budget.variancePercent > 0 ? '+' : ''}{budget.variancePercent}%
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Expenses Table */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-text-primary">ხარჯების ცხრილი</h3>
          </CardHeader>
          <CardBody>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">#</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">თარიღი</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">აღწერა</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">მომწოდებელი</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">კატეგორია</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-text-primary">თანხა</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">სტატუსი</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">ინვოისი</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-text-primary">მოქმედება</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-text-muted">
                        ხარჯები არ მოიძებნა
                      </td>
                    </tr>
                  ) : (
                    expenses.map((expense, index) => {
                      const config = expenseCategoryConfig[expense.category.toUpperCase()] || expenseCategoryConfig.OTHER
                      return (
                        <tr key={expense.id} className="border-b border-border hover:bg-bg-tertiary/50">
                          <td className="py-3 px-4 text-text-muted">{index + 1}</td>
                          <td className="py-3 px-4 text-text-primary">{formatDate(new Date(expense.date))}</td>
                          <td className="py-3 px-4 text-text-primary">{expense.description || '-'}</td>
                          <td className="py-3 px-4 text-text-primary">{expense.supplierName || '-'}</td>
                          <td className="py-3 px-4 text-text-primary">
                            <span className="flex items-center gap-1">
                              {config.icon} {config.name}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-red-400">{formatCurrency(expense.amount)}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusBadge(expense.isPaid)}`}>
                              {expense.isPaid ? '✅ გადახდილი' : '⏳ მოლოდინში'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-text-muted text-sm">{expense.invoiceNumber || '-'}</td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditExpense(expense)}
                              className="text-copper hover:text-copper/80"
                            >
                              ✏️
                            </Button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>

        {/* Expense Modal */}
        <ExpenseModal
          isOpen={isExpenseModalOpen}
          onClose={() => {
            setIsExpenseModalOpen(false)
            setEditingExpense(null)
          }}
          onSubmit={handleExpenseSubmit}
          expense={editingExpense}
          suppliers={suppliers}
        />
      </div>
    </DashboardLayout>
  )
}
