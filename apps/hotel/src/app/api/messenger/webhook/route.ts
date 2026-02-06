import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// In-memory conversation state
const conversationState: Map<string, {
  step: string
  checkIn?: string
  checkOut?: string
  guests?: number
  roomType?: string
  guestName?: string
  guestPhone?: string
}> = new Map()

// Facebook Webhook Verification (GET request)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')
  
  console.log('[Messenger Webhook] Verification request:', { mode, token, challenge })
  
  if (mode === 'subscribe' && token) {
    const integration = await prisma.facebookIntegration.findFirst({
      where: { verifyToken: token, isActive: true }
    })
    
    if (integration) {
      console.log('[Messenger Webhook] Verification successful for:', integration.pageName)
      return new NextResponse(challenge, { status: 200 })
    }
  }
  
  console.log('[Messenger Webhook] Verification failed!')
  return new NextResponse('Forbidden', { status: 403 })
}

// Handle incoming messages (POST request)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('[Messenger Webhook] Received:', JSON.stringify(body, null, 2))
    
    if (body.object === 'page') {
      for (const entry of body.entry || []) {
        const pageId = entry.id
        
        const integration = await prisma.facebookIntegration.findUnique({
          where: { pageId }
        })
        
        if (!integration || !integration.isActive) {
          console.log('[Messenger Webhook] No active integration for page:', pageId)
          continue
        }
        
        // Update stats (non-critical)
        try {
          await prisma.facebookIntegration.update({
            where: { pageId },
            data: { messagesReceived: { increment: 1 } }
          })
        } catch (e) {
          console.warn('[Messenger] Failed to update messagesReceived:', e)
        }
        
        const messaging = entry.messaging || []
        
        for (const event of messaging) {
          const senderId = event.sender?.id
          const message = event.message
          
          if (senderId && message) {
            console.log('[Messenger] Message from:', senderId)
            console.log('[Messenger] Message text:', message.text)
            
            if (integration.botEnabled) {
              await handleMessage(senderId, message, integration)
            }
          }
        }
      }
    }
    
    return NextResponse.json({ status: 'ok' })
    
  } catch (error) {
    console.error('[Messenger Webhook] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// Handle incoming message and send response
async function handleMessage(senderId: string, message: any, integration: any) {
  const text = message.text?.toLowerCase().trim() || ''
  const originalText = message.text?.trim() || ''
  const orgName = integration.pageName || 'სასტუმრო'
  
  // Get tenantId from organization
  let orgId = integration.organizationId
  try {
    const org = await prisma.organization.findUnique({
      where: { id: integration.organizationId },
      select: { tenantId: true }
    })
    if (org?.tenantId) {
      orgId = org.tenantId
      console.log('[Messenger] Using tenantId:', orgId)
    }
  } catch (e) {
    console.error('[Messenger] Error getting tenantId:', e)
  }
  
  let responseText = ''
  
  // Check if user is in a conversation flow
  const state = conversationState.get(senderId)
  
  // Handle conversation flow
  if (state) {
    responseText = await handleConversationFlow(senderId, originalText, state, orgId, integration)
  }
  // Handle menu commands
  else if (text === '0' || text.includes('მენიუ') || text.includes('menu') || text.includes('დასაწყის')) {
    responseText = getMainMenu(orgName, integration.welcomeMessage)
  }
  else if (text.includes('გამარჯობა') || text.includes('hello') || text.includes('hi') || text.includes('გაუმარჯოს')) {
    responseText = getMainMenu(orgName, integration.welcomeMessage)
  }
  else if (text === '1' || text.includes('ჯავშნ') || text.includes('book') || text.includes('დაჯავშნ')) {
    if (integration.bookingEnabled) {
      conversationState.set(senderId, { step: 'ask_checkin' })
      responseText = '📅 შემოსვლის თარიღი?\n\nმაგალითად: 27.01.2026 ან "ხვალ"'
    } else {
      responseText = '📞 ონლაინ ჯავშანი დროებით გათიშულია.\n\nგთხოვთ დაგვიკავშირდეთ ტელეფონით.'
    }
  }
  else if (text === '2' || text.includes('ფას') || text.includes('price')) {
    responseText = await getPricing(orgId)
  }
  else if (text === '3' || text.includes('კონტაქტ') || text.includes('contact')) {
    responseText = await getContactInfo(orgId)
  }
  else if (text === '4' || text.includes('თავისუფალ') || text.includes('availab')) {
    responseText = await getAvailability(orgId)
  }
  else {
    responseText = `🤔 ვერ გავიგე თქვენი მოთხოვნა.\n\n${getMainMenu(orgName, null)}`
  }
  
  // Send response
  await sendMessage(senderId, responseText, integration.pageAccessToken, integration.pageId)
  
  // Update stats
  try {
    await prisma.facebookIntegration.update({
      where: { pageId: integration.pageId },
      data: { messagesSent: { increment: 1 } }
    })
  } catch (e) {
    console.warn('[Messenger] Failed to update stats:', e)
  }
}

// Get main menu
function getMainMenu(orgName: string, customMessage?: string | null): string {
  if (customMessage) {
    return customMessage
  }
  return `👋 გამარჯობა! ${orgName}-ში მოგესალმებით!\n\nაირჩიეთ:\n1️⃣ ჯავშნის გაკეთება\n2️⃣ ფასების ნახვა\n3️⃣ კონტაქტი\n4️⃣ თავისუფალი ოთახები`
}

// Handle conversation flow for booking
async function handleConversationFlow(
  senderId: string, 
  text: string, 
  state: any, 
  orgId: string,
  integration: any
): Promise<string> {
  
  // Cancel command
  if (text.toLowerCase() === 'გაუქმება' || text.toLowerCase() === 'cancel' || text === '0') {
    conversationState.delete(senderId)
    return '❌ ჯავშანი გაუქმებულია.\n\n' + getMainMenu(integration.pageName, null)
  }
  
  switch (state.step) {
    case 'ask_checkin': {
      const checkIn = parseDate(text)
      if (!checkIn) {
        return '❌ თარიღი ვერ გავიგე. გთხოვთ მიუთითეთ ფორმატში: 27.01.2026\n\nან დაწერეთ "გაუქმება" გასაუქმებლად.'
      }
      state.checkIn = checkIn
      state.step = 'ask_checkout'
      conversationState.set(senderId, state)
      return `✅ შემოსვლა: ${checkIn}\n\n📅 გასვლის თარიღი?`
    }
    
    case 'ask_checkout': {
      const checkOut = parseDate(text)
      if (!checkOut) {
        return '❌ თარიღი ვერ გავიგე. გთხოვთ მიუთითეთ ფორმატში: 29.01.2026'
      }
      state.checkOut = checkOut
      state.step = 'ask_guests'
      conversationState.set(senderId, state)
      return `✅ გასვლა: ${checkOut}\n\n👥 რამდენი სტუმარი?`
    }
    
    case 'ask_guests': {
      const guests = parseInt(text)
      if (isNaN(guests) || guests < 1 || guests > 10) {
        return '❌ გთხოვთ მიუთითეთ სტუმრების რაოდენობა (1-10)'
      }
      state.guests = guests
      state.step = 'ask_name'
      conversationState.set(senderId, state)
      return `✅ სტუმრები: ${guests}\n\n👤 თქვენი სახელი და გვარი?`
    }
    
    case 'ask_name': {
      if (text.length < 3) {
        return '❌ გთხოვთ მიუთითეთ სრული სახელი და გვარი'
      }
      state.guestName = text
      state.step = 'ask_phone'
      conversationState.set(senderId, state)
      return `✅ სახელი: ${text}\n\n📱 თქვენი ტელეფონის ნომერი?`
    }
    
    case 'ask_phone': {
      const phone = text.replace(/\s/g, '')
      if (phone.length < 9) {
        return '❌ გთხოვთ მიუთითეთ სწორი ტელეფონის ნომერი'
      }
      state.guestPhone = phone
      state.step = 'confirm_booking'
      conversationState.set(senderId, state)
      
      // Check availability first
      const availability = await checkRoomAvailability(orgId, state.checkIn!, state.checkOut!)
      
      if (!availability.available) {
        conversationState.delete(senderId)
        return `❌ სამწუხაროდ, ${state.checkIn} - ${state.checkOut} თარიღებში თავისუფალი ოთახი არ არის.\n\n` +
          `📅 სხვა თარიღებისთვის დაწერეთ "1"`
      }
      
      // Show summary and ask for confirmation
      const pricing = await calculatePrice(orgId, state.checkIn!, state.checkOut!, state.guests!)
      
      return `📋 ჯავშნის დეტალები:\n\n` +
        `📅 ${state.checkIn} - ${state.checkOut}\n` +
        `👥 ${state.guests} სტუმარი\n` +
        `👤 ${state.guestName}\n` +
        `📱 ${state.guestPhone}\n` +
        `🛏️ ოთახი: ${availability.roomNumber}\n` +
        `💰 ჯამი: ${pricing.total} ₾\n\n` +
        `დაადასტურეთ ჯავშანი?\n✅ "დიახ" - დადასტურება\n❌ "არა" - გაუქმება`
    }
    
    case 'confirm_booking': {
      if (text.toLowerCase().includes('დიახ') || text.toLowerCase() === 'yes' || text === '✅' || text.toLowerCase() === 'კი') {
        // Create reservation
        const result = await createReservation(orgId, state)
        conversationState.delete(senderId)
        
        if (result.success) {
          // Update booking stats
          try {
            await prisma.facebookIntegration.update({
              where: { pageId: integration.pageId },
              data: { bookingsCreated: { increment: 1 } }
            })
          } catch (e) {
            console.warn('[Messenger] Failed to update bookingsCreated:', e)
          }
          
          return `🎉 ჯავშანი წარმატებით შეიქმნა!\n\n` +
            `📋 ჯავშნის ნომერი: ${result.reservationId}\n` +
            `📅 ${state.checkIn} - ${state.checkOut}\n\n` +
            `მალე დაგიკავშირდებით დასადასტურებლად.\n\n` +
            `მადლობა! 🙏`
        } else {
          return `❌ სამწუხაროდ, ჯავშანი ვერ შეიქმნა.\n\n${result.error}\n\nგთხოვთ დაგვიკავშირდეთ ტელეფონით.`
        }
      } else if (text.toLowerCase().includes('არა') || text.toLowerCase() === 'no' || text === '❌') {
        conversationState.delete(senderId)
        return '❌ ჯავშანი გაუქმებულია.\n\n' + getMainMenu(integration.pageName, null)
      } else {
        return 'გთხოვთ დაწეროთ "დიახ" დასადასტურებლად ან "არა" გასაუქმებლად.'
      }
    }
    
    default:
      conversationState.delete(senderId)
      return getMainMenu(integration.pageName, null)
  }
}

// Parse date from various formats
function parseDate(text: string): string | null {
  const today = new Date()
  
  // Handle relative dates
  if (text.includes('ხვალ') || text.toLowerCase() === 'tomorrow') {
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return formatDate(tomorrow)
  }
  if (text.includes('ზეგ')) {
    const dayAfter = new Date(today)
    dayAfter.setDate(dayAfter.getDate() + 2)
    return formatDate(dayAfter)
  }
  if (text.includes('დღეს') || text.toLowerCase() === 'today') {
    return formatDate(today)
  }
  
  // Try DD.MM.YYYY format
  const ddmmyyyy = text.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/)
  if (ddmmyyyy) {
    return `${ddmmyyyy[1].padStart(2, '0')}.${ddmmyyyy[2].padStart(2, '0')}.${ddmmyyyy[3]}`
  }
  
  // Try DD.MM format (assume current year)
  const ddmm = text.match(/(\d{1,2})[.\/-](\d{1,2})/)
  if (ddmm) {
    return `${ddmm[1].padStart(2, '0')}.${ddmm[2].padStart(2, '0')}.${today.getFullYear()}`
  }
  
  return null
}

function formatDate(date: Date): string {
  return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()}`
}

// Check room availability for dates
async function checkRoomAvailability(
  orgId: string,
  checkIn: string,
  checkOut: string
): Promise<{ available: boolean; roomId?: string; roomNumber?: string }> {
  try {
    const [d1, m1, y1] = checkIn.split('.').map(Number)
    const [d2, m2, y2] = checkOut.split('.').map(Number)
    const checkInDate = new Date(y1, m1 - 1, d1)
    const checkOutDate = new Date(y2, m2 - 1, d2)
    
    // Get all rooms
    const rooms = await prisma.hotelRoom.findMany({
      where: { tenantId: orgId }
    })
    
    console.log('[Messenger] Total rooms found:', rooms.length)
    
    if (rooms.length === 0) {
      return { available: false }
    }
    
    // Get existing reservations for these dates (both uppercase and lowercase status)
    const existingReservations = await prisma.hotelReservation.findMany({
      where: {
        tenantId: orgId,
        checkIn: { lt: checkOutDate },
        checkOut: { gt: checkInDate },
        status: { 
          in: ['confirmed', 'checked_in', 'pending', 'CONFIRMED', 'CHECKED_IN', 'PENDING'] 
        }
      }
    })
    
    console.log('[Messenger] Existing reservations for dates:', existingReservations.length)
    
    const occupiedRoomIds = new Set(existingReservations.map(r => r.roomId))
    const availableRoom = rooms.find(r => !occupiedRoomIds.has(r.id))
    
    if (availableRoom) {
      console.log('[Messenger] Available room found:', availableRoom.roomNumber)
      return { 
        available: true, 
        roomId: availableRoom.id, 
        roomNumber: availableRoom.roomNumber 
      }
    }
    
    console.log('[Messenger] No available rooms')
    return { available: false }
  } catch (error) {
    console.error('[Messenger] Error checking availability:', error)
    return { available: false }
  }
}

// Get pricing from database
async function getPricing(orgId: string): Promise<string> {
  try {
    // Try to get base price from rooms
    const room = await prisma.hotelRoom.findFirst({
      where: { tenantId: orgId },
      orderBy: { basePrice: 'asc' }
    })
    
    if (room) {
      return `💰 ფასები:\n\n🛏️ ოთახი: ${room.basePrice} ₾/ღამე\n\n📅 ჯავშნისთვის დაწერეთ "1"`
    }
    
    return '💰 ფასების ინფორმაცია დროებით მიუწვდომელია.\n\nგთხოვთ დაგვიკავშირდეთ.'
  } catch (error) {
    console.error('[Messenger] Error getting pricing:', error)
    return '💰 ფასების ინფორმაცია დროებით მიუწვდომელია.'
  }
}

// Get contact info from database
async function getContactInfo(orgId: string): Promise<string> {
  try {
    const org = await prisma.organization.findFirst({
      where: { tenantId: orgId }
    })
    
    if (!org) {
      return '📞 კონტაქტი:\n\nდაგვიკავშირდით პირდაპირ Facebook-ზე!'
    }
    
    let contactText = '📞 კონტაქტი:\n\n'
    
    if (org.phone) contactText += `📱 ტელეფონი: ${org.phone}\n`
    if (org.email) contactText += `📧 Email: ${org.email}\n`
    if (org.address) contactText += `📍 მისამართი: ${org.address}\n`
    if (org.website) contactText += `🌐 ვებსაიტი: ${org.website}\n`
    
    if (contactText === '📞 კონტაქტი:\n\n') {
      contactText += 'დაგვიკავშირდით პირდაპირ Facebook-ზე!'
    }
    
    return contactText
  } catch (error) {
    console.error('[Messenger] Error getting contact:', error)
    return '📞 დაგვიკავშირდით პირდაპირ Facebook-ზე!'
  }
}

// Get availability
async function getAvailability(orgId: string): Promise<string> {
  try {
    const today = new Date()
    const nextWeek = new Date(today)
    nextWeek.setDate(nextWeek.getDate() + 7)
    
    // Get all rooms
    const rooms = await prisma.hotelRoom.findMany({
      where: { tenantId: orgId }
    })
    
    // Get reservations for next week
    const reservations = await prisma.hotelReservation.findMany({
      where: {
        tenantId: orgId,
        checkIn: { lte: nextWeek },
        checkOut: { gte: today },
        status: { in: ['confirmed', 'checked_in', 'CONFIRMED', 'CHECKED_IN'] }
      }
    })
    
    const totalRooms = rooms.length
    const occupiedRoomIds = new Set(reservations.map(r => r.roomId))
    const availableRooms = totalRooms - occupiedRoomIds.size
    
    if (totalRooms === 0) {
      return '🏨 თავისუფალი ოთახების ინფორმაცია დროებით მიუწვდომელია.'
    }
    
    let statusIcon = availableRooms > 3 ? '🟢' : availableRooms > 0 ? '🟡' : '🔴'
    
    return `🏨 ამჟამად თავისუფალია:\n\n` +
      `${statusIcon} ${availableRooms} ოთახი ${totalRooms}-დან\n\n` +
      `📅 ჯავშნისთვის დაწერეთ "1"`
  } catch (error) {
    console.error('[Messenger] Error getting availability:', error)
    return '🏨 თავისუფალი ოთახების ინფორმაცია დროებით მიუწვდომელია.'
  }
}

// Calculate price
async function calculatePrice(
  orgId: string, 
  checkIn: string, 
  checkOut: string, 
  guests: number
): Promise<{ total: number, perNight: number, nights: number }> {
  try {
    const [d1, m1, y1] = checkIn.split('.').map(Number)
    const [d2, m2, y2] = checkOut.split('.').map(Number)
    const checkInDate = new Date(y1, m1 - 1, d1)
    const checkOutDate = new Date(y2, m2 - 1, d2)
    
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
    
    // Get room base price
    const room = await prisma.hotelRoom.findFirst({
      where: { tenantId: orgId },
      orderBy: { basePrice: 'asc' }
    })
    
    const perNight = room?.basePrice ? Number(room.basePrice) : 100
    const total = perNight * Math.max(nights, 1)
    
    return { total, perNight, nights: Math.max(nights, 1) }
  } catch (error) {
    console.error('[Messenger] Error calculating price:', error)
    return { total: 100, perNight: 100, nights: 1 }
  }
}

// Create reservation in PMS
async function createReservation(
  orgId: string, 
  state: any
): Promise<{ success: boolean, reservationId?: string, error?: string }> {
  try {
    const [d1, m1, y1] = state.checkIn.split('.').map(Number)
    const [d2, m2, y2] = state.checkOut.split('.').map(Number)
    const checkInDate = new Date(y1, m1 - 1, d1)
    const checkOutDate = new Date(y2, m2 - 1, d2)
    
    // Check availability again
    const availability = await checkRoomAvailability(orgId, state.checkIn, state.checkOut)
    
    if (!availability.available || !availability.roomId) {
      return { success: false, error: 'ამ თარიღებში თავისუფალი ოთახი არ არის.' }
    }
    
    // Calculate price
    const pricing = await calculatePrice(orgId, state.checkIn, state.checkOut, state.guests)
    
    // Create reservation
    const reservation = await prisma.hotelReservation.create({
      data: {
        tenantId: orgId,
        roomId: availability.roomId,
        guestName: state.guestName,
        guestEmail: '',
        guestPhone: state.guestPhone || '',
        checkIn: checkInDate,
        checkOut: checkOutDate,
        adults: state.guests,
        children: 0,
        totalAmount: pricing.total,
        paidAmount: 0,
        status: 'confirmed',
        source: 'Facebook Messenger',
        notes: `Messenger Bot-ით შექმნილი ჯავშანი`
      }
    })
    
    console.log('[Messenger] Reservation created:', reservation.id)
    
    return { 
      success: true, 
      reservationId: reservation.id.slice(-8).toUpperCase()
    }
  } catch (error) {
    console.error('[Messenger] Error creating reservation:', error)
    return { success: false, error: 'სისტემური შეცდომა. გთხოვთ სცადოთ მოგვიანებით.' }
  }
}

// Send message via Facebook API
async function sendMessage(recipientId: string, text: string, accessToken: string, pageId?: string) {
  try {
    const endpoint = pageId 
      ? `https://graph.facebook.com/v18.0/${pageId}/messages`
      : `https://graph.facebook.com/v18.0/me/messages`
    
    const response = await fetch(
      `${endpoint}?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text },
        }),
      }
    )
    
    const result = await response.json()
    console.log('[Messenger] Message sent:', result)
    
  } catch (error) {
    console.error('[Messenger] Error sending message:', error)
  }
}