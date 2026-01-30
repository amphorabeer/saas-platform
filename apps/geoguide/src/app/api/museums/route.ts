import { NextResponse } from "next/server";

const API_BASE = process.env.SUPER_ADMIN_API_URL || "http://localhost:3001";

export async function GET() {
  console.log("API_BASE:", API_BASE);
  
  try {
    const url = `${API_BASE}/api/geoguide/museums`;
    console.log("Fetching:", url);
    
    const res = await fetch(url, {
      cache: "no-store",
    });

    console.log("Response status:", res.status);

    if (!res.ok) {
      console.log("Response not ok");
      return NextResponse.json([], { status: 200 });
    }

    const museums = await res.json();
    console.log("Museums count:", museums.length);

    const publishedMuseums = museums.filter((m: { isPublished?: boolean }) => m.isPublished);

    return NextResponse.json(publishedMuseums);
  } catch (error) {
    console.error("Error fetching museums:", error);
    return NextResponse.json([], { status: 200 });
  }
}
