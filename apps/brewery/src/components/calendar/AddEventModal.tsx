'use client'



import { useState } from 'react'

import { Button } from '@/components/ui'



interface Tank {

  id: string

  name: string

  type: 'fermenter' | 'brite' | 'kettle'

  capacity: number

  status: 'available' | 'in_use' | 'cleaning' | 'maintenance'

}



interface AddEventModalProps {

  isOpen: boolean

  onClose: () => void

  onAdd: (eventData: any) => void

  tanks: Tank[]

  defaultDate?: Date

  defaultTankId?: string

}



export function AddEventModal({ isOpen, onClose, onAdd, tanks, defaultDate, defaultTankId }: AddEventModalProps) {

  const [eventType, setEventType] = useState<'brewing' | 'fermentation' | 'conditioning' | 'packaging' | 'maintenance'>('brewing')

  const [tankId, setTankId] = useState<string>(defaultTankId || '')

  const [batchId, setBatchId] = useState<string>('')

  const [startDate, setStartDate] = useState<string>(

    defaultDate ? defaultDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]

  )

  const [endDate, setEndDate] = useState<string>(

    defaultDate ? defaultDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]

  )

  const [notes, setNotes] = useState<string>('')



  if (!isOpen) return null



  const handleSubmit = (e: React.FormEvent) => {

    e.preventDefault()

    onAdd({

      type: eventType,

      tankId,

      batchId: batchId || undefined,

      startDate: new Date(startDate),

      endDate: new Date(endDate),

      notes: notes || undefined,

    })

    onClose()

  }



  const eventTypeOptions = [

    { value: 'brewing', label: '🍺 ხარშვა', icon: '🍺' },

    { value: 'fermentation', label: '🧪 ფერმენტაცია', icon: '🧪' },

    { value: 'conditioning', label: '🎁 შეფუთვა', icon: '🎁' },

    { value: 'maintenance', label: '🔧 მოვლა', icon: '🔧' },

  ]



  const availableTanks = tanks.filter(t => 

    eventType === 'fermentation' ? t.type === 'fermenter' :

    eventType === 'conditioning' ? t.type === 'brite' :

    eventType === 'brewing' ? t.type === 'kettle' :

    true

  )



  return (

    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>

      <div className="bg-bg-primary border border-border rounded-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>

        <div className="p-6 border-b border-border">

          <h2 className="text-xl font-semibold">➕ ახალი ივენთი</h2>

        </div>



        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Event Type */}

          <div>

            <label className="block text-sm font-medium mb-2">ივენთის ტიპი</label>

            <div className="grid grid-cols-2 gap-2">

              {eventTypeOptions.map(option => (

                <button

                  key={option.value}

                  type="button"

                  onClick={() => setEventType(option.value as any)}

                  className={`p-3 rounded-lg border transition-all ${

                    eventType === option.value

                      ? 'border-copper bg-copper/10 text-copper-light'

                      : 'border-border bg-bg-card text-text-secondary hover:bg-bg-tertiary'

                  }`}

                >

                  <div className="text-lg mb-1">{option.icon}</div>

                  <div className="text-xs">{option.label.split(' ')[1]}</div>

                </button>

              ))}

            </div>

          </div>



          {/* Tank Selection */}

          {(eventType === 'fermentation' || eventType === 'conditioning' || eventType === 'maintenance') && (

            <div>

              <label className="block text-sm font-medium mb-2">ტანკი</label>

              <select

                value={tankId}

                onChange={(e) => setTankId(e.target.value)}

                className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"

                required

              >

                <option value="">აირჩიეთ ტანკი</option>

                {availableTanks.map(tank => (

                  <option key={tank.id} value={tank.id}>

                    {tank.name} ({tank.capacity}L)

                  </option>

                ))}

              </select>

            </div>

          )}



          {/* Batch Selection (for brewing/fermentation/packaging) */}

          {(eventType === 'brewing' || eventType === 'fermentation' || eventType === 'packaging') && (

            <div>

              <label className="block text-sm font-medium mb-2">პარტია</label>

              <select

                value={batchId}

                onChange={(e) => setBatchId(e.target.value)}

                className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"

              >

                <option value="">აირჩიეთ პარტია</option>

                <option value="batch-1">BRW-2024-0157</option>

                <option value="batch-2">BRW-2024-0158</option>

                <option value="batch-3">BRW-2024-0159</option>

              </select>

            </div>

          )}



          {/* Start Date */}

          <div>

            <label className="block text-sm font-medium mb-2">დაწყების თარიღი</label>

            <input

              type="date"

              value={startDate}

              onChange={(e) => setStartDate(e.target.value)}

              className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"

              required

            />

          </div>



          {/* End Date */}

          {eventType !== 'brewing' && (

            <div>

              <label className="block text-sm font-medium mb-2">დასრულების თარიღი</label>

              <input

                type="date"

                value={endDate}

                onChange={(e) => setEndDate(e.target.value)}

                className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"

                required

              />

            </div>

          )}



          {/* Notes */}

          <div>

            <label className="block text-sm font-medium mb-2">შენიშვნა</label>

            <textarea

              value={notes}

              onChange={(e) => setNotes(e.target.value)}

              rows={3}

              className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm resize-none"

              placeholder="დამატებითი ინფორმაცია..."

            />

          </div>



          {/* Footer */}

          <div className="flex justify-end gap-2 pt-4 border-t border-border">

            <Button type="button" variant="outline" onClick={onClose}>

              გაუქმება

            </Button>

            <Button type="submit" variant="primary">

              დამატება

            </Button>

          </div>

        </form>

      </div>

    </div>

  )

}

