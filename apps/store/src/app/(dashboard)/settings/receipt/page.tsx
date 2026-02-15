import { DashboardLayout } from "@/components/layout";
import { ReceiptConfigForm } from "@/components/settings/ReceiptConfigForm";
import { getReceiptConfig } from "@/lib/store-actions";

export default async function ReceiptSettingsPage() {
  const config = await getReceiptConfig();
  return (
    <DashboardLayout
      title="ჩეკის შაბლონი"
      breadcrumb="მთავარი / პარამეტრები / ჩეკის შაბლონი"
    >
      <ReceiptConfigForm config={config} />
    </DashboardLayout>
  );
}
