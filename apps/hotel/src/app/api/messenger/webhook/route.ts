import { NextRequest, NextResponse } from 'next/server'

// Verify Token - უნდა ემთხვეოდეს Facebook-ში ჩაწერილს
const VERIFY_TOKEN = 'kurort_aspindza_2026'

// Page Access Token from Facebook
const PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN || ''

// Facebook Webhook Verification (GET request)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')
  
  console.log('[Messenger Webhook] Verification request:', { mode, token, challenge })
  
  // Check if mode and token are correct
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[Messenger Webhook] Verification successful!')
    // Return the challenge to verify
    return new NextResponse(challenge, { status: 200 })
  }
  
  console.log('[Messenger Webhook] Verification failed!')
  return new NextResponse('Forbidden', { status: 403 })
}

// Handle incoming messages (POST request)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('[Messenger Webhook] Received:', JSON.stringify(body, null, 2))
    
    // Check if this is a page subscription
    if (body.object === 'page') {
      // Iterate over each entry
      for (const entry of body.entry || []) {
        // Get the messaging array
        const messaging = entry.messaging || []
        
        for (const event of messaging) {
          const senderId = event.sender?.id
          const message = event.message
          
          if (senderId && message) {
            console.log('[Messenger] Message from:', senderId)
            console.log('[Messenger] Message text:', message.text)
            
            // Handle the message
            await handleMessage(senderId, message)
          }
        }
      }
    }
    
    // Always return 200 to acknowledge receipt
    return NextResponse.json({ status: 'ok' })
    
  } catch (error) {
    console.error('[Messenger Webhook] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// Handle incoming message and send response
async function handleMessage(senderId: string, message: any) {
  const text = message.text?.toLowerCase() || ''
  
  let responseText = ''
  
  // Simple bot logic
  if (text.includes('გამარჯობა') || text.includes('hello') || text.includes('hi')) {
    responseText = '👋 გამარჯობა! კურორტ ასპინძაში მოგესალმებით!\n\nრა გსურთ?\n1️⃣ ჯავშნის გაკეთება\n2️⃣ ფასების ნახვა\n3️⃣ კონტაქტი'
  } 
  else if (text.includes('1') || text.includes('ჯავშნ') || text.includes('book')) {
    responseText = '📅 ჯავშნისთვის გთხოვთ მიუთითოთ:\n\n• შემოსვლის თარიღი\n• გასვლის თარიღი\n• სტუმრების რაოდენობა\n\nმაგალითად: "27 იანვარი - 29 იანვარი, 2 სტუმარი"'
  }
  else if (text.includes('2') || text.includes('ფას') || text.includes('price')) {
    responseText = '💰 ჩვენი ფასები:\n\n🏠 Standard Room - ₾100/ღამე\n⭐ Deluxe Room - ₾150/ღამე\n👑 Suite - ₾200/ღამე\n\nფასში შედის საუზმე! 🍳'
  }
  else if (text.includes('3') || text.includes('კონტაქტ') || text.includes('contact')) {
    responseText = '📞 კონტაქტი:\n\n📱 ტელეფონი: +995 XXX XXX XXX\n📧 Email: info@kurortaspindza.ge\n📍 მისამართი: ასპინძა, საქართველო\n\n🌐 www.kurortaspindza.ge'
  }
  else {
    responseText = '🤔 ვერ გავიგე თქვენი მოთხოვნა.\n\nაირჩიეთ:\n1️⃣ ჯავშნის გაკეთება\n2️⃣ ფასების ნახვა\n3️⃣ კონტაქტი'
  }
  
  // Send response
  await sendMessage(senderId, responseText)
}

// Send message via Facebook API
async function sendMessage(recipientId: string, text: string) {
  if (!PAGE_ACCESS_TOKEN) {
    console.error('[Messenger] No PAGE_ACCESS_TOKEN configured!')
    return
  }
  
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
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