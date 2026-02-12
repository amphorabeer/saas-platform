import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFlittOrderStatus } from "@/lib/flitt-payment.service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");
    if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

    const payment = await prisma.payment.findFirst({ where: { orderId }, include: { tour: { select: { id: true, name: true, museum: { select: { slug: true } } } } } });
    if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

    if (payment.status === "PENDING") {
      try {
        const flittStatus = await getFlittOrderStatus(payment.orderId);
        if (flittStatus.order_status === "approved") {
          const device = await prisma.device.upsert({
            where: { deviceId: payment.deviceId },
            create: { deviceId: payment.deviceId, platform: "web" },
            update: { lastActiveAt: new Date() },
          });
          await prisma.entitlement.upsert({
            where: { deviceId_tourId: { tourId: payment.tourId, deviceId: device.id } },
            create: { tourId: payment.tourId, deviceId: device.id, isActive: true, expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), activatedAt: new Date() },
            update: { isActive: true, expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
          });
          await prisma.payment.update({ where: { id: payment.id }, data: { status: "COMPLETED", tbcStatus: "approved", completedAt: new Date() } });
          return NextResponse.json({ status: "COMPLETED", tourId: payment.tourId, tourName: payment.tour.name, museumSlug: payment.tour.museum?.slug, hasAccess: true });
        }
        if (["declined", "expired"].includes(flittStatus.order_status)) {
          await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED", tbcStatus: flittStatus.order_status } });
          return NextResponse.json({ status: "FAILED", tourId: payment.tourId, tourName: payment.tour.name, museumSlug: payment.tour.museum?.slug, hasAccess: false });
        }
      } catch (err) { console.error("[Status] Flitt check failed:", err); }
    }

    return NextResponse.json({ status: payment.status, orderId: payment.orderId, tourId: payment.tourId, tourName: payment.tour.name, museumSlug: payment.tour.museum?.slug, hasAccess: payment.status === "COMPLETED" });
  } catch (error) {
    console.error("[Status] Error:", error);
    return NextResponse.json({ error: "Failed to check status" }, { status: 500 });
  }
}
