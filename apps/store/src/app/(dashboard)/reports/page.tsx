import { DashboardLayout } from "@/components/layout";
import Link from "next/link";
import { Receipt, Package, TrendingUp, Users } from "lucide-react";

export const dynamic = "force-dynamic";

const REPORT_LINKS = [
  { href: "/reports/sales", label: "გაყიდვების ანგარიში", icon: Receipt },
  { href: "/reports/inventory", label: "მარაგის ანგარიში", icon: Package },
  { href: "/reports/profit", label: "მომგებიანობის ანალიზი", icon: TrendingUp },
  { href: "/reports/employee", label: "თანამშრომლების მუშაობა", icon: Users },
];

export default function ReportsPage() {
  return (
    <DashboardLayout title="რეპორტები" breadcrumb="მთავარი / რეპორტები">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {REPORT_LINKS.map((r) => {
          const Icon = r.icon;
          return (
            <Link
              key={r.href}
              href={r.href}
              className="flex items-center gap-4 p-6 rounded-xl border border-border bg-bg-secondary hover:bg-bg-tertiary hover:border-copper/40 transition-all"
            >
              <div className="p-3 rounded-lg bg-copper/20 text-copper-light">
                <Icon className="h-6 w-6" />
              </div>
              <span className="font-medium">{r.label}</span>
            </Link>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
