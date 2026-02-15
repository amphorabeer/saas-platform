import { DashboardLayout } from "@/components/layout";
import { CustomerDetailView } from "@/components/customers";
import { getCustomerById, getLoyaltyTransactions } from "@/lib/store-actions";
import Link from "next/link";
import { Button } from "@saas-platform/ui";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [customer, loyaltyTransactions] = await Promise.all([
    getCustomerById(id),
    getLoyaltyTransactions(id),
  ]);
  if (!customer) notFound();

  const displayName = `${customer.firstName} ${customer.lastName ?? ""}`.trim();

  return (
    <DashboardLayout
      title={displayName}
      breadcrumb={`მთავარი / მომხმარებლები / ${displayName}`}
    >
      <div className="space-y-6">
        <CustomerDetailView customer={customer} loyaltyTransactions={loyaltyTransactions} />
        <Link href={`/customers/${id}/edit`}>
          <Button variant="outline">რედაქტირება</Button>
        </Link>
      </div>
    </DashboardLayout>
  );
}
