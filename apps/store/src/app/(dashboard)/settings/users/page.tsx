import { DashboardLayout } from "@/components/layout";
import { PlaceholderPage } from "@/components/shared/PlaceholderPage";

export default function UsersSettingsPage() {
  return (
    <DashboardLayout
      title="მომხმარებლები"
      breadcrumb="მთავარი / პარამეტრები / მომხმარებლები"
    >
      <PlaceholderPage
        title="მაღაზიის თანამშრომლები"
        description="ქეშირები, მენეჯერები, PIN-ები."
      />
    </DashboardLayout>
  );
}
