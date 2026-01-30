import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    return NextResponse.json(devices);
  } catch (error) {
    console.error("Error fetching devices:", error);
    return NextResponse.json(
      { error: "Failed to fetch devices" },
      { status: 500 }
    );
  }
}
