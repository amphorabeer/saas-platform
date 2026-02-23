'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { DAYS_OF_WEEK } from '@/lib/utils';

interface StaffModalProps {
  staff: any | null;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

export function StaffModal({ staff, onClose, onSave }: StaffModalProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'schedule' | 'commission'>('info');
  
  const [form, setForm] = useState({
    name: staff?.name || '',
    email: staff?.email || '',
    phone: staff?.phone || '',
    role: staff?.role || 'SPECIALIST',
    specialties: staff?.specialties?.join(', ') || '',
    bio: staff?.bio || '',
    pin: staff?.pin || '',
    password: '',
    commissionType: staff?.commissionType || 'PERCENTAGE',
    commissionRate: staff?.commissionRate?.toString() || '0',
    isActive: staff?.isActive ?? true,
  });

  const [schedules, setSchedules] = useState(
    DAYS_OF_WEEK.map((day) => {
      const existing = staff?.schedules?.find((s: any) => s.dayOfWeek === day.value);
      return {
        dayOfWeek: day.value,
        startTime: existing?.startTime || '09:00',
        endTime: existing?.endTime || '18:00',
        isOff: existing?.isOff ?? (day.value === 0),
      };
    })
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    setLoading(true);
    try {
      await onSave({
        name: form.name,
        email: form.email || null,
        phone: form.phone || null,
        role: form.role,
        specialties: form.specialties
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean),
        bio: form.bio || null,
        pin: form.pin || null,
        password: form.password || undefined,
        commissionType: form.commissionType,
        commissionRate: parseFloat(form.commissionRate) || 0,
        isActive: form.isActive,
        schedules,
      });
      onClose();
    } catch {
      // Error handled in parent
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'info' as const, label: 'ინფორმაცია' },
    { id: 'schedule' as const, label: 'გრაფიკი' },
    { id: 'commission' as const, label: 'კომისია' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-dark-800 border border-dark-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
          <h2 className="text-lg font-semibold text-white">
            {staff ? 'რედაქტირება' : 'ახალი სპეციალისტი'}
          </h2>
          <button onClick={onClose} className="text-dark-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-dark-700 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-400'
                  : 'border-transparent text-dark-400 hover:text-dark-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {activeTab === 'info' && (
            <div className="space-y-4">
              <div>
                <label className="label">სახელი *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input"
                  placeholder="სახელი გვარი"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">ელფოსტა</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="input"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="label">ტელეფონი</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="input"
                    placeholder="+995..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">როლი</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="select"
                  >
                    <option value="OWNER">მფლობელი</option>
                    <option value="ADMIN">ადმინისტრატორი</option>
                    <option value="SPECIALIST">სპეციალისტი</option>
                    <option value="RECEPTIONIST">მიმღები</option>
                  </select>
                </div>
                <div>
                  <label className="label">PIN კოდი</label>
                  <input
                    type="text"
                    value={form.pin}
                    onChange={(e) => setForm({ ...form, pin: e.target.value })}
                    className="input"
                    placeholder="4 ციფრი"
                    maxLength={6}
                  />
                </div>
              </div>

              {!staff && (
                <div>
                  <label className="label">პაროლი (ელფოსტით შესვლისთვის)</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="input"
                    placeholder="••••••••"
                  />
                </div>
              )}

              <div>
                <label className="label">სპეციალობები (მძიმით გამოყოფილი)</label>
                <input
                  type="text"
                  value={form.specialties}
                  onChange={(e) => setForm({ ...form, specialties: e.target.value })}
                  className="input"
                  placeholder="სტილისტი, კოლორისტი, მანიკური"
                />
              </div>

              <div>
                <label className="label">ბიოგრაფია</label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  className="input min-h-[80px] resize-none"
                  placeholder="მოკლე ბიოგრაფია..."
                />
              </div>
            </div>
          )}

          {activeTab === 'schedule' && (
            <div className="space-y-3">
              <p className="text-sm text-dark-400 mb-4">
                მიუთითეთ სამუშაო საათები კვირის ყოველი დღისთვის
              </p>
              {schedules.map((schedule, idx) => {
                const dayInfo = DAYS_OF_WEEK.find((d) => d.value === schedule.dayOfWeek);
                return (
                  <div
                    key={schedule.dayOfWeek}
                    className="flex items-center gap-3 p-3 bg-dark-900/50 rounded-lg"
                  >
                    <div className="w-24">
                      <span className="text-sm font-medium text-dark-200">
                        {dayInfo?.label}
                      </span>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!schedule.isOff}
                        onChange={(e) => {
                          const updated = [...schedules];
                          updated[idx] = { ...updated[idx], isOff: !e.target.checked };
                          setSchedules(updated);
                        }}
                        className="w-4 h-4 rounded border-dark-600 bg-dark-700 text-primary-500 focus:ring-primary-500"
                      />
                      <span className="text-xs text-dark-400">სამუშაო</span>
                    </label>
                    {!schedule.isOff && (
                      <>
                        <input
                          type="time"
                          value={schedule.startTime}
                          onChange={(e) => {
                            const updated = [...schedules];
                            updated[idx] = { ...updated[idx], startTime: e.target.value };
                            setSchedules(updated);
                          }}
                          className="input w-28 text-sm"
                        />
                        <span className="text-dark-500">—</span>
                        <input
                          type="time"
                          value={schedule.endTime}
                          onChange={(e) => {
                            const updated = [...schedules];
                            updated[idx] = { ...updated[idx], endTime: e.target.value };
                            setSchedules(updated);
                          }}
                          className="input w-28 text-sm"
                        />
                      </>
                    )}
                    {schedule.isOff && (
                      <span className="text-sm text-dark-500 italic">დასვენების დღე</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'commission' && (
            <div className="space-y-4">
              <div>
                <label className="label">კომისიის ტიპი</label>
                <select
                  value={form.commissionType}
                  onChange={(e) => setForm({ ...form, commissionType: e.target.value })}
                  className="select"
                >
                  <option value="NONE">არ არის</option>
                  <option value="PERCENTAGE">პროცენტული (%)</option>
                  <option value="FIXED">ფიქსირებული (₾)</option>
                </select>
              </div>

              {form.commissionType !== 'NONE' && (
                <div>
                  <label className="label">
                    კომისიის ოდენობა{' '}
                    {form.commissionType === 'PERCENTAGE' ? '(%)' : '(₾)'}
                  </label>
                  <input
                    type="number"
                    value={form.commissionRate}
                    onChange={(e) => setForm({ ...form, commissionRate: e.target.value })}
                    className="input"
                    min="0"
                    step={form.commissionType === 'PERCENTAGE' ? '1' : '0.01'}
                  />
                </div>
              )}

              <div className="p-4 bg-dark-900/50 rounded-lg">
                <p className="text-sm text-dark-300">
                  {form.commissionType === 'PERCENTAGE' &&
                    `სპეციალისტი მიიღებს ყოველი სერვისის ღირებულების ${form.commissionRate || 0}%-ს`}
                  {form.commissionType === 'FIXED' &&
                    `სპეციალისტი მიიღებს ყოველ სერვისზე ${form.commissionRate || 0}₾-ს`}
                  {form.commissionType === 'NONE' &&
                    'სპეციალისტისთვის კომისია არ არის მითითებული'}
                </p>
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-dark-700">
          <button type="button" onClick={onClose} className="btn-secondary">
            გაუქმება
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !form.name.trim()}
            className="btn-primary flex items-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {staff ? 'შენახვა' : 'დამატება'}
          </button>
        </div>
      </div>
    </div>
  );
}
