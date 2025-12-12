'use client'



import { useState } from 'react'

import { DashboardLayout } from '@/components/layout'

import { Card, CardHeader, CardBody, Button } from '@/components/ui'

import { formatDate } from '@/lib/utils'

import { KegReturnModal } from '@/components/sales'



interface Keg {

  id: string

  kegNumber: string

  size: number

  status: 'in_stock' | 'filled' | 'with_customer' | 'in_transit' | 'damaged' | 'lost'

  productName?: string

  customerId?: string

  customerName?: string

  orderId?: string

  sentDate?: Date

  deposit: number

  condition?: 'good' | 'needs_cleaning' | 'damaged'

}



const mockKegs: Keg[] = [

  { id: '1', kegNumber: 'KEG-001', size: 30, status: 'with_customer', productName: 'Georgian Amber', customerId: '1', customerName: 'ფუნიკულიორი', orderId: 'ORD-2024-0045', sentDate: new Date('2024-12-10'), deposit: 150 },

  { id: '2', kegNumber: 'KEG-002', size: 30, status: 'with_customer', productName: 'Georgian Amber', customerId: '1', customerName: 'ფუნიკულიორი', orderId: 'ORD-2024-0045', sentDate: new Date('2024-12-10'), deposit: 150 },

  { id: '3', kegNumber: 'KEG-003', size: 30, status: 'in_stock', productName: 'ცარიელი', deposit: 150, condition: 'good' },

  { id: '4', kegNumber: 'KEG-004', size: 30, status: 'in_stock', productName: 'ცარიელი', deposit: 150, condition: 'good' },

  { id: '5', kegNumber: 'KEG-005', size: 30, status: 'filled', productName: 'Tbilisi IPA', deposit: 150 },

  { id: '6', kegNumber: 'KEG-006', size: 30, status: 'filled', productName: 'Tbilisi IPA', deposit: 150 },

  { id: '7', kegNumber: 'KEG-007', size: 30, status: 'in_stock', productName: 'ცარიელი', deposit: 150, condition: 'good' },

  { id: '8', kegNumber: 'KEG-008', size: 30, status: 'in_stock', productName: 'ცარიელი', deposit: 150, condition: 'good' },

  { id: '9', kegNumber: 'KEG-009', size: 50, status: 'with_customer', productName: 'Kolkheti Wheat', customerId: '2', customerName: 'Wine Bar "8000"', orderId: 'ORD-2024-0044', sentDate: new Date('2024-12-08'), deposit: 200 },

  { id: '10', kegNumber: 'KEG-010', size: 50, status: 'in_stock', productName: 'ცარიელი', deposit: 200, condition: 'good' },

  { id: '11', kegNumber: 'KEG-011', size: 30, status: 'in_stock', productName: 'ცარიელი', deposit: 150, condition: 'good' },

  { id: '12', kegNumber: 'KEG-012', size: 30, status: 'in_stock', productName: 'ცარიელი', deposit: 150, condition: 'good' },

  { id: '13', kegNumber: 'KEG-013', size: 30, status: 'with_customer', productName: 'Georgian Amber', customerId: '5', customerName: 'პაბი "London"', orderId: 'ORD-2024-0043', sentDate: new Date('2024-12-05'), deposit: 150 },

  { id: '14', kegNumber: 'KEG-014', size: 30, status: 'with_customer', productName: 'Georgian Amber', customerId: '5', customerName: 'პაბი "London"', orderId: 'ORD-2024-0043', sentDate: new Date('2024-12-05'), deposit: 150 },

  { id: '15', kegNumber: 'KEG-015', size: 30, status: 'in_stock', productName: 'ცარიელი', deposit: 150, condition: 'good' },

  { id: '16', kegNumber: 'KEG-016', size: 50, status: 'in_stock', productName: 'ცარიელი', deposit: 200, condition: 'good' },

  { id: '17', kegNumber: 'KEG-017', size: 30, status: 'damaged', deposit: 150, condition: 'damaged' },

  { id: '18', kegNumber: 'KEG-018', size: 30, status: 'damaged', deposit: 150, condition: 'damaged' },

  { id: '19', kegNumber: 'KEG-019', size: 30, status: 'in_stock', productName: 'ცარიელი', deposit: 150, condition: 'good' },

  { id: '20', kegNumber: 'KEG-020', size: 50, status: 'in_stock', productName: 'ცარიელი', deposit: 200, condition: 'good' },

]



const mockCustomers = [

  'ფუნიკულიორი',

  'Wine Bar "8000"',

  'Craft Corner',

]



export default function KegsPage() {

  const [statusFilter, setStatusFilter] = useState<string>('all')

  const [sizeFilter, setSizeFilter] = useState<string>('all')

  const [customerFilter, setCustomerFilter] = useState<string>('all')

  const [selectedKegForReturn, setSelectedKegForReturn] = useState<Keg | null>(null)

  const [showKegReturn, setShowKegReturn] = useState(false)



  const filteredKegs = mockKegs.filter(keg => {

    if (statusFilter !== 'all' && keg.status !== statusFilter) return false

    if (sizeFilter !== 'all' && keg.size !== Number(sizeFilter)) return false

    if (customerFilter !== 'all' && keg.customerName !== customerFilter) return false

    return true

  })



  const stats = {

    total: mockKegs.length,

    inStock: mockKegs.filter(k => k.status === 'in_stock' || k.status === 'filled').length,

    withCustomer: mockKegs.filter(k => k.status === 'with_customer').length,

    inTransit: mockKegs.filter(k => k.status === 'in_transit').length,

    damaged: mockKegs.filter(k => k.status === 'damaged').length,

  }



  const getStatusBadge = (status: string) => {

    const config: Record<string, { label: string; icon: string; color: string; bg: string }> = {

      in_stock: { label: 'საწყობში', icon: '🏠', color: 'text-green-400', bg: 'bg-green-400/20' },

      filled: { label: 'შევსებული', icon: '🍺', color: 'text-copper-light', bg: 'bg-copper/20' },

      with_customer: { label: 'კლიენტთან', icon: '👤', color: 'text-blue-400', bg: 'bg-blue-400/20' },

      in_transit: { label: 'გზაში', icon: '🚚', color: 'text-amber-400', bg: 'bg-amber-400/20' },

      damaged: { label: 'დაზიანებული', icon: '⚠️', color: 'text-red-400', bg: 'bg-red-400/20' },

      lost: { label: 'დაკარგული', icon: '❌', color: 'text-gray-400', bg: 'bg-gray-400/20' },

    }

    const c = config[status] || config.in_stock

    return <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.color}`}>{c.icon} {c.label}</span>

  }



  return (

    <DashboardLayout title="კეგების მენეჯმენტი" breadcrumb="მთავარი / მარაგები / კეგები">

      {/* Header */}

      <div className="flex justify-between items-center mb-6">

        <h1 className="text-2xl font-display font-bold">კეგების მენეჯმენტი</h1>

        <Button variant="primary">+ ახალი კეგი</Button>

      </div>



      {/* Stats Cards */}

      <div className="grid grid-cols-5 gap-4 mb-6">

        <Card>

          <CardBody className="p-4">

            <p className="text-2xl font-bold font-display">{stats.total}</p>

            <p className="text-xs text-text-muted">🛢️ სულ კეგი</p>

          </CardBody>

        </Card>

        <Card>

          <CardBody className="p-4">

            <p className="text-2xl font-bold font-display text-green-400">{stats.inStock}</p>

            <p className="text-xs text-text-muted">🏠 საწყობში</p>

          </CardBody>

        </Card>

        <Card>

          <CardBody className="p-4">

            <p className="text-2xl font-bold font-display text-blue-400">{stats.withCustomer}</p>

            <p className="text-xs text-text-muted">👤 კლიენტთან</p>

          </CardBody>

        </Card>

        <Card>

          <CardBody className="p-4">

            <p className="text-2xl font-bold font-display text-amber-400">{stats.inTransit}</p>

            <p className="text-xs text-text-muted">🚚 გზაში</p>

          </CardBody>

        </Card>

        <Card>

          <CardBody className="p-4">

            <p className="text-2xl font-bold font-display text-red-400">{stats.damaged}</p>

            <p className="text-xs text-text-muted">⚠️ დაზიანებული</p>

          </CardBody>

        </Card>

      </div>



      {/* Filters */}

      <Card className="mb-6">

        <CardBody>

          <div className="grid grid-cols-3 gap-4">

            <div>

              <label className="block text-xs text-text-muted mb-2">სტატუსი</label>

              <select

                value={statusFilter}

                onChange={(e) => setStatusFilter(e.target.value)}

                className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm outline-none focus:border-copper"

              >

                <option value="all">ყველა</option>

                <option value="in_stock">საწყობში</option>

                <option value="filled">შევსებული</option>

                <option value="with_customer">კლიენტთან</option>

                <option value="in_transit">გზაში</option>

                <option value="damaged">დაზიანებული</option>

                <option value="lost">დაკარგული</option>

              </select>

            </div>

            <div>

              <label className="block text-xs text-text-muted mb-2">ზომა</label>

              <select

                value={sizeFilter}

                onChange={(e) => setSizeFilter(e.target.value)}

                className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm outline-none focus:border-copper"

              >

                <option value="all">ყველა</option>

                <option value="30">30L</option>

                <option value="50">50L</option>

              </select>

            </div>

            <div>

              <label className="block text-xs text-text-muted mb-2">კლიენტი</label>

              <select

                value={customerFilter}

                onChange={(e) => setCustomerFilter(e.target.value)}

                className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm outline-none focus:border-copper"

              >

                <option value="all">ყველა</option>

                {mockCustomers.map(customer => (

                  <option key={customer} value={customer}>{customer}</option>

                ))}

              </select>

            </div>

          </div>

        </CardBody>

      </Card>



      {/* Kegs Table */}

      <Card>

        <CardHeader>🛢️ კეგების სია ({filteredKegs.length})</CardHeader>

        <CardBody noPadding>

          <table className="w-full">

            <thead>

              <tr className="bg-bg-tertiary border-b border-border text-left text-xs text-text-muted">

                <th className="px-4 py-3">კეგი #</th>

                <th className="px-4 py-3">ზომა</th>

                <th className="px-4 py-3">სტატუსი</th>

                <th className="px-4 py-3">პროდუქტი</th>

                <th className="px-4 py-3">კლიენტი</th>

                <th className="px-4 py-3">გაგზავნის თარიღი</th>

                <th className="px-4 py-3">შეკვეთა</th>

                <th className="px-4 py-3"></th>

              </tr>

            </thead>

            <tbody>

              {filteredKegs.map(keg => (

                <tr key={keg.id} className="border-b border-border/50 hover:bg-bg-tertiary/50">

                  <td className="px-4 py-3 font-mono text-sm text-copper-light">{keg.kegNumber}</td>

                  <td className="px-4 py-3 font-mono text-sm">{keg.size}L</td>

                  <td className="px-4 py-3">{getStatusBadge(keg.status)}</td>

                  <td className="px-4 py-3 text-sm">{keg.productName || '-'}</td>

                  <td className="px-4 py-3 text-sm">{keg.customerName || '-'}</td>

                  <td className="px-4 py-3 text-sm text-text-muted">{keg.sentDate ? formatDate(keg.sentDate) : '-'}</td>

                  <td className="px-4 py-3 font-mono text-sm text-text-muted">{keg.orderId || '-'}</td>

                  <td className="px-4 py-3">

                    {keg.status === 'with_customer' && (

                      <Button 

                        variant="secondary" 

                        size="sm"

                        onClick={() => {

                          setSelectedKegForReturn(keg)

                          setShowKegReturn(true)

                        }}

                      >

                        დაბრუნება

                      </Button>

                    )}

                    {keg.status === 'in_stock' && keg.productName === 'ცარიელი' && (

                      <Button variant="secondary" size="sm">შევსება</Button>

                    )}

                    {keg.status === 'damaged' && (

                      <Button variant="secondary" size="sm">რემონტი</Button>

                    )}

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </CardBody>

      </Card>



      {/* Keg Return Modal */}

      {selectedKegForReturn && (

        <KegReturnModal

          isOpen={showKegReturn}

          onClose={() => {

            setShowKegReturn(false)

            setSelectedKegForReturn(null)

          }}

          onConfirm={(returnData) => {

            console.log('Keg returned:', returnData)

            // Update keg status

            setShowKegReturn(false)

            setSelectedKegForReturn(null)

            alert('კეგი დაბრუნდა!')

          }}

          orderId={selectedKegForReturn.orderId}

          customerName={selectedKegForReturn.customerName}

          kegs={[{

            id: selectedKegForReturn.id,

            kegNumber: selectedKegForReturn.kegNumber,

            size: selectedKegForReturn.size,

            productName: selectedKegForReturn.productName || '',

            deposit: selectedKegForReturn.deposit,

          }]}

        />

      )}

    </DashboardLayout>

  )

}


