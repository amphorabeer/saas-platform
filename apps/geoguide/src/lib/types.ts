export interface Museum {
  id: string;
  name: string;
  nameEn: string | null;
  nameRu?: string | null;
  nameDe?: string | null;
  nameFr?: string | null;
  description: string | null;
  descriptionEn: string | null;
  slug: string;
  city: string | null;
  cityEn?: string | null;
  cityRu?: string | null;
  cityDe?: string | null;
  cityFr?: string | null;
  address?: string | null;
  addressEn?: string | null;
  addressRu?: string | null;
  addressDe?: string | null;
  addressFr?: string | null;
  coverImage: string | null;
  showMap: boolean;
  tours: Tour[];
}

export interface Tour {
  id: string;
  name: string;
  nameEn: string | null;
  description: string | null;
  descriptionEn: string | null;
  duration: number | null;
  stopsCount: number;
  isFree: boolean;
  price: number | null;
  currency: string;
  coverImage: string | null;
  stops: TourStop[];
}

export interface TourStop {
  id: string;
  title: string;
  titleEn: string | null;
  description: string | null;
  descriptionEn: string | null;
  transcript: string | null;
  transcriptEn: string | null;
  audioUrl: string | null;
  audioUrlEn: string | null;
  imageUrl: string | null;
  qrCode: string | null;
  orderIndex: number;
  latitude: number | null;
  longitude: number | null;
}

export type Language = "ka" | "en" | "ru" | "de" | "fr" | "uk";

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
];
