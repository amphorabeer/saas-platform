"use server";

import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultStore } from "../store";
import { revalidatePath } from "next/cache";

const BATCH_SIZE = 100;
const toDecimal = (v: number) => new Prisma.Decimal(Number(v));

export type ImportResult =
  | { success: true; imported: number; updated: number; errors: string[] }
  | { success: false; error: string };

function getVal(row: Record<string, string>, key: string, mapping: Record<string, string>): string {
  const col = mapping[key];
  return col ? (row[col] ?? "").trim() : "";
}

function parseNum(v: string): number {
  const n = parseFloat(String(v).replace(",", "."));
  return isNaN(n) ? 0 : n;
}

export async function importProductsFromData(
  data: Record<string, string>[],
  mapping: Record<string, string>
): Promise<ImportResult> {
  try {
    const storeId = await getOrCreateDefaultStore();
    const errors: string[] = [];
    let imported = 0;
    let updated = 0;

    for (let b = 0; b < data.length; b += BATCH_SIZE) {
      const batch = data.slice(b, b + BATCH_SIZE);
      for (let i = 0; i < batch.length; i++) {
        const row = batch[i]!;
        const rowNum = b + i + 2;
        const get = (k: string) => getVal(row, k, mapping);

        const name = get("name");
        const sku = get("sku");
        if (!name || !sku) {
          errors.push(`ხაზი ${rowNum}: სახელი და SKU სავალდებულოა`);
          continue;
        }

        const costPrice = parseNum(get("costPrice")) || 0;
        const sellingPrice = parseNum(get("sellingPrice")) || 0;
        if (sellingPrice <= 0) {
          errors.push(`ხაზი ${rowNum}: გასაყიდი ფასი უნდა იყოს 0-ზე მეტი`);
          continue;
        }

        try {
          let categoryId: string | null = null;
          const categoryName = get("categoryName");
          if (categoryName) {
            const slug = categoryName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9ა-ჰ-]/g, "-");
            let cat = await prisma.productCategory.findFirst({ where: { storeId, slug } });
            if (!cat) {
              cat = await prisma.productCategory.create({
                data: {
                  storeId,
                  name: categoryName,
                  nameKa: categoryName,
                  slug: slug || `cat-${Date.now()}`,
                },
              });
            }
            categoryId = cat.id;
          }

          const existing = await prisma.storeProduct.findUnique({
            where: { storeId_sku: { storeId, sku } },
          });

          if (existing) {
            await prisma.storeProduct.update({
              where: { id: existing.id },
              data: {
                name,
                nameKa: get("nameKa") || null,
                barcode: get("barcode") || null,
                categoryId,
                costPrice: toDecimal(costPrice),
                sellingPrice: toDecimal(sellingPrice),
                wholesalePrice: get("wholesalePrice") ? toDecimal(parseNum(get("wholesalePrice"))) : null,
                currentStock: toDecimal(parseNum(get("currentStock")) || 0),
                minStock: toDecimal(parseNum(get("minStock")) || 0),
                unit: get("unit") || "piece",
                description: get("description") || null,
              },
            });
            updated++;
          } else {
            const product = await prisma.storeProduct.create({
              data: {
                storeId,
                name,
                nameKa: get("nameKa") || null,
                sku,
                barcode: get("barcode") || null,
                categoryId,
                costPrice: toDecimal(costPrice),
                sellingPrice: toDecimal(sellingPrice),
                wholesalePrice: get("wholesalePrice") ? toDecimal(parseNum(get("wholesalePrice"))) : null,
                currentStock: toDecimal(parseNum(get("currentStock")) || 0),
                minStock: toDecimal(parseNum(get("minStock")) || 0),
                unit: get("unit") || "piece",
                description: get("description") || null,
              },
              select: { id: true },
            });
            await prisma.storePriceHistory.create({
              data: {
                productId: product.id,
                costPrice: toDecimal(costPrice),
                sellingPrice: toDecimal(sellingPrice),
              },
            });
            imported++;
          }
        } catch {
          errors.push(`ხაზი ${rowNum}: შეცდომა`);
        }
      }
    }
    revalidatePath("/products");
    return { success: true, imported, updated, errors };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "შეცდომა" };
  }
}

export async function importCategoriesFromData(
  data: Record<string, string>[],
  mapping: Record<string, string>
): Promise<ImportResult> {
  try {
    const storeId = await getOrCreateDefaultStore();
    const errors: string[] = [];
    let imported = 0;
    const parentMap = new Map<string, string>();

    for (let i = 0; i < data.length; i++) {
      const row = data[i]!;
      const rowNum = i + 2;
      const get = (k: string) => getVal(row, k, mapping);

      const name = get("name");
      if (!name) {
        errors.push(`ხაზი ${rowNum}: სახელი სავალდებულოა`);
        continue;
      }

      const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9ა-ჰ-]/g, "") || `cat-${i}`;
      try {
        const existing = await prisma.productCategory.findFirst({ where: { storeId, slug } });
        if (existing) {
          parentMap.set(name, existing.id);
          continue;
        }

        let parentId: string | null = null;
        const parentName = get("parentCategoryName");
        if (parentName && parentMap.has(parentName)) {
          parentId = parentMap.get(parentName)!;
        } else if (parentName) {
          const parentSlug = parentName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9ა-ჰ-]/g, "");
          const parent = await prisma.productCategory.findFirst({ where: { storeId, slug: parentSlug } });
          if (parent) {
            parentId = parent.id;
            parentMap.set(parentName, parent.id);
          }
        }

        const cat = await prisma.productCategory.create({
          data: {
            storeId,
            name,
            nameKa: get("nameKa") || name,
            slug,
            description: get("description") || null,
            parentId,
          },
        });
        parentMap.set(name, cat.id);
        imported++;
      } catch {
        errors.push(`ხაზი ${rowNum}: შეცდომა`);
      }
    }
    revalidatePath("/products/categories");
    return { success: true, imported, updated: 0, errors };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "შეცდომა" };
  }
}

export async function importSuppliersFromData(
  data: Record<string, string>[],
  mapping: Record<string, string>
): Promise<ImportResult> {
  try {
    const storeId = await getOrCreateDefaultStore();
    const errors: string[] = [];
    let imported = 0;
    let updated = 0;

    for (let b = 0; b < data.length; b += BATCH_SIZE) {
      const batch = data.slice(b, b + BATCH_SIZE);
      for (let i = 0; i < batch.length; i++) {
        const row = batch[i]!;
        const rowNum = b + i + 2;
        const get = (k: string) => getVal(row, k, mapping);

        const name = get("name");
        if (!name) {
          errors.push(`ხაზი ${rowNum}: სახელი სავალდებულოა`);
          continue;
        }

        try {
          const existing = await prisma.storeSupplier.findUnique({
            where: { storeId_name: { storeId, name } },
          });
          if (existing) {
            await prisma.storeSupplier.update({
              where: { id: existing.id },
              data: {
                contactPerson: get("contactPerson") || null,
                email: get("email") || null,
                phone: get("phone") || null,
                address: get("address") || null,
                taxId: get("taxId") || null,
              },
            });
            updated++;
          } else {
              await prisma.storeSupplier.create({
              data: {
                storeId,
                name,
                contactPerson: get("contactPerson") || null,
                email: get("email") || null,
                phone: get("phone") || null,
                address: get("address") || null,
                taxId: get("taxId") || null,
              },
            });
            imported++;
          }
        } catch {
          errors.push(`ხაზი ${rowNum}: შეცდომა`);
        }
      }
    }
    revalidatePath("/purchases/suppliers");
    return { success: true, imported, updated, errors };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "შეცდომა" };
  }
}

export async function importCustomersFromData(
  data: Record<string, string>[],
  mapping: Record<string, string>
): Promise<ImportResult> {
  try {
    const storeId = await getOrCreateDefaultStore();
    const errors: string[] = [];
    let imported = 0;

    for (let b = 0; b < data.length; b += BATCH_SIZE) {
      const batch = data.slice(b, b + BATCH_SIZE);
      for (let i = 0; i < batch.length; i++) {
        const row = batch[i]!;
        const rowNum = b + i + 2;
        const get = (k: string) => getVal(row, k, mapping);

        const firstName = get("firstName");
        if (!firstName) {
          errors.push(`ხაზი ${rowNum}: სახელი სავალდებულოა`);
          continue;
        }

        try {
          await prisma.storeCustomer.create({
            data: {
              storeId,
              firstName,
              lastName: get("lastName") || null,
              phone: get("phone") || null,
              email: get("email") || null,
              address: get("address") || null,
              taxId: get("taxId") || null,
              notes: get("notes") || null,
            },
          });
          imported++;
        } catch {
          errors.push(`ხაზი ${rowNum}: შეცდომა`);
        }
      }
    }
    revalidatePath("/customers");
    return { success: true, imported, updated: 0, errors };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "შეცდომა" };
  }
}
