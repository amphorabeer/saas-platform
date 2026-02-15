import { DashboardLayout } from "@/components/layout";
import { TaxRulesManager } from "@/components/settings/TaxRulesManager";
import { getTaxRules } from "@/lib/store-actions";

export default async function TaxSettingsPage() {
  const rules = await getTaxRules();
  return (
    <DashboardLayout
      title="დღგ წესები"
      breadcrumb="მთავარი / პარამეტრები / დღგ"
    >
      <TaxRulesManager initialRules={rules} />
    </DashboardLayout>
  );
}
