'use client';

import { useState } from 'react';
import {
  Sparkles,
  Plus,
  Search,
  Edit2,
  Trash2,
  Clock,
  DollarSign,
  Users,
  Tag,
  MoreVertical,
  FolderPlus,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { ServiceModal } from './ServiceModal';
import { CategoryModal } from './CategoryModal';

interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  isActive: boolean;
}

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  price: number;
  priceVariants: any;
  categoryId: string | null;
  categoryName: string | null;
  image: string | null;
  isActive: boolean;
  staffCount: number;
}

export function ServicesClient({
  data,
}: {
  data: { categories: Category[]; services: Service[] };
}) {
  const [services, setServices] = useState(data.services);
  const [categories] = useState(data.categories);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const filtered = services.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description?.toLowerCase().includes(search.toLowerCase());
    const matchCategory =
      selectedCategory === 'all' || s.categoryId === selectedCategory;
    return matchSearch && matchCategory;
  });

  const handleSaveService = async (serviceData: any) => {
    const url = editingService ? `/api/services/${editingService.id}` : '/api/services';
    const res = await fetch(url, {
      method: editingService ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(serviceData),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'შეცდომა');
    }
    window.location.reload();
  };

  const handleSaveCategory = async (categoryData: any) => {
    const url = editingCategory
      ? `/api/services/categories/${editingCategory.id}`
      : '/api/services/categories';
    const res = await fetch(url, {
      method: editingCategory ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(categoryData),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'შეცდომა');
    }
    window.location.reload();
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm('ნამდვილად გსურთ სერვისის წაშლა?')) return;
    try {
      await fetch(`/api/services/${id}`, { method: 'DELETE' });
      setServices(services.filter((s) => s.id !== id));
    } catch {
      alert('წაშლა ვერ მოხერხდა');
    }
    setActiveMenu(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles size={24} className="text-primary-400" />
            სერვისები
          </h1>
          <p className="text-dark-400 mt-1">
            {services.length} სერვისი, {categories.length} კატეგორია
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setEditingCategory(null);
              setShowCategoryModal(true);
            }}
            className="btn-secondary flex items-center gap-2"
          >
            <FolderPlus size={18} />
            კატეგორია
          </button>
          <button
            onClick={() => {
              setEditingService(null);
              setShowServiceModal(true);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            სერვისი
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ძებნა..."
            className="input pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCategory('all')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm border transition-colors',
              selectedCategory === 'all'
                ? 'bg-primary-500/20 text-primary-400 border-primary-500/30'
                : 'bg-dark-800 text-dark-300 border-dark-700 hover:border-dark-600'
            )}
          >
            ყველა
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm border transition-colors',
                selectedCategory === cat.id
                  ? 'bg-primary-500/20 text-primary-400 border-primary-500/30'
                  : 'bg-dark-800 text-dark-300 border-dark-700 hover:border-dark-600'
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Services Grid */}
      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <Sparkles size={48} className="mx-auto mb-4 text-dark-500 opacity-30" />
          <p className="text-dark-400">
            {search || selectedCategory !== 'all'
              ? 'სერვისი ვერ მოიძებნა'
              : 'სერვისები არ არის დამატებული'}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((service) => (
            <div
              key={service.id}
              className={cn('card-hover relative', !service.isActive && 'opacity-60')}
            >
              <div className="absolute top-4 right-4">
                <button
                  onClick={() => setActiveMenu(activeMenu === service.id ? null : service.id)}
                  className="p-1.5 text-dark-400 hover:text-white rounded-lg hover:bg-dark-700"
                >
                  <MoreVertical size={16} />
                </button>
                {activeMenu === service.id && (
                  <div className="absolute right-0 top-8 w-40 bg-dark-700 border border-dark-600 rounded-lg shadow-xl z-10 py-1">
                    <button
                      onClick={() => {
                        setEditingService(service);
                        setShowServiceModal(true);
                        setActiveMenu(null);
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-dark-200 hover:bg-dark-600"
                    >
                      <Edit2 size={14} /> რედაქტირება
                    </button>
                    <button
                      onClick={() => handleDeleteService(service.id)}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-dark-600"
                    >
                      <Trash2 size={14} /> წაშლა
                    </button>
                  </div>
                )}
              </div>

              <div className="mb-3">
                {service.categoryName && (
                  <span className="badge bg-primary-500/10 text-primary-400 mb-2">
                    <Tag size={10} className="mr-1" /> {service.categoryName}
                  </span>
                )}
                <h3 className="font-semibold text-white text-lg">{service.name}</h3>
                {service.description && (
                  <p className="text-sm text-dark-400 mt-1 line-clamp-2">{service.description}</p>
                )}
              </div>

              <div className="flex items-center gap-4 pt-3 border-t border-dark-700">
                <div className="flex items-center gap-1.5 text-sm">
                  <Clock size={14} className="text-dark-400" />
                  <span className="text-dark-200">{service.duration} წთ</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <DollarSign size={14} className="text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">
                    {formatCurrency(service.price)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <Users size={14} className="text-dark-400" />
                  <span className="text-dark-200">{service.staffCount} სპეც.</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showServiceModal && (
        <ServiceModal
          service={editingService}
          categories={categories}
          onClose={() => {
            setShowServiceModal(false);
            setEditingService(null);
          }}
          onSave={handleSaveService}
        />
      )}

      {showCategoryModal && (
        <CategoryModal
          category={editingCategory}
          onClose={() => {
            setShowCategoryModal(false);
            setEditingCategory(null);
          }}
          onSave={handleSaveCategory}
        />
      )}
    </div>
  );
}
