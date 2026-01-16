'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui'

interface ProblemReportModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (problemData: any) => void
  equipmentId?: string
  equipmentName?: string
}

interface User {
  id: string
  name: string
  email?: string
  role?: string
  isActive?: boolean
}

const problemTypes = [
  { value: 'leak', label: 'გაჟონვა', icon: '💧' },
  { value: 'temperature', label: 'ტემპერატურის პრობლემა', icon: '🌡️' },
  { value: 'pressure', label: 'წნევის პრობლემა', icon: '📊' },
  { value: 'mechanical', label: 'მექანიკური გაუმართაობა', icon: '⚙️' },
  { value: 'electrical', label: 'ელექტრო პრობლემა', icon: '⚡' },
  { value: 'sensor', label: 'სენსორის ცდომილება', icon: '📡' },
  { value: 'cip', label: 'CIP პრობლემა', icon: '🧹' },
  { value: 'other', label: 'სხვა', icon: '❓' },
]

type Severity = 'low' | 'medium' | 'high'

export function ProblemReportModal({ isOpen, onClose, onSave, equipmentId, equipmentName }: ProblemReportModalProps) {
  const [problemType, setProblemType] = useState<string>('')
  const [severity, setSeverity] = useState<Severity>('medium')
  const [description, setDescription] = useState<string>('')
  const [reportedDate, setReportedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [reportedBy, setReportedBy] = useState<string>('')
  const [customProblemType, setCustomProblemType] = useState<string>('')
  
  // Users state (synced with settings/users)
  const [users, setUsers] = useState<User[]>([])

  // Fetch users from API (same as settings/users page)
  useEffect(() => {
    if (isOpen) {
      const fetchUsers = async () => {
        try {
          const response = await fetch('/api/users')
          if (response.ok) {
            const data = await response.json()
            setUsers(data.users || [])
          } else {
            console.error('Error fetching users:', response.statusText)
            setUsers([])
          }
        } catch (error) {
          console.error('Error fetching users:', error)
          setUsers([])
        }
      }
      fetchUsers()
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!problemType || !description || !reportedBy) return

    onSave({
      equipmentId,
      equipmentName,
      problemType: problemType === 'other' ? customProblemType : problemType,
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
      <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <h2 className="text-xl font-semibold">პრობლემის რეპორტი</h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Equipment (readonly if prefilled) */}
          {equipmentName && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">აღჭურვილობა</label>
              <input
                type="text"
                value={equipmentName}
                readOnly
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-400"
              />
            </div>
          )}

          {/* Problem Type */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">პრობლემის ტიპი *</label>
            <div className="grid grid-cols-4 gap-3">
              {problemTypes.map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setProblemType(type.value)}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    problemType === type.value
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-slate-600 bg-slate-700/50 hover:bg-slate-700'
                  }`}
                >
                  <span className="text-xl">{type.icon}</span>
                  <p className="text-xs mt-1">{type.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Problem Type */}
          {problemType === 'other' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">პრობლემის ტიპი (სხვა) *</label>
              <input
                type="text"
                value={customProblemType}
                onChange={(e) => setCustomProblemType(e.target.value)}
                placeholder="მიუთითეთ პრობლემის ტიპი"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm"
                required
              />
            </div>
          )}

          {/* Severity */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">სიმძიმე *</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'low', label: 'დაბალი', desc: 'მუშაობს, ყურადღება საჭირო', icon: '🟢' },
                { value: 'medium', label: 'საშუალო', desc: 'შეზღუდული ფუნქციონალი', icon: '🟡' },
                { value: 'high', label: 'მაღალი', desc: 'არ მუშაობს', icon: '🔴' },
              ].map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSeverity(option.value as Severity)}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    severity === option.value
                      ? option.value === 'low' ? 'border-green-500 bg-green-500/10' :
                        option.value === 'medium' ? 'border-amber-500 bg-amber-500/10' :
                        'border-red-500 bg-red-500/10'
                      : 'border-slate-600 bg-slate-700/50 hover:bg-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span>{option.icon}</span>
                    <span className={`font-medium ${
                      severity === option.value
                        ? option.value === 'low' ? 'text-green-400' :
                          option.value === 'medium' ? 'text-amber-400' :
                          'text-red-400'
                        : ''
                    }`}>{option.label}</span>
                  </div>
                  <p className="text-xs text-slate-400">{option.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">აღწერა *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm resize-none"
              placeholder="დეტალური აღწერა პრობლემის შესახებ..."
              required
            />
          </div>

          {/* Date & Reporter */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">აღმოჩენის თარიღი *</label>
              <input
                type="date"
                value={reportedDate}
                onChange={(e) => setReportedDate(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">მომხსენებელი *</label>
              <select
                value={reportedBy}
                onChange={(e) => setReportedBy(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm"
                required
              >
                <option value="">აირჩიეთ</option>
                {users.filter(user => user.name && user.isActive !== false).map(user => (
                  <option key={user.id} value={user.name}>
                    {user.name}{user.role ? ` – ${user.role}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
            <Button type="button" variant="secondary" onClick={onClose}>
              გაუქმება
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              disabled={!problemType || !description || !reportedBy || (problemType === 'other' && !customProblemType)}
            >
              რეპორტის გაგზავნა
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}