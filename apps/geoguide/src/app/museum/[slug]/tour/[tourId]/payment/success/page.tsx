"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/lib/language-context";
import { CheckCircleIcon } from "@heroicons/react/24/outline";

const uiTexts: Record<string, {
  title: string;
  message: string;
  startTour: string;
  processing: string;
}> = {
  ka: {
    title: "გადახდა წარმატებულია!",
    message: "თქვენ შეიძინეთ ტურზე წვდომა. შეგიძლიათ დაიწყოთ ტური.",
    startTour: "ტურის დაწყება",
    processing: "მიმდინარეობს დამუშავება...",
  },
  en: {
    title: "Payment Successful!",
    message: "You have purchased tour access. You can start the tour.",
    startTour: "Start Tour",
    processing: "Processing...",
  },
  ru: {
    title: "Оплата успешна!",
    message: "Вы приобрели доступ к туру. Можете начать тур.",
    startTour: "Начать тур",
    processing: "Обработка...",
  },
};

export default function PaymentSuccessPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language } = useLanguage();
  const [processing, setProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ui = uiTexts[language] || uiTexts.ka;
  const orderId = searchParams.get("orderId");

  useEffect(() => {
    if (orderId) {
      confirmPayment();
    } else {
      setProcessing(false);
    }
  }, [orderId]);

  const confirmPayment = async () => {
    try {
      // Get device ID
      const deviceId = localStorage.getItem("geoguide_device_id");

      // Confirm payment and get entitlement
      const res = await fetch("/api/payments/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          deviceId,
          tourId: params.tourId,
          museumSlug: params.slug,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Save entitlement locally
        const entitlements = JSON.parse(localStorage.getItem("geoguide_entitlements") || "[]");
        const filteredEntitlements = entitlements.filter(
          (e: { tourId: string }) => e.tourId !== params.tourId
        );
        
        filteredEntitlements.push({
          tourId: params.tourId,
          museumSlug: params.slug,
          orderId: orderId,
          activatedAt: new Date().toISOString(),
          expiresAt: data.expiresAt,
        });
        
        localStorage.setItem("geoguide_entitlements", JSON.stringify(filteredEntitlements));
      }
    } catch (err) {
      console.error("Confirm payment error:", err);
    } finally {
      setProcessing(false);
    }
  };

  const handleStartTour = () => {
    router.push(`/museum/${params.slug}/tour/${params.tourId}`);
  };

  if (processing) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto mb-4" />
          <p className="text-gray-600">{ui.processing}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 text-center shadow-lg max-w-sm w-full">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircleIcon className="w-12 h-12 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-green-600 mb-3">{ui.title}</h1>
        <p className="text-gray-600 mb-8">{ui.message}</p>
        <button
          onClick={handleStartTour}
          className="w-full py-4 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-colors"
        >
          {ui.startTour}
        </button>
      </div>
    </div>
  );
}
