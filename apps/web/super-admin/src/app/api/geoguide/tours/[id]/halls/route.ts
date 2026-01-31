import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/geoguide/tours/[id]/halls - დარბაზების სია
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const halls = await prisma.hall.findMany({
      where: { tourId: params.id },
      orderBy: { orderIndex: "asc" },
      include: {
        _count: {
          select: { stops: true },
        },
      },
    });

    return NextResponse.json(halls);
  } catch (error) {
    console.error("Error fetching halls:", error);
    return NextResponse.json(
      { error: "Failed to fetch halls" },
      { status: 500 }
    );
  }
}

// POST /api/geoguide/tours/[id]/halls - ახალი დარბაზის შექმნა
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
    const maxOrder = await prisma.hall.aggregate({
      where: { tourId: params.id },
      _max: { orderIndex: true },
    });

    const newOrderIndex = (maxOrder._max.orderIndex ?? -1) + 1;

    const hall = await prisma.hall.create({
      data: {
        tourId: params.id,
        name: body.name,
        nameEn: body.nameEn || null,
        nameRu: body.nameRu || null,
        nameUk: body.nameUk || null,
        description: body.description || null,
        descriptionEn: body.descriptionEn || null,
        descriptionRu: body.descriptionRu || null,
        descriptionUk: body.descriptionUk || null,
        floorNumber: body.floorNumber || null,
        imageUrl: body.imageUrl || null,
        orderIndex: body.orderIndex ?? newOrderIndex,
        isPublished: body.isPublished ?? true,
      },
      include: {
        _count: {
          select: { stops: true },
        },
      },
    });

    return NextResponse.json(hall, { status: 201 });
  } catch (error) {
    console.error("Error creating hall:", error);
    return NextResponse.json(
      { error: "Failed to create hall" },
      { status: 500 }
    );
  }
}