import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  // Flitt sends POST redirect - extract orderId and redirect to result page
  let orderId = "";
  try {
    const ct = request.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const data = await request.json();
      orderId = data.order_id || "";
    } else {
      const fd = await request.formData();
      orderId = (fd.get("order_id") as string) || "";
    }
  } catch {}

  // Also check URL params
  if (!orderId) {
    const url = new URL(request.url);
    orderId = url.searchParams.get("orderId") || "";
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://geoguide.ge";
  // We don't know slug/tourId here, so redirect to a generic result page
  return NextResponse.redirect(`${baseUrl}/payment/result?orderId=${orderId}`, 303);
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get("orderId") || "";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://geoguide.ge";
  return NextResponse.redirect(`${baseUrl}/payment/result?orderId=${orderId}`, 303);
}
