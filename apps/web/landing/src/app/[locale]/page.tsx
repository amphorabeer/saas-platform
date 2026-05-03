import { getTranslations } from "next-intl/server";
import { Navigation } from "../../components/navigation";
import {
  HomeHero,
  HomeStats,
  HomeModules,
  type ModuleData,
  type HeroContent,
} from "../../components/HomeClient";

const SITE_URL = "https://geobiz.app";

// ⚡ Module slugs — სტატიკური (data structure)
const moduleSlugs = [
  "hotel",
  "restaurant",
  "beauty",
  "shop",
  "brewery",
  "winery",
  "distillery",
] as const;

// ⚡ Icons (ემოცი) — translation-ის საჭიროებას არ ექვემდებარება
const moduleIcons: Record<string, string> = {
  hotel: "🏨",
  restaurant: "🍽️",
  beauty: "💅",
  shop: "🛍️",
  brewery: "🍺",
  winery: "🍷",
  distillery: "🥃",
};

export default async function Home({
  params,
}: {
  params: { locale: string };
}) {
  const { locale } = params;

  // ⚡ Server-side translations
  const tHero = await getTranslations({ locale, namespace: "Hero" });
  const tStats = await getTranslations({ locale, namespace: "Stats" });
  const tModules = await getTranslations({ locale, namespace: "Modules" });
  const tFooter = await getTranslations({ locale, namespace: "Footer" });

  // ⚡ Modules data — translations-ით
  const modules: ModuleData[] = moduleSlugs.map((slug) => ({
    name: tModules(`${slug}.name`),
    slug,
    description: tModules(`${slug}.description`),
    icon: moduleIcons[slug],
  }));

  // ⚡ Hero content
  const heroContent: HeroContent = {
    title: tModules("title"),
    subtitle: tModules("subtitle"),
    stats: {
      businesses: "436+",
      transactions: "2.5M+",
      users: "12K+",
    },
  };

  // ⚡ All translations bundle Client Component-სთვის
  const translations = {
    heroTitle: tHero("title"),
    heroSubtitle: tHero("subtitle"),
    heroDescription: tHero("description"),
    ctaStart: tHero("ctaStart"),
    ctaLearnMore: tHero("ctaLearnMore"),
    statsBusinesses: tStats("businesses"),
    statsTransactions: tStats("transactions"),
    statsUsers: tStats("users"),
    noModules: tModules("noModules"),
    noModulesHint: tModules("noModulesHint"),
    learnMoreButton: tModules("learnMoreButton"),
    footerCopyright: tFooter("copyright"),
  };

  // ⚡ JSON-LD Structured Data — locale-aware
  const jsonLdOrganization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "GeoBiz",
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    description:
      locale === "ka"
        ? "მრავალმოდულური ბიზნეს მენეჯმენტის SaaS პლატფორმა საქართველოში"
        : "Multi-module business management SaaS platform in Georgia",
    address: {
      "@type": "PostalAddress",
      addressCountry: "GE",
    },
  };

  const jsonLdSoftware = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "GeoBiz",
    url: SITE_URL,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web Browser",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "GEL",
      description:
        locale === "ka" ? "უფასო საცდელი პერიოდი" : "Free trial",
    },
    description:
      locale === "ka"
        ? "სასტუმროების, რესტორნების, სილამაზის სალონების, მაღაზიების, ლუდსახარშების, ღვინის ქარხნებისა და დისტილერიების მართვის SaaS პლატფორმა."
        : "SaaS platform for managing hotels, restaurants, beauty salons, shops, breweries, wineries, and distilleries.",
    inLanguage: ["ka", "en"],
  };

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLdOrganization),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLdSoftware),
        }}
      />

      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <Navigation />

        <main>
          <HomeHero translations={translations} />
          <HomeStats heroContent={heroContent} translations={translations} />
          <HomeModules
            modules={modules}
            heroContent={heroContent}
            translations={translations}
          />
        </main>

        <footer className="border-t py-12 mt-24" role="contentinfo">
          <div className="container mx-auto px-4 text-center text-muted-foreground">
            <p>{translations.footerCopyright}</p>
          </div>
        </footer>
      </div>
    </>
  );
}
