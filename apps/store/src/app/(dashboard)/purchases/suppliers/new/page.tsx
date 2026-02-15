import { DashboardLayout } from "@/components/layout";
import { SupplierForm } from "@/components/purchases/SupplierForm";

export const dynamic = "force-dynamic";

export default function NewSupplierPage() {
  return (
    <DashboardLayout
      title="ახალი მომწოდებელი"
      breadcrumb="მთავარი / შესყიდვები / მომწოდებლები / ახალი"
    >
      <SupplierForm />
    </DashboardLayout>
  );
}
