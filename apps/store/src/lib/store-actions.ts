"use server";

import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { authOptions } from "./auth";
import { Prisma } from "@/generated/prisma";
import { getOrCreateDefaultStore } from "./store";
import {
  productSchema,
  categorySchema,
  supplierSchema,
  purchaseOrderSchema,
  customerSchema,
  type ProductFormData,
  type CategoryFormData,
  type SupplierFormData,
  type PurchaseOrderFormData,
  createReturnSchema,
  type CreateReturnFormData,
  type CustomerFormData,
} from "./validators";

type ActionResult = { success: true; id?: string } | { success: false; error: string };

function toDecimal(v: number | string): Prisma.Decimal {
  return new Prisma.Decimal(Number(v));
}

/** Convert StoreProduct Decimal fields for client serialization */
function productToPlain(p: {
  costPrice: unknown;
  sellingPrice: unknown;
  wholesalePrice?: unknown;
  currentStock: unknown;
  minStock: unknown;
  maxStock?: unknown;
  [k: string]: unknown;
}) {
  return {
    ...p,
    costPrice: Number(p.costPrice),
    sellingPrice: Number(p.sellingPrice),
    wholesalePrice: p.wholesalePrice != null ? Number(p.wholesalePrice) : null,
    currentStock: Number(p.currentStock),
    minStock: Number(p.minStock),
    maxStock: p.maxStock != null ? Number(p.maxStock) : null,
  };
}

export async function getProducts(params: {
  storeId?: string;
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string | null;
  isActive?: boolean;
}) {
  const storeId = params.storeId ?? (await getOrCreateDefaultStore());
  const page = params.page ?? 1;
  const limit = Math.min(params.limit ?? 20, 100);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { storeId };
  if (params.search?.trim()) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { nameKa: { contains: params.search, mode: "insensitive" } },
      { sku: { contains: params.search, mode: "insensitive" } },
      { barcode: { contains: params.search, mode: "insensitive" } },
    ];
  }
  if (params.categoryId) where.categoryId = params.categoryId;
  if (params.isActive !== undefined) where.isActive = params.isActive;

  const [products, total] = await Promise.all([
    prisma.storeProduct.findMany({
      where,
      include: { category: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      skip,
      take: limit,
    }),
    prisma.storeProduct.count({ where }),
  ]);

  return {
    products: products.map((p) => ({
      ...p,
      costPrice: Number(p.costPrice),
      sellingPrice: Number(p.sellingPrice),
      wholesalePrice: p.wholesalePrice ? Number(p.wholesalePrice) : null,
      currentStock: Number(p.currentStock),
      minStock: Number(p.minStock),
      maxStock: p.maxStock ? Number(p.maxStock) : null,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getProductById(id: string, storeId?: string) {
  const sid = storeId ?? (await getOrCreateDefaultStore());
  const product = await prisma.storeProduct.findFirst({
    where: { id, storeId: sid },
    include: { category: true, priceHistory: { orderBy: { changedAt: "desc" }, take: 20 } },
  });
  if (!product) return null;
  return {
    ...product,
    costPrice: Number(product.costPrice),
    sellingPrice: Number(product.sellingPrice),
    wholesalePrice: product.wholesalePrice ? Number(product.wholesalePrice) : null,
    currentStock: Number(product.currentStock),
    minStock: Number(product.minStock),
    maxStock: product.maxStock ? Number(product.maxStock) : null,
    priceHistory: product.priceHistory.map((h) => ({
      ...h,
      costPrice: Number(h.costPrice),
      sellingPrice: Number(h.sellingPrice),
    })),
  };
}

export async function createProduct(data: ProductFormData): Promise<ActionResult> {
  try {
    const parsed = productSchema.parse(data);
    const storeId = await getOrCreateDefaultStore();

    const skuExists = await prisma.storeProduct.findUnique({
      where: { storeId_sku: { storeId, sku: parsed.sku } },
    });
    if (skuExists) {
      return { success: false, error: `SKU "${parsed.sku}" უკვე არსებობს.` };
    }

    const product = await prisma.storeProduct.create({
      data: {
        storeId,
        name: parsed.name,
        nameKa: parsed.nameKa || null,
        sku: parsed.sku,
        barcode: parsed.barcode || null,
        categoryId: parsed.categoryId || null,
        description: parsed.description || null,
        imageUrl: parsed.imageUrl || null,
        costPrice: toDecimal(parsed.costPrice),
        sellingPrice: toDecimal(parsed.sellingPrice),
        wholesalePrice: parsed.wholesalePrice != null ? toDecimal(parsed.wholesalePrice) : null,
        currentStock: toDecimal(parsed.currentStock ?? 0),
        minStock: toDecimal(parsed.minStock ?? 0),
        maxStock: parsed.maxStock != null ? toDecimal(parsed.maxStock) : null,
        unit: parsed.unit ?? "piece",
        isActive: parsed.isActive ?? true,
        isFavorite: parsed.isFavorite ?? false,
        sortOrder: parsed.sortOrder ?? 0,
      },
    });

    await prisma.storePriceHistory.create({
      data: {
        productId: product.id,
        costPrice: product.costPrice,
        sellingPrice: product.sellingPrice,
      },
    });

    revalidatePath("/products");
    return { success: true, id: product.id };
  } catch (e: unknown) {
    if (e instanceof Error && "digest" in e) throw e;
    const msg = e instanceof Error ? e.message : "შეცდომა";
    return { success: false, error: msg };
  }
}

export async function updateProduct(
  id: string,
  data: Partial<ProductFormData>
): Promise<ActionResult> {
  try {
    const parsed = productSchema.partial().parse(data);
    const storeId = await getOrCreateDefaultStore();

    const existing = await prisma.storeProduct.findFirst({
      where: { id, storeId },
    });
    if (!existing) {
      return { success: false, error: "პროდუქტი ვერ მოიძებნა." };
    }

    if (parsed.sku && parsed.sku !== existing.sku) {
      const skuExists = await prisma.storeProduct.findUnique({
        where: { storeId_sku: { storeId, sku: parsed.sku } },
      });
      if (skuExists) {
        return { success: false, error: `SKU "${parsed.sku}" უკვე არსებობს.` };
      }
    }

    const priceChanged =
      (parsed.costPrice != null && Number(parsed.costPrice) !== Number(existing.costPrice)) ||
      (parsed.sellingPrice != null && Number(parsed.sellingPrice) !== Number(existing.sellingPrice));

    const product = await prisma.storeProduct.update({
      where: { id },
      data: {
        ...(parsed.name != null && { name: parsed.name }),
        ...(parsed.nameKa !== undefined && { nameKa: parsed.nameKa || null }),
        ...(parsed.sku != null && { sku: parsed.sku }),
        ...(parsed.barcode !== undefined && { barcode: parsed.barcode || null }),
        ...(parsed.categoryId !== undefined && { categoryId: parsed.categoryId || null }),
        ...(parsed.description !== undefined && { description: parsed.description || null }),
        ...(parsed.imageUrl !== undefined && { imageUrl: parsed.imageUrl || null }),
        ...(parsed.costPrice != null && { costPrice: toDecimal(parsed.costPrice) }),
        ...(parsed.sellingPrice != null && { sellingPrice: toDecimal(parsed.sellingPrice) }),
        ...(parsed.wholesalePrice !== undefined &&
          { wholesalePrice: parsed.wholesalePrice != null ? toDecimal(parsed.wholesalePrice) : null }),
        ...(parsed.currentStock != null && { currentStock: toDecimal(parsed.currentStock) }),
        ...(parsed.minStock != null && { minStock: toDecimal(parsed.minStock) }),
        ...(parsed.maxStock !== undefined &&
          { maxStock: parsed.maxStock != null ? toDecimal(parsed.maxStock) : null }),
        ...(parsed.unit != null && { unit: parsed.unit }),
        ...(parsed.isActive !== undefined && { isActive: parsed.isActive }),
        ...(parsed.isFavorite !== undefined && { isFavorite: parsed.isFavorite }),
        ...(parsed.sortOrder != null && { sortOrder: parsed.sortOrder }),
      },
    });

    if (priceChanged) {
      await prisma.storePriceHistory.create({
        data: {
          productId: product.id,
          costPrice: product.costPrice,
          sellingPrice: product.sellingPrice,
        },
      });
    }

    revalidatePath("/products");
    revalidatePath(`/products/${id}`);
    return { success: true, id: product.id };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "შეცდომა";
    return { success: false, error: msg };
  }
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  try {
    const storeId = await getOrCreateDefaultStore();
    await prisma.storeProduct.deleteMany({ where: { id, storeId } });
    revalidatePath("/products");
    return { success: true };
  } catch {
    return { success: false, error: "პროდუქტის წაშლა ვერ მოხერხდა." };
  }
}

export async function getCategories(storeId?: string) {
  const sid = storeId ?? (await getOrCreateDefaultStore());
  const categories = await prisma.productCategory.findMany({
    where: { storeId: sid },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      parent: { select: { id: true, name: true } },
      _count: { select: { products: true } },
    },
  });
  return categories;
}

export async function createCategory(data: CategoryFormData): Promise<ActionResult> {
  try {
    const parsed = categorySchema.parse(data);
    const storeId = await getOrCreateDefaultStore();

    const category = await prisma.productCategory.create({
      data: {
        storeId,
        name: parsed.name,
        nameKa: parsed.nameKa || null,
        slug: parsed.slug,
        description: parsed.description || null,
        color: parsed.color || null,
        icon: parsed.icon || null,
        sortOrder: parsed.sortOrder ?? 0,
        parentId: parsed.parentId || null,
        isActive: parsed.isActive ?? true,
      },
    });
    revalidatePath("/products");
    revalidatePath("/products/categories");
    return { success: true, id: category.id };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "შეცდომა";
    return { success: false, error: msg };
  }
}

export async function updateCategory(
  id: string,
  data: Partial<CategoryFormData>
): Promise<ActionResult> {
  try {
    const parsed = categorySchema.partial().parse(data);
    const storeId = await getOrCreateDefaultStore();

    await prisma.productCategory.updateMany({
      where: { id, storeId },
      data: {
        ...(parsed.name != null && { name: parsed.name }),
        ...(parsed.nameKa !== undefined && { nameKa: parsed.nameKa || null }),
        ...(parsed.slug != null && { slug: parsed.slug }),
        ...(parsed.description !== undefined && { description: parsed.description || null }),
        ...(parsed.color !== undefined && { color: parsed.color || null }),
        ...(parsed.icon !== undefined && { icon: parsed.icon || null }),
        ...(parsed.sortOrder != null && { sortOrder: parsed.sortOrder }),
        ...(parsed.parentId !== undefined && { parentId: parsed.parentId || null }),
        ...(parsed.isActive !== undefined && { isActive: parsed.isActive }),
      },
    });
    revalidatePath("/products");
    revalidatePath("/products/categories");
    return { success: true, id };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "შეცდომა";
    return { success: false, error: msg };
  }
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  try {
    const storeId = await getOrCreateDefaultStore();
    await prisma.productCategory.deleteMany({ where: { id, storeId } });
    revalidatePath("/products");
    revalidatePath("/products/categories");
    return { success: true };
  } catch {
    return { success: false, error: "კატეგორიის წაშლა ვერ მოხერხდა." };
  }
}

// ── INVENTORY / STOCK ──

export async function getInventoryOverview(storeId?: string) {
  const sid = storeId ?? (await getOrCreateDefaultStore());
  const products = await prisma.storeProduct.findMany({
    where: { storeId: sid, isActive: true },
    include: { category: true },
    orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }],
  });
  return products.map((p) => ({
    ...p,
    currentStock: Number(p.currentStock),
    minStock: Number(p.minStock),
    maxStock: p.maxStock ? Number(p.maxStock) : null,
    sellingPrice: Number(p.sellingPrice),
  }));
}

export async function getLowStockProducts(storeId?: string) {
  const sid = storeId ?? (await getOrCreateDefaultStore());
  const products = await prisma.storeProduct.findMany({
    where: {
      storeId: sid,
      isActive: true,
      minStock: { gt: 0 },
    },
    include: { category: true },
    orderBy: { currentStock: "asc" },
  });
  return products
    .filter((p) => Number(p.currentStock) < Number(p.minStock))
    .map((p) => ({
      ...p,
      currentStock: Number(p.currentStock),
      minStock: Number(p.minStock),
      sellingPrice: Number(p.sellingPrice),
    }));
}

export async function getStockMovements(params: {
  storeId?: string;
  page?: number;
  limit?: number;
  productId?: string;
  type?: "STOCK_IN" | "STOCK_OUT" | "STOCK_ADJUSTMENT" | "STOCK_TRANSFER" | "STOCK_RETURN";
}) {
  const sid = params.storeId ?? (await getOrCreateDefaultStore());
  const page = params.page ?? 1;
  const limit = Math.min(params.limit ?? 50, 100);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { storeId: sid };
  if (params.productId) where.productId = params.productId;
  if (params.type) where.type = params.type;

  const [movements, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      include: { product: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.stockMovement.count({ where }),
  ]);

  return {
    movements: movements.map((m) => ({
      ...m,
      quantity: Number(m.quantity),
      previousStock: Number(m.previousStock),
      newStock: Number(m.newStock),
      product: productToPlain(m.product),
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function adjustStock(params: {
  productId: string;
  type: "STOCK_IN" | "STOCK_OUT" | "STOCK_ADJUSTMENT";
  quantity: number;
  reason?: string;
  performedBy?: string;
}): Promise<ActionResult> {
  try {
    const storeId = await getOrCreateDefaultStore();
    const product = await prisma.storeProduct.findFirst({
      where: { id: params.productId, storeId },
    });
    if (!product) return { success: false, error: "პროდუქტი ვერ მოიძებნა." };

    const prevStock = Number(product.currentStock);
    let newStock: number;
    const qty = params.quantity;

    switch (params.type) {
      case "STOCK_IN":
        newStock = prevStock + qty;
        break;
      case "STOCK_OUT":
        newStock = Math.max(0, prevStock - qty);
        break;
      case "STOCK_ADJUSTMENT":
        newStock = Math.max(0, qty);
        break;
      default:
        return { success: false, error: "არასწორი ტიპი." };
    }

    const movementQty = params.type === "STOCK_ADJUSTMENT" ? newStock - prevStock : qty;

    await prisma.$transaction([
      prisma.storeProduct.update({
        where: { id: params.productId },
        data: { currentStock: toDecimal(newStock) },
      }),
      prisma.stockMovement.create({
        data: {
          storeId,
          productId: params.productId,
          type: params.type,
          quantity: toDecimal(Math.abs(movementQty)),
          previousStock: toDecimal(prevStock),
          newStock: toDecimal(newStock),
          reason: params.reason ?? null,
          performedBy: params.performedBy ?? null,
        },
      }),
    ]);

    revalidatePath("/inventory");
    revalidatePath("/inventory/movements");
    revalidatePath("/inventory/alerts");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "შეცდომა" };
  }
}

export async function bulkStockTake(
  items: { productId: string; newStock: number }[]
): Promise<ActionResult> {
  try {
    const storeId = await getOrCreateDefaultStore();

    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const product = await tx.storeProduct.findFirst({
          where: { id: item.productId, storeId },
        });
        if (!product) continue;

        const prevStock = Number(product.currentStock);
        const newStock = Math.max(0, item.newStock);
        const diff = newStock - prevStock;
        if (diff === 0) continue;

        await tx.storeProduct.update({
          where: { id: item.productId },
          data: { currentStock: toDecimal(newStock) },
        });
        await tx.stockMovement.create({
          data: {
            storeId,
            productId: item.productId,
            type: "STOCK_ADJUSTMENT",
            quantity: toDecimal(Math.abs(diff)),
            previousStock: toDecimal(prevStock),
            newStock: toDecimal(newStock),
            reason: "ინვენტარიზაცია",
          },
        });
      }
    });

    revalidatePath("/inventory");
    revalidatePath("/inventory/movements");
    revalidatePath("/inventory/stock-take");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "შეცდომა" };
  }
}

// ── SUPPLIERS ──

export async function getSuppliers(params?: {
  storeId?: string;
  search?: string;
  isActive?: boolean;
}) {
  const sid = params?.storeId ?? (await getOrCreateDefaultStore());
  const where: Record<string, unknown> = { storeId: sid };
  if (params?.search?.trim()) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { contactPerson: { contains: params.search, mode: "insensitive" } },
      { phone: { contains: params.search, mode: "insensitive" } },
      { email: { contains: params.search, mode: "insensitive" } },
    ];
  }
  if (params?.isActive !== undefined) where.isActive = params.isActive;

  const suppliers = await prisma.storeSupplier.findMany({
    where,
    orderBy: { name: "asc" },
    include: { _count: { select: { purchaseOrders: true } } },
  });
  return suppliers;
}

export async function getSupplierById(id: string, storeId?: string) {
  const sid = storeId ?? (await getOrCreateDefaultStore());
  return prisma.storeSupplier.findFirst({
    where: { id, storeId: sid },
  });
}

export async function createSupplier(data: SupplierFormData): Promise<ActionResult> {
  try {
    const parsed = supplierSchema.parse(data);
    const storeId = await getOrCreateDefaultStore();

    const exists = await prisma.storeSupplier.findUnique({
      where: { storeId_name: { storeId, name: parsed.name } },
    });
    if (exists) return { success: false, error: `მომწოდებელი "${parsed.name}" უკვე არსებობს.` };

    const supplier = await prisma.storeSupplier.create({
      data: {
        storeId,
        name: parsed.name,
        contactPerson: parsed.contactPerson || null,
        phone: parsed.phone || null,
        email: parsed.email || null,
        address: parsed.address || null,
        taxId: parsed.taxId || null,
        bankAccount: parsed.bankAccount || null,
        notes: parsed.notes || null,
        isActive: parsed.isActive ?? true,
      },
    });
    revalidatePath("/purchases/suppliers");
    return { success: true, id: supplier.id };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "შეცდომა" };
  }
}

export async function updateSupplier(id: string, data: Partial<SupplierFormData>): Promise<ActionResult> {
  try {
    const parsed = supplierSchema.partial().parse(data);
    const storeId = await getOrCreateDefaultStore();

    const existing = await prisma.storeSupplier.findFirst({ where: { id, storeId } });
    if (!existing) return { success: false, error: "მომწოდებელი ვერ მოიძებნა." };

    if (parsed.name && parsed.name !== existing.name) {
      const exists = await prisma.storeSupplier.findUnique({
        where: { storeId_name: { storeId, name: parsed.name } },
      });
      if (exists) return { success: false, error: `მომწოდებელი "${parsed.name}" უკვე არსებობს.` };
    }

    await prisma.storeSupplier.updateMany({
      where: { id, storeId },
      data: {
        ...(parsed.name != null && { name: parsed.name }),
        ...(parsed.contactPerson !== undefined && { contactPerson: parsed.contactPerson || null }),
        ...(parsed.phone !== undefined && { phone: parsed.phone || null }),
        ...(parsed.email !== undefined && { email: parsed.email || null }),
        ...(parsed.address !== undefined && { address: parsed.address || null }),
        ...(parsed.taxId !== undefined && { taxId: parsed.taxId || null }),
        ...(parsed.bankAccount !== undefined && { bankAccount: parsed.bankAccount || null }),
        ...(parsed.notes !== undefined && { notes: parsed.notes || null }),
        ...(parsed.isActive !== undefined && { isActive: parsed.isActive }),
      },
    });
    revalidatePath("/purchases/suppliers");
    return { success: true, id };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "შეცდომა" };
  }
}

// ── PURCHASE ORDERS ──

function nextOrderNumber(storeId: string): Promise<string> {
  return prisma.storePurchaseOrder
    .findFirst({
      where: { storeId },
      orderBy: { createdAt: "desc" },
      select: { orderNumber: true },
    })
    .then((last) => {
      const match = last?.orderNumber?.match(/PO-(\d+)/);
      const n = match ? parseInt(match[1], 10) + 1 : 1;
      return `PO-${String(n).padStart(5, "0")}`;
    });
}

export async function getPurchaseOrders(params?: {
  storeId?: string;
  page?: number;
  limit?: number;
  status?: string;
  supplierId?: string;
}) {
  const sid = params?.storeId ?? (await getOrCreateDefaultStore());
  const page = params?.page ?? 1;
  const limit = Math.min(params?.limit ?? 20, 100);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { storeId: sid };
  if (params?.status) where.status = params.status;
  if (params?.supplierId) where.supplierId = params.supplierId;

  const [orders, total] = await Promise.all([
    prisma.storePurchaseOrder.findMany({
      where,
      include: { supplier: true, items: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.storePurchaseOrder.count({ where }),
  ]);

  return {
    orders: orders.map((o) => ({
      ...o,
      subtotal: Number(o.subtotal),
      taxAmount: Number(o.taxAmount),
      total: Number(o.total),
      items: o.items.map((i) => ({
        ...i,
        quantity: Number(i.quantity),
        unitCost: Number(i.unitCost),
        receivedQty: Number(i.receivedQty),
        total: Number(i.total),
        product: productToPlain(i.product),
      })),
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getPurchaseOrderById(id: string, storeId?: string) {
  const sid = storeId ?? (await getOrCreateDefaultStore());
  const order = await prisma.storePurchaseOrder.findFirst({
    where: { id, storeId: sid },
    include: { supplier: true, items: { include: { product: true } } },
  });
  if (!order) return null;
  return {
    ...order,
    subtotal: Number(order.subtotal),
    taxAmount: Number(order.taxAmount),
    total: Number(order.total),
    items: order.items.map((i) => ({
      ...i,
      quantity: Number(i.quantity),
      unitCost: Number(i.unitCost),
      receivedQty: Number(i.receivedQty),
      total: Number(i.total),
      product: productToPlain(i.product),
    })),
  };
}

export async function createPurchaseOrder(data: PurchaseOrderFormData): Promise<ActionResult> {
  try {
    const parsed = purchaseOrderSchema.parse(data);
    const storeId = await getOrCreateDefaultStore();

    const orderNumber = await nextOrderNumber(storeId);
    let subtotal = 0;
    const items = parsed.items.map((it) => {
      const total = Number(it.quantity) * Number(it.unitCost);
      subtotal += total;
      return {
        productId: it.productId,
        quantity: toDecimal(it.quantity),
        unitCost: toDecimal(it.unitCost),
        total: toDecimal(total),
      };
    });

    const order = await prisma.storePurchaseOrder.create({
      data: {
        storeId,
        supplierId: parsed.supplierId,
        orderNumber,
        subtotal: toDecimal(subtotal),
        taxAmount: toDecimal(0),
        total: toDecimal(subtotal),
        status: "STORE_PO_DRAFT",
        notes: parsed.notes || null,
        expectedDate: parsed.expectedDate ? new Date(parsed.expectedDate) : null,
        items: { create: items },
      },
    });
    revalidatePath("/purchases");
    return { success: true, id: order.id };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "შეცდომა" };
  }
}

export async function receivePurchaseOrder(
  orderId: string,
  receivedQuantities: { itemId: string; receivedQty: number }[]
): Promise<ActionResult> {
  try {
    const storeId = await getOrCreateDefaultStore();

    await prisma.$transaction(async (tx) => {
      const order = await tx.storePurchaseOrder.findFirst({
        where: { id: orderId, storeId },
        include: { items: { include: { product: true } } },
      });
      if (!order) throw new Error("შეკვეთა ვერ მოიძებნა.");
      if (order.status === "STORE_PO_CANCELLED") throw new Error("შეკვეთა გაუქმებულია.");

      const receivedMap = new Map(receivedQuantities.map((r) => [r.itemId, r.receivedQty]));
      let allReceived = true;

      for (const item of order.items) {
        const toReceive = receivedMap.get(item.id) ?? 0;
        if (toReceive <= 0) {
          if (Number(item.receivedQty) < Number(item.quantity)) allReceived = false;
          continue;
        }

        const prevReceived = Number(item.receivedQty);
        const newReceived = Math.min(prevReceived + toReceive, Number(item.quantity));
        const actualReceived = newReceived - prevReceived;
        if (actualReceived <= 0) continue;

        const product = item.product;
        const prevStock = Number(product.currentStock);
        const newStock = prevStock + actualReceived;

        await tx.storePurchaseItem.update({
          where: { id: item.id },
          data: { receivedQty: toDecimal(newReceived) },
        });
        await tx.storeProduct.update({
          where: { id: product.id },
          data: { currentStock: toDecimal(newStock) },
        });
        await tx.stockMovement.create({
          data: {
            storeId,
            productId: product.id,
            type: "STOCK_IN",
            quantity: toDecimal(actualReceived),
            previousStock: toDecimal(prevStock),
            newStock: toDecimal(newStock),
            reason: `შესყიდვა ${order.orderNumber}`,
            referenceType: "PurchaseOrder",
            referenceId: orderId,
          },
        });
        if (newReceived < Number(item.quantity)) allReceived = false;
      }

      const newStatus = allReceived ? "STORE_PO_RECEIVED" : "STORE_PO_PARTIAL";
      await tx.storePurchaseOrder.update({
        where: { id: orderId },
        data: {
          status: newStatus,
          receivedDate: allReceived ? new Date() : undefined,
        },
      });
    });

    revalidatePath("/purchases");
    revalidatePath(`/purchases/${orderId}`);
    revalidatePath("/inventory");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "შეცდომა" };
  }
}

// ── SALES / POS ──

export async function getStoreCustomers(storeId?: string) {
  const sid = storeId ?? (await getOrCreateDefaultStore());
  return prisma.storeCustomer.findMany({
    where: { storeId: sid, isActive: true },
    orderBy: { firstName: "asc" },
  });
}

// ── CUSTOMERS (CRUD) ──

export async function getCustomers(params?: {
  storeId?: string;
  page?: number;
  limit?: number;
  search?: string;
}) {
  const sid = params?.storeId ?? (await getOrCreateDefaultStore());
  const page = params?.page ?? 1;
  const limit = Math.min(params?.limit ?? 20, 100);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { storeId: sid };
  if (params?.search?.trim()) {
    const q = params.search.trim();
    where.OR = [
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }

  const [customers, total] = await Promise.all([
    prisma.storeCustomer.findMany({
      where,
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      skip,
      take: limit,
    }),
    prisma.storeCustomer.count({ where }),
  ]);

  return {
    customers: customers.map((c) => ({
      ...c,
      totalPurchases: Number(c.totalPurchases),
      totalLifetimePurchases: Number(c.totalLifetimePurchases),
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getCustomerById(id: string, storeId?: string) {
  const sid = storeId ?? (await getOrCreateDefaultStore());
  const customer = await prisma.storeCustomer.findFirst({
    where: { id, storeId: sid },
    include: {
      sales: {
        orderBy: { createdAt: "desc" },
        include: { payments: true },
      },
    },
  });
  if (!customer) return null;
  return {
    ...customer,
    totalPurchases: Number(customer.totalPurchases),
    totalLifetimePurchases: Number(customer.totalLifetimePurchases),
    sales: customer.sales.map((s) => ({
      ...s,
      subtotal: Number(s.subtotal),
      total: Number(s.total),
      paidAmount: Number(s.paidAmount),
      payments: s.payments.map((p) => ({
        ...p,
        amount: Number(p.amount),
      })),
    })),
  };
}

export async function createCustomer(data: CustomerFormData): Promise<ActionResult> {
  try {
    const parsed = customerSchema.parse(data);
    const storeId = await getOrCreateDefaultStore();

    const customer = await prisma.storeCustomer.create({
      data: {
        storeId,
        firstName: parsed.firstName,
        lastName: parsed.lastName || null,
        phone: parsed.phone || null,
        email: parsed.email || null,
        address: parsed.address || null,
        taxId: parsed.taxId || null,
        notes: parsed.notes || null,
      },
    });
    revalidatePath("/customers");
    return { success: true, id: customer.id };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "შეცდომა" };
  }
}

export async function updateCustomer(
  id: string,
  data: Partial<CustomerFormData>
): Promise<ActionResult> {
  try {
    const parsed = customerSchema.partial().parse(data);
    const storeId = await getOrCreateDefaultStore();

    const existing = await prisma.storeCustomer.findFirst({
      where: { id, storeId },
    });
    if (!existing) return { success: false, error: "მომხმარებელი ვერ მოიძებნა." };

    await prisma.storeCustomer.updateMany({
      where: { id, storeId },
      data: {
        ...(parsed.firstName != null && { firstName: parsed.firstName }),
        ...(parsed.lastName !== undefined && { lastName: parsed.lastName || null }),
        ...(parsed.phone !== undefined && { phone: parsed.phone || null }),
        ...(parsed.email !== undefined && { email: parsed.email || null }),
        ...(parsed.address !== undefined && { address: parsed.address || null }),
        ...(parsed.taxId !== undefined && { taxId: parsed.taxId || null }),
        ...(parsed.notes !== undefined && { notes: parsed.notes || null }),
      },
    });
    revalidatePath("/customers");
    revalidatePath(`/customers/${id}`);
    return { success: true, id };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "შეცდომა" };
  }
}

export async function getStoreEmployees(storeId?: string) {
  const sid = storeId ?? (await getOrCreateDefaultStore());
  const rows = await prisma.storeEmployee.findMany({
    where: { storeId: sid },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      // pin excluded - never send hash to client
    },
  });
  return rows.map((r) => ({ ...r, pin: null })); // for form compatibility, pass null
}

function nextSaleNumber(storeId: string): Promise<string> {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `S-${today}-`;
  return prisma.sale
    .findFirst({
      where: { storeId, saleNumber: { startsWith: prefix } },
      orderBy: { saleNumber: "desc" },
      select: { saleNumber: true },
    })
    .then((last) => {
      const match = last?.saleNumber?.slice(prefix.length);
      const n = match ? parseInt(match, 10) + 1 : 1;
      return `${prefix}${String(n).padStart(3, "0")}`;
    });
}

export async function createSale(params: {
  items: { productId: string; productName: string; quantity: number; unitPrice: number; costPrice: number }[];
  customerId?: string | null;
  employeeId?: string | null;
  discountAmount?: number;
  discountType?: "DISCOUNT_PERCENTAGE" | "DISCOUNT_FIXED" | null;
  payments: { method: "CASH" | "CARD" | "BANK_TRANSFER" | "CHECK"; amount: number; reference?: string }[];
  notes?: string | null;
  loyaltyPointsRedeemed?: number;
}): Promise<{ success: true; saleId: string; saleNumber: string } | { success: false; error: string }> {
  try {
    const storeId = await getOrCreateDefaultStore();
    const saleNumber = await nextSaleNumber(storeId);

    let subtotal = 0;
    for (const it of params.items) {
      subtotal += it.quantity * it.unitPrice;
    }
    const discountAmount = params.discountAmount ?? 0;
    const taxAmount = 0;
    const total = subtotal - discountAmount + taxAmount;

    const paidAmount = params.payments.reduce((s, p) => s + p.amount, 0);
    if (Math.abs(paidAmount - total) > 0.01) {
      return { success: false, error: "გადახდის ჯამი უნდა ემთხვეოდეს ჯამს." };
    }

    const result = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          storeId,
          saleNumber,
          customerId: params.customerId || null,
          employeeId: params.employeeId || null,
          subtotal: toDecimal(subtotal),
          taxAmount: toDecimal(taxAmount),
          discountAmount: toDecimal(discountAmount),
          discountType: params.discountType ?? null,
          total: toDecimal(total),
          paidAmount: toDecimal(paidAmount),
          changeAmount: toDecimal(0),
          notes: params.notes ?? null,
          items: {
            create: params.items.map((it) => ({
              productId: it.productId,
              productName: it.productName,
              quantity: toDecimal(it.quantity),
              unitPrice: toDecimal(it.unitPrice),
              costPrice: toDecimal(it.costPrice),
              discount: toDecimal(0),
              taxAmount: toDecimal(0),
              total: toDecimal(it.quantity * it.unitPrice),
            })),
          },
          payments: {
            create: params.payments.map((p) => ({
              method: p.method,
              amount: toDecimal(p.amount),
              reference: p.reference ?? null,
            })),
          },
        },
        include: { items: { include: { product: true } } },
      });

      for (const item of sale.items) {
        const qty = Number(item.quantity);
        const product = item.product;
        const prevStock = Number(product.currentStock);
        const newStock = Math.max(0, prevStock - qty);

        await tx.storeProduct.update({
          where: { id: product.id },
          data: { currentStock: toDecimal(newStock) },
        });
        await tx.stockMovement.create({
          data: {
            storeId,
            productId: product.id,
            type: "STOCK_OUT",
            quantity: toDecimal(qty),
            previousStock: toDecimal(prevStock),
            newStock: toDecimal(newStock),
            reason: `გაყიდვა ${saleNumber}`,
            referenceType: "Sale",
            referenceId: sale.id,
          },
        });
      }

      if (params.customerId) {
        const loyaltyConfig = await tx.storeLoyaltyConfig.findUnique({
          where: { storeId },
        });
        let pointsDelta = 0;
        const pointsRedeemed = params.loyaltyPointsRedeemed ?? 0;
        if (loyaltyConfig) {
          const pointsEarned = Math.floor(total * (loyaltyConfig.pointsPerGel ?? 1));
          pointsDelta = pointsEarned - pointsRedeemed;
          if (pointsEarned > 0) {
            await tx.storeLoyaltyTransaction.create({
              data: {
                customerId: params.customerId,
                type: "EARN",
                points: pointsEarned,
                saleId: sale.id,
                description: `გაყიდვა ${saleNumber}`,
              },
            });
          }
          if (pointsRedeemed > 0) {
            await tx.storeLoyaltyTransaction.create({
              data: {
                customerId: params.customerId,
                type: "REDEEM",
                points: -pointsRedeemed,
                saleId: sale.id,
                description: `ფასდაკლება ${saleNumber}`,
              },
            });
          }
        }
        await tx.storeCustomer.update({
          where: { id: params.customerId },
          data: {
            totalPurchases: { increment: toDecimal(total) },
            totalLifetimePurchases: { increment: toDecimal(total) },
            ...(pointsDelta !== 0 && { loyaltyPoints: { increment: pointsDelta } }),
          },
        });
      }

      return sale;
    });

    revalidatePath("/pos");
    revalidatePath("/inventory");
    revalidatePath("/reports");
    return { success: true, saleId: result.id, saleNumber: result.saleNumber };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "შეცდომა" };
  }
}

/** Create sale from offline sync - accepts pre-generated saleNumber for idempotency */
export async function createSaleFromOfflineSync(params: {
  storeId: string;
  saleNumber: string;
  customerId?: string | null;
  employeeId?: string | null;
  items: { productId: string; productName: string; quantity: number; unitPrice: number; costPrice: number }[];
  subtotal: number;
  discountAmount: number;
  discountType?: "DISCOUNT_PERCENTAGE" | "DISCOUNT_FIXED" | null;
  total: number;
  payments: { method: "CASH" | "CARD" | "BANK_TRANSFER" | "CHECK"; amount: number; reference?: string }[];
  notes?: string | null;
  loyaltyPointsEarned?: number;
  loyaltyPointsRedeemed?: number;
}): Promise<{ success: true; saleId: string } | { success: false; error: string }> {
  try {
    const storeId = params.storeId;
    const existing = await prisma.sale.findFirst({
      where: { storeId, saleNumber: params.saleNumber },
    });
    if (existing) {
      return { success: true, saleId: existing.id };
    }

    const discountAmount = params.discountAmount ?? 0;
    const taxAmount = 0;
    const total = params.total;
    const paidAmount = params.payments.reduce((s, p) => s + p.amount, 0);
    if (Math.abs(paidAmount - total) > 0.01) {
      return { success: false, error: "გადახდის ჯამი უნდა ემთხვეოდეს ჯამს." };
    }

    const result = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          storeId,
          saleNumber: params.saleNumber,
          customerId: params.customerId || null,
          employeeId: params.employeeId || null,
          subtotal: toDecimal(params.subtotal),
          taxAmount: toDecimal(taxAmount),
          discountAmount: toDecimal(discountAmount),
          discountType: params.discountType ?? null,
          total: toDecimal(total),
          paidAmount: toDecimal(paidAmount),
          changeAmount: toDecimal(0),
          notes: params.notes ?? null,
          items: {
            create: params.items.map((it) => ({
              productId: it.productId,
              productName: it.productName,
              quantity: toDecimal(it.quantity),
              unitPrice: toDecimal(it.unitPrice),
              costPrice: toDecimal(it.costPrice),
              discount: toDecimal(0),
              taxAmount: toDecimal(0),
              total: toDecimal(it.quantity * it.unitPrice),
            })),
          },
          payments: {
            create: params.payments.map((p) => ({
              method: p.method,
              amount: toDecimal(p.amount),
              reference: p.reference ?? null,
            })),
          },
        },
        include: { items: { include: { product: true } } },
      });

      for (const item of sale.items) {
        const qty = Number(item.quantity);
        const product = item.product;
        const prevStock = Number(product.currentStock);
        const newStock = Math.max(0, prevStock - qty);
        await tx.storeProduct.update({
          where: { id: product.id },
          data: { currentStock: toDecimal(newStock) },
        });
        await tx.stockMovement.create({
          data: {
            storeId,
            productId: product.id,
            type: "STOCK_OUT",
            quantity: toDecimal(qty),
            previousStock: toDecimal(prevStock),
            newStock: toDecimal(newStock),
            reason: `გაყიდვა ${params.saleNumber}`,
            referenceType: "Sale",
            referenceId: sale.id,
          },
        });
      }

      if (params.customerId) {
        const loyaltyEarned = params.loyaltyPointsEarned ?? 0;
        const loyaltyRedeemed = params.loyaltyPointsRedeemed ?? 0;
        const pointsDelta = loyaltyEarned - loyaltyRedeemed;
        await tx.storeCustomer.update({
          where: { id: params.customerId },
          data: {
            totalPurchases: { increment: toDecimal(total) },
            totalLifetimePurchases: { increment: toDecimal(total) },
            loyaltyPoints: { increment: pointsDelta },
          },
        });
      }
      return sale;
    });
    return { success: true, saleId: result.id };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "შეცდომა" };
  }
}

export async function voidSale(saleId: string): Promise<ActionResult> {
  try {
    const storeId = await getOrCreateDefaultStore();
    const sale = await prisma.sale.findFirst({
      where: { id: saleId, storeId },
      include: { items: { include: { product: true } } },
    });
    if (!sale) return { success: false, error: "გაყიდვა ვერ მოიძებნა." };
    if (sale.status !== "COMPLETED") return { success: false, error: "გაყიდვა უკვე გაუქმებულია." };

    await prisma.$transaction(async (tx) => {
      for (const item of sale.items) {
        const qty = Number(item.quantity);
        const product = item.product;
        const prevStock = Number(product.currentStock);
        const newStock = prevStock + qty;

        await tx.storeProduct.update({
          where: { id: product.id },
          data: { currentStock: toDecimal(newStock) },
        });
        await tx.stockMovement.create({
          data: {
            storeId,
            productId: product.id,
            type: "STOCK_IN",
            quantity: toDecimal(qty),
            previousStock: toDecimal(prevStock),
            newStock: toDecimal(newStock),
            reason: `გაუქმება ${sale.saleNumber}`,
            referenceType: "Sale",
            referenceId: sale.id,
          },
        });
      }
      if (sale.customerId) {
        await tx.storeCustomer.update({
          where: { id: sale.customerId },
          data: {
            totalPurchases: { decrement: sale.total },
          },
        });
      }
      await tx.sale.update({
        where: { id: saleId },
        data: { status: "VOIDED" },
      });
    });

    revalidatePath("/pos");
    revalidatePath("/inventory");
    revalidatePath("/reports");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "შეცდომა" };
  }
}

export async function getDailySummary(params?: { storeId?: string; date?: Date }) {
  const sid = params?.storeId ?? (await getOrCreateDefaultStore());
  const date = params?.date ?? new Date();
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  const sales = await prisma.sale.findMany({
    where: {
      storeId: sid,
      status: "COMPLETED",
      createdAt: { gte: start, lte: end },
    },
    include: { payments: true },
  });

  const totalSales = sales.reduce((s, x) => s + Number(x.total), 0);
  const totalCount = sales.length;

  const byMethod: Record<string, number> = {};
  for (const sale of sales) {
    for (const p of sale.payments) {
      const m = p.method;
      byMethod[m] = (byMethod[m] ?? 0) + Number(p.amount);
    }
  }

  return {
    date: date.toISOString().slice(0, 10),
    totalSales,
    totalCount,
    byMethod,
  };
}

// ── SALES LIST & DETAIL ──

export async function getSales(params?: {
  storeId?: string;
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  customerId?: string;
  employeeId?: string;
}) {
  const sid = params?.storeId ?? (await getOrCreateDefaultStore());
  const page = params?.page ?? 1;
  const limit = Math.min(params?.limit ?? 20, 100);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { storeId: sid };
  if (params?.status) where.status = params.status;
  if (params?.customerId) where.customerId = params.customerId;
  if (params?.employeeId) where.employeeId = params.employeeId;
  if (params?.dateFrom || params?.dateTo) {
    where.createdAt = {};
    if (params.dateFrom) {
      const d = new Date(params.dateFrom);
      d.setHours(0, 0, 0, 0);
      (where.createdAt as Record<string, Date>).gte = d;
    }
    if (params.dateTo) {
      const d = new Date(params.dateTo);
      d.setHours(23, 59, 59, 999);
      (where.createdAt as Record<string, Date>).lte = d;
    }
  }

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      include: { customer: true, employee: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.sale.count({ where }),
  ]);

  return {
    sales: sales.map((s) => ({
      ...s,
      subtotal: Number(s.subtotal),
      taxAmount: Number(s.taxAmount),
      discountAmount: Number(s.discountAmount),
      total: Number(s.total),
      paidAmount: Number(s.paidAmount),
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getSaleById(id: string, storeId?: string) {
  const sid = storeId ?? (await getOrCreateDefaultStore());
  const sale = await prisma.sale.findFirst({
    where: { id, storeId: sid },
    include: {
      customer: true,
      employee: true,
      items: { include: { product: true } },
      payments: true,
      returns: { include: { items: { include: { product: true } } } },
    },
  });
  if (!sale) return null;
  return {
    ...sale,
    subtotal: Number(sale.subtotal),
    taxAmount: Number(sale.taxAmount),
    discountAmount: Number(sale.discountAmount),
    total: Number(sale.total),
    paidAmount: Number(sale.paidAmount),
    changeAmount: Number(sale.changeAmount),
    items: sale.items.map((i) => ({
      ...i,
      quantity: Number(i.quantity),
      unitPrice: Number(i.unitPrice),
      costPrice: Number(i.costPrice),
      discount: Number(i.discount),
      taxAmount: Number(i.taxAmount),
      total: Number(i.total),
      product: i.product ? productToPlain(i.product) : null,
    })),
    payments: sale.payments.map((p) => ({
      ...p,
      amount: Number(p.amount),
    })),
    returns: sale.returns.map((r) => ({
      ...r,
      refundAmount: Number(r.refundAmount),
      items: r.items.map((ri) => ({
        ...ri,
        quantity: Number(ri.quantity),
        refundAmount: Number(ri.refundAmount),
        product: ri.product ? productToPlain(ri.product) : null,
      })),
    })),
  };
}

// ── RETURNS ──

export async function createReturn(data: CreateReturnFormData): Promise<ActionResult> {
  try {
    const parsed = createReturnSchema.parse(data);
    const storeId = await getOrCreateDefaultStore();

    const sale = await prisma.sale.findFirst({
      where: { id: parsed.saleId, storeId },
      include: {
        items: { include: { product: true } },
        customer: true,
        returns: true,
      },
    });
    if (!sale) return { success: false, error: "გაყიდვა ვერ მოიძებნა." };
    if (sale.status === "VOIDED") return { success: false, error: "გაყიდვა გაუქმებულია." };

    const saleItemsMap = new Map(sale.items.map((i) => [i.productId, i]));
    let totalRefund = 0;
    for (const it of parsed.items) {
      const si = saleItemsMap.get(it.productId);
      if (!si) return { success: false, error: `პროდუქტი ${it.productId} არ არის გაყიდვაში.` };
      const soldQty = Number(si.quantity);
      if (it.quantity > soldQty) {
        return { success: false, error: `პროდუქტი ${si.productName}: დაბრუნების რაოდენობა (${it.quantity}) აღემატება გაყიდულს (${soldQty}).` };
      }
      totalRefund += it.refundAmount;
    }

    await prisma.$transaction(async (tx) => {
      const ret = await tx.saleReturn.create({
        data: {
          saleId: parsed.saleId,
          reason: parsed.reason,
          refundAmount: toDecimal(totalRefund),
          refundMethod: parsed.refundMethod,
          status: "STORE_RETURN_COMPLETED",
          processedAt: new Date(),
          items: {
            create: parsed.items.map((it) => ({
              productId: it.productId,
              quantity: toDecimal(it.quantity),
              refundAmount: toDecimal(it.refundAmount),
            })),
          },
        },
        include: { items: { include: { product: true } } },
      });

      for (const item of ret.items) {
        const qty = Number(item.quantity);
        const product = item.product;
        const prevStock = Number(product.currentStock);
        const newStock = prevStock + qty;

        await tx.storeProduct.update({
          where: { id: product.id },
          data: { currentStock: toDecimal(newStock) },
        });
        await tx.stockMovement.create({
          data: {
            storeId,
            productId: product.id,
            type: "STOCK_RETURN",
            quantity: toDecimal(qty),
            previousStock: toDecimal(prevStock),
            newStock: toDecimal(newStock),
            reason: `დაბრუნება ${sale.saleNumber}`,
            referenceType: "SaleReturn",
            referenceId: ret.id,
          },
        });
      }

      const totalRefunded = sale.returns
        ? sale.returns.reduce((s, r) => s + Number(r.refundAmount), 0) + totalRefund
        : totalRefund;
      const newStatus =
        Math.abs(totalRefunded - Number(sale.total)) < 0.01
          ? "REFUNDED"
          : "PARTIAL_REFUND";

      await tx.sale.update({
        where: { id: parsed.saleId },
        data: { status: newStatus },
      });

      if (sale.customerId && sale.customer) {
        await tx.storeCustomer.update({
          where: { id: sale.customerId },
          data: {
            totalPurchases: { decrement: toDecimal(totalRefund) },
          },
        });
      }
    });

    revalidatePath("/sales");
    revalidatePath(`/sales/${parsed.saleId}`);
    revalidatePath("/sales/returns");
    revalidatePath("/inventory");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "შეცდომა" };
  }
}

export async function getReturns(params?: {
  storeId?: string;
  page?: number;
  limit?: number;
  saleId?: string;
}) {
  const sid = params?.storeId ?? (await getOrCreateDefaultStore());
  const page = params?.page ?? 1;
  const limit = Math.min(params?.limit ?? 20, 100);
  const skip = (page - 1) * limit;

  const where = {
    sale: {
      storeId: sid,
      ...(params?.saleId && { id: params.saleId }),
    },
  };

  const [returns, total] = await Promise.all([
    prisma.saleReturn.findMany({
      where,
      include: { sale: { select: { id: true, saleNumber: true, createdAt: true } }, items: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.saleReturn.count({ where }),
  ]);

  return {
    returns: returns.map((r) => ({
      ...r,
      refundAmount: Number(r.refundAmount),
      items: r.items.map((i) => ({
        ...i,
        quantity: Number(i.quantity),
        refundAmount: Number(i.refundAmount),
        product: productToPlain(i.product),
      })),
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

// ── DASHBOARD & REPORTS ──

export async function getDashboardStats(params?: { storeId?: string }) {
  const sid = params?.storeId ?? (await getOrCreateDefaultStore());
  const today = new Date();
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setHours(23, 59, 59, 999);

  const [sales, products] = await Promise.all([
    prisma.sale.findMany({
      where: {
        storeId: sid,
        status: "COMPLETED",
        createdAt: { gte: start, lte: end },
      },
      select: { total: true },
    }),
    prisma.storeProduct.findMany({
      where: { storeId: sid, isActive: true },
      select: { currentStock: true, minStock: true },
    }),
  ]);

  const totalSales = sales.reduce((s, x) => s + Number(x.total), 0);
  const txCount = sales.length;
  const avgCheck = txCount > 0 ? totalSales / txCount : 0;
  const lowStockCount = products.filter(
    (p) => Number(p.currentStock) <= Number(p.minStock)
  ).length;

  return {
    dailySales: totalSales,
    transactionCount: txCount,
    averageCheck: avgCheck,
    lowStockCount,
  };
}

export async function getSalesTrend(params?: {
  storeId?: string;
  days?: number;
}) {
  const sid = params?.storeId ?? (await getOrCreateDefaultStore());
  const days = params?.days ?? 7;
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);

  const sales = await prisma.sale.findMany({
    where: {
      storeId: sid,
      status: "COMPLETED",
      createdAt: { gte: start, lte: end },
    },
    select: { total: true, createdAt: true },
  });

  const byDate: Record<string, number> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    byDate[key] = 0;
  }
  for (const s of sales) {
    const key = s.createdAt.toISOString().slice(0, 10);
    if (byDate[key] != null) byDate[key] += Number(s.total);
  }
  return Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, total]) => ({ date, total }));
}

export async function getTopProducts(params?: {
  storeId?: string;
  limit?: number;
  days?: number;
  sortBy?: "revenue" | "quantity";
}) {
  const sid = params?.storeId ?? (await getOrCreateDefaultStore());
  const limit = params?.limit ?? 10;
  const days = params?.days ?? 30;
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  const items = await prisma.saleItem.findMany({
    where: {
      sale: {
        storeId: sid,
        status: "COMPLETED",
        createdAt: { gte: start, lte: end },
      },
    },
    include: { product: true },
  });

  const byProduct: Record<string, { name: string; nameKa: string | null; totalQty: number; totalRev: number }> = {};
  for (const i of items) {
    const id = i.productId;
    if (!byProduct[id]) {
      byProduct[id] = {
        name: i.product.name,
        nameKa: i.product.nameKa,
        totalQty: 0,
        totalRev: 0,
      };
    }
    byProduct[id]!.totalQty += Number(i.quantity);
    byProduct[id]!.totalRev += Number(i.total);
  }

  const sortBy = params?.sortBy ?? "revenue";
  return Object.entries(byProduct)
    .map(([id, v]) => ({ productId: id, ...v }))
    .sort((a, b) =>
      sortBy === "quantity" ? b.totalQty - a.totalQty : b.totalRev - a.totalRev
    )
    .slice(0, limit);
}

export async function getRevenueByCategory(params?: {
  storeId?: string;
  days?: number;
}) {
  const sid = params?.storeId ?? (await getOrCreateDefaultStore());
  const days = params?.days ?? 30;
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  const items = await prisma.saleItem.findMany({
    where: {
      sale: {
        storeId: sid,
        status: "COMPLETED",
        createdAt: { gte: start, lte: end },
      },
    },
    include: { product: { include: { category: true } } },
  });

  const byCat: Record<string, { name: string; nameKa: string | null; total: number }> = {
    __none: { name: "შეუკვეთავი", nameKa: "შეუკვეთავი", total: 0 },
  };
  for (const i of items) {
    const cat = i.product.category;
    const key = cat?.id ?? "__none";
    if (!byCat[key])
      byCat[key] = {
        name: cat?.name ?? "შეუკვეთავი",
        nameKa: cat?.nameKa ?? null,
        total: 0,
      };
    byCat[key]!.total += Number(i.total);
  }
  return Object.entries(byCat)
    .filter(([, v]) => v.total > 0)
    .map(([id, v]) => ({ categoryId: id, ...v }))
    .sort((a, b) => b.total - a.total);
}

export async function getHourlySales(params?: {
  storeId?: string;
  days?: number;
}) {
  const sid = params?.storeId ?? (await getOrCreateDefaultStore());
  const days = params?.days ?? 7;
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  const sales = await prisma.sale.findMany({
    where: {
      storeId: sid,
      status: "COMPLETED",
      createdAt: { gte: start, lte: end },
    },
    select: { total: true, createdAt: true },
  });

  const byHour: Record<number, number> = {};
  for (let h = 0; h < 24; h++) byHour[h] = 0;
  for (const s of sales) {
    const h = s.createdAt.getHours();
    byHour[h] += Number(s.total);
  }
  return Object.entries(byHour).map(([hour, total]) => ({
    hour: parseInt(hour, 10),
    total,
  }));
}

// ── Z REPORT (ცვლის დახურვის ანგარიში) ──

export type ZReportData = {
  startDate: string;
  endDate: string;
  totalSalesCount: number;
  totalSalesAmount: number;
  totalSalesQuantity: number;
  byPaymentMethod: { method: string; label: string; amount: number }[];
  returnsCount: number;
  returnsAmount: number;
  netSales: number;
  averageCheck: number;
  topProducts: { productId: string; productName: string; nameKa: string | null; quantity: number; revenue: number }[];
  byCategory: { categoryId: string; categoryName: string; nameKa: string | null; amount: number }[];
};

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "ნაღდი",
  CARD: "ბარათი",
  BANK_TRANSFER: "ბანკის გადარიცხვა",
  CHECK: "ჩეკი",
};

export async function generateZReport(params?: {
  storeId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<ZReportData | null> {
  const sid = params?.storeId ?? (await getOrCreateDefaultStore());
  const now = new Date();

  let start: Date;
  let end: Date;

  if (params?.startDate && params?.endDate) {
    start = new Date(params.startDate);
    end = new Date(params.endDate);
  } else {
    // ბოლო ცვლა = დღის დასაწყისიდან ახლამდე
    start = new Date(now);
    start.setHours(0, 0, 0, 0);
    end = new Date(now);
    end.setHours(23, 59, 59, 999);
  }

  const [sales, returnsInPeriod] = await Promise.all([
    prisma.sale.findMany({
      where: {
        storeId: sid,
        status: "COMPLETED",
        createdAt: { gte: start, lte: end },
      },
      include: {
        items: { include: { product: { include: { category: true } } } },
        payments: true,
      },
    }),
    prisma.saleReturn.findMany({
      where: {
        sale: { storeId: sid },
        createdAt: { gte: start, lte: end },
      },
      select: { refundAmount: true },
    }),
  ]);

  let totalSalesAmount = 0;
  let totalSalesQuantity = 0;
  const byMethod: Record<string, number> = {};
  const byProduct: Record<string, { name: string; nameKa: string | null; qty: number; rev: number }> = {};
  const byCategory: Record<string, { name: string; nameKa: string | null; amount: number }> = {
    __none: { name: "შეუკვეთავი", nameKa: "შეუკვეთავი", amount: 0 },
  };

  for (const s of sales) {
    totalSalesAmount += Number(s.total);
    for (const i of s.items) {
      totalSalesQuantity += Number(i.quantity);
      const pid = i.productId;
      if (!byProduct[pid]) {
        byProduct[pid] = {
          name: i.productName,
          nameKa: i.product?.nameKa ?? null,
          qty: 0,
          rev: 0,
        };
      }
      byProduct[pid]!.qty += Number(i.quantity);
      byProduct[pid]!.rev += Number(i.total);

      const cat = i.product?.category;
      const cid = cat?.id ?? "__none";
      if (!byCategory[cid]) {
        byCategory[cid] = {
          name: cat?.name ?? "შეუკვეთავი",
          nameKa: cat?.nameKa ?? null,
          amount: 0,
        };
      }
      byCategory[cid]!.amount += Number(i.total);
    }
    for (const p of s.payments) {
      const m = p.method;
      byMethod[m] = (byMethod[m] ?? 0) + Number(p.amount);
    }
  }

  const returnsCount = returnsInPeriod.length;
  const returnsAmount = returnsInPeriod.reduce(
    (sum, r) => sum + Number(r.refundAmount),
    0
  );

  const netSales = totalSalesAmount - returnsAmount;
  const averageCheck = sales.length > 0 ? totalSalesAmount / sales.length : 0;

  const topProducts = Object.entries(byProduct)
    .map(([productId, v]) => ({ productId, ...v }))
    .sort((a, b) => b.rev - a.rev)
    .slice(0, 10)
    .map(({ productId, name, nameKa, qty, rev }) => ({
      productId,
      productName: name,
      nameKa,
      quantity: qty,
      revenue: rev,
    }));

  const byCategoryList = Object.entries(byCategory)
    .filter(([, v]) => v.amount > 0)
    .map(([categoryId, v]) => ({
      categoryId,
      categoryName: v.name,
      nameKa: v.nameKa,
      amount: v.amount,
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    totalSalesCount: sales.length,
    totalSalesAmount,
    totalSalesQuantity,
    byPaymentMethod: Object.entries(byMethod).map(([method, amount]) => ({
      method,
      label: PAYMENT_LABELS[method] ?? method,
      amount,
    })),
    returnsCount,
    returnsAmount,
    netSales,
    averageCheck,
    topProducts,
    byCategory: byCategoryList,
  };
}

export async function getSalesReport(params?: {
  storeId?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const sid = params?.storeId ?? (await getOrCreateDefaultStore());
  const from = params?.dateFrom
    ? new Date(params.dateFrom)
    : (() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d;
      })();
  const to = params?.dateTo ? new Date(params.dateTo) : new Date();
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);

  const sales = await prisma.sale.findMany({
    where: {
      storeId: sid,
      status: "COMPLETED",
      createdAt: { gte: from, lte: to },
    },
    include: { items: true, payments: true },
    orderBy: { createdAt: "asc" },
  });

  const totalRevenue = sales.reduce((s, x) => s + Number(x.total), 0);
  return {
    dateFrom: from.toISOString().slice(0, 10),
    dateTo: to.toISOString().slice(0, 10),
    totalRevenue,
    transactionCount: sales.length,
    rows: sales.map((s) => ({
      saleNumber: s.saleNumber,
      createdAt: s.createdAt,
      total: Number(s.total),
    })),
  };
}

export async function getInventoryValue(params?: { storeId?: string }) {
  const sid = params?.storeId ?? (await getOrCreateDefaultStore());
  const products = await prisma.storeProduct.findMany({
    where: { storeId: sid, isActive: true },
    select: { currentStock: true, costPrice: true, sellingPrice: true },
  });

  let totalCost = 0;
  let totalRetail = 0;
  for (const p of products) {
    const qty = Number(p.currentStock);
    totalCost += qty * Number(p.costPrice);
    totalRetail += qty * Number(p.sellingPrice);
  }
  return {
    totalCost,
    totalRetail,
    productCount: products.length,
  };
}

export async function getProfitReport(params?: {
  storeId?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const sid = params?.storeId ?? (await getOrCreateDefaultStore());
  const from = params?.dateFrom
    ? new Date(params.dateFrom)
    : (() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d;
      })();
  const to = params?.dateTo ? new Date(params.dateTo) : new Date();
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);

  const sales = await prisma.sale.findMany({
    where: {
      storeId: sid,
      status: "COMPLETED",
      createdAt: { gte: from, lte: to },
    },
    include: { items: { include: { product: true } } },
  });

  let revenue = 0;
  let cost = 0;
  for (const s of sales) {
    revenue += Number(s.total);
    for (const i of s.items) {
      cost += Number(i.quantity) * Number(i.costPrice);
    }
  }
  const profit = revenue - cost;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  return {
    dateFrom: from.toISOString().slice(0, 10),
    dateTo: to.toISOString().slice(0, 10),
    revenue,
    cost,
    profit,
    marginPercent: margin,
  };
}

export async function getEmployeePerformance(params?: {
  storeId?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const sid = params?.storeId ?? (await getOrCreateDefaultStore());
  const from = params?.dateFrom
    ? new Date(params.dateFrom)
    : (() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d;
      })();
  const to = params?.dateTo ? new Date(params.dateTo) : new Date();
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);

  const sales = await prisma.sale.findMany({
    where: {
      storeId: sid,
      status: "COMPLETED",
      createdAt: { gte: from, lte: to },
      employeeId: { not: null },
    },
    include: { employee: true },
  });

  const byEmp: Record<string, { name: string; total: number; count: number }> = {};
  for (const s of sales) {
    const eid = s.employeeId ?? "__none";
    const emp = s.employee;
    if (!byEmp[eid]) {
      byEmp[eid] = {
        name: emp ? `${emp.firstName} ${emp.lastName}` : "უცნობი",
        total: 0,
        count: 0,
      };
    }
    byEmp[eid]!.total += Number(s.total);
    byEmp[eid]!.count += 1;
  }

  return Object.entries(byEmp)
    .map(([id, v]) => ({ employeeId: id, ...v }))
    .sort((a, b) => b.total - a.total);
}

// ── SETTINGS ──

export async function getStoreSettings(storeId?: string) {
  const sid = storeId ?? (await getOrCreateDefaultStore());
  const store = await prisma.store.findFirst({
    where: { id: sid },
    include: {
      taxRules: true,
      paymentMethods: { orderBy: { sortOrder: "asc" } },
      receiptConfig: true,
    },
  });
  if (!store) return null;
  return {
    ...store,
    taxRules: store.taxRules.map((t) => ({
      ...t,
      rate: Number(t.rate),
    })),
  };
}

export async function updateStoreSettings(
  storeId: string,
  data: {
    name?: string;
    currency?: string;
    address?: string;
    phone?: string;
    email?: string;
    taxId?: string;
    timezone?: string;
    logoUrl?: string | null;
  }
): Promise<ActionResult> {
  try {
    await prisma.store.updateMany({
      where: { id: storeId },
      data: {
        ...(data.name != null && { name: data.name }),
        ...(data.currency != null && { currency: data.currency }),
        ...(data.address !== undefined && { address: data.address || null }),
        ...(data.phone !== undefined && { phone: data.phone || null }),
        ...(data.email !== undefined && { email: data.email || null }),
        ...(data.taxId !== undefined && { taxId: data.taxId || null }),
        ...(data.timezone != null && { timezone: data.timezone }),
        ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl || null }),
      },
    });
    revalidatePath("/settings/store");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "შეცდომა" };
  }
}

// ── TAX RULES ──

export async function getTaxRules(storeId?: string) {
  const sid = storeId ?? (await getOrCreateDefaultStore());
  return prisma.storeTaxRule.findMany({
    where: { storeId: sid },
    orderBy: { name: "asc" },
  }).then((r) => r.map((t) => ({ ...t, rate: Number(t.rate) })));
}

export async function createTaxRule(data: {
  name: string;
  rate: number;
  isDefault?: boolean;
  isActive?: boolean;
}): Promise<ActionResult> {
  try {
    const storeId = await getOrCreateDefaultStore();
    if (data.isDefault) {
      await prisma.storeTaxRule.updateMany({
        where: { storeId },
        data: { isDefault: false },
      });
    }
    await prisma.storeTaxRule.create({
      data: {
        storeId,
        name: data.name,
        rate: toDecimal(data.rate),
        isDefault: data.isDefault ?? false,
        isActive: data.isActive ?? true,
      },
    });
    revalidatePath("/settings/tax");
    revalidatePath("/settings/tax-rules");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "შეცდომა" };
  }
}

export async function updateTaxRule(
  id: string,
  data: { name?: string; rate?: number; isDefault?: boolean; isActive?: boolean }
): Promise<ActionResult> {
  try {
    const storeId = await getOrCreateDefaultStore();
    if (data.isDefault) {
      await prisma.storeTaxRule.updateMany({
        where: { storeId },
        data: { isDefault: false },
      });
    }
    await prisma.storeTaxRule.updateMany({
      where: { id, storeId },
      data: {
        ...(data.name != null && { name: data.name }),
        ...(data.rate != null && { rate: toDecimal(data.rate) }),
        ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
    revalidatePath("/settings/tax");
    revalidatePath("/settings/tax-rules");
    return { success: true, id };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "შეცდომა" };
  }
}

export async function deleteTaxRule(id: string): Promise<ActionResult> {
  try {
    const storeId = await getOrCreateDefaultStore();
    await prisma.storeTaxRule.deleteMany({ where: { id, storeId } });
    revalidatePath("/settings/tax");
    revalidatePath("/settings/tax-rules");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "შეცდომა" };
  }
}

// ── PAYMENT CONFIGS ──

export async function getPaymentConfigs(storeId?: string) {
  const sid = storeId ?? (await getOrCreateDefaultStore());
  return prisma.storePaymentConfig.findMany({
    where: { storeId: sid },
    orderBy: { sortOrder: "asc" },
  });
}

export async function createPaymentConfig(data: {
  name: string;
  type: "CASH" | "CARD" | "BANK_TRANSFER" | "CHECK";
  sortOrder?: number;
}): Promise<ActionResult> {
  try {
    const storeId = await getOrCreateDefaultStore();
    await prisma.storePaymentConfig.create({
      data: {
        storeId,
        name: data.name,
        type: data.type,
        sortOrder: data.sortOrder ?? 0,
      },
    });
    revalidatePath("/settings/payment");
    revalidatePath("/settings/payment-methods");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "შეცდომა" };
  }
}

export async function updatePaymentConfig(
  id: string,
  data: { name?: string; type?: "CASH" | "CARD" | "BANK_TRANSFER" | "CHECK"; isActive?: boolean; sortOrder?: number }
): Promise<ActionResult> {
  try {
    const storeId = await getOrCreateDefaultStore();
    await prisma.storePaymentConfig.updateMany({
      where: { id, storeId },
      data: {
        ...(data.name != null && { name: data.name }),
        ...(data.type != null && { type: data.type }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.sortOrder != null && { sortOrder: data.sortOrder }),
      },
    });
    revalidatePath("/settings/payment");
    revalidatePath("/settings/payment-methods");
    return { success: true, id };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "შეცდომა" };
  }
}

export async function deletePaymentConfig(id: string): Promise<ActionResult> {
  try {
    const storeId = await getOrCreateDefaultStore();
    await prisma.storePaymentConfig.deleteMany({ where: { id, storeId } });
    revalidatePath("/settings/payment");
    revalidatePath("/settings/payment-methods");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "შეცდომა" };
  }
}

// ── RECEIPT CONFIG ──

export async function getReceiptConfig(storeId?: string) {
  const sid = storeId ?? (await getOrCreateDefaultStore());
  return prisma.storeReceiptConfig.findUnique({
    where: { storeId: sid },
  });
}

export async function upsertReceiptConfig(data: {
  headerText?: string | null;
  footerText?: string | null;
  showLogo?: boolean;
  showTaxId?: boolean;
  showBarcode?: boolean;
  paperWidth?: number;
}): Promise<ActionResult> {
  try {
    const storeId = await getOrCreateDefaultStore();
    await prisma.storeReceiptConfig.upsert({
      where: { storeId },
      create: {
        storeId,
        headerText: data.headerText ?? null,
        footerText: data.footerText ?? null,
        showLogo: data.showLogo ?? true,
        showTaxId: data.showTaxId ?? true,
        showBarcode: data.showBarcode ?? false,
        paperWidth: data.paperWidth ?? 80,
      },
      update: {
        ...(data.headerText !== undefined && { headerText: data.headerText ?? null }),
        ...(data.footerText !== undefined && { footerText: data.footerText ?? null }),
        ...(data.showLogo !== undefined && { showLogo: data.showLogo }),
        ...(data.showTaxId !== undefined && { showTaxId: data.showTaxId }),
        ...(data.showBarcode !== undefined && { showBarcode: data.showBarcode }),
        ...(data.paperWidth != null && { paperWidth: data.paperWidth }),
      },
    });
    revalidatePath("/settings/receipt");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "შეცდომა" };
  }
}

// ── EMPLOYEES ──

export async function getEmployeeById(id: string, storeId?: string) {
  const sid = storeId ?? (await getOrCreateDefaultStore());
  return prisma.storeEmployee.findFirst({
    where: { id, storeId: sid },
  });
}

export async function createEmployee(data: {
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  role?: "STORE_OWNER" | "STORE_MANAGER" | "STORE_CASHIER" | "STORE_INVENTORY_CLERK";
  pin?: string;
}): Promise<ActionResult> {
  try {
    const storeId = await getOrCreateDefaultStore();
    const pinHash = data.pin?.trim()
      ? await bcrypt.hash(data.pin.trim(), 10)
      : null;
    const emp = await prisma.storeEmployee.create({
      data: {
        storeId,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || null,
        email: data.email || null,
        role: data.role ?? "STORE_CASHIER",
        pin: pinHash,
      },
    });
    revalidatePath("/settings/employees");
    return { success: true, id: emp.id };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "შეცდომა" };
  }
}

export async function updateEmployee(
  id: string,
  data: Partial<{
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    role: "STORE_OWNER" | "STORE_MANAGER" | "STORE_CASHIER" | "STORE_INVENTORY_CLERK";
    pin: string;
    isActive: boolean;
  }>
): Promise<ActionResult> {
  try {
    const storeId = await getOrCreateDefaultStore();
    const existing = await prisma.storeEmployee.findFirst({ where: { id, storeId } });
    if (!existing) return { success: false, error: "თანამშრომელი ვერ მოიძებნა." };
    const pinHash =
      data.pin !== undefined
        ? data.pin?.trim()
          ? await bcrypt.hash(data.pin.trim(), 10)
          : null
        : undefined;
    await prisma.storeEmployee.updateMany({
      where: { id, storeId },
      data: {
        ...(data.firstName != null && { firstName: data.firstName }),
        ...(data.lastName != null && { lastName: data.lastName }),
        ...(data.phone !== undefined && { phone: data.phone || null }),
        ...(data.email !== undefined && { email: data.email || null }),
        ...(data.role != null && { role: data.role }),
        ...(pinHash !== undefined && { pin: pinHash }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
    revalidatePath("/settings/employees");
    return { success: true, id };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "შეცდომა" };
  }
}

export async function deleteEmployee(id: string): Promise<ActionResult> {
  try {
    const storeId = await getOrCreateDefaultStore();
    await prisma.storeEmployee.deleteMany({ where: { id, storeId } });
    revalidatePath("/settings/employees");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "შეცდომა" };
  }
}

// ── IMPORTS ──

export async function importProducts(params: {
  rows: Record<string, string>[];
  mapping: Record<string, string>;
}): Promise<{ success: true; imported: number; errors: string[] } | { success: false; error: string }> {
  try {
    const storeId = await getOrCreateDefaultStore();
    const mapping = params.mapping as Record<string, string>;
    const errors: string[] = [];
    let imported = 0;

    for (let i = 0; i < params.rows.length; i++) {
      const row = params.rows[i]!;
      const name = (mapping.name ? row[mapping.name] : row["name"] ?? row["Name"] ?? "").trim();
      const sku = (mapping.sku ? row[mapping.sku] : row["sku"] ?? row["SKU"] ?? "").trim();
      if (!name || !sku) {
        errors.push(`რიგი ${i + 2}: სახელი და SKU სავალდებულოა`);
        continue;
      }
      const costPrice = parseFloat((mapping.costPrice ? row[mapping.costPrice] : row["costPrice"] ?? row["cost"] ?? "0") || "0") || 0;
      const sellingPrice = parseFloat((mapping.sellingPrice ? row[mapping.sellingPrice] : row["sellingPrice"] ?? row["price"] ?? "0") || "0") || 0;
      if (sellingPrice <= 0) {
        errors.push(`რიგი ${i + 2}: გასაყიდი ფასი უნდა იყოს 0-ზე მეტი`);
        continue;
      }
      try {
        const exists = await prisma.storeProduct.findUnique({
          where: { storeId_sku: { storeId, sku } },
        });
        if (exists) {
          errors.push(`რიგი ${i + 2}: SKU "${sku}" უკვე არსებობს`);
          continue;
        }
        const product = await prisma.storeProduct.create({
          data: {
            storeId,
            name,
            nameKa: (mapping.nameKa ? row[mapping.nameKa] : row["nameKa"] ?? "").trim() || null,
            sku,
            barcode: (mapping.barcode ? row[mapping.barcode] : row["barcode"] ?? "").trim() || null,
            costPrice: toDecimal(costPrice),
            sellingPrice: toDecimal(sellingPrice),
            currentStock: toDecimal((mapping.currentStock ? row[mapping.currentStock] : row["stock"] ?? row["currentStock"] ?? "0") || "0"),
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
      } catch {
        errors.push(`რიგი ${i + 2}: შეცდომა`);
      }
    }
    revalidatePath("/products");
    return { success: true, imported, errors };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "შეცდომა" };
  }
}

export async function importCustomers(params: {
  rows: Record<string, string>[];
  mapping: Record<string, string>;
}): Promise<{ success: true; imported: number; errors: string[] } | { success: false; error: string }> {
  try {
    const storeId = await getOrCreateDefaultStore();
    const mapping = params.mapping;
    const errors: string[] = [];
    let imported = 0;

    for (let i = 0; i < params.rows.length; i++) {
      const row = params.rows[i]!;
      const firstName = (mapping.firstName ? row[mapping.firstName] : row["firstName"] ?? row["FirstName"] ?? row["name"] ?? "").trim();
      if (!firstName) {
        errors.push(`რიგი ${i + 2}: სახელი სავალდებულოა`);
        continue;
      }
      try {
        await prisma.storeCustomer.create({
          data: {
            storeId,
            firstName,
            lastName: (mapping.lastName ? row[mapping.lastName] : row["lastName"] ?? "").trim() || null,
            phone: (mapping.phone ? row[mapping.phone] : row["phone"] ?? "").trim() || null,
            email: (mapping.email ? row[mapping.email] : row["email"] ?? "").trim() || null,
            address: (mapping.address ? row[mapping.address] : row["address"] ?? "").trim() || null,
          },
        });
        imported++;
      } catch {
        errors.push(`რიგი ${i + 2}: შეცდომა`);
      }
    }
    revalidatePath("/customers");
    return { success: true, imported, errors };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "შეცდომა" };
  }
}

export async function importSuppliers(params: {
  rows: Record<string, string>[];
  mapping: Record<string, string>;
}): Promise<{ success: true; imported: number; errors: string[] } | { success: false; error: string }> {
  try {
    const storeId = await getOrCreateDefaultStore();
    const mapping = params.mapping;
    const errors: string[] = [];
    let imported = 0;

    for (let i = 0; i < params.rows.length; i++) {
      const row = params.rows[i]!;
      const name = (mapping.name ? row[mapping.name] : row["name"] ?? row["Name"] ?? "").trim();
      if (!name) {
        errors.push(`რიგი ${i + 2}: სახელი სავალდებულოა`);
        continue;
      }
      try {
        const exists = await prisma.storeSupplier.findUnique({
          where: { storeId_name: { storeId, name } },
        });
        if (exists) {
          errors.push(`რიგი ${i + 2}: მომწოდებელი "${name}" უკვე არსებობს`);
          continue;
        }
        await prisma.storeSupplier.create({
          data: {
            storeId,
            name,
            contactPerson: (mapping.contactPerson ? row[mapping.contactPerson] : row["contactPerson"] ?? "").trim() || null,
            phone: (mapping.phone ? row[mapping.phone] : row["phone"] ?? "").trim() || null,
            email: (mapping.email ? row[mapping.email] : row["email"] ?? "").trim() || null,
            address: (mapping.address ? row[mapping.address] : row["address"] ?? "").trim() || null,
          },
        });
        imported++;
      } catch {
        errors.push(`რიგი ${i + 2}: შეცდომა`);
      }
    }
    revalidatePath("/purchases/suppliers");
    return { success: true, imported, errors };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "შეცდომა" };
  }
}

export async function importCategories(params: {
  rows: Record<string, string>[];
  mapping: Record<string, string>;
}): Promise<{ success: true; imported: number; errors: string[] } | { success: false; error: string }> {
  try {
    const storeId = await getOrCreateDefaultStore();
    const mapping = params.mapping;
    const errors: string[] = [];
    let imported = 0;

    for (let i = 0; i < params.rows.length; i++) {
      const row = params.rows[i]!;
      const name = (mapping.name ? row[mapping.name] : row["name"] ?? row["Name"] ?? "").trim();
      if (!name) {
        errors.push(`რიგი ${i + 2}: სახელი სავალდებულოა`);
        continue;
      }
      const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      if (!slug) {
        errors.push(`რიგი ${i + 2}: ვერ მოიძებნა slug`);
        continue;
      }
      try {
        const exists = await prisma.productCategory.findFirst({
          where: { storeId, slug },
        });
        if (exists) {
          errors.push(`რიგი ${i + 2}: კატეგორია "${name}" უკვე არსებობს`);
          continue;
        }
        let finalSlug = slug;
        let n = 0;
        while (await prisma.productCategory.findFirst({ where: { storeId, slug: finalSlug } })) {
          n++;
          finalSlug = `${slug}-${n}`;
        }
        await prisma.productCategory.create({
          data: {
            storeId,
            name,
            nameKa: (mapping.nameKa ? row[mapping.nameKa] : row["nameKa"] ?? name).trim() || null,
            slug: finalSlug,
          },
        });
        imported++;
      } catch {
        errors.push(`რიგი ${i + 2}: შეცდომა`);
      }
    }
    revalidatePath("/products/categories");
    return { success: true, imported, errors };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "შეცდომა" };
  }
}

// ── DEVICE CONFIG ──

export async function getDeviceConfigs(storeId?: string) {
  const sid = storeId ?? (await getOrCreateDefaultStore());
  const db = prisma as { storeDeviceConfig?: { findMany: (opts: object) => Promise<{ id: string; deviceType: string; name: string; connectionType: string; settings: unknown; isActive: boolean }[]> } };
  if (!db.storeDeviceConfig) return [];
  return db.storeDeviceConfig.findMany({
    where: { storeId: sid },
    orderBy: { deviceType: "asc" },
  });
}

export async function upsertDeviceConfig(data: {
  deviceType: string;
  name: string;
  connectionType: string;
  settings: Record<string, unknown>;
  isActive?: boolean;
}): Promise<ActionResult> {
  try {
    const storeId = await getOrCreateDefaultStore();
    const db = prisma as {
      storeDeviceConfig?: {
        findFirst: (opts: object) => Promise<{ id: string } | null>;
        create: (opts: object) => Promise<{ id: string }>;
        update: (opts: object) => Promise<unknown>;
      };
    };
    if (!db.storeDeviceConfig) return { success: false, error: "Device model not found" };
    const existing = await db.storeDeviceConfig.findFirst({
      where: { storeId, deviceType: data.deviceType },
    });
    if (existing) {
      await db.storeDeviceConfig.update({
        where: { id: existing.id },
        data: {
          name: data.name,
          connectionType: data.connectionType,
          settings: data.settings as object,
          isActive: data.isActive ?? true,
        },
      });
    } else {
      await db.storeDeviceConfig.create({
        data: {
          storeId,
          deviceType: data.deviceType,
          name: data.name,
          connectionType: data.connectionType,
          settings: data.settings as object,
          isActive: data.isActive ?? true,
        },
      });
    }
    revalidatePath("/settings/hardware");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "შეცდომა" };
  }
}

export async function deleteDeviceConfig(id: string): Promise<ActionResult> {
  try {
    const storeId = await getOrCreateDefaultStore();
    const db = prisma as { storeDeviceConfig?: { deleteMany: (opts: object) => Promise<unknown> } };
    if (!db.storeDeviceConfig) return { success: false, error: "Device model not found" };
    await db.storeDeviceConfig.deleteMany({ where: { id, storeId } });
    revalidatePath("/settings/hardware");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "შეცდომა" };
  }
}

export async function getIntegration(type: "RS_GE", storeId?: string) {
  const sid = storeId ?? (await getOrCreateDefaultStore());
  const db = prisma as {
    storeIntegration?: {
      findFirst: (opts: object) => Promise<{
        id: string;
        type: string;
        name: string;
        credentials: unknown;
        settings: unknown;
        isActive: boolean;
      } | null>;
    };
  };
  if (!db.storeIntegration) return null;
  return db.storeIntegration.findFirst({
    where: { storeId: sid, type },
  });
}

export async function upsertRSGeIntegration(data: {
  username: string;
  password?: string;
  autoWaybill?: boolean;
}): Promise<ActionResult> {
  try {
    const storeId = await getOrCreateDefaultStore();
    const db = prisma as {
      storeIntegration?: {
        findFirst: (opts: object) => Promise<{ id: string; credentials: unknown } | null>;
        create: (opts: object) => Promise<unknown>;
        update: (opts: object) => Promise<unknown>;
      };
    };
    if (!db.storeIntegration) return { success: false, error: "Integration model not found" };
    const existing = await db.storeIntegration.findFirst({
      where: { storeId, type: "RS_GE" },
    });
    const existingCreds = (existing?.credentials ?? {}) as { username?: string; password?: string };
    const credentials = {
      username: data.username,
      password: data.password && data.password.trim() ? data.password : existingCreds.password ?? "",
    };
    const settings = { autoWaybill: data.autoWaybill ?? false };
    if (existing) {
      await db.storeIntegration.update({
        where: { id: existing.id },
        data: { credentials: credentials as object, settings: settings as object },
      });
    } else {
      if (!credentials.password) return { success: false, error: "პაროლი სავალდებულოა" };
      await db.storeIntegration.create({
        data: {
          storeId,
          type: "RS_GE",
          name: "RS.ge",
          credentials: credentials as object,
          settings: settings as object,
        },
      });
    }
    revalidatePath("/settings/integrations");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "შეცდომა" };
  }
}

export async function getPosPrintConfig() {
  const [store, receiptConfig, devices] = await Promise.all([
    getStoreSettings(),
    getReceiptConfig(),
    getDeviceConfigs(),
  ]);
  const printer = devices.find(
    (d) => d.deviceType === "RECEIPT_PRINTER" && d.isActive
  );
  const settings = printer?.settings as { connectionType?: string; ip?: string; port?: number } | undefined;
  return {
    store,
    receiptConfig,
    printerConfig: printer && settings
      ? {
          connectionType: (settings.connectionType ?? "NETWORK") as "USB" | "SERIAL" | "NETWORK",
          ip: settings.ip,
          port: settings.port,
        }
      : null,
  };
}

// ── MULTI-LOCATION / STORES ──

export async function getStores() {
  const session = await getServerSession(authOptions);
  const tenantId = (session?.user as { tenantId?: string } | undefined)?.tenantId;
  if (!tenantId) return [];
  return prisma.store.findMany({
    where: { tenantId, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, address: true, phone: true, slug: true },
  });
}

export async function createStore(data: {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
}): Promise<ActionResult> {
  try {
    const session = await getServerSession(authOptions);
    const tenantId = (session?.user as { tenantId?: string } | undefined)?.tenantId;
    if (!tenantId) return { success: false, error: "ავტორიზაცია საჭიროა" };
    const slug = `store-${Date.now().toString(36)}`;
    await prisma.store.create({
      data: {
        tenantId,
        name: data.name,
        slug,
        address: data.address || null,
        phone: data.phone || null,
        email: data.email || null,
      },
    });
    revalidatePath("/settings/locations");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "შეცდომა" };
  }
}

export async function updateStore(
  id: string,
  data: { name?: string; address?: string; phone?: string; email?: string; isActive?: boolean }
): Promise<ActionResult> {
  try {
    const session = await getServerSession(authOptions);
    const tenantId = (session?.user as { tenantId?: string } | undefined)?.tenantId;
    if (!tenantId) return { success: false, error: "ავტორიზაცია საჭიროა" };
    await prisma.store.updateMany({
      where: { id, tenantId },
      data: {
        ...(data.name != null && { name: data.name }),
        ...(data.address !== undefined && { address: data.address || null }),
        ...(data.phone !== undefined && { phone: data.phone || null }),
        ...(data.email !== undefined && { email: data.email || null }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
    revalidatePath("/settings/locations");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "შეცდომა" };
  }
}

// ── STOCK TRANSFERS ──

export async function getTransferOrders(params?: { storeId?: string; status?: string }) {
  const sid = params?.storeId ?? (await getOrCreateDefaultStore());
  const validStatuses = ["DRAFT", "SENT", "RECEIVED"] as const;
  const status = params?.status && validStatuses.includes(params.status as (typeof validStatuses)[number])
    ? (params.status as (typeof validStatuses)[number])
    : undefined;
  const where = {
    OR: [{ fromStoreId: sid }, { toStoreId: sid }],
    ...(status && { status }),
  };
  return prisma.transferOrder.findMany({
    where,
    include: {
      fromStore: { select: { name: true } },
      toStore: { select: { name: true } },
      items: { include: { product: { select: { name: true, nameKa: true, sku: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createTransferOrder(params: {
  fromStoreId: string;
  toStoreId: string;
  items: { productId: string; quantity: number; unitCost?: number }[];
  notes?: string;
}): Promise<ActionResult> {
  try {
    if (params.fromStoreId === params.toStoreId) {
      return { success: false, error: "ფილიალები უნდა იყოს სხვადასხვა" };
    }
    const last = await prisma.transferOrder.findFirst({
      where: { fromStoreId: params.fromStoreId },
      orderBy: { transferNumber: "desc" },
      select: { transferNumber: true },
    });
    const n = last?.transferNumber ? parseInt(last.transferNumber.replace(/\D/g, ""), 10) + 1 : 1;
    const transferNumber = `TR-${String(n).padStart(4, "0")}`;

    await prisma.transferOrder.create({
      data: {
        fromStoreId: params.fromStoreId,
        toStoreId: params.toStoreId,
        transferNumber,
        notes: params.notes ?? null,
        items: {
          create: params.items.map((it) => ({
            productId: it.productId,
            quantity: it.quantity,
            unitCost: it.unitCost ?? null,
          })),
        },
      },
    });
    revalidatePath("/inventory/transfers");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "შეცდომა" };
  }
}

export async function sendTransferOrder(id: string): Promise<ActionResult> {
  try {
    const storeId = await getOrCreateDefaultStore();
    const order = await prisma.transferOrder.findFirst({
      where: { id, fromStoreId: storeId, status: "DRAFT" },
      include: { items: { include: { product: true } } },
    });
    if (!order) return { success: false, error: "გადაცემა ვერ მოიძებნა" };

    await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        const qty = Number(item.quantity);
        const prev = Number(item.product.currentStock);
        const newStock = Math.max(0, prev - qty);
        await tx.storeProduct.update({
          where: { id: item.productId },
          data: { currentStock: toDecimal(newStock) },
        });
        await tx.stockMovement.create({
          data: {
            storeId: order.fromStoreId,
            productId: item.productId,
            type: "STOCK_OUT",
            quantity: toDecimal(qty),
            previousStock: toDecimal(prev),
            newStock: toDecimal(newStock),
            reason: `გადაცემა ${order.transferNumber}`,
            referenceType: "TransferOrder",
            referenceId: order.id,
          },
        });
      }
      await tx.transferOrder.update({
        where: { id },
        data: { status: "SENT", sentAt: new Date() },
      });
    });
    revalidatePath("/inventory/transfers");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "შეცდომა" };
  }
}

export async function receiveTransferOrder(id: string): Promise<ActionResult> {
  try {
    const storeId = await getOrCreateDefaultStore();
    const order = await prisma.transferOrder.findFirst({
      where: { id, toStoreId: storeId, status: "SENT" },
      include: { items: { include: { product: true } } },
    });
    if (!order) return { success: false, error: "გადაცემა ვერ მოიძებნა" };

    await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        const fromProduct = item.product;
        const toProduct = await tx.storeProduct.findFirst({
          where: { storeId, sku: fromProduct.sku },
        });
        if (!toProduct) continue;
        const qty = Number(item.quantity);
        const prev = Number(toProduct.currentStock);
        const newStock = prev + qty;
        await tx.storeProduct.update({
          where: { id: toProduct.id },
          data: { currentStock: toDecimal(newStock) },
        });
        await tx.stockMovement.create({
          data: {
            storeId,
            productId: toProduct.id,
            type: "STOCK_IN",
            quantity: toDecimal(qty),
            previousStock: toDecimal(prev),
            newStock: toDecimal(newStock),
            reason: `მიღება ${order.transferNumber}`,
            referenceType: "TransferOrder",
            referenceId: order.id,
          },
        });
      }
      await tx.transferOrder.update({
        where: { id },
        data: { status: "RECEIVED", receivedAt: new Date() },
      });
    });
    revalidatePath("/inventory/transfers");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "შეცდომა" };
  }
}

// ── LOYALTY ──

export async function getLoyaltyConfig(storeId?: string) {
  const sid = storeId ?? (await getOrCreateDefaultStore());
  return prisma.storeLoyaltyConfig.findUnique({
    where: { storeId: sid },
  });
}

export async function upsertLoyaltyConfig(data: {
  pointsPerGel?: number;
  redemptionRate?: number;
  minRedemptionPoints?: number;
  expirationDays?: number;
  goldDiscountPercent?: number;
  platinumDiscountPercent?: number;
}): Promise<ActionResult> {
  try {
    const storeId = await getOrCreateDefaultStore();
    const existing = await prisma.storeLoyaltyConfig.findUnique({
      where: { storeId },
    });
    const payload = {
      pointsPerGel: data.pointsPerGel ?? 1,
      redemptionRate: data.redemptionRate ?? 100,
      minRedemptionPoints: data.minRedemptionPoints ?? 100,
      expirationDays: data.expirationDays ?? null,
      goldDiscountPercent: data.goldDiscountPercent ?? null,
      platinumDiscountPercent: data.platinumDiscountPercent ?? null,
    };
    if (existing) {
      await prisma.storeLoyaltyConfig.update({
        where: { storeId },
        data: payload,
      });
    } else {
      await prisma.storeLoyaltyConfig.create({
        data: { storeId, ...payload },
      });
    }
    revalidatePath("/settings/loyalty");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "შეცდომა" };
  }
}

export async function getLoyaltyTransactions(customerId: string) {
  return prisma.storeLoyaltyTransaction.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}
