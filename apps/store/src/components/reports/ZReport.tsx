"use client";

import { useState, useRef } from "react";
import { generateZReport, type ZReportData } from "@/lib/store-actions";
import { Button } from "@saas-platform/ui";
import { formatDate, formatCurrency } from "@/lib/format";
import { Printer } from "lucide-react";

export function ZReport() {
  const [dateFrom, setDateFrom] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [dateTo, setDateTo] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [data, setData] = useState<ZReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handleFetch = async () => {
    setLoading(true);
    const res = await generateZReport({
      startDate: dateFrom,
      endDate: dateTo,
    });
    setData(res ?? null);
    setLoading(false);
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    const printContent = printRef.current.innerHTML;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.print();
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Z რეპორტი</title>
          <style>
            body { font-family: sans-serif; padding: 20px; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 6px 8px; text-align: left; border-bottom: 1px solid #ddd; }
            th { font-weight: 600; }
            .text-right { text-align: right; }
            .mt-4 { margin-top: 16px; }
            .font-bold { font-weight: 700; }
            h2 { margin: 0 0 16px 0; font-size: 16px; }
          </style>
        </head>
        <body>${printContent}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs text-text-muted mb-1">დან</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-border bg-bg-tertiary px-4 py-2 text-text-primary"
          />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">მდე</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-border bg-bg-tertiary px-4 py-2 text-text-primary"
          />
        </div>
        <Button onClick={handleFetch} disabled={loading}>
          {loading ? "იტვირთება..." : "რეპორტის გენერაცია"}
        </Button>
        {data && (
          <Button
            variant="outline"
            onClick={handlePrint}
            className="flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            ბეჭდვა
          </Button>
        )}
      </div>

      {data && (
        <div
          ref={printRef}
          className="rounded-xl border border-border bg-bg-secondary overflow-hidden print:border-0 print:shadow-none"
        >
          <div className="p-6 space-y-6">
            <div className="text-center border-b border-border pb-4">
              <h2 className="text-xl font-bold text-copper-light">Z რეპორტი</h2>
              <p className="text-sm text-text-muted mt-1">
                {formatDate(data.startDate)} — {formatDate(data.endDate)}
              </p>
              <p className="text-xs text-text-muted mt-1">
                გენერირებული: {formatDate(new Date())}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-lg bg-bg-tertiary p-4">
                <p className="text-xs text-text-muted">გაყიდვების რაოდენობა</p>
                <p className="text-lg font-semibold" suppressHydrationWarning>
                  {data.totalSalesCount}
                </p>
              </div>
              <div className="rounded-lg bg-bg-tertiary p-4">
                <p className="text-xs text-text-muted">მთლიანი გაყიდვები</p>
                <p className="text-lg font-semibold text-copper-light" suppressHydrationWarning>
                  {formatCurrency(data.totalSalesAmount)}
                </p>
              </div>
              <div className="rounded-lg bg-bg-tertiary p-4">
                <p className="text-xs text-text-muted">წმინდა გაყიდვები</p>
                <p className="text-lg font-semibold text-copper-light" suppressHydrationWarning>
                  {formatCurrency(data.netSales)}
                </p>
              </div>
              <div className="rounded-lg bg-bg-tertiary p-4">
                <p className="text-xs text-text-muted">საშუალო ჩეკი</p>
                <p className="text-lg font-semibold" suppressHydrationWarning>
                  {formatCurrency(data.averageCheck)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-text-secondary mb-2">
                  გადახდის მეთოდები
                </h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left py-2">მეთოდი</th>
                      <th className="text-right py-2">თანხა</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byPaymentMethod.map((pm) => (
                      <tr key={pm.method} className="border-t border-border">
                        <td className="py-2">{pm.label}</td>
                        <td className="py-2 text-right" suppressHydrationWarning>
                          {formatCurrency(pm.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <h3 className="text-sm font-medium text-text-secondary mb-2">
                  დაბრუნებები
                </h3>
                <p className="text-sm">
                  <span className="text-text-muted">რაოდენობა: </span>
                  <span className="font-medium">{data.returnsCount}</span>
                </p>
                <p className="text-sm mt-1">
                  <span className="text-text-muted">თანხა: </span>
                  <span className="font-medium text-red-400" suppressHydrationWarning>
                    {formatCurrency(data.returnsAmount)}
                  </span>
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-text-secondary mb-2">
                ტოპ 10 გაყიდვადი პროდუქტი
              </h3>
              <div className="max-h-60 overflow-y-auto border border-border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-bg-tertiary sticky top-0">
                    <tr>
                      <th className="text-left py-2 px-4">პროდუქტი</th>
                      <th className="text-right py-2 px-4">რაოდენობა</th>
                      <th className="text-right py-2 px-4">შემოსავალი</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topProducts.map((p) => (
                      <tr key={p.productId} className="border-t border-border">
                        <td className="py-2 px-4">
                          {p.nameKa || p.productName}
                        </td>
                        <td className="py-2 px-4 text-right">{p.quantity}</td>
                        <td className="py-2 px-4 text-right" suppressHydrationWarning>
                          {formatCurrency(p.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-text-secondary mb-2">
                გაყიდვები კატეგორიების მიხედვით
              </h3>
              <div className="max-h-48 overflow-y-auto border border-border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-bg-tertiary sticky top-0">
                    <tr>
                      <th className="text-left py-2 px-4">კატეგორია</th>
                      <th className="text-right py-2 px-4">შემოსავალი</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byCategory.map((c) => (
                      <tr key={c.categoryId} className="border-t border-border">
                        <td className="py-2 px-4">
                          {c.nameKa || c.categoryName}
                        </td>
                        <td className="py-2 px-4 text-right" suppressHydrationWarning>
                          {formatCurrency(c.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {data && data.totalSalesCount === 0 && (
        <p className="text-text-muted">ამ პერიოდში გაყიდვები ვერ მოიძებნა</p>
      )}
    </div>
  );
}
