import { DashboardLayout } from "@/components/layout";
import { ProfitReport } from "@/components/reports";

export const dynamic = "force-dynamic";

export default function ProfitReportPage() {
  return (
    <DashboardLayout
      title="მომგებიანობის ანალიზი"
      breadcrumb="მთავარი / რეპორტები / მომგებიანობა"
    >
      <ProfitReport />
    </DashboardLayout>
  );
}
