import { DashboardLayout } from "@/components/layout";
import { ReceiveGoodsForm } from "@/components/purchases/ReceiveGoodsForm";
import { FormattedDate } from "@/components/ui/FormattedDate";
import { formatCurrency } from "@/lib/format";
import { getPurchaseOrderById } from "@/lib/store-actions";
import Link from "next/link";
import { Button } from "@saas-platform/ui";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  STORE_PO_DRAFT: "შაბლონი",
  STORE_PO_ORDERED: "შეკვეთილი",
  STORE_PO_PARTIAL: "ნაწილობრივ მიღებული",
  STORE_PO_RECEIVED: "მიღებული",
  STORE_PO_CANCELLED: "გაუქმებული",
};

export default async function PurchaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getPurchaseOrderById(id);
  if (!order) notFound();

  const canReceive =
    order.status !== "STORE_PO_RECEIVED" &&
    order.status !== "STORE_PO_CANCELLED" &&
    order.items.some((i) => i.receivedQty < i.quantity);

  return (
    <DashboardLayout
      title={`შეკვეთა ${order.orderNumber}`}
      breadcrumb={`მთავარი / შესყიდვები / ${order.orderNumber}`}
    >
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/purchases">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              უკან
            </Button>
          </Link>
        </div>

        <div className="rounded-xl border border-border bg-bg-secondary p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <p className="text-xs text-text-muted uppercase">მომწოდებელი</p>
              <p className="font-medium">{order.supplier.name}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted uppercase">თარიღი</p>
              <p suppressHydrationWarning><FormattedDate date={order.createdAt} /></p>
            </div>
            <div>
              <p className="text-xs text-text-muted uppercase">სტატუსი</p>
              <p>{STATUS_LABELS[order.status] ?? order.status}</p>
            </div>
          </div>

          <div className="rounded-lg border border-border overflow-hidden mb-8">
            <table className="w-full">
              <thead className="bg-bg-tertiary">
                <tr>
                  <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">
                    პროდუქტი
                  </th>
                  <th className="text-right text-xs font-medium text-text-muted uppercase px-4 py-3">
                    რაოდენობა
                  </th>
                  <th className="text-right text-xs font-medium text-text-muted uppercase px-4 py-3">
                    მიღებული
                  </th>
                  <th className="text-right text-xs font-medium text-text-muted uppercase px-4 py-3">
                    ერთეულის ფასი
                  </th>
                  <th className="text-right text-xs font-medium text-text-muted uppercase px-4 py-3">
                    ჯამი
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {order.items.map((i) => (
                  <tr key={i.id}>
                    <td className="px-4 py-3">
                      {i.product.nameKa || i.product.name}
                      <span className="ml-2 text-xs text-text-muted">{i.product.sku}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {i.quantity} {i.product.unit}
                    </td>
                    <td className="px-4 py-3 text-right text-text-muted">
                      {i.receivedQty} {i.product.unit}
                    </td>
                    <td className="px-4 py-3 text-right" suppressHydrationWarning>
                      {formatCurrency(i.unitCost)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium" suppressHydrationWarning>
                      {formatCurrency(i.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-bg-tertiary border-t border-border">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-right font-medium">
                    სულ
                  </td>
                  <td className="px-4 py-3 text-right font-semibold" suppressHydrationWarning>
                    {formatCurrency(order.total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div>
            <h3 className="text-sm font-medium text-text-secondary mb-3">
              საქონლის მიღება
            </h3>
            <ReceiveGoodsForm
              orderId={order.id}
              orderNumber={order.orderNumber}
              items={order.items}
              canReceive={canReceive}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
