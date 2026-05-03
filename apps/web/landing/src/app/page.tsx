import { Navigation } from "../components/navigation";
import {
  HomeHero,
  HomeStats,
  HomeModules,
  type ModuleData,
  type HeroContent,
} from "../components/HomeClient";

// ⚡ Server Component — Google ყველა ტექსტს იღებს HTML-ში პირდაპირ

const modules: ModuleData[] = [
  {
    name: "სასტუმრო",
    slug: "hotel",
    description:
      "სრულყოფილი სისტემა სასტუმროების მართვისთვის - ოთახების რეზერვაცია, ჩეკ-ინ/ჩეკ-აუთი, Channel Manager (Booking.com, Airbnb), Facebook Messenger Bot და მეტი",
    icon: "🏨",
  },
  {
    name: "რესტორნი",
    slug: "restaurant",
    description:
      "რესტორნის მენეჯმენტი - მაგიდების რეზერვაცია, შეკვეთების მართვა, მენიუ და ანალიტიკა",
    icon: "🍽️",
  },
  {
    name: "სილამაზის სალონი",
    slug: "beauty",
    description:
      "სილამაზის სალონების მართვა - ვიზიტების დაგეგმვა, კლიენტების ბაზა, ფინანსური ანალიტიკა",
    icon: "💅",
  },
  {
    name: "მაღაზია",
    slug: "shop",
    description:
      "თანამედროვე სალარო სისტემა — POS ტერმინალი, მარაგების მართვა, ფისკალური ინტეგრაცია, RS.ge",
    icon: "🛍️",
  },
  {
    name: "ლუდსახარში",
    slug: "brewery",
    description:
      "ლუდსახარშის მართვა - წარმოების სრული პროცესი, ავზების რეცხვა, მარაგები, აღჭურვილობა, ფინანსები და გაყიდვები",
    icon: "🍺",
  },
  {
    name: "ღვინის ქარხანა",
    slug: "winery",
    description:
      "ღვინის ქარხნის მართვა - ვენახების მონიტორინგი, წარმოება, ბარელები და გაყიდვები",
    icon: "🍷",
  },
  {
    name: "დისტილერია",
    slug: "distillery",
    description:
      "დისტილერიის მართვა - წარმოების პროცესები, ბარელების მართვა, გაყიდვები და ანალიტიკა",
    icon: "🥃",
  },
];

const heroContent: HeroContent = {
  title: "მოდულები",
  subtitle: "აირჩიეთ თქვენი ბიზნესისთვის შესაფერისი მოდული",
  stats: {
    businesses: "436+",
    transactions: "2.5M+",
    users: "12K+",
  },
};

const translations = {
  heroTitle: "GeoBiz",
  heroSubtitle: "მრავალმოდულური ბიზნეს მენეჯმენტის პლატფორმა",
  heroDescription:
    "ერთი პლატფორმა ყველა ბიზნესისთვის - სასტუმროებიდან რესტორნებამდე, სილამაზის სალონებიდან მაღაზიებამდე",
  ctaStart: "დაიწყეთ უფასოდ",
  ctaLearnMore: "გაიგეთ მეტი",
  statsBusinesses: "ბიზნესი",
  statsTransactions: "ტრანზაქცია",
  statsUsers: "მომხმარებელი",
  noModules: "მოდულები არ მოიძებნა",
  noModulesHint:
    "გთხოვთ შეამოწმოთ Super Admin-ში, რომ მოდულები ჩართულია და შენახულია.",
  learnMoreButton: "გაიგე მეტი",
  footerCopyright: "© 2024 GeoBiz. ყველა უფლება დაცულია.",
};

const SITE_URL = "https://geobiz.app";

const jsonLdOrganization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "GeoBiz",
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  description: "მრავალმოდულური ბიზნეს მენეჯმენტის SaaS პლატფორმა საქართველოში",
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
    description: "უფასო საცდელი პერიოდი",
  },
  description:
    "სასტუმროების, რესტორნების, სილამაზის სალონების, მაღაზიების, ლუდსახარშების, ღვინის ქარხნებისა და დისტილერიების მართვის SaaS პლატფორმა.",
  featureList: [
    "სასტუმროს მართვა (PMS)",
    "Channel Manager",
    "რესტორნის მართვა",
    "POS ტერმინალი",
    "სილამაზის სალონის CRM",
    "მაღაზიის სალარო",
    "RS.ge ფისკალური ინტეგრაცია",
    "ლუდსახარშის წარმოება",
    "ღვინის ქარხნის მართვა",
    "დისტილერიის მართვა",
  ],
  inLanguage: ["ka", "en"],
};

export default function Home() {
  return (
    <>
      {/* JSON-LD Structured Data — Server Component-ში მუშაობს უპრობლემოდ */}
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