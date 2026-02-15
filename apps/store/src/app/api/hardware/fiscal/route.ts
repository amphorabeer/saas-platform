import { NextRequest, NextResponse } from "next/server";

/**
 * Fiscal device proxy - forwards to Kasa.ge / Daisy Expert HTTP API.
 * Real implementation depends on provider API docs.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, apiUrl, credentials, receipt, action } = body as {
      type: string;
      apiUrl?: string;
      credentials?: Record<string, string>;
      receipt?: object;
      action?: string;
    };

    if (!apiUrl) {
      return NextResponse.json(
        { error: "API URL არ არის მითითებული" },
        { status: 400 }
      );
    }

    if (action === "zReport") {
      const res = await fetch(`${apiUrl}/z-report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(credentials?.token && { Authorization: `Bearer ${credentials.token}` }),
          ...(credentials?.username && credentials?.password && {
            Authorization: `Basic ${Buffer.from(`${credentials.username}:${credentials.password}`).toString("base64")}`,
          }),
        },
      });
      const data = await res.json();
      if (!res.ok) {
        return NextResponse.json(
          { error: (data as { message?: string }).message ?? "ფისკალური შეცდომა" },
          { status: res.status }
        );
      }
      return NextResponse.json({ success: true });
    }

    if (!receipt) {
      return NextResponse.json(
        { error: "ჩეკის მონაცემები არ არის" },
        { status: 400 }
      );
    }

    const res = await fetch(`${apiUrl}/receipt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(credentials?.token && { Authorization: `Bearer ${credentials.token}` }),
        ...(credentials?.username && credentials?.password && {
          Authorization: `Basic ${Buffer.from(`${credentials.username}:${credentials.password}`).toString("base64")}`,
        }),
      },
      body: JSON.stringify(receipt),
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: (data as { message?: string }).message ?? "ფისკალური შეცდომა" },
        { status: res.status }
      );
    }
    return NextResponse.json({
      success: true,
      fiscalNumber: (data as { fiscalNumber?: string }).fiscalNumber ?? (data as { receiptId?: string }).receiptId,
    });
  } catch (e) {
    console.error("Fiscal error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "ფისკალური შეცდომა" },
      { status: 500 }
    );
  }
}
