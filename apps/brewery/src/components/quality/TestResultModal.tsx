'use client'



import { useState } from 'react'

import { Button } from '@/components/ui'

import { formatDate, formatTime, formatDateTime } from '@/lib/utils'

import { mockTesters, getTestStatus, testTypeConfig, type QCTest } from '@/data/qualityData'



interface TestResultModalProps {

  test: QCTest | null

  isOpen: boolean

  onClose: () => void

  onSave: (testId: string, result: number, performedBy: string, notes?: string) => void

}



export function TestResultModal({ test, isOpen, onClose, onSave }: TestResultModalProps) {

  const [isEditing, setIsEditing] = useState(false)

  const [result, setResult] = useState<string>(test?.result?.toString() || '')

  const [performedBy, setPerformedBy] = useState<string>(test?.performedBy || '')

  const [completedDateTime, setCompletedDateTime] = useState<string>(

    test?.completedDate ? formatDateTime(test.completedDate).replace(' ', 'T').slice(0, 16) : new Date().toISOString().slice(0, 16)

  )

  const [notes, setNotes] = useState<string>(test?.notes || '')



  if (!isOpen || !test) return null



  const testConfig = testTypeConfig[test.testType]

  const isCompleted = test.status !== 'pending' && test.status !== 'in_progress'

  const displayMode = isCompleted && !isEditing



  const handleSave = () => {

    const numResult = parseFloat(result)

    if (isNaN(numResult)) return



    const [datePart, timePart] = completedDateTime.split('T')

    const [hours, minutes] = timePart.split(':')

    const completedDate = new Date(datePart)

    completedDate.setHours(parseInt(hours), parseInt(minutes))



    onSave(test.id, numResult, performedBy, notes || undefined)

    setIsEditing(false)

  }



  const calculatedStatus = result ? getTestStatus(parseFloat(result), test.minValue, test.maxValue) : test.status



  return (

    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>

      <div className="bg-bg-primary border border-border rounded-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>

        <div className="p-6 border-b border-border">

          <div className="flex items-center gap-3">

            <span className="text-2xl">{testConfig.icon}</span>

            <h2 className="text-xl font-semibold">ტესტის შედეგი</h2>

          </div>

        </div>



        <div className="p-6 space-y-4">

          {/* Readonly Info */}

          <div className="space-y-2 text-sm">

            <div>

              <span className="text-text-muted">პარტია:</span>

              <span className="ml-2 font-medium text-copper-light">{test.batchNumber}</span>

            </div>

            <div>

              <span className="text-text-muted">რეცეპტი:</span>

              <span className="ml-2 font-medium text-text-primary">{test.recipeName}</span>

            </div>

            <div>

              <span className="text-text-muted">ტესტის ტიპი:</span>

              <span className="ml-2 font-medium text-text-primary">{testConfig.name}</span>

            </div>

            <div>

              <span className="text-text-muted">ნორმა:</span>

              <span className="ml-2 font-medium text-text-primary">

                {test.minValue} - {test.maxValue} {test.unit}

              </span>

            </div>

            <div>

              <span className="text-text-muted">დაგეგმილი:</span>

              <span className="ml-2 font-medium text-text-primary">

                {formatDateTime(test.scheduledDate)}

              </span>

            </div>

          </div>



          {/* Result Input/Display */}

          {displayMode ? (

            <div className="space-y-2">

              <div>

                <span className="text-sm text-text-muted">შედეგი:</span>

                <span className="ml-2 font-medium text-text-primary text-lg">

                  {test.result} {test.unit}

                </span>

              </div>

              <div>

                <span className="text-sm text-text-muted">სტატუსი:</span>

                <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${

                  calculatedStatus === 'passed' ? 'bg-green-400/20 text-green-400' :

                  calculatedStatus === 'warning' ? 'bg-amber-400/20 text-amber-400' :

                  calculatedStatus === 'failed' ? 'bg-red-400/20 text-red-400' :

                  'bg-gray-400/20 text-gray-400'

                }`}>

                  {calculatedStatus === 'passed' ? '✅ წარმატებული' :

                   calculatedStatus === 'warning' ? '⚠️ გაფრთხილება' :

                   calculatedStatus === 'failed' ? '❌ ჩაჭრილი' :

                   '⏳ მოლოდინში'}

                </span>

              </div>

              {test.performedBy && (

                <div>

                  <span className="text-sm text-text-muted">შემსრულებელი:</span>

                  <span className="ml-2 font-medium text-text-primary">{test.performedBy}</span>

                </div>

              )}

              {test.completedDate && (

                <div>

                  <span className="text-sm text-text-muted">თარიღი:</span>

                  <span className="ml-2 font-medium text-text-primary">

                    {formatDateTime(test.completedDate)}

                  </span>

                </div>

              )}

              {test.notes && (

                <div>

                  <span className="text-sm text-text-muted mb-2 block">შენიშვნა:</span>

                  <p className="text-sm text-text-primary bg-bg-card p-3 rounded-lg">{test.notes}</p>

                </div>

              )}

            </div>

          ) : (

            <div className="space-y-4">

              <div>

                <label className="block text-sm font-medium mb-2">შედეგი</label>

                <div className="flex items-center gap-2">

                  <input

                    type="number"

                    step="0.001"

                    value={result}

                    onChange={(e) => setResult(e.target.value)}

                    className="flex-1 px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"

                    placeholder={`მაგ: ${test.minValue}`}

                    required

                  />

                  <span className="text-sm text-text-muted">{test.unit}</span>

                </div>

                {result && !isNaN(parseFloat(result)) && (

                  <div className="mt-2">

                    <span className={`text-xs px-2 py-1 rounded ${

                      calculatedStatus === 'passed' ? 'bg-green-400/20 text-green-400' :

                      calculatedStatus === 'warning' ? 'bg-amber-400/20 text-amber-400' :

                      calculatedStatus === 'failed' ? 'bg-red-400/20 text-red-400' :

                      'bg-gray-400/20 text-gray-400'

                    }`}>

                      {calculatedStatus === 'passed' ? '✅ წარმატებული - შედეგი ნორმის ფარგლებშია' :

                       calculatedStatus === 'warning' ? '⚠️ გაფრთხილება - შედეგი ნორმის ზღვარზეა' :

                       calculatedStatus === 'failed' ? '❌ ჩაჭრილი - შედეგი ნორმიდან გადახრილია' :

                       ''}

                    </span>

                  </div>

                )}

              </div>



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



              <div>

                <label className="block text-sm font-medium mb-2">თარიღი/დრო</label>

                <input

                  type="datetime-local"

                  value={completedDateTime}

                  onChange={(e) => setCompletedDateTime(e.target.value)}

                  className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"

                  required

                />

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

            </div>

          )}

        </div>



        {/* Footer */}

        <div className="p-6 border-t border-border flex justify-end gap-2">

          {displayMode ? (

            <>

              <Button variant="outline" onClick={onClose}>

                დახურვა

              </Button>

              <Button variant="outline" onClick={() => setIsEditing(true)}>

                რედაქტირება

              </Button>

            </>

          ) : (

            <>

              <Button variant="outline" onClick={() => {

                setIsEditing(false)

                setResult(test.result?.toString() || '')

                setPerformedBy(test.performedBy || '')

                setNotes(test.notes || '')

              }}>

                გაუქმება

              </Button>

              <Button variant="primary" onClick={handleSave} disabled={!result || !performedBy}>

                შენახვა

              </Button>

            </>

          )}

        </div>

      </div>

    </div>

  )

}

