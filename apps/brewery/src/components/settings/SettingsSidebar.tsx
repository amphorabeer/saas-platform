'use client'

interface SettingsSidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

const settingsTabs = [
  { id: 'company', label: 'კომპანია', icon: '🏢' },
  { id: 'users', label: 'მომხმარებლები', icon: '👥' },
  { id: 'appearance', label: 'გარეგნობა', icon: '🎨' },
  { id: 'notifications', label: 'შეტყობინებები', icon: '🔔' },
  { id: 'production', label: 'წარმოება', icon: '📊' },
  { id: 'finances', label: 'ფინანსები', icon: '💰' },
  { id: 'integrations', label: 'ინტეგრაციები', icon: '🔗' },
  { id: 'security', label: 'უსაფრთხოება', icon: '🔒' },
  { id: 'data', label: 'მონაცემები', icon: '💾' },
]

export function SettingsSidebar({ activeTab, onTabChange }: SettingsSidebarProps) {
  return (
    <div className="w-64 bg-bg-card border-r border-border h-full">
      <div className="p-4 space-y-1">
        {settingsTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
              activeTab === tab.id
                ? 'bg-copper/20 border-l-2 border-copper text-text-primary font-medium'
                : 'text-text-muted hover:bg-bg-tertiary hover:text-text-primary'
            }`}
          >
            <span className="text-lg">{tab.icon}</span>
            <span className="text-sm">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

