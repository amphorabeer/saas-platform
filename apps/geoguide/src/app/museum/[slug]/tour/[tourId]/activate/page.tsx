"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLanguage } from "@/lib/language-context";
import { 
  ChevronLeftIcon, 
  KeyIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  QrCodeIcon,
  XMarkIcon 
} from "@heroicons/react/24/outline";

const uiTexts: Record<string, {
  title: string;
  subtitle: string;
  placeholder: string;
  activate: string;
  activating: string;
  success: string;
  successMessage: string;
  startTour: string;
  errorInvalid: string;
  errorUsed: string;
  errorExpired: string;
  errorWrongMuseum: string;
  errorGeneric: string;
  scanQr: string;
  orEnterCode: string;
  scanning: string;
  cameraError: string;
  stopScanning: string;
}> = {
  ka: {
    title: "კოდის აქტივაცია",
    subtitle: "შეიყვანეთ აქტივაციის კოდი ან დაასკანერეთ QR",
    placeholder: "GEOG-XXXX-XXXX",
    activate: "აქტივაცია",
    activating: "მოწმდება...",
    success: "წარმატება!",
    successMessage: "კოდი გააქტიურდა. შეგიძლიათ დაიწყოთ ტური.",
    startTour: "ტურის დაწყება",
    errorInvalid: "კოდი არასწორია",
    errorUsed: "კოდი უკვე გამოყენებულია სხვა მოწყობილობაზე",
    errorExpired: "კოდის ვადა გასულია",
    errorWrongMuseum: "კოდი არ ეკუთვნის ამ მუზეუმს",
    errorGeneric: "შეცდომა მოხდა",
    scanQr: "QR სკანირება",
    orEnterCode: "ან შეიყვანეთ კოდი",
    scanning: "მიმდინარეობს სკანირება...",
    cameraError: "კამერაზე წვდომა ვერ მოხერხდა",
    stopScanning: "სკანირების გაჩერება",
  },
  en: {
    title: "Activate Code",
    subtitle: "Enter your activation code or scan QR",
    placeholder: "GEOG-XXXX-XXXX",
    activate: "Activate",
    activating: "Validating...",
    success: "Success!",
    successMessage: "Code activated. You can start the tour.",
    startTour: "Start Tour",
    errorInvalid: "Invalid code",
    errorUsed: "Code already used on another device",
    errorExpired: "Code expired",
    errorWrongMuseum: "Code not valid for this museum",
    errorGeneric: "An error occurred",
    scanQr: "Scan QR",
    orEnterCode: "or enter code",
    scanning: "Scanning...",
    cameraError: "Could not access camera",
    stopScanning: "Stop scanning",
  },
  ru: {
    title: "Активация кода",
    subtitle: "Введите код активации или сканируйте QR",
    placeholder: "GEOG-XXXX-XXXX",
    activate: "Активировать",
    activating: "Проверка...",
    success: "Успешно!",
    successMessage: "Код активирован. Можете начать тур.",
    startTour: "Начать тур",
    errorInvalid: "Неверный код",
    errorUsed: "Код уже использован на другом устройстве",
    errorExpired: "Код истёк",
    errorWrongMuseum: "Код не действителен для этого музея",
    errorGeneric: "Произошла ошибка",
    scanQr: "Сканировать QR",
    orEnterCode: "или введите код",
    scanning: "Сканирование...",
    cameraError: "Не удалось получить доступ к камере",
    stopScanning: "Остановить сканирование",
  },
};

export default function ActivatePage() {
  const params = useParams();
  const router = useRouter();
  const { language } = useLanguage();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // QR Scanner states
  const [showScanner, setShowScanner] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const scannerRef = useRef<any>(null);
  const scannerContainerId = "qr-reader";

  const ui = uiTexts[language] || uiTexts.ka;

  // Check if already has access on page load
  useEffect(() => {
    const checkExistingAccess = () => {
      try {
        const entitlements = JSON.parse(localStorage.getItem("geoguide_entitlements") || "[]");
        const tourEntitlement = entitlements.find(
          (e: { tourId: string; expiresAt: string }) => 
            e.tourId === params.tourId && new Date(e.expiresAt) > new Date()
        );
        
        if (tourEntitlement) {
          router.replace(`/museum/${params.slug}/tour/${params.tourId}`);
          return;
        }
      } catch (err) {
        console.error("Error checking access:", err);
      }
      setCheckingAccess(false);
    };
    
    checkExistingAccess();
  }, [params.tourId, params.slug, router]);

  // Initialize QR Scanner
  useEffect(() => {
    if (showScanner && !scannerRef.current) {
      initScanner();
    }
    
    return () => {
      stopScanner();
    };
  }, [showScanner]);

  const initScanner = async () => {
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      
      const scanner = new Html5Qrcode(scannerContainerId);
      scannerRef.current = scanner;
      
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // QR code scanned successfully
          handleQrResult(decodedText);
        },
        (errorMessage) => {
          // Ignore scan errors (no QR found)
        }
      );
    } catch (err) {
      console.error("Scanner error:", err);
      setScannerError(ui.cameraError);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
  };

  const handleQrResult = (result: string) => {
    // Stop scanner first
    stopScanner();
    setShowScanner(false);
    
    // Extract code from QR result
    // QR might contain just the code or a URL with the code
    let extractedCode = result;
    
    // If it's a URL, try to extract code parameter
    if (result.includes("code=")) {
      const url = new URL(result);
      extractedCode = url.searchParams.get("code") || result;
    } else if (result.includes("/activate/")) {
      // URL format: .../activate/GEOG-XXXX-XXXX
      const parts = result.split("/activate/");
      if (parts[1]) {
        extractedCode = parts[1].split("?")[0];
      }
    }
    
    // Format and set the code
    const formatted = formatCode(extractedCode);
    setCode(formatted);
    
    // Auto-activate if code looks valid
    if (formatted.length === 14) {
      setTimeout(() => {
        handleActivate(formatted);
      }, 500);
    }
  };

  const formatCode = (value: string) => {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    
    let formatted = "";
    if (cleaned.length > 0) {
      formatted = cleaned.slice(0, 4);
    }
    if (cleaned.length > 4) {
      formatted += "-" + cleaned.slice(4, 8);
    }
    if (cleaned.length > 8) {
      formatted += "-" + cleaned.slice(8, 12);
    }
    
    return formatted;
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCode(e.target.value);
    setCode(formatted);
    setError(null);
  };

  const handleActivate = async (codeToActivate?: string) => {
    const activationCode = codeToActivate || code;
    
    if (activationCode.length < 14) {
      setError(ui.errorInvalid);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let deviceId = localStorage.getItem("geoguide_device_id");
      if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem("geoguide_device_id", deviceId);
      }

      const res = await fetch("/api/codes/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: activationCode,
          deviceId: deviceId,
          tourId: params.tourId,
          museumSlug: params.slug,
        }),
      });

      const data = await res.json();

      if (res.ok || data.success) {
        setSuccess(true);
        
        const entitlements = JSON.parse(localStorage.getItem("geoguide_entitlements") || "[]");
        const filteredEntitlements = entitlements.filter(
          (e: { tourId: string }) => e.tourId !== params.tourId
        );
        
        filteredEntitlements.push({
          tourId: params.tourId,
          museumSlug: params.slug,
          code: activationCode,
          activatedAt: new Date().toISOString(),
          expiresAt: data.expiresAt,
        });
        
        localStorage.setItem("geoguide_entitlements", JSON.stringify(filteredEntitlements));
      } else {
        switch (data.error) {
          case "INVALID_CODE":
            setError(ui.errorInvalid);
            break;
          case "CODE_USED":
            setError(ui.errorUsed);
            break;
          case "CODE_EXPIRED":
            setError(ui.errorExpired);
            break;
          case "WRONG_MUSEUM":
            setError(ui.errorWrongMuseum);
            break;
          default:
            setError(data.message || ui.errorGeneric);
        }
      }
    } catch (err) {
      console.error("Activation error:", err);
      setError(ui.errorGeneric);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTour = () => {
    router.push(`/museum/${params.slug}/tour/${params.tourId}`);
  };

  const toggleScanner = () => {
    if (showScanner) {
      stopScanner();
    }
    setShowScanner(!showScanner);
    setScannerError(null);
  };

  if (checkingAccess) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
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
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {success ? (
            // Success State
            <div className="bg-white rounded-2xl p-8 text-center shadow-lg">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircleIcon className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-green-600 mb-2">{ui.success}</h2>
              <p className="text-gray-600 mb-6">{ui.successMessage}</p>
              <button
                onClick={handleStartTour}
                className="w-full py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-colors"
              >
                {ui.startTour}
              </button>
            </div>
          ) : (
            // Input State
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              {/* QR Scanner */}
              {showScanner ? (
                <div className="space-y-4">
                  <div className="relative">
                    <div 
                      id={scannerContainerId} 
                      className="w-full rounded-xl overflow-hidden"
                    />
                    {scannerError && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-xl">
                        <p className="text-red-500 text-center px-4">{scannerError}</p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={toggleScanner}
                    className="w-full py-3 border-2 border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <XMarkIcon className="w-5 h-5" />
                    {ui.stopScanning}
                  </button>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-sm text-gray-400">{ui.orEnterCode}</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                </div>
              ) : (
                <>
                  {/* QR Scan Button */}
                  <button
                    onClick={toggleScanner}
                    className="w-full py-4 mb-4 border-2 border-amber-500 rounded-xl font-medium text-amber-600 hover:bg-amber-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <QrCodeIcon className="w-6 h-6" />
                    {ui.scanQr}
                  </button>
                  
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-sm text-gray-400">{ui.orEnterCode}</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                </>
              )}

              {/* Manual Code Input */}
              <div className="space-y-4">
                <input
                  type="text"
                  value={code}
                  onChange={handleCodeChange}
                  placeholder={ui.placeholder}
                  className={`w-full px-4 py-4 text-center text-xl font-mono tracking-wider border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                    error ? "border-red-300 bg-red-50" : "border-gray-200"
                  }`}
                  maxLength={14}
                  autoComplete="off"
                  autoCapitalize="characters"
                />

                {error && (
                  <div className="flex items-center gap-2 text-red-600 text-sm justify-center">
                    <XCircleIcon className="w-5 h-5" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  onClick={() => handleActivate()}
                  disabled={loading || code.length < 14}
                  className={`w-full py-4 rounded-xl font-medium text-white transition-colors ${
                    loading || code.length < 14
                      ? "bg-gray-300 cursor-not-allowed"
                      : "bg-amber-500 hover:bg-amber-600"
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
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
                      {ui.activating}
                    </span>
                  ) : (
                    ui.activate
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}