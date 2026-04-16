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
} from "@heroicons/react/24/outline";

function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("geoguide_device_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("geoguide_device_id", id);
  }
  return id;
}

// Helper to get field suffix from language code
const getFieldSuffix = (code: string) => code.charAt(0).toUpperCase() + code.slice(1);

export default function MuseumPage() {
  const params = useParams();
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const [museum, setMuseum] = useState<Museum | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [availableLanguages, setAvailableLanguages] = useState<Language[]>(["ka"]);
  const [accessTourIds, setAccessTourIds] = useState<string[]>([]);

  const uiTexts: Record<string, { start: string; enterCode: string; buy: string; minutes: string; stops: string; noTours: string }> = {
    ka: { start: "დაწყება", enterCode: "შეიყვანე კოდი", buy: "შეიძინე", minutes: "წუთი", stops: "გაჩერება", noTours: "ტურები ჯერ არ არის" },
    en: { start: "Start", enterCode: "Enter code", buy: "Buy", minutes: "min", stops: "stops", noTours: "No tours available" },
    ru: { start: "Начать", enterCode: "Введите код", buy: "Купить", minutes: "мин", stops: "остановок", noTours: "Туры пока недоступны" },
    de: { start: "Starten", enterCode: "Code eingeben", buy: "Kaufen", minutes: "Min", stops: "Haltestellen", noTours: "Noch keine Touren" },
    fr: { start: "Commencer", enterCode: "Entrer le code", buy: "Acheter", minutes: "min", stops: "arrêts", noTours: "Pas encore de visites" },
    uk: { start: "Почати", enterCode: "Введіть код", buy: "Купити", minutes: "хв", stops: "зупинок", noTours: "Турів поки немає" },
    es: { start: "Empezar", enterCode: "Introducir código", buy: "Comprar", minutes: "min", stops: "paradas", noTours: "No hay tours disponibles" },
    it: { start: "Inizia", enterCode: "Inserisci codice", buy: "Acquista", minutes: "min", stops: "fermate", noTours: "Nessun tour disponibile" },
    pl: { start: "Rozpocznij", enterCode: "Wprowadź kod", buy: "Kup", minutes: "min", stops: "przystanków", noTours: "Brak dostępnych wycieczek" },
    tr: { start: "Başla", enterCode: "Kodu girin", buy: "Satın al", minutes: "dk", stops: "durak", noTours: "Henüz tur yok" },
    az: { start: "Başla", enterCode: "Kodu daxil edin", buy: "Al", minutes: "dəq", stops: "dayanacaq", noTours: "Turlar hələ yoxdur" },
    hy: { start: "Սկսել", enterCode: "Մուdelays կdelays", buy: "Գdelays delays", minutes: " delays", stops: "ร์ delays", noTours: "delays delays delays" },
    he: { start: "התחל", enterCode: "הכנס קוד", buy: "קנה", minutes: "דקות", stops: "תחנות", noTours: "אין סיורים זמינים" },
    ar: { start: "ابدأ", enterCode: "أدخل الرمز", buy: "اشترِ", minutes: "دقيقة", stops: "محطات", noTours: "لا توجد جولات متاحة" },
    ko: { start: "시작", enterCode: "코드 입력", buy: "구매", minutes: "분", stops: "정류장", noTours: "투어가 없습니다" },
    ja: { start: "開始", enterCode: "コードを入力", buy: "購入", minutes: "分", stops: "停留所", noTours: "ツアーはありません" },
    zh: { start: "开始", enterCode: "输入代码", buy: "购买", minutes: "分钟", stops: "站点", noTours: "暂无旅游" },
  };

  useEffect(() => {
    fetchMuseum();
    checkAccess();
  }, [params.slug]);

  const fetchMuseum = async () => {
    try {
      const res = await fetch(`/api/museums/${params.slug}`);
      if (res.ok) {
        const data = await res.json();
        setMuseum(data);
        
        // Dynamically check all languages from LANGUAGES array
        const langs = new Set<Language>(["ka"]);
        LANGUAGES.forEach((lang) => {
          if (lang.code === "ka") return;
          const fieldName = `name${getFieldSuffix(lang.code)}` as keyof typeof data;
          if (data[fieldName]) {
            langs.add(lang.code);
          }
        });
        setAvailableLanguages(Array.from(langs));
      }
    } catch (error) {
      console.error("Error fetching museum:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkAccess = async () => {
    const deviceId = getDeviceId();
    if (!deviceId) return;
    try {
      const res = await fetch(`/api/entitlements/check?deviceId=${deviceId}`);
      const data = await res.json();
      if (data.tourIds) setAccessTourIds(data.tourIds);
    } catch {}
  };

  const getMuseumField = (field: "name" | "description" | "city" | "address"): string => {
    if (!museum) return "";
    
    // Try current language
    if (language !== "ka") {
      const suffix = getFieldSuffix(language);
      const langField = `${field}${suffix}` as keyof Museum;
      if (museum[langField]) return museum[langField] as string;
    }
    
    // Fallback to Georgian
    return (museum[field as keyof Museum] as string) || "";
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
        <Link href="/" className="mt-4 text-amber-500">მთავარზე დაბრუნება</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 bg-white border-b safe-top">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => router.push("/")} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
            <ChevronLeftIcon className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold truncate flex-1 text-center">{getMuseumField("name")}</h1>
          {displayLanguages.length > 1 ? (
            <div className="relative">
              <button onClick={() => setShowLangMenu(!showLangMenu)} className="flex items-center gap-1 px-2 py-1 text-sm rounded-lg hover:bg-gray-100">
                <span>{currentLang?.flag}</span>
                <span className="uppercase">{language}</span>
              </button>
              {showLangMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowLangMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-50 py-1 min-w-[150px]">
                    {displayLanguages.map((lang) => (
                      <button key={lang.code} onClick={() => { setLanguage(lang.code); setShowLangMenu(false); }}
                        className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100 ${language === lang.code ? "bg-amber-50 text-amber-600" : ""}`}>
                        <span>{lang.flag}</span>
                        <span>{lang.name}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : <div className="w-12" />}
        </div>
      </header>

      <div className="bg-white px-4 py-4 border-b">
        {museum.tours && museum.tours.length > 0 ? (
          <div className="space-y-4">
            {[...museum.tours].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)).map((tour) => (
              <TourCard key={tour.id} tour={tour} museumSlug={museum.slug} language={language} ui={ui}
                hasAccess={accessTourIds.includes(tour.id)} />
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">{ui.noTours}</p>
        )}
      </div>

      {getMuseumField("description") && (
        <div className="flex-1 bg-white px-4 py-4">
          <p className="text-gray-600 leading-relaxed">{getMuseumField("description")}</p>
        </div>
      )}
    </div>
  );
}

function TourCard({
  tour, museumSlug, language, ui, hasAccess,
}: {
  tour: Tour; museumSlug: string; language: string;
  ui: { start: string; enterCode: string; buy: string; minutes: string; stops: string };
  hasAccess: boolean;
}) {
  const getField = (field: "name" | "description"): string => {
    if (language !== "ka") {
      const suffix = getFieldSuffix(language);
      const langField = `${field}${suffix}`;
      if ((tour as any)[langField]) return (tour as any)[langField];
    }
    return (tour as any)[field] || "";
  };

  const allowActivationCodes = tour.allowActivationCodes ?? true;
  const allowBankPayment = tour.allowBankPayment ?? true;

  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm">
      {tour.coverImage && (
        <img src={tour.coverImage} alt={getField("name")} className="w-full h-40 object-cover" />
      )}
      <div className="p-4">
        <h3 className="font-semibold text-lg">{getField("name")}</h3>
        {getField("description") && (
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{getField("description")}</p>
        )}
        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
          {tour.duration && (
            <span className="flex items-center gap-1">
              <ClockIcon className="w-4 h-4" />{tour.duration} {ui.minutes}
            </span>
          )}
          {tour.stopsCount > 0 && (
            <span className="flex items-center gap-1">
              <MusicalNoteIcon className="w-4 h-4" />{tour.stopsCount} {ui.stops}
            </span>
          )}
        </div>
        <div className="mt-4">
          {tour.isFree || hasAccess ? (
            <Link href={`/museum/${museumSlug}/tour/${tour.id}`}
              className="w-full flex items-center justify-center gap-2 py-3 bg-amber-500 text-white rounded-full font-medium hover:bg-amber-600 transition-colors">
              <PlayIcon className="w-5 h-5" />
              <span>{ui.start}</span>
            </Link>
          ) : (
            <div className="flex gap-3">
              {allowActivationCodes && (
                <Link href={`/museum/${museumSlug}/tour/${tour.id}/activate`}
                  className={`flex items-center justify-center gap-2 py-3 border-2 border-gray-200 rounded-full text-gray-700 font-medium hover:border-amber-500 hover:text-amber-600 transition-colors ${allowBankPayment ? "flex-1" : "w-full"}`}>
                  <PlayIcon className="w-5 h-5" />
                  <span>{ui.enterCode}</span>
                </Link>
              )}
              {allowBankPayment && (
                <Link href={`/museum/${museumSlug}/tour/${tour.id}/buy`}
                  className={`flex items-center justify-center gap-2 py-3 bg-amber-500 text-white rounded-full font-medium hover:bg-amber-600 transition-colors ${allowActivationCodes ? "flex-1" : "w-full"}`}>
                  <ShoppingCartIcon className="w-5 h-5" />
                  <span>{ui.buy} {tour.price} {tour.currency === "GEL" ? "₾" : tour.currency}</span>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
