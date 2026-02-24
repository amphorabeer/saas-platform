'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Filter,
  LayoutGrid,
  List,
} from 'lucide-react';
import { cn, formatCurrency, APPOINTMENT_STATUSES } from '@/lib/utils';
import { AppointmentModal } from './AppointmentModal';

interface StaffData {
  id: string;
  name: string;
  specialties: string[];
}

interface ServiceData {
  id: string;
  name: string;
  duration: number;
  price: number;
  categoryName: string | null;
}

interface ClientData {
  id: string;
  name: string;
  phone: string | null;
}

interface AppointmentData {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  notes: string | null;
  source: string;
  clientId: string | null;
  clientName: string;
  staffId: string;
  staffName: string;
  services: { name: string; price: number; duration: number }[];
  totalPrice: number;
  totalDuration: number;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 8); // 08:00 - 21:00

export function AppointmentsClient({
  data,
}: {
  data: { staff: StaffData[]; services: ServiceData[]; clients: ClientData[] };
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<AppointmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<AppointmentData | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<string | 'all'>('all');
  const [view, setView] = useState<'day' | 'list'>('day');
  const [prefillData, setPrefillData] = useState<any>(null);

  const dateStr = currentDate.toISOString().split('T')[0];

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/appointments?date=${dateStr}`);
      const data = await res.json();
      setAppointments(Array.isArray(data) ? data : []);
    } catch { setAppointments([]); }
    setLoading(false);
  }, [dateStr]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  const goToday = () => setCurrentDate(new Date());
  const goPrev = () => { const d = new Date(currentDate); d.setDate(d.getDate() - 1); setCurrentDate(d); };
  const goNext = () => { const d = new Date(currentDate); d.setDate(d.getDate() + 1); setCurrentDate(d); };

  const filteredAppointments = selectedStaff === 'all'
    ? appointments
    : appointments.filter((a) => a.staffId === selectedStaff);

  const visibleStaff = selectedStaff === 'all'
    ? data.staff
    : data.staff.filter((s) => s.id === selectedStaff);

  const handleSave = async (apptData: any) => {
    const url = editingAppointment ? `/api/appointments/${editingAppointment.id}` : '/api/appointments';
    const res = await fetch(url, {
      method: editingAppointment ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apptData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'შეცდომა');
    }
    fetchAppointments();
  };

  const handleStatusChange = async (id: string, status: string) => {
    await fetch(`/api/appointments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    fetchAppointments();
  };

  const handleCellClick = (staffId: string, hour: number) => {
    const time = `${hour.toString().padStart(2, '0')}:00`;
    setPrefillData({ staffId, startTime: time, date: dateStr });
    setEditingAppointment(null);
    setShowModal(true);
  };

  const isToday = dateStr === new Date().toISOString().split('T')[0];

  const getAppointmentStyle = (appt: AppointmentData) => {
    const [sh, sm] = appt.startTime.split(':').map(Number);
    const [eh, em] = appt.endTime.split(':').map(Number);
    const startMin = (sh - 8) * 60 + sm;
    const duration = (eh - 8) * 60 + em - startMin;
    return {
      top: `${(startMin / 60) * 64}px`,
      height: `${Math.max((duration / 60) * 64, 28)}px`,
    };
  };

  const statusColors: Record<string, string> = {
    SCHEDULED: 'bg-blue-500/20 border-blue-500/40 text-blue-300',
    CONFIRMED: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
    IN_PROGRESS: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
    COMPLETED: 'bg-green-500/20 border-green-500/40 text-green-300',
    CANCELLED: 'bg-red-500/20 border-red-500/40 text-red-300 opacity-50',
    NO_SHOW: 'bg-gray-500/20 border-gray-500/40 text-gray-300 opacity-50',
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Calendar size={24} className="text-primary-400" />
            ჯავშნები
          </h1>
        </div>
        <button
          onClick={() => { setEditingAppointment(null); setPrefillData(null); setShowModal(true); }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} /> ახალი ჯავშანი
        </button>
      </div>

      {/* Date nav + filters */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={goPrev} className="p-2 rounded-lg bg-dark-800 border border-dark-700 text-dark-300 hover:text-white hover:bg-dark-700">
            <ChevronLeft size={18} />
          </button>
          <button onClick={goToday} className={cn('px-3 py-2 rounded-lg text-sm font-medium border transition-colors', isToday ? 'bg-primary-500/20 text-primary-400 border-primary-500/30' : 'bg-dark-800 text-dark-300 border-dark-700 hover:bg-dark-700')}>
            დღეს
          </button>
          <button onClick={goNext} className="p-2 rounded-lg bg-dark-800 border border-dark-700 text-dark-300 hover:text-white hover:bg-dark-700">
            <ChevronRight size={18} />
          </button>
          <h2 className="text-lg font-semibold text-white ml-2">
            {currentDate.toLocaleDateString('ka-GE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Staff filter */}
          <select
            value={selectedStaff}
            onChange={(e) => setSelectedStaff(e.target.value)}
            className="select text-sm w-44"
          >
            <option value="all">ყველა სპეციალისტი</option>
            {data.staff.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          {/* View toggle */}
          <div className="flex bg-dark-800 border border-dark-700 rounded-lg p-0.5">
            <button
              onClick={() => setView('day')}
              className={cn('p-1.5 rounded-md', view === 'day' ? 'bg-dark-600 text-white' : 'text-dark-400')}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setView('list')}
              className={cn('p-1.5 rounded-md', view === 'list' ? 'bg-dark-600 text-white' : 'text-dark-400')}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar - Day View */}
      {view === 'day' && (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              {/* Staff columns header */}
              <div className="flex border-b border-dark-700 bg-dark-900/50 sticky top-0 z-10">
                <div className="w-16 shrink-0 p-2 text-xs text-dark-500 text-center">დრო</div>
                {visibleStaff.map((s) => (
                  <div key={s.id} className="flex-1 p-3 text-center border-l border-dark-700 min-w-[160px]">
                    <p className="text-sm font-medium text-white">{s.name}</p>
                    <p className="text-xs text-dark-400">{s.specialties.join(', ')}</p>
                  </div>
                ))}
              </div>

              {/* Time grid */}
              <div className="flex relative">
                {/* Time labels */}
                <div className="w-16 shrink-0">
                  {HOURS.map((h) => (
                    <div key={h} className="h-16 border-b border-dark-700/50 flex items-start justify-center pt-1">
                      <span className="text-xs text-dark-500">{h.toString().padStart(2, '0')}:00</span>
                    </div>
                  ))}
                </div>

                {/* Staff columns with appointments */}
                {visibleStaff.map((staff) => {
                  const staffAppts = filteredAppointments.filter((a) => a.staffId === staff.id);
                  return (
                    <div key={staff.id} className="flex-1 relative border-l border-dark-700 min-w-[160px]">
                      {HOURS.map((h) => (
                        <div
                          key={h}
                          className="h-16 border-b border-dark-700/50 hover:bg-dark-700/20 cursor-pointer transition-colors"
                          onClick={() => handleCellClick(staff.id, h)}
                        />
                      ))}

                      {/* Appointments overlay */}
                      {staffAppts.map((appt) => {
                        const style = getAppointmentStyle(appt);
                        return (
                          <div
                            key={appt.id}
                            className={cn(
                              'absolute left-1 right-1 rounded-lg border px-2 py-1 cursor-pointer transition-all hover:brightness-110 overflow-hidden z-[5]',
                              statusColors[appt.status] || statusColors.SCHEDULED
                            )}
                            style={style}
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingAppointment(appt);
                              setPrefillData(null);
                              setShowModal(true);
                            }}
                          >
                            <p className="text-xs font-semibold truncate">{appt.clientName}</p>
                            <p className="text-[10px] opacity-80 truncate">
                              {appt.startTime}-{appt.endTime} • {appt.services.map((s) => s.name).join(', ')}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="space-y-2">
          {filteredAppointments.length === 0 ? (
            <div className="card text-center py-12">
              <Calendar size={48} className="mx-auto mb-4 text-dark-500 opacity-30" />
              <p className="text-dark-400">ამ დღეს ჯავშნები არ არის</p>
            </div>
          ) : (
            filteredAppointments
              .sort((a, b) => a.startTime.localeCompare(b.startTime))
              .map((appt) => {
                const statusInfo = APPOINTMENT_STATUSES[appt.status as keyof typeof APPOINTMENT_STATUSES];
                return (
                  <div
                    key={appt.id}
                    className="card-hover flex items-center gap-4 p-4 cursor-pointer"
                    onClick={() => { setEditingAppointment(appt); setPrefillData(null); setShowModal(true); }}
                  >
                    <div className="text-center min-w-[56px]">
                      <div className="text-lg font-bold text-white">{appt.startTime}</div>
                      <div className="text-xs text-dark-400">{appt.endTime}</div>
                    </div>
                    <div className="w-px h-12 bg-dark-700" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-white">{appt.clientName}</p>
                        <span className={cn('badge text-white text-xs', statusInfo?.color || 'bg-dark-600')}>
                          {statusInfo?.label || appt.status}
                        </span>
                      </div>
                      <p className="text-sm text-dark-400 mt-0.5">
                        {appt.services.map((s) => s.name).join(', ')}
                      </p>
                      <p className="text-xs text-dark-500 mt-0.5">
                        <User size={10} className="inline mr-1" />{appt.staffName} •
                        <Clock size={10} className="inline mx-1" />{appt.totalDuration} წთ
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-emerald-400">{formatCurrency(appt.totalPrice)}</p>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <AppointmentModal
          appointment={editingAppointment}
          prefill={prefillData}
          staff={data.staff}
          services={data.services}
          clients={data.clients}
          onClose={() => { setShowModal(false); setEditingAppointment(null); setPrefillData(null); }}
          onSave={handleSave}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}
