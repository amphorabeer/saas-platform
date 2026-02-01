"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@saas-platform/ui";

interface Stats {
  totalMuseums: number;
  totalTours: number;
  totalStops: number;
  totalCodes: number;
  activeCodes: number;
  redeemedCodes: number;
  totalDevices: number;
  activeEntitlements: number;
  totalPayments: number;
  completedPayments: number;
  totalRevenue: number;
}

interface RecentActivity {
  id: string;
  type: "code_redeemed" | "tour_created" | "museum_created" | "payment_completed";
  description: string;
  createdAt: string;
}

export default function GeoGuideDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalMuseums: 0,
    totalTours: 0,
    totalStops: 0,
    totalCodes: 0,
    activeCodes: 0,
    redeemedCodes: 0,
    totalDevices: 0,
    activeEntitlements: 0,
    totalPayments: 0,
    completedPayments: 0,
    totalRevenue: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchRecentActivity();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/geoguide/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const res = await fetch("/api/geoguide/activity");
      if (res.ok) {
        const data = await res.json();
        setRecentActivity(data);
      }
    } catch (error) {
      console.error("Error fetching activity:", error);
    }
  };

  const statCards = [
    {
      title: "მუზეუმები",
      value: stats.totalMuseums,
      description: "სულ ლოკაციები",
      icon: "🏛️",
    },
    {
      title: "ტურები",
      value: stats.totalTours,
      description: "აუდიო ტურები",
      icon: "🎧",
    },
    {
      title: "გაჩერებები",
      value: stats.totalStops,
      description: "სულ გაჩერებები",
      icon: "📍",
    },
    {
      title: "აქტივაციის კოდები",
      value: stats.totalCodes,
      description: `${stats.activeCodes} ხელმისაწვდომი / ${stats.redeemedCodes} გამოყენებული`,
      icon: "🔑",
    },
    {
      title: "გადახდები (TBC)",
      value: stats.completedPayments,
      description: `სულ შემოსავალი: ₾${stats.totalRevenue.toFixed(2)}`,
      icon: "💳",
    },
    {
      title: "მოწყობილობები",
      value: stats.totalDevices,
      description: "რეგისტრირებული",
      icon: "📱",
    },
    {
      title: "აქტიური წვდომები",
      value: stats.activeEntitlements,
      description: "მოქმედი entitlements",
      icon: "✅",
    },
  ];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ka-GE", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "code_redeemed":
        return "🔓";
      case "tour_created":
        return "🎧";
      case "museum_created":
        return "🏛️";
      case "payment_completed":
        return "💳";
      default:
        return "📝";
    }
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
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          🎧 GeoGuide
        </h1>
        <p className="text-muted-foreground mt-1">
          აუდიო გიდის პლატფორმის მართვა
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <span className="text-2xl">{card.icon}</span>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>სწრაფი მოქმედებები</CardTitle>
          <CardDescription>ხშირად გამოყენებული ფუნქციები</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <a
              href="/geoguide/museums/new"
              className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted transition-colors"
            >
              <span className="text-2xl">🏛️</span>
              <div>
                <div className="font-medium">ახალი მუზეუმი</div>
                <div className="text-sm text-muted-foreground">ლოკაციის დამატება</div>
              </div>
            </a>
            <a
              href="/geoguide/tours/new"
              className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted transition-colors"
            >
              <span className="text-2xl">🎧</span>
              <div>
                <div className="font-medium">ახალი ტური</div>
                <div className="text-sm text-muted-foreground">ტურის შექმნა</div>
              </div>
            </a>
            <a
              href="/geoguide/codes/generate"
              className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted transition-colors"
            >
              <span className="text-2xl">🔑</span>
              <div>
                <div className="font-medium">კოდების გენერაცია</div>
                <div className="text-sm text-muted-foreground">Batch კოდები</div>
              </div>
            </a>
            <a
              href="/geoguide/analytics"
              className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted transition-colors"
            >
              <span className="text-2xl">📈</span>
              <div>
                <div className="font-medium">ანალიტიკა</div>
                <div className="text-sm text-muted-foreground">სტატისტიკა</div>
              </div>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>ბოლო აქტივობა</CardTitle>
          <CardDescription>უახლესი მოვლენები</CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              აქტივობა ჯერ არ არის
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <span className="text-xl">{getActivityIcon(activity.type)}</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{activity.description}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(activity.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}