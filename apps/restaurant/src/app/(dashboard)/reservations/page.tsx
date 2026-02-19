'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, List, Plus } from 'lucide-react';
import { ReservationStats } from '@/components/reservations/ReservationStats';
import { ReservationCalendar } from '@/components/reservations/ReservationCalendar';
import { ReservationListView } from '@/components/reservations/ReservationListView';
import { ReservationForm, type ReservationFormData } from '@/components/reservations/ReservationForm';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { TableOption } from '@/components/reservations/AvailableTableSelect';

type ViewMode = 'calendar' | 'list';
type ReservationItem = {
  id: string;
  guestName: string;
  guestPhone: string | null;
  guestEmail: string | null;
  guestCount: number;
  date: string;
  time: string;
  duration: number;
  tableId: string | null;
  status: string;
  notes: string | null;
  smsSent?: boolean;
  table?: { id: string; number: string; zoneName?: string } | null;
};

export default function ReservationsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [tables, setTables] = useState<Array<{ id: string; number: string }>>([]);
  const [stats, setStats] = useState<{
    totalReservations: number;
    totalGuests: number;
    freeTables: number;
    nextUpcoming: { guestName: string; time: string; guestCount: number } | null;
  }>({ totalReservations: 0, totalGuests: 0, freeTables: 0, nextUpcoming: null });
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editReservation, setEditReservation] = useState<ReservationItem | null>(null);
  const [prefillTableId, setPrefillTableId] = useState<string | null>(null);
  const [prefillTime, setPrefillTime] = useState<string>('');
  const [availableTables, setAvailableTables] = useState<TableOption[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<ReservationItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [statusLoadingId, setStatusLoadingId] = useState<string | null>(null);

  const fetchReservations = useCallback(async () => {
    const params = new URLSearchParams({ date: selectedDate });
    if (statusFilter) params.set('status', statusFilter);
    if (search.trim()) params.set('search', search.trim());
    const res = await fetch(`/api/reservations?${params}`);
    if (!res.ok) return;
    const data = await res.json();
    setReservations(data);
  }, [selectedDate, statusFilter, search]);

  const fetchStats = useCallback(async () => {
    const res = await fetch(`/api/reservations/stats?date=${selectedDate}`);
    if (!res.ok) return;
    const data = await res.json();
    setStats({
      totalReservations: data.totalReservations ?? 0,
      totalGuests: data.totalGuests ?? 0,
      freeTables: data.freeTables ?? 0,
      nextUpcoming: data.nextUpcoming ?? null,
    });
  }, [selectedDate]);

  const fetchTables = useCallback(async () => {
    const res = await fetch('/api/tables');
    if (!res.ok) return;
    const data = await res.json();
    setTables(data.map((t: { id: string; number: string }) => ({ id: t.id, number: t.number })));
  }, []);

  const fetchAvailableTables = useCallback(
    async (date: string, time: string, duration: number, guestCount: number) => {
      const params = new URLSearchParams({ date, time, duration: String(duration), guestCount: String(guestCount) });
      const res = await fetch(`/api/reservations/available-tables?${params}`);
      if (!res.ok) return [];
      const data = await res.json();
      setAvailableTables(
        data.map((t: { id: string; number: string; seats: number; zoneName?: string }) => ({
          id: t.id,
          number: t.number,
          seats: t.seats,
          zoneName: t.zoneName,
        }))
      );
    },
    []
  );

  useEffect(() => {
    fetchReservations();
    fetchStats();
  }, [fetchReservations, fetchStats]);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  useEffect(() => {
    if (formOpen) {
      const date = editReservation?.date ?? selectedDate;
      const time = editReservation?.time ?? (prefillTime || '12:00');
      const duration = editReservation?.duration ?? 120;
      const guestCount = editReservation?.guestCount ?? 2;
      fetchAvailableTables(date, time, duration, guestCount);
    }
  }, [formOpen, editReservation, selectedDate, prefillTime, fetchAvailableTables]);

  const handleSaveReservation = async (data: ReservationFormData) => {
    if (editReservation?.id) {
      const res = await fetch(`/api/reservations/${editReservation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestName: data.guestName,
          guestPhone: data.guestPhone || null,
          guestEmail: data.guestEmail || null,
          guestCount: data.guestCount,
          date: data.date,
          time: data.time,
          duration: data.duration,
          tableId: data.tableId,
          notes: data.notes,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'შეცდომა');
      }
    } else {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestName: data.guestName,
          guestPhone: data.guestPhone || null,
          guestEmail: data.guestEmail || null,
          guestCount: data.guestCount,
          date: data.date,
          time: data.time,
          duration: data.duration,
          tableId: data.tableId,
          notes: data.notes,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'შეცდომა');
      }
    }
    setFormOpen(false);
    setEditReservation(null);
    setPrefillTableId(null);
    setPrefillTime('');
    fetchReservations();
    fetchStats();
  };

  const handleStatusChange = async (id: string, status: string) => {
    setStatusLoadingId(id);
    try {
      const res = await fetch(`/api/reservations/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        fetchReservations();
        fetchStats();
      }
    } finally {
      setStatusLoadingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/reservations/${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteTarget(null);
        fetchReservations();
        fetchStats();
      } else {
        const err = await res.json();
        alert(err.error || 'შეცდომა');
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredForList = reservations;

  const calendarReservations = reservations.map((r) => ({
    id: r.id,
    guestName: r.guestName,
    guestPhone: r.guestPhone,
    guestCount: r.guestCount,
    notes: r.notes,
    status: r.status,
    duration: r.duration || 120,
    tableId: r.tableId,
    time: r.time,
    date: r.date,
  }));

  return (
    <div className="space-y-6 p-4 md:p-6">
      <h1 className="text-2xl font-bold text-white">რეზერვაცია</h1>

      <div className="flex flex-wrap items-center gap-4">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
        />
        <ReservationStats
          totalReservations={stats.totalReservations}
          totalGuests={stats.totalGuests}
          freeTables={stats.freeTables}
          nextUpcoming={stats.nextUpcoming}
        />
        <div className="flex gap-2 ml-auto">
          <button
            type="button"
            onClick={() => {
              setEditReservation(null);
              setPrefillTableId(null);
              setPrefillTime('');
              setFormOpen(true);
            }}
            className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
          >
            <Plus className="h-4 w-4" /> ახალი რეზერვაცია
          </button>
          <div className="flex rounded-lg border border-white/10 overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-2 px-3 py-2 text-sm ${viewMode === 'calendar' ? 'bg-orange-500/30 text-orange-300' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
            >
              <Calendar className="h-4 w-4" /> კალენდარი
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-3 py-2 text-sm ${viewMode === 'list' ? 'bg-orange-500/30 text-orange-300' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
            >
              <List className="h-4 w-4" /> სია
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
        >
          <option value="">ყველა სტატუსი</option>
          <option value="PENDING">მოლოდინი</option>
          <option value="CONFIRMED">დადასტურებული</option>
          <option value="SEATED">დასხედა</option>
          <option value="COMPLETED">დასრულებული</option>
          <option value="CANCELLED">გაუქმებული</option>
          <option value="NO_SHOW">არ მოვიდა</option>
        </select>
        <input
          type="search"
          placeholder="სტუმარი / ტელეფონი"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 w-48"
        />
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'calendar' && (
          <motion.div
            key="calendar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ReservationCalendar
              tables={tables}
              reservations={calendarReservations}
              selectedDate={selectedDate}
              onBlockClick={(r) => {
                const full = reservations.find((x) => x.id === r.id);
                if (full) setEditReservation(full);
                setFormOpen(true);
              }}
              onEmptySlotClick={(tableId, time) => {
                setPrefillTableId(tableId);
                setPrefillTime(time);
                setEditReservation(null);
                setFormOpen(true);
              }}
            />
          </motion.div>
        )}
        {viewMode === 'list' && (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ReservationListView
              reservations={filteredForList.map((r) => ({
                ...r,
                table: r.table ? { number: r.table.number, zoneName: r.table.zoneName } : null,
              }))}
              onConfirm={(id) => handleStatusChange(id, 'CONFIRMED')}
              onSeat={(id) => handleStatusChange(id, 'SEATED')}
              onComplete={(id) => handleStatusChange(id, 'COMPLETED')}
              onCancel={(id) => handleStatusChange(id, 'CANCELLED')}
              onNoShow={(id) => handleStatusChange(id, 'NO_SHOW')}
              onEdit={(r) => { setEditReservation(r); setFormOpen(true); }}
              onDelete={(r) => setDeleteTarget(r)}
              loadingId={statusLoadingId}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <ReservationForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditReservation(null);
          setPrefillTableId(null);
          setPrefillTime('');
        }}
        initial={
          editReservation
            ? {
                guestName: editReservation.guestName,
                guestPhone: editReservation.guestPhone ?? '',
                guestEmail: editReservation.guestEmail ?? '',
                guestCount: editReservation.guestCount,
                date: editReservation.date,
                time: editReservation.time,
                duration: editReservation.duration || 120,
                tableId: editReservation.tableId,
                status: editReservation.status,
                notes: editReservation.notes ?? '',
              }
            : prefillTime || prefillTableId
              ? {
                  date: selectedDate,
                  time: prefillTime || '12:00',
                  tableId: prefillTableId,
                }
              : { date: selectedDate }
        }
        availableTables={availableTables}
        onSave={handleSaveReservation}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="რეზერვაციის წაშლა"
        message="ნამდვილად წაშალო?"
      />
    </div>
  );
}
