import { DashboardLayout } from "@/components/layout";
import { ImportWizard } from "@/components/settings/ImportWizard";

export default function ImportSettingsPage() {
  return (
    <DashboardLayout
      title="მონაცემების იმპორტი"
      breadcrumb="მთავარი / პარამეტრები / იმპორტი"
    >
      <ImportWizard />
    </DashboardLayout>
  );
}
