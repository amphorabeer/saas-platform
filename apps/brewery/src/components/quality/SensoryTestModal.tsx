'use client'



import { useState, useEffect } from 'react'

import { Button } from '@/components/ui'

import { formatDateTime } from '@/lib/utils'

import { mockTesters, type SensoryTest } from '@/data/qualityData'

import { mockBatches } from '@/data/mockData'



interface SensoryTestModalProps {

  test: SensoryTest | null

  batchId?: string

  isOpen: boolean

  onClose: () => void

  onSave: (testData: any) => void

}



const criteria = [

  { key: 'aroma', label: 'არომატი' },

  { key: 'taste', label: 'გემო' },

  { key: 'body', label: 'სხეული' },

  { key: 'bitterness', label: 'სიმწარე' },

  { key: 'finish', label: 'დაბოლოება' },

  { key: 'appearance', label: 'გარეგნობა' },

] as const



const defectOptions = [

  'დიაცეტილი (კარაქი)',

  'DMS (სიმინდი)',

  'აცეტალდეჰიდი (ვაშლი)',

  'ჟანგვა (მუყაო)',

  'ინფექცია',

]



export function SensoryTestModal({ test, batchId, isOpen, onClose, onSave }: SensoryTestModalProps) {

  const [selectedBatchId, setSelectedBatchId] = useState<string>(batchId || test?.batchId || '')

  const [scores, setScores] = useState<Record<string, number>>({

    aroma: test?.aroma || 5,

    taste: test?.taste || 5,

    body: test?.body || 5,

    bitterness: test?.bitterness || 5,

    finish: test?.finish || 5,

    appearance: test?.appearance || 5,

  })

  const [defects, setDefects] = useState<string[]>(test?.defects || [])

  const [customDefect, setCustomDefect] = useState<string>('')

  const [performedBy, setPerformedBy] = useState<string>(test?.performedBy || '')

  const [notes, setNotes] = useState<string>(test?.notes || '')



  const selectedBatch = mockBatches.find(b => b.id === selectedBatchId)

  const averageScore = Object.values(scores).reduce((sum, val) => sum + val, 0) / criteria.length



  const handleScoreChange = (key: string, value: number) => {

    setScores(prev => ({ ...prev, [key]: value }))

  }



  const handleDefectToggle = (defect: string) => {

    setDefects(prev =>

      prev.includes(defect)

        ? prev.filter(d => d !== defect)

        : [...prev, defect]

    )

  }



  const handleAddCustomDefect = () => {

    if (customDefect.trim() && !defects.includes(customDefect.trim())) {

      setDefects(prev => [...prev, customDefect.trim()])

      setCustomDefect('')

    }

  }



  const handleSave = () => {

    if (!selectedBatchId || !performedBy) return



    onSave({

      batchId: selectedBatchId,

      batchNumber: selectedBatch.batchNumber,

      recipeName: selectedBatch.recipeName,

      ...scores,

      averageScore: Math.round(averageScore * 10) / 10,

      defects,

      performedBy,

      notes: notes || undefined,

    })

    onClose()

  }



  if (!isOpen) return null



  return (

    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>

      <div className="bg-bg-primary border border-border rounded-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>

        <div className="p-6 border-b border-border">

          <div className="flex items-center gap-3">

            <span className="text-2xl">👅</span>

            <h2 className="text-xl font-semibold">სენსორული შეფასება</h2>

          </div>

        </div>



        <div className="p-6 space-y-6">

          {/* Batch Info */}

          {!test && (

            <div>

              <label className="block text-sm font-medium mb-2">პარტია</label>

              <select

                value={selectedBatchId}

                onChange={(e) => setSelectedBatchId(e.target.value)}

                className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"

                required

              >

                <option value="">აირჩიეთ პარტია</option>

                {mockBatches.map(batch => (

                  <option key={batch.id} value={batch.id}>

                    {batch.batchNumber} - {batch.recipeName}

                  </option>

                ))}

              </select>

            </div>

          )}



          {selectedBatch && (

            <div className="bg-bg-card p-4 rounded-lg space-y-1 text-sm">

              <div>

                <span className="text-text-muted">პარტია:</span>

                <span className="ml-2 font-medium text-copper-light">{selectedBatch.batchNumber}</span>

              </div>

              <div>

                <span className="text-text-muted">რეცეპტი:</span>

                <span className="ml-2 font-medium text-text-primary">{selectedBatch.recipeName}</span>

              </div>

              <div>

                <span className="text-text-muted">სტილი:</span>

                <span className="ml-2 font-medium text-text-primary">{selectedBatch.style}</span>

              </div>

            </div>

          )}



          {/* Scoring Criteria */}

          <div className="space-y-4">

            <h3 className="text-sm font-semibold">შეფასების კრიტერიუმები (1-10 სკალა)</h3>

            {criteria.map(criterion => {

              const score = scores[criterion.key]

              return (

                <div key={criterion.key} className="space-y-2">

                  <div className="flex items-center justify-between">

                    <span className="text-sm font-medium">{criterion.label}:</span>

                    <span className="text-sm font-semibold text-copper-light">{score}</span>

                  </div>

                  <div className="flex gap-1">

                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (

                      <button

                        key={num}

                        type="button"

                        onClick={() => handleScoreChange(criterion.key, num)}

                        className={`flex-1 h-8 rounded transition-all ${

                          score === num

                            ? 'bg-copper text-white'

                            : 'bg-bg-tertiary text-text-secondary hover:bg-bg-card'

                        }`}

                      >

                        {num}

                      </button>

                    ))}

                  </div>

                </div>

              )

            })}

          </div>



          {/* Average Score */}

          <div className="bg-bg-card p-4 rounded-lg">

            <div className="flex items-center justify-between">

              <span className="text-sm font-semibold">საშუალო ქულა:</span>

              <span className="text-2xl font-bold text-copper-light">

                {Math.round(averageScore * 10) / 10}/10

              </span>

            </div>

          </div>



          {/* Defects */}

          <div className="space-y-3">

            <label className="block text-sm font-medium">დეფექტები:</label>

            <div className="space-y-2">

              {defectOptions.map(defect => (

                <label key={defect} className="flex items-center gap-2 cursor-pointer">

                  <input

                    type="checkbox"

                    checked={defects.includes(defect)}

                    onChange={() => handleDefectToggle(defect)}

                    className="w-4 h-4"

                  />

                  <span className="text-sm">{defect}</span>

                </label>

              ))}

            </div>

            <div className="flex gap-2">

              <input

                type="text"

                value={customDefect}

                onChange={(e) => setCustomDefect(e.target.value)}

                onKeyPress={(e) => e.key === 'Enter' && handleAddCustomDefect()}

                placeholder="სხვა დეფექტი..."

                className="flex-1 px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"

              />

              <Button type="button" variant="outline" size="sm" onClick={handleAddCustomDefect}>

                დამატება

              </Button>

            </div>

            {defects.length > 0 && (

              <div className="flex flex-wrap gap-2 mt-2">

                {defects.map(defect => (

                  <span

                    key={defect}

                    className="px-2 py-1 bg-red-400/20 text-red-400 rounded text-xs"

                  >

                    {defect} ×

                  </span>

                ))}

              </div>

            )}

          </div>



          {/* Performed By */}

          <div>

            <label className="block text-sm font-medium mb-2">შემსრულებელი</label>

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

        </div>



        {/* Footer */}

        <div className="p-6 border-t border-border flex justify-end gap-2">

          <Button variant="outline" onClick={onClose}>

            გაუქმება

          </Button>

          <Button variant="primary" onClick={handleSave} disabled={!selectedBatchId || !performedBy}>

            შეფასების შენახვა

          </Button>

        </div>

      </div>

    </div>

  )

}

