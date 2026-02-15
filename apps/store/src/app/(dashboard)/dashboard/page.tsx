import nextDynamic from "next/dynamic";
import { DashboardLayout } from "@/components/layout";
import { StatCard } from "@/components/dashboard";

const SalesTrendChart = nextDynamic(
  () => import("@/components/dashboard").then((m) => m.SalesTrendChart),
  { ssr: false, loading: () => <div className="h-64 flex items-center justify-center text-text-muted">იტვირთება...</div> }
);

const TopProductsChart = nextDynamic(
  () => import("@/components/dashboard").then((m) => m.TopProductsChart),
  { ssr: false, loading: () => <div className="h-64 flex items-center justify-center text-text-muted">იტვირთება...</div> }
);

const CategoryPieChart = nextDynamic(
  () => import("@/components/dashboard").then((m) => m.CategoryPieChart),
  { ssr: false, loading: () => <div className="h-64 flex items-center justify-center text-text-muted">იტვირთება...</div> }
);

const HourlySalesChart = nextDynamic(
  () => import("@/components/dashboard").then((m) => m.HourlySalesChart),
  { ssr: false, loading: () => <div className="h-64 flex items-center justify-center text-text-muted">იტვირთება...</div> }
);
import {
  getDashboardStats,
  getSalesTrend,
  getTopProducts,
  getRevenueByCategory,
  getHourlySales,
} from "@/lib/store-actions";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";
import {
  TrendingUp,
  Receipt,
  Wallet,
  AlertTriangle,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [stats, trend, topProducts, byCategory, hourly] = await Promise.all([
    getDashboardStats(),
    getSalesTrend({ days: 7 }),
    getTopProducts({ limit: 10 }),
    getRevenueByCategory({ days: 30 }),
    getHourlySales({ days: 7 }),
  ]);

  return (
    <DashboardLayout title="დეშბორდი" breadcrumb="მთავარი / დეშბორდი">
      <div className="space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="დღიური გაყიდვები"
            value={formatCurrency(stats.dailySales)}
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <StatCard
            title="ტრანზაქციების რაოდენობა"
            value={stats.transactionCount}
            icon={<Receipt className="h-5 w-5" />}
          />
          <StatCard
            title="საშუალო ჩეკი"
            value={formatCurrency(stats.averageCheck)}
            icon={<Wallet className="h-5 w-5" />}
          />
          <Link href="/inventory/alerts">
            <StatCard
              title="დაბალი მარაგი"
              value={stats.lowStockCount}
              icon={<AlertTriangle className="h-5 w-5" />}
            />
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-border bg-bg-secondary p-6">
            <h3 className="text-sm font-medium text-text-secondary mb-4">
              7-დღიანი გაყიდვების ტრენდი
            </h3>
            <SalesTrendChart data={trend} />
          </div>
          <div className="rounded-xl border border-border bg-bg-secondary p-6">
            <h3 className="text-sm font-medium text-text-secondary mb-4">
              საათობრივი გაყიდვები (ბოლო 7 დღე)
            </h3>
            <HourlySalesChart data={hourly} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-border bg-bg-secondary p-6">
            <h3 className="text-sm font-medium text-text-secondary mb-4">
              Top 10 პროდუქტი
            </h3>
            <TopProductsChart data={topProducts} />
          </div>
          <div className="rounded-xl border border-border bg-bg-secondary p-6">
            <h3 className="text-sm font-medium text-text-secondary mb-4">
              გაყიდვები კატეგორიებით
            </h3>
            {byCategory.length > 0 ? (
              <CategoryPieChart data={byCategory} />
            ) : (
              <div className="h-64 flex items-center justify-center text-text-muted">
                მონაცემები ვერ მოიძებნა
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
