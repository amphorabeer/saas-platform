export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// Token გენერაცია
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = crypto.randomBytes(32).toString("hex");

    const museum = await prisma.museum.update({
      where: { id: params.id },
      data: {
        analyticsToken: token,
        analyticsTokenCreatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        analyticsToken: true,
        analyticsTokenCreatedAt: true,
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://saas-platform-super-admin.vercel.app";
    const analyticsUrl = `${baseUrl}/museum-analytics/${museum.id}?token=${token}`;

    return NextResponse.json({
      success: true,
      token,
      analyticsUrl,
      createdAt: museum.analyticsTokenCreatedAt,
    });
  } catch (error) {
    console.error("Token generation error:", error);
    return NextResponse.json({ error: "Failed to generate token" }, { status: 500 });
  }
}

// Token სტატუსი
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const museum = await prisma.museum.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        analyticsToken: true,
        analyticsTokenCreatedAt: true,
      },
    });

    if (!museum) {
      return NextResponse.json({ error: "Museum not found" }, { status: 404 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://saas-platform-super-admin.vercel.app";

    return NextResponse.json({
      hasToken: !!museum.analyticsToken,
      analyticsUrl: museum.analyticsToken
        ? `${baseUrl}/museum-analytics/${museum.id}?token=${museum.analyticsToken}`
        : null,
      createdAt: museum.analyticsTokenCreatedAt,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch token" }, { status: 500 });
  }
}

// Token გაუქმება
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.museum.update({
      where: { id: params.id },
      data: {
        analyticsToken: null,
        analyticsTokenCreatedAt: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to revoke token" }, { status: 500 });
  }
}
