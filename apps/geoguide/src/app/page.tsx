"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Museum, LANGUAGES, Language } from "@/lib/types";
import {
  BuildingLibraryIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

export default function HomePage() {
  const [museums, setMuseums] = useState<Museum[]>([]);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<Language>("ka");
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [availableLanguages, setAvailableLanguages] = useState<Language[]>([
    "ka",
  ]);

  useEffect(() => {
    fetchMuseums();
  }, []);

  useEffect(() => {
    // Load saved language only if it's available
    const saved = localStorage.getItem("geoguide-language") as Language;
    if (saved && availableLanguages.includes(saved)) {
      setLanguage(saved);
    } else if (!availableLanguages.includes(language)) {
      setLanguage("ka");
    }
  }, [availableLanguages]);

  const fetchMuseums = async () => {
    try {
      const res = await fetch("/api/museums");
      if (res.ok) {
        const data = await res.json();
        setMuseums(data);

        // Detect available languages from all museums
        const langs = new Set<Language>(["ka"]);
        data.forEach((museum: Museum) => {
          if (museum.nameEn) langs.add("en");
          if (museum.nameRu) langs.add("ru");
          if (museum.nameDe) langs.add("de");
          if (museum.nameFr) langs.add("fr");
          if (museum.nameUk) langs.add("uk");
        });
        setAvailableLanguages(Array.from(langs));
      }
    } catch (error) {
      console.error("Error fetching museums:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem("geoguide-language", lang);
    setShowLangMenu(false);
  };

  // Helper to get localized text
  const getLocalizedField = (
    museum: Museum,
    field: "name" | "city"
  ): string => {
    if (language === "ka") {
      return (museum[field] as string) || "";
    }

    const langFieldMap: Record<Language, Record<string, keyof Museum>> = {
      ka: { name: "name", city: "city" },
      en: { name: "nameEn", city: "cityEn" },
      ru: { name: "nameRu", city: "cityRu" },
      de: { name: "nameDe", city: "cityDe" },
      fr: { name: "nameFr", city: "cityFr" },
      uk: { name: "nameUk", city: "cityUk" },
    };

    const langField = langFieldMap[language]?.[field];
    if (langField) {
      return (museum[langField] as string) || (museum[field] as string) || "";
    }
    return (museum[field] as string) || "";
  };

  // Check if museum has content in selected language
  const hasLanguage = (museum: Museum): boolean => {
    if (language === "ka") return true;

    const nameFieldMap: Record<Language, keyof Museum | null> = {
      ka: null,
      en: "nameEn",
      ru: "nameRu",
      de: "nameDe",
      fr: "nameFr",
      uk: "nameUk",
    };

    const nameField = nameFieldMap[language];
    if (nameField) {
      return !!museum[nameField];
    }
    return true;
  };

  // Filter museums that have content in selected language
  const filteredMuseums = museums.filter(hasLanguage);

  const currentLang = LANGUAGES.find((l) => l.code === language);
  const displayLanguages = LANGUAGES.filter((l) =>
    availableLanguages.includes(l.code as Language)
  );

  // Localized UI texts
  const uiTexts: Record<
    Language,
    { selectMuseum: string; noMuseums: string }
  > = {
    ka: { selectMuseum: "აირჩიეთ მუზეუმი", noMuseums: "მუზეუმები ვერ მოიძებნა" },
    en: { selectMuseum: "Select Museum", noMuseums: "No museums found" },
    ru: { selectMuseum: "Выберите музей", noMuseums: "Музеи не найдены" },
    de: {
      selectMuseum: "Museum auswählen",
      noMuseums: "Keine Museen gefunden",
    },
    fr: {
      selectMuseum: "Choisir un musée",
      noMuseums: "Aucun musée trouvé",
    },
    uk: {
      selectMuseum: "Оберіть музей",
      noMuseums: "Музеї не знайдено",
    },
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b safe-top">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="w-12" />

          <h1 className="text-xl font-bold text-amber-600">🎧 GeoGuide</h1>

          {/* Language Selector - only show if more than 1 language available */}
          {displayLanguages.length > 1 ? (
            <div className="relative">
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="flex items-center gap-1 px-2 py-1 text-sm rounded-lg hover:bg-gray-100"
              >
                <span>{currentLang?.flag}</span>
                <span className="uppercase">{language}</span>
                <ChevronDownIcon className="w-4 h-4" />
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
                        onClick={() =>
                          handleLanguageChange(lang.code as Language)
                        }
                        className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100 ${
                          language === lang.code
                            ? "bg-amber-50 text-amber-600"
                            : ""
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
          ) : (
            <div className="w-12" />
          )}
        </div>
      </header>

      <div className="flex-1 p-4">
        <h2 className="text-xl font-semibold mb-4">
          {uiTexts[language]?.selectMuseum || uiTexts.ka.selectMuseum}
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
          </div>
        ) : filteredMuseums.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <BuildingLibraryIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{uiTexts[language]?.noMuseums || uiTexts.ka.noMuseums}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMuseums.map((museum) => (
              <Link
                key={museum.id}
                href={`/museum/${museum.slug}`}
                className="block bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                {museum.coverImage ? (
                  <img
                    src={museum.coverImage}
                    alt={getLocalizedField(museum, "name")}
                    className="w-full h-40 object-cover"
                  />
                ) : (
                  <div className="w-full h-40 bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
                    <BuildingLibraryIcon className="w-16 h-16 text-amber-400" />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-lg">
                    {getLocalizedField(museum, "name")}
                  </h3>
                  {getLocalizedField(museum, "city") && (
                    <p className="text-gray-500 text-sm mt-1">
                      📍 {getLocalizedField(museum, "city")}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}