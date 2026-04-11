import { prisma } from '@saas-platform/database'
import { EMPTY_TENANT_BRAND, type TenantBrand } from '@/lib/tenant-brand'

export type { TenantBrand } from '@/lib/tenant-brand'

export async function getTenantBrand(tenantId: string): Promise<TenantBrand> {
  const t = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      name: true,
      legalName: true,
      address: true,
      phone: true,
      taxId: true,
      email: true,
      bankName: true,
      bankAccount: true,
      bankSwift: true,
      website: true,
      logoUrl: true,
    },
  })
  if (!t) return EMPTY_TENANT_BRAND
  const displayName = (t.legalName || t.name || '').trim() || '—'
  return {
    displayName,
    legalName: t.legalName,
    address: t.address,
    phone: t.phone,
    taxId: t.taxId,
    email: t.email,
    bankName: t.bankName,
    bankAccount: t.bankAccount,
    bankSwift: t.bankSwift,
    website: t.website,
    logoUrl: t.logoUrl,
  }
}
