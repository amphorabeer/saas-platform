'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import type { TenantBrand } from '@/lib/tenant-brand'
import { escHtml, tenantFooterLine, tenantBrandFromApiJson } from '@/lib/tenant-brand'

interface MonthlyStats {
  month: string
  year: number
  income: number
  expenses: number
  profit: number
  margin: number
  expensesByCategory: Record<string, number>
  incomeBySource: Record<string, number>
  transactionCount: number
}

interface DashboardStats {
  totalIncome: number
  totalExpenses: number
  netProfit: number
  profitMargin: number
  pendingPayments: number
  overdueInvoices: number
}

const expenseCategoryLabels: Record<string, string> = {
  INGREDIENTS: 'ინგრედიენტები',
  PACKAGING: 'შეფუთვა',
  UTILITIES: 'კომუნალური',
  RENT: 'იჯარა',
  SALARY: 'ხელფასი',
  EQUIPMENT: 'აღჭურვილობა',
  MAINTENANCE: 'მოვლა-შენახვა',
  MARKETING: 'მარკეტინგი',
  TRANSPORT: 'ტრანსპორტი',
  TAXES: 'გადასახადები',
  INSURANCE: 'დაზღვევა',
  OTHER: 'სხვა',
}

const incomeSourceLabels: Record<string, string> = {
  KEG_50: 'კეგი 50L',
  KEG_30: 'კეგი 30L',
  KEG_20: 'კეგი 20L',
  BOTTLE_750: 'ბოთლი 750ml',
  BOTTLE_500: 'ბოთლი 500ml',
  BOTTLE_330: 'ბოთლი 330ml',
  CAN_500: 'ქილა 500ml',
  CAN_330: 'ქილა 330ml',
  OTHER: 'სხვა',
}

export default function FinancialReportsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([])
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(0)
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month')
  const [tenantCompany, setTenantCompany] = useState<TenantBrand | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch monthly stats
      const monthlyRes = await fetch('/api/finances/monthly-stats?months=12')
      if (!monthlyRes.ok) throw new Error('Failed to fetch monthly stats')
      const monthlyData = await monthlyRes.json()
      
      const stats = monthlyData.stats || monthlyData.monthlyStats || []
      setMonthlyStats(stats)
      
      // Set selected month to most recent
      if (stats.length > 0) {
        setSelectedMonthIndex(stats.length - 1)
      }

      // Fetch dashboard stats for current period
      const dashboardRes = await fetch('/api/finances/dashboard')
      if (dashboardRes.ok) {
        const dashboardData = await dashboardRes.json()
        setDashboardStats({
          totalIncome: dashboardData.summary?.totalIncome || 0,
          totalExpenses: dashboardData.summary?.totalExpenses || 0,
          netProfit: dashboardData.summary?.profit || 0,
          profitMargin: dashboardData.summary?.profitMargin || 0,
          pendingPayments: dashboardData.receivables?.pending || 0,
          overdueInvoices: dashboardData.overdueInvoices?.length || 0,
        })
      }

    } catch (err) {
      console.error('Reports fetch error:', err)
      setError('მონაცემების ჩატვირთვა ვერ მოხერხდა')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch('/api/tenant')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.tenant) setTenantCompany(tenantBrandFromApiJson(data.tenant))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Selected month data
  const currentMonth = monthlyStats[selectedMonthIndex] || null
  const previousMonth = selectedMonthIndex > 0 ? monthlyStats[selectedMonthIndex - 1] : null

  // Calculate totals for selected month
  const totalIncome = currentMonth?.income || 0
  const totalExpenses = currentMonth?.expenses || 0
  const netProfit = currentMonth?.profit || 0
  const profitMargin = currentMonth?.margin || 0

  // Get last 3 months for comparison
  const comparisonMonths = monthlyStats.slice(-3)

  // Calculate changes
  const getChange = (current: number, previous: number): number => {
    if (!previous || previous === 0) return 0
    return Math.round(((current - previous) / previous) * 100)
  }

  const lastMonth = comparisonMonths[comparisonMonths.length - 1]
  const secondLastMonth = comparisonMonths[comparisonMonths.length - 2]
  
  const incomeChange = secondLastMonth ? getChange(lastMonth?.income || 0, secondLastMonth?.income || 0) : 0
  const expensesChange = secondLastMonth ? getChange(lastMonth?.expenses || 0, secondLastMonth?.expenses || 0) : 0
  const profitChange = secondLastMonth ? getChange(lastMonth?.profit || 0, secondLastMonth?.profit || 0) : 0
  const marginChange = secondLastMonth ? ((lastMonth?.margin || 0) - (secondLastMonth?.margin || 0)) : 0

  // Cash flow calculations (simplified)
  const startingBalance = dashboardStats?.totalIncome ? dashboardStats.totalIncome * 0.3 : 0
  const cashInflows = totalIncome
  const cashOutflows = totalExpenses
  const endingBalance = startingBalance + cashInflows - cashOutflows
  const cashChange = cashInflows - cashOutflows

  // Export handlers
  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank')
    if (printWindow && currentMonth) {
      printWindow.document.write(generateReportHTML())
      printWindow.document.close()
      printWindow.print()
    }
  }

  const handleExportExcel = () => {
    if (!currentMonth) return
    
    // Generate CSV
    const headers = ['კატეგორია', 'თანხა']
    const incomeRows = Object.entries(currentMonth.incomeBySource || {}).map(([key, value]) => 
      [incomeSourceLabels[key] || key, String(value)]
    )
    const expenseRows = Object.entries(currentMonth.expensesByCategory || {}).map(([key, value]) => 
      [expenseCategoryLabels[key] || key, String(value)]
    )
    
    let csv = 'შემოსავლები\n'
    csv += headers.join(',') + '\n'
    csv += incomeRows.map(row => row.join(',')).join('\n')
    csv += '\n\nხარჯები\n'
    csv += headers.join(',') + '\n'
    csv += expenseRows.map(row => row.join(',')).join('\n')
    csv += `\n\nსულ შემოსავალი,${totalIncome}`
    csv += `\nსულ ხარჯები,${totalExpenses}`
    csv += `\nწმინდა მოგება,${netProfit}`
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `financial-report-${currentMonth.month}-${currentMonth.year}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const generateReportHTML = () => {
    if (!currentMonth) return ''
    const co = tenantCompany
    const companyTitle = co ? escHtml(co.displayName) : '—'
    const footerLine = co ? escHtml(tenantFooterLine(co)) : '—'

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>ფინანსური ანგარიში - ${currentMonth.month} ${currentMonth.year}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          h1 { color: #B87333; }
          h2 { color: #333; border-bottom: 2px solid #B87333; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #eee; }
          th { background: #f5f5f5; }
          .total { font-weight: bold; background: #f9f9f9; }
          .profit { color: #27ae60; font-size: 24px; }
          .loss { color: #e74c3c; font-size: 24px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <h1>${companyTitle}</h1>
        <h2>📊 ფინანსური ანგარიში - ${currentMonth.month} ${currentMonth.year}</h2>
        
        <h3>შემოსავლები</h3>
        <table>
          <tr><th>წყარო</th><th style="text-align:right">თანხა</th></tr>
          ${Object.entries(currentMonth.incomeBySource || {}).map(([key, value]) => `
            <tr>
              <td>${incomeSourceLabels[key] || key}</td>
              <td style="text-align:right">${Number(value).toFixed(2)} ₾</td>
            </tr>
          `).join('')}
          <tr class="total">
            <td>სულ შემოსავალი</td>
            <td style="text-align:right">${totalIncome.toFixed(2)} ₾</td>
          </tr>
        </table>

        <h3>ხარჯები</h3>
        <table>
          <tr><th>კატეგორია</th><th style="text-align:right">თანხა</th></tr>
          ${Object.entries(currentMonth.expensesByCategory || {}).map(([key, value]) => `
            <tr>
              <td>${expenseCategoryLabels[key] || key}</td>
              <td style="text-align:right">${Number(value).toFixed(2)} ₾</td>
            </tr>
          `).join('')}
          <tr class="total">
            <td>სულ ხარჯები</td>
            <td style="text-align:right">${totalExpenses.toFixed(2)} ₾</td>
          </tr>
        </table>

        <h3>შედეგი</h3>
        <p class="${netProfit >= 0 ? 'profit' : 'loss'}">
          წმინდა მოგება: ${netProfit.toFixed(2)} ₾ (მარჟა: ${profitMargin.toFixed(1)}%)
        </p>

        <p style="color: #999; font-size: 12px; margin-top: 40px;">
          გენერირებული: ${new Date().toLocaleDateString('ka-GE')} • ${footerLine}
        </p>
      </body>
      </html>
    `
  }

  if (loading) {
    return (
      <DashboardLayout title="📊 ფინანსური ანგარიშები" breadcrumb="მთავარი / ფინანსები / ანგარიშები">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-copper"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout title="📊 ფინანსური ანგარიშები" breadcrumb="მთავარი / ფინანსები / ანგარიშები">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-red-400">{error}</p>
          <Button onClick={fetchData}>🔄 ხელახლა ცდა</Button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="📊 ფინანსური ანგარიშები" breadcrumb="მთავარი / ფინანსები / ანგარიშები">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Link href="/finances">
              <Button variant="ghost" size="sm">← უკან</Button>
            </Link>
            
            {monthlyStats.length > 0 && (
              <select
                value={selectedMonthIndex}
                onChange={(e) => setSelectedMonthIndex(parseInt(e.target.value))}
                className="px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
              >
                {monthlyStats.map((data, index) => (
                  <option key={index} value={index}>
                    {data.month} {data.year}
                  </option>
                ))}
              </select>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={handleExportPDF} disabled={!currentMonth}>
              📄 PDF
            </Button>
            <Button variant="secondary" onClick={handleExportExcel} disabled={!currentMonth}>
              📊 Excel
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <div className="text-sm text-text-muted">შემოსავალი</div>
            <div className="text-2xl font-bold text-green-400">{formatCurrency(totalIncome)}</div>
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <div className="text-sm text-text-muted">ხარჯები</div>
            <div className="text-2xl font-bold text-red-400">{formatCurrency(totalExpenses)}</div>
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <div className="text-sm text-text-muted">მოგება</div>
            <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-copper' : 'text-red-400'}`}>
              {formatCurrency(netProfit)}
            </div>
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <div className="text-sm text-text-muted">მარჟა</div>
            <div className={`text-2xl font-bold ${profitMargin >= 20 ? 'text-green-400' : profitMargin >= 10 ? 'text-amber-400' : 'text-red-400'}`}>
              {profitMargin.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* P&L Statement */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-text-primary">
              📈 მოგება და ზარალი {currentMonth ? `- ${currentMonth.month} ${currentMonth.year}` : ''}
            </h3>
          </CardHeader>
          <CardBody>
            {!currentMonth ? (
              <p className="text-text-muted text-center py-8">მონაცემები არ არის</p>
            ) : (
              <div className="grid md:grid-cols-2 gap-8">
                {/* Income */}
                <div>
                  <h4 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
                    <span className="w-3 h-3 bg-green-400 rounded-full"></span>
                    შემოსავლები
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(currentMonth.incomeBySource || {}).length > 0 ? (
                      Object.entries(currentMonth.incomeBySource)
                        .sort(([,a], [,b]) => Number(b) - Number(a))
                        .map(([key, value]) => (
                          <div key={key} className="flex justify-between text-text-primary">
                            <span>{incomeSourceLabels[key] || key}</span>
                            <span className="font-medium">{formatCurrency(Number(value))}</span>
                          </div>
                        ))
                    ) : (
                      <p className="text-text-muted text-sm">შემოსავლები არ არის</p>
                    )}
                    <div className="border-t border-border pt-2 mt-3">
                      <div className="flex justify-between text-lg font-bold text-green-400">
                        <span>სულ</span>
                        <span>{formatCurrency(totalIncome)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expenses */}
                <div>
                  <h4 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
                    <span className="w-3 h-3 bg-red-400 rounded-full"></span>
                    ხარჯები
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(currentMonth.expensesByCategory || {}).length > 0 ? (
                      Object.entries(currentMonth.expensesByCategory)
                        .sort(([,a], [,b]) => Number(b) - Number(a))
                        .map(([key, value]) => (
                          <div key={key} className="flex justify-between text-text-primary">
                            <span>{expenseCategoryLabels[key] || key}</span>
                            <span className="font-medium">{formatCurrency(Number(value))}</span>
                          </div>
                        ))
                    ) : (
                      <p className="text-text-muted text-sm">ხარჯები არ არის</p>
                    )}
                    <div className="border-t border-border pt-2 mt-3">
                      <div className="flex justify-between text-lg font-bold text-red-400">
                        <span>სულ</span>
                        <span>{formatCurrency(totalExpenses)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Net Result */}
            {currentMonth && (
              <div className="mt-6 pt-6 border-t-2 border-border">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xl font-bold text-text-primary">წმინდა მოგება</span>
                    <span className="text-text-muted ml-2">(მარჟა: {profitMargin.toFixed(1)}%)</span>
                  </div>
                  <span className={`text-3xl font-bold ${netProfit >= 0 ? 'text-copper' : 'text-red-400'}`}>
                    {formatCurrency(netProfit)}
                  </span>
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Cash Flow */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-text-primary">
              💰 ფულადი ნაკადები {currentMonth ? `- ${currentMonth.month} ${currentMonth.year}` : ''}
            </h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-bg-tertiary rounded-lg">
                  <div className="text-sm text-text-muted mb-1">შემოსულობები</div>
                  <div className="text-xl font-bold text-green-400">+{formatCurrency(cashInflows)}</div>
                </div>
                <div className="p-4 bg-bg-tertiary rounded-lg">
                  <div className="text-sm text-text-muted mb-1">გასავლები</div>
                  <div className="text-xl font-bold text-red-400">-{formatCurrency(cashOutflows)}</div>
                </div>
                <div className="p-4 bg-bg-tertiary rounded-lg">
                  <div className="text-sm text-text-muted mb-1">ცვლილება</div>
                  <div className={`text-xl font-bold ${cashChange >= 0 ? 'text-copper' : 'text-red-400'}`}>
                    {cashChange >= 0 ? '+' : ''}{formatCurrency(cashChange)}
                  </div>
                </div>
              </div>

              {/* Visual Bar */}
              <div className="h-8 bg-bg-tertiary rounded-lg overflow-hidden flex">
                {totalIncome > 0 && totalExpenses > 0 && (
                  <>
                    <div 
                      className="bg-green-400/30 flex items-center justify-center text-xs text-green-400"
                      style={{ width: `${(cashInflows / (cashInflows + cashOutflows)) * 100}%` }}
                    >
                      შემოსავალი
                    </div>
                    <div 
                      className="bg-red-400/30 flex items-center justify-center text-xs text-red-400"
                      style={{ width: `${(cashOutflows / (cashInflows + cashOutflows)) * 100}%` }}
                    >
                      ხარჯი
                    </div>
                  </>
                )}
                {totalIncome === 0 && totalExpenses === 0 && (
                  <div className="w-full flex items-center justify-center text-xs text-text-muted">
                    მონაცემები არ არის
                  </div>
                )}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Month Comparison */}
        {comparisonMonths.length > 1 && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-text-primary">📅 თვის შედარება</h3>
            </CardHeader>
            <CardBody>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">მაჩვენებელი</th>
                      {comparisonMonths.map((data, index) => (
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
                      {comparisonMonths.map((data, index) => (
                        <td key={index} className="py-3 px-4 text-right text-text-primary">
                          {formatCurrency(data.income)}
                        </td>
                      ))}
                      <td className={`py-3 px-4 text-right font-semibold ${
                        incomeChange > 0 ? 'text-green-400' : incomeChange < 0 ? 'text-red-400' : 'text-text-primary'
                      }`}>
                        {incomeChange > 0 ? '↑' : incomeChange < 0 ? '↓' : '='} {Math.abs(incomeChange)}%
                      </td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="py-3 px-4 text-text-primary">ხარჯები</td>
                      {comparisonMonths.map((data, index) => (
                        <td key={index} className="py-3 px-4 text-right text-text-primary">
                          {formatCurrency(data.expenses)}
                        </td>
                      ))}
                      <td className={`py-3 px-4 text-right font-semibold ${
                        expensesChange > 0 ? 'text-red-400' : expensesChange < 0 ? 'text-green-400' : 'text-text-primary'
                      }`}>
                        {expensesChange > 0 ? '↑' : expensesChange < 0 ? '↓' : '='} {Math.abs(expensesChange)}%
                      </td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="py-3 px-4 text-text-primary font-semibold">მოგება</td>
                      {comparisonMonths.map((data, index) => (
                        <td key={index} className={`py-3 px-4 text-right font-semibold ${
                          data.profit >= 0 ? 'text-copper' : 'text-red-400'
                        }`}>
                          {formatCurrency(data.profit)}
                        </td>
                      ))}
                      <td className={`py-3 px-4 text-right font-bold ${
                        profitChange > 0 ? 'text-green-400' : profitChange < 0 ? 'text-red-400' : 'text-text-primary'
                      }`}>
                        {profitChange > 0 ? '↑' : profitChange < 0 ? '↓' : '='} {Math.abs(profitChange)}%
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 text-text-primary">მარჟა</td>
                      {comparisonMonths.map((data, index) => (
                        <td key={index} className="py-3 px-4 text-right text-text-primary">
                          {data.margin.toFixed(1)}%
                        </td>
                      ))}
                      <td className={`py-3 px-4 text-right font-semibold ${
                        marginChange > 0 ? 'text-green-400' : marginChange < 0 ? 'text-red-400' : 'text-text-primary'
                      }`}>
                        {marginChange > 0 ? '↑' : marginChange < 0 ? '↓' : '='} {Math.abs(marginChange).toFixed(1)}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Empty State */}
        {monthlyStats.length === 0 && (
          <Card>
            <CardBody>
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-xl font-semibold text-text-primary mb-2">მონაცემები არ არის</h3>
                <p className="text-text-muted mb-6">
                  ფინანსური ანგარიშების სანახავად საჭიროა ტრანზაქციების დამატება
                </p>
                <div className="flex justify-center gap-3">
                  <Link href="/finances/expenses">
                    <Button variant="secondary">📤 ხარჯების დამატება</Button>
                  </Link>
                  <Link href="/sales/orders">
                    <Button>📦 შეკვეთები</Button>
                  </Link>
                </div>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
