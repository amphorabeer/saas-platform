"use client";

import Link from "next/link";
import Image from "next/image";
import { trackMuseumClick } from "@/lib/analytics";
import {
  LANG_FLAGS,
  type InfoLang,
  type MuseumForInfo,
  getMuseumLanguages,
  getMuseumName,
  getMuseumCity,
  getPriceRange,
  formatPrice,
} from "../types";

type Props = {
  museum: MuseumForInfo;
  lang: InfoLang;
  languagesLabel: string;
};

export function MuseumCard({ museum, lang, languagesLabel }: Props) {
  const langs = getMuseumLanguages(museum);
  const priceRange = getPriceRange(museum);

  const handleClick = () => {
    trackMuseumClick({
      museum_slug: museum.slug,
      museum_name: getMuseumName(museum, lang),
      page_language: lang,
      source: "info_page",
    });
  };

  return (
    <Link
      href={`/museum/${museum.slug}`}
      onClick={handleClick}
      className="group bg-white border border-gray-200 rounded-xl overflow-hidden transition-all hover:border-[#E67E22] hover:-translate-y-1 hover:shadow-xl"
    >
      {museum.coverImage && (
        <div className="relative aspect-[16/10] bg-gray-100 overflow-hidden">
          <Image
            src={museum.coverImage}
            alt={getMuseumName(museum, lang)}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform group-hover:scale-105"
          />
        </div>
      )}
      <div className="p-5">
        <h3 className="font-semibold text-gray-900 mb-1.5 group-hover:text-[#E67E22] transition-colors">
          {getMuseumName(museum, lang)}
        </h3>
        {getMuseumCity(museum, lang) && (
          <p className="text-xs text-gray-500 mb-3 flex items-center gap-1">
            <span>📍</span>
            <span>{getMuseumCity(museum, lang)}</span>
          </p>
        )}
        {priceRange && (
          <div className="inline-block bg-[#FDF4E8] text-[#D35400] px-2.5 py-1 rounded-md text-xs font-semibold mb-3">
            {formatPrice(priceRange, lang)}
          </div>
        )}
        {langs.length > 0 && (
          <div>
            <div className="text-xs text-gray-500 mb-1.5">{languagesLabel}</div>
            <div className="flex flex-wrap gap-1 text-base">
              {langs.map((l) => (
                <span key={l} title={l}>
                  {LANG_FLAGS[l]}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
