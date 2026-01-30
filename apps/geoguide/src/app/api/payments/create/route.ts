import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// TBC Pay კონფიგურაცია
const TBC_API_URL = process.env.TBC_API_URL || "https://api.tbcbank.ge/v1/tpay/payments";
const TBC_CLIENT_ID = process.env.TBC_CLIENT_ID || "";
const TBC_CLIENT_SECRET = process.env.TBC_CLIENT_SECRET || "";
const TBC_API_KEY = process.env.TBC_API_KEY || "";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3002";
const API_BASE = process.env.SUPER_ADMIN_API_URL || "http://localhost:3001";

// POST /api/payments/create - გადახდის შექმნა
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tourId, museumSlug, deviceId, amount, currency, language } = body;

    if (!tourId || !deviceId || !amount) {
      return NextResponse.json(
        { error: "INVALID_REQUEST", message: "არასრული მონაცემები" },
        { status: 400 }
      );
    }

    // Generate unique order ID
    const orderId = `GEO-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;

    // Success/Fail URLs
    const successUrl = `${APP_URL}/museum/${museumSlug}/tour/${tourId}/payment/success?orderId=${orderId}`;
    const failUrl = `${APP_URL}/museum/${museumSlug}/tour/${tourId}/payment/fail?orderId=${orderId}`;
    const callbackUrl = `${APP_URL}/api/payments/callback`;

    // Save pending payment to database
    const saveRes = await fetch(`${API_BASE}/api/geoguide/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId,
        tourId,
        museumSlug,
        deviceId,
        amount,
        currency: currency || "GEL",
        status: "PENDING",
      }),
    });

    if (!saveRes.ok) {
      console.error("Failed to save payment");
    }

    // თუ TBC credentials არ გვაქვს, დემო რეჟიმი
    if (!TBC_CLIENT_ID || !TBC_API_KEY) {
      console.log("TBC credentials not configured, using demo mode");
      
      // დემო რეჟიმში პირდაპირ success გვერდზე გადავამისამართებთ
      return NextResponse.json({
        success: true,
        paymentUrl: successUrl,
        orderId,
        demo: true,
      });
    }

    // Get TBC access token
    const tokenRes = await fetch("https://api.tbcbank.ge/v1/tpay/access-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "apiKey": TBC_API_KEY,
      },
      body: new URLSearchParams({
        client_id: TBC_CLIENT_ID,
        client_secret: TBC_CLIENT_SECRET,
      }),
    });

    if (!tokenRes.ok) {
      console.error("Failed to get TBC token");
      return NextResponse.json(
        { error: "PAYMENT_ERROR", message: "გადახდის სისტემასთან კავშირი ვერ მოხერხდა" },
        { status: 500 }
      );
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // Create TBC payment
    const paymentRes = await fetch(TBC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
        "apiKey": TBC_API_KEY,
      },
      body: JSON.stringify({
        amount: {
          currency: currency || "GEL",
          total: amount,
        },
        returnurl: successUrl,
        failurl: failUrl,
        callbackUrl: callbackUrl,
        externalOrderId: orderId,
        extra: JSON.stringify({
          tourId,
          deviceId,
          museumSlug,
        }),
        language: language === "ka" ? "KA" : language === "ru" ? "RU" : "EN",
      }),
    });

    if (!paymentRes.ok) {
      const errorData = await paymentRes.json();
      console.error("TBC payment creation failed:", errorData);
      return NextResponse.json(
        { error: "PAYMENT_ERROR", message: "გადახდის შექმნა ვერ მოხერხდა" },
        { status: 500 }
      );
    }

    const paymentData = await paymentRes.json();

    // Update payment with TBC payment ID
    await fetch(`${API_BASE}/api/geoguide/payments/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tbcPaymentId: paymentData.payId,
      }),
    });

    return NextResponse.json({
      success: true,
      paymentUrl: paymentData.links?.find((l: any) => l.rel === "approval_url")?.uri || paymentData.redirectUrl,
      orderId,
      payId: paymentData.payId,
    });
  } catch (error) {
    console.error("Payment creation error:", error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "სერვერის შეცდომა" },
      { status: 500 }
    );
  }
}
