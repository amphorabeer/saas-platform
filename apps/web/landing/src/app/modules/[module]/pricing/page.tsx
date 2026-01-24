"use client";

import { useState } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@saas-platform/ui";
import { Navigation } from "../../../../components/navigation";
import { ArrowLeft, Loader2, CheckCircle } from "lucide-react";

const modules = ["hotel", "restaurant", "beauty", "shop", "brewery", "winery", "distillery"];

// Module-specific app URLs
const moduleAppUrls: Record<string, string> = {
  hotel: process.env.NEXT_PUBLIC_HOTEL_URL || "https://saas-hotel.vercel.app",
  brewery: process.env.NEXT_PUBLIC_BREWERY_URL || "https://brewmaster-pro.vercel.app",
  winery: process.env.NEXT_PUBLIC_WINERY_URL || "",
  restaurant: "",
  beauty: "",
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
    description: "რესტორნის ყველა ასპექტის მართვა ერთ ადგილას",
    icon: "🍽️",
    pricing: {
      starter: {
        name: "Starter",
        price: "უფასო",
        duration: "15 დღე",
        features: ["1 ლოკაცია", "20 მაგიდა", "შეკვეთების მართვა"],
      },
      professional: {
        name: "Professional",
        price: "₾99",
        popular: true,
        features: ["1 ლოკაცია", "50 მაგიდა", "ყველა ფუნქცია", "POS ინტეგრაცია"],
      },
      enterprise: {
        name: "Enterprise",
        price: "₾299",
        features: ["მრავალი ლოკაცია", "ულიმიტო მაგიდები", "Custom features", "Multi-language"],
      },
    },
    faq: [
      { question: "როგორ მუშაობს მაგიდების რეზერვაცია?", answer: "სისტემა საშუალებას გაძლევთ მარტივად მართოთ მაგიდების რეზერვაციები და შეკვეთები." },
    ],
  },
  beauty: {
    name: "სილამაზის სალონის მართვა",
    description: "კლიენტების, ვიზიტებისა და ფინანსების მართვა",
    icon: "💅",
    pricing: {
      starter: {
        name: "Starter",
        price: "უფასო",
        duration: "15 დღე",
        features: ["1 ლოკაცია", "500 კლიენტი", "ვიზიტების მართვა"],
      },
      professional: {
        name: "Professional",
        price: "₾99",
        popular: true,
        features: ["1 ლოკაცია", "ულიმიტო კლიენტი", "ყველა ფუნქცია", "SMS შეტყობინებები"],
      },
      enterprise: {
        name: "Enterprise",
        price: "₾299",
        features: ["მრავალი ლოკაცია", "ულიმიტო თანამშრომლები", "Custom features", "API access"],
      },
    },
    faq: [
      { question: "შემიძლია SMS შეტყობინებების გაგზავნა?", answer: "დიახ, Professional და Enterprise გეგმებში შედის SMS შეტყობინებების ფუნქცია." },
    ],
  },
  shop: {
    name: "მაღაზიის მართვის სისტემა",
    description: "ინვენტარის, გაყიდვებისა და მომხმარებლების მართვა",
    icon: "🛍️",
    pricing: {
      starter: {
        name: "Starter",
        price: "უფასო",
        duration: "15 დღე",
        features: ["1 ლოკაცია", "100 პროდუქტი", "გაყიდვების მართვა"],
      },
      professional: {
        name: "Professional",
        price: "₾99",
        popular: true,
        features: ["1 ლოკაცია", "ულიმიტო პროდუქტი", "ყველა ფუნქცია", "ბარკოდის სკანერი"],
      },
      enterprise: {
        name: "Enterprise",
        price: "₾299",
        features: ["მრავალი ლოკაცია", "ულიმიტო მომხმარებლები", "Custom features", "E-commerce ინტეგრაცია"],
      },
    },
    faq: [
      { question: "როგორ მუშაობს ინვენტარის მართვა?", answer: "სისტემა ავტომატურად აკონტროლებს ინვენტარს და გაგზავნის შეტყობინებებს დაბალი მარაგის შემთხვევაში." },
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
  // All other modules (including hotel) use Landing's signup
  return `/auth/signup?module=${moduleSlug}&plan=${plan}`;
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
                  disabled={moduleSlug !== "brewery" && moduleSlug !== "hotel"}
                  asChild={moduleSlug === "brewery" || moduleSlug === "hotel"}
                >
                  {moduleSlug === "brewery" || moduleSlug === "hotel" ? (
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
                  disabled={moduleSlug !== "brewery" && moduleSlug !== "hotel"}
                  asChild={moduleSlug === "brewery" || moduleSlug === "hotel"}
                >
                  {moduleSlug === "brewery" || moduleSlug === "hotel" ? (
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
                  disabled={moduleSlug !== "brewery" && moduleSlug !== "hotel"}
                  asChild={moduleSlug === "brewery" || moduleSlug === "hotel"}
                >
                  {moduleSlug === "brewery" || moduleSlug === "hotel" ? (
                    <Link href={getRegistrationUrl(moduleSlug, "ENTERPRISE")}>არჩევა</Link>
                  ) : (
                    <span>არჩევა</span>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

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