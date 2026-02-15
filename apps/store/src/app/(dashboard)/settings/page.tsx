import { DashboardLayout } from "@/components/layout";
import { PlaceholderPage } from "@/components/shared/PlaceholderPage";

export default function SettingsPage() {
  return (
    <DashboardLayout title="პარამეტრები" breadcrumb="მთავარი / პარამეტრები">
      <PlaceholderPage
        title="პარამეტრები"
        description="სისტემის და მაღაზიის კონფიგურაცია."
      />
    </DashboardLayout>
  );
}
