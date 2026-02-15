import { DashboardLayout } from "@/components/layout";
import { LocationsManager } from "@/components/settings/LocationsManager";
import { getStores } from "@/lib/store-actions";

export default async function LocationsPage() {
  const stores = await getStores();
  return (
    <DashboardLayout
      title="ფილიალები"
      breadcrumb="მთავარი / პარამეტრები / ფილიალები"
    >
      <LocationsManager stores={stores} />
    </DashboardLayout>
  );
}
