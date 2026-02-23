import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { messages } = await req.json();
    if (!messages?.length) {
      return NextResponse.json({ message: 'შეტყობინება სავალდებულოა' }, { status: 400 });
    }

    const salonId = session.user.salonId;

    // Gather salon context
    const [salon, salesData, clientsData, appointmentsData, staffData, productsData] = await Promise.all([
      prisma.salon.findUnique({ where: { id: salonId }, select: { name: true } }),
      prisma.sale.aggregate({
        where: { salonId, paymentStatus: 'COMPLETED', createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
        _sum: { total: true },
        _count: true,
      }),
      prisma.client.aggregate({
        where: { salonId, isActive: true },
        _count: true,
      }),
      prisma.appointment.findMany({
        where: { salonId, date: { gte: new Date() }, status: { in: ['SCHEDULED', 'CONFIRMED'] } },
        include: { staff: true, client: true, services: { include: { service: true } } },
        orderBy: { date: 'asc' },
        take: 10,
      }),
      prisma.staff.findMany({
        where: { salonId, isActive: true },
        select: { name: true, role: true },
      }),
      prisma.product.findMany({
        where: { salonId, stock: { lte: 3 }, isActive: true },
        select: { name: true, stock: true, minStock: true },
      }),
    ]);

    const upcomingAppointments = appointmentsData.map((a) => ({
      date: a.date.toISOString().slice(0, 10),
      time: `${a.startTime}-${a.endTime}`,
      staff: a.staff.name,
      client: a.client?.name || 'უცნობი',
      services: a.services.map((s) => s.service.name).join(', '),
      status: a.status,
    }));

    const systemPrompt = `შენ ხარ "${salon?.name || 'სალონის'}" AI ასისტენტი. შენ ეხმარები სალონის მფლობელს ბიზნესის მართვაში.

პასუხობ ქართულად. იყავი მოკლე და კონკრეტული.

აი სალონის მიმდინარე მონაცემები:

📊 ამ თვის სტატისტიკა:
- შემოსავალი: ${salesData._sum.total || 0} ₾
- გაყიდვები: ${salesData._count || 0}
- აქტიური კლიენტები: ${clientsData._count || 0}

👥 სპეციალისტები: ${staffData.map((s) => s.name).join(', ') || 'არ არის'}

📅 მომავალი ჯავშნები (${upcomingAppointments.length}):
${upcomingAppointments.length > 0 ? upcomingAppointments.map((a) => `  ${a.date} ${a.time} | ${a.staff} | ${a.client} | ${a.services}`).join('\n') : '  ჯავშნები არ არის'}

⚠️ მარაგი მცირეა (${productsData.length}):
${productsData.length > 0 ? productsData.map((p) => `  ${p.name}: ${p.stock} ცალი (მინ: ${p.minStock})`).join('\n') : '  ყველაფერი მარაგშია'}

შეგიძლია უპასუხო კითხვებს შემოსავლების, ჯავშნების, მარაგის, კლიენტების შესახებ. ასევე შეგიძლია მისცე რეკომენდაციები ბიზნესის გაუმჯობესებაზე, მარკეტინგზე, მომხმარებელთა მომსახურებაზე.`;

    // Call Claude API
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ message: 'ANTHROPIC_API_KEY არ არის კონფიგურირებული' }, { status: 500 });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages.map((m: any) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('Claude API error:', err);
      return NextResponse.json({ message: 'AI სერვისის შეცდომა', detail: err }, { status: 502 });
    }

    const data = await response.json();
    const reply = data.content?.[0]?.text || 'პასუხი ვერ მივიღე';

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error('POST /api/ai-assistant error:', error?.message || error);
    return NextResponse.json({ message: 'Server error', detail: error?.message }, { status: 500 });
  }
}
