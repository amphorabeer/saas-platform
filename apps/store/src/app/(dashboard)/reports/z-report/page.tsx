import { DashboardLayout } from "@/components/layout";
import { ZReport } from "@/components/reports";

export const dynamic = "force-dynamic";

export default function ZReportPage() {
  return (
    <DashboardLayout
      title="Z რეპორტი"
      breadcrumb="მთავარი / რეპორტები / Z რეპორტი"
    >
      <ZReport />
    </DashboardLayout>
  );
}
