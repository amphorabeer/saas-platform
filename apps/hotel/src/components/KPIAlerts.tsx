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
  
  // Safely handle undefined/null values
  const safeRooms = rooms || []
  const safeReservations = reservations || []
  const safeFolios = folios || []
  
  // Load dismissed alerts from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('dismissedKPIAlerts')
      if (saved) {
        const parsed = JSON.parse(saved)
        // Only keep today's dismissals
        const today = moment().format('YYYY-MM-DD')
        if (parsed.date === today) {
          setDismissedAlerts(parsed.alerts || [])
        }
      }
    } catch (e) {
      console.error('[KPIAlerts] Error loading dismissed alerts:', e)
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
    const totalRooms = safeRooms.length || 1
    
    // Calculate today's occupancy
    const occupiedToday = safeReservations.filter(res => {
      if (['CANCELLED', 'NO_SHOW'].includes(res.status)) return false
      const checkIn = moment(res.checkIn)
      const checkOut = moment(res.checkOut)
      return today.isSameOrAfter(checkIn, 'day') && today.isBefore(checkOut, 'day')
    }).length
    
    const occupancyPercent = Math.round((occupiedToday / totalRooms) * 100)
    
    // Calculate week ahead occupancy
    const weekAhead = Array.from({ length: 7 }, (_, i) => {
      const date = moment().add(i + 1, 'days')
      const occupied = safeReservations.filter(res => {
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
    const todayArrivals = safeReservations.filter(r => 
      moment(r.checkIn).isSame(today, 'day') && r.status === 'CONFIRMED'
    ).length
    
    const todayDepartures = safeReservations.filter(r => 
      moment(r.checkOut).isSame(today, 'day') && r.status === 'CHECKED_IN'
    ).length
    
    // Outstanding balances
    const outstandingBalance = safeFolios
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
    const weekReservations = safeReservations.filter(r => {
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
  }, [safeRooms, safeReservations, safeFolios, dismissedAlerts])
  
  if (alerts.length === 0) {
    // Show compact success message
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-xl">
        <span className="text-xl">✅</span>
        <span className="font-medium">ყველაფერი წესრიგშია!</span>
      </div>
    )
  }
  
  const typeStyles = {
    danger: 'bg-red-100 text-red-700',
    warning: 'bg-yellow-100 text-yellow-700',
    info: 'bg-blue-100 text-blue-700',
    success: 'bg-green-100 text-green-700'
  }
  
  // Show first/most important alert as compact badge
  const firstAlert = alerts[0]
  
  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer hover:opacity-90" 
         style={{ backgroundColor: typeStyles[firstAlert.type].includes('red') ? '#FEE2E2' : 
                                   typeStyles[firstAlert.type].includes('yellow') ? '#FEF3C7' : 
                                   typeStyles[firstAlert.type].includes('blue') ? '#DBEAFE' : '#D1FAE5' }}
         title={firstAlert.message}
    >
      <span className="text-xl">{firstAlert.icon}</span>
      <span className="font-medium text-sm">{firstAlert.title}</span>
      {alerts.length > 1 && (
        <span className="bg-gray-600 text-white text-xs px-1.5 py-0.5 rounded-full">+{alerts.length - 1}</span>
      )}
    </div>
  )
}