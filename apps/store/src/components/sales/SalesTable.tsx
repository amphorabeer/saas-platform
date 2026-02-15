"use client";

import { useState } from "react";
import Link from "next/link";
import { getSales } from "@/lib/store-actions";
import { Button } from "@saas-platform/ui";
import { FormattedDate } from "@/components/ui/FormattedDate";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { exportToCsv } from "@/lib/export/utils";
import { ChevronLeft, ChevronRight, Receipt } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  COMPLETED: "დასრულებული",
  VOIDED: "გაუქმებული",
  REFUNDED: "დაბრუნებული",
  PARTIAL_REFUND: "ნაწილობრივ დაბრუნებული",
};

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: "bg-green-500/20 text-green-400",
  VOIDED: "bg-red-500/20 text-red-400",
  REFUNDED: "bg-amber-500/20 text-amber-400",
  PARTIAL_REFUND: "bg-blue-500/20 text-blue-400",
};

interface SalesTableProps {
  initialData: Awaited<ReturnType<typeof getSales>>;
  customers: { id: string; firstName: string; lastName?: string | null }[];
  employees: { id: string; firstName: string; lastName: string }[];
}

export function SalesTable({
  initialData,
  customers,
  employees,
}: SalesTableProps) {
  const [data, setData] = useState(initialData);
  const [page, setPage] = useState(initialData.page);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");

  const fetchPage = async (p: number) => {
    setLoading(true);
    const res = await getSales({
      page: p,
      limit: 20,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      status: statusFilter || undefined,
      customerId: customerFilter || undefined,
      employeeId: employeeFilter || undefined,
    });
    setData(res);
    setPage(p);
    setLoading(false);
  };

  const handleExportCsv = async () => {
    setLoading(true);
    const res = await getSales({
      limit: 10000,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      status: statusFilter || undefined,
      customerId: customerFilter || undefined,
      employeeId: employeeFilter || undefined,
    });
    const exportData = res.sales.map((s) => ({
      "ნომერი": s.saleNumber,
      "თარიღი": formatDateTime(s.createdAt),
      "მომხმარებელი": s.customer ? `${s.customer.firstName} ${s.customer.lastName ?? ""}`.trim() : "",
      "სტატუსი": STATUS_LABELS[s.status] ?? s.status,
      "ჯამი (₾)": formatCurrency(s.total),
    }));
    setLoading(false);
    exportToCsv(exportData, "gayidvebi.csv");
  };

  return (
    <div className="space-y-4">
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
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-border bg-bg-tertiary px-4 py-2 text-text-primary"
        >
          <option value="">ყველა სტატუსი</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <select
          value={customerFilter}
          onChange={(e) => setCustomerFilter(e.target.value)}
          className="rounded-lg border border-border bg-bg-tertiary px-4 py-2 text-text-primary"
        >
          <option value="">ყველა მომხმარებელი</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.firstName} {c.lastName ?? ""}
            </option>
          ))}
        </select>
        <select
          value={employeeFilter}
          onChange={(e) => setEmployeeFilter(e.target.value)}
          className="rounded-lg border border-border bg-bg-tertiary px-4 py-2 text-text-primary"
        >
          <option value="">ყველა თანამშრომელი</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.firstName} {e.lastName}
            </option>
          ))}
        </select>
        <Button onClick={() => fetchPage(1)} variant="secondary">
          ფილტრი
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={loading}>
          CSV ექსპორტი
        </Button>
      </div>
      <div className="rounded-xl border border-border bg-bg-secondary overflow-hidden">
        <table className="w-full">
          <thead className="bg-bg-tertiary">
            <tr>
              <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">
                ნომერი
              </th>
              <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">
                თარიღი
              </th>
              <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">
                მომხმარებელი
              </th>
              <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">
                სტატუსი
              </th>
              <th className="text-right text-xs font-medium text-text-muted uppercase px-4 py-3">
                ჯამი
              </th>
              <th className="w-20 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.sales.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-text-muted">
                  <Receipt className="mx-auto h-12 w-12 text-text-muted/50 mb-2" />
                  გაყიდვები ვერ მოიძებნა
                </td>
              </tr>
            ) : (
              data.sales.map((s) => (
                <tr key={s.id} className="hover:bg-bg-tertiary/50">
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/sales/${s.id}`}
                      className="text-copper-light hover:underline"
                    >
                      {s.saleNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted" suppressHydrationWarning>
                    <FormattedDate date={s.createdAt} showTime />
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {s.customer
                      ? `${s.customer.firstName} ${s.customer.lastName ?? ""}`.trim()
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-1 rounded text-xs ${
                        STATUS_COLORS[s.status] ?? "bg-bg-tertiary"
                      }`}
                    >
                      {STATUS_LABELS[s.status] ?? s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium" suppressHydrationWarning>
                    {formatCurrency(s.total)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/sales/${s.id}`}
                      className="text-sm text-copper-light hover:underline"
                    >
                      ნახვა
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {data.totalPages > 1 && (
          <div className="flex justify-between px-4 py-3 border-t border-border">
            <p className="text-sm text-text-muted">
              ჩანს {data.sales.length} / {data.total}
            </p>
            <div className="flex gap-2 items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchPage(page - 1)}
                disabled={page <= 1 || loading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                გვ. {page} / {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchPage(page + 1)}
                disabled={page >= data.totalPages || loading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
