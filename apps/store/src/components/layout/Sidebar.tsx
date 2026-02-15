"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { canAccessRoute } from "@/lib/permissions";
import {
  LayoutDashboard,
  ScanLine,
  Package,
  Warehouse,
  ShoppingCart,
  Receipt,
  Users,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "დეშბორდი", icon: LayoutDashboard },
  { href: "/pos", label: "POS", icon: ScanLine },
  {
    href: "/products",
    label: "პროდუქტები",
    icon: Package,
    children: [
      { href: "/products", label: "პროდუქტების სია" },
      { href: "/products/categories", label: "კატეგორიები" },
    ],
  },
  {
    href: "/inventory",
    label: "მარაგები",
    icon: Warehouse,
    children: [
      { href: "/inventory", label: "მიმოხილვა" },
      { href: "/inventory/movements", label: "მოძრაობები" },
      { href: "/inventory/transfers", label: "გადაცემები" },
      { href: "/inventory/stock-take", label: "ინვენტარიზაცია" },
      { href: "/inventory/alerts", label: "დაბალი მარაგი" },
    ],
  },
  {
    href: "/purchases",
    label: "შესყიდვები",
    icon: ShoppingCart,
    children: [
      { href: "/purchases", label: "შეკვეთების სია" },
      { href: "/purchases/suppliers", label: "მომწოდებლები" },
    ],
  },
  {
    href: "/sales",
    label: "გაყიდვები",
    icon: Receipt,
    children: [
      { href: "/sales", label: "გაყიდვების სია" },
      { href: "/sales/returns", label: "დაბრუნებები" },
    ],
  },
  { href: "/customers", label: "მომხმარებლები", icon: Users },
  {
    href: "/reports",
    label: "რეპორტები",
    icon: BarChart3,
    children: [
      { href: "/reports/z-report", label: "Z რეპორტი" },
      { href: "/reports/sales", label: "გაყიდვები" },
      { href: "/reports/inventory", label: "მარაგი" },
      { href: "/reports/profit", label: "მომგებიანობა" },
      { href: "/reports/employee", label: "თანამშრომლები" },
    ],
  },
  {
    href: "/settings",
    label: "პარამეტრები",
    icon: Settings,
    children: [
      { href: "/settings/store", label: "მაღაზია" },
      { href: "/settings/tax-rules", label: "საგადასახადო წესები" },
      { href: "/settings/payment-methods", label: "გადახდის მეთოდები" },
      { href: "/settings/receipt", label: "ჩეკის შაბლონი" },
      { href: "/settings/employees", label: "თანამშრომლები" },
      { href: "/settings/hardware", label: "აპარატურა" },
      { href: "/settings/locations", label: "ფილიალები" },
      { href: "/settings/loyalty", label: "ლოიალობა" },
      { href: "/settings/integrations", label: "ინტეგრაციები" },
      { href: "/settings/import", label: "იმპორტი" },
    ],
  },
];

function getActiveSection(pathname: string): string | null {
  for (const item of NAV_ITEMS) {
    if ("children" in item && item.children?.length && pathname.startsWith(item.href)) {
      return item.href;
    }
  }
  return null;
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role ?? "STORE_CASHIER";
  const [openSections, setOpenSections] = useState<Set<string>>(() => {
    const active = getActiveSection(pathname);
    return active ? new Set([active]) : new Set();
  });

  useEffect(() => {
    const active = getActiveSection(pathname);
    if (active) {
      setOpenSections((prev) => (prev.has(active) ? prev : new Set([...prev, active])));
    }
  }, [pathname]);

  const toggleSection = (href: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(href)) {
        next.delete(href);
      } else {
        next.add(href);
      }
      return next;
    });
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-[260px] bg-bg-secondary border-r border-border flex flex-col z-40">
      <div className="p-6 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-3">
          <span className="text-2xl">🏪</span>
          <div>
            <h1 className="font-semibold text-lg text-copper-light">Store POS</h1>
            <p className="text-[10px] text-text-muted uppercase tracking-wider">
              საცალო
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {NAV_ITEMS.filter((item) => {
            if ("children" in item && item.children?.length) {
              return item.children.some((c) => canAccessRoute(role as "STORE_OWNER" | "STORE_MANAGER" | "STORE_CASHIER" | "STORE_INVENTORY_CLERK", c.href));
            }
            return canAccessRoute(role as "STORE_OWNER" | "STORE_MANAGER" | "STORE_CASHIER" | "STORE_INVENTORY_CLERK", item.href);
          }).map((item) => {
            const hasChildren = "children" in item && item.children?.length;
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <li key={item.href}>
                {hasChildren ? (
                  <div>
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={() => toggleSection(item.href)}
                        className={`flex flex-1 items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                          isActive
                            ? "bg-copper/20 text-copper-light border border-copper/30"
                            : "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
                        }`}
                      >
                        <Icon className="w-5 h-5 shrink-0" />
                        <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
                        {openSections.has(item.href) ? (
                          <ChevronDown className="w-4 h-4 shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 shrink-0" />
                        )}
                      </button>
                    </div>
                    {openSections.has(item.href) && (
                      <ul className="mt-1 ml-4 pl-4 border-l border-border space-y-0.5">
                        {(item as { children: { href: string; label: string }[] }).children
                          .filter((child) => canAccessRoute(role as "STORE_OWNER" | "STORE_MANAGER" | "STORE_CASHIER" | "STORE_INVENTORY_CLERK", child.href))
                          .map((child) => {
                          const isChildActive = pathname === child.href;
                          return (
                            <li key={child.href}>
                              <Link
                                href={child.href}
                                className={`block px-3 py-2 rounded-lg text-sm transition-all ${
                                  isChildActive
                                    ? "text-copper-light font-medium"
                                    : "text-text-muted hover:text-text-primary"
                                }`}
                              >
                                {child.label}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                ) : (
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      isActive
                        ? "bg-copper/20 text-copper-light border border-copper/30"
                        : "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
                    }`}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-bg-tertiary">
          <div className="w-10 h-10 rounded-full bg-copper/30 flex items-center justify-center text-copper-light font-semibold text-sm">
            {status === "loading" ? "…" : (session?.user?.name?.[0] ?? "?")}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{session?.user?.name ?? "მომხმარებელი"}</p>
            <p className="text-xs text-text-muted truncate">{session?.user?.email ?? ""}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
