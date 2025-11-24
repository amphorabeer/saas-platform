export type { User, Organization, Subscription, ModuleAccess, Role, ModuleType, PlanType, SubscriptionStatus } from "@saas-platform/database";

export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  role: string;
  organizationId?: string | null;
  tenantId?: string | null;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

