"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface MuseumAuth {
  museumId: string;
  museumName: string;
  username: string;
  timestamp: number;
}

interface DailyData {
  date: string;
  activations: number;
  payments: number;
  revenue: string;
}

interface SummaryData {
  totalCodes: number;
  redeemed: number;
  available: number;
  redemptionRate: string;
  payments: number;
  revenue: string;
}

export default function MuseumPortalDashboard() {
  const router = useRouter();
  const [auth, setAuth] = useState<MuseumAuth | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [dailyRows, setDailyRows] = useState<DailyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30d");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [useCustomRange, setUseCustomRange] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("museum-portal-auth");
    if (!stored) { router.push("/museum-portal/login"); return; }
    const parsed: MuseumAuth = JSON.parse(stored);
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    if (Date.now() - parsed.timestamp > TWENTY_FOUR_HOURS) {
      localStorage.removeItem("museum-portal-auth");
      router.push("/museum-portal/login");
      return;
    }
    setAuth(parsed);
  }, [router]);

  const fetchData = useCallback(async () => {
    if (!auth) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ museumId: auth.museumId });
      if (useCustomRange && dateFrom && dateTo) {
        params.set("dateFrom", dateFrom);
        params.set("dateTo", dateTo);
      } else {
        params.set("period", period);
      }
      const res = await fetch(`/api/geoguide/analytics/export?${params.toString()}`);
      const data = await res.json();
      const row = data.rows?.[0];
      if (row) setSummary(row);
      setDailyRows(data.dailyRows || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [auth, period, dateFrom, dateTo, useCustomRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const logout = () => {
    localStorage.removeItem("museum-portal-auth");
    router.push("/museum-portal/login");
  };

  const exportCSV = () => {
    if (!dailyRows.length) return;
    const headers = ["თარიღი", "კოდები", "გადახდები", "შემოსავალი"];
    const csvRows = [
      headers.join(","),
      ...dailyRows.map((r) =>
        [r.date, r.activations, r.payments, r.revenue].map((v) => `"${v}"`).join(",")
      ),
    ];
    const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${auth?.museumName}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = async () => {
    const jsPDF = (await import("jspdf")).default;
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF();

    doc.setFontSize(14);
    doc.text(auth?.museumName || "Museum", 14, 15);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleDateString("en-GB")}`, 14, 22);

    if (summary) {
      autoTable(doc, {
        startY: 28,
        head: [["Total Codes", "Redeemed", "Available", "Conversion", "Payments", "Revenue"]],
        body: [[summary.totalCodes, summary.redeemed, summary.available, summary.redemptionRate, summary.payments, summary.revenue]],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [245, 158, 11] },
      });
    }

    autoTable(doc, {
      startY: (doc as any).lastAutoTable?.finalY + 10 || 60,
      head: [["Date", "Codes", "Payments", "Revenue"]],
      body: [...dailyRows].reverse().map((r) => [r.date, r.activations, r.payments, `GEL ${r.revenue}`]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [100, 100, 100] },
    });

    doc.save(`${auth?.museumName}-${new Date().toISOString().split("T")[0]}.pdf`);
  };

  const today = new Date().toLocaleDateString("ka-GE", { day: "numeric", month: "long", year: "numeric" });
  const todayStr = new Date().toISOString().split("T")[0];
  const todayData = dailyRows.find((r) => r.date === todayStr);

  if (!auth) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">🏛️ {auth.museumName}</h1>
            <p className="text-xs text-gray-400">{today}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="text-sm text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg"
          >
            გასვლა
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">

        {/* დღევანდელი სტატისტიკა */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-amber-800 mb-3">📅 დღევანდელი სტატისტიკა</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-700">{todayData?.activations || 0}</p>
              <p className="text-xs text-amber-600 mt-0.5">კოდი გამოყენდა</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-700">{todayData?.payments || 0}</p>
              <p className="text-xs text-amber-600 mt-0.5">გადახდა</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-700">₾{todayData?.revenue || "0.00"}</p>
              <p className="text-xs text-amber-600 mt-0.5">შემოსავალი</p>
            </div>
          </div>
        </div>

        {/* Period ფილტრი + ექსპორტი */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-500">პერიოდი:</span>
            {!useCustomRange && ["7d", "30d", "90d"].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  period === p ? "bg-amber-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {p === "7d" ? "7 დღე" : p === "30d" ? "30 დღე" : "90 დღე"}
              </button>
            ))}
            {useCustomRange ? (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white"
                />
                <span className="text-gray-400">—</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white"
                />
                <button
                  type="button"
                  onClick={() => setUseCustomRange(false)}
                  className="text-gray-400 hover:text-gray-600 text-sm"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setUseCustomRange(true)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white hover:bg-gray-50"
              >
                📅 თარიღი
              </button>
            )}
          </div>

          {/* ექსპორტი */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={exportCSV}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white hover:bg-gray-50"
            >
              📊 CSV
            </button>
            <button
              type="button"
              onClick={exportPDF}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white hover:bg-gray-50"
            >
              📄 PDF
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
          </div>
        ) : (
          <>
            {/* შეჯამება */}
            {summary && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: "სულ კოდები", value: summary.totalCodes, color: "text-gray-900" },
                  { label: "გამოყენებული", value: summary.redeemed, color: "text-green-600" },
                  { label: "ხელმისაწვდომი", value: summary.available, color: "text-blue-600" },
                  { label: "კონვერსია", value: summary.redemptionRate, color: "text-purple-600" },
                  { label: "გადახდები", value: summary.payments, color: "text-orange-600" },
                  { label: "შემოსავალი", value: summary.revenue, color: "text-amber-600" },
                ].map((s) => (
                  <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-xs text-gray-500">{s.label}</p>
                    <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* დღეების ცხრილი */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700">დღეების მიხედვით</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3 font-medium text-gray-500">თარიღი</th>
                      <th className="text-right p-3 font-medium text-gray-500">კოდები</th>
                      <th className="text-right p-3 font-medium text-gray-500">გადახდები</th>
                      <th className="text-right p-3 font-medium text-gray-500">შემოსავალი</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {dailyRows.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-gray-400">
                          მონაცემები არ არის
                        </td>
                      </tr>
                    ) : (
                      [...dailyRows].reverse().map((row) => (
                        <tr key={row.date} className={`hover:bg-gray-50 ${row.date === todayStr ? "bg-amber-50" : ""}`}>
                          <td className="p-3 text-gray-700">
                            {new Date(row.date).toLocaleDateString("ka-GE", { day: "numeric", month: "short" })}
                            {row.date === todayStr && <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">დღეს</span>}
                          </td>
                          <td className="p-3 text-right font-medium">{row.activations}</td>
                          <td className="p-3 text-right font-medium">{row.payments}</td>
                          <td className="p-3 text-right font-medium text-green-600">₾{row.revenue}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
