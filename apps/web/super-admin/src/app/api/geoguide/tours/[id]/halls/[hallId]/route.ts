import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/geoguide/tours/[id]/halls/[hallId]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; hallId: string } }
) {
  try {
    const hall = await prisma.hall.findUnique({
      where: { id: params.hallId },
      include: {
        stops: {
          orderBy: { orderIndex: "asc" },
        },
        _count: {
          select: { stops: true },
        },
      },
    });

    if (!hall || hall.tourId !== params.id) {
      return NextResponse.json(
        { error: "დარბაზი ვერ მოიძებნა" },
        { status: 404 }
      );
    }

    return NextResponse.json(hall);
  } catch (error) {
    console.error("Error fetching hall:", error);
    return NextResponse.json(
      { error: "Failed to fetch hall" },
      { status: 500 }
    );
  }
}

// PATCH /api/geoguide/tours/[id]/halls/[hallId]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; hallId: string } }
) {
  try {
    const body = await request.json();

    const existingHall = await prisma.hall.findUnique({
      where: { id: params.hallId },
    });

    if (!existingHall || existingHall.tourId !== params.id) {
      return NextResponse.json(
        { error: "დარბაზი ვერ მოიძებნა" },
        { status: 404 }
      );
    }

    const hall = await prisma.hall.update({
      where: { id: params.hallId },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.nameEn !== undefined && { nameEn: body.nameEn }),
        ...(body.nameRu !== undefined && { nameRu: body.nameRu }),
        ...(body.nameUk !== undefined && { nameUk: body.nameUk }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.descriptionEn !== undefined && { descriptionEn: body.descriptionEn }),
        ...(body.descriptionRu !== undefined && { descriptionRu: body.descriptionRu }),
        ...(body.descriptionUk !== undefined && { descriptionUk: body.descriptionUk }),
        ...(body.floorNumber !== undefined && { floorNumber: body.floorNumber }),
        ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl }),
        ...(body.orderIndex !== undefined && { orderIndex: body.orderIndex }),
        ...(body.isPublished !== undefined && { isPublished: body.isPublished }),
      },
      include: {
        _count: {
          select: { stops: true },
        },
      },
    });

    return NextResponse.json(hall);
  } catch (error) {
    console.error("Error updating hall:", error);
    return NextResponse.json(
      { error: "Failed to update hall" },
      { status: 500 }
    );
  }
}

// DELETE /api/geoguide/tours/[id]/halls/[hallId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; hallId: string } }
) {
  try {
    const hall = await prisma.hall.findUnique({
      where: { id: params.hallId },
    });

    if (!hall || hall.tourId !== params.id) {
      return NextResponse.json(
        { error: "დარბაზი ვერ მოიძებნა" },
        { status: 404 }
      );
    }

    // Remove hallId from all stops in this hall
    await prisma.tourStop.updateMany({
      where: { hallId: params.hallId },
      data: { hallId: null },
    });

    await prisma.hall.delete({
      where: { id: params.hallId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting hall:", error);
    return NextResponse.json(
      { error: "Failed to delete hall" },
      { status: 500 }
    );
  }
}