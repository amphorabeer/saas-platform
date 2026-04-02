export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// Credentials სტატუსი
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const museum = await prisma.museum.findUnique({
      where: { id: params.id },
      select: { id: true, name: true, portalUsername: true },
    });

    if (!museum) {
      return NextResponse.json({ error: "Museum not found" }, { status: 404 });
    }

    return NextResponse.json({
      hasCredentials: !!museum.portalUsername,
      username: museum.portalUsername,
      loginUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://saas-platform-super-admin.vercel.app"}/museum-portal/login`,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// Credentials შექმნა/განახლება
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: "username და password საჭიროა" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "პაროლი მინიმუმ 6 სიმბოლო" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const museum = await prisma.museum.update({
      where: { id: params.id },
      data: {
        portalUsername: username,
        portalPasswordHash: passwordHash,
      },
      select: { id: true, name: true, portalUsername: true },
    });

    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://saas-platform-super-admin.vercel.app"}/museum-portal/login`;

    return NextResponse.json({
      success: true,
      username: museum.portalUsername,
      loginUrl,
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "ეს username უკვე გამოიყენება" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// Credentials წაშლა
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.museum.update({
      where: { id: params.id },
      data: {
        portalUsername: null,
        portalPasswordHash: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
