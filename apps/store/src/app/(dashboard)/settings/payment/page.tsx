import { DashboardLayout } from "@/components/layout";
import { PaymentConfigManager } from "@/components/settings/PaymentConfigManager";
import { getPaymentConfigs } from "@/lib/store-actions";

export default async function PaymentSettingsPage() {
  const configs = await getPaymentConfigs();
  return (
    <DashboardLayout
      title="გადახდის მეთოდები"
      breadcrumb="მთავარი / პარამეტრები / გადახდა"
    >
      <PaymentConfigManager initialConfigs={configs} />
    </DashboardLayout>
  );
}
