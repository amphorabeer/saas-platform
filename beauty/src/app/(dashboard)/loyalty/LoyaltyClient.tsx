'use client';

import { useState, useMemo } from 'react';
import {
  Gift,
  Star,
  Search,
  Plus,
  Minus,
  CreditCard,
  Users,
  Trophy,
  ArrowUpRight,
  ArrowDownRight,
  Award,
  Download,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { GiftCardModal } from './GiftCardModal';
import { PointsModal } from './PointsModal';

interface ClientLoyalty {
  id: string;
  name: string;
  phone: string | null;
  loyaltyPoints: number;
  loyaltyTier: string;
  salesCount: number;
}

interface Transaction {
  id: string;
  clientName: string;
  clientId: string;
  points: number;
  type: string;
  description: string | null;
  createdAt: string;
}

interface GiftCard {
  id: string;
  code: string;
  initialBalance: number;
  balance: number;
  expiresAt: string | null;
  isActive: boolean;
  clientName: string | null;
  createdAt: string;
}

interface LoyaltyData {
  clients: ClientLoyalty[];
  transactions: Transaction[];
  giftCards: GiftCard[];
}

type Tab = 'clients' | 'transactions' | 'gift-cards';

const TIER_CONFIG: Record<string, { label: string; color: string; icon: string; minPoints: number }> = {
  STANDARD: { label: 'სტანდარტი', color: 'bg-dark-600 text-dark-300', icon: '⭐', minPoints: 0 },
  SILVER: { label: 'ვერცხლი', color: 'bg-slate-500/10 text-slate-300', icon: '🥈', minPoints: 100 },
  GOLD: { label: 'ოქრო', color: 'bg-amber-500/10 text-amber-400', icon: '🥇', minPoints: 500 },
  VIP: { label: 'VIP', color: 'bg-purple-500/10 text-purple-400', icon: '💎', minPoints: 1000 },
};

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  EARN: { label: 'მიღებული', color: 'text-emerald-400' },
  REDEEM: { label: 'გამოყენებული', color: 'text-red-400' },
  BONUS: { label: 'ბონუსი', color: 'text-amber-400' },
  EXPIRED: { label: 'ვადაგასული', color: 'text-dark-400' },
};

export function LoyaltyClient({ data }: { data: LoyaltyData }) {
  const [tab, setTab] = useState<Tab>('clients');
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientLoyalty | null>(null);
  const [transactions, setTransactions] = useState(data.transactions);
  const [giftCards, setGiftCards] = useState(data.giftCards);
  const [clients, setClients] = useState(data.clients);

  // Stats
  const stats = useMemo(() => {
    const totalPoints = clients.reduce((s, c) => s + c.loyaltyPoints, 0);
    const tierCounts = clients.reduce((acc, c) => {
      acc[c.loyaltyTier] = (acc[c.loyaltyTier] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const activeGiftCards = giftCards.filter((g) => g.isActive && g.balance > 0).length;
    const giftCardBalance = giftCards.filter((g) => g.isActive).reduce((s, g) => s + g.balance, 0);
    return { totalPoints, tierCounts, activeGiftCards, giftCardBalance };
  }, [clients, giftCards]);

  // Filtered clients
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search);
      const matchTier = !tierFilter || c.loyaltyTier === tierFilter;
      return matchSearch && matchTier;
    });
  }, [clients, search, tierFilter]);

  const handlePointsSave = async (clientId: string, points: number, type: string, description: string) => {
    try {
      const res = await fetch('/api/loyalty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, points, type, description }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.message); }
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleGiftCardSave = async (cardData: any) => {
    try {
      const res = await fetch('/api/loyalty/gift-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cardData),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.message); }
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const downloadCSV = () => {
    const lines = ['\uFEFF=== ლოიალობის რეპორტი ===', '', 'კლიენტი,ტელეფონი,ქულები,დონე,გაყიდვები'];
    clients.forEach((c) => {
      lines.push(`${c.name},${c.phone || ''},${c.loyaltyPoints},${TIER_CONFIG[c.loyaltyTier]?.label || c.loyaltyTier},${c.salesCount}`);
    });
    lines.push('', '=== ტრანზაქციები ===', 'თარიღი,კლიენტი,ტიპი,ქულები,აღწერა');
    transactions.forEach((t) => {
      const date = new Date(t.createdAt).toLocaleDateString('ka-GE');
      lines.push(`${date},${t.clientName},${TYPE_CONFIG[t.type]?.label || t.type},${t.points},${t.description || ''}`);
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ლოიალობა_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Gift size={24} className="text-primary-400" />
            ლოიალობა
          </h1>
          <p className="text-dark-400 mt-1">ქულები, დონეები და სასაჩუქრე ბარათები</p>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadCSV} className="btn-secondary flex items-center gap-2">
            <Download size={16} /> ექსპორტი
          </button>
          <button onClick={() => setShowGiftModal(true)} className="btn-secondary flex items-center gap-2">
            <CreditCard size={16} /> სასაჩუქრე ბარათი
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Star size={16} className="text-amber-400" />
            <span className="text-xs text-dark-400">სულ ქულები</span>
          </div>
          <p className="text-xl font-bold text-white">{stats.totalPoints.toLocaleString()}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Trophy size={16} className="text-purple-400" />
            <span className="text-xs text-dark-400">VIP კლიენტები</span>
          </div>
          <p className="text-xl font-bold text-purple-400">{stats.tierCounts['VIP'] || 0}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard size={16} className="text-primary-400" />
            <span className="text-xs text-dark-400">აქტ. სას. ბარათი</span>
          </div>
          <p className="text-xl font-bold text-white">{stats.activeGiftCards}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Gift size={16} className="text-emerald-400" />
            <span className="text-xs text-dark-400">ბარათების ბალანსი</span>
          </div>
          <p className="text-xl font-bold text-emerald-400">{formatCurrency(stats.giftCardBalance)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {([
          { id: 'clients' as Tab, label: `კლიენტები (${clients.length})`, icon: Users },
          { id: 'transactions' as Tab, label: `ტრანზაქციები (${transactions.length})`, icon: ArrowUpRight },
          { id: 'gift-cards' as Tab, label: `სას. ბარათები (${giftCards.length})`, icon: CreditCard },
        ]).map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors',
                tab === t.id
                  ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                  : 'bg-dark-800 text-dark-300 border border-dark-700 hover:border-dark-600'
              )}
            >
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Clients Tab */}
      {tab === 'clients' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="ძებნა..." className="input pl-10" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setTierFilter('')}
                className={cn('px-3 py-1.5 rounded-lg text-sm', !tierFilter ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30' : 'bg-dark-800 text-dark-300 border border-dark-700')}>
                ყველა
              </button>
              {Object.entries(TIER_CONFIG).map(([key, cfg]) => (
                <button key={key} onClick={() => setTierFilter(tierFilter === key ? '' : key)}
                  className={cn('px-3 py-1.5 rounded-lg text-sm', tierFilter === key ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30' : 'bg-dark-800 text-dark-300 border border-dark-700')}>
                  {cfg.icon} {cfg.label}
                </button>
              ))}
            </div>
          </div>

          <div className="card overflow-x-auto p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700">
                  <th className="text-left px-4 py-3 text-xs font-medium text-dark-400 uppercase">კლიენტი</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-dark-400 uppercase">დონე</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-dark-400 uppercase">ქულები</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-dark-400 uppercase">ვიზიტები</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-dark-400 uppercase"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700/50">
                {filteredClients.map((client) => {
                  const tier = TIER_CONFIG[client.loyaltyTier] || TIER_CONFIG.STANDARD;
                  return (
                    <tr key={client.id} className="hover:bg-dark-800/50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-white text-sm">{client.name}</p>
                        {client.phone && <p className="text-xs text-dark-400">{client.phone}</p>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn('badge text-xs', tier.color)}>{tier.icon} {tier.label}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-medium text-amber-400">{client.loyaltyPoints}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm text-dark-300">{client.salesCount}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => { setSelectedClient(client); setShowPointsModal(true); }}
                          className="text-xs text-primary-400 hover:text-primary-300 px-2 py-1 rounded hover:bg-dark-700"
                        >
                          ± ქულები
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transactions Tab */}
      {tab === 'transactions' && (
        <div className="card">
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-dark-500 text-sm">ტრანზაქციები არ არის</div>
          ) : (
            <div className="space-y-2">
              {transactions.map((t) => {
                const cfg = TYPE_CONFIG[t.type] || TYPE_CONFIG.EARN;
                const isPositive = t.type === 'EARN' || t.type === 'BONUS';
                return (
                  <div key={t.id} className="flex items-center gap-3 p-3 bg-dark-800/50 rounded-lg">
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', isPositive ? 'bg-emerald-500/10' : 'bg-red-500/10')}>
                      {isPositive ? <ArrowUpRight size={16} className="text-emerald-400" /> : <ArrowDownRight size={16} className="text-red-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white">{t.clientName}</span>
                        <span className={cn('text-xs', cfg.color)}>{cfg.label}</span>
                      </div>
                      {t.description && <p className="text-xs text-dark-400 truncate">{t.description}</p>}
                      <p className="text-[10px] text-dark-500">
                        {new Date(t.createdAt).toLocaleString('ka-GE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span className={cn('text-sm font-medium', cfg.color)}>
                      {isPositive ? '+' : '-'}{t.points}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Gift Cards Tab */}
      {tab === 'gift-cards' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {giftCards.length === 0 ? (
              <div className="col-span-full card text-center py-8 text-dark-500 text-sm">
                სასაჩუქრე ბარათები არ არის
              </div>
            ) : (
              giftCards.map((card) => (
                <div key={card.id} className={cn('card', !card.isActive && 'opacity-50')}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono bg-dark-700 text-dark-200 px-2 py-1 rounded">{card.code}</span>
                    <span className={cn('badge text-[10px]', card.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-dark-600 text-dark-400')}>
                      {card.isActive ? 'აქტიური' : 'არააქტიური'}
                    </span>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs text-dark-400">ბალანსი</p>
                      <p className="text-lg font-bold text-emerald-400">{formatCurrency(card.balance)}</p>
                      <p className="text-[10px] text-dark-500">საწყისი: {formatCurrency(card.initialBalance)}</p>
                    </div>
                    <div className="text-right">
                      {card.clientName && <p className="text-xs text-dark-300">{card.clientName}</p>}
                      {card.expiresAt && (
                        <p className="text-[10px] text-dark-500">
                          ვადა: {new Date(card.expiresAt).toLocaleDateString('ka-GE')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {showPointsModal && selectedClient && (
        <PointsModal
          client={selectedClient}
          onClose={() => { setShowPointsModal(false); setSelectedClient(null); }}
          onSave={handlePointsSave}
        />
      )}
      {showGiftModal && (
        <GiftCardModal
          clients={clients}
          onClose={() => setShowGiftModal(false)}
          onSave={handleGiftCardSave}
        />
      )}
    </div>
  );
}
