'use client'



import { useState } from 'react'

import { Button } from '@/components/ui'

import type { Recipe } from '@/app/recipes/page'



interface NewRecipeModalProps {

  onClose: () => void

  onSave: (recipe: Omit<Recipe, 'id'>) => void

}



const BEER_STYLES = [

  'Amber Lager', 'American IPA', 'Pale Ale', 'Pilsner', 'Stout',

  'Porter', 'Wheat Beer', 'Belgian Ale', 'Sour', 'Saison', 'Brown Ale'

]



export function NewRecipeModal({ onClose, onSave }: NewRecipeModalProps) {

  const [step, setStep] = useState(1)

  const [formData, setFormData] = useState({

    name: '',

    style: '',

    description: '',

    targetOG: 1.050,

    targetFG: 1.010,

    ibu: 30,

    srm: 10,

    batchSize: 2000,

    boilTime: 60,

    efficiency: 75,

    notes: '',

  })



  const targetABV = ((formData.targetOG - formData.targetFG) * 131.25).toFixed(1)



  const handleSave = () => {

    onSave({

      ...formData,

      targetABV: parseFloat(targetABV),

      ingredients: [],

      steps: [],

      createdAt: new Date(),

      updatedAt: new Date(),

      batchCount: 0,

      rating: 0,

      isFavorite: false,

    })

  }



  return (

    <div className="fixed inset-0 z-50 flex items-center justify-center">

      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      

      <div className="relative bg-bg-secondary border border-border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">

        {/* Header */}

        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-bg-tertiary">

          <div>

            <h2 className="text-xl font-display font-semibold">ახალი რეცეპტი</h2>

            <p className="text-sm text-text-muted">ნაბიჯი {step} / 2</p>

          </div>

          <button 

            onClick={onClose}

            className="w-8 h-8 rounded-lg bg-bg-card border border-border flex items-center justify-center hover:border-danger hover:text-danger transition-colors"

          >

            ✕

          </button>

        </div>



        {/* Content */}

        <div className="p-6">

          {step === 1 && (

            <div className="space-y-4">

              <div>

                <label className="block text-sm font-medium mb-2">რეცეპტის სახელი *</label>

                <input

                  type="text"

                  value={formData.name}

                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}

                  placeholder="მაგ: Georgian Amber Lager"

                  className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl focus:border-copper focus:outline-none"

                />

              </div>



              <div>

                <label className="block text-sm font-medium mb-2">სტილი *</label>

                <select

                  value={formData.style}

                  onChange={(e) => setFormData(prev => ({ ...prev, style: e.target.value }))}

                  className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl focus:border-copper focus:outline-none"

                >

                  <option value="">აირჩიეთ სტილი</option>

                  {BEER_STYLES.map(style => (

                    <option key={style} value={style}>{style}</option>

                  ))}

                </select>

              </div>



              <div>

                <label className="block text-sm font-medium mb-2">აღწერა</label>

                <textarea

                  value={formData.description}

                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}

                  rows={3}

                  placeholder="რეცეპტის მოკლე აღწერა..."

                  className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl focus:border-copper focus:outline-none resize-none"

                />

              </div>



              <div className="grid grid-cols-2 gap-4">

                <div>

                  <label className="block text-sm font-medium mb-2">მოცულობა (L)</label>

                  <input

                    type="number"

                    value={formData.batchSize}

                    onChange={(e) => setFormData(prev => ({ ...prev, batchSize: Number(e.target.value) }))}

                    className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl focus:border-copper focus:outline-none font-mono"

                  />

                </div>

                <div>

                  <label className="block text-sm font-medium mb-2">ხარშვის დრო (წთ)</label>

                  <input

                    type="number"

                    value={formData.boilTime}

                    onChange={(e) => setFormData(prev => ({ ...prev, boilTime: Number(e.target.value) }))}

                    className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl focus:border-copper focus:outline-none font-mono"

                  />

                </div>

              </div>

            </div>

          )}



          {step === 2 && (

            <div className="space-y-4">

              <div className="grid grid-cols-3 gap-4">

                <div>

                  <label className="block text-sm font-medium mb-2">სამიზნე OG</label>

                  <input

                    type="number"

                    step="0.001"

                    value={formData.targetOG}

                    onChange={(e) => setFormData(prev => ({ ...prev, targetOG: Number(e.target.value) }))}

                    className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl focus:border-copper focus:outline-none font-mono"

                  />

                </div>

                <div>

                  <label className="block text-sm font-medium mb-2">სამიზნე FG</label>

                  <input

                    type="number"

                    step="0.001"

                    value={formData.targetFG}

                    onChange={(e) => setFormData(prev => ({ ...prev, targetFG: Number(e.target.value) }))}

                    className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl focus:border-copper focus:outline-none font-mono"

                  />

                </div>

                <div>

                  <label className="block text-sm font-medium mb-2">ABV (ავტო)</label>

                  <div className="px-4 py-3 bg-copper/20 border border-copper/50 rounded-xl font-mono text-copper-light">

                    {targetABV}%

                  </div>

                </div>

              </div>



              <div className="grid grid-cols-3 gap-4">

                <div>

                  <label className="block text-sm font-medium mb-2">IBU</label>

                  <input

                    type="number"

                    value={formData.ibu}

                    onChange={(e) => setFormData(prev => ({ ...prev, ibu: Number(e.target.value) }))}

                    className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl focus:border-copper focus:outline-none font-mono"

                  />

                </div>

                <div>

                  <label className="block text-sm font-medium mb-2">SRM</label>

                  <input

                    type="number"

                    value={formData.srm}

                    onChange={(e) => setFormData(prev => ({ ...prev, srm: Number(e.target.value) }))}

                    className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl focus:border-copper focus:outline-none font-mono"

                  />

                </div>

                <div>

                  <label className="block text-sm font-medium mb-2">ეფექტურობა %</label>

                  <input

                    type="number"

                    value={formData.efficiency}

                    onChange={(e) => setFormData(prev => ({ ...prev, efficiency: Number(e.target.value) }))}

                    className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl focus:border-copper focus:outline-none font-mono"

                  />

                </div>

              </div>



              <div>

                <label className="block text-sm font-medium mb-2">შენიშვნები</label>

                <textarea

                  value={formData.notes}

                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}

                  rows={3}

                  placeholder="დამატებითი შენიშვნები..."

                  className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl focus:border-copper focus:outline-none resize-none"

                />

              </div>



              {/* Preview */}

              <div className="bg-copper/10 border border-copper/30 rounded-xl p-4">

                <h4 className="text-sm font-medium text-copper-light mb-2">მიმოხილვა</h4>

                <div className="grid grid-cols-4 gap-4 text-sm">

                  <div>

                    <span className="text-text-muted">სახელი:</span>

                    <p className="font-medium">{formData.name || '-'}</p>

                  </div>

                  <div>

                    <span className="text-text-muted">სტილი:</span>

                    <p className="font-medium">{formData.style || '-'}</p>

                  </div>

                  <div>

                    <span className="text-text-muted">ABV:</span>

                    <p className="font-medium">{targetABV}%</p>

                  </div>

                  <div>

                    <span className="text-text-muted">მოცულობა:</span>

                    <p className="font-medium">{formData.batchSize}L</p>

                  </div>

                </div>

              </div>

            </div>

          )}

        </div>



        {/* Footer */}

        <div className="px-6 py-4 border-t border-border flex justify-between">

          <Button variant="secondary" onClick={step === 1 ? onClose : () => setStep(1)}>

            {step === 1 ? 'გაუქმება' : '← უკან'}

          </Button>

          <Button 

            variant="primary" 

            onClick={step === 1 ? () => setStep(2) : handleSave}

            disabled={step === 1 && (!formData.name || !formData.style)}

          >

            {step === 1 ? 'შემდეგი →' : '✓ შენახვა'}

          </Button>

        </div>

      </div>

    </div>

  )

}



