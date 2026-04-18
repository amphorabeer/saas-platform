"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { trackCTAClick } from "@/lib/analytics";
import type { InfoLang } from "../types";

type Props = {
  href: string;
  label: string;
  lang: InfoLang;
  section: "hero" | "final_cta" | "callout";
  variant: "primary" | "secondary";
  children: ReactNode;
};

export function TrackedCTA({ href, label, lang, section, variant, children }: Props) {
  const handleClick = () => {
    trackCTAClick({
      cta_label: label,
      page_language: lang,
      page_section: section,
    });
  };

  const baseClass = "inline-block font-semibold px-8 py-3.5 rounded-full text-base transition-all";
  const variantClass =
    variant === "primary"
      ? "bg-[#E67E22] hover:bg-[#D35400] text-white shadow-lg shadow-orange-200 hover:-translate-y-0.5"
      : "bg-white hover:bg-gray-50 text-gray-800 border border-gray-200";

  return (
    <Link href={href} onClick={handleClick} className={`${baseClass} ${variantClass}`}>
      {children}
    </Link>
  );
}
