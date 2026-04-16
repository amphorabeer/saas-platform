import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/geoguide/devices - ყველა მოწყობილობის სია
export async function GET() {
  try {
    const devices = await prisma.device.findMany({
      include: {
        entitlements: {
          include: {
            tour: {
              select: {
                id: true,
                name: true,
                museum: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            activationCode: {
              select: {
                id: true,
                code: true,
                durationDays: true,
              },
            },
          },
          orderBy: {
            activatedAt: "desc",
          },
        },
      },
      orderBy: {
        lastActiveAt: "desc",
      },
    });

    // Get all payments and group by deviceId
    const payments = await prisma.payment.findMany({
      where: { status: "COMPLETED" },
      include: {
        tour: {
          select: {
            id: true,
            name: true,
            museum: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        completedAt: "desc",
      },
    });

    // Create a map of deviceId to payments
    const paymentsByDevice = new Map<string, typeof payments>();
    payments.forEach((payment) => {
      const existing = paymentsByDevice.get(payment.deviceId) || [];
      existing.push(payment);
      paymentsByDevice.set(payment.deviceId, existing);
    });

    // Combine devices with their payments
    const devicesWithPayments = devices.map((device) => ({
      ...device,
      payments: paymentsByDevice.get(device.deviceId) || [],
    }));

    return NextResponse.json(devicesWithPayments, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    });
  } catch (error) {
    console.error("Error fetching devices:", error);
    return NextResponse.json(
      { error: "Failed to fetch devices" },
      { status: 500 }
    );
  }
}