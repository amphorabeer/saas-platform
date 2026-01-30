import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/geoguide/tours - ყველა ტურის სია
export async function GET() {
  try {
    const tours = await prisma.tour.findMany({
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
      include: {
        museum: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: { stops: true },
        },
      },
    });

    return NextResponse.json(tours);
  } catch (error) {
    console.error("Error fetching tours:", error);
    return NextResponse.json(
      { error: "Failed to fetch tours" },
      { status: 500 }
    );
  }
}

// POST /api/geoguide/tours - ახალი ტურის შექმნა
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.museumId) {
      return NextResponse.json(
        { error: "სახელი და მუზეუმი აუცილებელია" },
        { status: 400 }
      );
    }

    // Check if museum exists
    const museum = await prisma.museum.findUnique({
      where: { id: body.museumId },
    });

    if (!museum) {
      return NextResponse.json(
        { error: "მუზეუმი ვერ მოიძებნა" },
        { status: 400 }
      );
    }

    const tour = await prisma.tour.create({
      data: {
        museumId: body.museumId,
        name: body.name,
        nameEn: body.nameEn || null,
        nameRu: body.nameRu || null,
        description: body.description || null,
        descriptionEn: body.descriptionEn || null,
        descriptionRu: body.descriptionRu || null,
        duration: body.duration || null,
        isFree: body.isFree || false,
        price: body.price || null,
        currency: body.currency || "GEL",
        coverImage: body.coverImage || null,
        isPublished: body.isPublished || false,
        displayOrder: body.displayOrder || 0,
      },
      include: {
        museum: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(tour, { status: 201 });
  } catch (error) {
    console.error("Error creating tour:", error);
    return NextResponse.json(
      { error: "Failed to create tour" },
      { status: 500 }
    );
  }
}
