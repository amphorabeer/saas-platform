'use client';

import { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  Building2,
  Clock,
  Link,
  Gift,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SalonData {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  description: string | null;
  workingHours: Record<string, { open: string; close: string; isOff: boolean }>;
  settings: Record<string, any>;
}

type Tab = 'general' | 'hours' | 'booking' | 'loyalty';

const DAYS_KA: Record<string, string> = {
  monday: 'ორშაბათი',
  tuesday: 'სამშაბათი',
  wednesday: 'ოთხშაბათი',
  thursday: 'ხუთშაბათი',
  friday: 'პარასკევი',
  saturday: 'შაბათი',
  sunday: 'კვირა',
};

const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const DEFAULT_HOURS = { open: '10:00', close: '20:00', isOff: false };

export function SettingsClient() {
  const [data, setData] = useState<SalonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<Tab>('general');

  // Form states
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [workingHours, setWorkingHours] = useState<Record<string, { open: string; close: string; isOff: boolean }>>({});
  const [loyaltyPointsPerGel, setLoyaltyPointsPerGel] = useState(10);
  const [autoLoyalty, setAutoLoyalty] = useState(true);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setName(d.name || '');
        setSlug(d.slug || '');
        setAddress(d.address || '');
        setPhone(d.phone || '');
        setEmail(d.email || '');
        setDescription(d.description || '');
        const hours: Record<string, any> = {};
        DAY_KEYS.forEach((day) => {
          hours[day] = d.workingHours?.[day] || DEFAULT_HOURS;
        });
        setWorkingHours(hours);
        setLoyaltyPointsPerGel(d.settings?.loyaltyPointsPerGel || 10);
        setAutoLoyalty(d.settings?.autoLoyalty !== false);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug,
          address: address || null,
          phone: phone || null,
          email: email || null,
          description: description || null,
          workingHours,
          settings: {
            ...data?.settings,
            loyaltyPointsPerGel,
            autoLoyalty,
          },
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      alert(err.message);
    }
    setSaving(false);
  };

  const updateHour = (day: string, field: string, value: any) => {
    setWorkingHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary-400/30 border-t-primary-400 rounded-full animate-spin" />
      </div>
    );
  }

  const bookingUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/book/${slug}`
    : `/book/${slug}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Settings size={24} className="text-primary-400" />
            პარამეტრები
          </h1>
          <p className="text-dark-400 mt-1">სალონის კონფიგურაცია</p>
        </div>
        <button
          onClick={saveSettings}
          disabled={saving}
          className={cn('btn-primary flex items-center gap-2', saved && 'bg-emerald-500 hover:bg-emerald-600')}
        >
          {saved ? <><CheckCircle size={16} /> შენახულია</> : saving ? 'ინახება...' : <><Save size={16} /> შენახვა</>}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {([
          { id: 'general' as Tab, label: 'ზოგადი', icon: Building2 },
          { id: 'hours' as Tab, label: 'სამუშაო საათები', icon: Clock },
          { id: 'booking' as Tab, label: 'ონლაინ ჯავშანი', icon: Link },
          { id: 'loyalty' as Tab, label: 'ლოიალობა', icon: Gift },
        ]).map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors',
                tab === t.id
                  ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                  : 'bg-dark-800 text-dark-300 border border-dark-700 hover:border-dark-600'
              )}>
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* General Tab */}
      {tab === 'general' && (
        <div className="card space-y-4">
          <h3 className="font-semibold text-white">სალონის ინფორმაცია</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">სალონის სახელი *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">ტელეფონი</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="input" placeholder="+995 5XX XX XX XX" />
            </div>
            <div>
              <label className="label">ელ-ფოსტა</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="salon@example.com" />
            </div>
            <div>
              <label className="label">მისამართი</label>
              <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="input" placeholder="ქ. თბილისი, ..." />
            </div>
          </div>
          <div>
            <label className="label">აღწერა</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              rows={3} className="input resize-none" placeholder="სალონის მოკლე აღწერა..." />
          </div>
        </div>
      )}

      {/* Working Hours Tab */}
      {tab === 'hours' && (
        <div className="card space-y-3">
          <h3 className="font-semibold text-white">სამუშაო საათები</h3>
          {DAY_KEYS.map((day) => {
            const h = workingHours[day] || DEFAULT_HOURS;
            return (
              <div key={day} className="flex items-center gap-3 p-3 bg-dark-800/50 rounded-lg">
                <span className="text-sm text-dark-200 w-24">{DAYS_KA[day]}</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!h.isOff}
                    onChange={(e) => updateHour(day, 'isOff', !e.target.checked)}
                    className="w-4 h-4 rounded border-dark-600 bg-dark-700 text-primary-500"
                  />
                  <span className="text-xs text-dark-400">{h.isOff ? 'დასვენება' : 'სამუშაო'}</span>
                </label>
                {!h.isOff && (
                  <div className="flex items-center gap-2 ml-auto">
                    <input type="time" value={h.open}
                      onChange={(e) => updateHour(day, 'open', e.target.value)}
                      className="input w-28 text-sm" />
                    <span className="text-dark-500">—</span>
                    <input type="time" value={h.close}
                      onChange={(e) => updateHour(day, 'close', e.target.value)}
                      className="input w-28 text-sm" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Booking Tab */}
      {tab === 'booking' && (
        <div className="card space-y-4">
          <h3 className="font-semibold text-white">ონლაინ ჯავშნის პარამეტრები</h3>
          <div>
            <label className="label">ჯავშნის Slug (URL-ში)</label>
            <div className="flex gap-2 items-center">
              <span className="text-xs text-dark-500 whitespace-nowrap">{typeof window !== 'undefined' ? window.location.origin : ''}/book/</span>
              <input type="text" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className="input flex-1" placeholder="my-salon" />
            </div>
            <p className="text-[10px] text-dark-500 mt-1">მხოლოდ a-z, 0-9, - სიმბოლოები</p>
          </div>
          <div className="p-3 bg-dark-800/50 rounded-lg">
            <p className="text-xs text-dark-400 mb-1">ჯავშნის ლინკი:</p>
            <p className="text-sm text-primary-400 font-mono">{bookingUrl}</p>
          </div>
        </div>
      )}

      {/* Loyalty Tab */}
      {tab === 'loyalty' && (
        <div className="card space-y-4">
          <h3 className="font-semibold text-white">ლოიალობის პარამეტრები</h3>
          <div>
            <label className="label">რამდენ ₾-ზე 1 ქულა</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-dark-400">ყოველ</span>
              <input type="number" value={loyaltyPointsPerGel}
                onChange={(e) => setLoyaltyPointsPerGel(Number(e.target.value))}
                min={1} max={100} className="input w-20" />
              <span className="text-sm text-dark-400">₾-ზე = 1 ქულა</span>
            </div>
            <p className="text-[10px] text-dark-500 mt-1">მაგ: 10 = ყოველ 10₾-ზე 1 ქულა</p>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={autoLoyalty}
              onChange={(e) => setAutoLoyalty(e.target.checked)}
              className="w-4 h-4 rounded border-dark-600 bg-dark-700 text-primary-500" />
            <div>
              <span className="text-sm text-dark-200">ავტომატური ქულების დაგროვება</span>
              <p className="text-[10px] text-dark-500">POS-ით გაყიდვისას ავტომატურად დაემატება ქულები</p>
            </div>
          </label>
          <div className="p-3 bg-dark-800/50 rounded-lg space-y-1">
            <p className="text-xs text-dark-400 font-medium">ლოიალობის დონეები:</p>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-dark-300">⭐ სტანდარტი: 0+</span>
              <span className="text-slate-300">🥈 ვერცხლი: 100+</span>
              <span className="text-amber-400">🥇 ოქრო: 500+</span>
              <span className="text-purple-400">💎 VIP: 1000+</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
