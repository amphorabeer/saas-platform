"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/lib/language-context";
import { LANGUAGES, Language, TourStop } from "@/lib/types";
import { OfflineImage } from "@/components/OfflineImage";
import {
  ChevronLeftIcon,
  PlayIcon,
  PauseIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import { PlayIcon as PlayIconSolid } from "@heroicons/react/24/solid";

interface Hall {
  id: string;
  name: string;
  nameEn: string | null;
  nameRu: string | null;
  nameUk: string | null;
  imageUrl: string | null;
}

interface Tour {
  id: string;
  name: string;
  nameEn: string | null;
  nameRu: string | null;
  nameUk: string | null;
  halls: Hall[];
  stops: TourStop[];
}

// UI texts
const uiTexts: Record<string, {
  audioGuide: string;
  stop: string;
  search: string;
  noStops: string;
  list: string;
}> = {
  ka: { audioGuide: "აუდიო გიდი", stop: "გაჩერება", search: "ძებნა...", noStops: "გაჩერებები არ არის", list: "ჩამონათვალი" },
  en: { audioGuide: "Audio Guide", stop: "Stop", search: "Search...", noStops: "No stops available", list: "List" },
  ru: { audioGuide: "Аудиогид", stop: "Остановка", search: "Поиск...", noStops: "Остановки недоступны", list: "Список" },
  de: { audioGuide: "Audioguide", stop: "Haltestelle", search: "Suchen...", noStops: "Keine Haltestellen", list: "Liste" },
  fr: { audioGuide: "Audioguide", stop: "Arrêt", search: "Rechercher...", noStops: "Aucun arrêt", list: "Liste" },
  uk: { audioGuide: "Аудіогід", stop: "Зупинка", search: "Пошук...", noStops: "Зупинки недоступні", list: "Список" },
};

export default function HallPage() {
  const params = useParams();
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const [tour, setTour] = useState<Tour | null>(null);
  const [hall, setHall] = useState<Hall | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStop, setSelectedStop] = useState<TourStop | null>(null);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [availableLanguages, setAvailableLanguages] = useState<Language[]>(["ka"]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Audio player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const ui = uiTexts[language] || uiTexts.ka;

  useEffect(() => {
    fetchTour();
  }, [params.tourId, params.hallId]);

  const fetchTour = async () => {
    try {
      const res = await fetch(`/api/tours/${params.tourId}`);
      if (res.ok) {
        const data = await res.json();
        setTour(data);

        // Find the current hall
        const currentHall = data.halls?.find((h: Hall) => h.id === params.hallId);
        setHall(currentHall || null);

        // Detect available languages
        const langs = new Set<Language>(["ka"]);
        if (data.nameEn) langs.add("en");
        if (data.nameRu) langs.add("ru");
        if (data.nameUk) langs.add("uk");
        
        // Check stops for languages
        const hallStops = data.stops?.filter((s: TourStop) => s.hallId === params.hallId) || [];
        hallStops.forEach((stop: any) => {
          if (stop.titleEn || stop.audioUrlEn) langs.add("en");
          if (stop.titleRu || stop.audioUrlRu) langs.add("ru");
          if (stop.titleUk || stop.audioUrlUk) langs.add("uk");
        });
        
        setAvailableLanguages(Array.from(langs));
      }
    } catch (error) {
      console.error("Error fetching tour:", error);
    } finally {
      setLoading(false);
    }
  };

  const getHallName = (): string => {
    if (!hall) return "";
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

  const getStopTitle = (stop: TourStop): string => {
    const fieldMap: Record<Language, string> = {
      ka: "title",
      en: "titleEn",
      ru: "titleRu",
      de: "title",
      fr: "title",
      uk: "titleUk",
    };
    const field = fieldMap[language] as keyof TourStop;
    return (stop[field] as string) || stop.title || "";
  };

  const getAudioUrl = (stop: TourStop): string | null => {
    const fieldMap: Record<Language, string> = {
      ka: "audioUrl",
      en: "audioUrlEn",
      ru: "audioUrlRu",
      de: "audioUrl",
      fr: "audioUrl",
      uk: "audioUrlUk",
    };
    const field = fieldMap[language] as keyof TourStop;
    return (stop[field] as string) || stop.audioUrl || null;
  };

  const hallStops = tour?.stops?.filter((s) => s.hallId === params.hallId) || [];
  
  const filteredStops = hallStops.filter((stop) => {
    if (!searchQuery) return true;
    const title = getStopTitle(stop).toLowerCase();
    return title.includes(searchQuery.toLowerCase());
  });

  const handleStopSelect = (stop: TourStop) => {
    setSelectedStop(stop);
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
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

  if (!tour || !hall) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <p className="text-gray-500">დარბაზი ვერ მოიძებნა</p>
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
            {getHallName()}
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

      {/* Audio Guide Label & Search */}
      <div className="bg-white px-4 py-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-amber-500">🎧</span>
          <span className="font-medium">{ui.audioGuide}</span>
        </div>
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="p-2 rounded-full hover:bg-gray-100"
        >
          <MagnifyingGlassIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="bg-white px-4 py-2 border-b">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={ui.search}
            className="w-full px-4 py-2 border rounded-full text-sm"
            autoFocus
          />
        </div>
      )}

      {/* Stops List */}
      <div className="flex-1">
        {filteredStops.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>{ui.noStops}</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredStops
              .sort((a, b) => a.orderIndex - b.orderIndex)
              .map((stop) => {
                const audioUrl = getAudioUrl(stop);
                const isSelected = selectedStop?.id === stop.id;

                return (
                  <div
                    key={stop.id}
                    onClick={() => handleStopSelect(stop)}
                    className={`flex items-center gap-4 px-4 py-4 bg-white cursor-pointer hover:bg-gray-50 ${
                      isSelected ? "bg-amber-50" : ""
                    }`}
                  >
                    <div className="flex-1">
                      <div className="font-medium">{getStopTitle(stop)}</div>
                    </div>
                    {audioUrl && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStopSelect(stop);
                          setTimeout(() => {
                            if (audioRef.current) {
                              audioRef.current.play();
                              setIsPlaying(true);
                            }
                          }, 100);
                        }}
                        className="p-2 rounded-full bg-amber-500 text-white hover:bg-amber-600"
                      >
                        <PlayIcon className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Audio Player */}
      {selectedStop && getAudioUrl(selectedStop) && (
        <div className="sticky bottom-0 bg-white border-t shadow-lg safe-bottom">
          <audio
            ref={audioRef}
            src={getAudioUrl(selectedStop) || ""}
            onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
            onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
            onEnded={() => setIsPlaying(false)}
          />
          <div className="px-4 py-3">
            <div className="flex items-center gap-4">
              <button
                onClick={togglePlay}
                className="w-12 h-12 rounded-full bg-amber-500 text-white flex items-center justify-center hover:bg-amber-600"
              >
                {isPlaying ? (
                  <PauseIcon className="w-6 h-6" />
                ) : (
                  <PlayIconSolid className="w-6 h-6" />
                )}
              </button>
              <div className="flex-1">
                <div className="font-medium text-sm truncate">
                  {getStopTitle(selectedStop)}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">{formatTime(currentTime)}</span>
                  <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500"
                      style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">{formatTime(duration)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Tab - List */}
      <div className="bg-white border-t py-2 text-center safe-bottom">
        <span className="text-sm text-gray-600">☰ {ui.list}</span>
      </div>
    </div>
  );
}