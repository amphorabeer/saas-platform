"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
} from "@saas-platform/ui";
import { Plus, Search, Edit, Trash2, Eye, EyeOff, MapPin, GripVertical } from "lucide-react";

interface Museum {
  id: string;
  name: string;
  nameEn: string | null;
  slug: string;
  city: string | null;
  category: string | null;
  coverImage: string | null;
  isPublished: boolean;
  displayOrder: number;
  tours?: { id: string; name: string; isPublished: boolean }[];
  _count?: { tours: number };
  createdAt: string;
}

export default function MuseumsPage() {
  const [museums, setMuseums] = useState<Museum[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Order editing state
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [tempOrder, setTempOrder] = useState<string>("");

  useEffect(() => {
    fetchMuseums();
  }, []);

  const fetchMuseums = async () => {
    try {
      const res = await fetch("/api/geoguide/museums");
      if (res.ok) {
        const data = await res.json();
        setMuseums(data);
      }
    } catch (error) {
      console.error("Error fetching museums:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateDisplayOrder = async (id: string, newOrder: number) => {
    try {
      const res = await fetch(`/api/geoguide/museums/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayOrder: newOrder }),
      });
      if (res.ok) {
        setMuseums((prev) =>
          prev.map((m) =>
            m.id === id ? { ...m, displayOrder: newOrder } : m
          )
        );
        setEditingOrderId(null);
      } else {
        alert("რიგითობის განახლება ვერ მოხერხდა");
      }
    } catch (error) {
      console.error("Error updating display order:", error);
      alert("შეცდომა");
    }
  };

  const togglePublish = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/geoguide/museums/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !currentStatus }),
      });
      if (res.ok) {
        setMuseums(
          museums.map((m) =>
            m.id === id ? { ...m, isPublished: !currentStatus } : m
          )
        );
      }
    } catch (error) {
      console.error("Error toggling publish:", error);
    }
  };

  const deleteMuseum = async (id: string) => {
    if (!confirm("დარწმუნებული ხართ რომ გინდათ წაშლა?")) return;

    try {
      const res = await fetch(`/api/geoguide/museums/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMuseums(museums.filter((m) => m.id !== id));
      }
    } catch (error) {
      console.error("Error deleting museum:", error);
    }
  };

  // Sort by displayOrder, then by createdAt
  const sortedMuseums = [...museums].sort((a, b) => {
    if (a.displayOrder !== b.displayOrder) {
      return a.displayOrder - b.displayOrder;
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const filteredMuseums = sortedMuseums.filter(
    (m) =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.nameEn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCategoryLabel = (category: string | null) => {
    const categories: Record<string, string> = {
      museum: "მუზეუმი",
      fortress: "ციხე-სიმაგრე",
      church: "ეკლესია/მონასტერი",
      nature: "ბუნება",
      archaeological: "არქეოლოგიური",
      other: "სხვა",
    };
    return categories[category || ""] || category || "—";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            🏛️ მუზეუმები
          </h1>
          <p className="text-muted-foreground mt-1">
            ლოკაციების მართვა ({museums.length})
          </p>
        </div>
        <Link href="/geoguide/museums/new">
          <Button className="bg-amber-500 hover:bg-amber-600">
            <Plus className="h-4 w-4 mr-2" />
            ახალი მუზეუმი
          </Button>
        </Link>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ძიება სახელით ან ქალაქით..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Museums Grid */}
      {filteredMuseums.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-4xl mb-4">🏛️</div>
            <h3 className="text-lg font-medium">მუზეუმები არ მოიძებნა</h3>
            <p className="text-muted-foreground mt-1">
              დაამატეთ პირველი მუზეუმი
            </p>
            <Link href="/geoguide/museums/new">
              <Button className="mt-4 bg-amber-500 hover:bg-amber-600">
                <Plus className="h-4 w-4 mr-2" />
                ახალი მუზეუმი
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredMuseums.map((museum, index) => (
            <Card key={museum.id} className="overflow-hidden">
              {/* Cover Image */}
              <div className="h-40 bg-muted relative">
                {museum.coverImage ? (
                  <img
                    src={museum.coverImage}
                    alt={museum.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">
                    🏛️
                  </div>
                )}
                {/* Order Badge - Editable */}
                <div className="absolute top-2 left-2">
                  {editingOrderId === museum.id ? (
                    <input
                      type="number"
                      className="w-14 h-8 text-center text-sm border-2 border-amber-500 rounded-lg bg-white focus:outline-none"
                      value={tempOrder}
                      onChange={(e) => setTempOrder(e.target.value)}
                      onBlur={() => {
                        const newOrder = parseInt(tempOrder);
                        if (!isNaN(newOrder) && newOrder >= 0) {
                          updateDisplayOrder(museum.id, newOrder);
                        } else {
                          setEditingOrderId(null);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const newOrder = parseInt(tempOrder);
                          if (!isNaN(newOrder) && newOrder >= 0) {
                            updateDisplayOrder(museum.id, newOrder);
                          } else {
                            setEditingOrderId(null);
                          }
                        } else if (e.key === "Escape") {
                          setEditingOrderId(null);
                        }
                      }}
                      autoFocus
                    />
                  ) : (
                    <button
                      className="w-8 h-8 rounded-lg bg-amber-500 text-white text-sm font-bold flex items-center justify-center hover:bg-amber-600 cursor-pointer shadow-lg"
                      title="დააწკაპუნეთ რიგითობის შესაცვლელად"
                      onClick={() => {
                        setEditingOrderId(museum.id);
                        setTempOrder(museum.displayOrder.toString());
                      }}
                    >
                      {museum.displayOrder || index + 1}
                    </button>
                  )}
                </div>
                {/* Status Badge */}
                <div
                  className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium ${
                    museum.isPublished
                      ? "bg-green-500 text-white"
                      : "bg-gray-500 text-white"
                  }`}
                >
                  {museum.isPublished ? "გამოქვეყნებული" : "დრაფტი"}
                </div>
              </div>

              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{museum.name}</CardTitle>
                {museum.nameEn && (
                  <CardDescription>{museum.nameEn}</CardDescription>
                )}
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Info */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {museum.city && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {museum.city}
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    🎧 {museum.tours?.length ?? museum._count?.tours ?? 0} ტური
                  </div>
                </div>

                {/* Category */}
                <div className="text-sm">
                  <span className="text-muted-foreground">კატეგორია: </span>
                  {getCategoryLabel(museum.category)}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  <Link href={`/geoguide/museums/${museum.id}`} className="flex-1">
                    <Button variant="outline" className="w-full" size="sm">
                      <Edit className="h-4 w-4 mr-1" />
                      რედაქტირება
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => togglePublish(museum.id, museum.isPublished)}
                  >
                    {museum.isPublished ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-500 hover:text-red-600"
                    onClick={() => deleteMuseum(museum.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}