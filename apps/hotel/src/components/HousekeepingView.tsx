'use client'

import { useState, useEffect } from 'react'
import moment from 'moment'

interface Task {
  id: string
  roomId: string
  roomNumber: string
  floor: number
  type: 'checkout' | 'daily' | 'deep' | 'checkin'
  status: 'pending' | 'in_progress' | 'completed' | 'verified'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  assignedTo: string
  scheduledTime: string
  startedAt?: string
  completedAt?: string
  notes?: string
  checklist?: ChecklistItem[]
}

interface ChecklistItem {
  item: string
  completed: boolean
}

export default function HousekeepingView({ rooms, onRoomStatusUpdate }: any) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedFloor, setSelectedFloor] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [showAddTask, setShowAddTask] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  
  // Load staff from localStorage
  const [staff, setStaff] = useState<any[]>([])
  const [defaultChecklist, setDefaultChecklist] = useState<any[]>([])
  
  useEffect(() => {
    // Load staff from hotelStaff localStorage (same as Settings)
    const loadStaff = () => {
      const savedStaff = JSON.parse(localStorage.getItem('hotelStaff') || '[]')
      
      console.log('🔍 All staff from localStorage:', savedStaff)
      
      // Filter housekeeping department staff - very lenient filter
      const housekeepingStaff = savedStaff.filter((s: any) => {
        // Check if active (include if active is true, undefined, or missing)
        const isActive = s.active !== false && s.active !== 'false' && s.active !== 0
        
        // Check department (case-insensitive, handle various formats)
        const dept = String(s.department || '').toLowerCase().trim()
        const isHousekeepingDept = dept === 'housekeeping' || dept === 'hsk' || dept === 'დასუფთავება'
        
        // Check position (case-insensitive, handle various formats)
        const pos = String(s.position || '').toLowerCase().trim()
        const isHousekeeperPos = 
          pos.includes('housekeeper') || 
          pos === 'housekeeper' || 
          pos === 'დამლაგებელი' ||
          pos === 'დამლაგებელი' ||
          pos.includes('დამლაგებელი')
        
        // Also check if role matches
        const role = String(s.role || '').toLowerCase().trim()
        const isHousekeeperRole = role.includes('housekeeper') || role === 'housekeeper'
        
        const matches = isActive && (isHousekeepingDept || isHousekeeperPos || isHousekeeperRole)
        
        console.log('👤 Staff member check:', {
          id: s.id,
          firstName: s.firstName,
          lastName: s.lastName,
          name: s.name,
          department: s.department,
          position: s.position,
          role: s.role,
          active: s.active,
          isActive,
          isHousekeepingDept,
          isHousekeeperPos,
          isHousekeeperRole,
          matches
        })
        
        return matches
      })
      
      console.log('✅ Filtered housekeeping staff:', housekeepingStaff)
      
      // If no housekeeping staff found, show all active staff as fallback
      const staffToUse = housekeepingStaff.length > 0 
        ? housekeepingStaff 
        : savedStaff.filter((s: any) => s.active !== false && s.active !== 'false')
      
      if (housekeepingStaff.length === 0 && staffToUse.length > 0) {
        console.warn('⚠️ No housekeeping staff found, showing all active staff as fallback')
      }
      
      // Format staff data
      const formattedStaff = staffToUse.map((s: any) => ({
        id: s.id,
        firstName: s.firstName || '',
        lastName: s.lastName || '',
        name: s.firstName && s.lastName 
          ? `${s.firstName} ${s.lastName}` 
          : s.name || s.fullName || 'Unknown',
        position: s.position || 'Housekeeper',
        department: s.department || 'housekeeping',
        shift: s.shift || 'დილა'
      }))
      
      console.log('📋 Formatted staff for display:', formattedStaff)
      setStaff(formattedStaff)
    }
    
    loadStaff()
    
    // Also reload when localStorage changes (in case staff is added/updated)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'hotelStaff') {
        loadStaff()
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    
    // Load checklist from Settings localStorage
    const loadChecklistFromSettings = (): any[] => {
      const saved = localStorage.getItem('housekeepingChecklist')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          return parsed.map((item: any) => ({
            item: item.task || item.item || item.name,
            completed: false,
            required: item.required || false,
            category: item.category || 'ზოგადი'
          }))
        } catch (e) {
          console.error('Error loading checklist:', e)
        }
      }
      return []
    }
    
    const checklist = loadChecklistFromSettings()
    if (checklist.length > 0) {
      setDefaultChecklist(checklist)
      console.log('📋 Loaded checklist from Settings:', checklist)
    } else {
      // No checklist in Settings - set empty array (no hardcoded defaults)
      setDefaultChecklist([])
      console.warn('⚠️ No checklist found in Settings. Please add checklist items in Settings → Housekeeping.')
    }
  }, [])
  
  // Load tasks on mount
  useEffect(() => {
    loadTasks()
    archiveOldTasks()
    cleanupDuplicateTasks() // Clean up duplicates on load
  }, [])
  
  // Auto-create tasks for checkout rooms
  useEffect(() => {
    checkForCheckouts()
  }, [rooms, tasks])
  
  // Add this function to auto-archive old tasks
  const archiveOldTasks = () => {
    const twoDaysAgo = moment().subtract(2, 'days').toISOString()
    
    const activeTasks = tasks.filter(task => {
      // Keep if not verified or created within 2 days
      if (task.status !== 'verified') return true
      if (task.completedAt && task.completedAt > twoDaysAgo) return true
      return false
    })
    
    const archivedTasks = tasks.filter(task => {
      return task.status === 'verified' && 
             task.completedAt && 
             task.completedAt <= twoDaysAgo
    })
    
    // Save archived tasks to separate storage
    if (archivedTasks.length > 0) {
      const existingArchive = JSON.parse(localStorage.getItem('housekeepingArchive') || '[]')
      localStorage.setItem('housekeepingArchive', JSON.stringify([...existingArchive, ...archivedTasks]))
    }
    
    // Update active tasks
    if (archivedTasks.length > 0) {
      saveTasks(activeTasks)
    }
  }
  
  const loadTasks = () => {
    const savedTasks = localStorage.getItem('housekeepingTasks')
    if (savedTasks) {
      setTasks(JSON.parse(savedTasks))
    }
  }
  
  const saveTasks = (newTasks: Task[]) => {
    setTasks(newTasks)
    localStorage.setItem('housekeepingTasks', JSON.stringify(newTasks))
  }
  
  // Helper to get floor from room number
  const getRoomFloor = (roomNumber: string): number => {
    const rooms = JSON.parse(localStorage.getItem('hotelRooms') || '[]')
    const room = rooms.find((r: any) => r.roomNumber === roomNumber || r.number === roomNumber)
    if (room?.floor) return room.floor
    // Fallback: extract floor from room number (e.g., 101 -> 1, 201 -> 2)
    const floorMatch = roomNumber.match(/^(\d+)/)
    if (floorMatch) {
      const num = parseInt(floorMatch[1])
      return Math.floor(num / 100)
    }
    return 1
  }
  
  // Load checklist from Settings localStorage
  const loadChecklistFromSettings = (): any[] => {
    const saved = localStorage.getItem('housekeepingChecklist')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        return parsed.map((item: any) => ({
          item: item.task || item.item || item.name,
          completed: false,
          required: item.required || false,
          category: item.category || 'ზოგადი'
        }))
      } catch (e) {
        console.error('Error loading checklist:', e)
      }
    }
    return []
  }
  
  // Auto-create tasks for checkouts
  const checkForCheckouts = () => {
    const checkoutRooms = rooms.filter((r: any) => r.status === 'CHECKOUT')
    const newTasks: Task[] = []
    
    // Always use Settings checklist
    const checklist = loadChecklistFromSettings()
    
    checkoutRooms.forEach((room: any) => {
      // Check if pending task already exists for this room and type
      const existingTask = tasks.find(t => 
        (t.roomId === room.id || t.roomNumber === room.roomNumber) && 
        t.type === 'checkout' &&
        t.status === 'pending'
      )
      
      if (!existingTask) {
        const roomFloor = room.floor || getRoomFloor(room.roomNumber || room.id)
        newTasks.push({
          id: `task-${Date.now()}-${room.id}`,
          roomId: room.id,
          roomNumber: room.roomNumber || room.number || room.id,
          floor: roomFloor,
          type: 'checkout',
          status: 'pending',
          priority: 'high',
          assignedTo: '',
          scheduledTime: moment().format('HH:mm'),
          // Always use Settings checklist (or empty if not set)
          checklist: checklist.length > 0 ? [...checklist] : defaultChecklist.length > 0 ? [...defaultChecklist] : []
        })
      }
    })
    
    if (newTasks.length > 0) {
      saveTasks([...tasks, ...newTasks])
    }
  }
  
  // Cleanup duplicate tasks
  const cleanupDuplicateTasks = () => {
    const savedTasks = localStorage.getItem('housekeepingTasks')
    if (!savedTasks) return
    
    const allTasks = JSON.parse(savedTasks)
    const seen = new Set<string>()
    const unique: Task[] = []
    
    allTasks.forEach((t: Task) => {
      // Key: roomNumber-type-status (only for pending tasks)
      const key = `${t.roomNumber || t.roomId}-${t.type}-${t.status}`
      
      if (t.status === 'pending' && seen.has(key)) {
        // Skip duplicate pending tasks
        return
      }
      
      seen.add(key)
      unique.push(t)
    })
    
    if (unique.length !== allTasks.length) {
      saveTasks(unique)
      console.log(`Cleaned up ${allTasks.length - unique.length} duplicate tasks`)
    }
  }
  
  // Sync checklist from Settings to all pending tasks
  const syncChecklistFromSettings = () => {
    const saved = localStorage.getItem('housekeepingChecklist')
    if (!saved) {
      alert('პარამეტრებში ჩეკლისტი არ არის!\n\nგადადით: პარამეტრები → დასუფთავება')
      return
    }
    
    try {
      const parsed = JSON.parse(saved)
      const newChecklist = parsed.map((item: any) => ({
        item: item.task || item.item || item.name,
        completed: false,
        required: item.required || false,
        category: item.category || 'ზოგადი'
      }))
      
      if (newChecklist.length === 0) {
        alert('პარამეტრებში ჩეკლისტი ცარიელია!')
        return
      }
      
      // Update pending and in_progress tasks
      const updatedTasks = tasks.map(task => {
        if (task.status === 'pending' || task.status === 'in_progress') {
          return { 
            ...task, 
            checklist: newChecklist.map((c: any) => ({ ...c, completed: false }))
          }
        }
        return task
      })
      
      saveTasks(updatedTasks)
      setDefaultChecklist(newChecklist)
      
      const count = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length
      alert(`✅ ჩეკლისტი განახლდა!\n\n${newChecklist.length} დავალება\n${count} task განახლდა`)
    } catch (e) {
      console.error('Error syncing checklist:', e)
      alert('შეცდომა!')
    }
  }
  
  // Start task
  const startTask = (taskId: string) => {
    const updated = tasks.map(t => 
      t.id === taskId 
        ? { ...t, status: 'in_progress' as const, startedAt: moment().toISOString() }
        : t
    )
    saveTasks(updated)
    
    // Update room status to CLEANING
    const task = tasks.find(t => t.id === taskId)
    if (task && onRoomStatusUpdate) {
      onRoomStatusUpdate(task.roomId, 'CLEANING')
    }
  }
  
  // Complete task
  const completeTask = (taskId: string) => {
    const updated = tasks.map(t => 
      t.id === taskId 
        ? { ...t, status: 'completed' as const, completedAt: moment().toISOString() }
        : t
    )
    saveTasks(updated)
  }
  
  // Verify task
  const verifyTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    
    // Update task status
    const updated = tasks.map(t => 
      t.id === taskId ? { ...t, status: 'verified' as const } : t
    )
    saveTasks(updated)
    
    // Update room status to VACANT (ready for new guest)
    try {
      await fetch('/api/hotel/rooms/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: task.roomId,
          status: 'VACANT'
        })
      })
      
      alert('✅ დასუფთავება შემოწმებულია!\n🟢 ოთახი მზადაა ახალი სტუმრისთვის.')
      
      // Reload rooms to update UI
      if (onRoomStatusUpdate) {
        onRoomStatusUpdate(task.roomId, 'VACANT')
      }
    } catch (error) {
      console.error('Failed to update room status:', error)
      alert('შეცდომა ოთახის სტატუსის განახლებისას')
    }
  }
  
  // Assign task to staff
  const assignTask = (taskId: string, staffName: string) => {
    const updated = tasks.map(t => 
      t.id === taskId ? { ...t, assignedTo: staffName } : t
    )
    saveTasks(updated)
    setShowAssignModal(false)
  }
  
  // Update checklist
  const updateChecklist = (taskId: string, itemIndex: number) => {
    const updated = tasks.map(t => {
      if (t.id === taskId && t.checklist) {
        const newChecklist = [...t.checklist]
        newChecklist[itemIndex].completed = !newChecklist[itemIndex].completed
        return { ...t, checklist: newChecklist }
      }
      return t
    })
    saveTasks(updated)
  }
  
  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    if (selectedFloor !== 'all' && task.floor !== parseInt(selectedFloor)) return false
    if (selectedStatus !== 'all' && task.status !== selectedStatus) return false
    return true
  })
  
  // Sort tasks - newest first, pending tasks first
  const sortedTasks = filteredTasks.sort((a, b) => {
    // Pending tasks first
    if (a.status === 'pending' && b.status !== 'pending') return -1
    if (b.status === 'pending' && a.status !== 'pending') return 1
    
    // Then by creation time (newest first)
    return b.id.localeCompare(a.id)
  })
  
  // Get task color
  const getTaskColor = (task: Task) => {
    if (task.status === 'completed') return 'bg-green-100 border-green-500'
    if (task.status === 'verified') return 'bg-gray-100 border-gray-500'
    if (task.status === 'in_progress') return 'bg-yellow-100 border-yellow-500'
    if (task.priority === 'urgent') return 'bg-red-100 border-red-500'
    if (task.priority === 'high') return 'bg-orange-100 border-orange-500'
    return 'bg-blue-100 border-blue-500'
  }
  
  // Calculate stats
  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    verified: tasks.filter(t => t.status === 'verified').length
  }
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">🧹 დასუფთავების განრიგი</h2>
        <div className="flex gap-2">
          <button
            onClick={syncChecklistFromSettings}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            title="სინქრონიზაცია პარამეტრებიდან"
          >
            🔄 ჩეკლისტის სინქრო
          </button>
          <button
            onClick={() => setShowAddTask(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            + ახალი დავალება
          </button>
        </div>
      </div>
      
      {/* Statistics */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-gray-500 text-sm">სულ დავალებები</div>
        </div>
        <div className="bg-blue-50 rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.pending}</div>
          <div className="text-gray-500 text-sm">მოლოდინში</div>
        </div>
        <div className="bg-yellow-50 rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
          <div className="text-gray-500 text-sm">მიმდინარე</div>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          <div className="text-gray-500 text-sm">დასრულებული</div>
        </div>
        <div className="bg-gray-50 rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-gray-600">{stats.verified}</div>
          <div className="text-gray-500 text-sm">შემოწმებული</div>
        </div>
      </div>
      
      {/* Filters */}
      <div className="flex gap-4 mb-4">
        <select
          value={selectedFloor}
          onChange={(e) => setSelectedFloor(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="all">ყველა სართული</option>
          <option value="1">სართული 1</option>
          <option value="2">სართული 2</option>
          <option value="3">სართული 3</option>
        </select>
        
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="all">ყველა სტატუსი</option>
          <option value="pending">მოლოდინში</option>
          <option value="in_progress">მიმდინარე</option>
          <option value="completed">დასრულებული</option>
          <option value="verified">შემოწმებული</option>
        </select>
      </div>
      
      {/* Tasks Grid */}
      <div className="grid grid-cols-3 gap-4">
        {sortedTasks.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            დავალებები არ მოიძებნა
          </div>
        ) : (
          sortedTasks.map(task => (
            <div
              key={task.id}
              className={`border-2 rounded-lg p-4 ${getTaskColor(task)}`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-bold text-lg">ნომერი {task.roomNumber}</div>
                  <div className="text-sm text-gray-500">
                    სართული: {task.floor || getRoomFloor(task.roomNumber)}
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                  task.priority === 'urgent' ? 'bg-red-500 text-white' :
                  task.priority === 'high' ? 'bg-orange-500 text-white' :
                  task.priority === 'normal' ? 'bg-blue-500 text-white' :
                  'bg-gray-500 text-white'
                }`}>
                  {task.priority === 'urgent' ? 'სასწრაფო' :
                   task.priority === 'high' ? 'მაღალი' :
                   task.priority === 'normal' ? 'ჩვეულებრივი' :
                   'დაბალი'}
                </span>
              </div>
              
              <div className="text-sm mb-3">
                <div>ტიპი: {
                  task.type === 'checkout' ? 'Check-out' :
                  task.type === 'daily' ? 'ყოველდღიური' :
                  task.type === 'deep' ? 'ღრმა დასუფთავება' :
                  'Check-in'
                }</div>
                <div className="flex items-center gap-2">
                  <span>მომსახურე:</span>
                  {task.assignedTo ? (
                    <span className="font-medium text-green-600">{task.assignedTo}</span>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedTask(task)
                        setShowAssignModal(true)
                      }}
                      className="text-blue-600 underline hover:text-blue-800"
                    >
                      დანიშვნა
                    </button>
                  )}
                </div>
                <div>დრო: {task.scheduledTime}</div>
                {task.startedAt && (
                  <div>დაწყება: {moment(task.startedAt).format('HH:mm')}</div>
                )}
                {task.completedAt && (
                  <div>დასრულება: {moment(task.completedAt).format('HH:mm')}</div>
                )}
              </div>
              
              {/* Checklist Progress */}
              {task.checklist && (
                <div className="mb-3">
                  <div className="text-sm font-semibold mb-1">Checklist:</div>
                  <div className="bg-white bg-opacity-50 rounded p-2 max-h-32 overflow-y-auto">
                    {task.checklist.map((item, idx) => (
                      <label key={idx} className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={() => updateChecklist(task.id, idx)}
                          disabled={task.status === 'verified'}
                          className="w-3 h-3"
                        />
                        <span className={item.completed ? 'line-through' : ''}>
                          {item.item}
                        </span>
                      </label>
                    ))}
                    <div className="text-xs text-gray-500 mt-1 font-semibold">
                      {task.checklist.filter(i => i.completed).length}/{task.checklist.length} შესრულებული
                    </div>
                  </div>
                </div>
              )}
              
              {/* Actions */}
              <div className="flex gap-2">
                {task.status === 'pending' && (
                  <button
                    onClick={() => startTask(task.id)}
                    className="flex-1 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                  >
                    დაწყება
                  </button>
                )}
                {task.status === 'in_progress' && (
                  <button
                    onClick={() => completeTask(task.id)}
                    className="flex-1 bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                  >
                    დასრულება
                  </button>
                )}
                {task.status === 'completed' && (
                  <button
                    onClick={() => verifyTask(task.id)}
                    className="flex-1 bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700"
                  >
                    შემოწმება
                  </button>
                )}
                {task.status === 'verified' && (
                  <div className="flex-1 text-center text-green-600 font-semibold">
                    ✓ შემოწმებული
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Assign Staff Modal */}
      {showAssignModal && selectedTask && (() => {
        // Reload staff when modal opens (in case it was just added in Settings)
        const reloadStaffForModal = () => {
          const savedStaff = JSON.parse(localStorage.getItem('hotelStaff') || '[]')
          console.log('🔄 Reloading staff for modal:', savedStaff)
          
          const housekeepingStaff = savedStaff.filter((s: any) => {
            const isActive = s.active !== false && s.active !== 'false' && s.active !== 0
            const dept = String(s.department || '').toLowerCase().trim()
            const isHousekeepingDept = dept === 'housekeeping' || dept === 'hsk' || dept === 'დასუფთავება'
            const pos = String(s.position || '').toLowerCase().trim()
            const isHousekeeperPos = pos.includes('housekeeper') || pos === 'housekeeper' || pos === 'დამლაგებელი'
            const role = String(s.role || '').toLowerCase().trim()
            const isHousekeeperRole = role.includes('housekeeper') || role === 'housekeeper'
            return isActive && (isHousekeepingDept || isHousekeeperPos || isHousekeeperRole)
          })
          
          const staffToUse = housekeepingStaff.length > 0 
            ? housekeepingStaff 
            : savedStaff.filter((s: any) => s.active !== false && s.active !== 'false')
          
          const formattedStaff = staffToUse.map((s: any) => ({
            id: s.id,
            firstName: s.firstName || '',
            lastName: s.lastName || '',
            name: s.firstName && s.lastName 
              ? `${s.firstName} ${s.lastName}` 
              : s.name || s.fullName || 'Unknown',
            position: s.position || 'Housekeeper',
            department: s.department || 'housekeeping',
            shift: s.shift || 'დილა'
          }))
          
          console.log('✅ Modal staff:', formattedStaff)
          return formattedStaff
        }
        
        const modalStaff = reloadStaffForModal()
        
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full">
              <h3 className="text-lg font-bold mb-4">თანამშრომლის დანიშვნა</h3>
              <p className="text-sm text-gray-600 mb-4">ოთახი {selectedTask.roomNumber}</p>
              {modalStaff.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <p className="font-medium mb-2">Housekeeping თანამშრომლები არ არის</p>
                  <p className="text-sm mb-3">თანამშრომლების დასამატებლად:</p>
                  <ol className="text-sm text-left list-decimal list-inside space-y-1 mb-3">
                    <li>გადადით პარამეტრებში</li>
                    <li>აირჩიეთ "სასტუმრო" → "თანამშრომლები"</li>
                    <li>დაამატეთ Housekeeping თანამშრომელი</li>
                    <li>დააჭირეთ "💾 შენახვა" ღილაკს</li>
                  </ol>
                  <button
                    onClick={() => {
                      // Force reload from localStorage
                      const savedStaff = JSON.parse(localStorage.getItem('hotelStaff') || '[]')
                      console.log('🔄 Manual reload - All staff:', savedStaff)
                      if (savedStaff.length > 0) {
                        alert(`ნაპოვნია ${savedStaff.length} თანამშრომელი localStorage-ში.\n\nგთხოვთ განაახლოთ გვერდი (F5) ან დახურეთ და გახსენით ეს modal კვლავ.`)
                        window.location.reload()
                      } else {
                        alert('localStorage-ში თანამშრომლები არ არის.\n\nგთხოვთ პირველად შეინახოთ თანამშრომლები პარამეტრებში.')
                      }
                    }}
                    className="mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                  >
                    🔄 გადატვირთვა
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {modalStaff.map((s: any) => {
                    const staffName = s.firstName && s.lastName 
                      ? `${s.firstName} ${s.lastName}` 
                      : s.name || 'Unknown'
                    return (
                      <button
                        key={s.id}
                        onClick={() => {
                          assignTask(selectedTask.id, staffName)
                        }}
                        className="w-full p-3 text-left border rounded hover:bg-blue-50 flex justify-between items-center"
                      >
                        <div>
                          <div className="font-medium">
                            {staffName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {s.position || 'Housekeeper'}
                          </div>
                        </div>
                        <span className="text-blue-600">→</span>
                      </button>
                    )
                  })}
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
        )
      })()}
      
      {/* Add Task Modal */}
      {showAddTask && (
        <AddTaskModal
          rooms={rooms}
          onClose={() => setShowAddTask(false)}
          onAdd={(newTask: any) => {
            const task: Task = {
              ...newTask,
              id: `task-${Date.now()}`,
              status: 'pending',
              checklist: (newTask.type === 'checkout' || newTask.type === 'checkin') && defaultChecklist.length > 0 
                ? [...defaultChecklist] 
                : undefined
            }
            saveTasks([...tasks, task])
            setShowAddTask(false)
          }}
        />
      )}
    </div>
  )
}

function AddTaskModal({ rooms, onClose, onAdd }: any) {
  const [formData, setFormData] = useState({
    roomId: '',
    roomNumber: '',
    floor: 1,
    type: 'daily' as 'checkout' | 'daily' | 'deep' | 'checkin',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    scheduledTime: '',
    notes: ''
  })
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-bold">ახალი დავალება</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">✕</button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">ნომერი</label>
            <select 
              className="w-full border rounded px-3 py-2"
              value={formData.roomId}
              onChange={(e) => {
                const room = rooms.find((r: any) => r.id === e.target.value)
                setFormData({
                  ...formData, 
                  roomId: e.target.value,
                  roomNumber: room?.roomNumber || '',
                  floor: room?.floor || 1
                })
              }}
            >
              <option value="">აირჩიეთ ნომერი</option>
              {rooms.map((room: any) => (
                <option key={room.id} value={room.id}>
                  {room.roomNumber} - {room.roomType}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">დავალების ტიპი</label>
            <select 
              className="w-full border rounded px-3 py-2"
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value as any})}
            >
              <option value="daily">ყოველდღიური</option>
              <option value="deep">ღრმა დასუფთავება</option>
              <option value="checkout">Check-out</option>
              <option value="checkin">Check-in</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">პრიორიტეტი</label>
            <select 
              className="w-full border rounded px-3 py-2"
              value={formData.priority}
              onChange={(e) => setFormData({...formData, priority: e.target.value as any})}
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
              onChange={(e) => setFormData({...formData, scheduledTime: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">შენიშვნა</label>
            <textarea
              className="w-full border rounded px-3 py-2"
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="დამატებითი ინფორმაცია..."
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            გაუქმება
          </button>
          <button
            onClick={() => onAdd(formData)}
            disabled={!formData.roomId}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            დამატება
          </button>
        </div>
      </div>
    </div>
  )
}
