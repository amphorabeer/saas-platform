'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus } from 'lucide-react';
import { EmployeeCard, type EmployeeRow } from '@/components/waiters/EmployeeCard';
import { EmployeeForm, type EmployeeFormData } from '@/components/waiters/EmployeeForm';
import { WaiterSelector, type WaiterOption } from '@/components/waiters/WaiterSelector';
import { AssignmentFloorPlan, type TableForAssignment } from '@/components/waiters/AssignmentFloorPlan';
import { TipsDateFilter, type Period } from '@/components/waiters/TipsDateFilter';
import { TipsTable, type TipStatRow, type TipDetail } from '@/components/waiters/TipsTable';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

type TabId = 'employees' | 'assignments' | 'tips';

function getDateRange(period: Period): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let start: Date;
  if (period === 'today') {
    start = today;
  } else if (period === 'week') {
    const day = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
    start = monday;
  } else if (period === 'month') {
    start = new Date(today.getFullYear(), today.getMonth(), 1);
  } else {
    return { dateFrom: '', dateTo: '' };
  }
  const end = period === 'today' ? today : new Date(now);
  return {
    dateFrom: start.toISOString().slice(0, 10),
    dateTo: end.toISOString().slice(0, 10),
  };
}

export default function WaitersPage() {
  const [tab, setTab] = useState<TabId>('employees');

  // ——— Employees ———
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string>('true');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState<EmployeeRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmployeeRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchEmployees = useCallback(async () => {
    const params = new URLSearchParams();
    if (roleFilter) params.set('role', roleFilter);
    if (activeFilter) params.set('isActive', activeFilter);
    if (search.trim()) params.set('search', search.trim());
    const res = await fetch(`/api/waiters?${params}`);
    if (!res.ok) return;
    const data = await res.json();
    setEmployees(data);
  }, [roleFilter, activeFilter, search]);

  useEffect(() => {
    if (tab === 'employees') fetchEmployees();
  }, [tab, fetchEmployees]);

  const handleSaveEmployee = async (data: EmployeeFormData) => {
    if (editEmployee?.id) {
      const payload = { ...data };
      if (payload.pin === '••••••') delete (payload as Record<string, unknown>).pin;
      const res = await fetch(`/api/waiters/${editEmployee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'შეცდომა');
      }
    } else {
      const res = await fetch('/api/waiters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'შეცდომა');
      }
    }
    setFormOpen(false);
    setEditEmployee(null);
    fetchEmployees();
  };

  const handleGeneratePin = async (employeeId: string): Promise<string | null> => {
    const res = await fetch(`/api/waiters/${employeeId}/pin`, { method: 'POST' });
    if (!res.ok) return null;
    const data = await res.json();
    return data.pin ?? null;
  };

  const handleGeneratePinForNew = async (): Promise<string | null> => {
    const res = await fetch('/api/waiters/generate-pin', { method: 'POST' });
    if (!res.ok) return null;
    const data = await res.json();
    return data.pin ?? null;
  };

  const handleDeleteEmployee = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/waiters/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'შეცდომა');
        return;
      }
      setDeleteTarget(null);
      fetchEmployees();
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleToggleActive = async (employee: EmployeeRow, active: boolean) => {
    const res = await fetch(`/api/waiters/${employee.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: active }),
    });
    if (res.ok) fetchEmployees();
  };

  // ——— Assignments ———
  const [tables, setTables] = useState<TableForAssignment[]>([]);
  const [assignments, setAssignments] = useState<Array<{ id: string; employeeId: string; tableId: string; employee?: { name: string }; table?: { number: string; zone?: { name: string } } }>>([]);
  const [waitersForAssign, setWaitersForAssign] = useState<WaiterOption[]>([]);
  const [selectedWaiterId, setSelectedWaiterId] = useState<string | null>(null);

  const fetchTables = useCallback(async () => {
    const res = await fetch('/api/tables');
    if (!res.ok) return;
    const data = await res.json();
    setTables(data);
  }, []);

  const fetchAssignments = useCallback(async () => {
    const res = await fetch('/api/waiters/assignments');
    if (!res.ok) return;
    const data = await res.json();
    setAssignments(data);
  }, []);

  const fetchWaitersForAssign = useCallback(async () => {
    const res = await fetch('/api/waiters?isActive=true');
    if (!res.ok) return;
    const list = await res.json();
    const allowed = list.filter(
      (e: { role: string }) => ['WAITER', 'BARTENDER', 'MANAGER'].includes(e.role)
    );
    const assignmentCountByEmployee = new Map<string, number>();
    const resAssign = await fetch('/api/waiters/assignments');
    if (resAssign.ok) {
      const assignList = await resAssign.json();
      assignList.forEach((a: { employeeId: string }) => {
        assignmentCountByEmployee.set(a.employeeId, (assignmentCountByEmployee.get(a.employeeId) ?? 0) + 1);
      });
    }
    setWaitersForAssign(
      allowed.map((e: { id: string; firstName: string; lastName: string; role: string }) => ({
        id: e.id,
        name: `${e.firstName} ${e.lastName}`.trim(),
        role: e.role,
        assignmentsCount: assignmentCountByEmployee.get(e.id) ?? 0,
      }))
    );
  }, []);

  useEffect(() => {
    if (tab === 'assignments') {
      fetchTables();
      fetchAssignments();
      fetchWaitersForAssign();
    }
  }, [tab, fetchTables, fetchAssignments, fetchWaitersForAssign]);

  const tablesWithAssignment = tables.map((t) => {
    const a = assignments.find((x) => x.tableId === t.id);
    return {
      ...t,
      assignment: a
        ? { id: a.id, employeeName: a.employee?.name ?? '—', color: 'orange' }
        : undefined,
    };
  });

  const handleAssign = async (tableId: string) => {
    if (!selectedWaiterId) return;
    const res = await fetch('/api/waiters/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId: selectedWaiterId, tableId }),
    });
    if (res.ok) {
      fetchAssignments();
      fetchWaitersForAssign();
    }
  };

  const handleUnassign = async (assignmentId: string) => {
    const res = await fetch(`/api/waiters/assignments/${assignmentId}`, { method: 'DELETE' });
    if (res.ok) {
      fetchAssignments();
      fetchWaitersForAssign();
    }
  };

  const handleResetAssignments = async () => {
    const res = await fetch('/api/waiters/assignments/reset', { method: 'POST' });
    if (res.ok) {
      fetchAssignments();
      fetchWaitersForAssign();
    }
  };

  // ——— Tips ———
  const [tipsPeriod, setTipsPeriod] = useState<Period>('week');
  const [tipsDateFrom, setTipsDateFrom] = useState('');
  const [tipsDateTo, setTipsDateTo] = useState('');
  const [tipsStats, setTipsStats] = useState<{ byEmployee: TipStatRow[]; poolTotal: number }>({ byEmployee: [], poolTotal: 0 });

  useEffect(() => {
    if (tipsPeriod !== 'custom') {
      const { dateFrom, dateTo } = getDateRange(tipsPeriod);
      setTipsDateFrom(dateFrom);
      setTipsDateTo(dateTo);
    }
  }, [tipsPeriod]);

  const fetchTipsStats = useCallback(async () => {
    if (tipsPeriod === 'custom' && (!tipsDateFrom || !tipsDateTo)) return;
    const { dateFrom, dateTo } =
      tipsPeriod === 'custom'
        ? { dateFrom: tipsDateFrom, dateTo: tipsDateTo }
        : getDateRange(tipsPeriod);
    const params = new URLSearchParams();
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    const res = await fetch(`/api/waiters/tips/stats?${params}`);
    if (!res.ok) return;
    const data = await res.json();
    setTipsStats({ byEmployee: data.byEmployee ?? [], poolTotal: data.poolTotal ?? 0 });
  }, [tipsPeriod, tipsDateFrom, tipsDateTo]);

  useEffect(() => {
    if (tab === 'tips') fetchTipsStats();
  }, [tab, fetchTipsStats]);

  const fetchRecentTips = useCallback(
    async (employeeId: string): Promise<TipDetail[]> => {
      const { dateFrom, dateTo } =
        tipsPeriod === 'custom'
          ? { dateFrom: tipsDateFrom, dateTo: tipsDateTo }
          : getDateRange(tipsPeriod);
      const params = new URLSearchParams({ employeeId });
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      const res = await fetch(`/api/waiters/tips?${params}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.map((t: { id: string; orderNumber?: string; amount: number; createdAt: string }) => ({
        id: t.id,
        orderNumber: t.orderNumber,
        amount: t.amount,
        createdAt: t.createdAt,
      }));
    },
    [tipsPeriod, tipsDateFrom, tipsDateTo]
  );

  const tabs: { id: TabId; label: string }[] = [
    { id: 'employees', label: 'თანამშრომლები' },
    { id: 'assignments', label: 'მაგიდების მინიჭება' },
    { id: 'tips', label: 'Tips სტატისტიკა' },
  ];

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">ოფიციანტები</h1>
      </div>

      <div className="flex gap-2 border-b border-white/10">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
              tab === t.id
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'employees' && (
          <motion.div
            key="employees"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              >
                <option value="">ყველა როლი</option>
                <option value="WAITER">ოფიციანტი</option>
                <option value="BARTENDER">ბარმენი</option>
                <option value="CHEF">მზარეული</option>
                <option value="MANAGER">მენეჯერი</option>
                <option value="HOST">ჰოსტი</option>
                <option value="CASHIER">კასირი</option>
                <option value="RESTAURANT_OWNER">მფლობელი</option>
              </select>
              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              >
                <option value="">ყველა</option>
                <option value="true">აქტიური</option>
                <option value="false">არააქტიური</option>
              </select>
              <input
                type="search"
                placeholder="ძიება (სახელი, ელფოსტა)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 w-56"
              />
              <button
                type="button"
                onClick={() => {
                  setEditEmployee(null);
                  setFormOpen(true);
                }}
                className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
              >
                <UserPlus className="h-4 w-4" /> დამატება
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {employees.map((emp) => (
                <EmployeeCard
                  key={emp.id}
                  employee={emp}
                  onEdit={() => {
                    setEditEmployee(emp);
                    setFormOpen(true);
                  }}
                  onDelete={() => setDeleteTarget(emp)}
                  onToggleActive={(active) => handleToggleActive(emp, active)}
                />
              ))}
            </div>
          </motion.div>
        )}

        {tab === 'assignments' && (
          <motion.div
            key="assignments"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleResetAssignments}
                className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2 text-sm text-red-400 hover:bg-red-500/20"
              >
                ყველა მოხსნა
              </button>
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
              <div className="rounded-xl border border-white/10 bg-[#1E293B]/80 p-4 backdrop-blur-sm">
                <WaiterSelector
                  waiters={waitersForAssign}
                  selectedId={selectedWaiterId}
                  onSelect={setSelectedWaiterId}
                />
              </div>
              <AssignmentFloorPlan
                tables={tablesWithAssignment}
                selectedWaiterId={selectedWaiterId}
                onAssign={handleAssign}
                onUnassign={handleUnassign}
              />
            </div>
          </motion.div>
        )}

        {tab === 'tips' && (
          <motion.div
            key="tips"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <TipsDateFilter
              period={tipsPeriod}
              onPeriodChange={setTipsPeriod}
              dateFrom={tipsDateFrom}
              dateTo={tipsDateTo}
              onDateFromChange={setTipsDateFrom}
              onDateToChange={setTipsDateTo}
            />
            <button
              type="button"
              onClick={fetchTipsStats}
              className="rounded-lg bg-orange-500/20 px-4 py-2 text-sm text-orange-300 hover:bg-orange-500/30"
            >
              განახლება
            </button>
            <TipsTable
              stats={tipsStats.byEmployee}
              poolTotal={tipsStats.poolTotal}
              onFetchRecentTips={fetchRecentTips}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <EmployeeForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditEmployee(null);
        }}
        initial={editEmployee ? { ...editEmployee, id: editEmployee.id } : undefined}
        onSave={handleSaveEmployee}
        onGeneratePin={editEmployee ? handleGeneratePin : undefined}
        onGeneratePinForNew={!editEmployee ? handleGeneratePinForNew : undefined}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteEmployee}
        loading={deleteLoading}
        title="თანამშრომლის წაშლა"
        message={
          deleteTarget && (deleteTarget.assignmentsCount > 0 || deleteTarget.tipsCount > 0)
            ? `ამ თანამშრომელს აქვს მინიჭებული მაგიდები (${deleteTarget.assignmentsCount}) ან Tips ისტორია (${deleteTarget.tipsCount}). ნამდვილად წაშალო?`
            : 'ნამდვილად წაშალო?'
        }
      />
    </div>
  );
}
