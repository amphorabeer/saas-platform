'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { KDSBoard } from '@/components/kds/KDSBoard';
import { KDSTopBar } from '@/components/kds/KDSTopBar';
import type { KitchenTicketData } from '@/components/kds/KitchenTicketCard';
import type { KDSStats } from '@/components/kds/KDSTopBar';
import type { KDSStationType } from '@/components/kds/KDSStationFilter';
import { playSound } from '@/components/kds/KDSSoundManager';

const STORAGE_SOUND = 'kds-sound-on';
const POLL_INTERVAL_MS = 5000;

export default function KDSPage() {
  const [tickets, setTickets] = useState<KitchenTicketData[]>([]);
  const [stats, setStats] = useState<KDSStats>({ new: 0, preparing: 0, ready: 0 });
  const [station, setStation] = useState<KDSStationType>('ALL');
  const [soundOn, setSoundOn] = useState(true);
  const [loading, setLoading] = useState(true);
  const prevTicketIdsRef = useRef<Set<string>>(new Set());

  const refetch = useCallback(async () => {
    const params = station !== 'ALL' ? `?station=${station}` : '';
    const nextTickets = await fetch(`/api/kds/tickets${params}`, { credentials: 'include' }).then((r) =>
      r.ok ? r.json() : []
    );
    if (Array.isArray(nextTickets)) {
      const nextIds = new Set(nextTickets.map((t: KitchenTicketData) => t.id));
      const prevIds = prevTicketIdsRef.current;
      const isNewTicket = prevIds.size > 0 && (nextIds.size > prevIds.size || [...nextIds].some((id: string) => !prevIds.has(id)));
      if (isNewTicket && soundOn) playSound('newOrder');
      prevTicketIdsRef.current = nextIds;
      setTickets(nextTickets);
      const computedStats = {
        new: nextTickets.filter((t: KitchenTicketData) => t.status === 'NEW').length,
        preparing: nextTickets.filter((t: KitchenTicketData) => t.status === 'PREPARING').length,
        ready: nextTickets.filter((t: KitchenTicketData) => t.status === 'READY').length,
      };
      setStats(computedStats);
    }
  }, [station, soundOn]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    refetch().finally(() => {
      if (mounted) setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [refetch]);

  useEffect(() => {
    const t = setInterval(refetch, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [refetch]);


  const handleStatusChange = useCallback(async (id: string, newStatus: string) => {
    const res = await fetch(`/api/kds/tickets/${id}/status`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) return;
    if (newStatus === 'READY' && soundOn) playSound('ready');
    await refetch();
  }, [soundOn, refetch]);

  const handleSoundToggle = useCallback(() => {
    setSoundOn((v) => {
      const next = !v;
      if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_SOUND, next ? '1' : '0');
      return next;
    });
  }, []);

  const handleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, []);

  useEffect(() => {
    if (typeof localStorage === 'undefined') return;
    const stored = localStorage.getItem(STORAGE_SOUND);
    setSoundOn(stored !== '0');
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col bg-[#0F172A]">
      <KDSTopBar
        station={station}
        onStationChange={setStation}
        stats={stats}
        soundOn={soundOn}
        onSoundToggle={handleSoundToggle}
        onFullscreen={handleFullscreen}
      />
      <div className="flex-1 min-h-0 overflow-auto p-4">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <span className="text-slate-400">იტვირთება...</span>
          </div>
        ) : (
          <KDSBoard tickets={tickets} onStatusChange={handleStatusChange} soundOn={soundOn} />
        )}
      </div>
    </div>
  );
}
