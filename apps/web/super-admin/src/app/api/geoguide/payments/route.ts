import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// კოდის გენერაცია: GEOG-XXXX-XXXX ფორმატში
function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "GEOG-";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  code += "-";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// GET /api/geoguide/payments - გადახდების სია
export async function GET() {
  try {
    const payments = await prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        tour: {
          select: {
            name: true,
            museum: {
              select: { name: true },
            },
          },
        },
      },
    });

    return NextResponse.json(payments);
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}

// POST /api/geoguide/payments - გადახდის შექმნა
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, tourId, museumSlug, deviceId, amount, currency, status } = body;

    // Get museum ID
    let museumId = null;
    if (museumSlug) {
      const museum = await prisma.museum.findUnique({
        where: { slug: museumSlug },
      });
      museumId = museum?.id;
    }

    const payment = await prisma.payment.create({
      data: {
        orderId,
        tourId,
        museumId,
        deviceId,
        amount: parseFloat(amount),
        currency: currency || "GEL",
        status: status || "PENDING",
      },
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error("Error creating payment:", error);
    return NextResponse.json(
      { error: "Failed to create payment" },
      { status: 500 }
    );
  }
}
