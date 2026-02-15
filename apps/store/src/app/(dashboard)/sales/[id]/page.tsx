import { DashboardLayout } from "@/components/layout";
import { SaleDetailView, ReturnForm } from "@/components/sales";
import { getSaleById } from "@/lib/store-actions";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sale = await getSaleById(id);
  if (!sale) notFound();

  const returnedByProduct: Record<string, number> = {};
  for (const r of sale.returns) {
    for (const ri of r.items) {
      returnedByProduct[ri.productId] =
        (returnedByProduct[ri.productId] ?? 0) + ri.quantity;
    }
  }

  const itemsForReturn = sale.items
    .map((i) => {
      const returned = returnedByProduct[i.productId] ?? 0;
      const remaining = Math.max(0, i.quantity - returned);
      return {
        id: i.id,
        productId: i.productId,
        productName: i.product.name,
        nameKa: i.product.nameKa,
        quantity: i.quantity,
        remaining,
        unitPrice: i.unitPrice,
        total: i.total,
      };
    })
    .filter((i) => i.remaining > 0);

  const canReturn =
    sale.status !== "VOIDED" &&
    sale.status !== "REFUNDED" &&
    itemsForReturn.length > 0;

  return (
    <DashboardLayout
      title={`გაყიდვა ${sale.saleNumber}`}
      breadcrumb={`მთავარი / გაყიდვები / ${sale.saleNumber}`}
    >
      <div className="space-y-8">
        <SaleDetailView sale={sale} />
        <div className="rounded-xl border border-border bg-bg-secondary p-6">
          <ReturnForm
            saleId={sale.id}
            saleNumber={sale.saleNumber}
            items={itemsForReturn}
            canReturn={canReturn}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
