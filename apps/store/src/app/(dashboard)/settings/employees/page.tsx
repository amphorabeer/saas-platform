import { DashboardLayout } from "@/components/layout";
import { EmployeeManager } from "@/components/settings/EmployeeManager";
import { getStoreEmployees } from "@/lib/store-actions";

export default async function EmployeesSettingsPage() {
  const employees = await getStoreEmployees();
  return (
    <DashboardLayout
      title="თანამშრომლები"
      breadcrumb="მთავარი / პარამეტრები / თანამშრომლები"
    >
      <EmployeeManager initialEmployees={employees} />
    </DashboardLayout>
  );
}
