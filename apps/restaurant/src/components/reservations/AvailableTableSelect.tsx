'use client';

export type TableOption = { id: string; number: string; seats: number; zoneName?: string };

export function AvailableTableSelect({
  tables,
  value,
  onChange,
  disabled,
  placeholder = 'მაგიდა არ არის მინიჭებული',
}: {
  tables: TableOption[];
  value: string | null;
  onChange: (tableId: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      disabled={disabled}
      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
    >
      <option value="">{placeholder}</option>
      {tables.map((t) => (
        <option key={t.id} value={t.id}>
          T{t.number} ({t.seats} ადგილი{t.zoneName ? ` · ${t.zoneName}` : ''})
        </option>
      ))}
    </select>
  );
}
