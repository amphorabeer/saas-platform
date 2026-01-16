'use client'



import { useState, useEffect, useMemo, useCallback, useRef } from 'react'

import { Button, ProgressBar } from '@/components/ui'



interface RecipeIngredient {

  id: string

  name: string

  type: 'grain' | 'hop' | 'yeast' | 'adjunct'

  requiredAmount: number

  unit: string

  stockAmount: number

  stockStatus: 'ok' | 'low' | 'insufficient'

}



interface StartBrewingModalProps {

  isOpen: boolean

  onClose: () => void

  onConfirm: (confirmedIngredients: { id: string; amount: number }[]) => void

  batchNumber: string

  recipeName: string

  recipeIngredients: RecipeIngredient[]

}



const TYPE_ICONS = {

  grain: '🌾',

  hop: '🌿',

  yeast: '🧫',

  adjunct: '🧪',

}



const STATUS_CONFIG = {

  ok: { label: 'საკმარისი', color: 'text-green-400', bg: 'bg-green-400/20', border: 'border-green-400/30' },

  low: { label: 'დაბალი', color: 'text-amber-400', bg: 'bg-amber-400/20', border: 'border-amber-400/30' },

  insufficient: { label: 'არასაკმარისი', color: 'text-red-400', bg: 'bg-red-400/20', border: 'border-red-400/30' },

}



export function StartBrewingModal({ 

  isOpen, 

  onClose, 

  onConfirm, 

  batchNumber, 

  recipeName,

  recipeIngredients

}: StartBrewingModalProps) {

  const [ingredients, setIngredients] = useState<(RecipeIngredient & { confirmedAmount: number })[]>([])

  const [notes, setNotes] = useState('')

  const [isLoading, setIsLoading] = useState(false)

  // Use ref to track previous ingredients signature and avoid unnecessary updates
  const prevSignatureRef = useRef<string>('')

  // Sync state with props when recipeIngredients changes (using primitive dependencies)
  useEffect(() => {
    if (!recipeIngredients || recipeIngredients.length === 0) {
      if (prevSignatureRef.current !== '') {
        prevSignatureRef.current = ''
        setIngredients([])
      }
      return
    }
    
    // Create signature from current ingredients (stable string comparison)
    const currentSignature = recipeIngredients.map(ing => `${ing.id}:${ing.requiredAmount}`).join('|')
    
    // Only update if signature actually changed
    if (currentSignature !== prevSignatureRef.current) {
      prevSignatureRef.current = currentSignature
      setIngredients(
        recipeIngredients.map(ing => ({
          ...ing,
          confirmedAmount: ing.requiredAmount,
        }))
      )
    }
  }, [recipeIngredients?.length]) // ✅ Only depend on length - ref handles actual comparison

  // Reset loading state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setIsLoading(false)
    }
  }, [isOpen])

  // ✅ ALL useCallback hooks must be before early returns
  const handleAmountChange = useCallback((id: string, amount: number) => {
    setIngredients(prev => prev.map(ing => 
      ing.id === id ? { ...ing, confirmedAmount: amount } : ing
    ))
  }, [])

  const handleConfirm = useCallback(async () => {
    if (isLoading) return // Prevent double-click
    
    setIsLoading(true)
    try {
      onConfirm(
        ingredients.map(ing => ({
          id: ing.id,
          amount: ing.confirmedAmount,
        }))
      )
    } catch (error) {
      console.error('Error starting brewing:', error)
      setIsLoading(false)
    }
    // Note: Don't setIsLoading(false) on success - modal will close
  }, [ingredients, onConfirm, isLoading])

  // ✅ Computed values (not hooks, so can be after hooks)
  const hasInsufficientStock = ingredients.some(

    ing => ing.confirmedAmount > ing.stockAmount

  )

  // ✅ Early return AFTER all hooks
  if (!isOpen) return null



  // Group ingredients by type

  const grains = ingredients.filter(i => i.type === 'grain')

  const hops = ingredients.filter(i => i.type === 'hop')

  const yeasts = ingredients.filter(i => i.type === 'yeast')

  const adjuncts = ingredients.filter(i => i.type === 'adjunct')



  const renderIngredientGroup = (items: typeof ingredients, title: string, icon: string) => {

    if (items.length === 0) return null

    

    return (

      <div className="mb-6">

        <h4 className="text-sm font-medium text-text-muted mb-3 flex items-center gap-2">

          <span>{icon}</span> {title}

        </h4>

        <div className="space-y-3">

          {items.map(ing => {

            const isOverStock = ing.confirmedAmount > ing.stockAmount

            const stockPercent = (ing.stockAmount / (ing.requiredAmount * 1.5)) * 100

            const afterDeduction = ing.stockAmount - ing.confirmedAmount

            

            return (

              <div 

                key={ing.id}

                className={`p-4 rounded-xl border ${isOverStock ? 'border-red-400/50 bg-red-400/5' : 'border-border bg-bg-tertiary'}`}

              >

                <div className="flex items-start justify-between mb-3">

                  <div>

                    <p className="font-medium">{ing.name}</p>

                    <p className="text-xs text-text-muted">

                      რეცეპტი: {ing.requiredAmount} {ing.unit}

                    </p>

                  </div>

                  <span className={`px-2 py-0.5 rounded text-xs ${STATUS_CONFIG[ing.stockStatus].bg} ${STATUS_CONFIG[ing.stockStatus].color}`}>

                    {STATUS_CONFIG[ing.stockStatus].label}

                  </span>

                </div>

                

                <div className="grid grid-cols-3 gap-4 items-center">

                  {/* Stock Info */}

                  <div>

                    <p className="text-xs text-text-muted mb-1">მარაგში</p>

                    <div className="flex items-center gap-2">

                      <ProgressBar 

                        value={Math.min(100, stockPercent)} 

                        size="sm" 

                        color={ing.stockStatus === 'ok' ? 'success' : ing.stockStatus === 'low' ? 'warning' : 'danger'}

                        className="flex-1"

                      />

                      <span className="font-mono text-sm">{ing.stockAmount}</span>

                    </div>

                  </div>

                  

                  {/* Confirmed Amount Input */}

                  <div>

                    <p className="text-xs text-text-muted mb-1">ფაქტიური ({ing.unit})</p>

                    <input

                      type="number"

                      value={ing.confirmedAmount}

                      onChange={(e) => handleAmountChange(ing.id, parseFloat(e.target.value) || 0)}

                      className={`w-full px-3 py-2 rounded-lg font-mono text-center border ${

                        isOverStock 

                          ? 'border-red-400 bg-red-400/10 text-red-400' 

                          : 'border-border bg-bg-card'

                      } focus:outline-none focus:border-copper`}

                    />

                  </div>

                  

                  {/* After Deduction */}

                  <div>

                    <p className="text-xs text-text-muted mb-1">დარჩება</p>

                    <p className={`font-mono text-lg ${afterDeduction < 0 ? 'text-red-400' : afterDeduction < ing.requiredAmount * 0.5 ? 'text-amber-400' : 'text-green-400'}`}>

                      {afterDeduction} {ing.unit}

                    </p>

                  </div>

                </div>

                

                {isOverStock && (

                  <p className="text-xs text-red-400 mt-2">

                    ⚠️ არასაკმარისი მარაგი! აკლია {(ing.confirmedAmount - ing.stockAmount).toFixed(1)} {ing.unit}

                  </p>

                )}

              </div>

            )

          })}

        </div>

      </div>

    )

  }



  return (

    <div className="fixed inset-0 z-50 flex items-center justify-center">

      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      

      <div className="relative bg-bg-secondary border border-border rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl">

        {/* Header */}

        <div className="px-6 py-4 border-b border-border bg-bg-tertiary">

          <div className="flex items-center gap-4">

            <div className="w-12 h-12 rounded-xl bg-gradient-copper flex items-center justify-center text-2xl">

              🚀

            </div>

            <div>

              <h2 className="text-xl font-display font-semibold">ხარშვის დაწყება</h2>

              <p className="text-sm text-text-muted">

                {batchNumber} • {recipeName}

              </p>

            </div>

          </div>

        </div>



        {/* Content */}

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">

          {/* Info Banner */}

          <div className="bg-blue-400/10 border border-blue-400/30 rounded-xl p-4 mb-6">

            <p className="text-sm text-blue-400">

              💡 დაადასტურეთ ფაქტიური მოხმარება. თუ რაოდენობა განსხვავდება რეცეპტისგან, შეგიძლიათ შეცვალოთ.

              ინგრედიენტები მარაგიდან ჩამოიჭრება დადასტურების შემდეგ.

            </p>

          </div>



          {/* Ingredients by Type */}

          {renderIngredientGroup(grains, 'ალაო და მარცვლეული', '🌾')}

          {renderIngredientGroup(hops, 'სვია', '🌿')}

          {renderIngredientGroup(yeasts, 'საფუარი', '🧫')}

          {renderIngredientGroup(adjuncts, 'დანამატები', '🧪')}



          {/* Notes */}

          <div>

            <label className="block text-sm font-medium mb-2">შენიშვნა (არასავალდებულო)</label>

            <textarea

              value={notes}

              onChange={(e) => setNotes(e.target.value)}

              rows={2}

              placeholder="დამატებითი შენიშვნები..."

              className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl resize-none focus:border-copper focus:outline-none"

            />

          </div>

        </div>



        {/* Warning if insufficient */}

        {hasInsufficientStock && (

          <div className="px-6 py-3 bg-red-400/10 border-t border-red-400/30">

            <p className="text-sm text-red-400 flex items-center gap-2">

              ⚠️ ზოგიერთი ინგრედიენტი არასაკმარისია. გთხოვთ, შეამცირეთ რაოდენობა ან შეავსეთ მარაგი.

            </p>

          </div>

        )}



        {/* Footer */}

        <div className="px-6 py-4 border-t border-border flex justify-between items-center">

          <div className="text-sm text-text-muted">

            სულ ინგრედიენტი: {ingredients.length}

          </div>

          <div className="flex gap-3">

            <Button variant="secondary" onClick={onClose} disabled={isLoading}>

              გაუქმება

            </Button>

            <Button 

              variant="primary" 

              onClick={handleConfirm}

              disabled={hasInsufficientStock || isLoading}

              className={isLoading ? 'opacity-70 cursor-not-allowed' : ''}

            >

              {isLoading ? (

                <span className="flex items-center gap-2">

                  <span className="animate-spin">⏳</span>

                  მიმდინარეობს...

                </span>

              ) : (

                '✓ დადასტურება და დაწყება'

              )}

            </Button>

          </div>

        </div>

      </div>

    </div>

  )

}



// Helper function to check stock status

export function getIngredientStockStatus(

  required: number, 

  available: number

): 'ok' | 'low' | 'insufficient' {

  if (available < required) return 'insufficient'

  if (available < required * 1.5) return 'low'

  return 'ok'

}



