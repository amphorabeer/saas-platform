'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Toggle } from '@/components/ui/Toggle';

export type RestaurantSettingsFormData = {
  defaultPrepTimeMinutes: number;
  autoCloseSessionMinutes: number;
  tipsEnabled: boolean;
  tipsPoolPercent: number;
  taxRatePercent: number;
  receiptFooterText: string;
};

const defaultData: RestaurantSettingsFormData = {
  defaultPrepTimeMinutes: 15,
  autoCloseSessionMinutes: 0,
  tipsEnabled: true,
  tipsPoolPercent: 100,
  taxRatePercent: 0,
  receiptFooterText: '',
};

function parseSettings(settings: Record<string, unknown> | null): RestaurantSettingsFormData {
  if (!settings) return { ...defaultData };
  return {
    defaultPrepTimeMinutes:
      typeof settings.defaultPrepTimeMinutes === 'number'
        ? settings.defaultPrepTimeMinutes
        : defaultData.defaultPrepTimeMinutes,
    autoCloseSessionMinutes:
      typeof settings.autoCloseSessionMinutes === 'number'
        ? settings.autoCloseSessionMinutes
        : defaultData.autoCloseSessionMinutes,
    tipsEnabled:
      typeof settings.tipsEnabled === 'boolean' ? settings.tipsEnabled : defaultData.tipsEnabled,
    tipsPoolPercent:
      typeof settings.tipsPoolPercent === 'number'
        ? settings.tipsPoolPercent
        : defaultData.tipsPoolPercent,
    taxRatePercent:
      typeof settings.taxRatePercent === 'number'
        ? settings.taxRatePercent
        : defaultData.taxRatePercent,
    receiptFooterText:
      typeof settings.receiptFooterText === 'string'
        ? settings.receiptFooterText
        : defaultData.receiptFooterText,
  };
}

type Props = {
  initialSettings: Record<string, unknown> | null;
  onSave: (data: RestaurantSettingsFormData) => Promise<void>;
  canEdit: boolean;
};

export function RestaurantSettingsForm({ initialSettings, onSave, canEdit }: Props) {
  const [form, setForm] = useState<RestaurantSettingsFormData>(defaultData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setForm(parseSettings(initialSettings));
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
      <h3 className="text-base font-semibold text-white">სხვა პარამეტრები</h3>
      {error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>ნაგულისხმევი მომზადების დრო (წუთი)</label>
          <input
            type="number"
            min={0}
            max={120}
            value={form.defaultPrepTimeMinutes}
            onChange={(e) =>
              setForm((p) => ({ ...p, defaultPrepTimeMinutes: parseInt(e.target.value, 10) || 0 }))
            }
            className={inputClass}
            disabled={!canEdit}
          />
        </div>
        <div>
          <label className={labelClass}>ავტო-დახურვა სესია (წუთი, 0 = გამორთული)</label>
          <input
            type="number"
            min={0}
            max={1440}
            value={form.autoCloseSessionMinutes}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                autoCloseSessionMinutes: parseInt(e.target.value, 10) || 0,
              }))
            }
            className={inputClass}
            disabled={!canEdit}
          />
        </div>
        <div className="sm:col-span-2 flex items-center gap-2">
          <Toggle
            checked={form.tipsEnabled}
            onCheckedChange={(checked) => setForm((p) => ({ ...p, tipsEnabled: checked }))}
            disabled={!canEdit}
            label="Tips ჩართულია"
          />
        </div>
        <div>
          <label className={labelClass}>Tips pool %</label>
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            value={form.tipsPoolPercent}
            onChange={(e) =>
              setForm((p) => ({ ...p, tipsPoolPercent: parseFloat(e.target.value) || 0 }))
            }
            className={inputClass}
            disabled={!canEdit}
          />
        </div>
        <div>
          <label className={labelClass}>გადასახადი %</label>
          <input
            type="number"
            min={0}
            max={100}
            step={0.01}
            value={form.taxRatePercent}
            onChange={(e) =>
              setForm((p) => ({ ...p, taxRatePercent: parseFloat(e.target.value) || 0 }))
            }
            className={inputClass}
            disabled={!canEdit}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>ჩეკის ფუტერის ტექსტი</label>
          <textarea
            value={form.receiptFooterText}
            onChange={(e) => setForm((p) => ({ ...p, receiptFooterText: e.target.value }))}
            className={inputClass}
            rows={2}
            placeholder="მადლობა ვიზიტისთვის"
            disabled={!canEdit}
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
