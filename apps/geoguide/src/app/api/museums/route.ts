import { NextResponse } from "next/server";

const API_BASE = process.env.SUPER_ADMIN_API_URL || "http://localhost:3001";

export async function GET() {
  try {
    const res = await fetch(`${API_BASE}/api/geoguide/museums`, {
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json([], { status: 200 });
    }

    const museums = await res.json();

    const publishedMuseums = museums.filter((m: { isPublished?: boolean }) => m.isPublished);

    return NextResponse.json(publishedMuseums);
  } catch (error) {
    console.error("Error fetching museums:", error);
    return NextResponse.json([], { status: 200 });
  }
}
