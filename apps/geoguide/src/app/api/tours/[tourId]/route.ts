import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.SUPER_ADMIN_API_URL || "http://localhost:3001";

// GET /api/tours/[tourId] - ტურის ინფორმაცია
export async function GET(
  request: NextRequest,
  { params }: { params: { tourId: string } }
) {
  try {
    const res = await fetch(`${API_BASE}/api/geoguide/tours/${params.tourId}`);
    
    if (!res.ok) {
      return NextResponse.json(
        { error: "ტური ვერ მოიძებნა" },
        { status: 404 }
      );
    }

    const tour = await res.json();

    return NextResponse.json({
      id: tour.id,
      name: tour.name,
      nameEn: tour.nameEn,
      nameRu: tour.nameRu,
      price: parseFloat(tour.price) || 0,
      currency: tour.currency || "GEL",
      duration: tour.duration,
      stopsCount: tour.stopsCount,
      isFree: tour.isFree,
      coverImage: tour.coverImage,
      museum: {
        name: tour.museum?.name,
        nameEn: tour.museum?.nameEn,
        nameRu: tour.museum?.nameRu,
        coverImage: tour.museum?.coverImage,
      },
      stops: tour.stops || [],
    });
  } catch (error) {
    console.error("Error fetching tour:", error);
    return NextResponse.json(
      { error: "შეცდომა მოხდა" },
      { status: 500 }
    );
  }
}
