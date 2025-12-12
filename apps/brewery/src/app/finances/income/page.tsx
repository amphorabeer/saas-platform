'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui'
import { StatCard } from '@/components/reports/StatCard'
import { DonutChart } from '@/components/reports/DonutChart'
import { TransactionModal } from '@/components/finances/TransactionModal'
import { mockTransactions } from '@/data/financeData'
import { formatDate, formatCurrency } from '@/lib/utils'

export default function IncomePage() {
  const [period, setPeriod] = useState('ამ თვე')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [customerFilter, setCustomerFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false)

  // Filter transactions
  const incomeTransactions = mockTransactions.filter(t => t.type === 'income')
  const filteredTransactions = incomeTransactions.filter(t => {
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false
    if (customerFilter !== 'all' && t.customerId !== customerFilter) return false
    return true
  })

  // Calculate statistics
  const totalIncome = filteredTransactions.reduce((sum, t) => sum + t.amount, 0)
  const paidIncome = filteredTransactions.filter(t => t.paymentMethod).reduce((sum, t) => sum + t.amount, 0)
  const pendingIncome = totalIncome - paidIncome
  const avgOrder = filteredTransactions.length > 0 ? totalIncome / filteredTransactions.length : 0

  // Income by source
  const incomeBySource = {
    sale_keg: filteredTransactions.filter(t => t.category === 'sale' && t.description.includes('კეგი')).reduce((sum, t) => sum + t.amount, 0),
    sale_bottle: filteredTransactions.filter(t => t.category === 'sale' && t.description.includes('ბოთლი')).reduce((sum, t) => sum + t.amount, 0),
    sale_can: filteredTransactions.filter(t => t.category === 'sale' && t.description.includes('ქილა')).reduce((sum, t) => sum + t.amount, 0),
    deposit: filteredTransactions.filter(t => t.category === 'deposit').reduce((sum, t) => sum + t.amount, 0),
    other: filteredTransactions.filter(t => t.category === 'other').reduce((sum, t) => sum + t.amount, 0),
  }

  const totalBySource = Object.values(incomeBySource).reduce((sum, val) => sum + val, 0)
  const sourceData = [
    { label: 'გაყიდვები (კეგი)', value: incomeBySource.sale_keg, color: '#B87333' },
    { label: 'გაყიდვები (ბოთლი)', value: incomeBySource.sale_bottle, color: '#3B82F6' },
    { label: 'გაყიდვები (ქილა)', value: incomeBySource.sale_can, color: '#8B5CF6' },
    { label: 'დეპოზიტები', value: incomeBySource.deposit, color: '#10B981' },
    { label: 'სხვა', value: incomeBySource.other, color: '#6B7280' },
  ].filter(item => item.value > 0)

  const getStatusBadge = (transaction: typeof filteredTransactions[0]) => {
    if (transaction.paymentMethod) {
      return 'bg-green-400/20 text-green-400'
    }
    return 'bg-gray-400/20 text-gray-400'
  }

  const uniqueCustomers = Array.from(new Set(incomeTransactions.map(t => t.customerId).filter(Boolean)))

  return (
    <DashboardLayout title="💰 შემოსავლები" breadcrumb="მთავარი / ფინანსები / შემოსავლები">
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
          <Button onClick={() => setIsTransactionModalOpen(true)}>+ შემოსავალი</Button>
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
          <option value="sale">გაყიდვა</option>
          <option value="deposit">დეპოზიტი</option>
          <option value="refund">დაბრუნება</option>
          <option value="other">სხვა</option>
        </select>
        <select
          value={customerFilter}
          onChange={(e) => setCustomerFilter(e.target.value)}
          className="px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
        >
          <option value="all">ყველა კლიენტი</option>
          {uniqueCustomers.map(customerId => {
            const customer = incomeTransactions.find(t => t.customerId === customerId)
            return customer ? (
              <option key={customerId} value={customerId}>{customer.customerName}</option>
            ) : null
          })}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
        >
          <option value="all">ყველა სტატუსი</option>
          <option value="paid">გადახდილი</option>
          <option value="pending">მოლოდინში</option>
        </select>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="სულ შემოსავალი"
          value={formatCurrency(totalIncome)}
          icon="💰"
          color="green"
        />
        <StatCard
          title="მიღებული"
          value={formatCurrency(paidIncome)}
          icon="✅"
          color="green"
        />
        <StatCard
          title="მოსაღები"
          value={formatCurrency(pendingIncome)}
          icon="⏳"
          color="amber"
        />
        <StatCard
          title="საშუალო შეკვეთა"
          value={formatCurrency(avgOrder)}
          icon="📊"
          color="blue"
        />
      </div>

      {/* Income by Source Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-text-primary">შემოსავლები წყაროს მიხედვით</h3>
          </CardHeader>
          <CardBody>
            <DonutChart
              data={sourceData}
              size={200}
              thickness={30}
              centerText={`${formatCurrency(totalBySource)}`}
            />
            <div className="mt-4 space-y-2">
              {sourceData.map((item, index) => {
                const percentage = totalBySource > 0 ? Math.round((item.value / totalBySource) * 100) : 0
                return (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-text-primary">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-text-muted">{percentage}%</span>
                      <span className="font-semibold text-text-primary">{formatCurrency(item.value)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardBody>
        </Card>

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-text-primary">შემოსავლების ცხრილი</h3>
          </CardHeader>
          <CardBody>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">#</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">თარიღი</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">აღწერა</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">კლიენტი</th>
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
                      <td className="py-3 px-4 text-text-primary">{transaction.customerName || '-'}</td>
                      <td className="py-3 px-4 text-text-primary">
                        {transaction.category === 'sale' ? 'გაყიდვა' :
                         transaction.category === 'deposit' ? 'დეპოზიტი' :
                         transaction.category === 'refund' ? 'დაბრუნება' : 'სხვა'}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-green-400">{formatCurrency(transaction.amount)}</td>
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
      </div>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        onSubmit={(data) => {
          console.log('New income transaction:', data)
          setIsTransactionModalOpen(false)
        }}
      />
      </div>
    </DashboardLayout>
  )
}

