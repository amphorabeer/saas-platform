'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout'
import { Card, CardHeader, CardBody, Button } from '@/components/ui'
import { formatDate, formatCurrency } from '@/lib/utils'
import { customers as centralCustomers, orders as centralOrders } from '@/data/centralData'

interface Customer {
  id: string
  name: string
  type: 'restaurant' | 'bar' | 'shop' | 'distributor' | 'other'
  city: string
  address: string
  phone: string
  email: string
  totalOrders: number
  totalRevenue: number
  lastOrderDate: Date
}

// Transform central customers to page format
const mockCustomers: Customer[] = centralCustomers.map((c, index) => {
  const customerOrders = centralOrders.filter(o => o.customerId === c.id)
  const totalRevenue = customerOrders.reduce((sum, o) => sum + o.total, 0)
  const lastOrder = customerOrders.sort((a, b) => b.orderDate.getTime() - a.orderDate.getTime())[0]

  return {
    id: c.id,
    name: c.name,
    type: c.type,
    city: c.city,
    address: c.address,
    phone: c.phone,
    email: c.email,
    totalOrders: customerOrders.length + (index % 10),
    totalRevenue: totalRevenue || (index + 1) * 5000,
    lastOrderDate: lastOrder?.orderDate || new Date(),
  }
})

const cities = ['თბილისი', 'ბათუმი', 'ყველა']



export default function CustomersPage() {

  const router = useRouter()

  const [typeFilter, setTypeFilter] = useState<string>('all')

  const [cityFilter, setCityFilter] = useState<string>('all')

  const [searchQuery, setSearchQuery] = useState('')



  const filteredCustomers = mockCustomers.filter(customer => {

    if (typeFilter !== 'all' && customer.type !== typeFilter) return false

    if (cityFilter !== 'all' && customer.city !== cityFilter) return false

    if (searchQuery && !customer.name.toLowerCase().includes(searchQuery.toLowerCase()) &&

        !customer.email.toLowerCase().includes(searchQuery.toLowerCase())) return false

    return true

  })



  const getTypeIcon = (type: string) => {

    const icons: Record<string, string> = {

      restaurant: '🍽️',

      bar: '🍷',

      shop: '🏪',

      distributor: '🏭',

    }

    return icons[type] || '🏢'

  }



  const getTypeLabel = (type: string) => {

    const labels: Record<string, string> = {

      restaurant: 'რესტორანი',

      bar: 'ბარი',

      shop: 'მაღაზია',

      distributor: 'დისტრიბუტორი',

    }

    return labels[type] || type

  }



  return (

    <DashboardLayout title="მომხმარებლები" breadcrumb="მთავარი / გაყიდვები / მომხმარებლები">

      {/* Header */}

      <div className="flex justify-between items-center mb-6">

        <h1 className="text-2xl font-display font-bold">მომხმარებლები</h1>

        <div className="flex gap-2">

          <input

            type="text"

            placeholder="ძიება..."

            value={searchQuery}

            onChange={(e) => setSearchQuery(e.target.value)}

            className="px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-sm w-64 focus:border-copper focus:outline-none"

          />

          <Button variant="primary">+ ახალი კლიენტი</Button>

        </div>

      </div>



      {/* Filters */}

      <Card className="mb-6">

        <CardBody>

          <div className="grid grid-cols-2 gap-4">

            <div>

              <label className="block text-xs text-text-muted mb-2">ტიპი</label>

              <select

                value={typeFilter}

                onChange={(e) => setTypeFilter(e.target.value)}

                className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm outline-none focus:border-copper"

              >

                <option value="all">ყველა</option>

                <option value="restaurant">რესტორანი</option>

                <option value="bar">ბარი</option>

                <option value="shop">მაღაზია</option>

                <option value="distributor">დისტრიბუტორი</option>

              </select>

            </div>

            <div>

              <label className="block text-xs text-text-muted mb-2">ქალაქი</label>

              <select

                value={cityFilter}

                onChange={(e) => setCityFilter(e.target.value)}

                className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm outline-none focus:border-copper"

              >

                {cities.map(city => (

                  <option key={city} value={city === 'ყველა' ? 'all' : city}>{city}</option>

                ))}

              </select>

            </div>

          </div>

        </CardBody>

      </Card>



      {/* Customers Table */}

      <Card>

        <CardHeader>👥 მომხმარებლების სია ({filteredCustomers.length})</CardHeader>

        <CardBody noPadding>

          <table className="w-full">

            <thead>

              <tr className="bg-bg-tertiary border-b border-border text-left text-xs text-text-muted">

                <th className="px-4 py-3">სახელი</th>

                <th className="px-4 py-3">ტიპი</th>

                <th className="px-4 py-3">ქალაქი</th>

                <th className="px-4 py-3">შეკვეთები</th>

                <th className="px-4 py-3">სულ გაყიდვა</th>

                <th className="px-4 py-3">ბოლო შეკვეთა</th>

                <th className="px-4 py-3"></th>

              </tr>

            </thead>

            <tbody>

              {filteredCustomers.map(customer => (

                <tr 

                  key={customer.id} 

                  className="border-b border-border/50 hover:bg-bg-tertiary/50 cursor-pointer transition-colors"

                >

                  <td className="px-4 py-3">

                    <p className="font-medium">{customer.name}</p>

                    <p className="text-xs text-text-muted">{customer.email}</p>

                  </td>

                  <td className="px-4 py-3">

                    <span className="inline-flex items-center gap-1 text-sm">

                      {getTypeIcon(customer.type)} {getTypeLabel(customer.type)}

                    </span>

                  </td>

                  <td className="px-4 py-3 text-sm">{customer.city}</td>

                  <td className="px-4 py-3 font-mono">{customer.totalOrders}</td>

                  <td className="px-4 py-3 font-mono">{formatCurrency(customer.totalRevenue)}</td>

                  <td className="px-4 py-3 text-sm text-text-muted">{formatDate(customer.lastOrderDate)}</td>

                  <td className="px-4 py-3">

                    <Button variant="ghost" size="sm">→</Button>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </CardBody>

      </Card>

    </DashboardLayout>

  )

}
