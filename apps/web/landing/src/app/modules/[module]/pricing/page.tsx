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

const moduleData: Record<string, {
  name: string;
  description: string;
  icon: string;
  pricing?: {
    starter: { title: string; subtitle: string; price: string; duration: string };
    professional: { title: string; subtitle: string; price: string; duration: string };
    enterprise: { title: string; subtitle: string; price: string; duration: string };
  };
  features: {
    starter: string[];
    professional: string[];
    enterprise: string[];
  };
  faq: { question: string; answer: string }[];
}> = {
  hotel: {
    name: "სასტუმროს მართვის სისტემა",
    description: "სრულყოფილი გადაწყვეტა სასტუმროების მართვისთვის",
    icon: "🏨",
    pricing: {
      starter: { title: "Starter", subtitle: "დაწყებისთვის", price: "უფასო", duration: "15 დღე საცდელი" },
      professional: { title: "Professional", subtitle: "პროფესიონალური ბიზნესისთვის", price: "₾99", duration: "/თვე" },
      enterprise: { title: "Enterprise", subtitle: "დიდი ბიზნესისთვის", price: "₾299", duration: "/თვე" },
    },
    features: {
      starter: ["1 ლოკაცია", "10 ოთახი", "რეზერვაციების მართვა", "ძირითადი ანალიტიკა"],
      professional: ["1 ლოკაცია", "25 ოთახი", "ყველა ფუნქცია", "24/7 მხარდაჭერა", "ინტეგრაციები"],
      enterprise: ["მრავალი ლოკაცია", "ულიმიტო ოთახები", "Custom features", "Dedicated support", "API access"],
    },
    faq: [
      { question: "როგორ მუშაობს რეზერვაციების სისტემა?", answer: "ჩვენი სისტემა საშუალებას გაძლევთ მარტივად მართოთ ოთახების რეზერვაციები, ჩეკ-ინ/ჩეკ-აუთი და მეტი." },
      { question: "შემიძლია სხვადასხვა ლოკაციის მართვა?", answer: "Enterprise გეგმაში შედის მრავალი ლოკაციის მართვის შესაძლებლობა." },
    ],
  },
  restaurant: {
    name: "რესტორნის მართვის სისტემა",
    description: "რესტორნის ყველა ასპექტის მართვა ერთ ადგილას",
    icon: "🍽️",
    pricing: {
      starter: { title: "Starter", subtitle: "დაწყებისთვის", price: "უფასო", duration: "15 დღე საცდელი" },
      professional: { title: "Professional", subtitle: "პროფესიონალური ბიზნესისთვის", price: "₾99", duration: "/თვე" },
      enterprise: { title: "Enterprise", subtitle: "დიდი ბიზნესისთვის", price: "₾299", duration: "/თვე" },
    },
    features: {
      starter: ["1 ლოკაცია", "20 მაგიდა", "შეკვეთების მართვა", "ძირითადი მენიუ"],
      professional: ["1 ლოკაცია", "50 მაგიდა", "ყველა ფუნქცია", "POS ინტეგრაცია", "ანალიტიკა"],
      enterprise: ["მრავალი ლოკაცია", "ულიმიტო მაგიდები", "Custom features", "Multi-language", "API access"],
    },
    faq: [{ question: "როგორ მუშაობს მაგიდების რეზერვაცია?", answer: "სისტემა საშუალებას გაძლევთ მარტივად მართოთ მაგიდების რეზერვაციები და შეკვეთები." }],
  },
  beauty: {
    name: "სილამაზის სალონის მართვა",
    description: "კლიენტების, ვიზიტებისა და ფინანსების მართვა",
    icon: "💅",
    pricing: {
      starter: { title: "Starter", subtitle: "დაწყებისთვის", price: "უფასო", duration: "15 დღე საცდელი" },
      professional: { title: "Professional", subtitle: "პროფესიონალური ბიზნესისთვის", price: "₾99", duration: "/თვე" },
      enterprise: { title: "Enterprise", subtitle: "დიდი ბიზნესისთვის", price: "₾299", duration: "/თვე" },
    },
    features: {
      starter: ["1 ლოკაცია", "500 კლიენტი", "ვიზიტების მართვა", "ძირითადი ანალიტიკა"],
      professional: ["1 ლოკაცია", "ულიმიტო კლიენტი", "ყველა ფუნქცია", "SMS შეტყობინებები", "ანალიტიკა"],
      enterprise: ["მრავალი ლოკაცია", "ულიმიტო კლიენტი", "Custom features", "Marketing tools", "API access"],
    },
    faq: [{ question: "შემიძლია SMS შეტყობინებების გაგზავნა?", answer: "დიახ, Professional და Enterprise გეგმებში შედის SMS შეტყობინებების ფუნქცია." }],
  },
  shop: {
    name: "მაღაზიის მართვის სისტემა",
    description: "ინვენტარის, გაყიდვებისა და მომხმარებლების მართვა",
    icon: "🛍️",
    pricing: {
      starter: { title: "Starter", subtitle: "დაწყებისთვის", price: "უფასო", duration: "15 დღე საცდელი" },
      professional: { title: "Professional", subtitle: "პროფესიონალური ბიზნესისთვის", price: "₾99", duration: "/თვე" },
      enterprise: { title: "Enterprise", subtitle: "დიდი ბიზნესისთვის", price: "₾299", duration: "/თვე" },
    },
    features: {
      starter: ["1 ლოკაცია", "1000 პროდუქტი", "ინვენტარის მართვა", "ძირითადი ანალიტიკა"],
      professional: ["1 ლოკაცია", "ულიმიტო პროდუქტი", "ყველა ფუნქცია", "POS ინტეგრაცია", "ანალიტიკა"],
      enterprise: ["მრავალი ლოკაცია", "ულიმიტო პროდუქტი", "Custom features", "Multi-warehouse", "API access"],
    },
    faq: [{ question: "როგორ მუშაობს ინვენტარის მართვა?", answer: "სისტემა ავტომატურად აკონტროლებს ინვენტარს და გაგზავნის შეტყობინებებს დაბალი მარაგის შემთხვევაში." }],
  },
  brewery: {
    name: "ლუდსახარშის მართვა",
    description: "წარმოების, ინვენტარისა და გაყიდვების მართვა",
    icon: "🍺",
    pricing: {
      starter: { title: "🟢 STARTER — პატარა წარმოება", subtitle: "👉 მცირე ლუდსახარში / brewpub", price: "29 ₾", duration: " / თვე" },
      professional: { title: "🔵 PRO ⭐ — საშუალო წარმოება", subtitle: "", price: "59 ₾", duration: " / თვე" },
      enterprise: { title: "ENTERPRISE — დიდი წარმოება", subtitle: "", price: "99 ₾", duration: " / თვე" },
    },
    features: {
      starter: ["მაქს. 5 ავზი", "წარმოების ძირითადი მართვა", "პარტიები, რეცეპტები", "Cloud access"],
      professional: ["6 – 14 ავზი", "წარმოების სრული მართვა", "მარაგები (ნედლეული, შეფუთვა, მზა პროდუქცია)", "CIP / ავზების რეცხვა", "კეგების მენეჯმენტი", "ფინანსები", "ანგარიშები და ანალიტიკა"],
      enterprise: ["15+ ავზი", "შეუზღუდავი ფუნქციები", "მომხმარებლის როლები", "გაფართოებული ანალიტიკა", "პრიორიტეტული მხარდაჭერა"],
    },
    faq: [{ question: "როგორ მუშაობს რეცეპტების მართვა?", answer: "სისტემა საშუალებას გაძლევთ შექმნათ და მართოთ ლუდის რეცეპტები, ინგრედიენტები და წარმოების პროცესები." }],
  },
  winery: {
    name: "ღვინის მარანის მართვა",
    description: "ვენახების, წარმოებისა და ბარელების მართვა",
    icon: "🍷",
    pricing: {
      starter: { title: "Starter", subtitle: "დაწყებისთვის", price: "უფასო", duration: "15 დღე საცდელი" },
      professional: { title: "Professional", subtitle: "პროფესიონალური ბიზნესისთვის", price: "₾99", duration: "/თვე" },
      enterprise: { title: "Enterprise", subtitle: "დიდი ბიზნესისთვის", price: "₾299", duration: "/თვე" },
    },
    features: {
      starter: ["1 ლოკაცია", "10 ვარიანტი", "წარმოების მართვა", "ძირითადი ანალიტიკა"],
      professional: ["1 ლოკაცია", "ულიმიტო ვარიანტი", "ყველა ფუნქცია", "ბარელების მართვა", "ანალიტიკა"],
      enterprise: ["მრავალი ლოკაცია", "ულიმიტო ვარიანტი", "Custom features", "Aging tracking", "API access"],
    },
    faq: [{ question: "როგორ მუშაობს ბარელების მართვა?", answer: "სისტემა საშუალებას გაძლევთ მართოთ ბარელები, მათი ასაკი და ლოკაცია." }],
  },
  distillery: {
    name: "არყის საწარმოს მართვა",
    description: "დისტილაციის, ბარელებისა და გაყიდვების მართვა",
    icon: "🥃",
    pricing: {
      starter: { title: "Starter", subtitle: "დაწყებისთვის", price: "უფასო", duration: "15 დღე საცდელი" },
      professional: { title: "Professional", subtitle: "პროფესიონალური ბიზნესისთვის", price: "₾99", duration: "/თვე" },
      enterprise: { title: "Enterprise", subtitle: "დიდი ბიზნესისთვის", price: "₾299", duration: "/თვე" },
    },
    features: {
      starter: ["1 ლოკაცია", "10 რეცეპტი", "წარმოების მართვა", "ძირითადი ანალიტიკა"],
      professional: ["1 ლოკაცია", "ულიმიტო რეცეპტი", "ყველა ფუნქცია", "ბარელების მართვა", "ანალიტიკა"],
      enterprise: ["მრავალი ლოკაცია", "ულიმიტო რეცეპტი", "Custom features", "Aging tracking", "API access"],
    },
    faq: [{ question: "როგორ მუშაობს დისტილაციის პროცესების მართვა?", answer: "სისტემა საშუალებას გაძლევთ მართოთ დისტილაციის პროცესები, რეცეპტები და ბარელების ასაკი." }],
  },
};

function getRegistrationUrl(moduleSlug: string, plan: string): string {
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

  if (!modules.includes(params.module)) {
    notFound();
  }

  const data = moduleData[params.module];
  const moduleSlug = params.module;

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
            <div className="text-6xl mb-6">{data.icon}</div>
            <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {data.name}
            </h1>
            <p className="text-xl text-muted-foreground mb-8">{data.description}</p>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {/* Starter */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-2xl">{data.pricing?.starter.title || "Starter"}</CardTitle>
                <CardDescription>{data.pricing?.starter.subtitle || "დაწყებისთვის"}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <span className="text-4xl font-bold">{data.pricing?.starter.price || "უფასო"}</span>
                  <span className="text-muted-foreground">{data.pricing?.starter.duration || "15 დღე საცდელი"}</span>
                </div>
                <ul className="space-y-3 mb-6">
                  {data.features.starter.map((feature, index) => (
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
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                  ყველაზე პოპულარული
                </span>
              </div>
              <CardHeader>
                <CardTitle className="text-2xl">{data.pricing?.professional.title || "Professional"}</CardTitle>
                <CardDescription>{data.pricing?.professional.subtitle || "პროფესიონალური ბიზნესისთვის"}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <span className="text-4xl font-bold">{data.pricing?.professional.price || "₾99"}</span>
                  <span className="text-muted-foreground">{data.pricing?.professional.duration || "/თვე"}</span>
                </div>
                <ul className="space-y-3 mb-6">
                  {data.features.professional.map((feature, index) => (
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
                <CardTitle className="text-2xl">{data.pricing?.enterprise.title || "Enterprise"}</CardTitle>
                <CardDescription>{data.pricing?.enterprise.subtitle || "დიდი ბიზნესისთვის"}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <span className="text-4xl font-bold">{data.pricing?.enterprise.price || "₾299"}</span>
                  <span className="text-muted-foreground">{data.pricing?.enterprise.duration || "/თვე"}</span>
                </div>
                <ul className="space-y-3 mb-6">
                  {data.features.enterprise.map((feature, index) => (
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
              {data.faq.map((item, index) => (
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
