"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Moon, Sun, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@saas-platform/ui";
import { useState } from "react";

const sidebarItems = [
  { label: "დეშბორდი", href: "/", icon: "📊" },
  { label: "ორგანიზაციები", href: "/organizations", icon: "🏢" },
  { label: "მომხმარებლები", href: "/users", icon: "👥" },
  { label: "გამოწერები", href: "/subscriptions", icon: "💳" },
  { label: "ანალიტიკა", href: "/analytics", icon: "📈" },
  { label: "პარამეტრები", href: "/settings", icon: "⚙️" },
];

const geoguideItems = [
  { label: "დეშბორდი", href: "/geoguide", icon: "📊" },
  { label: "მუზეუმები", href: "/geoguide/museums", icon: "🏛️" },
  { label: "ტურები", href: "/geoguide/tours", icon: "🎧" },
  { label: "აქტივაციის კოდები", href: "/geoguide/codes", icon: "🔑" },
  { label: "მოწყობილობები", href: "/geoguide/devices", icon: "📱" },
  { label: "ანალიტიკა", href: "/geoguide/analytics", icon: "📈" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [geoguideOpen, setGeoguideOpen] = useState(
    pathname.startsWith("/geoguide")
  );

  return (
    <aside className="w-64 min-h-screen border-r bg-muted/40 p-6 flex flex-col">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Super Admin</h1>
        <p className="text-sm text-muted-foreground">პლატფორმის მართვა</p>
      </div>
      <nav className="space-y-2 flex-1">
        {sidebarItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* GeoGuide სექცია */}
        <div className="pt-4 mt-4 border-t">
          <button
            onClick={() => setGeoguideOpen(!geoguideOpen)}
            className={`w-full flex items-center justify-between px-4 py-2 rounded-lg transition-colors ${
              pathname.startsWith("/geoguide")
                ? "bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-100"
                : "hover:bg-muted"
            }`}
          >
            <div className="flex items-center gap-3">
              <span>🎧</span>
              <span className="font-medium">აუდიო გიდი</span>
            </div>
            {geoguideOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>

          {geoguideOpen && (
            <div className="ml-4 mt-1 space-y-1 border-l pl-4">
              {geoguideItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      isActive
                        ? "bg-amber-500 text-white"
                        : "hover:bg-muted"
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </nav>
      <div className="pt-4 border-t">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? (
            <>
              <Sun className="h-4 w-4 mr-2" />
              ღია თემა
            </>
          ) : (
            <>
              <Moon className="h-4 w-4 mr-2" />
              მუქი თემა
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}