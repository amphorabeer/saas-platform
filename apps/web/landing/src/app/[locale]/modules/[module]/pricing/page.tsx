"use client";

import { useState } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@saas-platform/ui";
import { Navigation } from "../../../../../components/navigation";
import { ArrowLeft, Loader2, CheckCircle } from "lucide-react";

const modules = ["hotel", "restaurant", "beauty", "shop", "brewery", "winery", "distillery"];

// Module-specific app URLs
const moduleAppUrls: Record<string, string> = {
  hotel: process.env.NEXT_PUBLIC_HOTEL_URL || "https://saas-hotel.vercel.app",
  brewery: process.env.NEXT_PUBLIC_BREWERY_URL || "https://brewmaster-pro.vercel.app",
  winery: process.env.NEXT_PUBLIC_WINERY_URL || "",
  restaurant: "",
  beauty: process.env.NEXT_PUBLIC_BEAUTY_URL || "",
  shop: "",
  distillery: "",
};

// ============================================
// HARDCODED MODULE DATA - შეცვლა კოდში
// ============================================
const moduleData: Record<string, {
  name: string;
  description: string;
  icon: string;
  pricing: {
    starter: { name: string; price: string; duration: string; features: string[] };
    professional: { name: string; price: string; popular: boolean; features: string[] };
    enterprise: { name: string; price: string; features: string[] };
  };
  faq: { question: string; answer: string }[];
}> = {
  hotel: {
    name: "სასტუმროს მართვა",
    description: "სრულყოფილი გადაწყვეტა სასტუმროების მართვისთვის",
    icon: "🏨",
    pricing: {
      starter: {
        name: "Starter",
        price: "₾35",
        duration: "15 დღე საცდელი",
        features: [
          "მაქს. 10 ოთახი",
          "კალენდარი & ჯავშნები",
          "Check-in / Check-out",
          "ღამის აუდიტი",
          "1 მომხმარებელი",
        ],
      },
      professional: {
        name: "Professional",
        price: "₾69",
        popular: true,
        features: [
          "11-30 ოთახი",
          "ყველა Starter ფუნქცია",
          "ფინანსები & ანგარიშები",
          "Housekeeping მართვა",
          "🔗 Channel Manager (Booking.com, Airbnb)",
          "🤖 Facebook Messenger Bot",
          "5 მომხმარებელი",
        ],
      },
      enterprise: {
        name: "Enterprise",
        price: "₾99",
        features: [
          "31+ ოთახი (ულიმიტო)",
          "ყველა ფუნქცია",
          "ანალიტიკა & სტატისტიკა",
          "🔗 Channel Manager (ყველა არხი)",
          "🤖 Facebook Messenger Bot",
          "მრავალი ლოკაცია",
          "მომხმარებლის როლები",
          "ულიმიტო მომხმარებლები",
        ],
      },
    },
    faq: [
      { question: "როგორ მუშაობს ჯავშნების სისტემა?", answer: "სისტემა საშუალებას გაძლევთ მარტივად მართოთ ოთახების ჯავშნები, ჩეკ-ინ/ჩეკ-აუთი კალენდარის ვიზუალური ინტერფეისით." },
      { question: "რა არის ღამის აუდიტი?", answer: "ღამის აუდიტი დღის ფინანსური ოპერაციების დახურვა და ანგარიშების გენერაციაა." },
      { question: "შემიძლია სხვადასხვა ფილიალის მართვა?", answer: "Enterprise პაკეტში შედის მრავალი ლოკაციის მართვის შესაძლებლობა ერთი პანელიდან." },
      { question: "რა არის Channel Manager?", answer: "Channel Manager ავტომატურად სინქრონიზებს თქვენს კალენდარს Booking.com-თან და Airbnb-თან. ჯავშნები რეალურ დროში განახლდება და თავიდან აიცილებთ Double-booking-ს." },
      { question: "როგორ მუშაობს Facebook Messenger Bot?", answer: "Bot 24/7 რეჟიმში პასუხობს თქვენს სტუმრებს Facebook Messenger-ში. აჩვენებს ფასებს, ამოწმებს availability-ს და ავტომატურად ქმნის ჯავშანს თქვენს კალენდარში." },
    ],
  },
  brewery: {
    name: "ლუდსახარშის მართვა",
    description: "წარმოების, ინვენტარისა და გაყიდვების მართვა",
    icon: "🍺",
    pricing: {
      starter: {
        name: "Starter",
        price: "₾25",
        duration: "15 დღე საცდელი",
        features: [
          "მაქს. 5 ავზი",
          "წარმოების ძირითადი ციკლი",
          "მაქს. 10 რეცეპტი",
          "ნედლეულის მართვა",
          "CIP / ავზების რეცხვა",
          "1 მომხმარებელი",
        ],
      },
      professional: {
        name: "Professional",
        price: "₾69",
        popular: true,
        features: [
          "6-14 ავზი",
          "სრული წარმოება + SPLIT/BLEND",
          "ულიმიტო რეცეპტები",
          "მარაგები სრული + კეგები",
          "CIP / ავზების რეცხვა",
          "ფინანსების მართვა",
          "3 მომხმარებელი",
        ],
      },
      enterprise: {
        name: "Enterprise",
        price: "₾99",
        features: [
          "15+ ავზი (ულიმიტო)",
          "ყველა ფუნქცია",
          "CIP / ავზების რეცხვა",
          "გაფართოებული ანალიტიკა",
          "მომხმარებლის როლები",
          "ულიმიტო მომხმარებლები",
          "პრიორიტეტული მხარდაჭერა",
        ],
      },
    },
    faq: [
      { question: "როგორ მუშაობს რეცეპტების მართვა?", answer: "სისტემა საშუალებას გაძლევთ შექმნათ და მართოთ ლუდის რეცეპტები, ინგრედიენტები და წარმოების პროცესები." },
      { question: "რა არის SPLIT/BLEND?", answer: "SPLIT საშუალებას გაძლევთ ერთი პარტია გაყოთ რამდენიმე ნაწილად, BLEND კი რამდენიმე პარტიის შერევას." },
      { question: "რა არის CIP?", answer: "Clean-In-Place - ავზების ავტომატური რეცხვის სისტემა ჰიგიენის უზრუნველსაყოფად." },
    ],
  },
  restaurant: {
    name: "რესტორნის მართვის სისტემა",
    description: "POS ტერმინალი, KDS სამზარეულო, მაგიდების მართვა, რეზერვაცია, Food Cost, ანალიტიკა",
    icon: "🍽️",
    pricing: {
      starter: {
        name: "Starter",
        price: "უფასო",
        duration: "15 დღე",
        features: [
          "მენიუს მართვა (კატეგორიები, კერძები, მოდიფიკატორები, კომბო სეტები)",
          "მაგიდების ფლორ პლანი + ზონები",
          "POS ტერმინალი (Dine In, Take Away, Delivery)",
          "KDS სამზარეულო (რეალ-ტაიმ)",
          "ოფიციანტების მართვა + PIN ავტორიზაცია",
          "საწყობი / რეცეპტები / Food Cost",
          "რეპორტები (Z-რეპორტი, ანალიტიკა)",
          "რეზერვაცია",
          "AI ასისტენტი",
          "მომხმარებლების ბაზა",
        ],
      },
      professional: {
        name: "Professional",
        price: "₾79",
        popular: true,
        features: [
          "ყველა Starter ფუნქცია",
          "მრავალი ფილიალის მართვა",
          "მოწინავე ანალიტიკა და დაშბორდები",
          "Glovo / Wolt ინტეგრაცია",
          "SMS შეტყობინებები (რეზერვაცია)",
          "RS.ge ფისკალური კასა",
          "პრიორიტეტული მხარდაჭერა",
          "20-მდე მომხმარებელი",
        ],
      },
      enterprise: {
        name: "Enterprise",
        price: "₾149",
        features: [
          "ყველა Professional ფუნქცია",
          "შეუზღუდავი ფილიალები",
          "Custom ინტეგრაციები (API)",
          "პრიორიტეტული მხარდაჭერა 24/7",
          "SLA გარანტია",
          "თანამშრომლების ტრენინგი",
          "მონაცემთა ექსპორტი და ანალიტიკა",
          "შეუზღუდავი მომხმარებლები",
        ],
      },
    },
    faq: [
      { question: "როგორ მუშაობს მაგიდების რეზერვაცია?", answer: "სისტემა საშუალებას გაძლევთ მარტივად მართოთ მაგიდების რეზერვაციები კალენდარით, overlap-ის შემოწმებით და ავტომატური სტატუსების ცვლილებით." },
      { question: "რა არის KDS სამზარეულო?", answer: "Kitchen Display System — სამზარეულოში ეკრანზე რეალურ დროში ჩნდება შეკვეთები სტანციების მიხედვით (HOT, COLD, BAR, PIZZA, GRILL, PASTRY)." },
      { question: "როგორ მუშაობს Food Cost?", answer: "თითოეულ კერძს მიებმება რეცეპტი ინგრედიენტებით. შეკვეთის დროს ავტომატურად ხდება საწყობიდან ჩამოწერა და Food Cost-ის გამოთვლა." },
      { question: "რა არის Z-რეპორტი?", answer: "დღის ბოლოს გენერირდება Z-რეპორტი — სრული ფინანსური ანგარიში: გაყიდვები, გადახდის მეთოდები, საშუალო ჩეკი, ტოპ კერძები." },
      { question: "შემიძლია Delivery შეკვეთების მიღება?", answer: "დიახ, POS ტერმინალში შეგიძლიათ Dine In, Take Away და Delivery შეკვეთების მიღება კლიენტის მისამართით." },
    ],
  },
  beauty: {
    name: "სილამაზის სალონის მართვა",
    description: "ჯავშნები, კლიენტები, POS, ინვენტარი, ფინანსები, ლოიალობა, ონლაინ ჯავშანი, AI ასისტენტი",
    icon: "💅",
    pricing: {
      starter: {
        name: "Starter",
        price: "უფასო",
        duration: "15 დღე",
        features: [
          "მაქს. 3 სპეციალისტი",
          "ჯავშნების კალენდარი",
          "კლიენტების ბაზა (500)",
          "POS — სერვისები + პროდუქტები",
          "ინვენტარის მართვა",
          "რეპორტები & ფინანსები",
          "ონლაინ ჯავშანი (public გვერდი)",
          "1 მომხმარებელი",
        ],
      },
      professional: {
        name: "Professional",
        price: "₾69",
        popular: true,
        features: [
          "მაქს. 10 სპეციალისტი",
          "ყველა Starter ფუნქცია",
          "ლოიალობის პროგრამა (ქულები, დონეები, სასაჩუქრე ბარათები)",
          "კლიენტების შეფასებები",
          "AI ასისტენტი (Claude)",
          "საკომისიოს მართვა",
          "CSV ექსპორტი",
          "5 მომხმარებელი",
        ],
      },
      enterprise: {
        name: "Enterprise",
        price: "₾129",
        features: [
          "ულიმიტო სპეციალისტები",
          "ყველა ფუნქცია",
          "მრავალი ლოკაცია",
          "SMS შეტყობინებები",
          "მომხმარებლის როლები",
          "ულიმიტო მომხმარებლები",
          "პრიორიტეტული მხარდაჭერა",
        ],
      },
    },
    faq: [
      { question: "როგორ მუშაობს ონლაინ ჯავშანი?", answer: "კლიენტი ხსნის თქვენს ლინკს, ირჩევს სერვისს, სპეციალისტს, თარიღს/დროს და აკეთებს ჯავშანს. თქვენ ადასტურებთ ადმინ პანელიდან." },
      { question: "როგორ მუშაობს ლოიალობის სისტემა?", answer: "კლიენტი ყოველ 10₾-ზე აგროვებს 1 ქულას. 4 დონეა: სტანდარტი, ვერცხლი (100+), ოქრო (500+), VIP (1000+). ასევე შეგიძლიათ სასაჩუქრე ბარათების შექმნა." },
      { question: "რა არის AI ასისტენტი?", answer: "Claude-ზე დაფუძნებული ჩატბოტი, რომელიც იცის თქვენი სალონის მონაცემები — შემოსავალი, ჯავშნები, მარაგი — და გაძლევთ ბიზნეს-რეკომენდაციებს." },
      { question: "როგორ მუშაობს POS?", answer: "POS-ით ახდენთ სერვისებისა და პროდუქტების გაყიდვას, ფასდაკლებებით, სხვადასხვა გადახდის მეთოდით. მარაგი ავტომატურად ჩამოიჭრება." },
      { question: "შემიძლია სპეციალისტების საკომისიოს თვალთვალი?", answer: "დიახ, ფინანსების მოდულში ჩანს ყოველი სპეციალისტის შემოსავალი, გაყიდვები და საკომისიო თანხა — პროცენტული ან ფიქსირებული." },
    ],
  },
  shop: {
    name: "მაღაზიის მართვის სისტემა",
    description: "თანამედროვე სალარო სისტემა — POS ტერმინალი, მარაგების მართვა, ფისკალური ინტეგრაცია, RS.ge",
    icon: "🛍️",
    pricing: {
      starter: {
        name: "Starter",
        price: "₾40",
        duration: "თვე",
        features: [
          "1 მოლარე",
          "500 პროდუქტი",
          "POS ტერმინალი",
          "მარაგების მართვა",
          "ჩეკის ბეჭდვა",
        ],
      },
      professional: {
        name: "Professional",
        price: "₾80",
        popular: true,
        features: [
          "5 მოლარე",
          "ულიმიტო პროდუქტი",
          "ყველა ფუნქცია",
          "ბარკოდ სკანერი",
          "ფისკალური აპარატი (Kasa.ge / Daisy)",
          "RS.ge ინტეგრაცია",
          "მომხმარებლების მართვა",
        ],
      },
      enterprise: {
        name: "Enterprise",
        price: "₾150",
        features: [
          "ულიმიტო მოლარე",
          "მრავალი ლოკაცია",
          "ონლაინ მაღაზია (WooCommerce / Shopify)",
          "ბანკის ტერმინალის ECR ინტეგრაცია",
          "API access",
          "პრიორიტეტული მხარდაჭერა",
        ],
      },
    },
    faq: [
      { question: "როგორ მუშაობს ფისკალური აპარატის ინტეგრაცია?", answer: "სისტემა მხარდაჭერს Kasa.ge და Daisy Expert ფისკალურ აპარატებს. ყველა გაყიდვა ავტომატურად იბეჭდება ფისკალურ ჩეკზე." },
      { question: "რა ბარკოდ სკანერები მუშაობს?", answer: "მხარდაჭერილია USB და Bluetooth ბარკოდ სკანერები — Epson, Bixolon, Star, Honeywell, ACLAS, Rongta, Xprinter." },
      { question: "შემიძლია ძველი სისტემიდან მონაცემების იმპორტი?", answer: "დიახ. შეგიძლიათ CSV/Excel ფორმატით იმპორტი პროდუქტების, კატეგორიების, მომწოდებლების და მომხმარებლების." },
      { question: "რა არის RS.ge ინტეგრაცია?", answer: "RS.ge ინტეგრაცია საშუალებას გაძლევთ ავტომატურად გაგზავნოთ გაყიდვის მონაცემები RS.ge სისტემაში კანონიერი შესაბამისობისთვის." },
      { question: "როგორ მუშაობს ონლაინ მაღაზიის ინტეგრაცია?", answer: "Enterprise გეგმაში შედის WooCommerce და Shopify ინტეგრაცია — ინვენტარი და ბრუნვა სინქრონიზდება ონლაინ მაღაზიასთან." },
      { question: "რა ჰარდვერი მუშაობს სისტემასთან?", answer: "მხარდაჭერილია ჩეკის პრინტერები (Epson, Bixolon, Star, Xprinter), ბარკოდ სკანერები და ფისკალური აპარატები Kasa.ge და Daisy." },
    ],
  },
  winery: {
    name: "ღვინის მარანის მართვა",
    description: "ვენახების, წარმოებისა და ბარელების მართვა",
    icon: "🍷",
    pricing: {
      starter: {
        name: "Starter",
        price: "უფასო",
        duration: "15 დღე",
        features: ["1 მარანი", "50 ბარელი", "წარმოების მართვა"],
      },
      professional: {
        name: "Professional",
        price: "₾99",
        popular: true,
        features: ["1 მარანი", "200 ბარელი", "ყველა ფუნქცია", "ლაბორატორიის ანალიზი"],
      },
      enterprise: {
        name: "Enterprise",
        price: "₾299",
        features: ["მრავალი მარანი", "ულიმიტო ბარელები", "Custom features", "ექსპორტის დოკუმენტაცია"],
      },
    },
    faq: [
      { question: "როგორ მუშაობს ბარელების მართვა?", answer: "სისტემა საშუალებას გაძლევთ მართოთ ბარელები, მათი ასაკი და ლოკაცია." },
    ],
  },
  distillery: {
    name: "არყის საწარმოს მართვა",
    description: "დისტილაციის, ბარელებისა და გაყიდვების მართვა",
    icon: "🥃",
    pricing: {
      starter: {
        name: "Starter",
        price: "უფასო",
        duration: "15 დღე",
        features: ["1 საწარმო", "დისტილაციის მართვა", "ძირითადი ფუნქციები"],
      },
      professional: {
        name: "Professional",
        price: "₾99",
        popular: true,
        features: ["1 საწარმო", "ბარელების მართვა", "ყველა ფუნქცია", "ხარისხის კონტროლი"],
      },
      enterprise: {
        name: "Enterprise",
        price: "₾299",
        features: ["მრავალი საწარმო", "ულიმიტო ბარელები", "Custom features", "რეგულაციების შესაბამისობა"],
      },
    },
    faq: [
      { question: "როგორ მუშაობს დისტილაციის პროცესების მართვა?", answer: "სისტემა საშუალებას გაძლევთ მართოთ დისტილაციის პროცესები, რეცეპტები და ბარელების ასაკი." },
    ],
  },
};

function getRegistrationUrl(moduleSlug: string, plan: string): string {
  // Brewery has its own registration page
  if (moduleSlug === "brewery") {
    const appUrl = moduleAppUrls[moduleSlug];
    if (appUrl) {
      return `${appUrl}/register?plan=${plan}`;
    }
  }
  // Hotel and Shop use Landing's signup → respective app dashboards
  return `/auth/signup?module=${moduleSlug}&plan=${plan}`;
}

function hasRegistrationFlow(moduleSlug: string): boolean {
  return moduleSlug === "brewery" || moduleSlug === "hotel" || moduleSlug === "shop" || moduleSlug === "restaurant" || moduleSlug === "beauty";
}

export default function ModulePricingPage({ params }: { params: { module: string } }) {
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  
  const moduleSlug = params.module;

  if (!modules.includes(params.module)) {
    notFound();
  }

  // Get module data directly from hardcoded object
  const data = moduleData[moduleSlug];
  const { pricing, faq } = data;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus("idle");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          module: moduleSlug,
        }),
      });

      if (response.ok) {
        setSubmitStatus("success");
        setFormData({ name: "", email: "", phone: "", message: "" });
      } else {
        setSubmitStatus("error");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Navigation />
      <div className="pt-16">
        {/* Back Button */}
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" asChild className="mb-2">
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              უკან
            </Link>
          </Button>
        </div>

        {/* Hero Section - შემცირებული padding */}
        <section className="container mx-auto px-4 py-4 md:py-6">
          <div className="max-w-4xl mx-auto text-center">
            <span className="text-5xl mb-3 block">{data.icon}</span>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">{data.name}</h1>
            <p className="text-lg text-muted-foreground mb-4">{data.description}</p>
          </div>
        </section>

        {/* Pricing Section - შემცირებული padding */}
        <section className="container mx-auto px-4 py-6">
          <h2 className="text-2xl font-bold text-center mb-2">ფასები</h2>
          <p className="text-center text-muted-foreground mb-8">აირჩიეთ თქვენთვის შესაფერისი გეგმა</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Starter */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-2xl">{pricing.starter.name}</CardTitle>
                <CardDescription>დამწყებთათვის</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <span className="text-4xl font-bold">{pricing.starter.price}</span>
                  {pricing.starter.duration && (
                    <span className="text-muted-foreground ml-2">/ {pricing.starter.duration}</span>
                  )}
                </div>
                <ul className="space-y-3 mb-6">
                  {pricing.starter.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <span className="text-green-600 mr-2">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full min-h-[44px]"
                  variant="outline"
                  disabled={!hasRegistrationFlow(moduleSlug)}
                  asChild={hasRegistrationFlow(moduleSlug)}
                >
                  {hasRegistrationFlow(moduleSlug) ? (
                    <Link href={getRegistrationUrl(moduleSlug, "STARTER")}>დაწყება</Link>
                  ) : (
                    <span>დაწყება</span>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Professional */}
            <Card className="hover:shadow-lg transition-shadow border-2 border-primary relative">
              {pricing.professional.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                    ყველაზე პოპულარული
                  </span>
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-2xl">{pricing.professional.name}</CardTitle>
                <CardDescription>პროფესიონალური ბიზნესისთვის</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <span className="text-4xl font-bold">{pricing.professional.price}</span>
                  <span className="text-muted-foreground">/თვე</span>
                </div>
                <ul className="space-y-3 mb-6">
                  {pricing.professional.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <span className="text-green-600 mr-2">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full min-h-[44px]"
                  disabled={!hasRegistrationFlow(moduleSlug)}
                  asChild={hasRegistrationFlow(moduleSlug)}
                >
                  {hasRegistrationFlow(moduleSlug) ? (
                    <Link href={getRegistrationUrl(moduleSlug, "PROFESSIONAL")}>არჩევა</Link>
                  ) : (
                    <span>არჩევა</span>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Enterprise */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-2xl">{pricing.enterprise.name}</CardTitle>
                <CardDescription>დიდი ბიზნესისთვის</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <span className="text-4xl font-bold">{pricing.enterprise.price}</span>
                  <span className="text-muted-foreground">/თვე</span>
                </div>
                <ul className="space-y-3 mb-6">
                  {pricing.enterprise.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <span className="text-green-600 mr-2">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full min-h-[44px]"
                  variant="outline"
                  disabled={!hasRegistrationFlow(moduleSlug)}
                  asChild={hasRegistrationFlow(moduleSlug)}
                >
                  {hasRegistrationFlow(moduleSlug) ? (
                    <Link href={getRegistrationUrl(moduleSlug, "ENTERPRISE")}>არჩევა</Link>
                  ) : (
                    <span>არჩევა</span>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Key Features Section - Hotel */}
        {moduleSlug === "hotel" && (
          <section className="container mx-auto px-4 py-12 bg-muted/30">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-4">🚀 ახალი ფუნქციები</h2>
              <p className="text-center text-muted-foreground mb-10">
                გაზარდეთ თქვენი სასტუმროს ეფექტურობა ჩვენი უახლესი ინტეგრაციებით
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Channel Manager */}
                <Card className="hover:shadow-lg transition-shadow border-2 border-blue-200">
                  <CardHeader>
                    <div className="text-4xl mb-2">🔗</div>
                    <CardTitle className="text-xl">Channel Manager</CardTitle>
                    <CardDescription>Booking.com & Airbnb ინტეგრაცია</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      დააკავშირეთ თქვენი სასტუმრო Booking.com-თან და Airbnb-თან. 
                      ჯავშნები ავტომატურად სინქრონიზდება - აღარ დაგჭირდებათ ხელით განახლება.
                    </p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center">
                        <span className="text-green-600 mr-2">✓</span>
                        ავტომატური კალენდრის სინქრონიზაცია
                      </li>
                      <li className="flex items-center">
                        <span className="text-green-600 mr-2">✓</span>
                        Double-booking პრევენცია
                      </li>
                      <li className="flex items-center">
                        <span className="text-green-600 mr-2">✓</span>
                        iCal იმპორტი/ექსპორტი
                      </li>
                      <li className="flex items-center">
                        <span className="text-green-600 mr-2">✓</span>
                        რეალურ დროში განახლება
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                {/* Messenger Bot */}
                <Card className="hover:shadow-lg transition-shadow border-2 border-purple-200">
                  <CardHeader>
                    <div className="text-4xl mb-2">🤖</div>
                    <CardTitle className="text-xl">Facebook Messenger Bot</CardTitle>
                    <CardDescription>24/7 ავტომატური ჯავშანი</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      თქვენი სტუმრები შეძლებენ ოთახის დაჯავშნას პირდაპირ Facebook Messenger-იდან. 
                      Bot ავტომატურად პასუხობს და ქმნის ჯავშანს თქვენს კალენდარში.
                    </p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center">
                        <span className="text-green-600 mr-2">✓</span>
                        24/7 ავტომატური პასუხი
                      </li>
                      <li className="flex items-center">
                        <span className="text-green-600 mr-2">✓</span>
                        ფასების ჩვენება
                      </li>
                      <li className="flex items-center">
                        <span className="text-green-600 mr-2">✓</span>
                        ონლაინ დაჯავშნა Messenger-იდან
                      </li>
                      <li className="flex items-center">
                        <span className="text-green-600 mr-2">✓</span>
                        ავტომატური რეზერვაცია PMS-ში
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
        )}

        {/* Key Features Section - Shop */}
        {moduleSlug === "shop" && (
          <section className="container mx-auto px-4 py-12 bg-muted/30">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-4">🚀 ძირითადი ფუნქციები</h2>
              <p className="text-center text-muted-foreground mb-10">
                თანამედროვე POS სისტემა ფისკალური ინტეგრაციით და სალაროს აღჭურვილობით
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Card className="hover:shadow-lg transition-shadow border-2 border-blue-200">
                  <CardHeader>
                    <div className="text-4xl mb-2">🧾</div>
                    <CardTitle className="text-xl">ფისკალური ინტეგრაცია</CardTitle>
                    <CardDescription>Kasa.ge & Daisy Expert</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm">
                      ყველა გაყიდვა ავტომატურად იბეჭდება ფისკალურ ჩეკზე. მხარდაჭერილია Kasa.ge და Daisy Expert ფისკალური აპარატები.
                    </p>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow border-2 border-green-200">
                  <CardHeader>
                    <div className="text-4xl mb-2">📟</div>
                    <CardTitle className="text-xl">Hardware თავსებადობა</CardTitle>
                    <CardDescription>Epson, Bixolon, Star, Honeywell, ACLAS, Rongta, Xprinter</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm">
                      ჩეკის პრინტერები, ბარკოდ სკანერები და ფისკალური აპარატები — ყველა მწარმოებელი მხარდაჭერილია.
                    </p>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow border-2 border-purple-200">
                  <CardHeader>
                    <div className="text-4xl mb-2">📊</div>
                    <CardTitle className="text-xl">RS.ge ინტეგრაცია</CardTitle>
                    <CardDescription>ავტომატური რეპორტირება</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm">
                      გაყიდვების მონაცემების ავტომატური გაგზავნა RS.ge სისტემაში კანონიერი შესაბამისობისთვის.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
        )}

        {/* FAQ Section */}
        <section className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-8">ხშირად დასმული კითხვები</h2>
            <div className="space-y-4">
              {faq.map((item, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="text-lg">{item.question}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{item.answer}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Form */}
        <section className="container mx-auto px-4 py-12">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-3xl text-center">დაგვიკავშირდით</CardTitle>
              <CardDescription className="text-center">
                გვაგვეცით თქვენი კონტაქტის ინფორმაცია და ჩვენ დაგიკავშირდებით
              </CardDescription>
            </CardHeader>
            <CardContent>
              {submitStatus === "success" ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">მადლობა!</h3>
                  <p className="text-muted-foreground">თქვენი შეტყობინება წარმატებით გაიგზავნა. ჩვენ მალე დაგიკავშირდებით.</p>
                  <Button className="mt-4" variant="outline" onClick={() => setSubmitStatus("idle")}>
                    ახალი შეტყობინება
                  </Button>
                </div>
              ) : (
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div className="space-y-2">
                    <Label htmlFor="name">სახელი</Label>
                    <Input
                      id="name"
                      placeholder="თქვენი სახელი"
                      className="min-h-[44px]"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">ელფოსტა</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      className="min-h-[44px]"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">ტელეფონი</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+995 555 123 456"
                      className="min-h-[44px]"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">შეტყობინება</Label>
                    <textarea
                      id="message"
                      rows={4}
                      className="w-full px-3 py-2 border rounded-md min-h-[100px]"
                      placeholder="თქვენი შეტყობინება..."
                      required
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    />
                  </div>
                  {submitStatus === "error" && (
                    <p className="text-red-500 text-sm">შეცდომა გაგზავნისას. გთხოვთ სცადოთ თავიდან.</p>
                  )}
                  <Button type="submit" className="w-full min-h-[44px]" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        იგზავნება...
                      </>
                    ) : (
                      "გაგზავნა"
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}