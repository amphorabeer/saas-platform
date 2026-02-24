'use client';

import {
  X, Edit2, Phone, Mail, Calendar, Gift, Star,
  ShoppingBag, AlertTriangle, Crown, Palette, Scissors, FileText,
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';

const tierColors: Record<string, string> = {
  STANDARD: 'bg-dark-600 text-dark-300',
  SILVER: 'bg-gray-500/20 text-gray-300',
  GOLD: 'bg-amber-500/20 text-amber-400',
  VIP: 'bg-purple-500/20 text-purple-400',
};
const tierLabels: Record<string, string> = {
  STANDARD: 'სტანდარტი', SILVER: 'ვერცხლი', GOLD: 'ოქრო', VIP: 'VIP',
};

export function ClientDetailModal({
  client,
  onClose,
  onEdit,
}: {
  client: any;
  onClose: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-dark-800 border border-dark-700 rounded-xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
          <h2 className="text-lg font-semibold text-white">კლიენტის პროფილი</h2>
          <div className="flex gap-2">
            <button onClick={onEdit} className="p-1.5 text-dark-400 hover:text-primary-400 rounded-lg hover:bg-dark-700">
              <Edit2 size={16} />
            </button>
            <button onClick={onClose} className="p-1.5 text-dark-400 hover:text-white rounded-lg hover:bg-dark-700">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Name & Tier */}
          <div className="text-center">
            <div className="w-16 h-16 bg-primary-500/20 text-primary-400 rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-3">
              {client.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <h3 className="text-xl font-bold text-white">{client.name}</h3>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className={cn('badge', tierColors[client.loyaltyTier])}>
                {client.loyaltyTier === 'VIP' && <Crown size={10} className="mr-1" />}
                {tierLabels[client.loyaltyTier]}
              </span>
              <span className="badge bg-primary-500/10 text-primary-400">
                <Gift size={10} className="mr-1" /> {client.loyaltyPoints} ქულა
              </span>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-2">
            {client.phone && (
              <div className="flex items-center gap-3 p-2.5 bg-dark-900/50 rounded-lg">
                <Phone size={16} className="text-dark-400" />
                <span className="text-sm text-dark-200">{client.phone}</span>
              </div>
            )}
            {client.email && (
              <div className="flex items-center gap-3 p-2.5 bg-dark-900/50 rounded-lg">
                <Mail size={16} className="text-dark-400" />
                <span className="text-sm text-dark-200">{client.email}</span>
              </div>
            )}
            {client.birthDate && (
              <div className="flex items-center gap-3 p-2.5 bg-dark-900/50 rounded-lg">
                <Calendar size={16} className="text-dark-400" />
                <span className="text-sm text-dark-200">{formatDate(client.birthDate)}</span>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-dark-900/50 rounded-lg">
              <Calendar size={16} className="text-blue-400 mx-auto mb-1" />
              <p className="text-lg font-bold text-white">{client.appointmentsCount}</p>
              <p className="text-xs text-dark-400">ვიზიტი</p>
            </div>
            <div className="text-center p-3 bg-dark-900/50 rounded-lg">
              <ShoppingBag size={16} className="text-emerald-400 mx-auto mb-1" />
              <p className="text-lg font-bold text-white">{client.salesCount}</p>
              <p className="text-xs text-dark-400">შეკვეთა</p>
            </div>
            <div className="text-center p-3 bg-dark-900/50 rounded-lg">
              <Star size={16} className="text-amber-400 mx-auto mb-1" />
              <p className="text-lg font-bold text-white">{client.reviewsCount}</p>
              <p className="text-xs text-dark-400">შეფასება</p>
            </div>
          </div>

          {/* Allergies */}
          {client.allergies && (
            <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
              <div className="flex items-center gap-2 text-red-400 mb-1">
                <AlertTriangle size={14} />
                <span className="text-sm font-medium">ალერგიები</span>
              </div>
              <p className="text-sm text-dark-300">{client.allergies}</p>
            </div>
          )}

          {/* Hair info */}
          {(client.hairType || client.colorFormula) && (
            <div className="space-y-2">
              {client.hairType && (
                <div className="p-3 bg-dark-900/50 rounded-lg">
                  <div className="flex items-center gap-2 text-dark-400 mb-1">
                    <Scissors size={14} />
                    <span className="text-xs font-medium">თმის ტიპი</span>
                  </div>
                  <p className="text-sm text-dark-200">{client.hairType}</p>
                </div>
              )}
              {client.colorFormula && (
                <div className="p-3 bg-dark-900/50 rounded-lg">
                  <div className="flex items-center gap-2 text-dark-400 mb-1">
                    <Palette size={14} />
                    <span className="text-xs font-medium">საღებავის ფორმულა</span>
                  </div>
                  <p className="text-sm text-dark-200">{client.colorFormula}</p>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {client.notes && (
            <div className="p-3 bg-dark-900/50 rounded-lg">
              <div className="flex items-center gap-2 text-dark-400 mb-1">
                <FileText size={14} />
                <span className="text-xs font-medium">შენიშვნები</span>
              </div>
              <p className="text-sm text-dark-200">{client.notes}</p>
            </div>
          )}

          {/* Loyalty History */}
          {client.loyaltyTransactions && client.loyaltyTransactions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-dark-400 mb-2">
                <Gift size={14} />
                <span className="text-xs font-medium uppercase">ქულების ისტორია</span>
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {client.loyaltyTransactions.map((t: any) => {
                  const isPositive = t.type === 'EARN' || t.type === 'BONUS';
                  return (
                    <div key={t.id} className="flex items-center justify-between p-2 bg-dark-900/50 rounded-lg">
                      <div className="min-w-0">
                        <p className="text-xs text-dark-200 truncate">{t.description || (isPositive ? 'დამატება' : 'გამოყენება')}</p>
                        <p className="text-[10px] text-dark-500">
                          {new Date(t.createdAt).toLocaleDateString('ka-GE', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                      <span className={cn('text-sm font-medium', isPositive ? 'text-emerald-400' : 'text-red-400')}>
                        {isPositive ? '+' : '-'}{t.points}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Gift Cards */}
          {client.giftCards && client.giftCards.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-dark-400 mb-2">
                <Crown size={14} />
                <span className="text-xs font-medium uppercase">სასაჩუქრე ბარათები</span>
              </div>
              <div className="space-y-1.5">
                {client.giftCards.map((gc: any) => (
                  <div key={gc.id} className="flex items-center justify-between p-2 bg-dark-900/50 rounded-lg">
                    <div>
                      <span className="text-xs font-mono text-dark-300">{gc.code}</span>
                      {gc.expiresAt && (
                        <p className="text-[10px] text-dark-500">
                          ვადა: {new Date(gc.expiresAt).toLocaleDateString('ka-GE')}
                        </p>
                      )}
                    </div>
                    <span className={cn('text-sm font-medium', gc.balance > 0 ? 'text-emerald-400' : 'text-dark-500')}>
                      {gc.balance.toFixed(2)} ₾
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
