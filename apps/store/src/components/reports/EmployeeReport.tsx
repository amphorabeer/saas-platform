"use client";

import { useState } from "react";
import { getEmployeePerformance } from "@/lib/store-actions";
import { Button } from "@saas-platform/ui";
import { formatCurrency } from "@/lib/format";
import { exportToCsv, exportToExcel } from "@/lib/export/utils";

export function EmployeeReport() {
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [data, setData] = useState<Awaited<
    ReturnType<typeof getEmployeePerformance>
  > | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFetch = async () => {
    setLoading(true);
    const res = await getEmployeePerformance({ dateFrom, dateTo });
    setData(res);
    setLoading(false);
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
        {data && data.length > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => exportToCsv(data.map((e) => ({ "თანამშრომელი": e.name, "გაყიდვები": e.count, "ჯამი (₾)": e.total.toFixed(2), "საშუალო ჩეკი": e.count > 0 ? (e.total / e.count).toFixed(2) : "—" })), `tanamshromlebi-${dateFrom}-${dateTo}.csv`)}>CSV</Button>
            <Button variant="outline" size="sm" onClick={() => exportToExcel(data.map((e) => ({ "თანამშრომელი": e.name, "გაყიდვები": e.count, "ჯამი (₾)": e.total.toFixed(2), "საშუალო ჩეკი": e.count > 0 ? (e.total / e.count).toFixed(2) : "—" })), `tanamshromlebi-${dateFrom}-${dateTo}.xlsx`)}>Excel</Button>
          </div>
        )}
      </div>
      {data && (
        <div className="rounded-xl border border-border bg-bg-secondary overflow-hidden">
          <table className="w-full">
            <thead className="bg-bg-tertiary">
              <tr>
                <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">
                  თანამშრომელი
                </th>
                <th className="text-right text-xs font-medium text-text-muted uppercase px-4 py-3">
                  გაყიდვების რაოდენობა
                </th>
                <th className="text-right text-xs font-medium text-text-muted uppercase px-4 py-3">
                  ჯამური შემოსავალი
                </th>
                <th className="text-right text-xs font-medium text-text-muted uppercase px-4 py-3">
                  საშუალო ჩეკი
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((e) => (
                <tr key={e.employeeId}>
                  <td className="px-4 py-3 font-medium">{e.name}</td>
                  <td className="px-4 py-3 text-right">{e.count}</td>
                  <td className="px-4 py-3 text-right font-medium text-copper-light" suppressHydrationWarning>
                    {formatCurrency(e.total)}
                  </td>
                  <td className="px-4 py-3 text-right text-text-muted" suppressHydrationWarning>
                    {e.count > 0 ? formatCurrency(e.total / e.count) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.length === 0 && (
            <p className="p-8 text-center text-text-muted">
              გაყიდვები თანამშრომლებთან არ არის მიბმული ან მონაცემები ვერ მოიძებნა
            </p>
          )}
        </div>
      )}
    </div>
  );
}
