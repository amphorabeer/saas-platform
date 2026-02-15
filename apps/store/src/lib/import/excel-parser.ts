import * as XLSX from "xlsx";

export interface ParseExcelResult {
  data: Record<string, string>[];
  columns: string[];
  sheetNames: string[];
  errors: string[];
}

export function parseExcelFile(file: File): Promise<ParseExcelResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data || !(data instanceof ArrayBuffer)) {
          resolve({ data: [], columns: [], sheetNames: [], errors: ["ფაილი ვერ იკითხება"] });
          return;
        }
        const workbook = XLSX.read(data, { type: "array", cellDates: true });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        if (!firstSheet) {
          resolve({ data: [], columns: [], sheetNames: workbook.SheetNames, errors: [] });
          return;
        }
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
          header: 1,
          defval: "",
          raw: false,
        }) as unknown[][];
        if (json.length < 2) {
          resolve({ data: [], columns: [], sheetNames: workbook.SheetNames, errors: [] });
          return;
        }
        const headers = (json[0] ?? []).map((h) => String(h ?? "").trim() || `სვეტი_${String(h)}`);
        const rows: Record<string, string>[] = [];
        for (let i = 1; i < json.length; i++) {
          const row = json[i] ?? [];
          const obj: Record<string, string> = {};
          for (let j = 0; j < headers.length; j++) {
            const val = row[j];
            obj[headers[j]!] = val != null ? String(val).trim() : "";
          }
          if (Object.values(obj).some((v) => v)) rows.push(obj);
        }
        resolve({
          data: rows,
          columns: headers,
          sheetNames: workbook.SheetNames,
          errors: [],
        });
      } catch (err) {
        resolve({
          data: [],
          columns: [],
          sheetNames: [],
          errors: [err instanceof Error ? err.message : "Excel ფაილის შეცდომა"],
        });
      }
    };
    reader.onerror = () =>
      resolve({ data: [], columns: [], sheetNames: [], errors: ["ფაილის ჩატვირთვის შეცდომა"] });
    reader.readAsArrayBuffer(file);
  });
}
