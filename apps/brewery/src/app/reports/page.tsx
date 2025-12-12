'use client'

import { useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout'
import { Card, CardHeader, CardBody, Button } from '@/components/ui'
import { StatCard, BarChart, LineChart, DonutChart } from '@/components/reports'
import { formatCurrency } from '@/lib/utils'
import { getStats, batches, orders, recipes } from '@/data/centralData'

// Get stats from central data
const stats = getStats()

const monthlyProduction = [
  { month: 'იან', liters: 1850 },
  { month: 'თებ', liters: 2100 },
  { month: 'მარ', liters: 1950 },
  { month: 'აპრ', liters: 2400 },
  { month: 'მაი', liters: 2650 },
  { month: 'ივნ', liters: 2200 },
  { month: 'ივლ', liters: 2800 },
  { month: 'აგვ', liters: 2500 },
  { month: 'სექ', liters: 2300 },
  { month: 'ოქტ', liters: 2100 },
  { month: 'ნოე', liters: 1900 },
  { month: 'დეკ', liters: stats.production.totalVolume / 1000 || 2250 },
]



const monthlySales = [

  { month: 'იან', revenue: 8500 },

  { month: 'თებ', revenue: 9200 },

  { month: 'მარ', revenue: 10500 },

  { month: 'აპრ', revenue: 11200 },

  { month: 'მაი', revenue: 12800 },

  { month: 'ივნ', revenue: 11500 },

  { month: 'ივლ', revenue: 13500 },

  { month: 'აგვ', revenue: 12200 },

  { month: 'სექ', revenue: 11800 },

  { month: 'ოქტ', revenue: 10900 },

  { month: 'ნოე', revenue: 10200 },

  { month: 'დეკ', revenue: 12600 },

]



const styleDistribution = [

  { label: 'Lager', value: 35, color: '#B87333' },

  { label: 'IPA', value: 25, color: '#F59E0B' },

  { label: 'Wheat', value: 20, color: '#EAB308' },

  { label: 'Stout', value: 12, color: '#78350F' },

  { label: 'სხვა', value: 8, color: '#6B7280' },

]



const topProducts = [

  { name: 'Georgian Amber Lager', liters: 4200 },

  { name: 'Tbilisi IPA', liters: 3500 },

  { name: 'Kolkheti Wheat', liters: 2800 },

  { name: 'Caucasus Stout', liters: 2100 },

  { name: 'Svaneti Pilsner', liters: 1400 },

]



const latestBatches = [

  { batch: 'BRW-0156', recipe: 'Georgian Amber', volume: '1,850L', status: 'Fermenting', date: '10.12' },

  { batch: 'BRW-0155', recipe: 'Tbilisi IPA', volume: '2,000L', status: 'Conditioning', date: '05.12' },

  { batch: 'BRW-0154', recipe: 'Kolkheti Wheat', volume: '1,500L', status: 'Ready', date: '01.12' },

]



const topCustomers = [

  { customer: 'BeerGe', orders: 35, revenue: 125000 },

  { customer: 'ფუნიკულიორი', orders: 15, revenue: 42000 },

  { customer: 'Wine Bar 8000', orders: 12, revenue: 28500 },

]



const maxProductLiters = Math.max(...topProducts.map(p => p.liters))



export default function ReportsPage() {

  const [period, setPeriod] = useState('30')



  const handleExportPDF = () => {

    console.log('Exporting to PDF...')

  }



  const handleExportExcel = () => {

    console.log('Exporting to Excel...')

  }



  return (

    <DashboardLayout title="📈 ანგარიშები" breadcrumb="მთავარი / ანგარიშები">

      {/* Header Controls */}

      <div className="flex justify-between items-center mb-6">

        <div className="flex items-center gap-4">

          <span className="text-sm text-text-muted">პერიოდი:</span>

          <select

            value={period}

            onChange={(e) => setPeriod(e.target.value)}

            className="px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"

          >

            <option value="7">ბოლო 7 დღე</option>

            <option value="30">ბოლო 30 დღე</option>

            <option value="90">ბოლო 3 თვე</option>

            <option value="365">ბოლო 12 თვე</option>

            <option value="year">წელი</option>

          </select>

        </div>

        <div className="flex gap-2">

          <Button onClick={handleExportPDF} variant="secondary" size="sm">

            📄 PDF

          </Button>

          <Button onClick={handleExportExcel} variant="secondary" size="sm">

            📊 Excel

          </Button>

        </div>

      </div>



      {/* Stats Cards */}

      <div className="grid grid-cols-6 gap-4 mb-6">

        <StatCard title="წარმოებული" value="18,500L" change={12} icon="🍺" color="copper" />

        <StatCard title="პარტიები" value="24" change={8} icon="📦" color="blue" />

        <StatCard title="გაყიდვები" value={formatCurrency(125400)} change={18} icon="💰" color="green" />

        <StatCard title="მოგება" value={formatCurrency(45200)} change={15} icon="📈" color="emerald" />

        <StatCard title="კეგები გაყიდული" value="156" change={22} icon="🛢️" color="amber" />

        <StatCard title="ბოთლები გაყიდული" value="3,400" change={10} icon="🍾" color="purple" />

      </div>



      {/* Charts Grid 2x2 */}

      <div className="grid grid-cols-2 gap-6 mb-6">

        {/* Production Chart */}

        <Card>

          <CardHeader>

            <span className="text-lg font-semibold">წარმოების დინამიკა</span>

          </CardHeader>

          <CardBody>

            <BarChart data={monthlyProduction.map(m => ({ label: m.month, value: m.liters }))} maxValue={3000} height={250} />

          </CardBody>

        </Card>



        {/* Sales Chart */}

        <Card>

          <CardHeader>

            <span className="text-lg font-semibold">გაყიდვების ტრენდი</span>

          </CardHeader>

          <CardBody>

            <LineChart data={monthlySales.map(m => ({ label: m.month, value: m.revenue }))} height={250} />

          </CardBody>

        </Card>



        {/* Style Distribution */}

        <Card>

          <CardHeader>

            <span className="text-lg font-semibold">წარმოება სტილების მიხედვით</span>

          </CardHeader>

          <CardBody>

            <DonutChart data={styleDistribution} centerText="24 პარტია" size={220} />

          </CardBody>

        </Card>



        {/* Top Products */}

        <Card>

          <CardHeader>

            <span className="text-lg font-semibold">ტოპ 5 პროდუქტი</span>

          </CardHeader>

          <CardBody>

            <div className="space-y-4">

              {topProducts.map((product, index) => {

                const percentage = (product.liters / maxProductLiters) * 100

                return (

                  <div key={index} className="space-y-2">

                    <div className="flex items-center justify-between text-sm">

                      <span className="font-medium text-text-primary">{product.name}</span>

                      <span className="text-text-muted">{product.liters.toLocaleString('en-US')}L</span>

                    </div>

                    <div className="relative h-6 bg-bg-tertiary rounded-full overflow-hidden">

                      <div

                        className="h-full bg-gradient-to-r from-copper to-amber-400 rounded-full transition-all duration-500"

                        style={{ width: `${percentage}%` }}

                      />

                      <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-text-primary">

                        {percentage.toFixed(0)}%

                      </div>

                    </div>

                  </div>

                )

              })}

            </div>

          </CardBody>

        </Card>

      </div>



      {/* Tables Section 2 Column */}

      <div className="grid grid-cols-2 gap-6 mb-6">

        {/* Latest Batches */}

        <Card>

          <CardHeader>

            <span className="text-lg font-semibold">უახლესი პარტიები</span>

          </CardHeader>

          <CardBody>

            <div className="overflow-x-auto">

              <table className="w-full">

                <thead>

                  <tr className="border-b border-border">

                    <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">პარტია</th>

                    <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">რეცეპტი</th>

                    <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">მოცულობა</th>

                    <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">სტატუსი</th>

                    <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">თარიღი</th>

                  </tr>

                </thead>

                <tbody>

                  {latestBatches.map((batch, index) => (

                    <tr key={index} className="border-b border-border/50 hover:bg-bg-tertiary transition-colors">

                      <td className="py-3 px-4 text-sm font-medium text-copper-light">{batch.batch}</td>

                      <td className="py-3 px-4 text-sm text-text-primary">{batch.recipe}</td>

                      <td className="py-3 px-4 text-sm text-text-primary">{batch.volume}</td>

                      <td className="py-3 px-4 text-sm">

                        <span className="px-2 py-1 rounded bg-amber-400/20 text-amber-400 text-xs">

                          {batch.status}

                        </span>

                      </td>

                      <td className="py-3 px-4 text-sm text-text-muted">{batch.date}</td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          </CardBody>

        </Card>



        {/* Top Customers */}

        <Card>

          <CardHeader>

            <span className="text-lg font-semibold">ტოპ კლიენტები</span>

          </CardHeader>

          <CardBody>

            <div className="overflow-x-auto">

              <table className="w-full">

                <thead>

                  <tr className="border-b border-border">

                    <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">კლიენტი</th>

                    <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">შეკვეთები</th>

                    <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">შემოსავალი</th>

                  </tr>

                </thead>

                <tbody>

                  {topCustomers.map((customer, index) => (

                    <tr key={index} className="border-b border-border/50 hover:bg-bg-tertiary transition-colors">

                      <td className="py-3 px-4 text-sm font-medium text-text-primary">{customer.customer}</td>

                      <td className="py-3 px-4 text-sm text-text-primary">{customer.orders}</td>

                      <td className="py-3 px-4 text-sm font-medium text-copper-light">{formatCurrency(customer.revenue)}</td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          </CardBody>

        </Card>

      </div>



      {/* Quick Links */}

      <div className="grid grid-cols-3 gap-4">

        <Link href="/reports/production">

          <Card className="cursor-pointer hover:border-copper transition-colors h-full">

            <CardBody className="p-6">

              <div className="flex items-center gap-4">

                <span className="text-3xl">📊</span>

                <div>

                  <h3 className="font-semibold text-lg mb-1">წარმოების დეტალური</h3>

                  <p className="text-sm text-text-muted">დეტალური ანგარიშები წარმოების შესახებ</p>

                </div>

              </div>

            </CardBody>

          </Card>

        </Link>



        <Link href="/reports/sales">

          <Card className="cursor-pointer hover:border-copper transition-colors h-full">

            <CardBody className="p-6">

              <div className="flex items-center gap-4">

                <span className="text-3xl">💰</span>

                <div>

                  <h3 className="font-semibold text-lg mb-1">გაყიდვების დეტალური</h3>

                  <p className="text-sm text-text-muted">დეტალური ანგარიშები გაყიდვების შესახებ</p>

                </div>

              </div>

            </CardBody>

          </Card>

        </Link>



        <Link href="/reports/inventory">

          <Card className="cursor-pointer hover:border-copper transition-colors h-full">

            <CardBody className="p-6">

              <div className="flex items-center gap-4">

                <span className="text-3xl">📦</span>

                <div>

                  <h3 className="font-semibold text-lg mb-1">მარაგების დეტალური</h3>

                  <p className="text-sm text-text-muted">დეტალური ანგარიშები მარაგების შესახებ</p>

                </div>

              </div>

            </CardBody>

          </Card>

        </Link>

      </div>

    </DashboardLayout>

  )

}
