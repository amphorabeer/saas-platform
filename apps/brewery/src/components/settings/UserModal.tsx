'use client'

import { useState } from 'react'
import { Button } from '@/components/ui'
import { User, UserRole, UserStatus } from '@/data/settingsData'
import { roleConfig } from '@/data/settingsData'

interface UserModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (user: Partial<User>) => void
  user?: User
}

export function UserModal({ isOpen, onClose, onSubmit, user }: UserModalProps) {
  const [firstName, setFirstName] = useState(user?.firstName || '')
  const [lastName, setLastName] = useState(user?.lastName || '')
  const [email, setEmail] = useState(user?.email || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [role, setRole] = useState<UserRole>(user?.role || 'operator')
  const [position, setPosition] = useState(user?.position || '')
  const [status, setStatus] = useState<UserStatus>(user?.status || 'active')
  const [sendInvite, setSendInvite] = useState(false)

  if (!isOpen) return null

  const handleSubmit = () => {
    onSubmit({
      firstName,
      lastName,
      email,
      phone: phone || undefined,
      role,
      position: position || undefined,
      status,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-bold text-text-primary">
            {user ? '✏️ მომხმარებლის რედაქტირება' : '➕ ახალი მომხმარებელი'}
          </h2>
        </div>

        <div className="p-6 space-y-6">
          {/* Avatar */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">პროფილის ფოტო</label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-bg-tertiary flex items-center justify-center text-3xl">
                👤
              </div>
              <Button variant="secondary" size="sm">ატვირთვა</Button>
            </div>
          </div>

          {/* Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">სახელი</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">გვარი</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">ელ-ფოსტა</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">ტელეფონი</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+995 555 123 456"
              className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">როლი</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
            >
              {Object.entries(roleConfig).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.icon} {config.name}
                </option>
              ))}
            </select>
          </div>

          {/* Position */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">პოზიცია</label>
            <input
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="მთავარი ტექნოლოგი"
              className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">სტატუსი</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={status === 'active'}
                  onChange={() => setStatus('active')}
                  className="w-4 h-4"
                />
                <span>🟢 აქტიური</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={status === 'inactive'}
                  onChange={() => setStatus('inactive')}
                  className="w-4 h-4"
                />
                <span>⚪ არააქტიური</span>
              </label>
            </div>
          </div>

          {/* Send Invite (only for new users) */}
          {!user && (
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendInvite}
                  onChange={(e) => setSendInvite(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-text-primary">გაგზავნე მოწვევა ელ-ფოსტაზე</span>
              </label>
            </div>
          )}

          {/* Actions for existing user */}
          {user && (
            <div className="pt-4 border-t border-border space-y-2">
              <Button variant="secondary" className="w-full">🔑 პაროლის შეცვლა</Button>
              <Button variant="secondary" className="w-full">📧 მოწვევის ხელახლა გაგზავნა</Button>
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
