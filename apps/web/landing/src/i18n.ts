import { notFound } from "next/navigation";
import { getRequestConfig } from "next-intl/server";

// ⚡ მხარდაჭერილი ენები
export const locales = ["ka", "en"] as const;
export type Locale = (typeof locales)[number];

// ⚡ Default ენა — ქართული
export const defaultLocale: Locale = "ka";

// ⚡ ენის სახელები (UI-სთვის — language switcher-ზე)
export const localeNames: Record<Locale, string> = {
  ka: "ქართული",
  en: "English",
};

// ⚡ ენის flag emoji (UI-სთვის)
export const localeFlags: Record<Locale, string> = {
  ka: "🇬🇪",
  en: "🇬🇧",
};

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale;

  if (!locale || !locales.includes(locale as Locale)) notFound();

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    // ⚡ Time zone — საქართველო
    timeZone: "Asia/Tbilisi",
    // ⚡ Default formatting
    now: new Date(),
  };
});
