'use client'



import { useState } from 'react'

import Link from 'next/link'

import { DashboardLayout } from '@/components/layout'

import { Card, CardHeader, CardBody, Button } from '@/components/ui'

import { StatCard, LineChart, DonutChart } from '@/components/reports'

import { formatCurrency } from '@/lib/utils'



const monthlySales = [

  { month: 'იან', revenue: 8500, orders: 12 },

  { month: 'თებ', revenue: 9200, orders: 14 },

  { month: 'მარ', revenue: 10500, orders: 15 },

  { month: 'აპრ', revenue: 11200, orders: 16 },

  { month: 'მაი', revenue: 12800, orders: 18 },

  { month: 'ივნ', revenue: 11500, orders: 14 },

  { month: 'ივლ', revenue: 13500, orders: 19 },

  { month: 'აგვ', revenue: 12200, orders: 16 },

  { month: 'სექ', revenue: 11800, orders: 15 },

  { month: 'ოქტ', revenue: 10900, orders: 13 },

  { month: 'ნოე', revenue: 10200, orders: 12 },

  { month: 'დეკ', revenue: 12600, orders: 16 },

]



const salesByProduct = [

  { product: 'Georgian Amber Lager', type: 'კეგი 30L', sold: 85, revenue: 204000, percentage: 38 },

  { product: 'Georgian Amber Lager', type: 'ბოთლი 0.5L', sold: 1200, revenue: 9600, percentage: 8 },

  { product: 'Tbilisi IPA', type: 'კეგი 30L', sold: 65, revenue: 169000, percentage: 32 },

  { product: 'Tbilisi IPA', type: 'ბოთლი 0.5L', sold: 800, revenue: 7200, percentage: 6 },

  { product: 'Kolkheti Wheat', type: 'კეგი 30L', sold: 45, revenue: 99000, percentage: 18 },

  { product: 'Caucasus Stout', type: 'ბოთლი 0.33L', sold: 600, revenue: 4200, percentage: 4 },

]



const salesByCustomer = [

  { customer: 'BeerGe', type: 'დისტრიბუტორი', orders: 35, revenue: 125000, avgOrder: 3571 },

  { customer: 'ფუნიკულიორი', type: 'რესტორანი', orders: 15, revenue: 42000, avgOrder: 2800 },

  { customer: 'Wine Bar 8000', type: 'ბარი', orders: 12, revenue: 28500, avgOrder: 2375 },

  { customer: 'სუპერმარკეტი გუდვილი', type: 'მაღაზია', orders: 22, revenue: 35600, avgOrder: 1618 },

  { customer: 'პაბი London', type: 'ბარი', orders: 18, revenue: 31400, avgOrder: 1744 },

]



const salesByRegion = [

  { region: 'თბილისი', percentage: 75, color: '#B87333' },

  { region: 'ბათუმი', percentage: 15, color: '#F59E0B' },

  { region: 'სხვა', percentage: 10, color: '#6B7280' },

]



const totalRevenue = monthlySales.reduce((sum, m) => sum + m.revenue, 0)

const totalOrders = monthlySales.reduce((sum, m) => sum + m.orders, 0)

const avgOrder = totalRevenue / totalOrders

const totalCustomers = salesByCustomer.length



export default function SalesReportsPage() {

  const [period, setPeriod] = useState('year')



  const handleExportPDF = () => {

    console.log('Exporting Sales Report to PDF...')

  }



  const handleExportExcel = () => {

    console.log('Exporting Sales Report to Excel...')

  }



  return (

    <DashboardLayout title="გაყიდვების ანგარიში" breadcrumb="მთავარი / ანგარიშები / გაყიდვები">

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

        <StatCard title="სულ გაყიდვები" value={formatCurrency(totalRevenue)} icon="💰" color="green" />

        <StatCard title="შეკვეთების რაოდენობა" value={totalOrders.toString()} icon="📦" color="blue" />

        <StatCard title="საშუალო შეკვეთა" value={formatCurrency(Math.round(avgOrder))} icon="📊" color="amber" />

        <StatCard title="კლიენტების რაოდენობა" value={totalCustomers.toString()} icon="👥" color="purple" />

      </div>



      {/* Sales Chart - Full Width */}

      <Card className="mb-6">

        <CardHeader>

          <span className="text-lg font-semibold">გაყიდვების ტრენდი (12 თვე)</span>

        </CardHeader>

        <CardBody>

          <LineChart data={monthlySales.map(m => ({ label: m.month, value: m.revenue }))} height={300} fillArea={true} />

        </CardBody>

      </Card>



      {/* Sales by Product */}

      <Card className="mb-6">

        <CardHeader>

          <span className="text-lg font-semibold">გაყიდვები პროდუქტის მიხედვით</span>

        </CardHeader>

        <CardBody>

          <div className="overflow-x-auto">

            <table className="w-full">

              <thead>

                <tr className="border-b border-border">

                  <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">პროდუქტი</th>

                  <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">ტიპი</th>

                  <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">გაყიდული</th>

                  <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">შემოსავალი</th>

                  <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">წილი</th>

                </tr>

              </thead>

              <tbody>

                {salesByProduct.map((item, index) => (

                  <tr key={index} className="border-b border-border/50 hover:bg-bg-tertiary transition-colors">

                    <td className="py-3 px-4 text-sm font-medium text-text-primary">{item.product}</td>

                    <td className="py-3 px-4 text-sm text-text-muted">{item.type}</td>

                    <td className="py-3 px-4 text-sm text-text-primary text-right">{item.sold.toLocaleString('en-US')}</td>

                    <td className="py-3 px-4 text-sm font-medium text-copper-light text-right">{formatCurrency(item.revenue)}</td>

                    <td className="py-3 px-4 text-right">

                      <div className="flex items-center justify-end gap-2">

                        <div className="w-24 h-2 bg-bg-tertiary rounded-full overflow-hidden">

                          <div

                            className="h-full bg-gradient-to-r from-copper to-amber-400"

                            style={{ width: `${item.percentage}%` }}

                          />

                        </div>

                        <span className="text-sm text-text-muted w-10 text-right">{item.percentage}%</span>

                      </div>

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

        {/* Sales by Customer */}

        <Card>

          <CardHeader>

            <span className="text-lg font-semibold">გაყიდვები კლიენტის მიხედვით</span>

          </CardHeader>

          <CardBody>

            <div className="overflow-x-auto">

              <table className="w-full">

                <thead>

                  <tr className="border-b border-border">

                    <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">კლიენტი</th>

                    <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">ტიპი</th>

                    <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">შეკვეთები</th>

                    <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">შემოსავალი</th>

                    <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">საშუალო</th>

                  </tr>

                </thead>

                <tbody>

                  {salesByCustomer.map((customer, index) => (

                    <tr key={index} className="border-b border-border/50 hover:bg-bg-tertiary transition-colors">

                      <td className="py-3 px-4 text-sm font-medium text-text-primary">{customer.customer}</td>

                      <td className="py-3 px-4 text-sm text-text-muted">{customer.type}</td>

                      <td className="py-3 px-4 text-sm text-text-primary text-right">{customer.orders}</td>

                      <td className="py-3 px-4 text-sm font-medium text-copper-light text-right">{formatCurrency(customer.revenue)}</td>

                      <td className="py-3 px-4 text-sm text-text-muted text-right">{formatCurrency(customer.avgOrder)}</td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          </CardBody>

        </Card>



        {/* Sales by Region */}

        <Card>

          <CardHeader>

            <span className="text-lg font-semibold">გაყიდვები რეგიონის მიხედვით</span>

          </CardHeader>

          <CardBody>

            <DonutChart data={salesByRegion} centerText="100%" size={220} />

          </CardBody>

        </Card>

      </div>

    </DashboardLayout>

  )

}

