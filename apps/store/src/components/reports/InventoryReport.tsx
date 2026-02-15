"use client";

import { useEffect, useState } from "react";
import { getInventoryValue, getInventoryOverview } from "@/lib/store-actions";
import { Button } from "@saas-platform/ui";
import { formatCurrency } from "@/lib/format";
import { exportToCsv, exportToExcel } from "@/lib/export/utils";

export function InventoryReport() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getInventoryValue>> | null>(null);

  useEffect(() => {
    getInventoryValue().then(setData);
  }, []);

  if (!data) {
    return (
      <div className="py-12 text-center text-text-muted">იტვირთება...</div>
    );
  }

  const turnover =
    data.totalCost > 0
      ? ((data.totalRetail - data.totalCost) / data.totalCost * 100).toFixed(1)
      : "—";

  const summaryData = [{
    "ღირებულებით (₾)": data.totalCost.toFixed(2),
    "რეტეილფასზე (₾)": data.totalRetail.toFixed(2),
    "პროდუქტების რაოდენობა": data.productCount,
  }];

  const handleFullExport = async (format: "csv" | "excel") => {
    const overview = await getInventoryOverview();
    const costPrice = (p: { costPrice: unknown; currentStock: number }) =>
      Number(p.costPrice) * p.currentStock;
    const exportData = overview.map((p) => ({
      "სახელი": p.nameKa || p.name,
      "SKU": p.sku,
      "კატეგორია": p.category?.name ?? "",
      "მარაგი": p.currentStock,
      "ღირებულება (მარაგი×ღირებულება)": costPrice(p).toFixed(2),
      "ფასი": Number(p.sellingPrice).toFixed(2),
    }));
    if (format === "csv") exportToCsv(exportData, "maragi-detalurad.csv");
    else exportToExcel(exportData, "maragi-detalurad.xlsx", "მარაგი");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => exportToCsv(summaryData, "maragi.csv")}>CSV (შეჯამება)</Button>
        <Button variant="outline" size="sm" onClick={() => exportToExcel(summaryData, "maragi.xlsx", "შეჯამება")}>Excel (შეჯამება)</Button>
        <Button variant="outline" size="sm" onClick={() => handleFullExport("csv")}>CSV (დეტალური)</Button>
        <Button variant="outline" size="sm" onClick={() => handleFullExport("excel")}>Excel (დეტალური)</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-bg-secondary p-6">
          <p className="text-sm text-text-muted">მარაგის ღირებულება (ღირებულება)</p>
          <p className="text-2xl font-bold text-text-primary mt-1" suppressHydrationWarning>
            {formatCurrency(data.totalCost)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-bg-secondary p-6">
          <p className="text-sm text-text-muted">მარაგის ღირებულება (რეტეილფასზე)</p>
          <p className="text-2xl font-bold text-copper-light mt-1" suppressHydrationWarning>
            {formatCurrency(data.totalRetail)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-bg-secondary p-6">
          <p className="text-sm text-text-muted">მარჟა / ბრუნვა (%)</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{turnover}%</p>
        </div>
      </div>
      <p className="text-sm text-text-muted">
        პროდუქტების რაოდენობა: {data.productCount}
      </p>
    </div>
  );
}
