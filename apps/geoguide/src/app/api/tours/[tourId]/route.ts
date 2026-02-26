import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.SUPER_ADMIN_API_URL || "http://localhost:3001";

// GET /api/tours/[tourId] - ტურის ინფორმაცია
export async function GET(
  request: NextRequest,
  { params }: { params: { tourId: string } }
) {
  try {
    const res = await fetch(`${API_BASE}/api/geoguide/tours/${params.tourId}`, {
      cache: 'no-store',
    });
    
    if (!res.ok) {
      return NextResponse.json(
        { error: "ტური ვერ მოიძებნა" },
        { status: 404 }
      );
    }

    const tour = await res.json();

    // Filter published halls and stops
    const publishedHalls = (tour.halls || []).filter((h: any) => h.isPublished !== false);
    const publishedStops = (tour.stops || []).filter((s: any) => s.isPublished !== false);

    return NextResponse.json({
      id: tour.id,
      name: tour.name,
      nameEn: tour.nameEn,
      nameRu: tour.nameRu,
      nameUk: tour.nameUk,
      description: tour.description,
      descriptionEn: tour.descriptionEn,
      descriptionRu: tour.descriptionRu,
      descriptionUk: tour.descriptionUk,
      price: parseFloat(tour.price) || 0,
      currency: tour.currency || "GEL",
      duration: tour.duration,
      stopsCount: publishedStops.length,
      isFree: tour.isFree,
      coverImage: tour.coverImage,
      vrTourId: tour.vrTourId || null,
      museum: {
        name: tour.museum?.name,
        nameEn: tour.museum?.nameEn,
        nameRu: tour.museum?.nameRu,
        nameUk: tour.museum?.nameUk,
        coverImage: tour.museum?.coverImage,
      },
      halls: publishedHalls.map((hall: any) => ({
        id: hall.id,
        name: hall.name,
        nameEn: hall.nameEn,
        nameRu: hall.nameRu,
        nameUk: hall.nameUk,
        imageUrl: hall.imageUrl,
        orderIndex: hall.orderIndex,
        stopsCount: publishedStops.filter((s: any) => s.hallId === hall.id).length,
      })),
      stops: publishedStops.map((stop: any) => ({
        id: stop.id,
        title: stop.title,
        titleEn: stop.titleEn,
        titleRu: stop.titleRu,
        titleUk: stop.titleUk,
        description: stop.description,
        descriptionEn: stop.descriptionEn,
        descriptionRu: stop.descriptionRu,
        descriptionUk: stop.descriptionUk,
        audioUrl: stop.audioUrl,
        audioUrlEn: stop.audioUrlEn,
        audioUrlRu: stop.audioUrlRu,
        audioUrlUk: stop.audioUrlUk,
        imageUrl: stop.imageUrl,
        orderIndex: stop.orderIndex,
        hallId: stop.hallId,
      })),
    });
  } catch (error) {
    console.error("Error fetching tour:", error);
    return NextResponse.json(
      { error: "შეცდომა მოხდა" },
      { status: 500 }
    );
  }
}