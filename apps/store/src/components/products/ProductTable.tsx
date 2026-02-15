"use client";

import { useState } from "react";
import Link from "next/link";
import { getProducts, deleteProduct } from "@/lib/store-actions";
import { formatCurrency } from "@/lib/format";
import { Button } from "@saas-platform/ui";
import { exportToCsv, exportToExcel } from "@/lib/export/utils";
import { ChevronLeft, ChevronRight, Pencil, Trash2, Package } from "lucide-react";

interface ProductRow {
  id: string;
  name: string;
  nameKa?: string | null;
  sku: string;
  barcode?: string | null;
  categoryId?: string | null;
  costPrice: number;
  sellingPrice: number;
  wholesalePrice?: number | null;
  currentStock: number;
  minStock: number;
  category?: { name: string } | null;
  isActive: boolean;
}

interface ProductTableProps {
  initialData: {
    products: ProductRow[];
    total: number;
    page: number;
    totalPages: number;
  };
  categories: { id: string; name: string }[];
}

export function ProductTable({
  initialData,
  categories,
}: ProductTableProps) {
  const [data, setData] = useState(initialData);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [page, setPage] = useState(initialData.page);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchPage = async (p: number) => {
    setLoading(true);
    try {
      const res = await getProducts({
        page: p,
        limit: 20,
        search: search || undefined,
        categoryId: categoryId || undefined,
      });
      setData(res);
      setPage(p);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPage(1);
  };

  const handleExport = async (format: "csv" | "excel") => {
    setLoading(true);
    const res = await getProducts({
      limit: 10000,
      search: search || undefined,
      categoryId: categoryId || undefined,
    });
    const exportData = res.products.map((p) => ({
      "სახელი": p.nameKa || p.name,
      "SKU": p.sku,
      "ბარკოდი": p.barcode ?? "",
      "კატეგორია": p.category?.name ?? "",
      "მარაგი": p.currentStock,
      "ღირებულება": p.costPrice.toFixed(2),
      "ფასი": p.sellingPrice.toFixed(2),
    }));
    setLoading(false);
    if (format === "csv") exportToCsv(exportData, "produktebi.csv");
    else exportToExcel(exportData, "produktebi.xlsx", "პროდუქტები");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("დარწმუნებული ხართ, რომ გსურთ პროდუქტის წაშლა?")) return;
    setDeletingId(id);
    const result = await deleteProduct(id);
    setDeletingId(null);
    if (result.success) {
      setData((d) => ({
        ...d,
        products: d.products.filter((p) => p.id !== id),
        total: d.total - 1,
      }));
    } else {
      alert(result.error);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ძიება (სახელი, SKU, ბარკოდი)..."
          className="rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 w-64 text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-copper/50"
        />
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary focus:outline-none focus:ring-2 focus:ring-copper/50"
        >
          <option value="">ყველა კატეგორია</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <Button type="submit" variant="secondary">
          ძიება
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setSearch("");
            setCategoryId("");
            fetchPage(1);
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
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-bg-tertiary">
              <tr>
                <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider px-4 py-3">
                  პროდუქტი
                </th>
                <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider px-4 py-3">
                  SKU
                </th>
                <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider px-4 py-3">
                  კატეგორია
                </th>
                <th className="text-right text-xs font-medium text-text-muted uppercase tracking-wider px-4 py-3">
                  მარაგი
                </th>
                <th className="text-right text-xs font-medium text-text-muted uppercase tracking-wider px-4 py-3">
                  ღირებულება
                </th>
                <th className="text-right text-xs font-medium text-text-muted uppercase tracking-wider px-4 py-3">
                  ფასი
                </th>
                <th className="w-24 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-text-muted">
                    <Package className="mx-auto h-12 w-12 text-text-muted/50 mb-2" />
                    <p>პროდუქტები ვერ მოიძებნა</p>
                    <Link
                      href="/products/new"
                      className="mt-2 inline-block text-copper-light hover:underline"
                    >
                      პირველი პროდუქტის დამატება
                    </Link>
                  </td>
                </tr>
              ) : (
                data.products.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-bg-tertiary/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/products/${p.id}`}
                        className="font-medium text-text-primary hover:text-copper-light"
                      >
                        {p.nameKa || p.name}
                      </Link>
                      {!p.isActive && (
                        <span className="ml-2 text-xs text-text-muted">(არააქტიური)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {p.sku}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {p.category?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span
                        className={
                          p.minStock > 0 && p.currentStock <= p.minStock
                            ? "text-red-400"
                            : ""
                        }
                      >
                        {p.currentStock}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-text-secondary" suppressHydrationWarning>
                      {formatCurrency(p.costPrice)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-copper-light" suppressHydrationWarning>
                      {formatCurrency(p.sellingPrice)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/products/${p.id}`}
                          className="p-2 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-text-primary"
                          title="რედაქტირება"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(p.id)}
                          disabled={deletingId === p.id}
                          className="p-2 rounded-lg hover:bg-red-500/10 text-text-muted hover:text-red-400 disabled:opacity-50"
                          title="წაშლა"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-bg-tertiary/30">
            <p className="text-sm text-text-muted">
              ჩანს {data.products.length} / {data.total} პროდუქტი
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
