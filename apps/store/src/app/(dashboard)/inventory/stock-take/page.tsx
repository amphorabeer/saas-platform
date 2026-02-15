export const dynamic = "force-dynamic";

import { DashboardLayout } from "@/components/layout";
import { StockTakeForm } from "@/components/inventory/StockTakeForm";
import { getInventoryOverview } from "@/lib/store-actions";

export default async function StockTakePage() {
  let products: Awaited<ReturnType<typeof getInventoryOverview>> = [];
  try {
    products = await getInventoryOverview();
  } catch (e) {
    console.warn("Products fetch failed:", e);
  }

  return (
    <DashboardLayout
      title="ინვენტარიზაცია"
      breadcrumb="მთავარი / მარაგები / ინვენტარიზაცია"
    >
      <div className="space-y-4">
        <p className="text-sm text-text-muted">
          ფიზიკური აღრიცხვის შედეგების შეყვანა. შეცვლილი მნიშვნელობები შეიქმნება
          კორექტირების ჩანაწერად.
        </p>
        <StockTakeForm
          products={products.map((p) => ({
            id: p.id,
            name: p.name,
            nameKa: p.nameKa,
            sku: p.sku,
            currentStock: p.currentStock,
            unit: p.unit,
          }))}
        />
      </div>
    </DashboardLayout>
  );
}
