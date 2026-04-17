import type { MetadataRoute } from "next";

const BASE_URL = "https://www.geoguide.ge";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/info",
          "/museum",
          "/privacy",
          "/terms",
          "/support",
        ],
        disallow: [
          "/api/",
          "/activate/",
          "/museum/*/tour/*/activate",
          "/museum/*/tour/*/payment/",
          "/museum/*/tour/*/buy",
          "/museum/*/tour/*/scan",
          "/payment/",
          "/_next/",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
