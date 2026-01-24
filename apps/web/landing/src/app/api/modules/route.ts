// ============================================
// apps/web/landing/src/app/api/modules/route.ts
// ============================================

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// CORS headers for cross-origin requests from Super Admin
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// GET - Landing page იძახებს მოდულების ჩასატვირთად
export async function GET(request: NextRequest) {
  try {
    console.log("📥 [GET /api/modules] Loading from database...");

    // Always load from database
    const config = await prisma.siteConfig.findUnique({
      where: { key: "landing-modules" },
    });

    if (config?.value) {
      const modules = typeof config.value === "string" 
        ? JSON.parse(config.value) 
        : config.value;
      
      console.log("✅ [GET /api/modules] Loaded", Array.isArray(modules) ? modules.length : 0, "modules from database");
      
      return NextResponse.json(
        {
          success: true,
          modules: modules,
          source: "database",
        },
        { headers: corsHeaders }
      );
    }

    // No data in database
    console.log("ℹ️ [GET /api/modules] No modules found in database");
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
      { success: false, error: "Failed to load modules", details: error?.message, modules: [] },
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

    console.log("📥 [POST /api/modules] Saving", modules.length, "modules to database...");

    // Save to database
    await prisma.siteConfig.upsert({
      where: { key: "landing-modules" },
      update: {
        value: modules,
        updatedAt: new Date(),
      },
      create: {
        key: "landing-modules",
        value: modules,
      },
    });

    console.log("✅ [POST /api/modules] Saved to database successfully");

    return NextResponse.json(
      {
        success: true,
        message: "Saved to database",
        count: modules.length,
      },
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error("❌ [POST /api/modules] Error:", error?.message || error);
    return NextResponse.json(
      { success: false, error: "Failed to save modules", details: error?.message },
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