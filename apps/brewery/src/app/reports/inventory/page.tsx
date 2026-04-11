'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui'
import { StatCard, BarChart, DonutChart } from '@/components/reports'
import { formatCurrency } from '@/lib/utils'

interface InventoryItem {
  id: string
  sku: string
  name: string
  category: string
  ingredientType?: string
  unit: string
  cachedBalance: number
  reorderPoint?: number | null
  costPerUnit?: number | null
  supplier?: string
  isActive?: boolean
}

interface CategoryData {
  label: string
  value: number
  color: string
}

interface LowStockItem {
  name: string
  sku: string
  balance: number
  reorderPoint: number
  unit: string
  status: 'critical' | 'low' | 'ok'
}

interface TopItem {
  name: string
  balance: number
  unit: string
  value: number
}

const categoryLabels: Record<string, string> = {
  RAW_MATERIAL: 'ნედლეული',
  PACKAGING: 'შეფუთვა',
  FINISHED_GOOD: 'მზა პროდუქცია',
  CONSUMABLE: 'სახარჯი',
}

const categoryColors: Record<string, string> = {
  RAW_MATERIAL: '#B87333',
  PACKAGING: '#3B82F6',
  FINISHED_GOOD: '#10B981',
  CONSUMABLE: '#F59E0B',
}

const ingredientTypeLabels: Record<string, string> = {
  MALT: 'მარცვლეული',
  HOPS: 'სვია',
  YEAST: 'საფუარი',
  ADJUNCT: 'დანამატი',
  WATER_CHEMISTRY: 'წყლის ქიმია',
  OTHER: 'სხვა',
  // Lowercase versions (fallback)
  grain: 'მარცვლეული',
  hops: 'სვია',
  yeast: 'საფუარი',
  adjunct: 'დანამატი',
  water_chemistry: 'წყლის ქიმია',
  other: 'სხვა',
}

export default function InventoryReportsPage() {
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('year')
  const [items, setItems] = useState<InventoryItem[]>([])
  const [categoryData, setCategoryData] = useState<CategoryData[]>([])
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([])
  const [topItems, setTopItems] = useState<TopItem[]>([])
  const [ingredientTypeData, setIngredientTypeData] = useState<CategoryData[]>([])
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null)

  // Stats
  const [stats, setStats] = useState({
    totalItems: 0,
    totalValue: 0,
    lowStockCount: 0,
    categoriesCount: 0,
    activeItems: 0,
  })

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)

      // Helper function to detect ingredient type from name
      const detectIngredientType = (item: InventoryItem): string => {
        // If ingredientType is set, use it
        if (item.ingredientType) {
          return item.ingredientType.toUpperCase()
        }
        
        const nameLower = item.name.toLowerCase()
        const skuUpper = (item.sku || '').toUpperCase()
        
        // Hops detection
        const hopNames = [
          'citra', 'cascade', 'centennial', 'simcoe', 'mosaic', 'amarillo',
          'hallertau', 'hallertauer', 'saaz', 'fuggle', 'golding', 'tettnang',
          'chinook', 'columbus', 'warrior', 'magnum', 'perle', 'hop', 'nelson',
          'galaxy', 'el dorado', 'ekuanot', 'idaho', 'strata', 'sabro', 'talus'
        ]
        if (skuUpper.includes('HOP') || hopNames.some(h => nameLower.includes(h))) {
          return 'HOPS'
        }
        
        // Yeast detection
        const yeastNames = [
          'yeast', 'safale', 'saflager', 'safbrew', 'fermentis', 'wyeast', 
          'white labs', 'wlp', 'lallemand', 'lalbrew', 'mangrove', 'omega',
          'imperial', 'nottingham', 'windsor', 'belle saison',
          'us-05', 'us-04', 's-04', 's-23', 's-33', 'k-97', 't-58',
          'be-256', 'be-134', 'wb-06', 'm-44', 'w-34'
        ]
        if (skuUpper.includes('YEAST') || yeastNames.some(y => nameLower.includes(y))) {
          return 'YEAST'
        }
        
        // Malt/Grain detection
        const maltNames = [
          'malt', 'pilsner', 'munich', 'vienna', 'crystal', 'caramel', 'cara',
          'wheat', 'rye', 'oat', 'pale ale', 'chocolate', 'black', 'roasted',
          'biscuit', 'aromatic', 'melanoidin', 'acidulated', 'smoked', 'peated',
          'flaked', 'torrified', 'base malt', 'specialty'
        ]
        if (skuUpper.includes('MALT') || skuUpper.includes('GRAIN') || maltNames.some(m => nameLower.includes(m))) {
          return 'MALT'
        }
        
        // Adjunct detection
        const adjunctNames = [
          'sugar', 'honey', 'molasses', 'syrup', 'lactose', 'dextrose', 'candi',
          'spice', 'coriander', 'orange peel', 'ginger', 'cinnamon', 'vanilla',
          'cocoa', 'coffee', 'fruit', 'puree', 'extract'
        ]
        if (skuUpper.includes('ADJUNCT') || adjunctNames.some(a => nameLower.includes(a))) {
          return 'ADJUNCT'
        }
        
        // Water chemistry detection
        const waterNames = ['gypsum', 'calcium', 'cacl', 'salt', 'acid', 'lactic', 'phosphoric']
        if (skuUpper.includes('WATER') || waterNames.some(w => nameLower.includes(w))) {
          return 'WATER_CHEMISTRY'
        }
        
        return 'OTHER'
      }

      // Fetch inventory items
      const inventoryRes = await fetch('/api/inventory')
      let inventoryData: InventoryItem[] = []
      if (inventoryRes.ok) {
        const data = await inventoryRes.json()
        inventoryData = data.items || []
        setItems(inventoryData)
      }

      // Calculate stats
      const activeItems = inventoryData.filter(i => i.isActive !== false) // All items from API are active
      const totalValue = inventoryData.reduce((sum, item) => {
        const balance = Number(item.cachedBalance) || 0
        const cost = Number(item.costPerUnit) || 0
        return sum + (balance * cost)
      }, 0)

      const lowStock = inventoryData.filter(item => {
        const balance = Number(item.cachedBalance) || 0
        const reorderPoint = Number(item.reorderPoint) || 0
        return reorderPoint > 0 && balance <= reorderPoint * 1.5
      })

      const categories = new Set(inventoryData.map(i => i.category))

      setStats({
        totalItems: inventoryData.length,
        totalValue,
        lowStockCount: lowStock.length,
        categoriesCount: categories.size,
        activeItems: activeItems.length,
      })

      // Calculate category distribution
      const categoryMap: Record<string, number> = {}
      inventoryData.forEach(item => {
        const cat = item.category || 'OTHER'
        const balance = Number(item.cachedBalance) || 0
        const cost = Number(item.costPerUnit) || 0
        categoryMap[cat] = (categoryMap[cat] || 0) + (balance * cost)
      })

      const totalCategoryValue = Object.values(categoryMap).reduce((sum, v) => sum + v, 0)
      const categoryChartData = Object.entries(categoryMap)
        .map(([label, value]) => ({
          label: categoryLabels[label] || label,
          value: totalCategoryValue > 0 ? value : 0,
          color: categoryColors[label] || '#6B7280',
        }))
        .filter(c => c.value > 0)
        .sort((a, b) => b.value - a.value)
      setCategoryData(categoryChartData)

      // Calculate ingredient type distribution (for RAW_MATERIAL only)
      const ingredientMap: Record<string, number> = {}
      inventoryData
        .filter(item => item.category === 'RAW_MATERIAL')
        .forEach(item => {
          const type = detectIngredientType(item)
          const balance = Number(item.cachedBalance) || 0
          ingredientMap[type] = (ingredientMap[type] || 0) + balance
        })

      const ingredientColors = ['#B87333', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6']
      const ingredientChartData = Object.entries(ingredientMap)
        .map(([label, value], i) => ({
          label: ingredientTypeLabels[label] || label,
          value,
          color: ingredientColors[i % ingredientColors.length],
        }))
        .sort((a, b) => b.value - a.value)
      setIngredientTypeData(ingredientChartData)

      // Calculate low stock items
      const lowStockList: LowStockItem[] = (inventoryData as any)
        .filter((item: any) => {
          const balance = Number(item.cachedBalance) || 0
          const reorderPoint = Number(item.reorderPoint) || 0
          return reorderPoint > 0 && balance <= reorderPoint * 1.5
        })
        .map((item: any) => {
          const balance = Number(item.cachedBalance) || 0
          const reorderPoint = Number(item.reorderPoint) || 0
          const ratio = reorderPoint > 0 ? balance / reorderPoint : 1
          
          return {
            name: item.name,
            sku: item.sku,
            balance,
            reorderPoint,
            unit: item.unit,
            status: (ratio <= 0.5 ? 'critical' : ratio <= 1 ? 'low' : 'ok') as 'critical' | 'low' | 'ok',
          }
        })
        .sort((a: LowStockItem, b: LowStockItem) => {
          const aRatio = a.reorderPoint > 0 ? a.balance / a.reorderPoint : 1
          const bRatio = b.reorderPoint > 0 ? b.balance / b.reorderPoint : 1
          return aRatio - bRatio
        })
        .slice(0, 10)
      setLowStockItems(lowStockList)

      // Calculate top items by value
      const topItemsList: TopItem[] = inventoryData
        .map(item => ({
          name: item.name,
          balance: Number(item.cachedBalance) || 0,
          unit: item.unit,
          value: (Number(item.cachedBalance) || 0) * (Number(item.costPerUnit) || 0),
        }))
        .filter(i => i.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 10)
      setTopItems(topItemsList)

    } catch (err) {
      console.error('Inventory reports fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const downloadInventoryExport = async (kind: 'pdf' | 'excel') => {
    const ext = kind === 'pdf' ? 'pdf' : 'xlsx'
    const mime =
      kind === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    const url = `/api/reports/inventory/${kind}`
    try {
      setExporting(kind)
      const res = await fetch(url)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const msg =
          typeof err.error === 'string' ? err.error : err.error?.message || `HTTP ${res.status}`
        throw new Error(msg)
      }
      const blob = await res.blob()
      const a = document.createElement('a')
      const objectUrl = URL.createObjectURL(new Blob([blob], { type: mime }))
      a.href = objectUrl
      a.download = `inventory-report.${ext}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(objectUrl)
    } catch (e) {
      console.error('Inventory export error:', e)
      alert(e instanceof Error ? e.message : 'ექსპორტი ვერ მოხერხდა')
    } finally {
      setExporting(null)
    }
  }

  const handleExportPDF = () => {
    void downloadInventoryExport('pdf')
  }

  const handleExportExcel = () => {
    void downloadInventoryExport('excel')
  }

  if (loading) {
    return (
      <DashboardLayout title="📦 მარაგების ანგარიში" breadcrumb="მთავარი / ანგარიშები / მარაგები">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-copper"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="📦 მარაგების ანგარიში" breadcrumb="მთავარი / ანგარიშები / მარაგები">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/reports">
              <Button variant="ghost" size="sm">← უკან</Button>
            </Link>
            <h2 className="text-2xl font-bold text-text-primary">მარაგების ანგარიში</h2>
          </div>
          
          <div className="flex items-center gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary text-sm"
            >
              <option value="current">მიმდინარე</option>
              <option value="30">ბოლო 30 დღე</option>
              <option value="90">ბოლო 3 თვე</option>
            </select>
            <Button
              onClick={handleExportPDF}
              variant="secondary"
              size="sm"
              disabled={!!exporting}
            >
              {exporting === 'pdf' ? '…' : '📄 PDF'}
            </Button>
            <Button
              onClick={handleExportExcel}
              variant="secondary"
              size="sm"
              disabled={!!exporting}
            >
              {exporting === 'excel' ? '…' : '📊 Excel'}
            </Button>
          </div>
        </div>

        {/* Stats Cards - Compact */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard 
            title="სულ პროდუქტი" 
            value={stats.totalItems.toString()} 
            icon="📦" 
            color="copper"
            subtitle={`${stats.activeItems} აქტიური`}
          />
          <StatCard 
            title="მარაგის ღირებულება" 
            value={formatCurrency(stats.totalValue)} 
            icon="💰" 
            color="green" 
          />
          <StatCard 
            title="დაბალი მარაგი" 
            value={stats.lowStockCount.toString()} 
            icon="⚠️" 
            variant={stats.lowStockCount > 0 ? 'warning' : 'default'}
          />
          <StatCard 
            title="კატეგორიები" 
            value={stats.categoriesCount.toString()} 
            icon="📂" 
            color="blue" 
          />
        </div>

        {/* Charts Row */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Category Distribution */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-text-primary">📊 მარაგი კატეგორიის მიხედვით</h3>
            </CardHeader>
            <CardBody>
              {categoryData.length > 0 ? (
                <DonutChart 
                  data={categoryData} 
                  size={160}
                  centerText={formatCurrency(stats.totalValue)}
                  centerSubtext="სულ ღირებულება"
                />
              ) : (
                <div className="h-48 flex items-center justify-center text-text-muted">
                  მონაცემები არ არის
                </div>
              )}
            </CardBody>
          </Card>

          {/* Ingredient Types */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-text-primary">🌾 ინგრედიენტების ტიპები</h3>
            </CardHeader>
            <CardBody>
              {ingredientTypeData.length > 0 ? (
                <BarChart 
                  data={ingredientTypeData.map(d => ({ label: d.label, value: d.value, color: d.color }))} 
                  height={180}
                  formatValue={(v) => `${v.toFixed(1)} kg`}
                />
              ) : (
                <div className="h-48 flex items-center justify-center text-text-muted">
                  მონაცემები არ არის
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Low Stock Alert */}
        {lowStockItems.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-text-primary">⚠️ დაბალი მარაგის გაფრთხილება</h3>
                <span className="text-sm text-amber-400">{lowStockItems.length} პროდუქტი</span>
              </div>
            </CardHeader>
            <CardBody>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 text-xs font-medium text-text-muted">პროდუქტი</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-text-muted">SKU</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-text-muted">მარაგი</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-text-muted">მინიმუმი</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-text-muted">სტატუსი</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockItems.map((item, index) => (
                      <tr key={index} className="border-b border-border/50 hover:bg-bg-tertiary transition-colors">
                        <td className="py-2 px-3 text-sm font-medium text-text-primary">{item.name}</td>
                        <td className="py-2 px-3 text-sm text-text-muted">{item.sku}</td>
                        <td className="py-2 px-3 text-sm text-right">
                          <span className={item.status === 'critical' ? 'text-red-400 font-medium' : 'text-text-primary'}>
                            {item.balance.toFixed(1)} {item.unit}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-sm text-text-muted text-right">
                          {item.reorderPoint.toFixed(1)} {item.unit}
                        </td>
                        <td className="py-2 px-3 text-sm">
                          <span className={`px-2 py-1 rounded text-xs ${
                            item.status === 'critical' 
                              ? 'bg-red-400/20 text-red-400' 
                              : 'bg-amber-400/20 text-amber-400'
                          }`}>
                            {item.status === 'critical' ? 'კრიტიკული' : 'დაბალი'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Top Items by Value */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-text-primary">💎 ტოპ პროდუქტები ღირებულებით</h3>
              <Link href="/inventory">
                <Button variant="ghost" size="sm">ყველა →</Button>
              </Link>
            </div>
          </CardHeader>
          <CardBody>
            {topItems.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 text-xs font-medium text-text-muted">#</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-text-muted">პროდუქტი</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-text-muted">მარაგი</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-text-muted">ღირებულება</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-text-muted">წილი</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topItems.map((item, index) => {
                      const percentage = stats.totalValue > 0 
                        ? Math.round((item.value / stats.totalValue) * 100) 
                        : 0
                      return (
                        <tr key={index} className="border-b border-border/50 hover:bg-bg-tertiary transition-colors">
                          <td className="py-2 px-3 text-sm text-text-muted">{index + 1}</td>
                          <td className="py-2 px-3 text-sm font-medium text-text-primary">{item.name}</td>
                          <td className="py-2 px-3 text-sm text-text-primary text-right">
                            {item.balance.toFixed(1)} {item.unit}
                          </td>
                          <td className="py-2 px-3 text-sm font-medium text-copper text-right">
                            {formatCurrency(item.value)}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-12 h-2 bg-bg-tertiary rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-copper"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <span className="text-xs text-text-muted w-8 text-right">{percentage}%</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-text-muted">
                მონაცემები არ არის
              </div>
            )}
          </CardBody>
        </Card>

        {/* All Items Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-text-primary">📋 მარაგის შეჯამება</h3>
              <span className="text-sm text-text-muted">{items.length} პროდუქტი</span>
            </div>
          </CardHeader>
          <CardBody>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-xs font-medium text-text-muted">პროდუქტი</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-text-muted">SKU</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-text-muted">კატეგორია</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-text-muted">მარაგი</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-text-muted">ფასი</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-text-muted">ღირებულება</th>
                  </tr>
                </thead>
                <tbody>
                  {items.slice(0, 15).map((item, index) => {
                    const balance = Number(item.cachedBalance) || 0
                    const cost = Number(item.costPerUnit) || 0
                    const value = balance * cost
                    
                    return (
                      <tr key={item.id} className="border-b border-border/50 hover:bg-bg-tertiary transition-colors">
                        <td className="py-2 px-3 text-sm font-medium text-text-primary">{item.name}</td>
                        <td className="py-2 px-3 text-sm text-text-muted">{item.sku}</td>
                        <td className="py-2 px-3 text-sm">
                          <span className="px-2 py-1 rounded text-xs bg-bg-tertiary text-text-primary">
                            {categoryLabels[item.category] || item.category}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-sm text-text-primary text-right">
                          {balance.toFixed(1)} {item.unit}
                        </td>
                        <td className="py-2 px-3 text-sm text-text-muted text-right">
                          {cost > 0 ? formatCurrency(cost) : '-'}
                        </td>
                        <td className="py-2 px-3 text-sm font-medium text-copper text-right">
                          {value > 0 ? formatCurrency(value) : '-'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              
              {items.length > 15 && (
                <div className="text-center mt-4">
                  <Link href="/inventory">
                    <Button variant="ghost" size="sm">
                      ყველა პროდუქტი ({items.length}) →
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </DashboardLayout>
  )
}
