'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui'

interface CIPLogModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (cipData: any) => void
  equipmentId?: string
  equipmentName?: string
}

interface CleaningSupply {
  id: string
  name: string
  type: string
  currentStock: number
  unit: string
  concentration?: number
}

interface UsedSupply {
  supplyId: string
  name: string
  amount: number
  unit: string
}

interface User {
  id: string
  name: string
  email?: string
  role?: string
  isActive?: boolean
}

// Mock cleaning supplies - in real app, fetch from API
const mockCleaningSupplies: CleaningSupply[] = [
  { id: '1', name: 'კაუსტიკ სოდა (NaOH)', type: 'caustic', currentStock: 25, unit: 'კგ', concentration: 50 },
  { id: '2', name: 'ფოსფორმჟავა', type: 'acid', currentStock: 15, unit: 'ლ', concentration: 75 },
  { id: '3', name: 'PAA სანიტაიზერი', type: 'sanitizer', currentStock: 20, unit: 'ლ', concentration: 15 },
  { id: '4', name: 'Star San', type: 'sanitizer', currentStock: 5, unit: 'ლ' },
  { id: '5', name: 'PBW (Powdered Brewery Wash)', type: 'detergent', currentStock: 10, unit: 'კგ' },
]

const SUPPLY_ICONS: Record<string, string> = {
  caustic: '🧴',
  acid: '⚗️',
  sanitizer: '🧪',
  detergent: '🧽',
  rinse_aid: '💧',
  other: '📦',
}

export function CIPLogModal({ isOpen, onClose, onSave, equipmentId, equipmentName }: CIPLogModalProps) {
  const { data: session } = useSession()
  const [cipType, setCipType] = useState<'full' | 'caustic_only' | 'sanitizer_only' | 'rinse'>('full')
  const [dateTime, setDateTime] = useState<string>(new Date().toISOString().slice(0, 16))
  const [duration, setDuration] = useState<string>('')
  const [temperature, setTemperature] = useState<string>('')
  const [causticConcentration, setCausticConcentration] = useState<string>('')
  const [phLevel, setPhLevel] = useState<number | null>(null)
  const [visualCheck, setVisualCheck] = useState(true)
  const [performedBy, setPerformedBy] = useState<string>('')
  const [result, setResult] = useState<'success' | 'needs_repeat' | 'problem'>('success')
  const [notes, setNotes] = useState<string>('')
  
  // Cleaning supplies state
  const [cleaningSupplies, setCleaningSupplies] = useState<CleaningSupply[]>([])
  const [usedSupplies, setUsedSupplies] = useState<UsedSupply[]>([])
  const [showSupplySelector, setShowSupplySelector] = useState(false)
  const [selectedSupplyId, setSelectedSupplyId] = useState<string>('')
  const [supplyAmount, setSupplyAmount] = useState<string>('')
  
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

  useEffect(() => {
    if (!isOpen || users.length === 0) return
    const sid = (session?.user as { id?: string } | undefined)?.id
    if (!sid || !users.some((u) => u.id === sid)) return
    setPerformedBy((prev) => (prev === '' ? sid : prev))
  }, [isOpen, users, session?.user])

  // Fetch cleaning supplies from API
  useEffect(() => {
    if (isOpen) {
      const fetchSupplies = async () => {
        try {
          const response = await fetch('/api/inventory/cleaning')
          if (response.ok) {
            const data = await response.json()
            setCleaningSupplies(data.length > 0 ? data : mockCleaningSupplies)
          } else {
            setCleaningSupplies(mockCleaningSupplies)
          }
        } catch (error) {
          console.error('Error fetching cleaning supplies:', error)
          setCleaningSupplies(mockCleaningSupplies)
        }
      }
      fetchSupplies()
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleAddSupply = () => {
    if (!selectedSupplyId || !supplyAmount) return
    
    const supply = cleaningSupplies.find(s => s.id === selectedSupplyId)
    if (!supply) return

    const amount = parseFloat(supplyAmount)
    if (amount <= 0 || amount > supply.currentStock) {
      alert(`მარაგი არ არის საკმარისი! ხელმისაწვდომია: ${supply.currentStock} ${supply.unit}`)
      return
    }

    // Check if already added
    const existing = usedSupplies.find(u => u.supplyId === selectedSupplyId)
    if (existing) {
      // Update amount
      setUsedSupplies(prev => prev.map(u => 
        u.supplyId === selectedSupplyId 
          ? { ...u, amount: u.amount + amount }
          : u
      ))
    } else {
      // Add new
      setUsedSupplies(prev => [...prev, {
        supplyId: supply.id,
        name: supply.name,
        amount: amount,
        unit: supply.unit,
      }])
    }

    setSelectedSupplyId('')
    setSupplyAmount('')
    setShowSupplySelector(false)
  }

  const handleRemoveSupply = (supplyId: string) => {
    setUsedSupplies(prev => prev.filter(u => u.supplyId !== supplyId))
  }

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
      phLevel: phLevel !== null && !Number.isNaN(phLevel) ? phLevel : null,
      visualCheck,
      performedBy,
      result,
      notes: notes || undefined,
      usedSupplies: usedSupplies, // Include used supplies
    })

    // Reset form
    setCipType('full')
    setDateTime(new Date().toISOString().slice(0, 16))
    setDuration('')
    setTemperature('')
    setCausticConcentration('')
    setPhLevel(null)
    setVisualCheck(true)
    setPerformedBy('')
    setResult('success')
    setNotes('')
    setUsedSupplies([])
    onClose()
  }

  const getSupplyIcon = (supplyId: string) => {
    const supply = cleaningSupplies.find(s => s.id === supplyId)
    return supply ? SUPPLY_ICONS[supply.type] || '📦' : '📦'
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-bg-primary border border-border rounded-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'full', label: 'სრული CIP', desc: 'კაუსტიკი + მჟავა + rinse', icon: '🔄' },
                { value: 'caustic_only', label: 'მხოლოდ კაუსტიკი', desc: 'ორგანული ნარჩენები', icon: '🧴' },
                { value: 'sanitizer_only', label: 'სანიტაიზერი', desc: 'დეზინფექცია', icon: '🧪' },
                { value: 'rinse', label: 'სწრაფი rinse', desc: 'წყლით გამოვლება', icon: '💧' },
              ].map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setCipType(option.value as any)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    cipType === option.value
                      ? 'border-copper bg-copper/10'
                      : 'border-border bg-bg-tertiary hover:bg-bg-card'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span>{option.icon}</span>
                    <span className="font-medium text-sm">{option.label}</span>
                  </div>
                  <p className="text-xs text-text-muted">{option.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Date/Time & Duration */}
          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <label className="block text-sm font-medium mb-2">ხანგრძლივობა (წთ) *</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="45"
                className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"
                required
              />
            </div>
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
                  placeholder="75"
                  className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">კაუსტიკის კონც. (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={causticConcentration}
                  onChange={(e) => setCausticConcentration(e.target.value)}
                  placeholder="2.5"
                  className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">ფაქშის დონე (pH)</label>
              <input
                type="number"
                step="0.1"
                min={0}
                max={14}
                value={phLevel ?? ''}
                onChange={(e) => {
                  const raw = e.target.value
                  if (raw === '') {
                    setPhLevel(null)
                    return
                  }
                  const n = parseFloat(raw)
                  setPhLevel(Number.isNaN(n) ? null : n)
                }}
                placeholder="7.0"
                className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"
              />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={visualCheck}
                  onChange={(e) => setVisualCheck(e.target.checked)}
                  className="rounded border-border"
                />
                ვიზუალური შემოწმება
              </label>
            </div>
          </div>

          {/* ========== CLEANING SUPPLIES SECTION ========== */}
          <div className="border-t border-border pt-4">
            <div className="flex justify-between items-center mb-3">
              <label className="text-sm font-medium flex items-center gap-2">
                🧹 გამოყენებული საშუალებები
              </label>
              <button
                type="button"
                onClick={() => setShowSupplySelector(!showSupplySelector)}
                className="text-sm text-copper hover:text-copper-light transition-colors"
              >
                + დამატება
              </button>
            </div>

            {/* Supply Selector */}
            {showSupplySelector && (
              <div className="bg-bg-tertiary border border-border rounded-lg p-3 mb-3 space-y-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">აირჩიე საშუალება</label>
                  <select
                    value={selectedSupplyId}
                    onChange={(e) => setSelectedSupplyId(e.target.value)}
                    className="w-full px-3 py-2 bg-bg-card border border-border rounded-lg text-sm"
                  >
                    <option value="">აირჩიეთ...</option>
                    {cleaningSupplies.map(supply => (
                      <option key={supply.id} value={supply.id}>
                        {SUPPLY_ICONS[supply.type]} {supply.name} (მარაგი: {supply.currentStock} {supply.unit})
                      </option>
                    ))}
                  </select>
                </div>
                
                {selectedSupplyId && (
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-xs text-text-muted mb-1">რაოდენობა</label>
                      <input
                        type="number"
                        step="0.1"
                        value={supplyAmount}
                        onChange={(e) => setSupplyAmount(e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 bg-bg-card border border-border rounded-lg text-sm"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="primary"
                        onClick={handleAddSupply}
                        disabled={!supplyAmount}
                        className="px-4"
                      >
                        ✓
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Used Supplies List */}
            {usedSupplies.length > 0 ? (
              <div className="space-y-2">
                {usedSupplies.map(supply => (
                  <div
                    key={supply.supplyId}
                    className="flex items-center justify-between p-2 bg-bg-tertiary rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <span>{getSupplyIcon(supply.supplyId)}</span>
                      <span className="text-sm">{supply.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-copper">
                        {supply.amount} {supply.unit}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSupply(supply.supplyId)}
                        className="p-1 hover:bg-red-500/20 rounded text-red-400"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted text-center py-2">
                საშუალებები არ არის დამატებული
              </p>
            )}
          </div>
          {/* ========== END CLEANING SUPPLIES SECTION ========== */}

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
              {users.map((user) => {
                const label =
                  user.name?.trim() ||
                  user.email ||
                  user.id
                const role = user.role ? ` – ${user.role}` : ''
                const inactive = user.isActive === false ? ' (არააქტიური)' : ''
                return (
                  <option key={user.id} value={user.id}>
                    {label}
                    {role}
                    {inactive}
                  </option>
                )
              })}
            </select>
          </div>

          {/* Result */}
          <div>
            <label className="block text-sm font-medium mb-2">შედეგი *</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'success', label: 'წარმატებული', icon: '✅', color: 'green' },
                { value: 'needs_repeat', label: 'გამეორება', icon: '⚠️', color: 'amber' },
                { value: 'problem', label: 'პრობლემა', icon: '❌', color: 'red' },
              ].map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setResult(option.value as any)}
                  className={`p-2 rounded-lg border text-center transition-all ${
                    result === option.value
                      ? option.color === 'green' ? 'border-green-500 bg-green-500/10' :
                        option.color === 'amber' ? 'border-amber-500 bg-amber-500/10' :
                        'border-red-500 bg-red-500/10'
                      : 'border-border bg-bg-tertiary hover:bg-bg-card'
                  }`}
                >
                  <span className="text-lg">{option.icon}</span>
                  <p className={`text-xs mt-1 ${
                    result === option.value
                      ? option.color === 'green' ? 'text-green-400' :
                        option.color === 'amber' ? 'text-amber-400' :
                        'text-red-400'
                      : 'text-text-primary'
                  }`}>
                    {option.label}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-2">შენიშვნა</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm resize-none"
              placeholder="დამატებითი ინფორმაცია..."
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button type="button" variant="secondary" onClick={onClose}>
              გაუქმება
            </Button>
            <Button type="submit" variant="primary" disabled={!performedBy || !duration}>
              ✓ ჩანაწერის დამატება
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}