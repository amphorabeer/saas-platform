export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { DashboardLayout } from "@/components/layout";
import { ProductForm } from "@/components/products/ProductForm";
import { PriceHistoryTable } from "@/components/products/PriceHistoryTable";
import { getProductById, getCategories } from "@/lib/store-actions";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let product: Awaited<ReturnType<typeof getProductById>> = null;
  let categories: Awaited<ReturnType<typeof getCategories>> = [];
  try {
    [product, categories] = await Promise.all([
      getProductById(id),
      getCategories(),
    ]);
  } catch (e) {
    console.warn("Product fetch failed:", e);
  }

  if (!product) notFound();

  return (
    <DashboardLayout
      title={product.nameKa || product.name}
      breadcrumb={`მთავარი / პროდუქტები / ${product.name}`}
    >
      <div className="space-y-8 max-w-3xl">
        <ProductForm
          product={{
            id: product.id,
            name: product.name,
            nameKa: product.nameKa,
            sku: product.sku,
            barcode: product.barcode,
            categoryId: product.categoryId,
            description: product.description,
            imageUrl: product.imageUrl,
            costPrice: product.costPrice,
            sellingPrice: product.sellingPrice,
            wholesalePrice: product.wholesalePrice,
            currentStock: product.currentStock,
            minStock: product.minStock,
            maxStock: product.maxStock,
            unit: product.unit,
            isActive: product.isActive,
            isFavorite: product.isFavorite,
            sortOrder: product.sortOrder,
          }}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        />
        <div>
          <h3 className="text-lg font-medium mb-3">ფასის ისტორია</h3>
          <PriceHistoryTable
            history={product.priceHistory.map((h) => ({
              id: h.id,
              costPrice: h.costPrice,
              sellingPrice: h.sellingPrice,
              changedAt: h.changedAt,
              changedBy: h.changedBy,
            }))}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
