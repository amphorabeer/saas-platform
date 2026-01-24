// Plan-based feature configuration for Brewery app

export type PlanType = 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';

export interface PlanFeatures {
  // ავზების ლიმიტი
  maxTanks: number;
  
  // რეცეპტების ლიმიტი
  maxRecipes: number;
  
  // მომხმარებლების ლიმიტი
  maxUsers: number;
  
  // ფუნქციები
  features: {
    // წარმოება
    production: boolean;
    splitBlend: boolean;
    
    // მარაგები
    rawMaterials: boolean;
    packaging: boolean;
    finishedGoods: boolean;
    kegs: boolean;
    
    // სხვა მოდულები
    cip: boolean;
    finances: boolean;
    invoices: boolean;
    analytics: boolean;
    userRoles: boolean;
  };
}

export const PLAN_FEATURES: Record<PlanType, PlanFeatures> = {
  STARTER: {
    maxTanks: 5,
    maxRecipes: 10,
    maxUsers: 1,
    features: {
      production: true,
      splitBlend: false,
      rawMaterials: true,
      packaging: false,
      finishedGoods: false,
      kegs: false,
      cip: true,
      finances: false,
      invoices: false,
      analytics: false,
      userRoles: false,
    },
  },
  PROFESSIONAL: {
    maxTanks: 14,
    maxRecipes: Infinity,
    maxUsers: 3,
    features: {
      production: true,
      splitBlend: true,
      rawMaterials: true,
      packaging: true,
      finishedGoods: true,
      kegs: true,
      cip: true,
      finances: true,
      invoices: false,
      analytics: false,
      userRoles: false,
    },
  },
  ENTERPRISE: {
    maxTanks: Infinity,
    maxRecipes: Infinity,
    maxUsers: Infinity,
    features: {
      production: true,
      splitBlend: true,
      rawMaterials: true,
      packaging: true,
      finishedGoods: true,
      kegs: true,
      cip: true,
      finances: true,
      invoices: true,
      analytics: true,
      userRoles: true,
    },
  },
};

// Feature-ის ქართული სახელები
export const FEATURE_NAMES: Record<keyof PlanFeatures['features'], string> = {
  production: 'წარმოება',
  splitBlend: 'SPLIT / BLEND',
  rawMaterials: 'ნედლეული',
  packaging: 'შესაფუთი მასალები',
  finishedGoods: 'მზა პროდუქცია',
  kegs: 'კეგების მართვა',
  cip: 'CIP / ავზების რეცხვა',
  finances: 'ფინანსები',
  invoices: 'ანგარიშფაქტურები',
  analytics: 'ანალიტიკა',
  userRoles: 'მომხმარებლის როლები',
};

// Plan-ის ქართული სახელები
export const PLAN_NAMES: Record<PlanType, string> = {
  STARTER: 'Starter',
  PROFESSIONAL: 'Professional',
  ENTERPRISE: 'Enterprise',
};

// Upgrade-ის რეკომენდაცია feature-ის მიხედვით
export function getRequiredPlanForFeature(feature: keyof PlanFeatures['features']): PlanType {
  if (PLAN_FEATURES.STARTER.features[feature]) return 'STARTER';
  if (PLAN_FEATURES.PROFESSIONAL.features[feature]) return 'PROFESSIONAL';
  return 'ENTERPRISE';
}

// შეამოწმე აქვს თუ არა plan-ს feature
export function hasFeature(plan: PlanType, feature: keyof PlanFeatures['features']): boolean {
  return PLAN_FEATURES[plan]?.features[feature] ?? false;
}

// შეამოწმე ლიმიტი
export function isWithinLimit(plan: PlanType, type: 'tanks' | 'recipes' | 'users', count: number): boolean {
  const limits = PLAN_FEATURES[plan];
  if (!limits) return false;
  
  switch (type) {
    case 'tanks':
      return count <= limits.maxTanks;
    case 'recipes':
      return count <= limits.maxRecipes;
    case 'users':
      return count <= limits.maxUsers;
    default:
      return false;
  }
}