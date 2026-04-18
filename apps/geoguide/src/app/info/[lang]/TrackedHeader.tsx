"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { trackLanguageSwitch } from "@/lib/analytics";
import { INFO_LANGS, INFO_LANG_FLAGS, type InfoLang } from "../types";

type Props = {
  currentLang: InfoLang;
};

export function TrackedHeader({ currentLang }: Props) {
  const pathname = usePathname();

  const handleLangClick = (toLang: InfoLang) => {
    if (toLang === currentLang) return;
    trackLanguageSwitch({
      from_language: currentLang,
      to_language: toLang,
      current_page: pathname,
    });
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 text-[#E67E22] font-bold text-xl">
          <span className="text-2xl">🎧</span>
          <span>GeoGuide</span>
        </Link>
        <nav className="flex items-center gap-2 flex-wrap justify-end">
          {INFO_LANGS.map((l) => (
            <Link
              key={l}
              href={`/info/${l}`}
              onClick={() => handleLangClick(l)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                l === currentLang
                  ? "bg-[#E67E22] text-white border-[#E67E22]"
                  : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-orange-50 hover:border-[#E67E22]"
              }`}
            >
              {INFO_LANG_FLAGS[l]} {l.toUpperCase()}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
