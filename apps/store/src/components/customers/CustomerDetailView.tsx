"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@saas-platform/ui";
import { FormattedDate } from "@/components/ui/FormattedDate";
import { formatCurrency } from "@/lib/format";
import { ArrowLeft, Receipt, Award } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  COMPLETED: "დასრულებული",
  VOIDED: "გაუქმებული",
  REFUNDED: "დაბრუნებული",
  PARTIAL_REFUND: "ნაწილობრივ დაბრუნებული",
};

interface LoyaltyTransaction {
  id: string;
  type: string;
  points: number;
  saleId?: string | null;
  description?: string | null;
  createdAt: Date;
}

interface CustomerDetailViewProps {
  customer: NonNullable<
    Awaited<ReturnType<typeof import("@/lib/store-actions").getCustomerById>>
  > & { loyaltyPoints?: number; loyaltyTier?: string };
  loyaltyTransactions?: LoyaltyTransaction[];
}

const TIER_LABELS: Record<string, string> = {
  BRONZE: "ბრინჯაო",
  SILVER: "ვერცხლი",
  GOLD: "ოქრო",
  PLATINUM: "პლატინა",
};

const TX_TYPE_LABELS: Record<string, string> = {
  EARN: "მიღება",
  REDEEM: "გამოყენება",
  ADJUST: "შესწორება",
  EXPIRE: "ვადა",
};

export function CustomerDetailView({ customer, loyaltyTransactions = [] }: CustomerDetailViewProps) {
  const displayName = `${customer.firstName} ${customer.lastName ?? ""}`.trim();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/customers">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            უკან
          </Button>
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-bg-secondary p-6">
        <h2 className="text-lg font-semibold mb-6">{displayName}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {customer.phone && (
            <div>
              <p className="text-xs text-text-muted uppercase">ტელეფონი</p>
              <p>{customer.phone}</p>
            </div>
          )}
          {customer.email && (
            <div>
              <p className="text-xs text-text-muted uppercase">Email</p>
              <p>{customer.email}</p>
            </div>
          )}
          {customer.address && (
            <div>
              <p className="text-xs text-text-muted uppercase">მისამართი</p>
              <p>{customer.address}</p>
            </div>
          )}
          {customer.taxId && (
            <div>
              <p className="text-xs text-text-muted uppercase">საგადასახადო ID</p>
              <p>{customer.taxId}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-text-muted uppercase">შესყიდვების ჯამი</p>
            <p className="font-semibold text-copper-light" suppressHydrationWarning>
              {formatCurrency(customer.totalPurchases)}
            </p>
          </div>
          {(customer as { loyaltyPoints?: number }).loyaltyPoints != null && (
            <div>
              <p className="text-xs text-text-muted uppercase">ლოიალობის ქულები</p>
              <p className="font-semibold">{(customer as { loyaltyPoints: number }).loyaltyPoints}</p>
            </div>
          )}
          {(customer as { loyaltyTier?: string }).loyaltyTier && (
            <div>
              <p className="text-xs text-text-muted uppercase">ტიერი</p>
              <p className="font-semibold">{TIER_LABELS[(customer as { loyaltyTier: string }).loyaltyTier] ?? (customer as { loyaltyTier: string }).loyaltyTier}</p>
            </div>
          )}
        </div>
        {customer.notes && (
          <div className="mb-6">
            <p className="text-xs text-text-muted uppercase mb-1">შენიშვნა</p>
            <p className="text-text-secondary">{customer.notes}</p>
          </div>
        )}

        {loyaltyTransactions.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-medium text-text-secondary mb-3 flex items-center gap-2">
              <Award className="h-4 w-4" />
              ლოიალობის ისტორია
            </h3>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full">
                <thead className="bg-bg-tertiary">
                  <tr>
                    <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">თარიღი</th>
                    <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">ტიპი</th>
                    <th className="text-right text-xs font-medium text-text-muted uppercase px-4 py-3">ქულები</th>
                    <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">აღწერა</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loyaltyTransactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="px-4 py-3 text-sm" suppressHydrationWarning><FormattedDate date={tx.createdAt} showTime /></td>
                      <td className="px-4 py-3">{TX_TYPE_LABELS[tx.type] ?? tx.type}</td>
                      <td className={`px-4 py-3 text-right font-medium ${tx.points > 0 ? "text-emerald-400" : "text-amber-400"}`}>
                        {tx.points > 0 ? "+" : ""}{tx.points}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-muted">{tx.description ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div>
          <h3 className="text-sm font-medium text-text-secondary mb-3">
            შესყიდვების ისტორია
          </h3>
          {customer.sales.length === 0 ? (
            <p className="text-text-muted text-sm py-4">
              გაყიდვების ისტორია ცარიელია
            </p>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full">
                <thead className="bg-bg-tertiary">
                  <tr>
                    <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">
                      ნომერი
                    </th>
                    <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">
                      თარიღი
                    </th>
                    <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">
                      სტატუსი
                    </th>
                    <th className="text-right text-xs font-medium text-text-muted uppercase px-4 py-3">
                      ჯამი
                    </th>
                    <th className="w-20 px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {customer.sales.map((s) => (
                    <tr key={s.id} className="hover:bg-bg-tertiary/30">
                      <td className="px-4 py-3 font-medium">
                        <Link
                          href={`/sales/${s.id}`}
                          className="text-copper-light hover:underline"
                        >
                          {s.saleNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-muted" suppressHydrationWarning>
                        <FormattedDate date={s.createdAt} showTime />
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs">
                          {STATUS_LABELS[s.status] ?? s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium" suppressHydrationWarning>
                        {formatCurrency(s.total)}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/sales/${s.id}`}
                          className="text-sm text-copper-light hover:underline inline-flex items-center gap-1"
                        >
                          <Receipt className="h-4 w-4" />
                          ნახვა
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
