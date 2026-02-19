'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Building2, User, Plug } from 'lucide-react';
import { RestaurantProfileForm } from '@/components/settings/RestaurantProfileForm';
import type { RestaurantProfileData } from '@/components/settings/RestaurantProfileForm';
import { WorkingHoursForm } from '@/components/settings/WorkingHoursForm';
import type { WorkingHoursData } from '@/components/settings/WorkingHoursForm';
import { RestaurantSettingsForm } from '@/components/settings/RestaurantSettingsForm';
import type { RestaurantSettingsFormData } from '@/components/settings/RestaurantSettingsForm';
import { UserProfileForm } from '@/components/settings/UserProfileForm';
import { ChangePasswordForm } from '@/components/settings/ChangePasswordForm';
import { IntegrationCard } from '@/components/settings/IntegrationCard';
import { Receipt, Smartphone, CreditCard, MessageSquare } from 'lucide-react';

const TABS = [
  { id: 'restaurant', label: 'რესტორანი', icon: Building2 },
  { id: 'user', label: 'მომხმარებელი', icon: User },
  { id: 'integrations', label: 'ინტეგრაციები', icon: Plug },
] as const;

type TabId = (typeof TABS)[number]['id'];

type RestaurantResponse = {
  id: string;
  name: string;
  type: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  taxId: string | null;
  currency: string;
  timezone: string;
  logoUrl: string | null;
  isActive: boolean;
  settings: Record<string, unknown>;
  organization?: {
    company: string | null;
    taxId: string | null;
    bankName: string | null;
    bankAccount: string | null;
    directorName: string | null;
    bankSWIFT: string | null;
  } | null;
};

type UserResponse = {
  id: string;
  name: string | null;
  email: string;
  restCode: string;
};

const ALLOWED_EDIT_ROLES = ['RESTAURANT_OWNER', 'MANAGER'];

const INTEGRATIONS = [
  {
    icon: Receipt,
    name: 'RS.ge',
    description: 'ფისკალური კასა',
    status: 'coming_soon' as const,
  },
  {
    icon: Smartphone,
    name: 'Glovo',
    description: 'Glovo ინტეგრაცია',
    status: 'coming_soon' as const,
  },
  {
    icon: Smartphone,
    name: 'Wolt',
    description: 'Wolt ინტეგრაცია',
    status: 'coming_soon' as const,
  },
  {
    icon: MessageSquare,
    name: 'SMS Service',
    description: 'SMS გაგზავნა',
    status: 'coming_soon' as const,
  },
  {
    icon: CreditCard,
    name: 'Payment Terminal',
    description: 'TBC/BOG ტერმინალი',
    status: 'coming_soon' as const,
  },
];

export default function SettingsPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<TabId>('restaurant');
  const [restaurant, setRestaurant] = useState<RestaurantResponse | null>(null);
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loadingRestaurant, setLoadingRestaurant] = useState(true);
  const [loadingUser, setLoadingUser] = useState(true);

  const employeeRole = (session?.user as { employeeRole?: string } | undefined)?.employeeRole ?? '';
  const canEditRestaurant = ALLOWED_EDIT_ROLES.includes(employeeRole);

  const fetchRestaurant = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/restaurant');
      if (res.ok) {
        const data = await res.json();
        setRestaurant(data);
      }
    } finally {
      setLoadingRestaurant(false);
    }
  }, []);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/user');
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      }
    } finally {
      setLoadingUser(false);
    }
  }, []);

  useEffect(() => {
    fetchRestaurant();
  }, [fetchRestaurant]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handleSaveRestaurantProfile = async (data: RestaurantProfileData) => {
    const res = await fetch('/api/settings/restaurant', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: data.name,
        type: data.type,
        address: data.address || null,
        phone: data.phone || null,
        email: data.email || null,
        taxId: data.taxId || null,
        currency: data.currency,
        timezone: data.timezone,
        logoUrl: data.logoUrl || null,
        isActive: data.isActive,
        company: data.company || null,
        directorName: data.directorName || null,
        bankName: data.bankName || null,
        bankAccount: data.bankAccount || null,
        bankSWIFT: data.bankSWIFT || null,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'შეცდომა');
    }
    const updated = await res.json();
    setRestaurant(updated);
  };

  const handleSaveWorkingHours = async (workingHours: WorkingHoursData) => {
    const settings = { ...(restaurant?.settings || {}), workingHours };
    const res = await fetch('/api/settings/restaurant', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'შეცდომა');
    }
    const updated = await res.json();
    setRestaurant(updated);
  };

  const handleSaveRestaurantSettings = async (data: RestaurantSettingsFormData) => {
    const settings = {
      ...(restaurant?.settings || {}),
      defaultPrepTimeMinutes: data.defaultPrepTimeMinutes,
      autoCloseSessionMinutes: data.autoCloseSessionMinutes,
      tipsEnabled: data.tipsEnabled,
      tipsPoolPercent: data.tipsPoolPercent,
      taxRatePercent: data.taxRatePercent,
      receiptFooterText: data.receiptFooterText,
    };
    const res = await fetch('/api/settings/restaurant', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'შეცდომა');
    }
    const updated = await res.json();
    setRestaurant(updated);
  };

  const handleSaveUserName = async (name: string) => {
    const res = await fetch('/api/settings/user', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'შეცდომა');
    }
    const updated = await res.json();
    setUser(updated);
  };

  const handleChangePassword = async (
    oldPassword: string,
    newPassword: string,
    confirmPassword: string
  ) => {
    const res = await fetch('/api/settings/user/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        oldPassword,
        newPassword,
        confirmPassword,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'შეცდომა');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-white">პარამეტრები</h1>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-white/10 bg-[#1E293B]/40 p-1 backdrop-blur-sm">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'restaurant' && (
        <motion.div
          key="restaurant"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          {loadingRestaurant ? (
            <p className="text-slate-400">იტვირთება...</p>
          ) : (
            <>
              <RestaurantProfileForm
                initial={restaurant}
                onSave={handleSaveRestaurantProfile}
                canEdit={canEditRestaurant}
              />
              <WorkingHoursForm
                initialSettings={restaurant?.settings ?? null}
                onSave={handleSaveWorkingHours}
                canEdit={canEditRestaurant}
              />
              <RestaurantSettingsForm
                initialSettings={restaurant?.settings ?? null}
                onSave={handleSaveRestaurantSettings}
                canEdit={canEditRestaurant}
              />
            </>
          )}
        </motion.div>
      )}

      {activeTab === 'user' && (
        <motion.div
          key="user"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          {loadingUser ? (
            <p className="text-slate-400">იტვირთება...</p>
          ) : (
            <>
              <UserProfileForm initial={user} onSaveName={handleSaveUserName} />
              <ChangePasswordForm onChangePassword={handleChangePassword} />
            </>
          )}
        </motion.div>
      )}

      {activeTab === 'integrations' && (
        <motion.div
          key="integrations"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {INTEGRATIONS.map((item) => (
            <IntegrationCard
              key={item.name}
              icon={item.icon}
              name={item.name}
              description={item.description}
              status={item.status}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
}
