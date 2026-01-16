'use client'

import { useState } from 'react'
import { Button } from '@/components/ui'
import { Integration } from '@/data/settingsData'

interface IntegrationModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (config: Record<string, any>) => void
  integration: Integration
}

export function IntegrationModal({ isOpen, onClose, onSubmit, integration }: IntegrationModalProps) {
  const [host, setHost] = useState(integration.config.host || '')
  const [port, setPort] = useState(integration.config.port?.toString() || '587')
  const [useTLS, setUseTLS] = useState(integration.config.useTLS !== false)
  const [username, setUsername] = useState(integration.config.username || '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [senderName, setSenderName] = useState(integration.config.senderName || 'BrewMaster PRO')
  const [senderEmail, setSenderEmail] = useState(integration.config.senderEmail || '')

  if (!isOpen) return null

  const handleSubmit = () => {
    onSubmit({
      host,
      port: parseInt(port),
      useTLS,
      username,
      password: password || undefined,
      senderName,
      senderEmail,
    })
    onClose()
  }

  const handleTest = () => {
    console.log('Testing integration:', integration.name)
    // In real app, this would send a test email
    alert('ტესტ email გაიგზავნა!')
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-bold text-text-primary">
            🔗 {integration.name} კონფიგურაცია
          </h2>
        </div>

        <div className="p-6 space-y-6">
          {integration.type === 'email' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">SMTP სერვერი</label>
                <input
                  type="text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="smtp.gmail.com"
                  className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">პორტი</label>
                <input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useTLS}
                    onChange={(e) => setUseTLS(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-text-primary">TLS/SSL</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">მომხმარებელი</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="brewmaster@gmail.com"
                  className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">პაროლი</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">გამგზავნის სახელი</label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">გამგზავნის ელ-ფოსტა</label>
                <input
                  type="email"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  placeholder="noreply@brewmaster.ge"
                  className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                />
              </div>

              <div>
                <Button variant="secondary" onClick={handleTest}>🧪 ტესტი</Button>
              </div>
            </>
          ) : (
            <div className="text-text-muted">
              კონფიგურაცია ამ ინტეგრაციისთვის ჯერ არ არის დაყენებული.
            </div>
          )}
        </div>

        <div className="p-6 border-t border-border flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>გაუქმება</Button>
          <Button onClick={handleSubmit}>შენახვა</Button>
        </div>
      </div>
    </div>
  )
}
