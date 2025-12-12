'use client'



import { useState } from 'react'

import { Button } from '@/components/ui'

import { formatCurrency } from '@/lib/utils'



interface Keg {

  id: string

  kegNumber: string

  size: number

  productName: string

  deposit: number

  condition?: 'good' | 'needs_cleaning' | 'damaged'

}



interface KegReturnModalProps {

  isOpen: boolean

  onClose: () => void

  onConfirm: (returnData: { kegs: string[]; conditions: Record<string, string> }) => void

  orderId?: string

  customerName?: string

  kegs: Keg[]

}



export function KegReturnModal({ isOpen, onClose, onConfirm, orderId, customerName, kegs }: KegReturnModalProps) {

  const [selectedKegs, setSelectedKegs] = useState<Record<string, boolean>>({})

  const [kegConditions, setKegConditions] = useState<Record<string, 'good' | 'needs_cleaning' | 'damaged'>>({})



  if (!isOpen) return null



  const handleKegToggle = (kegId: string) => {

    setSelectedKegs(prev => ({ ...prev, [kegId]: !prev[kegId] }))

    if (!selectedKegs[kegId]) {

      setKegConditions(prev => ({ ...prev, [kegId]: 'good' }))

    } else {

      const { [kegId]: _, ...rest } = kegConditions

      setKegConditions(rest)

    }

  }



  const handleConditionChange = (kegId: string, condition: 'good' | 'needs_cleaning' | 'damaged') => {

    setKegConditions(prev => ({ ...prev, [kegId]: condition }))

  }



  const selectedKegIds = Object.keys(selectedKegs).filter(id => selectedKegs[id])

  const totalDeposit = selectedKegIds.reduce((sum, kegId) => {

    const keg = kegs.find(k => k.id === kegId)

    return sum + (keg?.deposit || 0)

  }, 0)



  const handleConfirm = () => {

    onConfirm({

      kegs: selectedKegIds,

      conditions: kegConditions,

    })

    onClose()

  }



  return (

    <div className="fixed inset-0 z-50 flex items-center justify-center">

      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-bg-secondary border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">

        {/* Header */}

        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-bg-tertiary">

          <h2 className="text-xl font-display font-semibold">🛢️ კეგის დაბრუნება</h2>

          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-bg-card border border-border flex items-center justify-center hover:border-danger hover:text-danger transition-colors">

            ✕

          </button>

        </div>



        {/* Content */}

        <div className="flex-1 overflow-y-auto p-6">

          {/* Order Info */}

          {orderId && customerName && (

            <div className="mb-6 p-4 bg-bg-card border border-border rounded-xl">

              <p className="text-sm text-text-muted mb-1">შეკვეთა: <span className="font-mono">{orderId}</span></p>

              <p className="text-sm text-text-muted">კლიენტი: {customerName}</p>

            </div>

          )}



          {/* Kegs List */}

          <div className="space-y-3">

            {kegs.map(keg => {

              const isSelected = selectedKegs[keg.id] || false

              const condition = kegConditions[keg.id] || 'good'



              return (

                <div key={keg.id} className={`p-4 border rounded-xl ${isSelected ? 'border-copper bg-copper/5' : 'border-border bg-bg-card'}`}>

                  <div className="flex items-start gap-3">

                    <input

                      type="checkbox"

                      checked={isSelected}

                      onChange={() => handleKegToggle(keg.id)}

                      className="mt-1"

                    />

                    <div className="flex-1">

                      <div className="flex justify-between items-start mb-3">

                        <div>

                          <p className="font-medium font-mono">{keg.kegNumber}</p>

                          <p className="text-sm text-text-muted">{keg.size}L | {keg.productName}</p>

                        </div>

                        <p className="font-mono text-copper-light">{formatCurrency(keg.deposit)}</p>

                      </div>



                      {isSelected && (

                        <div className="space-y-2">

                          <p className="text-sm font-medium">მდგომარეობა:</p>

                          <div className="flex gap-2">

                            <button

                              onClick={() => handleConditionChange(keg.id, 'good')}

                              className={`px-3 py-2 rounded-lg text-sm transition-all ${

                                condition === 'good' ? 'bg-green-400/20 text-green-400 border border-green-400' : 'bg-bg-tertiary text-text-muted border border-border'

                              }`}

                            >

                              ⚪ კარგი მდგომარეობა

                            </button>

                            <button

                              onClick={() => handleConditionChange(keg.id, 'needs_cleaning')}

                              className={`px-3 py-2 rounded-lg text-sm transition-all ${

                                condition === 'needs_cleaning' ? 'bg-amber-400/20 text-amber-400 border border-amber-400' : 'bg-bg-tertiary text-text-muted border border-border'

                              }`}

                            >

                              🟡 საჭიროებს გაწმენდას

                            </button>

                            <button

                              onClick={() => handleConditionChange(keg.id, 'damaged')}

                              className={`px-3 py-2 rounded-lg text-sm transition-all ${

                                condition === 'damaged' ? 'bg-red-400/20 text-red-400 border border-red-400' : 'bg-bg-tertiary text-text-muted border border-border'

                              }`}

                            >

                              🔴 დაზიანებული

                            </button>

                          </div>

                          {condition === 'damaged' && (

                            <p className="text-xs text-amber-400">

                              დეპოზიტი ნაწილობრივ ან სრულად არ დაბრუნდება

                            </p>

                          )}

                        </div>

                      )}

                    </div>

                  </div>

                </div>

              )

            })}

          </div>

        </div>



        {/* Footer */}

        <div className="px-6 py-4 border-t border-border flex justify-between items-center bg-bg-tertiary">

          <div className="text-sm">

            <div className="flex justify-between">

              <span className="text-text-muted">დასაბრუნებელი დეპოზიტი:</span>

              <span className="font-mono text-copper-light">{formatCurrency(totalDeposit)}</span>

            </div>

          </div>

          <div className="flex gap-3">

            <Button variant="secondary" onClick={onClose}>გაუქმება</Button>

            <Button 

              variant="primary" 

              onClick={handleConfirm}

              disabled={selectedKegIds.length === 0}

            >

              დაბრუნების დადასტურება

            </Button>

          </div>

        </div>

      </div>

    </div>

  )

}


