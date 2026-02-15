import { DashboardLayout } from "@/components/layout";
import { PurchaseOrderForm } from "@/components/purchases/PurchaseOrderForm";
import { getSuppliers, getProducts } from "@/lib/store-actions";

export const dynamic = "force-dynamic";

export default async function NewPurchasePage() {
  const [suppliers, productsData] = await Promise.all([
    getSuppliers(),
    getProducts({ limit: 500 }),
  ]);
  const supplierList = suppliers.map((s) => ({ id: s.id, name: s.name }));
  const productList = productsData.products.map((p) => ({
    id: p.id,
    name: p.name,
    nameKa: p.nameKa,
    sku: p.sku,
    unit: p.unit,
  }));

  return (
    <DashboardLayout
      title="ახალი შესყიდვა"
      breadcrumb="მთავარი / შესყიდვები / ახალი"
    >
      <PurchaseOrderForm suppliers={supplierList} products={productList} />
    </DashboardLayout>
  );
}
