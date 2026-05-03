import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "@saas-platform/ui/src/styles/globals.css";
import { ThemeProvider } from "next-themes";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const SITE_URL = "https://geobiz.app";
const SITE_NAME = "GeoBiz";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "GeoBiz — ბიზნეს მენეჯმენტის SaaS პლატფორმა | სასტუმრო, რესტორანი, სილამაზის სალონი, მაღაზია, ლუდსახარში",
    template: "%s | GeoBiz",
  },
  description:
    "GeoBiz — საქართველოში #1 ბიზნეს მენეჯმენტის პლატფორმა. სასტუმროების, რესტორნების, სილამაზის სალონების, მაღაზიების, ლუდსახარშების, ღვინის ქარხნებისა და დისტილერიების სრულყოფილი მართვა ერთ პლატფორმაზე. დაიწყეთ უფასოდ.",
  keywords: [
    // ქართული keywords
    "სასტუმროს მართვის სისტემა",
    "სასტუმროს PMS",
    "Channel Manager საქართველო",
    "Booking.com ინტეგრაცია",
    "რესტორნის მართვის სისტემა",
    "POS ტერმინალი",
    "სილამაზის სალონის CRM",
    "მაღაზიის სალარო",
    "RS.ge ფისკალური ინტეგრაცია",
    "ლუდსახარშის მართვა",
    "ღვინის ქარხნის მართვა",
    "დისტილერიის მართვა",
    "ბიზნეს მენეჯმენტი საქართველო",
    "SaaS პლატფორმა",
    "GeoBiz",
    // English keywords
    "hotel management software Georgia",
    "PMS Georgia",
    "restaurant management system",
    "beauty salon CRM",
    "POS system Georgia",
    "brewery management software",
    "winery management",
    "distillery management software",
    "business management SaaS",
  ],
  authors: [{ name: "GeoBiz" }],
  creator: "GeoBiz",
  publisher: "GeoBiz",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
    languages: {
      "ka-GE": "/ka",
      "en-US": "/en",
      "x-default": "/ka",
    },
  },
  openGraph: {
    type: "website",
    locale: "ka_GE",
    alternateLocale: ["en_US"],
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "GeoBiz — ბიზნეს მენეჯმენტის SaaS პლატფორმა",
    description:
      "სასტუმროების, რესტორნების, სილამაზის სალონების, მაღაზიების, ლუდსახარშების, ღვინის ქარხნებისა და დისტილერიების სრულყოფილი მართვა ერთ პლატფორმაზე.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "GeoBiz — Multi-Module Business Management Platform",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GeoBiz — ბიზნეს მენეჯმენტის SaaS პლატფორმა",
    description:
      "სასტუმრო, რესტორანი, სილამაზის სალონი, მაღაზია, ლუდსახარში — ერთ პლატფორმაზე.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/site.webmanifest",
  verification: {
    // Google Search Console-ის verification code-ი მოგვიანებით ჩავსვამთ
    // google: "YOUR_GOOGLE_VERIFICATION_CODE",
  },
  category: "Business Software",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ka" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}