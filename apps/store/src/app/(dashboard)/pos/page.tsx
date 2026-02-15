import { POSTerminal } from "@/components/pos";
import { getCategories, getProducts, getPosPrintConfig, getStoreCustomers, getLoyaltyConfig } from "@/lib/store-actions";
import { getOrCreateDefaultStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function POSPage() {
  const storeId = await getOrCreateDefaultStore();
  const [categories, productsData, printConfig, customers, loyaltyConfig] = await Promise.all([
    getCategories(),
    getProducts({ limit: 500, isActive: true }),
    getPosPrintConfig(),
    getStoreCustomers(storeId),
    getLoyaltyConfig(storeId),
  ]);

  const categoryList = categories.map((c) => ({
    id: c.id,
    name: c.name,
    nameKa: c.nameKa,
    slug: c.slug,
  }));

  const productList = productsData.products.map((p) => ({
    id: p.id,
    name: p.name,
    nameKa: p.nameKa,
    sku: p.sku,
    barcode: p.barcode,
    sellingPrice: p.sellingPrice,
    costPrice: p.costPrice,
    imageUrl: p.imageUrl,
    categoryId: p.categoryId,
  }));

  const customerList = customers.map((c) => ({
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    phone: c.phone,
    loyaltyPoints: c.loyaltyPoints ?? 0,
  }));

  return (
    <POSTerminal
      storeId={storeId}
      categories={categoryList}
      products={productList}
      printConfig={printConfig}
      customers={customerList}
      loyaltyConfig={loyaltyConfig ? {
        redemptionRate: loyaltyConfig.redemptionRate,
        minRedemptionPoints: loyaltyConfig.minRedemptionPoints,
      } : null}
    />
  );
}
