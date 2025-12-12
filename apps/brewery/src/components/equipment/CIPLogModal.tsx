'use client'



import { useState } from 'react'

import { Button } from '@/components/ui'

import { mockTesters, type CIPLog } from '@/data/equipmentData'



interface CIPLogModalProps {

  isOpen: boolean

  onClose: () => void

  onSave: (cipData: any) => void

  equipmentId?: string

  equipmentName?: string

}



export function CIPLogModal({ isOpen, onClose, onSave, equipmentId, equipmentName }: CIPLogModalProps) {

  const [cipType, setCipType] = useState<'full' | 'caustic_only' | 'sanitizer_only' | 'rinse'>('full')

  const [dateTime, setDateTime] = useState<string>(new Date().toISOString().slice(0, 16))

  const [duration, setDuration] = useState<string>('')

  const [temperature, setTemperature] = useState<string>('')

  const [causticConcentration, setCausticConcentration] = useState<string>('')

  const [performedBy, setPerformedBy] = useState<string>('')

  const [result, setResult] = useState<'success' | 'needs_repeat' | 'problem'>('success')

  const [notes, setNotes] = useState<string>('')



  if (!isOpen) return null



  const handleSubmit = (e: React.FormEvent) => {

    e.preventDefault()

    if (!performedBy || !duration) return



    const [datePart, timePart] = dateTime.split('T')

    const [hours, minutes] = timePart.split(':')

    const date = new Date(datePart)

    date.setHours(parseInt(hours), parseInt(minutes))



    onSave({

      equipmentId,

      equipmentName,

      cipType,

      date,

      duration: parseInt(duration),

      temperature: temperature ? parseFloat(temperature) : undefined,

      causticConcentration: causticConcentration ? parseFloat(causticConcentration) : undefined,

      performedBy,

      result,

      notes: notes || undefined,

    })



    // Reset form

    setCipType('full')

    setDateTime(new Date().toISOString().slice(0, 16))

    setDuration('')

    setTemperature('')

    setCausticConcentration('')

    setPerformedBy('')

    setResult('success')

    setNotes('')

    onClose()

  }



  return (

    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>

      <div className="bg-bg-primary border border-border rounded-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>

        <div className="p-6 border-b border-border">

          <div className="flex items-center gap-3">

            <span className="text-2xl">🧹</span>

            <h2 className="text-xl font-semibold">CIP ჩანაწერი</h2>

          </div>

        </div>



        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Equipment (readonly if prefilled) */}

          {equipmentName && (

            <div>

              <label className="block text-sm font-medium mb-2">აღჭურვილობა</label>

              <input

                type="text"

                value={equipmentName}

                readOnly

                className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-sm text-text-muted"

              />

            </div>

          )}



          {/* CIP Type */}

          <div>

            <label className="block text-sm font-medium mb-2">CIP ტიპი *</label>

            <div className="space-y-2">

              {[

                { value: 'full', label: 'სრული CIP (კაუსტიკი + მჟავა + rinse)' },

                { value: 'caustic_only', label: 'მხოლოდ კაუსტიკი' },

                { value: 'sanitizer_only', label: 'მხოლოდ სანიტაიზერი' },

                { value: 'rinse', label: 'სწრაფი rinse' },

              ].map(option => (

                <label key={option.value} className="flex items-center gap-2 cursor-pointer">

                  <input

                    type="radio"

                    name="cipType"

                    value={option.value}

                    checked={cipType === option.value}

                    onChange={() => setCipType(option.value as any)}

                    className="w-4 h-4"

                  />

                  <span className="text-sm">{option.label}</span>

                </label>

              ))}

            </div>

          </div>



          {/* Date/Time */}

          <div>

            <label className="block text-sm font-medium mb-2">თარიღი/დრო *</label>

            <input

              type="datetime-local"

              value={dateTime}

              onChange={(e) => setDateTime(e.target.value)}

              className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"

              required

            />

          </div>



          {/* Duration */}

          <div>

            <label className="block text-sm font-medium mb-2">ხანგრძლივობა (წუთი) *</label>

            <input

              type="number"

              value={duration}

              onChange={(e) => setDuration(e.target.value)}

              className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"

              required

            />

          </div>



          {/* Temperature (if full or caustic) */}

          {(cipType === 'full' || cipType === 'caustic_only') && (

            <div className="grid grid-cols-2 gap-4">

              <div>

                <label className="block text-sm font-medium mb-2">ტემპერატურა (°C)</label>

                <input

                  type="number"

                  step="0.1"

                  value={temperature}

                  onChange={(e) => setTemperature(e.target.value)}

                  className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"

                />

              </div>

              <div>

                <label className="block text-sm font-medium mb-2">კაუსტიკის კონცენტრაცია (%)</label>

                <input

                  type="number"

                  step="0.1"

                  value={causticConcentration}

                  onChange={(e) => setCausticConcentration(e.target.value)}

                  className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"

                />

              </div>

            </div>

          )}



          {/* Performed By */}

          <div>

            <label className="block text-sm font-medium mb-2">შემსრულებელი *</label>

            <select

              value={performedBy}

              onChange={(e) => setPerformedBy(e.target.value)}

              className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"

              required

            >

              <option value="">აირჩიეთ შემსრულებელი</option>

              {mockTesters.map(tester => (

                <option key={tester.id} value={tester.name}>

                  {tester.name} - {tester.role}

                </option>

              ))}

            </select>

          </div>



          {/* Result */}

          <div>

            <label className="block text-sm font-medium mb-2">შედეგი *</label>

            <div className="space-y-2">

              {[

                { value: 'success', label: '✅ წარმატებული', color: 'text-green-400' },

                { value: 'needs_repeat', label: '⚠️ საჭიროებს გამეორებას', color: 'text-amber-400' },

                { value: 'problem', label: '❌ პრობლემა', color: 'text-red-400' },

              ].map(option => (

                <label key={option.value} className="flex items-center gap-2 cursor-pointer">

                  <input

                    type="radio"

                    name="result"

                    value={option.value}

                    checked={result === option.value}

                    onChange={() => setResult(option.value as any)}

                    className="w-4 h-4"

                  />

                  <span className={`text-sm ${option.color}`}>{option.label}</span>

                </label>

              ))}

            </div>

          </div>



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

            <Button type="submit" variant="primary" disabled={!performedBy || !duration}>

              ჩანაწერის დამატება

            </Button>

          </div>

        </form>

      </div>

    </div>

  )

}

