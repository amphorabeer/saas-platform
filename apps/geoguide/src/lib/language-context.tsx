"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Language, LANGUAGES } from "./types";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (ka: string, en?: string | null) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("ka");

  useEffect(() => {
    const saved = localStorage.getItem("geoguide-language") as Language;
    if (saved && LANGUAGES.find((l) => l.code === saved)) {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("geoguide-language", lang);
  };

  const t = (ka: string, en?: string | null): string => {
    if (language === "ka" || !en) return ka;
    return en;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
