export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: "username და password საჭიროა" }, { status: 400 });
    }

    const museum = await prisma.museum.findUnique({
      where: { portalUsername: username },
      select: {
        id: true,
        name: true,
        portalUsername: true,
        portalPasswordHash: true,
      },
    });

    if (!museum || !museum.portalPasswordHash) {
      return NextResponse.json({ error: "მომხმარებელი ვერ მოიძებნა" }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, museum.portalPasswordHash);
    if (!isValid) {
      return NextResponse.json({ error: "პაროლი არასწორია" }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      museum: { id: museum.id, name: museum.name, username: museum.portalUsername },
    });
  } catch (error) {
    console.error("Museum portal login error:", error);
    return NextResponse.json({ error: "შეცდომა" }, { status: 500 });
  }
}
