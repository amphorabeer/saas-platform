"use client";

import Link from "next/link";

interface Product {
  id: string;
  name: string;
  nameKa?: string | null;
  sku: string;
  currentStock: number;
  minStock: number;
  sellingPrice: number;
  unit: string;
  category?: { name: string } | null;
}

interface LowStockAlertsProps {
  products: Product[];
}

export function LowStockAlerts({ products }: LowStockAlertsProps) {
  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-bg-secondary p-12 text-center">
        <p className="text-lg text-green-400 mb-2">✅ მარაგი ნორმაშია</p>
        <p className="text-sm text-text-muted">
          ყველა პროდუქტი აკმაყოფილებს მინიმალურ მარაგს
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-bg-secondary overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="font-medium text-red-400">
          {products.length} პროდუქტს აქვს დაბალი მარაგი
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-bg-tertiary">
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
                მინიმუმი
              </th>
              <th className="text-right text-xs font-medium text-text-muted uppercase px-4 py-3">
                დეფიციტი
              </th>
              <th className="w-20 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {products.map((p) => {
              const deficit = p.minStock - p.currentStock;
              return (
                <tr key={p.id} className="hover:bg-bg-tertiary/30">
                  <td className="px-4 py-3">
                    <Link
                      href={`/products/${p.id}`}
                      className="font-medium text-text-primary hover:text-copper-light"
                    >
                      {p.nameKa || p.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{p.sku}</td>
                  <td className="px-4 py-3 text-sm text-text-muted">
                    {p.category?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-red-400 font-medium">
                    {p.currentStock} {p.unit}
                  </td>
                  <td className="px-4 py-3 text-right text-text-secondary">
                    {p.minStock} {p.unit}
                  </td>
                  <td className="px-4 py-3 text-right text-amber-400 font-medium">
                    -{deficit} {p.unit}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/products/${p.id}`}
                      className="text-sm text-copper-light hover:underline"
                    >
                      რედაქტირება
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
