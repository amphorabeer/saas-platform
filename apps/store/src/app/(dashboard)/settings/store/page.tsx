import { DashboardLayout } from "@/components/layout";
import { StoreSettingsForm } from "@/components/settings/StoreSettingsForm";
import { getStoreSettings } from "@/lib/store-actions";

export default async function StoreSettingsPage() {
  const store = await getStoreSettings();
  if (!store) {
    return (
      <DashboardLayout title="მაღაზია" breadcrumb="მთავარი / პარამეტრები / მაღაზია">
        <p className="text-text-muted">მაღაზია ვერ მოიძებნა.</p>
      </DashboardLayout>
    );
  }
  return (
    <DashboardLayout
      title="მაღაზია"
      breadcrumb="მთავარი / პარამეტრები / მაღაზია"
    >
      <StoreSettingsForm store={store} />
    </DashboardLayout>
  );
}
