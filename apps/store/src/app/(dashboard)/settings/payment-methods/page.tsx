import { DashboardLayout } from "@/components/layout";
import { PaymentConfigManager } from "@/components/settings/PaymentConfigManager";
import { getPaymentConfigs } from "@/lib/store-actions";

export default async function PaymentMethodsSettingsPage() {
  const configs = await getPaymentConfigs();
  return (
    <DashboardLayout
      title="გადახდის მეთოდები"
      breadcrumb="მთავარი / პარამეტრები / გადახდის მეთოდები"
    >
      <PaymentConfigManager initialConfigs={configs} />
    </DashboardLayout>
  );
}
