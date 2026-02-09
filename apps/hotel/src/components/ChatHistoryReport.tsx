'use client'

import React, { useState, useEffect } from 'react'
import moment from 'moment'

interface ChatMessage {
  id: string
  sessionId: string
  role: 'user' | 'assistant'
  content: string
  hotelId: string
  createdAt: string
}

interface ChatSession {
  sessionId: string
  messageCount: number
  firstMessage: string
  lastMessage: string
  startedAt: string
  lastMessageAt: string
}

export default function ChatHistoryReport() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'sessions' | 'messages'>('sessions')
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('week')

  // Fetch chat messages
  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch('/api/public/website-chat')
        if (!response.ok) {
          throw new Error('Failed to fetch chat history')
        }
        const data = await response.json()
        const msgs = data.messages || []
        setMessages(msgs)
        
        // Group by sessions
        const sessionMap = new Map<string, ChatMessage[]>()
        msgs.forEach((msg: ChatMessage) => {
          const existing = sessionMap.get(msg.sessionId) || []
          existing.push(msg)
          sessionMap.set(msg.sessionId, existing)
        })
        
        const sessionList: ChatSession[] = []
        sessionMap.forEach((msgs, sessionId) => {
          const sorted = msgs.sort((a, b) => 
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          )
          const userMessages = sorted.filter(m => m.role === 'user')
          sessionList.push({
            sessionId,
            messageCount: msgs.length,
            firstMessage: userMessages[0]?.content?.substring(0, 100) || '-',
            lastMessage: userMessages[userMessages.length - 1]?.content?.substring(0, 100) || '-',
            startedAt: sorted[0]?.createdAt || '',
            lastMessageAt: sorted[sorted.length - 1]?.createdAt || ''
          })
        })
        
        // Sort by last message time (newest first)
        sessionList.sort((a, b) => 
          new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
        )
        
        setSessions(sessionList)
      } catch (err) {
        console.error('[ChatHistory] Error:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    
    fetchMessages()
  }, [])

  // Filter sessions by date
  const filteredSessions = sessions.filter(session => {
    const sessionDate = moment(session.lastMessageAt)
    const now = moment()
    
    switch (dateFilter) {
      case 'today':
        return sessionDate.isSame(now, 'day')
      case 'week':
        return sessionDate.isAfter(now.clone().subtract(7, 'days'))
      case 'month':
        return sessionDate.isAfter(now.clone().subtract(30, 'days'))
      case 'all':
      default:
        return true
    }
  })

  // Get messages for selected session
  const sessionMessages = selectedSession 
    ? messages
        .filter(m => m.sessionId === selectedSession)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    : []

  // Stats
  const totalSessions = filteredSessions.length
  const totalMessages = filteredSessions.reduce((sum, s) => sum + s.messageCount, 0)
  const avgMessagesPerSession = totalSessions > 0 ? Math.round(totalMessages / totalSessions) : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">იტვირთება...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        <p className="font-medium">შეცდომა</p>
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="text-3xl font-bold text-blue-600">{totalSessions}</div>
          <div className="text-sm text-gray-500">სულ საუბრები</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="text-3xl font-bold text-green-600">{totalMessages}</div>
          <div className="text-sm text-gray-500">სულ შეტყობინებები</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="text-3xl font-bold text-purple-600">{avgMessagesPerSession}</div>
          <div className="text-sm text-gray-500">საშუალო შეტყობ./საუბარი</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="text-3xl font-bold text-amber-600">
            {filteredSessions.filter(s => moment(s.lastMessageAt).isSame(moment(), 'day')).length}
          </div>
          <div className="text-sm text-gray-500">დღეს</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">პერიოდი:</span>
            <div className="flex gap-1">
              {[
                { key: 'today', label: 'დღეს' },
                { key: 'week', label: 'კვირა' },
                { key: 'month', label: 'თვე' },
                { key: 'all', label: 'ყველა' }
              ].map(option => (
                <button
                  key={option.key}
                  onClick={() => setDateFilter(option.key as typeof dateFilter)}
                  className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                    dateFilter === option.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sessions List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b">
              <h3 className="font-semibold text-gray-700">💬 საუბრები ({filteredSessions.length})</h3>
            </div>
            <div className="max-h-[600px] overflow-y-auto">
              {filteredSessions.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  საუბრები არ მოიძებნა
                </div>
              ) : (
                filteredSessions.map(session => (
                  <button
                    key={session.sessionId}
                    onClick={() => setSelectedSession(session.sessionId)}
                    className={`w-full text-left p-4 border-b hover:bg-gray-50 transition-colors ${
                      selectedSession === session.sessionId ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs text-gray-400">
                        {moment(session.startedAt).format('DD/MM/YY HH:mm')}
                      </span>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                        {session.messageCount} შეტყობ.
                      </span>
                    </div>
                    <p className="text-sm text-gray-800 line-clamp-2">
                      {session.firstMessage}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
              <h3 className="font-semibold text-gray-700">
                {selectedSession ? '📝 საუბრის დეტალები' : '👈 აირჩიეთ საუბარი'}
              </h3>
              {selectedSession && (
                <span className="text-xs text-gray-400">
                  ID: {selectedSession.substring(0, 20)}...
                </span>
              )}
            </div>
            <div className="max-h-[600px] overflow-y-auto p-4">
              {!selectedSession ? (
                <div className="text-center text-gray-500 py-12">
                  <div className="text-4xl mb-4">💬</div>
                  <p>აირჩიეთ საუბარი მარცხენა სიიდან</p>
                </div>
              ) : sessionMessages.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  შეტყობინებები არ მოიძებნა
                </div>
              ) : (
                <div className="space-y-4">
                  {sessionMessages.map((msg, idx) => (
                    <div
                      key={msg.id || idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                          msg.role === 'user'
                            ? 'bg-blue-600 text-white rounded-br-md'
                            : 'bg-gray-100 text-gray-800 rounded-bl-md'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <p className={`text-xs mt-1 ${
                          msg.role === 'user' ? 'text-blue-200' : 'text-gray-400'
                        }`}>
                          {moment(msg.createdAt).format('HH:mm')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}