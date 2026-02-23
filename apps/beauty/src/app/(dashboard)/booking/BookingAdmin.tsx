'use client';

import { useState } from 'react';
import {
  Globe,
  Link,
  Copy,
  Check,
  X,
  Calendar,
  Clock,
  User,
  Phone,
  Scissors,
  ExternalLink,
  Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PendingAppointment {
  id: string;
  clientName: string;
  clientPhone: string;
  staffName: string;
  date: string;
  startTime: string;
  endTime: string;
  services: string[];
  notes: string | null;
  createdAt: string;
}

export function BookingAdmin({
  slug,
  salonName,
  pending,
}: {
  slug: string;
  salonName: string;
  pending: PendingAppointment[];
}) {
  const [appointments, setAppointments] = useState(pending);
  const [copied, setCopied] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);

  const bookingUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/book/${slug}`
    : `/book/${slug}`;

  const copyLink = () => {
    navigator.clipboard.writeText(bookingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirm = async (id: string) => {
    setProcessing(id);
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CONFIRMED' }),
      });
      if (res.ok) {
        setAppointments(appointments.filter((a) => a.id !== id));
      }
    } catch {}
    setProcessing(null);
  };

  const handleReject = async (id: string) => {
    if (!confirm('ნამდვილად გსურთ ჯავშნის უარყოფა?')) return;
    setProcessing(id);
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED', cancelReason: 'უარყოფილი ადმინის მიერ' }),
      });
      if (res.ok) {
        setAppointments(appointments.filter((a) => a.id !== id));
      }
    } catch {}
    setProcessing(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Globe size={24} className="text-primary-400" />
          ონლაინ ჯავშანი
        </h1>
        <p className="text-dark-400 mt-1">ჯავშნის ლინკი და მოლოდინში მყოფი ჯავშნები</p>
      </div>

      {/* Booking Link */}
      <div className="card">
        <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
          <Link size={16} className="text-primary-400" />
          ჯავშნის ლინკი
        </h3>
        <p className="text-xs text-dark-400 mb-3">ეს ლინკი გაუზიარეთ კლიენტებს სოციალურ ქსელებში, ვებსაიტზე ან Google-ში</p>
        <div className="flex gap-2">
          <div className="flex-1 bg-dark-900/50 border border-dark-600 rounded-lg px-3 py-2 text-sm text-primary-400 truncate font-mono">
            {bookingUrl}
          </div>
          <button onClick={copyLink}
            className={cn('btn-secondary flex items-center gap-1.5 shrink-0', copied && 'text-emerald-400 border-emerald-500/30')}>
            {copied ? <><Check size={14} /> დაკოპირდა</> : <><Copy size={14} /> კოპირება</>}
          </button>
          <a href={bookingUrl} target="_blank" rel="noopener noreferrer"
            className="btn-secondary flex items-center gap-1.5 shrink-0">
            <ExternalLink size={14} /> გახსნა
          </a>
        </div>
      </div>

      {/* Pending Appointments */}
      <div className="card">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Bell size={16} className="text-amber-400" />
          მოლოდინში ({appointments.length})
        </h3>

        {appointments.length === 0 ? (
          <div className="text-center py-8 text-dark-500 text-sm">
            ახალი ონლაინ ჯავშნები არ არის
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map((apt) => (
              <div key={apt.id} className="bg-dark-800/50 border border-dark-700 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-dark-400" />
                      <span className="text-sm font-medium text-white">{apt.clientName}</span>
                      <span className="text-xs text-dark-400">{apt.clientPhone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-dark-400" />
                      <span className="text-sm text-dark-200">
                        {new Date(apt.date).toLocaleDateString('ka-GE', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </span>
                      <Clock size={14} className="text-dark-400" />
                      <span className="text-sm text-dark-200">{apt.startTime} - {apt.endTime}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Scissors size={14} className="text-dark-400" />
                      <span className="text-sm text-dark-300">{apt.services.join(', ')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-dark-400" />
                      <span className="text-xs text-dark-400">სპეც: {apt.staffName}</span>
                    </div>
                    {apt.notes && <p className="text-xs text-dark-500 italic">{apt.notes}</p>}
                    <p className="text-[10px] text-dark-600">
                      მიღებული: {new Date(apt.createdAt).toLocaleString('ka-GE')}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => handleConfirm(apt.id)}
                      disabled={processing === apt.id}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs hover:bg-emerald-500/20"
                    >
                      <Check size={12} /> დადასტურება
                    </button>
                    <button
                      onClick={() => handleReject(apt.id)}
                      disabled={processing === apt.id}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg text-xs hover:bg-red-500/20"
                    >
                      <X size={12} /> უარყოფა
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
