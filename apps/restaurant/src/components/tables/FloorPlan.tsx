'use client';

import { useRef } from 'react';
import { TableNode } from './TableNode';
import type { TableWithSession } from './TablePopover';

type FloorPlanProps = {
  tables: TableWithSession[];
  editMode: boolean;
  onTableClick: (table: TableWithSession, e: React.MouseEvent) => void;
  onPositionSave: (tableId: string, posX: number, posY: number) => void;
};

export function FloorPlan({
  tables,
  editMode,
  onTableClick,
  onPositionSave,
}: FloorPlanProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className="relative min-h-[600px] w-full overflow-auto rounded-xl border border-white/10 bg-[#0F172A]"
      style={{ minWidth: 800 }}
    >
      <div className="relative" style={{ minWidth: 800, minHeight: 600 }}>
        {tables.map((table) => (
          <TableNode
            key={table.id}
            table={table}
            editMode={editMode}
            onClick={(e) => onTableClick(table, e)}
            onDragEnd={onPositionSave}
          />
        ))}
      </div>
    </div>
  );
}
