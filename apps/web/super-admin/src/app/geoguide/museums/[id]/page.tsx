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
import { ArrowLeft, Save, Loader2, Trash2, Plus, X } from "lucide-react";
import { FileUpload } from "@/components/FileUpload";

const AVAILABLE_LANGUAGES = [
  { code: "en", name: "ინგლისური", nameEn: "English" },
  { code: "ru", name: "რუსული", nameEn: "Russian" },
  { code: "de", name: "გერმანული", nameEn: "German" },
  { code: "fr", name: "ფრანგული", nameEn: "French" },
  { code: "uk", name: "უკრაინული", nameEn: "Ukrainian" },
];

interface Translation {
  langCode: string;
  name: string;
  description: string;
  city: string;
  address: string;
}

interface Museum {
  id: string;
  name: string;
  description: string | null;
  city: string | null;
  address: string | null;
  nameEn: string | null;
  descriptionEn: string | null;
  cityEn: string | null;
  addressEn: string | null;
  nameRu: string | null;
  descriptionRu: string | null;
  cityRu: string | null;
  addressRu: string | null;
  nameDe: string | null;
  descriptionDe: string | null;
  cityDe: string | null;
  addressDe: string | null;
  nameFr: string | null;
  descriptionFr: string | null;
  cityFr: string | null;
  addressFr: string | null;
  slug: string;
  coverImage: string | null;
  latitude: number | null;
  longitude: number | null;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  showMap: boolean;
  showQrScanner: boolean;
  isPublished: boolean;
}

export default function EditMuseumPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [museum, setMuseum] = useState<Museum | null>(null);
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [showLangPicker, setShowLangPicker] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    city: "",
    address: "",
    slug: "",
    coverImage: "",
    latitude: "",
    longitude: "",
    contactEmail: "",
    contactPhone: "",
    website: "",
    showMap: false,
    showQrScanner: false,
    isPublished: false,
  });

  useEffect(() => {
    fetchMuseum();
  }, [params.id]);

  const fetchMuseum = async () => {
    try {
      const res = await fetch(`/api/geoguide/museums/${params.id}`);
      if (res.ok) {
        const data: Museum = await res.json();
        setMuseum(data);

        // Set form data
        setFormData({
          name: data.name || "",
          description: data.description || "",
          city: data.city || "",
          address: data.address || "",
          slug: data.slug || "",
          coverImage: data.coverImage || "",
          latitude: data.latitude?.toString() || "",
          longitude: data.longitude?.toString() || "",
          contactEmail: data.contactEmail || "",
          contactPhone: data.contactPhone || "",
          website: data.website || "",
          showMap: data.showMap || false,
          showQrScanner: data.showQrScanner || false,
          isPublished: data.isPublished || false,
        });

        // Build translations from existing data
        const trans: Translation[] = [];
        if (
          data.nameEn ||
          data.descriptionEn ||
          data.cityEn ||
          data.addressEn
        ) {
          trans.push({
            langCode: "en",
            name: data.nameEn || "",
            description: data.descriptionEn || "",
            city: data.cityEn || "",
            address: data.addressEn || "",
          });
        }
        if (
          data.nameRu ||
          data.descriptionRu ||
          data.cityRu ||
          data.addressRu
        ) {
          trans.push({
            langCode: "ru",
            name: data.nameRu || "",
            description: data.descriptionRu || "",
            city: data.cityRu || "",
            address: data.addressRu || "",
          });
        }
        if (
          data.nameDe ||
          data.descriptionDe ||
          data.cityDe ||
          data.addressDe
        ) {
          trans.push({
            langCode: "de",
            name: data.nameDe || "",
            description: data.descriptionDe || "",
            city: data.cityDe || "",
            address: data.addressDe || "",
          });
        }
        if (
          data.nameFr ||
          data.descriptionFr ||
          data.cityFr ||
          data.addressFr
        ) {
          trans.push({
            langCode: "fr",
            name: data.nameFr || "",
            description: data.descriptionFr || "",
            city: data.cityFr || "",
            address: data.addressFr || "",
          });
        }
        setTranslations(trans);
      } else {
        alert("მუზეუმი ვერ მოიძებნა");
        router.push("/geoguide/museums");
      }
    } catch (error) {
      console.error("Error fetching museum:", error);
    } finally {
      setLoading(false);
    }
  };

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
  };

  const addTranslation = (langCode: string) => {
    if (translations.find((t) => t.langCode === langCode)) return;
    setTranslations([
      ...translations,
      { langCode, name: "", description: "", city: "", address: "" },
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
    return AVAILABLE_LANGUAGES.find((l) => l.code === code)?.name || code;
  };

  const availableToAdd = AVAILABLE_LANGUAGES.filter(
    (l) => !translations.find((t) => t.langCode === l.code)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const enTrans = translations.find((t) => t.langCode === "en");
      const ruTrans = translations.find((t) => t.langCode === "ru");
      const deTrans = translations.find((t) => t.langCode === "de");
      const frTrans = translations.find((t) => t.langCode === "fr");

      const res = await fetch(`/api/geoguide/museums/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          latitude: formData.latitude ? parseFloat(formData.latitude) : null,
          longitude: formData.longitude
            ? parseFloat(formData.longitude)
            : null,
          // English
          nameEn: enTrans?.name || null,
          descriptionEn: enTrans?.description || null,
          cityEn: enTrans?.city || null,
          addressEn: enTrans?.address || null,
          // Russian
          nameRu: ruTrans?.name || null,
          descriptionRu: ruTrans?.description || null,
          cityRu: ruTrans?.city || null,
          addressRu: ruTrans?.address || null,
          // German
          nameDe: deTrans?.name || null,
          descriptionDe: deTrans?.description || null,
          cityDe: deTrans?.city || null,
          addressDe: deTrans?.address || null,
          // French
          nameFr: frTrans?.name || null,
          descriptionFr: frTrans?.description || null,
          cityFr: frTrans?.city || null,
          addressFr: frTrans?.address || null,
        }),
      });

      if (res.ok) {
        alert("მუზეუმი წარმატებით განახლდა!");
        router.push("/geoguide/museums");
      } else {
        const error = await res.json();
        alert(error.message || "შეცდომა მოხდა");
      }
    } catch (error) {
      console.error("Error updating museum:", error);
      alert("შეცდომა მოხდა");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "დარწმუნებული ხართ რომ გინდათ წაშლა? ეს წაშლის ყველა ტურსაც!"
      )
    )
      return;

    try {
      const res = await fetch(`/api/geoguide/museums/${params.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.push("/geoguide/museums");
      } else {
        alert("წაშლა ვერ მოხერხდა");
      }
    } catch (error) {
      console.error("Error deleting museum:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (!museum) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/geoguide/museums">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              უკან
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{museum.name}</h1>
            <p className="text-muted-foreground mt-1">მუზეუმის რედაქტირება</p>
          </div>
        </div>
        <Button
          variant="outline"
          className="text-red-500 hover:text-red-600"
          onClick={handleDelete}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          წაშლა
        </Button>
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
              </CardHeader>
              <CardContent>
                {translations.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
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
                disabled={saving}
                className="flex-1 bg-amber-500 hover:bg-amber-600"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    შენახვა...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    შენახვა
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
