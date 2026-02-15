export const dynamic = "force-dynamic";

import { DashboardLayout } from "@/components/layout";
import { TransfersList } from "@/components/inventory/TransfersList";
import { getTransferOrders, getStores, getProducts } from "@/lib/store-actions";
import { getOrCreateDefaultStore } from "@/lib/store";

export default async function TransfersPage() {
  const currentStoreId = await getOrCreateDefaultStore();
  const [transfers, stores, productsData] = await Promise.all([
    getTransferOrders(),
    getStores(),
    getProducts({ limit: 500, isActive: true, storeId: currentStoreId }),
  ]);

  return (
    <DashboardLayout
      title="მარაგის გადაცემები"
      breadcrumb="მთავარი / მარაგები / გადაცემები"
    >
      <TransfersList
        currentStoreId={currentStoreId}
        transfers={transfers}
        stores={stores}
        products={productsData.products.map((p) => ({ id: p.id, name: p.nameKa || p.name, sku: p.sku, currentStock: p.currentStock }))}
      />
    </DashboardLayout>
  );
}
