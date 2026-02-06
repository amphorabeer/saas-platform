import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// ============================================
// CONFIGURATION
// ============================================

const HOTEL_CONFIG = {
  phone: '+995 599 946 500',  // სასტუმროს ტელეფონი
  email: 'info@gizavi.ge',
  address: 'სოფ. გიზავი, გურჯაანის რაიონი',
  checkInTime: '14:00',
  checkOutTime: '12:00',
  
  // სერვისების ფასები
  services: {
    beerSpa: {
      price: 150,
      durationMinutes: 60,
      nameKa: 'ლუდის სპა',
      nameEn: 'Beer Spa',
      descriptionKa: 'რელაქსაცია ლუდის აბაზანაში, სასარგებლო მინერალებით და ვიტამინებით',
      descriptionEn: 'Relaxation in a beer bath, rich in minerals and vitamins'
    },
    beerTasting: {
      price: 30,
      durationMinutes: 45,
      nameKa: 'ლუდის დეგუსტაცია',
      nameEn: 'Beer Tasting',
      descriptionKa: '4 სხვადასხვა ხელნაკეთი ლუდის დეგუსტაცია გიდის თანხლებით',
      descriptionEn: 'Guided tasting of 4 different craft beers'
    }
  }
}

// ============================================
// MULTILINGUAL MESSAGES
// ============================================

const MESSAGES = {
  ka: {
    welcome: (pageName: string) => 
      `გამარჯობა! 👋 მოგესალმებით ${pageName}-ში!\n\n` +
      `რით შემიძლია დაგეხმაროთ?\n\n` +
      `1️⃣ ჯავშანი - ოთახის დაჯავშნა\n` +
      `2️⃣ ფასები - ფასების ნახვა\n` +
      `3️⃣ სპა - ლუდის სპა 🍺\n` +
      `4️⃣ დეგუსტაცია - ლუდის დეგუსტაცია 🍻\n` +
      `5️⃣ კონტაქტი - საკონტაქტო ინფორმაცია\n\n` +
      `🇬🇧 For English, type "EN"`,
    
    prices: (basePrice: number) =>
      `💰 ფასები:\n\n` +
      `🛏️ ოთახი: ${basePrice}₾/ღამე\n` +
      `🍺 ლუდის სპა: ${HOTEL_CONFIG.services.beerSpa.price}₾\n` +
      `🍻 დეგუსტაცია: ${HOTEL_CONFIG.services.beerTasting.price}₾\n\n` +
      `📅 შესახლება: ${HOTEL_CONFIG.checkInTime}\n` +
      `📅 გამოსახლება: ${HOTEL_CONFIG.checkOutTime}\n\n` +
      `დაჯავშნისთვის დაწერეთ "ჯავშანი"`,
    
    contact:
      `📞 საკონტაქტო ინფორმაცია:\n\n` +
      `📱 ტელეფონი: ${HOTEL_CONFIG.phone}\n` +
      `📧 ელფოსტა: ${HOTEL_CONFIG.email}\n` +
      `📍 მისამართი: ${HOTEL_CONFIG.address}\n\n` +
      `მოგვწერეთ ან დაგვირეკეთ! 🙂`,
    
    beerSpa:
      `🍺 ლუდის სპა\n\n` +
      `${HOTEL_CONFIG.services.beerSpa.descriptionKa}\n\n` +
      `⏱️ ხანგრძლივობა: ${HOTEL_CONFIG.services.beerSpa.durationMinutes} წუთი\n` +
      `💰 ფასი: ${HOTEL_CONFIG.services.beerSpa.price}₾\n\n` +
      `სპა მოიცავს:\n` +
      `• ლუდის აბაზანა\n` +
      `• ულიმიტო ქვევრის ლუდი\n\n` +
      `დაჯავშნისთვის დაგვიკავშირდით:\n` +
      `📱 ${HOTEL_CONFIG.phone}`,
    
    beerTasting:
      `🍻 ლუდის დეგუსტაცია\n\n` +
      `${HOTEL_CONFIG.services.beerTasting.descriptionKa}\n\n` +
      `⏱️ ხანგრძლივობა: ${HOTEL_CONFIG.services.beerTasting.durationMinutes} წუთი\n` +
      `💰 ფასი: ${HOTEL_CONFIG.services.beerTasting.price}₾\n\n` +
      `დეგუსტაცია მოიცავს:\n` +
      `• 4 სხვადასხვა ლუდი\n` +
      `• ლუდსახარში\n` +
      `• გიდის მოყოლა ლუდის ისტორიაზე\n\n` +
      `დაჯავშნისთვის დაგვიკავშირდით:\n` +
      `📱 ${HOTEL_CONFIG.phone}`,
    
    bookingStart:
      `📅 ჯავშნის შექმნა\n\n` +
      `შემოსვლის თარიღი?\n` +
      `(მაგ: 15.02.2026)\n\n` +
      `❌ გასაუქმებლად დაწერეთ "გაუქმება"`,
    
    askCheckout: (checkIn: string) =>
      `✅ შემოსვლა: ${checkIn}\n\n📅 გასვლის თარიღი?`,
    
    askGuests: (checkOut: string) =>
      `✅ გასვლა: ${checkOut}\n\n👥 რამდენი სტუმარი?`,
    
    askName: (guests: number) =>
      `✅ სტუმრები: ${guests}\n\n👤 თქვენი სახელი და გვარი?`,
    
    askPhone: (name: string) =>
      `✅ სახელი: ${name}\n\n📱 ტელეფონის ნომერი?`,
    
    confirmBooking: (state: ConversationState, total: number) =>
      `📋 ჯავშნის დეტალები:\n\n` +
      `📅 ${state.checkIn} - ${state.checkOut}\n` +
      `👥 ${state.guests} სტუმარი\n` +
      `👤 ${state.guestName}\n` +
      `📱 ${state.guestPhone}\n` +
      `💰 ჯამი: ${total}₾\n\n` +
      `დაადასტურეთ ჯავშანი?\n` +
      `✅ "დიახ" - დადასტურება\n` +
      `❌ "არა" - გაუქმება`,
    
    bookingSuccess: (reservationId: string, checkIn: string, checkOut: string) =>
      `🎉 ჯავშანი წარმატებით შეიქმნა!\n\n` +
      `📋 ჯავშნის ნომერი: ${reservationId}\n` +
      `📅 ${checkIn} - ${checkOut}\n\n` +
      `მალე დაგიკავშირდებით დასადასტურებლად.\n\n` +
      `მადლობა! 🙏`,
    
    bookingFailed: (error: string) =>
      `❌ სამწუხაროდ, ჯავშანი ვერ შეიქმნა.\n\n${error}\n\n` +
      `გთხოვთ დაგვიკავშირდეთ ტელეფონით:\n📱 ${HOTEL_CONFIG.phone}`,
    
    bookingCancelled: `❌ ჯავშანი გაუქმებულია.\n\nახლიდან დასაწყებად დაწერეთ "ჯავშანი"`,
    
    invalidDate: `❌ თარიღი ვერ გავიგე.\n\nგთხოვთ მიუთითეთ ფორმატში: 15.02.2026`,
    invalidGuests: `❌ გთხოვთ მიუთითეთ სტუმრების რაოდენობა (1-10)`,
    invalidName: `❌ გთხოვთ მიუთითეთ სრული სახელი და გვარი`,
    invalidPhone: `❌ გთხოვთ მიუთითეთ სწორი ტელეფონის ნომერი`,
    
    unknown:
      `🤔 ვერ გავიგე თქვენი მოთხოვნა.\n\n` +
      `აირჩიეთ ერთ-ერთი:\n` +
      `1️⃣ ჯავშანი\n` +
      `2️⃣ ფასები\n` +
      `3️⃣ სპა\n` +
      `4️⃣ დეგუსტაცია\n` +
      `5️⃣ კონტაქტი`
  },
  
  en: {
    welcome: (pageName: string) =>
      `Hello! 👋 Welcome to ${pageName}!\n\n` +
      `How can I help you?\n\n` +
      `1️⃣ Book - Room reservation\n` +
      `2️⃣ Prices - View prices\n` +
      `3️⃣ Spa - Beer Spa 🍺\n` +
      `4️⃣ Tasting - Beer Tasting 🍻\n` +
      `5️⃣ Contact - Contact information\n\n` +
      `🇬🇪 ქართულად - დაწერეთ "KA"`,
    
    prices: (basePrice: number) =>
      `💰 Prices:\n\n` +
      `🛏️ Room: ${basePrice}₾/night\n` +
      `🍺 Beer Spa: ${HOTEL_CONFIG.services.beerSpa.price}₾\n` +
      `🍻 Tasting: ${HOTEL_CONFIG.services.beerTasting.price}₾\n\n` +
      `📅 Check-in: ${HOTEL_CONFIG.checkInTime}\n` +
      `📅 Check-out: ${HOTEL_CONFIG.checkOutTime}\n\n` +
      `To book, type "book"`,
    
    contact:
      `📞 Contact Information:\n\n` +
      `📱 Phone: ${HOTEL_CONFIG.phone}\n` +
      `📧 Email: ${HOTEL_CONFIG.email}\n` +
      `📍 Address: ${HOTEL_CONFIG.address}\n\n` +
      `Feel free to call or message us! 🙂`,
    
    beerSpa:
      `🍺 Beer Spa\n\n` +
      `${HOTEL_CONFIG.services.beerSpa.descriptionEn}\n\n` +
      `⏱️ Duration: ${HOTEL_CONFIG.services.beerSpa.durationMinutes} minutes\n` +
      `💰 Price: ${HOTEL_CONFIG.services.beerSpa.price}₾\n\n` +
      `Includes:\n` +
      `• Beer bath\n` +
      `• Unlimited Qvevri beer\n\n` +
      `To book, contact us:\n` +
      `📱 ${HOTEL_CONFIG.phone}`,
    
    beerTasting:
      `🍻 Beer Tasting\n\n` +
      `${HOTEL_CONFIG.services.beerTasting.descriptionEn}\n\n` +
      `⏱️ Duration: ${HOTEL_CONFIG.services.beerTasting.durationMinutes} minutes\n` +
      `💰 Price: ${HOTEL_CONFIG.services.beerTasting.price}₾\n\n` +
      `Includes:\n` +
      `• 4 different beers\n` +
      `• Beer snacks\n` +
      `• Guided tour of beer history\n\n` +
      `To book, contact us:\n` +
      `📱 ${HOTEL_CONFIG.phone}`,
    
    bookingStart:
      `📅 Create Booking\n\n` +
      `Check-in date?\n` +
      `(e.g.: 15.02.2026)\n\n` +
      `❌ Type "cancel" to cancel`,
    
    askCheckout: (checkIn: string) =>
      `✅ Check-in: ${checkIn}\n\n📅 Check-out date?`,
    
    askGuests: (checkOut: string) =>
      `✅ Check-out: ${checkOut}\n\n👥 Number of guests?`,
    
    askName: (guests: number) =>
      `✅ Guests: ${guests}\n\n👤 Your full name?`,
    
    askPhone: (name: string) =>
      `✅ Name: ${name}\n\n📱 Phone number?`,
    
    confirmBooking: (state: ConversationState, total: number) =>
      `📋 Booking Details:\n\n` +
      `📅 ${state.checkIn} - ${state.checkOut}\n` +
      `👥 ${state.guests} guests\n` +
      `👤 ${state.guestName}\n` +
      `📱 ${state.guestPhone}\n` +
      `💰 Total: ${total}₾\n\n` +
      `Confirm booking?\n` +
      `✅ "Yes" - Confirm\n` +
      `❌ "No" - Cancel`,
    
    bookingSuccess: (reservationId: string, checkIn: string, checkOut: string) =>
      `🎉 Booking successfully created!\n\n` +
      `📋 Booking ID: ${reservationId}\n` +
      `📅 ${checkIn} - ${checkOut}\n\n` +
      `We will contact you shortly to confirm.\n\n` +
      `Thank you! 🙏`,
    
    bookingFailed: (error: string) =>
      `❌ Sorry, booking could not be created.\n\n${error}\n\n` +
      `Please contact us by phone:\n📱 ${HOTEL_CONFIG.phone}`,
    
    bookingCancelled: `❌ Booking cancelled.\n\nTo start again, type "book"`,
    
    invalidDate: `❌ Could not understand the date.\n\nPlease use format: 15.02.2026`,
    invalidGuests: `❌ Please enter number of guests (1-10)`,
    invalidName: `❌ Please enter your full name`,
    invalidPhone: `❌ Please enter a valid phone number`,
    
    unknown:
      `🤔 I didn't understand your request.\n\n` +
      `Choose one:\n` +
      `1️⃣ Book\n` +
      `2️⃣ Prices\n` +
      `3️⃣ Spa\n` +
      `4️⃣ Tasting\n` +
      `5️⃣ Contact`
  }
}

// ============================================
// TYPES
// ============================================

interface ConversationState {
  step: string
  language: 'ka' | 'en'
  checkIn?: string
  checkOut?: string
  guests?: number
  guestName?: string
  guestPhone?: string
}

// ============================================
// STATE MANAGEMENT (Database-backed for Serverless)
// ============================================

async function getConversationState(senderId: string): Promise<ConversationState | null> {
  try {
    // Use MessengerSession table or cache in a simple way
    const session = await prisma.messengerSession.findUnique({
      where: { senderId }
    })
    
    if (session && session.state) {
      // Check if session is not expired (30 min)
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)
      if (session.updatedAt > thirtyMinutesAgo) {
        return JSON.parse(session.state) as ConversationState
      }
    }
    return null
  } catch (error) {
    // Table might not exist yet, return null
    console.log('[Messenger] No session table or error:', error)
    return null
  }
}

async function setConversationState(senderId: string, state: ConversationState): Promise<void> {
  try {
    await prisma.messengerSession.upsert({
      where: { senderId },
      update: { 
        state: JSON.stringify(state),
        updatedAt: new Date()
      },
      create: {
        senderId,
        state: JSON.stringify(state),
        updatedAt: new Date()
      }
    })
  } catch (error) {
    console.log('[Messenger] Could not save session:', error)
  }
}

async function deleteConversationState(senderId: string): Promise<void> {
  try {
    await prisma.messengerSession.delete({
      where: { senderId }
    })
  } catch (error) {
    // Ignore if doesn't exist
  }
}

// ============================================
// WEBHOOK HANDLERS
// ============================================

// Facebook Webhook Verification (GET)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')
  
  console.log('[Messenger] Verification:', { mode, token, challenge })
  
  if (mode === 'subscribe' && token) {
    const integration = await prisma.facebookIntegration.findFirst({
      where: { verifyToken: token, isActive: true }
    })
    
    if (integration) {
      console.log('[Messenger] Verified for:', integration.pageName)
      return new NextResponse(challenge, { status: 200 })
    }
  }
  
  console.log('[Messenger] Verification failed!')
  return new NextResponse('Forbidden', { status: 403 })
}

// Facebook Webhook Events (POST)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[Messenger] Webhook event:', JSON.stringify(body, null, 2))
    
    if (body.object !== 'page') {
      return NextResponse.json({ status: 'ignored' })
    }
    
    for (const entry of body.entry || []) {
      const pageId = entry.id
      
      // Find integration for this page
      const integration = await prisma.facebookIntegration.findFirst({
        where: { pageId, isActive: true }
      })
      
      if (!integration) {
        console.log('[Messenger] No integration for page:', pageId)
        continue
      }
      
      // Update message count
      try {
        await prisma.facebookIntegration.update({
          where: { id: integration.id },
          data: { messagesReceived: { increment: 1 } }
        })
      } catch (e) {
        // Non-critical, continue
      }
      
      // Process messaging events
      for (const messaging of entry.messaging || []) {
        if (messaging.message?.text) {
          const senderId = messaging.sender.id
          const text = messaging.message.text.trim()
          
          console.log('[Messenger] Message from', senderId, ':', text)
          
          // Get or create conversation state from database
          let state = await getConversationState(senderId) || {
            step: 'menu',
            language: 'ka'
          }
          
          // Generate response
          const response = await processMessage(
            text,
            senderId,
            state,
            integration.organizationId,
            integration.pageName || 'სასტუმრო'
          )
          
          // Send response
          await sendMessage(senderId, response, integration.pageAccessToken)
        }
      }
    }
    
    return NextResponse.json({ status: 'ok' })
    
  } catch (error) {
    console.error('[Messenger] Webhook error:', error)
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}

// ============================================
// MESSAGE PROCESSING
// ============================================

async function processMessage(
  text: string,
  senderId: string,
  state: ConversationState,
  orgId: string,
  pageName: string
): Promise<string> {
  const lowerText = text.toLowerCase()
  const msg = MESSAGES[state.language]
  
  // Language switch
  if (lowerText === 'en' || lowerText === 'english') {
    state.language = 'en'
    state.step = 'menu'
    await setConversationState(senderId, state)
    return MESSAGES.en.welcome(pageName)
  }
  
  if (lowerText === 'ka' || lowerText === 'geo' || lowerText === 'ქართული') {
    state.language = 'ka'
    state.step = 'menu'
    await setConversationState(senderId, state)
    return MESSAGES.ka.welcome(pageName)
  }
  
  // Cancel booking
  if (lowerText === 'გაუქმება' || lowerText === 'cancel' || lowerText === 'menu') {
    await deleteConversationState(senderId)
    return msg.welcome(pageName)
  }
  
  // Handle booking flow
  if (state.step.startsWith('ask_')) {
    return await handleBookingFlow(text, senderId, state, orgId)
  }
  
  // Menu options (Georgian)
  if (state.language === 'ka') {
    if (matchesIntent(lowerText, ['გამარჯობა', 'hello', 'hi', 'start', 'menu', 'მენიუ'])) {
      return msg.welcome(pageName)
    }
    
    if (matchesIntent(lowerText, ['ჯავშანი', 'ჯავშნა', 'დაჯავშნა', 'book', 'booking', 'reserve', '1'])) {
      state.step = 'ask_checkin'
      await setConversationState(senderId, state)
      return msg.bookingStart
    }
    
    if (matchesIntent(lowerText, ['ფასი', 'ფასები', 'price', 'prices', 'რა ღირს', '2'])) {
      const basePrice = await getRoomBasePrice(orgId)
      return msg.prices(basePrice)
    }
    
    if (matchesIntent(lowerText, ['სპა', 'spa', 'ლუდის სპა', 'beer spa', '3'])) {
      return msg.beerSpa
    }
    
    if (matchesIntent(lowerText, ['დეგუსტაცია', 'tasting', 'ლუდის დეგუსტაცია', 'beer tasting', '4'])) {
      return msg.beerTasting
    }
    
    if (matchesIntent(lowerText, ['კონტაქტი', 'contact', 'ტელეფონი', 'phone', '5'])) {
      return msg.contact
    }
  }
  
  // Menu options (English)
  if (state.language === 'en') {
    if (matchesIntent(lowerText, ['hello', 'hi', 'start', 'menu'])) {
      return msg.welcome(pageName)
    }
    
    if (matchesIntent(lowerText, ['book', 'booking', 'reserve', 'reservation', '1'])) {
      state.step = 'ask_checkin'
      await setConversationState(senderId, state)
      return msg.bookingStart
    }
    
    if (matchesIntent(lowerText, ['price', 'prices', 'cost', 'rate', 'rates', '2'])) {
      const basePrice = await getRoomBasePrice(orgId)
      return msg.prices(basePrice)
    }
    
    if (matchesIntent(lowerText, ['spa', 'beer spa', '3'])) {
      return msg.beerSpa
    }
    
    if (matchesIntent(lowerText, ['tasting', 'beer tasting', '4'])) {
      return msg.beerTasting
    }
    
    if (matchesIntent(lowerText, ['contact', 'phone', 'email', 'address', '5'])) {
      return msg.contact
    }
  }
  
  return msg.unknown
}

async function handleBookingFlow(
  text: string,
  senderId: string,
  state: ConversationState,
  orgId: string
): Promise<string> {
  const msg = MESSAGES[state.language]
  
  switch (state.step) {
    case 'ask_checkin': {
      const checkIn = parseDate(text)
      if (!checkIn) {
        return msg.invalidDate
      }
      state.checkIn = checkIn
      state.step = 'ask_checkout'
      await setConversationState(senderId, state)
      return msg.askCheckout(checkIn)
    }
    
    case 'ask_checkout': {
      const checkOut = parseDate(text)
      if (!checkOut) {
        return msg.invalidDate
      }
      state.checkOut = checkOut
      state.step = 'ask_guests'
      await setConversationState(senderId, state)
      return msg.askGuests(checkOut)
    }
    
    case 'ask_guests': {
      const guests = parseInt(text)
      if (isNaN(guests) || guests < 1 || guests > 10) {
        return msg.invalidGuests
      }
      state.guests = guests
      state.step = 'ask_name'
      await setConversationState(senderId, state)
      return msg.askName(guests)
    }
    
    case 'ask_name': {
      if (text.length < 3) {
        return msg.invalidName
      }
      state.guestName = text
      state.step = 'ask_phone'
      await setConversationState(senderId, state)
      return msg.askPhone(text)
    }
    
    case 'ask_phone': {
      const phone = text.replace(/\s/g, '')
      if (phone.length < 9) {
        return msg.invalidPhone
      }
      state.guestPhone = phone
      state.step = 'confirm_booking'
      await setConversationState(senderId, state)
      
      const pricing = await calculatePrice(orgId, state.checkIn!, state.checkOut!, state.guests!)
      return msg.confirmBooking(state, pricing.total)
    }
    
    case 'confirm_booking': {
      const isYes = state.language === 'ka'
        ? (text.toLowerCase().includes('დიახ') || text === '✅' || text === 'კი')
        : (text.toLowerCase().includes('yes') || text === '✅' || text.toLowerCase() === 'y')
      
      const isNo = state.language === 'ka'
        ? (text.toLowerCase().includes('არა') || text === '❌')
        : (text.toLowerCase().includes('no') || text === '❌' || text.toLowerCase() === 'n')
      
      if (isYes) {
        const result = await createReservation(orgId, state)
        await deleteConversationState(senderId)
        
        if (result.success) {
          // Update stats (non-critical)
          try {
            await prisma.facebookIntegration.update({
              where: { organizationId: orgId },
              data: { bookingsCreated: { increment: 1 } }
            })
          } catch (e) {
            // Ignore
          }
          
          return msg.bookingSuccess(result.reservationId!, state.checkIn!, state.checkOut!)
        } else {
          return msg.bookingFailed(result.error || 'Unknown error')
        }
      }
      
      if (isNo) {
        await deleteConversationState(senderId)
        return msg.bookingCancelled
      }
      
      // Repeat confirmation
      const pricing = await calculatePrice(orgId, state.checkIn!, state.checkOut!, state.guests!)
      return msg.confirmBooking(state, pricing.total)
    }
  }
  
  return msg.unknown
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function matchesIntent(text: string, keywords: string[]): boolean {
  return keywords.some(keyword => text.includes(keyword))
}

function parseDate(text: string): string | null {
  // Match DD.MM.YYYY or DD/MM/YYYY
  const match = text.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/)
  if (match) {
    const [, day, month, year] = match
    return `${day.padStart(2, '0')}.${month.padStart(2, '0')}.${year}`
  }
  return null
}

async function getRoomBasePrice(orgId: string): Promise<number> {
  try {
    const room = await prisma.hotelRoom.findFirst({
      where: { tenantId: orgId },
      orderBy: { basePrice: 'asc' }
    })
    return room?.basePrice || 100
  } catch {
    return 100
  }
}

async function calculatePrice(
  orgId: string,
  checkIn: string,
  checkOut: string,
  guests: number
): Promise<{ nights: number; perNight: number; total: number }> {
  try {
    const [d1, m1, y1] = checkIn.split('.').map(Number)
    const [d2, m2, y2] = checkOut.split('.').map(Number)
    
    const checkInDate = new Date(y1, m1 - 1, d1)
    const checkOutDate = new Date(y2, m2 - 1, d2)
    
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
    
    const basePrice = await getRoomBasePrice(orgId)
    const perNight = basePrice + (guests > 2 ? (guests - 2) * 30 : 0)
    
    return {
      nights,
      perNight,
      total: perNight * nights
    }
  } catch {
    return { nights: 1, perNight: 100, total: 100 }
  }
}

async function createReservation(
  orgId: string,
  state: ConversationState
): Promise<{ success: boolean; reservationId?: string; error?: string }> {
  try {
    const [d1, m1, y1] = state.checkIn!.split('.').map(Number)
    const [d2, m2, y2] = state.checkOut!.split('.').map(Number)
    
    const checkInDate = new Date(y1, m1 - 1, d1)
    const checkOutDate = new Date(y2, m2 - 1, d2)
    
    // Find available room
    const rooms = await prisma.hotelRoom.findMany({
      where: { tenantId: orgId }
    })
    
    const existingReservations = await prisma.hotelReservation.findMany({
      where: {
        tenantId: orgId,
        checkIn: { lt: checkOutDate },
        checkOut: { gt: checkInDate },
        status: { in: ['confirmed', 'checked_in', 'pending'] }
      }
    })
    
    const occupiedRoomIds = new Set(existingReservations.map(r => r.roomId))
    const availableRoom = rooms.find(r => !occupiedRoomIds.has(r.id))
    
    if (!availableRoom) {
      const errorMsg = state.language === 'ka'
        ? 'ამ თარიღებში თავისუფალი ოთახი არ არის.'
        : 'No rooms available for these dates.'
      return { success: false, error: errorMsg }
    }
    
    const pricing = await calculatePrice(orgId, state.checkIn!, state.checkOut!, state.guests!)
    
    const reservation = await prisma.hotelReservation.create({
      data: {
        tenantId: orgId,
        roomId: availableRoom.id,
        guestName: state.guestName!,
        guestPhone: state.guestPhone!,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        adults: state.guests!,
        children: 0,
        totalAmount: pricing.total,
        paidAmount: 0,
        status: 'pending',
        source: 'Facebook Messenger',
        notes: `Messenger Bot (${state.language.toUpperCase()})`
      }
    })
    
    return {
      success: true,
      reservationId: reservation.id.slice(-8).toUpperCase()
    }
  } catch (error) {
    console.error('[Messenger] Reservation error:', error)
    const errorMsg = state.language === 'ka'
      ? 'სისტემური შეცდომა. გთხოვთ სცადოთ მოგვიანებით.'
      : 'System error. Please try again later.'
    return { success: false, error: errorMsg }
  }
}

async function sendMessage(recipientId: string, text: string, accessToken: string) {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me/messages?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text }
        })
      }
    )
    
    const result = await response.json()
    
    if (result.error) {
      console.error('[Messenger] Send error:', result.error)
    } else {
      console.log('[Messenger] Message sent successfully')
    }
  } catch (error) {
    console.error('[Messenger] Send failed:', error)
  }
}