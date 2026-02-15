"use client";

import { useState, useMemo, useEffect } from "react";
import { usePosStore } from "@/stores/pos-store";
import { formatCurrency } from "@/lib/format";

interface Category {
  id: string;
  name: string;
  nameKa?: string | null;
  slug: string;
}

interface Product {
  id: string;
  name: string;
  nameKa?: string | null;
  sku: string;
  barcode?: string | null;
  sellingPrice: number;
  costPrice: number;
  imageUrl?: string | null;
  categoryId?: string | null;
}

interface ProductGridProps {
  categories: Category[];
  products: Product[];
  search: string;
  setSearch: (v: string) => void;
}

export function ProductGrid({
  categories,
  products,
  search,
  setSearch,
}: ProductGridProps) {
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(
    categories[0]?.id ?? null
  );
  const addItem = usePosStore((s) => s.addItem);

  useEffect(() => {
    const onCat = (e: Event) => {
      const ev = e as CustomEvent<string>;
      setActiveCategoryId(ev.detail ?? null);
    };
    document.addEventListener("pos-category", onCat);
    return () => document.removeEventListener("pos-category", onCat);
  }, []);

  const filtered = useMemo(() => {
    let list = products;
    if (activeCategoryId)
      list = list.filter((p) => p.categoryId === activeCategoryId);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.nameKa?.toLowerCase().includes(q)) ||
          p.sku.toLowerCase().includes(q) ||
          (p.barcode?.toLowerCase().includes(q))
      );
    }
    return list;
  }, [products, activeCategoryId, search]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex gap-1 p-2 border-b border-border overflow-x-auto shrink-0">
        <button
          onClick={() => setActiveCategoryId(null)}
          className={`px-4 py-2 rounded-lg text-sm font-medium shrink-0 ${
            activeCategoryId === null
              ? "bg-copper/30 text-copper-light border border-copper/50"
              : "bg-bg-tertiary text-text-secondary hover:bg-bg-tertiary/80"
          }`}
        >
          ყველა
        </button>
        {categories.slice(0, 8).map((c, i) => (
          <button
            key={c.id}
            onClick={() => setActiveCategoryId(c.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium shrink-0 ${
              activeCategoryId === c.id
                ? "bg-copper/30 text-copper-light border border-copper/50"
                : "bg-bg-tertiary text-text-secondary hover:bg-bg-tertiary/80"
            }`}
            title={`F${i + 1}`}
          >
            {c.nameKa || c.name} <span className="text-xs opacity-70">F{i + 1}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.map((p) => (
            <button
              key={p.id}
              className="min-h-[48px] touch-manipulation"
              onClick={() =>
                addItem({
                  productId: p.id,
                  productName: p.name,
                  nameKa: p.nameKa,
                  unitPrice: p.sellingPrice,
                  costPrice: p.costPrice,
                  imageUrl: p.imageUrl,
                })
              }
              className="flex flex-col rounded-xl border border-border bg-bg-secondary hover:bg-bg-tertiary hover:border-copper/40 active:scale-[0.98] transition-all overflow-hidden text-left"
            >
              <div className="aspect-square bg-bg-tertiary relative overflow-hidden">
                {p.imageUrl ? (
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-4xl text-text-muted/50">
                    📦
                  </div>
                )}
              </div>
              <div className="p-2">
                <p className="text-sm font-medium text-text-primary truncate">
                  {p.nameKa || p.name}
                </p>
                <p className="text-sm font-semibold text-copper-light" suppressHydrationWarning>
                  {formatCurrency(p.sellingPrice)}
                </p>
              </div>
            </button>
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-16 text-text-muted">
            პროდუქტები ვერ მოიძებნა
          </div>
        )}
      </div>
    </div>
  );
}
