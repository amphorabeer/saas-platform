'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarClock, ChevronRight } from 'lucide-react';

export function DashboardReservations() {
  const [data, setData] = useState<{
    totalReservations: number;
    totalGuests: number;
    freeTables: number;
    nextUpcoming: { id: string; guestName: string; time: string; guestCount: number } | null;
  } | null>(null);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    fetch(`/api/reservations/stats?date=${today}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setData(d));
  }, []);

  if (data === null) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#1E293B]/80 p-6 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-slate-400">
          <CalendarClock className="h-5 w-5" />
          <span className="font-medium text-white">დღის რეზერვაციები</span>
        </div>
        <p className="mt-2 text-sm text-slate-500">იტვირთება...</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-[#1E293B]/80 p-6 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-400">
          <CalendarClock className="h-5 w-5" />
          <span className="font-medium text-white">დღის რეზერვაციები</span>
        </div>
        <Link
          href="/reservations"
          className="flex items-center gap-1 text-sm text-orange-400 hover:text-orange-300"
        >
          ყველა რეზერვაცია
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="mt-4 space-y-2">
        <p className="text-sm text-slate-400">
          მომავალი: <strong className="text-white">{data.totalReservations}</strong> რეზერვაცია ·{' '}
          <strong className="text-white">{data.totalGuests}</strong> სტუმარი
        </p>
        {data.nextUpcoming ? (
          <p className="text-sm text-amber-400">
            უახლოესი: <strong>{data.nextUpcoming.guestName}</strong> — {data.nextUpcoming.time} ({data.nextUpcoming.guestCount} სტ.)
          </p>
        ) : (
          <p className="text-sm text-slate-500">უახლოესი რეზერვაცია არ არის</p>
        )}
      </div>
    </div>
  );
}
