import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@repo/database'

// POST - Save chat message
export async function POST(request: NextRequest) {
  try {
    const { sessionId, role, content, hotelId } = await request.json()

    if (!sessionId || !role || !content) {
      return NextResponse.json(
        { error: 'sessionId, role, and content are required' },
        { status: 400 }
      )
    }

    // Save message using raw SQL since model might not be in Prisma schema yet
    const message = await prisma.$queryRaw`
      INSERT INTO "WebsiteChatMessage" ("id", "sessionId", "role", "content", "hotelId", "createdAt")
      VALUES (gen_random_uuid(), ${sessionId}, ${role}, ${content}, ${hotelId || 'b3ec2ac9-1080-457b-8b8b-ef2f418ddaec'}, NOW())
      RETURNING *
    `

    return NextResponse.json({ success: true, message })
  } catch (error) {
    console.error('[Chat API] Error saving message:', error)
    return NextResponse.json(
      { error: 'Failed to save message' },
      { status: 500 }
    )
  }
}

// GET - Get chat messages by sessionId or all recent
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const hotelId = searchParams.get('hotelId') || 'b3ec2ac9-1080-457b-8b8b-ef2f418ddaec'
    const limit = parseInt(searchParams.get('limit') || '100')

    let messages

    if (sessionId) {
      // Get messages for specific session
      messages = await prisma.$queryRaw`
        SELECT * FROM "WebsiteChatMessage"
        WHERE "sessionId" = ${sessionId}
        ORDER BY "createdAt" ASC
      `
    } else {
      // Get all recent messages for hotel (grouped by session)
      messages = await prisma.$queryRaw`
        SELECT * FROM "WebsiteChatMessage"
        WHERE "hotelId" = ${hotelId}
        ORDER BY "createdAt" DESC
        LIMIT ${limit}
      `
    }

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('[Chat API] Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}