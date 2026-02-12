import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalSessions, totalMessages, todaySessions, todayMessages, languageStats, museumStats] =
      await Promise.all([
        prisma.geoGuideChatSession.count(),
        prisma.geoGuideChatMessage.count(),
        prisma.geoGuideChatSession.count({ where: { createdAt: { gte: today } } }),
        prisma.geoGuideChatMessage.count({ where: { createdAt: { gte: today } } }),
        prisma.geoGuideChatSession.groupBy({ by: ["language"], _count: { _all: true } }),
        prisma.geoGuideChatSession.groupBy({ by: ["museumId"], _count: { _all: true } }),
      ]);

    return NextResponse.json({
      totalSessions,
      totalMessages,
      todaySessions,
      todayMessages,
      languageStats: languageStats.map((s: any) => ({ language: s.language, count: s._count._all })),
      museumStats: museumStats.map((s: any) => ({ museumId: s.museumId, count: s._count._all })),
    });
  } catch (error) {
    console.error("Chatbot stats error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
