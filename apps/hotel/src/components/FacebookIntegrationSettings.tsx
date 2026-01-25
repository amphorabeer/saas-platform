'use client'

import React, { useState, useEffect } from 'react'

interface FacebookIntegration {
  id: string
  pageId: string
  pageName: string
  verifyToken: string
  isActive: boolean
  autoReply: boolean
  welcomeMessage: string
  botEnabled: boolean
  bookingEnabled: boolean
  messagesReceived: number
  messagesSent: number
  bookingsCreated: number
}

export default function FacebookIntegrationSettings() {
  const [integration, setIntegration] = useState<FacebookIntegration | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Form state
  const [pageId, setPageId] = useState('')
  const [pageAccessToken, setPageAccessToken] = useState('')
  const [welcomeMessage, setWelcomeMessage] = useState('')
  const [botEnabled, setBotEnabled] = useState(true)
  const [bookingEnabled, setBookingEnabled] = useState(true)
  
  const [showToken, setShowToken] = useState(false)
  
  // Load existing integration
  useEffect(() => {
    loadIntegration()
  }, [])
  
  const loadIntegration = async () => {
    try {
      const res = await fetch('/api/facebook')
      const data = await res.json()
      
      if (data.integration) {
        setIntegration(data.integration)
        setPageId(data.integration.pageId || '')
        setWelcomeMessage(data.integration.welcomeMessage || '')
        setBotEnabled(data.integration.botEnabled)
        setBookingEnabled(data.integration.bookingEnabled)
      }
    } catch (err) {
      console.error('Error loading integration:', err)
    } finally {
      setLoading(false)
    }
  }
  
  const saveIntegration = async () => {
    setError('')
    setSuccess('')
    setSaving(true)
    
    try {
      const res = await fetch('/api/facebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId,
          pageAccessToken: pageAccessToken || undefined,
          welcomeMessage,
          botEnabled,
          bookingEnabled,
        })
      })
      
      const data = await res.json()
      
      if (data.error) {
        setError(data.error + (data.details ? `: ${data.details}` : ''))
      } else {
        setSuccess('✅ Facebook ინტეგრაცია წარმატებით შეინახა!')
        setIntegration(data.integration)
        setPageAccessToken('') // Clear for security
        loadIntegration()
      }
    } catch (err) {
      setError('შეცდომა შენახვისას')
    } finally {
      setSaving(false)
    }
  }
  
  const deleteIntegration = async () => {
    if (!confirm('დარწმუნებული ხართ რომ გსურთ Facebook ინტეგრაციის წაშლა?')) return
    
    try {
      await fetch('/api/facebook', { method: 'DELETE' })
      setIntegration(null)
      setPageId('')
      setPageAccessToken('')
      setWelcomeMessage('')
      setSuccess('Facebook ინტეგრაცია წაიშალა')
    } catch (err) {
      setError('შეცდომა წაშლისას')
    }
  }
  
  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin text-4xl">⏳</div>
        <p className="mt-2 text-gray-500">იტვირთება...</p>
      </div>
    )
  }
  
  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
          <span className="text-2xl">📘</span>
        </div>
        <div>
          <h2 className="text-xl font-bold">Facebook Messenger Bot</h2>
          <p className="text-sm text-gray-500">მომხმარებლებს შეუძლიათ Messenger-ით დაჯავშნა</p>
        </div>
        {integration && (
          <div className={`ml-auto px-3 py-1 rounded-full text-sm font-medium ${
            integration.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
          }`}>
            {integration.isActive ? '🟢 აქტიური' : '⚪ გამორთული'}
          </div>
        )}
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
          ❌ {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {success}
        </div>
      )}
      
      {/* Stats */}
      {integration && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{integration.messagesReceived}</div>
            <div className="text-sm text-blue-500">მიღებული</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{integration.messagesSent}</div>
            <div className="text-sm text-green-500">გაგზავნილი</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{integration.bookingsCreated}</div>
            <div className="text-sm text-purple-500">ჯავშნები</div>
          </div>
        </div>
      )}
      
      {/* Configuration Form */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Facebook Page ID *
          </label>
          <input
            type="text"
            value={pageId}
            onChange={(e) => setPageId(e.target.value)}
            placeholder="მაგ: 115181224815244"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Page ID იპოვეთ Facebook Developer Console-ში
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Page Access Token {integration ? '(ახალი თუ გსურთ შეცვლა)' : '*'}
          </label>
          <div className="relative">
            <input
              type={showToken ? 'text' : 'password'}
              value={pageAccessToken}
              onChange={(e) => setPageAccessToken(e.target.value)}
              placeholder={integration ? '••••••••••••••••' : 'EAAQqJsvothQBO...'}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 pr-20"
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showToken ? '🙈' : '👁️'}
            </button>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            მისალმების ტექსტი
          </label>
          <textarea
            value={welcomeMessage}
            onChange={(e) => setWelcomeMessage(e.target.value)}
            placeholder="👋 გამარჯობა! ჩვენს სასტუმროში მოგესალმებით!"
            rows={3}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={botEnabled}
              onChange={(e) => setBotEnabled(e.target.checked)}
              className="w-5 h-5 rounded"
            />
            <span>🤖 Bot ჩართული</span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={bookingEnabled}
              onChange={(e) => setBookingEnabled(e.target.checked)}
              className="w-5 h-5 rounded"
            />
            <span>📅 ჯავშნა ჩართული</span>
          </label>
        </div>
        
        {/* Webhook Info */}
        {integration && (
          <div className="bg-gray-50 rounded-lg p-4 mt-4">
            <h4 className="font-medium mb-2">📋 Webhook კონფიგურაცია (Facebook-ში ჩასაწერი)</h4>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-500">Callback URL:</span>
                <code className="ml-2 bg-white px-2 py-1 rounded border">
                  https://saas-hotel.vercel.app/api/messenger/webhook
                </code>
              </div>
              <div>
                <span className="text-gray-500">Verify Token:</span>
                <code className="ml-2 bg-white px-2 py-1 rounded border">
                  {integration.verifyToken}
                </code>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex gap-3 pt-4">
          <button
            onClick={saveIntegration}
            disabled={saving || !pageId}
            className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50"
          >
            {saving ? '⏳ ინახება...' : '💾 შენახვა'}
          </button>
          
          {integration && (
            <button
              onClick={deleteIntegration}
              className="px-6 py-3 bg-red-100 text-red-600 rounded-lg font-medium hover:bg-red-200"
            >
              🗑️ წაშლა
            </button>
          )}
        </div>
      </div>
      
      {/* Help Section */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-700 mb-2">📖 როგორ დააკავშიროთ Facebook?</h4>
        <ol className="text-sm text-blue-600 space-y-1 list-decimal list-inside">
          <li>გახსენით <a href="https://developers.facebook.com/apps/" target="_blank" className="underline">Facebook Developer Console</a></li>
          <li>შექმენით ახალი App ან აირჩიეთ არსებული</li>
          <li>დაამატეთ Messenger Product</li>
          <li>დააკავშირეთ თქვენი Facebook Page</li>
          <li>დააგენერირეთ Page Access Token</li>
          <li>ჩაწერეთ Page ID და Token ზემოთ</li>
          <li>Configure Webhooks - ჩაწერეთ Callback URL და Verify Token</li>
        </ol>
      </div>
    </div>
  )
}