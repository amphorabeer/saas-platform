import { DashboardLayout } from "@/components/layout";
import { PurchaseOrderTable } from "@/components/purchases/PurchaseOrderTable";
import { getPurchaseOrders, getSuppliers } from "@/lib/store-actions";
import Link from "next/link";
import { Button } from "@saas-platform/ui";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PurchasesPage() {
  const [initialData, suppliers] = await Promise.all([
    getPurchaseOrders({ page: 1, limit: 20 }),
    getSuppliers(),
  ]);
  const supplierList = suppliers.map((s) => ({ id: s.id, name: s.name }));

  return (
    <DashboardLayout title="შესყიდვები" breadcrumb="მთავარი / შესყიდვები">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">შეკვეთების სია</h2>
          <Link href="/purchases/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              ახალი შეკვეთა
            </Button>
          </Link>
        </div>
        <PurchaseOrderTable initialData={initialData} suppliers={supplierList} />
      </div>
    </DashboardLayout>
  );
}
