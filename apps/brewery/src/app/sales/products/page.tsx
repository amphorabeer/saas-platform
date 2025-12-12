'use client'



import { useState } from 'react'

import { DashboardLayout } from '@/components/layout'

import { Card, CardHeader, CardBody, Button } from '@/components/ui'

import { formatDate, formatCurrency } from '@/lib/utils'



interface FinishedProduct {

  id: string

  batchId: string

  batchNumber: string

  productName: string

  style: string

  abv: number

  packageType: 'keg' | 'bottle' | 'can'

  packageSize: number

  quantity: number

  reservedQuantity: number

  availableQuantity: number

  pricePerUnit: number

  productionDate: Date

  expiryDate: Date

  status: 'available' | 'low_stock' | 'sold_out'

}



const mockProducts: FinishedProduct[] = [

  { id: '1', batchId: '1', batchNumber: 'BRW-2024-0156', productName: 'Georgian Amber Lager', style: 'Amber Lager', abv: 5.2, packageType: 'keg', packageSize: 30, quantity: 12, reservedQuantity: 2, availableQuantity: 10, pricePerUnit: 2400, productionDate: new Date('2024-12-01'), expiryDate: new Date('2025-03-15'), status: 'available' },

  { id: '2', batchId: '1', batchNumber: 'BRW-2024-0156', productName: 'Georgian Amber Lager', style: 'Amber Lager', abv: 5.2, packageType: 'bottle', packageSize: 0.5, quantity: 240, reservedQuantity: 60, availableQuantity: 180, pricePerUnit: 8, productionDate: new Date('2024-12-01'), expiryDate: new Date('2025-06-01'), status: 'available' },

  { id: '3', batchId: '2', batchNumber: 'BRW-2024-0155', productName: 'Tbilisi IPA', style: 'IPA', abv: 6.5, packageType: 'keg', packageSize: 30, quantity: 8, reservedQuantity: 2, availableQuantity: 6, pricePerUnit: 2600, productionDate: new Date('2024-11-25'), expiryDate: new Date('2025-02-25'), status: 'available' },

  { id: '4', batchId: '2', batchNumber: 'BRW-2024-0155', productName: 'Tbilisi IPA', style: 'IPA', abv: 6.5, packageType: 'bottle', packageSize: 0.5, quantity: 480, reservedQuantity: 160, availableQuantity: 320, pricePerUnit: 9, productionDate: new Date('2024-11-25'), expiryDate: new Date('2025-05-25'), status: 'available' },

  { id: '5', batchId: '3', batchNumber: 'BRW-2024-0154', productName: 'Kolkheti Wheat', style: 'Wheat', abv: 4.8, packageType: 'keg', packageSize: 30, quantity: 6, reservedQuantity: 2, availableQuantity: 4, pricePerUnit: 2200, productionDate: new Date('2024-11-20'), expiryDate: new Date('2025-02-20'), status: 'low_stock' },

  { id: '6', batchId: '4', batchNumber: 'BRW-2024-0153', productName: 'Caucasus Stout', style: 'Stout', abv: 5.8, packageType: 'bottle', packageSize: 0.33, quantity: 360, reservedQuantity: 80, availableQuantity: 280, pricePerUnit: 7, productionDate: new Date('2024-11-15'), expiryDate: new Date('2025-05-15'), status: 'available' },

  { id: '7', batchId: '5', batchNumber: 'BRW-2024-0152', productName: 'Svaneti Pilsner', style: 'Pilsner', abv: 4.5, packageType: 'keg', packageSize: 50, quantity: 4, reservedQuantity: 2, availableQuantity: 2, pricePerUnit: 3800, productionDate: new Date('2024-11-10'), expiryDate: new Date('2025-02-10'), status: 'low_stock' },

  { id: '8', batchId: '5', batchNumber: 'BRW-2024-0152', productName: 'Svaneti Pilsner', style: 'Pilsner', abv: 4.5, packageType: 'can', packageSize: 0.5, quantity: 600, reservedQuantity: 150, availableQuantity: 450, pricePerUnit: 6, productionDate: new Date('2024-11-10'), expiryDate: new Date('2025-08-10'), status: 'available' },

]



export default function ProductsPage() {

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const [typeFilter, setTypeFilter] = useState<string>('all')

  const [styleFilter, setStyleFilter] = useState<string>('all')

  const [statusFilter, setStatusFilter] = useState<string>('all')



  const filteredProducts = mockProducts.filter(product => {

    if (typeFilter !== 'all' && product.packageType !== typeFilter) return false

    if (styleFilter !== 'all' && product.style !== styleFilter) return false

    if (statusFilter !== 'all' && product.status !== statusFilter) return false

    return true

  })



  const getStatusBadge = (status: string) => {

    const config: Record<string, { label: string; color: string; bg: string }> = {

      available: { label: 'ხელმისაწვდომი', color: 'text-green-400', bg: 'bg-green-400/20' },

      low_stock: { label: 'მცირე მარაგი', color: 'text-amber-400', bg: 'bg-amber-400/20' },

      sold_out: { label: 'ამოიწურა', color: 'text-red-400', bg: 'bg-red-400/20' },

    }

    const c = config[status] || config.available

    return <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.color}`}>{c.label}</span>

  }



  const getPackageLabel = (type: string, size: number) => {

    if (type === 'keg') return `კეგი ${size}L`

    if (type === 'bottle') return `ბოთლი ${size}L`

    return `ქილა ${size}L`

  }



  return (

    <DashboardLayout title="მზა პროდუქცია" breadcrumb="მთავარი / გაყიდვები / მზა პროდუქცია">

      {/* Header */}

      <div className="flex justify-between items-center mb-6">

        <h1 className="text-2xl font-display font-bold">მზა პროდუქცია</h1>

        <div className="flex gap-2">

          <button

            onClick={() => setViewMode('grid')}

            className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-copper text-white' : 'bg-bg-tertiary'}`}

          >

            ▦

          </button>

          <button

            onClick={() => setViewMode('list')}

            className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-copper text-white' : 'bg-bg-tertiary'}`}

          >

            ☰

          </button>

        </div>

      </div>



      {/* Filters */}

      <Card className="mb-6">

        <CardBody>

          <div className="grid grid-cols-3 gap-4">

            <div>

              <label className="block text-xs text-text-muted mb-2">ტიპი</label>

              <select

                value={typeFilter}

                onChange={(e) => setTypeFilter(e.target.value)}

                className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm outline-none focus:border-copper"

              >

                <option value="all">ყველა</option>

                <option value="keg">კეგი</option>

                <option value="bottle">ბოთლი</option>

                <option value="can">ქილა</option>

              </select>

            </div>

            <div>

              <label className="block text-xs text-text-muted mb-2">სტილი</label>

              <select

                value={styleFilter}

                onChange={(e) => setStyleFilter(e.target.value)}

                className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm outline-none focus:border-copper"

              >

                <option value="all">ყველა</option>

                <option value="Amber Lager">Amber Lager</option>

                <option value="IPA">IPA</option>

                <option value="Wheat">Wheat</option>

                <option value="Stout">Stout</option>

                <option value="Pilsner">Pilsner</option>

              </select>

            </div>

            <div>

              <label className="block text-xs text-text-muted mb-2">სტატუსი</label>

              <select

                value={statusFilter}

                onChange={(e) => setStatusFilter(e.target.value)}

                className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm outline-none focus:border-copper"

              >

                <option value="all">ყველა</option>

                <option value="available">ხელმისაწვდომი</option>

                <option value="low_stock">მცირე მარაგი</option>

                <option value="sold_out">ამოიწურა</option>

              </select>

            </div>

          </div>

        </CardBody>

      </Card>



      {/* Products Grid/List */}

      {viewMode === 'grid' ? (

        <div className="grid grid-cols-3 gap-6">

          {filteredProducts.map(product => (

            <Card key={product.id} className="hover:border-copper transition-colors">

              <CardBody>

                <div className="flex items-start justify-between mb-3">

                  <div className="flex-1">

                    <h3 className="font-medium text-lg mb-1">{product.productName}</h3>

                    <p className="text-xs text-text-muted">

                      {product.batchNumber} | {product.style} | {product.abv}% ABV

                    </p>

                  </div>

                  {getStatusBadge(product.status)}

                </div>



                <div className="mb-4 p-3 bg-bg-tertiary rounded-lg">

                  <p className="text-sm font-medium mb-2">📦 {getPackageLabel(product.packageType, product.packageSize)}</p>

                  <div className="space-y-1 text-sm">

                    <div className="flex justify-between">

                      <span className="text-text-muted">მარაგში:</span>

                      <span className="font-mono">{product.quantity} ცალი ({product.quantity * product.packageSize}L)</span>

                    </div>

                    <div className="flex justify-between">

                      <span className="text-text-muted">დაჯავშნილი:</span>

                      <span className="font-mono">{product.reservedQuantity} ცალი</span>

                    </div>

                    <div className="flex justify-between">

                      <span className="text-text-muted">ხელმისაწვდომი:</span>

                      <span className="font-mono text-green-400">{product.availableQuantity} ცალი</span>

                    </div>

                  </div>

                </div>



                <div className="mb-4">

                  <p className="text-sm text-text-muted mb-1">ფასი:</p>

                  <p className="text-xl font-bold font-mono text-copper-light">{formatCurrency(product.pricePerUnit)} / ცალი</p>

                </div>



                <div className="mb-4 text-xs text-text-muted">

                  <p>ვარგისი: {formatDate(product.expiryDate)}</p>

                </div>



                <Button variant="primary" className="w-full" disabled={product.status === 'sold_out'}>

                  + შეკვეთაში

                </Button>

              </CardBody>

            </Card>

          ))}

        </div>

      ) : (

        <Card>

          <CardBody noPadding>

            <table className="w-full">

              <thead>

                <tr className="bg-bg-tertiary border-b border-border text-left text-xs text-text-muted">

                  <th className="px-4 py-3">პროდუქტი</th>

                  <th className="px-4 py-3">პარტია</th>

                  <th className="px-4 py-3">ტიპი</th>

                  <th className="px-4 py-3">მარაგი</th>

                  <th className="px-4 py-3">ხელმისაწვდომი</th>

                  <th className="px-4 py-3">ფასი</th>

                  <th className="px-4 py-3">სტატუსი</th>

                  <th className="px-4 py-3"></th>

                </tr>

              </thead>

              <tbody>

                {filteredProducts.map(product => (

                  <tr key={product.id} className="border-b border-border/50 hover:bg-bg-tertiary/50">

                    <td className="px-4 py-3">

                      <p className="font-medium">{product.productName}</p>

                      <p className="text-xs text-text-muted">{product.style} | {product.abv}% ABV</p>

                    </td>

                    <td className="px-4 py-3 font-mono text-sm text-text-muted">{product.batchNumber}</td>

                    <td className="px-4 py-3 text-sm">{getPackageLabel(product.packageType, product.packageSize)}</td>

                    <td className="px-4 py-3 font-mono text-sm">{product.quantity} ცალი</td>

                    <td className="px-4 py-3 font-mono text-sm text-green-400">{product.availableQuantity} ცალი</td>

                    <td className="px-4 py-3 font-mono">{formatCurrency(product.pricePerUnit)}</td>

                    <td className="px-4 py-3">{getStatusBadge(product.status)}</td>

                    <td className="px-4 py-3">

                      <Button variant="primary" size="sm" disabled={product.status === 'sold_out'}>

                        + შეკვეთაში

                      </Button>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </CardBody>

        </Card>

      )}

    </DashboardLayout>

  )

}


