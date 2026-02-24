'use client';

import { useState } from 'react';
import { X, Package } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  category: string | null;
  brand: string | null;
  sku: string | null;
  barcode: string | null;
  price: number;
  costPrice: number | null;
  stock: number;
  minStock: number;
  image: string | null;
  description: string | null;
  isActive: boolean;
}

const PRODUCT_CATEGORIES = [
  'თმის მოვლა',
  'კანის მოვლა',
  'ფრჩხილის მოვლა',
  'მაკიაჟი',
  'სუნამო',
  'აქსესუარები',
  'პროფესიონალური',
  'სხვა',
];

export function ProductModal({
  product,
  onClose,
  onSave,
}: {
  product: Product | null;
  onClose: () => void;
  onSave: (data: any) => void;
}) {
  const [form, setForm] = useState({
    name: product?.name || '',
    category: product?.category || '',
    brand: product?.brand || '',
    sku: product?.sku || '',
    barcode: product?.barcode || '',
    price: product?.price || 0,
    costPrice: product?.costPrice || 0,
    stock: product?.stock || 0,
    minStock: product?.minStock || 5,
    description: product?.description || '',
    isActive: product?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      alert('სახელი სავალდებულოა');
      return;
    }
    if (form.price <= 0) {
      alert('ფასი უნდა იყოს 0-ზე მეტი');
      return;
    }

    setSaving(true);
    await onSave({
      name: form.name.trim(),
      category: form.category || null,
      brand: form.brand || null,
      sku: form.sku || null,
      barcode: form.barcode || null,
      price: Number(form.price),
      costPrice: form.costPrice ? Number(form.costPrice) : null,
      stock: Number(form.stock),
      minStock: Number(form.minStock),
      description: form.description || null,
      isActive: form.isActive,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-dark-800 border border-dark-700 rounded-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700 sticky top-0 bg-dark-800 z-10">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Package size={20} className="text-primary-400" />
            {product ? 'პროდუქტის რედაქტირება' : 'ახალი პროდუქტი'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-dark-400 hover:text-white rounded-lg hover:bg-dark-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-4 space-y-4">
          {/* Name */}
          <div>
            <label className="label">სახელი *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="მაგ: კერატინის შამპუნი"
              className="input"
            />
          </div>

          {/* Category + Brand */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">კატეგორია</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="input"
              >
                <option value="">აირჩიეთ</option>
                {PRODUCT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">ბრენდი</label>
              <input
                type="text"
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                placeholder="მაგ: L'Oréal"
                className="input"
              />
            </div>
          </div>

          {/* SKU + Barcode */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">SKU</label>
              <input
                type="text"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                placeholder="SKU-001"
                className="input"
              />
            </div>
            <div>
              <label className="label">ბარკოდი</label>
              <input
                type="text"
                value={form.barcode}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                placeholder="4901234567890"
                className="input"
              />
            </div>
          </div>

          {/* Price + Cost Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">გასაყიდი ფასი (₾) *</label>
              <input
                type="number"
                value={form.price || ''}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                min={0}
                step={0.01}
                className="input"
              />
            </div>
            <div>
              <label className="label">თვითღირებულება (₾)</label>
              <input
                type="number"
                value={form.costPrice || ''}
                onChange={(e) => setForm({ ...form, costPrice: Number(e.target.value) })}
                min={0}
                step={0.01}
                className="input"
              />
            </div>
          </div>

          {/* Stock + Min Stock */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">მარაგი (რაოდენობა)</label>
              <input
                type="number"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
                min={0}
                className="input"
              />
            </div>
            <div>
              <label className="label">მინ. მარაგი (შეტყობინება)</label>
              <input
                type="number"
                value={form.minStock}
                onChange={(e) => setForm({ ...form, minStock: Number(e.target.value) })}
                min={0}
                className="input"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="label">აღწერა</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              placeholder="პროდუქტის აღწერა..."
              className="input resize-none"
            />
          </div>

          {/* Active */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="rounded border-dark-600 bg-dark-700 text-primary-500"
            />
            <span className="text-sm text-dark-200">აქტიური</span>
          </label>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-dark-700 flex gap-3 sticky bottom-0 bg-dark-800">
          <button onClick={onClose} className="btn-secondary flex-1">
            გაუქმება
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="btn-primary flex-1"
          >
            {saving ? 'ინახება...' : product ? 'შენახვა' : 'დამატება'}
          </button>
        </div>
      </div>
    </div>
  );
}
