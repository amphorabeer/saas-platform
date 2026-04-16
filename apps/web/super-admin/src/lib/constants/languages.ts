export const SUPPORTED_TRANSLATION_LANGUAGES = [
  { code: "en", labelKa: "ინგლისური", labelEn: "English" },
  { code: "ru", labelKa: "რუსული", labelEn: "Russian" },
  { code: "de", labelKa: "გერმანული", labelEn: "German" },
  { code: "fr", labelKa: "ფრანგული", labelEn: "French" },
  { code: "uk", labelKa: "უკრაინული", labelEn: "Ukrainian" },
  { code: "es", labelKa: "ესპანური", labelEn: "Spanish" },
  { code: "it", labelKa: "იტალიური", labelEn: "Italian" },
  { code: "pl", labelKa: "პოლონური", labelEn: "Polish" },
  { code: "tr", labelKa: "თურქული", labelEn: "Turkish" },
  { code: "az", labelKa: "აზერბაიჯანული", labelEn: "Azerbaijani" },
  { code: "hy", labelKa: "სომხური", labelEn: "Armenian" },
  { code: "he", labelKa: "ებრაული", labelEn: "Hebrew" },
  { code: "ar", labelKa: "არაბული", labelEn: "Arabic" },
  { code: "ko", labelKa: "კორეული", labelEn: "Korean" },
  { code: "ja", labelKa: "იაპონური", labelEn: "Japanese" },
  { code: "zh", labelKa: "ჩინური", labelEn: "Chinese" },
] as const;

// Helper to get field suffix from code (en -> En, zh -> Zh)
export const getFieldSuffix = (code: string) =>
  code.charAt(0).toUpperCase() + code.slice(1);
