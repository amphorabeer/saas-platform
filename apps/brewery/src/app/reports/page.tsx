'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui'
import { StatCard, BarChart, LineChart, DonutChart } from '@/components/reports'
import { formatCurrency } from '@/lib/utils'

interface DashboardStats {
  // Production
  totalProduction: number
  batchesCount: number
  avgBatchSize: number
  activeBatches: number
  
  // Sales
  totalRevenue: number
  ordersCount: number
  avgOrderValue: number
  customersCount: number
  
  // Inventory
  totalItems: number
  lowStockItems: number
  inventoryValue: number
  
  // Finance
  totalIncome: number
  totalExpenses: number
  netProfit: number
  profitMargin: number
}

interface MonthlyData {
  month: string
  production: number
  sales: number
  expenses: number
}

interface CategoryData {
  label: string
  value: number
  color: string
}

const getLastMonths = (count: number) => {
  const months = []
  const now = new Date()
  
  for (let i = 0; i < count; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      month: date.getMonth() + 1,
      year: date.getFullYear(),
      label: date.toLocaleDateString('ka-GE', { month: 'short' })
    })
  }
  
  return months.reverse()
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [salesByProduct, setSalesByProduct] = useState<CategoryData[]>([])
  const [expensesByCategory, setExpensesByCategory] = useState<CategoryData[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState('year')

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)

      // Fetch production stats
      const productionRes = await fetch('/api/batches?limit=100')
      let batchesData: any[] = []
      if (productionRes.ok) {
        const data = await productionRes.json()
        batchesData = data.batches || []
      }

      // Fetch sales stats
      const salesRes = await fetch('/api/orders?limit=100')
      let ordersData: any[] = []
      if (salesRes.ok) {
        const data = await salesRes.json()
        ordersData = data.orders || []
      }

      // Fetch customers
      const customersRes = await fetch('/api/customers')
      let customersCount = 0
      if (customersRes.ok) {
        const data = await customersRes.json()
        customersCount = data.customers?.length || 0
      }

      // Fetch inventory stats
      const inventoryRes = await fetch('/api/inventory')
      let inventoryData: any[] = []
      if (inventoryRes.ok) {
        const data = await inventoryRes.json()
        inventoryData = data.items || []
      }

      // Fetch finance stats
      const financeRes = await fetch('/api/finances/dashboard')
      let financeStats: any = {}
      if (financeRes.ok) {
        const data = await financeRes.json()
        financeStats = data.summary || {}
      }

      // Calculate stats
      const totalProduction = batchesData.reduce((sum, b) => sum + (Number(b.volume) || 0), 0)
      const activeBatches = batchesData.filter(b => {
        const status = (b.status || '').toUpperCase()
        return ['PLANNED', 'BREWING', 'FERMENTING', 'CONDITIONING'].includes(status)
      }).length
      const avgBatchSize = batchesData.length > 0 ? totalProduction / batchesData.length : 0

      const totalRevenue = ordersData.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0)
      const avgOrderValue = ordersData.length > 0 ? totalRevenue / ordersData.length : 0

      const lowStockItems = inventoryData.filter((item: any) => {
        const balance = Number(item.cachedBalance) || 0
        const reorderPoint = Number(item.reorderPoint) || 0
        return reorderPoint > 0 && balance <= reorderPoint
      }).length

      const inventoryValue = inventoryData.reduce((sum: number, item: any) => {
        const balance = Number(item.cachedBalance) || 0
        const cost = Number(item.costPerUnit) || 0
        return sum + (balance * cost)
      }, 0)

      setStats({
        totalProduction,
        batchesCount: batchesData.length,
        avgBatchSize,
        activeBatches,
        totalRevenue,
        ordersCount: ordersData.length,
        avgOrderValue,
        customersCount,
        totalItems: inventoryData.length,
        lowStockItems,
        inventoryValue,
        totalIncome: financeStats.totalIncome || 0,
        totalExpenses: financeStats.totalExpenses || 0,
        netProfit: financeStats.profit || 0,
        profitMargin: financeStats.profitMargin || 0,
      })

      // Monthly data for charts
      const months = getLastMonths(6)
      const monthlyChartData = months.map(m => ({
        month: m.label,
        production: Math.round(Math.random() * 2000 + 1000), // TODO: Real data
        sales: Math.round(Math.random() * 15000 + 5000), // TODO: Real data
        expenses: Math.round(Math.random() * 8000 + 3000), // TODO: Real data
      }))
      setMonthlyData(monthlyChartData)

      // Sales by product (from orders)
      const productSales: Record<string, number> = {}
      ordersData.forEach((order: any) => {
        order.items?.forEach((item: any) => {
          const name = item.productName || 'სხვა'
          productSales[name] = (productSales[name] || 0) + (Number(item.totalPrice) || 0)
        })
      })
      
      const colors = ['#B87333', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899']
      const salesData = Object.entries(productSales)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([label, value], i) => ({
          label,
          value,
          color: colors[i % colors.length]
        }))
      setSalesByProduct(salesData)

      // Expenses by category
      const expensesRes = await fetch('/api/finances/expenses?limit=100')
      if (expensesRes.ok) {
        const expensesData = await expensesRes.json()
        const categoryTotals: Record<string, number> = {}
        
        expensesData.expenses?.forEach((exp: any) => {
          const cat = exp.categoryName || exp.category || 'სხვა'
          categoryTotals[cat] = (categoryTotals[cat] || 0) + (Number(exp.amount) || 0)
        })
        
        const expenseCategoryData = Object.entries(categoryTotals)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([label, value], i) => ({
            label,
            value,
            color: ['#EF4444', '#F97316', '#F59E0B', '#84CC16', '#06B6D4'][i % 5]
          }))
        setExpensesByCategory(expenseCategoryData)
      }

    } catch (err) {
      console.error('Reports fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <DashboardLayout title="📈 რეპორტები" breadcrumb="მთავარი / რეპორტები">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-copper"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="📈 რეპორტები" breadcrumb="მთავარი / რეპორტები">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm">← უკან</Button>
            </Link>
            <h2 className="text-2xl font-bold text-text-primary">რეპორტები</h2>
          </div>
          
          <div className="flex items-center gap-2">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary text-sm"
            >
              <option value="month">ეს თვე</option>
              <option value="quarter">კვარტალი</option>
              <option value="year">წელი</option>
            </select>
            <Button variant="secondary" size="sm">📄 PDF</Button>
            <Button variant="secondary" size="sm">📊 Excel</Button>
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            title="წარმოება"
            value={`${stats?.totalProduction?.toLocaleString() || 0}L`}
            icon="🍺"
            subtitle={`${stats?.batchesCount || 0} პარტია`}
            color="copper"
          />
          <StatCard
            title="გაყიდვები"
            value={formatCurrency(stats?.totalRevenue || 0)}
            icon="💰"
            subtitle={`${stats?.ordersCount || 0} შეკვეთა`}
            color="green"
          />
          <StatCard
            title="მოგება"
            value={formatCurrency(stats?.netProfit || 0)}
            icon="📊"
            subtitle={`მარჟა: ${stats?.profitMargin?.toFixed(1) || 0}%`}
            variant={(stats?.netProfit || 0) >= 0 ? 'success' : 'danger'}
          />
          <StatCard
            title="მარაგი"
            value={stats?.totalItems || 0}
            icon="📦"
            subtitle={stats?.lowStockItems ? `${stats.lowStockItems} დაბალი` : 'OK'}
            variant={stats?.lowStockItems ? 'warning' : 'default'}
          />
        </div>

        {/* Quick Access Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link href="/reports/production">
            <div className="p-4 bg-bg-card border border-border rounded-xl hover:border-copper/50 transition-colors cursor-pointer">
              <div className="text-2xl mb-2">🏭</div>
              <div className="font-semibold text-text-primary">წარმოების ანგარიში</div>
              <div className="text-xs text-text-muted mt-1">პარტიები, ეფექტურობა</div>
            </div>
          </Link>
          <Link href="/reports/sales">
            <div className="p-4 bg-bg-card border border-border rounded-xl hover:border-copper/50 transition-colors cursor-pointer">
              <div className="text-2xl mb-2">📈</div>
              <div className="font-semibold text-text-primary">გაყიდვების ანგარიში</div>
              <div className="text-xs text-text-muted mt-1">შეკვეთები, კლიენტები</div>
            </div>
          </Link>
          <Link href="/reports/inventory">
            <div className="p-4 bg-bg-card border border-border rounded-xl hover:border-copper/50 transition-colors cursor-pointer">
              <div className="text-2xl mb-2">📦</div>
              <div className="font-semibold text-text-primary">მარაგების ანგარიში</div>
              <div className="text-xs text-text-muted mt-1">ინგრედიენტები, მოძრაობა</div>
            </div>
          </Link>
          <Link href="/finances/reports">
            <div className="p-4 bg-bg-card border border-border rounded-xl hover:border-copper/50 transition-colors cursor-pointer">
              <div className="text-2xl mb-2">💵</div>
              <div className="font-semibold text-text-primary">ფინანსური ანგარიში</div>
              <div className="text-xs text-text-muted mt-1">შემოსავალი, ხარჯები</div>
            </div>
          </Link>
        </div>

        {/* Charts Row */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Sales Trend */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-text-primary">📈 გაყიდვების ტრენდი</h3>
            </CardHeader>
            <CardBody>
              {monthlyData.length > 0 ? (
                <LineChart 
                  data={monthlyData.map(m => ({ label: m.month, value: m.sales }))} 
                  height={200}
                  fillArea={true}
                />
              ) : (
                <div className="h-48 flex items-center justify-center text-text-muted">
                  მონაცემები არ არის
                </div>
              )}
            </CardBody>
          </Card>

          {/* Production */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-text-primary">🍺 წარმოება (6 თვე)</h3>
            </CardHeader>
            <CardBody>
              {monthlyData.length > 0 ? (
                <BarChart 
                  data={monthlyData.map(m => ({ label: m.month, value: m.production }))} 
                  height={200}
                  formatValue={(v) => `${v}L`}
                />
              ) : (
                <div className="h-48 flex items-center justify-center text-text-muted">
                  მონაცემები არ არის
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Sales by Product */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-text-primary">🍻 გაყიდვები პროდუქტით</h3>
            </CardHeader>
            <CardBody>
              {salesByProduct.length > 0 ? (
                <DonutChart 
                  data={salesByProduct} 
                  size={160}
                  centerText={formatCurrency(salesByProduct.reduce((s, p) => s + p.value, 0))}
                  centerSubtext="სულ"
                />
              ) : (
                <div className="h-48 flex items-center justify-center text-text-muted">
                  მონაცემები არ არის
                </div>
              )}
            </CardBody>
          </Card>

          {/* Expenses by Category */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-text-primary">📉 ხარჯები კატეგორიით</h3>
            </CardHeader>
            <CardBody>
              {expensesByCategory.length > 0 ? (
                <DonutChart 
                  data={expensesByCategory} 
                  size={160}
                  centerText={formatCurrency(expensesByCategory.reduce((s, e) => s + e.value, 0))}
                  centerSubtext="სულ"
                />
              ) : (
                <div className="h-48 flex items-center justify-center text-text-muted">
                  მონაცემები არ არის
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Key Metrics Table */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-text-primary">📋 ძირითადი მეტრიკები</h3>
          </CardHeader>
          <CardBody>
            <div className="grid md:grid-cols-3 gap-6">
              {/* Production Metrics */}
              <div>
                <h4 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
                  <span>🏭</span> წარმოება
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">სულ წარმოებული</span>
                    <span className="text-text-primary font-medium">{stats?.totalProduction?.toLocaleString() || 0}L</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">პარტიების რაოდენობა</span>
                    <span className="text-text-primary font-medium">{stats?.batchesCount || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">საშუალო პარტია</span>
                    <span className="text-text-primary font-medium">{Math.round(stats?.avgBatchSize || 0)}L</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">აქტიური პარტიები</span>
                    <span className="text-amber-400 font-medium">{stats?.activeBatches || 0}</span>
                  </div>
                </div>
              </div>

              {/* Sales Metrics */}
              <div>
                <h4 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
                  <span>💰</span> გაყიდვები
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">სულ გაყიდვები</span>
                    <span className="text-green-400 font-medium">{formatCurrency(stats?.totalRevenue || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">შეკვეთები</span>
                    <span className="text-text-primary font-medium">{stats?.ordersCount || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">საშუალო შეკვეთა</span>
                    <span className="text-text-primary font-medium">{formatCurrency(stats?.avgOrderValue || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">კლიენტები</span>
                    <span className="text-text-primary font-medium">{stats?.customersCount || 0}</span>
                  </div>
                </div>
              </div>

              {/* Finance Metrics */}
              <div>
                <h4 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
                  <span>📊</span> ფინანსები
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">შემოსავალი</span>
                    <span className="text-green-400 font-medium">{formatCurrency(stats?.totalIncome || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">ხარჯები</span>
                    <span className="text-red-400 font-medium">{formatCurrency(stats?.totalExpenses || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">მოგება</span>
                    <span className={`font-medium ${(stats?.netProfit || 0) >= 0 ? 'text-copper' : 'text-red-400'}`}>
                      {formatCurrency(stats?.netProfit || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">მარჟა</span>
                    <span className="text-text-primary font-medium">{stats?.profitMargin?.toFixed(1) || 0}%</span>
                  </div>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </DashboardLayout>
  )
}
