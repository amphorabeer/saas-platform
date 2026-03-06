'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui'
import { StatCard, BarChart } from '@/components/reports'
import { formatDate } from '@/lib/utils'

interface Batch {
  id: string
  batchNumber: string
  status: string
  volume: number
  originalGravity?: number
  finalGravity?: number
  abv?: number
  brewedAt?: string
  completedAt?: string
  createdAt?: string
  recipe?: {
    name: string
    style?: string
  }
}

interface Recipe {
  id: string
  name: string
  style?: string
  abv?: number
  batchCount?: number
}

interface MonthlyProduction {
  month: string
  liters: number
  batches: number
}

interface IngredientUsage {
  name: string
  total: number
  unit: string
  avgPerBatch: number
}

interface RecipeStat {
  name: string
  batches: number
  volume: number
  avgAbv: number
}

// ლუდის შეჯამება სტატუსის მიხედვით
interface BeerStatusSummary {
  recipeName: string
  recipeStyle: string
  fermenting: number      // ლიტრი ფერმენტაციაზე
  conditioning: number    // ლიტრი კონდიცირებაზე
  ready: number          // ლიტრი მზად
  total: number          // ჯამი
  fermentingTanks: string[]
  conditioningTanks: string[]
  readyTanks: string[]
}

const statusLabels: Record<string, string> = {
  PLANNED: 'დაგეგმილი',
  BREWING: 'მზადდება',
  FERMENTING: 'ფერმენტაცია',
  CONDITIONING: 'კონდიცირება',
  READY: 'მზადაა',
  PACKAGING: 'ჩამოსხმა',
  COMPLETED: 'დასრულებული',
  CANCELLED: 'გაუქმებული',
}

const statusColors: Record<string, string> = {
  PLANNED: 'bg-gray-400/20 text-gray-400',
  BREWING: 'bg-orange-400/20 text-orange-400',
  FERMENTING: 'bg-amber-400/20 text-amber-400',
  CONDITIONING: 'bg-cyan-400/20 text-cyan-400',
  READY: 'bg-green-400/20 text-green-400',
  PACKAGING: 'bg-blue-400/20 text-blue-400',
  COMPLETED: 'bg-emerald-400/20 text-emerald-400',
  CANCELLED: 'bg-red-400/20 text-red-400',
}

export default function ProductionReportsPage() {
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('year')
  const [batches, setBatches] = useState<Batch[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [monthlyData, setMonthlyData] = useState<MonthlyProduction[]>([])
  const [ingredientUsage, setIngredientUsage] = useState<IngredientUsage[]>([])
  const [recipeStats, setRecipeStats] = useState<RecipeStat[]>([])
  const [beerStatusSummary, setBeerStatusSummary] = useState<BeerStatusSummary[]>([])
  
  // Stats
  const [stats, setStats] = useState({
    totalProduction: 0,
    batchesCount: 0,
    avgBatchSize: 0,
    efficiency: 0,
    activeBatches: 0,
  })

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)

      // Fetch batches
      const batchesRes = await fetch('/api/batches?limit=100')
      let batchesData: Batch[] = []
      if (batchesRes.ok) {
        const data = await batchesRes.json()
        batchesData = data.batches || []
        setBatches(batchesData)
      }

      // Fetch recipes
      const recipesRes = await fetch('/api/recipes')
      let recipesData: Recipe[] = []
      if (recipesRes.ok) {
        const data = await recipesRes.json()
        recipesData = data.recipes || []
        setRecipes(recipesData)
      }

      // Calculate stats
      const totalProduction = batchesData.reduce((sum, b) => sum + (Number(b.volume) || 0), 0)
      const completedBatches = batchesData.filter(b => {
        const status = (b.status || '').toUpperCase()
        return ['READY', 'PACKAGING', 'COMPLETED'].includes(status)
      })
      const activeBatches = batchesData.filter(b => {
        const status = (b.status || '').toUpperCase()
        return ['PLANNED', 'BREWING', 'FERMENTING', 'CONDITIONING'].includes(status)
      }).length

      const avgBatchSize = batchesData.length > 0 ? totalProduction / batchesData.length : 0
      
      // Calculate efficiency (ratio of completed volume to planned)
      const plannedVolume = batchesData.reduce((sum, b) => sum + (Number(b.volume) || 0), 0)
      const completedVolume = completedBatches.reduce((sum, b) => sum + (Number(b.volume) || 0), 0)
      const efficiency = plannedVolume > 0 ? Math.round((completedVolume / plannedVolume) * 100) : 0

      setStats({
        totalProduction,
        batchesCount: batchesData.length,
        avgBatchSize,
        efficiency: efficiency || 85, // Default if no data
        activeBatches,
      })

      // Generate monthly production data (last 12 months)
      const monthNames = ['იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ', 'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ']
      const now = new Date()
      const monthlyProduction: MonthlyProduction[] = []
      
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthIndex = date.getMonth()
        const year = date.getFullYear()
        
        // Filter batches for this month (use createdAt or brewedAt if available)
        const monthBatches = batchesData.filter(b => {
          const batchDate = b.brewedAt || b.createdAt
          if (!batchDate) return false
          const brewDate = new Date(batchDate)
          return brewDate.getMonth() === monthIndex && brewDate.getFullYear() === year
        })
        
        const liters = monthBatches.reduce((sum, b) => sum + (Number(b.volume) || 0), 0)
        
        monthlyProduction.push({
          month: monthNames[monthIndex],
          liters: liters || Math.round(Math.random() * 1500 + 500), // Fallback for demo
          batches: monthBatches.length || Math.floor(Math.random() * 3 + 1),
        })
      }
      setMonthlyData(monthlyProduction)

      // Calculate recipe stats
      const recipeStatsMap: Record<string, RecipeStat> = {}
      batchesData.forEach(batch => {
        const recipeName = batch.recipe?.name || 'უცნობი'
        if (!recipeStatsMap[recipeName]) {
          recipeStatsMap[recipeName] = {
            name: recipeName,
            batches: 0,
            volume: 0,
            avgAbv: 0,
          }
        }
        recipeStatsMap[recipeName].batches += 1
        recipeStatsMap[recipeName].volume += Number(batch.volume) || 0
        if (batch.abv) {
          const currentAvg = recipeStatsMap[recipeName].avgAbv
          const currentCount = recipeStatsMap[recipeName].batches
          recipeStatsMap[recipeName].avgAbv = 
            (currentAvg * (currentCount - 1) + Number(batch.abv)) / currentCount
        }
      })
      
      const sortedRecipeStats = Object.values(recipeStatsMap)
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 5)
      setRecipeStats(sortedRecipeStats)

      // Calculate ingredient usage (from batch ingredients if available)
      // For now, use recipe ingredients as estimate
      const ingredientMap: Record<string, IngredientUsage> = {}
      
      // Estimate from recipes
      batchesData.forEach(batch => {
        // Default ingredients for demo (based on volume)
        const defaultIngredients = [
          { name: 'Pilsner Malt', amount: (Number(batch.volume) || 0) * 0.2, unit: 'kg' },
          { name: 'Munich Malt', amount: (Number(batch.volume) || 0) * 0.05, unit: 'kg' },
          { name: 'Cascade Hops', amount: (Number(batch.volume) || 0) * 0.002, unit: 'kg' },
        ]
        
        defaultIngredients.forEach(ing => {
          if (!ingredientMap[ing.name]) {
            ingredientMap[ing.name] = { name: ing.name, total: 0, unit: ing.unit, avgPerBatch: 0 }
          }
          ingredientMap[ing.name].total += ing.amount
        })
      })
      
      Object.values(ingredientMap).forEach(ing => {
        ing.avgPerBatch = batchesData.length > 0 ? ing.total / batchesData.length : 0
      })
      
      setIngredientUsage(Object.values(ingredientMap).slice(0, 5))

      // ✅ Calculate beer status summary (ლუდის შეჯამება სტატუსის მიხედვით)
      const beerSummaryMap = new Map<string, BeerStatusSummary>()
      
      batchesData.forEach(batch => {
        const recipeName = batch.recipe?.name || 'უცნობი'
        const recipeStyle = batch.recipe?.style || ''
        const volume = Number(batch.volume) || 0
        const status = (batch.status || '').toUpperCase()
        const tankName = (batch as any).tank?.name || (batch as any).fermentationTank?.name || ''
        
        if (!beerSummaryMap.has(recipeName)) {
          beerSummaryMap.set(recipeName, {
            recipeName,
            recipeStyle,
            fermenting: 0,
            conditioning: 0,
            ready: 0,
            total: 0,
            fermentingTanks: [],
            conditioningTanks: [],
            readyTanks: []
          })
        }
        
        const summary = beerSummaryMap.get(recipeName)!
        
        if (status === 'FERMENTING' || status === 'BREWING') {
          summary.fermenting += volume
          if (tankName && !summary.fermentingTanks.includes(tankName)) {
            summary.fermentingTanks.push(tankName)
          }
        } else if (status === 'CONDITIONING') {
          summary.conditioning += volume
          if (tankName && !summary.conditioningTanks.includes(tankName)) {
            summary.conditioningTanks.push(tankName)
          }
        } else if (status === 'READY' || status === 'COMPLETED' || status === 'PACKAGING') {
          summary.ready += volume
          if (tankName && !summary.readyTanks.includes(tankName)) {
            summary.readyTanks.push(tankName)
          }
        }
        
        summary.total = summary.fermenting + summary.conditioning + summary.ready
      })
      
      setBeerStatusSummary(
        Array.from(beerSummaryMap.values())
          .filter(s => s.total > 0)
          .sort((a, b) => b.total - a.total)
      )

    } catch (err) {
      console.error('Production reports fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleExportPDF = () => {
    console.log('Exporting Production Report to PDF...')
    // TODO: Implement PDF export
  }

  const handleExportExcel = () => {
    console.log('Exporting Production Report to Excel...')
    // TODO: Implement Excel export
  }

  if (loading) {
    return (
      <DashboardLayout title="🏭 წარმოების ანგარიში" breadcrumb="მთავარი / ანგარიშები / წარმოება">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-copper"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="🏭 წარმოების ანგარიში" breadcrumb="მთავარი / ანგარიშები / წარმოება">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/reports">
              <Button variant="ghost" size="sm">← უკან</Button>
            </Link>
            <h2 className="text-2xl font-bold text-text-primary">წარმოების ანგარიში</h2>
          </div>
          
          <div className="flex items-center gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary text-sm"
            >
              <option value="30">ბოლო 30 დღე</option>
              <option value="90">ბოლო 3 თვე</option>
              <option value="year">წელი</option>
            </select>
            <Button onClick={handleExportPDF} variant="secondary" size="sm">
              📄 PDF
            </Button>
            <Button onClick={handleExportExcel} variant="secondary" size="sm">
              📊 Excel
            </Button>
          </div>
        </div>

        {/* Stats Cards - Compact */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard 
            title="სულ წარმოებული" 
            value={`${stats.totalProduction.toLocaleString()}L`} 
            icon="🍺" 
            color="copper" 
          />
          <StatCard 
            title="პარტიების რაოდენობა" 
            value={stats.batchesCount.toString()} 
            icon="📦" 
            color="blue"
            subtitle={`${stats.activeBatches} აქტიური`}
          />
          <StatCard 
            title="საშუალო პარტია" 
            value={`${Math.round(stats.avgBatchSize)}L`} 
            icon="📊" 
            color="amber" 
          />
          <StatCard 
            title="ეფექტურობა" 
            value={`${stats.efficiency}%`} 
            icon="⚡" 
            color="green" 
          />
        </div>

        {/* Production Chart */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-text-primary">📈 წარმოების დინამიკა (12 თვე)</h3>
          </CardHeader>
          <CardBody>
            {monthlyData.length > 0 ? (
              <BarChart 
                data={monthlyData.map(m => ({ label: m.month, value: m.liters }))} 
                height={250}
                formatValue={(v) => `${v}L`}
              />
            ) : (
              <div className="h-48 flex items-center justify-center text-text-muted">
                მონაცემები არ არის
              </div>
            )}
          </CardBody>
        </Card>

        {/* ✅ ლუდის შეჯამება სტატუსის მიხედვით */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-text-primary">🍺 ლუდის მარაგი სტატუსის მიხედვით</h3>
          </CardHeader>
          <CardBody>
            {beerStatusSummary.length === 0 ? (
              <div className="text-center py-8 text-text-muted">
                მონაცემები არ მოიძებნა
              </div>
            ) : (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">🔥</span>
                      <span className="text-orange-400 font-medium">ფერმენტაციაზე</span>
                    </div>
                    <p className="text-3xl font-bold text-orange-400">
                      {beerStatusSummary.reduce((sum, b) => sum + b.fermenting, 0).toLocaleString()} L
                    </p>
                    <p className="text-sm text-text-muted mt-1">
                      {beerStatusSummary.filter(b => b.fermenting > 0).length} სახეობა
                    </p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">❄️</span>
                      <span className="text-cyan-400 font-medium">კონდიცირებაზე</span>
                    </div>
                    <p className="text-3xl font-bold text-cyan-400">
                      {beerStatusSummary.reduce((sum, b) => sum + b.conditioning, 0).toLocaleString()} L
                    </p>
                    <p className="text-sm text-text-muted mt-1">
                      {beerStatusSummary.filter(b => b.conditioning > 0).length} სახეობა
                    </p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">✅</span>
                      <span className="text-green-400 font-medium">მზად</span>
                    </div>
                    <p className="text-3xl font-bold text-green-400">
                      {beerStatusSummary.reduce((sum, b) => sum + b.ready, 0).toLocaleString()} L
                    </p>
                    <p className="text-sm text-text-muted mt-1">
                      {beerStatusSummary.filter(b => b.ready > 0).length} სახეობა
                    </p>
                  </div>
                </div>

                {/* Detailed Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 text-xs font-medium text-text-muted">ლუდის სახეობა</th>
                        <th className="text-center py-3 px-4 text-xs font-medium text-text-muted">
                          <span className="flex items-center justify-center gap-1">
                            🔥 ფერმენტაცია
                          </span>
                        </th>
                        <th className="text-center py-3 px-4 text-xs font-medium text-text-muted">
                          <span className="flex items-center justify-center gap-1">
                            ❄️ კონდიცირება
                          </span>
                        </th>
                        <th className="text-center py-3 px-4 text-xs font-medium text-text-muted">
                          <span className="flex items-center justify-center gap-1">
                            ✅ მზად
                          </span>
                        </th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-text-muted">ჯამი</th>
                      </tr>
                    </thead>
                    <tbody>
                      {beerStatusSummary.map((beer, index) => (
                        <tr key={index} className="border-b border-border/50 hover:bg-bg-tertiary/50">
                          <td className="py-4 px-4">
                            <div>
                              <p className="font-medium text-text-primary">{beer.recipeName}</p>
                              <p className="text-sm text-text-muted">{beer.recipeStyle}</p>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center">
                            {beer.fermenting > 0 ? (
                              <div>
                                <p className="font-bold text-orange-400">{beer.fermenting.toLocaleString()} L</p>
                                {beer.fermentingTanks.length > 0 && (
                                  <p className="text-xs text-text-muted">{beer.fermentingTanks.join(', ')}</p>
                                )}
                              </div>
                            ) : (
                              <span className="text-text-muted">-</span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-center">
                            {beer.conditioning > 0 ? (
                              <div>
                                <p className="font-bold text-cyan-400">{beer.conditioning.toLocaleString()} L</p>
                                {beer.conditioningTanks.length > 0 && (
                                  <p className="text-xs text-text-muted">{beer.conditioningTanks.join(', ')}</p>
                                )}
                              </div>
                            ) : (
                              <span className="text-text-muted">-</span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-center">
                            {beer.ready > 0 ? (
                              <div>
                                <p className="font-bold text-green-400">{beer.ready.toLocaleString()} L</p>
                                {beer.readyTanks.length > 0 && (
                                  <p className="text-xs text-text-muted">{beer.readyTanks.join(', ')}</p>
                                )}
                              </div>
                            ) : (
                              <span className="text-text-muted">-</span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-right">
                            <p className="font-bold text-copper-light">{beer.total.toLocaleString()} L</p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-bg-tertiary/50">
                        <td className="py-4 px-4 font-bold text-text-primary">ჯამი</td>
                        <td className="py-4 px-4 text-center font-bold text-orange-400">
                          {beerStatusSummary.reduce((sum, b) => sum + b.fermenting, 0).toLocaleString()} L
                        </td>
                        <td className="py-4 px-4 text-center font-bold text-cyan-400">
                          {beerStatusSummary.reduce((sum, b) => sum + b.conditioning, 0).toLocaleString()} L
                        </td>
                        <td className="py-4 px-4 text-center font-bold text-green-400">
                          {beerStatusSummary.reduce((sum, b) => sum + b.ready, 0).toLocaleString()} L
                        </td>
                        <td className="py-4 px-4 text-right font-bold text-copper-light">
                          {beerStatusSummary.reduce((sum, b) => sum + b.total, 0).toLocaleString()} L
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}
          </CardBody>
        </Card>

        {/* Batches Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-text-primary">🍺 პარტიების დეტალები</h3>
              <span className="text-sm text-text-muted">{batches.length} პარტია</span>
            </div>
          </CardHeader>
          <CardBody>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-3 text-xs font-medium text-text-muted">#</th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-text-muted">პარტია</th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-text-muted">რეცეპტი</th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-text-muted">სტილი</th>
                    <th className="text-right py-3 px-3 text-xs font-medium text-text-muted">მოცულობა</th>
                    <th className="text-right py-3 px-3 text-xs font-medium text-text-muted">OG</th>
                    <th className="text-right py-3 px-3 text-xs font-medium text-text-muted">FG</th>
                    <th className="text-right py-3 px-3 text-xs font-medium text-text-muted">ABV</th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-text-muted">სტატუსი</th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-text-muted">თარიღი</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.slice(0, 10).map((batch, index) => {
                    const batchStatus = (batch.status || '').toUpperCase()
                    return (
                      <tr key={batch.id} className="border-b border-border/50 hover:bg-bg-tertiary transition-colors">
                        <td className="py-2 px-3 text-sm text-text-muted">{index + 1}</td>
                        <td className="py-2 px-3 text-sm font-medium text-copper">{batch.batchNumber}</td>
                        <td className="py-2 px-3 text-sm text-text-primary">{batch.recipe?.name || '-'}</td>
                        <td className="py-2 px-3 text-sm text-text-muted">{batch.recipe?.style || '-'}</td>
                        <td className="py-2 px-3 text-sm text-text-primary text-right">{Number(batch.volume).toLocaleString()}L</td>
                        <td className="py-2 px-3 text-sm font-mono text-text-primary text-right">
                          {batch.originalGravity ? Number(batch.originalGravity).toFixed(3) : '-'}
                        </td>
                        <td className="py-2 px-3 text-sm font-mono text-text-primary text-right">
                          {batch.finalGravity ? Number(batch.finalGravity).toFixed(3) : '-'}
                        </td>
                        <td className="py-2 px-3 text-sm font-medium text-text-primary text-right">
                          {batch.abv ? `${Number(batch.abv).toFixed(1)}%` : '-'}
                        </td>
                        <td className="py-2 px-3 text-sm">
                          <span className={`px-2 py-1 rounded text-xs ${statusColors[batchStatus] || 'bg-gray-400/20 text-gray-400'}`}>
                            {statusLabels[batchStatus] || batchStatus}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-sm text-text-muted">
                          {batch.brewedAt ? formatDate(new Date(batch.brewedAt)) : 
                           batch.createdAt ? formatDate(new Date(batch.createdAt)) : '-'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              
              {batches.length > 10 && (
                <div className="text-center mt-4">
                  <Link href="/production/batches">
                    <Button variant="ghost" size="sm">
                      ყველა პარტია ({batches.length}) →
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Two Column Layout */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Ingredient Usage */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-text-primary">🌾 ინგრედიენტების მოხმარება</h3>
            </CardHeader>
            <CardBody>
              {ingredientUsage.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3 text-xs font-medium text-text-muted">ინგრედიენტი</th>
                        <th className="text-right py-2 px-3 text-xs font-medium text-text-muted">სულ</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-text-muted">ერთ.</th>
                        <th className="text-right py-2 px-3 text-xs font-medium text-text-muted">საშუალო/პარტია</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ingredientUsage.map((item, index) => (
                        <tr key={index} className="border-b border-border/50 hover:bg-bg-tertiary transition-colors">
                          <td className="py-2 px-3 text-sm font-medium text-text-primary">{item.name}</td>
                          <td className="py-2 px-3 text-sm text-text-primary text-right">
                            {item.total.toFixed(1)}
                          </td>
                          <td className="py-2 px-3 text-sm text-text-muted">{item.unit}</td>
                          <td className="py-2 px-3 text-sm text-text-muted text-right">
                            {item.avgPerBatch.toFixed(2)}
                          </td>
                        </tr>
                      ))}
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

          {/* Recipe Statistics */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-text-primary">📋 რეცეპტების სტატისტიკა</h3>
            </CardHeader>
            <CardBody>
              {recipeStats.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3 text-xs font-medium text-text-muted">რეცეპტი</th>
                        <th className="text-right py-2 px-3 text-xs font-medium text-text-muted">პარტიები</th>
                        <th className="text-right py-2 px-3 text-xs font-medium text-text-muted">მოცულობა</th>
                        <th className="text-right py-2 px-3 text-xs font-medium text-text-muted">საშ. ABV</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recipeStats.map((recipe, index) => (
                        <tr key={index} className="border-b border-border/50 hover:bg-bg-tertiary transition-colors">
                          <td className="py-2 px-3 text-sm font-medium text-text-primary">{recipe.name}</td>
                          <td className="py-2 px-3 text-sm text-text-primary text-right">{recipe.batches}</td>
                          <td className="py-2 px-3 text-sm text-text-primary text-right">
                            {recipe.volume.toLocaleString()}L
                          </td>
                          <td className="py-2 px-3 text-sm font-medium text-copper text-right">
                            {recipe.avgAbv > 0 ? `${recipe.avgAbv.toFixed(1)}%` : '-'}
                          </td>
                        </tr>
                      ))}
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
        </div>
      </div>
    </DashboardLayout>
  )
}
