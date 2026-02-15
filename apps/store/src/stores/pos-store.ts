import { create } from "zustand";

export interface PosCartItem {
  productId: string;
  productName: string;
  nameKa?: string | null;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  imageUrl?: string | null;
}

export interface PosCustomer {
  id: string;
  firstName: string;
  lastName?: string | null;
  phone?: string | null;
  loyaltyPoints?: number;
}

export interface PosEmployee {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

export type PosDiscountType = "DISCOUNT_PERCENTAGE" | "DISCOUNT_FIXED" | null;
export type PosPaymentMethod = "CASH" | "CARD" | "BANK_TRANSFER" | "CHECK";

interface PosState {
  items: PosCartItem[];
  customer: PosCustomer | null;
  discount: number;
  discountType: PosDiscountType;
  paymentMethod: PosPaymentMethod;
  currentEmployee: PosEmployee | null;

  addItem: (item: Omit<PosCartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setCustomer: (customer: PosCustomer | null) => void;
  setDiscount: (amount: number, type?: PosDiscountType) => void;
  setPaymentMethod: (method: PosPaymentMethod) => void;
  setCurrentEmployee: (employee: PosEmployee | null) => void;
  clearCart: () => void;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export const usePosStore = create<PosState>((set, get) => ({
  items: [],
  customer: null,
  discount: 0,
  discountType: null,
  paymentMethod: "CASH",
  currentEmployee: null,

  addItem: (item) =>
    set((state) => {
      const qty = item.quantity ?? 1;
      const existing = state.items.find((i) => i.productId === item.productId);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.productId === item.productId
              ? { ...i, quantity: i.quantity + qty }
              : i
          ),
        };
      }
      return {
        items: [
          ...state.items,
          {
            ...item,
            quantity: qty,
          } as PosCartItem,
        ],
      };
    }),

  removeItem: (productId) =>
    set((state) => ({
      items: state.items.filter((i) => i.productId !== productId),
    })),

  updateQuantity: (productId, quantity) =>
    set((state) => {
      if (quantity <= 0) {
        return { items: state.items.filter((i) => i.productId !== productId) };
      }
      return {
        items: state.items.map((i) =>
          i.productId === productId ? { ...i, quantity } : i
        ),
      };
    }),

  setCustomer: (customer) => set({ customer }),

  setDiscount: (amount, type) =>
    set({ discount: round2(amount), discountType: type ?? "DISCOUNT_FIXED" }),

  setPaymentMethod: (method) => set({ paymentMethod: method }),

  setCurrentEmployee: (employee) => set({ currentEmployee: employee }),

  clearCart: () =>
    set({
      items: [],
      customer: null,
      discount: 0,
      discountType: null,
    }),
}));

export function getPosSubtotal(items: PosCartItem[]): number {
  return round2(items.reduce((s, i) => s + i.quantity * i.unitPrice, 0));
}

export function getPosTotal(
  items: PosCartItem[],
  discount: number,
  discountType: PosDiscountType
): number {
  const subtotal = getPosSubtotal(items);
  let afterDiscount = subtotal;
  if (discountType === "DISCOUNT_PERCENTAGE") {
    afterDiscount = subtotal * (1 - discount / 100);
  } else {
    afterDiscount = Math.max(0, subtotal - discount);
  }
  return round2(afterDiscount);
}
