import { DashboardLayout } from "@/components/layout";
import { HardwareSettings } from "@/components/settings/HardwareSettings";
import { getDeviceConfigs, getStoreSettings, getReceiptConfig } from "@/lib/store-actions";

export default async function HardwareSettingsPage() {
  const [devices, store, receiptConfig] = await Promise.all([
    getDeviceConfigs(),
    getStoreSettings(),
    getReceiptConfig(),
  ]);
  return (
    <DashboardLayout
      title="აპარატურა"
      breadcrumb="მთავარი / პარამეტრები / აპარატურა"
    >
      <HardwareSettings
        initialDevices={devices}
        store={store}
        receiptConfig={receiptConfig}
      />
    </DashboardLayout>
  );
}
