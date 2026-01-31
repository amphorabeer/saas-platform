import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/geoguide/tours/[id]/stops/[stopId]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; stopId: string } }
) {
  try {
    const stop = await prisma.tourStop.findUnique({
      where: { id: params.stopId },
    });

    if (!stop || stop.tourId !== params.id) {
      return NextResponse.json(
        { error: "გაჩერება ვერ მოიძებნა" },
        { status: 404 }
      );
    }

    return NextResponse.json(stop);
  } catch (error) {
    console.error("Error fetching stop:", error);
    return NextResponse.json(
      { error: "Failed to fetch stop" },
      { status: 500 }
    );
  }
}

// PATCH /api/geoguide/tours/[id]/stops/[stopId]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; stopId: string } }
) {
  try {
    const body = await request.json();

    const existingStop = await prisma.tourStop.findUnique({
      where: { id: params.stopId },
    });

    if (!existingStop || existingStop.tourId !== params.id) {
      return NextResponse.json(
        { error: "გაჩერება ვერ მოიძებნა" },
        { status: 404 }
      );
    }

    const stop = await prisma.tourStop.update({
      where: { id: params.stopId },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.titleEn !== undefined && { titleEn: body.titleEn }),
        ...(body.titleRu !== undefined && { titleRu: body.titleRu }),
        ...(body.titleUk !== undefined && { titleUk: body.titleUk }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.descriptionEn !== undefined && { descriptionEn: body.descriptionEn }),
        ...(body.descriptionRu !== undefined && { descriptionRu: body.descriptionRu }),
        ...(body.descriptionUk !== undefined && { descriptionUk: body.descriptionUk }),
        ...(body.transcript !== undefined && { transcript: body.transcript }),
        ...(body.transcriptEn !== undefined && { transcriptEn: body.transcriptEn }),
        ...(body.transcriptRu !== undefined && { transcriptRu: body.transcriptRu }),
        ...(body.transcriptUk !== undefined && { transcriptUk: body.transcriptUk }),
        ...(body.audioUrl !== undefined && { audioUrl: body.audioUrl }),
        ...(body.audioUrlEn !== undefined && { audioUrlEn: body.audioUrlEn }),
        ...(body.audioUrlRu !== undefined && { audioUrlRu: body.audioUrlRu }),
        ...(body.audioUrlUk !== undefined && { audioUrlUk: body.audioUrlUk }),
        ...(body.audioDuration !== undefined && { audioDuration: body.audioDuration }),
        ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl }),
        ...(body.orderIndex !== undefined && { orderIndex: body.orderIndex }),
        ...(body.isPublished !== undefined && { isPublished: body.isPublished }),
      },
    });

    return NextResponse.json(stop);
  } catch (error) {
    console.error("Error updating stop:", error);
    return NextResponse.json(
      { error: "Failed to update stop" },
      { status: 500 }
    );
  }
}

// DELETE /api/geoguide/tours/[id]/stops/[stopId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; stopId: string } }
) {
  try {
    const stop = await prisma.tourStop.findUnique({
      where: { id: params.stopId },
    });

    if (!stop || stop.tourId !== params.id) {
      return NextResponse.json(
        { error: "გაჩერება ვერ მოიძებნა" },
        { status: 404 }
      );
    }

    await prisma.tourStop.delete({
      where: { id: params.stopId },
    });

    // Update tour stopsCount
    await prisma.tour.update({
      where: { id: params.id },
      data: {
        stopsCount: { decrement: 1 },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting stop:", error);
    return NextResponse.json(
      { error: "Failed to delete stop" },
      { status: 500 }
    );
  }
}
