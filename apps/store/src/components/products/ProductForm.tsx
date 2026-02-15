"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { productSchema, type ProductFormData } from "@/lib/validators";
import { createProduct, updateProduct } from "@/lib/store-actions";
import { slugify } from "@saas-platform/utils";
import { Button } from "@saas-platform/ui";
import { BarcodeScannerModal } from "@/components/pos/BarcodeScannerModal";

interface ProductFormProps {
  product?: {
    id: string;
    name: string;
    nameKa?: string | null;
    sku: string;
    barcode?: string | null;
    categoryId?: string | null;
    description?: string | null;
    imageUrl?: string | null;
    costPrice: number;
    sellingPrice: number;
    wholesalePrice?: number | null;
    currentStock: number;
    minStock: number;
    maxStock?: number | null;
    unit: string;
    isActive: boolean;
    isFavorite: boolean;
    sortOrder: number;
  };
  categories: { id: string; name: string }[];
}

const UNITS = [
  { value: "piece", label: "ცალი" },
  { value: "kg", label: "კგ" },
  { value: "l", label: "ლიტრი" },
  { value: "m", label: "მეტრი" },
  { value: "pack", label: "პაკეტი" },
];

export function ProductForm({ product, categories }: ProductFormProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [form, setForm] = useState<ProductFormData>({
    name: product?.name ?? "",
    nameKa: product?.nameKa ?? undefined,
    sku: product?.sku ?? "",
    barcode: product?.barcode ?? undefined,
    categoryId: product?.categoryId ?? null,
    description: product?.description ?? undefined,
    imageUrl: product?.imageUrl ?? undefined,
    costPrice: product?.costPrice ?? 0,
    sellingPrice: product?.sellingPrice ?? 0,
    wholesalePrice: product?.wholesalePrice ?? undefined,
    currentStock: product?.currentStock ?? 0,
    minStock: product?.minStock ?? 0,
    maxStock: product?.maxStock ?? undefined,
    unit: product?.unit ?? "piece",
    isActive: product?.isActive ?? true,
    isFavorite: product?.isFavorite ?? false,
    sortOrder: product?.sortOrder ?? 0,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    const numFields = ["costPrice", "sellingPrice", "wholesalePrice", "currentStock", "minStock", "maxStock", "sortOrder"];
    setForm((prev) => {
      const next = { ...prev };
      if (type === "checkbox") {
        (next as Record<string, unknown>)[name] = checked;
      } else if (name === "categoryId") {
        next.categoryId = value || null;
      } else if (numFields.includes(name)) {
        const v = value === "" ? (name === "maxStock" || name === "wholesalePrice" ? undefined : 0) : parseFloat(value) || 0;
        (next as Record<string, unknown>)[name] = v;
      } else {
        (next as Record<string, unknown>)[name] = value;
      }
      return next;
    });
    if (errors[name]) setErrors((err) => ({ ...err, [name]: "" }));
  };

  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

  const generateSku = () => {
    const base = form.name ? slugify(form.name).slice(0, 12) || "prod" : "prod";
    const r = Math.random().toString(36).slice(2, 6);
    setForm((p) => ({ ...p, sku: `${base}-${r}` }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const parsed = productSchema.safeParse(form);
    if (!parsed.success) {
      const err: Record<string, string> = {};
      parsed.error.errors.forEach((z) => {
        const p = z.path[0]?.toString();
        if (p) err[p] = z.message;
      });
      setErrors(err);
      return;
    }

    setLoading(true);
    const data = parsed.data;
    let result: { success: boolean; id?: string; error?: string } | null = null;
    try {
      result = product
        ? await updateProduct(product.id, data)
        : await createProduct(data);
    } catch (err) {
      setLoading(false);
      setErrors({ form: "მოხდა შეცდომა. სცადეთ თავიდან." });
      return;
    }
    setLoading(false);
    if (!result) {
      setErrors({ form: "მოხდა შეცდომა." });
      return;
    }
    if (result.success) {
      if (product) {
        router.refresh();
        toast.success("პროდუქტი განახლდა");
      } else {
        toast.success("პროდუქტი შეიქმნა");
        router.push("/products");
      }
    } else {
      setErrors({ form: result.error ?? "მოხდა შეცდომა." });
    }
  };

  const handleBarcodeScanned = (barcode: string) => {
    setForm((p) => ({ ...p, barcode: barcode || undefined }));
    setShowBarcodeScanner(false);
  };

  if (!mounted) {
    return (
      <div className="space-y-6 max-w-2xl animate-pulse">
        <div className="h-10 rounded-lg bg-bg-tertiary" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-10 rounded-lg bg-bg-tertiary" />
          <div className="h-10 rounded-lg bg-bg-tertiary" />
        </div>
        <div className="h-10 rounded-lg bg-bg-tertiary w-1/3" />
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {errors.form && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {errors.form}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            სახელი *
          </label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-copper/50"
            placeholder="პროდუქტის სახელი"
          />
          {errors.name && (
            <p className="mt-1 text-xs text-red-400">{errors.name}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            სახელი (ქართული)
          </label>
          <input
            name="nameKa"
            value={form.nameKa ?? ""}
            onChange={handleChange}
            className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-copper/50"
            placeholder="სახელი ქართულად"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            SKU *
          </label>
          <div className="flex gap-2">
            <input
              name="sku"
              value={form.sku}
              onChange={handleChange}
              className="flex-1 rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-copper/50"
              placeholder="SKU"
            />
            {!product && (
              <button
                type="button"
                onClick={generateSku}
                className="px-3 py-2 rounded-lg bg-bg-tertiary border border-border text-text-secondary hover:bg-border/50 text-sm"
              >
                გენერაცია
              </button>
            )}
          </div>
          {errors.sku && (
            <p className="mt-1 text-xs text-red-400">{errors.sku}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            ბარკოდი
          </label>
          <div className="flex gap-2">
            <input
              name="barcode"
              value={form.barcode ?? ""}
              onChange={handleChange}
              className="flex-1 rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-copper/50"
              placeholder="ბარკოდი"
            />
            <button
              type="button"
              onClick={() => setShowBarcodeScanner(true)}
              className="min-w-[48px] px-3 rounded-lg bg-copper/20 text-copper-light border border-copper/30 hover:bg-copper/30"
              title="კამერით სკანირება"
            >
              📷
            </button>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          კატეგორია
        </label>
        <select
          name="categoryId"
          value={form.categoryId ?? ""}
          onChange={handleChange}
          className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary focus:outline-none focus:ring-2 focus:ring-copper/50"
        >
          <option value="">-- არჩევა --</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          აღწერა
        </label>
        <textarea
          name="description"
          value={form.description ?? ""}
          onChange={handleChange}
          rows={2}
          className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-copper/50"
          placeholder="აღწერა"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            ღირებულება (₾) *
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            name="costPrice"
            value={form.costPrice}
            onChange={handleChange}
            className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary focus:outline-none focus:ring-2 focus:ring-copper/50"
          />
          {errors.costPrice && (
            <p className="mt-1 text-xs text-red-400">{errors.costPrice}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            ფასი (₾) *
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            name="sellingPrice"
            value={form.sellingPrice}
            onChange={handleChange}
            className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary focus:outline-none focus:ring-2 focus:ring-copper/50"
          />
          {errors.sellingPrice && (
            <p className="mt-1 text-xs text-red-400">{errors.sellingPrice}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            საბითუმო ფასი (₾)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            name="wholesalePrice"
            value={form.wholesalePrice ?? ""}
            onChange={handleChange}
            className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary focus:outline-none focus:ring-2 focus:ring-copper/50"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            მარაგი
          </label>
          <input
            type="number"
            step="0.001"
            min="0"
            name="currentStock"
            value={form.currentStock}
            onChange={handleChange}
            className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary focus:outline-none focus:ring-2 focus:ring-copper/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            მინ. მარაგი
          </label>
          <input
            type="number"
            step="0.001"
            min="0"
            name="minStock"
            value={form.minStock}
            onChange={handleChange}
            className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary focus:outline-none focus:ring-2 focus:ring-copper/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            მაქს. მარაგი
          </label>
          <input
            type="number"
            step="0.001"
            min="0"
            name="maxStock"
            value={form.maxStock ?? ""}
            onChange={handleChange}
            className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary focus:outline-none focus:ring-2 focus:ring-copper/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            ერთეული
          </label>
          <select
            name="unit"
            value={form.unit}
            onChange={handleChange}
            className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary focus:outline-none focus:ring-2 focus:ring-copper/50"
          >
            {UNITS.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            name="isActive"
            checked={form.isActive}
            onChange={handleChange}
            className="rounded border-border bg-bg-tertiary"
          />
          <span className="text-sm text-text-secondary">აქტიური</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            name="isFavorite"
            checked={form.isFavorite}
            onChange={handleChange}
            className="rounded border-border bg-bg-tertiary"
          />
          <span className="text-sm text-text-secondary">ფავორიტი</span>
        </label>
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? "იტვირთება..." : product ? "შენახვა" : "შექმნა"}
        </Button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            router.back();
          }}
          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
        >
          გაუქმება
        </button>
      </div>
    </form>

    <BarcodeScannerModal
        open={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onScan={handleBarcodeScanned}
      />
    </>
  );
}
