import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  INFO_LANGS,
  LANG_FLAGS,
  type InfoLang,
  type MuseumLang,
  type MuseumForInfo,
} from "../types";
import { MuseumCard } from "./MuseumCard";
import { TrackedHeader } from "./TrackedHeader";
import { TrackedCTA } from "./TrackedCTA";
import { TrackedFAQ } from "./TrackedFAQ";

import enMessages from "../messages/en.json";
import ruMessages from "../messages/ru.json";
import plMessages from "../messages/pl.json";
import kaMessages from "../messages/ka.json";

const MESSAGES = {
  en: enMessages,
  ru: ruMessages,
  pl: plMessages,
  ka: kaMessages,
} as const;

const INFO_TO_MUSEUM_LANG: Record<InfoLang, MuseumLang> = {
  en: "en",
  ru: "ru",
  pl: "pl",
  ka: "ka",
};

export async function generateStaticParams() {
  return INFO_LANGS.map((lang) => ({ lang }));
}

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: { lang: string };
}): Promise<Metadata> {
  const { lang } = params;

  if (!INFO_LANGS.includes(lang as InfoLang)) {
    return {};
  }

  const m = MESSAGES[lang as InfoLang];
  const baseUrl = "https://www.geoguide.ge";

  return {
    title: m.meta.title,
    description: m.meta.description,
    alternates: {
      canonical: `${baseUrl}/info/${lang}`,
      languages: {
        en: `${baseUrl}/info/en`,
        ru: `${baseUrl}/info/ru`,
        pl: `${baseUrl}/info/pl`,
        ka: `${baseUrl}/info/ka`,
        "x-default": `${baseUrl}/info/en`,
      },
    },
    openGraph: {
      title: m.meta.title,
      description: m.meta.description,
      url: `${baseUrl}/info/${lang}`,
      siteName: "GeoGuide",
      images: [
        {
          url: `${baseUrl}/og-image-${lang}.jpg`,
          width: 1200,
          height: 630,
          alt: "GeoGuide — Audio Guide for Georgia's Museums",
        },
      ],
      locale: lang === "en" ? "en_US" : lang === "ru" ? "ru_RU" : lang === "pl" ? "pl_PL" : "ka_GE",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: m.meta.title,
      description: m.meta.description,
      images: [`${baseUrl}/og-image-${lang}.jpg`],
    },
  };
}

function museumWhereForLang(lang: MuseumLang): Prisma.MuseumWhereInput {
  const published = { isPublished: true as const };
  switch (lang) {
    case "ka":
      return published;
    case "en":
      return { ...published, nameEn: { not: null } };
    case "ru":
      return { ...published, nameRu: { not: null } };
    case "de":
      return { ...published, nameDe: { not: null } };
    case "fr":
      return { ...published, nameFr: { not: null } };
    case "uk":
      return { ...published, nameUk: { not: null } };
    case "es":
      return { ...published, nameEs: { not: null } };
    case "it":
      return { ...published, nameIt: { not: null } };
    case "pl":
      return { ...published, namePl: { not: null } };
    case "tr":
      return { ...published, nameTr: { not: null } };
    case "az":
      return { ...published, nameAz: { not: null } };
    case "hy":
      return { ...published, nameHy: { not: null } };
    case "he":
      return { ...published, nameHe: { not: null } };
    case "ar":
      return { ...published, nameAr: { not: null } };
    case "ko":
      return { ...published, nameKo: { not: null } };
    case "ja":
      return { ...published, nameJa: { not: null } };
    case "zh":
      return { ...published, nameZh: { not: null } };
  }
}

async function getMuseumsForLang(lang: MuseumLang): Promise<MuseumForInfo[]> {
  const museums = await prisma.museum.findMany({
    where: museumWhereForLang(lang),
    select: {
      id: true,
      slug: true,
      coverImage: true,
      displayOrder: true,
      name: true,
      city: true,
      nameEn: true,
      cityEn: true,
      nameRu: true,
      cityRu: true,
      nameDe: true,
      cityDe: true,
      nameFr: true,
      cityFr: true,
      nameUk: true,
      cityUk: true,
      nameEs: true,
      cityEs: true,
      nameIt: true,
      cityIt: true,
      namePl: true,
      cityPl: true,
      nameTr: true,
      cityTr: true,
      nameAz: true,
      cityAz: true,
      nameHy: true,
      cityHy: true,
      nameHe: true,
      cityHe: true,
      nameAr: true,
      cityAr: true,
      nameKo: true,
      cityKo: true,
      nameJa: true,
      cityJa: true,
      nameZh: true,
      cityZh: true,
      tours: {
        where: { isPublished: true },
        select: {
          id: true,
          price: true,
          isFree: true,
          currency: true,
          isPublished: true,
        },
      },
    },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
  });

  return museums;
}

type MuseumLangPresenceRow = {
  nameEn: string | null;
  nameRu: string | null;
  nameDe: string | null;
  nameFr: string | null;
  nameUk: string | null;
  nameEs: string | null;
  nameIt: string | null;
  namePl: string | null;
  nameTr: string | null;
  nameAz: string | null;
  nameHy: string | null;
  nameHe: string | null;
  nameAr: string | null;
  nameKo: string | null;
  nameJa: string | null;
  nameZh: string | null;
};

// ---------- All available languages across all museums ----------
async function getAllAvailableLanguages(): Promise<MuseumLang[]> {
  const museums = await prisma.museum.findMany({
    where: { isPublished: true },
    select: {
      nameEn: true,
      nameRu: true,
      nameDe: true,
      nameFr: true,
      nameUk: true,
      nameEs: true,
      nameIt: true,
      namePl: true,
      nameTr: true,
      nameAz: true,
      nameHy: true,
      nameHe: true,
      nameAr: true,
      nameKo: true,
      nameJa: true,
      nameZh: true,
    },
  });

  const available = new Set<MuseumLang>();
  available.add("ka");

  const langFieldMap: Array<[keyof MuseumLangPresenceRow, MuseumLang]> = [
    ["nameEn", "en"],
    ["nameRu", "ru"],
    ["nameDe", "de"],
    ["nameFr", "fr"],
    ["nameUk", "uk"],
    ["nameEs", "es"],
    ["nameIt", "it"],
    ["namePl", "pl"],
    ["nameTr", "tr"],
    ["nameAz", "az"],
    ["nameHy", "hy"],
    ["nameHe", "he"],
    ["nameAr", "ar"],
    ["nameKo", "ko"],
    ["nameJa", "ja"],
    ["nameZh", "zh"],
  ];

  for (const museum of museums) {
    for (const [field, lang] of langFieldMap) {
      if (museum[field]) available.add(lang);
    }
  }

  const order: MuseumLang[] = [
    "en",
    "ru",
    "uk",
    "de",
    "fr",
    "pl",
    "ko",
    "ja",
    "es",
    "it",
    "tr",
    "az",
    "hy",
    "he",
    "ar",
    "zh",
    "ka",
  ];

  return order.filter((l) => available.has(l));
}

export default async function InfoPage({ params }: { params: { lang: string } }) {
  const { lang: rawLang } = params;

  if (!INFO_LANGS.includes(rawLang as InfoLang)) {
    notFound();
  }

  const lang = rawLang as InfoLang;
  const m = MESSAGES[lang];
  const museumLang = INFO_TO_MUSEUM_LANG[lang];
  const museums = await getMuseumsForLang(museumLang);
  const availableLangs = await getAllAvailableLanguages();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MobileApplication",
    name: "GeoGuide",
    operatingSystem: "iOS, Android, Web",
    applicationCategory: "TravelApplication",
    offers: {
      "@type": "AggregateOffer",
      lowPrice: "10",
      highPrice: "15",
      priceCurrency: "GEL",
    },
    inLanguage: availableLangs,
    description: m.meta.description,
  };

  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <TrackedHeader currentLang={lang} />

      <section className="relative overflow-hidden bg-gradient-to-br from-[#FDF4E8] to-white py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-5 leading-tight">{m.hero.h1}</h1>
          <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            {m.hero.subtitle.replace("{count}", String(availableLangs.length))}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <TrackedCTA
              href="#museums"
              label={m.hero.cta_primary}
              lang={lang}
              section="hero"
              variant="primary"
            >
              {m.hero.cta_primary} →
            </TrackedCTA>
            <TrackedCTA
              href="#how"
              label={m.hero.cta_secondary}
              lang={lang}
              section="hero"
              variant="secondary"
            >
              {m.hero.cta_secondary}
            </TrackedCTA>
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-2 text-2xl md:text-3xl opacity-80">
            {availableLangs.map((l) => (
              <span key={l} title={l}>
                {LANG_FLAGS[l]}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 py-14">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-5 border-b-[3px] border-[#E67E22] inline-block pb-2">
          {m.what_is.title}
        </h2>
        <p className="text-gray-700 leading-relaxed mb-3">{m.what_is.p1}</p>
        <p className="text-gray-700 leading-relaxed">{m.what_is.p2}</p>
      </section>

      <section id="how" className="max-w-5xl mx-auto px-4 py-14">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 border-b-[3px] border-[#E67E22] inline-block pb-2">
          {m.how_it_works.title}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {m.how_it_works.steps.map((step, i) => (
            <div
              key={i}
              className="bg-white border border-gray-200 rounded-xl p-6 text-center transition-all hover:border-[#E67E22] hover:shadow-md hover:shadow-orange-100"
            >
              <div className="inline-flex items-center justify-center w-10 h-10 bg-[#E67E22] text-white rounded-full font-bold mb-3">
                {i + 1}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="museums" className="max-w-6xl mx-auto px-4 py-14">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 border-b-[3px] border-[#E67E22] inline-block pb-2">
          {m.museums.title_with_count.replace("{count}", String(museums.length))}
        </h2>

        {museums.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-10 text-center text-gray-500">{m.museums.empty}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {museums.map((museum) => (
              <MuseumCard
                key={museum.id}
                museum={museum}
                lang={lang}
                languagesLabel={m.museums.languages_label}
              />
            ))}
          </div>
        )}
      </section>

      <section className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-[#FDF4E8] border-l-4 border-[#E67E22] rounded-lg p-6">
          <h3 className="font-bold text-[#D35400] text-lg mb-2">💡 {m.callout.title}</h3>
          <p className="text-gray-800 leading-relaxed">{m.callout.text}</p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 py-14">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 border-b-[3px] border-[#E67E22] inline-block pb-2">
          {m.faq.title}
        </h2>
        <TrackedFAQ items={m.faq.items} lang={lang} />
      </section>

      <section className="max-w-3xl mx-auto px-4 py-14 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">{m.final_cta.title}</h2>
        <p className="text-gray-600 mb-6">{m.final_cta.description}</p>
        <TrackedCTA
          href="#museums"
          label={m.final_cta.cta}
          lang={lang}
          section="final_cta"
          variant="primary"
        >
          {m.final_cta.cta}
        </TrackedCTA>
      </section>

      <footer className="bg-gray-900 text-gray-300 py-10 px-4 mt-10">
        <div className="max-w-5xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 text-[#E67E22] font-bold text-xl mb-3">
            <span>🎧</span>
            <span>GeoGuide</span>
          </div>
          <p className="text-sm text-gray-400 mb-4">{m.footer.tagline}</p>
          <div className="flex flex-wrap justify-center gap-5 text-sm mb-4">
            <Link href="/terms" className="hover:text-white">
              {m.footer.terms}
            </Link>
            <Link href="/privacy" className="hover:text-white">
              {m.footer.privacy}
            </Link>
            <Link href="/support" className="hover:text-white">
              {m.footer.help}
            </Link>
            <a href="mailto:info@geoguide.ge" className="hover:text-white">
              {m.footer.contact}
            </a>
          </div>
          <div className="text-sm text-gray-400">info@geoguide.ge · +995 599 946 500</div>
          <div className="text-xs text-gray-500 mt-4">{m.footer.copyright}</div>
        </div>
      </footer>
    </div>
  );
}
