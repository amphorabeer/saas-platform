'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui'
import { formatDate } from '@/lib/utils'
import { maintenanceTypeConfig, mockSpareParts, type MaintenanceType, type Priority } from '@/data/equipmentData'

interface User {
  id: string
  name: string
  email: string
  role?: string
}

interface MaintenanceModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (maintenanceData: any) => void
  equipmentId?: string
  equipmentName?: string
}

export function MaintenanceModal({ isOpen, onClose, onSave, equipmentId, equipmentName }: MaintenanceModalProps) {
  const [maintenanceType, setMaintenanceType] = useState<MaintenanceType | ''>('')
  const [status, setStatus] = useState<'scheduled' | 'completed'>('scheduled')
  const [scheduledDate, setScheduledDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [completedDate, setCompletedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [duration, setDuration] = useState<string>('')
  const [performedBy, setPerformedBy] = useState<string>('')
  const [cost, setCost] = useState<string>('')
  const [partsUsed, setPartsUsed] = useState<string[]>([])
  const [priority, setPriority] = useState<Priority>('medium')
  const [description, setDescription] = useState<string>('')
  const [users, setUsers] = useState<User[]>([])
  const [equipmentList, setEquipmentList] = useState<{id: string, name: string}[]>([])
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>(equipmentId || '')
  const [selectedEquipmentName, setSelectedEquipmentName] = useState<string>(equipmentName || '')

  // Fetch users and equipment from API
  useEffect(() => {
    if (isOpen) {
      // Fetch users
      fetch('/api/users')
        .then(res => res.ok ? res.json() : [])
        .then(data => {
          const userList = data.users || data || []
          setUsers(userList)
        })
        .catch(err => {
          console.log('[MaintenanceModal] Could not fetch users:', err)
          setUsers([])
        })

      // Fetch equipment
      fetch('/api/equipment')
        .then(res => res.ok ? res.json() : [])
        .then(data => {
          const eqList = data.equipment || data || []
          setEquipmentList(eqList)
        })
        .catch(err => {
          console.log('[MaintenanceModal] Could not fetch equipment:', err)
          setEquipmentList([])
        })

      // Set initial equipment if provided
      if (equipmentId) {
        setSelectedEquipmentId(equipmentId)
        setSelectedEquipmentName(equipmentName || '')
      }
    }
  }, [isOpen, equipmentId, equipmentName])

  if (!isOpen) return null



  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!maintenanceType) return
    if (!selectedEquipmentId) {
      alert('აირჩიეთ აღჭურვილობა')
      return
    }

    onSave({
      equipmentId: selectedEquipmentId,
      equipmentName: selectedEquipmentName,
      type: maintenanceType,
      status,
      scheduledDate: new Date(scheduledDate),
      completedDate: status === 'completed' ? new Date(completedDate) : undefined,
      duration: duration ? parseInt(duration) : undefined,
      performedBy: performedBy || undefined,
      cost: cost ? parseFloat(cost) : undefined,
      partsUsed: partsUsed.length > 0 ? partsUsed : undefined,
      priority,
      description: description || undefined,
    })

    // Reset form
    setMaintenanceType('')
    setStatus('scheduled')
    setScheduledDate(new Date().toISOString().split('T')[0])
    setCompletedDate(new Date().toISOString().split('T')[0])
    setDuration('')
    setPerformedBy('')
    setCost('')
    setPartsUsed([])
    setPriority('medium')
    setDescription('')
    setSelectedEquipmentId('')
    setSelectedEquipmentName('')
    onClose()
  }



  return (

    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>

      <div className="bg-bg-primary border border-border rounded-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>

        <div className="p-6 border-b border-border">

          <h2 className="text-xl font-semibold">🔧 მოვლის ჩანაწერი</h2>

        </div>



        <form onSubmit={handleSubmit} className="p-6 space-y-6">

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

          {/* Equipment Selection - show if not pre-selected */}
          {!equipmentId && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">აღჭურვილობა *</label>
              <select
                value={selectedEquipmentId}
                onChange={(e) => {
                  const eq = equipmentList.find(eq => eq.id === e.target.value)
                  setSelectedEquipmentId(e.target.value)
                  setSelectedEquipmentName(eq?.name || '')
                }}
                className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"
                required
              >
                <option value="">აირჩიეთ აღჭურვილობა</option>
                {equipmentList.map(eq => (
                  <option key={eq.id} value={eq.id}>{eq.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Maintenance Type */}

          <div>

            <label className="block text-sm font-medium mb-3">მოვლის ტიპი *</label>

            <div className="grid grid-cols-3 gap-3">

              {Object.entries(maintenanceTypeConfig).map(([key, config]) => {

                const type = key as MaintenanceType

                return (

                  <button

                    key={key}

                    type="button"

                    onClick={() => setMaintenanceType(type)}

                    className={`p-4 rounded-lg border transition-all ${

                      maintenanceType === type

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



          {/* Status */}

          <div>

            <label className="block text-sm font-medium mb-2">სტატუსი *</label>

            <div className="flex gap-4">

              <label className="flex items-center gap-2 cursor-pointer">

                <input

                  type="radio"

                  name="status"

                  value="scheduled"

                  checked={status === 'scheduled'}

                  onChange={() => setStatus('scheduled')}

                  className="w-4 h-4"

                />

                <span className="text-sm">⏳ დაგეგმვა (მომავალში)</span>

              </label>

              <label className="flex items-center gap-2 cursor-pointer">

                <input

                  type="radio"

                  name="status"

                  value="completed"

                  checked={status === 'completed'}

                  onChange={() => setStatus('completed')}

                  className="w-4 h-4"

                />

                <span className="text-sm">✅ შესრულება (ახლა)</span>

              </label>

            </div>

          </div>



          {/* Scheduled Date */}

          <div>

            <label className="block text-sm font-medium mb-2">

              {status === 'scheduled' ? 'დაგეგმილი თარიღი *' : 'შესრულების თარიღი *'}

            </label>

            <input

              type="date"

              value={status === 'scheduled' ? scheduledDate : completedDate}

              onChange={(e) => status === 'scheduled' ? setScheduledDate(e.target.value) : setCompletedDate(e.target.value)}

              className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"

              required

            />

          </div>



          {/* Priority (if scheduled) */}

          {status === 'scheduled' && (

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

          )}



          {/* Completion Details (if completed) */}

          {status === 'completed' && (

            <>

              <div className="grid grid-cols-2 gap-4">

                <div>

                  <label className="block text-sm font-medium mb-2">ხანგრძლივობა (წუთი)</label>

                  <input

                    type="number"

                    value={duration}

                    onChange={(e) => setDuration(e.target.value)}

                    className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"

                  />

                </div>

                <div>

                  <label className="block text-sm font-medium mb-2">შემსრულებელი</label>

                  <select

                    value={performedBy}

                    onChange={(e) => setPerformedBy(e.target.value)}

                    className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"

                  >

                    <option value="">აირჩიეთ</option>
                    {users.map(user => (
                      <option key={user.id} value={user.name || user.email}>
                        {user.name || user.email}
                      </option>
                    ))}
                  </select>

                </div>

              </div>



              <div>

                <label className="block text-sm font-medium mb-2">ხარჯი (₾)</label>

                <input

                  type="number"

                  step="0.01"

                  value={cost}

                  onChange={(e) => setCost(e.target.value)}

                  className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"

                />

              </div>



              <div>

                <label className="block text-sm font-medium mb-2">გამოყენებული ნაწილები</label>

                <div className="space-y-2 max-h-32 overflow-y-auto border border-border rounded-lg p-2">

                  {mockSpareParts.map(part => (

                    <label key={part.id} className="flex items-center gap-2 cursor-pointer">

                      <input

                        type="checkbox"

                        checked={partsUsed.includes(part.id)}

                        onChange={(e) => {

                          if (e.target.checked) {

                            setPartsUsed([...partsUsed, part.id])

                          } else {

                            setPartsUsed(partsUsed.filter(id => id !== part.id))

                          }

                        }}

                        className="w-4 h-4"

                      />

                      <span className="text-sm">{part.name}</span>

                    </label>

                  ))}

                </div>

              </div>

            </>

          )}



          {/* Description */}

          <div>

            <label className="block text-sm font-medium mb-2">აღწერა/შენიშვნა</label>

            <textarea

              value={description}

              onChange={(e) => setDescription(e.target.value)}

              rows={3}

              className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm resize-none"

              placeholder="დამატებითი ინფორმაცია..."

            />

          </div>



          {/* Footer */}

          <div className="flex justify-end gap-2 pt-4 border-t border-border">

            <Button type="button" variant="secondary" onClick={onClose}>

              გაუქმება

            </Button>

            <Button type="submit" variant="primary" disabled={!maintenanceType}>

              შენახვა

            </Button>

          </div>

        </form>

      </div>

    </div>

  )

}