import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/language-context";
import ChatWidget from "@/components/chat/ChatWidget";
import Footer from "@/components/Footer";

const inter = Inter({ subsets: ["latin", "cyrillic", "cyrillic-ext"] });

export const metadata: Metadata = {
  title: "GeoGuide - აუდიო გიდი",
  description: "საქართველოს მუზეუმების აუდიო გიდი",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GeoGuide",
  },
};

export const viewport: Viewport = {
  themeColor: "#f59e0b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ka">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('SW registered: ', registration);
                    },
                    function(err) {
                      console.log('SW registration failed: ', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <LanguageProvider>
          <div className="flex flex-col min-h-screen">
            <main className="flex-1 bg-gray-50 pt-safe pb-safe">
              {children}
            </main>
            <Footer />
          </div>
          <ChatWidget />
        </LanguageProvider>
      </body>
    </html>
  );
}
