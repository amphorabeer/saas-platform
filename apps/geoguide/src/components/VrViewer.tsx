"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface ApiHotspot {
  id: string;
  type: "NAVIGATION" | "AUDIO";
  targetSceneId: string | null;
  positionX: number;
  positionY: number;
  positionZ: number;
  label: Record<string, string>;
  audioUrls: Record<string, string> | null;
}

interface ApiScene {
  id: string;
  title: Record<string, string>;
  panoramaUrl: string;
  thumbnailUrl?: string | null;
  defaultYaw: number;
  defaultPitch: number;
  order: number;
  isStartScene?: boolean;
  hotspots: ApiHotspot[];
}

interface VrViewerProps {
  tourId: string;
  language: string;
}

function toYawPitch(x: number, y: number, z: number) {
  const R = Math.sqrt(x * x + y * y + z * z);
  const yaw = Math.atan2(x, -z) * (180 / Math.PI);
  const pitch = Math.asin(y / R) * (180 / Math.PI);
  return { yaw, pitch };
}

export function VrViewer({ tourId, language }: VrViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const pannellumRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [scenes, setScenes] = useState<ApiScene[]>([]);
  const [currentScene, setCurrentScene] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nowPlaying, setNowPlaying] = useState<string | null>(null);
  const [gyroEnabled, setGyroEnabled] = useState(false);
  const [gyroSupported, setGyroSupported] = useState(false);

  // Check gyroscope support
  useEffect(() => {
    if (typeof window !== "undefined" && "DeviceOrientationEvent" in window) {
      setGyroSupported(true);
    }
  }, []);

  const requestGyro = async () => {
    try {
      const DOE = DeviceOrientationEvent as any;
      if (typeof DOE.requestPermission === "function") {
        const permission = await DOE.requestPermission();
        if (permission === "granted") {
          setGyroEnabled(true);
          if (pannellumRef.current) {
            pannellumRef.current.startOrientation();
          }
        }
      } else {
        setGyroEnabled(true);
        if (pannellumRef.current) {
          pannellumRef.current.startOrientation();
        }
      }
    } catch (e) {
      console.warn("Gyroscope permission denied");
    }
  };

  const toggleGyro = () => {
    if (gyroEnabled) {
      setGyroEnabled(false);
      if (pannellumRef.current) {
        pannellumRef.current.stopOrientation();
      }
    } else {
      requestGyro();
    }
  };

  // Load pannellum
  useEffect(() => {
    if (document.getElementById("pannellum-css")) return;
    const link = document.createElement("link");
    link.id = "pannellum-css";
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.id = "pannellum-js";
    script.src = "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js";
    document.head.appendChild(script);
  }, []);

  // Fetch tour data
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`https://vr.geoguide.ge/api/vr/tours/${tourId}`);
        if (!res.ok) throw new Error("Failed to fetch tour");
        const json = await res.json();
        const tourData = json.data || json;
        const sceneList: ApiScene[] = tourData.scenes || [];
        setScenes(sceneList);
        const start = sceneList.find((s) => s.isStartScene) || sceneList[0];
        if (start) setCurrentScene(start.id);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [tourId]);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setNowPlaying(null);
        document.getElementById("vr-audio-indicator")?.classList.add("hidden");
  }, []);

  // Register global handlers
  useEffect(() => {
    const w = window as any;

    w.__vrNavigate = (evt: any, args: any) => {
      if (args?.targetSceneId) {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
        setNowPlaying(null);
        document.getElementById("vr-audio-indicator")?.classList.add("hidden");
        setCurrentScene(args.targetSceneId);
      }
    };

    w.__vrPlayAudio = (evt: any, args: any) => {
      if (!args?.audioUrl) return;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
        setNowPlaying(null);
        document.getElementById("vr-audio-indicator")?.classList.add("hidden");
        return;
      }
      const audio = new Audio(args.audioUrl);
      audioRef.current = audio;
      setNowPlaying(args.hotspotId || "audio");
      document.getElementById("vr-audio-indicator")?.classList.remove("hidden");
      audio.play().catch(() => {});
      audio.onended = () => {
        setNowPlaying(null);
        document.getElementById("vr-audio-indicator")?.classList.add("hidden");
        audioRef.current = null;
      };
    };

    w.__vrMakeNavTooltip = (div: HTMLDivElement) => {
      div.style.cssText = "width:36px;height:36px;background:rgba(245,158,11,0.9);border-radius:50%;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:20px;color:white;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.3);";
      div.textContent = "➜";
    };

    w.__vrMakeAudioTooltip = (div: HTMLDivElement) => {
      div.style.cssText = "width:36px;height:36px;background:rgba(16,185,129,0.9);border-radius:50%;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:18px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.3);";
      div.textContent = "🎧";
    };

    return () => {
      delete w.__vrNavigate;
      delete w.__vrPlayAudio;
      delete w.__vrMakeNavTooltip;
      delete w.__vrMakeAudioTooltip;
    };
  }, []);

  // Render panorama
  useEffect(() => {
    if (!scenes.length || !currentScene || loading) return;
    if (!(window as any).pannellum) {
      const t = setTimeout(() => setCurrentScene((s) => s), 500);
      return () => clearTimeout(t);
    }

    const scene = scenes.find((s) => s.id === currentScene);
    if (!scene || !viewerRef.current) return;

    if (pannellumRef.current) {
      pannellumRef.current.destroy();
    }

    const hotspots = scene.hotspots
      .filter((hs) => hs.type === "NAVIGATION" || hs.type === "AUDIO")
      .map((hs) => {
        const { yaw, pitch } = toYawPitch(hs.positionX, hs.positionY, hs.positionZ);
        const label = hs.label?.[language] || hs.label?.["ka"] || "";

        if (hs.type === "NAVIGATION" && hs.targetSceneId) {
          return {
            pitch,
            yaw,
            type: "info",
            text: label || "შემდეგი",
            createTooltipFunc: (window as any).__vrMakeNavTooltip,
            createTooltipArgs: "",
            clickHandlerFunc: (window as any).__vrNavigate,
            clickHandlerArgs: { targetSceneId: hs.targetSceneId },
          };
        }

        const audioUrl = hs.audioUrls?.[language] || hs.audioUrls?.["ka"] || null;
        return {
          pitch,
          yaw,
          type: "info",
          text: label || "აუდიო",
          createTooltipFunc: (window as any).__vrMakeAudioTooltip,
          createTooltipArgs: "",
          clickHandlerFunc: audioUrl ? (window as any).__vrPlayAudio : undefined,
          clickHandlerArgs: audioUrl ? { audioUrl, hotspotId: hs.id } : undefined,
        };
      });

    pannellumRef.current = (window as any).pannellum.viewer(viewerRef.current, {
      type: "equirectangular",
      panorama: `/api/proxy-image?url=${encodeURIComponent(scene.panoramaUrl)}`,
      autoLoad: true,
      compass: true,
      orientationOnByDefault: false,
      hfov: 110,
      yaw: scene.defaultYaw || 0,
      pitch: scene.defaultPitch || 0,
      hotSpots: hotspots,
      showControls: true,
      mouseZoom: true,
      touchPanSpeedCoeffFactor: 1,
    });

    return () => {
      if (pannellumRef.current) {
        pannellumRef.current.destroy();
        pannellumRef.current = null;
      }
    };
  }, [currentScene, scenes, loading, language]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  if (error || !scenes.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        {error || "360° ხედი არ არის ხელმისაწვდომი"}
      </div>
    );
  }

  return (
    <div className="relative">
      
        <div id="vr-audio-indicator" className="hidden absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-black/70 text-white px-4 py-2 rounded-full text-sm flex items-center gap-2">
          <span className="animate-pulse">🔊</span>
          <span>აუდიო უკრავს...</span>
          <button onClick={stopAudio} className="ml-2 text-red-300 hover:text-red-100">✕</button>
        </div>
      

      <div ref={viewerRef} style={{ width: "100%", height: "70vh" }} />

      {gyroSupported && (
        <button
          onClick={toggleGyro}
          className={`absolute bottom-4 right-4 z-10 w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-lg transition-colors ${
            gyroEnabled ? "bg-amber-500 text-white" : "bg-white/80 text-gray-600"
          }`}
          title={gyroEnabled ? "გიროსკოპი ჩართულია" : "გიროსკოპის ჩართვა"}
        >
          📱
        </button>
      )}

      {scenes.length > 1 && (
        <div className="flex gap-2 overflow-x-auto py-3 px-2">
          {scenes.map((scene) => (
            <button
              key={scene.id}
              onClick={() => {
                stopAudio();
                setCurrentScene(scene.id);
              }}
              className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm border-2 transition-colors ${
                currentScene === scene.id
                  ? "border-amber-500 bg-amber-50 text-amber-700"
                  : "border-gray-200 bg-white text-gray-600"
              }`}
            >
              <div className="font-medium">360°</div>
              <div className="text-xs mt-0.5">
                {scene.title?.[language] || scene.title?.["ka"] || `სცენა ${scene.order + 1}`}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
