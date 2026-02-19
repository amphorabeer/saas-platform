'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from '@/components/ui/Modal';
import { usePOSStore } from '@/stores/posStore';

type Reservation = {
  id: string;
  guestName: string;
  guestCount: number;
  time: string;
  duration: number | null;
  status: string;
};

type Table = {
  id: string;
  number: string;
  label: string | null;
  seats: number;
  status: string;
  shape: string;
  posX: number;
  posY: number;
  width: number;
  height: number;
  zone: { id: string; name: string; color: string | null };
  reservations?: Reservation[];
};

type Zone = { id: string; name: string; color: string | null };

const TABLE_STATUS_STYLE: Record<
  string,
  { bg: string; border: string; clickable: boolean }
> = {
  FREE: { bg: 'bg-emerald-500/30', border: 'border-emerald-500/50', clickable: true },
  OCCUPIED: { bg: 'bg-red-500/30', border: 'border-red-500/50', clickable: true },
  RESERVED: { bg: 'bg-yellow-500/30', border: 'border-yellow-500/50', clickable: false },
  CLEANING: { bg: 'bg-purple-500/20', border: 'border-purple-500/40', clickable: false },
  BILLING: { bg: 'bg-blue-500/20', border: 'border-blue-500/40', clickable: false },
};

function formatTime(timeStr: string): string {
  try {
    const d = new Date(timeStr);
    return d.toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function TableSelectMini({
  open,
  onClose,
}: {
  open: boolean;
  onClose: (selected?: boolean) => void;
}) {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const resetOrder = usePOSStore((s) => s.resetOrder);
  const setTable = usePOSStore((s) => s.setTable);
  const setOrder = usePOSStore((s) => s.setOrder);
  const setOrderType = usePOSStore((s) => s.setOrderType);
  const setSentItems = usePOSStore((s) => s.setSentItems);
  const setSessionTotal = usePOSStore((s) => s.setSessionTotal);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSelectedZoneId(null);
    fetch('/api/tables', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setTables(data);
        else setTables([]);
      })
      .catch(() => setTables([]))
      .finally(() => setLoading(false));
  }, [open]);

  const zones = useMemo(() => {
    const seen = new Map<string, Zone>();
    for (const t of tables) {
      if (t.zone && !seen.has(t.zone.id)) {
        seen.set(t.zone.id, t.zone);
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [tables]);

  const filteredTables = useMemo(() => {
    if (!selectedZoneId) return tables;
    return tables.filter((t) => t.zone.id === selectedZoneId);
  }, [tables, selectedZoneId]);

  const handleSelect = async (t: Table) => {
    resetOrder();
    const label = `T${t.number} – ${t.zone.name} – ${t.seats} სტუმარი`;
    setTable(t.id, null, label);
    setOrderType('DINE_IN');
    if (t.status === 'OCCUPIED') {
      try {
        const r = await fetch(`/api/pos/orders?tableId=${t.id}&status=CONFIRMED`, {
          credentials: 'include',
        });
        const orders = await r.json();
        if (Array.isArray(orders) && orders.length > 0) {
          const latest = orders[0];
          setOrder(latest.id, latest.orderNumber);
          const sent = (latest.items || []).map(
            (it: {
              menuItemName: string;
              quantity: number;
              unitPrice: number;
              totalPrice: number;
              status?: string;
            }) => ({
              menuItemName: it.menuItemName,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              totalPrice: it.totalPrice,
              status: it.status ?? 'CONFIRMED',
            })
          );
          setSentItems(sent);
          setSessionTotal(sent.reduce((s: number, it: { totalPrice: number }) => s + it.totalPrice, 0));
        }
      } catch {
        /* ignore */
      }
    }
    onClose(true);
  };

  const handleTakeAway = () => {
    resetOrder();
    setOrderType('TAKEAWAY');
    setTable(null, null, 'Take Away');
    onClose(true);
  };

  return (
    <Modal open={open} onClose={() => onClose(false)} title="მაგიდის არჩევა" maxWidth="5xl">
      {loading ? (
        <p className="py-8 text-center text-slate-400">იტვირთება...</p>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Zone tabs + Take Away */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedZoneId(null)}
              className={`shrink-0 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                selectedZoneId === null
                  ? 'border-orange-500/50 bg-orange-500/20 text-orange-300'
                  : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              ყველა
            </button>
            {zones.map((z) => (
              <button
                key={z.id}
                type="button"
                onClick={() => setSelectedZoneId(z.id)}
                className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                  selectedZoneId === z.id
                    ? 'border-orange-500/50 bg-orange-500/20 text-orange-300'
                    : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                {z.color && (
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: z.color }}
                  />
                )}
                {z.name}
              </button>
            ))}
            <button
              type="button"
              onClick={handleTakeAway}
              className="ml-2 shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              Take Away
            </button>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded border-2 border-emerald-500/50 bg-emerald-500/30" /> თავისუფალი
            </span>
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded border-2 border-red-500/50 bg-red-500/30" /> დაკავებული
            </span>
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded border-2 border-yellow-500/50 bg-yellow-500/30" /> დაჯავშნილი
            </span>
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded border-2 border-purple-500/40 bg-purple-500/20" /> წმენდა
            </span>
          </div>

          {/* Floor plan */}
          <div className="relative min-h-[500px] w-full overflow-auto rounded-xl border border-white/10 bg-[#0F172A]">
            <AnimatePresence mode="wait">
              {filteredTables.length === 0 ? (
                <motion.p
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center py-12 text-slate-500"
                >
                  {selectedZoneId ? 'ამ ზონაში მაგიდა არ არის' : 'მაგიდა არ არის'}
                </motion.p>
              ) : (
                <motion.div
                  key="plan"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="relative min-h-[500px] w-full"
                  style={{ minWidth: 800 }}
                >
                  {filteredTables.map((t) => {
                    const hasReservation = (t.reservations?.length ?? 0) > 0;
                    const nextRes = t.reservations?.[0];
                    const style = TABLE_STATUS_STYLE[t.status] || TABLE_STATUS_STYLE.FREE;
                    const isRound = t.shape === 'ROUND';

                    // If FREE but has reservation, show reservation indicator
                    const showResIndicator = hasReservation && t.status === 'FREE';

                    return (
                      <button
                        key={t.id}
                        type="button"
                        disabled={!style.clickable}
                        onClick={() => style.clickable && handleSelect(t)}
                        className={`absolute flex flex-col items-center justify-center border-2 ${style.bg} ${style.border} ${
                          style.clickable
                            ? 'cursor-pointer hover:opacity-90'
                            : 'cursor-not-allowed opacity-80'
                        } ${isRound ? 'rounded-full' : 'rounded-lg'}`}
                        title={
                          hasReservation && nextRes
                            ? `ჯავშანი: ${nextRes.guestName} – ${formatTime(nextRes.time)} (${nextRes.guestCount} სტ.)`
                            : t.status === 'OCCUPIED'
                              ? 'არსებული შეკვეთით გახსნა'
                              : undefined
                        }
                        style={{
                          left: t.posX ?? 0,
                          top: t.posY ?? 0,
                          width: t.width || 80,
                          height: t.height || 80,
                        }}
                      >
                        <span className="font-semibold text-white text-sm">{t.number}</span>
                        <span className="text-xs text-white/80">{t.seats}</span>

                        {/* Reservation badge */}
                        {showResIndicator && nextRes && (
                          <span className="absolute -top-2 -right-2 flex items-center gap-0.5 rounded-full bg-yellow-500 px-1.5 py-0.5 text-[10px] font-bold text-black shadow">
                            {formatTime(nextRes.time)}
                          </span>
                        )}

                        {/* RESERVED status with guest info */}
                        {t.status === 'RESERVED' && nextRes && (
                          <span className="mt-0.5 max-w-full truncate text-[10px] text-yellow-300">
                            {nextRes.guestName}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </Modal>
  );
}