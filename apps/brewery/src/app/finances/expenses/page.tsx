'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui'
import { StatCard } from '@/components/reports/StatCard'
import { ExpenseCard } from '@/components/finances/ExpenseCard'
import { TransactionModal } from '@/components/finances/TransactionModal'
import { mockTransactions, mockBudgets, expenseCategoryConfig } from '@/data/financeData'
import { formatDate, formatCurrency } from '@/lib/utils'

export default function ExpensesPage() {
  const [period, setPeriod] = useState('ამ თვე')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [supplierFilter, setSupplierFilter] = useState('all')
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false)

  // Filter transactions
  const expenseTransactions = mockTransactions.filter(t => t.type === 'expense')
  const filteredTransactions = expenseTransactions.filter(t => {
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false
    if (supplierFilter !== 'all' && t.supplierName !== supplierFilter) return false
    return true
  })

  // Calculate statistics
  const totalExpenses = filteredTransactions.reduce((sum, t) => sum + t.amount, 0)
  const paidExpenses = filteredTransactions.filter(t => t.paymentMethod).reduce((sum, t) => sum + t.amount, 0)
  const pendingExpenses = totalExpenses - paidExpenses
  const totalBudget = mockBudgets.reduce((sum, b) => sum + b.monthlyBudget, 0)
  const budgetVariance = totalBudget > 0 ? Math.round(((totalExpenses - totalBudget) / totalBudget) * 100) : 0

  // Expenses by category
  const expensesByCategory = Object.entries(expenseCategoryConfig).reduce((acc, [category]) => {
    acc[category] = filteredTransactions
      .filter(t => t.category === category)
      .reduce((sum, t) => sum + t.amount, 0)
    return acc
  }, {} as Record<string, number>)

  const uniqueSuppliers = Array.from(new Set(expenseTransactions.map(t => t.supplierName).filter(Boolean)))

  const getStatusBadge = (transaction: typeof filteredTransactions[0]) => {
    if (transaction.paymentMethod) {
      return 'bg-green-400/20 text-green-400'
    }
    return 'bg-gray-400/20 text-gray-400'
  }

  return (
    <DashboardLayout title="📉 ხარჯები" breadcrumb="მთავარი / ფინანსები / ხარჯები">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
          >
            <option>ამ თვე</option>
            <option>წინა თვე</option>
            <option>კვარტალი</option>
            <option>წელი</option>
          </select>
          <Button onClick={() => setIsTransactionModalOpen(true)}>+ ხარჯი</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
        >
          <option value="all">ყველა კატეგორია</option>
          {Object.entries(expenseCategoryConfig).map(([key, config]) => (
            <option key={key} value={key}>{config.icon} {config.name}</option>
          ))}
        </select>
        <select
          value={supplierFilter}
          onChange={(e) => setSupplierFilter(e.target.value)}
          className="px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
        >
          <option value="all">ყველა მომწოდებელი</option>
          {uniqueSuppliers.map(supplier => (
            <option key={supplier} value={supplier}>{supplier}</option>
          ))}
        </select>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="სულ ხარჯები"
          value={formatCurrency(totalExpenses)}
          icon="📉"
          color="red"
        />
        <StatCard
          title="გადახდილი"
          value={formatCurrency(paidExpenses)}
          icon="✅"
          color="green"
        />
        <StatCard
          title="გადასახდელი"
          value={formatCurrency(pendingExpenses)}
          icon="⏳"
          color="amber"
        />
        <StatCard
          title="vs ბიუჯეტი"
          value={`${budgetVariance > 0 ? '+' : ''}${budgetVariance}%`}
          change={budgetVariance}
          icon="📊"
          color={budgetVariance > 0 ? 'red' : budgetVariance < 0 ? 'green' : 'amber'}
        />
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
                const config = expenseCategoryConfig[category as keyof typeof expenseCategoryConfig]
                const percentage = totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0
                const barWidth = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
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
                        className="h-full bg-gradient-to-r from-copper to-amber-600"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    <div className="text-xs text-text-muted mt-1">{percentage}%</div>
                  </div>
                )
              })}
          </div>
        </CardBody>
      </Card>

      {/* Budget vs Actual */}
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
                {mockBudgets.map(budget => {
                  const actual = expensesByCategory[budget.category] || 0
                  const difference = actual - budget.monthlyBudget
                  const percentage = budget.monthlyBudget > 0 ? Math.round((difference / budget.monthlyBudget) * 100) : 0
                  const config = expenseCategoryConfig[budget.category]
                  return (
                    <tr key={budget.category} className="border-b border-border hover:bg-bg-tertiary/50">
                      <td className="py-3 px-4 text-text-primary">
                        <div className="flex items-center gap-2">
                          <span>{config.icon}</span>
                          <span>{config.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right text-text-primary">{formatCurrency(budget.monthlyBudget)}</td>
                      <td className="py-3 px-4 text-right text-text-primary">{formatCurrency(actual)}</td>
                      <td className={`py-3 px-4 text-right font-semibold ${
                        difference > 0 ? 'text-red-400' : difference < 0 ? 'text-green-400' : 'text-text-primary'
                      }`}>
                        {difference > 0 ? '+' : ''}{formatCurrency(difference)}
                      </td>
                      <td className={`py-3 px-4 text-right ${
                        percentage > 0 ? 'text-red-400' : percentage < 0 ? 'text-green-400' : 'text-text-primary'
                      }`}>
                        {percentage > 0 ? '⚠️' : percentage < 0 ? '✅' : '✅'} {percentage > 0 ? '+' : ''}{percentage}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

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
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((transaction, index) => (
                  <tr key={transaction.id} className="border-b border-border hover:bg-bg-tertiary/50">
                    <td className="py-3 px-4 text-text-muted">{index + 1}</td>
                    <td className="py-3 px-4 text-text-primary">{formatDate(transaction.date)}</td>
                    <td className="py-3 px-4 text-text-primary">{transaction.description}</td>
                    <td className="py-3 px-4 text-text-primary">{transaction.supplierName || '-'}</td>
                    <td className="py-3 px-4 text-text-primary">
                      {expenseCategoryConfig[transaction.category as keyof typeof expenseCategoryConfig]?.name || transaction.category}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-red-400">{formatCurrency(transaction.amount)}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusBadge(transaction)}`}>
                        {transaction.paymentMethod ? '✅ გადახდილი' : '⏳ მოლოდინში'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-text-muted text-sm">{transaction.invoiceNumber || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        onSubmit={(data) => {
          console.log('New expense transaction:', data)
          setIsTransactionModalOpen(false)
        }}
      />
      </div>
    </DashboardLayout>
  )
}

