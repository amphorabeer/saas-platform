"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supplierSchema, type SupplierFormData } from "@/lib/validators";
import { createSupplier, updateSupplier } from "@/lib/store-actions";
import { Button } from "@saas-platform/ui";

interface SupplierFormProps {
  supplier?: {
    id: string;
    name: string;
    contactPerson?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    taxId?: string | null;
    bankAccount?: string | null;
    notes?: string | null;
    isActive: boolean;
  };
}

export function SupplierForm({ supplier }: SupplierFormProps) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<SupplierFormData>({
    name: supplier?.name ?? "",
    contactPerson: supplier?.contactPerson ?? undefined,
    phone: supplier?.phone ?? undefined,
    email: supplier?.email ?? undefined,
    address: supplier?.address ?? undefined,
    taxId: supplier?.taxId ?? undefined,
    bankAccount: supplier?.bankAccount ?? undefined,
    notes: supplier?.notes ?? undefined,
    isActive: supplier?.isActive ?? true,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setForm((p) => ({
      ...p,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const parsed = supplierSchema.safeParse(form);
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
    const result = supplier
      ? await updateSupplier(supplier.id, parsed.data)
      : await createSupplier(parsed.data);
    setLoading(false);
    if (result.success) {
      router.refresh();
      if (!supplier && result.id) router.push("/purchases/suppliers");
    } else {
      setErrors({ form: result.error });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {errors.form && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {errors.form}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">სახელი *</label>
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary focus:outline-none focus:ring-2 focus:ring-copper/50"
          placeholder="მომწოდებლის სახელი"
        />
        {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">საკონტაქტო პირი</label>
          <input
            name="contactPerson"
            value={form.contactPerson ?? ""}
            onChange={handleChange}
            className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">ტელეფონი</label>
          <input
            name="phone"
            value={form.phone ?? ""}
            onChange={handleChange}
            className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Email</label>
        <input
          type="email"
          name="email"
          value={form.email ?? ""}
          onChange={handleChange}
          className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">მისამართი</label>
        <input
          name="address"
          value={form.address ?? ""}
          onChange={handleChange}
          className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">საგადასახადო ID</label>
          <input
            name="taxId"
            value={form.taxId ?? ""}
            onChange={handleChange}
            className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">საბანკო ანგარიში</label>
          <input
            name="bankAccount"
            value={form.bankAccount ?? ""}
            onChange={handleChange}
            className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">შენიშვნა</label>
        <textarea
          name="notes"
          value={form.notes ?? ""}
          onChange={handleChange}
          rows={2}
          className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary"
        />
      </div>
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
      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? "იტვირთება..." : supplier ? "შენახვა" : "შექმნა"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          გაუქმება
        </Button>
      </div>
    </form>
  );
}
