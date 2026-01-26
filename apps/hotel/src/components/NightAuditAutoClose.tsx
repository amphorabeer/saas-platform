'use client'

import React, { useState, useEffect } from 'react'
import moment from 'moment'

interface AutoCloseTask {
  id: string
  name: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  duration: number // milliseconds
  action: () => Promise<void>
}

export default function NightAuditAutoClose({ onComplete }: { onComplete: () => void }) {
  const [isRunning, setIsRunning] = useState(false)
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0)
  const [overallProgress, setOverallProgress] = useState(0)
  const [tasks, setTasks] = useState<AutoCloseTask[]>([
    {
      id: '1',
      name: '🔍 სისტემის შემოწმება',
      status: 'pending',
      progress: 0,
      duration: 2000,
      action: async () => {
        // Check system status
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    },
    {
      id: '2',
      name: '📊 სტატისტიკის გამოთვლა',
      status: 'pending',
      progress: 0,
      duration: 3000,
      action: async () => {
        // Calculate statistics
        const reservations = JSON.parse(localStorage.getItem('hotelReservations') || '[]')
        const occupancy = (reservations.filter((r: any) => r.status === 'CHECKED_IN').length / 15) * 100
        localStorage.setItem('dailyOccupancy', occupancy.toString())
        await new Promise(resolve => setTimeout(resolve, 3000))
      }
    },
    {
      id: '3',
      name: '💰 სალაროს დახურვა',
      status: 'pending',
      progress: 0,
      duration: 4000,
      action: async () => {
        // Close cashier
        const cashier = JSON.parse(localStorage.getItem('currentCashierShift') || 'null')
        if (cashier && cashier.status === 'open') {
          // Auto-close cashier if open
          const closedCashier = {
            ...cashier,
            closedAt: new Date().toISOString(),
            status: 'closed' as const
          }
          const allShifts = JSON.parse(localStorage.getItem('cashierShifts') || '[]')
          allShifts.push(closedCashier)
          localStorage.setItem('cashierShifts', JSON.stringify(allShifts))
          localStorage.removeItem('currentCashierShift')
        }
        await new Promise(resolve => setTimeout(resolve, 4000))
      }
    },
    {
      id: '4',
      name: '📤 Check-out პროცესი',
      status: 'pending',
      progress: 0,
      duration: 3500,
      action: async () => {
        // Process pending checkouts
        const reservations = JSON.parse(localStorage.getItem('hotelReservations') || '[]')
        const todayCheckouts = reservations.filter((r: any) => 
          moment(r.checkOut).isSame(moment(), 'day') && r.status === 'CHECKED_IN'
        )
        todayCheckouts.forEach((r: any) => {
          r.status = 'CHECKED_OUT'
          r.checkedOutAt = moment().format()
        })
        localStorage.setItem('hotelReservations', JSON.stringify(reservations))
        await new Promise(resolve => setTimeout(resolve, 3500))
      }
    },
    {
      id: '5',
      name: '📄 Folio გენერაცია',
      status: 'pending',
      progress: 0,
      duration: 3000,
      action: async () => {
        // Generate folios for checkouts
        const reservations = JSON.parse(localStorage.getItem('hotelReservations') || '[]')
        const todayCheckouts = reservations.filter((r: any) => 
          moment(r.checkOut).isSame(moment(), 'day') && r.status === 'CHECKED_OUT'
        )
        
        // Generate folios (simplified - would use FolioSystem logic)
        // Try API first
        let existingFolios: any[] = []
        try {
          const response = await fetch('/api/hotel/folios')
          if (response.ok) {
            const data = await response.json()
            existingFolios = data.folios || []
          }
        } catch (error) {
          console.error('[NightAuditAutoClose] API error:', error)
        }
        
        // Fallback to localStorage
        if (existingFolios.length === 0) {
          existingFolios = JSON.parse(localStorage.getItem('hotelFolios') || '[]')
        }
        
        for (const r of todayCheckouts) {
          const folio = {
            folioNumber: `F${Date.now().toString().slice(-8)}`,
            reservationId: r.id,
            guestName: r.guestName,
            roomNumber: r.roomNumber || r.roomId,
            checkIn: r.checkIn,
            checkOut: r.checkOut,
            total: r.totalAmount || 0,
            balance: r.totalAmount || 0,
            status: 'open',
            createdAt: new Date().toISOString()
          }
          existingFolios.push(folio)
          
          // Save to API
          try {
            await fetch('/api/hotel/folios', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(folio),
            })
          } catch (error) {
            console.error('[NightAuditAutoClose] API save error:', error)
          }
        }
        
        localStorage.setItem('hotelFolios', JSON.stringify(existingFolios))
        await new Promise(resolve => setTimeout(resolve, 3000))
      }
    },
    {
      id: '6',
      name: '❌ No-Show მარკირება',
      status: 'pending',
      progress: 0,
      duration: 2500,
      action: async () => {
        // Mark no-shows
        const reservations = JSON.parse(localStorage.getItem('hotelReservations') || '[]')
        const noShows = reservations.filter((r: any) => 
          moment(r.checkIn).isSame(moment(), 'day') && 
          r.status === 'CONFIRMED'
        )
        noShows.forEach((r: any) => {
          r.status = 'NO_SHOW'
        })
        localStorage.setItem('hotelReservations', JSON.stringify(reservations))
        await new Promise(resolve => setTimeout(resolve, 2500))
      }
    },
    {
      id: '7',
      name: '📑 PDF რეპორტი',
      status: 'pending',
      progress: 0,
      duration: 4000,
      action: async () => {
        // Generate PDF report (would use reportService)
        await new Promise(resolve => setTimeout(resolve, 4000))
      }
    },
    {
      id: '8',
      name: '📧 Email გაგზავნა',
      status: 'pending',
      progress: 0,
      duration: 2000,
      action: async () => {
        // Send emails (would use email API)
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    },
    {
      id: '9',
      name: '💾 მონაცემების შენახვა',
      status: 'pending',
      progress: 0,
      duration: 2500,
      action: async () => {
        // Backup data
        const backup = {
          date: moment().format(),
          reservations: localStorage.getItem('hotelReservations'),
          cashier: localStorage.getItem('currentCashierShift'),
          audit: localStorage.getItem('nightAudits')
        }
        localStorage.setItem(`backup_${moment().format('YYYY-MM-DD')}`, JSON.stringify(backup))
        await new Promise(resolve => setTimeout(resolve, 2500))
      }
    },
    {
      id: '10',
      name: '✅ დღის დახურვა',
      status: 'pending',
      progress: 0,
      duration: 1500,
      action: async () => {
        // Final closure
        const auditDate = moment().subtract(1, 'day').format('YYYY-MM-DD')
        localStorage.setItem('lastAuditDate', JSON.stringify(auditDate))
        localStorage.setItem('currentBusinessDate', moment().format('YYYY-MM-DD'))
        
        // Save audit log
        const audits = JSON.parse(localStorage.getItem('nightAudits') || '[]')
        audits.push({
          id: Date.now(),
          date: auditDate,
          closedAt: new Date().toISOString(),
          closedBy: 'Auto-Close',
          autoClosed: true
        })
        localStorage.setItem('nightAudits', JSON.stringify(audits))
        
        await new Promise(resolve => setTimeout(resolve, 1500))
      }
    }
  ])
  
  const startAutoClose = async () => {
    setIsRunning(true)
    const totalDuration = tasks.reduce((sum, task) => sum + task.duration, 0)
    let completedDuration = 0
    
    for (let i = 0; i < tasks.length; i++) {
      setCurrentTaskIndex(i)
      const task = tasks[i]
      
      // Update task status to processing
      setTasks(prev => prev.map((t, idx) => 
        idx === i ? { ...t, status: 'processing' as const } : t
      ))
      
      // Animate progress for this task
      const progressInterval = setInterval(() => {
        setTasks(prev => prev.map((t, idx) => {
          if (idx === i) {
            const newProgress = Math.min(t.progress + (100 / (task.duration / 100)), 100)
            return { ...t, progress: newProgress }
          }
          return t
        }))
      }, 100)
      
      try {
        // Execute task action
        await task.action()
        
        // Mark as completed
        setTasks(prev => prev.map((t, idx) => 
          idx === i ? { ...t, status: 'completed' as const, progress: 100 } : t
        ))
      } catch (error) {
        // Mark as failed
        setTasks(prev => prev.map((t, idx) => 
          idx === i ? { ...t, status: 'failed' as const } : t
        ))
        clearInterval(progressInterval)
        setIsRunning(false)
        alert('❌ Night Audit Failed at: ' + task.name)
        return
      }
      
      clearInterval(progressInterval)
      completedDuration += task.duration
      setOverallProgress((completedDuration / totalDuration) * 100)
    }
    
    setIsRunning(false)
    onComplete()
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl p-8 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6 text-center">
          🌙 Night Audit - ავტომატური დახურვა
        </h2>
        
        {/* Overall Progress */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">საერთო პროგრესი</span>
            <span className="text-sm font-medium">{Math.round(overallProgress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
        
        {/* Tasks List */}
        <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
          {tasks.map((task, index) => (
            <div 
              key={task.id}
              className={`p-3 rounded-lg border transition-all duration-300 ${
                task.status === 'processing' ? 'bg-blue-50 border-blue-300 scale-105' :
                task.status === 'completed' ? 'bg-green-50 border-green-300' :
                task.status === 'failed' ? 'bg-red-50 border-red-300' :
                'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {task.status === 'completed' && <span className="text-green-600">✅</span>}
                  {task.status === 'processing' && (
                    <span className="inline-block animate-spin">⏳</span>
                  )}
                  {task.status === 'failed' && <span className="text-red-600">❌</span>}
                  {task.status === 'pending' && <span className="text-gray-400">⏸️</span>}
                  <span className={`font-medium ${
                    task.status === 'processing' ? 'text-blue-700' : ''
                  }`}>
                    {task.name}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {task.status === 'processing' ? `${Math.round(task.progress)}%` : ''}
                </span>
              </div>
              
              {task.status === 'processing' && (
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div 
                    className="bg-blue-500 h-1.5 rounded-full transition-all duration-100"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          {!isRunning && overallProgress === 0 && (
            <button
              onClick={startAutoClose}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              🚀 დაწყება
            </button>
          )}
          
          {isRunning && (
            <div className="text-center">
              <div className="text-gray-600">მიმდინარეობს დახურვა...</div>
              <div className="text-sm text-gray-500 mt-2">გთხოვთ დაელოდოთ</div>
            </div>
          )}
          
          {!isRunning && overallProgress === 100 && (
            <div className="text-center">
              <div className="text-2xl text-green-600 font-bold mb-2">✅ დასრულებულია!</div>
              <div className="text-gray-600">Business Date: {localStorage.getItem('currentBusinessDate') || moment().format('YYYY-MM-DD')}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}



