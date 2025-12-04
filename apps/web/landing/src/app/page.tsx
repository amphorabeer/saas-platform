"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@saas-platform/ui";
import { Navigation } from "../components/navigation";
import { motion } from "framer-motion";
import { useInView } from "framer-motion";

const defaultModules = [
  {
    name: "სასტუმრო",
    slug: "hotel",
    description: "სრულყოფილი სისტემა სასტუმროების მართვისთვის - ოთახების რეზერვაცია, ჩეკ-ინ/ჩეკ-აუთი, ფასები და მეტი",
    icon: "🏨",
  },
  {
    name: "რესტორნი",
    slug: "restaurant",
    description: "რესტორნის მენეჯმენტი - მაგიდების რეზერვაცია, შეკვეთების მართვა, მენიუ და ანალიტიკა",
    icon: "🍽️",
  },
  {
    name: "სილამაზის სალონი",
    slug: "beauty",
    description: "სილამაზის სალონების მართვა - ვიზიტების დაგეგმვა, კლიენტების ბაზა, ფინანსური ანალიტიკა",
    icon: "💅",
  },
  {
    name: "მაღაზია",
    slug: "shop",
    description: "ინვენტარის მართვა, გაყიდვები, მომხმარებლები და ანალიტიკა ერთ ადგილას",
    icon: "🛍️",
  },
  {
    name: "სახლეულო",
    slug: "brewery",
    description: "სახლეულოს მართვა - წარმოების კონტროლი, ინვენტარი, გაყიდვები და ანალიტიკა",
    icon: "🍺",
  },
  {
    name: "ღვინის ქარხანა",
    slug: "winery",
    description: "ღვინის ქარხნის მართვა - ვენახების მონიტორინგი, წარმოება, ბარელები და გაყიდვები",
    icon: "🍷",
  },
  {
    name: "დისტილერია",
    slug: "distillery",
    description: "დისტილერიის მართვა - წარმოების პროცესები, ბარელების მართვა, გაყიდვები და ანალიტიკა",
    icon: "🥃",
  },
];

const defaultHeroContent = {
  title: "მოდულები",
  subtitle: "აირჩიეთ თქვენი ბიზნესისთვის შესაფერისი მოდული",
  stats: {
    businesses: "436+",
    transactions: "2.5M+",
    users: "12K+",
  },
};

const fadeInUp = {
  initial: { opacity: 0, y: 60 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
};

const staggerContainer = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const cardAnimation = {
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

function AnimatedCard({ children, index }: { children: React.ReactNode; index: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial="initial"
      animate={isInView ? "animate" : "initial"}
      variants={cardAnimation}
      transition={{ delay: index * 0.1 }}
      whileHover={{ scale: 1.05, y: -5 }}
      className="h-full"
    >
      {children}
    </motion.div>
  );
}

export default function Home() {
  const [modules, setModules] = useState(defaultModules);
  const [heroContent, setHeroContent] = useState(defaultHeroContent);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<"api" | "localStorage" | "defaults">("defaults");

  // Track if we've already logged to avoid spam
  const hasLoggedRef = useRef(false);

  // Load configuration from API (modules API or database) or localStorage
  const loadConfig = useCallback(async () => {
    try {
      if (typeof window === "undefined") return;

      // Try to load from new modules API first
      try {
        const modulesApiResponse = await fetch("/api/modules");
        if (modulesApiResponse.ok) {
          const modulesApiData = await modulesApiResponse.json();
          console.log("📡 Modules API Response:", {
            hasModules: !!modulesApiData.modules,
            modulesCount: modulesApiData.modules?.length || 0,
          });

          if (modulesApiData.modules && Array.isArray(modulesApiData.modules)) {
            const enabledModules = modulesApiData.modules
              .filter((m: any) => m && m.enabled !== false)
              .map((m: any) => ({
                name: m.name || "",
                slug: m.id || m.slug || "",
                description: m.description || "",
                icon: m.icon || "📦",
              }))
              .filter((m: any) => m.name && m.slug);

            console.log("✅ Enabled modules from /api/modules:", enabledModules.length, enabledModules);

            if (enabledModules.length > 0) {
              console.log("✅ Setting modules state from /api/modules:", enabledModules.length);
              setModules(enabledModules);
              setDataSource("api");
              return; // Successfully loaded from modules API
            }
          }
        }
      } catch (modulesApiError) {
        console.warn("⚠️ Modules API fetch failed, trying database API:", modulesApiError);
      }

      // Fallback to database API
      try {
        const [modulesResponse, heroResponse] = await Promise.all([
          fetch("/api/config?key=landing-modules"),
          fetch("/api/config?key=landing-hero"),
        ]);

        if (modulesResponse.ok) {
          const modulesData = await modulesResponse.json();
          console.log("📡 API Response for modules:", {
            key: modulesData.key,
            hasValue: modulesData.value !== null && modulesData.value !== undefined,
            valueType: typeof modulesData.value,
            isArray: Array.isArray(modulesData.value),
            valueLength: Array.isArray(modulesData.value) ? modulesData.value.length : "N/A"
          });
          
          // Check if we got valid data from API
          if (modulesData.value !== null && modulesData.value !== undefined) {
            if (Array.isArray(modulesData.value)) {
              const parsed = modulesData.value;
              console.log("📦 Parsed modules from API:", parsed.length, parsed);
              
              const enabledModules = parsed
                .filter((m: any) => m && m.enabled !== false)
                .map((m: any) => ({
                  name: m.name || "",
                  slug: m.id || m.slug || "",
                  description: m.description || "",
                  icon: m.icon || "📦",
                }))
                .filter((m: any) => m.name && m.slug);

              console.log("✅ Enabled modules after filtering:", enabledModules.length, enabledModules);

              if (enabledModules.length > 0) {
                console.log("✅ Setting modules state from database:", enabledModules.length);
                setModules(enabledModules);
                setDataSource("api");
                // Also save to localStorage for faster future loads
                localStorage.setItem("landing-modules", JSON.stringify(parsed));
                console.log("💾 Saved to localStorage for cache");
                return; // Successfully loaded from database
              } else {
                console.warn("⚠️ No enabled modules found after filtering");
              }
            } else {
              console.warn("⚠️ API returned non-array value:", typeof modulesData.value);
            }
          } else {
            // API returned null (database permission issue or no data)
            console.warn("⚠️ API returned null/undefined, falling back to localStorage");
          }
        } else {
          console.warn("⚠️ API request failed with status:", modulesResponse.status);
        }

        if (heroResponse.ok) {
          const heroData = await heroResponse.json();
          if (heroData.value && typeof heroData.value === "object") {
            setHeroContent(heroData.value);
            localStorage.setItem("landing-hero", JSON.stringify(heroData.value));
          }
        }
      } catch (apiError) {
        console.warn("⚠️ API fetch failed, trying localStorage:", apiError);
      }

      // Fallback to localStorage if API fails
      const savedModules = localStorage.getItem("landing-modules");
      console.log("💾 Checking localStorage:", {
        hasData: !!savedModules,
        dataLength: savedModules ? savedModules.length : 0
      });
      
      if (savedModules) {
        try {
          const parsedModules = JSON.parse(savedModules);
          console.log("📦 Parsed modules from localStorage:", {
            isArray: Array.isArray(parsedModules),
            length: Array.isArray(parsedModules) ? parsedModules.length : "N/A",
            data: parsedModules
          });
          
          // Ensure it's an array
          if (Array.isArray(parsedModules)) {
            // Filter only enabled modules and map to display format
            const enabledModules = parsedModules
              .filter((m: any) => m && m.enabled !== false) // Allow undefined as enabled
              .map((m: any) => ({
                name: m.name || "",
                slug: m.id || m.slug || "",
                description: m.description || "",
                icon: m.icon || "📦",
              }))
              .filter((m: any) => m.name && m.slug); // Remove invalid entries
            
            console.log("✅ Enabled modules from localStorage:", enabledModules.length, enabledModules);
            
            if (enabledModules.length > 0) {
              console.log("✅ Setting modules state from localStorage:", enabledModules.length);
              setModules(enabledModules);
              setDataSource("localStorage");
            } else {
              console.warn("⚠️ No enabled modules found after filtering, using defaults");
              setDataSource("defaults");
            }
          } else {
            console.warn("⚠️ Saved modules is not an array:", typeof parsedModules);
            setDataSource("defaults");
          }
        } catch (error) {
          console.error("❌ Error parsing saved modules:", error);
          setDataSource("defaults");
        }
      } else {
        // No data in API or localStorage, use defaults
        setDataSource("defaults");
        console.log("ℹ️ No saved modules found (checked API and localStorage), using defaults");
        console.log("💡 Save modules from Super Admin (http://localhost:3001) → Landing Editor");
        console.log("💡 Note: Super Admin and Landing Page are on different origins, so localStorage is not shared");
      }
    } catch (error) {
      console.error("❌ Error in loadConfig:", error);
    }
  }, []);

  // Check localStorage for saved configuration (for same-tab updates)
  const checkStorage = useCallback(() => {
    try {
      if (typeof window === "undefined") return;

      // Load modules from localStorage
      const savedModules = localStorage.getItem("landing-modules");
      if (savedModules) {
        try {
          const parsedModules = JSON.parse(savedModules);
          console.log("📦 [checkStorage] Loading modules from localStorage:", parsedModules);
          
          if (Array.isArray(parsedModules)) {
            const enabledModules = parsedModules
              .filter((m: any) => m && m.enabled !== false)
              .map((m: any) => ({
                name: m.name || "",
                slug: m.id || m.slug || "",
                description: m.description || "",
                icon: m.icon || "📦",
              }))
              .filter((m: any) => m.name && m.slug);
            
            console.log("✅ [checkStorage] Enabled modules:", enabledModules.length, enabledModules);
            
            if (enabledModules.length > 0) {
              setModules(enabledModules);
              setDataSource("localStorage");
            }
          }
        } catch (error) {
          console.error("❌ [checkStorage] Error parsing saved modules:", error);
        }
      }

      // Load hero content from localStorage
      const savedHero = localStorage.getItem("landing-hero");
      if (savedHero) {
        try {
          const parsedHero = JSON.parse(savedHero);
          if (parsedHero && typeof parsedHero === "object") {
            setHeroContent(parsedHero);
          }
        } catch (error) {
          console.error("❌ [checkStorage] Error parsing saved hero content:", error);
        }
      }

      // Load last updated timestamp
      const savedLastUpdated = localStorage.getItem("landing-last-updated");
      if (savedLastUpdated) {
        setLastUpdated(savedLastUpdated);
      }
    } catch (error) {
      console.error("❌ [checkStorage] Error in checkStorage:", error);
      // Don't break the page if localStorage fails
    }
  }, []);

  useEffect(() => {
    async function loadModules() {
      try {
        const response = await fetch('/api/modules')
        if (response.ok) {
          const data = await response.json()
          if (data.modules && Array.isArray(data.modules)) {
            const enabledModules = data.modules
              .filter((m: any) => m && m.isEnabled !== false)
              .map((m: any) => ({
                name: m.name || "",
                slug: m.id || m.slug || "",
                description: m.description || "",
                icon: m.icon || "📦",
              }))
              .filter((m: any) => m.name && m.slug);
            
            setModules(enabledModules);
            setDataSource("api");
            console.log("✅ Loaded modules from API:", enabledModules.length);
          }
        }
      } catch (error) {
        console.error('Failed to load modules:', error)
      }
    }
    
    // Load initially
    loadModules()
    
    // Check for updates every 2 seconds
    const interval = setInterval(loadModules, 2000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Navigation />
      {/* Refresh indicator - only visible in dev */}
      {process.env.NODE_ENV === "development" && lastUpdated && (
        <div className="fixed bottom-4 right-4 z-50">
          <Button
            variant="outline"
            size="sm"
            onClick={checkStorage}
            className="bg-background/80 backdrop-blur-sm"
            title={`ბოლო განახლება: ${new Date(lastUpdated).toLocaleTimeString("ka-GE")}`}
          >
            🔄 განახლება
          </Button>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20" />
        <div className="relative container mx-auto px-4 py-24 md:py-32">
          <motion.div
            initial="initial"
            animate="animate"
            variants={fadeInUp}
            className="max-w-4xl mx-auto text-center"
          >
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-4xl sm:text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
            >
              SaaS Platform
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-8"
            >
              მრავალმოდულური ბიზნეს მენეჯმენტის პლატფორმა
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="text-base sm:text-lg text-muted-foreground mb-12 max-w-2xl mx-auto px-4"
            >
              ერთი პლატფორმა ყველა ბიზნესისთვის - სასტუმროებიდან რესტორნებამდე, სილამაზის სალონებიდან მაღაზიებამდე
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="flex flex-col sm:flex-row gap-4 justify-center px-4"
            >
              <Button size="lg" asChild className="min-h-[44px]">
                <Link href="/auth/signup">დაიწყეთ უფასოდ</Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="min-h-[44px]">
                <Link href="#modules">გაიგეთ მეტი</Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-primary mb-2">{heroContent.stats.businesses}</div>
              <div className="text-muted-foreground text-base sm:text-lg">ბიზნესი</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-center"
            >
              <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-primary mb-2">{heroContent.stats.transactions}</div>
              <div className="text-muted-foreground text-base sm:text-lg">ტრანზაქცია</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-center"
            >
              <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-primary mb-2">{heroContent.stats.users}</div>
              <div className="text-muted-foreground text-base sm:text-lg">მომხმარებელი</div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Modules Section */}
      <section id="modules" className="py-24 container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">{heroContent.title}</h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
              {heroContent.subtitle}
            </p>
        </motion.div>
        
        {modules.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg mb-4">მოდულები არ მოიძებნა</p>
            <p className="text-sm text-muted-foreground">
              გთხოვთ შეამოწმოთ Super Admin-ში, რომ მოდულები ჩართულია და შენახულია.
            </p>
          </div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto"
          >
            {modules.map((module, index) => (
              <AnimatedCard key={module.slug} index={index}>
                <Card className="h-full hover:shadow-lg transition-shadow">
              <CardHeader>
                    <div className="text-4xl mb-4">{module.icon}</div>
                    <CardTitle className="text-xl sm:text-2xl">{module.name}</CardTitle>
                    <CardDescription className="text-sm sm:text-base">{module.description}</CardDescription>
              </CardHeader>
              <CardContent>
                    <Button asChild className="w-full min-h-[44px]">
                      <Link href={`/modules/${module.slug}/pricing`}>გაიგე მეტი</Link>
                    </Button>
              </CardContent>
            </Card>
              </AnimatedCard>
          ))}
          </motion.div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t py-12 mt-24">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2024 SaaS Platform. ყველა უფლება დაცულია.</p>
        </div>
      </footer>
      </div>
  );
}
