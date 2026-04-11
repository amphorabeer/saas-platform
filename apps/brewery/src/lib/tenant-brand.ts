/** Tenant company fields for invoices / print reports (no Prisma — safe for client). */

export type TenantBrand = {
  displayName: string
  legalName: string | null
  address: string | null
  phone: string | null
  taxId: string | null
  email: string | null
  bankName: string | null
  bankAccount: string | null
  bankSwift: string | null
  website: string | null
  logoUrl: string | null
}

export const EMPTY_TENANT_BRAND: TenantBrand = {
  displayName: '—',
  legalName: null,
  address: null,
  phone: null,
  taxId: null,
  email: null,
  bankName: null,
  bankAccount: null,
  bankSwift: null,
  website: null,
  logoUrl: null,
}

/** Map `/api/tenant` JSON `tenant` object to TenantBrand. */
export function tenantBrandFromApiJson(t: {
  name?: string | null
  legalName?: string | null
  address?: string | null
  phone?: string | null
  taxId?: string | null
  email?: string | null
  bankName?: string | null
  bankAccount?: string | null
  bankSwift?: string | null
  website?: string | null
  logoUrl?: string | null
}): TenantBrand {
  return {
    displayName: (t.legalName || t.name || '').trim() || '—',
    legalName: t.legalName ?? null,
    address: t.address ?? null,
    phone: t.phone ?? null,
    taxId: t.taxId ?? null,
    email: t.email ?? null,
    bankName: t.bankName ?? null,
    bankAccount: t.bankAccount ?? null,
    bankSwift: t.bankSwift ?? null,
    website: t.website ?? null,
    logoUrl: t.logoUrl ?? null,
  }
}

export function escHtml(s: string | null | undefined): string {
  if (s == null || s === '') return ''
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** For HTML attribute values (e.g. img src). */
export function escAttr(s: string | null | undefined): string {
  if (s == null || s === '') return ''
  return s.replace(/"/g, '&quot;')
}

export function tenantFooterLine(t: TenantBrand): string {
  const parts: string[] = []
  if (t.website?.trim()) parts.push(t.website.trim())
  if (t.email?.trim()) parts.push(t.email.trim())
  if (t.phone?.trim()) parts.push(t.phone.trim())
  return parts.length ? parts.join(' • ') : t.displayName
}
