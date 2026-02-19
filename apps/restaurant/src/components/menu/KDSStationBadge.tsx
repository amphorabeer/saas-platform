'use client';

import { Badge } from '@/components/ui/Badge';

const KDS_LABELS: Record<string, { label: string; emoji: string }> = {
  HOT: { label: 'HOT', emoji: '🔥' },
  COLD: { label: 'COLD', emoji: '❄️' },
  BAR: { label: 'BAR', emoji: '🍸' },
  PIZZA: { label: 'PIZZA', emoji: '🍕' },
  GRILL: { label: 'GRILL', emoji: '🥩' },
  PASTRY: { label: 'PASTRY', emoji: '🧁' },
};

type KDSStationBadgeProps = { station: string };

export function KDSStationBadge({ station }: KDSStationBadgeProps) {
  const t = KDS_LABELS[station] || { label: station, emoji: '🍽️' };
  return <Badge variant="default">{t.emoji} {t.label}</Badge>;
}
