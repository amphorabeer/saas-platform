import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// ============================================
// CONFIGURATION
// ============================================

const HOTEL_CONFIG = {
  phone: '+995 599 946 500',
  email: 'info@breweryhouse.ge',
  address: 'ასპინძა, შორეთის ქ. 21',
  
  services: {
    beerSpa: {
      price: 150,
      maxPersons: 2,
      durationMinutes: 60,
      ka: {
        name: 'ლუდის სპა',
        description: '1 საათიანი პროცედურა ლუდის აბაზანაში + ულიმიტო ქვევრის ლუდი',
        includes: ['ლუდის აბაზანა (მაქს. 2 ადამიანი)', '1 საათი პროცედურა', 'ულიმიტო ქვევრის ლუდი']
      },
      en: {
        name: 'Beer Spa',
        description: '1-hour beer bath procedure + unlimited Qvevri beer',
        includes: ['Beer bath (max 2 persons)', '1 hour procedure', 'Unlimited Qvevri beer']
      },
      ru: {
        name: 'Пивное СПА',
        description: '1-часовая процедура в пивной ванне + безлимитное квеври пиво',
        includes: ['Пивная ванна (макс. 2 человека)', '1 час процедуры', 'Безлимитное квеври пиво']
      }
    },
    beerTasting: {
      price: 30,
      ka: {
        name: 'ლუდის დეგუსტაცია',
        description: '4 სახეობის ქვევრის ლუდის დეგუსტაცია',
        includes: ['4 სახეობის ქვევრის ლუდი', 'ლუდსახარში']
      },
      en: {
        name: 'Beer Tasting',
        description: 'Tasting of 4 types of Qvevri beer',
        includes: ['4 types of Qvevri beer', 'Beer snacks']
      },
      ru: {
        name: 'Дегустация пива',
        description: 'Дегустация 4 видов квеври пива',
        includes: ['4 вида квеври пива', 'Пивные закуски']
      }
    }
  }
}

// ============================================
// MULTILINGUAL MESSAGES
// ============================================

type Language = 'ka' | 'en' | 'ru'

const MESSAGES = {
  ka: {
    welcome: (orgName: string) =>
      `გამარჯობა! 👋 მოგესალმებით ${orgName}-ში!\n\n` +
      `აირჩიეთ:\n` +
      `1️⃣ ჯავშანი - ოთახის დაჯავშნა\n` +
      `2️⃣ ფასები\n` +
      `3️⃣ 🍺 ლუდის სპა\n` +
      `4️⃣ 🍻 ლუდის დეგუსტაცია\n` +
      `5️⃣ კონტაქტი\n` +
      `6️⃣ თავისუფალი ოთახები\n\n` +
      `🇬🇧 English - type "EN"\n` +
      `🇷🇺 Русский - напишите "RU"`,
    
    beerSpa: () => {
      const spa = HOTEL_CONFIG.services.beerSpa
      return `🍺 ${spa.ka.name}\n\n` +
        `${spa.ka.description}\n\n` +
        `💰 ფასი: ${spa.price}₾ (მაქს. ${spa.maxPersons} ადამიანი)\n` +
        `⏱️ ხანგრძლივობა: ${spa.durationMinutes} წუთი\n\n` +
        `შედის:\n` +
        spa.ka.includes.map(i => `• ${i}`).join('\n') +
        `\n\n📞 დაჯავშნა: ${HOTEL_CONFIG.phone}`
    },
    
    beerTasting: () => {
      const tasting = HOTEL_CONFIG.services.beerTasting
      return `🍻 ${tasting.ka.name}\n\n` +
        `${tasting.ka.description}\n\n` +
        `💰 ფასი: ${tasting.price}₾\n\n` +
        `შედის:\n` +
        tasting.ka.includes.map(i => `• ${i}`).join('\n') +
        `\n\n📞 დაჯავშნა: ${HOTEL_CONFIG.phone}`
    },
    
    prices: (roomPrice: number) =>
      `💰 ფასები:\n\n` +
      `🛏️ ოთახი: ${roomPrice}₾/ღამე\n` +
      `🍺 ლუდის სპა: ${HOTEL_CONFIG.services.beerSpa.price}₾\n` +
      `🍻 დეგუსტაცია: ${HOTEL_CONFIG.services.beerTasting.price}₾\n\n` +
      `📅 ჯავშნისთვის დაწერეთ "1"`,
    
    contact: () =>
      `📞 კონტაქტი:\n\n` +
      `📱 ${HOTEL_CONFIG.phone}\n` +
      `📧 ${HOTEL_CONFIG.email}\n` +
      `📍 ${HOTEL_CONFIG.address}`,
    
    bookingStart: '📅 შემოსვლის თარიღი?\n\nმაგ: 15.02.2026 ან "ხვალ"\n\n❌ გაუქმება - "0"',
    askCheckout: (d: string) => `✅ შემოსვლა: ${d}\n\n📅 გასვლის თარიღი?`,
    askGuests: (d: string) => `✅ გასვლა: ${d}\n\n👥 რამდენი სტუმარი?`,
    askName: (n: number) => `✅ სტუმრები: ${n}\n\n👤 სახელი და გვარი?`,
    askPhone: (n: string) => `✅ სახელი: ${n}\n\n📱 ტელეფონის ნომერი?`,
    
    confirmBooking: (state: any, room: string, total: number) =>
      `📋 ჯავშნის დეტალები:\n\n` +
      `📅 ${state.checkIn} - ${state.checkOut}\n` +
      `👥 ${state.guests} სტუმარი\n` +
      `👤 ${state.guestName}\n` +
      `📱 ${state.guestPhone}\n` +
      `🛏️ ოთახი: ${room}\n` +
      `💰 ჯამი: ${total}₾\n\n` +
      `✅ "დიახ" - დადასტურება\n❌ "არა" - გაუქმება`,
    
    bookingSuccess: (id: string, checkIn: string, checkOut: string) =>
      `🎉 ჯავშანი წარმატებით შეიქმნა!\n\n` +
      `📋 ნომერი: ${id}\n` +
      `📅 ${checkIn} - ${checkOut}\n\n` +
      `მალე დაგიკავშირდებით!\nმადლობა! 🙏`,
    
    bookingFailed: (err: string) => `❌ ${err}\n\n📞 ${HOTEL_CONFIG.phone}`,
    bookingCancelled: '❌ გაუქმებულია.\n\nახლიდან - "1"',
    noRooms: (checkIn: string, checkOut: string) => 
      `❌ ${checkIn} - ${checkOut} თარიღებში ოთახი არ არის.\n\n📅 სხვა თარიღი - "1"`,
    
    invalidDate: '❌ თარიღი არასწორია.\n\nმაგ: 15.02.2026',
    invalidGuests: '❌ სტუმრების რაოდენობა (1-10)',
    invalidName: '❌ სახელი და გვარი',
    invalidPhone: '❌ სწორი ტელეფონის ნომერი',
    askConfirm: '✅ "დიახ" ან ❌ "არა"',
    
    unknown: (orgName: string) =>
      `🤔 ვერ გავიგე.\n\n` +
      `1️⃣ ჯავშანი\n2️⃣ ფასები\n3️⃣ სპა\n4️⃣ დეგუსტაცია\n5️⃣ კონტაქტი\n6️⃣ ოთახები`,
    
    availability: (available: number, total: number) => {
      const icon = available > 2 ? '🟢' : available > 0 ? '🟡' : '🔴'
      return `🏨 თავისუფალია:\n\n${icon} ${available} ოთახი ${total}-დან\n\n📅 ჯავშნისთვის - "1"`
    }
  },
  
  en: {
    welcome: (orgName: string) =>
      `Hello! 👋 Welcome to ${orgName}!\n\n` +
      `Choose:\n` +
      `1️⃣ Book - Room reservation\n` +
      `2️⃣ Prices\n` +
      `3️⃣ 🍺 Beer Spa\n` +
      `4️⃣ 🍻 Beer Tasting\n` +
      `5️⃣ Contact\n` +
      `6️⃣ Availability\n\n` +
      `🇬🇪 ქართული - "KA"\n` +
      `🇷🇺 Русский - "RU"`,
    
    beerSpa: () => {
      const spa = HOTEL_CONFIG.services.beerSpa
      return `🍺 ${spa.en.name}\n\n` +
        `${spa.en.description}\n\n` +
        `💰 Price: ${spa.price}₾ (max ${spa.maxPersons} persons)\n` +
        `⏱️ Duration: ${spa.durationMinutes} min\n\n` +
        `Includes:\n` +
        spa.en.includes.map(i => `• ${i}`).join('\n') +
        `\n\n📞 Book: ${HOTEL_CONFIG.phone}`
    },
    
    beerTasting: () => {
      const tasting = HOTEL_CONFIG.services.beerTasting
      return `🍻 ${tasting.en.name}\n\n` +
        `${tasting.en.description}\n\n` +
        `💰 Price: ${tasting.price}₾\n\n` +
        `Includes:\n` +
        tasting.en.includes.map(i => `• ${i}`).join('\n') +
        `\n\n📞 Book: ${HOTEL_CONFIG.phone}`
    },
    
    prices: (roomPrice: number) =>
      `💰 Prices:\n\n` +
      `🛏️ Room: ${roomPrice}₾/night\n` +
      `🍺 Beer Spa: ${HOTEL_CONFIG.services.beerSpa.price}₾\n` +
      `🍻 Tasting: ${HOTEL_CONFIG.services.beerTasting.price}₾\n\n` +
      `📅 To book type "1"`,
    
    contact: () =>
      `📞 Contact:\n\n` +
      `📱 ${HOTEL_CONFIG.phone}\n` +
      `📧 ${HOTEL_CONFIG.email}\n` +
      `📍 ${HOTEL_CONFIG.address}`,
    
    bookingStart: '📅 Check-in date?\n\ne.g.: 15.02.2026 or "tomorrow"\n\n❌ Cancel - "0"',
    askCheckout: (d: string) => `✅ Check-in: ${d}\n\n📅 Check-out date?`,
    askGuests: (d: string) => `✅ Check-out: ${d}\n\n👥 Number of guests?`,
    askName: (n: number) => `✅ Guests: ${n}\n\n👤 Full name?`,
    askPhone: (n: string) => `✅ Name: ${n}\n\n📱 Phone number?`,
    
    confirmBooking: (state: any, room: string, total: number) =>
      `📋 Booking details:\n\n` +
      `📅 ${state.checkIn} - ${state.checkOut}\n` +
      `👥 ${state.guests} guests\n` +
      `👤 ${state.guestName}\n` +
      `📱 ${state.guestPhone}\n` +
      `🛏️ Room: ${room}\n` +
      `💰 Total: ${total}₾\n\n` +
      `✅ "Yes" - Confirm\n❌ "No" - Cancel`,
    
    bookingSuccess: (id: string, checkIn: string, checkOut: string) =>
      `🎉 Booking confirmed!\n\n` +
      `📋 ID: ${id}\n` +
      `📅 ${checkIn} - ${checkOut}\n\n` +
      `We'll contact you soon!\nThank you! 🙏`,
    
    bookingFailed: (err: string) => `❌ ${err}\n\n📞 ${HOTEL_CONFIG.phone}`,
    bookingCancelled: '❌ Cancelled.\n\nTo book again - "1"',
    noRooms: (checkIn: string, checkOut: string) => 
      `❌ No rooms for ${checkIn} - ${checkOut}.\n\n📅 Try other dates - "1"`,
    
    invalidDate: '❌ Invalid date.\n\ne.g.: 15.02.2026',
    invalidGuests: '❌ Guests (1-10)',
    invalidName: '❌ Full name required',
    invalidPhone: '❌ Valid phone number',
    askConfirm: '✅ "Yes" or ❌ "No"',
    
    unknown: (orgName: string) =>
      `🤔 Didn't understand.\n\n` +
      `1️⃣ Book\n2️⃣ Prices\n3️⃣ Spa\n4️⃣ Tasting\n5️⃣ Contact\n6️⃣ Rooms`,
    
    availability: (available: number, total: number) => {
      const icon = available > 2 ? '🟢' : available > 0 ? '🟡' : '🔴'
      return `🏨 Available:\n\n${icon} ${available} rooms of ${total}\n\n📅 To book - "1"`
    }
  },
  
  ru: {
    welcome: (orgName: string) =>
      `Здравствуйте! 👋 Добро пожаловать в ${orgName}!\n\n` +
      `Выберите:\n` +
      `1️⃣ Бронь - Забронировать номер\n` +
      `2️⃣ Цены\n` +
      `3️⃣ 🍺 Пивное СПА\n` +
      `4️⃣ 🍻 Дегустация пива\n` +
      `5️⃣ Контакт\n` +
      `6️⃣ Свободные номера\n\n` +
      `🇬🇪 ქართული - "KA"\n` +
      `🇬🇧 English - "EN"`,
    
    beerSpa: () => {
      const spa = HOTEL_CONFIG.services.beerSpa
      return `🍺 ${spa.ru.name}\n\n` +
        `${spa.ru.description}\n\n` +
        `💰 Цена: ${spa.price}₾ (макс. ${spa.maxPersons} чел.)\n` +
        `⏱️ Длительность: ${spa.durationMinutes} мин\n\n` +
        `Включено:\n` +
        spa.ru.includes.map(i => `• ${i}`).join('\n') +
        `\n\n📞 Бронь: ${HOTEL_CONFIG.phone}`
    },
    
    beerTasting: () => {
      const tasting = HOTEL_CONFIG.services.beerTasting
      return `🍻 ${tasting.ru.name}\n\n` +
        `${tasting.ru.description}\n\n` +
        `💰 Цена: ${tasting.price}₾\n\n` +
        `Включено:\n` +
        tasting.ru.includes.map(i => `• ${i}`).join('\n') +
        `\n\n📞 Бронь: ${HOTEL_CONFIG.phone}`
    },
    
    prices: (roomPrice: number) =>
      `💰 Цены:\n\n` +
      `🛏️ Номер: ${roomPrice}₾/ночь\n` +
      `🍺 Пивное СПА: ${HOTEL_CONFIG.services.beerSpa.price}₾\n` +
      `🍻 Дегустация: ${HOTEL_CONFIG.services.beerTasting.price}₾\n\n` +
      `📅 Для брони напишите "1"`,
    
    contact: () =>
      `📞 Контакт:\n\n` +
      `📱 ${HOTEL_CONFIG.phone}\n` +
      `📧 ${HOTEL_CONFIG.email}\n` +
      `📍 ${HOTEL_CONFIG.address}`,
    
    bookingStart: '📅 Дата заезда?\n\nНапр.: 15.02.2026 или "завтра"\n\n❌ Отмена - "0"',
    askCheckout: (d: string) => `✅ Заезд: ${d}\n\n📅 Дата выезда?`,
    askGuests: (d: string) => `✅ Выезд: ${d}\n\n👥 Количество гостей?`,
    askName: (n: number) => `✅ Гости: ${n}\n\n👤 Имя и фамилия?`,
    askPhone: (n: string) => `✅ Имя: ${n}\n\n📱 Номер телефона?`,
    
    confirmBooking: (state: any, room: string, total: number) =>
      `📋 Детали брони:\n\n` +
      `📅 ${state.checkIn} - ${state.checkOut}\n` +
      `👥 ${state.guests} гостей\n` +
      `👤 ${state.guestName}\n` +
      `📱 ${state.guestPhone}\n` +
      `🛏️ Номер: ${room}\n` +
      `💰 Итого: ${total}₾\n\n` +
      `✅ "Да" - Подтвердить\n❌ "Нет" - Отменить`,
    
    bookingSuccess: (id: string, checkIn: string, checkOut: string) =>
      `🎉 Бронь подтверждена!\n\n` +
      `📋 Номер: ${id}\n` +
      `📅 ${checkIn} - ${checkOut}\n\n` +
      `Скоро свяжемся!\nСпасибо! 🙏`,
    
    bookingFailed: (err: string) => `❌ ${err}\n\n📞 ${HOTEL_CONFIG.phone}`,
    bookingCancelled: '❌ Отменено.\n\nЗаново - "1"',
    noRooms: (checkIn: string, checkOut: string) => 
      `❌ Нет номеров ${checkIn} - ${checkOut}.\n\n📅 Другие даты - "1"`,
    
    invalidDate: '❌ Неверная дата.\n\nНапр.: 15.02.2026',
    invalidGuests: '❌ Гостей (1-10)',
    invalidName: '❌ Имя и фамилия',
    invalidPhone: '❌ Корректный номер телефона',
    askConfirm: '✅ "Да" или ❌ "Нет"',
    
    unknown: (orgName: string) =>
      `🤔 Не понял.\n\n` +
      `1️⃣ Бронь\n2️⃣ Цены\n3️⃣ СПА\n4️⃣ Дегустация\n5️⃣ Контакт\n6️⃣ Номера`,
    
    availability: (available: number, total: number) => {
      const icon = available > 2 ? '🟢' : available > 0 ? '🟡' : '🔴'
      return `🏨 Свободно:\n\n${icon} ${available} номеров из ${total}\n\n📅 Для брони - "1"`
    }
  }
}

// ============================================
// STATE MANAGEMENT
// ============================================

interface ConversationState {
  step: string
  lang: Language
  checkIn?: string
  checkOut?: string
  guests?: number
  guestName?: string
  guestPhone?: string
}

const conversationState: Map<string, ConversationState> = new Map()

// ============================================
// WEBHOOK HANDLERS
// ============================================

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')
  
  if (mode === 'subscribe' && token) {
    const integration = await prisma.facebookIntegration.findFirst({
      where: { verifyToken: token, isActive: true }
    })
    if (integration) {
      return new NextResponse(challenge, { status: 200 })
    }
  }
  return new NextResponse('Forbidden', { status: 403 })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (body.object === 'page') {
      for (const entry of body.entry || []) {
        const pageId = entry.id
        
        const integration = await prisma.facebookIntegration.findUnique({
          where: { pageId }
        })
        
        if (!integration || !integration.isActive) continue
        
        try {
          await prisma.facebookIntegration.update({
            where: { pageId },
            data: { messagesReceived: { increment: 1 } }
          })
        } catch (e) {}
        
        for (const event of entry.messaging || []) {
          const senderId = event.sender?.id
          const message = event.message
          
          if (senderId && message?.text) {
            if (integration.botEnabled) {
              await handleMessage(senderId, message.text.trim(), integration)
            }
          }
        }
      }
    }
    
    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('[Messenger] Error:', error)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}

// ============================================
// MESSAGE HANDLER
// ============================================

async function handleMessage(senderId: string, text: string, integration: any) {
  const lowerText = text.toLowerCase()
  const orgName = integration.pageName || 'Hotel'
  
  // Get tenantId
  let orgId = integration.organizationId
  try {
    const org = await prisma.organization.findUnique({
      where: { id: integration.organizationId },
      select: { tenantId: true }
    })
    if (org?.tenantId) orgId = org.tenantId
  } catch (e) {}
  
  let state = conversationState.get(senderId) || { step: 'menu', lang: 'ka' as Language }
  const msg = MESSAGES[state.lang]
  
  let response = ''
  
  // Language switch
  if (lowerText === 'en' || lowerText === 'english') {
    state.lang = 'en'
    state.step = 'menu'
    conversationState.set(senderId, state)
    response = MESSAGES.en.welcome(orgName)
  }
  else if (lowerText === 'ru' || lowerText === 'рус' || lowerText === 'русский') {
    state.lang = 'ru'
    state.step = 'menu'
    conversationState.set(senderId, state)
    response = MESSAGES.ru.welcome(orgName)
  }
  else if (lowerText === 'ka' || lowerText === 'geo' || lowerText === 'ქართული') {
    state.lang = 'ka'
    state.step = 'menu'
    conversationState.set(senderId, state)
    response = MESSAGES.ka.welcome(orgName)
  }
  // Cancel
  else if (lowerText === '0' || lowerText === 'cancel' || lowerText === 'გაუქმება' || lowerText === 'отмена') {
    conversationState.delete(senderId)
    response = msg.welcome(orgName)
  }
  // Booking flow
  else if (state.step.startsWith('ask_') || state.step === 'confirm') {
    response = await handleBookingFlow(senderId, text, state, orgId, msg)
  }
  // Menu commands
  else if (isGreeting(lowerText)) {
    response = msg.welcome(orgName)
  }
  else if (isBooking(lowerText)) {
    state.step = 'ask_checkin'
    state.lang = state.lang
    conversationState.set(senderId, state)
    response = msg.bookingStart
  }
  else if (isPrices(lowerText)) {
    const price = await getRoomPrice(orgId)
    response = msg.prices(price)
  }
  else if (isSpa(lowerText)) {
    response = msg.beerSpa()
  }
  else if (isTasting(lowerText)) {
    response = msg.beerTasting()
  }
  else if (isContact(lowerText)) {
    response = msg.contact()
  }
  else if (isAvailability(lowerText)) {
    const { available, total } = await getAvailability(orgId)
    response = msg.availability(available, total)
  }
  else {
    response = msg.unknown(orgName)
  }
  
  await sendMessage(senderId, response, integration.pageAccessToken, integration.pageId)
  
  try {
    await prisma.facebookIntegration.update({
      where: { pageId: integration.pageId },
      data: { messagesSent: { increment: 1 } }
    })
  } catch (e) {}
}

// ============================================
// INTENT DETECTION
// ============================================

function isGreeting(t: string): boolean {
  return ['გამარჯობა', 'gamarjoba', 'gaumarjos', 'hello', 'hi', 'hey', 'привет', 'здравствуй', 'menu', 'მენიუ', 'start'].some(w => t.includes(w))
}

function isBooking(t: string): boolean {
  return ['1', 'ჯავშ', 'book', 'reserv', 'бронь', 'забронир'].some(w => t.includes(w))
}

function isPrices(t: string): boolean {
  return ['2', 'ფას', 'price', 'cost', 'цен', 'стоим'].some(w => t.includes(w))
}

function isSpa(t: string): boolean {
  return ['3', 'სპა', 'spa', 'спа', 'ლუდის სპა', 'beer spa', 'пивн'].some(w => t.includes(w))
}

function isTasting(t: string): boolean {
  return ['4', 'დეგუსტაცია', 'tasting', 'дегустац'].some(w => t.includes(w))
}

function isContact(t: string): boolean {
  return ['5', 'კონტაქტ', 'contact', 'phone', 'контакт', 'телефон'].some(w => t.includes(w))
}

function isAvailability(t: string): boolean {
  return ['6', 'თავისუფალ', 'availab', 'rooms', 'свобод', 'номер'].some(w => t.includes(w))
}

// ============================================
// BOOKING FLOW
// ============================================

async function handleBookingFlow(
  senderId: string,
  text: string,
  state: ConversationState,
  orgId: string,
  msg: typeof MESSAGES['ka']
): Promise<string> {
  
  switch (state.step) {
    case 'ask_checkin': {
      const checkIn = parseDate(text, state.lang)
      if (!checkIn) return msg.invalidDate
      state.checkIn = checkIn
      state.step = 'ask_checkout'
      conversationState.set(senderId, state)
      return msg.askCheckout(checkIn)
    }
    
    case 'ask_checkout': {
      const checkOut = parseDate(text, state.lang)
      if (!checkOut) return msg.invalidDate
      state.checkOut = checkOut
      state.step = 'ask_guests'
      conversationState.set(senderId, state)
      return msg.askGuests(checkOut)
    }
    
    case 'ask_guests': {
      const guests = parseInt(text)
      if (isNaN(guests) || guests < 1 || guests > 10) return msg.invalidGuests
      state.guests = guests
      state.step = 'ask_name'
      conversationState.set(senderId, state)
      return msg.askName(guests)
    }
    
    case 'ask_name': {
      if (text.length < 3) return msg.invalidName
      state.guestName = text
      state.step = 'ask_phone'
      conversationState.set(senderId, state)
      return msg.askPhone(text)
    }
    
    case 'ask_phone': {
      const phone = text.replace(/\s/g, '')
      if (phone.length < 9) return msg.invalidPhone
      state.guestPhone = phone
      
      // Check availability
      const avail = await checkRoomAvailability(orgId, state.checkIn!, state.checkOut!)
      if (!avail.available) {
        conversationState.delete(senderId)
        return msg.noRooms(state.checkIn!, state.checkOut!)
      }
      
      state.step = 'confirm'
      conversationState.set(senderId, state)
      
      const pricing = await calculatePrice(orgId, state.checkIn!, state.checkOut!)
      return msg.confirmBooking(state, avail.roomNumber!, pricing.total)
    }
    
    case 'confirm': {
      if (isYes(text, state.lang)) {
        const savedCheckIn = state.checkIn
        const savedCheckOut = state.checkOut
        
        const result = await createReservation(orgId, state)
        conversationState.delete(senderId)
        
        if (result.success) {
          return msg.bookingSuccess(result.reservationId!, savedCheckIn!, savedCheckOut!)
        }
        return msg.bookingFailed(result.error || 'Error')
      }
      
      if (isNo(text, state.lang)) {
        conversationState.delete(senderId)
        return msg.bookingCancelled
      }
      
      return msg.askConfirm
    }
  }
  
  return msg.unknown('')
}

function isYes(t: string, lang: Language): boolean {
  const lower = t.toLowerCase()
  if (lang === 'ka') return ['დიახ', 'კი', 'yes', '✅'].some(w => lower.includes(w))
  if (lang === 'en') return ['yes', 'y', 'ok', '✅'].some(w => lower.includes(w))
  if (lang === 'ru') return ['да', 'yes', 'ок', '✅'].some(w => lower.includes(w))
  return false
}

function isNo(t: string, lang: Language): boolean {
  const lower = t.toLowerCase()
  if (lang === 'ka') return ['არა', 'no', '❌'].some(w => lower.includes(w))
  if (lang === 'en') return ['no', 'n', '❌'].some(w => lower.includes(w))
  if (lang === 'ru') return ['нет', 'no', '❌'].some(w => lower.includes(w))
  return false
}

// ============================================
// HELPERS
// ============================================

function parseDate(text: string, lang: Language): string | null {
  const today = new Date()
  const lower = text.toLowerCase()
  
  // Tomorrow
  if (lower.includes('ხვალ') || lower === 'tomorrow' || lower === 'завтра') {
    const d = new Date(today)
    d.setDate(d.getDate() + 1)
    return formatDate(d)
  }
  
  // Today
  if (lower.includes('დღეს') || lower === 'today' || lower === 'сегодня') {
    return formatDate(today)
  }
  
  // DD.MM.YYYY
  const match = text.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/)
  if (match) {
    return `${match[1].padStart(2, '0')}.${match[2].padStart(2, '0')}.${match[3]}`
  }
  
  // DD.MM (current year)
  const match2 = text.match(/(\d{1,2})[.\/-](\d{1,2})/)
  if (match2) {
    return `${match2[1].padStart(2, '0')}.${match2[2].padStart(2, '0')}.${today.getFullYear()}`
  }
  
  return null
}

function formatDate(d: Date): string {
  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`
}

async function getRoomPrice(orgId: string): Promise<number> {
  try {
    const room = await prisma.hotelRoom.findFirst({
      where: { tenantId: orgId },
      orderBy: { basePrice: 'asc' }
    })
    return room?.basePrice ? Number(room.basePrice) : 100
  } catch {
    return 100
  }
}

async function getAvailability(orgId: string): Promise<{ available: number; total: number }> {
  try {
    const today = new Date()
    const nextWeek = new Date(today)
    nextWeek.setDate(nextWeek.getDate() + 7)
    
    const rooms = await prisma.hotelRoom.findMany({ where: { tenantId: orgId } })
    const reservations = await prisma.hotelReservation.findMany({
      where: {
        tenantId: orgId,
        checkIn: { lte: nextWeek },
        checkOut: { gte: today },
        status: { in: ['confirmed', 'checked_in', 'CONFIRMED', 'CHECKED_IN'] }
      }
    })
    
    const occupied = new Set(reservations.map(r => r.roomId))
    return { available: rooms.length - occupied.size, total: rooms.length }
  } catch {
    return { available: 0, total: 0 }
  }
}

async function checkRoomAvailability(orgId: string, checkIn: string, checkOut: string): Promise<{ available: boolean; roomId?: string; roomNumber?: string }> {
  try {
    const [d1, m1, y1] = checkIn.split('.').map(Number)
    const [d2, m2, y2] = checkOut.split('.').map(Number)
    const checkInDate = new Date(y1, m1 - 1, d1)
    const checkOutDate = new Date(y2, m2 - 1, d2)
    
    const rooms = await prisma.hotelRoom.findMany({ where: { tenantId: orgId } })
    if (rooms.length === 0) return { available: false }
    
    const reservations = await prisma.hotelReservation.findMany({
      where: {
        tenantId: orgId,
        checkIn: { lt: checkOutDate },
        checkOut: { gt: checkInDate },
        status: { in: ['confirmed', 'checked_in', 'pending', 'CONFIRMED', 'CHECKED_IN', 'PENDING'] }
      }
    })
    
    const occupied = new Set(reservations.map(r => r.roomId))
    const available = rooms.find(r => !occupied.has(r.id))
    
    if (available) {
      return { available: true, roomId: available.id, roomNumber: available.roomNumber }
    }
    return { available: false }
  } catch {
    return { available: false }
  }
}

async function calculatePrice(orgId: string, checkIn: string, checkOut: string): Promise<{ total: number; nights: number }> {
  try {
    const [d1, m1, y1] = checkIn.split('.').map(Number)
    const [d2, m2, y2] = checkOut.split('.').map(Number)
    const checkInDate = new Date(y1, m1 - 1, d1)
    const checkOutDate = new Date(y2, m2 - 1, d2)
    
    const nights = Math.max(1, Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)))
    const perNight = await getRoomPrice(orgId)
    
    return { total: perNight * nights, nights }
  } catch {
    return { total: 100, nights: 1 }
  }
}

async function createReservation(orgId: string, state: ConversationState): Promise<{ success: boolean; reservationId?: string; error?: string }> {
  try {
    const [d1, m1, y1] = state.checkIn!.split('.').map(Number)
    const [d2, m2, y2] = state.checkOut!.split('.').map(Number)
    const checkInDate = new Date(y1, m1 - 1, d1)
    const checkOutDate = new Date(y2, m2 - 1, d2)
    
    const avail = await checkRoomAvailability(orgId, state.checkIn!, state.checkOut!)
    if (!avail.available || !avail.roomId) {
      return { success: false, error: 'No rooms available' }
    }
    
    const pricing = await calculatePrice(orgId, state.checkIn!, state.checkOut!)
    
    const reservation = await prisma.hotelReservation.create({
      data: {
        tenantId: orgId,
        roomId: avail.roomId,
        guestName: state.guestName!,
        guestEmail: '',
        guestPhone: state.guestPhone || '',
        checkIn: checkInDate,
        checkOut: checkOutDate,
        adults: state.guests || 2,
        children: 0,
        totalAmount: pricing.total,
        paidAmount: 0,
        status: 'confirmed',
        source: 'Facebook Messenger',
        notes: `Bot (${state.lang.toUpperCase()})`
      }
    })
    
    return { success: true, reservationId: reservation.id.slice(-8).toUpperCase() }
  } catch (error) {
    console.error('[Messenger] Reservation error:', error)
    return { success: false, error: 'System error' }
  }
}

async function sendMessage(recipientId: string, text: string, accessToken: string, pageId?: string) {
  try {
    const endpoint = pageId 
      ? `https://graph.facebook.com/v18.0/${pageId}/messages`
      : `https://graph.facebook.com/v18.0/me/messages`
    
    await fetch(`${endpoint}?access_token=${accessToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text }
      })
    })
  } catch (error) {
    console.error('[Messenger] Send error:', error)
  }
}