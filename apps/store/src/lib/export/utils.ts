import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

/** Export data to CSV with UTF-8 BOM for Georgian characters */
export function exportToCsv(
  data: Record<string, unknown>[],
  filename: string,
  columns?: string[]
) {
  if (data.length === 0) {
    const headers = columns ?? [];
    const csv = "\uFEFF" + headers.join(",") + "\n";
    saveAs(new Blob([csv], { type: "text/csv;charset=utf-8" }), filename);
    return;
  }
  const keys = columns ?? Object.keys(data[0] ?? {});
  const rows = data.map((row) =>
    keys.map((k) => {
      const v = row[k];
      const s = v == null ? "" : String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    }).join(",")
  );
  const csv = "\uFEFF" + keys.join(",") + "\n" + rows.join("\n");
  saveAs(new Blob([csv], { type: "text/csv;charset=utf-8" }), filename);
}

/** Export data to Excel with UTF-8, auto-width columns */
export function exportToExcel(
  data: Record<string, unknown>[],
  filename: string,
  sheetName = "ფურცელი 1"
) {
  const ws = XLSX.utils.json_to_sheet(data);
  const colWidths = Object.keys(data[0] ?? {}).map((_, i) => {
    const maxLen = Math.max(
      10,
      ...data.map((r) => String(Object.values(r)[i] ?? "").length)
    );
    return { wch: Math.min(maxLen, 50) };
  });
  ws["!cols"] = colWidths;
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), filename);
}
