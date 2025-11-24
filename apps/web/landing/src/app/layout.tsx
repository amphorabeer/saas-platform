import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@saas-platform/ui/src/styles/globals.css";
import { ThemeProvider } from "next-themes";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SaaS Platform - Multi-Module Business Management",
  description: "Comprehensive SaaS platform for managing Hotels, Restaurants, Beauty Salons, Shops, Breweries, Wineries, and Distilleries",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

