import { create } from 'zustand';

export type OrderType = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';

export type CartItemModifier = {
  name: string;
  price: number;
};

export type CartItem = {
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  modifiers: CartItemModifier[];
  specialInstructions: string;
  kdsStation: string;
};

export type SentItem = {
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: string;
};

export interface POSState {
  orderType: OrderType;
  tableId: string | null;
  tableSessionId: string | null;
  tableLabel: string | null;
  waiterId: string | null;
  waiterName: string | null;
  orderId: string | null;
  orderNumber: string | null;
  items: CartItem[];
  sentItems: SentItem[];
  sessionTotal: number;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  notes: string;
  discountAmount: number;
  discountType: 'fixed' | 'percent';

  setOrderType: (type: OrderType) => void;
  setTable: (tableId: string | null, tableSessionId: string | null, tableLabel?: string | null) => void;
  setOrder: (orderId: string | null, orderNumber?: string | null) => void;
  setWaiterId: (waiterId: string | null) => void;
  setWaiter: (waiterId: string | null, waiterName?: string | null) => void;
  addItem: (item: CartItem) => void;
  updateItemQuantity: (index: number, quantity: number) => void;
  removeItem: (index: number) => void;
  clearCart: () => void;
  moveItemsToSent: () => void;
  setSentItems: (items: SentItem[]) => void;
  setSessionTotal: (total: number) => void;
  setCustomer: (data: { customerName?: string; customerPhone?: string; deliveryAddress?: string }) => void;
  setNotes: (notes: string) => void;
  setDiscount: (amount: number, type: 'fixed' | 'percent') => void;
  getSubtotal: () => number;
  getTotal: () => number;
  getSessionGrandTotal: () => number;
  /** Clears order/table/customer/discount; keeps waiterId, waiterName, orderType */
  resetOrder: () => void;
  /** Clears everything including waiterId, waiterName (for "ახალი შეკვეთა") */
  resetFull: () => void;
  reset: () => void;
}

const defaultCartItem = (): CartItem => ({
  menuItemId: '',
  menuItemName: '',
  quantity: 1,
  unitPrice: 0,
  totalPrice: 0,
  modifiers: [],
  specialInstructions: '',
  kdsStation: 'HOT',
});

export const usePOSStore = create<POSState>((set, get) => ({
  orderType: 'DINE_IN',
  tableId: null,
  tableSessionId: null,
  tableLabel: null,
  waiterId: null,
  waiterName: null,
  orderId: null,
  orderNumber: null,
  items: [],
  sentItems: [],
  sessionTotal: 0,
  customerName: '',
  customerPhone: '',
  deliveryAddress: '',
  notes: '',
  discountAmount: 0,
  discountType: 'fixed',

  setOrderType: (orderType) => set({ orderType }),

  setTable: (tableId, tableSessionId, tableLabel) =>
    set({ tableId, tableSessionId, tableLabel: tableLabel ?? null }),

  setOrder: (orderId, orderNumber) =>
    set({ orderId, orderNumber: orderNumber ?? null }),

  setWaiterId: (waiterId) => set({ waiterId }),

  setWaiter: (waiterId, waiterName) =>
    set({ waiterId, waiterName: waiterName ?? null }),

  addItem: (item) => {
    const trimmed = { ...defaultCartItem(), ...item };
    set((state) => ({
      items: [...state.items, trimmed],
    }));
  },

  updateItemQuantity: (index, quantity) => {
    if (quantity <= 0) {
      get().removeItem(index);
      return;
    }
    set((state) => {
      const items = [...state.items];
      if (index < 0 || index >= items.length) return state;
      const it = { ...items[index], quantity, totalPrice: items[index].unitPrice * quantity };
      items[index] = it;
      return { items };
    });
  },

  removeItem: (index) =>
    set((state) => ({
      items: state.items.filter((_, i) => i !== index),
    })),

  clearCart: () => set({ items: [] }),

  moveItemsToSent: () =>
    set((state) => {
      const newSent: SentItem[] = state.items.map((it) => ({
        menuItemName: it.menuItemName,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        totalPrice: it.totalPrice,
        status: 'CONFIRMED',
      }));
      const sentTotal = newSent.reduce((s, it) => s + it.totalPrice, 0);
      return {
        items: [],
        sentItems: [...state.sentItems, ...newSent],
        sessionTotal: state.sessionTotal + sentTotal,
      };
    }),

  setSentItems: (sentItems) => set({ sentItems }),

  setSessionTotal: (sessionTotal) => set({ sessionTotal }),

  setCustomer: (data) =>
    set((state) => ({
      customerName: data.customerName ?? state.customerName,
      customerPhone: data.customerPhone ?? state.customerPhone,
      deliveryAddress: data.deliveryAddress ?? state.deliveryAddress,
    })),

  setNotes: (notes) => set({ notes }),

  setDiscount: (discountAmount, discountType) => set({ discountAmount, discountType }),

  getSubtotal: () => {
    return get().items.reduce((sum, it) => sum + it.totalPrice, 0);
  },

  getTotal: () => {
    const sub = get().getSubtotal();
    const { discountAmount, discountType } = get();
    const discount = discountType === 'percent' ? (sub * discountAmount) / 100 : discountAmount;
    return Math.max(0, sub - discount);
  },

  getSessionGrandTotal: () => {
    const { sessionTotal, discountAmount, discountType } = get();
    const cartSubtotal = get().getSubtotal();
    const rawTotal = sessionTotal + cartSubtotal;
    const discount = discountType === 'percent'
      ? (rawTotal * discountAmount) / 100
      : discountAmount;
    return Math.max(0, rawTotal - discount);
  },

  resetOrder: () =>
    set({
      orderId: null,
      orderNumber: null,
      items: [],
      sentItems: [],
      sessionTotal: 0,
      tableId: null,
      tableSessionId: null,
      tableLabel: null,
      notes: '',
      discountAmount: 0,
      discountType: 'fixed',
      customerName: '',
      customerPhone: '',
      deliveryAddress: '',
    }),

  resetFull: () =>
    set({
      orderId: null,
      orderNumber: null,
      items: [],
      sentItems: [],
      sessionTotal: 0,
      tableId: null,
      tableSessionId: null,
      tableLabel: null,
      waiterId: null,
      waiterName: null,
      notes: '',
      discountAmount: 0,
      discountType: 'fixed',
      customerName: '',
      customerPhone: '',
      deliveryAddress: '',
      orderType: 'DINE_IN',
    }),

  reset: () =>
    set({
      orderId: null,
      orderNumber: null,
      items: [],
      sentItems: [],
      sessionTotal: 0,
      notes: '',
      discountAmount: 0,
      discountType: 'fixed',
    }),
}));