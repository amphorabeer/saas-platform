export const dynamic = "force-dynamic";

import { DashboardLayout } from "@/components/layout";
import { MovementHistory } from "@/components/inventory/MovementHistory";
import { getStockMovements } from "@/lib/store-actions";

export default async function MovementsPage() {
  let data = { movements: [], total: 0, page: 1, totalPages: 0 };
  try {
    data = await getStockMovements({ page: 1, limit: 30 });
  } catch (e) {
    console.warn("Movements fetch failed:", e);
  }

  return (
    <DashboardLayout
      title="მოძრაობები"
      breadcrumb="მთავარი / მარაგები / მოძრაობები"
    >
      <div className="space-y-4">
        <p className="text-sm text-text-muted">
          მარაგის შემოსვლა, გასვლა და კორექტირების ისტორია
        </p>
        <MovementHistory initialData={data} />
      </div>
    </DashboardLayout>
  );
}
