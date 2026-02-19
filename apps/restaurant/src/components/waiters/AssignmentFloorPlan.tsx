'use client';

import { motion } from 'framer-motion';

export type TableForAssignment = {
  id: string;
  number: string;
  zone: { id: string; name: string; color: string | null };
  posX: number;
  posY: number;
  width: number;
  height: number;
  shape: string;
  rotation: number;
  assignment?: { id: string; employeeName: string; color: string } | null;
};

export function AssignmentFloorPlan({
  tables,
  selectedWaiterId,
  onAssign,
  onUnassign,
}: {
  tables: TableForAssignment[];
  selectedWaiterId: string | null;
  onAssign: (tableId: string) => void;
  onUnassign: (assignmentId: string, tableId: string) => void;
}) {
  return (
    <div
      className="relative min-h-[500px] w-full overflow-auto rounded-xl border border-white/10 bg-[#0F172A]"
      style={{ minWidth: 700 }}
    >
      <div className="relative" style={{ minWidth: 700, minHeight: 500 }}>
        {tables.map((table) => {
          const isRound = table.shape === 'ROUND';
          const hasAssignment = table.assignment;
          return (
            <motion.div
              key={table.id}
              layout
              role="button"
              className={`absolute flex flex-col items-center justify-center rounded-xl border-2 min-h-[48px] min-w-[64px] ${
                hasAssignment
                  ? 'border-orange-500/50 bg-orange-500/10'
                  : 'border-white/20 bg-white/5 hover:bg-white/10'
              }`}
              style={{
                left: table.posX,
                top: table.posY,
                width: table.width,
                height: table.height,
                borderRadius: isRound ? '50%' : 12,
                transform: `rotate(${table.rotation}deg)`,
              }}
              onClick={() => {
                if (hasAssignment) return;
                if (selectedWaiterId) onAssign(table.id);
              }}
            >
              <span className="font-semibold text-white text-sm">T{table.number}</span>
              {hasAssignment ? (
                <div className="mt-1 flex flex-col items-center gap-0.5">
                  <span className="text-xs text-orange-300 truncate max-w-full px-1">
                    {table.assignment!.employeeName}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUnassign(table.assignment!.id, table.id);
                    }}
                    className="rounded bg-red-500/20 px-2 py-0.5 text-xs text-red-400 hover:bg-red-500/30"
                  >
                    მოხსნა
                  </button>
                </div>
              ) : selectedWaiterId ? (
                <span className="text-xs text-slate-500">დააკლიკე მინიჭება</span>
              ) : null}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
