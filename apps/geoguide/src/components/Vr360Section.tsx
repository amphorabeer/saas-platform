"use client";

import { useState, useEffect } from "react";
import { VrViewer } from "./VrViewer";
import { useLanguage } from "@/lib/language-context";

interface Vr360SectionProps {
  museum: {
    id: string;
    vrTourId: string | null;
    vr360IsFree: boolean;
    vr360Price: number | null;
    vr360BundleWithAudio: boolean;
    show360View: boolean;
  };
}

export function Vr360Section({ museum }: Vr360SectionProps) {
  const { language } = useLanguage();
  const [hasAccess, setHasAccess] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkAccess();
  }, [museum.id]);

  const checkAccess = async () => {
    if (museum.vr360IsFree) {
      setHasAccess(true);
      setChecking(false);
      return;
    }

    try {
      const deviceId = localStorage.getItem("geoguide_device_id");
      if (!deviceId) {
        setHasAccess(false);
        setChecking(false);
        return;
      }

      // Check VR-specific entitlement
      const res = await fetch(
        `/api/entitlements/check?deviceId=${deviceId}&type=vr360&museumId=${museum.id}`
      );
      const data = await res.json();

      if (data.hasAccess) {
        setHasAccess(true);
      } else if (museum.vr360BundleWithAudio) {
        // Check if user has any audio tour entitlement for this museum
        const audioRes = await fetch(
          `/api/entitlements/check?deviceId=${deviceId}&museumId=${museum.id}`
        );
        const audioData = await audioRes.json();
        setHasAccess(audioData.hasAccess);
      }
    } catch (err) {
      console.error("Error checking VR access:", err);
    } finally {
      setChecking(false);
    }
  };

  if (checking) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500" />
      </div>
    );
  }

  if (!museum.vrTourId) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>360° ტური მალე დაემატება</p>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="text-6xl">🥽</div>
        <h3 className="text-lg font-bold">360° ვირტუალური ტური</h3>
        <p className="text-gray-500 text-sm">იხილეთ მუზეუმი 360° ხედით</p>
        {museum.vr360Price && (
          <p className="text-2xl font-bold text-amber-600">
            {museum.vr360Price} ₾
          </p>
        )}
        {museum.vr360BundleWithAudio && (
          <p className="text-xs text-gray-400">
            ან შეიძინეთ აუდიო გიდი და მიიღეთ 360° ხედიც
          </p>
        )}
        <button
          onClick={() => {
            window.location.href = `/museum/${museum.id}/buy-vr`;
          }}
          className="bg-amber-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-amber-600 transition-colors"
        >
          შეძენა
        </button>
      </div>
    );
  }

  return <VrViewer tourId={museum.vrTourId} language={language} />;
}
