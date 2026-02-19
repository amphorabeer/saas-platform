'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Toggle } from '@/components/ui/Toggle';

const RESTAURANT_TYPES = [
  { value: 'restaurant', label: 'რესტორანი' },
  { value: 'cafe', label: 'კაფე' },
  { value: 'bar', label: 'ბარი' },
  { value: 'pub', label: 'პაბი' },
  { value: 'bistro', label: 'ბისტრო' },
];

const CURRENCIES = [
  { value: 'GEL', label: 'GEL (₾)' },
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
];

export type RestaurantProfileData = {
  name: string;
  type: string;
  address: string;
  phone: string;
  email: string;
  taxId: string;
  currency: string;
  timezone: string;
  logoUrl: string;
  isActive: boolean;
  company: string;
  directorName: string;
  bankName: string;
  bankAccount: string;
  bankSWIFT: string;
};

const defaultData: RestaurantProfileData = {
  name: '',
  type: 'restaurant',
  address: '',
  phone: '',
  email: '',
  taxId: '',
  currency: 'GEL',
  timezone: 'Asia/Tbilisi',
  logoUrl: '',
  isActive: true,
  company: '',
  directorName: '',
  bankName: '',
  bankAccount: '',
  bankSWIFT: '',
};

type InitialRestaurant = Partial<RestaurantProfileData> & {
  organization?: {
    company?: string | null;
    taxId?: string | null;
    bankName?: string | null;
    bankAccount?: string | null;
    directorName?: string | null;
    bankSWIFT?: string | null;
  } | null;
};

type Props = {
  initial: InitialRestaurant | null;
  onSave: (data: RestaurantProfileData) => Promise<void>;
  canEdit: boolean;
};

export function RestaurantProfileForm({ initial, onSave, canEdit }: Props) {
  const [form, setForm] = useState<RestaurantProfileData>(defaultData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initial) {
      const org = initial.organization;
      setForm({
        name: initial.name ?? defaultData.name,
        type: initial.type ?? defaultData.type,
        address: initial.address ?? '',
        phone: initial.phone ?? '',
        email: initial.email ?? '',
        taxId: initial.taxId ?? org?.taxId ?? '',
        currency: initial.currency ?? defaultData.currency,
        timezone: initial.timezone ?? defaultData.timezone,
        logoUrl: initial.logoUrl ?? '',
        isActive: initial.isActive ?? true,
        company: org?.company ?? '',
        directorName: org?.directorName ?? '',
        bankName: org?.bankName ?? '',
        bankAccount: org?.bankAccount ?? '',
        bankSWIFT: org?.bankSWIFT ?? '',
      });
    }
  }, [initial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) {
      setError('რესტორნის სახელი აუცილებელია');
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'შეცდომა');
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-orange-500/50 focus:outline-none focus:ring-1 focus:ring-orange-500/30 disabled:opacity-50';
  const labelClass = 'mb-1 block text-sm font-medium text-slate-400';

  return (
    <motion.form
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl border border-white/10 bg-[#1E293B]/60 p-6 backdrop-blur-sm"
    >
      <h3 className="text-base font-semibold text-white">რესტორნის პროფილი</h3>

      {error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelClass}>სახელი *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            className={inputClass}
            placeholder="რესტორნის სახელი"
            disabled={!canEdit}
          />
        </div>
        <div>
          <label className={labelClass}>ტიპი</label>
          <select
            value={form.type}
            onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
            className={inputClass}
            disabled={!canEdit}
          >
            {RESTAURANT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>ვალუტა</label>
          <select
            value={form.currency}
            onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
            className={inputClass}
            disabled={!canEdit}
          >
            {CURRENCIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>მისამართი</label>
          <input
            type="text"
            value={form.address}
            onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
            className={inputClass}
            placeholder="მისამართი"
            disabled={!canEdit}
          />
        </div>
        <div>
          <label className={labelClass}>ტელეფონი</label>
          <input
            type="text"
            value={form.phone}
            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
            className={inputClass}
            placeholder="+995 ..."
            disabled={!canEdit}
          />
        </div>
        <div>
          <label className={labelClass}>ელ-ფოსტა</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            className={inputClass}
            placeholder="email@example.com"
            disabled={!canEdit}
          />
        </div>
        <div>
          <label className={labelClass}>საიდენტიფიკაციო (Tax ID)</label>
          <input
            type="text"
            value={form.taxId}
            onChange={(e) => setForm((p) => ({ ...p, taxId: e.target.value }))}
            className={inputClass}
            placeholder="საიდენტიფიკაციო ნომერი"
            disabled={!canEdit}
          />
        </div>
        <div>
          <label className={labelClass}>Timezone</label>
          <input
            type="text"
            value={form.timezone}
            onChange={(e) => setForm((p) => ({ ...p, timezone: e.target.value }))}
            className={inputClass}
            placeholder="Asia/Tbilisi"
            disabled={!canEdit}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>ლოგოს URL</label>
          <input
            type="url"
            value={form.logoUrl}
            onChange={(e) => setForm((p) => ({ ...p, logoUrl: e.target.value }))}
            className={inputClass}
            placeholder="https://..."
            disabled={!canEdit}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>ხელმძღვანელი</label>
          <input
            type="text"
            value={form.directorName}
            onChange={(e) => setForm((p) => ({ ...p, directorName: e.target.value }))}
            className={inputClass}
            placeholder="ხელმძღვანელის სახელი"
            disabled={!canEdit}
          />
        </div>
        {/* საბანკო ინფორმაცია */}
        <div className="sm:col-span-2 border-t border-slate-700 pt-6 mt-2">
          <h3 className="text-lg font-semibold text-white mb-4">🏦 საბანკო ინფორმაცია</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">ბანკის სახელი</label>
              <input
                type="text"
                value={form.bankName}
                onChange={(e) => setForm((p) => ({ ...p, bankName: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none disabled:opacity-50"
                placeholder="საქართველოს ბანკი"
                disabled={!canEdit}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">საბანკო ანგარიში (IBAN)</label>
              <input
                type="text"
                value={form.bankAccount}
                onChange={(e) => setForm((p) => ({ ...p, bankAccount: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none disabled:opacity-50"
                placeholder="GE00TB0000000000000000"
                disabled={!canEdit}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">SWIFT კოდი</label>
              <input
                type="text"
                value={form.bankSWIFT}
                onChange={(e) => setForm((p) => ({ ...p, bankSWIFT: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none disabled:opacity-50"
                placeholder="TBCBGE22"
                disabled={!canEdit}
              />
            </div>
          </div>
        </div>
        <div className="sm:col-span-2 flex items-center gap-2">
          <Toggle
            checked={form.isActive}
            onCheckedChange={(checked) => setForm((p) => ({ ...p, isActive: checked }))}
            disabled={!canEdit}
            label="რესტორანი აქტიურია"
          />
        </div>
      </div>

      {canEdit && (
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-[#F97316] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-orange-600 disabled:opacity-50"
          >
            {saving ? 'შენახვა...' : 'შენახვა'}
          </button>
        </div>
      )}
    </motion.form>
  );
}
