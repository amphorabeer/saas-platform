import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/geoguide/museums
export async function GET() {
  try {
    const museums = await prisma.museum.findMany({
      include: {
        tours: {
          select: {
            id: true,
            name: true,
            isPublished: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(museums);
  } catch (error) {
    console.error("Error fetching museums:", error);
    return NextResponse.json(
      { error: "Failed to fetch museums" },
      { status: 500 }
    );
  }
}

// POST /api/geoguide/museums
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Check if slug already exists
    const existingMuseum = await prisma.museum.findUnique({
      where: { slug: body.slug },
    });

    if (existingMuseum) {
      return NextResponse.json(
        { message: "ეს slug უკვე გამოყენებულია" },
        { status: 400 }
      );
    }

    const museum = await prisma.museum.create({
      data: {
        // Georgian
        name: body.name,
        description: body.description || null,
        city: body.city || null,
        address: body.address || null,

        // English
        nameEn: body.nameEn || null,
        descriptionEn: body.descriptionEn || null,
        cityEn: body.cityEn || null,
        addressEn: body.addressEn || null,

        // Russian
        nameRu: body.nameRu || null,
        descriptionRu: body.descriptionRu || null,
        cityRu: body.cityRu || null,
        addressRu: body.addressRu || null,

        // German
        nameDe: body.nameDe || null,
        descriptionDe: body.descriptionDe || null,
        cityDe: body.cityDe || null,
        addressDe: body.addressDe || null,

        // French
        nameFr: body.nameFr || null,
        descriptionFr: body.descriptionFr || null,
        cityFr: body.cityFr || null,
        addressFr: body.addressFr || null,

        // Ukrainian
        nameUk: body.nameUk || null,
        descriptionUk: body.descriptionUk || null,
        cityUk: body.cityUk || null,
        addressUk: body.addressUk || null,

        // Common
        slug: body.slug,
        coverImage: body.coverImage || null,
        latitude: body.latitude ?? null,
        longitude: body.longitude ?? null,
        contactEmail: body.contactEmail || null,
        contactPhone: body.contactPhone || null,
        website: body.website || null,

        // Settings
        showMap: body.showMap ?? false,
        showQrScanner: body.showQrScanner ?? false,
        isPublished: body.isPublished ?? false,
      },
    });

    return NextResponse.json(museum, { status: 201 });
  } catch (error) {
    console.error("Error creating museum:", error);
    return NextResponse.json(
      { error: "Failed to create museum" },
      { status: 500 }
    );
  }
}