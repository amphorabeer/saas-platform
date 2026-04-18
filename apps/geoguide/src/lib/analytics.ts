declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

/**
 * Send a custom event to GA4
 * @param eventName - Event name (snake_case, e.g. "museum_card_clicked")
 * @param params - Custom parameters
 */
export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>
) {
  if (typeof window === "undefined") return;
  if (!window.gtag) {
    console.warn("[Analytics] gtag not loaded yet");
    return;
  }

  window.gtag("event", eventName, params);

  if (process.env.NODE_ENV === "development") {
    console.log("[GA4 Event]", eventName, params);
  }
}

export function trackMuseumClick(params: {
  museum_slug: string;
  museum_name: string;
  page_language: string;
  source: "info_page" | "home_page" | "search";
}) {
  trackEvent("museum_card_clicked", params);
}

export function trackCTAClick(params: {
  cta_label: string;
  page_language: string;
  page_section: string;
}) {
  trackEvent("cta_button_clicked", params);
}

export function trackLanguageSwitch(params: {
  from_language: string;
  to_language: string;
  current_page: string;
}) {
  trackEvent("language_switcher_used", params);
}

export function trackFAQOpen(params: {
  faq_question: string;
  faq_index: number;
  page_language: string;
}) {
  trackEvent("faq_item_opened", params);
}
