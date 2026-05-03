"use client";

import { useState, type FormEvent } from "react";
import { notFound, useParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@saas-platform/ui";
import { Navigation } from "../../../../../components/navigation";
import { ArrowLeft, Loader2, CheckCircle } from "lucide-react";

const modules = [
  "hotel",
  "restaurant",
  "beauty",
  "shop",
  "brewery",
  "winery",
  "distillery",
] as const;

type ModuleSlug = (typeof modules)[number];

// Static data — does not change per locale
const moduleIcons: Record<ModuleSlug, string> = {
  hotel: "🏨",
  restaurant: "🍽️",
  beauty: "💅",
  shop: "🛍️",
  brewery: "🍺",
  winery: "🍷",
  distillery: "🥃",
};

// Pricing — keys vary across modules; "free" is translated separately
const modulePrices: Record<
  ModuleSlug,
  {
    starter: { price: string; freeKey?: boolean };
    professional: { price: string };
    enterprise: { price: string };
  }
> = {
  hotel: {
    starter: { price: "₾35" },
    professional: { price: "₾69" },
    enterprise: { price: "₾99" },
  },
  brewery: {
    starter: { price: "₾25" },
    professional: { price: "₾69" },
    enterprise: { price: "₾99" },
  },
  restaurant: {
    starter: { price: "", freeKey: true },
    professional: { price: "₾79" },
    enterprise: { price: "₾149" },
  },
  beauty: {
    starter: { price: "", freeKey: true },
    professional: { price: "₾69" },
    enterprise: { price: "₾129" },
  },
  shop: {
    starter: { price: "₾40" },
    professional: { price: "₾80" },
    enterprise: { price: "₾150" },
  },
  winery: {
    starter: { price: "", freeKey: true },
    professional: { price: "₾99" },
    enterprise: { price: "₾299" },
  },
  distillery: {
    starter: { price: "", freeKey: true },
    professional: { price: "₾99" },
    enterprise: { price: "₾299" },
  },
};

const moduleAppUrls: Record<ModuleSlug, string> = {
  hotel: process.env.NEXT_PUBLIC_HOTEL_URL || "https://saas-hotel.vercel.app",
  brewery:
    process.env.NEXT_PUBLIC_BREWERY_URL || "https://brewmaster-pro.vercel.app",
  winery: process.env.NEXT_PUBLIC_WINERY_URL || "",
  restaurant: "",
  beauty: process.env.NEXT_PUBLIC_BEAUTY_URL || "",
  shop: "",
  distillery: "",
};

function getRegistrationUrl(moduleSlug: string, plan: string): string {
  if (moduleSlug === "brewery") {
    const appUrl = moduleAppUrls[moduleSlug as ModuleSlug];
    if (appUrl) {
      return `${appUrl}/register?plan=${plan}`;
    }
  }
  return `/auth/signup?module=${moduleSlug}&plan=${plan}`;
}

function hasRegistrationFlow(moduleSlug: string): boolean {
  return ["brewery", "hotel", "shop", "restaurant", "beauty"].includes(
    moduleSlug,
  );
}

export default function ModulePricingPage() {
  const params = useParams();
  const moduleSlug = params?.module as string;

  const tPricing = useTranslations("Pricing");

  // Translations for module data — must call hook unconditionally
  const safeModule = (
    modules.includes(moduleSlug as ModuleSlug) ? moduleSlug : "hotel"
  ) as ModuleSlug;
  const tModule = useTranslations(`Modules2.${safeModule}`);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "success" | "error"
  >("idle");

  if (!modules.includes(moduleSlug as ModuleSlug)) {
    notFound();
  }

  const validModule = moduleSlug as ModuleSlug;
  const icon = moduleIcons[validModule];
  const prices = modulePrices[validModule];

  const getPrice = (priceData: { price: string; freeKey?: boolean }) =>
    priceData.freeKey ? tPricing("free") : priceData.price;

  const starterFeatures = tModule.raw("starterFeatures") as string[];
  const professionalFeatures = tModule.raw(
    "professionalFeatures",
  ) as string[];
  const enterpriseFeatures = tModule.raw("enterpriseFeatures") as string[];
  const faq = tModule.raw("faq") as { q: string; a: string }[];

  const handleSubmit = async (e: FormEvent) => {
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
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" asChild className="mb-2">
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {tPricing("back")}
            </Link>
          </Button>
        </div>

        <section className="container mx-auto px-4 py-4 md:py-6">
          <div className="max-w-4xl mx-auto text-center">
            <span className="text-5xl mb-3 block" aria-hidden="true">
              {icon}
            </span>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              {tModule("name")}
            </h1>
            <p className="text-lg text-muted-foreground mb-4">
              {tModule("description")}
            </p>
          </div>
        </section>

        <section className="container mx-auto px-4 py-6">
          <h2 className="text-2xl font-bold text-center mb-2">
            {tPricing("pricesTitle")}
          </h2>
          <p className="text-center text-muted-foreground mb-8">
            {tPricing("pricesSubtitle")}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-2xl">Starter</CardTitle>
                <CardDescription>{tPricing("starterFor")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <span className="text-4xl font-bold">
                    {getPrice(prices.starter)}
                  </span>
                  <span className="text-muted-foreground ml-2">
                    / {tModule("starterDuration")}
                  </span>
                </div>
                <ul className="space-y-3 mb-6">
                  {starterFeatures.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <span className="text-green-600 mr-2" aria-hidden="true">
                        ✓
                      </span>
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
                    <Link href={getRegistrationUrl(moduleSlug, "STARTER")}>
                      {tPricing("ctaStart")}
                    </Link>
                  ) : (
                    <span>{tPricing("ctaStart")}</span>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow border-2 border-primary relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                  {tPricing("mostPopular")}
                </span>
              </div>
              <CardHeader>
                <CardTitle className="text-2xl">Professional</CardTitle>
                <CardDescription>
                  {tPricing("professionalFor")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <span className="text-4xl font-bold">
                    {prices.professional.price}
                  </span>
                  <span className="text-muted-foreground">
                    {tPricing("perMonth")}
                  </span>
                </div>
                <ul className="space-y-3 mb-6">
                  {professionalFeatures.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <span className="text-green-600 mr-2" aria-hidden="true">
                        ✓
                      </span>
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
                    <Link
                      href={getRegistrationUrl(moduleSlug, "PROFESSIONAL")}
                    >
                      {tPricing("ctaSelect")}
                    </Link>
                  ) : (
                    <span>{tPricing("ctaSelect")}</span>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-2xl">Enterprise</CardTitle>
                <CardDescription>{tPricing("enterpriseFor")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <span className="text-4xl font-bold">
                    {prices.enterprise.price}
                  </span>
                  <span className="text-muted-foreground">
                    {tPricing("perMonth")}
                  </span>
                </div>
                <ul className="space-y-3 mb-6">
                  {enterpriseFeatures.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <span className="text-green-600 mr-2" aria-hidden="true">
                        ✓
                      </span>
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
                    <Link href={getRegistrationUrl(moduleSlug, "ENTERPRISE")}>
                      {tPricing("ctaSelect")}
                    </Link>
                  ) : (
                    <span>{tPricing("ctaSelect")}</span>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {validModule === "hotel" && (
          <section className="container mx-auto px-4 py-12 bg-muted/30">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-4">
                {tPricing("hotelFeaturesTitle")}
              </h2>
              <p className="text-center text-muted-foreground mb-10">
                {tPricing("hotelFeaturesSubtitle")}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="hover:shadow-lg transition-shadow border-2 border-blue-200">
                  <CardHeader>
                    <div className="text-4xl mb-2" aria-hidden="true">
                      🔗
                    </div>
                    <CardTitle className="text-xl">
                      {tPricing("channelManager.title")}
                    </CardTitle>
                    <CardDescription>
                      {tPricing("channelManager.subtitle")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      {tPricing("channelManager.description")}
                    </p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center">
                        <span className="text-green-600 mr-2">✓</span>
                        {tPricing("channelManager.feature1")}
                      </li>
                      <li className="flex items-center">
                        <span className="text-green-600 mr-2">✓</span>
                        {tPricing("channelManager.feature2")}
                      </li>
                      <li className="flex items-center">
                        <span className="text-green-600 mr-2">✓</span>
                        {tPricing("channelManager.feature3")}
                      </li>
                      <li className="flex items-center">
                        <span className="text-green-600 mr-2">✓</span>
                        {tPricing("channelManager.feature4")}
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow border-2 border-purple-200">
                  <CardHeader>
                    <div className="text-4xl mb-2" aria-hidden="true">
                      🤖
                    </div>
                    <CardTitle className="text-xl">
                      {tPricing("messengerBot.title")}
                    </CardTitle>
                    <CardDescription>
                      {tPricing("messengerBot.subtitle")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      {tPricing("messengerBot.description")}
                    </p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center">
                        <span className="text-green-600 mr-2">✓</span>
                        {tPricing("messengerBot.feature1")}
                      </li>
                      <li className="flex items-center">
                        <span className="text-green-600 mr-2">✓</span>
                        {tPricing("messengerBot.feature2")}
                      </li>
                      <li className="flex items-center">
                        <span className="text-green-600 mr-2">✓</span>
                        {tPricing("messengerBot.feature3")}
                      </li>
                      <li className="flex items-center">
                        <span className="text-green-600 mr-2">✓</span>
                        {tPricing("messengerBot.feature4")}
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
        )}

        {validModule === "shop" && (
          <section className="container mx-auto px-4 py-12 bg-muted/30">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-4">
                {tPricing("shopFeaturesTitle")}
              </h2>
              <p className="text-center text-muted-foreground mb-10">
                {tPricing("shopFeaturesSubtitle")}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Card className="hover:shadow-lg transition-shadow border-2 border-blue-200">
                  <CardHeader>
                    <div className="text-4xl mb-2" aria-hidden="true">
                      🧾
                    </div>
                    <CardTitle className="text-xl">
                      {tPricing("fiscal.title")}
                    </CardTitle>
                    <CardDescription>
                      {tPricing("fiscal.subtitle")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm">
                      {tPricing("fiscal.description")}
                    </p>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow border-2 border-green-200">
                  <CardHeader>
                    <div className="text-4xl mb-2" aria-hidden="true">
                      📟
                    </div>
                    <CardTitle className="text-xl">
                      {tPricing("hardware.title")}
                    </CardTitle>
                    <CardDescription>
                      {tPricing("hardware.subtitle")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm">
                      {tPricing("hardware.description")}
                    </p>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow border-2 border-purple-200">
                  <CardHeader>
                    <div className="text-4xl mb-2" aria-hidden="true">
                      📊
                    </div>
                    <CardTitle className="text-xl">
                      {tPricing("rsge.title")}
                    </CardTitle>
                    <CardDescription>
                      {tPricing("rsge.subtitle")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm">
                      {tPricing("rsge.description")}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
        )}

        <section className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-8">
              {tPricing("faqTitle")}
            </h2>
            <div className="space-y-4">
              {faq.map((item, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="text-lg">{item.q}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{item.a}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-3xl text-center">
                {tPricing("contactTitle")}
              </CardTitle>
              <CardDescription className="text-center">
                {tPricing("contactSubtitle")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {submitStatus === "success" ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">
                    {tPricing("contactSuccess")}
                  </h3>
                  <p className="text-muted-foreground">
                    {tPricing("contactSuccessText")}
                  </p>
                  <Button
                    className="mt-4"
                    variant="outline"
                    onClick={() => setSubmitStatus("idle")}
                  >
                    {tPricing("contactNewMessage")}
                  </Button>
                </div>
              ) : (
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div className="space-y-2">
                    <Label htmlFor="name">{tPricing("contactName")}</Label>
                    <Input
                      id="name"
                      placeholder={tPricing("contactNamePlaceholder")}
                      className="min-h-[44px]"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{tPricing("contactEmail")}</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder={tPricing("contactEmailPlaceholder")}
                      className="min-h-[44px]"
                      required
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">{tPricing("contactPhone")}</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder={tPricing("contactPhonePlaceholder")}
                      className="min-h-[44px]"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">
                      {tPricing("contactMessage")}
                    </Label>
                    <textarea
                      id="message"
                      rows={4}
                      className="w-full px-3 py-2 border rounded-md min-h-[100px]"
                      placeholder={tPricing("contactMessagePlaceholder")}
                      required
                      value={formData.message}
                      onChange={(e) =>
                        setFormData({ ...formData, message: e.target.value })
                      }
                    />
                  </div>
                  {submitStatus === "error" && (
                    <p className="text-red-500 text-sm">
                      {tPricing("contactError")}
                    </p>
                  )}
                  <Button
                    type="submit"
                    className="w-full min-h-[44px]"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {tPricing("contactSending")}
                      </>
                    ) : (
                      tPricing("contactSubmit")
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
