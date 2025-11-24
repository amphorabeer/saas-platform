"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@saas-platform/ui";

const sidebarItems = [
  { label: "დეშბორდი", href: "/", icon: "📊" },
  { label: "ორგანიზაციები", href: "/organizations", icon: "🏢" },
  { label: "მომხმარებლები", href: "/users", icon: "👥" },
  { label: "გამოწერები", href: "/subscriptions", icon: "💳" },
  { label: "ანალიტიკა", href: "/analytics", icon: "📈" },
  { label: "პარამეტრები", href: "/settings", icon: "⚙️" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

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

