"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Museum, LANGUAGES, Language } from "@/lib/types";
import {
  BuildingLibraryIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

// Helper to get field suffix from language code
const getFieldSuffix = (code: string) => code.charAt(0).toUpperCase() + code.slice(1);

export default function HomePage() {
  const [museums, setMuseums] = useState<Museum[]>([]);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<Language>("ka");
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [availableLanguages, setAvailableLanguages] = useState<Language[]>(["ka"]);

  useEffect(() => {
    fetchMuseums();
  }, []);

  useEffect(() => {
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

        // Dynamically detect available languages from all museums
        const langs = new Set<Language>(["ka"]);
        data.forEach((museum: Museum) => {
          LANGUAGES.forEach((lang) => {
            if (lang.code === "ka") return;
            const fieldName = `name${getFieldSuffix(lang.code)}` as keyof Museum;
            if (museum[fieldName]) {
              langs.add(lang.code);
            }
          });
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

  const getLocalizedField = (museum: Museum, field: "name" | "city"): string => {
    if (language === "ka") {
      return (museum[field] as string) || "";
    }
    const suffix = getFieldSuffix(language);
    const langField = `${field}${suffix}` as keyof Museum;
    return (museum[langField] as string) || (museum[field] as string) || "";
  };

  const hasLanguage = (museum: Museum): boolean => {
    if (language === "ka") return true;
    const suffix = getFieldSuffix(language);
    const fieldName = `name${suffix}` as keyof Museum;
    return !!museum[fieldName];
  };

  const currentLang = LANGUAGES.find((l) => l.code === language);
  const displayLanguages = LANGUAGES.filter((l) => availableLanguages.includes(l.code));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-amber-50 to-white">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-amber-100 safe-top">
        <div className="max-w-lg mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
              <BuildingLibraryIcon className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl text-gray-800">GeoGuide</span>
          </div>

          {displayLanguages.length > 1 && (
            <div className="relative">
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-amber-50 transition-colors"
              >
                <span className="text-lg">{currentLang?.flag}</span>
                <span className="text-sm font-medium text-gray-700">{currentLang?.name}</span>
                <ChevronDownIcon className={`w-4 h-4 text-gray-500 transition-transform ${showLangMenu ? "rotate-180" : ""}`} />
              </button>

              {showLangMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowLangMenu(false)} />
                  <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-gray-100 py-2 min-w-[160px] z-50">
                    {displayLanguages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => handleLanguageChange(lang.code)}
                        className={`w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-amber-50 transition-colors ${language === lang.code ? "bg-amber-50 text-amber-600" : "text-gray-700"}`}
                      >
                        <span className="text-lg">{lang.flag}</span>
                        <span className="font-medium">{lang.name}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 safe-bottom">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">
            {language === "ka" ? "აირჩიეთ მუზეუმი" : 
             language === "en" ? "Select a Museum" :
             language === "ru" ? "Выберите музей" :
             language === "de" ? "Wählen Sie ein Museum" :
             language === "fr" ? "Choisissez un musée" :
             language === "uk" ? "Оберіть музей" :
             language === "es" ? "Seleccione un museo" :
             language === "it" ? "Seleziona un museo" :
             language === "pl" ? "Wybierz muzeum" :
             language === "tr" ? "Bir müze seçin" :
             language === "az" ? "Muzey seçin" :
             language === "hy" ? "Ընdelays delays" :
             language === "he" ? "בחר מוזיאון" :
             language === "ar" ? "اختر متحفًا" :
             language === "ko" ? "박물관 선택" :
             language === "ja" ? "博物館を選択" :
             language === "zh" ? "选择博物馆" :
             "აირჩიეთ მუზეუმი"}
          </h1>
          <p className="text-gray-500 mt-1">
            {language === "ka" ? "აუდიო გიდი საქართველოს მუზეუმებისთვის" :
             language === "en" ? "Audio guide for Georgian museums" :
             language === "ru" ? "Аудиогид по музеям Грузии" :
             language === "de" ? "Audioführer für georgische Museen" :
             language === "fr" ? "Guide audio pour les musées géorgiens" :
             language === "uk" ? "Аудіогід музеями Грузії" :
             language === "es" ? "Guía de audio para museos georgianos" :
             language === "it" ? "Audioguida per i musei georgiani" :
             language === "pl" ? "Audioprzewodnik po gruzińskich muzeach" :
             language === "tr" ? "Gürcü müzeleri için sesli rehber" :
             language === "az" ? "Gürcüstan muzeyləri üçün audio bələdçi" :
             language === "hy" ? "delays delays" :
             language === "he" ? "מדריך שמע למוזיאונים גאורגיים" :
             language === "ar" ? "دليل صوتي للمتاحف الجورجية" :
             language === "ko" ? "조지아 박물관 오디오 가이드" :
             language === "ja" ? "ジョージアの博物館オーディオガイド" :
             language === "zh" ? "格鲁吉亚博物馆语音导览" :
             "აუდიო გიდი საქართველოს მუზეუმებისთვის"}
          </p>
        </div>

        <div className="space-y-4">
          {museums
            .filter((m) => m.tours && m.tours.length > 0)
            .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
            .map((museum) => (
              <Link
                key={museum.id}
                href={`/museum/${museum.slug}`}
                className="block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
              >
                {museum.coverImage && (
                  <div className="aspect-[2/1] relative">
                    <img
                      src={museum.coverImage}
                      alt={getLocalizedField(museum, "name")}
                      className="w-full h-full object-cover"
                    />
                    {!hasLanguage(museum) && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white text-sm px-3 py-1 bg-black/50 rounded-full">
                          {language === "ka" ? "მალე" : "Coming soon"}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                <div className="p-4">
                  <h2 className="font-semibold text-lg text-gray-800">
                    {getLocalizedField(museum, "name")}
                  </h2>
                  {getLocalizedField(museum, "city") && (
                    <p className="text-gray-500 text-sm mt-1">
                      📍 {getLocalizedField(museum, "city")}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                      {museum.tours?.length || 0} {language === "ka" ? "ტური" : language === "en" ? "tours" : language === "ru" ? "тур" : language === "ko" ? "투어" : language === "pl" ? "wycieczek" : "tours"}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
        </div>

        {museums.filter((m) => m.tours && m.tours.length > 0).length === 0 && (
          <div className="text-center py-12">
            <BuildingLibraryIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {language === "ka" ? "მუზეუმები მალე დაემატება" : "Museums coming soon"}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
