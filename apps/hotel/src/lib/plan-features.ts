// Plan-based feature configuration for Hotel app

export type PlanType = 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';

export interface PlanFeatures {
  // ოთახების ლიმიტი
  maxRooms: number;
  
  // მომხმარებლების ლიმიტი
  maxUsers: number;
  
  // ლოკაციების ლიმიტი
  maxLocations: number;
  
  // ფუნქციები
  features: {
    // ძირითადი
    calendar: boolean;
    reservations: boolean;
    checkInOut: boolean;
    nightAudit: boolean;
    
    // Professional+
    finances: boolean;
    housekeeping: boolean;
    
    // Enterprise
    analytics: boolean;
    multiLocation: boolean;
    userRoles: boolean;
  };
}

export const PLAN_FEATURES: Record<PlanType, PlanFeatures> = {
  STARTER: {
    maxRooms: 10,
    maxUsers: 1,
    maxLocations: 1,
    features: {
      calendar: true,
      reservations: true,
      checkInOut: true,
      nightAudit: true,
      finances: false,
      housekeeping: false,
      analytics: false,
      multiLocation: false,
      userRoles: false,
    },
  },
  PROFESSIONAL: {
    maxRooms: 30,
    maxUsers: 5,
    maxLocations: 1,
    features: {
      calendar: true,
      reservations: true,
      checkInOut: true,
      nightAudit: true,
      finances: true,
      housekeeping: true,
      analytics: false,
      multiLocation: false,
      userRoles: false,
    },
  },
  ENTERPRISE: {
    maxRooms: Infinity,
    maxUsers: Infinity,
    maxLocations: Infinity,
    features: {
      calendar: true,
      reservations: true,
      checkInOut: true,
      nightAudit: true,
      finances: true,
      housekeeping: true,
      analytics: true,
      multiLocation: true,
      userRoles: true,
    },
  },
};

// Feature-ის ქართული სახელები
export const FEATURE_NAMES: Record<keyof PlanFeatures['features'], string> = {
  calendar: 'კალენდარი',
  reservations: 'ჯავშნები',
  checkInOut: 'Check-in / Check-out',
  nightAudit: 'ღამის აუდიტი',
  finances: 'ფინანსები',
  housekeeping: 'Housekeeping',
  analytics: 'ანალიტიკა',
  multiLocation: 'მრავალი ლოკაცია',
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
export function isWithinLimit(plan: PlanType, type: 'rooms' | 'users' | 'locations', count: number): boolean {
  const limits = PLAN_FEATURES[plan];
  if (!limits) return false;
  
  switch (type) {
    case 'rooms':
      return count <= limits.maxRooms;
    case 'users':
      return count <= limits.maxUsers;
    case 'locations':
      return count <= limits.maxLocations;
    default:
      return false;
  }
}
