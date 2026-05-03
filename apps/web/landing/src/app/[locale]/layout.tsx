import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { ThemeProvider } from "next-themes";
import "@saas-platform/ui/src/styles/globals.css";
import { locales, type Locale } from "../../i18n";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const SITE_URL = "https://geobiz.app";
const SITE_NAME = "GeoBiz";

// ⚡ Locale-ების სტატიკურად გენერაცია (build time)
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

// ⚡ Metadata დინამიურად — locale-ის მიხედვით
export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const { locale } = params;

  // Validation — თუ ენა არასწორია, 404
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: "Metadata" });

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: t("title"),
      template: `%s | ${SITE_NAME}`,
    },
    description: t("description"),
    keywords:
      locale === "ka"
        ? [
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
          ]
        : [
            "hotel management software Georgia",
            "PMS Georgia",
            "Channel Manager Georgia",
            "Booking.com integration",
            "restaurant management system",
            "POS system Georgia",
            "beauty salon CRM",
            "retail POS Georgia",
            "RS.ge fiscal integration",
            "brewery management software",
            "winery management",
            "distillery management software",
            "business management SaaS",
            "GeoBiz",
          ],
    authors: [{ name: SITE_NAME }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    alternates: {
      canonical: locale === "ka" ? "/" : `/${locale}`,
      languages: {
        "ka-GE": "/",
        "en-US": "/en",
        "x-default": "/",
      },
    },
    openGraph: {
      type: "website",
      locale: locale === "ka" ? "ka_GE" : "en_US",
      alternateLocale: locale === "ka" ? ["en_US"] : ["ka_GE"],
      url: locale === "ka" ? SITE_URL : `${SITE_URL}/${locale}`,
      siteName: SITE_NAME,
      title: t("ogTitle"),
      description: t("ogDescription"),
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: SITE_NAME,
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t("ogTitle"),
      description: t("ogDescription"),
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
      apple: [
        { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      ],
    },
    manifest: "/site.webmanifest",
    category: "Business Software",
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const { locale } = params;

  // Validation
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  // ⚡ Messages-ის გადატვირთვა locale-ის მიხედვით
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={inter.className}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {children}
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
