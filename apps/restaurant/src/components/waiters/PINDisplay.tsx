'use client';

import { useState } from 'react';

/** Masked PIN with optional reveal on hover/click (when realPin is provided in edit context) */
export function PINDisplay({
  pin,
  masked = true,
  realPin,
}: {
  pin: string | null;
  masked?: boolean;
  realPin?: string | null;
}) {
  const [reveal, setReveal] = useState(false);
  if (pin == null && realPin == null) return <span className="text-slate-500">—</span>;
  const isMasked = pin === '••••••' || (masked && !realPin);
  const show = !isMasked || (reveal && realPin);
  const display = show && realPin ? realPin : isMasked ? '••••••' : pin ?? '—';
  return (
    <span
      className="font-mono text-sm select-none cursor-pointer"
      onMouseEnter={() => realPin && setReveal(true)}
      onMouseLeave={() => setReveal(false)}
      onClick={() => realPin && setReveal((v) => !v)}
      title={realPin && !show ? 'დააკლიკე ჩასაწერად' : undefined}
    >
      {display}
    </span>
  );
}
