import { DashboardLayout } from "@/components/layout";
import { SupplierTable } from "@/components/purchases/SupplierTable";
import { getSuppliers } from "@/lib/store-actions";
import Link from "next/link";
import { Button } from "@saas-platform/ui";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const initialSuppliers = await getSuppliers();

  return (
    <DashboardLayout
      title="მომწოდებლები"
      breadcrumb="მთავარი / შესყიდვები / მომწოდებლები"
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">მომწოდებლების სია</h2>
          <Link href="/purchases/suppliers/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              ახალი მომწოდებელი
            </Button>
          </Link>
        </div>
        <SupplierTable initialSuppliers={initialSuppliers} />
      </div>
    </DashboardLayout>
  );
}
