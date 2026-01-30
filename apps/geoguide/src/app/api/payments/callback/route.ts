import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.SUPER_ADMIN_API_URL || "http://localhost:3001";

// POST /api/payments/callback - TBC callback
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log("TBC Callback received:", body);

    const { PaymentId, Status, Amount, Currency, OrderId } = body;

    if (!OrderId) {
      return NextResponse.json({ error: "Missing OrderId" }, { status: 400 });
    }

    // Update payment status
    const updateRes = await fetch(`${API_BASE}/api/geoguide/payments/${OrderId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tbcPaymentId: PaymentId,
        status: Status === "Succeeded" ? "COMPLETED" : "FAILED",
        tbcStatus: Status,
      }),
    });

    if (!updateRes.ok) {
      console.error("Failed to update payment status");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Callback error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
