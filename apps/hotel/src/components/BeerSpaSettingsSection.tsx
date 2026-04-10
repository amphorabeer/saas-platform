'use client'

import React, { useState } from 'react'
import { spaSettingsHeader, spaSidebarMenuItem } from '../lib/constants'

// ==================== TYPES ====================
export interface SpaBath {
  id: string
  name: string
  nameEn: string
  description: string
  maxGuests: number
  price: number
  duration: number
  isActive: boolean
}

export interface SpaService {
  id: string
  name: string
  nameEn: string
  description: string
  price: number
  duration: number
  isActive: boolean
}

export interface SpaSettings {
  enabled: boolean
  name: string
  openTime: string
  closeTime: string
  slotDuration: number
  breakBetweenSlots: number
  maxAdvanceBookingDays: number
  allowOnlineBooking: boolean
  allowRoomCharge: boolean
  requirePhone: boolean
  requireEmail: boolean
  cancellationHours: number
  depositPercent: number
}

export const DEFAULT_SPA_SETTINGS: SpaSettings = {
  enabled: false,
  name: spaSidebarMenuItem.label,
  openTime: '10:00',
  closeTime: '21:00',
  slotDuration: 60,
  breakBetweenSlots: 15,
  maxAdvanceBookingDays: 30,
  allowOnlineBooking: true,
  allowRoomCharge: true,
  requirePhone: true,
  requireEmail: false,
  cancellationHours: 24,
  depositPercent: 0
}

interface Props {
  settings: SpaSettings
  setSettings: (s: SpaSettings) => void
  baths: SpaBath[]
  setBaths: (b: SpaBath[]) => void
  services: SpaService[]
  setServices: (s: SpaService[]) => void
  onSave: () => void
  isSaving: boolean
}

export default function BeerSpaSettingsSection({ settings, setSettings, baths, setBaths, services, setServices, onSave, isSaving }: Props) {
  const [activeTab, setActiveTab] = useState<'settings' | 'baths' | 'services' | 'schedule'>('settings')
  const [editingBath, setEditingBath] = useState<SpaBath | null>(null)
  const [editingService, setEditingService] = useState<SpaService | null>(null)
  const [showBathModal, setShowBathModal] = useState(false)
  const [showServiceModal, setShowServiceModal] = useState(false)

  const saveBath = () => {
    if (!editingBath?.name || !editingBath.price) return
    if (editingBath.id) {
      setBaths(baths.map(b => b.id === editingBath.id ? editingBath : b))
    } else {
      setBaths([...baths, { ...editingBath, id: `bath_${Date.now()}` }])
    }
    setEditingBath(null)
    setShowBathModal(false)
  }

  const deleteBath = (id: string) => {
    if (confirm('წაშალოთ აბაზანა?')) setBaths(baths.filter(b => b.id !== id))
  }

  const saveService = () => {
    if (!editingService?.name || !editingService.price) return
    if (editingService.id) {
      setServices(services.map(s => s.id === editingService.id ? editingService : s))
    } else {
      setServices([...services, { ...editingService, id: `spa_svc_${Date.now()}` }])
    }
    setEditingService(null)
    setShowServiceModal(false)
  }

  const deleteService = (id: string) => {
    if (confirm('წაშალოთ სერვისი?')) setServices(services.filter(s => s.id !== id))
  }

  const generateTimeSlots = () => {
    const slots = []
    const [openH, openM] = settings.openTime.split(':').map(Number)
    const [closeH, closeM] = settings.closeTime.split(':').map(Number)
    let currentMinutes = openH * 60 + openM
    const endMinutes = closeH * 60 + closeM
    while (currentMinutes + settings.slotDuration <= endMinutes) {
      const startH = Math.floor(currentMinutes / 60)
      const startM = currentMinutes % 60
      const endM = currentMinutes + settings.slotDuration
      const endH = Math.floor(endM / 60)
      const endMin = endM % 60
      slots.push({ start: `${startH.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')}`, end: `${endH.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}` })
      currentMinutes += settings.slotDuration + settings.breakBetweenSlots
    }
    return slots
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🍺</span>
            <div>
              <h2 className="text-xl font-bold text-gray-800">{spaSettingsHeader}</h2>
              <p className="text-sm text-gray-500">აბაზანები, ჯავშნები და განრიგი</p>
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <span className={`text-sm font-medium ${settings.enabled ? 'text-green-600' : 'text-gray-500'}`}>
              {settings.enabled ? 'აქტიური' : 'გამორთული'}
            </span>
            <div className="relative">
              <input type="checkbox" checked={settings.enabled} onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })} className="sr-only" />
              <div className={`w-14 h-7 rounded-full transition-colors ${settings.enabled ? 'bg-green-500' : 'bg-gray-300'}`}>
                <div className={`absolute w-5 h-5 bg-white rounded-full top-1 transition-transform ${settings.enabled ? 'translate-x-8' : 'translate-x-1'}`} />
              </div>
            </div>
          </label>
        </div>

        {settings.enabled && (
          <>
            <div className="flex gap-2 border-b pb-4 mb-6">
              {[{ id: 'settings', label: '⚙️ პარამეტრები' }, { id: 'baths', label: '🛁 აბაზანები' }, { id: 'services', label: '✨ სერვისები' }, { id: 'schedule', label: '📅 განრიგი' }].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as 'settings' | 'baths' | 'services' | 'schedule')} className={`px-4 py-2 rounded-lg font-medium transition ${activeTab === tab.id ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{tab.label}</button>
              ))}
            </div>

            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div><label className="block text-sm font-medium text-gray-700 mb-2">სპა-ს სახელი</label><input type="text" value={settings.name} onChange={(e) => setSettings({ ...settings, name: e.target.value })} className="w-full px-4 py-2 border rounded-lg" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-2">გახსნის დრო</label><input type="time" value={settings.openTime} onChange={(e) => setSettings({ ...settings, openTime: e.target.value })} className="w-full px-4 py-2 border rounded-lg" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-2">დახურვის დრო</label><input type="time" value={settings.closeTime} onChange={(e) => setSettings({ ...settings, closeTime: e.target.value })} className="w-full px-4 py-2 border rounded-lg" /></div>
                </div>
                <div className="bg-amber-50 rounded-lg p-4">
                  <h4 className="font-medium mb-3">⏱️ სეანსების პარამეტრები</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div><label className="block text-xs text-gray-500 mb-1">სეანსის ხანგრძლ. (წთ)</label><input type="number" value={settings.slotDuration} onChange={(e) => setSettings({ ...settings, slotDuration: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg" /></div>
                    <div><label className="block text-xs text-gray-500 mb-1">შესვენება (წთ)</label><input type="number" value={settings.breakBetweenSlots} onChange={(e) => setSettings({ ...settings, breakBetweenSlots: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg" /></div>
                    <div><label className="block text-xs text-gray-500 mb-1">მაქს. წინასწარი (დღე)</label><input type="number" value={settings.maxAdvanceBookingDays} onChange={(e) => setSettings({ ...settings, maxAdvanceBookingDays: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg" /></div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-2">გაუქმების ვადა (სთ)</label><input type="number" value={settings.cancellationHours} onChange={(e) => setSettings({ ...settings, cancellationHours: Number(e.target.value) })} className="w-full px-4 py-2 border rounded-lg" /><p className="text-xs text-gray-500 mt-1">უფასო გაუქმება</p></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-2">დეპოზიტი (%)</label><input type="number" value={settings.depositPercent} onChange={(e) => setSettings({ ...settings, depositPercent: Number(e.target.value) })} className="w-full px-4 py-2 border rounded-lg" /><p className="text-xs text-gray-500 mt-1">ონლაინ ჯავშნისთვის</p></div>
                </div>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={settings.allowOnlineBooking} onChange={(e) => setSettings({ ...settings, allowOnlineBooking: e.target.checked })} className="w-5 h-5 rounded" /><span className="text-sm">🌐 ონლაინ ჯავშანი (საიტიდან)</span></label>
                  <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={settings.allowRoomCharge} onChange={(e) => setSettings({ ...settings, allowRoomCharge: e.target.checked })} className="w-5 h-5 rounded" /><span className="text-sm">🏨 ოთახზე ჩაწერა</span></label>
                  <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={settings.requirePhone} onChange={(e) => setSettings({ ...settings, requirePhone: e.target.checked })} className="w-5 h-5 rounded" /><span className="text-sm">📱 ტელეფონი სავალდებულო</span></label>
                  <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={settings.requireEmail} onChange={(e) => setSettings({ ...settings, requireEmail: e.target.checked })} className="w-5 h-5 rounded" /><span className="text-sm">📧 ელ-ფოსტა სავალდებულო</span></label>
                </div>
              </div>
            )}

            {activeTab === 'baths' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium">აბაზანები ({baths.length})</h3>
                  <button onClick={() => { setEditingBath({ id: '', name: '', nameEn: '', description: '', maxGuests: 2, price: 150, duration: 60, isActive: true }); setShowBathModal(true) }} className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600">+ დამატება</button>
                </div>
                {baths.length === 0 ? <div className="text-center py-8 text-gray-500"><div className="text-4xl mb-2">🛁</div><p>აბაზანები არ არის</p></div> : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{baths.map(bath => (
                    <div key={bath.id} className={`p-4 rounded-xl border-2 ${bath.isActive ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-gray-50'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3"><span className="text-3xl">🛁</span><div><div className="font-bold">{bath.name}</div><div className="text-xs text-gray-500">{bath.nameEn || '-'}</div></div></div>
                        <span className={`px-2 py-1 rounded text-xs ${bath.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200'}`}>{bath.isActive ? 'აქტიური' : 'გამორთ.'}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                        <div className="text-center p-2 bg-white rounded-lg"><div className="text-xl font-bold text-amber-600">₾{bath.price}</div><div className="text-xs text-gray-500">ფასი</div></div>
                        <div className="text-center p-2 bg-white rounded-lg"><div className="text-xl font-bold text-blue-600">{bath.duration}წთ</div><div className="text-xs text-gray-500">ხანგრძლ.</div></div>
                        <div className="text-center p-2 bg-white rounded-lg"><div className="text-xl font-bold text-green-600">{bath.maxGuests}</div><div className="text-xs text-gray-500">მაქს.</div></div>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{bath.description || '-'}</p>
                      <div className="flex gap-2"><button onClick={() => { setEditingBath(bath); setShowBathModal(true) }} className="flex-1 px-3 py-2 bg-white border rounded-lg hover:bg-gray-50">✏️</button><button onClick={() => deleteBath(bath.id)} className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200">🗑️</button></div>
                    </div>
                  ))}</div>
                )}
              </div>
            )}

            {activeTab === 'services' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium">დამატებითი სერვისები ({services.length})</h3>
                  <button onClick={() => { setEditingService({ id: '', name: '', nameEn: '', description: '', price: 0, duration: 30, isActive: true }); setShowServiceModal(true) }} className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600">+ დამატება</button>
                </div>
                {services.length === 0 ? <div className="text-center py-8 text-gray-500"><div className="text-4xl mb-2">✨</div><p>დამატებითი სერვისები არ არის</p><p className="text-sm">მაგ: ლუდის დეგუსტაცია, მასაჟი</p></div> : (
                  <div className="space-y-2">{services.map(svc => (
                    <div key={svc.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3"><span className="text-2xl">✨</span><div><div className="font-medium">{svc.name}</div><div className="text-xs text-gray-500">{svc.description || svc.nameEn || '-'}</div></div></div>
                      <div className="flex items-center gap-4">
                        <div className="text-right"><div className="font-bold text-amber-600">₾{svc.price}</div><div className="text-xs text-gray-500">{svc.duration} წთ</div></div>
                        <span className={`px-2 py-1 rounded text-xs ${svc.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200'}`}>{svc.isActive ? '✓' : '✗'}</span>
                        <button onClick={() => { setEditingService(svc); setShowServiceModal(true) }} className="p-2 hover:bg-gray-200 rounded">✏️</button>
                        <button onClick={() => deleteService(svc.id)} className="p-2 hover:bg-red-100 rounded text-red-500">🗑️</button>
                      </div>
                    </div>
                  ))}</div>
                )}
              </div>
            )}

            {activeTab === 'schedule' && (
              <div>
                <h3 className="font-medium mb-4">📅 დღის განრიგი</h3>
                <div className="bg-amber-50 rounded-lg p-4 mb-4">
                  <div className="text-sm text-amber-700"><strong>პარამეტრები:</strong> {settings.openTime} - {settings.closeTime} | სეანსი: {settings.slotDuration}წთ | შესვენება: {settings.breakBetweenSlots}წთ</div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {generateTimeSlots().map((slot, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                      <div className="flex items-center gap-2"><span className="text-lg">🕐</span><span className="font-medium">{slot.start} - {slot.end}</span></div>
                      <span className="text-xs text-gray-500">#{idx + 1}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700"><strong>სულ {generateTimeSlots().length} სეანსი</strong> თითოეულ აბაზანაზე</p>
                  <p className="text-sm text-blue-600 mt-1">{baths.filter(b => b.isActive).length} აქტიური აბაზანა × {generateTimeSlots().length} = <strong>{baths.filter(b => b.isActive).length * generateTimeSlots().length} ჯავშანი/დღეში</strong></p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <button onClick={onSave} disabled={isSaving} className="w-full px-6 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 disabled:opacity-50">{isSaving ? '⏳ ინახება...' : '💾 შენახვა'}</button>

      {showBathModal && editingBath && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">{editingBath.id ? 'რედაქტირება' : 'ახალი აბაზანა'}</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium mb-1">სახელი (ქართ.)</label><input type="text" value={editingBath.name} onChange={(e) => setEditingBath({ ...editingBath, name: e.target.value })} className="w-full px-4 py-2 border rounded-lg" placeholder="აბაზანა #1" /></div><div><label className="block text-sm font-medium mb-1">სახელი (Eng)</label><input type="text" value={editingBath.nameEn} onChange={(e) => setEditingBath({ ...editingBath, nameEn: e.target.value })} className="w-full px-4 py-2 border rounded-lg" placeholder="Bath #1" /></div></div>
              <div><label className="block text-sm font-medium mb-1">აღწერა</label><textarea value={editingBath.description} onChange={(e) => setEditingBath({ ...editingBath, description: e.target.value })} className="w-full px-4 py-2 border rounded-lg" rows={2} /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="block text-sm font-medium mb-1">ფასი (₾)</label><input type="number" value={editingBath.price} onChange={(e) => setEditingBath({ ...editingBath, price: Number(e.target.value) })} className="w-full px-4 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">ხანგრძლ. (წთ)</label><input type="number" value={editingBath.duration} onChange={(e) => setEditingBath({ ...editingBath, duration: Number(e.target.value) })} className="w-full px-4 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">მაქს. სტუმ.</label><input type="number" value={editingBath.maxGuests} onChange={(e) => setEditingBath({ ...editingBath, maxGuests: Number(e.target.value) })} className="w-full px-4 py-2 border rounded-lg" /></div>
              </div>
              <label className="flex items-center gap-2"><input type="checkbox" checked={editingBath.isActive} onChange={(e) => setEditingBath({ ...editingBath, isActive: e.target.checked })} className="w-4 h-4" /><span className="text-sm">აქტიური</span></label>
            </div>
            <div className="flex gap-3 mt-6"><button onClick={() => setShowBathModal(false)} className="flex-1 px-4 py-2 bg-gray-200 rounded-lg">გაუქმება</button><button onClick={saveBath} className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg">შენახვა</button></div>
          </div>
        </div>
      )}

      {showServiceModal && editingService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">{editingService.id ? 'რედაქტირება' : 'ახალი სერვისი'}</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium mb-1">სახელი (ქართ.)</label><input type="text" value={editingService.name} onChange={(e) => setEditingService({ ...editingService, name: e.target.value })} className="w-full px-4 py-2 border rounded-lg" /></div><div><label className="block text-sm font-medium mb-1">სახელი (Eng)</label><input type="text" value={editingService.nameEn} onChange={(e) => setEditingService({ ...editingService, nameEn: e.target.value })} className="w-full px-4 py-2 border rounded-lg" /></div></div>
              <div><label className="block text-sm font-medium mb-1">აღწერა</label><textarea value={editingService.description} onChange={(e) => setEditingService({ ...editingService, description: e.target.value })} className="w-full px-4 py-2 border rounded-lg" rows={2} /></div>
              <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium mb-1">ფასი (₾)</label><input type="number" value={editingService.price} onChange={(e) => setEditingService({ ...editingService, price: Number(e.target.value) })} className="w-full px-4 py-2 border rounded-lg" /></div><div><label className="block text-sm font-medium mb-1">ხანგრძლ. (წთ)</label><input type="number" value={editingService.duration} onChange={(e) => setEditingService({ ...editingService, duration: Number(e.target.value) })} className="w-full px-4 py-2 border rounded-lg" /></div></div>
              <label className="flex items-center gap-2"><input type="checkbox" checked={editingService.isActive} onChange={(e) => setEditingService({ ...editingService, isActive: e.target.checked })} className="w-4 h-4" /><span className="text-sm">აქტიური</span></label>
            </div>
            <div className="flex gap-3 mt-6"><button onClick={() => setShowServiceModal(false)} className="flex-1 px-4 py-2 bg-gray-200 rounded-lg">გაუქმება</button><button onClick={saveService} className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg">შენახვა</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
