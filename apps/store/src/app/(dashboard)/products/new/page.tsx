export const dynamic = "force-dynamic";

import { DashboardLayout } from "@/components/layout";
import { ProductForm } from "@/components/products/ProductForm";
import { getCategories } from "@/lib/store-actions";

export default async function NewProductPage() {
  let categories: { id: string; name: string }[] = [];
  try {
    categories = await getCategories();
  } catch (e) {
    console.warn("Categories fetch failed:", e);
  }

  return (
    <DashboardLayout
      title="ახალი პროდუქტი"
      breadcrumb="მთავარი / პროდუქტები / ახალი"
    >
      <div className="max-w-3xl">
        <ProductForm categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
      </div>
    </DashboardLayout>
  );
}
