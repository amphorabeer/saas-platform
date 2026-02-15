import { DashboardLayout } from "@/components/layout";
import { SalesReport } from "@/components/reports";

export const dynamic = "force-dynamic";

export default function SalesReportPage() {
  return (
    <DashboardLayout
      title="გაყიდვების ანგარიში"
      breadcrumb="მთავარი / რეპორტები / გაყიდვები"
    >
      <SalesReport />
    </DashboardLayout>
  );
}
