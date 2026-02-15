import { DashboardLayout } from "@/components/layout";
import { CustomerForm } from "@/components/customers";

export const dynamic = "force-dynamic";

export default function NewCustomerPage() {
  return (
    <DashboardLayout
      title="ახალი მომხმარებელი"
      breadcrumb="მთავარი / მომხმარებლები / ახალი"
    >
      <CustomerForm />
    </DashboardLayout>
  );
}
