'use client';

import { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  Calendar,
  Star,
  Shield,
  Phone,
  Mail,
} from 'lucide-react';
import { cn, getInitials, STAFF_ROLES, DAYS_OF_WEEK } from '@/lib/utils';
import { StaffModal } from './StaffModal';

interface StaffMember {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatar: string | null;
  role: string;
  specialties: string[];
  bio: string | null;
  pin: string | null;
  commissionType: string;
  commissionRate: number;
  isActive: boolean;
  createdAt: string;
  schedules: {
    id: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isOff: boolean;
  }[];
  services: { id: string; name: string }[];
  appointmentsCount: number;
  reviewsCount: number;
}

export function StaffListClient({ staff: initialStaff }: { staff: StaffMember[] }) {
  const [staff, setStaff] = useState(initialStaff);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const filtered = staff.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase()) ||
    s.phone?.includes(search)
  );

  const handleSave = async (data: any) => {
    try {
      const url = editingStaff ? `/api/staff/${editingStaff.id}` : '/api/staff';
      const method = editingStaff ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'შეცდომა');
      }

      // Reload page to get fresh data
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('ნამდვილად გსურთ წაშლა?')) return;

    try {
      const res = await fetch(`/api/staff/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('წაშლა ვერ მოხერხდა');
      setStaff(staff.filter((s) => s.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
    setActiveMenu(null);
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/staff/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (!res.ok) throw new Error('შეცდომა');
      setStaff(staff.map((s) => (s.id === id ? { ...s, isActive: !isActive } : s)));
    } catch (err: any) {
      alert(err.message);
    }
    setActiveMenu(null);
  };

  const roleColors: Record<string, string> = {
    OWNER: 'bg-amber-500/10 text-amber-400',
    ADMIN: 'bg-purple-500/10 text-purple-400',
    SPECIALIST: 'bg-primary-500/10 text-primary-400',
    RECEPTIONIST: 'bg-blue-500/10 text-blue-400',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users size={24} className="text-primary-400" />
            სპეციალისტები
          </h1>
          <p className="text-dark-400 mt-1">
            სულ {staff.length} სპეციალისტი, {staff.filter((s) => s.isActive).length} აქტიური
          </p>
        </div>
        <button
          onClick={() => {
            setEditingStaff(null);
            setShowModal(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          დამატება
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ძებნა სახელით, ელფოსტით ან ტელეფონით..."
          className="input pl-10"
        />
      </div>

      {/* Staff Grid */}
      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <Users size={48} className="mx-auto mb-4 text-dark-500 opacity-30" />
          <p className="text-dark-400">
            {search ? 'სპეციალისტი ვერ მოიძებნა' : 'სპეციალისტები არ არის დამატებული'}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((member) => (
            <div
              key={member.id}
              className={cn(
                'card-hover relative',
                !member.isActive && 'opacity-60'
              )}
            >
              {/* Menu button */}
              <div className="absolute top-4 right-4">
                <button
                  onClick={() =>
                    setActiveMenu(activeMenu === member.id ? null : member.id)
                  }
                  className="p-1.5 text-dark-400 hover:text-white rounded-lg hover:bg-dark-700"
                >
                  <MoreVertical size={16} />
                </button>
                {activeMenu === member.id && (
                  <div className="absolute right-0 top-8 w-44 bg-dark-700 border border-dark-600 rounded-lg shadow-xl z-10 py-1">
                    <button
                      onClick={() => {
                        setEditingStaff(member);
                        setShowModal(true);
                        setActiveMenu(null);
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-dark-200 hover:bg-dark-600"
                    >
                      <Edit2 size={14} />
                      რედაქტირება
                    </button>
                    <button
                      onClick={() =>
                        handleToggleActive(member.id, member.isActive)
                      }
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-dark-200 hover:bg-dark-600"
                    >
                      <Shield size={14} />
                      {member.isActive ? 'დეაქტივაცია' : 'აქტივაცია'}
                    </button>
                    <button
                      onClick={() => handleDelete(member.id)}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-dark-600"
                    >
                      <Trash2 size={14} />
                      წაშლა
                    </button>
                  </div>
                )}
              </div>

              {/* Profile */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-primary-500/20 text-primary-400 rounded-xl flex items-center justify-center text-lg font-bold">
                  {getInitials(member.name)}
                </div>
                <div>
                  <h3 className="font-semibold text-white">{member.name}</h3>
                  <span className={cn('badge', roleColors[member.role] || 'bg-dark-600 text-dark-300')}>
                    {STAFF_ROLES[member.role as keyof typeof STAFF_ROLES] || member.role}
                  </span>
                </div>
              </div>

              {/* Contact */}
              <div className="space-y-1.5 mb-4 text-sm">
                {member.phone && (
                  <div className="flex items-center gap-2 text-dark-300">
                    <Phone size={14} className="text-dark-500" />
                    {member.phone}
                  </div>
                )}
                {member.email && (
                  <div className="flex items-center gap-2 text-dark-300">
                    <Mail size={14} className="text-dark-500" />
                    {member.email}
                  </div>
                )}
              </div>

              {/* Specialties */}
              {member.specialties.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {member.specialties.map((spec) => (
                    <span
                      key={spec}
                      className="text-xs bg-dark-700 text-dark-300 px-2 py-0.5 rounded"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center gap-4 pt-3 border-t border-dark-700 text-xs text-dark-400">
                <div className="flex items-center gap-1">
                  <Calendar size={12} />
                  {member.appointmentsCount} ჯავშანი
                </div>
                <div className="flex items-center gap-1">
                  <Star size={12} />
                  {member.reviewsCount} შეფასება
                </div>
                {member.commissionRate > 0 && (
                  <div>
                    {member.commissionType === 'PERCENTAGE'
                      ? `${member.commissionRate}%`
                      : `${member.commissionRate}₾`}{' '}
                    კომისია
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Staff Modal */}
      {showModal && (
        <StaffModal
          staff={editingStaff}
          onClose={() => {
            setShowModal(false);
            setEditingStaff(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
