import { DashboardLayout } from "@/components/layout";
import { TaxRulesManager } from "@/components/settings/TaxRulesManager";
import { getTaxRules } from "@/lib/store-actions";

export default async function TaxRulesSettingsPage() {
  const rules = await getTaxRules();
  return (
    <DashboardLayout
      title="საგადასახადო წესები"
      breadcrumb="მთავარი / პარამეტრები / საგადასახადო წესები"
    >
      <TaxRulesManager initialRules={rules} />
    </DashboardLayout>
  );
}
