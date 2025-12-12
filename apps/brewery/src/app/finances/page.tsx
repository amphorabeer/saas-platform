'use client'

import { useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui'
import { StatCard } from '@/components/reports/StatCard'
import { FinancialChart } from '@/components/finances/FinancialChart'
import { TransactionModal } from '@/components/finances/TransactionModal'
import { DonutChart } from '@/components/reports/DonutChart'
import { mockTransactions, mockMonthlyFinancials, mockInvoicesIncoming, expenseCategoryConfig } from '@/data/financeData'
import { formatDate, formatCurrency, formatShortDate } from '@/lib/utils'

export default function FinancesPage() {
  const [period, setPeriod] = useState('ამ თვე')
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false)

  // Calculate statistics for current month
  const currentMonth = mockMonthlyFinancials[mockMonthlyFinancials.length - 1]
  const previousMonth = mockMonthlyFinancials[mockMonthlyFinancials.length - 2]

  const totalIncome = currentMonth.income
  const totalExpenses = currentMonth.expenses
  const profit = currentMonth.profit
  const pendingInvoices = mockInvoicesIncoming.filter(inv => inv.status === 'pending' || inv.status === 'overdue')
  const totalPending = pendingInvoices.reduce((sum, inv) => sum + (inv.total - inv.paidAmount), 0)

  const incomeChange = previousMonth ? Math.round(((totalIncome - previousMonth.income) / previousMonth.income) * 100) : 0
  const expensesChange = previousMonth ? Math.round(((totalExpenses - previousMonth.expenses) / previousMonth.expenses) * 100) : 0
  const profitChange = previousMonth ? Math.round(((profit - previousMonth.profit) / previousMonth.profit) * 100) : 0

  // Recent transactions
  const recentTransactions = mockTransactions.slice(0, 5)

  // Expense distribution
  const expenseData = Object.entries(currentMonth.expensesByCategory)
    .filter(([_, amount]) => amount > 0)
    .map(([category, amount]) => ({
      label: expenseCategoryConfig[category as keyof typeof expenseCategoryConfig].name,
      value: amount,
      color: category === 'ingredients' ? '#B87333' :
             category === 'packaging' ? '#3B82F6' :
             category === 'salary' ? '#10B981' :
             category === 'rent' ? '#8B5CF6' :
             category === 'utilities' ? '#EAB308' :
             category === 'equipment' ? '#6B7280' :
             '#9CA3AF'
    }))

  const getStatusBadge = (status: string) => {
    const badges = {
      paid: 'bg-green-400/20 text-green-400',
      pending: 'bg-gray-400/20 text-gray-400',
      partial: 'bg-amber-400/20 text-amber-400',
      overdue: 'bg-red-400/20 text-red-400',
    }
    return badges[status as keyof typeof badges] || badges.pending
  }

  return (
    <DashboardLayout title="💵 ფინანსები" breadcrumb="მთავარი / ფინანსები">
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
            <option>custom</option>
          </select>
          <Button variant="secondary" onClick={() => console.log('Export')}>📊 ანგარიში</Button>
          <Button onClick={() => setIsTransactionModalOpen(true)}>+ ტრანზაქცია</Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="შემოსავალი"
          value={formatCurrency(totalIncome)}
          change={incomeChange}
          changeLabel="vs წინა"
          icon="💰"
          color="green"
        />
        <StatCard
          title="ხარჯები"
          value={formatCurrency(totalExpenses)}
          change={expensesChange}
          changeLabel="vs წინა"
          icon="📉"
          color="red"
        />
        <StatCard
          title="მოგება"
          value={formatCurrency(profit)}
          change={profitChange}
          changeLabel="vs წინა"
          icon="📈"
          color="emerald"
        />
        <StatCard
          title="გადასახდელი"
          value={formatCurrency(totalPending)}
          icon="💳"
          color="amber"
        />
      </div>

      {/* Main Chart */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-text-primary">📊 შემოსავლები vs ხარჯები (12 თვე)</h3>
        </CardHeader>
        <CardBody>
          <FinancialChart
            data={mockMonthlyFinancials}
            showIncome={true}
            showExpenses={true}
            showProfit={true}
            height={300}
          />
        </CardBody>
      </Card>

      {/* 3 Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-text-primary">📋 ბოლო ტრანზაქციები</h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              {recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className={`p-3 rounded-lg border-l-4 ${
                    transaction.type === 'income' ? 'border-l-green-500 bg-green-500/5' : 'border-l-red-500 bg-red-500/5'
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1">
                      <div className="font-medium text-text-primary">{transaction.description}</div>
                      {transaction.customerName && (
                        <div className="text-sm text-text-muted">{transaction.customerName}</div>
                      )}
                      {transaction.supplierName && (
                        <div className="text-sm text-text-muted">{transaction.supplierName}</div>
                      )}
                    </div>
                    <div className={`text-right font-semibold ${
                      transaction.type === 'income' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {transaction.type === 'income' ? '↑' : '↓'} {formatCurrency(transaction.amount)}
                    </div>
                  </div>
                  <div className="text-xs text-text-muted">{formatShortDate(transaction.date)}</div>
                </div>
              ))}
            </div>
            <Link href="/finances/income">
              <Button variant="ghost" className="w-full mt-4">ყველა ტრანზაქცია →</Button>
            </Link>
          </CardBody>
        </Card>

        {/* Pending Invoices */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-text-primary">🧾 გადასახდელი ინვოისები</h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              {pendingInvoices.slice(0, 3).map((invoice) => {
                const daysOverdue = Math.floor((new Date().getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24))
                const remaining = invoice.total - invoice.paidAmount
                return (
                  <div key={invoice.id} className="p-3 rounded-lg bg-bg-tertiary">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className={`inline-block px-2 py-1 rounded text-xs font-medium mb-1 ${
                          invoice.status === 'overdue' ? 'bg-red-400/20 text-red-400' :
                          invoice.status === 'pending' && daysOverdue < 0 ? 'bg-amber-400/20 text-amber-400' :
                          'bg-gray-400/20 text-gray-400'
                        }`}>
                          {invoice.status === 'overdue' ? '❌' : invoice.status === 'pending' && daysOverdue < 0 ? '⚠️' : '⏳'} {invoice.invoiceNumber}
                        </div>
                        <div className="font-medium text-text-primary">{invoice.supplierName}</div>
                        <div className="text-sm text-text-muted">{formatCurrency(remaining)}</div>
                      </div>
                    </div>
                    <div className="text-xs text-text-muted">
                      ვადა: {formatDate(invoice.dueDate)}
                      {daysOverdue > 0 && (
                        <span className="text-red-400 ml-2">| {daysOverdue} დღით გადაცილებული</span>
                      )}
                      {daysOverdue < 0 && (
                        <span className="text-amber-400 ml-2">| {Math.abs(daysOverdue)} დღე დარჩა</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-text-muted">სულ გადასახდელი:</span>
                <span className="font-semibold text-text-primary">{formatCurrency(totalPending)}</span>
              </div>
            </div>
            <Link href="/finances/invoices">
              <Button variant="ghost" className="w-full mt-2">ყველა ინვოისი →</Button>
            </Link>
          </CardBody>
        </Card>

        {/* Expense Distribution */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-text-primary">📊 ხარჯების განაწილება (თვე)</h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              {Object.entries(currentMonth.expensesByCategory)
                .filter(([_, amount]) => amount > 0)
                .sort(([_, a], [__, b]) => b - a)
                .map(([category, amount]) => {
                  const config = expenseCategoryConfig[category as keyof typeof expenseCategoryConfig]
                  const percentage = Math.round((amount / totalExpenses) * 100)
                  const barWidth = (amount / totalExpenses) * 100
                  return (
                    <div key={category}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span>{config.icon}</span>
                          <span className="text-sm text-text-primary">{config.name}</span>
                        </div>
                        <div className="text-sm font-semibold text-text-primary">{formatCurrency(amount)}</div>
                      </div>
                      <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
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
            <Link href="/finances/expenses">
              <Button variant="ghost" className="w-full mt-4">დეტალური ხარჯები →</Button>
            </Link>
          </CardBody>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link href="/finances/income">
          <Card className="cursor-pointer hover:border-copper transition-colors h-full">
            <CardBody className="p-6 text-center">
              <div className="text-3xl mb-2">💰</div>
              <div className="font-semibold text-text-primary">შემოსავლები</div>
            </CardBody>
          </Card>
        </Link>
        <Link href="/finances/expenses">
          <Card className="cursor-pointer hover:border-copper transition-colors h-full">
            <CardBody className="p-6 text-center">
              <div className="text-3xl mb-2">📉</div>
              <div className="font-semibold text-text-primary">ხარჯები</div>
            </CardBody>
          </Card>
        </Link>
        <Link href="/finances/invoices">
          <Card className="cursor-pointer hover:border-copper transition-colors h-full">
            <CardBody className="p-6 text-center">
              <div className="text-3xl mb-2">🧾</div>
              <div className="font-semibold text-text-primary">ინვოისები</div>
            </CardBody>
          </Card>
        </Link>
        <Link href="/finances/reports">
          <Card className="cursor-pointer hover:border-copper transition-colors h-full">
            <CardBody className="p-6 text-center">
              <div className="text-3xl mb-2">📊</div>
              <div className="font-semibold text-text-primary">ანგარიშები</div>
            </CardBody>
          </Card>
        </Link>
      </div>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        onSubmit={(data) => {
          console.log('New transaction:', data)
          setIsTransactionModalOpen(false)
        }}
      />
      </div>
    </DashboardLayout>
  )
}

