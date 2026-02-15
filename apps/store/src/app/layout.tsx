import type { Metadata } from "next";
import { Noto_Sans_Georgian } from "next/font/google";
import { Toaster } from "sonner";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { PwaProvider } from "@/components/pos/PwaProvider";
import "./globals.css";

const notoSans = Noto_Sans_Georgian({
  subsets: ["georgian", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-noto-sans-georgian",
});

export const metadata: Metadata = {
  title: "Store POS - საცალო მაღაზიის მართვა",
  description: "პოზ სისტემა და მაღაზიის მართვა",
  icons: { icon: "/favicon.ico" },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ka" className={notoSans.variable}>
      <body className={`${notoSans.className} dark`}>
        <SessionProvider>
          <PwaProvider>{children}</PwaProvider>
          <Toaster position="top-right" />
        </SessionProvider>
      </body>
    </html>
  );
}
