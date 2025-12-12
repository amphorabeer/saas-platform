'use client'



import { useState } from 'react'

import { Button } from '@/components/ui'

import { formatCurrency } from '@/lib/utils'



interface PackagingModalProps {

  isOpen: boolean

  onClose: () => void

  onComplete: (packagingData: any) => void

  batchId: string

  batchNumber: string

  recipeName: string

  availableLiters: number

}



interface PackagingMaterial {

  id: string

  name: string

  type: 'keg' | 'bottle' | 'cap' | 'label'

  size?: number

  stock: number

  required: number

  status: 'ok' | 'low' | 'insufficient'

}



const PACKAGING_TYPES = [

  { type: 'keg', size: 30, label: '🛢️ კეგი 30L', maxCapacity: 30 },

  { type: 'keg', size: 50, label: '🛢️ კეგი 50L', maxCapacity: 50 },

  { type: 'bottle', size: 0.5, label: '🍾 ბოთლი 0.5L', maxCapacity: 0.5 },

  { type: 'bottle', size: 0.33, label: '🍾 ბოთლი 0.33L', maxCapacity: 0.33 },

  { type: 'can', size: 0.5, label: '🥫 ქილა 0.5L', maxCapacity: 0.5 },

]



export function PackagingModal({ 

  isOpen, 

  onClose, 
  
  onComplete, 
  
  batchId, 
  
  batchNumber, 
  
  recipeName, 
  
  availableLiters 

}: PackagingModalProps) {

  const [selectedType, setSelectedType] = useState<{ type: string; size: number } | null>(null)

  const [quantity, setQuantity] = useState('')

  const [pricePerUnit, setPricePerUnit] = useState('')



  if (!isOpen) return null



  const maxQuantity = selectedType 

    ? Math.floor(availableLiters / selectedType.size)

    : 0



  const usedLiters = selectedType && quantity 

    ? parseFloat(quantity) * selectedType.size

    : 0

  const remainingLiters = availableLiters - usedLiters



  // Mock materials check

  const getRequiredMaterials = (): PackagingMaterial[] => {

    if (!selectedType || !quantity) return []



    const qty = parseInt(quantity) || 0



    if (selectedType.type === 'keg') {

      return [

        { id: '1', name: `კეგი ${selectedType.size}L`, type: 'keg', size: selectedType.size, stock: 28, required: qty, status: qty <= 28 ? 'ok' : 'insufficient' },

      ]

    }



    if (selectedType.type === 'bottle' || selectedType.type === 'can') {

      return [

        { id: '1', name: `${selectedType.type === 'bottle' ? 'ბოთლი' : 'ქილა'} ${selectedType.size}L`, type: selectedType.type as any, size: selectedType.size, stock: 2400, required: qty, status: qty <= 2400 ? 'ok' : 'insufficient' },

        { id: '2', name: 'თავსახური 26mm', type: 'cap', stock: 3000, required: qty, status: qty <= 3000 ? 'ok' : 'insufficient' },

        { id: '3', name: 'ეტიკეტი', type: 'label', stock: 1800, required: qty, status: qty <= 1800 ? 'insufficient' : 'ok' },

      ]

    }



    return []

  }



  const materials = getRequiredMaterials()

  const allMaterialsOk = materials.every(m => m.status === 'ok')

  const totalValue = quantity && pricePerUnit 

    ? parseFloat(quantity) * parseFloat(pricePerUnit)

    : 0



  const handleComplete = () => {

    onComplete({

      batchId,

      batchNumber,

      packagingType: selectedType?.type,

      packagingSize: selectedType?.size,

      quantity: parseInt(quantity),

      pricePerUnit: parseFloat(pricePerUnit),

      materials,

    })

    onClose()

  }



  return (

    <div className="fixed inset-0 z-50 flex items-center justify-center">

      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-bg-secondary border border-border rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">

        {/* Header */}

        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-bg-tertiary">

          <h2 className="text-xl font-display font-semibold">🎁 პარტიის შეფუთვა | {batchNumber}</h2>

          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-bg-card border border-border flex items-center justify-center hover:border-danger hover:text-danger transition-colors">

            ✕

          </button>

        </div>



        {/* Content */}

        <div className="flex-1 overflow-y-auto p-6">

          {/* Info Banner */}

          <div className="mb-6 p-4 bg-bg-card border border-border rounded-xl">

            <p className="font-medium">{recipeName}</p>

            <p className="text-sm text-text-muted">ხელმისაწვდომი: {availableLiters}L</p>

          </div>



          {/* Packaging Type Selection */}

          <div className="mb-6">

            <label className="block text-sm font-medium mb-3">შეფუთვის ტიპი *</label>

            <div className="grid grid-cols-5 gap-3">

              {PACKAGING_TYPES.map((pkg, i) => {

                const maxQty = Math.floor(availableLiters / pkg.maxCapacity)

                const isSelected = selectedType?.type === pkg.type && selectedType?.size === pkg.size

                return (

                  <button

                    key={i}

                    onClick={() => setSelectedType({ type: pkg.type, size: pkg.size })}

                    className={`p-4 border rounded-xl text-center transition-all ${

                      isSelected ? 'border-copper bg-copper/10' : 'border-border bg-bg-card hover:border-copper/50'

                    }`}

                  >

                    <p className="text-2xl mb-2">{pkg.label.split(' ')[0]}</p>

                    <p className="text-xs mb-1">{pkg.label.split(' ').slice(1).join(' ')}</p>

                    <p className="text-xs text-text-muted">მაქს: {maxQty} ცალი</p>

                  </button>

                )

              })}

            </div>

          </div>



          {/* Quantity Input */}

          {selectedType && (

            <div className="mb-6">

              <label className="block text-sm font-medium mb-2">რაოდენობა *</label>

              <div className="flex items-center gap-4">

                <input

                  type="number"

                  min="1"

                  max={maxQuantity}

                  value={quantity}

                  onChange={(e) => setQuantity(e.target.value)}

                  placeholder="0"

                  className="w-32 px-4 py-3 bg-bg-tertiary border border-border rounded-xl font-mono text-sm outline-none focus:border-copper"

                />

                <span className="text-sm text-text-muted">ცალი</span>

                <div className="flex-1 text-sm text-text-muted">

                  გამოყენებული მოცულობა: <span className="font-mono">{usedLiters.toFixed(1)}L</span>

                </div>

                <div className="text-sm text-text-muted">

                  დარჩება: <span className="font-mono">{remainingLiters.toFixed(1)}L</span>

                </div>

              </div>

            </div>

          )}



          {/* Required Materials */}

          {selectedType && quantity && materials.length > 0 && (

            <div className="mb-6">

              <label className="block text-sm font-medium mb-3">საჭირო მასალები</label>

              <div className="space-y-2">

                {materials.map(material => {

                  const isOk = material.status === 'ok'

                  const isLow = material.status === 'low'

                  const isInsufficient = material.status === 'insufficient'

                  const missing = material.required - material.stock



                  return (

                    <div key={material.id} className={`p-3 border rounded-lg ${

                      isOk ? 'border-green-400/50 bg-green-400/10' :

                      isInsufficient ? 'border-red-400/50 bg-red-400/10' :

                      'border-amber-400/50 bg-amber-400/10'

                    }`}>

                      <div className="flex items-center justify-between">

                        <div className="flex items-center gap-2">

                          {isOk && <span>✅</span>}

                          {isInsufficient && <span>❌</span>}

                          {isLow && <span>⚠️</span>}

                          <span className="text-sm">{material.name}:</span>

                          <span className="text-sm font-mono">{material.required} ცალი</span>

                        </div>

                        <div className="text-sm">

                          <span className="text-text-muted">მარაგში: </span>

                          <span className={`font-mono ${isOk ? 'text-green-400' : 'text-red-400'}`}>

                            {material.stock}

                          </span>

                          {isInsufficient && (

                            <span className="text-red-400 ml-2">| აკლია {missing}</span>

                          )}

                        </div>

                      </div>

                      {isInsufficient && (

                        <p className="text-xs text-amber-400 mt-2">

                          ⚠️ შეამცირეთ რაოდენობა ან შეავსეთ მარაგი

                        </p>

                      )}

                    </div>

                  )

                })}

              </div>

            </div>

          )}



          {/* Price Input */}

          {selectedType && quantity && (

            <div className="mb-6">

              <label className="block text-sm font-medium mb-2">ფასი ერთეულზე</label>

              <div className="flex items-center gap-4">

                <input

                  type="number"

                  min="0"

                  step="0.01"

                  value={pricePerUnit}

                  onChange={(e) => setPricePerUnit(e.target.value)}

                  placeholder="0"

                  className="w-32 px-4 py-3 bg-bg-tertiary border border-border rounded-xl font-mono text-sm outline-none focus:border-copper"

                />

                <span className="text-sm text-text-muted">₾</span>

                {pricePerUnit && quantity && (

                  <div className="flex-1 text-sm">

                    <span className="text-text-muted">სულ ღირებულება: </span>

                    <span className="font-mono text-copper-light">{formatCurrency(totalValue)}</span>

                    <span className="text-text-muted"> ({quantity} × {pricePerUnit}₾)</span>

                  </div>

                )}

              </div>

            </div>

          )}

        </div>



        {/* Footer */}

        <div className="px-6 py-4 border-t border-border flex justify-end gap-3 bg-bg-tertiary">

          <Button variant="secondary" onClick={onClose}>გაუქმება</Button>

          <Button 

            variant="primary" 

            onClick={handleComplete}

            disabled={!selectedType || !quantity || !allMaterialsOk || !pricePerUnit}

          >

            შეფუთვა და მზა პროდუქციის შექმნა

          </Button>

        </div>

      </div>

    </div>

  )

}


