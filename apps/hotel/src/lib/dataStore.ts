import fs from 'fs/promises'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const ROOMS_FILE = path.join(DATA_DIR, 'rooms.json')
const RESERVATIONS_FILE = path.join(DATA_DIR, 'reservations.json')

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR)
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true })
  }
}

// Rooms Storage
export async function getRooms() {
  await ensureDataDir()
  
  try {
    // Check if file exists first
    await fs.access(ROOMS_FILE)
    
    // File exists, read it
    const data = await fs.readFile(ROOMS_FILE, 'utf-8')
    
    // Validate JSON
    const rooms = JSON.parse(data)
    
    // Validate it's an array with data
    if (Array.isArray(rooms) && rooms.length > 0) {
      return rooms
    }
    
    // Empty array - might be corrupted, but don't overwrite
    console.warn('⚠️ rooms.json is empty, but not overwriting existing file')
    return rooms
    
  } catch (error: any) {
    // Only create default rooms if file truly doesn't exist
    if (error.code === 'ENOENT') {
      console.log('📁 rooms.json not found, creating default rooms...')
      
      const defaultRooms = [
        { id: '1', roomNumber: '101', floor: 1, roomType: 'Standard', basePrice: 150, status: 'VACANT', tenantId: 'default', maxOccupancy: 2 },
        { id: '2', roomNumber: '102', floor: 1, roomType: 'Standard', basePrice: 150, status: 'VACANT', tenantId: 'default', maxOccupancy: 2 },
        { id: '3', roomNumber: '103', floor: 1, roomType: 'Standard', basePrice: 150, status: 'VACANT', tenantId: 'default', maxOccupancy: 2 },
        { id: '4', roomNumber: '104', floor: 1, roomType: 'Standard', basePrice: 150, status: 'VACANT', tenantId: 'default', maxOccupancy: 2 },
        { id: '5', roomNumber: '105', floor: 1, roomType: 'Standard', basePrice: 150, status: 'VACANT', tenantId: 'default', maxOccupancy: 2 },
        { id: '6', roomNumber: '201', floor: 2, roomType: 'Deluxe', basePrice: 180, status: 'VACANT', tenantId: 'default', maxOccupancy: 3 },
        { id: '7', roomNumber: '202', floor: 2, roomType: 'Deluxe', basePrice: 180, status: 'VACANT', tenantId: 'default', maxOccupancy: 3 },
        { id: '8', roomNumber: '203', floor: 2, roomType: 'Deluxe', basePrice: 180, status: 'VACANT', tenantId: 'default', maxOccupancy: 3 },
        { id: '9', roomNumber: '204', floor: 2, roomType: 'Deluxe', basePrice: 180, status: 'VACANT', tenantId: 'default', maxOccupancy: 3 },
        { id: '10', roomNumber: '205', floor: 2, roomType: 'Deluxe', basePrice: 180, status: 'VACANT', tenantId: 'default', maxOccupancy: 3 },
        { id: '11', roomNumber: '301', floor: 3, roomType: 'Suite', basePrice: 250, status: 'VACANT', tenantId: 'default', maxOccupancy: 4 },
        { id: '12', roomNumber: '302', floor: 3, roomType: 'Suite', basePrice: 250, status: 'VACANT', tenantId: 'default', maxOccupancy: 4 },
        { id: '13', roomNumber: '303', floor: 3, roomType: 'Suite', basePrice: 250, status: 'VACANT', tenantId: 'default', maxOccupancy: 4 },
        { id: '14', roomNumber: '304', floor: 3, roomType: 'Suite', basePrice: 250, status: 'VACANT', tenantId: 'default', maxOccupancy: 4 },
        { id: '15', roomNumber: '305', floor: 3, roomType: 'Suite', basePrice: 250, status: 'VACANT', tenantId: 'default', maxOccupancy: 4 }
      ]
      
      await saveRooms(defaultRooms)
      return defaultRooms
    }
    
    // Other errors (JSON parse, permission, etc.) - log but don't overwrite
    console.error('❌ Error reading rooms.json:', error.message)
    console.error('⚠️ NOT overwriting existing file to prevent data loss')
    
    // Return empty array instead of overwriting
    return []
  }
}

export async function saveRooms(rooms: any[]) {
  try {
    await ensureDataDir()
    
    // Write to file with proper formatting
    await fs.writeFile(
      ROOMS_FILE, 
      JSON.stringify(rooms, null, 2),
      'utf-8'
    )
    
    console.log('Rooms saved to file:', rooms.length, 'rooms at', ROOMS_FILE)
    return rooms
  } catch (error) {
    console.error('Error saving rooms:', error)
    throw error
  }
}

export async function addRoom(room: any) {
  const rooms = await getRooms()
  const newRoom = {
    id: `room-${Date.now()}`,
    ...room,
    status: room.status || 'VACANT',
    tenantId: room.tenantId || 'default',
    maxOccupancy: room.maxOccupancy || 2
  }
  rooms.push(newRoom)
  await saveRooms(rooms)
  return newRoom
}

export async function updateRoom(id: string, updates: any) {
  try {
    const rooms = await getRooms()
    const roomIndex = rooms.findIndex((r: any) => r.id === id)
    
    if (roomIndex === -1) {
      console.error('Room not found:', id)
      return null
    }
    
    // If updating to MAINTENANCE, add maintenanceDate
    // If updating from MAINTENANCE to something else, remove maintenanceDate
    const currentRoom = rooms[roomIndex]
    const updatedRoom = { 
      ...currentRoom, 
      ...updates,
      maintenanceDate: updates.status === 'MAINTENANCE' 
        ? new Date().toISOString() 
        : updates.status !== 'MAINTENANCE' && currentRoom.status === 'MAINTENANCE'
        ? null
        : currentRoom.maintenanceDate
    }
    
    // Update the room
    rooms[roomIndex] = updatedRoom
    
    // Save to file
    await saveRooms(rooms)
    
    console.log('Room updated:', updatedRoom.id, 'Status:', updatedRoom.status)
    
    return updatedRoom
  } catch (error) {
    console.error('Error in updateRoom:', error)
    throw error
  }
}

export async function deleteRoom(id: string) {
  // Check if room has active reservations
  const reservations = await getReservations()
  const activeReservations = reservations.filter((r: any) => 
    r.roomId === id && 
    ['CONFIRMED', 'CHECKED_IN', 'PENDING'].includes(r.status)
  )
  
  if (activeReservations.length > 0) {
    throw new Error(`Cannot delete room - ${activeReservations.length} active reservation(s) exist`)
  }
  
  const rooms = await getRooms()
  const filtered = rooms.filter((r: any) => r.id !== id)
  await saveRooms(filtered)
  return true
}

// Reservations Storage
export async function getReservations() {
  await ensureDataDir()
  try {
    const data = await fs.readFile(RESERVATIONS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

export async function saveReservations(reservations: any[]) {
  await ensureDataDir()
  await fs.writeFile(RESERVATIONS_FILE, JSON.stringify(reservations, null, 2), 'utf-8')
  return reservations
}

export async function addReservation(reservation: any) {
  const reservations = await getReservations()
  const newReservation = {
    id: `res-${Date.now()}`,
    ...reservation,
    createdAt: new Date().toISOString()
  }
  reservations.push(newReservation)
  await saveReservations(reservations)
  
  // Update room status
  if (reservation.roomId) {
    try {
      await updateRoom(reservation.roomId, { status: 'OCCUPIED' })
    } catch (error) {
      console.error('Failed to update room status:', error)
    }
  }
  
  return newReservation
}

export async function updateReservation(id: string, updates: any) {
  const reservations = await getReservations()
  const index = reservations.findIndex((r: any) => r.id === id)
  if (index !== -1) {
    reservations[index] = { ...reservations[index], ...updates }
    await saveReservations(reservations)
    return reservations[index]
  }
  throw new Error('Reservation not found')
}

export async function deleteReservation(id: string) {
  const reservations = await getReservations()
  const filtered = reservations.filter((r: any) => r.id !== id)
  await saveReservations(filtered)
  return true
}

