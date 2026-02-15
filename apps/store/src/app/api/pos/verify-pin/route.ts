import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const storeId = (session?.user as { storeId?: string } | undefined)?.storeId;
  if (!storeId) {
    return NextResponse.json({ error: "ავტორიზაცია საჭიროა" }, { status: 401 });
  }

  try {
    const { pin } = (await req.json()) as { pin?: string };
    if (!pin || typeof pin !== "string") {
      return NextResponse.json({ error: "PIN აუცილებელია" }, { status: 400 });
    }

    const employees = await prisma.storeEmployee.findMany({
      where: { storeId, isActive: true, pin: { not: null } },
      select: { id: true, firstName: true, lastName: true, role: true, pin: true },
    });

    for (const emp of employees) {
      if (emp.pin && (await bcrypt.compare(pin.trim(), emp.pin))) {
        return NextResponse.json({
          success: true,
          employee: {
            id: emp.id,
            firstName: emp.firstName,
            lastName: emp.lastName,
            role: emp.role,
          },
        });
      }
    }
    return NextResponse.json({ error: "არასწორი PIN" }, { status: 401 });
  } catch (e) {
    console.error("Verify PIN error:", e);
    return NextResponse.json({ error: "შეცდომა" }, { status: 500 });
  }
}
