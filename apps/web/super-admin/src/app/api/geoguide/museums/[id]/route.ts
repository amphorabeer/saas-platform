import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

        // English
        ...(body.nameEn !== undefined && { nameEn: body.nameEn }),
        ...(body.descriptionEn !== undefined && {
          descriptionEn: body.descriptionEn,
        }),
        ...(body.cityEn !== undefined && { cityEn: body.cityEn }),
        ...(body.addressEn !== undefined && { addressEn: body.addressEn }),

        // Russian
        ...(body.nameRu !== undefined && { nameRu: body.nameRu }),
        ...(body.descriptionRu !== undefined && {
          descriptionRu: body.descriptionRu,
        }),
        ...(body.cityRu !== undefined && { cityRu: body.cityRu }),
        ...(body.addressRu !== undefined && { addressRu: body.addressRu }),

        // German
        ...(body.nameDe !== undefined && { nameDe: body.nameDe }),
        ...(body.descriptionDe !== undefined && {
          descriptionDe: body.descriptionDe,
        }),
        ...(body.cityDe !== undefined && { cityDe: body.cityDe }),
        ...(body.addressDe !== undefined && { addressDe: body.addressDe }),

        // French
        ...(body.nameFr !== undefined && { nameFr: body.nameFr }),
        ...(body.descriptionFr !== undefined && {
          descriptionFr: body.descriptionFr,
        }),
        ...(body.cityFr !== undefined && { cityFr: body.cityFr }),
        ...(body.addressFr !== undefined && { addressFr: body.addressFr }),

        // Ukrainian
        ...(body.nameUk !== undefined && { nameUk: body.nameUk }),
        ...(body.descriptionUk !== undefined && { descriptionUk: body.descriptionUk }),
        ...(body.cityUk !== undefined && { cityUk: body.cityUk }),
        ...(body.addressUk !== undefined && { addressUk: body.addressUk }),

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