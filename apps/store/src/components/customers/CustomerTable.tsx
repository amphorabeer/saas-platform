"use client";

import { useState } from "react";
import Link from "next/link";
import { getCustomers } from "@/lib/store-actions";
import { Button } from "@saas-platform/ui";
import { formatCurrency } from "@/lib/format";
import { exportToCsv, exportToExcel } from "@/lib/export/utils";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";

interface CustomerTableProps {
  initialData: Awaited<ReturnType<typeof getCustomers>>;
}

export function CustomerTable({ initialData }: CustomerTableProps) {
  const [data, setData] = useState(initialData);
  const [page, setPage] = useState(initialData.page);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchPage = async (p: number, searchQuery?: string) => {
    setLoading(true);
    const res = await getCustomers({
      page: p,
      limit: 20,
      search: searchQuery ?? (search || undefined),
    });
    setData(res);
    setPage(p);
    setLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPage(1, search);
  };

  const handleExport = async (format: "csv" | "excel") => {
    setLoading(true);
    const res = await getCustomers({ limit: 10000, search: search || undefined });
    const exportData = res.customers.map((c) => ({
      "სახელი": c.firstName,
      "გვარი": c.lastName ?? "",
      "ტელეფონი": c.phone ?? "",
      "Email": c.email ?? "",
      "შესყიდვების ჯამი": Number(c.totalPurchases).toFixed(2),
    }));
    setLoading(false);
    if (format === "csv") exportToCsv(exportData, "momxmareblebi.csv");
    else exportToExcel(exportData, "momxmareblebi.xlsx", "მომხმარებლები");
  };

  const displayName = (c: (typeof data.customers)[0]) =>
    `${c.firstName} ${c.lastName ?? ""}`.trim();

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ძიება (სახელი, ტელეფონი, email)..."
          className="rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 w-80 text-text-primary placeholder:text-text-muted"
        />
        <Button type="submit" variant="secondary">
          ძიება
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setSearch("");
            fetchPage(1, "");
          }}
        >
          გასუფთავება
        </Button>
        <div className="flex gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={() => handleExport("csv")} disabled={loading}>CSV ექსპორტი</Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("excel")} disabled={loading}>Excel</Button>
        </div>
      </form>
      <div className="rounded-xl border border-border bg-bg-secondary overflow-hidden">
        <table className="w-full">
          <thead className="bg-bg-tertiary">
            <tr>
              <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">
                მომხმარებელი
              </th>
              <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">
                ტელეფონი
              </th>
              <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">
                Email
              </th>
              <th className="text-right text-xs font-medium text-text-muted uppercase px-4 py-3">
                შესყიდვების ჯამი
              </th>
              <th className="w-20 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.customers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-text-muted">
                  <Users className="mx-auto h-12 w-12 text-text-muted/50 mb-2" />
                  მომხმარებლები ვერ მოიძებნა
                </td>
              </tr>
            ) : (
              data.customers.map((c) => (
                <tr key={c.id} className="hover:bg-bg-tertiary/50">
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/customers/${c.id}`}
                      className="text-copper-light hover:underline"
                    >
                      {displayName(c)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {c.phone ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {c.email ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-medium" suppressHydrationWarning>
                    {formatCurrency(c.totalPurchases)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/customers/${c.id}`}
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
              ჩანს {data.customers.length} / {data.total}
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
