import { DashboardLayout } from "@/components/layout";
import { CustomerForm } from "@/components/customers";
import { getCustomerById } from "@/lib/store-actions";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CustomerEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await getCustomerById(id);
  if (!customer) notFound();

  const displayName = `${customer.firstName} ${customer.lastName ?? ""}`.trim();

  return (
    <DashboardLayout
      title={`რედაქტირება: ${displayName}`}
      breadcrumb={`მთავარი / მომხმარებლები / ${displayName} / რედაქტირება`}
    >
      <CustomerForm
        customer={{
          id: customer.id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          phone: customer.phone,
          email: customer.email,
          address: customer.address,
          taxId: customer.taxId,
          notes: customer.notes,
        }}
      />
    </DashboardLayout>
  );
}
