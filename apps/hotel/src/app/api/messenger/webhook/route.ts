import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// ============================================
// CONFIGURATION
// ============================================

const VERIFY_TOKEN = process.env.MESSENGER_VERIFY_TOKEN || 'brewery_house_verify_token_2024'

const HOTEL_CONFIG = {
  phone: '+995 599 946 500',
  email: 'info@breweryhouse.ge',
  address: 'ასპინძა, შორეთის ქ. 21',
  website: 'https://breweryhouse.ge',
  
  services: {
    beerSpa: {
      price: 150,
      maxPersons: 2,
      durationMinutes: 60,
      ka: { name: 'ლუდის სპა', description: '1 საათიანი პროცედურა ლუდის აბაზანაში + ულიმიტო ქვევრის ლუდი' },
      en: { name: 'Beer Spa', description: '1-hour beer bath procedure + unlimited Qvevri beer' },
      ru: { name: 'Пивное СПА', description: '1-часовая процедура в пивной ванне + безлимитное квеври пиво' }
    },
    beerTasting: {
      price: 30,
      ka: { name: 'ლუდის დეგუსტაცია', description: '4 სახეობის ქვევრის ლუდის დეგუსტაცია' },
      en: { name: 'Beer Tasting', description: 'Tasting of 4 types of Qvevri beer' },
      ru: { name: 'Дегустация пива', description: 'Дегустация 4 видов квеври пива' }
    }
  }
}

// ============================================
// WEBHOOK HANDLERS
// ============================================

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  if (params.get('hub.mode') === 'subscribe' && params.get('hub.verify_token') === VERIFY_TOKEN) {
    console.log('[Webhook] Verified')
    return new NextResponse(params.get('hub.challenge'), { status: 200 })
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (body.object !== 'page') {
      return NextResponse.json({ status: 'ignored' })
    }

    for (const entry of body.entry || []) {
      const pageId = entry.id
      
      for (const event of entry.messaging || []) {
        if (event.message?.text) {
          await handleMessage(pageId, event.sender.id, event.message.text)
        }
      }
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('[Webhook] Error:', error)
    return NextResponse.json({ status: 'ok' })
  }
}

// ============================================
// MESSAGE HANDLER
// ============================================

async function handleMessage(pageId: string, senderId: string, text: string) {
  console.log(`[${pageId}] Message from ${senderId}: ${text}`)

  // Get integration settings
  const integration = await prisma.facebookIntegration.findUnique({
    where: { pageId }
  })

  if (!integration) {
    console.error('Integration not found for page:', pageId)
    return
  }

  if (!integration.botEnabled) {
    console.log('Bot disabled for page:', pageId)
    return
  }

  // Update message count
  await prisma.facebookIntegration.update({
    where: { pageId },
    data: { messagesReceived: { increment: 1 } }
  })

  const orgId = integration.organizationId

  // Check if AI is enabled
  if (integration.aiEnabled && integration.aiApiKey) {
    await handleAIMessage(senderId, text, integration, orgId)
  } else {
    // Use menu-based bot
    await handleMenuMessage(senderId, text, integration, orgId)
  }
}

// ============================================
// AI MESSAGE HANDLER
// ============================================

async function handleAIMessage(
  senderId: string, 
  text: string, 
  integration: any,
  orgId: string
) {
  try {
    // Get or create conversation state
    let session = await prisma.messengerSession.findUnique({
      where: { senderId }
    })

    let conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
    
    if (session?.state) {
      try {
        const state = JSON.parse(session.state)
        conversationHistory = state.messages || []
      } catch {}
    }

    // Add user message
    conversationHistory.push({ role: 'user', content: text })

    // Build context
    const hotelContext = await buildHotelContext(orgId)
    
    // Get AI response
    const response = await getAIResponse(
      text,
      conversationHistory,
      integration,
      hotelContext
    )

    // Save conversation state
    conversationHistory.push({ role: 'assistant', content: response })
    
    // Keep last 20 messages
    if (conversationHistory.length > 20) {
      conversationHistory = conversationHistory.slice(-20)
    }

    await prisma.messengerSession.upsert({
      where: { senderId },
      update: { state: JSON.stringify({ messages: conversationHistory }) },
      create: { senderId, state: JSON.stringify({ messages: conversationHistory }) }
    })

    // Send response
    await sendMessage(senderId, response, integration.pageAccessToken, integration.pageId)
    
    // Update sent count
    await prisma.facebookIntegration.update({
      where: { pageId: integration.pageId },
      data: { messagesSent: { increment: 1 } }
    })

  } catch (error) {
    console.error('[AI] Error:', error)
    // Fallback to simple response
    const fallback = getFallbackResponse(text)
    await sendMessage(senderId, fallback, integration.pageAccessToken, integration.pageId)
  }
}

async function buildHotelContext(orgId: string) {
  try {
    // Get rooms
    const rooms = await prisma.hotelRoom.findMany({
      where: { tenantId: orgId }
    })

    // Group by type
    const roomsByType: Record<string, { count: number; price: number }> = {}
    for (const room of rooms) {
      if (!roomsByType[room.roomType]) {
        roomsByType[room.roomType] = { count: 0, price: Number(room.basePrice) }
      }
      roomsByType[room.roomType].count++
    }

    const roomInfo = Object.entries(roomsByType)
      .map(([type, info]) => `- ${type}: ${info.price}₾/ღამე (${info.count} ოთახი)`)
      .join('\n')

    // Get services
    const services = await prisma.hotelService.findMany({
      where: { organizationId: orgId, isActive: true }
    })

    const servicesInfo = services.length > 0
      ? services.map(s => `- ${s.name}: ${s.price}₾`).join('\n')
      : `- ლუდის სპა: ${HOTEL_CONFIG.services.beerSpa.price}₾\n- ლუდის დეგუსტაცია: ${HOTEL_CONFIG.services.beerTasting.price}₾`

    return { roomInfo: roomInfo || 'ოთახები: დარეკეთ ფასისთვის', servicesInfo }
  } catch (error) {
    console.error('[Context] Error:', error)
    return { roomInfo: '', servicesInfo: '' }
  }
}

async function getAIResponse(
  message: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  integration: any,
  context: { roomInfo: string; servicesInfo: string }
): Promise<string> {
  
  // Decrypt API key
  let apiKey = integration.aiApiKey
  try {
    apiKey = Buffer.from(apiKey, 'base64').toString('utf-8')
  } catch {
    // Already plain text
  }

  // Build system prompt
  const personalityMap: Record<string, string> = {
    professional: 'Be formal, polite, and business-like.',
    friendly: 'Be warm, welcoming, and helpful. Use a conversational but respectful tone.',
    casual: 'Be relaxed and informal. Use simple, everyday language.'
  }

  const systemPrompt = `You are an AI assistant for "Brewery House & Beer Spa" hotel in Georgia.

HOTEL INFO:
- Address: ${HOTEL_CONFIG.address}
- Phone: ${HOTEL_CONFIG.phone}
- Email: ${HOTEL_CONFIG.email}
- Website: ${HOTEL_CONFIG.website}

ROOMS & PRICES:
${context.roomInfo}

SERVICES:
${context.servicesInfo}

UNIQUE FEATURES:
- Traditional Georgian Qvevri beer brewed on-site
- Beer Spa - unique beer bath experience
- Near Vardzia cave monastery (30 min drive)

PERSONALITY: ${personalityMap[integration.aiPersonality] || personalityMap.friendly}

LANGUAGES: Detect the guest's language and respond in the same language. You speak Georgian, English, and Russian.

RULES:
- Keep responses under 200 words (Facebook chat)
- Be helpful and proactive
- Provide phone number for complex questions
- Today: ${new Date().toLocaleDateString('ka-GE')}
`

  try {
    if (integration.aiProvider === 'claude') {
      // Dynamic import to avoid build errors if not installed
      const { default: Anthropic } = await import('@anthropic-ai/sdk')
      
      const anthropic = new Anthropic({ apiKey })
      
      const response = await anthropic.messages.create({
        model: integration.aiModel || 'claude-3-5-haiku-20241022',
        max_tokens: 500,
        system: systemPrompt,
        messages: history.slice(-10).map(m => ({
          role: m.role,
          content: m.content
        }))
      })

      const textContent = response.content.find(c => c.type === 'text')
      return textContent?.text || getFallbackResponse(message)
      
    } else if (integration.aiProvider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: integration.aiModel || 'gpt-4o-mini',
          max_tokens: 500,
          messages: [
            { role: 'system', content: systemPrompt },
            ...history.slice(-10)
          ]
        })
      })
      
      const data = await response.json()
      return data.choices?.[0]?.message?.content || getFallbackResponse(message)
    }
  } catch (error) {
    console.error('[AI API] Error:', error)
  }

  return getFallbackResponse(message)
}

function getFallbackResponse(message: string): string {
  const lower = message.toLowerCase()
  
  if (lower.includes('გამარჯობა') || lower.includes('hello') || lower.includes('привет')) {
    return `გამარჯობა! 👋 მოგესალმებით Brewery House & Beer Spa-ში!\n\nრით შემიძლია დაგეხმაროთ?\n\n📞 ${HOTEL_CONFIG.phone}`
  }
  
  if (lower.includes('ფას') || lower.includes('price') || lower.includes('цен')) {
    return `💰 ფასები:\n\n🍺 ლუდის სპა: ${HOTEL_CONFIG.services.beerSpa.price}₾\n🍻 დეგუსტაცია: ${HOTEL_CONFIG.services.beerTasting.price}₾\n\n📞 დაჯავშნა: ${HOTEL_CONFIG.phone}`
  }
  
  if (lower.includes('სპა') || lower.includes('spa')) {
    return `🍺 ლუდის სპა\n\n${HOTEL_CONFIG.services.beerSpa.ka.description}\n\n💰 ${HOTEL_CONFIG.services.beerSpa.price}₾\n⏱️ ${HOTEL_CONFIG.services.beerSpa.durationMinutes} წუთი\n\n📞 ${HOTEL_CONFIG.phone}`
  }
  
  if (lower.includes('კონტაქტ') || lower.includes('contact')) {
    return `📞 კონტაქტი:\n\n📱 ${HOTEL_CONFIG.phone}\n📧 ${HOTEL_CONFIG.email}\n📍 ${HOTEL_CONFIG.address}`
  }
  
  return `მადლობა მოწერისთვის! 😊\n\nრით შემიძლია დაგეხმაროთ?\n\n📞 ${HOTEL_CONFIG.phone}`
}

// ============================================
// MENU-BASED MESSAGE HANDLER (Original)
// ============================================

type Language = 'ka' | 'en' | 'ru'

interface ConversationState {
  lang: Language
  step: 'menu' | 'checkin' | 'checkout' | 'guests' | 'name' | 'phone' | 'confirm'
  checkIn?: string
  checkOut?: string
  guests?: number
  guestName?: string
  guestPhone?: string
  roomId?: string
}

const menuConversations = new Map<string, ConversationState>()

async function handleMenuMessage(
  senderId: string, 
  text: string, 
  integration: any,
  orgId: string
) {
  // Get or create state
  let state = menuConversations.get(senderId) || { lang: 'ka' as Language, step: 'menu' as const }
  
  // Detect language
  if (text.toLowerCase() === 'en' || text.toLowerCase() === 'english') {
    state.lang = 'en'
    state.step = 'menu'
  } else if (text.toLowerCase() === 'ru' || text.toLowerCase() === 'russian' || text.toLowerCase() === 'русский') {
    state.lang = 'ru'
    state.step = 'menu'
  } else if (text.toLowerCase() === 'ka' || text.toLowerCase() === 'geo' || text.toLowerCase() === 'ქართული') {
    state.lang = 'ka'
    state.step = 'menu'
  }
  
  // Process message
  const response = await processMenuMessage(senderId, text, state, orgId)
  
  // Send response
  await sendMessage(senderId, response, integration.pageAccessToken, integration.pageId)
  
  // Update sent count
  await prisma.facebookIntegration.update({
    where: { pageId: integration.pageId },
    data: { messagesSent: { increment: 1 } }
  })
}

async function processMenuMessage(
  senderId: string, 
  text: string, 
  state: ConversationState, 
  orgId: string
): Promise<string> {
  const lower = text.toLowerCase().trim()
  const msg = MESSAGES[state.lang]
  
  // Cancel
  if (lower === '0' || lower === 'cancel' || lower === 'გაუქმება' || lower === 'отмена') {
    menuConversations.delete(senderId)
    return msg.bookingCancelled
  }
  
  // Menu
  if (state.step === 'menu') {
    // Greetings
    if (isGreeting(lower)) {
      return msg.welcome('Brewery House & Beer Spa')
    }
    
    // Commands
    if (lower === '1' || lower.includes('ჯავშ') || lower.includes('book') || lower.includes('брон')) {
      state.step = 'checkin'
      menuConversations.set(senderId, state)
      return msg.bookingStart
    }
    
    if (lower === '2' || lower.includes('ფას') || lower.includes('price') || lower.includes('цен')) {
      const price = await getRoomPrice(orgId)
      return msg.prices(price)
    }
    
    if (lower === '3' || lower.includes('სპა') || lower.includes('spa')) {
      return msg.beerSpa()
    }
    
    if (lower === '4' || lower.includes('დეგუსტ') || lower.includes('tast') || lower.includes('дегуст')) {
      return msg.beerTasting()
    }
    
    if (lower === '5' || lower.includes('კონტაქ') || lower.includes('contact') || lower.includes('контакт')) {
      return msg.contact()
    }
    
    if (lower === '6' || lower.includes('ოთახ') || lower.includes('room') || lower.includes('номер') || lower.includes('availab')) {
      const avail = await getAvailability(orgId)
      return msg.availability(avail.available, avail.total)
    }
    
    return msg.unknown('Brewery House & Beer Spa')
  }
  
  // Booking flow
  if (state.step === 'checkin') {
    const date = parseDate(text, state.lang)
    if (!date) return msg.invalidDate
    state.checkIn = date
    state.step = 'checkout'
    menuConversations.set(senderId, state)
    return msg.askCheckout(date)
  }
  
  if (state.step === 'checkout') {
    const date = parseDate(text, state.lang)
    if (!date) return msg.invalidDate
    state.checkOut = date
    state.step = 'guests'
    menuConversations.set(senderId, state)
    return msg.askGuests(date)
  }
  
  if (state.step === 'guests') {
    const num = parseInt(text)
    if (isNaN(num) || num < 1 || num > 10) return msg.invalidGuests
    state.guests = num
    state.step = 'name'
    menuConversations.set(senderId, state)
    return msg.askName(num)
  }
  
  if (state.step === 'name') {
    if (text.length < 3) return msg.invalidName
    state.guestName = text
    state.step = 'phone'
    menuConversations.set(senderId, state)
    return msg.askPhone(text)
  }
  
  if (state.step === 'phone') {
    const phone = text.replace(/\s/g, '')
    if (phone.length < 9) return msg.invalidPhone
    state.guestPhone = phone
    
    // Check availability
    const avail = await checkRoomAvailability(orgId, state.checkIn!, state.checkOut!)
    if (!avail.available) {
      menuConversations.delete(senderId)
      return msg.noRooms(state.checkIn!, state.checkOut!)
    }
    
    state.roomId = avail.roomId
    state.step = 'confirm'
    menuConversations.set(senderId, state)
    
    const pricing = await calculatePrice(orgId, state.checkIn!, state.checkOut!)
    return msg.confirmBooking(state, avail.roomNumber!, pricing.total)
  }
  
  if (state.step === 'confirm') {
    if (isYes(text, state.lang)) {
      const result = await createReservation(orgId, state)
      menuConversations.delete(senderId)
      
      if (result.success) {
        // Update booking count
        await prisma.facebookIntegration.updateMany({
          where: { organizationId: orgId },
          data: { bookingsCreated: { increment: 1 } }
        })
        return msg.bookingSuccess(result.reservationId!, state.checkIn!, state.checkOut!)
      }
      return msg.bookingFailed(result.error || 'Error')
    }
    
    if (isNo(text, state.lang)) {
      menuConversations.delete(senderId)
      return msg.bookingCancelled
    }
    
    return msg.askConfirm
  }
  
  return msg.unknown('Brewery House & Beer Spa')
}

// ============================================
// MESSAGES
// ============================================

const MESSAGES = {
  ka: {
    welcome: (name: string) => `გამარჯობა! 👋 მოგესალმებით ${name}-ში!\n\n1️⃣ ჯავშანი\n2️⃣ ფასები\n3️⃣ 🍺 სპა\n4️⃣ 🍻 დეგუსტაცია\n5️⃣ კონტაქტი\n6️⃣ ოთახები\n\n🇬🇧 EN | 🇷🇺 RU`,
    beerSpa: () => `🍺 ლუდის სპა\n\n${HOTEL_CONFIG.services.beerSpa.ka.description}\n\n💰 ${HOTEL_CONFIG.services.beerSpa.price}₾\n⏱️ ${HOTEL_CONFIG.services.beerSpa.durationMinutes} წუთი\n\n📞 ${HOTEL_CONFIG.phone}`,
    beerTasting: () => `🍻 ${HOTEL_CONFIG.services.beerTasting.ka.name}\n\n${HOTEL_CONFIG.services.beerTasting.ka.description}\n\n💰 ${HOTEL_CONFIG.services.beerTasting.price}₾\n\n📞 ${HOTEL_CONFIG.phone}`,
    prices: (p: number) => `💰 ფასები:\n\n🛏️ ოთახი: ${p}₾/ღამე\n🍺 სპა: ${HOTEL_CONFIG.services.beerSpa.price}₾\n🍻 დეგუსტაცია: ${HOTEL_CONFIG.services.beerTasting.price}₾\n\n📅 ჯავშანი - "1"`,
    contact: () => `📞 კონტაქტი:\n\n📱 ${HOTEL_CONFIG.phone}\n📧 ${HOTEL_CONFIG.email}\n📍 ${HOTEL_CONFIG.address}`,
    bookingStart: '📅 შემოსვლის თარიღი?\n\nმაგ: 15.02.2026\n\n❌ გაუქმება - "0"',
    askCheckout: (d: string) => `✅ შემოსვლა: ${d}\n\n📅 გასვლის თარიღი?`,
    askGuests: (d: string) => `✅ გასვლა: ${d}\n\n👥 რამდენი სტუმარი?`,
    askName: (n: number) => `✅ სტუმრები: ${n}\n\n👤 სახელი და გვარი?`,
    askPhone: (n: string) => `✅ სახელი: ${n}\n\n📱 ტელეფონი?`,
    confirmBooking: (s: any, r: string, t: number) => `📋 ჯავშანი:\n\n📅 ${s.checkIn} - ${s.checkOut}\n👥 ${s.guests}\n👤 ${s.guestName}\n📱 ${s.guestPhone}\n🛏️ ${r}\n💰 ${t}₾\n\n✅ "დიახ" | ❌ "არა"`,
    bookingSuccess: (id: string, ci: string, co: string) => `🎉 შეიქმნა!\n\n📋 ${id}\n📅 ${ci} - ${co}\n\nმადლობა! 🙏`,
    bookingFailed: (e: string) => `❌ ${e}\n\n📞 ${HOTEL_CONFIG.phone}`,
    bookingCancelled: '❌ გაუქმდა.\n\nახლიდან - "1"',
    noRooms: (ci: string, co: string) => `❌ ${ci}-${co} ოთახი არ არის.\n\n📅 სხვა თარიღი - "1"`,
    invalidDate: '❌ თარიღი?\n\nმაგ: 15.02.2026',
    invalidGuests: '❌ სტუმრები (1-10)',
    invalidName: '❌ სახელი?',
    invalidPhone: '❌ ტელეფონი?',
    askConfirm: '✅ "დიახ" ან ❌ "არა"',
    unknown: (n: string) => `🤔 ვერ გავიგე.\n\n1️⃣ ჯავშანი\n2️⃣ ფასები\n3️⃣ სპა\n4️⃣ დეგუსტაცია\n5️⃣ კონტაქტი`,
    availability: (a: number, t: number) => `🏨 თავისუფალია: ${a}/${t}\n\n📅 ჯავშანი - "1"`
  },
  en: {
    welcome: (name: string) => `Hello! 👋 Welcome to ${name}!\n\n1️⃣ Book\n2️⃣ Prices\n3️⃣ 🍺 Spa\n4️⃣ 🍻 Tasting\n5️⃣ Contact\n6️⃣ Rooms\n\n🇬🇪 KA | 🇷🇺 RU`,
    beerSpa: () => `🍺 Beer Spa\n\n${HOTEL_CONFIG.services.beerSpa.en.description}\n\n💰 ${HOTEL_CONFIG.services.beerSpa.price}₾\n⏱️ ${HOTEL_CONFIG.services.beerSpa.durationMinutes} min\n\n📞 ${HOTEL_CONFIG.phone}`,
    beerTasting: () => `🍻 ${HOTEL_CONFIG.services.beerTasting.en.name}\n\n${HOTEL_CONFIG.services.beerTasting.en.description}\n\n💰 ${HOTEL_CONFIG.services.beerTasting.price}₾\n\n📞 ${HOTEL_CONFIG.phone}`,
    prices: (p: number) => `💰 Prices:\n\n🛏️ Room: ${p}₾/night\n🍺 Spa: ${HOTEL_CONFIG.services.beerSpa.price}₾\n🍻 Tasting: ${HOTEL_CONFIG.services.beerTasting.price}₾\n\n📅 Book - "1"`,
    contact: () => `📞 Contact:\n\n📱 ${HOTEL_CONFIG.phone}\n📧 ${HOTEL_CONFIG.email}\n📍 ${HOTEL_CONFIG.address}`,
    bookingStart: '📅 Check-in date?\n\ne.g.: 15.02.2026\n\n❌ Cancel - "0"',
    askCheckout: (d: string) => `✅ Check-in: ${d}\n\n📅 Check-out?`,
    askGuests: (d: string) => `✅ Check-out: ${d}\n\n👥 Guests?`,
    askName: (n: number) => `✅ Guests: ${n}\n\n👤 Full name?`,
    askPhone: (n: string) => `✅ Name: ${n}\n\n📱 Phone?`,
    confirmBooking: (s: any, r: string, t: number) => `📋 Booking:\n\n📅 ${s.checkIn} - ${s.checkOut}\n👥 ${s.guests}\n👤 ${s.guestName}\n📱 ${s.guestPhone}\n🛏️ ${r}\n💰 ${t}₾\n\n✅ "Yes" | ❌ "No"`,
    bookingSuccess: (id: string, ci: string, co: string) => `🎉 Booked!\n\n📋 ${id}\n📅 ${ci} - ${co}\n\nThank you! 🙏`,
    bookingFailed: (e: string) => `❌ ${e}\n\n📞 ${HOTEL_CONFIG.phone}`,
    bookingCancelled: '❌ Cancelled.\n\nBook again - "1"',
    noRooms: (ci: string, co: string) => `❌ No rooms ${ci}-${co}.\n\n📅 Try other dates - "1"`,
    invalidDate: '❌ Date?\n\ne.g.: 15.02.2026',
    invalidGuests: '❌ Guests (1-10)',
    invalidName: '❌ Name?',
    invalidPhone: '❌ Phone?',
    askConfirm: '✅ "Yes" or ❌ "No"',
    unknown: (n: string) => `🤔 Not understood.\n\n1️⃣ Book\n2️⃣ Prices\n3️⃣ Spa\n4️⃣ Tasting\n5️⃣ Contact`,
    availability: (a: number, t: number) => `🏨 Available: ${a}/${t}\n\n📅 Book - "1"`
  },
  ru: {
    welcome: (name: string) => `Привет! 👋 Добро пожаловать в ${name}!\n\n1️⃣ Бронь\n2️⃣ Цены\n3️⃣ 🍺 СПА\n4️⃣ 🍻 Дегустация\n5️⃣ Контакт\n6️⃣ Номера\n\n🇬🇪 KA | 🇬🇧 EN`,
    beerSpa: () => `🍺 Пивное СПА\n\n${HOTEL_CONFIG.services.beerSpa.ru.description}\n\n💰 ${HOTEL_CONFIG.services.beerSpa.price}₾\n⏱️ ${HOTEL_CONFIG.services.beerSpa.durationMinutes} мин\n\n📞 ${HOTEL_CONFIG.phone}`,
    beerTasting: () => `🍻 ${HOTEL_CONFIG.services.beerTasting.ru.name}\n\n${HOTEL_CONFIG.services.beerTasting.ru.description}\n\n💰 ${HOTEL_CONFIG.services.beerTasting.price}₾\n\n📞 ${HOTEL_CONFIG.phone}`,
    prices: (p: number) => `💰 Цены:\n\n🛏️ Номер: ${p}₾/ночь\n🍺 СПА: ${HOTEL_CONFIG.services.beerSpa.price}₾\n🍻 Дегустация: ${HOTEL_CONFIG.services.beerTasting.price}₾\n\n📅 Бронь - "1"`,
    contact: () => `📞 Контакт:\n\n📱 ${HOTEL_CONFIG.phone}\n📧 ${HOTEL_CONFIG.email}\n📍 ${HOTEL_CONFIG.address}`,
    bookingStart: '📅 Дата заезда?\n\nнапр: 15.02.2026\n\n❌ Отмена - "0"',
    askCheckout: (d: string) => `✅ Заезд: ${d}\n\n📅 Выезд?`,
    askGuests: (d: string) => `✅ Выезд: ${d}\n\n👥 Гостей?`,
    askName: (n: number) => `✅ Гостей: ${n}\n\n👤 ФИО?`,
    askPhone: (n: string) => `✅ Имя: ${n}\n\n📱 Телефон?`,
    confirmBooking: (s: any, r: string, t: number) => `📋 Бронь:\n\n📅 ${s.checkIn} - ${s.checkOut}\n👥 ${s.guests}\n👤 ${s.guestName}\n📱 ${s.guestPhone}\n🛏️ ${r}\n💰 ${t}₾\n\n✅ "Да" | ❌ "Нет"`,
    bookingSuccess: (id: string, ci: string, co: string) => `🎉 Забронировано!\n\n📋 ${id}\n📅 ${ci} - ${co}\n\nСпасибо! 🙏`,
    bookingFailed: (e: string) => `❌ ${e}\n\n📞 ${HOTEL_CONFIG.phone}`,
    bookingCancelled: '❌ Отменено.\n\nСнова - "1"',
    noRooms: (ci: string, co: string) => `❌ Нет номеров ${ci}-${co}.\n\n📅 Другие даты - "1"`,
    invalidDate: '❌ Дата?\n\nнапр: 15.02.2026',
    invalidGuests: '❌ Гостей (1-10)',
    invalidName: '❌ ФИО?',
    invalidPhone: '❌ Телефон?',
    askConfirm: '✅ "Да" или ❌ "Нет"',
    unknown: (n: string) => `🤔 Не понял.\n\n1️⃣ Бронь\n2️⃣ Цены\n3️⃣ СПА\n4️⃣ Дегустация\n5️⃣ Контакт`,
    availability: (a: number, t: number) => `🏨 Свободно: ${a}/${t}\n\n📅 Бронь - "1"`
  }
}

// ============================================
// HELPERS
// ============================================

function isGreeting(t: string): boolean {
  return ['გამარჯობა', 'hello', 'hi', 'привет', 'здравствуй', 'салам', 'start', 'menu'].some(g => t.includes(g))
}

function isYes(t: string, lang: Language): boolean {
  const l = t.toLowerCase()
  if (lang === 'ka') return ['დიახ', 'კი', 'yes'].some(w => l.includes(w))
  if (lang === 'en') return ['yes', 'y', 'ok'].some(w => l.includes(w))
  if (lang === 'ru') return ['да', 'yes', 'ок'].some(w => l.includes(w))
  return false
}

function isNo(t: string, lang: Language): boolean {
  const l = t.toLowerCase()
  if (lang === 'ka') return ['არა', 'no'].some(w => l.includes(w))
  if (lang === 'en') return ['no', 'n'].some(w => l.includes(w))
  if (lang === 'ru') return ['нет', 'no'].some(w => l.includes(w))
  return false
}

function parseDate(text: string, lang: Language): string | null {
  const today = new Date()
  const lower = text.toLowerCase()
  
  if (lower.includes('ხვალ') || lower === 'tomorrow' || lower === 'завтра') {
    const d = new Date(today)
    d.setDate(d.getDate() + 1)
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`
  }
  
  const match = text.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/)
  if (match) {
    return `${match[1].padStart(2, '0')}.${match[2].padStart(2, '0')}.${match[3]}`
  }
  
  const match2 = text.match(/(\d{1,2})[.\/-](\d{1,2})/)
  if (match2) {
    return `${match2[1].padStart(2, '0')}.${match2[2].padStart(2, '0')}.${today.getFullYear()}`
  }
  
  return null
}

async function getRoomPrice(orgId: string): Promise<number> {
  try {
    const room = await prisma.hotelRoom.findFirst({
      where: { tenantId: orgId },
      orderBy: { basePrice: 'asc' }
    })
    return room?.basePrice ? Number(room.basePrice) : 100
  } catch { return 100 }
}

async function getAvailability(orgId: string): Promise<{ available: number; total: number }> {
  try {
    const rooms = await prisma.hotelRoom.findMany({ where: { tenantId: orgId } })
    const today = new Date()
    const reservations = await prisma.hotelReservation.findMany({
      where: {
        tenantId: orgId,
        checkOut: { gte: today },
        status: { in: ['confirmed', 'checked_in', 'CONFIRMED', 'CHECKED_IN'] }
      }
    })
    const occupied = new Set(reservations.map(r => r.roomId))
    return { available: rooms.length - occupied.size, total: rooms.length }
  } catch { return { available: 0, total: 0 } }
}

async function checkRoomAvailability(orgId: string, checkIn: string, checkOut: string): Promise<{ available: boolean; roomId?: string; roomNumber?: string }> {
  try {
    const [d1, m1, y1] = checkIn.split('.').map(Number)
    const [d2, m2, y2] = checkOut.split('.').map(Number)
    const ciDate = new Date(y1, m1 - 1, d1)
    const coDate = new Date(y2, m2 - 1, d2)
    
    const rooms = await prisma.hotelRoom.findMany({ where: { tenantId: orgId } })
    const reservations = await prisma.hotelReservation.findMany({
      where: {
        tenantId: orgId,
        checkIn: { lt: coDate },
        checkOut: { gt: ciDate },
        status: { in: ['confirmed', 'checked_in', 'pending', 'CONFIRMED', 'CHECKED_IN', 'PENDING'] }
      }
    })
    
    const occupied = new Set(reservations.map(r => r.roomId))
    const available = rooms.find(r => !occupied.has(r.id))
    
    return available ? { available: true, roomId: available.id, roomNumber: available.roomNumber } : { available: false }
  } catch { return { available: false } }
}

async function calculatePrice(orgId: string, checkIn: string, checkOut: string): Promise<{ total: number; nights: number }> {
  try {
    const [d1, m1, y1] = checkIn.split('.').map(Number)
    const [d2, m2, y2] = checkOut.split('.').map(Number)
    const ciDate = new Date(y1, m1 - 1, d1)
    const coDate = new Date(y2, m2 - 1, d2)
    
    const nights = Math.max(1, Math.ceil((coDate.getTime() - ciDate.getTime()) / (1000 * 60 * 60 * 24)))
    const perNight = await getRoomPrice(orgId)
    
    return { total: perNight * nights, nights }
  } catch { return { total: 100, nights: 1 } }
}

async function createReservation(orgId: string, state: ConversationState): Promise<{ success: boolean; reservationId?: string; error?: string }> {
  try {
    const [d1, m1, y1] = state.checkIn!.split('.').map(Number)
    const [d2, m2, y2] = state.checkOut!.split('.').map(Number)
    const ciDate = new Date(y1, m1 - 1, d1)
    const coDate = new Date(y2, m2 - 1, d2)
    
    const avail = await checkRoomAvailability(orgId, state.checkIn!, state.checkOut!)
    if (!avail.available || !avail.roomId) return { success: false, error: 'No rooms' }
    
    const pricing = await calculatePrice(orgId, state.checkIn!, state.checkOut!)
    
    const reservation = await prisma.hotelReservation.create({
      data: {
        tenantId: orgId,
        roomId: avail.roomId,
        guestName: state.guestName!,
        guestPhone: state.guestPhone || '',
        checkIn: ciDate,
        checkOut: coDate,
        adults: state.guests || 2,
        totalAmount: pricing.total,
        paidAmount: 0,
        status: 'confirmed',
        source: 'Facebook Messenger'
      }
    })
    
    return { success: true, reservationId: reservation.id.slice(-8).toUpperCase() }
  } catch (e) {
    console.error('[Reservation] Error:', e)
    return { success: false, error: 'Error' }
  }
}

async function sendMessage(recipientId: string, text: string, accessToken: string, pageId?: string) {
  if (!accessToken) return
  
  // Split long messages
  const chunks = text.length > 1900 ? splitText(text, 1900) : [text]
  
  for (const chunk of chunks) {
    try {
      await fetch(`https://graph.facebook.com/v18.0/${pageId || 'me'}/messages?access_token=${accessToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text: chunk }
        })
      })
    } catch (e) {
      console.error('[Send] Error:', e)
    }
  }
}

function splitText(text: string, maxLen: number): string[] {
  const chunks: string[] = []
  let remaining = text
  
  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining)
      break
    }
    let idx = remaining.lastIndexOf('\n', maxLen)
    if (idx < maxLen / 2) idx = remaining.lastIndexOf(' ', maxLen)
    if (idx < 0) idx = maxLen
    chunks.push(remaining.substring(0, idx))
    remaining = remaining.substring(idx).trim()
  }
  
  return chunks
}