export const dynamic = "force-dynamic";

import Link from "next/link";
import { DashboardLayout } from "@/components/layout";
import { StockOverview } from "@/components/inventory/StockOverview";
import { LowStockAlerts } from "@/components/inventory/LowStockAlerts";
import { getInventoryOverview, getLowStockProducts } from "@/lib/store-actions";

export default async function InventoryPage() {
  let products: Awaited<ReturnType<typeof getInventoryOverview>> = [];
  let lowStock: Awaited<ReturnType<typeof getLowStockProducts>> = [];
  try {
    [products, lowStock] = await Promise.all([
      getInventoryOverview(),
      getLowStockProducts(),
    ]);
  } catch (e) {
    console.warn("Inventory fetch failed:", e);
  }

  return (
    <DashboardLayout title="მარაგები" breadcrumb="მთავარი / მარაგები">
      <div className="space-y-6">
        <div className="flex flex-wrap gap-4">
          <Link
            href="/inventory/movements"
            className="px-3 py-1.5 rounded-lg border border-border text-text-secondary hover:bg-bg-tertiary text-sm"
          >
            მოძრაობების ისტორია
          </Link>
          <Link
            href="/inventory/stock-take"
            className="px-3 py-1.5 rounded-lg border border-border text-text-secondary hover:bg-bg-tertiary text-sm"
          >
            ინვენტარიზაცია
          </Link>
          <Link
            href="/inventory/alerts"
            className="px-3 py-1.5 rounded-lg border border-border text-text-secondary hover:bg-bg-tertiary text-sm"
          >
            დაბალი მარაგი ({lowStock.length})
          </Link>
        </div>

        {lowStock.length > 0 && (
          <div>
            <h3 className="text-lg font-medium mb-3">⚠️ დაბალი მარაგის ალერტები</h3>
            <LowStockAlerts products={lowStock} />
          </div>
        )}

        <StockOverview products={products} />
      </div>
    </DashboardLayout>
  );
}
