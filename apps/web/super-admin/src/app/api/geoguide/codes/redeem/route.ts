import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// POST /api/geoguide/codes/redeem - კოდის გააქტიურება
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, deviceId, tourId, museumSlug } = body;

    if (!code || !deviceId) {
      return NextResponse.json(
        { error: "INVALID_REQUEST", message: "კოდი და მოწყობილობის ID აუცილებელია" },
        { status: 400 }
      );
    }

    // Find the code
    const activationCode = await prisma.activationCode.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!activationCode) {
      return NextResponse.json(
        { error: "INVALID_CODE", message: "კოდი არასწორია" },
        { status: 404 }
      );
    }

    // Check status
    if (activationCode.status === "REVOKED") {
      return NextResponse.json(
        { error: "CODE_REVOKED", message: "კოდი გაუქმებულია" },
        { status: 400 }
      );
    }

    if (activationCode.status === "EXPIRED") {
      return NextResponse.json(
        { error: "CODE_EXPIRED", message: "კოდის ვადა გასულია" },
        { status: 400 }
      );
    }

    // If already redeemed, check if same device
    if (activationCode.status === "REDEEMED") {
      if (activationCode.redeemedBy === deviceId) {
        // Same device - allow access (return existing entitlement)
        const existingEntitlement = await prisma.entitlement.findFirst({
          where: {
            activationCodeId: activationCode.id,
          },
        });

        if (existingEntitlement && existingEntitlement.isActive) {
          return NextResponse.json({
            success: true,
            message: "კოდი უკვე გააქტიურებულია ამ მოწყობილობაზე",
            entitlementId: existingEntitlement.id,
            expiresAt: existingEntitlement.expiresAt,
          });
        }
      } else {
        // Different device
        return NextResponse.json(
          { error: "CODE_USED", message: "კოდი უკვე გამოყენებულია სხვა მოწყობილობაზე" },
          { status: 400 }
        );
      }
    }

    // Validate museum if specified
    if (activationCode.museumIds && activationCode.museumIds.length > 0 && museumSlug) {
      const museum = await prisma.museum.findUnique({
        where: { slug: museumSlug },
      });

      if (museum && !activationCode.museumIds.includes(museum.id)) {
        return NextResponse.json(
          { error: "WRONG_MUSEUM", message: "კოდი არ ეკუთვნის ამ მუზეუმს" },
          { status: 400 }
        );
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
    } else {
      await prisma.device.update({
        where: { id: device.id },
        data: { lastActiveAt: new Date() },
      });
    }

    // Determine which tour to grant access to
    let targetTourId = tourId;

    // If code has specific tours, use the first one (or the requested one if it's in the list)
    if (activationCode.tourIds && activationCode.tourIds.length > 0) {
      if (tourId && activationCode.tourIds.includes(tourId)) {
        targetTourId = tourId;
      } else {
        targetTourId = activationCode.tourIds[0];
      }
    }

    // If still no tour, get from museum
    if (!targetTourId && activationCode.museumIds && activationCode.museumIds.length > 0) {
      const firstTour = await prisma.tour.findFirst({
        where: {
          museumId: activationCode.museumIds[0],
          isPublished: true,
        },
      });
      if (firstTour) {
        targetTourId = firstTour.id;
      }
    }

    if (!targetTourId) {
      return NextResponse.json(
        { error: "NO_TOUR", message: "ტური ვერ მოიძებნა" },
        { status: 400 }
      );
    }

    // Calculate expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + activationCode.durationDays);

    // Upsert entitlement (deviceId + tourId unique - update if already exists)
    const entitlement = await prisma.entitlement.upsert({
      where: {
        deviceId_tourId: { deviceId: device.id, tourId: targetTourId },
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

    // Update activation code
    await prisma.activationCode.update({
      where: { id: activationCode.id },
      data: {
        status: "REDEEMED",
        redeemedAt: new Date(),
        redeemedBy: deviceId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "კოდი წარმატებით გააქტიურდა",
      entitlementId: entitlement.id,
      tourId: targetTourId,
      expiresAt: entitlement.expiresAt,
      durationDays: activationCode.durationDays,
    });
  } catch (error) {
    console.error("Error redeeming code:", error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "სერვერის შეცდომა" },
      { status: 500 }
    );
  }
}
