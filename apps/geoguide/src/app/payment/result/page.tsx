"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLanguage } from "@/lib/language-context";

const uiTexts: Record<string, {
  checking: string; success: string; failed: string; startTour: string; tryAgain: string;
}> = {
  ka: { checking: "გადახდა მოწმდება...", success: "გადახდა წარმატებულია!", failed: "გადახდა ვერ შესრულდა", startTour: "ტურის დაწყება", tryAgain: "თავიდან სცადე" },
  en: { checking: "Checking payment...", success: "Payment successful!", failed: "Payment failed", startTour: "Start Tour", tryAgain: "Try again" },
  ru: { checking: "Проверка оплаты...", success: "Оплата успешна!", failed: "Оплата не удалась", startTour: "Начать тур", tryAgain: "Попробовать снова" },
};

function PaymentResult() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { language } = useLanguage();
  const ui = uiTexts[language] || uiTexts.ka;
  const [status, setStatus] = useState<"checking" | "success" | "failed">("checking");
  const [tourInfo, setTourInfo] = useState<{ tourId: string; tourName: string; museumSlug: string } | null>(null);
  const orderId = searchParams.get("orderId");

  useEffect(() => {
    if (!orderId) { setStatus("failed"); return; }
    let attempts = 0;
    const check = async () => {
      try {
        const res = await fetch(`/api/payments/tbc/status?orderId=${orderId}`);
        const data = await res.json();
        if (data.tourId) setTourInfo({ tourId: data.tourId, tourName: data.tourName, museumSlug: data.museumSlug });
        if (data.status === "COMPLETED") { setStatus("success"); return; }
        if (data.status === "FAILED") { setStatus("failed"); return; }
        attempts++;
        if (attempts < 10) setTimeout(check, 3000);
        else setStatus("failed");
      } catch { attempts++; if (attempts < 10) setTimeout(check, 3000); else setStatus("failed"); }
    };
    check();
  }, [orderId]);

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
        {status === "checking" && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4" />
            <p className="text-gray-600">{ui.checking}</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-xl font-bold text-green-600 mb-2">{ui.success}</h2>
            {tourInfo && <p className="text-gray-600 mb-6">{tourInfo.tourName}</p>}
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
            <h2 className="text-xl font-bold text-red-600 mb-6">{ui.failed}</h2>
            <button onClick={() => router.back()} className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700">
              {ui.tryAgain}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function PaymentResultPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-100 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500" /></div>}>
      <PaymentResult />
    </Suspense>
  );
}
