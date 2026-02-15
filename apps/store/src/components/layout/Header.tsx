"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import { LogOut } from "lucide-react";

interface HeaderProps {
  title: string;
  breadcrumb?: string;
}

export function Header({ title, breadcrumb = "" }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: session } = useSession();

  return (
    <header className="px-8 py-5 flex justify-between items-center border-b border-border bg-bg-secondary sticky top-0 z-30">
      <div>
        <h2 className="font-semibold text-2xl">{title}</h2>
        {breadcrumb && (
          <p className="text-xs text-text-muted mt-1">{breadcrumb}</p>
        )}
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center bg-bg-tertiary border border-border rounded-lg px-4 py-2 gap-2">
          <span className="text-text-muted text-sm">🔍</span>
          <input
            type="text"
            placeholder="ძიება..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-sm w-48 text-text-primary placeholder:text-text-muted"
          />
        </div>
        <button className="relative w-10 h-10 rounded-lg bg-bg-tertiary border border-border flex items-center justify-center text-lg hover:border-copper transition-colors">
          🔔
        </button>
        {session?.user && (
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-2 rounded-lg bg-bg-tertiary border border-border px-3 py-2 text-sm text-text-secondary hover:text-text hover:border-copper transition-colors"
            title="გასვლა"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">გასვლა</span>
          </button>
        )}
      </div>
    </header>
  );
}
