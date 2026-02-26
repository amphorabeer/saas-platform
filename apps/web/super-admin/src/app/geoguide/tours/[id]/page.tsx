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
import { ArrowLeft, Save, Loader2, Trash2, Plus, GripVertical, X, Building2, ChevronDown, ChevronRight, Image as ImageIcon, Pencil } from "lucide-react";
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

interface HallTranslation {
  langCode: string;
  name: string;
}

interface Hall {
  id: string;
  name: string;
  nameEn: string | null;
  nameRu: string | null;
  nameUk: string | null;
  floorNumber: number | null;
  imageUrl: string | null;
  orderIndex: number;
  isPublished: boolean;
  _count?: { stops: number };
}

interface TourStop {
  id: string;
  title: string;
  titleEn: string | null;
  audioUrl: string | null;
  imageUrl: string | null;
  orderIndex: number;
  isPublished?: boolean;
  hallId?: string | null;
}

interface Tour {
  id: string;
  name: string;
  nameEn: string | null;
  nameRu: string | null;
  nameUk: string | null;
  description: string | null;
  descriptionEn: string | null;
  descriptionRu: string | null;
  descriptionUk: string | null;
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
  halls: Hall[];
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
    allowActivationCodes: true,
    allowBankPayment: true,
    vrTourId: "",
  });

  // Expanded halls state
  const [expandedHalls, setExpandedHalls] = useState<Set<string>>(new Set());

  // New Stop Form State
  const [showNewStop, setShowNewStop] = useState(false);
  const [activeHallIdForNewStop, setActiveHallIdForNewStop] = useState<string | null>(null);
  const [newStopData, setNewStopData] = useState({
    title: "",
    audioUrl: "",
    imageUrl: "",
    hallId: "",
  });
  const [newStopTranslations, setNewStopTranslations] = useState<{ langCode: string; title: string; audioUrl: string }[]>([]);
  const [showNewStopLangPicker, setShowNewStopLangPicker] = useState(false);
  const [addingStop, setAddingStop] = useState(false);

  // New Hall Form State
  const [showNewHall, setShowNewHall] = useState(false);
  const [newHallData, setNewHallData] = useState({
    name: "",
    imageUrl: "",
  });
  const [newHallTranslations, setNewHallTranslations] = useState<HallTranslation[]>([]);
  const [showNewHallLangPicker, setShowNewHallLangPicker] = useState(false);
  const [addingHall, setAddingHall] = useState(false);

  // Editing order index state
  const [editingOrderIndex, setEditingOrderIndex] = useState<string | null>(null);
  const [tempOrderIndex, setTempOrderIndex] = useState<string>("");

  // Editing hall state
  const [editingHallId, setEditingHallId] = useState<string | null>(null);
  const [editHallData, setEditHallData] = useState<{
    name: string;
    nameEn: string;
    nameRu: string;
    nameUk: string;
    imageUrl: string;
    orderIndex: number;
    isPublished: boolean;
  }>({ name: "", nameEn: "", nameRu: "", nameUk: "", imageUrl: "", orderIndex: 0, isPublished: true });
  const [savingHall, setSavingHall] = useState(false);

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
          allowActivationCodes: data.allowActivationCodes ?? true,
          allowBankPayment: data.allowBankPayment ?? true,
          vrTourId: data.vrTourId || "",
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
        if (data.nameRu || data.descriptionRu) {
          existingTranslations.push({
            langCode: "ru",
            name: data.nameRu || "",
            description: data.descriptionRu || "",
          });
        }
        if (data.nameUk || data.descriptionUk) {
          existingTranslations.push({
            langCode: "uk",
            name: data.nameUk || "",
            description: data.descriptionUk || "",
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

  const updateStopOrderIndex = async (stopId: string, newIndex: number) => {
    try {
      const res = await fetch(`/api/geoguide/tours/${params.id}/stops/${stopId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIndex: newIndex }),
      });
      if (res.ok) {
        // Update local state
        setTour((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            stops: prev.stops.map((s) =>
              s.id === stopId ? { ...s, orderIndex: newIndex } : s
            ),
          };
        });
        setEditingOrderIndex(null);
      } else {
        alert("ნომრის განახლება ვერ მოხერხდა");
      }
    } catch (error) {
      console.error("Error updating order index:", error);
      alert("შეცდომა");
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

  const toggleHallExpanded = (hallId: string) => {
    setExpandedHalls((prev) => {
      const next = new Set(prev);
      if (next.has(hallId)) {
        next.delete(hallId);
      } else {
        next.add(hallId);
      }
      return next;
    });
  };

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
          nameUk: translations.find((t) => t.langCode === "uk")?.name || null,
          descriptionEn: translations.find((t) => t.langCode === "en")?.description || null,
          descriptionRu: translations.find((t) => t.langCode === "ru")?.description || null,
          descriptionUk: translations.find((t) => t.langCode === "uk")?.description || null,
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

  // Hall functions
  const handleAddHall = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingHall(true);

    try {
      const enTrans = newHallTranslations.find((t) => t.langCode === "en");
      const ruTrans = newHallTranslations.find((t) => t.langCode === "ru");
      const ukTrans = newHallTranslations.find((t) => t.langCode === "uk");

      const res = await fetch(`/api/geoguide/tours/${params.id}/halls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newHallData.name,
          nameEn: enTrans?.name || null,
          nameRu: ruTrans?.name || null,
          nameUk: ukTrans?.name || null,
          imageUrl: newHallData.imageUrl || null,
        }),
      });

      if (res.ok) {
        const newHall = await res.json();
        setTour((prev) => prev ? { ...prev, halls: [...prev.halls, newHall] } : null);
        setNewHallData({ name: "", imageUrl: "" });
        setNewHallTranslations([]);
        setShowNewHall(false);
      } else {
        const error = await res.json();
        alert(error.message || "შეცდომა მოხდა");
      }
    } catch (error) {
      console.error("Error adding hall:", error);
    } finally {
      setAddingHall(false);
    }
  };

  const handleDeleteHall = async (hallId: string) => {
    if (!confirm("წავშალოთ ეს დარბაზი? გაჩერებები არ წაიშლება, მხოლოდ დარბაზთან კავშირი გაუქმდება.")) return;

    try {
      const res = await fetch(`/api/geoguide/tours/${params.id}/halls/${hallId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setTour((prev) => prev ? { ...prev, halls: prev.halls.filter((h) => h.id !== hallId) } : null);
        setEditingHallId(null);
      }
    } catch (error) {
      console.error("Error deleting hall:", error);
    }
  };

  const openEditHall = (hall: Hall) => {
    setExpandedHalls((prev) => new Set(prev).add(hall.id));
    setEditingHallId(hall.id);
    setEditHallData({
      name: hall.name,
      nameEn: hall.nameEn || "",
      nameRu: hall.nameRu || "",
      nameUk: hall.nameUk || "",
      imageUrl: hall.imageUrl || "",
      orderIndex: hall.orderIndex,
      isPublished: hall.isPublished,
    });
  };

  const handleUpdateHall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHallId) return;
    setSavingHall(true);
    try {
      const res = await fetch(`/api/geoguide/tours/${params.id}/halls/${editingHallId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editHallData.name,
          nameEn: editHallData.nameEn || null,
          nameRu: editHallData.nameRu || null,
          nameUk: editHallData.nameUk || null,
          imageUrl: editHallData.imageUrl || null,
          orderIndex: editHallData.orderIndex,
          isPublished: editHallData.isPublished,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTour((prev) =>
          prev
            ? {
                ...prev,
                halls: prev.halls.map((h) => (h.id === editingHallId ? updated : h)),
              }
            : null
        );
        setEditingHallId(null);
      } else {
        const err = await res.json();
        alert(err.error || "შეცდომა");
      }
    } catch (error) {
      console.error("Error updating hall:", error);
    } finally {
      setSavingHall(false);
    }
  };

  const openNewStopForm = (hallId?: string) => {
    setActiveHallIdForNewStop(hallId || null);
    setNewStopData({ title: "", audioUrl: "", imageUrl: "", hallId: hallId || "" });
    setNewStopTranslations([]);
    setShowNewStop(true);
  };

  const handleAddStop = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingStop(true);

    try {
      const enTrans = newStopTranslations.find((t) => t.langCode === "en");
      const ruTrans = newStopTranslations.find((t) => t.langCode === "ru");
      const ukTrans = newStopTranslations.find((t) => t.langCode === "uk");

      const hallId = activeHallIdForNewStop || newStopData.hallId || null;

      const res = await fetch(`/api/geoguide/tours/${params.id}/stops`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newStopData.title,
          titleEn: enTrans?.title || null,
          titleRu: ruTrans?.title || null,
          titleUk: ukTrans?.title || null,
          audioUrl: newStopData.audioUrl || null,
          audioUrlEn: enTrans?.audioUrl || null,
          audioUrlRu: ruTrans?.audioUrl || null,
          audioUrlUk: ukTrans?.audioUrl || null,
          imageUrl: newStopData.imageUrl || null,
          hallId: hallId,
          orderIndex: tour?.stops.length || 0,
        }),
      });

      if (res.ok) {
        const newStop = await res.json();
        setTour((prev) => prev ? { ...prev, stops: [...prev.stops, newStop] } : null);
        setNewStopData({ title: "", audioUrl: "", imageUrl: "", hallId: "" });
        setNewStopTranslations([]);
        setShowNewStop(false);
        setActiveHallIdForNewStop(null);
        // Refresh to update hall stop counts
        fetchTour();
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
        // Refresh to update hall stop counts
        fetchTour();
      }
    } catch (error) {
      console.error("Error deleting stop:", error);
    }
  };

  const getHallName = (hallId: string | null | undefined) => {
    if (!hallId) return null;
    const hall = tour?.halls.find((h) => h.id === hallId);
    return hall?.name || null;
  };

  const getStopsForHall = (hallId: string) => {
    return tour?.stops.filter((s) => s.hallId === hallId) || [];
  };

  const getStopsWithoutHall = () => {
    return tour?.stops.filter((s) => !s.hallId) || [];
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
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  />
                </div>

                {/* Translations */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>თარგმანები</Label>
                    <div className="relative">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowLangPicker(!showLangPicker)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        ენის დამატება
                      </Button>
                      {showLangPicker && availableToAdd.length > 0 && (
                        <div className="absolute right-0 top-full mt-1 bg-white border rounded-md shadow-lg z-10 min-w-[150px]">
                          {availableToAdd.map((lang) => (
                            <button
                              key={lang.code}
                              type="button"
                              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
                              onClick={() => addTranslation(lang.code)}
                            >
                              {lang.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {translations.map((trans) => (
                    <div key={trans.langCode} className="p-3 border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{getLanguageName(trans.langCode)}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTranslation(trans.langCode)}
                          className="text-red-500 h-6 w-6 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <Input
                        value={trans.name}
                        onChange={(e) => updateTranslation(trans.langCode, "name", e.target.value)}
                        placeholder="სახელი"
                      />
                      <textarea
                        value={trans.description}
                        onChange={(e) => updateTranslation(trans.langCode, "description", e.target.value)}
                        placeholder="აღწერა"
                        rows={2}
                        className="w-full px-3 py-2 border rounded-md text-sm"
                      />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration">ხანგრძლივობა (წუთი)</Label>
                    <Input
                      id="duration"
                      name="duration"
                      type="number"
                      value={formData.duration}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">ვალუტა</Label>
                    <select
                      id="currency"
                      name="currency"
                      value={formData.currency}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-md text-sm"
                    >
                      <option value="GEL">GEL (₾)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>
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
                  <Label htmlFor="isFree">უფასო ტური</Label>
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

                {/* Payment Options */}
                {!formData.isFree && (
                  <div className="pt-4 border-t space-y-3">
                    <Label className="text-sm font-medium">გადახდის მეთოდები</Label>
                    
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="allowBankPayment"
                        name="allowBankPayment"
                        checked={formData.allowBankPayment}
                        onChange={handleChange}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="allowBankPayment" className="font-normal">
                        💳 ბანკით გადახდა (ონლაინ)
                      </Label>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="allowActivationCodes"
                        name="allowActivationCodes"
                        checked={formData.allowActivationCodes}
                        onChange={handleChange}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="allowActivationCodes" className="font-normal">
                        🔑 აქტივაციის კოდები (მუზეუმში ყიდვა)
                      </Label>
                    </div>

                    {!formData.allowBankPayment && !formData.allowActivationCodes && (
                      <p className="text-sm text-red-500">
                        ⚠️ აირჩიეთ მინიმუმ ერთი გადახდის მეთოდი
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label>გარეკანის სურათი</Label>
                  <FileUpload
                    accept="image/*"
                    folder="tours"
                    currentUrl={formData.coverImage}
                    onUpload={(url) => setFormData({ ...formData, coverImage: url })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vrTourId">VR Tour ID (360°)</Label>
                  <Input
                    id="vrTourId"
                    name="vrTourId"
                    value={formData.vrTourId}
                    onChange={handleChange}
                    placeholder="მაგ: cmm0y2t580001y5cbvoq756d6"
                  />
                  <p className="text-xs text-muted-foreground">
                    vr.geoguide.ge-დან ტურის ID — 360° ხედისთვის
                  </p>
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

                <Button
                  type="submit"
                  disabled={saving || (!formData.isFree && !formData.allowBankPayment && !formData.allowActivationCodes)}
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

        {/* Halls and Stops - Right Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Halls Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                დარბაზები ({tour.halls?.length || 0})
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowNewHall(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                დამატება
              </Button>
            </CardHeader>
            <CardContent>
              {/* New Hall Form */}
              {showNewHall && (
                <form onSubmit={handleAddHall} className="mb-4 p-4 border rounded-lg bg-muted/50">
                  <h4 className="font-medium mb-3">ახალი დარბაზი</h4>
                  <div className="space-y-4">
                    {/* Georgian - Main */}
                    <div className="p-3 border rounded-lg bg-background">
                      <div className="text-sm font-medium text-amber-600 mb-2">🇬🇪 ქართული (მთავარი)</div>
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label>სახელი *</Label>
                          <Input
                            value={newHallData.name}
                            onChange={(e) => setNewHallData({ ...newHallData, name: e.target.value })}
                            placeholder="მაგ: პირველი სართული"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>სურათი</Label>
                          <FileUpload
                            accept="image/*"
                            folder="halls"
                            currentUrl={newHallData.imageUrl}
                            onUpload={(url) => setNewHallData({ ...newHallData, imageUrl: url })}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Translations */}
                    {newHallTranslations.map((trans) => (
                      <div key={trans.langCode} className="p-3 border rounded-lg bg-background">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">{getLanguageName(trans.langCode)}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setNewHallTranslations(newHallTranslations.filter((t) => t.langCode !== trans.langCode))}
                            className="text-red-500 h-6 w-6 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <Input
                          value={trans.name}
                          onChange={(e) =>
                            setNewHallTranslations(
                              newHallTranslations.map((t) =>
                                t.langCode === trans.langCode ? { ...t, name: e.target.value } : t
                              )
                            )
                          }
                          placeholder={`სახელი (${getLanguageName(trans.langCode)})`}
                        />
                      </div>
                    ))}

                    {/* Add Language Button */}
                    <div className="relative">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowNewHallLangPicker(!showNewHallLangPicker)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        ენის დამატება
                      </Button>
                      {showNewHallLangPicker && (
                        <div className="absolute left-0 top-full mt-1 bg-white border rounded-md shadow-lg z-10 min-w-[150px]">
                          {AVAILABLE_LANGUAGES.filter(
                            (l) => !newHallTranslations.find((t) => t.langCode === l.code)
                          ).map((lang) => (
                            <button
                              key={lang.code}
                              type="button"
                              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
                              onClick={() => {
                                setNewHallTranslations([...newHallTranslations, { langCode: lang.code, name: "" }]);
                                setShowNewHallLangPicker(false);
                              }}
                            >
                              {lang.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button type="submit" disabled={addingHall} size="sm" className="bg-amber-500 hover:bg-amber-600">
                      {addingHall ? <Loader2 className="h-4 w-4 animate-spin" /> : "დამატება"}
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => {
                      setShowNewHall(false);
                      setNewHallTranslations([]);
                    }}>
                      გაუქმება
                    </Button>
                  </div>
                </form>
              )}

              {/* Halls List with Accordion */}
              {(!tour.halls || tour.halls.length === 0) ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">დარბაზები არ არის დამატებული</p>
                  <p className="text-xs">დარბაზები არასავალდებულოა - გამოიყენეთ დიდი მუზეუმებისთვის</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tour.halls
                    .sort((a, b) => a.orderIndex - b.orderIndex)
                    .map((hall, index) => {
                      const isExpanded = expandedHalls.has(hall.id);
                      const hallStops = getStopsForHall(hall.id);
                      
                      return (
                        <div key={hall.id} className="border rounded-lg overflow-hidden">
                          {/* Hall Header - Card Style */}
                          <div
                            className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-white cursor-pointer hover:bg-blue-100/50 transition-colors"
                            onClick={() => toggleHallExpanded(hall.id)}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-5 w-5 text-blue-500" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-blue-500" />
                            )}
                            
                            {hall.imageUrl ? (
                              <img
                                src={hall.imageUrl}
                                alt={hall.name}
                                className="w-16 h-16 object-cover rounded-lg"
                              />
                            ) : (
                              <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
                                <ImageIcon className="h-6 w-6 text-blue-400" />
                              </div>
                            )}
                            
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900">{hall.name}</div>
                              {hall.nameEn && (
                                <div className="text-sm text-muted-foreground">{hall.nameEn}</div>
                              )}
                              <div className="text-xs text-blue-600 mt-1">
                                {hallStops.length} გაჩერება
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-amber-600 hover:text-amber-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditHall(hall);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteHall(hall.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          {/* Expanded Content - Edit form or Stops */}
                          {isExpanded && (
                            <div className="border-t bg-gray-50 p-3">
                              {/* Inline Edit Hall Form */}
                              {editingHallId === hall.id && (
                                <form onSubmit={handleUpdateHall} className="mb-4 p-4 border rounded-lg bg-white">
                                  <h4 className="font-medium mb-3">დარბაზის რედაქტირება</h4>
                                  <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="space-y-2">
                                      <Label>სახელი (ქართულად) *</Label>
                                      <Input
                                        value={editHallData.name}
                                        onChange={(e) => setEditHallData({ ...editHallData, name: e.target.value })}
                                        required
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>სახელი (EN)</Label>
                                      <Input
                                        value={editHallData.nameEn}
                                        onChange={(e) => setEditHallData({ ...editHallData, nameEn: e.target.value })}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>სახელი (RU)</Label>
                                      <Input
                                        value={editHallData.nameRu}
                                        onChange={(e) => setEditHallData({ ...editHallData, nameRu: e.target.value })}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>სახელი (UK)</Label>
                                      <Input
                                        value={editHallData.nameUk}
                                        onChange={(e) => setEditHallData({ ...editHallData, nameUk: e.target.value })}
                                      />
                                    </div>
                                    <div className="space-y-2 sm:col-span-2">
                                      <Label>სურათი</Label>
                                      <FileUpload
                                        accept="image/*"
                                        folder="halls"
                                        currentUrl={editHallData.imageUrl}
                                        onUpload={(url) => setEditHallData({ ...editHallData, imageUrl: url })}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>თანმიმდევრობა (orderIndex)</Label>
                                      <Input
                                        type="number"
                                        value={editHallData.orderIndex}
                                        onChange={(e) => setEditHallData({ ...editHallData, orderIndex: parseInt(e.target.value) || 0 })}
                                      />
                                    </div>
                                    <div className="flex items-center gap-2 pt-2">
                                      <input
                                        type="checkbox"
                                        id={`hall-published-${hall.id}`}
                                        checked={editHallData.isPublished}
                                        onChange={(e) => setEditHallData({ ...editHallData, isPublished: e.target.checked })}
                                        className="h-4 w-4"
                                      />
                                      <Label htmlFor={`hall-published-${hall.id}`}>გამოქვეყნებული</Label>
                                    </div>
                                  </div>
                                  <div className="flex gap-2 mt-4">
                                    <Button type="submit" disabled={savingHall} size="sm" className="bg-amber-500 hover:bg-amber-600">
                                      {savingHall ? <Loader2 className="h-4 w-4 animate-spin" /> : "შენახვა"}
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setEditingHallId(null)}
                                    >
                                      გაუქმება
                                    </Button>
                                  </div>
                                </form>
                              )}
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-medium text-gray-600">გაჩერებები დარბაზში</span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openNewStopForm(hall.id);
                                  }}
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  დამატება
                                </Button>
                              </div>
                              
                              {hallStops.length === 0 ? (
                                <div className="text-center py-4 text-muted-foreground text-sm">
                                  გაჩერებები არ არის
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {hallStops
                                    .sort((a, b) => a.orderIndex - b.orderIndex)
                                    .map((stop, stopIndex) => (
                                      <div
                                        key={stop.id}
                                        className="flex items-center gap-3 p-3 bg-white rounded-lg border hover:bg-muted/50"
                                      >
                                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                                        {/* Editable Order Index */}
                                        {editingOrderIndex === stop.id ? (
                                          <input
                                            type="number"
                                            className="w-12 h-7 text-center text-sm border rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
                                            value={tempOrderIndex}
                                            onChange={(e) => setTempOrderIndex(e.target.value)}
                                            onBlur={() => {
                                              const newIndex = parseInt(tempOrderIndex);
                                              if (!isNaN(newIndex) && newIndex >= 0) {
                                                updateStopOrderIndex(stop.id, newIndex);
                                              } else {
                                                setEditingOrderIndex(null);
                                              }
                                            }}
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") {
                                                const newIndex = parseInt(tempOrderIndex);
                                                if (!isNaN(newIndex) && newIndex >= 0) {
                                                  updateStopOrderIndex(stop.id, newIndex);
                                                } else {
                                                  setEditingOrderIndex(null);
                                                }
                                              } else if (e.key === "Escape") {
                                                setEditingOrderIndex(null);
                                              }
                                            }}
                                            autoFocus
                                          />
                                        ) : (
                                          <button
                                            className="w-7 h-7 rounded-full bg-amber-500 text-white text-sm flex items-center justify-center hover:bg-amber-600 cursor-pointer"
                                            title="დააწკაპუნეთ ნომრის შესაცვლელად"
                                            onClick={() => {
                                              setEditingOrderIndex(stop.id);
                                              setTempOrderIndex(stop.orderIndex.toString());
                                            }}
                                          >
                                            {stop.orderIndex + 1}
                                          </button>
                                        )}
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
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stops Without Hall Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>გაჩერებები (დარბაზის გარეშე: {getStopsWithoutHall().length})</CardTitle>
              <Button
                size="sm"
                className="bg-amber-500 hover:bg-amber-600"
                onClick={() => openNewStopForm()}
              >
                <Plus className="h-4 w-4 mr-1" />
                დამატება
              </Button>
            </CardHeader>
            <CardContent>
              {/* New Stop Form */}
              {showNewStop && (
                <form onSubmit={handleAddStop} className="mb-6 p-4 border rounded-lg bg-muted/50">
                  <h4 className="font-medium mb-4">
                    ახალი გაჩერება
                    {activeHallIdForNewStop && (
                      <span className="text-blue-600 ml-2">
                        ({getHallName(activeHallIdForNewStop)})
                      </span>
                    )}
                  </h4>
                  <div className="space-y-4">
                    {/* Hall Selection - only if no active hall */}
                    {!activeHallIdForNewStop && tour.halls && tour.halls.length > 0 && (
                      <div className="space-y-2">
                        <Label>დარბაზი (არასავალდებულო)</Label>
                        <select
                          value={newStopData.hallId}
                          onChange={(e) => setNewStopData({ ...newStopData, hallId: e.target.value })}
                          className="w-full px-3 py-2 border rounded-md text-sm"
                        >
                          <option value="">-- დარბაზის გარეშე --</option>
                          {tour.halls.map((hall) => (
                            <option key={hall.id} value={hall.id}>
                              {hall.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

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
                        <div className="absolute left-0 top-full mt-1 bg-white border rounded-md shadow-lg z-10 min-w-[150px]">
                          {AVAILABLE_LANGUAGES.filter(
                            (l) => !newStopTranslations.find((t) => t.langCode === l.code)
                          ).map((lang) => (
                            <button
                              key={lang.code}
                              type="button"
                              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
                              onClick={() => {
                                setNewStopTranslations([...newStopTranslations, { langCode: lang.code, title: "", audioUrl: "" }]);
                                setShowNewStopLangPicker(false);
                              }}
                            >
                              {lang.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button
                      type="submit"
                      disabled={addingStop}
                      size="sm"
                      className="bg-amber-500 hover:bg-amber-600"
                    >
                      {addingStop ? <Loader2 className="h-4 w-4 animate-spin" /> : "დამატება"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowNewStop(false);
                        setNewStopTranslations([]);
                        setActiveHallIdForNewStop(null);
                      }}
                    >
                      გაუქმება
                    </Button>
                  </div>
                </form>
              )}

              {/* Stops Without Hall List */}
              {getStopsWithoutHall().length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="text-4xl mb-2">📍</div>
                  <p>დარბაზის გარეშე გაჩერებები არ არის</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {getStopsWithoutHall()
                    .sort((a, b) => a.orderIndex - b.orderIndex)
                    .map((stop, index) => (
                      <div
                        key={stop.id}
                        className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50"
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                        {/* Editable Order Index */}
                        {editingOrderIndex === stop.id ? (
                          <input
                            type="number"
                            className="w-12 h-7 text-center text-sm border rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
                            value={tempOrderIndex}
                            onChange={(e) => setTempOrderIndex(e.target.value)}
                            onBlur={() => {
                              const newIndex = parseInt(tempOrderIndex);
                              if (!isNaN(newIndex) && newIndex >= 0) {
                                updateStopOrderIndex(stop.id, newIndex);
                              } else {
                                setEditingOrderIndex(null);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                const newIndex = parseInt(tempOrderIndex);
                                if (!isNaN(newIndex) && newIndex >= 0) {
                                  updateStopOrderIndex(stop.id, newIndex);
                                } else {
                                  setEditingOrderIndex(null);
                                }
                              } else if (e.key === "Escape") {
                                setEditingOrderIndex(null);
                              }
                            }}
                            autoFocus
                          />
                        ) : (
                          <button
                            className="w-7 h-7 rounded-full bg-amber-500 text-white text-sm flex items-center justify-center hover:bg-amber-600 cursor-pointer"
                            title="დააწკაპუნეთ ნომრის შესაცვლელად"
                            onClick={() => {
                              setEditingOrderIndex(stop.id);
                              setTempOrderIndex(stop.orderIndex.toString());
                            }}
                          >
                            {stop.orderIndex + 1}
                          </button>
                        )}
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