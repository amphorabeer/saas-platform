'use client'



import { useState } from 'react'

import { Button } from '@/components/ui'

import { equipmentTypeConfig, type EquipmentType } from '@/data/equipmentData'



interface AddEquipmentModalProps {

  isOpen: boolean

  onClose: () => void

  onAdd: (equipmentData: any) => void

}



const locations = [

  'საფერმენტაციო დარბაზი',

  'სახარში დარბაზი',

  'შეფუთვის ზონა',

  'სასაწყობო',

  'ტექნიკური ოთახი',

]



export function AddEquipmentModal({ isOpen, onClose, onAdd }: AddEquipmentModalProps) {

  const [name, setName] = useState('')

  const [type, setType] = useState<EquipmentType | ''>('')

  const [capacity, setCapacity] = useState<string>('')

  const [model, setModel] = useState('')

  const [manufacturer, setManufacturer] = useState('')

  const [serialNumber, setSerialNumber] = useState('')

  const [installationDate, setInstallationDate] = useState<string>(new Date().toISOString().split('T')[0])

  const [warrantyDate, setWarrantyDate] = useState<string>('')

  const [location, setLocation] = useState<string>('')

  const [cipInterval, setCipInterval] = useState<string>('7')

  const [inspectionInterval, setInspectionInterval] = useState<string>('30')

  const [annualMaintenanceDays, setAnnualMaintenanceDays] = useState<string>('365')

  const [notes, setNotes] = useState('')



  if (!isOpen) return null



  const handleSubmit = (e: React.FormEvent) => {

    e.preventDefault()

    if (!name || !type) return



    onAdd({

      name,

      type,

      capacity: capacity ? parseFloat(capacity) : undefined,

      model: model || undefined,

      manufacturer: manufacturer || undefined,

      serialNumber: serialNumber || undefined,

      installationDate: new Date(installationDate),

      warrantyDate: warrantyDate ? new Date(warrantyDate) : undefined,

      location,

      cipIntervalDays: parseInt(cipInterval),

      inspectionIntervalDays: parseInt(inspectionInterval),

      annualMaintenanceDays: parseInt(annualMaintenanceDays),

      status: 'operational',

      notes: notes || undefined,

    })



    // Reset form

    setName('')

    setType('')

    setCapacity('')

    setModel('')

    setManufacturer('')

    setSerialNumber('')

    setLocation('')

    setCipInterval('7')

    setInspectionInterval('30')

    setAnnualMaintenanceDays('365')

    setNotes('')

    onClose()

  }



  return (

    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>

      <div className="bg-bg-primary border border-border rounded-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>

        <div className="p-6 border-b border-border sticky top-0 bg-bg-primary z-10">

          <h2 className="text-xl font-semibold">➕ ახალი აღჭურვილობა</h2>

        </div>



        <form onSubmit={handleSubmit} className="p-6 space-y-6">

          {/* Basic Info */}

          <div className="space-y-4">

            <h3 className="text-sm font-semibold text-text-muted uppercase">ძირითადი ინფორმაცია</h3>



            <div>

              <label className="block text-sm font-medium mb-2">სახელი *</label>

              <input

                type="text"

                value={name}

                onChange={(e) => setName(e.target.value)}

                className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"

                required

              />

            </div>



            <div>

              <label className="block text-sm font-medium mb-2">ტიპი *</label>

              <select

                value={type}

                onChange={(e) => setType(e.target.value as EquipmentType)}

                className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"

                required

              >

                <option value="">აირჩიეთ ტიპი</option>

                {Object.entries(equipmentTypeConfig).map(([key, config]) => (

                  <option key={key} value={key}>

                    {config.icon} {config.name}

                  </option>

                ))}

              </select>

            </div>



            <div className="grid grid-cols-2 gap-4">

              <div>

                <label className="block text-sm font-medium mb-2">ტევადობა (L)</label>

                <input

                  type="number"

                  value={capacity}

                  onChange={(e) => setCapacity(e.target.value)}

                  className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"

                  placeholder="მხოლოდ ტანკებისთვის"

                />

              </div>

              <div>

                <label className="block text-sm font-medium mb-2">მოდელი</label>

                <input

                  type="text"

                  value={model}

                  onChange={(e) => setModel(e.target.value)}

                  className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"

                />

              </div>

            </div>



            <div className="grid grid-cols-2 gap-4">

              <div>

                <label className="block text-sm font-medium mb-2">მწარმოებელი</label>

                <input

                  type="text"

                  value={manufacturer}

                  onChange={(e) => setManufacturer(e.target.value)}

                  className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"

                />

              </div>

              <div>

                <label className="block text-sm font-medium mb-2">სერიული #</label>

                <input

                  type="text"

                  value={serialNumber}

                  onChange={(e) => setSerialNumber(e.target.value)}

                  className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"

                />

              </div>

            </div>

          </div>



          {/* Installation Details */}

          <div className="space-y-4">

            <h3 className="text-sm font-semibold text-text-muted uppercase">ინსტალაციის დეტალები</h3>



            <div className="grid grid-cols-2 gap-4">

              <div>

                <label className="block text-sm font-medium mb-2">ინსტალაციის თარიღი *</label>

                <input

                  type="date"

                  value={installationDate}

                  onChange={(e) => setInstallationDate(e.target.value)}

                  className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"

                  required

                />

              </div>

              <div>

                <label className="block text-sm font-medium mb-2">გარანტიის ვადა</label>

                <input

                  type="date"

                  value={warrantyDate}

                  onChange={(e) => setWarrantyDate(e.target.value)}

                  className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"

                />

              </div>

            </div>



            <div>

              <label className="block text-sm font-medium mb-2">მდებარეობა *</label>

              <select

                value={location}

                onChange={(e) => setLocation(e.target.value)}

                className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"

                required

              >

                <option value="">აირჩიეთ მდებარეობა</option>

                {locations.map(loc => (

                  <option key={loc} value={loc}>{loc}</option>

                ))}

              </select>

            </div>

          </div>



          {/* Maintenance Configuration */}

          <div className="space-y-4">

            <h3 className="text-sm font-semibold text-text-muted uppercase">მოვლის კონფიგურაცია</h3>



            <div className="grid grid-cols-3 gap-4">

              <div>

                <label className="block text-sm font-medium mb-2">CIP ინტერვალი</label>

                <input

                  type="number"

                  value={cipInterval}

                  onChange={(e) => setCipInterval(e.target.value)}

                  className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"

                  min="0"

                />

                <span className="text-xs text-text-muted">დღე</span>

              </div>

              <div>

                <label className="block text-sm font-medium mb-2">ტექ. შემოწმება</label>

                <input

                  type="number"

                  value={inspectionInterval}

                  onChange={(e) => setInspectionInterval(e.target.value)}

                  className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"

                  min="0"

                />

                <span className="text-xs text-text-muted">დღე</span>

              </div>

              <div>

                <label className="block text-sm font-medium mb-2">წლიური მოვლა</label>

                <input

                  type="number"

                  value={annualMaintenanceDays}

                  onChange={(e) => setAnnualMaintenanceDays(e.target.value)}

                  className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"

                  min="0"

                />

                <span className="text-xs text-text-muted">დღე</span>

              </div>

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

            <Button type="submit" variant="primary">

              აღჭურვილობის დამატება

            </Button>

          </div>

        </form>

      </div>

    </div>

  )

}

