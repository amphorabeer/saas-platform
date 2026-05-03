"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@saas-platform/ui";
import { useTheme } from "next-themes";
import { Moon, Sun, Menu, X, Globe } from "lucide-react";
import { locales, localeNames, localeFlags, type Locale } from "../i18n";

export function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const t = useTranslations("Navigation");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  const menuItems = [
    { label: t("home"), href: "/" },
    { label: t("modules"), href: "#modules" },
  ];

  // ⚡ Language switcher
  const switchLocale = (newLocale: Locale) => {
    // pathname არის მაგ. "/ka/auth/login" ან "/en"
    // უნდა შევცვალოთ პირველი segment newLocale-ით
    const segments = (pathname ?? "/").split("/");
    if (segments[1] && locales.includes(segments[1] as Locale)) {
      segments[1] = newLocale;
    } else {
      segments.splice(1, 0, newLocale);
    }
    const newPath = segments.join("/") || `/${newLocale}`;
    router.push(newPath);
    setLangMenuOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 text-xl font-bold">
            <span className="text-2xl" aria-hidden="true">🚀</span>
            <span>GeoBiz</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-6">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-4">
            {/* Auth Buttons - Desktop */}
            <div className="hidden md:flex items-center gap-3">
              <Button variant="ghost" asChild>
                <Link href="/auth/login">{t("login")}</Link>
              </Button>
              <Button asChild>
                <Link href="/auth/signup">{t("signup")}</Link>
              </Button>
            </div>

            {/* Theme Toggle + Language + Mobile Menu */}
            {mounted ? (
              <>
                {/* Language Switcher */}
                <div className="relative">
                  <button
                    onClick={() => setLangMenuOpen(!langMenuOpen)}
                    className="flex items-center gap-1 p-2 rounded-lg hover:bg-muted transition-colors"
                    aria-label={t("switchLanguage")}
                    aria-expanded={langMenuOpen}
                  >
                    <Globe className="h-5 w-5" />
                    <span className="hidden sm:inline text-sm font-medium uppercase">
                      {locale}
                    </span>
                  </button>

                  {langMenuOpen && (
                    <>
                      {/* Backdrop */}
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setLangMenuOpen(false)}
                        aria-hidden="true"
                      />
                      {/* Dropdown */}
                      <div className="absolute right-0 mt-2 py-1 w-40 bg-background border rounded-lg shadow-lg z-50">
                        {locales.map((loc) => (
                          <button
                            key={loc}
                            onClick={() => switchLocale(loc)}
                            className={`w-full px-4 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2 ${
                              loc === locale ? "font-semibold" : ""
                            }`}
                          >
                            <span aria-hidden="true">{localeFlags[loc]}</span>
                            <span>{localeNames[loc]}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Dark Mode Toggle */}
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                  aria-label={t("toggleTheme")}
                >
                  {theme === "dark" ? (
                    <Sun className="h-5 w-5" />
                  ) : (
                    <Moon className="h-5 w-5" />
                  )}
                </button>

                {/* Mobile Menu Button */}
                <button
                  className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  aria-label={t("toggleMenu")}
                >
                  {mobileMenuOpen ? (
                    <X className="h-5 w-5" />
                  ) : (
                    <Menu className="h-5 w-5" />
                  )}
                </button>
              </>
            ) : (
              <>
                {/* Placeholders */}
                <div className="p-2 w-9 h-9" aria-hidden="true" />
                <div className="p-2 w-9 h-9" aria-hidden="true" />
                <div className="md:hidden p-2 w-9 h-9" aria-hidden="true" />
              </>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {mounted && mobileMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <div className="flex flex-col gap-4">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm font-medium hover:text-primary transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <div className="flex flex-col gap-2 pt-4 border-t">
                <Button variant="ghost" asChild className="w-full">
                  <Link
                    href="/auth/login"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t("login")}
                  </Link>
                </Button>
                <Button asChild className="w-full">
                  <Link
                    href="/auth/signup"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t("signup")}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
