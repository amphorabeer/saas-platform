import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { requireRestaurantSessionFromRequest } from '@/lib/session';
import { getRestaurantContext, buildSystemPrompt } from '@/lib/ai-context';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY is not set. Configure it in .env.local.' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const messages = Array.isArray(body.messages) ? body.messages : [];
    if (messages.length === 0) {
      return NextResponse.json({ error: 'messages array is required' }, { status: 400 });
    }

    const context = await getRestaurantContext(session.restaurantId);
    const systemPrompt = buildSystemPrompt(context);

    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages as Anthropic.MessageParam[],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta &&
              'text' in event.delta &&
              typeof (event.delta as { text: string }).text === 'string'
            ) {
              controller.enqueue(encoder.encode((event.delta as { text: string }).text));
            }
          }
        } catch (err) {
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[api/ai/chat]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
