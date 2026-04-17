import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const BASE_URL = "https://www.geoguide.ge";
const INFO_LANGS = ["en", "ru", "pl", "ka"] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const museums = await prisma.museum.findMany({
    where: { isPublished: true },
    select: { slug: true, updatedAt: true },
  });

  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/support`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];

  const infoPages: MetadataRoute.Sitemap = INFO_LANGS.map((lang) => ({
    url: `${BASE_URL}/info/${lang}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.9,
    alternates: {
      languages: {
        en: `${BASE_URL}/info/en`,
        ru: `${BASE_URL}/info/ru`,
        pl: `${BASE_URL}/info/pl`,
        ka: `${BASE_URL}/info/ka`,
        "x-default": `${BASE_URL}/info/en`,
      },
    },
  }));

  const museumPages: MetadataRoute.Sitemap = museums.map((m) => ({
    url: `${BASE_URL}/museum/${m.slug}`,
    lastModified: m.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticPages, ...infoPages, ...museumPages];
}
