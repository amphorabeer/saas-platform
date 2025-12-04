'use client'

import React, { useState, useEffect } from 'react'
import moment from 'moment'

interface Season {
  id: string
  name: string
  startDate: string
  endDate: string
  priceModifier: number
  color: string
}

interface WeekdayPrice {
  dayOfWeek: number
  dayName: string
  priceModifier: number
  enabled: boolean
}

interface SpecialDate {
  id: string
  date: string
  name: string
  priceModifier: number
  priceType: 'modifier' | 'fixed'
  fixedPrice?: number
}

export default function PricingSettings() {
  const [activeTab, setActiveTab] = useState('rates')
  const [items, setItems] = useState<any[]>([])
  
  const pricingTabs = [
    { id: 'rates', label: 'Room Rates', icon: '💵' },
    { id: 'seasons', label: 'Seasons', icon: '🌞' },
    { id: 'weekdays', label: 'Weekdays', icon: '📅' },
    { id: 'special', label: 'Special Dates', icon: '⭐' },
    { id: 'bulk', label: 'Bulk Edit', icon: '📝' },
    { id: 'extras', label: 'Extras', icon: '➕' },
    { id: 'taxes', label: 'Taxes', icon: '📊' },
  ]
  
  useEffect(() => {
    if (typeof window === 'undefined') return
    const savedItems = localStorage.getItem('chargeItems')
    if (savedItems) {
      try {
        setItems(JSON.parse(savedItems))
      } catch (e) {
        console.error('Error loading items:', e)
      }
    }
  }, [])
  
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-bold">💰 Pricing & Charges</h2>
            <p className="text-gray-600 mt-1">Manage all pricing configurations</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button 
              onClick={() => {
                const data = { 
                  seasons: JSON.parse(localStorage.getItem('hotelSeasons') || '[]'),
                  weekdayPrices: JSON.parse(localStorage.getItem('hotelWeekdayPrices') || '[]'),
                  specialDates: JSON.parse(localStorage.getItem('hotelSpecialDates') || '[]'),
                  roomRates: JSON.parse(localStorage.getItem('roomRates') || '[]')
                }
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `pricing-export-${new Date().toISOString().split('T')[0]}.json`
                a.click()
              }}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
            >
              📤 Export
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b overflow-x-auto pb-1">
          {pricingTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 font-medium transition-all rounded-t-lg whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
        
        {/* Content */}
        {activeTab === 'rates' && <RoomRatesManager />}
        {activeTab === 'seasons' && <SeasonsManager />}
        {activeTab === 'weekdays' && <WeekdayPricesManager />}
        {activeTab === 'special' && <SpecialDatesManager />}
        {activeTab === 'bulk' && <BulkEditManager />}
        {activeTab === 'extras' && <ExtraServicesManager items={items} />}
        {activeTab === 'taxes' && <TaxesManager />}
      </div>
      
      {/* Price Preview */}
      <PricePreview />
    </div>
  )
}

// ==================== SEASONS MANAGER ====================
const SeasonsManager = () => {
  const [seasons, setSeasons] = useState<Season[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingSeason, setEditingSeason] = useState<Season | null>(null)
  
  useEffect(() => {
    const saved = localStorage.getItem('hotelSeasons')
    if (saved) setSeasons(JSON.parse(saved))
  }, [])
  
  const saveSeasons = (newSeasons: Season[]) => {
    setSeasons(newSeasons)
    localStorage.setItem('hotelSeasons', JSON.stringify(newSeasons))
  }
  
  const SeasonForm = () => {
    const [form, setForm] = useState<Season>(editingSeason || {
      id: `season-${Date.now()}`,
      name: '',
      startDate: moment().format('YYYY-MM-DD'),
      endDate: moment().add(1, 'month').format('YYYY-MM-DD'),
      priceModifier: 20,
      color: '#3b82f6'
    })
    
    const handleSave = () => {
      if (!form.name) { alert('შეიყვანეთ სეზონის სახელი'); return }
      if (editingSeason) {
        saveSeasons(seasons.map(s => s.id === editingSeason.id ? form : s))
      } else {
        saveSeasons([...seasons, form])
      }
      setShowForm(false)
      setEditingSeason(null)
    }
    
    return (
      <div className="bg-blue-50 rounded-xl p-6 border-2 border-blue-200 mb-4">
        <h3 className="text-lg font-bold mb-4">{editingSeason ? '✏️ რედაქტირება' : '➕ ახალი სეზონი'}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">სახელი</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg" placeholder="მაგ: მაღალი სეზონი" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">ფერი</label>
            <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}
              className="w-full h-10 rounded-lg cursor-pointer" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">დაწყება</label>
            <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">დასრულება</label>
            <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg" />
          </div>
          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium mb-1">
              ფასის ცვლილება: <span className={`font-bold ${form.priceModifier > 0 ? 'text-red-600' : form.priceModifier < 0 ? 'text-green-600' : ''}`}>
                {form.priceModifier > 0 ? '+' : ''}{form.priceModifier}%
              </span>
            </label>
            <input type="range" min="-50" max="100" value={form.priceModifier}
              onChange={(e) => setForm({ ...form, priceModifier: parseInt(e.target.value) })} className="w-full" />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">💾 შენახვა</button>
          <button onClick={() => { setShowForm(false); setEditingSeason(null) }} className="px-4 py-2 bg-gray-200 rounded-lg">გაუქმება</button>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      {!showForm && (
        <button onClick={() => setShowForm(true)}
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-500 hover:text-blue-600 transition">
          ➕ ახალი სეზონის დამატება
        </button>
      )}
      {showForm && <SeasonForm />}
      {seasons.length === 0 && !showForm ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-5xl mb-4">🌴</div>
          <p>სეზონები არ არის დამატებული</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {seasons.map(season => (
            <div key={season.id} className="flex items-center justify-between p-4 bg-white border rounded-xl hover:shadow-md transition">
              <div className="flex items-center gap-4">
                <div className="w-3 h-12 rounded-full" style={{ backgroundColor: season.color }} />
                <div>
                  <h4 className="font-bold">{season.name}</h4>
                  <p className="text-sm text-gray-500">{moment(season.startDate).format('DD MMM')} - {moment(season.endDate).format('DD MMM YYYY')}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-xl font-bold ${season.priceModifier > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {season.priceModifier > 0 ? '+' : ''}{season.priceModifier}%
                </span>
                <button onClick={() => { setEditingSeason(season); setShowForm(true) }} className="p-2 hover:bg-gray-100 rounded-lg">✏️</button>
                <button onClick={() => { if (confirm('წავშალოთ?')) saveSeasons(seasons.filter(s => s.id !== season.id)) }}
                  className="p-2 hover:bg-red-50 rounded-lg text-red-500">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ==================== WEEKDAY PRICES ====================
const WeekdayPricesManager = () => {
  const [weekdayPrices, setWeekdayPrices] = useState<WeekdayPrice[]>([
    { dayOfWeek: 0, dayName: 'კვირა', priceModifier: 0, enabled: false },
    { dayOfWeek: 1, dayName: 'ორშაბათი', priceModifier: 0, enabled: false },
    { dayOfWeek: 2, dayName: 'სამშაბათი', priceModifier: 0, enabled: false },
    { dayOfWeek: 3, dayName: 'ოთხშაბათი', priceModifier: 0, enabled: false },
    { dayOfWeek: 4, dayName: 'ხუთშაბათი', priceModifier: 0, enabled: false },
    { dayOfWeek: 5, dayName: 'პარასკევი', priceModifier: 20, enabled: true },
    { dayOfWeek: 6, dayName: 'შაბათი', priceModifier: 20, enabled: true },
  ])
  
  useEffect(() => {
    const saved = localStorage.getItem('hotelWeekdayPrices')
    if (saved) setWeekdayPrices(JSON.parse(saved))
  }, [])
  
  const save = (prices: WeekdayPrice[]) => {
    setWeekdayPrices(prices)
    localStorage.setItem('hotelWeekdayPrices', JSON.stringify(prices))
  }
  
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 mb-4">კვირის დღეების მიხედვით ფასის მოდიფიკატორი</p>
      <div className="space-y-3">
        {weekdayPrices.map((day, idx) => (
          <div key={day.dayOfWeek} className={`flex items-center justify-between p-4 rounded-xl border transition ${day.enabled ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-4">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={day.enabled} onChange={(e) => {
                  const updated = [...weekdayPrices]; updated[idx].enabled = e.target.checked; save(updated)
                }} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-checked:bg-green-600 rounded-full peer after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
              </label>
              <span className={`font-medium ${day.enabled ? 'text-gray-900' : 'text-gray-400'}`}>{day.dayName}</span>
            </div>
            {day.enabled && (
              <div className="flex items-center gap-4">
                <input type="range" min="-30" max="50" value={day.priceModifier} onChange={(e) => {
                  const updated = [...weekdayPrices]; updated[idx].priceModifier = parseInt(e.target.value); save(updated)
                }} className="w-32" />
                <span className={`text-lg font-bold min-w-[60px] text-right ${day.priceModifier > 0 ? 'text-red-600' : day.priceModifier < 0 ? 'text-green-600' : ''}`}>
                  {day.priceModifier > 0 ? '+' : ''}{day.priceModifier}%
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="bg-gray-50 rounded-lg p-4 mt-4">
        <h4 className="font-medium mb-3">სწრაფი პარამეტრები</h4>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => save(weekdayPrices.map(d => ({ ...d, enabled: [5, 6].includes(d.dayOfWeek), priceModifier: [5, 6].includes(d.dayOfWeek) ? 20 : 0 })))}
            className="px-3 py-1.5 bg-white border rounded hover:bg-gray-50 text-sm">🗓️ შაბ-კვირა +20%</button>
          <button onClick={() => save(weekdayPrices.map(d => ({ ...d, enabled: false, priceModifier: 0 })))}
            className="px-3 py-1.5 bg-white border rounded hover:bg-gray-50 text-sm">🔄 გაუქმება</button>
        </div>
      </div>
    </div>
  )
}

// ==================== SPECIAL DATES ====================
const SpecialDatesManager = () => {
  const [specialDates, setSpecialDates] = useState<SpecialDate[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<SpecialDate | null>(null)
  
  useEffect(() => { const saved = localStorage.getItem('hotelSpecialDates'); if (saved) setSpecialDates(JSON.parse(saved)) }, [])
  const save = (dates: SpecialDate[]) => { setSpecialDates(dates); localStorage.setItem('hotelSpecialDates', JSON.stringify(dates)) }
  
  const Form = () => {
    const [form, setForm] = useState<SpecialDate>(editing || { id: `special-${Date.now()}`, date: moment().format('YYYY-MM-DD'), name: '', priceModifier: 50, priceType: 'modifier' })
    const handleSave = () => {
      if (!form.name) { alert('შეიყვანეთ სახელი'); return }
      if (editing) save(specialDates.map(s => s.id === editing.id ? form : s))
      else save([...specialDates, form])
      setShowForm(false); setEditing(null)
    }
    return (
      <div className="bg-yellow-50 rounded-xl p-6 border-2 border-yellow-200 mb-4">
        <h3 className="text-lg font-bold mb-4">{editing ? '✏️ რედაქტირება' : '➕ სპეციალური თარიღი'}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">თარიღი</label>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
          <div><label className="block text-sm font-medium mb-1">სახელი</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="მაგ: ახალი წელი" /></div>
          <div><label className="block text-sm font-medium mb-1">ფასის ტიპი</label>
            <select value={form.priceType} onChange={(e) => setForm({ ...form, priceType: e.target.value as 'modifier' | 'fixed' })} className="w-full px-3 py-2 border rounded-lg">
              <option value="modifier">პროცენტული</option><option value="fixed">ფიქსირებული</option>
            </select></div>
          <div>{form.priceType === 'modifier' ? (<><label className="block text-sm font-medium mb-1">ცვლილება (%)</label>
            <input type="number" value={form.priceModifier} onChange={(e) => setForm({ ...form, priceModifier: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg" /></>
          ) : (<><label className="block text-sm font-medium mb-1">ფასი (₾)</label>
            <input type="number" value={form.fixedPrice || 0} onChange={(e) => setForm({ ...form, fixedPrice: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg" /></>)}</div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={handleSave} className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700">💾 შენახვა</button>
          <button onClick={() => { setShowForm(false); setEditing(null) }} className="px-4 py-2 bg-gray-200 rounded-lg">გაუქმება</button>
        </div>
      </div>
    )
  }
  
  const addHoliday = (name: string, date: string, mod: number) => {
    if (specialDates.find(s => s.date === date)) { alert('თარიღი უკვე არსებობს'); return }
    save([...specialDates, { id: `special-${Date.now()}`, date, name, priceModifier: mod, priceType: 'modifier' }])
  }
  
  return (
    <div className="space-y-4">
      {!showForm && <button onClick={() => setShowForm(true)} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-yellow-500 hover:text-yellow-600 transition">➕ სპეციალური თარიღის დამატება</button>}
      {showForm && <Form />}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium mb-3">სწრაფი დღესასწაულები</h4>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => addHoliday('ახალი წელი', `${moment().year() + 1}-01-01`, 100)} className="px-3 py-1.5 bg-white border rounded hover:bg-gray-50 text-sm">🎄 ახალი წელი +100%</button>
          <button onClick={() => addHoliday('შობა', `${moment().year() + 1}-01-07`, 80)} className="px-3 py-1.5 bg-white border rounded hover:bg-gray-50 text-sm">⭐ შობა +80%</button>
        </div>
      </div>
      {specialDates.length === 0 && !showForm ? <div className="text-center py-8 text-gray-400"><div className="text-4xl mb-3">🎉</div><p>სპეციალური თარიღები არ არის</p></div> : (
        <div className="space-y-2">
          {specialDates.sort((a, b) => a.date.localeCompare(b.date)).map(s => (
            <div key={s.id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
              <div><h4 className="font-medium">{s.name}</h4><p className="text-sm text-gray-500">{moment(s.date).format('DD MMM YYYY')}</p></div>
              <div className="flex items-center gap-3">
                <span className={`font-bold ${s.priceType === 'fixed' ? 'text-purple-600' : s.priceModifier > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {s.priceType === 'fixed' ? `₾${s.fixedPrice}` : `${s.priceModifier > 0 ? '+' : ''}${s.priceModifier}%`}
                </span>
                <button onClick={() => { setEditing(s); setShowForm(true) }} className="p-1.5 hover:bg-gray-100 rounded">✏️</button>
                <button onClick={() => { if (confirm('წავშალოთ?')) save(specialDates.filter(x => x.id !== s.id)) }} className="p-1.5 hover:bg-red-50 rounded text-red-500">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ==================== BULK EDIT ====================
const BulkEditManager = () => {
  const [selected, setSelected] = useState<string[]>([])
  const [modifier, setModifier] = useState(0)
  const [priceType, setPriceType] = useState<'modifier' | 'fixed'>('modifier')
  const [fixedPrice, setFixedPrice] = useState(150)
  const [month, setMonth] = useState(moment().format('YYYY-MM'))
  const [name, setName] = useState('')
  const [specialDates, setSpecialDates] = useState<SpecialDate[]>([])
  
  useEffect(() => { const saved = localStorage.getItem('hotelSpecialDates'); if (saved) setSpecialDates(JSON.parse(saved)) }, [])
  
  const monthStart = moment(month).startOf('month')
  const daysInMonth = moment(month).endOf('month').date()
  const days: (string | null)[] = []
  for (let i = 0; i < monthStart.day(); i++) days.push(null)
  for (let i = 1; i <= daysInMonth; i++) days.push(moment(month).date(i).format('YYYY-MM-DD'))
  
  const toggle = (d: string) => setSelected(selected.includes(d) ? selected.filter(x => x !== d) : [...selected, d])
  const selectAll = () => setSelected(days.filter(d => d) as string[])
  const selectWeekends = () => setSelected(days.filter(d => d && [0, 6].includes(moment(d).day())) as string[])
  
  const apply = () => {
    if (!selected.length) { alert('აირჩიეთ თარიღები'); return }
    const existing = JSON.parse(localStorage.getItem('hotelSpecialDates') || '[]')
    const filtered = existing.filter((s: SpecialDate) => !selected.includes(s.date))
    const newDates = selected.map(date => ({ id: `bulk-${date}-${Date.now()}`, date, name: name || 'Bulk Price', priceModifier: priceType === 'modifier' ? modifier : 0, priceType, fixedPrice: priceType === 'fixed' ? fixedPrice : undefined }))
    localStorage.setItem('hotelSpecialDates', JSON.stringify([...filtered, ...newDates]))
    setSpecialDates([...filtered, ...newDates])
    alert(`✅ ${selected.length} თარიღი განახლდა`)
    setSelected([])
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => setMonth(moment(month).subtract(1, 'month').format('YYYY-MM'))} className="p-2 hover:bg-gray-100 rounded-lg text-xl">◀</button>
        <h3 className="text-lg font-bold">{moment(month).format('MMMM YYYY')}</h3>
        <button onClick={() => setMonth(moment(month).add(1, 'month').format('YYYY-MM'))} className="p-2 hover:bg-gray-100 rounded-lg text-xl">▶</button>
      </div>
      <div className="flex gap-2 flex-wrap">
        <button onClick={selectAll} className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200">ყველა</button>
        <button onClick={selectWeekends} className="px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200">შაბ-კვირა</button>
        <button onClick={() => setSelected([])} className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200">გასუფთავება</button>
        <span className="ml-auto text-sm text-gray-500 self-center">არჩეული: <strong>{selected.length}</strong></span>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {['კვ', 'ორ', 'სა', 'ოთ', 'ხუ', 'პა', 'შა'].map(d => <div key={d} className="text-center text-xs font-medium text-gray-500 py-2">{d}</div>)}
        {days.map((date, idx) => {
          if (!date) return <div key={idx} className="h-10"></div>
          const isSel = selected.includes(date)
          const isWe = [0, 6].includes(moment(date).day())
          const hasSp = specialDates.some(s => s.date === date)
          return (
            <button key={date} onClick={() => toggle(date)} className={`h-10 rounded-lg text-sm font-medium transition-all relative ${isSel ? 'bg-blue-600 text-white shadow-lg scale-105' : isWe ? 'bg-orange-50 text-orange-700 hover:bg-orange-100' : 'bg-gray-50 hover:bg-gray-100'}`}>
              {moment(date).date()}
              {hasSp && !isSel && <span className="absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-full"></span>}
            </button>
          )
        })}
      </div>
      <div className="bg-gray-50 rounded-xl p-4 space-y-4">
        <div><label className="block text-sm font-medium mb-1">სახელი</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="მაგ: სეზონური ფასი" /></div>
        <div className="flex gap-4">
          <label className="flex items-center gap-2"><input type="radio" checked={priceType === 'modifier'} onChange={() => setPriceType('modifier')} /><span>პროცენტული</span></label>
          <label className="flex items-center gap-2"><input type="radio" checked={priceType === 'fixed'} onChange={() => setPriceType('fixed')} /><span>ფიქსირებული</span></label>
        </div>
        {priceType === 'modifier' ? (
          <div><label className="block text-sm font-medium mb-1">ცვლილება: <span className={`font-bold ${modifier > 0 ? 'text-red-600' : modifier < 0 ? 'text-green-600' : ''}`}>{modifier > 0 ? '+' : ''}{modifier}%</span></label>
            <input type="range" min="-50" max="100" value={modifier} onChange={(e) => setModifier(parseInt(e.target.value))} className="w-full" /></div>
        ) : (
          <div><label className="block text-sm font-medium mb-1">ფიქსირებული ფასი (₾)</label>
            <input type="number" value={fixedPrice} onChange={(e) => setFixedPrice(parseInt(e.target.value) || 0)} className="w-full px-3 py-2 border rounded-lg" /></div>
        )}
        <button onClick={apply} disabled={!selected.length} className={`w-full py-3 rounded-xl font-bold transition ${selected.length ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
          💰 გამოყენება ({selected.length} თარიღი)
        </button>
      </div>
    </div>
  )
}

// ==================== ROOM RATES ====================
const RoomRatesManager = () => {
  const [rates, setRates] = useState([
    { id: 1, type: 'Standard', weekday: 150, weekend: 180, holiday: 220 },
    { id: 2, type: 'Deluxe', weekday: 200, weekend: 240, holiday: 300 },
    { id: 3, type: 'Suite', weekday: 350, weekend: 400, holiday: 500 }
  ])
  useEffect(() => { const saved = localStorage.getItem('roomRates'); if (saved) { try { const p = JSON.parse(saved); if (p.length) setRates(p) } catch {} } }, [])
  const update = (id: number, field: string, value: number) => {
    const updated = rates.map(r => r.id === id ? { ...r, [field]: value } : r)
    setRates(updated)
    localStorage.setItem('roomRates', JSON.stringify(updated))
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {rates.map(rate => (
        <div key={rate.id} className="border rounded-lg p-4 hover:shadow-lg transition bg-white">
          <h4 className="font-bold text-lg mb-3">{rate.type}</h4>
          <div className="space-y-3">
            {['weekday', 'weekend', 'holiday'].map(field => (
              <div key={field} className="flex justify-between items-center">
                <span className="text-sm text-gray-600 capitalize">{field}:</span>
                <div className="flex items-center">
                  <span className="text-gray-500 mr-1">₾</span>
                  <input type="number" value={(rate as any)[field]} onChange={(e) => update(rate.id, field, parseFloat(e.target.value) || 0)}
                    className="w-20 border rounded px-2 py-1 text-right font-medium" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ==================== EXTRAS & TAXES ====================
const ExtraServicesManager = ({ items }: { items: any[] }) => (
  <div className="text-center py-8 text-gray-400"><div className="text-4xl mb-3">➕</div><p>Extra Services - {items.length} items</p></div>
)

const TaxesManager = () => {
  const [taxes, setTaxes] = useState({ VAT: 18, CITY_TAX: 3, TOURISM_TAX: 1, SERVICE_CHARGE: 10 })
  useEffect(() => { const saved = localStorage.getItem('taxSettings'); if (saved) setTaxes(JSON.parse(saved)) }, [])
  const save = () => { localStorage.setItem('taxSettings', JSON.stringify(taxes)); alert('✅ შენახულია!') }
  return (
    <div className="max-w-xl space-y-4">
      {Object.entries(taxes).map(([key, value]) => (
        <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <label className="font-medium">{key.replace(/_/g, ' ')}</label>
          <div className="flex items-center gap-2">
            <input type="number" value={value} onChange={(e) => setTaxes({...taxes, [key]: parseFloat(e.target.value) || 0})}
              className="w-20 border rounded px-2 py-1 text-right" step="0.5" min="0" max="100" /><span>%</span>
          </div>
        </div>
      ))}
      <button onClick={save} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
    </div>
  )
}

// ==================== PRICE PREVIEW ====================
const PricePreview = () => {
  const calc = (base: number, date: string) => {
    let price = base
    const seasons = JSON.parse(localStorage.getItem('hotelSeasons') || '[]')
    const season = seasons.find((s: Season) => date >= s.startDate && date <= s.endDate)
    if (season) price *= (1 + season.priceModifier / 100)
    const weekdays = JSON.parse(localStorage.getItem('hotelWeekdayPrices') || '[]')
    const wd = weekdays.find((w: WeekdayPrice) => w.dayOfWeek === moment(date).day() && w.enabled)
    if (wd) price *= (1 + wd.priceModifier / 100)
    const specials = JSON.parse(localStorage.getItem('hotelSpecialDates') || '[]')
    const sp = specials.find((s: SpecialDate) => s.date === date)
    if (sp) { if (sp.priceType === 'fixed' && sp.fixedPrice) return sp.fixedPrice; price *= (1 + sp.priceModifier / 100) }
    return Math.round(price)
  }
  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <h4 className="font-medium text-gray-700 mb-3">💡 ფასის პრევიუ (Standard - ₾150)</h4>
      <div className="flex gap-2 flex-wrap">
        {[0,1,2,3,4,5,6].map(i => {
          const d = moment().add(i, 'days').format('YYYY-MM-DD')
          const p = calc(150, d)
          return <div key={i} className={`px-3 py-2 rounded-lg text-center min-w-[60px] ${p > 150 ? 'bg-red-100 text-red-700' : p < 150 ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>
            <div className="text-xs text-gray-500">{moment().add(i, 'days').format('ddd')}</div>
            <div className="font-bold">₾{p}</div>
          </div>
        })}
      </div>
    </div>
  )
}

// Export helper
export const calculateDynamicPrice = (basePrice: number, date: string): number => {
  if (typeof window === 'undefined') return basePrice
  let price = basePrice
  const seasons = JSON.parse(localStorage.getItem('hotelSeasons') || '[]')
  const s = seasons.find((x: Season) => date >= x.startDate && date <= x.endDate)
  if (s) price *= (1 + s.priceModifier / 100)
  const weekdays = JSON.parse(localStorage.getItem('hotelWeekdayPrices') || '[]')
  const w = weekdays.find((x: WeekdayPrice) => x.dayOfWeek === moment(date).day() && x.enabled)
  if (w) price *= (1 + w.priceModifier / 100)
  const specials = JSON.parse(localStorage.getItem('hotelSpecialDates') || '[]')
  const sp = specials.find((x: SpecialDate) => x.date === date)
  if (sp) { if (sp.priceType === 'fixed' && sp.fixedPrice) return sp.fixedPrice; price *= (1 + sp.priceModifier / 100) }
  return Math.round(price)
}
