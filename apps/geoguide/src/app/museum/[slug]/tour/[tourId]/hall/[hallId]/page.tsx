"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLanguage } from "@/lib/language-context";
import { LANGUAGES, Language, TourStop } from "@/lib/types";
import { OfflineImage } from "@/components/OfflineImage";
import { VrViewer } from "@/components/VrViewer";
import {
  ChevronLeftIcon,
  PlayIcon,
  PauseIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  BackwardIcon,
  ForwardIcon,
  MinusIcon,
  PlusIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import { PlayIcon as PlayIconSolid, PauseIcon as PauseIconSolid } from "@heroicons/react/24/solid";

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
  coverImage: string | null;
  halls: Hall[];
  stops: TourStop[];
  vrTourId?: string | null;
}

// UI texts
const uiTexts: Record<string, {
  audioGuide: string;
  stop: string;
  search: string;
  noStops: string;
  list: string;
}> = {
  ka: { audioGuide: "აუდიო გიდი", stop: "გაჩერება", search: "ძებნა ნომრით ან სახელით...", noStops: "გაჩერებები არ არის", list: "ჩამონათვალი" },
  en: { audioGuide: "Audio Guide", stop: "Stop", search: "Search by number or name...", noStops: "No stops available", list: "List" },
  ru: { audioGuide: "Аудиогид", stop: "Остановка", search: "Поиск по номеру или названию...", noStops: "Остановки недоступны", list: "Список" },
  de: { audioGuide: "Audioguide", stop: "Haltestelle", search: "Nach Nummer oder Name suchen...", noStops: "Keine Haltestellen", list: "Liste" },
  fr: { audioGuide: "Audioguide", stop: "Arrêt", search: "Rechercher par numéro ou nom...", noStops: "Aucun arrêt", list: "Liste" },
  uk: { audioGuide: "Аудіогід", stop: "Зупинка", search: "Пошук за номером або назвою...", noStops: "Зупинки недоступні", list: "Список" },
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
  const [playedStops, setPlayedStops] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"audio" | "vr360">("audio");

  // Audio player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [actualAudioUrl, setActualAudioUrl] = useState<string | null>(null);
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

  // Load offline audio when stop selected
  useEffect(() => {
    if (!selectedStop) return;
    const audioUrl = getAudioUrl(selectedStop);
    if (!audioUrl) return;

    const loadAudio = async () => {
      try {
        const { getAudioOffline } = await import("@/lib/offline-manager");
        const offlineUrl = await getAudioOffline(audioUrl);
        setActualAudioUrl(offlineUrl || audioUrl);
      } catch {
        setActualAudioUrl(audioUrl);
      }
    };
    loadAudio();
  }, [selectedStop, language]);

  // Auto-play when audio URL changes
  useEffect(() => {
    const audio = audioRef.current;
    if (audio && actualAudioUrl) {
      audio.src = actualAudioUrl;
      audio.playbackRate = playbackRate;
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [actualAudioUrl, playbackRate]);

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
    const query = searchQuery.toLowerCase();
    const title = getStopTitle(stop).toLowerCase();
    const index = (stop.orderIndex + 1).toString();
    return title.includes(query) || index.includes(query);
  });

  const handleStopClick = (stop: TourStop) => {
    const audioUrl = getAudioUrl(stop);
    if (!audioUrl) return;

    if (selectedStop?.id === stop.id) {
      togglePlay();
    } else {
      setSelectedStop(stop);
      setPlayedStops((prev) => new Set(prev).add(stop.id));
      setCurrentTime(0);
    }
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const seek = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(audio.currentTime + seconds, duration));
  };

  const changeSpeed = (delta: number) => {
    const newRate = Math.max(0.5, Math.min(2.0, playbackRate + delta));
    setPlaybackRate(newRate);
    if (audioRef.current) audioRef.current.playbackRate = newRate;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) audioRef.current.currentTime = time;
  };

  const formatTime = (time: number): string => {
    if (!time || isNaN(time)) return "00:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
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
    <div className="flex flex-col min-h-screen bg-gray-100">
      <audio
        ref={audioRef}
        preload="metadata"
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => setIsPlaying(false)}
      />

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

      {/* Toolbar */}
      <div className="sticky top-14 z-40 bg-white border-b px-4 py-2">
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-2 flex-1 justify-center">
            <button
              onClick={() => setViewMode("audio")}
              className={`font-medium flex items-center gap-1 px-3 py-1 rounded-lg text-sm transition-colors ${
                viewMode === "audio" ? "bg-amber-500 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              🎧 {ui.audioGuide}
            </button>
            {tour.vrTourId && (
              <button
                onClick={() => setViewMode("vr360")}
                className={`font-medium flex items-center gap-1 px-3 py-1 rounded-lg text-sm transition-colors ${
                  viewMode === "vr360" ? "bg-amber-500 text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                🥽 360°
              </button>
            )}
          </div>
          {viewMode === "audio" && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowSearch(!showSearch)}
                className={`p-2 rounded-lg hover:bg-gray-100 ${showSearch ? "bg-amber-100 text-amber-600" : ""}`}
              >
                <MagnifyingGlassIcon className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
        {showSearch && viewMode === "audio" && (
          <div className="mt-2 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={ui.search}
              className="w-full px-4 py-2 pr-10 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
              autoFocus
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <XMarkIcon className="w-5 h-5 text-gray-400" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Stops List / VR */}
      <div className="flex-1 p-4 pb-20">
        {viewMode === "vr360" && tour.vrTourId ? (
          <VrViewer tourId={tour.vrTourId} language={language} />
        ) : (
          <>
            {filteredStops.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>{ui.noStops}</p>
              </div>
            ) : (
              <div className="space-y-3">
            {filteredStops
              .sort((a, b) => a.orderIndex - b.orderIndex)
              .map((stop) => {
                const audioUrl = getAudioUrl(stop);
                const isSelected = selectedStop?.id === stop.id;
                const isPlayed = playedStops.has(stop.id);

                return (
                  <div key={stop.id} className="space-y-0">
                    {/* Stop Card */}
                    <button
                      onClick={() => handleStopClick(stop)}
                      disabled={!audioUrl}
                      className={`w-full rounded-xl overflow-hidden text-left transition-all ${
                        isSelected ? "ring-2 ring-amber-500" : ""
                      } ${!audioUrl ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      {/* Image - if stop has image */}
                      {stop.imageUrl && (
                        <div className="relative h-48 bg-gray-200">
                          <OfflineImage
                            src={stop.imageUrl || tour.coverImage || ""}
                            alt={getStopTitle(stop)}
                            className="w-full h-full object-cover"
                          />
                          {/* Number badge on image */}
                          <div className="absolute top-3 left-3 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg">
                            <span className="font-semibold">{stop.orderIndex + 1}</span>
                          </div>
                          {/* Played check on image */}
                          {isPlayed && (
                            <div className="absolute top-3 right-3 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                              <CheckIcon className="w-5 h-5 text-white" />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Title bar */}
                      <div className={`flex items-center gap-3 p-4 ${isSelected ? "bg-amber-50" : "bg-white"}`}>
                        {/* Number circle - only if no image */}
                        {!stop.imageUrl && (
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 ${
                            isPlayed ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-600"
                          }`}>
                            {stop.orderIndex + 1}
                          </div>
                        )}
                        {/* Played check - only if no image */}
                        {!stop.imageUrl && isPlayed && (
                          <CheckIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{getStopTitle(stop)}</p>
                        </div>
                        {audioUrl && (
                          <div className="flex-shrink-0">
                            {isSelected && isPlaying ? (
                              <PauseIconSolid className="w-6 h-6 text-amber-500" />
                            ) : (
                              <PlayIcon className="w-6 h-6 text-gray-400" />
                            )}
                          </div>
                        )}
                      </div>
                    </button>

                    {/* Inline Player - appears under selected stop */}
                    {isSelected && audioUrl && (
                      <div className="bg-gray-800 rounded-b-xl p-4 -mt-1 text-white">
                        {/* Controls Row */}
                        <div className="flex items-center justify-center gap-6 mb-4">
                          <button onClick={() => seek(-5)} className="flex flex-col items-center text-gray-400 hover:text-white">
                            <BackwardIcon className="w-6 h-6" />
                            <span className="text-xs">5</span>
                          </button>
                          <button onClick={() => changeSpeed(-0.25)} className="p-2 rounded-full border border-gray-600 hover:border-gray-400">
                            <MinusIcon className="w-4 h-4" />
                          </button>
                          <span className="text-sm font-medium min-w-[40px] text-center">{playbackRate.toFixed(1)}x</span>
                          <button onClick={() => changeSpeed(0.25)} className="p-2 rounded-full border border-gray-600 hover:border-gray-400">
                            <PlusIcon className="w-4 h-4" />
                          </button>
                          <button onClick={() => seek(10)} className="flex flex-col items-center text-gray-400 hover:text-white">
                            <ForwardIcon className="w-6 h-6" />
                            <span className="text-xs">10</span>
                          </button>
                        </div>

                        {/* Progress Bar */}
                        <div className="flex items-center gap-3 mb-4">
                          <span className="text-sm text-gray-400 min-w-[45px]">{formatTime(currentTime)}</span>
                          <input
                            type="range"
                            min={0}
                            max={duration || 100}
                            value={currentTime}
                            onChange={handleSeek}
                            className="flex-1 h-1 bg-gray-600 rounded-full appearance-none cursor-pointer
                              [&::-webkit-slider-thumb]:appearance-none
                              [&::-webkit-slider-thumb]:w-3
                              [&::-webkit-slider-thumb]:h-3
                              [&::-webkit-slider-thumb]:bg-amber-500
                              [&::-webkit-slider-thumb]:rounded-full"
                          />
                          <span className="text-sm text-gray-400 min-w-[45px] text-right">{formatTime(duration)}</span>
                        </div>

                        {/* Play Button */}
                        <div className="flex justify-center">
                          <button
                            onClick={togglePlay}
                            className="w-14 h-14 flex items-center justify-center bg-amber-500 rounded-full hover:bg-amber-600 transition-colors"
                          >
                            {isPlaying ? (
                              <PauseIconSolid className="w-7 h-7 text-white" />
                            ) : (
                              <PlayIconSolid className="w-7 h-7 text-white ml-1" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}