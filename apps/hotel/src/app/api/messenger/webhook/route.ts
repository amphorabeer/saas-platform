import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Facebook Webhook Verification (GET request)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')
  
  console.log('[Messenger Webhook] Verification request:', { mode, token, challenge })
  
  if (mode === 'subscribe' && token) {
    // Find integration by verify token
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
    
    // Check if this is a page subscription
    if (body.object === 'page') {
      // Iterate over each entry
      for (const entry of body.entry || []) {
        const pageId = entry.id
        
        // Find integration for this page
        const integration = await prisma.facebookIntegration.findUnique({
          where: { pageId },
          include: { organization: true }
        })
        
        if (!integration || !integration.isActive) {
          console.log('[Messenger Webhook] No active integration for page:', pageId)
          continue
        }
        
        // Update stats
        await prisma.facebookIntegration.update({
          where: { pageId },
          data: { messagesReceived: { increment: 1 } }
        })
        
        // Get the messaging array
        const messaging = entry.messaging || []
        
        for (const event of messaging) {
          const senderId = event.sender?.id
          const message = event.message
          
          if (senderId && message) {
            console.log('[Messenger] Message from:', senderId)
            console.log('[Messenger] Message text:', message.text)
            
            // Handle the message
            if (integration.botEnabled) {
              await handleMessage(senderId, message, integration)
            }
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
async function handleMessage(senderId: string, message: any, integration: any) {
  const text = message.text?.toLowerCase() || ''
  const orgName = integration.organization?.name || 'სასტუმრო'
  
  let responseText = ''
  
  // Custom welcome message or default
  if (text.includes('გამარჯობა') || text.includes('hello') || text.includes('hi')) {
    responseText = integration.welcomeMessage || 
      `👋 გამარჯობა! ${orgName}-ში მოგესალმებით!\n\nრა გსურთ?\n1️⃣ ჯავშნის გაკეთება\n2️⃣ ფასების ნახვა\n3️⃣ კონტაქტი`
  } 
  else if (text.includes('1') || text.includes('ჯავშნ') || text.includes('book')) {
    if (integration.bookingEnabled) {
      responseText = '📅 ჯავშნისთვის გთხოვთ მიუთითოთ:\n\n• შემოსვლის თარიღი\n• გასვლის თარიღი\n• სტუმრების რაოდენობა\n\nმაგალითად: "27 იანვარი - 29 იანვარი, 2 სტუმარი"'
    } else {
      responseText = '📞 ჯავშნისთვის გთხოვთ დაგვიკავშირდეთ ტელეფონით.'
    }
  }
  else if (text.includes('2') || text.includes('ფას') || text.includes('price')) {
    responseText = '💰 ფასების სანახავად ეწვიეთ ჩვენს ვებსაიტს ან დაგვიკავშირდით.'
  }
  else if (text.includes('3') || text.includes('კონტაქტ') || text.includes('contact')) {
    const org = integration.organization
    responseText = `📞 კონტაქტი:\n\n📱 ტელეფონი: ${org?.phone || 'N/A'}\n📧 Email: ${org?.email || 'N/A'}\n📍 მისამართი: ${org?.address || 'N/A'}`
  }
  else {
    responseText = `🤔 ვერ გავიგე თქვენი მოთხოვნა.\n\nაირჩიეთ:\n1️⃣ ჯავშნის გაკეთება\n2️⃣ ფასების ნახვა\n3️⃣ კონტაქტი`
  }
  
  // Send response
  await sendMessage(senderId, responseText, integration.pageAccessToken)
  
  // Update sent messages count
  await prisma.facebookIntegration.update({
    where: { pageId: integration.pageId },
    data: { messagesSent: { increment: 1 } }
  })
}

// Send message via Facebook API
async function sendMessage(recipientId: string, text: string, accessToken: string) {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me/messages?access_token=${accessToken}`,
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