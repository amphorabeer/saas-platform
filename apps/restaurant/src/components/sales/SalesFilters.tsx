'use client';

import { DateRangePicker, type DateRangePreset } from '@/components/reports/DateRangePicker';

export function SalesFilters({
  datePreset,
  onDatePresetChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  status,
  onStatusChange,
  orderType,
  onOrderTypeChange,
  waiterId,
  onWaiterIdChange,
  waiters,
  search,
  onSearchChange,
}: {
  datePreset: DateRangePreset;
  onDatePresetChange: (p: DateRangePreset) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (d: string) => void;
  onDateToChange: (d: string) => void;
  status: string;
  onStatusChange: (s: string) => void;
  orderType: string;
  onOrderTypeChange: (t: string) => void;
  waiterId: string;
  onWaiterIdChange: (id: string) => void;
  waiters: Array<{ id: string; name: string }>;
  search: string;
  onSearchChange: (s: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <DateRangePicker
        preset={datePreset}
        onPresetChange={onDatePresetChange}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={onDateFromChange}
        onDateToChange={onDateToChange}
      />
      <select
        value={status}
        onChange={(e) => onStatusChange(e.target.value)}
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
      >
        <option value="">ყველა სტატუსი</option>
        <option value="PAID">გადახდილი</option>
        <option value="CANCELLED">გაუქმებული</option>
      </select>
      <select
        value={orderType}
        onChange={(e) => onOrderTypeChange(e.target.value)}
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
      >
        <option value="">ყველა ტიპი</option>
        <option value="DINE_IN">Dine In</option>
        <option value="TAKEAWAY">Take Away</option>
        <option value="DELIVERY">Delivery</option>
      </select>
      <select
        value={waiterId}
        onChange={(e) => onWaiterIdChange(e.target.value)}
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white min-w-[140px]"
      >
        <option value="">ყველა ოფიციანტი</option>
        {waiters.map((w) => (
          <option key={w.id} value={w.id}>{w.name}</option>
        ))}
      </select>
      <input
        type="search"
        placeholder="შეკვეთის #"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 w-36"
      />
    </div>
  );
}
