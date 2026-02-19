'use client';

export function ReservationStats({
  totalReservations,
  totalGuests,
  freeTables,
  nextUpcoming,
}: {
  totalReservations: number;
  totalGuests: number;
  freeTables: number;
  nextUpcoming: { guestName: string; time: string; guestCount: number } | null;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 text-sm">
      <span className="text-slate-400">
        დღეს <strong className="text-white">{totalReservations}</strong> რეზერვაცია
      </span>
      <span className="text-slate-400">
        <strong className="text-white">{totalGuests}</strong> სტუმარი
      </span>
      <span className="text-slate-400">
        <strong className="text-white">{freeTables}</strong> თავისუფალი მაგიდა
      </span>
      {nextUpcoming && (
        <span className="text-amber-400">
          უახლოესი: {nextUpcoming.guestName} — {nextUpcoming.time} ({nextUpcoming.guestCount} სტ.)
        </span>
      )}
    </div>
  );
}
