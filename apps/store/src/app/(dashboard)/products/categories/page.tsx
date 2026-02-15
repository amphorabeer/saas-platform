export const dynamic = "force-dynamic";

import { DashboardLayout } from "@/components/layout";
import { CategoryManager } from "@/components/products/CategoryManager";
import { getCategories } from "@/lib/store-actions";

export default async function CategoriesPage() {
  let categories: Awaited<ReturnType<typeof getCategories>> = [];
  try {
    categories = await getCategories();
  } catch (e) {
    console.warn("Categories fetch failed:", e);
  }

  return (
    <DashboardLayout
      title="კატეგორიები"
      breadcrumb="მთავარი / პროდუქტები / კატეგორიები"
    >
      <CategoryManager initialCategories={categories} />
    </DashboardLayout>
  );
}
