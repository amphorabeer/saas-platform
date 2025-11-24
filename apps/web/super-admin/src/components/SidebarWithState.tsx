"use client";

import { useTheme } from "next-themes";
import { Moon, Sun, LogOut } from "lucide-react";
import { Button, Badge } from "@saas-platform/ui";
import { logout, getAuth } from "../lib/auth";

const sidebarItems = [
  { label: "დეშბორდი", id: "dashboard", icon: "📊" },
  { label: "Landing Editor", id: "landing-editor", icon: "✏️", badge: "NEW" },
  { label: "ორგანიზაციები", id: "organizations", icon: "🏢", count: "436" },
  { label: "მომხმარებლები", id: "users", icon: "👥", count: "12.8K" },
  { label: "გამოწერები", id: "subscriptions", icon: "💳", count: "291" },
  { label: "ფინანსები", id: "financial", icon: "💰" },
  { label: "ანალიტიკა", id: "analytics", icon: "📈" },
  { label: "რეპორტები", id: "reports", icon: "📋" },
  { label: "მარკეტინგი", id: "marketing", icon: "📢" },
  { label: "Support", id: "support", icon: "🎧", badge: "5", badgeColor: "destructive" },
  { label: "ინტეგრაციები", id: "integrations", icon: "🔌" },
  { label: "პარამეტრები", id: "settings", icon: "⚙️" },
];

export function SidebarWithState({
  activeSection,
  setActiveSection,
}: {
  activeSection: string;
  setActiveSection: (section: string) => void;
}) {
  const { theme, setTheme } = useTheme();

  return (
    <aside className="w-64 min-h-screen border-r bg-muted/40 p-6 flex flex-col">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Super Admin</h1>
        <p className="text-sm text-muted-foreground">პლატფორმის მართვა</p>
      </div>
      <nav className="space-y-2 flex-1 overflow-y-auto">
        {sidebarItems.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center justify-between gap-3 px-4 py-2 rounded-lg transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
            >
              <div className="flex items-center gap-3">
                <span>{item.icon}</span>
                <span className="text-sm">{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                {item.count && (
                  <span className="text-xs opacity-70">{item.count}</span>
                )}
                {item.badge && (
                  <Badge
                    variant={item.badgeColor === "destructive" ? "destructive" : "default"}
                    className="text-xs"
                  >
                    {item.badge}
                  </Badge>
                )}
              </div>
            </button>
          );
        })}
      </nav>
      <div className="pt-4 border-t space-y-2">
        <div className="mb-2 px-4 py-2 text-sm text-muted-foreground">
          {getAuth()?.email}
        </div>
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
        <Button
          variant="outline"
          className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
          onClick={logout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          გასვლა
        </Button>
      </div>
    </aside>
  );
}
