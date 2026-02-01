"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/lib/language-context";
import { Tour, TourStop, Hall, LANGUAGES, Language } from "@/lib/types";
import { OfflineImage } from "@/components/OfflineImage";
import {
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  CheckIcon,
  PlayIcon,
  PauseIcon,
  ChevronLeftIcon,
  QrCodeIcon,
  XMarkIcon,
  BackwardIcon,
  ForwardIcon,
  MinusIcon,
  PlusIcon,
  BuildingLibraryIcon,
} from "@heroicons/react/24/outline";
import { PlayIcon as PlayIconSolid, PauseIcon as PauseIconSolid } from "@heroicons/react/24/solid";

// UI texts for all languages
const uiTexts: Record<string, {
  audioGuide: string;
  stop: string;
  search: string;
  tourNotFound: string;
  list: string;
  halls: string;
  stops: string;
  allStops: string;
}> = {
  ka: { audioGuide: "აუდიო გიდი", stop: "გაჩერება", search: "ძებნა ნომრით ან სახელით...", tourNotFound: "ტური ვერ მოიძებნა", list: "ჩამონათვალი", halls: "დარბაზები", stops: "გაჩერება", allStops: "ყველა გაჩერება" },
  en: { audioGuide: "Audio Guide", stop: "Stop", search: "Search by number or name...", tourNotFound: "Tour not found", list: "List", halls: "Halls", stops: "stops", allStops: "All Stops" },
  ru: { audioGuide: "Аудиогид", stop: "Остановка", search: "Поиск по номеру или названию...", tourNotFound: "Тур не найден", list: "Список", halls: "Залы", stops: "остановок", allStops: "Все остановки" },
  de: { audioGuide: "Audioguide", stop: "Haltestelle", search: "Nach Nummer oder Name suchen...", tourNotFound: "Tour nicht gefunden", list: "Liste", halls: "Säle", stops: "Haltestellen", allStops: "Alle Haltestellen" },
  fr: { audioGuide: "Audioguide", stop: "Arrêt", search: "Rechercher par numéro ou nom...", tourNotFound: "Visite non trouvée", list: "Liste", halls: "Salles", stops: "arrêts", allStops: "Tous les arrêts" },
  uk: { audioGuide: "Аудіогід", stop: "Зупинка", search: "Пошук за номером або назвою...", tourNotFound: "Тур не знайдено", list: "Список", halls: "Зали", stops: "зупинок", allStops: "Всі зупинки" },
};

export default function TourPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language, setLanguage } = useLanguage();
  const [tour, setTour] = useState<(Tour & { halls?: Hall[] }) | null>(null);
  const [museum, setMuseum] = useState<{ showQrScanner?: boolean; showMap?: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStop, setSelectedStop] = useState<TourStop | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [playedStops, setPlayedStops] = useState<Set<string>>(new Set());
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [availableLanguages, setAvailableLanguages] = useState<Language[]>(["ka"]);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  // View mode: 'halls' or 'stops'
  const [viewMode, setViewMode] = useState<'halls' | 'stops'>('halls');

  // Audio player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [actualAudioUrl, setActualAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const ui = uiTexts[language] || uiTexts.ka;

  // Check if tour has halls
  const hasHalls = tour?.halls && tour.halls.length > 0;

  useEffect(() => {
    fetchTour();
    fetchMuseum();
  }, [params.tourId, params.slug]);

  const fetchTour = async () => {
    try {
      const res = await fetch(`/api/tours/${params.tourId}`);
      if (res.ok) {
        const data = await res.json();
        setTour(data);

        // Set initial view mode based on halls
        if (data.halls && data.halls.length > 0) {
          setViewMode('halls');
        } else {
          setViewMode('stops');
        }

        const langs = new Set<Language>(["ka"]);
        if (data.nameEn) langs.add("en");
        if (data.nameRu) langs.add("ru");
        if (data.nameUk) langs.add("uk");
        data.stops?.forEach((stop: TourStop) => {
          if (stop.titleEn || stop.audioUrlEn) langs.add("en");
          if (stop.titleRu || stop.audioUrlRu) langs.add("ru");
          if (stop.titleUk || stop.audioUrlUk) langs.add("uk");
        });
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

  const fetchMuseum = async () => {
    try {
      const res = await fetch(`/api/museums/${params.slug}`);
      if (res.ok) {
        const data = await res.json();
        setMuseum({ showQrScanner: data.showQrScanner, showMap: data.showMap });
      }
    } catch (error) {
      console.error("Error fetching museum:", error);
    }
  };

  useEffect(() => {
    if (tour) {
      import("@/lib/offline-manager").then(({ isTourDownloaded }) => {
        isTourDownloaded(tour.id, language).then(setIsDownloaded);
      });
    }
  }, [tour, language]);

  useEffect(() => {
    if (!tour) return;
    const stopId = searchParams.get("stop");
    if (stopId) {
      const stop = tour.stops.find((s) => s.id === stopId);
      if (stop) {
        setViewMode('stops');
        handleStopClick(stop);
      }
    }
    const stopIndex = searchParams.get("stopIndex");
    if (stopIndex !== null) {
      const index = parseInt(stopIndex, 10);
      const stop = tour.stops.find((s) => s.orderIndex === index);
      if (stop) {
        setViewMode('stops');
        handleStopClick(stop);
      }
    }
  }, [tour, searchParams]);

  // Load offline audio when stop selected
  useEffect(() => {
    if (!selectedStop) return;
    const audioUrl = getLocalizedAudio(selectedStop);
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

  const getTourName = (): string => {
    if (!tour) return "";
    const fieldMap: Record<Language, keyof Tour> = { ka: "name", en: "nameEn", ru: "nameRu", de: "name", fr: "name", uk: "nameUk" };
    const field = fieldMap[language];
    if (field && tour[field]) return tour[field] as string;
    return tour.name;
  };

  const getHallName = (hall: Hall): string => {
    const fieldMap: Record<Language, keyof Hall> = { ka: "name", en: "nameEn", ru: "nameRu", de: "name", fr: "name", uk: "nameUk" };
    const field = fieldMap[language];
    if (field && hall[field]) return hall[field] as string;
    return hall.name;
  };

  const getLocalizedAudio = (stop: TourStop): string | null => {
    const audioFieldMap: Record<Language, keyof TourStop | null> = { ka: "audioUrl", en: "audioUrlEn", ru: "audioUrlRu", de: null, fr: null, uk: "audioUrlUk" };
    const field = audioFieldMap[language];
    if (field && stop[field]) return stop[field] as string;
    return stop.audioUrl;
  };

  const getLocalizedTitle = (stop: TourStop): string => {
    const titleFieldMap: Record<Language, keyof TourStop> = { ka: "title", en: "titleEn", ru: "titleRu", de: "title", fr: "title", uk: "titleUk" };
    const field = titleFieldMap[language];
    if (field && stop[field]) return stop[field] as string;
    return stop.title;
  };

  const handleStopClick = (stop: TourStop) => {
    const audioUrl = getLocalizedAudio(stop);
    if (!audioUrl) return;

    if (selectedStop?.id === stop.id) {
      // Toggle play/pause if same stop
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

  const handleDownload = async () => {
    if (!tour) return;
    setDownloading(true);
    setDownloadProgress(0);
    try {
      const { downloadTour } = await import("@/lib/offline-manager");
      await downloadTour(tour, language, (progress) => setDownloadProgress(progress));
      setIsDownloaded(true);
      setShowDownloadModal(false);
    } catch (error) {
      console.error("Download error:", error);
    } finally {
      setDownloading(false);
    }
  };

  const handleDeleteOffline = async () => {
    if (!tour) return;
    try {
      const { deleteTourOffline } = await import("@/lib/offline-manager");
      await deleteTourOffline(tour.id, language);
      setIsDownloaded(false);
      setShowDownloadModal(false);
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const getStopsForHall = (hallId: string) => {
    return tour?.stops?.filter((s) => s.hallId === hallId) || [];
  };

  const filteredStops = (tour?.stops || []).filter((stop) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const title = getLocalizedTitle(stop).toLowerCase();
    const index = (stop.orderIndex + 1).toString();
    return title.includes(query) || index.includes(query);
  });

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
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">{ui.tourNotFound}</p>
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
          <button onClick={() => router.push(`/museum/${params.slug}`)} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
            <ChevronLeftIcon className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold truncate flex-1 text-center">{getTourName()}</h1>
          {displayLanguages.length > 1 && (
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
                      <button
                        key={lang.code}
                        onClick={() => { setLanguage(lang.code); setShowLangMenu(false); }}
                        className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100 ${language === lang.code ? "bg-amber-50 text-amber-600" : ""}`}
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
        <div className="flex items-center justify-between">
          <h2 className="font-medium flex items-center gap-2">🎧 {ui.audioGuide}</h2>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowDownloadModal(true)} className={`p-2 rounded-lg hover:bg-gray-100 ${isDownloaded ? "text-green-600" : ""}`}>
              {isDownloaded ? <CheckIcon className="w-5 h-5" /> : <ArrowDownTrayIcon className="w-5 h-5" />}
            </button>
            {viewMode === 'stops' && (
              <button onClick={() => setShowSearch(!showSearch)} className={`p-2 rounded-lg hover:bg-gray-100 ${showSearch ? "bg-amber-100 text-amber-600" : ""}`}>
                <MagnifyingGlassIcon className="w-5 h-5" />
              </button>
            )}
            {museum?.showQrScanner && (
              <button onClick={() => router.push(`/museum/${params.slug}/tour/${params.tourId}/scan`)} className="p-2 rounded-lg hover:bg-gray-100">
                <QrCodeIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
        
        {/* View Mode Toggle - only if has halls */}
        {hasHalls && (
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setViewMode('halls')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'halls'
                  ? 'bg-amber-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <BuildingLibraryIcon className="w-4 h-4 inline mr-1" />
              {ui.halls}
            </button>
            <button
              onClick={() => setViewMode('stops')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'stops'
                  ? 'bg-amber-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {ui.allStops}
            </button>
          </div>
        )}

        {showSearch && viewMode === 'stops' && (
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

      {/* Content */}
      <div className="flex-1 p-4 pb-20">
        {/* Halls View */}
        {viewMode === 'halls' && hasHalls && (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            {tour.halls!
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
                      {getStopsForHall(hall.id).length} {ui.stops}
                    </p>
                  </div>
                </Link>
              ))}
          </div>
        )}

        {/* Stops View */}
        {viewMode === 'stops' && (
          <div className="space-y-3">
            {filteredStops?.map((stop) => {
              const audioUrl = getLocalizedAudio(stop);
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
                    {/* Image - if stop has image or use tour cover */}
                    {stop.imageUrl && (
                      <div className="relative h-48 bg-gray-200">
                        <OfflineImage
                          src={stop.imageUrl || tour.coverImage || ""}
                          alt={getLocalizedTitle(stop)}
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
                      {!stop.imageUrl && !tour.coverImage && (
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 ${
                          isPlayed ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-600"
                        }`}>
                          {stop.orderIndex + 1}
                        </div>
                      )}
                      {/* Played check - only if no image */}
                      {!stop.imageUrl && !tour.coverImage && isPlayed && (
                        <CheckIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{getLocalizedTitle(stop)}</p>
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
      </div>

      {/* Bottom nav - simplified */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t safe-bottom z-30">
        <div className="flex justify-center py-3">
          <span className="text-sm text-gray-500 flex items-center gap-2">
            ☰ {ui.list}
          </span>
        </div>
      </div>

      {/* Download Modal */}
      {showDownloadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 m-4 max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-4">
              {isDownloaded ? (language === "ka" ? "ტური ჩამოტვირთულია" : "Tour Downloaded") : (language === "ka" ? "ჩამოტვირთვა" : "Download")}
            </h3>
            {downloading ? (
              <div className="space-y-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-amber-500 h-2 rounded-full transition-all" style={{ width: `${downloadProgress}%` }} />
                </div>
                <p className="text-center text-gray-600">{downloadProgress}%</p>
              </div>
            ) : isDownloaded ? (
              <div className="space-y-4">
                <p className="text-gray-600">{language === "ka" ? "ეს ტური უკვე ჩამოტვირთულია." : "This tour is already downloaded."}</p>
                <div className="flex gap-3">
                  <button onClick={() => setShowDownloadModal(false)} className="flex-1 py-2 border rounded-lg">
                    {language === "ka" ? "დახურვა" : "Close"}
                  </button>
                  <button onClick={handleDeleteOffline} className="flex-1 py-2 bg-red-500 text-white rounded-lg">
                    {language === "ka" ? "წაშლა" : "Delete"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-600">{language === "ka" ? "ჩამოტვირთეთ ტური ოფლაინ რეჟიმში." : "Download for offline use."}</p>
                <div className="flex gap-3">
                  <button onClick={() => setShowDownloadModal(false)} className="flex-1 py-2 border rounded-lg">
                    {language === "ka" ? "გაუქმება" : "Cancel"}
                  </button>
                  <button onClick={handleDownload} className="flex-1 py-2 bg-amber-500 text-white rounded-lg">
                    {language === "ka" ? "ჩამოტვირთვა" : "Download"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}