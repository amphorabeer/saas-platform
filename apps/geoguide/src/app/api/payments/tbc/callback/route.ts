import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseAndVerifyCallback } from "@/lib/flitt-payment.service";

export async function POST(request: NextRequest) {
  try {
    let data: Record<string, unknown>;
    const ct = request.headers.get("content-type") || "";
    if (ct.includes("application/json")) { data = await request.json(); }
    else { const fd = await request.formData(); data = {}; fd.forEach((v, k) => { data[k] = v; }); }

    console.log("[Flitt Callback]", JSON.stringify(data).slice(0, 500));
    const { verified, callbackData } = parseAndVerifyCallback(data);
    if (!verified) { console.error("[Flitt Callback] Invalid signature!"); return new Response("OK", { status: 200 }); }

    const { order_id, order_status } = callbackData;
    const payment = await prisma.payment.findFirst({ where: { orderId: order_id } });
    if (!payment) { console.error("[Flitt Callback] Payment not found:", order_id); return new Response("OK", { status: 200 }); }
    if (["COMPLETED", "FAILED", "REFUNDED"].includes(payment.status)) return new Response("OK", { status: 200 });

    if (order_status === "approved") {
      await prisma.entitlement.upsert({
        where: { deviceId_tourId: { tourId: payment.tourId, deviceId: payment.deviceId } },
        create: { tourId: payment.tourId, deviceId: payment.deviceId, isActive: true, expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), activatedAt: new Date() },
        update: { isActive: true, expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
      });
      await prisma.payment.update({ where: { id: payment.id }, data: { status: "COMPLETED", tbcStatus: order_status, completedAt: new Date() } });
      console.log(`[Flitt] ✅ Payment ${payment.id} APPROVED`);
    } else if (order_status === "declined" || order_status === "expired") {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED", tbcStatus: order_status } });
    } else if (order_status === "reversed") {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: "REFUNDED", tbcStatus: order_status } });
    }
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("[Flitt Callback] Error:", error);
    return new Response("OK", { status: 200 });
  }
}
