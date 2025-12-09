import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@saas-platform/ui/src/styles/globals.css";
import "./globals.css";
import { SessionProvider } from "../components/providers/SessionProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Hotel Dashboard - SaaS Platform",
  description: "Hotel management dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ka">
      <body className={inter.className}>
        <SessionProvider>
          <div className="min-h-screen bg-gray-50">
            {children}
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}

