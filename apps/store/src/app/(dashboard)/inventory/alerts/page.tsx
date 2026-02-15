export const dynamic = "force-dynamic";

import Link from "next/link";
import { DashboardLayout } from "@/components/layout";
import { LowStockAlerts } from "@/components/inventory/LowStockAlerts";
import { getLowStockProducts } from "@/lib/store-actions";

export default async function AlertsPage() {
  let products: Awaited<ReturnType<typeof getLowStockProducts>> = [];
  try {
    products = await getLowStockProducts();
  } catch (e) {
    console.warn("Low stock fetch failed:", e);
  }

  return (
    <DashboardLayout
      title="დაბალი მარაგი"
      breadcrumb="მთავარი / მარაგები / ალერტები"
    >
      <div className="space-y-4">
        <p className="text-sm text-text-muted">
          პროდუქტები, რომლების მიმდინარე მარაგი ნაკლებია მინიმალურ მარაგზე
          (currentStock &lt; minStock)
        </p>
        <LowStockAlerts products={products} />
      </div>
    </DashboardLayout>
  );
}
