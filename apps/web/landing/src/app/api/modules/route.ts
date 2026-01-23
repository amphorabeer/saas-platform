// ============================================
// apps/web/landing/src/app/api/modules/route.ts
// ============================================

import { NextRequest, NextResponse } from "next/server";

// In-memory storage (works instantly, survives until server restart)
let modulesCache: any[] | null = null;

// CORS headers for cross-origin requests from Super Admin (port 3001 -> 3000)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// GET - Landing page იძახებს მოდულების ჩასატვირთად
export async function GET(request: NextRequest) {
  try {
    console.log("📥 [GET /api/modules] Request received, cache has:", modulesCache?.length || 0, "modules");

    // Return cached modules if available
    if (modulesCache && modulesCache.length > 0) {
      console.log("✅ [GET /api/modules] Returning cached modules:", modulesCache.length);
      return NextResponse.json(
        {
          success: true,
          modules: modulesCache,
          source: "cache",
        },
        { headers: corsHeaders }
      );
    }

    // Try database if prisma is available
    try {
      console.log("🔍 [GET /api/modules] Trying to load from database...");
      const { default: prisma } = await import("@/lib/prisma");
      console.log("🔍 [GET /api/modules] Prisma imported, checking siteConfig...");
      
      // Check if siteConfig exists on prisma
      if (!prisma.siteConfig) {
        console.warn("⚠️ [GET /api/modules] prisma.siteConfig is undefined - model not in schema?");
        throw new Error("siteConfig model not available");
      }
      
      const config = await prisma.siteConfig.findUnique({
        where: { key: "landing-modules" },
      });

      console.log("🔍 [GET /api/modules] Database query result:", config ? "found" : "not found");

      if (config?.value) {
        const modules = typeof config.value === "string" 
          ? JSON.parse(config.value) 
          : config.value;
        
        // Cache for future requests
        modulesCache = modules;
        
        console.log("✅ [GET /api/modules] Loaded from database:", modules?.length || 0);
        return NextResponse.json(
          {
            success: true,
            modules: modules,
            source: "database",
          },
          { headers: corsHeaders }
        );
      } else {
        console.log("ℹ️ [GET /api/modules] No landing-modules config in database");
      }
    } catch (dbError: any) {
      console.warn("⚠️ [GET /api/modules] Database error:", dbError?.message || dbError);
      console.warn("⚠️ [GET /api/modules] Full error:", JSON.stringify(dbError, null, 2));
    }

    // Return empty if nothing found
    console.log("ℹ️ [GET /api/modules] No modules found");
    return NextResponse.json(
      {
        success: true,
        modules: [],
        source: "none",
      },
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error("❌ [GET /api/modules] Error:", error?.message || error);
    return NextResponse.json(
      { success: false, error: "Failed to load modules", modules: [] },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST - Super Admin იძახებს მოდულების შესანახად
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { modules } = body;

    if (!modules || !Array.isArray(modules)) {
      return NextResponse.json(
        { success: false, error: "Invalid modules data" },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log("📥 [POST /api/modules] Received", modules.length, "modules from Super Admin");

    // Update in-memory cache (instant, always works)
    modulesCache = modules;
    console.log("✅ [POST /api/modules] Updated cache with", modules.length, "modules");

    // Try database save as well
    let savedToDb = false;
    try {
      const { default: prisma } = await import("@/lib/prisma");
      
      if (!prisma.siteConfig) {
        console.warn("⚠️ [POST /api/modules] prisma.siteConfig is undefined");
        throw new Error("siteConfig model not available");
      }
      
      await prisma.siteConfig.upsert({
        where: { key: "landing-modules" },
        update: {
          value: JSON.stringify(modules),
          updatedAt: new Date(),
        },
        create: {
          key: "landing-modules",
          value: JSON.stringify(modules),
        },
      });
      
      savedToDb = true;
      console.log("✅ [POST /api/modules] Also saved to database");
    } catch (dbError: any) {
      console.warn("⚠️ [POST /api/modules] Database error:", dbError?.message || dbError);
    }

    return NextResponse.json(
      {
        success: true,
        message: savedToDb ? "Saved to database + cache" : "Saved to cache",
        count: modules.length,
      },
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error("❌ [POST /api/modules] Error:", error?.message || error);
    return NextResponse.json(
      { success: false, error: "Failed to save modules" },
      { status: 500, headers: corsHeaders }
    );
  }
}

// OPTIONS - CORS preflight request handler
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}