"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { customerSchema, type CustomerFormData } from "@/lib/validators";
import { createCustomer, updateCustomer } from "@/lib/store-actions";
import { Button } from "@saas-platform/ui";

interface CustomerFormProps {
  customer?: {
    id: string;
    firstName: string;
    lastName?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    taxId?: string | null;
    notes?: string | null;
  };
}

export function CustomerForm({ customer }: CustomerFormProps) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<CustomerFormData>({
    firstName: customer?.firstName ?? "",
    lastName: customer?.lastName ?? undefined,
    phone: customer?.phone ?? undefined,
    email: customer?.email ?? undefined,
    address: customer?.address ?? undefined,
    taxId: customer?.taxId ?? undefined,
    notes: customer?.notes ?? undefined,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const parsed = customerSchema.safeParse(form);
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
    const result = customer
      ? await updateCustomer(customer.id, parsed.data)
      : await createCustomer(parsed.data);
    setLoading(false);
    if (result.success) {
      router.refresh();
      if (!customer && result.id) router.push(`/customers/${result.id}`);
      else if (customer) router.push(`/customers/${customer.id}`);
    } else {
      setErrors({ form: result.error ?? "შეცდომა" });
    }
  };

  return (
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
            name="firstName"
            value={form.firstName}
            onChange={handleChange}
            className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary focus:outline-none focus:ring-2 focus:ring-copper/50"
            placeholder="სახელი"
          />
          {errors.firstName && (
            <p className="mt-1 text-xs text-red-400">{errors.firstName}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            გვარი
          </label>
          <input
            name="lastName"
            value={form.lastName ?? ""}
            onChange={handleChange}
            className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary"
            placeholder="გვარი"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            ტელეფონი
          </label>
          <input
            name="phone"
            value={form.phone ?? ""}
            onChange={handleChange}
            className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary"
            placeholder="+995 ..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Email
          </label>
          <input
            type="email"
            name="email"
            value={form.email ?? ""}
            onChange={handleChange}
            className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary"
            placeholder="email@example.com"
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-400">{errors.email}</p>
          )}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          მისამართი
        </label>
        <input
          name="address"
          value={form.address ?? ""}
          onChange={handleChange}
          className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary"
          placeholder="მისამართი"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          საგადასახადო ID
        </label>
        <input
          name="taxId"
          value={form.taxId ?? ""}
          onChange={handleChange}
          className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary"
          placeholder="საგადასახადო ნომერი"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          შენიშვნა
        </label>
        <textarea
          name="notes"
          value={form.notes ?? ""}
          onChange={handleChange}
          rows={2}
          className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary"
          placeholder="შენიშვნები"
        />
      </div>
      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? "იტვირთება..." : customer ? "შენახვა" : "შექმნა"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          გაუქმება
        </Button>
      </div>
    </form>
  );
}
