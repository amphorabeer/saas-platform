'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Toggle } from '@/components/ui/Toggle';
import { AllergenSelect } from './AllergenSelect';
import type { MenuItemRow } from './MenuItemCard';

const KDS_OPTIONS = [
  { value: 'HOT', label: '🔥 HOT' },
  { value: 'COLD', label: '❄️ COLD' },
  { value: 'BAR', label: '🍸 BAR' },
  { value: 'PIZZA', label: '🍕 PIZZA' },
  { value: 'GRILL', label: '🥩 GRILL' },
  { value: 'PASTRY', label: '🧁 PASTRY' },
];

type MenuItemFormProps = {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    nameEn?: string;
    description?: string;
    descriptionEn?: string;
    categoryId: string;
    price: number;
    imageUrl?: string;
    preparationTime?: number;
    calories?: number;
    allergens: string[];
    kdsStation: string;
    isActive: boolean;
    isFavorite: boolean;
    modifierGroupIds: string[];
  }) => Promise<void>;
  edit?: MenuItemRow | null;
  categories: { id: string; name: string; icon: string | null }[];
  modifierGroups: { id: string; name: string }[];
};

export function MenuItemForm({
  open,
  onClose,
  onSave,
  edit,
  categories,
  modifierGroups,
}: MenuItemFormProps) {
  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [preparationTime, setPreparationTime] = useState('');
  const [calories, setCalories] = useState('');
  const [allergens, setAllergens] = useState<string[]>([]);
  const [kdsStation, setKdsStation] = useState('HOT');
  const [isActive, setIsActive] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedModifierGroups, setSelectedModifierGroups] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (edit) {
      setName(edit.name);
      setNameEn(edit.nameEn || '');
      setDescription(edit.description || '');
      setDescriptionEn(edit.descriptionEn || '');
      setCategoryId(edit.category?.id || '');
      setPrice(String(edit.price));
      setImageUrl(edit.imageUrl || '');
      setPreparationTime(edit.preparationTime != null ? String(edit.preparationTime) : '');
      setCalories(edit.calories != null ? String(edit.calories) : '');
      setAllergens(edit.allergens || []);
      setKdsStation(edit.kdsStation || 'HOT');
      setIsActive(edit.isActive);
      setIsFavorite(edit.isFavorite);
      setSelectedModifierGroups(
        (edit as { modifierGroups?: { modifierGroupId: string }[] }).modifierGroups?.map((g) => g.modifierGroupId) || []
      );
    } else {
      setName('');
      setNameEn('');
      setDescription('');
      setDescriptionEn('');
      setCategoryId(categories[0]?.id || '');
      setPrice('');
      setImageUrl('');
      setPreparationTime('');
      setCalories('');
      setAllergens([]);
      setKdsStation('HOT');
      setIsActive(true);
      setIsFavorite(false);
      setSelectedModifierGroups([]);
    }
  }, [edit, categories, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !categoryId) return;
    const priceNum = parseFloat(price);
    if (Number.isNaN(priceNum)) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        nameEn: nameEn.trim() || undefined,
        description: description.trim() || undefined,
        descriptionEn: descriptionEn.trim() || undefined,
        categoryId,
        price: priceNum,
        imageUrl: imageUrl.trim() || undefined,
        preparationTime: preparationTime ? parseInt(preparationTime, 10) : undefined,
        calories: calories ? parseInt(calories, 10) : undefined,
        allergens,
        kdsStation,
        isActive,
        isFavorite,
        modifierGroupIds: selectedModifierGroups,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const toggleModifierGroup = (id: string) => {
    setSelectedModifierGroups((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <Modal open={open} onClose={onClose} title={edit ? 'კერძის რედაქტირება' : 'ახალი კერძი'} maxWidth="2xl">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">სახელი (ქართ) *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder:text-slate-500 focus:border-orange-500/50 focus:outline-none"
              placeholder="მაგ: ქათამის სუპი"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">სახელი (ინგ)</label>
            <input
              type="text"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder:text-slate-500 focus:border-orange-500/50 focus:outline-none"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-300">აღწერა (ქართ)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder:text-slate-500 focus:border-orange-500/50 focus:outline-none resize-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-300">აღწერა (ინგ)</label>
          <textarea
            value={descriptionEn}
            onChange={(e) => setDescriptionEn(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder:text-slate-500 focus:border-orange-500/50 focus:outline-none resize-none"
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">კატეგორია *</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-orange-500/50 focus:outline-none"
              required
            >
              <option value="">აირჩიეთ</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.icon || ''} {c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">ფასი (₾) *</label>
            <input
              type="number"
              step="0.01"
              min={0}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-orange-500/50 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">მომზადების დრო (წთ)</label>
            <input
              type="number"
              min={0}
              value={preparationTime}
              onChange={(e) => setPreparationTime(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-orange-500/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">კალორია</label>
            <input
              type="number"
              min={0}
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-orange-500/50 focus:outline-none"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-300">სურათის URL</label>
          <input
            type="text"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder:text-slate-500 focus:border-orange-500/50 focus:outline-none"
            placeholder="https://..."
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-300">ალერგენები</label>
          <AllergenSelect value={allergens} onChange={setAllergens} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-300">KDS სადგური</label>
          <select
            value={kdsStation}
            onChange={(e) => setKdsStation(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-orange-500/50 focus:outline-none"
          >
            {KDS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-6">
          <Toggle checked={isActive} onCheckedChange={setIsActive} label="აქტიური" />
          <Toggle checked={isFavorite} onCheckedChange={setIsFavorite} label="ფავორიტი" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">მოდიფიკატორების ჯგუფები</label>
          <div className="flex flex-wrap gap-2">
            {modifierGroups.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => toggleModifierGroup(g.id)}
                className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                  selectedModifierGroups.includes(g.id)
                    ? 'border-orange-500/50 bg-orange-500/20 text-orange-400'
                    : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                {g.name}
              </button>
            ))}
            {modifierGroups.length === 0 && (
              <span className="text-sm text-slate-500">ჯგუფები არ არის. ჯერ შექმენით მოდიფიკატორების ჯგუფი.</span>
            )}
          </div>
        </div>
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
