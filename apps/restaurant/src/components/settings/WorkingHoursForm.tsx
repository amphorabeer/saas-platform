'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Toggle } from '@/components/ui/Toggle';

const DAYS = [
  { key: 'mon', label: 'ორშაბათი' },
  { key: 'tue', label: 'სამშაბათი' },
  { key: 'wed', label: 'ოთხშაბათი' },
  { key: 'thu', label: 'ხუთშაბათი' },
  { key: 'fri', label: 'პარასკევი' },
  { key: 'sat', label: 'შაბათი' },
  { key: 'sun', label: 'კვირა' },
] as const;

export type DaySchedule = { open: string; close: string } | 'closed';

export type WorkingHoursData = Record<(typeof DAYS)[number]['key'], DaySchedule>;

const defaultSchedule: DaySchedule = { open: '09:00', close: '22:00' };

const defaultWorkingHours: WorkingHoursData = {
  mon: defaultSchedule,
  tue: defaultSchedule,
  wed: defaultSchedule,
  thu: defaultSchedule,
  fri: defaultSchedule,
  sat: defaultSchedule,
  sun: 'closed',
};

function parseWorkingHours(settings: Record<string, unknown> | null): WorkingHoursData {
  const raw = settings?.workingHours;
  if (!raw || typeof raw !== 'object') return { ...defaultWorkingHours };
  const out = { ...defaultWorkingHours };
  for (const day of DAYS) {
    const d = (raw as Record<string, unknown>)[day.key];
    if (d === 'closed') out[day.key] = 'closed';
    else if (d && typeof d === 'object' && 'open' in d && 'close' in d) {
      out[day.key] = {
        open: String((d as { open: unknown }).open || '09:00'),
        close: String((d as { close: unknown }).close || '22:00'),
      };
    }
  }
  return out;
}

type Props = {
  initialSettings: Record<string, unknown> | null;
  onSave: (workingHours: WorkingHoursData) => Promise<void>;
  canEdit: boolean;
};

export function WorkingHoursForm({ initialSettings, onSave, canEdit }: Props) {
  const [form, setForm] = useState<WorkingHoursData>(defaultWorkingHours);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setForm(parseWorkingHours(initialSettings));
  }, [initialSettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onSave(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'შეცდომა');
    } finally {
      setSaving(false);
    }
  };

  const setDay = (day: (typeof DAYS)[number]['key'], value: DaySchedule) => {
    setForm((p) => ({ ...p, [day]: value }));
  };

  const inputClass =
    'rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-orange-500/50 focus:outline-none disabled:opacity-50';

  return (
    <motion.form
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-white/10 bg-[#1E293B]/60 p-6 backdrop-blur-sm"
    >
      <h3 className="text-base font-semibold text-white">სამუშაო საათები</h3>
      {error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
      )}
      <div className="space-y-3">
        {DAYS.map(({ key, label }) => {
          const val = form[key];
          const isClosed = val === 'closed';
          return (
            <div
              key={key}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-white/5 bg-white/5 p-3"
            >
              <span className="w-28 text-sm text-slate-300">{label}</span>
              <Toggle
                checked={!isClosed}
                onCheckedChange={(checked) =>
                  setDay(key, checked ? { open: '09:00', close: '22:00' } : 'closed')
                }
                disabled={!canEdit}
                label={isClosed ? 'დახურულია' : 'ღიაა'}
              />
              {!isClosed && (
                <>
                  <input
                    type="time"
                    value={val.open}
                    onChange={(e) =>
                      setDay(key, { ...(val as { open: string; close: string }), open: e.target.value })
                    }
                    className={inputClass}
                    disabled={!canEdit}
                  />
                  <span className="text-slate-500">–</span>
                  <input
                    type="time"
                    value={(val as { open: string; close: string }).close}
                    onChange={(e) =>
                      setDay(key, { ...(val as { open: string; close: string }), close: e.target.value })
                    }
                    className={inputClass}
                    disabled={!canEdit}
                  />
                </>
              )}
            </div>
          );
        })}
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
