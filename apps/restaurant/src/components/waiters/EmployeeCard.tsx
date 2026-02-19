'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { RoleBadge } from './RoleBadge';
import { PINDisplay } from './PINDisplay';
import { Toggle } from '@/components/ui/Toggle';

export type EmployeeRow = {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  pin: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  photoUrl: string | null;
  assignmentsCount?: number;
  tipsCount?: number;
};

export function EmployeeCard({
  employee,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  employee: EmployeeRow;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive?: (active: boolean) => void;
}) {
  const name = `${employee.firstName} ${employee.lastName}`.trim() || '—';
  const initials = (employee.firstName?.charAt(0) ?? '') + (employee.lastName?.charAt(0) ?? '') || '?';

  return (
    <div className="rounded-xl border border-white/10 bg-[#1E293B]/80 p-4 backdrop-blur-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-500/20 text-lg font-semibold text-orange-400">
          {employee.photoUrl ? (
            <img src={employee.photoUrl} alt="" className="h-full w-full rounded-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-white">{name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <RoleBadge role={employee.role} />
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-400">
            <span className="flex items-center gap-1">
              PIN: <PINDisplay pin={employee.pin} />
            </span>
            {employee.phone && <span>{employee.phone}</span>}
            {employee.email && <span className="truncate">{employee.email}</span>}
          </div>
          {(employee.assignmentsCount != null || employee.tipsCount != null) && (
            <p className="mt-1 text-xs text-slate-500">
              მაგიდები: {employee.assignmentsCount ?? 0} · Tips: {employee.tipsCount ?? 0}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            {onToggleActive && (
              <Toggle
                checked={employee.isActive}
                onCheckedChange={onToggleActive}
                label="აქტიური"
              />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onEdit}
                className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
                aria-label="რედაქტირება"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="rounded-lg p-2 text-slate-400 hover:bg-red-500/20 hover:text-red-400"
                aria-label="წაშლა"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
