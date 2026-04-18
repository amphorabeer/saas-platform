"use client";

import { trackFAQOpen } from "@/lib/analytics";
import type { InfoLang } from "../types";

type FAQItem = {
  q: string;
  a: string;
};

type Props = {
  items: FAQItem[];
  lang: InfoLang;
};

export function TrackedFAQ({ items, lang }: Props) {
  const handleToggle = (item: FAQItem, index: number, isOpen: boolean) => {
    if (!isOpen) return;
    trackFAQOpen({
      faq_question: item.q,
      faq_index: index,
      page_language: lang,
    });
  };

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <details
          key={i}
          className="group bg-white border border-gray-200 rounded-lg"
          onToggle={(e) => handleToggle(item, i, (e.target as HTMLDetailsElement).open)}
        >
          <summary className="cursor-pointer font-semibold text-gray-900 p-4 flex items-center justify-between list-none">
            <span>{item.q}</span>
            <span className="text-[#E67E22] text-xl transition-transform group-open:rotate-45">+</span>
          </summary>
          <div className="px-4 pb-4 text-gray-600 text-sm leading-relaxed">{item.a}</div>
        </details>
      ))}
    </div>
  );
}
