import { DashboardLayout } from "@/components/layout";
import { LoyaltyConfigForm } from "@/components/settings/LoyaltyConfigForm";
import { getLoyaltyConfig } from "@/lib/store-actions";

export default async function LoyaltySettingsPage() {
  const config = await getLoyaltyConfig();
  return (
    <DashboardLayout
      title="ლოიალობის პროგრამა"
      breadcrumb="მთავარი / პარამეტრები / ლოიალობა"
    >
      <LoyaltyConfigForm config={config} />
    </DashboardLayout>
  );
}
