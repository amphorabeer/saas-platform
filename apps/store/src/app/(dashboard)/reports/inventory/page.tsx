import { DashboardLayout } from "@/components/layout";
import { InventoryReport } from "@/components/reports";

export const dynamic = "force-dynamic";

export default function InventoryReportPage() {
  return (
    <DashboardLayout
      title="მარაგის ანგარიში"
      breadcrumb="მთავარი / რეპორტები / მარაგი"
    >
      <InventoryReport />
    </DashboardLayout>
  );
}
