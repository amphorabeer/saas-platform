import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createSaleFromOfflineSync } from "@/lib/store-actions";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const sessionStoreId = (session?.user as { storeId?: string } | undefined)?.storeId;
  if (!sessionStoreId) {
    return NextResponse.json({ error: "ავტორიზაცია საჭიროა" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const storeId = body.storeId ?? sessionStoreId;
    if (storeId !== sessionStoreId) {
      return NextResponse.json({ error: "წვდომა აკრძალულია" }, { status: 403 });
    }

    const result = await createSaleFromOfflineSync({
      storeId,
      saleNumber: body.saleNumber,
      customerId: body.customerId ?? null,
      employeeId: body.employeeId ?? null,
      items: body.items ?? [],
      subtotal: Number(body.subtotal ?? 0),
      discountAmount: Number(body.discountAmount ?? 0),
      discountType: body.discountType ?? null,
      total: Number(body.total ?? 0),
      payments: body.payments ?? [],
      notes: body.notes ?? null,
      loyaltyPointsEarned: body.loyaltyPointsEarned,
      loyaltyPointsRedeemed: body.loyaltyPointsRedeemed,
    });

    if (result.success) {
      return NextResponse.json({ success: true, saleId: result.saleId });
    }
    return NextResponse.json({ error: result.error }, { status: 400 });
  } catch (e) {
    console.error("Sync sale error:", e);
    return NextResponse.json({ error: "სერვერის შეცდომა" }, { status: 500 });
  }
}
