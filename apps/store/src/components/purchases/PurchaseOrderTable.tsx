"use client";

import { useState } from "react";
import Link from "next/link";
import { getPurchaseOrders } from "@/lib/store-actions";
import { Button } from "@saas-platform/ui";
import { FormattedDate } from "@/components/ui/FormattedDate";
import { formatCurrency } from "@/lib/format";
import { ChevronLeft, ChevronRight, FileText } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  STORE_PO_DRAFT: "შაბლონი",
  STORE_PO_ORDERED: "შეკვეთილი",
  STORE_PO_PARTIAL: "ნაწილობრივ მიღებული",
  STORE_PO_RECEIVED: "მიღებული",
  STORE_PO_CANCELLED: "გაუქმებული",
};

const STATUS_COLORS: Record<string, string> = {
  STORE_PO_DRAFT: "bg-gray-500/20 text-gray-400",
  STORE_PO_ORDERED: "bg-amber-500/20 text-amber-400",
  STORE_PO_PARTIAL: "bg-blue-500/20 text-blue-400",
  STORE_PO_RECEIVED: "bg-green-500/20 text-green-400",
  STORE_PO_CANCELLED: "bg-red-500/20 text-red-400",
};

interface PurchaseOrderTableProps {
  initialData: Awaited<ReturnType<typeof getPurchaseOrders>>;
  suppliers: { id: string; name: string }[];
}

export function PurchaseOrderTable({
  initialData,
  suppliers,
}: PurchaseOrderTableProps) {
  const [data, setData] = useState(initialData);
  const [statusFilter, setStatusFilter] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [page, setPage] = useState(initialData.page);
  const [loading, setLoading] = useState(false);

  const fetchPage = async (
    p: number,
    opts?: { status?: string; supplierId?: string }
  ) => {
    setLoading(true);
    const res = await getPurchaseOrders({
      page: p,
      limit: 20,
      status: opts?.status ?? (statusFilter || undefined),
      supplierId: opts?.supplierId ?? (supplierFilter || undefined),
    });
    setData(res);
    setPage(p);
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <select
          value={statusFilter}
          onChange={(e) => {
            const v = e.target.value;
            setStatusFilter(v);
            fetchPage(1, { status: v, supplierId: supplierFilter });
          }}
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
          value={supplierFilter}
          onChange={(e) => {
            const v = e.target.value;
            setSupplierFilter(v);
            fetchPage(1, { status: statusFilter, supplierId: v });
          }}
          className="rounded-lg border border-border bg-bg-tertiary px-4 py-2 text-text-primary"
        >
          <option value="">ყველა მომწოდებელი</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div className="rounded-xl border border-border bg-bg-secondary overflow-hidden">
        <table className="w-full">
          <thead className="bg-bg-tertiary">
            <tr>
              <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">
                ნომერი
              </th>
              <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">
                მომწოდებელი
              </th>
              <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">
                თარიღი
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
            {data.orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-text-muted">
                  <FileText className="mx-auto h-12 w-12 text-text-muted/50 mb-2" />
                  შეკვეთები ვერ მოიძებნა
                </td>
              </tr>
            ) : (
              data.orders.map((o) => (
                <tr key={o.id} className="hover:bg-bg-tertiary/50">
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/purchases/${o.id}`}
                      className="text-copper-light hover:underline"
                    >
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{o.supplier.name}</td>
                  <td className="px-4 py-3 text-sm text-text-muted" suppressHydrationWarning>
                    <FormattedDate date={o.createdAt} />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-1 rounded text-xs ${
                        STATUS_COLORS[o.status] ?? "bg-bg-tertiary"
                      }`}
                    >
                      {STATUS_LABELS[o.status] ?? o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium" suppressHydrationWarning>
                    {formatCurrency(o.total)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/purchases/${o.id}`}
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
              ჩანს {data.orders.length} / {data.total}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchPage(page - 1)}
                disabled={page <= 1 || loading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm py-1">
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
