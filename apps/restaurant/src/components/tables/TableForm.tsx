'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Toggle } from '@/components/ui/Toggle';
import type { ZoneRow } from './ZoneForm';

export type TableRow = {
  id: string;
  number: string;
  label: string | null;
  zoneId: string;
  zone?: { id: string; name: string; color: string | null };
  seats: number;
  shape: string;
  status: string;
  posX: number;
  posY: number;
  width: number;
  height: number;
  rotation: number;
  isActive: boolean;
};

type TableFormProps = {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    number: string;
    label?: string;
    zoneId: string;
    seats: number;
    shape: string;
    width: number;
    height: number;
    rotation?: number;
    status?: string;
    isActive: boolean;
    posX?: number;
    posY?: number;
  }) => Promise<void>;
  edit?: TableRow | null;
  zones: ZoneRow[];
};

const SHAPES = [
  { value: 'ROUND', label: 'მრგვალი' },
  { value: 'SQUARE', label: 'კვადრატი' },
  { value: 'RECTANGLE', label: 'მართკუთხა' },
];

const STATUSES = [
  { value: 'FREE', label: 'თავისუფალი' },
  { value: 'OCCUPIED', label: 'დაკავებული' },
  { value: 'RESERVED', label: 'რეზერვირებული' },
  { value: 'CLEANING', label: 'გაწმენდა' },
  { value: 'BILLING', label: 'გადახდა' },
];

export function TableForm({ open, onClose, onSave, edit, zones }: TableFormProps) {
  const [number, setNumber] = useState('');
  const [label, setLabel] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [seats, setSeats] = useState(4);
  const [shape, setShape] = useState('SQUARE');
  const [width, setWidth] = useState(100);
  const [height, setHeight] = useState(80);
  const [rotation, setRotation] = useState(0);
  const [status, setStatus] = useState('FREE');
  const [isActive, setIsActive] = useState(true);
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (edit) {
      setNumber(edit.number);
      setLabel(edit.label || '');
      setZoneId(edit.zoneId);
      setSeats(edit.seats);
      setShape(edit.shape);
      setWidth(edit.width || 100);
      setHeight(edit.height || 80);
      setRotation(edit.rotation);
      setStatus(edit.status);
      setIsActive(edit.isActive);
      setPosX(edit.posX);
      setPosY(edit.posY);
    } else {
      setNumber('');
      setLabel('');
      setZoneId(zones[0]?.id || '');
      setSeats(4);
      setShape('SQUARE');
      setWidth(100);
      setHeight(80);
      setRotation(0);
      setStatus('FREE');
      setIsActive(true);
      setPosX(0);
      setPosY(0);
    }
  }, [edit, zones, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!number.trim() || !zoneId) return;
    setSaving(true);
    try {
      const dataToSave = {
        number: number.trim(),
        label: label.trim() || undefined,
        zoneId,
        seats: Math.min(20, Math.max(1, seats)),
        shape,
        width: Math.max(50, Number(width) || 100),
        height: Math.max(50, Number(height) || 80),
        rotation,
        status,
        isActive,
        posX: edit ? (Number(posX) || 0) : (Number(posX) || Math.floor(Math.random() * 500) + 50),
        posY: edit ? (Number(posY) || 0) : (Number(posY) || Math.floor(Math.random() * 300) + 50),
      };
      await onSave(dataToSave);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={edit ? 'მაგიდის რედაქტირება' : 'ახალი მაგიდა'} maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">ნომერი *</label>
            <input
              type="text"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="T1"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-orange-500/50 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">ზონა *</label>
            <select
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-orange-500/50 focus:outline-none"
              required
            >
              <option value="">აირჩიეთ</option>
              {zones.filter((z) => z.isActive).map((z) => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-300">ლეიბლი</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="მაგ: ფანჯარასთან"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-orange-500/50 focus:outline-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">ადგილები (1-20)</label>
            <input
              type="number"
              min={1}
              max={20}
              value={seats}
              onChange={(e) => setSeats(parseInt(e.target.value, 10) || 1)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-orange-500/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">ფორმა</label>
            <select
              value={shape}
              onChange={(e) => setShape(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-orange-500/50 focus:outline-none"
            >
              {SHAPES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">სიგანე (px)</label>
            <input
              type="number"
              min={50}
              max={300}
              value={width || 100}
              onChange={(e) => setWidth(Number(e.target.value) || 100)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-orange-500/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">სიმაღლე (px)</label>
            <input
              type="number"
              min={50}
              max={300}
              value={height || 80}
              onChange={(e) => setHeight(Number(e.target.value) || 80)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-orange-500/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">როტაცია (°)</label>
            <input
              type="number"
              value={rotation}
              onChange={(e) => setRotation(parseInt(e.target.value, 10) || 0)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-orange-500/50 focus:outline-none"
            />
          </div>
        </div>
        {edit && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">სტატუსი</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-orange-500/50 focus:outline-none"
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        )}
        <Toggle checked={isActive} onCheckedChange={setIsActive} label="აქტიური" />
        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/10">
            გაუქმება
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'შენახვა...' : 'შენახვა'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
