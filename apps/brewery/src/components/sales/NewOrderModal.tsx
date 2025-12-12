'use client'



import { useState } from 'react'

import { Button } from '@/components/ui'

import { formatCurrency } from '@/lib/utils'



interface Product {

  id: string

  name: string

  packageType: string

  packageSize: number

  availableQuantity: number

  pricePerUnit: number

}



interface Customer {

  id: string

  name: string

  address: string

  phone: string

}



interface NewOrderModalProps {

  isOpen: boolean

  onClose: () => void

  onSubmit: (orderData: any) => void

}



const mockProducts: Product[] = [

  { id: '1', name: 'Georgian Amber Lager', packageType: 'კეგი 30L', packageSize: 30, availableQuantity: 10, pricePerUnit: 2400 },

  { id: '2', name: 'Tbilisi IPA', packageType: 'კეგი 30L', packageSize: 30, availableQuantity: 8, pricePerUnit: 2600 },

  { id: '3', name: 'Kolkheti Wheat', packageType: 'კეგი 30L', packageSize: 30, availableQuantity: 4, pricePerUnit: 2200 },

]



const mockCustomers: Customer[] = [

  { id: '1', name: 'რესტორანი "ფუნიკულიორი"', address: 'რუსთაველის 12, თბილისი', phone: '+995 555 123 456' },

  { id: '2', name: 'Wine Bar "8000"', address: 'აღმაშენებლის 45, თბილისი', phone: '+995 555 234 567' },

  { id: '3', name: 'Craft Corner', address: 'ნინოშვილის 8, ბათუმი', phone: '+995 555 345 678' },

]



export function NewOrderModal({ isOpen, onClose, onSubmit }: NewOrderModalProps) {

  const [step, setStep] = useState<1 | 2 | 3>(1)

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  const [selectedProducts, setSelectedProducts] = useState<Record<string, number>>({})

  const [deliveryDate, setDeliveryDate] = useState('')

  const [deliveryTime, setDeliveryTime] = useState('')

  const [deliveryAddress, setDeliveryAddress] = useState('')

  const [deliveryNote, setDeliveryNote] = useState('')



  if (!isOpen) return null



  const handleProductToggle = (productId: string) => {

    setSelectedProducts(prev => {

      if (prev[productId]) {

        const { [productId]: _, ...rest } = prev

        return rest

      }

      return { ...prev, [productId]: 1 }

    })

  }



  const handleQuantityChange = (productId: string, quantity: number) => {

    if (quantity <= 0) {

      const { [productId]: _, ...rest } = selectedProducts

      setSelectedProducts(rest)

      return

    }

    setSelectedProducts(prev => ({ ...prev, [productId]: quantity }))

  }



  const calculateTotals = () => {

    let subtotal = 0

    let deposit = 0



    Object.entries(selectedProducts).forEach(([productId, quantity]) => {

      const product = mockProducts.find(p => p.id === productId)

      if (product) {

        subtotal += product.pricePerUnit * quantity

        if (product.packageType.includes('კეგი')) {

          deposit += 150 * quantity

        }

      }

    })



    return { subtotal, deposit, total: subtotal + deposit }

  }



  const { subtotal, deposit, total } = calculateTotals()



  const handleSubmit = () => {

    onSubmit({

      customer: selectedCustomer,

      products: Object.entries(selectedProducts).map(([productId, quantity]) => {

        const product = mockProducts.find(p => p.id === productId)

        return { ...product, quantity }

      }),

      delivery: {

        date: deliveryDate,

        time: deliveryTime,

        address: deliveryAddress,

        note: deliveryNote,

      },

      totals: { subtotal, deposit, total },

    })

    onClose()

  }



  return (

    <div className="fixed inset-0 z-50 flex items-center justify-center">

      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-bg-secondary border border-border rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">

        {/* Header */}

        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-bg-tertiary">

          <h2 className="text-xl font-display font-semibold">📦 ახალი შეკვეთა</h2>

          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-bg-card border border-border flex items-center justify-center hover:border-danger hover:text-danger transition-colors">

            ✕

          </button>

        </div>



        {/* Steps Indicator */}

        <div className="px-6 py-4 border-b border-border flex items-center gap-4">

          {[1, 2, 3].map(s => (

            <div key={s} className="flex items-center gap-2 flex-1">

              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${

                step === s ? 'bg-copper text-white' :

                step > s ? 'bg-green-400 text-white' :

                'bg-bg-tertiary text-text-muted'

              }`}>

                {step > s ? '✓' : s}

              </div>

              <span className={`text-sm ${step >= s ? 'text-text-primary' : 'text-text-muted'}`}>

                {s === 1 ? 'მომხმარებელი' : s === 2 ? 'პროდუქტები' : 'დეტალები'}

              </span>

              {s < 3 && <div className={`flex-1 h-0.5 ${step > s ? 'bg-green-400' : 'bg-border'}`} />}

            </div>

          ))}

        </div>



        {/* Content */}

        <div className="flex-1 overflow-y-auto p-6">

          {step === 1 && (

            <div className="space-y-4">

              <div>

                <label className="block text-sm font-medium mb-2">მომხმარებელი *</label>

                <select

                  value={selectedCustomer?.id || ''}

                  onChange={(e) => {

                    const customer = mockCustomers.find(c => c.id === e.target.value)

                    setSelectedCustomer(customer || null)

                    if (customer) {

                      setDeliveryAddress(customer.address)

                    }

                  }}

                  className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl text-sm outline-none focus:border-copper"

                >

                  <option value="">აირჩიეთ მომხმარებელი</option>

                  {mockCustomers.map(customer => (

                    <option key={customer.id} value={customer.id}>{customer.name}</option>

                  ))}

                </select>

              </div>



              {selectedCustomer && (

                <div className="p-4 bg-bg-card border border-border rounded-xl space-y-2">

                  <p className="font-medium">{selectedCustomer.name}</p>

                  <p className="text-sm text-text-muted">📍 {selectedCustomer.address}</p>

                  <p className="text-sm text-text-muted">📞 {selectedCustomer.phone}</p>

                </div>

              )}



              <Button variant="secondary" className="w-full">

                + ახალი კლიენტი

              </Button>

            </div>

          )}



          {step === 2 && (

            <div className="space-y-4">

              {mockProducts.map(product => {

                const isSelected = !!selectedProducts[product.id]

                const quantity = selectedProducts[product.id] || 0

                const isKeg = product.packageType.includes('კეგი')



                return (

                  <div key={product.id} className={`p-4 border rounded-xl ${isSelected ? 'border-copper bg-copper/5' : 'border-border bg-bg-card'}`}>

                    <div className="flex items-start gap-3">

                      <input

                        type="checkbox"

                        checked={isSelected}

                        onChange={() => handleProductToggle(product.id)}

                        className="mt-1"

                      />

                      <div className="flex-1">

                        <div className="flex justify-between items-start mb-2">

                          <div>

                            <p className="font-medium">{product.name}</p>

                            <p className="text-sm text-text-muted">{product.packageType}</p>

                          </div>

                          <p className="font-mono text-copper-light">{formatCurrency(product.pricePerUnit)}</p>

                        </div>

                        <p className="text-xs text-text-muted mb-3">

                          ხელმისაწვდომი: {product.availableQuantity} ცალი

                        </p>

                        {isSelected && (

                          <div className="flex items-center gap-2">

                            <label className="text-sm">რაოდენობა:</label>

                            <input

                              type="number"

                              min="1"

                              max={product.availableQuantity}

                              value={quantity}

                              onChange={(e) => handleQuantityChange(product.id, parseInt(e.target.value) || 0)}

                              className="w-20 px-2 py-1 bg-bg-tertiary border border-border rounded text-sm font-mono outline-none focus:border-copper"

                            />

                            <span className="text-sm text-text-muted">ცალი</span>

                            {quantity > 0 && (

                              <span className="ml-auto font-mono text-sm">

                                = {formatCurrency(product.pricePerUnit * quantity)}

                              </span>

                            )}

                          </div>

                        )}

                      </div>

                    </div>

                  </div>

                )

              })}

            </div>

          )}



          {step === 3 && (

            <div className="space-y-4">

              <div>

                <label className="block text-sm font-medium mb-2">მიწოდების თარიღი *</label>

                <input

                  type="date"

                  value={deliveryDate}

                  onChange={(e) => setDeliveryDate(e.target.value)}

                  className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl text-sm outline-none focus:border-copper"

                />

              </div>

              <div>

                <label className="block text-sm font-medium mb-2">მიწოდების დრო</label>

                <input

                  type="text"

                  value={deliveryTime}

                  onChange={(e) => setDeliveryTime(e.target.value)}

                  placeholder="14:00 - 16:00"

                  className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl text-sm outline-none focus:border-copper"

                />

              </div>

              <div>

                <label className="block text-sm font-medium mb-2">მისამართი *</label>

                <input

                  type="text"

                  value={deliveryAddress}

                  onChange={(e) => setDeliveryAddress(e.target.value)}

                  className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl text-sm outline-none focus:border-copper"

                />

              </div>

              <div>

                <label className="block text-sm font-medium mb-2">შენიშვნა</label>

                <textarea

                  value={deliveryNote}

                  onChange={(e) => setDeliveryNote(e.target.value)}

                  rows={3}

                  className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl text-sm outline-none focus:border-copper resize-none"

                />

              </div>

            </div>

          )}

        </div>



        {/* Footer */}

        <div className="px-6 py-4 border-t border-border flex justify-between items-center bg-bg-tertiary">

          <div className="text-sm">

            {step === 3 && (

              <div className="space-y-1">

                <div className="flex justify-between">

                  <span className="text-text-muted">ქვეჯამი:</span>

                  <span className="font-mono">{formatCurrency(subtotal)}</span>

                </div>

                {deposit > 0 && (

                  <div className="flex justify-between">

                    <span className="text-text-muted">კეგის დეპოზიტი:</span>

                    <span className="font-mono">{formatCurrency(deposit)}</span>

                  </div>

                )}

                <div className="flex justify-between font-medium pt-2 border-t border-border">

                  <span>სულ:</span>

                  <span className="font-mono text-copper-light">{formatCurrency(total)}</span>

                </div>

              </div>

            )}

          </div>

          <div className="flex gap-3">

            {step > 1 && (

              <Button variant="secondary" onClick={() => setStep(step - 1 as any)}>

                ← უკან

              </Button>

            )}

            <Button variant="secondary" onClick={onClose}>გაუქმება</Button>

            {step < 3 ? (

              <Button variant="primary" onClick={() => {

                if (step === 1 && selectedCustomer) setStep(2)

                if (step === 2 && Object.keys(selectedProducts).length > 0) setStep(3)

              }}>

                შემდეგი →

              </Button>

            ) : (

              <Button variant="primary" onClick={handleSubmit}>

                შეკვეთის შექმნა

              </Button>

            )}

          </div>

        </div>

      </div>

    </div>

  )

}


