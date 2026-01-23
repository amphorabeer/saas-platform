"use client";

import { useState, useEffect } from "react";
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

// Default fallback data (used if API doesn't return data)
const defaultModuleData: Record<string, {
  name: string;
  description: string;
  icon: string;
  faq: { question: string; answer: string }[];
}> = {
  hotel: {
    name: "სასტუმროს მართვის სისტემა",
    description: "სრულყოფილი გადაწყვეტა სასტუმროების მართვისთვის",
    icon: "🏨",
    faq: [
      { question: "როგორ მუშაობს რეზერვაციების სისტემა?", answer: "ჩვენი სისტემა საშუალებას გაძლევთ მარტივად მართოთ ოთახების რეზერვაციები, ჩეკ-ინ/ჩეკ-აუთი და მეტი." },
      { question: "შემიძლია სხვადასხვა ლოკაციის მართვა?", answer: "Enterprise გეგმაში შედის მრავალი ლოკაციის მართვის შესაძლებლობა." },
    ],
  },
  restaurant: {
    name: "რესტორნის მართვის სისტემა",
    description: "რესტორნის ყველა ასპექტის მართვა ერთ ადგილას",
    icon: "🍽️",
    faq: [{ question: "როგორ მუშაობს მაგიდების რეზერვაცია?", answer: "სისტემა საშუალებას გაძლევთ მარტივად მართოთ მაგიდების რეზერვაციები და შეკვეთები." }],
  },
  beauty: {
    name: "სილამაზის სალონის მართვა",
    description: "კლიენტების, ვიზიტებისა და ფინანსების მართვა",
    icon: "💅",
    faq: [{ question: "შემიძლია SMS შეტყობინებების გაგზავნა?", answer: "დიახ, Professional და Enterprise გეგმებში შედის SMS შეტყობინებების ფუნქცია." }],
  },
  shop: {
    name: "მაღაზიის მართვის სისტემა",
    description: "ინვენტარის, გაყიდვებისა და მომხმარებლების მართვა",
    icon: "🛍️",
    faq: [{ question: "როგორ მუშაობს ინვენტარის მართვა?", answer: "სისტემა ავტომატურად აკონტროლებს ინვენტარს და გაგზავნის შეტყობინებებს დაბალი მარაგის შემთხვევაში." }],
  },
  brewery: {
    name: "ლუდსახარშის მართვა",
    description: "წარმოების, ინვენტარისა და გაყიდვების მართვა",
    icon: "🍺",
    faq: [{ question: "როგორ მუშაობს რეცეპტების მართვა?", answer: "სისტემა საშუალებას გაძლევთ შექმნათ და მართოთ ლუდის რეცეპტები, ინგრედიენტები და წარმოების პროცესები." }],
  },
  winery: {
    name: "ღვინის მარანის მართვა",
    description: "ვენახების, წარმოებისა და ბარელების მართვა",
    icon: "🍷",
    faq: [{ question: "როგორ მუშაობს ბარელების მართვა?", answer: "სისტემა საშუალებას გაძლევთ მართოთ ბარელები, მათი ასაკი და ლოკაცია." }],
  },
  distillery: {
    name: "არყის საწარმოს მართვა",
    description: "დისტილაციის, ბარელებისა და გაყიდვების მართვა",
    icon: "🥃",
    faq: [{ question: "როგორ მუშაობს დისტილაციის პროცესების მართვა?", answer: "სისტემა საშუალებას გაძლევთ მართოთ დისტილაციის პროცესები, რეცეპტები და ბარელების ასაკი." }],
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
  const appUrl = moduleAppUrls[moduleSlug];
  if (appUrl) {
    return `${appUrl}/register?plan=${plan}`;
  }
  return `/auth/signup?module=${moduleSlug}&plan=${plan}`;
}

export default function ModulePricingPage({ params }: { params: { module: string } }) {
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  
  const moduleSlug = params.module;
  const defaultData = defaultModuleData[moduleSlug];
  
  // Dynamic data from API
  const [moduleName, setModuleName] = useState(defaultData?.name || "");
  const [moduleDescription, setModuleDescription] = useState(defaultData?.description || "");
  const [moduleIcon, setModuleIcon] = useState(defaultData?.icon || "📦");
  const [pricing, setPricing] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load data from API
  useEffect(() => {
    async function loadModuleData() {
      try {
        const response = await fetch("/api/modules");
        if (response.ok) {
          const data = await response.json();
          if (data.modules && Array.isArray(data.modules)) {
            // Find this module's data
            const moduleData = data.modules.find((m: any) => m.id === moduleSlug || m.slug === moduleSlug);
            if (moduleData) {
              console.log("✅ Loaded module data from API for", moduleSlug, moduleData);
              
              // Update module info
              if (moduleData.name) setModuleName(moduleData.name);
              if (moduleData.description) setModuleDescription(moduleData.description);
              if (moduleData.icon) setModuleIcon(moduleData.icon);
              
              // Update pricing
              if (moduleData.pricing) {
                console.log("✅ Loaded pricing:", moduleData.pricing);
                setPricing(moduleData.pricing);
              }
            }
          }
        }
      } catch (error) {
        console.error("Failed to load module data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadModuleData();
  }, [moduleSlug]);

  if (!modules.includes(params.module)) {
    notFound();
  }

  // Get pricing data - from API or fallback
  const starterPricing = pricing?.starter || { price: "უფასო", duration: "15 დღე", features: ["1 ლოკაცია", "ძირითადი ფუნქციები"] };
  const professionalPricing = pricing?.professional || { price: "₾99", features: ["ყველა ფუნქცია", "24/7 მხარდაჭერა"] };
  const enterprisePricing = pricing?.enterprise || { price: "₾299", features: ["მრავალი ლოკაცია", "Custom features"] };

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
        <div className="container mx-auto px-4 py-6">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              უკან
            </Link>
          </Button>
        </div>

        {/* Hero Section */}
        <section className="container mx-auto px-4 py-12 md:py-16">
          <div className="text-center max-w-3xl mx-auto">
            <div className="text-6xl mb-6">{moduleIcon}</div>
            <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {moduleName}
            </h1>
            <p className="text-xl text-muted-foreground mb-8">{moduleDescription}</p>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="container mx-auto px-4 py-12">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {/* Starter */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-2xl">{starterPricing.name || "Starter"}</CardTitle>
                  <CardDescription>დაწყებისთვის</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <span className="text-4xl font-bold">{starterPricing.price}</span>
                    <span className="text-muted-foreground">{starterPricing.duration ? ` ${starterPricing.duration}` : ""}</span>
                  </div>
                  <ul className="space-y-3 mb-6">
                    {(starterPricing.features || []).map((feature: string, index: number) => (
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
                {professionalPricing.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                      ყველაზე პოპულარული
                    </span>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl">{professionalPricing.name || "Professional"}</CardTitle>
                  <CardDescription>პროფესიონალური ბიზნესისთვის</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <span className="text-4xl font-bold">{professionalPricing.price}</span>
                    <span className="text-muted-foreground">/თვე</span>
                  </div>
                  <ul className="space-y-3 mb-6">
                    {(professionalPricing.features || []).map((feature: string, index: number) => (
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
                  <CardTitle className="text-2xl">{enterprisePricing.name || "Enterprise"}</CardTitle>
                  <CardDescription>დიდი ბიზნესისთვის</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <span className="text-4xl font-bold">{enterprisePricing.price}</span>
                    <span className="text-muted-foreground">/თვე</span>
                  </div>
                  <ul className="space-y-3 mb-6">
                    {(enterprisePricing.features || []).map((feature: string, index: number) => (
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
          )}
        </section>

        {/* FAQ Section */}
        <section className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-8">ხშირად დასმული კითხვები</h2>
            <div className="space-y-4">
              {(defaultData?.faq || []).map((item, index) => (
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