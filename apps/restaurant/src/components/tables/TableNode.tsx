'use client';

import { useRef, useCallback, useState } from 'react';
import { Users } from 'lucide-react';
import type { TableWithSession } from './TablePopover';

const STATUS_STYLE: Record<
  string,
  { border: string; bg: string }
> = {
  FREE: { border: 'border-emerald-500/50', bg: 'bg-emerald-500/10' },
  OCCUPIED: { border: 'border-red-500/50', bg: 'bg-red-500/10' },
  RESERVED: { border: 'border-yellow-500/50', bg: 'bg-yellow-500/10' },
  CLEANING: { border: 'border-purple-500/50', bg: 'bg-purple-500/10' },
  BILLING: { border: 'border-blue-500/50', bg: 'bg-blue-500/10' },
};

type TableNodeProps = {
  table: TableWithSession;
  editMode: boolean;
  onClick: (e: React.MouseEvent) => void;
  onDragEnd: (tableId: string, posX: number, posY: number) => void;
};

export function TableNode({ table, editMode, onClick, onDragEnd }: TableNodeProps) {
  const style = STATUS_STYLE[table.status] || STATUS_STYLE.FREE;
  const isRound = table.shape === 'ROUND';
  const isSquare = table.shape === 'SQUARE';
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const startPos = useRef({ x: 0, y: 0, tableX: 0, tableY: 0 });

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!editMode) return;
      e.preventDefault();
      e.stopPropagation();
      setDragging(true);
      startPos.current = {
        x: e.clientX,
        y: e.clientY,
        tableX: table.posX,
        tableY: table.posY,
      };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [editMode, table.posX, table.posY]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging || !ref.current) return;
      const dx = e.clientX - startPos.current.x;
      const dy = e.clientY - startPos.current.y;
      const newX = Math.max(0, startPos.current.tableX + dx);
      const newY = Math.max(0, startPos.current.tableY + dy);
      ref.current.style.left = `${newX}px`;
      ref.current.style.top = `${newY}px`;
      (ref.current as unknown as { _dragX?: number; _dragY?: number })._dragX = newX;
      (ref.current as unknown as { _dragX?: number; _dragY?: number })._dragY = newY;
    },
    [dragging]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!editMode) return;
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      if (dragging && ref.current) {
        const el = ref.current as unknown as { _dragX?: number; _dragY?: number };
        const x = el._dragX ?? startPos.current.tableX;
        const y = el._dragY ?? startPos.current.tableY;
        onDragEnd(table.id, x, y);
      }
      setDragging(false);
    },
    [editMode, dragging, table.id, onDragEnd]
  );

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      className={`table-node absolute flex flex-col items-center justify-center border-2 ${style.border} ${style.bg} ${
        editMode ? 'cursor-move border-dashed' : 'cursor-pointer'
      } ${dragging ? 'opacity-90' : ''}`}
      style={{
        left: table.posX,
        top: table.posY,
        width: table.width || 100,
        height: table.height || 80,
        borderRadius: isRound ? '50%' : '12px',
        transform: `rotate(${table.rotation}deg)`,
        ...(table.zone?.color && table.status === 'FREE'
          ? {
              borderColor: table.zone.color,
              backgroundColor: `${table.zone.color}20`,
            }
          : {}),
      }}
      onClick={editMode ? undefined : onClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <span className="font-semibold text-white text-sm">{table.number}</span>
      <span className="flex items-center gap-0.5 text-xs text-slate-400">
        <Users className="h-3 w-3" /> {table.seats}
      </span>
      {table.status === 'OCCUPIED' && table.activeSession && (
        <span className="mt-0.5 text-xs text-slate-400 truncate max-w-full px-1">
          {table.activeSession.waiterName || '—'}
        </span>
      )}
    </div>
  );
}
