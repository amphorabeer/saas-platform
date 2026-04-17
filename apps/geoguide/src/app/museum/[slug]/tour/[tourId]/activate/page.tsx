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
  uk: {
    title: "Активація коду",
    subtitle: "Введіть код активації або скануйте QR",
    placeholder: "GEOG-XXXX-XXXX",
    activate: "Активувати",
    activating: "Перевірка...",
    success: "Успішно!",
    successMessage: "Код активовано. Можете почати тур.",
    startTour: "Почати тур",
    errorInvalid: "Невірний код",
    errorUsed: "Код вже використано на іншому пристрої",
    errorExpired: "Код закінчився",
    errorWrongMuseum: "Код не дійсний для цього музею",
    errorGeneric: "Сталася помилка",
    scanQr: "Сканувати QR",
    orEnterCode: "або введіть код",
    scanning: "Сканування...",
    cameraError: "Не вдалося отримати доступ до камери",
    stopScanning: "Зупинити сканування",
  },
  de: {
    title: "Code aktivieren",
    subtitle: "Geben Sie Ihren Aktivierungscode ein oder scannen Sie QR",
    placeholder: "Code eingeben",
    activate: "Aktivieren",
    activating: "Überprüfung...",
    success: "Erfolg!",
    successMessage: "Code aktiviert. Sie können die Tour starten.",
    startTour: "Tour starten",
    errorInvalid: "Ungültiger Code",
    errorUsed: "Code bereits auf einem anderen Gerät verwendet",
    errorExpired: "Code abgelaufen",
    errorWrongMuseum: "Code nicht gültig für dieses Museum",
    errorGeneric: "Ein Fehler ist aufgetreten",
    scanQr: "QR scannen",
    orEnterCode: "oder Code eingeben",
    scanning: "Scannen...",
    cameraError: "Kamera nicht zugänglich",
    stopScanning: "Scannen stoppen",
  },
  fr: {
    title: "Activer le code",
    subtitle: "Entrez votre code d'activation ou scannez le QR",
    placeholder: "Entrez le code",
    activate: "Activer",
    activating: "Vérification...",
    success: "Succès!",
    successMessage: "Code activé. Vous pouvez commencer la visite.",
    startTour: "Commencer la visite",
    errorInvalid: "Code invalide",
    errorUsed: "Code déjà utilisé sur un autre appareil",
    errorExpired: "Code expiré",
    errorWrongMuseum: "Code non valide pour ce musée",
    errorGeneric: "Une erreur s'est produite",
    scanQr: "Scanner QR",
    orEnterCode: "ou entrez le code",
    scanning: "Scan en cours...",
    cameraError: "Impossible d'accéder à la caméra",
    stopScanning: "Arrêter le scan",
  },
  es: {
    title: "Activar código",
    subtitle: "Ingrese su código de activación o escanee QR",
    placeholder: "Ingrese el código",
    activate: "Activar",
    activating: "Validando...",
    success: "¡Éxito!",
    successMessage: "Código activado. Puede comenzar el tour.",
    startTour: "Iniciar tour",
    errorInvalid: "Código inválido",
    errorUsed: "Código ya utilizado en otro dispositivo",
    errorExpired: "Código expirado",
    errorWrongMuseum: "Código no válido para este museo",
    errorGeneric: "Ocurrió un error",
    scanQr: "Escanear QR",
    orEnterCode: "o ingrese el código",
    scanning: "Escaneando...",
    cameraError: "No se pudo acceder a la cámara",
    stopScanning: "Detener escaneo",
  },
  it: {
    title: "Attiva codice",
    subtitle: "Inserisci il codice di attivazione o scansiona QR",
    placeholder: "Inserisci il codice",
    activate: "Attiva",
    activating: "Verifica...",
    success: "Successo!",
    successMessage: "Codice attivato. Puoi iniziare il tour.",
    startTour: "Inizia tour",
    errorInvalid: "Codice non valido",
    errorUsed: "Codice già utilizzato su un altro dispositivo",
    errorExpired: "Codice scaduto",
    errorWrongMuseum: "Codice non valido per questo museo",
    errorGeneric: "Si è verificato un errore",
    scanQr: "Scansiona QR",
    orEnterCode: "o inserisci il codice",
    scanning: "Scansione...",
    cameraError: "Impossibile accedere alla fotocamera",
    stopScanning: "Ferma scansione",
  },
  pl: {
    title: "Aktywuj kod",
    subtitle: "Wprowadź kod aktywacyjny lub zeskanuj QR",
    placeholder: "Wprowadź kod",
    activate: "Aktywuj",
    activating: "Sprawdzanie...",
    success: "Sukces!",
    successMessage: "Kod aktywowany. Możesz rozpocząć wycieczkę.",
    startTour: "Rozpocznij wycieczkę",
    errorInvalid: "Nieprawidłowy kod",
    errorUsed: "Kod już użyty na innym urządzeniu",
    errorExpired: "Kod wygasł",
    errorWrongMuseum: "Kod nie jest ważny dla tego muzeum",
    errorGeneric: "Wystąpił błąd",
    scanQr: "Skanuj QR",
    orEnterCode: "lub wprowadź kod",
    scanning: "Skanowanie...",
    cameraError: "Nie można uzyskać dostępu do kamery",
    stopScanning: "Zatrzymaj skanowanie",
  },
  tr: {
    title: "Kodu Etkinleştir",
    subtitle: "Aktivasyon kodunuzu girin veya QR tarayın",
    placeholder: "Kodu girin",
    activate: "Etkinleştir",
    activating: "Doğrulanıyor...",
    success: "Başarılı!",
    successMessage: "Kod etkinleştirildi. Tura başlayabilirsiniz.",
    startTour: "Turu Başlat",
    errorInvalid: "Geçersiz kod",
    errorUsed: "Kod başka bir cihazda zaten kullanılmış",
    errorExpired: "Kodun süresi dolmuş",
    errorWrongMuseum: "Kod bu müze için geçerli değil",
    errorGeneric: "Bir hata oluştu",
    scanQr: "QR Tara",
    orEnterCode: "veya kodu girin",
    scanning: "Taranıyor...",
    cameraError: "Kameraya erişilemedi",
    stopScanning: "Taramayı Durdur",
  },
  az: {
    title: "Kodu Aktivləşdir",
    subtitle: "Aktivasiya kodunuzu daxil edin və ya QR skan edin",
    placeholder: "Kodu daxil edin",
    activate: "Aktivləşdir",
    activating: "Yoxlanılır...",
    success: "Uğurlu!",
    successMessage: "Kod aktivləşdirildi. Tura başlaya bilərsiniz.",
    startTour: "Turu Başla",
    errorInvalid: "Yanlış kod",
    errorUsed: "Kod artıq başqa cihazda istifadə edilib",
    errorExpired: "Kodun müddəti bitib",
    errorWrongMuseum: "Kod bu muzey üçün keçərli deyil",
    errorGeneric: "Xəta baş verdi",
    scanQr: "QR Skan",
    orEnterCode: "və ya kodu daxil edin",
    scanning: "Skan edilir...",
    cameraError: "Kameraya giriş mümkün olmadı",
    stopScanning: "Skanı Dayandır",
  },
  hy: {
    title: "Ակտիվացնել կոդը",
    subtitle: "Մուտքագրեք ակտիվացման կոդը կամ սկանավորեք QR",
    placeholder: "Մուտքագրեք կոդը",
    activate: "Ակտիվացնել",
    activating: "Ստուգում...",
    success: "Հաջողություն!",
    successMessage: "Կոդը ակտիվացված է։ Կարող եք սկսել տուրը։",
    startTour: "Սկսել տուրը",
    errorInvalid: "Անվավեր կոդ",
    errorUsed: "Կոդն արդեն օգտագործվել է այլ սարքից",
    errorExpired: "Կոդի ժամկետը լրացել է",
    errorWrongMuseum: "Կոդը վավեր չէ այս թանգարանի համար",
    errorGeneric: "Տեղի է ունեցել սխալ",
    scanQr: "Սկանավորել QR",
    orEnterCode: "կամ մուտքագրեք կոդը",
    scanning: "Սկանավորում...",
    cameraError: "Չհաջողվեց մուտք գործել տեսախցիկ",
    stopScanning: "Կանգնեցնել սկանավորումը",
  },
  he: {
    title: "הפעל קוד",
    subtitle: "הזן את קוד ההפעלה או סרוק QR",
    placeholder: "הזן קוד",
    activate: "הפעל",
    activating: "מאמת...",
    success: "הצלחה!",
    successMessage: "הקוד הופעל. אתה יכול להתחיל את הסיור.",
    startTour: "התחל סיור",
    errorInvalid: "קוד לא תקין",
    errorUsed: "הקוד כבר נעשה בו שימוש במכשיר אחר",
    errorExpired: "תוקף הקוד פג",
    errorWrongMuseum: "הקוד לא תקף למוזיאון זה",
    errorGeneric: "אירעה שגיאה",
    scanQr: "סרוק QR",
    orEnterCode: "או הזן קוד",
    scanning: "סורק...",
    cameraError: "לא ניתן לגשת למצלמה",
    stopScanning: "עצור סריקה",
  },
  ar: {
    title: "تفعيل الرمز",
    subtitle: "أدخل رمز التفعيل أو امسح QR",
    placeholder: "أدخل الرمز",
    activate: "تفعيل",
    activating: "جاري التحقق...",
    success: "نجاح!",
    successMessage: "تم تفعيل الرمز. يمكنك بدء الجولة.",
    startTour: "ابدأ الجولة",
    errorInvalid: "رمز غير صالح",
    errorUsed: "الرمز مستخدم بالفعل على جهاز آخر",
    errorExpired: "انتهت صلاحية الرمز",
    errorWrongMuseum: "الرمز غير صالح لهذا المتحف",
    errorGeneric: "حدث خطأ",
    scanQr: "مسح QR",
    orEnterCode: "أو أدخل الرمز",
    scanning: "جاري المسح...",
    cameraError: "تعذر الوصول إلى الكاميرا",
    stopScanning: "إيقاف المسح",
  },
  ko: {
    title: "코드 활성화",
    subtitle: "활성화 코드를 입력하거나 QR을 스캔하세요",
    placeholder: "코드 입력",
    activate: "활성화",
    activating: "확인 중...",
    success: "성공!",
    successMessage: "코드가 활성화되었습니다. 투어를 시작할 수 있습니다.",
    startTour: "투어 시작",
    errorInvalid: "잘못된 코드",
    errorUsed: "다른 기기에서 이미 사용된 코드입니다",
    errorExpired: "코드가 만료되었습니다",
    errorWrongMuseum: "이 박물관에 유효하지 않은 코드입니다",
    errorGeneric: "오류가 발생했습니다",
    scanQr: "QR 스캔",
    orEnterCode: "또는 코드 입력",
    scanning: "스캔 중...",
    cameraError: "카메라에 접근할 수 없습니다",
    stopScanning: "스캔 중지",
  },
  ja: {
    title: "コードを有効化",
    subtitle: "アクティベーションコードを入力するかQRをスキャンしてください",
    placeholder: "コードを入力",
    activate: "有効化",
    activating: "確認中...",
    success: "成功！",
    successMessage: "コードが有効化されました。ツアーを開始できます。",
    startTour: "ツアーを開始",
    errorInvalid: "無効なコード",
    errorUsed: "コードは別のデバイスで既に使用されています",
    errorExpired: "コードの有効期限が切れています",
    errorWrongMuseum: "このコードはこの博物館では有効ではありません",
    errorGeneric: "エラーが発生しました",
    scanQr: "QRをスキャン",
    orEnterCode: "またはコードを入力",
    scanning: "スキャン中...",
    cameraError: "カメラにアクセスできませんでした",
    stopScanning: "スキャンを停止",
  },
  zh: {
    title: "激活代码",
    subtitle: "输入激活码或扫描二维码",
    placeholder: "输入代码",
    activate: "激活",
    activating: "验证中...",
    success: "成功！",
    successMessage: "代码已激活。您可以开始游览了。",
    startTour: "开始游览",
    errorInvalid: "无效代码",
    errorUsed: "代码已在其他设备上使用",
    errorExpired: "代码已过期",
    errorWrongMuseum: "代码对此博物馆无效",
    errorGeneric: "发生错误",
    scanQr: "扫描二维码",
    orEnterCode: "或输入代码",
    scanning: "扫描中...",
    cameraError: "无法访问相机",
    stopScanning: "停止扫描",
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
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9-]/g, "");

    // If it starts with GEOG, format as GEOG-XXXX-XXXX
    if (cleaned.replace(/-/g, "").startsWith("GEOG")) {
      const chars = cleaned.replace(/-/g, "");
      let formatted = "";
      if (chars.length > 0) {
        formatted = chars.slice(0, 4);
      }
      if (chars.length > 4) {
        formatted += "-" + chars.slice(4, 8);
      }
      if (chars.length > 8) {
        formatted += "-" + chars.slice(8, 12);
      }
      return formatted;
    }

    // For other codes (like GOOGLETEST26), allow up to 20 characters without formatting
    return cleaned.replace(/-/g, "").slice(0, 20);
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCode(e.target.value);
    setCode(formatted);
    setError(null);
  };

  const handleActivate = async (codeToActivate?: string) => {
    const activationCode = codeToActivate || code;

    // GEOG codes are 14 chars, others minimum 4
    const minLength = activationCode.startsWith("GEOG") ? 14 : 4;
    if (activationCode.length < minLength) {
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
                  maxLength={20}
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
                  disabled={loading || code.length < 4}
                  className={`w-full py-4 rounded-xl font-medium text-white transition-colors ${
                    loading || code.length < 4
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