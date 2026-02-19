'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { TimeSlotPicker } from './TimeSlotPicker';
import { AvailableTableSelect, type TableOption } from './AvailableTableSelect';

const DURATIONS = [
  { value: 60, label: '1 სთ' },
  { value: 90, label: '1.5 სთ' },
  { value: 120, label: '2 სთ' },
  { value: 150, label: '2.5 სთ' },
  { value: 180, label: '3 სთ' },
];

export type ReservationFormData = {
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  guestCount: number;
  date: string;
  time: string;
  duration: number;
  tableId: string | null;
  status: string;
  notes: string;
};

const emptyForm: ReservationFormData = {
  guestName: '',
  guestPhone: '',
  guestEmail: '',
  guestCount: 2,
  date: '',
  time: '12:00',
  duration: 120,
  tableId: null,
  status: 'PENDING',
  notes: '',
};

export function ReservationForm({
  open,
  onClose,
  initial,
  availableTables,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Partial<ReservationFormData> & { id?: string };
  availableTables: TableOption[];
  onSave: (data: ReservationFormData) => Promise<void>;
}) {
  const [form, setForm] = useState<ReservationFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      const today = new Date().toISOString().slice(0, 10);
      setForm({
        guestName: initial?.guestName ?? '',
        guestPhone: initial?.guestPhone ?? '',
        guestEmail: initial?.guestEmail ?? '',
        guestCount: initial?.guestCount ?? 2,
        date: initial?.date ?? today,
        time: initial?.time ?? '12:00',
        duration: initial?.duration ?? 120,
        tableId: initial?.tableId ?? null,
        status: initial?.status ?? 'PENDING',
        notes: initial?.notes ?? '',
      });
      setError('');
    }
  }, [open, initial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.guestName.trim()) {
      setError('სტუმრის სახელი აუცილებელია');
      return;
    }
    if (form.guestCount < 1 || form.guestCount > 20) {
      setError('სტუმრების რაოდენობა 1–20');
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'შეცდომა');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial?.id ? 'რეზერვაციის რედაქტირება' : 'ახალი რეზერვაცია'}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div>
          <label className="mb-1 block text-sm text-slate-400">სტუმრის სახელი *</label>
          <input
            value={form.guestName}
            onChange={(e) => setForm((f) => ({ ...f, guestName: e.target.value }))}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm text-slate-400">ტელეფონი</label>
            <input
              value={form.guestPhone}
              onChange={(e) => setForm((f) => ({ ...f, guestPhone: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-400">ელ-ფოსტა</label>
            <input
              type="email"
              value={form.guestEmail}
              onChange={(e) => setForm((f) => ({ ...f, guestEmail: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-400">სტუმრების რაოდენობა *</label>
          <input
            type="number"
            min={1}
            max={20}
            value={form.guestCount}
            onChange={(e) => setForm((f) => ({ ...f, guestCount: Number(e.target.value) || 1 }))}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm text-slate-400">თარიღი *</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-400">დრო *</label>
            <TimeSlotPicker
              value={form.time}
              onChange={(t) => setForm((f) => ({ ...f, time: t }))}
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-400">ხანგრძლივობა</label>
          <select
            value={form.duration}
            onChange={(e) => setForm((f) => ({ ...f, duration: Number(e.target.value) }))}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
          >
            {DURATIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-400">მაგიდა</label>
          <AvailableTableSelect
            tables={availableTables}
            value={form.tableId}
            onChange={(id) => setForm((f) => ({ ...f, tableId: id }))}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-400">შენიშვნა</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={2}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-white/10 px-4 py-2 text-slate-300 hover:bg-white/5">
            გაუქმება
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-orange-500 px-4 py-2 font-medium text-white hover:bg-orange-600 disabled:opacity-50"
          >
            {saving ? 'შენახვა...' : 'შენახვა'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
