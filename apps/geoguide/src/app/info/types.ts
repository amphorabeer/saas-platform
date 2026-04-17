import type { Prisma } from "@prisma/client";

export type InfoLang = "en" | "ru" | "pl" | "ka";

export type MuseumLang =
  | "ka"
  | "en"
  | "ru"
  | "de"
  | "fr"
  | "uk"
  | "es"
  | "it"
  | "pl"
  | "tr"
  | "az"
  | "hy"
  | "he"
  | "ar"
  | "ko"
  | "ja"
  | "zh";

export const INFO_LANGS: InfoLang[] = ["en", "ru", "pl", "ka"];

export const INFO_LANG_FLAGS: Record<InfoLang, string> = {
  en: "🇬🇧",
  ru: "🇷🇺",
  pl: "🇵🇱",
  ka: "🇬🇪",
};

export const LANG_FLAGS: Record<MuseumLang, string> = {
  ka: "🇬🇪",
  en: "🇬🇧",
  ru: "🇷🇺",
  de: "🇩🇪",
  fr: "🇫🇷",
  uk: "🇺🇦",
  es: "🇪🇸",
  it: "🇮🇹",
  pl: "🇵🇱",
  tr: "🇹🇷",
  az: "🇦🇿",
  hy: "🇦🇲",
  he: "🇮🇱",
  ar: "🇸🇦",
  ko: "🇰🇷",
  ja: "🇯🇵",
  zh: "🇨🇳",
};

const MUSEUM_LANG_ORDER: MuseumLang[] = [
  "ka",
  "en",
  "ru",
  "de",
  "fr",
  "uk",
  "es",
  "it",
  "pl",
  "tr",
  "az",
  "hy",
  "he",
  "ar",
  "ko",
  "ja",
  "zh",
];

export type MuseumForInfo = {
  id: string;
  slug: string;
  coverImage: string | null;
  displayOrder: number;
  name: string;
  city: string | null;
  nameEn: string | null;
  cityEn: string | null;
  nameRu: string | null;
  cityRu: string | null;
  nameDe: string | null;
  cityDe: string | null;
  nameFr: string | null;
  cityFr: string | null;
  nameUk: string | null;
  cityUk: string | null;
  nameEs: string | null;
  cityEs: string | null;
  nameIt: string | null;
  cityIt: string | null;
  namePl: string | null;
  cityPl: string | null;
  nameTr: string | null;
  cityTr: string | null;
  nameAz: string | null;
  cityAz: string | null;
  nameHy: string | null;
  cityHy: string | null;
  nameHe: string | null;
  cityHe: string | null;
  nameAr: string | null;
  cityAr: string | null;
  nameKo: string | null;
  cityKo: string | null;
  nameJa: string | null;
  cityJa: string | null;
  nameZh: string | null;
  cityZh: string | null;
  tours: {
    id: string;
    price: Prisma.Decimal | null;
    isFree: boolean;
    currency: string;
    isPublished: boolean;
  }[];
};

export function museumHasLanguage(museum: MuseumForInfo, lang: MuseumLang): boolean {
  if (lang === "ka") return !!museum.name;
  const key = `name${lang.charAt(0).toUpperCase() + lang.slice(1)}` as keyof MuseumForInfo;
  return !!museum[key];
}

export function getMuseumLanguages(museum: MuseumForInfo): MuseumLang[] {
  return MUSEUM_LANG_ORDER.filter((lang) => museumHasLanguage(museum, lang));
}

export function getMuseumName(museum: MuseumForInfo, lang: InfoLang): string {
  if (lang === "ka") return museum.name;
  if (lang === "en") return museum.nameEn ?? museum.name;
  if (lang === "ru") return museum.nameRu ?? museum.nameEn ?? museum.name;
  if (lang === "pl") return museum.namePl ?? museum.nameEn ?? museum.name;
  return museum.name;
}

export function getMuseumCity(museum: MuseumForInfo, lang: InfoLang): string {
  if (lang === "ka") return museum.city ?? "";
  if (lang === "en") return museum.cityEn ?? museum.city ?? "";
  if (lang === "ru") return museum.cityRu ?? museum.cityEn ?? museum.city ?? "";
  if (lang === "pl") return museum.cityPl ?? museum.cityEn ?? museum.city ?? "";
  return museum.city ?? "";
}

export function getPriceRange(museum: MuseumForInfo): { min: number; max: number } | null {
  const publishedPaidTours = museum.tours.filter((t) => t.isPublished && !t.isFree && t.price);
  if (publishedPaidTours.length === 0) return null;

  const prices = publishedPaidTours.map((t) => Number(t.price));
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
  };
}

export function formatPrice(
  range: { min: number; max: number } | null,
  lang: InfoLang
): string {
  if (!range)
    return lang === "ka" ? "უფასო" : lang === "ru" ? "Бесплатно" : lang === "pl" ? "Bezpłatnie" : "Free";

  const currency = lang === "ka" ? "ლარი" : lang === "ru" ? "лари" : lang === "pl" ? "lari" : "GEL";

  if (range.min === range.max) {
    return `${range.min} ${currency}`;
  }
  return `${range.min}–${range.max} ${currency}`;
}
