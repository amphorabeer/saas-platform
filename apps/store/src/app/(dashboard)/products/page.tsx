import Link from "next/link";

export const dynamic = "force-dynamic";
import { DashboardLayout } from "@/components/layout";
import { ProductTable } from "@/components/products/ProductTable";
import { getProducts, getCategories } from "@/lib/store-actions";

export default async function ProductsPage() {
  let productsData = { products: [], total: 0, page: 1, totalPages: 0 };
  let categories: { id: string; name: string; slug: string }[] = [];
  try {
    [productsData, categories] = await Promise.all([
      getProducts({ page: 1, limit: 20 }),
      getCategories(),
    ]);
  } catch (e) {
    console.warn("Products fetch failed (build/runtime):", e);
  }

  return (
    <DashboardLayout title="პროდუქტები" breadcrumb="მთავარი / პროდუქტები">
      <div className="space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <p className="text-sm text-text-muted">
              სულ {productsData.total} პროდუქტი
            </p>
            <Link
              href="/products/categories"
              className="px-3 py-1.5 rounded-lg border border-border text-text-secondary hover:bg-bg-tertiary hover:text-text-primary text-sm transition-colors"
            >
              კატეგორიები
            </Link>
          </div>
          <Link
            href="/products/new"
            className="px-4 py-2 rounded-lg bg-copper/20 text-copper-light border border-copper/30 hover:bg-copper/30 transition-colors text-sm font-medium"
          >
            + ახალი პროდუქტი
          </Link>
        </div>
        <ProductTable
          initialData={productsData}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        />
      </div>
    </DashboardLayout>
  );
}
