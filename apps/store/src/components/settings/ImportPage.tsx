"use client";

import { useState, useCallback } from "react";
import Papa from "papaparse";
import {
  importProducts,
  importCategories,
  importSuppliers,
  importCustomers,
} from "@/lib/store-actions";
import { Button } from "@saas-platform/ui";

type ImportType = "products" | "categories" | "suppliers" | "customers";

const TYPE_LABELS: Record<ImportType, string> = {
  products: "პროდუქტები",
  categories: "კატეგორიები",
  suppliers: "მომწოდებლები",
  customers: "მომხმარებლები",
};

const FIELD_OPTIONS: Record<ImportType, { key: string; label: string; required?: boolean }[]> = {
  products: [
    { key: "name", label: "სახელი", required: true },
    { key: "sku", label: "SKU", required: true },
    { key: "costPrice", label: "შესყიდვის ფასი" },
    { key: "sellingPrice", label: "გასაყიდი ფასი" },
    { key: "barcode", label: "ბარკოდი" },
    { key: "nameKa", label: "სახელი (ქართულად)" },
    { key: "currentStock", label: "მარაგი" },
  ],
  categories: [
    { key: "name", label: "სახელი", required: true },
    { key: "nameKa", label: "სახელი (ქართულად)" },
  ],
  suppliers: [
    { key: "name", label: "სახელი", required: true },
    { key: "contactPerson", label: "საკონტაქტო პირი" },
    { key: "phone", label: "ტელეფონი" },
    { key: "email", label: "Email" },
    { key: "address", label: "მისამართი" },
  ],
  customers: [
    { key: "firstName", label: "სახელი", required: true },
    { key: "lastName", label: "გვარი" },
    { key: "phone", label: "ტელეფონი" },
    { key: "email", label: "Email" },
    { key: "address", label: "მისამართი" },
  ],
};

export function ImportPage() {
  const [importType, setImportType] = useState<ImportType>("products");
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    errors: string[];
  } | null>(null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setResult(null);
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (res: Papa.ParseResult<Record<string, string>>) => {
          const data = res.data.filter((r: Record<string, string>) => Object.keys(r).some((k) => r[k]?.trim()));
          setRows(data);
          const cols = data.length ? (Array.from(new Set(data.flatMap((r: Record<string, string>) => Object.keys(r)))) as string[]) : [];
          setColumns(cols);
          setMapping({});
        },
      });
    },
    []
  );

  const runImport = async () => {
    if (!rows.length) return;
    setLoading(true);
    setResult(null);
    let res:
      | { success: true; imported: number; errors: string[] }
      | { success: false; error: string };
    switch (importType) {
      case "products":
        res = await importProducts({ rows, mapping });
        break;
      case "categories":
        res = await importCategories({ rows, mapping });
        break;
      case "suppliers":
        res = await importSuppliers({ rows, mapping });
        break;
      case "customers":
        res = await importCustomers({ rows, mapping });
        break;
      default:
        res = { success: false, error: "უცნობი ტიპი" };
    }
    setLoading(false);
    if (res.success) {
      setResult({ imported: res.imported, errors: res.errors });
    } else {
      setResult({ imported: 0, errors: [res.error] });
    }
  };

  const fields = FIELD_OPTIONS[importType];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">იმპორტის ტიპი</label>
        <select
          value={importType}
          onChange={(e) => {
            setImportType(e.target.value as ImportType);
            setRows([]);
            setColumns([]);
            setMapping({});
            setResult(null);
          }}
          className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary"
        >
          {(Object.keys(TYPE_LABELS) as ImportType[]).map((t) => (
            <option key={t} value={t}>{TYPE_LABELS[t]}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">CSV ფაილი</label>
        <input
          type="file"
          accept=".csv,.txt"
          onChange={handleFileChange}
          className="block w-full text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border file:border-border file:bg-bg-tertiary file:text-text-primary"
        />
      </div>
      {columns.length > 0 && (
        <>
          <div className="rounded-xl border border-border p-4 bg-bg-tertiary space-y-4">
            <h3 className="font-medium">სვეტების მაპინგი</h3>
            <p className="text-sm text-text-muted">
              აირჩიეთ CSV-ის ველი თითოეული სისტემის ველისთვის.
            </p>
            <div className="space-y-3">
              {fields.map((f) => (
                <div key={f.key} className="flex items-center gap-4">
                  <span className="w-40 text-sm font-medium">
                    {f.label} {f.required && "*"}
                  </span>
                  <select
                    value={mapping[f.key] ?? ""}
                    onChange={(e) =>
                      setMapping((m) => ({
                        ...m,
                        [f.key]: e.target.value,
                      }))
                    }
                    className="flex-1 rounded-lg border border-border bg-bg-secondary px-4 py-2 text-text-primary"
                  >
                    <option value="">— არა —</option>
                    {columns.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={runImport} disabled={loading}>
              {loading ? "იტვირთება..." : "იმპორტი"}
            </Button>
            <span className="text-sm text-text-muted">
              {rows.length} რიგი იმპორტისთვის
            </span>
          </div>
        </>
      )}
      {result && (
        <div
          className={`rounded-xl border p-4 ${
            result.errors.length && !result.imported
              ? "bg-red-500/10 border-red-500/30"
              : "bg-bg-tertiary border-border"
          }`}
        >
          <p className="font-medium">
            იმპორტირებული: {result.imported} / {rows.length}
          </p>
          {result.errors.length > 0 && (
            <ul className="mt-2 text-sm text-text-muted space-y-1 max-h-40 overflow-y-auto">
              {result.errors.slice(0, 20).map((err, i) => (
                <li key={i}>{err}</li>
              ))}
              {result.errors.length > 20 && (
                <li>... და კიდევ {result.errors.length - 20} შეცდომა</li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
