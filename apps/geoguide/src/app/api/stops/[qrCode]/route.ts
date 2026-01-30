import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.SUPER_ADMIN_API_URL || "http://localhost:3001";

export async function GET(
  request: NextRequest,
  { params }: { params: { qrCode: string } }
) {
  try {
    // Search for stop by QR code
    const res = await fetch(
      `${API_BASE}/api/geoguide/stops/by-qr/${params.qrCode}`,
      { cache: "no-store" }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Stop not found" },
        { status: 404 }
      );
    }

    const stop = await res.json();
    return NextResponse.json(stop);
  } catch (error) {
    console.error("Error fetching stop by QR:", error);
    return NextResponse.json(
      { error: "Failed to fetch stop" },
      { status: 500 }
    );
  }
}
