import { z } from "zod";

const decimalSchema = z.union([
  z.number(),
  z.string().transform((v) => parseFloat(v) || 0),
]);

export const productSchema = z.object({
  name: z.string().min(1, "სახელი სავალდებულოა"),
  nameKa: z.string().optional(),
  sku: z.string().min(1, "SKU სავალდებულოა"),
  barcode: z.string().optional(),
  categoryId: z.string().nullable().optional(),
  description: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  costPrice: decimalSchema.refine((v) => v >= 0, "ღირებულება უნდა იყოს 0 ან მეტი"),
  sellingPrice: decimalSchema.refine((v) => v > 0, "ფასი უნდა იყოს 0-ზე მეტი"),
  wholesalePrice: decimalSchema.refine((v) => v >= 0, "საბითუმო ფასი უნდა იყოს 0 ან მეტი").optional().nullable(),
  currentStock: decimalSchema.refine((v) => v >= 0, "მარაგი უნდა იყოს 0 ან მეტი").default(0),
  minStock: decimalSchema.refine((v) => v >= 0).default(0),
  maxStock: decimalSchema.refine((v) => v >= 0).optional().nullable(),
  unit: z.string().default("piece"),
  isActive: z.boolean().default(true),
  isFavorite: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

export type ProductFormData = z.infer<typeof productSchema>;

export const categorySchema = z.object({
  name: z.string().min(1, "კატეგორიის სახელი სავალდებულოა"),
  nameKa: z.string().optional(),
  slug: z.string().min(1, "Slug სავალდებულოა"),
  description: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  sortOrder: z.number().int().default(0),
  parentId: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
});

export type CategoryFormData = z.infer<typeof categorySchema>;

export const supplierSchema = z.object({
  name: z.string().min(1, "სახელი სავალდებულოა"),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  taxId: z.string().optional(),
  bankAccount: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type SupplierFormData = z.infer<typeof supplierSchema>;

export const purchaseOrderItemSchema = z.object({
  productId: z.string().min(1, "პროდუქტი სავალდებულოა"),
  quantity: decimalSchema.refine((v) => v > 0, "რაოდენობა უნდა იყოს 0-ზე მეტი"),
  unitCost: decimalSchema.refine((v) => v >= 0, "ღირებულება უნდა იყოს 0 ან მეტი"),
});

export const purchaseOrderSchema = z.object({
  supplierId: z.string().min(1, "მომწოდებელი სავალდებულოა"),
  notes: z.string().optional(),
  expectedDate: z.string().optional(),
  items: z.array(purchaseOrderItemSchema).min(1, "დაამატეთ მინიმუმ 1 პროდუქტი"),
});

export type PurchaseOrderFormData = z.infer<typeof purchaseOrderSchema>;

export const returnItemSchema = z.object({
  productId: z.string().min(1, "პროდუქტი სავალდებულოა"),
  quantity: decimalSchema.refine((v) => v > 0, "რაოდენობა უნდა იყოს 0-ზე მეტი"),
  refundAmount: decimalSchema.refine((v) => v >= 0, "დაბრუნების თანხა უნდა იყოს 0 ან მეტი"),
});

export const createReturnSchema = z.object({
  saleId: z.string().min(1, "გაყიდვა სავალდებულოა"),
  reason: z.string().min(1, "მიზეზი სავალდებულოა"),
  refundMethod: z.enum(["CASH", "CARD", "BANK_TRANSFER", "CHECK"]),
  items: z.array(returnItemSchema).min(1, "დაამატეთ მინიმუმ 1 პროდუქტი"),
});

export type CreateReturnFormData = z.infer<typeof createReturnSchema>;

export const customerSchema = z.object({
  firstName: z.string().min(1, "სახელი სავალდებულოა"),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("არასწორი email").optional().or(z.literal("")),
  address: z.string().optional(),
  taxId: z.string().optional(),
  notes: z.string().optional(),
});

export type CustomerFormData = z.infer<typeof customerSchema>;
