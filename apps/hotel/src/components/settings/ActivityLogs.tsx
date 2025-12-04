'use client'

import React, { useState, useEffect } from 'react'
import moment from 'moment'

export default function ActivityLogs() {
  const [logs, setLogs] = useState<any[]>([])
  const [dateFilter, setDateFilter] = useState(moment().format('YYYY-MM-DD'))
  const [filteredLogs, setFilteredLogs] = useState<any[]>([])

  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const allLogs = JSON.parse(localStorage.getItem('activityLogs') || '[]')
    setLogs(allLogs)
  }, [])

  useEffect(() => {
    const filtered = logs.filter((log: any) => 
      moment(log.timestamp).format('YYYY-MM-DD') === dateFilter
    )
    setFilteredLogs(filtered)
  }, [logs, dateFilter])

  const clearLogs = () => {
    if (confirm('Are you sure you want to clear all activity logs? This action cannot be undone.')) {
      localStorage.setItem('activityLogs', '[]')
      setLogs([])
      setFilteredLogs([])
      alert('✅ Activity logs cleared successfully')
    }
  }

  const getLogIcon = (action: string) => {
    if (action.includes('CREATE') || action.includes('ADD')) return '➕'
    if (action.includes('UPDATE') || action.includes('EDIT')) return '✏️'
    if (action.includes('DELETE') || action.includes('REMOVE')) return '🗑️'
    if (action.includes('LOGIN')) return '🔐'
    if (action.includes('PAYMENT')) return '💳'
    if (action.includes('CHECK')) return '✅'
    return '📋'
  }

  const getLogColor = (action: string) => {
    if (action.includes('CREATE') || action.includes('ADD')) return 'text-green-600 bg-green-50'
    if (action.includes('UPDATE') || action.includes('EDIT')) return 'text-blue-600 bg-blue-50'
    if (action.includes('DELETE') || action.includes('REMOVE')) return 'text-red-600 bg-red-50'
    return 'text-gray-600 bg-gray-50'
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold mb-2">📋 Activity Logs</h2>
          <p className="text-gray-600">View system activity and user actions</p>
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="border rounded px-3 py-2"
          />
          <button
            onClick={clearLogs}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Clear Logs
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">{filteredLogs.length}</div>
          <div className="text-sm text-gray-600">Today's Logs</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">{logs.length}</div>
          <div className="text-sm text-gray-600">Total Logs</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-600">
            {new Set(logs.map((l: any) => l.userId || l.user)).size}
          </div>
          <div className="text-sm text-gray-600">Active Users</div>
        </div>
      </div>

      {/* Logs Table */}
      {filteredLogs.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-2">📋</div>
          <p>No activity logs found for {moment(dateFilter).format('MMMM D, YYYY')}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredLogs
                .sort((a: any, b: any) => moment(b.timestamp).valueOf() - moment(a.timestamp).valueOf())
                .map((log: any, idx: number) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      {moment(log.timestamp).format('HH:mm:ss')}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">
                      {log.userName || log.user || 'System'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-2 px-2 py-1 rounded text-xs font-medium ${getLogColor(log.action)}`}>
                        <span>{getLogIcon(log.action)}</span>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {log.details || log.description || '-'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}



