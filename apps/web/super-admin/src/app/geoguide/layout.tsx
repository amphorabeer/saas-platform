"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Moon, Sun, ArrowLeft } from "lucide-react";
import { Button } from "@saas-platform/ui";

const geoguideMenuItems = [
  { label: "დეშბორდი", href: "/geoguide", icon: "📊" },
  { label: "მუზეუმები", href: "/geoguide/museums", icon: "🏛️" },
  { label: "ტურები", href: "/geoguide/tours", icon: "🎧" },
  { label: "აქტივაციის კოდები", href: "/geoguide/codes", icon: "🔑" },
  { label: "მოწყობილობები", href: "/geoguide/devices", icon: "📱" },
  { label: "ანალიტიკა", href: "/geoguide/analytics", icon: "📈" },
  { label: "ჩატბოტი", href: "/geoguide/chatbot", icon: "🤖" },
];

export default function GeoGuideLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex min-h-screen">
      {/* GeoGuide Sidebar */}
      <aside className="w-64 min-h-screen border-r bg-amber-50 dark:bg-amber-950/20 p-6 flex flex-col">
        {/* Back to Super Admin */}
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Super Admin
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            🗺️ GeoGuide
          </h1>
          <p className="text-sm text-muted-foreground">აუდიო გიდის მართვა</p>
        </div>

        {/* Navigation */}
        <nav className="space-y-1 flex-1">
          {geoguideMenuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                  isActive
                    ? "bg-amber-500 text-white"
                    : "hover:bg-amber-100 dark:hover:bg-amber-900/30"
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Theme Toggle */}
        <div className="pt-4 border-t border-amber-200 dark:border-amber-800">
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

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-auto bg-background">
        {children}
      </main>
    </div>
  );
}
