'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { ZoneForm, type ZoneRow } from './ZoneForm';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { LayoutGrid } from 'lucide-react';

type ZoneManagerProps = {
  open: boolean;
  onClose: () => void;
  zones: ZoneRow[];
  onRefresh: () => void;
};

export function ZoneManager({ open, onClose, zones, onRefresh }: ZoneManagerProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editZone, setEditZone] = useState<ZoneRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleSave = async (data: Parameters<ZoneForm['props']['onSave']>[0]) => {
    if (editZone) {
      const res = await fetch(`/api/tables/zones/${editZone.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error);
    } else {
      const res = await fetch('/api/tables/zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error);
    }
    onRefresh();
    setFormOpen(false);
    setEditZone(null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const res = await fetch(`/api/tables/zones/${deleteId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'წაშლა ვერ მოხერხდა');
      setDeleteId(null);
      return;
    }
    onRefresh();
    setDeleteId(null);
  };

  return (
    <>
      <Modal open={open} onClose={onClose} title="ზონების მართვა" maxWidth="lg">
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => { setEditZone(null); setFormOpen(true); }}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> ახალი ზონა
            </button>
          </div>
          {zones.length === 0 ? (
            <EmptyState
              icon={LayoutGrid}
              title="ზონები არ არის"
              description="დაამატეთ პირველი ზონა (მაგ: ძირითადი დარბაზი)"
              actionLabel="დამატება"
              onAction={() => setFormOpen(true)}
            />
          ) : (
            <ul className="space-y-2">
              {zones.map((z) => (
                <motion.li
                  key={z.id}
                  layout
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex items-center gap-3">
                    {z.color && (
                      <span
                        className="h-4 w-4 rounded-full"
                        style={{ backgroundColor: z.color }}
                      />
                    )}
                    <span className="font-medium text-white">{z.name}</span>
                    <span className="text-sm text-slate-500">
                      {z._count?.tables ?? 0} მაგიდა
                    </span>
                    <span className="text-xs text-slate-500">#{z.sortOrder}</span>
                    {!z.isActive && (
                      <span className="text-xs text-slate-500">(არააქტიური)</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setEditZone(z); setFormOpen(true); }}
                      className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteId(z.id)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-red-500/20 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </motion.li>
              ))}
            </ul>
          )}
        </div>
      </Modal>
      <ZoneForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditZone(null); }}
        onSave={handleSave}
        edit={editZone}
      />
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        message="ზონის წაშლა? თუ მასში მაგიდებია, ჯერ წაშალეთ ან გადაიტანეთ მაგიდები."
        confirmLabel="წაშლა"
        variant="danger"
      />
    </>
  );
}
