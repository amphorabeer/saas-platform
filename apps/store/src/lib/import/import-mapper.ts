export type ImportType = "products" | "categories" | "suppliers" | "customers";

export const IMPORT_TYPE_LABELS: Record<ImportType, string> = {
  products: "პროდუქტები",
  categories: "კატეგორიები",
  suppliers: "მომწოდებლები",
  customers: "მომხმარებლები",
};

export interface FieldOption {
  key: string;
  label: string;
  required?: boolean;
}

export const IMPORT_FIELDS: Record<ImportType, FieldOption[]> = {
  products: [
    { key: "name", label: "სახელი", required: true },
    { key: "nameKa", label: "სახელი (ქართულად)" },
    { key: "sku", label: "SKU", required: true },
    { key: "barcode", label: "ბარკოდი" },
    { key: "categoryName", label: "კატეგორია" },
    { key: "costPrice", label: "შესყიდვის ფასი" },
    { key: "sellingPrice", label: "გასაყიდი ფასი" },
    { key: "wholesalePrice", label: "საბითუმო ფასი" },
    { key: "currentStock", label: "მარაგი" },
    { key: "minStock", label: "მინ. მარაგი" },
    { key: "unit", label: "ერთეული" },
    { key: "description", label: "აღწერა" },
  ],
  categories: [
    { key: "name", label: "სახელი", required: true },
    { key: "nameKa", label: "სახელი (ქართულად)" },
    { key: "parentCategoryName", label: "მშობელი კატეგორია" },
    { key: "description", label: "აღწერა" },
  ],
  suppliers: [
    { key: "name", label: "სახელი", required: true },
    { key: "contactPerson", label: "საკონტაქტო პირი" },
    { key: "email", label: "Email" },
    { key: "phone", label: "ტელეფონი" },
    { key: "address", label: "მისამართი" },
    { key: "taxId", label: "საიდენტიფიკაციო კოდი" },
  ],
  customers: [
    { key: "firstName", label: "სახელი", required: true },
    { key: "lastName", label: "გვარი" },
    { key: "phone", label: "ტელეფონი" },
    { key: "email", label: "Email" },
    { key: "address", label: "მისამართი" },
    { key: "taxId", label: "საიდენტიფიკაციო კოდი" },
    { key: "notes", label: "შენიშვნა" },
  ],
};

/** Map source row to target object using column mapping */
export function mapRow(
  row: Record<string, string>,
  mapping: Record<string, string>,
  targetKeys: string[]
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of targetKeys) {
    const sourceCol = mapping[key];
    const val = sourceCol ? (row[sourceCol] ?? "").trim() : "";
    result[key] = val;
  }
  return result;
}
