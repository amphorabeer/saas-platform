import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createFlittPayment, toMinorUnits } from "@/lib/flitt-payment.service";

function generateOrderId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "GG-";
  for (let i = 0; i < 12; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

export async function POST(request: NextRequest) {
  try {
    const { tourId, deviceId, language } = await request.json();
    if (!tourId || !deviceId) return NextResponse.json({ error: "tourId and deviceId required" }, { status: 400 });

    const tour = await prisma.tour.findUnique({ where: { id: tourId }, include: { museum: true } });
    if (!tour) return NextResponse.json({ error: "Tour not found" }, { status: 404 });
    if (tour.isFree || !tour.price) return NextResponse.json({ error: "This tour is free" }, { status: 400 });

    // Ensure device exists, get device.id for Entitlement relation
    const device = await prisma.device.upsert({
      where: { deviceId },
      create: { deviceId, platform: "web" },
      update: { lastActiveAt: new Date() },
    });

    // Check existing entitlement using device.id (not plain deviceId)
    const existingEntitlement = await prisma.entitlement.findFirst({
      where: { tourId, deviceId: device.id, isActive: true, expiresAt: { gt: new Date() } },
    });
    if (existingEntitlement) return NextResponse.json({ error: "Already have access" }, { status: 409 });

    const orderId = generateOrderId();
    const amount = Number(tour.price);
    const currency = tour.currency || "GEL";
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://geoguide.ge";
    const museumSlug = tour.museum?.slug || "museum";

    const flittResult = await createFlittPayment({
      orderId,
      amount: toMinorUnits(amount),
      currency,
      orderDesc: `GeoGuide: ${tour.name}`.slice(0, 1024),
      responseUrl: `${baseUrl}/api/payments/tbc/return?orderId=${orderId}`,
      serverCallbackUrl: `${baseUrl}/api/payments/tbc/callback`,
      language: language === "en" ? "en" : "ka",
      merchantData: JSON.stringify({ tourId, deviceId }),
    });

    // Payment stores plain deviceId string for later reference
    const payment = await prisma.payment.create({
      data: { orderId, tbcPaymentId: flittResult.paymentId, tbcStatus: "created", tourId, museumId: tour.museumId, deviceId, amount, currency, status: "PENDING" },
    });

    return NextResponse.json({ redirectUrl: flittResult.checkoutUrl, paymentId: payment.id, orderId });
  } catch (error) {
    console.error("[Payment] Create error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Payment failed" }, { status: 500 });
  }
}
