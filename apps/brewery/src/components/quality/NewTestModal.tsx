'use client'



import { useState } from 'react'

import { Button } from '@/components/ui'

import { testTypeConfig, type TestType, type Priority } from '@/data/qualityData'

// Map API test types to component test types
const API_TEST_TYPE_MAP: Record<string, TestType> = {
  GRAVITY: 'gravity',
  TEMPERATURE: 'gravity', // Map to gravity for now
  PH: 'ph',
  DISSOLVED_O2: 'gravity',
  TURBIDITY: 'gravity',
  COLOR: 'color',
  BITTERNESS: 'ibu',
  ALCOHOL: 'abv',
  CARBONATION: 'gravity',
  APPEARANCE: 'sensory',
  AROMA: 'sensory',
  TASTE: 'sensory',
  MICROBIOLOGICAL: 'microbiology',
}

// Map component test types to API test types
const COMPONENT_TO_API_MAP: Record<TestType, string> = {
  gravity: 'GRAVITY',
  ph: 'PH',
  abv: 'ALCOHOL',
  ibu: 'BITTERNESS',
  color: 'COLOR',
  sensory: 'APPEARANCE',
  microbiology: 'MICROBIOLOGICAL',
}



interface NewTestModalProps {

  isOpen: boolean

  onClose: () => void

  onAdd: (testData: any) => void

  batches?: Array<{ id: string; batchNumber: string; recipe?: { name: string } | null; status: string }>

}



export function NewTestModal({ isOpen, onClose, onAdd, batches = [] }: NewTestModalProps) {

  const [step, setStep] = useState(1)

  const [batchId, setBatchId] = useState<string>('')

  const [testType, setTestType] = useState<TestType | ''>('')

  const [minValue, setMinValue] = useState<number>(0)

  const [maxValue, setMaxValue] = useState<number>(0)

  const [scheduledDate, setScheduledDate] = useState<string>(

    new Date().toISOString().split('T')[0]

  )

  const [scheduledTime, setScheduledTime] = useState<string>('14:00')

  const [priority, setPriority] = useState<Priority>('medium')

  const [notes, setNotes] = useState<string>('')



  if (!isOpen) return null



  const selectedBatch = batches.find(b => b.id === batchId)

  const testConfig = testType ? testTypeConfig[testType] : null



  const handleTestTypeSelect = (type: TestType) => {

    setTestType(type)

    const config = testTypeConfig[type]

    setMinValue(config.defaultMin)

    setMaxValue(config.defaultMax)

  }



  const handleSubmit = (e: React.FormEvent) => {

    e.preventDefault()

    if (!batchId || !testType) return



    const [hours, minutes] = scheduledTime.split(':')

    const scheduledDateTime = new Date(scheduledDate)

    scheduledDateTime.setHours(parseInt(hours), parseInt(minutes))



    onAdd({

      batchId,

      testType: COMPONENT_TO_API_MAP[testType as TestType] || testType.toUpperCase(),

      minValue,

      maxValue,

      scheduledDate: scheduledDateTime,

      priority,

      notes: notes || undefined,

    })



    // Reset form

    setStep(1)

    setBatchId('')

    setTestType('')

    setMinValue(0)

    setMaxValue(0)

    setPriority('medium')

    setNotes('')

    onClose()

  }



  return (

    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>

      <div className="bg-bg-primary border border-border rounded-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>

        <div className="p-6 border-b border-border sticky top-0 bg-bg-primary z-10">

          <h2 className="text-xl font-semibold">➕ ახალი ტესტი</h2>

        </div>



        <form onSubmit={handleSubmit} className="p-6 space-y-6">

          {/* Step 1 - Batch Selection */}

          {step === 1 && (

            <div className="space-y-4">

              <div>

                <label className="block text-sm font-medium mb-2">პარტია</label>

                <select

                  value={batchId}

                  onChange={(e) => setBatchId(e.target.value)}

                  className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"

                  required

                >

                  <option value="">აირჩიეთ პარტია</option>

                  {batches.map(batch => (

                    <option key={batch.id} value={batch.id}>

                      {batch.batchNumber} - {batch.recipe?.name || 'N/A'} ({batch.status})

                    </option>

                  ))}

                </select>

              </div>



              <div className="flex justify-end gap-2">

                <Button type="button" variant="secondary" onClick={onClose}>

                  გაუქმება

                </Button>

                <Button type="button" variant="primary" onClick={() => batchId && setStep(2)} disabled={!batchId}>

                  შემდეგი

                </Button>

              </div>

            </div>

          )}



          {/* Step 2 - Test Type */}

          {step === 2 && (

            <div className="space-y-4">

              <div>

                <label className="block text-sm font-medium mb-3">ტესტის ტიპი</label>

                <div className="grid grid-cols-3 gap-3">

                  {Object.entries(testTypeConfig).map(([key, config]) => {

                    const type = key as TestType

                    return (

                      <button

                        key={key}

                        type="button"

                        onClick={() => handleTestTypeSelect(type)}

                        className={`p-4 rounded-lg border transition-all ${

                          testType === type

                            ? 'border-copper bg-copper/10 text-copper-light'

                            : 'border-border bg-bg-card text-text-secondary hover:bg-bg-tertiary'

                        }`}

                      >

                        <div className="text-2xl mb-2">{config.icon}</div>

                        <div className="text-xs font-medium">{config.name}</div>

                      </button>

                    )

                  })}

                </div>

              </div>



              <div className="flex justify-end gap-2">

                <Button type="button" variant="secondary" onClick={() => setStep(1)}>

                  უკან

                </Button>

                <Button type="button" variant="primary" onClick={() => testType && setStep(3)} disabled={!testType}>

                  შემდეგი

                </Button>

              </div>

            </div>

          )}



          {/* Step 3 - Details */}

          {step === 3 && testConfig && (

            <div className="space-y-4">

              <div className="grid grid-cols-2 gap-4">

                <div>

                  <label className="block text-sm font-medium mb-2">ნორმის მინიმუმი</label>

                  <input

                    type="number"

                    step="0.001"

                    value={minValue}

                    onChange={(e) => setMinValue(parseFloat(e.target.value))}

                    className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"

                    required

                  />

                </div>

                <div>

                  <label className="block text-sm font-medium mb-2">ნორმის მაქსიმუმი</label>

                  <input

                    type="number"

                    step="0.001"

                    value={maxValue}

                    onChange={(e) => setMaxValue(parseFloat(e.target.value))}

                    className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"

                    required

                  />

                </div>

              </div>



              <div className="grid grid-cols-2 gap-4">

                <div>

                  <label className="block text-sm font-medium mb-2">დაგეგმილი თარიღი</label>

                  <input

                    type="date"

                    value={scheduledDate}

                    onChange={(e) => setScheduledDate(e.target.value)}

                    className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"

                    required

                  />

                </div>

                <div>

                  <label className="block text-sm font-medium mb-2">დაგეგმილი დრო</label>

                  <input

                    type="time"

                    value={scheduledTime}

                    onChange={(e) => setScheduledTime(e.target.value)}

                    className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"

                    required

                  />

                </div>

              </div>



              <div>

                <label className="block text-sm font-medium mb-2">პრიორიტეტი</label>

                <div className="flex gap-4">

                  {(['low', 'medium', 'high'] as Priority[]).map(p => (

                    <label key={p} className="flex items-center gap-2 cursor-pointer">

                      <input

                        type="radio"

                        name="priority"

                        value={p}

                        checked={priority === p}

                        onChange={() => setPriority(p)}

                        className="w-4 h-4"

                      />

                      <span className={`text-sm ${

                        p === 'high' ? 'text-red-400' :

                        p === 'medium' ? 'text-amber-400' :

                        'text-green-400'

                      }`}>

                        {p === 'high' ? '🔴' : p === 'medium' ? '🟡' : '🟢'} {

                          p === 'high' ? 'მაღალი' :

                          p === 'medium' ? 'საშუალო' :

                          'დაბალი'

                        }

                      </span>

                    </label>

                  ))}

                </div>

              </div>



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



              <div className="flex justify-end gap-2 pt-4 border-t border-border">

                <Button type="button" variant="secondary" onClick={() => setStep(2)}>

                  უკან

                </Button>

                <Button type="button" variant="secondary" onClick={onClose}>

                  გაუქმება

                </Button>

                <Button type="submit" variant="primary">

                  ტესტის დამატება

                </Button>

              </div>

            </div>

          )}

        </form>

      </div>

    </div>

  )

}

