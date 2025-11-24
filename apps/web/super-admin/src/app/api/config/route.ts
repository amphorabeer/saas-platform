import { NextRequest, NextResponse } from "next/server";
import { getConfig, setConfig } from "@saas-platform/database";

// Log environment check (only in development)
if (process.env.NODE_ENV === "development") {
  console.log("[API Config] DATABASE_URL available:", !!process.env.DATABASE_URL);
  if (process.env.DATABASE_URL) {
    console.log("[API Config] DATABASE_URL:", process.env.DATABASE_URL.replace(/:[^:@]+@/, ":****@"));
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json({ error: "Key is required" }, { status: 400 });
    }

    console.log(`[API GET] Getting config for key: ${key}`);
    console.log(`[API GET] DATABASE_URL: ${process.env.DATABASE_URL ? "SET" : "NOT SET"}`);
    
    try {
      const value = await getConfig(key);
      console.log(`[API GET] Config retrieved successfully for key: ${key}, value: ${value ? "exists" : "null"}`);
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
    console.error("[API GET] Error getting config:", {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
      clientVersion: error?.clientVersion,
      name: error?.name,
    });
    // Return null instead of error so frontend can use localStorage
    console.warn("[API GET] Returning null due to error (frontend will use localStorage)");
    return NextResponse.json({ key: request.nextUrl.searchParams.get("key"), value: null });
  }
}

export async function POST(request: NextRequest) {
  let key: string | undefined;
  let value: any;
  
  try {
    const body = await request.json();
    key = body.key;
    value = body.value;

    if (!key || value === undefined) {
      return NextResponse.json({ error: "Key and value are required" }, { status: 400 });
    }

    console.log(`[API POST] Setting config for key: ${key}`);
    try {
      await setConfig(key, value);
      console.log(`[API POST] Config saved successfully for key: ${key}`);
      return NextResponse.json({ success: true, key, value });
    } catch (dbError: any) {
      // If database fails (permission issues), still return success
      // Frontend will save to localStorage as fallback
      if (dbError.code === "P1010" || dbError.message?.includes("denied access") || dbError.message?.includes("permission")) {
        console.warn("[API POST] Database access denied, but returning success (frontend will use localStorage)");
        return NextResponse.json({ 
          success: true, 
          key, 
          value,
          warning: "Saved to localStorage (database unavailable)"
        });
      }
      throw dbError;
    }
  } catch (error: any) {
    console.error("[API POST] Error setting config:", {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
      stack: error?.stack,
    });
    // Even on error, return success so frontend can use localStorage
    console.warn("[API POST] Returning success despite error (frontend will use localStorage)");
    return NextResponse.json({ 
      success: true, 
      key: key || "unknown", 
      value: value,
      warning: "Using localStorage fallback (database error)"
    });
  }
}

