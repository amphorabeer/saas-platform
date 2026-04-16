"use client";

import { useState } from "react";
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
import {
  SUPPORTED_TRANSLATION_LANGUAGES,
  getFieldSuffix,
} from "@/lib/constants/languages";

interface Translation {
  langCode: string;
  name: string;
  description: string;
  city: string;
  address: string;
  audioUrl: string;
}

export default function NewMuseumPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [showLangPicker, setShowLangPicker] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    city: "",
    address: "",
    slug: "",
    coverImage: "",
    introAudioUrl: "",
    latitude: "",
    longitude: "",
    contactEmail: "",
    contactPhone: "",
    website: "",
    showMap: false,
    showQrScanner: false,
    isPublished: false,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : value,
    }));

    // Auto-generate slug from name
    if (name === "name") {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9\u10A0-\u10FF]+/g, "-")
        .replace(/^-|-$/g, "");
      setFormData((prev) => ({ ...prev, slug }));
    }
  };

  const addTranslation = (langCode: string) => {
    if (translations.find((t) => t.langCode === langCode)) return;
    setTranslations([
      ...translations,
      { langCode, name: "", description: "", city: "", address: "", audioUrl: "" },
    ]);
    setShowLangPicker(false);
  };

  const removeTranslation = (langCode: string) => {
    setTranslations(translations.filter((t) => t.langCode !== langCode));
  };

  const updateTranslation = (
    langCode: string,
    field: string,
    value: string
  ) => {
    setTranslations(
      translations.map((t) =>
        t.langCode === langCode ? { ...t, [field]: value } : t
      )
    );
  };

  const getLanguageName = (code: string) => {
    return (
      SUPPORTED_TRANSLATION_LANGUAGES.find((l) => l.code === code)?.labelKa ||
      code
    );
  };

  const availableToAdd = SUPPORTED_TRANSLATION_LANGUAGES.filter(
    (l) => !translations.find((t) => t.langCode === l.code)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const localePayload: Record<string, string | null> = {};
      for (const { code } of SUPPORTED_TRANSLATION_LANGUAGES) {
        const s = getFieldSuffix(code);
        const t = translations.find((tr) => tr.langCode === code);
        localePayload[`name${s}`] = t?.name || null;
        localePayload[`description${s}`] = t?.description || null;
        localePayload[`city${s}`] = t?.city || null;
        localePayload[`address${s}`] = t?.address || null;
        localePayload[`introAudioUrl${s}`] = t?.audioUrl || null;
      }

      const res = await fetch("/api/geoguide/museums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          latitude: formData.latitude ? parseFloat(formData.latitude) : null,
          longitude: formData.longitude
            ? parseFloat(formData.longitude)
            : null,
          ...localePayload,
        }),
      });

      if (res.ok) {
        router.push("/geoguide/museums");
      } else {
        const error = await res.json();
        alert(error.message || "შეცდომა მოხდა");
      }
    } catch (error) {
      console.error("Error creating museum:", error);
      alert("შეცდომა მოხდა");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/geoguide/museums">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            უკან
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">ახალი მუზეუმი</h1>
          <p className="text-muted-foreground">შექმენით ახალი მუზეუმი</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Basic Info - Georgian */}
            <Card>
              <CardHeader>
                <CardTitle>🇬🇪 ძირითადი ინფორმაცია (ქართულად)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">სახელი *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="მაგ: საქართველოს ეროვნული მუზეუმი"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>შესავალი აუდიო (ქართულად)</Label>
                  <FileUpload
                    accept="audio/*"
                    folder="museums/audio/ka"
                    type="audio"
                    label="აუდიო ფაილის ატვირთვა"
                    currentUrl={formData.introAudioUrl}
                    onUpload={(url) => setFormData((prev) => ({ ...prev, introAudioUrl: url }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">აღწერა</Label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-3 py-2 border rounded-md bg-background resize-none"
                    placeholder="მუზეუმის მოკლე აღწერა..."
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="city">ქალაქი</Label>
                    <Input
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="მაგ: თბილისი"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">მისამართი</Label>
                    <Input
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="მაგ: რუსთაველის გამზ. 3"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Translations */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>თარგმანები</CardTitle>
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
                  {showLangPicker && (
                    <div className="absolute right-0 top-full mt-1 bg-white border rounded-md shadow-lg z-10 min-w-[150px]">
                      {availableToAdd.map((lang) => (
                        <button
                          key={lang.code}
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
                          onClick={() => addTranslation(lang.code)}
                        >
                          {lang.labelKa}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {translations.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    დაამატეთ თარგმანები სხვა ენებზე
                  </p>
                ) : (
                  <div className="space-y-4">
                    {translations.map((trans) => (
                      <div
                        key={trans.langCode}
                        className="p-4 border rounded-lg bg-muted/30"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-medium">
                            {getLanguageName(trans.langCode)}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              removeTranslation(trans.langCode)
                            }
                            className="text-red-500 hover:text-red-600 h-6 w-6 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="space-y-3">
                          <Input
                            value={trans.name}
                            onChange={(e) =>
                              updateTranslation(
                                trans.langCode,
                                "name",
                                e.target.value
                              )}
                            placeholder="სახელი"
                          />
                          
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">შესავალი აუდიო</Label>
                            <FileUpload
                              accept="audio/*"
                              folder={`museums/audio/${trans.langCode}`}
                              type="audio"
                              label={`აუდიო (${getLanguageName(trans.langCode)})`}
                              currentUrl={trans.audioUrl}
                              onUpload={(url) =>
                                updateTranslation(trans.langCode, "audioUrl", url)
                              }
                            />
                          </div>

                          <textarea
                            value={trans.description}
                            onChange={(e) =>
                              updateTranslation(
                                trans.langCode,
                                "description",
                                e.target.value
                              )}
                            rows={3}
                            className="w-full px-3 py-2 border rounded-md bg-background resize-none text-sm"
                            placeholder="აღწერა"
                          />
                          <div className="grid gap-3 sm:grid-cols-2">
                            <Input
                              value={trans.city}
                              onChange={(e) =>
                                updateTranslation(
                                  trans.langCode,
                                  "city",
                                  e.target.value
                                )}
                              placeholder="ქალაქი"
                            />
                            <Input
                              value={trans.address}
                              onChange={(e) =>
                                updateTranslation(
                                  trans.langCode,
                                  "address",
                                  e.target.value
                                )}
                              placeholder="მისამართი"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Settings */}
            <Card>
              <CardHeader>
                <CardTitle>პარამეტრები</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="slug">URL Slug *</Label>
                  <Input
                    id="slug"
                    name="slug"
                    value={formData.slug}
                    onChange={handleChange}
                    placeholder="museum-name"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    გამოიყენება URL-ში: /museum/{formData.slug || "slug"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>სურათი</Label>
                  <FileUpload
                    accept="image/*"
                    folder="museums"
                    type="image"
                    label="სურათის ატვირთვა"
                    currentUrl={formData.coverImage}
                    onUpload={(url) => setFormData((prev) => ({ ...prev, coverImage: url }))}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="latitude">განედი (Latitude)</Label>
                    <Input
                      id="latitude"
                      name="latitude"
                      type="number"
                      step="any"
                      value={formData.latitude}
                      onChange={handleChange}
                      placeholder="41.7151"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="longitude">გრძედი (Longitude)</Label>
                    <Input
                      id="longitude"
                      name="longitude"
                      type="number"
                      step="any"
                      value={formData.longitude}
                      onChange={handleChange}
                      placeholder="44.8271"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact */}
            <Card>
              <CardHeader>
                <CardTitle>საკონტაქტო ინფორმაცია</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">ელ-ფოსტა</Label>
                  <Input
                    id="contactEmail"
                    name="contactEmail"
                    type="email"
                    value={formData.contactEmail}
                    onChange={handleChange}
                    placeholder="info@museum.ge"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPhone">ტელეფონი</Label>
                  <Input
                    id="contactPhone"
                    name="contactPhone"
                    value={formData.contactPhone}
                    onChange={handleChange}
                    placeholder="+995 32 123 4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">ვებსაიტი</Label>
                  <Input
                    id="website"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    placeholder="https://museum.ge"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Options */}
            <Card>
              <CardHeader>
                <CardTitle>ოფციები</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showMap"
                    name="showMap"
                    checked={formData.showMap}
                    onChange={handleChange}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="showMap">რუკის ჩვენება</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showQrScanner"
                    name="showQrScanner"
                    checked={formData.showQrScanner}
                    onChange={handleChange}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="showQrScanner">QR სკანერის ჩვენება</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isPublished"
                    name="isPublished"
                    checked={formData.isPublished}
                    onChange={handleChange}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="isPublished">გამოქვეყნებული</Label>
                </div>
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex gap-4">
              <Link href="/geoguide/museums" className="flex-1">
                <Button variant="outline" className="w-full" type="button">
                  გაუქმება
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-amber-500 hover:bg-amber-600"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    იქმნება...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    შექმნა
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}