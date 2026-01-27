export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import moment from 'moment'

// GET - Fetch housekeeping reports
export async function GET(request: NextRequest) {
  try {
    const { getOrganizationId, unauthorizedResponse } = await import('@/lib/tenant')
    const organizationId = await getOrganizationId()
    
    if (!organizationId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    
    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type') || 'daily' // daily, weekly, monthly
    const startDate = searchParams.get('startDate') || moment().startOf('day').toISOString()
    const endDate = searchParams.get('endDate') || moment().endOf('day').toISOString()
    
    // Fetch tasks in date range
    const tasks = await prisma.housekeepingTask.findMany({
      where: {
        organizationId,
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    // Calculate statistics
    const stats = {
      total: tasks.length,
      byStatus: {
        pending: tasks.filter(t => t.status === 'pending').length,
        in_progress: tasks.filter(t => t.status === 'in_progress').length,
        completed: tasks.filter(t => t.status === 'completed').length,
        verified: tasks.filter(t => t.status === 'verified').length
      },
      byType: {
        checkout: tasks.filter(t => t.type === 'checkout').length,
        checkin: tasks.filter(t => t.type === 'checkin').length,
        daily: tasks.filter(t => t.type === 'daily').length,
        deep: tasks.filter(t => t.type === 'deep').length,
        turndown: tasks.filter(t => t.type === 'turndown').length,
        inspection: tasks.filter(t => t.type === 'inspection').length
      },
      byPriority: {
        urgent: tasks.filter(t => t.priority === 'urgent').length,
        high: tasks.filter(t => t.priority === 'high').length,
        normal: tasks.filter(t => t.priority === 'normal').length,
        low: tasks.filter(t => t.priority === 'low').length
      },
      completionRate: tasks.length > 0 
        ? ((tasks.filter(t => t.status === 'completed' || t.status === 'verified').length / tasks.length) * 100).toFixed(1)
        : 0,
      verificationRate: tasks.length > 0
        ? ((tasks.filter(t => t.status === 'verified').length / tasks.length) * 100).toFixed(1)
        : 0
    }
    
    // Staff performance
    const staffPerformance: Record<string, {
      assigned: number
      completed: number
      verified: number
      avgCompletionTime: number // minutes
    }> = {}
    
    tasks.forEach(task => {
      const staff = task.assignedTo || 'მიუნიშნებელი'
      if (!staffPerformance[staff]) {
        staffPerformance[staff] = { assigned: 0, completed: 0, verified: 0, avgCompletionTime: 0 }
      }
      staffPerformance[staff].assigned++
      if (task.status === 'completed' || task.status === 'verified') {
        staffPerformance[staff].completed++
      }
      if (task.status === 'verified') {
        staffPerformance[staff].verified++
      }
      
      // Calculate completion time
      const taskData = task.taskData as any
      if (taskData?.startedAt && task.completedAt) {
        const startTime = moment(taskData.startedAt)
        const endTime = moment(task.completedAt)
        const duration = endTime.diff(startTime, 'minutes')
        // Running average
        const prev = staffPerformance[staff].avgCompletionTime
        const count = staffPerformance[staff].completed || 1
        staffPerformance[staff].avgCompletionTime = Math.round((prev * (count - 1) + duration) / count)
      }
    })
    
    // Lost & Found summary
    const lostAndFoundItems: any[] = []
    tasks.forEach(task => {
      const taskData = task.taskData as any
      if (taskData?.lostAndFound && taskData.lostAndFound.length > 0) {
        taskData.lostAndFound.forEach((item: any) => {
          lostAndFoundItems.push({
            ...item,
            roomNumber: task.roomNumber,
            foundBy: task.assignedTo,
            taskId: task.id
          })
        })
      }
    })
    
    // Minibar consumption summary
    let minibarTotal = 0
    const minibarByRoom: Record<string, number> = {}
    const minibarItems: Record<string, { count: number; total: number }> = {}
    
    tasks.forEach(task => {
      const taskData = task.taskData as any
      if (taskData?.minibarItems && taskData.minibarItems.length > 0) {
        taskData.minibarItems.forEach((item: any) => {
          const amount = (item.consumed || 0) * (item.price || 0)
          minibarTotal += amount
          
          minibarByRoom[task.roomNumber] = (minibarByRoom[task.roomNumber] || 0) + amount
          
          if (!minibarItems[item.item]) {
            minibarItems[item.item] = { count: 0, total: 0 }
          }
          minibarItems[item.item].count += item.consumed || 0
          minibarItems[item.item].total += amount
        })
      }
    })
    
    // Daily breakdown (for charts)
    const dailyBreakdown: Record<string, { total: number; completed: number; verified: number }> = {}
    tasks.forEach(task => {
      const date = moment(task.createdAt).format('YYYY-MM-DD')
      if (!dailyBreakdown[date]) {
        dailyBreakdown[date] = { total: 0, completed: 0, verified: 0 }
      }
      dailyBreakdown[date].total++
      if (task.status === 'completed' || task.status === 'verified') {
        dailyBreakdown[date].completed++
      }
      if (task.status === 'verified') {
        dailyBreakdown[date].verified++
      }
    })
    
    return NextResponse.json({
      reportType,
      period: {
        start: startDate,
        end: endDate
      },
      stats,
      staffPerformance,
      lostAndFound: {
        total: lostAndFoundItems.length,
        items: lostAndFoundItems
      },
      minibar: {
        total: minibarTotal,
        byRoom: minibarByRoom,
        byItem: minibarItems
      },
      dailyBreakdown,
      generatedAt: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Error generating housekeeping report:', error)
    return NextResponse.json({ error: 'Failed to generate report', details: error.message }, { status: 500 })
  }
}