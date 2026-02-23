'use client';

import { useState } from 'react';
import {
  UserCircle,
  Plus,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  Phone,
  Mail,
  Calendar,
  Star,
  Gift,
  ShoppingBag,
  AlertTriangle,
  Crown,
} from 'lucide-react';
import { cn, getInitials, formatDate } from '@/lib/utils';
import { ClientModal } from './ClientModal';
import { ClientDetailModal } from './ClientDetailModal';

interface ClientData {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  birthDate: string | null;
  gender: string | null;
  notes: string | null;
  allergies: string | null;
  hairType: string | null;
  colorFormula: string | null;
  loyaltyPoints: number;
  loyaltyTier: string;
  isActive: boolean;
  createdAt: string;
  appointmentsCount: number;
  salesCount: number;
  reviewsCount: number;
}

const tierColors: Record<string, string> = {
  STANDARD: 'bg-dark-600 text-dark-300',
  SILVER: 'bg-gray-500/20 text-gray-300',
  GOLD: 'bg-amber-500/20 text-amber-400',
  VIP: 'bg-purple-500/20 text-purple-400',
};

const tierLabels: Record<string, string> = {
  STANDARD: 'სტანდარტი',
  SILVER: 'ვერცხლი',
  GOLD: 'ოქრო',
  VIP: 'VIP',
};

export function ClientsClient({ clients: initialClients }: { clients: ClientData[] }) {
  const [clients, setClients] = useState(initialClients);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<string | 'all'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientData | null>(null);
  const [viewingClient, setViewingClient] = useState<ClientData | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const filtered = clients.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search) ||
      c.email?.toLowerCase().includes(search.toLowerCase());
    const matchTier = tierFilter === 'all' || c.loyaltyTier === tierFilter;
    return matchSearch && matchTier;
  });

  const handleSave = async (data: any) => {
    const url = editingClient ? `/api/clients/${editingClient.id}` : '/api/clients';
    const res = await fetch(url, {
      method: editingClient ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'შეცდომა');
    }
    window.location.reload();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('ნამდვილად გსურთ კლიენტის წაშლა?')) return;
    await fetch(`/api/clients/${id}`, { method: 'DELETE' });
    setClients(clients.filter((c) => c.id !== id));
    setActiveMenu(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <UserCircle size={24} className="text-primary-400" />
            კლიენტები
          </h1>
          <p className="text-dark-400 mt-1">
            სულ {clients.length} კლიენტი
          </p>
        </div>
        <button
          onClick={() => { setEditingClient(null); setShowModal(true); }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} /> დამატება
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ძებნა სახელით, ტელეფონით..."
            className="input pl-10"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'STANDARD', 'SILVER', 'GOLD', 'VIP'].map((tier) => (
            <button
              key={tier}
              onClick={() => setTierFilter(tier)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm border transition-colors',
                tierFilter === tier
                  ? 'bg-primary-500/20 text-primary-400 border-primary-500/30'
                  : 'bg-dark-800 text-dark-300 border-dark-700 hover:border-dark-600'
              )}
            >
              {tier === 'all' ? 'ყველა' : tierLabels[tier]}
            </button>
          ))}
        </div>
      </div>

      {/* Clients Table */}
      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <UserCircle size={48} className="mx-auto mb-4 text-dark-500 opacity-30" />
          <p className="text-dark-400">
            {search ? 'კლიენტი ვერ მოიძებნა' : 'კლიენტები არ არის დამატებული'}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-900/50">
                <tr>
                  <th className="table-header">კლიენტი</th>
                  <th className="table-header">კონტაქტი</th>
                  <th className="table-header hidden md:table-cell">ვიზიტები</th>
                  <th className="table-header hidden lg:table-cell">ლოიალობა</th>
                  <th className="table-header hidden lg:table-cell">შენიშვნა</th>
                  <th className="table-header w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {filtered.map((client) => (
                  <tr
                    key={client.id}
                    className="hover:bg-dark-700/30 cursor-pointer transition-colors"
                    onClick={() => setViewingClient(client)}
                  >
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-500/20 text-primary-400 rounded-xl flex items-center justify-center text-sm font-bold shrink-0">
                          {getInitials(client.name)}
                        </div>
                        <div>
                          <p className="font-medium text-white">{client.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={cn('badge text-xs', tierColors[client.loyaltyTier])}>
                              {client.loyaltyTier === 'VIP' && <Crown size={10} className="mr-1" />}
                              {tierLabels[client.loyaltyTier]}
                            </span>
                            {client.allergies && (
                              <span className="badge bg-red-500/10 text-red-400 text-xs">
                                <AlertTriangle size={10} className="mr-1" /> ალერგია
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="space-y-1">
                        {client.phone && (
                          <div className="flex items-center gap-1.5 text-dark-300 text-xs">
                            <Phone size={12} /> {client.phone}
                          </div>
                        )}
                        {client.email && (
                          <div className="flex items-center gap-1.5 text-dark-300 text-xs">
                            <Mail size={12} /> {client.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="table-cell hidden md:table-cell">
                      <div className="flex items-center gap-3 text-xs text-dark-400">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} /> {client.appointmentsCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <ShoppingBag size={12} /> {client.salesCount}
                        </span>
                      </div>
                    </td>
                    <td className="table-cell hidden lg:table-cell">
                      <div className="flex items-center gap-1.5">
                        <Gift size={14} className="text-primary-400" />
                        <span className="text-sm text-white font-medium">{client.loyaltyPoints}</span>
                        <span className="text-xs text-dark-400">ქულა</span>
                      </div>
                    </td>
                    <td className="table-cell hidden lg:table-cell">
                      <p className="text-xs text-dark-400 truncate max-w-[150px]">
                        {client.notes || '—'}
                      </p>
                    </td>
                    <td className="table-cell" onClick={(e) => e.stopPropagation()}>
                      <div className="relative">
                        <button
                          onClick={() => setActiveMenu(activeMenu === client.id ? null : client.id)}
                          className="p-1.5 text-dark-400 hover:text-white rounded-lg hover:bg-dark-600"
                        >
                          <MoreVertical size={16} />
                        </button>
                        {activeMenu === client.id && (
                          <div className="absolute right-0 top-8 w-40 bg-dark-700 border border-dark-600 rounded-lg shadow-xl z-10 py-1">
                            <button
                              onClick={() => { setEditingClient(client); setShowModal(true); setActiveMenu(null); }}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-dark-200 hover:bg-dark-600"
                            >
                              <Edit2 size={14} /> რედაქტირება
                            </button>
                            <button
                              onClick={() => handleDelete(client.id)}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-dark-600"
                            >
                              <Trash2 size={14} /> წაშლა
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <ClientModal
          client={editingClient}
          onClose={() => { setShowModal(false); setEditingClient(null); }}
          onSave={handleSave}
        />
      )}

      {viewingClient && (
        <ClientDetailModal
          client={viewingClient}
          onClose={() => setViewingClient(null)}
          onEdit={() => { setEditingClient(viewingClient); setShowModal(true); setViewingClient(null); }}
        />
      )}
    </div>
  );
}
