'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'

interface Product {
  id: string
  name: string
  style?: string | null
  abv?: number | null
  packageType: string
  packageTypeName?: string
  totalProduced: number
  availableQuantity: number
  pricePerUnit?: number
}

interface Customer {
  id: string
  name: string
  type: string
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  kegDepositRequired?: boolean
}

interface AvailableKeg {
  id: string
  kegNumber: string
  size: number
  productName: string | null
  status: string
}

interface NewOrderModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (orderData: any) => void
}

const getPackageTypeName = (type: string): string => {
  const names: Record<string, string> = {
    KEG_50: 'კეგი 50L',
    KEG_30: 'კეგი 30L',
    KEG_20: 'კეგი 20L',
    BOTTLE_750: 'ბოთლი 750ml',
    BOTTLE_500: 'ბოთლი 500ml',
    BOTTLE_330: 'ბოთლი 330ml',
    CAN_500: 'ქილა 500ml',
    CAN_330: 'ქილა 330ml',
  }
  return names[type] || type
}

const getKegSizeFromType = (type: string): number => {
  const sizes: Record<string, number> = { KEG_50: 50, KEG_30: 30, KEG_20: 20 }
  return sizes[type] || 30
}

const DEFAULT_PRICES: Record<string, number> = {
  KEG_50: 380, KEG_30: 240, KEG_20: 160,
  BOTTLE_750: 12, BOTTLE_500: 8, BOTTLE_330: 6,
  CAN_500: 7, CAN_330: 5,
}

const DEFAULT_DEPOSITS: Record<string, number> = {
  KEG_50: 200, KEG_30: 150, KEG_20: 100,
}

export function NewOrderModal({ isOpen, onClose, onSubmit }: NewOrderModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [availableKegs, setAvailableKegs] = useState<AvailableKeg[]>([])
  const [loading, setLoading] = useState(false)
  
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [selectedProducts, setSelectedProducts] = useState<Record<string, { 
    quantity: number
    unitPrice: number
    includeDeposit: boolean
    depositAmount: number
  }>>({})
  
  const [kegAssignmentMode, setKegAssignmentMode] = useState<'auto' | 'manual'>('auto')
  const [selectedKegIds, setSelectedKegIds] = useState<string[]>([])
  
  const [deliveryDate, setDeliveryDate] = useState('')
  const [deliveryTime, setDeliveryTime] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [deliveryNote, setDeliveryNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setStep(1)
      setSelectedCustomer(null)
      setSelectedProducts({})
      setKegAssignmentMode('auto')
      setSelectedKegIds([])
      setDeliveryDate('')
      setDeliveryTime('')
      setDeliveryAddress('')
      setDeliveryNote('')
    }
  }, [isOpen])

  // Fetch customers
  useEffect(() => {
    if (isOpen && step === 1) {
      const fetchCustomers = async () => {
        try {
          const res = await fetch('/api/customers?isActive=true')
          if (res.ok) {
            const data = await res.json()
            setCustomers(data.customers || [])
          }
        } catch (error) {
          console.error('Failed to fetch customers:', error)
        }
      }
      fetchCustomers()
    }
  }, [isOpen, step])

  // Fetch products
  useEffect(() => {
    if (isOpen && step === 2) {
      const fetchProducts = async () => {
        try {
          setLoading(true)
          const res = await fetch('/api/products?availableOnly=true')
          if (res.ok) {
            const data = await res.json()
            setProducts(data.products || [])
          }
        } catch (error) {
          console.error('Failed to fetch products:', error)
        } finally {
          setLoading(false)
        }
      }
      fetchProducts()
    }
  }, [isOpen, step])

  // Check if order has keg products
  const hasKegProducts = Object.entries(selectedProducts).some(([productId]) => {
    const product = products.find(p => p.id === productId)
    return product?.packageType.startsWith('KEG')
  })

  // Fetch available kegs for assignment
  useEffect(() => {
    if (isOpen && step === 3 && hasKegProducts) {
      const fetchKegs = async () => {
        try {
          setLoading(true)
          const res = await fetch('/api/kegs?status=FILLED')
          if (res.ok) {
            const data = await res.json()
            setAvailableKegs(data.kegs || [])
          }
        } catch (error) {
          console.error('Failed to fetch kegs:', error)
        } finally {
          setLoading(false)
        }
      }
      fetchKegs()
    }
  }, [isOpen, step, hasKegProducts])

  if (!isOpen) return null

  // Get total kegs needed
  const getTotalKegsNeeded = (): number => {
    let total = 0
    Object.entries(selectedProducts).forEach(([productId, { quantity }]) => {
      const product = products.find(p => p.id === productId)
      if (product?.packageType.startsWith('KEG')) {
        total += quantity
      }
    })
    return total
  }

  // Filter kegs by size needed
  const getFilteredKegs = (): AvailableKeg[] => {
    const neededSizes: number[] = []
    Object.entries(selectedProducts).forEach(([productId, { quantity }]) => {
      const product = products.find(p => p.id === productId)
      if (product?.packageType.startsWith('KEG')) {
        const size = getKegSizeFromType(product.packageType)
        for (let i = 0; i < quantity; i++) {
          neededSizes.push(size)
        }
      }
    })
    return availableKegs.filter(k => neededSizes.includes(k.size))
  }

  const handleProductToggle = (productId: string) => {
    setSelectedProducts(prev => {
      if (prev[productId]) {
        const { [productId]: _, ...rest } = prev
        return rest
      }
      const product = products.find(p => p.id === productId)
      if (!product) return prev
      
      const isKeg = product.packageType.startsWith('KEG')
      const unitPrice = product.pricePerUnit || DEFAULT_PRICES[product.packageType] || 0
      const depositAmount = isKeg ? (DEFAULT_DEPOSITS[product.packageType] || 150) : 0
      
      return { 
        ...prev, 
        [productId]: { 
          quantity: 1, 
          unitPrice,
          includeDeposit: isKeg,
          depositAmount,
        } 
      }
    })
  }

  const handleQuantityChange = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      const { [productId]: _, ...rest } = selectedProducts
      setSelectedProducts(rest)
      return
    }
    setSelectedProducts(prev => ({
      ...prev,
      [productId]: { ...prev[productId], quantity }
    }))
  }

  const handlePriceChange = (productId: string, price: number) => {
    setSelectedProducts(prev => ({
      ...prev,
      [productId]: { ...prev[productId], unitPrice: price }
    }))
  }

  const handleDepositToggle = (productId: string) => {
    setSelectedProducts(prev => ({
      ...prev,
      [productId]: { ...prev[productId], includeDeposit: !prev[productId].includeDeposit }
    }))
  }

  const handleDepositChange = (productId: string, amount: number) => {
    setSelectedProducts(prev => ({
      ...prev,
      [productId]: { ...prev[productId], depositAmount: amount }
    }))
  }

  const handleKegToggle = (kegId: string) => {
    setSelectedKegIds(prev => 
      prev.includes(kegId) 
        ? prev.filter(id => id !== kegId)
        : [...prev, kegId]
    )
  }

  const calculateTotals = () => {
    let subtotal = 0
    let deposit = 0

    Object.entries(selectedProducts).forEach(([, { quantity, unitPrice, includeDeposit, depositAmount }]) => {
      subtotal += unitPrice * quantity
      if (includeDeposit) {
        deposit += depositAmount * quantity
      }
    })

    return { subtotal, deposit, total: subtotal + deposit }
  }

  const { subtotal, deposit, total } = calculateTotals()
  const totalKegsNeeded = getTotalKegsNeeded()

  const handleSubmit = async () => {
    if (!selectedCustomer || Object.keys(selectedProducts).length === 0) return

    setIsSubmitting(true)

    try {
      const items = Object.entries(selectedProducts).map(([productId, { quantity, unitPrice }]) => {
        const product = products.find(p => p.id === productId)
        if (!product) throw new Error('Product not found')
        return {
          productName: product.name,
          packageType: product.packageType,
          quantity,
          unitPrice,
        }
      })

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          items,
          notes: `მიწოდება: ${deliveryDate} ${deliveryTime ? `(${deliveryTime})` : ''} - ${deliveryAddress}${deliveryNote ? ` | ${deliveryNote}` : ''}`,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'შეკვეთის შექმნა ვერ მოხერხდა')

      // Assign kegs if needed
      if (hasKegProducts && (selectedKegIds.length > 0 || kegAssignmentMode === 'auto')) {
        let kegsToAssign = selectedKegIds

        if (kegAssignmentMode === 'auto') {
          const filteredKegs = getFilteredKegs()
          kegsToAssign = filteredKegs.slice(0, totalKegsNeeded).map(k => k.id)
        }

        if (kegsToAssign.length > 0) {
          await fetch('/api/kegs/assign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: data.order.id,
              customerId: selectedCustomer.id,
              kegIds: kegsToAssign,
            }),
          })
        }
      }

      onSubmit({ order: data, customer: selectedCustomer })
      onClose()
    } catch (error: any) {
      console.error('Failed to create order:', error)
      alert(error.message || 'შეკვეთის შექმნა ვერ მოხერხდა')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getNextStep = (): 1 | 2 | 3 | 4 => {
    if (step === 2 && hasKegProducts) return 3
    if (step === 2) return 4
    if (step === 3) return 4
    return Math.min(step + 1, 4) as 1 | 2 | 3 | 4
  }

  const getPrevStep = (): 1 | 2 | 3 | 4 => {
    if (step === 4 && !hasKegProducts) return 2
    return Math.max(step - 1, 1) as 1 | 2 | 3 | 4
  }

  const canProceed = (): boolean => {
    if (step === 1) return !!selectedCustomer
    if (step === 2) return Object.keys(selectedProducts).length > 0
    if (step === 3) return kegAssignmentMode === 'auto' || selectedKegIds.length >= totalKegsNeeded
    if (step === 4) return !!deliveryDate && !!deliveryAddress
    return false
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-bg-secondary border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-bg-tertiary">
          <div>
            <h2 className="text-xl font-display font-semibold">📦 ახალი შეკვეთა</h2>
            <p className="text-sm text-text-muted">ნაბიჯი {step}/{hasKegProducts ? 4 : 3}</p>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-lg bg-bg-card border border-border flex items-center justify-center hover:border-red-500 hover:text-red-500 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-3 border-b border-border bg-bg-card">
          <div className="flex items-center gap-2">
            {['კლიენტი', 'პროდუქტები', ...(hasKegProducts ? ['კეგები'] : []), 'მიწოდება'].map((label, i) => {
              const stepNum = i + 1
              const isActive = step === stepNum
              const isCompleted = step > stepNum
              return (
                <div key={i} className="flex items-center gap-2 flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                    isCompleted ? 'bg-green-500 text-white' :
                    isActive ? 'bg-copper text-white' :
                    'bg-bg-tertiary text-text-muted'
                  }`}>
                    {isCompleted ? '✓' : stepNum}
                  </div>
                  <span className={`text-xs hidden sm:block ${isActive ? 'text-white' : 'text-text-muted'}`}>
                    {label}
                  </span>
                  {i < (hasKegProducts ? 3 : 2) && (
                    <div className={`flex-1 h-0.5 ${isCompleted ? 'bg-green-500' : 'bg-bg-tertiary'}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* Step 1: Customer Selection */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-text-muted mb-4">აირჩიეთ მომხმარებელი:</p>
              {customers.length === 0 ? (
                <p className="text-center text-text-muted py-8">კლიენტები არ მოიძებნა</p>
              ) : (
                customers.map(customer => (
                  <div
                    key={customer.id}
                    onClick={() => setSelectedCustomer(customer)}
                    className={`p-4 border rounded-xl cursor-pointer transition-all ${
                      selectedCustomer?.id === customer.id
                        ? 'border-copper bg-copper/10'
                        : 'border-border bg-bg-card hover:border-copper/50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-sm text-text-muted">{customer.address || customer.city || 'მისამართი არ არის'}</p>
                      </div>
                      {selectedCustomer?.id === customer.id && (
                        <span className="text-copper text-xl">✓</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Step 2: Product Selection */}
          {step === 2 && (
            <div className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-copper"></div>
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-8 text-text-muted">
                  ხელმისაწვდომი პროდუქტები არ არის
                </div>
              ) : (
                products.map(product => {
                  const isSelected = !!selectedProducts[product.id]
                  const productData = selectedProducts[product.id] || { quantity: 1, unitPrice: 0, includeDeposit: false, depositAmount: 0 }
                  const { quantity, unitPrice, includeDeposit, depositAmount } = productData
                  const isKeg = product.packageType.startsWith('KEG')

                  return (
                    <div
                      key={product.id}
                      className={`p-4 border rounded-xl transition-all ${
                        isSelected ? 'border-copper bg-copper/5' : 'border-border bg-bg-card hover:border-border/80'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleProductToggle(product.id)}
                          className="mt-1 w-5 h-5 accent-copper"
                        />
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="text-sm text-text-muted">
                                {product.packageTypeName || getPackageTypeName(product.packageType)}
                                {product.style && ` • ${product.style}`}
                              </p>
                              <p className="text-xs text-text-muted mt-1">
                                ხელმისაწვდომი: {product.availableQuantity} ცალი
                              </p>
                            </div>
                          </div>

                          {isSelected && (
                            <div className="space-y-3 pt-3 border-t border-border/50">
                              {/* Quantity & Price Row */}
                              <div className="flex items-center gap-4 flex-wrap">
                                <div className="flex items-center gap-2">
                                  <label className="text-sm text-text-muted">რაოდენობა:</label>
                                  <button
                                    onClick={() => handleQuantityChange(product.id, quantity - 1)}
                                    className="w-8 h-8 rounded-lg bg-bg-tertiary border border-border flex items-center justify-center hover:border-copper"
                                  >−</button>
                                  <span className="w-8 text-center font-mono">{quantity}</span>
                                  <button
                                    onClick={() => handleQuantityChange(product.id, quantity + 1)}
                                    disabled={quantity >= product.availableQuantity}
                                    className="w-8 h-8 rounded-lg bg-bg-tertiary border border-border flex items-center justify-center hover:border-copper disabled:opacity-50"
                                  >+</button>
                                </div>
                                <div className="flex items-center gap-2">
                                  <label className="text-sm text-text-muted">ფასი:</label>
                                  <input
                                    type="number"
                                    value={unitPrice}
                                    onChange={(e) => handlePriceChange(product.id, parseFloat(e.target.value) || 0)}
                                    className="w-20 px-2 py-1 bg-bg-tertiary border border-border rounded-lg font-mono text-sm outline-none focus:border-copper"
                                  />
                                  <span className="text-sm text-text-muted">₾</span>
                                </div>
                              </div>

                              {/* Keg Deposit Option */}
                              {isKeg && (
                                <div className="flex items-center justify-between p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                                  <div className="flex items-center gap-3">
                                    <input
                                      type="checkbox"
                                      checked={includeDeposit}
                                      onChange={() => handleDepositToggle(product.id)}
                                      className="w-5 h-5 accent-amber-500"
                                    />
                                    <div>
                                      <p className="text-sm font-medium text-amber-400">🛢️ კეგის დეპოზიტი</p>
                                      <p className="text-xs text-text-muted">{quantity} კეგი × დეპოზიტი</p>
                                    </div>
                                  </div>
                                  {includeDeposit && (
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="number"
                                        value={depositAmount}
                                        onChange={(e) => handleDepositChange(product.id, parseFloat(e.target.value) || 0)}
                                        className="w-20 px-2 py-1 bg-bg-tertiary border border-amber-500/50 rounded-lg font-mono text-sm outline-none focus:border-amber-500"
                                      />
                                      <span className="text-sm text-amber-400">₾/ცალი</span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Line Total */}
                              <div className="flex justify-between items-center pt-2 border-t border-border/50">
                                <span className="text-sm text-text-muted">ჯამი:</span>
                                <div className="text-right">
                                  <span className="font-mono font-medium">{formatCurrency(unitPrice * quantity)}</span>
                                  {isKeg && includeDeposit && (
                                    <span className="text-amber-400 text-sm ml-2">
                                      + {formatCurrency(depositAmount * quantity)} დეპოზიტი
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* Step 3: Keg Assignment */}
          {step === 3 && hasKegProducts && (
            <div className="space-y-4">
              <div className="p-4 bg-bg-card border border-border rounded-xl">
                <p className="text-sm text-text-muted mb-1">საჭირო კეგები:</p>
                <p className="text-2xl font-bold text-copper-light">{totalKegsNeeded} ცალი</p>
              </div>

              {/* Assignment Mode */}
              <div>
                <p className="text-sm font-medium mb-3">კეგების მინიჭების მეთოდი:</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setKegAssignmentMode('auto')}
                    className={`p-4 rounded-xl border text-center transition-all ${
                      kegAssignmentMode === 'auto'
                        ? 'border-copper bg-copper/10'
                        : 'border-border bg-bg-card hover:border-copper/50'
                    }`}
                  >
                    <span className="text-2xl block mb-2">🤖</span>
                    <span className="font-medium">ავტომატური</span>
                    <p className="text-xs text-text-muted mt-1">სისტემა აირჩევს</p>
                  </button>
                  <button
                    onClick={() => setKegAssignmentMode('manual')}
                    className={`p-4 rounded-xl border text-center transition-all ${
                      kegAssignmentMode === 'manual'
                        ? 'border-copper bg-copper/10'
                        : 'border-border bg-bg-card hover:border-copper/50'
                    }`}
                  >
                    <span className="text-2xl block mb-2">✋</span>
                    <span className="font-medium">მანუალური</span>
                    <p className="text-xs text-text-muted mt-1">თავად ავირჩევ</p>
                  </button>
                </div>
              </div>

              {/* Manual Keg Selection */}
              {kegAssignmentMode === 'manual' && (
                <div>
                  <p className="text-sm font-medium mb-3">
                    აირჩიეთ კეგები ({selectedKegIds.length}/{totalKegsNeeded}):
                  </p>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-copper"></div>
                    </div>
                  ) : getFilteredKegs().length === 0 ? (
                    <div className="text-center py-8 text-text-muted">
                      <p>შესაბამისი სავსე კეგები არ მოიძებნა</p>
                      <p className="text-xs mt-1">დარწმუნდით რომ კეგები შევსებულია (FILLED)</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {getFilteredKegs().map(keg => {
                        const isSelected = selectedKegIds.includes(keg.id)
                        return (
                          <div
                            key={keg.id}
                            onClick={() => handleKegToggle(keg.id)}
                            className={`p-3 border rounded-lg cursor-pointer transition-all flex items-center justify-between ${
                              isSelected
                                ? 'border-copper bg-copper/10'
                                : 'border-border bg-bg-card hover:border-copper/50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="w-4 h-4 accent-copper"
                              />
                              <div>
                                <p className="font-mono text-sm">{keg.kegNumber}</p>
                                <p className="text-xs text-text-muted">{keg.size}L • {keg.productName || 'სავსე'}</p>
                              </div>
                            </div>
                            {isSelected && <span className="text-copper">✓</span>}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Auto Mode Info */}
              {kegAssignmentMode === 'auto' && (
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                  <p className="text-sm text-blue-400">
                    ℹ️ სისტემა ავტომატურად აირჩევს {totalKegsNeeded} სავსე კეგს შეკვეთის შექმნისას.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Delivery */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">მიწოდების თარიღი *</label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl outline-none focus:border-copper"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">მიწოდების დრო</label>
                <input
                  type="text"
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  placeholder="14:00 - 16:00"
                  className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl outline-none focus:border-copper"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">მისამართი *</label>
                <input
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder={selectedCustomer?.address || ''}
                  className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl outline-none focus:border-copper"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">შენიშვნა</label>
                <textarea
                  value={deliveryNote}
                  onChange={(e) => setDeliveryNote(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl outline-none focus:border-copper resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex justify-between items-center bg-bg-tertiary">
          {/* Totals */}
          <div className="text-sm">
            {Object.keys(selectedProducts).length > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between gap-6">
                  <span className="text-text-muted">ქვეჯამი:</span>
                  <span className="font-mono">{formatCurrency(subtotal)}</span>
                </div>
                {deposit > 0 && (
                  <div className="flex justify-between gap-6">
                    <span className="text-text-muted">🛢️ დეპოზიტი:</span>
                    <span className="font-mono text-amber-400">{formatCurrency(deposit)}</span>
                  </div>
                )}
                <div className="flex justify-between gap-6 font-medium pt-1 border-t border-border">
                  <span>სულ:</span>
                  <span className="font-mono text-copper-light text-lg">{formatCurrency(total)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            {step > 1 && (
              <Button variant="secondary" onClick={() => setStep(getPrevStep())}>
                ← უკან
              </Button>
            )}
            <Button variant="secondary" onClick={onClose}>გაუქმება</Button>
            
            {(step < 4 && !(step === 2 && !hasKegProducts)) ? (
              <Button
                variant="primary"
                onClick={() => setStep(getNextStep())}
                disabled={!canProceed()}
              >
                შემდეგი →
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={isSubmitting || !canProceed()}
              >
                {isSubmitting ? 'შექმნა...' : '✓ შეკვეთის შექმნა'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}