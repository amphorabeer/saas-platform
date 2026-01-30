import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/geoguide/codes - ყველა კოდის სია
export async function GET() {
  try {
    const codes = await prisma.activationCode.findMany({
      orderBy: { createdAt: "desc" },
      take: 500, // Limit for performance
    });

    return NextResponse.json(codes);
  } catch (error) {
    console.error("Error fetching codes:", error);
    return NextResponse.json(
      { error: "Failed to fetch codes" },
      { status: 500 }
    );
  }
}
