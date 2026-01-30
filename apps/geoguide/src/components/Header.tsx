"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import { useLanguage } from "@/lib/language-context";
import { LANGUAGES } from "@/lib/types";

interface HeaderProps {
  title: string;
  showBack?: boolean;
  backUrl?: string;
}

export function Header({ title, showBack = false, backUrl }: HeaderProps) {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const [showLangMenu, setShowLangMenu] = useState(false);

  const currentLang = LANGUAGES.find((l) => l.code === language);

  return (
    <header className="sticky top-0 z-50 bg-white border-b safe-top">
      <div className="flex items-center justify-between px-4 h-14">
        {/* Left - Back button */}
        <div className="w-12">
          {showBack && (
            <button
              onClick={() => (backUrl ? router.push(backUrl) : router.back())}
              className="p-2 -ml-2 rounded-full hover:bg-gray-100"
            >
              <ChevronLeftIcon className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Center - Title */}
        <h1 className="text-lg font-semibold truncate">{title}</h1>

        {/* Right - Language selector */}
        <div className="relative w-12">
          <button
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="flex items-center gap-1 px-2 py-1 text-sm rounded-lg hover:bg-gray-100"
          >
            <span>{currentLang?.flag}</span>
            <span className="uppercase">{language}</span>
          </button>

          {showLangMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowLangMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-50 py-1 min-w-[150px]">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code);
                      setShowLangMenu(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100 ${
                      language === lang.code ? "bg-amber-50 text-amber-600" : ""
                    }`}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
