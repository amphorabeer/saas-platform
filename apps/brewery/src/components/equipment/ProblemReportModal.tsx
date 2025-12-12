'use client'



import { useState } from 'react'

import { Button } from '@/components/ui'

import { mockTesters, type Severity } from '@/data/equipmentData'



interface ProblemReportModalProps {

  isOpen: boolean

  onClose: () => void

  onSave: (problemData: any) => void

  equipmentId?: string

  equipmentName?: string

}



const problemTypes = [

  'გაჟონვა',

  'ტემპერატურის პრობლემა',

  'წნევის პრობლემა',

  'მექანიკური გაუმართაობა',

  'ელექტრო პრობლემა',

  'სენსორის ცდომილება',

  'CIP პრობლემა',

  'სხვა',

]



export function ProblemReportModal({ isOpen, onClose, onSave, equipmentId, equipmentName }: ProblemReportModalProps) {

  const [problemType, setProblemType] = useState<string>('')

  const [severity, setSeverity] = useState<Severity>('medium')

  const [description, setDescription] = useState<string>('')

  const [reportedDate, setReportedDate] = useState<string>(new Date().toISOString().split('T')[0])

  const [reportedBy, setReportedBy] = useState<string>('')

  const [customProblemType, setCustomProblemType] = useState<string>('')



  if (!isOpen) return null



  const handleSubmit = (e: React.FormEvent) => {

    e.preventDefault()

    if (!problemType || !description || !reportedBy) return



    onSave({

      equipmentId,

      equipmentName,

      problemType: problemType === 'სხვა' ? customProblemType : problemType,

      severity,

      description,

      reportedDate: new Date(reportedDate),

      reportedBy,

      status: 'open',

    })



    // Reset form

    setProblemType('')

    setSeverity('medium')

    setDescription('')

    setReportedDate(new Date().toISOString().split('T')[0])

    setReportedBy('')

    setCustomProblemType('')

    onClose()

  }



  return (

    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>

      <div className="bg-bg-primary border border-border rounded-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>

        <div className="p-6 border-b border-border">

          <div className="flex items-center gap-3">

            <span className="text-2xl">⚠️</span>

            <h2 className="text-xl font-semibold">პრობლემის რეპორტი</h2>

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



          {/* Problem Type */}

          <div>

            <label className="block text-sm font-medium mb-2">პრობლემის ტიპი *</label>

            <select

              value={problemType}

              onChange={(e) => setProblemType(e.target.value)}

              className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"

              required

            >

              <option value="">აირჩიეთ ტიპი</option>

              {problemTypes.map(type => (

                <option key={type} value={type}>{type}</option>

              ))}

            </select>

          </div>



          {/* Custom Problem Type */}

          {problemType === 'სხვა' && (

            <div>

              <label className="block text-sm font-medium mb-2">პრობლემის ტიპი *</label>

              <input

                type="text"

                value={customProblemType}

                onChange={(e) => setCustomProblemType(e.target.value)}

                className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"

                required

              />

            </div>

          )}



          {/* Severity */}

          <div>

            <label className="block text-sm font-medium mb-2">სიმძიმე *</label>

            <div className="space-y-2">

              {[

                { value: 'low', label: '🟢 დაბალი - მუშაობს, მაგრამ საჭიროა ყურადღება', color: 'text-green-400' },

                { value: 'medium', label: '🟡 საშუალო - შეზღუდული ფუნქციონალი', color: 'text-amber-400' },

                { value: 'high', label: '🔴 მაღალი - არ მუშაობს', color: 'text-red-400' },

              ].map(option => (

                <label key={option.value} className="flex items-center gap-2 cursor-pointer">

                  <input

                    type="radio"

                    name="severity"

                    value={option.value}

                    checked={severity === option.value}

                    onChange={() => setSeverity(option.value as Severity)}

                    className="w-4 h-4"

                  />

                  <span className={`text-sm ${option.color}`}>{option.label}</span>

                </label>

              ))}

            </div>

          </div>



          {/* Description */}

          <div>

            <label className="block text-sm font-medium mb-2">აღწერა *</label>

            <textarea

              value={description}

              onChange={(e) => setDescription(e.target.value)}

              rows={4}

              className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm resize-none"

              placeholder="დეტალური აღწერა პრობლემის შესახებ..."

              required

            />

          </div>



          {/* Reported Date */}

          <div>

            <label className="block text-sm font-medium mb-2">აღმოჩენის თარიღი *</label>

            <input

              type="date"

              value={reportedDate}

              onChange={(e) => setReportedDate(e.target.value)}

              className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"

              required

            />

          </div>



          {/* Reported By */}

          <div>

            <label className="block text-sm font-medium mb-2">მომხსენებელი *</label>

            <select

              value={reportedBy}

              onChange={(e) => setReportedBy(e.target.value)}

              className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"

              required

            >

              <option value="">აირჩიეთ</option>

              {mockTesters.map(tester => (

                <option key={tester.id} value={tester.name}>

                  {tester.name} - {tester.role}

                </option>

              ))}

            </select>

          </div>



          {/* Photo Upload (optional) */}

          <div>

            <label className="block text-sm font-medium mb-2">ფოტო (არასავალდებულო)</label>

            <input

              type="file"

              accept="image/*"

              className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"

            />

          </div>



          {/* Footer */}

          <div className="flex justify-end gap-2 pt-4 border-t border-border">

            <Button type="button" variant="outline" onClick={onClose}>

              გაუქმება

            </Button>

            <Button type="submit" variant="primary" disabled={!problemType || !description || !reportedBy}>

              რეპორტის გაგზავნა

            </Button>

          </div>

        </form>

      </div>

    </div>

  )

}

