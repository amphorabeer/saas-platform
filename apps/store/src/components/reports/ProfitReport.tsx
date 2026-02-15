"use client";

import { useState } from "react";
import { getProfitReport } from "@/lib/store-actions";
import { Button } from "@saas-platform/ui";
import { formatCurrency } from "@/lib/format";
import { exportToCsv, exportToExcel } from "@/lib/export/utils";

export function ProfitReport() {
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [data, setData] = useState<Awaited<ReturnType<typeof getProfitReport>> | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFetch = async () => {
    setLoading(true);
    const res = await getProfitReport({ dateFrom, dateTo });
    setData(res);
    setLoading(false);
  };

  const exportData = data ? [{
    "შემოსავალი (₾)": data.revenue.toFixed(2),
    "ღირებულება (₾)": data.cost.toFixed(2),
    "მოგება (₾)": data.profit.toFixed(2),
    "მარჟა (%)": data.marginPercent.toFixed(1),
    "პერიოდი": `${dateFrom} - ${dateTo}`,
  }] : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs text-text-muted mb-1">დან</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-border bg-bg-tertiary px-4 py-2 text-text-primary"
          />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">მდე</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-border bg-bg-tertiary px-4 py-2 text-text-primary"
          />
        </div>
        <Button onClick={handleFetch} disabled={loading}>
          {loading ? "იტვირთება..." : "ანალიზი"}
        </Button>
        {data && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => exportToCsv(exportData, `mogeba-${dateFrom}-${dateTo}.csv`)}>CSV</Button>
            <Button variant="outline" size="sm" onClick={() => exportToExcel(exportData, `mogeba-${dateFrom}-${dateTo}.xlsx`)}>Excel</Button>
          </div>
        )}
      </div>
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-border bg-bg-secondary p-6">
            <p className="text-sm text-text-muted">შემოსავალი</p>
            <p className="text-2xl font-bold text-copper-light mt-1" suppressHydrationWarning>
              {formatCurrency(data.revenue)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-bg-secondary p-6">
            <p className="text-sm text-text-muted">ღირებულება</p>
            <p className="text-2xl font-bold text-text-primary mt-1" suppressHydrationWarning>
              {formatCurrency(data.cost)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-bg-secondary p-6">
            <p className="text-sm text-text-muted">მოგება</p>
            <p
              className={`text-2xl font-bold mt-1 ${
                data.profit >= 0 ? "text-green-400" : "text-red-400"
              }`}
              suppressHydrationWarning
            >
              {formatCurrency(data.profit)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-bg-secondary p-6">
            <p className="text-sm text-text-muted">მარჟა (%)</p>
            <p
              className={`text-2xl font-bold mt-1 ${
                data.marginPercent >= 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              {data.marginPercent.toFixed(1)}%
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
