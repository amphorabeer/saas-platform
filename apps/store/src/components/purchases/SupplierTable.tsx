"use client";

import { useState } from "react";
import Link from "next/link";
import { getSuppliers } from "@/lib/store-actions";
import { Button } from "@saas-platform/ui";
import { Pencil, Truck } from "lucide-react";

interface Supplier {
  id: string;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  isActive: boolean;
  _count: { purchaseOrders: number };
}

interface SupplierTableProps {
  initialSuppliers: Supplier[];
}

export function SupplierTable({ initialSuppliers }: SupplierTableProps) {
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await getSuppliers({ search: search || undefined });
    setSuppliers(res);
    setLoading(false);
  };

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
          onClick={async () => {
            setSearch("");
            const res = await getSuppliers();
            setSuppliers(res);
          }}
        >
          გასუფთავება
        </Button>
      </form>
      <div className="rounded-xl border border-border bg-bg-secondary overflow-hidden">
        <table className="w-full">
          <thead className="bg-bg-tertiary">
            <tr>
              <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">
                მომწოდებელი
              </th>
              <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">
                საკონტაქტო
              </th>
              <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">
                ტელეფონი
              </th>
              <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">
                შეკვეთები
              </th>
              <th className="w-24 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {suppliers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-text-muted">
                  <Truck className="mx-auto h-12 w-12 text-text-muted/50 mb-2" />
                  მომწოდებლები ვერ მოიძებნა
                </td>
              </tr>
            ) : (
              suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-bg-tertiary/50">
                  <td className="px-4 py-3">
                    <span className="font-medium">{s.name}</span>
                    {!s.isActive && (
                      <span className="ml-2 text-xs text-text-muted">(არააქტიური)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {s.contactPerson ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{s.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-sm">{s._count.purchaseOrders}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/purchases/suppliers/${s.id}`}
                      className="p-2 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-text-primary inline-block"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
