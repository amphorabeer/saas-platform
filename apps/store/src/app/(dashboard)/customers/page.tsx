import { DashboardLayout } from "@/components/layout";
import { CustomerTable } from "@/components/customers";
import { getCustomers } from "@/lib/store-actions";
import Link from "next/link";
import { Button } from "@saas-platform/ui";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const initialData = await getCustomers({ page: 1, limit: 20 });

  return (
    <DashboardLayout title="მომხმარებლები" breadcrumb="მთავარი / მომხმარებლები">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">მომხმარებლების სია</h2>
          <Link href="/customers/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              ახალი მომხმარებელი
            </Button>
          </Link>
        </div>
        <CustomerTable initialData={initialData} />
      </div>
    </DashboardLayout>
  );
}
