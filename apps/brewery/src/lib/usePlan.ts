'use client';

import { useState, useEffect, useCallback } from 'react';
import { PlanType, PlanFeatures, PLAN_FEATURES, hasFeature, isWithinLimit, getRequiredPlanForFeature, PLAN_NAMES, FEATURE_NAMES } from './plan-features';

interface UsePlanResult {
  plan: PlanType | null;
  planFeatures: PlanFeatures | null;
  loading: boolean;
  error: string | null;
  
  // Helper functions
  hasFeature: (feature: keyof PlanFeatures['features']) => boolean;
  isWithinLimit: (type: 'tanks' | 'recipes' | 'users', count: number) => boolean;
  getRequiredPlan: (feature: keyof PlanFeatures['features']) => PlanType;
  
  // Display helpers
  planName: string;
  getFeatureName: (feature: keyof PlanFeatures['features']) => string;
  
  // Upgrade info
  needsUpgrade: (feature: keyof PlanFeatures['features']) => boolean;
  getUpgradeMessage: (feature: keyof PlanFeatures['features']) => string;
}

export function usePlan(): UsePlanResult {
  const [plan, setPlan] = useState<PlanType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPlan() {
      try {
        const response = await fetch('/api/tenant/plan');
        if (response.ok) {
          const data = await response.json();
          setPlan(data.plan as PlanType);
        } else {
          // Default to STARTER if can't fetch
          setPlan('STARTER');
        }
      } catch (err) {
        console.error('Failed to fetch plan:', err);
        setPlan('STARTER');
        setError('Failed to load plan');
      } finally {
        setLoading(false);
      }
    }

    fetchPlan();
  }, []);

  const planFeatures = plan ? PLAN_FEATURES[plan] : null;

  const checkFeature = useCallback(
    (feature: keyof PlanFeatures['features']): boolean => {
      if (!plan) return false;
      return hasFeature(plan, feature);
    },
    [plan]
  );

  const checkLimit = useCallback(
    (type: 'tanks' | 'recipes' | 'users', count: number): boolean => {
      if (!plan) return false;
      return isWithinLimit(plan, type, count);
    },
    [plan]
  );

  const getRequiredPlan = useCallback(
    (feature: keyof PlanFeatures['features']): PlanType => {
      return getRequiredPlanForFeature(feature);
    },
    []
  );

  const needsUpgrade = useCallback(
    (feature: keyof PlanFeatures['features']): boolean => {
      if (!plan) return true;
      return !hasFeature(plan, feature);
    },
    [plan]
  );

  const getUpgradeMessage = useCallback(
    (feature: keyof PlanFeatures['features']): string => {
      const requiredPlan = getRequiredPlanForFeature(feature);
      const featureName = FEATURE_NAMES[feature];
      return `"${featureName}" ხელმისაწვდომია ${PLAN_NAMES[requiredPlan]} პაკეტიდან`;
    },
    []
  );

  const getFeatureName = useCallback(
    (feature: keyof PlanFeatures['features']): string => {
      return FEATURE_NAMES[feature];
    },
    []
  );

  return {
    plan,
    planFeatures,
    loading,
    error,
    hasFeature: checkFeature,
    isWithinLimit: checkLimit,
    getRequiredPlan,
    planName: plan ? PLAN_NAMES[plan] : '',
    getFeatureName,
    needsUpgrade,
    getUpgradeMessage,
  };
}
