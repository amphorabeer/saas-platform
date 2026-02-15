import { DashboardLayout } from "@/components/layout";
import { IntegrationsSettings } from "@/components/settings/IntegrationsSettings";
import { getIntegration } from "@/lib/store-actions";

export default async function IntegrationsSettingsPage() {
  const rsge = await getIntegration("RS_GE");
  return (
    <DashboardLayout
      title="ინტეგრაციები"
      breadcrumb="მთავარი / პარამეტრები / ინტეგრაციები"
    >
      <IntegrationsSettings
        rsGeConfig={
          rsge
            ? {
                credentials: rsge.credentials as { username?: string; password?: string } | null,
                settings: rsge.settings as { autoWaybill?: boolean } | null,
                isActive: rsge.isActive,
              }
            : null
        }
      />
    </DashboardLayout>
  );
}
