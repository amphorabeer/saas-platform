import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/geoguide/codes/[id]/revoke - კოდის გაუქმება
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const code = await prisma.activationCode.findUnique({
      where: { id: params.id },
    });

    if (!code) {
      return NextResponse.json(
        { error: "კოდი ვერ მოიძებნა" },
        { status: 404 }
      );
    }

    if (code.status !== "AVAILABLE") {
      return NextResponse.json(
        { error: "მხოლოდ ხელმისაწვდომი კოდის გაუქმება შეიძლება" },
        { status: 400 }
      );
    }

    const updatedCode = await prisma.activationCode.update({
      where: { id: params.id },
      data: { status: "REVOKED" },
    });

    return NextResponse.json(updatedCode);
  } catch (error) {
    console.error("Error revoking code:", error);
    return NextResponse.json(
      { error: "Failed to revoke code" },
      { status: 500 }
    );
  }
}
