"use client";

import { FormattedDate } from "@/components/ui/FormattedDate";
import { formatCurrency } from "@/lib/format";

interface PriceHistoryEntry {
  id: string;
  costPrice: number;
  sellingPrice: number;
  changedAt: Date | string;
  changedBy?: string | null;
}

interface PriceHistoryTableProps {
  history: PriceHistoryEntry[];
}

export function PriceHistoryTable({ history }: PriceHistoryTableProps) {
  if (history.length === 0) {
    return (
      <p className="text-sm text-text-muted py-4">
        ფასის ისტორია ცარიელია.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-bg-secondary overflow-hidden">
      <table className="w-full">
        <thead className="bg-bg-tertiary">
          <tr>
            <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider px-4 py-3">
              თარიღი
            </th>
            <th className="text-right text-xs font-medium text-text-muted uppercase tracking-wider px-4 py-3">
              ღირებულება
            </th>
            <th className="text-right text-xs font-medium text-text-muted uppercase tracking-wider px-4 py-3">
              ფასი
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {history.map((h) => (
            <tr key={h.id} className="hover:bg-bg-tertiary/30">
              <td className="px-4 py-2 text-sm text-text-secondary" suppressHydrationWarning>
                <FormattedDate date={h.changedAt} showTime />
              </td>
              <td className="px-4 py-2 text-sm text-right" suppressHydrationWarning>
                {formatCurrency(h.costPrice)}
              </td>
              <td className="px-4 py-2 text-sm text-right font-medium text-copper-light" suppressHydrationWarning>
                {formatCurrency(h.sellingPrice)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
