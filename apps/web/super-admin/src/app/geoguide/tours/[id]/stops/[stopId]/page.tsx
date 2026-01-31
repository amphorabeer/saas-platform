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
import { ArrowLeft, Save, Loader2, QrCode, Plus, X } from "lucide-react";
import { FileUpload } from "@/components/FileUpload";

const AVAILABLE_LANGUAGES = [
  { code: "en", name: "ინგლისური", nameEn: "English" },
  { code: "ru", name: "რუსული", nameEn: "Russian" },
  { code: "de", name: "გერმანული", nameEn: "German" },
  { code: "fr", name: "ფრანგული", nameEn: "French" },
  { code: "es", name: "ესპანური", nameEn: "Spanish" },
  { code: "it", name: "იტალიური", nameEn: "Italian" },
  { code: "tr", name: "თურქული", nameEn: "Turkish" },
  { code: "zh", name: "ჩინური", nameEn: "Chinese" },
  { code: "uk", name: "უკრაინული", nameEn: "Ukrainian" },
  { code: "ja", name: "იაპონური", nameEn: "Japanese" },
  { code: "ar", name: "არაბული", nameEn: "Arabic" },
];

interface Translation {
  langCode: string;
  title: string;
  description: string;
  transcript: string;
  audioUrl: string;
}

interface TourStop {
  id: string;
  tourId: string;
  title: string;
  titleEn: string | null;
  titleRu: string | null;
  description: string | null;
  descriptionEn: string | null;
  transcript: string | null;
  transcriptEn: string | null;
  audioUrl: string | null;
  audioUrlEn: string | null;
  imageUrl: string | null;
  qrCode: string | null;
  orderIndex: number;
  isPublished: boolean;
}

export default function EditStopPage({
  params,
}: {
  params: { id: string; stopId: string };
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stop, setStop] = useState<TourStop | null>(null);
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [showLangPicker, setShowLangPicker] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    transcript: "",
    audioUrl: "",
    imageUrl: "",
    isPublished: false,
  });

  useEffect(() => {
    fetchStop();
  }, [params.stopId]);

  const fetchStop = async () => {
    try {
      const res = await fetch(
        `/api/geoguide/tours/${params.id}/stops/${params.stopId}`
      );
      if (res.ok) {
        const data = await res.json();
        setStop(data);
        setFormData({
          title: data.title || "",
          description: data.description || "",
          transcript: data.transcript || "",
          audioUrl: data.audioUrl || "",
          imageUrl: data.imageUrl || "",
          isPublished: data.isPublished || false,
        });

        // Load existing translations
        const existingTranslations: Translation[] = [];
        if (data.titleEn || data.descriptionEn || data.audioUrlEn || data.transcriptEn) {
          existingTranslations.push({
            langCode: "en",
            title: data.titleEn || "",
            description: data.descriptionEn || "",
            transcript: data.transcriptEn || "",
            audioUrl: data.audioUrlEn || "",
          });
        }
        if (data.titleRu) {
          existingTranslations.push({
            langCode: "ru",
            title: data.titleRu || "",
            description: "",
            transcript: "",
            audioUrl: "",
          });
        }
        setTranslations(existingTranslations);
      } else {
        alert("გაჩერება ვერ მოიძებნა");
        router.push(`/geoguide/tours/${params.id}`);
      }
    } catch (error) {
      console.error("Error fetching stop:", error);
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
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const addTranslation = (langCode: string) => {
    if (translations.find((t) => t.langCode === langCode)) return;
    setTranslations([...translations, { langCode, title: "", description: "", transcript: "", audioUrl: "" }]);
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
    setSaving(true);

    try {
      const res = await fetch(
        `/api/geoguide/tours/${params.id}/stops/${params.stopId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            titleEn: translations.find((t) => t.langCode === "en")?.title || null,
            titleRu: translations.find((t) => t.langCode === "ru")?.title || null,
            titleUk: translations.find((t) => t.langCode === "uk")?.title || null,
            descriptionEn: translations.find((t) => t.langCode === "en")?.description || null,
            transcriptEn: translations.find((t) => t.langCode === "en")?.transcript || null,
            audioUrlEn: translations.find((t) => t.langCode === "en")?.audioUrl || null,
            descriptionRu: translations.find((t) => t.langCode === "ru")?.description || null,
            transcriptRu: translations.find((t) => t.langCode === "ru")?.transcript || null,
            audioUrlRu: translations.find((t) => t.langCode === "ru")?.audioUrl || null,
            descriptionUk: translations.find((t) => t.langCode === "uk")?.description || null,
            transcriptUk: translations.find((t) => t.langCode === "uk")?.transcript || null,
            audioUrlUk: translations.find((t) => t.langCode === "uk")?.audioUrl || null,
          }),
        }
      );

      if (res.ok) {
        alert("გაჩერება წარმატებით განახლდა!");
      } else {
        const error = await res.json();
        alert(error.message || "შეცდომა მოხდა");
      }
    } catch (error) {
      console.error("Error updating stop:", error);
      alert("შეცდომა მოხდა");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (!stop) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/geoguide/tours/${params.id}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            უკან ტურზე
          </Button>
        </Link>
        <div>
          <p className="text-sm text-muted-foreground">
            გაჩერება #{stop.orderIndex + 1}
          </p>
          <h1 className="text-3xl font-bold">{stop.title}</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column - Basic Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>ძირითადი ინფორმაცია (ქართულად)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">სახელი *</Label>
                  <Input
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
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
                    rows={3}
                    className="w-full px-3 py-2 border rounded-md bg-background resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transcript">ტრანსკრიპტი</Label>
                  <textarea
                    id="transcript"
                    name="transcript"
                    value={formData.transcript}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-3 py-2 border rounded-md bg-background resize-none"
                    placeholder="აუდიოს სრული ტექსტი..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>აუდიო</Label>
                  <FileUpload
                    accept="audio/*"
                    folder="audio/ka"
                    type="audio"
                    label="აუდიო ატვირთვა"
                    currentUrl={formData.audioUrl}
                    onUpload={(url) => setFormData({ ...formData, audioUrl: url })}
                  />
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
                            onClick={() => removeTranslation(trans.langCode)}
                            className="text-red-500 hover:text-red-600 h-6 w-6 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="space-y-3">
                          <Input
                            value={trans.title}
                            onChange={(e) =>
                              updateTranslation(trans.langCode, "title", e.target.value)
                            }
                            placeholder="სახელი"
                          />
                          <textarea
                            value={trans.description}
                            onChange={(e) =>
                              updateTranslation(trans.langCode, "description", e.target.value)
                            }
                            rows={2}
                            className="w-full px-3 py-2 border rounded-md bg-background resize-none text-sm"
                            placeholder="აღწერა"
                          />
                          <textarea
                            value={trans.transcript}
                            onChange={(e) =>
                              updateTranslation(trans.langCode, "transcript", e.target.value)
                            }
                            rows={3}
                            className="w-full px-3 py-2 border rounded-md bg-background resize-none text-sm"
                            placeholder="ტრანსკრიპტი"
                          />
                          <div className="space-y-2">
                            <Label className="text-sm">აუდიო ({getLanguageName(trans.langCode)})</Label>
                            <FileUpload
                              accept="audio/*"
                              folder={`audio/${trans.langCode}`}
                              type="audio"
                              label={`აუდიო (${getLanguageName(trans.langCode)})`}
                              currentUrl={trans.audioUrl}
                              onUpload={(url) =>
                                updateTranslation(trans.langCode, "audioUrl", url)
                              }
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

          {/* Right Column - Media & QR */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>სურათი</CardTitle>
              </CardHeader>
              <CardContent>
                <FileUpload
                  accept="image/*"
                  folder="images/stops"
                  type="image"
                  label="სურათის ატვირთვა"
                  currentUrl={formData.imageUrl}
                  onUpload={(url) => setFormData({ ...formData, imageUrl: url })}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  QR კოდი
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="font-mono text-lg font-bold">{stop.qrCode}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    ეს კოდი გამოიყენება ადგილზე QR სკანერისთვის
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4 mt-6">
          <Link href={`/geoguide/tours/${params.id}`}>
            <Button variant="outline" type="button">
              გაუქმება
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={saving}
            className="bg-amber-500 hover:bg-amber-600"
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
      </form>
    </div>
  );
}
