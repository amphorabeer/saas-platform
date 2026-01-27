'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import moment from 'moment'
import { NotificationService } from '../services/NotificationService'

interface Task {
  id: string
  roomId?: string
  roomNumber: string
  floor: number
  type: 'checkout' | 'daily' | 'deep' | 'checkin' | 'turndown' | 'inspection'
  status: 'pending' | 'in_progress' | 'completed' | 'verified'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  assignedTo: string
  scheduledTime: string
  startedAt?: string
  completedAt?: string
  notes?: string
  checklist?: ChecklistItem[]
  photosBefore?: string[]
  photosAfter?: string[]
  lostAndFound?: LostItem[]
  minibarItems?: MinibarItem[]
  taskData?: any
}

interface ChecklistItem {
  item: string
  completed: boolean
  required?: boolean
  category?: string
}

interface LostItem {
  id: string
  description: string
  location: string
  photo?: string
  foundAt: string
}

interface MinibarItem {
  item: string
  consumed: number
  price: number
}

interface StaffStats {
  [name: string]: {
    assigned: number
    completed: number
    totalTime: number
    avgTime?: number
  }
}

export default function HousekeepingView({ rooms, onRoomStatusUpdate }: any) {
  // State
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFloor, setSelectedFloor] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedDate, setSelectedDate] = useState<string>(moment().format('YYYY-MM-DD'))
  const [selectedStaff, setSelectedStaff] = useState('all')
  
  const [showAddTask, setShowAddTask] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showTaskDetails, setShowTaskDetails] = useState(false)
  const [showStaffStats, setShowStaffStats] = useState(false)
  const [showReports, setShowReports] = useState(false)
  const [reportData, setReportData] = useState<any>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportPeriod, setReportPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  
  const [staff, setStaff] = useState<any[]>([])
  const [staffStats, setStaffStats] = useState<StaffStats>({})
  const [defaultChecklist, setDefaultChecklist] = useState<ChecklistItem[]>([])
  
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    verified: 0
  })
  
  // Photo upload refs
  const photoBeforeRef = useRef<HTMLInputElement>(null)
  const photoAfterRef = useRef<HTMLInputElement>(null)

  // Load checklist from Settings/API
  const loadChecklist = async () => {
    try {
      const response = await fetch('/api/hotel/housekeeping-checklist')
      if (response.ok) {
        const items = await response.json()
        const formatted = items.map((item: any) => ({
          item: item.name || item.task || item.item,
          completed: false,
          required: item.isRequired || false,
          category: item.category || 'ზოგადი'
        }))
        setDefaultChecklist(formatted)
        return formatted
      }
    } catch (error) {
      console.error('[Housekeeping] Error loading checklist:', error)
    }
    
    // Fallback to localStorage
    const saved = localStorage.getItem('housekeepingChecklist')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        const formatted = parsed.map((item: any) => ({
          item: item.task || item.item || item.name || item,
          completed: false,
          required: item.required || false,
          category: item.category || 'ზოგადი'
        }))
        setDefaultChecklist(formatted)
        return formatted
      } catch (e) {
        console.error('Error parsing checklist:', e)
      }
    }
    return []
  }

  // Load staff
  const loadStaff = async () => {
    // Try API first
    try {
      const response = await fetch('/api/hotel/staff')
      if (response.ok) {
        const data = await response.json()
        const allStaff = data.staff || data || []
        
        const housekeepingStaff = allStaff.filter((s: any) => {
          const dept = String(s.department || '').toLowerCase()
          const pos = String(s.position || '').toLowerCase()
          return dept === 'housekeeping' || dept === 'დასუფთავება' || 
                 pos.includes('housekeeper') || pos.includes('დამლაგებელი')
        })
        
        const staffToUse = housekeepingStaff.length > 0 ? housekeepingStaff : allStaff.filter((s: any) => s.active !== false)
        
        const formatted = staffToUse.map((s: any) => ({
          id: s.id,
          name: s.firstName && s.lastName ? `${s.firstName} ${s.lastName}` : s.name || 'Unknown',
          position: s.position || 'Housekeeper',
          department: s.department || 'housekeeping'
        }))
        
        setStaff(formatted)
        console.log('[Housekeeping] Staff loaded from API:', formatted.length)
        return
      }
    } catch (error) {
      console.error('[Housekeeping] API error, falling back to localStorage:', error)
    }
    
    // Fallback to localStorage
    const savedStaff = JSON.parse(localStorage.getItem('hotelStaff') || '[]')
    const housekeepingStaff = savedStaff.filter((s: any) => {
      const dept = String(s.department || '').toLowerCase()
      const pos = String(s.position || '').toLowerCase()
      return dept === 'housekeeping' || dept === 'დასუფთავება' || 
             pos.includes('housekeeper') || pos.includes('დამლაგებელი')
    })
    
    const staffToUse = housekeepingStaff.length > 0 ? housekeepingStaff : savedStaff.filter((s: any) => s.active !== false)
    
    const formatted = staffToUse.map((s: any) => ({
      id: s.id,
      name: s.firstName && s.lastName ? `${s.firstName} ${s.lastName}` : s.name || 'Unknown',
      position: s.position || 'Housekeeper',
      department: s.department || 'housekeeping'
    }))
    
    setStaff(formatted)
    console.log('[Housekeeping] Staff loaded from localStorage:', formatted.length)
  }

  // Load tasks from API
  const loadTasks = useCallback(async () => {
    setLoading(true)
    try {
      // First load ALL tasks for the date (for stats)
      const statsParams = new URLSearchParams()
      if (selectedDate) statsParams.append('date', selectedDate)
      
      const statsResponse = await fetch(`/api/hotel/housekeeping/tasks?${statsParams}`)
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData.stats || { total: 0, pending: 0, inProgress: 0, completed: 0, verified: 0 })
        setStaffStats(statsData.staffStats || {})
        
        // Transform ALL tasks
        const allTasks = (statsData.tasks || []).map((t: any) => ({
          id: t.id,
          roomId: t.taskData?.roomId,
          roomNumber: t.roomNumber,
          floor: t.taskData?.floor || getRoomFloor(t.roomNumber),
          type: t.taskType || 'cleaning',
          status: t.status,
          priority: t.priority || 'normal',
          assignedTo: t.assignedTo || '',
          scheduledTime: t.taskData?.scheduledTime || '',
          startedAt: t.taskData?.startedAt,
          completedAt: t.completedAt,
          notes: t.notes,
          checklist: t.taskData?.checklist || [],
          photosBefore: t.taskData?.photosBefore || [],
          photosAfter: t.taskData?.photosAfter || [],
          lostAndFound: t.taskData?.lostAndFound || [],
          minibarItems: t.taskData?.minibarItems || [],
          taskData: t.taskData
        }))
        
        setTasks(allTasks)
      } else {
        // Fallback to localStorage
        loadTasksFromLocalStorage()
      }
    } catch (error) {
      console.error('[Housekeeping] API error, falling back to localStorage:', error)
      loadTasksFromLocalStorage()
    }
    setLoading(false)
  }, [selectedDate])

  // Fallback: Load from localStorage
  const loadTasksFromLocalStorage = () => {
    const saved = localStorage.getItem('housekeepingTasks')
    if (saved) {
      const allTasks = JSON.parse(saved)
      // Filter by date
      const filtered = allTasks.filter((t: Task) => {
        const taskDate = t.startedAt || t.completedAt || moment().format()
        return moment(taskDate).format('YYYY-MM-DD') === selectedDate
      })
      setTasks(filtered)
      
      // Calculate stats
      setStats({
        total: filtered.length,
        pending: filtered.filter((t: Task) => t.status === 'pending').length,
        inProgress: filtered.filter((t: Task) => t.status === 'in_progress').length,
        completed: filtered.filter((t: Task) => t.status === 'completed').length,
        verified: filtered.filter((t: Task) => t.status === 'verified').length
      })
    }
  }

  // Save task to API
  const saveTask = async (task: Task) => {
    try {
      const response = await fetch('/api/hotel/housekeeping/tasks', {
        method: task.id.startsWith('task-') ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: task.id.startsWith('task-') ? undefined : task.id,
          roomNumber: task.roomNumber,
          type: task.type,
          status: task.status,
          assignedTo: task.assignedTo,
          priority: task.priority,
          notes: task.notes,
          floor: task.floor,
          roomId: task.roomId,
          checklist: task.checklist,
          scheduledTime: task.scheduledTime,
          startedAt: task.startedAt,
          completedAt: task.completedAt,
          photosBefore: task.photosBefore,
          photosAfter: task.photosAfter,
          lostAndFound: task.lostAndFound,
          minibarItems: task.minibarItems
        })
      })
      
      if (response.ok) {
        await loadTasks()
        return true
      }
    } catch (error) {
      console.error('[Housekeeping] Error saving task:', error)
    }
    
    // Fallback: save to localStorage
    const allTasks = JSON.parse(localStorage.getItem('housekeepingTasks') || '[]')
    const idx = allTasks.findIndex((t: Task) => t.id === task.id)
    if (idx >= 0) {
      allTasks[idx] = task
    } else {
      allTasks.push(task)
    }
    localStorage.setItem('housekeepingTasks', JSON.stringify(allTasks))
    loadTasksFromLocalStorage()
    return true
  }

  // Get floor from room number
  const getRoomFloor = (roomNumber: string): number => {
    const room = rooms?.find((r: any) => r.roomNumber === roomNumber || r.number === roomNumber)
    if (room?.floor) return room.floor
    const match = roomNumber.match(/^(\d+)/)
    if (match) return Math.floor(parseInt(match[1]) / 100)
    return 1
  }

  // Auto-create tasks for checkout rooms
  const checkForCheckouts = useCallback(async () => {
    if (!rooms || rooms.length === 0) return
    
    const checkoutRooms = rooms.filter((r: any) => r.status === 'CHECKOUT')
    const checklist = defaultChecklist.length > 0 ? defaultChecklist : await loadChecklist()
    
    for (const room of checkoutRooms) {
      const existing = tasks.find(t => 
        t.roomNumber === room.roomNumber && 
        t.type === 'checkout' && 
        t.status === 'pending'
      )
      
      if (!existing) {
        const newTask: Task = {
          id: `task-${Date.now()}-${room.id}`,
          roomId: room.id,
          roomNumber: room.roomNumber,
          floor: room.floor || getRoomFloor(room.roomNumber),
          type: 'checkout',
          status: 'pending',
          priority: 'high',
          assignedTo: '',
          scheduledTime: moment().format('HH:mm'),
          checklist: checklist.map((c: ChecklistItem) => ({ ...c, completed: false })),
          photosBefore: [],
          photosAfter: [],
          lostAndFound: [],
          minibarItems: []
        }
        
        await saveTask(newTask)
      }
    }
  }, [rooms, tasks, defaultChecklist])

  // Initial load
  useEffect(() => {
    loadChecklist()
    loadStaff()
  }, [])

  // Load tasks when filters change
  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  // Check for checkouts when rooms change
  useEffect(() => {
    if (rooms && tasks.length >= 0) {
      checkForCheckouts()
    }
  }, [rooms])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(loadTasks, 30000)
    return () => clearInterval(interval)
  }, [loadTasks])

  // Task Actions
  const startTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    
    const updated = {
      ...task,
      status: 'in_progress' as const,
      startedAt: moment().toISOString()
    }
    
    await saveTask(updated)
    
    // Update room status
    if (onRoomStatusUpdate && task.roomId) {
      onRoomStatusUpdate(task.roomId, 'CLEANING')
    }
  }

  const completeTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    
    // Check if all required items are completed
    const requiredIncomplete = task.checklist?.filter(c => c.required && !c.completed)
    if (requiredIncomplete && requiredIncomplete.length > 0) {
      alert(`⚠️ შეასრულეთ სავალდებულო დავალებები:\n${requiredIncomplete.map(c => `• ${c.item}`).join('\n')}`)
      return
    }
    
    const updated = {
      ...task,
      status: 'completed' as const,
      completedAt: moment().toISOString()
    }
    
    await saveTask(updated)
    
    // Send notification
    NotificationService.notifyTaskCompleted({
      roomNumber: task.roomNumber,
      taskType: task.type === 'checkout' ? 'Check-out დასუფთავება' :
                task.type === 'checkin' ? 'Check-in მომზადება' :
                task.type === 'deep' ? 'ღრმა დასუფთავება' : 'დასუფთავება',
      completedBy: task.assignedTo
    })
  }

  const verifyTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    
    const updated = {
      ...task,
      status: 'verified' as const
    }
    
    await saveTask(updated)
    
    // Update room status to VACANT
    if (onRoomStatusUpdate && task.roomId) {
      onRoomStatusUpdate(task.roomId, 'VACANT')
    }
    
    // Send notification - room ready
    NotificationService.notifyRoomReady({
      roomNumber: task.roomNumber
    })
    
    alert('✅ დასუფთავება შემოწმებულია!\n🟢 ოთახი მზადაა.')
  }

  const assignTask = async (taskId: string, staffName: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    
    const updated = { ...task, assignedTo: staffName }
    await saveTask(updated)
    setShowAssignModal(false)
    setSelectedTask(null)
  }

  const updateChecklist = async (taskId: string, itemIndex: number) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task || !task.checklist) return
    
    const newChecklist = [...task.checklist]
    newChecklist[itemIndex].completed = !newChecklist[itemIndex].completed
    
    const updated = { ...task, checklist: newChecklist }
    await saveTask(updated)
  }

  // Photo handling
  const handlePhotoUpload = async (taskId: string, type: 'before' | 'after', file: File) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    
    // Convert to base64
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result as string
      
      const updated = { ...task }
      if (type === 'before') {
        updated.photosBefore = [...(task.photosBefore || []), base64]
      } else {
        updated.photosAfter = [...(task.photosAfter || []), base64]
      }
      
      await saveTask(updated)
    }
    reader.readAsDataURL(file)
  }

  // Lost & Found
  const addLostItem = async (taskId: string, item: Omit<LostItem, 'id' | 'foundAt'>) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    
    const lostItem: LostItem = {
      id: `lost-${Date.now()}`,
      ...item,
      foundAt: moment().toISOString()
    }
    
    const updated = {
      ...task,
      lostAndFound: [...(task.lostAndFound || []), lostItem]
    }
    
    await saveTask(updated)
    
    // Send notification to reception
    NotificationService.notifyLostFound({
      roomNumber: task.roomNumber,
      description: item.description,
      location: item.location,
      foundBy: task.assignedTo
    })
  }

  // Minibar
  const addMinibarItem = async (taskId: string, item: MinibarItem) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    
    const updated = {
      ...task,
      minibarItems: [...(task.minibarItems || []), item]
    }
    
    await saveTask(updated)
    
    // Send notification about minibar consumption
    const allItems = updated.minibarItems || []
    const total = allItems.reduce((sum, i) => sum + (i.consumed * i.price), 0)
    NotificationService.notifyMinibar({
      roomNumber: task.roomNumber,
      items: allItems,
      total
    })
  }

  // Load housekeeping report
  const loadReport = async (period: 'daily' | 'weekly' | 'monthly') => {
    setReportLoading(true)
    setReportPeriod(period)
    
    try {
      let startDate: string, endDate: string
      
      if (period === 'daily') {
        startDate = moment(selectedDate).startOf('day').toISOString()
        endDate = moment(selectedDate).endOf('day').toISOString()
      } else if (period === 'weekly') {
        startDate = moment(selectedDate).startOf('week').toISOString()
        endDate = moment(selectedDate).endOf('week').toISOString()
      } else {
        startDate = moment(selectedDate).startOf('month').toISOString()
        endDate = moment(selectedDate).endOf('month').toISOString()
      }
      
      const response = await fetch(`/api/hotel/housekeeping/reports?type=${period}&startDate=${startDate}&endDate=${endDate}`)
      
      if (response.ok) {
        const data = await response.json()
        setReportData(data)
      } else {
        console.error('Failed to load report')
      }
    } catch (error) {
      console.error('Error loading report:', error)
    } finally {
      setReportLoading(false)
    }
  }

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    if (selectedFloor !== 'all' && task.floor !== parseInt(selectedFloor)) return false
    if (selectedStatus !== 'all' && task.status !== selectedStatus) return false
    if (selectedStaff !== 'all' && task.assignedTo !== selectedStaff) return false
    return true
  })

  // Sort: pending first, then by priority
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const statusOrder = { pending: 0, in_progress: 1, completed: 2, verified: 3 }
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 }
    
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status]
    }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })

  // Get task color
  const getTaskColor = (task: Task) => {
    if (task.status === 'verified') return 'bg-gray-100 border-gray-400'
    if (task.status === 'completed') return 'bg-green-100 border-green-500'
    if (task.status === 'in_progress') return 'bg-yellow-100 border-yellow-500'
    if (task.priority === 'urgent') return 'bg-red-100 border-red-500'
    if (task.priority === 'high') return 'bg-orange-100 border-orange-500'
    return 'bg-blue-100 border-blue-500'
  }

  // Get unique floors from rooms
  const floors = [...new Set(rooms?.map((r: any) => r.floor || 1) || [1, 2, 3])].sort()

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold">🧹 დასუფთავების მართვა</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setShowReports(true); loadReport('daily') }}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 text-sm"
          >
            📈 რეპორტები
          </button>
          <button
            onClick={() => setShowStaffStats(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 text-sm"
          >
            📊 თანამშრომლები
          </button>
          <button
            onClick={loadTasks}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 text-sm"
          >
            🔄 განახლება
          </button>
          <button
            onClick={() => setShowAddTask(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
          >
            + ახალი დავალება
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-gray-500 text-sm">სულ</div>
        </div>
        <div className="bg-blue-50 rounded-lg shadow p-4 text-center cursor-pointer hover:bg-blue-100"
             onClick={() => setSelectedStatus('pending')}>
          <div className="text-2xl font-bold text-blue-600">{stats.pending}</div>
          <div className="text-gray-500 text-sm">მოლოდინში</div>
        </div>
        <div className="bg-yellow-50 rounded-lg shadow p-4 text-center cursor-pointer hover:bg-yellow-100"
             onClick={() => setSelectedStatus('in_progress')}>
          <div className="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
          <div className="text-gray-500 text-sm">მიმდინარე</div>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-4 text-center cursor-pointer hover:bg-green-100"
             onClick={() => setSelectedStatus('completed')}>
          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          <div className="text-gray-500 text-sm">დასრულებული</div>
        </div>
        <div className="bg-gray-50 rounded-lg shadow p-4 text-center cursor-pointer hover:bg-gray-100"
             onClick={() => setSelectedStatus('verified')}>
          <div className="text-2xl font-bold text-gray-600">{stats.verified}</div>
          <div className="text-gray-500 text-sm">შემოწმებული</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4 bg-white p-3 rounded-lg shadow">
        {/* Date Filter */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">თარიღი</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          />
        </div>
        
        {/* Quick Date Buttons */}
        <div className="flex items-end gap-1">
          <button
            onClick={() => setSelectedDate(moment().subtract(1, 'day').format('YYYY-MM-DD'))}
            className={`px-3 py-2 rounded text-sm ${
              selectedDate === moment().subtract(1, 'day').format('YYYY-MM-DD')
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            გუშინ
          </button>
          <button
            onClick={() => setSelectedDate(moment().format('YYYY-MM-DD'))}
            className={`px-3 py-2 rounded text-sm ${
              selectedDate === moment().format('YYYY-MM-DD')
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            დღეს
          </button>
          <button
            onClick={() => setSelectedDate(moment().add(1, 'day').format('YYYY-MM-DD'))}
            className={`px-3 py-2 rounded text-sm ${
              selectedDate === moment().add(1, 'day').format('YYYY-MM-DD')
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            ხვალ
          </button>
        </div>

        {/* Floor Filter */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">სართული</label>
          <select
            value={selectedFloor}
            onChange={(e) => setSelectedFloor(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="all">ყველა</option>
            {floors.map(f => (
              <option key={f} value={f}>სართული {f}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">სტატუსი</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="all">ყველა</option>
            <option value="pending">მოლოდინში</option>
            <option value="in_progress">მიმდინარე</option>
            <option value="completed">დასრულებული</option>
            <option value="verified">შემოწმებული</option>
          </select>
        </div>

        {/* Staff Filter */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">თანამშრომელი</label>
          <select
            value={selectedStaff}
            onChange={(e) => setSelectedStaff(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="all">ყველა</option>
            <option value="">დანიშნული არ არის</option>
            {staff.map(s => (
              <option key={s.id} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Clear Filters */}
        <div className="flex items-end">
          <button
            onClick={() => {
              setSelectedFloor('all')
              setSelectedStatus('all')
              setSelectedStaff('all')
              setSelectedDate(moment().format('YYYY-MM-DD'))
            }}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            ფილტრების გასუფთავება
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin text-4xl">🔄</div>
          <p className="text-gray-500 mt-2">იტვირთება...</p>
        </div>
      )}

      {/* Tasks Grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedTasks.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-lg shadow">
              <div className="text-4xl mb-2">🧹</div>
              <p>დავალებები არ მოიძებნა</p>
              <p className="text-sm mt-1">აირჩიეთ სხვა თარიღი ან დაამატეთ ახალი დავალება</p>
            </div>
          ) : (
            sortedTasks.map(task => (
              <div
                key={task.id}
                className={`border-2 rounded-lg p-4 ${getTaskColor(task)} cursor-pointer hover:shadow-lg transition-shadow`}
                onClick={() => {
                  setSelectedTask(task)
                  setShowTaskDetails(true)
                }}
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-bold text-lg">🚪 {task.roomNumber}</div>
                    <div className="text-sm text-gray-600">სართული {task.floor}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      task.priority === 'urgent' ? 'bg-red-500 text-white' :
                      task.priority === 'high' ? 'bg-orange-500 text-white' :
                      task.priority === 'normal' ? 'bg-blue-500 text-white' :
                      'bg-gray-500 text-white'
                    }`}>
                      {task.priority === 'urgent' ? '🔥 სასწრაფო' :
                       task.priority === 'high' ? '⚡ მაღალი' :
                       task.priority === 'normal' ? 'ჩვეულებრივი' : 'დაბალი'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {task.type === 'checkout' ? 'Check-out' :
                       task.type === 'checkin' ? 'Check-in' :
                       task.type === 'daily' ? 'ყოველდღიური' :
                       task.type === 'deep' ? 'ღრმა' :
                       task.type === 'turndown' ? 'Turndown' : 'შემოწმება'}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="text-sm mb-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">👤</span>
                    {task.assignedTo ? (
                      <span className="font-medium text-green-700">{task.assignedTo}</span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedTask(task)
                          setShowAssignModal(true)
                        }}
                        className="text-blue-600 underline hover:text-blue-800 text-sm"
                      >
                        დანიშვნა
                      </button>
                    )}
                  </div>
                  {task.scheduledTime && (
                    <div className="text-gray-600">🕐 {task.scheduledTime}</div>
                  )}
                  {task.startedAt && (
                    <div className="text-gray-600">▶️ {moment(task.startedAt).format('HH:mm')}</div>
                  )}
                  {task.completedAt && (
                    <div className="text-gray-600">✓ {moment(task.completedAt).format('HH:mm')}</div>
                  )}
                </div>

                {/* Checklist Progress */}
                {task.checklist && task.checklist.length > 0 && (
                  <div className="mb-3">
                    <div className="flex justify-between items-center text-sm mb-1">
                      <span className="font-medium">Checklist</span>
                      <span className="text-gray-500">
                        {task.checklist.filter(c => c.completed).length}/{task.checklist.length}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ 
                          width: `${(task.checklist.filter(c => c.completed).length / task.checklist.length) * 100}%` 
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Photos/Lost&Found indicators */}
                <div className="flex gap-2 mb-3 text-xs">
                  {task.photosBefore && task.photosBefore.length > 0 && (
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                      📷 {task.photosBefore.length}
                    </span>
                  )}
                  {task.photosAfter && task.photosAfter.length > 0 && (
                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">
                      📷✓ {task.photosAfter.length}
                    </span>
                  )}
                  {task.lostAndFound && task.lostAndFound.length > 0 && (
                    <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                      🔍 {task.lostAndFound.length}
                    </span>
                  )}
                  {task.minibarItems && task.minibarItems.length > 0 && (
                    <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                      🍫 {task.minibarItems.length}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  {task.status === 'pending' && (
                    <button
                      onClick={() => startTask(task.id)}
                      className="flex-1 bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700"
                    >
                      ▶️ დაწყება
                    </button>
                  )}
                  {task.status === 'in_progress' && (
                    <button
                      onClick={() => completeTask(task.id)}
                      className="flex-1 bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700"
                    >
                      ✓ დასრულება
                    </button>
                  )}
                  {task.status === 'completed' && (
                    <button
                      onClick={() => verifyTask(task.id)}
                      className="flex-1 bg-purple-600 text-white px-3 py-1.5 rounded text-sm hover:bg-purple-700"
                    >
                      🔍 შემოწმება
                    </button>
                  )}
                  {task.status === 'verified' && (
                    <div className="flex-1 text-center text-green-700 font-semibold py-1.5">
                      ✓ შემოწმებული
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Task Details Modal */}
      {showTaskDetails && selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          onClose={() => {
            setShowTaskDetails(false)
            setSelectedTask(null)
          }}
          onUpdate={async (updated) => {
            await saveTask(updated)
            setShowTaskDetails(false)
            setSelectedTask(null)
          }}
          onChecklist={updateChecklist}
          onPhotoUpload={handlePhotoUpload}
          onAddLostItem={addLostItem}
          onAddMinibar={addMinibarItem}
        />
      )}

      {/* Assign Modal */}
      {showAssignModal && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold mb-4">👤 თანამშრომლის დანიშვნა</h3>
            <p className="text-sm text-gray-600 mb-4">ოთახი {selectedTask.roomNumber}</p>
            
            {staff.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                <p>თანამშრომლები არ მოიძებნა</p>
                <p className="text-sm mt-2">დაამატეთ პარამეტრებში</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {staff.map(s => (
                  <button
                    key={s.id}
                    onClick={() => assignTask(selectedTask.id, s.name)}
                    className="w-full p-3 text-left border rounded hover:bg-blue-50 flex justify-between items-center"
                  >
                    <div>
                      <div className="font-medium">{s.name}</div>
                      <div className="text-sm text-gray-500">{s.position}</div>
                    </div>
                    {staffStats[s.name] && (
                      <div className="text-sm text-gray-500">
                        {staffStats[s.name].assigned} დავალება
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
            
            <button
              onClick={() => {
                setShowAssignModal(false)
                setSelectedTask(null)
              }}
              className="mt-4 w-full py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              გაუქმება
            </button>
          </div>
        </div>
      )}

      {/* Staff Stats Modal */}
      {showStaffStats && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h3 className="text-lg font-bold mb-4">📊 თანამშრომლების სტატისტიკა</h3>
            <p className="text-sm text-gray-500 mb-4">{moment(selectedDate).format('DD/MM/YYYY')}</p>
            
            {Object.keys(staffStats).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>სტატისტიკა არ არის</p>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(staffStats).map(([name, data]) => (
                  <div key={name} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">{name}</span>
                      <span className={`px-2 py-0.5 rounded text-sm ${
                        data.completed === data.assigned 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {data.completed}/{data.assigned}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${data.assigned > 0 ? (data.completed / data.assigned) * 100 : 0}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>დანიშნული: {data.assigned}</span>
                      <span>დასრულებული: {data.completed}</span>
                      {data.totalTime > 0 && (
                        <span>საშ. დრო: {Math.round(data.totalTime / Math.max(data.completed, 1))} წთ</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <button
              onClick={() => setShowStaffStats(false)}
              className="mt-4 w-full py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              დახურვა
            </button>
          </div>
        </div>
      )}

      {/* Reports Modal */}
      {showReports && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-indigo-600 text-white p-4 flex justify-between items-center">
              <h3 className="text-lg font-bold">📈 დასუფთავების რეპორტები</h3>
              <button onClick={() => setShowReports(false)} className="text-2xl hover:text-indigo-200">×</button>
            </div>
            
            {/* Period Tabs */}
            <div className="flex border-b">
              {['daily', 'weekly', 'monthly'].map((period) => (
                <button
                  key={period}
                  onClick={() => loadReport(period as any)}
                  className={`flex-1 py-3 text-sm font-medium ${
                    reportPeriod === period 
                      ? 'border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50' 
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {period === 'daily' ? '📅 დღიური' : period === 'weekly' ? '📆 კვირის' : '🗓️ თვის'}
                </button>
              ))}
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {reportLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-gray-500">⏳ იტვირთება...</div>
                </div>
              ) : reportData ? (
                <div className="space-y-6">
                  {/* Period Info */}
                  <div className="text-center text-gray-500 text-sm">
                    {moment(reportData.period?.start).format('DD/MM/YYYY')} - {moment(reportData.period?.end).format('DD/MM/YYYY')}
                  </div>
                  
                  {/* Stats Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">{reportData.stats?.total || 0}</div>
                      <div className="text-xs text-gray-500">სულ დავალებები</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">{reportData.stats?.completionRate || 0}%</div>
                      <div className="text-xs text-gray-500">შესრულების მაჩვენებელი</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-purple-600">{reportData.stats?.verificationRate || 0}%</div>
                      <div className="text-xs text-gray-500">შემოწმების მაჩვენებელი</div>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-yellow-600">{reportData.lostAndFound?.total || 0}</div>
                      <div className="text-xs text-gray-500">ნაპოვნი ნივთები</div>
                    </div>
                  </div>
                  
                  {/* By Status */}
                  <div className="bg-white border rounded-lg p-4">
                    <h4 className="font-bold mb-3">სტატუსის მიხედვით</h4>
                    <div className="grid grid-cols-4 gap-2 text-center text-sm">
                      <div className="bg-blue-100 rounded p-2">
                        <div className="font-bold">{reportData.stats?.byStatus?.pending || 0}</div>
                        <div className="text-xs text-gray-500">მოლოდინში</div>
                      </div>
                      <div className="bg-yellow-100 rounded p-2">
                        <div className="font-bold">{reportData.stats?.byStatus?.in_progress || 0}</div>
                        <div className="text-xs text-gray-500">მიმდინარე</div>
                      </div>
                      <div className="bg-green-100 rounded p-2">
                        <div className="font-bold">{reportData.stats?.byStatus?.completed || 0}</div>
                        <div className="text-xs text-gray-500">დასრულებული</div>
                      </div>
                      <div className="bg-gray-100 rounded p-2">
                        <div className="font-bold">{reportData.stats?.byStatus?.verified || 0}</div>
                        <div className="text-xs text-gray-500">შემოწმებული</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* By Type */}
                  <div className="bg-white border rounded-lg p-4">
                    <h4 className="font-bold mb-3">ტიპის მიხედვით</h4>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-center text-sm">
                      {[
                        { key: 'checkout', label: 'Check-out', icon: '🚪' },
                        { key: 'checkin', label: 'Check-in', icon: '🔑' },
                        { key: 'daily', label: 'ყოველდღიური', icon: '🧹' },
                        { key: 'deep', label: 'ღრმა', icon: '🧼' },
                        { key: 'turndown', label: 'Turndown', icon: '🌙' },
                        { key: 'inspection', label: 'შემოწმება', icon: '🔍' }
                      ].map(type => (
                        <div key={type.key} className="bg-gray-50 rounded p-2">
                          <div className="text-lg">{type.icon}</div>
                          <div className="font-bold">{reportData.stats?.byType?.[type.key] || 0}</div>
                          <div className="text-xs text-gray-500">{type.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Staff Performance */}
                  {reportData.staffPerformance && Object.keys(reportData.staffPerformance).length > 0 && (
                    <div className="bg-white border rounded-lg p-4">
                      <h4 className="font-bold mb-3">👥 თანამშრომლების შედეგები</h4>
                      <div className="space-y-2">
                        {Object.entries(reportData.staffPerformance).map(([name, data]: [string, any]) => (
                          <div key={name} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="font-medium">{name}</span>
                            <div className="flex gap-4 text-sm">
                              <span>დანიშნული: <b>{data.assigned}</b></span>
                              <span className="text-green-600">დასრულებული: <b>{data.completed}</b></span>
                              <span className="text-purple-600">შემოწმებული: <b>{data.verified}</b></span>
                              {data.avgCompletionTime > 0 && (
                                <span className="text-gray-500">საშ. დრო: <b>{data.avgCompletionTime} წთ</b></span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Minibar Summary */}
                  {reportData.minibar?.total > 0 && (
                    <div className="bg-white border rounded-lg p-4">
                      <h4 className="font-bold mb-3">🍫 მინიბარის მოხმარება</h4>
                      <div className="text-2xl font-bold text-purple-600 mb-3">
                        სულ: ₾{reportData.minibar.total.toFixed(2)}
                      </div>
                      {reportData.minibar.byItem && Object.keys(reportData.minibar.byItem).length > 0 && (
                        <div className="space-y-1 text-sm">
                          {Object.entries(reportData.minibar.byItem).map(([item, data]: [string, any]) => (
                            <div key={item} className="flex justify-between bg-purple-50 p-2 rounded">
                              <span>{item} × {data.count}</span>
                              <span className="font-medium">₾{data.total.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Lost & Found List */}
                  {reportData.lostAndFound?.items && reportData.lostAndFound.items.length > 0 && (
                    <div className="bg-white border rounded-lg p-4">
                      <h4 className="font-bold mb-3">🔍 ნაპოვნი ნივთები</h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {reportData.lostAndFound.items.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between bg-yellow-50 p-2 rounded text-sm">
                            <div>
                              <span className="font-medium">{item.description}</span>
                              {item.location && <span className="text-gray-500 ml-2">📍 {item.location}</span>}
                            </div>
                            <span className="text-gray-500">ოთახი {item.roomNumber}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  მონაცემები არ მოიძებნა
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="border-t p-3 bg-gray-50 flex justify-between items-center">
              <span className="text-xs text-gray-500">
                {reportData?.generatedAt && `გენერირებულია: ${moment(reportData.generatedAt).format('DD/MM/YYYY HH:mm')}`}
              </span>
              <button
                onClick={() => setShowReports(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                დახურვა
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showAddTask && (
        <AddTaskModal
          rooms={rooms}
          checklist={defaultChecklist}
          onClose={() => setShowAddTask(false)}
          onAdd={async (newTask) => {
            const task: Task = {
              ...newTask,
              id: `task-${Date.now()}`,
              status: 'pending',
              photosBefore: [],
              photosAfter: [],
              lostAndFound: [],
              minibarItems: []
            }
            await saveTask(task)
            setShowAddTask(false)
          }}
        />
      )}
    </div>
  )
}

// Task Details Modal Component - Optimized with local state
function TaskDetailsModal({ task, onClose, onUpdate, onChecklist, onPhotoUpload, onAddLostItem, onAddMinibar }: any) {
  // Local state for fast editing - no API calls until save
  const [localTask, setLocalTask] = useState({ ...task })
  const [notes, setNotes] = useState(task.notes || '')
  const [showLostForm, setShowLostForm] = useState(false)
  const [showMinibarForm, setShowMinibarForm] = useState(false)
  const [lostItem, setLostItem] = useState({ description: '', location: '' })
  const [minibarItem, setMinibarItem] = useState({ item: '', consumed: 1, price: 0 })
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  
  const photoBeforeRef = useRef<HTMLInputElement>(null)
  const photoAfterRef = useRef<HTMLInputElement>(null)

  // Toggle checklist item locally (no API call)
  const toggleChecklist = (idx: number) => {
    const newChecklist = [...(localTask.checklist || [])]
    newChecklist[idx] = { ...newChecklist[idx], completed: !newChecklist[idx].completed }
    setLocalTask({ ...localTask, checklist: newChecklist })
    setHasChanges(true)
  }

  // Add photo locally
  const handlePhotoUpload = async (type: 'before' | 'after', file: File) => {
    // Compress image before storing
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      
      // Compress by resizing (optional - limit to 800px width)
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxWidth = 800
        const scale = Math.min(1, maxWidth / img.width)
        canvas.width = img.width * scale
        canvas.height = img.height * scale
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)
        const compressed = canvas.toDataURL('image/jpeg', 0.7)
        
        if (type === 'before') {
          setLocalTask(prev => ({
            ...prev,
            photosBefore: [...(prev.photosBefore || []), compressed]
          }))
        } else {
          setLocalTask(prev => ({
            ...prev,
            photosAfter: [...(prev.photosAfter || []), compressed]
          }))
        }
        setHasChanges(true)
      }
      img.src = base64
    }
    reader.readAsDataURL(file)
  }

  // Remove photo locally
  const removePhoto = (type: 'before' | 'after', idx: number) => {
    if (type === 'before') {
      const newPhotos = [...(localTask.photosBefore || [])]
      newPhotos.splice(idx, 1)
      setLocalTask({ ...localTask, photosBefore: newPhotos })
    } else {
      const newPhotos = [...(localTask.photosAfter || [])]
      newPhotos.splice(idx, 1)
      setLocalTask({ ...localTask, photosAfter: newPhotos })
    }
    setHasChanges(true)
  }

  // Add lost item locally
  const addLostItemLocal = () => {
    if (!lostItem.description) return
    const newItem = {
      id: `lost-${Date.now()}`,
      description: lostItem.description,
      location: lostItem.location,
      foundAt: new Date().toISOString()
    }
    setLocalTask(prev => ({
      ...prev,
      lostAndFound: [...(prev.lostAndFound || []), newItem]
    }))
    setLostItem({ description: '', location: '' })
    setShowLostForm(false)
    setHasChanges(true)
  }

  // Remove lost item locally
  const removeLostItem = (idx: number) => {
    const newItems = [...(localTask.lostAndFound || [])]
    newItems.splice(idx, 1)
    setLocalTask({ ...localTask, lostAndFound: newItems })
    setHasChanges(true)
  }

  // Add minibar item locally
  const addMinibarLocal = () => {
    if (!minibarItem.item) return
    setLocalTask(prev => ({
      ...prev,
      minibarItems: [...(prev.minibarItems || []), { ...minibarItem }]
    }))
    setMinibarItem({ item: '', consumed: 1, price: 0 })
    setShowMinibarForm(false)
    setHasChanges(true)
  }

  // Remove minibar item locally
  const removeMinibarItem = (idx: number) => {
    const newItems = [...(localTask.minibarItems || [])]
    newItems.splice(idx, 1)
    setLocalTask({ ...localTask, minibarItems: newItems })
    setHasChanges(true)
  }

  // Save all changes to server
  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onUpdate({ 
        ...localTask, 
        notes,
        checklist: localTask.checklist,
        photosBefore: localTask.photosBefore,
        photosAfter: localTask.photosAfter,
        lostAndFound: localTask.lostAndFound,
        minibarItems: localTask.minibarItems
      })
      setHasChanges(false)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold">🚪 ოთახი {localTask.roomNumber}</h3>
            <p className="text-sm text-blue-100">
              {localTask.type === 'checkout' ? 'Check-out დასუფთავება' :
               localTask.type === 'checkin' ? 'Check-in მომზადება' :
               localTask.type === 'daily' ? 'ყოველდღიური დასუფთავება' :
               localTask.type === 'deep' ? 'ღრმა დასუფთავება' : 'შემოწმება'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && <span className="text-yellow-300 text-sm">● შეუნახავია</span>}
            <button onClick={onClose} className="text-2xl hover:text-blue-200">×</button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Checklist - Fast local toggle */}
          {localTask.checklist && localTask.checklist.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold">📋 Checklist</h4>
                <button
                  onClick={() => {
                    const allChecked = localTask.checklist.every((c: any) => c.completed)
                    const newChecklist = localTask.checklist.map((c: any) => ({ ...c, completed: !allChecked }))
                    setLocalTask({ ...localTask, checklist: newChecklist })
                    setHasChanges(true)
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  {localTask.checklist.every((c: any) => c.completed) ? 'მოხსნა ყველა' : 'მონიშვნა ყველა'}
                </button>
              </div>
              <div className="bg-gray-50 rounded-lg p-2 max-h-40 overflow-y-auto">
                {localTask.checklist.map((item: ChecklistItem, idx: number) => (
                  <label key={idx} className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-gray-100 px-2 rounded">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => toggleChecklist(idx)}
                      disabled={localTask.status === 'verified'}
                      className="w-5 h-5 cursor-pointer"
                    />
                    <span className={`flex-1 text-sm ${item.completed ? 'line-through text-gray-400' : ''}`}>
                      {item.item}
                      {item.required && <span className="text-red-500 ml-1">*</span>}
                    </span>
                  </label>
                ))}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                ✓ {localTask.checklist.filter((c: ChecklistItem) => c.completed).length}/{localTask.checklist.length}
              </div>
            </div>
          )}

          {/* Photos - With delete option */}
          <div className="grid grid-cols-2 gap-4">
            {/* Before Photos */}
            <div>
              <h4 className="font-bold mb-2 text-sm">📷 ფოტო (მანამდე)</h4>
              <div className="border-2 border-dashed rounded-lg p-2 min-h-[100px]">
                {localTask.photosBefore && localTask.photosBefore.length > 0 ? (
                  <div className="grid grid-cols-2 gap-1">
                    {localTask.photosBefore.map((photo: string, idx: number) => (
                      <div key={idx} className="relative group">
                        <img src={photo} alt={`Before ${idx}`} className="w-full h-16 object-cover rounded" />
                        <button
                          onClick={() => removePhoto('before', idx)}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-xs text-center py-4">ფოტო არ არის</p>
                )}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  ref={photoBeforeRef}
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handlePhotoUpload('before', e.target.files[0])
                      e.target.value = '' // Reset for same file
                    }
                  }}
                />
                <button
                  onClick={() => photoBeforeRef.current?.click()}
                  className="w-full mt-2 px-2 py-1.5 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                  disabled={localTask.status === 'verified'}
                >
                  + დამატება
                </button>
              </div>
            </div>

            {/* After Photos */}
            <div>
              <h4 className="font-bold mb-2 text-sm">📷✓ ფოტო (შემდეგ)</h4>
              <div className="border-2 border-dashed rounded-lg p-2 min-h-[100px]">
                {localTask.photosAfter && localTask.photosAfter.length > 0 ? (
                  <div className="grid grid-cols-2 gap-1">
                    {localTask.photosAfter.map((photo: string, idx: number) => (
                      <div key={idx} className="relative group">
                        <img src={photo} alt={`After ${idx}`} className="w-full h-16 object-cover rounded" />
                        <button
                          onClick={() => removePhoto('after', idx)}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-xs text-center py-4">ფოტო არ არის</p>
                )}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  ref={photoAfterRef}
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handlePhotoUpload('after', e.target.files[0])
                      e.target.value = ''
                    }
                  }}
                />
                <button
                  onClick={() => photoAfterRef.current?.click()}
                  className="w-full mt-2 px-2 py-1.5 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200"
                  disabled={localTask.status === 'verified'}
                >
                  + დამატება
                </button>
              </div>
            </div>
          </div>

          {/* Lost & Found - Simplified */}
          <div className="border rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-bold text-sm">🔍 ნაპოვნი ნივთები ({localTask.lostAndFound?.length || 0})</h4>
              {!showLostForm && localTask.status !== 'verified' && (
                <button
                  onClick={() => setShowLostForm(true)}
                  className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded hover:bg-yellow-200"
                >
                  + დამატება
                </button>
              )}
            </div>
            
            {showLostForm && (
              <div className="bg-yellow-50 p-2 rounded mb-2 space-y-2">
                <input
                  type="text"
                  placeholder="აღწერა *"
                  className="w-full border rounded px-2 py-1.5 text-sm"
                  value={lostItem.description}
                  onChange={(e) => setLostItem({ ...lostItem, description: e.target.value })}
                  autoFocus
                />
                <input
                  type="text"
                  placeholder="მდებარეობა"
                  className="w-full border rounded px-2 py-1.5 text-sm"
                  value={lostItem.location}
                  onChange={(e) => setLostItem({ ...lostItem, location: e.target.value })}
                />
                <div className="flex gap-2">
                  <button
                    onClick={addLostItemLocal}
                    disabled={!lostItem.description}
                    className="flex-1 py-1.5 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600 disabled:bg-gray-300"
                  >
                    ✓ დამატება
                  </button>
                  <button
                    onClick={() => { setShowLostForm(false); setLostItem({ description: '', location: '' }) }}
                    className="px-3 py-1.5 bg-gray-200 rounded text-sm hover:bg-gray-300"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}
            
            {localTask.lostAndFound && localTask.lostAndFound.length > 0 ? (
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {localTask.lostAndFound.map((item: LostItem, idx: number) => (
                  <div key={item.id || idx} className="flex items-center justify-between bg-yellow-50 p-2 rounded text-sm">
                    <div>
                      <span className="font-medium">{item.description}</span>
                      {item.location && <span className="text-gray-500 ml-2">📍 {item.location}</span>}
                    </div>
                    <button
                      onClick={() => removeLostItem(idx)}
                      className="text-red-500 hover:text-red-700 px-2"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : !showLostForm && (
              <p className="text-gray-400 text-xs">ნაპოვნი ნივთები არ არის</p>
            )}
          </div>

          {/* Minibar - Simplified */}
          <div className="border rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-bold text-sm">🍫 მინიბარი ({localTask.minibarItems?.length || 0})</h4>
              {!showMinibarForm && localTask.status !== 'verified' && (
                <button
                  onClick={() => setShowMinibarForm(true)}
                  className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200"
                >
                  + დამატება
                </button>
              )}
            </div>
            
            {showMinibarForm && (
              <div className="bg-purple-50 p-2 rounded mb-2 space-y-2">
                <input
                  type="text"
                  placeholder="პროდუქტი *"
                  className="w-full border rounded px-2 py-1.5 text-sm"
                  value={minibarItem.item}
                  onChange={(e) => setMinibarItem({ ...minibarItem, item: e.target.value })}
                  autoFocus
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="რაოდენობა"
                    className="border rounded px-2 py-1.5 text-sm"
                    value={minibarItem.consumed}
                    min="1"
                    onChange={(e) => setMinibarItem({ ...minibarItem, consumed: parseInt(e.target.value) || 1 })}
                  />
                  <input
                    type="number"
                    placeholder="ფასი"
                    className="border rounded px-2 py-1.5 text-sm"
                    value={minibarItem.price || ''}
                    step="0.01"
                    onChange={(e) => setMinibarItem({ ...minibarItem, price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={addMinibarLocal}
                    disabled={!minibarItem.item}
                    className="flex-1 py-1.5 bg-purple-500 text-white rounded text-sm hover:bg-purple-600 disabled:bg-gray-300"
                  >
                    ✓ დამატება
                  </button>
                  <button
                    onClick={() => { setShowMinibarForm(false); setMinibarItem({ item: '', consumed: 1, price: 0 }) }}
                    className="px-3 py-1.5 bg-gray-200 rounded text-sm hover:bg-gray-300"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}
            
            {localTask.minibarItems && localTask.minibarItems.length > 0 ? (
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {localTask.minibarItems.map((item: MinibarItem, idx: number) => (
                  <div key={idx} className="flex items-center justify-between bg-purple-50 p-2 rounded text-sm">
                    <span>{item.item} × {item.consumed}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">₾{(item.consumed * item.price).toFixed(2)}</span>
                      <button
                        onClick={() => removeMinibarItem(idx)}
                        className="text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
                <div className="text-right font-bold text-sm pt-1 border-t">
                  სულ: ₾{localTask.minibarItems.reduce((sum: number, i: MinibarItem) => sum + i.consumed * i.price, 0).toFixed(2)}
                </div>
              </div>
            ) : !showMinibarForm && (
              <p className="text-gray-400 text-xs">მინიბარის მოხმარება არ არის</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <h4 className="font-bold mb-2 text-sm">📝 შენიშვნები</h4>
            <textarea
              className="w-full border rounded-lg p-2 text-sm"
              rows={2}
              value={notes}
              onChange={(e) => { setNotes(e.target.value); setHasChanges(true) }}
              placeholder="დამატებითი ინფორმაცია..."
              disabled={localTask.status === 'verified'}
            />
          </div>
        </div>

        {/* Footer - Single save button */}
        <div className="border-t p-3 bg-gray-50 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm"
          >
            დახურვა
          </button>
          <button
            onClick={handleSave}
            disabled={localTask.status === 'verified' || isSaving}
            className={`flex-1 py-2 rounded text-white text-sm font-medium ${
              isSaving ? 'bg-gray-400' : hasChanges ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isSaving ? '⏳ ინახება...' : hasChanges ? '💾 შენახვა' : '✓ შენახვა'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Add Task Modal Component
function AddTaskModal({ rooms, checklist, onClose, onAdd }: any) {
  const [formData, setFormData] = useState({
    roomId: '',
    roomNumber: '',
    floor: 1,
    type: 'daily' as Task['type'],
    priority: 'normal' as Task['priority'],
    scheduledTime: '',
    notes: '',
    assignedTo: ''
  })

  const getRoomFloor = (roomNumber: string): number => {
    const room = rooms?.find((r: any) => r.roomNumber === roomNumber)
    if (room?.floor) return room.floor
    const match = roomNumber.match(/^(\d+)/)
    if (match) return Math.floor(parseInt(match[1]) / 100)
    return 1
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">➕ ახალი დავალება</h3>
          <button onClick={onClose} className="text-2xl text-gray-500 hover:text-gray-700">×</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">ოთახი</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={formData.roomId}
              onChange={(e) => {
                const room = rooms.find((r: any) => r.id === e.target.value)
                setFormData({
                  ...formData,
                  roomId: e.target.value,
                  roomNumber: room?.roomNumber || '',
                  floor: room?.floor || getRoomFloor(room?.roomNumber || '')
                })
              }}
            >
              <option value="">აირჩიეთ ოთახი</option>
              {rooms?.map((room: any) => (
                <option key={room.id} value={room.id}>
                  {room.roomNumber} - {room.roomType || room.type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">ტიპი</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as Task['type'] })}
            >
              <option value="daily">ყოველდღიური</option>
              <option value="checkout">Check-out</option>
              <option value="checkin">Check-in</option>
              <option value="deep">ღრმა დასუფთავება</option>
              <option value="turndown">Turndown</option>
              <option value="inspection">შემოწმება</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">პრიორიტეტი</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as Task['priority'] })}
            >
              <option value="low">დაბალი</option>
              <option value="normal">ჩვეულებრივი</option>
              <option value="high">მაღალი</option>
              <option value="urgent">სასწრაფო</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">დაგეგმილი დრო</label>
            <input
              type="time"
              className="w-full border rounded px-3 py-2"
              value={formData.scheduledTime}
              onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">შენიშვნა</label>
            <textarea
              className="w-full border rounded px-3 py-2"
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="დამატებითი ინფორმაცია..."
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2 border rounded hover:bg-gray-50"
          >
            გაუქმება
          </button>
          <button
            onClick={() => {
              if (!formData.roomId) {
                alert('აირჩიეთ ოთახი')
                return
              }
              onAdd({
                ...formData,
                checklist: (formData.type === 'checkout' || formData.type === 'checkin' || formData.type === 'deep')
                  ? checklist.map((c: ChecklistItem) => ({ ...c, completed: false }))
                  : []
              })
            }}
            className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            დამატება
          </button>
        </div>
      </div>
    </div>
  )
}