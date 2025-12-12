'use client'



import { useState } from 'react'

import Link from 'next/link'

import { DashboardLayout } from '@/components/layout'

import { Card, CardHeader, CardBody, Button } from '@/components/ui'

import { StatCard, BarChart } from '@/components/reports'

import { formatDate, formatCurrency } from '@/lib/utils'



const monthlyMovement = [

  { month: 'ივლ', in: 12500, out: 8500 },

  { month: 'აგვ', in: 11200, out: 9200 },

  { month: 'სექ', in: 9800, out: 10500 },

  { month: 'ოქტ', in: 13200, out: 8800 },

  { month: 'ნოე', in: 10800, out: 10200 },

  { month: 'დეკ', in: 11500, out: 9500 },

]



const ingredientStatus = [

  { category: 'ალაო', products: 8, value: 12500, low: 1, critical: 0 },

  { category: 'სვია', products: 7, value: 8200, low: 2, critical: 1 },

  { category: 'ფერმენტები', products: 5, value: 3200, low: 0, critical: 0 },

  { category: 'პაკეტირება', products: 7, value: 21300, low: 1, critical: 1 },

]



const criticalStock = [

  { product: 'Cascade', stock: 0, minimum: 3, unit: 'kg', status: 'empty' },

  { product: 'Citra', stock: 2.3, minimum: 5, unit: 'kg', status: 'critical' },

  { product: 'ბოთლი 0.5L', stock: 200, minimum: 500, unit: 'ცალი', status: 'critical' },

  { product: 'თავსახური 26mm', stock: 800, minimum: 2000, unit: 'ცალი', status: 'low' },

]



const expiringSoon = [

  { product: 'Belgian Ale', expiry: new Date('2025-01-10'), remaining: 28, stock: '3 პაკეტი' },

  { product: 'Saaz', expiry: new Date('2025-06-01'), remaining: 170, stock: '8kg' },

  { product: 'Munich Malt', expiry: new Date('2025-03-15'), remaining: 93, stock: '25kg' },

]



const totalValue = ingredientStatus.reduce((sum, cat) => sum + cat.value, 0)

const totalProducts = ingredientStatus.reduce((sum, cat) => sum + cat.products, 0)

const totalLow = ingredientStatus.reduce((sum, cat) => sum + cat.low, 0)

const totalCritical = ingredientStatus.reduce((sum, cat) => sum + cat.critical, 0)



export default function InventoryReportsPage() {

  const handleExportPDF = () => {

    console.log('Exporting Inventory Report to PDF...')

  }



  const handleExportExcel = () => {

    console.log('Exporting Inventory Report to Excel...')

  }



  // Prepare data for stacked bar chart

  const maxMovement = Math.max(...monthlyMovement.map(m => m.in + m.out))

  const chartData = monthlyMovement.map(m => ({

    label: m.month,

    value: m.in + m.out,

    in: m.in,

    out: m.out,

  }))



  return (

    <DashboardLayout title="მარაგების ანგარიში" breadcrumb="მთავარი / ანგარიშები / მარაგები">

      {/* Header Controls */}

      <div className="flex justify-between items-center mb-6">

        <Link href="/reports" className="text-sm text-copper-light hover:text-copper transition-colors">

          ← უკან

        </Link>

        <div className="flex items-center gap-4">

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

        <StatCard title="მარაგის ღირებულება" value={formatCurrency(totalValue)} icon="💰" color="copper" />

        <StatCard title="პროდუქტების რაოდენობა" value={totalProducts.toString()} icon="📦" color="blue" />

        <StatCard title="დაბალი მარაგი" value={totalLow.toString()} icon="⚠️" color="amber" />

        <StatCard title="კრიტიკული" value={totalCritical.toString()} icon="🔴" color="red" />

      </div>



      {/* Inventory Movement Chart */}

      <Card className="mb-6">

        <CardHeader>

          <span className="text-lg font-semibold">მარაგების მოძრაობა (ბოლო 6 თვე)</span>

        </CardHeader>

        <CardBody>

          <div className="w-full" style={{ height: '300px' }}>

            <div className="relative w-full h-full flex items-end gap-2" style={{ height: '250px' }}>

              {chartData.map((item, index) => {

                const totalHeight = (item.value / maxMovement) * 100

                const inHeight = (item.in / maxMovement) * 100

                const outHeight = (item.out / maxMovement) * 100

                

                return (

                  <div key={index} className="flex-1 flex flex-col items-center group">

                    <div className="w-full relative" style={{ height: '100%' }}>

                      {/* Stacked bars */}

                      <div className="absolute bottom-0 w-full flex flex-col-reverse" style={{ height: `${totalHeight}%` }}>

                        {/* Out (red) */}

                        <div

                          className="w-full bg-red-400/60 rounded-t transition-all duration-300 group-hover:opacity-90"

                          style={{ height: `${(outHeight / totalHeight) * 100}%`, minHeight: '4px' }}

                        />

                        {/* In (green) */}

                        <div

                          className="w-full bg-green-400/60 rounded-t transition-all duration-300 group-hover:opacity-90"

                          style={{ height: `${(inHeight / totalHeight) * 100}%`, minHeight: '4px' }}

                        />

                      </div>

                    </div>

                    <span className="text-xs text-text-muted mt-2">{item.label}</span>

                  </div>

                )

              })}

            </div>

            {/* Legend */}

            <div className="flex justify-center gap-6 mt-4">

              <div className="flex items-center gap-2">

                <div className="w-4 h-4 bg-green-400/60 rounded" />

                <span className="text-sm text-text-muted">შემოსავალი</span>

              </div>

              <div className="flex items-center gap-2">

                <div className="w-4 h-4 bg-red-400/60 rounded" />

                <span className="text-sm text-text-muted">გასავალი</span>

              </div>

            </div>

          </div>

        </CardBody>

      </Card>



      {/* Two Column Layout */}

      <div className="grid grid-cols-2 gap-6 mb-6">

        {/* Ingredient Status */}

        <Card>

          <CardHeader>

            <span className="text-lg font-semibold">ინგრედიენტების სტატუსი</span>

          </CardHeader>

          <CardBody>

            <div className="overflow-x-auto">

              <table className="w-full">

                <thead>

                  <tr className="border-b border-border">

                    <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">კატეგორია</th>

                    <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">პროდუქტები</th>

                    <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">ღირებულება</th>

                    <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">დაბალი</th>

                    <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">კრიტიკული</th>

                  </tr>

                </thead>

                <tbody>

                  {ingredientStatus.map((item, index) => (

                    <tr key={index} className="border-b border-border/50 hover:bg-bg-tertiary transition-colors">

                      <td className="py-3 px-4 text-sm font-medium text-text-primary">{item.category}</td>

                      <td className="py-3 px-4 text-sm text-text-primary text-right">{item.products}</td>

                      <td className="py-3 px-4 text-sm font-medium text-copper-light text-right">{formatCurrency(item.value)}</td>

                      <td className="py-3 px-4 text-sm text-right">

                        {item.low > 0 ? (

                          <span className="px-2 py-1 rounded bg-amber-400/20 text-amber-400 text-xs">{item.low}</span>

                        ) : (

                          <span className="text-text-muted">0</span>

                        )}

                      </td>

                      <td className="py-3 px-4 text-sm text-right">

                        {item.critical > 0 ? (

                          <span className="px-2 py-1 rounded bg-red-400/20 text-red-400 text-xs">{item.critical}</span>

                        ) : (

                          <span className="text-text-muted">0</span>

                        )}

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          </CardBody>

        </Card>



        {/* Critical Stock */}

        <Card>

          <CardHeader>

            <span className="text-lg font-semibold">კრიტიკული მარაგები</span>

          </CardHeader>

          <CardBody>

            <div className="overflow-x-auto">

              <table className="w-full">

                <thead>

                  <tr className="border-b border-border">

                    <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">პროდუქტი</th>

                    <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">მარაგი</th>

                    <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">მინიმუმი</th>

                    <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">სტატუსი</th>

                    <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">მოქმედება</th>

                  </tr>

                </thead>

                <tbody>

                  {criticalStock.map((item, index) => (

                    <tr key={index} className="border-b border-border/50 hover:bg-bg-tertiary transition-colors">

                      <td className="py-3 px-4 text-sm font-medium text-text-primary">{item.product}</td>

                      <td className="py-3 px-4 text-sm text-text-primary text-right">

                        {item.stock.toLocaleString('en-US')} {item.unit}

                      </td>

                      <td className="py-3 px-4 text-sm text-text-muted text-right">

                        {item.minimum.toLocaleString('en-US')} {item.unit}

                      </td>

                      <td className="py-3 px-4 text-sm">

                        {item.status === 'empty' ? (

                          <span className="px-2 py-1 rounded bg-red-400/20 text-red-400 text-xs">❌ ამოწურული</span>

                        ) : item.status === 'critical' ? (

                          <span className="px-2 py-1 rounded bg-amber-400/20 text-amber-400 text-xs">⚠️ კრიტიკული</span>

                        ) : (

                          <span className="px-2 py-1 rounded bg-yellow-400/20 text-yellow-400 text-xs">🟡 დაბალი</span>

                        )}

                      </td>

                      <td className="py-3 px-4 text-sm">

                        <button className="text-copper-light hover:text-copper text-xs font-medium transition-colors">

                          შეკვეთა

                        </button>

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          </CardBody>

        </Card>

      </div>



      {/* Expiring Soon */}

      <Card>

        <CardHeader>

          <span className="text-lg font-semibold">ვადის გასვლა</span>

        </CardHeader>

        <CardBody>

          <div className="overflow-x-auto">

            <table className="w-full">

              <thead>

                <tr className="border-b border-border">

                  <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">პროდუქტი</th>

                  <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">ვადა</th>

                  <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">დარჩენილი</th>

                  <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">მარაგი</th>

                </tr>

              </thead>

              <tbody>

                {expiringSoon.map((item, index) => {

                  const isUrgent = item.remaining < 30

                  return (

                    <tr key={index} className="border-b border-border/50 hover:bg-bg-tertiary transition-colors">

                      <td className="py-3 px-4 text-sm font-medium text-text-primary">{item.product}</td>

                      <td className="py-3 px-4 text-sm text-text-primary">{formatDate(item.expiry)}</td>

                      <td className="py-3 px-4 text-sm">

                        <span className={isUrgent ? 'text-amber-400 font-medium' : 'text-text-muted'}>

                          {item.remaining} დღე

                        </span>

                      </td>

                      <td className="py-3 px-4 text-sm text-text-muted">{item.stock}</td>

                    </tr>

                  )

                })}

              </tbody>

            </table>

          </div>

        </CardBody>

      </Card>

    </DashboardLayout>

  )

}

