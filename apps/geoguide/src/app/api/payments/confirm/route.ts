import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.SUPER_ADMIN_API_URL || "http://localhost:3001";

// POST /api/payments/confirm - გადახდის დადასტურება და კოდის გენერაცია
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, deviceId, tourId, museumSlug } = body;

    if (!orderId || !deviceId) {
      return NextResponse.json(
        { error: "INVALID_REQUEST", message: "არასრული მონაცემები" },
        { status: 400 }
      );
    }

    // Confirm payment and create entitlement
    const res = await fetch(`${API_BASE}/api/geoguide/payments/${orderId}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId,
        tourId,
        museumSlug,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Confirm payment error:", error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "სერვერის შეცდომა" },
      { status: 500 }
    );
  }
}
