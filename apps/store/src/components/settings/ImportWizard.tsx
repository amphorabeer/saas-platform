"use client";

import { useState, useCallback } from "react";
import { Upload, FileSpreadsheet, ChevronRight, ChevronLeft, Check, AlertCircle } from "lucide-react";
import { parseCsvFile } from "@/lib/import/csv-parser";
import { parseExcelFile } from "@/lib/import/excel-parser";
import {
  IMPORT_TYPE_LABELS,
  IMPORT_FIELDS,
  type ImportType,
} from "@/lib/import/import-mapper";
import { validateRows, formatValidationError } from "@/lib/import/import-validator";
import {
  importProductsFromData,
  importCategoriesFromData,
  importSuppliersFromData,
  importCustomersFromData,
} from "@/lib/import/import-actions";
import { downloadCsvTemplate, downloadExcelTemplate } from "@/lib/import/templates";
import { Button } from "@saas-platform/ui";

const STEPS = [
  { id: 1, label: "ფაილის ატვირთვა" },
  { id: 2, label: "ტიპის არჩევა" },
  { id: 3, label: "სვეტების მაპინგი" },
  { id: 4, label: "შემოწმება" },
  { id: 5, label: "იმპორტი" },
];

export function ImportWizard() {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<ImportType>("products");
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [validation, setValidation] = useState<{
    valid: boolean;
    validCount: number;
    invalidCount: number;
    errors: { row: number; field: string; message: string }[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    updated: number;
    errors: string[];
  } | null>(null);
  const [history, setHistory] = useState<{ date: string; type: string; imported: number; errors: number }[]>([]);

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setResult(null);
    const ext = f.name.toLowerCase().split(".").pop();
    if (ext === "csv" || ext === "txt") {
      const res = await parseCsvFile(f);
      setRows(res.data);
      setColumns(res.columns);
      setMapping({});
    } else if (ext === "xlsx" || ext === "xls") {
      const res = await parseExcelFile(f);
      setRows(res.data);
      setColumns(res.columns);
      setMapping({});
    }
    setStep(2);
  }, []);

  const runValidation = useCallback(() => {
    const val = validateRows(rows, mapping, importType);
    setValidation(val);
    setStep(4);
  }, [rows, mapping, importType]);

  const runImport = async () => {
    setLoading(true);
    setResult(null);
    let res:
      | { success: true; imported: number; updated: number; errors: string[] }
      | { success: false; error: string };
    switch (importType) {
      case "products":
        res = await importProductsFromData(rows, mapping);
        break;
      case "categories":
        res = await importCategoriesFromData(rows, mapping);
        break;
      case "suppliers":
        res = await importSuppliersFromData(rows, mapping);
        break;
      case "customers":
        res = await importCustomersFromData(rows, mapping);
        break;
      default:
        res = { success: false, error: "უცნობი ტიპი" };
    }
    setLoading(false);
    if (res.success) {
      setResult({ imported: res.imported, updated: res.updated ?? 0, errors: res.errors });
      setHistory((h) => [
        { date: new Date().toLocaleString("ka-GE"), type: IMPORT_TYPE_LABELS[importType], imported: res.imported + (res.updated ?? 0), errors: res.errors.length },
        ...h.slice(0, 9),
      ]);
    } else {
      setResult({ imported: 0, updated: 0, errors: [res.error] });
    }
  };

  const fields = IMPORT_FIELDS[importType];
  const previewRows = rows.slice(0, 3);

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Step indicator */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2 shrink-0">
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${
                step >= s.id ? "bg-copper/20 text-copper-light" : "bg-bg-tertiary text-text-muted"
              }`}
            >
              <span className="w-6 h-6 rounded-full flex items-center justify-center bg-current/30 text-xs">
                {step > s.id ? <Check className="w-3 h-3" /> : s.id}
              </span>
              {s.label}
            </div>
            {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-text-muted" />}
          </div>
        ))}
      </div>

      {/* Step 1: File upload */}
      {step === 1 && (
        <div
          className="border-2 border-dashed border-border rounded-2xl p-12 text-center hover:border-copper/50 transition-colors cursor-pointer"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f && /\.(csv|xlsx|xls|txt)$/i.test(f.name)) handleFile(f);
          }}
          onClick={() => document.getElementById("import-file-input")?.click()}
        >
          <input
            id="import-file-input"
            type="file"
            accept=".csv,.xlsx,.xls,.txt"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <Upload className="w-12 h-12 mx-auto text-text-muted mb-4" />
          <p className="text-lg font-medium text-text">გადაათრიეთ ფაილი აქ ან დააჭირეთ ასარჩევად</p>
          <p className="text-sm text-text-muted mt-1">მხარდაჭერილი: .csv, .xlsx, .xls</p>
        </div>
      )}

      {/* Step 2: Import type */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">იმპორტის ტიპი</label>
            <select
              value={importType}
              onChange={(e) => {
                setImportType(e.target.value as ImportType);
                setMapping({});
              }}
              className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary"
            >
              {(Object.keys(IMPORT_TYPE_LABELS) as ImportType[]).map((t) => (
                <option key={t} value={t}>{IMPORT_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <p className="text-sm text-text-muted">
            ფაილი: {file?.name} — {rows.length} რიგი
          </p>
          <div className="flex gap-2">
            <Button onClick={() => setStep(3)}>შემდეგი</Button>
            <Button variant="outline" onClick={() => setStep(1)}>უკან</Button>
          </div>
        </div>
      )}

      {/* Step 3: Column mapping */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-bg-tertiary p-4 overflow-x-auto">
            <h3 className="font-medium mb-4">სვეტების მაპინგი</h3>
            <p className="text-sm text-text-muted mb-4">აირჩიეთ ფაილის სვეტი თითოეული სისტემის ველისთვის</p>
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left py-2 pr-4">სისტემის ველი</th>
                  <th className="text-left py-2">ფაილის სვეტი</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((f) => (
                  <tr key={f.key}>
                    <td className="py-2 pr-4">
                      {f.label} {f.required && <span className="text-red-400">*</span>}
                    </td>
                    <td>
                      <select
                        value={mapping[f.key] ?? ""}
                        onChange={(e) => setMapping((m) => ({ ...m, [f.key]: e.target.value }))}
                        className="w-full max-w-xs rounded border border-border bg-bg-secondary px-3 py-1.5"
                      >
                        <option value="">— არა —</option>
                        {columns.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-xl border border-border p-4 max-h-40 overflow-auto">
            <h4 className="text-sm font-medium mb-2">პრევიუ (პირველი 3 რიგი)</h4>
            <table className="w-full text-xs">
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c} className="text-left py-1 pr-2 border-b border-border">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((r, i) => (
                  <tr key={i}>
                    {columns.map((c) => (
                      <td key={c} className="py-1 pr-2 truncate max-w-[120px]">{r[c] ?? ""}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <Button onClick={runValidation}>შემოწმება</Button>
            <Button variant="outline" onClick={() => setStep(2)}>უკან</Button>
          </div>
        </div>
      )}

      {/* Step 4: Validation preview */}
      {step === 4 && validation && (
        <div className="space-y-6">
          <div className={`rounded-xl border p-4 flex items-center gap-4 ${
            validation.valid ? "bg-green-500/10 border-green-500/30" : "bg-amber-500/10 border-amber-500/30"
          }`}>
            {validation.valid ? (
              <Check className="w-8 h-8 text-green-500" />
            ) : (
              <AlertCircle className="w-8 h-8 text-amber-500" />
            )}
            <div>
              <p className="font-medium">
                ვალიდური: {validation.validCount} / {rows.length}
              </p>
              {validation.invalidCount > 0 && (
                <p className="text-sm text-text-muted">შეცდომები: {validation.errors.length}</p>
              )}
            </div>
          </div>
          {validation.errors.length > 0 && (
            <div className="rounded-xl border border-border p-4 max-h-48 overflow-auto">
              <h4 className="font-medium mb-2">შეცდომების დეტალები</h4>
              <ul className="text-sm space-y-1">
                {validation.errors.slice(0, 20).map((e, i) => (
                  <li key={i} className="text-red-400">{formatValidationError(e)}</li>
                ))}
                {validation.errors.length > 20 && (
                  <li className="text-text-muted">... და კიდევ {validation.errors.length - 20}</li>
                )}
              </ul>
            </div>
          )}
          <div className="flex gap-2">
            <Button
              onClick={() => { setStep(5); runImport(); }}
              disabled={validation.validCount === 0}
            >
              იმპორტის გაშვება
            </Button>
            <Button variant="outline" onClick={() => setStep(3)}>უკან</Button>
          </div>
        </div>
      )}

      {/* Step 5: Import execution / result */}
      {step === 5 && (
        <div className="space-y-6">
          {loading ? (
            <div className="rounded-xl border border-border p-8 text-center">
              <div className="animate-pulse">იმპორტირდება...</div>
              <div className="mt-4 h-2 bg-bg-tertiary rounded overflow-hidden">
                <div className="h-full bg-copper/50 animate-pulse w-2/3" />
              </div>
            </div>
          ) : result ? (
            <div className={`rounded-xl border p-4 ${
              result.errors.length && !result.imported && !result.updated
                ? "bg-red-500/10 border-red-500/30"
                : "bg-bg-tertiary border-border"
            }`}>
              <p className="font-medium">
                იმპორტირებული: {result.imported + result.updated} (ახალი: {result.imported}, განახლებული: {result.updated})
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
          ) : null}
          <div className="flex gap-2">
            <Button onClick={() => { setStep(1); setFile(null); setRows([]); setResult(null); }}>
              ახალი იმპორტი
            </Button>
          </div>
        </div>
      )}

      {/* Template downloads */}
      <div className="rounded-xl border border-border p-6">
        <h3 className="font-medium mb-4">შაბლონის ჩამოტვირთვა</h3>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(IMPORT_TYPE_LABELS) as ImportType[]).map((t) => (
            <div key={t} className="flex gap-2">
              <button
                type="button"
                onClick={() => downloadCsvTemplate(t)}
                className="flex items-center gap-2 rounded-lg border border-border bg-bg-tertiary px-4 py-2 text-sm hover:bg-bg-secondary"
              >
                <FileSpreadsheet className="w-4 h-4" />
                CSV — {IMPORT_TYPE_LABELS[t]}
              </button>
              <button
                type="button"
                onClick={() => downloadExcelTemplate(t)}
                className="flex items-center gap-2 rounded-lg border border-border bg-bg-tertiary px-4 py-2 text-sm hover:bg-bg-secondary"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Excel — {IMPORT_TYPE_LABELS[t]}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Import history */}
      {history.length > 0 && (
        <div className="rounded-xl border border-border p-6">
          <h3 className="font-medium mb-4">იმპორტის ისტორია</h3>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left py-2 text-text-muted font-normal">თარიღი</th>
                <th className="text-left py-2 text-text-muted font-normal">ტიპი</th>
                <th className="text-left py-2 text-text-muted font-normal">იმპორტირებული</th>
                <th className="text-left py-2 text-text-muted font-normal">შეცდომები</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={i}>
                  <td className="py-2">{h.date}</td>
                  <td className="py-2">{h.type}</td>
                  <td className="py-2">{h.imported}</td>
                  <td className="py-2">{h.errors}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
