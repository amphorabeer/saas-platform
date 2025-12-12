'use client'



import { useState } from 'react'

import { Button, ProgressBar } from '@/components/ui'

import type { Recipe, Ingredient, BrewingStep } from '@/app/recipes/page'

import { formatDate } from '@/lib/utils'



interface RecipeDetailModalProps {

  recipe: Recipe

  onClose: () => void

  onStartBatch: () => void

}



const INGREDIENT_ICONS = {

  grain: '🌾',

  hop: '🌿',

  yeast: '🧫',

  adjunct: '🧪',

  water: '💧',

}



const INGREDIENT_COLORS = {

  grain: 'bg-amber-400/20 text-amber-400',

  hop: 'bg-green-400/20 text-green-400',

  yeast: 'bg-purple-400/20 text-purple-400',

  adjunct: 'bg-blue-400/20 text-blue-400',

  water: 'bg-cyan-400/20 text-cyan-400',

}



export function RecipeDetailModal({ recipe, onClose, onStartBatch }: RecipeDetailModalProps) {

  const [activeTab, setActiveTab] = useState<'overview' | 'ingredients' | 'process' | 'history'>('overview')



  const grains = recipe.ingredients.filter(i => i.type === 'grain')

  const hops = recipe.ingredients.filter(i => i.type === 'hop')

  const yeast = recipe.ingredients.filter(i => i.type === 'yeast')

  const adjuncts = recipe.ingredients.filter(i => i.type === 'adjunct')



  const formatDuration = (minutes: number) => {

    if (minutes < 60) return `${minutes} წთ`

    if (minutes < 1440) return `${Math.round(minutes / 60)} სთ`

    return `${Math.round(minutes / 1440)} დღე`

  }



  const totalBrewTime = recipe.steps.reduce((sum, step) => sum + step.duration, 0)



  return (

    <div className="fixed inset-0 z-50 flex items-center justify-center">

      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      

      <div className="relative bg-bg-secondary border border-border rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl">

        {/* Header */}

        <div className="px-6 py-4 border-b border-border flex justify-between items-start bg-bg-tertiary">

          <div className="flex items-center gap-4">

            <div className="w-14 h-14 rounded-xl bg-gradient-copper flex items-center justify-center text-2xl">

              🍺

            </div>

            <div>

              <div className="flex items-center gap-2">

                <h2 className="text-xl font-display font-semibold">{recipe.name}</h2>

                {recipe.isFavorite && <span className="text-amber-400 text-lg">★</span>}

              </div>

              <p className="text-sm text-text-muted">{recipe.style} • {recipe.batchSize}L</p>

            </div>

          </div>

          <div className="flex items-center gap-3">

            <div className="text-right mr-4">

              <div className="flex items-center gap-1 text-amber-400">

                <span>⭐</span>

                <span className="font-bold">{recipe.rating}</span>

              </div>

              <p className="text-xs text-text-muted">{recipe.batchCount} პარტია</p>

            </div>

            <button 

              onClick={onClose}

              className="w-8 h-8 rounded-lg bg-bg-card border border-border flex items-center justify-center hover:border-danger hover:text-danger transition-colors"

            >

              ✕

            </button>

          </div>

        </div>



        {/* Tabs */}

        <div className="px-6 pt-4 border-b border-border">

          <div className="flex gap-4">

            {[

              { key: 'overview', label: 'მიმოხილვა' },

              { key: 'ingredients', label: 'ინგრედიენტები' },

              { key: 'process', label: 'პროცესი' },

              { key: 'history', label: 'ისტორია' },

            ].map(tab => (

              <button

                key={tab.key}

                onClick={() => setActiveTab(tab.key as typeof activeTab)}

                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${

                  activeTab === tab.key

                    ? 'border-copper text-copper-light'

                    : 'border-transparent text-text-muted hover:text-text-primary'

                }`}

              >

                {tab.label}

              </button>

            ))}

          </div>

        </div>



        {/* Content */}

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-220px)]">

          {activeTab === 'overview' && (

            <div className="grid grid-cols-3 gap-6">

              {/* Left Column - Description & Notes */}

              <div className="col-span-2 space-y-6">

                <div className="bg-bg-card border border-border rounded-xl p-4">

                  <h3 className="text-sm font-medium mb-3">აღწერა</h3>

                  <p className="text-text-secondary">{recipe.description}</p>

                </div>



                {/* Key Stats */}

                <div className="grid grid-cols-6 gap-3">

                  {[

                    { label: 'OG', value: recipe.targetOG.toFixed(3), color: 'text-copper-light' },

                    { label: 'FG', value: recipe.targetFG.toFixed(3), color: 'text-green-400' },

                    { label: 'ABV', value: `${recipe.targetABV}%`, color: 'text-amber-400' },

                    { label: 'IBU', value: recipe.ibu, color: '' },

                    { label: 'SRM', value: recipe.srm, color: '' },

                    { label: 'ეფექტ.', value: `${recipe.efficiency}%`, color: '' },

                  ].map((stat, i) => (

                    <div key={i} className="bg-bg-card border border-border rounded-xl p-3 text-center">

                      <p className={`text-lg font-mono font-bold ${stat.color}`}>{stat.value}</p>

                      <p className="text-xs text-text-muted">{stat.label}</p>

                    </div>

                  ))}

                </div>



                {/* Notes */}

                {recipe.notes && (

                  <div className="bg-amber-400/10 border border-amber-400/30 rounded-xl p-4">

                    <h3 className="text-sm font-medium mb-2 text-amber-400">💡 შენიშვნები</h3>

                    <p className="text-sm text-text-secondary">{recipe.notes}</p>

                  </div>

                )}



                {/* Ingredients Summary */}

                <div className="bg-bg-card border border-border rounded-xl p-4">

                  <h3 className="text-sm font-medium mb-3">ინგრედიენტების მიმოხილვა</h3>

                  <div className="grid grid-cols-4 gap-4">

                    <div className="text-center p-3 bg-bg-tertiary rounded-lg">

                      <span className="text-2xl">🌾</span>

                      <p className="text-lg font-bold mt-1">{grains.length}</p>

                      <p className="text-xs text-text-muted">ალაო</p>

                    </div>

                    <div className="text-center p-3 bg-bg-tertiary rounded-lg">

                      <span className="text-2xl">🌿</span>

                      <p className="text-lg font-bold mt-1">{hops.length}</p>

                      <p className="text-xs text-text-muted">სვია</p>

                    </div>

                    <div className="text-center p-3 bg-bg-tertiary rounded-lg">

                      <span className="text-2xl">🧫</span>

                      <p className="text-lg font-bold mt-1">{yeast.length}</p>

                      <p className="text-xs text-text-muted">საფუარი</p>

                    </div>

                    <div className="text-center p-3 bg-bg-tertiary rounded-lg">

                      <span className="text-2xl">⏱️</span>

                      <p className="text-lg font-bold mt-1">{formatDuration(totalBrewTime)}</p>

                      <p className="text-xs text-text-muted">სულ დრო</p>

                    </div>

                  </div>

                </div>

              </div>



              {/* Right Column - Quick Info */}

              <div className="space-y-4">

                <div className="bg-bg-card border border-border rounded-xl p-4">

                  <h3 className="text-sm font-medium mb-3">📊 პარამეტრები</h3>

                  <div className="space-y-3">

                    <div className="flex justify-between">

                      <span className="text-text-muted">მოცულობა</span>

                      <span className="font-mono">{recipe.batchSize} L</span>

                    </div>

                    <div className="flex justify-between">

                      <span className="text-text-muted">ხარშვის დრო</span>

                      <span className="font-mono">{recipe.boilTime} წთ</span>

                    </div>

                    <div className="flex justify-between">

                      <span className="text-text-muted">ეფექტურობა</span>

                      <span className="font-mono">{recipe.efficiency}%</span>

                    </div>

                  </div>

                </div>



                <div className="bg-bg-card border border-border rounded-xl p-4">

                  <h3 className="text-sm font-medium mb-3">📅 თარიღები</h3>

                  <div className="space-y-3 text-sm">

                    <div className="flex justify-between">

                      <span className="text-text-muted">შექმნა</span>

                      <span>{formatDate(recipe.createdAt)}</span>

                    </div>

                    <div className="flex justify-between">

                      <span className="text-text-muted">განახლება</span>

                      <span>{formatDate(recipe.updatedAt)}</span>

                    </div>

                  </div>

                </div>



                {/* Color Preview */}

                <div className="bg-bg-card border border-border rounded-xl p-4">

                  <h3 className="text-sm font-medium mb-3">🎨 ფერი (SRM: {recipe.srm})</h3>

                  <div 

                    className="h-16 rounded-lg"

                    style={{ 

                      backgroundColor: `hsl(${Math.max(0, 45 - recipe.srm * 1.5)}, 80%, ${Math.max(10, 50 - recipe.srm)}%)`

                    }}

                  />

                </div>

              </div>

            </div>

          )}



          {activeTab === 'ingredients' && (

            <div className="space-y-6">

              {/* Grains */}

              <div className="bg-bg-card border border-border rounded-xl p-4">

                <h3 className="text-sm font-medium mb-4 flex items-center gap-2">

                  🌾 ალაო და მარცვლეული

                  <span className="text-text-muted">({grains.reduce((sum, g) => sum + g.amount, 0)} kg)</span>

                </h3>

                <div className="space-y-3">

                  {grains.map((ingredient, i) => (

                    <div key={i} className="flex items-center gap-4 p-3 bg-bg-tertiary rounded-lg">

                      <div className="w-12 h-12 rounded-lg bg-amber-400/20 flex items-center justify-center">

                        <span className="text-xl">🌾</span>

                      </div>

                      <div className="flex-1">

                        <p className="font-medium">{ingredient.name}</p>

                        <p className="text-sm text-text-muted">{ingredient.percentage}% რეცეპტის</p>

                      </div>

                      <div className="text-right">

                        <p className="font-mono text-lg">{ingredient.amount} {ingredient.unit}</p>

                      </div>

                      <div className="w-24">

                        <ProgressBar value={ingredient.percentage || 0} size="sm" color="amber" />

                      </div>

                    </div>

                  ))}

                </div>

              </div>



              {/* Hops */}

              <div className="bg-bg-card border border-border rounded-xl p-4">

                <h3 className="text-sm font-medium mb-4 flex items-center gap-2">

                  🌿 სვია

                  <span className="text-text-muted">({hops.reduce((sum, h) => sum + h.amount, 0).toFixed(1)} kg)</span>

                </h3>

                <div className="space-y-3">

                  {hops.map((ingredient, i) => (

                    <div key={i} className="flex items-center gap-4 p-3 bg-bg-tertiary rounded-lg">

                      <div className="w-12 h-12 rounded-lg bg-green-400/20 flex items-center justify-center">

                        <span className="text-xl">🌿</span>

                      </div>

                      <div className="flex-1">

                        <p className="font-medium">{ingredient.name}</p>

                        <p className="text-sm text-text-muted">{ingredient.addTime}</p>

                      </div>

                      <div className="text-right">

                        <p className="font-mono text-lg">{ingredient.amount} {ingredient.unit}</p>

                      </div>

                    </div>

                  ))}

                </div>

              </div>



              {/* Yeast */}

              <div className="bg-bg-card border border-border rounded-xl p-4">

                <h3 className="text-sm font-medium mb-4 flex items-center gap-2">

                  🧫 საფუარი

                </h3>

                <div className="space-y-3">

                  {yeast.map((ingredient, i) => (

                    <div key={i} className="flex items-center gap-4 p-3 bg-bg-tertiary rounded-lg">

                      <div className="w-12 h-12 rounded-lg bg-purple-400/20 flex items-center justify-center">

                        <span className="text-xl">🧫</span>

                      </div>

                      <div className="flex-1">

                        <p className="font-medium">{ingredient.name}</p>

                      </div>

                      <div className="text-right">

                        <p className="font-mono text-lg">{ingredient.amount} {ingredient.unit}</p>

                      </div>

                    </div>

                  ))}

                </div>

              </div>

            </div>

          )}



          {activeTab === 'process' && (

            <div className="space-y-4">

              {recipe.steps.map((step, index) => (

                <div key={step.id} className="flex gap-4">

                  {/* Step number */}

                  <div className="flex flex-col items-center">

                    <div className="w-10 h-10 rounded-full bg-copper text-white flex items-center justify-center font-bold">

                      {index + 1}

                    </div>

                    {index < recipe.steps.length - 1 && (

                      <div className="w-0.5 flex-1 bg-border my-2" />

                    )}

                  </div>



                  {/* Step content */}

                  <div className="flex-1 bg-bg-card border border-border rounded-xl p-4 mb-4">

                    <div className="flex justify-between items-start mb-2">

                      <h4 className="font-display font-semibold text-lg">{step.name}</h4>

                      <div className="flex gap-3 text-sm">

                        {step.temperature && (

                          <span className="px-2 py-1 bg-amber-400/20 text-amber-400 rounded">

                            🌡️ {step.temperature}°C

                          </span>

                        )}

                        <span className="px-2 py-1 bg-blue-400/20 text-blue-400 rounded">

                          ⏱️ {formatDuration(step.duration)}

                        </span>

                      </div>

                    </div>

                    <p className="text-text-secondary">{step.description}</p>

                    {step.notes && (

                      <p className="text-sm text-text-muted mt-2 italic">💡 {step.notes}</p>

                    )}

                  </div>

                </div>

              ))}

            </div>

          )}



          {activeTab === 'history' && (

            <div className="space-y-4">

              <div className="bg-bg-card border border-border rounded-xl p-4">

                <h3 className="text-sm font-medium mb-4">ბოლო პარტიები</h3>

                <div className="space-y-3">

                  {[

                    { batch: 'BRW-2024-0156', date: '2024-12-01', rating: 4.9, notes: 'შესანიშნავი შედეგი' },

                    { batch: 'BRW-2024-0148', date: '2024-11-15', rating: 4.7, notes: 'ოდნავ მაღალი FG' },

                    { batch: 'BRW-2024-0139', date: '2024-10-28', rating: 4.8, notes: '' },

                  ].map((batch, i) => (

                    <div key={i} className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">

                      <div>

                        <p className="font-mono text-copper-light">{batch.batch}</p>

                        <p className="text-xs text-text-muted">{batch.date}</p>

                      </div>

                      <div className="text-right">

                        <p className="text-amber-400">⭐ {batch.rating}</p>

                        {batch.notes && <p className="text-xs text-text-muted">{batch.notes}</p>}

                      </div>

                    </div>

                  ))}

                </div>

              </div>

            </div>

          )}

        </div>



        {/* Footer */}

        <div className="px-6 py-4 border-t border-border flex justify-between">

          <div className="flex gap-2">

            <Button variant="ghost">✏️ რედაქტირება</Button>

            <Button variant="ghost">📋 დუბლიკატი</Button>

            <Button variant="ghost">📤 ექსპორტი</Button>

          </div>

          <div className="flex gap-3">

            <Button variant="secondary" onClick={onClose}>დახურვა</Button>

            <Button variant="primary" onClick={onStartBatch}>🍺 პარტიის დაწყება</Button>

          </div>

        </div>

      </div>

    </div>

  )

}



