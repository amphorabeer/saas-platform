"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SidebarWithState } from "../components/SidebarWithState";
import { DashboardContent } from "../components/DashboardContent";
import { LandingEditor } from "../components/LandingEditor";
import { ContactRequestsManager } from "../components/ContactRequestsManager";
import { FinancialSection } from "../components/FinancialSection";
import { ReportsSection } from "../components/ReportsSection";
import { MarketingSection } from "../components/MarketingSection";
import { SupportSection } from "../components/SupportSection";
import { IntegrationsSection } from "../components/IntegrationsSection";
import { Toaster } from "sonner";
import { isAuthenticated } from "../lib/auth";

// Import other page components
import OrganizationsPage from "./organizations/page";
import UsersPage from "./users/page";
import SubscriptionsPage from "./subscriptions/page";
import AnalyticsPage from "./analytics/page";
import SettingsPage from "./settings/page";

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    // Check authentication
    if (!isAuthenticated()) {
      router.push('/auth/login');
    } else {
      setIsAuth(true);
    }
  }, [router]);

  // Show loading or nothing while checking auth
  if (!isAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">იტვირთება...</div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return <DashboardContent />;
      case "landing-editor":
        return <LandingEditor />;
      case "organizations":
        return <OrganizationsPage />;
      case "users":
        return <UsersPage />;
      case "subscriptions":
        return <SubscriptionsPage />;
      case "financial":
        return <FinancialSection />;
      case "analytics":
        return <AnalyticsPage />;
      case "reports":
        return <ReportsSection />;
      case "marketing":
        return <MarketingSection />;
      case "contact-requests":
        return <ContactRequestsManager />;
      case "support":
        return <SupportSection />;
      case "integrations":
        return <IntegrationsSection />;
      case "settings":
        return <SettingsPage />;
      default:
        return <DashboardContent />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" />
      <div className="flex">
        <SidebarWithState activeSection={activeSection} setActiveSection={setActiveSection} />
        <main className="flex-1 p-8">{renderContent()}</main>
      </div>
    </div>
  );
}
