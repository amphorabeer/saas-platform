"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@saas-platform/ui";
import { toast } from "sonner";
import { ExternalLink, Save, Eye } from "lucide-react";

interface Module {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  color: string;
  icon: string;
  organizations: number;
  pricing: {
    starter: { price: string; duration: string; features: string[] };
    professional: { price: string; popular: boolean; features: string[] };
    enterprise: { price: string; features: string[] };
  };
}

const defaultModules: Module[] = [
  {
    id: "hotel",
    name: "სასტუმროს მართვა",
    description: "სრულყოფილი სისტემა სასტუმროების მართვისთვის",
    enabled: true,
    color: "#3b82f6",
    icon: "🏨",
    organizations: 124,
    pricing: {
      starter: { price: "უფასო", duration: "15 დღე", features: ["1 ლოკაცია", "20 ოთახი", "რეზერვაციების მართვა"] },
      professional: {
        price: "₾99",
        popular: true,
        features: ["1 ლოკაცია", "50 ოთახი", "ყველა ფუნქცია", "24/7 მხარდაჭერა"],
      },
      enterprise: {
        price: "₾299",
        features: ["მრავალი ლოკაცია", "ულიმიტო ოთახები", "Custom features", "Dedicated support"],
      },
    },
  },
  {
    id: "restaurant",
    name: "რესტორნის მართვა",
    description: "რესტორნის მენეჯმენტი - მაგიდების რეზერვაცია, შეკვეთების მართვა",
    enabled: true,
    color: "#10b981",
    icon: "🍽️",
    organizations: 89,
    pricing: {
      starter: { price: "უფასო", duration: "15 დღე", features: ["1 ლოკაცია", "20 მაგიდა", "შეკვეთების მართვა"] },
      professional: {
        price: "₾99",
        popular: true,
        features: ["1 ლოკაცია", "50 მაგიდა", "ყველა ფუნქცია", "POS ინტეგრაცია"],
      },
      enterprise: {
        price: "₾299",
        features: ["მრავალი ლოკაცია", "ულიმიტო მაგიდები", "Custom features", "Multi-language"],
      },
    },
  },
  {
    id: "beauty",
    name: "სილამაზის სალონი",
    description: "სილამაზის სალონების მართვა - ვიზიტების დაგეგმვა, კლიენტების ბაზა",
    enabled: true,
    color: "#ec4899",
    icon: "💅",
    organizations: 67,
    pricing: {
      starter: { price: "უფასო", duration: "15 დღე", features: ["1 ლოკაცია", "500 კლიენტი", "ვიზიტების მართვა"] },
      professional: {
        price: "₾99",
        popular: true,
        features: ["1 ლოკაცია", "ულიმიტო კლიენტი", "ყველა ფუნქცია", "SMS შეტყობინებები"],
      },
      enterprise: {
        price: "₾299",
        features: ["მრავალი ლოკაცია", "ულიმიტო კლიენტი", "Custom features", "Marketing tools"],
      },
    },
  },
  {
    id: "shop",
    name: "მაღაზია",
    description: "ინვენტარის მართვა, გაყიდვები, მომხმარებლები და ანალიტიკა",
    enabled: true,
    color: "#f59e0b",
    icon: "🛍️",
    organizations: 45,
    pricing: {
      starter: { price: "უფასო", duration: "15 დღე", features: ["1 ლოკაცია", "1000 პროდუქტი", "ინვენტარის მართვა"] },
      professional: {
        price: "₾99",
        popular: true,
        features: ["1 ლოკაცია", "ულიმიტო პროდუქტი", "ყველა ფუნქცია", "POS ინტეგრაცია"],
      },
      enterprise: {
        price: "₾299",
        features: ["მრავალი ლოკაცია", "ულიმიტო პროდუქტი", "Custom features", "Multi-warehouse"],
      },
    },
  },
  {
    id: "brewery",
    name: "სახლეულო",
    description: "სახლეულოს მართვა - წარმოების კონტროლი, ინვენტარი, გაყიდვები",
    enabled: true,
    color: "#8b5cf6",
    icon: "🍺",
    organizations: 23,
    pricing: {
      starter: { price: "უფასო", duration: "15 დღე", features: ["1 ლოკაცია", "10 რეცეპტი", "წარმოების მართვა"] },
      professional: {
        price: "₾99",
        popular: true,
        features: ["1 ლოკაცია", "ულიმიტო რეცეპტი", "ყველა ფუნქცია", "ბარელების მართვა"],
      },
      enterprise: {
        price: "₾299",
        features: ["მრავალი ლოკაცია", "ულიმიტო რეცეპტი", "Custom features", "Quality control"],
      },
    },
  },
  {
    id: "winery",
    name: "ღვინის ქარხანა",
    description: "ღვინის ქარხნის მართვა - ვენახების მონიტორინგი, წარმოება, ბარელები",
    enabled: true,
    color: "#ef4444",
    icon: "🍷",
    organizations: 18,
    pricing: {
      starter: { price: "უფასო", duration: "15 დღე", features: ["1 ლოკაცია", "10 ვარიანტი", "წარმოების მართვა"] },
      professional: {
        price: "₾99",
        popular: true,
        features: ["1 ლოკაცია", "ულიმიტო ვარიანტი", "ყველა ფუნქცია", "ბარელების მართვა"],
      },
      enterprise: {
        price: "₾299",
        features: ["მრავალი ლოკაცია", "ულიმიტო ვარიანტი", "Custom features", "Aging tracking"],
      },
    },
  },
  {
    id: "distillery",
    name: "დისტილერია",
    description: "დისტილერიის მართვა - წარმოების პროცესები, ბარელების მართვა, გაყიდვები",
    enabled: true,
    color: "#6366f1",
    icon: "🥃",
    organizations: 12,
    pricing: {
      starter: { price: "უფასო", duration: "15 დღე", features: ["1 ლოკაცია", "10 რეცეპტი", "წარმოების მართვა"] },
      professional: {
        price: "₾99",
        popular: true,
        features: ["1 ლოკაცია", "ულიმიტო რეცეპტი", "ყველა ფუნქცია", "ბარელების მართვა"],
      },
      enterprise: {
        price: "₾299",
        features: ["მრავალი ლოკაცია", "ულიმიტო რეცეპტი", "Custom features", "Aging tracking"],
      },
    },
  },
];

export function LandingEditor() {
  const [modules, setModules] = useState<Module[]>(defaultModules);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [heroContent, setHeroContent] = useState({
    title: "მოდულები",
    subtitle: "აირჩიეთ თქვენი ბიზნესისთვის შესაფერისი მოდული",
    stats: {
      businesses: "436+",
      transactions: "2.5M+",
      users: "12K+",
    },
  });

  useEffect(() => {
    // Load from database first, fallback to localStorage
    const loadConfig = async () => {
      try {
        // Try database first
        const [modulesResponse, heroResponse] = await Promise.all([
          fetch("/api/config?key=landing-modules"),
          fetch("/api/config?key=landing-hero"),
        ]);

        let loadedFromDB = false;

        if (modulesResponse.ok) {
          const modulesData = await modulesResponse.json();
          if (modulesData.value && Array.isArray(modulesData.value) && modulesData.value.length > 0) {
            setModules(modulesData.value);
            // Also update localStorage for faster future loads
            localStorage.setItem("landing-modules", JSON.stringify(modulesData.value));
            loadedFromDB = true;
            console.log("✅ Loaded modules from database:", modulesData.value.length);
          }
        }

        if (heroResponse.ok) {
          const heroData = await heroResponse.json();
          if (heroData.value && typeof heroData.value === "object") {
            setHeroContent(heroData.value);
            // Also update localStorage
            localStorage.setItem("landing-hero", JSON.stringify(heroData.value));
            console.log("✅ Loaded hero from database");
          }
        }

        // If database didn't have data, try localStorage
        if (!loadedFromDB) {
          console.log("⚠️ Database returned no data, checking localStorage...");
          const savedModules = localStorage.getItem("landing-modules");
          const savedHero = localStorage.getItem("landing-hero");
          
          if (savedModules) {
            try {
              const parsed = JSON.parse(savedModules);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setModules(parsed);
                console.log("✅ Loaded modules from localStorage:", parsed.length);
              }
            } catch (e) {
              console.error("❌ Error parsing localStorage modules:", e);
            }
          }
          
          if (savedHero) {
            try {
              const parsed = JSON.parse(savedHero);
              if (parsed && typeof parsed === "object") {
                setHeroContent(parsed);
                console.log("✅ Loaded hero from localStorage");
              }
            } catch (e) {
              console.error("❌ Error parsing localStorage hero:", e);
            }
          }
        }
      } catch (error) {
        console.error("❌ Error loading from database, using localStorage:", error);
        // Fallback to localStorage
        const savedModules = localStorage.getItem("landing-modules");
        const savedHero = localStorage.getItem("landing-hero");
        if (savedModules) {
          try {
            const parsed = JSON.parse(savedModules);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setModules(parsed);
              console.log("✅ Loaded modules from localStorage (fallback):", parsed.length);
            }
          } catch (e) {
            console.error("❌ Error parsing localStorage modules:", e);
          }
        }
        if (savedHero) {
          try {
            const parsed = JSON.parse(savedHero);
            if (parsed && typeof parsed === "object") {
              setHeroContent(parsed);
              console.log("✅ Loaded hero from localStorage (fallback)");
            }
          } catch (e) {
            console.error("❌ Error parsing localStorage hero:", e);
          }
        }
      }
    };

    loadConfig();
  }, []);

  const updateModule = (id: string, updates: Partial<Module>) => {
    setModules((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)));
  };

  const saveToLocalStorage = async () => {
    try {
      const timestamp = new Date().toISOString();
      
      // Save to Landing Page API FIRST (this is the primary storage for modules)
      let landingPageApiSaved = false;
      try {
        console.log("📤 Sending modules to Landing Page API...");
        const landingPageResponse = await fetch("http://localhost:3000/api/modules", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ modules }),
        });

        if (landingPageResponse.ok) {
          const result = await landingPageResponse.json();
          console.log("✅ Landing Page API response:", result);
          landingPageApiSaved = true;
          console.log("✅ Saved to Landing Page API successfully");
        } else {
          console.warn("⚠️ Landing Page API save failed with status:", landingPageResponse.status);
        }
      } catch (landingPageError: any) {
        console.error("❌ Landing Page API save error:", landingPageError);
        console.warn("⚠️ Will try database API as fallback");
      }
      
      // Also save to database via API (for hero content and backup)
      let dbSaved = false;
      try {
        const [modulesResponse, heroResponse] = await Promise.all([
          fetch("/api/config", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: "landing-modules", value: modules }),
          }),
          fetch("/api/config", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: "landing-hero", value: heroContent }),
          }),
        ]);

        if (modulesResponse.ok && heroResponse.ok) {
          const modulesResult = await modulesResponse.json();
          const heroResult = await heroResponse.json();
          
          console.log("📊 Database save response:", {
            modules: modulesResult,
            hero: heroResult
          });
          
          if (modulesResult.success && heroResult.success) {
            dbSaved = true;
            console.log("✅ Saved to database successfully");
          } else {
            console.warn("⚠️ Database save returned success=false", {
              modulesSuccess: modulesResult.success,
              heroSuccess: heroResult.success,
              modulesWarning: modulesResult.warning,
              heroWarning: heroResult.warning
            });
            // Even if success=false, data might be saved to localStorage fallback
            if (modulesResult.warning || heroResult.warning) {
              console.log("ℹ️ Database unavailable, but localStorage fallback is active");
            }
          }
        } else {
          console.warn("⚠️ Database save failed with non-200 status", {
            modulesStatus: modulesResponse.status,
            heroStatus: heroResponse.status
          });
        }
      } catch (dbError: any) {
        console.error("❌ Database save error:", dbError);
        console.warn("⚠️ Will use localStorage as fallback");
      }
      
      // ALWAYS save to localStorage as backup (even if DB save succeeded)
      // This ensures data persists even if database has issues
      localStorage.setItem("landing-modules", JSON.stringify(modules));
      localStorage.setItem("landing-hero", JSON.stringify(heroContent));
      localStorage.setItem("landing-last-updated", timestamp);
      
      // Trigger custom event for same-tab updates
      window.dispatchEvent(new CustomEvent("landing-config-updated", { detail: { timestamp } }));
      
      if (landingPageApiSaved) {
        toast.success("ცვლილებები შენახულია!", {
          description: `მოდულები: ${modules.filter((m) => m.enabled).length}/${modules.length} ჩართულია. Landing Page განახლდება ავტომატურად 2 წამში.`,
          duration: 5000,
        });
      } else if (dbSaved) {
        toast.success("ცვლილებები შენახულია!", {
          description: `მოდულები: ${modules.filter((m) => m.enabled).length}/${modules.length} ჩართულია. მონაცემები შენახულია database-ში და localStorage-ში.`,
          duration: 5000,
        });
      } else {
        toast.success("ცვლილებები შენახულია!", {
          description: `მოდულები: ${modules.filter((m) => m.enabled).length}/${modules.length} ჩართულია. მონაცემები შენახულია localStorage-ში.`,
          duration: 5000,
        });
      }
      
      console.log("💾 Saved modules:", modules);
      console.log("💾 Saved hero:", heroContent);
      console.log("💾 Landing Page API saved:", landingPageApiSaved);
      console.log("💾 Database saved:", dbSaved);
      console.log("💾 localStorage saved: true");
    } catch (error) {
      console.error("❌ Error saving config:", error);
      toast.error("შეცდომა შენახვისას", {
        description: "გთხოვთ სცადოთ თავიდან",
      });
    }
  };

  const handlePricingSave = (updatedPricing: Module["pricing"]) => {
    if (editingModule) {
      updateModule(editingModule.id, { pricing: updatedPricing });
      setShowPricingModal(false);
      setEditingModule(null);
      toast.success("ფასები განახლებულია!", {
        description: `${editingModule.name} - ფასების ინფორმაცია შეიცვალა`,
        duration: 3000,
      });
    }
  };

  const openPreview = () => {
    window.open("http://localhost:3000", "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Landing Page მართვა</h1>
          <p className="text-muted-foreground">მართეთ Landing page-ის კონტენტი და მოდულები</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={openPreview}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button onClick={saveToLocalStorage}>
            <Save className="h-4 w-4 mr-2" />
            შენახვა
          </Button>
        </div>
      </div>

      {/* Hero Content Editor */}
      <Card>
        <CardHeader>
          <CardTitle>Hero სექციის რედაქტირება</CardTitle>
          <CardDescription>მთავარი სექციის კონტენტის რედაქტირება</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hero-title">სათაური</Label>
            <Input
              id="hero-title"
              value={heroContent.title}
              onChange={(e) => setHeroContent({ ...heroContent, title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hero-subtitle">ქვესათაური</Label>
            <Input
              id="hero-subtitle"
              value={heroContent.subtitle}
              onChange={(e) => setHeroContent({ ...heroContent, subtitle: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stats-businesses">ბიზნესები</Label>
              <Input
                id="stats-businesses"
                value={heroContent.stats.businesses}
                onChange={(e) =>
                  setHeroContent({
                    ...heroContent,
                    stats: { ...heroContent.stats, businesses: e.target.value },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stats-transactions">ტრანზაქციები</Label>
              <Input
                id="stats-transactions"
                value={heroContent.stats.transactions}
                onChange={(e) =>
                  setHeroContent({
                    ...heroContent,
                    stats: { ...heroContent.stats, transactions: e.target.value },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stats-users">მომხმარებლები</Label>
              <Input
                id="stats-users"
                value={heroContent.stats.users}
                onChange={(e) =>
                  setHeroContent({
                    ...heroContent,
                    stats: { ...heroContent.stats, users: e.target.value },
                  })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Module Management */}
      <Card>
        <CardHeader>
          <CardTitle>მოდულების მართვა</CardTitle>
          <CardDescription>ჩართეთ/გამორთეთ მოდულები და რედაქტირეთ მათი ინფორმაცია</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((module) => (
              <Card key={module.id} className={!module.enabled ? "opacity-50" : ""}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{module.icon}</span>
                      <div>
                        <CardTitle className="text-lg">{module.name}</CardTitle>
                        <Badge variant="outline" className="mt-1">
                          {module.organizations} ორგანიზაცია
                        </Badge>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={module.enabled}
                        onChange={(e) => updateModule(module.id, { enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor={`${module.id}-name`}>სახელი</Label>
                    <Input
                      id={`${module.id}-name`}
                      value={module.name}
                      onChange={(e) => updateModule(module.id, { name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${module.id}-desc`}>აღწერა</Label>
                    <Input
                      id={`${module.id}-desc`}
                      value={module.description}
                      onChange={(e) => updateModule(module.id, { description: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${module.id}-color`}>ფერი</Label>
                    <div className="flex gap-2">
                      <Input
                        id={`${module.id}-color`}
                        type="color"
                        value={module.color}
                        onChange={(e) => updateModule(module.id, { color: e.target.value })}
                        className="w-16 h-10"
                      />
                      <Input
                        value={module.color}
                        onChange={(e) => updateModule(module.id, { color: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${module.id}-icon`}>აიკონი</Label>
                    <Input
                      id={`${module.id}-icon`}
                      value={module.icon}
                      onChange={(e) => updateModule(module.id, { icon: e.target.value })}
                      placeholder="🏨"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${module.id}-organizations`}>ორგანიზაციების რაოდენობა</Label>
                    <Input
                      id={`${module.id}-organizations`}
                      type="number"
                      value={module.organizations}
                      onChange={(e) => updateModule(module.id, { organizations: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      // Create a fresh copy of the module to avoid state issues
                      setEditingModule({ ...module });
                      setShowPricingModal(true);
                    }}
                  >
                    ფასების რედაქტირება
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pricing Modal */}
      {showPricingModal && editingModule && (
        <PricingModal
          module={editingModule}
          onSave={handlePricingSave}
          onClose={() => {
            setShowPricingModal(false);
            setEditingModule(null);
          }}
        />
      )}

      {/* Main Save Button */}
      <Card className="bg-primary/5 border-primary border-2">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold mb-2">💾 შენახვა Landing Page-ზე</h3>
              <p className="text-muted-foreground text-sm">
                ყველა ცვლილება შეინახება localStorage-ში და Landing page ავტომატურად განახლდება
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                მოდულები: {modules.filter((m) => m.enabled).length} / {modules.length} ჩართულია
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={openPreview}>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button size="lg" onClick={saveToLocalStorage} className="min-w-[200px]">
                <Save className="h-5 w-5 mr-2" />
                შენახვა Landing Page-ზე
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PricingModal({
  module,
  onSave,
  onClose,
}: {
  module: Module;
  onSave: (pricing: Module["pricing"]) => void;
  onClose: () => void;
}) {
  const [pricing, setPricing] = useState(module.pricing);

  // Update pricing when module changes
  useEffect(() => {
    setPricing(module.pricing);
  }, [module.pricing]);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{module.name} - ფასების რედაქტირება</DialogTitle>
          <DialogDescription>რედაქტირეთ სამი გეგმის ფასები და ფუნქციები</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
          {/* Starter Plan */}
          <Card>
            <CardHeader>
              <CardTitle>Starter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>ფასი</Label>
                <Input
                  value={pricing.starter.price}
                  onChange={(e) =>
                    setPricing({ ...pricing, starter: { ...pricing.starter, price: e.target.value } })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>ხანგრძლივობა</Label>
                <Input
                  value={pricing.starter.duration}
                  onChange={(e) =>
                    setPricing({ ...pricing, starter: { ...pricing.starter, duration: e.target.value } })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>ფუნქციები (თითო ხაზზე)</Label>
                <textarea
                  className="w-full min-h-[150px] p-2 border rounded"
                  value={pricing.starter.features.join("\n")}
                  onChange={(e) =>
                    setPricing({
                      ...pricing,
                      starter: { ...pricing.starter, features: e.target.value.split("\n").filter((f) => f.trim()) },
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Professional Plan */}
          <Card className="border-2 border-primary">
            <CardHeader>
              <CardTitle>Professional</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>ფასი</Label>
                <Input
                  value={pricing.professional.price}
                  onChange={(e) =>
                    setPricing({ ...pricing, professional: { ...pricing.professional, price: e.target.value } })
                  }
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="popular"
                  checked={pricing.professional.popular}
                  onChange={(e) =>
                    setPricing({ ...pricing, professional: { ...pricing.professional, popular: e.target.checked } })
                  }
                  className="h-4 w-4"
                />
                <Label htmlFor="popular">პოპულარული</Label>
              </div>
              <div className="space-y-2">
                <Label>ფუნქციები (თითო ხაზზე)</Label>
                <textarea
                  className="w-full min-h-[150px] p-2 border rounded"
                  value={pricing.professional.features.join("\n")}
                  onChange={(e) =>
                    setPricing({
                      ...pricing,
                      professional: {
                        ...pricing.professional,
                        features: e.target.value.split("\n").filter((f) => f.trim()),
                      },
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Enterprise Plan */}
          <Card>
            <CardHeader>
              <CardTitle>Enterprise</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>ფასი</Label>
                <Input
                  value={pricing.enterprise.price}
                  onChange={(e) =>
                    setPricing({ ...pricing, enterprise: { ...pricing.enterprise, price: e.target.value } })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>ფუნქციები (თითო ხაზზე)</Label>
                <textarea
                  className="w-full min-h-[150px] p-2 border rounded"
                  value={pricing.enterprise.features.join("\n")}
                  onChange={(e) =>
                    setPricing({
                      ...pricing,
                      enterprise: {
                        ...pricing.enterprise,
                        features: e.target.value.split("\n").filter((f) => f.trim()),
                      },
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            გაუქმება
          </Button>
          <Button onClick={() => onSave(pricing)}>შენახვა</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

