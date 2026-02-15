import type { ImportType } from "./import-mapper";
import { IMPORT_FIELDS } from "./import-mapper";

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  validCount: number;
  invalidCount: number;
  errors: ValidationError[];
}

const UNITS = ["piece", "kg", "g", "l", "ml", "m", "cm", "box", "pack"];

function parseNum(v: string): number {
  const n = parseFloat(String(v).replace(",", "."));
  return isNaN(n) ? 0 : n;
}

function isValidEmail(v: string): boolean {
  if (!v.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export function validateRows(
  rows: Record<string, string>[],
  mapping: Record<string, string>,
  type: ImportType,
  existingSkus?: Set<string>,
  existingBarcodes?: Set<string>,
  existingEmails?: Set<string>,
  existingPhones?: Set<string>
): ValidationResult {
  const fields = IMPORT_FIELDS[type];
  const required = fields.filter((f) => f.required).map((f) => f.key);
  const errors: ValidationError[] = [];
  const seenSkus = new Set<string>();
  const seenBarcodes = new Set<string>();
  const seenEmails = new Set<string>();
  const seenPhones = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const rowNum = i + 2; // 1-based + header
    const getVal = (key: string) => {
      const col = mapping[key];
      return col ? (row[col] ?? "").trim() : "";
    };

    for (const key of required) {
      const val = getVal(key);
      if (!val) {
        errors.push({ row: rowNum, field: key, message: `${key === "sku" ? "SKU" : key === "name" ? "სახელი" : key === "firstName" ? "სახელი" : key} სავალდებულოა` });
      }
    }

    if (type === "products") {
      const sku = getVal("sku");
      if (sku) {
        if (seenSkus.has(sku)) {
          errors.push({ row: rowNum, field: "sku", message: `SKU "${sku}" დუბლირდება ფაილში` });
        } else seenSkus.add(sku);
        if (existingSkus?.has(sku)) {
          // Allow update - no error
        }
      }
      const barcode = getVal("barcode");
      if (barcode) {
        if (seenBarcodes.has(barcode)) {
          errors.push({ row: rowNum, field: "barcode", message: `ბარკოდი "${barcode}" დუბლირდება ფაილში` });
        } else seenBarcodes.add(barcode);
        if (existingBarcodes?.has(barcode)) {
          errors.push({ row: rowNum, field: "barcode", message: `ბარკოდი "${barcode}" უკვე არსებობს` });
        }
      }
      const sellingPrice = parseNum(getVal("sellingPrice"));
      if (getVal("sellingPrice") && sellingPrice <= 0) {
        errors.push({ row: rowNum, field: "sellingPrice", message: "გასაყიდი ფასი უნდა იყოს 0-ზე მეტი" });
      }
      const unit = getVal("unit");
      if (unit && !UNITS.includes(unit.toLowerCase())) {
        errors.push({ row: rowNum, field: "unit", message: `ერთეული "${unit}" არასწორია. დაშვებული: ${UNITS.join(", ")}` });
      }
    }

    if (type === "customers" || type === "suppliers") {
      const email = getVal("email");
      if (email && !isValidEmail(email)) {
        errors.push({ row: rowNum, field: "email", message: "არასწორი email ფორმატი" });
      }
      if (type === "customers" && email && existingEmails?.has(email.toLowerCase())) {
        errors.push({ row: rowNum, field: "email", message: `Email "${email}" უკვე არსებობს` });
      }
      if (type === "customers" && getVal("phone") && existingPhones?.has(getVal("phone"))) {
        errors.push({ row: rowNum, field: "phone", message: "ტელეფონი უკვე არსებობს" });
      }
    }
  }

  const invalidRows = new Set(errors.map((e) => e.row));
  const validCount = rows.length - invalidRows.size;
  return {
    valid: errors.length === 0,
    validCount,
    invalidCount: invalidRows.size,
    errors,
  };
}

export function formatValidationError(e: ValidationError): string {
  return `ხაზი ${e.row}: ${e.message}`;
}
