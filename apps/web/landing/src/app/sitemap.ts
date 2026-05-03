import type { MetadataRoute } from "next";

const SITE_URL = "https://geobiz.app";

const modules = [
  "hotel",
  "restaurant",
  "beauty",
  "shop",
  "brewery",
  "winery",
  "distillery",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  // Homepage — ქართული (default, prefix-ის გარეშე)
  entries.push({
    url: SITE_URL,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 1.0,
    alternates: {
      languages: {
        ka: SITE_URL,
        en: `${SITE_URL}/en`,
        "x-default": SITE_URL,
      },
    },
  });

  // Homepage — ინგლისური
  entries.push({
    url: `${SITE_URL}/en`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.9,
    alternates: {
      languages: {
        ka: SITE_URL,
        en: `${SITE_URL}/en`,
        "x-default": SITE_URL,
      },
    },
  });

  // Module pricing pages — ორივე ენაზე
  modules.forEach((module) => {
    // ქართული (default)
    entries.push({
      url: `${SITE_URL}/modules/${module}/pricing`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
      alternates: {
        languages: {
          ka: `${SITE_URL}/modules/${module}/pricing`,
          en: `${SITE_URL}/en/modules/${module}/pricing`,
          "x-default": `${SITE_URL}/modules/${module}/pricing`,
        },
      },
    });

    // ინგლისური
    entries.push({
      url: `${SITE_URL}/en/modules/${module}/pricing`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
      alternates: {
        languages: {
          ka: `${SITE_URL}/modules/${module}/pricing`,
          en: `${SITE_URL}/en/modules/${module}/pricing`,
          "x-default": `${SITE_URL}/modules/${module}/pricing`,
        },
      },
    });
  });

  return entries;
}