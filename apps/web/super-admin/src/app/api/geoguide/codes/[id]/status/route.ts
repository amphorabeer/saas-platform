import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/geoguide/codes/[id]/status - კოდის სტატუსის შეცვლა
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { status } = body;

    if (!status || !["AVAILABLE", "REDEEMED", "EXPIRED", "REVOKED"].includes(status)) {
      return NextResponse.json(
        { error: "არასწორი სტატუსი" },
        { status: 400 }
      );
    }

    const code = await prisma.activationCode.findUnique({
      where: { id: params.id },
    });

    if (!code) {
      return NextResponse.json(
        { error: "კოდი ვერ მოიძებნა" },
        { status: 404 }
      );
    }

    const updatedCode = await prisma.activationCode.update({
      where: { id: params.id },
      data: { 
        status,
        // თუ AVAILABLE-ზე ვაბრუნებთ, წავშალოთ redeem info
        ...(status === "AVAILABLE" && {
          redeemedAt: null,
          redeemedBy: null,
        }),
      },
    });

    return NextResponse.json(updatedCode);
  } catch (error) {
    console.error("Error updating code status:", error);
    return NextResponse.json(
      { error: "შეცდომა მოხდა" },
      { status: 500 }
    );
  }
}
