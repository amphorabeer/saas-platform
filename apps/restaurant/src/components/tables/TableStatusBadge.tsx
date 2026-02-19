'use client';

import { Badge } from '@/components/ui/Badge';

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: 'green' | 'red' | 'yellow' | 'purple' | 'blue' }
> = {
  FREE: { label: 'თავისუფალი', variant: 'green' },
  OCCUPIED: { label: 'დაკავებული', variant: 'red' },
  RESERVED: { label: 'რეზერვირებული', variant: 'yellow' },
  CLEANING: { label: 'გაწმენდა', variant: 'purple' },
  BILLING: { label: 'გადახდა', variant: 'blue' },
};

type TableStatusBadgeProps = { status: string };

export function TableStatusBadge({ status }: TableStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || { label: status, variant: 'green' as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
