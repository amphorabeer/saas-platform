import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const MODEL = process.env.GEOGUIDE_CHAT_MODEL || 'claude-sonnet-4-20250514';
const MAX_TOKENS = parseInt(process.env.GEOGUIDE_CHAT_MAX_TOKENS || '1024');
const SEARCH_LIMIT = parseInt(process.env.GEOGUIDE_SEARCH_LIMIT || '5');

const SYSTEM_PROMPTS: Record<string, string> = {
  ka: `შენ ხარ GeoGuide - ქართული მუზეუმებისა და ისტორიული ძეგლების ციფრული გიდი.

წესები:
- პასუხობ მხოლოდ მოწოდებული კონტექსტის საფუძველზე
- თუ კონტექსტში პასუხი არ არის, ამბობ: "ამ თემაზე ჩემთან ინფორმაცია არ არის. შეგიძლიათ მუზეუმის თანამშრომელს მიმართოთ."
- იყავი მეგობრული, ინფორმატიული და ლაკონიური
- პასუხობ იმ ენაზე, რომელზეც მომხმარებელი გეკითხება
- თუ კითხვა GeoGuide აპლიკაციის გამოყენებასთან არის დაკავშირებული (გადახდა, აქტივაციის კოდი, ტურის დაწყება), უპასუხე ინსტრუქციების კონტექსტიდან
- არ გამოიგონო ინფორმაცია რომელიც კონტექსტში არ არის`,

  en: `You are GeoGuide - a digital guide for Georgian museums and historical sites.

Rules:
- Answer ONLY based on the provided context
- If the answer is not in the context, say: "I don't have information on this topic. You may ask a museum staff member."
- Be friendly, informative, and concise
- Answer in the language the user asks in
- If the question is about using the GeoGuide app (payment, activation code, starting a tour), answer from the instructions context
- Never invent information not present in the context`,

  ru: `Вы GeoGuide - цифровой гид по грузинским музеям и историческим достопримечательностям.

Правила:
- Отвечайте ТОЛЬКО на основе предоставленного контекста
- Если ответа нет в контексте, скажите: "У меня нет информации по этой теме. Вы можете обратиться к сотруднику музея."
- Будьте дружелюбны, информативны и лаконичны
- Отвечайте на том языке, на котором спрашивает пользователь
- Если вопрос касается использования приложения GeoGuide (оплата, код активации, начало тура), отвечайте из контекста инструкций
- Никогда не придумывайте информацию, которой нет в контексте`,
};

function detectLanguage(text: string): string {
  if (/[\u10A0-\u10FF]/.test(text)) return 'ka';
  if (/[\u0400-\u04FF]/.test(text)) return 'ru';
  return 'en';
}

async function searchChunks(query: string, museumId: string, language: string) {
  const appKeywords = [
    'გადახდა', 'კოდი', 'აქტივაცია', 'ღილაკი', 'ფასი', 'შეძენა',
    'payment', 'code', 'activation', 'buy', 'price', 'download',
    'оплата', 'код', 'активация', 'купить', 'цена', 'скачать',
    'geoguide', 'tbc'
  ];

  const isAppQuestion = appKeywords.some(kw =>
    query.toLowerCase().includes(kw.toLowerCase())
  );

  const museumFilter = isAppQuestion
    ? { museumId: { in: [museumId, '_geoguide_app'] } }
    : { museumId };

  const words = query.split(/\s+/).filter(w => w.length > 2).slice(0, 5);

  if (words.length === 0) return [];

  const chunks = await prisma.geoGuideChunk.findMany({
    where: {
      AND: [
        museumFilter,
        { language },
        {
          OR: words.flatMap(word => [
            { content: { contains: word, mode: 'insensitive' as const } },
            { title: { contains: word, mode: 'insensitive' as const } },
          ])
        }
      ]
    },
    take: SEARCH_LIMIT,
    orderBy: { chunkIndex: 'asc' }
  });

  return chunks;
}

async function searchWithFallback(query: string, museumId: string, language: string) {
  let results = await searchChunks(query, museumId, language);
  if (results.length === 0 && language !== 'en') {
    results = await searchChunks(query, museumId, 'en');
  }
  if (results.length === 0 && language !== 'ka') {
    results = await searchChunks(query, museumId, 'ka');
  }
  return results;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, museumId, tourId, language: reqLang, sessionToken, deviceType } = body;

    if (!message || !museumId || !sessionToken) {
      return NextResponse.json(
        { error: 'Missing required fields: message, museumId, sessionToken' },
        { status: 400 }
      );
    }

    const language = reqLang || detectLanguage(message);

    // Get or create session
    let session = await prisma.geoGuideChatSession.findUnique({
      where: { sessionToken },
      include: { messages: { orderBy: { createdAt: 'desc' }, take: 10 } }
    });

    if (!session) {
      session = await prisma.geoGuideChatSession.create({
        data: { sessionToken, museumId, tourId, language, deviceType },
        include: { messages: true }
      });
    }

    // Search relevant chunks
    const chunks = await searchWithFallback(message, museumId, language);

    // Build context
    const context = chunks.length > 0
      ? chunks.map(c => {
          const header = c.hallName ? `[${c.hallName} / ${c.title}]` : `[${c.title}]`;
          return `${header}\n${c.content}`;
        }).join('\n\n---\n\n')
      : 'კონტექსტი ვერ მოიძებნა / No context found.';

    // Build conversation history
    const historyMessages = session.messages
      .reverse()
      .slice(-6)
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    // Call Claude API
    const systemPrompt = SYSTEM_PROMPTS[language] || SYSTEM_PROMPTS.en;

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [
        ...historyMessages,
        { role: 'user', content: `<context>\n${context}\n</context>\n\nკითხვა / Question: ${message}` }
      ],
    });

    const assistantMessage = response.content[0].type === 'text' ? response.content[0].text : '';
    const tokensUsed = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);

    // Save messages
    await prisma.geoGuideChatMessage.createMany({
      data: [
        { sessionId: session.id, role: 'user', content: message, chunksUsed: [], tokensUsed: null },
        { sessionId: session.id, role: 'assistant', content: assistantMessage, chunksUsed: chunks.map(c => c.id), tokensUsed }
      ]
    });

    return NextResponse.json({
      message: assistantMessage,
      language,
      sources: chunks.map(c => ({ title: c.title, hallName: c.hallName, stopNumber: c.stopNumber })),
      tokensUsed,
    });

  } catch (error: unknown) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Chat service temporarily unavailable', message: 'დროებით ვერ ვპასუხობ. სცადეთ მოგვიანებით.' },
      { status: 500 }
    );
  }
}
