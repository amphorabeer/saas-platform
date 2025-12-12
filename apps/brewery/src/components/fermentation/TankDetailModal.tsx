'use client'



import { useState } from 'react'

import { Button, ProgressBar, BatchStatusBadge } from '@/components/ui'

import { formatDate, formatTime } from '@/lib/utils'



interface Tank {

  id: string

  name: string

  type: 'fermenter' | 'brite' | 'conditioning'

  capacity: number

  currentVolume: number

  status: 'available' | 'in_use' | 'cleaning' | 'maintenance'

  batch?: {

    id: string

    batchNumber: string

    recipe: string

    status: 'fermenting' | 'conditioning' | 'ready'

    startDate: Date

    estimatedEndDate: Date

    progress: number

  }

  temperature: {

    current: number

    target: number

    history: { time: string; value: number }[]

  }

  gravity: {

    original: number

    current: number

    target: number

    history: { time: string; value: number }[]

  }

  pressure?: number

  ph?: number

  lastUpdated: Date

}



interface TankDetailModalProps {

  tank: Tank

  onClose: () => void

}



export function TankDetailModal({ tank, onClose }: TankDetailModalProps) {

  const [activeTab, setActiveTab] = useState<'overview' | 'temperature' | 'gravity' | 'log'>('overview')

  const [newTempTarget, setNewTempTarget] = useState(tank.temperature.target)



  const fillPercent = Math.round((tank.currentVolume / tank.capacity) * 100)

  const attenuationPercent = tank.gravity.original > 0 

    ? Math.round(((tank.gravity.original - tank.gravity.current) / (tank.gravity.original - tank.gravity.target)) * 100)

    : 0



  const calculateABV = () => {

    if (tank.gravity.original === 0) return 0

    return ((tank.gravity.original - tank.gravity.current) * 131.25).toFixed(1)

  }



  return (

    <div className="fixed inset-0 z-50 flex items-center justify-center">

      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      

      <div className="relative bg-bg-secondary border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">

        {/* Header */}

        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-bg-tertiary">

          <div className="flex items-center gap-4">

            <div className="w-12 h-12 rounded-xl bg-copper/20 flex items-center justify-center text-2xl">

              🧪

            </div>

            <div>

              <h2 className="text-xl font-display font-semibold">{tank.name}</h2>

              <p className="text-sm text-text-muted">

                {tank.type === 'fermenter' ? 'ფერმენტატორი' : 'ბრაიტ ტანკი'} • {tank.capacity}L

              </p>

            </div>

          </div>

          <button 

            onClick={onClose}

            className="w-8 h-8 rounded-lg bg-bg-card border border-border flex items-center justify-center hover:border-danger hover:text-danger transition-colors"

          >

            ✕

          </button>

        </div>



        {/* Tabs */}

        <div className="px-6 pt-4 border-b border-border">

          <div className="flex gap-4">

            {[

              { key: 'overview', label: 'მიმოხილვა' },

              { key: 'temperature', label: 'ტემპერატურა' },

              { key: 'gravity', label: 'სიმკვრივე' },

              { key: 'log', label: 'ჟურნალი' },

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

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">

          {activeTab === 'overview' && (

            <div className="grid grid-cols-2 gap-6">

              {/* Left Column */}

              <div className="space-y-6">

                {/* Batch Info */}

                {tank.batch && (

                  <div className="bg-bg-card border border-border rounded-xl p-4">

                    <h3 className="text-sm font-medium mb-3 flex items-center gap-2">

                      🍺 აქტიური პარტია

                    </h3>

                    <div className="space-y-3">

                      <div className="flex justify-between items-center">

                        <span className="font-mono text-copper-light">{tank.batch.batchNumber}</span>

                        <BatchStatusBadge status={tank.batch.status} showPulse={tank.batch.status === 'fermenting'} />

                      </div>

                      <p className="text-lg font-medium">{tank.batch.recipe}</p>

                      <div>

                        <div className="flex justify-between text-sm mb-1">

                          <span className="text-text-muted">პროგრესი</span>

                          <span>{tank.batch.progress}%</span>

                        </div>

                        <ProgressBar value={tank.batch.progress} color="copper" />

                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">

                        <div>

                          <p className="text-text-muted">დაწყება</p>

                          <p>{formatDate(tank.batch.startDate)}</p>

                        </div>

                        <div>

                          <p className="text-text-muted">სავარაუდო დასრულება</p>

                          <p>{formatDate(tank.batch.estimatedEndDate)}</p>

                        </div>

                      </div>

                    </div>

                  </div>

                )}



                {/* Volume */}

                <div className="bg-bg-card border border-border rounded-xl p-4">

                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">

                    📊 მოცულობა

                  </h3>

                  <div className="flex items-center gap-4">

                    <div className="flex-1">

                      <div className="flex justify-between text-sm mb-1">

                        <span className="text-text-muted">შევსება</span>

                        <span>{fillPercent}%</span>

                      </div>

                      <ProgressBar value={fillPercent} color="amber" />

                    </div>

                    <div className="text-right">

                      <p className="text-2xl font-bold font-display">{tank.currentVolume}</p>

                      <p className="text-xs text-text-muted">/ {tank.capacity} L</p>

                    </div>

                  </div>

                </div>

              </div>



              {/* Right Column - Metrics */}

              <div className="space-y-6">

                {/* Temperature Control */}

                <div className="bg-bg-card border border-border rounded-xl p-4">

                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">

                    🌡️ ტემპერატურის კონტროლი

                  </h3>

                  <div className="grid grid-cols-2 gap-4 mb-4">

                    <div className="text-center p-4 bg-bg-tertiary rounded-xl">

                      <p className="text-3xl font-bold font-mono text-amber-400">{tank.temperature.current}°C</p>

                      <p className="text-xs text-text-muted">მიმდინარე</p>

                    </div>

                    <div className="text-center p-4 bg-bg-tertiary rounded-xl">

                      <p className="text-3xl font-bold font-mono text-green-400">{tank.temperature.target}°C</p>

                      <p className="text-xs text-text-muted">სამიზნე</p>

                    </div>

                  </div>

                  <div className="flex items-center gap-2">

                    <input

                      type="number"

                      value={newTempTarget}

                      onChange={(e) => setNewTempTarget(Number(e.target.value))}

                      step="0.5"

                      className="flex-1 px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm font-mono"

                    />

                    <Button variant="secondary" size="sm">განაახლე</Button>

                  </div>

                </div>



                {/* Gravity */}

                <div className="bg-bg-card border border-border rounded-xl p-4">

                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">

                    📈 სიმკვრივე / ატენუაცია

                  </h3>

                  <div className="grid grid-cols-3 gap-4 mb-4">

                    <div className="text-center">

                      <p className="text-xl font-mono">{tank.gravity.original.toFixed(3)}</p>

                      <p className="text-xs text-text-muted">OG</p>

                    </div>

                    <div className="text-center">

                      <p className="text-xl font-mono text-copper-light">{tank.gravity.current.toFixed(3)}</p>

                      <p className="text-xs text-text-muted">SG</p>

                    </div>

                    <div className="text-center">

                      <p className="text-xl font-mono text-green-400">{tank.gravity.target.toFixed(3)}</p>

                      <p className="text-xs text-text-muted">FG</p>

                    </div>

                  </div>

                  <div className="mb-3">

                    <div className="flex justify-between text-sm mb-1">

                      <span className="text-text-muted">ატენუაცია</span>

                      <span>{Math.min(attenuationPercent, 100)}%</span>

                    </div>

                    <ProgressBar value={Math.min(attenuationPercent, 100)} color="success" />

                  </div>

                  <div className="flex justify-between items-center p-3 bg-bg-tertiary rounded-lg">

                    <span className="text-sm text-text-muted">სავარაუდო ABV</span>

                    <span className="text-lg font-bold text-copper-light">{calculateABV()}%</span>

                  </div>

                </div>



                {/* Additional Metrics */}

                {(tank.pressure !== undefined || tank.ph !== undefined) && (

                  <div className="grid grid-cols-2 gap-4">

                    {tank.pressure !== undefined && (

                      <div className="bg-bg-card border border-border rounded-xl p-4 text-center">

                        <p className="text-2xl font-bold font-mono">{tank.pressure}</p>

                        <p className="text-xs text-text-muted">წნევა (bar)</p>

                      </div>

                    )}

                    {tank.ph !== undefined && (

                      <div className="bg-bg-card border border-border rounded-xl p-4 text-center">

                        <p className="text-2xl font-bold font-mono">{tank.ph}</p>

                        <p className="text-xs text-text-muted">pH</p>

                      </div>

                    )}

                  </div>

                )}

              </div>

            </div>

          )}



          {activeTab === 'temperature' && (

            <div className="space-y-6">

              <div className="bg-bg-card border border-border rounded-xl p-4">

                <h3 className="text-sm font-medium mb-4">ტემპერატურის ისტორია (24 სთ)</h3>

                {tank.temperature.history.length > 0 ? (

                  <div className="h-64 flex items-end gap-2">

                    {tank.temperature.history.map((point, i) => (

                      <div key={i} className="flex-1 flex flex-col items-center gap-2">

                        <span className="text-xs font-mono">{point.value}°</span>

                        <div 

                          className="w-full bg-amber-500/60 rounded-t transition-all hover:bg-amber-500"

                          style={{ height: `${(point.value / 25) * 100}%` }}

                        />

                        <span className="text-[10px] text-text-muted">{point.time}</span>

                      </div>

                    ))}

                  </div>

                ) : (

                  <div className="h-64 flex items-center justify-center text-text-muted">

                    მონაცემები არ არის

                  </div>

                )}

                <div className="mt-4 flex items-center justify-center gap-8 text-sm">

                  <div className="flex items-center gap-2">

                    <div className="w-3 h-3 bg-amber-500/60 rounded" />

                    <span className="text-text-muted">ტემპერატურა</span>

                  </div>

                  <div className="flex items-center gap-2">

                    <div className="w-8 h-0.5 bg-green-400" />

                    <span className="text-text-muted">სამიზნე ({tank.temperature.target}°C)</span>

                  </div>

                </div>

              </div>

            </div>

          )}



          {activeTab === 'gravity' && (

            <div className="space-y-6">

              <div className="bg-bg-card border border-border rounded-xl p-4">

                <h3 className="text-sm font-medium mb-4">სიმკვრივის ცვლილება</h3>

                {tank.gravity.history.length > 0 ? (

                  <div className="h-64 flex items-end gap-4">

                    {tank.gravity.history.map((point, i) => {

                      const heightPercent = ((point.value - 1) / 0.07) * 100

                      return (

                        <div key={i} className="flex-1 flex flex-col items-center gap-2">

                          <span className="text-xs font-mono">{point.value.toFixed(3)}</span>

                          <div 

                            className="w-full bg-purple-500/60 rounded-t transition-all hover:bg-purple-500"

                            style={{ height: `${heightPercent}%` }}

                          />

                          <span className="text-[10px] text-text-muted">{point.time}</span>

                        </div>

                      )

                    })}

                  </div>

                ) : (

                  <div className="h-64 flex items-center justify-center text-text-muted">

                    მონაცემები არ არის

                  </div>

                )}

              </div>



              {/* Add Reading */}

              <div className="bg-bg-card border border-border rounded-xl p-4">

                <h3 className="text-sm font-medium mb-3">ახალი გაზომვის დამატება</h3>

                <div className="flex gap-4">

                  <div className="flex-1">

                    <label className="text-xs text-text-muted mb-1 block">სიმკვრივე (SG)</label>

                    <input

                      type="number"

                      step="0.001"

                      placeholder="1.012"

                      className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm font-mono"

                    />

                  </div>

                  <div className="flex-1">

                    <label className="text-xs text-text-muted mb-1 block">ტემპერატურა (°C)</label>

                    <input

                      type="number"

                      step="0.1"

                      placeholder="12.0"

                      className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm font-mono"

                    />

                  </div>

                  <div className="flex items-end">

                    <Button variant="primary">დამატება</Button>

                  </div>

                </div>

              </div>

            </div>

          )}



          {activeTab === 'log' && (

            <div className="space-y-4">

              {[

                { time: '10:30', action: 'ტემპერატურის გაზომვა', value: '12.3°C', user: 'ნ. ზედგინიძე' },

                { time: '08:00', action: 'სიმკვრივის გაზომვა', value: '1.018', user: 'ნ. ზედგინიძე' },

                { time: 'გუშინ 18:00', action: 'ტემპერატურის კორექტირება', value: '12.0°C → 12.0°C', user: 'სისტემა' },

                { time: 'გუშინ 08:00', action: 'სიმკვრივის გაზომვა', value: '1.024', user: 'ნ. ზედგინიძე' },

                { time: '3 დღის წინ', action: 'ფერმენტაცია დაწყებულია', value: 'OG: 1.052', user: 'ნ. ზედგინიძე' },

              ].map((log, i) => (

                <div key={i} className="flex items-center gap-4 p-3 bg-bg-card border border-border rounded-lg">

                  <div className="w-20 text-xs text-text-muted">{log.time}</div>

                  <div className="flex-1">

                    <p className="text-sm">{log.action}</p>

                    <p className="text-xs text-text-muted">{log.user}</p>

                  </div>

                  <div className="font-mono text-sm text-copper-light">{log.value}</div>

                </div>

              ))}

            </div>

          )}

        </div>



        {/* Footer */}

        <div className="px-6 py-4 border-t border-border flex justify-between">

          <div className="text-xs text-text-muted">

            ბოლო განახლება: {formatTime(tank.lastUpdated)}

          </div>

          <div className="flex gap-3">

            <Button variant="secondary" onClick={onClose}>დახურვა</Button>

            {tank.batch && (

              <Button variant="primary">პარტიის ნახვა →</Button>

            )}

          </div>

        </div>

      </div>

    </div>

  )

}
