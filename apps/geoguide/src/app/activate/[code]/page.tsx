"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLanguage } from "@/lib/language-context";

const uiTexts: Record<string, {
  activating: string; success: string; failed: string; startTour: string;
  invalidCode: string; alreadyUsed: string; expired: string; tryManual: string;
}> = {
  ka: { activating: "კოდი აქტივირდება...", success: "კოდი გააქტიურებულია!", failed: "კოდის აქტივაცია ვერ მოხერხდა", invalidCode: "არასწორი კოდი", alreadyUsed: "ეს კოდი უკვე გამოყენებულია", expired: "კოდის ვადა ამოწურულია", startTour: "ტურის დაწყება", tryManual: "ხელით შეყვანა" },
  en: { activating: "Activating code...", success: "Code activated!", failed: "Code activation failed", invalidCode: "Invalid code", alreadyUsed: "This code has already been used", expired: "This code has expired", startTour: "Start Tour", tryManual: "Enter manually" },
  ru: { activating: "Активация кода...", success: "Код активирован!", failed: "Не удалось активировать код", invalidCode: "Неверный код", alreadyUsed: "Этот код уже использован", expired: "Срок действия кода истёк", startTour: "Начать тур", tryManual: "Ввести вручную" },
};

function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("geoguide_device_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("geoguide_device_id", id);
  }
  return id;
}

function ActivateCode() {
  const params = useParams();
  const router = useRouter();
  const { language } = useLanguage();
  const ui = uiTexts[language] || uiTexts.ka;

  const [status, setStatus] = useState<"activating" | "success" | "failed">("activating");
  const [errorMessage, setErrorMessage] = useState("");
  const [tourInfo, setTourInfo] = useState<{ tourId: string; museumSlug: string } | null>(null);

  const code = decodeURIComponent(params.code as string);

  useEffect(() => {
    const activate = async () => {
      const deviceId = getDeviceId();
      if (!deviceId || !code) {
        setStatus("failed");
        setErrorMessage(ui.invalidCode);
        return;
      }

      try {
        const res = await fetch("/api/codes/redeem", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, deviceId }),
        });

        const data = await res.json();

        if (res.ok) {
          setStatus("success");
          // Save entitlement locally
          if (data.tourId) {
            const entitlements = JSON.parse(localStorage.getItem("geoguide_entitlements") || "[]");
            entitlements.push({
              tourId: data.tourId,
              expiresAt: data.expiresAt,
              activatedAt: new Date().toISOString(),
            });
            localStorage.setItem("geoguide_entitlements", JSON.stringify(entitlements));
          }
          if (data.tourId && data.museumSlug) {
            setTourInfo({ tourId: data.tourId, museumSlug: data.museumSlug });
          } else if (data.tourId) {
            setTourInfo({ tourId: data.tourId, museumSlug: "" });
          }
        } else {
          setStatus("failed");
          if (data.error === "ALREADY_REDEEMED") setErrorMessage(ui.alreadyUsed);
          else if (data.error === "EXPIRED") setErrorMessage(ui.expired);
          else if (data.error === "NOT_FOUND") setErrorMessage(ui.invalidCode);
          else setErrorMessage(data.message || ui.failed);
        }
      } catch {
        setStatus("failed");
        setErrorMessage(ui.failed);
      }
    };

    activate();
  }, [code]);

  const goToTour = () => {
    if (tourInfo?.museumSlug && tourInfo?.tourId) {
      router.push(`/museum/${tourInfo.museumSlug}/tour/${tourInfo.tourId}`);
    } else {
      router.push("/");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 text-center shadow-lg max-w-md w-full">
        {status === "activating" && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4" />
            <p className="text-gray-600">{ui.activating}</p>
            <p className="text-sm text-gray-400 mt-2 font-mono">{code}</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-xl font-bold text-green-600 mb-6">{ui.success}</h2>
            <button onClick={goToTour} className="w-full py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600">
              {ui.startTour}
            </button>
          </>
        )}
        {status === "failed" && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </div>
            <h2 className="text-xl font-bold text-red-600 mb-2">{ui.failed}</h2>
            <p className="text-gray-500 mb-6">{errorMessage}</p>
            <p className="text-sm text-gray-400 mb-4 font-mono">{code}</p>
            <button onClick={() => router.push("/")} className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700">
              {ui.tryManual}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function ActivateCodePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-100 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500" /></div>}>
      <ActivateCode />
    </Suspense>
  );
}
