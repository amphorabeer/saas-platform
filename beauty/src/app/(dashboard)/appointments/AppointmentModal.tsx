'use client';

import { useState } from 'react';
import { X, Loader2, Plus, Trash2, Search, Check } from 'lucide-react';
import { cn, formatCurrency, APPOINTMENT_STATUSES } from '@/lib/utils';

interface AppointmentModalProps {
  appointment: any | null;
  prefill: any | null;
  staff: { id: string; name: string; specialties: string[] }[];
  services: { id: string; name: string; duration: number; price: number; categoryName: string | null }[];
  clients: { id: string; name: string; phone: string | null }[];
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  onStatusChange: (id: string, status: string) => Promise<void>;
}

export function AppointmentModal({
  appointment, prefill, staff, services, clients,
  onClose, onSave, onStatusChange,
}: AppointmentModalProps) {
  const [loading, setLoading] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientSearch, setShowClientSearch] = useState(false);

  const [form, setForm] = useState({
    clientId: appointment?.clientId || '',
    clientName: appointment?.clientName || '',
    staffId: appointment?.staffId || prefill?.staffId || staff[0]?.id || '',
    date: appointment?.date?.split('T')[0] || prefill?.date || new Date().toISOString().split('T')[0],
    startTime: appointment?.startTime || prefill?.startTime || '10:00',
    notes: appointment?.notes || '',
    source: appointment?.source || 'WALK_IN',
    selectedServices: appointment?.services?.map((s: any) => ({
      serviceId: s.serviceId || services.find((sv) => sv.name === s.name)?.id || '',
      name: s.name,
      price: s.price,
      duration: s.duration,
    })) || [],
  });

  const addService = (serviceId: string) => {
    const svc = services.find((s) => s.id === serviceId);
    if (!svc || form.selectedServices.some((s: any) => s.serviceId === serviceId)) return;
    setForm({
      ...form,
      selectedServices: [...form.selectedServices, {
        serviceId: svc.id, name: svc.name, price: svc.price, duration: svc.duration,
      }],
    });
  };

  const removeService = (serviceId: string) => {
    setForm({
      ...form,
      selectedServices: form.selectedServices.filter((s: any) => s.serviceId !== serviceId),
    });
  };

  const totalDuration = form.selectedServices.reduce((sum: number, s: any) => sum + s.duration, 0);
  const totalPrice = form.selectedServices.reduce((sum: number, s: any) => sum + s.price, 0);

  // Calculate end time
  const calcEndTime = () => {
    if (!form.startTime || totalDuration === 0) return form.startTime;
    const [h, m] = form.startTime.split(':').map(Number);
    const endMin = h * 60 + m + totalDuration;
    const eh = Math.floor(endMin / 60);
    const em = endMin % 60;
    return `${eh.toString().padStart(2, '0')}:${em.toString().padStart(2, '0')}`;
  };

  const selectClient = (client: { id: string; name: string }) => {
    setForm({ ...form, clientId: client.id, clientName: client.name });
    setShowClientSearch(false);
    setClientSearch('');
  };

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.phone?.includes(clientSearch)
  );

  const handleSubmit = async () => {
    if (!form.staffId || form.selectedServices.length === 0) return;
    setLoading(true);
    try {
      await onSave({
        clientId: form.clientId || null,
        clientName: form.clientName || 'ანონიმური',
        staffId: form.staffId,
        date: form.date,
        startTime: form.startTime,
        endTime: calcEndTime(),
        notes: form.notes || null,
        source: form.source,
        services: form.selectedServices.map((s: any) => ({
          serviceId: s.serviceId,
          price: s.price,
          duration: s.duration,
        })),
      });
      onClose();
    } catch (err: any) { alert(err.message); }
    finally { setLoading(false); }
  };

  const handleStatus = async (status: string) => {
    if (!appointment) return;
    await onStatusChange(appointment.id, status);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-dark-800 border border-dark-700 rounded-xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
          <h2 className="text-lg font-semibold text-white">
            {appointment ? 'ჯავშნის რედაქტირება' : 'ახალი ჯავშანი'}
          </h2>
          <button onClick={onClose} className="text-dark-400 hover:text-white"><X size={20} /></button>
        </div>

        {/* Status buttons for existing appointment */}
        {appointment && (
          <div className="px-6 py-3 border-b border-dark-700 flex gap-2 flex-wrap">
            {Object.entries(APPOINTMENT_STATUSES).map(([key, val]) => (
              <button
                key={key}
                onClick={() => handleStatus(key)}
                className={cn(
                  'badge cursor-pointer transition-all text-xs',
                  appointment.status === key ? `${val.color} text-white ring-2 ring-white/20` : 'bg-dark-700 text-dark-400 hover:bg-dark-600'
                )}
              >
                {appointment.status === key && <Check size={10} className="mr-1" />}
                {val.label}
              </button>
            ))}
          </div>
        )}

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Client */}
          <div className="relative">
            <label className="label">კლიენტი</label>
            <div className="relative">
              <input
                type="text"
                value={form.clientName || clientSearch}
                onChange={(e) => {
                  setClientSearch(e.target.value);
                  setForm({ ...form, clientId: '', clientName: '' });
                  setShowClientSearch(true);
                }}
                onFocus={() => setShowClientSearch(true)}
                className="input"
                placeholder="ძებნა ან ანონიმური..."
              />
              {form.clientId && (
                <button
                  onClick={() => { setForm({ ...form, clientId: '', clientName: '' }); setClientSearch(''); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {showClientSearch && !form.clientId && (
              <div className="absolute z-20 w-full mt-1 bg-dark-700 border border-dark-600 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                {filteredClients.length === 0 ? (
                  <p className="p-3 text-sm text-dark-400">კლიენტი ვერ მოიძებნა</p>
                ) : (
                  filteredClients.slice(0, 8).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => selectClient(c)}
                      className="w-full text-left px-3 py-2 hover:bg-dark-600 text-sm text-dark-200"
                    >
                      {c.name} {c.phone && <span className="text-dark-400">• {c.phone}</span>}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Staff & Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">სპეციალისტი *</label>
              <select value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })} className="select">
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">თარიღი *</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="input" />
            </div>
          </div>

          {/* Time & Source */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">დაწყების დრო *</label>
              <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">წყარო</label>
              <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className="select">
                <option value="WALK_IN">ადგილზე</option>
                <option value="PHONE">ტელეფონი</option>
                <option value="ONLINE">ონლაინ</option>
                <option value="SOCIAL_MEDIA">სოც. ქსელი</option>
              </select>
            </div>
          </div>

          {/* Services */}
          <div>
            <label className="label">სერვისები *</label>
            <select
              onChange={(e) => { addService(e.target.value); e.target.value = ''; }}
              className="select mb-2"
              defaultValue=""
            >
              <option value="" disabled>+ სერვისის დამატება</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.categoryName ? `${s.categoryName} → ` : ''}{s.name} ({s.duration}წთ, {formatCurrency(s.price)})
                </option>
              ))}
            </select>

            {form.selectedServices.length > 0 && (
              <div className="space-y-2">
                {form.selectedServices.map((s: any) => (
                  <div key={s.serviceId} className="flex items-center justify-between p-2 bg-dark-900/50 rounded-lg">
                    <div>
                      <p className="text-sm text-white">{s.name}</p>
                      <p className="text-xs text-dark-400">{s.duration} წთ • {formatCurrency(s.price)}</p>
                    </div>
                    <button onClick={() => removeService(s.serviceId)} className="text-dark-400 hover:text-red-400">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-dark-700 text-sm">
                  <span className="text-dark-400">
                    {form.startTime} — {calcEndTime()} ({totalDuration} წთ)
                  </span>
                  <span className="font-semibold text-emerald-400">{formatCurrency(totalPrice)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="label">შენიშვნა</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="input min-h-[60px] resize-none"
              placeholder="დამატებითი ინფორმაცია..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-dark-700">
          <button onClick={onClose} className="btn-secondary">გაუქმება</button>
          <button
            onClick={handleSubmit}
            disabled={loading || !form.staffId || form.selectedServices.length === 0}
            className="btn-primary flex items-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {appointment ? 'შენახვა' : 'ჯავშნის შექმნა'}
          </button>
        </div>
      </div>
    </div>
  );
}
