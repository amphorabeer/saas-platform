"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ChatSession {
  id: string;
  museumId: string;
  tourId: string | null;
  language: string;
  sessionToken: string;
  deviceType: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { messages: number };
}

interface ChatStats {
  totalSessions: number;
  totalMessages: number;
  todaySessions: number;
  todayMessages: number;
  languageStats: { language: string; count: number }[];
  museumStats: { museumId: string; count: number }[];
}

export default function ChatbotPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<ChatSession[]>([]);
  const [stats, setStats] = useState<ChatStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [museumFilter, setMuseumFilter] = useState<string>("all");
  const [langFilter, setLangFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  useEffect(() => {
    fetchData();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...sessions];

    if (museumFilter !== "all") {
      filtered = filtered.filter((s) => s.museumId === museumFilter);
    }
    if (langFilter !== "all") {
      filtered = filtered.filter((s) => s.language === langFilter);
    }
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      filtered = filtered.filter((s) => new Date(s.createdAt) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      filtered = filtered.filter((s) => new Date(s.createdAt) <= to);
    }

    setFilteredSessions(filtered);
  }, [sessions, museumFilter, langFilter, dateFrom, dateTo]);

  async function fetchData() {
    try {
      const [sessionsRes, statsRes] = await Promise.all([
        fetch("/api/geoguide/chatbot/sessions"),
        fetch("/api/geoguide/chatbot/stats"),
      ]);

      if (sessionsRes.ok) {
        const data = await sessionsRes.json();
        setSessions(data);
        setFilteredSessions(data);
      }
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (e) {
      console.error("Failed to fetch chatbot data:", e);
    } finally {
      setLoading(false);
    }
  }

  const langLabels: Record<string, string> = {
    ka: "ქართული",
    en: "English",
    ru: "Русский",
  };

  // Get unique museums and languages from sessions
  const museums = [...new Set(sessions.map((s) => s.museumId))];
  const languages = [...new Set(sessions.map((s) => s.language))];

  function clearFilters() {
    setMuseumFilter("all");
    setLangFilter("all");
    setDateFrom("");
    setDateTo("");
  }

  const hasActiveFilters = museumFilter !== "all" || langFilter !== "all" || dateFrom || dateTo;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">🤖 ჩატბოტი</h1>
      <p className="text-muted-foreground mb-8">RAG ჩატბოტის სტატისტიკა და ისტორია</p>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl border p-6">
            <p className="text-sm text-muted-foreground">სულ სესიები</p>
            <p className="text-3xl font-bold mt-1">{stats.totalSessions}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border p-6">
            <p className="text-sm text-muted-foreground">სულ შეტყობინებები</p>
            <p className="text-3xl font-bold mt-1">{stats.totalMessages}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border p-6">
            <p className="text-sm text-muted-foreground">დღეს სესიები</p>
            <p className="text-3xl font-bold mt-1">{stats.todaySessions}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border p-6">
            <p className="text-sm text-muted-foreground">დღეს შეტყობინებები</p>
            <p className="text-3xl font-bold mt-1">{stats.todayMessages}</p>
          </div>
        </div>
      )}

      {/* Language & Museum Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl border p-6">
            <h3 className="font-semibold mb-4">ენების მიხედვით</h3>
            {stats.languageStats.map((s) => (
              <div key={s.language} className="flex justify-between py-2 border-b last:border-0">
                <span>{langLabels[s.language] || s.language}</span>
                <span className="font-medium">{s.count} სესია</span>
              </div>
            ))}
            {stats.languageStats.length === 0 && (
              <p className="text-muted-foreground">მონაცემები არ არის</p>
            )}
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border p-6">
            <h3 className="font-semibold mb-4">მუზეუმების მიხედვით</h3>
            {stats.museumStats.map((s) => (
              <div key={s.museumId} className="flex justify-between py-2 border-b last:border-0">
                <span>{s.museumId}</span>
                <span className="font-medium">{s.count} სესია</span>
              </div>
            ))}
            {stats.museumStats.length === 0 && (
              <p className="text-muted-foreground">მონაცემები არ არის</p>
            )}
          </div>
        </div>
      )}

      {/* Sessions List with Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">ბოლო სესიები</h3>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-amber-600 hover:text-amber-700 font-medium"
              >
                ფილტრების გასუფთავება ✕
              </button>
            )}
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap gap-3">
            <select
              value={museumFilter}
              onChange={(e) => setMuseumFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-700 min-w-[160px]"
            >
              <option value="all">ყველა მუზეუმი</option>
              {museums.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            <select
              value={langFilter}
              onChange={(e) => setLangFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-700 min-w-[140px]"
            >
              <option value="all">ყველა ენა</option>
              {languages.map((l) => (
                <option key={l} value={l}>{langLabels[l] || l}</option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-700"
                placeholder="დან"
              />
              <span className="text-muted-foreground text-sm">—</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-700"
                placeholder="მდე"
              />
            </div>

            {hasActiveFilters && (
              <span className="flex items-center text-sm text-muted-foreground">
                {filteredSessions.length} / {sessions.length} სესია
              </span>
            )}
          </div>
        </div>

        <div className="divide-y">
          {filteredSessions.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              {hasActiveFilters ? "ფილტრით სესიები ვერ მოიძებნა" : "ჩატის სესიები ჯერ არ არის"}
            </div>
          ) : (
            filteredSessions.map((session) => (
              <div key={session.id} className="flex items-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <Link
                  href={`/geoguide/chatbot/${session.id}`}
                  className="flex items-center justify-between p-4 flex-1 min-w-0"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{session.museumId}</span>
                      <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                        {langLabels[session.language] || session.language}
                      </span>
                      {session.deviceType && (
                        <span className="text-xs text-muted-foreground">
                          {session.deviceType === "mobile" ? "📱" : "💻"}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(session.createdAt).toLocaleString("ka-GE")}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium">{session._count.messages} შეტყობინება</span>
                  </div>
                </Link>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!confirm(`წავშალოთ სესია? (${session._count.messages} შეტყობინება)`)) return;
                    const res = await fetch(`/api/geoguide/chatbot/sessions/${session.id}`, { method: "DELETE" });
                    if (res.ok) {
                      setSessions((prev) => prev.filter((s) => s.id !== session.id));
                    }
                  }}
                  className="px-3 py-2 mr-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-sm"
                  title="წაშლა"
                >
                  🗑️
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
