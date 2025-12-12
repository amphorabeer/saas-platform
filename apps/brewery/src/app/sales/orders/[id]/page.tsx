'use client'



import { useState, useEffect } from 'react'

import { useParams, useRouter } from 'next/navigation'

import { DashboardLayout } from '@/components/layout'

import { Card, CardHeader, CardBody, Button } from '@/components/ui'

import { formatDate, formatTime, formatCurrency } from '@/lib/utils'

import { KegReturnModal } from '@/components/sales'



interface OrderItem {

  productId: string

  productName: string

  batchNumber: string

  packageType: string

  quantity: number

  pricePerUnit: number

  total: number

}



interface Keg {

  kegNumber: string

  size: number

  productName: string

  deposit: number

  status: 'with_customer' | 'returned'

  returnDate?: Date

}



interface TimelineEvent {

  date: Date

  type: 'created' | 'confirmed' | 'shipped' | 'keg_returned' | 'delivered'

  user: string

  note?: string

  kegs?: string[]

}



interface OrderDetail {

  id: string

  orderNumber: string

  customerId: string

  customerName: string

  customerType: string

  customerAddress: string

  customerPhone: string

  customerEmail: string

  status: string

  paymentStatus: string

  paymentMethod: string

  paymentDate?: Date

  items: OrderItem[]

  kegs: Keg[]

  subtotal: number

  deposit: number

  discount: number

  total: number

  orderDate: Date

  deliveryDate: Date

  deliveryAddress: string

  deliveryTime: string

  deliveryNote: string

  timeline: TimelineEvent[]

}



const mockOrder: OrderDetail = {

  id: '1',

  orderNumber: 'ORD-2024-0045',

  customerId: '1',

  customerName: 'რესტორანი "ფუნიკულიორი"',

  customerType: 'restaurant',

  customerAddress: 'რუსთაველის 12, თბილისი',

  customerPhone: '+995 555 123 456',

  customerEmail: 'info@funikuliori.ge',

  status: 'shipped',

  paymentStatus: 'paid',

  paymentMethod: 'საბანკო გადარიცხვა',

  paymentDate: new Date('2024-12-10'),

  items: [

    { productId: '1', productName: 'Georgian Amber Lager', batchNumber: 'BRW-2024-0156', packageType: 'კეგი 30L', quantity: 4, pricePerUnit: 2400, total: 9600 },

  ],

  kegs: [

    { kegNumber: 'KEG-001', size: 30, productName: 'Georgian Amber', deposit: 150, status: 'with_customer' },

    { kegNumber: 'KEG-002', size: 30, productName: 'Georgian Amber', deposit: 150, status: 'with_customer' },

    { kegNumber: 'KEG-013', size: 30, productName: 'Georgian Amber', deposit: 150, status: 'with_customer' },

    { kegNumber: 'KEG-014', size: 30, productName: 'Georgian Amber', deposit: 150, status: 'returned', returnDate: new Date('2024-12-13') },

  ],

  subtotal: 9600,

  deposit: 600,

  discount: 0,

  total: 10200,

  orderDate: new Date('2024-12-10'),

  deliveryDate: new Date('2024-12-12'),

  deliveryAddress: 'რუსთაველის 12, თბილისი',

  deliveryTime: '14:00 - 16:00',

  deliveryNote: 'უკანა შესასვლელი',

  timeline: [

    { date: new Date('2024-12-10T10:00'), type: 'created', user: 'ნ. ზედგინიძე' },

    { date: new Date('2024-12-10T10:30'), type: 'confirmed', user: 'გ. კაპანაძე' },

    { date: new Date('2024-12-12T14:00'), type: 'shipped', user: 'ნ. ზედგინიძე', note: 'კეგები: KEG-001, KEG-002, KEG-013, KEG-014', kegs: ['KEG-001', 'KEG-002', 'KEG-013', 'KEG-014'] },

    { date: new Date('2024-12-13T11:00'), type: 'keg_returned', user: 'ნ. ზედგინიძე', note: 'KEG-014 დაბრუნდა' },

  ],

}



export default function OrderDetailPage() {

  const params = useParams()

  const router = useRouter()

  const [order, setOrder] = useState<OrderDetail | null>(null)

  const [showKegReturn, setShowKegReturn] = useState(false)



  useEffect(() => {

    setOrder(mockOrder)

  }, [params.id])



  if (!order) {

    return (

      <DashboardLayout title="იტვირთება..." breadcrumb="მთავარი / გაყიდვები / შეკვეთები">

        <div className="flex items-center justify-center h-64">

          <div className="animate-spin w-8 h-8 border-2 border-copper border-t-transparent rounded-full" />

        </div>

      </DashboardLayout>

    )

  }



  const getStatusBadge = (status: string) => {

    const config: Record<string, { label: string; color: string; bg: string }> = {

      draft: { label: 'დრაფტი', color: 'text-gray-400', bg: 'bg-gray-400/20' },

      confirmed: { label: 'დადასტურებული', color: 'text-blue-400', bg: 'bg-blue-400/20' },

      processing: { label: 'დამუშავებაში', color: 'text-amber-400', bg: 'bg-amber-400/20' },

      shipped: { label: 'გაგზავნილი', color: 'text-purple-400', bg: 'bg-purple-400/20' },

      delivered: { label: 'მიღებული', color: 'text-green-400', bg: 'bg-green-400/20' },

      cancelled: { label: 'გაუქმებული', color: 'text-red-400', bg: 'bg-red-400/20' },

    }

    const c = config[status] || config.draft

    return <span className={`inline-flex px-3 py-1.5 rounded-full text-sm font-medium ${c.bg} ${c.color}`}>{c.label}</span>

  }



  const getPaymentBadge = (status: string) => {

    const config: Record<string, { label: string; color: string; bg: string }> = {

      pending: { label: 'გადახდის მოლოდინში', color: 'text-amber-400', bg: 'bg-amber-400/20' },

      partial: { label: 'ნაწილობრივ გადახდილი', color: 'text-orange-400', bg: 'bg-orange-400/20' },

      paid: { label: 'გადახდილი', color: 'text-green-400', bg: 'bg-green-400/20' },

    }

    const c = config[status] || config.paid

    return <span className={`inline-flex px-3 py-1.5 rounded-full text-sm font-medium ${c.bg} ${c.color}`}>{c.label}</span>

  }



  const getTimelineIcon = (type: string) => {

    const icons: Record<string, string> = {

      created: '🟢',

      confirmed: '🔵',

      shipped: '🟣',

      keg_returned: '🔵',

      delivered: '🟢',

    }

    return icons[type] || '⚪'

  }



  const returnedKegs = order.kegs.filter(k => k.status === 'returned').length

  const totalDeposit = order.kegs.reduce((sum, k) => sum + k.deposit, 0)

  const returnedDeposit = order.kegs.filter(k => k.status === 'returned').reduce((sum, k) => sum + k.deposit, 0)



  return (

    <DashboardLayout 

      title={order.orderNumber} 

      breadcrumb={`მთავარი / გაყიდვები / შეკვეთები / ${order.orderNumber}`}

    >

      {/* Header Card */}

      <Card className="mb-6">

        <CardBody>

          <div className="flex items-start justify-between">

            <div className="flex items-center gap-4">

              <div className="w-16 h-16 rounded-2xl bg-gradient-copper flex items-center justify-center text-3xl">

                📦

              </div>

              <div>

                <div className="flex items-center gap-3 mb-1">

                  <h1 className="text-2xl font-display font-bold">{order.orderNumber}</h1>

                  {getStatusBadge(order.status)}

                  {getPaymentBadge(order.paymentStatus)}

                </div>

                <p className="text-text-muted">{order.customerName}</p>

              </div>

            </div>

            <div className="flex gap-2">

              <Button variant="ghost" onClick={() => router.back()}>← უკან</Button>

              <Button variant="secondary">✏️ რედაქტირება</Button>

              <Button variant="secondary">📄 PDF</Button>

              <select className="px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-sm outline-none focus:border-copper">

                <option>სტატუსის შეცვლა</option>

                <option>დადასტურება</option>

                <option>გაგზავნა</option>

                <option>დასრულება</option>

              </select>

            </div>

          </div>

        </CardBody>

      </Card>



      <div className="grid grid-cols-3 gap-6">

        {/* Left Column (2/3) */}

        <div className="col-span-2 space-y-6">

          {/* Products Card */}

          <Card>

            <CardHeader>📦 შეკვეთის პროდუქტები</CardHeader>

            <CardBody noPadding>

              <table className="w-full">

                <thead>

                  <tr className="bg-bg-tertiary border-b border-border text-left text-xs text-text-muted">

                    <th className="px-4 py-3">პროდუქტი</th>

                    <th className="px-4 py-3">პარტია</th>

                    <th className="px-4 py-3">ტიპი</th>

                    <th className="px-4 py-3">რაოდენობა</th>

                    <th className="px-4 py-3">ფასი</th>

                    <th className="px-4 py-3 text-right">სულ</th>

                  </tr>

                </thead>

                <tbody>

                  {order.items.map((item, i) => (

                    <tr key={i} className="border-b border-border/50">

                      <td className="px-4 py-3 text-sm">{item.productName}</td>

                      <td className="px-4 py-3 text-sm font-mono text-text-muted">{item.batchNumber}</td>

                      <td className="px-4 py-3 text-sm text-text-muted">{item.packageType}</td>

                      <td className="px-4 py-3 font-mono">{item.quantity}</td>

                      <td className="px-4 py-3 font-mono">{formatCurrency(item.pricePerUnit)}</td>

                      <td className="px-4 py-3 font-mono text-right">{formatCurrency(item.total)}</td>

                    </tr>

                  ))}

                </tbody>

                <tfoot className="bg-bg-tertiary">

                  <tr>

                    <td colSpan={5} className="px-4 py-3 text-sm text-right">ქვეჯამი:</td>

                    <td className="px-4 py-3 font-mono text-right">{formatCurrency(order.subtotal)}</td>

                  </tr>

                  <tr>

                    <td colSpan={5} className="px-4 py-3 text-sm text-right">ფასდაკლება:</td>

                    <td className="px-4 py-3 font-mono text-right">{formatCurrency(order.discount)}</td>

                  </tr>

                  <tr className="border-t border-border">

                    <td colSpan={5} className="px-4 py-3 font-medium text-right">სულ:</td>

                    <td className="px-4 py-3 font-mono text-lg font-bold text-right">{formatCurrency(order.total)}</td>

                  </tr>

                </tfoot>

              </table>

            </CardBody>

          </Card>



          {/* Kegs Card */}

          {order.kegs.length > 0 && (

            <Card>

              <CardHeader>

                <div className="flex justify-between items-center">

                  <span>🛢️ კეგები შეკვეთაში</span>

                  <Button variant="secondary" size="sm" onClick={() => setShowKegReturn(true)}>

                    კეგის დაბრუნება

                  </Button>

                </div>

              </CardHeader>

              <CardBody noPadding>

                <table className="w-full">

                  <thead>

                    <tr className="bg-bg-tertiary border-b border-border text-left text-xs text-text-muted">

                      <th className="px-4 py-3">კეგი #</th>

                      <th className="px-4 py-3">ზომა</th>

                      <th className="px-4 py-3">პროდუქტი</th>

                      <th className="px-4 py-3">დეპოზიტი</th>

                      <th className="px-4 py-3">სტატუსი</th>

                    </tr>

                  </thead>

                  <tbody>

                    {order.kegs.map((keg, i) => (

                      <tr key={i} className="border-b border-border/50">

                        <td className="px-4 py-3 font-mono text-sm">{keg.kegNumber}</td>

                        <td className="px-4 py-3 text-sm">{keg.size}L</td>

                        <td className="px-4 py-3 text-sm">{keg.productName}</td>

                        <td className="px-4 py-3 font-mono">{formatCurrency(keg.deposit)}</td>

                        <td className="px-4 py-3">

                          {keg.status === 'with_customer' ? (

                            <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-blue-400/20 text-blue-400">

                              🟢 კლიენტთან

                            </span>

                          ) : (

                            <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-green-400/20 text-green-400">

                              🔵 დაბრუნდა

                            </span>

                          )}

                        </td>

                      </tr>

                    ))}

                  </tbody>

                  <tfoot className="bg-bg-tertiary">

                    <tr>

                      <td colSpan={3} className="px-4 py-3 text-sm">სულ დეპოზიტი:</td>

                      <td className="px-4 py-3 font-mono">{formatCurrency(totalDeposit)}</td>

                      <td className="px-4 py-3 text-sm text-right">

                        დაბრუნებული: {returnedKegs}/{order.kegs.length}

                      </td>

                    </tr>

                  </tfoot>

                </table>

              </CardBody>

            </Card>

          )}



          {/* Timeline Card */}

          <Card>

            <CardHeader>📋 ისტორია</CardHeader>

            <CardBody>

              <div className="space-y-4">

                {order.timeline.map((event, i) => (

                  <div key={i} className="flex gap-4">

                    <div className="text-2xl">{getTimelineIcon(event.type)}</div>

                    <div className="flex-1">

                      <div className="flex justify-between items-start">

                        <div>

                          <p className="text-sm font-medium">

                            {event.type === 'created' && 'შეკვეთა შექმნილია'}

                            {event.type === 'confirmed' && 'დადასტურებულია'}

                            {event.type === 'shipped' && 'გაგზავნილია'}

                            {event.type === 'keg_returned' && 'კეგი დაბრუნდა'}

                            {event.type === 'delivered' && 'მიღებულია'}

                          </p>

                          {event.note && <p className="text-xs text-text-muted mt-1">{event.note}</p>}

                          {event.kegs && (

                            <p className="text-xs text-text-muted mt-1">კეგები: {event.kegs.join(', ')}</p>

                          )}

                        </div>

                        <div className="text-right text-xs text-text-muted">

                          <p>{formatDate(event.date)}</p>

                          <p>{formatTime(event.date)}</p>

                        </div>

                      </div>

                      <p className="text-xs text-text-muted mt-1">{event.user}</p>

                    </div>

                  </div>

                ))}

              </div>

            </CardBody>

          </Card>

        </div>



        {/* Right Column (1/3) */}

        <div className="space-y-6">

          {/* Customer Card */}

          <Card>

            <CardHeader>👤 მომხმარებელი</CardHeader>

            <CardBody className="space-y-3">

              <div>

                <p className="font-medium text-lg">{order.customerName}</p>

                <span className="inline-flex px-2 py-1 rounded-full text-xs bg-copper/20 text-copper-light mt-1">

                  {order.customerType === 'restaurant' ? '🍽️ რესტორანი' :

                   order.customerType === 'bar' ? '🍷 ბარი' :

                   order.customerType === 'shop' ? '🏪 მაღაზია' :

                   '🏭 დისტრიბუტორი'}

                </span>

              </div>

              <div className="space-y-2 text-sm">

                <p className="text-text-muted">📍 {order.customerAddress}</p>

                <p className="text-text-muted">📞 {order.customerPhone}</p>

                <p className="text-text-muted">✉️ {order.customerEmail}</p>

              </div>

              <Button variant="secondary" size="sm" className="w-full">

                პროფილის ნახვა

              </Button>

            </CardBody>

          </Card>



          {/* Delivery Card */}

          <Card>

            <CardHeader>🚚 მიწოდება</CardHeader>

            <CardBody className="space-y-3 text-sm">

              <div>

                <p className="text-text-muted">მისამართი:</p>

                <p>{order.deliveryAddress}</p>

              </div>

              <div>

                <p className="text-text-muted">თარიღი:</p>

                <p>{formatDate(order.deliveryDate)}</p>

              </div>

              <div>

                <p className="text-text-muted">დრო:</p>

                <p>{order.deliveryTime}</p>

              </div>

              {order.deliveryNote && (

                <div>

                  <p className="text-text-muted">შენიშვნა:</p>

                  <p>{order.deliveryNote}</p>

                </div>

              )}

            </CardBody>

          </Card>



          {/* Payment Card */}

          <Card>

            <CardHeader>💳 გადახდა</CardHeader>

            <CardBody className="space-y-3 text-sm">

              <div>

                <p className="text-text-muted">სტატუსი:</p>

                {getPaymentBadge(order.paymentStatus)}

              </div>

              <div>

                <p className="text-text-muted">მეთოდი:</p>

                <p>{order.paymentMethod}</p>

              </div>

              {order.paymentDate && (

                <div>

                  <p className="text-text-muted">თარიღი:</p>

                  <p>{formatDate(order.paymentDate)}</p>

                </div>

              )}

            </CardBody>

          </Card>

        </div>

      </div>



      {/* Keg Return Modal */}

      <KegReturnModal

        isOpen={showKegReturn}

        onClose={() => setShowKegReturn(false)}

        onConfirm={(returnData) => {

          console.log('Kegs returned:', returnData)

          // Update order kegs status

          setOrder(prev => prev ? {

            ...prev,

            kegs: prev.kegs.map(keg => 

              returnData.kegs.includes(keg.kegNumber)

                ? { ...keg, status: 'returned' as const, returnDate: new Date() }

                : keg

            ),

            timeline: [

              ...prev.timeline,

              { 

                date: new Date(), 

                type: 'keg_returned', 

                user: 'ნ. ზედგინიძე', 

                note: `კეგები დაბრუნდა: ${returnData.kegs.join(', ')}` 

              },

            ],

          } : null)

          setShowKegReturn(false)

        }}

        orderId={order.orderNumber}

        customerName={order.customerName}

        kegs={order.kegs.filter(k => k.status === 'with_customer').map((k, i) => ({

          id: `keg-${i}`,

          kegNumber: k.kegNumber,

          size: k.size,

          productName: k.productName,

          deposit: k.deposit,

        }))}

      />

    </DashboardLayout>

  )

}


