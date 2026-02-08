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
  // AI Settings
  aiEnabled?: boolean
  aiProvider?: string
  aiApiKey?: string
  aiModel?: string
  aiPersonality?: string
  aiLanguages?: string[]
}

const AI_PROVIDERS = [
  { 
    value: 'claude', 
    label: 'Claude (Anthropic)', 
    models: [
      { value: 'claude-3-5-haiku-20241022', label: 'Haiku 3.5 (სწრაფი, იაფი)' },
      { value: 'claude-3-5-sonnet-20241022', label: 'Sonnet 3.5 (ბალანსირებული)' },
    ]
  },
  { 
    value: 'openai', 
    label: 'OpenAI (GPT)', 
    models: [
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini (სწრაფი, იაფი)' },
      { value: 'gpt-4o', label: 'GPT-4o (საუკეთესო)' },
    ]
  },
]

const PERSONALITIES = [
  { value: 'professional', label: '👔 პროფესიონალური', desc: 'ფორმალური და საქმიანი' },
  { value: 'friendly', label: '😊 მეგობრული', desc: 'თბილი და დახმარებისთვის მზად' },
  { value: 'casual', label: '😎 არაფორმალური', desc: 'მარტივი და მოდუნებული' },
]

const LANGUAGES = [
  { value: 'ka', label: '🇬🇪 ქართული' },
  { value: 'en', label: '🇬🇧 English' },
  { value: 'ru', label: '🇷🇺 Русский' },
]

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
  
  // AI Settings state
  const [aiEnabled, setAiEnabled] = useState(false)
  const [aiProvider, setAiProvider] = useState('claude')
  const [aiApiKey, setAiApiKey] = useState('')
  const [aiModel, setAiModel] = useState('claude-3-5-haiku-20241022')
  const [aiPersonality, setAiPersonality] = useState('friendly')
  const [aiLanguages, setAiLanguages] = useState<string[]>(['ka', 'en', 'ru'])
  
  const [showToken, setShowToken] = useState(false)
  const [showAiKey, setShowAiKey] = useState(false)
  
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
        // AI Settings
        setAiEnabled(data.integration.aiEnabled || false)
        setAiProvider(data.integration.aiProvider || 'claude')
        setAiApiKey(data.integration.aiApiKey || '')
        setAiModel(data.integration.aiModel || 'claude-3-5-haiku-20241022')
        setAiPersonality(data.integration.aiPersonality || 'friendly')
        setAiLanguages(data.integration.aiLanguages || ['ka', 'en', 'ru'])
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
          // AI Settings
          aiEnabled,
          aiProvider,
          aiApiKey: aiApiKey && !aiApiKey.includes('...') ? aiApiKey : undefined,
          aiModel,
          aiPersonality,
          aiLanguages,
        })
      })
      
      const data = await res.json()
      
      if (data.error) {
        setError(data.error + (data.details ? `: ${data.details}` : ''))
      } else {
        setSuccess('✅ პარამეტრები წარმატებით შეინახა!')
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
      setAiEnabled(false)
      setAiApiKey('')
      setSuccess('Facebook ინტეგრაცია წაიშალა')
    } catch (err) {
      setError('შეცდომა წაშლისას')
    }
  }

  const toggleLanguage = (lang: string) => {
    if (aiLanguages.includes(lang)) {
      if (aiLanguages.length > 1) {
        setAiLanguages(aiLanguages.filter(l => l !== lang))
      }
    } else {
      setAiLanguages([...aiLanguages, lang])
    }
  }

  const selectedProvider = AI_PROVIDERS.find(p => p.value === aiProvider)
  
  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin text-4xl">⏳</div>
        <p className="mt-2 text-gray-500">იტვირთება...</p>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Main Facebook Bot Card */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-2xl">📘</span>
          </div>
          <div>
            <h2 className="text-xl font-bold">Facebook Messenger Bot</h2>
            <p className="text-sm text-gray-500">მომხმარებლებს შეუძლიათ Messenger-ით დაკავშირება და კითხვების დასმა</p>
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
              <div className="text-sm text-blue-500">მიღებული შეტყობინება</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{integration.messagesSent}</div>
              <div className="text-sm text-green-500">გაგზავნილი შეტყობინება</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{integration.bookingsCreated}</div>
              <div className="text-sm text-purple-500">შექმნილი ჯავშანი</div>
            </div>
          </div>
        )}
        
        {/* Configuration Form */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-700 flex items-center gap-2">
            <span>⚙️</span> კონფიგურაცია
          </h3>
          
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
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showToken ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              მისასალმებელი შეტყობინება
            </label>
            <textarea
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              placeholder="👋 გამარჯობა! ჩვენს სასტუმროში მოგესალმებით!"
              rows={2}
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
        </div>
      </div>

      {/* AI Chatbot Settings Card */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">🤖</span>
            </div>
            <div>
              <h2 className="text-xl font-bold">AI Chatbot</h2>
              <p className="text-sm text-gray-500">ხელოვნური ინტელექტით მართული ავტომატური პასუხები</p>
            </div>
          </div>
          
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={aiEnabled}
              onChange={(e) => setAiEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-purple-600"></div>
            <span className="ml-3 text-sm font-medium text-gray-700">
              {aiEnabled ? 'ჩართული' : 'გამორთული'}
            </span>
          </label>
        </div>

        {aiEnabled && (
          <div className="space-y-5">
            {/* AI Provider & Model */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  🧠 AI პროვაიდერი
                </label>
                <select
                  value={aiProvider}
                  onChange={(e) => {
                    setAiProvider(e.target.value)
                    const provider = AI_PROVIDERS.find(p => p.value === e.target.value)
                    if (provider) setAiModel(provider.models[0].value)
                  }}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  {AI_PROVIDERS.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  📊 მოდელი
                </label>
                <select
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  {selectedProvider?.models.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* API Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                🔑 API Key
              </label>
              <div className="relative">
                <input
                  type={showAiKey ? 'text' : 'password'}
                  value={aiApiKey}
                  onChange={(e) => setAiApiKey(e.target.value)}
                  placeholder={aiProvider === 'claude' ? 'sk-ant-api03-...' : 'sk-...'}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowAiKey(!showAiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showAiKey ? '🙈' : '👁️'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {aiProvider === 'claude' 
                  ? '→ მიიღე: console.anthropic.com' 
                  : '→ მიიღე: platform.openai.com'}
              </p>
            </div>

            {/* Personality */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🎭 პიროვნება / სტილი
              </label>
              <div className="grid grid-cols-3 gap-3">
                {PERSONALITIES.map(p => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setAiPersonality(p.value)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      aiPersonality === p.value
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="font-medium">{p.label}</div>
                    <div className="text-xs text-gray-500">{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Languages */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🌍 ენები
              </label>
              <div className="flex gap-2">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.value}
                    type="button"
                    onClick={() => toggleLanguage(lang.value)}
                    className={`px-4 py-2 rounded-lg border-2 font-medium transition-all ${
                      aiLanguages.includes(lang.value)
                        ? 'border-purple-500 bg-purple-100 text-purple-700'
                        : 'border-gray-200 text-gray-600 hover:border-purple-300'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>

            {/* AI Info Box */}
            <div className="bg-purple-50 rounded-lg p-4">
              <h4 className="font-medium text-purple-700 mb-2">💡 AI Chatbot-ის შესახებ</h4>
              <ul className="text-sm text-purple-600 space-y-1">
                <li>• AI ავტომატურად პასუხობს კლიენტების კითხვებს</li>
                <li>• იყენებს ოთახების რეალურ ფასებს და ხელმისაწვდომობას</li>
                <li>• საუბრობს არჩეულ ენებზე</li>
                <li>• სავარაუდო ხარჯი: ~$1-5/თვე (გამოყენების მიხედვით)</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Webhook Info */}
      {integration && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="font-semibold text-gray-700 flex items-center gap-2 mb-4">
            <span>📋</span> Webhook კონფიგურაცია (Facebook-ში ჩასაწერი)
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 w-28">Callback URL:</span>
              <code className="flex-1 bg-gray-100 px-3 py-2 rounded border font-mono text-xs">
                https://hotel.geobiz.app/api/messenger/webhook
              </code>
              <button
                onClick={() => navigator.clipboard.writeText('https://hotel.geobiz.app/api/messenger/webhook')}
                className="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded"
              >
                📋
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 w-28">Verify Token:</span>
              <code className="flex-1 bg-gray-100 px-3 py-2 rounded border font-mono text-xs">
                {integration.verifyToken}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(integration.verifyToken)}
                className="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded"
              >
                📋
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={saveIntegration}
          disabled={saving || !pageId}
          className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? '⏳ ინახება...' : '💾 შენახვა'}
        </button>
        
        {integration && (
          <button
            onClick={deleteIntegration}
            className="px-6 py-3 bg-red-100 text-red-600 rounded-lg font-medium hover:bg-red-200 transition-colors"
          >
            🗑️ წაშლა
          </button>
        )}
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 rounded-xl p-4">
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