'use client'

import React, { useState, useEffect } from 'react'
import PricingSettings from './settings/PricingSettings'
import HotelSettings from './HotelSettings'
import ChargesSettings from './ChargesSettings'
import ExtraServicesManager from './settings/ExtraServicesManager'
import PackagesManager from './settings/PackagesManager'
import QuickChargesManager from './settings/QuickChargesManager'
import ActivityLogs from './settings/ActivityLogs'
import ChannelManager from './settings/ChannelManager'
import moment from 'moment'

export default function SettingsHub() {
  const [activeSection, setActiveSection] = useState('dashboard')
  const [activeSubsection, setActiveSubsection] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [recentlyUsed, setRecentlyUsed] = useState<string[]>([])
  
  // Settings Sections with better organization
  const settingsSections = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: '🏠',
      description: 'Quick overview and shortcuts',
      color: 'blue'
    },
    {
      id: 'hotel',
      title: 'Hotel Configuration',
      icon: '🏨',
      description: 'Basic hotel information and setup',
      color: 'purple',
      subsections: [
        { id: 'info', label: 'Hotel Information', icon: '📋' },
        { id: 'floors', label: 'Floors & Layout', icon: '🏢' },
        { id: 'facilities', label: 'Facilities', icon: '🏊' }
      ]
    },
    {
      id: 'rooms',
      title: 'Rooms & Inventory',
      icon: '🛏️',
      description: 'Manage rooms and types',
      color: 'green',
      subsections: [
        { id: 'roomList', label: 'All Rooms', icon: '🚪' },
        { id: 'roomTypes', label: 'Room Categories', icon: '🏷️' },
        { id: 'amenities', label: 'Amenities', icon: '🛁' }
      ]
    },
    {
      id: 'pricing',
      title: 'Pricing & Charges',
      icon: '💰',
      description: 'Rates, extra charges, and taxes',
      color: 'yellow',
      subsections: [
        { id: 'rates', label: 'Room Rates', icon: '💵' },
        { id: 'extras', label: 'Extra Services', icon: '➕' },
        { id: 'packages', label: 'Packages', icon: '📦' },
        { id: 'taxes', label: 'Taxes & Fees', icon: '📊' },
        { id: 'quickButtons', label: 'Quick Charges', icon: '⚡' }
      ]
    },
    {
      id: 'operations',
      title: 'Operations',
      icon: '⚙️',
      description: 'Daily operations settings',
      color: 'red',
      subsections: [
        { id: 'checklist', label: 'Housekeeping', icon: '🧹' },
        { id: 'maintenance', label: 'Maintenance', icon: '🔧' },
        { id: 'nightAudit', label: 'Night Audit', icon: '🌙' }
      ]
    },
    {
      id: 'staff',
      title: 'Staff & Access',
      icon: '👥',
      description: 'Users, roles, and permissions',
      color: 'indigo',
      subsections: [
        { id: 'users', label: 'Users', icon: '👤' },
        { id: 'roles', label: 'Roles', icon: '🔐' },
        { id: 'departments', label: 'Departments', icon: '🏢' }
      ]
    },
    {
      id: 'system',
      title: 'System',
      icon: '🖥️',
      description: 'System configuration and logs',
      color: 'gray',
      subsections: [
        { id: 'general', label: 'General', icon: '⚙️' },
        { id: 'logs', label: 'Activity Logs', icon: '📋' },
        { id: 'backup', label: 'Backup', icon: '💾' },
        { id: 'integrations', label: 'Integrations', icon: '🔌' }
      ]
    },
    {
      id: 'channels',
      title: 'არხების მართვა',
      icon: '🔗',
      description: 'Booking.com, Airbnb და სხვა',
      color: 'cyan',
      subsections: [
        { id: 'connections', label: 'კავშირები', icon: '🌐' },
        { id: 'bookings', label: 'იმპორტირებული ჯავშნები', icon: '📥' }
      ]
    }
  ]
  
  // Utility function to prevent duplicates
  const getUniqueRecentItems = (items: string[], maxItems = 5) => {
    const uniqueItems = Array.from(new Set(items))
    return uniqueItems.slice(0, maxItems)
  }

  // Track recently used settings
  useEffect(() => {
    if (typeof window === 'undefined') return
    const recent = localStorage.getItem('recentSettings')
    if (recent) {
      try {
        const items = JSON.parse(recent)
        setRecentlyUsed(getUniqueRecentItems(items))
      } catch (e) {
        console.error('Error loading recent settings:', e)
      }
    }
  }, [])
  
  const trackUsage = (sectionId: string) => {
    // Remove duplicates - move clicked item to front
    const filtered = recentlyUsed.filter(id => id !== sectionId)
    const uniqueRecent = getUniqueRecentItems([sectionId, ...filtered])
    setRecentlyUsed(uniqueRecent)
    if (typeof window !== 'undefined') {
      localStorage.setItem('recentSettings', JSON.stringify(uniqueRecent))
    }
  }

  // Handle subsection click
  const handleSubsectionClick = (sectionId: string, subsectionId: string) => {
    setActiveSection(sectionId)
    setActiveSubsection(subsectionId)
    trackUsage(sectionId)
  }
  
  // Get unique sections from recently used (handle subsections)
  const getUniqueRecentlyUsedSections = () => {
    const uniqueSectionIds = new Set<string>()
    const result: any[] = []
    
    recentlyUsed.forEach(id => {
      // Find if it's a main section
      const mainSection = settingsSections.find(s => s.id === id)
      if (mainSection) {
        if (!uniqueSectionIds.has(mainSection.id)) {
          uniqueSectionIds.add(mainSection.id)
          result.push(mainSection)
        }
      } else {
        // It might be a subsection, find parent section
        const parentSection = settingsSections.find(s => 
          s.subsections?.some(sub => sub.id === id)
        )
        if (parentSection && !uniqueSectionIds.has(parentSection.id)) {
          uniqueSectionIds.add(parentSection.id)
          result.push(parentSection)
        }
      }
    })
    
    return result
  }
  
  // Filter sections based on search
  const filteredSections = settingsSections.filter(section => 
    section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.subsections?.some(sub => 
      sub.label.toLowerCase().includes(searchTerm.toLowerCase())
    )
  )

  // Render section content based on active section and subsection
  const renderSectionContent = () => {
    switch(activeSection) {
      case 'dashboard':
        return <SettingsDashboard sections={settingsSections} onNavigate={(id) => { setActiveSection(id); trackUsage(id); }} />
      
      case 'hotel':
        return <HotelSettings />
      
      case 'rooms':
        switch(activeSubsection) {
          case 'roomList':
            return <RoomsManager />
          case 'roomTypes':
            return <RoomTypesManager />
          case 'amenities':
            return <AmenitiesManager />
          default:
            return <RoomsSettings />
        }
      
      case 'pricing':
        switch(activeSubsection) {
          case 'rates':
            return <PricingSettings />
          case 'extras':
            return <ExtraServicesManager />
          case 'packages':
            return <PackagesManager />
          case 'taxes':
            return <TaxesManager />
          case 'quickButtons':
            return <QuickChargesManager />
          default:
            return <PricingSettings />
        }
      
      case 'operations':
        switch(activeSubsection) {
          case 'checklist':
            return <HousekeepingManager />
          case 'maintenance':
            return <MaintenanceManager />
          case 'nightAudit':
            return <NightAuditSettings />
          default:
            return <OperationsSettings />
        }
      
      case 'staff':
        switch(activeSubsection) {
          case 'users':
            return <UsersManager />
          case 'roles':
            return <RolesManager />
          case 'departments':
            return <DepartmentsManager />
          default:
            return <StaffSettings />
        }
      
      case 'system':
        switch(activeSubsection) {
          case 'general':
            return <GeneralSettings />
          case 'logs':
            return <ActivityLogs />
          case 'backup':
            return <BackupManager />
          case 'integrations':
            return <IntegrationsManager />
          default:
            return <SystemSettings />
        }
      
      case 'channels':
        return <ChannelManager />
      
      default:
        return <SettingsDashboard sections={settingsSections} onNavigate={(id) => { setActiveSection(id); trackUsage(id); }} />
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-50 settings-hub-container" style={{ paddingTop: '80px' }}>
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-[60px] z-30 settings-hub-header">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold">⚙️ Settings Hub</h1>
              <span className="text-gray-500 hidden md:inline">Manage your hotel configuration</span>
            </div>
            
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="🔍 Search settings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 md:w-80 border rounded-lg px-4 py-2 pl-10"
              />
              <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Quick Access - Recently Used */}
        {recentlyUsed.length > 0 && !searchTerm && (() => {
          const uniqueSections = getUniqueRecentlyUsedSections()
          if (uniqueSections.length === 0) return null
          
          return (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4 text-gray-700">⏱️ Recently Used</h2>
              <div className="flex gap-3 flex-wrap">
                {uniqueSections.map(section => (
                  <button
                    key={section.id}
                    onClick={() => {
                      setActiveSection(section.id)
                      trackUsage(section.id)
                    }}
                    className="px-4 py-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border"
                  >
                    <span className="mr-2">{section.icon}</span>
                    <span className="text-sm">{section.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )
        })()}
        
        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm border p-4 sticky top-24">
              <h3 className="font-semibold text-gray-700 mb-4">Categories</h3>
              <nav className="space-y-1">
                {filteredSections.map(section => (
                  <div key={section.id}>
                    <button
                      onClick={() => {
                        setActiveSection(section.id)
                        trackUsage(section.id)
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-3 ${
                        activeSection === section.id
                          ? 'bg-blue-50 text-blue-600 font-medium'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-xl">{section.icon}</span>
                      <span className="text-sm">{section.title}</span>
                    </button>
                    
                    {/* Subsections */}
                    {activeSection === section.id && section.subsections && (
                      <div className="ml-8 mt-1 space-y-1 animate-fadeIn">
                        {section.subsections.map(sub => (
                          <button
                            key={sub.id}
                            onClick={() => handleSubsectionClick(section.id, sub.id)}
                            className={`w-full text-left px-3 py-1.5 text-sm rounded transition-colors ${
                              activeSubsection === sub.id
                                ? 'bg-blue-100 text-blue-700 font-medium'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                          >
                            <span className="mr-2">{sub.icon}</span>
                            {sub.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </nav>
            </div>
          </div>
          
          {/* Content Area */}
          <div className="lg:col-span-9">
            <div className="transition-opacity duration-300">
              {renderSectionContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Settings Dashboard Component
const SettingsDashboard = ({ sections, onNavigate }: { sections: any[]; onNavigate: (id: string) => void }) => {
  const [stats, setStats] = useState({
    rooms: 0,
    staff: 0,
    rates: 0,
    checklist: 0
  })
  
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    // Load stats from localStorage
    const rooms = JSON.parse(localStorage.getItem('hotelRooms') || '[]')
    const staff = JSON.parse(localStorage.getItem('hotelStaff') || '[]')
    const roomTypes = JSON.parse(localStorage.getItem('roomTypes') || '[]')
    const checklist = JSON.parse(localStorage.getItem('housekeepingChecklist') || '[]')
    
    setStats({
      rooms: rooms.length,
      staff: staff.length,
      rates: roomTypes.length,
      checklist: checklist.length
    })
  }, [])
  
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-bold mb-6">Settings Overview</h2>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon="🛏️"
            label="Total Rooms"
            value={stats.rooms.toString()}
            color="blue"
          />
          <StatCard
            icon="👥"
            label="Staff Members"
            value={stats.staff.toString()}
            color="green"
          />
          <StatCard
            icon="💰"
            label="Active Rates"
            value={stats.rates.toString()}
            color="yellow"
          />
          <StatCard
            icon="📋"
            label="Checklist Items"
            value={stats.checklist.toString()}
            color="purple"
          />
        </div>
        
        {/* Quick Actions Grid */}
        <h3 className="font-semibold text-gray-700 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sections.slice(1).map((section: any) => (
            <QuickActionCard
              key={section.id}
              icon={section.icon}
              title={section.title}
              description={section.description}
              color={section.color}
              onClick={() => onNavigate(section.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// Stat Card Component
const StatCard = ({ icon, label, value, color }: {
  icon: string
  label: string
  value: string
  color: string
}) => {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600'
  }
  
  return (
    <div className={`rounded-lg p-4 ${colors[color] || colors.blue}`}>
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm opacity-75">{label}</div>
    </div>
  )
}

// Quick Action Card Component
const QuickActionCard = ({ icon, title, description, color, onClick }: {
  icon: string
  title: string
  description: string
  color: string
  onClick: () => void
}) => {
  return (
    <button
      onClick={onClick}
      className="bg-white border rounded-lg p-4 hover:shadow-md transition-all text-left group hover:scale-105"
    >
      <div className="flex items-start gap-3">
        <div className="text-3xl group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <div>
          <h4 className="font-semibold">{title}</h4>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
    </button>
  )
}

// HotelSettings is imported above

const RoomsSettings = () => (
  <div className="bg-white rounded-lg shadow-sm border p-6">
    <h2 className="text-xl font-bold mb-4">🛏️ Rooms & Inventory</h2>
    <p className="text-gray-600">Rooms settings component will be integrated here</p>
  </div>
)

const OperationsSettings = () => (
  <div className="bg-white rounded-lg shadow-sm border p-6">
    <h2 className="text-xl font-bold mb-4">⚙️ Operations</h2>
    <p className="text-gray-600">Operations settings component will be integrated here</p>
  </div>
)

const StaffSettings = () => (
  <div className="bg-white rounded-lg shadow-sm border p-6">
    <h2 className="text-xl font-bold mb-4">👥 Staff & Access</h2>
    <p className="text-gray-600">Staff settings component will be integrated here</p>
  </div>
)

const SystemSettings = () => (
  <div className="bg-white rounded-lg shadow-sm border p-6">
    <h2 className="text-xl font-bold mb-4">🖥️ System</h2>
    <p className="text-gray-600">System settings component will be integrated here</p>
  </div>
)

// Placeholder components for subsections
const RoomsManager = () => <RoomsSettings />
const RoomTypesManager = () => <RoomsSettings />
const AmenitiesManager = () => <RoomsSettings />

const HousekeepingManager = () => <OperationsSettings />
const MaintenanceManager = () => <OperationsSettings />
const NightAuditSettings = () => <OperationsSettings />

const UsersManager = () => <StaffSettings />
const RolesManager = () => <StaffSettings />
const DepartmentsManager = () => <StaffSettings />

const GeneralSettings = () => <SystemSettings />
const BackupManager = () => <SystemSettings />
const IntegrationsManager = () => <SystemSettings />

const TaxesManager = () => (
  <div className="bg-white rounded-lg shadow-sm border p-6">
    <h2 className="text-xl font-bold mb-4">📊 Taxes & Fees</h2>
    <ChargesSettings defaultTab="taxes" />
  </div>
)