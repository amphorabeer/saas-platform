'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { PINGenerator } from './PINGenerator';

const ROLES = [
  { value: 'WAITER', label: 'ოფიციანტი' },
  { value: 'BARTENDER', label: 'ბარმენი' },
  { value: 'CHEF', label: 'მზარეული' },
  { value: 'MANAGER', label: 'მენეჯერი' },
  { value: 'HOST', label: 'ჰოსტი' },
  { value: 'CASHIER', label: 'კასირი' },
] as const;

export type EmployeeFormData = {
  firstName: string;
  lastName: string;
  role: string;
  pin: string;
  phone: string;
  email: string;
  photoUrl: string;
  isActive: boolean;
};

const emptyForm: EmployeeFormData = {
  firstName: '',
  lastName: '',
  role: 'WAITER',
  pin: '',
  phone: '',
  email: '',
  photoUrl: '',
  isActive: true,
};

type EmployeeFormProps = {
  open: boolean;
  onClose: () => void;
  initial?: Partial<EmployeeFormData> & { id?: string };
  onSave: (data: EmployeeFormData) => Promise<void>;
  onGeneratePin?: (employeeId: string) => Promise<string | null>;
  onGeneratePinForNew?: () => Promise<string | null>;
};

export function EmployeeForm({ open, onClose, initial, onSave, onGeneratePin, onGeneratePinForNew }: EmployeeFormProps) {
  const [form, setForm] = useState<EmployeeFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm({
        firstName: initial?.firstName ?? '',
        lastName: initial?.lastName ?? '',
        role: initial?.role ?? 'WAITER',
        pin: initial?.pin ?? '',
        phone: initial?.phone ?? '',
        email: initial?.email ?? '',
        photoUrl: initial?.photoUrl ?? '',
        isActive: initial?.isActive ?? true,
      });
      setError('');
    }
  }, [open, initial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('სახელი და გვარი აუცილებელია');
      return;
    }
    const pinClean = form.pin.replace(/\D/g, '').slice(0, 6);
    if (pinClean && pinClean.length !== 6) {
      setError('PIN უნდა იყოს 6 ციფრი');
      return;
    }
    setSaving(true);
    try {
      await onSave({ ...form, pin: pinClean || form.pin });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'შეცდომა');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={initial?.id ? 'რედაქტირება' : 'ახალი თანამშრომელი'} maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm text-slate-400">სახელი *</label>
            <input
              value={form.firstName}
              onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-400">გვარი *</label>
            <input
              value={form.lastName}
              onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
              required
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-400">როლი</label>
          <select
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[120px]">
            <label className="mb-1 block text-sm text-slate-400">PIN (6 ციფრი)</label>
            <input
              value={form.pin}
              onChange={(e) => setForm((f) => ({ ...f, pin: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
              placeholder="000000"
              maxLength={6}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-white"
            />
          </div>
          {(onGeneratePin && initial?.id) || onGeneratePinForNew ? (
            <PINGenerator
              onGenerate={
                initial?.id && onGeneratePin
                  ? () => onGeneratePin(initial.id!)
                  : onGeneratePinForNew ?? (async () => null)
              }
              onApply={(pin) => setForm((f) => ({ ...f, pin }))}
              disabled={saving}
            />
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm text-slate-400">ტელეფონი</label>
            <input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-400">ელ-ფოსტა</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-400">ფოტო URL</label>
          <input
            value={form.photoUrl}
            onChange={(e) => setForm((f) => ({ ...f, photoUrl: e.target.value }))}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isActive"
            checked={form.isActive}
            onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            className="rounded border-white/20 bg-white/5"
          />
          <label htmlFor="isActive" className="text-sm text-slate-400">
            აქტიური
          </label>
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
