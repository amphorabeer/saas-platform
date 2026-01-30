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
import { Plus, Search, Edit, Trash2, Eye, EyeOff, Clock, MapPin } from "lucide-react";

interface Tour {
  id: string;
  name: string;
  nameEn: string | null;
  duration: number | null;
  stopsCount: number;
  isFree: boolean;
  price: number | null;
  currency: string;
  isPublished: boolean;
  coverImage: string | null;
  museum: {
    id: string;
    name: string;
  };
  _count: {
    stops: number;
  };
  createdAt: string;
}

export default function ToursPage() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchTours();
  }, []);

  const fetchTours = async () => {
    try {
      const res = await fetch("/api/geoguide/tours");
      if (res.ok) {
        const data = await res.json();
        setTours(data);
      }
    } catch (error) {
      console.error("Error fetching tours:", error);
    } finally {
      setLoading(false);
    }
  };

  const togglePublish = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/geoguide/tours/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !currentStatus }),
      });
      if (res.ok) {
        setTours(
          tours.map((t) =>
            t.id === id ? { ...t, isPublished: !currentStatus } : t
          )
        );
      }
    } catch (error) {
      console.error("Error toggling publish:", error);
    }
  };

  const deleteTour = async (id: string) => {
    if (!confirm("დარწმუნებული ხართ რომ გინდათ წაშლა?")) return;

    try {
      const res = await fetch(`/api/geoguide/tours/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setTours(tours.filter((t) => t.id !== id));
      }
    } catch (error) {
      console.error("Error deleting tour:", error);
    }
  };

  const filteredTours = tours.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.nameEn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.museum.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return "—";
    if (minutes < 60) return `${minutes} წთ`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours} სთ ${mins} წთ` : `${hours} სთ`;
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
            🎧 ტურები
          </h1>
          <p className="text-muted-foreground mt-1">
            აუდიო ტურების მართვა ({tours.length})
          </p>
        </div>
        <Link href="/geoguide/tours/new">
          <Button className="bg-amber-500 hover:bg-amber-600">
            <Plus className="h-4 w-4 mr-2" />
            ახალი ტური
          </Button>
        </Link>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ძიება სახელით ან მუზეუმით..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tours Grid */}
      {filteredTours.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-4xl mb-4">🎧</div>
            <h3 className="text-lg font-medium">ტურები არ მოიძებნა</h3>
            <p className="text-muted-foreground mt-1">
              დაამატეთ პირველი ტური
            </p>
            <Link href="/geoguide/tours/new">
              <Button className="mt-4 bg-amber-500 hover:bg-amber-600">
                <Plus className="h-4 w-4 mr-2" />
                ახალი ტური
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTours.map((tour) => (
            <Card key={tour.id} className="overflow-hidden">
              {/* Cover Image */}
              <div className="h-32 bg-muted relative">
                {tour.coverImage ? (
                  <img
                    src={tour.coverImage}
                    alt={tour.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">
                    🎧
                  </div>
                )}
                {/* Status Badge */}
                <div
                  className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium ${
                    tour.isPublished
                      ? "bg-green-500 text-white"
                      : "bg-gray-500 text-white"
                  }`}
                >
                  {tour.isPublished ? "გამოქვეყნებული" : "დრაფტი"}
                </div>
                {/* Price Badge */}
                <div className="absolute bottom-2 left-2 px-2 py-1 rounded text-xs font-medium bg-black/70 text-white">
                  {tour.isFree ? "უფასო" : `${tour.price} ${tour.currency}`}
                </div>
              </div>

              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{tour.name}</CardTitle>
                {tour.nameEn && (
                  <CardDescription>{tour.nameEn}</CardDescription>
                )}
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Museum */}
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  <Link
                    href={`/geoguide/museums/${tour.museum.id}`}
                    className="text-amber-600 hover:underline"
                  >
                    {tour.museum.name}
                  </Link>
                </div>

                {/* Info */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDuration(tour.duration)}
                  </div>
                  <div className="flex items-center gap-1">
                    📍 {tour._count.stops} გაჩერება
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  <Link href={`/geoguide/tours/${tour.id}`} className="flex-1">
                    <Button variant="outline" className="w-full" size="sm">
                      <Edit className="h-4 w-4 mr-1" />
                      რედაქტირება
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => togglePublish(tour.id, tour.isPublished)}
                  >
                    {tour.isPublished ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-500 hover:text-red-600"
                    onClick={() => deleteTour(tour.id)}
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
