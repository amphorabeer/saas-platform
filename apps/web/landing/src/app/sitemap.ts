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

  const homepage: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
      alternates: {
        languages: {
          ka: `${SITE_URL}/ka`,
          en: `${SITE_URL}/en`,
        },
      },
    },
  ];

  const modulePricingPages: MetadataRoute.Sitemap = modules.map((module) => ({
    url: `${SITE_URL}/modules/${module}/pricing`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.8,
    alternates: {
      languages: {
        ka: `${SITE_URL}/ka/modules/${module}/pricing`,
        en: `${SITE_URL}/en/modules/${module}/pricing`,
      },
    },
  }));

  return [...homepage, ...modulePricingPages];
}