import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// კოდის გენერაცია
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

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

// POST /api/geoguide/payments/[orderId]/confirm - გადახდის დადასტურება
export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const body = await request.json();
    const { deviceId, tourId, museumSlug } = body;

    // Find payment
    const payment = await prisma.payment.findUnique({
      where: { orderId: params.orderId },
      include: {
        tour: true,
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "PAYMENT_NOT_FOUND", message: "გადახდა ვერ მოიძებნა" },
        { status: 404 }
      );
    }

    // Check if already confirmed
    if (payment.status === "COMPLETED" && payment.activationCodeId) {
      const existingEntitlement = await prisma.entitlement.findFirst({
        where: { activationCodeId: payment.activationCodeId },
      });

      if (existingEntitlement) {
        return NextResponse.json({
          success: true,
          message: "გადახდა უკვე დადასტურებულია",
          expiresAt: existingEntitlement.expiresAt,
        });
      }
    }

    // Get or create device
    let device = await prisma.device.findUnique({
      where: { deviceId },
    });

    if (!device) {
      device = await prisma.device.create({
        data: {
          deviceId,
          platform: "web",
          lastActiveAt: new Date(),
        },
      });
    }

    // Get museum
    let museumId = payment.museumId;
    if (!museumId && museumSlug) {
      const museum = await prisma.museum.findUnique({
        where: { slug: museumSlug },
      });
      museumId = museum?.id || null;
    }

    // Generate activation code
    const durationDays = 30; // Default validity
    let code: string;
    let attempts = 0;

    do {
      code = generateCode();
      attempts++;
      const existing = await prisma.activationCode.findUnique({ where: { code } });
      if (!existing) break;
    } while (attempts < 100);

    // Create activation code
    const activationCode = await prisma.activationCode.create({
      data: {
        code,
        codeHash: hashCode(code),
        durationDays,
        status: "REDEEMED",
        museumIds: museumId ? [museumId] : [],
        tourIds: tourId ? [tourId] : [],
        redeemedAt: new Date(),
        redeemedBy: deviceId,
        notes: `გადახდით შეძენილი: ${params.orderId}`,
      },
    });

    // Calculate expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    // Create entitlement
    const targetTourId = tourId || payment.tourId;

    const entitlement = await prisma.entitlement.upsert({
      where: {
        deviceId_tourId: {
          deviceId: device.id,
          tourId: targetTourId,
        },
      },
      update: {
        expiresAt,
        isActive: true,
        activationCodeId: activationCode.id,
      },
      create: {
        deviceId: device.id,
        tourId: targetTourId,
        activationCodeId: activationCode.id,
        expiresAt,
        isActive: true,
      },
    });

    // Update payment
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "COMPLETED",
        activationCodeId: activationCode.id,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "გადახდა დადასტურდა",
      code: activationCode.code,
      expiresAt: entitlement.expiresAt,
      durationDays,
    });
  } catch (error) {
    console.error("Error confirming payment:", error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "სერვერის შეცდომა" },
      { status: 500 }
    );
  }
}
