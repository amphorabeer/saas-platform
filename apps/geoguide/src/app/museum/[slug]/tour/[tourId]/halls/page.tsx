"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/lib/language-context";
import { LANGUAGES, Language } from "@/lib/types";
import {
  ChevronLeftIcon,
  BuildingLibraryIcon,
} from "@heroicons/react/24/outline";

interface Hall {
  id: string;
  name: string;
  nameEn: string | null;
  nameRu: string | null;
  nameUk: string | null;
  imageUrl: string | null;
  orderIndex: number;
  stopsCount: number;
}

interface Tour {
  id: string;
  name: string;
  nameEn: string | null;
  nameRu: string | null;
  nameUk: string | null;
  halls: Hall[];
}

// UI texts
const uiTexts: Record<string, {
  halls: string;
  stops: string;
  noHalls: string;
  back: string;
}> = {
  ka: { halls: "დარბაზები", stops: "გაჩერება", noHalls: "დარბაზები არ არის", back: "უკან" },
  en: { halls: "Halls", stops: "stops", noHalls: "No halls available", back: "Back" },
  ru: { halls: "Залы", stops: "остановок", noHalls: "Залы недоступны", back: "Назад" },
  de: { halls: "Säle", stops: "Haltestellen", noHalls: "Keine Säle verfügbar", back: "Zurück" },
  fr: { halls: "Salles", stops: "arrêts", noHalls: "Aucune salle disponible", back: "Retour" },
  uk: { halls: "Зали", stops: "зупинок", noHalls: "Зали недоступні", back: "Назад" },
};

export default function HallsPage() {
  const params = useParams();
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const [tour, setTour] = useState<Tour | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [availableLanguages, setAvailableLanguages] = useState<Language[]>(["ka"]);

  const ui = uiTexts[language] || uiTexts.ka;

  useEffect(() => {
    fetchTour();
  }, [params.tourId]);

  const fetchTour = async () => {
    try {
      const res = await fetch(`/api/tours/${params.tourId}`);
      if (res.ok) {
        const data = await res.json();
        setTour(data);

        // Detect available languages
        const langs = new Set<Language>(["ka"]);
        if (data.nameEn) langs.add("en");
        if (data.nameRu) langs.add("ru");
        if (data.nameUk) langs.add("uk");
        data.halls?.forEach((hall: Hall) => {
          if (hall.nameEn) langs.add("en");
          if (hall.nameRu) langs.add("ru");
          if (hall.nameUk) langs.add("uk");
        });
        setAvailableLanguages(Array.from(langs));
      }
    } catch (error) {
      console.error("Error fetching tour:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTourName = (): string => {
    if (!tour) return "";
    const fieldMap: Record<Language, keyof Tour> = {
      ka: "name",
      en: "nameEn",
      ru: "nameRu",
      de: "name",
      fr: "name",
      uk: "nameUk",
    };
    const field = fieldMap[language];
    return (tour[field] as string) || tour.name || "";
  };

  const getHallName = (hall: Hall): string => {
    const fieldMap: Record<Language, keyof Hall> = {
      ka: "name",
      en: "nameEn",
      ru: "nameRu",
      de: "name",
      fr: "name",
      uk: "nameUk",
    };
    const field = fieldMap[language];
    return (hall[field] as string) || hall.name || "";
  };

  const currentLang = LANGUAGES.find((l) => l.code === language);
  const displayLanguages = LANGUAGES.filter((l) => availableLanguages.includes(l.code));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  if (!tour) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <p className="text-gray-500">ტური ვერ მოიძებნა</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b safe-top">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100"
          >
            <ChevronLeftIcon className="w-6 h-6" />
          </button>

          <h1 className="text-lg font-semibold truncate flex-1 text-center">
            {getTourName()}
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

      {/* Halls Title */}
      <div className="bg-white px-4 py-3 border-b">
        <h2 className="text-xl font-semibold">{ui.halls}</h2>
      </div>

      {/* Halls Grid */}
      <div className="flex-1 p-4">
        {tour.halls && tour.halls.length > 0 ? (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            {tour.halls
              .sort((a, b) => a.orderIndex - b.orderIndex)
              .map((hall) => (
                <Link
                  key={hall.id}
                  href={`/museum/${params.slug}/tour/${params.tourId}/hall/${hall.id}`}
                  className="block bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                >
                  {hall.imageUrl ? (
                    <img
                      src={hall.imageUrl}
                      alt={getHallName(hall)}
                      className="w-full h-40 object-cover"
                    />
                  ) : (
                    <div className="w-full h-40 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                      <BuildingLibraryIcon className="w-16 h-16 text-blue-400" />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold text-lg">{getHallName(hall)}</h3>
                    <p className="text-gray-500 text-sm mt-1">
                      {hall.stopsCount} {ui.stops}
                    </p>
                  </div>
                </Link>
              ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <BuildingLibraryIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{ui.noHalls}</p>
          </div>
        )}
      </div>
    </div>
  );
}