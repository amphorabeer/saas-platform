"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLanguage } from "@/lib/language-context";
import { 
  ChevronLeftIcon, 
  CreditCardIcon, 
  CheckCircleIcon,
  ShieldCheckIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

const uiTexts: Record<string, {
  title: string;
  subtitle: string;
  tourAccess: string;
  validFor: string;
  days: string;
  price: string;
  securePayment: string;
  payWith: string;
  processing: string;
  successTitle: string;
  successMessage: string;
  startTour: string;
  errorPayment: string;
  errorGeneric: string;
  includesTitle: string;
  includes: string[];
}> = {
  ka: {
    title: "ტურის შეძენა",
    subtitle: "აუდიო გიდის წვდომა",
    tourAccess: "ტურზე წვდომა",
    validFor: "მოქმედების ვადა",
    days: "დღე",
    price: "ფასი",
    securePayment: "უსაფრთხო გადახდა",
    payWith: "გადახდა TBC-ით",
    processing: "მიმდინარეობს...",
    successTitle: "გადახდა წარმატებულია!",
    successMessage: "თქვენ შეიძინეთ ტურზე წვდომა.",
    startTour: "ტურის დაწყება",
    errorPayment: "გადახდა ვერ შესრულდა",
    errorGeneric: "შეცდომა მოხდა",
    includesTitle: "მოიცავს:",
    includes: [
      "სრული აუდიო გიდი",
      "ყველა გაჩერება",
      "ოფლაინ რეჟიმი",
      "შეუზღუდავი მოსმენა",
    ],
  },
  en: {
    title: "Purchase Tour",
    subtitle: "Audio guide access",
    tourAccess: "Tour access",
    validFor: "Valid for",
    days: "days",
    price: "Price",
    securePayment: "Secure payment",
    payWith: "Pay with TBC",
    processing: "Processing...",
    successTitle: "Payment successful!",
    successMessage: "You have purchased tour access.",
    startTour: "Start Tour",
    errorPayment: "Payment failed",
    errorGeneric: "An error occurred",
    includesTitle: "Includes:",
    includes: [
      "Full audio guide",
      "All stops",
      "Offline mode",
      "Unlimited listening",
    ],
  },
  ru: {
    title: "Купить тур",
    subtitle: "Доступ к аудиогиду",
    tourAccess: "Доступ к туру",
    validFor: "Срок действия",
    days: "дней",
    price: "Цена",
    securePayment: "Безопасная оплата",
    payWith: "Оплатить через TBC",
    processing: "Обработка...",
    successTitle: "Оплата успешна!",
    successMessage: "Вы приобрели доступ к туру.",
    startTour: "Начать тур",
    errorPayment: "Оплата не удалась",
    errorGeneric: "Произошла ошибка",
    includesTitle: "Включает:",
    includes: [
      "Полный аудиогид",
      "Все остановки",
      "Офлайн режим",
      "Неограниченное прослушивание",
    ],
  },
  uk: {
    title: "Придбати тур",
    subtitle: "Доступ до аудіогіда",
    tourAccess: "Доступ до туру",
    validFor: "Термін дії",
    days: "днів",
    price: "Ціна",
    securePayment: "Безпечна оплата",
    payWith: "Сплатити через TBC",
    processing: "Обробка...",
    successTitle: "Оплата успішна!",
    successMessage: "Ви придбали доступ до туру.",
    startTour: "Почати тур",
    errorPayment: "Оплата не вдалася",
    errorGeneric: "Сталася помилка",
    includesTitle: "Включає:",
    includes: [
      "Повний аудіогід",
      "Всі зупинки",
      "Офлайн режим",
      "Необмежене прослуховування",
    ],
  },
};

interface TourInfo {
  id: string;
  name: string;
  nameEn: string | null;
  nameRu: string | null;
  price: number;
  currency: string;
  duration: number | null;
  stopsCount: number;
  museum: {
    name: string;
    nameEn: string | null;
    nameRu: string | null;
  };
}

export default function BuyPage() {
  const params = useParams();
  const router = useRouter();
  const { language } = useLanguage();
  const [tour, setTour] = useState<TourInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ui = uiTexts[language] || uiTexts.ka;
  const validityDays = 30; // კოდის მოქმედების ვადა

  useEffect(() => {
    fetchTourInfo();
  }, [params.tourId]);

  const fetchTourInfo = async () => {
    try {
      const res = await fetch(`/api/tours/${params.tourId}`);
      if (res.ok) {
        const data = await res.json();
        setTour(data);
      }
    } catch (err) {
      console.error("Error fetching tour:", err);
    } finally {
      setLoading(false);
    }
  };

  const getTourName = () => {
    if (!tour) return "";
    if (language === "en" && tour.nameEn) return tour.nameEn;
    if (language === "ru" && tour.nameRu) return tour.nameRu;
    return tour.name;
  };

  const getMuseumName = () => {
    if (!tour) return "";
    if (language === "en" && tour.museum.nameEn) return tour.museum.nameEn;
    if (language === "ru" && tour.museum.nameRu) return tour.museum.nameRu;
    return tour.museum.name;
  };

  const handlePayment = async () => {
    if (!tour) return;

    setProcessing(true);
    setError(null);

    try {
      // Get or create device ID
      let deviceId = localStorage.getItem("geoguide_device_id");
      if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem("geoguide_device_id", deviceId);
      }

      // Create payment
      const res = await fetch("/api/payments/tbc/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tourId: params.tourId,
          museumSlug: params.slug,
          deviceId,
          amount: tour.price,
          currency: tour.currency,
          language,
        }),
      });

      const data = await res.json();

      if (res.ok && data.redirectUrl) {
        // Redirect to TBC payment page
        window.location.href = data.redirectUrl;
      } else {
        setError(data.message || ui.errorPayment);
      }
    } catch (err) {
      console.error("Payment error:", err);
      setError(ui.errorGeneric);
    } finally {
      setProcessing(false);
    }
  };

  const handleStartTour = () => {
    router.push(`/museum/${params.slug}/tour/${params.tourId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  if (!tour) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">ტური ვერ მოიძებნა</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b safe-top">
        <div className="flex items-center px-4 h-14">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100"
          >
            <ChevronLeftIcon className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold ml-2">{ui.title}</h1>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 p-4">
        <div className="max-w-md mx-auto space-y-4">
          {success ? (
            // Success State
            <div className="bg-white rounded-2xl p-8 text-center shadow-lg">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircleIcon className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-green-600 mb-2">
                {ui.successTitle}
              </h2>
              <p className="text-gray-600 mb-6">{ui.successMessage}</p>
              <button
                onClick={handleStartTour}
                className="w-full py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-colors"
              >
                {ui.startTour}
              </button>
            </div>
          ) : (
            <>
              {/* Tour Info Card */}
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <div className="text-center mb-6">
                  <p className="text-sm text-amber-600 font-medium">
                    {getMuseumName()}
                  </p>
                  <h2 className="text-xl font-bold mt-1">{getTourName()}</h2>
                </div>

                {/* Details */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-gray-500">{ui.tourAccess}</span>
                    <span className="font-medium">{tour.stopsCount} გაჩერება</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-gray-500">{ui.validFor}</span>
                    <span className="font-medium flex items-center gap-1">
                      <ClockIcon className="w-4 h-4" />
                      {validityDays} {ui.days}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-500">{ui.price}</span>
                    <span className="text-2xl font-bold text-amber-600">
                      {tour.price} {tour.currency === "GEL" ? "₾" : tour.currency}
                    </span>
                  </div>
                </div>

                {/* Includes */}
                <div className="bg-amber-50 rounded-xl p-4 mb-6">
                  <p className="font-medium text-amber-800 mb-2">{ui.includesTitle}</p>
                  <ul className="space-y-2">
                    {ui.includes.map((item, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm text-amber-700">
                        <CheckCircleIcon className="w-4 h-4 text-amber-500" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Error */}
                {error && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-xl text-center mb-4">
                    {error}
                  </div>
                )}

                {/* Pay Button */}
                <button
                  onClick={handlePayment}
                  disabled={processing}
                  className={`w-full py-4 rounded-xl font-medium text-white transition-colors flex items-center justify-center gap-2 ${
                    processing
                      ? "bg-gray-300 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {processing ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      {ui.processing}
                    </>
                  ) : (
                    <>
                      <CreditCardIcon className="w-5 h-5" />
                      {ui.payWith}
                    </>
                  )}
                </button>

                {/* Security Note */}
                <div className="flex items-center justify-center gap-2 mt-4 text-sm text-gray-500">
                  <ShieldCheckIcon className="w-4 h-4" />
                  {ui.securePayment}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
