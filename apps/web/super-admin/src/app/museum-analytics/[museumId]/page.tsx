"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";

interface MuseumAnalyticsData {
  museum: { id: string; name: string };
  codes: {
    total: number;
    available: number;
    redeemed: number;
    expired: number;
    revoked: number;
    redemptionRate: number;
  };
  topTours: { name: string; activations: number }[];
  byPlatform: { platform: string; count: number }[];
  activationsByDate: { date: string; count: number }[];
  recentActivations: {
    code: string;
    tour: string;
    platform: string;
    date: string;
  }[];
}

export default function MuseumAnalyticsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const museumId = params.museumId as string;
  const token = searchParams.get("token") || "";

  const [data, setData] = useState<MuseumAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [period, setPeriod] = useState("30d");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [useCustomRange, setUseCustomRange] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token) { setAuthError(true); setLoading(false); return; }
    setLoading(true);
    try {
      const p = new URLSearchParams({ token });
      if (useCustomRange && dateFrom && dateTo) {
        p.set("dateFrom", dateFrom);
        p.set("dateTo", dateTo);
      } else {
        p.set("period", period);
      }
      const res = await fetch(`/api/museum-analytics/${museumId}?${p.toString()}`);
      if (res.status === 401 || res.status === 403) { setAuthError(true); return; }
      if (!res.ok) throw new Error("API error");
      setData(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [museumId, token, period, dateFrom, dateTo, useCustomRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("ka-GE", {
      month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  if (authError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-red-200 p-10 max-w-md w-full text-center shadow-sm">
          <div className="text-5xl mb-4">🔐</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">წვდომა აკრძალულია</h2>
          <p className="text-sm text-gray-500">
            ანალიტიკის სანახავად საჭიროა სწორი ბმული. გთხოვთ დაუკავშირდეთ ადმინისტრატორს.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (!data) return null;

  const maxCount = Math.max(...data.activationsByDate.map((d) => d.count), 1);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              📊 {data.museum.name}
            </h1>
            <p className="text-sm text-gray-400">ანალიტიკა • GeoGuide</p>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            {!useCustomRange && (
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="px-3 py-2 border rounded-lg bg-white text-sm"
              >
                <option value="7d">ბოლო 7 დღე</option>
                <option value="30d">ბოლო 30 დღე</option>
                <option value="90d">ბოლო 90 დღე</option>
                <option value="all">ყველა დრო</option>
              </select>
            )}
            {useCustomRange ? (
              <div className="flex items-center gap-2">
                <input type="date" value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-3 py-2 border rounded-lg text-sm bg-white" />
                <span className="text-gray-400">—</span>
                <input type="date" value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-3 py-2 border rounded-lg text-sm bg-white" />
                <button type="button" onClick={() => setUseCustomRange(false)}
                  className="text-sm text-gray-400 hover:text-gray-600">✕</button>
              </div>
            ) : (
              <button type="button" onClick={() => setUseCustomRange(true)}
                className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50">
                📅 თარიღი
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border p-5">
            <p className="text-sm text-gray-500">სულ კოდები</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{data.codes.total}</p>
            <p className="text-xs text-gray-400 mt-1">{data.codes.available} ხელმისაწვდომი</p>
          </div>
          <div className="bg-white rounded-xl border p-5">
            <p className="text-sm text-gray-500">გამოყენებული</p>
            <p className="text-3xl font-bold text-green-600 mt-1">{data.codes.redeemed}</p>
            <p className="text-xs text-gray-400 mt-1">{data.codes.redemptionRate.toFixed(1)}% კონვერსია</p>
          </div>
          <div className="bg-white rounded-xl border p-5">
            <p className="text-sm text-gray-500">ვადაგასული</p>
            <p className="text-3xl font-bold text-gray-400 mt-1">{data.codes.expired}</p>
          </div>
          <div className="bg-white rounded-xl border p-5">
            <p className="text-sm text-gray-500">გაუქმებული</p>
            <p className="text-3xl font-bold text-red-400 mt-1">{data.codes.revoked}</p>
          </div>
        </div>

        {/* Chart + Platform */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-semibold text-gray-700 mb-4">აქტივაციები დროის მიხედვით</h3>
            <div className="h-40 flex items-end gap-1">
              {data.activationsByDate.map((day, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-amber-400 rounded-t hover:bg-amber-500 transition-colors"
                    style={{
                      height: `${(day.count / maxCount) * 140}px`,
                      minHeight: day.count > 0 ? "4px" : "0",
                    }}
                    title={`${day.date}: ${day.count}`}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-semibold text-gray-700 mb-4">პლატფორმები</h3>
            <div className="space-y-3">
              {data.byPlatform.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">მონაცემები არ არის</p>
              ) : (
                data.byPlatform.map((p, i) => {
                  const total = data.byPlatform.reduce((s, x) => s + x.count, 0);
                  const pct = total > 0 ? ((p.count / total) * 100).toFixed(1) : 0;
                  const colors = ["bg-amber-400", "bg-blue-400", "bg-green-400", "bg-purple-400"];
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{p.platform}</span>
                        <span className="text-gray-400">{p.count} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full">
                        <div className={`h-full ${colors[i % colors.length]} rounded-full`}
                          style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Top tours */}
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold text-gray-700 mb-4">ტოპ ტურები</h3>
          <div className="space-y-2">
            {data.topTours.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">მონაცემები არ არის</p>
            ) : (
              data.topTours.map((tour, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      i === 0 ? "bg-amber-100 text-amber-700" :
                      i === 1 ? "bg-gray-200 text-gray-700" :
                      i === 2 ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-500"
                    }`}>{i + 1}</div>
                    <span className="font-medium text-sm">{tour.name}</span>
                  </div>
                  <span className="font-bold text-sm">{tour.activations}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent activations */}
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold text-gray-700 mb-4">ბოლო აქტივაციები</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 font-medium text-gray-500">კოდი</th>
                  <th className="text-left p-3 font-medium text-gray-500">ტური</th>
                  <th className="text-left p-3 font-medium text-gray-500">პლატფორმა</th>
                  <th className="text-left p-3 font-medium text-gray-500">თარიღი</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.recentActivations.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-400">
                      აქტივაციები არ არის
                    </td>
                  </tr>
                ) : (
                  data.recentActivations.map((a, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="p-3 font-mono text-xs">{a.code}</td>
                      <td className="p-3">{a.tour}</td>
                      <td className="p-3">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                          {a.platform}
                        </span>
                      </td>
                      <td className="p-3 text-gray-400">{formatDateTime(a.date)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-center text-xs text-gray-300 pb-4">
          GeoGuide Analytics • {data.museum.name}
        </p>
      </div>
    </div>
  );
}
