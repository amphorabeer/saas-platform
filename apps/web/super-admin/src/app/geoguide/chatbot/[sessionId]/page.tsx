"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Message {
  id: string;
  role: string;
  content: string;
  chunksUsed: string[];
  tokensUsed: number | null;
  createdAt: string;
}

interface SessionDetail {
  id: string;
  museumId: string;
  tourId: string | null;
  language: string;
  deviceType: string | null;
  createdAt: string;
  messages: Message[];
}

export default function ChatSessionPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/geoguide/chatbot/sessions/${sessionId}`)
      .then((r) => r.json())
      .then(setSession)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  if (!session) {
    return <div className="text-center py-12 text-muted-foreground">სესია ვერ მოიძებნა</div>;
  }

  const totalTokens = session.messages.reduce((sum, m) => sum + (m.tokensUsed || 0), 0);

  return (
    <div>
      <Link
        href="/geoguide/chatbot"
        className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1"
      >
        ← ჩატბოტი
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">ჩატის სესია</h1>
          <p className="text-muted-foreground">
            {session.museumId} • {session.language} • {session.deviceType || "unknown"} • {new Date(session.createdAt).toLocaleString("ka-GE")}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">{session.messages.length} შეტყობინება</p>
          <p className="text-sm text-muted-foreground">{totalTokens.toLocaleString()} tokens</p>
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-4 max-w-3xl">
        {session.messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-4 rounded-xl ${
              msg.role === "user"
                ? "bg-blue-50 dark:bg-blue-900/20 ml-12"
                : "bg-gray-50 dark:bg-gray-800 mr-12"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium uppercase text-muted-foreground">
                {msg.role === "user" ? "👤 მომხმარებელი" : "🤖 ასისტენტი"}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(msg.createdAt).toLocaleTimeString("ka-GE")}
                {msg.tokensUsed && ` • ${msg.tokensUsed} tokens`}
              </span>
            </div>
            <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
            {msg.chunksUsed.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                📎 {msg.chunksUsed.length} chunk გამოყენებული
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
