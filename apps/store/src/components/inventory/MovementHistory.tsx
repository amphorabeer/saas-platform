"use client";

import { useState } from "react";
import { getStockMovements, adjustStock } from "@/lib/store-actions";
import { Button } from "@saas-platform/ui";
import { FormattedDate } from "@/components/ui/FormattedDate";
import { ChevronLeft, ChevronRight, Package } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  STOCK_IN: "შემოსვლა",
  STOCK_OUT: "გასვლა",
  STOCK_ADJUSTMENT: "კორექტირება",
  STOCK_TRANSFER: "გადატანა",
  STOCK_RETURN: "დაბრუნება",
};

const TYPE_COLORS: Record<string, string> = {
  STOCK_IN: "bg-green-500/20 text-green-400",
  STOCK_OUT: "bg-red-500/20 text-red-400",
  STOCK_ADJUSTMENT: "bg-amber-500/20 text-amber-400",
  STOCK_TRANSFER: "bg-blue-500/20 text-blue-400",
  STOCK_RETURN: "bg-cyan-500/20 text-cyan-400",
};

interface Movement {
  id: string;
  type: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason?: string | null;
  createdAt: Date | string;
  product: { name: string; nameKa?: string | null; sku: string };
}

interface MovementHistoryProps {
  initialData: {
    movements: Movement[];
    total: number;
    page: number;
    totalPages: number;
  };
}

export function MovementHistory({ initialData }: MovementHistoryProps) {
  const [data, setData] = useState(initialData);
  const [filter, setFilter] = useState<string>("");
  const [page, setPage] = useState(initialData.page);
  const [loading, setLoading] = useState(false);

  const fetchPage = async (p: number) => {
    setLoading(true);
    try {
      const res = await getStockMovements({
        page: p,
        limit: 30,
        type: filter || undefined,
      });
      setData(res);
      setPage(p);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <select
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            fetchPage(1);
          }}
          className="rounded-lg border border-border bg-bg-tertiary px-4 py-2 text-text-primary"
        >
          <option value="">ყველა ტიპი</option>
          <option value="STOCK_IN">შემოსვლა</option>
          <option value="STOCK_OUT">გასვლა</option>
          <option value="STOCK_ADJUSTMENT">კორექტირება</option>
          <option value="STOCK_TRANSFER">გადატანა</option>
          <option value="STOCK_RETURN">დაბრუნება</option>
        </select>
      </div>

      <div className="rounded-xl border border-border bg-bg-secondary overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-bg-tertiary">
              <tr>
                <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">
                  თარიღი
                </th>
                <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">
                  პროდუქტი
                </th>
                <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">
                  ტიპი
                </th>
                <th className="text-right text-xs font-medium text-text-muted uppercase px-4 py-3">
                  რაოდენობა
                </th>
                <th className="text-right text-xs font-medium text-text-muted uppercase px-4 py-3">
                  წინა
                </th>
                <th className="text-right text-xs font-medium text-text-muted uppercase px-4 py-3">
                  ახალი
                </th>
                <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">
                  მიზეზი
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.movements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-text-muted">
                    <Package className="mx-auto h-12 w-12 text-text-muted/50 mb-2" />
                    მოძრაობები ვერ მოიძებნა
                  </td>
                </tr>
              ) : (
                data.movements.map((m) => (
                  <tr key={m.id} className="hover:bg-bg-tertiary/30">
                    <td className="px-4 py-2 text-sm text-text-secondary" suppressHydrationWarning>
                      <FormattedDate date={m.createdAt} showTime />
                    </td>
                    <td className="px-4 py-2">
                      <span className="font-medium">{m.product.nameKa || m.product.name}</span>
                      <span className="ml-2 text-xs text-text-muted">{m.product.sku}</span>
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                          TYPE_COLORS[m.type] ?? "bg-bg-tertiary text-text-secondary"
                        }`}
                      >
                        {TYPE_LABELS[m.type] ?? m.type}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <span
                        className={
                          m.newStock > m.previousStock
                            ? "text-green-400"
                            : m.newStock < m.previousStock
                              ? "text-red-400"
                              : ""
                        }
                      >
                        {m.newStock > m.previousStock ? "+" : ""}
                        {m.quantity}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right text-text-muted">{m.previousStock}</td>
                    <td className="px-4 py-2 text-right font-medium">{m.newStock}</td>
                    <td className="px-4 py-2 text-sm text-text-muted">{m.reason ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-bg-tertiary/30">
            <p className="text-sm text-text-muted">
              ჩანს {data.movements.length} / {data.total}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchPage(page - 1)}
                disabled={page <= 1 || loading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-text-secondary">
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
