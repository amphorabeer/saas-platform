'use client'

import React, { useState, useEffect } from 'react'

interface BookingSettings {
  autoConfirmSpa: boolean
  autoConfirmRestaurant: boolean
  autoConfirmHotel: boolean
  sendEmailOnConfirm: boolean
  sendTelegramNotification: boolean
}

export default function BookingSettingsSection() {
  const [settings, setSettings] = useState<BookingSettings>({
    autoConfirmSpa: true,
    autoConfirmRestaurant: true,
    autoConfirmHotel: true,
    sendEmailOnConfirm: true,
    sendTelegramNotification: true
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/hotel/booking-settings')
        if (response.ok) {
          const data = await response.json()
          setSettings(prev => ({ ...prev, ...data }))
        }
      } catch (error) {
        console.error('[BookingSettings] Error loading:', error)
      } finally {
        setLoading(false)
      }
    }
    loadSettings()
  }, [])

  // Save settings
  const saveSettings = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/hotel/booking-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'პარამეტრები შენახულია!' })
      } else {
        setMessage({ type: 'error', text: 'შეცდომა შენახვისას' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'შეცდომა შენახვისას' })
    } finally {
      setSaving(false)
      setTimeout(() => setMessage(null), 3000)
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin inline-block w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-800">📅 ჯავშნების პარამეტრები</h3>
        {message && (
          <span className={`px-3 py-1 rounded-full text-sm ${
            message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {message.text}
          </span>
        )}
      </div>

      {/* Auto Confirm Section */}
      <div className="bg-gray-50 rounded-xl p-5">
        <h4 className="font-medium text-gray-700 mb-4">⚡ ავტომატური დადასტურება</h4>
        <p className="text-sm text-gray-500 mb-4">
          ჩართვის შემთხვევაში ჯავშანი ავტომატურად დადასტურდება და სტუმარს ემაილი გაეგზავნება.
          გამორთვის შემთხვევაში ჯავშანი შემოვა "მოლოდინში" სტატუსით და ხელით უნდა დაადასტუროთ.
        </p>
        
        <div className="space-y-3">
          {/* Spa */}
          <label className="flex items-center justify-between p-3 bg-white rounded-lg border cursor-pointer hover:border-blue-300">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🍺</span>
              <div>
                <div className="font-medium">ლუდის სპა</div>
                <div className="text-sm text-gray-500">სპა ჯავშნების ავტო-დადასტურება</div>
              </div>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={settings.autoConfirmSpa}
                onChange={(e) => setSettings({ ...settings, autoConfirmSpa: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
            </div>
          </label>

          {/* Restaurant */}
          <label className="flex items-center justify-between p-3 bg-white rounded-lg border cursor-pointer hover:border-blue-300">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🍽️</span>
              <div>
                <div className="font-medium">რესტორანი</div>
                <div className="text-sm text-gray-500">რესტორნის ჯავშნების ავტო-დადასტურება</div>
              </div>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={settings.autoConfirmRestaurant}
                onChange={(e) => setSettings({ ...settings, autoConfirmRestaurant: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
            </div>
          </label>

          {/* Hotel */}
          <label className="flex items-center justify-between p-3 bg-white rounded-lg border cursor-pointer hover:border-blue-300">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏨</span>
              <div>
                <div className="font-medium">სასტუმრო</div>
                <div className="text-sm text-gray-500">სასტუმროს ჯავშნების ავტო-დადასტურება</div>
              </div>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={settings.autoConfirmHotel}
                onChange={(e) => setSettings({ ...settings, autoConfirmHotel: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
            </div>
          </label>
        </div>
      </div>

      {/* Notification Section */}
      <div className="bg-gray-50 rounded-xl p-5">
        <h4 className="font-medium text-gray-700 mb-4">🔔 შეტყობინებები</h4>
        
        <div className="space-y-3">
          {/* Email */}
          <label className="flex items-center justify-between p-3 bg-white rounded-lg border cursor-pointer hover:border-blue-300">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📧</span>
              <div>
                <div className="font-medium">ემაილ დადასტურება</div>
                <div className="text-sm text-gray-500">სტუმარს გაეგზავნება ემაილი დადასტურებისას</div>
              </div>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={settings.sendEmailOnConfirm}
                onChange={(e) => setSettings({ ...settings, sendEmailOnConfirm: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
            </div>
          </label>

          {/* Telegram */}
          <label className="flex items-center justify-between p-3 bg-white rounded-lg border cursor-pointer hover:border-blue-300">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📱</span>
              <div>
                <div className="font-medium">Telegram შეტყობინება</div>
                <div className="text-sm text-gray-500">ახალ ჯავშანზე მიიღებთ Telegram შეტყობინებას</div>
              </div>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={settings.sendTelegramNotification}
                onChange={(e) => setSettings({ ...settings, sendTelegramNotification: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
            </div>
          </label>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={saveSettings}
          disabled={saving}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {saving ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
              შენახვა...
            </>
          ) : (
            <>💾 შენახვა</>
          )}
        </button>
      </div>
    </div>
  )
}
