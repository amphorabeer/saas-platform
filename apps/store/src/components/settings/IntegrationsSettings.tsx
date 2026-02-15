"use client";

import { useState } from "react";
import { upsertRSGeIntegration } from "@/lib/store-actions";
import { Button } from "@saas-platform/ui";

interface IntegrationsSettingsProps {
  rsGeConfig: {
    credentials?: { username?: string; password?: string } | null;
    settings?: { autoWaybill?: boolean } | null;
    isActive?: boolean;
  } | null;
}

export function IntegrationsSettings({ rsGeConfig }: IntegrationsSettingsProps) {
  const [username, setUsername] = useState(
    (rsGeConfig?.credentials as { username?: string })?.username ?? ""
  );
  const [password, setPassword] = useState("");
  const [autoWaybill, setAutoWaybill] = useState(
    (rsGeConfig?.settings as { autoWaybill?: boolean })?.autoWaybill ?? false
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSaveRSGe = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    const result = await upsertRSGeIntegration({
      username,
      password: password || undefined,
      autoWaybill,
    });
    setLoading(false);
    if (result.success) {
      setMessage({ type: "success", text: "შენახულია" });
      setPassword("");
    } else {
      setMessage({ type: "error", text: result.error ?? "შეცდომა" });
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <section className="rounded-xl border border-border bg-bg-tertiary p-6">
        <h2 className="text-lg font-semibold mb-2">RS.ge</h2>
        <p className="text-sm text-text-muted mb-4">
          საგადასახადო სამსახურის ინტეგრაცია — ზედნადების ავტომატური გაგზავნა გაყიდვის/შესყიდვის შემდეგ.
        </p>
        <form onSubmit={handleSaveRSGe} className="space-y-4">
          <div>
            <label className="block text-sm text-text-muted mb-1">მომხმარებელი</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="RS.ge username"
              className="w-full rounded-lg border border-border bg-bg-secondary px-4 py-2 text-text-primary"
            />
          </div>
          <div>
            <label className="block text-sm text-text-muted mb-1">პაროლი</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={rsGeConfig ? "დატოვეთ ცარიელი უცვლელი" : "პაროლი"}
              className="w-full rounded-lg border border-border bg-bg-secondary px-4 py-2 text-text-primary"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoWaybill}
              onChange={(e) => setAutoWaybill(e.target.checked)}
              className="rounded border-border"
            />
            <span className="text-sm">ავტომატური ზედნადების შექმნა გაყიდვის შემდეგ</span>
          </label>
          {message && (
            <div
              className={`p-3 rounded-lg text-sm ${
                message.type === "success"
                  ? "bg-green-500/10 text-green-400"
                  : "bg-red-500/10 text-red-400"
              }`}
            >
              {message.text}
            </div>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? "იტვირთება..." : "შენახვა"}
          </Button>
        </form>
      </section>
    </div>
  );
}
