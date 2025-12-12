'use client'



import { useState } from 'react'

import Link from 'next/link'

import { DashboardLayout } from '@/components/layout'

import { Card, CardHeader, CardBody, Button } from '@/components/ui'

import { StatCard, BarChart } from '@/components/reports'

import { formatDate, formatCurrency } from '@/lib/utils'



const monthlyProduction = [

  { month: 'იან', liters: 1850, batches: 2 },

  { month: 'თებ', liters: 2100, batches: 2 },

  { month: 'მარ', liters: 1950, batches: 2 },

  { month: 'აპრ', liters: 2400, batches: 3 },

  { month: 'მაი', liters: 2650, batches: 3 },

  { month: 'ივნ', liters: 2200, batches: 2 },

  { month: 'ივლ', liters: 2800, batches: 3 },

  { month: 'აგვ', liters: 2500, batches: 3 },

  { month: 'სექ', liters: 2300, batches: 2 },

  { month: 'ოქტ', liters: 2100, batches: 2 },

  { month: 'ნოე', liters: 1900, batches: 2 },

  { month: 'დეკ', liters: 2250, batches: 2 },

]



const batches = [

  {

    id: '1',

    batchNumber: 'BRW-0156',

    recipe: 'Georgian Amber Lager',

    style: 'Amber Lager',

    volume: 1850,

    og: 1.052,

    fg: 1.012,

    abv: 5.2,

    status: 'Fermenting',

    startDate: new Date('2024-12-10'),

    endDate: new Date('2024-12-24'),

  },

  {

    id: '2',

    batchNumber: 'BRW-0155',

    recipe: 'Tbilisi IPA',

    style: 'IPA',

    volume: 2000,

    og: 1.065,

    fg: 1.012,

    abv: 6.5,

    status: 'Conditioning',

    startDate: new Date('2024-12-05'),

    endDate: new Date('2024-12-19'),

  },

  {

    id: '3',

    batchNumber: 'BRW-0154',

    recipe: 'Kolkheti Wheat',

    style: 'Wheat',

    volume: 1500,

    og: 1.045,

    fg: 1.010,

    abv: 4.8,

    status: 'Ready',

    startDate: new Date('2024-12-01'),

    endDate: new Date('2024-12-15'),

  },

  {

    id: '4',

    batchNumber: 'BRW-0153',

    recipe: 'Caucasus Stout',

    style: 'Stout',

    volume: 1800,

    og: 1.070,

    fg: 1.015,

    abv: 5.8,

    status: 'Packaged',

    startDate: new Date('2024-11-25'),

    endDate: new Date('2024-12-09'),

  },

]



const ingredientUsage = [

  { ingredient: 'Pilsner Malt', total: 1850, unit: 'kg', average: 77 },

  { ingredient: 'Munich Malt', total: 420, unit: 'kg', average: 18 },

  { ingredient: 'Saaz', total: 24, unit: 'kg', average: 1 },

  { ingredient: 'Cascade', total: 18, unit: 'kg', average: 0.75 },

  { ingredient: 'Citra', total: 15, unit: 'kg', average: 0.63 },

]



const recipeStats = [

  { recipe: 'Georgian Amber Lager', batches: 6, volume: 4200, avgAbv: 5.2 },

  { recipe: 'Tbilisi IPA', batches: 5, volume: 3500, avgAbv: 6.5 },

  { recipe: 'Kolkheti Wheat', batches: 4, volume: 2800, avgAbv: 4.8 },

  { recipe: 'Caucasus Stout', batches: 3, volume: 2100, avgAbv: 5.8 },

  { recipe: 'Svaneti Pilsner', batches: 2, volume: 1400, avgAbv: 4.5 },

]



const totalProduction = monthlyProduction.reduce((sum, m) => sum + m.liters, 0)

const totalBatches = monthlyProduction.reduce((sum, m) => sum + m.batches, 0)

const avgBatchSize = totalProduction / totalBatches

const efficiency = 87



export default function ProductionReportsPage() {

  const [period, setPeriod] = useState('year')



  const handleExportPDF = () => {

    console.log('Exporting Production Report to PDF...')

  }



  const handleExportExcel = () => {

    console.log('Exporting Production Report to Excel...')

  }



  return (

    <DashboardLayout title="წარმოების ანგარიში" breadcrumb="მთავარი / ანგარიშები / წარმოება">

      {/* Header Controls */}

      <div className="flex justify-between items-center mb-6">

        <Link href="/reports" className="text-sm text-copper-light hover:text-copper transition-colors">

          ← უკან

        </Link>

        <div className="flex items-center gap-4">

          <select

            value={period}

            onChange={(e) => setPeriod(e.target.value)}

            className="px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"

          >

            <option value="30">ბოლო 30 დღე</option>

            <option value="90">ბოლო 3 თვე</option>

            <option value="year">წელი</option>

          </select>

          <Button onClick={handleExportPDF} variant="outline" size="sm">

            📄 PDF

          </Button>

          <Button onClick={handleExportExcel} variant="outline" size="sm">

            📊 Excel

          </Button>

        </div>

      </div>



      {/* Stats Cards */}

      <div className="grid grid-cols-4 gap-4 mb-6">

        <StatCard title="სულ წარმოებული" value={`${totalProduction.toLocaleString('en-US')}L`} icon="🍺" color="copper" />

        <StatCard title="პარტიების რაოდენობა" value={totalBatches.toString()} icon="📦" color="blue" />

        <StatCard title="საშუალო პარტიის ზომა" value={`${Math.round(avgBatchSize)}L`} icon="📊" color="amber" />

        <StatCard title="ეფექტურობა" value={`${efficiency}%`} icon="⚡" color="green" />

      </div>



      {/* Production Chart - Full Width */}

      <Card className="mb-6">

        <CardHeader>

          <span className="text-lg font-semibold">წარმოების დინამიკა (12 თვე)</span>

        </CardHeader>

        <CardBody>

          <BarChart data={monthlyProduction.map(m => ({ label: m.month, value: m.liters }))} maxValue={3000} height={300} />

        </CardBody>

      </Card>



      {/* Batches Table */}

      <Card className="mb-6">

        <CardHeader>

          <span className="text-lg font-semibold">პარტიების დეტალები</span>

        </CardHeader>

        <CardBody>

          <div className="overflow-x-auto">

            <table className="w-full">

              <thead>

                <tr className="border-b border-border">

                  <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">#</th>

                  <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">პარტია</th>

                  <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">რეცეპტი</th>

                  <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">სტილი</th>

                  <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">მოცულობა</th>

                  <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">OG</th>

                  <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">FG</th>

                  <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">ABV</th>

                  <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">სტატუსი</th>

                  <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">დაწყება</th>

                  <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">დასრულება</th>

                </tr>

              </thead>

              <tbody>

                {batches.map((batch, index) => (

                  <tr key={batch.id} className="border-b border-border/50 hover:bg-bg-tertiary transition-colors">

                    <td className="py-3 px-4 text-sm text-text-muted">{index + 1}</td>

                    <td className="py-3 px-4 text-sm font-medium text-copper-light">{batch.batchNumber}</td>

                    <td className="py-3 px-4 text-sm text-text-primary">{batch.recipe}</td>

                    <td className="py-3 px-4 text-sm text-text-primary">{batch.style}</td>

                    <td className="py-3 px-4 text-sm text-text-primary">{batch.volume.toLocaleString('en-US')}L</td>

                    <td className="py-3 px-4 text-sm font-mono text-text-primary">{batch.og}</td>

                    <td className="py-3 px-4 text-sm font-mono text-text-primary">{batch.fg}</td>

                    <td className="py-3 px-4 text-sm font-medium text-text-primary">{batch.abv}%</td>

                    <td className="py-3 px-4 text-sm">

                      <span className={`px-2 py-1 rounded text-xs ${

                        batch.status === 'Ready' ? 'bg-green-400/20 text-green-400' :

                        batch.status === 'Fermenting' ? 'bg-amber-400/20 text-amber-400' :

                        batch.status === 'Conditioning' ? 'bg-cyan-400/20 text-cyan-400' :

                        'bg-emerald-400/20 text-emerald-400'

                      }`}>

                        {batch.status}

                      </span>

                    </td>

                    <td className="py-3 px-4 text-sm text-text-muted">{formatDate(batch.startDate)}</td>

                    <td className="py-3 px-4 text-sm text-text-muted">

                      {batch.endDate ? formatDate(batch.endDate) : `~${formatDate(batch.endDate)}`}

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </CardBody>

      </Card>



      {/* Two Column Layout */}

      <div className="grid grid-cols-2 gap-6">

        {/* Ingredient Usage */}

        <Card>

          <CardHeader>

            <span className="text-lg font-semibold">ინგრედიენტების მოხმარება</span>

          </CardHeader>

          <CardBody>

            <div className="overflow-x-auto">

              <table className="w-full">

                <thead>

                  <tr className="border-b border-border">

                    <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">ინგრედიენტი</th>

                    <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">მოხმარება</th>

                    <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">ერთეული</th>

                    <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">საშუალო/პარტია</th>

                  </tr>

                </thead>

                <tbody>

                  {ingredientUsage.map((item, index) => (

                    <tr key={index} className="border-b border-border/50 hover:bg-bg-tertiary transition-colors">

                      <td className="py-3 px-4 text-sm font-medium text-text-primary">{item.ingredient}</td>

                      <td className="py-3 px-4 text-sm text-text-primary text-right">{item.total.toLocaleString('en-US')}</td>

                      <td className="py-3 px-4 text-sm text-text-muted">{item.unit}</td>

                      <td className="py-3 px-4 text-sm text-text-muted text-right">{item.average.toLocaleString('en-US')}</td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          </CardBody>

        </Card>



        {/* Recipe Statistics */}

        <Card>

          <CardHeader>

            <span className="text-lg font-semibold">რეცეპტების სტატისტიკა</span>

          </CardHeader>

          <CardBody>

            <div className="overflow-x-auto">

              <table className="w-full">

                <thead>

                  <tr className="border-b border-border">

                    <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">რეცეპტი</th>

                    <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">პარტიები</th>

                    <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">მოცულობა</th>

                    <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">საშუალო ABV</th>

                  </tr>

                </thead>

                <tbody>

                  {recipeStats.map((recipe, index) => (

                    <tr key={index} className="border-b border-border/50 hover:bg-bg-tertiary transition-colors">

                      <td className="py-3 px-4 text-sm font-medium text-text-primary">{recipe.recipe}</td>

                      <td className="py-3 px-4 text-sm text-text-primary text-right">{recipe.batches}</td>

                      <td className="py-3 px-4 text-sm text-text-primary text-right">{recipe.volume.toLocaleString('en-US')}L</td>

                      <td className="py-3 px-4 text-sm font-medium text-copper-light text-right">{recipe.avgAbv}%</td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          </CardBody>

        </Card>

      </div>

    </DashboardLayout>

  )

}

