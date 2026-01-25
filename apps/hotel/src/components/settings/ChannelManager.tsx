'use client'

import React, { useState, useEffect } from 'react'

interface Channel {
  id: string
  name: string
  type: string
  logo?: string
  description?: string
  connectorType: string
  supportsRates: boolean
  supportsAvailability: boolean
  supportsBookings: boolean
}

interface ChannelConnection {
  id: string
  channelId: string
  channel: Channel
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR' | 'PENDING'
  importUrl?: string
  exportUrl?: string
  lastSyncAt?: string
  lastSyncStatus?: string
  lastSyncError?: string
  isActive: boolean
  _count?: {
    bookings: number
    syncLogs: number
  }
}

interface ChannelBooking {
  id: string
  channelBookingId: string
  checkIn: string
  checkOut: string
  guestName?: string
  status: string
  isProcessed: boolean
  connection: {
    channel: Channel
  }
}

export default function ChannelManager() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [connections, setConnections] = useState<ChannelConnection[]>([])
  const [channelBookings, setChannelBookings] = useState<ChannelBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<string | null>(null)
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
  const [importUrl, setImportUrl] = useState('')
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [channelsRes, connectionsRes, bookingsRes] = await Promise.all([
        fetch('/api/channels'),
        fetch('/api/channels/connections'),
        fetch('/api/channels/bookings?isProcessed=false')
      ])

      if (channelsRes.ok) {
        setChannels(await channelsRes.json())
      }
      if (connectionsRes.ok) {
        setConnections(await connectionsRes.json())
      }
      if (bookingsRes.ok) {
        setChannelBookings(await bookingsRes.json())
      }
    } catch (error) {
      console.error('Error loading channel data:', error)
    }
    setLoading(false)
  }

  const handleAddConnection = async () => {
    if (!selectedChannel) return

    try {
      const res = await fetch('/api/channels/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: selectedChannel.id,
          importUrl: importUrl || undefined
        })
      })

      if (res.ok) {
        setShowAddModal(false)
        setSelectedChannel(null)
        setImportUrl('')
        loadData()
      } else {
        const error = await res.json()
        alert(error.error || 'შეცდომა კავშირის შექმნისას')
      }
    } catch (error) {
      console.error('Error adding connection:', error)
    }
  }

  const handleSync = async (connectionId: string) => {
    setSyncing(connectionId)
    try {
      const res = await fetch('/api/channels/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId, syncType: 'bookings' })
      })

      if (res.ok) {
        const result = await res.json()
        alert(`სინქრონიზაცია დასრულდა: ${result.itemsSucceeded} წარმატებული, ${result.itemsFailed} წარუმატებელი`)
        loadData()
      }
    } catch (error) {
      console.error('Error syncing:', error)
    }
    setSyncing(null)
  }

  const handleDeleteConnection = async (connectionId: string) => {
    if (!confirm('დარწმუნებული ხართ რომ გინდათ კავშირის წაშლა?')) return

    try {
      const res = await fetch(`/api/channels/connections/${connectionId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        loadData()
      }
    } catch (error) {
      console.error('Error deleting connection:', error)
    }
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedUrl(id)
    setTimeout(() => setCopiedUrl(null), 2000)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800'
      case 'ERROR': return 'bg-red-100 text-red-800'
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'აქტიური'
      case 'ERROR': return 'შეცდომა'
      case 'PENDING': return 'მოლოდინში'
      case 'INACTIVE': return 'არააქტიური'
      default: return status
    }
  }

  const getChannelLogo = (type: string) => {
    switch (type) {
      case 'BOOKING_COM': return '🅱️'
      case 'AIRBNB': return '🏠'
      case 'EXPEDIA': return '✈️'
      case 'AGODA': return '🌏'
      case 'ICAL': return '📅'
      default: return '🔗'
    }
  }

  const availableChannels = channels.filter(
    ch => !connections.find(conn => conn.channelId === ch.id)
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">არხების მართვა</h2>
          <p className="text-sm text-gray-500 mt-1">
            დააკავშირეთ Booking.com, Airbnb და სხვა პლატფორმები
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          disabled={availableChannels.length === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <span>➕</span>
          არხის დამატება
        </button>
      </div>

      {/* Active Connections */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="font-medium text-gray-900">აქტიური კავშირები</h3>
        </div>
        
        {connections.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-4xl mb-3">🔗</div>
            <p>ჯერ არ გაქვთ დაკავშირებული არხები</p>
            <p className="text-sm mt-1">დააჭირეთ "არხის დამატება" ღილაკს</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {connections.map((connection) => (
              <div key={connection.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-3xl">
                      {getChannelLogo(connection.channel.type)}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {connection.channel.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(connection.status)}`}>
                          {getStatusText(connection.status)}
                        </span>
                        {connection.lastSyncAt && (
                          <span className="text-xs text-gray-500">
                            ბოლო სინქ: {new Date(connection.lastSyncAt).toLocaleString('ka-GE')}
                          </span>
                        )}
                      </div>
                      {connection.lastSyncError && (
                        <p className="text-xs text-red-600 mt-1">{connection.lastSyncError}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSync(connection.id)}
                      disabled={syncing === connection.id}
                      className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 flex items-center gap-1"
                    >
                      {syncing === connection.id ? (
                        <span className="animate-spin">⟳</span>
                      ) : (
                        <span>🔄</span>
                      )}
                      სინქრონიზაცია
                    </button>
                    <button
                      onClick={() => handleDeleteConnection(connection.id)}
                      className="px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* URLs Section */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Export URL */}
                  {connection.exportUrl && (
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-green-800">
                          📤 Export URL (ჩასვით {connection.channel.name}-ში)
                        </span>
                        <button
                          onClick={() => copyToClipboard(connection.exportUrl!, connection.id + '-export')}
                          className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                        >
                          {copiedUrl === connection.id + '-export' ? '✓ დაკოპირდა' : '📋 კოპირება'}
                        </button>
                      </div>
                      <code className="text-xs text-green-700 break-all block bg-green-100 p-2 rounded">
                        {connection.exportUrl}
                      </code>
                    </div>
                  )}

                  {/* Import URL */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-800">
                        📥 Import URL ({connection.channel.name}-დან)
                      </span>
                    </div>
                    {connection.importUrl ? (
                      <code className="text-xs text-blue-700 break-all block bg-blue-100 p-2 rounded">
                        {connection.importUrl}
                      </code>
                    ) : (
                      <p className="text-xs text-blue-600">არ არის მითითებული</p>
                    )}
                  </div>
                </div>

                {/* Stats */}
                {connection._count && (
                  <div className="mt-4 flex gap-4 text-sm text-gray-500">
                    <span>📥 {connection._count.bookings} იმპორტირებული ჯავშანი</span>
                    <span>📊 {connection._count.syncLogs} სინქრონიზაცია</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Channel Bookings */}
      {channelBookings.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-medium text-gray-900">
              დასამუშავებელი ჯავშნები ({channelBookings.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {channelBookings.slice(0, 5).map((booking) => (
              <div key={booking.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{getChannelLogo(booking.connection.channel.type)}</span>
                  <div>
                    <p className="font-medium text-gray-900">{booking.guestName || 'უცნობი სტუმარი'}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(booking.checkIn).toLocaleDateString('ka-GE')} - {new Date(booking.checkOut).toLocaleDateString('ka-GE')}
                    </p>
                  </div>
                </div>
                <button className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">
                  გადაყვანა ჯავშანში
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6">
        <h3 className="font-medium text-gray-900 mb-4">📚 როგორ მუშაობს iCal სინქრონიზაცია</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4">
            <div className="text-2xl mb-2">1️⃣</div>
            <h4 className="font-medium text-gray-800 mb-1">Export URL</h4>
            <p className="text-sm text-gray-600">
              დააკოპირეთ Export URL და ჩასვით Booking.com/Airbnb-ის კალენდრის სინქრონიზაციის პარამეტრებში
            </p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <div className="text-2xl mb-2">2️⃣</div>
            <h4 className="font-medium text-gray-800 mb-1">Import URL</h4>
            <p className="text-sm text-gray-600">
              აიღეთ iCal URL Booking.com/Airbnb-დან და ჩასვით Import URL-ში არხიდან ჯავშნების მისაღებად
            </p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <div className="text-2xl mb-2">3️⃣</div>
            <h4 className="font-medium text-gray-800 mb-1">სინქრონიზაცია</h4>
            <p className="text-sm text-gray-600">
              კალენდრები ავტომატურად სინქრონიზდება 30 წუთში ერთხელ, ან დააჭირეთ სინქრონიზაციის ღილაკს
            </p>
          </div>
        </div>
      </div>

      {/* Add Channel Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">არხის დამატება</h3>
                <button
                  onClick={() => {
                    setShowAddModal(false)
                    setSelectedChannel(null)
                    setImportUrl('')
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6">
              {!selectedChannel ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 mb-4">აირჩიეთ არხი:</p>
                  {availableChannels.map((channel) => (
                    <button
                      key={channel.id}
                      onClick={() => setSelectedChannel(channel)}
                      className="w-full p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 flex items-center gap-4 text-left transition-colors"
                    >
                      <span className="text-3xl">{getChannelLogo(channel.type)}</span>
                      <div>
                        <p className="font-medium text-gray-900">{channel.name}</p>
                        <p className="text-sm text-gray-500">{channel.description}</p>
                      </div>
                    </button>
                  ))}
                  {availableChannels.length === 0 && (
                    <p className="text-center text-gray-500 py-4">
                      ყველა არხი უკვე დაკავშირებულია
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <span className="text-2xl">{getChannelLogo(selectedChannel.type)}</span>
                    <div>
                      <p className="font-medium">{selectedChannel.name}</p>
                      <p className="text-sm text-gray-500">{selectedChannel.description}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Import URL (არასავალდებულო)
                    </label>
                    <input
                      type="url"
                      value={importUrl}
                      onChange={(e) => setImportUrl(e.target.value)}
                      placeholder="https://www.airbnb.com/calendar/ical/..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      ეს URL მიიღეთ {selectedChannel.name}-დან კალენდრის ექსპორტის სექციიდან
                    </p>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => {
                        setSelectedChannel(null)
                        setImportUrl('')
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      უკან
                    </button>
                    <button
                      onClick={handleAddConnection}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      დაკავშირება
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}