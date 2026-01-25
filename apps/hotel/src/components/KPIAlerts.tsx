'use client'

import React, { useState, useEffect, useMemo } from 'react'
import moment from 'moment'

interface KPIAlertsProps {
  rooms: any[]
  reservations: any[]
  folios?: any[]
}

interface Alert {
  id: string
  type: 'warning' | 'danger' | 'info' | 'success'
  icon: string
  title: string
  message: string
  action?: {
    label: string
    onClick: () => void
  }
}

export default function KPIAlerts({ rooms, reservations, folios = [] }: KPIAlertsProps) {
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([])
  
  // Load dismissed alerts from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('dismissedKPIAlerts')
    if (saved) {
      const parsed = JSON.parse(saved)
      // Only keep today's dismissals
      const today = moment().format('YYYY-MM-DD')
      if (parsed.date === today) {
        setDismissedAlerts(parsed.alerts || [])
      }
    }
  }, [])
  
  const dismissAlert = (alertId: string) => {
    const newDismissed = [...dismissedAlerts, alertId]
    setDismissedAlerts(newDismissed)
    localStorage.setItem('dismissedKPIAlerts', JSON.stringify({
      date: moment().format('YYYY-MM-DD'),
      alerts: newDismissed
    }))
  }
  
  const alerts = useMemo(() => {
    const alertsList: Alert[] = []
    const today = moment()
    const totalRooms = rooms.length || 1
    
    // Calculate today's occupancy
    const occupiedToday = reservations.filter(res => {
      if (['CANCELLED', 'NO_SHOW'].includes(res.status)) return false
      const checkIn = moment(res.checkIn)
      const checkOut = moment(res.checkOut)
      return today.isSameOrAfter(checkIn, 'day') && today.isBefore(checkOut, 'day')
    }).length
    
    const occupancyPercent = Math.round((occupiedToday / totalRooms) * 100)
    
    // Calculate week ahead occupancy
    const weekAhead = Array.from({ length: 7 }, (_, i) => {
      const date = moment().add(i + 1, 'days')
      const occupied = reservations.filter(res => {
        if (['CANCELLED', 'NO_SHOW'].includes(res.status)) return false
        const checkIn = moment(res.checkIn)
        const checkOut = moment(res.checkOut)
        return date.isSameOrAfter(checkIn, 'day') && date.isBefore(checkOut, 'day')
      }).length
      return { date: date.format('DD/MM'), occupied, percentage: Math.round((occupied / totalRooms) * 100) }
    })
    
    const avgWeekOccupancy = Math.round(weekAhead.reduce((sum, d) => sum + d.percentage, 0) / 7)
    const lowOccupancyDays = weekAhead.filter(d => d.percentage < 30)
    
    // Today's arrivals and departures
    const todayArrivals = reservations.filter(r => 
      moment(r.checkIn).isSame(today, 'day') && r.status === 'CONFIRMED'
    ).length
    
    const todayDepartures = reservations.filter(r => 
      moment(r.checkOut).isSame(today, 'day') && r.status === 'CHECKED_IN'
    ).length
    
    // Outstanding balances
    const outstandingBalance = folios
      .filter((f: any) => f.status === 'open' && (f.balance || 0) > 0)
      .reduce((sum: number, f: any) => sum + (f.balance || 0), 0)
    
    // 🔴 DANGER: Very low occupancy today
    if (occupancyPercent < 20) {
      alertsList.push({
        id: 'low-occupancy-critical',
        type: 'danger',
        icon: '🚨',
        title: 'კრიტიკულად დაბალი დატვირთულობა!',
        message: `დღეს მხოლოდ ${occupancyPercent}% დატვირთულობაა (${occupiedToday}/${totalRooms} ოთახი)`
      })
    }
    // 🟡 WARNING: Low occupancy today
    else if (occupancyPercent < 50) {
      alertsList.push({
        id: 'low-occupancy-warning',
        type: 'warning',
        icon: '⚠️',
        title: 'დაბალი დატვირთულობა',
        message: `დღეს ${occupancyPercent}% დატვირთულობაა (${occupiedToday}/${totalRooms} ოთახი)`
      })
    }
    // 🟢 SUCCESS: High occupancy
    else if (occupancyPercent >= 80) {
      alertsList.push({
        id: 'high-occupancy',
        type: 'success',
        icon: '🎉',
        title: 'მაღალი დატვირთულობა!',
        message: `დღეს ${occupancyPercent}% დატვირთულობაა - შესანიშნავია!`
      })
    }
    
    // 🟡 WARNING: Low week ahead occupancy
    if (avgWeekOccupancy < 40 && lowOccupancyDays.length >= 3) {
      alertsList.push({
        id: 'low-week-occupancy',
        type: 'warning',
        icon: '📅',
        title: 'მომავალი კვირა დაბალი',
        message: `მომავალ 7 დღეში საშუალო დატვირთულობა ${avgWeekOccupancy}%-ია. ${lowOccupancyDays.length} დღეს 30%-ზე ნაკლებია.`
      })
    }
    
    // 🔵 INFO: Arrivals today
    if (todayArrivals > 0) {
      alertsList.push({
        id: 'today-arrivals',
        type: 'info',
        icon: '✅',
        title: `დღეს ${todayArrivals} შემოსვლა`,
        message: 'სტუმრები ელიან მიღებას'
      })
    }
    
    // 🔵 INFO: Departures today
    if (todayDepartures > 0) {
      alertsList.push({
        id: 'today-departures',
        type: 'info',
        icon: '📤',
        title: `დღეს ${todayDepartures} გასვლა`,
        message: 'სტუმრები დღეს გაწერენ'
      })
    }
    
    // 🟡 WARNING: Outstanding balances
    if (outstandingBalance > 500) {
      alertsList.push({
        id: 'outstanding-balance',
        type: 'warning',
        icon: '💰',
        title: 'გადაუხდელი ბალანსი',
        message: `₾${outstandingBalance.toLocaleString()} გადასახდელია`
      })
    }
    
    // 🔴 DANGER: No reservations this week
    const weekReservations = reservations.filter(r => {
      const checkIn = moment(r.checkIn)
      return checkIn.isAfter(today) && checkIn.isBefore(moment().add(7, 'days')) && r.status !== 'CANCELLED'
    }).length
    
    if (weekReservations === 0 && occupiedToday === 0) {
      alertsList.push({
        id: 'no-reservations',
        type: 'danger',
        icon: '📉',
        title: 'ჯავშნები არ არის!',
        message: 'მომავალ 7 დღეში არც ერთი ჯავშანი არ არის'
      })
    }
    
    return alertsList.filter(alert => !dismissedAlerts.includes(alert.id))
  }, [rooms, reservations, folios, dismissedAlerts])
  
  if (alerts.length === 0) return null
  
  const typeStyles = {
    danger: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-green-50 border-green-200 text-green-800'
  }
  
  const iconBg = {
    danger: 'bg-red-100',
    warning: 'bg-yellow-100',
    info: 'bg-blue-100',
    success: 'bg-green-100'
  }
  
  return (
    <div className="mb-6 space-y-3">
      <h3 className="text-sm font-medium text-gray-600 flex items-center gap-2">
        🔔 KPI შეტყობინებები
      </h3>
      
      {alerts.map(alert => (
        <div
          key={alert.id}
          className={`${typeStyles[alert.type]} border rounded-xl p-4 flex items-start gap-3 relative group`}
        >
          <div className={`${iconBg[alert.type]} w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0`}>
            <span className="text-xl">{alert.icon}</span>
          </div>
          
          <div className="flex-1">
            <div className="font-medium">{alert.title}</div>
            <div className="text-sm opacity-80">{alert.message}</div>
            
            {alert.action && (
              <button
                onClick={alert.action.onClick}
                className="mt-2 text-sm font-medium underline hover:no-underline"
              >
                {alert.action.label}
              </button>
            )}
          </div>
          
          <button
            onClick={() => dismissAlert(alert.id)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
            title="დახურვა"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}