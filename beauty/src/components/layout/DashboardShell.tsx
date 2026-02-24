'use client';

import { Sidebar } from '@/components/layout/Sidebar';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-dark-900">
      <Sidebar />
      <main className="lg:pl-64 min-h-screen">
        <div className="p-4 lg:p-6 pt-16 lg:pt-6">{children}</div>
      </main>
    </div>
  );
}
