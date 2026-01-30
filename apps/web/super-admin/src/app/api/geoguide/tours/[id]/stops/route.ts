import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// GET /api/geoguide/tours/[id]/stops
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const stops = await prisma.tourStop.findMany({
      where: { tourId: params.id },
      orderBy: { orderIndex: "asc" },
    });

    return NextResponse.json(stops);
  } catch (error) {
    console.error("Error fetching stops:", error);
    return NextResponse.json(
      { error: "Failed to fetch stops" },
      { status: 500 }
    );
  }
}

// POST /api/geoguide/tours/[id]/stops
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    // Check if tour exists
    const tour = await prisma.tour.findUnique({
      where: { id: params.id },
    });

    if (!tour) {
      return NextResponse.json(
        { error: "ტური ვერ მოიძებნა" },
        { status: 404 }
      );
    }

    // Get max orderIndex
    const maxOrder = await prisma.tourStop.aggregate({
      where: { tourId: params.id },
      _max: { orderIndex: true },
    });

    const newOrderIndex = (maxOrder._max.orderIndex ?? -1) + 1;

    // Generate unique QR code
    const qrCode = `STOP-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

    const stop = await prisma.tourStop.create({
      data: {
        tourId: params.id,
        title: body.title,
        titleEn: body.titleEn || null,
        titleRu: body.titleRu || null,
        description: body.description || null,
        descriptionEn: body.descriptionEn || null,
        audioUrl: body.audioUrl || null,
        audioUrlEn: body.audioUrlEn || null,
        imageUrl: body.imageUrl || null,
        qrCode,
        orderIndex: body.orderIndex ?? newOrderIndex,
        isPublished: body.isPublished ?? false,
      },
    });

    // Update tour stopsCount
    await prisma.tour.update({
      where: { id: params.id },
      data: {
        stopsCount: { increment: 1 },
      },
    });

    return NextResponse.json(stop, { status: 201 });
  } catch (error) {
    console.error("Error creating stop:", error);
    return NextResponse.json(
      { error: "Failed to create stop" },
      { status: 500 }
    );
  }
}
