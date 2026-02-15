"use client";

import Link from "next/link";
import { Button } from "@saas-platform/ui";
import { FormattedDate } from "@/components/ui/FormattedDate";
import { formatCurrency } from "@/lib/format";
import { ArrowLeft, Printer } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  COMPLETED: "დასრულებული",
  VOIDED: "გაუქმებული",
  REFUNDED: "დაბრუნებული",
  PARTIAL_REFUND: "ნაწილობრივ დაბრუნებული",
};

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "ნაღდი",
  CARD: "ბარათი",
  BANK_TRANSFER: "ბანკის გადარიცხვა",
  CHECK: "ჩეკი",
};

interface SaleDetailViewProps {
  sale: NonNullable<Awaited<ReturnType<typeof import("@/lib/store-actions").getSaleById>>>;
}

export function SaleDetailView({ sale }: SaleDetailViewProps) {
  const handleReprint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/sales">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            უკან
          </Button>
        </Link>
        <Button variant="outline" size="sm" onClick={handleReprint}>
          <Printer className="h-4 w-4 mr-1" />
          ჩეკის ხელახლა ბეჭდვა
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-bg-secondary p-6 print:border-0 print:shadow-none">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <p className="text-xs text-text-muted uppercase">შეკვეთის ნომერი</p>
            <p className="font-semibold">{sale.saleNumber}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted uppercase">თარიღი</p>
            <p suppressHydrationWarning><FormattedDate date={sale.createdAt} showTime /></p>
          </div>
          <div>
            <p className="text-xs text-text-muted uppercase">სტატუსი</p>
            <p>{STATUS_LABELS[sale.status] ?? sale.status}</p>
          </div>
          {sale.customer && (
            <div>
              <p className="text-xs text-text-muted uppercase">მომხმარებელი</p>
              <p>
                {sale.customer.firstName} {sale.customer.lastName ?? ""}
              </p>
              {sale.customer.phone && (
                <p className="text-sm text-text-muted">{sale.customer.phone}</p>
              )}
            </div>
          )}
          {sale.employee && (
            <div>
              <p className="text-xs text-text-muted uppercase">თანამშრომელი</p>
              <p>
                {sale.employee.firstName} {sale.employee.lastName}
              </p>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border overflow-hidden mb-6">
          <table className="w-full">
            <thead className="bg-bg-tertiary">
              <tr>
                <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">
                  პროდუქტი
                </th>
                <th className="text-right text-xs font-medium text-text-muted uppercase px-4 py-3">
                  რაოდენობა
                </th>
                <th className="text-right text-xs font-medium text-text-muted uppercase px-4 py-3">
                  ერთეულის ფასი
                </th>
                <th className="text-right text-xs font-medium text-text-muted uppercase px-4 py-3">
                  ჯამი
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sale.items.map((i) => (
                <tr key={i.id}>
                  <td className="px-4 py-3">
                    {i.product.nameKa || i.product.name}
                    <span className="ml-2 text-xs text-text-muted">{i.product.sku}</span>
                  </td>
                  <td className="px-4 py-3 text-right">{i.quantity}</td>
                  <td className="px-4 py-3 text-right" suppressHydrationWarning>
                    {formatCurrency(i.unitPrice)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium" suppressHydrationWarning>
                    {formatCurrency(i.total)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-bg-tertiary border-t border-border">
              {sale.discountAmount > 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-2 text-right text-text-muted">
                    ფასდაკლება
                  </td>
                  <td className="px-4 py-2 text-right" suppressHydrationWarning>
                    -{formatCurrency(sale.discountAmount)}
                  </td>
                </tr>
              )}
              <tr>
                <td colSpan={3} className="px-4 py-3 text-right font-medium">
                  სულ
                </td>
                <td className="px-4 py-3 text-right font-semibold text-copper-light" suppressHydrationWarning>
                  {formatCurrency(sale.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {sale.payments.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-text-secondary mb-2">გადახდები</h3>
            <div className="space-y-2">
              {sale.payments.map((p) => (
                <div
                  key={p.id}
                  className="flex justify-between py-2 border-b border-border last:border-0"
                >
                  <span className="text-text-muted">
                    {PAYMENT_LABELS[p.method] ?? p.method}
                  </span>
                  <span suppressHydrationWarning>
                    {formatCurrency(p.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {sale.returns.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-text-secondary mb-2">
              დაბრუნებები
            </h3>
            <div className="space-y-4">
              {sale.returns.map((r) => (
                <div
                  key={r.id}
                  className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20"
                >
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-text-muted">{r.reason}</span>
                    <span className="font-medium text-amber-400" suppressHydrationWarning>
                      -{formatCurrency(r.refundAmount)}
                    </span>
                  </div>
                  <ul className="text-sm text-text-muted space-y-1">
                    {r.items.map((ri) => (
                      <li key={ri.id}>
                        {ri.product.nameKa || ri.product.name} × {ri.quantity}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
