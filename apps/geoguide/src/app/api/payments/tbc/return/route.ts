import { NextRequest, NextResponse } from "next/server";
import { parseFlittPostBody } from "@/lib/flitt-payment.service";

export async function POST(request: NextRequest) {
  let orderId = "";
  try {
    const data = await parseFlittPostBody(request);
    orderId = String(data.order_id || "");
  } catch {
    // Fall through to URL params
  }

  if (!orderId) {
    const url = new URL(request.url);
    orderId = url.searchParams.get("orderId") || "";
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://geoguide.ge";
  return NextResponse.redirect(`${baseUrl}/payment/result?orderId=${orderId}`, 303);
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get("orderId") || "";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://geoguide.ge";
  return NextResponse.redirect(`${baseUrl}/payment/result?orderId=${orderId}`, 303);
}
