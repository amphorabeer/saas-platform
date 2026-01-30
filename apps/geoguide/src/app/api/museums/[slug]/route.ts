import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.SUPER_ADMIN_API_URL || "http://localhost:3001";

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    // Fetch all museums and find by slug
    const res = await fetch(`${API_BASE}/api/geoguide/museums`, {
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Museum not found" },
        { status: 404 }
      );
    }

    const museums = await res.json();
    const museum = museums.find(
      (m: { slug: string; isPublished?: boolean }) => m.slug === params.slug && m.isPublished
    );

    if (!museum) {
      return NextResponse.json(
        { error: "Museum not found" },
        { status: 404 }
      );
    }

    // Fetch tours for this museum
    const toursRes = await fetch(`${API_BASE}/api/geoguide/tours`, {
      cache: "no-store",
    });

    if (toursRes.ok) {
      const allTours = await toursRes.json();
      museum.tours = allTours.filter(
        (t: { museumId: string; isPublished?: boolean }) =>
          t.museumId === museum.id && t.isPublished
      );
    } else {
      museum.tours = [];
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
