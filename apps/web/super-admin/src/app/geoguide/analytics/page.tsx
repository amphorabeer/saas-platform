"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@saas-platform/ui";
import {
  Users,
  Key,
  Smartphone,
  MapPin,
  TrendingUp,
  Calendar,
  Clock,
  Building2,
  Headphones,
  BarChart3,
  PieChart,
  Activity,
} from "lucide-react";

interface Museum {
  id: string;
  name: string;
}

interface AnalyticsData {
  // კოდების სტატისტიკა
  codes: {
    total: number;
    available: number;
    redeemed: number;
    expired: number;
    revoked: number;
    redemptionRate: number;
  };
  // მოწყობილობები
  devices: {
    total: number;
    activeLastWeek: number;
    activeLastMonth: number;
    byPlatform: { platform: string; count: number }[];
  };
  // მუზეუმები
  museums: {
    total: number;
    published: number;
    totalTours: number;
    publishedTours: number;
  };
  // აქტივაციები დროის მიხედვით
  activationsByDate: { date: string; count: number }[];
  // ტოპ მუზეუმები
  topMuseums: { name: string; activations: number }[];
  // ტოპ ტურები
  topTours: { name: string; museum: string; activations: number }[];
  // ბოლო აქტივაციები
  recentActivations: {
    code: string;
    museum: string;
    tour: string;
    date: string;
    platform: string;
  }[];
  allMuseums: Museum[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"7d" | "30d" | "90d" | "all">("30d");
  const [museumId, setMuseumId] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [useCustomRange, setUseCustomRange] = useState(false);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (useCustomRange && dateFrom && dateTo) {
        params.set("dateFrom", dateFrom);
        params.set("dateTo", dateTo);
      } else {
        params.set("period", period);
      }
      if (museumId) params.set("museumId", museumId);
      const res = await fetch(`/api/geoguide/analytics?${params.toString()}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = async () => {
    const params = new URLSearchParams();
    if (useCustomRange && dateFrom && dateTo) {
      params.set("dateFrom", dateFrom);
      params.set("dateTo", dateTo);
    } else {
      params.set("period", period);
    }
    if (museumId) params.set("museumId", museumId);

    const res = await fetch(`/api/geoguide/analytics/export?${params.toString()}`);
    const { rows, generatedAt } = await res.json();

    const wsData = [
      ["მუზეუმი", "სულ კოდები", "გამოყენებული", "ხელმისაწვდომი", "ვადაგასული", "გაუქმებული", "კონვერსია", "გადახდები", "შემოსავალი"],
      ...rows.map((r: any) => [r.museum, r.totalCodes, r.redeemed, r.available, r.expired, r.revoked, r.redemptionRate, r.payments, r.revenue]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ანალიტიკა");
    XLSX.writeFile(wb, `geoguide-analytics-${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const exportToPDF = async () => {
    const params = new URLSearchParams();
    if (useCustomRange && dateFrom && dateTo) {
      params.set("dateFrom", dateFrom);
      params.set("dateTo", dateTo);
    } else {
      params.set("period", period);
    }
    if (museumId) params.set("museumId", museumId);

    const res = await fetch(`/api/geoguide/analytics/export?${params.toString()}`);
    const { rows, generatedAt } = await res.json();

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("GeoGuide Analytics", 14, 15);
    doc.setFontSize(10);
    doc.text(`გენერირებულია: ${new Date(generatedAt).toLocaleString("ka-GE")}`, 14, 22);

    autoTable(doc, {
      startY: 28,
      head: [["მუზეუმი", "სულ", "გამოყენ.", "ხელმისაწვ.", "კონვერსია", "გადახდები", "შემოსავალი"]],
      body: rows.map((r: any) => [r.museum, r.totalCodes, r.redeemed, r.available, r.redemptionRate, r.payments, r.revenue]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [245, 158, 11] },
    });

    doc.save(`geoguide-analytics-${new Date().toISOString().split("T")[0]}.pdf`);
  };

  useEffect(() => {
    fetchAnalytics();
  }, [period, museumId, dateFrom, dateTo, useCustomRange]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ka-GE", {
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("ka-GE", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  const maxActivations = Math.max(...data.activationsByDate.map((d) => d.count), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            📈 ანალიტიკა
          </h1>
          <p className="text-muted-foreground mt-1">
            GeoGuide-ის სტატისტიკა და მეტრიკები
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          <button
            type="button"
            onClick={exportToExcel}
            className="px-4 py-2 border rounded-lg text-sm hover:bg-muted flex items-center gap-2"
          >
            📊 Excel
          </button>
          <button
            type="button"
            onClick={exportToPDF}
            className="px-4 py-2 border rounded-lg text-sm hover:bg-muted flex items-center gap-2"
          >
            📄 PDF
          </button>
          {/* Museum dropdown */}
          <select
            value={museumId}
            onChange={(e) => setMuseumId(e.target.value)}
            className="px-4 py-2 border rounded-lg bg-background"
          >
            <option value="">ყველა მუზეუმი</option>
            {data?.allMuseums.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          {/* Period select */}
          {!useCustomRange && (
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as any)}
              className="px-4 py-2 border rounded-lg bg-background"
            >
              <option value="7d">ბოლო 7 დღე</option>
              <option value="30d">ბოლო 30 დღე</option>
              <option value="90d">ბოლო 90 დღე</option>
              <option value="all">ყველა დრო</option>
            </select>
          )}

          {/* Date range */}
          {useCustomRange ? (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-2 border rounded-lg bg-background text-sm"
              />
              <span className="text-muted-foreground">—</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-2 border rounded-lg bg-background text-sm"
              />
              <button
                type="button"
                onClick={() => setUseCustomRange(false)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setUseCustomRange(true)}
              className="px-4 py-2 border rounded-lg text-sm hover:bg-muted"
            >
              📅 თარიღი
            </button>
          )}
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-700 dark:text-amber-300">სულ კოდები</p>
                <div className="text-3xl font-bold text-amber-900 dark:text-amber-100">
                  {data.codes.total}
                </div>
              </div>
              <div className="p-3 bg-amber-200 dark:bg-amber-800 rounded-full">
                <Key className="h-6 w-6 text-amber-700 dark:text-amber-300" />
              </div>
            </div>
            <div className="mt-2 text-xs text-amber-600">
              {data.codes.available} ხელმისაწვდომი
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 dark:text-green-300">გამოყენებული</p>
                <div className="text-3xl font-bold text-green-900 dark:text-green-100">
                  {data.codes.redeemed}
                </div>
              </div>
              <div className="p-3 bg-green-200 dark:bg-green-800 rounded-full">
                <TrendingUp className="h-6 w-6 text-green-700 dark:text-green-300" />
              </div>
            </div>
            <div className="mt-2 text-xs text-green-600">
              {data.codes.redemptionRate.toFixed(1)}% კონვერსია
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 dark:text-blue-300">მოწყობილობები</p>
                <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                  {data.devices.total}
                </div>
              </div>
              <div className="p-3 bg-blue-200 dark:bg-blue-800 rounded-full">
                <Smartphone className="h-6 w-6 text-blue-700 dark:text-blue-300" />
              </div>
            </div>
            <div className="mt-2 text-xs text-blue-600">
              {data.devices.activeLastWeek} აქტიური კვირაში
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700 dark:text-purple-300">მუზეუმები</p>
                <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                  {data.museums.total}
                </div>
              </div>
              <div className="p-3 bg-purple-200 dark:bg-purple-800 rounded-full">
                <Building2 className="h-6 w-6 text-purple-700 dark:text-purple-300" />
              </div>
            </div>
            <div className="mt-2 text-xs text-purple-600">
              {data.museums.publishedTours} გამოქვეყნებული ტური
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Activations Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-amber-500" />
              აქტივაციები დროის მიხედვით
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-end gap-1">
              {data.activationsByDate.map((day, index) => (
                <div
                  key={index}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <div
                    className="w-full bg-amber-500 rounded-t hover:bg-amber-600 transition-colors cursor-pointer"
                    style={{
                      height: `${(day.count / maxActivations) * 160}px`,
                      minHeight: day.count > 0 ? "4px" : "0",
                    }}
                    title={`${formatDate(day.date)}: ${day.count} აქტივაცია`}
                  />
                  {index % Math.ceil(data.activationsByDate.length / 7) === 0 && (
                    <span className="text-xs text-muted-foreground">
                      {formatDate(day.date)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Platform Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-blue-500" />
              პლატფორმების განაწილება
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.devices.byPlatform.map((platform, index) => {
                const percentage =
                  data.devices.total > 0
                    ? ((platform.count / data.devices.total) * 100).toFixed(1)
                    : 0;
                const colors = [
                  "bg-blue-500",
                  "bg-green-500",
                  "bg-purple-500",
                  "bg-amber-500",
                ];
                return (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">
                        {platform.platform || "უცნობი"}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {platform.count} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${colors[index % colors.length]} rounded-full`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {data.devices.byPlatform.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  მონაცემები არ არის
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Museums & Tours */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Museums */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-purple-500" />
              ტოპ მუზეუმები
            </CardTitle>
            <CardDescription>აქტივაციების რაოდენობით</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.topMuseums.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  მონაცემები არ არის
                </p>
              ) : (
                data.topMuseums.map((museum, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          index === 0
                            ? "bg-amber-100 text-amber-700"
                            : index === 1
                            ? "bg-gray-200 text-gray-700"
                            : index === 2
                            ? "bg-orange-100 text-orange-700"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <span className="font-medium">{museum.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Headphones className="h-4 w-4 text-muted-foreground" />
                      <span className="font-bold">{museum.activations}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Tours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Headphones className="h-5 w-5 text-green-500" />
              ტოპ ტურები
            </CardTitle>
            <CardDescription>აქტივაციების რაოდენობით</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.topTours.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  მონაცემები არ არის
                </p>
              ) : (
                data.topTours.map((tour, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          index === 0
                            ? "bg-amber-100 text-amber-700"
                            : index === 1
                            ? "bg-gray-200 text-gray-700"
                            : index === 2
                            ? "bg-orange-100 text-orange-700"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{tour.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {tour.museum}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <span className="font-bold">{tour.activations}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            ბოლო აქტივაციები
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">კოდი</th>
                  <th className="text-left p-3 font-medium">მუზეუმი</th>
                  <th className="text-left p-3 font-medium">ტური</th>
                  <th className="text-left p-3 font-medium">პლატფორმა</th>
                  <th className="text-left p-3 font-medium">თარიღი</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.recentActivations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      აქტივაციები არ არის
                    </td>
                  </tr>
                ) : (
                  data.recentActivations.map((activation, index) => (
                    <tr key={index} className="hover:bg-muted/50">
                      <td className="p-3 font-mono text-sm">{activation.code}</td>
                      <td className="p-3">{activation.museum}</td>
                      <td className="p-3">{activation.tour}</td>
                      <td className="p-3">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                          {activation.platform || "web"}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {formatDateTime(activation.date)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Code Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>კოდების სტატუსი</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{data.codes.available}</div>
              <div className="text-sm text-green-700">ხელმისაწვდომი</div>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{data.codes.redeemed}</div>
              <div className="text-sm text-blue-700">გამოყენებული</div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">{data.codes.expired}</div>
              <div className="text-sm text-gray-700">ვადაგასული</div>
            </div>
            <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{data.codes.revoked}</div>
              <div className="text-sm text-red-700">გაუქმებული</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
