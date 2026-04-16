export interface Museum {
  id: string;
  name: string;
  nameEn: string | null;
  nameRu?: string | null;
  nameDe?: string | null;
  nameFr?: string | null;
  nameUk?: string | null;
  nameEs?: string | null;
  nameIt?: string | null;
  namePl?: string | null;
  nameTr?: string | null;
  nameAz?: string | null;
  nameHy?: string | null;
  nameHe?: string | null;
  nameAr?: string | null;
  nameKo?: string | null;
  nameJa?: string | null;
  nameZh?: string | null;
  description: string | null;
  descriptionEn: string | null;
  descriptionRu?: string | null;
  descriptionDe?: string | null;
  descriptionFr?: string | null;
  descriptionUk?: string | null;
  descriptionEs?: string | null;
  descriptionIt?: string | null;
  descriptionPl?: string | null;
  descriptionTr?: string | null;
  descriptionAz?: string | null;
  descriptionHy?: string | null;
  descriptionHe?: string | null;
  descriptionAr?: string | null;
  descriptionKo?: string | null;
  descriptionJa?: string | null;
  descriptionZh?: string | null;
  slug: string;
  city: string | null;
  cityEn?: string | null;
  cityRu?: string | null;
  cityDe?: string | null;
  cityFr?: string | null;
  cityUk?: string | null;
  cityEs?: string | null;
  cityIt?: string | null;
  cityPl?: string | null;
  cityTr?: string | null;
  cityAz?: string | null;
  cityHy?: string | null;
  cityHe?: string | null;
  cityAr?: string | null;
  cityKo?: string | null;
  cityJa?: string | null;
  cityZh?: string | null;
  address?: string | null;
  addressEn?: string | null;
  addressRu?: string | null;
  addressDe?: string | null;
  addressFr?: string | null;
  addressUk?: string | null;
  addressEs?: string | null;
  addressIt?: string | null;
  addressPl?: string | null;
  addressTr?: string | null;
  addressAz?: string | null;
  addressHy?: string | null;
  addressHe?: string | null;
  addressAr?: string | null;
  addressKo?: string | null;
  addressJa?: string | null;
  addressZh?: string | null;
  coverImage: string | null;
  showMap: boolean;
  tours: Tour[];
  show360View?: boolean;
  vrTourId?: string | null;
  vr360Price?: number | null;
  vr360IsFree?: boolean;
  vr360BundleWithAudio?: boolean;
}

export interface Hall {
  id: string;
  name: string;
  nameEn: string | null;
  nameRu?: string | null;
  nameDe?: string | null;
  nameFr?: string | null;
  nameUk?: string | null;
  nameEs?: string | null;
  nameIt?: string | null;
  namePl?: string | null;
  nameTr?: string | null;
  nameAz?: string | null;
  nameHy?: string | null;
  nameHe?: string | null;
  nameAr?: string | null;
  nameKo?: string | null;
  nameJa?: string | null;
  nameZh?: string | null;
  imageUrl: string | null;
  orderIndex: number;
  stopsCount?: number;
}

export interface Tour {
  id: string;
  name: string;
  nameEn: string | null;
  nameRu?: string | null;
  nameDe?: string | null;
  nameFr?: string | null;
  nameUk?: string | null;
  nameEs?: string | null;
  nameIt?: string | null;
  namePl?: string | null;
  nameTr?: string | null;
  nameAz?: string | null;
  nameHy?: string | null;
  nameHe?: string | null;
  nameAr?: string | null;
  nameKo?: string | null;
  nameJa?: string | null;
  nameZh?: string | null;
  description: string | null;
  descriptionEn: string | null;
  descriptionRu?: string | null;
  descriptionDe?: string | null;
  descriptionFr?: string | null;
  descriptionUk?: string | null;
  descriptionEs?: string | null;
  descriptionIt?: string | null;
  descriptionPl?: string | null;
  descriptionTr?: string | null;
  descriptionAz?: string | null;
  descriptionHy?: string | null;
  descriptionHe?: string | null;
  descriptionAr?: string | null;
  descriptionKo?: string | null;
  descriptionJa?: string | null;
  descriptionZh?: string | null;
  duration: number | null;
  stopsCount: number;
  displayOrder?: number;
  isFree: boolean;
  price: number | null;
  currency: string;
  coverImage: string | null;
  vrTourId?: string | null;
  halls?: Hall[];
  stops: TourStop[];
  allowActivationCodes?: boolean;
  allowBankPayment?: boolean;
}

export interface TourStop {
  id: string;
  title: string;
  titleEn: string | null;
  titleRu?: string | null;
  titleDe?: string | null;
  titleFr?: string | null;
  titleUk?: string | null;
  titleEs?: string | null;
  titleIt?: string | null;
  titlePl?: string | null;
  titleTr?: string | null;
  titleAz?: string | null;
  titleHy?: string | null;
  titleHe?: string | null;
  titleAr?: string | null;
  titleKo?: string | null;
  titleJa?: string | null;
  titleZh?: string | null;
  description: string | null;
  descriptionEn: string | null;
  descriptionRu?: string | null;
  descriptionDe?: string | null;
  descriptionFr?: string | null;
  descriptionUk?: string | null;
  descriptionEs?: string | null;
  descriptionIt?: string | null;
  descriptionPl?: string | null;
  descriptionTr?: string | null;
  descriptionAz?: string | null;
  descriptionHy?: string | null;
  descriptionHe?: string | null;
  descriptionAr?: string | null;
  descriptionKo?: string | null;
  descriptionJa?: string | null;
  descriptionZh?: string | null;
  transcript: string | null;
  transcriptEn: string | null;
  transcriptRu?: string | null;
  transcriptDe?: string | null;
  transcriptFr?: string | null;
  transcriptUk?: string | null;
  transcriptEs?: string | null;
  transcriptIt?: string | null;
  transcriptPl?: string | null;
  transcriptTr?: string | null;
  transcriptAz?: string | null;
  transcriptHy?: string | null;
  transcriptHe?: string | null;
  transcriptAr?: string | null;
  transcriptKo?: string | null;
  transcriptJa?: string | null;
  transcriptZh?: string | null;
  audioUrl: string | null;
  audioUrlEn: string | null;
  audioUrlRu?: string | null;
  audioUrlDe?: string | null;
  audioUrlFr?: string | null;
  audioUrlUk?: string | null;
  audioUrlEs?: string | null;
  audioUrlIt?: string | null;
  audioUrlPl?: string | null;
  audioUrlTr?: string | null;
  audioUrlAz?: string | null;
  audioUrlHy?: string | null;
  audioUrlHe?: string | null;
  audioUrlAr?: string | null;
  audioUrlKo?: string | null;
  audioUrlJa?: string | null;
  audioUrlZh?: string | null;
  imageUrl: string | null;
  qrCode: string | null;
  orderIndex: number;
  latitude: number | null;
  longitude: number | null;
  hallId?: string | null;
}

export type Language = "ka" | "en" | "ru" | "de" | "fr" | "uk" | "es" | "it" | "pl" | "tr" | "az" | "hy" | "he" | "ar" | "ko" | "ja" | "zh";

export interface LanguageOption {
  code: Language;
  name: string;
  flag: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: "ka", name: "ქართული", flag: "🇬🇪" },
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "uk", name: "Українська", flag: "🇺🇦" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "pl", name: "Polski", flag: "🇵🇱" },
  { code: "tr", name: "Türkçe", flag: "🇹🇷" },
  { code: "az", name: "Azərbaycan", flag: "🇦🇿" },
  { code: "hy", name: "Հայերեն", flag: "🇦🇲" },
  { code: "he", name: "עברית", flag: "🇮🇱" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
  { code: "ko", name: "한국어", flag: "🇰🇷" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
];
