'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui'
import { SettingsSidebar, UserModal, IntegrationModal, ConfirmationModal } from '@/components/settings'
import {
  mockUsers,
  mockCompanySettings,
  mockAppearanceSettings,
  mockProductionSettings,
  mockFinanceSettings,
  mockIntegrations,
  mockSecuritySettings,
  mockActivityLog,
  mockBackups,
  rolePermissions,
  roleConfig,
  getRelativeTime,
  formatFileSize,
  User,
  Integration,
  GravityUnit,
  VolumeUnit,
  DateFormat,
  Currency,
} from '@/data/settingsData'
import { formatDate } from '@/lib/utils'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('company')
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [isIntegrationModalOpen, setIsIntegrationModalOpen] = useState(false)
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null)
  const [confirmationAction, setConfirmationAction] = useState<(() => void) | null>(null)

  // State for each tab
  const [companySettings, setCompanySettings] = useState(mockCompanySettings)
  const [appearanceSettings, setAppearanceSettings] = useState(mockAppearanceSettings)
  const [productionSettings, setProductionSettings] = useState(mockProductionSettings)
  const [financeSettings, setFinanceSettings] = useState(mockFinanceSettings)
  const [securitySettings, setSecuritySettings] = useState(mockSecuritySettings)
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: {
      lowStock: true,
      newOrder: true,
      orderStatusChange: true,
      invoiceDue: true,
      maintenanceReminder: true,
      dailySummary: false,
      weeklyReport: true,
    },
    pushNotifications: {
      fermentationComplete: true,
      temperatureAlert: true,
      criticalStock: true,
      newOrder: false,
    },
    recipients: {
      lowStock: ['nika@brewmaster.ge', 'giorgi@brewmaster.ge'],
      newOrder: ['giorgi@brewmaster.ge'],
      maintenanceReminder: ['nika@brewmaster.ge'],
    },
  })

  const handleSave = () => {
    console.log('Settings saved')
    // In real app, this would save to backend
  }

  const handleDeleteUser = (userId: string) => {
    setConfirmationAction(() => () => {
      console.log('Delete user:', userId)
    })
    setIsConfirmationModalOpen(true)
  }

  const handleDeleteData = () => {
    setConfirmationAction(() => () => {
      console.log('Delete all data')
    })
    setIsConfirmationModalOpen(true)
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'company':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-text-primary">🏢 კომპანიის ინფორმაცია</h3>
              </CardHeader>
              <CardBody className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">ლოგო</label>
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-24 rounded-lg bg-bg-tertiary flex items-center justify-center text-4xl border border-border">
                      🍺
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm">ატვირთვა</Button>
                      <Button variant="secondary" size="sm">წაშლა</Button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">კომპანიის სახელი</label>
                  <input
                    type="text"
                    value={companySettings.name}
                    onChange={(e) => setCompanySettings({ ...companySettings, name: e.target.value })}
                    className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">იურიდიული სახელი</label>
                  <input
                    type="text"
                    value={companySettings.legalName}
                    onChange={(e) => setCompanySettings({ ...companySettings, legalName: e.target.value })}
                    className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">საიდენტიფიკაციო #</label>
                  <input
                    type="text"
                    value={companySettings.taxId}
                    onChange={(e) => setCompanySettings({ ...companySettings, taxId: e.target.value })}
                    className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">მისამართი</label>
                  <input
                    type="text"
                    value={companySettings.address}
                    onChange={(e) => setCompanySettings({ ...companySettings, address: e.target.value })}
                    className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">ტელეფონი</label>
                    <input
                      type="tel"
                      value={companySettings.phone}
                      onChange={(e) => setCompanySettings({ ...companySettings, phone: e.target.value })}
                      className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">ელ-ფოსტა</label>
                    <input
                      type="email"
                      value={companySettings.email}
                      onChange={(e) => setCompanySettings({ ...companySettings, email: e.target.value })}
                      className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">ვებსაიტი</label>
                  <input
                    type="url"
                    value={companySettings.website || ''}
                    onChange={(e) => setCompanySettings({ ...companySettings, website: e.target.value })}
                    className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                  />
                </div>

                <div className="pt-4 border-t border-border">
                  <h4 className="font-semibold text-text-primary mb-4">საბანკო რეკვიზიტები</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">ბანკი</label>
                      <input
                        type="text"
                        value={companySettings.bankName || ''}
                        onChange={(e) => setCompanySettings({ ...companySettings, bankName: e.target.value })}
                        className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">ანგარიშის #</label>
                      <input
                        type="text"
                        value={companySettings.bankAccount || ''}
                        onChange={(e) => setCompanySettings({ ...companySettings, bankAccount: e.target.value })}
                        className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">SWIFT</label>
                      <input
                        type="text"
                        value={companySettings.bankSwift || ''}
                        onChange={(e) => setCompanySettings({ ...companySettings, bankSwift: e.target.value })}
                        className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                      />
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        )

      case 'users':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-text-primary">👥 მომხმარებლები</h2>
              <Button onClick={() => {
                setSelectedUser(null)
                setIsUserModalOpen(true)
              }}>+ ახალი მომხმარებელი</Button>
            </div>

            <Card>
              <CardBody>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">#</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">მომხმარებელი</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">ელ-ფოსტა</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">როლი</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">სტატუსი</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">ბოლო აქტივობა</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">მოქმედება</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockUsers.map((user, index) => {
                        const role = roleConfig[user.role]
                        return (
                          <tr key={user.id} className="border-b border-border hover:bg-bg-tertiary/50">
                            <td className="py-3 px-4 text-text-muted">{index + 1}</td>
                            <td className="py-3 px-4 text-text-primary">{user.firstName} {user.lastName}</td>
                            <td className="py-3 px-4 text-text-primary">{user.email}</td>
                            <td className="py-3 px-4">
                              <span className="inline-flex items-center gap-1">
                                <span>{role.icon}</span>
                                <span className="text-text-primary">{role.name}</span>
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                user.status === 'active' ? 'bg-green-400/20 text-green-400' : 'bg-gray-400/20 text-gray-400'
                              }`}>
                                {user.status === 'active' ? '🟢 აქტიური' : '⚪ არააქტიური'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-text-muted text-sm">
                              {user.lastActivity ? getRelativeTime(user.lastActivity) : '-'}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedUser(user)
                                    setIsUserModalOpen(true)
                                  }}
                                >
                                  ✏️
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteUser(user.id)}
                                >
                                  🗑️
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-text-primary">როლები და უფლებები</h3>
              </CardHeader>
              <CardBody>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">როლი</th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-text-primary">წარმოება</th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-text-primary">მარაგები</th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-text-primary">გაყიდვები</th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-text-primary">ფინანსები</th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-text-primary">პარამეტრები</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(rolePermissions).map(([role, permissions]) => {
                        const config = roleConfig[role as keyof typeof roleConfig]
                        return (
                          <tr key={role} className="border-b border-border">
                            <td className="py-3 px-4">
                              <span className="inline-flex items-center gap-1">
                                <span>{config.icon}</span>
                                <span className="text-text-primary">{config.name}</span>
                              </span>
                            </td>
                            {['production', 'inventory', 'sales', 'finances', 'settings'].map((module) => {
                              const perm = permissions[module as keyof typeof permissions]
                              return (
                                <td key={module} className="py-3 px-4 text-center">
                                  {perm === 'full' ? '✅ სრული' : perm === 'view' ? '👁️ ნახვა' : '❌ არა'}
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4">
                  <Button variant="secondary">როლების რედაქტირება</Button>
                </div>
              </CardBody>
            </Card>
          </div>
        )

      case 'appearance':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-text-primary">🎨 გარეგნობა</h3>
              </CardHeader>
              <CardBody className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-3">თემა</label>
                  <div className="flex gap-4">
                    {(['dark', 'light', 'system'] as const).map((theme) => (
                      <label key={theme} className="flex-1 cursor-pointer">
                        <input
                          type="radio"
                          checked={appearanceSettings.theme === theme}
                          onChange={() => setAppearanceSettings({ ...appearanceSettings, theme })}
                          className="hidden"
                        />
                        <div className={`p-4 rounded-lg border-2 text-center transition-colors ${
                          appearanceSettings.theme === theme
                            ? 'border-copper bg-copper/10'
                            : 'border-border hover:border-copper/50'
                        }`}>
                          <div className="text-2xl mb-2">
                            {theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '💻'}
                          </div>
                          <div className="text-sm text-text-primary">
                            {theme === 'dark' ? 'მუქი' : theme === 'light' ? 'ნათელი' : 'სისტემა'}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-3">აქცენტის ფერი</label>
                  <div className="flex gap-3">
                    {(['copper', 'blue', 'green', 'purple', 'red'] as const).map((color) => (
                      <label key={color} className="cursor-pointer">
                        <input
                          type="radio"
                          checked={appearanceSettings.accentColor === color}
                          onChange={() => setAppearanceSettings({ ...appearanceSettings, accentColor: color })}
                          className="hidden"
                        />
                        <div className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center ${
                          appearanceSettings.accentColor === color
                            ? 'border-copper'
                            : 'border-border hover:border-copper/50'
                        }`}>
                          <div className={`w-8 h-8 rounded ${
                            color === 'copper' ? 'bg-copper' :
                            color === 'blue' ? 'bg-blue-500' :
                            color === 'green' ? 'bg-green-500' :
                            color === 'purple' ? 'bg-purple-500' :
                            'bg-red-500'
                          }`} />
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">ენა</label>
                  <select
                    value={appearanceSettings.language}
                    onChange={(e) => setAppearanceSettings({ ...appearanceSettings, language: e.target.value as 'ka' | 'en' | 'ru' })}
                    className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                  >
                    <option value="ka">ქართული</option>
                    <option value="en">English</option>
                    <option value="ru">Русский</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">თარიღის ფორმატი</label>
                  <select
                    value={appearanceSettings.dateFormat}
                    onChange={(e) => setAppearanceSettings({ ...appearanceSettings, dateFormat: e.target.value as DateFormat })}
                    className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                  >
                    <option value="DD.MM.YYYY">DD.MM.YYYY (31.12.2024)</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2024)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">ვალუტა</label>
                  <select
                    value={appearanceSettings.currency}
                    onChange={(e) => setAppearanceSettings({ ...appearanceSettings, currency: e.target.value as Currency })}
                    className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                  >
                    <option value="GEL">GEL (₾)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">რიცხვის ფორმატი</label>
                  <select
                    value={appearanceSettings.numberFormat}
                    onChange={(e) => setAppearanceSettings({ ...appearanceSettings, numberFormat: e.target.value })}
                    className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                  >
                    <option value="1,234.56">1,234.56</option>
                    <option value="1.234,56">1.234,56</option>
                    <option value="1 234.56">1 234.56</option>
                  </select>
                </div>
              </CardBody>
            </Card>
          </div>
        )

      case 'notifications':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-text-primary">🔔 შეტყობინებები</h3>
              </CardHeader>
              <CardBody className="space-y-6">
                <div>
                  <h4 className="font-semibold text-text-primary mb-4">ელ-ფოსტის შეტყობინებები</h4>
                  <div className="space-y-3">
                    {Object.entries(notificationSettings.emailNotifications).map(([key, value]) => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => setNotificationSettings({
                            ...notificationSettings,
                            emailNotifications: { ...notificationSettings.emailNotifications, [key]: e.target.checked }
                          })}
                          className="w-4 h-4"
                        />
                        <span className="text-text-primary">
                          {key === 'lowStock' ? 'დაბალი მარაგის გაფრთხილება' :
                           key === 'newOrder' ? 'ახალი შეკვეთა' :
                           key === 'orderStatusChange' ? 'შეკვეთის სტატუსის ცვლილება' :
                           key === 'invoiceDue' ? 'ინვოისის ვადის გასვლა' :
                           key === 'maintenanceReminder' ? 'აღჭურვილობის მოვლის შეხსენება' :
                           key === 'dailySummary' ? 'ყოველდღიური შეჯამება' :
                           'ყოველკვირეული ანგარიში'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <h4 className="font-semibold text-text-primary mb-4">Push შეტყობინებები</h4>
                  <div className="space-y-3">
                    {Object.entries(notificationSettings.pushNotifications).map(([key, value]) => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => setNotificationSettings({
                            ...notificationSettings,
                            pushNotifications: { ...notificationSettings.pushNotifications, [key]: e.target.checked }
                          })}
                          className="w-4 h-4"
                        />
                        <span className="text-text-primary">
                          {key === 'fermentationComplete' ? 'ფერმენტაციის დასრულება' :
                           key === 'temperatureAlert' ? 'ტემპერატურის გადახრა' :
                           key === 'criticalStock' ? 'კრიტიკული მარაგი' :
                           'ახალი შეკვეთა'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <h4 className="font-semibold text-text-primary mb-4">შეტყობინების მიმღებები</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">შეტყობინება</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">მიმღებები</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(notificationSettings.recipients).map(([key, emails]) => (
                          <tr key={key} className="border-b border-border">
                            <td className="py-3 px-4 text-text-primary">
                              {key === 'lowStock' ? 'დაბალი მარაგი' :
                               key === 'newOrder' ? 'ახალი შეკვეთა' :
                               'აღჭურვილობის მოვლა'}
                            </td>
                            <td className="py-3 px-4 text-text-muted text-sm">{emails.join(', ')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4">
                    <Button variant="secondary">მიმღებების რედაქტირება</Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        )

      case 'production':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-text-primary">📊 წარმოების პარამეტრები</h3>
              </CardHeader>
              <CardBody className="space-y-6">
                <div className="pt-4 border-t border-border">
                  <h4 className="font-semibold text-text-primary mb-4">პარტიის ნუმერაცია</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">პრეფიქსი</label>
                      <input
                        type="text"
                        value={productionSettings.batchPrefix}
                        onChange={(e) => setProductionSettings({ ...productionSettings, batchPrefix: e.target.value })}
                        className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">ფორმატი</label>
                      <input
                        type="text"
                        value={productionSettings.batchFormat}
                        onChange={(e) => setProductionSettings({ ...productionSettings, batchFormat: e.target.value })}
                        className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">მომდევნო ნომერი</label>
                      <input
                        type="number"
                        value={productionSettings.nextBatchNumber}
                        onChange={(e) => setProductionSettings({ ...productionSettings, nextBatchNumber: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <h4 className="font-semibold text-text-primary mb-4">ნაგულისხმევი პარამეტრები</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">ფერმენტაციის ტემპერატურა</label>
                      <input
                        type="number"
                        value={productionSettings.defaultFermentationTemp}
                        onChange={(e) => setProductionSettings({ ...productionSettings, defaultFermentationTemp: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                      />
                      <span className="text-sm text-text-muted ml-2">°C</span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">ფერმენტაციის ხანგრძლივობა</label>
                      <input
                        type="number"
                        value={productionSettings.defaultFermentationDays}
                        onChange={(e) => setProductionSettings({ ...productionSettings, defaultFermentationDays: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                      />
                      <span className="text-sm text-text-muted ml-2">დღე</span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">კონდიციონირების ტემპერატურა</label>
                      <input
                        type="number"
                        value={productionSettings.defaultConditioningTemp}
                        onChange={(e) => setProductionSettings({ ...productionSettings, defaultConditioningTemp: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                      />
                      <span className="text-sm text-text-muted ml-2">°C</span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">კონდიციონირების ხანგრძლივობა</label>
                      <input
                        type="number"
                        value={productionSettings.defaultConditioningDays}
                        onChange={(e) => setProductionSettings({ ...productionSettings, defaultConditioningDays: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                      />
                      <span className="text-sm text-text-muted ml-2">დღე</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <h4 className="font-semibold text-text-primary mb-4">ტემპერატურის გაფრთხილება</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">მინიმუმი</label>
                      <input
                        type="number"
                        value={productionSettings.tempAlertMin}
                        onChange={(e) => setProductionSettings({ ...productionSettings, tempAlertMin: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                      />
                      <span className="text-sm text-text-muted ml-2">°C</span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">მაქსიმუმი</label>
                      <input
                        type="number"
                        value={productionSettings.tempAlertMax}
                        onChange={(e) => setProductionSettings({ ...productionSettings, tempAlertMax: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                      />
                      <span className="text-sm text-text-muted ml-2">°C</span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">გადახრის ზღვარი</label>
                      <input
                        type="number"
                        value={productionSettings.tempAlertThreshold}
                        onChange={(e) => setProductionSettings({ ...productionSettings, tempAlertThreshold: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                      />
                      <span className="text-sm text-text-muted ml-2">°C</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">გრავიტაციის ერთეული</label>
                      <select
                        value={productionSettings.gravityUnit}
                        onChange={(e) => setProductionSettings({ ...productionSettings, gravityUnit: e.target.value as GravityUnit })}
                        className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                      >
                        <option value="SG">SG (1.050)</option>
                        <option value="Plato">°P (12.5)</option>
                        <option value="Brix">Brix</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">მოცულობის ერთეული</label>
                      <select
                        value={productionSettings.volumeUnit}
                        onChange={(e) => setProductionSettings({ ...productionSettings, volumeUnit: e.target.value as VolumeUnit })}
                        className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                      >
                        <option value="L">ლიტრი (L)</option>
                        <option value="gal">გალონი (gal)</option>
                        <option value="bbl">ბარელი (bbl)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        )

      case 'finances':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-text-primary">💰 ფინანსური პარამეტრები</h3>
              </CardHeader>
              <CardBody className="space-y-6">
                <div className="pt-4 border-t border-border">
                  <h4 className="font-semibold text-text-primary mb-4">ინვოისის ნუმერაცია</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">გასაგზავნი პრეფიქსი</label>
                      <input
                        type="text"
                        value={financeSettings.outgoingInvoicePrefix}
                        onChange={(e) => setFinanceSettings({ ...financeSettings, outgoingInvoicePrefix: e.target.value })}
                        className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">მიღებული პრეფიქსი</label>
                      <input
                        type="text"
                        value={financeSettings.incomingInvoicePrefix}
                        onChange={(e) => setFinanceSettings({ ...financeSettings, incomingInvoicePrefix: e.target.value })}
                        className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">მომდევნო გასაგზავნი #</label>
                      <input
                        type="number"
                        value={financeSettings.nextOutgoingNumber}
                        onChange={(e) => setFinanceSettings({ ...financeSettings, nextOutgoingNumber: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">მომდევნო მიღებული #</label>
                      <input
                        type="number"
                        value={financeSettings.nextIncomingNumber}
                        onChange={(e) => setFinanceSettings({ ...financeSettings, nextIncomingNumber: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <h4 className="font-semibold text-text-primary mb-4">გადახდის პირობები</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">ნაგულისხმევი ვადა</label>
                      <input
                        type="number"
                        value={financeSettings.defaultPaymentTermDays}
                        onChange={(e) => setFinanceSettings({ ...financeSettings, defaultPaymentTermDays: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                      />
                      <span className="text-sm text-text-muted ml-2">დღე</span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">დაგვიანების პროცენტი</label>
                      <input
                        type="number"
                        step="0.1"
                        value={financeSettings.lateFeePercentage}
                        onChange={(e) => setFinanceSettings({ ...financeSettings, lateFeePercentage: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                      />
                      <span className="text-sm text-text-muted ml-2">% / დღე</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <h4 className="font-semibold text-text-primary mb-4">გადასახადები</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">დღგ</label>
                      <input
                        type="number"
                        value={financeSettings.vatPercentage}
                        onChange={(e) => setFinanceSettings({ ...financeSettings, vatPercentage: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                      />
                      <span className="text-sm text-text-muted ml-2">%</span>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={financeSettings.vatIncluded}
                        onChange={(e) => setFinanceSettings({ ...financeSettings, vatIncluded: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-text-primary">ფასებში დღგ ჩართულია</span>
                    </label>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <h4 className="font-semibold text-text-primary mb-4">ნაგულისხმევი ანგარიშები</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">შემოსავლის ანგარიში</label>
                      <input
                        type="text"
                        value={financeSettings.defaultIncomeAccount}
                        onChange={(e) => setFinanceSettings({ ...financeSettings, defaultIncomeAccount: e.target.value })}
                        className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">ხარჯის ანგარიში</label>
                      <input
                        type="text"
                        value={financeSettings.defaultExpenseAccount}
                        onChange={(e) => setFinanceSettings({ ...financeSettings, defaultExpenseAccount: e.target.value })}
                        className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">ბანკის ანგარიში</label>
                      <input
                        type="text"
                        value={financeSettings.defaultBankAccount}
                        onChange={(e) => setFinanceSettings({ ...financeSettings, defaultBankAccount: e.target.value })}
                        className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                      />
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        )

      case 'integrations':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-text-primary">🔗 ინტეგრაციები</h3>
              </CardHeader>
              <CardBody className="space-y-4">
                <div>
                  <h4 className="font-semibold text-text-primary mb-4">აქტიური ინტეგრაციები</h4>
                  <div className="space-y-3">
                    {mockIntegrations.filter(i => i.status === 'active').map((integration) => (
                      <div key={integration.id} className="p-4 bg-bg-tertiary rounded-lg border border-green-500/30">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="font-semibold text-text-primary">{integration.name}</div>
                            {integration.type === 'email' && (
                              <div className="text-sm text-text-muted">{integration.config.host}</div>
                            )}
                            {integration.type === 'sheets' && (
                              <div className="text-sm text-text-muted">{integration.config.sheetId}@sheets</div>
                            )}
                          </div>
                          <span className="px-3 py-1 rounded-lg text-xs font-medium bg-green-400/20 text-green-400">
                            🟢 აქტიური
                          </span>
                        </div>
                        {integration.lastSync && (
                          <div className="text-xs text-text-muted mb-2">
                            ბოლო სინქრონიზაცია: {formatDate(integration.lastSync)} {integration.lastSync.toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setSelectedIntegration(integration)
                              setIsIntegrationModalOpen(true)
                            }}
                          >
                            კონფიგურაცია
                          </Button>
                          <Button variant="danger" size="sm">❌</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <h4 className="font-semibold text-text-primary mb-4">ხელმისაწვდომი ინტეგრაციები</h4>
                  <div className="space-y-3">
                    {mockIntegrations.filter(i => i.status === 'inactive').map((integration) => (
                      <div key={integration.id} className="p-4 bg-bg-tertiary rounded-lg border border-border">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="font-semibold text-text-primary">{integration.name}</div>
                            <div className="text-sm text-text-muted">
                              {integration.type === 'stripe' ? 'ონლაინ გადახდების მიღება' :
                               integration.type === 'telegram' ? 'შეტყობინებები Telegram-ში' :
                               'მარაგების სინქრონიზაცია'}
                            </div>
                          </div>
                          <span className="px-3 py-1 rounded-lg text-xs font-medium bg-gray-400/20 text-gray-400">
                            ⚪ არააქტიური
                          </span>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setSelectedIntegration(integration)
                            setIsIntegrationModalOpen(true)
                          }}
                        >
                          დაკავშირება
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <h4 className="font-semibold text-text-primary mb-4">API კონფიგურაცია</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">API Key</label>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value="••••••••••••••••"
                          readOnly
                          className="flex-1 px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                        />
                        <Button variant="secondary" size="sm">👁️</Button>
                        <Button variant="secondary" size="sm">🔄 განახლება</Button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">Webhook URL</label>
                      <input
                        type="url"
                        value="https://api.brewmaster.ge/webhook"
                        readOnly
                        className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                      />
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        )

      case 'security':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-text-primary">🔒 უსაფრთხოება</h3>
              </CardHeader>
              <CardBody className="space-y-6">
                <div className="pt-4 border-t border-border">
                  <h4 className="font-semibold text-text-primary mb-4">პაროლის პოლიტიკა</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">მინიმum სიმბოლო</label>
                      <input
                        type="number"
                        value={securitySettings.minPasswordLength}
                        onChange={(e) => setSecuritySettings({ ...securitySettings, minPasswordLength: parseInt(e.target.value) || 8 })}
                        className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={securitySettings.requireUppercase}
                          onChange={(e) => setSecuritySettings({ ...securitySettings, requireUppercase: e.target.checked })}
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-text-primary">დიდი ასო სავალდებულო</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={securitySettings.requireNumber}
                          onChange={(e) => setSecuritySettings({ ...securitySettings, requireNumber: e.target.checked })}
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-text-primary">რიცხვი სავალდებულო</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={securitySettings.requireSpecialChar}
                          onChange={(e) => setSecuritySettings({ ...securitySettings, requireSpecialChar: e.target.checked })}
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-text-primary">სპეციალური სიმბოლო სავალდებულო</span>
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">პაროლის ვადა</label>
                      <input
                        type="number"
                        value={securitySettings.passwordExpiryDays}
                        onChange={(e) => setSecuritySettings({ ...securitySettings, passwordExpiryDays: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                      />
                      <span className="text-sm text-text-muted ml-2">დღე (0 = უვადო)</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <h4 className="font-semibold text-text-primary mb-4">სესიის პარამეტრები</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">სესიის ხანგრძლივობა</label>
                      <input
                        type="number"
                        value={securitySettings.sessionDurationHours}
                        onChange={(e) => setSecuritySettings({ ...securitySettings, sessionDurationHours: parseInt(e.target.value) || 24 })}
                        className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                      />
                      <span className="text-sm text-text-muted ml-2">საათი</span>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={securitySettings.autoLogoutEnabled}
                        onChange={(e) => setSecuritySettings({ ...securitySettings, autoLogoutEnabled: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-text-primary">ავტომატური გამოსვლა უმოქმედობისას</span>
                    </label>
                    {securitySettings.autoLogoutEnabled && (
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">უმოქმედობის ლიმიტი</label>
                        <input
                          type="number"
                          value={securitySettings.autoLogoutMinutes}
                          onChange={(e) => setSecuritySettings({ ...securitySettings, autoLogoutMinutes: parseInt(e.target.value) || 30 })}
                          className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                        />
                        <span className="text-sm text-text-muted ml-2">წუთი</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <h4 className="font-semibold text-text-primary mb-4">ორფაქტორიანი ავთენტიფიკაცია</h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={securitySettings.twoFactorRequired === 'none'}
                        onChange={() => setSecuritySettings({ ...securitySettings, twoFactorRequired: 'none' })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-text-primary">2FA სავალდებულო ყველასთვის</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={securitySettings.twoFactorRequired === 'admin'}
                        onChange={() => setSecuritySettings({ ...securitySettings, twoFactorRequired: 'admin' })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-text-primary">2FA სავალდებულო ადმინებისთვის</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={securitySettings.twoFactorRequired === 'all'}
                        onChange={() => setSecuritySettings({ ...securitySettings, twoFactorRequired: 'all' })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-text-primary">2FA არასავალდებულო</span>
                    </label>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <h4 className="font-semibold text-text-primary mb-4">აქტივობის ლოგი</h4>
                  <div className="space-y-2 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={securitySettings.logLogins}
                        onChange={(e) => setSecuritySettings({ ...securitySettings, logLogins: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-text-primary">შესვლების ლოგირება</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={securitySettings.logActions}
                        onChange={(e) => setSecuritySettings({ ...securitySettings, logActions: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-text-primary">მოქმედებების ლოგირება</span>
                    </label>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">ლოგის შენახვის ვადა</label>
                      <input
                        type="number"
                        value={securitySettings.logRetentionDays}
                        onChange={(e) => setSecuritySettings({ ...securitySettings, logRetentionDays: parseInt(e.target.value) || 365 })}
                        className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                      />
                      <span className="text-sm text-text-muted ml-2">დღე</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <h5 className="font-semibold text-text-primary mb-3">ბოლო აქტივობები</h5>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 px-3 text-xs font-semibold text-text-primary">თარიღი</th>
                            <th className="text-left py-2 px-3 text-xs font-semibold text-text-primary">მომხმარებელი</th>
                            <th className="text-left py-2 px-3 text-xs font-semibold text-text-primary">მოქმედება</th>
                            <th className="text-left py-2 px-3 text-xs font-semibold text-text-primary">IP</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mockActivityLog.slice(0, 5).map((log) => (
                            <tr key={log.id} className="border-b border-border">
                              <td className="py-2 px-3 text-xs text-text-muted">{formatDate(log.timestamp)} {log.timestamp.toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' })}</td>
                              <td className="py-2 px-3 text-xs text-text-primary">{log.userName}</td>
                              <td className="py-2 px-3 text-xs text-text-primary">{log.action} {log.details && `(${log.details})`}</td>
                              <td className="py-2 px-3 text-xs text-text-muted">{log.ipAddress}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-3">
                      <Button variant="ghost" size="sm">სრული ლოგი →</Button>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        )

      case 'data':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-text-primary">💾 მონაცემების მართვა</h3>
              </CardHeader>
              <CardBody className="space-y-6">
                <div className="pt-4 border-t border-border">
                  <h4 className="font-semibold text-text-primary mb-4">სარეზერვო ასლი</h4>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-text-muted mb-1">ბოლო backup</div>
                        <div className="text-text-primary">{formatDate(mockBackups[0].date)} {mockBackups[0].date.toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                      <div>
                        <div className="text-sm text-text-muted mb-1">შემდეგი backup</div>
                        <div className="text-text-primary">13.12.2024 03:00</div>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" defaultChecked className="w-4 h-4" />
                      <span className="text-sm text-text-primary">ავტომატური backup</span>
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">სიხშირე</label>
                        <select className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary">
                          <option>ყოველდღე</option>
                          <option>ყოველკვირე</option>
                          <option>ყოველთვე</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">შენახვის ვადა</label>
                        <input type="number" defaultValue={30} className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary" />
                        <span className="text-sm text-text-muted ml-2">დღე</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary">📥 Backup ახლა</Button>
                      <Button variant="secondary">📤 აღდგენა</Button>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <h4 className="font-semibold text-text-primary mb-4">ბოლო backup-ები</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">თარიღი</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">ზომა</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">სტატუსი</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">მოქმედება</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mockBackups.slice(0, 3).map((backup) => (
                          <tr key={backup.id} className="border-b border-border">
                            <td className="py-3 px-4 text-text-primary">{formatDate(backup.date)}</td>
                            <td className="py-3 px-4 text-text-primary">{formatFileSize(backup.size)}</td>
                            <td className="py-3 px-4">
                              <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                backup.status === 'success' ? 'bg-green-400/20 text-green-400' : 'bg-red-400/20 text-red-400'
                              }`}>
                                {backup.status === 'success' ? '✅ წარმატებული' : '❌ ჩაჭრილი'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm">📥</Button>
                                <Button variant="ghost" size="sm">🗑️</Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <h4 className="font-semibold text-text-primary mb-4">ექსპორტი</h4>
                  <div className="space-y-3">
                    <div>
                      <Button variant="secondary" className="w-full">📊 Excel ექსპორტი</Button>
                      <div className="mt-2 space-y-1 pl-4">
                        {['წარმოების მონაცემები', 'რეცეპტები', 'მარაგები', 'გაყიდვები', 'ფინანსები'].map((item) => (
                          <label key={item} className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" defaultChecked className="w-4 h-4" />
                            <span className="text-sm text-text-primary">{item}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <Button variant="secondary" className="w-full">📄 PDF ანგარიშები</Button>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <h4 className="font-semibold text-text-primary mb-4">იმპორტი</h4>
                  <Button variant="secondary" className="w-full">📤 მონაცემების იმპორტი</Button>
                  <p className="text-xs text-text-muted mt-2">მხარდაჭერილი ფორმატები: CSV, Excel, JSON</p>
                </div>

                <div className="pt-4 border-t border-border">
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                    <h4 className="font-semibold text-red-400 mb-4">⚠️ საშიში ზონა</h4>
                    <div className="space-y-3">
                      <Button variant="danger" className="w-full">🗑️ ტესტ მონაცემების წაშლა</Button>
                      <Button
                        variant="danger"
                        className="w-full"
                        onClick={() => {
                          setConfirmationAction(() => handleDeleteData)
                          setIsConfirmationModalOpen(true)
                        }}
                      >
                        🗑️ ყველა მონაცემის წაშლა
                      </Button>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <DashboardLayout title="🔧 პარამეტრები" breadcrumb="მთავარი / პარამეტრები">
      <div className="flex h-full">
        <SettingsSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            {renderTabContent()}
            <div className="mt-6 pt-6 border-t border-border flex justify-end">
              <Button onClick={handleSave}>შენახვა</Button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <UserModal
        isOpen={isUserModalOpen}
        onClose={() => {
          setIsUserModalOpen(false)
          setSelectedUser(null)
        }}
        onSubmit={(data) => {
          console.log('User saved:', data)
          setIsUserModalOpen(false)
          setSelectedUser(null)
        }}
        user={selectedUser || undefined}
      />

      {selectedIntegration && (
        <IntegrationModal
          isOpen={isIntegrationModalOpen}
          onClose={() => {
            setIsIntegrationModalOpen(false)
            setSelectedIntegration(null)
          }}
          onSubmit={(config) => {
            console.log('Integration configured:', config)
            setIsIntegrationModalOpen(false)
            setSelectedIntegration(null)
          }}
          integration={selectedIntegration}
        />
      )}

      <ConfirmationModal
        isOpen={isConfirmationModalOpen}
        onClose={() => {
          setIsConfirmationModalOpen(false)
          setConfirmationAction(null)
        }}
        onConfirm={() => {
          if (confirmationAction) {
            confirmationAction()
          }
          setIsConfirmationModalOpen(false)
          setConfirmationAction(null)
        }}
        title="დადასტურება საჭიროა"
        message="თქვენ აპირებთ: ყველა მონაცემის წაშლას. ეს მოქმედება შეუქცევადია!"
        details={['156 პარტია', '24 რეცეპტი', '1,234 ტრანზაქცია', 'ყველა სხვა მონაცემი']}
        confirmText="წაშლა"
        confirmValue="DELETE"
        danger={true}
      />
    </DashboardLayout>
  )
}

