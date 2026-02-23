'use client';

import {
  Calendar,
  Users,
  UserCircle,
  Sparkles,
  TrendingUp,
  DollarSign,
  Clock,
  CreditCard,
  Banknote,
  ArrowRight,
} from 'lucide-react';
import { formatCurrency, APPOINTMENT_STATUSES } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface DashboardData {
  kpis: {
    todayAppointments: number;
    totalClients: number;
    activeStaff: number;
    totalServices: number;
    monthlyRevenue: number;
    todayRevenue: number;
  };
  recentSales: {
    id: string;
    total: number;
    clientName: string;
    staffName: string;
    paymentMethod: string;
    createdAt: string;
  }[];
  upcomingAppointments: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    status: string;
    clientName: string;
    staffName: string;
    services: string[];
  }[];
}

const paymentMethodLabels: Record<string, string> = {
  CASH: 'ნაღდი',
  CARD: 'ბარათი',
  TRANSFER: 'გადარიცხვა',
  GIFT_CARD: 'სასაჩუქრე',
  SPLIT: 'გაყოფილი',
};

export function DashboardClient({
  data,
  userName,
}: {
  data: DashboardData;
  userName: string;
}) {
  const kpiCards = [
    {
      label: 'დღის ჯავშნები',
      value: data.kpis.todayAppointments,
      icon: Calendar,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'დღის შემოსავალი',
      value: formatCurrency(data.kpis.todayRevenue),
      icon: DollarSign,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'თვის შემოსავალი',
      value: formatCurrency(data.kpis.monthlyRevenue),
      icon: TrendingUp,
      color: 'text-primary-400',
      bg: 'bg-primary-500/10',
    },
    {
      label: 'კლიენტები',
      value: data.kpis.totalClients,
      icon: UserCircle,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
    },
    {
      label: 'სპეციალისტები',
      value: data.kpis.activeStaff,
      icon: Users,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
    {
      label: 'სერვისები',
      value: data.kpis.totalServices,
      icon: Sparkles,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
    },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'დილა მშვიდობისა';
    if (hour < 18) return 'შუადღე მშვიდობისა';
    return 'საღამო მშვიდობისა';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          {getGreeting()}, {userName}! 👋
        </h1>
        <p className="text-dark-400 mt-1">
          {new Date().toLocaleDateString('ka-GE', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiCards.map((kpi) => (
          <div key={kpi.label} className="kpi-card">
            <div className="flex items-center justify-between">
              <span className="text-xs text-dark-400">{kpi.label}</span>
              <div className={cn('p-1.5 rounded-lg', kpi.bg)}>
                <kpi.icon size={14} className={kpi.color} />
              </div>
            </div>
            <p className="text-xl font-bold text-white">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Content grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming Appointments */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Clock size={18} className="text-primary-400" />
              მომავალი ჯავშნები
            </h2>
          </div>

          {data.upcomingAppointments.length === 0 ? (
            <div className="text-center py-8 text-dark-400">
              <Calendar size={40} className="mx-auto mb-3 opacity-30" />
              <p>ჯავშნები არ არის</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.upcomingAppointments.map((appt) => {
                const statusInfo =
                  APPOINTMENT_STATUSES[appt.status as keyof typeof APPOINTMENT_STATUSES];
                return (
                  <div
                    key={appt.id}
                    className="flex items-center gap-3 p-3 bg-dark-900/50 rounded-lg"
                  >
                    <div className="text-center min-w-[48px]">
                      <div className="text-xs text-dark-400">
                        {new Date(appt.date).toLocaleDateString('ka-GE', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                      <div className="text-sm font-bold text-white">
                        {appt.startTime}
                      </div>
                    </div>
                    <div className="w-px h-10 bg-dark-700" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {appt.clientName}
                      </p>
                      <p className="text-xs text-dark-400 truncate">
                        {appt.services.join(', ')} • {appt.staffName}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'badge text-white',
                        statusInfo?.color || 'bg-dark-600'
                      )}
                    >
                      {statusInfo?.label || appt.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Sales */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <CreditCard size={18} className="text-emerald-400" />
              ბოლო გაყიდვები
            </h2>
          </div>

          {data.recentSales.length === 0 ? (
            <div className="text-center py-8 text-dark-400">
              <Banknote size={40} className="mx-auto mb-3 opacity-30" />
              <p>გაყიდვები არ არის</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.recentSales.map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center gap-3 p-3 bg-dark-900/50 rounded-lg"
                >
                  <div className="w-9 h-9 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                    <Banknote size={16} className="text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {sale.clientName}
                    </p>
                    <p className="text-xs text-dark-400">
                      {sale.staffName} •{' '}
                      {paymentMethodLabels[sale.paymentMethod] || sale.paymentMethod}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-emerald-400">
                    {formatCurrency(sale.total)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
