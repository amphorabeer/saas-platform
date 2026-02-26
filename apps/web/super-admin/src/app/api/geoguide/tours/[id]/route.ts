import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tour = await prisma.tour.findUnique({
      where: { id: params.id },
      include: {
        museum: { select: { id: true, name: true, coverImage: true } },
        stops: { orderBy: { orderIndex: "asc" } },
        halls: {
          orderBy: { orderIndex: "asc" },
          include: {
            _count: { select: { stops: true } },
          },
        },
      },
    });

    if (!tour) {
      return NextResponse.json({ error: "ტური ვერ მოიძებნა" }, { status: 404 });
    }

    return NextResponse.json(tour);
  } catch (error) {
    console.error("Error fetching tour:", error);
    return NextResponse.json({ error: "Failed to fetch tour" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    const tour = await prisma.tour.update({
      where: { id: params.id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.nameEn !== undefined && { nameEn: body.nameEn }),
        ...(body.nameRu !== undefined && { nameRu: body.nameRu }),
        ...(body.nameUk !== undefined && { nameUk: body.nameUk }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.descriptionEn !== undefined && { descriptionEn: body.descriptionEn }),
        ...(body.descriptionRu !== undefined && { descriptionRu: body.descriptionRu }),
        ...(body.descriptionUk !== undefined && { descriptionUk: body.descriptionUk }),
        ...(body.duration !== undefined && { duration: body.duration }),
        ...(body.isFree !== undefined && { isFree: body.isFree }),
        ...(body.price !== undefined && { price: body.price }),
        ...(body.currency !== undefined && { currency: body.currency }),
        ...(body.coverImage !== undefined && { coverImage: body.coverImage }),
        ...(body.vrTourId !== undefined && { vrTourId: body.vrTourId || null }),
        ...(body.isPublished !== undefined && { isPublished: body.isPublished }),
        ...(body.allowActivationCodes !== undefined && { allowActivationCodes: body.allowActivationCodes }),
        ...(body.allowBankPayment !== undefined && { allowBankPayment: body.allowBankPayment }),
      },
      include: {
        museum: { select: { id: true, name: true, coverImage: true } },
        stops: { orderBy: { orderIndex: "asc" } },
        halls: {
          orderBy: { orderIndex: "asc" },
          include: {
            _count: { select: { stops: true } },
          },
        },
      },
    });

    return NextResponse.json(tour);
  } catch (error) {
    console.error("Error updating tour:", error);
    return NextResponse.json({ error: "Failed to update tour" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.tour.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting tour:", error);
    return NextResponse.json({ error: "Failed to delete tour" }, { status: 500 });
  }
}