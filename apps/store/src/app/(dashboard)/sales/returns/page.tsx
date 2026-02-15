import { DashboardLayout } from "@/components/layout";
import { ReturnsTable } from "@/components/sales";
import { getReturns } from "@/lib/store-actions";

export const dynamic = "force-dynamic";

export default async function ReturnsPage() {
  const initialData = await getReturns({ page: 1, limit: 20 });

  return (
    <DashboardLayout
      title="დაბრუნებები"
      breadcrumb="მთავარი / გაყიდვები / დაბრუნებები"
    >
      <div className="space-y-6">
        <h2 className="text-lg font-semibold">დაბრუნებების ისტორია</h2>
        <ReturnsTable initialData={initialData} />
      </div>
    </DashboardLayout>
  );
}
