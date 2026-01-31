"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useLanguage } from "@/lib/language-context";
import { Museum, Tour, LANGUAGES, Language } from "@/lib/types";
import {
  ClockIcon,
  MusicalNoteIcon,
  PlayIcon,
  ShoppingCartIcon,
  ChevronLeftIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";
import { OfflineImage } from "@/components/OfflineImage";

export default function MuseumPage() {
  const params = useParams();
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const [museum, setMuseum] = useState<Museum | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [availableLanguages, setAvailableLanguages] = useState<Language[]>(["ka"]);

  // Localized UI texts
  const uiTexts: Record<string, { start: string; enterCode: string; buy: string; minutes: string; stops: string; noTours: string }> = {
    ka: { start: "დაწყება", enterCode: "შეიყვანე კოდი", buy: "შეიძინე", minutes: "წუთი", stops: "გაჩერება", noTours: "ტურები ჯერ არ არის" },
    en: { start: "Start", enterCode: "Enter code", buy: "Buy", minutes: "min", stops: "stops", noTours: "No tours available" },
    ru: { start: "Начать", enterCode: "Введите код", buy: "Купить", minutes: "мин", stops: "остановок", noTours: "Туры пока недоступны" },
    de: { start: "Starten", enterCode: "Code eingeben", buy: "Kaufen", minutes: "Min", stops: "Haltestellen", noTours: "Noch keine Touren" },
    fr: { start: "Commencer", enterCode: "Entrer le code", buy: "Acheter", minutes: "min", stops: "arrêts", noTours: "Pas encore de visites" },
  };

  useEffect(() => {
    fetchMuseum();
  }, [params.slug]);

  const fetchMuseum = async () => {
    try {
      const res = await fetch(`/api/museums/${params.slug}`);
      if (res.ok) {
        const data = await res.json();
        setMuseum(data);

        // Detect available languages from museum
        const langs = new Set<Language>(["ka"]);
        if (data.nameEn) langs.add("en");
        if (data.nameRu) langs.add("ru");
        if (data.nameDe) langs.add("de");
        if (data.nameFr) langs.add("fr");
        if (data.nameUk) langs.add("uk");
        setAvailableLanguages(Array.from(langs));
      }
    } catch (error) {
      console.error("Error fetching museum:", error);
    } finally {
      setLoading(false);
    }
  };

  // Get localized field from museum
  const getMuseumField = (field: "name" | "description" | "city" | "address"): string => {
    if (!museum) return "";
    
    const fieldMap: Record<Language, Record<string, keyof Museum>> = {
      ka: { name: "name", description: "description", city: "city", address: "address" },
      en: { name: "nameEn", description: "descriptionEn", city: "cityEn", address: "addressEn" },
      ru: { name: "nameRu", description: "descriptionRu", city: "cityRu", address: "addressRu" },
      de: { name: "nameDe", description: "descriptionDe", city: "cityDe", address: "addressDe" },
      fr: { name: "nameFr", description: "descriptionFr", city: "cityFr", address: "addressFr" },
    };

    const langField = fieldMap[language]?.[field];
    if (langField && museum[langField]) {
      return museum[langField] as string;
    }
    // Fallback to Georgian
    const kaField = fieldMap.ka[field];
    return (museum[kaField] as string) || "";
  };

  const currentLang = LANGUAGES.find((l) => l.code === language);
  const displayLanguages = LANGUAGES.filter((l) => availableLanguages.includes(l.code));
  const ui = uiTexts[language] || uiTexts.ka;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  if (!museum) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <p className="text-gray-500">მუზეუმი ვერ მოიძებნა</p>
        <Link href="/" className="mt-4 text-amber-500">
          მთავარზე დაბრუნება
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b safe-top">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={() => router.push("/")}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100"
          >
            <ChevronLeftIcon className="w-6 h-6" />
          </button>

          <h1 className="text-lg font-semibold truncate flex-1 text-center">
            {getMuseumField("name")}
          </h1>

          {/* Language selector */}
          {displayLanguages.length > 1 && (
            <div className="relative">
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="flex items-center gap-1 px-2 py-1 text-sm rounded-lg hover:bg-gray-100"
              >
                <span>{currentLang?.flag}</span>
                <span className="uppercase">{language}</span>
              </button>

              {showLangMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowLangMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-50 py-1 min-w-[150px]">
                    {displayLanguages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setLanguage(lang.code);
                          setShowLangMenu(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100 ${
                          language === lang.code ? "bg-amber-50 text-amber-600" : ""
                        }`}
                      >
                        <span>{lang.flag}</span>
                        <span>{lang.name}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {displayLanguages.length <= 1 && <div className="w-12" />}
        </div>
      </header>

      {/* Cover Image */}
      {museum.coverImage && (
        <OfflineImage
          src={museum.coverImage}
          alt={getMuseumField("name")}
          className="w-full h-48 object-cover"
        />
      )}

      {/* Museum Info - under image */}
      <div className="bg-white px-4 py-3 border-b">
        <div className="flex items-center gap-4 text-sm text-gray-500">
          {getMuseumField("city") && (
            <span className="flex items-center gap-1">
              <MapPinIcon className="w-4 h-4" />
              {getMuseumField("city")}
            </span>
          )}
          {museum.tours && museum.tours.length > 0 && (
            <>
              <span className="flex items-center gap-1">
                <ClockIcon className="w-4 h-4" />
                {museum.tours.reduce((sum, t) => sum + (t.duration || 0), 0)} {ui.minutes}
              </span>
              <span className="flex items-center gap-1">
                <MusicalNoteIcon className="w-4 h-4" />
                {museum.tours.reduce((sum, t) => sum + (t.stopsCount || 0), 0)} {ui.stops}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Tours */}
      <div className="bg-white px-4 py-4 border-b">
        {museum.tours && museum.tours.length > 0 ? (
          <div className="space-y-4">
            {museum.tours.map((tour) => (
              <TourCard
                key={tour.id}
                tour={tour}
                museumSlug={museum.slug}
                language={language}
                ui={ui}
              />
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">{ui.noTours}</p>
        )}
      </div>

      {/* Description */}
      {getMuseumField("description") && (
        <div className="flex-1 bg-white px-4 py-4">
          <p className="text-gray-600 leading-relaxed">
            {getMuseumField("description")}
          </p>
        </div>
      )}
    </div>
  );
}

function TourCard({
  tour,
  museumSlug,
  language,
  ui,
}: {
  tour: Tour;
  museumSlug: string;
  language: string;
  ui: { start: string; enterCode: string; buy: string };
}) {
  // Get localized field based on language
  const getField = (field: "name" | "description"): string => {
    const fieldMap: Record<string, Record<string, string>> = {
      name: { ka: "name", en: "nameEn", ru: "nameRu", de: "nameDe", fr: "nameFr" },
      description: { ka: "description", en: "descriptionEn", ru: "descriptionRu", de: "descriptionDe", fr: "descriptionFr" },
    };

    const langField = fieldMap[field]?.[language];
    if (langField && (tour as any)[langField]) {
      return (tour as any)[langField];
    }
    // Fallback to Georgian
    return (tour as any)[field] || "";
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <h3 className="font-semibold text-lg mb-4">{getField("name")}</h3>

      {/* Action Buttons */}
      {tour.isFree ? (
        <Link
          href={`/museum/${museumSlug}/tour/${tour.id}`}
          className="w-full flex items-center justify-center gap-2 py-3 bg-amber-500 text-white rounded-full font-medium hover:bg-amber-600 transition-colors"
        >
          <PlayIcon className="w-5 h-5" />
          <span>{ui.start}</span>
        </Link>
      ) : (
        <div className="flex gap-3">
          <Link
            href={`/museum/${museumSlug}/tour/${tour.id}/activate`}
            className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-gray-200 rounded-full text-gray-700 font-medium hover:border-amber-500 hover:text-amber-600 transition-colors"
          >
            <PlayIcon className="w-5 h-5" />
            <span>{ui.enterCode}</span>
          </Link>

          <Link
            href={`/museum/${museumSlug}/tour/${tour.id}/buy`}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-amber-500 text-white rounded-full font-medium hover:bg-amber-600 transition-colors"
          >
            <ShoppingCartIcon className="w-5 h-5" />
            <span>{ui.buy} {tour.price} {tour.currency === "GEL" ? "₾" : tour.currency}</span>
          </Link>
        </div>
      )}
    </div>
  );
}