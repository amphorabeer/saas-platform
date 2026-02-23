'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Scissors,
  User,
  Calendar,
  Clock,
  Phone,
  ChevronRight,
  ChevronLeft,
  Check,
  Star,
  MapPin,
} from 'lucide-react';

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  categoryId: string | null;
  categoryName: string | null;
}

interface Staff {
  id: string;
  name: string;
  role: string;
}

interface Category {
  id: string;
  name: string;
  color: string | null;
}

type Step = 'service' | 'staff' | 'datetime' | 'info' | 'confirm' | 'success';

const STEP_TITLES: Record<Step, string> = {
  service: 'სერვისი',
  staff: 'სპეციალისტი',
  datetime: 'თარიღი და დრო',
  info: 'თქვენი მონაცემები',
  confirm: 'დადასტურება',
  success: 'წარმატება',
};

export function BookingClient({ slug, salonName }: { slug: string; salonName: string }) {
  const [step, setStep] = useState<Step>('service');
  const [services, setServices] = useState<Service[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState<any>(null);

  // Selections
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Load salon data
  useEffect(() => {
    fetch(`/api/book?slug=${slug}`)
      .then((r) => r.json())
      .then((data) => {
        setServices(data.services || []);
        setStaffList(data.staff || []);
        setCategories(data.categories || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  // Load available slots when staff and date selected
  useEffect(() => {
    if (!selectedStaff || !selectedDate) { setSlots([]); return; }
    setSlotsLoading(true);
    fetch(`/api/book?slug=${slug}&staffId=${selectedStaff}&date=${selectedDate}`)
      .then((r) => r.json())
      .then((data) => setSlots(data.slots || []))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [selectedStaff, selectedDate, slug]);

  // Computed
  const selectedServiceObjects = useMemo(
    () => services.filter((s) => selectedServices.includes(s.id)),
    [services, selectedServices]
  );
  const totalPrice = selectedServiceObjects.reduce((s, sv) => s + sv.price, 0);
  const totalDuration = selectedServiceObjects.reduce((s, sv) => s + sv.duration, 0);
  const selectedStaffName = staffList.find((s) => s.id === selectedStaff)?.name || '';

  const filteredServices = useMemo(() => {
    if (!categoryFilter) return services;
    return services.filter((s) => s.categoryId === categoryFilter);
  }, [services, categoryFilter]);

  // Generate date options (next 14 days)
  const dateOptions = useMemo(() => {
    const dates: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      dates.push({
        value: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString('ka-GE', { weekday: 'short', day: 'numeric', month: 'short' }),
      });
    }
    return dates;
  }, []);

  const toggleService = (id: string) => {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const canProceed = () => {
    switch (step) {
      case 'service': return selectedServices.length > 0;
      case 'staff': return !!selectedStaff;
      case 'datetime': return !!selectedDate && !!selectedTime;
      case 'info': return !!clientName.trim() && !!clientPhone.trim();
      default: return true;
    }
  };

  const nextStep = () => {
    const steps: Step[] = ['service', 'staff', 'datetime', 'info', 'confirm'];
    const idx = steps.indexOf(step);
    if (idx < steps.length - 1) setStep(steps[idx + 1]);
  };

  const prevStep = () => {
    const steps: Step[] = ['service', 'staff', 'datetime', 'info', 'confirm'];
    const idx = steps.indexOf(step);
    if (idx > 0) setStep(steps[idx - 1]);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          staffId: selectedStaff,
          serviceIds: selectedServices,
          date: selectedDate,
          startTime: selectedTime,
          clientName,
          clientPhone,
          notes: notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'შეცდომა');
      setBookingResult(data.appointment);
      setStep('success');
    } catch (err: any) {
      alert(err.message);
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-400/30 border-t-primary-400 rounded-full animate-spin" />
      </div>
    );
  }

  const stepIndex = ['service', 'staff', 'datetime', 'info', 'confirm'].indexOf(step);

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <div className="bg-dark-800 border-b border-dark-700">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-500/20 rounded-xl flex items-center justify-center">
              <Scissors size={20} className="text-primary-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">{salonName}</h1>
              <p className="text-xs text-dark-400">ონლაინ ჯავშანი</p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress */}
      {step !== 'success' && (
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex gap-1">
            {['service', 'staff', 'datetime', 'info', 'confirm'].map((s, i) => (
              <div key={s} className={`flex-1 h-1 rounded-full ${i <= stepIndex ? 'bg-primary-500' : 'bg-dark-700'}`} />
            ))}
          </div>
          <p className="text-xs text-dark-400 mt-2">{stepIndex + 1}/5 — {STEP_TITLES[step]}</p>
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 pb-24">
        {/* Step 1: Service */}
        {step === 'service' && (
          <div className="space-y-4 mt-4">
            <h2 className="text-lg font-semibold text-white">აირჩიეთ სერვისი</h2>

            {categories.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setCategoryFilter('')}
                  className={`px-3 py-1.5 rounded-lg text-xs ${!categoryFilter ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30' : 'bg-dark-800 text-dark-300 border border-dark-700'}`}>
                  ყველა
                </button>
                {categories.map((c) => (
                  <button key={c.id} onClick={() => setCategoryFilter(c.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs ${categoryFilter === c.id ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30' : 'bg-dark-800 text-dark-300 border border-dark-700'}`}>
                    {c.name}
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-2">
              {filteredServices.map((service) => {
                const selected = selectedServices.includes(service.id);
                return (
                  <button key={service.id} onClick={() => toggleService(service.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      selected ? 'bg-primary-500/10 border-primary-500/30' : 'bg-dark-800 border-dark-700 hover:border-dark-600'
                    }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">{service.name}</p>
                        <p className="text-xs text-dark-400 mt-0.5">
                          {service.categoryName} · {service.duration} წთ
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-emerald-400">{service.price} ₾</span>
                        {selected && (
                          <div className="w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                            <Check size={12} className="text-white" />
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedServices.length > 0 && (
              <div className="bg-dark-800 border border-dark-700 rounded-xl p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-dark-300">{selectedServiceObjects.length} სერვისი · {totalDuration} წთ</span>
                  <span className="font-semibold text-emerald-400">{totalPrice} ₾</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Staff */}
        {step === 'staff' && (
          <div className="space-y-4 mt-4">
            <h2 className="text-lg font-semibold text-white">აირჩიეთ სპეციალისტი</h2>
            <div className="space-y-2">
              {staffList.map((staff) => (
                <button key={staff.id} onClick={() => setSelectedStaff(staff.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all flex items-center gap-3 ${
                    selectedStaff === staff.id ? 'bg-primary-500/10 border-primary-500/30' : 'bg-dark-800 border-dark-700 hover:border-dark-600'
                  }`}>
                  <div className="w-10 h-10 bg-primary-500/20 rounded-xl flex items-center justify-center text-primary-400 font-bold text-sm">
                    {staff.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{staff.name}</p>
                    <p className="text-xs text-dark-400">{staff.role === 'STYLIST' ? 'სტილისტი' : staff.role === 'MASTER' ? 'მასტერი' : 'სპეციალისტი'}</p>
                  </div>
                  {selectedStaff === staff.id && (
                    <div className="w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                      <Check size={12} className="text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Date & Time */}
        {step === 'datetime' && (
          <div className="space-y-4 mt-4">
            <h2 className="text-lg font-semibold text-white">აირჩიეთ თარიღი</h2>

            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
              {dateOptions.map((d) => (
                <button key={d.value} onClick={() => { setSelectedDate(d.value); setSelectedTime(''); }}
                  className={`px-3 py-2 rounded-xl text-xs whitespace-nowrap border transition-colors shrink-0 ${
                    selectedDate === d.value ? 'bg-primary-500/20 text-primary-400 border-primary-500/30' : 'bg-dark-800 text-dark-300 border-dark-700'
                  }`}>
                  {d.label}
                </button>
              ))}
            </div>

            {selectedDate && (
              <>
                <h3 className="text-sm font-medium text-dark-300 mt-4">აირჩიეთ დრო</h3>
                {slotsLoading ? (
                  <div className="flex justify-center py-6">
                    <div className="w-6 h-6 border-2 border-primary-400/30 border-t-primary-400 rounded-full animate-spin" />
                  </div>
                ) : slots.length === 0 ? (
                  <div className="text-center py-6 text-dark-500 text-sm">
                    თავისუფალი დრო არ არის ამ დღეს
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {slots.map((time) => (
                      <button key={time} onClick={() => setSelectedTime(time)}
                        className={`py-2 rounded-lg text-sm text-center border transition-colors ${
                          selectedTime === time ? 'bg-primary-500/20 text-primary-400 border-primary-500/30' : 'bg-dark-800 text-dark-300 border-dark-700 hover:border-dark-600'
                        }`}>
                        {time}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Step 4: Client Info */}
        {step === 'info' && (
          <div className="space-y-4 mt-4">
            <h2 className="text-lg font-semibold text-white">თქვენი მონაცემები</h2>
            <div>
              <label className="text-xs text-dark-400 mb-1 block">სახელი და გვარი *</label>
              <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)}
                placeholder="მაგ: ნინო კვარაცხელია" className="input" />
            </div>
            <div>
              <label className="text-xs text-dark-400 mb-1 block">ტელეფონი *</label>
              <input type="tel" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)}
                placeholder="555 12 34 56" className="input" />
            </div>
            <div>
              <label className="text-xs text-dark-400 mb-1 block">შენიშვნა</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                rows={2} placeholder="დამატებითი ინფორმაცია..." className="input resize-none" />
            </div>
          </div>
        )}

        {/* Step 5: Confirm */}
        {step === 'confirm' && (
          <div className="space-y-4 mt-4">
            <h2 className="text-lg font-semibold text-white">დაადასტურეთ ჯავშანი</h2>
            <div className="bg-dark-800 border border-dark-700 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Scissors size={16} className="text-primary-400 shrink-0" />
                <div>
                  <p className="text-xs text-dark-400">სერვისები</p>
                  {selectedServiceObjects.map((s) => (
                    <p key={s.id} className="text-sm text-white">{s.name} — {s.price} ₾</p>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <User size={16} className="text-blue-400 shrink-0" />
                <div>
                  <p className="text-xs text-dark-400">სპეციალისტი</p>
                  <p className="text-sm text-white">{selectedStaffName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar size={16} className="text-amber-400 shrink-0" />
                <div>
                  <p className="text-xs text-dark-400">თარიღი და დრო</p>
                  <p className="text-sm text-white">
                    {new Date(selectedDate).toLocaleDateString('ka-GE', { weekday: 'long', day: 'numeric', month: 'long' })} · {selectedTime}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone size={16} className="text-emerald-400 shrink-0" />
                <div>
                  <p className="text-xs text-dark-400">კლიენტი</p>
                  <p className="text-sm text-white">{clientName} · {clientPhone}</p>
                </div>
              </div>
              <div className="border-t border-dark-700 pt-3 flex justify-between">
                <span className="text-sm text-dark-300">სულ: {totalDuration} წთ</span>
                <span className="text-lg font-bold text-emerald-400">{totalPrice} ₾</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Success */}
        {step === 'success' && bookingResult && (
          <div className="text-center mt-8 space-y-4">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
              <Check size={32} className="text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-white">ჯავშანი მიღებულია!</h2>
            <p className="text-dark-400 text-sm">
              თქვენი ჯავშანი გაგზავნილია დასადასტურებლად.<br />
              დადასტურების შემდეგ მიიღებთ შეტყობინებას.
            </p>
            <div className="bg-dark-800 border border-dark-700 rounded-xl p-4 text-left space-y-2 max-w-sm mx-auto">
              <div className="flex justify-between text-sm">
                <span className="text-dark-400">თარიღი</span>
                <span className="text-white">{bookingResult.date} · {bookingResult.startTime}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-dark-400">სპეციალისტი</span>
                <span className="text-white">{bookingResult.staffName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-dark-400">სერვისები</span>
                <span className="text-white text-right">{bookingResult.services.join(', ')}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      {step !== 'success' && (
        <div className="fixed bottom-0 left-0 right-0 bg-dark-800 border-t border-dark-700 p-4">
          <div className="max-w-lg mx-auto flex gap-3">
            {step !== 'service' && (
              <button onClick={prevStep} className="btn-secondary flex items-center gap-1 px-4">
                <ChevronLeft size={16} /> უკან
              </button>
            )}
            {step === 'confirm' ? (
              <button onClick={handleSubmit} disabled={submitting}
                className="btn-primary flex-1 flex items-center justify-center gap-2">
                {submitting ? 'იგზავნება...' : (
                  <><Check size={16} /> დადასტურება</>
                )}
              </button>
            ) : (
              <button onClick={nextStep} disabled={!canProceed()}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-40">
                გაგრძელება <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
