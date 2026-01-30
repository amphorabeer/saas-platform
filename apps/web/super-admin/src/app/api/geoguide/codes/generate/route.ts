import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// კოდის გენერაცია: GEOG-XXXX-XXXX ფორმატში
function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // გამოვრიცხეთ 0, O, 1, I
  let code = "GEOG-";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  code += "-";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// კოდის hash-ირება
function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

// POST /api/geoguide/codes/generate - კოდების გენერაცია
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const count = Math.min(Math.max(body.count || 10, 1), 1000); // 1-1000
    const durationDays = body.durationDays || 30;
    const batchName = body.batchName || null;
    const batchId = crypto.randomUUID();

    const codes: {
      code: string;
      codeHash: string;
      durationDays: number;
      status: "AVAILABLE";
      batchId: string;
      batchName: string | null;
      tourIds: string[];
      museumIds: string[];
    }[] = [];

    // გენერაცია უნიკალური კოდებით
    const existingCodes = new Set(
      (await prisma.activationCode.findMany({ select: { code: true } })).map(
        (c) => c.code
      )
    );

    for (let i = 0; i < count; i++) {
      let code: string;
      let attempts = 0;
      
      // უნიკალური კოდის პოვნა
      do {
        code = generateCode();
        attempts++;
        if (attempts > 100) {
          return NextResponse.json(
            { error: "Failed to generate unique codes" },
            { status: 500 }
          );
        }
      } while (existingCodes.has(code));

      existingCodes.add(code);

      codes.push({
        code,
        codeHash: hashCode(code),
        durationDays,
        status: "AVAILABLE",
        batchId,
        batchName,
        tourIds: body.tourIds || [],
        museumIds: body.museumIds || [],
      });
    }

    // Batch insert
    await prisma.activationCode.createMany({
      data: codes,
    });

    // Return created codes
    const createdCodes = await prisma.activationCode.findMany({
      where: { batchId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(createdCodes, { status: 201 });
  } catch (error) {
    console.error("Error generating codes:", error);
    return NextResponse.json(
      { error: "Failed to generate codes" },
      { status: 500 }
    );
  }
}
