export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

// GET - Fetch housekeeping tasks
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
    const date = searchParams.get('date') // YYYY-MM-DD
    const status = searchParams.get('status')
    const assignedTo = searchParams.get('assignedTo')
    const floor = searchParams.get('floor')
    
    // Build where clause
    const where: any = { organizationId }
    
    if (date) {
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)
      where.taskDate = { gte: startOfDay, lte: endOfDay }
    }
    
    if (status && status !== 'all') {
      where.status = status
    }
    
    if (assignedTo) {
      where.assignedTo = assignedTo
    }
    
    const tasks = await prisma.housekeepingTask.findMany({
      where,
      orderBy: [
        { status: 'asc' }, // pending first
        { priority: 'desc' },
        { createdAt: 'desc' }
      ],
    })
    
    // Filter by floor if specified (stored in taskData)
    let filteredTasks = tasks
    if (floor && floor !== 'all') {
      filteredTasks = tasks.filter((t: any) => {
        const data = t.taskData as any
        return data?.floor === parseInt(floor)
      })
    }
    
    // Calculate stats
    const stats = {
      total: filteredTasks.length,
      pending: filteredTasks.filter((t: any) => t.status === 'pending').length,
      inProgress: filteredTasks.filter((t: any) => t.status === 'in_progress').length,
      completed: filteredTasks.filter((t: any) => t.status === 'completed').length,
      verified: filteredTasks.filter((t: any) => t.status === 'verified').length,
    }
    
    // Staff workload
    const staffStats: Record<string, { assigned: number; completed: number; totalTime: number }> = {}
    filteredTasks.forEach((t: any) => {
      if (t.assignedTo) {
        if (!staffStats[t.assignedTo]) {
          staffStats[t.assignedTo] = { assigned: 0, completed: 0, totalTime: 0 }
        }
        staffStats[t.assignedTo].assigned++
        if (t.status === 'verified' || t.status === 'completed') {
          staffStats[t.assignedTo].completed++
          // Calculate time if available
          const data = t.taskData as any
          if (data?.startedAt && t.completedAt) {
            const start = new Date(data.startedAt).getTime()
            const end = new Date(t.completedAt).getTime()
            staffStats[t.assignedTo].totalTime += (end - start) / 60000 // minutes
          }
        }
      }
    })
    
    return NextResponse.json({ 
      tasks: filteredTasks,
      stats,
      staffStats
    })
  } catch (error: any) {
    console.error('Error loading housekeeping tasks:', error)
    return NextResponse.json({ error: 'Failed to load tasks' }, { status: 500 })
  }
}

// POST - Create new task
export async function POST(request: NextRequest) {
  try {
    const { getOrganizationId, unauthorizedResponse } = await import('@/lib/tenant')
    const organizationId = await getOrganizationId()
    
    if (!organizationId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    const data = await request.json()
    
    // Handle bulk create
    if (Array.isArray(data)) {
      const created = await prisma.housekeepingTask.createMany({
        data: data.map((task: any) => ({
          organizationId,
          roomNumber: task.roomNumber,
          taskType: task.type || task.taskType || 'cleaning',
          status: task.status || 'pending',
          assignedTo: task.assignedTo || null,
          priority: task.priority || 'normal',
          notes: task.notes || null,
          taskDate: task.taskDate ? new Date(task.taskDate) : new Date(),
          taskData: {
            floor: task.floor,
            roomId: task.roomId,
            checklist: task.checklist || [],
            scheduledTime: task.scheduledTime,
            photosBefore: [],
            photosAfter: [],
            lostAndFound: [],
            minibarItems: []
          }
        }))
      })
      return NextResponse.json({ success: true, count: created.count })
    }
    
    // Single task
    const task = await prisma.housekeepingTask.create({
      data: {
        organizationId,
        roomNumber: data.roomNumber,
        taskType: data.type || data.taskType || 'cleaning',
        status: data.status || 'pending',
        assignedTo: data.assignedTo || null,
        priority: data.priority || 'normal',
        notes: data.notes || null,
        taskDate: data.taskDate ? new Date(data.taskDate) : new Date(),
        taskData: {
          floor: data.floor,
          roomId: data.roomId,
          checklist: data.checklist || [],
          scheduledTime: data.scheduledTime,
          photosBefore: [],
          photosAfter: [],
          lostAndFound: [],
          minibarItems: []
        }
      }
    })
    
    return NextResponse.json(task)
  } catch (error: any) {
    console.error('Error creating housekeeping task:', error)
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }
}

// PUT - Update task
export async function PUT(request: NextRequest) {
  try {
    const { getOrganizationId, unauthorizedResponse } = await import('@/lib/tenant')
    const organizationId = await getOrganizationId()
    
    if (!organizationId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    const data = await request.json()
    
    if (!data.id) {
      return NextResponse.json({ error: 'Task ID required' }, { status: 400 })
    }
    
    // Verify ownership
    const existing = await prisma.housekeepingTask.findUnique({
      where: { id: data.id }
    })
    
    if (!existing || existing.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }
    
    // Build update data
    const updateData: any = {}
    
    if (data.status) updateData.status = data.status
    if (data.assignedTo !== undefined) updateData.assignedTo = data.assignedTo || null
    if (data.priority) updateData.priority = data.priority
    if (data.notes !== undefined) updateData.notes = data.notes
    if (data.completedAt) updateData.completedAt = new Date(data.completedAt)
    if (data.completedBy) updateData.completedBy = data.completedBy
    
    // Update taskData (merge with existing)
    if (data.taskData || data.checklist || data.photosBefore || data.photosAfter || data.startedAt) {
      const existingData = (existing.taskData as any) || {}
      updateData.taskData = {
        ...existingData,
        ...(data.taskData || {}),
        checklist: data.checklist ?? data.taskData?.checklist ?? existingData.checklist,
        photosBefore: data.photosBefore ?? existingData.photosBefore ?? [],
        photosAfter: data.photosAfter ?? existingData.photosAfter ?? [],
        lostAndFound: data.lostAndFound ?? existingData.lostAndFound ?? [],
        minibarItems: data.minibarItems ?? existingData.minibarItems ?? [],
        startedAt: data.startedAt ?? existingData.startedAt,
      }
    }
    
    const updated = await prisma.housekeepingTask.update({
      where: { id: data.id },
      data: updateData
    })
    
    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Error updating housekeeping task:', error)
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
  }
}

// DELETE - Delete task
export async function DELETE(request: NextRequest) {
  try {
    const { getOrganizationId, unauthorizedResponse } = await import('@/lib/tenant')
    const organizationId = await getOrganizationId()
    
    if (!organizationId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const archiveOld = searchParams.get('archiveOld')
    
    if (archiveOld === 'true') {
      // Archive tasks older than 7 days
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      
      const deleted = await prisma.housekeepingTask.deleteMany({
        where: {
          organizationId,
          status: 'verified',
          completedAt: { lt: sevenDaysAgo }
        }
      })
      
      return NextResponse.json({ success: true, archived: deleted.count })
    }
    
    if (!id) {
      return NextResponse.json({ error: 'Task ID required' }, { status: 400 })
    }
    
    // Verify ownership
    const existing = await prisma.housekeepingTask.findUnique({
      where: { id }
    })
    
    if (!existing || existing.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }
    
    await prisma.housekeepingTask.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting housekeeping task:', error)
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
  }
}