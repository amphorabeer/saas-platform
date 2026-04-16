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

interface Museum {
  id: string;
  name: string;
  description: string | null;
  city: string | null;
  address: string | null;
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
  introAudioUrl: string | null;
  show360View: boolean;
  vrTourId: string | null;
  vr360Price: number | null;
  vr360IsFree: boolean;
  vr360BundleWithAudio: boolean;
  [key: string]: unknown;
}

export default function EditMuseumPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tokenData, setTokenData] = useState<{
    hasToken: boolean;
    analyticsUrl: string | null;
    createdAt: string | null;
  }>({ hasToken: false, analyticsUrl: null, createdAt: null });
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [portalUsername, setPortalUsername] = useState("");
  const [portalPassword, setPortalPassword] = useState("");
  const [portalHasCredentials, setPortalHasCredentials] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState("");
  const [portalSuccess, setPortalSuccess] = useState("");
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
    introAudioUrl: "",
    latitude: "",
    longitude: "",
    contactEmail: "",
    contactPhone: "",
    website: "",
    showMap: false,
    showQrScanner: false,
    isPublished: false,
    // 360 VR
    show360View: false,
    vrTourId: "",
    vr360Price: "",
    vr360IsFree: false,
    vr360BundleWithAudio: false,
  });

  useEffect(() => {
    fetchMuseum();
    fetchToken();
    fetchPortalCredentials();
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
          introAudioUrl: data.introAudioUrl || "",
          latitude: data.latitude?.toString() || "",
          longitude: data.longitude?.toString() || "",
          contactEmail: data.contactEmail || "",
          contactPhone: data.contactPhone || "",
          website: data.website || "",
          showMap: data.showMap || false,
          showQrScanner: data.showQrScanner || false,
          isPublished: data.isPublished || false,
          // 360 VR
          show360View: data.show360View || false,
          vrTourId: data.vrTourId || "",
          vr360Price: data.vr360Price?.toString() || "",
          vr360IsFree: data.vr360IsFree || false,
          vr360BundleWithAudio: data.vr360BundleWithAudio || false,
        });

        const row = data as Record<string, string | null | undefined>;
        const trans: Translation[] = [];
        for (const { code } of SUPPORTED_TRANSLATION_LANGUAGES) {
          const s = getFieldSuffix(code);
          const name = row[`name${s}`];
          const description = row[`description${s}`];
          const city = row[`city${s}`];
          const address = row[`address${s}`];
          const audioUrl = row[`introAudioUrl${s}`];
          if (name || description || city || address || audioUrl) {
            trans.push({
              langCode: code,
              name: name || "",
              description: description || "",
              city: city || "",
              address: address || "",
              audioUrl: audioUrl || "",
            });
          }
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

  const fetchToken = async () => {
    try {
      const res = await fetch(
        `/api/geoguide/museums/${params.id}/analytics-token`
      );
      if (res.ok) setTokenData(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const generateToken = async () => {
    setTokenLoading(true);
    try {
      const res = await fetch(
        `/api/geoguide/museums/${params.id}/analytics-token`,
        { method: "POST" }
      );
      if (res.ok) setTokenData(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setTokenLoading(false);
    }
  };

  const revokeToken = async () => {
    if (
      !confirm(
        "დარწმუნებული ხართ? მუზეუმი კარგავს წვდომას ანალიტიკასთან."
      )
    )
      return;
    setTokenLoading(true);
    try {
      await fetch(
        `/api/geoguide/museums/${params.id}/analytics-token`,
        { method: "DELETE" }
      );
      setTokenData({ hasToken: false, analyticsUrl: null, createdAt: null });
    } catch (e) {
      console.error(e);
    } finally {
      setTokenLoading(false);
    }
  };

  const copyUrl = () => {
    if (tokenData.analyticsUrl) {
      navigator.clipboard.writeText(tokenData.analyticsUrl);
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2000);
    }
  };

  const fetchPortalCredentials = async () => {
    try {
      const res = await fetch(
        `/api/geoguide/museums/${params.id}/portal-credentials`
      );
      if (res.ok) {
        const data = await res.json();
        setPortalHasCredentials(data.hasCredentials);
        if (data.username) setPortalUsername(data.username);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const savePortalCredentials = async () => {
    setPortalLoading(true);
    setPortalError("");
    setPortalSuccess("");
    try {
      const res = await fetch(
        `/api/geoguide/museums/${params.id}/portal-credentials`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: portalUsername,
            password: portalPassword,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setPortalError(data.error);
        return;
      }
      setPortalHasCredentials(true);
      setPortalSuccess("credentials შენახულია ✓");
      setPortalPassword("");
    } catch {
      setPortalError("შეცდომა");
    } finally {
      setPortalLoading(false);
    }
  };

  const revokePortalCredentials = async () => {
    if (!confirm("წაიშალოს მუზეუმის წვდომა?")) return;
    setPortalLoading(true);
    try {
      await fetch(
        `/api/geoguide/museums/${params.id}/portal-credentials`,
        { method: "DELETE" }
      );
      setPortalHasCredentials(false);
      setPortalUsername("");
      setPortalSuccess("");
    } catch {
      setPortalError("შეცდომა");
    } finally {
      setPortalLoading(false);
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
    setSaving(true);

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

      const res = await fetch(`/api/geoguide/museums/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          latitude: formData.latitude ? parseFloat(formData.latitude) : null,
          longitude: formData.longitude
            ? parseFloat(formData.longitude)
            : null,
          vr360Price: formData.vr360Price ? parseFloat(formData.vr360Price) : null,
          ...localePayload,
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
      alert("შეცდომა მოხდა");
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
    return (
      <div className="text-center py-12">
        <p>მუზეუმი ვერ მოიძებნა</p>
        <Link href="/geoguide/museums">
          <Button className="mt-4">უკან დაბრუნება</Button>
        </Link>
      </div>
    );
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
            <p className="text-sm text-muted-foreground">{museum.slug}</p>
            <h1 className="text-3xl font-bold">{museum.name}</h1>
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

            {/* 360° VR Settings */}
            <Card>
              <CardHeader>
                <CardTitle>🥽 360° ხედი</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="show360View"
                    name="show360View"
                    checked={formData.show360View}
                    onChange={handleChange}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="show360View">360° ხედის ჩვენება</Label>
                </div>

                {formData.show360View && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="vrTourId">VR Tour ID</Label>
                      <Input
                        id="vrTourId"
                        name="vrTourId"
                        value={formData.vrTourId}
                        onChange={handleChange}
                        placeholder="მაგ: clxx..."
                      />
                      <p className="text-xs text-muted-foreground">
                        GeoGuide VR-დან ტურის ID (vr.geoguide.ge)
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="vr360IsFree"
                        name="vr360IsFree"
                        checked={formData.vr360IsFree}
                        onChange={handleChange}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="vr360IsFree">უფასო 360° ხედი</Label>
                    </div>

                    {!formData.vr360IsFree && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="vr360Price">360° ხედის ფასი (₾)</Label>
                          <Input
                            id="vr360Price"
                            name="vr360Price"
                            type="number"
                            step="0.01"
                            value={formData.vr360Price}
                            onChange={handleChange}
                            placeholder="5.00"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="vr360BundleWithAudio"
                            name="vr360BundleWithAudio"
                            checked={formData.vr360BundleWithAudio}
                            onChange={handleChange}
                            className="h-4 w-4"
                          />
                          <Label htmlFor="vr360BundleWithAudio">
                            აუდიო გიდთან ერთად (bundle)
                          </Label>
                        </div>
                        {formData.vr360BundleWithAudio && (
                          <p className="text-xs text-muted-foreground ml-6">
                            აუდიო გიდის შეძენისას 360° ხედიც ხელმისაწვდომი იქნება
                          </p>
                        )}
                      </>
                    )}
                  </>
                )}
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

            {/* Analytics Token */}
            <Card>
              <CardHeader>
                <CardTitle>ანალიტიკის წვდომა</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {tokenData.hasToken ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block" />
                        აქტიური ბმული
                      </span>
                      {tokenData.createdAt && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(tokenData.createdAt).toLocaleDateString(
                            "ka-GE"
                          )}
                        </span>
                      )}
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs font-mono break-all text-muted-foreground">
                        {tokenData.analyticsUrl}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={copyUrl}
                      >
                        {tokenCopied ? "✓ კოპირებულია" : "კოპირება"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={generateToken}
                        disabled={tokenLoading}
                      >
                        განახლება
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1 text-red-600 hover:text-red-700"
                        onClick={revokeToken}
                        disabled={tokenLoading}
                      >
                        გაუქმება
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      მუზეუმს არ აქვს ანალიტიკის წვდომა. გენერირება ახლავე:
                    </p>
                    <Button
                      type="button"
                      onClick={generateToken}
                      disabled={tokenLoading}
                      className="bg-amber-500 hover:bg-amber-600 text-white"
                    >
                      {tokenLoading ? "იქმნება..." : "🔗 ბმულის გენერირება"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Museum Portal */}
            <Card>
              <CardHeader>
                <CardTitle>მუზეუმის პორტალი</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  მუზეუმს შეუძლია შევიდეს საკუთარი username/password-ით და ნახოს ყოველდღიური სტატისტიკა.
                </p>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="portalUsername">Username</Label>
                    <Input
                      id="portalUsername"
                      type="text"
                      placeholder="akhaltsikhe-museum"
                      value={portalUsername}
                      onChange={(e) => setPortalUsername(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="portalPassword">პაროლი</Label>
                    <Input
                      id="portalPassword"
                      type="password"
                      placeholder="მინიმუმ 6 სიმბოლო"
                      value={portalPassword}
                      onChange={(e) => setPortalPassword(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  {portalError && (
                    <p className="text-sm text-red-600">{portalError}</p>
                  )}
                  {portalSuccess && (
                    <p className="text-sm text-green-600">{portalSuccess}</p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={savePortalCredentials}
                      disabled={portalLoading}
                      className="bg-amber-500 hover:bg-amber-600 text-white"
                    >
                      {portalLoading
                        ? "შენახვა..."
                        : portalHasCredentials
                          ? "განახლება"
                          : "შექმნა"}
                    </Button>
                    {portalHasCredentials && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={revokePortalCredentials}
                        disabled={portalLoading}
                        className="text-red-600 hover:text-red-700"
                      >
                        წაშლა
                      </Button>
                    )}
                  </div>
                  {portalHasCredentials && (
                    <div className="bg-muted p-3 rounded-lg text-xs text-muted-foreground">
                      🔗 Login URL:{" "}
                      <span className="font-mono">
                        {process.env.NEXT_PUBLIC_APP_URL ||
                          "https://saas-platform-super-admin.vercel.app"}
                        /museum-portal/login
                      </span>
                    </div>
                  )}
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
