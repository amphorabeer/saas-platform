'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Pencil, Trash2 } from 'lucide-react';
import { TableStatusBadge } from './TableStatusBadge';
import type { TableWithSession } from './TablePopover';

const SHAPE_LABELS: Record<string, string> = {
  ROUND: 'მრგვალი',
  SQUARE: 'კვადრატი',
  RECTANGLE: 'მართკუთხა',
};

type TableListViewProps = {
  tables: TableWithSession[];
  onEdit: (table: TableWithSession) => void;
  onDelete: (table: TableWithSession) => void;
};

type SortKey = 'number' | 'zone' | 'seats' | 'status';

export function TableListView({ tables, onEdit, onDelete }: TableListViewProps) {
  const [sortBy, setSortBy] = useState<SortKey>('number');
  const [zoneFilter, setZoneFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const zones = useMemo(() => {
    const set = new Set(tables.map((t) => t.zone?.name).filter(Boolean));
    return Array.from(set) as string[];
  }, [tables]);

  const sorted = useMemo(() => {
    let list = [...tables];
    if (zoneFilter) {
      list = list.filter((t) => t.zone?.name === zoneFilter);
    }
    if (statusFilter) {
      list = list.filter((t) => t.status === statusFilter);
    }
    list.sort((a, b) => {
      if (sortBy === 'number') return (a.number || '').localeCompare(b.number || '');
      if (sortBy === 'zone') return (a.zone?.name || '').localeCompare(b.zone?.name || '');
      if (sortBy === 'seats') return a.seats - b.seats;
      if (sortBy === 'status') return (a.status || '').localeCompare(b.status || '');
      return 0;
    });
    return list;
  }, [tables, sortBy, zoneFilter, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-slate-400">სორტირება:</span>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-orange-500/50 focus:outline-none"
        >
          <option value="number">ნომერი</option>
          <option value="zone">ზონა</option>
          <option value="seats">ადგილები</option>
          <option value="status">სტატუსი</option>
        </select>
        <span className="text-sm text-slate-400">ზონა:</span>
        <select
          value={zoneFilter}
          onChange={(e) => setZoneFilter(e.target.value)}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-orange-500/50 focus:outline-none"
        >
          <option value="">ყველა</option>
          {zones.map((z) => (
            <option key={z} value={z}>{z}</option>
          ))}
        </select>
        <span className="text-sm text-slate-400">სტატუსი:</span>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-orange-500/50 focus:outline-none"
        >
          <option value="">ყველა</option>
          <option value="FREE">თავისუფალი</option>
          <option value="OCCUPIED">დაკავებული</option>
          <option value="RESERVED">რეზერვირებული</option>
          <option value="CLEANING">გაწმენდა</option>
          <option value="BILLING">გადახდა</option>
        </select>
      </div>
      <div className="glass rounded-xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-left text-sm text-slate-400">
                <th className="p-3 font-medium">ნომერი</th>
                <th className="p-3 font-medium">ზონა</th>
                <th className="p-3 font-medium">ადგილები</th>
                <th className="p-3 font-medium">ფორმა</th>
                <th className="p-3 font-medium">სტატუსი</th>
                <th className="p-3 font-medium">ლეიბლი</th>
                <th className="p-3 font-medium w-24">მოქმედებები</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((table, i) => (
                <motion.tr
                  key={table.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="border-b border-white/5 hover:bg-white/5 cursor-pointer"
                  onClick={() => onEdit(table)}
                >
                  <td className="p-3 font-medium text-white">{table.number}</td>
                  <td className="p-3 text-slate-300">{table.zone?.name ?? '—'}</td>
                  <td className="p-3 text-slate-300">{table.seats}</td>
                  <td className="p-3 text-slate-300">{SHAPE_LABELS[table.shape] ?? table.shape}</td>
                  <td className="p-3">
                    <TableStatusBadge status={table.status} />
                  </td>
                  <td className="p-3 text-slate-400">{table.label || '—'}</td>
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(table)}
                        className="rounded p-2 text-slate-400 hover:bg-white/10 hover:text-white"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(table)}
                        className="rounded p-2 text-slate-400 hover:bg-red-500/20 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
