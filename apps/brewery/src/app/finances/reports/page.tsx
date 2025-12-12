'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui'
import { mockMonthlyFinancials } from '@/data/financeData'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function FinancialReportsPage() {
  const [period, setPeriod] = useState('თვე')
  const [selectedMonth, setSelectedMonth] = useState(mockMonthlyFinancials.length - 1)

  const currentMonthData = mockMonthlyFinancials[selectedMonth]
  const previousMonthData = selectedMonth > 0 ? mockMonthlyFinancials[selectedMonth - 1] : null

  // Calculate P&L
  const incomeBreakdown = {
    sale_keg: 81510,
    sale_bottle: 31350,
    sale_can: 6270,
    deposit: 3760,
    other: 2510,
  }
  const totalIncome = Object.values(incomeBreakdown).reduce((sum, val) => sum + val, 0)

  const expenseBreakdown = currentMonthData.expensesByCategory
  const totalExpenses = Object.values(expenseBreakdown).reduce((sum, val) => sum + val, 0)
  const netProfit = totalIncome - totalExpenses
  const profitMargin = totalIncome > 0 ? Math.round((netProfit / totalIncome) * 100 * 10) / 10 : 0

  // Cash Flow
  const startingBalance = 45200
  const cashInflows = {
    sales: 113100,
    other: 2510,
  }
  const totalInflows = Object.values(cashInflows).reduce((sum, val) => sum + val, 0)

  const cashOutflows = {
    suppliers: 45600,
    salary: 18000,
    rent: 8000,
    utilities: 4200,
    other: 4500,
  }
  const totalOutflows = Object.values(cashOutflows).reduce((sum, val) => sum + val, 0)
  const endingBalance = startingBalance + totalInflows - totalOutflows
  const cashChange = endingBalance - startingBalance

  // Month comparison
  const months = ['ოქტომბერი', 'ნოემბერი', 'დეკემბერი']
  const comparisonData = mockMonthlyFinancials.slice(-3).map((data, index) => ({
    month: months[index],
    income: data.income,
    expenses: data.expenses,
    profit: data.profit,
    margin: data.income > 0 ? Math.round((data.profit / data.income) * 100 * 10) / 10 : 0,
  }))

  const lastMonth = comparisonData[comparisonData.length - 1]
  const secondLastMonth = comparisonData[comparisonData.length - 2]
  const incomeChange = secondLastMonth ? Math.round(((lastMonth.income - secondLastMonth.income) / secondLastMonth.income) * 100) : 0
  const expensesChange = secondLastMonth ? Math.round(((lastMonth.expenses - secondLastMonth.expenses) / secondLastMonth.expenses) * 100) : 0
  const profitChange = secondLastMonth ? Math.round(((lastMonth.profit - secondLastMonth.profit) / secondLastMonth.profit) * 100) : 0
  const marginChange = secondLastMonth ? (lastMonth.margin - secondLastMonth.margin) : 0

  return (
    <DashboardLayout title="📊 ფინანსური ანგარიშები" breadcrumb="მთავარი / ფინანსები / ანგარიშები">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
          >
            <option>თვე</option>
            <option>კვარტალი</option>
            <option>წელი</option>
          </select>
          {period === 'თვე' && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
            >
              {mockMonthlyFinancials.map((data, index) => (
                <option key={index} value={index}>{data.month} {data.year}</option>
              ))}
            </select>
          )}
          <Button variant="secondary" onClick={() => console.log('Export PDF')}>📄 PDF</Button>
          <Button variant="secondary" onClick={() => console.log('Export Excel')}>📊 Excel</Button>
        </div>
      </div>

      {/* P&L Statement */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-text-primary">
            📈 მოგება და ზარალი - {currentMonthData.month} {currentMonthData.year}
          </h3>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            {/* Income Section */}
            <div>
              <h4 className="font-semibold text-text-primary mb-3">შემოსავლები</h4>
              <div className="space-y-2 pl-4">
                <div className="flex justify-between text-text-primary">
                  <span>გაყიდვები (კეგი)</span>
                  <span className="font-medium">{formatCurrency(incomeBreakdown.sale_keg)}</span>
                </div>
                <div className="flex justify-between text-text-primary">
                  <span>გაყიდვები (ბოთლი)</span>
                  <span className="font-medium">{formatCurrency(incomeBreakdown.sale_bottle)}</span>
                </div>
                <div className="flex justify-between text-text-primary">
                  <span>გაყიდვები (ქილა)</span>
                  <span className="font-medium">{formatCurrency(incomeBreakdown.sale_can)}</span>
                </div>
                <div className="flex justify-between text-text-primary">
                  <span>დეპოზიტები</span>
                  <span className="font-medium">{formatCurrency(incomeBreakdown.deposit)}</span>
                </div>
                <div className="flex justify-between text-text-primary">
                  <span>სხვა შემოსავალი</span>
                  <span className="font-medium">{formatCurrency(incomeBreakdown.other)}</span>
                </div>
                <div className="border-t border-border pt-2 mt-2">
                  <div className="flex justify-between text-lg font-bold text-text-primary">
                    <span>სულ შემოსავალი</span>
                    <span>{formatCurrency(totalIncome)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Expenses Section */}
            <div>
              <h4 className="font-semibold text-text-primary mb-3">ხარჯები</h4>
              <div className="space-y-2 pl-4">
                <div className="flex justify-between text-text-primary">
                  <span>ინგრედიენტები</span>
                  <span className="font-medium">{formatCurrency(expenseBreakdown.ingredients)}</span>
                </div>
                <div className="flex justify-between text-text-primary">
                  <span>შეფუთვა</span>
                  <span className="font-medium">{formatCurrency(expenseBreakdown.packaging)}</span>
                </div>
                <div className="flex justify-between text-text-primary">
                  <span>ხელფასი</span>
                  <span className="font-medium">{formatCurrency(expenseBreakdown.salary)}</span>
                </div>
                <div className="flex justify-between text-text-primary">
                  <span>იჯარა</span>
                  <span className="font-medium">{formatCurrency(expenseBreakdown.rent)}</span>
                </div>
                <div className="flex justify-between text-text-primary">
                  <span>კომუნალური</span>
                  <span className="font-medium">{formatCurrency(expenseBreakdown.utilities)}</span>
                </div>
                <div className="flex justify-between text-text-primary">
                  <span>აღჭურვილობა</span>
                  <span className="font-medium">{formatCurrency(expenseBreakdown.equipment)}</span>
                </div>
                <div className="flex justify-between text-text-primary">
                  <span>სხვა ხარჯები</span>
                  <span className="font-medium">{formatCurrency(expenseBreakdown.other)}</span>
                </div>
                <div className="border-t border-border pt-2 mt-2">
                  <div className="flex justify-between text-lg font-bold text-text-primary">
                    <span>სულ ხარჯები</span>
                    <span>{formatCurrency(totalExpenses)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Net Profit */}
            <div className="border-t-2 border-border pt-4 mt-4">
              <div className="flex justify-between text-2xl font-bold text-emerald-400">
                <span>წმინდა მოგება</span>
                <span>{formatCurrency(netProfit)}</span>
              </div>
              <div className="flex justify-between text-text-muted mt-2">
                <span>მოგების მარჟა</span>
                <span className="font-medium">{profitMargin}%</span>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Cash Flow */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-text-primary">
            💰 ფულადი ნაკადები - {currentMonthData.month} {currentMonthData.year}
          </h3>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <div className="flex justify-between text-text-primary">
              <span>საწყისი ბალანსი:</span>
              <span className="font-medium">{formatCurrency(startingBalance)}</span>
            </div>

            <div>
              <div className="font-semibold text-text-primary mb-2">(+) შემოსულობები:</div>
              <div className="pl-4 space-y-1">
                <div className="flex justify-between text-text-primary">
                  <span>გაყიდვებიდან</span>
                  <span className="font-medium">{formatCurrency(cashInflows.sales)}</span>
                </div>
                <div className="flex justify-between text-text-primary">
                  <span>სხვა</span>
                  <span className="font-medium">{formatCurrency(cashInflows.other)}</span>
                </div>
                <div className="border-t border-border pt-1 mt-1">
                  <div className="flex justify-between text-text-primary font-medium">
                    <span>სულ შემოსულობები</span>
                    <span>{formatCurrency(totalInflows)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="font-semibold text-text-primary mb-2">(-) გასავლები:</div>
              <div className="pl-4 space-y-1">
                <div className="flex justify-between text-text-primary">
                  <span>მომწოდებლებს</span>
                  <span className="font-medium">{formatCurrency(cashOutflows.suppliers)}</span>
                </div>
                <div className="flex justify-between text-text-primary">
                  <span>ხელფასი</span>
                  <span className="font-medium">{formatCurrency(cashOutflows.salary)}</span>
                </div>
                <div className="flex justify-between text-text-primary">
                  <span>იჯარა</span>
                  <span className="font-medium">{formatCurrency(cashOutflows.rent)}</span>
                </div>
                <div className="flex justify-between text-text-primary">
                  <span>კომუნალური</span>
                  <span className="font-medium">{formatCurrency(cashOutflows.utilities)}</span>
                </div>
                <div className="flex justify-between text-text-primary">
                  <span>სხვა</span>
                  <span className="font-medium">{formatCurrency(cashOutflows.other)}</span>
                </div>
                <div className="border-t border-border pt-1 mt-1">
                  <div className="flex justify-between text-text-primary font-medium">
                    <span>სულ გასავლები</span>
                    <span>{formatCurrency(totalOutflows)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t-2 border-border pt-4 mt-4">
              <div className="flex justify-between text-xl font-bold text-text-primary">
                <span>საბოლოო ბალანსი:</span>
                <span>{formatCurrency(endingBalance)}</span>
              </div>
              <div className="flex justify-between text-text-muted mt-2">
                <span>ცვლილება:</span>
                <span className={`font-medium ${cashChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {cashChange >= 0 ? '+' : ''}{formatCurrency(cashChange)}
                </span>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Month Comparison */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-text-primary">თვის შედარება</h3>
        </CardHeader>
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">მაჩვენებელი</th>
                  {comparisonData.map((data, index) => (
                    <th key={index} className="text-right py-3 px-4 text-sm font-semibold text-text-primary">
                      {data.month}
                    </th>
                  ))}
                  <th className="text-right py-3 px-4 text-sm font-semibold text-text-primary">ცვლილება</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <td className="py-3 px-4 text-text-primary">შემოსავალი</td>
                  {comparisonData.map((data, index) => (
                    <td key={index} className="py-3 px-4 text-right text-text-primary">
                      {formatCurrency(data.income)}
                    </td>
                  ))}
                  <td className={`py-3 px-4 text-right font-semibold ${
                    incomeChange > 0 ? 'text-green-400' : incomeChange < 0 ? 'text-red-400' : 'text-text-primary'
                  }`}>
                    {incomeChange > 0 ? '↑' : incomeChange < 0 ? '↓' : ''} {Math.abs(incomeChange)}%
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 px-4 text-text-primary">ხარჯები</td>
                  {comparisonData.map((data, index) => (
                    <td key={index} className="py-3 px-4 text-right text-text-primary">
                      {formatCurrency(data.expenses)}
                    </td>
                  ))}
                  <td className={`py-3 px-4 text-right font-semibold ${
                    expensesChange > 0 ? 'text-red-400' : expensesChange < 0 ? 'text-green-400' : 'text-text-primary'
                  }`}>
                    {expensesChange > 0 ? '↑' : expensesChange < 0 ? '↓' : ''} {Math.abs(expensesChange)}%
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 px-4 text-text-primary">მოგება</td>
                  {comparisonData.map((data, index) => (
                    <td key={index} className="py-3 px-4 text-right text-text-primary">
                      {formatCurrency(data.profit)}
                    </td>
                  ))}
                  <td className={`py-3 px-4 text-right font-semibold ${
                    profitChange > 0 ? 'text-green-400' : profitChange < 0 ? 'text-red-400' : 'text-text-primary'
                  }`}>
                    {profitChange > 0 ? '↑' : profitChange < 0 ? '↓' : ''} {Math.abs(profitChange)}%
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-text-primary">მარჟა</td>
                  {comparisonData.map((data, index) => (
                    <td key={index} className="py-3 px-4 text-right text-text-primary">
                      {data.margin}%
                    </td>
                  ))}
                  <td className={`py-3 px-4 text-right font-semibold ${
                    marginChange > 0 ? 'text-green-400' : marginChange < 0 ? 'text-red-400' : 'text-text-primary'
                  }`}>
                    {marginChange > 0 ? '↑' : marginChange < 0 ? '↓' : ''} {Math.abs(marginChange).toFixed(1)}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
      </div>
    </DashboardLayout>
  )
}

