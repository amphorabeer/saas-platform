"use client";

import { useState } from "react";
import Link from "next/link";
import { getReturns } from "@/lib/store-actions";
import { Button } from "@saas-platform/ui";
import { FormattedDate } from "@/components/ui/FormattedDate";
import { formatCurrency } from "@/lib/format";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";

const REFUND_LABELS: Record<string, string> = {
  CASH: "ნაღდი",
  CARD: "ბარათი",
  BANK_TRANSFER: "ბანკის გადარიცხვა",
  CHECK: "ჩეკი",
};

interface ReturnsTableProps {
  initialData: Awaited<ReturnType<typeof getReturns>>;
}

export function ReturnsTable({ initialData }: ReturnsTableProps) {
  const [data, setData] = useState(initialData);
  const [page, setPage] = useState(initialData.page);
  const [loading, setLoading] = useState(false);

  const fetchPage = async (p: number) => {
    setLoading(true);
    const res = await getReturns({ page: p, limit: 20 });
    setData(res);
    setPage(p);
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-bg-secondary overflow-hidden">
        <table className="w-full">
          <thead className="bg-bg-tertiary">
            <tr>
              <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">
                გაყიდვა
              </th>
              <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">
                თარიღი
              </th>
              <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">
                მიზეზი
              </th>
              <th className="text-right text-xs font-medium text-text-muted uppercase px-4 py-3">
                თანხა
              </th>
              <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">
                მეთოდი
              </th>
              <th className="w-20 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.returns.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-text-muted">
                  <RotateCcw className="mx-auto h-12 w-12 text-text-muted/50 mb-2" />
                  დაბრუნებები ვერ მოიძებნა
                </td>
              </tr>
            ) : (
              data.returns.map((r) => (
                <tr key={r.id} className="hover:bg-bg-tertiary/50">
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/sales/${r.sale.id}`}
                      className="text-copper-light hover:underline"
                    >
                      {r.sale.saleNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted" suppressHydrationWarning>
                    <FormattedDate date={r.createdAt} showTime />
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{r.reason}</td>
                  <td className="px-4 py-3 text-right font-medium text-amber-400" suppressHydrationWarning>
                    -{formatCurrency(r.refundAmount)}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">
                    {REFUND_LABELS[r.refundMethod] ?? r.refundMethod}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/sales/${r.sale.id}`}
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
              ჩანს {data.returns.length} / {data.total}
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
