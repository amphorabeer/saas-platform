import { DashboardLayout } from "@/components/layout";
import { SalesTable } from "@/components/sales";
import { getSales, getStoreCustomers, getStoreEmployees } from "@/lib/store-actions";

export const dynamic = "force-dynamic";

export default async function SalesPage() {
  const [initialData, customers, employees] = await Promise.all([
    getSales({ page: 1, limit: 20 }),
    getStoreCustomers(),
    getStoreEmployees(),
  ]);

  return (
    <DashboardLayout title="გაყიდვები" breadcrumb="მთავარი / გაყიდვები">
      <div className="space-y-6">
        <h2 className="text-lg font-semibold">გაყიდვების ისტორია</h2>
        <SalesTable
          initialData={initialData}
          customers={customers}
          employees={employees}
        />
      </div>
    </DashboardLayout>
  );
}
