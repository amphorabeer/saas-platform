import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.SUPER_ADMIN_API_URL || "http://localhost:3001";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, deviceId, tourId, museumSlug } = body;

    if (!code || !deviceId) {
      return NextResponse.json(
        { error: "INVALID_REQUEST", message: "კოდი და მოწყობილობის ID აუცილებელია" },
        { status: 400 }
      );
    }

    const res = await fetch(`${API_BASE}/api/geoguide/codes/redeem`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, deviceId, tourId, museumSlug }),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Error redeeming code:", error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "სერვერის შეცდომა" },
      { status: 500 }
    );
  }
}
