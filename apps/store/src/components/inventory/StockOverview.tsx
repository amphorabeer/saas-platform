"use client";

import Link from "next/link";
import { formatCurrency } from "@/lib/format";

interface Product {
  id: string;
  name: string;
  nameKa?: string | null;
  sku: string;
  currentStock: number;
  minStock: number;
  maxStock?: number | null;
  unit: string;
  sellingPrice: number;
  category?: { name: string } | null;
}

interface StockOverviewProps {
  products: Product[];
}

export function StockOverview({ products }: StockOverviewProps) {
  const totalValue = products.reduce(
    (sum, p) => sum + p.currentStock * p.sellingPrice,
    0
  );
  const lowStockCount = products.filter((p) => p.minStock > 0 && p.currentStock < p.minStock).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-bg-secondary p-4">
          <p className="text-sm text-text-muted">სულ პროდუქტი</p>
          <p className="text-2xl font-bold text-text-primary">{products.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-bg-secondary p-4">
          <p className="text-sm text-text-muted">დაბალი მარაგი</p>
          <p className="text-2xl font-bold">
            <Link
              href="/inventory/alerts"
              className={lowStockCount > 0 ? "text-red-400 hover:underline" : "text-text-primary"}
            >
              {lowStockCount}
            </Link>
          </p>
        </div>
        <div className="rounded-xl border border-border bg-bg-secondary p-4">
          <p className="text-sm text-text-muted">მარაგის ღირებულება</p>
          <p className="text-2xl font-bold text-copper-light" suppressHydrationWarning>
            {formatCurrency(totalValue)}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-bg-secondary overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex justify-between items-center">
          <h3 className="font-medium">მიმდინარე მარაგი</h3>
          <Link
            href="/inventory/movements"
            className="text-sm text-copper-light hover:underline"
          >
            მოძრაობების ისტორია →
          </Link>
        </div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full">
            <thead className="bg-bg-tertiary sticky top-0">
              <tr>
                <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">
                  პროდუქტი
                </th>
                <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">
                  SKU
                </th>
                <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">
                  კატეგორია
                </th>
                <th className="text-right text-xs font-medium text-text-muted uppercase px-4 py-3">
                  მარაგი
                </th>
                <th className="text-right text-xs font-medium text-text-muted uppercase px-4 py-3">
                  მინ.
                </th>
                <th className="text-right text-xs font-medium text-text-muted uppercase px-4 py-3">
                  ფასი
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-text-muted">
                    პროდუქტები ვერ მოიძებნა
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const isLow = p.minStock > 0 && p.currentStock < p.minStock;
                  return (
                    <tr key={p.id} className="hover:bg-bg-tertiary/30">
                      <td className="px-4 py-2">
                        <Link
                          href={`/products/${p.id}`}
                          className="text-text-primary hover:text-copper-light"
                        >
                          {p.nameKa || p.name}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-sm text-text-secondary">{p.sku}</td>
                      <td className="px-4 py-2 text-sm text-text-secondary">
                        {p.category?.name ?? "—"}
                      </td>
                      <td
                        className={`px-4 py-2 text-right font-medium ${
                          isLow ? "text-red-400" : ""
                        }`}
                      >
                        {p.currentStock} {p.unit}
                      </td>
                      <td className="px-4 py-2 text-right text-sm text-text-muted">
                        {p.minStock}
                      </td>
                      <td className="px-4 py-2 text-right text-sm" suppressHydrationWarning>
                        {formatCurrency(p.sellingPrice)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
