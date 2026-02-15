import { DashboardLayout } from "@/components/layout";
import { EmployeeReport } from "@/components/reports";

export const dynamic = "force-dynamic";

export default function EmployeeReportPage() {
  return (
    <DashboardLayout
      title="თანამშრომლების მუშაობა"
      breadcrumb="მთავარი / რეპორტები / თანამშრომლები"
    >
      <EmployeeReport />
    </DashboardLayout>
  );
}
