import { NextRequest, NextResponse } from "next/server";
import { getConfig } from "@saas-platform/database";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json({ error: "Key is required" }, { status: 400 });
    }

    try {
      const value = await getConfig(key);
      return NextResponse.json({ key, value });
    } catch (dbError: any) {
      // If database fails (permission issues), return null so frontend uses localStorage
      if (dbError.code === "P1010" || dbError.message?.includes("denied access") || dbError.message?.includes("permission")) {
        console.warn("[API GET] Database access denied, returning null (frontend will use localStorage)");
        return NextResponse.json({ key, value: null });
      }
      throw dbError;
    }
  } catch (error: any) {
    console.error("[API GET] Error getting config:", error?.message);
    // Return null instead of error so frontend can use localStorage
    const key = request.nextUrl.searchParams.get("key");
    return NextResponse.json({ key, value: null });
  }
}

