'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui'
import { StatCard } from '@/components/reports/StatCard'
import { ExpenseModal, ExpenseFormData } from '@/components/finances/ExpenseModal'
import { formatCurrency, formatDate } from '@/lib/utils'

interface DashboardStats {
  totalIncome: number
  totalExpenses: number
  netProfit: number
  profitMargin: number
  pendingPayments: number
  overdueInvoices: number
}

interface Transaction {
  id: string
  type: 'income' | 'expense'
  amount: number
  description: string
  category: string
  categoryName: string
  date: string
  paymentMethod?: string
}

interface Supplier {
  id: string
  name: string
}

const expenseCategoryLabels: Record<string, string> = {
  INGREDIENTS: 'ინგრედიენტები',
  PACKAGING: 'შეფუთვა',
  UTILITIES: 'კომუნალური',
  RENT: 'იჯარა',
  SALARY: 'ხელფასი',
  EQUIPMENT: 'აღჭურვილობა',
  MAINTENANCE: 'მოვლა',
  MARKETING: 'მარკეტინგი',
  TRANSPORT: 'ტრანსპორტი',
  TAXES: 'გადასახადები',
  OTHER: 'სხვა',
}

const incomeCategoryLabels: Record<string, string> = {
  SALE: 'გაყიდვა',
  SERVICE: 'მომსახურება',
  OTHER: 'სხვა',
}

export default function FinancesPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  // Helper function to get last N months
  const getLastMonths = (count: number) => {
    const months = []
    const now = new Date()
    
    for (let i = 0; i < count; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({
        month: date.getMonth() + 1,
        year: date.getFullYear(),
        label: date.toLocaleDateString('ka-GE', { month: 'long', year: 'numeric' })
      })
    }
    
    return months
  }

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)

      // Fetch dashboard stats with month/year filter
      const dashboardRes = await fetch(`/api/finances/dashboard?period=month&month=${selectedMonth}&year=${selectedYear}`)
      if (dashboardRes.ok) {
        const dashboardData = await dashboardRes.json()
        // Transform to new format
        setStats({
          totalIncome: dashboardData.summary?.totalIncome || 0,
          totalExpenses: dashboardData.summary?.totalExpenses || 0,
          netProfit: dashboardData.summary?.profit || 0,
          profitMargin: dashboardData.summary?.profitMargin || 0,
          pendingPayments: (dashboardData.receivables?.pending || 0) + (dashboardData.payables?.pending || 0),
          overdueInvoices: dashboardData.overdueInvoices?.length || 0,
        })

        // Use recent transactions from dashboard (already filtered by month)
        if (dashboardData.recentTransactions) {
          const transformed = dashboardData.recentTransactions.slice(0, 3).map((t: any) => {
            const isIncome = t.type === 'INCOME' || t.type?.toLowerCase() === 'income'
            const category = t.category || 'OTHER'
            return {
              id: t.id,
              type: isIncome ? 'income' : 'expense',
              amount: t.amount,
              description: t.description || 'ტრანზაქცია',
              category,
              categoryName: isIncome 
                ? (incomeCategoryLabels[category] || category)
                : (expenseCategoryLabels[category] || category),
              date: t.date,
              paymentMethod: t.paymentMethod,
            }
          })
          setTransactions(transformed)
        }
      }

      // Fetch suppliers (no date filter needed)
      const suppliersRes = await fetch('/api/finances/suppliers')
      if (suppliersRes.ok) {
        const suppliersData = await suppliersRes.json()
        setSuppliers(suppliersData.suppliers || [])
      }

    } catch (err) {
      console.error('Finance dashboard fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedMonth, selectedYear])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleExpenseSubmit = async (data: ExpenseFormData) => {
    try {
      const response = await fetch('/api/finances/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) throw new Error('Failed to create expense')

      setIsExpenseModalOpen(false)
      fetchData()
    } catch (err) {
      console.error('Expense creation error:', err)
      alert('ხარჯის დამატება ვერ მოხერხდა')
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="💵 ფინანსები" breadcrumb="მთავარი / ფინანსები">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-copper"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="💵 ფინანსები" breadcrumb="მთავარი / ფინანსები">
      <div className="space-y-6">
        {/* Header with Date Picker and Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Date Picker */}
          <div className="flex items-center gap-3">
            <span className="text-2xl">📅</span>
            <select
              value={`${selectedYear}-${selectedMonth}`}
              onChange={(e) => {
                const [year, month] = e.target.value.split('-')
                setSelectedYear(parseInt(year))
                setSelectedMonth(parseInt(month))
              }}
              className="px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary font-medium"
            >
              {getLastMonths(12).map((date) => (
                <option key={`${date.year}-${date.month}`} value={`${date.year}-${date.month}`}>
                  {date.label}
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/finances/income">
              <Button variant="ghost" size="sm">💰 შემოსავლები</Button>
            </Link>
            <Link href="/finances/expenses">
              <Button variant="ghost" size="sm">📉 ხარჯები</Button>
            </Link>
            <Link href="/finances/invoices">
              <Button variant="ghost" size="sm">🧾 ინვოისები</Button>
            </Link>
            <Link href="/sales/customers?from=finances">
              <Button variant="ghost" size="sm">👤 კლიენტები</Button>
            </Link>
            <Link href="/finances/suppliers">
              <Button variant="ghost" size="sm">👥 მომწოდებლები</Button>
            </Link>
            <Link href="/finances/reports">
              <Button variant="secondary" size="sm">📊 ანგარიში</Button>
            </Link>
            <Button size="sm" onClick={() => setIsExpenseModalOpen(true)}>
              ➕ ტრანზაქცია
            </Button>
          </div>
        </div>

        {/* Stats Cards - Compact */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-bg-card border border-border rounded-xl p-3">
            <div className="text-xs text-text-muted mb-1">📈 შემოსავალი</div>
            <div className="text-xl font-bold text-green-400">{formatCurrency(stats?.totalIncome || 0)}</div>
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-3">
            <div className="text-xs text-text-muted mb-1">📉 ხარჯი</div>
            <div className="text-xl font-bold text-red-400">{formatCurrency(stats?.totalExpenses || 0)}</div>
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-3">
            <div className="text-xs text-text-muted mb-1">💰 მოგება</div>
            <div className={`text-xl font-bold ${(stats?.netProfit || 0) >= 0 ? 'text-copper' : 'text-red-400'}`}>
              {formatCurrency(stats?.netProfit || 0)}
            </div>
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-3">
            <div className="text-xs text-text-muted mb-1">📊 მარჟა</div>
            <div className="text-xl font-bold text-text-primary">{stats?.profitMargin?.toFixed(1) || 0}%</div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-text-primary">📋 ბოლო ტრანზაქციები</h3>
                <Link href="/finances/expenses">
                  <Button variant="ghost" size="sm">ყველა →</Button>
                </Link>
              </div>
            </CardHeader>
            <CardBody>
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-text-muted">
                  <div className="text-4xl mb-2">📋</div>
                  <p>ტრანზაქციები არ არის</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((tx) => (
                    <div 
                      key={tx.id} 
                      className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
                          tx.type === 'income' ? 'bg-green-400/20' : 'bg-red-400/20'
                        }`}>
                          {tx.type === 'income' ? '📈' : '📉'}
                        </div>
                        <div>
                          <div className="font-medium text-text-primary text-sm">{tx.description}</div>
                          <div className="text-xs text-text-muted">
                            {formatDate(new Date(tx.date))} • {tx.categoryName || expenseCategoryLabels[tx.category] || tx.category}
                          </div>
                        </div>
                      </div>
                      <div className={`font-semibold ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Quick Summary */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-text-primary">📊 თვის შეჯამება</h3>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-text-muted">შემოსავალი vs ხარჯი</span>
                    <span className="text-text-primary">
                      {stats?.totalIncome && stats?.totalExpenses 
                        ? `${Math.round((stats.totalExpenses / stats.totalIncome) * 100)}% ხარჯი`
                        : '-'}
                    </span>
                  </div>
                  <div className="h-4 bg-bg-tertiary rounded-full overflow-hidden flex">
                    {stats?.totalIncome && stats.totalIncome > 0 && (
                      <>
                        <div 
                          className="bg-green-400 h-full"
                          style={{ 
                            width: `${Math.min(100 - ((stats.totalExpenses || 0) / stats.totalIncome) * 100, 100)}%` 
                          }}
                        />
                        <div 
                          className="bg-red-400 h-full"
                          style={{ 
                            width: `${Math.min(((stats.totalExpenses || 0) / stats.totalIncome) * 100, 100)}%` 
                          }}
                        />
                      </>
                    )}
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-bg-tertiary rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-400">
                      {formatCurrency(stats?.totalIncome || 0)}
                    </div>
                    <div className="text-xs text-text-muted">შემოსავალი</div>
                  </div>
                  <div className="p-3 bg-bg-tertiary rounded-lg text-center">
                    <div className="text-2xl font-bold text-red-400">
                      {formatCurrency(stats?.totalExpenses || 0)}
                    </div>
                    <div className="text-xs text-text-muted">ხარჯი</div>
                  </div>
                </div>

                {/* Net Profit */}
                <div className="p-4 bg-copper/10 border border-copper/30 rounded-lg text-center">
                  <div className="text-xs text-text-muted mb-1">წმინდა მოგება</div>
                  <div className={`text-3xl font-bold ${(stats?.netProfit || 0) >= 0 ? 'text-copper' : 'text-red-400'}`}>
                    {formatCurrency(stats?.netProfit || 0)}
                  </div>
                </div>

                {/* Pending */}
                {(stats?.pendingPayments || 0) > 0 && (
                  <div className="flex items-center justify-between p-3 bg-amber-400/10 border border-amber-400/30 rounded-lg">
                    <span className="text-text-muted text-sm">მოლოდინში გადახდები</span>
                    <span className="font-semibold text-amber-400">{formatCurrency(stats?.pendingPayments || 0)}</span>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Expense Modal */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSubmit={handleExpenseSubmit}
        suppliers={suppliers as any}
      />
    </DashboardLayout>
  )
}
