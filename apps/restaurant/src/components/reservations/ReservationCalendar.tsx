'use client';

import { useMemo } from 'react';
import { ReservationBlock, type ReservationBlockData } from './ReservationBlock';

const SLOT_WIDTH = 24;
const ROW_HEIGHT = 56;
const START_HOUR = 10;
const END_HOUR = 24;
const TOTAL_SLOTS = (END_HOUR - START_HOUR) * 2;

export type TableRow = { id: string; number: string };
export type ReservationForCalendar = ReservationBlockData & {
  tableId: string | null;
  time: string;
  date: string;
};

function timeToSlot(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h - START_HOUR) * 2 + (m >= 30 ? 1 : 0);
}

function slotToTime(slotIndex: number): string {
  const h = START_HOUR + Math.floor(slotIndex / 2);
  const m = (slotIndex % 2) * 30;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function ReservationCalendar({
  tables,
  reservations,
  onBlockClick,
  onEmptySlotClick,
}: {
  tables: TableRow[];
  reservations: ReservationForCalendar[];
  selectedDate?: string;
  onBlockClick: (reservation: ReservationForCalendar) => void;
  onEmptySlotClick: (tableId: string | null, time: string) => void;
}) {
  const totalWidth = TOTAL_SLOTS * SLOT_WIDTH;

  const blocksByTable = useMemo(() => {
    const map = new Map<string | null, ReservationForCalendar[]>();
    for (const r of reservations) {
      const key = r.tableId ?? null;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return map;
  }, [reservations]);

  return (
    <div className="overflow-auto rounded-xl border border-white/10 bg-[#1E293B]/50">
      <div className="flex" style={{ minWidth: totalWidth + 100 }}>
        <div className="sticky left-0 z-10 w-24 shrink-0 border-r border-white/10 bg-[#0F172A]">
          <div className="h-10 border-b border-white/10 flex items-center justify-center text-xs text-slate-400">
            მაგიდა
          </div>
          {tables.map((t) => (
            <div
              key={t.id}
              className="flex items-center border-b border-white/5 px-2 font-medium text-white"
              style={{ height: ROW_HEIGHT }}
            >
              T{t.number}
            </div>
          ))}
          <div
            className="flex items-center border-b border-white/5 px-2 text-sm text-slate-500"
            style={{ height: ROW_HEIGHT }}
          >
            —
          </div>
        </div>
        <div className="flex-1">
          <div
            className="flex border-b border-white/10 text-xs text-slate-500"
            style={{ width: totalWidth }}
          >
            {Array.from({ length: END_HOUR - START_HOUR }).map((_, i) => (
              <div
                key={i}
                className="border-r border-white/5 text-center"
                style={{ width: SLOT_WIDTH * 2 }}
              >
                {START_HOUR + i}:00
              </div>
            ))}
          </div>
          {tables.map((t) => (
            <div
              key={t.id}
              className="relative border-b border-white/5"
              style={{ height: ROW_HEIGHT, width: totalWidth }}
            >
              {Array.from({ length: TOTAL_SLOTS }).map((_, i) => (
                <div
                  key={i}
                  className="absolute border-r border-white/5 hover:bg-white/5"
                  style={{
                    left: i * SLOT_WIDTH,
                    width: SLOT_WIDTH,
                    height: '100%',
                  }}
                  onClick={() => onEmptySlotClick(t.id, slotToTime(i))}
                />
              ))}
              {(blocksByTable.get(t.id) ?? []).map((r) => {
                const startSlot = timeToSlot(r.time);
                const durationSlots = Math.max(1, (r.duration || 120) / 30);
                return (
                  <div
                    key={r.id}
                    className="absolute top-1 bottom-1 overflow-hidden"
                    style={{
                      left: startSlot * SLOT_WIDTH + 2,
                      width: durationSlots * SLOT_WIDTH - 4,
                    }}
                  >
                    <ReservationBlock reservation={r} onClick={() => onBlockClick(r)} />
                  </div>
                );
              })}
            </div>
          ))}
          <div
            className="relative border-b border-white/5"
            style={{ height: ROW_HEIGHT, width: totalWidth }}
          >
            {Array.from({ length: TOTAL_SLOTS }).map((_, i) => (
              <div
                key={i}
                className="absolute border-r border-white/5 hover:bg-white/5"
                style={{
                  left: i * SLOT_WIDTH,
                  width: SLOT_WIDTH,
                  height: '100%',
                }}
                onClick={() => onEmptySlotClick(null, slotToTime(i))}
              />
            ))}
            {(blocksByTable.get(null) ?? []).map((r) => {
              const startSlot = timeToSlot(r.time);
              const durationSlots = Math.max(1, (r.duration || 120) / 30);
              return (
                <div
                  key={r.id}
                  className="absolute top-1 bottom-1 overflow-hidden"
                  style={{
                    left: startSlot * SLOT_WIDTH + 2,
                    width: durationSlots * SLOT_WIDTH - 4,
                  }}
                >
                  <ReservationBlock reservation={r} onClick={() => onBlockClick(r)} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
