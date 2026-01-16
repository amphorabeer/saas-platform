'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui'
import { 
  Equipment, 
  EquipmentType, 
  EquipmentStatus,
  TankCapability, 
  equipmentTypeConfig, 
  capabilityConfig 
} from '@/data/equipmentData'

interface Props {
  equipment: Equipment | null
  isOpen: boolean
  onClose: () => void
  onSave: (id: string, updates: Partial<Equipment>) => void
  onDelete?: (id: string) => void
}

export function EditEquipmentModal({ equipment, isOpen, onClose, onSave, onDelete }: Props) {
  // Basic info
  const [name, setName] = useState('')
  const [type, setType] = useState<EquipmentType>('fermenter')
  const [status, setStatus] = useState<EquipmentStatus>('operational')
  const [model, setModel] = useState('')
  const [manufacturer, setManufacturer] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [capacity, setCapacity] = useState('')
  const [location, setLocation] = useState('')
  
  // Maintenance settings
  const [cipIntervalDays, setCipIntervalDays] = useState('7')
  const [inspectionIntervalDays, setInspectionIntervalDays] = useState('30')
  
  // Capabilities
  const [capabilities, setCapabilities] = useState<TankCapability[]>([])
  
  // Working parameters
  const [workingPressure, setWorkingPressure] = useState('')
  
  // Notes
  const [notes, setNotes] = useState('')
  
  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (equipment) {
      setName(equipment.name || '')
      setType(equipment.type || 'fermenter')
      setStatus(equipment.status || 'operational')
      setModel(equipment.model || '')
      setManufacturer(equipment.manufacturer || '')
      setSerialNumber(equipment.serialNumber || '')
      setCapacity(equipment.capacity?.toString() || '')
      setLocation(equipment.location || '')
      setCipIntervalDays(equipment.cipIntervalDays?.toString() || '7')
      setInspectionIntervalDays(equipment.inspectionIntervalDays?.toString() || '30')
      setCapabilities(equipment.capabilities || [])
      setWorkingPressure(equipment.workingPressure?.toString() || '')
      setNotes(equipment.notes || '')
    }
  }, [equipment])

  if (!isOpen || !equipment) return null

  const handleSave = () => {
    onSave(equipment.id, {
      name,
      type,
      status,
      model: model || undefined,
      manufacturer: manufacturer || undefined,
      serialNumber: serialNumber || undefined,
      capacity: capacity ? parseInt(capacity) : undefined,
      location,
      cipIntervalDays: parseInt(cipIntervalDays) || 7,
      inspectionIntervalDays: parseInt(inspectionIntervalDays) || 30,
      capabilities,
      workingPressure: workingPressure ? parseFloat(workingPressure) : undefined,
      notes: notes || undefined,
    })
    onClose()
  }

  const handleDelete = () => {
    if (onDelete) {
      onDelete(equipment.id)
      onClose()
    }
  }

  const toggleCapability = (cap: TankCapability) => {
    if (capabilities.includes(cap)) {
      setCapabilities(capabilities.filter(c => c !== cap))
    } else {
      setCapabilities([...capabilities, cap])
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-white mb-6">✏️ აღჭურვილობის რედაქტირება</h2>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Left Column */}
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm text-slate-300 mb-1">სახელი *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm text-slate-300 mb-1">ტიპი *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as EquipmentType)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              >
                {Object.entries(equipmentTypeConfig).map(([key, config]) => (
                  <option key={key} value={key}>{config.icon} {config.name}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm text-slate-300 mb-1">სტატუსი *</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as EquipmentStatus)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              >
                <option value="operational">✅ მუშა</option>
                <option value="needs_maintenance">⚠️ მოვლა საჭირო</option>
                <option value="under_maintenance">🔧 მოვლაზე</option>
                <option value="out_of_service">❌ გაუმართავი</option>
              </select>
            </div>

            {/* Model */}
            <div>
              <label className="block text-sm text-slate-300 mb-1">მოდელი</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              />
            </div>

            {/* Manufacturer */}
            <div>
              <label className="block text-sm text-slate-300 mb-1">მწარმოებელი</label>
              <input
                type="text"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              />
            </div>

            {/* Serial Number */}
            <div>
              <label className="block text-sm text-slate-300 mb-1">სერიული ნომერი</label>
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {/* Capacity */}
            <div>
              <label className="block text-sm text-slate-300 mb-1">ტევადობა (L)</label>
              <input
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm text-slate-300 mb-1">მდებარეობა</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              />
            </div>

            {/* Working Pressure */}
            <div>
              <label className="block text-sm text-slate-300 mb-1">სამუშაო წნევა (bar)</label>
              <input
                type="number"
                step="0.1"
                value={workingPressure}
                onChange={(e) => setWorkingPressure(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              />
            </div>

            {/* CIP Interval */}
            <div>
              <label className="block text-sm text-slate-300 mb-1">CIP ინტერვალი (დღე)</label>
              <input
                type="number"
                value={cipIntervalDays}
                onChange={(e) => setCipIntervalDays(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              />
            </div>

            {/* Inspection Interval */}
            <div>
              <label className="block text-sm text-slate-300 mb-1">შემოწმების ინტერვალი (დღე)</label>
              <input
                type="number"
                value={inspectionIntervalDays}
                onChange={(e) => setInspectionIntervalDays(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              />
            </div>

            {/* Capabilities */}
            {['fermenter', 'unitank', 'brite'].includes(type) && (
              <div>
                <label className="block text-sm text-slate-300 mb-2">შესაძლებლობები</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={capabilities.includes('fermenting')}
                      onChange={() => toggleCapability('fermenting')}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-green-400">🧪 ფერმენტაცია</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={capabilities.includes('conditioning')}
                      onChange={() => toggleCapability('conditioning')}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-blue-400">❄️ კონდიცირება</span>
                  </label>
                </div>
                {capabilities.includes('fermenting') && capabilities.includes('conditioning') && (
                  <p className="text-purple-400 text-sm mt-2">🔄 Unitank რეჟიმი</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Notes - Full width */}
        <div className="mt-4">
          <label className="block text-sm text-slate-300 mb-1">შენიშვნები</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white resize-none"
          />
        </div>

        {/* Delete Section */}
        <div className="border-t border-slate-700 mt-6 pt-4">
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 border border-red-500 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors"
            >
              🗑️ აღჭურვილობის წაშლა
            </button>
          ) : (
            <div className="p-3 bg-red-500/10 border border-red-500 rounded-lg">
              <p className="text-red-400 mb-3">დარწმუნებული ხარ რომ გინდა წაშალო {equipment.name}?</p>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
                  არა, გაუქმება
                </Button>
                <Button size="sm" className="bg-red-600" onClick={handleDelete}>
                  დიახ, წაშალე
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={onClose}>გაუქმება</Button>
          <Button onClick={handleSave} className="bg-copper hover:bg-copper/90">
            💾 შენახვა
          </Button>
        </div>
      </div>
    </div>
  )
}
