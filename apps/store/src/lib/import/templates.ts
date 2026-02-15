import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import type { ImportType } from "./import-mapper";
import { IMPORT_FIELDS } from "./import-mapper";

const TEMPLATE_HEADERS: Record<ImportType, Record<string, string>> = {
  products: {
    name: "სახელი",
    nameKa: "სახელი (ქართულად)",
    sku: "SKU",
    barcode: "ბარკოდი",
    categoryName: "კატეგორია",
    costPrice: "შესყიდვის ფასი",
    sellingPrice: "გასაყიდი ფასი",
    wholesalePrice: "საბითუმო ფასი",
    currentStock: "მარაგი",
    minStock: "მინ. მარაგი",
    unit: "ერთეული",
    description: "აღწერა",
  },
  categories: {
    name: "სახელი",
    nameKa: "სახელი (ქართულად)",
    parentCategoryName: "მშობელი კატეგორია",
    description: "აღწერა",
  },
  suppliers: {
    name: "სახელი",
    contactPerson: "საკონტაქტო პირი",
    email: "Email",
    phone: "ტელეფონი",
    address: "მისამართი",
    taxId: "საიდენტიფიკაციო კოდი",
  },
  customers: {
    firstName: "სახელი",
    lastName: "გვარი",
    phone: "ტელეფონი",
    email: "Email",
    address: "მისამართი",
    taxId: "საიდენტიფიკაციო კოდი",
    notes: "შენიშვნა",
  },
};

export function downloadCsvTemplate(type: ImportType) {
  const headers = TEMPLATE_HEADERS[type];
  const keys = Object.keys(headers);
  const csv = "\uFEFF" + Object.values(headers).join(",") + "\n";
  saveAs(new Blob([csv], { type: "text/csv;charset=utf-8" }), `შაბლონი_${type}_ქართული.csv`);
}

export function downloadExcelTemplate(type: ImportType) {
  const headers = TEMPLATE_HEADERS[type];
  const keys = Object.keys(headers);
  const wsData = [Object.values(headers)];
  if (type === "products") {
    wsData.push(["მაგალითი", "ნიმუში", "SKU-001", "123456", "საკვები", "10", "15", "12", "100", "5", "piece", ""]);
  }
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws["!cols"] = keys.map(() => ({ wch: 18 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "შაბლონი");
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `შაბლონი_${type}_ქართული.xlsx`);
}
