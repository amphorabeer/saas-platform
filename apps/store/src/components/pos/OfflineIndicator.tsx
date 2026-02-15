"use client";

import { useEffect, useState } from "react";
import { getPendingSalesCount, setupOnlineListener } from "@/lib/offline/sync";

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    getPendingSalesCount().then(setPendingCount);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const unsub = setupOnlineListener(handleOnline, setPendingCount);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      unsub();
    };
  }, []);

  return (
    <div className="flex items-center gap-2">
      {!isOnline && (
        <span
          className="rounded-full px-2.5 py-1 text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/40"
          title="ოფლაინ რეჟიმი — გაყიდვები შეინახება და სინქრონიზდება ინტერნეტის აღდგენისას"
        >
          ოფლაინ
        </span>
      )}
      {isOnline && pendingCount > 0 && (
        <span
          className="rounded-full px-2.5 py-1 text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/40"
          title="მოლოდინშია სინქრონიზაცია"
        >
          {pendingCount} გაყიდვა სინქრონიზდება
        </span>
      )}
      {isOnline && pendingCount === 0 && (
        <span
          className="rounded-full px-2.5 py-1 text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
          title="ონლაინ"
        >
          ონლაინ
        </span>
      )}
    </div>
  );
}
