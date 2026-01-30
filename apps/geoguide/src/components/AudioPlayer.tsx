"use client";

import { useState, useRef, useEffect } from "react";
import {
  PlayIcon,
  PauseIcon,
  BackwardIcon,
  ForwardIcon,
  MinusIcon,
  PlusIcon,
} from "@heroicons/react/24/solid";
import { ChevronUpIcon, ChevronDownIcon } from "@heroicons/react/24/outline";

interface AudioPlayerProps {
  title: string;
  subtitle?: string;
  imageUrl?: string | null;
  audioUrl: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export function AudioPlayer({
  title,
  subtitle,
  imageUrl,
  audioUrl,
  isExpanded,
  onToggleExpand,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [actualAudioUrl, setActualAudioUrl] = useState(audioUrl);
  const [actualImageUrl, setActualImageUrl] = useState(imageUrl);

  // Check for offline audio and image
  useEffect(() => {
    const loadOfflineAssets = async () => {
      try {
        const { getAudioOffline, getImageOffline } = await import("@/lib/offline-manager");
        
        // Check offline audio
        const offlineAudio = await getAudioOffline(audioUrl);
        if (offlineAudio) {
          console.log("Using offline audio");
          setActualAudioUrl(offlineAudio);
        } else {
          setActualAudioUrl(audioUrl);
        }

        // Check offline image
        if (imageUrl) {
          const offlineImage = await getImageOffline(imageUrl);
          if (offlineImage) {
            console.log("Using offline image");
            setActualImageUrl(offlineImage);
          } else {
            setActualImageUrl(imageUrl);
          }
        }
      } catch (error) {
        console.log("Offline check failed, using online URLs");
        setActualAudioUrl(audioUrl);
        setActualImageUrl(imageUrl);
      }
    };

    loadOfflineAssets();
  }, [audioUrl, imageUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [actualAudioUrl]);

  useEffect(() => {
    if (audioRef.current && actualAudioUrl) {
      audioRef.current.src = actualAudioUrl;
      audioRef.current.load();
      setCurrentTime(0);
      setIsPlaying(false);
    }
  }, [actualAudioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const seek = (seconds: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(
      0,
      Math.min(duration, audioRef.current.currentTime + seconds)
    );
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const time = parseFloat(e.target.value);
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const changePlaybackRate = (delta: number) => {
    const newRate = Math.max(0.5, Math.min(2, playbackRate + delta));
    setPlaybackRate(newRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = newRate;
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-gray-900 text-white rounded-t-2xl overflow-hidden">
      <audio ref={audioRef} preload="metadata" />

      {/* Collapse/Expand toggle */}
      <button
        onClick={onToggleExpand}
        className="w-full flex items-center justify-center py-2 hover:bg-gray-800"
      >
        {isExpanded ? (
          <ChevronDownIcon className="w-5 h-5" />
        ) : (
          <ChevronUpIcon className="w-5 h-5" />
        )}
      </button>

      {isExpanded && (
        <>
          {/* Image */}
          {actualImageUrl && (
            <div className="px-4 pb-4">
              <img
                src={actualImageUrl}
                alt={title}
                className="w-full h-48 object-cover rounded-lg"
              />
            </div>
          )}

          {/* Title */}
          <div className="px-4 pb-2 text-center">
            <h3 className="font-semibold">{title}</h3>
            {subtitle && (
              <p className="text-sm text-gray-400">{subtitle}</p>
            )}
          </div>

          {/* Playback rate */}
          <div className="flex items-center justify-center gap-4 py-2">
            <button
              onClick={() => seek(-5)}
              className="p-2 rounded-full hover:bg-gray-800"
            >
              <BackwardIcon className="w-5 h-5" />
              <span className="text-xs">5</span>
            </button>

            <button
              onClick={() => changePlaybackRate(-0.25)}
              className="p-2 rounded-full hover:bg-gray-800"
            >
              <MinusIcon className="w-4 h-4" />
            </button>

            <span className="text-sm font-medium w-12 text-center">
              {playbackRate.toFixed(1)}x
            </span>

            <button
              onClick={() => changePlaybackRate(0.25)}
              className="p-2 rounded-full hover:bg-gray-800"
            >
              <PlusIcon className="w-4 h-4" />
            </button>

            <button
              onClick={() => seek(10)}
              className="p-2 rounded-full hover:bg-gray-800"
            >
              <ForwardIcon className="w-5 h-5" />
              <span className="text-xs">10</span>
            </button>
          </div>
        </>
      )}

      {/* Progress bar */}
      <div className="px-4 py-2">
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1 bg-gray-700 rounded-full appearance-none audio-progress"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Play button */}
      <div className="flex items-center justify-center pb-4 safe-bottom">
        <button
          onClick={togglePlay}
          className="w-16 h-16 flex items-center justify-center bg-amber-500 rounded-full hover:bg-amber-600 transition-colors"
        >
          {isPlaying ? (
            <PauseIcon className="w-8 h-8" />
          ) : (
            <PlayIcon className="w-8 h-8 ml-1" />
          )}
        </button>
      </div>
    </div>
  );
}
