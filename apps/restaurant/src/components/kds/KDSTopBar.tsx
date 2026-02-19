'use client';

import Link from 'next/link';
import { ArrowLeft, Volume2, VolumeX, Maximize } from 'lucide-react';
import { KDSStationFilter, type KDSStationType } from './KDSStationFilter';

export type KDSStats = {
  new: number;
  preparing: number;
  ready: number;
};

export function KDSTopBar({
  station,
  onStationChange,
  stats,
  soundOn,
  onSoundToggle,
  onFullscreen,
}: {
  station: KDSStationType;
  onStationChange: (s: KDSStationType) => void;
  stats: KDSStats;
  soundOn: boolean;
  onSoundToggle: () => void;
  onFullscreen: () => void;
}) {
  return (
    <div className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-white/10 bg-[#1E293B]/80 px-4 backdrop-blur-xl">
      <Link
        href="/dashboard"
        className="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition touch-manipulation"
        aria-label="დეშბორდზე"
      >
        <ArrowLeft className="h-6 w-6" />
      </Link>

      <div className="flex-1 min-w-0 max-w-2xl">
        <KDSStationFilter value={station} onChange={onStationChange} />
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-1.5 text-sm">
          <span className="text-red-400 font-semibold">ახალი: {stats.new}</span>
          <span className="text-amber-400 font-semibold">მომზადება: {stats.preparing}</span>
          <span className="text-emerald-400 font-semibold">მზადაა: {stats.ready}</span>
        </div>

        <button
          type="button"
          onClick={onSoundToggle}
          className="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white touch-manipulation"
          aria-label={soundOn ? 'ხმის გამორთვა' : 'ხმის ჩართვა'}
        >
          {soundOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </button>

        <button
          type="button"
          onClick={onFullscreen}
          className="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white touch-manipulation"
          aria-label="სრული ეკრანი"
        >
          <Maximize className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
