import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.SUPER_ADMIN_API_URL || "http://localhost:3001";

// All supported language suffixes
const LANG_SUFFIXES = ['En', 'Ru', 'Uk', 'De', 'Fr', 'Es', 'It', 'Pl', 'Tr', 'Az', 'Hy', 'He', 'Ar', 'Ko', 'Ja', 'Zh'];

// Helper to pick localized fields dynamically
const pickLocalizedFields = (obj: any, baseFields: string[]) => {
  const result: any = {};
  baseFields.forEach(field => {
    result[field] = obj[field];
    LANG_SUFFIXES.forEach(suffix => {
      const key = `${field}${suffix}`;
      if (obj[key] !== undefined) {
        result[key] = obj[key];
      }
    });
  });
  return result;
};

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
      ...pickLocalizedFields(tour, ['name', 'description']),
      price: parseFloat(tour.price) || 0,
      currency: tour.currency || "GEL",
      duration: tour.duration,
      stopsCount: publishedStops.length,
      isFree: tour.isFree,
      coverImage: tour.coverImage,
      vrTourId: tour.vrTourId || null,
      museum: {
        ...pickLocalizedFields(tour.museum || {}, ['name']),
        coverImage: tour.museum?.coverImage,
      },
      halls: publishedHalls.map((hall: any) => ({
        id: hall.id,
        ...pickLocalizedFields(hall, ['name', 'description']),
        imageUrl: hall.imageUrl,
        orderIndex: hall.orderIndex,
        stopsCount: publishedStops.filter((s: any) => s.hallId === hall.id).length,
      })),
      stops: publishedStops.map((stop: any) => ({
        id: stop.id,
        ...pickLocalizedFields(stop, ['title', 'description', 'audioUrl', 'transcript']),
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
