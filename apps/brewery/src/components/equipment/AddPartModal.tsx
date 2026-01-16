'use client'



import { useState } from 'react'

import { Button } from '@/components/ui'

import { mockEquipment } from '@/data/equipmentData'



interface AddPartModalProps {

  isOpen: boolean

  onClose: () => void

  onAdd: (partData: any) => void

}



const categories = [

  'სილიკონი/Gaskets',

  'სენსორები',

  'უსაფრთხოება',

  'ტუმბოს ნაწილები',

  'სარქველები',

  'გაწმენდა',

  'ელექტრო',

  'სხვა',

]



export function AddPartModal({ isOpen, onClose, onAdd }: AddPartModalProps) {

  const [name, setName] = useState('')

  const [category, setCategory] = useState<string>('')

  const [compatibleEquipment, setCompatibleEquipment] = useState<string[]>([])

  const [quantity, setQuantity] = useState<string>('0')

  const [minQuantity, setMinQuantity] = useState<string>('0')

  const [price, setPrice] = useState<string>('0')

  const [supplier, setSupplier] = useState('')

  const [notes, setNotes] = useState('')



  if (!isOpen) return null



  const handleEquipmentToggle = (equipmentId: string) => {

    setCompatibleEquipment(prev =>

      prev.includes(equipmentId)

        ? prev.filter(id => id !== equipmentId)

        : [...prev, equipmentId]

    )

  }



  const handleSubmit = (e: React.FormEvent) => {

    e.preventDefault()

    if (!name || !category) return



    onAdd({

      name,

      category,

      compatibleEquipment,

      quantity: parseInt(quantity),

      minQuantity: parseInt(minQuantity),

      price: parseFloat(price),

      supplier: supplier || undefined,

      notes: notes || undefined,

    })



    // Reset form

    setName('')

    setCategory('')

    setCompatibleEquipment([])

    setQuantity('0')

    setMinQuantity('0')

    setPrice('0')

    setSupplier('')

    setNotes('')

    onClose()

  }



  return (

    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>

      <div className="bg-bg-primary border border-border rounded-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>

        <div className="p-6 border-b border-border">

          <h2 className="text-xl font-semibold">➕ ახალი ნაწილი</h2>

        </div>



        <form onSubmit={handleSubmit} className="p-6 space-y-6">

          {/* Basic Info */}

          <div className="space-y-4">

            <div>

              <label className="block text-sm font-medium mb-2">ნაწილის სახელი *</label>

              <input

                type="text"

                value={name}

                onChange={(e) => setName(e.target.value)}

                className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"

                required

              />

            </div>



            <div>

              <label className="block text-sm font-medium mb-2">კატეგორია *</label>

              <select

                value={category}

                onChange={(e) => setCategory(e.target.value)}

                className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"

                required

              >

                <option value="">აირჩიეთ კატეგორია</option>

                {categories.map(cat => (

                  <option key={cat} value={cat}>{cat}</option>

                ))}

              </select>

            </div>

          </div>



          {/* Compatible Equipment */}

          <div>

            <label className="block text-sm font-medium mb-2">თავსებადი აღჭურვილობა</label>

            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-border rounded-lg p-3">

              {mockEquipment.map(eq => (

                <label key={eq.id} className="flex items-center gap-2 cursor-pointer">

                  <input

                    type="checkbox"

                    checked={compatibleEquipment.includes(eq.id)}

                    onChange={() => handleEquipmentToggle(eq.id)}

                    className="w-4 h-4"

                  />

                  <span className="text-sm">{eq.name}</span>

                </label>

              ))}

            </div>

          </div>



          {/* Stock & Price */}

          <div className="grid grid-cols-3 gap-4">

            <div>

              <label className="block text-sm font-medium mb-2">მარაგი *</label>

              <input

                type="number"

                min="0"

                value={quantity}

                onChange={(e) => setQuantity(e.target.value)}

                className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"

                required

              />

              <span className="text-xs text-text-muted">ცალი</span>

            </div>

            <div>

              <label className="block text-sm font-medium mb-2">მინიმალური მარაგი *</label>

              <input

                type="number"

                min="0"

                value={minQuantity}

                onChange={(e) => setMinQuantity(e.target.value)}

                className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"

                required

              />

              <span className="text-xs text-text-muted">ცალი</span>

            </div>

            <div>

              <label className="block text-sm font-medium mb-2">ფასი ერთეულზე *</label>

              <input

                type="number"

                step="0.01"

                min="0"

                value={price}

                onChange={(e) => setPrice(e.target.value)}

                className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"

                required

              />

              <span className="text-xs text-text-muted">₾</span>

            </div>

          </div>



          {/* Supplier */}

          <div>

            <label className="block text-sm font-medium mb-2">მომწოდებელი</label>

            <input

              type="text"

              value={supplier}

              onChange={(e) => setSupplier(e.target.value)}

              className="w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm"

            />

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

            <Button type="button" variant="secondary" onClick={onClose}>

              გაუქმება

            </Button>

            <Button type="submit" variant="primary" disabled={!name || !category}>

              ნაწილის დამატება

            </Button>

          </div>

        </form>

      </div>

    </div>

  )

}

