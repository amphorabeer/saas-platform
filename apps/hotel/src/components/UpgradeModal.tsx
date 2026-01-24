'use client';

import { PlanType, PLAN_NAMES } from '@/lib/plan-features';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: string;
  requiredPlan: PlanType;
  currentPlan: PlanType | null;
}

export function UpgradeModal({ isOpen, onClose, feature, requiredPlan, currentPlan }: UpgradeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <div className="text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">ფუნქცია შეზღუდულია</h2>
          <p className="text-gray-600 mb-4">
            <span className="text-blue-600 font-semibold">{feature}</span> ხელმისაწვდომია{' '}
            <span className="text-blue-600 font-semibold">{PLAN_NAMES[requiredPlan]}</span> პაკეტიდან
          </p>
          
          {currentPlan && (
            <p className="text-sm text-gray-500 mb-6">
              თქვენი ამჟამინდელი პაკეტი: <span className="text-gray-700">{PLAN_NAMES[currentPlan]}</span>
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
            >
              დახურვა
            </button>
            <a
              href="https://geobiz.app/modules/hotel/pricing"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition text-center font-medium"
            >
              განახლება
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// Simple locked feature badge
export function LockedBadge({ plan }: { plan: PlanType }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">
      🔒 {PLAN_NAMES[plan]}
    </span>
  );
}

// Feature gate wrapper component
interface FeatureGateProps {
  children: React.ReactNode;
  feature: string;
  hasAccess: boolean;
  requiredPlan: PlanType;
  currentPlan: PlanType | null;
  fallback?: React.ReactNode;
}

export function FeatureGate({ children, feature, hasAccess, requiredPlan, currentPlan, fallback }: FeatureGateProps) {
  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="relative">
      <div className="opacity-50 pointer-events-none blur-[1px]">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-lg">
        <div className="text-center p-4">
          <div className="text-3xl mb-2">🔒</div>
          <p className="text-sm text-gray-700 mb-2">{feature}</p>
          <p className="text-xs text-blue-600">
            საჭიროა {PLAN_NAMES[requiredPlan]} პაკეტი
          </p>
          <a
            href="https://geobiz.app/modules/hotel/pricing"
            className="mt-2 inline-block text-xs text-blue-600 hover:text-blue-700 underline"
          >
            განახლება →
          </a>
        </div>
      </div>
    </div>
  );
}
