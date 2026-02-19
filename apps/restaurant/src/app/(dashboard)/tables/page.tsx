'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Grid3X3, List, Settings, Plus, Pencil } from 'lucide-react';
import { FloorPlan } from '@/components/tables/FloorPlan';
import { TablePopover, type TableWithSession } from '@/components/tables/TablePopover';
import { TableListView } from '@/components/tables/TableListView';
import { TableForm, type TableRow } from '@/components/tables/TableForm';
import { ZoneManager } from '@/components/tables/ZoneManager';
import { SessionStartForm } from '@/components/tables/SessionStartForm';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { ZoneRow } from '@/components/tables/ZoneForm';

const REFETCH_INTERVAL_MS = 10000;

export default function TablesPage() {
  const [viewMode, setViewMode] = useState<'floor' | 'list'>('floor');
  const [editMode, setEditMode] = useState(false);
  const [zones, setZones] = useState<ZoneRow[]>([]);
  const [tables, setTables] = useState<TableWithSession[]>([]);
  const [zoneFilter, setZoneFilter] = useState<string>('');
  const [zoneManagerOpen, setZoneManagerOpen] = useState(false);
  const [tableFormOpen, setTableFormOpen] = useState(false);
  const [tableEdit, setTableEdit] = useState<TableWithSession | null>(null);
  const [tableDelete, setTableDelete] = useState<TableWithSession | null>(null);
  const [popoverTable, setPopoverTable] = useState<TableWithSession | null>(null);
  const [popoverAnchor, setPopoverAnchor] = useState({ x: 0, y: 0 });
  const [sessionStartTable, setSessionStartTable] = useState<TableWithSession | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadZones = useCallback(async () => {
    const res = await fetch('/api/tables/zones');
    if (res.ok) setZones(await res.json());
  }, []);

  const loadTables = useCallback(async () => {
    const params = new URLSearchParams();
    if (zoneFilter) params.set('zoneId', zoneFilter);
    const res = await fetch(`/api/tables?${params}`);
    if (res.ok) setTables(await res.json());
  }, [zoneFilter]);

  useEffect(() => {
    loadZones();
  }, [loadZones]);

  useEffect(() => {
    loadTables();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoneFilter]);

  useEffect(() => {
    if (viewMode !== 'floor' || editMode) return;
    const id = setInterval(loadTables, REFETCH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [viewMode, editMode, loadTables]);

  const filteredTables = zoneFilter
    ? tables.filter((t) => t.zoneId === zoneFilter)
    : tables;

  const stats = {
    free: tables.filter((t) => t.status === 'FREE').length,
    occupied: tables.filter((t) => t.status === 'OCCUPIED').length,
    reserved: tables.filter((t) => t.status === 'RESERVED').length,
    total: tables.length,
  };

  const handleTableClick = (table: TableWithSession, e: React.MouseEvent) => {
    if (editMode) return;
    setPopoverTable(table);
    setPopoverAnchor({ x: e.clientX, y: e.clientY });
  };

  const handleStatusChange = async (tableId: string, status: string) => {
    const res = await fetch(`/api/tables/${tableId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setTables((prev) =>
        prev.map((t) => (t.id === tableId ? { ...t, status } : t))
      );
      if (popoverTable?.id === tableId) setPopoverTable((p) => (p ? { ...p, status } : null));
    }
  };

  const handleStartSession = (table: TableWithSession) => {
    setPopoverTable(null);
    setSessionStartTable(table);
  };

  const handleSessionStarted = () => {
    loadTables();
    setSessionStartTable(null);
  };

  const handleCloseSession = async (sessionId: string) => {
    const res = await fetch(`/api/tables/sessions/${sessionId}/close`, {
      method: 'PUT',
    });
    if (res.ok) {
      loadTables();
      setPopoverTable(null);
    }
  };

  const handlePositionSave = async (tableId: string, posX: number, posY: number) => {
    const x = Math.round(posX);
    const y = Math.round(posY);
    // Update local state immediately
    setTables((prev) =>
      prev.map((t) => (t.id === tableId ? { ...t, posX: x, posY: y } : t))
    );
    // Save to database - DO NOT call loadTables() after this
    await fetch(`/api/tables/${tableId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ posX: x, posY: y }),
    });
  };

  const handleTableSave = async (
    data: Parameters<TableForm['props']['onSave']>[0]
  ) => {
    if (tableEdit) {
      const res = await fetch(`/api/tables/${tableEdit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error);
    } else {
      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error);
    }
    loadTables();
    setTableFormOpen(false);
    setTableEdit(null);
  };

  const handleTableDelete = async () => {
    if (!tableDelete) return;
    const res = await fetch(`/api/tables/${tableDelete.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || 'წაშლა ვერ მოხერხდა');
      setTableDelete(null);
      return;
    }
    loadTables();
    setTableDelete(null);
    setPopoverTable(null);
  };

  return (
    <div ref={containerRef} className="space-y-6">
      <motion.h1
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold text-white"
      >
        მაგიდები
      </motion.h1>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-2">
          <button
            type="button"
            onClick={() => setZoneFilter('')}
            className={`shrink-0 rounded-xl border px-4 py-2 text-sm font-medium transition ${
              !zoneFilter
                ? 'border-orange-500/20 bg-orange-500/10 text-orange-400'
                : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            ყველა
          </button>
          {zones.filter((z) => z.isActive).map((z) => (
            <button
              key={z.id}
              type="button"
              onClick={() => setZoneFilter(z.id)}
              className={`shrink-0 flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition ${
                zoneFilter === z.id
                  ? 'border-orange-500/20 bg-orange-500/10 text-orange-400'
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
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
            <span className="text-emerald-400">{stats.free} თავისუფალი</span>
            <span className="text-red-400">{stats.occupied} დაკავებული</span>
            <span className="text-yellow-400">{stats.reserved} რეზერვირებული</span>
            <span>სულ: {stats.total}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setZoneManagerOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/10"
            >
              <Settings className="h-4 w-4" /> ზონის მართვა
            </button>
            <button
              type="button"
              onClick={() => { setTableEdit(null); setTableFormOpen(true); }}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> ახალი მაგიდა
            </button>
            <button
              type="button"
              onClick={() => {
                setEditMode((prev) => {
                  if (prev) loadTables();
                  return !prev;
                });
              }}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition ${
                editMode
                  ? 'border-orange-500/20 bg-orange-500/10 text-orange-400'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              <Pencil className="h-4 w-4" /> რედაქტირების რეჟიმი
            </button>
            <div className="flex rounded-xl border border-white/10 overflow-hidden">
              <button
                type="button"
                onClick={() => setViewMode('floor')}
                className={`px-4 py-2 text-sm font-medium ${
                  viewMode === 'floor'
                    ? 'bg-orange-500/20 text-orange-400'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 text-sm font-medium ${
                  viewMode === 'list'
                    ? 'bg-orange-500/20 text-orange-400'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {viewMode === 'floor' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative"
        >
          <FloorPlan
            tables={filteredTables}
            editMode={editMode}
            onTableClick={handleTableClick}
            onPositionSave={handlePositionSave}
          />
        </motion.div>
      )}

      {viewMode === 'list' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <TableListView
            tables={filteredTables}
            onEdit={(t) => { setTableEdit(t); setTableFormOpen(true); }}
            onDelete={setTableDelete}
          />
        </motion.div>
      )}

      {popoverTable && (
        <TablePopover
          table={popoverTable}
          anchor={popoverAnchor}
          onClose={() => setPopoverTable(null)}
          onStatusChange={handleStatusChange}
          onStartSession={handleStartSession}
          onCloseSession={handleCloseSession}
          onEdit={(t) => { setPopoverTable(null); setTableEdit(t); setTableFormOpen(true); }}
          onDelete={(t) => { setPopoverTable(null); setTableDelete(t); }}
        />
      )}

      <TableForm
        open={tableFormOpen}
        onClose={() => { setTableFormOpen(false); setTableEdit(null); }}
        onSave={handleTableSave}
        edit={tableEdit as TableRow | null}
        zones={zones}
      />

      <ZoneManager
        open={zoneManagerOpen}
        onClose={() => setZoneManagerOpen(false)}
        zones={zones}
        onRefresh={() => { loadZones(); loadTables(); }}
      />

      {sessionStartTable && (
        <SessionStartForm
          open={!!sessionStartTable}
          onClose={() => setSessionStartTable(null)}
          tableId={sessionStartTable.id}
          tableNumber={sessionStartTable.number}
          onSuccess={handleSessionStarted}
        />
      )}

      <ConfirmDialog
        open={!!tableDelete}
        onClose={() => setTableDelete(null)}
        onConfirm={handleTableDelete}
        message="ნამდვილად წაშალოთ ეს მაგიდა?"
        confirmLabel="წაშლა"
        variant="danger"
      />
    </div>
  );
}
