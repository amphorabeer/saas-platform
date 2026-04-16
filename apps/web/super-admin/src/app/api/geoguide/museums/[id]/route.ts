import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pickMuseumTranslationFields } from "@/lib/geoguide/translation-api-fields";

// GET /api/geoguide/museums/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const museum = await prisma.museum.findUnique({
      where: { id: params.id },
      include: {
        tours: true,
      },
    });

    if (!museum) {
      return NextResponse.json(
        { error: "მუზეუმი ვერ მოიძებნა" },
        { status: 404 }
      );
    }

    return NextResponse.json(museum);
  } catch (error) {
    console.error("Error fetching museum:", error);
    return NextResponse.json(
      { error: "Failed to fetch museum" },
      { status: 500 }
    );
  }
}

// PATCH /api/geoguide/museums/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    // Check if slug already exists (excluding current museum)
    if (body.slug) {
      const existingMuseum = await prisma.museum.findFirst({
        where: {
          slug: body.slug,
          NOT: { id: params.id },
        },
      });

      if (existingMuseum) {
        return NextResponse.json(
          { message: "ეს slug უკვე გამოყენებულია" },
          { status: 400 }
        );
      }
    }

    const museum = await prisma.museum.update({
      where: { id: params.id },
      data: {
        // Georgian
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && {
          description: body.description,
        }),
        ...(body.city !== undefined && { city: body.city }),
        ...(body.address !== undefined && { address: body.address }),

        ...pickMuseumTranslationFields(body as Record<string, unknown>),

        // Common
        ...(body.slug !== undefined && { slug: body.slug }),
        ...(body.coverImage !== undefined && { coverImage: body.coverImage }),
        ...(body.latitude !== undefined && { latitude: body.latitude }),
        ...(body.longitude !== undefined && { longitude: body.longitude }),
        ...(body.contactEmail !== undefined && {
          contactEmail: body.contactEmail,
        }),
        ...(body.contactPhone !== undefined && {
          contactPhone: body.contactPhone,
        }),
        ...(body.website !== undefined && { website: body.website }),

        // Settings
        ...(body.showMap !== undefined && { showMap: body.showMap }),
        ...(body.showQrScanner !== undefined && {
          showQrScanner: body.showQrScanner,
        }),
        ...(body.isPublished !== undefined && { isPublished: body.isPublished }),
        ...(body.displayOrder !== undefined && { displayOrder: body.displayOrder }),

        // Audio URLs (Georgian base)
        ...(body.introAudioUrl !== undefined && { introAudioUrl: body.introAudioUrl }),

        // 360° VR
        ...(body.show360View !== undefined && { show360View: body.show360View }),
        ...(body.vrTourId !== undefined && { vrTourId: body.vrTourId || null }),
        ...(body.vr360Price !== undefined && { vr360Price: body.vr360Price }),
        ...(body.vr360IsFree !== undefined && { vr360IsFree: body.vr360IsFree }),
        ...(body.vr360BundleWithAudio !== undefined && { vr360BundleWithAudio: body.vr360BundleWithAudio }),
      },
    });

    return NextResponse.json(museum);
  } catch (error) {
    console.error("Error updating museum:", error);
    return NextResponse.json(
      { error: "Failed to update museum" },
      { status: 500 }
    );
  }
}

// DELETE /api/geoguide/museums/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.museum.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting museum:", error);
    return NextResponse.json(
      { error: "Failed to delete museum" },
      { status: 500 }
    );
  }
}