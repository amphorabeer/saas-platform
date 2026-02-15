import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { ChatWidget } from "@/components/ai/ChatWidget";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  breadcrumb?: string;
}

export function DashboardLayout({
  children,
  title,
  breadcrumb = "",
}: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-[260px] flex flex-col">
        <Header title={title} breadcrumb={breadcrumb} />
        <div className="flex-1 p-8 overflow-y-auto">{children}</div>
      </main>
      <ChatWidget />
    </div>
  );
}
