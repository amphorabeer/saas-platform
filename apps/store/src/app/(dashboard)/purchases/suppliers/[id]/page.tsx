import { DashboardLayout } from "@/components/layout";
import { SupplierForm } from "@/components/purchases/SupplierForm";
import { getSupplierById } from "@/lib/store-actions";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SupplierEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supplier = await getSupplierById(id);
  if (!supplier) notFound();

  return (
    <DashboardLayout
      title={`რედაქტირება: ${supplier.name}`}
      breadcrumb={`მთავარი / შესყიდვები / მომწოდებლები / ${supplier.name}`}
    >
      <SupplierForm
        supplier={{
          id: supplier.id,
          name: supplier.name,
          contactPerson: supplier.contactPerson,
          phone: supplier.phone,
          email: supplier.email,
          address: supplier.address,
          taxId: supplier.taxId,
          bankAccount: supplier.bankAccount,
          notes: supplier.notes,
          isActive: supplier.isActive,
        }}
      />
    </DashboardLayout>
  );
}
