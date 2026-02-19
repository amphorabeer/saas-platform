'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { POSLayout } from '@/components/pos/POSLayout';
import { POSTopBar } from '@/components/pos/POSTopBar';
import { MenuGrid, type MenuCategory } from '@/components/pos/MenuGrid';
import { CartPanel } from '@/components/pos/CartPanel';
import { PaymentModal } from '@/components/pos/PaymentModal';
import { DeliveryInfoForm } from '@/components/pos/DeliveryInfoForm';
import { WaiterSelectScreen, type WaiterOption } from '@/components/pos/WaiterSelectScreen';
import { PinInputScreen } from '@/components/pos/PinInputScreen';
import { TableSelectMini } from '@/components/pos/TableSelectMini';
import type { ReceiptPrintData } from '@/components/pos/ReceiptPrint';
import { usePOSStore } from '@/stores/posStore';

type PosStep = 'waiter' | 'pin' | 'table' | 'pos';

export default function PosPage() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<PosStep>('waiter');
  const [selectedWaiter, setSelectedWaiter] = useState<WaiterOption | null>(null);
  const [menu, setMenu] = useState<MenuCategory[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptPrintData | null>(null);
  const prevItemStatusesRef = useRef<Record<number, string>>({});

  const orderType = usePOSStore((s) => s.orderType);
  const orderId = usePOSStore((s) => s.orderId);
  const orderNumber = usePOSStore((s) => s.orderNumber);
  const tableId = usePOSStore((s) => s.tableId);
  const tableSessionId = usePOSStore((s) => s.tableSessionId);
  const tableLabel = usePOSStore((s) => s.tableLabel);
  const waiterName = usePOSStore((s) => s.waiterName);
  const items = usePOSStore((s) => s.items);
  const sentItems = usePOSStore((s) => s.sentItems);
  const getTotal = usePOSStore((s) => s.getTotal);
  const getSubtotal = usePOSStore((s) => s.getSubtotal);
  const getSessionGrandTotal = usePOSStore((s) => s.getSessionGrandTotal);
  const setOrderType = usePOSStore((s) => s.setOrderType);
  const setTable = usePOSStore((s) => s.setTable);
  const setOrder = usePOSStore((s) => s.setOrder);
  const setWaiter = usePOSStore((s) => s.setWaiter);
  const moveItemsToSent = usePOSStore((s) => s.moveItemsToSent);
  const setSentItems = usePOSStore((s) => s.setSentItems);
  const setSessionTotal = usePOSStore((s) => s.setSessionTotal);
  const setCustomer = usePOSStore((s) => s.setCustomer);
  const customerName = usePOSStore((s) => s.customerName);
  const customerPhone = usePOSStore((s) => s.customerPhone);
  const deliveryAddress = usePOSStore((s) => s.deliveryAddress);
  const notes = usePOSStore((s) => s.notes);
  const discountAmount = usePOSStore((s) => s.discountAmount);
  const discountType = usePOSStore((s) => s.discountType);
  const waiterId = usePOSStore((s) => s.waiterId);
  const resetOrder = usePOSStore((s) => s.resetOrder);

  // URL params — when tableId or orderId present, skip to POS
  useEffect(() => {
    const tableIdParam = searchParams.get('tableId');
    const orderIdParam = searchParams.get('orderId');
    const typeParam = searchParams.get('type');

    if (typeParam === 'takeaway') setOrderType('TAKEAWAY');
    else if (typeParam === 'delivery') setOrderType('DELIVERY');
    else setOrderType('DINE_IN');

    if (tableIdParam || orderIdParam) setStep('pos');

    if (tableIdParam && !orderIdParam) {
      fetch(`/api/tables/${tableIdParam}`, { credentials: 'include' })
        .then((r) => r.json())
        .then((t) => {
          if (t?.id) {
            setTable(t.id, null, `T${t.number} — ${t.zone?.name ?? ''} — ${t.seats ?? 0} სტუმარი`);
            // Load existing orders for this table
            fetch(`/api/pos/orders?tableId=${t.id}&status=CONFIRMED`, { credentials: 'include' })
              .then((r2) => r2.json())
              .then((orders) => {
                if (Array.isArray(orders) && orders.length > 0) {
                  const latestOrder = orders[0];
                  setOrder(latestOrder.id, latestOrder.orderNumber);
                  // Load sent items from existing order
                  const sent = latestOrder.items.map((it: { menuItemName: string; quantity: number; unitPrice: number; totalPrice: number; status: string }) => ({
                    menuItemName: it.menuItemName,
                    quantity: it.quantity,
                    unitPrice: it.unitPrice,
                    totalPrice: it.totalPrice,
                    status: it.status || 'CONFIRMED',
                  }));
                  setSentItems(sent);
                  setSessionTotal(sent.reduce((s: number, it: { totalPrice: number }) => s + it.totalPrice, 0));
                }
              })
              .catch(() => {});
          }
        })
        .catch(() => {});
    }

    if (orderIdParam) {
      fetch(`/api/pos/orders/${orderIdParam}`, { credentials: 'include' })
        .then((r) => r.json())
        .then((data) => {
          if (data?.id) {
            setOrder(data.id, data.orderNumber);
            // Load sent items
            if (data.items && Array.isArray(data.items)) {
              const sent = data.items.map((it: { menuItemName: string; quantity: number; unitPrice: number; totalPrice: number; status: string }) => ({
                menuItemName: it.menuItemName,
                quantity: it.quantity,
                unitPrice: it.unitPrice,
                totalPrice: it.totalPrice,
                status: it.status || 'CONFIRMED',
              }));
              setSentItems(sent);
              setSessionTotal(sent.reduce((s: number, it: { totalPrice: number }) => s + it.totalPrice, 0));
            }
            if (data.tableId) {
              fetch(`/api/tables/${data.tableId}`, { credentials: 'include' })
                .then((r2) => r2.json())
                .then((t) => {
                  if (t?.id)
                    setTable(
                      t.id,
                      data.tableSessionId,
                      `T${t.number} — ${t.zone?.name ?? ''} — ${t.seats ?? 0} სტუმარი`
                    );
                })
                .catch(() => {});
            }
          }
        })
        .catch(() => toast.error('შეკვეთა ვერ ჩაიტვირთა'));
    }
  }, [searchParams, setOrderType, setTable, setOrder, setSentItems, setSessionTotal]);

  // Poll order for KDS status (READY → toast)
  useEffect(() => {
    if (!orderId || step !== 'pos') return;
    const currentSent = usePOSStore.getState().sentItems;
    prevItemStatusesRef.current = Object.fromEntries(
      currentSent.map((it, i) => [i, (it.status ?? 'CONFIRMED')])
    );
    const poll = async () => {
      try {
        const r = await fetch(`/api/pos/orders/${orderId}`, { credentials: 'include' });
        if (!r.ok) return;
        const data = await r.json();
        const orderItems = data.items ?? [];
        const prev = prevItemStatusesRef.current;
        const next: Record<number, string> = {};
        orderItems.forEach(
          (
            it: { menuItemName?: string; quantity?: number; unitPrice?: number; totalPrice?: number; status?: string },
            i: number
          ) => {
            const status = it.status ?? 'CONFIRMED';
            next[i] = status;
            if (status === 'READY' && prev[i] !== 'READY') {
              toast.info(`🍳 კერძი მზადაა: ${it.menuItemName ?? 'Item'}`);
            }
          }
        );
        prevItemStatusesRef.current = next;
        const sent = orderItems.map(
          (it: { menuItemName: string; quantity: number; unitPrice: number; totalPrice: number; status?: string }) => ({
            menuItemName: it.menuItemName,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            totalPrice: it.totalPrice,
            status: it.status ?? 'CONFIRMED',
          })
        );
        setSentItems(sent);
        setSessionTotal(sent.reduce((s: number, it: { totalPrice: number }) => s + it.totalPrice, 0));
      } catch {
        /* ignore */
      }
    };
    poll();
    const interval = setInterval(poll, 10_000);
    return () => clearInterval(interval);
  }, [orderId, step, setSentItems, setSessionTotal]);

  const handleWaiterSelect = useCallback(
    (waiter: WaiterOption) => {
      const hasPin = waiter.pin != null && waiter.pin !== '';
      const name = `${waiter.firstName} ${waiter.lastName}`.trim() || waiter.id;
      if (hasPin) {
        setSelectedWaiter(waiter);
        setStep('pin');
      } else {
        setWaiter(waiter.id, name);
        setStep('table');
      }
    },
    [setWaiter]
  );

  const handlePinSuccess = useCallback(
    (employeeId: string, firstName: string, lastName: string) => {
      const name = `${firstName} ${lastName}`.trim() || employeeId;
      setWaiter(employeeId, name);
      setSelectedWaiter(null);
      setStep('table');
    },
    [setWaiter]
  );

  // Menu
  useEffect(() => {
    fetch('/api/pos/menu', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setMenu(data);
      })
      .catch(() => toast.error('მენიუ ვერ ჩაიტვირთა'))
      .finally(() => setMenuLoading(false));
  }, []);

  const sendToKitchen = useCallback(async () => {
    if (items.length === 0) {
      toast.error('დაამატეთ მინიმუმ ერთი პოზიცია');
      return;
    }
    if (orderType === 'DINE_IN' && !tableId) {
      toast.error('აირჩიეთ მაგიდა');
      return;
    }

    setSending(true);
    try {
      const subtotal = items.reduce((s, it) => s + it.totalPrice, 0);
      const discountValue =
        discountType === 'percent' ? (subtotal * discountAmount) / 100 : discountAmount;

      const payload = {
        orderType,
        tableId: tableId || undefined,
        tableSessionId: tableSessionId || undefined,
        waiterId: waiterId || undefined,
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        deliveryAddress: deliveryAddress || undefined,
        notes: notes || undefined,
        discountAmount: discountValue,
        items: items.map((it) => ({
          menuItemId: it.menuItemId,
          menuItemName: it.menuItemName,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          totalPrice: it.totalPrice,
          modifiers: it.modifiers,
          specialInstructions: it.specialInstructions || undefined,
          kdsStation: it.kdsStation || 'HOT',
        })),
      };

      if (orderId) {
        const res = await fetch(`/api/pos/orders/${orderId}/items`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: payload.items }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'შეცდომა');
        }
        toast.success('პოზიციები დაემატა შეკვეთას');
        moveItemsToSent();
      } else {
        const res = await fetch('/api/pos/orders', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'შეცდომა');
        }
        const created = await res.json();
        setOrder(created.id, created.orderNumber);
        moveItemsToSent();
        toast.success(`შეკვეთა #${created.orderNumber} გაეგზავნა სამზარეულოში`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'შეცდომა');
    } finally {
      setSending(false);
    }
  }, [
    items,
    orderType,
    tableId,
    tableSessionId,
    waiterId,
    customerName,
    customerPhone,
    deliveryAddress,
    notes,
    discountAmount,
    discountType,
    orderId,
    setOrder,
    moveItemsToSent,
  ]);

  const handlePaymentConfirm = useCallback(
    async (params: {
      paymentMethod: string;
      paidAmount?: number;
      tipAmount?: number;
      splits?: { amount: number; paymentMethod: string; paidBy: string }[];
    }) => {
      if (!orderId) return;
      setPayLoading(true);
      try {
        const res = await fetch(`/api/pos/orders/${orderId}/pay`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentMethod: params.paymentMethod,
            paidAmount: params.paidAmount ?? 0,
            tipAmount: params.tipAmount ?? 0,
            splits: params.splits,
            discountAmount,
            discountType,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'შეცდომა');
        }
        toast.success('გადახდა წარმატებით შესრულდა');
        const subtotal = getSubtotal();
        const sessionTotal = getSessionGrandTotal();
        const discountValue =
          discountType === 'percent' ? (subtotal * discountAmount) / 100 : discountAmount;
        const allItems = [
          ...sentItems.map((s) => ({
            name: s.menuItemName,
            quantity: s.quantity,
            unitPrice: s.unitPrice,
            totalPrice: s.totalPrice,
          })),
          ...items.map((i) => ({
            name: i.menuItemName,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            totalPrice: i.totalPrice,
          })),
        ];
        let restaurantName = '';
        try {
          const settingsRes = await fetch('/api/settings/restaurant', { credentials: 'include' });
          if (settingsRes.ok) {
            const data = await settingsRes.json();
            restaurantName = data.name ?? '';
          }
        } catch {
          /* ignore */
        }
        setReceiptData({
          restaurantName,
          orderNumber: orderNumber ?? '',
          date: new Date().toLocaleString('ka-GE'),
          tableLabel: tableLabel ?? 'Take Away',
          waiterName: waiterName ?? '',
          items: allItems,
          subtotal,
          discountAmount: discountValue,
          total: sessionTotal,
          paymentMethod: params.paymentMethod,
        });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'შეცდომა');
      } finally {
        setPayLoading(false);
      }
    },
    [
      orderId,
      orderNumber,
      tableLabel,
      waiterName,
      sentItems,
      items,
      getSubtotal,
      getSessionGrandTotal,
      discountAmount,
      discountType,
    ]
  );

  const handlePaymentClose = useCallback(async () => {
    const currentTableId = usePOSStore.getState().tableId;
    if (currentTableId) {
      try {
        await fetch(`/api/tables/${currentTableId}/status`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'FREE' }),
        });
      } catch {
        /* ignore */
      }
    }
    setPaymentOpen(false);
    setReceiptData(null);
    resetOrder();
    setStep('table');
  }, [resetOrder]);

  // Use session grand total for payment
  const totalAmount = getSessionGrandTotal();

  // Step: waiter -> pin? -> table -> pos
  if (step === 'waiter') {
    return (
      <div className="fixed inset-0 flex flex-col bg-[#0F172A]">
        <header className="flex h-14 items-center border-b border-white/10 px-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-slate-300 hover:bg-white/10 hover:text-white"
          >
            ← დეშბორდი
          </Link>
        </header>
        <div className="flex-1 overflow-auto">
          <WaiterSelectScreen onSelect={handleWaiterSelect} />
        </div>
      </div>
    );
  }

  if (step === 'pin' && selectedWaiter) {
    return (
      <div className="fixed inset-0 flex flex-col bg-[#0F172A]">
        <div className="flex-1 overflow-auto">
          <PinInputScreen
            waiter={selectedWaiter}
            onSuccess={handlePinSuccess}
            onBack={() => { resetOrder(); setSelectedWaiter(null); setStep('waiter'); }}
          />
        </div>
      </div>
    );
  }

  if (step === 'table') {
    return (
      <div className="fixed inset-0 flex flex-col bg-[#0F172A]">
        <header className="flex h-14 flex-col items-center justify-center border-b border-white/10 px-4 py-2">
          <span className="text-lg font-medium text-white">აირჩიეთ მაგიდა</span>
          <span className="text-sm text-slate-400">ჯერ აირჩიეთ მაგიდა ან Take Away</span>
        </header>
        <div className="flex-1" />
        <TableSelectMini
          open
          onClose={(selected?: boolean) => {
            if (selected) {
              const state = usePOSStore.getState();
              if (state.tableId || state.orderType === 'TAKEAWAY' || state.orderType === 'DELIVERY') {
                setStep('pos');
              }
            } else {
              setStep('waiter');
            }
          }}
        />
      </div>
    );
  }

  return (
    <POSLayout
      topBar={
        <POSTopBar
          onNewOrder={() => {
            resetOrder();
            setStep('table');
          }}
          onTableChange={() => {
            resetOrder();
            setOrderType('DINE_IN');
            setStep('table');
          }}
        />
      }
      leftPanel={
        <div className="flex flex-col h-full">
          {orderType === 'DELIVERY' && (
            <div className="shrink-0 border-b border-white/10 p-3 bg-[#1E293B]/40">
              <DeliveryInfoForm />
            </div>
          )}
          <div className="flex-1 min-h-0">
            <MenuGrid categories={menu} loading={menuLoading} />
          </div>
        </div>
      }
      rightPanel={
        <>
          <CartPanel
            onSendToKitchen={sendToKitchen}
            onPayment={() => setPaymentOpen(true)}
            orderId={orderId}
            sending={sending}
          />
          <PaymentModal
            open={paymentOpen}
            onClose={() => setPaymentOpen(false)}
            onDoneAfterSuccess={handlePaymentClose}
            totalAmount={totalAmount}
            onConfirm={handlePaymentConfirm}
            loading={payLoading}
            receiptData={receiptData}
          />
        </>
      }
    />
  );
}