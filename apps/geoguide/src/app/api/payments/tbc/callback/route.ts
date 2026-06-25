import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseAndVerifyCallback, parseFlittPostBody } from "@/lib/flitt-payment.service";

export async function POST(request: NextRequest) {
  let data: Record<string, unknown>;
  try {
    data = await parseFlittPostBody(request);
  } catch (error) {
    console.error("[Flitt Callback] Parse error:", error);
    return new Response("Parse error", { status: 500 });
  }

  console.log("[Flitt Callback]", JSON.stringify(data).slice(0, 500));

  const { verified, callbackData } = parseAndVerifyCallback(data);
  if (!verified) {
    console.error("[Flitt Callback] Invalid signature!");
    return new Response("Invalid signature", { status: 500 });
  }

  try {
    const { order_id, order_status } = callbackData;
    const payment = await prisma.payment.findFirst({ where: { orderId: order_id } });
    if (!payment) {
      console.error("[Flitt Callback] Payment not found:", order_id);
      return new Response("OK", { status: 200 });
    }
    if (["COMPLETED", "FAILED", "REFUNDED"].includes(payment.status)) {
      return new Response("OK", { status: 200 });
    }

    if (order_status === "approved") {
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
      await prisma.payment.update({ where: { id: payment.id }, data: { status: "COMPLETED", tbcStatus: order_status, completedAt: new Date() } });
      console.log("[Flitt] Payment APPROVED:", payment.id);
    } else if (order_status === "declined" || order_status === "expired") {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED", tbcStatus: order_status } });
    } else if (order_status === "reversed") {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: "REFUNDED", tbcStatus: order_status } });
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("[Flitt Callback] Processing error:", error);
    return new Response("Processing error", { status: 500 });
  }
}
