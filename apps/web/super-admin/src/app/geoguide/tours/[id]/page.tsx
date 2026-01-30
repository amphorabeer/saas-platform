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
import { ArrowLeft, Save, Loader2, Trash2, Plus, GripVertical, X } from "lucide-react";
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

interface Translation {
  langCode: string;
  name: string;
  description: string;
}

interface TourStop {
  id: string;
  title: string;
  titleEn: string | null;
  audioUrl: string | null;
  imageUrl: string | null;
  orderIndex: number;
  isPublished?: boolean;
}

interface Tour {
  id: string;
  name: string;
  nameEn: string | null;
  nameRu: string | null;
  description: string | null;
  descriptionEn: string | null;
  duration: number | null;
  isFree: boolean;
  price: number | null;
  currency: string;
  coverImage: string | null;
  isPublished: boolean;
  museum: {
    id: string;
    name: string;
  };
  stops: TourStop[];
}

export default function EditTourPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tour, setTour] = useState<Tour | null>(null);
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [showLangPicker, setShowLangPicker] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    duration: "",
    isFree: true,
    price: "",
    currency: "GEL",
    coverImage: "",
    isPublished: false,
  });

  // New Stop Form State
  const [showNewStop, setShowNewStop] = useState(false);
  const [newStopData, setNewStopData] = useState({
    title: "",
    audioUrl: "",
    imageUrl: "",
  });
  const [newStopTranslations, setNewStopTranslations] = useState<{ langCode: string; title: string; audioUrl: string }[]>([]);
  const [showNewStopLangPicker, setShowNewStopLangPicker] = useState(false);
  const [addingStop, setAddingStop] = useState(false);

  useEffect(() => {
    fetchTour();
  }, [params.id]);

  const fetchTour = async () => {
    try {
      const res = await fetch(`/api/geoguide/tours/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setTour(data);
        setFormData({
          name: data.name || "",
          description: data.description || "",
          duration: data.duration?.toString() || "",
          isFree: data.isFree,
          price: data.price?.toString() || "",
          currency: data.currency || "GEL",
          coverImage: data.coverImage || "",
          isPublished: data.isPublished,
        });

        // Load existing translations
        const existingTranslations: Translation[] = [];
        if (data.nameEn || data.descriptionEn) {
          existingTranslations.push({
            langCode: "en",
            name: data.nameEn || "",
            description: data.descriptionEn || "",
          });
        }
        if (data.nameRu) {
          existingTranslations.push({
            langCode: "ru",
            name: data.nameRu || "",
            description: "",
          });
        }
        setTranslations(existingTranslations);
      } else {
        alert("ტური ვერ მოიძებნა");
        router.push("/geoguide/tours");
      }
    } catch (error) {
      console.error("Error fetching tour:", error);
    } finally {
      setLoading(false);
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
    setSaving(true);

    try {
      const res = await fetch(`/api/geoguide/tours/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          duration: formData.duration ? parseInt(formData.duration) : null,
          price: formData.price ? parseFloat(formData.price) : null,
          nameEn: translations.find((t) => t.langCode === "en")?.name || null,
          nameRu: translations.find((t) => t.langCode === "ru")?.name || null,
          descriptionEn: translations.find((t) => t.langCode === "en")?.description || null,
        }),
      });

      if (res.ok) {
        alert("ტური წარმატებით განახლდა!");
      } else {
        const error = await res.json();
        alert(error.message || "შეცდომა მოხდა");
      }
    } catch (error) {
      console.error("Error updating tour:", error);
      alert("შეცდომა მოხდა");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("დარწმუნებული ხართ? წაიშლება ტური და ყველა გაჩერება!")) return;

    try {
      const res = await fetch(`/api/geoguide/tours/${params.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.push("/geoguide/tours");
      }
    } catch (error) {
      console.error("Error deleting tour:", error);
    }
  };

  const handleAddStop = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingStop(true);

    try {
      const enTrans = newStopTranslations.find((t) => t.langCode === "en");
      const ruTrans = newStopTranslations.find((t) => t.langCode === "ru");

      const res = await fetch(`/api/geoguide/tours/${params.id}/stops`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newStopData.title,
          titleEn: enTrans?.title || null,
          titleRu: ruTrans?.title || null,
          audioUrl: newStopData.audioUrl || null,
          audioUrlEn: enTrans?.audioUrl || null,
          imageUrl: newStopData.imageUrl || null,
          orderIndex: tour?.stops.length || 0,
        }),
      });

      if (res.ok) {
        const newStop = await res.json();
        setTour((prev) => prev ? { ...prev, stops: [...prev.stops, newStop] } : null);
        setNewStopData({ title: "", audioUrl: "", imageUrl: "" });
        setNewStopTranslations([]);
        setShowNewStop(false);
      } else {
        const error = await res.json();
        alert(error.message || "შეცდომა მოხდა");
      }
    } catch (error) {
      console.error("Error adding stop:", error);
    } finally {
      setAddingStop(false);
    }
  };

  const handleDeleteStop = async (stopId: string) => {
    if (!confirm("წავშალოთ ეს გაჩერება?")) return;

    try {
      const res = await fetch(`/api/geoguide/tours/${params.id}/stops/${stopId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setTour((prev) => prev ? { ...prev, stops: prev.stops.filter((s) => s.id !== stopId) } : null);
      }
    } catch (error) {
      console.error("Error deleting stop:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (!tour) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/geoguide/tours">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              უკან
            </Button>
          </Link>
          <div>
            <p className="text-sm text-muted-foreground">{tour.museum.name}</p>
            <h1 className="text-3xl font-bold">{tour.name}</h1>
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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Tour Settings - Left Column */}
        <div className="lg:col-span-1 space-y-6">
          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle>ძირითადი ინფორმაცია</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">სახელი (ქართულად) *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
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
                    rows={3}
                    className="w-full px-3 py-2 border rounded-md bg-background resize-none"
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
                          className="p-3 border rounded-lg bg-muted/30"
                        >
                          <div className="flex items-center justify-between mb-2">
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
                          <div className="space-y-2">
                            <Input
                              value={trans.name}
                              onChange={(e) =>
                                updateTranslation(trans.langCode, "name", e.target.value)
                              }
                              placeholder="სახელი"
                              className="text-sm"
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
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2 pt-4 border-t">
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

                <div className="space-y-2 pt-4 border-t">
                  <Label htmlFor="duration">ხანგრძლივობა (წთ)</Label>
                  <Input
                    id="duration"
                    name="duration"
                    type="number"
                    value={formData.duration}
                    onChange={handleChange}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isFree"
                    name="isFree"
                    checked={formData.isFree}
                    onChange={handleChange}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="isFree">უფასო</Label>
                </div>

                {!formData.isFree && (
                  <div className="space-y-2">
                    <Label htmlFor="price">ფასი</Label>
                    <Input
                      id="price"
                      name="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={handleChange}
                    />
                  </div>
                )}

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

                <Button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-amber-500 hover:bg-amber-600"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      შენახვა
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </form>
        </div>

        {/* Stops - Right Column */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>გაჩერებები ({tour.stops.length})</CardTitle>
              <Button
                size="sm"
                className="bg-amber-500 hover:bg-amber-600"
                onClick={() => setShowNewStop(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                დამატება
              </Button>
            </CardHeader>
            <CardContent>
              {/* New Stop Form */}
              {showNewStop && (
                <form onSubmit={handleAddStop} className="mb-6 p-4 border rounded-lg bg-muted/50">
                  <h4 className="font-medium mb-4">ახალი გაჩერება</h4>
                  <div className="space-y-4">
                    {/* Georgian - Main */}
                    <div className="p-3 border rounded-lg bg-background">
                      <div className="text-sm font-medium text-amber-600 mb-2">🇬🇪 ქართული (მთავარი)</div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>სახელი *</Label>
                          <Input
                            value={newStopData.title}
                            onChange={(e) => setNewStopData({ ...newStopData, title: e.target.value })}
                            placeholder="გაჩერების სახელი"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>აუდიო</Label>
                          <FileUpload
                            accept="audio/*"
                            folder="audio/ka"
                            type="audio"
                            label="აუდიო (ქართ)"
                            currentUrl={newStopData.audioUrl}
                            onUpload={(url) => setNewStopData({ ...newStopData, audioUrl: url })}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Translations */}
                    {newStopTranslations.map((trans) => (
                      <div key={trans.langCode} className="p-3 border rounded-lg bg-background">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">{getLanguageName(trans.langCode)}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setNewStopTranslations(newStopTranslations.filter((t) => t.langCode !== trans.langCode))}
                            className="text-red-500 h-6 w-6 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>სახელი</Label>
                            <Input
                              value={trans.title}
                              onChange={(e) =>
                                setNewStopTranslations(
                                  newStopTranslations.map((t) =>
                                    t.langCode === trans.langCode ? { ...t, title: e.target.value } : t
                                  )
                                )
                              }
                              placeholder={`სახელი (${getLanguageName(trans.langCode)})`}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>აუდიო</Label>
                            <FileUpload
                              accept="audio/*"
                              folder={`audio/${trans.langCode}`}
                              type="audio"
                              label={`აუდიო (${getLanguageName(trans.langCode)})`}
                              currentUrl={trans.audioUrl}
                              onUpload={(url) =>
                                setNewStopTranslations(
                                  newStopTranslations.map((t) =>
                                    t.langCode === trans.langCode ? { ...t, audioUrl: url } : t
                                  )
                                )
                              }
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Add Language Button */}
                    <div className="relative">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowNewStopLangPicker(!showNewStopLangPicker)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        ენის დამატება
                      </Button>

                      {showNewStopLangPicker && (
                        <div className="absolute left-0 top-full mt-1 bg-background border rounded-lg shadow-lg z-10 py-1 min-w-[200px]">
                          {AVAILABLE_LANGUAGES.filter((l) => !newStopTranslations.find((t) => t.langCode === l.code)).map((lang) => (
                            <button
                              key={lang.code}
                              type="button"
                              onClick={() => {
                                setNewStopTranslations([...newStopTranslations, { langCode: lang.code, title: "", audioUrl: "" }]);
                                setShowNewStopLangPicker(false);
                              }}
                              className="w-full px-4 py-2 text-left hover:bg-muted text-sm"
                            >
                              {lang.name} ({lang.nameEn})
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Image - shared */}
                    <div className="space-y-2">
                      <Label>სურათი (საერთო)</Label>
                      <FileUpload
                        accept="image/*"
                        folder="images/stops"
                        type="image"
                        label="სურათის ატვირთვა"
                        currentUrl={newStopData.imageUrl}
                        onUpload={(url) => setNewStopData({ ...newStopData, imageUrl: url })}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button type="submit" disabled={addingStop} size="sm" className="bg-amber-500 hover:bg-amber-600">
                      {addingStop ? <Loader2 className="h-4 w-4 animate-spin" /> : "დამატება"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowNewStop(false);
                        setNewStopTranslations([]);
                      }}
                    >
                      გაუქმება
                    </Button>
                  </div>
                </form>
              )}

              {/* Stops List */}
              {tour.stops.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="text-4xl mb-2">📍</div>
                  <p>გაჩერებები ჯერ არ არის</p>
                  <p className="text-sm">დაამატეთ პირველი გაჩერება</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tour.stops
                    .sort((a, b) => a.orderIndex - b.orderIndex)
                    .map((stop, index) => (
                      <div
                        key={stop.id}
                        className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50"
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                        <span className="w-6 h-6 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center">
                          {index + 1}
                        </span>
                        <div className="flex-1">
                          <div className="font-medium">{stop.title}</div>
                          {stop.titleEn && (
                            <div className="text-sm text-muted-foreground">{stop.titleEn}</div>
                          )}
                        </div>

                        {/* Status badges */}
                        <div className="flex items-center gap-2">
                          {stop.isPublished ? (
                            <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                              აქტიური
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500">
                              არააქტიური
                            </span>
                          )}
                          {stop.audioUrl && (
                            <span className="text-xs text-green-600">🎧 აუდიო</span>
                          )}
                          {stop.imageUrl && (
                            <span className="text-xs text-blue-600">🖼 სურათი</span>
                          )}
                        </div>

                        <Link href={`/geoguide/tours/${params.id}/stops/${stop.id}`}>
                          <Button variant="outline" size="sm">
                            რედაქტირება
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => handleDeleteStop(stop.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
