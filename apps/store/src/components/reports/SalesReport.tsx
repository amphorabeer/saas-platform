"use client";

import { useState } from "react";
import { getSalesReport } from "@/lib/store-actions";
import { Button } from "@saas-platform/ui";
import { FormattedDate } from "@/components/ui/FormattedDate";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { exportToCsv, exportToExcel } from "@/lib/export/utils";

export function SalesReport() {
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [data, setData] = useState<Awaited<ReturnType<typeof getSalesReport>> | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFetch = async () => {
    setLoading(true);
    const res = await getSalesReport({ dateFrom, dateTo });
    setData(res);
    setLoading(false);
  };

  const exportData = data?.rows?.map((r) => ({
    "შეკვეთის ნომერი": r.saleNumber,
    "თარიღი": formatDateTime(r.createdAt),
    "ჯამი (₾)": formatCurrency(r.total),
  })) ?? [];

  const handleExportCsv = () => {
    if (!exportData.length) return;
    exportToCsv(exportData, `gayidvebi-${dateFrom}-${dateTo}.csv`);
  };
  const handleExportExcel = () => {
    if (!exportData.length) return;
    exportToExcel(exportData, `gayidvebi-${dateFrom}-${dateTo}.xlsx`, "გაყიდვები");
  };

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
          {loading ? "იტვირთება..." : "ჩატვირთვა"}
        </Button>
        {data && data.rows.length > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCsv}>CSV</Button>
            <Button variant="outline" size="sm" onClick={handleExportExcel}>Excel</Button>
          </div>
        )}
      </div>
      {data && (
        <div className="rounded-xl border border-border bg-bg-secondary overflow-hidden">
          <div className="p-4 border-b border-border flex gap-6">
            <p>
              <span className="text-text-muted">შემოსავალი: </span>
              <span className="font-semibold text-copper-light" suppressHydrationWarning>
                {formatCurrency(data.totalRevenue)}
              </span>
            </p>
            <p>
              <span className="text-text-muted">ტრანზაქციები: </span>
              <span className="font-semibold">{data.transactionCount}</span>
            </p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-bg-tertiary sticky top-0">
                <tr>
                  <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">
                    ნომერი
                  </th>
                  <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">
                    თარიღი
                  </th>
                  <th className="text-right text-xs font-medium text-text-muted uppercase px-4 py-3">
                    ჯამი
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.rows.map((r) => (
                  <tr key={r.saleNumber}>
                    <td className="px-4 py-3 font-medium">{r.saleNumber}</td>
                    <td className="px-4 py-3 text-sm text-text-muted" suppressHydrationWarning>
                      <FormattedDate date={r.createdAt} showTime />
                    </td>
                    <td className="px-4 py-3 text-right" suppressHydrationWarning>
                      {formatCurrency(r.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {data && data.rows.length === 0 && (
        <p className="text-text-muted">მონაცემები ვერ მოიძებნა</p>
      )}
    </div>
  );
}
