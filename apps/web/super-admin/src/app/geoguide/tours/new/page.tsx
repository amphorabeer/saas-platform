"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
} from "@saas-platform/ui";
import { ArrowLeft, Save, Loader2, Plus, X } from "lucide-react";
import { FileUpload } from "@/components/FileUpload";

const AVAILABLE_LANGUAGES = [
  { code: "en", name: "ინგლისური", nameEn: "English" },
  { code: "ru", name: "რუსული", nameEn: "Russian" },
  { code: "de", name: "გერმანული", nameEn: "German" },
  { code: "fr", name: "ფრანგული", nameEn: "French" },
  { code: "es", name: "ესპანური", nameEn: "Spanish" },
  { code: "it", name: "იტალიური", nameEn: "Italian" },
  { code: "uk", name: "უკრაინული", nameEn: "Ukrainian" },
  { code: "tr", name: "თურქული", nameEn: "Turkish" },
  { code: "zh", name: "ჩინური", nameEn: "Chinese" },
  { code: "ja", name: "იაპონური", nameEn: "Japanese" },
  { code: "ar", name: "არაბული", nameEn: "Arabic" },
];

interface Museum {
  id: string;
  name: string;
}

interface Translation {
  langCode: string;
  name: string;
  description: string;
}

export default function NewTourPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [museums, setMuseums] = useState<Museum[]>([]);
  const [loadingMuseums, setLoadingMuseums] = useState(true);
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [showLangPicker, setShowLangPicker] = useState(false);

  const [formData, setFormData] = useState({
    museumId: "",
    name: "",
    description: "",
    duration: "",
    isFree: true,
    price: "",
    currency: "GEL",
    coverImage: "",
  });

  useEffect(() => {
    fetchMuseums();
  }, []);

  const fetchMuseums = async () => {
    try {
      const res = await fetch("/api/geoguide/museums");
      if (res.ok) {
        const data = await res.json();
        setMuseums(data);
        if (data.length > 0) {
          setFormData((prev) => ({ ...prev, museumId: data[0].id }));
        }
      }
    } catch (error) {
      console.error("Error fetching museums:", error);
    } finally {
      setLoadingMuseums(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const addTranslation = (langCode: string) => {
    if (translations.find((t) => t.langCode === langCode)) return;
    setTranslations([...translations, { langCode, name: "", description: "" }]);
    setShowLangPicker(false);
  };

  const removeTranslation = (langCode: string) => {
    setTranslations(translations.filter((t) => t.langCode !== langCode));
  };

  const updateTranslation = (langCode: string, field: string, value: string) => {
    setTranslations(
      translations.map((t) =>
        t.langCode === langCode ? { ...t, [field]: value } : t
      )
    );
  };

  const getLanguageName = (code: string) => {
    return AVAILABLE_LANGUAGES.find((l) => l.code === code)?.name || code;
  };

  const availableToAdd = AVAILABLE_LANGUAGES.filter(
    (l) => !translations.find((t) => t.langCode === l.code)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/geoguide/tours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          duration: formData.duration ? parseInt(formData.duration) : null,
          price: formData.price ? parseFloat(formData.price) : null,
          nameEn: translations.find((t) => t.langCode === "en")?.name || null,
          nameRu: translations.find((t) => t.langCode === "ru")?.name || null,
          nameUk: translations.find((t) => t.langCode === "uk")?.name || null,
          descriptionEn: translations.find((t) => t.langCode === "en")?.description || null,
          descriptionRu: translations.find((t) => t.langCode === "ru")?.description || null,
          descriptionUk: translations.find((t) => t.langCode === "uk")?.description || null,
        }),
      });

      if (res.ok) {
        const tour = await res.json();
        router.push(`/geoguide/tours/${tour.id}`);
      } else {
        const error = await res.json();
        alert(error.message || "შეცდომა მოხდა");
      }
    } catch (error) {
      console.error("Error creating tour:", error);
      alert("შეცდომა მოხდა");
    } finally {
      setLoading(false);
    }
  };

  if (loadingMuseums) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (museums.length === 0) {
    return (
      <div className="space-y-6">
        <Link href="/geoguide/tours">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            უკან
          </Button>
        </Link>
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-4xl mb-4">🏛️</div>
            <h3 className="text-lg font-medium">ჯერ მუზეუმი შექმენით</h3>
            <p className="text-muted-foreground mt-1">
              ტურის შესაქმნელად საჭიროა მინიმუმ ერთი მუზეუმი
            </p>
            <Link href="/geoguide/museums/new">
              <Button className="mt-4 bg-amber-500 hover:bg-amber-600">
                მუზეუმის შექმნა
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/geoguide/tours">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            უკან
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">ახალი ტური</h1>
          <p className="text-muted-foreground mt-1">აუდიო ტურის შექმნა</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>ძირითადი ინფორმაცია</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="museumId">მუზეუმი *</Label>
                <select
                  id="museumId"
                  name="museumId"
                  value={formData.museumId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  required
                >
                  {museums.map((museum) => (
                    <option key={museum.id} value={museum.id}>
                      {museum.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">სახელი (ქართულად) *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="მაგ: მთავარი ტური"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">აღწერა (ქართულად)</Label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-3 py-2 border rounded-md bg-background resize-none"
                  placeholder="ტურის მოკლე აღწერა..."
                />
              </div>

              {/* Translations */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-3">
                  <Label>თარგმანები</Label>
                  <div className="relative">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowLangPicker(!showLangPicker)}
                      disabled={availableToAdd.length === 0}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      ენის დამატება
                    </Button>

                    {showLangPicker && availableToAdd.length > 0 && (
                      <div className="absolute right-0 top-full mt-1 bg-background border rounded-lg shadow-lg z-10 py-1 min-w-[200px]">
                        {availableToAdd.map((lang) => (
                          <button
                            key={lang.code}
                            type="button"
                            onClick={() => addTranslation(lang.code)}
                            className="w-full px-4 py-2 text-left hover:bg-muted text-sm"
                          >
                            {lang.name} ({lang.nameEn})
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {translations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    დააჭირეთ "ენის დამატება" თარგმანის დასამატებლად
                  </p>
                ) : (
                  <div className="space-y-4">
                    {translations.map((trans) => (
                      <div
                        key={trans.langCode}
                        className="p-4 border rounded-lg bg-muted/30"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-medium text-sm">
                            {getLanguageName(trans.langCode)}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTranslation(trans.langCode)}
                            className="text-red-500 hover:text-red-600 h-6 w-6 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="space-y-3">
                          <Input
                            value={trans.name}
                            onChange={(e) =>
                              updateTranslation(trans.langCode, "name", e.target.value)
                            }
                            placeholder={`სახელი (${getLanguageName(trans.langCode)})`}
                          />
                          <textarea
                            value={trans.description}
                            onChange={(e) =>
                              updateTranslation(trans.langCode, "description", e.target.value)
                            }
                            rows={2}
                            className="w-full px-3 py-2 border rounded-md bg-background resize-none text-sm"
                            placeholder={`აღწერა (${getLanguageName(trans.langCode)})`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Settings */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>პარამეტრები</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">ხანგრძლივობა (წუთი)</Label>
                  <Input
                    id="duration"
                    name="duration"
                    type="number"
                    min="1"
                    value={formData.duration}
                    onChange={handleChange}
                    placeholder="მაგ: 45"
                  />
                </div>

                <div className="space-y-2">
                  <Label>სურათი</Label>
                  <FileUpload
                    accept="image/*"
                    folder="tours"
                    type="image"
                    label="სურათის ატვირთვა"
                    currentUrl={formData.coverImage}
                    onUpload={(url) => setFormData((prev) => ({ ...prev, coverImage: url }))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>ფასი</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isFree"
                    name="isFree"
                    checked={formData.isFree}
                    onChange={handleChange}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="isFree">უფასო ტური</Label>
                </div>

                {!formData.isFree && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="price">ფასი</Label>
                      <Input
                        id="price"
                        name="price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.price}
                        onChange={handleChange}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency">ვალუტა</Label>
                      <select
                        id="currency"
                        name="currency"
                        value={formData.currency}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border rounded-md bg-background"
                      >
                        <option value="GEL">GEL</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                      </select>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4 mt-6">
          <Link href="/geoguide/tours">
            <Button variant="outline" type="button">
              გაუქმება
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={loading}
            className="bg-amber-500 hover:bg-amber-600"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                შექმნა...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                შექმნა
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}